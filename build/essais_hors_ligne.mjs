/*
 * Le hors-ligne, pour de vrai : on sert l'application, on la laisse
 * s'installer et tout télécharger, on **arrête le serveur**, et on la rouvre.
 *
 * Ce que l'épreuve établit :
 *   1. le service worker s'installe et prend la main ;
 *   2. le dictionnaire complet arrive de lui-même en arrière-plan ;
 *   3. serveur arrêté, l'application s'ouvre, cherche, ouvre la fiche d'un mot
 *      courant (socle) comme celle d'un mot rare (suite) ;
 *   4. une fiche de révision et une note écrites avant la coupure sont là ;
 *   5. une tranche retirée du cache donne, hors ligne, le message qui
 *      l'explique — et non une page blanche.
 *
 *   node build/essais_hors_ligne.mjs
 */
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { lancerChrome, fermerChrome, ouvrirOnglet } from './pilote_chrome.mjs';

const RACINE = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '..');
const PORT = 8145;
const ADRESSE = `http://localhost:${PORT}/`;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

function servir() {
  return spawn('python', ['-m', 'http.server', String(PORT), '--directory', RACINE], { stdio: 'ignore' });
}
function arreter(serveur) {
  if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(serveur.pid), '/T', '/F'], { stdio: 'ignore' });
  try { serveur.kill(); } catch (e) { /* déjà parti */ }
}

let total = 0;
let fautes = 0;
function cas(libelle, condition, detail) {
  total += 1;
  if (!condition) fautes += 1;
  console.log((condition ? '  ok   ' : '  NON  ') + libelle + (!condition && detail !== undefined ? ' — ' + JSON.stringify(detail) : ''));
}

let serveur = servir();
await pause(1200);
const chrome = await lancerChrome({ port: 9334 });
try {
  const onglet = await ouvrirOnglet(chrome, 'about:blank');
  const { evaluer } = onglet;
  await onglet.naviguer(ADRESSE);
  const pret = async () => {
    for (let i = 0; i < 80; i += 1) {
      if (await evaluer('return !!(window.Lexique && Lexique.taille() > 0 && document.getElementById("demarrage").hidden)').catch(() => false)) return true;
      await pause(250);
    }
    return false;
  };
  cas('l’application s’ouvre en ligne', await pret());

  // La sonde : l'API Cache de ce Chrome fonctionne-t-elle ? (voir la mémoire
  // du projet : elle a déjà été cassée dans un Chrome sans affichage.)
  cas('l’API Cache répond', await evaluer(`const c = await caches.open('sonde');
    await c.put('/sonde', new Response('ok')); await caches.delete('sonde'); return true;`).catch(() => false));

  let controle = false;
  for (let i = 0; i < 240 && !controle; i += 1) {
    controle = await evaluer('return !!navigator.serviceWorker.controller').catch(() => false);
    if (!controle) await pause(500);
  }
  cas('le service worker contrôle la page', controle);

  let complet = false;
  const debut = Date.now();
  for (let i = 0; i < 360 && !complet; i += 1) {
    complet = await evaluer('return (await Paquets.etat(Lexique.etat.manifeste)).complet').catch(() => false);
    if (!complet) await pause(500);
  }
  cas('le dictionnaire complet est arrivé de lui-même (' + Math.round((Date.now() - debut) / 1000) + ' s)', complet);

  // Ce qui est à soi, avant la coupure.
  await evaluer(`await Revision.apprendre('dico:atermoiement', 'atermoiement');
    await Notes.ecrire('dico:atermoiement', 'atermoiement', 'Note écrite avant la coupure.'); return true;`);

  arreter(serveur);
  await pause(800);
  cas('le serveur est bien arrêté', await fetch(ADRESSE).then(() => false).catch(() => true));

  await onglet.naviguer(ADRESSE);
  cas('hors ligne : l’application s’ouvre', await pret());
  cas('hors ligne : la recherche trouve « chevaux » → cheval',
    await evaluer("return Lexique.chercher('chevaux')[0].mot === 'cheval'"));
  const ouvrir = async (mot) => {
    await evaluer(`Fiche.ouvrir({mot: ${JSON.stringify(mot)}}); return true;`);
    for (let i = 0; i < 40; i += 1) {
      const titre = await evaluer("const h = document.querySelector('#fiche .vedette-mot'); return h ? h.textContent : null;");
      if (titre === mot) return await evaluer("return document.querySelectorAll('#fiche .sens').length");
      await pause(200);
    }
    return 0;
  };
  cas('hors ligne : fiche d’un mot courant (socle)', (await ouvrir('maison')) > 3);
  await evaluer('Fiche.fermer(); return true;');
  await pause(300);
  cas('hors ligne : fiche d’un mot rare (suite)', (await ouvrir('pusillanime')) > 0);
  await evaluer('Fiche.fermer(); return true;');
  cas('hors ligne : la fiche de révision est là', await evaluer("return Revision.estSuivi('dico:atermoiement')"));
  cas('hors ligne : la note est là', await evaluer("return (await Notes.lire('dico:atermoiement')).texte.startsWith('Note écrite')"));

  // Une tranche absente : le message, pas une page blanche.
  const tranche = await evaluer(`const r = Lexique.vedette('pusillanime');
    const nom = 'data/dico/t-' + String(r.tranche).padStart(3, '0') + '.json';
    const cache = await caches.open(Paquets.nomDuCache(Lexique.etat.manifeste));
    await cache.delete(nom); Lexique.etat.tranches.clear(); return nom;`);
  await evaluer("Fiche.ouvrir({mot: 'pusillanime'}); return true;");
  await pause(1500);
  cas('hors ligne, ' + tranche + ' retirée : le message l’explique',
    await evaluer("const b = document.querySelector('#fiche .bloc-absent'); return !!b && /pas encore sur l’appareil/.test(b.textContent)"));

  if (onglet.erreurs.length) {
    const utiles = onglet.erreurs.filter((e) => !/Failed to fetch|ERR_CONNECTION_REFUSED|net::/.test(e));
    cas('aucune erreur inattendue dans la page', utiles.length === 0, utiles.slice(0, 3));
  }
  onglet.fermer();
} finally {
  arreter(serveur);
  await fermerChrome(chrome);
}
console.log(`\n${total - fautes}/${total} cas conformes`);
process.exit(fautes ? 1 : 0);

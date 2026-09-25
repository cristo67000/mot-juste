/*
 * Recette visuelle : l'application au format téléphone, écran par écran.
 *
 * Lance un Chrome sans affichage sur un profil neuf, ouvre l'application
 * servie en local, joue un parcours — chercher, ouvrir une fiche, l'ajouter
 * aux fiches de révision, écrire une note, réviser, entrer un mot à soi — et
 * enregistre une capture à chaque étape. Les erreurs de la page sont
 * relevées : une seule fait échouer la recette.
 *
 *   node build/captures.mjs [adresse] [dossier-de-sortie]
 *
 * Par défaut : http://localhost:8144/ et build/captures/.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { lancerChrome, fermerChrome, ouvrirOnglet } from './pilote_chrome.mjs';

const ADRESSE = process.argv[2] || 'http://localhost:8144/';
const SORTIE = process.argv[3] || path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), 'captures');
mkdirSync(SORTIE, { recursive: true });

const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const chrome = await lancerChrome({ port: 9333 });
let echecs = 0;
try {
  const onglet = await ouvrirOnglet(chrome, 'about:blank');
  const { envoyer, evaluer } = onglet;
  await envoyer('Emulation.setDeviceMetricsOverride',
    { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await onglet.naviguer(ADRESSE);
  for (let i = 0; i < 80; i += 1) {
    if (await evaluer('return window.Lexique && Lexique.taille() > 0 && document.getElementById("demarrage").hidden').catch(() => false)) break;
    await pause(250);
  }
  await pause(800);

  let n = 0;
  async function capture(nom) {
    n += 1;
    const { data } = await envoyer('Page.captureScreenshot', { format: 'png' });
    const fichier = path.join(SORTIE, String(n).padStart(2, '0') + '-' + nom + '.png');
    writeFileSync(fichier, Buffer.from(data, 'base64'));
    console.log('  capture', path.basename(fichier));
  }
  async function taper(texte) {
    await evaluer(`const q = document.getElementById('q'); q.value = ${JSON.stringify(texte)};
      q.dispatchEvent(new Event('input')); return true;`);
    await pause(300);
  }
  async function verifier(libelle, expression) {
    const ok = await evaluer('return !!(' + expression + ')').catch((e) => { console.log(e.message); return false; });
    console.log((ok ? '  ok   ' : '  NON  ') + libelle);
    if (!ok) echecs += 1;
  }

  await capture('accueil');
  await verifier('mot du jour affiché', "!document.getElementById('du-jour').hidden");

  await taper('chevaux');
  await verifier('« chevaux » mène à « cheval » en tête',
    "document.querySelector('#resultats .mot').textContent === 'cheval'");
  await capture('recherche-forme');

  await taper('pomme');
  await verifier('« pomme » trouve « tomber dans les pommes »',
    "[...document.querySelectorAll('#resultats-expressions .mot')].some(x => x.textContent === 'tomber dans les pommes') || document.querySelector('#resultats-expressions .voir-plus')");
  await capture('recherche-expressions');

  await taper('eleve');
  await verifier('« eleve » trouve « élève »',
    "[...document.querySelectorAll('#resultats .mot')].some(x => x.textContent === 'élève')");

  /* On attend l'affichage réel plutôt qu'un délai fixe : sur le site publié,
   * au premier lancement, la tranche arrive par le réseau pendant que le
   * service worker pré-charge le socle. Le délai mesuré est affiché — c'est
   * ce que voit la personne. */
  const debutFiche = Date.now();
  await evaluer("Fiche.ouvrir({mot: 'feu'}); return true;");
  for (let i = 0; i < 100; i += 1) {
    if (await evaluer("return !!document.querySelector('#fiche .vedette-mot')")) break;
    await pause(200);
  }
  console.log('  (fiche « feu » affichée en ' + ((Date.now() - debutFiche) / 1000).toFixed(1) + ' s)');
  await pause(300);
  await verifier('fiche « feu » : sens numérotés', "document.querySelectorAll('#fiche .sens').length > 10");
  await verifier('fiche « feu » : étymologie', "document.querySelector('#fiche .etymologie-texte')");
  await verifier('fiche « feu » : locutions', "document.querySelector('#fiche .liste-liee')");
  await verifier('fiche « feu » : mots vifs', "document.querySelectorAll('#fiche .mv').length > 50");
  await capture('fiche-haut');
  await evaluer("document.getElementById('fiche').scrollTop = 1400; return true;");
  await pause(300);
  await capture('fiche-milieu');
  await evaluer("document.querySelector('#fiche .etymologie').scrollIntoView(); return true;");
  await pause(300);
  await capture('fiche-etymologie');

  // Un mot vif mène à sa fiche, et « ← feu » ramène.
  await evaluer("document.querySelector('#fiche .definition .mv').click(); return true;");
  await pause(1200);
  await verifier('un mot vif ouvre sa fiche, avec retour', "document.querySelector('#fiche .fiche-retour')");
  await evaluer("history.back(); return true;");
  await pause(1200);
  await verifier('le retour ramène à « feu »', "document.querySelector('#fiche .vedette-mot').textContent === 'feu'");

  await evaluer("document.querySelector('#fiche .apprendre').click(); return true;");
  await pause(600);
  await verifier('« feu » ajouté aux fiches', "document.querySelector('#fiche .apprendre').classList.contains('suivi')");
  await evaluer("document.querySelector('#fiche-notes .bouton-discret').click(); return true;");
  await pause(300);
  await evaluer(`const z = document.querySelector('#fiche-notes textarea');
    z.value = 'Penser à « feu » au sens de « défunt » : feu mon père.';
    z.dispatchEvent(new Event('input')); document.querySelector('#fiche-notes .bouton-principal').click(); return true;`);
  await pause(600);
  await verifier('note enregistrée', "document.querySelector('#fiche-notes .note-texte')");
  await evaluer("document.getElementById('fiche-notes').scrollIntoView(); return true;");
  await pause(300);
  await capture('fiche-note');

  for (const mot of ['pusillanime', 'atermoiement', 'tomber dans les pommes', 'chuchoter']) {
    await evaluer(`Fiche.ouvrir({mot: ${JSON.stringify(mot)}}); return true;`);
    await pause(1200);
    await evaluer("const b = document.querySelector('#fiche .apprendre'); if (!b.classList.contains('suivi')) b.click(); return true;");
    await pause(500);
  }
  await capture('fiche-expression');
  await evaluer("Fiche.fermer(); return true;");
  await pause(600);

  await evaluer("App.basculer('reviser'); return true;");
  await pause(800);
  await verifier('compteurs de révision', "document.querySelectorAll('#revision-compteurs .compteur').length === 3");
  await capture('reviser-accueil');
  await evaluer("document.getElementById('b-commencer').click(); return true;");
  await pause(1500);
  await verifier('une question est posée', "document.getElementById('seance-consigne').textContent.length > 3");
  await capture('seance-question');
  // On répond : premier choix, ou « Je ne sais pas », ou on retourne la fiche.
  await evaluer(`const c = document.querySelector('#seance-zone .choix');
    if (c) c.click(); else { const r = document.querySelector('#seance-zone .retourner');
      if (r) r.click(); else [...document.querySelectorAll('#seance-zone button')].find(b => /sais pas/.test(b.textContent)).click(); }
    return true;`);
  await pause(900);
  await capture('seance-reponse');
  // On termine la séance en répondant au hasard.
  for (let i = 0; i < 160; i += 1) {
    const fini = await evaluer(`
      if (!document.getElementById('seance-bilan').hidden) return true;
      const v = document.getElementById('seance-verdict');
      if (!v.hidden) { document.querySelector('#verdict-boutons .bouton-principal').click(); return false; }
      const nb = document.querySelector('#seance-zone .note-bouton.bien'); if (nb) { nb.click(); return false; }
      const c = document.querySelector('#seance-zone .choix:not([disabled])'); if (c) { c.click(); return false; }
      const r = document.querySelector('#seance-zone .retourner'); if (r) { r.click(); return false; }
      const s = document.querySelector('#seance-zone .saisie');
      if (s && !s.disabled) { [...document.querySelectorAll('#seance-zone button')].find(b => /sais pas/.test(b.textContent)).click(); }
      return false;`);
    if (fini) break;
    await pause(700);
  }
  await verifier('bilan de séance', "!document.getElementById('seance-bilan').hidden");
  await capture('seance-bilan');

  await evaluer("App.basculer('carnet'); return true;");
  await pause(500);
  await evaluer("Perso.ouvrir({graphie: 'chafouin'}); return true;");
  await pause(500);
  await evaluer(`const f = document.querySelector('#formulaire-perso form');
    f.querySelector('.sens-d').value = 'Qui a une mine sournoise, rusée.';
    f.querySelector('.sens-x').value = 'Il avait un air chafouin qui ne me disait rien.';
    return true;`);
  await capture('mot-perso-formulaire');
  await evaluer("document.querySelector('#formulaire-perso .pied-formulaire .bouton-principal').click(); return true;");
  await pause(1200);
  await verifier('le mot à soi a sa fiche', "document.querySelector('#fiche .vedette-mot') && document.querySelector('#fiche .vedette-mot').textContent === 'chafouin'");
  await capture('mot-perso-fiche');
  await evaluer("Fiche.fermer(); return true;");
  await pause(500);
  await evaluer("Carnet.montrer('notes'); return true;");
  await pause(500);
  await verifier('la note figure au carnet', "document.querySelector('#carnet-contenu .note-extrait')");
  await capture('carnet-notes');
  await evaluer("Carnet.montrer('fiches'); return true;");
  await pause(500);
  await capture('carnet-fiches');

  await evaluer("App.basculer('reglages'); return true;");
  await pause(1200);
  await capture('reglages');

  if (onglet.erreurs.length) {
    console.log('Erreurs de la page :');
    for (const e of onglet.erreurs) console.log('   ', e);
    echecs += onglet.erreurs.length;
  }
  onglet.fermer();
} finally {
  await fermerChrome(chrome);
}
console.log(echecs ? echecs + ' échec(s)' : 'Recette sans échec.');
process.exit(echecs ? 1 : 0);

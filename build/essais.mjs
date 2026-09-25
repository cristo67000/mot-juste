/*
 * Épreuves du cœur de l'application, sans navigateur.
 *
 * Les modules de js/ sont chargés tels quels dans un contexte `vm`, avec les
 * index réels de data/dico/ : on éprouve donc la vraie recherche sur le vrai
 * dictionnaire — formes fléchies, accents facultatifs, expressions par mot —,
 * la correction des réponses et le calendrier de révision.
 *
 *   node build/essais.mjs
 *   node build/essais.mjs --cles < cas.json   (appelé par verifier.py : rend les clés)
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const RACINE = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '..');
const lire = (f) => readFileSync(path.join(RACINE, f), 'utf-8');

const contexte = {
  console, Date, Math, JSON, Promise, Set, Map, Int32Array, Uint32Array, RegExp, String, Number,
  Array, Object, Error, TypeError, setTimeout, clearTimeout,
  document: { addEventListener() {}, dispatchEvent() {}, getElementById() { return null; } },
  CustomEvent: class { constructor(t, o) { this.type = t; this.detail = o && o.detail; } },
  crypto: globalThis.crypto,
  fetch: async (chemin) => ({ ok: true, text: async () => lire(chemin), json: async () => JSON.parse(lire(chemin)) }),
};
contexte.window = contexte;
vm.createContext(contexte);
for (const module of ['js/outils.js', 'js/lexique.js', 'js/revision.js', 'js/exercices.js']) {
  vm.runInContext(lire(module), contexte, { filename: module });
}
const { Lexique, Revision, Exercices } = contexte;

if (process.argv[2] === '--cles') {
  // Les cas arrivent par l'entrée standard : 5 000 vedettes ne tiennent pas
  // sur une ligne de commande Windows.
  const cas = JSON.parse(readFileSync(0, 'utf-8'));
  process.stdout.write(JSON.stringify(cas.map((c) => Lexique.cle(c))));
  process.exit(0);
}

const manifeste = JSON.parse(lire('data/manifeste.json'));
await Lexique.charger(manifeste);

let total = 0;
let fautes = 0;
function cas(libelle, condition, detail) {
  total += 1;
  if (!condition) fautes += 1;
  console.log((condition ? '  ok   ' : '  NON  ') + libelle + (!condition && detail !== undefined ? ' — ' + JSON.stringify(detail) : ''));
}
const mots = (liste) => liste.map((r) => r.mot);

// ── La recherche ────────────────────────────────────────────────────────────
console.log('Recherche');
let r = Lexique.chercher('chevaux');
cas('« chevaux » → cheval en tête', r[0] && r[0].mot === 'cheval' && r[0].via === 'chevaux', mots(r).slice(0, 3));
r = Lexique.chercher('fit');
cas('« fit » → faire parmi les premiers', mots(r).slice(0, 4).includes('faire'), mots(r).slice(0, 5));
r = Lexique.chercher('yeux');
cas('« yeux » → œil', mots(r).includes('œil'), mots(r).slice(0, 5));
r = Lexique.chercher('eleve');
cas('« eleve » → élève', mots(r).includes('élève'), mots(r).slice(0, 5));
r = Lexique.chercher('coeur');
cas('« coeur » → cœur en tête', r[0] && r[0].mot === 'cœur', mots(r).slice(0, 3));
r = Lexique.chercher("aujourd'hui");
cas('« aujourd\'hui » (apostrophe droite) → aujourd’hui', r[0] && r[0].mot === 'aujourd’hui', mots(r).slice(0, 3));
r = Lexique.chercher('pusillanime');
cas('« pusillanime » exact, rang 0', r[0] && r[0].mot === 'pusillanime' && r[0].rang === 0);
r = Lexique.chercher('mangeons');
cas('« mangeons » → manger', mots(r).includes('manger'), mots(r).slice(0, 3));
r = Lexique.chercher('belles');
cas('« belles » → beau', mots(r).includes('beau'), mots(r).slice(0, 3));
r = Lexique.chercher('ma');
cas('« ma » : les mots courants d’abord', r.length > 10 && r.slice(0, 6).every((x) => x.bande <= 1), r.slice(0, 6).map((x) => x.mot + ':' + x.bande));
cas('vedette exacte : « pêche » ≠ « péché »', Lexique.vedette('pêche') && Lexique.vedette('péché')
  && Lexique.vedette('pêche').mot === 'pêche' && Lexique.vedette('péché').mot === 'péché');
cas('résoudre « chevaux » dans un texte → cheval', (Lexique.resoudre('chevaux') || {}).mot === 'cheval');
cas('résoudre « Les » en début de phrase → les/le', !!Lexique.resoudre('Les'));
cas('un mot absent reste muet', Lexique.resoudre('zzzxq') === null);

console.log('Expressions');
let x = mots(Lexique.expressionsPour('pomme'));
cas('« pomme » → tomber dans les pommes', x.includes('tomber dans les pommes'), x.slice(0, 8));
x = mots(Lexique.expressionsPour('fumée feu'));
cas('« fumée feu » → il n’y a pas de fumée sans feu', x.includes('il n’y a pas de fumée sans feu'), x);
x = mots(Lexique.expressionsPour('feu'));
cas('« feu » → à petit feu', x.includes('à petit feu'), x.slice(0, 8));
x = mots(Lexique.expressionsPour('de'));
cas('« de » seul ne ratisse rien (mot-outil)', x.length === 0, x.length);

console.log('Entrées');
const feu = await Lexique.entree('feu');
cas('« feu » : plusieurs natures, étymologie, locutions', feu && feu.l.length >= 2 && feu.et && feu.loc && feu.loc.length > 20);
cas('« feu » : citations repérées', feu && feu.l[0].s[0].x && feu.l[0].s[0].x[0][1]);
const prendre = await Lexique.entree('prendre');
cas('« prendre » : participe passé et auxiliaire', prendre && JSON.stringify(prendre.l[0].f).includes('"pris","participe passé"')
  && JSON.stringify(prendre.l[0].f).includes('"avoir","auxiliaire"'), prendre && prendre.l[0].f);
const heureux = await Lexique.entree('heureux');
cas('« heureux » : synonymes et contraires', heureux && heureux.l[0].syn && heureux.l[0].ant);

// ── La correction ───────────────────────────────────────────────────────────
console.log('Correction');
const c = Exercices.corriger;
cas('juste', c('pusillanime', 'pusillanime').verdict === 'juste');
cas('majuscule indifférente', c('Pusillanime', 'pusillanime').verdict === 'juste');
cas('accents oubliés → presque', c('eleve', 'élève').verdict === 'presque');
cas('une lettre de travers, mot long → presque', c('pusilanime', 'pusillanime').verdict === 'presque');
cas('une lettre de travers, mot court → faux', c('feux', 'fou').verdict === 'faux');
cas('le lemme pour la forme → presque', c('cheval', 'chevaux', 'cheval').verdict === 'presque');
cas('autre mot → faux', c('lâche', 'pusillanime').verdict === 'faux');
cas('apostrophe typographique ou droite', c("aujourd'hui", 'aujourd’hui').verdict === 'juste');
cas('vide → faux', c('  ', 'feu').verdict === 'faux');
cas('masquer : « rapidement » cache « rapide »', !/rapide/.test(Exercices.masquer("D'une manière rapide.", 'rapidement')));
cas('masquer : « maison » ne cache pas « mais »', /mais/.test(Exercices.masquer('Bâtiment, mais aussi foyer.', 'maison')));
cas('indice d’un mot', Exercices.indice('pusillanime') === 'p… (11 lettres)', Exercices.indice('pusillanime'));
cas('indice d’une expression', Exercices.indice('à petit feu') === 'à… p… f… (3 mots)', Exercices.indice('à petit feu'));

// ── Le calendrier ───────────────────────────────────────────────────────────
console.log('Calendrier');
const JOUR = Revision.JOUR;
const t0 = Date.UTC(2026, 8, 25, 8, 0, 0);
let carte = Revision.neuve('dico:feu', 'feu', 'def');
carte = Revision.juger(carte, Revision.CORRECT, t0);
cas('neuve + juste → 10 minutes', carte.etat === 'apprentissage' && carte.echeance - t0 === 10 * 60000);
carte = Revision.juger(carte, Revision.CORRECT, t0 + 11 * 60000);
cas('puis juste → lendemain', carte.etat === 'apprentissage' && carte.palier === 1);
carte = Revision.juger(carte, Revision.CORRECT, t0 + JOUR);
cas('puis juste → en révision, 1 jour', carte.etat === 'revision' && carte.intervalle === 1);
carte = Revision.juger(carte, Revision.CORRECT, t0 + 2 * JOUR);
cas('révision juste → intervalle × facilité', carte.intervalle === 3, carte.intervalle);
const avant = carte.intervalle;
carte = Revision.juger(carte, Revision.RATE, t0 + 5 * JOUR);
cas('ratée → apprentissage, facilité rabotée', carte.etat === 'apprentissage' && carte.facilite < Revision.FACILITE_INITIALE);
cas('ratée → intervalle divisé, pas remis à zéro', carte.intervalle === Math.max(1, Math.round(avant * 0.3)));
let facile = Revision.juger(Revision.neuve('dico:x', 'x', 'mot'), Revision.FACILE, t0);
cas('neuve + facile → révision à 4 jours', facile.etat === 'revision' && facile.intervalle === 4);
let longue = Object.assign(Revision.neuve('dico:y', 'y', 'def'), { etat: 'revision', intervalle: 700, facilite: 2.8 });
cas('plafond de deux ans', Revision.juger(longue, Revision.FACILE, t0).intervalle === 730);
const espacees = Revision.espacer([
  { ref: 'a', id: 'a#def' }, { ref: 'a', id: 'a#mot' }, { ref: 'b', id: 'b#def' }, { ref: 'b', id: 'b#mot' },
]);
cas('les deux fiches d’un mot ne se suivent pas', espacees.every((f, i) => i === 0 || f.ref !== espacees[i - 1].ref),
  espacees.map((f) => f.id));

console.log(`\n${total - fautes}/${total} cas conformes`);
process.exit(fautes ? 1 : 0);

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
for (const module of ['js/outils.js', 'js/lexique.js', 'js/revision.js', 'js/exercices.js', 'js/grille.js']) {
  vm.runInContext(lire(module), contexte, { filename: module });
}
const { Lexique, Revision, Exercices, Grille } = contexte;

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

console.log('Mots hors de Lexique');
for (const mot of ['incrémenter', 'prandial', 'après-midi', 'sérendipité', 'désambiguïser']) {
  r = Lexique.chercher(mot);
  cas(`« ${mot} » au dictionnaire, en tête`, r[0] && r[0].mot === mot, mots(r).slice(0, 3));
}
console.log('Mots actuels (build/mots-actuels.txt)');
for (const mot of ['poucave', 'cringe', 'banger', 'seum', 'surperformer', 'crush', 'askip', 'prompter']) {
  r = Lexique.chercher(mot);
  cas(`« ${mot} » au dictionnaire, en tête`, r[0] && r[0].mot === mot, mots(r).slice(0, 3));
}
cas('« seum » range « avoir le seum »', mots(Lexique.expressionsPour('seum')).includes('avoir le seum'),
  mots(Lexique.expressionsPour('seum')));
cas('« moula », l’argent, ne mène pas à « mouler »', (Lexique.resoudre('moula') || {}).mot === 'moula',
  Lexique.resoudre('moula'));
cas('un mot actuel est « moins courant » au moins', Lexique.vedette('seum').bande <= 2, Lexique.vedette('seum'));
r = Lexique.chercher('incrémenté');
cas('« incrémenté » → incrémenter (forme vue par wordfreq)', mots(r).includes('incrémenter'), mots(r).slice(0, 3));
r = Lexique.chercher('tronçonneuse');
cas('« tronçonneuse » : la machine avant tronçonneur', r[0] && r[0].mot === 'tronçonneuse', mots(r).slice(0, 3));
r = Lexique.chercher('entrait');
cas('« entrait » : entrer avant la poutre', r[0] && r[0].mot === 'entrer' && mots(r).includes('entrait'), mots(r).slice(0, 3));
r = Lexique.chercher('trompe');
cas('« trompe » ne propose pas « je » (renvoi de hasard écarté)', !mots(r).includes('je'), mots(r).slice(0, 5));
const prandial = await Lexique.entree('prandial');
cas('« prandial » : un sens et une étymologie', prandial && prandial.l[0].s.length >= 1 && prandial.et);

console.log('Liens dans les textes');
for (const [forme, lemme] of [['est', 'être'], ['vit', 'voir'], ['doit', 'devoir'], ['sais', 'savoir'],
  ['fut', 'être'], ['entrait', 'entrer'], ['amis', 'ami'], ['trompe', 'tromper']]) {
  const trouve = Lexique.resoudre(forme);
  cas(`résoudre « ${forme} » → ${lemme}`, trouve && trouve.mot === lemme, trouve && trouve.mot);
}
for (const mot of ['bois', 'sens', 'tronçonneuse', 'prandial']) {
  const trouve = Lexique.resoudre(mot);
  cas(`résoudre « ${mot} » → lui-même`, trouve && trouve.mot === mot, trouve && trouve.mot);
}

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

// ── Les leurres ─────────────────────────────────────────────────────────────
console.log('Leurres');
{
  const e = await Lexique.entree('pusillanime');
  let propres = true;
  let exemple = null;
  for (let i = 0; i < 12; i += 1) {
    const q = await Exercices.preparer(Revision.neuve('dico:pusillanime', 'pusillanime', 'def'), e, 'varie', 'qcm-def');
    if (!q || q.forme !== 'qcm-def') { propres = false; exemple = q && q.forme; break; }
    const tache = q.choix.find((c) => / …/.test(c));
    if (tache) { propres = false; exemple = tache; break; }
  }
  cas('choix multiple : aucune définition tronquée par un masque (« la … »)', propres, exemple);
}

// ── La voix ─────────────────────────────────────────────────────────────────
// Des listes de voix telles que les rendent les systèmes, dans leur ordre :
// la canadienne arrive souvent la première, et c'est elle qu'on entendait.
console.log('Voix');
function voixSimulees(liste, enLigne = true) {
  const parlees = [];
  const ctx = {
    String, RegExp, Array, Object, Number, Map, Set, Intl,
    setTimeout: () => 0,
    document: { addEventListener() {}, dispatchEvent() {} },
    CustomEvent: class { constructor(t) { this.type = t; } },
    navigator: { onLine: enLigne },
    speechSynthesis: { getVoices: () => liste, addEventListener() {}, cancel() {}, speak: (p) => parlees.push(p) },
    SpeechSynthesisUtterance: class { constructor(t) { this.text = t; } },
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(lire('js/voix.js'), ctx, { filename: 'js/voix.js' });
  return { Voix: ctx.Voix, parlees };
}
const apple = (nom, lang, uri) => ({ name: nom, lang, localService: true, voiceURI: 'com.apple.' + uri });
const IPHONE = [
  apple('Amélie', 'fr-CA', 'voice.compact.fr-CA.Amelie'),
  apple('Eddy (français (Canada))', 'fr-CA', 'eloquence.fr-CA.Eddy'),
  apple('Eddy (français (France))', 'fr-FR', 'eloquence.fr-FR.Eddy'),
  apple('Flo (français (France))', 'fr-FR', 'eloquence.fr-FR.Flo'),
  apple('Grand-mère (français (France))', 'fr-FR', 'eloquence.fr-FR.Grandma'),
  apple('Samantha', 'en-US', 'voice.compact.en-US.Samantha'),
  apple('Thomas', 'fr-FR', 'voice.compact.fr-FR.Thomas'),
];
let v = voixSimulees(IPHONE).Voix;
cas('iPhone : Thomas (France), pas Amélie (Canada) ni Eddy', v.retenue && v.retenue.nom === 'Thomas', v.retenue);
cas('iPhone : la liste des Réglages commence par la France, finit par le Canada',
  v.lister()[0].nom === 'Thomas' && /Canada/.test(v.lister().at(-1).nom), v.lister().map((x) => x.libelle));
cas('iPhone : la région est dite quand le nom la tait', v.lister()[0].libelle === 'Thomas — France'
  && v.lister().some((x) => x.libelle === 'Amélie — Canada'), v.lister().map((x) => x.libelle));
v = voixSimulees([...IPHONE, apple('Audrey (amélioré)', 'fr-FR', 'voice.enhanced.fr-FR.Audrey')]).Voix;
cas('iPhone : une voix améliorée téléchargée passe devant la compacte', v.retenue.nom === 'Audrey (amélioré)', v.retenue);
const android = (nom, lang) => ({ name: nom, lang, localService: true, voiceURI: nom });
v = voixSimulees([android('Français Canada', 'fr-CA'), android('Français France', 'fr-FR'), android('English United States', 'en-US')]).Voix;
cas('Android : fr-FR, pas fr-CA venu d’abord', v.retenue.nom === 'Français France', v.retenue);
v = voixSimulees([android('fr_CA', 'fr_CA'), android('fr_FR', 'fr_FR')]);
cas('Android, balises à tiret bas : fr_FR retenue', v.Voix.retenue.nom === 'fr_FR', v.Voix.retenue);
v.Voix.dire('bagnole');
cas('l’énoncé porte la voix et une balise bien formée', v.parlees.length === 1
  && v.parlees[0].voice.name === 'fr_FR' && v.parlees[0].lang === 'fr-FR', v.parlees[0] && v.parlees[0].lang);
v = voixSimulees([android('Français (Canada)', 'fr'), android('eSpeak French', 'fr')]).Voix;
cas('balise sans région : le nom « Canada » suffit à la reléguer', v.retenue.nom === 'eSpeak French', v.retenue);
const windows = (nom, lang, locale) => ({ name: nom, lang, localService: locale, voiceURI: nom });
const EDGE = [
  windows('Microsoft Sylvie Online (Natural) - French (Canada)', 'fr-CA', false),
  windows('Microsoft Denise Online (Natural) - French (France)', 'fr-FR', false),
  windows('Microsoft Hortense - French (France)', 'fr-FR', true),
  windows('Microsoft Charline Online (Natural) - French (Belgium)', 'fr-BE', false),
];
v = voixSimulees(EDGE).Voix;
cas('Edge : la voix française de l’appareil, avant les voix en ligne', v.retenue.nom === 'Microsoft Hortense - French (France)', v.retenue);
cas('Edge : pas de région répétée quand le nom la dit', v.lister()[0].libelle === 'Microsoft Hortense - French (France)'
  && v.lister().at(-1).nom.includes('Canada'), v.lister().map((x) => x.libelle));
const QUEBEC = [windows('Microsoft Caroline - French (Canada)', 'fr-CA', true), windows('Google français', 'fr-FR', false)];
v = voixSimulees(QUEBEC).Voix;
cas('en ligne : une voix de France en ligne plutôt qu’une canadienne', v.retenue.nom === 'Google français', v.retenue);
v = voixSimulees(QUEBEC, false).Voix;
cas('hors ligne : la voix de l’appareil, seule à pouvoir parler', v.retenue.nom === 'Microsoft Caroline - French (Canada)', v.retenue);
v = voixSimulees(IPHONE).Voix;
v.regler({ voix: true, voixFr: { uri: 'com.apple.voice.compact.fr-CA.Amelie', nom: 'Amélie' } });
cas('une voix choisie dans les Réglages reste la sienne, même canadienne', v.retenue.nom === 'Amélie', v.retenue);
cas('le choix automatique, lui, ne bouge pas', v.automatique.nom === 'Thomas', v.automatique);
v.regler({ voix: true, voixFr: { uri: 'disparue', nom: 'Disparue' } });
cas('une voix disparue rend la main au choix automatique', v.retenue.nom === 'Thomas', v.retenue);
v = voixSimulees([windows('Microsoft Zira - English (United States)', 'en-US', true)]).Voix;
cas('aucune voix française : rien n’est lu', v.retenue === null && v.possible() === false && v.dire('flic') === false);

// L'avis des Réglages : quand une voix canadienne lit malgré tout, pourquoi.
v = voixSimulees([android('Français France', 'fr-FR'), android('Français Canada', 'fr-CA')]).Voix;
cas('voix de France présente : aucun avis', v.avisCanadien === null && v.retenue.region === 'FR', v.avisCanadien);
v = voixSimulees([android('Français Canada', 'fr-CA'), android('English United States', 'en-US')]).Voix;
cas('Android sans voix de France : avis « pas-de-france »', v.avisCanadien === 'pas-de-france', v.avisCanadien);
const FRANCE_EN_LIGNE = [windows('Google français', 'fr-FR', false), windows('Microsoft Caroline - French (Canada)', 'fr-CA', true)];
v = voixSimulees(FRANCE_EN_LIGNE, false).Voix;
cas('hors ligne, voix de France en ligne seulement : avis « france-en-ligne »', v.avisCanadien === 'france-en-ligne', v.avisCanadien);
v = voixSimulees(FRANCE_EN_LIGNE, true).Voix;
cas('en ligne, la même : la voix de France lit, aucun avis', v.avisCanadien === null && v.retenue.nom === 'Google français', v.retenue);
v = voixSimulees(IPHONE).Voix;
v.regler({ voix: true, voixFr: { uri: 'com.apple.voice.compact.fr-CA.Amelie', nom: 'Amélie' } });
cas('Amélie choisie à la main, Thomas présent : avis « choix-canadien »', v.avisCanadien === 'choix-canadien', v.avisCanadien);
v.regler({ voix: true, voixFr: null });
cas('retour à l’automatique : Thomas, aucun avis', v.avisCanadien === null && v.retenue.nom === 'Thomas', v.retenue);

// ── Les mots fléchés ────────────────────────────────────────────────────────
console.log('Mots fléchés');
{
  /* Un hasard reproductible : une grille d'épreuve est la même d'une fois sur
   * l'autre. */
  const graine = (g) => () => { g = (g * 1664525 + 1013904223) % 4294967296; return g / 4294967296; };
  const texte = lire('data/dico/fleches.idx');
  const lexique = Grille.lexique(texte);
  const lignes = texte.split('\n').filter(Boolean);
  const cles = lignes.map((l) => l.split('\t')[0]);
  cas('lexique des fléchés : plus de 20 000 mots, triés, bien formés',
    lexique.mots.length > 20000 && lexique.mots.length === lignes.length
      && cles.every((k, i) => i === 0 || cles[i - 1] < k)
      && lignes.every((l) => [5, 6].includes(l.split('\t').length) && /^[a-z]{2,8}\t/.test(l)),
    lexique.mots.length);
  const deux = lexique.mots.filter((m) => m.k.length === 2).map((m) => m.k);
  cas('à deux lettres, une courte liste choisie', deux.length >= 25 && deux.length <= 60
    && !deux.includes('au') && deux.includes('os'), deux);
  const rit = lexique.mots.find((m) => m.k === 'rit');
  cas('« rit » : une forme de rire, qui mène à sa fiche', rit && rit.vedette === 'rire' && /présent/.test(rit.nature), rit);
  cas('pas de mot vulgaire', !lexique.mots.some((m) => m.k === 'con'));

  const FICHES = ['pusillanime', 'narquois', 'sagace', 'diaphane', 'velleite', 'acrimonie', 'faconde',
    'ineffable', 'melliflu', 'obsequieux', 'pleonasme', 'sibyllin', 'cuistre', 'gouaille',
    'zizanie', 'abscons', 'callipyge', 'dithyrambe', 'egerie', 'fallacieux'];
  const COURANTES = ['egerie', 'faconde', 'cuistre', 'sagace', 'abscons', 'zizanie', 'acerbe', 'ineptie',
    'prolixe', 'ubuesque', 'hiatus', 'apanage', 'lacune', 'obvie', 'pecore', 'vetuste', 'quidam',
    'oiseux', 'aporie', 'ergoter', 'fadaise', 'gabegie', 'ivraie', 'lascif'];
  const enCandidats = (fiches) => fiches.map((k) => ({ k, prioritaire: true }));
  const connus = new Set(cles.concat(FICHES, COURANTES));

  /* Une grille pleine est juste si : aucune case vide ; chaque suite de deux
   * lettres ou plus, en ligne ou en colonne, est exactement un mot posé, connu,
   * annoncé par sa case de définition — celle qui le précède, ou sur les bords
   * celle d'à côté ; chaque lettre est d'un mot ; chaque case de définition
   * annonce un ou deux mots ; aucun mot n'est posé deux fois. */
  function defauts(g) {
    const { cases, traces } = Grille.cases(g);
    const C = g.colonnes, L = g.lignes;
    const trouves = [];
    const attendus = new Set(g.mots.map((m) => m.sens + ':' + m.l + ':' + m.c + ':' + m.k));
    const lus = new Set();
    const suite = (l, c, dl, dc) => {
      let mot = '';
      while (l < L && c < C && cases[l * C + c].type === 'lettre') { mot += cases[l * C + c].lettre; l += dl; c += dc; }
      return mot;
    };
    cases.forEach((x, p) => {
      if (x.type === 'vide') trouves.push('case vide ' + p);
      if (x.type === 'lettre' && !x.mots.length) trouves.push('lettre isolée ' + p);
      if (x.type === 'def' && (x.defs.length < 1 || x.defs.length > 2)) trouves.push('case à ' + x.defs.length + ' définitions');
    });
    for (let l = 0; l < L; l += 1) {
      for (let c = 0; c < C; c += 1) {
        if (cases[l * C + c].type !== 'lettre') continue;
        for (const [sens, dl, dc] of [['h', 0, 1], ['v', 1, 0]]) {
          if (l - dl >= 0 && c - dc >= 0 && cases[(l - dl) * C + c - dc].type === 'lettre') continue;   // pas un début
          const mot = suite(l, c, dl, dc);
          if (mot.length < 2) continue;
          const signature = sens + ':' + l + ':' + c + ':' + mot;
          lus.add(signature);
          if (!attendus.has(signature)) trouves.push('suite imprévue ' + signature);
          if (!connus.has(mot)) trouves.push('mot inconnu ' + mot);
        }
      }
    }
    for (const a of attendus) if (!lus.has(a)) trouves.push('mot illisible ' + a);
    g.mots.forEach((m, n) => {
      if (traces[n].some((p, i) => cases[p].lettre !== m.k[i])) trouves.push('lettres écrasées ' + m.k);
      const [el, ec] = m.sens === 'h' ? (m.c > 0 ? [m.l, m.c - 1] : [m.l - 1, 0]) : (m.l > 0 ? [m.l - 1, m.c] : [0, m.c - 1]);
      if (m.dl !== el || m.dc !== ec) trouves.push('flèche mal placée ' + m.k);
    });
    if (new Set(g.mots.map((m) => m.k)).size !== g.mots.length) trouves.push('mot posé deux fois');
    return trouves;
  }

  let pires = [];
  let moins = Infinity, plus = 0, nuls = 0, croisees = 0, lettres = 0;
  const debut = Date.now();
  for (let g = 1; g <= 8; g += 1) {
    const grille = Grille.composer(enCandidats(FICHES), { lexique, hasard: graine(g) });
    if (!grille) { nuls += 1; continue; }
    pires = pires.concat(defauts(grille));
    const n = grille.mots.filter((m) => m.prioritaire).length;
    moins = Math.min(moins, n);
    plus = Math.max(plus, n);
    for (const x of Grille.cases(grille).cases) {
      if (x.type === 'lettre') { lettres += 1; if (x.mots.length === 2) croisees += 1; }
    }
  }
  const duree = (Date.now() - debut) / 8;
  cas('8 grilles pleines tirées : toutes justes', nuls === 0 && pires.length === 0, { nuls, pires: pires.slice(0, 3) });
  cas('des mots longs et rares : 3 mots des fiches par grille au moins', moins >= 3, { moins, plus });
  cas('les trois quarts des lettres servent à deux mots', croisees / lettres >= 0.7, croisees / lettres);
  cas('moins de deux secondes par grille', duree < 2000, Math.round(duree) + ' ms');

  let grille = Grille.composer(enCandidats(COURANTES), { lexique, hasard: graine(3) });
  const n = grille ? grille.mots.filter((m) => m.prioritaire).length : 0;
  cas('des mots de fiches plus ordinaires : 4 par grille au moins, grille juste',
    n >= 4 && defauts(grille).length === 0, grille && grille.mots.filter((m) => m.prioritaire).map((m) => m.k));
  grille = Grille.composer([], { lexique, hasard: graine(5) });
  cas('aucune fiche : une grille de mots courants, juste', grille && grille.mots.length >= 25 && defauts(grille).length === 0,
    grille && defauts(grille).slice(0, 3));
  grille = Grille.composer([{ k: 'anticonstitutionnellement', prioritaire: true }, { k: 'été', prioritaire: true }], { lexique, hasard: graine(2) });
  cas('ni mot trop long ni lettre accentuée : écartés, la grille se fait sans eux',
    grille && !grille.mots.some((m) => m.prioritaire) && defauts(grille).length === 0);
  cas('sans lexique, rien ne casse', Grille.composer(enCandidats(FICHES), { hasard: graine(1), essais: 1 }) === null);
  grille = Grille.composer(enCandidats(FICHES), { lexique, hasard: graine(11) });
  cas('les mots sont rendus dans l’ordre de lecture', grille.mots.every((m, i) => i === 0
    || grille.mots[i - 1].l < m.l || (grille.mots[i - 1].l === m.l && grille.mots[i - 1].c <= m.c)));
  cas('les flèches : → ↓ devant le mot, ↳ ↴ sur les bords',
    Grille.fleche({ sens: 'h', l: 2, c: 1, dl: 2, dc: 0 }) === '→' && Grille.fleche({ sens: 'h', l: 2, c: 0, dl: 1, dc: 0 }) === '↳'
    && Grille.fleche({ sens: 'v', l: 1, c: 3, dl: 0, dc: 3 }) === '↓' && Grille.fleche({ sens: 'v', l: 0, c: 3, dl: 0, dc: 2 }) === '↴');
  const ancienne = { colonnes: 4, lignes: 2, mots: [{ k: 'ane', l: 0, c: 1, sens: 'h' }] };
  const vieux = Grille.cases(ancienne);
  cas('une grille gardée d’avant les grilles pleines se joue encore',
    vieux.cases[0].type === 'def' && vieux.traces[0].join() === '1,2,3' && Grille.fleche(ancienne.mots[0]) === '→');
}

// ── Les illustrations ───────────────────────────────────────────────────────
console.log('Illustrations');
{
  const PLANCHES = ['js/illustrations.js', 'js/planches-corps.js', 'js/planches-formes.js', 'js/planches-signes.js',
    'js/planches-couleurs.js', 'js/planches-objets.js'];
  for (const f of PLANCHES) vm.runInContext(lire(f), contexte, { filename: f });
  const { Illustrations } = contexte;
  const css = lire('css/app.css');
  const aSaFiche = (mot) => !!(Lexique.vedette(mot) && Lexique.vedette(mot).mot === mot);
  const absents = [];
  const sansSens = [];
  const sansSujet = [];
  const malFormes = [];
  const classes = new Set();
  const revelateurs = [];

  /* Le petit langage des dessins (js/illustrations.js), relu sans navigateur. */
  function relire(code, ou, mot) {
    let reste = String(code).trim();
    while (reste[0] === '.' || reste[0] === '#') {
      const fin = reste.search(/\s/);
      const jeton = reste.slice(0, fin);
      reste = reste.slice(fin).trim();
      if (jeton[0] === '#') { if (!/^#[0-9a-fA-F]{3,6}$/.test(jeton)) malFormes.push(ou + ' : ' + jeton); } else for (const c of jeton.split('.')) if (c) classes.add(c);
    }
    const lettre = reste[0];
    const args = reste.slice(1).trim();
    const nombres = args.split(/[\s,]+/).filter(Boolean);
    const chiffres = (n) => nombres.length === n && nombres.every((x) => Number.isFinite(Number(x)));
    let bon = false;
    if (lettre === 'M' || lettre === 'm') bon = /^[MmLlHhVvCcSsQqTtAaZz0-9.,\s-]+$/.test(reste) && !/NaN|undefined/.test(reste);
    else if (lettre === 'C') bon = chiffres(3);
    else if (lettre === 'E') bon = chiffres(4);
    else if (lettre === 'R') bon = chiffres(4) || chiffres(5);
    else if (lettre === 'T') {
      const m = args.match(/^(\S+)\s+(\S+)\s+(\S+)\s+([\s\S]+)$/);
      bon = !!m && [m[1], m[2], m[3]].every((x) => Number.isFinite(Number(x)));
      // En indice d'une question, le dessin ne doit pas donner la réponse.
      if (m && mot && mot.length >= 3 && Lexique.cle(m[4]).includes(Lexique.cle(mot))) revelateurs.push(ou);
    }
    if (!bon) malFormes.push(ou + ' : ' + String(code).slice(0, 50));
  }
  const aplatir = (d) => (Array.isArray(d) ? d.flatMap(aplatir) : (d ? [d] : []));

  let mots = 0;
  for (const p of Illustrations.planches) {
    if (!(p.sujets || []).some(aSaFiche)) sansSujet.push(p.id);
    if (p.schema) aplatir(p.d).forEach((code, i) => relire(code, p.id + '[' + i + ']', null));
    for (const item of p.items) {
      if (p.schema && ![item.x, item.y, item.lx, item.ly].every(Number.isFinite)) malFormes.push(p.id + ' · ' + item.mot + ' : repère');
      if (!p.schema) aplatir(item.d).forEach((code, i) => relire(code, p.id + ' · ' + item.mot + '[' + i + ']', item.mot));
      for (const mot of [item.mot].concat(item.aussi || [])) {
        mots += 1;
        if (!aSaFiche(mot)) { absents.push(p.id + ' · ' + mot); continue; }
        if ('sens' in item && item.sens === false) continue;
        const re = 'sens' in item ? item.sens : p.sens;
        const entree = await Lexique.entree(mot);
        if (!re || !entree.l.some((l) => l.s.some((s) => s.d && re.test(s.d)))) sansSens.push(p.id + ' · ' + mot);
      }
    }
  }
  cas(`${Illustrations.planches.length} planches, ${mots} mots : chacun a sa fiche`, Illustrations.planches.length >= 40 && !absents.length, absents);
  cas('chaque dessin reconnaît le sens qu’il montre (après une reconstruction aussi)', !sansSens.length, sansSens);
  cas('chaque planche a un sujet au dictionnaire', !sansSujet.length, sansSujet);
  cas('les dessins sont bien formés', !malFormes.length, malFormes.slice(0, 6));
  const orphelines = [...classes].filter((c) => !css.includes('.i-' + c + ' ') && !css.includes('.i-' + c + '.') && !css.includes('.i-' + c + ','));
  cas('toutes leurs classes sont dans la feuille de style', !orphelines.length, orphelines);
  cas('aucun dessin n’écrit le mot qu’il illustre', !revelateurs.length, revelateurs);

  const sensDe = async (mot, re) => (await Lexique.entree(mot)).l.flatMap((l) => l.s).find((s) => s.d && re.test(s.d));
  const aquilin = await Lexique.entree('aquilin');
  let f = Illustrations.pourEntree(aquilin);
  cas('« aquilin » : le dessin sous le nez en bec d’aigle, pas sous « traits du visage »',
    f.figures.size === 1 && /nez/.test([...f.figures.keys()][0].d) && f.planches[0].planche.id === 'nez', [...f.figures.keys()].map((s) => s.d));
  cas('« busqué » : au nez bombé, jamais à l’écluse',
    !!Illustrations.pourSens('busqué', (await sensDe('busqué', /bombé/)).d) && !Illustrations.pourSens('busqué', (await sensDe('busqué', /écluse/)).d));
  f = Illustrations.pourEntree(await Lexique.entree('cloche'));
  cas('« cloche » : le chapeau, sous son sens de chapeau',
    f.figures.size === 1 && /Chapeau de femme/.test([...f.figures.keys()][0].d));
  f = Illustrations.pourEntree(await Lexique.entree('nez'));
  cas('« nez » : la planche entière, sans dessin de sens', f.figures.size === 0 && f.planches.length === 1 && f.planches[0].item === null);
  f = Illustrations.pourEntree(await Lexique.entree('rouflaquette'));
  cas('« rouflaquette » : favoris au sens 1, accroche-cœur au sens 2, deux planches',
    f.figures.size === 2 && f.planches.map((x) => x.planche.id).join() === 'barbes,coiffures', f.planches.map((x) => x.planche.id));
  f = Illustrations.pourEntree(await Lexique.entree('carreau'));
  cas('« carreau » (sens: false) : sur la planche des cartes, aucun dessin de sens', f.figures.size === 0 && f.planches[0].planche.id === 'cartes');
  cas('un mot à soi n’a pas de dessin, même homonyme', Illustrations.pourEntree({ perso: 'p1', m: 'aquilin', l: aquilin.l }).figures.size === 0);
  cas('une définition masquée (fléchés) garde son dessin',
    !!Illustrations.pourSens('losange', Exercices.masquer((await sensDe('losange', /quadrilatère/)).d, 'losange')));
  const sw = lire('sw.js');
  const page = lire('index.html');
  cas('la coquille installe les planches, la page les charge avant la fiche', PLANCHES.every((x) => sw.includes("'" + x + "'")
    && page.includes('src="' + x + '"')) && page.indexOf('js/planches-objets.js') < page.indexOf('js/fiche.js'));
}

console.log(`\n${total - fautes}/${total} cas conformes`);
process.exit(fautes ? 1 : 0);

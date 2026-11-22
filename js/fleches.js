'use strict';
/*
 * L'onglet Fléchés : une grille de mots fléchés faite des mots qu'on révise.
 *
 * ── D'où viennent les mots ─────────────────────────────────────────────────
 *
 * La grille est pleine, comme celles des journaux (js/grille.js). Les mots des
 * fiches de révision y sont posés d'abord, les plus fragiles en tête : un mot
 * raté hier a plus de chances d'y entrer qu'un mot su depuis six mois, et les
 * mots de la grille précédente passent leur tour. Les mots consultés
 * récemment sont essayés ensuite, s'ils tiennent. Le reste — les croisements —
 * est fait de mots courants, tirés de data/dico/fleches.idx avec leur indice :
 * ce sont eux qui donnent les lettres qui mettent sur la voie des mots rares.
 * La définition d'un mot des fiches est celle de sa fiche, le mot masqué.
 *
 * Seuls entrent les mots d'un seul tenant, de 3 à 10 lettres : ni locutions ni
 * traits d'union. Comme dans toute grille, les accents tombent — « égérie »
 * s'écrit EGERIE, « cœur » COEUR.
 *
 * ── Le jeu ─────────────────────────────────────────────────────────────────
 *
 * Une définition ne tient pas dans une case de téléphone : la case fléchée ne
 * porte que sa flèche (→ ↓, et sur les bords ↳ ↴), et la définition du mot
 * choisi s'affiche au-dessus de la grille. Le clavier est celui de l'application, pas celui du téléphone :
 * il ne recouvre pas la grille et ne propose que des lettres.
 *
 * Un mot entièrement juste se verrouille de lui-même, en vert. Trois aides :
 * révéler une lettre, révéler le mot, signaler les lettres fausses.
 *
 * ── Et le calendrier des fiches ? ──────────────────────────────────────────
 *
 * Il ne bouge pas. Un mot trouvé sans aide est journalisé comme une réponse
 * juste d'entraînement libre : il compte dans la journée et la série, mais
 * les lettres des croisements aident trop pour qu'on en conclue que le mot est
 * su pour six mois.
 *
 * La grille en cours est gardée sur l'appareil : on la retrouve en revenant.
 */
(function (racine) {

  const { element, bouton } = Outils;
  const $ = (id) => document.getElementById(id);
  const CLE = 'mot-juste-fleches';
  const FORMAT = 1;
  const COLONNES = 9, LIGNES = 11;
  const CLAVIER = ['AZERTYUIOP', 'QSDFGHJKLM', 'WXCVBN'];

  let manifeste = null;
  let lexique = null;       // Promise<Grille.lexique> : les mots des croisements
  const e = {};
  let partie = null;        // la grille, ses mots, ce qui est écrit
  let plan = null;          // { cases, traces } — Grille.cases(partie)
  let noeuds = [];          // une case d'écran par case de grille
  let actif = { mot: -1, pos: -1 };
  let fausses = new Set();
  let occupe = false;

  // ── Garder la grille en cours ─────────────────────────────────────────────

  function garder() {
    try {
      if (partie) localStorage.setItem(CLE, JSON.stringify(partie));
      else localStorage.removeItem(CLE);
    } catch (erreur) { /* navigation privée : la grille vit le temps de la page */ }
  }

  function retrouver() {
    try {
      const p = JSON.parse(localStorage.getItem(CLE) || 'null');
      if (p && p.format === FORMAT && Array.isArray(p.mots) && p.mots.length) return p;
    } catch (erreur) { /* illisible : on en composera une autre */ }
    return null;
  }

  // ── Choisir les mots ──────────────────────────────────────────────────────

  /* Les mots des croisements, lus une fois. */
  function lexiqueDesFleches() {
    if (!lexique) {
      lexique = fetch('data/dico/fleches.idx')
        .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.text(); })
        .then((texte) => Grille.lexique(texte));
      lexique.catch(() => { lexique = null; });
    }
    return lexique;
  }

  async function candidats(precedents) {
    const vus = new Set();
    const liste = [];
    function ajouter(mot, ref, prioritaire) {
      const k = Lexique.cle(mot);
      if (!/^[a-z]{3,10}$/.test(k) || vus.has(k)) return false;
      vus.add(k);
      liste.push({ k, mot, ref, prioritaire });
      return true;
    }
    const motDe = (ref) => (ref.startsWith('perso:')
      ? (Perso.lire(ref.slice(6)) || {}).mot : ref.slice(5));

    // Les fiches : une ligne par mot, à son intervalle le plus court.
    const parRef = new Map();
    for (const carte of await Store.toutesLesCartes().catch(() => [])) {
      const connu = parRef.get(carte.ref);
      if (connu === undefined || carte.intervalle < connu) parRef.set(carte.ref, carte.intervalle);
    }
    const deja = new Set(precedents);
    const fiches = Array.from(parRef, ([ref, intervalle]) => ({
      ref,
      rang: (deja.has(ref) ? 1000 : 0) + intervalle * (0.5 + Math.random()) + Math.random() * 4,
    })).sort((a, b) => a.rang - b.rang);
    let nFiches = 0;
    for (const f of fiches) {
      const mot = motDe(f.ref);
      if (mot && ajouter(mot, f.ref, true)) nFiches += 1;
      if (nFiches >= 36) break;
    }

    // Ce qu'on a consulté récemment : essayé juste après les fiches.
    let n = 0;
    for (const ligne of await Store.historique().catch(() => [])) {
      if (n >= 12) break;
      const mot = motDe(ligne.ref);
      if (mot && !deja.has(ligne.ref) && ajouter(mot, ligne.ref, false)) n += 1;
    }
    return { liste, fiches: parRef.size };
  }

  /* La définition d'un mot posé : celle de sa fiche, le mot masqué ; à défaut
   * — hors ligne, tranche pas encore sur l'appareil — l'aperçu de l'index. */
  async function definir(m) {
    if (!m.ref) {
      // Un mot des croisements : son indice vient du lexique des fléchés.
      const vedette = m.vedette || m.mot;
      m.ref = 'dico:' + vedette;
      // Le mot exact seulement : la racine de « mil » masquerait « Millet ».
      let def = m.def;
      for (const x of new Set([vedette, m.mot])) {
        const echappe = x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        def = def.replace(new RegExp('(?<![\\p{L}])' + echappe + '(?![\\p{L}])', 'giu'), '…');
      }
      if (vedette.length >= 7) def = Exercices.masquer(def, vedette);
      m.def = Exercices.court(def, 200);
      delete m.bande;
      return;
    }
    let entree = null;
    if (m.ref.startsWith('perso:')) {
      const p = Perso.lire(m.ref.slice(6));
      entree = p ? Perso.enEntree(p) : null;
    } else {
      entree = await Lexique.entree(m.ref.slice(5)).catch(() => null);
    }
    const x = entree ? Exercices.premierSens(entree, true) : null;
    if (x) {
      m.def = Exercices.court(Exercices.masquer(x.s.d, entree.m), 200);
      m.nature = x.l.nat || '';
      return;
    }
    const v = Lexique.vedette(m.mot);
    m.def = v && v.apercu ? Exercices.masquer(v.apercu, m.mot) : 'Définition indisponible hors ligne.';
    m.nature = v ? v.nature : '';
  }

  async function nouvelle(annulable) {
    if (occupe) return;
    occupe = true;
    const avant = partie;
    e.attente.textContent = 'Composition de la grille…';
    e.attente.hidden = false;
    try {
      let lex;
      try {
        lex = await lexiqueDesFleches();
      } catch (erreur) {
        e.attente.textContent = 'Les mots des grilles ne sont pas encore sur l’appareil : '
          + 'il faut une connexion la première fois.';
        return;
      }
      const c = await candidats(avant ? avant.mots.map((m) => m.ref) : []);
      // Le temps d'afficher « Composition… » : composer occupe la page une
      // seconde ou deux.
      await new Promise((fin) => setTimeout(fin, 30));
      const grille = Grille.composer(c.liste, { lexique: lex, colonnes: COLONNES, lignes: LIGNES });
      if (!grille || grille.mots.length < 3) {
        e.attente.textContent = 'Impossible de composer une grille pour l’instant.';
        return;
      }
      await Promise.all(grille.mots.map(definir));
      partie = {
        format: FORMAT, colonnes: grille.colonnes, lignes: grille.lignes,
        mots: grille.mots.map((m) => Object.assign(m, { trouve: false, aide: false })),
        saisie: {}, fini: false, fiches: c.fiches,
      };
      e.attente.hidden = true;
      installer();
      garder();
      if (annulable && avant && !avant.fini && Object.keys(avant.saisie).length) {
        Outils.annoncer('Nouvelle grille.', () => { partie = avant; installer(); garder(); });
      }
    } finally {
      occupe = false;
    }
  }

  // ── Dessiner ──────────────────────────────────────────────────────────────

  function installer() {
    plan = Grille.cases(partie);
    fausses = new Set();
    const grille = e.grille;
    grille.textContent = '';
    grille.style.setProperty('--colonnes', partie.colonnes);
    grille.style.setProperty('--lignes', partie.lignes);
    noeuds = plan.cases.map((c, p) => {
      let noeud;
      if (c.type === 'def') {
        noeud = bouton('case def', '', () => toucherDefinition(p));
        noeud.setAttribute('aria-label', 'Définition');
        for (const n of c.defs) noeud.appendChild(element('span', null, Grille.fleche(partie.mots[n])));
      } else if (c.type === 'lettre') {
        noeud = bouton('case lettre', '', () => toucherLettre(p));
      } else {
        noeud = element('div', 'case vide');
      }
      grille.appendChild(noeud);
      return noeud;
    });
    e.jeu.hidden = false;
    // On commence par un mot des fiches : c'est pour eux qu'on joue.
    let premier = partie.mots.findIndex((m) => !m.trouve && m.prioritaire);
    if (premier === -1) premier = partie.mots.findIndex((m) => !m.trouve);
    actif = { mot: -1, pos: -1 };
    if (premier !== -1) choisir(premier);
    dessinerOrigine();
    peindre();
  }

  function dessinerOrigine() {
    const n = partie.mots.filter((m) => m.prioritaire).length;
    e.origine.textContent = n
      ? Outils.nombre(n, 'mot') + ' de vos fiches, marqués « mes fiches » ; les mots courants '
        + 'qui les croisent sont là pour vous mettre sur la voie.'
      : (partie.fiches ? 'Aucun mot de vos fiches ne tenait dans cette grille : touchez « Nouvelle grille ».'
        : 'Vous n’avez pas encore de fiches : cette grille est faite de mots courants. '
          + 'Les mots que vous ajouterez à vos fiches viendront ici.');
  }

  const verrouillee = (p) => plan.cases[p].mots.some((n) => partie.mots[n].trouve);
  const attendue = (p) => plan.cases[p].lettre.toUpperCase();

  function peindre() {
    const trace = actif.mot === -1 ? [] : plan.traces[actif.mot];
    plan.cases.forEach((c, p) => {
      const noeud = noeuds[p];
      if (c.type === 'lettre') {
        noeud.textContent = partie.saisie[p] || '';
        noeud.classList.toggle('trouvee', verrouillee(p));
        noeud.classList.toggle('fausse', fausses.has(p));
        noeud.classList.toggle('dans-mot', trace.indexOf(p) !== -1);
        noeud.classList.toggle('active', p === actif.pos);
      } else if (c.type === 'def') {
        noeud.classList.toggle('faite', c.defs.every((n) => partie.mots[n].trouve));
        noeud.classList.toggle('dans-mot', c.defs.indexOf(actif.mot) !== -1);
      }
    });
    const trouves = partie.mots.filter((m) => m.trouve).length;
    e.compte.textContent = trouves + ' / ' + partie.mots.length;
    peindreIndice();
    e.clavier.hidden = partie.fini;
    e.bilan.hidden = !partie.fini;
  }

  function peindreIndice() {
    const zone = e.indice;
    zone.textContent = '';
    const m = partie.mots[actif.mot];
    if (!m) {
      zone.appendChild(element('p', 'discret', 'Touchez une case pour lire sa définition.'));
      return;
    }
    const tete = element('p', 'indice-tete');
    tete.appendChild(element('span', 'indice-fleche', Grille.fleche(m)));
    if (m.nature) tete.appendChild(element('span', 'nature-courte', m.nature));
    tete.appendChild(element('span', 'discret', m.k.length + ' lettres'));
    if (m.prioritaire) tete.appendChild(element('span', 'pastille', 'mes fiches'));
    zone.appendChild(tete);
    zone.appendChild(element('p', 'indice-definition', m.def));
    if (m.trouve) {
      const p = element('p', 'indice-trouve');
      p.appendChild(element('span', null, m.mot + ' '));
      p.appendChild(bouton('lien-discret', 'Voir la fiche', () => ouvrirFiche(m)));
      zone.appendChild(p);
    }
  }

  function ouvrirFiche(m) {
    if (m.ref.startsWith('perso:')) Fiche.ouvrir({ perso: m.ref.slice(6) });
    else Fiche.ouvrir({ mot: m.ref.slice(5) });
  }

  // ── Se déplacer ───────────────────────────────────────────────────────────

  /* Choisir un mot : le curseur va à sa première case encore vide, à défaut à
   * sa première case libre. */
  function choisir(n) {
    const trace = plan.traces[n];
    let pos = trace.find((p) => !verrouillee(p) && !partie.saisie[p]);
    if (pos === undefined) pos = trace.find((p) => !verrouillee(p));
    actif = { mot: n, pos: pos === undefined ? trace[0] : pos };
  }

  function toucherLettre(p) {
    const mots = plan.cases[p].mots;
    if (p === actif.pos && mots.length > 1) {
      // Un second toucher sur un croisement change de sens.
      actif = { mot: mots.find((n) => n !== actif.mot), pos: p };
    } else if (mots.indexOf(actif.mot) !== -1) {
      actif.pos = p;
    } else {
      const n = mots.find((x) => !partie.mots[x].trouve);
      actif = { mot: n === undefined ? mots[0] : n, pos: p };
    }
    peindre();
  }

  function toucherDefinition(p) {
    const defs = plan.cases[p].defs;
    const autre = defs.find((n) => n !== actif.mot);
    choisir(defs.indexOf(actif.mot) !== -1 && autre !== undefined ? autre : defs[0]);
    peindre();
  }

  /* Le mot suivant : le prochain mot des fiches encore à trouver, à défaut
   * le prochain tout court. */
  function motSuivant() {
    const total = partie.mots.length;
    for (const fiches of [true, false]) {
      for (let i = 1; i <= total; i += 1) {
        const n = (actif.mot + i) % total;
        const m = partie.mots[n];
        if (!m.trouve && (m.prioritaire || !fiches)) { choisir(n); return; }
      }
    }
  }

  /* Les flèches du clavier : la case de lettre voisine, s'il y en a une. */
  function deplacer(dl, dc) {
    if (actif.pos < 0) return;
    const C = partie.colonnes;
    const l = Math.floor(actif.pos / C) + dl;
    const c = (actif.pos % C) + dc;
    if (l < 0 || c < 0 || l >= partie.lignes || c >= C) return;
    const p = l * C + c;
    if (plan.cases[p].type !== 'lettre') return;
    const mots = plan.cases[p].mots;
    const sens = dl ? 'v' : 'h';
    const n = mots.indexOf(actif.mot) !== -1 ? actif.mot
      : (mots.find((x) => partie.mots[x].sens === sens) === undefined ? mots[0]
        : mots.find((x) => partie.mots[x].sens === sens));
    actif = { mot: n, pos: p };
    peindre();
  }

  // ── Écrire ────────────────────────────────────────────────────────────────

  function journaliser(m) {
    if (!m.prioritaire || m.aide) return;
    Store.cartesDe(m.ref).then((cartes) => {
      const carte = cartes.find((c) => c.type === 'mot') || cartes[0];
      if (carte) return Revision.noter(carte, Revision.CORRECT, 'fleches', true);
      return null;
    }).catch(() => {});
  }

  /* Écrit une lettre dans une case, puis regarde si un mot vient de tomber.
   * `aide` : la lettre a été révélée — le mot qu'on travaillait n'est plus
   * « trouvé seul ». Le mot qu'elle croise, lui, n'y perd rien : il aurait eu
   * cette lettre de toute façon, une fois l'autre trouvé. */
  function ecrire(p, lettre, aide) {
    if (verrouillee(p)) return;
    partie.saisie[p] = lettre;
    fausses.delete(p);
    if (aide) partie.mots[actif.mot].aide = true;
    for (const n of plan.cases[p].mots) {
      const m = partie.mots[n];
      if (!m.trouve && plan.traces[n].every((q) => partie.saisie[q] === attendue(q))) {
        m.trouve = true;
        journaliser(m);
      }
    }
  }

  function apres() {
    if (partie.mots.every((m) => m.trouve)) {
      partie.fini = true;
      actif.pos = -1;
      dessinerBilan();
    } else if (partie.mots[actif.mot].trouve) {
      motSuivant();
    }
    garder();
    peindre();
    if (partie.fini) e.bilan.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function taper(lettre) {
    if (!partie || partie.fini || actif.pos < 0) return;
    const trace = plan.traces[actif.mot];
    let i = trace.indexOf(actif.pos);
    // Sur une case déjà trouvée par un croisement, la lettre va à la suivante.
    while (i < trace.length && verrouillee(trace[i])) i += 1;
    if (i >= trace.length) return;
    ecrire(trace[i], lettre, false);
    let j = i + 1;
    while (j < trace.length && verrouillee(trace[j])) j += 1;
    actif.pos = j < trace.length ? trace[j] : trace[i];
    apres();
  }

  function effacer() {
    if (!partie || partie.fini || actif.pos < 0) return;
    const trace = plan.traces[actif.mot];
    let i = trace.indexOf(actif.pos);
    if (verrouillee(trace[i]) || !partie.saisie[trace[i]]) {
      i -= 1;
      while (i >= 0 && verrouillee(trace[i])) i -= 1;
      if (i < 0) return;
    }
    delete partie.saisie[trace[i]];
    fausses.delete(trace[i]);
    actif.pos = trace[i];
    garder();
    peindre();
  }

  // ── Les aides ─────────────────────────────────────────────────────────────

  function revelerLettre() {
    if (!partie || partie.fini || actif.pos < 0) return;
    const trace = plan.traces[actif.mot];
    let p = actif.pos;
    if (verrouillee(p) || partie.saisie[p] === attendue(p)) {
      p = trace.find((q) => !verrouillee(q) && partie.saisie[q] !== attendue(q));
      if (p === undefined) return;
    }
    ecrire(p, attendue(p), true);
    const suite = trace.slice(trace.indexOf(p) + 1).find((q) => !verrouillee(q) && !partie.saisie[q]);
    actif.pos = suite === undefined ? p : suite;
    apres();
  }

  function revelerMot() {
    if (!partie || partie.fini || actif.mot < 0) return;
    for (const p of plan.traces[actif.mot]) ecrire(p, attendue(p), true);
    apres();
  }

  function verifier() {
    if (!partie || partie.fini) return;
    fausses = new Set();
    plan.cases.forEach((c, p) => {
      if (c.type === 'lettre' && partie.saisie[p] && partie.saisie[p] !== attendue(p)) fausses.add(p);
    });
    peindre();
    Outils.annoncer(fausses.size ? Outils.nombre(fausses.size, 'lettre') + ' à revoir, en rouge.'
      : 'Aucune lettre fausse pour l’instant.');
  }

  // ── Le bilan ──────────────────────────────────────────────────────────────

  function dessinerBilan() {
    const zone = e.bilan;
    zone.textContent = '';
    const seul = partie.mots.filter((m) => !m.aide).length;
    const total = partie.mots.length;
    zone.appendChild(element('h3', null, 'Grille terminée'));
    zone.appendChild(element('p', 'discret', seul === total
      ? 'Les ' + total + ' mots trouvés sans aide — bravo.'
      : Outils.nombre(seul, 'mot trouvé', 'mots trouvés') + ' sans aide sur ' + total + '.'));
    /* Les mots des fiches d'abord, ceux qu'on révisait ; les mots des
     * croisements, repliés : une grille pleine en compte une trentaine. */
    const lister = (mots) => {
      const liste = element('ul', 'liste-liee');
      for (const m of mots) {
        const li = element('li');
        li.appendChild(bouton('lie', m.mot, () => ouvrirFiche(m)));
        li.appendChild(element('span', 'precision', ' — ' + Exercices.court(m.def, 90)));
        liste.appendChild(li);
      }
      return liste;
    };
    const miens = partie.mots.filter((m) => m.prioritaire);
    const autres = partie.mots.filter((m) => !m.prioritaire);
    if (miens.length) zone.appendChild(lister(miens));
    if (autres.length) {
      const plus = element('details', 'bilan-autres');
      plus.appendChild(element('summary', null, miens.length
        ? Outils.nombre(autres.length, 'autre mot', 'autres mots') + ' de la grille'
        : 'Les ' + autres.length + ' mots de la grille'));
      plus.appendChild(lister(autres));
      zone.appendChild(plus);
    }
    zone.appendChild(bouton('bouton-principal', 'Nouvelle grille', () => nouvelle(false)));
  }

  // ── Branchement ───────────────────────────────────────────────────────────

  function dessinerClavier() {
    const zone = e.clavier;
    const aides = element('div', 'clavier-aides');
    aides.appendChild(bouton('bouton-discret', 'Une lettre', revelerLettre));
    aides.appendChild(bouton('bouton-discret', 'Le mot', revelerMot));
    aides.appendChild(bouton('bouton-discret', 'Vérifier', verifier));
    zone.appendChild(aides);
    CLAVIER.forEach((rangee, i) => {
      const ligne = element('div', 'clavier-rangee');
      for (const lettre of rangee) ligne.appendChild(bouton('touche-lettre', lettre, () => taper(lettre)));
      if (i === CLAVIER.length - 1) {
        const retour = bouton('touche-lettre touche-large', '⌫', effacer);
        retour.setAttribute('aria-label', 'Effacer');
        ligne.appendChild(retour);
      }
      zone.appendChild(ligne);
    });
  }

  /* Un clavier d'ordinateur sert aussi, quand l'onglet est à l'écran et que
   * rien ne le recouvre. */
  function auClavier(ev) {
    if (!partie || partie.fini || $('vue-fleches').hidden) return;
    if (!$('fiche').hidden || !$('panneau-perso').hidden) return;
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (ev.target && /^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName)) return;
    const fleches = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
    if (fleches[ev.key]) { ev.preventDefault(); deplacer(fleches[ev.key][0], fleches[ev.key][1]); return; }
    if (ev.key === 'Backspace' || ev.key === 'Delete') { ev.preventDefault(); effacer(); return; }
    if (ev.key.length !== 1) return;
    const lettre = Lexique.cle(ev.key).toUpperCase();
    if (/^[A-Z]$/.test(lettre)) { ev.preventDefault(); taper(lettre); }
  }

  function brancher(options) {
    manifeste = options.manifeste;
    Object.assign(e, {
      attente: $('fleches-attente'), jeu: $('fleches-jeu'), compte: $('fleches-compte'),
      indice: $('fleches-indice'), grille: $('fleches-grille'), origine: $('fleches-origine'),
      clavier: $('fleches-clavier'), bilan: $('fleches-bilan'),
    });
    $('b-fleches-nouvelle').addEventListener('click', () => nouvelle(true));
    dessinerClavier();
    document.addEventListener('keydown', auClavier);
  }

  /* À l'ouverture de l'onglet : la grille en cours, ou une nouvelle. */
  function ouvrir() {
    if (partie || occupe) return;
    const gardee = retrouver();
    if (gardee) {
      partie = gardee;
      installer();
      if (partie.fini) { dessinerBilan(); peindre(); }
    } else {
      nouvelle(false);
    }
  }

  racine.Fleches = { brancher, ouvrir };

})(window);

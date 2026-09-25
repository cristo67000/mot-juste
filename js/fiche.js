'use strict';
/*
 * La fiche d'un mot.
 *
 * Dans l'ordre où on la lit : le mot, sa prononciation et sa fréquence ; les
 * boutons qui servent (fiches de révision, note) ; puis, pour chaque nature —
 * « feu » est nom, adjectif et adverbe —, ses sens numérotés avec leurs
 * marques d'usage, leurs citations et leurs synonymes et contraires ; enfin ce
 * qui vaut pour le mot entier : étymologie, locutions et expressions,
 * proverbes, dérivés, vocabulaire apparenté, et mes notes.
 *
 * Une entrée du dictionnaire et un mot à soi s'affichent de la même façon :
 * `Perso.enEntree()` met le second dans la forme de la première.
 *
 * ── On y navigue ───────────────────────────────────────────────────────────
 *
 * Tout mot d'une définition, tout synonyme, toute locution mène à sa fiche. La
 * fiche garde donc une pile : « ← feu » ramène d'où l'on vient, et le bouton
 * Retour du téléphone fait de même — chaque fiche ouverte pose une entrée dans
 * l'historique du navigateur.
 */
(function (racine) {

  const { element, bouton } = Outils;

  // Au-delà, les sens suivants se déplient à la demande : « faire » en a quarante.
  const SENS_VISIBLES = 8;

  const BANDES = ['très courant', 'courant', 'moins courant', 'rare'];

  let panneau = null;
  let contenu = null;
  const pile = [];            // les fiches ouvertes, la dernière à l'écran
  let entreeAffichee = null;

  function brancher() {
    if (panneau) return;
    panneau = document.getElementById('fiche');
    contenu = document.getElementById('fiche-contenu');
    racine.addEventListener('popstate', () => {
      if (panneau.hidden) return;
      pile.pop();
      if (pile.length) afficher(pile[pile.length - 1], false);
      else fermer(true);
    });
    racine.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !panneau.hidden && !(racine.Perso && Perso.estOuvert())) {
        history.back();
      }
    });
    document.addEventListener('perso-change', () => {
      const haut = pile[pile.length - 1];
      if (!panneau.hidden && haut && haut.perso) afficher(haut, false);
    });
  }

  function refDe(cible) {
    return cible.perso ? 'perso:' + cible.perso : 'dico:' + cible.mot;
  }

  /* Ouvre une fiche : `{mot}` pour le dictionnaire, `{perso}` pour un mot à
   * soi. */
  function ouvrir(cible) {
    brancher();
    const haut = pile[pile.length - 1];
    if (!panneau.hidden && haut && refDe(haut) === refDe(cible)) return;
    pile.push(cible);
    history.pushState({ fiche: pile.length }, '');
    afficher(cible, true);
  }

  function fermer(depuisHistorique) {
    brancher();
    if (panneau.hidden) return;
    if (!depuisHistorique) {
      // Dépile d'un coup toutes les entrées d'historique qu'on avait posées.
      const n = pile.length;
      pile.length = 0;
      panneau.hidden = true;
      document.body.classList.remove('fiche-ouverte');
      if (n) history.go(-n);
    } else {
      pile.length = 0;
      panneau.hidden = true;
      document.body.classList.remove('fiche-ouverte');
    }
    Voix.taire();
    entreeAffichee = null;
    document.dispatchEvent(new CustomEvent('fiche-fermee'));
  }

  async function afficher(cible, nouvelle) {
    panneau.hidden = false;
    document.body.classList.add('fiche-ouverte');
    contenu.textContent = '';
    contenu.appendChild(tete());
    const attente = element('p', 'discret attente', 'Ouverture…');
    contenu.appendChild(attente);
    if (nouvelle) panneau.scrollTop = 0;

    let entree = null;
    let erreur = null;
    if (cible.perso) {
      const mot = Perso.lire(cible.perso);
      entree = mot ? Perso.enEntree(mot) : null;
    } else {
      try { entree = await Lexique.entree(cible.mot); } catch (e) { erreur = e; }
    }
    // Une autre fiche a pu être ouverte pendant l'attente.
    if (pile[pile.length - 1] !== cible) return;
    attente.remove();

    if (!entree) {
      dessinerAbsente(cible, erreur);
      return;
    }
    entreeAffichee = entree;
    dessiner(entree);
    panneau.scrollTop = 0;
    Store.consulter(refDe(cible), entree.m).catch(() => {});
  }

  function tete() {
    const barre = element('div', 'fiche-tete');
    if (pile.length > 1) {
      const precedente = pile[pile.length - 2];
      const libelle = precedente.perso ? ((Perso.lire(precedente.perso) || {}).mot || 'Retour') : precedente.mot;
      barre.appendChild(bouton('fiche-retour', '← ' + libelle, () => history.back()));
    }
    barre.appendChild(element('span', 'espace'));
    barre.appendChild(bouton('fiche-fermer', 'Fermer', () => fermer(false)));
    return barre;
  }

  /* Une tranche que l'appareil n'a pas encore, hors ligne : on montre ce que
   * l'index sait déjà — le mot, sa nature, le début de sa définition — et on
   * dit pourquoi le reste manque. */
  function dessinerAbsente(cible, erreur) {
    const r = cible.mot ? Lexique.vedette(cible.mot) : null;
    contenu.appendChild(element('h2', 'vedette-mot', cible.mot || '?'));
    if (r) {
      if (r.nature) contenu.appendChild(element('p', 'nature', r.nature));
      contenu.appendChild(element('p', 'definition', r.apercu));
    }
    const message = element('div', 'bloc-absent');
    if (erreur && erreur.absente) {
      message.appendChild(element('p', null,
        'Cette fiche n’est pas encore sur l’appareil, et le réseau ne répond pas.'));
      message.appendChild(element('p', 'discret',
        'Elle s’ouvrira dès le retour du réseau — ou, pour tout avoir hors ligne, '
        + 'téléchargez le dictionnaire complet dans les Réglages.'));
    } else if (cible.perso) {
      message.appendChild(element('p', null, 'Ce mot a été supprimé de votre carnet.'));
    } else {
      message.appendChild(element('p', null, 'Cette fiche n’a pas pu être ouverte.'));
      if (erreur) message.appendChild(element('p', 'discret', String(erreur.message || erreur)));
    }
    message.appendChild(bouton('bouton-discret', 'Réessayer', () => afficher(cible, false)));
    contenu.appendChild(message);
  }

  // ── Le dessin ─────────────────────────────────────────────────────────────

  /* Un mot lié — synonyme, locution, dérivé : un bouton s'il a sa fiche,
   * du texte sinon. */
  function lien(mot, classe) {
    const r = Lexique.vedette(mot) || (mot !== mot.toLowerCase() ? Lexique.vedette(mot.toLowerCase()) : null);
    if (!r) return element('span', (classe || 'lie') + ' sans-fiche', mot);
    const b = bouton((classe || 'lie'), mot, () => ouvrir({ mot: r.mot }));
    return b;
  }

  function etiquettes(liste, classe) {
    const bloc = element('span', classe || 'marques');
    for (const e of liste || []) bloc.appendChild(element('span', 'marque', e));
    return bloc;
  }

  function rubrique(titre, classe) {
    const section = element('section', 'rubrique-fiche ' + (classe || ''));
    section.appendChild(element('h3', 'rubrique', titre));
    return section;
  }

  function dessiner(e) {
    const ref = e.perso ? 'perso:' + e.perso : 'dico:' + e.m;

    // Le mot.
    const vedette = element('div', 'vedette');
    vedette.appendChild(element('h2', 'vedette-mot', e.m));
    vedette.appendChild(Voix.bouton(e.m));
    contenu.appendChild(vedette);

    const infos = element('p', 'infos');
    const api = (e.l.find((l) => l.api) || {}).api;
    if (api) infos.appendChild(element('span', 'api', '\\' + api + '\\'));
    if (e.b !== null && e.b !== undefined) {
      const b = element('span', 'frequence bande-' + e.b);
      b.title = 'Fréquence d’usage (Lexique 3.83)';
      b.appendChild(element('span', 'points', '●●●●'.slice(0, 4 - e.b) + '○○○○'.slice(0, e.b)));
      b.appendChild(element('span', null, ' ' + BANDES[e.b]));
      infos.appendChild(b);
    }
    if (e.perso) infos.appendChild(element('span', 'pastille perso', 'mon mot'));
    contenu.appendChild(infos);

    contenu.appendChild(actions(e, ref));

    // Une étymologie par bloc distinct ; si plusieurs natures en ont des
    // différentes (« son » le bruit et « son » du blé), chacune a la sienne.
    const etymologies = e.et || [];
    const plusieurs = etymologies.length > 1;

    e.l.forEach((lecture, numero) => {
      contenu.appendChild(dessinerLecture(e, lecture, numero, plusieurs));
    });

    if (etymologies.length) {
      const section = rubrique('Étymologie', 'etymologie');
      etymologies.forEach((bloc, i) => {
        if (plusieurs) {
          const natures = e.l.filter((l) => l.e === i).map((l) => l.nat.split(' ')[0]);
          const uniques = natures.filter((n, j) => natures.indexOf(n) === j);
          section.appendChild(element('p', 'etymologie-pour', uniques.join(', ')));
        }
        for (const paragraphe of bloc) {
          const p = element('p', 'etymologie-texte');
          p.appendChild(MotsVifs.texte(paragraphe, { exclue: e.m }));
          section.appendChild(p);
        }
      });
      const attestation = (e.l.find((l) => l.at) || {}).at;
      if (attestation) section.appendChild(element('p', 'discret', 'Première attestation : ' + attestation + '.'));
      contenu.appendChild(section);
    }

    if (e.loc && e.loc.length) contenu.appendChild(listeLiee('Locutions et expressions', e.loc, 'locutions'));
    if (e.prov && e.prov.length) contenu.appendChild(listeLiee('Proverbes et dictons', e.prov, 'locutions'));
    if (e.der && e.der.length) contenu.appendChild(nuage('Dérivés et composés', e.der));
    const apparentes = [].concat(e.rel || [], e.hyper || [], e.hypo || []);
    if (apparentes.length) contenu.appendChild(nuage('Vocabulaire apparenté', apparentes));

    const paronymes = [];
    for (const l of e.l) for (const p of l.par || []) if (paronymes.indexOf(p[0]) === -1) paronymes.push(p[0]);
    if (paronymes.length) contenu.appendChild(nuage('À ne pas confondre avec', paronymes.map((p) => [p])));

    const notes = Notes.construire(ref, e.m);
    notes.id = 'fiche-notes';
    contenu.appendChild(notes);

    contenu.appendChild(source(e));
  }

  function actions(e, ref) {
    const ligne = element('div', 'actions-fiche');
    const suivre = bouton('bouton-principal apprendre', 'Ajouter aux fiches');
    const aDesSens = e.l.some((l) => l.s.some((s) => s.d));
    let retirees = null;

    async function peindre() {
      const suivi = await Revision.estSuivi(ref).catch(() => false);
      suivre.classList.toggle('suivi', suivi);
      suivre.textContent = suivi ? '✓ Dans mes fiches' : '+ Ajouter aux fiches';
      suivre.title = suivi ? 'Toucher pour retirer ce mot des fiches' : '';
      suivre.disabled = !aDesSens && !suivi;
    }

    suivre.addEventListener('click', async () => {
      suivre.disabled = true;
      if (await Revision.estSuivi(ref)) {
        retirees = await Revision.oublier(ref);
        Outils.annoncer('« ' + e.m + ' » retiré des fiches.', async () => {
          await Revision.restaurer(retirees);
          peindre();
          document.dispatchEvent(new CustomEvent('fiches-changees'));
        });
      } else {
        await Revision.apprendre(ref, e.m);
        Outils.annoncer('« ' + e.m + ' » ajouté aux fiches de révision.');
      }
      document.dispatchEvent(new CustomEvent('fiches-changees'));
      await peindre();
      suivre.disabled = false;
    });
    peindre();
    ligne.appendChild(suivre);

    ligne.appendChild(bouton('bouton-discret', '✎ Note', () => {
      const bloc = document.getElementById('fiche-notes');
      if (!bloc) return;
      bloc.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const ajouter = bloc.querySelector('.bouton-discret');
      if (ajouter && /Ajouter/.test(ajouter.textContent)) ajouter.click();
    }));
    if (e.perso) {
      ligne.appendChild(bouton('bouton-discret', 'Modifier', () => Perso.ouvrir({ id: e.perso })));
    }
    return ligne;
  }

  function dessinerLecture(e, lecture, numero, plusieurs) {
    const section = element('section', 'lecture');
    if (lecture.nat || e.l.length > 1) {
      const nature = element('p', 'nature');
      nature.appendChild(element('span', null, lecture.nat || ''));
      if (e.l.length > 1) nature.prepend(element('span', 'numero-lecture', (numero + 1) + ' '));
      section.appendChild(nature);
    }

    if (lecture.f && lecture.f.length) {
      const formes = element('p', 'formes');
      lecture.f.forEach(([graphie, libelle], i) => {
        if (i) formes.appendChild(document.createTextNode(' · '));
        if (libelle) formes.appendChild(element('span', 'forme-libelle', libelle + ' '));
        formes.appendChild(element('b', null, graphie));
      });
      section.appendChild(formes);
    }

    const liste = element('ol', 'sens-liste');
    let principal = 0;
    let secondaire = 0;
    const cachees = [];
    lecture.s.forEach((s, rang) => {
      const li = element('li', 'sens' + (s.p ? ' sous-sens' : ''));
      if (s.p) secondaire += 1; else { principal += 1; secondaire = 0; }
      li.appendChild(element('span', 'numero-sens',
        s.p ? String.fromCharCode(96 + Math.min(secondaire, 26)) + ')' : principal + '.'));
      const corps = element('div', 'sens-corps');
      if (s.r && s.r.length) corps.appendChild(etiquettes(s.r));
      const d = element('p', 'definition');
      d.appendChild(MotsVifs.texte(s.d, { exclue: e.m }));
      corps.appendChild(d);
      if (s.v && s.v.length) {
        const v = element('p', 'renvoi');
        v.appendChild(document.createTextNode('→ '));
        s.v.forEach((m, i) => { if (i) v.appendChild(document.createTextNode(', ')); v.appendChild(lien(m)); });
        corps.appendChild(v);
      }
      for (const x of s.x || []) corps.appendChild(citation(x, e.m));
      if (s.n) corps.appendChild(element('p', 'note-usage', s.n));
      li.appendChild(corps);
      if (rang >= SENS_VISIBLES) { li.hidden = true; cachees.push(li); }
      liste.appendChild(li);
    });
    section.appendChild(liste);
    if (cachees.length) {
      const plus = bouton('lien-discret voir-plus',
        'Voir ' + (cachees.length > 1 ? 'les ' + cachees.length + ' autres sens' : 'l’autre sens'), () => {
          for (const li of cachees) li.hidden = false;
          plus.remove();
        });
      section.appendChild(plus);
    }

    for (const [champ, titre] of [['syn', 'Synonymes'], ['ant', 'Contraires']]) {
      if (lecture[champ] && lecture[champ].length) section.appendChild(proches(titre, lecture[champ], champ));
    }
    for (const n of lecture.no || []) {
      const p = element('p', 'note-usage');
      p.appendChild(MotsVifs.texte(n, { exclue: e.m }));
      section.appendChild(p);
    }
    return section;
  }

  function citation(x, mot) {
    const [texte, marque, reference] = x;
    const bloc = element('blockquote', 'citation');
    const p = element('p', 'citation-texte');
    p.appendChild(MotsVifs.texte(texte, { marque, exclue: mot }));
    p.appendChild(Voix.bouton(texte, 'ecouter-phrase'));
    bloc.appendChild(p);
    if (reference) bloc.appendChild(element('p', 'citation-source', reference));
    return bloc;
  }

  /* Synonymes ou contraires, rangés par le sens auquel ils se rattachent
   * quand le Wiktionnaire le dit. */
  function proches(titre, liste, champ) {
    const bloc = element('div', 'proches ' + champ);
    bloc.appendChild(element('h4', null, titre));
    const groupes = new Map();
    for (const [mot, precision, marques] of liste) {
      const cle = precision || '';
      if (!groupes.has(cle)) groupes.set(cle, []);
      groupes.get(cle).push([mot, marques]);
    }
    for (const [precision, mots] of groupes) {
      const ligne = element('p', 'proches-ligne');
      if (precision) ligne.appendChild(element('span', 'proches-sens', precision + ' : '));
      mots.forEach(([mot, marques], i) => {
        if (i) ligne.appendChild(document.createTextNode(', '));
        ligne.appendChild(lien(mot));
        if (marques && marques.length) ligne.appendChild(element('span', 'marque-discrete', ' (' + marques.join(', ') + ')'));
      });
      bloc.appendChild(ligne);
    }
    return bloc;
  }

  /* Locutions, proverbes : une ligne chacune, avec leur sens quand il est
   * donné — « à petit feu — en faisant durer ». */
  function listeLiee(titre, liste, classe) {
    const section = rubrique(titre, classe);
    const ul = element('ul', 'liste-liee');
    const VISIBLES = 12;
    const cachees = [];
    liste.forEach(([mot, precision, marques], i) => {
      const li = element('li');
      li.appendChild(lien(mot));
      if (precision) li.appendChild(element('span', 'precision', ' — ' + precision));
      if (marques && marques.length) li.appendChild(element('span', 'marque-discrete', ' (' + marques.join(', ') + ')'));
      if (i >= VISIBLES) { li.hidden = true; cachees.push(li); }
      ul.appendChild(li);
    });
    section.appendChild(ul);
    if (cachees.length) {
      const plus = bouton('lien-discret voir-plus', 'Voir les ' + cachees.length + ' autres', () => {
        for (const li of cachees) li.hidden = false;
        plus.remove();
      });
      section.appendChild(plus);
    }
    return section;
  }

  function nuage(titre, liste) {
    const section = rubrique(titre, 'nuage');
    const bloc = element('div', 'voisins');
    for (const [mot] of liste.slice(0, 40)) bloc.appendChild(lien(mot, 'voisin'));
    section.appendChild(bloc);
    return section;
  }

  function source(e) {
    const p = element('p', 'source');
    if (e.perso) {
      const m = Perso.lire(e.perso);
      p.textContent = m ? 'Mot ajouté par vous le ' + Outils.dateLisible(m.cree)
        + (m.modifie !== m.cree ? ', modifié le ' + Outils.dateLisible(m.modifie) : '') + '.' : '';
      return p;
    }
    p.appendChild(document.createTextNode('Source : '));
    const a = element('a', null, 'Wiktionnaire, article « ' + e.m + ' »');
    a.href = 'https://fr.wiktionary.org/wiki/' + encodeURIComponent(e.m.replace(/ /g, '_'));
    a.rel = 'noopener';
    a.target = '_blank';
    p.appendChild(a);
    p.appendChild(document.createTextNode(' — licence CC BY-SA 4.0. Fréquence : Lexique 3.83.'));
    return p;
  }

  racine.Fiche = {
    ouvrir, fermer,
    get ouverte() { return !!panneau && !panneau.hidden; },
    get entree() { return entreeAffichee; },
  };

})(window);

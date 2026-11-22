'use strict';
/*
 * Les illustrations : des dessins au trait, et les planches qui les rangent.
 *
 * Un dictionnaire illustré dessine ce que les mots disent mal : un nez
 * aquilin, un col châle, un écu tranché, la couleur céladon. Chaque dessin
 * appartient à une **planche** — « Formes du nez », « Chapeaux », « Les
 * rouges » — et s'attache au **sens** du mot qu'il montre, jamais au mot
 * entier : « busqué » a quatre sens, le dessin ne va qu'au nez bombé.
 *
 * ── Où ils paraissent ──────────────────────────────────────────────────────
 *
 *   la fiche        le dessin sous le sens qu'il illustre ; puis la planche,
 *                   en bandeau sur la fiche d'un de ses mots, en entier sur
 *                   la fiche de son sujet (« nez » montre toutes les formes) ;
 *   les révisions   au verso, et en indice quand on doit retrouver le mot
 *                   d'après sa définition — sans légende, elle le dirait ;
 *   les fléchés     à côté de la définition, sans légende non plus ;
 *   l'accueil       le mot du jour, et la liste des planches.
 *
 * ── Les données ────────────────────────────────────────────────────────────
 *
 * Les planches sont dans js/planches-*.js, versées ici par `ajouter()`.
 *
 *   { id, titre, groupe, sujets: ['nez'], sens: /nez/,        ← par défaut
 *     items: [{ mot: 'aquilin', aussi: [...], sens: /…/, d: dessin }] }
 *
 * `sens` est une expression qui doit reconnaître la définition du sens
 * dessiné ; celle de l'item l'emporte sur celle de la planche. Les épreuves
 * (build/essais.mjs) vérifient que chaque mot existe et que son expression
 * trouve un de ses sens : une reconstruction du dictionnaire qui ferait
 * disparaître un sens ne laisse pas un dessin au mauvais endroit.
 *
 * Un **schéma** est une planche d'un seul dessin, à repères numérotés : le
 * visage, la main, le château fort. Ses items ont `x, y` (le point désigné)
 * et `lx, ly` (où s'écrit le numéro).
 *
 * ── Le dessin ──────────────────────────────────────────────────────────────
 *
 * Un dessin est une liste de formes, chacune une courte chaîne :
 *
 *   'M10 20 Q30 40 50 20'        un chemin SVG
 *   'C 50 50 20'                 un cercle (cx cy r)
 *   'E 50 50 30 20'              une ellipse (cx cy rx ry)
 *   'R 10 10 80 60 4'            un rectangle (x y l h [arrondi])
 *   'T 50 60 32 «'               un texte (x y corps texte), centré
 *
 * précédée au besoin de classes (`.a` l'accent, `.f` le plein…, voir
 * css/app.css, « Illustrations ») ou d'une couleur (`#c8102e`). Tout est
 * construit par createElementNS, attribut par attribut : la politique de
 * sécurité de la page (`style-src 'self'`) interdit les styles en ligne, et
 * rien n'est jamais lu comme du HTML.
 */
(function (racine) {

  const NS = 'http://www.w3.org/2000/svg';
  const planches = [];
  let parMot = null;      // mot → [{ planche, item }]
  let parSujet = null;    // mot → [planche]

  function ajouter(liste) {
    for (const p of liste) planches.push(p);
    parMot = null;
  }

  function indexer() {
    if (parMot) return;
    parMot = new Map();
    parSujet = new Map();
    for (const planche of planches) {
      for (const item of planche.items) {
        for (const mot of [item.mot].concat(item.aussi || [])) {
          if (!parMot.has(mot)) parMot.set(mot, []);
          parMot.get(mot).push({ planche, item });
        }
      }
      for (const mot of planche.sujets || []) {
        if (!parSujet.has(mot)) parSujet.set(mot, []);
        parSujet.get(mot).push(planche);
      }
    }
  }

  /* `sens: false` : le mot est sur la planche, mais aucun de ses sens n'est
   * celui du dessin (le dictionnaire ne donne pas à « carreau » son sens de
   * carte à jouer). */
  function expressionDe(fiche) {
    if ('sens' in fiche.item) return fiche.item.sens || null;
    return fiche.planche.sens || null;
  }

  /* Le dessin convient-il à cette définition ? */
  function convient(fiche, definition) {
    const re = expressionDe(fiche);
    return !!(re && definition && re.test(definition));
  }

  function fichesDe(mot) {
    indexer();
    return parMot.get(mot) || [];
  }

  /* Le dessin du sens que dit cette définition, s'il y en a un. */
  function pourSens(mot, definition) {
    if (!mot || !definition) return null;
    return fichesDe(mot).find((f) => convient(f, definition)) || null;
  }

  /* Tout ce qu'une fiche affiche : le dessin de chaque sens illustré, et les
   * planches où le mot paraît. Un mot à soi n'en a pas : ses définitions
   * sont les siennes, rien ne dit que le dessin leur va. */
  function pourEntree(entree) {
    const resultat = { figures: new Map(), planches: [] };
    if (!entree || entree.perso) return resultat;
    indexer();
    const vues = new Set();
    for (const f of fichesDe(entree.m)) {
      let trouve = null;
      for (const l of entree.l) {
        for (const s of l.s) if (!trouve && s.d && convient(f, s.d) && !resultat.figures.has(s)) trouve = s;
      }
      if (trouve) resultat.figures.set(trouve, f);
      if (!vues.has(f.planche.id)) {
        vues.add(f.planche.id);
        resultat.planches.push({ planche: f.planche, item: f.item });
      }
    }
    for (const p of parSujet.get(entree.m) || []) {
      if (vues.has(p.id)) continue;
      vues.add(p.id);
      resultat.planches.push({ planche: p, item: null });
    }
    return resultat;
  }

  function planche(id) {
    return planches.find((p) => p.id === id) || null;
  }

  // ── Le tracé ──────────────────────────────────────────────────────────────

  function noeud(balise, attributs) {
    const n = document.createElementNS(NS, balise);
    for (const cle in attributs) n.setAttribute(cle, attributs[cle]);
    return n;
  }

  function forme(code) {
    let reste = String(code).trim();
    const classes = [];
    let couleur = null;
    while (reste[0] === '.' || reste[0] === '#') {
      const fin = reste.search(/\s/);
      const jeton = fin === -1 ? reste : reste.slice(0, fin);
      reste = fin === -1 ? '' : reste.slice(fin).trim();
      if (jeton[0] === '#') couleur = jeton;
      else for (const c of jeton.split('.')) if (c) classes.push('i-' + c);
    }
    const lettre = reste[0];
    const arguments_ = reste.slice(1).trim();
    let n;
    if (lettre === 'M' || lettre === 'm') {
      n = noeud('path', { d: reste });
    } else if (lettre === 'T') {
      const m = arguments_.match(/^(\S+)\s+(\S+)\s+(\S+)\s+([\s\S]*)$/);
      n = noeud('text', { x: m[1], y: m[2], 'font-size': m[3] });
      n.textContent = m[4];
    } else {
      const v = arguments_.split(/[\s,]+/);
      if (lettre === 'C') n = noeud('circle', { cx: v[0], cy: v[1], r: v[2] });
      else if (lettre === 'E') n = noeud('ellipse', { cx: v[0], cy: v[1], rx: v[2], ry: v[3] });
      else if (lettre === 'R') {
        n = noeud('rect', { x: v[0], y: v[1], width: v[2], height: v[3] });
        if (v[4]) n.setAttribute('rx', v[4]);
      } else throw new Error('Forme inconnue : ' + code);
    }
    if (classes.length) n.setAttribute('class', classes.join(' '));
    if (couleur) n.setAttribute('fill', couleur);
    return n;
  }

  function tracer(svg, dessin) {
    for (const code of dessin || []) {
      if (Array.isArray(code)) tracer(svg, code);
      else if (code) svg.appendChild(forme(code));
    }
  }

  function boite(p) {
    return p.boite || '0 0 100 100';
  }

  /* Le dessin d'une fiche ; d'un schéma, le dessin entier avec ses repères —
   * tous numérotés, ou seulement celui de l'item, marqué d'un point. */
  function svgDe(fiche, options) {
    const o = options || {};
    const p = fiche.planche;
    const svg = noeud('svg', { viewBox: boite(p), class: 'ill-svg', focusable: 'false' });
    if (o.titre) {
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', o.titre);
    } else {
      svg.setAttribute('aria-hidden', 'true');
    }
    if (p.schema) {
      tracer(svg, p.d);
      const reperes = fiche.item ? [fiche.item] : p.items;
      reperes.forEach((item) => {
        const n = p.items.indexOf(item) + 1;
        const seul = !!fiche.item;
        svg.appendChild(noeud('line', { x1: item.x, y1: item.y, x2: item.lx, y2: item.ly, class: 'i-repere-trait' + (seul ? ' i-seul' : '') }));
        svg.appendChild(noeud('circle', { cx: item.x, cy: item.y, r: seul ? 2.6 : 1.8, class: 'i-repere-point' }));
        if (seul) {
          svg.appendChild(noeud('circle', { cx: item.lx, cy: item.ly, r: 3.2, class: 'i-repere-point' }));
        } else {
          svg.appendChild(noeud('circle', { cx: item.lx, cy: item.ly, r: 5.2, class: 'i-repere-pastille' }));
          const t = noeud('text', { x: item.lx, y: item.ly + 2.6, 'font-size': 7.2, class: 'i-repere-numero' });
          t.textContent = String(n);
          svg.appendChild(t);
        }
      });
    } else {
      tracer(svg, fiche.item.d);
    }
    return svg;
  }

  function ouvrir(mot, idPlanche) {
    if (racine.Fiche) Fiche.ouvrir(idPlanche ? { mot, planche: idPlanche } : { mot });
  }

  function aSaFiche(mot) {
    return !!(racine.Lexique && Lexique.vedette(mot) && Lexique.vedette(mot).mot === mot);
  }

  /* Une figure seule : sous un sens de la fiche (`sens`), au verso d'une
   * révision (`verso`), ou muette — l'indice d'une question, d'un fléché. */
  function figure(fiche, options) {
    const o = options || {};
    const p = fiche.planche;
    const fig = Outils.element('figure', 'ill ill-' + (o.mode || 'sens') + (p.schema ? ' ill-schema' : ''));
    const muette = o.mode === 'muette';
    fig.appendChild(svgDe(fiche, { titre: muette ? null : (fiche.item.mot + (fiche.item.legende ? ', ' + fiche.item.legende : '')) }));
    if (!muette) {
      const legende = Outils.element('figcaption', 'ill-legende');
      if (o.mode === 'verso') {
        legende.appendChild(Outils.element('span', 'ill-mot', fiche.item.mot));
        if (fiche.item.legende) legende.appendChild(document.createTextNode(' — ' + fiche.item.legende));
      } else if (fiche.item.legende && o.mode !== 'sens') {
        // Sous un sens, la définition est juste au-dessus : la légende la redirait.
        legende.appendChild(document.createTextNode(fiche.item.legende));
      }
      // D'un schéma, on va au tout : de « pommette » au visage.
      const sujet = (p.sujets || [])[0];
      if (o.mode === 'sens' && p.schema && sujet && aSaFiche(sujet)) {
        if (legende.childNodes.length) legende.appendChild(document.createTextNode(' · '));
        legende.appendChild(Outils.bouton('lien-discret ill-vers-planche', p.titre + ' →', () => ouvrir(sujet, p.id)));
      }
      if (legende.childNodes.length) fig.appendChild(legende);
    }
    return fig;
  }

  /* Une case de planche : le dessin et son mot, qui mène à sa fiche. */
  function caseDe(p, item, courant) {
    const fiche = { planche: p, item };
    const actif = aSaFiche(item.mot);
    const c = actif
      ? Outils.bouton('ill-case', '', () => ouvrir(item.mot))
      : Outils.element('div', 'ill-case sans-fiche');
    if (courant) {
      c.classList.add('courante');
      c.setAttribute('aria-current', 'true');
    }
    c.appendChild(svgDe(fiche, {}));
    c.appendChild(Outils.element('span', 'ill-case-mot', item.mot));
    if (item.court) c.appendChild(Outils.element('span', 'ill-case-precision', item.court));
    return c;
  }

  /* La planche entière, ou — sur la fiche d'un de ses mots — en bandeau,
   * la case du mot mise en avant. */
  function dessinerPlanche(p, itemCourant) {
    const section = Outils.element('section', 'rubrique-fiche planche' + (p.schema ? ' planche-schema' : ''));
    section.dataset.planche = p.id;
    const tete = Outils.element('div', 'planche-tete');
    tete.appendChild(Outils.element('h3', 'rubrique', 'Planche · ' + p.titre));
    const sujet = (p.sujets || [])[0];
    if (itemCourant && sujet && aSaFiche(sujet)) {
      tete.appendChild(Outils.bouton('lien-discret', 'Toute la planche →', () => ouvrir(sujet, p.id)));
    }
    section.appendChild(tete);

    if (p.schema) {
      const fig = Outils.element('figure', 'ill ill-planche-schema');
      fig.appendChild(svgDe({ planche: p, item: null }, { titre: p.titre }));
      section.appendChild(fig);
      const legende = Outils.element('ol', 'schema-legende');
      for (const item of p.items) {
        const li = Outils.element('li');
        if (item === itemCourant) li.classList.add('courante');
        li.appendChild(aSaFiche(item.mot)
          ? Outils.bouton('lie', item.mot, () => ouvrir(item.mot))
          : Outils.element('span', 'lie sans-fiche', item.mot));
        if (item.court) li.appendChild(Outils.element('span', 'precision', ' — ' + item.court));
        legende.appendChild(li);
      }
      section.appendChild(legende);
      return section;
    }

    const grille = Outils.element('div', itemCourant ? 'planche-bandeau' : 'planche-grille');
    for (const item of p.items) grille.appendChild(caseDe(p, item, item === itemCourant));
    section.appendChild(grille);
    if (p.note) section.appendChild(Outils.element('p', 'discret planche-note', p.note));
    if (itemCourant) {
      // La case du mot au milieu du bandeau, sans faire défiler la page.
      requestAnimationFrame(() => {
        const c = grille.querySelector('.courante');
        if (c) grille.scrollLeft = c.offsetLeft - (grille.clientWidth - c.offsetWidth) / 2;
      });
    }
    return section;
  }

  /* La liste des planches, par groupe, pour l'accueil. */
  function sommaire() {
    const groupes = new Map();
    for (const p of planches) {
      const sujet = (p.sujets || [])[0];
      if (!sujet || !aSaFiche(sujet)) continue;
      if (!groupes.has(p.groupe)) groupes.set(p.groupe, []);
      groupes.get(p.groupe).push(p);
    }
    return groupes;
  }

  function nombreDeDessins() {
    return planches.reduce((n, p) => n + p.items.length, 0);
  }

  racine.Illustrations = {
    ajouter, pourSens, pourEntree, figure, planche: dessinerPlanche, trouver: planche, sommaire,
    nombreDeDessins, ouvrir,
    get planches() { return planches; },
  };

})(window);

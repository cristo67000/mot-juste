'use strict';
/*
 * Le compositeur de grilles de mots fléchés.
 *
 * ── Quelle sorte de grille ─────────────────────────────────────────────────
 *
 * Une grille de journal est pleine : chaque case blanche sert à deux mots, et
 * il faut pour la remplir des milliers de mots courts — « ru », « osé »,
 * « été ». Ici, les mots sont imposés : ce sont ceux des fiches de révision,
 * souvent longs et rares, et ce sont eux qu'on veut voir. La grille est donc
 * aérée : les mots s'y croisent comme dans une grille de mots croisés libre,
 * et chacun part d'une case de définition fléchée, posée juste avant sa
 * première lettre — à gauche pour un mot horizontal (→), au-dessus pour un mot
 * vertical (↓). Une même case peut porter les deux flèches.
 *
 * ── Les règles d'une grille juste ──────────────────────────────────────────
 *
 *   – deux lettres voisines appartiennent toujours à un même mot : aucune
 *     suite de lettres ne se forme par accident ;
 *   – la case qui précède un mot est sa case de définition, celle qui le suit
 *     n'est pas une lettre ;
 *   – tout mot, sauf le premier, croise au moins un mot déjà posé : la grille
 *     est d'un seul tenant.
 *
 * ── La méthode ─────────────────────────────────────────────────────────────
 *
 * Gloutonne, et recommencée : on pose un premier mot au milieu, puis, tant
 * qu'il reste de la place, le premier mot de la liste qui trouve à se croiser,
 * là où il croise le plus. Les mots prioritaires — ceux des fiches — passent
 * toujours avant les compléments, qui ne servent qu'à étoffer une grille trop
 * maigre. Une centaine de tirages, on garde le meilleur : sur 120 cases,
 * cela ne coûte rien.
 *
 * Module pur : ni écran ni stockage, éprouvé par build/essais.mjs.
 */
(function (racine) {

  const H = 1, V = 2;
  const VIDE = 0, LETTRE = 1, DEF = 2;

  function melanger(liste, hasard) {
    const copie = liste.slice();
    for (let i = copie.length - 1; i > 0; i -= 1) {
      const j = Math.floor(hasard() * (i + 1));
      [copie[i], copie[j]] = [copie[j], copie[i]];
    }
    return copie;
  }

  /* Les longs d'abord, à peu près : un mot de dix lettres ne trouve plus sa
   * place dans une grille déjà garnie. */
  function ordonner(liste, hasard) {
    return melanger(liste, hasard)
      .map((x) => ({ x, rang: x.k.length + hasard() * 3 }))
      .sort((a, b) => b.rang - a.rang)
      .map((y) => y.x);
  }

  function tirage(prioritaires, complements, o, hasard) {
    const C = o.colonnes, L = o.lignes;
    const type = new Uint8Array(C * L);
    const masque = new Uint8Array(C * L);
    const lettre = new Array(C * L).fill('');
    const poses = [];
    let croisements = 0;

    /* Le nombre de croisements du mot posé là, ou -1 s'il ne peut pas l'être. */
    function essai(k, l, c, sens) {
      const dl = sens === V ? 1 : 0;
      const dc = sens === H ? 1 : 0;
      const n = k.length;
      if (l - dl < 0 || c - dc < 0) return -1;
      const fl = l + dl * (n - 1);
      const fc = c + dc * (n - 1);
      if (fl >= L || fc >= C) return -1;
      if (type[(l - dl) * C + c - dc] === LETTRE) return -1;
      if (fl + dl < L && fc + dc < C && type[(fl + dl) * C + fc + dc] === LETTRE) return -1;
      let x = 0;
      for (let i = 0; i < n; i += 1) {
        const li = l + dl * i;
        const ci = c + dc * i;
        const p = li * C + ci;
        if (type[p] === DEF) return -1;
        if (type[p] === LETTRE) {
          if (lettre[p] !== k[i] || (masque[p] & sens)) return -1;
          x += 1;
        } else if (sens === H) {
          if ((li > 0 && type[p - C] === LETTRE) || (li < L - 1 && type[p + C] === LETTRE)) return -1;
        } else if ((ci > 0 && type[p - 1] === LETTRE) || (ci < C - 1 && type[p + 1] === LETTRE)) {
          return -1;
        }
      }
      return x;
    }

    function poser(candidat, l, c, sens, x) {
      const dl = sens === V ? 1 : 0;
      const dc = sens === H ? 1 : 0;
      type[(l - dl) * C + c - dc] = DEF;
      for (let i = 0; i < candidat.k.length; i += 1) {
        const p = (l + dl * i) * C + c + dc * i;
        type[p] = LETTRE;
        lettre[p] = candidat.k[i];
        masque[p] |= sens;
      }
      croisements += x;
      poses.push({ candidat, l, c, sens });
    }

    /* La meilleure place d'un mot : là où il croise le plus de mots posés. */
    function meilleure(k) {
      let choix = null;
      for (let p = 0; p < type.length; p += 1) {
        if (type[p] !== LETTRE || masque[p] === (H | V)) continue;
        const sens = masque[p] & H ? V : H;
        for (let i = 0; i < k.length; i += 1) {
          if (k[i] !== lettre[p]) continue;
          const l = Math.floor(p / C) - (sens === V ? i : 0);
          const c = (p % C) - (sens === H ? i : 0);
          const x = essai(k, l, c, sens);
          if (x < 1) continue;
          const note = x * 10 + hasard();
          if (!choix || note > choix.note) choix = { l, c, sens, x, note };
        }
      }
      return choix;
    }

    const file = ordonner(prioritaires, hasard).concat(ordonner(complements, hasard));
    const premier = file.findIndex((x) => x.k.length <= Math.max(C, L) - 1);
    if (premier === -1) return null;
    const tete = file.splice(premier, 1)[0];
    const n = tete.k.length;
    const tientH = n <= C - 1;
    const tientV = n <= L - 1;
    if (tientH && (!tientV || hasard() < 0.6)) {
      poser(tete, Math.floor(L / 2) - 1 + Math.floor(hasard() * 2), 1 + Math.floor((C - 1 - n) / 2), H, 0);
    } else {
      poser(tete, 1 + Math.floor((L - 1 - n) / 2), Math.floor(C / 2) - 1 + Math.floor(hasard() * 2), V, 0);
    }

    /* Les compléments : de quoi atteindre une grille honnête quand les fiches
     * sont peu nombreuses, deux au plus sinon — pour débloquer un coin. */
    const quota = Math.max(2, o.minimum - prioritaires.length);
    let nComplements = tete.prioritaire ? 0 : 1;
    let encore = true;
    while (encore && poses.length < o.max) {
      encore = false;
      for (let i = 0; i < file.length; i += 1) {
        const candidat = file[i];
        if (!candidat.prioritaire && nComplements >= quota) continue;
        const place = meilleure(candidat.k);
        if (!place) continue;
        poser(candidat, place.l, place.c, place.sens, place.x);
        if (!candidat.prioritaire) nComplements += 1;
        file.splice(i, 1);
        encore = true;
        break;      // on repart du début : les prioritaires d'abord, toujours
      }
    }

    const nPrioritaires = poses.length - nComplements;
    return { poses, croisements, note: nPrioritaires * 10 + nComplements * 2 + croisements };
  }

  /* Compose une grille.
   *
   *   candidats   [{ k, prioritaire, … }] — `k` : le mot en lettres a-z
   *   options     colonnes, lignes, max (mots), minimum (mots visés, compléments
   *               compris), essais, hasard (pour des épreuves reproductibles)
   *
   * Rend { colonnes, lignes, mots: [{ …candidat, l, c, sens: 'h' | 'v' }] },
   * rognée au plus juste, les mots dans l'ordre de lecture — ou null si rien
   * ne tient. */
  function composer(candidats, options) {
    const o = Object.assign({ colonnes: 10, lignes: 12, max: 14, minimum: 9, essais: 120 }, options);
    const hasard = o.hasard || Math.random;
    const vus = new Set();
    const prioritaires = [];
    const complements = [];
    for (const c of candidats) {
      if (!c || !/^[a-z]{2,}$/.test(c.k) || vus.has(c.k)) continue;
      if (c.k.length > Math.max(o.colonnes, o.lignes) - 1) continue;
      vus.add(c.k);
      (c.prioritaire ? prioritaires : complements).push(c);
    }
    let meilleur = null;
    for (let i = 0; i < o.essais; i += 1) {
      const t = tirage(prioritaires, complements, o, hasard);
      if (t && (!meilleur || t.note > meilleur.note)) meilleur = t;
    }
    if (!meilleur) return null;

    // On rogne : la grille commence à la première case occupée, définitions comprises.
    let l0 = Infinity, c0 = Infinity, l1 = 0, c1 = 0;
    for (const p of meilleur.poses) {
      const n = p.candidat.k.length;
      const v = p.sens === V;
      l0 = Math.min(l0, p.l - (v ? 1 : 0));
      c0 = Math.min(c0, p.c - (v ? 0 : 1));
      l1 = Math.max(l1, p.l + (v ? n - 1 : 0));
      c1 = Math.max(c1, p.c + (v ? 0 : n - 1));
    }
    const mots = meilleur.poses.map((p) => Object.assign({}, p.candidat,
      { l: p.l - l0, c: p.c - c0, sens: p.sens === H ? 'h' : 'v' }));
    mots.sort((a, b) => (a.l - b.l) || (a.c - b.c) || (a.sens < b.sens ? -1 : 1));
    return { colonnes: c1 - c0 + 1, lignes: l1 - l0 + 1, mots };
  }

  /* La grille case par case, pour la dessiner et la jouer :
   *
   *   cases[p]    { type: 'vide' | 'lettre' | 'def', lettre, mots: [n°], defs: [n°] }
   *               `mots` : les mots qui passent par cette lettre ;
   *               `defs` : ceux que cette case de définition annonce
   *   traces[n]   les cases du mot n, dans l'ordre de ses lettres
   */
  function cases(grille) {
    const C = grille.colonnes;
    const liste = [];
    for (let p = 0; p < C * grille.lignes; p += 1) {
      liste.push({ type: 'vide', lettre: '', mots: [], defs: [] });
    }
    const traces = grille.mots.map((m, n) => {
      const dl = m.sens === 'v' ? 1 : 0;
      const dc = m.sens === 'h' ? 1 : 0;
      const def = liste[(m.l - dl) * C + m.c - dc];
      def.type = 'def';
      def.defs.push(n);
      const trace = [];
      for (let i = 0; i < m.k.length; i += 1) {
        const p = (m.l + dl * i) * C + m.c + dc * i;
        liste[p].type = 'lettre';
        liste[p].lettre = m.k[i];
        liste[p].mots.push(n);
        trace.push(p);
      }
      return trace;
    });
    return { cases: liste, traces };
  }

  racine.Grille = { composer, cases };

})(window);

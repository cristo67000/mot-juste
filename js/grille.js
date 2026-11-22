'use strict';
/*
 * Le compositeur de grilles de mots fléchés.
 *
 * ── Quelle sorte de grille ─────────────────────────────────────────────────
 *
 * Une grille pleine, comme celles des journaux : pas une case perdue. Chaque
 * case est une lettre ou une case de définition ; chaque suite de deux lettres
 * ou plus, en ligne comme en colonne, est un mot, annoncé par une flèche.
 * Presque toutes les lettres servent à deux mots : c'est ce qui rend une grille
 * jouable — un mot qu'on ignore se devine par ceux qui le croisent.
 *
 * Les mots des fiches de révision sont posés d'abord, bien répartis ; le reste se remplit de mots courants (data/dico/fleches.idx), et des
 * autres mots des fiches chaque fois qu'ils tiennent : ce sont les premiers
 * essayés dans chaque emplacement.
 *
 * ── Les flèches ────────────────────────────────────────────────────────────
 *
 * Un mot part de la case de définition qui le précède : à sa gauche pour un mot
 * horizontal (→), au-dessus pour un mot vertical (↓). Sur les bords, la case
 * de définition est à côté : un mot horizontal qui commence en première colonne
 * est annoncé par la case au-dessus de sa première lettre (↳), un mot vertical
 * qui commence en première ligne par la case à sa gauche (↴). Une case porte
 * deux définitions au plus.
 *
 * ── Les règles d'une grille juste ──────────────────────────────────────────
 *
 *   – toute suite de deux lettres ou plus est un mot du lexique ou des fiches,
 *     jamais deux fois le même ;
 *   – toute lettre appartient à un mot au moins ;
 *   – toute case de définition annonce un mot ou deux.
 *
 * ── La méthode ─────────────────────────────────────────────────────────────
 *
 * Celle des cruciverbistes, en trois temps :
 *
 * 1. Les semis : les mots des fiches, posés un à un, de préférence sur la
 *    dernière ligne ou la dernière colonne, jamais parallèles et voisins,
 *    chacun entre sa case de définition et celle qui le clôt.
 *    Un mot n'est gardé que si la grille se ferme encore avec lui.
 * 2. Le motif : case par case, lettre ou définition, de sorte que chaque suite
 *    ait sa flèche et chaque case de définition un ou deux mots. Les mots y
 *    restent courts — de deux à six lettres le plus souvent : ce sont ceux
 *    qu'on trouve à coup sûr pour fermer une grille.
 * 3. Le remplissage, mot par mot : toujours l'emplacement qui a le moins de
 *    mots possibles, et pour chaque essai on retire aux emplacements qui le
 *    croisent les mots devenus impossibles. Un emplacement vide de possibles
 *    fait revenir en arrière tout de suite.
 *
 * Si la grille ne se ferme pas dans le budget, nouveau motif ; après quelques
 * motifs, le dernier semis est retiré. On recommence avec les fiches dans un
 * autre ordre tant que le temps le permet, et l'on garde la grille qui porte le
 * plus de mots des fiches.
 *
 * Module pur : ni écran ni stockage, éprouvé par build/essais.mjs.
 */
(function (racine) {

  const H = 1, V = 2;
  const LIBRE = 0, LETTRE = 1, DEF = 2;
  const MORT = -1;       // une suite d'une lettre qui ne pourra pas faire un mot
  const LONGUEUR = 8;    // au-delà, seuls les mots des fiches
  const CHOIX = 3;       // les mots possibles, au moins, d'un emplacement qui croise un semis

  // ── Le lexique ────────────────────────────────────────────────────────────

  /* Le texte de data/dico/fleches.idx en mots :
   * clé ⇥ mot ⇥ nature ⇥ bande ⇥ définition ⇥ vedette (pour une forme). */
  function lexique(texte) {
    const mots = [];
    for (const ligne of String(texte || '').split('\n')) {
      const [k, mot, nature, bande, def, vedette] = ligne.replace(/\r$/, '').split('\t');
      if (!def || !/^[a-z]{2,}$/.test(k)) continue;
      mots.push({ k, mot, nature, bande: Number(bande) || 0, def, vedette: vedette || mot });
    }
    return { mots };
  }

  function melanger(liste, hasard) {
    for (let i = liste.length - 1; i > 0; i -= 1) {
      const j = Math.floor(hasard() * (i + 1));
      const t = liste[i]; liste[i] = liste[j]; liste[j] = t;
    }
    return liste;
  }

  function compter(x) {
    x -= (x >>> 1) & 0x55555555;
    x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
    return (((x + (x >>> 4)) & 0x0F0F0F0F) * 0x01010101) >>> 24;
  }

  /* Les mots rangés par longueur, et pour chaque longueur n, chaque position i
   * et chaque lettre x, l'ensemble — un champ de bits — des mots qui ont x en
   * i. Les `nPremiers` mots — ceux des fiches, puis les autres candidats —
   * viennent en tête de chaque longueur : ce sont les premiers essayés. */
  function ranger(cles, nPremiers) {
    const parLongueur = [];
    cles.forEach((k, id) => {
      const n = k.length;
      if (!parLongueur[n]) parLongueur[n] = { ids: [], fiches: 0 };
      parLongueur[n].ids.push(id);
      if (id < nPremiers) parLongueur[n].fiches += 1;
    });
    const rang = new Int32Array(cles.length);
    for (let n = 2; n < parLongueur.length; n += 1) {
      const g = parLongueur[n];
      if (!g) continue;
      g.W = Math.ceil(g.ids.length / 32);
      g.bits = new Uint32Array(n * 26 * g.W);
      g.ids.forEach((id, r) => {
        rang[id] = r;
        const k = cles[id];
        for (let i = 0; i < n; i += 1) {
          g.bits[(i * 26 + k.charCodeAt(i) - 97) * g.W + (r >>> 5)] |= 1 << (r & 31);
        }
      });
      g.tous = new Uint32Array(g.W).fill(0xFFFFFFFF);
      const reste = g.ids.length & 31;
      if (reste) g.tous[g.W - 1] = (1 << reste) - 1;
    }
    return { parLongueur, rang };
  }

  // ── Les semis ─────────────────────────────────────────────────────────────

  /* La case de définition d'un mot qui commence en (l, c), ou -1. */
  function definisseur(l, c, sens, C) {
    if (sens === H) return c > 0 ? l * C + c - 1 : (l > 0 ? (l - 1) * C : -1);
    return l > 0 ? (l - 1) * C + c : (c > 0 ? c - 1 : -1);
  }

  /* Les places possibles d'un mot des fiches, la meilleure d'abord, sans
   * toucher les semis déjà posés autrement qu'en les croisant. */
  function places(semis, id, cles, C, L, hasard) {
    const type = new Uint8Array(C * L);
    const lettre = new Array(C * L).fill('');
    const masque = new Uint8Array(C * L);
    const charge = new Uint8Array(C * L);
    type[0] = DEF;
    for (const s of semis) {
      const k = cles[s.id];
      const dl = s.sens === V ? 1 : 0, dc = s.sens === H ? 1 : 0, n = k.length;
      const d = definisseur(s.l, s.c, s.sens, C);
      type[d] = DEF;
      charge[d] += 1;
      const fl = s.l + dl * n, fc = s.c + dc * n;
      if (fl < L && fc < C) type[fl * C + fc] = DEF;
      for (let i = 0; i < n; i += 1) {
        const p = (s.l + dl * i) * C + s.c + dc * i;
        type[p] = LETTRE;
        lettre[p] = k[i];
        masque[p] |= s.sens;
      }
    }

    function essai(k, l, c, sens) {
      const dl = sens === V ? 1 : 0, dc = sens === H ? 1 : 0, n = k.length;
      const fl = l + dl * (n - 1), fc = c + dc * (n - 1);
      if (fl >= L || fc >= C) return -1;
      const d = definisseur(l, c, sens, C);
      if (d === -1 || type[d] === LETTRE || charge[d] >= 2) return -1;
      if (fl + dl < L && fc + dc < C) {
        if (type[(fl + dl) * C + fc + dc] === LETTRE) return -1;
        // La case qui clôt le mot doit pouvoir annoncer un mot à son tour :
        // il lui faut deux cases à sa droite ou deux au-dessous.
        if (fc + dc > C - 3 && fl + dl > L - 3) return -1;
      }
      let x = 0;
      for (let i = 0; i < n; i += 1) {
        const li = l + dl * i, ci = c + dc * i, p = li * C + ci;
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

    const k = cles[id];
    const liste = [];
    for (const sens of [H, V]) {
      for (let l = 0; l < L; l += 1) {
        for (let c = 0; c < C; c += 1) {
          const x = essai(k, l, c, sens);
          if (x < 0) continue;
          /* Le meilleur endroit : la dernière ligne, la dernière colonne. Les
           * mots qui croisent le semis n'ont plus qu'à finir par sa lettre,
           * et il y en a toujours. La première ligne et la première colonne,
           * au contraire, privent ses lettres de flèche. Deux semis
           * parallèles et voisins imposent chacun leurs lettres aux mêmes
           * mots qui les traversent : la grille ne s'en remet presque jamais. */
          const fl = l + (sens === V ? k.length - 1 : 0);
          const fc = c + (sens === H ? k.length - 1 : 0);
          let note = hasard() * 4 - x * 4;
          if (sens === H ? fl === L - 1 : fc === C - 1) note += 12;
          if (sens === H ? l === 0 : c === 0) note -= 10;
          for (const t of semis) {
            if (t.sens !== sens) continue;
            const n = cles[t.id].length;
            const ecart = sens === H ? Math.abs(t.l - l) : Math.abs(t.c - c);
            const debutT = sens === H ? t.c : t.l, debutM = sens === H ? c : l;
            const recouvre = debutT < debutM + k.length && debutM < debutT + n;
            if (recouvre && ecart <= 3) note -= (4 - ecart) * 6;
          }
          liste.push({ id, l, c, sens, note });
        }
      }
    }
    return liste.sort((a, b) => b.note - a.note);
  }

  // ── Le motif ──────────────────────────────────────────────────────────────

  /* Décide, case par case, des lettres et des cases de définition, autour des
   * cases fixées par les semis. Rend le tableau des types, ou null.
   *
   * Le motif ne connaît pas les lettres, sauf celles des semis : un
   * emplacement qui en croise un doit garder un choix de mots possibles —
   * « .Q. » ou « .P » condamneraient la grille avant même d'y écrire, et
   * « I. » (il, if) la mettrait à la merci d'un seul croisement. */
  function motif(fixe, sensFixe, fixeLettre, R, C, L, longueurMax, hasard, budget) {
    const N = C * L;
    const tampon = new Uint32Array(Math.ceil(((R.parLongueur[longueurMax] || {}).ids || []).length / 32) + 64);
    function possible(debut, n, pasCase, sens) {
      let contraint = false, semis = true;
      for (let i = 0; i < n; i += 1) {
        const q = debut + i * pasCase;
        if (fixeLettre[q] >= 0) contraint = true;
        if (!(sensFixe[q] & sens)) semis = false;
      }
      if (!contraint) return true;
      if (semis) return true;              // le semis lui-même
      const g = R.parLongueur[n];
      if (!g) return false;
      const t = g.W <= tampon.length ? tampon : new Uint32Array(g.W);
      t.set(g.tous);
      let reste = 0;
      for (let i = 0; i < n; i += 1) {
        const x = fixeLettre[debut + i * pasCase];
        if (x < 0) continue;
        const base = (i * 26 + x) * g.W;
        reste = 0;
        for (let w = 0; w < g.W; w += 1) { t[w] &= g.bits[base + w]; reste += t[w] ? compter(t[w]) : 0; }
        if (reste < CHOIX) return false;
      }
      return true;
    }

    const type = new Uint8Array(N);
    const charge = new Uint8Array(N);
    const enMot = new Uint8Array(N);       // la lettre est d'un mot horizontal
    const vl = new Int32Array(C);          // longueur de la suite verticale en cours (MORT : une lettre, close)
    const vd = new Int32Array(C);          // sa première ligne
    let pas = 0;

    /* Une suite horizontale se clôt avant la colonne c (exclue). */
    function closH(l, c, hl, hd) {
      if (hl >= 2) {
        if (!possible(l * C + hd, hl, 1, H)) return false;
        for (let x = hd; x < c; x += 1) enMot[l * C + x] = 1;
        return true;
      }
      if (hl === 0) return true;
      // Une lettre seule : il lui faut un mot vertical…
      if (vl[hd] === MORT && vd[hd] === l) return false;
      // … et la case qui la précède n'aura pas de mot horizontal.
      return hd === 0 || espoir(l, hd - 1);
    }

    function prevoir(l, c, n, debut, dl, dc, sens) {
      let li = l + dl, ci = c + dc, suite = 0;
      while (li < L && ci < C && fixe[li * C + ci] === LETTRE) { suite += 1; li += dl; ci += dc; }
      if (!suite) return true;
      if (n === MORT) return false;            // une lettre seule ne peut pas s'allonger
      if (li < L && ci < C && fixe[li * C + ci] !== DEF) return true;   // la suite reste ouverte
      const total = n + suite;
      if (total > longueurMax && !(sensFixe[li * C + ci - (dl * C + dc)] & sens)) return false;
      return sens === H ? possible(l * C + debut, total, 1, H) : possible(debut * C + c, total, C, V);
    }

    /* Une case de définition (r, q) qui n'aura pas de mot horizontal : peut-
     * elle encore en annoncer un autre ? Il lui faut deux cases libres
     * au-dessous, ou, sur les bords, à côté de la case voisine. */
    function espoir(r, q) {
      if (charge[r * C + q]) return true;
      const libre = (l, c) => l < L && c < C && fixe[l * C + c] !== DEF;
      if (r <= L - 3 && libre(r + 1, q) && libre(r + 2, q)) return true;
      if (q === 0 && r <= L - 2 && libre(r + 1, 0) && libre(r + 1, 1)) return true;
      return r === 0 && q <= C - 2 && libre(0, q + 1) && libre(1, q + 1);
    }

    /* La suite verticale de la colonne c se clôt avant la ligne l (exclue). */
    function closV(l, c) {
      const n = vl[c] === MORT ? 1 : vl[c];
      if (n >= 2) return possible(vd[c] * C + c, n, C, V);
      if (n === 1 && !enMot[vd[c] * C + c]) return false;               // lettre isolée
      const s = n === 1 ? vd[c] : l;                                     // la case sous la définition
      return !(s >= 2 && type[(s - 1) * C + c] === DEF && !charge[(s - 1) * C + c]);
    }

    function avancer(p, hl, hd) {
      if (p === N) {
        for (let c = 0; c < C; c += 1) if (!closV(L, c)) return false;
        for (let q = 0; q < N; q += 1) if (type[q] === DEF && !charge[q]) return false;
        return true;
      }
      pas += 1;
      if (pas > budget) return false;
      const l = Math.floor(p / C), c = p % C;

      const essayerDef = () => {
        if (fixe[p] === LETTRE || p === N - 1) return false;
        if (c > 0 && type[p - 1] === DEF && !espoir(l, c - 1)) return false;
        if (c === C - 1 && !espoir(l, c)) return false;
        if (!closH(l, c, hl, hd)) return false;
        if (!closV(l, c)) {
          if (hl >= 2) for (let x = hd; x < c; x += 1) enMot[l * C + x] = 0;
          return false;
        }
        const ancienL = vl[c], ancienD = vd[c];
        type[p] = DEF;
        vl[c] = 0;
        if (avancer(p + 1, 0, 0)) return true;
        type[p] = LIBRE;
        vl[c] = ancienL; vd[c] = ancienD;
        if (hl >= 2) for (let x = hd; x < c; x += 1) enMot[l * C + x] = 0;
        return false;
      };

      const essayerLettre = () => {
        if (fixe[p] === DEF) return false;
        // Horizontalement : une suite qui commence, ou qui s'allonge.
        let nh, dH = -1, h2 = false;
        if (hl === 0) {
          dH = definisseur(l, c, H, C);
          nh = dH !== -1 && (c > 0 || type[dH] === DEF) && charge[dH] < 2 && c < C - 1 ? 1 : MORT;
        } else {
          if (hl === MORT) return false;
          nh = hl + 1;
          if (nh > longueurMax && !(sensFixe[p] & H)) return false;
          if (nh === 2) {
            dH = definisseur(l, hd, H, C);
            if (charge[dH] >= 2) return false;
            h2 = true;
          }
        }
        const ancienL = vl[c], ancienD = vd[c];
        let nv, dV = -1, v2 = false;
        if (ancienL === 0) {
          dV = definisseur(l, c, V, C);
          nv = dV !== -1 && (l > 0 || type[dV] === DEF) && charge[dV] < 2 && l < L - 1 ? 1 : MORT;
        } else {
          if (ancienL === MORT) return false;
          nv = ancienL + 1;
          if (nv > longueurMax && !(sensFixe[p] & V)) return false;
          if (nv === 2) { dV = definisseur(ancienD, c, V, C); v2 = true; }
        }
        if (nh === MORT && nv === MORT) return false;
        // Des lettres fixées plus loin, puis une case de définition ou le
        // bord : la longueur du mot est déjà connue, on le vérifie tout de suite.
        if (!prevoir(l, c, nh, hl === 0 ? c : hd, 0, 1, H)) return false;
        if (!prevoir(l, c, nv, ancienL === 0 ? l : ancienD, 1, 0, V)) return false;
        // La case de définition du dessus n'aura pas de mot vertical : il lui
        // fallait déjà le sien, en ligne.
        if (nv === MORT && ancienL === 0 && l >= 2 && c > 0 && type[p - C] === DEF && !charge[p - C]) return false;
        if (h2) charge[dH] += 1;
        if (v2) {
          if (charge[dV] >= 2) { if (h2) charge[dH] -= 1; return false; }
          charge[dV] += 1;
        }
        type[p] = LETTRE;
        vl[c] = nv;
        vd[c] = ancienL === 0 ? l : ancienD;
        const debutH = hl === 0 ? c : hd;
        let ok;
        if (c === C - 1) ok = closH(l, C, nh === MORT ? 1 : nh, debutH) && avancer(p + 1, 0, 0);
        else ok = avancer(p + 1, nh, debutH);
        if (ok) return true;
        if (c === C - 1 && nh >= 2) for (let x = debutH; x < C; x += 1) enMot[l * C + x] = 0;
        type[p] = LIBRE;
        vl[c] = ancienL; vd[c] = ancienD;
        if (h2) charge[dH] -= 1;
        if (v2) charge[dV] -= 1;
        return false;
      };

      if (fixe[p] === DEF) return essayerDef();
      if (fixe[p] === LETTRE) return essayerLettre();
      /* Une case de définition ? Rarement juste après une autre, de plus en
       * plus volontiers à mesure que les mots en cours s'allongent : à quatre
       * lettres, une chance sur deux. */
      const longueur = Math.max(hl === MORT ? 1 : hl, vl[c] === MORT ? 1 : vl[c]);
      const envie = hl === 0 ? 0.06 : [0.06, 0.1, 0.25, 0.4, 0.55, 0.7, 0.85][Math.min(longueur, 6)];
      if (hasard() < envie) return essayerDef() || (pas <= budget && essayerLettre());
      return essayerLettre() || (pas <= budget && essayerDef());
    }

    return avancer(0, 0, 0) ? type : null;
  }

  // ── Le remplissage ────────────────────────────────────────────────────────

  /* Les emplacements d'un motif : chaque suite de deux lettres ou plus. */
  function emplacements(type, C, L) {
    const liste = [];
    const parCase = Array.from({ length: C * L }, () => []);
    for (const sens of [H, V]) {
      const dl = sens === V ? 1 : 0, dc = sens === H ? 1 : 0;
      for (let l = 0; l < L; l += 1) {
        for (let c = 0; c < C; c += 1) {
          const p = l * C + c;
          if (type[p] !== LETTRE) continue;
          const lp = l - dl, cp = c - dc;
          if (lp >= 0 && cp >= 0 && type[lp * C + cp] === LETTRE) continue;   // pas un début
          const cases = [];
          let li = l, ci = c;
          while (li < L && ci < C && type[li * C + ci] === LETTRE) { cases.push(li * C + ci); li += dl; ci += dc; }
          if (cases.length < 2) continue;
          const s = { l, c, sens, cases, d: definisseur(l, c, sens, C) };
          cases.forEach((q, i) => parCase[q].push([liste.length, i]));
          liste.push(s);
        }
      }
    }
    return { liste, parCase };
  }

  /* Remplit les emplacements. Rend le mot (son id) de chaque emplacement, ou
   * null.
   *
   * Chaque emplacement a son domaine — les mots qui y tiennent encore —, chaque
   * case l'ensemble des lettres encore permises. Les deux se tiennent l'un
   * l'autre : un domaine qui maigrit retire des lettres à ses cases, une case
   * qui perd une lettre retire des mots aux emplacements qui la croisent, et
   * ainsi de suite jusqu'au calme. Une case sans lettre, un emplacement sans
   * mot : impasse, on revient en arrière sur-le-champ.
   *
   * On remplit toujours l'emplacement qui a le moins de mots possibles ; on y
   * essaie les mots des fiches d'abord, puis ceux qui laissent le plus de choix
   * aux emplacements qu'ils croisent. */
  function garnir(motifs, semis, R, cles, C, budget, hasard) {
    const { liste, parCase } = motifs;
    const S = liste.length;
    const TOUTES = (1 << 26) - 1;
    const permis = new Int32Array(parCase.length).fill(TOUTES);
    const domaine = [];
    const groupe = [];
    const choisi = new Int32Array(S).fill(-1);
    const pris = new Uint8Array(cles.length);
    for (let s = 0; s < S; s += 1) {
      const g = R.parLongueur[liste[s].cases.length];
      if (!g) return null;
      groupe.push(g);
      domaine.push(g.tous.slice());
    }
    let largeur = 1;
    for (const g of groupe) largeur = Math.max(largeur, g.W);
    const tampon = new Uint32Array(largeur);

    // La trace, pour défaire : les domaines et les cases d'avant l'essai.
    let sauvesD = null, sauvesP = null;
    function garderD(t) {
      if (sauvesD && !sauvesD.has(t)) sauvesD.set(t, domaine[t].slice());
    }
    function garderP(q) {
      if (sauvesP && !sauvesP.has(q)) sauvesP.set(q, permis[q]);
    }

    /* Les lettres que le domaine de s permet encore en sa position i. */
    function lettresDe(s, i) {
      const g = groupe[s], d = domaine[s];
      let m = 0;
      for (let x = 0; x < 26; x += 1) {
        const base = (i * 26 + x) * g.W;
        for (let w = 0; w < g.W; w += 1) if (d[w] & g.bits[base + w]) { m |= 1 << x; break; }
      }
      return m;
    }

    /* Ne garde au domaine de t que les mots dont la lettre j est dans m.
     * Rend -1 s'il n'en reste aucun, 1 s'il a changé, 0 sinon. */
    function filtrer(t, j, m) {
      const g = groupe[t], d = domaine[t];
      tampon.fill(0, 0, g.W);
      for (let x = 0; x < 26; x += 1) {
        if (!(m & (1 << x))) continue;
        const base = (j * 26 + x) * g.W;
        for (let w = 0; w < g.W; w += 1) tampon[w] |= g.bits[base + w];
      }
      let change = 0, reste = 0;
      for (let w = 0; w < g.W; w += 1) {
        const y = d[w] & tampon[w];
        if (y !== d[w]) {
          if (!change) { garderD(t); change = 1; }
          d[w] = y;
        }
        reste |= y;
      }
      return reste ? change : -1;
    }

    /* Jusqu'au calme, à partir des emplacements de la file. */
    function propager(file) {
      const dans = new Uint8Array(S);
      for (const s of file) dans[s] = 1;
      while (file.length) {
        const s = file.pop();
        dans[s] = 0;
        const cases = liste[s].cases;
        for (let i = 0; i < cases.length; i += 1) {
          const q = cases[i];
          const m = permis[q] & lettresDe(s, i);
          if (!m) return false;
          if (m === permis[q]) continue;
          garderP(q);
          permis[q] = m;
          for (const [t, j] of parCase[q]) {
            if (t === s) continue;
            const r = filtrer(t, j, m);
            if (r < 0) return false;
            if (r && !dans[t]) { dans[t] = 1; file.push(t); }
          }
        }
      }
      return true;
    }

    // Les semis : leur emplacement est à eux, leurs lettres réduisent les autres.
    for (const m of semis) {
      const s = liste.findIndex((x) => x.l === m.l && x.c === m.c && x.sens === m.sens);
      if (s === -1 || liste[s].cases.length !== cles[m.id].length) return null;
      choisi[s] = m.id;
      pris[m.id] = 1;
      const r = R.rang[m.id];
      domaine[s].fill(0);
      domaine[s][r >>> 5] = 1 << (r & 31);
    }
    if (!propager(Array.from({ length: S }, (_, s) => s))) return null;

    let pas = 0;
    function chercher(restants) {
      if (!restants) return true;
      pas += 1;
      if (pas > budget) return false;
      // L'emplacement qui a le moins de possibles.
      let s = -1, moins = Infinity;
      for (let t = 0; t < S; t += 1) {
        if (choisi[t] !== -1) continue;
        const d = domaine[t];
        let n = 0;
        for (let w = 0; w < d.length && n < moins; w += 1) if (d[w]) n += compter(d[w]);
        if (n < moins || (n === moins && hasard() < 0.5)) { moins = n; s = t; }
      }
      const g = groupe[s];
      const fiches = [], autres = [];
      const d = domaine[s];
      for (let w = 0; w < d.length; w += 1) {
        let x = d[w];
        while (x) {
          const b = 31 - Math.clz32(x);
          x &= ~(1 << b);
          const r = w * 32 + b;
          if (!pris[g.ids[r]]) (r < g.fiches ? fiches : autres).push(g.ids[r]);
        }
      }
      melanger(fiches, hasard);
      melanger(autres, hasard);
      // Parmi une quarantaine tirés au hasard, ceux qui laissent le plus de
      // choix aux emplacements croisés ; huit essais au plus.
      const croisements = [];
      liste[s].cases.forEach((q, i) => {
        for (const [t, j] of parCase[q]) if (t !== s && choisi[t] === -1) croisements.push([i, t, j]);
      });
      const noter = (id) => {
        const k = cles[id];
        let note = 0;
        for (const [i, t, j] of croisements) {
          const gt = groupe[t];
          const base = (j * 26 + k.charCodeAt(i) - 97) * gt.W;
          const dt = domaine[t];
          let n = 0;
          for (let w = 0; w < gt.W; w += 1) { const y = dt[w] & gt.bits[base + w]; if (y) n += compter(y); }
          if (!n) return -1;
          note += Math.log(n);
        }
        return note + hasard() * 0.5;
      };
      const notes = new Map();
      const tires = autres.slice(0, 40);
      for (const id of tires) notes.set(id, noter(id));
      const essais = fiches.concat(tires.filter((id) => notes.get(id) >= 0)
        .sort((a, b) => notes.get(b) - notes.get(a)).slice(0, 8));

      for (const id of essais) {
        const avantD = sauvesD, avantP = sauvesP;
        sauvesD = new Map();
        sauvesP = new Map();
        garderD(s);
        const r = R.rang[id];
        domaine[s].fill(0);
        domaine[s][r >>> 5] = 1 << (r & 31);
        choisi[s] = id;
        pris[id] = 1;
        const ok = propager([s]) && chercher(restants - 1);
        const mesD = sauvesD, mesP = sauvesP;
        sauvesD = avantD;
        sauvesP = avantP;
        if (ok) return true;            // une grille fermée ne se défait plus
        choisi[s] = -1;
        pris[id] = 0;
        for (const [t, copie] of mesD) domaine[t] = copie;
        for (const [q, m] of mesP) permis[q] = m;
        if (pas > budget) return false;
      }
      return false;
    }

    let restants = 0;
    for (let s = 0; s < S; s += 1) if (choisi[s] === -1) restants += 1;
    return chercher(restants) ? choisi : null;
  }

  /* Un essai : motif puis remplissage, quelques fois. Rend les mots posés
   * [{ id, l, c, sens, d }] ou null. */
  function remplir(R, semis, cles, C, L, o, hasard) {
    const N = C * L;
    const fixe = new Uint8Array(N);
    const sensFixe = new Uint8Array(N);
    const fixeLettre = new Int8Array(N).fill(-1);
    for (const s of semis) {
      const n = cles[s.id].length;
      const dl = s.sens === V ? 1 : 0, dc = s.sens === H ? 1 : 0;
      fixe[definisseur(s.l, s.c, s.sens, C)] = DEF;
      const fl = s.l + dl * n, fc = s.c + dc * n;
      if (fl < L && fc < C) fixe[fl * C + fc] = DEF;
      for (let i = 0; i < n; i += 1) {
        const p = (s.l + dl * i) * C + s.c + dc * i;
        fixe[p] = LETTRE;
        sensFixe[p] |= s.sens;
        fixeLettre[p] = cles[s.id].charCodeAt(i) - 97;
      }
    }
    if (fixe[0] === LETTRE) return null;
    fixe[0] = DEF;
    for (let essai = 0; essai < o.motifs; essai += 1) {
      const type = motif(fixe, sensFixe, fixeLettre, R, C, L, LONGUEUR, hasard, o.pasMotif);
      if (!type) continue;
      const e = emplacements(type, C, L);
      const choisi = garnir(e, semis, R, cles, C, o.budget, hasard);
      if (choisi) {
        return e.liste.map((s, n) => ({ id: choisi[n], l: s.l, c: s.c, sens: s.sens, d: s.d }));
      }
    }
    return null;
  }

  // ── Composer ──────────────────────────────────────────────────────────────

  /* Compose une grille pleine.
   *
   *   candidats   [{ k, prioritaire, … }] — `k` : le mot en lettres a-z ; les
   *               prioritaires sont ceux des fiches, dans l'ordre où l'on
   *               voudrait les voir
   *   options     lexique (Grille.lexique), colonnes, lignes, essais (ordres
   *               des fiches essayés), semis (mots des fiches posés, au
   *               plus), motifs (essayés pour chaque jeu de semis), pasMotif
   *               et budget (pas du motif, du remplissage), duree (ms, à peu
   *               près), hasard (pour des épreuves reproductibles)
   *
   * Rend { colonnes, lignes, mots: [{ …candidat ou mot du lexique, l, c,
   * sens: 'h' | 'v', dl, dc }] } — (dl, dc) : la case de définition —, les mots
   * dans l'ordre de lecture ; ou null si rien ne tient. */
  function composer(candidats, options) {
    const o = Object.assign({ colonnes: 9, lignes: 11, essais: 3, semis: 14, motifs: 16, pasMotif: 500, budget: 600, duree: 1500 }, options);
    const hasard = o.hasard || Math.random;
    const C = o.colonnes, L = o.lignes;
    const debut = Date.now();

    const vus = new Set();
    const fiches = [];
    const autres = [];
    for (const x of candidats || []) {
      if (!x || !/^[a-z]{2,}$/.test(x.k) || vus.has(x.k)) continue;
      if (x.k.length > Math.max(C, L) - 1) continue;
      vus.add(x.k);
      (x.prioritaire ? fiches : autres).push(x);
    }
    const lex = (o.lexique && o.lexique.mots) || [];
    const fonds = lex.filter((m) => !vus.has(m.k) && m.k.length <= LONGUEUR);
    const tous = fiches.concat(autres, fonds);
    const cles = tous.map((x) => x.k);
    const nFiches = fiches.length;
    // Les mots des fiches puis les autres candidats sont essayés les premiers
    // dans chaque emplacement ; seuls ceux des fiches comptent pour la note.
    const R = ranger(cles, nFiches + autres.length);

    const noter = (poses) => {
      const nPrio = poses.filter((m) => m.id < nFiches).length;
      const nDef = new Set(poses.map((m) => m.d)).size;
      const courts = poses.filter((m) => cles[m.id].length === 2).length;
      const rares = poses.reduce((s, m) => s + (m.id >= nFiches ? (tous[m.id].bande || 0) : 0), 0);
      return nPrio * 100 - nDef * 2 - courts * 4 - rares;
    };
    const temps = () => Date.now() - debut;

    let meilleur = null;
    for (let essai = 0; essai < o.essais; essai += 1) {
      if (meilleur && temps() > o.duree) break;
      // Les plus fragiles d'abord, à peu près : l'ordre des fiches, un peu brassé.
      const ordre = fiches.map((x, id) => ({ id, rang: id + hasard() * 6 }))
        .sort((a, b) => a.rang - b.rang).map((y) => y.id);
      /* Les semis un à un : un mot n'est gardé que si la grille se ferme
       * encore avec lui — à sa meilleure place, ou à la suivante. */
      let semis = [];
      let poses = remplir(R, semis, cles, C, L, o, hasard);
      if (!poses) continue;
      for (const id of ordre) {
        if (semis.length >= o.semis || temps() > o.duree * (essai + 1) / o.essais) break;
        for (const place of places(semis, id, cles, C, L, hasard).slice(0, 3)) {
          const avec = semis.concat([place]);
          const p = remplir(R, avec, cles, C, L, o, hasard);
          if (p) { semis = avec; poses = p; break; }
        }
      }
      const note = noter(poses);
      if (!meilleur || note > meilleur.note) meilleur = { poses, note };
    }
    if (!meilleur) return null;

    const mots = meilleur.poses.map((m) => {
      const source = tous[m.id];
      return Object.assign({}, source, {
        prioritaire: !!source.prioritaire,
        l: m.l, c: m.c, sens: m.sens === H ? 'h' : 'v',
        dl: Math.floor(m.d / C), dc: m.d % C,
      });
    });
    mots.sort((a, b) => (a.l - b.l) || (a.c - b.c) || (a.sens < b.sens ? -1 : 1));
    return { colonnes: C, lignes: L, mots };
  }

  /* La flèche d'un mot, selon que sa case de définition le précède ou se
   * tient à côté de sa première lettre. */
  function fleche(m) {
    const coude = m.dl !== undefined && (m.sens === 'h' ? m.dl !== m.l : m.dc !== m.c);
    if (m.sens === 'h') return coude ? '↳' : '→';
    return coude ? '↴' : '↓';
  }

  /* La grille case par case, pour la dessiner et la jouer :
   *
   *   cases[p]    { type: 'vide' | 'lettre' | 'def', lettre, mots: [n°], defs: [n°] }
   *               `mots` : les mots qui passent par cette lettre ;
   *               `defs` : ceux que cette case de définition annonce
   *   traces[n]   les cases du mot n, dans l'ordre de ses lettres
   *
   * Une grille composée avant les grilles pleines n'a pas (dl, dc) : sa case
   * de définition est celle qui précède le mot. */
  function cases(grille) {
    const C = grille.colonnes;
    const liste = [];
    for (let p = 0; p < C * grille.lignes; p += 1) {
      liste.push({ type: 'vide', lettre: '', mots: [], defs: [] });
    }
    const traces = grille.mots.map((m, n) => {
      const dl = m.sens === 'v' ? 1 : 0;
      const dc = m.sens === 'h' ? 1 : 0;
      const pd = m.dl !== undefined ? m.dl * C + m.dc : (m.l - dl) * C + m.c - dc;
      const def = liste[pd];
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

  racine.Grille = { lexique, composer, cases, fleche };

})(window);

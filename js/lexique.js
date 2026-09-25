'use strict';
/*
 * Le dictionnaire : chargement, recherche instantanée, formes fléchies.
 *
 * ── Ce que contient data/dico/ ──────────────────────────────────────────────
 *
 *   mots.idx          une ligne par vedette, triée par clé :
 *                     clé ⇥ vedette ⇥ tranche ⇥ bande ⇥ nature ⇥ aperçu
 *   formes.idx        forme ⇥ n,reste|n,reste  →  clé du lemme = forme[:n] + reste
 *   expressions.idx   mot ⇥ vedette|vedette|…  les locutions qui contiennent ce mot
 *   t-000.json…       les entrées elles-mêmes, par tranches de 600
 *
 * Les trois index sont chargés au démarrage et gardés en mémoire ; les
 * tranches ne le sont qu'à la demande, quand on ouvre une fiche.
 *
 * ── Pourquoi l'index reste une chaîne ───────────────────────────────────────
 *
 * 76 000 lignes découpées en autant de chaînes JavaScript coûteraient
 * plusieurs mégaoctets rien qu'en en-têtes d'objets, sur un téléphone qui n'en
 * a pas de trop. On garde le texte tel qu'il est arrivé et la position de
 * chaque début de ligne dans un Int32Array — 4 octets par entrée. La
 * recherche est une dichotomie sur ces positions : une vingtaine de
 * comparaisons, instantanée, sans rien construire.
 *
 * ── ⚠ cle() a un jumeau en Python ──────────────────────────────────────────
 *
 * `build/commun.py:cle()` doit donner exactement le même résultat, sinon un
 * mot présent dans l'index devient introuvable à la frappe.
 * `build/verifier.py` exécute les deux sur les mêmes cas et échoue si elles
 * divergent.
 */
(function (racine) {

  const REMPLACEMENTS = [
    ['œ', 'oe'], ['Œ', 'oe'],
    ['æ', 'ae'], ['Æ', 'ae'],
    ['’', "'"], ['‘', "'"], ['‛', "'"], ['´', "'"], ['`', "'"],
    ['–', '-'], ['—', '-'], ['‐', '-'], ['‑', '-'],
    [String.fromCharCode(0xA0), ' '], [String.fromCharCode(0x202F), ' '],
    [String.fromCharCode(0x2009), ' '],
  ];

  function cle(texte) {
    if (!texte) return '';
    let sortie = String(texte).toLowerCase();
    for (const [avant, apres] of REMPLACEMENTS) {
      if (sortie.indexOf(avant) !== -1) sortie = sortie.split(avant).join(apres);
    }
    sortie = sortie.normalize('NFD').replace(/\p{M}/gu, '');
    return sortie.split(/\s+/).filter(Boolean).join(' ');
  }

  /* Les mots-outils ne rangent pas les expressions — la même liste que
   * `MOTS_OUTILS` dans build/construire.py. */
  const MOTS_OUTILS = new Set(('a au aux avec ce ces cet cette d de des du elle en est et '
    + 'il ils je l la le les leur leurs lui ma me mes mon n ne nous on ou par pas pour qu '
    + 'que qui s sa se ses son sur t ta te tes ton tu un une vos votre vous y c j m ni plus')
    .split(' '));

  // ── Index en mémoire ──────────────────────────────────────────────────────

  function indexer(texte) {
    const debuts = [];
    let position = 0;
    const taille = texte.length;
    while (position < taille) {
      debuts.push(position);
      const saut = texte.indexOf('\n', position);
      if (saut === -1) break;
      position = saut + 1;
    }
    return { texte, debuts: Int32Array.from(debuts) };
  }

  function cleLigne(index, numero) {
    const debut = index.debuts[numero];
    const fin = index.texte.indexOf('\t', debut);
    return index.texte.slice(debut, fin === -1 ? debut : fin);
  }

  function champs(index, numero) {
    const debut = index.debuts[numero];
    let fin = index.texte.indexOf('\n', debut);
    if (fin === -1) fin = index.texte.length;
    if (fin > debut && index.texte.charCodeAt(fin - 1) === 13) fin -= 1;
    return index.texte.slice(debut, fin).split('\t');
  }

  /* Numéro de la première ligne dont la clé est ≥ `cible`. */
  function premiereLigne(index, cible) {
    let bas = 0;
    let haut = index.debuts.length;
    while (bas < haut) {
      const milieu = (bas + haut) >> 1;
      if (cleLigne(index, milieu) < cible) bas = milieu + 1;
      else haut = milieu;
    }
    return bas;
  }

  // ── État ──────────────────────────────────────────────────────────────────

  const etat = {
    manifeste: null,
    mots: null,
    formes: null,
    expressions: null,
    tranches: new Map(),     // numéro → Promise<[entrées]>
  };
  const TRANCHES_EN_MEMOIRE = 8;

  async function texteDe(chemin) {
    const reponse = await fetch(chemin);
    if (!reponse.ok) throw new Error(chemin + ' : ' + reponse.status);
    return reponse.text();
  }

  async function charger(manifeste) {
    const [mots, formes, expressions] = await Promise.all([
      texteDe('data/dico/mots.idx'),
      texteDe('data/dico/formes.idx'),
      texteDe('data/dico/expressions.idx'),
    ]);
    // Rien n'est publié tant que tout n'est pas lu.
    etat.manifeste = manifeste;
    etat.mots = indexer(mots);
    etat.formes = indexer(formes);
    etat.expressions = indexer(expressions);
    etat.tranches.clear();
    return etat;
  }

  function ligneEnResultat(ligne) {
    const [k, mot, tranche, bande, nature, apercu] = ligne;
    return {
      mot, cle: k,
      tranche: Number(tranche),
      bande: Number(bande),
      nature: nature || '',
      apercu: apercu || '',
      expression: mot.indexOf(' ') !== -1 || /^loc/.test(nature || ''),
      via: null,
    };
  }

  // ── Recherche ─────────────────────────────────────────────────────────────

  function collecter(prefixe, exact, resultats, plafond) {
    const index = etat.mots;
    if (!index) return;
    let numero = premiereLigne(index, prefixe);
    while (numero < index.debuts.length && resultats.length < plafond) {
      const ligne = champs(index, numero);
      const k = ligne[0];
      if (!k.startsWith(prefixe)) break;
      if (exact && k !== prefixe) break;
      const resultat = ligneEnResultat(ligne);
      resultat.exact = k === prefixe;
      resultats.push(resultat);
      numero += 1;
    }
  }

  /* La ligne d'index d'une vedette précise, ou null si elle n'y est pas. */
  function vedette(mot) {
    const index = etat.mots;
    if (!index || !mot) return null;
    const k = cle(mot);
    let numero = premiereLigne(index, k);
    while (numero < index.debuts.length) {
      const ligne = champs(index, numero);
      if (ligne[0] !== k) return null;
      if (ligne[1] === mot) return ligneEnResultat(ligne);
      numero += 1;
    }
    return null;
  }

  /* Plusieurs vedettes partagent souvent une clé : « pêche », « péché » et
   * « pèche » ; « mur » et « mûr ». La graphie exacte tranche ; à défaut, le
   * mot le plus courant, qui est presque toujours celui qu'on visait. */
  function meilleur(lot, graphie) {
    const exact = lot.find((r) => r.mot === graphie);
    if (exact) return exact;
    const minuscule = graphie.toLowerCase();
    const casse = lot.find((r) => r.mot === minuscule);
    if (casse) return casse;
    return lot.reduce((a, b) => (b.bande < a.bande ? b : a));
  }

  /* Les clés des lemmes d'une forme fléchie : « chevaux » → « cheval ». */
  function lemmes(k) {
    const index = etat.formes;
    if (!index || !k) return [];
    const numero = premiereLigne(index, k);
    if (numero >= index.debuts.length || cleLigne(index, numero) !== k) return [];
    const [, codes] = champs(index, numero);
    return codes.split('|').map((code) => {
      const virgule = code.indexOf(',');
      const partage = Number(code.slice(0, virgule));
      return k.slice(0, partage) + code.slice(virgule + 1);
    });
  }

  /* La vedette derrière une graphie rencontrée dans un texte. C'est ce qui
   * rend les mots des définitions et des citations cliquables : on lit
   * « chevaux », il faut arriver à « cheval ». Renvoie null si le mot n'est
   * pas au dictionnaire — un mot muet vaut mieux qu'un lien qui ne mène à
   * rien. */
  function resoudre(graphie) {
    const k = cle(graphie);
    if (!k) return null;
    const direct = [];
    collecter(k, true, direct, 8);
    if (direct.length) return meilleur(direct, graphie);
    for (const lemme of lemmes(k)) {
      const lot = [];
      collecter(lemme, true, lot, 8);
      if (lot.length) {
        const trouve = meilleur(lot, lemme);
        trouve.via = graphie;
        return trouve;
      }
    }
    return null;
  }

  /* Trois rangs :
   *
   *   0  la frappe est exactement la vedette              « cheval »  → cheval
   *   1  la frappe est une forme fléchie de la vedette    « chevaux » → cheval
   *   2  la frappe est le début de la vedette             « chev »    → cheval
   *
   * Le rang 1 passe avant le rang 2 : qui tape « fit » veut « faire », avant
   * « fitness ». Ensuite les mots les plus courants, puis les plus courts. */
  function ordonner(a, b) {
    if (a.rang !== b.rang) return a.rang - b.rang;
    if (!!a.perso !== !!b.perso) return a.perso ? -1 : 1;
    if (a.expression !== b.expression) return a.expression ? 1 : -1;
    if (a.bande !== b.bande) return a.bande - b.bande;
    if (a.cle.length !== b.cle.length) return a.cle.length - b.cle.length;
    return a.cle < b.cle ? -1 : (a.cle > b.cle ? 1 : 0);
  }

  function chercher(saisie, plafond) {
    const limite = plafond || 40;
    const k = cle(saisie);
    if (!k) return [];
    const resultats = [];
    const vus = new Set();

    function ajouter(lot, rang, via) {
      for (const r of lot) {
        const empreinte = r.perso ? 'perso ' + r.perso : r.mot;
        if (vus.has(empreinte)) continue;
        vus.add(empreinte);
        r.rang = r.exact ? 0 : rang;
        r.via = via || r.via || null;
        resultats.push(r);
      }
    }

    for (const lemme of lemmes(k)) {
      const lot = [];
      collecter(lemme, true, lot, 4);
      ajouter(lot, 1, saisie);
    }
    const lot = [];
    collecter(k, false, lot, limite * 3);
    ajouter(lot, 2, null);
    if (racine.Perso) ajouter(Perso.chercher(k, limite), 2, null);

    resultats.sort(ordonner);
    return resultats.slice(0, limite);
  }

  // ── Les expressions, par un mot qu'elles contiennent ──────────────────────

  /* Les vedettes rangées sous un mot, ou sous tous les mots qui commencent
   * ainsi quand `prefixe` est vrai — c'est le mot qu'on est en train de
   * taper. */
  function expressionsPar(k, prefixe) {
    const index = etat.expressions;
    if (!index || !k) return [];
    const sortie = [];
    let numero = premiereLigne(index, k);
    while (numero < index.debuts.length) {
      const [mot, liste] = champs(index, numero);
      if (prefixe ? !mot.startsWith(k) : mot !== k) break;
      for (const v of liste.split('|')) sortie.push(v);
      if (!prefixe) break;
      numero += 1;
      if (sortie.length > 4000) break;
    }
    return sortie;
  }

  /* Les expressions qui contiennent tous les mots pleins de la saisie :
   * « pomme » → « tomber dans les pommes », « pomme de terre » ; « fumée
   * feu » → « il n'y a pas de fumée sans feu ». Le dernier mot est pris
   * comme un début, puisqu'on est peut-être en train de le taper. */
  function expressionsPour(saisie, plafond) {
    const morceaux = cle(saisie).split(/[\s'\-]+/).filter(Boolean);
    const pleins = [];
    morceaux.forEach((m, i) => {
      if (m.length < 2 || MOTS_OUTILS.has(m)) return;
      pleins.push({ k: m, dernier: i === morceaux.length - 1 });
    });
    if (!pleins.length) return [];
    let communs = null;
    for (const { k, dernier } of pleins) {
      // Un dernier mot trop court ratisserait des milliers d'expressions.
      const liste = expressionsPar(k, dernier && k.length >= 3);
      const ensemble = new Set(liste);
      if (communs === null) communs = Array.from(ensemble);
      else communs = communs.filter((v) => ensemble.has(v));
      if (!communs.length) return [];
    }
    const sortie = [];
    for (const v of communs) {
      const r = vedette(v);
      if (r) sortie.push(r);
      if (sortie.length >= (plafond || 200)) break;
    }
    return sortie;
  }

  // ── Les entrées ───────────────────────────────────────────────────────────

  /* Une tranche, en mémoire, avec au plus huit à la fois : une fiche en
   * consulte une, une séance de révision quelques-unes, et 600 entrées
   * décodées pèsent leur poids. */
  function tranche(numero) {
    if (etat.tranches.has(numero)) {
      const promesse = etat.tranches.get(numero);
      etat.tranches.delete(numero);
      etat.tranches.set(numero, promesse);
      return promesse;
    }
    const nom = 'data/dico/t-' + String(numero).padStart(3, '0') + '.json';
    const promesse = fetch(nom).then((reponse) => {
      if (!reponse.ok) {
        const erreur = new Error(nom + ' : ' + reponse.status);
        erreur.absente = true;
        throw erreur;
      }
      return reponse.json();
    }).then((contenu) => {
      if (etat.manifeste && contenu.format !== etat.manifeste.format) {
        throw new Error(nom + ' : format ' + contenu.format + ' inattendu');
      }
      return contenu.e;
    }).catch((erreur) => {
      etat.tranches.delete(numero);
      /* Une tranche que le réseau n'a pas pu donner, hors ligne : elle n'est
       * pas encore sur l'appareil. On le dit tel quel à la fiche. */
      if (erreur instanceof TypeError) erreur.absente = true;
      throw erreur;
    });
    etat.tranches.set(numero, promesse);
    while (etat.tranches.size > TRANCHES_EN_MEMOIRE) {
      etat.tranches.delete(etat.tranches.keys().next().value);
    }
    return promesse;
  }

  async function entree(mot) {
    const ligne = vedette(mot);
    if (!ligne) return null;
    const lot = await tranche(ligne.tranche);
    return lot.find((e) => e.m === mot) || null;
  }

  /* Une vedette au hasard, pour les suggestions de l'accueil. */
  function auHasard(filtre) {
    const index = etat.mots;
    if (!index) return null;
    for (let essai = 0; essai < 60; essai += 1) {
      const n = Math.floor(Math.random() * index.debuts.length);
      const r = ligneEnResultat(champs(index, n));
      if (!filtre || filtre(r)) return r;
    }
    return null;
  }

  function taille() {
    return etat.mots ? etat.mots.debuts.length : 0;
  }

  racine.Lexique = {
    cle, MOTS_OUTILS, etat, charger, chercher, vedette, resoudre, lemmes,
    expressionsPour, tranche, entree, auHasard, taille,
  };

})(window);

'use strict';
/*
 * Planches : les signes — ponctuation, typographie, musique, alphabet grec,
 * cartes à jouer, points cardinaux.
 *
 * Un signe se montre tel qu'il s'écrit, dans les caractères du dictionnaire.
 * Les dessins n'écrivent jamais le mot qu'ils illustrent : en indice d'une
 * question ou d'un fléché, ils le donneraient.
 */
(function () {

  /* Un signe, en grand, à l'encre de l'accent ; `contexte` l'entoure de
   * lettres discrètes : « l’arbre » montre où va l'apostrophe. */
  function signe(texte, corps, y) {
    return ['.ga T 50 ' + (y || 66) + ' ' + (corps || 58) + ' ' + texte];
  }
  function enContexte(avant, texte, apres, corps) {
    const c = corps || 30;
    return ['.gc T 50 62 ' + c + ' ' + avant + texte + apres];
  }

  // ── La portée ─────────────────────────────────────────────────────────────

  const LIGNES = [30, 38, 46, 54, 62];
  const PORTEE = '.d ' + LIGNES.map((y) => 'M6 ' + y + ' H94').join(' ');
  /* Une tête de note, penchée, centrée en (x, y). */
  function tete(x, y, pleine) {
    const d = 'M' + (x - 6) + ' ' + (y + 1.5) + ' C' + (x - 6) + ' ' + (y - 4) + ' ' + (x + 6) + ' ' + (y - 5.5) + ' ' + (x + 6) + ' ' + (y - 1.5)
      + ' C' + (x + 6) + ' ' + (y + 4) + ' ' + (x - 6) + ' ' + (y + 5.5) + ' ' + (x - 6) + ' ' + (y + 1.5) + ' Z';
    return (pleine ? '.fa ' : '.a.g ') + d;
  }
  function hampe(x, y) {
    return '.a.g M' + (x + 5.6) + ' ' + (y - 1.5) + ' V' + (y - 30);
  }
  function crochet(x, y) {
    return '.a.g M' + (x + 5.6) + ' ' + y + ' C' + (x + 8) + ' ' + (y + 6) + ' ' + (x + 16) + ' ' + (y + 8) + ' ' + (x + 13) + ' ' + (y + 18);
  }

  // ── Les cartes ───────────────────────────────────────────────────────────

  const CARTE = '.e #fdfcf8 R 20 8 60 84 6';
  const ROUGE = '#c8102e';
  const NOIR = '#1f1b1a';

  Illustrations.ajouter([

    {
      id: 'ponctuation', titre: 'Ponctuation et signes', groupe: 'Les signes', sujets: ['ponctuation', 'signe'],
      items: [
        { mot: 'point d’interrogation', sens: /phrase interrogative/, d: signe('?') },
        { mot: 'point d’exclamation', sens: /phrase exclamative/, d: signe('!') },
        { mot: 'point-virgule', sens: /virgule avec un point/, d: signe(';') },
        { mot: 'deux-points', sens: /deux points superposés/, d: signe(':') },
        { mot: 'points de suspension', sens: /trois points/, d: signe('…') },
        { mot: 'guillemet', sens: /Ponctuation de formes diverses/, d: signe('«  »', 50, 64) },
        { mot: 'parenthèse', sens: /Signes dont on se sert/, d: signe('(  )', 56, 68) },
        { mot: 'crochet', sens: /signes crochets/i, d: signe('[  ]', 56, 68) },
        { mot: 'tiret', sens: /Petit trait/, legende: 'dans un dialogue', d: enContexte('', '— Oui.', '', 30) },
        { mot: 'trait d’union', sens: /joindre deux mots/, d: enContexte('', 'arc-en-ciel', '', 22) },
        { mot: 'apostrophe', sens: /élision/, d: enContexte('', 'l’arbre', '', 30) },
        { mot: 'barre oblique', sens: /«\s?\/\s?»/, d: signe('/') },
        { mot: 'astérisque', sens: /forme d.étoile/, d: signe('*', 64, 78) },
        { mot: 'obèle', sens: /†/, d: signe('†  ‡', 46, 64) },
        { mot: 'esperluette', aussi: ['perluète'], sens: /Logogramme &/, d: signe('&') },
        { mot: 'arobase', sens: /Caractère @/, d: signe('@', 52, 66) },
        { mot: 'accent aigu', sens: /barre montante/, d: signe('é') },
        { mot: 'accent grave', sens: /barre descendante/, d: signe('è') },
        { mot: 'circonflexe', sens: /accent circonflexe/, court: 'accent', d: signe('ê') },
        { mot: 'tréma', sens: /deux points alignés/, d: signe('ë') },
        { mot: 'cédille', sens: /crochet vers la gauche/, d: signe('ç') },
        { mot: 'tilde', sens: /Caractère ~|ñ/, d: signe('ñ') },
      ],
    },

    {
      id: 'typographie', titre: 'Typographie', groupe: 'Les signes', sujets: ['typographie', 'caractère'],
      items: [
        { mot: 'italique', sens: /incliné vers la droite/, d: ['.gc.it T 50 62 34 Abc'] },
        { mot: 'gras', sens: /larges, épais/, d: ['.gc.gr T 50 62 34 Abc'] },
        { mot: 'majuscule', aussi: ['capitale'], sens: /caractère \(d.écriture et d.imprimerie\) plus grand|Lettre de grand format/, d: ['.ga T 40 70 52 A', '.gc T 68 70 34 a'] },
        { mot: 'bas de casse', aussi: ['minuscule'], sens: /lettre minuscule|Petite lettre comme a, b, c/, legende: 'la lettre minuscule', d: ['.gc T 34 70 52 A', '.ga T 66 70 52 a'] },
        { mot: 'petite capitale', sens: /aspect d.une capitale/, d: ['.gc T 32 66 40 A', '.ga T 64 66 27 BC'] },
        { mot: 'ligature', sens: /Lettres liées ensemble/, d: ['.ga T 50 68 52 œ'] },
        { mot: 'empattement', sens: /extrémités du jambage/, legende: 'les petits traits au bout des jambages',
          d: ['.f M44 20 H56 V80 H44 Z', '.fa M28 13 H72 V17 C64 17 58 18 56 21 H44 C42 18 36 17 28 17 Z', '.fa M28 87 H72 V83 C64 83 58 82 56 79 H44 C42 82 36 83 28 83 Z'] },
        { mot: 'interligne', sens: /Espace qui est entre deux lignes/, d: ['.fd R 12 22 76 6 3', '.fd R 12 52 70 6 3', '.fd R 12 82 54 6 3', '.a M90 30 V50 M86 30 H94 M86 50 H94', '.a M90 60 V80 M86 60 H94 M86 80 H94'] },
        { mot: 'exposant', sens: /degré d.une puissance/, d: ['.gc.it T 44 72 52 x', '.ga T 68 44 30 2'] },
      ],
    },

    {
      id: 'musique', titre: 'Notes et signes de musique', groupe: 'Les signes', sujets: ['solfège', 'note', 'musique'],
      items: [
        { mot: 'portée', sens: /cinq lignes parallèles/, d: ['.a ' + LIGNES.map((y) => 'M6 ' + y + ' H94').join(' ')] },
        { mot: 'ronde', sens: /note de 4 temps/, legende: 'quatre temps', d: [PORTEE, '.a.g M41 46 C41 39 59 39 59 46 C59 53 41 53 41 46 Z', '.a M46 43 L54 49'] },
        { mot: 'blanche', sens: /Figure de note/, legende: 'deux temps', d: [PORTEE, tete(46, 50, false), hampe(46, 50)] },
        { mot: 'noire', sens: /Figure de note/, legende: 'un temps', d: [PORTEE, tete(46, 50, true), hampe(46, 50)] },
        { mot: 'croche', sens: /Note de musique qui vaut/, legende: 'un demi-temps', d: [PORTEE, tete(42, 54, true), hampe(42, 54), crochet(42, 22.5)] },
        { mot: 'double-croche', sens: /deux crochets/, legende: 'un quart de temps', d: [PORTEE, tete(42, 54, true), hampe(42, 54), crochet(42, 22.5), crochet(42, 30.5)] },
        { mot: 'pause', sens: /Silence de la durée d.une mesure/, legende: 'silence d’une mesure', d: [PORTEE, '.fa R 40 38 20 5'] },
        { mot: 'demi-pause', sens: /Silence équivalant à la moitié d.une pause|troisième ligne/, legende: 'silence de deux temps', d: [PORTEE, '.fa R 40 41 20 5'] },
        { mot: 'soupir', sens: /silence équivalent à une noire/, legende: 'silence d’un temps', d: [PORTEE, '.fa M46 24 L56 36 C50 40 50 46 56 52 L54 54 C46 50 40 56 48 66 C38 60 38 50 48 50 L42 42 C48 38 48 32 44 26 Z'] },
        { mot: 'clé de sol', aussi: ['clef de sol'], sens: /sons aigus|position du sol/, d: [PORTEE, '.a.g M50 82 C44 85 41 78 46 76.5 C50 75.5 52 80 49 82.5 M49 82.5 C53 72 53 34 57 20 C59 12 65 12 64 20 C63 30 40 38 38 54 C37 64 46 68 54 64.5 C62 61 61 50 53.5 49.5 C46 49 44 57 49.5 60'] },
        { mot: 'clé de fa', aussi: ['clef de fa'], sens: /sons graves|position du fa/, d: [PORTEE, '.fa C 36 38.5 4', '.a.g M33 37 C32 30 42 28 48 30 C58 33 58 46 52 54 C47 61 38 66 30 70', '.fa C 64 34 2.4', '.fa C 64 42 2.4'] },
        { mot: 'dièse', sens: /deux doubles barres croisées/, legende: 'élève la note d’un demi-ton', d: [PORTEE, '.a.g M44 26 V70 M56 22 V66', '.a.ep M36 42 L64 36 M36 56 L64 50'] },
        { mot: 'bémol', sens: /Symbole graphique \(♭\)/, legende: 'baisse la note d’un demi-ton', d: [PORTEE, '.a.g M42 14 V62 C50 54 62 46 56 40 C52 36 46 40 42 46'] },
        { mot: 'bécarre', sens: /petit carré/, legende: 'annule le dièse ou le bémol', d: [PORTEE, '.a.g M44 22 V58 M56 34 V72', '.a.ep M44 46 L56 42 M44 58 L56 54'] },
        { mot: 'point d’orgue', sens: /point surmonté d.un demi-cercle/, legende: 'tenir la note à son gré', d: [PORTEE, tete(50, 50, true), hampe(50, 50), '.a.g M36 16 A14 12 0 0 1 64 16', '.fa C 50 13 2.4'] },
      ],
    },

    {
      id: 'grec', titre: 'Alphabet grec', groupe: 'Les signes', sujets: ['alphabet grec', 'grec'],
      sens: /lettre|alphabet grec/i,
      items: [
        ['alpha', 'Α α'], ['bêta', 'Β β'], ['gamma', 'Γ γ'], ['delta', 'Δ δ'], ['epsilon', 'Ε ε'], ['zêta', 'Ζ ζ'],
        ['êta', 'Η η'], ['thêta', 'Θ θ'], ['iota', 'Ι ι'], ['kappa', 'Κ κ'], ['lambda', 'Λ λ'], ['mu', 'Μ μ'],
        ['nu', 'Ν ν'], ['xi', 'Ξ ξ'], ['omicron', 'Ο ο'], ['pi', 'Π π'], ['rhô', 'Ρ ρ'], ['sigma', 'Σ σ'],
        ['tau', 'Τ τ'], ['upsilon', 'Υ υ'], ['phi', 'Φ φ'], ['khi', 'Χ χ'], ['psi', 'Ψ ψ'], ['oméga', 'Ω ω'],
      ].map(([mot, lettres]) => ({ mot, d: signe(lettres, 46, 64) })),
    },

    {
      id: 'cartes', titre: 'Couleurs des cartes', groupe: 'Les signes', sujets: ['carte à jouer'],
      sens: /enseignes/,
      note: 'Le dictionnaire ne donne pas à « carreau » son sens de carte à jouer : la case mène à ses autres sens.',
      items: [
        { mot: 'pique', d: [CARTE, NOIR + ' M50 22 C58 34 72 40 72 54 C72 62 66 66 59 65 C55 64.5 53 62 52 58 C52.5 65 54 70 58 74 H42 C46 70 47.5 65 48 58 C47 62 45 64.5 41 65 C34 66 28 62 28 54 C28 40 42 34 50 22 Z'] },
        { mot: 'cœur', d: [CARTE, ROUGE + ' M50 74 C36 62 26 54 26 42 C26 33 33 28 39 29 C44 30 48 34 50 38 C52 34 56 30 61 29 C67 28 74 33 74 42 C74 54 64 62 50 74 Z'] },
        { mot: 'carreau', sens: false, d: [CARTE, ROUGE + ' M50 22 C55 34 62 42 70 50 C62 58 55 66 50 78 C45 66 38 58 30 50 C38 42 45 34 50 22 Z'] },
        { mot: 'trèfle', d: [CARTE, NOIR + ' C 50 35 9', NOIR + ' C 39 52 9', NOIR + ' C 61 52 9', NOIR + ' M47 50 C47 62 45 68 41 74 H59 C55 68 53 62 53 50 Z'] },
      ],
    },

    {
      id: 'rose', titre: 'La rose des vents', groupe: 'Les signes', sujets: ['rose des vents', 'point cardinal'], schema: true, boite: '-4 -6 128 132',
      d: [
        '.ft.d M60 8 L67 53 L112 60 L67 67 L60 112 L53 67 L8 60 L53 53 Z',
        '.d M60 8 L60 112 M8 60 L112 60',
        '.d M60 60 L84 36 L66 54 Z M60 60 L84 84 L66 66 Z M60 60 L36 84 L54 66 Z M60 60 L36 36 L54 54 Z',
        '.d M84 36 L66 54 M84 84 L66 66 M36 84 L54 66 M36 36 L54 54',
        '.f C 60 60 2',
        '.gc.s T 60 6 9 N', '.gc.s T 60 121 9 S', '.gc.s T 117 63 9 E', '.gc.s T 3 63 9 O',
      ],
      sens: /point cardinal|points cardinaux|Point de l.horizon|direction/i,
      items: [
        { mot: 'nord', x: 60, y: 12, lx: 76, ly: 10 },
        { mot: 'nord-est', x: 82, y: 38, lx: 100, ly: 22 },
        { mot: 'est', x: 108, y: 60, lx: 108, ly: 76 },
        { mot: 'sud-est', x: 82, y: 82, lx: 100, ly: 98 },
        { mot: 'sud', x: 60, y: 108, lx: 76, ly: 112 },
        { mot: 'sud-ouest', x: 38, y: 82, lx: 20, ly: 98 },
        { mot: 'ouest', x: 12, y: 60, lx: 12, ly: 76 },
        { mot: 'nord-ouest', x: 38, y: 38, lx: 20, ly: 22 },
      ],
    },

  ]);

})();

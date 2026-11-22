'use strict';
/*
 * Planches : les couleurs, et les robes du cheval.
 *
 * Quand le Wiktionnaire donne la couleur en hexadécimal — « Couleur rouge
 * vif tirant sur l’orangé. — #E34234 » —, c'est elle qui est peinte : la
 * pastille dit ce que dit la définition. Les couleurs ne changent pas avec
 * le thème sombre : le céladon reste céladon.
 */
(function () {

  /* Le sens « couleur » d'un mot de couleur : « Couleur rouge vif… »,
   * « D’une couleur… », « De la couleur… », ou une définition qui donne le
   * code de la couleur. « Drupe… de couleur verdâtre » n'en est pas un. */
  const COULEUR = /^(?:(?:D’une|D'une|De la|De l’|De|Qui est de la|Qui est de|Qui est d’une|Qui a la|Cette|La|Une)\s)?(?:couleur|teinte|nuance)|#[0-9A-Fa-f]{6}/i;

  function pastille(hex) {
    return ['.e ' + hex + ' R 14 14 72 72 10'];
  }
  function teintes(liste) {
    return liste.map(([mot, hex, sens]) => {
      const item = { mot, d: pastille(hex), court: hex.toUpperCase() };
      if (sens) item.sens = sens;
      return item;
    });
  }

  // ── Le cheval ─────────────────────────────────────────────────────────────

  const TETE = 'M18 97 C20 74 25 52 35 36 L37 17 L43.5 29 C48 27.5 53 28 57 30.5 C67 37 77 50 85 61.5 C89 68 88.5 76 82.5 78.5 C78 80.5 72 79.5 68.5 76.5 C64 79 58 79 54 76 C53 83 55.5 91 59 97 Z';
  const CACHE_TETE = '.m M-120 -120 H220 V220 H-120 Z ' + TETE;
  const DETAILS = ['.cheval-trait C 55 42 2', '.cheval-trait M78.5 64 C80 62.5 82 63 82.5 65', '.cheval-trait M68.5 76.5 C70 70 66 62 58 60'];

  function cheval(robe, crins, extra) {
    return ['.sn ' + robe + ' ' + TETE].concat(extra || [], [CACHE_TETE],
      ['.sn ' + (crins || robe) + ' M35 36 C27 52 23 72 21 93 L13 89 C17 70 22 50 31 35 C32 30 34 26 36 22 Z'],
      ['.e M18 97 C20 74 25 52 35 36 L37 17 L43.5 29 C48 27.5 53 28 57 30.5 C67 37 77 50 85 61.5 C89 68 88.5 76 82.5 78.5 C78 80.5 72 79.5 68.5 76.5 C64 79 58 79 54 76 C53 83 55.5 91 59 97'], DETAILS);
  }
  function taches(couleur, liste) {
    return liste.map(([x, y, rx, ry]) => '.sn ' + couleur + ' E ' + x + ' ' + y + ' ' + rx + ' ' + ry);
  }

  Illustrations.ajouter([

    {
      id: 'rouges', titre: 'Rouges et roses', groupe: 'Les couleurs', sujets: ['couleur', 'rouge', 'rose'],
      sens: COULEUR,
      items: teintes([
        ['écarlate', '#ED0000'], ['vermillon', '#E34234'], ['garance', '#EE1010'], ['vermeil', '#FF0921'],
        ['cerise', '#BB0B0B'], ['carmin', '#960018'], ['cramoisi', '#DC143C'], ['framboise', '#C72C48'],
        ['grenat', '#6E0B14'], ['bordeaux', '#6D071A'], ['amarante', '#91283B'], ['lie-de-vin', '#AC1E44'],
        ['rubis', '#6F2F40'], ['pourpre', '#9E0E40'], ['incarnat', '#FF6F7D'], ['corail', '#E73E01'],
        ['saumon', '#F88E55'], ['fuchsia', '#FD3F92'], ['magenta', '#ED0FED'],
      ]),
    },

    {
      id: 'bleus', titre: 'Bleus', groupe: 'Les couleurs', sujets: ['couleur', 'bleu'],
      sens: COULEUR,
      items: teintes([
        ['bleu ciel', '#77B5FE'], ['azur', '#007FFF'], ['céruléen', '#02A4D3'], ['pervenche', '#CCCCFF'],
        ['turquoise', '#25FDE9'], ['cyan', '#2BFAFA'], ['bleu canard', '#008080'], ['bleu pétrole', '#1D4851'],
        ['bleu roi', '#318CE7'], ['cobalt', '#0047AB', /Bleu de cobalt|Pigment bleu/], ['outremer', '#2B009A'],
        ['indigo', '#791CF8'], ['bleu marine', '#000080'], ['bleu nuit', '#191970'],
      ]),
    },

    {
      id: 'verts', titre: 'Verts', groupe: 'Les couleurs', sujets: ['couleur', 'vert'],
      sens: COULEUR,
      items: teintes([
        ['vert d’eau', '#D5EDDE'], ['céladon', '#83A697'], ['jade', '#87E990'], ['pistache', '#BEF574'],
        ['vert pomme', '#34C924'], ['émeraude', '#21A56E'], ['glauque', '#649B88'], ['vert-de-gris', '#95A595'],
        ['olive', '#708D23'], ['kaki', '#798933'], ['vert bouteille', '#096A09'], ['sapin', '#095228'],
      ]),
    },

    {
      id: 'jaunes', titre: 'Jaunes et orangés', groupe: 'Les couleurs', sujets: ['couleur', 'jaune', 'orange'],
      sens: COULEUR,
      items: teintes([
        ['citron', '#F7FF3C'], ['jonquille', '#FCDC12'], ['safran', '#F3D617'], ['moutarde', '#DBC640'],
        ['ambre', '#F0C300'], ['ocre', '#CC7722'], ['abricot', '#E67E30'], ['mandarine', '#FEA347'],
        ['fauve', '#AD4F09'], ['roux', '#AD4F09'], ['auburn', '#9D3E0C'],
      ]),
    },

    {
      id: 'bruns', titre: 'Bruns', groupe: 'Les couleurs', sujets: ['couleur', 'brun', 'marron'],
      sens: COULEUR,
      items: teintes([
        ['beige', '#F5F5DC'], ['sépia', '#A98C78'], ['havane', '#7C5C3B'], ['caramel', '#B67233'],
        ['châtain', '#8B6C42'], ['tabac', '#9F551E'], ['mordoré', '#87591A'], ['acajou', '#88421D'],
        ['chocolat', '#5A3A22'], ['bistre', '#3D2B1F'],
      ]),
    },

    {
      id: 'violets', titre: 'Violets', groupe: 'Les couleurs', sujets: ['couleur', 'violet'],
      sens: COULEUR,
      items: teintes([
        ['parme', '#CFA0E9'], ['lavande', '#9683EC'], ['mauve', '#D473D4'], ['lilas', '#B666D2'],
        ['améthyste', '#884DA7'], ['violet', '#7F00FF'], ['violine', '#A10684'], ['prune', '#811453'],
        ['zinzolin', '#6C0277'],
      ]),
    },

    {
      id: 'blancs', titre: 'Blancs, gris et noirs', groupe: 'Les couleurs', sujets: ['couleur', 'blanc', 'gris', 'noir'],
      sens: COULEUR,
      items: teintes([
        ['albâtre', '#FEFEFE'], ['blanc cassé', '#FEFEE2'], ['ivoire', '#FFFFD4'], ['écru', '#FEFEE0'],
        ['crème', '#FDF1B8'], ['platine', '#FAF0C5'], ['gris perle', '#CECECE', /Gris clair/], ['gris souris', '#9E9E9E', /nuance de gris/],
        ['cendré', '#A9A9A9'], ['ardoise', '#5A5E6B'], ['taupe', '#463F32'], ['anthracite', '#303030'],
        ['ébène', '#000000'], ['jais', '#000000'],
      ]),
    },

    {
      id: 'robes', titre: 'Robes du cheval', groupe: 'Les couleurs', sujets: ['cheval', 'robe'],
      sens: /robe|cheval|poil/i,
      items: [
        { mot: 'alezan', legende: 'fauve tirant sur le roux, crins de même', d: cheval('#A76726', '#8A4E17') },
        { mot: 'bai', sens: /brun rouge/, legende: 'brun-roux, crins et extrémités noirs', d: cheval('#8B4A22', '#1d1715') },
        { mot: 'isabelle', legende: 'jaune clair, crins noirs', d: cheval('#D8B66E', '#1d1715') },
        { mot: 'aubère', legende: 'fleur de pêcher, entre blanc et alezan', d: cheval('#D7A08A', '#C98E78') },
        { mot: 'rouan', legende: 'poils blancs, gris et bais mêlés', d: cheval('#9C7366', '#4a2c22', taches('#e8e0dc', [[46, 50, 1.2, 1.2], [58, 46, 1, 1], [52, 58, 1.2, 1.2], [64, 54, 1, 1], [40, 64, 1.2, 1.2], [70, 64, 1, 1], [46, 72, 1, 1], [36, 80, 1.2, 1.2], [44, 86, 1, 1], [60, 66, 1.2, 1.2]])) },
        { mot: 'louvet', legende: 'couleur du loup', d: cheval('#8A7D6B', '#3e352c') },
        { mot: 'souris', aussi: ['gris souris'], sens: /robe des chevaux|robe de cheval/, legende: 'gris uni, crins noirs', d: cheval('#8E8E8E', '#1d1715') },
        { mot: 'pommelé', legende: 'gris, semé de taches rondes', d: cheval('#B9B9B9', '#6a6a6a', taches('#8a8a8a', [[44, 52, 4, 3.5], [56, 50, 3, 3], [36, 66, 4, 4], [48, 64, 3.5, 3], [30, 82, 4, 4], [42, 80, 3.5, 3.5], [54, 88, 3, 3], [62, 60, 3, 2.5]])) },
        { mot: 'pie', legende: 'grandes taches blanches et noires', d: cheval('#f4f1ea', '#1d1715', taches('#1d1715', [[40, 46, 9, 12], [30, 80, 12, 14], [64, 52, 6, 5]])) },
        { mot: 'moreau', legende: 'noir vif et luisant', d: cheval('#1d1715', '#0d0b0a').concat(['.cheval-reflet M48 34 C56 36 64 42 70 50']) },
      ],
    },

  ]);

})();

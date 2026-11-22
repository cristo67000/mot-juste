'use strict';
/*
 * Planches : le corps, la coiffure, le vêtement.
 *
 * Les têtes sont dessinées une fois — de profil pour les nez, de face pour
 * les barbes, les coiffures et les chapeaux — en trait discret ; ce que le
 * mot nomme est à l'encre de l'accent. Voir js/illustrations.js pour la
 * syntaxe des dessins.
 */
(function () {

  // ── Têtes ─────────────────────────────────────────────────────────────────

  /* De profil, tournée vers la droite. Le nez va de l'arcade (68,30) à la
   * base (66,57) ; chaque forme de nez le trace à sa manière. */
  const PROFIL = [
    '.fd.d.n M50 8 C34 8 22 20 22 38 C26 29 35 22 48 21 C56 20.5 62 22 66 25 C65 15 58 8 50 8 Z',
    '.d M50 8 C34 8 22 20 22 38 C22 50 26 58 30 66 L30 96',
    '.d M41 42 C35.5 41 34.5 52 40 54',
    '.d M56 34.5 Q60 32.5 65 34',
    '.d M57 41 Q60 38.6 63 40.6 Q60 43 57 41 Z',
    '.f C 60.6 40.8 1.2',
    '.d M66 57 C68 58 70 60 70 62 C69 63 67 64 66 64.5 C67 65.5 69 66.5 69 69 C69 72 66 73 65 74 C67 77 68 80 66 83 C63 86 57 87 52 86 C48 85.5 45 84 43 81',
    '.d M56 86.5 C56 90 57 94 58 98',
  ];
  const FRONT = '.d M50 8 C60 8 67 15 68 26 L68 30';
  const RACINE_DU_NEZ = 'M68 30 Q67 34 65 36 ';

  function profil(nez, front) {
    return PROFIL.concat([front || FRONT, '.a ' + nez]);
  }

  /* De face. Le visage va du haut du front (32) au menton (88). */
  const VISAGE = '.d M30 56 C30 40 38 32 50 32 C62 32 70 40 70 56 C70 74 61 88 50 88 C39 88 30 74 30 56 Z';
  const OREILLES = ['.d M30.5 54 C25 52 25 64 31.5 65', '.d M69.5 54 C75 52 75 64 68.5 65'];
  const YEUX = ['.f C 42.5 56 1.6', '.f C 57.5 56 1.6'];
  const SOURCILS = ['.d M38 51 Q42.5 48.5 47 51', '.d M53 51 Q57.5 48.5 62 51'];
  const NEZ = '.d M50 57 C49 62 47 65 48 67 Q50 68 52 67';
  const BOUCHE = '.d M44 75.5 Q50 78 56 75.5';
  const COU = ['.d M42 85 L41 98', '.d M58 85 L59 98'];
  const CHEVEUX_COURTS = '.fd.d.n M30 54 C29 38 38 30 50 30 C62 30 71 38 70 54 C68 44 61 39.5 50 39.5 C39 39.5 32 44 30 54 Z';

  function face(options) {
    const o = options || {};
    return [VISAGE, OREILLES, YEUX, o.sourcils === false ? null : SOURCILS, NEZ,
      o.bouche === false ? null : BOUCHE, COU, o.cheveux === false ? null : CHEVEUX_COURTS];
  }

  // ── Silhouettes ──────────────────────────────────────────────────────────

  /* Un bonhomme : tête, et des segments de membres. */
  function bonhomme(tete, segments, sol) {
    const d = ['.d M6 ' + (sol || 86) + ' L94 ' + (sol || 86)];
    d.push('.a C ' + tete.join(' ') + ' 6.5');
    for (const s of segments) d.push('.a.g M' + s);
    return d;
  }

  /* Le buste, du menton aux épaules, pour les cols. */
  const BUSTE = [
    '.d M42 2 L42 22 M58 2 L58 22',
    '.d M42 26 C30 28 14 32 8 44 L6 98 M58 26 C70 28 86 32 92 44 L94 98',
  ];

  /* Des plis en rayons, pour la fraise. */
  function plis(cx, cy, rx, ry, n) {
    let d = '';
    for (let i = 0; i < n; i += 1) {
      const a = (i / n) * 2 * Math.PI;
      const b = ((i + 0.5) / n) * 2 * Math.PI;
      const x1 = cx + rx * Math.cos(a), y1 = cy + ry * Math.sin(a);
      const x2 = cx + rx * 0.82 * Math.cos(b), y2 = cy + ry * 0.82 * Math.sin(b);
      d += (i ? 'L' : 'M') + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' L' + x2.toFixed(1) + ' ' + y2.toFixed(1) + ' ';
    }
    return d + 'Z';
  }

  // ── Les planches ─────────────────────────────────────────────────────────

  Illustrations.ajouter([

    {
      id: 'nez', titre: 'Formes du nez', groupe: 'Le corps', sujets: ['nez'],
      sens: /nez/i,
      items: [
        { mot: 'aquilin', legende: 'fin et courbé en bec d’aigle',
          d: profil(RACINE_DU_NEZ + 'C74 38 80 46 78.5 54.5 Q74 58 66 57') },
        { mot: 'busqué', legende: 'bombé au milieu de l’arête', sens: /bombé/,
          d: profil(RACINE_DU_NEZ + 'C68 39 72 40 73 44 C74 48 77.5 51 78 54 Q74 58 66 57') },
        { mot: 'bourbonien', legende: 'long et arqué, la pointe tombante',
          d: profil(RACINE_DU_NEZ + 'C77 39 84 49 82.5 58 Q80.5 63 74 61 Q70 59 66 57') },
        { mot: 'crochu', legende: 'recourbé en crochet', sens: /courbé en crochet/,
          d: profil(RACINE_DU_NEZ + 'C75 38 82 46 81 54 Q80 61.5 74.5 62.5 Q71 60 66 57') },
        { mot: 'nez grec', legende: 'dans le prolongement du front',
          d: profil('M67.4 22 L80 54 Q76 57.5 66 57', '.d M50 8 C59 8 65.5 13.5 67.4 22') },
        { mot: 'retroussé', legende: 'le bout relevé',
          d: profil(RACINE_DU_NEZ + 'C67 44 70 50 76.5 50 Q78.5 53 74.5 55.5 Q70 57 66 57') },
        { mot: 'nez en trompette', legende: 'petit et très retroussé',
          d: profil(RACINE_DU_NEZ + 'C66 41 68 45.5 74 44.5 Q77 47.5 73 53 Q69 56 66 57') },
        { mot: 'camus', legende: 'court et aplati',
          d: profil('M68 30 Q66 36 62.5 38.5 C64.5 46 67.5 51 71 53 Q71.5 57 66 57') },
        { mot: 'épaté', legende: 'aplati, les ailes larges', sens: /aplati/,
          d: profil(RACINE_DU_NEZ + 'C66 42 68 47 71 50.5 C77 51 78 57.5 72.5 58.5 Q68 58.5 66 57', null).concat(['.a M70.5 57 C67 56 66 52.5 69.5 50.5']) },
      ],
    },

    {
      id: 'barbes', titre: 'Barbes et moustaches', groupe: 'Le corps', sujets: ['barbe'],
      items: [
        { mot: 'barbe', sens: /poils recouvrant le menton/,
          d: [face({ bouche: false }), '.fa M31 60 C32 80 40 97 50 97 C60 97 68 80 69 60 C67 68 62 72 56 71 C53 70 47 70 44 71 C38 72 33 68 31 60 Z',
            '.fa M42.5 72 C45 69 49 69.5 50 71 C51 69.5 55 69 57.5 72 C55 74 45 74 42.5 72 Z', '.p M45 77.5 Q50 79.5 55 77.5'] },
        { mot: 'bouc', sens: /Barbe d.un homme/, legende: 'la barbe sous le menton seulement',
          d: [face(), '.fa M42 80 C41.5 89 45.5 96.5 50 96.5 C54.5 96.5 58.5 89 58 80 C55 82.5 45 82.5 42 80 Z'] },
        { mot: 'barbiche', sens: /touffe de poils/, legende: 'une touffe au menton',
          d: [face(), '.fa M45.5 85 C46 90.5 48 95 50 98 C52 95 54 90.5 54.5 85 C52 86.5 48 86.5 45.5 85 Z'] },
        { mot: 'impériale', sens: /Barbe à l.impériale/, legende: 'touffe sous la lèvre, moustache relevée',
          d: [face(), '.fa M50 71.5 C46 69.5 41 71.5 38 67.5 C39.5 73 46 74.5 50 73 C54 74.5 60.5 73 62 67.5 C59 71.5 54 69.5 50 71.5 Z',
            '.fa M47 79.5 C48 85 49 91 50 96 C51 91 52 85 53 79.5 Q50 81.5 47 79.5 Z'] },
        { mot: 'favoris', aussi: ['favori', 'rouflaquette'], sens: /Touffes de barbe|qui poussent sur les joues|descendant sur les joues/,
          legende: 'de chaque côté du visage, le menton rasé',
          d: [face(), '.fa M30.5 49 L35.5 48.5 C35.5 58 37.5 66.5 41.5 75 C36 74.5 32 66 31 58 Z', '.fa M69.5 49 L64.5 48.5 C64.5 58 62.5 66.5 58.5 75 C64 74.5 68 66 69 58 Z'] },
        { mot: 'collier', sens: /Barbe allant d.une tempe/, legende: 'd’une tempe à l’autre par le menton',
          d: [face(), '.fa M30.5 53 L34 53 C34 72 41 84.5 50 84.5 C59 84.5 66 72 66 53 L69.5 53 C70 75 62 92.5 50 92.5 C38 92.5 30 75 30.5 53 Z'] },
        { mot: 'moustache', sens: /au-dessus de la lèvre supérieure/,
          d: [face(), '.fa M41.5 72.5 C44.5 68.5 49 69 50 70.8 C51 69 55.5 68.5 58.5 72.5 C55.5 74 52 73.5 50 72.6 C48 73.5 44.5 74 41.5 72.5 Z'] },
        { mot: 'moustache en guidon', sens: /recourbée/,
          d: [face(), '.a.g M50 71 C45.5 68.5 41 72.5 36.5 69.5 C33.5 67.5 34.5 63.5 37.5 64.5', '.a.g M50 71 C54.5 68.5 59 72.5 63.5 69.5 C66.5 67.5 65.5 63.5 62.5 64.5'] },
        { mot: 'mouche', sens: /sous la lèvre inférieure/, legende: 'une petite touffe sous la lèvre',
          d: [face(), '.fa M47.8 78.6 L52.2 78.6 L50 84 Z'] },
      ],
    },

    {
      id: 'coiffures', titre: 'Coiffures', groupe: 'Le corps', sujets: ['coiffure'],
      sens: /cheveu|coiffure|chevelure/i,
      items: [
        { mot: 'chignon', sens: /cheveux relevés/, legende: 'les cheveux relevés et noués derrière la tête',
          d: [PROFIL.slice(1), FRONT, '.d ' + RACINE_DU_NEZ + 'C70 44 74 50 76 54 Q73 57 66 57',
            '.a.ft M50 8 C34 8 22 20 22 38 C24 31 30 25 38 22 C46 19 58 19.5 66 25 C65 15 58 8 50 8 Z', '.a.ft C 19 31 9', '.a M15 27 C19 30 21 34 22 39'] },
        { mot: 'catogan', sens: /cheveux longs sur la nuque|chevelure ainsi/, legende: 'les cheveux noués sur la nuque',
          d: [PROFIL.slice(1), FRONT, '.d ' + RACINE_DU_NEZ + 'C70 44 74 50 76 54 Q73 57 66 57',
            '.a.ft M50 8 C34 8 22 20 22 38 C22 46 25 52 28 56 C30 44 32 34 40 26 C48 20 58 20 66 25 C65 15 58 8 50 8 Z',
            '.a.ft M28 55 C23 63 21 73 24 86 C28 78 30 68 32 58 Z', '.f M28.5 56 L19 51 L20.5 60 Z', '.f M28.5 56 L37 52 L36 61 Z'] },
        { mot: 'natte', aussi: ['tresse'], sens: /Cheveux tressés|mèche de cheveux tressée/, legende: 'vue de dos',
          d: ['.d E 50 36 21 24', '.d M29.5 38 C25 37 25 46 30 47', '.d M70.5 38 C75 37 75 46 70 47', '.d M40 58 L39 70 M60 58 L61 70',
            '.a.ft M29 38 C28 22 38 12 50 12 C62 12 72 22 71 38 C70 48 62 56 55 58 L45 58 C38 56 30 48 29 38 Z', '.a M50 13 L50 40',
            '.a.ft M45 57 L50 64 L55 57 Z', '.a.ft M45 64 L50 71 L55 64 L50 66 Z', '.a.ft M45 71 L50 78 L55 71 L50 73 Z', '.a.ft M45.5 78 L50 85 L54.5 78 L50 80 Z',
            '.f R 47 85 6 3 1', '.a M50 88 L47 95 M50 88 L50 96 M50 88 L53 95'] },
        { mot: 'couette', sens: /Touffe de cheveux réuni/, legende: 'une touffe liée de chaque côté',
          d: [face({ cheveux: false }), '.a.ft M30 54 C29 38 38 30 50 30 C62 30 71 38 70 54 C68 44 61 40 50 40 C39 40 32 44 30 54 Z', '.a M50 30.5 L50 39.5',
            '.a.ft M30 47 C19 47 12 58 14 74 C18 68 21 62 27 57 Z', '.a.ft M70 47 C81 47 88 58 86 74 C82 68 79 62 73 57 Z', '.f C 29 50 2.4', '.f C 71 50 2.4'] },
        { mot: 'queue-de-cheval', aussi: ['queue de cheval'], sens: /cheveux sont rassemblés/, legende: 'les cheveux attachés haut derrière la tête',
          d: [PROFIL.slice(1), FRONT, '.d ' + RACINE_DU_NEZ + 'C70 44 74 50 76 54 Q73 57 66 57',
            '.a.ft M50 8 C34 8 22 20 22 38 C24 31 30 25 38 22 C46 19 58 19.5 66 25 C65 15 58 8 50 8 Z',
            '.a.ft M27 19 C15 20 8 36 9 64 C14 52 18 40 27 30 Z', '.f M25 16 L30 22 L26 25 L21 19 Z'] },
        { mot: 'frange', sens: /Cheveux retombant sur le front/,
          d: [face({ cheveux: false, sourcils: false }), '.a.ft M29 58 C28 38 38 30 50 30 C62 30 72 38 71 58 L68 58 L68 47.5 L32 47.5 L32 58 Z',
            '.a M38 38 L37 47 M44 37 L43.5 47 M50 36.5 L50 47 M56 37 L56.5 47 M62 38 L63 47'] },
        { mot: 'raie', sens: /Séparation de cheveux/, legende: 'la séparation des cheveux',
          d: [face({ cheveux: false }), '.a.ft M29 58 C27 38 36 29.5 44 29.5 L44.5 38 C38 39.5 32 46 32 58 Z', '.a.ft M44 29.5 C60 28.5 73 36 71 58 L68 58 C67 46 60 40 44.5 38 Z',
            '.a.g M44 29 L44.5 38.5'] },
        { mot: 'toupet', aussi: ['houppe'], sens: /touffe de cheveux/i, legende: 'une touffe dressée au-dessus du front',
          d: [face({ cheveux: false }), '.a.ft M30 54 C29 38 38 31 47 31 C42 22 50 13 62 16 C56 18 54 22 57 31 C66 33 71 41 70 54 C68 44 61 39.5 50 39.5 C39 39.5 32 44 30 54 Z'] },
        { mot: 'accroche-cœur', aussi: ['rouflaquette'], sens: /mèche de cheveux/i, legende: 'une boucle plaquée sur la tempe',
          d: [face(), '.a.g M39 41 C29 41 27 53 33.5 55 C38.5 56.5 40 50 35.5 49'] },
        { mot: 'coupe au bol', sens: /Coiffure/,
          d: [face({ cheveux: false, sourcils: false }), '.a.ft M26 66 C23 40 35 28.5 50 28.5 C65 28.5 77 40 74 66 L68.5 66 L68.5 48.5 L31.5 48.5 L31.5 66 Z'] },
        { mot: 'afro', sens: /coupe de cheveux|coiffure/i,
          d: [face({ cheveux: false }), '.a.ft M50 8 C64 6 74 12 80 20 C88 26 92 38 88 50 C92 60 86 70 76 70 C72 70 70.5 66 70.5 58 C70 46 62 40 50 40 C38 40 30 46 29.5 58 C29.5 66 28 70 24 70 C14 70 8 60 12 50 C8 38 12 26 20 20 C26 12 36 6 50 8 Z'] },
        { mot: 'mulet', sens: /nuque longue/, legende: 'court dessus, long dans la nuque',
          d: [PROFIL.slice(1), FRONT, '.d ' + RACINE_DU_NEZ + 'C70 44 74 50 76 54 Q73 57 66 57',
            '.a.ft M50 8 C34 8 22 20 22 38 C22 52 25 64 20 80 C27 75 31 67 33 58 C34 40 42 23 66 25 C65 15 58 8 50 8 Z'] },
        { mot: 'tonsure', sens: /Couronne/, legende: 'le sommet du crâne rasé',
          d: [face({ cheveux: false }), '.a.ft M30 54 C29 38 38 29 50 29 C62 29 71 38 70 54 C68 46 62 42.5 50 42.5 C38 42.5 32 46 30 54 Z', '.fp.a E 50 33 14 5.5'] },
        { mot: 'dreadlocks', sens: /mèches de cheveux emmêlées/,
          d: [face({ cheveux: false }), '.a.ft M30 54 C29 38 38 30 50 30 C62 30 71 38 70 54 C68 44 61 40 50 40 C39 40 32 44 30 54 Z',
            '.a.g M31 50 C27 60 29 70 26 82 M35 44 C33 56 34 62 31 72 M65 44 C67 56 66 62 69 72 M69 50 C73 60 71 70 74 82 M40 41 C38 46 38 50 37 54 M60 41 C62 46 62 50 63 54'] },
      ],
    },

    {
      id: 'visage', titre: 'Le visage', groupe: 'Le corps', sujets: ['visage'], schema: true, boite: '0 0 130 110',
      d: [
        '.d M45 50 C45 28 55 16 65 16 C75 16 85 28 85 50 C85 74 76 96 65 96 C54 96 45 74 45 50 Z',
        '.fd.d.n M45 46 C44 26 54 13 65 13 C76 13 86 26 85 46 C82 32 76 26 65 26 C54 26 48 32 45 46 Z',
        '.d M45.5 50 C39 47 38.5 62 46 63.5', '.d M84.5 50 C91 47 91.5 62 84 63.5',
        '.d M52 44 Q57 41 62 44', '.d M68 44 Q73 41 78 44', '.f C 57 50 1.7', '.f C 73 50 1.7',
        '.d M53 50 Q57 47 61 50 Q57 53 53 50 M69 50 Q73 47 77 50 Q73 53 69 50',
        '.d M65 51 C64 58 62 63 62 66 C63 68 67 68 68 66', '.d M61 66 Q60 68 62 68.5 M69 66 Q70 68 68 68.5',
        '.d M57 78 Q61 75.5 65 76.5 Q69 75.5 73 78 Q65 83.5 57 78 Z', '.d M57 78 Q65 79.5 73 78',
        '.d M52 92 L51 108 M78 92 L79 108',
      ],
      sens: /./,
      items: [
        { mot: 'front', sens: /Partie du visage qui est comprise/, x: 62, y: 33, lx: 26, ly: 20 },
        { mot: 'tempe', sens: /Partie latérale de la tête/, x: 47, y: 42, lx: 20, ly: 38 },
        { mot: 'pommette', sens: /saillante de la joue/, x: 77, y: 60, lx: 106, ly: 54 },
        { mot: 'joue', sens: /Partie du visage de l.humain/, x: 53, y: 68, lx: 22, ly: 70 },
        { mot: 'narine', sens: /ouvertures du nez/, x: 68.5, y: 67, lx: 106, ly: 70 },
        { mot: 'lèvre', sens: /borde la bouche/, x: 70, y: 80, lx: 106, ly: 86 },
        { mot: 'menton', sens: /Partie inférieure de la face/, x: 65, y: 91, lx: 30, ly: 98 },
        { mot: 'lobe', sens: /pavillon de l.oreille/, x: 86, y: 62.5, lx: 106, ly: 36 },
      ],
    },

    {
      id: 'oeil', titre: 'L’œil', groupe: 'Le corps', sujets: ['œil'], schema: true, boite: '0 0 130 80',
      d: [
        '.a.ft C 65 43 14', '.f C 65 43 5.5', '.fp C 61.8 40 2',
        '.m M-10 -10 H140 V90 H-10 Z M28 44 C42 26 88 26 102 44 C88 60 42 60 28 44 Z',
        '.d M28 44 C42 26 88 26 102 44 C88 60 42 60 28 44 Z',
        '.d M30 46 C44 57 86 57 100 46',
        '.d M36 36 L32.5 31 M44 31.5 L42 25.5 M54 29 L53 22.5 M65 28.3 L65 21.5 M76 29 L77 22.5 M86 31.5 L88 25.5 M94 36 L97.5 31',
        '.fd.d.n M24 19 C42 7 88 7 106 17 C104 13.5 84 4 65 4 C46 4 30 11 24 19 Z',
      ],
      sens: /./,
      items: [
        { mot: 'sourcil', sens: /Saillie en forme d.arc/, x: 46, y: 11, lx: 14, ly: 10 },
        { mot: 'paupière', sens: /membranes mobiles/, x: 40, y: 34, lx: 12, ly: 30 },
        { mot: 'cil', sens: /Poil des paupières/, x: 86.5, y: 27, lx: 118, ly: 20 },
        { mot: 'iris', sens: /Partie colorée de l.œil/, x: 75, y: 50, lx: 118, ly: 56 },
        { mot: 'pupille', sens: /Trou situé au milieu de l.iris/, x: 66.5, y: 45.5, lx: 96, ly: 72 },
      ],
    },

    {
      id: 'main', titre: 'La main', groupe: 'Le corps', sujets: ['main'], schema: true, boite: '0 0 130 124',
      d: [
        '.d M50 120 L48 98 C42 96 34 90 29 81 L21.5 68.5 C18.5 63 25 58.5 29.5 63 L37.5 73.5 C40.5 76.5 44 78 47.5 78 L48.5 42 C48.5 33 57.5 33 57.5 42 L58 62 L58.5 36 C58.5 27 67.5 27 67.5 36 L68 61 L68.5 40 C68.5 31 77.5 31 77.5 40 L78 63 L78.5 50 C78.5 42 85.5 42 85.5 50 L86 78 C86 90 83 100 79 106 L77 120',
        '.d M50.5 38 Q53 35 55.5 38 L55.5 42 L50.5 42 Z M60.5 32 Q63 29 65.5 32 L65.5 36 L60.5 36 Z M70.5 36 Q73 33 75.5 36 L75.5 40 L70.5 40 Z M80 46.5 Q82 44 84 46.5 L84 50 L80 50 Z M21.8 65 Q22.5 61.5 26 62 L27.5 64.5 L23.5 67.5 Z',
        '.d M50 50 L56 50 M50 62 L56 62 M59.5 46 L66 46 M59.5 57 L66 57 M70 49 L76 49 M70 59 L76 59 M80 57 L84.5 57 M80 66 L84.5 66 M29 75 L34 71.5',
        '.d M49 104 Q63 108 77.5 104',
      ],
      sens: /./,
      items: [
        { mot: 'pouce', sens: /plus gros et court des doigts/, x: 26, y: 70, lx: 10, ly: 86 },
        { mot: 'index', sens: /Doigt le plus proche du pouce/, x: 52, y: 54, lx: 30, ly: 18 },
        { mot: 'majeur', sens: /Doigt du milieu/, x: 62.5, y: 51, lx: 63, ly: 8 },
        { mot: 'annulaire', sens: /Quatrième doigt/, x: 73, y: 53, lx: 96, ly: 14 },
        { mot: 'auriculaire', sens: /plus petit doigt|Doigt le plus ulnaire/, x: 86, y: 52, lx: 112, ly: 40 },
        { mot: 'ongle', sens: /Lame dure, cornée/, x: 63, y: 33, lx: 34, ly: 46 },
        { mot: 'phalange', sens: /Partie d.un doigt/, x: 79, y: 61.5, lx: 112, ly: 64 },
        { mot: 'poignet', sens: /avant-bras se joint à la main/, x: 63, y: 106, lx: 100, ly: 112 },
      ],
    },

    {
      id: 'dents', titre: 'Les dents', groupe: 'Le corps', sujets: ['dent'],
      items: [
        { mot: 'incisive', sens: /Dent de devant/, legende: 'tranchante, pour couper',
          d: ['.d M38 50 L42 92 Q50 96 58 92 L62 50', '.a.ft M36 50 C36 30 38 12 50 10 C62 12 64 30 64 50 Q50 54 36 50 Z', '.a M40 14 L60 14'] },
        { mot: 'canine', sens: /Dent pointue/, legende: 'pointue, pour déchirer',
          d: ['.d M38 48 L44 94 Q50 97 56 94 L62 48', '.a.ft M36 48 C36 30 42 16 50 6 C58 16 64 30 64 48 Q50 52 36 48 Z'] },
        { mot: 'prémolaire', sens: /entre les canines/, legende: 'deux pointes, pour broyer',
          d: ['.d M34 50 L38 90 Q43 93 47 88 L50 66 L53 88 Q57 93 62 90 L66 50', '.a.ft M32 50 C32 34 34 22 40 18 C44 16 47 22 50 26 C53 22 56 16 60 18 C66 22 68 34 68 50 Q50 54 32 50 Z'] },
        { mot: 'molaire', sens: /broyer les aliments/, legende: 'large, à plusieurs pointes',
          d: ['.d M24 52 L28 86 Q34 92 40 84 L44 66 L50 80 L56 66 L60 84 Q66 92 72 86 L76 52',
            '.a.ft M22 52 C22 36 24 26 30 22 C34 20 38 24 41 28 C44 22 48 20 50 22 C52 20 56 22 59 28 C62 24 66 20 70 22 C76 26 78 36 78 52 Q50 58 22 52 Z'] },
      ],
    },

    {
      id: 'postures', titre: 'Postures', groupe: 'Le corps', sujets: ['posture'],
      items: [
        { mot: 'accroupi', sens: /genoux repliés/, legende: 'sur la pointe des pieds, genoux repliés',
          d: bonhomme([42, 30], ['44 37 L52 62', '52 62 L68 56 L64 84 L70 85', '48 46 L62 54 L66 52', '52 62 L60 66 L58 84 L63 85']) },
        { mot: 'agenouillé', aussi: ['à genoux'], sens: /à genoux|Genoux à terre/, legende: 'les genoux à terre',
          d: bonhomme([52, 16], ['52 23 L53 52', '53 52 L55 84 L30 84', '52 32 L48 50 L50 58', '53 52 L60 84 L36 85']) },
        { mot: 'à califourchon', sens: /une jambe d.un côté/, legende: 'une jambe de chaque côté',
          d: ['.d C 50 66 10', '.d M40 66 L38 86 M60 66 L62 86', '.d M6 86 L94 86',
            '.a C 50 18 6.5', '.a.g M50 25 L50 53', '.a.g M50 53 L36 60 L32 80 L28 82', '.a.g M50 53 L64 60 L68 80 L72 82', '.a.g M50 33 L40 46 L44 54', '.a.g M50 33 L60 46 L56 54'] },
        { mot: 'à quatre pattes', sens: /Sur les genoux et les mains/,
          d: bonhomme([77, 46], ['70 52 L38 54', '68 53 L70 84 L76 84', '62 54 L62 84 L68 84', '38 54 L36 84 L18 84']) },
        { mot: 'à plat ventre', sens: /ventre contre le sol/,
          d: bonhomme([80, 77], ['73 80 L22 80', '66 80 L76 72 L84 70', '22 80 L10 79']) },
        { mot: 'en chien de fusil', sens: /Allongé sur le cot/, legende: 'couché sur le côté, replié',
          d: bonhomme([24, 66], ['31 70 C40 76 52 77 62 74', '62 74 L48 82 L64 84', '35 72 L46 66 L54 70']) },
        { mot: 'sur la pointe des pieds', sens: /appui sur les orteils/,
          d: bonhomme([50, 14], ['50 21 L50 52', '50 52 L46 76 L47 85', '50 52 L54 76 L55 85', '50 28 L38 12', '50 28 L62 12', '43 80 L46.5 76 M57 80 L53.5 76']) },
        { mot: 'à cloche-pied', sens: /Sur un seul pied/,
          d: bonhomme([48, 14], ['48 21 L50 52', '50 52 L50 84 L56 85', '50 52 L60 66 L70 60', '48 30 L36 44', '48 30 L62 40']) },
      ],
    },

    {
      id: 'chapeaux', titre: 'Chapeaux', groupe: 'Le vêtement', sujets: ['chapeau'],
      sens: /chapeau|coiffure|couvre-chef|coiffe|bonnet|casque|toque/i,
      items: [
        { mot: 'haut-de-forme', aussi: ['haut de forme'], sens: /haut-de-forme|Chapeau pour homme/,
          d: [face({ cheveux: false }), '.a.ft M34 41 L35.5 6 L64.5 6 L66 41 Z', '.f M34.6 33 L65.4 33 L65.6 38 L34.4 38 Z', '.a.ft E 50 41.5 27 4.5'] },
        { mot: 'melon', sens: /Chapeau melon/, d: [face({ cheveux: false }), '.a.ft M33 41 C33 14 67 14 67 41 Z', '.f M33.4 35 L66.6 35 L66.8 39 L33.2 39 Z', '.a.ft M22 40 C26 46 74 46 78 40 C72 43 28 43 22 40 Z'] },
        { mot: 'canotier', sens: /Chapeau de paille/, d: [face({ cheveux: false }), '.a.ft R 33 25 34 15', '.f R 33 31 34 5', '.a.ft E 50 40.5 33 4.5', '.a M36 27 L64 27'] },
        { mot: 'béret', sens: /Toque de laine/, d: [face({ cheveux: false }), '.a.ft M26 42 C21 31 38 24 57 25.5 C74 27 82 35 73 42.5 C62 45 41 46 26 42 Z', '.a M52 25.5 L53.5 20.5'] },
        { mot: 'képi', sens: /coiffure semi-rigide/, d: [face({ cheveux: false }), '.a.ft M35 42 L38 16 L62 16 L65 42 Z', '.f M35.6 37 L64.4 37 L64.8 41 L35.2 41 Z', '.f M33 42 Q50 51 67 42 Q50 46.5 33 42 Z', '.a E 50 16 12 2.4'] },
        { mot: 'casquette', sens: /Couvre-chef/, d: [face({ cheveux: false }), '.a.ft M30 43 C30 21 70 21 70 43 Z', '.a.ft M28 43 C34 53 66 53 72 43 C64 47 36 47 28 43 Z', '.f C 50 22.5 1.8'] },
        { mot: 'bicorne', d: [face({ cheveux: false }), '.a.ft M10 41 C22 37 32 15 50 15 C68 15 78 37 90 41 C70 45.5 30 45.5 10 41 Z', '.a.ft C 50 30 4.5'] },
        { mot: 'tricorne', d: [face({ cheveux: false }), '.a.ft M16 30 C30 35 40 36 50 49 C60 36 70 35 84 30 C80 21 65 17 50 21 C35 17 20 21 16 30 Z', '.a M32 31 Q50 37 68 31'] },
        { mot: 'sombrero', sens: /Grand chapeau/, d: [face({ cheveux: false }), '.a.ft M38 40 C37 20 43 8 50 8 C57 8 63 20 62 40 Z', '.a.ft M4 38 C8 46 30 47 50 47 C70 47 92 46 96 38 C88 35 80 40 50 40 C20 40 12 35 4 38 Z', '.a M38.5 33 Q50 36 61.5 33'] },
        { mot: 'fez', sens: /Couvre-chef de laine/, d: [face({ cheveux: false }), '.a.ft M36.5 42 L40 14 L60 14 L63.5 42 Z', '.a E 50 14 10 2', '.f M50 14 C56 14 61 20 62.5 30 L64.5 34 L60.5 33.5 Z'] },
        { mot: 'cloche', sens: /Chapeau de femme, de forme hémisphérique/, d: [face({ cheveux: false, sourcils: false }), '.a.ft M27 51 C25 25 39 17 50 17 C61 17 75 25 73 51 C66 46.5 34 46.5 27 51 Z', '.f M28.4 42 C36 38.5 64 38.5 71.6 42 L71.9 45.5 C64 42 36 42 28.1 45.5 Z'] },
        { mot: 'bob', sens: /chapeau mou/, d: [face({ cheveux: false }), '.a.ft M34 40 C34 21 66 21 66 40 L75 49 Q50 42 25 49 Z', '.a M34 40 Q50 43 66 40'] },
        { mot: 'borsalino', sens: /Chapeau mou en feutre/, d: [face({ cheveux: false }), '.a.ft M34 40 C34 30 36 21 42 19 C46 21.5 54 21.5 58 19 C64 21 66 30 66 40 Z', '.f M34.3 34 L65.7 34 L65.9 39 L34.1 39 Z', '.a.ft M18 41 C26 37 74 37 82 41 C74 46 26 46 18 41 Z', '.a M50 21.5 L50 27'] },
        { mot: 'stetson', sens: /Chapeau de feutre à large bord/, d: [face({ cheveux: false }), '.a.ft M36 39 C36 25 40 16 44 17.5 Q50 22 56 17.5 C60 16 64 25 64 39 Z', '.a.ft M10 30 C16 42 32 43 50 43 C68 43 84 42 90 30 C85 38 70 37.5 50 37.5 C30 37.5 15 38 10 30 Z'] },
        { mot: 'capeline', sens: /Chapeau de femme à bords souples/, d: [face({ cheveux: false }), '.a.ft M36 39 C36 21 64 21 64 39 Z', '.f M36.2 33.5 L63.8 33.5 L63.9 38 L36.1 38 Z', '.a.ft M6 46 C12 37 30 37 50 37 C70 37 88 37 94 46 C82 52 18 52 6 46 Z'] },
        { mot: 'mitre', sens: /évêques/, d: [face({ cheveux: false }), '.a.ft M34 42 L33 18 L50 1.5 L67 18 L66 42 Z', '.a M50 2 L50 42 M35 30 L65 30', '.a M37 42 L35 60 M63 42 L65 60'] },
        { mot: 'toque', sens: /Couvre-chef sans bords/, d: [face({ cheveux: false }), '.a.ft M33 42 L33 20 C33 15 67 15 67 20 L67 42 Z', '.a M33 20 C33 25 67 25 67 20'] },
        { mot: 'turban', sens: /Coiffure d.homme|Coiffure de femme/, d: [face({ cheveux: false }), '.a.ft M28 47 C24 30 36 15 50 15 C64 15 76 30 72 47 C60 43 40 43 28 47 Z', '.a M29.5 40 C40 29 58 27 71 35 M33 30 C43 22 58 22 67 27 M30 44 C42 34 60 33 70.5 42', '.f E 50 22 3 4'] },
        { mot: 'casque colonial', sens: /Casque léger/, d: [face({ cheveux: false }), '.a.ft M31 41 C30 16 70 16 69 41 Z', '.a.ft M16 42 C24 36 76 36 84 42 C76 48.5 24 48.5 16 42 Z', '.a M33 36 C40 33.5 60 33.5 67 36', '.f C 50 17 1.8'] },
        { mot: 'chapka', sens: /Chapeau traditionnel russe/, d: [face({ cheveux: false }), '.a.ft M28 44 C27 21 73 21 72 44 Z', '.a.ft M27 40 L27 67 C30 70 34 68 34 64 L34 42 Z', '.a.ft M73 40 L73 67 C70 70 66 68 66 64 L66 42 Z', '.a.ft M27.5 36 C38 41 62 41 72.5 36 L72.5 44 C62 48 38 48 27.5 44 Z'] },
      ],
    },

    {
      id: 'cols', titre: 'Cols et cravates', groupe: 'Le vêtement', sujets: ['col'],
      items: [
        { mot: 'col roulé', sens: /^Col haut et ajusté/, d: [BUSTE, '.a.ft M37.5 8 C37.5 4 62.5 4 62.5 8 L63.5 32 C55 35.5 45 35.5 36.5 32 Z', '.a M37 21 C45 24.5 55 24.5 63 21'] },
        { mot: 'col en V', sens: /descendant de façon triangulaire/, d: [BUSTE, '.a.ft M42 24 L50 52 L58 24 L62 26 L50 60 L38 26 Z'] },
        { mot: 'col châle', sens: /Col large et arrondi/, d: [BUSTE, '.d M42 22 L50 40 L58 22', '.a.ft M42 22 C30 30 32 56 50 74 C46 58 44 40 50 36 Z', '.a.ft M58 22 C70 30 68 56 50 74 C52 66 54 58 52 50 C51 44 50 40 50 36 Z'] },
        { mot: 'col officier', sens: /Col étroit/, d: [BUSTE, '.a.ft M38 19 C44 22.5 56 22.5 62 19 L62.5 30 C56 33.5 44 33.5 37.5 30 Z', '.a M55 21.5 L55 32.5', '.f C 58.5 26 1.5', '.d M50 33 L50 98', '.d C 50 46 1.3', '.d C 50 60 1.3'] },
        { mot: 'fraise', sens: /collerette/, legende: 'grande collerette plissée',
          d: [BUSTE, '.a.ft ' + plis(50, 26, 36, 12, 22), '.a E 50 26 22 7', '.fp.d M42 2 L42 24 C46 27 54 27 58 24 L58 2'] },
        { mot: 'collerette', sens: /Petit collet/, d: [BUSTE, '.a.ft M42 24 C34 26 26 30 24 38 C26 44 34 46 40 43 C44 47 48 46 50 42 C52 46 56 47 60 43 C66 46 74 44 76 38 C74 30 66 26 58 24 C55 27 45 27 42 24 Z'] },
        { mot: 'jabot', sens: /Mousseline, dentelle/, legende: 'dentelle sur le devant de la chemise',
          d: [BUSTE, '.d M42 24 L37 32 L46 30 M58 24 L63 32 L54 30', '.a.ft M46 30 C40 36 44 40 40 46 C46 48 42 54 44 60 C48 62 50 66 50 68 C50 66 52 62 56 60 C58 54 54 48 60 46 C56 40 60 36 54 30 Z', '.a M50 32 L50 66'] },
        { mot: 'lavallière', sens: /Cravate large et souple/, d: [BUSTE, '.d M42 24 L37 32 L46 30 M58 24 L63 32 L54 30',
          '.a.ft M50 32 C41 22 27 25 30 35 C33 43 44 40 50 34 Z', '.a.ft M50 32 C59 22 73 25 70 35 C67 43 56 40 50 34 Z', '.a.ft M48 34 C45 46 42 56 45 66 L49 62 Z', '.a.ft M52 34 C56 46 59 54 57 64 L52.5 60 Z', '.a.ft E 50 33 3.6 3.2'] },
        { mot: 'nœud papillon', sens: /cravate/, d: [BUSTE, '.d M42 24 L37 32 L46 30 M58 24 L63 32 L54 30', '.a.ft M50 31 L35 24.5 L35 37.5 Z', '.a.ft M50 31 L65 24.5 L65 37.5 Z', '.a.ft R 46.8 27.8 6.4 6.4 1.5'] },
      ],
    },

  ]);

})();

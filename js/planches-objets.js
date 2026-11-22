'use strict';
/*
 * Planches : les objets — armes blanches, vases et récipients, ustensiles
 * de cuisine. Des silhouettes, la partie qui fait l'objet à l'accent.
 */
(function () {

  const A = '.a.ft ';
  const M = '.d.fd ';   // manches, poignées, bois

  Illustrations.ajouter([

    {
      id: 'armes', titre: 'Armes blanches', groupe: 'Les objets', sujets: ['arme blanche', 'arme'],
      items: [
        { mot: 'épée', sens: /longue lame affilée/, d: [A + 'M50 4 L54.5 14 L54 68 H46 L45.5 14 Z', '.a M50 14 V64', M + 'M34 67 H66 V72 H34 Z', M + 'M47 72 H53 V88 H47 Z', M + 'C 50 92 4'] },
        { mot: 'glaive', sens: /Épée tranchante et courte/, d: [A + 'M50 14 L57 26 L56.5 64 H43.5 L43 26 Z', '.a M50 24 V60', M + 'M40 63 C40 60 60 60 60 63 V68 H40 Z', M + 'M46.5 68 H53.5 V84 H46.5 Z', M + 'C 50 89 5.5'] },
        { mot: 'rapière', sens: /Épée longue et fine/, d: [A + 'M50 2 L52 8 L52 66 H48 L48 8 Z', '.a M36 70 C38 60 62 60 64 70', '.a M38 72 C38 84 62 84 62 72', M + 'M34 68 H66 V72 H34 Z', M + 'M47.5 72 H52.5 V88 H47.5 Z', M + 'C 50 92 3.5'] },
        { mot: 'fleuret', sens: /sans pointe et sans tranchant/, d: ['.a.g M50 8 V68', '.fa C 50 6 2.8', A + 'M36 72 C36 62 64 62 64 72 Z', M + 'M47 72 H53 V90 H47 Z', M + 'C 50 93 3'] },
        { mot: 'dague', sens: /long poignard/, d: [A + 'M50 22 L54 30 L53.5 66 H46.5 L46 30 Z', '.a M50 30 V62', M + 'M36 65 H64 V70 H36 Z', M + 'M47 70 H53 V86 H47 Z', M + 'C 50 90 4'] },
        { mot: 'poignard', sens: /lame courte et pointue/, d: [A + 'M50 36 L54.5 46 L54 66 H46 L45.5 46 Z', M + 'M40 65 H60 V70 H40 Z', M + 'M46.5 70 H53.5 V88 H46.5 Z', M + 'C 50 92 4'] },
        { mot: 'sabre', sens: /un seul tranchant/, d: [A + 'M64 6 C54 26 50 46 53 66 H46 C43 46 50 24 64 6 Z', M + 'M42 66 H58 V71 H42 Z', '.d M44 71 C38 78 40 88 47 90', M + 'M47 71 H53 V88 H47 Z'] },
        { mot: 'cimeterre', sens: /lame très large et recourbée/, d: [A + 'M68 4 C74 24 68 48 56 66 H45 C52 52 52 36 45 22 C54 18 62 12 68 4 Z', M + 'M40 66 H62 V71 H40 Z', M + 'M47 71 H54 V88 H47 Z', M + 'C 50.5 91 3.5'] },
        { mot: 'yatagan', sens: /courbe rentrante/, d: [A + 'M38 6 C48 18 54 34 52 48 C50 58 48 62 50 66 H44 C42 60 44 52 46 44 C47 32 44 18 38 6 Z', M + 'M40 66 H56 V70 H40 Z', M + 'M44.5 70 C44 78 42 84 38 90 L46 92 C50 86 51 78 51 70 Z'] },
        { mot: 'katana', sens: /Sabre japonais/, d: [A + 'M64 4 C57 22 53 42 52.5 62 H47.5 C48 42 53 22 64 4 Z', '.d.fd E 50 64 9 2.6', M + 'M47.5 66 H52.5 V96 H47.5 Z', '.d M47.5 70 L52.5 74 M52.5 70 L47.5 74 M47.5 78 L52.5 82 M52.5 78 L47.5 82 M47.5 86 L52.5 90 M52.5 86 L47.5 90'] },
        { mot: 'machette', sens: /Long couteau/, d: [A + 'M38 8 C54 6 62 14 60 24 L56.5 66 H46.5 L44 20 C42 16 40 12 38 8 Z', M + 'M45.5 66 H57.5 V90 C57.5 94 45.5 94 45.5 90 Z', '.d C 51.5 74 1.4', '.d C 51.5 84 1.4'] },
        { mot: 'lance', sens: /Arme à long bois/, d: [A + 'M50 2 L56 18 L52.5 30 H47.5 L44 18 Z', '.a M50 6 V28', M + 'M48 30 H52 V98 H48 Z'] },
        { mot: 'hallebarde', sens: /Arme d.hast/, d: [M + 'M48 26 H52 V98 H48 Z', A + 'M50 2 L53.5 22 H46.5 Z', A + 'M52 26 C62 30 70 36 76 46 C78 36 76 26 72 16 C66 22 58 24 52 24 Z', A + 'M48 28 L34 34 L36 28 L48 25 Z'] },
        { mot: 'trident', sens: /Fourche à trois dents/, d: ['.a.g M36 6 V30 C36 38 64 38 64 30 V6 M50 4 V36', '.a M33 12 L36 6 L39 12 M47 10 L50 4 L53 10 M61 12 L64 6 L67 12', M + 'M48 36 H52 V98 H48 Z'] },
        { mot: 'hache', sens: /Instrument de fer/, d: [M + 'M40 12 L46 10 L62 96 L56 98 Z', A + 'M40 14 C54 12 64 10 74 4 C78 18 76 30 72 42 C64 34 56 30 46 30 Z'] },
        { mot: 'masse d’armes', sens: /grosse tête de fer/, d: [M + 'M48 30 H52 V96 H48 Z', A + 'C 50 20 11', A + 'M50 2 L54 9 H46 Z', A + 'M32 20 L39 16 V24 Z', A + 'M68 20 L61 16 V24 Z', A + 'M50 38 L54 31 H46 Z'] },
        { mot: 'fléau d’armes', sens: /chaîne terminée/, d: [M + 'M26 96 L22 92 L50 56 L54 60 Z', '.d M52 57 C58 50 62 44 64 36', '.d C 56 51 2', '.d C 60 45 2', '.d C 63 39 2', A + 'C 66 24 10', A + 'M66 8 L70 15 H62 Z', A + 'M82 24 L75 20 V28 Z', A + 'M50 22 L57 18 V27 Z'] },
        { mot: 'arbalète', sens: /Arme de trait/, d: [M + 'M47 20 H53 V96 H47 Z', A + 'M10 32 C26 16 74 16 90 32 L88 36 C72 22 28 22 12 36 Z', '.d M11 34 L50 50 L89 34', '.a M50 50 V10 M46 16 L50 8 L54 16'] },
      ],
    },

    {
      id: 'recipients', titre: 'Vases et récipients', groupe: 'Les objets', sujets: ['récipient'],
      items: [
        { mot: 'amphore', sens: /Jarre à deux anses/, d: [A + 'M44 12 H56 V20 C70 26 72 48 66 66 C62 78 56 86 50 94 C44 86 38 78 34 66 C28 48 30 26 44 20 Z', '.a M44 22 C32 20 30 34 37 40 M56 22 C68 20 70 34 63 40'] },
        { mot: 'jarre', sens: /forme ovoïde/, d: [A + 'M38 14 H62 V20 C80 28 84 56 76 74 C70 88 30 88 24 74 C16 56 20 28 38 20 Z', '.a M38 20 H62'] },
        { mot: 'cruche', sens: /panse large et le col étroit/, d: [A + 'M42 14 H58 L56 28 C72 36 76 58 70 74 C64 88 36 88 30 74 C24 58 28 36 44 28 Z', '.a M58 32 C76 30 80 50 68 60', '.a M42 14 L38 10'] },
        { mot: 'pichet', sens: /Pot à anse/, d: [A + 'M34 22 L64 22 L68 18 L66 26 C66 40 70 60 66 80 C64 88 36 88 34 80 C30 60 34 40 34 22 Z', '.a M34 32 C20 34 20 62 33 66'] },
        { mot: 'broc', sens: /Récipient portatif/, d: [A + 'M30 20 L64 20 L74 12 L70 24 L68 86 H32 Z', '.a M30 28 C14 30 14 66 31 70', '.d M31 40 H68 M31.5 72 H68.5'] },
        { mot: 'aiguière', sens: /une anse et un bec/, d: [A + 'M42 16 L36 6 L56 10 L58 16 C66 22 68 44 60 58 C56 64 44 64 40 58 C32 44 34 22 42 16 Z', A + 'M44 62 H56 L58 74 H42 Z', A + 'M36 74 H64 V80 H36 Z', '.a M60 24 C74 22 76 44 62 52'] },
        { mot: 'urne', sens: /chez les anciens/, d: [A + 'M38 22 H62 V28 C72 36 72 58 62 66 H38 C28 58 28 36 38 28 Z', A + 'M40 22 C40 14 60 14 60 22 Z', '.fa C 50 12 2.5', A + 'M44 66 H56 V78 H44 Z', A + 'M34 78 H66 V86 H34 Z', '.a M38 32 C28 30 28 44 34 48 M62 32 C72 30 72 44 66 48'] },
        { mot: 'carafe', sens: /plus large par le bas que par/, d: [A + 'M44 8 H56 V32 C70 42 76 60 74 78 C72 90 28 90 26 78 C24 60 30 42 44 32 Z', '.a M43 12 H57'] },
        { mot: 'fiole', sens: /Petit flacon ou petite bouteille/, d: [A + 'M46 20 H54 V44 C66 50 68 70 62 80 C58 88 42 88 38 80 C32 70 34 50 46 44 Z', '.d.fd M45 12 H55 V20 H45 Z'] },
        { mot: 'flacon', sens: /Bouteille de dimensions réduites/, d: [A + 'M30 40 C30 34 70 34 70 40 V80 C70 86 30 86 30 80 Z', A + 'M44 28 H56 V36 H44 Z', '.d.fd M40 14 H60 V28 H40 Z'] },
        { mot: 'gourde', sens: /utilisé comme récipient/, d: [A + 'M46 18 H54 V24 C64 28 64 40 56 44 C74 50 76 74 66 84 C60 90 40 90 34 84 C24 74 26 50 44 44 C36 40 36 28 46 24 Z', '.d.fd M45 10 H55 V18 H45 Z', '.d M44 44 H56'] },
        { mot: 'dame-jeanne', sens: /Bonbonne de verre/, d: [A + 'M44 10 H56 V22 C76 30 84 52 80 72 C76 90 24 90 20 72 C16 52 24 30 44 22 Z', '.d M24 56 C40 62 60 62 76 56 M22 72 C40 78 60 78 78 72 M30 44 L26 82 M44 46 L42 88 M58 46 L60 88 M70 44 L74 82'] },
        { mot: 'calice', sens: /Vase sacré/, d: [A + 'M28 12 C28 34 38 44 50 46 C62 44 72 34 72 12 Z', A + 'M47 46 H53 V72 H47 Z', A + 'E 50 58 6 3', A + 'M30 86 C34 78 44 74 50 72 C56 74 66 78 70 86 Z'] },
        { mot: 'hanap', sens: /muni d.un couvercle/, d: [A + 'M32 32 C32 50 40 58 50 60 C60 58 68 50 68 32 Z', A + 'M30 32 C30 20 70 20 70 32 Z', '.fa C 50 16 3', A + 'M47 60 H53 V76 H47 Z', A + 'M34 88 C38 80 46 76 50 76 C54 76 62 80 66 88 Z'] },
        { mot: 'coupe', sens: /récipient est plus large que haut/, d: [A + 'M20 22 C22 40 36 46 50 46 C64 46 78 40 80 22 Z', '.a M48.5 46 V80 M51.5 46 V80', A + 'M32 88 C36 82 44 80 50 80 C56 80 64 82 68 88 Z'] },
        { mot: 'flûte', sens: /Verre à pied long et étroit/, d: [A + 'M42 6 C40 30 42 46 50 54 C58 46 60 30 58 6 Z', '.a M48.5 54 V82 M51.5 54 V82', A + 'M36 90 C40 84 46 82 50 82 C54 82 60 84 64 90 Z'] },
        { mot: 'chope', sens: /boire de la bière/, d: [A + 'M28 18 H66 V82 C66 88 28 88 28 82 Z', '.a M66 30 C84 30 84 66 66 66 M66 38 C76 38 76 58 66 58', '.d M28 28 H66'] },
        { mot: 'gobelet', sens: /Vase à boire, rond, sans anse/, d: [A + 'M30 16 H70 L64 86 H36 Z', '.d M31 26 H69'] },
      ],
    },

    {
      id: 'ustensiles', titre: 'Ustensiles de cuisine', groupe: 'Les objets', sujets: ['ustensile'],
      items: [
        { mot: 'louche', sens: /cuilleron demi-sphérique/, d: ['.a.g M64 6 C70 14 62 44 54 66', A + 'M30 62 H70 C70 78 62 88 50 88 C38 88 30 78 30 62 Z'] },
        { mot: 'écumoire', sens: /percée de plusieurs petits trous/, d: ['.a.g M50 6 V56', A + 'C 50 72 20', '.f C 50 72 1.6', '.f C 42 66 1.6', '.f C 58 66 1.6', '.f C 42 78 1.6', '.f C 58 78 1.6', '.f C 50 62 1.6', '.f C 50 82 1.6', '.f C 40 72 1.6', '.f C 60 72 1.6'] },
        { mot: 'spatule', sens: /élargie et aplatie à un bout/, d: [M + 'M47 4 H53 V52 H47 Z', A + 'M42 52 H58 L62 90 C62 94 38 94 38 90 Z'] },
        { mot: 'fouet', sens: /tiges souples repliées/, d: [M + 'M46 4 H54 V34 H46 Z', '.a M46 34 C30 60 38 94 50 94 C62 94 70 60 54 34 M48 34 C40 60 44 92 50 94 C56 92 60 60 52 34 M50 34 V94'] },
        { mot: 'passoire', sens: /Récipient percé/, d: [A + 'M18 40 H82 C82 66 70 82 50 82 C30 82 18 66 18 40 Z', '.d M10 40 H18 M82 40 H90', '.d M40 88 H60 L56 82 H44 Z', '.f C 34 52 1.6', '.f C 44 52 1.6', '.f C 56 52 1.6', '.f C 66 52 1.6', '.f C 38 62 1.6', '.f C 50 62 1.6', '.f C 62 62 1.6', '.f C 44 72 1.6', '.f C 56 72 1.6'] },
        { mot: 'chinois', sens: /Passoire de forme conique/, d: [A + 'M26 22 H74 L50 92 Z', '.d M74 24 L94 18', '.d M34 40 H66 M40 56 H60 M45 72 H55 M38 22 L50 92 L62 22'] },
        { mot: 'entonnoir', sens: /cône renversé/, d: [A + 'M18 18 H82 L56 54 V92 H44 V54 Z'] },
        { mot: 'rouleau à pâtisserie', sens: /abaisser une pâte/, d: [A + 'M24 40 H76 V60 H24 Z', M + 'M6 46 H24 V54 H6 Z', M + 'M76 46 H94 V54 H76 Z'] },
        { mot: 'poêle', sens: /longue queue/, d: [A + 'M8 50 H62 C62 64 54 70 35 70 C16 70 8 64 8 50 Z', M + 'M62 52 L94 44 L95 50 L63 58 Z'] },
        { mot: 'casserole', sens: /fond plat et à bords haut/, d: [A + 'M10 34 H60 V72 C60 78 10 78 10 72 Z', M + 'M60 40 H94 V48 H60 Z'] },
        { mot: 'marmite', sens: /on fait bouillir/, d: [A + 'M20 36 H80 V76 C80 86 20 86 20 76 Z', A + 'M18 36 C18 26 82 26 82 36 Z', '.fa C 50 25 3', '.a M20 44 H12 V52 H20 M80 44 H88 V52 H80'] },
        { mot: 'fait-tout', aussi: ['faitout'], sens: /poignées et un couvercle|Variante orthographique de fait-tout/, d: [A + 'M14 46 H86 V74 C86 82 14 82 14 74 Z', A + 'M12 46 C12 38 88 38 88 46 Z', '.fa R 44 32 12 5 2', '.a M14 54 H6 V60 H14 M86 54 H94 V60 H86'] },
        { mot: 'râpe', sens: /hérissée d.aspérités/, d: [A + 'M28 20 H72 L80 90 H20 Z', M + 'M40 6 H60 V20 H40 Z', '.d M36 34 L40 34 M50 34 L54 34 M62 34 L66 34 M34 48 L38 48 M46 48 L50 48 M58 48 L62 48 M68 48 L70 48 M32 62 L36 62 M44 62 L48 62 M56 62 L60 62 M66 62 L70 62 M30 76 L34 76 M42 76 L46 76 M54 76 L58 76 M64 76 L68 76'] },
        { mot: 'mandoline', sens: /lamelles, des tranches/, d: [A + 'M12 70 L78 30 L86 42 L20 82 Z', '.a M44 54 L58 46', '.d M20 82 L26 94 M78 30 L82 18 M86 42 L92 54'] },
      ],
    },

  ]);

})();

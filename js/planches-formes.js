'use strict';
/*
 * Planches : la géométrie, le ciel, les feuilles, l'architecture, les
 * étoffes et le blason.
 *
 * Les figures régulières sont calculées plutôt que recopiées ; les
 * partitions de l'écu sont peintes à plat puis rognées par un cache de la
 * couleur du fond (`.m`), ce qui évite les chemins de découpe à identifiant.
 */
(function () {

  const r1 = (x) => Math.round(x * 10) / 10;

  /* Un polygone régulier, la pointe en haut. */
  function polygone(n, r, cx, cy, depart) {
    const a0 = depart === undefined ? -Math.PI / 2 : depart;
    let d = '';
    for (let i = 0; i < n; i += 1) {
      const a = a0 + (i * 2 * Math.PI) / n;
      d += (i ? ' L' : 'M') + r1((cx || 50) + r * Math.cos(a)) + ' ' + r1((cy || 50) + r * Math.sin(a));
    }
    return d + ' Z';
  }

  const FIG = '.a.ft ';

  // ── Le ciel ───────────────────────────────────────────────────────────────

  /* Un nuage bourgeonnant : une suite de bosses posées sur une base plate. */
  function bosses(x0, y, rayons, ronde) {
    let x = x0;
    let d = 'M' + x + ' ' + y;
    for (const r of rayons) {
      d += ' A' + r + ' ' + r + ' 0 ' + (ronde ? 1 : 0) + ' 1 ' + (x + 2 * r * 0.8) + ' ' + y;
      x += 2 * r * 0.8;
    }
    return d + ' Z';
  }

  const SOL = '.d M8 92 L92 92';
  const PLUIE = '.d M30 70 L27 80 M40 70 L37 82 M50 70 L47 80 M60 70 L57 82 M70 70 L67 80';

  /* La Lune, disque d'ombre et part éclairée. */
  const LUNE_R = 34;
  function lune(eclairee) {
    const d = ['.fi C 50 50 ' + LUNE_R];
    if (eclairee) d.push('.lune ' + eclairee);
    d.push('.d C 50 50 ' + LUNE_R);
    return d;
  }
  const DROITE = 'M50 16 A34 34 0 0 1 50 84';
  const GAUCHE = 'M50 16 A34 34 0 0 0 50 84';

  // ── Les feuilles ─────────────────────────────────────────────────────────

  function feuille(limbe, attache, nervure) {
    const y = attache === undefined ? 80 : attache;
    return ['.d M50 ' + y + ' L50 96', FIG + limbe, '.a.n ' + (nervure || ('M50 ' + y + ' L50 14'))];
  }

  /* Une foliole partant de (x, y), orientée de `angle` degrés depuis la
   * verticale. */
  function foliole(x, y, angle, longueur, largeur) {
    const a = angle * Math.PI / 180;
    const dx = Math.sin(a), dy = -Math.cos(a);
    const mx = x + dx * longueur / 2, my = y + dy * longueur / 2;
    const bx = x + dx * longueur, by = y + dy * longueur;
    return FIG + 'M' + x + ' ' + y + ' Q' + r1(mx - dy * largeur) + ' ' + r1(my + dx * largeur) + ' ' + r1(bx) + ' ' + r1(by)
      + ' Q' + r1(mx + dy * largeur) + ' ' + r1(my - dx * largeur) + ' ' + x + ' ' + y + ' Z';
  }

  // ── L'écu ────────────────────────────────────────────────────────────────

  const ECU = 'M20 10 H80 V50 C80 72 66 84 50 93 C34 84 20 72 20 50 Z';
  const CACHE = '.m M-120 -120 H220 V220 H-120 Z ' + ECU;
  const BORD = '.e ' + ECU;
  const EMAUX = {
    or: '#e2b23a', argent: '#f3f3f0', gueules: '#c62a2a', azur: '#2457a6',
    sinople: '#2e7d3b', sable: '#222222', pourpre: '#7d3478',
  };
  function ecu(champ, pieces) {
    return [EMAUX[champ] + ' ' + ECU].concat(pieces || [], [CACHE, BORD]);
  }
  const E = (email, forme) => EMAUX[email] + ' ' + forme;

  /* Les hachures conventionnelles des émaux (Petra Sancta). */
  function hachures(sorte) {
    let d = '';
    if (sorte === 'verticales') for (let x = 24; x < 80; x += 5) d += 'M' + x + ' 8 L' + x + ' 96 ';
    if (sorte === 'horizontales') for (let y = 13; y < 94; y += 5) d += 'M18 ' + y + ' L82 ' + y + ' ';
    if (sorte === 'bande') for (let k = -84; k < 64; k += 6) d += 'M' + (k + 10) + ' 4 L' + (k + 100) + ' 94 ';
    if (sorte === 'barre') for (let k = -84; k < 64; k += 6) d += 'M' + (90 - k) + ' 4 L' + (-k) + ' 94 ';
    if (sorte === 'croisees') return [hachures('verticales'), hachures('horizontales')];
    if (sorte === 'points') {
      const points = [];
      for (let y = 16; y < 90; y += 7) for (let x = 25 + (y % 14 ? 3.5 : 0); x < 78; x += 7) points.push('.hp C ' + x + ' ' + y + ' 0.9');
      return points;
    }
    return '.h ' + d;
  }

  // ── Les étoffes ──────────────────────────────────────────────────────────

  const ETOFFE = 'R 14 14 72 72';
  function etoffe(motif, fond) {
    return [(fond ? fond + ' ' : '.fp ') + ETOFFE].concat(motif, ['.e ' + ETOFFE]);
  }
  function repeter(pas, x0, y0, x1, y1, fabrique) {
    const formes = [];
    for (let y = y0; y < y1 - 0.01; y += pas) for (let x = x0; x < x1 - 0.01; x += pas) formes.push(fabrique(x, y));
    return formes;
  }
  /* Le pied-de-poule : un carré plein et deux dents en biais, par motif. */
  function pied(u) {
    return (x, y) => '.f M' + x + ' ' + y + ' h' + 2 * u + ' v' + 2 * u + ' h' + -2 * u + ' Z'
      + ' M' + (x + 2 * u) + ' ' + (y + u) + ' L' + (x + 3 * u) + ' ' + y + ' L' + (x + 4 * u) + ' ' + y + ' L' + (x + 2 * u) + ' ' + (y + 2 * u) + ' Z'
      + ' M' + x + ' ' + (y + 3 * u) + ' L' + (x + u) + ' ' + (y + 2 * u) + ' L' + (x + 2 * u) + ' ' + (y + 2 * u) + ' L' + x + ' ' + (y + 4 * u) + ' Z';
  }

  Illustrations.ajouter([

    // ── Géométrie ───────────────────────────────────────────────────────────

    {
      id: 'figures', titre: 'Figures planes', groupe: 'La géométrie', sujets: ['polygone', 'figure'],
      items: [
        { mot: 'triangle', sens: /polygone qui a trois côtés/, d: [FIG + polygone(3, 38, 50, 58)] },
        { mot: 'carré', sens: /quatre côtés égaux et quatre angles droits/, d: [FIG + 'M20 20 H80 V80 H20 Z'] },
        { mot: 'rectangle', sens: /Parallélogramme qui a ses quatre angles droits/, d: [FIG + 'M10 28 H90 V72 H10 Z'] },
        { mot: 'losange', sens: /quadrilatère dont les quatre côtés/i, d: [FIG + 'M50 10 L78 50 L50 90 L22 50 Z'] },
        { mot: 'trapèze', sens: /Quadrilatère dont deux côtés sont parallèles/, d: [FIG + 'M32 26 H68 L90 74 H10 Z'] },
        { mot: 'parallélogramme', sens: /équivalentes/, d: [FIG + 'M28 26 H92 L72 74 H8 Z'] },
        { mot: 'quadrilatère', sens: /Polygone qui a quatre côtés/, d: [FIG + 'M18 30 L70 14 L88 70 L30 84 Z'] },
        { mot: 'pentagone', sens: /cinq/, d: [FIG + polygone(5, 40, 50, 53)] },
        { mot: 'hexagone', sens: /six angles et six côtés/, d: [FIG + polygone(6, 40, 50, 50)] },
        { mot: 'heptagone', sens: /sept angles/, d: [FIG + polygone(7, 40, 50, 52)] },
        { mot: 'octogone', sens: /huit/, d: [FIG + polygone(8, 40, 50, 50, -Math.PI / 2 + Math.PI / 8)] },
        { mot: 'décagone', sens: /dix angles/, d: [FIG + polygone(10, 40, 50, 50)] },
        { mot: 'dodécagone', sens: /douze côtés/, d: [FIG + polygone(12, 40, 50, 50, -Math.PI / 2 + Math.PI / 12)] },
        { mot: 'cercle', sens: /lieu de tous les points équidistants/, d: [FIG + 'C 50 50 38', '.f C 50 50 1.6'] },
        { mot: 'ellipse', sens: /courbe plane fermée|Ovale, courbe ovale/, d: [FIG + 'E 50 50 42 26', '.f C 26 50 1.4', '.f C 74 50 1.4'] },
        { mot: 'ovale', sens: /forme ronde et oblongue/i, d: [FIG + 'M50 10 C72 10 80 34 80 54 C80 76 66 90 50 90 C34 90 20 76 20 54 C20 34 28 10 50 10 Z'] },
      ],
    },

    {
      id: 'triangles', titre: 'Triangles et angles', groupe: 'La géométrie', sujets: ['triangle', 'angle'],
      items: [
        { mot: 'équilatéral', sens: /côtés égaux entre eux/, legende: 'trois côtés égaux',
          d: [FIG + polygone(3, 40, 50, 58), '.a M30.1 46.5 L35.3 49.5 M69.9 46.5 L64.7 49.5 M50 75 L50 81'] },
        { mot: 'isocèle', sens: /deux côtés égaux/, legende: 'deux côtés égaux',
          d: [FIG + 'M50 8 L76 86 H24 Z', '.a M34 46 L40 48 M60 48 L66 46'] },
        { mot: 'scalène', sens: /trois côtés sont de longueurs différentes/, legende: 'trois côtés inégaux', d: [FIG + 'M30 16 L90 84 H8 Z'] },
        { mot: 'rectangle', sens: /triangle qui a un angle droit/, legende: 'un angle droit', court: 'triangle',
          d: [FIG + 'M16 14 V84 H86 Z', '.a M16 72 H28 V84'] },
        { mot: 'hypoténuse', sens: /Côté opposé à l.angle droit/, legende: 'le côté opposé à l’angle droit',
          d: ['.ft.d M16 14 V84 H86 Z', '.d M16 72 H28 V84', '.a.g M16 14 L86 84'] },
        { mot: 'angle aigu', aussi: ['aigu'], sens: /inférieur à 90|n.excède pas 90/, legende: 'moins de 90°',
          d: ['.a.g M88 80 L12 80 L66 24', '.a M36 80 A24 24 0 0 0 29 63'] },
        { mot: 'angle droit', sens: /quatre secteurs égaux/, legende: '90°', d: ['.a.g M88 80 L20 80 L20 12', '.a M20 66 H34 V80'] },
        { mot: 'obtus', sens: /plus ouvert qu.un angle droit/, legende: 'plus de 90°', court: 'angle', d: ['.a.g M90 80 L44 80 L10 30', '.a M62 80 A18 18 0 0 0 34 66'] },
        { mot: 'angle plat', sens: /180 degrés/, legende: '180°', d: ['.a.g M8 64 L92 64', '.f C 50 64 2.2', '.a M70 64 A20 20 0 0 0 30 64'] },
      ],
    },

    {
      id: 'solides', titre: 'Solides', groupe: 'La géométrie', sujets: ['polyèdre', 'solide'],
      items: [
        { mot: 'cube', sens: /six carrés/, d: [FIG + 'M20 38 H60 V78 H20 Z', FIG + 'M20 38 L36 22 H76 L60 38 Z', FIG + 'M60 38 L76 22 V62 L60 78 Z', '.d.t M20 78 L36 62 H76 M36 62 V22'] },
        { mot: 'parallélépipède', aussi: ['pavé'], sens: /parallélépipède|six faces/, d: [FIG + 'M10 46 H66 V80 H10 Z', FIG + 'M10 46 L30 30 H86 L66 46 Z', FIG + 'M66 46 L86 30 V64 L66 80 Z', '.d.t M10 80 L30 64 H86 M30 64 V30'] },
        { mot: 'prisme', sens: /Polyèdre ayant pour bases/, d: [FIG + 'M14 80 L34 30 L54 80 Z', FIG + 'M34 30 L66 22 L86 72 L54 80 Z', '.d.t M14 80 L46 72 L86 72 M46 72 L66 22'] },
        { mot: 'pyramide', sens: /Solide composé de triangles/, d: [FIG + 'M50 10 L14 78 L56 90 Z', FIG + 'M50 10 L56 90 L88 72 Z', '.d.t M14 78 L48 62 L88 72 M50 10 L48 62'] },
        { mot: 'tétraèdre', sens: /quatre triangles/, d: [FIG + 'M50 10 L12 76 L62 88 Z', FIG + 'M50 10 L62 88 L88 64 Z', '.d.t M12 76 L88 64'] },
        { mot: 'octaèdre', sens: /huit faces/, d: [FIG + 'M50 6 L14 50 L54 62 Z', FIG + 'M50 6 L54 62 L86 46 Z', FIG + 'M14 50 L50 94 L54 62 Z', FIG + 'M54 62 L50 94 L86 46 Z', '.d.t M14 50 L46 36 L86 46 M50 6 L46 36 L50 94'] },
        { mot: 'dodécaèdre', sens: /douze surfaces/, d: [FIG + polygone(10, 40, 50, 50), '.a ' + polygone(5, 20, 50, 50), '.a M50 30 L50 10 M69 43.8 L88 37.6 M61.8 66.2 L73.5 82.4 M38.2 66.2 L26.5 82.4 M31 43.8 L12 37.6'] },
        { mot: 'icosaèdre', sens: /vingt faces/, d: [FIG + polygone(6, 40, 50, 50), '.a ' + polygone(3, 24, 50, 50, Math.PI / 2), '.a M50 10 L29.2 38 L70.8 38 Z M15.4 30 L29.2 38 M84.6 30 L70.8 38 M15.4 70 L29.2 38 M15.4 70 L50 74 M84.6 70 L70.8 38 M84.6 70 L50 74 M50 90 L50 74'] },
        { mot: 'cylindre', sens: /Surface réglée|cylindre de révolution/, d: [FIG + 'M22 24 V78 A28 9 0 0 0 78 78 V24 Z', FIG + 'E 50 24 28 9', '.d.t M22 78 A28 9 0 0 1 78 78'] },
        { mot: 'cône', sens: /Surface que décrit une ligne droite/, d: [FIG + 'M50 10 L20 78 A30 10 0 0 0 80 78 Z', '.d.t M20 78 A30 10 0 0 1 80 78'] },
        { mot: 'sphère', sens: /Surface dans l.espace à trois dimensions/, d: [FIG + 'C 50 50 38', '.a.n M12 50 A38 12 0 0 0 88 50', '.d.t M12 50 A38 12 0 0 1 88 50'] },
        { mot: 'hémisphère', sens: /Moitié d.une sphère/, d: [FIG + 'M12 44 A38 38 0 0 0 88 44 Z', FIG + 'E 50 44 38 11'] },
        { mot: 'tore', sens: /forme d.anneau/, d: [FIG + 'E 50 50 42 26', '.fp.a M32 48 C38 58 62 58 68 48 C62 42 38 42 32 48 Z', '.a M28 44 C36 56 64 56 72 44'] },
      ],
    },

    {
      id: 'cercle', titre: 'Le cercle', groupe: 'La géométrie', sujets: ['cercle'], schema: true, boite: '0 0 130 104',
      d: [
        '.d C 62 52 36',
        '.d M26 52 L98 52',
        '.d M62 52 L87.5 26.5',
        '.d M36.5 77.5 L87.5 77.5',
        '.a.g M36.5 77.5 A36 36 0 0 0 87.5 77.5',
        '.d M14.5 48.5 L58.5 4.5',
        '.f C 62 52 1.6', '.f C 26 52 1.2', '.f C 98 52 1.2', '.f C 87.5 26.5 1.2', '.f C 36.5 77.5 1.2', '.f C 87.5 77.5 1.2', '.f C 36.5 26.5 1.2',
      ],
      sens: /./,
      items: [
        { mot: 'centre', sens: /Point qui, dans un cercle/, x: 62, y: 52, lx: 54, ly: 40 },
        { mot: 'rayon', sens: /Segment de droite joignant le centre/, x: 76, y: 38, lx: 92, ly: 12 },
        { mot: 'diamètre', sens: /Ligne droite qui va d.un point de la circonférence/, x: 40, y: 52, lx: 12, ly: 52 },
        { mot: 'corde', sens: /Segment joignant les deux extrémités d.un arc/, x: 70, y: 77.5, lx: 112, ly: 70 },
        { mot: 'arc', sens: /Portion définie d.une courbe/, x: 62, y: 88, lx: 62, ly: 99 },
        { mot: 'tangente', sens: /Ligne droite qui se confond avec une courbe/, x: 22, y: 41, lx: 10, ly: 58 },
        { mot: 'circonférence', sens: /Contour d.un cercle/, x: 95.5, y: 38, lx: 118, ly: 30 },
      ],
    },

    {
      id: 'lignes', titre: 'Lignes et courbes', groupe: 'La géométrie', sujets: ['ligne', 'courbe'],
      items: [
        { mot: 'segment', sens: /Partie de la ligne droite située entre deux points/, d: ['.a.g M16 60 L84 40', '.f C 16 60 3', '.f C 84 40 3'] },
        { mot: 'demi-droite', sens: /Partie de droite limitée par un point/, d: ['.a.g M18 64 L94 38', '.f C 18 64 3', '.a M84 36 L94 38 L87 45'] },
        { mot: 'parallèle', sens: /Ligne droite parallèle|droites parallèles/, d: ['.a.g M8 38 L92 22', '.a.g M8 74 L92 58'] },
        { mot: 'perpendiculaire', sens: /angle/, d: ['.d.g M8 70 L92 70', '.a.g M50 12 L50 70', '.a M50 58 H62 V70'] },
        { mot: 'oblique', sens: /s.écarte plus ou moins de la verticale/, d: ['.d.t M30 86 L30 10', '.a.g M30 86 L72 12'] },
        { mot: 'diagonale', sens: /deux sommets non consécutifs/, d: ['.ft.d M16 22 H84 V78 H16 Z', '.a.g M16 78 L84 22'] },
        { mot: 'ligne brisée', aussi: ['zigzag'], sens: /ligne polygonale|Ligne brisée formant des angles/, d: ['.a.g M6 70 L22 30 L38 70 L54 30 L70 70 L86 30 L94 50'] },
        { mot: 'bissectrice', sens: /divise cet angle en deux/, d: ['.d.g M14 80 L92 80 M14 80 L74 18', '.a.g M14 80 L94 46', '.a M40 80 A26 26 0 0 0 38 70 M38 70 A26 26 0 0 0 32 61'] },
        { mot: 'médiane', sens: /sommet d.un triangle au milieu du côté opposé/, d: ['.ft.d M30 14 L90 84 H10 Z', '.a.g M30 14 L50 84', '.a M46 80 L54 88 M42 80 L50 88'] },
        { mot: 'médiatrice', sens: /perpendiculaire au segment/, d: ['.d.g M12 62 L88 62', '.f C 12 62 2.5', '.f C 88 62 2.5', '.a.g M50 10 L50 92', '.a M50 52 H60 V62', '.d M28 58 L30 66 M70 58 L72 66'] },
        { mot: 'spirale', sens: /Courbe plane qui s.écarte/, d: ['.a.g M50 50 C50 46 56 46 56 50 C56 56 46 58 44 50 C42 40 58 36 62 48 C66 62 46 68 38 56 C28 40 46 24 62 30 C82 38 78 66 58 74 C38 82 18 66 20 46'] },
        { mot: 'hélice', sens: /forme de vis/, d: ['.d M30 10 V90 M70 10 V90', '.a.g M30 14 C44 14 70 20 70 26 C70 32 30 30 30 36 C30 42 70 42 70 48 C70 54 30 54 30 60 C30 66 70 66 70 72 C70 78 30 78 30 84', '.d.t M30 14 C30 18 70 22 70 26'] },
        { mot: 'sinusoïde', sens: /fonction périodique/, d: ['.d M6 50 H94', '.a.g M6 50 C14 22 22 22 28 50 C34 78 42 78 50 50 C58 22 66 22 72 50 C78 78 86 78 94 50'] },
        { mot: 'parabole', sens: /section d.un cône quand il est coupé par un plan parallèle/, d: ['.d M50 8 V92 M8 80 H92', '.a.g M16 12 C30 100 70 100 84 12', '.f C 50 66 1.8'] },
        { mot: 'hyperbole', sens: /Section faite dans un cône/, d: ['.d.t M14 14 L86 86 M86 14 L14 86', '.a.g M10 24 C30 38 36 44 36 50 C36 56 30 62 10 76', '.a.g M90 24 C70 38 64 44 64 50 C64 56 70 62 90 76'] },
      ],
    },

    // ── Le ciel ─────────────────────────────────────────────────────────────

    {
      id: 'lune', titre: 'Phases de la Lune', groupe: 'La nature', sujets: ['lune', 'lunaison', 'quartier'],
      note: 'Dans l’hémisphère Nord, la Lune croît par la droite.',
      items: [
        { mot: 'nouvelle lune', sens: /n.apparaît pas/, d: lune(null) },
        { mot: 'croissant', sens: /^Phase de la lune quand elle passe/, d: lune(DROITE + ' A22 34 0 0 0 50 16 Z') },
        { mot: 'premier quartier', sens: /Première des quatre parties/, d: lune(DROITE + ' Z') },
        { mot: 'gibbeux', sens: /phase presque pleine/, legende: 'presque pleine', d: lune(DROITE + ' A22 34 0 0 1 50 16 Z') },
        { mot: 'pleine lune', sens: /apparaît dans sa totalité/, d: lune('M16 50 A34 34 0 1 1 84 50 A34 34 0 1 1 16 50 Z') },
        { mot: 'dernier quartier', sens: /Quatrième des quatre parties|Dernière quadrature/, d: lune(GAUCHE + ' Z') },
      ],
    },

    {
      id: 'nuages', titre: 'Nuages', groupe: 'La nature', sujets: ['nuage'],
      sens: /nuage/i,
      note: 'Rangés du plus haut au plus bas : chaque case montre l’étage du nuage au-dessus du sol.',
      items: [
        { mot: 'cirrus', legende: 'filaments très hauts', d: [SOL, '.a.g M14 22 C30 14 46 16 60 10 M20 32 C38 26 54 28 74 18 M50 38 C62 34 74 34 86 28'] },
        { mot: 'cirrocumulus', legende: 'petits flocons très hauts', d: [SOL].concat(repeter(10, 16, 14, 86, 40, (x, y) => '.a.ft C ' + (x + ((y / 10) % 2) * 4) + ' ' + y + ' 3')) },
        { mot: 'cirrostratus', legende: 'voile haut, halo autour du Soleil', d: [SOL, '.ft.d M6 14 H94 V36 H6 Z', '.a C 50 26 5', '.a.t C 50 26 12'] },
        { mot: 'altocumulus', legende: 'bancs de galets moyens', d: [SOL].concat(repeter(16, 14, 34, 86, 60, (x, y) => '.a.ft ' + bosses(x, y + 6, [3, 4, 3]))) },
        { mot: 'altostratus', legende: 'nappe grise moyenne', d: [SOL, '.fd.a M6 40 C30 34 70 34 94 40 V58 H6 Z', '.d.t C 50 48 5'] },
        { mot: 'nimbostratus', legende: 'couche sombre, pluie continue', d: [SOL, '.fi.a M4 30 C30 24 70 24 96 30 V62 H4 Z', PLUIE.replace(/70/g, '66').replace(/80|82/g, '88')] },
        { mot: 'stratocumulus', legende: 'bancs bas et bosselés', d: [SOL, '.fd.a ' + bosses(6, 74, [6, 8, 7, 9, 6, 8, 7], true)] },
        { mot: 'stratus', legende: 'couche basse et uniforme', d: [SOL, '.fd.a M4 66 C30 62 70 62 96 66 V80 H4 Z'] },
        { mot: 'cumulus', legende: 'bourgeonnant, à base plate', d: [SOL, '.a.ft ' + bosses(30, 56, [9, 11], true), '.a.ft ' + bosses(14, 78, [9, 12, 13, 10], true)] },
        { mot: 'cumulonimbus', legende: 'nuage d’orage, en enclume', d: [SOL, '.fd.a M8 16 C26 8 74 8 94 14 C84 20 70 22 64 24 L36 24 C28 22 16 20 8 16 Z', '.fd.a ' + bosses(28, 50, [8, 10, 8], true), '.fd.a ' + bosses(20, 76, [10, 12, 11, 9], true), '.fd.a M36 24 C30 32 30 40 34 46 L66 46 C70 40 70 32 64 24 Z', '.a M54 76 L48 84 L54 84 L49 92'] },
        { mot: 'nimbus', sens: /couche épaisse et longue de nuages/, legende: 'nuage sombre qui donne la pluie', d: ['.fi.a ' + bosses(12, 60, [9, 12, 10, 11], true), PLUIE] },
      ],
    },

    // ── Les feuilles ────────────────────────────────────────────────────────

    {
      id: 'feuille', titre: 'La feuille', groupe: 'La nature', sujets: ['feuille'], schema: true, boite: '0 0 130 110',
      d: [
        '.ft.d M62 82 C40 76 26 52 32 30 C38 14 56 6 62 4 C68 6 86 14 92 30 C98 52 84 76 62 82 Z',
        '.d M62 82 L62 8 M62 66 L44 54 M62 66 L80 54 M62 50 L40 36 M62 50 L84 36 M62 34 L46 22 M62 34 L78 22',
        '.d.g M62 82 L62 106',
      ],
      sens: /./,
      items: [
        { mot: 'limbe', sens: /Partie la plus importante/, x: 44, y: 44, lx: 16, ly: 34 },
        { mot: 'nervure', sens: /vaisseaux conducteurs de la sève/, x: 75, y: 45, lx: 112, ly: 40 },
        { mot: 'pétiole', sens: /Partie rétrécie de certaines feuilles/, x: 62, y: 96, lx: 30, ly: 96 },
      ],
    },

    {
      id: 'feuilles', titre: 'Formes des feuilles', groupe: 'La nature', sujets: ['feuille'],
      items: [
        { mot: 'lancéolé', sens: /fer de lance/, legende: 'en fer de lance', d: feuille('M50 80 C38 66 38 36 50 8 C62 36 62 66 50 80 Z') },
        { mot: 'linéaire', sens: /feuille étroite et allongée/, legende: 'étroite, à bords parallèles', d: feuille('M50 86 C46 80 46 24 50 6 C54 24 54 80 50 86 Z', 86) },
        { mot: 'aciculaire', sens: /feuille linéaire, rigide et pointue/, legende: 'en aiguille', d: ['.d M50 96 L50 80', '.a M50 80 L36 8 M50 80 L44 6 M50 80 L56 6 M50 80 L64 8'] },
        { mot: 'cordiforme', sens: /cœur/, legende: 'en forme de cœur', d: feuille('M50 70 C42 84 16 82 16 58 C16 38 40 26 50 10 C60 26 84 38 84 58 C84 82 58 84 50 70 Z', 70, 'M50 70 L50 16') },
        { mot: 'réniforme', sens: /rein/, legende: 'en forme de rein', d: feuille('M50 62 C40 72 12 70 12 46 C12 26 32 18 50 18 C68 18 88 26 88 46 C88 70 60 72 50 62 Z', 62, 'M50 62 L50 22 M50 62 L26 32 M50 62 L74 32') },
        { mot: 'sagitté', sens: /fer de flèche/, legende: 'en fer de flèche', d: feuille('M50 6 C60 24 70 46 70 64 L80 92 L58 76 C55 74 52 76 50 78 C48 76 45 74 42 76 L20 92 L30 64 C30 46 40 24 50 6 Z', 78, 'M50 78 L50 12') },
        { mot: 'hasté', sens: /deux lobes/, legende: 'deux lobes écartés à la base', d: feuille('M50 6 C56 24 60 44 60 62 L86 66 L62 76 C56 76 52 77 50 79 C48 77 44 76 38 76 L14 66 L40 62 C40 44 44 24 50 6 Z', 79, 'M50 79 L50 12') },
        { mot: 'spatulé', sens: /rétrécie à la base/, legende: 'étroite à la base, large et ronde au bout', d: feuille('M50 88 C46 70 44 54 36 40 C28 24 38 8 50 8 C62 8 72 24 64 40 C56 54 54 70 50 88 Z', 88) },
        { mot: 'acuminé', sens: /pointe allongée/, legende: 'terminée en longue pointe', d: feuille('M50 82 C30 72 26 48 34 34 C40 26 46 22 50 4 C54 22 60 26 66 34 C74 48 70 72 50 82 Z', 82, 'M50 82 L50 8') },
        { mot: 'denté', sens: /bord est découpé en pointes/, legende: 'le bord en dents régulières', d: feuille('M50 82 L40 78 L38 72 L32 70 L32 62 L26 58 L28 50 L24 44 L28 38 L26 30 L32 26 L34 18 L40 16 L44 8 L50 4 L56 8 L60 16 L66 18 L68 26 L74 30 L72 38 L76 44 L72 50 L74 58 L68 62 L68 70 L62 72 L60 78 Z', 82) },
        { mot: 'dentelé', sens: /bord est découpé en dents irrégulières|petites dents fines/, legende: 'le bord finement découpé', d: feuille('M50 82 L45 80 L44 77 L40 76 L39 72 L35 70 L35 66 L31 63 L32 59 L28 55 L30 51 L27 47 L29 43 L27 38 L30 34 L29 29 L33 26 L33 21 L37 19 L38 14 L42 13 L44 8 L48 7 L50 3 L52 7 L56 8 L58 13 L62 14 L63 19 L67 21 L67 26 L71 29 L70 34 L73 38 L71 43 L73 47 L70 51 L72 55 L68 59 L69 63 L65 66 L65 70 L61 72 L60 76 L56 77 L55 80 Z', 82) },
        { mot: 'lobé', sens: /divisé en lobes/, legende: 'découpé en lobes arrondis', d: feuille('M50 84 C42 82 40 76 40 72 C32 76 24 72 26 64 C18 64 14 56 20 50 C12 46 14 36 22 36 C18 28 24 20 32 24 C32 14 42 10 46 16 C46 8 54 8 54 16 C58 10 68 14 68 24 C76 20 82 28 78 36 C86 36 88 46 80 50 C86 56 82 64 74 64 C76 72 68 76 60 72 C60 76 58 82 50 84 Z', 84) },
        { mot: 'palmé', sens: /nervures qui se détachent/, legende: 'nervures et lobes partant d’un même point', d: ['.d M50 76 L50 96', FIG + 'M50 76 L38 72 L18 78 L24 62 L8 50 L26 44 L20 24 L38 34 L44 10 L50 26 L56 10 L62 34 L80 24 L74 44 L92 50 L76 62 L82 78 L62 72 Z', '.a.n M50 76 L48 14 M50 76 L24 30 M50 76 L76 30 M50 76 L14 52 M50 76 L86 52'] },
        { mot: 'pelté', sens: /pétiole est attaché au centre/, legende: 'le pétiole fixé au centre du limbe', d: ['.d M50 96 L50 86', FIG + 'C 50 48 36', '.a.n M50 48 L50 12 M50 48 L81 30 M50 48 L81 66 M50 48 L50 84 M50 48 L19 66 M50 48 L19 30', '.f C 50 48 2.5'] },
        { mot: 'penné', sens: /folioles disposées/, legende: 'des folioles de part et d’autre du pétiole', d: ['.a M50 96 L50 8'].concat([20, 36, 52, 68].map((y) => FIG + 'M50 ' + y + ' C42 ' + (y - 10) + ' 30 ' + (y - 8) + ' 24 ' + (y - 2) + ' C32 ' + (y + 4) + ' 42 ' + (y + 4) + ' 50 ' + y + ' Z M50 ' + y + ' C58 ' + (y - 10) + ' 70 ' + (y - 8) + ' 76 ' + (y - 2) + ' C68 ' + (y + 4) + ' 58 ' + (y + 4) + ' 50 ' + y + ' Z'), [FIG + 'M50 10 C44 2 50 -2 50 2 C50 -2 56 2 50 10 Z']) },
        { mot: 'trifolié', sens: /trois folioles/, legende: 'trois folioles', d: ['.d M50 96 L50 56', FIG + 'M50 56 C38 50 36 22 50 10 C64 22 62 50 50 56 Z', FIG + 'M50 56 C40 66 14 66 10 50 C24 40 44 46 50 56 Z', FIG + 'M50 56 C60 66 86 66 90 50 C76 40 56 46 50 56 Z'] },
        { mot: 'composé', sens: /formée de plusieurs folioles/, legende: 'plusieurs folioles sur un pétiole commun',
          d: ['.d M50 96 L50 60'].concat([-80, -40, 0, 40, 80].map((a) => foliole(50, 60, a, 38, 9))) },
      ],
    },

    // ── L'architecture ──────────────────────────────────────────────────────

    {
      id: 'arcs', titre: 'Arcs', groupe: 'L’architecture', sujets: ['arc', 'voûte'],
      items: [
        { mot: 'plein cintre', sens: /demi-cercle/, legende: 'un demi-cercle', d: ['.d M8 92 H92', FIG + 'M28 92 V52 A22 22 0 0 1 72 52 V92 Z', '.d M20 92 V52 A30 30 0 0 1 80 52 V92'] },
        { mot: 'ogive', sens: /Arcs brisés/, legende: 'deux arcs qui se rejoignent en pointe', d: ['.d M8 92 H92', FIG + 'M28 92 V54 A44 44 0 0 1 50 16 A44 44 0 0 1 72 54 V92 Z', '.d M20 92 V54 A52 52 0 0 1 50 8 A52 52 0 0 1 80 54 V92'] },
        { mot: 'lancette', sens: /forme très allongée/, legende: 'ogive étroite et élancée', d: ['.d M8 92 H92', FIG + 'M38 92 V44 A40 40 0 0 1 50 8 A40 40 0 0 1 62 44 V92 Z', '.d M30 92 V44 A48 48 0 0 1 50 2 A48 48 0 0 1 70 44 V92'] },
        { mot: 'anse de panier', sens: /arc|Courbe constituée/, legende: 'cintre surbaissé', d: ['.d M4 92 H96', FIG + 'M20 92 V58 C20 40 34 34 50 34 C66 34 80 40 80 58 V92 Z', '.d M12 92 V58 C12 34 30 26 50 26 C70 26 88 34 88 58 V92'] },
        { mot: 'accolade', sens: /Élément architectural/, legende: 'deux courbes en contre-courbe, la pointe en haut', d: ['.d M8 92 H92', FIG + 'M28 92 V58 C28 42 46 44 50 18 C54 44 72 42 72 58 V92 Z', '.a M50 18 L50 8 M46 12 L54 12'] },
        { mot: 'trilobé', sens: /trois lobes/, legende: 'à trois lobes', d: ['.d M8 92 H92', FIG + 'M28 92 V56 A11 11 0 0 1 37 42 A13 13 0 0 1 63 42 A11 11 0 0 1 72 56 V92 Z'] },
      ],
    },

    {
      id: 'colonne', titre: 'La colonne', groupe: 'L’architecture', sujets: ['colonne'], schema: true, boite: '0 0 130 130',
      d: [
        '.ft.d M30 6 H100 V14 H30 Z', '.d M32 14 H98 V24 H32 Z', '.ft.d M34 24 H96 V34 H34 Z',
        '.d M40 34 C40 40 46 44 50 40 C54 36 48 32 46 36 M90 34 C90 40 84 44 80 40 C76 36 82 32 84 36', '.d M42 34 H88 M46 42 H84',
        '.d M50 42 L52 106 M80 42 L78 106', '.d M57 44 L58 106 M65 44 L65 106 M73 44 L72 106',
        '.d M48 106 H82 V112 H48 Z', '.d M44 112 H86 V118 H44 Z', '.ft.d M40 118 H90 V126 H40 Z',
      ],
      sens: /./,
      items: [
        { mot: 'corniche', sens: /saillie|couronne/i, x: 98, y: 10, lx: 118, ly: 8 },
        { mot: 'frise', sens: /architrave et la corniche|entre l.architrave/i, x: 96, y: 19, lx: 118, ly: 22 },
        { mot: 'architrave', sens: /posée immédiatement sur les colonnes/, x: 94, y: 29, lx: 118, ly: 36 },
        { mot: 'chapiteau', sens: /Partie du haut de la colonne/, x: 64, y: 38, lx: 14, ly: 22 },
        { mot: 'volute', sens: /Ornement du chapiteau/, x: 47, y: 37, lx: 14, ly: 42 },
        { mot: 'fût', sens: /Tige de la colonne/, x: 70, y: 76, lx: 112, ly: 76 },
        { mot: 'base', sens: /colonne|pilier|piédestal/i, x: 50, y: 112, lx: 14, ly: 106 },
        { mot: 'plinthe', sens: /base|colonne|socle/i, x: 88, y: 122, lx: 112, ly: 122 },
      ],
    },

    {
      id: 'ordres', titre: 'Ordres d’architecture', groupe: 'L’architecture', sujets: ['ordre'],
      sens: /ordre/i,
      items: [
        { mot: 'toscan', legende: 'le plus simple, sans cannelures', d: ['.d M34 40 L36 92 M66 40 L64 92', FIG + 'M26 22 H74 V30 H26 Z', FIG + 'M32 30 H68 C66 36 62 38 50 38 C38 38 34 36 32 30 Z', '.d M30 92 H70 V96 H30 Z'] },
        { mot: 'dorique', sens: /ordre architectural/, legende: 'chapiteau simple, coussinet plat', d: ['.d M34 40 L36 96 M66 40 L64 96 M44 42 L45 96 M50 42 L50 96 M56 42 L55 96', FIG + 'M26 20 H74 V28 H26 Z', FIG + 'M30 28 H70 C68 36 62 40 50 40 C38 40 32 36 30 28 Z'] },
        { mot: 'ionique', sens: /ordre architectural/, legende: 'chapiteau à volutes', d: ['.d M36 40 L37 96 M64 40 L63 96 M44 42 L45 96 M50 42 L50 96 M56 42 L55 96', FIG + 'M28 18 H72 V24 H28 Z', FIG + 'M26 24 H74 V30 H26 Z', '.a M26 30 C20 30 18 38 24 40 C30 42 32 34 27 33 M74 30 C80 30 82 38 76 40 C70 42 68 34 73 33', '.a M30 36 H70'] },
        { mot: 'corinthien', sens: /ordre corinthien/, legende: 'chapiteau à feuilles d’acanthe', d: ['.d M38 50 L39 96 M62 50 L61 96 M46 52 L46 96 M54 52 L54 96', FIG + 'M24 12 H76 V18 H24 Z', FIG + 'M32 18 H68 L64 50 H36 Z',
          '.a M36 50 C34 42 40 38 42 32 C44 38 46 44 44 50 M50 50 C48 42 50 36 50 28 C52 36 54 42 52 50 M64 50 C66 42 60 38 58 32 C56 38 54 44 56 50 M36 34 C34 26 38 22 40 18 M64 34 C66 26 62 22 60 18', '.a M30 18 C26 18 26 24 30 24 M70 18 C74 18 74 24 70 24'] },
        { mot: 'composite', sens: /plusieurs ordres/, legende: 'volutes et feuilles d’acanthe mêlées', d: ['.d M38 50 L39 96 M62 50 L61 96 M46 52 L46 96 M54 52 L54 96', FIG + 'M24 12 H76 V18 H24 Z', FIG + 'M32 18 H68 L64 50 H36 Z',
          '.a M32 18 C24 18 22 28 28 30 C34 32 36 24 31 24 M68 18 C76 18 78 28 72 30 C66 32 64 24 69 24', '.a M38 50 C36 42 42 40 44 34 C46 40 46 46 46 50 M62 50 C64 42 58 40 56 34 C54 40 54 46 54 50 M50 50 C48 44 50 40 50 34 C50 40 52 44 50 50'] },
      ],
    },

    {
      id: 'chateau', titre: 'Le château fort', groupe: 'L’architecture', sujets: ['château fort', 'château-fort', 'forteresse'], schema: true, boite: '0 0 150 112',
      d: [
        '.fd.n M4 96 H146 V108 H4 Z', '.d M4 96 C20 92 130 92 146 96',
        '.ft.d M58 18 H92 V82 H58 Z', '.d M56 10 H62 V18 H56 Z M66 10 H72 V18 H66 Z M78 10 H84 V18 H78 Z M88 10 H94 V18 H88 Z M56 18 H94',
        '.d M56 22 H94 M58 22 V18 M64 22 V18 M70 22 V18 M76 22 V18 M82 22 V18 M88 22 V18',
        '.d R 73 34 4 12 2',
        '.ft.d M20 42 H130 V86 H20 Z',
        '.d M18 36 H24 V42 H18 Z M30 36 H36 V42 H30 Z M42 36 H48 V42 H42 Z M102 36 H108 V42 H102 Z M114 36 H120 V42 H114 Z M126 36 H132 V42 H126 Z',
        '.d R 40 56 2.5 10 1.2',
        '.d R 107 56 2.5 10 1.2',
        '.fp.d M62 86 V66 A13 13 0 0 1 88 66 V86 Z',
        '.d M64 70 H86 M64 76 H86 M64 82 H86 M68 62 V86 M75 60 V86 M82 62 V86',
        '.d M62 86 L44 98 M88 86 L106 98', '.fd.d M44 96 L62 86 L88 86 L106 96 Z',
        '.ft.d M2 44 H16 V86 H2 Z M2 38 H5 V44 M8 38 H11 V44 M13 38 H16 V44', '.d M16 52 L20 48 V58 L16 62',
        '.ft.d M128 50 C128 46 140 46 140 50 V66 C140 72 128 72 128 66 Z', '.d M126 50 L134 40 L142 50',
      ],
      sens: /./,
      items: [
        { mot: 'donjon', sens: /Tour principale/, x: 82, y: 30, lx: 110, ly: 10 },
        { mot: 'merlon', sens: /Partie pleine du parapet/, x: 69, y: 13, lx: 40, ly: 6 },
        { mot: 'créneau', sens: /Espace entre deux merlons/, x: 33, y: 39, lx: 10, ly: 22 },
        { mot: 'mâchicoulis', sens: /Galerie en porte-à-faux/, x: 61, y: 20.5, lx: 40, ly: 26 },
        { mot: 'meurtrière', sens: /Ouverture pratiquée dans les murs/, x: 41, y: 61, lx: 30, ly: 72 },
        { mot: 'courtine', sens: /Mur ordinairement rectiligne/, x: 116, y: 78, lx: 140, ly: 84 },
        { mot: 'herse', sens: /Grille ou treillis/, x: 75, y: 72, lx: 118, ly: 30 },
        { mot: 'pont-levis', sens: /douves d.un château|Pont qui peut s.élever/, x: 95, y: 92, lx: 120, ly: 104 },
        { mot: 'douve', sens: /fossés de la fortification/, x: 24, y: 102, lx: 10, ly: 104 },
        { mot: 'échauguette', sens: /couronne le décrochement|Petit ouvrage d.un château/, x: 136, y: 58, lx: 144, ly: 30 },
      ],
    },

    {
      id: 'toits', titre: 'Toits, dômes et fenêtres', groupe: 'L’architecture', sujets: ['toit', 'fenêtre', 'comble'],
      items: [
        { mot: 'pignon', sens: /se termine en pointe/, legende: 'le haut du mur, en pointe', d: ['.d M20 50 V92 H80 V50', '.d M14 54 L50 18 L86 54', FIG + 'M20 50 L50 22 L80 50 Z', '.d R 44 66 12 26'] },
        { mot: 'appentis', sens: /Demi-comble/, legende: 'toit à un seul pan', d: ['.d M8 20 V92', '.d M8 92 H60 V60', FIG + 'M8 36 L66 62 L62 66 L8 42 Z'] },
        { mot: 'mansarde', sens: /comble brisé/, legende: 'comble brisé, en deux pentes', d: ['.d M16 60 V92 H84 V60', FIG + 'M14 60 L22 32 L40 20 H60 L78 32 L86 60 Z', '.d M22 32 H78', '.d R 42 38 16 14'] },
        { mot: 'lucarne', sens: /Fenêtre pratiquée dans le toit/, d: ['.d M10 92 V64 H90 V92 M6 64 L30 34 H70 L94 64 Z', FIG + 'M40 64 V46 L50 36 L60 46 V64 Z', '.d R 44 48 12 14'] },
        { mot: 'chien-assis', sens: /Lucarne à toit retroussé/, legende: 'lucarne au toit en pente inverse', d: ['.d M10 92 V64 H90 V92 M6 64 L30 34 H70 L94 64 Z', FIG + 'M38 64 V46 L62 40 V64 Z', '.d R 44 48 12 12'] },
        { mot: 'œil-de-bœuf', sens: /Baie ronde ou ovale/, d: ['.d M10 92 V54 H90 V92 M6 54 L50 16 L94 54 Z', FIG + 'E 50 40 9 7', '.a M50 33 V47 M41 40 H59'] },
        { mot: 'oculus', sens: /Ouverture ovale ou ronde/, d: ['.d R 10 10 80 82', FIG + 'C 50 44 18', '.a.n C 50 44 13'] },
        { mot: 'rosace', sens: /grande rose/, d: [FIG + 'C 50 50 40'].concat([0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
          const x = 50 + 24 * Math.cos(a * Math.PI / 180), y = 50 + 24 * Math.sin(a * Math.PI / 180);
          return '.a C ' + r1(x) + ' ' + r1(y) + ' 9';
        }), ['.a C 50 50 10']) },
        { mot: 'vasistas', sens: /Petit châssis|Ouverture aménagée/, legende: 'le petit châssis du haut, qui bascule', d: ['.d R 22 8 56 86', '.d M50 34 V94 M22 34 H78', FIG + 'M26 12 H74 V30 H26 Z', '.a M26 30 L32 14 L68 14 L74 30'] },
        { mot: 'coupole', sens: /Voûte hémisphérique/, d: ['.d M14 92 H86 M18 92 V60 H82 V92', FIG + 'M16 60 A34 34 0 0 1 84 60 Z', '.d M46 26 V18 H54 V26', '.d R 30 70 8 22 4', '.d M46 70 V92 M54 70 V92 M62 70 H70 V92'] },
        { mot: 'dôme', sens: /coupe renversée/, d: ['.d M8 92 H92 M14 92 V66 H86 V92', '.d M28 66 V56 H72 V66', FIG + 'M28 56 C28 30 40 22 50 22 C60 22 72 30 72 56 Z', '.d M46 22 V12 H54 V22 M50 12 V4'] },
        { mot: 'bulbe', sens: /parties renflées/, legende: 'dôme renflé en oignon', d: ['.d M26 92 V60 H74 V92 M22 92 H78', FIG + 'M30 60 C18 50 24 36 38 28 C46 24 48 18 50 8 C52 18 54 24 62 28 C76 36 82 50 70 60 Z', '.d M50 8 V2'] },
      ],
    },

    // ── Les étoffes ─────────────────────────────────────────────────────────

    {
      id: 'motifs', titre: 'Motifs d’étoffes', groupe: 'Le vêtement', sujets: ['motif', 'étoffe', 'tissu'],
      items: [
        { mot: 'rayé', sens: /Qui a des raies/, d: etoffe([14, 26, 38, 50, 62, 74].map((x) => '.fa R ' + x + ' 14 6 72')) },
        { mot: 'zébré', sens: /raies semblables à celles du zèbre/, d: etoffe(['.f M14 22 C34 18 50 30 86 20 V28 C56 36 34 26 14 32 Z', '.f M14 44 C36 38 54 50 86 40 V48 C58 58 36 48 14 54 Z', '.f M14 66 C34 60 56 72 86 62 V70 C56 80 34 70 14 76 Z']) },
        { mot: 'tigré', sens: /pelage d.un tigre/, d: etoffe(['.sn #2a2320 M24 14 C28 30 22 40 30 54 L26 54 C18 40 22 28 18 14 Z M50 14 C54 26 46 34 52 44 L48 46 C42 34 48 26 44 14 Z M76 14 C80 30 72 44 80 58 L76 58 C68 44 74 30 70 14 Z M36 86 C34 74 40 66 36 58 L40 58 C44 66 40 76 42 86 Z M62 86 C60 72 66 66 62 56 L66 56 C70 66 66 74 68 86 Z'], '#e0a040') },
        { mot: 'moucheté', sens: /multiples petites taches/, d: etoffe(['.f E 24 22 2.6 1.8', '.f E 46 18 2 2.6', '.f E 70 24 2.8 1.6', '.f E 34 38 1.8 2.4', '.f E 58 40 2.6 2', '.f E 80 44 2 2.4', '.f E 20 54 2.4 2', '.f E 44 58 2.8 1.8', '.f E 68 62 2 2.6', '.f E 30 74 2.6 2', '.f E 54 78 2 2.4', '.f E 78 76 2.6 1.8']) },
        { mot: 'damier', sens: /carreaux égaux|carrés contigus/, d: etoffe(repeter(12, 14, 14, 86, 86, (x, y) => (((x - 14) / 12 + (y - 14) / 12) % 2 ? null : '.f R ' + x + ' ' + y + ' 12 12'))) },
        { mot: 'vichy', sens: /petits carreaux de couleur sur fond blanc/, d: etoffe([].concat(
          repeter(12, 14, 14, 86, 86, (x, y) => '.vy R ' + x + ' ' + y + ' 6 12'),
          repeter(12, 14, 14, 86, 86, (x, y) => '.vy R ' + x + ' ' + y + ' 12 6'),
          repeter(12, 14, 14, 86, 86, (x, y) => '#c62a2a R ' + x + ' ' + y + ' 6 6')), '#ffffff') },
        { mot: 'écossais', aussi: ['tartan'], sens: /tissus à carreaux|Étoffe de laine à carreaux|Tissu de type écossais/, d: etoffe([
          '.tv R 14 24 72 14', '.tv R 14 62 72 14', '.tv R 24 14 14 72', '.tv R 62 14 14 72',
          '#c62a2a R 14 46 72 4', '#c62a2a R 46 14 4 72', '#f2d24a R 14 31 72 1.5', '#f2d24a R 14 69 72 1.5', '#f2d24a R 31 14 1.5 72', '#f2d24a R 69 14 1.5 72'], '#1f4d2c') },
        { mot: 'pied-de-poule', sens: /quatre fils entrecroisés/, d: etoffe(repeter(18, 14, 14, 86, 86, pied(4.5))) },
        { mot: 'pied-de-coq', sens: /plus gros que le pied-de-poule/, d: etoffe(repeter(36, 14, 14, 86, 86, pied(9))) },
        { mot: 'cachemire', sens: /motifs iraniens/, d: etoffe([24, 58].flatMap((y) => [18, 52].map((x) => '.a.ft M' + (x + 10) + ' ' + (y + 22) + ' C' + (x - 2) + ' ' + (y + 20) + ' ' + (x - 2) + ' ' + (y + 6) + ' ' + (x + 8) + ' ' + (y + 4) + ' C' + (x + 16) + ' ' + (y + 2) + ' ' + (x + 20) + ' ' + (y - 6) + ' ' + (x + 26) + ' ' + (y - 8) + ' C' + (x + 26) + ' ' + (y + 6) + ' ' + (x + 24) + ' ' + (y + 22) + ' ' + (x + 10) + ' ' + (y + 22) + ' Z'))) },
      ],
    },

    // ── Le blason ───────────────────────────────────────────────────────────

    {
      id: 'blason', titre: 'Partitions et pièces de l’écu', groupe: 'Le blason', sujets: ['blason', 'écu', 'armoiries', 'héraldique'],
      sens: /écu|armoiries/i,
      items: [
        { mot: 'parti', sens: /ligne verticale/, legende: 'coupé en deux de haut en bas', d: ecu('azur', [E('or', 'M50 0 H100 V100 H50 Z')]) },
        { mot: 'coupé', sens: /ligne horizontale/, legende: 'coupé en deux par le milieu', d: ecu('gueules', [E('argent', 'M0 0 H100 V48 H0 Z')]) },
        { mot: 'tranché', sens: /ligne oblique/, legende: 'en biais, du coin droit du chef', d: ecu('sinople', [E('or', 'M20 10 L100 10 L100 96 Z')]) },
        { mot: 'écartelé', sens: /quatre zones/, legende: 'en quatre quartiers', d: ecu('gueules', [E('or', 'M0 0 H50 V48 H0 Z'), E('or', 'M50 48 H100 V100 H50 Z')]) },
        { mot: 'chef', sens: /tiers supérieur d.un écu/, legende: 'le tiers du haut', d: ecu('argent', [E('azur', 'M0 0 H100 V34 H0 Z')]) },
        { mot: 'pal', sens: /placée verticalement/, legende: 'bande verticale au milieu', d: ecu('or', [E('gueules', 'M40 0 H60 V100 H40 Z')]) },
        { mot: 'fasce', sens: /pièces honorables de l.écu/, legende: 'bande horizontale au milieu', d: ecu('azur', [E('argent', 'M0 38 H100 V58 H0 Z')]) },
        { mot: 'bande', sens: /baudrier du cavalier/, legende: 'en biais, du chef droit à la pointe gauche', d: ecu('argent', [E('gueules', 'M10 18 L24 4 L112 92 L98 106 Z')]) },
        { mot: 'barre', sens: /angle senestre du chef/, legende: 'en biais, dans l’autre sens que la bande', d: ecu('or', [E('sable', 'M90 18 L76 4 L-12 92 L2 106 Z')]) },
        { mot: 'chevron', sens: /demi-bande et d.une demi-barre/, legende: 'en V renversé', d: ecu('azur', [E('or', 'M50 34 L104 92 L104 108 L50 52 L-4 108 L-4 92 Z')]) },
        { mot: 'sautoir', sens: /Disposition de deux objets en X/, legende: 'en croix de saint André', d: ecu('sinople', [E('argent', 'M10 18 L24 4 L112 92 L98 106 Z'), E('argent', 'M90 18 L76 4 L-12 92 L2 106 Z')]) },
        { mot: 'bordure', sens: /entoure l.écu/, legende: 'la lisière de l’écu', d: ecu('gueules', [E('or', 'M27 17 H73 V50 C73 67 62 77 50 85 C38 77 27 67 27 50 Z')]) },
        { mot: 'fascé', sens: /chargé de fasces/, legende: 'rayé de fasces égales', d: ecu('argent', [0, 1, 2].map((i) => E('azur', 'M0 ' + (24 + i * 28) + ' H100 V' + (38 + i * 28) + ' H0 Z'))) },
        { mot: 'échiqueté', sens: /carrés semblables à ceux d.un échiquier/, d: ecu('argent', repeter(12, 20, 10, 80, 96, (x, y) => (((x - 20) / 12 + (y - 10) / 12) % 2 ? null : E('gueules', 'M' + x + ' ' + y + ' h12 v12 h-12 Z')))) },
      ],
    },

    {
      id: 'emaux', titre: 'Émaux du blason', groupe: 'Le blason', sujets: ['émail', 'blason', 'armoiries'],
      sens: /armoiries|blason|écu/i,
      note: 'Chaque émail a sa hachure, pour les gravures sans couleur.',
      items: [
        { mot: 'or', sens: /Métal servant à décrire la couleur jaune/, legende: 'jaune ; hachure : des points', d: ecu('or', hachures('points')) },
        { mot: 'argent', legende: 'blanc ; sans hachure', d: ecu('argent') },
        { mot: 'gueules', legende: 'rouge ; hachure verticale', d: ecu('gueules', [hachures('verticales')]) },
        { mot: 'azur', legende: 'bleu ; hachure horizontale', d: ecu('azur', [hachures('horizontales')]) },
        { mot: 'sinople', legende: 'vert ; hachure en bande', d: ecu('sinople', [hachures('bande')]) },
        { mot: 'sable', sens: /couleur noire d.un élément des armoiries/, legende: 'noir ; hachures croisées', d: ecu('sable', hachures('croisees').map((h) => h.replace('.h ', '.hc '))) },
        { mot: 'vair', sens: /Fourrure de l.écu/, legende: 'fourrure : cloches d’azur et d’argent', d: ecu('argent', repeter(14, 20, 10, 82, 96, (x, y) => E('azur', 'M' + (x + ((y - 10) / 14 % 2) * 7) + ' ' + (y + 14) + ' V' + (y + 6) + ' L' + (x + 3.5 + ((y - 10) / 14 % 2) * 7) + ' ' + y + ' L' + (x + 7 + ((y - 10) / 14 % 2) * 7) + ' ' + (y + 6) + ' V' + (y + 14) + ' Z'))) },
      ],
    },

    {
      id: 'croix', titre: 'Croix', groupe: 'Le blason', sujets: ['croix'],
      items: [
        { mot: 'croix latine', sens: /branche inférieure est plus longue/, d: [FIG + 'M44 8 H56 V30 H76 V42 H56 V92 H44 V42 H24 V30 H44 Z'] },
        { mot: 'croix grecque', sens: /quatre branches sont d.égale/, d: [FIG + 'M43 14 H57 V43 H86 V57 H57 V86 H43 V57 H14 V43 H43 Z'] },
        { mot: 'ankh', sens: /Croix ansée/, legende: 'croix ansée', d: [FIG + 'M44 46 C30 34 36 8 50 8 C64 8 70 34 56 46 H76 V56 H56 V92 H44 V56 H24 V46 Z', '.fp.a M50 18 C44 18 42 30 50 40 C58 30 56 18 50 18 Z'] },
        { mot: 'croisillon', sens: /Traverse d.une croix/, legende: 'la traverse', d: ['.ft.d M44 8 H56 V92 H44 Z', FIG + 'M22 30 H78 V42 H22 Z'] },
      ],
    },

  ]);

})();

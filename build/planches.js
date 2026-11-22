'use strict';
/* L'aperçu de build/planches.html : chaque planche en entier, puis chaque
 * dessin tel qu'il paraît sous un sens et en indice. */
(function () {
  const seule = new URLSearchParams(location.search).get('planche');
  const zone = document.getElementById('planches');
  let n = 0;
  for (const p of Illustrations.planches) {
    if (seule && p.id !== seule) continue;
    const section = Illustrations.planche(p, null);
    section.querySelector('h3').textContent = p.groupe + ' · ' + p.titre + ' (' + p.id + ')';
    zone.appendChild(section);
    n += p.items.length;
    if (seule) {
      const ligne = Outils.element('div', 'voisins');
      for (const item of p.items) {
        ligne.appendChild(Illustrations.figure({ planche: p, item }, { mode: 'sens' }));
        ligne.appendChild(Illustrations.figure({ planche: p, item }, { mode: 'verso' }));
      }
      zone.appendChild(ligne);
    }
  }
  document.getElementById('compte').textContent = Illustrations.planches.length + ' planches, ' + n + ' dessins.';
})();

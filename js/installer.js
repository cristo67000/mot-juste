'use strict';
/*
 * Installer l'application, et la partager.
 *
 * Une application web installable l'est déjà techniquement — le navigateur
 * propose « Ajouter à l'écran d'accueil » quelque part dans son menu. Encore
 * faut-il le savoir. D'où un bouton explicite, dans les Réglages et sur une
 * carte de l'accueil des téléphones.
 *
 * Mais une application web n'a pas de « version d'Android » : c'est le
 * navigateur qui, au moment de l'installation, fabrique pour elle une petite
 * application Android (un « WebAPK »). Tout dépend donc du navigateur :
 *
 *   Chrome            le WebAPK est fabriqué et signé par Google, pour une
 *                     version d'Android récente : Play Protect l'accepte.
 *                     `beforeinstallprompt` est émis ; on le retient et on le
 *                     déclenche au clic.
 *   Samsung Internet  le WebAPK est fabriqué par le serveur de Samsung, qui
 *                     déclare une version d'Android ancienne (targetSdk trop
 *                     bas) : depuis Android 14, Play Protect le bloque —
 *                     « Appli non sécurisée bloquée… conçue pour une version
 *                     plus ancienne d'Android ». Défaut connu, non corrigé par
 *                     Samsung (SamsungInternet/support, ticket 123, 2026).
 *   iPhone (Safari)   rien ne se déclenche par programme ; on explique le
 *                     geste : Partager, puis « Sur l'écran d'accueil ».
 *   déjà installée    on n'affiche rien.
 *
 * D'où la règle : sur Samsung Internet, on ne déclenche JAMAIS l'installation
 * du navigateur ; on propose d'ouvrir l'application dans Chrome (lien
 * d'intention Android), ou, à défaut, un simple raccourci sur l'écran
 * d'accueil. Les autres navigateurs Android gardent leur invite, avec Chrome
 * conseillé.
 */
(function (racine) {

  const { element, bouton } = Outils;
  const NOM = 'Le Mot juste';
  const ADRESSE = 'https://cristo67000.github.io/mot-juste/';
  const PLAY_CHROME = 'https://play.google.com/store/apps/details?id=com.android.chrome';
  // La carte de l'accueil, une fois refermée, revient au bout d'un mois.
  // Préférence de cet appareil seulement : elle n'a pas sa place dans une sauvegarde.
  const CLE_CARTE = 'mot-juste-carte-installation';
  const UN_MOIS = 30 * 86400000;

  let invite = null;
  let elements = {};

  function estInstallee() {
    return racine.matchMedia('(display-mode: standalone)').matches
      || racine.navigator.standalone === true;
  }

  function estApple() {
    const ua = racine.navigator.userAgent;
    return /iPad|iPhone|iPod/.test(ua)
      || (/Macintosh/.test(ua) && racine.navigator.maxTouchPoints > 1);
  }

  /* Le navigateur, pour l'installation : 'chrome', 'samsung', 'android' (un
   * autre navigateur Android), 'apple' ou 'autre' (ordinateur). */
  function navigateur() {
    const ua = racine.navigator.userAgent;
    if (estApple()) return 'apple';
    if (!/Android/i.test(ua)) return 'autre';
    if (/SamsungBrowser/i.test(ua)) return 'samsung';
    if (/MiuiBrowser|HuaweiBrowser|HeyTapBrowser|OppoBrowser|VivoBrowser|UCBrowser|YaBrowser|OPR\/|Opera|EdgA|Firefox|DuckDuckGo|Brave|; wv\)/i.test(ua)) return 'android';
    return /Chrome\/\d/.test(ua) ? 'chrome' : 'android';
  }

  /* Un lien qui rouvre la page dans Chrome (intention Android) ; sans Chrome,
   * le Play Store propose de l'installer. */
  function lienChrome() {
    const schema = racine.location.protocol.replace(':', '');
    return 'intent://' + racine.location.host + racine.location.pathname
      + '#Intent;scheme=' + schema + ';package=com.android.chrome;S.browser_fallback_url='
      + encodeURIComponent(PLAY_CHROME) + ';end';
  }

  function lien(classe, texte, adresse) {
    const a = element('a', classe, texte);
    a.href = adresse;
    return a;
  }

  racine.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    // Samsung Internet : son installation est bloquée par Play Protect.
    if (navigateur() === 'samsung') { invite = null; return; }
    invite = e;
    dessiner();
  });

  racine.addEventListener('appinstalled', () => {
    invite = null;
    dessiner();
  });

  function etapes(liste) {
    const ol = element('ol', 'marche-a-suivre');
    for (const etape of liste) ol.appendChild(element('li', null, etape));
    return ol;
  }

  /* Le contenu du bloc d'installation, selon le navigateur. Renvoie null s'il
   * n'y a rien à proposer. `compact` : pour la carte de l'accueil. */
  function contenu(compact) {
    if (estInstallee()) return null;
    const nav = navigateur();
    const boite = element('div', 'installation');
    if (nav === 'samsung') {
      const p = element('p');
      p.appendChild(element('strong', null, 'Installez ' + NOM + ' avec Chrome.'));
      p.appendChild(document.createTextNode(' Samsung Internet fabrique une version de l’appli prévue pour un Android ancien, que Google Play Protect bloque (« Appli non sécurisée bloquée »). Celle de Chrome est conforme.'));
      boite.appendChild(p);
      boite.appendChild(lien('bouton-principal', 'Ouvrir dans Chrome', lienChrome()));
      if (!compact) {
        boite.appendChild(element('p', 'discret', 'Puis, dans Chrome : menu ⋮ › « Ajouter à l’écran d’accueil » › « Installer ».'));
        boite.appendChild(element('p', 'discret', 'Sans Chrome : menu ≡ de Samsung Internet › « Ajouter la page à » › « Écran d’accueil ». Vous obtenez un simple raccourci, qui ouvre ' + NOM + ' dans le navigateur, sans installation ni blocage.'));
      }
      return boite;
    }
    if (invite) {
      if (!compact) {
        boite.appendChild(element('p', 'discret',
          'Sur l’écran d’accueil, comme une application : elle s’ouvre d’un geste et marche sans réseau.'));
      }
      const b = bouton('bouton-principal', 'Installer', async () => {
        b.disabled = true;
        try {
          invite.prompt();
          const choix = await invite.userChoice;
          if (choix && choix.outcome === 'accepted') invite = null;
        } catch (erreur) {
          invite = null;
        }
        dessiner();
      });
      boite.appendChild(b);
      if (nav === 'android' && !compact) {
        const p = element('p', 'discret', 'Si Google Play Protect bloquait l’installation, ouvrez plutôt ' + NOM + ' dans Chrome : ');
        p.appendChild(lien(null, 'ouvrir dans Chrome', lienChrome()));
        p.appendChild(document.createTextNode('.'));
        boite.appendChild(p);
      }
      return boite;
    }
    if (nav === 'apple') {
      boite.appendChild(etapes(['Touchez le bouton Partager de Safari (le carré avec une flèche).',
        'Choisissez « Sur l’écran d’accueil ».', 'Confirmez avec « Ajouter ».']));
      return boite;
    }
    if (nav === 'chrome') {
      boite.appendChild(etapes(['Touchez le menu ⋮ de Chrome, en haut à droite.',
        'Choisissez « Ajouter à l’écran d’accueil », puis « Installer ».']));
      return boite;
    }
    if (nav === 'android') {
      boite.appendChild(element('p', null, 'Pour installer ' + NOM + ', Chrome est conseillé : l’application qu’il fabrique est signée par Google et acceptée par Play Protect.'));
      boite.appendChild(lien('bouton-principal', 'Ouvrir dans Chrome', lienChrome()));
      return boite;
    }
    return null;
  }

  function dessinerInstallation() {
    const bloc = elements.blocInstaller;
    const zone = elements.zoneInstaller;
    if (!bloc || !zone) return;
    zone.textContent = '';
    const c = contenu(false);
    bloc.hidden = !c;
    if (c) zone.appendChild(c);
  }

  function carteRefermee() {
    try {
      const quand = Number(racine.localStorage.getItem(CLE_CARTE));
      return quand > 0 && Date.now() - quand < UN_MOIS;
    } catch (erreur) {
      return false;
    }
  }

  /* La carte de l'accueil : seulement sur téléphone, refermable. */
  function dessinerCarte() {
    const carte = elements.carte;
    if (!carte) return;
    carte.textContent = '';
    const c = navigateur() !== 'autre' && !carteRefermee() ? contenu(true) : null;
    carte.hidden = !c;
    if (!c) return;
    const entete = element('div', 'entete-installation');
    const textes = element('div');
    textes.appendChild(element('p', 'carte-installation-titre', 'Installer ' + NOM));
    textes.appendChild(element('p', 'discret', 'Sur l’écran d’accueil, hors ligne, comme une appli.'));
    entete.appendChild(textes);
    const fermer = bouton('carte-installation-fermer', '✕', () => {
      try { racine.localStorage.setItem(CLE_CARTE, String(Date.now())); } catch (erreur) { /* navigation privée */ }
      carte.hidden = true;
      carte.textContent = '';
    });
    fermer.setAttribute('aria-label', 'Masquer');
    entete.appendChild(fermer);
    carte.appendChild(entete);
    carte.appendChild(c);
  }

  function dessinerPartage() {
    const zone = elements.zonePartager;
    if (!zone) return;
    zone.textContent = '';
    const retour = element('p', 'discret retour-partage', '');
    retour.hidden = true;
    zone.appendChild(bouton('bouton-discret', 'Partager l’application', async () => {
      const contenu = {
        title: NOM,
        text: 'Un dictionnaire de français hors ligne, avec fiches de révision et notes.',
        url: ADRESSE,
      };
      if (racine.navigator.share) {
        try { await racine.navigator.share(contenu); return; } catch (erreur) {
          if (erreur && erreur.name === 'AbortError') return;
        }
      }
      try {
        await racine.navigator.clipboard.writeText(ADRESSE);
        retour.textContent = 'Adresse copiée.';
      } catch (erreur) {
        retour.textContent = ADRESSE;
      }
      retour.hidden = false;
    }));
    zone.appendChild(element('p', 'adresse-partage', ADRESSE));
    zone.appendChild(retour);
  }

  function dessiner() {
    dessinerInstallation();
    dessinerCarte();
    dessinerPartage();
  }

  function brancher() {
    elements = {
      blocInstaller: document.getElementById('bloc-installer'),
      zoneInstaller: document.getElementById('zone-installer'),
      zonePartager: document.getElementById('zone-partager'),
      carte: document.getElementById('carte-installation'),
    };
    dessiner();
  }

  racine.Installer = { brancher, dessiner, estInstallee, estApple, navigateur, lienChrome, ADRESSE };

})(window);

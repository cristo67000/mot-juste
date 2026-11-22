# Le Mot juste — dictionnaire de français

Une application de téléphone qui réunit trois choses : **chercher** un mot
français et tout savoir de lui, **retenir** les mots qu'on veut garder grâce à
des fiches de révision, et **annoter** : ses propres notes et ses propres mots.
C'est le pendant unilingue de [Wortschatz](https://github.com/cristo67000/wortschatz),
sur le même modèle.

Tout fonctionne **hors ligne**. Pas de compte, pas de serveur, pas de mesure
d'audience, pas de publicité. La politique de sécurité de la page
(`connect-src 'self'`) lui interdit techniquement de contacter quoi que ce soit
d'autre que le site d'où elle vient.

---

## Ce qu'elle fait

**Chercher.** Un seul champ. Les résultats tombent à la frappe : la recherche
est une dichotomie dans un index tenu en mémoire, pas une requête. Les accents
sont facultatifs (*eleve* trouve *élève*, *coeur* trouve *cœur*), les formes
fléchies mènent à leur lemme (*chevaux* → *cheval*, *fit* → *faire*,
*yeux* → *œil*), et les locutions se trouvent par n'importe lequel de leurs
mots : *pomme* donne *tomber dans les pommes*, *fumée feu* donne *il n'y a pas
de fumée sans feu*.

**Comprendre.** Chaque fiche donne, pour chacune des natures du mot (*feu* est
nom, adjectif et adverbe) :

- la prononciation en API, un bouton pour l'écouter, la fréquence d'usage
  (« très courant » … « rare ») ;
- les formes : pluriel, féminin ; pour un verbe, les participes, l'auxiliaire
  et le présent ;
- **tous les sens**, numérotés, avec leurs marques d'usage en clair
  (*familier*, *vieilli*, *figuré*, *droit*, *Québec*…) et, pour chacun, une ou
  deux **citations** d'auteurs avec leur référence — les cas d'usage ;
- les **synonymes** et les **contraires**, rangés par le sens auquel ils se
  rattachent quand le Wiktionnaire le précise ;
- l'**étymologie** et la date de première attestation ;
- les **locutions et expressions** avec leur sens, les **proverbes**, les
  **dérivés et composés**, le **vocabulaire apparenté**, et les **paronymes** —
  « à ne pas confondre avec ».

**Tout mot affiché mène à sa fiche.** Un mot d'une définition, d'une citation,
d'une étymologie, un synonyme, une locution : un toucher l'ouvre, et « ← feu »
ramène d'où l'on vient (le bouton Retour du téléphone aussi). Un mot absent du
dictionnaire reste du texte — jamais de lien mort.

**Voir : les planches illustrées.** Ce que les mots disent mal, un dessin le
montre : 45 planches, près de 500 dessins au trait, pour 516 mots. Les formes
du nez (*aquilin*, *busqué*, *camus*, *retroussé*…), les barbes, les
coiffures, les chapeaux, les cols ; le visage, l'œil, la main en schémas
numérotés ; les figures et les solides de géométrie, les phases de la Lune,
les nuages, les formes des feuilles ; les arcs, les ordres, le château fort,
les toits ; les motifs d'étoffes (*pied-de-poule*, *vichy*), le blason
(partitions, pièces, émaux et leurs hachures) ; la ponctuation, la
typographie, les notes de musique, l'alphabet grec ; quatre-vingt-dix
nuances (*céladon*, *zinzolin*, *bistre*), peintes du code que donne le
Wiktionnaire quand il le donne, et les robes du cheval ; les armes blanches,
les vases, les ustensiles.

Chaque dessin s'attache à **un sens**, jamais au mot entier : *busqué* n'est
dessiné qu'au nez bombé, pas à l'écluse ; *pommette* au visage, pas à
l'ornement. Sur la fiche, il paraît sous ce sens ; la planche suit, en
bandeau, la case du mot mise en avant (« Toute la planche → »), ou en entier
sur la fiche de son sujet (*nez*, *chapeau*, *blason*). Au verso d'une
révision, le dessin accompagne le mot ; quand il faut retrouver le mot
d'après sa définition, il sert d'indice, sans légende — jamais quand il
faut retrouver le sens, il le donnerait. Les mots fléchés illustrés ont leur
dessin à côté de la définition, et l'accueil la liste des planches.

**Le mot du jour.** L'accueil propose chaque jour un mot choisi parmi six mille
mots courants mais pas banals, avec sa définition et son origine.

**Retenir : les fiches de révision.** « Ajouter aux fiches » verse le mot dans
une file de répétition espacée (SM-2 simplifié, celui de Wortschatz). Deux
fiches par mot, qui s'oublient à des rythmes différents :

- **le sens** — voir le mot, retrouver ce qu'il veut dire ;
- **le mot** — lire la définition, retrouver le mot.

Deux formes au choix dans les Réglages. **Recto-verso** : on retourne la fiche
et l'on dit soi-même si l'on savait ; chaque bouton annonce quand la fiche
reviendra (« Je savais · 6 j »). **Variée** : les fiches commencent en choix
multiple — les leurres sont de vraies définitions, souvent de mots voisins —,
puis passent à l'écriture du mot (avec l'initiale et le nombre de lettres,
sans quoi « qui manque de courage » appellerait aussi bien *lâche* que
*pusillanime*) et à la **phrase à trou**, tirée d'une citation où le mot est
repéré. La correction est tolérante mais instructive : accents oubliés, une
faute de frappe dans un mot long, le lemme au lieu de la forme demandée
valent « presque », et la remarque dit pourquoi.

Une fiche ratée repasse en fin de séance. L'onglet Réviser montre ce qui est
dû, la série de jours d'affilée et la part des fiches acquises ; un
**entraînement libre** permet de s'exercer sans toucher au calendrier.

**Jouer : les mots fléchés.** L’onglet Fléchés compose une grille pleine,
comme celles des journaux : pas une case perdue, presque chaque lettre sert à
deux mots. Les mots des fiches de révision y sont posés d’abord, les plus
fragiles en tête, puis les mots consultés récemment s’ils tiennent ; les
croisements sont faits de mots courants (*bec*, *osé*, *rit*), qui donnent
les lettres mettant sur la voie des mots rares. Chaque mot part d’une case
fléchée (→ ↓, et sur les bords ↳ ↴) ; sa définition — celle de la fiche, le
mot masqué — s’affiche au-dessus de la grille, avec la pastille « mes fiches »
pour les mots qu’on révise. Un mot juste se verrouille en vert ; trois aides :
une lettre, le mot, les lettres fausses. La grille en cours est gardée sur
l’appareil. Le calendrier des fiches ne bouge pas : un mot des fiches trouvé
sans aide compte comme une réponse d’entraînement libre. Seuls entrent les
mots d’un seul tenant de 3 à 10 lettres, sans accents dans la grille
(*égérie* s’écrit EGERIE).

**Annoter.** Chaque fiche a son bloc « Mes notes » : un moyen mnémotechnique,
la phrase où l'on a croisé le mot. La note s'enregistre d'elle-même, revient
en rappel **après** la réponse pendant les révisions (avant, elle donnerait la
réponse), et toutes les notes se retrouvent dans le Carnet.

**Entrer ses propres mots.** Le Carnet permet d'entrer un mot que le
dictionnaire ignore, ou sa propre définition : nature, prononciation, autant
de sens qu'on veut avec un exemple chacun, étymologie, synonymes, contraires,
expressions. Si le mot existe déjà au dictionnaire, le formulaire le dit et
propose de partir de sa fiche. Un mot à soi se cherche, s'affiche, s'annote et
se révise exactement comme les autres ; son identité ne dépend pas de son
orthographe — corriger une faute ne perd ni sa note ni ses révisions.

**Sauvegarder.** Rien ne quitte l'appareil ; un fichier de sauvegarde (fiches,
journal, notes, mots à soi, réglages) s'enregistre depuis les Réglages et se
recharge sur un autre appareil. Recharger fusionne : le plus récent l'emporte,
rien n'est effacé.

---

## Le dictionnaire

**106 790 vedettes** : 73 640 mots et 33 150 locutions et expressions, tirés
du **Wiktionnaire** (extraction wiktextract, CC BY-SA 4.0). Un mot entre :

- s'il paraît dans **Lexique 3.83**, l'usage réel mesuré dans des films et des
  livres (43 989 mots) — *atermoiement*, *pusillanime* ;
- ou s'il figure au **dictionnaire orthographique de Grammalecte**, celui des
  correcteurs de LibreOffice et de Firefox (26 839 mots de plus) : les mots
  savants, techniques ou récents que films et romans ne disent pas —
  *incrémenter*, *sérendipité*, *désambiguïser*, *cryptomonnaie*, *wokisme* —,
  et *après-midi*, que Lexique coupe en deux ;
- ou si un mot retenu en dérive et le nomme dans son étymologie (1 027) :
  *postprandial* vient « de *prandial* », donc *prandial* entre ;
- ou s'il figure à la liste des **mots actuels** (`build/mots-actuels.txt`,
  183 vedettes choisies à la main) : l'argot et la langue des réseaux que ni
  Lexique ni Grammalecte ne disent tous — *poucave*, *cringe*, *banger*,
  *seum*, *surperformer*, *avoir le seum*, *éclaté au sol*. Le Wiktionnaire
  doit les décrire : la liste choisit, elle ne rédige rien. Ils sont dits
  « moins courant » au moins, wordfreq mesurant des textes d'avant 2022 ;
- ou si Lexique l'a vu employé comme nom mais rangé sous un autre lemme
  (1 622) : *tronçonneuse* sous *tronçonneur*, *tourterelle* sous
  *tourtereau*, quand le Wiktionnaire en fait un mot à part.

Restent dehors les gentilés de communes, les noms d'espèces et les mots d'un
seul auteur — 230 000 mots du Wiktionnaire. Une locution entre quand un mot
retenu y renvoie et que chacun de ses mots est connu.

La fréquence d'usage vient de Lexique, ou, pour un mot qu'il ne connaît pas,
de **wordfreq** (Wikipédia, presse, sous-titres, web). Un mot qui est aussi la
forme d'un autre — *entrait*, la poutre, et « il entrait » ; *est*, le point
cardinal, et « il est » — cède sa graphie au plus courant : dans une citation,
« il est » mène à *être*.

Tous les sens sont gardés ; les citations sont rognées (deux pour le premier
sens, une pour les onze suivants, choisies parmi les plus lisibles), les
étymologies très longues coupées, signalé par « […] ». Rien n'est réécrit.
Voir [build/SOURCES.md](build/SOURCES.md).

### Sur le téléphone : ≈ 98 Mo, tout hors ligne

- à l'installation, le service worker range les **index** (12 Mo — toute la
  recherche, avec la première définition de chaque mot) et le **socle**
  (20 Mo — les 13 800 mots et expressions les plus courants) ;
- puis la **suite** (66 Mo) se télécharge d'elle-même en arrière-plan, par
  tranches, et reprend là où elle s'est arrêtée. Le réglage « Garder tout le
  dictionnaire hors ligne » est coché d'office ; décoché, les mots rares se
  chargent à la demande et restent ensuite sur l'appareil. Il ne démarre pas
  si le téléphone demande d'économiser les données.

Les données ont leur propre cache, nommé d'après leur date de construction et
non d'après la version de l'application : corriger le code ne fait pas
retélécharger le dictionnaire. Une nouvelle version s'installe en
arrière-plan et attend un toucher sur le bandeau « Mettre à jour » (mécanisme
de Wortschatz, `js/miseajour.js`).

---

## Construire les données

```
pip install wordfreq==3.1.1     # une fois : ses fréquences voyagent dans le paquet
python build/telecharger.py   # Wiktionnaire (≈ 700 Mo), Lexique 3.83, Grammalecte, wordfreq
python build/extraire.py      # ≈ 2 min : les mots français, en extrait compact
python build/construire.py    # ≈ 1 min : data/dico/ et data/manifeste.json
python build/fleches.py       # (refait par construire.py) le lexique des mots fléchés seul
python build/verifier.py      # intégrité des données + épreuves JavaScript
```

`build/rapport.txt` résume chaque construction, dont les étiquettes d'usage
que `build/etiquettes.py` ne sait pas encore traduire.

## Épreuves

```
node build/essais.mjs            # recherche, liens, correction, calendrier, grilles, mots actuels, illustrations (130 cas)
python build/verifier.py         # données : tri, tranches, clés Python = JS
node build/essais_hors_ligne.mjs # serveur arrêté : l'application tient (12 cas)
node build/captures.mjs          # parcours complet au format téléphone, captures
```

`captures.mjs` et `essais_hors_ligne.mjs` pilotent un vrai Chrome sans
affichage (`build/pilote_chrome.mjs`, repris de Wortschatz).

Les épreuves des illustrations vérifient que chaque mot dessiné existe, que
l'expression de chaque dessin reconnaît encore un de ses sens — une
reconstruction du dictionnaire qui ferait disparaître un sens ne laisse pas
un dessin au mauvais endroit —, que les dessins sont bien formés et qu'aucun
n'écrit le mot qu'il illustre. Pour les regarder tous d'un coup :
`build/planches.html` (servi à la racine ; `?planche=nez` pour une seule,
avec ses figures en grand).

## Organisation du code

| Fichier | Rôle |
|---|---|
| `js/lexique.js` | index en mémoire, recherche, formes fléchies, tranches |
| `js/fiche.js` | la fiche d'un mot, sa pile de navigation |
| `js/motsvifs.js` | les mots cliquables dans les textes |
| `js/illustrations.js` | le tracé des dessins, les planches, à quel sens va quel dessin |
| `js/planches-*.js` | les dessins : corps, formes, signes, couleurs, objets |
| `js/revision.js` | le calendrier (SM-2), les séances |
| `js/exercices.js` | les questions et leur correction |
| `js/seance.js` | l'onglet Réviser |
| `js/grille.js` | le compositeur de grilles pleines : semis, motif, remplissage |
| `build/fleches.py` | `data/dico/fleches.idx`, les mots des croisements et leurs indices |
| `js/fleches.js` | l'onglet Fléchés |
| `js/notes.js` | les notes |
| `js/perso.js` | les mots à soi et leur formulaire |
| `js/carnet.js` | l'onglet Carnet |
| `js/paquets.js` | le dictionnaire sur l'appareil, le téléchargement |
| `js/store.js` | IndexedDB |
| `js/sauvegarde.js` | export et import |
| `sw.js` | la coquille d'une seule version, le cache des données |

Servir en local : `python -m http.server 8144` à la racine (configuration
`mot-juste` du `.claude/launch.json`).

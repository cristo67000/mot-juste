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

**76 877 vedettes** : 43 989 mots et 32 888 locutions et expressions, tirés du
**Wiktionnaire** (extraction wiktextract, CC BY-SA 4.0). Le choix des mots se
fait sur l'usage réel mesuré par **Lexique 3.83** (films et livres) : un mot
entre s'il y paraît. Cela garde *atermoiement* et *pusillanime*, et laisse les
gentilés de communes et les noms d'espèces qui font les deux tiers du
Wiktionnaire. Une locution entre quand un mot retenu y renvoie et que chacun de
ses mots est connu.

Tous les sens sont gardés ; les citations sont rognées (deux pour le premier
sens, une pour les onze suivants, choisies parmi les plus lisibles), les
étymologies très longues coupées, signalé par « […] ». Rien n'est réécrit.
Voir [build/SOURCES.md](build/SOURCES.md).

### Sur le téléphone : ≈ 76 Mo, tout hors ligne

- à l'installation, le service worker range les **index** (9,4 Mo — toute la
  recherche, avec la première définition de chaque mot) et le **socle**
  (20 Mo — les 13 800 mots et expressions les plus courants) ;
- puis la **suite** (47 Mo) se télécharge d'elle-même en arrière-plan, par
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
python build/telecharger.py   # Wiktionnaire (≈ 700 Mo) et Lexique 3.83
python build/extraire.py      # ≈ 2 min : les mots français, en extrait compact
python build/construire.py    # ≈ 1 min : data/dico/ et data/manifeste.json
python build/verifier.py      # intégrité des données + épreuves JavaScript
```

`build/rapport.txt` résume chaque construction, dont les étiquettes d'usage
que `build/etiquettes.py` ne sait pas encore traduire.

## Épreuves

```
node build/essais.mjs            # recherche, correction, calendrier (44 cas)
python build/verifier.py         # données : tri, tranches, clés Python = JS
node build/essais_hors_ligne.mjs # serveur arrêté : l'application tient (12 cas)
node build/captures.mjs          # parcours complet au format téléphone, captures
```

`captures.mjs` et `essais_hors_ligne.mjs` pilotent un vrai Chrome sans
affichage (`build/pilote_chrome.mjs`, repris de Wortschatz).

## Organisation du code

| Fichier | Rôle |
|---|---|
| `js/lexique.js` | index en mémoire, recherche, formes fléchies, tranches |
| `js/fiche.js` | la fiche d'un mot, sa pile de navigation |
| `js/motsvifs.js` | les mots cliquables dans les textes |
| `js/revision.js` | le calendrier (SM-2), les séances |
| `js/exercices.js` | les questions et leur correction |
| `js/seance.js` | l'onglet Réviser |
| `js/notes.js` | les notes |
| `js/perso.js` | les mots à soi et leur formulaire |
| `js/carnet.js` | l'onglet Carnet |
| `js/paquets.js` | le dictionnaire sur l'appareil, le téléchargement |
| `js/store.js` | IndexedDB |
| `js/sauvegarde.js` | export et import |
| `sw.js` | la coquille d'une seule version, le cache des données |

Servir en local : `python -m http.server 8144` à la racine (configuration
`mot-juste` du `.claude/launch.json`).

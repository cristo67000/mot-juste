# Sources des données

L'application ne rédige aucune définition. Tout ce qu'elle affiche vient du
Wiktionnaire ; trois autres ressources libres décident quels mots entrent et
disent leur fréquence. `build/` met le tout en forme vers `data/`.

## 1. Le Wiktionnaire francophone

- **Quoi** : l'extraction intégrale du Wiktionnaire francophone par
  [wiktextract](https://github.com/tatuylonen/wiktextract) (Tatu Ylonen),
  publiée sur [kaikki.org](https://kaikki.org/frwiktionary/) :
  `raw-wiktextract-data.jsonl.gz`, mouture du 12 septembre 2026 (le même
  fichier que celui de Wortschatz).
- **Licence** : celle du Wiktionnaire, Creative Commons Attribution – Partage
  dans les mêmes conditions 4.0 (CC BY-SA 4.0). Les données de l'application
  sont diffusées sous la même licence. Chaque fiche renvoie à l'article dont
  elle provient, où figure l'historique de ses auteurs.
- **Ce qu'on en prend** : pour chaque mot français, ses sections de lemme
  (nom, adjectif, verbe, locution…) — définitions et marques d'usage,
  citations et références, notes d'usage, étymologie et date d'attestation,
  prononciation, formes, synonymes, contraires, paronymes, dérivés et
  locutions, proverbes, vocabulaire apparenté —, et les renvois des formes
  fléchies vers leur lemme.
- **Ce qu'on en écarte** : noms propres, prénoms, noms de famille, symboles,
  lettres ; les sections de formes fléchies (elles mènent au lemme, elles ne
  font pas une fiche) ; les citations de moins de 3 mots ou de plus de 48 ; les
  renvois de maintenance (« référence nécessaire », « Étymologie manquante »).
- **Ce qu'on en rogne** (`construire.py`) : deux citations pour le premier
  sens, une pour les onze suivants, aucune au-delà ; références coupées à 80
  signes ; étymologies coupées à 900 signes (500 pour une locution), marquées
  « […] » ; listes de synonymes, dérivés et locutions plafonnées.
- **Ce qu'on en traduit** (`etiquettes.py`) : wiktextract normalise les
  marques en codes anglais (`familiar`, `cooking`) ; on les remet en français.
  Une marque inconnue est omise plutôt qu'affichée en anglais, et comptée dans
  `rapport.txt`.

## 2. Lexique 3.83

- **Quoi** : [Lexique](http://www.lexique.org/), base lexicale du français de
  Boris New, Christophe Pallier et coll. — fréquences d'usage mesurées sur des
  sous-titres de films et sur des livres. `Lexique383.tsv`.
- **Licence** : CC BY-SA 4.0.
- **Ce qu'on en prend** : la fréquence de chaque lemme (moyenne films et
  livres, catégories additionnées) et de chaque forme. Elle décide :
  - **quels mots entrent** d'abord : ceux que Lexique connaît (43 989) ; et
    les noms qu'il a vus mais rangés sous un autre lemme (« tronçonneuse »
    sous « tronçonneur », 1 622) ;
  - **quelles locutions entrent** : celles dont un mot retenu fait mention et
    dont chaque mot est attesté (au moins 0,5 par million ; 2 pour une
    locution nominale, qui est souvent un terme de métier) ;
  - **l'ordre des résultats** et la **bande de fréquence** affichée ;
  - **le socle** pré-chargé à l'installation (les plus fréquents, 20 Mo) ;
  - **les formes fléchies indexées** : seulement celles que Lexique a
    rencontrées, plus les pluriels et féminins que le lemme énumère — le
    Wiktionnaire conjugue tout, jusqu'à « abaissassions » ;
  - **à qui appartient une graphie** : « est » vaut ~ 2 600 par million sous
    « être », ~ 20 sous « est », le point cardinal. La vedette « est » cède
    donc sa graphie : dans une citation, « il est » mène à « être ». De même,
    un rattachement du Wiktionnaire que Lexique dément et qui ne partage pas
    l'initiale de la forme (« trompe » → « je ») est écarté.
- ⚠ Lexique écrit « coeur », « oeil », « aujourd'hui » ; le Wiktionnaire
  « cœur », « œil », « aujourd’hui ». `construire.normal()` rapproche les deux :
  sans cela, l'œil, le cœur et la sœur n'avaient pas de fréquence et
  sortaient du dictionnaire.
- ⚠ Lexique ne connaît pas « après-midi » : il le coupe en deux mots.

## 3. Le dictionnaire orthographique de Grammalecte

- **Quoi** : le dictionnaire Hunspell de [Grammalecte](https://grammalecte.net/)
  (Olivier R. et coll.), version 7.7, tel que LibreOffice le distribue
  (`fr_FR/dictionaries/fr.dic` du dépôt `LibreOffice/dictionaries`, épinglé
  sur le commit `fe69197`) : 83 000 mots que les correcteurs de LibreOffice et
  de Firefox reconnaissent.
- **Licence** : MPL 2.0. Rien n'en est reproduit : il sert seulement à choisir.
- **Ce qu'on en prend** : la liste de ses mots (ce qui précède « / » sur chaque
  ligne). Un mot en minuscule du Wiktionnaire que Lexique ignore entre s'il y
  figure : 26 839 mots savants, techniques ou récents — « incrémenter »,
  « sérendipité », « désambiguïser », « cryptomonnaie », « après-midi ». Ses
  mots à majuscule (gentilés, noms propres) sont laissés.
- Une dernière voie s'y ajoute, sans source nouvelle : la **base** d'un mot
  retenu, quand l'étymologie de celui-ci la nomme (1 027) — « postprandial »
  vient « de prandial », « prandial » entre ; de même les préfixes
  (« hémato- », « anthropo- ») que citent les étymologies.

## 4. wordfreq

- **Quoi** : [wordfreq](https://github.com/rspeer/wordfreq) 3.1.1 (Robyn
  Speer), fréquences du français mesurées sur Wikipédia, la presse, des
  sous-titres, des livres et le web. Ses données voyagent dans le paquet
  Python ; `telecharger.py` les recopie dans `wordfreq-fr.tsv`.
- **Licence** : code Apache 2.0, données CC BY-SA 4.0.
- **Ce qu'on en prend** : la fréquence des mots que Lexique ne connaît pas,
  pour leur bande (jamais « très courant » : un mot très courant serait dans
  Lexique), et les formes fléchies de ces mots qu'il a rencontrées
  (« incrémenté »). Un homographe de forme fléchie (« entrait », la poutre) n'a
  pas de fréquence propre : il est dit « rare ».

## Ce qui n'a pas été repris

Le Dictionnaire de l'Académie française : ses conditions d'utilisation
interdisent l'extraction automatisée et la redistribution (vérifié pour
Wortschatz). Seules des sources sous licence libre ont été retenues.

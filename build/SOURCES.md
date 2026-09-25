# Sources des données

L'application ne rédige aucune définition. Tout ce qu'elle affiche vient de
deux ressources libres, mises en forme par `build/` vers `data/`.

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
  - **quels mots entrent** : ceux que Lexique connaît (≈ 44 000) ;
  - **quelles locutions entrent** : celles dont un mot retenu fait mention et
    dont chaque mot est attesté (au moins 0,5 par million ; 2 pour une
    locution nominale, qui est souvent un terme de métier) ;
  - **l'ordre des résultats** et la **bande de fréquence** affichée ;
  - **le socle** pré-chargé à l'installation (les plus fréquents, 20 Mo) ;
  - **les formes fléchies indexées** : seulement celles que Lexique a
    rencontrées, plus les pluriels et féminins que le lemme énumère — le
    Wiktionnaire conjugue tout, jusqu'à « abaissassions ».
- ⚠ Lexique écrit « coeur », « oeil », « aujourd'hui » ; le Wiktionnaire
  « cœur », « œil », « aujourd’hui ». `construire.normal()` rapproche les deux :
  sans cela, l'œil, le cœur et la sœur n'avaient pas de fréquence et
  sortaient du dictionnaire.

## Ce qui n'a pas été repris

Le Dictionnaire de l'Académie française : ses conditions d'utilisation
interdisent l'extraction automatisée et la redistribution (vérifié pour
Wortschatz). Seules des sources sous licence libre ont été retenues.

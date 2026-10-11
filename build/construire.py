#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Construit le dictionnaire de l'application à partir des extraits.

── Ce qui entre, ce qui sort ───────────────────────────────────────────────

Entrent : `sources/sections.jsonl` et `sources/formes.tsv` (voir extraire.py),
`sources/Lexique383.tsv`, la base de fréquences de Lexique 3.83,
`sources/grammalecte-fr.dic`, le dictionnaire orthographique de Grammalecte,
et `sources/wordfreq-fr.tsv`, les fréquences de wordfreq (voir telecharger.py).

Sort, dans `data/dico/` :

  mots.idx          une ligne par vedette, triée par clé :
                    clé ⇥ vedette ⇥ tranche ⇥ bande ⇥ nature ⇥ aperçu
                    [⇥ lemme auquel la vedette cède sa graphie — voir
                    `cedent` dans construire()]
  formes.idx        forme fléchie ⇥ n,reste|n,reste
                    → clé du lemme = clé de la forme[:n] + reste
  expressions.idx   mot ⇥ vedette|vedette|…  les locutions et expressions
                    qui contiennent ce mot (ou l'une de ses formes)
  t-000.json…       les entrées, par tranches

et `data/manifeste.json`, qui décrit le tout.

── Choisir les mots ───────────────────────────────────────────────────────

Le Wiktionnaire décrit 390 000 mots français. Les deux tiers sont des
gentilés de communes, des noms d'espèces, des termes de métier : un
dictionnaire de poche n'en a que faire, et un téléphone non plus.

Un mot entre par l'une de quatre voies — la première qui s'applique est
notée, et `rapport.txt` les compte :

  lexique      il paraît dans Lexique 3.83 (sous-titres de films et livres,
               47 000 lemmes) : l'usage réel. Cela garde « atermoiement »,
               « pusillanime », « procrastination ».
  grammalecte  il est dans le dictionnaire orthographique de Grammalecte,
               celui des correcteurs de LibreOffice et de Firefox : 83 000
               mots qu'une équipe a jugés de la langue, gentilés de communes
               et noms d'espèces en moins. C'est la voie des mots savants,
               techniques ou récents que des films et des romans d'avant 2010
               ne disent pas : « incrémenter », « sérendipité », « wokisme »,
               « cryptomonnaie » — et « après-midi », que Lexique coupe en
               deux.
  base         un mot retenu en dérive, et son étymologie le nomme :
               « postprandial » vient « De prandial », donc « prandial »
               entre. On ne lit pas une fiche dont l'étymologie mène à un
               mot muet.
  nom          Lexique l'a vu employé comme nom, mais rangé sous un autre
               lemme : il compte « tourterelle » sous « tourtereau »,
               « tronçonneuse » sous « tronçonneur », « vacances » sous
               « vacance ». Le Wiktionnaire en fait un nom à part entière,
               avec son sens. Quand sa fiche nomme ce lemme, il prend la
               fréquence que Lexique donne à la forme ; sinon, ce peut être
               un homographe de hasard — « amis », langue de Taïwan, n'est
               pas le pluriel d'« ami » —, et il est dit « rare ».

Le reste — 230 000 mots du Wiktionnaire — n'entre pas : gentilés,
espèces, mots d'un seul auteur (« égoïstiser »), et ce que seul un spécialiste
cherche. « splanchnologie » entre par Grammalecte ; « fourmillesque » non.

La fréquence d'un mot hors des lemmes de Lexique est celle que Lexique donne à
sa graphie employée comme nom, s'il l'a vue, sinon celle de wordfreq
(Wikipédia, presse, sous-titres, web), qui ne donne que l'ordre de grandeur :
sa bande ne monte jamais à « très courant », et les mots venus par wordfreq
vont dans la suite, pas dans le socle. Un homographe de forme fléchie —
« entrait », la poutre, et « il entrait » — n'a pas de fréquence propre : il
est dit « rare », et sa graphie, dans un texte, mène au verbe.

Les locutions et expressions — « à petit feu », « tomber dans les pommes » —
n'ont pas de fréquence dans Lexique, qui ne compte que des mots. On les prend
quand un mot retenu y renvoie *et* que chacun de leurs mots est lui-même
connu : une expression dont on ne comprend pas un mot sur trois n'est pas
une expression usuelle.

── Le socle et la suite ───────────────────────────────────────────────────

Tout le dictionnaire pèse près de cent mégaoctets : trop pour l'imposer à
l'installation. Les entrées sont donc rangées en deux groupes de tranches :

  le socle   les mots et expressions les plus courants, jusqu'à un budget
             d'octets — pré-chargé à l'installation, disponible hors ligne
             dès le premier jour ;
  la suite   tout le reste — chargé à la demande, tranche par tranche, et
             gardé ensuite ; ou d'un bloc, depuis les Réglages, pour qui veut
             tout avoir hors ligne.

Les index, eux, sont complets et pré-chargés : même hors ligne et sans la
suite, la recherche trouve tous les mots et montre leur première définition.

── Rogner ─────────────────────────────────────────────────────────────────

On garde **tous les sens** — c'est la raison d'être d'un dictionnaire —,
mais pas toutes leurs citations : deux pour le premier sens, une pour les
suivants, aucune au-delà du douzième (ce sont les sens rares, vieillis ou
techniques), choisies par `extraire.py` parmi les plus lisibles. Les listes
de synonymes et de dérivés sont plafonnées.

Usage :
    python build/construire.py
"""

import collections
import csv
import datetime
import json
import re
import shutil
import sys
import time
from pathlib import Path

import unicodedata

import commun
from commun import cle
import etiquettes

RACINE = Path(__file__).resolve().parent
SOURCES = RACINE / "sources"
DONNEES = RACINE.parent / "data"
DOSSIER = DONNEES / "dico"
RAPPORT = RACINE / "rapport.txt"

# Le format des entrées : à changer quand il change, l'application refuse
# alors les tranches d'un autre format plutôt que de les mal lire.
FORMAT = 1

# Le budget du socle, en octets de tranches. Les index s'y ajoutent.
SOCLE_OCTETS = 20 * 1024 * 1024
TRANCHE = 600          # entrées par fichier

MOTS = {
    "sens_max": 40,
    "exemples": [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],   # par sens, dans l'ordre
    "exemple_mots_max": 32,
    "etymologie_max": 900,
}
EXPRESSIONS = {
    "sens_max": 12,
    "exemples": [1, 1, 1],
    "exemple_mots_max": 32,
    "etymologie_max": 500,
}
REFERENCE_MAX = 80
APERCU_MAX = 44

PLAFONDS = {"syn": 30, "ant": 20, "par": 8, "hyper": 8, "hypo": 16,
            "loc": 80, "der": 50, "prov": 20, "rel": 24}

# Les bandes de fréquence, en occurrences par million. La fiche les montre en
# une ligne — « très courant », « rare » : c'est la première chose qu'on veut
# savoir d'un mot qu'on ne connaît pas.
BANDES = [(100.0, 0), (10.0, 1), (1.0, 2)]   # au-delà : 3


def bande_de(frequence):
    for seuil, bande in BANDES:
        if frequence >= seuil:
            return bande
    return 3


# Les mots venus d'ailleurs que Lexique : wordfreq ne donne qu'un ordre de
# grandeur, mesuré sur d'autres textes. Un mot très courant serait dans
# Lexique ; celui qui n'y est pas ne monte pas plus haut que « courant », et
# reste hors du socle, qui garde les mots dont on est sûr.
BANDE_MIN_AUTRES = 1
PRIORITE_MAX_AUTRES = 1.0
# Une forme fléchie d'un mot venu d'ailleurs entre dans l'index si wordfreq
# l'a rencontrée au moins une fois sur cent millions de mots (zipf 1).
ZIPF_FORME_MIN = 1.0


# Les mots-outils ne rangent pas les expressions : sous « de », il y en aurait
# huit mille, et personne ne cherche une expression par son « de ».
MOTS_OUTILS = set("""
a au aux avec ce ces cet cette d de des du elle en est et il ils je l la le les
leur leurs lui ma me mes mon n ne nous on ou par pas pour qu que qui s sa se ses
son sur t ta te tes ton tu un une vos votre vous y c j m ni plus
""".split())


# --- Lexique 3.83 ------------------------------------------------------------

def lire_lexique():
    """Fréquences par lemme et par forme, en occurrences par million.

    On fait la moyenne des deux corpus de Lexique — sous-titres de films
    (la langue parlée) et livres (la langue écrite). Les sous-titres seuls
    feraient d'un juron un mot plus courant que « cependant ».

    Un lemme a une ligne par forme et par catégorie ; sa fréquence de lemme y
    est répétée. On la prend une fois par catégorie, puis on additionne les
    catégories : « grand » adjectif, nom et adverbe est un seul mot à l'écran.
    """
    par_lemme = collections.defaultdict(float)
    par_forme = collections.defaultdict(float)
    # Les graphies que Lexique a vues employées comme noms, avec leur
    # fréquence et le lemme sous lequel il les range : « tourterelle »,
    # 1,4 par million, sous « tourtereau ». Voir la voie « nom » de choisir().
    noms = collections.defaultdict(float)
    lemmes_des_noms = collections.defaultdict(set)
    # Pour chaque graphie, sa fréquence sous chacun de ses lemmes : « est »
    # vaut ~ 2 600 par million sous « être », ~ 20 sous « est » (le point
    # cardinal). Voir `cedent` dans construire().
    repartition = collections.defaultdict(lambda: collections.defaultdict(float))
    vus = set()
    with open(SOURCES / "Lexique383.tsv", encoding="utf-8") as f:
        lecteur = csv.reader(f, delimiter="\t", quoting=csv.QUOTE_NONE)
        entete = next(lecteur)
        i = {nom: n for n, nom in enumerate(entete)}
        for ligne in lecteur:
            lemme, categorie, forme = ligne[i["lemme"]], ligne[i["cgram"]], ligne[i["ortho"]]
            f_forme = (float(ligne[i["freqfilms2"]] or 0) + float(ligne[i["freqlivres"]] or 0)) / 2
            par_forme[forme] += f_forme
            repartition[forme][lemme] += f_forme
            if categorie == "NOM" and forme != lemme:
                noms[forme] += f_forme
                lemmes_des_noms[forme].add(lemme)
            if (lemme, categorie) in vus:
                continue
            vus.add((lemme, categorie))
            par_lemme[lemme] += (float(ligne[i["freqlemfilms2"]] or 0)
                                 + float(ligne[i["freqlemlivres"]] or 0)) / 2
    return par_lemme, par_forme, noms, lemmes_des_noms, repartition


def lire_grammalecte():
    """Les mots du dictionnaire orthographique de Grammalecte (Hunspell).

    Une ligne par mot, « focal/W. » : le mot, puis, après la barre, les
    drapeaux qui en engendrent les formes — seul le mot nous sert. La
    première ligne donne leur nombre. Les apostrophes y sont droites ou
    typographiques selon les mots : on garde les deux.
    """
    mots = set()
    with open(SOURCES / "grammalecte-fr.dic", encoding="utf-8") as f:
        next(f)
        for ligne in f:
            mot = unicodedata.normalize("NFC", ligne.split("/")[0].strip())
            if mot:
                mots.add(mot)
                mots.add(mot.replace("'", "’"))
    return mots


def lire_wordfreq():
    """zipf par mot : log10 des occurrences par milliard, 3 = une par million."""
    zipf = {}
    with open(SOURCES / "wordfreq-fr.tsv", encoding="utf-8") as f:
        for ligne in f:
            mot, _, valeur = ligne.rstrip("\n").partition("\t")
            if valeur:
                zipf[mot] = float(valeur)
    return zipf


def normal(mot):
    """La graphie de Lexique : apostrophe droite et ligatures défaites.

    Lexique écrit « coeur », « oeil », « aujourd'hui » ; le Wiktionnaire
    « cœur », « œil », « aujourd’hui ». Sans ce rapprochement, « œil » n'avait
    pas de fréquence, et le dictionnaire perdait l'œil, le cœur et la sœur.
    """
    return (mot.replace("’", "'").replace("œ", "oe").replace("Œ", "Oe")
            .replace("æ", "ae").replace("Æ", "Ae"))


def jetons(texte):
    """Les mots d'une expression : « tomber dans les pommes » → 4 mots."""
    return [j for j in re.split(r"[\s'’\-,.;:!?«»()…]+", texte) if j]


# --- Première lecture : ce qu'il faut pour choisir --------------------------

def premiere_lecture():
    meta = {}
    renvois = collections.defaultdict(set)   # expression → mots qui y renvoient
    derives = collections.defaultdict(set)   # « prandial » → {« postprandial », …}
    with open(SOURCES / "sections.jsonl", encoding="utf-8") as f:
        for ligne in f:
            s = json.loads(ligne)
            mot = s["m"]
            m = meta.setdefault(mot, {"titres": [], "idiome": 0})
            m["titres"].append(s["t"])
            m["idiome"] |= s.get("idiome", 0)
            for champ in ("der", "prov", "syn", "ant", "rel"):
                for lien in s.get(champ, ()):
                    renvois[lien[0]].add(mot)
            if " " not in mot:
                for lien in s.get("der", ()):
                    if " " not in lien[0]:
                        derives[mot].add(lien[0])
    return meta, renvois, derives


def textes(voulus):
    """Pour chaque mot voulu : son étymologie, ses définitions, ses renvois
    (« Pluriel de… »), en un texte. De quoi voir s'il nomme un autre mot."""
    morceaux = collections.defaultdict(list)
    definitions = collections.defaultdict(list)
    with open(SOURCES / "sections.jsonl", encoding="utf-8") as f:
        for ligne in f:
            debut = ligne.find('"m":"') + 5
            if ligne[debut:ligne.find('","', debut)] not in voulus:
                continue
            s = json.loads(ligne)
            morceaux[s["m"]].extend(s.get("et", ()))
            for sens in s["s"]:
                definitions[s["m"]].append(sens["d"])
                morceaux[s["m"]].append(sens["d"])
                morceaux[s["m"]].extend(sens.get("v", ()))
    return {mot: " ".join(m) for mot, m in morceaux.items()}, definitions


def nomme(texte, mot):
    """Le texte cite-t-il ce mot, en entier, ou une forme qui commence par
    lui (« prandial » dans « prandiale ») ?"""
    return re.search(r"(?<!\w)" + re.escape(mot) + r"(?!\w)", texte) is not None \
        or re.search(r"(?<!\w)" + re.escape(mot) + r"(?:e|s|es|x)(?!\w)", texte) is not None


# Une fiche qui ne fait que renvoyer — « Pluriel de… », « Variante de… » —
# ne mérite pas d'être une vedette à part : la forme mène déjà au lemme.
RE_RENVOI = re.compile(r"^(Féminin|Pluriel|Masculin|Variante|Forme|Ancienne orthographe"
                       r"|Orthographe|Autre orthographe)\b.*\bde\b", re.I)


def est_expression(mot, meta_mot):
    """Une vedette de plusieurs mots, ou une locution par sa nature."""
    if " " in mot:
        return True
    return any(t.startswith(("Locution", "Proverbe")) for t in meta_mot["titres"])


def choisir(meta, renvois, derives, src):
    """Rend {vedette: priorité}, l'ensemble des expressions, {vedette: bande}
    pour les mots venus d'ailleurs que Lexique, {vedette: voie} et la liste
    des noms entrés sans lien visible avec leur lemme. Les voies : voir en
    tête du fichier.

    La priorité décide de ce qui va dans le socle. Pour un mot, c'est sa
    fréquence. Pour une expression, celle du plus rare de ses mots, divisée :
    « tomber dans les pommes » vaut ce que vaut un mot d'une fréquence de 1,
    ce qui la met au socle ; « mouton des plateaux de l'Est » n'y entre pas.
    """
    par_lemme, par_forme = src["lemmes"], src["formes"]
    choisis, bandes, voies = {}, {}, {}
    simples = [mot for mot, m in meta.items() if not est_expression(mot, m)]

    def frequence_libre(mot):
        """La fréquence d'un mot absent des lemmes de Lexique.

        Lexique a pu le voir employé comme nom, rangé sous un autre lemme
        (« lunettes » sous « lunette ») : c'est sa fréquence de nom. Sinon
        wordfreq — sauf pour un homographe de forme fléchie, que wordfreq
        compte avec la forme (« entrait », la poutre, et « il entrait »).
        """
        k = mot if mot in src["noms"] else normal(mot)
        if src["noms"].get(k):
            return src["noms"][k]
        if mot in src["homographes"]:
            return 0.0
        zipf = src["wordfreq"].get(mot.lower().replace("’", "'"))
        return 10 ** (zipf - 3) if zipf else 0.0

    def prendre(mot, voie, frequence, priorite=None):
        choisis[mot] = min(frequence, PRIORITE_MAX_AUTRES) if priorite is None else priorite
        bandes[mot] = max(bande_de(frequence), BANDE_MIN_AUTRES)
        voies[mot] = voie

    # 1. Lexique.
    for mot in simples:
        frequence = par_lemme.get(mot) or par_lemme.get(normal(mot)) or 0.0
        if frequence > 0:
            choisis[mot] = frequence
            voies[mot] = "lexique"

    # 2. Grammalecte. Ses mots à majuscule sont des gentilés (« Strasbourgeois »)
    # ou des noms propres : l'adjectif, en minuscule, suffit.
    for mot in simples:
        if mot not in choisis and mot[:1].islower() and mot in src["grammalecte"]:
            prendre(mot, "grammalecte", frequence_libre(mot))

    # Les voies 3 et 4 demandent de lire des fiches : on réunit les candidats,
    # puis une seule lecture.
    bases = {}
    for mot in simples:
        if mot in choisis or not mot[:1].islower():
            continue
        fils = derives.get(mot, set()) & choisis.keys()
        if fils:
            bases[mot] = fils
    noms = {}
    for mot in simples:
        if mot in choisis or "Nom commun" not in meta[mot]["titres"]:
            continue
        cle_lexique = mot if mot in src["noms"] else normal(mot)
        if src["noms"].get(cle_lexique, 0) > 0:
            noms[mot] = cle_lexique
    texte, definitions = textes(set(noms) | set(bases) | {f for v in bases.values() for f in v})

    # 3. La base d'un dérivé retenu, quand l'étymologie du dérivé la nomme.
    for mot, fils in bases.items():
        if any(nomme(texte.get(f, ""), mot) for f in fils):
            prendre(mot, "base", frequence_libre(mot))

    # 4. Un nom que Lexique range sous un autre lemme, sauf simple renvoi
    # (« Pluriel de… »). Quand sa fiche nomme ce lemme — « lunettes » :
    # « Ensemble de deux verres de lunette… » —, il prend la fréquence que
    # Lexique donne à la forme. Sinon, rien ne dit que cette fréquence soit la
    # sienne : « amis », langue de Taïwan, n'a pas celle du pluriel d'« ami ».
    # Il entre quand même, dit rare.
    sans_lien = []
    for mot, cle_lexique in noms.items():
        if mot in choisis or all(RE_RENVOI.match(d) for d in definitions.get(mot, ())):
            continue
        t = texte.get(mot, "")
        lemmes = src["lemmes_des_noms"][cle_lexique]
        if any(nomme(t, l) or nomme(t, l.replace("oe", "œ")) for l in lemmes):
            frequence = src["noms"][cle_lexique]
            prendre(mot, "nom", frequence, priorite=frequence)
        else:
            prendre(mot, "nom", 0.0)
            sans_lien.append(mot)
    mots = set(choisis)

    expressions = set()
    for mot, m in meta.items():
        if not est_expression(mot, m):
            continue
        renvoyee = bool(renvois.get(mot, set()) & mots)
        if not renvoyee and not m["idiome"]:
            continue
        morceaux = jetons(mot)
        if not morceaux:
            continue
        frequences = [par_forme.get(j.lower()) or par_forme.get(normal(j).lower()) or 0.0
                      for j in morceaux]
        plus_rare = min(frequences)
        nominale = all(t == "Locution nominale" for t in m["titres"])
        # Une locution nominale est souvent un terme de métier (« pointe à
        # tracer ») : on la veut renvoyée et faite de mots franchement connus.
        seuil = 2.0 if nominale else 0.5
        if plus_rare < seuil or (nominale and not renvoyee):
            continue
        # Un idiome sans renvoi n'entre que s'il est fait de mots courants.
        if not renvoyee and plus_rare < 10:
            continue
        valeur = plus_rare / (40.0 if nominale else 15.0)
        if m["idiome"]:
            valeur *= 2
        choisis[mot] = min(valeur, 8.0)
        expressions.add(mot)
    return choisis, expressions, bandes, voies, sans_lien


# --- Deuxième lecture : les entrées ------------------------------------------

def lire_sections(voulus):
    par_mot = collections.defaultdict(list)
    with open(SOURCES / "sections.jsonl", encoding="utf-8") as f:
        for ligne in f:
            # Un filtre grossier avant le décodage : la plupart des lignes ne
            # sont pas voulues, et décoder 400 000 objets pour rien coûte.
            debut = ligne.find('"m":"') + 5
            fin = ligne.find('","', debut)
            if ligne[debut:fin] not in voulus:
                continue
            s = json.loads(ligne)
            if s["m"] in voulus:
                par_mot[s["m"]].append(s)
    return par_mot


GENRES = {"m": "masculin", "f": "féminin", "mf": "masculin et féminin"}


def nature_de(section):
    """« Nom commun » + masculin → « nom masculin »."""
    titre = section["t"]
    genre = section.get("g", "")
    if titre == "Nom commun":
        base = "nom"
    else:
        base = titre[0].lower() + titre[1:]
    if genre and titre in ("Nom commun", "Locution nominale"):
        base += " " + GENRES[genre]
    if "invariable" in section.get("gt", ()) and titre in ("Adjectif", "Nom commun"):
        base += " invariable"
    return base


ABREGES = [
    ("locution nominale", "loc. nom."), ("locution verbale", "loc. verb."),
    ("locution adverbiale", "loc. adv."), ("locution adjectivale", "loc. adj."),
    ("locution-phrase", "loc.-phrase"), ("locution interjective", "loc. interj."),
    ("locution prépositive", "loc. prép."), ("locution conjonctive", "loc. conj."),
    ("locution pronominale", "loc. pron."),
    ("nom masculin et féminin", "n. m. et f."), ("nom masculin", "n. m."),
    ("nom féminin", "n. f."), ("nom", "n."), ("adjectif", "adj."), ("verbe", "v."),
    ("adverbe", "adv."), ("interjection", "interj."), ("préposition", "prép."),
    ("conjonction", "conj."), ("pronom", "pron."), ("onomatopée", "onomat."),
    ("préfixe", "préf."), ("suffixe", "suff."), ("article", "art."),
    ("proverbe", "prov."),
]


def abrege(nature):
    for long_, court in ABREGES:
        if nature.startswith(long_):
            return court
    return nature.split(" ")[0][:10]


def etymologie(paragraphes, plafond):
    """Le premier paragraphe entier, les suivants tant qu'il reste de la place.

    Une étymologie du Wiktionnaire peut courir sur trois écrans (« feu »
    raconte l'indo-européen) ; le premier paragraphe dit presque toujours
    l'essentiel — d'où vient le mot —, les suivants le détail.
    """
    sortie = []
    total = 0
    for rang, texte in enumerate(paragraphes):
        if rang and total + len(texte) > plafond:
            break
        if len(texte) > plafond:
            coupe = texte[:plafond].rsplit(". ", 1)[0]
            if len(coupe) < plafond // 3:
                coupe = texte[:plafond].rsplit(" ", 1)[0]
            texte = coupe.rstrip(" ,;:") + " […]"
        sortie.append(texte)
        total += len(texte)
    return sortie


RE_NUMERO_DE_SENS = re.compile(r"^(?:#|\(|sens\s*)?(\d{1,2})\)?$", re.I)
TITRES_DE_RUBRIQUE = {"ou", "et", "locutions", "locutions nominales", "locutions verbales",
                      "mots", "divers", "plante", "autres", "composés", "dérivés"}


def precision_de(precision, champ):
    """Ce qui accompagne un mot lié, quand cela renseigne.

    Pour un synonyme, c'est le sens auquel il se rattache ; le Wiktionnaire
    l'écrit de cinq façons (« #2 », « Sens 2 », « (2) », « 2 », ou le début
    de la définition), on ramène les numéros à « sens 2 ».

    Pour une locution ou un dérivé, c'est tantôt une explication (« à petit
    feu » — « en faisant durer »), tantôt le titre de la sous-rubrique où la
    page le range (« Locutions », « Mots », « Dérivés de faire »), qui ne dit
    rien sur la fiche. Les explications commencent par une minuscule, les
    titres par une majuscule : c'est le critère.
    """
    if not precision:
        return ""
    numero = RE_NUMERO_DE_SENS.match(precision.strip())
    if numero:
        return "sens " + str(int(numero.group(1)))
    if precision.lower() in ("ou", "et", "d’où", "d'où"):
        return ""
    if champ in ("syn", "ant", "par"):
        return precision
    if not precision[0].islower() or precision.lower() in TITRES_DE_RUBRIQUE             or len(precision) > 70:
        return ""
    return precision


def liens(liste, champ, inconnues):
    """`[mot, précision?, étiquettes?]`, sans champ vide en queue."""
    sortie = []
    for lien in liste:
        mot = lien[0]
        precision = precision_de(lien[1] if len(lien) > 1 else "", champ)
        marques = etiquettes.traduire_liste(lien[2] if len(lien) > 2 else (), inconnues)
        element = [mot]
        if precision or marques:
            element.append(precision)
        if marques:
            element.append(marques)
        sortie.append(element)
    return sortie[:PLAFONDS[champ]]


def reference_courte(reference):
    if len(reference) <= REFERENCE_MAX:
        return reference
    return reference[:REFERENCE_MAX].rsplit(" ", 1)[0].rstrip(",;:(") + "…"


def sens(section, regles, inconnues):
    sortie = []
    for rang, s in enumerate(section["s"][:regles["sens_max"]]):
        nouveau = {"d": s["d"]}
        if s.get("p"):
            nouveau["p"] = s["p"]
        marques = etiquettes.traduire_liste(s.get("r"), inconnues)
        if marques:
            nouveau["r"] = marques
        combien = regles["exemples"][rang] if rang < len(regles["exemples"]) else 0
        exemples = []
        candidats = s.get("x", ())
        for texte, marque, reference in candidats:
            if len(exemples) >= combien:
                break
            # Une citation trop longue ne passe que s'il n'y a rien d'autre
            # pour le premier sens : mieux vaut un long exemple que pas du tout.
            if len(re.findall(r"\w+", texte)) > regles["exemple_mots_max"] \
                    and (exemples or rang > 0 or len(candidats) > 1):
                continue
            exemple = [texte, marque]
            if reference:
                exemple.append(reference_courte(reference))
            exemples.append(exemple)
        if exemples:
            nouveau["x"] = exemples
        if s.get("n"):
            nouveau["n"] = s["n"]
        if s.get("v"):
            nouveau["v"] = s["v"]
        sortie.append(nouveau)
    return sortie


def entree_de(mot, sections, bande, regles, inconnues):
    entree = {"m": mot, "b": bande}
    etymologies = []
    lectures = []
    collectes = {"loc": [], "der": [], "prov": [], "rel": [], "hyper": [], "hypo": []}
    for section in sections:
        lecture = {"n": section["n"], "nat": nature_de(section)}
        if section.get("g"):
            lecture["g"] = section["g"]
        if section.get("api"):
            lecture["api"] = section["api"]
        if section.get("et"):
            texte = etymologie(section["et"], regles["etymologie_max"])
            if texte:
                if texte not in etymologies:
                    etymologies.append(texte)
                lecture["e"] = etymologies.index(texte)
        if section.get("at"):
            lecture["at"] = section["at"]
        formes = []
        present = []
        for graphie, marques in section.get("f", ()):
            if section["n"] == "verb":
                # Le Wiktionnaire donne d'un verbe un extrait de tableau : les
                # participes, le présent, et le passé composé à la première
                # personne. On garde ce qui ne se devine pas toujours — « pris »,
                # « né », « je prends » —, l'auxiliaire qu'on déduit de
                # « j'ai pris » ou « je suis né », et on nomme le tout.
                ensemble = set(marques)
                if {"participle", "past"} <= ensemble and " " not in graphie:
                    element = [graphie, "participe passé"]
                elif {"participle", "present"} <= ensemble and " " not in graphie:
                    element = [graphie, "participe présent"]
                elif ensemble == {"indicative", "present"}:
                    present.append(graphie)
                    continue
                elif {"indicative", "past", "multiword-construction"} <= ensemble:
                    auxiliaire = ("être" if re.match(r"^(je|j’|j')\s*suis\b", graphie)
                                  else "avoir" if re.match(r"^(j’|j')ai\b", graphie) else "")
                    if not auxiliaire:
                        continue
                    element = [auxiliaire, "auxiliaire"]
                else:
                    continue
                if element not in formes:
                    formes.append(element)
                continue
            libelle = etiquettes.etiquette_de_forme(marques)
            element = [graphie, libelle] if libelle else [graphie]
            if graphie == mot or element in formes:
                continue
            formes.append(element)
        if len(present) == 6:
            formes.append([", ".join(present), "présent"])
        if formes:
            lecture["f"] = formes[:8]
        lecture["s"] = sens(section, regles, inconnues)
        for champ in ("syn", "ant", "par"):
            if section.get(champ):
                lecture[champ] = liens(section[champ], champ, inconnues)
        if section.get("no"):
            lecture["no"] = section["no"]
        lectures.append(lecture)

        # Dérivés et locutions sont rangés ensemble par le Wiktionnaire : ce
        # qui a une espace est une locution, le reste un dérivé ou un composé.
        for lien in section.get("der", ()):
            (collectes["loc"] if " " in lien[0] else collectes["der"]).append(lien)
        for champ in ("prov", "rel", "hyper", "hypo"):
            collectes[champ].extend(section.get(champ, ()))

    entree["l"] = lectures
    if etymologies:
        entree["et"] = etymologies
    for champ, liste in collectes.items():
        vus = set()
        unique = []
        for lien in liste:
            if lien[0] in vus or lien[0] == mot:
                continue
            vus.add(lien[0])
            unique.append(lien)
        if unique:
            entree[champ] = liens(unique, champ, inconnues)
    return entree


def apercu(entree):
    """La première définition, courte, pour la liste des résultats."""
    for lecture in entree["l"]:
        for s in lecture["s"]:
            texte = re.sub(r"\s+", " ", s["d"])
            if len(texte) > APERCU_MAX:
                texte = texte[:APERCU_MAX].rsplit(" ", 1)[0].rstrip(",;:(") + "…"
            return texte.replace("\t", " ")
    return ""


# --- Écriture ----------------------------------------------------------------

def prefixe_commun(a, b):
    n = 0
    while n < min(len(a), len(b)) and a[n] == b[n]:
        n += 1
    return n


def ecrire(chemin, texte):
    # LF seulement : un « \r » traînant rendrait des milliers de mots
    # introuvables, sans le moindre signal (vécu sur Wortschatz).
    with open(chemin, "w", encoding="utf-8", newline="") as f:
        f.write(texte)


def json_compact(objet):
    return json.dumps(objet, ensure_ascii=False, separators=(",", ":"))


def construire(meta, renvois, derives, src, formes_brutes, rapport):
    debut = time.time()
    par_forme = src["formes"]
    choisis, expressions, bandes, voies, sans_lien = choisir(meta, renvois, derives, src)
    sections = lire_sections(choisis.keys())
    inconnues = collections.Counter()

    entrees = []
    for mot, priorite in choisis.items():
        if mot not in sections:
            continue
        expression = mot in expressions
        regles = EXPRESSIONS if expression else MOTS
        bande = bandes[mot] if mot in bandes else bande_de(priorite * (15 if expression else 1))
        entree = entree_de(mot, sections[mot], bande, regles, inconnues)
        if expression:
            entree["x"] = 1
        entrees.append((priorite, entree))

    # Le socle : par priorité décroissante, tant que le budget le permet.
    entrees.sort(key=lambda pe: -pe[0])
    socle, suite = [], []
    octets = 0
    for priorite, entree in entrees:
        taille = len(json_compact(entree).encode("utf-8")) + 1
        if octets + taille <= SOCLE_OCTETS:
            socle.append(entree)
            octets += taille
        else:
            suite.append(entree)
    seuil_socle = entrees[len(socle) - 1][0] if socle else 0

    if DOSSIER.exists():
        shutil.rmtree(DOSSIER)
    DOSSIER.mkdir(parents=True)

    # Les vedettes qui « cèdent » — 7ᵉ champ de mots.idx, le lemme auquel elles
    # cèdent : dans un texte, leur graphie mène plutôt à ce lemme, dont elle est
    # aussi la forme, s'il est au moins aussi courant (voir Lexique.resoudre
    # dans js/lexique.js). Le lemme est nommé, et non cherché par l'index des
    # formes, qui mêle des renvois douteux (« trompe » y mène à « je »). Deux
    # cas :
    #
    #   - un mot venu d'ailleurs que Lexique qui est aussi une forme fléchie :
    #     « entrait » (la poutre) et « il entrait », « anime » (le dessin
    #     animé japonais) et « il anime » ;
    #   - un mot de Lexique dont la graphie, dans Lexique même, appartient
    #     surtout à un autre lemme : « est » (le point cardinal) et « il est »,
    #     « vit » et « il vit », « doit » et « il doit ».
    #
    # Sans cela, chaque « il est » d'une citation menait à l'Orient.
    cedent = {}
    normaux = {normal(v): v for v in choisis if v not in expressions}

    def poids_du_lemme(forme, lemme):
        # Ce que Lexique attribue de la forme à ce lemme, sinon sa priorité.
        part = src["repartition"].get(normal(forme), {})
        return (part.get(normal(lemme), 0.0), choisis.get(lemme, 0.0))

    for forme, lemme in formes_brutes:
        if forme in bandes and lemme != forme and lemme in choisis and lemme not in expressions:
            if forme not in cedent or poids_du_lemme(forme, lemme) > poids_du_lemme(forme, cedent[forme]):
                cedent[forme] = lemme
    for mot in choisis:
        if voies.get(mot) != "lexique":
            continue
        n = normal(mot)
        part = src["repartition"].get(n)
        if not part:
            continue
        autres = [(f, lemme) for lemme, f in part.items() if lemme != n and lemme in normaux]
        if autres and max(autres)[0] > part.get(n, 0.0):
            cedent[mot] = normaux[max(autres)[1]]

    # Chaque groupe est trié par clé avant d'être tranché : une tranche couvre
    # alors une plage alphabétique, et les homographes de clé voisinent.
    lignes_index = []
    fichiers = {"index": [], "socle": [], "suite": []}
    vedettes = set()
    formes_du_lemme = set()
    for p, e in entrees:
        for lecture in e["l"]:
            for forme in lecture.get("f", ()):
                formes_du_lemme.add((e["m"], forme[0]))
    presentes = {e["m"] for p, e in entrees}
    cedent = {mot: lemme for mot, lemme in cedent.items()
              if mot in presentes and lemme in presentes and "\t" not in lemme}
    numero = 0
    for groupe, lot_groupe in (("socle", socle), ("suite", suite)):
        lot_groupe.sort(key=lambda e: (cle(e["m"]), e["b"], e["m"]))
        for debut_lot in range(0, len(lot_groupe), TRANCHE):
            lot = lot_groupe[debut_lot:debut_lot + TRANCHE]
            nom_fichier = f"t-{numero:03d}.json"
            ecrire(DOSSIER / nom_fichier, json_compact({"format": FORMAT, "e": lot}))
            fichiers[groupe].append(f"dico/{nom_fichier}")
            for e in lot:
                vedettes.add(e["m"])
                nature = abrege(e["l"][0]["nat"]) if e["l"] else ""
                champs_ = [cle(e["m"]), e["m"], str(numero), str(e["b"]), nature, apercu(e)]
                if e["m"] in cedent:
                    champs_.append(cedent[e["m"]])
                lignes_index.append((cle(e["m"]), e["b"], "\t".join(champs_)))
            numero += 1
    lignes_index.sort(key=lambda l: (l[0], l[1]))
    ecrire(DOSSIER / "mots.idx", "\n".join(l[2] for l in lignes_index) + "\n")
    fichiers["index"].append("dico/mots.idx")

    # Les formes fléchies : seulement celles dont le lemme est une vedette,
    # d'un seul mot, et qui ne se confondent pas avec la clé du lemme.
    #
    # Et seulement celles qu'on rencontre : le Wiktionnaire conjugue tout,
    # jusqu'à « abaissassions », et l'index des formes pesait 4,5 Mo pour
    # 285 000 lignes — chargé en mémoire à chaque ouverture. Une forme que
    # Lexique n'a jamais vue ni dans un film ni dans un livre ne sera pas
    # tapée non plus. Les pluriels et féminins que le lemme énumère lui-même
    # restent tous : ils sont peu nombreux et on les cherche.
    #
    # Un mot venu d'ailleurs que Lexique n'a pas ses formes dans Lexique :
    # pour lui, c'est wordfreq qui dit si l'on écrit « incrémenté ».
    #
    # Le Wiktionnaire mêle à ses renvois des rattachements de hasard —
    # « trompe » à « je », « dû » à « le », « vis » à « bis », « jumelle » à
    # « division » — : on écarte celui qui ne partage pas même l'initiale de
    # la forme quand Lexique range cette forme sous d'autres vedettes. Les
    # formes supplétives restent, Lexique les connaît : « yeux » sous « œil »,
    # « fut » sous « être ». « ma » garde « mon » : même initiale.
    normaux_vedettes = {normal(v) for v in vedettes}
    formes = collections.defaultdict(set)
    ecartees = 0
    for forme, lemme in formes_brutes:
        if lemme not in vedettes or " " in forme or lemme in expressions:
            continue
        part = src["repartition"].get(normal(forme))
        if part and normal(lemme) not in part and cle(forme)[:1] != cle(lemme)[:1] \
                and any(l in normaux_vedettes for l in part):
            ecartees += 1
            continue
        vue = par_forme.get(forme) or par_forme.get(normal(forme))
        if not vue and lemme in bandes:
            vue = src["wordfreq"].get(forme.lower().replace("’", "'"), 0) >= ZIPF_FORME_MIN
        if not vue and (lemme, forme) not in formes_du_lemme:
            continue
        k_forme, k_lemme = cle(forme), cle(lemme)
        if not k_forme or k_forme == k_lemme:
            continue
        formes[k_forme].add(k_lemme)
    lignes_formes = []
    for k_forme in sorted(formes):
        codes = []
        for k_lemme in sorted(formes[k_forme]):
            n = prefixe_commun(k_forme, k_lemme)
            codes.append(f"{n},{k_lemme[n:]}")
        lignes_formes.append(k_forme + "\t" + "|".join(codes))
    ecrire(DOSSIER / "formes.idx", "\n".join(lignes_formes) + "\n")
    fichiers["index"].append("dico/formes.idx")

    # Les expressions par mot : chaque mot plein de l'expression, et le lemme
    # de chacun — « pomme » doit trouver « tomber dans les pommes ».
    par_mot = collections.defaultdict(list)
    liste_expressions = [e for p, e in entrees if e["m"] in expressions]
    liste_expressions.sort(key=lambda e: (e["b"], len(e["m"]), e["m"]))
    for e in liste_expressions:
        cles = set()
        for jeton in jetons(e["m"]):
            k = cle(jeton)
            if len(k) < 2 or k in MOTS_OUTILS:
                continue
            cles.add(k)
            cles.update(formes.get(k, ()))
        for k in cles:
            if k not in MOTS_OUTILS:
                par_mot[k].append(e["m"])
    lignes_expr = [k + "\t" + "|".join(par_mot[k]) for k in sorted(par_mot)]
    ecrire(DOSSIER / "expressions.idx", "\n".join(lignes_expr) + "\n")
    fichiers["index"].append("dico/expressions.idx")

    def poids(liste):
        return sum((DONNEES / f).stat().st_size for f in liste)

    resume = {
        "entrees": len(entrees),
        "mots": len(entrees) - len(liste_expressions),
        "expressions": len(liste_expressions),
        "formes": len(lignes_formes),
        "socle_entrees": len(socle),
        "tranches": numero,
        "fichiers": fichiers,
        "octets": {g: poids(l) for g, l in fichiers.items()},
    }
    rapport.append("── Dictionnaire ──")
    rapport.append(f"  {resume['entrees']} vedettes : {resume['mots']} mots, "
                   f"{resume['expressions']} expressions")
    rapport.append(f"  socle : {len(socle)} vedettes (priorité ≥ {seuil_socle:.2f}), "
                   f"{len(fichiers['socle'])} tranches, {commun.humain(resume['octets']['socle'])}")
    rapport.append(f"  suite : {len(suite)} vedettes, {len(fichiers['suite'])} tranches, "
                   f"{commun.humain(resume['octets']['suite'])}")
    rapport.append(f"  index : {commun.humain(resume['octets']['index'])} — "
                   f"{len(lignes_formes)} formes fléchies, {len(lignes_expr)} mots d'expressions"
                   f" ({ecartees} rattachements de formes démentis par Lexique)")
    par_bande = collections.Counter(e["b"] for p, e in entrees)
    rapport.append("  bandes : " + ", ".join(f"{b}={par_bande[b]}" for b in sorted(par_bande)))
    par_voie = collections.Counter(voies[e["m"]] for p, e in entrees if e["m"] in voies)
    rapport.append("  voies d'entrée des mots : " + ", ".join(
        f"{v}={par_voie[v]}" for v in ("lexique", "grammalecte", "base", "nom"))
        + f" — {len(cedent)} vedettes cèdent leur graphie à un lemme")
    rapport.append("    par exemple : " + ", ".join(
        f"{m} → {cedent[m]}" for m in ("est", "vit", "doit", "sais", "entrait", "anime", "amis")
        if m in cedent))
    for voie in ("base", "nom"):
        exemples = sorted((e["m"] for p, e in entrees if voies.get(e["m"]) == voie), key=cle)
        rapport.append(f"    {voie} : " + ", ".join(exemples[::max(1, len(exemples) // 40)][:40]))
    rapport.append(f"    dont noms sans lien visible avec leur lemme (dits rares) : {len(sans_lien)} — "
                   + ", ".join(sorted(sans_lien, key=lambda m: -src["noms"].get(m, 0))[:40]))
    octets_voie = collections.Counter()
    for p, e in entrees:
        octets_voie[voies.get(e["m"], "expression")] += len(json_compact(e).encode("utf-8"))
    rapport.append("  poids des entrées par voie : " + ", ".join(
        f"{v} {commun.humain(o)}" for v, o in octets_voie.most_common()))
    if inconnues:
        rapport.append("  étiquettes non traduites (les plus fréquentes) : " + ", ".join(
            f"{k}×{n}" for k, n in inconnues.most_common(25)))
    rapport.append(f"  construit en {time.time() - debut:.0f} s")
    print("\n".join(rapport[1:]), flush=True)
    return resume, [e for p, e in entrees], set(e["m"] for e in socle)


def mots_du_jour(entrees, socle):
    """Des mots qui valent d'être découverts : ni trop courants ni obscurs.

    Bande « courant » ou « moins courant », au socle (donc là hors ligne),
    une étymologie, au moins deux sens, au moins un exemple. L'application en
    tire un par jour, toujours le même pour une date donnée.
    """
    retenus = []
    for e in entrees:
        if e["m"] not in socle or e["b"] not in (1, 2) or e.get("x"):
            continue
        if " " in e["m"] or "et" not in e or not e["m"].islower() or len(e["m"]) < 5:
            continue
        tous_sens = [s for l in e["l"] for s in l["s"]]
        if len(tous_sens) < 2 or not any("x" in s for s in tous_sens):
            continue
        retenus.append(e["m"])
    retenus.sort(key=cle)
    return retenus


def main():
    debut = time.time()
    rapport = [f"Construction du {datetime.date.today().isoformat()}"]
    print("Lexique 3.83…", flush=True)
    par_lemme, par_forme, noms, lemmes_des_noms, repartition = lire_lexique()
    print("Grammalecte, wordfreq…", flush=True)
    src = {"lemmes": par_lemme, "formes": par_forme, "noms": noms,
           "lemmes_des_noms": lemmes_des_noms, "repartition": repartition,
           "grammalecte": lire_grammalecte(), "wordfreq": lire_wordfreq()}
    print("Première lecture des sections…", flush=True)
    meta, renvois, derives = premiere_lecture()
    print("Formes fléchies…", flush=True)
    formes_brutes = []
    with open(SOURCES / "formes.tsv", encoding="utf-8") as f:
        for ligne in f:
            morceaux = ligne.rstrip("\n").split("\t")
            if len(morceaux) >= 2:
                formes_brutes.append((morceaux[0], morceaux[1]))
    src["homographes"] = {forme for forme, lemme in formes_brutes if forme != lemme}

    print("Dictionnaire…", flush=True)
    resume, entrees, socle = construire(meta, renvois, derives, src, formes_brutes, rapport)
    du_jour = mots_du_jour(entrees, socle)
    rapport.append(f"  {len(du_jour)} mots du jour possibles")
    for ancien in ("noyau", "complet"):
        if (DONNEES / ancien).exists():
            shutil.rmtree(DONNEES / ancien)
    manifeste = {
        "format": FORMAT,
        "construit": datetime.date.today().isoformat(),
        "sources": {
            "wiktionnaire": "Wiktionnaire, extraction wiktextract publiée par kaikki.org",
            "lexique": "Lexique 3.83",
            "grammalecte": "Dictionnaire orthographique de Grammalecte 7.7 (choix des mots)",
            "wordfreq": "wordfreq 3.1.1 (fréquence des mots absents de Lexique)",
        },
        "bandes": ["très courant", "courant", "moins courant", "rare"],
        "dico": resume,
        "du_jour": du_jour,
    }
    ecrire(DONNEES / "manifeste.json", json.dumps(manifeste, ensure_ascii=False, indent=1))
    rapport.append(f"Total {time.time() - debut:.0f} s")
    ecrire(RAPPORT, "\n".join(rapport) + "\n")
    print(rapport[-2])
    print(rapport[-1])


if __name__ == "__main__":
    sys.exit(main())

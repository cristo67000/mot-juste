#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Construit le dictionnaire de l'application à partir des extraits.

── Ce qui entre, ce qui sort ───────────────────────────────────────────────

Entrent : `sources/sections.jsonl` et `sources/formes.tsv` (voir extraire.py),
et `sources/Lexique383.tsv`, la base de fréquences de Lexique 3.83.

Sort, dans `data/dico/` :

  mots.idx          une ligne par vedette, triée par clé :
                    clé ⇥ vedette ⇥ tranche ⇥ bande ⇥ nature ⇥ aperçu
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

Le tri se fait sur l'usage réel, mesuré par Lexique 3.83 (sous-titres de films
et livres, 47 000 lemmes) : un mot entre s'il y paraît. Cela garde
« atermoiement », « pusillanime », « procrastination », et laisse
« splanchnologie ».

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
    vus = set()
    with open(SOURCES / "Lexique383.tsv", encoding="utf-8") as f:
        lecteur = csv.reader(f, delimiter="\t", quoting=csv.QUOTE_NONE)
        entete = next(lecteur)
        i = {nom: n for n, nom in enumerate(entete)}
        for ligne in lecteur:
            lemme, categorie, forme = ligne[i["lemme"]], ligne[i["cgram"]], ligne[i["ortho"]]
            f_forme = (float(ligne[i["freqfilms2"]] or 0) + float(ligne[i["freqlivres"]] or 0)) / 2
            par_forme[forme] += f_forme
            if (lemme, categorie) in vus:
                continue
            vus.add((lemme, categorie))
            par_lemme[lemme] += (float(ligne[i["freqlemfilms2"]] or 0)
                                 + float(ligne[i["freqlemlivres"]] or 0)) / 2
    return par_lemme, par_forme


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
    return meta, renvois


def est_expression(mot, meta_mot):
    """Une vedette de plusieurs mots, ou une locution par sa nature."""
    if " " in mot:
        return True
    return any(t.startswith(("Locution", "Proverbe")) for t in meta_mot["titres"])


def choisir(meta, renvois, par_lemme, par_forme):
    """Rend {vedette: priorité}, et l'ensemble des expressions.

    La priorité décide de ce qui va dans le socle. Pour un mot, c'est sa
    fréquence. Pour une expression, celle du plus rare de ses mots, divisée :
    « tomber dans les pommes » vaut ce que vaut un mot d'une fréquence de 1,
    ce qui la met au socle ; « mouton des plateaux de l'Est » n'y entre pas.
    """
    choisis = {}
    for mot, m in meta.items():
        if est_expression(mot, m):
            continue
        frequence = par_lemme.get(mot) or par_lemme.get(normal(mot)) or 0.0
        if frequence > 0:
            choisis[mot] = frequence
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
    return choisis, expressions


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


def construire(meta, renvois, par_lemme, par_forme, formes_brutes, rapport):
    debut = time.time()
    choisis, expressions = choisir(meta, renvois, par_lemme, par_forme)
    sections = lire_sections(choisis.keys())
    inconnues = collections.Counter()

    entrees = []
    for mot, priorite in choisis.items():
        if mot not in sections:
            continue
        expression = mot in expressions
        regles = EXPRESSIONS if expression else MOTS
        entree = entree_de(mot, sections[mot], bande_de(priorite * (15 if expression else 1)),
                           regles, inconnues)
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
                lignes_index.append((cle(e["m"]), e["b"], "\t".join(
                    [cle(e["m"]), e["m"], str(numero), str(e["b"]), nature, apercu(e)])))
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
    formes = collections.defaultdict(set)
    for forme, lemme in formes_brutes:
        if lemme not in vedettes or " " in forme or lemme in expressions:
            continue
        if not (par_forme.get(forme) or par_forme.get(normal(forme)))                 and (lemme, forme) not in formes_du_lemme:
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
                   f"{len(lignes_formes)} formes fléchies, {len(lignes_expr)} mots d'expressions")
    bandes = collections.Counter(e["b"] for p, e in entrees)
    rapport.append("  bandes : " + ", ".join(f"{b}={bandes[b]}" for b in sorted(bandes)))
    if inconnues:
        rapport.append("  étiquettes non traduites (les plus fréquentes) : " + ", ".join(
            f"{k}×{n}" for k, n in inconnues.most_common(25)))
    rapport.append(f"  construit en {time.time() - debut:.0f} s")
    print("\n".join(rapport[-8:]), flush=True)
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
    par_lemme, par_forme = lire_lexique()
    print("Première lecture des sections…", flush=True)
    meta, renvois = premiere_lecture()
    print("Formes fléchies…", flush=True)
    formes_brutes = []
    with open(SOURCES / "formes.tsv", encoding="utf-8") as f:
        for ligne in f:
            morceaux = ligne.rstrip("\n").split("\t")
            if len(morceaux) >= 2:
                formes_brutes.append((morceaux[0], morceaux[1]))

    print("Dictionnaire…", flush=True)
    resume, entrees, socle = construire(meta, renvois, par_lemme, par_forme, formes_brutes,
                                        rapport)
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

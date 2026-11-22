#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Le lexique des mots fléchés : data/dico/fleches.idx.

Une grille pleine ne se remplit pas avec les seuls mots des fiches : entre
deux mots longs et rares, il faut des mots courts et courants — « ru », « osé »,
« bec » — pour que chaque case serve. Ce fichier les donne, une ligne par mot,
avec la définition qui servira d'indice :

    clé ⇥ mot ⇥ nature ⇥ bande ⇥ définition ⇥ vedette

triées par clé ; la vedette n'est là que pour une forme — « caveaux »,
« rit » —, c'est la fiche à ouvrir. Il est tiré des tranches déjà construites (data/dico/t-*.json) :
on le refait sans les sources, `python build/fleches.py`, et construire.py
l'appelle à la fin.

── Ce qui entre ────────────────────────────────────────────────────────────

  – des mots d'un seul tenant, accents tombés ;
  – courants ou moins courants (bandes 0 à 2), de 8 lettres au plus : les
    mots longs, ce sont ceux des fiches ; à deux lettres, une courte liste ;
  – noms, adjectifs, verbes, adverbes, et quelques mots-outils ; les pluriels
    et féminins des noms et adjectifs, le présent et les participes des verbes
    aussi — sans eux, une grille pleine ne se ferme presque jamais : il y faut
    des mots de trois ou quatre lettres de toutes les formes, et la moitié des
    mots d'une grille de journal finissent par S ou par E ;
  – pas un mot dont un sens est vulgaire ou injurieux.

── La définition ───────────────────────────────────────────────────────────

Le premier sens qui ne soit ni vieilli, ni régional, ni argotique, ni un renvoi
(« Variante de… ») et qui ne contienne pas le mot lui-même ; à longueur égale,
le plus court des premiers sens, car un indice se lit d'un coup d'œil. Le mot
n'est pas masqué ici : l'application le fait, comme pour les fiches.
"""

import glob
import json
import re
import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import cle  # noqa: E402

RACINE = Path(__file__).resolve().parent.parent
DICO = RACINE / "data" / "dico"
SORTIE = DICO / "fleches.idx"
MANIFESTE = RACINE / "data" / "manifeste.json"

NATURES = [
    ("nom masculin et féminin", "n. m. et f."), ("nom masculin", "n. m."),
    ("nom féminin", "n. f."), ("adjectif", "adj."), ("verbe", "v."),
    ("adverbe", "adv."), ("interjection", "interj."), ("préposition", "prép."),
    ("conjonction", "conj."), ("pronom", "pron."), ("onomatopée", "onomat."),
]
# Ce qui ne fait pas un indice qu'on devine.
MARQUES_ECARTEES = {
    "vieilli", "désuet", "archaïque", "rare", "très rare", "argot", "populaire",
    "Québec", "Canada", "Belgique", "Suisse", "Acadie", "Louisiane", "Afrique",
    "régionalisme", "Réunion", "Antilles", "Nouvelle-Calédonie", "Polynésie",
    "Haïti", "Maghreb", "Liban", "Congo", "Cameroun", "Sénégal", "Lorraine",
    "Provence", "Normandie", "Bretagne", "Midi", "Lyon", "Savoie", "Alsace",
    "Nord", "Wallonie", "Bruxelles", "Luxembourg", "France", "verlan",
    "héraldique", "par plaisanterie", "néologisme", "hapax", "obsolète",
}
# Un seul de ces sens écarte le mot entier.
MARQUES_INTERDITES = {"vulgaire", "injurieux", "raciste", "xénophobe", "homophobe",
                      "misogyne", "offensant", "insultant", "sexualité"}
RENVOIS = ("variante", "pluriel de", "féminin de", "masculin pluriel", "féminin pluriel",
           "forme ", "ancienne", "orthographe", "abréviation", "sigle", "symbole",
           "participe", "première personne", "deuxième personne", "troisième personne",
           "lettre ", "nom de la lettre", "acronyme", "graphie")
MARQUES_NEUTRES = {"familier", "au pluriel", "transitif", "intransitif", "pronominal",
                   "au sens propre", "absolument"}
# Un sens second : il ne passe devant le premier que si celui-ci ne vaut rien.
MARQUES_SECONDES = {"figuré", "par extension", "par analogie", "spécialement", "en particulier",
                    "par métonymie", "ironique", "péjoratif", "par ellipse", "par hyperbole"}
# À deux lettres, les seuls qui fassent un indice : le reste est du bruit —
# lettres d'alphabets, langues de Papouasie, mots-outils indéfinissables.
DEUX_LETTRES = {"an", "os", "nu", "ru", "ex", "if", "as", "ut", "do", "re", "mi", "fa", "la",
                "si", "pi", "ah", "oh", "eh", "ha", "ho", "hi", "na", "go", "ok", "us", "ni",
                "ou", "et", "un", "tu", "il", "on", "va", "ce", "sa", "ma", "ta"}
# Des mots courts qui passent tous les filtres sans faire un indice : sigles,
# verlan, renvois, homographes d'un mot plus connu.
ECARTES = {"avr", "ppp", "svp", "quo", "sah", "nib", "ienb", "mif", "die", "min", "cos",
           "log", "bru", "sis", "tac", "tap", "der", "cre", "sil", "ces", "ana", "rob"}
# Quelques mots-outils dont le Wiktionnaire donne une définition de grammairien
# (« Concatène plusieurs concepts dans une même relation ») : l'indice d'une
# grille de journal.
INDICES = {
    "et": ("et", "conj.", "Conjonction qui relie deux mots ou deux propositions."),
    "la": ("la", "art.", "Article défini féminin."),
    "on": ("on", "pron.", "Pronom sujet : quelqu’un, les gens, ou nous."),
    "re": ("ré", "n. m.", "Deuxième note de la gamme."),
    "ha": ("ha", "interj.", "Cri de surprise ou de rire."),
    "na": ("na", "interj.", "Mot d’enfant buté : c’est comme ça !"),
}
# Des sens exacts, mais qui ne font pas deviner : « Vingt-sixième lettre de
# l’alphabet arabe », « Langue océanienne parlée au Vanuatu ».
BRUIT = re.compile(r"lettre de l[’']alphabet|^Langue .* parlée|^Nom de (la|le) |alphabet morse|^Impulsion")
FORMES = {"pluriel": "pl.", "masculin pluriel": "pl.", "féminin": "f.", "féminin pluriel": "f. pl."}
LONGUEUR = 8       # les mots longs sont ceux des fiches ; une grille se ferme avec des courts
INDICE_MAX = 120


def nature_courte(nat):
    for long_, court in NATURES:
        if nat.startswith(long_):
            return court
    return None


def lisible(mot):
    return 2 <= len(mot) <= 40 and all(c.isalpha() for c in mot) and mot == mot.lower()


def raccourcir(d):
    """Un indice se lit d'un coup d'œil : la définition jusqu'à son premier
    point-virgule ou sa première parenthèse, et au plus INDICE_MAX signes."""
    d = d.split(" Note d’usage")[0].split(" Note : ")[0]
    for signe in (". ", " ; ", " — ", " (", ", dont ", ", qui ", ", et "):
        i = d.find(signe)
        if 18 <= i and len(d) > 60:
            d = d[:i].rstrip(",;:") + "."
            break
    if len(d) > INDICE_MAX:
        d = d[:INDICE_MAX].rsplit(" ", 1)[0].rstrip(",;:") + "…"
    return d.rstrip(" —")


def indice(l, k):
    """Le sens qui servira d'indice et sa note (plus basse, meilleure), ou None.

    Le premier sens, d'ordinaire ; un sens qui contient le mot (« Abeille à
    miel ; insecte… ») ou un sens second — figuré, spécialisé — ne passe devant
    que s'il n'y a pas mieux juste après."""
    meilleur = None
    rang = 0
    for s in l.get("s", []):
        d = " ".join((s.get("d") or "").split())
        if not d or s.get("v") or len(d) < 4 or BRUIT.search(d):
            continue
        marques = set(s.get("r") or [])
        if marques & MARQUES_ECARTEES or d.lower().startswith(RENVOIS):
            continue
        note = rang
        if marques & MARQUES_SECONDES:
            note += 1.2
        elif marques - MARQUES_NEUTRES:
            note += 0.4
        # « Abeille à miel ; insecte porte-aiguillon… » : le mot tombe avec
        # ce qui le précède, l'indice commence après le point-virgule.
        if k in cle(d.split(" ; ")[0]) and " ; " in d:
            d = d.split(" ; ", 1)[1]
            d = d[0].upper() + d[1:]
        court = raccourcir(d)
        if k in cle(court):
            note += 1.5     # masqué à l’écran, mais un indice troué se lit mal
        if not meilleur or note < meilleur[0]:
            meilleur = (note, court)
        rang += 1
        if rang == 5:
            break
    return meilleur


PERSONNES = ["je", "tu", "il", "nous", "vous", "ils"]


def conjugaisons(l):
    """Les formes d'un verbe que donne sa fiche : le présent, les deux
    participes. « je ris, tu ris, il/elle/on rit… » → ris (je, tu), rit (il)…
    La définition reste celle de l'infinitif ; la nature dit la personne."""
    sortie = {}
    for forme in l.get("f") or []:
        if len(forme) < 2:
            continue
        texte, etiquette = forme[0], forme[1]
        if etiquette == "présent":
            for rang, morceau in enumerate(texte.split(", ")[:6]):
                mot = morceau.replace("’", " ").replace("'", " ").split(" ")[-1]
                if lisible(mot):
                    sortie.setdefault(mot, []).append(PERSONNES[rang])
        elif etiquette in ("participe passé", "participe présent") and lisible(texte):
            sortie.setdefault(texte, []).append("p. passé" if etiquette == "participe passé" else "p. présent")
    for mot, qui in sortie.items():
        kf = cle(mot)
        if not kf.isascii() or not kf.isalpha():
            continue
        if qui[0].startswith("p."):
            yield kf, mot, "v., " + qui[0]
        else:
            yield kf, mot, "v., présent (" + ", ".join(qui) + ")"


def main():
    retenus = {}     # clé → (rang, ligne)

    def garder(k, rang, champs):
        if k not in retenus or rang < retenus[k][0]:
            retenus[k] = (rang, champs)

    for chemin in sorted(glob.glob(str(DICO / "t-*.json"))):
        with open(chemin, encoding="utf-8") as f:
            tranche = json.load(f)
        for e in tranche["e"]:
            mot = e["m"]
            bande = e.get("b", 3)
            if bande > 2 or not lisible(mot):
                continue
            k = cle(mot)
            if not k.isascii() or not k.isalpha() or len(k) > LONGUEUR:
                continue
            if (len(k) == 2 and k not in DEUX_LETTRES) or k in ECARTES:
                continue
            if any(set(s.get("r") or []) & MARQUES_INTERDITES for l in e["l"] for s in l.get("s", [])):
                continue
            # La nature qui donne le meilleur indice, la première à égalité.
            choix = None
            for rang_l, l in enumerate(e["l"]):
                nat = nature_courte(l.get("nat") or "")
                x = indice(l, k) if nat else None
                if x and (not choix or x[0] + rang_l * 1.5 < choix[0]):
                    choix = (x[0] + rang_l * 1.5, rang_l, l, nat, x[1])
            if choix:
                _, rang_l, l, nat, d = choix
                garder(k, (0, bande, rang_l), (k, mot, nat, str(bande), d, ""))
                if nat == "v.":
                    for kf, forme, nf in conjugaisons(l):
                        if kf != k and (len(kf) > 2 or bande <= 1) and len(kf) <= LONGUEUR:
                            garder(kf, (2, bande, rang_l), (kf, forme, nf, str(bande), d, mot))
                for forme in l.get("f") or []:
                    if not (nat.startswith("n.") or nat == "adj."):
                        break
                    if len(forme) < 2 or forme[1] not in FORMES or not lisible(forme[0]):
                        continue
                    kf = cle(forme[0])
                    if kf == k or not kf.isascii() or not kf.isalpha() or not 3 <= len(kf) <= LONGUEUR:
                        continue
                    if k[:3] != kf[:3]:      # « œil » → « yeux » : la définition ne dit plus le mot
                        continue
                    nf = (nat.split(" et ")[0] if nat.startswith("n.") else nat).rstrip(".")
                    nf = nf + ". " + FORMES[forme[1]]
                    if nat.startswith("n.") and FORMES[forme[1]] == "f.":
                        continue          # « une chatte » : déjà une vedette, souvent
                    garder(kf, (1, bande, rang_l), (kf, forme[0], nf, str(bande), d, mot))

    for k, (mot, nature, d) in INDICES.items():
        retenus[k] = ((0, 0, 0), (k, mot, nature, "0", d, ""))
    lignes = ["\t".join(champs).rstrip("\t") for _, (_, champs) in sorted(retenus.items())]
    with open(SORTIE, "w", encoding="utf-8", newline="") as f:
        f.write("\n".join(lignes) + "\n")

    with open(MANIFESTE, encoding="utf-8") as f:
        manifeste = json.load(f)
    manifeste["dico"]["fleches"] = len(lignes)
    fichiers = manifeste["dico"]["fichiers"]
    if "dico/fleches.idx" not in fichiers["index"]:
        fichiers["index"].append("dico/fleches.idx")
    # Il est rangé avec les index : pré-chargé à l'installation, hors ligne
    # dès le premier jour — sans lui, pas de grille.
    manifeste["dico"]["octets"]["index"] = sum((DICO.parent / f).stat().st_size for f in fichiers["index"])
    with open(MANIFESTE, "w", encoding="utf-8", newline="") as f:
        f.write(json.dumps(manifeste, ensure_ascii=False, indent=1))

    par_longueur = {}
    for k in retenus:
        par_longueur[len(k)] = par_longueur.get(len(k), 0) + 1
    print(f"{len(lignes)} mots pour les fléchés, {SORTIE.stat().st_size // 1024} Ko")
    print("  par longueur : " + ", ".join(f"{n}:{par_longueur[n]}" for n in sorted(par_longueur)))


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Vérifie les données construites, puis lance les épreuves JavaScript.

  - les clés de Python et de JavaScript sont identiques (commun.cle et
    Lexique.cle, sur les cas de contrôle et sur 5 000 vedettes) ;
  - mots.idx est trié, sans retour chariot, et chaque ligne mène à une
    entrée qui existe dans la tranche annoncée ;
  - formes.idx est trié et chacun de ses lemmes est une clé de mots.idx ;
  - expressions.idx ne cite que des vedettes existantes ;
  - le manifeste décrit exactement les fichiers présents, à l'octet près ;
  - les citations marquées le sont sur un mot.

    python build/verifier.py
"""
import json
import subprocess
import sys
from pathlib import Path

import commun
from commun import cle

RACINE = Path(__file__).resolve().parent.parent
DONNEES = RACINE / "data"

anomalies = []


def signaler(message):
    anomalies.append(message)
    print("  ✗", message)


def lire_idx(nom):
    texte = (DONNEES / "dico" / nom).read_bytes()
    if b"\r" in texte:
        signaler(f"{nom} contient des retours chariot")
    return texte.decode("utf-8").rstrip("\n").split("\n")


def verifier_cles(vedettes):
    cas = [c for c, _ in commun.CAS_DE_CONTROLE] + vedettes[:5000]
    sortie = subprocess.run(["node", str(RACINE / "build" / "essais.mjs"), "--cles"],
                            input=json.dumps(cas), capture_output=True, text=True, encoding="utf-8")
    if sortie.returncode:
        signaler("essais.mjs --cles a échoué : " + sortie.stderr[:300])
        return
    cles_js = json.loads(sortie.stdout)
    ecarts = [(c, cle(c), j) for c, j in zip(cas, cles_js) if cle(c) != j]
    for entree, attendu in commun.CAS_DE_CONTROLE:
        if cle(entree) != attendu:
            signaler(f"cle({entree!r}) = {cle(entree)!r}, attendu {attendu!r}")
    if ecarts:
        signaler(f"{len(ecarts)} clés diffèrent entre Python et JavaScript, ex. {ecarts[:3]}")
    else:
        print(f"  ✓ clés identiques en Python et en JavaScript ({len(cas)} cas)")


def main():
    manifeste = json.loads((DONNEES / "manifeste.json").read_text(encoding="utf-8"))
    d = manifeste["dico"]

    # Les fichiers annoncés sont là, et pèsent ce qu'on dit.
    for groupe, liste in d["fichiers"].items():
        total = 0
        for f in liste:
            chemin = DONNEES / f
            if not chemin.exists():
                signaler(f"fichier annoncé absent : {f}")
                continue
            total += chemin.stat().st_size
        if total != d["octets"][groupe]:
            signaler(f"{groupe} : {total} octets sur le disque, {d['octets'][groupe]} au manifeste")
    presents = {p.name for p in (DONNEES / "dico").iterdir()}
    annonces = {Path(f).name for liste in d["fichiers"].values() for f in liste}
    if presents - annonces:
        signaler(f"fichiers non annoncés : {sorted(presents - annonces)[:5]}")

    # mots.idx
    lignes = lire_idx("mots.idx")
    if len(lignes) != d["entrees"]:
        signaler(f"mots.idx : {len(lignes)} lignes, {d['entrees']} entrées au manifeste")
    cles_idx = [l.split("\t")[0] for l in lignes]
    if cles_idx != sorted(cles_idx):
        signaler("mots.idx n'est pas trié")
    tranches = {}
    vedettes = []
    for ligne in lignes:
        champs_ = ligne.split("\t")
        if len(champs_) != 6:
            signaler(f"ligne d'index mal formée : {ligne[:80]!r}")
            continue
        k, mot, tranche, bande, nature, apercu = champs_
        vedettes.append(mot)
        if k != cle(mot):
            signaler(f"clé {k!r} ≠ cle({mot!r})")
        tranches.setdefault(int(tranche), set()).add(mot)
    marques_fausses = 0
    for numero, attendus in sorted(tranches.items()):
        contenu = json.loads((DONNEES / "dico" / f"t-{numero:03d}.json").read_text(encoding="utf-8"))
        if contenu.get("format") != manifeste["format"]:
            signaler(f"t-{numero:03d}.json : format {contenu.get('format')}")
        dedans = {e["m"] for e in contenu["e"]}
        if attendus - dedans:
            signaler(f"t-{numero:03d}.json : {len(attendus - dedans)} vedettes manquantes")
        for e in contenu["e"]:
            for l in e["l"]:
                for s in l["s"]:
                    for x in s.get("x", ()):
                        texte, marque = x[0], x[1]
                        if marque and not (0 <= marque[0] < marque[1] <= len(texte)
                                           and texte[marque[0]:marque[1]].strip()):
                            marques_fausses += 1
    if marques_fausses:
        signaler(f"{marques_fausses} marques de citation hors du texte")
    print(f"  ✓ mots.idx : {len(lignes)} vedettes, {len(tranches)} tranches relues")

    # formes.idx
    connues = set(cles_idx)
    formes = lire_idx("formes.idx")
    cles_formes = [l.split("\t")[0] for l in formes]
    if cles_formes != sorted(cles_formes):
        signaler("formes.idx n'est pas trié")
    orphelines = 0
    for ligne in formes:
        k, codes = ligne.split("\t")
        for code in codes.split("|"):
            n, reste = code.split(",", 1)
            if k[:int(n)] + reste not in connues:
                orphelines += 1
    if orphelines:
        signaler(f"formes.idx : {orphelines} lemmes introuvables")
    print(f"  ✓ formes.idx : {len(formes)} formes")

    # expressions.idx
    toutes = set(vedettes)
    inconnues = 0
    lignes_expr = lire_idx("expressions.idx")
    for ligne in lignes_expr:
        mot, liste = ligne.split("\t")
        inconnues += sum(1 for v in liste.split("|") if v not in toutes)
    if inconnues:
        signaler(f"expressions.idx : {inconnues} vedettes inconnues")
    print(f"  ✓ expressions.idx : {len(lignes_expr)} mots")

    # Les mots du jour sont au socle.
    socle = set()
    for f in d["fichiers"]["socle"]:
        socle |= {e["m"] for e in json.loads((DONNEES / f).read_text(encoding="utf-8"))["e"]}
    hors = [m for m in manifeste["du_jour"] if m not in socle]
    if hors:
        signaler(f"{len(hors)} mots du jour hors du socle")

    verifier_cles(vedettes)

    print("Épreuves JavaScript :")
    epreuve = subprocess.run(["node", str(RACINE / "build" / "essais.mjs")],
                             capture_output=True, text=True, encoding="utf-8")
    print("  " + epreuve.stdout.strip().split("\n")[-1])
    if epreuve.returncode:
        signaler("build/essais.mjs a échoué")
        print(epreuve.stdout)

    print(f"\n{'Aucune anomalie.' if not anomalies else str(len(anomalies)) + ' anomalie(s).'}")
    sys.exit(1 if anomalies else 0)


if __name__ == "__main__":
    main()

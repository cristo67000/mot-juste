#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Récupération des sources du Mot juste.

Rien de ce qui est téléchargé ici n'est publié tel quel : ce sont les matières
premières, `extraire.py` puis `construire.py` en tirent le dictionnaire de
l'application. Le dossier `build/sources/` pèse environ 1 Go et n'a pas sa
place dans le dépôt (voir .gitignore).

  wiktionnaire-fr.jsonl.gz   le Wiktionnaire francophone intégral, extrait par
                             wiktextract et publié sur kaikki.org (≈ 700 Mo)
  Lexique383.tsv             Lexique 3.83, fréquences d'usage (≈ 25 Mo)

Provenance et licences : voir SOURCES.md, à côté de ce fichier.

Usage :
    python build/telecharger.py            # ne retélécharge pas ce qui est là
    python build/telecharger.py --forcer
"""

import argparse
import sys
import urllib.request
from pathlib import Path

import commun  # noqa: F401 — règle l'encodage de la console

RACINE = Path(__file__).resolve().parent
SOURCES = RACINE / "sources"
AGENT = "Le-Mot-juste-build/1.0 (dictionnaire de français hors ligne)"

FICHIERS = {
    "wiktionnaire-fr.jsonl.gz": "https://kaikki.org/frwiktionary/raw-wiktextract-data.jsonl.gz",
    "Lexique383.tsv": "http://www.lexique.org/databases/Lexique383/Lexique383.tsv",
}


def telecharger(nom, url):
    destination = SOURCES / nom
    provisoire = destination.with_suffix(destination.suffix + ".partiel")
    requete = urllib.request.Request(url, headers={"User-Agent": AGENT})
    with urllib.request.urlopen(requete, timeout=120) as reponse, open(provisoire, "wb") as f:
        total = int(reponse.headers.get("Content-Length") or 0)
        recu = 0
        while True:
            bloc = reponse.read(1 << 20)
            if not bloc:
                break
            f.write(bloc)
            recu += len(bloc)
            if total:
                print(f"\r  {nom} : {commun.humain(recu)} / {commun.humain(total)}", end="", flush=True)
        date = reponse.headers.get("Last-Modified", "")
    provisoire.replace(destination)
    print(f"\r  {nom} : {commun.humain(recu)} — mouture annoncée : {date or 'inconnue'}")


def main():
    analyseur = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    analyseur.add_argument("--forcer", action="store_true")
    options = analyseur.parse_args()
    SOURCES.mkdir(parents=True, exist_ok=True)
    for nom, url in FICHIERS.items():
        if (SOURCES / nom).exists() and not options.forcer:
            print(f"  {nom} : déjà là")
            continue
        telecharger(nom, url)


if __name__ == "__main__":
    sys.exit(main())

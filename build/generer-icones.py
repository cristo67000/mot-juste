# -*- coding: utf-8 -*-
"""Génère les icônes et l'image d'aperçu du Mot juste.

Dessin : un « M » italique à empattements, couleur crème, sur le bordeaux de
l'application, souligné d'un trait d'or — la lettre d'un dictionnaire imprimé,
et le trait qu'on tire sous le mot juste. Rien d'autre : à 48 pixels sur un
écran de téléphone, tout détail supplémentaire devient une tache.

Dessiné au quadruple de la taille finale puis réduit : Pillow ne lisse pas les
bords, le suréchantillonnage s'en charge.

    python build/generer-icones.py
"""
import os

from PIL import Image, ImageDraw, ImageFont

ICI = os.path.dirname(os.path.abspath(__file__))
SORTIE = os.path.join(os.path.dirname(ICI), "icons")

BORDEAUX = (123, 45, 58)
CREME = (251, 248, 243)
OR = (214, 170, 92)
E = 4

POLICES = [r"C:\Windows\Fonts\georgiaz.ttf", r"C:\Windows\Fonts\palabi.ttf",
           "/usr/share/fonts/truetype/dejavu/DejaVuSerif-BoldItalic.ttf"]


def police(taille):
    for chemin in POLICES:
        if os.path.exists(chemin):
            return ImageFont.truetype(chemin, taille)
    return ImageFont.load_default()


def icone(cote, masquable=False):
    grand = cote * E
    image = Image.new("RGB", (grand, grand), BORDEAUX)
    dessin = ImageDraw.Draw(image)
    # Une icône « masquable » peut être rognée en cercle : tout doit tenir
    # dans les 80 % du centre.
    echelle = 0.62 if masquable else 0.78
    f = police(int(grand * echelle))
    boite = dessin.textbbox((0, 0), "M", font=f)
    largeur, hauteur = boite[2] - boite[0], boite[3] - boite[1]
    x = (grand - largeur) / 2 - boite[0]
    y = (grand - hauteur) / 2 - boite[1] - grand * 0.05
    dessin.text((x, y), "M", font=f, fill=CREME)
    epaisseur = max(2, int(grand * 0.035))
    trait_y = y + boite[3] + grand * 0.045
    marge = grand * (0.30 if masquable else 0.22)
    dessin.rounded_rectangle([marge, trait_y, grand - marge, trait_y + epaisseur],
                             radius=epaisseur // 2, fill=OR)
    return image.resize((cote, cote), Image.LANCZOS)


def apercu():
    """L'image qu'affichent les messageries quand on partage le lien."""
    l, h = 1200, 630
    image = Image.new("RGB", (l * 2, h * 2), BORDEAUX)
    dessin = ImageDraw.Draw(image)
    logo = icone(360).resize((520, 520), Image.LANCZOS)
    image.paste(logo, (150, (h * 2 - 520) // 2))
    titre = police(170)
    dessin.text((780, 330), "Le Mot juste", font=titre, fill=CREME)
    sous = ImageFont.truetype(r"C:\Windows\Fonts\georgia.ttf", 64) \
        if os.path.exists(r"C:\Windows\Fonts\georgia.ttf") else police(64)
    lignes = ["Dictionnaire de français hors ligne",
              "étymologie · sens · synonymes · contraires",
              "citations · locutions · fiches de révision"]
    for i, ligne in enumerate(lignes):
        dessin.text((790, 590 + i * 92), ligne, font=sous, fill=CREME if i == 0 else OR)
    return image.resize((l, h), Image.LANCZOS)


def main():
    os.makedirs(SORTIE, exist_ok=True)
    icone(192).save(os.path.join(SORTIE, "icon-192.png"), optimize=True)
    icone(512).save(os.path.join(SORTIE, "icon-512.png"), optimize=True)
    icone(512, masquable=True).save(os.path.join(SORTIE, "icon-maskable-512.png"), optimize=True)
    apercu().save(os.path.join(SORTIE, "apercu-1200x630.png"), optimize=True)
    print("icônes écrites dans", SORTIE)


if __name__ == "__main__":
    main()

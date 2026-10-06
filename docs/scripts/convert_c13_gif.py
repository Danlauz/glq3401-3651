"""Convertit `C13_SIS_animation.gif` (≈58 Mo) en `C13_SIS_animation.webm`.

Objectif performance (cf. rapport phase 3 §4) : ramener le poids du
chapitre 13 de ~73 Mo à ~5 Mo, sans perte d'intention pédagogique.

Mode d'emploi
-------------
::

    pip install imageio imageio-ffmpeg
    python scripts/convert_c13_gif.py

Le script utilise `imageio-ffmpeg` qui embarque un binaire ffmpeg
portable — pas besoin d'installer ffmpeg manuellement.

Le fichier WebM produit est codé en VP9 avec un débit cible adapté
à un usage web (taille typique 2–5 Mo). Le GIF original n'est PAS
supprimé : c'est à l'utilisateur de le faire après vérification visuelle.

Sortie
------
- ``chapters/C13/images/C13_SIS_animation.webm`` : vidéo principale.
- ``chapters/C13/images/C13_SIS_animation_poster.png`` : poster statique
  (première frame) pour les balises ``<video poster=…>``.
"""
from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GIF = ROOT / "chapters" / "C13" / "images" / "C13_SIS_animation.gif"
WEBM = GIF.with_suffix(".webm")
POSTER = GIF.parent / "C13_SIS_animation_poster.png"


def trouver_ffmpeg() -> str | None:
    """Retourne le chemin du binaire ffmpeg (système ou imageio-ffmpeg)."""
    # 1) ffmpeg système
    exe = shutil.which("ffmpeg")
    if exe:
        return exe
    # 2) imageio-ffmpeg (binaire embarqué)
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        return None


def convertir(gif: Path, webm: Path, poster: Path,
              bitrate: str = "1500k", largeur_max: int = 960) -> bool:
    """Convertit le GIF en WebM (VP9) et extrait la première frame en PNG."""
    ffmpeg = trouver_ffmpeg()
    if ffmpeg is None:
        print("✗ ffmpeg introuvable. Installer avec : pip install imageio-ffmpeg",
              file=sys.stderr)
        return False

    if not gif.exists():
        print(f"✗ GIF source absent : {gif}", file=sys.stderr)
        return False

    print(f"→ Conversion {gif.name} ({gif.stat().st_size // 1024} ko) → WebM …")

    # 1) GIF → WebM (VP9). On limite la largeur à 960 px pour le web.
    #    Le filtre `palette` est inutile pour WebM (palette riche supportée).
    cmd_webm = [
        ffmpeg, "-y", "-i", str(gif),
        "-c:v", "libvpx-vp9",
        "-b:v", bitrate,
        "-pix_fmt", "yuv420p",
        "-vf", f"scale={largeur_max}:-2",
        "-an",                   # pas d'audio
        str(webm),
    ]
    r = subprocess.run(cmd_webm, capture_output=True, text=True)
    if r.returncode != 0:
        print(f"✗ Conversion WebM échouée :\n{r.stderr[-800:]}", file=sys.stderr)
        return False

    print(f"  ✓ {webm.name} ({webm.stat().st_size // 1024} ko)")

    # 2) Première frame → PNG (poster pour la balise <video>)
    cmd_poster = [
        ffmpeg, "-y", "-i", str(gif),
        "-vframes", "1",
        "-vf", f"scale={largeur_max}:-2",
        str(poster),
    ]
    r = subprocess.run(cmd_poster, capture_output=True, text=True)
    if r.returncode != 0:
        print(f"✗ Extraction poster échouée :\n{r.stderr[-400:]}", file=sys.stderr)
        return False

    print(f"  ✓ {poster.name} ({poster.stat().st_size // 1024} ko)")
    return True


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--bitrate", default="1500k",
                        help="Débit cible WebM (par défaut : 1500k).")
    parser.add_argument("--largeur-max", type=int, default=960,
                        help="Largeur maximale en pixels (par défaut : 960).")
    args = parser.parse_args(argv)

    return 0 if convertir(GIF, WEBM, POSTER, args.bitrate, args.largeur_max) else 1


if __name__ == "__main__":   # pragma: no cover
    sys.exit(main())

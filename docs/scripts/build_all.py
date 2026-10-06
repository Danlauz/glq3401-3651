"""Script maitre : produit les QUATRE sorties du projet en une seule commande.

1. PDF complet du livre        -> docs/Geostatistique-et-geologie-miniere.pdf
2. Word complet du livre       -> docs/Geostatistique-et-geologie-miniere.docx
3. PDF par chapitre            -> docs/chapters/CNN/CNN-<slug>.pdf
4. Word par chapitre           -> docs/chapters/CNN/CNN-<slug>.docx

(Le site HTML complet est egalement produit par l'etape 1.)

Usage
-----
    python scripts/build_all.py                 # tout : livre + chapitres
    python scripts/build_all.py --book-only     # livre complet seulement
    python scripts/build_all.py --chapters-only # chapitres seulement
    python scripts/build_all.py --format pdf    # PDF seulement (livre + chapitres)

Prerequis
---------
- Le binaire `quarto` doit etre dans le PATH.
- L'environnement Python du projet doit etre installe (pip install -e .[all])
  pour que le moteur jupyter de Quarto fonctionne.

Remarques
---------
- L'etape 1 (livre complet) rend tous les formats declares dans _quarto.yml
  (html, pdf, docx). C'est l'equivalent d'un `quarto render` standard.
- L'etape 2 (chapitres) delegue a build_chapter_exports.py.
- Si un chapitre individuel echoue (ex. erreur de rendu), le script continue
  les autres et signale le bilan a la fin.
"""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def rendre_livre_complet(formats: list[str]) -> bool:
    """Lance `quarto render` pour le livre complet (tous formats ou un sous-ensemble)."""
    # On force explicitement --to : un `quarto render` nu ne produit parfois
    # que le HTML. Avec --format all on rend html + pdf + docx du livre complet.
    cibles = "html,pdf,docx" if set(formats) == {"pdf", "docx"} else ",".join(formats)
    cmd = ["quarto", "render", "--to", cibles]
    print("=" * 60)
    print("ETAPE 1/2 — Rendu du livre complet (quarto render)")
    print("=" * 60)
    try:
        result = subprocess.run(cmd, cwd=ROOT)
    except FileNotFoundError:
        print("✗ binaire 'quarto' introuvable dans le PATH", file=sys.stderr)
        return False
    return result.returncode == 0


def rendre_chapitres(formats: list[str]) -> bool:
    """Delegue la production par chapitre a build_chapter_exports.py."""
    print()
    print("=" * 60)
    print("ETAPE 2/2 — Rendu par chapitre")
    print("=" * 60)
    fmt_arg = "all" if set(formats) == {"pdf", "docx"} else formats[0]
    cmd = [sys.executable, str(ROOT / "scripts" / "build_chapter_exports.py"),
           "--format", fmt_arg]
    result = subprocess.run(cmd, cwd=ROOT)
    return result.returncode == 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    g = parser.add_mutually_exclusive_group()
    g.add_argument("--book-only", action="store_true",
                   help="Produire uniquement le livre complet.")
    g.add_argument("--chapters-only", action="store_true",
                   help="Produire uniquement les chapitres individuels.")
    parser.add_argument("--format", choices=["pdf", "docx", "all"], default="all",
                        help="Format(s) a produire (defaut : pdf + docx).")
    args = parser.parse_args(argv)

    formats = ["pdf", "docx"] if args.format == "all" else [args.format]

    ok = True
    if not args.chapters_only:
        ok = rendre_livre_complet(formats) and ok
    if not args.book_only:
        ok = rendre_chapitres(formats) and ok

    print()
    print("=" * 60)
    print("Termine." if ok else "Termine avec des erreurs (voir ci-dessus).")
    print("=" * 60)
    return 0 if ok else 1


if __name__ == "__main__":   # pragma: no cover
    sys.exit(main())

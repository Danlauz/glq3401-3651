"""Point d'entree CLI : geostat-polymtl-precompute --chapter C01 C06 ...

Lance les scripts de pre-calcul des widgets pour les chapitres donnes.
Sortie par defaut : _assets/<chap>/ a la racine du projet.
Quarto recopie automatiquement ces fichiers vers docs/_assets/ via la
directive `resources` dans _quarto.yml.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path


def _build_registre():
    """Construit le registre des taches. Imports paresseux."""

    def c01_blockmodel(out: Path, use_gzip: bool):
        from geostat_polymtl.precompute import c01_blockmodel as mod
        a = ["--output", str(out)]
        if use_gzip:
            a.append("--gzip")
        mod.main(a)

    def c06_support(out: Path, use_gzip: bool):
        from geostat_polymtl.precompute import c06_support as mod
        a = ["--output", str(out)]
        if use_gzip:
            a.append("--gzip")
        mod.main(a)

    def c06_information(out: Path, use_gzip: bool):
        from geostat_polymtl.precompute import c06_information as mod
        a = ["--output", str(out)]
        if use_gzip:
            a.append("--gzip")
        mod.main(a)

    def c04c05_champs(out: Path, use_gzip: bool):
        from geostat_polymtl.precompute import c04c05_champs as mod
        a = ["--output", str(out)]
        if use_gzip:
            a.append("--gzip")
        mod.main(a)

    return {
        "C01": [("blockmodel", c01_blockmodel)],
        "C03": [],   # widgets « live JS » : calculs portes + verifies par golden vectors
        # C04 produit le bundle de champs GFFTMA partage avec C05 (chemin _assets/c04/champs.json)
        "C04": [("champs_gfftma", c04c05_champs)],
        "C05": [],   # widgets C05 chargent le bundle produit par C04
        "C06": [("effet_support", c06_support),
                ("effet_information", c06_information)],
        "C07": [],
        "C08": [],
        "C09": [],
        "C12": [],
        "C13": [],
    }


def main(argv=None) -> int:
    REGISTRE = _build_registre()
    parser = argparse.ArgumentParser(
        description="Lance les scripts de pre-calcul des widgets."
    )
    parser.add_argument(
        "--chapter", "-c", nargs="*", default=list(REGISTRE),
        help="Chapitres a traiter (ex. C01 C06).",
    )
    parser.add_argument(
        "--out", "-o", type=Path, default=Path("_assets"),
        help="Racine de sortie (default: _assets/ ; recopie vers docs/ via Quarto).",
    )
    parser.add_argument(
        "--gzip", action="store_true",
        help="Produire des .json.gz au lieu de .json.",
    )
    args = parser.parse_args(argv)

    print(f"Pre-calcul widgets (gzip={args.gzip}, out={args.out})")
    print(f"  Chapitres : {', '.join(args.chapter)}")
    print()

    nb = 0
    for chap in args.chapter:
        if chap not in REGISTRE:
            print(f"  ! {chap} inconnu", file=sys.stderr)
            continue
        taches = REGISTRE[chap]
        if not taches:
            print(f"  - {chap} : rien a precalculer (live JS).")
            continue
        out = args.out / chap.lower()
        for nom, fn in taches:
            print(f"  > {chap} / {nom}")
            try:
                fn(out, args.gzip)
                nb += 1
            except Exception as e:
                print(f"    ECHEC : {e}", file=sys.stderr)
    print()
    print(f"Termine. {nb} tache(s).")
    return 0


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())

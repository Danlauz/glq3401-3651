"""Genere un PDF et un DOCX par chapitre — methode du rendu ISOLE.

Pourquoi un rendu isole ?
-------------------------
Le projet est de type `book` (voir _quarto.yml). Quarto NE SUPPORTE PAS le
rendu d'un fichier individuel dans un projet book : `quarto render
chapters/C07/index.qmd` echoue ou rend le livre entier. Pour contourner cette
limitation proprement, ce script :

  1. copie le contenu de chaque chapitre (index.qmd + sections + images +
     widgets + styles + fonts) dans un repertoire TEMPORAIRE situe HORS de
     l'arborescence du projet (pour que Quarto ne remonte pas jusqu'au
     _quarto.yml du book) ;
  2. y depose un _quarto.yml STANDALONE (document simple, pas book) ;
  3. lance `quarto render index.qmd --to pdf|docx` dans ce repertoire isole ;
  4. recupere le fichier produit et le range dans `exports/CNN/CNN_<Titre>.<fmt>` ;
  5. copie aussi le resultat dans `docs/exports/CNN/` pour que les boutons de
     telechargement du site web fonctionnent.

Les chapitres ne contiennent AUCUN bloc {python} executable (verifie) : on peut
donc desactiver l'execution (execute.enabled=false), ce qui evite d'avoir besoin
de l'environnement Python ou du cache _freeze/.

Usage
-----
    python scripts/build_chapter_exports.py             # tous, pdf + docx
    python scripts/build_chapter_exports.py C07 C09     # quelques chapitres
    python scripts/build_chapter_exports.py --format pdf    # pdf seulement
    python scripts/build_chapter_exports.py --keep-build    # garder les dossiers temp (debug)

Prerequis
---------
- `quarto` dans le PATH.
- Pour le PDF : une distribution LaTeX (TinyTeX via `quarto install tinytex`).
  Les memes polices que le livre sont utilisees (TeX Gyre Termes, fontdir=fonts).
"""
from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EXPORTS = ROOT / "exports"                 # dossier de travail (source)
DOCS_EXPORTS = ROOT / "docs" / "exports"   # copie servie par le site

# Garde anti-recursion (si jamais lance via un hook post-render).
_GUARD = "GEOSTAT_NO_CHAPTER_EXPORT"

# slug -> nom de fichier lisible (sans espaces).
CHAPITRES: dict[str, str] = {
    "C01": "NI43101",
    "C02": "Lane",
    "C03": "Gy",
    "C04": "Traitement_statistique",
    "C05": "Methodes_conventionnelles",
    "C06": "Effets",
    "C07": "Variogramme",
    "C08": "Variance_bloc",
    "C09": "Krigeage",
    "C10": "Cokrigeage",
    "C11": "Indicatrices",
    "C12": "Simulations",
    "C13": "Multipoints",
}

# En-tete LaTeX standalone (adapte de _quarto.yml, version "article").
_PDF_HEADER = (
    r"\usepackage[top=2.5cm, bottom=3cm, inner=3cm, outer=2.5cm, footskip=1cm]{geometry}"
    "\n      \\usepackage{microtype}"
    "\n      \\definecolor{navyblue}{RGB}{0,0,128}"
)


def _quarto_yml_standalone(numero: int) -> str:
    """Contenu du _quarto.yml standalone (document simple, pas book).

    ``numero`` = numero GLOBAL du chapitre (1..13). Comme le rendu isole est un
    « article » (pas un book), la numerotation repart a 1 et perd le prefixe de
    chapitre. On le retablit en redefinissant ``\\thesection`` = ``N.<section>``
    (cette redefinition se propage a ``\\thesubsection`` = ``N.1.1`` et
    ``\\thesubsubsection`` = ``N.1.1.1``, car chaque niveau prefixe le precedent).
    ``secnumdepth = 1`` ne numerote QUE les sections (ex. 5.1, 5.2), comme le
    site (number-depth: 2). Les sous-sections restent listees dans la TdM mais
    sans numero : cela evite qu'un atelier {.unnumbered} pose au milieu d'une
    section remette le compteur de sous-sections a zero.
    """
    entete = (
        _PDF_HEADER
        + "\n      \\setcounter{secnumdepth}{1}"
        + f"\n      \\renewcommand{{\\thesection}}{{{numero}.\\arabic{{section}}}}"
    )
    return (
        "lang: fr\n"
        'toc-title: "Table des matieres"\n'
        "bibliography: Book.bib\n"
        "link-citations: true\n"
        "format:\n"
        "  pdf:\n"
        "    documentclass: scrartcl\n"
        "    papersize: a4\n"
        "    fontsize: 11pt\n"
        '    mainfont: "TeX Gyre Termes"\n'
        '    monofont: "Latin Modern Mono"\n'
        "    fontdir: fonts\n"
        "    toc: true\n"
        "    toc-depth: 4\n"
        "    number-sections: true\n"
        "    number-depth: 2\n"
        "    colorlinks: true\n"
        "    linkcolor: navyblue\n"
        "    urlcolor: navyblue\n"
        "    citecolor: navyblue\n"
        "    header-includes: |\n"
        f"      {entete}\n"
        "  docx:\n"
        "    toc: true\n"
        "    toc-depth: 4\n"
        "    number-sections: true\n"
        "    number-depth: 2\n"
        "    reference-doc: styles/quarto-academic-template.docx\n"
        "execute:\n"
        "  enabled: false\n"
        "number-equations: true\n"
    )


def _preparer_build(slug: str, build: Path) -> None:
    """Copie tout le necessaire du chapitre dans le repertoire de build isole."""
    src_dir = ROOT / "chapters" / slug

    # index.qmd + sections NN-XX.qmd
    shutil.copy(src_dir / "index.qmd", build / "index.qmd")
    for f in sorted(src_dir.glob("[0-9]*-*.qmd")):
        shutil.copy(f, build / f.name)

    # images : copie complete (assets, aucun .qmd a scanner)
    if (src_dir / "images").is_dir():
        shutil.copytree(src_dir / "images", build / "images")
    # widget : copier UNIQUEMENT les .qmd a plat (widgets reellement inclus).
    # On EXCLUT les sous-dossiers de demo (*_widgets/) qui contiennent des
    # index_exemple.qmd avec des includes casses (ex. 06-01.qmd) : sinon Quarto
    # echoue lors du scan du projet isole.
    wdir = src_dir / "widget"
    if wdir.is_dir():
        (build / "widget").mkdir()
        for qmd in wdir.glob("*.qmd"):
            shutil.copy(qmd, build / "widget" / qmd.name)

    # ressources globales necessaires au rendu pdf/docx
    shutil.copytree(ROOT / "styles", build / "styles")
    if (ROOT / "fonts").is_dir():
        shutil.copytree(ROOT / "fonts", build / "fonts")

    # bibliographie : sans elle, les citations [@cle] s'affichent litteralement
    # (ex. « [@NI43101_2005] ») dans le rendu isole. On copie Book.bib et on le
    # declare dans le _quarto.yml standalone.
    if (ROOT / "Book.bib").is_file():
        shutil.copy(ROOT / "Book.bib", build / "Book.bib")

    # _quarto.yml standalone (avec prefixe de chapitre = numero global du slug)
    numero = int(slug.lstrip("C"))
    (build / "_quarto.yml").write_text(_quarto_yml_standalone(numero), encoding="utf-8")


def render_chapter(slug: str, formats: list[str], keep_build: bool = False) -> dict[str, bool]:
    """Rend un chapitre dans tous les formats demandes. Retourne {fmt: succes}."""
    resultats: dict[str, bool] = {}
    src_index = ROOT / "chapters" / slug / "index.qmd"
    if not src_index.exists():
        print(f"  ! {slug} : {src_index} introuvable", file=sys.stderr)
        return {fmt: False for fmt in formats}

    titre = CHAPITRES.get(slug, slug)
    build = Path(tempfile.mkdtemp(prefix=f"qexport_{slug}_"))
    try:
        _preparer_build(slug, build)

        env = os.environ.copy()
        env[_GUARD] = "1"

        for fmt in formats:
            print(f"  -> {slug} ({fmt}) ...", flush=True)
            try:
                r = subprocess.run(
                    ["quarto", "render", "index.qmd", "--to", fmt],
                    cwd=build, capture_output=True, text=True, env=env,
                )
            except FileNotFoundError:
                print("  ! binaire 'quarto' introuvable dans le PATH", file=sys.stderr)
                resultats[fmt] = False
                continue

            produit = build / f"index.{fmt}"
            if r.returncode != 0 or not produit.exists():
                msg = r.stderr[-600:] if r.stderr else "(pas de sortie)"
                print(f"  X {slug}.{fmt} : echec du rendu\n{msg}", file=sys.stderr)
                resultats[fmt] = False
                continue

            # Rangement dans exports/CNN/ et docs/exports/CNN/
            nom = f"{slug}_{titre}.{fmt}"
            for cible_dir in (EXPORTS / slug, DOCS_EXPORTS / slug):
                cible_dir.mkdir(parents=True, exist_ok=True)
                shutil.copy(str(produit), str(cible_dir / nom))
            print(f"  OK exports/{slug}/{nom}  (+ docs/exports/{slug}/)")
            resultats[fmt] = True
    finally:
        if keep_build:
            print(f"     (build conserve : {build})")
        else:
            shutil.rmtree(build, ignore_errors=True)

    return resultats


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Genere un PDF/DOCX par chapitre (rendu isole).")
    parser.add_argument("chapitres", nargs="*", default=list(CHAPITRES),
                        help="Slugs (ex. C07 C09). Par defaut : tous.")
    parser.add_argument("--format", "-f", choices=["pdf", "docx", "all"], default="all",
                        help="Format a produire (defaut : les deux).")
    parser.add_argument("--keep-build", action="store_true",
                        help="Conserver les repertoires temporaires (debogage).")
    args = parser.parse_args(argv)

    if os.environ.get(_GUARD) == "1":
        print("Sous-rendu detecte — export par chapitre ignore (anti-recursion).")
        return 0

    mode_hook = os.environ.get("QUARTO_PROJECT_DIR") is not None
    formats = ["pdf", "docx"] if args.format == "all" else [args.format]

    print(f"Export de {len(args.chapitres)} chapitre(s) x {len(formats)} format(s)")
    print(f"Sortie : {EXPORTS}/  (+ copie dans {DOCS_EXPORTS}/ pour le site)\n")

    succes = total = 0
    for slug in args.chapitres:
        if slug not in CHAPITRES:
            print(f"  ! {slug} : slug inconnu, ignore.", file=sys.stderr)
            continue
        res = render_chapter(slug, formats, keep_build=args.keep_build)
        for ok in res.values():
            total += 1
            if ok:
                succes += 1

    print(f"\n{succes}/{total} fichiers produits.")
    if mode_hook:
        return 0
    return 0 if succes == total else 1


if __name__ == "__main__":   # pragma: no cover
    sys.exit(main())

"""Pre-calcul d'un panel de modeles de blocs 3D pour le widget C01.

Genere N realisations differentes (graines distinctes) du meme modele
synthetique. Le widget JS les charge toutes et cycle parmi elles quand
l'utilisateur clique sur << Nouveau gisement >>.

Sortie : `_assets/c01/blockmodel.json[.gz]`
Format consomme par `scripts/geostat-js/widgets/c01_blockmodel.js`.
"""
from __future__ import annotations

import argparse
import gzip
import json
import sys
from pathlib import Path
from typing import Any

import numpy as np

from geostat_polymtl.data.blockmodel import (
    generer_block_model_synthetique,
    generer_block_model_covariance,
    ORDRE_SCENARIOS_COVARIANCE,
    lister_scenarios,
)


# Seeds canoniques : differentes geometries de mineralisation.
DEFAULT_SEEDS = [42, 100, 200, 300, 1234, 4567, 7890, 9999]


def construire_json(seeds: list[int] = None, decimales: int = 2) -> dict[str, Any]:
    """Construit le JSON serialisable avec N modeles pre-calcules.

    Parameters
    ----------
    seeds : list of int
        Liste des graines a generer. Par defaut 8 seeds canoniques.
    decimales : int
        Nombre de decimales pour arrondir les teneurs (2 = precision 0.01 % Cu,
        suffisante pour l'affichage par classes de couleur).
    """
    if seeds is None:
        seeds = DEFAULT_SEEDS

    # Premier modele pour extraire la config (identique pour tous)
    bm0 = generer_block_model_synthetique(rng=seeds[0])

    # Modeles a serialiser : on stocke seulement les parties variables
    # (grades + drill_holes). La topo est deterministe -> partagee.
    modeles = []
    for seed in seeds:
        bm = generer_block_model_synthetique(rng=seed)
        grades_flat = np.round(bm.grades, decimales).ravel().tolist()
        modeles.append({
            "seed": int(bm.seed),
            "grades_flat": grades_flat,
            "drill_holes": bm.drill_holes,
        })

    # Un modele par scenario de covariance (8 styles de gisements), pour la
    # version statique (PDF/DOCX) de l'atelier "Modele de blocs 3D" — meme
    # graine que le premier seed canonique pour chaque scenario, afin de
    # rester deterministe.
    scenarios = []
    for spec in lister_scenarios():
        sid = spec["id"]
        bm = generer_block_model_covariance(scenario=sid, rng=seeds[0])
        scenarios.append({
            "id": sid,
            "nom": spec["nom"],
            "style": spec["style"],
            "description": spec["description"],
            "seed": int(bm.seed),
            "grades_flat": np.round(bm.grades, decimales).ravel().tolist(),
            "drill_holes": bm.drill_holes,
            "topo": np.round(bm.topo, 2).tolist(),
        })

    return {
        "config": {
            "nx": bm0.nx, "ny": bm0.ny, "nz": bm0.nz,
            "bloc_size": bm0.bloc_size,
            "z_top": bm0.z_top, "z_bot": bm0.z_bot,
        },
        "topo": np.round(bm0.topo, 2).tolist(),   # deterministe, partage
        "classes_couleur": [
            {"lo": 0.0,  "hi": 0.1,  "hex": "#c0c0c0"},
            {"lo": 0.1,  "hi": 0.2,  "hex": "#0000cc"},
            {"lo": 0.2,  "hi": 0.3,  "hex": "#00ccff"},
            {"lo": 0.3,  "hi": 0.4,  "hex": "#00cc44"},
            {"lo": 0.4,  "hi": 0.5,  "hex": "#cccc00"},
            {"lo": 0.5,  "hi": 0.75, "hex": "#ff8800"},
            {"lo": 0.75, "hi": 1.0,  "hex": "#cc0000"},
            {"lo": 1.0,  "hi": 99.0, "hex": "#ff00ff"},
        ],
        "modeles": modeles,
        "scenarios": scenarios,
        "ordre_scenarios": ORDRE_SCENARIOS_COVARIANCE,
    }


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Pre-calcul block model C01.")
    parser.add_argument("--output", "-o", type=Path,
                        default=Path("_assets/c01/"))
    parser.add_argument("--gzip", action="store_true")
    parser.add_argument("--n-modeles", type=int, default=8,
                        help="Nombre de modeles a pre-generer.")
    parser.add_argument("--decimales", type=int, default=2)
    args = parser.parse_args(argv)

    args.output.mkdir(parents=True, exist_ok=True)
    seeds = DEFAULT_SEEDS[:args.n_modeles] if args.n_modeles <= len(DEFAULT_SEEDS) \
            else list(range(42, 42 + args.n_modeles))
    data = construire_json(seeds=seeds, decimales=args.decimales)

    if args.gzip:
        chemin = args.output / "blockmodel.json.gz"
        with gzip.open(chemin, "wt", encoding="utf-8") as f:
            json.dump(data, f, separators=(",", ":"))
    else:
        chemin = args.output / "blockmodel.json"
        chemin.write_text(json.dumps(data, separators=(",", ":")),
                          encoding="utf-8")

    taille = chemin.stat().st_size / 1024
    n = len(data["modeles"])
    print(f"OK : {chemin} ({taille:.0f} ko, {n} modeles)")
    return 0


if __name__ == "__main__":
    sys.exit(main())

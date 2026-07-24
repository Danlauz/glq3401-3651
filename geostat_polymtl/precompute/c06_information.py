"""Pre-calcul des donnees du widget << effet d'information >> (chap. 6).

Remplace ``python_code/C6_EffetInformation.py`` qui produit actuellement
``docs/python_code/data/info_effect_data.json`` de **75 Mo**.

Optimisations vs version existante
----------------------------------
1. Grille reduite : 500x500 -> **200x200**.
2. Format ``float32`` partout.
3. **Le champ estime ne depend que de (biais, bruit), pas du cutoff.**
   On le stocke donc une seule fois par couple (biais, bruit), et seulement
   les statistiques de classification (% red, % blue) sont dependantes du cutoff.
4. ``np.round(..., 3)`` sur les champs : la resolution visuelle 2D ne demande
   pas plus de 3 decimales (gain ~50 % en JSON ASCII).

Estimation : passage de 75 Mo -> **~4 Mo** apres optimisation #3.
"""
from __future__ import annotations

import argparse
import gzip
import json
import sys
from pathlib import Path
from typing import Any

import numpy as np

from geostat_polymtl.data.synthetic import champ_fftma_2d


DEFAULT_CONFIG = {
    "taille": 200,
    "portee": 30,
    "seed": 42,
    "biais_values":   [-10, 0, 10],
    "bruit_values":   [0.0, 0.2, 0.5, 0.8],
    "cutoff_values":  [1, 2, 4, 8],
    "v_min": 0.0,
    "v_max": 10.0,
    "decimales": 3,
}


def generer_donnees(config: dict[str, Any]) -> dict[str, Any]:
    """Construit le dictionnaire de donnees pour le widget effet d'information.

    Format de sortie :

    .. code-block:: json

        {
          "config": {...},
          "real_clipped": [[...]],
          "scenarios": {
            "<biais>_<bruit>": {
              "biais": <int>, "bruit": <float>,
              "estime_clipped": [[...]],
              "cutoffs": {
                "<cutoff>": { "cutoff": <num>, "pct_red": <num>, "pct_blue": <num> }
              }
            }
          }
        }
    """
    g = champ_fftma_2d(taille=config["taille"], portee=config["portee"],
                       rng=config["seed"])
    reel = np.exp(g).astype(np.float32)
    reel_clip = np.clip(reel, config["v_min"], config["v_max"])

    dec = config["decimales"]

    output: dict[str, Any] = {
        "config": dict(config),
        "real_clipped": np.round(reel_clip, dec).tolist(),
        "scenarios": {},
    }

    for biais in config["biais_values"]:
        for bruit in config["bruit_values"]:
            seed = int(abs(biais * 1000 + bruit * 100 + 17))
            rng = np.random.default_rng(seed)
            biais_field = reel * (1 + biais / 100.0)
            bruit_field = rng.normal(scale=bruit, size=reel.shape).astype(np.float32)
            estime = np.clip(biais_field + bruit_field,
                             config["v_min"], config["v_max"]).astype(np.float32)

            cle = f"{biais}_{bruit}"

            # Stats par cutoff seulement
            cutoff_stats: dict[str, dict[str, Any]] = {}
            tot = reel_clip.size
            for cutoff in config["cutoff_values"]:
                real_ore = reel_clip >= cutoff
                est_ore = estime >= cutoff
                mask_blue = ~real_ore & est_ore
                mask_red = real_ore & ~est_ore
                cutoff_stats[str(cutoff)] = {
                    "cutoff": cutoff,
                    "pct_red":  round(100.0 * int(mask_red.sum()) / tot, 3),
                    "pct_blue": round(100.0 * int(mask_blue.sum()) / tot, 3),
                }

            output["scenarios"][cle] = {
                "biais": biais,
                "bruit": bruit,
                "estime_clipped": np.round(estime, dec).tolist(),
                "cutoffs": cutoff_stats,
            }

    return output


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Pre-calcul effet d'information (C06).")
    parser.add_argument("--output", "-o", type=Path,
                        default=Path("_assets/c06/"),
                        help="Repertoire de sortie.")
    parser.add_argument("--gzip", action="store_true",
                        help="Produire un .json.gz (sinon .json non compresse).")
    args = parser.parse_args(argv)

    args.output.mkdir(parents=True, exist_ok=True)
    print("Generation des donnees effet d'information...")
    data = generer_donnees(DEFAULT_CONFIG)

    if args.gzip:
        chemin = args.output / "effet_information.json.gz"
        with gzip.open(chemin, "wt", encoding="utf-8") as f:
            json.dump(data, f, separators=(",", ":"))
    else:
        chemin = args.output / "effet_information.json"
        chemin.write_text(json.dumps(data, separators=(",", ":")),
                          encoding="utf-8")

    taille_mo = chemin.stat().st_size / (1024 * 1024)
    print(f"OK : {chemin} ({taille_mo:.2f} Mo)")
    return 0


if __name__ == "__main__":   # pragma: no cover
    sys.exit(main())

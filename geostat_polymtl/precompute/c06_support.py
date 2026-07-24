"""Pré-calcul des données du widget « effet de support » (chap. 6).

Remplace la chaîne ``python_code/C6_EffetSupport.py`` qui produit actuellement
``docs/python_code/data/support_effect_data.json`` de **148 Mo**.

Optimisations vs version existante
----------------------------------
1. Réduction de la grille de simulation : 500×500 → **200×200** (suffisant
   pour illustrer pédagogiquement l'effet de support, ~6× plus léger).
2. Suppression des ``block_img_short`` / ``block_img_long`` (images redimensionnées
   par bloc). Le widget JS doit régénérer ces images à partir des agrégés
   ``agg_short`` / ``agg_long`` via un *upscale* simple par répétition.
3. Réduction des supports : 8 valeurs → 6 (par défaut ``[1, 2, 5, 10, 20, 40]``).
4. Format ``float32`` partout (suffisant pour de la visualisation 2D).

Estimation de taille
--------------------
- 1 champ ponctuel 200×200 = 160 ko ASCII, ~40 ko gzipped.
- 6 agrégés (jusqu'à 100×100, plus souvent 10×10) × 2 portées = 200 ko.
- Histogrammes + ECDF ≤ 50 ko.
- **Total estimé** : ~500 ko-1 Mo en JSON brut, ~250 ko en .json.gz.

Usage
-----
::

    python -m geostat_polymtl.precompute.c06_support --output docs/_assets/c06/

ou en lot via ``geostat-polymtl-precompute``.
"""
from __future__ import annotations

import argparse
import gzip
import json
import sys
from pathlib import Path
from typing import Any

import numpy as np

from geostat_polymtl.data.synthetic import (
    aggregate_blocs,
    champ_fftma_2d,
)


# --- Configuration par défaut (modifiable via CLI) ---
DEFAULT_CONFIG = {
    "taille": 200,                # côté de la grille (200 < 500 original)
    "portee_courte": 4,           # en pixels (= 10/2.5)
    "portee_longue": 100,         # en pixels (= 250/2.5)
    "supports": [1, 2, 5, 10, 20, 40],
    "v_min": 0.0,
    "v_max": 10.0,
    "n_bins": 31,
    "seed_courte": 42,
    "seed_longue": 24,
}


def _to_lognormal(champ_g: np.ndarray) -> np.ndarray:
    """Transforme un champ gaussien en lognormal exp(g)."""
    return np.exp(champ_g).astype(np.float32)


def _calage_histogramme(reference: np.ndarray, cible: np.ndarray) -> np.ndarray:
    """Force l'histogramme de `cible` à correspondre à celui de `reference`
    (quantile matching simple).
    """
    flat_ref = np.sort(reference.ravel())
    idx_sorted = np.argsort(cible.ravel())
    out = np.zeros_like(cible.ravel(), dtype=np.float32)
    out[idx_sorted] = flat_ref
    return out.reshape(cible.shape)


def generer_donnees(config: dict[str, Any]) -> dict[str, Any]:
    """Construit le dictionnaire de données pour le widget effet de support."""
    taille = config["taille"]
    supports = config["supports"]

    # 1) Champs gaussiens FFT-MA, deux portées
    g_courte = champ_fftma_2d(taille=taille, portee=config["portee_courte"],
                              rng=config["seed_courte"])
    g_longue = champ_fftma_2d(taille=taille, portee=config["portee_longue"],
                              rng=config["seed_longue"])

    # 2) Transformation lognormale + calage d'histogramme
    lg_courte = _to_lognormal(g_courte)
    lg_longue = _calage_histogramme(lg_courte, _to_lognormal(g_longue))

    moyenne = float(lg_courte.mean())
    bins_edges = np.linspace(config["v_min"], config["v_max"], config["n_bins"])
    centres = 0.5 * (bins_edges[1:] + bins_edges[:-1])

    output: dict[str, Any] = {
        "config": {
            "taille": taille,
            "portee_courte": config["portee_courte"],
            "portee_longue": config["portee_longue"],
            "v_min": config["v_min"],
            "v_max": config["v_max"],
            "moyenne": moyenne,
            "supports": supports,
        },
        "bins_edges": bins_edges.tolist(),
        "champs_ponctuels": {
            "courte": lg_courte.tolist(),   # 200×200 float
            "longue": lg_longue.tolist(),
        },
        "supports_data": [],
    }

    # 3) Agrégés et stats pour chaque support
    for support in supports:
        agg_c = aggregate_blocs(lg_courte, taille_bloc=support)
        agg_l = aggregate_blocs(lg_longue, taille_bloc=support)

        hist_c, _ = np.histogram(agg_c.ravel(), bins=bins_edges, density=True)
        hist_l, _ = np.histogram(agg_l.ravel(), bins=bins_edges, density=True)

        # ECDF compacte (tri + position)
        sort_c = np.sort(agg_c.ravel())
        sort_l = np.sort(agg_l.ravel())
        ecdf_c = (np.arange(1, len(sort_c) + 1) / len(sort_c)).astype(np.float32)
        ecdf_l = (np.arange(1, len(sort_l) + 1) / len(sort_l)).astype(np.float32)

        output["supports_data"].append({
            "support": support,
            "agg_courte": agg_c.tolist(),    # taille/support × taille/support
            "agg_longue": agg_l.tolist(),
            "histogram": {
                "bin_centers": centres.tolist(),
                "hist_courte": hist_c.tolist(),
                "hist_longue": hist_l.tolist(),
            },
            "ecdf": {
                "sorted_courte": sort_c.tolist(),
                "sorted_longue": sort_l.tolist(),
                "ecdf_courte":   ecdf_c.tolist(),
                "ecdf_longue":   ecdf_l.tolist(),
            },
        })

    return output


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Pré-calcul effet de support (C06).")
    parser.add_argument("--output", "-o", type=Path,
                        default=Path("_assets/c06/"),
                        help="Répertoire de sortie.")
    parser.add_argument("--gzip", action="store_true",
                        help="Produire un .json.gz (sinon .json non compressé).")
    args = parser.parse_args(argv)

    args.output.mkdir(parents=True, exist_ok=True)
    print("Génération des données effet de support…")
    data = generer_donnees(DEFAULT_CONFIG)

    if args.gzip:
        chemin = args.output / "effet_support.json.gz"
        with gzip.open(chemin, "wt", encoding="utf-8") as f:
            json.dump(data, f, separators=(",", ":"))
    else:
        chemin = args.output / "effet_support.json"
        chemin.write_text(json.dumps(data, separators=(",", ":")),
                          encoding="utf-8")

    taille_mo = chemin.stat().st_size / (1024 * 1024)
    print(f"✓ {chemin} ({taille_mo:.2f} Mo)")
    return 0


if __name__ == "__main__":   # pragma: no cover
    sys.exit(main())

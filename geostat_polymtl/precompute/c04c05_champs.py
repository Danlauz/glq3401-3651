"""Precalcul des champs gaussiens GFFTMA pour les ateliers C04/C05.

Genere un jeu de realisations du champ aleatoire gaussien pour les trois
modeles de covariance (spherique, exponentiel, gaussien), a plusieurs portees
et plusieurs graines. Les widgets JS chargent ce JSON et appliquent la
distribution marginale demandee (gaussienne ou log-normale).

Convention de portee
--------------------
A l'interface (et dans ce script), la **portee pratique 95 %** est utilisee
(comme dans la doc du chapitre 07). Internement, GFFTMA recoit son parametre
``range`` selon le modele :

- spherique     : range_GFFTMA = a_pratique         (palier atteint a a)
- exponentiel   : range_GFFTMA = a_pratique / 3     (gamma(a) = 1 - e^-3 ~= 95%)
- gaussien      : range_GFFTMA = a_pratique / sqrt(3)  (idem)

Pourquoi ?
``covar.py`` implemente : exp(-h_red) (exponentiel) et exp(-h_red^2) (gaussien),
ou ``h_red = h / range``. Pour viser 95 % du palier a la portee pratique ``a``,
il faut donc retrecir le ``range`` GFFTMA dans le rapport ci-dessus.

Sortie
------
``_assets/c04/champs.json[.gz]`` -- partage par les ateliers C04 et C05.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import numpy as np

# Codes covariance attendus par cov_func/covar
_CODES = {"spherique": 4, "exponentiel": 2, "gaussien": 3}


def _range_gfftma(modele, a_pratique):
    """Convertit la portee pratique 95 % vers le `range` GFFTMA selon le modele."""
    if modele == "spherique":
        return float(a_pratique)
    if modele == "exponentiel":
        return float(a_pratique) / 3.0
    if modele == "gaussien":
        return float(a_pratique) / math.sqrt(3.0)
    raise ValueError("modele inconnu : " + repr(modele))


def _importer_gfftma():
    """GFFTMA + cov_func necessitent geostat_polymtl/ sur le sys.path."""
    pkg = Path(__file__).resolve().parent.parent
    if str(pkg) not in sys.path:
        sys.path.insert(0, str(pkg))
    from simulation_methods.GFFTMA import GFFTMA  # type: ignore
    return GFFTMA


def generer_donnees(
    N=80,
    modeles=("spherique", "exponentiel", "gaussien"),
    portees=(15, 22, 30, 40),
    n_seeds=4,
    seed_base=1000,
):
    """Simule toutes les combinaisons (modele, portee, graine) avec GFFTMA.

    Les realisations sont **standardisees N(0, 1)** : moyenne 0, variance 1.
    Le widget JS applique ensuite la distribution marginale demandee.
    """
    GFFTMA = _importer_gfftma()
    realisations = {}

    for modele in modeles:
        code = _CODES[modele]
        for a in portees:
            r = _range_gfftma(modele, a)
            # Sur certains rapports portee/dx, la grille etendue interne de
            # GFFTMA peut tomber sur un nombre impair -> mismatch arange/reshape.
            # On garantit que la taille totale est paire en augmentant nx
            # marginalement si besoin (on tronque ensuite a N x N).
            pad = math.ceil(2 * r)
            nx_eff = N if (pad + N) % 2 == 0 else N + 1
            for k in range(n_seeds):
                model_spec = [[np.array([code, r, r, 0.0], dtype=float)]]
                d, _, _ = GFFTMA(
                    model_spec, [[1.0]], [[None]],
                    seed=int(seed_base + k), nbsimul=1,
                    nx=nx_eff, dx=1.0, ny=nx_eff, dy=1.0,
                )
                z = np.asarray(d[:, 0, 0], dtype=float).reshape(nx_eff, nx_eff)
                z = z[:N, :N]
                # standardisation N(0, 1) pour appliquer proprement la
                # distribution marginale du cote JS.
                z = (z - z.mean()) / (z.std() + 1e-12)
                realisations[modele + "_" + str(int(a)) + "_" + str(k)] = np.round(z, 4).tolist()

    config = {
        "N": int(N),
        "modeles": list(modeles),
        "portees": [int(a) for a in portees],
        "n_seeds": int(n_seeds),
        "convention_portee": "pratique_95pct",
        "conversion_range_gfftma": {
            "spherique": "a",
            "exponentiel": "a / 3",
            "gaussien": "a / sqrt(3)",
        },
    }
    return {"config": config, "realisations": realisations}


def main(argv=None):
    parser = argparse.ArgumentParser(
        description="Pre-calcul des champs GFFTMA pour les ateliers C04/C05."
    )
    parser.add_argument("--output", "-o", type=Path, default=Path("_assets/c04"))
    parser.add_argument("--gzip", action="store_true")
    parser.add_argument("--N", type=int, default=80)
    parser.add_argument("--n-seeds", type=int, default=4)
    args = parser.parse_args(argv)

    args.output.mkdir(parents=True, exist_ok=True)
    data = generer_donnees(N=args.N, n_seeds=args.n_seeds)

    nom = "champs.json.gz" if args.gzip else "champs.json"
    chemin = args.output / nom
    if args.gzip:
        import gzip
        with gzip.open(chemin, "wt", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False)
    else:
        chemin.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")

    taille_ko = chemin.stat().st_size / 1024
    print("ecrit : " + str(chemin) + " (" + str(round(taille_ko, 1)) + " ko)")
    print("  N=" + str(data['config']['N']) + ", "
          + str(len(data['realisations'])) + " realisations ("
          + str(len(data['config']['modeles'])) + " modeles x "
          + str(len(data['config']['portees'])) + " portees x "
          + str(data['config']['n_seeds']) + " graines)")
    return 0


if __name__ == "__main__":   # pragma: no cover
    sys.exit(main())

"""Variance de bloc empirique sur champ regulier (chap. 08).

Etant donne une realisation d'un champ aleatoire (grille reguliere), on calcule
la variance des moyennes sur des blocs de plus en plus grands. La courbe
``variance vs taille du bloc`` doit decroitre lorsque le support croit (effet
de support / changement de support), et tendre vers la variance theorique de
bloc obtenue par quadrature (voir :mod:`geostat_polymtl.block_variance.quadrature`).
"""
from __future__ import annotations

from typing import List, Tuple

import numpy as np
from numpy.lib.stride_tricks import sliding_window_view


def agreger_champ(champ: np.ndarray, taille_bloc: int) -> np.ndarray:
    """Moyenne mobile glissante : champ ``(N, N)`` → ``(N-b+1, N-b+1)``.

    Equivalent geostatistique du changement de support point → bloc.
    """
    b = int(taille_bloc)
    if b <= 1:
        return np.asarray(champ, float)
    fenetres = sliding_window_view(np.asarray(champ, float), (b, b))
    # fenetres.shape = (N-b+1, N-b+1, b, b)
    return fenetres.mean(axis=(-1, -2))


def variance_bloc_empirique(
    champ: np.ndarray,
    taille_max: int,
) -> Tuple[List[int], List[float]]:
    """Variance empirique de bloc pour chaque taille de 1 a ``taille_max``.

    Parameters
    ----------
    champ : np.ndarray, shape (N, N)
        Realisation d'un champ aleatoire (par ex. issu de
        ``geostat_polymtl.simulation_methods.GFFTMA``).
    taille_max : int
        Plus grande taille de bloc a tester.

    Returns
    -------
    tailles : list of int
    variances : list of float
        ``variances[i]`` = variance empirique (ddof=1) du champ apres
        agregation par blocs de taille ``tailles[i]``.
    """
    g = np.asarray(champ, float)
    tailles = list(range(1, int(taille_max) + 1))
    variances: List[float] = []
    out_tailles: List[int] = []
    for s in tailles:
        if g.shape[0] < s:
            break
        agg = agreger_champ(g, s)
        v = float(np.var(agg, ddof=1)) if agg.size > 1 else float("nan")
        variances.append(v)
        out_tailles.append(s)
    return out_tailles, variances

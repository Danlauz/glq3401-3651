"""
Qualité d'une estimation par rapport à la réalité — chap. 05.

Permet de comparer une carte estimée (IDW, polygones, triangles…) au champ
« vrai » simulé par GFFTMA, afin d'illustrer le biais et la dispersion de
chaque méthode conventionnelle.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from numpy.typing import ArrayLike


@dataclass
class StatsErreur:
    """Statistiques d'erreur d'estimation (positions où les deux sont définis)."""
    n: int
    biais: float          # moyenne (estimé − vrai)
    rmse: float           # racine de l'erreur quadratique moyenne
    mae: float            # erreur absolue moyenne
    r2: float             # coefficient de détermination


def statistiques_erreur(
    valeurs_vraies: ArrayLike,
    valeurs_estimees: ArrayLike,
) -> StatsErreur:
    """Compare des valeurs estimées à la réalité (NaN ignorés).

    Parameters
    ----------
    valeurs_vraies, valeurs_estimees : array-like
        Mêmes positions (mêmes formes). Les positions ``NaN`` (ex. hors
        enveloppe convexe pour les triangles) sont exclues.

    Returns
    -------
    StatsErreur

    Examples
    --------
    >>> import numpy as np
    >>> v = np.array([1.0, 2.0, 3.0, 4.0])
    >>> e = np.array([1.1, 1.9, 3.2, 3.8])
    >>> s = statistiques_erreur(v, e)
    >>> s.n
    4
    """
    v = np.asarray(valeurs_vraies, dtype=float).ravel()
    e = np.asarray(valeurs_estimees, dtype=float).ravel()
    masque = ~(np.isnan(v) | np.isnan(e))
    n = int(masque.sum())
    if n == 0:
        return StatsErreur(0, np.nan, np.nan, np.nan, np.nan)

    vv, ee = v[masque], e[masque]
    d = ee - vv
    biais = float(np.mean(d))
    rmse = float(np.sqrt(np.mean(d**2)))
    mae = float(np.mean(np.abs(d)))

    var_v = float(np.var(vv))
    r2 = float(1.0 - np.mean(d**2) / var_v) if var_v > 0 else np.nan
    return StatsErreur(n=n, biais=biais, rmse=rmse, mae=mae, r2=r2)

"""
Inverse de la distance pondérée (IDW) — chap. 05.

Estimation déterministe : la valeur en un point est la moyenne des
échantillons voisins, pondérée par l'inverse de la distance élevée à une
puissance ``b`` :

.. math::
    \\hat{z}(x_0) = \\frac{\\sum_i w_i\\, z_i}{\\sum_i w_i},
    \\qquad w_i = \\frac{1}{d_i^{\\,b}}

Un point situé exactement sur un échantillon prend la valeur de cet
échantillon (interpolation exacte).
"""
from __future__ import annotations

import numpy as np
from numpy.typing import ArrayLike

from scipy.spatial.distance import cdist


def idw(
    coordonnees: ArrayLike,
    valeurs: ArrayLike,
    points: ArrayLike,
    puissance: float = 2.0,
    rayon: float = np.inf,
    eps: float = 1e-12,
) -> np.ndarray:
    """Estime des valeurs par inverse de la distance pondérée.

    Parameters
    ----------
    coordonnees : array-like, shape (n, 2)
        Positions des échantillons.
    valeurs : array-like, shape (n,)
        Valeurs (teneurs) aux échantillons.
    points : array-like, shape (m, 2)
        Points où estimer.
    puissance : float
        Exposant ``b`` de la pondération (2 = classique).
    rayon : float
        Rayon de recherche : seuls les échantillons à distance ≤ ``rayon`` sont
        utilisés. ``np.inf`` = tous les échantillons.
    eps : float
        Seuil sous lequel un point est considéré confondu avec un échantillon.

    Returns
    -------
    np.ndarray, shape (m,)
        Valeurs estimées (``NaN`` si aucun échantillon dans le rayon).

    Examples
    --------
    >>> import numpy as np
    >>> c = np.array([[0., 0.], [10., 0.], [0., 10.]])
    >>> v = np.array([1.0, 3.0, 5.0])
    >>> idw(c, v, np.array([[0., 0.]]))[0]   # sur un échantillon -> sa valeur
    1.0
    """
    coords = np.asarray(coordonnees, dtype=float)
    vals = np.asarray(valeurs, dtype=float)
    pts = np.atleast_2d(np.asarray(points, dtype=float))

    d = cdist(pts, coords)                     # (m, n)
    out = np.full(pts.shape[0], np.nan)

    for i in range(pts.shape[0]):
        di = d[i]
        proche = np.where(di <= eps)[0]
        if proche.size:                        # point confondu avec un échantillon
            out[i] = vals[proche].mean()
            continue
        masque = di <= rayon
        if not masque.any():
            continue
        w = 1.0 / di[masque] ** puissance
        out[i] = np.sum(w * vals[masque]) / np.sum(w)
    return out


def estimer_grille_idw(
    coordonnees: ArrayLike,
    valeurs: ArrayLike,
    nx: int,
    ny: int,
    puissance: float = 2.0,
    rayon: float = np.inf,
) -> np.ndarray:
    """Estime IDW sur une grille régulière ``nx × ny`` (pas unitaire).

    Returns
    -------
    np.ndarray, shape (nx, ny)
        ``grille[i, j]`` = estimation au point (x=i, y=j).
    """
    xs, ys = np.meshgrid(np.arange(nx), np.arange(ny), indexing="ij")
    pts = np.column_stack([xs.ravel(), ys.ravel()]).astype(float)
    est = idw(coordonnees, valeurs, pts, puissance=puissance, rayon=rayon)
    return est.reshape(nx, ny)

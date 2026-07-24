"""
Méthode des triangles (TIN / triangulation de Delaunay) — chap. 05.

Les échantillons sont triangulés (Delaunay) ; la valeur en un point intérieur
à un triangle est :

- ``"barycentrique"`` : interpolation linéaire par les coordonnées
  barycentriques des trois sommets (surface continue, exacte aux sommets) ;
- ``"moyenne"`` : moyenne arithmétique des trois sommets (constante par
  triangle).

Les points hors de l'enveloppe convexe reçoivent ``NaN``.
"""
from __future__ import annotations

import numpy as np
from numpy.typing import ArrayLike

from scipy.spatial import Delaunay


def interpolation_triangulaire(
    coordonnees: ArrayLike,
    valeurs: ArrayLike,
    points: ArrayLike,
    mode: str = "barycentrique",
    triangulation: "Delaunay | None" = None,
) -> np.ndarray:
    """Estime par triangulation de Delaunay.

    Parameters
    ----------
    coordonnees : array-like, shape (n, 2)
    valeurs : array-like, shape (n,)
    points : array-like, shape (m, 2)
    mode : {"barycentrique", "moyenne"}
        Interpolation linéaire barycentrique, ou moyenne du triangle.
    triangulation : scipy.spatial.Delaunay, optional
        Triangulation pré-calculée (sinon construite ici).

    Returns
    -------
    np.ndarray, shape (m,)
        Valeurs estimées (``NaN`` hors enveloppe convexe).

    Examples
    --------
    >>> import numpy as np
    >>> c = np.array([[0., 0.], [10., 0.], [0., 10.], [10., 10.]])
    >>> v = np.array([0.0, 10.0, 10.0, 20.0])
    >>> round(float(interpolation_triangulaire(c, v, np.array([[5., 5.]]))[0]), 1)
    10.0
    """
    coords = np.asarray(coordonnees, dtype=float)
    vals = np.asarray(valeurs, dtype=float)
    pts = np.atleast_2d(np.asarray(points, dtype=float))

    if coords.shape[0] < 3:
        return np.full(pts.shape[0], np.nan)

    tri = triangulation if triangulation is not None else Delaunay(coords)
    simplexes = tri.find_simplex(pts)
    out = np.full(pts.shape[0], np.nan)

    for i, s in enumerate(simplexes):
        if s < 0:                              # hors enveloppe convexe
            continue
        sommets = tri.simplices[s]
        # Coordonnées barycentriques via la transformation affine de scipy.
        b = tri.transform[s, :2].dot(pts[i] - tri.transform[s, 2])
        bary = np.array([b[0], b[1], 1.0 - b[0] - b[1]])
        if mode == "moyenne":
            out[i] = vals[sommets].mean()
        else:
            out[i] = float(np.dot(bary, vals[sommets]))
    return out


def estimer_grille_triangles(
    coordonnees: ArrayLike,
    valeurs: ArrayLike,
    nx: int,
    ny: int,
    mode: str = "barycentrique",
) -> np.ndarray:
    """Estime par triangulation sur une grille ``nx × ny`` (pas unitaire).

    Returns
    -------
    np.ndarray, shape (nx, ny)
        ``NaN`` hors de l'enveloppe convexe des échantillons.
    """
    coords = np.asarray(coordonnees, dtype=float)
    if coords.shape[0] < 3:
        return np.full((nx, ny), np.nan)
    tri = Delaunay(coords)
    xs, ys = np.meshgrid(np.arange(nx), np.arange(ny), indexing="ij")
    pts = np.column_stack([xs.ravel(), ys.ravel()]).astype(float)
    est = interpolation_triangulaire(coords, valeurs, pts, mode=mode, triangulation=tri)
    return est.reshape(nx, ny)

"""
Méthode des polygones (Thiessen / plus proche voisin) — chap. 05.

Chaque point du domaine prend la valeur de l'échantillon le plus proche : c'est
l'estimateur constant par morceaux dont les frontières sont les polygones de
Voronoï (médiatrices entre échantillons voisins).
"""
from __future__ import annotations

import numpy as np
from numpy.typing import ArrayLike

from scipy.spatial import cKDTree


def plus_proche_voisin(
    coordonnees: ArrayLike,
    valeurs: ArrayLike,
    points: ArrayLike,
) -> np.ndarray:
    """Estime par le plus proche voisin (polygones de Thiessen).

    Parameters
    ----------
    coordonnees : array-like, shape (n, 2)
    valeurs : array-like, shape (n,)
    points : array-like, shape (m, 2)

    Returns
    -------
    np.ndarray, shape (m,)
        Valeur de l'échantillon le plus proche de chaque point.

    Examples
    --------
    >>> import numpy as np
    >>> c = np.array([[0., 0.], [10., 0.]])
    >>> v = np.array([1.0, 9.0])
    >>> plus_proche_voisin(c, v, np.array([[2., 0.], [8., 0.]]))
    array([1., 9.])
    """
    coords = np.asarray(coordonnees, dtype=float)
    vals = np.asarray(valeurs, dtype=float)
    pts = np.atleast_2d(np.asarray(points, dtype=float))

    arbre = cKDTree(coords)
    _, idx = arbre.query(pts, k=1)
    return vals[idx]


def estimer_grille_ppv(
    coordonnees: ArrayLike,
    valeurs: ArrayLike,
    nx: int,
    ny: int,
) -> np.ndarray:
    """Estime par plus proche voisin sur une grille ``nx × ny`` (pas unitaire).

    Returns
    -------
    np.ndarray, shape (nx, ny)
    """
    xs, ys = np.meshgrid(np.arange(nx), np.arange(ny), indexing="ij")
    pts = np.column_stack([xs.ravel(), ys.ravel()]).astype(float)
    return plus_proche_voisin(coordonnees, valeurs, pts).reshape(nx, ny)


def aire_polygones(
    coordonnees: ArrayLike,
    nx: int,
    ny: int,
) -> np.ndarray:
    """Aire (en pixels) du polygone de Thiessen de chaque échantillon.

    Calculée par comptage sur la grille — pratique pour pondérer la moyenne
    globale (estimateur polygonal de la teneur moyenne du gisement).

    Returns
    -------
    np.ndarray, shape (n,)
        Nombre de pixels attribués à chaque échantillon.
    """
    coords = np.asarray(coordonnees, dtype=float)
    xs, ys = np.meshgrid(np.arange(nx), np.arange(ny), indexing="ij")
    pts = np.column_stack([xs.ravel(), ys.ravel()]).astype(float)
    arbre = cKDTree(coords)
    _, idx = arbre.query(pts, k=1)
    return np.bincount(idx, minlength=len(coords)).astype(float)

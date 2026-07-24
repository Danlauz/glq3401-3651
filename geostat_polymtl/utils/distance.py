"""Helpers de calcul de distance.

Notes
-----
On évite ``scipy.spatial.distance.cdist`` pour les petits cas pédagogiques
afin de garder le code transparent et facile à porter en JavaScript pour
les widgets. ``cdist`` reste utilisé dans les fonctions de production
(modules ``kriging``, ``cokriging``).
"""
from __future__ import annotations

from typing import Optional

import numpy as np
from numpy.typing import ArrayLike


def distance_euclidienne(
    coords_a: ArrayLike,
    coords_b: ArrayLike,
) -> np.ndarray:
    """Distance euclidienne entre paires de points alignés.

    Parameters
    ----------
    coords_a, coords_b : array-like, shape (n, d)
        Deux ensembles de coordonnées de même taille.

    Returns
    -------
    np.ndarray, shape (n,)
        Distance entre ``coords_a[i]`` et ``coords_b[i]``.

    Examples
    --------
    >>> import numpy as np
    >>> distance_euclidienne(np.array([[0, 0]]), np.array([[3, 4]]))
    array([5.])
    """
    a = np.atleast_2d(np.asarray(coords_a, dtype=float))
    b = np.atleast_2d(np.asarray(coords_b, dtype=float))
    return np.sqrt(np.sum((a - b) ** 2, axis=-1))


def matrice_distances(
    coords_a: ArrayLike,
    coords_b: Optional[ArrayLike] = None,
) -> np.ndarray:
    """Matrice des distances euclidiennes entre tous les couples de points.

    Parameters
    ----------
    coords_a : array-like, shape (n, d)
    coords_b : array-like, shape (m, d), optional
        Si ``None``, calcule la matrice symétrique (n, n) de coords_a contre
        lui-même.

    Returns
    -------
    np.ndarray
        Matrice de distances (n, m) ou (n, n).
    """
    a = np.atleast_2d(np.asarray(coords_a, dtype=float))
    b = a if coords_b is None else np.atleast_2d(np.asarray(coords_b, dtype=float))
    # broadcasting : (n, 1, d) - (1, m, d) → (n, m, d)
    diff = a[:, None, :] - b[None, :, :]
    return np.sqrt(np.sum(diff**2, axis=-1))


def distance_anisotrope(
    hx: ArrayLike,
    hy: ArrayLike,
    portee_majeure: float,
    portee_mineure: float,
    angle_degres: float = 0.0,
) -> np.ndarray:
    """Distance « normalisée » par une anisotropie géométrique 2D.

    Transforme les composantes ``(hx, hy)`` en une distance unique normalisée
    par les portées majeure et mineure et la rotation. Une valeur de 1 signifie
    « à la portée » dans la direction concernée.

    Parameters
    ----------
    hx, hy : array-like
        Composantes du vecteur de distance.
    portee_majeure : float
        Portée dans la direction principale.
    portee_mineure : float
        Portée dans la direction perpendiculaire.
    angle_degres : float, optional
        Angle (antihoraire, depuis Est) de la direction principale.

    Returns
    -------
    np.ndarray
        Distance anisotrope normalisée.
    """
    hx_arr = np.asarray(hx, dtype=float)
    hy_arr = np.asarray(hy, dtype=float)
    theta = np.deg2rad(angle_degres)
    cos_a, sin_a = np.cos(theta), np.sin(theta)
    h_rot = cos_a * hx_arr + sin_a * hy_arr
    v_rot = -sin_a * hx_arr + cos_a * hy_arr
    return np.sqrt((h_rot / portee_majeure) ** 2 + (v_rot / portee_mineure) ** 2)

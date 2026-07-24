"""
Dégroupement spatial par cellules (cell declustering, chap. 04).

Lorsque l'échantillonnage est spatialement non uniforme (zones
suréchantillonnées), la moyenne brute est biaisée. Le dégroupement par
cellules attribue à chaque point un poids inversement proportionnel au nombre
de points présents dans sa cellule, de sorte que les zones denses pèsent moins.

Pondération (identique au widget JS ``Ch4.cellDecluster``)
----------------------------------------------------------
Pour ``L_o`` cellules occupées et ``n_l`` points dans la cellule du point
:math:`i` :

.. math:: w_i = \\frac{1}{n_l \\cdot L_o}

Ces poids somment à 1. La moyenne dégroupée est :math:`\\sum_i w_i\\, z_i`.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Dict, List, Sequence, Tuple, Union

import numpy as np

Point = Union["PointXY", dict, Tuple[float, float]]


@dataclass
class PointXY:
    """Un point 2D (avec teneur optionnelle pour la moyenne dégroupée)."""

    x: float
    y: float
    t: float = 0.0


@dataclass
class ResultatDegroupement:
    """Résultat d'un dégroupement par cellules.

    Attributes
    ----------
    poids : numpy.ndarray
        Poids de dégroupement, un par point (somme = 1).
    n_cellules_occupees : int
        Nombre de cellules contenant au moins un point (``L_o``).
    nx, ny : int
        Nombre de cellules en x et en y couvrant l'emprise.
    """

    poids: np.ndarray
    n_cellules_occupees: int
    nx: int
    ny: int


def _coerce(p: Point) -> Tuple[float, float]:
    if isinstance(p, PointXY):
        return p.x, p.y
    if isinstance(p, dict):
        return float(p["x"]), float(p["y"])
    x, y = p[0], p[1]
    return float(x), float(y)


def degroupement_cellules(
    points: Sequence[Point],
    taille_cellule: float,
    x_min: float,
    x_max: float,
    y_min: float,
    y_max: float,
) -> ResultatDegroupement:
    """Calcule les poids de dégroupement par cellules.

    Parameters
    ----------
    points : séquence de points
        Chaque point fournit au moins ``x`` et ``y``.
    taille_cellule : float
        Côté des cellules carrées de la grille.
    x_min, x_max, y_min, y_max : float
        Emprise de la grille (origine ``(x_min, y_min)``).

    Returns
    -------
    ResultatDegroupement
        Les poids et les métadonnées de la grille.
    """
    n = len(points)
    nx = max(1, math.ceil((x_max - x_min) / taille_cellule))
    ny = max(1, math.ceil((y_max - y_min) / taille_cellule))

    cells: Dict[Tuple[int, int], List[int]] = {}
    assignments: List[Tuple[int, int]] = []
    for i in range(n):
        x, y = _coerce(points[i])
        cx = math.floor((x - x_min) / taille_cellule)
        cy = math.floor((y - y_min) / taille_cellule)
        key = (cx, cy)
        cells.setdefault(key, []).append(i)
        assignments.append(key)

    n_occ = len(cells)
    poids = np.zeros(n, dtype=float)
    for i in range(n):
        nl = len(cells[assignments[i]])
        poids[i] = 1.0 / (nl * n_occ) if n_occ else 0.0

    return ResultatDegroupement(
        poids=poids, n_cellules_occupees=n_occ, nx=nx, ny=ny
    )


def moyenne_degroupee(
    points: Sequence[Point],
    valeurs: Sequence[float],
    taille_cellule: float,
    x_min: float,
    x_max: float,
    y_min: float,
    y_max: float,
) -> float:
    """Moyenne pondérée par les poids de dégroupement par cellules."""
    res = degroupement_cellules(
        points, taille_cellule, x_min, x_max, y_min, y_max
    )
    v = np.asarray(valeurs, dtype=float)
    return float(np.sum(res.poids * v))

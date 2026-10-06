"""Simulation Pluri-Gaussienne (chap. 13).

Combine 2 champs gaussiens corrélés ou indépendants Y1 et Y2, et un
diagramme de partition du plan (Y1, Y2) -> facies. Permet de représenter
des contacts plus flexibles que la troncation d'un seul champ.

Pour la pédagogie : 3 ou 4 facies via une partition rectangulaire simple.
"""
from __future__ import annotations
from typing import Sequence, Tuple, List
import numpy as np
from scipy.stats import norm


def partition_rectangulaire(
    proportions_par_facies: Sequence[float],
    partition_type: str = "horizontale",
) -> List[Tuple[float, float, float, float, int]]:
    """Diagramme de partition rectangulaire pour 2-4 facies.

    Parameters
    ----------
    proportions_par_facies : (K,) sequence
        Proportions des K facies (somme 1).
    partition_type : str
        "horizontale" : bandes horizontales le long de Y1.
        "verticale"   : bandes verticales le long de Y2.
        "L"           : L-shape (3 facies seulement).

    Returns
    -------
    rectangles : list of (y1_min, y1_max, y2_min, y2_max, facies_id)
    """
    p = np.asarray(proportions_par_facies, dtype=float)
    K = len(p)
    if abs(p.sum() - 1.0) > 1e-6:
        raise ValueError("proportions doivent sommer a 1")

    inf = 10.0  # representation pratique de l'infini
    if partition_type == "horizontale":
        seuils = norm.ppf(np.clip(np.cumsum(p[:-1]), 1e-9, 1 - 1e-9))
        bornes = [-inf] + list(seuils) + [inf]
        return [(-inf, inf, bornes[k], bornes[k + 1], k + 1) for k in range(K)]
    elif partition_type == "verticale":
        seuils = norm.ppf(np.clip(np.cumsum(p[:-1]), 1e-9, 1 - 1e-9))
        bornes = [-inf] + list(seuils) + [inf]
        return [(bornes[k], bornes[k + 1], -inf, inf, k + 1) for k in range(K)]
    elif partition_type == "L" and K == 3:
        # Partition L : facies 1 a gauche bas, facies 2 a gauche haut, facies 3 a droite
        a = norm.ppf(1.0 - p[2])  # frontiere verticale : P(Y1 > a) = p[2]
        b = norm.ppf(p[0] / max(1 - p[2], 1e-9))  # frontiere horizontale a gauche
        return [
            (-inf, a, -inf, b, 1),
            (-inf, a, b, inf, 2),
            (a, inf, -inf, inf, 3),
        ]
    raise ValueError(f"partition_type='{partition_type}' non supporte pour K={K}")


def champs_a_facies(
    Y1: np.ndarray,
    Y2: np.ndarray,
    rectangles: List[Tuple[float, float, float, float, int]],
) -> np.ndarray:
    """Convertit deux champs gaussiens en facies via un diagramme rectangulaire.

    Parameters
    ----------
    Y1, Y2 : (n,) arrays
        Champs gaussiens standardises.
    rectangles : list of (y1_min, y1_max, y2_min, y2_max, facies_id)
        Sortie de partition_rectangulaire().

    Returns
    -------
    facies : (n,) int array
    """
    Y1 = np.asarray(Y1, dtype=float).ravel()
    Y2 = np.asarray(Y2, dtype=float).ravel()
    n = Y1.shape[0]
    facies = np.zeros(n, dtype=int)
    for (y1_min, y1_max, y2_min, y2_max, fid) in rectangles:
        mask = (Y1 >= y1_min) & (Y1 < y1_max) & (Y2 >= y2_min) & (Y2 < y2_max)
        facies[mask] = fid
    # Pour les points non classes (sur les frontieres), prendre le facies majoritaire local
    facies[facies == 0] = 1
    return facies

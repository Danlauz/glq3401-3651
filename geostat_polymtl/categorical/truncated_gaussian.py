"""Simulation par troncation d'un champ gaussien (chap. 13).

Methode simple a 1 champ : un seul champ gaussien Y(x) standardise,
tronque a K-1 seuils -> K facies. Utile comme INTRODUCTION CONCEPTUELLE
a la PGS (qui utilise 2 champs).

Les proportions globales p_i de chaque facies sont fixees ; on en
deduit les seuils via la CDF inverse de la normale standard.
"""
from __future__ import annotations
from typing import Sequence, Tuple
import numpy as np
from scipy.stats import norm


def seuils_depuis_proportions(proportions: Sequence[float]) -> np.ndarray:
    """Calcule les seuils alpha_k tels que P(Y <= alpha_k) = sum p_1..p_k.

    Parameters
    ----------
    proportions : sequence of K floats (somme = 1)
        Proportions globales de chaque facies (facies 1, 2, ..., K).

    Returns
    -------
    seuils : (K-1,) array
        alpha_1 < alpha_2 < ... < alpha_{K-1}.
    """
    p = np.asarray(proportions, dtype=float)
    if abs(p.sum() - 1.0) > 1e-6:
        raise ValueError(f"sum(proportions) doit etre 1, recu {p.sum()}")
    cumul = np.cumsum(p[:-1])
    return norm.ppf(np.clip(cumul, 1e-9, 1 - 1e-9))


def champ_a_facies(
    champ_gaussien: np.ndarray,
    proportions: Sequence[float],
) -> np.ndarray:
    """Convertit un champ gaussien Y en facies (1..K).

    Parameters
    ----------
    champ_gaussien : (n,) array
        Champ Y standardise (moyenne 0, variance 1).
    proportions : (K,) sequence
        Proportions des K facies.

    Returns
    -------
    facies : (n,) int array
        Etiquettes 1..K.
    """
    Y = np.asarray(champ_gaussien, dtype=float)
    seuils = seuils_depuis_proportions(proportions)
    facies = np.searchsorted(seuils, Y) + 1
    return facies.astype(int)

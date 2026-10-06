"""
Calcul des réserves récupérables au-dessus d'une teneur de coupure.

Ce module fournit les fonctions pour calculer, à partir d'une distribution
statistique des teneurs (lognormale ou normale), les quantités clés :

- **xc** (tc) : proportion de minerai au-dessus de la teneur de coupure
- **gc** (mc) : teneur moyenne conditionnelle (E[X | X > c])
- **qc**      : quantité de métal récupérable (xc × gc)

Référence : Lane, K.F. (1988). *The Economic Definition of Ore*.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from numpy.typing import ArrayLike
from scipy.stats import norm


# ---------------------------------------------------------------------------
# Résultat structuré
# ---------------------------------------------------------------------------

@dataclass
class ReserveResult:
    """Résultat du calcul de réserves pour une ou plusieurs teneurs de coupure.

    Attributes
    ----------
    xc : np.ndarray
        Proportion du gisement au-dessus de la teneur de coupure, P(X > c).
    qc : np.ndarray
        Quantité de métal récupérable par unité de gisement.
    gc : np.ndarray
        Teneur moyenne conditionnelle, E[X | X > c].
    """

    xc: np.ndarray
    qc: np.ndarray
    gc: np.ndarray


# ---------------------------------------------------------------------------
# Fonctions de calcul
# ---------------------------------------------------------------------------

def reserves_lognormale(
    moyenne: float,
    variance: float,
    coupure: ArrayLike,
) -> ReserveResult:
    """Calcul des réserves sous hypothèse d'une loi **lognormale**.

    Parameters
    ----------
    moyenne : float
        Moyenne arithmétique des teneurs du gisement (> 0).
    variance : float
        Variance des teneurs du gisement (> 0).
    coupure : float or array-like
        Teneur(s) de coupure à évaluer.

    Returns
    -------
    ReserveResult
        Objet contenant xc, qc et gc.

    Notes
    -----
    Si X ~ Lognormale(μ, σ²) avec E[X] = ``moyenne`` et Var(X) = ``variance``,
    alors σ² = ln(variance / moyenne² + 1) et μ = ln(moyenne) − σ²/2.

    Les formules utilisées sont :

    .. math::
        n_1 = \\frac{\\ln(\\text{moyenne} / c)}{\\sigma} - \\frac{\\sigma}{2}

    .. math::
        n_2 = n_1 + \\sigma

    .. math::
        x_c = \\Phi(n_1), \\quad q_c = \\text{moyenne} \\cdot \\Phi(n_2),
        \\quad g_c = q_c / x_c
    """
    c = np.atleast_1d(np.asarray(coupure, dtype=float))
    m = float(moyenne)

    sigma = np.sqrt(np.log(variance / m**2 + 1))

    n1 = np.log(m / c) / sigma - sigma / 2.0
    n2 = n1 + sigma

    xc = norm.cdf(n1)
    qc = m * norm.cdf(n2)
    gc = np.where(xc > 0, qc / xc, 0.0)

    return ReserveResult(xc=xc, qc=qc, gc=gc)


def reserves_normale(
    moyenne: float,
    variance: float,
    coupure: ArrayLike,
) -> ReserveResult:
    """Calcul des réserves sous hypothèse d'une loi **normale**.

    Parameters
    ----------
    moyenne : float
        Moyenne des teneurs du gisement.
    variance : float
        Variance des teneurs du gisement (> 0).
    coupure : float or array-like
        Teneur(s) de coupure à évaluer.

    Returns
    -------
    ReserveResult
        Objet contenant xc, qc et gc.
    """
    c = np.atleast_1d(np.asarray(coupure, dtype=float))
    m = float(moyenne)
    s = np.sqrt(float(variance))

    xc = norm.cdf((m - c) / s)
    qc = m * xc + s * norm.pdf((c - m) / s)
    gc = np.where(xc > 0, qc / xc, 0.0)

    return ReserveResult(xc=xc, qc=qc, gc=gc)


def reserves(
    moyenne: float,
    variance: float,
    coupure: ArrayLike,
    distribution: str = "lognormale",
) -> ReserveResult:
    """Calcul des réserves — interface unifiée.

    Parameters
    ----------
    moyenne : float
        Moyenne des teneurs du gisement.
    variance : float
        Variance des teneurs du gisement.
    coupure : float or array-like
        Teneur(s) de coupure.
    distribution : {'lognormale', 'normale'}
        Type de distribution supposée pour les teneurs.

    Returns
    -------
    ReserveResult
        Objet contenant xc, qc et gc.

    Examples
    --------
    >>> from lane_taylor.reserves import reserves
    >>> r = reserves(moyenne=1.0, variance=4.0, coupure=0.5)
    >>> print(f"xc = {r.xc[0]:.3f}, gc = {r.gc[0]:.3f}")
    """
    dispatch = {
        "lognormale": reserves_lognormale,
        "normale": reserves_normale,
    }
    fn = dispatch.get(distribution)
    if fn is None:
        raise ValueError(
            f"Distribution '{distribution}' non reconnue. "
            f"Choix possibles : {list(dispatch.keys())}"
        )
    return fn(moyenne, variance, coupure)

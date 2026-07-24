"""
Analyse exploratoire des données — chap. 04.

Statistiques descriptives, histogramme et statistiques de boîte à moustaches
pour un jeu de teneurs (par ex. échantillonné sur un champ synthétique généré
par :func:`geostat_polymtl.simulation_methods.GFFTMA.GFFTMA`).

Permet notamment de comparer la distribution d'un champ **gaussien**
(symétrique) à celle d'un champ **lognormal** (asymétrie positive, queue
droite) — voir :mod:`geostat_polymtl.data.gisement`.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Tuple

import numpy as np
from numpy.typing import ArrayLike


@dataclass
class StatsDescriptives:
    """Statistiques descriptives d'un échantillon."""
    n: int
    moyenne: float
    mediane: float
    ecart_type: float
    variance: float
    cv: float            # coefficient de variation (écart-type / moyenne)
    minimum: float
    maximum: float
    q1: float
    q3: float
    iqr: float
    asymetrie: float     # skewness (Fisher)
    aplatissement: float  # excess kurtosis (Fisher)


def statistiques_descriptives(valeurs: ArrayLike) -> StatsDescriptives:
    """Calcule les statistiques descriptives d'un échantillon.

    L'écart-type et la variance sont **populationnels** (ddof=0), cohérents
    avec l'usage géostatistique. L'asymétrie et l'aplatissement utilisent la
    convention de Fisher (excès de kurtosis ; 0 pour une gaussienne).

    Parameters
    ----------
    valeurs : array-like

    Returns
    -------
    StatsDescriptives

    Examples
    --------
    >>> import numpy as np
    >>> s = statistiques_descriptives(np.array([1.0, 2.0, 2.0, 3.0, 10.0]))
    >>> s.n
    5
    >>> s.asymetrie > 0   # queue à droite
    True
    """
    v = np.asarray(valeurs, dtype=float)
    v = v[~np.isnan(v)]
    n = v.size
    if n == 0:
        raise ValueError("Aucune valeur valide.")

    moyenne = float(np.mean(v))
    variance = float(np.var(v))           # ddof=0
    ecart_type = float(np.sqrt(variance))
    q1, mediane, q3 = (float(x) for x in np.quantile(v, [0.25, 0.5, 0.75]))

    if ecart_type > 0:
        z = (v - moyenne) / ecart_type
        asymetrie = float(np.mean(z**3))
        aplatissement = float(np.mean(z**4) - 3.0)
    else:
        asymetrie = 0.0
        aplatissement = 0.0

    return StatsDescriptives(
        n=n, moyenne=moyenne, mediane=mediane,
        ecart_type=ecart_type, variance=variance,
        cv=(ecart_type / moyenne) if moyenne != 0 else float("nan"),
        minimum=float(np.min(v)), maximum=float(np.max(v)),
        q1=q1, q3=q3, iqr=q3 - q1,
        asymetrie=asymetrie, aplatissement=aplatissement,
    )


def histogramme(
    valeurs: ArrayLike,
    n_classes: int = 12,
) -> Tuple[np.ndarray, np.ndarray]:
    """Histogramme (comptes par classe).

    Parameters
    ----------
    valeurs : array-like
    n_classes : int
        Nombre de classes.

    Returns
    -------
    (comptes, bords) : tuple of np.ndarray
        ``comptes`` de longueur ``n_classes`` ; ``bords`` de longueur
        ``n_classes + 1`` (compatibles ``numpy.histogram``).
    """
    v = np.asarray(valeurs, dtype=float)
    v = v[~np.isnan(v)]
    comptes, bords = np.histogram(v, bins=n_classes)
    return comptes, bords


@dataclass
class StatsBoite:
    """Statistiques pour une boîte à moustaches (boxplot, règle 1.5·IQR)."""
    q1: float
    mediane: float
    q3: float
    moustache_bas: float
    moustache_haut: float
    aberrants: np.ndarray


def boite_a_moustaches(valeurs: ArrayLike) -> StatsBoite:
    """Statistiques de boîte à moustaches (méthode 1.5·IQR de Tukey).

    Parameters
    ----------
    valeurs : array-like

    Returns
    -------
    StatsBoite
    """
    v = np.asarray(valeurs, dtype=float)
    v = v[~np.isnan(v)]
    q1, med, q3 = np.quantile(v, [0.25, 0.5, 0.75])
    iqr = q3 - q1
    lo, hi = q1 - 1.5 * iqr, q3 + 1.5 * iqr
    dans = v[(v >= lo) & (v <= hi)]
    moustache_bas = float(dans.min()) if dans.size else float(q1)
    moustache_haut = float(dans.max()) if dans.size else float(q3)
    aberrants = v[(v < lo) | (v > hi)]
    return StatsBoite(
        q1=float(q1), mediane=float(med), q3=float(q3),
        moustache_bas=moustache_bas, moustache_haut=moustache_haut,
        aberrants=aberrants,
    )


def quantiles(valeurs, probabilites):
    """Quantiles d'un échantillon par interpolation linéaire.

    Parameters
    ----------
    valeurs : array_like
    probabilites : sequence of floats in [0, 1]

    Returns
    -------
    np.ndarray
        Quantiles correspondants. Algorithme : tri puis interpolation linéaire
        entre les rangs (= méthode 7 de Hyndman-Fan, identique à np.quantile).
    """
    v = np.asarray(valeurs, dtype=float)
    return np.quantile(v, probabilites)


def regression_lineaire(x, y):
    """Régression linéaire simple par moindres carrés ordinaires.

    Calcule pente $b$, ordonnée à l'origine $a$ et coefficient de corrélation
    $\\rho$ pour le modèle $y = a + b x + \\epsilon$.

    Parameters
    ----------
    x, y : array_like (n,)

    Returns
    -------
    dict :
        'pente' : b = Cov(x,y) / Var(x)
        'ordonnee' : a = mean(y) - b * mean(x)
        'correlation' : rho = Cov(x,y) / (sigma_x sigma_y)
        'r2' : rho ** 2
    """
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    mx = float(np.mean(x)); my = float(np.mean(y))
    cov_xy = float(np.mean((x - mx) * (y - my)))
    var_x = float(np.mean((x - mx) ** 2))
    var_y = float(np.mean((y - my) ** 2))
    b = cov_xy / var_x if var_x > 1e-12 else 0.0
    a = my - b * mx
    rho = cov_xy / (np.sqrt(var_x * var_y) + 1e-12)
    return {
        'pente': b,
        'ordonnee': a,
        'correlation': float(rho),
        'r2': float(rho * rho),
    }


def densite_normale_standard(x):
    """Densité de la loi N(0, 1) en chaque point x.

    Utile pour comparer un histogramme empirique d'erreurs standardisées à la
    densité théorique attendue (diagnostic de validation croisée, chap. 09).
    """
    x = np.asarray(x, dtype=float)
    return np.exp(-x * x / 2.0) / np.sqrt(2.0 * np.pi)


def densite_normale(x, moyenne: float = 0.0, ecart_type: float = 1.0):
    """Densité de la loi N(moyenne, ecart_type²) en chaque point x.

    Source de vérité des ateliers « densité » de l'annexe B.
    """
    x = np.asarray(x, dtype=float)
    s = float(ecart_type)
    if s <= 0:
        raise ValueError("ecart_type doit être strictement positif.")
    z = (x - float(moyenne)) / s
    return densite_normale_standard(z) / s


_ERF_VEC = np.vectorize(math.erf, otypes=[float])


def repartition_normale(x, moyenne: float = 0.0, ecart_type: float = 1.0):
    """Fonction de répartition F(x) = P(X ≤ x) pour X ~ N(moyenne, ecart_type²).

    Source de vérité des ateliers « fonction de répartition » de l'annexe B.
    """
    x = np.asarray(x, dtype=float)
    s = float(ecart_type)
    if s <= 0:
        raise ValueError("ecart_type doit être strictement positif.")
    z = (x - float(moyenne)) / (s * np.sqrt(2.0))
    return 0.5 * (1.0 + _ERF_VEC(z))


def probabilite_intervalle(a: float, b: float,
                           moyenne: float = 0.0,
                           ecart_type: float = 1.0) -> float:
    """P(a ≤ X ≤ b) pour X ~ N(moyenne, ecart_type²). Les bornes sont
    réordonnées si nécessaire."""
    lo, hi = (a, b) if a <= b else (b, a)
    F = repartition_normale(np.array([lo, hi]), moyenne, ecart_type)
    return float(F[1] - F[0])

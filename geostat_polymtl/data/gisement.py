"""Champ de gisement synthétique — adaptateur autour de GFFTMA.

Ce module est une **fine couche pédagogique** au-dessus de la vraie librairie de
simulation géostatistique du projet :
:func:`geostat_polymtl.simulation_methods.GFFTMA.GFFTMA` (FFT-MA, D. Marcotte /
D. Lauzon). Il ne réimplémente AUCUNE simulation : il se contente de

1. construire une grille 2D et un modèle de covariance pour GFFTMA ;
2. appeler GFFTMA pour obtenir un champ gaussien stationnaire ;
3. appliquer la **distribution marginale** demandée — gaussienne ou
   lognormale — afin de comparer l'effet de la distribution sur les teneurs et
   sur les méthodes d'estimation (chap. 04 et 05).

Note d'import
-------------
GFFTMA et ``cov_func`` utilisent des imports absolus (``from cov_func ...``,
``from functional ...``) qui supposent que le dossier ``geostat_polymtl/`` est
sur le ``sys.path``. L'import de GFFTMA est donc fait **paresseusement** dans
:func:`champ_gisement`, et ce module ajoute au besoin le dossier du package au
``sys.path``. Ainsi, importer ``geostat_polymtl.data.gisement`` ne déclenche
aucune dépendance (utile tant que toutes les dépendances ne sont pas présentes).
"""
from __future__ import annotations

import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Union

import numpy as np
from numpy.typing import ArrayLike

# Codes de modèle de covariance attendus par cov_func/covar (voir covar.py).
_CODES_MODELE = {
    "exponentiel": 2,
    "gaussien": 3,
    "spherique": 4,
    "spherical": 4,
    "exponential": 2,
    "gaussian": 3,
}


def _importer_gfftma():
    """Importe GFFTMA en s'assurant que le dossier du package est sur le path.

    Lève un ``ImportError`` clair si une dépendance manque (ex. ``functional``).
    """
    pkg_dir = Path(__file__).resolve().parent.parent  # .../geostat_polymtl
    if str(pkg_dir) not in sys.path:
        sys.path.insert(0, str(pkg_dir))
    try:
        from simulation_methods.GFFTMA import GFFTMA  # type: ignore
    except ImportError as e:  # pragma: no cover
        raise ImportError(
            "Impossible d'importer GFFTMA (simulation_methods.GFFTMA). "
            "Vérifie que le package `functional` (functional.helper) est présent "
            "et que `geostat_polymtl/` est accessible sur le sys.path. "
            f"Détail : {e}"
        ) from e
    return GFFTMA


def champ_gisement(
    nx: int = 100,
    ny: int = 100,
    portee_x: float = 30.0,
    portee_y: Union[float, None] = None,
    modele_covariance: str = "exponentiel",
    angle: float = 0.0,
    type_champ: str = "gaussien",
    moyenne: float = 1.0,
    variance: float = 1.0,
    seed: int = 0,
) -> np.ndarray:
    """Champ de teneurs 2D simulé par GFFTMA, gaussien **ou** lognormal.

    Parameters
    ----------
    nx, ny : int
        Dimensions de la grille (pixels).
    portee_x : float
        Portée selon X (en pixels/unités de grille, ``dx = dy = 1``).
    portee_y : float, optional
        Portée selon Y (anisotropie). Défaut : isotrope (``= portee_x``).
    modele_covariance : {"exponentiel", "gaussien", "spherique"}
        Modèle de covariance simulé par GFFTMA.
    angle : float
        Angle d'anisotropie (degrés), passé à GFFTMA.
    type_champ : {"gaussien", "lognormal"}
        Distribution marginale des teneurs. ``gaussien`` : champ centré-réduit
        mis à l'échelle ``moyenne``/``variance`` (peut être négatif).
        ``lognormal`` : teneurs strictement positives, asymétrie positive.
    moyenne, variance : float
        Moyenne et variance cibles de la distribution marginale.
    seed : int
        Graine GFFTMA (reproductibilité).

    Returns
    -------
    np.ndarray, shape ``(nx, ny)``
        Champ de teneurs.

    Notes
    -----
    Le champ gaussien et le champ lognormal partageant la même ``seed`` et le
    même modèle ont **la même structure spatiale** : on peut donc visualiser
    l'effet de la seule distribution marginale.

    Examples
    --------
    >>> g  = champ_gisement(64, 64, portee_x=20, type_champ="gaussien", seed=1)   # doctest: +SKIP
    >>> ln = champ_gisement(64, 64, portee_x=20, type_champ="lognormal", seed=1)  # doctest: +SKIP
    >>> (ln > 0).all()                                                            # doctest: +SKIP
    True
    """
    modele_covariance = modele_covariance.lower()
    if modele_covariance not in _CODES_MODELE:
        raise ValueError(
            f"modele_covariance doit être l'un de "
            f"{sorted(set(_CODES_MODELE))}, reçu {modele_covariance!r}."
        )
    py = portee_x if portee_y is None else portee_y
    code = _CODES_MODELE[modele_covariance]

    GFFTMA = _importer_gfftma()

    # Modèle 2D Marcotte : [type, portee_x, portee_y, angle]
    model = [[np.array([code, portee_x, py, angle], dtype=float)]]
    c = [[1.0]]      # palier unitaire ; on standardise ensuite
    nu = [[None]]

    datasim, _, _ = GFFTMA(
        model, c, nu, seed=int(seed), nbsimul=1,
        nx=int(nx), dx=1.0, ny=int(ny), dy=1.0,
    )
    z = np.asarray(datasim[:, 0, 0], dtype=float).reshape(nx, ny)
    # Standardisation N(0, 1) pour découpler structure et distribution.
    z = (z - z.mean()) / (z.std() + 1e-12)

    return appliquer_distribution(z, type_champ, moyenne, variance)


def appliquer_distribution(
    champ_gaussien_standard: np.ndarray,
    type_champ: str = "gaussien",
    moyenne: float = 1.0,
    variance: float = 1.0,
) -> np.ndarray:
    """Applique une distribution marginale à un champ gaussien standardisé.

    Parameters
    ----------
    champ_gaussien_standard : np.ndarray
        Champ gaussien centré-réduit (moyenne 0, variance 1).
    type_champ : {"gaussien", "lognormal"}
    moyenne, variance : float
        Cibles de la distribution marginale.

    Returns
    -------
    np.ndarray
        Champ transformé.
    """
    z = np.asarray(champ_gaussien_standard, dtype=float)
    t = type_champ.lower()
    if t == "gaussien":
        return moyenne + np.sqrt(variance) * z
    if t in ("lognormal", "lognormale", "log-normal"):
        if moyenne <= 0:
            raise ValueError("Pour un champ lognormal, `moyenne` doit être > 0.")
        sigma2 = np.log(1.0 + variance / moyenne**2)
        mu = np.log(moyenne) - 0.5 * sigma2
        return np.exp(mu + np.sqrt(sigma2) * z)
    raise ValueError("type_champ doit être 'gaussien' ou 'lognormal'.")


@dataclass
class EchantillonnageChamp:
    """Points prélevés sur un champ.

    Attributes
    ----------
    coordonnees : np.ndarray, shape (n, 2)
        Coordonnées (x, y) en pixels.
    valeurs : np.ndarray, shape (n,)
        Teneurs aux points.
    """
    coordonnees: np.ndarray
    valeurs: np.ndarray


def echantillonner_champ(
    champ: np.ndarray,
    n: int = 20,
    rng: Union[int, np.random.Generator, None] = None,
    marge: int = 0,
    grappe: float = 0.0,
) -> EchantillonnageChamp:
    """Prélève ``n`` points sur un champ (uniforme ou préférentiel).

    Parameters
    ----------
    champ : np.ndarray, shape (nx, ny)
    n : int
        Nombre de points.
    rng : int, np.random.Generator ou None
        Graine.
    marge : int
        Marge (pixels) exclue sur les bords.
    grappe : float
        Intensité de l'échantillonnage préférentiel (0 = uniforme ; > 0 =
        groupé sur les zones riches). Illustre le biais d'échantillonnage et le
        dégroupement (chap. 04).

    Returns
    -------
    EchantillonnageChamp
    """
    gen = rng if isinstance(rng, np.random.Generator) else np.random.default_rng(rng)
    nx, ny = champ.shape
    lo_x, hi_x = marge, nx - marge
    lo_y, hi_y = marge, ny - marge

    if grappe <= 0.0:
        xs = gen.integers(lo_x, hi_x, size=n)
        ys = gen.integers(lo_y, hi_y, size=n)
    else:
        sub = champ[lo_x:hi_x, lo_y:hi_y].astype(float)
        z = (sub - sub.mean()) / (sub.std() + 1e-12)
        poids = np.exp(np.clip(grappe * 3.0 * z, -20, 20)).ravel()
        poids /= poids.sum()
        idx = gen.choice(poids.size, size=n, replace=True, p=poids)
        w = sub.shape[1]
        xs = (idx // w) + lo_x
        ys = (idx % w) + lo_y

    coords = np.column_stack([xs, ys]).astype(float)
    valeurs = champ[xs.astype(int), ys.astype(int)].astype(float)
    return EchantillonnageChamp(coordonnees=coords, valeurs=valeurs)


def erreur_estimation(valeurs_vraies: ArrayLike, valeurs_estimees: ArrayLike):
    """Compare des valeurs estimées à la réalité.

    Parameters
    ----------
    valeurs_vraies, valeurs_estimees : array-like
        Mêmes positions ; les ``NaN`` sont ignorés.

    Returns
    -------
    (biais, rmse, mae) : tuple of float
        Biais moyen (estimé − vrai), RMSE, erreur absolue moyenne.
    """
    v = np.asarray(valeurs_vraies, dtype=float).ravel()
    e = np.asarray(valeurs_estimees, dtype=float).ravel()
    masque = ~(np.isnan(v) | np.isnan(e))
    if not masque.any():
        return (np.nan, np.nan, np.nan)
    d = e[masque] - v[masque]
    return (float(np.mean(d)), float(np.sqrt(np.mean(d**2))), float(np.mean(np.abs(d))))

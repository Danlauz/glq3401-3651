"""Variance de bloc par quadrature de Gauss-Legendre (chap. 08).

La variance moyenne d'un bloc de support :math:`V` sous un modele de covariance
:math:`C(h)` est :

.. math::
    \\bar{C}(V, V) = \\frac{1}{|V|^2} \\int_V \\int_V C(x - y) \\, dx \\, dy

On approxime cette integrale par une quadrature de Gauss-Legendre tensorisee
(1D/2D/3D selon la geometrie du bloc). La covariance est evaluee via
``geostat_polymtl.cov_func.covar`` (aucune duplication des modeles).

Convention de portee
--------------------
Les portees ``ax``, ``ay``, ``az`` sont des **portees pratiques 95 %**.
Conversion automatique vers la portee interne de ``covar`` selon le modele.
"""
from __future__ import annotations

import math
from typing import Tuple

import numpy as np
from numpy.polynomial.legendre import leggauss

from geostat_polymtl.cov_func.covar import covar


# Codes des modeles dans cov_func.covar (cf. cov_funcs dans covar.py)
_CODES_MODELE = {
    "spherique":   4,
    "exponentiel": 2,
    "gaussien":    3,
    "spherical":   4,
    "exponential": 2,
    "gaussian":    3,
}


def _range_pratique_vers_interne(modele: str, a: float) -> float:
    """Convertit la portee pratique 95 % vers le parametre ``range`` interne.

    Spherique : ``range = a`` (palier atteint a h=a).
    Exponentiel : ``range = a/3`` (gamma(a) = 1 − e⁻³ ≈ 95 %).
    Gaussien : ``range = a/sqrt(3)`` (idem).
    """
    m = modele.lower()
    if m in ("spherique", "spherical"):
        return float(a)
    if m in ("exponentiel", "exponential"):
        return float(a) / 3.0
    if m in ("gaussien", "gaussian"):
        return float(a) / math.sqrt(3.0)
    raise ValueError(f"modele inconnu : {modele!r}")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _points_quadrature_unite(n_points: int) -> Tuple[np.ndarray, np.ndarray]:
    """Points et poids de Gauss-Legendre sur [0, 1]."""
    pts, w = leggauss(int(n_points))
    pts = 0.5 * (pts + 1.0)
    w   = 0.5 * w
    return pts, w


def points_quadrature_visu(
    geometrie: str,
    lx: float, ly: float = 0.0, lz: float = 0.0,
    n_points: int = 5,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Coordonnees des points de quadrature pour visualisation pedagogique.

    Renvoie (x, y, z) — z est ``None`` en 1D/2D, y est nul en 1D.
    """
    pts_1D, _ = _points_quadrature_unite(n_points)
    g = geometrie.lower()
    if g == "ligne":
        x = pts_1D * float(lx)
        return x, np.zeros_like(x), np.zeros_like(x)
    if g == "surface":
        X, Y = np.meshgrid(pts_1D * float(lx), pts_1D * float(ly), indexing="ij")
        return X.ravel(), Y.ravel(), np.zeros_like(X.ravel())
    if g == "cube":
        X, Y, Z = np.meshgrid(pts_1D * float(lx), pts_1D * float(ly),
                              pts_1D * float(lz), indexing="ij")
        return X.ravel(), Y.ravel(), Z.ravel()
    raise ValueError("geometrie doit etre 'ligne', 'surface' ou 'cube'.")


def _model_cov(modele: str, range_x: float, range_y: float = None,
               range_z: float = None) -> np.ndarray:
    """Construit le tableau ``model`` attendu par cov_func.covar.

    Convention :
        1D : [type, range_x]
        2D : [type, range_x, range_y]
        3D : [type, range_x, range_y, range_z]
    """
    code = _CODES_MODELE[modele.lower()]
    # NB : functional.helper.trans n'applique l'anisotropie par axe que si le
    # modele porte AUSSI les angles (sinon il retombe sur une portee isotrope =
    # 1re valeur). Il faut donc 4 colonnes en 2D [code, rx, ry, angle] et 7 en
    # 3D [code, rx, ry, rz, angx, angy, angz]. Angles nuls : axes alignes.
    if range_z is not None and range_y is not None:
        return np.array([[code, range_x, range_y, range_z, 0.0, 0.0, 0.0]], dtype=float)
    if range_y is not None:
        return np.array([[code, range_x, range_y, 0.0]], dtype=float)
    return np.array([[code, range_x]], dtype=float)


# ---------------------------------------------------------------------------
# Calculs principaux
# ---------------------------------------------------------------------------

def variance_bloc_quadrature(
    geometrie: str,
    lx: float, ly: float, lz: float,
    palier: float,
    ax: float, ay: float, az: float,
    modele: str = "spherique",
    n_points: int = 5,
) -> Tuple[float, np.ndarray, np.ndarray, np.ndarray]:
    """Variance moyenne d'un bloc par quadrature de Gauss-Legendre.

    Parameters
    ----------
    geometrie : {"ligne", "surface", "cube"}
        Dimension du support (1D, 2D, 3D).
    lx, ly, lz : float
        Longueurs du bloc dans chaque direction. ``ly`` et ``lz`` sont ignores
        en 1D ; ``lz`` est ignore en 2D.
    palier : float
        Palier (sill) de la covariance structuree.
    ax, ay, az : float
        Portees pratiques 95 % dans chaque direction.
    modele : {"spherique", "exponentiel", "gaussien"}
        Modele de covariance (geostat_polymtl.cov_func.covar).
    n_points : int
        Nombre de points de Gauss-Legendre par direction.

    Returns
    -------
    variance : float
        Variance moyenne du bloc.
    pts_x, pts_y, pts_z : np.ndarray
        Coordonnees des points de quadrature (utiles pour visualisation).
        En 1D/2D, les dimensions inutilisees contiennent des zeros.
    """
    pts_1D, w_1D = _points_quadrature_unite(n_points)
    g = geometrie.lower()

    # Conversion portee pratique → portee interne covar
    rx = _range_pratique_vers_interne(modele, ax)
    ry = _range_pratique_vers_interne(modele, ay)
    rz = _range_pratique_vers_interne(modele, az)

    if g == "ligne":
        coords = (pts_1D * float(lx)).reshape(-1, 1)
        weights = w_1D
        model = _model_cov(modele, rx)
        c = np.array([[float(palier)]], dtype=float)
        K = np.asarray(covar(coords, coords, model, c))
        var = float(np.sum(weights[:, None] * weights[None, :] * K))
        return var, coords[:, 0], np.zeros_like(coords[:, 0]), np.zeros_like(coords[:, 0])

    if g == "surface":
        X, Y = np.meshgrid(pts_1D * float(lx), pts_1D * float(ly), indexing="ij")
        coords = np.column_stack([X.ravel(), Y.ravel()])
        weights = np.outer(w_1D, w_1D).ravel()
        model = _model_cov(modele, rx, ry)
        c = np.array([[float(palier)]], dtype=float)
        K = np.asarray(covar(coords, coords, model, c))
        var = float(np.sum(weights[:, None] * weights[None, :] * K))
        return var, coords[:, 0], coords[:, 1], np.zeros_like(coords[:, 0])

    if g == "cube":
        X, Y, Z = np.meshgrid(pts_1D * float(lx), pts_1D * float(ly),
                              pts_1D * float(lz), indexing="ij")
        coords = np.column_stack([X.ravel(), Y.ravel(), Z.ravel()])
        weights = np.outer(np.outer(w_1D, w_1D), w_1D).ravel()
        model = _model_cov(modele, rx, ry, rz)
        c = np.array([[float(palier)]], dtype=float)
        K = np.asarray(covar(coords, coords, model, c))
        var = float(np.sum(weights[:, None] * weights[None, :] * K))
        return var, coords[:, 0], coords[:, 1], coords[:, 2]

    raise ValueError("geometrie doit etre 'ligne', 'surface' ou 'cube'.")


def variance_bloc_calculateur(
    dim: int,
    palier: float, pepite: float,
    ax: float, ay: float, az: float,
    lx: float, ly: float, lz: float,
    modele: str = "spherique",
    n_points: int = 50,
) -> float:
    """Calculateur generique 1D/2D/3D avec discretisation reguliere.

    Variante du calculateur pedagogique : echantillonne le bloc sur une grille
    reguliere ``n_points`` par dimension, evalue la covariance via
    ``cov_func.covar`` puis moyenne. L'effet de pepite ``c0`` est ajoute sur
    la diagonale (regularisation classique).

    Parameters
    ----------
    dim : {1, 2, 3}
    palier : float
        Palier structurel (c1).
    pepite : float
        Effet de pepite (c0).
    ax, ay, az : float
        Portees pratiques 95 %.
    lx, ly, lz : float
        Longueurs du bloc.
    modele : {"spherique", "exponentiel", "gaussien"}
    n_points : int

    Returns
    -------
    float
        Variance moyenne du bloc (palier_structurel + effet pepite regularise).
    """
    rx = _range_pratique_vers_interne(modele, ax)
    ry = _range_pratique_vers_interne(modele, ay)
    rz = _range_pratique_vers_interne(modele, az)

    if dim == 1:
        x = np.linspace(0.0, float(lx), int(n_points))[:, None]
        model = _model_cov(modele, rx)
        c = np.array([[float(palier)]], dtype=float)
        K = np.asarray(covar(x, x, model, c))
    elif dim == 2:
        x = np.linspace(0.0, float(lx), int(n_points))
        y = np.linspace(0.0, float(ly), int(n_points))
        X, Y = np.meshgrid(x, y, indexing="ij")
        coords = np.column_stack([X.ravel(), Y.ravel()])
        model = _model_cov(modele, rx, ry)
        c = np.array([[float(palier)]], dtype=float)
        K = np.asarray(covar(coords, coords, model, c))
    elif dim == 3:
        x = np.linspace(0.0, float(lx), int(n_points))
        y = np.linspace(0.0, float(ly), int(n_points))
        z = np.linspace(0.0, float(lz), int(n_points))
        X, Y, Z = np.meshgrid(x, y, z, indexing="ij")
        coords = np.column_stack([X.ravel(), Y.ravel(), Z.ravel()])
        model = _model_cov(modele, rx, ry, rz)
        c = np.array([[float(palier)]], dtype=float)
        K = np.asarray(covar(coords, coords, model, c))
    else:
        raise ValueError("dim doit valoir 1, 2 ou 3.")

    # Regularisation du nugget sur la diagonale
    if pepite > 0:
        np.fill_diagonal(K, K.diagonal() + float(pepite))
    return float(np.mean(K))


def variance_bloc_support(
    range_x: float, range_y: float,
    palier: float, pepite: float,
    block_size: int, pixel_size: float = 1.0,
    angle_deg: float = 0.0,
    modele: str = "spherique",
    n_points: int = 40,
) -> float:
    """Variance d'un bloc carre en fonction de la taille de support (atelier 8.1).

    Calque de ``theoretical_block_variance_fast`` du notebook Chap7_VarianceBloc :
    la covariance **structuree** est moyennee sur une grille reguliere
    ``n_points x n_points`` du bloc (carre ``block_size x block_size`` pixels),
    et l'effet de pepite est **regularise par l'aire** du bloc.

    L'anisotropie (portees ``range_x``/``range_y`` + rotation ``angle_deg``) est
    geree par ``cov_func.covar`` via le 4e terme du modele (aucune duplication).

    Parameters
    ----------
    range_x, range_y : float
        Portees pratiques 95 % (grande / petite).
    palier : float
        Palier structurel ``c1``.
    pepite : float
        Effet de pepite ``c0`` (regularise par l'aire du bloc).
    block_size : int
        Cote du bloc en pixels.
    pixel_size : float
        Taille d'un pixel.
    angle_deg : float
        Angle de l'anisotropie (degres).
    modele : {"spherique", "exponentiel", "gaussien"}
    n_points : int
        Resolution de la grille de discretisation.

    Returns
    -------
    float
        Variance de bloc (covariance structuree moyenne + pepite/aire).
    """
    if block_size <= 1:
        return float(palier + pepite)
    code = _CODES_MODELE[modele.lower()]
    rx = _range_pratique_vers_interne(modele, range_x)
    ry = _range_pratique_vers_interne(modele, range_y)
    coords_1d = np.linspace(-block_size * pixel_size / 2.0,
                            block_size * pixel_size / 2.0, int(n_points))
    X, Y = np.meshgrid(coords_1d, coords_1d, indexing="ij")
    pts = np.column_stack([X.ravel(), Y.ravel()])
    model = np.array([[code, rx, ry, float(angle_deg)]], dtype=float)
    c = np.array([[float(palier)]], dtype=float)
    K = np.asarray(covar(pts, pts, model, c))
    mean_structured = float(np.mean(K))
    area = (block_size * pixel_size) ** 2
    return mean_structured + float(pepite) / area

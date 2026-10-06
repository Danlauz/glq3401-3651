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


def variance_dispersion_courbe(
    range_x: float, range_y: float,
    palier: float, pepite: float,
    taille_champ: int, taille_max: int,
    pixel_size: float = 1.0,
    angle_deg: float = 0.0,
    modele: str = "spherique",
    normaliser: bool = True,
):
    """Variance de DISPERSION des moyennes de blocs dans un champ fini (atelier 8.1).

    La variance de bloc "theorique" usuelle, :math:`\\bar{C}(v, v)`, suppose un
    domaine infini. Or la courbe experimentale de l'atelier est mesuree sur un
    champ carre de ``taille_champ`` pixels : ce que l'on observe est une
    **variance de dispersion**, donnee par la relation d'additivite de Krige

    .. math::
        D^2(v \\mid V) = \\bar{C}(v, v) - \\bar{C}_v(D, D)

    ou :math:`D` est le domaine balaye par les centres des fenetres glissantes,
    de taille :math:`(N - b + 1)^2`, et :math:`C_v` la covariance du champ
    regularise sur le bloc. Le terme retranche est nul pour un domaine infini ;
    il vaut environ 10 % du signal lorsque le bloc atteint le quart du champ.

    Le calcul est fait exactement sur la grille discrete des pixels (pas de
    quadrature) : la covariance structuree est evaluee une seule fois sur la
    grille des decalages, puis moyennee par les autocorrelations des noyaux
    d'agregation, au moyen de convolutions FFT. L'effet de pepite est traite
    naturellement par le poids du decalage nul.

    Parameters
    ----------
    range_x, range_y : float
        Portees pratiques 95 % (grande / petite).
    palier : float
        Palier structurel ``c1``.
    pepite : float
        Effet de pepite ``c0``.
    taille_champ : int
        Cote du champ simule, en pixels (``N``).
    taille_max : int
        Plus grande taille de bloc a evaluer.
    pixel_size : float
        Taille d'un pixel.
    angle_deg : float
        Angle de l'anisotropie (degres).
    modele : {"spherique", "exponentiel", "gaussien"}
    normaliser : bool
        Si vrai, la courbe est remise a l'echelle pour valoir ``palier + pepite``
        au support 1. C'est necessaire lorsque le champ simule a ete standardise
        (variance d'echantillon forcee au palier), ce qui est le cas des ateliers :
        sans cela les deux courbes different de 1 a 2 % des le support 1.

    Returns
    -------
    tailles : list of int
    dispersion : list of float
        :math:`D^2(v \\mid V)` — a comparer a la variance experimentale.
    bloc : list of float
        :math:`\\bar{C}(v, v)` — la variance de bloc en domaine infini.
    """
    N = int(taille_champ)
    bmax = min(int(taille_max), N)
    code = _CODES_MODELE[modele.lower()]
    rx = _range_pratique_vers_interne(modele, range_x)
    ry = _range_pratique_vers_interne(modele, range_y)

    # Covariance structuree sur la grille des decalages entiers -(N-1)..(N-1).
    pas = np.arange(-(N - 1), N) * float(pixel_size)
    GX, GY = np.meshgrid(pas, pas, indexing="ij")
    lags = np.column_stack([GX.ravel(), GY.ravel()])
    model = np.array([[code, rx, ry, float(angle_deg)]], dtype=float)
    c = np.array([[float(palier)]], dtype=float)
    C = np.asarray(covar(lags, np.zeros((1, 2)), model, c),
                   dtype=float).reshape(GX.shape)
    centre = N - 1

    def _autocorr(n: int) -> np.ndarray:
        """Autocorrelation normalisee du noyau uniforme n x n, somme = 1."""
        t = np.convolve(np.ones(n), np.ones(n)) / float(n * n)
        return np.outer(t, t)

    def _conv2(a: np.ndarray, b: np.ndarray) -> np.ndarray:
        s = np.array(a.shape) + np.array(b.shape) - 1
        taille = 1 << int(math.ceil(math.log2(int(s.max()))))
        prod = np.fft.rfft2(a, (taille, taille)) * np.fft.rfft2(b, (taille, taille))
        return np.fft.irfft2(prod, (taille, taille))[:s[0], :s[1]]

    def _moyenner(K: np.ndarray) -> float:
        """Somme ponderee de C par le noyau K, plus la pepite au decalage nul."""
        k = (K.shape[0] - 1) // 2
        sl = slice(centre - k, centre + k + 1)
        return float((K * C[sl, sl]).sum()) + float(pepite) * float(K[k, k])

    tailles, dispersion, bloc = [], [], []
    for b in range(1, bmax + 1):
        m = N - b + 1
        if m < 2:
            break
        noyau_bloc = _autocorr(b)
        c_vv = _moyenner(noyau_bloc)
        c_vDD = _moyenner(_conv2(noyau_bloc, _autocorr(m)))
        tailles.append(b)
        bloc.append(c_vv)
        dispersion.append(max(c_vv - c_vDD, 0.0))

    if normaliser and dispersion and dispersion[0] > 0:
        facteur = (float(palier) + float(pepite)) / dispersion[0]
        dispersion = [v * facteur for v in dispersion]
    return tailles, dispersion, bloc

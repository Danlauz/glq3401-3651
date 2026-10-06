"""Variogramme experimental sur donnees dispersees (chap. 07).

Ce module implemente :

1. La **nuee variographique** : pour chaque paire (i, j) de points
   d'echantillonnage, on calcule la distance h_ij et la demi-variance
   gamma_ij = 0.5 (Z_i - Z_j)². Ce nuage represente toutes les contributions
   elementaires au variogramme experimental.

2. Le **variogramme experimental binne** : on classe les paires en
   intervalles de distance et on moyenne ``gamma_ij`` par classe pour obtenir
   ``gamma_hat(h_k)`` avec un compte par classe.

Aucune duplication de la librairie : ce sont les definitions statistiques
directes du variogramme (cf. Chiles & Delfiner, 2012). Le module
``GeoStatFFT`` couvre le cas grille reguliere ; celui-ci couvre le cas
scattered (points epars 2D/3D).
"""
from __future__ import annotations

from typing import Tuple

import numpy as np


def nuee_variographique(
    coords: np.ndarray,
    valeurs: np.ndarray,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Nuee variographique : (h_ij, gamma_ij) pour chaque paire.

    Parameters
    ----------
    coords : (n, d) array
        Coordonnees des points d'echantillonnage (d = 2 ou 3).
    valeurs : (n,) array
        Valeur Z_i au point i.

    Returns
    -------
    h : (m,) array
        Distance euclidienne pour chaque paire.
    gamma : (m,) array
        Demi-variance ``0.5 (Z_i - Z_j)²``.
    idx_i, idx_j : (m,) int arrays
        Indices des paires (pour traçage interactif).
    """
    coords = np.asarray(coords, float)
    valeurs = np.asarray(valeurs, float)
    n = coords.shape[0]
    # Paires triangulaires (i < j) pour eviter les doublons
    i_idx, j_idx = np.triu_indices(n, k=1)
    diff = coords[i_idx] - coords[j_idx]
    h = np.linalg.norm(diff, axis=1)
    dv = valeurs[i_idx] - valeurs[j_idx]
    gamma = 0.5 * dv * dv
    return h, gamma, i_idx, j_idx


def variogramme_experimental_scatter(
    coords: np.ndarray,
    valeurs: np.ndarray,
    n_lags: int = 10,
    h_max: float | None = None,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Variogramme experimental par classes de distance (binning isotrope).

    Parameters
    ----------
    coords : (n, d) array
    valeurs : (n,) array
    n_lags : int
        Nombre de classes de distance.
    h_max : float, optional
        Distance maximale incluse. Defaut : ``demi-diagonale du cuboid``
        couvrant les points.

    Returns
    -------
    h_centres : (n_lags,) array
        Centre de chaque classe.
    gamma_moyen : (n_lags,) array
        gamma_hat(h_k) = moyenne des gamma_ij par classe.
        Les classes vides retournent ``nan``.
    comptes : (n_lags,) int array
        Nombre de paires par classe.

    Notes
    -----
    Definition standard du variogramme experimental :
    ``gamma_hat(h_k) = (1 / 2 |N_k|) sum_{(i,j) in N_k} (Z_i - Z_j)²``
    avec ``N_k = {(i,j) : h_k - dh/2 <= h_ij < h_k + dh/2}``.
    """
    coords = np.asarray(coords, float)
    h, gamma, _, _ = nuee_variographique(coords, valeurs)
    if h_max is None:
        # demi-diagonale du bounding box
        bbox = coords.max(axis=0) - coords.min(axis=0)
        h_max = 0.5 * float(np.linalg.norm(bbox))
    bords = np.linspace(0.0, float(h_max), int(n_lags) + 1)
    h_centres = 0.5 * (bords[:-1] + bords[1:])

    gamma_moyen = np.full(int(n_lags), np.nan, dtype=float)
    comptes = np.zeros(int(n_lags), dtype=int)
    for k in range(int(n_lags)):
        masque = (h >= bords[k]) & (h < bords[k + 1])
        n_k = int(masque.sum())
        comptes[k] = n_k
        if n_k > 0:
            gamma_moyen[k] = float(gamma[masque].mean())
    return h_centres, gamma_moyen, comptes


def variogramme_experimental_directionnel(
    coords: np.ndarray,
    valeurs: np.ndarray,
    azimut_deg: float,
    tolerance_deg: float = 22.5,
    n_lags: int = 10,
    h_max: float | None = None,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Variogramme directionnel (2D) avec tolerance angulaire.

    Parameters
    ----------
    coords : (n, 2) array
        Coordonnees 2D (x, y).
    valeurs : (n,) array
    azimut_deg : float
        Azimut de la direction (degres, 0 = +x).
    tolerance_deg : float
        Tolerance angulaire (degres) autour de l'azimut.
    n_lags : int
    h_max : float, optional

    Returns
    -------
    Memes sorties que ``variogramme_experimental_scatter``, mais en limitant
    les paires a celles dont l'orientation est dans le cone
    ``azimut ± tolerance``.
    """
    coords = np.asarray(coords, float)
    valeurs = np.asarray(valeurs, float)
    n = coords.shape[0]
    i_idx, j_idx = np.triu_indices(n, k=1)
    diff = coords[i_idx] - coords[j_idx]
    h = np.linalg.norm(diff, axis=1)
    # Angle de la paire (par rapport a +x)
    angle = np.degrees(np.arctan2(diff[:, 1], diff[:, 0]))
    # Difference d'angle ramenee dans [0, 180) (variogramme insensible au sens)
    d_ang = np.abs((angle - float(azimut_deg) + 90.0) % 180.0 - 90.0)
    masque_dir = d_ang <= float(tolerance_deg)
    h = h[masque_dir]
    dv = valeurs[i_idx[masque_dir]] - valeurs[j_idx[masque_dir]]
    gamma = 0.5 * dv * dv

    if h_max is None:
        bbox = coords.max(axis=0) - coords.min(axis=0)
        h_max = 0.5 * float(np.linalg.norm(bbox))
    bords = np.linspace(0.0, float(h_max), int(n_lags) + 1)
    h_centres = 0.5 * (bords[:-1] + bords[1:])
    gamma_moyen = np.full(int(n_lags), np.nan, dtype=float)
    comptes = np.zeros(int(n_lags), dtype=int)
    for k in range(int(n_lags)):
        m = (h >= bords[k]) & (h < bords[k + 1])
        n_k = int(m.sum())
        comptes[k] = n_k
        if n_k > 0:
            gamma_moyen[k] = float(gamma[m].mean())
    return h_centres, gamma_moyen, comptes


def variogramme_cressie_hawkins(
    coords: np.ndarray,
    valeurs: np.ndarray,
    n_lags: int = 10,
    h_max: float | None = None,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Estimateur ROBUSTE de variogramme (Cressie-Hawkins 1980).

    Formule :
        gamma_robust(h) = (1/2) * [ (1/N) sum |Z(x_i) - Z(x_j)|^{1/2} ]^4 / (0.457 + 0.494/N + 0.045/N^2)

    Plus robuste aux valeurs extremes (outliers) que l'estimateur de
    Matheron, car il utilise des differences a la puissance 1/2 puis
    eleve au carre, ce qui attenue le poids des grandes deviations.

    Parameters
    ----------
    coords : (n, d) array
    valeurs : (n,) array
    n_lags : int
    h_max : float, optional

    Returns
    -------
    h_centres, gamma_robust, comptes : (n_lags,) arrays
    """
    h, _, i_idx, j_idx = nuee_variographique(coords, valeurs)
    # Difference absolue
    diff_abs = np.abs(np.asarray(valeurs, float)[i_idx] - np.asarray(valeurs, float)[j_idx])
    sqrt_diff = np.sqrt(diff_abs)  # |Z_i - Z_j|^{1/2}

    if h_max is None:
        bbox = np.asarray(coords, float).max(axis=0) - np.asarray(coords, float).min(axis=0)
        h_max = 0.5 * float(np.linalg.norm(bbox))
    bords = np.linspace(0.0, float(h_max), int(n_lags) + 1)
    h_centres = 0.5 * (bords[:-1] + bords[1:])

    gamma_robust = np.full(int(n_lags), np.nan, dtype=float)
    comptes = np.zeros(int(n_lags), dtype=int)
    for k in range(int(n_lags)):
        masque = (h >= bords[k]) & (h < bords[k + 1])
        n_k = int(masque.sum())
        comptes[k] = n_k
        if n_k > 0:
            mean_sqrt = float(sqrt_diff[masque].mean())
            denom = 0.457 + 0.494 / n_k + 0.045 / (n_k * n_k)
            # gamma_robust = (mean_sqrt^4) / (2 * denom)
            gamma_robust[k] = (mean_sqrt ** 4) / (2.0 * denom)
    return h_centres, gamma_robust, comptes

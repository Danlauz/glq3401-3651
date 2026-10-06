"""Générateurs synthétiques reproductibles.

Migration de ``python_code/geostat_lib.py`` (FFT-MA).

Toutes les fonctions stochastiques acceptent ``rng`` (int, ``np.random.Generator``
ou ``None``). Voir :mod:`geostat_polymtl._seed`.
"""
from __future__ import annotations

from typing import Union

import numpy as np
from numpy.fft import fft2, fftshift, ifft2

from geostat_polymtl._seed import _resolve


def _covariance_spherique_fft(
    taille: int,
    portee: float,
    palier: float = 1.0,
    dtype: np.dtype = np.float32,
) -> np.ndarray:
    """Covariance sphérique sur grille étendue pour FFT-MA.

    Parameters
    ----------
    taille : int
        Taille de la grille finale.
    portee : float
        Portée du variogramme sphérique.
    palier : float, par défaut 1.0
        Palier (variance maximale).
    dtype : numpy dtype
        Type des calculs (par défaut float32 pour limiter la mémoire).

    Returns
    -------
    np.ndarray
        Matrice de covariance étendue et centrée pour FFT.
    """
    extended = 2 * taille
    x = np.arange(-extended // 2, extended // 2)
    X, Y = np.meshgrid(x, x)
    h = np.sqrt(X**2 + Y**2).astype(dtype)
    h_norm = h / portee
    cov = palier * (1.0 - 1.5 * h_norm + 0.5 * h_norm**3)
    cov[h > portee] = 0
    return fftshift(cov)


def champ_fftma_2d(
    taille: int,
    portee: float,
    palier: float = 1.0,
    rng: Union[int, np.random.Generator, None] = None,
    dtype: np.dtype = np.float32,
) -> np.ndarray:
    """Champ gaussien 2D simulé par FFT-MA (Fast Fourier Transform — Moving Average).

    Méthode rapide pour simuler des champs gaussiens stationnaires avec une
    covariance sphérique. Convient pour la pédagogie ; pour la production,
    utiliser des bibliothèques dédiées.

    Parameters
    ----------
    taille : int
        Côté de la grille carrée de sortie (en pixels).
    portee : float
        Portée du variogramme sphérique sous-jacent.
    palier : float, par défaut 1.0
        Palier (variance) du champ.
    rng : int, np.random.Generator ou None
        Graine pour la reproductibilité.
    dtype : numpy dtype
        Type de données pour économiser la mémoire (float32 par défaut).

    Returns
    -------
    np.ndarray, shape ``(taille, taille)``
        Réalisation 2D du champ gaussien.

    Examples
    --------
    >>> champ = champ_fftma_2d(taille=64, portee=20, rng=42)
    >>> champ.shape
    (64, 64)
    """
    generateur = _resolve(rng)
    extended = 2 * taille
    cov_model = _covariance_spherique_fft(taille, portee, palier, dtype)
    cov_fft = np.sqrt(np.abs(fft2(cov_model)))
    white = generateur.normal(size=(extended, extended)).astype(dtype)
    z_fft = cov_fft * fft2(white)
    z_ext = np.real(ifft2(z_fft))
    start = extended // 4
    end = start + taille
    return z_ext[start:end, start:end]


def champ_lognormal_2d(
    taille: int,
    portee: float,
    moyenne: float = 1.0,
    variance: float = 1.0,
    rng: Union[int, np.random.Generator, None] = None,
) -> np.ndarray:
    """Champ lognormal 2D simulé par transformation d'un champ gaussien FFT-MA.

    Parameters
    ----------
    taille : int
        Côté de la grille carrée.
    portee : float
        Portée du variogramme sous-jacent (en pixels).
    moyenne : float, par défaut 1.0
        Moyenne cible du champ lognormal.
    variance : float, par défaut 1.0
        Variance cible du champ lognormal.
    rng : int, np.random.Generator ou None
        Graine.

    Returns
    -------
    np.ndarray, shape ``(taille, taille)``
        Réalisation 2D du champ lognormal (valeurs > 0).

    Notes
    -----
    On utilise la relation :
        Si X ~ N(μ, σ²) alors exp(X) ~ Lognormal(m, v) avec
        μ = ln(m) − 0.5·σ²  et  σ² = ln(1 + v/m²).
    """
    sigma2 = np.log(1.0 + variance / moyenne**2)
    mu = np.log(moyenne) - 0.5 * sigma2
    champ_g = champ_fftma_2d(taille, portee, palier=sigma2, rng=rng)
    return np.exp(mu + champ_g)


def aggregate_blocs(
    champ: np.ndarray,
    taille_bloc: int,
    dtype: np.dtype = np.float32,
) -> np.ndarray:
    """Agrège un champ par moyenne sur des blocs carrés.

    Utile pour simuler le **changement de support** (passage d'un support
    ponctuel à un support « bloc »).

    Parameters
    ----------
    champ : np.ndarray, shape ``(N, N)``
        Champ d'entrée. La dernière ligne/colonne est tronquée si ``N`` n'est
        pas multiple de ``taille_bloc``.
    taille_bloc : int
        Côté du bloc d'agrégation (en pixels).
    dtype : numpy dtype
        Type du résultat.

    Returns
    -------
    np.ndarray, shape ``(N // taille_bloc, N // taille_bloc)``
        Champ agrégé.
    """
    n = champ.shape[0]
    trim = n - (n % taille_bloc)
    sub = champ[:trim, :trim]
    reshaped = sub.reshape(
        trim // taille_bloc, taille_bloc, trim // taille_bloc, taille_bloc
    )
    return reshaped.mean(axis=(1, 3)).astype(dtype)

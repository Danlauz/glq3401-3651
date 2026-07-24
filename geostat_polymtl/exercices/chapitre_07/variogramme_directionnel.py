"""Générateurs de figures — chapitre 07 (variogramme) : champs anisotropes
et variogrammes expérimentaux directionnels + ajustement.

Version Python des scripts MATLAB d'examen
``6-Variogramme/Q3_IdentificationVisuelle.m`` (jeu « portées »),
``Q4_AjustementVisuelle.m`` (variogramme expérimental + ajustement) — couvre
les exercices **C7a-12/13**, **C7b-3/5** (champs/variogrammes directionnels
anisotropes) et **CP2-Q1** (variogramme expérimental directionnel +
ajustement d'un modèle 2D anisotrope).

Réutilisation stricte de la librairie :
  - :func:`GFFTMA` pour simuler le champ de référence (anisotrope) ;
  - :func:`variogramme_experimental_directionnel` pour les variogrammes
    expérimentaux directionnels (cas points épars) ;
  - :func:`covar_nu` pour tracer le **variogramme théorique** d'un modèle
    ajusté (``gamma(h) = C(0) - C(h)`` le long d'une direction).

Conventions d'azimut
--------------------
Le MATLAB (``varioexp2d``/``covardm``) utilise l'azimut **géologique**
(0° = Nord = +y, sens horaire). La librairie
``variogramme_experimental_directionnel`` utilise un azimut **mathématique**
(0° = +x, sens anti-horaire). Conversion appliquée en interne :
``azimut_lib = 90 - azimut_geologique``. Le format de modèle Marcotte
(``[type, ax, ay, angle]``) est partagé tel quel par ``covar_nu`` et
``GFFTMA`` : aucune conversion d'angle sur le modèle.

Chaque générateur retourne ``(fig, axes/ax, infos)`` et accepte ``path``.
"""
from __future__ import annotations

from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np
import matplotlib.pyplot as plt

# --- Réutilisation de la librairie (AUCUNE réimplémentation) ------------------
from geostat_polymtl.simulation_methods.GFFTMA import GFFTMA
from geostat_polymtl.cov_func.covar_nu import covar_nu
from geostat_polymtl.exp_variogram.scatter import (
    variogramme_experimental_directionnel,
)
from geostat_polymtl.exercices.chapitre_07.champs_modeles import _taille_paire


def _enregistrer(fig, path: Optional[str]) -> None:
    """Enregistre la figure si un chemin est fourni."""
    if path:
        fig.savefig(path, dpi=150, bbox_inches="tight")


def _az_geo_vers_lib(az_geo: float) -> float:
    """Azimut géologique (N, horaire) → azimut librairie (E, anti-horaire)."""
    return 90.0 - float(az_geo)


def simuler_champ_reference(
    model: np.ndarray,
    c: np.ndarray,
    seed: int,
    nx: int,
    dx: float,
    ny: Optional[int] = None,
    dy: Optional[float] = None,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Simule un champ de référence 2D par FFT-MA (réutilise :func:`GFFTMA`).

    Parameters
    ----------
    model : (r, 4) array
        Structures au format Marcotte ``[type, ax, ay, angle]``.
    c : (r,) array
        Paliers de chaque structure.
    seed : int
        Graine FFT-MA.
    nx, dx, ny, dy : int/float
        Géométrie de la grille (``ny=nx`` et ``dy=dx`` par défaut).

    Returns
    -------
    champ : (nx, ny) array
        Réalisation du champ.
    coords : (nx*ny, 2) array
        Coordonnées (x, y) en mètres de chaque nœud.
    valeurs : (nx*ny,) array
        Valeurs aplaties (alignées sur ``coords``).
    """
    ny = nx if ny is None else int(ny)
    dy = dx if dy is None else float(dy)
    model = np.atleast_2d(np.asarray(model, dtype=float))
    # Contournement de la parité interne de GFFTMA (voir _taille_paire) ;
    # chaque axe utilise SA portée (anisotropie) pour matcher GFFTMA.
    nx_s = _taille_paire(model, nx, dx, axis=0)
    ny_s = _taille_paire(model, ny, dy, axis=1)
    model_lmc = [[model]]
    c_lmc = [[np.asarray(c, dtype=float)]]
    nu_lmc = [[None]]
    datasim, _, _ = GFFTMA(
        model_lmc, c_lmc, nu_lmc, seed=int(seed), nbsimul=1,
        nx=int(nx_s), dx=float(dx), ny=int(ny_s), dy=float(dy),
    )
    champ = datasim[:, 0, 0].reshape(int(nx_s), int(ny_s))[:int(nx), :int(ny)]
    ii, jj = np.meshgrid(np.arange(int(nx)), np.arange(int(ny)), indexing="ij")
    coords = np.column_stack([jj.ravel() * float(dy), ii.ravel() * float(dx)])
    valeurs = champ.ravel()
    return champ, coords, valeurs


def _vario_theorique_directionnel(
    model: np.ndarray,
    c: np.ndarray,
    az_geo: float,
    h: np.ndarray,
) -> np.ndarray:
    """Variogramme théorique d'un modèle le long d'un azimut géologique.

    ``gamma(h) = C(0) - C(h)`` avec ``C`` calculée par :func:`covar_nu` sur
    des points alignés le long de la direction ``az_geo`` (N, horaire).
    """
    model = np.asarray(model, dtype=float)
    c = np.asarray(c, dtype=float)
    origine = np.array([[0.0, 0.0]])
    # Vecteur unitaire géologique : (sin az, cos az)
    ux, uy = np.sin(np.radians(az_geo)), np.cos(np.radians(az_geo))
    pts = np.column_stack([h * ux, h * uy])
    C0 = float(covar_nu(origine, origine, model, c)[0, 0])
    Ch = np.asarray(covar_nu(pts, origine, model, c)).ravel()
    return C0 - Ch


def variogrammes_directionnels(
    model: np.ndarray,
    c: np.ndarray,
    azimuts_geo: Sequence[float] = (0.0, 45.0, 90.0, 135.0),
    seed: int = 1520,
    nx: int = 250,
    dx: float = 1.0,
    n_echantillons: int = 800,
    tolerance_deg: float = 22.5,
    n_lags: int = 10,
    h_max: Optional[float] = None,
    rng_echantillon: int = 0,
    tracer_modele: bool = True,
    path: Optional[str] = None,
) -> Tuple[plt.Figure, np.ndarray, Dict]:
    """Champ anisotrope + variogrammes expérimentaux directionnels.

    Reproduit la trame des exercices **C7a-12/13, C7b-3/5** : on simule un
    champ anisotrope, on échantillonne des points, et on calcule le
    variogramme expérimental dans plusieurs directions (azimut géologique).
    Le **variogramme théorique** du modèle est superposé (trait plein) pour
    montrer l'ajustement attendu — l'anisotropie se lit sur la portée qui
    varie selon la direction.

    Parameters
    ----------
    model : (r, 4) array
        Modèle Marcotte ``[type, ax, ay, angle]`` (codes 1=pépite,
        2=exponentiel, 3=gaussien, 4=sphérique).
    c : (r,) array
        Paliers.
    azimuts_geo : sequence of float
        Azimuts géologiques (N, horaire) des variogrammes directionnels.
    seed : int
        Graine FFT-MA du champ.
    nx, dx : int, float
        Géométrie de la grille carrée.
    n_echantillons : int
        Nombre de points échantillonnés sur la grille (limite le nombre de
        paires ; reproduit le ``randperm`` du MATLAB).
    tolerance_deg : float
        Tolérance angulaire des variogrammes directionnels.
    n_lags, h_max : int, float
        Paramètres de binning (``h_max`` = demi-diagonale si ``None``).
    rng_echantillon : int
        Graine du tirage d'échantillon.
    tracer_modele : bool
        Superpose le variogramme théorique du modèle.
    path : str, optional
        Chemin d'enregistrement PNG.

    Returns
    -------
    fig : matplotlib Figure
    axes : ndarray d'Axes (1 panneau champ + 1 panneau variogrammes)
    infos : dict
        ``champ``, ``variogrammes`` (dict az → (h, gamma, npaires)),
        ``model``, ``c``.
    """
    champ, coords, valeurs = simuler_champ_reference(model, c, seed, nx, dx)

    # Échantillonnage (réduit le nombre de paires)
    gen = np.random.default_rng(int(rng_echantillon))
    n_pts = min(int(n_echantillons), coords.shape[0])
    idx = gen.choice(coords.shape[0], n_pts, replace=False)
    cc, vv = coords[idx], valeurs[idx]

    if h_max is None:
        h_max = 0.5 * nx * dx

    fig, axes = plt.subplots(1, 2, figsize=(13, 5.5))

    # Panneau 1 : champ de référence
    extent = (0, nx * dx, 0, nx * dx)
    im = axes[0].imshow(champ, cmap="turbo", origin="lower",
                        aspect="equal", extent=extent)
    axes[0].plot(cc[:, 0], cc[:, 1], "k.", ms=2, alpha=0.4)
    axes[0].set_title("Champ de référence (échantillons en noir)")
    axes[0].set_xlabel("x (m)")
    axes[0].set_ylabel("y (m)")
    fig.colorbar(im, ax=axes[0], shrink=0.85)

    # Panneau 2 : variogrammes directionnels
    couleurs = plt.cm.viridis(np.linspace(0, 0.9, len(azimuts_geo)))
    variogrammes: Dict[float, tuple] = {}
    h_lisse = np.linspace(1e-6, h_max, 100)
    for col, az in zip(couleurs, azimuts_geo):
        az_lib = _az_geo_vers_lib(az)
        h, g, n = variogramme_experimental_directionnel(
            cc, vv, az_lib, tolerance_deg=tolerance_deg,
            n_lags=n_lags, h_max=h_max,
        )
        variogrammes[float(az)] = (h, g, n)
        valides = ~np.isnan(g)
        axes[1].plot(h[valides], g[valides], "o", color=col,
                     label=f"az {az:g}°", ms=6)
        if tracer_modele:
            gth = _vario_theorique_directionnel(model, c, az, h_lisse)
            axes[1].plot(h_lisse, gth, "-", color=col, lw=1.5, alpha=0.8)

    C0 = float(covar_nu(np.array([[0.0, 0.0]]), np.array([[0.0, 0.0]]),
                        np.asarray(model, float), np.asarray(c, float))[0, 0])
    axes[1].axhline(C0, ls="--", color="0.4", lw=1, label="palier")
    axes[1].set_xlabel("h (m)")
    axes[1].set_ylabel(r"$\gamma(h)$")
    axes[1].set_title("Variogrammes expérimentaux directionnels (+ modèle)")
    axes[1].legend(fontsize=8)
    axes[1].grid(True, ls=":", alpha=0.6)

    fig.tight_layout()
    infos = {
        "champ": champ,
        "variogrammes": variogrammes,
        "model": np.asarray(model, float),
        "c": np.asarray(c, float),
        "palier": C0,
    }
    _enregistrer(fig, path)
    return fig, axes, infos


# ── Cas concrets repris du MATLAB ────────────────────────────────────────────

def variogramme_cuivre_cp2q1a(
    seed: int = 1520,
    n_echantillons: int = 1000,
    path: Optional[str] = None,
) -> Tuple[plt.Figure, np.ndarray, Dict]:
    """Variogramme directionnel — cuivre (CP2-Q1 a, ``Q4_AjustementVisuelle``).

    Paramètres de la source : grille 100×100, ``dx=3`` ;
    ``model = [1 0 0 0 ; 2 150/3 50/3 45]`` (pépite + exponentiel anisotrope,
    portées pratiques 150/50 m, azimut 45°) ; ``c = [0.1 ; 0.9]`` ;
    ``seed = 1520``. Variogrammes calculés sur 8 directions (tol. 10°) dans le
    MATLAB ; on en trace 4 (0/45/90/135°) pour la lisibilité.
    """
    model = np.array([[1, 0, 0, 0], [2, 150 / 3, 50 / 3, 45]], float)
    c = np.array([0.1, 0.9])
    return variogrammes_directionnels(
        model, c, azimuts_geo=(0, 45, 90, 135), seed=seed,
        nx=100, dx=3.0, n_echantillons=n_echantillons,
        tolerance_deg=22.5, n_lags=12, h_max=120.0, path=path,
    )


def variogramme_isotrope_cp2q1b(
    seed: int = 1520,
    n_echantillons: int = 1000,
    path: Optional[str] = None,
) -> Tuple[plt.Figure, plt.Axes, Dict]:
    """Variogramme omnidirectionnel + ajustement (CP2-Q1 b, exponentiel iso).

    Paramètres de la source : grille 500×500, ``dx=1`` ;
    ``model = [1 0 0 0 ; 2 80/3 40/3 0]`` ; ``c = [50 ; 450]`` ; ``seed=1520`` ;
    1000 données tirées au hasard. Le MATLAB ajuste un modèle
    ``[pépite ; exponentiel]`` ; on superpose ici le variogramme théorique du
    modèle générateur (ajustement « cible »).

    Returns un unique panneau (variogramme omnidirectionnel + modèle).
    """
    model = np.array([[1, 0, 0, 0], [2, 80 / 3, 40 / 3, 0]], float)
    c = np.array([50.0, 450.0])
    champ, coords, valeurs = simuler_champ_reference(model, c, seed, 500, 1.0)

    gen = np.random.default_rng(0)
    idx = gen.choice(coords.shape[0], int(n_echantillons), replace=False)
    cc, vv = coords[idx], valeurs[idx]

    # Omnidirectionnel : tolérance 90° (toutes directions)
    h, g, n = variogramme_experimental_directionnel(
        cc, vv, 0.0, tolerance_deg=90.0, n_lags=14, h_max=140.0,
    )

    fig, ax = plt.subplots(figsize=(7, 5))
    valides = ~np.isnan(g)
    ax.plot(h[valides], g[valides], "ok", ms=6, label="exp. omnidirectionnel")
    h_lisse = np.linspace(1e-6, 140.0, 150)
    gth = _vario_theorique_directionnel(model, c, 0.0, h_lisse)
    ax.plot(h_lisse, gth, "-r", lw=1.8, label="modèle ajusté (pépite+expo)")
    C0 = float(covar_nu(np.array([[0.0, 0.0]]), np.array([[0.0, 0.0]]),
                        model, c)[0, 0])
    ax.axhline(C0, ls="--", color="0.4", lw=1, label="palier = 500")
    ax.set_xlabel("h (m)")
    ax.set_ylabel(r"$\gamma(h)$")
    ax.set_title("Variogramme expérimental + ajustement (CP2-Q1 b)")
    ax.legend()
    ax.grid(True, ls=":", alpha=0.6)
    fig.tight_layout()

    infos = {"champ": champ, "h": h, "gamma": g, "npaires": n,
             "model": model, "c": c, "palier": C0}
    _enregistrer(fig, path)
    return fig, ax, infos


def variogramme_zinc_cp2q1c(
    seed: int = 1528,
    n_echantillons: int = 2000,
    path: Optional[str] = None,
) -> Tuple[plt.Figure, np.ndarray, Dict]:
    """Variogramme directionnel — zinc anisotrope (CP2-Q1 c / C7b-3).

    Paramètres de la source : grille 750×750, ``dx=1`` ;
    ``model = [1 0 0 0 ; 2 100/3 40/3 125]`` (pépite + exponentiel anisotrope,
    portées pratiques 100/40 m, azimut 125°) ; ``c = [0.5 ; 2]`` ;
    ``seed = 1528`` ; 8 directions (tol. 22.5°) dans le MATLAB.
    """
    model = np.array([[1, 0, 0, 0], [2, 100 / 3, 40 / 3, 125]], float)
    c = np.array([0.5, 2.0])
    return variogrammes_directionnels(
        model, c, azimuts_geo=(35, 80, 125, 170), seed=seed,
        nx=250, dx=1.0, n_echantillons=n_echantillons,
        tolerance_deg=22.5, n_lags=10, h_max=120.0, path=path,
    )

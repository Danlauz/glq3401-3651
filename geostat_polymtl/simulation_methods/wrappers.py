"""Wrappers pedagogiques pour les methodes de simulation continue (chap. 12).

Ce module ne reimplemente rien : il offre une interface uniforme et conviviale
au-dessus des 4 methodes existantes :
- ``GFFTMA`` (FFT-MA)         — grille reguliere, rapide ; format LMC (p,p object)
- ``LU``                       — Cholesky, exact mais O(n^3) ; format intrinsic (r,p,p)
- ``SGS``                      — sequentiel gaussien (avec conditionnement) ; idem LU
- ``STBM``                     — bandes tournantes ; format intrinsic (r, p) et c (rp, p)
"""
from __future__ import annotations

import math
from typing import Dict, Sequence

import numpy as np

from geostat_polymtl.simulation_methods.GFFTMA import GFFTMA
from geostat_polymtl.simulation_methods.LU import LU
from geostat_polymtl.simulation_methods.SGS import SGS
from geostat_polymtl.simulation_methods.STBM import STBM


_CODES = {
    "nugget": 1, "pepite": 1,
    "exponentiel": 2, "exponential": 2,
    "gaussien": 3, "gaussian": 3,
    "spherique": 4, "spherical": 4,
}


def _range_pratique_vers_interne(modele: str, a: float) -> float:
    """Portee pratique 95% -> portee interne."""
    m = modele.lower()
    if m in ("spherique", "spherical"):
        return float(a)
    if m in ("exponentiel", "exponential"):
        return float(a) / 3.0
    if m in ("gaussien", "gaussian"):
        return float(a) / math.sqrt(3.0)
    return 1e-6


def _model_intrinsic_2d(modele: str, portee: float, palier: float, pepite: float = 0.0):
    """Format Marcotte intrinsic 2D : (model array, paliers array).

    Returns
    -------
    model : (r, 4) array — chaque ligne [code, ax, ay, angle]
    paliers : (r,) array — palier par structure
    """
    code = _CODES[modele.lower()]
    r = _range_pratique_vers_interne(modele, portee)
    rows = []
    paliers = []
    if pepite > 0:
        rows.append([1, 1e-6, 1e-6, 0.0])
        paliers.append(float(pepite))
    rows.append([code, r, r, 0.0])
    paliers.append(float(palier))
    return np.array(rows, dtype=float), np.array(paliers, dtype=float)


def _format_lmc_univarie(model_arr, paliers):
    """LMC pour p=1 : model et c en (1,1) object array."""
    model_lmc = np.empty((1, 1), dtype=object)
    model_lmc[0, 0] = model_arr  # (r, 4)
    c_lmc = np.empty((1, 1), dtype=object)
    c_lmc[0, 0] = paliers  # (r,)
    return model_lmc, c_lmc


def _format_intrinsic_3d(paliers):
    """LU/SGS attendent c en (r, p, p) — pour p=1 : (r, 1, 1)."""
    return paliers.reshape(-1, 1, 1)


def _format_intrinsic_2d(paliers):
    """STBM attend c en (rp, p) — pour p=1 : (r, 1)."""
    return paliers.reshape(-1, 1)


# ---------------------------------------------------------------------------
# Methodes de simulation
# ---------------------------------------------------------------------------

def simuler_gfftma(N: int, modele: str, portee: float, palier: float = 1.0,
                    pepite: float = 0.0, seed: int = 42, nbsim: int = 1) -> np.ndarray:
    """Simulation FFT-MA sur grille N x N (format LMC)."""
    model_arr, paliers = _model_intrinsic_2d(modele, portee, palier, pepite)
    model_lmc, c_lmc = _format_lmc_univarie(model_arr, paliers)
    # nu doit suivre le format LMC (p,p) : GFFTMA indexe nu[i][j] (covar_nu).
    # Passer un simple None plante (NoneType non indexable) ; on enveloppe
    # comme model/c dans une cellule (1,1) -> [[None]] pour p=1.
    nu_lmc = [[None]]
    pad = math.ceil(2 * _range_pratique_vers_interne(modele, portee))
    N_eff = N if (pad + N) % 2 == 0 else N + 1
    d, _, _ = GFFTMA(model_lmc, c_lmc, nu_lmc, seed=int(seed), nbsimul=int(nbsim),
                      nx=N_eff, dx=1.0, ny=N_eff, dy=1.0)
    out = np.asarray(d[:, :, 0], dtype=float).reshape(N_eff, N_eff, nbsim)
    out = out[:N, :N, :]
    if nbsim == 1:
        return out[:, :, 0]
    return out.transpose(2, 0, 1)


def simuler_lu(N: int, modele: str, portee: float, palier: float = 1.0,
                pepite: float = 0.0, seed: int = 42, nbsim: int = 1,
                x_cond: np.ndarray | None = None) -> np.ndarray:
    """Simulation Cholesky (LU). Conditionnel si x_cond=(n,d+1)."""
    if N > 60:
        raise ValueError(f"LU O(N^6) couteux : grille N={N} > 60. Utilisez FFT-MA.")
    model_arr, paliers = _model_intrinsic_2d(modele, portee, palier, pepite)
    c = _format_intrinsic_3d(paliers)
    coords = np.array([[i, j] for j in range(N) for i in range(N)], dtype=float)
    d_sim = LU(coords, model_arr, c, None, nbsim=int(nbsim), seed=int(seed),
                x_cond=x_cond)
    out = np.asarray(d_sim, dtype=float).reshape(N, N, nbsim, order='F')
    if nbsim == 1:
        return out[:, :, 0]
    return out.transpose(2, 0, 1)


def simuler_sgs(N: int, modele: str, portee: float, palier: float = 1.0,
                 pepite: float = 0.0, seed: int = 42, nbsim: int = 1,
                 x_cond: np.ndarray | None = None,
                 nk: int = 12, rad: float = None) -> np.ndarray:
    """Simulation sequentielle gaussienne. Conditionnel si x_cond."""
    model_arr, paliers = _model_intrinsic_2d(modele, portee, palier, pepite)
    c = _format_intrinsic_3d(paliers)
    coords = np.array([[i, j] for j in range(N) for i in range(N)], dtype=float)
    d_sim = SGS(coords, model_arr, c, None, nbsim=int(nbsim), seed=int(seed),
                 x_cond=x_cond, nk=int(nk),
                 rad=np.inf if rad is None else float(rad))
    out = np.asarray(d_sim, dtype=float).reshape(N, N, nbsim, order='F')
    if nbsim == 1:
        return out[:, :, 0]
    return out.transpose(2, 0, 1)


def simuler_stbm(N: int, modele: str, portee: float, palier: float = 1.0,
                  pepite: float = 0.0, seed: int = 42, nbsim: int = 1,
                  nl: int = 300) -> np.ndarray:
    """Simulation par bandes tournantes (STBM). c au format (r, 1)."""
    model_arr, paliers = _model_intrinsic_2d(modele, portee, palier, pepite)
    c = _format_intrinsic_2d(paliers)
    coords = np.array([[i, j] for j in range(N) for i in range(N)], dtype=float)
    d_sim = STBM(coords, model_arr, c, None, nbsim=int(nbsim), nl=int(nl),
                  seed=int(seed))
    out = np.asarray(d_sim, dtype=float).reshape(N, N, nbsim, order='F')
    if nbsim == 1:
        return out[:, :, 0]
    return out.transpose(2, 0, 1)


def post_conditionner(champ_nc: np.ndarray, coords_data: np.ndarray, valeurs: np.ndarray,
                       N: int, modele: str, portee: float, palier: float = 1.0,
                       pepite: float = 0.0) -> Dict:
    """Post-conditionnement d'une simulation NC par krigeage.

    Z_cond(x) = Z_NC(x) + [Z_krige(donnees, x) - Z_krige(Z_NC[donnees], x)]
    """
    from geostat_polymtl.kriging.wrappers import krigeage_simple

    coords_data = np.asarray(coords_data, dtype=float)
    valeurs = np.asarray(valeurs, dtype=float)
    z_nc_at_data = np.array([
        champ_nc[int(round(p[1])), int(round(p[0]))]
        for p in coords_data
    ])

    grille = np.array([[i, j] for j in range(N) for i in range(N)], dtype=float)
    structs = [{'modele': modele, 'palier': palier, 'portee': portee}]
    r_obs = krigeage_simple(coords_data, valeurs, grille,
                              structs, pepite=pepite, moyenne=0.0)
    z_krig_obs = r_obs['estimations'].reshape(N, N)

    r_nc = krigeage_simple(coords_data, z_nc_at_data, grille,
                             structs, pepite=pepite, moyenne=0.0)
    z_krig_nc = r_nc['estimations'].reshape(N, N)

    champ_cond = champ_nc + (z_krig_obs - z_krig_nc)
    return {
        "champ_nc": champ_nc,
        "champ_cond": champ_cond,
        "z_krig_obs": z_krig_obs,
        "z_krig_nc": z_krig_nc,
    }

"""Wrappers pedagogiques autour de ``cokri`` (chap. 09).

Ce module n'implemente aucune mathematique : il sert d'interface conviviale
entre les widgets/notebooks et la fonction generale ``cokri`` de
``geostat_polymtl.kriging.cokriging``. Toute la resolution (construction du
systeme, multiplicateurs de Lagrange, ponderation, krigeage de bloc,
voisinage limite, validation croisee) est deleguee a ``cokri``.

Fonctions exposees
------------------
krigeage_simple(...)        krigeage simple (KS) — itype=1
krigeage_ordinaire(...)     krigeage ordinaire (KO) — itype=2
krigeage_universel(...)     krigeage universel (KU) — itype=4 (lin) ou 5 (quad)
krigeage_bloc(...)          krigeage ponctuel/bloc avec discretisation
validation_croisee(...)     validation croisee LOO via cokri ival=1
systeme_krigeage(...)       construit (et resout) le systeme pour un seul
                            point cible et expose A, b, lambda, mu pour
                            l'atelier « calculateur pas-a-pas »

Convention de portee
--------------------
Comme ailleurs dans la librairie, l'interface utilise la **portee pratique
95 %**. Conversion vers la portee interne de ``covar_nu`` selon le modele :
- spherique   : a (palier atteint a h=a)
- exponentiel : a / 3       (gamma(a) = 1 - e^-3 ~ 95 %)
- gaussien    : a / sqrt(3)  (idem)
"""
from __future__ import annotations

import math
from typing import Dict, List, Sequence, Tuple, Union

import numpy as np

from geostat_polymtl.kriging.cokriging import cokri


# Codes Marcotte (cf. covar_nu.py) : 1=nugget, 2=expo, 3=gauss, 4=spherique
_CODES = {
    "nugget":     1,
    "pepite":     1,
    "exponentiel": 2,
    "exponential": 2,
    "gaussien":   3,
    "gaussian":   3,
    "spherique":  4,
    "spherical":  4,
}


def _range_pratique_vers_interne(modele: str, a: float) -> float:
    """Convertit portee pratique 95 % vers la portee interne de covar_nu."""
    m = modele.lower()
    if m in ("spherique", "spherical"):
        return float(a)
    if m in ("exponentiel", "exponential"):
        return float(a) / 3.0
    if m in ("gaussien", "gaussian"):
        return float(a) / math.sqrt(3.0)
    if m in ("nugget", "pepite"):
        return 1e-6  # ignore en pratique
    raise ValueError(f"modele inconnu : {modele!r}")


def _construire_modele_cokri(
    structures: Sequence[Dict],
    pepite: float,
    d: int,
) -> Tuple[np.ndarray, np.ndarray]:
    """Construit (model, c) au format intrinsic (shared model) pour cokri.

    Parameters
    ----------
    structures : sequence of dict
        Chaque structure contient :
          - 'modele' : nom (str)
          - 'palier' : float (c_i)
          - 'portee' : float OR liste [ax, ay, ...] (portees pratiques)
          - 'angle' : float, optionnel (degres), defaut 0
    pepite : float
        Effet de pepite c_0 (>=0).
    d : int
        Dimension spatiale (1, 2 ou 3).

    Returns
    -------
    model : np.ndarray (r, 1 + d + nb_angles)
        Tableau de structures au format Marcotte :
          1D : [type, range1]
          2D : [type, range1, range2, angle]
          3D : [type, range1, range2, range3, a1, a2, a3]
    c : np.ndarray (r, 1, 1) ou (r, 1)
        Paliers associes a chaque structure.
    """
    rows_model: List[List[float]] = []
    paliers: List[float] = []

    # Effet de pepite -> structure de type 1 avec portee minuscule
    if pepite > 0:
        if d == 1:
            rows_model.append([1, 1e-6])
        elif d == 2:
            rows_model.append([1, 1e-6, 1e-6, 0.0])
        else:
            rows_model.append([1, 1e-6, 1e-6, 1e-6, 0.0, 0.0, 0.0])
        paliers.append(float(pepite))

    # Structures geographiques
    for s in structures:
        modele = str(s.get("modele", "spherique"))
        code = _CODES[modele.lower()]
        palier = float(s["palier"])

        portee = s["portee"]
        angle = float(s.get("angle", 0.0))

        # Acceptation portee scalaire (isotrope) ou liste
        if isinstance(portee, (int, float)):
            ax = ay = az = _range_pratique_vers_interne(modele, portee)
        else:
            portees = list(portee)
            ax = _range_pratique_vers_interne(modele, portees[0])
            ay = _range_pratique_vers_interne(modele, portees[1]) if len(portees) > 1 else ax
            az = _range_pratique_vers_interne(modele, portees[2]) if len(portees) > 2 else ax

        if d == 1:
            rows_model.append([code, ax])
        elif d == 2:
            rows_model.append([code, ax, ay, angle])
        else:
            rows_model.append([code, ax, ay, az, angle, 0.0, 0.0])
        paliers.append(palier)

    model = np.array(rows_model, dtype=float)
    # c au format (r, 1, 1) pour p=1
    c = np.array(paliers, dtype=float).reshape(-1, 1, 1)
    return model, c


def _prepare_x(coords_data: np.ndarray, valeurs: np.ndarray) -> Tuple[np.ndarray, int]:
    """Concatene coords (n, d) + valeurs (n,) en (n, d+1) pour cokri."""
    coords = np.atleast_2d(np.asarray(coords_data, dtype=float))
    if coords.ndim == 1:
        coords = coords.reshape(-1, 1)
    n, d = coords.shape
    v = np.asarray(valeurs, dtype=float).reshape(n, 1)
    return np.hstack([coords, v]), d


def _prepare_x0(coords_cible: np.ndarray, d: int) -> np.ndarray:
    """Met les coordonnees cible au format (m, d)."""
    x0 = np.atleast_2d(np.asarray(coords_cible, dtype=float))
    if x0.ndim == 1:
        x0 = x0.reshape(-1, d)
    if x0.shape[1] != d:
        # cas 1D : on accepte un vecteur a transposer
        if x0.shape[0] == d:
            x0 = x0.T
    return x0


# ---------------------------------------------------------------------------
# Krigeage simple / ordinaire / universel — interface friendly
# ---------------------------------------------------------------------------

def _krigeage_general(
    coords_data,
    valeurs,
    coords_cible,
    structures: Sequence[Dict],
    pepite: float = 0.0,
    moyenne: float = 0.0,
    itype: int = 2,
    nk: int = None,
    rad: float = None,
) -> Dict:
    """Squelette pour KS / KO / KU. Appelle cokri.

    Returns
    -------
    dict with:
      'estimations' : (m,) array
      'variances'   : (m,) array
      'sv'          : float (variance dans l'univers)
      'lambda'      : (n_eff + nc, 1) du dernier point estime
      'mu'          : multiplicateur(s) du dernier point estime
      'matrice_A'   : (n_eff + nc, n_eff + nc) du dernier systeme
      'vecteur_b'   : (n_eff + nc, 1) du dernier RHS
    """
    x, d = _prepare_x(coords_data, valeurs)
    x0 = _prepare_x0(coords_cible, d)
    model, c = _construire_modele_cokri(structures, pepite, d)

    n = x.shape[0]
    if nk is None:
        nk = n
    if rad is None:
        rad = 1e12

    block = np.zeros(d, dtype=float)
    nd = np.ones(d, dtype=int)

    x0s, s, sv, _id, l_sys, k_sys, k0_sys = cokri(
        x, x0, model, c, None, itype, float(moyenne),
        block, nd, ival=0, nk=int(nk), rad=float(rad), ntok=1,
    )

    estimations = x0s[:, d:].ravel()
    variances = s[:, d:].ravel()

    # Extraction des poids / multiplicateurs pour le DERNIER point estime
    if l_sys is None or l_sys.size == 0:
        lam = mu = np.array([])
        A = b = np.array([])
    else:
        # Format cokri : l = (nz + nc + ndr, m_eff*p). m_eff=1 ici (ntok=1).
        l_last = np.asarray(l_sys).ravel()
        # itype=1 : pas de contrainte ; itype=2 : 1 contrainte ; itype>=3 : p ; itype=4 : +d*p
        if itype == 1:
            nc = 0
        elif itype == 2:
            nc = 1
        elif itype == 3:
            nc = 1  # p=1
        elif itype == 4:
            nc = 1 + d  # 1 constraint + d drift coefs (for p=1)
        elif itype == 5:
            # ordre 2 : 1 + d + d*(d+1)/2 termes
            q = d * (d + 1) // 2
            nc = 1 + d + q
        else:
            nc = 0
        nz = len(l_last) - nc
        lam = l_last[:nz]
        mu = l_last[nz:nz + nc] if nc > 0 else np.array([])
        A = np.asarray(k_sys)
        b = np.asarray(k0_sys).ravel()

    return {
        "estimations": np.asarray(estimations, dtype=float),
        "variances": np.asarray(variances, dtype=float),
        "sv": float(np.asarray(sv).ravel()[0]),
        "lambda": np.asarray(lam, dtype=float),
        "mu": np.asarray(mu, dtype=float),
        "matrice_A": A,
        "vecteur_b": b,
    }


def krigeage_simple(
    coords_data,
    valeurs,
    coords_cible,
    structures: Sequence[Dict],
    pepite: float = 0.0,
    moyenne: float = 0.0,
    nk: int = None,
    rad: float = None,
) -> Dict:
    """Krigeage simple : moyenne connue, pas de contrainte sur les poids.

    Voir :func:`_krigeage_general` pour le format de sortie.
    """
    return _krigeage_general(
        coords_data, valeurs, coords_cible, structures, pepite,
        moyenne=moyenne, itype=1, nk=nk, rad=rad,
    )


def krigeage_ordinaire(
    coords_data,
    valeurs,
    coords_cible,
    structures: Sequence[Dict],
    pepite: float = 0.0,
    nk: int = None,
    rad: float = None,
) -> Dict:
    """Krigeage ordinaire : moyenne inconnue, contrainte ``sum lambda = 1``.

    Le multiplicateur de Lagrange ``mu`` est dans la cle ``'mu'``.
    """
    return _krigeage_general(
        coords_data, valeurs, coords_cible, structures, pepite,
        moyenne=0.0, itype=2, nk=nk, rad=rad,
    )


def krigeage_universel(
    coords_data,
    valeurs,
    coords_cible,
    structures: Sequence[Dict],
    pepite: float = 0.0,
    ordre: int = 1,
    nk: int = None,
    rad: float = None,
) -> Dict:
    """Krigeage universel : moyenne = polynome des coordonnees.

    Parameters
    ----------
    ordre : {1, 2}
        Degre du polynome de derive (1 = lineaire, 2 = quadratique).
    """
    itype = 4 if ordre == 1 else 5
    return _krigeage_general(
        coords_data, valeurs, coords_cible, structures, pepite,
        moyenne=0.0, itype=itype, nk=nk, rad=rad,
    )


def krigeage_derive_externe(
    coords_data,
    valeurs,
    coords_cible,
    secondaire_data,
    secondaire_cible,
    structures: Sequence[Dict],
    pepite: float = 0.0,
) -> Dict:
    """Krigeage avec derive externe (KED).

    La moyenne (derive) est supposee proportionnelle a une variable
    SECONDAIRE s(x) connue partout : ``E[Z(x)] = a0 + a1 s(x)``. On resout le
    systeme du krigeage ordinaire augmente d'une contrainte de derive :

        sum_i lambda_i        = 1            (biais nul)
        sum_i lambda_i s(x_i) = s(x_0)       (derive externe)

    Parameters
    ----------
    secondaire_data : (n,) array
        Valeurs de la variable secondaire AUX DONNEES.
    secondaire_cible : (m,) array
        Valeurs de la variable secondaire AUX CIBLES (connue partout).
    structures, pepite
        Modele de covariance du RESIDU (comme KS/KO/KU).

    Returns
    -------
    dict : 'estimations' (m,), 'variances' (m,), 'sv', 'lambda' (n,), 'mu' (2,)
    """
    from geostat_polymtl.kriging.cokriging import _ensure_covar_format
    from geostat_polymtl.cov_func.covar_nu import covar_nu as _covar

    x, d = _prepare_x(coords_data, valeurs)
    x0 = _prepare_x0(coords_cible, d)
    model, c = _construire_modele_cokri(structures, pepite, d)
    cobj, nuobj, _p = _ensure_covar_format(c, None, 1)

    coords = x[:, :d]
    z = x[:, d]
    n = coords.shape[0]
    m = x0.shape[0]
    s_d = np.asarray(secondaire_data, dtype=float).ravel()
    s_0 = np.asarray(secondaire_cible, dtype=float).ravel()
    if s_d.size != n:
        raise ValueError(f"secondaire_data doit avoir {n} valeurs, recu {s_d.size}")
    if s_0.size != m:
        raise ValueError(f"secondaire_cible doit avoir {m} valeurs, recu {s_0.size}")

    K = np.asarray(_covar(coords, coords, model, cobj, nuobj), dtype=float)
    K0 = np.asarray(_covar(coords, x0, model, cobj, nuobj), dtype=float)
    sv = float(np.asarray(_covar(np.zeros((1, d)), np.zeros((1, d)), model, cobj, nuobj)).ravel()[0])

    ones = np.ones((n, 1))
    scol = s_d.reshape(-1, 1)
    A = np.block([
        [K,       ones,            scol],
        [ones.T,  np.zeros((1, 2))],
        [scol.T,  np.zeros((1, 2))],
    ])
    B = np.vstack([K0, np.ones((1, m)), s_0.reshape(1, m)])

    try:
        l = np.linalg.solve(A, B)
    except np.linalg.LinAlgError:
        l = np.linalg.lstsq(A, B, rcond=None)[0]

    lam = l[:n, :]
    est = lam.T @ z
    var = sv - np.einsum("ij,ij->j", l, B)

    return {
        "estimations": np.asarray(est, dtype=float).ravel(),
        "variances": np.maximum(np.asarray(var, dtype=float).ravel(), 0.0),
        "sv": sv,
        "lambda": np.asarray(lam[:, -1], dtype=float),
        "mu": np.asarray(l[n:, -1], dtype=float),
    }


# ---------------------------------------------------------------------------
# Krigeage de bloc
# ---------------------------------------------------------------------------

def krigeage_bloc(
    coords_data,
    valeurs,
    coords_cible,
    structures: Sequence[Dict],
    bloc: Sequence[float],
    discretisation: Sequence[int],
    pepite: float = 0.0,
    moyenne: float = 0.0,
    type_kriging: str = "ordinaire",
    nk: int = None,
    rad: float = None,
) -> Dict:
    """Krigeage de bloc : ``Z_v = (1/|v|) integral Z(x) dx`` sur un bloc.

    Parameters
    ----------
    bloc : sequence of float, length d
        Dimensions du bloc dans chaque direction (taille).
    discretisation : sequence of int, length d
        Nombre de points de discretisation par direction.
    type_kriging : {"simple", "ordinaire"}
        Type de krigeage utilise pour la pondration.
    """
    x, d = _prepare_x(coords_data, valeurs)
    x0 = _prepare_x0(coords_cible, d)
    model, c = _construire_modele_cokri(structures, pepite, d)

    itype = 1 if type_kriging == "simple" else 2
    n = x.shape[0]
    if nk is None:
        nk = n
    if rad is None:
        rad = 1e12

    block_v = np.asarray(bloc, dtype=float)
    nd_v = np.asarray(discretisation, dtype=int)

    x0s, s, sv, _id, l_sys, k_sys, k0_sys = cokri(
        x, x0, model, c, None, itype, float(moyenne),
        block_v, nd_v, ival=0, nk=int(nk), rad=float(rad), ntok=1,
    )

    return {
        "estimations": np.asarray(x0s[:, d:], dtype=float).ravel(),
        "variances": np.asarray(s[:, d:], dtype=float).ravel(),
        "sv": float(np.asarray(sv).ravel()[0]),
    }


# ---------------------------------------------------------------------------
# Validation croisee LOO
# ---------------------------------------------------------------------------

def validation_croisee(
    coords_data,
    valeurs,
    structures: Sequence[Dict],
    pepite: float = 0.0,
    type_kriging: str = "ordinaire",
    moyenne: float = 0.0,
    nk: int = None,
    rad: float = None,
) -> Dict:
    """Validation croisee « leave-one-out » via cokri ival=1.

    Returns
    -------
    dict with:
      'estimations' : Z*_-i pour chaque point
      'variances'   : sigma2_K,-i
      'erreurs'     : e_i = Z_i - Z*_-i
      'erreurs_std' : e_i / sigma_K,-i
      'moyenne_e_std' : moyenne des erreurs standardisees
      'var_e_std'   : variance des erreurs standardisees
      'observees'   : Z_i
    """
    x, d = _prepare_x(coords_data, valeurs)
    model, c = _construire_modele_cokri(structures, pepite, d)
    itype = 1 if type_kriging == "simple" else 2

    n = x.shape[0]
    if nk is None:
        nk = n
    if rad is None:
        rad = 1e12

    block_v = np.zeros(d, dtype=float)
    nd_v = np.ones(d, dtype=int)

    x0s, s, sv, _id, _l, _k, _k0 = cokri(
        x, np.zeros((1, d)),  # x0 ignore en cross-val
        model, c, None, itype, float(moyenne),
        block_v, nd_v, ival=1, nk=int(nk), rad=float(rad), ntok=1,
    )

    obs = np.asarray(valeurs, dtype=float).ravel()
    est = np.asarray(x0s[:, d:], dtype=float).ravel()
    var = np.asarray(s[:, d:], dtype=float).ravel()
    err = obs - est
    sigma = np.sqrt(np.maximum(var, 1e-12))
    err_std = err / sigma

    return {
        "estimations": est,
        "variances": var,
        "erreurs": err,
        "erreurs_std": err_std,
        "moyenne_e_std": float(np.mean(err_std)),
        "var_e_std": float(np.var(err_std, ddof=1)),
        "observees": obs,
    }


# ---------------------------------------------------------------------------
# Systeme de krigeage (calculateur pas a pas)
# ---------------------------------------------------------------------------

def systeme_krigeage(
    coords_data,
    valeurs,
    coords_cible,
    structures: Sequence[Dict],
    pepite: float = 0.0,
    type_kriging: str = "ordinaire",
    moyenne: float = 0.0,
) -> Dict:
    """Resout le systeme pour UNE SEULE cible et renvoie le detail
    pedagogique (matrice A, vecteur b, poids, multiplicateur, estimation,
    variance) — pour l'atelier « calculateur ».
    """
    type_to_itype = {"simple": 1, "ordinaire": 2, "universel": 4}
    itype = type_to_itype.get(type_kriging, 2)

    res = _krigeage_general(
        coords_data, valeurs, coords_cible, structures, pepite,
        moyenne=moyenne, itype=itype,
    )

    # Matrice des distances entre paires (utile pour pedagogie)
    x, d = _prepare_x(coords_data, valeurs)
    coords = x[:, :d]
    n = coords.shape[0]
    dist_paires = np.linalg.norm(
        coords[:, None, :] - coords[None, :, :], axis=2
    )
    cible = _prepare_x0(coords_cible, d)[0]
    dist_cible = np.linalg.norm(coords - cible[None, :], axis=1)

    return {
        **res,
        "distances_paires": dist_paires,
        "distances_cible": dist_cible,
        "n_donnees": n,
        "dimension": d,
    }


# ===========================================================================
# COKRIGEAGE MULTIVARIABLE (chap. 10)
# ===========================================================================

def _construire_modele_cokri_multi(
    structures: Sequence[Dict],
    nugget_matrix: np.ndarray | None,
    d: int,
    p: int,
) -> Tuple[np.ndarray, np.ndarray]:
    """Construit (model, c) pour le cokrigeage multivariable p>1.

    Chaque structure est partagee entre les p variables (modele spatial
    commun, type Marcotte) ; les paliers sont une MATRICE p x p sous LMC.

    Parameters
    ----------
    structures : sequence of dict
        Chaque structure :
          'modele' : str (spherique, exponentiel, gaussien)
          'portee' : float ou [ax, ay, ...] (portee pratique 95 %)
          'angle'  : float, optionnel
          'palier_matrix' : (p, p) array (matrice de paliers LMC)
              OU 'palier' scalaire (alors la matrice = diag(palier))
    nugget_matrix : (p, p) array or None
        Matrice de pepite (avec termes croises pour bruit correle).
    d : dimension spatiale
    p : nombre de variables

    Returns
    -------
    model : (r, 1 + d + n_angles) array
    c : (r, p, p) array — sill matrices empilees
    """
    rows_model: List[List[float]] = []
    c_list: List[np.ndarray] = []

    if nugget_matrix is not None and np.any(np.asarray(nugget_matrix) != 0):
        if d == 1:
            rows_model.append([1, 1e-6])
        elif d == 2:
            rows_model.append([1, 1e-6, 1e-6, 0.0])
        else:
            rows_model.append([1, 1e-6, 1e-6, 1e-6, 0.0, 0.0, 0.0])
        c_list.append(np.asarray(nugget_matrix, dtype=float))

    for s in structures:
        modele = str(s.get("modele", "spherique"))
        code = _CODES[modele.lower()]
        portee = s["portee"]
        angle = float(s.get("angle", 0.0))

        if isinstance(portee, (int, float)):
            ax = ay = az = _range_pratique_vers_interne(modele, portee)
        else:
            portees = list(portee)
            ax = _range_pratique_vers_interne(modele, portees[0])
            ay = _range_pratique_vers_interne(modele, portees[1]) if len(portees) > 1 else ax
            az = _range_pratique_vers_interne(modele, portees[2]) if len(portees) > 2 else ax

        if d == 1:
            rows_model.append([code, ax])
        elif d == 2:
            rows_model.append([code, ax, ay, angle])
        else:
            rows_model.append([code, ax, ay, az, angle, 0.0, 0.0])

        if "palier_matrix" in s:
            cm = np.asarray(s["palier_matrix"], dtype=float)
            if cm.shape != (p, p):
                raise ValueError(f"palier_matrix doit etre ({p}, {p}), recu {cm.shape}")
        elif "palier" in s:
            cm = float(s["palier"]) * np.eye(p)
        else:
            raise ValueError("structure : 'palier_matrix' ou 'palier' requis")
        c_list.append(cm)

    model = np.array(rows_model, dtype=float)
    c = np.stack(c_list, axis=0)  # (r, p, p)
    return model, c


def _prepare_x_multi(
    coords_data: np.ndarray,
    valeurs: Sequence[np.ndarray],
) -> Tuple[np.ndarray, int, int]:
    """Construit la matrice x au format cokri pour p variables.

    Parameters
    ----------
    coords_data : (n, d) array
    valeurs : sequence of p arrays (each shape (n,))
        Les NaN sont permis (cokri gere les donnees manquantes).

    Returns
    -------
    x : (n, d + p) array
    d, p : int
    """
    coords = np.atleast_2d(np.asarray(coords_data, dtype=float))
    if coords.ndim == 1:
        coords = coords.reshape(-1, 1)
    n, d = coords.shape
    p = len(valeurs)
    V = np.zeros((n, p), dtype=float)
    for i, v in enumerate(valeurs):
        V[:, i] = np.asarray(v, dtype=float)
    return np.hstack([coords, V]), d, p


def cokrigeage_simple(
    coords_data,
    valeurs: Sequence,
    coords_cible,
    structures: Sequence[Dict],
    nugget_matrix=None,
    moyennes: Sequence[float] = None,
    nk: int = None,
    rad: float = None,
) -> Dict:
    """Cokrigeage simple (itype=1) pour p variables.

    Parameters
    ----------
    coords_data : (n, d) array
    valeurs : sequence of p arrays (each shape (n,)) — NaN autorise.
    coords_cible : (m, d) array
    structures : sequence of dict avec 'palier_matrix' (p, p) ou 'palier' scalaire
    nugget_matrix : (p, p) array, optionnel
    moyennes : array of length p (moyennes globales par variable)

    Returns
    -------
    dict :
      'estimations' : (m, p) array
      'variances'   : (m, p) array
      'sv'          : (p,) array
    """
    x, d, p = _prepare_x_multi(coords_data, valeurs)
    x0 = _prepare_x0(coords_cible, d)
    model, c = _construire_modele_cokri_multi(structures, nugget_matrix, d, p)
    if moyennes is None:
        moyennes = np.zeros(p)
    # cokri utilise avg comme SCALAIRE (soustraction commune) ; pour p
    # variables avec moyennes differentes, on centre les valeurs avant.
    moyennes = np.asarray(moyennes, dtype=float)
    x_centered = x.copy()
    for i in range(p):
        x_centered[:, d + i] -= moyennes[i]

    n = x.shape[0]
    if nk is None: nk = n
    if rad is None: rad = 1e12

    block = np.zeros(d); nd = np.ones(d, dtype=int)
    x0s, s, sv, _id, l_sys, k_sys, k0_sys = cokri(
        x_centered, x0, model, c, None, 1, 0.0,
        block, nd, ival=0, nk=int(nk), rad=float(rad), ntok=1,
    )
    # Re-ajouter les moyennes (le centrage etait local)
    est = x0s[:, d:].copy()
    for i in range(p):
        est[:, i] += moyennes[i]

    return {
        "estimations": np.asarray(est, dtype=float),
        "variances": np.asarray(s[:, d:], dtype=float),
        "sv": np.asarray(sv, dtype=float),
    }


def cokrigeage_ordinaire(
    coords_data,
    valeurs: Sequence,
    coords_cible,
    structures: Sequence[Dict],
    nugget_matrix=None,
    nk: int = None,
    rad: float = None,
) -> Dict:
    """Cokrigeage ordinaire (itype=3, p contraintes : sum_lambda_i = 1 par var).

    Returns same dict as cokrigeage_simple.
    """
    x, d, p = _prepare_x_multi(coords_data, valeurs)
    x0 = _prepare_x0(coords_cible, d)
    model, c = _construire_modele_cokri_multi(structures, nugget_matrix, d, p)

    n = x.shape[0]
    if nk is None: nk = n
    if rad is None: rad = 1e12

    block = np.zeros(d); nd = np.ones(d, dtype=int)
    x0s, s, sv, _id, l_sys, k_sys, k0_sys = cokri(
        x, x0, model, c, None, 3, 0.0,
        block, nd, ival=0, nk=int(nk), rad=float(rad), ntok=1,
    )
    return {
        "estimations": np.asarray(x0s[:, d:], dtype=float),
        "variances": np.asarray(s[:, d:], dtype=float),
        "sv": np.asarray(sv, dtype=float),
    }


def cokrigeage_universel(
    coords_data,
    valeurs: Sequence,
    coords_cible,
    structures: Sequence[Dict],
    nugget_matrix=None,
    ordre: int = 1,
    nk: int = None,
    rad: float = None,
) -> Dict:
    """Cokrigeage universel (itype=4 ordre 1 / itype=5 ordre 2).

    Chaque variable a une derive polynomiale propre des coordonnees ; cokri
    ajoute les contraintes de non-biais par variable (comme le CO) PLUS les
    coefficients de derive. Returns same dict as cokrigeage_simple.
    """
    x, d, p = _prepare_x_multi(coords_data, valeurs)
    x0 = _prepare_x0(coords_cible, d)
    model, c = _construire_modele_cokri_multi(structures, nugget_matrix, d, p)
    itype = 4 if ordre == 1 else 5

    n = x.shape[0]
    if nk is None: nk = n
    if rad is None: rad = 1e12

    block = np.zeros(d); nd = np.ones(d, dtype=int)
    x0s, s, sv, _id, l_sys, k_sys, k0_sys = cokri(
        x, x0, model, c, None, itype, 0.0,
        block, nd, ival=0, nk=int(nk), rad=float(rad), ntok=1,
    )
    return {
        "estimations": np.asarray(x0s[:, d:], dtype=float),
        "variances": np.asarray(s[:, d:], dtype=float),
        "sv": np.asarray(sv, dtype=float),
    }


def systeme_cokrigeage(
    coords_data,
    valeurs: Sequence,
    coords_cible,
    structures: Sequence[Dict],
    nugget_matrix=None,
    type_kriging: str = "ordinaire",
    moyennes: Sequence[float] = None,
) -> Dict:
    """Renvoie A, b, lambda pour un seul point cible (calculateur p>1).

    Pour pedagogie : matrices LMC empilees, contraintes par variable.
    """
    x, d, p = _prepare_x_multi(coords_data, valeurs)
    x0 = _prepare_x0(coords_cible, d)
    model, c = _construire_modele_cokri_multi(structures, nugget_matrix, d, p)

    itype = 1 if type_kriging == "simple" else 3
    if moyennes is None:
        moyennes = np.zeros(p)
    moyennes = np.asarray(moyennes, dtype=float)

    x_used = x.copy()
    if itype == 1:
        for i in range(p):
            x_used[:, d + i] -= moyennes[i]

    block = np.zeros(d); nd = np.ones(d, dtype=int)
    x0s, s, sv, _id, l_sys, k_sys, k0_sys = cokri(
        x_used, x0, model, c, None, itype, 0.0,
        block, nd, ival=0, nk=x.shape[0], rad=1e12, ntok=1,
    )

    est = np.asarray(x0s[:, d:], dtype=float)
    if itype == 1:
        for i in range(p):
            est[:, i] += moyennes[i]

    return {
        "estimations": est.ravel().tolist(),
        "variances": np.asarray(s[:, d:], dtype=float).ravel().tolist(),
        "sv": np.asarray(sv, dtype=float).tolist(),
        "matrice_A": np.asarray(k_sys, dtype=float),
        "vecteur_b": np.asarray(k0_sys, dtype=float),
        "lambda": np.asarray(l_sys, dtype=float),
        "n_donnees": x.shape[0],
        "n_variables": p,
        "dimension": d,
    }

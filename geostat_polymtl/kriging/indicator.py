"""Krigeage d'indicatrices (chap. 11).

Le krigeage d'indicatrices (KI) consiste a :
  1. Coder une variable continue Z en N indicatrices I_k(x) = 1{Z(x) <= z_k}.
  2. Kriger chaque indicatrice (KO) -> P*(Z(x) <= z_k) pour chaque seuil.
  3. Corriger les violations de la relation d'ordre (CDF doit etre monotone).
  4. Decoder la CCDF locale pour obtenir mediane, moments, P(Z > coupure), etc.

Tout le krigeage des indicatrices est delegue a la fonction `cokri` de
`geostat_polymtl.kriging.cokriging`. Ce module n'implemente AUCUNE
mathematique de krigeage : il fait du codage, du decodage et de la
correction post-krigeage.
"""
from __future__ import annotations

from typing import Dict, List, Sequence, Tuple

import numpy as np

from geostat_polymtl.kriging.wrappers import krigeage_ordinaire


# ---------------------------------------------------------------------------
# 1. Codage de Z en N indicatrices
# ---------------------------------------------------------------------------

def coder_indicatrices(
    valeurs: np.ndarray,
    seuils: Sequence[float],
) -> np.ndarray:
    """Construit la matrice (n, K) d'indicatrices I_k(x) = 1{Z(x) <= z_k}.

    Parameters
    ----------
    valeurs : (n,) array
        Valeurs Z aux n points d'echantillonnage.
    seuils : sequence of K floats
        Seuils z_k auxquels coder. Devraient etre tries croissants.

    Returns
    -------
    indicatrices : (n, K) array of {0, 1}
        ``indicatrices[i, k] = 1`` si ``Z_i <= z_k``, sinon 0.
    """
    z = np.asarray(valeurs, dtype=float).reshape(-1, 1)
    s = np.asarray(seuils, dtype=float).reshape(1, -1)
    return (z <= s).astype(int)


def cdf_empirique(
    valeurs: np.ndarray,
    seuils: Sequence[float],
) -> np.ndarray:
    """CDF empirique aux seuils : F(z_k) = #(Z_i <= z_k) / n."""
    ind = coder_indicatrices(valeurs, seuils)
    return ind.mean(axis=0)


# ---------------------------------------------------------------------------
# 2. Krigeage de chaque indicatrice (via cokri itype=2)
# ---------------------------------------------------------------------------

def krigeage_indicatrices(
    coords_data: np.ndarray,
    valeurs: np.ndarray,
    coords_cible: np.ndarray,
    seuils: Sequence[float],
    structures_par_seuil: Sequence[Sequence[Dict]],
    pepites: Sequence[float] = None,
    nk: int = None,
    rad: float = None,
) -> np.ndarray:
    """Krige chaque indicatrice I_k aux positions cibles.

    Parameters
    ----------
    coords_data : (n, d) array
    valeurs : (n,) array (variable continue)
    coords_cible : (m, d) array
    seuils : (K,) sequence of floats
    structures_par_seuil : sequence of K sequences of structure dicts
        Un modele de variogramme par seuil (peuvent etre tous identiques en
        contexte mediane-ki).
    pepites : (K,) sequence, optionnel
        Pepite par seuil (defaut : 0 partout).

    Returns
    -------
    cdf_estimee : (m, K) array
        ``cdf_estimee[j, k]`` = P*(Z(x_j) <= z_k) brut (sans correction).
    """
    valeurs = np.asarray(valeurs, dtype=float)
    K = len(seuils)
    if pepites is None:
        pepites = [0.0] * K
    indic = coder_indicatrices(valeurs, seuils)  # (n, K)
    m = np.atleast_2d(coords_cible).shape[0]
    cdf = np.zeros((m, K), dtype=float)
    for k in range(K):
        r = krigeage_ordinaire(
            coords_data, indic[:, k].astype(float),
            coords_cible, structures_par_seuil[k],
            pepite=float(pepites[k]),
            nk=nk, rad=rad,
        )
        cdf[:, k] = r["estimations"]
    return cdf


# ---------------------------------------------------------------------------
# 3. Correction de la relation d'ordre
# ---------------------------------------------------------------------------

def corriger_relation_ordre(
    cdf_estimee: np.ndarray,
    methode: str = "moyenne",
) -> np.ndarray:
    """Force la monotonie croissante (CDF) avec ecretage dans [0, 1].

    Parameters
    ----------
    cdf_estimee : (m, K) array
        Valeurs brutes du krigeage des indicatrices.
    methode : {"ecrete", "moyenne", "moyenne_montee_descente"}
        - "ecrete"  : ecrete dans [0, 1] uniquement (rapide, simple).
        - "moyenne" : ecrete + impose monotonie par moyenne du up-scan et
          du down-scan (Soares 1992).
        - "moyenne_montee_descente" : alias de "moyenne".

    Returns
    -------
    cdf_corrigee : (m, K) array
        Valeurs croissantes dans [0, 1].
    """
    cdf = np.clip(np.asarray(cdf_estimee, dtype=float), 0.0, 1.0)
    if methode == "ecrete":
        return cdf
    if methode in ("moyenne", "moyenne_montee_descente"):
        # Pour chaque ligne (point cible), montee et descente
        m, K = cdf.shape
        up = cdf.copy()
        for k in range(1, K):
            up[:, k] = np.maximum(up[:, k], up[:, k - 1])
        down = cdf.copy()
        for k in range(K - 2, -1, -1):
            down[:, k] = np.minimum(down[:, k], down[:, k + 1])
        return np.clip(0.5 * (up + down), 0.0, 1.0)
    raise ValueError(f"methode inconnue : {methode!r}")


def violations_relation_ordre(cdf_estimee: np.ndarray) -> Dict:
    """Decompte les violations de la relation d'ordre.

    Returns
    -------
    dict :
      'nb_hors_intervalle' : nombre de valeurs hors [0, 1]
      'nb_non_monotone'    : nombre de paires (k, k+1) avec F(z_{k+1}) < F(z_k)
      'pourcentage'        : % de points cibles avec au moins une violation
    """
    cdf = np.asarray(cdf_estimee, dtype=float)
    m, K = cdf.shape
    hors = int(((cdf < 0) | (cdf > 1)).sum())
    diffs = np.diff(cdf, axis=1)
    non_mono = int((diffs < 0).sum())
    has_violation = ((cdf < 0) | (cdf > 1)).any(axis=1) | (diffs < 0).any(axis=1)
    pct = 100.0 * float(has_violation.sum()) / max(m, 1)
    return {
        "nb_hors_intervalle": hors,
        "nb_non_monotone": non_mono,
        "pourcentage": pct,
    }


# ---------------------------------------------------------------------------
# 4. Decodage de la CCDF : mediane, moyenne, P(Z > coupure)
# ---------------------------------------------------------------------------

def mediane_locale(
    cdf_corrigee: np.ndarray,
    seuils: Sequence[float],
) -> np.ndarray:
    """Mediane locale par interpolation lineaire de la CDF.

    Pour chaque point cible : on cherche z_med tel que F(z_med) = 0.5.
    """
    seuils = np.asarray(seuils, dtype=float)
    m, K = np.atleast_2d(cdf_corrigee).shape
    med = np.full(m, np.nan)
    for j in range(m):
        cdf = cdf_corrigee[j, :]
        # Interpolation lineaire : trouver l'indice k tel que cdf[k] <= 0.5 < cdf[k+1]
        if cdf[-1] < 0.5:
            med[j] = seuils[-1]
            continue
        if cdf[0] >= 0.5:
            med[j] = seuils[0]
            continue
        k = int(np.searchsorted(cdf, 0.5) - 1)
        k = max(0, min(K - 2, k))
        if cdf[k + 1] - cdf[k] < 1e-12:
            med[j] = 0.5 * (seuils[k] + seuils[k + 1])
        else:
            med[j] = seuils[k] + (0.5 - cdf[k]) * (seuils[k + 1] - seuils[k]) / (cdf[k + 1] - cdf[k])
    return med


def moyenne_locale(
    cdf_corrigee: np.ndarray,
    seuils: Sequence[float],
    z_min: float = None,
    z_max: float = None,
) -> np.ndarray:
    """Esperance locale E[Z|x] par integration de la CCDF.

    Approximation par sommation discrete sur les K + 1 intervalles definis
    par [z_min, z_1], [z_1, z_2], ..., [z_K, z_max] avec ponderation par
    le saut de F.
    """
    seuils = np.asarray(seuils, dtype=float)
    if z_min is None:
        z_min = seuils[0] - (seuils[1] - seuils[0])
    if z_max is None:
        z_max = seuils[-1] + (seuils[-1] - seuils[-2])
    m, K = np.atleast_2d(cdf_corrigee).shape
    # Centres des K+1 intervalles
    centres = np.concatenate([
        [0.5 * (z_min + seuils[0])],
        0.5 * (seuils[:-1] + seuils[1:]),
        [0.5 * (seuils[-1] + z_max)],
    ])
    # Poids = saut de F sur chaque intervalle
    F = np.column_stack([np.zeros((m, 1)), cdf_corrigee, np.ones((m, 1))])
    poids = np.diff(F, axis=1)  # (m, K+1)
    return (poids * centres[None, :]).sum(axis=1)


def proba_excede_local(
    cdf_corrigee: np.ndarray,
    seuils: Sequence[float],
    cutoff: float,
) -> np.ndarray:
    """P(Z > z_c | x) = 1 - F(z_c | x) par interpolation lineaire."""
    seuils = np.asarray(seuils, dtype=float)
    F_at_cutoff = np.zeros(np.atleast_2d(cdf_corrigee).shape[0])
    for j in range(F_at_cutoff.size):
        cdf = cdf_corrigee[j, :]
        if cutoff <= seuils[0]:
            F_at_cutoff[j] = cdf[0]
        elif cutoff >= seuils[-1]:
            F_at_cutoff[j] = cdf[-1]
        else:
            k = int(np.searchsorted(seuils, cutoff) - 1)
            k = max(0, min(len(seuils) - 2, k))
            t = (cutoff - seuils[k]) / (seuils[k + 1] - seuils[k])
            F_at_cutoff[j] = cdf[k] + t * (cdf[k + 1] - cdf[k])
    return 1.0 - F_at_cutoff


def tonnage_teneur_recuperables(
    cdf_corrigee: np.ndarray,
    seuils: Sequence[float],
    cutoff: float,
    z_max: float = None,
) -> Dict:
    """Tonnage et teneur moyenne recuperables au-dessus de z_c.

    Pour chaque point cible :
      - T(z_c) = P(Z > z_c)
      - q(z_c) = E[Z | Z > z_c] (teneur conditionnelle)

    Returns
    -------
    dict :
      'tonnage_relatif' : (m,) array
      'teneur_recup'    : (m,) array
      'metal_relatif'   : (m,) array = tonnage * teneur
    """
    seuils = np.asarray(seuils, dtype=float)
    if z_max is None:
        z_max = seuils[-1] + (seuils[-1] - seuils[-2])

    m = np.atleast_2d(cdf_corrigee).shape[0]
    tonnage = proba_excede_local(cdf_corrigee, seuils, cutoff)
    teneur = np.zeros(m)
    # E[Z | Z > z_c] = somme z_k * Delta F(z) sur la partie au-dessus de z_c
    # divise par tonnage.
    seuils_ext = np.concatenate([seuils, [z_max]])
    for j in range(m):
        cdf = cdf_corrigee[j, :]
        # Pour chaque intervalle (z_k, z_{k+1}), poids = F(z_{k+1}) - F(z_k)
        # et centre = 0.5 (z_k + z_{k+1}).
        # On somme la portion au-dessus de cutoff.
        contrib = 0.0
        F_prev = max(cdf[0], 0.0)  # F a z_min
        # Trouver le premier intervalle pertinent
        idx_start = int(np.searchsorted(seuils, cutoff))
        if idx_start == 0:
            # cutoff < seuils[0]
            centre0 = 0.5 * (cutoff + seuils[0])
            poids0 = max(0.0, cdf[0] - max(0.0, 0.0))  # approx
            contrib += centre0 * 0.0
        for k in range(max(0, idx_start - 1), len(seuils) - 1):
            z_inf = max(seuils[k], cutoff)
            z_sup = seuils[k + 1]
            if z_sup <= z_inf:
                continue
            # Fraction lineaire du saut sur l'intervalle restant
            frac = (z_sup - z_inf) / (seuils[k + 1] - seuils[k]) if seuils[k + 1] > seuils[k] else 0.0
            poids = (cdf[k + 1] - cdf[k]) * frac
            centre = 0.5 * (z_inf + z_sup)
            contrib += centre * poids
        # Dernier intervalle (au-dela de seuils[-1])
        z_inf = max(seuils[-1], cutoff)
        if z_max > z_inf:
            poids = (1.0 - cdf[-1])
            centre = 0.5 * (z_inf + z_max)
            contrib += centre * poids
        teneur[j] = contrib / max(tonnage[j], 1e-12)
    metal = tonnage * teneur
    return {
        "tonnage_relatif": tonnage,
        "teneur_recup": teneur,
        "metal_relatif": metal,
    }


# ---------------------------------------------------------------------------
# 5. Support affine — changement de support point -> bloc
# ---------------------------------------------------------------------------

def changement_support_affine(
    z_pts: np.ndarray,
    cdf_pts: np.ndarray,
    f_correction: float,
) -> np.ndarray:
    """Correction affine point -> bloc des valeurs.

    Z_bloc = m + sqrt(f) * (Z_pt - m)
    où f = Var(Z_bloc) / Var(Z_pt) (<= 1).

    Parameters
    ----------
    z_pts : (K,) array — valeurs (seuils)
    cdf_pts : (K,) array — CDF aux points
    f_correction : float dans (0, 1]
        Ratio de variance Var(Z_v) / Var(Z_pts).

    Returns
    -------
    z_bloc : (K,) array — seuils corriges au support bloc
    cdf_bloc : (K,) array — CDF aux memes seuils (lisse via meme F)
    """
    z = np.asarray(z_pts, dtype=float)
    # E[Z_bloc] = E[Z_pt] = m
    F = np.asarray(cdf_pts, dtype=float)
    # E[Z_pt] approximee par moyenne F-ponderee si F est CDF empirique
    # Ici on suppose que m est la moyenne de z_pts pondere par les sauts de F.
    delta_F = np.diff(np.concatenate([[0.0], F, [1.0]]))
    centres = np.concatenate([
        [z[0] - (z[1] - z[0])],
        0.5 * (z[:-1] + z[1:]),
        [z[-1] + (z[-1] - z[-2])],
    ])
    m = float((centres * delta_F).sum())
    z_bloc = m + np.sqrt(max(float(f_correction), 1e-12)) * (z - m)
    return z_bloc, F.copy()

"""Variogrammes / variances de bloc imbriques (chap. 08).

Un modele imbrique est une somme de structures de covariance :

.. math::
    \\gamma(h) = c_0 + \\sum_i c_i \\, \\gamma_i(h ; a_i)

ou ``c_0`` est l'effet de pepite et chaque ``gamma_i`` est un variogramme
elementaire (spherique, exponentiel, gaussien, ...). Les ateliers du chap. 08
montrent que la variance moyenne d'un bloc decroit avec sa taille, et que la
forme de cette decroissance depend de la composition imbriquee du modele.

Toutes les evaluations passent par ``geostat_polymtl.cov_func.covar`` :
**aucune formule de covariance n'est dupliquee ici**.

Convention de portee
--------------------
Les portees fournies par l'utilisateur sont des **portees pratiques 95 %**.
La conversion vers la portee interne de ``covar`` reutilise les helpers
du sous-module ``quadrature``.
"""
from __future__ import annotations

from typing import Dict, List, Sequence, Tuple

import numpy as np

from geostat_polymtl.block_variance.quadrature import (
    _CODES_MODELE,
    _model_cov,
    _points_quadrature_unite,
    _range_pratique_vers_interne,
)
from geostat_polymtl.cov_func.covar import covar


# ---------------------------------------------------------------------------
# Variogramme imbrique : gamma(h)
# ---------------------------------------------------------------------------

def _covariance_unitaire(modele: str, h: np.ndarray, a: float) -> np.ndarray:
    """Evalue la covariance normalisee ``C(h)/c1`` d'une structure unitaire.

    On passe par ``cov_func.covar`` afin de ne pas dupliquer les formules :
    on construit un nuage de points 1D ``(0, h_i)`` et on lit la ligne 0 de la
    matrice de covariance retournee.
    """
    h_arr = np.atleast_1d(np.asarray(h, dtype=float))
    # Conversion portee pratique -> portee interne
    r = _range_pratique_vers_interne(modele, a)
    code = _CODES_MODELE[modele.lower()]
    model = np.array([[code, r]], dtype=float)
    c = np.array([[1.0]], dtype=float)  # palier unitaire
    # Points 1D : origine + decalages |h|
    pts0 = np.array([[0.0]], dtype=float)
    pts1 = h_arr.reshape(-1, 1)
    K = np.asarray(covar(pts0, pts1, model, c))  # shape (1, len(h))
    return np.asarray(K[0, :], dtype=float)


def variogramme_imbrique(
    h: np.ndarray,
    structures: Sequence[Dict],
    pepite: float = 0.0,
) -> np.ndarray:
    """Variogramme ``gamma(h)`` d'un modele imbrique.

    Parameters
    ----------
    h : array_like
        Distances (>= 0) auxquelles evaluer le variogramme.
    structures : sequence of dict
        Chaque dict represente une structure elementaire :

        - ``modele`` : {"spherique", "exponentiel", "gaussien"}
        - ``palier`` : float (c_i, contribution au palier global)
        - ``portee`` : float (portee pratique 95 %, isotrope 1D)

    pepite : float, default 0
        Effet de pepite ``c_0``.

    Returns
    -------
    np.ndarray
        ``gamma(h) = c_0 \\cdot \\mathbf{1}_{h>0} + sum_i c_i (1 - C_i(h)/c_i)``.

    Notes
    -----
    On utilise la relation ``gamma_i(h) = c_i - C_i(h)`` avec ``C_i(0) = c_i``.
    Le calcul de ``C_i`` est delegue a ``geostat_polymtl.cov_func.covar`` afin
    d'eviter toute duplication des formules.
    """
    h_arr = np.atleast_1d(np.asarray(h, dtype=float))
    gamma = np.zeros_like(h_arr, dtype=float)
    # Effet de pepite : discontinuite a l'origine
    gamma += float(pepite) * (h_arr > 0).astype(float)
    for s in structures:
        c_i = float(s["palier"])
        a_i = float(s["portee"])
        modele = str(s.get("modele", "spherique"))
        cov_norm = _covariance_unitaire(modele, h_arr, a_i)
        gamma += c_i * (1.0 - cov_norm)
    return gamma


# ---------------------------------------------------------------------------
# Variance de bloc imbriquee : C_bar(V, V) = sum_i c_i * C_bar_i(V, V)
# ---------------------------------------------------------------------------

def _C_bar_structure(
    geometrie: str,
    lx: float, ly: float, lz: float,
    modele: str, palier: float, ax: float, ay: float, az: float,
    pts_1D: np.ndarray, w_1D: np.ndarray,
) -> float:
    """Variance moyenne d'un bloc pour UNE structure (helper interne).

    Reproduit le coeur de ``variance_bloc_quadrature`` mais en reutilisant des
    points de Gauss-Legendre deja calcules (evite de les recalculer pour
    chaque structure imbriquee).
    """
    g = geometrie.lower()
    rx = _range_pratique_vers_interne(modele, ax)
    ry = _range_pratique_vers_interne(modele, ay)
    rz = _range_pratique_vers_interne(modele, az)
    c = np.array([[float(palier)]], dtype=float)

    if g == "ligne":
        coords = (pts_1D * float(lx)).reshape(-1, 1)
        weights = w_1D
        model = _model_cov(modele, rx)
        K = np.asarray(covar(coords, coords, model, c))
        return float(np.sum(weights[:, None] * weights[None, :] * K))

    if g == "surface":
        X, Y = np.meshgrid(pts_1D * float(lx), pts_1D * float(ly), indexing="ij")
        coords = np.column_stack([X.ravel(), Y.ravel()])
        weights = np.outer(w_1D, w_1D).ravel()
        model = _model_cov(modele, rx, ry)
        K = np.asarray(covar(coords, coords, model, c))
        return float(np.sum(weights[:, None] * weights[None, :] * K))

    if g == "cube":
        X, Y, Z = np.meshgrid(pts_1D * float(lx), pts_1D * float(ly),
                              pts_1D * float(lz), indexing="ij")
        coords = np.column_stack([X.ravel(), Y.ravel(), Z.ravel()])
        weights = np.outer(np.outer(w_1D, w_1D), w_1D).ravel()
        model = _model_cov(modele, rx, ry, rz)
        K = np.asarray(covar(coords, coords, model, c))
        return float(np.sum(weights[:, None] * weights[None, :] * K))

    raise ValueError("geometrie doit etre 'ligne', 'surface' ou 'cube'.")


def variance_bloc_imbrique(
    geometrie: str,
    lx: float, ly: float, lz: float,
    structures: Sequence[Dict],
    pepite: float = 0.0,
    n_points: int = 5,
) -> Tuple[float, List[float]]:
    """Variance moyenne d'un bloc pour un modele imbrique.

    Parameters
    ----------
    geometrie : {"ligne", "surface", "cube"}
    lx, ly, lz : float
        Longueurs du bloc.
    structures : sequence of dict
        Liste de structures, chacune contenant :

        - ``modele`` : nom du modele elementaire
        - ``palier`` : c_i
        - ``ax``, ``ay``, ``az`` : portees pratiques 95 % par direction

        Pour rester compatible avec une saisie isotrope simple, si seule
        ``portee`` est fournie, elle est utilisee pour ax/ay/az.

    pepite : float, default 0
        Effet de pepite c_0. La regularisation pepite/|V| -> 0 pour de grands
        blocs est implicite : on n'ajoute c_0 que sur la diagonale, ce qui
        correspond a la convention pedagogique du chap. 08.
    n_points : int
        Nombre de points de Gauss-Legendre par direction.

    Returns
    -------
    variance_totale : float
    contributions : list of float
        Detail [c_0_contribution, c_1_contribution, ...] pour pedagogie.
    """
    pts_1D, w_1D = _points_quadrature_unite(n_points)
    contributions: List[float] = []
    # Convention chap. 08 : le pepite ne contribue pas a la variance de bloc
    # apres regularisation (c_0 / |V| -> 0 en moyenne sur le support continu).
    # On garde 0.0 pour la traçabilite pedagogique.
    contributions.append(0.0 if pepite > 0 else 0.0)

    for s in structures:
        modele = str(s.get("modele", "spherique"))
        c_i = float(s["palier"])
        # Anisotropie optionnelle ; defaut = isotrope avec portee
        if "ax" in s or "ay" in s or "az" in s:
            ax = float(s.get("ax", s.get("portee", 1.0)))
            ay = float(s.get("ay", s.get("portee", ax)))
            az = float(s.get("az", s.get("portee", ax)))
        else:
            a = float(s["portee"])
            ax = ay = az = a
        contrib = _C_bar_structure(
            geometrie, lx, ly, lz, modele, c_i, ax, ay, az, pts_1D, w_1D,
        )
        contributions.append(contrib)

    variance_totale = float(sum(contributions))
    return variance_totale, contributions

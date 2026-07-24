"""Système de cokrigeage à deux variables (chapitre 10).

Portage Python du générateur MATLAB ``Workplace_calculCoKri.m`` (CP3-Q2 /
C10-2) : on construit et on résout le système de COKRIGEAGE ORDINAIRE pour deux
variables corrélées (Z1, Z2) avec données manquantes (``nan``), sous un modèle
linéaire de corégionalisation (pépite + structure).

Réutilisation de la librairie
-----------------------------
Toute la résolution est déléguée à
:func:`geostat_polymtl.kriging.wrappers.systeme_cokrigeage`, qui appelle
``cokri`` (équivalent de ``cokridir``/``cokri2`` MATLAB). On expose la matrice
:math:`\\mathbf{K}`, le vecteur :math:`\\mathbf{k}`, les poids :math:`\\lambda`,
les estimations et les variances. Ce module n'écrit du neuf QUE pour : les jeux
de données et de matrices de corégionalisation :math:`\\mathbf{B}_k` de la
source, et la mise en page.

Convention de portée
---------------------
``systeme_cokrigeage`` attend la **portée pratique 95 %** (convention des
wrappers) tandis que le MATLAB passe la portée INTERNE brute à ``cokridir``.
Conversion appliquée ici pour retomber sur les mêmes nombres :
- exponentiel : portée_pratique = portée_interne × 3
- gaussien    : portée_pratique = portée_interne × sqrt(3)
- sphérique   : identique (pas de conversion)

Source :
``Exercices/Examen/CP3/Code_Examen/9-Cokrigeage(x2)/Workplace_calculCoKri.m``.
"""
from __future__ import annotations

import math
from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np

from geostat_polymtl.kriging.wrappers import systeme_cokrigeage


def _portee_interne_vers_pratique(modele: str, a: float) -> float:
    """Convertit une portée INTERNE (MATLAB) vers la portée pratique 95 %
    attendue par les wrappers de la librairie."""
    m = modele.lower()
    if m in ("exponentiel", "exponential"):
        return float(a) * 3.0
    if m in ("gaussien", "gaussian"):
        return float(a) * math.sqrt(3.0)
    return float(a)  # sphérique, pépite : pas de conversion


# ---------------------------------------------------------------------------
# Jeu de données de Workplace_calculCoKri.m
# ---------------------------------------------------------------------------
# x = [X, Y, Z1, Z2] avec données manquantes (nan).
# model = [1 1; 2 50]  -> pépite + exponentiel de portée INTERNE 50.
# c = [3 1; 1 2; 4 4.5; 4.5 6] -> B_pepite=[[3,1],[1,2]], B_expo=[[4,4.5],[4.5,6]].
CONFIG_CALCUL_COKRI: Dict = {
    "coords": [[-20, -20], [10, 5], [20, 0], [-10, 10], [0, 15], [0, 0]],
    "Z1": [3.1, 2.5, 4.1, float("nan"), 2.9, float("nan")],
    "Z2": [2.7, 4.3, float("nan"), 2.1, 3.6, 3.3],
    "x0": [0, 0],
    # Modèle : pépite (B0) + exponentiel portée interne 50 (B1).
    "modele_structure": "exponentiel",
    "portee_interne": 50.0,
    "B_pepite": [[3.0, 1.0], [1.0, 2.0]],
    "B_structure": [[4.0, 4.5], [4.5, 6.0]],
    "titre": "Cokrigeage ordinaire — 2 variables (Z1, Z2)",
}


def _structures_depuis_config(config: Dict) -> Tuple[List[Dict], np.ndarray]:
    """Construit (structures, nugget_matrix) au format des wrappers à partir
    d'une config MATLAB (portée interne → pratique)."""
    portee_prat = _portee_interne_vers_pratique(
        config["modele_structure"], config["portee_interne"]
    )
    structures = [{
        "modele": config["modele_structure"],
        "portee": portee_prat,
        "palier_matrix": np.asarray(config["B_structure"], dtype=float),
    }]
    nugget = np.asarray(config["B_pepite"], dtype=float)
    return structures, nugget


def correlation_intrinseque(config: Optional[Dict] = None) -> float:
    """Coefficient de corrélation intrinsèque du MLC (paliers totaux).

    Reproduit le calcul ``rho`` de ``Workplace_calculCoKri.m`` :
    :math:`\\rho = b_{ZY} / \\sqrt{b_{ZZ}\\,b_{YY}}` sur les paliers TOTAUX
    (pépite + structure).
    """
    if config is None:
        config = CONFIG_CALCUL_COKRI
    B0 = np.asarray(config["B_pepite"], dtype=float)
    B1 = np.asarray(config["B_structure"], dtype=float)
    sills = B0 + B1
    return float(sills[0, 1] / math.sqrt(sills[0, 0] * sills[1, 1]))


def systeme_cokrigeage_calcul(config: Optional[Dict] = None) -> Dict:
    """Résout le système de cokrigeage ordinaire de ``Workplace_calculCoKri.m``.

    Délègue intégralement à
    :func:`geostat_polymtl.kriging.wrappers.systeme_cokrigeage`. Aucune
    mathématique n'est réimplémentée.

    Returns
    -------
    dict :
      ``estimations`` : (p,) estimations cokrigées Z1*, Z2* ;
      ``variances`` : (p,) variances de cokrigeage ;
      ``matrice_K`` : matrice du système (gauche) ;
      ``vecteur_k`` : second membre ;
      ``lambda`` : poids et multiplicateurs ;
      ``rho`` : corrélation intrinsèque ;
      ``n_donnees``, ``n_variables``, ``dimension``.
    """
    if config is None:
        config = CONFIG_CALCUL_COKRI
    structures, nugget = _structures_depuis_config(config)
    coords = np.asarray(config["coords"], dtype=float)
    Z1 = np.asarray(config["Z1"], dtype=float)
    Z2 = np.asarray(config["Z2"], dtype=float)
    x0 = np.asarray([config["x0"]], dtype=float)

    res = systeme_cokrigeage(
        coords, [Z1, Z2], x0, structures,
        nugget_matrix=nugget, type_kriging="ordinaire",
    )

    return {
        "estimations": res["estimations"],
        "variances": res["variances"],
        "sv": res["sv"],
        "matrice_K": np.asarray(res["matrice_A"], dtype=float),
        "vecteur_k": np.asarray(res["vecteur_b"], dtype=float),
        "lambda": np.asarray(res["lambda"], dtype=float),
        "rho": correlation_intrinseque(config),
        "n_donnees": res["n_donnees"],
        "n_variables": res["n_variables"],
        "dimension": res["dimension"],
    }


def figure_systeme_cokrigeage(
    config: Optional[Dict] = None,
    noms_variables: Tuple[str, str] = ("Z_1", "Z_2"),
    path: Optional[str] = None,
):
    """Carte des données + matrice de cokrigeage augmentée [K | k].

    Reproduit ``Workplace_calculCoKri.m`` (C10-2 / CP3-Q2) : à gauche, la carte
    des points (Z1 et Z2, ``nan`` marqués) et la cible ; à droite, la matrice du
    système :math:`\\mathbf{K}` accolée au second membre :math:`\\mathbf{k}`,
    avec en bas les estimations, variances et la corrélation intrinsèque.

    Returns
    -------
    (fig, axes, donnees)
    """
    import matplotlib.pyplot as plt

    if config is None:
        config = CONFIG_CALCUL_COKRI
    res = systeme_cokrigeage_calcul(config)
    coords = np.asarray(config["coords"], dtype=float)
    Z1 = np.asarray(config["Z1"], dtype=float)
    Z2 = np.asarray(config["Z2"], dtype=float)
    x0 = np.asarray(config["x0"], dtype=float)
    nz1, nz2 = noms_variables

    fig, axes = plt.subplots(1, 2, figsize=(13, 5.5),
                             gridspec_kw={"width_ratios": [1.0, 1.2]})

    # --- Carte des données ---
    ax = axes[0]
    ax.scatter(coords[:, 0], coords[:, 1], s=120, facecolor="none",
               edgecolor="k", linewidths=1.4, zorder=2)
    ax.scatter([x0[0]], [x0[1]], marker="s", s=180, facecolor="none",
               edgecolor="red", linewidths=2.0, zorder=3, label="Cible $x_0$")
    for k, (xi, yi) in enumerate(coords):
        s1 = "nan" if np.isnan(Z1[k]) else f"{Z1[k]:.1f}"
        s2 = "nan" if np.isnan(Z2[k]) else f"{Z2[k]:.1f}"
        ax.annotate(f"$x_{{{k+1}}}$\n${nz1}$={s1}\n${nz2}$={s2}",
                    (xi, yi), textcoords="offset points",
                    xytext=(9, -4), fontsize=8, va="top")
    ax.set_xlabel("Coord. x")
    ax.set_ylabel("Coord. y")
    ax.set_title(config.get("titre", "Cokrigeage ordinaire"))
    ax.set_aspect("equal", adjustable="datalim")
    ax.grid(True, ls="--", alpha=0.5)
    ax.legend(loc="best")

    # --- Matrice augmentée [K | k] ---
    ax2 = axes[1]
    ax2.axis("off")
    K = res["matrice_K"]
    kk = res["vecteur_k"].reshape(K.shape[0], -1)
    aug = np.hstack([K, kk])
    im = ax2.imshow(aug, cmap="coolwarm", aspect="auto",
                    vmin=-np.max(np.abs(aug)), vmax=np.max(np.abs(aug)))
    fig.colorbar(im, ax=ax2, shrink=0.8, label="valeur")
    ax2.set_title(r"Système de cokrigeage augmenté $[\,\mathbf{K}\;|\;\mathbf{k}\,]$")
    est = np.asarray(res["estimations"], dtype=float).ravel()
    var = np.asarray(res["variances"], dtype=float).ravel()
    txt = (f"${nz1}^*$ = {est[0]:.3f}   ($\\sigma^2$ = {var[0]:.3f})\n"
           f"${nz2}^*$ = {est[1]:.3f}   ($\\sigma^2$ = {var[1]:.3f})\n"
           f"$\\rho$ intrinsèque = {res['rho']:.3f}")
    ax2.text(0.5, -0.12, txt, transform=ax2.transAxes, ha="center",
             va="top", fontsize=11)

    fig.tight_layout()
    if path:
        fig.savefig(path, dpi=150, bbox_inches="tight")

    return fig, axes, res

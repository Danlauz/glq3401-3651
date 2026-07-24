"""Générateurs de figures — chapitre 07 (variogramme) : matrice de krigeage.

Version Python des scripts MATLAB d'examen
``6-Variogramme/Q1_MatriceKrigeage.m`` et ``Q2_EffetDecran.m`` — figures de
**localisation des points** + construction de la **matrice de covariance** K
et du **vecteur** k du système de krigeage (lien variogramme → krigeage).

Réutilisation stricte de la librairie :
  - :func:`covar_nu` (équivalent Python de ``covardm.m``) pour K et k ;
  - :func:`systeme_krigeage` pour résoudre KS / KO et exposer les poids.

Aucune réimplémentation : ce module n'ajoute que les jeux de points/modèles
des exercices, la mise en page (plan de localisation, table de K|k) et la mise
en évidence pédagogique (effet d'écran).

Chaque générateur retourne ``(fig, ax/axes, infos)`` et accepte ``path``.
"""
from __future__ import annotations

from typing import Dict, Optional, Sequence, Tuple

import numpy as np
import matplotlib.pyplot as plt

# --- Réutilisation de la librairie (AUCUNE réimplémentation) ------------------
from geostat_polymtl.cov_func.covar_nu import covar_nu
from geostat_polymtl.kriging.wrappers import systeme_krigeage


def _enregistrer(fig, path: Optional[str]) -> None:
    """Enregistre la figure si un chemin est fourni."""
    if path:
        fig.savefig(path, dpi=150, bbox_inches="tight")


def _model_vers_structures(
    model: np.ndarray,
    c: np.ndarray,
) -> Tuple[list, float]:
    """Convertit un modèle Marcotte ``[type, ax, ay, angle]`` vers le format
    ``structures`` + ``pepite`` attendu par :func:`systeme_krigeage`.

    Les portées du modèle Marcotte sont déjà les portées internes de
    ``covar_nu`` ; or ``systeme_krigeage`` attend des portées **pratiques 95 %**
    qu'il reconvertit. Pour rester cohérent avec ``covar_nu`` (utilisé pour K),
    on reconvertit ici portée_interne → portée_pratique selon le type.
    """
    _noms = {2: "exponentiel", 3: "gaussien", 4: "spherique"}
    _facteur = {2: 3.0, 3: float(np.sqrt(3.0)), 4: 1.0}
    structures = []
    pepite = 0.0
    for row, ci in zip(np.atleast_2d(np.asarray(model, float)),
                       np.atleast_1d(np.asarray(c, float))):
        t = int(row[0])
        if t == 1:  # pépite
            pepite += float(ci)
            continue
        ax_, ay_, ang = float(row[1]), float(row[2]), float(row[3])
        f = _facteur.get(t, 1.0)
        structures.append({
            "modele": _noms.get(t, "spherique"),
            "palier": float(ci),
            "portee": [ax_ * f, ay_ * f],
            "angle": ang,
        })
    return structures, pepite


def matrice_covariance(
    model: np.ndarray,
    c: np.ndarray,
    x: np.ndarray,
    x0: np.ndarray,
    noms_points: Optional[Sequence[str]] = None,
) -> Dict:
    """Construit K (n×n) et k (n×1) — équivalent Python de ``covardm`` (Q1).

    Parameters
    ----------
    model : (r, 4) array
        Modèle Marcotte ``[type, ax, ay, angle]``.
    c : (r,) array
        Paliers.
    x : (n, 2) array
        Coordonnées des données.
    x0 : (1, 2) ou (2,) array
        Point à estimer.
    noms_points : sequence of str, optional
        Étiquettes des points (``x_1``…``x_n`` par défaut).

    Returns
    -------
    dict
        ``K`` (n×n), ``k`` (n×1), ``x``, ``x0``, ``noms``.
    """
    x = np.atleast_2d(np.asarray(x, float))
    x0 = np.atleast_2d(np.asarray(x0, float))
    model = np.asarray(model, float)
    c = np.asarray(c, float)
    K = np.asarray(covar_nu(x, x, model, c), float)
    k = np.asarray(covar_nu(x, x0, model, c), float)
    n = x.shape[0]
    noms = list(noms_points) if noms_points is not None else \
        [f"x_{i+1}" for i in range(n)]
    return {"K": K, "k": k.reshape(-1, 1), "x": x, "x0": x0, "noms": noms,
            "model": model, "c": c}


def figure_matrice_krigeage_q1(
    path: Optional[str] = None,
) -> Tuple[plt.Figure, np.ndarray, Dict]:
    """Plan de localisation + matrice K|k — exercice Q1 (``Q1_MatriceKrigeage``).

    Données de la source :
    ``model = [1 0 0 0 ; 2 25/3 65/3 30]`` (pépite + exponentiel anisotrope) ;
    ``c = [1.25 ; 5.75]`` ; ``x = [10 10 ; 18 15 ; 8 11 ; 13 12]`` ;
    ``x0 = [15 15]``.

    Returns
    -------
    fig, axes (2 panneaux : localisation + table K|k), infos (dict).
    """
    model = np.array([[1, 0, 0, 0], [2, 25 / 3, 65 / 3, 30]], float)
    c = np.array([1.25, 5.75])
    x = np.array([[10., 10.], [18., 15.], [8., 11.], [13., 12.]])
    x0 = np.array([[15., 15.]])
    res = matrice_covariance(model, c, x, x0)

    fig, axes = plt.subplots(1, 2, figsize=(12, 5),
                             gridspec_kw={"width_ratios": [1, 1.1]})

    # Panneau 1 : plan de localisation
    ax = axes[0]
    ax.plot(x[:, 0], x[:, 1], "ok", ms=9)
    ax.plot(x0[0, 0], x0[0, 1], "or", ms=10)
    for i, (cx, cy) in enumerate(x, start=1):
        ax.annotate(f"$x_{{{i}}}$", (cx, cy), textcoords="offset points",
                    xytext=(8, 6), fontsize=12)
    ax.annotate("$x_0$", (x0[0, 0], x0[0, 1]), textcoords="offset points",
                xytext=(8, 6), fontsize=12, color="red")
    ax.set_xlabel("x (m)")
    ax.set_ylabel("y (m)")
    ax.set_aspect("equal")
    ax.grid(True, ls=":", alpha=0.6)
    ax.set_title("Localisation des points (Q1)")

    # Panneau 2 : table de la matrice augmentée [K | k]
    ax2 = axes[1]
    ax2.axis("off")
    K, k = res["K"], res["k"]
    n = K.shape[0]
    table = np.hstack([K, k])
    col_labels = [f"$x_{i+1}$" for i in range(n)] + ["$k$ (→$x_0$)"]
    row_labels = [f"$x_{i+1}$" for i in range(n)]
    cell_text = [[f"{v:.3f}" for v in ligne] for ligne in table]
    tab = ax2.table(cellText=cell_text, colLabels=col_labels,
                    rowLabels=row_labels, cellLoc="center", loc="center")
    tab.auto_set_font_size(False)
    tab.set_fontsize(10)
    tab.scale(1, 1.6)
    ax2.set_title("Matrice $K$ et vecteur $k$ (covardm)")

    fig.tight_layout()
    _enregistrer(fig, path)
    return fig, axes, {**res, "table_Kk": table}


def figure_effet_ecran_q2(
    valeurs: Optional[Sequence[float]] = None,
    path: Optional[str] = None,
) -> Tuple[plt.Figure, np.ndarray, Dict]:
    """Effet d'écran — exercice Q2 (``Q2_EffetDecran``) : poids KS et KO.

    Données de la source : ``model = [1 0 0 0 ; 4 4 4 0]`` (pépite + sphérique
    isotrope a=4) ; ``c = [1 ; 5]`` ;
    ``x = [-4 0 ; -2 0 ; 0 3 ; 0 -1 ; 0 -2 ; 4 0 ; -4 -4]`` ; ``x0 = [0 0]``.

    Résout les systèmes KS et KO via :func:`systeme_krigeage` et illustre
    l'**effet d'écran** : les poids sont reportés sur le plan de localisation
    (taille/couleur ∝ poids) ; le point ``x_1`` masque ``x_7`` (aligné, plus
    loin) → poids quasi nul.

    Parameters
    ----------
    valeurs : sequence of float, optional
        Valeurs aux 7 points (arbitraires ; seuls les poids importent pour
        l'effet d'écran). Défaut ``[1, 2, 3, 4, 5, 6, 7]``.
    path : str, optional

    Returns
    -------
    fig, axes (1 panneau localisation + poids ; 1 panneau barres KS vs KO),
    infos (dict : ``lambda_ks``, ``lambda_ko``, ``mu``, ``K``, ``k``).
    """
    model = np.array([[1, 0, 0, 0], [4, 4, 4, 0]], float)
    c = np.array([1.0, 5.0])
    x = np.array([[-4, 0], [-2, 0], [0, 3], [0, -1],
                  [0, -2], [4, 0], [-4, -4]], float)
    x0 = np.array([0.0, 0.0])
    if valeurs is None:
        valeurs = np.arange(1.0, x.shape[0] + 1.0)
    valeurs = np.asarray(valeurs, float)

    # K et k bruts (covardm)
    res_cov = matrice_covariance(model, c, x, x0)

    # Systèmes KS / KO (réutilise systeme_krigeage)
    structures, pepite = _model_vers_structures(model, c)
    res_ks = systeme_krigeage(x, valeurs, x0, structures, pepite=pepite,
                              type_kriging="simple")
    res_ko = systeme_krigeage(x, valeurs, x0, structures, pepite=pepite,
                              type_kriging="ordinaire")
    lam_ks = np.asarray(res_ks["lambda"], float).ravel()
    lam_ko = np.asarray(res_ko["lambda"], float).ravel()
    mu = np.asarray(res_ko.get("mu", []), float).ravel()

    fig, axes = plt.subplots(1, 2, figsize=(12, 5.5))

    # Panneau 1 : plan + poids KO (taille ∝ |poids|)
    ax = axes[0]
    tailles = 80 + 1200 * np.abs(lam_ko) / (np.abs(lam_ko).max() + 1e-9)
    sc = ax.scatter(x[:, 0], x[:, 1], s=tailles, c=lam_ko, cmap="coolwarm",
                    edgecolors="k", zorder=5, vmin=-abs(lam_ko).max(),
                    vmax=abs(lam_ko).max())
    ax.plot(x0[0], x0[1], "P", color="black", ms=14, zorder=6)
    for i, (cx, cy) in enumerate(x, start=1):
        ax.annotate(f"$x_{{{i}}}$\n{lam_ko[i-1]:.3f}", (cx, cy),
                    textcoords="offset points", xytext=(10, 4), fontsize=9)
    ax.annotate("$x_0$", (x0[0], x0[1]), textcoords="offset points",
                xytext=(10, 4), fontsize=11)
    ax.set_xlim(-6, 6)
    ax.set_ylim(-6, 6)
    ax.set_aspect("equal")
    ax.grid(True, ls=":", alpha=0.6)
    ax.set_xlabel("x (m)")
    ax.set_ylabel("y (m)")
    ax.set_title("Poids de krigeage ordinaire (effet d'écran)")
    fig.colorbar(sc, ax=ax, shrink=0.85, label="poids $\\lambda$")

    # Panneau 2 : barres KS vs KO
    ax2 = axes[1]
    idx = np.arange(1, x.shape[0] + 1)
    largeur = 0.4
    ax2.bar(idx - largeur / 2, lam_ks, largeur, label="KS", color="#4c78a8")
    ax2.bar(idx + largeur / 2, lam_ko, largeur, label="KO", color="#e45756")
    ax2.axhline(0, color="k", lw=0.8)
    ax2.set_xticks(idx)
    ax2.set_xticklabels([f"$x_{i}$" for i in idx])
    ax2.set_ylabel("poids $\\lambda$")
    ax2.set_title("Comparaison des poids KS / KO")
    ax2.legend()
    ax2.grid(True, axis="y", ls=":", alpha=0.6)

    fig.tight_layout()
    infos = {
        "K": res_cov["K"], "k": res_cov["k"], "x": x, "x0": x0,
        "lambda_ks": lam_ks, "lambda_ko": lam_ko, "mu": mu,
        "estimation_ks": float(np.asarray(res_ks["estimations"]).ravel()[0]),
        "estimation_ko": float(np.asarray(res_ko["estimations"]).ravel()[0]),
        "variance_ks": float(np.asarray(res_ks["variances"]).ravel()[0]),
        "variance_ko": float(np.asarray(res_ko["variances"]).ravel()[0]),
        "model": model, "c": c,
    }
    _enregistrer(fig, path)
    return fig, axes, infos

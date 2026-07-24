"""Variogrammes d'indicatrices par seuil (chapitre 11).

Portage Python du générateur MATLAB ``go_final11.m`` (lignes 21-49) : il trace
les variogrammes des indicatrices à trois seuils (décile bas, médiane, décile
haut) afin d'illustrer la **déstructuration aux extrêmes**. Les indicatrices
des seuils extrêmes (I_0.10 et I_0.90) ont un variogramme plus simple et de
palier plus faible (``F(1-F)`` petit) que celui de la médiane (I_0.50), qui
présente en plus une pépite : la continuité spatiale se dégrade aux extrêmes
de la distribution.

Source MATLAB
-------------
``Exercices/Examen/CP3/Code_Examen/go_final11.m`` ::

    h = (1:100)';
    gh10 = .09 - covardm(h, 0, [4 70],       0.09);          % I_0.10
    gh50 = .25 - covardm(h, 0, [1 1; 4 30], [0.10; 0.15]);   % I_0.50
    gh90 = gh10;                                             % I_0.90

Réutilisation librairie
-----------------------
- :func:`geostat_polymtl.cov_func.covar_nu.covar_nu` pour la covariance des
  modèles (mêmes codes que ``covardm`` : 1=pépite, 4=sphérique). Le variogramme
  est obtenu par ``gamma(h) = C(0) - C(h) = palier - C(h)``, exactement comme
  dans le script MATLAB. AUCUNE mathématique de covariance n'est réimplémentée
  ici.

Figure : @fig-C11_VarioIndic (déstructuration des indicatrices aux extrêmes).
"""
from __future__ import annotations

from typing import Dict, List, Optional, Tuple

import numpy as np

from geostat_polymtl.cov_func.covar_nu import covar_nu


# ---------------------------------------------------------------------------
# Paramètres de la source MATLAB (go_final11.m)
# ---------------------------------------------------------------------------
# Modèles au format Marcotte (identique à covardm) : [code, portée].
#   code 1 = pépite, code 4 = sphérique.
# Chaque seuil : (titre, model (r, 2) array, c (r,) paliers).
MODELES_SEUILS: List[Dict] = [
    {
        "titre": r"$I_{\,0{,}10}$",
        "seuil": 0.10,
        "model": np.array([[4, 70.0]]),              # sphérique, portée 70
        "c": np.array([0.09]),                        # palier 0.09
    },
    {
        "titre": r"$I_{\,0{,}50}$",
        "seuil": 0.50,
        "model": np.array([[1, 1.0], [4, 30.0]]),    # pépite + sphérique portée 30
        "c": np.array([0.10, 0.15]),                  # paliers 0.10 et 0.15 (total 0.25)
    },
    {
        "titre": r"$I_{\,0{,}90}$",
        "seuil": 0.90,
        "model": np.array([[4, 70.0]]),              # identique à I_0.10 (symétrie)
        "c": np.array([0.09]),
    },
]


# ---------------------------------------------------------------------------
# Calcul d'un variogramme d'indicatrice via covar_nu
# ---------------------------------------------------------------------------

def variogramme_indicatrice(
    h: np.ndarray,
    model: np.ndarray,
    c: np.ndarray,
) -> np.ndarray:
    """Variogramme ``gamma(h) = palier - C(h)`` d'un modèle d'indicatrice.

    Réutilise :func:`covar_nu` (covariance Marcotte) ; le variogramme s'en
    déduit par ``gamma(h) = C(0) - C(h)`` avec ``C(0) = sum(c)`` (palier).

    Parameters
    ----------
    h : (m,) array
        Distances (m).
    model : (r, 2) array
        Modèle Marcotte ``[code, portée]`` par structure.
    c : (r,) array
        Paliers de chaque structure.

    Returns
    -------
    gamma : (m,) array
        Variogramme aux distances ``h``.
    """
    h = np.asarray(h, dtype=float).reshape(-1, 1)   # (m, 1) -> points 1D
    x0 = np.zeros((1, 1))                            # origine
    c = np.asarray(c, dtype=float)
    palier = float(c.sum())
    # covar_nu attend des points (n, d) ; ici d = 1.
    Cvec = np.asarray(covar_nu(h, x0, model, c)).reshape(-1)  # C(h) (m,)
    return palier - Cvec


# ---------------------------------------------------------------------------
# Figure : 3 panneaux (un par seuil), déstructuration aux extrêmes
# ---------------------------------------------------------------------------

def figure_variogrammes_indicatrices(
    h_max: float = 100.0,
    path: Optional[str] = None,
) -> Tuple["object", "object", Dict]:
    """Figure C11 : variogrammes d'indicatrices aux 3 seuils (déstructuration).

    Reproduit ``figure(7)`` de ``go_final11.m`` : trois sous-graphiques
    I_0.10, I_0.50, I_0.90. Les deux extrêmes partagent le même modèle (palier
    0.09, sans pépite) tandis que la médiane a un palier plus élevé (0.25) AVEC
    une pépite -> illustration de la déstructuration.

    Parameters
    ----------
    h_max : float
        Distance maximale tracée (défaut 100 m, comme la source).
    path : str, optional
        Si fourni, enregistre la figure (PNG, dpi=150).

    Returns
    -------
    (fig, axes, donnees) : la figure, le tableau d'axes et un dict
        ``{'h', 'gamma_par_seuil'}``.
    """
    import matplotlib.pyplot as plt

    h = np.arange(1.0, h_max + 1.0)   # (1:100)' comme MATLAB
    fig, axes = plt.subplots(1, 3, figsize=(11, 3.4), sharey=True)
    gamma_par_seuil = {}

    for ax, params in zip(axes, MODELES_SEUILS):
        g = variogramme_indicatrice(h, params["model"], params["c"])
        gamma_par_seuil[params["seuil"]] = g
        ax.plot(h, g, "-k", linewidth=2)
        ax.grid(True)
        ax.set_xlabel("h (m)", fontsize=11)
        ax.set_title(params["titre"], fontsize=12)
        ax.set_xlim(0, h_max + 10)
        ax.set_ylim(0, 0.30)
    axes[0].set_ylabel(r"$\gamma_I(h)$", fontsize=11)

    fig.tight_layout()
    if path:
        fig.savefig(path, dpi=150, bbox_inches="tight")
    donnees = {"h": h, "gamma_par_seuil": gamma_par_seuil}
    return fig, axes, donnees

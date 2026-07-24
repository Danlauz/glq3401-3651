"""
Fonctions de visualisation pour le modèle de Lane et Taylor.

Ce module fournit des fonctions Matplotlib pour tracer :

- les courbes de profit et la teneur de coupure optimale ;
- la distribution lognormale des teneurs et les réserves ;
- les analyses de sensibilité paramètre par paramètre.

Toutes les fonctions retournent la figure Matplotlib créée, ce qui
permet leur intégration directe dans des notebooks Jupyter ou des
pages Quarto.
"""

from __future__ import annotations

from typing import Dict, List, Optional, Tuple

import matplotlib.pyplot as plt
import numpy as np
from scipy.stats import lognorm

from .economics import (
    ParametresLane,
    ResultatLane,
    courbes_profit,
    tableau_recapitulatif,
)
from .reserves import reserves


# ---------------------------------------------------------------------------
# Constantes de style
# ---------------------------------------------------------------------------

_COULEURS_COURBES = {
    "mine": "C0",
    "concentrateur": "C1",
    "marche": "C2",
}

_STYLES_COURBES = {
    "mine": "-",
    "concentrateur": "--",
    "marche": ":",
}


# ---------------------------------------------------------------------------
# 1. Graphique des courbes de profit (Lane)
# ---------------------------------------------------------------------------

def tracer_courbes_profit(
    resultat: ResultatLane,
    *,
    afficher_tableau: bool = True,
    xlim: Optional[Tuple[float, float]] = None,
    ylim: Optional[Tuple[float, float]] = None,
    figsize: Tuple[float, float] = (9, 5),
    titre: Optional[str] = None,
) -> plt.Figure:
    """Trace les trois courbes de profit et identifie les teneurs clés.

    Parameters
    ----------
    resultat : ResultatLane
        Résultat de :func:`~lane_taylor.economics.courbes_profit`.
    afficher_tableau : bool
        Si True, imprime le tableau récapitulatif dans la console.
    xlim, ylim : tuple, optional
        Limites des axes. Si None, calcul automatique.
    figsize : tuple
        Taille de la figure.
    titre : str, optional
        Titre personnalisé.

    Returns
    -------
    matplotlib.figure.Figure
    """
    cc = resultat.cc
    v1, v2, v3 = resultat.v_mine, resultat.v_concentrateur, resultat.v_marche

    fig, ax = plt.subplots(figsize=figsize)

    ax.plot(cc, v1, _STYLES_COURBES["mine"], label="Mine")
    ax.plot(cc, v2, _STYLES_COURBES["concentrateur"], label="Concentrateur")
    ax.plot(cc, v3, _STYLES_COURBES["marche"], label="Marché")

    # Zone hachurée (enveloppe inférieure)
    v_min = np.minimum(np.minimum(v1, v2), v3)
    y_floor = ylim[0] if ylim else v_min.min() - 5
    ax.fill_between(cc, y_floor, v_min, color="grey", alpha=0.3, hatch="///")

    # Annotations des teneurs limites
    dy = 0.035 * (max(v1.max(), v2.max(), v3.max()) - min(v1.min(), v2.min(), v3.min()))
    for c_val, v_arr, label in [
        (resultat.c1, v1, "$c_1$"),
        (resultat.c2, v2, "$c_2$"),
        (resultat.c3, v3, "$c_3$"),
    ]:
        v_max = v_arr.max()
        ax.text(c_val, v_max + dy, label, fontsize=10, fontweight="bold", color="black")
        ax.vlines(c_val, v_max, v_max + 0.8 * dy, colors="black", linewidth=1.1)

    # Annotations des équilibres
    labels_eq = ["$c_{12}$", "$c_{13}$", "$c_{23}$"]
    for i, eq in enumerate(resultat.equilibres):
        lbl = labels_eq[i] if i < len(labels_eq) else eq.label
        ax.text(eq.teneur, eq.profit + dy, lbl,
                fontsize=10, fontweight="bold", color="red")
        ax.vlines(eq.teneur, eq.profit, eq.profit + 0.8 * dy,
                  colors="red", linewidth=1.1)

    # Axes
    if xlim:
        ax.set_xlim(xlim)
    else:
        cmax = resultat.cc.max()
        ax.set_xlim(0, cmax)
    if ylim:
        ax.set_ylim(ylim)

    ax.set_xlabel("Teneur de coupure (%)", fontsize=12)
    ax.set_ylabel("Profit / t. minéralisée ($)", fontsize=12)
    ax.set_title(titre or f"c_opt = {resultat.c_opt:.2f} %  —  profit = {resultat.profit_opt:.2f} $",
                 fontsize=10)
    ax.legend(fontsize=10)
    ax.grid(True)

    plt.tight_layout()

    if afficher_tableau:
        print(tableau_recapitulatif(resultat))

    return fig


# ---------------------------------------------------------------------------
# 2. Distribution lognormale et réserves
# ---------------------------------------------------------------------------

def tracer_reserves_lognormale(
    moyenne: float,
    variance: float,
    coupure: float,
    *,
    x_max: float = 8.0,
    n_points: int = 500,
    figsize: Tuple[float, float] = (12, 9),
) -> plt.Figure:
    """Trace les quatre panneaux illustrant xc, gc, xc·gc et la PDF.

    Parameters
    ----------
    moyenne : float
        Moyenne des teneurs.
    variance : float
        Variance des teneurs.
    coupure : float
        Teneur de coupure à mettre en évidence.
    x_max : float
        Limite supérieure de l'axe des teneurs.
    n_points : int
        Nombre de points pour la grille de teneurs.
    figsize : tuple
        Taille de la figure.

    Returns
    -------
    matplotlib.figure.Figure
    """
    c_range = np.linspace(0.001, x_max, n_points)
    res = reserves(moyenne, variance, c_range, distribution="lognormale")
    res_cut = reserves(moyenne, variance, np.array([coupure]), distribution="lognormale")

    # Paramètres lognormaux
    log_term = np.log(variance / moyenne**2 + 1)
    sigma = np.sqrt(log_term)
    mu = np.log(moyenne) - 0.5 * log_term

    x = np.linspace(0.001, x_max, n_points)
    pdf = lognorm.pdf(x, s=sigma, scale=np.exp(mu))
    pdf_cut = lognorm.pdf(coupure, s=sigma, scale=np.exp(mu))

    fig, axs = plt.subplots(2, 2, figsize=figsize)
    axs = axs.ravel()

    # --- Panel 1 : xc ---
    axs[0].plot(c_range, res.xc, label=r"$x_c = P(X > c)$")
    axs[0].axvline(coupure, color="red", linestyle="--")
    axs[0].scatter([coupure], res_cut.xc, color="red", zorder=5)
    axs[0].text(coupure + 0.1, res_cut.xc[0] + 0.03,
                f"{res_cut.xc[0]:.2f}", color="red")
    axs[0].set(xlim=(0, x_max), ylim=(0, 1),
               xlabel="Teneur de coupure ($c$)", ylabel="$x_c$",
               title=r"Proportion au-dessus de $c$")
    axs[0].legend()
    axs[0].grid(True)

    # --- Panel 2 : gc ---
    axs[1].plot(c_range, res.gc, label=r"$g_c = E[X|X>c]$")
    axs[1].axvline(coupure, color="red", linestyle="--")
    axs[1].scatter([coupure], res_cut.gc, color="red", zorder=5)
    axs[1].text(coupure + 0.1, res_cut.gc[0] + 0.5,
                f"{res_cut.gc[0]:.2f}", color="red")
    axs[1].set(xlim=(0, x_max), ylim=(0, max(res.gc.max() * 1.1, 15)),
               xlabel="Teneur de coupure ($c$)", ylabel="$g_c$",
               title="Teneur moyenne conditionnelle")
    axs[1].legend()
    axs[1].grid(True)

    # --- Panel 3 : xc × gc ---
    xc_gc = res.xc * res.gc
    xc_gc_cut = res_cut.xc[0] * res_cut.gc[0]
    axs[2].plot(c_range, xc_gc, label=r"$x_c \cdot g_c$")
    axs[2].axvline(coupure, color="red", linestyle="--")
    axs[2].scatter([coupure], [xc_gc_cut], color="red", zorder=5)
    axs[2].text(coupure + 0.1, xc_gc_cut + 0.03,
                f"{xc_gc_cut:.2f}", color="red")
    axs[2].set(xlim=(0, x_max), ylim=(0, xc_gc.max() * 1.1),
               xlabel="Teneur de coupure ($c$)", ylabel=r"$x_c \cdot g_c$",
               title="Teneur moyenne récupérée")
    axs[2].legend()
    axs[2].grid(True)

    # --- Panel 4 : PDF ---
    axs[3].plot(x, pdf, label="PDF")
    axs[3].fill_between(x, 0, pdf, where=(x > coupure),
                         color="grey", alpha=0.3, hatch="///")
    axs[3].axvline(coupure, color="red", linestyle="--")
    axs[3].scatter([coupure], [pdf_cut], color="red", zorder=5)
    axs[3].text(coupure + 0.1, pdf_cut + 0.02,
                f"{pdf_cut:.2f}", color="red")
    axs[3].set(xlim=(0, x_max), ylim=(0, pdf.max() + 0.1),
               xlabel="Teneur ($c$)", ylabel="Densité",
               title="Fonction de densité lognormale")
    axs[3].legend()
    axs[3].grid(True)

    plt.tight_layout()
    return fig


# ---------------------------------------------------------------------------
# 3. Analyse de sensibilité
# ---------------------------------------------------------------------------

# Noms lisibles des paramètres
NOMS_PARAMETRES: Dict[str, str] = {
    "m": "Coût minage (m)",
    "y": "Taux récupération (y)",
    "p": "Prix métal (p)",
    "k": "Coût fonderie (k)",
    "h": "Coût traitement (h)",
    "f": "Frais fixes (f)",
    "F": "Coût opportunité (F)",
    "M": "Capacité minage (M)",
    "H": "Capacité traitement (H)",
    "K": "Capacité marché (K)",
    "moyenne": "Moyenne (%)",
    "variance": "Variance (%)²",
}

# Plages par défaut pour le slider de sensibilité
PLAGES_SENSIBILITE: Dict[str, Tuple[float, float, float]] = {
    "m": (0, 1000, 1),
    "y": (0.2, 1.0, 0.01),
    "p": (0, 1000, 1),
    "k": (0, 1000, 1),
    "h": (0, 1000, 1),
    "f": (0, 1000, 1),
    "F": (0, 1000, 1),
    "M": (0, 1000, 1),
    "H": (0, 1000, 1),
    "K": (0, 1000, 1),
    "moyenne": (0.01, 2.0, 0.01),
    "variance": (0.01, 10.0, 0.01),
}


def analyse_sensibilite(
    params_base: ParametresLane,
    parametre: str,
    valeurs: np.ndarray,
) -> Tuple[np.ndarray, np.ndarray]:
    """Calcule c_opt et profit_opt pour une série de valeurs d'un paramètre.

    Parameters
    ----------
    params_base : ParametresLane
        Paramètres de référence.
    parametre : str
        Nom du paramètre à faire varier (ex. 'm', 'p', 'moyenne').
    valeurs : np.ndarray
        Valeurs à tester pour ce paramètre.

    Returns
    -------
    c_opt_arr : np.ndarray
        Teneurs de coupure optimales correspondantes.
    profit_opt_arr : np.ndarray
        Profits optimaux correspondants.
    """
    c_opt_arr = np.empty(len(valeurs))
    profit_opt_arr = np.empty(len(valeurs))

    for i, val in enumerate(valeurs):
        p = ParametresLane(**{
            k: getattr(params_base, k) for k in params_base.__dataclass_fields__
        })
        setattr(p, parametre, val)
        res = courbes_profit(p)
        c_opt_arr[i] = res.c_opt
        profit_opt_arr[i] = res.profit_opt

    return c_opt_arr, profit_opt_arr


def tracer_sensibilite(
    params_base: ParametresLane,
    parametre: str,
    valeur_courante: float,
    *,
    xlim_profit: Optional[Tuple[float, float]] = None,
    ylim_profit: Optional[Tuple[float, float]] = None,
    figsize: Tuple[float, float] = (8, 5),
) -> plt.Figure:
    """Trace le graphique de Lane pour une valeur donnée d'un paramètre variable.

    Parameters
    ----------
    params_base : ParametresLane
        Paramètres de référence (les valeurs par défaut).
    parametre : str
        Nom du paramètre en cours de variation.
    valeur_courante : float
        Valeur actuelle du paramètre variable.
    xlim_profit, ylim_profit : tuple, optional
        Limites des axes.
    figsize : tuple
        Taille de la figure.

    Returns
    -------
    matplotlib.figure.Figure
    """
    params = ParametresLane(**{
        k: getattr(params_base, k) for k in params_base.__dataclass_fields__
    })
    setattr(params, parametre, valeur_courante)

    resultat = courbes_profit(params)

    # Titre descriptif
    titre_parts = []
    for k in ["y", "p", "k", "h", "m", "f", "F", "M", "H", "K", "moyenne", "variance"]:
        val = getattr(params, k)
        titre_parts.append(f"{k}={val}")
    titre = "; ".join(titre_parts)

    fig = tracer_courbes_profit(
        resultat,
        afficher_tableau=True,
        xlim=xlim_profit or (0, 3),
        ylim=ylim_profit,
        figsize=figsize,
        titre=titre,
    )

    return fig

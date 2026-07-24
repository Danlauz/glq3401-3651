"""Générateurs de figures de courbes de Lane — chapitre 02 (économie minière).

Modules minces réutilisant ``geostat_polymtl.economics`` pour régénérer les
figures des exercices repérés « gén. MATLAB » dans ``_MAPPING_EXERCICES.md`` :

- **C2-A** : lecture de courbes de Lane multi-paramètres (panneau A/B/C/D)
  → source MATLAB ``2-Lane/Q2_InterpretationLane.m``.
- **C2-D** : Taylor & Lane — effet de l'information / hausse de la capacité de
  traitement / effet du temps (évolution moyenne+variance) / hausse des coûts
  → sources ``2-Lane/Q3_CalculLaneFromLogNormal.m`` et
  ``Automne2024/Q1-Lane/Q1_EvolutionMoyenne.m``.
- **C2-E** : application graphique d'une courbe de Lane unique + sensibilités
  → réutilise une seule courbe et l'analyse de sensibilité de la librairie.

Ces fonctions n'implémentent AUCUNE mathématique du modèle de Lane : elles se
contentent de définir les jeux de paramètres des exercices et la mise en page
matplotlib autour de :func:`geostat_polymtl.economics.courbes_profit` et de
:func:`geostat_polymtl.economics.tracer_courbes_profit`.
"""

from __future__ import annotations

from typing import Dict, Optional, Tuple

import matplotlib.pyplot as plt
import numpy as np

from geostat_polymtl.economics import economics, plotting
from geostat_polymtl.economics.economics import ParametresLane, courbes_profit


# ---------------------------------------------------------------------------
# Jeux de paramètres des exercices (extraits des scripts MATLAB)
# ---------------------------------------------------------------------------

# C2-A — quatre opérations minières A à D (Q2_InterpretationLane.m).
# Tous les cas partagent moy=0.7, s2=1, m=1.3, h=3, k=500, y=0.9, f=20, F=0.
_PARAMS_C2A: Dict[str, ParametresLane] = {
    "A": ParametresLane(M=30, H=15, K=0.12, m=1.3, h=3, k=500, p=1000,
                        y=0.9, f=20, F=0, moyenne=0.7, variance=1),
    "B": ParametresLane(M=28, H=12, K=0.10, m=1.3, h=3, k=500, p=1700,
                        y=0.9, f=20, F=0, moyenne=0.7, variance=1),
    "C": ParametresLane(M=28, H=12, K=0.22, m=1.3, h=3, k=500, p=1700,
                        y=0.9, f=20, F=0, moyenne=0.7, variance=1),
    "D": ParametresLane(M=24, H=18, K=0.22, m=1.3, h=3, k=500, p=1700,
                        y=0.9, f=20, F=0, moyenne=0.7, variance=1),
}

# C2-E — courbe de Lane unique servant de support à l'application graphique.
# Jeu de paramètres « cœur du chapitre » (gisement de Cu, marché limitant).
_PARAMS_C2E = ParametresLane(
    m=1.3, y=0.9, p=1700, k=500, h=3, f=20, F=0,
    M=20, H=15, K=0.25, moyenne=1.5, variance=7, distribution="lognormale",
)


# ---------------------------------------------------------------------------
# Outils internes
# ---------------------------------------------------------------------------

def _tracer_lane_sur_axe(
    ax: plt.Axes,
    params: ParametresLane,
    *,
    titre: Optional[str] = None,
    cc: Optional[np.ndarray] = None,
) -> economics.ResultatLane:
    """Trace les trois courbes de profit de Lane sur un axe matplotlib donné.

    Reproduit la mise en page de ``lane.m`` (courbes mine/traitement/marché,
    enveloppe inférieure hachurée, repères des teneurs limites c1/c2/c3 et
    d'équilibre c12/c13/c23) en s'appuyant sur le calcul de la librairie.

    Parameters
    ----------
    ax : matplotlib.axes.Axes
        Axe cible.
    params : ParametresLane
        Paramètres de l'opération.
    titre : str, optional
        Titre du sous-graphe.
    cc : np.ndarray, optional
        Grille de teneurs de coupure imposée (sinon grille automatique de la
        librairie).

    Returns
    -------
    economics.ResultatLane
    """
    res = courbes_profit(params, cc=cc)
    cc_a = res.cc
    v1, v2, v3 = res.v_mine, res.v_concentrateur, res.v_marche

    ax.plot(cc_a, v1, "-", label="Mine")
    ax.plot(cc_a, v2, "--", label="Traitement")
    ax.plot(cc_a, v3, ":", label="Marché")

    # Enveloppe inférieure (zone réalisable = min des trois courbes)
    v_min = np.minimum(np.minimum(v1, v2), v3)
    y_floor = v_min.min() - 0.05 * (v_min.max() - v_min.min() + 1e-9)
    ax.fill_between(cc_a, y_floor, v_min, color="grey", alpha=0.25, hatch="///")

    # Repères des teneurs limites et d'équilibre
    span = (max(v1.max(), v2.max(), v3.max())
            - min(v1.min(), v2.min(), v3.min()))
    dy = 0.04 * span
    for c_val, v_arr, lbl in [
        (res.c1, v1, "$c_1$"), (res.c2, v2, "$c_2$"), (res.c3, v3, "$c_3$"),
    ]:
        vmx = v_arr.max()
        ax.vlines(c_val, vmx, vmx + 0.8 * dy, colors="black", linewidth=1.0)
        ax.text(c_val, vmx + dy, lbl, fontsize=9, fontweight="bold")
    labels_eq = ["$c_{12}$", "$c_{13}$", "$c_{23}$"]
    for i, eq in enumerate(res.equilibres):
        lbl = labels_eq[i] if i < len(labels_eq) else eq.label
        ax.vlines(eq.teneur, eq.profit, eq.profit + 0.8 * dy,
                  colors="red", linewidth=1.0)
        ax.text(eq.teneur, eq.profit + dy, lbl, fontsize=9,
                fontweight="bold", color="red")

    ax.set_xlim(0, cc_a.max())
    ax.set_xlabel("Teneur de coupure (%)")
    ax.set_ylabel("Profit / t. minéralisée ($)")
    if titre:
        ax.set_title(titre)
    ax.grid(True, which="both", alpha=0.4)
    ax.legend(fontsize=8, loc="lower right")
    return res


# ---------------------------------------------------------------------------
# C2-A — Lecture de courbes de Lane multi-paramètres
# ---------------------------------------------------------------------------

def figure_c2a_interpretation(
    path: Optional[str] = None,
    figsize: Tuple[float, float] = (12, 9),
) -> Tuple[plt.Figure, np.ndarray]:
    """Figure C2-A : quatre opérations minières A à D (régimes limitants).

    Régénère la figure à 4 sous-graphes de ``Q2_InterpretationLane.m`` :
    chaque panneau (A à D) montre les courbes de Lane d'une opération opérant
    à sa teneur de coupure optimale. Sert de support aux 11 sous-questions
    QCM-graphiques de l'exercice C2-A (identifier mine/traitement/marché
    limitant, équilibres, capacité inutilisée, etc.).

    Parameters
    ----------
    path : str, optional
        Si fourni, enregistre la figure au format PNG à ce chemin.
    figsize : tuple
        Taille de la figure.

    Returns
    -------
    (fig, axes) : matplotlib.figure.Figure, numpy.ndarray d'Axes (grille 2×2 aplatie)
    """
    fig, axes = plt.subplots(2, 2, figsize=figsize)
    axes = axes.ravel()
    for ax, (lettre, params) in zip(axes, _PARAMS_C2A.items()):
        _tracer_lane_sur_axe(ax, params, titre=lettre)
    fig.suptitle("C2-A — Lecture de courbes de Lane (opérations A à D)",
                 fontsize=13)
    fig.tight_layout()
    if path:
        fig.savefig(path, dpi=150, bbox_inches="tight")
    return fig, axes


def resultats_c2a() -> Dict[str, economics.ResultatLane]:
    """Résultats numériques C2-A pour chaque opération A à D.

    Retourne un dictionnaire ``{lettre: ResultatLane}`` donnant, pour chaque
    opération, la teneur de coupure optimale, sa nature (régime limitant), les
    teneurs limites et d'équilibre. Utile pour corriger les sous-questions.
    """
    return {lettre: courbes_profit(p) for lettre, p in _PARAMS_C2A.items()}


# ---------------------------------------------------------------------------
# C2-D — Taylor & Lane : effets info / capacité / temps / coûts
# ---------------------------------------------------------------------------

def figure_c2d_evolution_temps(
    path: Optional[str] = None,
    figsize: Tuple[float, float] = (12, 5),
) -> Tuple[plt.Figure, np.ndarray]:
    """Figure C2-D (effet du temps) : courbes de Lane avant / après épuisement.

    Reproduit la comparaison de ``Q3_CalculLaneFromLogNormal.m`` (figures 1 et
    2) : une mine dont la distribution des teneurs évolue dans le temps. À
    gauche, distribution initiale (moy=2.4 %, var=5 %²) ; à droite, après cinq
    ans d'exploitation (moy=2.0 %, var=3.2 %²). Illustre la baisse habituelle
    de la teneur de coupure optimale et du profit au fil de la vie de la mine.

    Parameters
    ----------
    path : str, optional
        Chemin d'enregistrement PNG.
    figsize : tuple

    Returns
    -------
    (fig, axes)
    """
    base = dict(m=6, y=0.75, p=3500, k=2000, h=8, f=75, F=0,
                M=10, H=6, K=0.25, distribution="lognormale")
    p_init = ParametresLane(moyenne=2.4, variance=5.0, **base)
    p_5ans = ParametresLane(moyenne=2.0, variance=3.2, **base)

    fig, axes = plt.subplots(1, 2, figsize=figsize)
    _tracer_lane_sur_axe(axes[0], p_init,
                         titre="Initial — moy=2.4 %, var=5 %²")
    _tracer_lane_sur_axe(axes[1], p_5ans,
                         titre="Après 5 ans — moy=2.0 %, var=3.2 %²")
    fig.suptitle("C2-D — Effet du temps sur la teneur de coupure optimale",
                 fontsize=13)
    fig.tight_layout()
    if path:
        fig.savefig(path, dpi=150, bbox_inches="tight")
    return fig, axes


def figure_c2d_hausse_traitement(
    path: Optional[str] = None,
    figsize: Tuple[float, float] = (12, 5),
) -> Tuple[plt.Figure, np.ndarray]:
    """Figure C2-D (hausse de H) : effet d'une augmentation de la capacité.

    Reproduit ``Q3_CalculLaneFromLogNormal.m`` (gisement de Cu, moy=1.5 %,
    var=7 %², M=20, H=15, K=0.25, y=0.9) où le marché est d'abord limitant,
    puis on relâche la contrainte de marché (K très grand) pour passer à un
    équilibre mine-traitement. Les deux panneaux reprennent la fenêtre de zoom
    du MATLAB (xlim [0.2, 0.6], ylim [10.6, 11.6]).

    Returns
    -------
    (fig, axes)
    """
    base = dict(m=1.3, y=0.9, p=1700, k=500, h=3, f=20, F=0,
                M=20, H=15, moyenne=1.5, variance=7, distribution="lognormale")
    p_marche = ParametresLane(K=0.25, **base)          # marché limitant
    p_marche_libre = ParametresLane(K=100, **base)     # contrainte relâchée

    fig, axes = plt.subplots(1, 2, figsize=figsize)
    _tracer_lane_sur_axe(axes[0], p_marche, titre="K=0.25 — marché limitant")
    axes[0].set_xlim(0.2, 0.6)
    axes[0].set_ylim(10.6, 11.6)
    _tracer_lane_sur_axe(axes[1], p_marche_libre,
                         titre="K → ∞ — équilibre mine-traitement")
    axes[1].set_xlim(0.2, 0.6)
    axes[1].set_ylim(10.6, 11.6)
    fig.suptitle("C2-D — Effet d'une hausse de la capacité de traitement",
                 fontsize=13)
    fig.tight_layout()
    if path:
        fig.savefig(path, dpi=150, bbox_inches="tight")
    return fig, axes


def figure_c2d_fonctions_recuperation(
    path: Optional[str] = None,
    figsize: Tuple[float, float] = (13, 4),
) -> Tuple[plt.Figure, np.ndarray]:
    """Figure C2-D : fonctions de récupération xc, qc, gc (gisement de Cu).

    Reproduit la figure 1 de ``Q3_CalculLaneFromLogNormal.m`` : les trois
    fonctions de récupération T(c)=xc, Q(c)=qc et m(c)=gc pour une lognormale
    de moyenne 1.5 % et variance 7 %², sur la grille c = 0:0.01:0.8. Réutilise
    :func:`geostat_polymtl.economics.reserves.reserves_lognormale`.

    Returns
    -------
    (fig, axes)
    """
    from geostat_polymtl.economics.reserves import reserves_lognormale

    # Grille MATLAB 0:0.01:0.8 ; on démarre juste au-dessus de 0 pour éviter
    # log(m/0) dans la formule lognormale.
    c = np.arange(0.0, 0.8 + 1e-9, 0.01)
    c[0] = 1e-6
    res = reserves_lognormale(moyenne=1.5, variance=7.0, coupure=c)

    fig, axes = plt.subplots(1, 3, figsize=figsize)
    axes[0].plot(c, res.xc, "-k", lw=2)
    axes[0].set(ylabel="$x_c$", title="Fonction de récupération",
                xlabel="Teneur de coupure (%)")
    axes[1].plot(c, res.qc, "-k", lw=2)
    axes[1].set(ylabel="$q_c = x_c\\,g_c$ (%)", xlabel="Teneur de coupure (%)")
    axes[2].plot(c, res.gc, "-k", lw=2)
    axes[2].set(ylabel="$g_c$ (%)", xlabel="Teneur de coupure (%)")
    for ax in axes:
        ax.grid(True, which="both", alpha=0.4)
    fig.suptitle("C2-D — Fonctions de récupération (Cu, moy=1.5 %, var=7 %²)",
                 fontsize=13)
    fig.tight_layout()
    if path:
        fig.savefig(path, dpi=150, bbox_inches="tight")
    return fig, axes


def figure_c2d_comparaison_recuperation(
    path: Optional[str] = None,
    figsize: Tuple[float, float] = (8, 8),
) -> Tuple[plt.Figure, np.ndarray]:
    """Figure C2-D (effet du temps, détail) : xc et gc initial vs après 5 ans.

    Reproduit la figure 3 de ``Q3_CalculLaneFromLogNormal.m`` : superposition
    des fonctions de récupération xc (haut) et gc (bas) pour la distribution
    initiale (moy=2.4 %, var=5 %²) et après cinq ans (moy=2.0 %, var=3.2 %²),
    sur la grille c = 0:0.001:1.8.

    Returns
    -------
    (fig, axes)
    """
    from geostat_polymtl.economics.reserves import reserves_lognormale

    # Grille MATLAB 0:0.001:1.8 ; on démarre juste au-dessus de 0.
    c = np.arange(0.0, 1.8 + 1e-9, 0.001)
    c[0] = 1e-6
    r1 = reserves_lognormale(moyenne=2.4, variance=5.0, coupure=c)
    r2 = reserves_lognormale(moyenne=2.0, variance=3.2, coupure=c)

    fig, axes = plt.subplots(2, 1, figsize=figsize)
    axes[0].plot(c, r1.xc, "-k", lw=2, label="Initial")
    axes[0].plot(c, r2.xc, "--b", lw=2, label="Après 5 ans")
    axes[0].set(ylabel="$x_c$", title="Fonction de récupération")
    axes[0].legend()
    axes[1].plot(c, r1.gc, "-k", lw=2, label="Initial")
    axes[1].plot(c, r2.gc, "--b", lw=2, label="Après 5 ans")
    axes[1].set(xlabel="Teneur de coupure (%)", ylabel="$g_c$ (%)")
    axes[1].legend()
    for ax in axes:
        ax.grid(True, which="both", alpha=0.6)
    fig.suptitle("C2-D — Évolution des fonctions de récupération",
                 fontsize=13)
    fig.tight_layout()
    if path:
        fig.savefig(path, dpi=150, bbox_inches="tight")
    return fig, axes


# ---------------------------------------------------------------------------
# C2-E — Application graphique : courbe unique + sensibilités
# ---------------------------------------------------------------------------

def figure_c2e_application(
    path: Optional[str] = None,
    figsize: Tuple[float, float] = (9, 6),
) -> Tuple[plt.Figure, plt.Axes]:
    """Figure C2-E : courbe de Lane unique support de l'application graphique.

    Trace une seule courbe de Lane (mine/traitement/marché) avec ses teneurs
    limites c1/c2/c3, ses équilibres c12/c13/c23 et le repère de l'optimum.
    Sert de support aux 7 sous-questions C2-E (lire t.c. limites, optimale,
    profit, perte hors-optimum, sensibilités).

    Returns
    -------
    (fig, ax)
    """
    res = courbes_profit(_PARAMS_C2E)
    fig, ax = plt.subplots(figsize=figsize)
    _tracer_lane_sur_axe(ax, _PARAMS_C2E,
                         titre="C2-E — Application graphique du modèle de Lane")
    # Repère explicite de l'optimum
    ax.axvline(res.c_opt, color="green", linestyle="-.", lw=1.2,
               label=f"$c_{{opt}}$ = {res.c_opt:.2f} %")
    ax.legend(fontsize=8, loc="lower right")
    fig.tight_layout()
    if path:
        fig.savefig(path, dpi=150, bbox_inches="tight")
    return fig, ax


def figure_c2e_sensibilite(
    parametre: str = "p",
    valeurs: Optional[np.ndarray] = None,
    path: Optional[str] = None,
    figsize: Tuple[float, float] = (11, 4),
) -> Tuple[plt.Figure, np.ndarray]:
    """Figure C2-E (sensibilité) : c_opt et profit_opt en fonction d'un paramètre.

    Réutilise :func:`geostat_polymtl.economics.plotting.analyse_sensibilite`
    pour tracer l'évolution de la teneur de coupure optimale et du profit
    optimal lorsqu'un paramètre varie (prix p par défaut). Appuie les
    sous-questions de sensibilité de l'exercice C2-E.

    Parameters
    ----------
    parametre : str
        Nom du paramètre à faire varier (ex. 'p', 'h', 'H', 'moyenne').
    valeurs : np.ndarray, optional
        Valeurs testées (sinon plage automatique ±40 % autour de la base).
    path : str, optional
    figsize : tuple

    Returns
    -------
    (fig, axes)
    """
    base = _PARAMS_C2E
    if valeurs is None:
        v0 = getattr(base, parametre)
        valeurs = np.linspace(0.6 * v0, 1.4 * v0, 41)

    c_opt_arr, profit_arr = plotting.analyse_sensibilite(base, parametre, valeurs)

    nom = plotting.NOMS_PARAMETRES.get(parametre, parametre)
    fig, axes = plt.subplots(1, 2, figsize=figsize)
    axes[0].plot(valeurs, c_opt_arr, "-o", ms=3)
    axes[0].set(xlabel=nom, ylabel="$c_{opt}$ (%)",
                title="Teneur de coupure optimale")
    axes[1].plot(valeurs, profit_arr, "-o", ms=3, color="C1")
    axes[1].set(xlabel=nom, ylabel="Profit optimal ($/t)",
                title="Profit optimal")
    for ax in axes:
        ax.grid(True, alpha=0.4)
    fig.suptitle(f"C2-E — Sensibilité au paramètre « {nom} »", fontsize=13)
    fig.tight_layout()
    if path:
        fig.savefig(path, dpi=150, bbox_inches="tight")
    return fig, axes

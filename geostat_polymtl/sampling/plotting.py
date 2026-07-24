"""
Fonctions de visualisation pour la théorie de Gy et le QA/QC.

Ce module fournit des fonctions Matplotlib pour tracer :

- l'abaque de Gy (nomogramme d'échantillonnage) ;
- les séries de blancs avec détection d'outliers ;
- les séries de standards avec détection d'anomalies (Western Electric) ;
- les trois graphiques de duplicatas (scatter, différence relative, HARD).

Toutes les fonctions retournent la figure Matplotlib créée.
"""

from __future__ import annotations

from typing import Optional, Tuple

import matplotlib.pyplot as plt
import numpy as np

from .gy import ParametresGy, ResultatProcedure, ecart_type_relatif
from .blancs import ResultatBlancs
from .standards import ResultatStandards
from .duplicatas import ResultatDuplicatas


# ---------------------------------------------------------------------------
# 1. Abaque de Gy
# ---------------------------------------------------------------------------

def tracer_abaque_gy(
    params: ParametresGy,
    resultat: ResultatProcedure,
    *,
    niveaux_pct: Optional[list] = None,
    figsize: Tuple[float, float] = (10, 8),
) -> plt.Figure:
    """Trace l'abaque de Gy avec la procédure d'échantillonnage superposée.

    Parameters
    ----------
    params : ParametresGy
        Paramètres du matériau.
    resultat : ResultatProcedure
        Résultat de la procédure évaluée.
    niveaux_pct : list, optional
        Niveaux d'isocontours en % (défaut : [0.01, 0.05, 0.1, 0.5, 1, 5, 10, 50]).
    figsize : tuple
        Taille de la figure.

    Returns
    -------
    matplotlib.figure.Figure
    """
    if niveaux_pct is None:
        niveaux_pct = [0.01, 0.05, 0.1, 0.5, 1, 5, 10, 50]

    etapes = resultat.etapes
    me_list = [e.me for e in etapes]
    ml_list = [e.ml for e in etapes]
    d_list = [e.d for e in etapes]

    # Grilles
    me_min = min(me_list) * 0.1
    me_max = max(ml_list) * 10
    if me_min <= 0:
        me_min = min(me_list) * 0.5

    d_grid = np.logspace(-3, 1, 500)
    me_grid = np.logspace(np.log10(me_min), np.log10(me_max * 2), 500)
    D, ME = np.meshgrid(d_grid, me_grid)

    SR_grid = ecart_type_relatif(params, ME, ml_list[0], D)

    fig, ax = plt.subplots(figsize=figsize)

    # Contours
    cs = ax.contour(
        D, ME, SR_grid * 100, levels=niveaux_pct,
        colors="grey", linestyles="solid", linewidths=0.8, alpha=0.8,
    )

    # Labels des contours
    me_label_line = ml_list[0] / 50
    for lvl, segs in zip(cs.levels, cs.allsegs):
        for seg in segs:
            if seg.size == 0:
                continue
            x, y = seg[:, 0], seg[:, 1]
            if np.min(y) <= me_label_line <= np.max(y):
                idxs = np.where(np.diff(np.sign(y - me_label_line)) != 0)[0]
                if idxs.size > 0:
                    i = idxs[0]
                    x_cross = x[i] + (me_label_line - y[i]) / (y[i + 1] - y[i]) * (x[i + 1] - x[i]) \
                        if y[i + 1] != y[i] else x[i]
                else:
                    k = np.argmin(np.abs(y - me_label_line))
                    x_cross = x[k]
                ax.text(x_cross, me_label_line, f"{lvl:.2f}%",
                        color="grey", fontsize=8, ha="center", va="bottom",
                        bbox=dict(facecolor="white", edgecolor="none", alpha=0.7, pad=1))
                break

    # Ligne rouge cible
    sr_cible_pct = resultat.sr_desire * 100
    try:
        ax.contour(D, ME, SR_grid * 100, levels=[sr_cible_pct],
                   colors="red", linewidths=2, linestyles="--")
    except Exception:
        pass

    # Chemin de la procédure
    path_x, path_y = [d_list[0]], [ml_list[0]]
    for i in range(len(d_list)):
        path_x.append(d_list[i])
        path_y.append(me_list[i])
        if i < len(d_list) - 1:
            path_x.append(d_list[i + 1])
            path_y.append(me_list[i])

    ax.plot(path_x, path_y, "o-", color="blue", markersize=8,
            label="Procédure Échantillonnage/Concassage")

    # Annotations
    ax.text(path_x[0] * 1.05, path_y[0], "Lot Initial", color="blue", fontsize=9)
    for i, e in enumerate(etapes):
        idx_path = 2 * i + 1
        if idx_path < len(path_x):
            ax.text(path_x[idx_path] * 1.15, path_y[idx_path],
                    f"Étape {i + 1}\nsr={e.sr * 100:.3f}%",
                    color="darkgreen", fontsize=9)

    # Ligne du lot
    ax.plot([1e-3, 10], [ml_list[0], ml_list[0]],
            color="grey", linestyle="--", linewidth=1)

    ax.set_xscale("log")
    ax.set_yscale("log")
    ax.set_xlim(1e-3, 10)
    ax.set_ylim(me_min, me_max / 3)
    ax.set_xlabel("Taille maximale des fragments d (cm)")
    ax.set_ylabel("Masse de l'échantillon me (g)")
    ax.set_title(f"Abaque de Gy — sr_global = {resultat.sr_global * 100:.3f} %")
    ax.grid(True, which="both", linestyle="--", linewidth=0.5)
    ax.legend()

    plt.tight_layout()
    return fig


# ---------------------------------------------------------------------------
# 2. Blancs
# ---------------------------------------------------------------------------

def tracer_blancs(
    resultat: ResultatBlancs,
    *,
    figsize: Tuple[float, float] = (12, 5),
    y_max: Optional[float] = None,
) -> plt.Figure:
    """Trace la série temporelle des blancs avec détection d'outliers.

    Parameters
    ----------
    resultat : ResultatBlancs
        Résultat de :func:`~qaqc_gy.blancs.analyser_blancs`.
    figsize : tuple
        Taille de la figure.
    y_max : float, optional
        Limite supérieure de l'axe y.

    Returns
    -------
    matplotlib.figure.Figure
    """
    r = resultat
    t = np.arange(r.n_total)
    ld = r.ld

    fig, ax = plt.subplots(figsize=figsize)
    ax.plot(t, r.valeurs, linestyle="", marker="x", color="green", label="Blancs mesurés")

    # Bandes ±k×LD
    base = np.zeros_like(t, dtype=float)
    for k, alpha in [(3, 0.3), (5, 0.2), (10, 0.1)]:
        upper = base + k * ld
        lower = np.maximum(base - k * ld, 0)
        ax.fill_between(t, lower, upper, color="green", alpha=alpha, label=f"±{k} LD")

    ax.plot(t, base, color="green", linestyle="--", label="Teneur attendue (blanc)")

    # Outliers par catégorie
    cat_info = [
        (r.indices_1_3ld, "#ffd480", "1–3 LD"),
        (r.indices_3_5ld, "#ff9999", "3–5 LD"),
        (r.indices_5_10ld, "#cc3333", "5–10 LD"),
        (r.indices_sup_10ld, "#660000", ">10 LD"),
    ]
    for indices, color, label in cat_info:
        if len(indices) > 0:
            ax.scatter(t[indices], r.valeurs[indices], s=50, color=color,
                       edgecolors="black", linewidths=0.7, alpha=0.9, label=label)

    n_out = r.n_1_3ld + r.n_3_5ld + r.n_5_10ld + r.n_sup_10ld
    ax.set_title(
        f"Série des blancs — Total outliers : {n_out} "
        f"(1–3LD: {r.n_1_3ld}, 3–5LD: {r.n_3_5ld}, "
        f"5–10LD: {r.n_5_10ld}, >10LD: {r.n_sup_10ld})"
    )
    ax.set_xlabel("Échantillon")
    ax.set_ylabel("Teneur (ppm)")
    if y_max is not None:
        ax.set_ylim(-0.5, y_max)
    else:
        ax.set_ylim(-0.5, max(30 * ld, r.valeurs.max() * 1.1))
    ax.set_xlim(0, r.n_total)
    ax.legend(fontsize=9)
    ax.grid(True)

    plt.tight_layout()
    return fig


# ---------------------------------------------------------------------------
# 3. Standards
# ---------------------------------------------------------------------------

def tracer_standards(
    resultat: ResultatStandards,
    *,
    figsize: Tuple[float, float] = (12, 5),
    ylim: Optional[Tuple[float, float]] = None,
    point_changement: Optional[int] = None,
) -> plt.Figure:
    """Trace la série temporelle des standards avec détection d'anomalies.

    Parameters
    ----------
    resultat : ResultatStandards
        Résultat de :func:`~qaqc_gy.standards.analyser_standards`.
    figsize : tuple
        Taille de la figure.
    ylim : tuple, optional
        Limites de l'axe y.
    point_changement : int, optional
        Si fourni, trace une ligne verticale au point de changement de méthode.

    Returns
    -------
    matplotlib.figure.Figure
    """
    r = resultat
    t = np.arange(r.n_total)
    mu = r.moyenne_attendue
    sigma = r.ecart_type
    base = np.full_like(t, mu, dtype=float)

    fig, ax = plt.subplots(figsize=figsize)
    ax.plot(t, r.valeurs, linestyle="", marker="*", color="blue", label="Standard mesuré")

    # Bandes ±kσ
    couleurs_bandes = ["#ffcc80", "#ffb74d", "#ffa726"]
    for k, alpha, color in zip([1, 2, 3], [0.3, 0.2, 0.1], couleurs_bandes):
        ax.fill_between(t, base - k * sigma, base + k * sigma,
                        color=color, alpha=alpha, label=f"±{k}σ")

    ax.plot(t, base, color="orange", linestyle="--", label=f"Attendu ({mu} ppm)")

    # Anomalies
    markers_info = {
        "Critère 1": ("red", 80, "o"),
        "Critère 2": ("purple", 60, "s"),
        "Critère 3": ("brown", 50, "^"),
        "Critère 4": ("green", 40, "D"),
    }
    for crit, (color, size, marker) in markers_info.items():
        indices = r.anomalies[crit]
        if indices:
            ax.scatter(t[indices], r.valeurs[indices], color=color, label=crit,
                       s=size, marker=marker, edgecolors="k", zorder=5)

    if point_changement is not None:
        ax.axvline(point_changement, color="red", linestyle="--", label="Changement méthode")

    ax.set_xlabel("Échantillon")
    ax.set_ylabel("Teneur standard (ppm)")
    ax.set_title("Série temporelle de standards — détection d'anomalies (Western Electric)")
    if ylim:
        ax.set_ylim(ylim)
    else:
        ax.set_ylim(mu - 8 * sigma, mu + 8 * sigma)
    ax.set_xlim(0, r.n_total)
    ax.legend(loc="center left", bbox_to_anchor=(1, 0.5), fontsize=9)
    ax.grid(True)

    plt.tight_layout(rect=[0, 0, 0.85, 1])
    return fig


# ---------------------------------------------------------------------------
# 4. Duplicatas
# ---------------------------------------------------------------------------

def tracer_duplicatas(
    resultat: ResultatDuplicatas,
    *,
    figsize: Tuple[float, float] = (18, 6),
    max_val: Optional[float] = None,
) -> plt.Figure:
    """Trace les trois graphiques d'analyse des duplicatas.

    1. Nuage de points (scatter) avec bandes de tolérance.
    2. Différence relative (%) en fonction de la moyenne.
    3. Courbe HARD (Half Absolute Relative Difference).

    Parameters
    ----------
    resultat : ResultatDuplicatas
        Résultat de :func:`~qaqc_gy.duplicatas.analyser_duplicatas`.
    figsize : tuple
        Taille de la figure.
    max_val : float, optional
        Limite des axes pour le scatter et la diff. relative.

    Returns
    -------
    matplotlib.figure.Figure
    """
    r = resultat
    d1, d2 = r.dup1, r.dup2

    if max_val is None:
        max_val = min(
            max(np.quantile(d1, 0.95), np.quantile(d2, 0.95)) * 1.1,
            100,
        )

    fig = plt.figure(figsize=figsize, constrained_layout=True)

    # --- 1. Scatter ---
    ax1 = fig.add_subplot(1, 3, 1)
    ax1.scatter(d1, d2, alpha=0.6, label="Points")

    lims = [0, max_val]
    ax1.plot(lims, lims, "k--", label="y = x")

    tolerances = [0.1, 0.2, 0.3]
    colors = ["r", "orange", "purple"]
    for tol, col in zip(tolerances, colors):
        ax1.plot(lims, [lims[0] * (1 + tol), lims[1] * (1 + tol)],
                 color=col, linestyle="-", alpha=0.6, label=f"±{int(tol * 100)}%")
        ax1.plot(lims, [lims[0] * (1 - tol), lims[1] * (1 - tol)],
                 color=col, linestyle="-", alpha=0.6)

    # Points hors ±10 %
    out_10 = (d2 < d1 * 0.9) | (d2 > d1 * 1.1)
    ax1.scatter(d1[out_10], d2[out_10], color="red", s=80, label="Hors ±10%")

    ax1.set_xlabel("Duplicata 1")
    ax1.set_ylabel("Duplicata 2")
    ax1.set_title(
        f"Scatter — {r.n_total} paires\n"
        f"Hors ±10%: {r.n_hors_10pct} | ±20%: {r.n_hors_20pct} | ±30%: {r.n_hors_30pct}"
    )
    ax1.set_xlim(0, max_val)
    ax1.set_ylim(0, max_val)
    ax1.legend(loc="best", fontsize=8)
    ax1.grid(True)

    # --- 2. Différence relative ---
    ax2 = fig.add_subplot(1, 3, 2)
    ax2.scatter(r.moyennes, r.diff_relative, alpha=0.6, color="blue",
                label="Différence relative (%)")

    for tol, col in zip(tolerances, colors):
        ax2.axhline(y=tol * 100, color=col, linestyle="--", alpha=0.6, label=f"±{int(tol * 100)}%")
        ax2.axhline(y=-tol * 100, color=col, linestyle="--", alpha=0.6)

    out_diff = np.abs(r.diff_relative) > 10
    ax2.scatter(r.moyennes[out_diff], r.diff_relative[out_diff],
                color="red", s=80, label="Hors ±10%")

    ax2.set_xlabel("Moyenne des duplicatas")
    ax2.set_ylabel("Différence relative (%)")
    ax2.set_title("Différence relative entre duplicatas")
    ax2.set_xlim(0, max_val)
    ax2.set_ylim(-50, 50)
    ax2.legend(loc="best", fontsize=8)
    ax2.grid(True)

    # --- 3. HARD ---
    ax3 = fig.add_subplot(1, 3, 3)
    ax3.plot(r.hard_ranks, r.hard_values, color="black", linewidth=2, label="Courbe HARD")
    ax3.plot(0.9, 0.1, "o", color="red", markersize=10, label="Cible 90/10")

    ax3.set_xlabel("Rang / (N+1)")
    ax3.set_ylabel("HARD")
    ax3.set_title(f"Graphique HARD — {r.pct_hard_sous_10:.1f}% < 10%")
    ax3.set_ylim(0, max(0.3, r.hard_values.max() * 1.1))
    ax3.legend(loc="best", fontsize=9)
    ax3.grid(True)

    return fig

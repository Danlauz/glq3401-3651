"""Générateurs de figures — chapitre 05 (méthodes déterministes).

Version Python des scripts MATLAB d'examen
(``5-MéthodeConventionnelle/Q2_Accumlation_IDW_Triangle.m``) reproduisant les
exercices d'estimation par méthodes conventionnelles :

- **polygones / plus proche voisin** (Thiessen — Voronoï) ;
- **triangles / TIN** (triangulation de Delaunay, interpolation barycentrique) ;
- **inverse de la distance** (IDW, puissance ``b``) ;
- **comparaison** des trois méthodes en un point.

Tous les calculs RÉUTILISENT la librairie
:mod:`geostat_polymtl.conventional` ; ce module n'ajoute que la configuration
des points des exercices et la mise en page des cartes (semis de points,
polygones de Voronoï, triangulation de Delaunay).

Chaque générateur retourne ``(fig, ax)`` et/ou un ``dict`` de résultats et
accepte un argument ``path`` optionnel pour enregistrer la figure.
"""
from __future__ import annotations

from typing import Dict, Optional, Tuple

import numpy as np
import matplotlib.pyplot as plt
from scipy.spatial import Voronoi, voronoi_plot_2d, Delaunay

# --- Réutilisation de la librairie (AUCUNE réimplémentation) ------------------
from geostat_polymtl.conventional.idw import idw
from geostat_polymtl.conventional.polygones import plus_proche_voisin
from geostat_polymtl.conventional.triangles import interpolation_triangulaire


# ── Configuration des données de l'exercice (source MATLAB) ───────────────────
# Forages réalisés : [x, y, teneur (%), épaisseur (m)]
# (la colonne z=1 du MATLAB sert seulement de constante pour l'ajustement de plan)
_FORAGES = np.array([
    [6.0,  2.0, 1.2, 2.4],
    [1.0,  2.0, 3.4, 3.0],
    [4.0, -1.0, 5.7, 1.2],
])
# Point à estimer
_POINT = np.array([4.0, 1.0])


def donnees_exercice() -> Dict[str, np.ndarray]:
    """Données de l'exercice 5 (source ``Q2_Accumlation_IDW_Triangle.m``).

    Returns
    -------
    dict
        ``coordonnees`` (3, 2), ``teneur`` (3,), ``epaisseur`` (3,),
        ``point`` (2,) — point à estimer ``x_0``.
    """
    return {
        "coordonnees": _FORAGES[:, :2].copy(),
        "teneur": _FORAGES[:, 2].copy(),
        "epaisseur": _FORAGES[:, 3].copy(),
        "point": _POINT.copy(),
    }


def _enregistrer(fig, path: Optional[str]) -> None:
    """Enregistre la figure si un chemin est fourni."""
    if path:
        fig.savefig(path, dpi=150, bbox_inches="tight")


def _mise_en_page_carte(ax, coords, teneur, epais, point) -> None:
    """Trace le semis de forages annotés + le point à estimer (calque MATLAB)."""
    # Forages (noirs) et point à estimer (rouge)
    ax.plot(coords[:, 0], coords[:, 1], "ok", markerfacecolor="black",
            markersize=8, zorder=5)
    ax.plot(point[0], point[1], "or", markerfacecolor="red",
            markersize=9, zorder=6)

    # Annotations : x_i, teneur (%) et épaisseur (m) — comme le MATLAB
    for i, (cx, cy) in enumerate(coords, start=1):
        ax.annotate(f"$x_{{{i}}}$", (cx, cy), textcoords="offset points",
                    xytext=(-22, 6), fontsize=11)
        ax.annotate(f"{teneur[i-1]:g} %", (cx, cy), textcoords="offset points",
                    xytext=(8, 8), fontsize=9)
        ax.annotate(f"{epais[i-1]:g} m", (cx, cy), textcoords="offset points",
                    xytext=(8, -4), fontsize=9, color="0.35")
    ax.annotate("$x_0$", (point[0], point[1]), textcoords="offset points",
                xytext=(-22, 6), fontsize=11, color="red")

    ax.set_xlim(coords[:, 0].min() - 1, coords[:, 0].max() + 1)
    ax.set_ylim(coords[:, 1].min() - 1.5, coords[:, 1].max() + 1)
    ax.set_aspect("equal")
    ax.grid(True, ls=":", alpha=0.6)
    ax.set_xlabel("x (m)")
    ax.set_ylabel("y (m)")


def carte_points(path: Optional[str] = None) -> Tuple[plt.Figure, plt.Axes]:
    """Carte de localisation des forages et du point à estimer.

    Exercice 5 — figure d'énoncé : trois forages annotés (teneur, épaisseur)
    et le point ``x_0`` à estimer (source MATLAB
    ``Q2_Accumlation_IDW_Triangle.m``).
    """
    d = donnees_exercice()
    fig, ax = plt.subplots(figsize=(6, 6))
    _mise_en_page_carte(ax, d["coordonnees"], d["teneur"], d["epaisseur"],
                        d["point"])
    # Triangle reliant les forages (comme le tracé MATLAB)
    c = d["coordonnees"]
    ax.plot(np.append(c[:, 0], c[0, 0]), np.append(c[:, 1], c[0, 1]),
            "-k", lw=1, alpha=0.5)
    ax.set_title("Configuration des forages — point $x_0$ à estimer")
    _enregistrer(fig, path)
    return fig, ax


def carte_polygones(path: Optional[str] = None) -> Tuple[plt.Figure, plt.Axes, Dict]:
    """Estimation par la méthode des polygones (plus proche voisin / Thiessen).

    Exercice 5a — la valeur en ``x_0`` est celle du forage le plus proche.
    Trace les polygones de Voronoï et reporte l'estimation (teneur, épaisseur).
    RÉUTILISE :func:`geostat_polymtl.conventional.polygones.plus_proche_voisin`.

    Returns
    -------
    (fig, ax, resultat)
        ``resultat`` : ``{"teneur": float, "epaisseur": float, "indice": int}``.
    """
    d = donnees_exercice()
    coords, teneur, epais, point = (d["coordonnees"], d["teneur"],
                                    d["epaisseur"], d["point"])

    t_est = float(plus_proche_voisin(coords, teneur, point)[0])
    e_est = float(plus_proche_voisin(coords, epais, point)[0])
    # Indice du forage retenu (pour mise en évidence)
    idx = int(np.argmin(np.hypot(coords[:, 0] - point[0],
                                 coords[:, 1] - point[1])))

    fig, ax = plt.subplots(figsize=(6, 6))
    _mise_en_page_carte(ax, coords, teneur, epais, point)

    # Polygones de Voronoï (médiatrices) via scipy
    vor = Voronoi(coords)
    voronoi_plot_2d(vor, ax=ax, show_points=False, show_vertices=False,
                    line_colors="tab:blue", line_width=1.2, line_alpha=0.7)
    # Mise en évidence du forage retenu
    ax.plot(coords[idx, 0], coords[idx, 1], "o", mfc="none",
            mec="tab:green", mew=2.5, markersize=16, zorder=7)
    ax.set_xlim(coords[:, 0].min() - 1, coords[:, 0].max() + 1)
    ax.set_ylim(coords[:, 1].min() - 1.5, coords[:, 1].max() + 1)
    ax.set_title(f"Polygones — $x_0$ : teneur = {t_est:g} %, "
                 f"épaisseur = {e_est:g} m")
    _enregistrer(fig, path)
    return fig, ax, {"teneur": t_est, "epaisseur": e_est, "indice": idx}


def carte_triangles(path: Optional[str] = None) -> Tuple[plt.Figure, plt.Axes, Dict]:
    """Estimation par la méthode des triangles (TIN — Delaunay).

    Exercice 5b — interpolation barycentrique sur le triangle contenant ``x_0``.
    Comme l'épaisseur et la teneur ne sont pas additives, on interpole
    séparément l'épaisseur ``e`` et l'accumulation ``a = teneur·e`` (méthode du
    MATLAB), puis ``teneur = a / e``. RÉUTILISE
    :func:`geostat_polymtl.conventional.triangles.interpolation_triangulaire`.

    Returns
    -------
    (fig, ax, resultat)
        ``{"teneur": float, "epaisseur": float, "accumulation": float}``.
    """
    d = donnees_exercice()
    coords, teneur, epais, point = (d["coordonnees"], d["teneur"],
                                    d["epaisseur"], d["point"])

    pt = point.reshape(1, 2)
    e_est = float(interpolation_triangulaire(coords, epais, pt,
                                             mode="barycentrique")[0])
    a_est = float(interpolation_triangulaire(coords, teneur * epais, pt,
                                             mode="barycentrique")[0])
    t_est = a_est / e_est

    fig, ax = plt.subplots(figsize=(6, 6))
    _mise_en_page_carte(ax, coords, teneur, epais, point)

    # Triangulation de Delaunay
    tri = Delaunay(coords)
    ax.triplot(coords[:, 0], coords[:, 1], tri.simplices,
               color="tab:orange", lw=1.4, alpha=0.8)
    ax.set_title(f"Triangles — $x_0$ : teneur = {t_est:.3g} %, "
                 f"épaisseur = {e_est:.3g} m")
    _enregistrer(fig, path)
    return fig, ax, {"teneur": t_est, "epaisseur": e_est, "accumulation": a_est}


def carte_idw(puissance: float = 2.0,
              path: Optional[str] = None) -> Tuple[plt.Figure, plt.Axes, Dict]:
    """Estimation par inverse de la distance pondérée (IDW).

    Exercice 5c — pondération ``w_i = 1/d_i^b`` (``b = puissance``, 2 par défaut).
    Interpole l'épaisseur et l'accumulation puis ``teneur = accumulation / e``.
    RÉUTILISE :func:`geostat_polymtl.conventional.idw.idw`.

    Returns
    -------
    (fig, ax, resultat)
        ``{"teneur": float, "epaisseur": float, "accumulation": float,
        "puissance": float}``.
    """
    d = donnees_exercice()
    coords, teneur, epais, point = (d["coordonnees"], d["teneur"],
                                    d["epaisseur"], d["point"])

    pt = point.reshape(1, 2)
    e_est = float(idw(coords, epais, pt, puissance=puissance)[0])
    a_est = float(idw(coords, teneur * epais, pt, puissance=puissance)[0])
    t_est = a_est / e_est

    fig, ax = plt.subplots(figsize=(6, 6))
    _mise_en_page_carte(ax, coords, teneur, epais, point)

    # Rayons forage → point, étiquetés par la distance (pondération IDW)
    for cx, cy in coords:
        ax.plot([cx, point[0]], [cy, point[1]], "--",
                color="0.6", lw=1, zorder=1)
        dist = np.hypot(cx - point[0], cy - point[1])
        ax.annotate(f"d={dist:.2f}", ((cx + point[0]) / 2, (cy + point[1]) / 2),
                    fontsize=8, color="0.4", ha="center")
    ax.set_title(f"IDW (b={puissance:g}) — $x_0$ : teneur = {t_est:.3g} %, "
                 f"épaisseur = {e_est:.3g} m")
    _enregistrer(fig, path)
    return fig, ax, {"teneur": t_est, "epaisseur": e_est,
                     "accumulation": a_est, "puissance": puissance}


def comparer_methodes_point(puissance: float = 2.0) -> Dict[str, Dict[str, float]]:
    """Compare les trois méthodes déterministes au point ``x_0``.

    Exercice 5 (synthèse) — retourne la teneur et l'épaisseur estimées par
    polygones, triangles et IDW. RÉUTILISE les fonctions de la librairie
    ``geostat_polymtl.conventional``.

    Returns
    -------
    dict
        ``{"polygones": {...}, "triangles": {...}, "idw": {...}}``.
    """
    d = donnees_exercice()
    coords, teneur, epais, point = (d["coordonnees"], d["teneur"],
                                    d["epaisseur"], d["point"])
    pt = point.reshape(1, 2)

    # Polygones
    t_p = float(plus_proche_voisin(coords, teneur, point)[0])
    e_p = float(plus_proche_voisin(coords, epais, point)[0])
    # Triangles (accumulation)
    e_t = float(interpolation_triangulaire(coords, epais, pt, "barycentrique")[0])
    a_t = float(interpolation_triangulaire(coords, teneur * epais, pt,
                                           "barycentrique")[0])
    # IDW (accumulation)
    e_i = float(idw(coords, epais, pt, puissance=puissance)[0])
    a_i = float(idw(coords, teneur * epais, pt, puissance=puissance)[0])

    return {
        "polygones": {"teneur": t_p, "epaisseur": e_p},
        "triangles": {"teneur": a_t / e_t, "epaisseur": e_t},
        "idw": {"teneur": a_i / e_i, "epaisseur": e_i, "puissance": puissance},
    }


def figure_comparaison(puissance: float = 2.0,
                       path: Optional[str] = None) -> Tuple[plt.Figure, np.ndarray]:
    """Figure récapitulative : polygones, triangles et IDW côte à côte.

    Exercice 5 (synthèse) — trois panneaux partageant la même configuration.
    """
    fig, axes = plt.subplots(1, 3, figsize=(16, 6))
    d = donnees_exercice()
    coords, teneur, epais, point = (d["coordonnees"], d["teneur"],
                                    d["epaisseur"], d["point"])
    res = comparer_methodes_point(puissance)

    # Polygones
    ax = axes[0]
    _mise_en_page_carte(ax, coords, teneur, epais, point)
    vor = Voronoi(coords)
    voronoi_plot_2d(vor, ax=ax, show_points=False, show_vertices=False,
                    line_colors="tab:blue", line_width=1.2, line_alpha=0.7)
    ax.set_xlim(coords[:, 0].min() - 1, coords[:, 0].max() + 1)
    ax.set_ylim(coords[:, 1].min() - 1.5, coords[:, 1].max() + 1)
    ax.set_title(f"Polygones\nt = {res['polygones']['teneur']:.3g} %, "
                 f"e = {res['polygones']['epaisseur']:.3g} m")

    # Triangles
    ax = axes[1]
    _mise_en_page_carte(ax, coords, teneur, epais, point)
    tri = Delaunay(coords)
    ax.triplot(coords[:, 0], coords[:, 1], tri.simplices,
               color="tab:orange", lw=1.4, alpha=0.8)
    ax.set_title(f"Triangles\nt = {res['triangles']['teneur']:.3g} %, "
                 f"e = {res['triangles']['epaisseur']:.3g} m")

    # IDW
    ax = axes[2]
    _mise_en_page_carte(ax, coords, teneur, epais, point)
    for cx, cy in coords:
        ax.plot([cx, point[0]], [cy, point[1]], "--", color="0.6", lw=1, zorder=1)
    ax.set_title(f"IDW (b={puissance:g})\nt = {res['idw']['teneur']:.3g} %, "
                 f"e = {res['idw']['epaisseur']:.3g} m")

    fig.suptitle("Comparaison des méthodes déterministes au point $x_0$",
                 fontsize=13)
    fig.tight_layout()
    _enregistrer(fig, path)
    return fig, axes

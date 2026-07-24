"""Dégroupement spatial par cellules (figure des cellules, chapitre 4).

Générateur de la figure du dégroupement par cellules : un semis de points
spatialement non uniforme (zone suréchantillonnée) est recouvert d'une grille
de cellules, et chaque point reçoit un poids inversement proportionnel au
nombre de points de sa cellule. Le calcul délègue intégralement à
:func:`geostat_polymtl.forage.degroupement_cellules` /
:func:`geostat_polymtl.forage.moyenne_degroupee` ; ce module n'ajoute que le
semis d'exemple et la mise en page.
"""
from __future__ import annotations

from typing import Optional, Sequence, Tuple

import numpy as np

from geostat_polymtl.forage.degroupement import (
    degroupement_cellules,
    moyenne_degroupee,
)


def _semis_exemple(graine: int = 4515):
    """Semis d'exemple : grille lâche + amas suréchantillonné.

    Reproduit l'esprit des exemples de dégroupement du chapitre : un fond
    régulier peu dense et une zone dense (amas) qui biaiserait la moyenne
    brute. Les teneurs de l'amas sont plus fortes pour rendre le biais visible.
    """
    rng = np.random.default_rng(graine)
    # Fond régulier (faible densité, teneur basse)
    gx, gy = np.meshgrid(np.linspace(5, 95, 6), np.linspace(5, 95, 6))
    fond = np.column_stack([gx.ravel(), gy.ravel()])
    t_fond = 1.0 + 0.2 * rng.standard_normal(len(fond))
    # Amas suréchantillonné (forte densité, teneur élevée)
    amas = np.column_stack([
        65 + 8 * rng.standard_normal(40),
        65 + 8 * rng.standard_normal(40),
    ])
    t_amas = 3.0 + 0.4 * rng.standard_normal(len(amas))
    points = np.vstack([fond, amas])
    teneurs = np.concatenate([t_fond, t_amas])
    return points, teneurs


def figure_degroupement(
    points: Optional[Sequence] = None,
    valeurs: Optional[Sequence] = None,
    taille_cellule: float = 20.0,
    emprise: Optional[Tuple[float, float, float, float]] = None,
    path: Optional[str] = None,
) -> Tuple["object", "object", dict]:
    """Figure du dégroupement par cellules + moyennes brute/dégroupée.

    Parameters
    ----------
    points : séquence de (x, y), optional
        Semis ; par défaut un exemple grille + amas suréchantillonné.
    valeurs : séquence de float, optional
        Teneurs associées (pour la moyenne dégroupée).
    taille_cellule : float
        Côté des cellules carrées.
    emprise : (x_min, x_max, y_min, y_max), optional
        Emprise de la grille ; déduite des points si absente.
    path : str, optional
        Si fourni, enregistre la figure.

    Returns
    -------
    (fig, ax, donnees)
        ``donnees`` : ``poids``, ``n_cellules_occupees``, ``nx``, ``ny``,
        ``moyenne_brute``, ``moyenne_degroupee``.
    """
    import matplotlib.pyplot as plt

    if points is None or valeurs is None:
        points, valeurs = _semis_exemple()
    pts = np.asarray(points, dtype=float)
    val = np.asarray(valeurs, dtype=float)

    if emprise is None:
        x_min, x_max = pts[:, 0].min(), pts[:, 0].max()
        y_min, y_max = pts[:, 1].min(), pts[:, 1].max()
    else:
        x_min, x_max, y_min, y_max = emprise

    res = degroupement_cellules(
        pts, taille_cellule, x_min, x_max, y_min, y_max
    )
    moy_brute = float(np.mean(val))
    moy_degr = moyenne_degroupee(
        pts, val, taille_cellule, x_min, x_max, y_min, y_max
    )

    fig, ax = plt.subplots(figsize=(6.5, 6.0))
    # Grille de cellules
    for k in range(res.nx + 1):
        ax.axvline(x_min + k * taille_cellule, color="0.8", lw=0.8, zorder=0)
    for k in range(res.ny + 1):
        ax.axhline(y_min + k * taille_cellule, color="0.8", lw=0.8, zorder=0)
    # Points colorés par poids (les zones denses ont un faible poids)
    sc = ax.scatter(pts[:, 0], pts[:, 1], c=res.poids, s=45,
                    cmap="viridis", edgecolor="k", linewidths=0.4, zorder=2)
    cb = fig.colorbar(sc, ax=ax, shrink=0.85)
    cb.set_label("Poids de dégroupement $w_i$")
    ax.set_xlabel("x (m)")
    ax.set_ylabel("y (m)")
    ax.set_title(
        f"Dégroupement par cellules ({taille_cellule:g} m)\n"
        f"moyenne brute = {moy_brute:.3f}  |  "
        f"dégroupée = {moy_degr:.3f}"
    )
    ax.set_aspect("equal", adjustable="box")
    fig.tight_layout()
    if path:
        fig.savefig(path, dpi=150, bbox_inches="tight")

    donnees = {
        "poids": res.poids,
        "n_cellules_occupees": res.n_cellules_occupees,
        "nx": res.nx,
        "ny": res.ny,
        "moyenne_brute": moy_brute,
        "moyenne_degroupee": moy_degr,
    }
    return fig, ax, donnees

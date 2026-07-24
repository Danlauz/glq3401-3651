"""Teneur moyenne par accumulation sur une section polygonale (chapitre 4).

Portage Python de ``CP1/Code_examen/5-MéthodeConventionnelle/Q1_Accumlation.m``.

Une section horizontale d'une mine est découpée en zones (méthode des
polygones). Chaque zone ``i`` est définie par une teneur ``t_i`` (%), une
épaisseur de veine ``w_i`` (m) et une aire ``s_i`` (m²). La technique
d'accumulation pondère la teneur par l'épaisseur (``GT = t · w``, le métal
accumulé), puis par l'aire :

.. math::

    \\bar t = \\frac{\\sum_i t_i\\, w_i\\, s_i}{\\sum_i w_i\\, s_i}

PRIMITIVE MANQUANTE : la librairie ``geostat_polymtl.forage`` ne fournit pas
de fonction d'accumulation polygonale (``GT = t·w``). Le ratio pondéré
ci-dessous EST la définition de l'exercice (pas une primitive géostatistique
réutilisable) ; il est donc calculé directement ici. Voir le rapport.
"""
from __future__ import annotations

from typing import Optional, Tuple

import numpy as np

# --- Paramètres par défaut de la source MATLAB Q1_Accumlation.m -------------
# Six échantillons : [x, y, teneur (%), épaisseur (m)] et aire (m²) de la zone
# polygonale associée. Les positions d'affichage (numérotées 1 à 6 sur la
# figure MATLAB) et l'appariement aire↔échantillon suivent exactement la
# source (lignes a1..a6 / V1..V6).
_ECHANTILLONS = [
    # (x_affichage, y_affichage, teneur %, épaisseur m, aire m²)
    (25.0,  50.0, 4.1, 2.7,  5050.0),   # zone 1
    (25.0, 125.0, 8.0, 1.3, 19900.0),   # zone 2
    (25.0, 175.0, 7.0, 1.5, 19900.0),   # zone 3
    (25.0, 250.0, 3.0, 1.4,  5050.0),   # zone 4
    (175.0, 50.0, 5.2, 4.0,  5050.0),   # zone 5
    (175.0, 250.0, 2.9, 3.2, 5050.0),   # zone 6
]
# Sommets des polygones (méthode des polygones) — pour le tracé uniquement
_BORDS_EXT = [(0, 100), (0, 300), (200, 300), (200, 0), (0, 100)]
_BORDS_INT = [(0, 100), (100, 0), (100, 100), (100, 200), (0, 200),
              (0, 150), (100, 200), (200, 100)]


def teneur_accumulation(teneurs, epaisseurs, aires) -> float:
    """Teneur moyenne par accumulation :math:`\\sum t w s / \\sum w s`.

    ``GT = t·w`` est le métal accumulé par unité de surface ; pondéré par
    l'aire des polygones, le ratio donne la teneur moyenne de la section.
    """
    t = np.asarray(teneurs, dtype=float)
    w = np.asarray(epaisseurs, dtype=float)
    s = np.asarray(aires, dtype=float)
    num = np.sum(t * w * s)        # Σ accumulation·aire (a_i dans le MATLAB)
    den = np.sum(w * s)            # Σ volume      (V_i dans le MATLAB)
    return float(num / den)


def figure_accumulation(
    echantillons=_ECHANTILLONS,
    largeur: float = 200.0,
    longueur: float = 300.0,
    path: Optional[str] = None,
) -> Tuple["object", "object", dict]:
    """Section polygonale et teneur moyenne par accumulation (Q1).

    Reproduit la figure MATLAB : section ``largeur × longueur`` découpée en
    zones par la méthode des polygones, chaque échantillon annoté de sa teneur
    (%) et de son épaisseur (m). Calcule la teneur moyenne par accumulation.

    Parameters
    ----------
    echantillons : séquence de (x, y, teneur, épaisseur, aire)
        Emplacement d'affichage, mesures (teneur %, épaisseur m) et aire (m²)
        du polygone associé.
    largeur, longueur : float
        Dimensions de la section (m).
    path : str, optional
        Si fourni, enregistre la figure.

    Returns
    -------
    (fig, ax, donnees)
        ``donnees`` : ``teneur_moyenne`` (accumulation), ``accumulations``
        (``t·w`` par zone) et ``volumes`` (``w·s`` par zone).
    """
    import matplotlib.pyplot as plt

    ech = np.asarray(echantillons, dtype=float)
    x, y, t, w, s = (ech[:, 0], ech[:, 1], ech[:, 2],
                     ech[:, 3], ech[:, 4])

    teneur_moy = teneur_accumulation(t, w, s)
    accumulations = t * w
    volumes = w * s

    fig, ax = plt.subplots(figsize=(6.0, 6.8))
    ext = np.asarray(_BORDS_EXT, dtype=float)
    ax.plot(ext[:, 0], ext[:, 1], "-k", lw=2)
    inter = np.asarray(_BORDS_INT, dtype=float)
    ax.plot(inter[:, 0], inter[:, 1], "-k", lw=1.5, alpha=0.7)
    # Échantillons + annotations teneur/épaisseur
    ax.plot(x, y, "o", ms=12, mfc="none", mec="#36c", mew=1.5, zorder=3)
    ax.plot(x, y, "*k", ms=7, zorder=4)
    for i in range(len(x)):
        dxs = -34 if x[i] < largeur / 2 else 10
        ax.text(x[i] + dxs, y[i] + 4, f"{t[i]:g} %", fontsize=8)
        ax.text(x[i] + dxs, y[i] - 12, f"{w[i]:g} m", fontsize=8)
        ax.text(x[i] - 3, y[i] + 8, f"{i + 1}", fontsize=9, weight="bold")
    # Aires des zones
    for (xi, yi, si) in [
        (25, 275, 5050), (150, 275, 5050), (85, 225, 19900),
        (85, 50, 19900), (25, 25, 5050), (150, 25, 5050),
    ]:
        ax.text(xi, yi, f"s={si:g} m²", fontsize=7, color="0.4")
    ax.set_xlabel("x (m)")
    ax.set_ylabel("y (m)")
    ax.set_title(f"Méthode des polygones — accumulation\n"
                 f"teneur moyenne = {teneur_moy:.4f} %")
    ax.set_xlim(-40, largeur + 40)
    ax.set_ylim(-40, longueur + 30)
    ax.set_aspect("equal", adjustable="box")
    fig.tight_layout()
    if path:
        fig.savefig(path, dpi=150, bbox_inches="tight")

    donnees = {
        "teneur_moyenne": teneur_moy,
        "accumulations": accumulations,
        "volumes": volumes,
    }
    return fig, ax, donnees

"""Générateurs de figures — chapitre 08 (variance d'estimation / patrons d'échantillonnage).

Version Python du script MATLAB d'examen
(``7-VarianceBloc_Dispersion/Q2_VarEstimation.m`` et
``grilleAleatoireStratifie.m``) illustrant l'effet du **patron
d'échantillonnage** sur la variance d'estimation d'un panneau (gisement).

Quatre zones d'une portion de mine de Zn sont échantillonnées avec des patrons
différents : grille régulière, grille régulière dense, grille étirée
(anisotrope), grille aléatoire stratifiée. La variance d'estimation
:math:`\\sigma^2_E = \\bar\\gamma(V, S) \\cdot 2 - \\bar\\gamma(S, S) -
\\bar\\gamma(V, V)` dépend de la régularité et de la densité de ces patrons.

Ce module ne réécrit AUCUNE primitive de la librairie :

- la variance de bloc / d'estimation théorique s'obtient par
  :func:`geostat_polymtl.block_variance.quadrature.variance_bloc_quadrature` ;
- seuls la **génération des patrons d'échantillonnage** (équivalent numpy des
  helpers MATLAB ``grille2`` et ``grilleAleatoireStratifie``) et la **mise en
  page** des cartes sont du code neuf, comme le permet l'énoncé.

``grille2`` n'existe pas dans la librairie : c'est un simple générateur de
grille régulière (produit cartésien). On le porte ici en numpy car il fait
partie de la *configuration de l'exercice*, pas des primitives géostatistiques.
"""
from __future__ import annotations

from typing import Dict, List, Optional, Tuple

import numpy as np
import matplotlib.pyplot as plt

# --- Réutilisation de la librairie (variance d'estimation théorique) ---------
from geostat_polymtl.block_variance.quadrature import variance_bloc_quadrature


# ── Configuration des zones de l'exercice (source MATLAB Q2) ──────────────────
# Paramètres exacts du script Q2_VarEstimation.m (nx, ny, dx, dy par zone).
_ZONES: Dict[int, Dict] = {
    1: {"nx": 5,  "ny": 5,  "dx": 20.0, "dy": 20.0, "patron": "stratifie",
        "label": "Grille aléatoire stratifiée"},
    2: {"nx": 20, "ny": 5,  "dx": 10.0, "dy": 20.0, "patron": "reguliere",
        "label": "Grille régulière dense"},
    3: {"nx": 5,  "ny": 5,  "dx": 20.0, "dy": 40.0, "patron": "reguliere",
        "label": "Grille régulière étirée (anisotrope)"},
    4: {"nx": 10, "ny": 10, "dx": 20.0, "dy": 20.0, "patron": "stratifie",
        "label": "Grille aléatoire stratifiée fine"},
}


def _enregistrer(fig, path: Optional[str]) -> None:
    """Enregistre la figure si un chemin est fourni."""
    if path:
        fig.savefig(path, dpi=150, bbox_inches="tight")


# ── Générateurs de patrons (équivalent numpy des helpers MATLAB) ──────────────

def grille_reguliere(
    x_deb: float, x_fin: float, dx: float,
    y_deb: float, y_fin: float, dy: float,
) -> np.ndarray:
    """Grille régulière 2D — équivalent numpy du helper MATLAB ``grille2``.

    Produit cartésien des coordonnées ``x_deb:dx:x_fin`` et ``y_deb:dy:y_fin``.
    Ce helper n'a pas d'équivalent dans la librairie géostatistique (ce n'est
    qu'un générateur de grille) ; il fait partie de la configuration de
    l'exercice.

    Parameters
    ----------
    x_deb, x_fin, dx : float
        Début, fin (incluse) et pas en X.
    y_deb, y_fin, dy : float
        Début, fin (incluse) et pas en Y.

    Returns
    -------
    np.ndarray, shape ``(nx*ny, 2)``
        Coordonnées ``[x, y]`` des points de la grille (ordre : X varie le
        plus vite, comme ``grille2`` du MATLAB).
    """
    xs = np.arange(x_deb, x_fin + 1e-9, dx)
    ys = np.arange(y_deb, y_fin + 1e-9, dy)
    # MATLAB grille2 : X varie en premier (colonne 1), Y en second
    Y, X = np.meshgrid(ys, xs, indexing="ij")
    return np.column_stack([X.ravel(), Y.ravel()])


def grille_aleatoire_stratifie(
    nx: int, ny: int, dx: float, dy: float,
    rng: Optional[np.random.Generator] = None,
) -> np.ndarray:
    """Grille aléatoire stratifiée — portage de ``grilleAleatoireStratifie.m``.

    Pour chaque cellule régulière, un point est tiré uniformément à l'intérieur
    de la cellule : ``coin_inférieur + U(0, dx) × U(0, dy)``. C'est exactement
    la définition du helper MATLAB (``grille2(0, ...) + [rand*dx, rand*dy]``).

    Parameters
    ----------
    nx, ny : int
        Nombre de cellules en X et Y.
    dx, dy : float
        Dimensions d'une cellule.
    rng : np.random.Generator, optional
        Générateur aléatoire (reproductibilité).

    Returns
    -------
    np.ndarray, shape ``(nx*ny, 2)``
        Coordonnées ``[x, y]`` du semis stratifié.
    """
    if rng is None:
        rng = np.random.default_rng()
    base = grille_reguliere(0.0, nx * dx - 0.01, dx, 0.0, ny * dy - 0.01, dy)
    n = base.shape[0]
    jitter = np.column_stack([rng.random(n) * dx, rng.random(n) * dy])
    return base + jitter


def patrons_exercice(rng: Optional[np.random.Generator] = None) -> Dict[int, Dict]:
    """Construit les semis et grilles des 4 zones (source MATLAB Q2).

    Reproduit l'assemblage du script ``Q2_VarEstimation.m`` : les 4 zones sont
    disposées en quadrants, avec les décalages (offsets) d'origine du MATLAB.

    Parameters
    ----------
    rng : np.random.Generator, optional
        Générateur aléatoire pour les zones stratifiées.

    Returns
    -------
    dict
        ``{numero_zone: {points, lignes_grille_x, lignes_grille_y, label,
        offset}}`` — ``points`` est le semis ``(n, 2)`` translaté à sa position.
    """
    if rng is None:
        rng = np.random.default_rng(0)
    z1, z2, z3, z4 = (_ZONES[i] for i in (1, 2, 3, 4))
    # Offsets des quadrants (cf. script MATLAB)
    offx = z1["nx"] * z1["dx"]    # largeur de la colonne de gauche
    offy = z1["ny"] * z1["dy"]    # hauteur de la rangée du bas
    offsets = {1: (0.0, 0.0), 2: (offx, 0.0), 3: (0.0, offy), 4: (offx, offy)}

    out: Dict[int, Dict] = {}
    for num in (1, 2, 3, 4):
        z = _ZONES[num]
        ox, oy = offsets[num]
        if z["patron"] == "stratifie":
            pts = grille_aleatoire_stratifie(z["nx"], z["ny"], z["dx"], z["dy"], rng)
        else:
            pts = grille_reguliere(
                z["dx"] / 2.0, z["nx"] * z["dx"] - 0.01, z["dx"],
                z["dy"] / 2.0, z["ny"] * z["dy"] - 0.01, z["dy"],
            )
        pts = pts + np.array([ox, oy])
        # Lignes de grille (limites des cellules) pour la mise en page
        lignes_x = np.arange(0, z["nx"] * z["dx"] + 1e-9, z["dx"]) + ox
        lignes_y = np.arange(0, z["ny"] * z["dy"] + 1e-9, z["dy"]) + oy
        out[num] = {
            "points": pts, "lignes_grille_x": lignes_x,
            "lignes_grille_y": lignes_y, "label": z["label"], "offset": (ox, oy),
        }
    return out


def carte_patrons_echantillonnage(
    rng_seed: int = 0,
    path: Optional[str] = None,
) -> Tuple[plt.Figure, plt.Axes, Dict]:
    """Carte des 4 patrons d'échantillonnage (calque MATLAB Q2).

    Reproduit la figure « Portion de la mine de Zn » de ``Q2_VarEstimation.m`` :
    les quatre zones (grille stratifiée, grille dense, grille étirée, grille
    stratifiée fine) tracées côte à côte avec leurs lignes de grille.

    Parameters
    ----------
    rng_seed : int
        Graine pour les semis stratifiés (reproductibilité).
    path : str, optional
        Chemin d'enregistrement de la figure.

    Returns
    -------
    (fig, ax, patrons)
    """
    rng = np.random.default_rng(rng_seed)
    patrons = patrons_exercice(rng)

    fig, ax = plt.subplots(figsize=(9, 8))
    for num in (1, 2, 3, 4):
        p = patrons[num]
        # Lignes de grille
        gx, gy = p["lignes_grille_x"], p["lignes_grille_y"]
        for xv in gx:
            ax.plot([xv, xv], [gy[0], gy[-1]], "k-", lw=0.5, alpha=0.5)
        for yv in gy:
            ax.plot([gx[0], gx[-1]], [yv, yv], "k-", lw=0.5, alpha=0.5)
        # Semis
        pts = p["points"]
        ax.plot(pts[:, 0], pts[:, 1], "+k", markersize=8, markeredgewidth=1.5)

    # Cadre extérieur du panneau (comme le MATLAB)
    z1, z2, z3 = _ZONES[1], _ZONES[2], _ZONES[3]
    largeur = z1["nx"] * z1["dx"] + z2["nx"] * z2["dx"]
    hauteur = z1["ny"] * z1["dy"] + z3["ny"] * z3["dy"]
    ax.plot([0, largeur, largeur, 0, 0], [0, 0, hauteur, hauteur, 0],
            "k-", lw=2)
    ax.plot([z1["nx"] * z1["dx"], z1["nx"] * z1["dx"]], [0, hauteur],
            "k-", lw=2)
    ax.plot([0, largeur], [z1["ny"] * z1["dy"], z1["ny"] * z1["dy"]],
            "k-", lw=2)

    ax.set_xlabel("Coord. X (m)")
    ax.set_ylabel("Coord. Y (m)")
    ax.set_title("Portion de la mine de Zn — patrons d'échantillonnage")
    ax.set_aspect("equal")
    _enregistrer(fig, path)
    return fig, ax, patrons


def variance_estimation_patrons(
    portee: float = 80.0,
    palier: float = 1.0,
    pepite: float = 0.0,
    modele: str = "spherique",
    rng_seed: int = 0,
) -> Dict[int, Dict]:
    """Variance d'estimation théorique pour chaque patron (réutilise la librairie).

    Pour chaque zone, on calcule une variance de bloc/d'estimation
    représentative à l'aide de
    :func:`geostat_polymtl.block_variance.quadrature.variance_bloc_quadrature`
    sur le support de la zone. Cela permet de comparer numériquement la qualité
    des patrons (densité, anisotropie) — but pédagogique de l'exercice Q2.

    Parameters
    ----------
    portee : float
        Portée pratique du modèle de covariance.
    palier : float
        Palier (variance ponctuelle).
    pepite : float
        Effet de pépite (non utilisé par la quadrature continue ; informatif).
    modele : str
        Modèle de covariance ({"spherique", "exponentiel", "gaussien"}).
    rng_seed : int
        Graine pour les semis stratifiés.

    Returns
    -------
    dict
        ``{numero_zone: {label, n_points, support, var_bloc}}``.
    """
    rng = np.random.default_rng(rng_seed)
    patrons = patrons_exercice(rng)
    out: Dict[int, Dict] = {}
    for num in (1, 2, 3, 4):
        z = _ZONES[num]
        p = patrons[num]
        lx = float(z["nx"] * z["dx"])
        ly = float(z["ny"] * z["dy"])
        var_bloc, *_ = variance_bloc_quadrature(
            "surface", lx=lx, ly=ly, lz=0.0,
            palier=float(palier),
            ax=float(portee), ay=float(portee), az=float(portee),
            modele=modele, n_points=6,
        )
        out[num] = {
            "label": z["label"],
            "n_points": int(p["points"].shape[0]),
            "support": (lx, ly),
            "var_bloc": float(var_bloc),
        }
    return out

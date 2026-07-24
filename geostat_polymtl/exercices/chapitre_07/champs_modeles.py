"""Générateurs de figures — chapitre 07 (variogramme) : association
modèle ↔ champ simulé.

Version Python du script MATLAB d'examen
``6-Variogramme/Q3_IdentificationVisuelle.m`` (exercice **C7a-5** :
« associer 9 modèles de variogramme à 9 champs simulés »).

L'exercice présente une planche 3×3 de **champs simulés** (mélangés) et une
liste de **9 modèles de covariance** ; l'étudiant doit relier chaque image au
bon modèle (effet pépite, type sphérique/gaussien, isotrope/anisotrope,
portées, paliers).

Tous les champs sont simulés par FFT-MA (:func:`GFFTMA`), en RÉUTILISANT le
même moteur de simulation que la librairie ; aucune réimplémentation. Les
paramètres (modèles, portées, paliers, pépites, ``seed``) sont repris tels
quels du MATLAB.

Convention de modèle (Marcotte, identique à ``covar_nu`` / ``GFFTMA``) :
    ``[type, portée_x, portée_y, angle]`` avec les codes
    1 = pépite, 2 = exponentiel, 3 = gaussien, 4 = sphérique.

Chaque générateur retourne ``(fig, axes, infos)`` et accepte un argument
``path`` optionnel pour enregistrer la figure (PNG).
"""
from __future__ import annotations

from typing import Dict, List, Optional, Tuple

import numpy as np
import matplotlib.pyplot as plt

# --- Réutilisation de la librairie (AUCUNE réimplémentation) ------------------
from geostat_polymtl.simulation_methods.GFFTMA import GFFTMA


# ── Jeux de modèles de l'exercice (source MATLAB Q3_IdentificationVisuelle) ───
# Chaque entrée : (description, model (r×4), c (r,)).
# Codes : 1=pépite, 3=gaussien, 4=sphérique. Format Marcotte [type, ax, ay, angle].
#
# NB : le MATLAB encode la « pépite pure » (Z5) par un sphérique de portée
# minuscule (0.001) ; on le conserve tel quel pour la fidélité numérique.

# Jeu 1 — on joue sur les TYPES (pépite, sphérique, gaussien ; iso/aniso)
_MODELES_TYPES: List[Tuple[str, np.ndarray, np.ndarray]] = [
    ("Sphérique isotrope (a=80, C=10)",
     np.array([[4, 80, 80, 0]], float), np.array([10.0])),
    ("Pépite + Sphérique isotrope (C0=3, a=80, C=7)",
     np.array([[1, 0, 0, 0], [4, 80, 80, 0]], float), np.array([3.0, 7.0])),
    ("Pépite + Sphérique anisotrope (C0=3, a=80/40, 45°, C=7)",
     np.array([[1, 0, 0, 0], [4, 80, 40, 45]], float), np.array([3.0, 7.0])),
    ("Sphérique anisotrope (a=80/40, 45°, C=10)",
     np.array([[4, 80, 40, 45]], float), np.array([10.0])),
    ("Pépite pure (C0=10)",
     np.array([[4, 0.001, 0.001, 0]], float), np.array([10.0])),
    ("Gaussien isotrope (a=80, C=10)",
     np.array([[3, 80 / np.sqrt(3), 80 / np.sqrt(3), 0]], float),
     np.array([10.0])),
    ("Gaussien anisotrope (a=80/40, 135°, C=10)",
     np.array([[3, 80 / np.sqrt(3), 40 / np.sqrt(3), 135]], float),
     np.array([10.0])),
    ("Pépite + Gaussien anisotrope (C0=3, a=80/40, 135°, C=7)",
     np.array([[1, 0, 0, 0], [3, 80 / np.sqrt(3), 40 / np.sqrt(3), 135]], float),
     np.array([3.0, 7.0])),
    ("Sphérique aniso (45°) + Gaussien aniso (135°), C=5+5",
     np.array([[4, 80, 40, 45], [3, 80 / np.sqrt(3), 40 / np.sqrt(3), 135]], float),
     np.array([5.0, 5.0])),
]

# Jeu 2 — on joue sur les PORTÉES (tous sphériques, C=10)
_MODELES_PORTEES: List[Tuple[str, np.ndarray, np.ndarray]] = [
    ("Sphérique isotrope a=250",
     np.array([[4, 250, 250, 0]], float), np.array([10.0])),
    ("Sphérique isotrope a=100",
     np.array([[4, 100, 100, 0]], float), np.array([10.0])),
    ("Sphérique isotrope a=20",
     np.array([[4, 20, 20, 0]], float), np.array([10.0])),
    ("Sphérique aniso a=250/100, 45°",
     np.array([[4, 250, 100, 45]], float), np.array([10.0])),
    ("Sphérique aniso a=250/20, 45°",
     np.array([[4, 250, 20, 45]], float), np.array([10.0])),
    ("Sphérique aniso a=100/20, 45°",
     np.array([[4, 100, 20, 45]], float), np.array([10.0])),
    ("Sphérique aniso a=250/100, 135°",
     np.array([[4, 250, 100, 135]], float), np.array([10.0])),
    ("Sphérique aniso a=250/20, 135°",
     np.array([[4, 250, 20, 135]], float), np.array([10.0])),
    ("Sphérique aniso a=100/20, 135°",
     np.array([[4, 100, 20, 135]], float), np.array([10.0])),
]

# Ordre de mélange figé du MATLAB : ii=[6,5,9,7,4,3,1,8,2] (indices 1-based)
_ORDRE_MATLAB = np.array([6, 5, 9, 7, 4, 3, 1, 8, 2]) - 1  # → 0-based


def _enregistrer(fig, path: Optional[str]) -> None:
    """Enregistre la figure si un chemin est fourni."""
    if path:
        fig.savefig(path, dpi=150, bbox_inches="tight")


def _taille_paire(model: np.ndarray, n: int, d: float, axis: int = 0) -> int:
    """Taille de grille corrigée pour la parité interne de ``GFFTMA``.

    ``GFFTMA`` construit sa grille étendue, PAR AXE,
    ``N_dim = ceil(2*portée_max[dim]/d) + n`` et utilise ``np.arange`` ;
    lorsque ``N_dim`` est IMPAIR, ``arange`` produit ``N_dim-1`` points et le
    ``reshape`` échoue (limitation de la primitive). On incrémente ``n`` de 1
    si nécessaire pour que ``N_dim`` soit pair ; le champ est ensuite recadré
    au ``n`` demandé. NE corrige PAS la librairie — simple choix de géométrie
    sûre côté appelant.

    Le ``axis`` (0 = x → ``row[1]``, 1 = y → ``row[2]``) doit correspondre à
    l'axe dont on calcule la taille, car ``GFFTMA`` dimensionne chaque axe
    avec SA propre portée (anisotropie).
    """
    model = np.atleast_2d(np.asarray(model, dtype=float))
    col = 1 + int(axis)  # portée de l'axe demandé dans le format Marcotte
    portee_max = 0.0
    for row in model:
        if int(row[0]) != 1:  # ignore la pépite
            portee_max = max(portee_max, float(row[col]))
    pad = int(np.ceil(2.0 * portee_max / float(d)))
    return int(n) + (1 if (pad + int(n)) % 2 else 0)


def _simuler_champ(
    model: np.ndarray,
    c: np.ndarray,
    seed: int,
    nx: int,
    dx: float,
    ny: int,
    dy: float,
) -> np.ndarray:
    """Simule un champ 2D par FFT-MA (réutilise :func:`GFFTMA`).

    ``GFFTMA`` attend les structures au format LMC (listes imbriquées) ;
    pour une seule variable (p=1) on enveloppe ``model``/``c`` dans
    ``[[ ... ]]`` et ``nu`` à ``[[None]]``.

    Contournement de parité (bug GFFTMA, voir
    :func:`geostat_polymtl.exercices.chapitre_07.champs_modeles._taille_paire`)
    : on ajuste ``nx``/``ny`` pour que la grille FFT interne soit de taille
    paire, puis on recadre au format demandé. On ne réimplémente PAS la
    simulation ; on appelle GFFTMA avec une géométrie sûre.
    """
    model = np.atleast_2d(np.asarray(model, dtype=float))
    nx_s = _taille_paire(model, nx, dx, axis=0)
    ny_s = _taille_paire(model, ny, dy, axis=1)
    model_lmc = [[model]]
    c_lmc = [[np.asarray(c, dtype=float)]]
    nu_lmc = [[None]]
    datasim, _, _ = GFFTMA(
        model_lmc, c_lmc, nu_lmc, seed=int(seed), nbsimul=1,
        nx=int(nx_s), dx=float(dx), ny=int(ny_s), dy=float(dy),
    )
    champ = datasim[:, 0, 0].reshape(int(nx_s), int(ny_s))
    return champ[:int(nx), :int(ny)]


def planche_association(
    jeu: str = "types",
    seed: int = 1520,
    nx: int = 400,
    dx: float = 1.0,
    melanger: bool = True,
    rng_melange: Optional[int] = None,
    cmap: str = "gray",
    path: Optional[str] = None,
) -> Tuple[plt.Figure, np.ndarray, Dict]:
    """Planche 3×3 de champs simulés à associer aux 9 modèles (C7a-5).

    Reproduit ``Q3_IdentificationVisuelle.m`` : 9 champs FFT-MA affichés en
    grille 3×3 et numérotés 1–9 ; le tableau ``modeles`` donne la liste des
    modèles de covariance, et ``solution`` la correspondance figure → modèle.

    Parameters
    ----------
    jeu : {'types', 'portees'}
        ``'types'`` (figure 1 du MATLAB) fait varier le type de structure
        (pépite, sphérique, gaussien ; iso/aniso) ;
        ``'portees'`` (figure 2) fait varier les portées (tous sphériques).
    seed : int
        Graine FFT-MA (1520 dans la source).
    nx, dx : int, float
        Taille et pas de la grille carrée (400, 1.0 dans la source).
    melanger : bool
        Si ``True``, applique le mélange ``ii=[6,5,9,7,4,3,1,8,2]`` du MATLAB
        (sauf si ``rng_melange`` est fourni, voir ci-dessous).
    rng_melange : int, optional
        Si fourni, tire un mélange ALÉATOIRE des associations (pour produire
        des variantes d'énoncé). Sinon on garde l'ordre figé du MATLAB.
    cmap : str
        Palette (``'gray'`` comme le MATLAB).
    path : str, optional
        Chemin d'enregistrement PNG.

    Returns
    -------
    fig : matplotlib Figure
    axes : (3, 3) ndarray d'Axes
    infos : dict
        ``modeles`` : liste des 9 descriptions de modèle (indices 1–9) ;
        ``solution`` : dict {numéro_figure (1–9) → indice_modèle (1–9)} ;
        ``ordre`` : permutation appliquée (0-based).
    """
    if jeu == "types":
        modeles = _MODELES_TYPES
    elif jeu == "portees":
        modeles = _MODELES_PORTEES
    else:
        raise ValueError("jeu doit être 'types' ou 'portees'.")

    # Ordre d'affichage des modèles dans la grille (mélange)
    if not melanger:
        ordre = np.arange(9)
    elif rng_melange is not None:
        gen = np.random.default_rng(int(rng_melange))
        ordre = gen.permutation(9)
    else:
        ordre = _ORDRE_MATLAB.copy()

    fig, axes = plt.subplots(3, 3, figsize=(9, 9))
    for pos in range(9):
        i_modele = int(ordre[pos])
        desc, model, c = modeles[i_modele]
        champ = _simuler_champ(model, c, seed, nx, dx, nx, dx)
        ax = axes.flat[pos]
        ax.imshow(champ, cmap=cmap, origin="lower", aspect="equal")
        ax.text(0.04, 0.92, str(pos + 1), transform=ax.transAxes,
                fontsize=18, fontweight="bold", color="white",
                ha="left", va="top")
        ax.set_xticks([])
        ax.set_yticks([])

    titre = ("Associez chaque champ (1–9) à son modèle — "
             + ("variation des TYPES" if jeu == "types" else "variation des PORTÉES"))
    fig.suptitle(titre, fontsize=12)
    fig.tight_layout(rect=(0, 0, 1, 0.97))

    # Solution : figure (1-based) → indice de modèle (1-based)
    solution = {pos + 1: int(ordre[pos]) + 1 for pos in range(9)}
    infos = {
        "modeles": [m[0] for m in modeles],
        "solution": solution,
        "ordre": ordre,
        "jeu": jeu,
    }
    _enregistrer(fig, path)
    return fig, axes, infos


def liste_modeles(jeu: str = "types") -> List[str]:
    """Liste ordonnée (1–9) des descriptions de modèles pour l'énoncé.

    Parameters
    ----------
    jeu : {'types', 'portees'}

    Returns
    -------
    list of str
        Descriptions des 9 modèles (indices 1–9), à présenter à l'étudiant.
    """
    if jeu == "types":
        return [m[0] for m in _MODELES_TYPES]
    if jeu == "portees":
        return [m[0] for m in _MODELES_PORTEES]
    raise ValueError("jeu doit être 'types' ou 'portees'.")

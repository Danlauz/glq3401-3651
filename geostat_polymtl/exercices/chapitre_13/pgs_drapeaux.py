"""Générateurs de figures — chapitre 13 (simulation catégorielle) :
**simulation plurigaussienne (PGS)**, drapeaux + réalisations (CP3-Q7).

Portage Python du script MATLAB d'examen
``Exercices/Examen/CP3/Code_Examen/12-PGS/`` (``ExercicePGS.m``,
``Liste_Drapeau.m``, ``PGS.m``, ``WorkpLace.m``).

Exercice (CP3-Q7 « PGS ou multipoint ») : on présente une planche de
**drapeaux** (diagrammes de partition du plan ``(F(Z₁), F(Z₂))``) et une
planche de **réalisations catégorielles** (mélangées) ; l'étudiant doit
associer chaque réalisation au bon drapeau. Deux jeux de champs latents sont
fournis :

* **isotrope** — deux gaussiennes isotropes (drapeaux « lus » directement) ;
* **anisotrope SO-NE 45°** — au moins une gaussienne anisotrope orientée
  SO-NE (azimut 45° au sens Marcotte), qui étire les faciès selon cette
  direction.

RÉUTILISATION DE LA LIBRAIRIE
-----------------------------
* :func:`geostat_polymtl.simulation_methods.GFFTMA.GFFTMA` simule les **champs
  gaussiens latents** ``Z₁`` et ``Z₂`` (aucune réimplémentation de FFT-MA).

CODE NEUF (strictement le nécessaire)
-------------------------------------
Le « drapeau » MATLAB est une partition RECTANGULAIRE ARBITRAIRE du carré
unité ``(F(Z₁), F(Z₂)) ∈ [0,1]²`` (espace uniforme via ``Φ``), où les
rectangles peuvent se RECOUVRIR : l'affectation se fait par superposition (un
faciès d'indice supérieur écrase les précédents), exactement comme
``inpolygon`` enchaîné dans le MATLAB. La primitive de la librairie
:func:`geostat_polymtl.categorical.PGS.partition_rectangulaire` ne gère que des
bandes horizontales/verticales ou une partition en « L » et travaille dans
l'espace gaussien (seuils), donc elle ne couvre PAS ces drapeaux quelconques.
On écrit donc ici : (i) la bibliothèque de drapeaux reprise de
``Liste_Drapeau.m``, (ii) l'affectation par superposition de rectangles, (iii)
la mise en page et le mélange des associations.

Convention de modèle (Marcotte, identique à ``covar_nu`` / ``GFFTMA``) :
    ``[type, portée_x, portée_y, angle]``.
    ⚠️ Les codes de TYPE diffèrent entre ``covardm`` (MATLAB) et ``covar_nu``
    (librairie) : le **cubique** est le type **6** dans le MATLAB mais le type
    **5** dans la librairie (où 6 = penta). Les drapeaux du MATLAB utilisent
    des cubiques (6) ; ils sont donc remappés en type 5 ci-dessous.

Chaque générateur retourne ``(fig, axes, infos)`` et accepte un argument
``path`` optionnel pour enregistrer la figure (PNG).
"""
from __future__ import annotations

from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np
import matplotlib.pyplot as plt
from matplotlib.colors import ListedColormap, BoundaryNorm
from scipy.stats import norm

# --- Réutilisation de la librairie (AUCUNE réimplémentation) ------------------
from geostat_polymtl.simulation_methods.GFFTMA import GFFTMA


# ─────────────────────────────────────────────────────────────────────────────
# Bibliothèque de drapeaux (reprise de Liste_Drapeau.m)
#
# Chaque drapeau est une liste de rectangles ``(facies_id, (u1_min, u2_min),
# (u1_max, u2_max))`` dans l'espace uniforme ``(F(Z₁), F(Z₂)) ∈ [0,1]²``.
# Les rectangles sont appliqués DANS L'ORDRE : un faciès d'indice supérieur
# écrase un faciès déjà posé (superposition « inpolygon » du MATLAB).
# ─────────────────────────────────────────────────────────────────────────────
Rectangle = Tuple[int, Tuple[float, float], Tuple[float, float]]

DRAPEAUX: Dict[int, List[Rectangle]] = {
    # Drapeau 1 — quatre bandes verticales + bandeau supérieur (F4 en haut)
    1: [
        (1, (0.0, 0.0), (1.0 / 3, 3.0 / 4)),
        (2, (1.0 / 3, 0.0), (2.0 / 3, 3.0 / 4)),
        (3, (2.0 / 3, 0.0), (1.0, 3.0 / 4)),
        (4, (0.0, 3.0 / 4), (1.0, 1.0)),
    ],
    # Drapeau 2 — colonne F1, puis bande haute F2, et deux blocs bas
    2: [
        (1, (0.0, 0.0), (1.0 / 4, 1.0)),
        (2, (1.0 / 4, 2.0 / 3), (1.0, 1.0)),
        (3, (1.0 / 4, 0.0), (5.0 / 8, 2.0 / 3)),
        (4, (5.0 / 8, 0.0), (1.0, 2.0 / 3)),
    ],
    # Drapeau 3 — colonne F1, bande haute F2, deux bandes intermédiaires
    3: [
        (1, (0.0, 0.0), (1.0 / 4, 1.0)),
        (2, (1.0 / 4, 2.0 / 3), (1.0, 1.0)),
        (3, (1.0 / 4, 1.0 / 3), (1.0, 2.0 / 3)),
        (4, (1.0 / 4, 0.0), (1.0, 1.0 / 3)),
    ],
    # Drapeau 4 — quatre quadrants
    4: [
        (1, (0.0, 0.0), (0.5, 0.5)),
        (2, (0.0, 0.5), (0.5, 1.0)),
        (3, (0.5, 0.5), (1.0, 1.0)),
        (4, (0.5, 0.0), (1.0, 0.5)),
    ],
    # Drapeau 5 — TGS pur sur Z₁ (quatre bandes verticales) : F(Z₂) sans effet
    5: [
        (1, (0.0, 0.0), (0.25, 1.0)),
        (2, (0.25, 0.0), (0.5, 1.0)),
        (3, (0.5, 0.0), (0.75, 1.0)),
        (4, (0.75, 0.0), (1.0, 1.0)),
    ],
    # Drapeau 6 — TGS pur sur Z₂ (quatre bandes horizontales) : F(Z₁) sans effet
    6: [
        (1, (0.0, 0.0), (1.0, 0.25)),
        (2, (0.0, 0.25), (1.0, 0.5)),
        (3, (0.0, 0.5), (1.0, 0.75)),
        (4, (0.0, 0.75), (1.0, 1.0)),
    ],
    # Drapeau 7 — deux colonnes + un bloc coupé en deux à droite
    7: [
        (1, (0.0, 0.0), (1.0 / 4, 1.0)),
        (2, (1.0 / 4, 0.0), (1.0 / 2, 1.0)),
        (3, (1.0 / 2, 0.0), (1.0, 1.0 / 2)),
        (4, (1.0 / 2, 1.0 / 2), (1.0, 1.0)),
    ],
    # Drapeau 8 — fond F1 + ilots F2/F3/F4 (recouvrements)
    8: [
        (1, (0.0, 0.0), (1.0, 1.0)),
        (2, (0.0, 0.0), (0.4, 0.625)),
        (3, (0.6, 0.0), (1.0, 0.625)),
        (4, (0.1, 0.6875), (0.9, 1.0)),
    ],
    # Drapeau 9 — anneaux concentriques (fond + boites emboitées)
    9: [
        (1, (0.0, 0.0), (1.0, 1.0)),
        (2, (0.067, 0.067), (0.933, 0.933)),
        (3, (0.1465, 0.1465), (0.8536, 0.8536)),
        (4, (1.0 / 4, 1.0 / 4), (3.0 / 4, 3.0 / 4)),
    ],
    # Drapeau 10 — trois bandes verticales + ilot central F4 (WorkpLace.m)
    10: [
        (1, (0.0, 0.0), (1.0 / 4, 1.0)),
        (2, (1.0 / 4, 0.0), (1.0 / 2, 1.0)),
        (3, (1.0 / 2, 0.0), (1.0, 1.0)),
        (4, (0.60, 0.2), (0.90, 0.8)),
    ],
}

# ── Modèles latents (Marcotte ; cubique MATLAB 6 → librairie 5) ──────────────
# Jeu ISOTROPE : deux cubiques isotropes (WorkpLace.m model{1}=[6 75 75 0]).
MODELE_ISO_Z1: np.ndarray = np.array([[5, 75, 75, 0]], float)
MODELE_ISO_Z2: np.ndarray = np.array([[5, 90, 90, 0]], float)
# Jeu ANISOTROPE SO-NE 45° : Z₂ cubique anisotrope orienté à 45° (azimut Marcotte
# SO-NE). On garde Z₁ isotrope pour isoler l'effet d'anisotropie.
MODELE_ANISO_Z1: np.ndarray = np.array([[5, 75, 75, 0]], float)
MODELE_ANISO_Z2: np.ndarray = np.array([[5, 200, 50, 45]], float)

# Palette catégorielle (4 faciès) ; fond clair → foncé, lisible en N&B.
_COULEURS_FACIES = ["#fde725", "#5ec962", "#21918c", "#3b528b"]


# ─────────────────────────────────────────────────────────────────────────────
# Utilitaires
# ─────────────────────────────────────────────────────────────────────────────
def _enregistrer(fig, path: Optional[str]) -> None:
    """Enregistre la figure si un chemin est fourni."""
    if path:
        fig.savefig(path, dpi=150, bbox_inches="tight")


def _taille_paire(model: np.ndarray, n: int, d: float, axis: int = 0) -> int:
    """Taille de grille corrigée pour la parité interne de ``GFFTMA``.

    ⚠️ BUG CONNU ``GFFTMA`` : la grille FFT étendue par axe vaut
    ``N_dim = ceil(2·portée_max[dim]/d) + n`` et est balayée par ``np.arange`` ;
    si ``N_dim`` est IMPAIR, ``arange`` rend ``N_dim-1`` points et le ``reshape``
    plante. On incrémente ``n`` de 1 au besoin pour rendre ``N_dim`` PAIR, puis
    on recadre au ``n`` demandé. On ne corrige PAS la librairie : on choisit une
    géométrie sûre côté appelant (cf. chapitre 07).
    """
    model = np.atleast_2d(np.asarray(model, dtype=float))
    col = 1 + int(axis)
    portee_max = 0.0
    for row in model:
        if int(row[0]) != 1:  # ignore la pépite
            portee_max = max(portee_max, float(row[col]))
    pad = int(np.ceil(2.0 * portee_max / float(d)))
    return int(n) + (1 if (pad + int(n)) % 2 else 0)


def simuler_gaussien_latent(
    model: np.ndarray,
    seed: int,
    nx: int = 200,
    dx: float = 1.0,
    ny: Optional[int] = None,
    dy: Optional[float] = None,
    palier: float = 1.0,
) -> np.ndarray:
    """Simule un champ gaussien latent 2D standardisé (réutilise ``GFFTMA``).

    ``GFFTMA`` attend les structures au format LMC (listes imbriquées) ;
    pour une seule variable (p=1) on enveloppe ``model``/``c`` dans ``[[…]]``
    et ``nu`` à ``[[None]]``. Le contournement de parité ``_taille_paire`` est
    appliqué (cf. bug GFFTMA documenté ci-dessus).

    Returns
    -------
    champ : (nx, ny) array
        Champ gaussien (≈ N(0,1)) prêt à être transformé en ``F(Z)=Φ(Z)``.
    """
    if ny is None:
        ny = nx
    if dy is None:
        dy = dx
    model = np.atleast_2d(np.asarray(model, dtype=float))
    nx_s = _taille_paire(model, nx, dx, axis=0)
    ny_s = _taille_paire(model, ny, dy, axis=1)
    model_lmc = [[model]]
    c_lmc = [[np.array([float(palier)])]]
    nu_lmc = [[None]]
    datasim, _, _ = GFFTMA(
        model_lmc, c_lmc, nu_lmc, seed=int(seed), nbsimul=1,
        nx=int(nx_s), dx=float(dx), ny=int(ny_s), dy=float(dy),
    )
    champ = datasim[:, 0, 0].reshape(int(nx_s), int(ny_s))
    return champ[:int(nx), :int(ny)]


def appliquer_drapeau(
    fg1: np.ndarray,
    fg2: np.ndarray,
    rectangles: Sequence[Rectangle],
) -> np.ndarray:
    """Affecte un faciès à chaque point selon un drapeau (espace ``F(Z)``).

    Reproduit fidèlement l'enchaînement ``inpolygon`` du MATLAB : on parcourt
    les rectangles DANS L'ORDRE et chaque rectangle écrase l'affectation
    précédente sur son emprise (superposition).

    Parameters
    ----------
    fg1, fg2 : arrays
        Champs uniformisés ``F(Z₁)=Φ(Z₁)`` et ``F(Z₂)=Φ(Z₂)`` (∈ [0,1]).
    rectangles : séquence de ``(facies_id, (u1_min, u2_min), (u1_max, u2_max))``.

    Returns
    -------
    facies : int array (même forme que ``fg1``), étiquettes 1..K.
    """
    fg1 = np.asarray(fg1, dtype=float)
    fg2 = np.asarray(fg2, dtype=float)
    facies = np.zeros(fg1.shape, dtype=int)
    for fid, (u1_min, u2_min), (u1_max, u2_max) in rectangles:
        mask = (
            (fg1 >= u1_min) & (fg1 <= u1_max) &
            (fg2 >= u2_min) & (fg2 <= u2_max)
        )
        facies[mask] = int(fid)
    facies[facies == 0] = 1  # bords/coins non couverts → faciès de fond
    return facies


def realisation_pgs(
    index_drapeau: int,
    jeu: str = "iso",
    seed: int = 915,
    nx: int = 200,
    dx: float = 1.0,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Simule une réalisation PGS pour un drapeau donné (CP3-Q7).

    Parameters
    ----------
    index_drapeau : int
        Clé dans :data:`DRAPEAUX` (1..10).
    jeu : {'iso', 'aniso'}
        ``'iso'`` : deux gaussiennes isotropes.
        ``'aniso'`` : Z₂ anisotrope orienté SO-NE 45°.
    seed : int
    nx, dx : int, float
        Taille et pas de la grille carrée.

    Returns
    -------
    facies : (nx, nx) int array (étiquettes 1..K).
    z1, z2 : (nx, nx) arrays — champs gaussiens latents (pour inspection).
    """
    if index_drapeau not in DRAPEAUX:
        raise KeyError(f"drapeau {index_drapeau} inconnu (dispo : {sorted(DRAPEAUX)})")
    if jeu == "iso":
        m1, m2 = MODELE_ISO_Z1, MODELE_ISO_Z2
    elif jeu == "aniso":
        m1, m2 = MODELE_ANISO_Z1, MODELE_ANISO_Z2
    else:
        raise ValueError("jeu doit etre 'iso' ou 'aniso'")
    # Deux germes distincts → champs latents indépendants (comme le MATLAB).
    z1 = simuler_gaussien_latent(m1, seed=seed, nx=nx, dx=dx)
    z2 = simuler_gaussien_latent(m2, seed=seed + 1000, nx=nx, dx=dx)
    fg1 = norm.cdf(z1)
    fg2 = norm.cdf(z2)
    facies = appliquer_drapeau(fg1, fg2, DRAPEAUX[index_drapeau])
    return facies, z1, z2


# ─────────────────────────────────────────────────────────────────────────────
# Figures
# ─────────────────────────────────────────────────────────────────────────────
def figure_drapeau(
    index_drapeau: int,
    ax: Optional[plt.Axes] = None,
    titre: Optional[str] = None,
    path: Optional[str] = None,
) -> Tuple[plt.Figure, plt.Axes]:
    """Trace UN drapeau (diagramme de partition de ``(F(Z₁), F(Z₂))``).

    Reproduit la figure ``index+100`` de ``Liste_Drapeau.m`` : rectangles
    bordés de noir, étiquetés ``F1..F4``, dans le carré unité.
    """
    rectangles = DRAPEAUX[index_drapeau]
    if ax is None:
        fig, ax = plt.subplots(figsize=(4, 4))
    else:
        fig = ax.figure
    for fid, (u1_min, u2_min), (u1_max, u2_max) in rectangles:
        xs = [u1_min, u1_min, u1_max, u1_max, u1_min]
        ys = [u2_min, u2_max, u2_max, u2_min, u2_min]
        ax.plot(xs, ys, "-k", linewidth=2)
        ax.text(u1_min + 0.02, u2_max - 0.06, f"F{fid}", fontsize=13)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.set_aspect("equal")
    ax.set_xlabel(r"$F(Z_1)$", fontsize=12)
    ax.set_ylabel(r"$F(Z_2)$", fontsize=12)
    ax.set_title(titre if titre is not None else f"Drapeau {index_drapeau}")
    _enregistrer(fig, path)
    return fig, ax


def _cmap_facies(k: int) -> Tuple[ListedColormap, BoundaryNorm]:
    """Palette + norme discrètes pour k faciès (étiquettes 1..k)."""
    couleurs = _COULEURS_FACIES[:k]
    cmap = ListedColormap(couleurs)
    bornes = np.arange(0.5, k + 1.5, 1.0)
    return cmap, BoundaryNorm(bornes, cmap.N)


def figure_realisation(
    facies: np.ndarray,
    ax: Optional[plt.Axes] = None,
    titre: Optional[str] = None,
    cmap: Optional[ListedColormap] = None,
    path: Optional[str] = None,
) -> Tuple[plt.Figure, plt.Axes]:
    """Affiche une réalisation catégorielle (carte des faciès)."""
    facies = np.asarray(facies)
    k = int(facies.max())
    if cmap is None:
        cmap, norm_ = _cmap_facies(k)
    else:
        _, norm_ = _cmap_facies(k)
    if ax is None:
        fig, ax = plt.subplots(figsize=(4, 4))
    else:
        fig = ax.figure
    ax.imshow(facies.T, origin="lower", cmap=cmap, norm=norm_,
              interpolation="nearest")
    ax.set_xlabel("Coord. x", fontsize=11)
    ax.set_ylabel("Coord. y", fontsize=11)
    if titre is not None:
        ax.set_title(titre)
    ax.set_xticks([])
    ax.set_yticks([])
    _enregistrer(fig, path)
    return fig, ax


def planche_association_pgs(
    indices: Sequence[int] = (1, 2, 4, 7, 8, 10),
    jeu: str = "iso",
    seed: int = 915,
    nx: int = 200,
    dx: float = 1.0,
    melanger: bool = True,
    rng_melange: Optional[int] = 7,
    path_drapeaux: Optional[str] = None,
    path_realisations: Optional[str] = None,
) -> Tuple[plt.Figure, plt.Figure, Dict]:
    """Planche d'association PGS (CP3-Q7) : drapeaux ↔ réalisations.

    Produit DEUX figures :

    * une planche de **drapeaux** (numérotés D1, D2, … dans l'ordre donné) ;
    * une planche de **réalisations** mélangées (numérotées R1, R2, …) ;

    et un dictionnaire ``infos`` contenant la **solution** (réalisation →
    drapeau) ainsi que les proportions de faciès observées.

    Parameters
    ----------
    indices : séquence d'int
        Drapeaux à inclure (clés de :data:`DRAPEAUX`).
    jeu : {'iso', 'aniso'}
        Jeu de champs latents (isotrope, ou anisotrope SO-NE 45°).
    seed : int
    nx, dx : int, float
        Géométrie de la grille.
    melanger : bool
        Mélange l'ordre des réalisations (énoncé d'association).
    rng_melange : int, optional
        Graine du mélange aléatoire (reproductible). Si ``None`` et
        ``melanger=True``, mélange non reproductible.
    path_drapeaux, path_realisations : str, optional
        Chemins d'enregistrement PNG des deux planches.

    Returns
    -------
    fig_drapeaux, fig_realisations : matplotlib Figures.
    infos : dict avec clés ``'indices'``, ``'jeu'``, ``'ordre_realisations'``,
        ``'solution'`` (R# → D#) et ``'proportions'``.
    """
    indices = list(indices)
    n = len(indices)

    # Simulation des réalisations (une par drapeau)
    realisations: List[np.ndarray] = []
    proportions: List[List[float]] = []
    for idx in indices:
        facies, _, _ = realisation_pgs(idx, jeu=jeu, seed=seed, nx=nx, dx=dx)
        realisations.append(facies)
        k = int(facies.max())
        proportions.append([float((facies == f).mean()) for f in range(1, k + 1)])

    # Mélange des réalisations (les drapeaux restent dans l'ordre 1..n)
    ordre = np.arange(n)
    if melanger:
        rng = np.random.default_rng(rng_melange)
        ordre = rng.permutation(n)

    ncols = int(np.ceil(np.sqrt(n)))
    nrows = int(np.ceil(n / ncols))

    # Planche des drapeaux (libellés D1..Dn dans l'ordre des indices)
    fig_d, axes_d = plt.subplots(nrows, ncols, figsize=(3 * ncols, 3 * nrows))
    axes_d = np.atleast_1d(axes_d).ravel()
    for j, idx in enumerate(indices):
        figure_drapeau(idx, ax=axes_d[j], titre=f"Drapeau D{j + 1}")
    for ax in axes_d[n:]:
        ax.axis("off")
    fig_d.tight_layout()
    _enregistrer(fig_d, path_drapeaux)

    # Planche des réalisations mélangées (libellés R1..Rn)
    fig_r, axes_r = plt.subplots(nrows, ncols, figsize=(3 * ncols, 3 * nrows))
    axes_r = np.atleast_1d(axes_r).ravel()
    solution: Dict[str, str] = {}
    for pos, k in enumerate(ordre):
        figure_realisation(realisations[k], ax=axes_r[pos],
                           titre=f"Réalisation R{pos + 1}")
        solution[f"R{pos + 1}"] = f"D{k + 1}"
    for ax in axes_r[n:]:
        ax.axis("off")
    fig_r.tight_layout()
    _enregistrer(fig_r, path_realisations)

    infos = {
        "indices": indices,
        "jeu": jeu,
        "ordre_realisations": ordre.tolist(),
        "solution": solution,
        "proportions": proportions,
    }
    return fig_d, fig_r, infos

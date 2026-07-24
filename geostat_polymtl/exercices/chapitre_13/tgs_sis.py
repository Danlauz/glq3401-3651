"""Générateurs de figures — chapitre 13 (simulation catégorielle) :
**gaussienne tronquée (TGS)** et **simulation séquentielle d'indicatrices
(SIS)** (CP3-Q4/Q8 « association visuelle SGI et TGS »).

Exercice : on présente des **réalisations catégorielles** (TGS, et l'analogue
indicatrices SIS) à associer aux **proportions** demandées, et on demande de
LIRE les seuils ``s_k = Φ⁻¹(p₁+…+p_k)`` qui découpent le champ gaussien en
faciès. La TGS partitionne un SEUL champ gaussien ``Z`` standardisé par des
seuils croissants ; les proportions globales fixent ces seuils.

RÉUTILISATION DE LA LIBRAIRIE
-----------------------------
* :func:`geostat_polymtl.categorical.truncated_gaussian.seuils_depuis_proportions`
  et :func:`…truncated_gaussian.champ_a_facies` (seuils ``Φ⁻¹`` et troncation).
* :func:`geostat_polymtl.simulation_methods.GFFTMA.GFFTMA` pour le champ
  gaussien latent (via :func:`…pgs_drapeaux.simuler_gaussien_latent`).
* :func:`geostat_polymtl.categorical.SIS.SIS_grille` pour la SIS (voir réserve
  ci-dessous).

CODE NEUF (strictement le nécessaire)
-------------------------------------
Paramètres (proportions, modèles latents), mise en page, annotation des seuils,
mélange des associations.

⚠️ RÉSERVE SUR ``SIS_grille`` (primitive de la librairie)
---------------------------------------------------------
Sur de petites grilles pédagogiques, ``SIS_grille`` collapse en pratique vers
UN SEUL faciès (le krigeage d'indicatrices d'un champ épars + la correction
d'ordre poussent toute la masse sur un faciès). On EXPOSE quand même la
fonction d'enrobage :func:`realisation_sis`, mais elle est marquée comme peu
fiable visuellement ; pour l'**association visuelle** (texture catégorielle à
relier à des proportions/seuils) on s'appuie sur la TGS, qui est exacte et
stable. Aucun contournement silencieux n'est ajouté à ``SIS_grille``.

Chaque générateur retourne ``(fig, axes/dict)`` et accepte un ``path``
optionnel pour enregistrer la figure (PNG).
"""
from __future__ import annotations

import warnings
from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np
import matplotlib.pyplot as plt
from matplotlib.colors import ListedColormap, BoundaryNorm
from scipy.stats import norm

# --- Réutilisation de la librairie (AUCUNE réimplémentation) ------------------
from geostat_polymtl.categorical.truncated_gaussian import (
    seuils_depuis_proportions,
    champ_a_facies,
)
from geostat_polymtl.categorical.SIS import SIS_grille
from geostat_polymtl.exercices.chapitre_13.pgs_drapeaux import (
    simuler_gaussien_latent,
    figure_realisation,
    _cmap_facies,
    _enregistrer,
)


# ── Jeux de proportions de l'exercice (CP3-Q8) ───────────────────────────────
# Chaque entrée : (étiquette, proportions globales p_k, somme = 1).
JEUX_PROPORTIONS: Dict[str, List[float]] = {
    "quartiles": [0.25, 0.25, 0.25, 0.25],
    "decroissant": [0.50, 0.30, 0.15, 0.05],
    "croissant": [0.05, 0.15, 0.30, 0.50],
    "dominant_central": [0.15, 0.35, 0.35, 0.15],
    "trois_facies": [0.50, 0.30, 0.20],
}

# Modèle latent par défaut pour la TGS : cubique isotrope (Marcotte type 5),
# portée modérée → faciès en plages cohérentes.
MODELE_TGS: np.ndarray = np.array([[5, 50, 50, 0]], float)


def proportions_vers_seuils(proportions: Sequence[float]) -> np.ndarray:
    """Seuils ``s_k = Φ⁻¹(p₁+…+p_k)`` d'une TGS (réutilise la librairie).

    Enveloppe directe de
    :func:`geostat_polymtl.categorical.truncated_gaussian.seuils_depuis_proportions`.

    Returns
    -------
    seuils : (K-1,) array — seuils croissants dans l'espace gaussien.
    """
    return seuils_depuis_proportions(proportions)


def realisation_tgs(
    proportions: Sequence[float],
    seed: int = 915,
    nx: int = 200,
    dx: float = 1.0,
    model: Optional[np.ndarray] = None,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Simule une réalisation TGS (un champ gaussien tronqué).

    Parameters
    ----------
    proportions : (K,) séquence (somme = 1).
    seed : int
    nx, dx : int, float — géométrie de la grille carrée.
    model : (r,4) array, optional — modèle latent Marcotte (défaut
        :data:`MODELE_TGS`).

    Returns
    -------
    facies : (nx, nx) int array (1..K).
    z : (nx, nx) array — champ gaussien latent standardisé.
    seuils : (K-1,) array — seuils ``Φ⁻¹`` utilisés.
    """
    if model is None:
        model = MODELE_TGS
    z = simuler_gaussien_latent(model, seed=seed, nx=nx, dx=dx)
    seuils = seuils_depuis_proportions(proportions)
    facies = champ_a_facies(z.ravel(), proportions).reshape(z.shape)
    return facies, z, seuils


def realisation_sis(
    proportions: Sequence[float],
    structures: Optional[Sequence[Dict]] = None,
    N: int = 60,
    seed: int = 42,
    pepite: float = 0.0,
    nk: int = 12,
) -> np.ndarray:
    """Réalisation SIS (réutilise ``SIS_grille``) — peu fiable visuellement.

    ⚠️ Voir la réserve du module : sur petites grilles ``SIS_grille`` tend à
    collapser sur un seul faciès. Fonction conservée pour complétude / mise en
    évidence du comportement ; un ``UserWarning`` est émis si la réalisation
    est dégénérée (un seul faciès présent). Pour l'association visuelle, on
    privilégie la TGS.

    Parameters
    ----------
    proportions : (K,) séquence.
    structures : séquence de dict au format des wrappers de krigeage, p.ex.
        ``[{"modele": "spherique", "portee": 12.0, "palier": 1.0}]``
        (clés ``'modele'``/``'portee'``/``'palier'``). Défaut : sphérique
        portée ``N/4``.
    N : int — côté de la grille.
    seed, pepite, nk : voir ``SIS_grille``.

    Returns
    -------
    facies : (N, N) int array (1..K).
    """
    if structures is None:
        structures = [{"modele": "spherique", "portee": N / 4.0, "palier": 1.0}]
    facies = SIS_grille(proportions, structures, N=N, seed=seed,
                        pepite=pepite, nk=nk).reshape(N, N)
    if np.unique(facies).size < 2:
        warnings.warn(
            "SIS_grille a produit une realisation degeneree (un seul facies) : "
            "limitation connue de la primitive sur petites grilles ; "
            "utiliser la TGS pour l'association visuelle.",
            UserWarning,
            stacklevel=2,
        )
    return facies


# ─────────────────────────────────────────────────────────────────────────────
# Figures
# ─────────────────────────────────────────────────────────────────────────────
def figure_tgs_seuils(
    proportions: Sequence[float],
    seed: int = 915,
    nx: int = 200,
    dx: float = 1.0,
    model: Optional[np.ndarray] = None,
    path: Optional[str] = None,
) -> Tuple[plt.Figure, np.ndarray, Dict]:
    """Figure pédagogique TGS : champ gaussien + seuils + réalisation (CP3-Q8).

    Trois panneaux :

    1. carte du **champ gaussien latent** ``Z`` ;
    2. **histogramme** de ``Z`` avec les seuils ``s_k = Φ⁻¹(·)`` et les
       proportions cumulées annotées ;
    3. **réalisation TGS** (carte des faciès).

    Returns
    -------
    fig : matplotlib Figure.
    axes : (3,) array d'axes.
    infos : dict avec ``'seuils'``, ``'proportions'``,
        ``'proportions_observees'``.
    """
    facies, z, seuils = realisation_tgs(proportions, seed=seed, nx=nx, dx=dx,
                                        model=model)
    K = len(proportions)
    fig, axes = plt.subplots(1, 3, figsize=(13, 4))

    # 1. Champ gaussien latent
    im = axes[0].imshow(z.T, origin="lower", cmap="gray", interpolation="nearest")
    axes[0].set_title(r"Champ gaussien latent $Z$")
    axes[0].set_xticks([]); axes[0].set_yticks([])
    fig.colorbar(im, ax=axes[0], fraction=0.046, pad=0.04)

    # 2. Histogramme + seuils
    axes[1].hist(z.ravel(), bins=60, density=True, color="0.7",
                 edgecolor="none")
    xs = np.linspace(-4, 4, 400)
    axes[1].plot(xs, norm.pdf(xs), "k-", lw=1.2, label=r"$\mathcal{N}(0,1)$")
    cumul = np.cumsum(proportions[:-1])
    ymax = axes[1].get_ylim()[1]
    for i, (s_k, pc) in enumerate(zip(seuils, cumul)):
        axes[1].axvline(s_k, color="C3", lw=1.5)
        # On étage les hauteurs d'étiquettes pour éviter le chevauchement
        # quand des seuils voisins sont proches.
        y_txt = ymax * (0.95 - 0.16 * (i % 2))
        axes[1].text(s_k, y_txt,
                     rf"$s={s_k:.2f}$" + "\n" + rf"$\Phi={pc:.2f}$",
                     ha="center", va="top", fontsize=8, color="C3",
                     bbox=dict(boxstyle="round,pad=0.1", fc="white",
                               ec="none", alpha=0.7))
    axes[1].set_title("Seuils " + r"$s_k=\Phi^{-1}(\sum p)$")
    axes[1].set_xlabel(r"$Z$"); axes[1].set_xlim(-4, 4)
    axes[1].legend(fontsize=8, loc="upper left")

    # 3. Réalisation TGS
    figure_realisation(facies, ax=axes[2], titre="Réalisation TGS")

    fig.tight_layout()
    _enregistrer(fig, path)

    prop_obs = [float((facies == k).mean()) for k in range(1, K + 1)]
    infos = {
        "seuils": np.asarray(seuils),
        "proportions": list(proportions),
        "proportions_observees": prop_obs,
    }
    return fig, axes, infos


def planche_association_tgs(
    cles: Sequence[str] = ("quartiles", "decroissant", "croissant", "dominant_central"),
    seed: int = 915,
    nx: int = 200,
    dx: float = 1.0,
    melanger: bool = True,
    rng_melange: Optional[int] = 11,
    path: Optional[str] = None,
) -> Tuple[plt.Figure, Dict]:
    """Planche d'association TGS (CP3-Q8) : réalisations ↔ proportions/seuils.

    Affiche une grille de **réalisations TGS** mélangées (R1, R2, …) à associer
    aux jeux de **proportions** correspondants. ``infos['solution']`` donne la
    correspondance ``R# → clé`` et les seuils attendus pour chaque jeu.

    Parameters
    ----------
    cles : séquence de clés de :data:`JEUX_PROPORTIONS`.
    seed, nx, dx : géométrie / graine.
    melanger : bool — mélange l'ordre des réalisations.
    rng_melange : int, optional — graine reproductible du mélange.
    path : str, optional — enregistrement PNG.

    Returns
    -------
    fig : matplotlib Figure.
    infos : dict avec ``'cles'``, ``'ordre'``, ``'solution'`` (R# → clé),
        ``'seuils_par_cle'`` et ``'proportions_par_cle'``.
    """
    cles = list(cles)
    n = len(cles)

    realisations: List[np.ndarray] = []
    seuils_par_cle: Dict[str, np.ndarray] = {}
    for c in cles:
        props = JEUX_PROPORTIONS[c]
        facies, _, seuils = realisation_tgs(props, seed=seed, nx=nx, dx=dx)
        realisations.append(facies)
        seuils_par_cle[c] = np.asarray(seuils)

    ordre = np.arange(n)
    if melanger:
        rng = np.random.default_rng(rng_melange)
        ordre = rng.permutation(n)

    ncols = int(np.ceil(np.sqrt(n)))
    nrows = int(np.ceil(n / ncols))
    fig, axes = plt.subplots(nrows, ncols, figsize=(3.2 * ncols, 3.2 * nrows))
    axes = np.atleast_1d(axes).ravel()
    solution: Dict[str, str] = {}
    for pos, k in enumerate(ordre):
        figure_realisation(realisations[k], ax=axes[pos],
                           titre=f"Réalisation R{pos + 1}")
        solution[f"R{pos + 1}"] = cles[k]
    for ax in axes[n:]:
        ax.axis("off")
    fig.tight_layout()
    _enregistrer(fig, path)

    infos = {
        "cles": cles,
        "ordre": ordre.tolist(),
        "solution": solution,
        "seuils_par_cle": seuils_par_cle,
        "proportions_par_cle": {c: JEUX_PROPORTIONS[c] for c in cles},
    }
    return fig, infos

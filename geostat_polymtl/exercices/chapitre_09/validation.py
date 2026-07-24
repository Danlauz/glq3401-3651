"""Voisinage, validation croisée et comparaison de krigeages (chapitre 9).

Portage Python des générateurs MATLAB du chapitre 9 portant sur le CHOIX DU
VOISINAGE et la VALIDATION CROISÉE :

- ``Q4_Voisinnage.m`` : deux profils de données (deux colonnes) sur une grille,
  krigées sur toute la grille ; on compare l'effet de la taille du voisinage
  (``nk``/``rad``) sur les cartes d'estimation et de variance, et on valide les
  modèles par validation croisée.
- ``Q5_ValidationCroisee.m`` : quatre stratégies de voisinage (tous les points,
  cercle R=Δ, cercle R=2Δ, ellipse anisotrope) comparées par leurs cartes
  d'estimation et de variance.
- ``Q6_ComparaisonKrigeage.m`` : comparaison de plusieurs modèles (profils 1D,
  cf. :mod:`profils_krigeage`) — ici on fournit la comparaison par validation
  croisée (SSE, erreur standardisée).

Tout le krigeage et la validation croisée sont délégués aux wrappers
:func:`geostat_polymtl.kriging.wrappers.krigeage_ordinaire` et
:func:`...validation_croisee`. Le champ support est simulé via
:func:`geostat_polymtl.exercices.chapitre_09.poids_ecran.champ_support_aniso`
(GFFTMA). Le voisinage limité utilise les arguments ``nk``/``rad`` de cokri.

Sources :
- ``Exercices/Examen/CP2/Code_Examen/8-Krigeage/Q4_Voisinnage.m``
- ``...Q5_ValidationCroisee.m``
- ``...Q6_ComparaisonKrigeage.m``
"""
from __future__ import annotations

from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np

from geostat_polymtl.kriging.wrappers import (
    krigeage_ordinaire,
    validation_croisee,
)
from geostat_polymtl.exercices.chapitre_09.poids_ecran import champ_support_aniso


# ---------------------------------------------------------------------------
# Q4 : effet de la taille du voisinage (nk / rad)
# ---------------------------------------------------------------------------

def figure_voisinage(
    N: int = 100,
    colonnes: Sequence[int] = (25, 75),
    nk: int = 50,
    rad: float = 100.0,
    pas_grille: int = 2,
    seed: int = 4575,
    path: Optional[str] = None,
) -> Tuple["object", "object", Dict]:
    """Cartes d'estimation et de variance pour un voisinage donné (Q4).

    Deux profils verticaux (colonnes) de données sont krigés (KO) sur la
    grille, avec un voisinage limité ``nk``/``rad``. On affiche le champ
    simulé, l'estimation et la variance, ce qui met en évidence les artefacts
    de voisinage (effet de bande quand ``nk`` est petit).

    Parameters
    ----------
    N : int
        Côté de la grille.
    colonnes : séquence d'int
        Indices des colonnes-profils de données (2 par défaut, comme le MATLAB).
    nk : int
        Nombre maximal de voisins (argument cokri ``nk``).
    rad : float
        Rayon de recherche (argument cokri ``rad``).
    pas_grille : int
        Pas d'échantillonnage de la grille d'estimation (pour la rapidité).
    seed : int
        Graine du champ simulé.
    path : str, optional
        Enregistre la figure.

    Returns
    -------
    (fig, axes, donnees)
        ``donnees`` : ``champ``, ``estimation``, ``variance``, ``coords_data``.
    """
    import matplotlib.pyplot as plt

    # Champ support penta anisotrope tourné (model=[6 100 40 45], c=1) comme Q4
    champ = champ_support_aniso(N, 6, 100, 40, 45, 1.0, seed)

    # Données : les colonnes complètes (profils verticaux)
    coords: List[List[float]] = []
    vals: List[float] = []
    for cidx in colonnes:
        for r in range(N):
            coords.append([cidx, r])
            vals.append(champ[int(cidx), r])
    coords = np.asarray(coords, dtype=float)
    vals = np.asarray(vals, dtype=float)

    # Grille d'estimation (sous-échantillonnée)
    gx = np.arange(0, N, pas_grille)
    gy = np.arange(0, N, pas_grille)
    GX, GY = np.meshgrid(gx, gy)
    cibles = np.column_stack([GX.ravel(), GY.ravel()])

    # Modèle de krigeage : sphérique anisotrope tourné (pédagogie)
    struct = [{"modele": "spherique", "portee": [100.0, 40.0],
               "palier": 1.0, "angle": 45.0}]
    res = krigeage_ordinaire(coords, vals, cibles, struct, nk=nk, rad=rad)

    est = res["estimations"].reshape(GY.shape)
    var = res["variances"].reshape(GY.shape)

    fig, axes = plt.subplots(1, 3, figsize=(15, 5))
    ext_full = [0, N, 0, N]
    ext_grid = [gx.min(), gx.max(), gy.min(), gy.max()]

    im0 = axes[0].imshow(champ.T, origin="lower", cmap="gray",
                         extent=ext_full, vmin=-3, vmax=3, aspect="auto")
    axes[0].set_title("Champ simulé")
    fig.colorbar(im0, ax=axes[0], shrink=0.8)

    im1 = axes[1].imshow(est, origin="lower", cmap="gray",
                         extent=ext_grid, vmin=-3, vmax=3, aspect="auto")
    axes[1].set_title(f"Estimation KO (nk={nk}, rad={rad:g})")
    fig.colorbar(im1, ax=axes[1], shrink=0.8)

    im2 = axes[2].imshow(var, origin="lower", cmap="viridis",
                         extent=ext_grid, aspect="auto")
    axes[2].set_title("Variance de krigeage")
    fig.colorbar(im2, ax=axes[2], shrink=0.8)

    # Trace les profils de données
    for ax in axes:
        for cidx in colonnes:
            ax.plot([cidx, cidx], [0, N], "r-", lw=1.5)
        ax.set_xlabel("x")
        ax.set_ylabel("y")

    fig.suptitle(f"Voisinage : {len(colonnes)} profils, nk={nk}, rad={rad:g}")
    fig.tight_layout()
    if path:
        fig.savefig(path, dpi=150, bbox_inches="tight")

    donnees = {
        "champ": champ,
        "estimation": est,
        "variance": var,
        "coords_data": coords,
        "nk": nk,
        "rad": rad,
    }
    return fig, axes, donnees


# ---------------------------------------------------------------------------
# Q5 : quatre stratégies de voisinage
# ---------------------------------------------------------------------------

def _selection_voisins(strategie: str, x0, coords, delta, ax, ay):
    """Sélection des voisins selon la stratégie (Q5). Renvoie les indices.

    S1 = tous, S2 = cercle R=Δ/2, S3 = cercle R=Δ, S4 = ellipse anisotrope.
    (Reprend ``local_select_neighbors`` du MATLAB.)
    """
    dx = coords[:, 0] - x0[0]
    dy = coords[:, 1] - x0[1]
    s = strategie.upper()
    if s == "S1":
        idx = np.arange(coords.shape[0])
    elif s == "S2":
        idx = np.where(dx**2 + dy**2 <= (0.5 * delta) ** 2)[0]
    elif s == "S3":
        idx = np.where(dx**2 + dy**2 <= delta**2)[0]
    elif s == "S4":
        rx, ry = ax / 2.0, ay / 2.0
        idx = np.where((dx / rx) ** 2 + (dy / ry) ** 2 <= 1.0)[0]
    else:
        idx = np.arange(coords.shape[0])
    return idx


def figure_strategies_voisinage(
    domaine_x: Tuple[float, float] = (0.0, 200.0),
    domaine_y: Tuple[float, float] = (0.0, 300.0),
    espacement_lignes: float = 100.0,
    espacement_stations: float = 10.0,
    pas_grille: float = 10.0,
    portee_x: float = 300.0,
    portee_y: float = 100.0,
    palier: float = 1.0,
    seed: int = 7,
    path: Optional[str] = None,
) -> Tuple["object", "object", Dict]:
    """Quatre stratégies de voisinage : cartes d'estimation et de variance (Q5).

    Données disposées en lignes N–S ; on krige (KO) sur une grille en
    restreignant le voisinage selon 4 stratégies (tous, cercle R=Δ/2, cercle
    R=Δ, ellipse anisotrope). Chaque ligne de la figure montre l'estimation et
    la variance d'une stratégie. Tout le krigeage est délégué à
    :func:`krigeage_ordinaire` (avec voisinage manuel par sélection d'indices).

    Returns
    -------
    (fig, axes, donnees)
    """
    import matplotlib.pyplot as plt

    rng = np.random.default_rng(seed)

    # Données (lignes N–S décalées de 50 en x)
    xs = np.arange(domaine_x[0] + 50, domaine_x[1] + 1e-9, espacement_lignes)
    ys = np.arange(domaine_y[0], domaine_y[1] + 1e-9, espacement_stations)
    coords = np.array([[x, y] for x in xs for y in ys], dtype=float)

    struct = [{"modele": "spherique", "portee": [portee_x, portee_y],
               "palier": palier, "angle": 0.0}]

    # Valeurs aux données : l'exercice Q5 compare l'EMPREINTE SPATIALE des
    # stratégies de voisinage (cartes de variance surtout), indépendante des
    # valeurs ; on utilise donc un simple bruit blanc reproductible.
    z_data = rng.standard_normal(len(coords))

    # Grille d'estimation
    gx = np.arange(domaine_x[0], domaine_x[1] + 1e-9, pas_grille)
    gy = np.arange(domaine_y[0], domaine_y[1] + 1e-9, pas_grille)
    GX, GY = np.meshgrid(gx, gy)
    cibles = np.column_stack([GX.ravel(), GY.ravel()])

    strategies = ["S1", "S2", "S3", "S4"]
    labels = ["S1 : tous", "S2 : R=Δ/2", "S3 : R=Δ", "S4 : ellipse aniso"]
    delta = espacement_lignes

    fig, axes = plt.subplots(4, 2, figsize=(11, 16))
    cartes = {}

    for s, (strat, lab) in enumerate(zip(strategies, labels)):
        est = np.full(cibles.shape[0], np.nan)
        var = np.full(cibles.shape[0], np.nan)
        for i, x0 in enumerate(cibles):
            idx = _selection_voisins(strat, x0, coords, delta, portee_x, portee_y)
            if idx.size == 0:
                continue
            r = krigeage_ordinaire(coords[idx], z_data[idx],
                                   x0.reshape(1, 2), struct)
            est[i] = r["estimations"][0]
            var[i] = r["variances"][0]
        Z = est.reshape(GY.shape)
        V = var.reshape(GY.shape)
        cartes[strat] = {"est": Z, "var": V}

        ext = [gx.min(), gx.max(), gy.min(), gy.max()]
        imz = axes[s, 0].imshow(Z, origin="lower", extent=ext, aspect="auto",
                                cmap="viridis")
        axes[s, 0].scatter(coords[:, 0], coords[:, 1], s=6, c="k")
        axes[s, 0].set_title(f"{lab} — Estimation")
        fig.colorbar(imz, ax=axes[s, 0], shrink=0.8)

        imv = axes[s, 1].imshow(V, origin="lower", extent=ext, aspect="auto",
                                cmap="magma")
        axes[s, 1].scatter(coords[:, 0], coords[:, 1], s=6, c="w")
        axes[s, 1].set_title(f"{lab} — Variance")
        fig.colorbar(imv, ax=axes[s, 1], shrink=0.8)

    for ax in axes.ravel():
        ax.set_xlabel("x (m)")
        ax.set_ylabel("y (m)")

    fig.suptitle("Comparaison de 4 stratégies de voisinage (KO)", fontsize=13)
    fig.tight_layout()
    if path:
        fig.savefig(path, dpi=150, bbox_inches="tight")

    donnees = {"cartes": cartes, "coords_data": coords}
    return fig, axes, donnees


# ---------------------------------------------------------------------------
# Q4 / Q6 : comparaison de modèles par validation croisée
# ---------------------------------------------------------------------------

def comparaison_validation_croisee(
    coords_data,
    valeurs,
    modeles: Sequence[Dict],
    type_kriging: str = "ordinaire",
    nk: Optional[int] = None,
    rad: Optional[float] = None,
) -> List[Dict]:
    """Compare plusieurs modèles par validation croisée (Q4 §validation).

    Pour chaque modèle, exécute :func:`validation_croisee` et calcule les
    statistiques de diagnostic (SSE, moyenne et moyenne des carrés des erreurs
    standardisées).

    Parameters
    ----------
    coords_data, valeurs : tableaux
        Points et valeurs.
    modeles : séquence de dict
        Chaque dict : ``nom``, ``structures``, ``pepite`` (optionnel).
    type_kriging, nk, rad : passés aux wrappers.

    Returns
    -------
    list of dict
        Pour chaque modèle : ``nom``, ``sse``, ``moyenne_e_std``,
        ``moyenne_e_std2`` (moyenne des erreurs standardisées au carré, idéal
        proche de 1), ``var_e_std``.
    """
    coords_data = np.asarray(coords_data, dtype=float)
    valeurs = np.asarray(valeurs, dtype=float)
    resultats = []
    for mod in modeles:
        vc = validation_croisee(
            coords_data, valeurs, mod["structures"],
            pepite=mod.get("pepite", 0.0), type_kriging=type_kriging,
            nk=nk, rad=rad,
        )
        e = vc["erreurs"]
        e_std = vc["erreurs_std"]
        resultats.append({
            "nom": mod.get("nom", "modèle"),
            "sse": float(np.sum(e**2)),
            "moyenne_e_std": float(np.mean(e_std)),
            "moyenne_e_std2": float(np.mean(e_std**2)),
            "var_e_std": float(vc["var_e_std"]),
        })
    return resultats


def figure_comparaison_modeles(
    N: int = 100,
    colonnes: Sequence[int] = (25, 75),
    seed: int = 4575,
    path: Optional[str] = None,
) -> Tuple["object", "object", Dict]:
    """Validation croisée comparant 3 modèles (Q4 : aniso / iso longue / iso courte).

    Sur les données des deux profils (Q4), compare par validation croisée trois
    modèles : sphérique anisotrope tourné, sphérique isotrope à grande portée,
    sphérique isotrope à courte portée. Affiche un diagramme à barres des
    diagnostics (SSE et moyenne des erreurs standardisées au carré).

    Returns
    -------
    (fig, ax, donnees)
        ``donnees['resultats']`` : liste de dicts de diagnostics.
    """
    import matplotlib.pyplot as plt

    champ = champ_support_aniso(N, 6, 100, 40, 45, 1.0, seed)
    coords: List[List[float]] = []
    vals: List[float] = []
    for cidx in colonnes:
        for r in range(N):
            coords.append([cidx, r])
            vals.append(champ[int(cidx), r])
    coords = np.asarray(coords, dtype=float)
    vals = np.asarray(vals, dtype=float)

    modeles = [
        {"nom": "Aniso 45° (100×40)",
         "structures": [{"modele": "spherique", "portee": [100.0, 40.0],
                         "palier": 1.0, "angle": 45.0}]},
        {"nom": "Iso a=100",
         "structures": [{"modele": "spherique", "portee": 100.0, "palier": 1.0}]},
        {"nom": "Iso a=25",
         "structures": [{"modele": "spherique", "portee": 25.0, "palier": 1.0}]},
    ]
    resultats = comparaison_validation_croisee(
        coords, vals, modeles, type_kriging="ordinaire", nk=50, rad=100.0
    )

    noms = [r["nom"] for r in resultats]
    estd2 = [r["moyenne_e_std2"] for r in resultats]
    sse = [r["sse"] for r in resultats]

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11, 4.5))
    ax1.bar(noms, estd2, color="#1f5fb5")
    ax1.axhline(1.0, color="r", ls="--", label="idéal = 1")
    ax1.set_ylabel(r"$\overline{(e_i/\sigma_i)^2}$")
    ax1.set_title("Erreur standardisée moyenne au carré")
    ax1.legend()
    ax1.tick_params(axis="x", rotation=20)

    ax2.bar(noms, sse, color="#2ca02c")
    ax2.set_ylabel("SSE")
    ax2.set_title("Somme des carrés des erreurs")
    ax2.tick_params(axis="x", rotation=20)

    fig.suptitle("Comparaison de modèles par validation croisée")
    fig.tight_layout()
    if path:
        fig.savefig(path, dpi=150, bbox_inches="tight")

    donnees = {"resultats": resultats}
    return fig, (ax1, ax2), donnees
# fin du module validation (chapitre 9)

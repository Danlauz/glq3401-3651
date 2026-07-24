"""Poids de krigeage, effet d'écran et détection d'anisotropie (chapitre 9).

Portage Python des générateurs MATLAB du chapitre 9 traitant des POIDS de
krigeage :

- ``Exemplepoidskrigeage.m`` et ``Q2_EffetDecran.m`` : on place des points
  autour d'une cible et on calcule les poids du krigeage simple (KS) et du
  krigeage ordinaire (KO) afin d'illustrer l'effet d'écran (un point « caché »
  derrière un autre reçoit un poids quasi nul, voire négatif).
- ``Q1_MatriceKrigeage.m`` : affichage de la matrice de krigeage [K | lambda | k].
- ``Q3_DetectionAnisoPoids.m`` : sur un champ simulé anisotrope, les poids de
  krigeage d'un patron régulier de points révèlent la direction d'anisotropie
  (les poids sont plus forts dans la direction de grande continuité).

Tout le krigeage est délégué aux wrappers
:func:`geostat_polymtl.kriging.wrappers.krigeage_simple` /
:func:`...krigeage_ordinaire` / :func:`...systeme_krigeage`. La simulation du
champ support (Q3) réutilise :func:`geostat_polymtl.simulation_methods.GFFTMA`
(modèle de covariance Marcotte anisotrope).

Sources :
- ``Exercices/Examen/CP2/Révision/Code_Images/Exemplepoidskrigeage.m``
- ``Exercices/Examen/CP2/Code_Examen/8-Krigeage/Q1_MatriceKrigeage.m``
- ``...Q2_EffetDecran.m``
- ``...Q3_DetectionAnisoPoids.m``
"""
from __future__ import annotations

from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np

from geostat_polymtl.kriging.wrappers import (
    krigeage_simple,
    krigeage_ordinaire,
    systeme_krigeage,
)


# ---------------------------------------------------------------------------
# Helper : champ support anisotrope via GFFTMA (modèle Marcotte)
# ---------------------------------------------------------------------------
# NOTE (primitive manquante) : le wrapper convivial
# ``simulation_methods.wrappers.simuler_gfftma`` est ISOTROPE et, surtout,
# plante quand ``nu=None`` (son défaut documenté) car ``GFFTMA.computeS`` fait
# ``nu[i][j]`` sur un None. On appelle donc ``GFFTMA`` directement, en lui
# passant un ``nu`` au bon format (tableau objet (1,1) de None). Ce helper ne
# réimplémente AUCUNE mathématique : il prépare seulement le modèle Marcotte
# anisotrope que ``GFFTMA`` attend. À remonter : ajouter le support
# anisotrope + le correctif ``nu=None`` au wrapper convivial.

# Codes Marcotte (cf. covar_nu.py) : 1=pépite, 2=expo, 3=gauss, 4=sphérique, 6=penta
_CODES = {"pepite": 1, "exponentiel": 2, "gaussien": 3, "spherique": 4, "penta": 6}


def champ_support_aniso(
    N: int,
    code: int,
    portee_x: float,
    portee_y: float,
    angle: float,
    palier: float,
    seed: int,
    pepite: float = 0.0,
) -> np.ndarray:
    """Champ gaussien 2D ``N x N`` via GFFTMA, modèle Marcotte anisotrope.

    Parameters
    ----------
    N : int
        Côté de la grille.
    code : int
        Code de structure Marcotte (4 = sphérique, 6 = penta, …).
    portee_x, portee_y : float
        Portées internes Marcotte (telles quelles, comme dans le MATLAB).
    angle : float
        Angle d'anisotropie (degrés).
    palier : float
        Palier de la structure.
    seed : int
        Graine (équivalent du 3e argument de ``FFTMA`` MATLAB).
    pepite : float, par défaut 0
        Effet de pépite éventuel.

    Returns
    -------
    np.ndarray ``(N, N)`` — la réalisation du champ.
    """
    from geostat_polymtl.simulation_methods.GFFTMA import GFFTMA

    rows: List[List[float]] = []
    paliers: List[float] = []
    if pepite > 0:
        rows.append([1, 1e-6, 1e-6, 0.0])
        paliers.append(float(pepite))
    rows.append([int(code), float(portee_x), float(portee_y), float(angle)])
    paliers.append(float(palier))

    model = np.empty((1, 1), dtype=object)
    model[0, 0] = np.asarray(rows, dtype=float)
    c = np.empty((1, 1), dtype=object)
    c[0, 0] = np.asarray(paliers, dtype=float)
    nu = np.empty((1, 1), dtype=object)
    nu[0, 0] = None

    pad = int(np.ceil(2 * max(portee_x, portee_y)))
    N_eff = N if (pad + N) % 2 == 0 else N + 1
    d, _, _ = GFFTMA(model, c, nu, seed=int(seed), nbsimul=1,
                     nx=N_eff, dx=1.0, ny=N_eff, dy=1.0)
    out = np.asarray(d[:, :, 0], dtype=float).reshape(N_eff, N_eff)
    return out[:N, :N]


# ---------------------------------------------------------------------------
# Q1 / Exemplepoidskrigeage / Q2 : poids KS / KO autour d'une cible
# ---------------------------------------------------------------------------

# Configurations de points reprises des sources MATLAB.
CONFIG_Q1 = {
    "x": [[10, 10], [18, 15], [8, 11], [13, 12]],
    "x0": [15, 15],
    "structures": [{"modele": "exponentiel", "portee": 25.0, "palier": 5.75}],
    "pepite": 1.25,
    "titre": "Matrice de krigeage (Q1)",
}

CONFIG_EXEMPLE = {
    "x": [[-15, -5], [-18, 10], [15, -5], [5, -10], [8, -12], [-2, 2], [4, 4]],
    "x0": [0, 0],
    "structures": [{"modele": "spherique", "portee": 10.0, "palier": 5.0}],
    "pepite": 1.0,
    "titre": "Poids de krigeage — sphérique isotrope a=10",
}

CONFIG_Q2 = {
    "x": [[-4, 0], [-2, 0], [0, 3], [0, -1], [0, -2], [4, 0], [-4, -4]],
    "x0": [0, 0],
    "structures": [{"modele": "spherique", "portee": 4.0, "palier": 5.0}],
    "pepite": 1.0,
    "titre": "Effet d'écran (Q2)",
}


def poids_krigeage(
    config: Dict,
) -> Dict:
    """Calcule les poids KS et KO pour une configuration de points.

    Délègue à :func:`krigeage_simple` / :func:`krigeage_ordinaire`. Les valeurs
    aux données sont nulles (on ne s'intéresse qu'aux POIDS, pas à
    l'estimation).

    Returns
    -------
    dict : ``lambda_ks``, ``lambda_ko``, ``mu_ko``, ``somme_ks``, ``somme_ko``,
    ``matrice_A``, ``vecteur_b``, ``variance_ks``, ``variance_ko``.
    """
    x = np.asarray(config["x"], dtype=float)
    x0 = np.asarray([config["x0"]], dtype=float)
    z = np.zeros(len(x))
    st = config["structures"]
    pep = config.get("pepite", 0.0)

    rks = krigeage_simple(x, z, x0, st, pepite=pep)
    rko = krigeage_ordinaire(x, z, x0, st, pepite=pep)
    return {
        "lambda_ks": rks["lambda"],
        "lambda_ko": rko["lambda"],
        "mu_ko": rko["mu"],
        "somme_ks": float(np.sum(rks["lambda"])),
        "somme_ko": float(np.sum(rko["lambda"])),
        "matrice_A": rko["matrice_A"],
        "vecteur_b": rko["vecteur_b"],
        "variance_ks": float(rks["variances"][0]),
        "variance_ko": float(rko["variances"][0]),
    }


def figure_poids_krigeage(
    config: Optional[Dict] = None,
    type_kriging: str = "ordinaire",
    path: Optional[str] = None,
) -> Tuple["object", "object", Dict]:
    """Carte des points + cible avec les poids de krigeage annotés.

    Reproduit la figure de ``Exemplepoidskrigeage.m`` / ``Q2_EffetDecran.m`` :
    points connus (noirs), cible (rouge), chaque point étiqueté par son poids.

    Parameters
    ----------
    config : dict, optional
        Configuration (cf. :data:`CONFIG_EXEMPLE`, :data:`CONFIG_Q2`,
        :data:`CONFIG_Q1`) ; défaut = :data:`CONFIG_EXEMPLE`.
    type_kriging : {"simple", "ordinaire"}
        Poids affichés (KS ou KO).
    path : str, optional
        Enregistre la figure.

    Returns
    -------
    (fig, ax, donnees)
    """
    import matplotlib.pyplot as plt

    if config is None:
        config = CONFIG_EXEMPLE
    res = poids_krigeage(config)
    x = np.asarray(config["x"], dtype=float)
    x0 = np.asarray(config["x0"], dtype=float)
    lam = res["lambda_ks"] if type_kriging == "simple" else res["lambda_ko"]
    somme = res["somme_ks"] if type_kriging == "simple" else res["somme_ko"]

    fig, ax = plt.subplots(figsize=(6.5, 6.5))
    # Couleur des points proportionnelle au poids (rouge = négatif = écran)
    sc = ax.scatter(x[:, 0], x[:, 1], c=lam, s=160, cmap="coolwarm",
                    edgecolor="k", linewidths=1.0, zorder=2,
                    vmin=-max(abs(lam.min()), abs(lam.max())),
                    vmax=max(abs(lam.min()), abs(lam.max())))
    ax.scatter([x0[0]], [x0[1]], marker="s", s=220, facecolor="none",
               edgecolor="red", linewidths=2.0, zorder=3, label="Cible $x_0$")
    for i, (xi, yi) in enumerate(x):
        ax.annotate(f"$x_{{{i+1}}}$\n{lam[i]:.2f}",
                    (xi, yi), textcoords="offset points",
                    xytext=(8, 6), fontsize=9)
    cb = fig.colorbar(sc, ax=ax, shrink=0.85)
    cb.set_label("Poids $\\lambda_i$")
    ax.set_xlabel("Coord. x")
    ax.set_ylabel("Coord. y")
    nom = "KS" if type_kriging == "simple" else "KO"
    ax.set_title(f"{config.get('titre', 'Poids de krigeage')}\n"
                 f"{nom} : $\\sum\\lambda_i$ = {somme:.3f}")
    ax.set_aspect("equal", adjustable="box")
    ax.grid(True, ls="--", alpha=0.5)
    ax.legend(loc="best")
    fig.tight_layout()
    if path:
        fig.savefig(path, dpi=150, bbox_inches="tight")

    donnees = {**res, "type_kriging": type_kriging}
    return fig, ax, donnees


def figure_matrice_krigeage(
    config: Optional[Dict] = None,
    path: Optional[str] = None,
) -> Tuple["object", "object", Dict]:
    """Affiche la matrice de krigeage augmentée [K | lambda | k] (Q1).

    Reprend ``Q1_MatriceKrigeage.m`` : on construit le système via
    :func:`systeme_krigeage` (qui délègue à ``cokri``) et on affiche la matrice
    A, le vecteur b et les poids dans un tableau matriciel.

    Returns
    -------
    (fig, ax, donnees)
        ``donnees`` : ``matrice_A``, ``vecteur_b``, ``lambda``, ``mu``.
    """
    import matplotlib.pyplot as plt

    if config is None:
        config = CONFIG_Q1
    x = np.asarray(config["x"], dtype=float)
    x0 = np.asarray([config["x0"]], dtype=float)
    z = np.zeros(len(x))
    res = systeme_krigeage(x, z, x0, config["structures"],
                           pepite=config.get("pepite", 0.0),
                           type_kriging="ordinaire")

    A = np.asarray(res["matrice_A"], dtype=float)
    b = np.asarray(res["vecteur_b"], dtype=float).reshape(-1, 1)
    lam = np.asarray(res["lambda"], dtype=float)
    mu = np.asarray(res["mu"], dtype=float)
    lam_aug = np.concatenate([lam, mu]).reshape(-1, 1)

    # Tableau matriciel [A | lambda | b]
    bloc = np.hstack([A, lam_aug, b])

    fig, ax = plt.subplots(figsize=(1.1 * bloc.shape[1] + 1, 1.0 * bloc.shape[0] + 1))
    ax.axis("off")
    n = A.shape[0]
    cell_text = [[f"{v:.3f}" for v in row] for row in bloc]
    col_labels = [f"A{j+1}" for j in range(n)] + ["lambda", "b"]
    tbl = ax.table(cellText=cell_text, colLabels=col_labels,
                   loc="center", cellLoc="center")
    tbl.auto_set_font_size(False)
    tbl.set_fontsize(9)
    tbl.scale(1, 1.4)
    ax.set_title(config.get("titre", "Matrice de krigeage [A | λ | b]"))
    fig.tight_layout()
    if path:
        fig.savefig(path, dpi=150, bbox_inches="tight")

    donnees = {
        "matrice_A": A,
        "vecteur_b": b.ravel(),
        "lambda": lam,
        "mu": mu,
    }
    return fig, ax, donnees


# ---------------------------------------------------------------------------
# Q3 : détection d'anisotropie via les poids de krigeage
# ---------------------------------------------------------------------------

# Modèles de Q3_DetectionAnisoPoids.m : [code, range_x, range_y, angle], c, seed
CONFIG_Q3 = [
    {"model": [4, 100, 100, 0], "c": 15.0, "seed": 145,
     "titre": "Isotrope (a=100)"},
    {"model": [4, 25, 100, 0], "c": 15.0, "seed": 145,
     "titre": "Anisotrope (25 x 100, 0°)"},
    {"model": [4, 25, 100, 10], "c": 15.0, "seed": 145,
     "titre": "Anisotrope tournée (25 x 100, 10°)"},
]


def figure_anisotropie_poids(
    id_config: int = 1,
    pas_patron: int = 40,
    decalage: int = 20,
    N: int = 160,
    path: Optional[str] = None,
) -> Tuple["object", "object", Dict]:
    """Détection d'anisotropie via les poids de krigeage (Q3).

    Sur un champ simulé (GFFTMA, modèle anisotrope), on krige le point central
    à partir d'un patron régulier de points voisins, et on annote chaque
    voisin par son poids. Les poids les plus forts trahissent la direction de
    grande continuité (anisotropie).

    Parameters
    ----------
    id_config : int (1..3)
        Choix du modèle de Q3 (cf. :data:`CONFIG_Q3`).
    pas_patron : int
        Espacement du patron de points voisins (en pixels).
    decalage : int
        Décalage du patron par rapport au bord (comme ``grille2(20,...,40)``).
    N : int
        Côté de la grille du champ.
    path : str, optional
        Enregistre la figure.

    Returns
    -------
    (fig, ax, donnees)
        ``donnees`` : ``poids``, ``variance``, ``coords`` (centrées), ``modele``.
    """
    import matplotlib.pyplot as plt

    cfg = CONFIG_Q3[id_config - 1]
    code, rx, ry, ang = cfg["model"]
    champ = champ_support_aniso(N, code, rx, ry, ang, cfg["c"], cfg["seed"])

    centre = N // 2
    # Patron régulier de voisins (grille décalée), cible = centre
    axes_pos = np.arange(decalage, N, pas_patron)
    coords = np.array([[i, j] for j in axes_pos for i in axes_pos], dtype=float)
    # Retire un point trop proche du centre s'il coïncide
    coords = coords[~np.all(np.isclose(coords, [centre, centre]), axis=1)]
    vals = np.array([champ[int(i), int(j)] for i, j in coords], dtype=float)
    cible = np.array([[centre, centre]], dtype=float)

    # Modèle de krigeage = même structure anisotrope (sphérique)
    struct = [{"modele": "spherique",
               "portee": [float(rx), float(ry)],
               "palier": float(cfg["c"]),
               "angle": float(ang)}]
    res = systeme_krigeage(coords, vals, cible, struct, type_kriging="ordinaire")
    poids = np.asarray(res["lambda"], dtype=float)
    var = float(res["variances"][0])

    # Coordonnées centrées (comme le MATLAB : x0(pos,2)-80, x0(pos,1)-80)
    cc = coords - centre

    fig, ax = plt.subplots(figsize=(7, 7))
    sc = ax.scatter(cc[:, 0], cc[:, 1], c=poids, s=150, cmap="viridis",
                    edgecolor="k", linewidths=0.8, zorder=2)
    ax.scatter([0], [0], marker="s", s=240, facecolor="none",
               edgecolor="k", linewidths=2.0, zorder=3, label="Cible")
    for (xi, yi), w in zip(cc, poids):
        ax.annotate(f"{w:.2f}", (xi, yi), textcoords="offset points",
                    xytext=(6, 6), fontsize=8)
    cb = fig.colorbar(sc, ax=ax, shrink=0.85)
    cb.set_label("Poids $\\lambda_i$")
    ax.set_xlabel("Coord. x")
    ax.set_ylabel("Coord. y")
    ax.set_title(f"Détection d'anisotropie par les poids — {cfg['titre']}\n"
                 f"$\\sigma_{{KO}}^2$ = {var:.3f}")
    ax.set_aspect("equal", adjustable="box")
    ax.grid(True, ls="--", alpha=0.5)
    ax.legend(loc="upper right")
    fig.tight_layout()
    if path:
        fig.savefig(path, dpi=150, bbox_inches="tight")

    donnees = {
        "poids": poids,
        "variance": var,
        "coords": cc,
        "modele": cfg["titre"],
    }
    return fig, ax, donnees

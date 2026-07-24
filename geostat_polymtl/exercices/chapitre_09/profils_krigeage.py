"""Profils de krigeage 1D — modèle de covariance à associer (chapitre 9).

Portage Python des exercices « profil de krigeage 1D » du chapitre 9
(figures C9-13 du manuel et générateur MATLAB ``Q6_ComparaisonKrigeage.m``).

Idée pédagogique : on dispose de quelques points connus le long d'une ligne
et on calcule le profil de krigeage ordinaire ``Z_KO(x)`` ainsi que la variance
``sigma_KO^2(x)`` sur une grille fine. La FORME du profil (lissage, dépassement,
discontinuité à la pépite, retour à la moyenne) trahit le modèle de covariance
utilisé : l'étudiant doit associer chaque profil au bon modèle.

Tout le krigeage est délégué à
:func:`geostat_polymtl.kriging.wrappers.krigeage_ordinaire` ; ce module n'ajoute
que les jeux de données / modèles de la source MATLAB, la mise en page des
profils et le mélange (shuffle) des associations pour l'exercice à trous.

Source : ``Exercices/Examen/CP2/Code_Examen/8-Krigeage/Q6_ComparaisonKrigeage.m``
"""
from __future__ import annotations

from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np

from geostat_polymtl.kriging.wrappers import krigeage_ordinaire


# ---------------------------------------------------------------------------
# Jeux de données et modèles repris textuellement du MATLAB (Q6)
# ---------------------------------------------------------------------------

# data{1..3} de Q6_ComparaisonKrigeage.m : (x0, Z0)
JEUX_DONNEES: List[Dict] = [
    {"x": [10, 30, 50, 70, 90], "z": [1, 4, 4, 2, 3]},
    {"x": [5, 25, 45, 65, 85], "z": [2, 5, 3, 4, 2]},
    {"x": [0, 20, 40, 60, 80, 100], "z": [3, 2, 4, 5, 3, 1]},
]

# model{1..8} / c{1..8} de Q6. La portée MATLAB est déjà la portée interne de
# covardm : pour exponentiel/gaussien la source divise par 3 / sqrt(3). Comme
# nos wrappers attendent la PORTÉE PRATIQUE 95 %, on stocke ici la portée
# pratique (= portée du sphérique, = 120 ou 20 pour expo/gauss avant division).
MODELES_Q6: List[Dict] = [
    # model{1} = [4 120]      c=50          -> sphérique portée 120, palier 50
    {"nom": "Sphérique a=120",
     "structures": [{"modele": "spherique", "portee": 120.0, "palier": 50.0}],
     "pepite": 0.0},
    # model{2} = [4 20]       c=20
    {"nom": "Sphérique a=20",
     "structures": [{"modele": "spherique", "portee": 20.0, "palier": 20.0}],
     "pepite": 0.0},
    # model{3} = [1 0; 4 120]  c=[10;10]    -> pépite 10 + sphérique a=120 c=10
    {"nom": "Pépite 10 + Sphérique a=120",
     "structures": [{"modele": "spherique", "portee": 120.0, "palier": 10.0}],
     "pepite": 10.0},
    # model{4} = [3 120/sqrt(3)] c=50       -> gaussien portée pratique 120
    {"nom": "Gaussien a=120",
     "structures": [{"modele": "gaussien", "portee": 120.0, "palier": 50.0}],
     "pepite": 0.0},
    # model{5} = [1 0; 3 120/sqrt(3)] c=[10;40] -> pépite 10 + gaussien a=120
    {"nom": "Pépite 10 + Gaussien a=120",
     "structures": [{"modele": "gaussien", "portee": 120.0, "palier": 40.0}],
     "pepite": 10.0},
    # model{6} = [3 20/sqrt(3)] c=50        -> gaussien portée pratique 20
    {"nom": "Gaussien a=20",
     "structures": [{"modele": "gaussien", "portee": 20.0, "palier": 50.0}],
     "pepite": 0.0},
    # model{7} = [1 0]  c=20                 -> pépite pure (effet de pépite)
    {"nom": "Pépite pure c=20",
     "structures": [],
     "pepite": 20.0},
    # model{8} = [1 0]  c=50                 -> pépite pure plus forte
    {"nom": "Pépite pure c=50",
     "structures": [],
     "pepite": 50.0},
]


def profil_krigeage_1d(
    x_data: Sequence[float],
    z_data: Sequence[float],
    structures: Sequence[Dict],
    pepite: float = 0.0,
    x_grille: Optional[Sequence[float]] = None,
) -> Dict:
    """Calcule le profil de krigeage ordinaire 1D sur une grille fine.

    Délègue intégralement à :func:`krigeage_ordinaire`.

    Parameters
    ----------
    x_data, z_data : séquences
        Coordonnées (1D) et valeurs des points connus.
    structures, pepite
        Modèle de covariance (cf. wrappers).
    x_grille : séquence, optional
        Grille d'estimation ; par défaut ``0:1:100``.

    Returns
    -------
    dict : ``x``, ``z_ko`` (estimations), ``var_ko`` (variances).
    """
    x_data = np.asarray(x_data, dtype=float).reshape(-1, 1)
    z_data = np.asarray(z_data, dtype=float).ravel()
    if x_grille is None:
        x_grille = np.arange(0.0, 101.0, 1.0)
    xg = np.asarray(x_grille, dtype=float).reshape(-1, 1)

    res = krigeage_ordinaire(x_data, z_data, xg, structures, pepite=pepite)
    return {
        "x": xg.ravel(),
        "z_ko": res["estimations"],
        "var_ko": res["variances"],
    }


def figure_profil_krigeage(
    id_data: int = 3,
    id_model: int = 2,
    path: Optional[str] = None,
) -> Tuple["object", "object", Dict]:
    """Figure d'un profil de krigeage 1D (estimation + variance).

    Reproduit la double figure de ``Q6_ComparaisonKrigeage.m`` : la courbe
    ``Z_KO(x)`` avec les points connus, et la courbe ``sigma_KO^2(x)``.

    Parameters
    ----------
    id_data : int (1..3)
        Jeu de données (cf. :data:`JEUX_DONNEES`).
    id_model : int (1..8)
        Modèle de covariance (cf. :data:`MODELES_Q6`).
    path : str, optional
        Si fourni, enregistre la figure.

    Returns
    -------
    (fig, (ax_z, ax_var), donnees)
    """
    import matplotlib.pyplot as plt

    jeu = JEUX_DONNEES[id_data - 1]
    mod = MODELES_Q6[id_model - 1]
    prof = profil_krigeage_1d(
        jeu["x"], jeu["z"], mod["structures"], pepite=mod["pepite"]
    )

    fig, (ax_z, ax_var) = plt.subplots(2, 1, figsize=(8, 6), sharex=True)

    ax_z.plot(prof["x"], prof["z_ko"], color="#1f5fb5", lw=2.5,
              label=r"$Z_{KO}(x)$")
    ax_z.scatter(jeu["x"], jeu["z"], s=90, c="#d62728",
                 edgecolor="k", zorder=3, label="Points connus")
    ax_z.set_ylabel(r"$Z_{KO}(x)$")
    ax_z.set_title(f"Profil de krigeage — {mod['nom']}")
    ax_z.grid(True, ls="--", alpha=0.6)
    ax_z.legend(loc="best")

    ax_var.plot(prof["x"], prof["var_ko"], color="#2ca02c", lw=2.5)
    ax_var.scatter(jeu["x"], np.zeros_like(jeu["x"], dtype=float),
                   s=70, c="#d62728", edgecolor="k", zorder=3)
    ax_var.set_xlabel("x")
    ax_var.set_ylabel(r"$\sigma_{KO}^2(x)$")
    ax_var.grid(True, ls="--", alpha=0.6)

    fig.tight_layout()
    if path:
        fig.savefig(path, dpi=150, bbox_inches="tight")

    donnees = {
        "x": prof["x"],
        "z_ko": prof["z_ko"],
        "var_ko": prof["var_ko"],
        "modele": mod["nom"],
        "id_data": id_data,
        "id_model": id_model,
    }
    return fig, (ax_z, ax_var), donnees


def figure_association_profils(
    id_data: int = 3,
    id_models: Optional[Sequence[int]] = None,
    graine: int = 13,
    path: Optional[str] = None,
) -> Tuple["object", "object", Dict]:
    """Exercice « associer chaque profil au bon modèle » (C9-13).

    Trace plusieurs profils de krigeage ``Z_KO(x)`` pour un même jeu de
    données mais des modèles de covariance différents, étiquetés A, B, C…
    L'ordre des modèles est mélangé (shuffle) pour l'exercice à trous ; la
    correspondance vraie est renvoyée dans ``donnees['corrige']``.

    Parameters
    ----------
    id_data : int (1..3)
        Jeu de données commun.
    id_models : séquence d'int, optional
        Indices (1..8) des modèles à comparer ; défaut : 1, 2, 4, 6, 7
        (sphérique longue/courte, gaussien longue/courte, pépite pure) — la
        sélection « classique » qui contraste lissage et portée.
    graine : int
        Graine du mélange des étiquettes.
    path : str, optional
        Enregistre la figure si fourni.

    Returns
    -------
    (fig, axes, donnees)
        ``donnees['corrige']`` : liste de (lettre, nom_du_modèle).
    """
    import matplotlib.pyplot as plt

    if id_models is None:
        id_models = [1, 2, 4, 6, 7]
    id_models = list(id_models)

    jeu = JEUX_DONNEES[id_data - 1]

    # Mélange de l'ordre d'affichage (l'étudiant ne voit pas le bon ordre)
    rng = np.random.default_rng(graine)
    ordre = rng.permutation(len(id_models))
    lettres = [chr(ord("A") + k) for k in range(len(id_models))]

    profils = []
    for idm in id_models:
        mod = MODELES_Q6[idm - 1]
        profils.append(
            (mod["nom"], profil_krigeage_1d(
                jeu["x"], jeu["z"], mod["structures"], pepite=mod["pepite"]))
        )

    n = len(id_models)
    ncol = 2 if n > 1 else 1
    nrow = int(np.ceil(n / ncol))
    fig, axes = plt.subplots(nrow, ncol, figsize=(5.2 * ncol, 2.8 * nrow),
                             squeeze=False, sharex=True, sharey=True)
    axes_flat = axes.ravel()

    corrige = []
    for k, pos in enumerate(ordre):
        nom, prof = profils[pos]
        ax = axes_flat[k]
        ax.plot(prof["x"], prof["z_ko"], color="#1f5fb5", lw=2.2)
        ax.scatter(jeu["x"], jeu["z"], s=55, c="#d62728",
                   edgecolor="k", zorder=3)
        ax.set_title(f"Profil {lettres[k]}", fontsize=11)
        ax.grid(True, ls="--", alpha=0.5)
        corrige.append((lettres[k], nom))

    # Masque les axes inutilisés
    for k in range(n, len(axes_flat)):
        axes_flat[k].axis("off")

    for ax in axes[-1, :]:
        ax.set_xlabel("x")
    for ax in axes[:, 0]:
        ax.set_ylabel(r"$Z_{KO}(x)$")

    fig.suptitle("Associer chaque profil à son modèle de covariance",
                 fontsize=12)
    fig.tight_layout()
    if path:
        fig.savefig(path, dpi=150, bbox_inches="tight")

    donnees = {
        "corrige": corrige,
        "id_data": id_data,
        "id_models": id_models,
        "lettres": lettres,
    }
    return fig, axes, donnees

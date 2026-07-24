"""Générateurs de figures — chapitre 08 (variance de bloc vs dispersion).

Version Python des scripts MATLAB d'examen
(``7-VarianceBloc_Dispersion/Q1_CompareBlocDisp.m``) illustrant le changement
de support : comment la variance d'une variable régionalisée diminue lorsque le
support (le bloc) augmente, et comment le variogramme contrôle cette
décroissance (variance de bloc / variance de dispersion).

Deux familles de figures :

- :func:`comparer_modeles_variogramme` — calque direct du script MATLAB Q1 :
  comparaison de deux modèles de variogramme imbriqués (pépite + sphérique),
  qui ont la même variance ponctuelle mais des portées différentes, donc des
  variances de bloc/dispersion différentes.
- :func:`bloc_vs_dispersion_empirique` — illustration numérique : un champ est
  simulé (FFT-MA), puis agrégé par blocs de taille croissante ; on compare la
  variance empirique des moyennes de blocs à la variance de bloc théorique
  obtenue par quadrature.

Tous les calculs RÉUTILISENT la librairie :

- :func:`geostat_polymtl.block_variance.imbrique.variogramme_imbrique`
  (variogramme imbriqué via ``cov_func.covar``) ;
- :func:`geostat_polymtl.block_variance.empirique.variance_bloc_empirique`
  et :func:`~geostat_polymtl.block_variance.empirique.agreger_champ`
  (agrégation point → bloc) ;
- :func:`geostat_polymtl.block_variance.quadrature.variance_bloc_quadrature`
  (variance de bloc théorique par quadrature de Gauss-Legendre) ;
- :func:`geostat_polymtl.data.synthetic.champ_fftma_2d`
  (simulation du champ de référence).

Aucune formule de covariance, de simulation ou d'agrégation n'est réécrite ici :
ce module ne fait que configurer les paramètres des exercices et la mise en page.
"""
from __future__ import annotations

from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np
import matplotlib.pyplot as plt

# --- Réutilisation de la librairie (AUCUNE réimplémentation) ------------------
from geostat_polymtl.block_variance.imbrique import variogramme_imbrique
from geostat_polymtl.block_variance.empirique import (
    agreger_champ,
    variance_bloc_empirique,
)
from geostat_polymtl.block_variance.quadrature import variance_bloc_quadrature
from geostat_polymtl.data.synthetic import champ_fftma_2d


# ── Configuration des modèles de l'exercice (source MATLAB Q1) ────────────────
# Q1_CompareBlocDisp.m : deux paires de modèles imbriqués (pépite + sphérique).
# Format MATLAB : model=[1 0; 4 a]  (code 1 = pépite, code 4 = sphérique),
#                 c=[c0; c1]        (palier pépite ; palier structuré).
# On réécrit ces paramètres au format « structures » attendu par la librairie.
_MODELES_Q1: Dict[str, Dict] = {
    "A": {
        "label": "Modèle A",
        "pepite": 10.0,
        "structures": [{"modele": "spherique", "palier": 70.0, "portee": 55.0}],
        "couleur": "k",
    },
    "B": {
        "label": "Modèle B",
        "pepite": 10.0,
        "structures": [{"modele": "spherique", "palier": 100.0, "portee": 80.0}],
        "couleur": "g",
    },
    "C": {
        "label": "Modèle C",
        "pepite": 30.0,
        "structures": [{"modele": "spherique", "palier": 200.0, "portee": 80.0}],
        "couleur": "k",
    },
    "D": {
        "label": "Modèle D",
        "pepite": 0.0,
        "structures": [
            {"modele": "spherique", "palier": 30.0, "portee": 20.0},
            {"modele": "spherique", "palier": 200.0, "portee": 80.0},
        ],
        "couleur": "g",
    },
}


def _enregistrer(fig, path: Optional[str]) -> None:
    """Enregistre la figure si un chemin est fourni."""
    if path:
        fig.savefig(path, dpi=150, bbox_inches="tight")


def modeles_exercice() -> Dict[str, Dict]:
    """Paramètres des modèles de variogramme de l'exercice 8 (source Q1).

    Returns
    -------
    dict
        Dictionnaire ``{cle: {label, pepite, structures, couleur}}`` reprenant
        les modèles imbriqués du script MATLAB ``Q1_CompareBlocDisp.m``.
    """
    return {k: dict(v) for k, v in _MODELES_Q1.items()}


def comparer_modeles_variogramme(
    cles: Sequence[str] = ("A", "B"),
    h_max: float = 100.0,
    path: Optional[str] = None,
) -> Tuple[plt.Figure, plt.Axes]:
    """Comparaison de modèles de variogramme imbriqués (calque MATLAB Q1).

    Reproduit la figure de ``Q1_CompareBlocDisp.m`` : on trace
    :math:`\\gamma(h)` pour deux (ou plus) modèles imbriqués pépite +
    sphérique. Deux modèles de même variance ponctuelle mais de portées
    différentes conduisent à des variances de bloc / de dispersion différentes
    — c'est l'objet du chapitre.

    Le variogramme est calculé par
    :func:`geostat_polymtl.block_variance.imbrique.variogramme_imbrique`
    (aucune formule réécrite).

    Parameters
    ----------
    cles : sequence of str
        Clés des modèles à comparer (parmi ``"A"``, ``"B"``, ``"C"``, ``"D"``).
        Par défaut ``("A", "B")`` (première paire du MATLAB).
    h_max : float
        Distance maximale tracée.
    path : str, optional
        Chemin d'enregistrement de la figure.

    Returns
    -------
    (fig, ax)
    """
    h = np.arange(0.1, h_max + 1.0, 1.0)
    fig, ax = plt.subplots(figsize=(7, 5))

    palier_max = 0.0
    for cle in cles:
        m = _MODELES_Q1[cle]
        gamma = variogramme_imbrique(h, m["structures"], pepite=m["pepite"])
        ax.plot(h, gamma, "-", color=m["couleur"], lw=3, label=m["label"])
        palier_total = m["pepite"] + sum(s["palier"] for s in m["structures"])
        palier_max = max(palier_max, palier_total)

    ax.set_xlabel("h (m)")
    ax.set_ylabel(r"$\gamma(h)$ (%$^2$)")
    ax.set_xlim(0, h_max)
    ax.set_ylim(0, palier_max + 20)
    ax.legend(loc="upper left")
    ax.grid(True, ls=":", alpha=0.6)
    ax.set_title("Comparaison de modèles de variogramme — variance de dispersion")
    _enregistrer(fig, path)
    return fig, ax


def bloc_vs_dispersion_empirique(
    taille_champ: int = 256,
    portee: float = 30.0,
    palier: float = 1.0,
    taille_max: int = 24,
    rng: int = 42,
    path: Optional[str] = None,
) -> Tuple[plt.Figure, Tuple[plt.Axes, plt.Axes], Dict]:
    """Variance de bloc empirique vs théorique en fonction du support (Q1).

    Illustration numérique du changement de support :

    1. on simule un champ gaussien stationnaire par FFT-MA
       (:func:`geostat_polymtl.data.synthetic.champ_fftma_2d`) ;
    2. on l'agrège par blocs carrés de taille croissante et on mesure la
       variance empirique des moyennes de blocs
       (:func:`geostat_polymtl.block_variance.empirique.variance_bloc_empirique`) ;
    3. on superpose la variance de bloc **théorique** obtenue par quadrature
       (:func:`geostat_polymtl.block_variance.quadrature.variance_bloc_quadrature`).

    La variance de dispersion d'un point dans le champ entier décroît à mesure
    que le support augmente : c'est la relation de Krige
    :math:`\\sigma^2(\\cdot, G) = \\bar\\gamma(V, G) - \\bar\\gamma(V, V)`.

    Parameters
    ----------
    taille_champ : int
        Côté de la grille simulée (pixels).
    portee : float
        Portée pratique du variogramme sphérique du champ.
    palier : float
        Palier (variance ponctuelle) du champ.
    taille_max : int
        Plus grande taille de bloc testée (pixels).
    rng : int
        Graine de simulation (reproductibilité).
    path : str, optional
        Chemin d'enregistrement de la figure.

    Returns
    -------
    (fig, (ax_champ, ax_courbe), resultats)
        ``resultats`` contient ``tailles``, ``var_empirique``,
        ``var_theorique`` (listes alignées).
    """
    # 1) Champ de référence (réutilisation directe de la librairie)
    champ = champ_fftma_2d(taille=taille_champ, portee=portee,
                           palier=palier, rng=rng)

    # 2) Variance empirique des moyennes de blocs (réutilisation directe)
    tailles, var_emp = variance_bloc_empirique(champ, taille_max)

    # 3) Variance de bloc théorique par quadrature (réutilisation directe)
    var_theo: List[float] = []
    for s in tailles:
        if s <= 1:
            var_theo.append(float(palier))
            continue
        v, *_ = variance_bloc_quadrature(
            "surface", lx=float(s), ly=float(s), lz=0.0,
            palier=float(palier),
            ax=float(portee), ay=float(portee), az=float(portee),
            modele="spherique", n_points=6,
        )
        var_theo.append(float(v))

    # 4) Mise en page : champ + courbe variance vs support
    fig, (ax_champ, ax_courbe) = plt.subplots(1, 2, figsize=(12, 5))

    im = ax_champ.imshow(champ, origin="lower", cmap="turbo")
    ax_champ.set_title(f"Champ simulé (FFT-MA, portée = {portee:g})")
    ax_champ.set_xlabel("x (pixels)")
    ax_champ.set_ylabel("y (pixels)")
    fig.colorbar(im, ax=ax_champ, fraction=0.046, pad=0.04)

    ax_courbe.plot(tailles, var_emp, "o-", color="tab:blue",
                   label="Variance empirique (champ agrégé)")
    ax_courbe.plot(tailles, var_theo, "s--", color="tab:red",
                   label="Variance de bloc théorique (quadrature)")
    ax_courbe.set_xlabel("Taille du bloc (pixels)")
    ax_courbe.set_ylabel(r"Variance de bloc $\bar{C}(V,V)$")
    ax_courbe.set_title("Décroissance de la variance avec le support")
    ax_courbe.grid(True, ls=":", alpha=0.6)
    ax_courbe.legend()

    _enregistrer(fig, path)
    resultats = {
        "tailles": list(tailles),
        "var_empirique": list(var_emp),
        "var_theorique": var_theo,
        "champ": champ,
    }
    return fig, (ax_champ, ax_courbe), resultats

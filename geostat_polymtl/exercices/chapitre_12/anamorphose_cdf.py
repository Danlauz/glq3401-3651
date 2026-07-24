"""Générateurs de figures — chapitre 12 : anamorphose gaussienne (lecture CDF).

Version Python du script MATLAB d'examen ``go_final11.m`` (CP3, questions 5 et 7)
illustrant la **transformation gaussienne** (anamorphose) utilisée par les
méthodes de simulation de ce chapitre (Cholesky/LU et SGS), décrite à la section
« Cas des variables non gaussiennes : l'anamorphose » du chapitre 12.

Principe (cf. @eq-anamorphose) : pour simuler une variable :math:`Z` non
gaussienne (teneurs minières asymétriques, proches du log-normal), on construit
une fonction monotone :math:`\\varphi` telle que :math:`Z = \\varphi(Y)`, où
:math:`Y \\sim \\mathcal{N}(0,1)`. L'anamorphose se lit graphiquement en
appariant les **quantiles** : à un même niveau de probabilité cumulée
:math:`p = F_Z(z) = \\Phi(y)`, on associe la valeur :math:`z` (teneur observée)
et la valeur gaussienne :math:`y = \\Phi^{-1}(F_Z(z))`.

Source MATLAB (``go_final11.m``)::

    randn('state',915);
    n=100; x=exp(randn(n,1)); x=sort(x);   % Z log-normal trié
    y=[-3:0.1:3]'; fy=normal(y,0);          % CDF de N(0,1)
    plot(x,[1:n]'/(n+1), y,fy)              % F_Z vs F_Y

Ce module RÉUTILISE :

- :func:`geostat_polymtl.exp_variogram.GeoStatFFT.ECDF` pour la CDF empirique
  des données (rangs / (n)) ;
- :func:`geostat_polymtl.data.synthetic.champ_lognormal_2d` (optionnel) comme
  source de données log-normales spatialement corrélées.

Seul code neuf : la lecture graphique de l'anamorphose (appariement des
quantiles :math:`z \\leftrightarrow y`), qui n'est pas une primitive de la
librairie. La CDF de :math:`\\mathcal{N}(0,1)` provient de
:func:`scipy.stats.norm.cdf` (équivalent direct du helper MATLAB ``normal.m``).
"""
from __future__ import annotations

from typing import Dict, Optional, Tuple

import numpy as np
import matplotlib.pyplot as plt
from scipy.stats import norm

# --- Réutilisation de la librairie (AUCUNE réimplémentation) ------------------
from geostat_polymtl.exp_variogram.GeoStatFFT import ECDF
from geostat_polymtl.data.synthetic import champ_lognormal_2d


def _enregistrer(fig, path: Optional[str]) -> None:
    """Enregistre la figure si un chemin est fourni."""
    if path:
        fig.savefig(path, dpi=150, bbox_inches="tight")


def donnees_lognormales(
    n: int = 100,
    rng: int = 915,
) -> np.ndarray:
    """Échantillon log-normal trié reproduisant les données du MATLAB (Q5).

    Reproduit ``x = sort(exp(randn(n,1)))`` du script ``go_final11.m``.

    Parameters
    ----------
    n : int
        Nombre de données (100 dans le MATLAB).
    rng : int
        Graine (``randn('state',915)`` à l'origine ; ici une graine NumPy).

    Returns
    -------
    np.ndarray, shape ``(n,)``
        Valeurs :math:`Z = \\exp(N(0,1))` triées croissantes.
    """
    generateur = np.random.default_rng(rng)
    z = np.exp(generateur.standard_normal(n))
    return np.sort(z)


def cdf_transformation_gaussienne(
    z: Optional[np.ndarray] = None,
    n: int = 100,
    rng: int = 915,
    path: Optional[str] = None,
) -> Tuple[plt.Figure, plt.Axes, Dict]:
    """CDF empirique de :math:`Z` vs CDF de :math:`\\mathcal{N}(0,1)` (calque Q5).

    Reproduit la figure de ``go_final11.m`` (CP3, question 5) : on superpose la
    fonction de répartition empirique des teneurs :math:`Z` (ici log-normales) à
    la fonction de répartition de la loi normale centrée réduite. La lecture
    horizontale (même probabilité cumulée :math:`p`) donne l'**anamorphose**
    :math:`z \\leftrightarrow y` qui relie la variable observée à sa contrepartie
    gaussienne (cf. @eq-anamorphose).

    Parameters
    ----------
    z : np.ndarray, optional
        Données :math:`Z`. Si ``None``, on génère un échantillon log-normal
        (:func:`donnees_lognormales`) comme dans le MATLAB.
    n, rng : int
        Taille et graine de l'échantillon généré si ``z is None``.
    path : str, optional
        Chemin d'enregistrement de la figure.

    Returns
    -------
    (fig, ax, resultats)
        ``resultats`` contient ``z`` (trié), ``F_Z`` (CDF empirique),
        ``y_grille``, ``F_Y`` (CDF gaussienne).
    """
    if z is None:
        z = donnees_lognormales(n=n, rng=rng)
    else:
        z = np.sort(np.asarray(z, dtype=float))

    # CDF empirique de Z : on réutilise ECDF (rangs/(n-1)) de la librairie.
    # MATLAB trace [1:n]'/(n+1) ; ECDF renvoie des rangs normalisés équivalents.
    F_Z = ECDF(z.copy())

    # CDF de N(0,1) : équivalent direct de normal(y,0) du MATLAB.
    y_grille = np.arange(-3.0, 3.0 + 0.1, 0.1)
    F_Y = norm.cdf(y_grille)

    fig, ax = plt.subplots(figsize=(7, 5))
    ax.plot(z, F_Z, "-k", lw=2, label=r"$F_Z$ (données $Z$)")
    ax.plot(y_grille, F_Y, "--k", lw=2, label=r"$F_Y$,  $Y \sim N(0,1)$")
    ax.set_xlabel(r"$Z$  ou  $Y$")
    ax.set_ylabel(r"$F_Z$  ou  $F_Y$")
    ax.set_title("Transformation gaussienne (anamorphose) : CDF de $Z$ vs $N(0,1)$")
    ax.grid(True, ls=":", alpha=0.6)
    ax.legend(loc="lower right")
    _enregistrer(fig, path)

    resultats = {
        "z": z,
        "F_Z": F_Z,
        "y_grille": y_grille,
        "F_Y": F_Y,
    }
    return fig, ax, resultats


def anamorphose_lecture(
    z: Optional[np.ndarray] = None,
    n: int = 100,
    rng: int = 915,
    quantiles: Tuple[float, ...] = (0.1, 0.25, 0.5, 0.75, 0.9),
    path: Optional[str] = None,
) -> Tuple[plt.Figure, Tuple[plt.Axes, plt.Axes], Dict]:
    """Lecture graphique de l'anamorphose :math:`z \\leftrightarrow y` (Q5/Q7).

    Complète :func:`cdf_transformation_gaussienne` en explicitant la **fonction
    d'anamorphose** :math:`\\varphi` : pour chaque niveau de probabilité
    :math:`p`, on lit la teneur :math:`z = F_Z^{-1}(p)` et la valeur gaussienne
    :math:`y = \\Phi^{-1}(p)`. Le graphe :math:`(y, z)` est la fonction
    :math:`z = \\varphi(y)` à appliquer après simulation du champ gaussien.

    Panneau gauche : les deux CDF avec les segments de lecture aux ``quantiles``.
    Panneau droit : la courbe d'anamorphose :math:`z = \\varphi(y)`.

    Le calcul des quantiles empiriques de :math:`Z` et de
    :math:`\\Phi^{-1}` (lecture de la CDF) est le seul code neuf ; il s'appuie sur
    :func:`scipy.stats.norm.ppf`.

    Parameters
    ----------
    z : np.ndarray, optional
        Données :math:`Z`. Si ``None``, échantillon log-normal généré.
    n, rng : int
        Taille et graine si ``z is None``.
    quantiles : tuple of float
        Niveaux :math:`p` matérialisés par des segments de lecture.
    path : str, optional
        Chemin d'enregistrement.

    Returns
    -------
    (fig, (ax_cdf, ax_phi), resultats)
        ``resultats`` contient ``y_anam``, ``z_anam`` (courbe d'anamorphose),
        ``points`` (z, y, p aux quantiles demandés).
    """
    if z is None:
        z = donnees_lognormales(n=n, rng=rng)
    else:
        z = np.sort(np.asarray(z, dtype=float))

    F_Z = ECDF(z.copy())

    # Courbe d'anamorphose z = phi(y) : on apparie chaque donnée triée z_(i)
    # à y_(i) = Phi^{-1}(F_Z(z_(i))). (lecture de la CDF — code neuf autorisé.)
    p_data = np.clip(F_Z, 1e-3, 1 - 1e-3)
    y_anam = norm.ppf(p_data)

    # Points de lecture aux quantiles demandés
    z_q = np.quantile(z, quantiles)
    y_q = norm.ppf(quantiles)

    fig, (ax_cdf, ax_phi) = plt.subplots(1, 2, figsize=(12, 5))

    # --- Panneau gauche : CDF + segments de lecture --------------------------
    y_grille = np.arange(-3.0, 3.0 + 0.1, 0.1)
    ax_cdf.plot(z, F_Z, "-k", lw=2, label=r"$F_Z$ (données)")
    ax_cdf.plot(y_grille, norm.cdf(y_grille), "--k", lw=2,
                label=r"$F_Y$, $N(0,1)$")
    for zq, yq, p in zip(z_q, y_q, quantiles):
        ax_cdf.plot([zq, zq], [0, p], ":", color="tab:red", lw=1)
        ax_cdf.plot([yq, yq], [0, p], ":", color="tab:blue", lw=1)
        ax_cdf.plot([min(zq, yq), max(zq, yq)], [p, p], ":", color="0.5", lw=1)
        ax_cdf.plot(zq, p, "o", color="tab:red", ms=5)
        ax_cdf.plot(yq, p, "s", color="tab:blue", ms=5)
    ax_cdf.set_xlabel(r"$Z$  ou  $Y$")
    ax_cdf.set_ylabel("Probabilité cumulée $p$")
    ax_cdf.set_title("Lecture de l'anamorphose aux quantiles")
    ax_cdf.grid(True, ls=":", alpha=0.6)
    ax_cdf.legend(loc="lower right")

    # --- Panneau droit : fonction d'anamorphose z = phi(y) -------------------
    ax_phi.plot(y_anam, z, "-k", lw=2)
    ax_phi.plot(y_q, z_q, "o", color="tab:red", ms=6)
    for yq, zq, p in zip(y_q, z_q, quantiles):
        ax_phi.annotate(f"p={p:g}", (yq, zq), textcoords="offset points",
                        xytext=(6, -4), fontsize=8)
    ax_phi.set_xlabel(r"$y$  (valeur gaussienne)")
    ax_phi.set_ylabel(r"$z = \varphi(y)$  (teneur)")
    ax_phi.set_title(r"Fonction d'anamorphose $z = \varphi(y)$")
    ax_phi.grid(True, ls=":", alpha=0.6)

    _enregistrer(fig, path)
    resultats = {
        "y_anam": y_anam,
        "z_anam": z,
        "points": {"p": np.asarray(quantiles), "z": z_q, "y": y_q},
    }
    return fig, (ax_cdf, ax_phi), resultats


def donnees_lognormales_spatiales(
    taille: int = 60,
    portee: float = 15.0,
    moyenne: float = 1.0,
    variance: float = 1.0,
    rng: int = 915,
) -> np.ndarray:
    """Champ log-normal 2D (réutilise ``champ_lognormal_2d``), aplati en 1D.

    Source de données spatialement corrélées pour alimenter l'anamorphose,
    plus réaliste que des tirages i.i.d. RÉUTILISE directement
    :func:`geostat_polymtl.data.synthetic.champ_lognormal_2d`.
    """
    champ = champ_lognormal_2d(taille=taille, portee=portee,
                               moyenne=moyenne, variance=variance, rng=rng)
    return champ.ravel()

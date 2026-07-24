"""Générateurs de figures — chapitre 12 : réalisations simulées et cas arsenic.

Version Python des scripts MATLAB d'examen (CP3, ``11- Simulations`` :
``LUsim``/``fftma``/``SGS`` et le cas du dépassement de seuil) illustrant :

1. des **réalisations non conditionnelles** d'un champ gaussien par les méthodes
   du chapitre 12 (FFT-MA, Cholesky/LU, SGS), pour montrer que toutes
   reproduisent le même variogramme tout en différant point par point ;
2. le **cas arsenic** (CP3, question 9) : estimation de la probabilité de
   dépassement d'un seuil sanitaire (:math:`P(Z > 50\\ \\text{ppm})`) par
   simulations — une **fonctionnelle non linéaire** qui ne peut être obtenue
   correctement à partir d'un champ krigé (lissé), comme rappelé au chapitre 12.

Ce module RÉUTILISE intégralement les méthodes de simulation de la librairie
via les wrappers pédagogiques :

- :func:`geostat_polymtl.simulation_methods.wrappers.simuler_gfftma` (FFT-MA) ;
- :func:`geostat_polymtl.simulation_methods.wrappers.simuler_lu` (Cholesky/LU) ;
- :func:`geostat_polymtl.simulation_methods.wrappers.simuler_sgs` (SGS).

L'anamorphose log-normale (passage du champ gaussien :math:`Y` à la teneur
:math:`Z`) et le décompte du dépassement de seuil :math:`P(Z>z_c)` à travers les
réalisations sont le seul code neuf (mise en page + lecture). Aucune mathématique
de simulation, de covariance ou de krigeage n'est réécrite ici.

.. warning::
   **Bug connu signalé** : ``GFFTMA`` peut planter (ou produire une grille mal
   dimensionnée) lorsqu'une dimension interne de la grille étendue est impaire
   (portées gaussienne / pépite). Le wrapper ``simuler_gfftma`` corrige déjà la
   parité (``N_eff``) ; pour les appels directs à ``GFFTMA``, ajuster ``nx``/
   ``ny`` à une parité paire par axe. Ce module passe par le wrapper et n'est
   donc pas exposé au bug, mais celui-ci est signalé sans contournement caché.
"""
from __future__ import annotations

from typing import Dict, Optional, Sequence, Tuple

import numpy as np
import matplotlib.pyplot as plt

# --- Réutilisation de la librairie (AUCUNE réimplémentation) ------------------
from geostat_polymtl.simulation_methods.wrappers import (
    simuler_gfftma,
    simuler_lu,
    simuler_sgs,
)


def _enregistrer(fig, path: Optional[str]) -> None:
    """Enregistre la figure si un chemin est fourni."""
    if path:
        fig.savefig(path, dpi=150, bbox_inches="tight")


def realisations_methodes(
    N: int = 50,
    modele: str = "spherique",
    portee: float = 15.0,
    palier: float = 1.0,
    seed: int = 915,
    path: Optional[str] = None,
) -> Tuple[plt.Figure, np.ndarray, Dict]:
    """Une réalisation par méthode (FFT-MA, LU, SGS) — même variogramme (Q5/Q6).

    Reproduit l'esprit des questions « LU » et « SGS » du CP3 : on simule le
    **même** champ gaussien stationnaire par trois algorithmes du chapitre 12 et
    on visualise les réalisations côte à côte. Elles diffèrent point par point
    mais partagent le même modèle de covariance — illustration de la non-unicité
    des simulations à variogramme fixé.

    RÉUTILISE :func:`~...wrappers.simuler_gfftma`, :func:`~...wrappers.simuler_lu`
    et :func:`~...wrappers.simuler_sgs` (mêmes ``modele``/``portee``/``palier``).

    Parameters
    ----------
    N : int
        Côté de la grille carrée (≤ 60 à cause du coût LU/Cholesky en O(N^6)).
    modele : str
        Modèle de covariance (``"spherique"``, ``"exponentiel"``, ``"gaussien"``).
    portee : float
        Portée pratique (95 %).
    palier : float
        Palier (variance ponctuelle) du champ.
    seed : int
        Graine commune (les méthodes restent distinctes par construction).
    path : str, optional
        Chemin d'enregistrement.

    Returns
    -------
    (fig, axes, champs)
        ``champs`` : dict ``{"FFT-MA", "LU", "SGS"}`` -> tableau ``(N, N)``.
    """
    if N > 60:
        raise ValueError(
            f"N={N} > 60 : LU/Cholesky en O(N^6) deviennent coûteux. "
            "Réduire N ou n'utiliser que FFT-MA."
        )

    champs = {
        "FFT-MA": simuler_gfftma(N, modele, portee, palier, seed=seed),
        "LU": simuler_lu(N, modele, portee, palier, seed=seed),
        "SGS": simuler_sgs(N, modele, portee, palier, seed=seed),
    }

    vmin = min(c.min() for c in champs.values())
    vmax = max(c.max() for c in champs.values())

    fig, axes = plt.subplots(1, 3, figsize=(15, 5))
    for ax, (nom, champ) in zip(axes, champs.items()):
        im = ax.imshow(champ, origin="lower", cmap="turbo", vmin=vmin, vmax=vmax)
        ax.set_title(f"{nom}\n({modele}, portée = {portee:g})")
        ax.set_xlabel("x")
        ax.set_ylabel("y")
        fig.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
    fig.suptitle("Réalisations gaussiennes non conditionnelles — même variogramme",
                 y=1.02)
    _enregistrer(fig, path)
    return fig, axes, champs


def ensemble_realisations(
    N: int = 60,
    modele: str = "spherique",
    portee: float = 15.0,
    palier: float = 1.0,
    nbsim: int = 4,
    methode: str = "fftma",
    seed: int = 915,
    path: Optional[str] = None,
) -> Tuple[plt.Figure, np.ndarray, np.ndarray]:
    """Ensemble de réalisations d'une même méthode (variabilité entre images).

    Plusieurs réalisations indépendantes du même champ gaussien : illustre la
    **variabilité d'une simulation à l'autre**, base de la quantification de
    l'incertitude (chapitre 12).

    RÉUTILISE le wrapper de simulation choisi (FFT-MA par défaut, conseillé pour
    ``nbsim`` élevé ; LU/SGS coûteux).

    Parameters
    ----------
    N, modele, portee, palier : voir :func:`realisations_methodes`.
    nbsim : int
        Nombre de réalisations à tracer.
    methode : str
        ``"fftma"``, ``"lu"`` ou ``"sgs"``.
    seed : int
        Graine.
    path : str, optional
        Chemin d'enregistrement.

    Returns
    -------
    (fig, axes, champs)
        ``champs`` : tableau ``(nbsim, N, N)``.
    """
    fonctions = {"fftma": simuler_gfftma, "lu": simuler_lu, "sgs": simuler_sgs}
    if methode not in fonctions:
        raise ValueError(f"methode inconnue : {methode!r} (fftma/lu/sgs).")
    if methode in ("lu", "sgs") and N > 60:
        raise ValueError(f"N={N} > 60 trop coûteux pour {methode}.")

    champs = fonctions[methode](N, modele, portee, palier, seed=seed, nbsim=nbsim)
    if nbsim == 1:
        champs = champs[None, ...]

    vmin, vmax = champs.min(), champs.max()
    ncol = min(nbsim, 4)
    nrow = int(np.ceil(nbsim / ncol))
    fig, axes = plt.subplots(nrow, ncol, figsize=(4 * ncol, 4 * nrow),
                             squeeze=False)
    axes_flat = axes.ravel()
    for k in range(len(axes_flat)):
        ax = axes_flat[k]
        if k < nbsim:
            im = ax.imshow(champs[k], origin="lower", cmap="turbo",
                           vmin=vmin, vmax=vmax)
            ax.set_title(f"Réalisation {k + 1}")
            fig.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
        ax.set_xticks([]); ax.set_yticks([])
    fig.suptitle(f"{nbsim} réalisations ({methode.upper()}, {modele}, "
                 f"portée = {portee:g})", y=1.0)
    _enregistrer(fig, path)
    return fig, axes, champs


# ── Cas arsenic : P(Z > 50 ppm) par simulations (CP3, question 9) ─────────────

def _gaussien_vers_lognormal(
    champ_g: np.ndarray,
    moyenne: float,
    variance: float,
) -> np.ndarray:
    """Anamorphose log-normale d'un champ gaussien standard (code neuf).

    Z = exp(mu + sigma * Y) avec mu, sigma calibrés pour que Z ait la moyenne et
    la variance ciblées (relations log-normales standard). Le champ gaussien
    ``champ_g`` est supposé de variance ~1 (palier=1 dans la simulation).
    """
    sigma2 = np.log(1.0 + variance / moyenne**2)
    mu = np.log(moyenne) - 0.5 * sigma2
    sigma = np.sqrt(sigma2)
    # Normalisation de la variance empirique du champ gaussien à 1.
    g = (champ_g - champ_g.mean()) / (champ_g.std() + 1e-12)
    return np.exp(mu + sigma * g)


def cas_arsenic_depassement(
    N: int = 80,
    modele: str = "spherique",
    portee: float = 15.0,
    nbsim: int = 200,
    moyenne: float = 30.0,
    variance: float = 600.0,
    seuil: float = 50.0,
    seed: int = 915,
    methode: str = "fftma",
    path: Optional[str] = None,
) -> Tuple[plt.Figure, Tuple[plt.Axes, plt.Axes], Dict]:
    """Carte de probabilité :math:`P(Z > z_c)` par simulations (cas arsenic, Q9).

    Cas type du chapitre 12 : estimer la probabilité qu'une teneur en arsenic
    dépasse un seuil sanitaire (:math:`z_c = 50\\ \\text{ppm}`). C'est une
    **fonctionnelle non linéaire** : on simule ``nbsim`` réalisations
    conditionnelles/non conditionnelles, on transforme chaque champ gaussien en
    teneur log-normale par anamorphose, puis on estime pixel par pixel

    .. math:: P(Z(\\mathbf{x}) > z_c)
              \\approx \\frac{1}{L}\\sum_{\\ell=1}^{L}
              \\mathbf{1}\\{Z_\\ell(\\mathbf{x}) > z_c\\}.

    Le champ krigé (moyenne des réalisations, lissé) sous-estimerait
    systématiquement la fréquence des dépassements : c'est tout l'intérêt de
    passer par les simulations.

    Méthodes de simulation RÉUTILISÉES via les wrappers ; l'anamorphose
    log-normale et le décompte d'indicatrices sont le seul code neuf.

    Parameters
    ----------
    N : int
        Côté de la grille (FFT-MA conseillé pour ``N`` et ``nbsim`` élevés).
    modele, portee : str, float
        Modèle et portée du variogramme du champ gaussien sous-jacent.
    nbsim : int
        Nombre de réalisations (plus il est grand, plus la carte est lisse).
    moyenne, variance : float
        Moyenne et variance ciblées de la teneur log-normale (ppm, ppm²).
    seuil : float
        Seuil de dépassement :math:`z_c` (50 ppm pour l'arsenic).
    seed : int
        Graine.
    methode : str
        ``"fftma"`` (recommandé), ``"lu"`` ou ``"sgs"``.
    path : str, optional
        Chemin d'enregistrement.

    Returns
    -------
    (fig, (ax_prob, ax_hist), resultats)
        ``resultats`` : ``proba`` carte ``(N, N)`` de :math:`P(Z>z_c)`,
        ``moyenne_teneur`` carte moyenne des réalisations, ``frac_globale``
        (proportion moyenne de pixels en dépassement).
    """
    fonctions = {"fftma": simuler_gfftma, "lu": simuler_lu, "sgs": simuler_sgs}
    if methode not in fonctions:
        raise ValueError(f"methode inconnue : {methode!r}.")
    if methode in ("lu", "sgs") and N > 60:
        raise ValueError(f"N={N} > 60 trop coûteux pour {methode}.")

    # 1) Réalisations gaussiennes (palier=1) — réutilisation directe.
    champs_g = fonctions[methode](N, modele, portee, palier=1.0,
                                  seed=seed, nbsim=nbsim)
    if nbsim == 1:
        champs_g = champs_g[None, ...]

    # 2) Anamorphose log-normale réalisation par réalisation (code neuf).
    teneurs = np.empty_like(champs_g)
    for k in range(nbsim):
        teneurs[k] = _gaussien_vers_lognormal(champs_g[k], moyenne, variance)

    # 3) Décompte du dépassement pixel par pixel (indicatrice — code neuf).
    proba = (teneurs > seuil).mean(axis=0)
    moyenne_teneur = teneurs.mean(axis=0)
    frac_globale = float((teneurs > seuil).mean())

    # 4) Mise en page : carte de probabilité + histogramme des teneurs.
    fig, (ax_prob, ax_hist) = plt.subplots(1, 2, figsize=(13, 5))

    im = ax_prob.imshow(proba, origin="lower", cmap="turbo", vmin=0, vmax=1)
    ax_prob.set_title(f"$P(Z > {seuil:g}$ ppm$)$  ({nbsim} réalisations)")
    ax_prob.set_xlabel("x"); ax_prob.set_ylabel("y")
    fig.colorbar(im, ax=ax_prob, fraction=0.046, pad=0.04, label="Probabilité")

    ax_hist.hist(teneurs.ravel(), bins=60, color="0.6", edgecolor="k", alpha=0.8)
    ax_hist.axvline(seuil, color="tab:red", lw=2,
                    label=f"Seuil = {seuil:g} ppm")
    ax_hist.set_xlabel("Teneur en arsenic (ppm)")
    ax_hist.set_ylabel("Effectif")
    ax_hist.set_title(f"Histogramme des teneurs simulées\n"
                      f"Dépassement global ≈ {100 * frac_globale:.1f} %")
    ax_hist.legend()

    _enregistrer(fig, path)
    resultats = {
        "proba": proba,
        "moyenne_teneur": moyenne_teneur,
        "frac_globale": frac_globale,
        "seuil": seuil,
    }
    return fig, (ax_prob, ax_hist), resultats

"""Figures QA/QC — duplicatas, standards, blancs (exercice CP1-Q6, « gén. MATLAB »).

Portage Python du code MATLAB ``5-MéthodeConventionnelle/`` (``Duplicata1.m``,
``Duplicata2.m``, ``Standard.m``, ``Blanc.m``, ``Q5_Duplicat_DemiDifference.m``,
``Q4_QAQC.m``). On NE réimplémente PAS les outils QA/QC : tout passe par
:mod:`geostat_polymtl.sampling.duplicatas`, ``...standards``, ``...blancs`` et
les fonctions de tracé de :mod:`geostat_polymtl.sampling.plotting`.

Ce module ne contient que les **paramètres** des scénarios des énoncés et la
**mise en page** (titre, sauvegarde PNG).

Correspondance de paramétrage (MATLAB → librairie)
--------------------------------------------------
- **Duplicatas** : ``Duplicata1/2`` utilisent ``MvLogNRand(Mu=m, Sigma=sig,…)``,
  où ``Mu`` est la moyenne log et ``Sigma`` l'écart-type log. Le pendant
  librairie est ``simuler_duplicatas(mediane=exp(m), sigma=sig,
  correlation=rho, bruit_additif=bias)`` (la médiane lognormale est
  ``exp(Mu)``). La librairie applique la corrélation sur l'échelle gaussienne
  sous-jacente, ce qui produit la même famille de nuages (précis/imprécis,
  avec/sans biais) que MATLAB.
- **Standards / Blancs** : ``Standard.m`` / ``Blanc.m`` mélangent deux
  populations gaussiennes (``N1@m1/sig1`` et ``N2@m2/sig2``), tronquées à 0.
  La série brute est reproduite ici (``_serie_deux_populations``), puis analysée
  par ``analyser_standards`` (règles de Western Electric) /
  ``analyser_blancs`` (seuils ×LD) de la librairie.

Exercice visé
-------------
- **CP1-Q6** : associer les éléments de contrôle (duplicatas, blancs,
  standards) à leur utilité, à partir de leurs figures caractéristiques.
"""

from __future__ import annotations

from typing import Dict, List, Optional, Tuple

import numpy as np
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

from geostat_polymtl.sampling.duplicatas import (
    simuler_duplicatas,
    analyser_duplicatas,
    diagnostic_duplicatas,
)
from geostat_polymtl.sampling.standards import analyser_standards
from geostat_polymtl.sampling.blancs import analyser_blancs
from geostat_polymtl.sampling.plotting import (
    tracer_duplicatas,
    tracer_standards,
    tracer_blancs,
)


# ---------------------------------------------------------------------------
# Duplicatas : 5 cas pédagogiques (Q5_Duplicat_DemiDifference.m)
# ---------------------------------------------------------------------------
# m = Mu lognormal (médiane = exp(m)) ; sigma = écart-type log ;
# correlation = rho ; bruit_additif = bias (biais multiplicatif → additif).
DUPLICATAS_CAS: Dict[str, Dict] = {
    "cas1_precis_sans_biais": {
        "titre": "Précis, sans biais",
        "m": 0.9, "sigma": 1.5, "correlation": 0.996, "bruit_additif": 0.0,
    },
    "cas2_imprecis_sans_biais": {
        "titre": "Imprécis, sans biais",
        "m": 0.9, "sigma": 1.5, "correlation": 0.985, "bruit_additif": 0.0,
    },
    "cas3_precis_biais": {
        "titre": "Précis, avec biais",
        "m": 0.9, "sigma": 1.5, "correlation": 0.999, "bruit_additif": 0.10,
    },
    "cas4_imprecis_biais": {
        "titre": "Imprécis, avec biais",
        "m": 0.9, "sigma": 1.5, "correlation": 0.99, "bruit_additif": 0.15,
    },
    "cas5_biais_fort": {
        "titre": "Biais marqué",
        "m": 0.9, "sigma": 1.5, "correlation": 0.999, "bruit_additif": 0.25,
    },
}


def figure_duplicatas(
    cas: str = "cas1_precis_sans_biais",
    *,
    n_points: int = 2000,
    seed: Optional[int] = 42,
    path: Optional[str] = None,
    figsize: Tuple[float, float] = (18, 6),
) -> Tuple[plt.Figure, List[plt.Axes], Dict]:
    """Trace les 3 graphiques de duplicatas d'un cas (CP1-Q6).

    Simule la paire (``simuler_duplicatas``), l'analyse
    (``analyser_duplicatas``) puis trace scatter + différence relative + courbe
    HARD (``tracer_duplicatas``).

    Parameters
    ----------
    cas : str
        Clé de :data:`DUPLICATAS_CAS`.
    n_points : int
        Nombre de paires (défaut 2000, comme MATLAB).
    seed : int, optional
        Graine aléatoire.
    path : str, optional
        Si fourni, enregistre la figure en PNG.

    Returns
    -------
    (fig, axes, infos) : (Figure, list[Axes], dict)
        ``infos`` : ``pct_hard_sous_10``, ``n_hors_10pct/20pct/30pct``,
        ``diagnostic`` (texte) et ``resultat``.
    """
    c = DUPLICATAS_CAS[cas]
    d1, d2 = simuler_duplicatas(
        n_points=n_points,
        mediane=float(np.exp(c["m"])),
        sigma=c["sigma"],
        correlation=c["correlation"],
        bruit_additif=c["bruit_additif"],
        seed=seed,
    )
    resultat = analyser_duplicatas(d1, d2)
    fig = tracer_duplicatas(resultat, figsize=figsize)
    fig.suptitle(f"Duplicatas — {c['titre']}", fontsize=13)

    infos = {
        "pct_hard_sous_10": resultat.pct_hard_sous_10,
        "n_hors_10pct": resultat.n_hors_10pct,
        "n_hors_20pct": resultat.n_hors_20pct,
        "n_hors_30pct": resultat.n_hors_30pct,
        "diagnostic": diagnostic_duplicatas(resultat),
        "resultat": resultat,
    }
    if path is not None:
        fig.savefig(path, dpi=150, bbox_inches="tight")
    return fig, fig.axes, infos


# ---------------------------------------------------------------------------
# Standards : scénarios Q4_QAQC.m (Standard.m)
# ---------------------------------------------------------------------------
# Standard.m mélange 2 populations gaussiennes (N1@m1/sig1, N2@m2/sig2).
STANDARDS_CAS: Dict[str, Dict] = {
    "scenario1": {
        "titre": "Standard biaisé (population décalée)",
        "m1": 0.54, "sig1": 0.05, "N1": 1500,
        "m2": 0.62, "sig2": 0.05, "N2": 500,
        "mreel": 0.55, "sigreel": 0.03,
    },
    "scenario2": {
        "titre": "Standard imprécis (σ élevé)",
        "m1": 0.50, "sig1": 0.06, "N1": 1000,
        "m2": 0.50, "sig2": 0.06, "N2": 1000,
        "mreel": 0.50, "sigreel": 0.03,
    },
    "scenario3": {
        "titre": "Standard sous contrôle",
        "m1": 0.50, "sig1": 0.03, "N1": 1000,
        "m2": 0.50, "sig2": 0.03, "N2": 1000,
        "mreel": 0.50, "sigreel": 0.03,
    },
}


def _serie_deux_populations(
    m1: float, sig1: float, N1: int,
    m2: float, sig2: float, N2: int,
    seed: Optional[int] = 42,
) -> np.ndarray:
    """Reproduit ``Standard.m`` / ``Blanc.m`` : 2 gaussiennes mélangées, clip ≥ 0.

    Deux sous-populations ``N(m1, sig1)`` (N1 mesures) et ``N(m2, sig2)``
    (N2 mesures) concaténées, mélangées aléatoirement et tronquées à 0.
    """
    rng = np.random.default_rng(seed)
    a1 = rng.normal(m1, sig1, N1)
    a2 = rng.normal(m2, sig2, N2)
    a = np.concatenate([a1, a2])
    rng.shuffle(a)
    return np.maximum(a, 0.0)


def figure_standards(
    scenario: str = "scenario1",
    *,
    seed: Optional[int] = 42,
    path: Optional[str] = None,
    figsize: Tuple[float, float] = (12, 5),
) -> Tuple[plt.Figure, plt.Axes, Dict]:
    """Trace la série temporelle d'un standard avec anomalies (CP1-Q6).

    Construit la série (deux populations) puis applique les règles de Western
    Electric (``analyser_standards``) et trace (``tracer_standards``).

    Returns
    -------
    (fig, ax, infos) : (Figure, Axes, dict)
        ``infos`` : ``n_anomalies``, ``anomalies`` (par critère), ``resultat``.
    """
    c = STANDARDS_CAS[scenario]
    serie = _serie_deux_populations(
        c["m1"], c["sig1"], c["N1"], c["m2"], c["sig2"], c["N2"], seed=seed
    )
    resultat = analyser_standards(serie, moyenne_attendue=c["mreel"], ecart_type=c["sigreel"])
    fig = tracer_standards(resultat, ylim=(0.30, 0.75))
    fig.axes[0].set_title(f"Standards — {c['titre']}")

    infos = {
        "n_anomalies": resultat.n_anomalies,
        "anomalies": resultat.anomalies,
        "resultat": resultat,
    }
    if path is not None:
        fig.savefig(path, dpi=150, bbox_inches="tight")
    return fig, fig.axes[0], infos


# ---------------------------------------------------------------------------
# Blancs : scénarios Q4_QAQC.m (Blanc.m)
# ---------------------------------------------------------------------------
BLANCS_CAS: Dict[str, Dict] = {
    "scenario4": {
        "titre": "Blancs contaminés (population haute)",
        "m1": 0.01, "sig1": 0.005, "N1": 1900,
        "m2": 0.10, "sig2": 0.03, "N2": 100,
        "ld": 0.02,
    },
    "scenario5": {
        "titre": "Blancs propres",
        "m1": 0.01, "sig1": 0.005, "N1": 1900,
        "m2": 0.01, "sig2": 0.005, "N2": 100,
        "ld": 0.02,
    },
}


def figure_blancs(
    scenario: str = "scenario4",
    *,
    seed: Optional[int] = 42,
    path: Optional[str] = None,
    figsize: Tuple[float, float] = (12, 5),
) -> Tuple[plt.Figure, plt.Axes, Dict]:
    """Trace la série temporelle d'une série de blancs (CP1-Q6).

    Construit la série (deux populations) puis classe les valeurs par seuils
    ×LD (``analyser_blancs``) et trace (``tracer_blancs``).

    Returns
    -------
    (fig, ax, infos) : (Figure, Axes, dict)
        ``infos`` : ``pct_contamines``, ``n_sup_10ld``, ``resultat``.
    """
    c = BLANCS_CAS[scenario]
    serie = _serie_deux_populations(
        c["m1"], c["sig1"], c["N1"], c["m2"], c["sig2"], c["N2"], seed=seed
    )
    resultat = analyser_blancs(serie, ld=c["ld"])
    fig = tracer_blancs(resultat, y_max=0.3)
    fig.axes[0].set_title(f"Blancs — {c['titre']} (LD = {c['ld']})")
    fig.axes[0].set_ylabel("Teneur (%)")

    infos = {
        "pct_contamines": resultat.pct_contamines,
        "n_sup_10ld": resultat.n_sup_10ld,
        "resultat": resultat,
    }
    if path is not None:
        fig.savefig(path, dpi=150, bbox_inches="tight")
    return fig, fig.axes[0], infos

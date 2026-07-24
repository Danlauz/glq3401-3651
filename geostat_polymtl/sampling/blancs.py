"""
Analyse des blancs analytiques (QA/QC).

Ce module fournit des outils pour :

- Simuler des séries de blancs avec bruit contrôlé ;
- Analyser un jeu de données réel de blancs ;
- Classifier les valeurs selon des seuils multiples de la limite de détection (LD) ;
- Produire un diagnostic textuel.

Référence : Rafini, S. (2015). *Assurance et contrôle de la qualité (QA/QC)
en exploration minérale*. Rapport, Projet CONSOREM 2013-05.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import numpy as np
from numpy.typing import ArrayLike


# ---------------------------------------------------------------------------
# Résultat structuré
# ---------------------------------------------------------------------------

@dataclass
class ResultatBlancs:
    """Résultat de l'analyse d'une série de blancs.

    Attributes
    ----------
    valeurs : np.ndarray
        Valeurs mesurées des blancs.
    ld : float
        Limite de détection utilisée.
    n_total : int
        Nombre total de mesures.
    n_1_3ld : int
        Nombre de valeurs entre 1×LD et 3×LD.
    n_3_5ld : int
        Nombre de valeurs entre 3×LD et 5×LD.
    n_5_10ld : int
        Nombre de valeurs entre 5×LD et 10×LD.
    n_sup_10ld : int
        Nombre de valeurs au-dessus de 10×LD.
    pct_contamines : float
        Pourcentage de valeurs au-dessus de 1×LD.
    indices_1_3ld, indices_3_5ld, indices_5_10ld, indices_sup_10ld : np.ndarray
        Indices des valeurs dans chaque catégorie.
    """

    valeurs: np.ndarray
    ld: float
    n_total: int
    n_1_3ld: int
    n_3_5ld: int
    n_5_10ld: int
    n_sup_10ld: int
    pct_contamines: float
    indices_1_3ld: np.ndarray
    indices_3_5ld: np.ndarray
    indices_5_10ld: np.ndarray
    indices_sup_10ld: np.ndarray


# ---------------------------------------------------------------------------
# Simulation
# ---------------------------------------------------------------------------

def simuler_blancs(
    n_points: int = 1000,
    bruit: float = 1.0,
    seed: Optional[int] = 42,
) -> np.ndarray:
    """Simule une série de blancs analytiques (valeurs ≥ 0).

    Parameters
    ----------
    n_points : int
        Nombre de mesures à simuler.
    bruit : float
        Écart-type du bruit gaussien ajouté autour de 0.
    seed : int, optional
        Graine aléatoire pour la reproductibilité.

    Returns
    -------
    np.ndarray
        Valeurs simulées (clippées ≥ 0).
    """
    rng = np.random.default_rng(seed)
    blancs = rng.normal(0, bruit, size=n_points)
    return np.clip(blancs, 0, None)


# ---------------------------------------------------------------------------
# Analyse
# ---------------------------------------------------------------------------

def analyser_blancs(
    valeurs: ArrayLike,
    ld: float,
) -> ResultatBlancs:
    """Analyse une série de blancs par rapport à la limite de détection.

    Classifie chaque valeur dans les catégories :
    - [1×LD, 3×LD) : contamination légère
    - [3×LD, 5×LD) : contamination modérée
    - [5×LD, 10×LD) : contamination élevée
    - ≥ 10×LD       : contamination majeure

    Parameters
    ----------
    valeurs : array-like
        Mesures des blancs (ppm ou autre unité cohérente avec ld).
    ld : float
        Limite de détection de l'appareil (même unité que valeurs).

    Returns
    -------
    ResultatBlancs
        Résultat structuré avec le comptage par catégorie.

    Examples
    --------
    >>> from qaqc_gy.blancs import simuler_blancs, analyser_blancs
    >>> blancs = simuler_blancs(n_points=500, bruit=0.8)
    >>> r = analyser_blancs(blancs, ld=0.5)
    >>> print(f"{r.pct_contamines:.1f} % au-dessus de 1×LD")
    """
    v = np.asarray(valeurs, dtype=float)
    diff = v  # les blancs sont centrés sur 0

    idx_1_3 = np.where((diff > 1 * ld) & (diff <= 3 * ld))[0]
    idx_3_5 = np.where((diff > 3 * ld) & (diff <= 5 * ld))[0]
    idx_5_10 = np.where((diff > 5 * ld) & (diff <= 10 * ld))[0]
    idx_sup10 = np.where(diff > 10 * ld)[0]

    n_total = len(v)
    n_contam = len(idx_1_3) + len(idx_3_5) + len(idx_5_10) + len(idx_sup10)

    return ResultatBlancs(
        valeurs=v,
        ld=ld,
        n_total=n_total,
        n_1_3ld=len(idx_1_3),
        n_3_5ld=len(idx_3_5),
        n_5_10ld=len(idx_5_10),
        n_sup_10ld=len(idx_sup10),
        pct_contamines=100.0 * n_contam / n_total if n_total > 0 else 0.0,
        indices_1_3ld=idx_1_3,
        indices_3_5ld=idx_3_5,
        indices_5_10ld=idx_5_10,
        indices_sup_10ld=idx_sup10,
    )


def diagnostic_blancs(resultat: ResultatBlancs) -> str:
    """Produit un diagnostic textuel de l'analyse des blancs.

    Parameters
    ----------
    resultat : ResultatBlancs

    Returns
    -------
    str
        Texte de diagnostic avec interprétation.
    """
    r = resultat
    lines = [
        f"Analyse des blancs — {r.n_total} mesures, LD = {r.ld}",
        "-" * 50,
        f"  1–3 LD  : {r.n_1_3ld:4d}  ({100*r.n_1_3ld/r.n_total:.1f} %)",
        f"  3–5 LD  : {r.n_3_5ld:4d}  ({100*r.n_3_5ld/r.n_total:.1f} %)",
        f"  5–10 LD : {r.n_5_10ld:4d}  ({100*r.n_5_10ld/r.n_total:.1f} %)",
        f"  >10 LD  : {r.n_sup_10ld:4d}  ({100*r.n_sup_10ld/r.n_total:.1f} %)",
        f"  Total contaminés : {r.pct_contamines:.1f} %",
        "",
    ]

    # Interprétation
    if r.n_sup_10ld > 0:
        lines.append("⚠️  Contamination majeure détectée (>10 LD).")
        lines.append("    → Vérifier la chaîne de préparation et le nettoyage du matériel.")
    if r.n_5_10ld > 0:
        lines.append("⚠️  Contamination élevée détectée (5–10 LD).")
        lines.append("    → Investiguer les étapes de préparation récentes.")
    if r.pct_contamines < 5:
        lines.append("✅  Taux de contamination acceptable (< 5 %).")
    elif r.pct_contamines < 10:
        lines.append("⚠️  Taux de contamination modéré (5–10 %). Surveillance recommandée.")
    else:
        lines.append("❌  Taux de contamination élevé (≥ 10 %). Action corrective requise.")

    return "\n".join(lines)

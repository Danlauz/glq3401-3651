"""
Analyse des duplicatas géochimiques (QA/QC).

Ce module fournit des outils pour :

- Simuler des paires de duplicatas avec corrélation contrôlée ;
- Analyser un jeu de données réel de duplicatas ;
- Calculer les métriques HARD, différence relative et comptage hors tolérance ;
- Produire un diagnostic textuel.

Référence : Rafini, S. (2015). *Assurance et contrôle de la qualité (QA/QC)
en exploration minérale*. Rapport, Projet CONSOREM 2013-05.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Tuple

import numpy as np
from numpy.typing import ArrayLike


# ---------------------------------------------------------------------------
# Résultat structuré
# ---------------------------------------------------------------------------

@dataclass
class ResultatDuplicatas:
    """Résultat de l'analyse de duplicatas.

    Attributes
    ----------
    dup1, dup2 : np.ndarray
        Valeurs des deux séries de duplicatas.
    n_total : int
        Nombre de paires.
    moyennes : np.ndarray
        Moyennes par paire : (d1 + d2) / 2.
    diff_relative : np.ndarray
        Différence relative en % : 100 × (d1 − d2) / moyenne.
    hard_values : np.ndarray
        Valeurs HARD triées : |d1 − d2| / (d1 + d2).
    hard_ranks : np.ndarray
        Rangs normalisés pour le graphique HARD.
    n_hors_10pct : int
        Paires hors ±10 %.
    n_hors_20pct : int
        Paires hors ±20 %.
    n_hors_30pct : int
        Paires hors ±30 %.
    pct_hard_sous_10 : float
        Pourcentage de paires avec HARD < 0.10 (critère 90/10).
    """

    dup1: np.ndarray
    dup2: np.ndarray
    n_total: int
    moyennes: np.ndarray
    diff_relative: np.ndarray
    hard_values: np.ndarray
    hard_ranks: np.ndarray
    n_hors_10pct: int
    n_hors_20pct: int
    n_hors_30pct: int
    pct_hard_sous_10: float


# ---------------------------------------------------------------------------
# Simulation
# ---------------------------------------------------------------------------

def simuler_duplicatas(
    n_points: int = 200,
    mediane: float = 2.0,
    sigma: float = 0.4,
    correlation: float = 0.95,
    bruit_additif: float = 0.0,
    seed: Optional[int] = 42,
) -> Tuple[np.ndarray, np.ndarray]:
    """Simule des paires de duplicatas lognormaux corrélés.

    Parameters
    ----------
    n_points : int
        Nombre de paires.
    mediane : float
        Médiane de la distribution lognormale.
    sigma : float
        Écart-type log du bruit corrélé.
    correlation : float
        Corrélation entre les deux duplicatas (0 à 1).
    bruit_additif : float
        Écart-type d'un bruit gaussien additif supplémentaire.
    seed : int, optional
        Graine aléatoire.

    Returns
    -------
    dup1, dup2 : np.ndarray
        Les deux séries de duplicatas.
    """
    rng = np.random.default_rng(seed)
    mu = np.log(mediane)

    corr_mat = np.array([[1.0, correlation], [correlation, 1.0]])
    cov = corr_mat * sigma**2

    dup1 = np.empty(n_points)
    dup2 = np.empty(n_points)
    for i in range(n_points):
        noise = rng.multivariate_normal(mean=[0, 0], cov=cov)
        dup1[i] = np.exp(mu + noise[0])
        dup2[i] = np.exp(mu + noise[1])

    if bruit_additif > 0:
        dup1 += rng.normal(0, bruit_additif, size=n_points)
        dup2 += rng.normal(0, bruit_additif, size=n_points)

    return dup1, dup2


# ---------------------------------------------------------------------------
# Analyse
# ---------------------------------------------------------------------------

def analyser_duplicatas(
    dup1: ArrayLike,
    dup2: ArrayLike,
) -> ResultatDuplicatas:
    """Analyse une série de paires de duplicatas.

    Calcule les métriques clés : différence relative, valeurs HARD,
    comptage hors tolérance.

    Parameters
    ----------
    dup1, dup2 : array-like
        Valeurs des deux séries de duplicatas (même longueur).

    Returns
    -------
    ResultatDuplicatas
        Résultat structuré.

    Examples
    --------
    >>> from qaqc_gy.duplicatas import simuler_duplicatas, analyser_duplicatas
    >>> d1, d2 = simuler_duplicatas(n_points=100, correlation=0.99)
    >>> r = analyser_duplicatas(d1, d2)
    >>> print(f"HARD 90/10 : {r.pct_hard_sous_10:.1f} %")
    """
    d1 = np.asarray(dup1, dtype=float)
    d2 = np.asarray(dup2, dtype=float)
    n = len(d1)

    moyennes = (d1 + d2) / 2.0
    diff_rel = np.where(moyennes != 0, 100.0 * (d1 - d2) / moyennes, 0.0)

    somme = d1 + d2
    hard = np.where(somme != 0, np.abs(d1 - d2) / somme, 0.0)
    hard_sorted = np.sort(hard)
    ranks = np.arange(1, n + 1) / (n + 1)

    # Comptage hors tolérance
    abs_diff_rel = np.abs(diff_rel)
    n_10 = int(np.sum(abs_diff_rel > 10))
    n_20 = int(np.sum(abs_diff_rel > 20))
    n_30 = int(np.sum(abs_diff_rel > 30))

    # HARD critère 90/10
    pct_sous_10 = 100.0 * np.sum(hard < 0.10) / n if n > 0 else 0.0

    return ResultatDuplicatas(
        dup1=d1,
        dup2=d2,
        n_total=n,
        moyennes=moyennes,
        diff_relative=diff_rel,
        hard_values=hard_sorted,
        hard_ranks=ranks,
        n_hors_10pct=n_10,
        n_hors_20pct=n_20,
        n_hors_30pct=n_30,
        pct_hard_sous_10=pct_sous_10,
    )


def diagnostic_duplicatas(resultat: ResultatDuplicatas) -> str:
    """Produit un diagnostic textuel de l'analyse des duplicatas.

    Parameters
    ----------
    resultat : ResultatDuplicatas

    Returns
    -------
    str
        Texte de diagnostic avec interprétation.
    """
    r = resultat
    lines = [
        f"Analyse des duplicatas — {r.n_total} paires",
        "-" * 50,
        f"  Hors ±10 % : {r.n_hors_10pct:4d}  ({100*r.n_hors_10pct/r.n_total:.1f} %)",
        f"  Hors ±20 % : {r.n_hors_20pct:4d}  ({100*r.n_hors_20pct/r.n_total:.1f} %)",
        f"  Hors ±30 % : {r.n_hors_30pct:4d}  ({100*r.n_hors_30pct/r.n_total:.1f} %)",
        "",
        f"  Critère HARD 90/10 : {r.pct_hard_sous_10:.1f} % des paires ont HARD < 10 %",
        "",
    ]

    # Interprétation HARD
    if r.pct_hard_sous_10 >= 90:
        lines.append("✅  Critère HARD 90/10 respecté. Reproductibilité acceptable.")
    elif r.pct_hard_sous_10 >= 80:
        lines.append("⚠️  Critère HARD 90/10 presque atteint. Surveillance recommandée.")
    else:
        lines.append("❌  Critère HARD 90/10 non respecté. Reproductibilité insuffisante.")
        lines.append("    → Investiguer les sources de variabilité (préparation, analyse).")

    # Interprétation tolérance
    pct_10 = 100 * r.n_hors_10pct / r.n_total
    if pct_10 > 10:
        lines.append(f"⚠️  {pct_10:.0f} % des paires hors ±10 %. Vérifier le protocole.")

    return "\n".join(lines)

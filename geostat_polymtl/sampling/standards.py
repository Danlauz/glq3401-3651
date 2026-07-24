"""
Analyse des standards analytiques (QA/QC).

Ce module implémente :

- La simulation de séries de standards avec anomalies contrôlées ;
- Les règles de détection d'anomalies de Western Electric ;
- L'analyse d'un jeu de données réel de standards ;
- Un diagnostic textuel automatique.

Référence : Western Electric (1956). *Statistical Quality Control Handbook*.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional

import numpy as np
from numpy.typing import ArrayLike


# ---------------------------------------------------------------------------
# Résultat structuré
# ---------------------------------------------------------------------------

@dataclass
class ResultatStandards:
    """Résultat de l'analyse de standards.

    Attributes
    ----------
    valeurs : np.ndarray
        Valeurs mesurées des standards.
    moyenne_attendue : float
        Valeur certifiée attendue du standard.
    ecart_type : float
        Écart-type utilisé pour les règles de contrôle.
    anomalies : Dict[str, List[int]]
        Indices des anomalies détectées par critère.
    n_total : int
        Nombre total de mesures.
    n_anomalies : int
        Nombre total d'indices signalés (peut contenir des doublons entre critères).
    """

    valeurs: np.ndarray
    moyenne_attendue: float
    ecart_type: float
    anomalies: Dict[str, List[int]]
    n_total: int
    n_anomalies: int


# ---------------------------------------------------------------------------
# Règles de Western Electric
# ---------------------------------------------------------------------------

def detecter_anomalies(
    valeurs: ArrayLike,
    moyenne: float,
    ecart_type: float,
) -> Dict[str, List[int]]:
    """Applique les 4 règles de Western Electric pour la détection d'anomalies.

    Les règles sont :

    1. Un point au-delà de ±3σ.
    2. Deux points consécutifs au-delà de ±2σ, du même côté.
    3. Quatre points consécutifs au-delà de ±1σ, du même côté.
    4. Huit points consécutifs du même côté de la moyenne.

    Parameters
    ----------
    valeurs : array-like
        Série de mesures du standard.
    moyenne : float
        Valeur certifiée (moyenne attendue).
    ecart_type : float
        Écart-type de contrôle (σ).

    Returns
    -------
    dict
        Dictionnaire ``{critère: [indices]}`` avec les indices signalés.

    Examples
    --------
    >>> import numpy as np
    >>> from qaqc_gy.standards import detecter_anomalies
    >>> vals = np.array([50.0, 50.1, 54.0, 50.2])
    >>> anom = detecter_anomalies(vals, moyenne=50.0, ecart_type=1.0)
    >>> print(anom["Critère 1"])
    [2]
    """
    series = np.asarray(valeurs, dtype=float)
    n = len(series)
    anomalies: Dict[str, List[int]] = {
        "Critère 1": [],
        "Critère 2": [],
        "Critère 3": [],
        "Critère 4": [],
    }

    mu = moyenne
    sigma = ecart_type

    # Critère 1 : |x - μ| > 3σ
    for i in range(n):
        if abs(series[i] - mu) > 3 * sigma:
            anomalies["Critère 1"].append(i)

    # Critère 2 : 2 consécutifs au-delà de ±2σ, même côté
    for i in range(n - 1):
        if (series[i] - mu > 2 * sigma and series[i + 1] - mu > 2 * sigma) or \
           (series[i] - mu < -2 * sigma and series[i + 1] - mu < -2 * sigma):
            anomalies["Critère 2"].extend([i, i + 1])

    # Critère 3 : 4 consécutifs au-delà de ±1σ, même côté
    side = np.sign(series - mu)
    outside = np.abs(series - mu) > sigma
    count = 0
    for i in range(n):
        if outside[i] and (i == 0 or side[i] == side[i - 1]):
            count += 1
        else:
            count = 1 if outside[i] else 0
        if count >= 4:
            anomalies["Critère 3"].append(i)

    # Critère 4 : 8 consécutifs du même côté de μ
    count_8 = 0
    for i in range(n):
        if i == 0 or (side[i] == side[i - 1] and side[i] != 0):
            count_8 += 1
        else:
            count_8 = 1
        if count_8 >= 8:
            anomalies["Critère 4"].append(i)

    # Dédupliquer chaque critère
    for k in anomalies:
        anomalies[k] = sorted(set(anomalies[k]))

    return anomalies


# ---------------------------------------------------------------------------
# Simulation
# ---------------------------------------------------------------------------

def _covariance_spherique_1d(n: int, portee: float) -> np.ndarray:
    """Matrice de covariance sphérique 1D."""
    h = np.abs(np.subtract.outer(np.arange(n), np.arange(n)))
    return np.where(
        h <= portee,
        1 - 1.5 * h / portee + 0.5 * (h / portee) ** 3,
        0.0,
    )


def simuler_standards(
    n_points: int = 501,
    valeur_attendue: float = 50.0,
    bruit: float = 1.0,
    portee_correlation: float = 10.0,
    pente_tendance: float = 0.0,
    n_erreurs_transcription: int = 0,
    amplitude_erreur: float = 2.0,
    zone_erreurs: float = 0.2,
    changement_methode: bool = False,
    point_changement: int = 250,
    amplitude_changement: float = 5.0,
    seed: Optional[int] = 42,
) -> np.ndarray:
    """Simule une série temporelle de mesures d'un standard.

    Parameters
    ----------
    n_points : int
        Nombre de mesures.
    valeur_attendue : float
        Valeur certifiée du standard (ppm).
    bruit : float
        Niveau de bruit (variance du bruit corrélé).
    portee_correlation : float
        Portée de la corrélation spatiale (modèle sphérique).
    pente_tendance : float
        Pente d'une tendance linéaire.
    n_erreurs_transcription : int
        Nombre d'erreurs de transcription à injecter.
    amplitude_erreur : float
        Amplitude des erreurs de transcription (ppm).
    zone_erreurs : float
        Fraction de la série dans laquelle les erreurs sont placées (0 à 1).
    changement_methode : bool
        Si True, injecte un changement de méthode.
    point_changement : int
        Indice du changement de méthode.
    amplitude_changement : float
        Amplitude du changement de méthode (ppm).
    seed : int, optional
        Graine aléatoire.

    Returns
    -------
    np.ndarray
        Série simulée.
    """
    rng = np.random.default_rng(seed)
    t = np.arange(n_points)
    base = valeur_attendue + pente_tendance * (t - n_points // 2)

    # Bruit corrélé (covariance sphérique)
    cov = _covariance_spherique_1d(n_points, portee_correlation)
    L = np.linalg.cholesky(cov + 1e-6 * np.eye(n_points))
    z = rng.standard_normal(n_points)
    noise = L @ z
    noise = noise / np.std(noise) * np.sqrt(bruit)
    series = base + noise

    # Erreurs de transcription
    max_idx = max(1, int(n_points * zone_erreurs))
    if n_erreurs_transcription > 0 and max_idx > 0:
        n_err = min(n_erreurs_transcription, max_idx)
        indices = rng.choice(max_idx, size=n_err, replace=False)
        signs = rng.choice([-1, 1], size=n_err)
        series[indices] += signs * amplitude_erreur

    # Changement de méthode
    if changement_methode and 0 < point_changement < n_points:
        series[point_changement:] += amplitude_changement

    return series


# ---------------------------------------------------------------------------
# Analyse de données réelles
# ---------------------------------------------------------------------------

def analyser_standards(
    valeurs: ArrayLike,
    moyenne_attendue: float,
    ecart_type: float,
) -> ResultatStandards:
    """Analyse une série de standards avec les règles de Western Electric.

    Parameters
    ----------
    valeurs : array-like
        Mesures du standard.
    moyenne_attendue : float
        Valeur certifiée du standard.
    ecart_type : float
        Écart-type de contrôle (σ).

    Returns
    -------
    ResultatStandards
        Résultat structuré.

    Examples
    --------
    >>> from qaqc_gy.standards import simuler_standards, analyser_standards
    >>> vals = simuler_standards(n_points=100, bruit=1.0)
    >>> r = analyser_standards(vals, moyenne_attendue=50.0, ecart_type=1.0)
    >>> print(f"Anomalies critère 1 : {len(r.anomalies['Critère 1'])}")
    """
    v = np.asarray(valeurs, dtype=float)
    anomalies = detecter_anomalies(v, moyenne_attendue, ecart_type)

    all_indices = set()
    for indices in anomalies.values():
        all_indices.update(indices)

    return ResultatStandards(
        valeurs=v,
        moyenne_attendue=moyenne_attendue,
        ecart_type=ecart_type,
        anomalies=anomalies,
        n_total=len(v),
        n_anomalies=len(all_indices),
    )


def diagnostic_standards(resultat: ResultatStandards) -> str:
    """Produit un diagnostic textuel de l'analyse des standards.

    Parameters
    ----------
    resultat : ResultatStandards

    Returns
    -------
    str
        Texte de diagnostic avec interprétation.
    """
    r = resultat
    lines = [
        f"Analyse des standards — {r.n_total} mesures",
        f"Valeur attendue : {r.moyenne_attendue}, σ = {r.ecart_type}",
        "-" * 50,
    ]

    descriptions = {
        "Critère 1": "Un point au-delà de ±3σ (anomalie majeure)",
        "Critère 2": "Deux consécutifs au-delà de ±2σ, même côté (biais temporaire)",
        "Critère 3": "Quatre consécutifs au-delà de ±1σ, même côté (dérive)",
        "Critère 4": "Huit consécutifs du même côté de μ (changement systématique)",
    }

    total_anom = 0
    for crit, desc in descriptions.items():
        n = len(r.anomalies[crit])
        total_anom += n
        flag = "⚠️" if n > 0 else "  "
        lines.append(f"  {flag} {crit} : {n:3d} signalements — {desc}")

    lines.append("")
    if total_anom == 0:
        lines.append("✅  Aucune anomalie détectée. Processus sous contrôle.")
    else:
        pct = 100 * r.n_anomalies / r.n_total
        lines.append(f"❌  {r.n_anomalies} points signalés ({pct:.1f} % des mesures).")
        if len(r.anomalies["Critère 1"]) > 0:
            lines.append("    → Vérifier les points extrêmes (erreurs de transcription ?).")
        if len(r.anomalies["Critère 4"]) > 0:
            lines.append("    → Investiguer un possible changement de méthode ou d'équipement.")
        if len(r.anomalies["Critère 3"]) > 0:
            lines.append("    → Dérive progressive suspectée — recalibration recommandée.")

    return "\n".join(lines)

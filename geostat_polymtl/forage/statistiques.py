"""
Statistiques descriptives pour l'analyse exploratoire (chap. 04).

Calcule les indicateurs présentés dans l'atelier exploratoire : effectif,
moyenne, médiane, quartiles, écart-interquartile, variance, écart-type,
coefficient de variation, minimum et maximum.

Convention des quantiles (identique au widget JS)
-------------------------------------------------
Les quartiles utilisent la méthode du **rang inférieur** (``floor``) employée
par le widget :

- ``Q1 = valeurs_triées[floor(n · 0.25)]``
- ``Q3 = valeurs_triées[floor(n · 0.75)]``

et la médiane est la moyenne des deux valeurs centrales si ``n`` est pair.
La variance est l'estimateur **non biaisé** (division par ``n − 1``).

Ce choix volontaire (et non l'interpolation linéaire de NumPy) garantit que
les résultats coïncident exactement avec ceux affichés par le widget et donc
avec les *golden vectors*.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Sequence


@dataclass
class StatistiquesDescriptives:
    """Indicateurs descriptifs d'un échantillon de valeurs."""

    n: int
    moyenne: float
    mediane: float
    q1: float
    q3: float
    iqr: float
    variance: float
    ecart_type: float
    cv: float
    minimum: float
    maximum: float


def decrire(valeurs: Sequence[float]) -> StatistiquesDescriptives:
    """Calcule les statistiques descriptives d'un échantillon.

    Parameters
    ----------
    valeurs : séquence de float
        Au moins deux valeurs (la variance non biaisée requiert ``n ≥ 2``).

    Returns
    -------
    StatistiquesDescriptives

    Raises
    ------
    ValueError
        Si moins de deux valeurs sont fournies.
    """
    vals = sorted(float(v) for v in valeurs)
    n = len(vals)
    if n < 2:
        raise ValueError("Au moins deux valeurs sont requises.")

    moyenne = sum(vals) / n
    if n % 2:
        mediane = vals[n // 2]
    else:
        mediane = (vals[n // 2 - 1] + vals[n // 2]) / 2.0

    q1 = vals[math.floor(n * 0.25)]
    q3 = vals[math.floor(n * 0.75)]
    iqr = q3 - q1

    variance = sum((v - moyenne) ** 2 for v in vals) / (n - 1)
    ecart_type = math.sqrt(variance)
    cv = ecart_type / moyenne if moyenne else math.nan

    return StatistiquesDescriptives(
        n=n,
        moyenne=moyenne,
        mediane=mediane,
        q1=q1,
        q3=q3,
        iqr=iqr,
        variance=variance,
        ecart_type=ecart_type,
        cv=cv,
        minimum=vals[0],
        maximum=vals[-1],
    )

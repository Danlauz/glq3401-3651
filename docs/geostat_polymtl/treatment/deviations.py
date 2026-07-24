"""
Trajectoire de forage par la méthode des points milieux — chap. 04.

Reconstruit les coordonnées (X, Y, Z) le long d'un forage à partir des mesures
de déviation (profondeur mesurée, azimut, plongée) et des coordonnées du collet.

Conventions :
- Azimut (°) : 0–360°, depuis le Nord, sens horaire.
- Plongée (°) : angle sous l'horizontale (90° = forage vertical descendant).
- Z positif vers le haut (la plongée produit un dZ négatif).

Migration de ``python_code/C04TraitementStatistique/deviations.py``.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional, Tuple

import numpy as np


@dataclass
class MesureDeviation:
    """Une mesure de déviation à une station.

    Attributes
    ----------
    md : float
        Profondeur mesurée (Measured Depth, m).
    azimut : float
        Azimut (degrés, 0–360, depuis le Nord, sens horaire).
    plongee : float
        Plongée (degrés sous l'horizontale ; 0 = horizontal, 90 = vertical).
    """
    md: float
    azimut: float
    plongee: float


@dataclass
class PointTrajectoire:
    """Un point calculé sur la trajectoire (md, x, y, z)."""
    md: float
    x: float
    y: float
    z: float


@dataclass
class ResultatTrajectoire:
    """Résultat complet du calcul de trajectoire."""
    collet: Tuple[float, float, float]
    stations: List[PointTrajectoire]
    interpolations: List[PointTrajectoire]
    cosinus_directeurs: List[Tuple[float, float, float, float]]


def cosinus_directeurs(mesures: List[MesureDeviation]) -> List[Tuple[float, float, float, float]]:
    """Cosinus directeurs (md, lx, ly, lz) pour chaque station.

    lx = Est, ly = Nord, lz = vertical (négatif vers le bas).
    """
    result = []
    for m in mesures:
        azi_rad = np.deg2rad(m.azimut)
        inc_rad = np.deg2rad(m.plongee)
        lx = np.cos(inc_rad) * np.sin(azi_rad)
        ly = np.cos(inc_rad) * np.cos(azi_rad)
        lz = -np.sin(inc_rad)
        result.append((m.md, float(lx), float(ly), float(lz)))
    return result


def calculer_trajectoire(
    mesures: List[MesureDeviation],
    collet: Tuple[float, float, float] = (0, 0, 0),
) -> List[PointTrajectoire]:
    """Trajectoire par la méthode des points milieux (inclut le collet)."""
    n = len(mesures)
    if n == 0:
        return [PointTrajectoire(0, *collet)]

    depths = [m.md for m in mesures]
    cos_dirs = cosinus_directeurs(mesures)

    seg_lengths = []
    for i in range(n):
        if i == 0:
            seg = (depths[1] - depths[0]) / 2 if n > 1 else 0
        elif i == n - 1:
            seg = (depths[-1] - depths[-2]) / 2
        else:
            seg = (depths[i + 1] - depths[i - 1]) / 2
        seg_lengths.append(seg)

    x, y, z = collet
    points = [PointTrajectoire(0, x, y, z)]
    for i in range(n):
        _, lx, ly, lz = cos_dirs[i]
        x, y, z = x + seg_lengths[i] * lx, y + seg_lengths[i] * ly, z + seg_lengths[i] * lz
        points.append(PointTrajectoire(depths[i], x, y, z))
    return points


def interpoler_profondeurs(
    mesures: List[MesureDeviation],
    collet: Tuple[float, float, float] = (0, 0, 0),
    profondeurs_cibles: Optional[List[float]] = None,
) -> List[PointTrajectoire]:
    """Interpole les coordonnées à des profondeurs MD arbitraires.

    Examples
    --------
    >>> from geostat_polymtl.treatment.deviations import MesureDeviation, interpoler_profondeurs
    >>> mesures = [MesureDeviation(0, 90, 40), MesureDeviation(40, 100, 35), MesureDeviation(75, 110, 25)]
    >>> pts = interpoler_profondeurs(mesures, collet=(0, 50, 32), profondeurs_cibles=[30, 60])
    >>> len(pts)
    2
    """
    if not profondeurs_cibles:
        return []

    n = len(mesures)
    cos_dirs = cosinus_directeurs(mesures)
    depths = [m.md for m in mesures]

    seg_lengths = []
    for i in range(n):
        if n == 1:
            seg = 1e8
        elif i == 0:
            seg = (depths[1] - depths[0]) / 2
        elif i == n - 1:
            seg = 1e8
        else:
            seg = (depths[i + 1] - depths[i - 1]) / 2
        seg_lengths.append(seg)

    result = []
    for target in profondeurs_cibles:
        x, y, z = collet
        depth_accum = 0.0
        for i in range(n):
            _, lx, ly, lz = cos_dirs[i]
            seg = seg_lengths[i]
            if target <= depth_accum + seg:
                remaining = target - depth_accum
                x += remaining * lx
                y += remaining * ly
                z += remaining * lz
                break
            else:
                x += seg * lx
                y += seg * ly
                z += seg * lz
                depth_accum += seg
        result.append(PointTrajectoire(target, x, y, z))
    return result


def reconstruire_forage(
    mesures: List[MesureDeviation],
    collet: Tuple[float, float, float] = (0, 0, 0),
    profondeurs_cibles: Optional[List[float]] = None,
) -> ResultatTrajectoire:
    """Reconstruit la trajectoire complète (stations + interpolations)."""
    return ResultatTrajectoire(
        collet=collet,
        stations=calculer_trajectoire(mesures, collet),
        interpolations=interpoler_profondeurs(mesures, collet, profondeurs_cibles),
        cosinus_directeurs=cosinus_directeurs(mesures),
    )


def trajectoire_vers_tableau(resultat: ResultatTrajectoire) -> str:
    """Tableau récapitulatif de la trajectoire."""
    lines = [
        f"Trajectoire de forage — collet = {resultat.collet}",
        "-" * 55,
        f"{'MD (m)':<10s} {'X':<12s} {'Y':<12s} {'Z':<12s}",
        "-" * 55,
    ]
    for p in resultat.stations:
        lines.append(f"{p.md:<10.1f} {p.x:<12.2f} {p.y:<12.2f} {p.z:<12.2f}")
    if resultat.interpolations:
        lines.append("\nInterpolations :")
        lines.append("-" * 55)
        for p in resultat.interpolations:
            lines.append(f"{p.md:<10.1f} {p.x:<12.2f} {p.y:<12.2f} {p.z:<12.2f}")
    return "\n".join(lines)

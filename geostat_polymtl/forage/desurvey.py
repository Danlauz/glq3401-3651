"""
Désurvey d'un forage par la méthode tangentielle équilibrée (chap. 04).

À partir d'un relevé de déviation (stations ``md`` / azimut / inclinaison), on
reconstruit la trajectoire du forage en coordonnées cartésiennes locales
(le collet est à l'origine). On peut ensuite interpoler la position des
composites le long de cette trajectoire.

Convention angulaire (identique au widget JS du chapitre)
---------------------------------------------------------
- ``md``  : profondeur mesurée le long du trou (m).
- ``az``  : azimut en degrés (Nord = 0°, sens horaire).
- ``inc`` : inclinaison en degrés telle qu'utilisée par la formule ci-dessous
  (la composante verticale est ``cos(inc)``, l'horizontale ``sin(inc)``).

Les coordonnées renvoyées suivent la convention du widget : ``x`` vers l'Est,
``y`` vers le Nord, ``z`` vers le bas négatif (``z`` décroît avec la
profondeur).

Cette implémentation reproduit **exactement** la fonction JavaScript
``Ch4.balancedTangential`` afin que les *golden vectors* concordent.
"""
from __future__ import annotations

from dataclasses import dataclass
from math import cos, pi, sin
from typing import List, Sequence, Tuple, Union

Station = Union["StationForage", dict, Tuple[float, float, float]]


@dataclass
class StationForage:
    """Une station de relevé de déviation.

    Attributes
    ----------
    md : float
        Profondeur mesurée le long du trou (m).
    az : float
        Azimut (degrés, Nord = 0°, sens horaire).
    inc : float
        Inclinaison (degrés).
    """

    md: float
    az: float
    inc: float


@dataclass
class PointTrajectoire:
    """Un point calculé de la trajectoire du forage."""

    md: float
    x: float
    y: float
    z: float


def _coerce(station: Station) -> Tuple[float, float, float]:
    """Normalise une station (dataclass, dict ou tuple) en (md, az, inc)."""
    if isinstance(station, StationForage):
        return station.md, station.az, station.inc
    if isinstance(station, dict):
        return float(station["md"]), float(station["az"]), float(station["inc"])
    md, az, inc = station
    return float(md), float(az), float(inc)


def tangentielle_equilibree(stations: Sequence[Station]) -> List[PointTrajectoire]:
    """Reconstruit la trajectoire d'un forage par la méthode tangentielle équilibrée.

    Parameters
    ----------
    stations : séquence de stations
        Chaque station fournit ``md``, ``az`` et ``inc`` (degrés). Au moins
        une station est requise ; la première fixe l'origine.

    Returns
    -------
    list of PointTrajectoire
        Les points de la trajectoire, dans l'ordre des stations. Le premier
        point est à l'origine (collet).

    Notes
    -----
    Pour un segment entre deux stations séparées de ``Δmd`` :

    .. math::

        \\Delta x = \\frac{\\Delta md}{2}\\,(\\sin I_1 \\sin Az_1 + \\sin I_2 \\sin Az_2)

        \\Delta y = \\frac{\\Delta md}{2}\\,(\\sin I_1 \\cos Az_1 + \\sin I_2 \\cos Az_2)

        \\Delta z = \\frac{\\Delta md}{2}\\,(\\cos I_1 + \\cos I_2)

    avec ``z`` décroissant (``z_2 = z_1 - \\Delta z``).
    """
    if not stations:
        return []

    md0, _, _ = _coerce(stations[0])
    pts = [PointTrajectoire(md=md0, x=0.0, y=0.0, z=0.0)]

    for i in range(1, len(stations)):
        md1, az1, inc1 = _coerce(stations[i - 1])
        md2, az2, inc2 = _coerce(stations[i])
        dmd = md2 - md1
        I1, A1 = inc1 * pi / 180.0, az1 * pi / 180.0
        I2, A2 = inc2 * pi / 180.0, az2 * pi / 180.0
        prev = pts[-1]
        dx = dmd / 2.0 * (sin(I1) * sin(A1) + sin(I2) * sin(A2))
        dy = dmd / 2.0 * (sin(I1) * cos(A1) + sin(I2) * cos(A2))
        dz = dmd / 2.0 * (cos(I1) + cos(I2))
        pts.append(
            PointTrajectoire(md=md2, x=prev.x + dx, y=prev.y + dy, z=prev.z - dz)
        )
    return pts


def composites_positions(
    pts: Sequence[PointTrajectoire], longueur: float, md_max: float
) -> List[PointTrajectoire]:
    """Interpole la position des composites le long de la trajectoire.

    Les composites sont centrés à ``longueur/2``, ``3·longueur/2``, … tant que
    leur centre n'excède pas ``md_max``. La position est obtenue par
    interpolation linéaire entre les deux points de trajectoire encadrant le
    ``md`` cible. Reproduit la boucle du widget JS des déviations.

    Parameters
    ----------
    pts : séquence de PointTrajectoire
        Trajectoire issue de :func:`tangentielle_equilibree`.
    longueur : float
        Longueur (pas) des composites le long du trou (m).
    md_max : float
        Profondeur maximale (m) au-delà de laquelle on n'ajoute plus de
        composite.

    Returns
    -------
    list of PointTrajectoire
        Centres des composites, avec leur ``md`` et leurs coordonnées.
    """
    comps: List[PointTrajectoire] = []
    if longueur <= 0 or len(pts) < 2:
        return comps

    md = longueur / 2.0
    while md <= md_max:
        seg = 0
        for i in range(1, len(pts)):
            if md <= pts[i].md:
                seg = i
                break
        if seg == 0:
            seg = len(pts) - 1
        p1, p2 = pts[seg - 1], pts[seg]
        denom = (p2.md - p1.md) or 1.0
        frac = (md - p1.md) / denom
        comps.append(
            PointTrajectoire(
                md=md,
                x=p1.x + (p2.x - p1.x) * frac,
                y=p1.y + (p2.y - p1.y) * frac,
                z=p1.z + (p2.z - p1.z) * frac,
            )
        )
        md += longueur
    return comps

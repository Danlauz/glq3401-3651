"""Géométrie d'orientation 3D pour forages et plans (annexe A du livre).

Source unique de vérité pour les ateliers interactifs de l'annexe A
(vecteurs, conventions d'orientation d'un plan, intersection plan–forage,
ellipse d'intersection plan–cylindre). Les widgets JS délèguent tous leurs
calculs à ce module via Pyodide ; côté JS il ne reste que l'affichage.

Conventions (identiques à :mod:`geostat_polymtl.treatment.deviations`) :

- repère ENU : ``x`` = Est, ``y`` = Nord, ``z`` = Haut ;
- azimut en degrés, mesuré depuis le Nord, sens horaire ;
- plongée en degrés sous l'horizontale (0 = horizontal, 90 = vertical),
  positive vers le bas.
"""
from __future__ import annotations

from typing import Optional, Sequence, Tuple

import numpy as np

__all__ = [
    "vecteur_unitaire",
    "direction_unitaire",
    "pole_depuis_pendage",
    "pendage_depuis_pole",
    "pendage_depuis_geologique",
    "geologique_depuis_pendage",
    "conversions_plan",
    "base_plan",
    "intersection_plan_forage",
    "ellipse_intersection_plan_cylindre",
]

_EPS = 1e-12


def _normaliser_azimut(a: float) -> float:
    """Ramène un azimut dans [0, 360)."""
    return float(a % 360.0 + 360.0) % 360.0


def vecteur_unitaire(azimut: float, plongee: float) -> np.ndarray:
    """Vecteur unitaire ENU défini par (azimut, plongée).

    Parameters
    ----------
    azimut : float
        Azimut en degrés (0–360, depuis le Nord, sens horaire).
    plongee : float
        Plongée en degrés sous l'horizontale (positive vers le bas).

    Returns
    -------
    np.ndarray, shape (3,)
        ``(lx, ly, lz)`` avec lx = Est, ly = Nord, lz = vertical
        (négatif vers le bas) — mêmes formules que
        :func:`geostat_polymtl.treatment.deviations.cosinus_directeurs`.
    """
    a = np.deg2rad(float(azimut))
    b = np.deg2rad(float(plongee))
    return np.array([
        np.cos(b) * np.sin(a),
        np.cos(b) * np.cos(a),
        -np.sin(b),
    ], dtype=float)


def direction_unitaire(azimut: float) -> np.ndarray:
    """Vecteur horizontal unitaire d'azimut donné (plongée nulle)."""
    return vecteur_unitaire(azimut, 0.0)


# ---------------------------------------------------------------------------
# Conversions entre conventions d'orientation d'un plan
# ---------------------------------------------------------------------------

def pole_depuis_pendage(ad: float, bd: float) -> Tuple[float, float]:
    """(azimut, plongée) du pôle à partir du vecteur de pendage."""
    return _normaliser_azimut(ad + 180.0), float(np.clip(90.0 - bd, 0.0, 90.0))


def pendage_depuis_pole(ap: float, bp: float) -> Tuple[float, float]:
    """(azimut, plongée) du vecteur de pendage à partir du pôle."""
    return _normaliser_azimut(ap - 180.0), float(np.clip(90.0 - bp, 0.0, 90.0))


def pendage_depuis_geologique(ag: float, bg: float) -> Tuple[float, float]:
    """(azimut, plongée) du vecteur de pendage à partir de la convention
    géologique (direction ``ag``, pendage ``bg``, règle de la main droite)."""
    return _normaliser_azimut(ag + 90.0), float(np.clip(bg, 0.0, 90.0))


def geologique_depuis_pendage(ad: float, bd: float) -> Tuple[float, float]:
    """(direction, pendage) géologiques à partir du vecteur de pendage."""
    return _normaliser_azimut(ad - 90.0), float(np.clip(bd, 0.0, 90.0))


def conversions_plan(convention: str, a: float, b: float) -> dict:
    """Convertit l'orientation d'un plan exprimée dans une convention vers
    les trois conventions usuelles, avec les vecteurs unitaires associés.

    Parameters
    ----------
    convention : {'pole', 'pendage', 'geologique'}
        Convention des angles d'entrée.
    a, b : float
        Angles (azimut/direction, plongée/pendage) en degrés.

    Returns
    -------
    dict
        ``ap, bp`` (pôle), ``ad, bd`` (vecteur de pendage), ``ag, bg``
        (convention géologique), et les vecteurs unitaires ``normale``
        (pôle, vers le bas), ``pendage`` et ``direction`` (horizontal).
    """
    if convention == "pole":
        ap, bp = _normaliser_azimut(a), float(np.clip(b, 0.0, 90.0))
        ad, bd = pendage_depuis_pole(ap, bp)
    elif convention == "pendage":
        ad, bd = _normaliser_azimut(a), float(np.clip(b, 0.0, 90.0))
        ap, bp = pole_depuis_pendage(ad, bd)
    elif convention == "geologique":
        ad, bd = pendage_depuis_geologique(a, b)
        ap, bp = pole_depuis_pendage(ad, bd)
    else:
        raise ValueError(
            f"Convention '{convention}' inconnue "
            "(choix : 'pole', 'pendage', 'geologique')."
        )
    ag, bg = geologique_depuis_pendage(ad, bd)

    return {
        "ap": ap, "bp": bp,
        "ad": ad, "bd": bd,
        "ag": ag, "bg": bg,
        "normale": vecteur_unitaire(ap, bp),
        "pendage": vecteur_unitaire(ad, bd),
        "direction": direction_unitaire(ag),
    }


# ---------------------------------------------------------------------------
# Géométrie plan / forage / cylindre
# ---------------------------------------------------------------------------

def base_plan(normale: Sequence[float]) -> Tuple[np.ndarray, np.ndarray]:
    """Base orthonormée (e1, e2) du plan de normale donnée.

    ``e1`` est horizontal lorsque le plan n'est pas horizontal
    (e1 = n × ez normalisé, repli sur n × ex si dégénéré).
    """
    n = np.asarray(normale, dtype=float)
    n = n / max(np.linalg.norm(n), _EPS)
    e1 = np.cross(n, np.array([0.0, 0.0, 1.0]))
    if np.linalg.norm(e1) < 1e-6:
        e1 = np.cross(n, np.array([1.0, 0.0, 0.0]))
    e1 = e1 / max(np.linalg.norm(e1), _EPS)
    e2 = np.cross(n, e1)
    e2 = e2 / max(np.linalg.norm(e2), _EPS)
    return e1, e2


def intersection_plan_forage(
    ap: float,
    bp: float,
    af: float,
    bf: float,
    d: float,
    collet: Sequence[float] = (0.0, 0.0, 0.0),
) -> dict:
    """Intersection d'un forage rectiligne avec le plan ``n·x = d``.

    Parameters
    ----------
    ap, bp : float
        Azimut et plongée du pôle du plan (degrés).
    af, bf : float
        Azimut et plongée du forage (degrés).
    d : float
        Décalage du plan le long de sa normale (``n·x = d``).
    collet : sequence of 3 floats
        Position du collet du forage ``s0``.

    Returns
    -------
    dict
        ``normale``, ``direction_forage`` (vecteurs unitaires),
        ``intersecte`` (bool), ``t`` (distance signée à forer le long de s),
        ``point_intersection``, ``pied_perpendiculaire``,
        ``distance_minimale`` (distance de s0 au plan),
        ``angle_deg`` (angle aigu entre le forage et la normale),
        ``e1``, ``e2`` (base orthonormée du plan).
    """
    n = vecteur_unitaire(ap, bp)
    s = vecteur_unitaire(af, bf)
    s0 = np.asarray(collet, dtype=float)

    ecart = float(d) - float(np.dot(n, s0))
    p_perp = s0 + ecart * n
    distance_min = abs(ecart)

    denom = float(np.dot(n, s))
    intersecte = abs(denom) >= 1e-8
    if intersecte:
        t = ecart / denom
        pi = s0 + t * s
    else:
        t = float("nan")
        pi = np.full(3, np.nan)

    cos_theta = abs(float(np.clip(np.dot(n, s), -1.0, 1.0)))
    angle_deg = float(np.rad2deg(np.arccos(cos_theta)))

    e1, e2 = base_plan(n)
    return {
        "normale": n,
        "direction_forage": s,
        "intersecte": bool(intersecte),
        "t": float(t),
        "point_intersection": pi,
        "pied_perpendiculaire": p_perp,
        "distance_minimale": float(distance_min),
        "angle_deg": angle_deg,
        "e1": e1,
        "e2": e2,
    }


def ellipse_intersection_plan_cylindre(
    ap: float,
    bp: float,
    rayon: float = 1.0,
    n_points: int = 361,
) -> Optional[dict]:
    """Ellipse d'intersection entre un cylindre vertical (axe z, rayon R)
    et un plan passant par l'origine, de pôle (ap, bp).

    Résultat analytique : le petit axe vaut ``R`` (horizontal, dans le plan),
    le grand axe vaut ``R / |n_z|`` orienté selon la ligne de plus grande
    pente du plan.

    Returns
    -------
    dict or None
        ``None`` si le plan est quasi vertical (``|n_z|`` < 1e-4 : pas
        d'ellipse fermée). Sinon : ``points`` (n_points × 3 sur la courbe),
        ``grand_axe``, ``petit_axe`` (directions unitaires),
        ``demi_grand``, ``demi_petit`` (longueurs), ``normale``.
    """
    n = vecteur_unitaire(ap, bp)
    nz = float(n[2])
    if abs(nz) < 1e-4:
        return None

    R = float(rayon)
    t = np.linspace(0.0, 2.0 * np.pi, int(n_points))
    x = R * np.cos(t)
    y = R * np.sin(t)
    z = -(n[0] * x + n[1] * y) / nz
    points = np.column_stack([x, y, z])

    # Grand axe : projection de l'axe du cylindre (ez) sur le plan,
    # i.e. ligne de plus grande pente.
    ez = np.array([0.0, 0.0, 1.0])
    g = ez - float(np.dot(ez, n)) * n
    norme_g = np.linalg.norm(g)
    if norme_g < _EPS:   # plan horizontal : cercle, axes arbitraires
        grand_axe = np.array([1.0, 0.0, 0.0])
    else:
        grand_axe = g / norme_g
    petit_axe = np.cross(n, grand_axe)
    petit_axe = petit_axe / max(np.linalg.norm(petit_axe), _EPS)

    return {
        "points": points,
        "grand_axe": grand_axe,
        "petit_axe": petit_axe,
        "demi_grand": R / abs(nz),
        "demi_petit": R,
        "normale": n,
    }

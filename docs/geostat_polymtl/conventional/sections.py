"""
Méthode des sections (coupes) — chap. 05.

Estimation du volume, du tonnage et du métal contenu entre deux sections
parallèles d'aires ``S1`` et ``S2`` distantes de ``L`` :

- **moyenne (trapèze)** : :math:`V = \\frac{S_1 + S_2}{2}\\,L` ;
- **tronc / prismoïdale** : :math:`V = \\frac{L}{3}\\,(S_1 + S_2 + \\sqrt{S_1 S_2})`
  (formule du tronc de cône/pyramide, recommandée quand le rapport des aires
  est éloigné de 1).

La règle de transition usuelle : utiliser la formule du tronc lorsque
:math:`S_{min}/S_{max} < 0.5`, sinon la moyenne suffit.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict


def volume_entre_sections(S1: float, S2: float, L: float, methode: str = "moyenne") -> float:
    """Volume entre deux sections.

    Parameters
    ----------
    S1, S2 : float
        Aires des deux sections (m²).
    L : float
        Distance entre les sections (m).
    methode : {"moyenne", "tronc"}
        ``moyenne`` : trapèze ``(S1+S2)/2·L``.
        ``tronc``   : ``L/3·(S1+S2+√(S1·S2))``.

    Returns
    -------
    float
        Volume (m³).

    Examples
    --------
    >>> volume_entre_sections(600, 1200, 20, "moyenne")
    18000.0
    >>> round(volume_entre_sections(600, 1200, 20, "tronc"), 1)
    17656.9
    """
    methode = methode.lower()
    if methode == "moyenne":
        return (S1 + S2) / 2.0 * L
    if methode in ("tronc", "prismoidal", "prismoidale", "cone"):
        return L / 3.0 * (S1 + S2 + (S1 * S2) ** 0.5)
    raise ValueError("methode doit être 'moyenne' ou 'tronc'.")


def tonnage(volume: float, densite: float) -> float:
    """Tonnage (t) = volume (m³) × densité (t/m³)."""
    return volume * densite


def metal_contenu(tonnage_t: float, teneur_pct: float) -> float:
    """Métal contenu (t) = tonnage (t) × teneur (%) / 100."""
    return tonnage_t * teneur_pct / 100.0


@dataclass
class ResultatSections:
    """Résultat comparatif de l'estimation par sections."""
    volume: float
    tonnage: float
    metal: float
    teneur_moyenne: float
    methode: str


def estimer_sections(
    S1: float, t1: float,
    S2: float, t2: float,
    L: float,
    densite: float,
    methode: str = "moyenne",
) -> ResultatSections:
    """Volume, tonnage, teneur moyenne et métal entre deux sections.

    La teneur moyenne est pondérée par les aires (proxy du tonnage de chaque
    section).

    Parameters
    ----------
    S1, S2 : float
        Aires (m²).
    t1, t2 : float
        Teneurs (%) des sections.
    L : float
        Distance entre sections (m).
    densite : float
        Masse volumique (t/m³).
    methode : {"moyenne", "tronc"}

    Returns
    -------
    ResultatSections
    """
    V = volume_entre_sections(S1, S2, L, methode)
    T = tonnage(V, densite)
    denom = S1 + S2
    t_moy = (S1 * t1 + S2 * t2) / denom if denom > 0 else 0.0
    M = metal_contenu(T, t_moy)
    return ResultatSections(volume=V, tonnage=T, metal=M,
                            teneur_moyenne=t_moy, methode=methode)


def comparer_methodes(
    S1: float, t1: float,
    S2: float, t2: float,
    L: float,
    densite: float,
) -> Dict[str, ResultatSections]:
    """Compare les méthodes « moyenne » et « tronc ».

    Returns
    -------
    dict
        ``{"moyenne": ResultatSections, "tronc": ResultatSections}``
    """
    return {
        "moyenne": estimer_sections(S1, t1, S2, t2, L, densite, "moyenne"),
        "tronc": estimer_sections(S1, t1, S2, t2, L, densite, "tronc"),
    }

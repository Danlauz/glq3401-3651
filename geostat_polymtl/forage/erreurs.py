"""
Propagation d'erreur sur le tonnage de métal (chap. 04).

Le tonnage de métal d'un bloc est :math:`M = V \\cdot d \\cdot t` (la teneur
``t`` étant exprimée en pourcent). Sous l'hypothèse de variables
indépendantes, l'erreur relative sur ``M`` se combine en quadrature à partir
des erreurs relatives sur le volume, la densité et la teneur.

Cette implémentation reproduit **exactement** le calcul du widget JS des
sources d'erreur (``errCalc``), y compris les contributions à la variance.
"""
from __future__ import annotations

import math
from dataclasses import dataclass


@dataclass
class PropagationTonnage:
    """Résultat de la propagation d'erreur sur le tonnage de métal.

    Attributes
    ----------
    M : float
        Tonnage de métal :math:`V \\cdot d \\cdot t/100` (t).
    sigma_M : float
        Incertitude absolue sur ``M`` (t).
    err_rel_M : float
        Erreur relative sur ``M`` (fraction).
    err_rel_V, err_rel_d, err_rel_t : float
        Erreurs relatives sur chaque paramètre (fraction).
    contrib_V, contrib_d, contrib_t : float
        Contribution de chaque paramètre à la variance relative de ``M`` (%).
    dominant : str
        Paramètre dominant : ``"Volume"``, ``"Densité"`` ou ``"Teneur"``.
    """

    M: float
    sigma_M: float
    err_rel_M: float
    err_rel_V: float
    err_rel_d: float
    err_rel_t: float
    contrib_V: float
    contrib_d: float
    contrib_t: float
    dominant: str


def propagation_tonnage(
    V: float,
    sigma_V: float,
    d: float,
    sigma_d: float,
    t: float,
    sigma_t: float,
) -> PropagationTonnage:
    """Propage l'incertitude sur :math:`M = V \\cdot d \\cdot t`.

    Parameters
    ----------
    V, sigma_V : float
        Volume (m³) et son incertitude absolue.
    d, sigma_d : float
        Densité (t/m³) et son incertitude absolue.
    t, sigma_t : float
        Teneur (%) et son incertitude absolue.

    Returns
    -------
    PropagationTonnage

    Notes
    -----
    .. math::

        \\frac{\\sigma_M}{M} = \\sqrt{
            \\left(\\frac{\\sigma_V}{V}\\right)^2
          + \\left(\\frac{\\sigma_d}{d}\\right)^2
          + \\left(\\frac{\\sigma_t}{t}\\right)^2}

    Chaque contribution est le carré de l'erreur relative rapporté à la somme
    des carrés (en pourcent).
    """
    M = V * d * (t / 100.0)
    r_V = sigma_V / V
    r_d = sigma_d / d
    r_t = sigma_t / t
    somme = r_V ** 2 + r_d ** 2 + r_t ** 2
    r_M = math.sqrt(somme)
    sigma_M = r_M * M

    contrib_V = r_V ** 2 / somme * 100.0
    contrib_d = r_d ** 2 / somme * 100.0
    contrib_t = r_t ** 2 / somme * 100.0

    if contrib_t > contrib_d and contrib_t > contrib_V:
        dominant = "Teneur"
    elif contrib_d > contrib_V:
        dominant = "Densité"
    else:
        dominant = "Volume"

    return PropagationTonnage(
        M=M,
        sigma_M=sigma_M,
        err_rel_M=r_M,
        err_rel_V=r_V,
        err_rel_d=r_d,
        err_rel_t=r_t,
        contrib_V=contrib_V,
        contrib_d=contrib_d,
        contrib_t=contrib_t,
        dominant=dominant,
    )

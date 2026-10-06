"""
Propagation des erreurs dans l'estimation du tonnage de métal — chap. 04.

Le tonnage de métal d'un bloc se calcule comme :

.. math::
    M = V \\cdot d \\cdot \\frac{t}{100}

où ``V`` est le volume (m³), ``d`` la densité (t/m³) et ``t`` la teneur (%).
Pour un produit de variables indépendantes, les **erreurs relatives**
s'additionnent en quadrature :

.. math::
    \\left(\\frac{\\sigma_M}{M}\\right)^2 =
        \\left(\\frac{\\sigma_V}{V}\\right)^2 +
        \\left(\\frac{\\sigma_d}{d}\\right)^2 +
        \\left(\\frac{\\sigma_t}{t}\\right)^2

Chaque terme indique la contribution relative d'un paramètre à la variance
totale — utile pour identifier le facteur dominant de l'incertitude.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict


@dataclass
class ResultatPropagation:
    """Résultat de la propagation d'erreur sur le tonnage de métal.

    Attributes
    ----------
    M : float
        Tonnage de métal (t).
    sigma_M : float
        Écart-type absolu de M (t).
    erreur_relative_M : float
        Erreur relative de M (fraction).
    erreurs_relatives : dict
        ``{"V": rV, "d": rd, "t": rt}`` — erreurs relatives par paramètre.
    contributions : dict
        ``{"V": cV, "d": cD, "t": cT}`` — contribution de chaque paramètre à la
        variance relative totale (fractions, somme = 1).
    parametre_dominant : str
        Nom du paramètre contribuant le plus à l'incertitude.
    """
    M: float
    sigma_M: float
    erreur_relative_M: float
    erreurs_relatives: Dict[str, float]
    contributions: Dict[str, float]
    parametre_dominant: str


def propagation_tonnage(
    volume: float,
    sigma_volume: float,
    densite: float,
    sigma_densite: float,
    teneur: float,
    sigma_teneur: float,
) -> ResultatPropagation:
    """Propage les incertitudes sur le tonnage de métal M = V·d·(t/100).

    Parameters
    ----------
    volume, sigma_volume : float
        Volume (m³) et son écart-type.
    densite, sigma_densite : float
        Densité (t/m³) et son écart-type.
    teneur, sigma_teneur : float
        Teneur (%) et son écart-type.

    Returns
    -------
    ResultatPropagation

    Examples
    --------
    >>> r = propagation_tonnage(5000, 250, 3.2, 0.10, 2.5, 0.40)
    >>> r.parametre_dominant
    't'
    """
    M = volume * densite * (teneur / 100.0)

    rV = sigma_volume / volume
    rd = sigma_densite / densite
    rt = sigma_teneur / teneur
    var_rel = rV**2 + rd**2 + rt**2
    rM = var_rel**0.5
    sM = rM * M

    contributions = {
        "V": rV**2 / var_rel,
        "d": rd**2 / var_rel,
        "t": rt**2 / var_rel,
    }
    dominant = max(contributions, key=contributions.get)

    return ResultatPropagation(
        M=M,
        sigma_M=sM,
        erreur_relative_M=rM,
        erreurs_relatives={"V": rV, "d": rd, "t": rt},
        contributions=contributions,
        parametre_dominant=dominant,
    )


def diagnostic_propagation(resultat: ResultatPropagation) -> str:
    """Diagnostic textuel de la propagation d'erreur."""
    r = resultat
    noms = {"V": "Volume", "d": "Densité", "t": "Teneur"}
    lines = [
        f"Tonnage de métal : M = {r.M:.1f} t ± {r.sigma_M:.1f} t "
        f"(erreur relative = {r.erreur_relative_M * 100:.1f} %)",
        "-" * 55,
    ]
    for k in ("V", "d", "t"):
        lines.append(
            f"  {noms[k]:<8s} : err. rel. {r.erreurs_relatives[k] * 100:5.1f} %"
            f"  →  {r.contributions[k] * 100:5.1f} % de σ²_M"
        )
    lines.append(
        f"\nParamètre dominant : {noms[r.parametre_dominant]} "
        f"({r.contributions[r.parametre_dominant] * 100:.0f} % de la variance totale)"
    )
    return "\n".join(lines)

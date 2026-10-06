"""
Théorie de l'échantillonnage de Gy.

Ce module implémente la formule fondamentale de Gy pour le calcul de
l'écart-type relatif d'échantillonnage, ainsi que les outils pour
évaluer des procédures multi-étapes (concassage / quartage).

Référence : Gy, P.M. (1979). *Sampling of Particulate Materials — Theory and Practice*.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional, Tuple

import numpy as np
from numpy.typing import ArrayLike


# ---------------------------------------------------------------------------
# Résultats structurés
# ---------------------------------------------------------------------------

@dataclass
class ParametresGy:
    """Paramètres du matériau pour la formule de Gy.

    Attributes
    ----------
    al : float
        Proportion massique du constituant d'intérêt dans le lot.
    da : float
        Masse spécifique du constituant d'intérêt (g/cm³).
    dg : float
        Masse spécifique de la gangue (g/cm³).
    d0 : float
        Taille de libération du constituant d'intérêt (cm).
    f : float
        Facteur de forme des particules (défaut : 0.5).
    g : float
        Facteur de granulométrie (défaut : 0.25).
    """

    al: float = 0.01 / 0.67
    da: float = 4.1
    dg: float = 2.8
    d0: float = 0.1
    f: float = 0.5
    g: float = 0.25


@dataclass
class EtapeEchantillonnage:
    """Une étape dans une procédure d'échantillonnage.

    Attributes
    ----------
    me : float
        Masse de l'échantillon prélevé (g).
    ml : float
        Masse du lot avant prélèvement (g).
    d : float
        Taille maximale des fragments (cm).
    sr : float
        Écart-type relatif calculé pour cette étape.
    """

    me: float
    ml: float
    d: float
    sr: float = 0.0


@dataclass
class ResultatProcedure:
    """Résultat d'une procédure d'échantillonnage multi-étapes.

    Attributes
    ----------
    etapes : List[EtapeEchantillonnage]
        Liste des étapes avec leurs écarts-types relatifs.
    sr_global : float
        Écart-type relatif global (racine de la somme des variances).
    sr_desire : float
        Écart-type relatif cible.
    valide : bool
        True si sr_global ≤ sr_desire.
    """

    etapes: List[EtapeEchantillonnage]
    sr_global: float
    sr_desire: float
    valide: bool


# ---------------------------------------------------------------------------
# Formule fondamentale de Gy
# ---------------------------------------------------------------------------

def ecart_type_relatif(
    params: ParametresGy,
    me: ArrayLike,
    ml: float,
    d: ArrayLike,
) -> np.ndarray:
    """Calcule l'écart-type relatif d'échantillonnage selon Gy.

    Parameters
    ----------
    params : ParametresGy
        Paramètres du matériau.
    me : float or array-like
        Masse de l'échantillon (g).
    ml : float
        Masse du lot (g).
    d : float or array-like
        Taille maximale des fragments (cm).

    Returns
    -------
    np.ndarray
        Écart-type relatif (sans unité, fraction — multiplier par 100 pour %).

    Notes
    -----
    La formule de Gy est :

    .. math::
        s_r^2 = K \\cdot d^3 \\cdot \\left(\\frac{1}{M_e} - \\frac{1}{M_L}\\right)

    avec :

    .. math::
        K = U_d \\cdot f \\cdot g \\cdot f_L

    où :
    - :math:`U_d = \\frac{(1 - a_L)}{a_L} \\cdot [(1-a_L)\\delta_a + a_L \\delta_g]`
    - :math:`f_L = \\min(\\sqrt{d_0 / d}, 1)`
    """
    d = np.asarray(d, dtype=float)
    me = np.asarray(me, dtype=float)

    al, da, dg, d0 = params.al, params.da, params.dg, params.d0
    f, g = params.f, params.g

    fl = np.minimum(np.sqrt(d0 / d), 1.0)
    ud = (1 - al) / al * ((1 - al) * da + al * dg)
    k = ud * f * g * fl

    with np.errstate(divide="ignore", invalid="ignore"):
        s2 = k * d**3 / me * (1 - me / ml)
        if np.ndim(s2) == 0:
            if s2 < 0:
                s2 = np.nan
        else:
            s2 = np.where(s2 < 0, np.nan, s2)

    return np.sqrt(s2)


def evaluer_procedure(
    params: ParametresGy,
    etapes: List[Tuple[float, float, float]],
    sr_desire: float = 0.10,
) -> ResultatProcedure:
    """Évalue une procédure d'échantillonnage multi-étapes.

    Parameters
    ----------
    params : ParametresGy
        Paramètres du matériau.
    etapes : list of (me, ml, d)
        Chaque tuple contient la masse échantillon (g), la masse lot (g),
        et la taille maximale des fragments (cm).
    sr_desire : float
        Écart-type relatif cible (fraction, ex. 0.10 pour 10 %).

    Returns
    -------
    ResultatProcedure
        Résultat avec les sr par étape, le sr global, et la validation.

    Examples
    --------
    >>> from qaqc_gy.gy import ParametresGy, evaluer_procedure
    >>> params = ParametresGy(al=0.01/0.67, da=4.1, dg=2.8, d0=0.1)
    >>> result = evaluer_procedure(params, [(100, 1000, 0.1)], sr_desire=0.10)
    >>> print(f"sr_global = {result.sr_global*100:.3f} %")
    """
    resultats: List[EtapeEchantillonnage] = []

    for me, ml, d in etapes:
        sr = float(ecart_type_relatif(params, me, ml, d))
        resultats.append(EtapeEchantillonnage(me=me, ml=ml, d=d, sr=sr))

    sr_global = float(np.sqrt(np.nansum([e.sr**2 for e in resultats])))

    return ResultatProcedure(
        etapes=resultats,
        sr_global=sr_global,
        sr_desire=sr_desire,
        valide=sr_global <= sr_desire,
    )


def masse_minimale(
    params: ParametresGy,
    ml: float,
    d: float,
    sr_cible: float,
) -> float:
    """Calcule la masse minimale d'échantillon pour atteindre un sr cible.

    Parameters
    ----------
    params : ParametresGy
        Paramètres du matériau.
    ml : float
        Masse du lot (g).
    d : float
        Taille maximale des fragments (cm).
    sr_cible : float
        Écart-type relatif cible (fraction).

    Returns
    -------
    float
        Masse minimale de l'échantillon (g).
    """
    al, da, dg, d0 = params.al, params.da, params.dg, params.d0
    f, g = params.f, params.g

    fl = min(np.sqrt(d0 / d), 1.0)
    ud = (1 - al) / al * ((1 - al) * da + al * dg)
    k = ud * f * g * fl

    # s_r^2 = k * d^3 * (1/me - 1/ml)
    # => 1/me = s_r^2 / (k * d^3) + 1/ml
    inv_me = sr_cible**2 / (k * d**3) + 1.0 / ml
    return 1.0 / inv_me


def tableau_procedure(resultat: ResultatProcedure) -> str:
    """Produit un tableau récapitulatif de la procédure.

    Parameters
    ----------
    resultat : ResultatProcedure

    Returns
    -------
    str
        Tableau formaté.
    """
    header = f"{'Étape':<8s} {'Mₑ (g)':<12s} {'Mₗ (g)':<12s} {'d (cm)':<10s} {'sr (%)':<10s}"
    sep = "-" * len(header)
    lines = [header, sep]
    for i, e in enumerate(resultat.etapes, 1):
        lines.append(
            f"{i:<8d} {e.me:<12.1f} {e.ml:<12.1f} {e.d:<10.4f} {e.sr*100:<10.3f}"
        )
    lines.append(sep)
    lines.append(f"{'Global':<8s} {'':12s} {'':12s} {'':10s} {resultat.sr_global*100:<10.3f}")
    lines.append(f"{'Cible':<8s} {'':12s} {'':12s} {'':10s} {resultat.sr_desire*100:<10.3f}")
    status = "✅ Valide" if resultat.valide else "❌ Non valide"
    lines.append(f"\n{status}")
    return "\n".join(lines)

"""
Régularisation des teneurs par composites de longueur fixe (chap. 04).

À partir d'échantillons bruts définis par leur intervalle ``[de, à]`` et leur
teneur, on calcule des composites de longueur constante par moyenne pondérée
par la longueur de recouvrement. Un composite n'est conservé (``valide``) que
si la couverture (longueur réellement échantillonnée / longueur du composite)
atteint un seuil minimal.

Cette implémentation reproduit **exactement** la fonction JavaScript
``Ch4.makeComposites`` afin que les *golden vectors* concordent (y compris la
valeur ``NaN`` pour un composite invalide).
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import List, Sequence, Tuple, Union

import math

Echantillon = Union["EchantillonForage", dict, Tuple[float, float, float]]


@dataclass
class EchantillonForage:
    """Un échantillon brut de forage.

    Attributes
    ----------
    de : float
        Profondeur de début de l'intervalle (m).
    a : float
        Profondeur de fin de l'intervalle (m).
    valeur : float
        Teneur mesurée sur l'intervalle.
    """

    de: float
    a: float
    valeur: float


@dataclass
class Composite:
    """Un composite régularisé.

    Attributes
    ----------
    de, a : float
        Bornes du composite (m).
    valeur : float
        Teneur moyenne pondérée par la longueur ; ``nan`` si invalide.
    couverture : float
        Fraction du composite réellement couverte par des échantillons.
    valide : bool
        Vrai si ``couverture >= couverture_min``.
    """

    de: float
    a: float
    valeur: float
    couverture: float
    valide: bool


def _coerce(ech: Echantillon) -> Tuple[float, float, float]:
    if isinstance(ech, EchantillonForage):
        return ech.de, ech.a, ech.valeur
    if isinstance(ech, dict):
        # accepte les clés FR (de/a/valeur) ou EN/JS (from/to/value)
        de = ech.get("de", ech.get("from"))
        a = ech.get("a", ech.get("to"))
        v = ech.get("valeur", ech.get("value"))
        return float(de), float(a), float(v)
    de, a, v = ech
    return float(de), float(a), float(v)


def composite_longueur_fixe(
    echantillons: Sequence[Echantillon],
    longueur: float,
    couverture_min: float,
) -> List[Composite]:
    """Régularise des échantillons en composites de longueur constante.

    Parameters
    ----------
    echantillons : séquence d'échantillons
        Chaque échantillon fournit ``de``, ``a`` et ``valeur``.
    longueur : float
        Longueur cible des composites (m).
    couverture_min : float
        Couverture minimale (fraction dans ``[0, 1]``) pour qu'un composite
        soit valide.

    Returns
    -------
    list of Composite
        Les composites successifs, depuis le ``min(de)`` jusqu'au ``max(a)``.

    Notes
    -----
    La teneur d'un composite est :

    .. math:: \\bar t = \\frac{\\sum_k v_k\\, \\ell_k}{\\sum_k \\ell_k}

    où :math:`\\ell_k` est la longueur de recouvrement entre l'échantillon
    :math:`k` et le composite. La couverture est
    :math:`\\sum_k \\ell_k / \\text{longueur}`.
    """
    echs = [_coerce(e) for e in echantillons]
    if not echs:
        return []

    min_d = min(de for de, _, _ in echs)
    max_d = max(a for _, a, _ in echs)

    comps: List[Composite] = []
    start = min_d
    while start < max_d:
        end = start + longueur
        w_sum = 0.0
        t_len = 0.0
        for de, a, v in echs:
            o_s = max(start, de)
            o_e = min(end, a)
            length = o_e - o_s
            if length > 0:
                w_sum += v * length
                t_len += length
        cov = t_len / longueur if longueur else 0.0
        valide = cov >= couverture_min
        valeur = (w_sum / t_len) if (valide and t_len > 0) else math.nan
        comps.append(
            Composite(de=start, a=end, valeur=valeur, couverture=cov, valide=valide)
        )
        start = end
    return comps

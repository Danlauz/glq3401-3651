"""
Compositing (régularisation) des échantillons de forage (chap. 04).

Outils pour :

- calculer la longueur optimale de composite à partir d'un ensemble de forages ;
- découper un forage en composites de longueur fixe (moyenne pondérée) ;
- traiter un ensemble complet de forages et retourner la base compositée ;
- valider le taux de couverture minimal de chaque composite.

Migration de ``python_code/C04TraitementStatistique/composite.py``.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

import numpy as np


# ---------------------------------------------------------------------------
# Structures de données
# ---------------------------------------------------------------------------

@dataclass
class Echantillon:
    """Un intervalle échantillonné dans un forage.

    Attributes
    ----------
    de : float
        Profondeur de début (m).
    a : float
        Profondeur de fin (m).
    teneur : float
        Valeur mesurée (teneur, ppm, %, etc.).
    forage_id : str
        Identifiant du forage.
    """
    de: float
    a: float
    teneur: float
    forage_id: str = ""

    @property
    def longueur(self) -> float:
        return self.a - self.de


@dataclass
class Composite:
    """Un composite calculé.

    Attributes
    ----------
    de, a : float
        Profondeurs de début et de fin (m).
    teneur : float
        Teneur moyenne pondérée par la longueur.
    couverture : float
        Fraction de l'intervalle couverte par des échantillons (0 à 1).
    valide : bool
        True si la couverture ≥ seuil minimum.
    forage_id : str
        Identifiant du forage.
    """
    de: float
    a: float
    teneur: float
    couverture: float
    valide: bool
    forage_id: str = ""

    @property
    def longueur(self) -> float:
        return self.a - self.de


@dataclass
class ResultatComposite:
    """Résultat du compositing d'un ou plusieurs forages."""
    composites: List[Composite]
    longueur_composite: float
    couverture_min: float
    n_valides: int = 0
    n_rejetes: int = 0


# ---------------------------------------------------------------------------
# Fonctions de calcul
# ---------------------------------------------------------------------------

def calculer_composites(
    echantillons: List[Echantillon],
    longueur: float,
    couverture_min: float = 0.5,
    forage_id: str = "",
) -> List[Composite]:
    """Découpe un forage en composites de longueur fixe.

    Chaque composite est la moyenne pondérée par la longueur des échantillons
    qui le chevauchent. Les composites dont la couverture est inférieure au
    seuil minimum sont marqués comme non valides.

    Parameters
    ----------
    echantillons : List[Echantillon]
        Échantillons du forage, triés par profondeur.
    longueur : float
        Longueur souhaitée de chaque composite (m).
    couverture_min : float
        Fraction minimale de couverture requise (0 à 1, défaut : 0.5).
    forage_id : str
        Identifiant du forage.

    Returns
    -------
    List[Composite]

    Examples
    --------
    >>> from geostat_polymtl.treatment.composite import Echantillon, calculer_composites
    >>> echs = [Echantillon(0, 1, 1.0), Echantillon(1, 3, 5.0), Echantillon(3, 6, 2.0)]
    >>> comps = calculer_composites(echs, longueur=3.0)
    >>> len(comps)
    2
    """
    if not echantillons:
        return []

    min_depth = min(e.de for e in echantillons)
    max_depth = max(e.a for e in echantillons)
    composites: List[Composite] = []

    start = min_depth
    while start < max_depth:
        end = start + longueur
        total_length = 0.0
        weighted_sum = 0.0

        for e in echantillons:
            overlap_start = max(start, e.de)
            overlap_end = min(end, e.a)
            overlap = overlap_end - overlap_start
            if overlap > 0:
                weighted_sum += e.teneur * overlap
                total_length += overlap

        couverture = total_length / longueur
        if couverture >= couverture_min and total_length > 0:
            teneur = weighted_sum / total_length
            valide = True
        else:
            teneur = np.nan
            valide = False

        composites.append(Composite(
            de=start, a=end, teneur=teneur,
            couverture=couverture, valide=valide,
            forage_id=forage_id,
        ))
        start = end

    return composites


def longueur_optimale(
    echantillons_par_forage: Dict[str, List[Echantillon]],
    candidats: Optional[List[float]] = None,
) -> Tuple[float, Dict[float, float]]:
    """Détermine la longueur de composite qui maximise le support.

    La longueur optimale maximise le taux de couverture moyen sur l'ensemble
    des forages.

    Parameters
    ----------
    echantillons_par_forage : dict
        ``{forage_id: [Echantillon, ...]}``
    candidats : list of float, optional
        Longueurs à tester. Si None, de 0.5 à 20 m par pas de 0.5.

    Returns
    -------
    longueur_opt : float
    scores : dict
        ``{longueur: taux_de_couverture_moyen}``
    """
    if candidats is None:
        toutes_longueurs = [e.longueur for echs in echantillons_par_forage.values() for e in echs]
        max_l = min(max(toutes_longueurs) * 3, 20) if toutes_longueurs else 10.0
        candidats = list(np.arange(0.5, max_l + 0.1, 0.5))

    scores: Dict[float, float] = {}
    for l in candidats:
        couvertures = []
        for echs in echantillons_par_forage.values():
            for c in calculer_composites(echs, l, couverture_min=0.0):
                couvertures.append(c.couverture)
        scores[l] = float(np.mean(couvertures)) if couvertures else 0.0

    longueur_opt = max(scores, key=scores.get)
    return longueur_opt, scores


def composer_base_de_donnees(
    echantillons_par_forage: Dict[str, List[Echantillon]],
    longueur: Optional[float] = None,
    couverture_min: float = 0.5,
) -> ResultatComposite:
    """Composite un ensemble complet de forages.

    Si ``longueur`` n'est pas spécifiée, elle est déterminée via
    :func:`longueur_optimale`.

    Parameters
    ----------
    echantillons_par_forage : dict
        ``{forage_id: [Echantillon, ...]}``
    longueur : float, optional
        Longueur de composite (m). Si None, calcul automatique.
    couverture_min : float
        Seuil de couverture minimum (0 à 1).

    Returns
    -------
    ResultatComposite
    """
    if longueur is None:
        longueur, _ = longueur_optimale(echantillons_par_forage)

    all_composites: List[Composite] = []
    for fid, echs in echantillons_par_forage.items():
        all_composites.extend(
            calculer_composites(echs, longueur, couverture_min, forage_id=fid)
        )

    n_val = sum(1 for c in all_composites if c.valide)
    n_rej = sum(1 for c in all_composites if not c.valide)

    return ResultatComposite(
        composites=all_composites,
        longueur_composite=longueur,
        couverture_min=couverture_min,
        n_valides=n_val,
        n_rejetes=n_rej,
    )


def composites_vers_tableau(resultat: ResultatComposite) -> str:
    """Produit un tableau récapitulatif des composites."""
    lines = [
        f"Compositing — longueur = {resultat.longueur_composite} m, "
        f"couverture min = {resultat.couverture_min:.0%}",
        f"Valides : {resultat.n_valides}, Rejetés : {resultat.n_rejetes}",
        "-" * 65,
        f"{'Forage':<10s} {'De':<8s} {'À':<8s} {'Teneur':<10s} {'Couv.':<8s} {'Valide':<8s}",
        "-" * 65,
    ]
    for c in resultat.composites:
        t_str = f"{c.teneur:.2f}" if c.valide else "---"
        lines.append(
            f"{c.forage_id:<10s} {c.de:<8.1f} {c.a:<8.1f} {t_str:<10s} "
            f"{c.couverture:<8.0%} {'✓' if c.valide else '✗':<8s}"
        )
    return "\n".join(lines)

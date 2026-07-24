"""Traitement et analyse statistique des données de forage (chap. 04).

Migration de ``python_code/C04TraitementStatistique/`` vers la librairie
``geostat_polymtl``, complétée par la propagation d'erreur et l'analyse
exploratoire.

Sous-modules
------------
``composite``     — régularisation / compositing des échantillons de forage.
``degroupement``  — dégroupement par cellules (cell declustering).
``deviations``    — trajectoire de forage (méthode des points milieux).
``erreurs``       — propagation d'erreur sur le tonnage de métal (M = V·d·t).
``exploratoire``  — statistiques descriptives, histogramme, boîte à moustaches.

Les jeux de données synthétiques (champ gaussien ou lognormal échantillonné)
se génèrent avec :mod:`geostat_polymtl.data.gisement`, qui s'appuie sur
:func:`geostat_polymtl.simulation_methods.GFFTMA.GFFTMA`.
"""

from geostat_polymtl.treatment.composite import (
    Echantillon, Composite, ResultatComposite,
    calculer_composites, longueur_optimale, composer_base_de_donnees,
    composites_vers_tableau,
)
from geostat_polymtl.treatment.degroupement import (
    ResultatDegroupement, ResultatOptimisation,
    poids_cellules, degrouper, optimiser_taille_cellule,
    diagnostic_degroupement,
)
from geostat_polymtl.treatment.deviations import (
    MesureDeviation, PointTrajectoire, ResultatTrajectoire,
    cosinus_directeurs, calculer_trajectoire, interpoler_profondeurs,
    reconstruire_forage, trajectoire_vers_tableau,
)
from geostat_polymtl.treatment.erreurs import (
    ResultatPropagation, propagation_tonnage, diagnostic_propagation,
)
from geostat_polymtl.treatment.exploratoire import (
    StatsDescriptives, statistiques_descriptives,
    histogramme, StatsBoite, boite_a_moustaches,
)

__all__ = [
    # composite
    "Echantillon", "Composite", "ResultatComposite",
    "calculer_composites", "longueur_optimale", "composer_base_de_donnees",
    "composites_vers_tableau",
    # degroupement
    "ResultatDegroupement", "ResultatOptimisation",
    "poids_cellules", "degrouper", "optimiser_taille_cellule",
    "diagnostic_degroupement",
    # deviations
    "MesureDeviation", "PointTrajectoire", "ResultatTrajectoire",
    "cosinus_directeurs", "calculer_trajectoire", "interpoler_profondeurs",
    "reconstruire_forage", "trajectoire_vers_tableau",
    # erreurs
    "ResultatPropagation", "propagation_tonnage", "diagnostic_propagation",
    # exploratoire
    "StatsDescriptives", "statistiques_descriptives",
    "histogramme", "StatsBoite", "boite_a_moustaches",
]

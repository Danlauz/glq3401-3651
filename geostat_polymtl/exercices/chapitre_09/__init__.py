"""Générateurs d'exercices du chapitre 09 (krigeage).

Portage Python des générateurs MATLAB d'examen du chapitre 9 (krigeage simple,
ordinaire, voisinage, validation croisée, comparaison de modèles). Chaque
fonction RÉUTILISE les wrappers de :mod:`geostat_polymtl.kriging.wrappers`
(krigeage simple/ordinaire, système de krigeage, validation croisée) et la
simulation :mod:`geostat_polymtl.simulation_methods` ; elles n'ajoutent que les
paramètres des sources, la disposition des points et la mise en page.

Modules
-------
- :mod:`profils_krigeage` — profils de krigeage 1D à associer à un modèle de
  covariance (figures C9-13, source ``Q6_ComparaisonKrigeage.m``).
- :mod:`poids_ecran` — poids de krigeage, effet d'écran et matrice de krigeage
  (sources ``Exemplepoidskrigeage.m``, ``Q1_MatriceKrigeage.m``,
  ``Q2_EffetDecran.m``), et détection d'anisotropie par les poids
  (``Q3_DetectionAnisoPoids.m``).
- :mod:`validation` — choix du voisinage (``Q4_Voisinnage.m``), stratégies de
  voisinage (``Q5_ValidationCroisee.m``) et comparaison de modèles par
  validation croisée.

Sources MATLAB :
``Exercices/Examen/CP2/Code_Examen/8-Krigeage/`` et
``Exercices/Examen/CP2/Révision/Code_Images/Exemplepoidskrigeage.m``.
"""
from geostat_polymtl.exercices.chapitre_09.profils_krigeage import (
    profil_krigeage_1d,
    figure_profil_krigeage,
    figure_association_profils,
    JEUX_DONNEES,
    MODELES_Q6,
)
from geostat_polymtl.exercices.chapitre_09.poids_ecran import (
    champ_support_aniso,
    poids_krigeage,
    figure_poids_krigeage,
    figure_matrice_krigeage,
    figure_anisotropie_poids,
    CONFIG_Q1,
    CONFIG_Q2,
    CONFIG_EXEMPLE,
    CONFIG_Q3,
)
from geostat_polymtl.exercices.chapitre_09.validation import (
    figure_voisinage,
    figure_strategies_voisinage,
    comparaison_validation_croisee,
    figure_comparaison_modeles,
)

__all__ = [
    # profils_krigeage
    "profil_krigeage_1d",
    "figure_profil_krigeage",
    "figure_association_profils",
    "JEUX_DONNEES",
    "MODELES_Q6",
    # poids_ecran
    "champ_support_aniso",
    "poids_krigeage",
    "figure_poids_krigeage",
    "figure_matrice_krigeage",
    "figure_anisotropie_poids",
    "CONFIG_Q1",
    "CONFIG_Q2",
    "CONFIG_EXEMPLE",
    "CONFIG_Q3",
    # validation
    "figure_voisinage",
    "figure_strategies_voisinage",
    "comparaison_validation_croisee",
    "figure_comparaison_modeles",
]

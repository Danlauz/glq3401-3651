"""Exercices du chapitre 07 — variogramme.

Générateurs des figures « gén. MATLAB » du chapitre variogramme, version
Python des scripts d'examen ``CP2/Code_Examen/6-Variogramme``. Ils
RÉUTILISENT les primitives de la librairie ``geostat_polymtl`` (simulation
FFT-MA, covariance, variogramme expérimental directionnel, système de
krigeage) — aucune réimplémentation.

Modules
-------
``champs_modeles`` — association de 9 modèles de variogramme à 9 champs
    simulés (exercice C7a-5 ; ``Q3_IdentificationVisuelle.m``).
``variogramme_directionnel`` — champs anisotropes + variogrammes
    expérimentaux directionnels + ajustement (C7a-12/13, C7b-3/5, CP2-Q1 ;
    ``Q4_AjustementVisuelle.m``).
``matrice_krigeage`` — plan de localisation + matrice de covariance K|k et
    poids KS/KO / effet d'écran (Q1/Q2 ``MatriceKrigeage`` /
    ``EffetDecran``).
"""

from geostat_polymtl.exercices.chapitre_07.champs_modeles import (
    planche_association,
    liste_modeles,
)
from geostat_polymtl.exercices.chapitre_07.variogramme_directionnel import (
    simuler_champ_reference,
    variogrammes_directionnels,
    variogramme_cuivre_cp2q1a,
    variogramme_isotrope_cp2q1b,
    variogramme_zinc_cp2q1c,
)
from geostat_polymtl.exercices.chapitre_07.matrice_krigeage import (
    matrice_covariance,
    figure_matrice_krigeage_q1,
    figure_effet_ecran_q2,
)

__all__ = [
    # champs_modeles
    "planche_association",
    "liste_modeles",
    # variogramme_directionnel
    "simuler_champ_reference",
    "variogrammes_directionnels",
    "variogramme_cuivre_cp2q1a",
    "variogramme_isotrope_cp2q1b",
    "variogramme_zinc_cp2q1c",
    # matrice_krigeage
    "matrice_covariance",
    "figure_matrice_krigeage_q1",
    "figure_effet_ecran_q2",
]

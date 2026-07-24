"""Exercices du chapitre 08 — variance de bloc, de dispersion et d'estimation.

Générateurs des figures des exercices d'examen
``7-VarianceBloc_Dispersion`` (``Q1_CompareBlocDisp.m``,
``Q2_VarEstimation.m``, ``grilleAleatoireStratifie.m``), version Python
RÉUTILISANT les primitives de :mod:`geostat_polymtl.block_variance`
(variance de bloc par quadrature, agrégation empirique) et de
:mod:`geostat_polymtl.data.synthetic` (simulation FFT-MA).
Aucune formule de covariance, de simulation ou d'agrégation n'est réécrite.

Modules
-------
``bloc_vs_dispersion``
    Comparaison de modèles de variogramme (calque Q1) et illustration numérique
    de la décroissance de la variance avec le support (champ simulé agrégé par
    blocs, variance empirique vs théorique).
``variance_estimation``
    Patrons d'échantillonnage (grille régulière, grille étirée, grille
    aléatoire stratifiée — calque Q2) et variance d'estimation associée.
"""

from geostat_polymtl.exercices.chapitre_08.bloc_vs_dispersion import (
    modeles_exercice,
    comparer_modeles_variogramme,
    bloc_vs_dispersion_empirique,
)
from geostat_polymtl.exercices.chapitre_08.variance_estimation import (
    grille_reguliere,
    grille_aleatoire_stratifie,
    patrons_exercice,
    carte_patrons_echantillonnage,
    variance_estimation_patrons,
)

__all__ = [
    # bloc_vs_dispersion (Q1)
    "modeles_exercice",
    "comparer_modeles_variogramme",
    "bloc_vs_dispersion_empirique",
    # variance_estimation (Q2)
    "grille_reguliere",
    "grille_aleatoire_stratifie",
    "patrons_exercice",
    "carte_patrons_echantillonnage",
    "variance_estimation_patrons",
]

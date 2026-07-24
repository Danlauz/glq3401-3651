"""Générateurs d'exercices du chapitre 04 (traitement des données de forage).

Portage Python des générateurs MATLAB d'examen du chapitre 4 (composites,
déviation/désondage, dégroupement, géométrie veine, accumulation). Chaque
fonction RÉUTILISE les primitives de :mod:`geostat_polymtl.forage` et n'ajoute
que les paramètres de la source et la mise en page des figures.

Modules
-------
- :mod:`composites_deviation` — composites de longueur fixe + désondage par la
  règle de la mi-distance (source MATLAB CP1 4-Sondage / Q1, Q3).
- :mod:`degroupement` — dégroupement par cellules (figure des cellules).
- :mod:`accumulation` — teneur moyenne par accumulation ``GT = t·w`` sur une
  section polygonale (source MATLAB CP1 5-MéthodeConventionnelle / Q1).
"""
from geostat_polymtl.exercices.chapitre_04.composites_deviation import (
    figure_composites,
    figure_deviation,
    figure_veine_forage,
)
from geostat_polymtl.exercices.chapitre_04.degroupement import (
    figure_degroupement,
)
from geostat_polymtl.exercices.chapitre_04.accumulation import (
    figure_accumulation,
)

__all__ = [
    "figure_composites",
    "figure_deviation",
    "figure_veine_forage",
    "figure_degroupement",
    "figure_accumulation",
]

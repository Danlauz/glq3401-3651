"""Exercices du chapitre 05 — méthodes d'estimation déterministes.

Générateurs des figures et données des exercices conventionnels (polygones,
triangles / TIN, inverse de la distance), version Python des scripts MATLAB
d'examen ``5-MéthodeConventionnelle``. Ils RÉUTILISENT les primitives de
:mod:`geostat_polymtl.conventional` (aucune réimplémentation).

Module
------
``conventionnel_carte`` — cartes de points, polygones de Voronoï,
triangulation de Delaunay, IDW, et figure de comparaison des trois méthodes.
"""

from geostat_polymtl.exercices.chapitre_05.conventionnel_carte import (
    donnees_exercice,
    carte_points,
    carte_polygones,
    carte_triangles,
    carte_idw,
    comparer_methodes_point,
    figure_comparaison,
)

__all__ = [
    "donnees_exercice",
    "carte_points",
    "carte_polygones",
    "carte_triangles",
    "carte_idw",
    "comparer_methodes_point",
    "figure_comparaison",
]

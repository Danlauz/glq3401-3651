"""Méthodes d'estimation conventionnelles (chap. 05).

Méthodes déterministes d'estimation des teneurs à partir d'échantillons épars,
typiquement évaluées contre un champ « vrai » simulé par
:func:`geostat_polymtl.simulation_methods.GFFTMA.GFFTMA`
(voir :mod:`geostat_polymtl.data.gisement`).

Sous-modules
------------
``idw``        — inverse de la distance pondérée.
``polygones``  — plus proche voisin / polygones de Thiessen (Voronoï).
``triangles``  — triangulation de Delaunay (interpolation barycentrique / TIN).
``sections``   — volume / tonnage entre coupes parallèles.
``qualite``    — statistiques d'erreur (biais, RMSE, MAE, R²) vs réalité.
"""

from geostat_polymtl.conventional.idw import idw, estimer_grille_idw
from geostat_polymtl.conventional.polygones import (
    plus_proche_voisin, estimer_grille_ppv, aire_polygones,
)
from geostat_polymtl.conventional.triangles import (
    interpolation_triangulaire, estimer_grille_triangles,
)
from geostat_polymtl.conventional.sections import (
    volume_entre_sections, tonnage, metal_contenu,
    ResultatSections, estimer_sections, comparer_methodes,
)
from geostat_polymtl.conventional.qualite import StatsErreur, statistiques_erreur

__all__ = [
    "idw", "estimer_grille_idw",
    "plus_proche_voisin", "estimer_grille_ppv", "aire_polygones",
    "interpolation_triangulaire", "estimer_grille_triangles",
    "volume_entre_sections", "tonnage", "metal_contenu",
    "ResultatSections", "estimer_sections", "comparer_methodes",
    "StatsErreur", "statistiques_erreur",
]

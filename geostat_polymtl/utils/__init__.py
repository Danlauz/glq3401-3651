"""Utilitaires généraux (distances, validation, version)."""

from geostat_polymtl.utils.distance import (
    distance_anisotrope,
    distance_euclidienne,
    matrice_distances,
)
from geostat_polymtl.utils.version import __version__

__all__ = [
    "__version__",
    "distance_euclidienne",
    "distance_anisotrope",
    "matrice_distances",
]

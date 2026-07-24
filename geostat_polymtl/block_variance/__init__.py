"""Variance de bloc (chap. 08).

Ce package implemente le calcul de la variance moyenne d'un bloc de support
donne sous un modele de covariance spatiale. Toute la mecanique repose sur
``geostat_polymtl.cov_func.covar`` pour l'evaluation des modeles theoriques
(aucune duplication des formules de covariance).

Modules
-------
quadrature
    Calcul analytique par quadrature de Gauss-Legendre (1D/2D/3D), avec
    anisotropie geometrique.
empirique
    Calcul empirique par moyennage glissant sur un champ regulier
    (variance de differents supports vs taille du bloc).
imbrique
    Helpers pour les variogrammes/covariances imbriques (somme de structures).

Convention de portee
--------------------
Comme partout dans la librairie pedagogique, les ateliers utilisent la
**portee pratique 95 %**. La conversion vers le parametre ``range`` interne
de cov_func se fait dans ce package : ``a`` (spherique), ``a/3`` (exponentiel),
``a/sqrt(3)`` (gaussien).
"""
from geostat_polymtl.block_variance.quadrature import (
    variance_bloc_quadrature,
    variance_bloc_calculateur,
    points_quadrature_visu,
)
from geostat_polymtl.block_variance.empirique import (
    agreger_champ,
    variance_bloc_empirique,
)
from geostat_polymtl.block_variance.imbrique import (
    variogramme_imbrique,
    variance_bloc_imbrique,
)

__all__ = [
    "variance_bloc_quadrature",
    "variance_bloc_calculateur",
    "points_quadrature_visu",
    "agreger_champ",
    "variance_bloc_empirique",
    "variogramme_imbrique",
    "variance_bloc_imbrique",
]

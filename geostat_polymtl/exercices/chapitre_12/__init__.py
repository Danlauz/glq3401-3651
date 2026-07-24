"""Exercices du chapitre 12 — simulations géostatistiques de variable continue.

Générateurs des figures des exercices d'examen (CP3, ``11- Simulations``,
script ``go_final11.m``), version Python RÉUTILISANT les méthodes de simulation
de :mod:`geostat_polymtl.simulation_methods` (FFT-MA, Cholesky/LU, SGS via les
wrappers), la CDF empirique de
:func:`geostat_polymtl.exp_variogram.GeoStatFFT.ECDF` et les générateurs
synthétiques de :mod:`geostat_polymtl.data.synthetic`.

Aucune mathématique de simulation, de covariance ou de krigeage n'est réécrite :
le code neuf se limite à l'anamorphose (lecture de CDF) et à la mise en page.

Modules
-------
``anamorphose_cdf``
    Transformation gaussienne (CP3, Q5/Q7) : CDF empirique de :math:`Z` vs CDF de
    :math:`N(0,1)` et lecture graphique de la fonction d'anamorphose
    :math:`z = \\varphi(y)`.
``simulations``
    Réalisations non conditionnelles par FFT-MA / LU / SGS (CP3, Q5/Q6) et
    **cas arsenic** (CP3, Q9) : carte de :math:`P(Z > 50\\ \\text{ppm})` estimée
    par simulations (fonctionnelle non linéaire de dépassement de seuil).

Bug connu signalé
-----------------
``GFFTMA`` peut mal se comporter si une dimension interne de la grille étendue
est impaire (portées gaussienne/pépite). Les fonctions de ce sous-paquet passent
par ``simulation_methods.wrappers.simuler_gfftma``, qui ajuste la parité
(``N_eff``) ; le bug est documenté, jamais contourné silencieusement.
"""

from geostat_polymtl.exercices.chapitre_12.anamorphose_cdf import (
    donnees_lognormales,
    donnees_lognormales_spatiales,
    cdf_transformation_gaussienne,
    anamorphose_lecture,
)
from geostat_polymtl.exercices.chapitre_12.simulations import (
    realisations_methodes,
    ensemble_realisations,
    cas_arsenic_depassement,
)

__all__ = [
    # anamorphose_cdf (Q5/Q7)
    "donnees_lognormales",
    "donnees_lognormales_spatiales",
    "cdf_transformation_gaussienne",
    "anamorphose_lecture",
    # simulations (Q5/Q6/Q9)
    "realisations_methodes",
    "ensemble_realisations",
    "cas_arsenic_depassement",
]

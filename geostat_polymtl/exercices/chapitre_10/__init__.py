"""Générateurs d'exercices du chapitre 10 (cokrigeage).

Portage Python des générateurs MATLAB d'examen du chapitre 10 (cokrigeage,
modèle linéaire de corégionalisation). Chaque fonction RÉUTILISE la librairie —
:func:`geostat_polymtl.cov_func.covar_nu.covar_nu` (covariances directe/croisée),
:func:`geostat_polymtl.functional.admissibility.validate_positive_definite`
(admissibilité) et
:func:`geostat_polymtl.kriging.wrappers.systeme_cokrigeage` (système de
cokrigeage, qui délègue à ``cokri``) — et n'ajoute que les jeux de paramètres
(matrices de corégionalisation :math:`\\mathbf{B}_k`, modèles), la disposition
des points et la mise en page.

Modules
-------
- :mod:`admissibilite_mlc` — admissibilité du modèle linéaire de
  corégionalisation et covariances directe/croisée (figures CP3-Q1 / C10-1 ;
  sources ``FigLCM.m``, ``Workplace_modeleadmissible.m``). Cas admissible /
  inadmissible / bruité / rien-conclure / dérivé.
- :mod:`cokrigeage_systeme` — construction et résolution du système de
  cokrigeage ordinaire à deux variables (figures C10-2 / CP3-Q2 ; source
  ``Workplace_calculCoKri.m``).

Sources MATLAB :
``Exercices/Examen/CP3/Code_Examen/9-Cokrigeage(x2)/``.
"""
from geostat_polymtl.exercices.chapitre_10.admissibilite_mlc import (
    CAS_MLC,
    covariances_mlc,
    admissibilite_mlc,
    figure_covariances_mlc,
    covariance_derivee_gaussienne,
    figure_covariance_derivee,
)
from geostat_polymtl.exercices.chapitre_10.cokrigeage_systeme import (
    CONFIG_CALCUL_COKRI,
    correlation_intrinseque,
    systeme_cokrigeage_calcul,
    figure_systeme_cokrigeage,
)

__all__ = [
    # admissibilité MLC
    "CAS_MLC",
    "covariances_mlc",
    "admissibilite_mlc",
    "figure_covariances_mlc",
    "covariance_derivee_gaussienne",
    "figure_covariance_derivee",
    # système de cokrigeage
    "CONFIG_CALCUL_COKRI",
    "correlation_intrinseque",
    "systeme_cokrigeage_calcul",
    "figure_systeme_cokrigeage",
]

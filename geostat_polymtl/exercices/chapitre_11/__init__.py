"""Générateurs d'exercices du chapitre 11 (krigeage d'indicatrices).

Portage Python des générateurs MATLAB du chapitre 11. Chaque fonction RÉUTILISE
les primitives de :mod:`geostat_polymtl.kriging.indicator` (codage, KI,
correction de la relation d'ordre, médiane locale) et
:mod:`geostat_polymtl.cov_func.covar_nu` (covariance des indicatrices) ; elles
n'ajoutent que les paramètres des sources et la mise en page.

Modules
-------
- :mod:`variogrammes_indicatrices` — variogrammes d'indicatrices par seuil et
  déstructuration aux extrêmes (source ``go_final11.m``, @fig-C11_VarioIndic).
- :mod:`cdf_locale` — reconstruction de la CDF locale par KI (@fig-C11_KI),
  correction des relations d'ordre (@fig-C11_RelationOrdre_Correction) et cas
  des données d'inégalité / souples (@fig-C11_SoftKriging).

Sources MATLAB : ``Exercices/Examen/CP3/Code_Examen/go_final11.m`` et les
exemples des sections ``chapters/C11/11-02.qmd``, ``11-03.qmd``, ``11-06.qmd``.
"""
from geostat_polymtl.exercices.chapitre_11.variogrammes_indicatrices import (
    variogramme_indicatrice,
    figure_variogrammes_indicatrices,
    MODELES_SEUILS,
)
from geostat_polymtl.exercices.chapitre_11.cdf_locale import (
    cdf_locale_ki,
    figure_cdf_locale_ki,
    correction_relation_ordre,
    figure_correction_relation_ordre,
    profil_donnees_inegalite,
    figure_donnees_inegalite,
    DONNEES_KI,
    CDF_BRUTE_ORDRE,
    SEUILS_ORDRE,
    DONNEES_SOFT,
)

__all__ = [
    # variogrammes_indicatrices
    "variogramme_indicatrice",
    "figure_variogrammes_indicatrices",
    "MODELES_SEUILS",
    # cdf_locale
    "cdf_locale_ki",
    "figure_cdf_locale_ki",
    "correction_relation_ordre",
    "figure_correction_relation_ordre",
    "profil_donnees_inegalite",
    "figure_donnees_inegalite",
    "DONNEES_KI",
    "CDF_BRUTE_ORDRE",
    "SEUILS_ORDRE",
    "DONNEES_SOFT",
]

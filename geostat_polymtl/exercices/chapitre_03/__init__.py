"""Générateurs d'exercices — Chapitre 03 (échantillonnage de Gy, QA/QC, densité).

Portage Python des scripts MATLAB d'examen (``CP1/Code_examen/3-Gy/`` et
``5-MéthodeConventionnelle/``), en RÉUTILISANT exclusivement
:mod:`geostat_polymtl.sampling` (formule de Gy, duplicatas, standards, blancs,
densité). Ces modules ne contiennent que les paramètres des énoncés et la mise
en page des figures.

Exercices couverts
------------------
- **C3-1** : abaque de Gy + procédure (``gy_abaque``).
- **CP1-Q6** : figures QA/QC (duplicatas, standards, blancs) (``qaqc_duplicatas``).
- **CP1-Q4** : proportions minérales (Ax=b) + densité (``densite``).
"""

from geostat_polymtl.exercices.chapitre_03.gy_abaque import (
    SCENARIOS_GY,
    abaque_gy_procedure,
    tableau_recapitulatif,
    masse_minimale_etape,
)
from geostat_polymtl.exercices.chapitre_03.qaqc_duplicatas import (
    DUPLICATAS_CAS,
    STANDARDS_CAS,
    BLANCS_CAS,
    figure_duplicatas,
    figure_standards,
    figure_blancs,
)
from geostat_polymtl.exercices.chapitre_03.densite import (
    resoudre_densite,
    figure_densite,
    lister_scenarios,
)

__all__ = [
    "SCENARIOS_GY", "abaque_gy_procedure", "tableau_recapitulatif", "masse_minimale_etape",
    "DUPLICATAS_CAS", "STANDARDS_CAS", "BLANCS_CAS",
    "figure_duplicatas", "figure_standards", "figure_blancs",
    "resoudre_densite", "figure_densite", "lister_scenarios",
]

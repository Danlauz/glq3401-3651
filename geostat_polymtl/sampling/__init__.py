"""Theorie de Pierre Gy et controle qualite QA/QC (chap. 03).

Migration de `python_code/C03ThéorieGy/`.

API publique
------------
- Gy : :class:`ParametresGy`, :func:`ecart_type_relatif`,
  :func:`evaluer_procedure`, :func:`masse_minimale`.
- Blancs : :func:`analyser_blancs`, :func:`diagnostic_blancs`.
- Standards : :func:`analyser_standards`, :func:`diagnostic_standards`.
- Duplicatas : :func:`analyser_duplicatas`, :func:`diagnostic_duplicatas`.
"""

from geostat_polymtl.sampling.gy import (
    ParametresGy,
    EtapeEchantillonnage,
    ResultatProcedure,
    ecart_type_relatif,
    evaluer_procedure,
    masse_minimale,
    tableau_procedure,
)
from geostat_polymtl.sampling.blancs import (
    ResultatBlancs,
    simuler_blancs,
    analyser_blancs,
    diagnostic_blancs,
)
from geostat_polymtl.sampling.standards import (
    ResultatStandards,
    detecter_anomalies,
    simuler_standards,
    analyser_standards,
    diagnostic_standards,
)
from geostat_polymtl.sampling.duplicatas import (
    ResultatDuplicatas,
    simuler_duplicatas,
    analyser_duplicatas,
    diagnostic_duplicatas,
)
from geostat_polymtl.sampling.densite import (
    masse_volumique_melange,
    fractions_volumiques,
)

__all__ = [
    "ParametresGy", "EtapeEchantillonnage", "ResultatProcedure",
    "ecart_type_relatif", "evaluer_procedure", "masse_minimale", "tableau_procedure",
    "ResultatBlancs", "simuler_blancs", "analyser_blancs", "diagnostic_blancs",
    "ResultatStandards", "detecter_anomalies", "simuler_standards",
    "analyser_standards", "diagnostic_standards",
    "ResultatDuplicatas", "simuler_duplicatas", "analyser_duplicatas",
    "diagnostic_duplicatas",
    "masse_volumique_melange", "fractions_volumiques",
]

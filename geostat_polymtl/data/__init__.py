"""Jeux de données du cours et générateurs synthétiques.

Sous-modules :
    - ``synthetic`` : génération reproductible de champs gaussiens (FFT-MA),
      lognormaux, etc.
    - ``examples`` : chargement des jeux de données utilisés dans les
      exercices du cours (épaisseur de veine, cokrigeage Z/Y, etc.).
"""

from geostat_polymtl.data.synthetic import (
    aggregate_blocs,
    champ_fftma_2d,
    champ_lognormal_2d,
)
from geostat_polymtl.data.examples import (
    load_carottes_cu,
    load_cokrigeage_zy,
    load_epaisseur_veine,
)

__all__ = [
    "champ_fftma_2d",
    "champ_lognormal_2d",
    "aggregate_blocs",
    "load_carottes_cu",
    "load_epaisseur_veine",
    "load_cokrigeage_zy",
]

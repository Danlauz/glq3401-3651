"""Theorie de Lane et Taylor pour la teneur de coupure optimale (chap. 02).

Migration de `python_code/C02ThéorieLane/`. Code conserve tel quel ; les
imports relatifs (`from .reserves import ...`) restent valides.

API publique
------------
- :class:`ParametresLane`, :class:`ResultatLane`, :class:`TeneurEquilibre`
- :func:`reserves`, :func:`reserves_lognormale`, :func:`reserves_normale`
- :func:`teneurs_limites`, :func:`courbes_profit`, :func:`tableau_recapitulatif`
"""

from geostat_polymtl.economics.reserves import (
    ReserveResult,
    reserves,
    reserves_lognormale,
    reserves_normale,
)
from geostat_polymtl.economics.economics import (
    ParametresLane,
    ResultatLane,
    TeneurEquilibre,
    courbes_profit,
    teneurs_limites,
    tableau_recapitulatif,
    tableau_recapitulatif_df,
)

__all__ = [
    "ReserveResult",
    "reserves",
    "reserves_lognormale",
    "reserves_normale",
    "ParametresLane",
    "ResultatLane",
    "TeneurEquilibre",
    "courbes_profit",
    "teneurs_limites",
    "tableau_recapitulatif",
    "tableau_recapitulatif_df",
]

"""
geostat_polymtl — librairie pédagogique pour le cours GLQ3401 / GLQ3651
=========================================================================

Source unique de vérité pour tout le code pédagogique du cours
**Géostatistique et géologie minière** (Polytechnique Montréal).

Modules principaux
------------------
``data``           — jeux de données du cours + générateurs synthétiques
``cov_func``        — modèles théoriques de covariance/variogramme
``exp_variogram``   — variogramme expérimental (grille, données dispersées)
``kriging``        — krigeage simple, ordinaire, de bloc, validation croisée
``economics``      — théorie de Lane et Taylor (chap. 02)
``sampling``       — théorie de Pierre Gy et QA/QC (chap. 03)
``block_variance`` — variance de bloc et de dispersion (chap. 08)
``plotting``       — palette et template Plotly du projet
``precompute``     — production des données pré-calculées des widgets
``testing``        — génération des golden vectors JSON

Reproductibilité
----------------
Toute fonction stochastique accepte un paramètre ``rng`` (int, ``np.random.Generator``
ou ``None``). Pour fixer une graine globale :

    >>> from geostat_polymtl import set_default_seed
    >>> set_default_seed(42)
"""
from __future__ import annotations

from geostat_polymtl._seed import get_rng, set_default_seed
from geostat_polymtl.utils.version import __version__

from geostat_polymtl import (
    block_variance,
    cov_func,
    data,
    economics,
    exp_variogram,
    kriging,
    sampling,
)

__all__ = [
    "__version__",
    "set_default_seed",
    "get_rng",
    "data",
    "cov_func",
    "exp_variogram",
    "kriging",
    "economics",
    "sampling",
    "block_variance",
]

"""Gestion centralisée des générateurs aléatoires.

C'est le **seul** module de la librairie autorisé à toucher au module
``numpy.random``. Toutes les fonctions stochastiques doivent récupérer leur
générateur via :func:`_resolve`.

Notes
-----
Pourquoi ce détour ? Pour garantir la reproductibilité dans un contexte
pédagogique : tout résultat affiché dans le livre doit pouvoir être
reproduit par un·e étudiant·e exécutant le code en local.
"""
from __future__ import annotations

import warnings
from typing import Optional, Union

import numpy as np

from geostat_polymtl._exceptions import GeostatNonReproductibleWarning

_DEFAULT_RNG: Optional[np.random.Generator] = None


def set_default_seed(seed: int) -> None:
    """Fixe la graine du générateur courant pour toute la session.

    Utile dans un notebook ou une session Jupyter : on appelle cette
    fonction une fois en haut, et toutes les fonctions stochastiques qui
    reçoivent ``rng=None`` deviennent automatiquement reproductibles.

    Parameters
    ----------
    seed : int
        Graine entière. Doit être convertible en ``int``.

    Examples
    --------
    >>> from geostat_polymtl import set_default_seed
    >>> set_default_seed(42)
    """
    global _DEFAULT_RNG
    _DEFAULT_RNG = np.random.default_rng(int(seed))


def get_rng() -> Optional[np.random.Generator]:
    """Retourne le générateur courant (ou ``None`` s'il n'a pas été fixé)."""
    return _DEFAULT_RNG


def _resolve(rng: Union[int, np.random.Generator, None]) -> np.random.Generator:
    """Convertit ``rng`` en :class:`numpy.random.Generator`.

    Règles :

    - ``None`` → utilise le générateur global s'il existe, sinon avertit
      via :class:`~geostat_polymtl._exceptions.GeostatNonReproductibleWarning`
      et crée un générateur non graine.
    - ``int`` → ``np.random.default_rng(rng)``.
    - ``np.random.Generator`` → renvoyé tel quel.
    - autre type → ``TypeError`` explicite.
    """
    if rng is None:
        if _DEFAULT_RNG is not None:
            return _DEFAULT_RNG
        warnings.warn(
            "Aucune graine fixée — les résultats ne seront pas reproductibles. "
            "Passe explicitement `rng=<entier>` ou appelle `set_default_seed(...)`.",
            GeostatNonReproductibleWarning,
            stacklevel=3,
        )
        return np.random.default_rng()

    if isinstance(rng, np.random.Generator):
        return rng

    if isinstance(rng, (int, np.integer)):
        return np.random.default_rng(int(rng))

    raise TypeError(
        f"`rng` doit être int, np.random.Generator ou None, reçu : {type(rng).__name__}"
    )

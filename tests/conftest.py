"""Fixtures pytest partagées."""
from __future__ import annotations

import numpy as np
import pytest

from geostat_polymtl import set_default_seed


@pytest.fixture(autouse=True)
def _fixer_graine_globale():
    """Fixe systématiquement la graine pour tous les tests.

    Cela garantit que les tests ne déclenchent pas l'avertissement
    ``GeostatNonReproductibleWarning`` (promu en erreur via pytest.ini).
    """
    set_default_seed(42)
    yield


@pytest.fixture
def grille_points_1d() -> np.ndarray:
    """7 points équidistants sur l'axe x."""
    return np.linspace(0, 60, 7).reshape(-1, 1)


@pytest.fixture
def valeurs_1d() -> np.ndarray:
    """Valeurs associées à `grille_points_1d`."""
    return np.array([1.0, 2.0, 1.5, 3.0, 2.5, 4.0, 3.5])

"""Tests du variogramme expérimental."""
from __future__ import annotations

import numpy as np

from geostat_polymtl.variogram.experimental import (
    nuee_variographique,
    variogramme_directionnel,
    variogramme_experimental,
)


class TestNuee:
    def test_n_paires(self):
        """n points → n(n-1)/2 paires."""
        coords = np.linspace(0, 10, 5).reshape(-1, 1)
        vals = np.array([1.0, 2.0, 3.0, 4.0, 5.0])
        nuee = nuee_variographique(coords, vals)
        assert len(nuee.distances) == 10  # 5*4/2

    def test_filtrage_max_distance(self):
        coords = np.array([[0.0], [1.0], [10.0]])
        vals = np.array([1.0, 2.0, 3.0])
        # Distances : 1.0, 9.0, 10.0
        nuee = nuee_variographique(coords, vals, max_distance=5.0)
        assert len(nuee.distances) == 1
        assert nuee.distances[0] == 1.0

    def test_semivariance_signe_zero(self):
        """Sur des valeurs identiques, toutes les semivariances valent 0."""
        coords = np.linspace(0, 10, 5).reshape(-1, 1)
        vals = np.ones(5) * 7.0
        nuee = nuee_variographique(coords, vals)
        assert np.allclose(nuee.semivariances, 0.0)


class TestVariogrammeExperimental:
    def test_signal_constant_donne_zero(self):
        """Signal constant → variogramme nul partout."""
        coords = np.linspace(0, 100, 50).reshape(-1, 1)
        vals = np.ones(50) * 3.0
        vg = variogramme_experimental(coords, vals, pas=10)
        # Toutes les classes non-vides doivent être ≈ 0
        non_vide = vg.n_paires > 0
        assert np.allclose(vg.gamma[non_vide], 0.0)

    def test_determinisme_avec_seed(self):
        """Deux appels avec même seed → résultat identique."""
        coords = np.random.default_rng(0).uniform(0, 100, (200, 2))
        vals = np.random.default_rng(1).normal(size=200)
        vg1 = variogramme_experimental(coords, vals, pas=10, n_echantillons=100, rng=42)
        vg2 = variogramme_experimental(coords, vals, pas=10, n_echantillons=100, rng=42)
        assert np.allclose(vg1.gamma, vg2.gamma, equal_nan=True)
        assert np.array_equal(vg1.n_paires, vg2.n_paires)


class TestVariogrammeDirectionnel:
    def test_directions_par_defaut(self):
        """4 directions par défaut → 4 résultats."""
        coords = np.random.default_rng(0).uniform(0, 100, (30, 2))
        vals = np.random.default_rng(1).normal(size=30)
        vgs = variogramme_directionnel(coords, vals, pas=10)
        assert len(vgs) == 4
        assert [v.direction for v in vgs] == [0, 45, 90, 135]

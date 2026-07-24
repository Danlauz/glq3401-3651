"""Invariants mathématiques du krigeage.

Ces tests vérifient les propriétés fondamentales qui doivent être vraies
quel que soit le modèle ou la configuration des données :

- interpolation exacte aux points d'observation,
- somme des poids = 1 en krigeage ordinaire,
- variance toujours non-négative,
- variance nulle au point d'observation.
"""
from __future__ import annotations

import numpy as np
import pytest

from geostat_polymtl.kriging import krigeage_ordinaire, krigeage_simple
from geostat_polymtl.variogram.modeles import exponentiel, gaussien, spherique


@pytest.fixture
def donnees_2d():
    X = np.array([[0.0, 0.0], [5.0, 0.0], [0.0, 5.0], [10.0, 10.0]])
    z = np.array([1.0, 3.0, 2.0, 4.0])
    return X, z


class TestInterpolationExacte:
    """Le krigeage est interpolateur exact aux points observés."""

    @pytest.mark.parametrize("modele", [
        spherique(palier=1.0, portee=10),
        exponentiel(palier=1.0, portee=10),
        gaussien(palier=1.0, portee=10),
    ])
    def test_ko_exact_au_point_observe(self, donnees_2d, modele):
        X, z = donnees_2d
        # Estimer au tout premier point observé
        r = krigeage_ordinaire(X, z, X[0:1], modele)
        assert np.isclose(r.estimation[0], z[0], atol=1e-8)
        assert r.variance[0] == pytest.approx(0.0, abs=1e-6)

    def test_ks_exact_au_point_observe(self, donnees_2d):
        X, z = donnees_2d
        r = krigeage_simple(X, z, X[1:2], spherique(palier=1.0, portee=10),
                            moyenne=2.5)
        assert np.isclose(r.estimation[0], z[1], atol=1e-8)
        assert r.variance[0] == pytest.approx(0.0, abs=1e-6)


class TestSommeDesPoids:
    def test_somme_lambda_egale_un_en_ko(self, donnees_2d):
        X, z = donnees_2d
        modele = spherique(palier=1.0, portee=10)
        r = krigeage_ordinaire(X, z, np.array([[3.0, 3.0]]), modele)
        assert np.isclose(r.poids[0].sum(), 1.0, atol=1e-10)


class TestVarianceNonNegative:
    def test_variance_positive_partout(self, donnees_2d):
        X, z = donnees_2d
        modele = spherique(palier=1.0, portee=10, pepite=0.1)
        pts = np.random.default_rng(0).uniform(-5, 15, (20, 2))
        r = krigeage_ordinaire(X, z, pts, modele)
        # Tolérance numérique
        assert (r.variance >= -1e-9).all()


class TestComparaisonKsKo:
    def test_ko_et_ks_egaux_si_moyenne_egale_au_lim(self, donnees_2d):
        """Quand la moyenne du KS est la moyenne empirique, KS et KO produisent
        des estimations comparables (pas identiques en général, mais proches
        loin des observations)."""
        X, z = donnees_2d
        m = float(np.mean(z))
        modele = spherique(palier=1.0, portee=10)
        ks = krigeage_simple(X, z, np.array([[20.0, 20.0]]), modele, moyenne=m)
        ko = krigeage_ordinaire(X, z, np.array([[20.0, 20.0]]), modele)
        # Loin des observations, les deux convergent vers la moyenne
        assert abs(ks.estimation[0] - ko.estimation[0]) < 0.5


class TestRaiseSurLimite:
    def test_max_points_protege(self):
        """Avec trop d'observations, KO doit lever GeostatLimitExceeded."""
        from geostat_polymtl._exceptions import GeostatLimitExceeded
        X = np.random.default_rng(0).uniform(0, 10, (250, 2))
        z = np.random.default_rng(1).normal(size=250)
        modele = spherique(palier=1.0, portee=2)
        with pytest.raises(GeostatLimitExceeded):
            krigeage_ordinaire(X, z, np.array([[5.0, 5.0]]), modele,
                               max_points=100)

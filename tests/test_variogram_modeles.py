"""Invariants mathématiques des modèles de variogramme."""
from __future__ import annotations

import numpy as np
import pytest

from geostat_polymtl.variogram.modeles import (
    Modele,
    covariance,
    exponentiel,
    gamma,
    gaussien,
    pepite,
    spherique,
)


class TestSpherique:
    def test_gamma_a_zero_vaut_zero(self):
        m = spherique(palier=10, portee=20)
        assert gamma(m, 0.0) == 0.0

    def test_gamma_a_portee_atteint_palier(self):
        m = spherique(palier=10, portee=20)
        assert np.isclose(gamma(m, 20.0), 10.0)

    def test_gamma_au_dela_portee_reste_palier(self):
        m = spherique(palier=10, portee=20)
        for h in [25, 50, 100, 1000]:
            assert np.isclose(gamma(m, float(h)), 10.0)

    def test_gamma_a_demi_portee_est_correct(self):
        """γ(a/2) = C · [1.5·(0.5) − 0.5·(0.5)³] = C · 0.6875"""
        m = spherique(palier=10, portee=20)
        assert np.isclose(gamma(m, 10.0), 6.875)

    def test_pepite_ajoute_aux_h_positifs(self):
        m = spherique(palier=10, portee=20, pepite=2)
        assert gamma(m, 0.0) == 0.0  # h = 0 → 0
        assert np.isclose(gamma(m, 20.0), 12.0)  # palier + pépite

    def test_symetrie_dans_h(self):
        """γ ne dépend que de |h|."""
        m = spherique(palier=5, portee=10)
        h = np.array([3.0, -3.0, 7.0, -7.0])
        g = gamma(m, np.abs(h))
        assert np.allclose(g[0], g[1])
        assert np.allclose(g[2], g[3])


class TestExponentiel:
    def test_gamma_a_zero(self):
        assert gamma(exponentiel(palier=1.0, portee=10), 0.0) == 0.0

    def test_portee_pratique_a_95_percent(self):
        """À la portée pratique a, γ(a) = C · (1 - exp(-3)) ≈ 0.95·C."""
        m = exponentiel(palier=1.0, portee=10)
        assert np.isclose(gamma(m, 10.0), 1 - np.exp(-3))


class TestGaussien:
    def test_gamma_a_zero(self):
        assert gamma(gaussien(palier=1.0, portee=10), 0.0) == 0.0

    def test_portee_pratique_a_95_percent(self):
        """À la portée pratique a, γ(a) = C · (1 - exp(-3)) ≈ 0.95·C."""
        m = gaussien(palier=1.0, portee=10)
        assert np.isclose(gamma(m, 10.0), 1 - np.exp(-3))


class TestPepite:
    def test_pepite_pur(self):
        m = pepite(palier=5.0)
        assert gamma(m, 0.0) == 0.0
        assert gamma(m, 1.0) == 5.0
        assert gamma(m, 1000.0) == 5.0


class TestCovariance:
    def test_covariance_egale_palier_total_a_zero(self):
        m = spherique(palier=10, portee=20, pepite=2)
        assert np.isclose(covariance(m, 0.0), 12.0)

    def test_covariance_tend_vers_zero_a_grande_distance_si_pepite_pure(self):
        m = spherique(palier=10, portee=20, pepite=0)
        assert np.isclose(covariance(m, 100.0), 0.0)


class TestAcceptationDict:
    """gamma() doit accepter aussi bien un Modele qu'un dict (golden vectors)."""

    def test_dict_equivalent_a_modele(self):
        m_obj = spherique(palier=10, portee=20, pepite=1)
        m_dict = {"type": "spherique", "palier": 10, "portee": 20, "pepite": 1}
        h = np.array([0, 5, 10, 20, 30])
        assert np.allclose(gamma(m_obj, h), gamma(m_dict, h))

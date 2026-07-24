"""Tests des générateurs synthétiques (FFT-MA, lognormal, agrégation)."""
from __future__ import annotations

import numpy as np

from geostat_polymtl.data.synthetic import (
    aggregate_blocs,
    champ_fftma_2d,
    champ_lognormal_2d,
)


class TestFFTMA:
    def test_taille_correcte(self):
        champ = champ_fftma_2d(taille=32, portee=8, rng=0)
        assert champ.shape == (32, 32)

    def test_determinisme_avec_seed(self):
        a = champ_fftma_2d(taille=16, portee=4, rng=7)
        b = champ_fftma_2d(taille=16, portee=4, rng=7)
        assert np.allclose(a, b)

    def test_seeds_differents_donnent_resultats_differents(self):
        a = champ_fftma_2d(taille=16, portee=4, rng=1)
        b = champ_fftma_2d(taille=16, portee=4, rng=2)
        assert not np.allclose(a, b)

    def test_moyenne_proche_zero_sur_grande_grille(self):
        champ = champ_fftma_2d(taille=128, portee=10, rng=42)
        # Champ gaussien centré : moyenne ≈ 0 (tolérance large)
        assert abs(np.mean(champ)) < 0.2


class TestLognormal:
    def test_toutes_valeurs_positives(self):
        champ = champ_lognormal_2d(taille=32, portee=8, moyenne=1.0, rng=0)
        assert (champ > 0).all()


class TestAgregation:
    def test_taille_reduite(self):
        champ = np.arange(64).reshape(8, 8).astype(float)
        agg = aggregate_blocs(champ, taille_bloc=2)
        assert agg.shape == (4, 4)

    def test_moyenne_preservee_globalement(self):
        rng = np.random.default_rng(0)
        champ = rng.standard_normal((16, 16))
        agg = aggregate_blocs(champ, taille_bloc=4)
        # La moyenne d'une moyenne == moyenne globale
        assert np.isclose(np.mean(agg), np.mean(champ), atol=1e-6)

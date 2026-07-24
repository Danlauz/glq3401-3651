"""Tests de la gestion centralisée des seeds."""
from __future__ import annotations

import numpy as np
import pytest

from geostat_polymtl._exceptions import GeostatNonReproductibleWarning
from geostat_polymtl._seed import _resolve, get_rng, set_default_seed


class TestResolve:
    def test_int_donne_generator_reproductible(self):
        rng1 = _resolve(42)
        rng2 = _resolve(42)
        assert rng1.standard_normal() == rng2.standard_normal()

    def test_generator_passe_tel_quel(self):
        g = np.random.default_rng(7)
        assert _resolve(g) is g

    def test_default_seed_utilise(self):
        set_default_seed(123)
        rng = _resolve(None)
        # Devrait utiliser le générateur global
        assert rng is get_rng()
        # Pour la suite des tests, on remet la graine du conftest
        set_default_seed(42)

    def test_type_invalide(self):
        with pytest.raises(TypeError):
            _resolve("pas un entier")

    def test_aucun_default_avec_filtre_test(self):
        """Avec le filterwarnings de pytest.ini, l'absence de seed → erreur."""
        # On efface temporairement la graine globale via une astuce.
        import geostat_polymtl._seed as seed_mod
        ancien = seed_mod._DEFAULT_RNG
        seed_mod._DEFAULT_RNG = None
        try:
            with pytest.warns(GeostatNonReproductibleWarning):
                # Sous pytest.ini filterwarnings, ceci serait une erreur ;
                # on utilise pytest.warns en récupération manuelle.
                import warnings
                with warnings.catch_warnings():
                    warnings.simplefilter("always", GeostatNonReproductibleWarning)
                    _resolve(None)
        finally:
            seed_mod._DEFAULT_RNG = ancien

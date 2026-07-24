"""Tests unitaires pour geostat_polymtl.conventional (chap. 05)."""
import importlib.util, sys, os

# Charger les sous-modules conventional directement (contourne le __init__ top-level
# qui dépend de 'functional.helper', absent dans cet environnement CI).
_base = os.path.join(os.path.dirname(__file__), '..', 'geostat_polymtl', 'conventional')
def _load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod  = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod

_idw_m  = _load('geostat_polymtl.conventional.idw',      os.path.join(_base, 'idw.py'))
_ppv_m  = _load('geostat_polymtl.conventional.polygones', os.path.join(_base, 'polygones.py'))
_tri_m  = _load('geostat_polymtl.conventional.triangles', os.path.join(_base, 'triangles.py'))
_sec_m  = _load('geostat_polymtl.conventional.sections',  os.path.join(_base, 'sections.py'))
_qua_m  = _load('geostat_polymtl.conventional.qualite',   os.path.join(_base, 'qualite.py'))

import numpy as np
import pytest

idw                    = _idw_m.idw
estimer_grille_idw     = _idw_m.estimer_grille_idw
plus_proche_voisin     = _ppv_m.plus_proche_voisin
estimer_grille_ppv     = _ppv_m.estimer_grille_ppv
aire_polygones         = _ppv_m.aire_polygones
interpolation_triangulaire = _tri_m.interpolation_triangulaire
estimer_grille_triangles   = _tri_m.estimer_grille_triangles
volume_entre_sections  = _sec_m.volume_entre_sections
tonnage                = _sec_m.tonnage
metal_contenu          = _sec_m.metal_contenu
estimer_sections       = _sec_m.estimer_sections
comparer_methodes      = _sec_m.comparer_methodes
statistiques_erreur    = _qua_m.statistiques_erreur


# ── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture
def grille_2x2():
    coords = np.array([[0., 0.], [10., 0.], [0., 10.], [10., 10.]])
    valeurs = np.array([1.0, 3.0, 5.0, 7.0])
    return coords, valeurs


@pytest.fixture
def triangle():
    coords = np.array([[0., 0.], [20., 0.], [10., 15.]])
    valeurs = np.array([1.0, 5.0, 3.0])
    return coords, valeurs


# ── IDW ──────────────────────────────────────────────────────────────────────

class TestIDW:
    def test_sur_echantillon(self, grille_2x2):
        coords, vals = grille_2x2
        r = idw(coords, vals, coords)
        np.testing.assert_allclose(r, vals, atol=1e-10)

    def test_b0_moyenne(self, grille_2x2):
        coords, vals = grille_2x2
        pt = np.array([[5., 5.]])
        r = idw(coords, vals, pt, puissance=0)
        np.testing.assert_allclose(r[0], vals.mean(), rtol=1e-10)

    def test_b2_exemple_cours(self):
        """Exemple numérique de 05-04 : 5 obs, b=2."""
        coords = np.array([[0.,0.],[40.,0.],[0.,30.],[35.,0.],[0.,20.]])
        vals   = np.array([1.0, 1.0, 1.5, 1.5, 3.0])
        pt     = np.array([[0., 0.]])
        r = idw(coords, vals, pt, puissance=2)
        # Doit être sur l'échantillon exact → sa valeur
        np.testing.assert_allclose(r[0], 1.0, atol=1e-10)

    def test_rayon_maximal(self, grille_2x2):
        coords, vals = grille_2x2
        pt = np.array([[5., 5.]])
        r_inf  = idw(coords, vals, pt, puissance=2, rayon=np.inf)
        r_petit = idw(coords, vals, pt, puissance=2, rayon=1.0)
        assert np.isnan(r_petit[0])   # aucun point dans le rayon
        assert not np.isnan(r_inf[0])

    def test_grille(self, grille_2x2):
        coords, vals = grille_2x2
        g = estimer_grille_idw(coords, vals, 11, 11)
        assert g.shape == (11, 11)
        assert not np.any(np.isnan(g))

    def test_golden_b1(self):
        coords = np.array([[0.,0.],[10.,0.],[0.,10.],[10.,10.],[5.,5.]])
        vals   = np.array([1., 3., 5., 7., 4.])
        pts    = np.array([[3.,3.],[7.,7.],[0.,0.]])
        r = idw(coords, vals, pts, puissance=1.0)
        expected = [3.5759598074, 4.4240401926, 1.0]
        np.testing.assert_allclose(r, expected, atol=1e-8)

    def test_golden_b2(self):
        coords = np.array([[0.,0.],[10.,0.],[0.,10.],[10.,10.],[5.,5.]])
        vals   = np.array([1., 3., 5., 7., 4.])
        pts    = np.array([[3.,3.],[7.,7.],[0.,0.]])
        r = idw(coords, vals, pts, puissance=2.0)
        expected = [3.3959644174, 4.6040355826, 1.0]
        np.testing.assert_allclose(r, expected, atol=1e-8)


# ── Plus proche voisin ────────────────────────────────────────────────────────

class TestPPV:
    def test_sur_echantillon(self, grille_2x2):
        coords, vals = grille_2x2
        r = plus_proche_voisin(coords, vals, coords)
        np.testing.assert_array_equal(r, vals)

    def test_frontiere_voronoi(self):
        coords = np.array([[0., 0.], [10., 0.]])
        vals   = np.array([1.0, 9.0])
        pts    = np.array([[2., 0.], [8., 0.]])
        r = plus_proche_voisin(coords, vals, pts)
        np.testing.assert_array_equal(r, [1.0, 9.0])

    def test_golden(self):
        coords = np.array([[0.,0.],[10.,0.],[0.,10.],[10.,10.],[5.,5.]])
        vals   = np.array([1., 3., 5., 7., 4.])
        pts    = np.array([[3.,3.],[7.,7.],[0.,0.]])
        r = plus_proche_voisin(coords, vals, pts)
        np.testing.assert_array_equal(r, [4., 4., 1.])

    def test_aire_polygones(self):
        coords = np.array([[0., 0.], [10., 0.], [5., 10.]])
        aires = aire_polygones(coords, 20, 20)
        assert len(aires) == 3
        assert aires.sum() == pytest.approx(400.0, abs=5)  # ≈ 20×20 pixels


# ── Triangles ─────────────────────────────────────────────────────────────────

class TestTriangles:
    def test_sur_sommets(self, triangle):
        coords, vals = triangle
        r = interpolation_triangulaire(coords, vals, coords, mode='barycentrique')
        np.testing.assert_allclose(r, vals, atol=1e-10)

    def test_centroide_barycentrique(self, triangle):
        coords, vals = triangle
        centroide = coords.mean(axis=0, keepdims=True)
        r = interpolation_triangulaire(coords, vals, centroide, mode='barycentrique')
        np.testing.assert_allclose(r[0], vals.mean(), atol=1e-10)

    def test_centroide_moyenne(self, triangle):
        coords, vals = triangle
        centroide = coords.mean(axis=0, keepdims=True)
        r = interpolation_triangulaire(coords, vals, centroide, mode='moyenne')
        np.testing.assert_allclose(r[0], vals.mean(), atol=1e-10)

    def test_hors_enveloppe_nan(self, triangle):
        coords, vals = triangle
        r = interpolation_triangulaire(coords, vals, np.array([[100., 100.]]))
        assert np.isnan(r[0])

    def test_golden_barycentrique(self):
        c = np.array([[0.,0.],[20.,0.],[10.,15.],[5.,8.]])
        v = np.array([1., 5., 3., 2.])
        pts = np.array([[10.,5.],[5.,4.],[15.,5.]])
        r = interpolation_triangulaire(c, v, pts, mode='barycentrique')
        np.testing.assert_allclose(r, [3., 2., 4.], atol=1e-9)

    def test_golden_moyenne(self):
        c = np.array([[0.,0.],[20.,0.],[10.,15.],[5.,8.]])
        v = np.array([1., 5., 3., 2.])
        pts = np.array([[10.,5.],[5.,4.],[15.,5.]])
        r = interpolation_triangulaire(c, v, pts, mode='moyenne')
        np.testing.assert_allclose(r, [8/3, 8/3, 10/3], atol=1e-9)

    def test_grille(self):
        coords = np.array([[0.,0.],[10.,0.],[0.,10.],[10.,10.]])
        vals   = np.array([1., 3., 5., 7.])
        g = estimer_grille_triangles(coords, vals, 11, 11)
        assert g.shape == (11, 11)
        # coins sur échantillons
        np.testing.assert_allclose(g[0,0], 1., atol=1e-9)
        np.testing.assert_allclose(g[10,0], 3., atol=1e-9)


# ── Sections ──────────────────────────────────────────────────────────────────

class TestSections:
    def test_volume_moyenne(self):
        v = volume_entre_sections(600, 1200, 20, 'moyenne')
        assert v == pytest.approx(18000.0, rel=1e-10)

    def test_volume_tronc(self):
        v = volume_entre_sections(600, 1200, 20, 'tronc')
        assert v == pytest.approx(17656.854249492382, rel=1e-8)

    def test_volume_sections_egales(self):
        """Sections égales : moyenne == tronc."""
        vm = volume_entre_sections(500, 500, 10, 'moyenne')
        vt = volume_entre_sections(500, 500, 10, 'tronc')
        assert vm == pytest.approx(vt, rel=1e-10)

    def test_methode_inconnue(self):
        with pytest.raises(ValueError):
            volume_entre_sections(100, 200, 10, 'invalide')

    def test_tonnage_metal(self):
        T = tonnage(18000, 2.7)
        assert T == pytest.approx(48600.0)
        M = metal_contenu(T, 3.0)
        assert M == pytest.approx(1458.0)

    def test_estimer_sections_moyenne(self):
        r = estimer_sections(600, 2.0, 1200, 4.0, 20, 2.7, 'moyenne')
        assert r.volume == pytest.approx(18000.0, rel=1e-10)
        assert r.teneur_moyenne == pytest.approx((600*2+1200*4)/1800, rel=1e-10)

    def test_estimer_sections_tronc(self):
        r = estimer_sections(600, 2.0, 1200, 4.0, 20, 2.7, 'tronc')
        assert r.volume == pytest.approx(17656.854249492382, rel=1e-8)

    def test_comparer_methodes_cles(self):
        res = comparer_methodes(800, 5.0, 500, 3.0, 25, 2.7)
        assert set(res.keys()) == {'moyenne', 'tronc'}
        assert res['moyenne'].volume == pytest.approx(16250.0, rel=1e-10)
        assert res['tronc'].volume == pytest.approx(16103.796100280633, rel=1e-8)

    def test_teneur_moyenne_coherente(self):
        """La teneur moyenne doit être entre t1 et t2."""
        r = estimer_sections(300, 1.0, 1000, 8.0, 15, 2.8, 'moyenne')
        assert 1.0 <= r.teneur_moyenne <= 8.0


# ── Qualité ───────────────────────────────────────────────────────────────────

class TestQualite:
    def test_estimateur_parfait(self):
        v = np.array([1., 2., 3., 4.])
        s = statistiques_erreur(v, v)
        assert s.biais == pytest.approx(0.0, abs=1e-12)
        assert s.rmse  == pytest.approx(0.0, abs=1e-12)
        assert s.r2    == pytest.approx(1.0, abs=1e-10)

    def test_biais_positif(self):
        v = np.array([1., 2., 3., 4.])
        e = v + 1.0
        s = statistiques_erreur(v, e)
        assert s.biais == pytest.approx(1.0, abs=1e-10)

    def test_nan_ignore(self):
        v = np.array([1., 2., np.nan, 4.])
        e = np.array([1., 2., 99.,    4.])
        s = statistiques_erreur(v, e)
        assert s.n == 3

    def test_n_zero(self):
        s = statistiques_erreur(np.array([np.nan]), np.array([1.0]))
        assert s.n == 0
        assert np.isnan(s.biais)

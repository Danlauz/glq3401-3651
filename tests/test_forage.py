"""Tests du package geostat_polymtl.forage (chapitre 04).

Les valeurs de référence reproduisent EXACTEMENT les calculs des widgets JS
afin de garantir l'équivalence JS <-> Python (cf. golden vectors).
"""
from __future__ import annotations

import math

import numpy as np
import pytest

from geostat_polymtl.forage import (
    composite_longueur_fixe,
    composites_positions,
    decrire,
    degroupement_cellules,
    moyenne_degroupee,
    propagation_tonnage,
    tangentielle_equilibree,
)


# ---------------------------------------------------------------------------
# Désurvey — méthode tangentielle équilibrée
# ---------------------------------------------------------------------------

EX_STATIONS = [
    {"md": 0, "az": 103, "inc": 53},
    {"md": 40, "az": 107, "inc": 58},
    {"md": 100, "az": 120, "inc": 65},
    {"md": 120, "az": 135, "inc": 72},
]


def _ref_balanced(stations):
    """Réimplémentation indépendante (mirroir du JS) pour comparaison."""
    pts = [{"md": stations[0]["md"], "x": 0.0, "y": 0.0, "z": 0.0}]
    for i in range(1, len(stations)):
        s1, s2 = stations[i - 1], stations[i]
        dmd = s2["md"] - s1["md"]
        I1, A1 = math.radians(s1["inc"]), math.radians(s1["az"])
        I2, A2 = math.radians(s2["inc"]), math.radians(s2["az"])
        prev = pts[-1]
        dx = dmd / 2 * (math.sin(I1) * math.sin(A1) + math.sin(I2) * math.sin(A2))
        dy = dmd / 2 * (math.sin(I1) * math.cos(A1) + math.sin(I2) * math.cos(A2))
        dz = dmd / 2 * (math.cos(I1) + math.cos(I2))
        pts.append({"md": s2["md"], "x": prev["x"] + dx,
                    "y": prev["y"] + dy, "z": prev["z"] - dz})
    return pts


def test_tangentielle_origine_et_longueur():
    pts = tangentielle_equilibree(EX_STATIONS)
    assert len(pts) == len(EX_STATIONS)
    assert (pts[0].x, pts[0].y, pts[0].z) == (0.0, 0.0, 0.0)
    assert pts[0].md == 0


def test_tangentielle_concorde_avec_reference():
    pts = tangentielle_equilibree(EX_STATIONS)
    ref = _ref_balanced(EX_STATIONS)
    for p, r in zip(pts, ref):
        assert p.md == pytest.approx(r["md"])
        assert p.x == pytest.approx(r["x"], abs=1e-12)
        assert p.y == pytest.approx(r["y"], abs=1e-12)
        assert p.z == pytest.approx(r["z"], abs=1e-12)


def test_tangentielle_descend():
    # z doit décroître (forage vers le bas)
    pts = tangentielle_equilibree(EX_STATIONS)
    zs = [p.z for p in pts]
    assert all(b <= a for a, b in zip(zs, zs[1:]))


def test_composites_positions_pas_regulier():
    pts = tangentielle_equilibree(EX_STATIONS)
    comps = composites_positions(pts, longueur=10, md_max=120)
    mds = [c.md for c in comps]
    assert mds[0] == pytest.approx(5.0)
    assert all(b - a == pytest.approx(10.0) for a, b in zip(mds, mds[1:]))
    assert max(mds) <= 120


# ---------------------------------------------------------------------------
# Composites — régularisation
# ---------------------------------------------------------------------------

EX_ECH = [
    {"de": 0, "a": 1, "valeur": 1.00},
    {"de": 2, "a": 3, "valeur": 5.85},
    {"de": 4, "a": 6, "valeur": 1.75},
]


def test_composite_moyenne_ponderee():
    # composite [0,3) recouvre éch1 (0-1, v=1) et éch2 (2-3, v=5.85)
    comps = composite_longueur_fixe(EX_ECH, longueur=3, couverture_min=0.5)
    c0 = comps[0]
    assert c0.de == 0 and c0.a == 3
    # longueur couverte = 1 + 1 = 2 ; couverture = 2/3
    assert c0.couverture == pytest.approx(2 / 3)
    assert c0.valeur == pytest.approx((1.0 * 1 + 5.85 * 1) / 2)
    assert c0.valide is True


def test_composite_invalide_est_nan():
    # couverture exigée à 100 % -> aucun composite ne l'atteint ici
    comps = composite_longueur_fixe(EX_ECH, longueur=3, couverture_min=1.0)
    assert all(math.isnan(c.valeur) for c in comps)
    assert all(c.valide is False for c in comps)


def test_composite_couvre_intervalle_complet():
    comps = composite_longueur_fixe(EX_ECH, longueur=3, couverture_min=0.5)
    assert comps[0].de == 0
    assert comps[-1].a >= 6


# ---------------------------------------------------------------------------
# Dégroupement par cellules
# ---------------------------------------------------------------------------

def test_degroupement_poids_somme_a_un():
    pts = [{"x": 10, "y": 10}, {"x": 12, "y": 11}, {"x": 200, "y": 200}]
    res = degroupement_cellules(pts, 50, 0, 380, 0, 340)
    assert res.poids.sum() == pytest.approx(1.0)


def test_degroupement_zone_dense_moins_de_poids():
    # 2 points serrés (même cellule) + 1 point isolé
    pts = [{"x": 10, "y": 10}, {"x": 12, "y": 11}, {"x": 300, "y": 300}]
    res = degroupement_cellules(pts, 50, 0, 380, 0, 340)
    # L_o = 2 cellules ; les 2 points denses : 1/(2*2)=0.25 ; l'isolé : 1/(1*2)=0.5
    assert res.n_cellules_occupees == 2
    assert res.poids[0] == pytest.approx(0.25)
    assert res.poids[1] == pytest.approx(0.25)
    assert res.poids[2] == pytest.approx(0.5)


def test_moyenne_degroupee_corrige_le_biais():
    # zone riche suréchantillonnée : moyenne brute > moyenne dégroupée
    pts = [{"x": 10, "y": 10}, {"x": 12, "y": 12}, {"x": 14, "y": 11},
           {"x": 300, "y": 300}]
    vals = [9.0, 9.0, 9.0, 1.0]  # 3 forts groupés, 1 faible isolé
    brute = float(np.mean(vals))
    degr = moyenne_degroupee(pts, vals, 50, 0, 380, 0, 340)
    assert degr < brute


# ---------------------------------------------------------------------------
# Statistiques descriptives
# ---------------------------------------------------------------------------

def test_decrire_valeurs_connues():
    vals = [2, 4, 4, 4, 5, 5, 7, 9]
    s = decrire(vals)
    assert s.n == 8
    assert s.moyenne == pytest.approx(5.0)
    assert s.mediane == pytest.approx(4.5)         # (4+5)/2
    assert s.minimum == 2 and s.maximum == 9
    # variance non biaisée (n-1) : somme((v-5)^2)=32 ; /7
    assert s.variance == pytest.approx(32 / 7)
    assert s.ecart_type == pytest.approx(math.sqrt(32 / 7))


def test_decrire_quartiles_rang_inferieur():
    vals = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    s = decrire(vals)
    # floor(10*0.25)=2 -> vals[2]=3 ; floor(10*0.75)=7 -> vals[7]=8
    assert s.q1 == 3
    assert s.q3 == 8
    assert s.iqr == 5


def test_decrire_exige_deux_valeurs():
    with pytest.raises(ValueError):
        decrire([42])


# ---------------------------------------------------------------------------
# Propagation d'erreur sur le tonnage
# ---------------------------------------------------------------------------

def test_propagation_valeurs_par_defaut():
    r = propagation_tonnage(5000, 250, 3.2, 0.10, 2.5, 0.40)
    assert r.M == pytest.approx(5000 * 3.2 * 0.025)        # = 400 t
    assert r.err_rel_V == pytest.approx(0.05)
    assert r.err_rel_d == pytest.approx(0.03125)
    assert r.err_rel_t == pytest.approx(0.16)
    somme = 0.05 ** 2 + 0.03125 ** 2 + 0.16 ** 2
    assert r.err_rel_M == pytest.approx(math.sqrt(somme))
    assert r.contrib_V + r.contrib_d + r.contrib_t == pytest.approx(100.0)


def test_propagation_teneur_dominante():
    r = propagation_tonnage(5000, 250, 3.2, 0.10, 2.5, 0.40)
    assert r.dominant == "Teneur"
    assert r.contrib_t == max(r.contrib_V, r.contrib_d, r.contrib_t)

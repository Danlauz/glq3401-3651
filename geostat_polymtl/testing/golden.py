"""Génération des `golden vectors` pour les widgets JS du site.

Mode d'emploi
-------------
1. Modifier la liste des cas dans :func:`generer_golden_vectors`.
2. Lancer la commande :

   .. code-block:: bash

       python -m geostat_polymtl.testing.golden \\
           --output scripts/geostat-js/golden_vectors.json

3. Le fichier JSON est versionné et servi par Quarto. Chaque widget JS rejoue
   au démarrage les vecteurs concernant ses fonctions et affiche un
   avertissement console s'il diverge.

Pourquoi cette mécanique ?
--------------------------
Les widgets sont écrits en JavaScript pour la fluidité ; la librairie Python
reste la source de vérité. Les golden vectors garantissent que les deux
restent en accord (cf. rapport phase 3 §5.2).
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

import numpy as np

from geostat_polymtl.utils.version import __version__
from geostat_polymtl.cov_func.covar import covar
from geostat_polymtl.sampling.gy import (
    ParametresGy,
    ecart_type_relatif,
    masse_minimale,
)
from geostat_polymtl.sampling.densite import masse_volumique_melange
from geostat_polymtl.sampling.standards import detecter_anomalies
from geostat_polymtl.sampling.duplicatas import analyser_duplicatas
from geostat_polymtl.treatment.composite import Echantillon, calculer_composites
from geostat_polymtl.treatment.degroupement import degrouper
from geostat_polymtl.treatment.deviations import MesureDeviation, cosinus_directeurs
from geostat_polymtl.treatment.erreurs import propagation_tonnage
from geostat_polymtl.treatment.exploratoire import statistiques_descriptives
from geostat_polymtl.conventional.idw import idw as _idw
from geostat_polymtl.conventional.polygones import plus_proche_voisin
from geostat_polymtl.conventional.triangles import interpolation_triangulaire
from geostat_polymtl.conventional.sections import volume_entre_sections


def _cas_conventional_c05() -> "list[dict[str, Any]]":
    """Cas canoniques pour les methodes conventionnelles (chap. 05)."""
    cas: "list[dict[str, Any]]" = []
    coords = [[0, 0], [10, 0], [0, 10], [10, 10]]
    vals = [1.0, 3.0, 5.0, 7.0]

    # IDW (rayon grand fini, JSON ne supporte pas l'infini)
    pts = [[5, 5], [2, 1], [9, 8]]
    RAYON = 1e12
    est = _idw(np.array(coords, float), np.array(vals, float), np.array(pts, float),
               puissance=2.0, rayon=RAYON)
    cas.append({
        "id": "c05_idw", "fonction": "conventional.idw.idw",
        "entrees": {"coordonnees": coords, "valeurs": vals, "points": pts, "puissance": 2.0, "rayon": RAYON},
        "sorties": {"valeurs": [float(x) for x in est]}, "tolerance": 1e-9,
    })

    # Plus proche voisin
    ptsp = [[1, 1], [9, 1], [1, 9], [8, 8]]
    estp = plus_proche_voisin(np.array(coords, float), np.array(vals, float), np.array(ptsp, float))
    cas.append({
        "id": "c05_ppv", "fonction": "conventional.polygones.plus_proche_voisin",
        "entrees": {"coordonnees": coords, "valeurs": vals, "points": ptsp},
        "sorties": {"valeurs": [float(x) for x in estp]}, "tolerance": 1e-9,
    })

    # Triangle unique (3 points, requete interieure -> pas d'ambiguite de triangulation)
    c3, v3, q = [[0, 0], [10, 0], [0, 10]], [0.0, 10.0, 5.0], [[2, 2]]
    estt = interpolation_triangulaire(np.array(c3, float), np.array(v3, float),
                                      np.array(q, float), mode="barycentrique")
    cas.append({
        "id": "c05_triangle_bary", "fonction": "conventional.triangles.interpolation_triangulaire",
        "entrees": {"coordonnees": c3, "valeurs": v3, "points": q, "mode": "barycentrique"},
        "sorties": {"valeurs": [float(x) for x in estt]}, "tolerance": 1e-9,
    })

    # Sections : moyenne et tronc
    for mid, meth in [("c05_sections_moyenne", "moyenne"), ("c05_sections_tronc", "tronc")]:
        cas.append({
            "id": mid, "fonction": "conventional.sections.volume_entre_sections",
            "entrees": {"S1": 600, "S2": 1200, "L": 20, "methode": meth},
            "sorties": {"volume": float(volume_entre_sections(600, 1200, 20, meth))},
            "tolerance": 1e-9,
        })

    return cas


def _cas_treatment_c04() -> "list[dict[str, Any]]":
    """Cas canoniques pour le traitement des donnees de forage (chap. 04)."""
    cas: "list[dict[str, Any]]" = []

    # Composite
    echs = [{"de": 0, "a": 1, "teneur": 0.5}, {"de": 1, "a": 2.5, "teneur": 2.1},
            {"de": 2.5, "a": 4, "teneur": 5.4}, {"de": 4, "a": 5.2, "teneur": 3.8}]
    L, cmin = 2.0, 0.5
    cs = calculer_composites([Echantillon(e["de"], e["a"], e["teneur"]) for e in echs], L, cmin)
    cas.append({
        "id": "c04_composite_L2", "fonction": "treatment.composite.calculer_composites",
        "entrees": {"echantillons": echs, "longueur": L, "couverture_min": cmin},
        "sorties": {
            "de": [c.de for c in cs], "a": [c.a for c in cs],
            "teneur": [(c.teneur if c.valide else -1) for c in cs],
            "couverture": [c.couverture for c in cs],
            "valide": [(1 if c.valide else 0) for c in cs],
        }, "tolerance": 1e-9,
    })

    # Degroupement
    coords = [[0, 0], [1, 1], [1, 0], [2, 2], [50, 50], [51, 50]]
    vals = [5.0, 6.0, 5.5, 5.2, 1.0, 1.1]
    tc = 10.0
    r = degrouper(np.array(coords, float), np.array(vals, float), tc)
    cas.append({
        "id": "c04_degrouper_c10", "fonction": "treatment.degroupement.degrouper",
        "entrees": {"coordonnees": coords, "valeurs": vals, "taille_cellule": tc},
        "sorties": {
            "poids": r.poids.tolist(),
            "moyenne_brute": float(r.moyenne_brute), "moyenne_ponderee": float(r.moyenne_ponderee),
            "variance_brute": float(r.variance_brute), "variance_ponderee": float(r.variance_ponderee),
        }, "tolerance": 1e-9,
    })

    # Deviations (cosinus directeurs)
    mes = [{"md": 0, "azimut": 90, "plongee": 60}, {"md": 50, "azimut": 100, "plongee": 50},
           {"md": 100, "azimut": 110, "plongee": 40}]
    cd = cosinus_directeurs([MesureDeviation(m["md"], m["azimut"], m["plongee"]) for m in mes])
    cas.append({
        "id": "c04_cosinus", "fonction": "treatment.deviations.cosinus_directeurs",
        "entrees": {"mesures": mes}, "sorties": {"cosinus": [list(t) for t in cd]}, "tolerance": 1e-9,
    })

    # Propagation d'erreur
    rp = propagation_tonnage(5000, 250, 3.2, 0.10, 2.5, 0.40)
    cas.append({
        "id": "c04_propagation", "fonction": "treatment.erreurs.propagation_tonnage",
        "entrees": {"volume": 5000, "sigma_volume": 250, "densite": 3.2,
                    "sigma_densite": 0.10, "teneur": 2.5, "sigma_teneur": 0.40},
        "sorties": {"M": rp.M, "sigma_M": rp.sigma_M, "erreur_relative_M": rp.erreur_relative_M,
                    "cV": rp.contributions["V"], "cd": rp.contributions["d"], "ct": rp.contributions["t"]},
        "tolerance": 1e-9,
    })

    # Statistiques exploratoires
    vv = [1, 2, 2, 3, 10, 4, 5, 2.5, 1.5, 8]
    s = statistiques_descriptives(np.array(vv, float))
    cas.append({
        "id": "c04_stats", "fonction": "treatment.exploratoire.statistiques_descriptives",
        "entrees": {"valeurs": vv},
        "sorties": {"moyenne": s.moyenne, "mediane": s.mediane, "ecart_type": s.ecart_type,
                    "variance": s.variance, "q1": s.q1, "q3": s.q3,
                    "asymetrie": s.asymetrie, "aplatissement": s.aplatissement},
        "tolerance": 1e-9,
    })

    return cas


def _cas_gy() -> list[dict[str, Any]]:
    """Cas canoniques pour la formule fondamentale de Gy (chap. 03).

    Vérifie le port JS de ``ecart_type_relatif`` et ``masse_minimale``.
    """
    cas: list[dict[str, Any]] = []

    jeux = [
        ("gy_base", dict(al=0.03, da=5.0, dg=2.8, d0=0.04, f=0.5, g=0.25),
         dict(me=100.0, ml=10000.0, d=0.25)),
        ("gy_grossier", dict(al=0.01, da=4.1, dg=2.7, d0=0.1, f=0.5, g=0.25),
         dict(me=1000.0, ml=50000.0, d=1.0)),
        ("gy_fin", dict(al=0.05, da=7.5, dg=2.65, d0=0.01, f=0.4, g=0.5),
         dict(me=30.0, ml=2000.0, d=0.05)),
    ]
    for label, p, e in jeux:
        params = ParametresGy(**p)
        sr = float(ecart_type_relatif(params, e["me"], e["ml"], e["d"]))
        cas.append({
            "id": label,
            "fonction": "sampling.gy.ecart_type_relatif",
            "entrees": {"params": p, "me": e["me"], "ml": e["ml"], "d": e["d"]},
            "sorties": {"sr": sr},
            "tolerance": 1e-9,
        })

    # Masse minimale pour un sr cible
    for label, p, ml, d, sr_cible in [
        ("gy_mmin_5pct", dict(al=0.03, da=5.0, dg=2.8, d0=0.04, f=0.5, g=0.25),
         10000.0, 0.25, 0.05),
        ("gy_mmin_10pct", dict(al=0.01, da=4.1, dg=2.7, d0=0.1, f=0.5, g=0.25),
         50000.0, 1.0, 0.10),
    ]:
        params = ParametresGy(**p)
        me_min = float(masse_minimale(params, ml, d, sr_cible))
        cas.append({
            "id": label,
            "fonction": "sampling.gy.masse_minimale",
            "entrees": {"params": p, "ml": ml, "d": d, "sr_cible": sr_cible},
            "sorties": {"me": me_min},
            "tolerance": 1e-6,
        })

    return cas


def _cas_densite() -> list[dict[str, Any]]:
    """Cas pour la masse volumique d'un mélange minéral (chap. 03)."""
    cas: list[dict[str, Any]] = []
    jeux = [
        ("densite_cuzn",
         [8.57, 7.46, 37.09, 46.88], [4.2, 4.1, 5.0, 2.68], 0.0),
        ("densite_porosite",
         [8.57, 7.46, 37.09, 46.88], [4.2, 4.1, 5.0, 2.68], 0.05),
        ("densite_simple", [50.0, 50.0], [3.0, 2.0], 0.0),
    ]
    for label, teneurs, densites, poro in jeux:
        rho = masse_volumique_melange(teneurs, densites, poro)
        cas.append({
            "id": label,
            "fonction": "sampling.densite.masse_volumique_melange",
            "entrees": {"teneurs": teneurs, "densites": densites, "porosite": poro},
            "sorties": {"rho": rho},
            "tolerance": 1e-9,
        })
    return cas


def _cas_standards() -> list[dict[str, Any]]:
    """Cas pour les règles de Western Electric (chap. 03)."""
    cas: list[dict[str, Any]] = []
    moy, sigma = 3.55, 0.086
    # Série fixe avec quelques anomalies volontaires
    valeurs = [
        3.55, 3.60, 3.50, 3.62, 3.48, 3.90,        # idx 5 : > 3σ (crit1)
        3.55, 3.78, 3.79,                          # idx 7,8 : 2 cons. > 2σ (crit2)
        3.66, 3.67, 3.68, 3.69,                    # 4 cons. > 1σ (crit3)
        3.40, 3.41, 3.39, 3.42, 3.40, 3.41, 3.38, 3.43,  # 8 cons. < μ (crit4)
        3.55, 3.56,
    ]
    anom = detecter_anomalies(valeurs, moy, sigma)
    cas.append({
        "id": "we_serie_mixte",
        "fonction": "sampling.standards.detecter_anomalies",
        "entrees": {"valeurs": valeurs, "moyenne": moy, "ecart_type": sigma},
        "sorties": {
            "c1": anom["Critère 1"],
            "c2": anom["Critère 2"],
            "c3": anom["Critère 3"],
            "c4": anom["Critère 4"],
        },
        "tolerance": 0,
    })
    return cas


def _cas_duplicatas() -> list[dict[str, Any]]:
    """Cas pour l'analyse de duplicatas : HARD et différence relative (chap. 03)."""
    cas: list[dict[str, Any]] = []
    d1 = [2.00, 2.10, 1.95, 3.00, 0.50, 4.20, 2.50, 1.80]
    d2 = [2.05, 1.90, 2.00, 2.70, 0.62, 4.00, 2.45, 2.10]
    r = analyser_duplicatas(d1, d2)
    cas.append({
        "id": "dup_petit_jeu",
        "fonction": "sampling.duplicatas.analyser_duplicatas",
        "entrees": {"dup1": d1, "dup2": d2},
        "sorties": {
            "diff_relative": r.diff_relative.tolist(),
            "pct_hard_sous_10": float(r.pct_hard_sous_10),
            "n_hors_10pct": int(r.n_hors_10pct),
            "n_hors_20pct": int(r.n_hors_20pct),
            "n_hors_30pct": int(r.n_hors_30pct),
        },
        "tolerance": 1e-9,
    })
    return cas


_CODES_COV = {"nugget": 1, "exponentiel": 2, "gaussien": 3, "spherique": 4}


def _gamma_modele(type_: str, palier: float, portee: float, pepite: float,
                   distances: "list[float]") -> "np.ndarray":
    """gamma(h) = palier_total - covar(h) pour un modele (+ pepite eventuelle),
    via la VRAIE fonction geostat_polymtl.cov_func.covar.covar (meme code que
    les ateliers JS/Pyodide, voir scripts/geostat-js/pyodide_setup.js)."""
    h = np.asarray(distances, dtype=float).reshape(-1, 1)
    h0 = np.zeros((1, 1))
    if pepite:
        model = np.array([[_CODES_COV["nugget"], 1.0],
                           [_CODES_COV[type_], float(portee)]])
        c = np.array([[float(pepite)], [float(palier)]])
    else:
        model = np.array([[_CODES_COV[type_], float(portee)]])
        c = np.array([[float(palier)]])
    palier_total = float(palier) + float(pepite)
    ch = np.asarray(covar(h, h0, model, c)).ravel()
    return palier_total - ch


def _cas_variogramme_modeles() -> list[dict[str, Any]]:
    """Cas canoniques pour les modèles théoriques de variogramme."""
    cas: list[dict[str, Any]] = []
    distances = [0, 5, 10, 15, 20, 25, 30, 50, 100]

    for label, type_, palier, portee, pepite in [
        ("spherique_a20_c10",       "spherique",   10, 20, 0),
        ("spherique_a20_c10_c0_2",  "spherique",   10, 20, 2),
        ("exponentiel_a20_c10",     "exponentiel", 10, 20, 0),
        ("gaussien_a20_c10",        "gaussien",    10, 20, 0),
        ("spherique_a50_c5",        "spherique",   5,  50, 0),
    ]:
        cas.append({
            "id":        f"gamma_{label}",
            "fonction":  "cov_func.covar.covar",
            "entrees":   {
                "modele": {
                    "type": type_,
                    "palier": palier,
                    "portee": portee,
                    "pepite": pepite,
                },
                "h": list(distances),
            },
            "sorties":   {"gamma": _gamma_modele(type_, palier, portee, pepite, distances).tolist()},
            "tolerance": 1e-9,
        })

    return cas


def generer_golden_vectors() -> dict[str, Any]:
    """Construit la structure complète des golden vectors.

    Pour ajouter de nouveaux cas (krigeage, variogramme expérimental, etc.),
    écrire une fonction ``_cas_<sujet>()`` et l'ajouter à la liste ci-dessous.
    """
    return {
        "version_lib": __version__,
        "vecteurs": [
            *_cas_variogramme_modeles(),
            *_cas_gy(),
            *_cas_densite(),
            *_cas_standards(),
            *_cas_duplicatas(),
            *_cas_treatment_c04(),
            *_cas_conventional_c05(),
            # *_cas_variogramme_experimental(),   # à ajouter
            # *_cas_krigeage_simple(),            # à ajouter
            # *_cas_krigeage_ordinaire(),         # à ajouter
        ],
    }


def sauver_golden_vectors(chemin: Path) -> int:
    """Écrit les golden vectors dans un fichier JSON. Retourne le nombre de cas."""
    data = generer_golden_vectors()
    chemin.parent.mkdir(parents=True, exist_ok=True)
    chemin.write_text(
        json.dumps(data, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    return len(data["vecteurs"])


def main(argv: list[str] | None = None) -> int:
    """Point d'entrée CLI : ``geostat-polymtl-goldens --output <fichier>``."""
    parser = argparse.ArgumentParser(
        description="Génère le fichier des golden vectors JSON pour les widgets."
    )
    parser.add_argument(
        "--output", "-o", type=Path, required=True,
        help="Chemin de sortie (ex. scripts/geostat-js/golden_vectors.json)",
    )
    args = parser.parse_args(argv)

    n = sauver_golden_vectors(args.output)
    try:
        print(f"✓ {n} golden vectors écrits dans {args.output}")
    except UnicodeEncodeError:  # console Windows en cp1252
        print(f"OK : {n} golden vectors ecrits dans {args.output}")
    return 0


if __name__ == "__main__":   # pragma: no cover
    sys.exit(main())

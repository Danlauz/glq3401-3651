"""Traitement et analyse des données de forage (chapitre 04).

Source unique de vérité pour les calculs des ateliers interactifs du
chapitre 4. Chaque fonction est reproduite à l'identique côté JavaScript et la
concordance est garantie par les *golden vectors*.

API publique
------------
- Désurvey : :class:`StationForage`, :class:`PointTrajectoire`,
  :func:`tangentielle_equilibree`, :func:`composites_positions`.
- Composites : :class:`EchantillonForage`, :class:`Composite`,
  :func:`composite_longueur_fixe`.
- Dégroupement : :class:`PointXY`, :class:`ResultatDegroupement`,
  :func:`degroupement_cellules`, :func:`moyenne_degroupee`.
- Statistiques : :class:`StatistiquesDescriptives`, :func:`decrire`.
- Erreurs : :class:`PropagationTonnage`, :func:`propagation_tonnage`.
- Géométrie (annexe A) : :func:`vecteur_unitaire`, :func:`conversions_plan`,
  :func:`intersection_plan_forage`, :func:`ellipse_intersection_plan_cylindre`.
"""
from geostat_polymtl.forage.desurvey import (
    PointTrajectoire,
    StationForage,
    composites_positions,
    tangentielle_equilibree,
)
from geostat_polymtl.forage.composites import (
    Composite,
    EchantillonForage,
    composite_longueur_fixe,
)
from geostat_polymtl.forage.degroupement import (
    PointXY,
    ResultatDegroupement,
    degroupement_cellules,
    moyenne_degroupee,
)
from geostat_polymtl.forage.statistiques import (
    StatistiquesDescriptives,
    decrire,
)
from geostat_polymtl.forage.erreurs import (
    PropagationTonnage,
    propagation_tonnage,
)
from geostat_polymtl.forage.geometrie import (
    base_plan,
    conversions_plan,
    direction_unitaire,
    ellipse_intersection_plan_cylindre,
    geologique_depuis_pendage,
    intersection_plan_forage,
    pendage_depuis_geologique,
    pendage_depuis_pole,
    pole_depuis_pendage,
    vecteur_unitaire,
)

__all__ = [
    # désurvey
    "StationForage",
    "PointTrajectoire",
    "tangentielle_equilibree",
    "composites_positions",
    # composites
    "EchantillonForage",
    "Composite",
    "composite_longueur_fixe",
    # dégroupement
    "PointXY",
    "ResultatDegroupement",
    "degroupement_cellules",
    "moyenne_degroupee",
    # statistiques
    "StatistiquesDescriptives",
    "decrire",
    # erreurs
    "PropagationTonnage",
    "propagation_tonnage",
    # géométrie (annexe A)
    "vecteur_unitaire",
    "direction_unitaire",
    "pole_depuis_pendage",
    "pendage_depuis_pole",
    "pendage_depuis_geologique",
    "geologique_depuis_pendage",
    "conversions_plan",
    "base_plan",
    "intersection_plan_forage",
    "ellipse_intersection_plan_cylindre",
]

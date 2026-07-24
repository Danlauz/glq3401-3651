"""Générateurs d'exercices du chapitre 02 — économie minière (théorie de Lane).

Versions Python (minces) des scripts MATLAB d'examen sur l'économie de Lane et
Taylor. Ces générateurs RÉUTILISENT ``geostat_polymtl.economics`` et ne
réimplémentent aucune mathématique du modèle.

Modules
-------
- :mod:`lane_courbes` — figures de courbes de Lane (C2-A multi-paramètres,
  C2-D effets info/capacité/temps/coûts, C2-E application + sensibilités).
- :mod:`lane_calcul` — calcul complet de la solution de Lane (CP1-Q1).

Correspondance avec ``Exercices/_MAPPING_EXERCICES.md`` :

===========  ============================================  ===========================================
Exercice     Fonction(s)                                   Source MATLAB
===========  ============================================  ===========================================
C2-A         ``lane_courbes.figure_c2a_interpretation``    ``2-Lane/Q2_InterpretationLane.m``
             ``lane_courbes.resultats_c2a``
C2-D         ``lane_courbes.figure_c2d_*``                 ``2-Lane/Q3_CalculLaneFromLogNormal.m``,
                                                           ``Automne2024/Q1-Lane/Q1_EvolutionMoyenne.m``
C2-E         ``lane_courbes.figure_c2e_*``                 courbe unique + sensibilités librairie
CP1-Q1       ``lane_calcul.calcul_cp1q1``,                 ``Automne2024/Q1-Lane/Q1_CalculLane.m``
             ``lane_calcul.figure_cp1q1*``
===========  ============================================  ===========================================
"""

from . import lane_courbes, lane_calcul

__all__ = ["lane_courbes", "lane_calcul"]

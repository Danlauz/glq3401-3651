"""Générateurs d'exercices du chapitre 13 (simulation catégorielle).

Portage Python des générateurs MATLAB d'examen du chapitre 13 (simulation
plurigaussienne PGS, gaussienne tronquée TGS, simulation séquentielle
d'indicatrices SIS). Chaque fonction RÉUTILISE la librairie
:mod:`geostat_polymtl.categorical` (TGS, PGS, SIS) et
:mod:`geostat_polymtl.simulation_methods.GFFTMA` pour les champs gaussiens
latents ; on n'ajoute que les paramètres des sources, les drapeaux (partition
du plan latent), la mise en page et le mélange des associations.

Modules
-------
- :mod:`pgs_drapeaux` — simulation plurigaussienne : bibliothèque de
  **drapeaux** (partitions de ``(F(Z₁),F(Z₂))``) et **réalisations** à associer
  (CP3-Q7 « PGS ou multipoint », jeux isotrope et anisotrope SO-NE 45°).
  Source ``Exercices/Examen/CP3/Code_Examen/12-PGS/`` (``ExercicePGS.m``,
  ``Liste_Drapeau.m``, ``PGS.m``, ``WorkpLace.m``).
- :mod:`tgs_sis` — gaussienne tronquée TGS : **réalisations + lecture des
  seuils** ``s_k = Φ⁻¹(·)`` à partir des proportions (CP3-Q8 « association
  visuelle SGI et TGS »), plus un enrobage SIS (réserve : ``SIS_grille``
  dégénère sur petites grilles).

Réserves / limitations signalées
---------------------------------
- ⚠️ Codes de TYPE de covariance : le **cubique** est le type 6 dans le MATLAB
  (``covardm``) mais le type 5 dans la librairie (``covar_nu``, où 6 = penta) ;
  les modèles repris du MATLAB sont remappés en conséquence.
- ⚠️ ``GFFTMA`` plante sur une dimension FFT interne IMPAIRE ; on impose une
  parité paire par axe (``_taille_paire``) puis on recadre. La librairie n'est
  pas modifiée.
- ⚠️ ``SIS_grille`` collapse souvent en un seul faciès sur petites grilles ;
  l'enrobage :func:`tgs_sis.realisation_sis` émet un avertissement et la TGS est
  préférée pour l'association visuelle.
"""
from geostat_polymtl.exercices.chapitre_13.pgs_drapeaux import (
    DRAPEAUX,
    MODELE_ISO_Z1,
    MODELE_ISO_Z2,
    MODELE_ANISO_Z1,
    MODELE_ANISO_Z2,
    simuler_gaussien_latent,
    appliquer_drapeau,
    realisation_pgs,
    figure_drapeau,
    figure_realisation,
    planche_association_pgs,
)
from geostat_polymtl.exercices.chapitre_13.tgs_sis import (
    JEUX_PROPORTIONS,
    MODELE_TGS,
    proportions_vers_seuils,
    realisation_tgs,
    realisation_sis,
    figure_tgs_seuils,
    planche_association_tgs,
)

__all__ = [
    # pgs_drapeaux
    "DRAPEAUX",
    "MODELE_ISO_Z1",
    "MODELE_ISO_Z2",
    "MODELE_ANISO_Z1",
    "MODELE_ANISO_Z2",
    "simuler_gaussien_latent",
    "appliquer_drapeau",
    "realisation_pgs",
    "figure_drapeau",
    "figure_realisation",
    "planche_association_pgs",
    # tgs_sis
    "JEUX_PROPORTIONS",
    "MODELE_TGS",
    "proportions_vers_seuils",
    "realisation_tgs",
    "realisation_sis",
    "figure_tgs_seuils",
    "planche_association_tgs",
]

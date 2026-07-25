// scripts/geostat-js/pyodide_setup.js
// -----------------------------------------------------------------------------
// Pyodide singleton + bridge complet vers la VRAIE librairie `geostat_polymtl`.
//
// PRINCIPE STRICT : ZERO duplication de code cote JS. Tous les calculs
// (simulation, statistiques, dégroupement, IDW, polygones, triangles, sections,
// propagation d'erreur, variogrammes, etc.) sont DELEGUES a la librairie
// Python qui tourne dans le navigateur via Pyodide (WebAssembly).
//
// L'objet `gpoly` exporte un wrapper async par fonction de la librairie ; chaque
// wrapper convertit les arguments JS → Python, appelle la VRAIE fonction, puis
// reconvertit la sortie Python → JS. Aucune logique mathematique cote JS.
//
// Convention de portee a l'interface : portee pratique 95 %.
// Conversion vers le range GFFTMA selon le modele :
//   spherique   : a (palier atteint a a)
//   exponentiel : a / 3      (γ(a) = 1 - e⁻³ ≈ 95 %)
//   gaussien    : a / sqrt(3)  (idem)
//
// Performance :
//   - 1er chargement : ~10-15 s (Pyodide + numpy + scipy + 14 fichiers).
//   - 1ere simulation : ~300-800 ms ; suivantes ~150-300 ms (grille 80x80).
// -----------------------------------------------------------------------------

const PYODIDE_VERSION = '0.27.0';
const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

// Fichiers de la librairie a charger dans le FS virtuel de Pyodide.
// Servis par Quarto via la directive `resources` de _quarto.yml.
// Chaque module est monte comme package standalone (pas via geostat_polymtl)
// pour eviter l'overhead du package parent.
const FICHIERS_LIB = [
  // Simulation FFT-MA
  { src: '/geostat_polymtl/functional/helper.py',         dst: '/lib/functional/helper.py' },
  {   src:    '/geostat_polymtl/functional/helper.py',                           dst:    '/lib/geostat_polymtl/functional/helper.py' },
  { src: '/geostat_polymtl/cov_func/covar_nu.py',         dst: '/lib/cov_func/covar_nu.py' },
  { src: '/geostat_polymtl/simulation_methods/GFFTMA.py', dst: '/lib/simulation_methods/GFFTMA.py' },
  { src: '/geostat_polymtl/simulation_methods/LU.py',     dst: '/lib/simulation_methods/LU.py' },
  { src: '/geostat_polymtl/simulation_methods/SGS.py',    dst: '/lib/simulation_methods/SGS.py' },
  // STBM omis : dépend de `numba` (non disponible dans Pyodide / WebAssembly).
  // gpoly_simuler_STBM lève NotImplementedError côté Python ; les widgets
  // de simulation pédagogiques utilisent LU / SGS / FFT-MA à la place.
  // Krigeage d'indicatrices (chap. 11)
  { src: '/geostat_polymtl/kriging/indicator.py', dst: '/lib/kriging/indicator.py' },
  { src: '/geostat_polymtl/kriging/indicator.py', dst: '/lib/geostat_polymtl/kriging/indicator.py' },
  // Simulation categorielle (chap. 13)
  { src: '/geostat_polymtl/categorical/__init__.py',           dst: '/lib/categorical/__init__.py' },
  { src: '/geostat_polymtl/categorical/truncated_gaussian.py', dst: '/lib/categorical/truncated_gaussian.py' },
  { src: '/geostat_polymtl/categorical/PGS.py',                dst: '/lib/categorical/PGS.py' },
  { src: '/geostat_polymtl/categorical/SIS.py',                dst: '/lib/categorical/SIS.py' },
  { src: '/geostat_polymtl/categorical/MPS.py',                dst: '/lib/categorical/MPS.py' },
  // Traitement statistique (chap. 04)
  { src: '/geostat_polymtl/treatment/composite.py',     dst: '/lib/treatment/composite.py' },
  { src: '/geostat_polymtl/treatment/degroupement.py',  dst: '/lib/treatment/degroupement.py' },
  { src: '/geostat_polymtl/treatment/deviations.py',    dst: '/lib/treatment/deviations.py' },
  { src: '/geostat_polymtl/treatment/erreurs.py',       dst: '/lib/treatment/erreurs.py' },
  { src: '/geostat_polymtl/treatment/exploratoire.py',  dst: '/lib/treatment/exploratoire.py' },
  // Methodes conventionnelles (chap. 05)
  { src: '/geostat_polymtl/conventional/idw.py',        dst: '/lib/conventional/idw.py' },
  { src: '/geostat_polymtl/conventional/polygones.py',  dst: '/lib/conventional/polygones.py' },
  { src: '/geostat_polymtl/conventional/triangles.py',  dst: '/lib/conventional/triangles.py' },
  { src: '/geostat_polymtl/conventional/sections.py',   dst: '/lib/conventional/sections.py' },
  { src: '/geostat_polymtl/conventional/qualite.py',    dst: '/lib/conventional/qualite.py' },
  // Variogramme : modeles theoriques (cov_func.covar) + experimental sur grille + scatter
  { src: '/geostat_polymtl/cov_func/covar.py',              dst: '/lib/cov_func/covar.py' },
  { src: '/geostat_polymtl/exp_variogram/GeoStatFFT.py',    dst: '/lib/exp_variogram/GeoStatFFT.py' },
  { src: '/geostat_polymtl/exp_variogram/scatter.py',       dst: '/lib/exp_variogram/scatter.py' },
  // Variance de bloc (chap. 08) : quadrature, empirique, imbrique
  // On ne monte PAS le __init__.py reel (il fait des imports absolus
  // geostat_polymtl.* ; on garde la convention « __init__.py vide » du montage
  // flat et on cree des miroirs sous /lib/geostat_polymtl/ pour les imports
  // absolus internes des modules.
  { src: '/geostat_polymtl/block_variance/quadrature.py', dst: '/lib/block_variance/quadrature.py' },
  { src: '/geostat_polymtl/block_variance/empirique.py',  dst: '/lib/block_variance/empirique.py' },
  { src: '/geostat_polymtl/block_variance/imbrique.py',   dst: '/lib/block_variance/imbrique.py' },
  // Miroirs pour le package « ombre » geostat_polymtl (imports absolus internes)
  { src: '/geostat_polymtl/block_variance/quadrature.py', dst: '/lib/geostat_polymtl/block_variance/quadrature.py' },
  { src: '/geostat_polymtl/block_variance/empirique.py',  dst: '/lib/geostat_polymtl/block_variance/empirique.py' },
  { src: '/geostat_polymtl/block_variance/imbrique.py',   dst: '/lib/geostat_polymtl/block_variance/imbrique.py' },
  { src: '/geostat_polymtl/cov_func/covar.py',            dst: '/lib/geostat_polymtl/cov_func/covar.py' },
  // Krigeage (chap. 09) : cokri + wrappers
  // wrappers.py utilise `from geostat_polymtl.kriging.cokriging import cokri`,
  // donc on monte aussi un miroir sous /lib/geostat_polymtl/.
  { src: '/geostat_polymtl/kriging/cokriging.py', dst: '/lib/kriging/cokriging.py' },
  { src: '/geostat_polymtl/kriging/wrappers.py',  dst: '/lib/kriging/wrappers.py' },
  { src: '/geostat_polymtl/kriging/cokriging.py', dst: '/lib/geostat_polymtl/kriging/cokriging.py' },
  // Miroir wrappers.py sous geostat_polymtl/ pour les imports absolus internes
  // (indicator.py fait `from geostat_polymtl.kriging.wrappers import krigeage_ordinaire`).
  { src: '/geostat_polymtl/kriging/wrappers.py',  dst: '/lib/geostat_polymtl/kriging/wrappers.py' },
  { src: '/geostat_polymtl/cov_func/covar_nu.py', dst: '/lib/geostat_polymtl/cov_func/covar_nu.py' },
  // Echantillonnage et QA/QC (chap. 03)
  { src: '/geostat_polymtl/sampling/gy.py',         dst: '/lib/sampling/gy.py' },
  { src: '/geostat_polymtl/sampling/blancs.py',     dst: '/lib/sampling/blancs.py' },
  { src: '/geostat_polymtl/sampling/standards.py',  dst: '/lib/sampling/standards.py' },
  { src: '/geostat_polymtl/sampling/duplicatas.py', dst: '/lib/sampling/duplicatas.py' },
  { src: '/geostat_polymtl/sampling/densite.py',    dst: '/lib/sampling/densite.py' },
  // data/ (chap. 01 et 06) — monte aussi en /lib/geostat_polymtl/ pour les imports
  // absolus internes (`from geostat_polymtl._seed import ...`).
  { src: '/geostat_polymtl/_seed.py',             dst: '/lib/geostat_polymtl/_seed.py' },
  { src: '/geostat_polymtl/_exceptions.py',       dst: '/lib/geostat_polymtl/_exceptions.py' },
  { src: '/geostat_polymtl/data/blockmodel.py',   dst: '/lib/data/blockmodel.py' },
  { src: '/geostat_polymtl/data/synthetic.py',    dst: '/lib/data/synthetic.py' },
  // Classification des ressources (atelier 2, chap. 01) : echantillonnage de
  // forages + criteres simple (secteurs) et complexe (efficacite de
  // krigeage). Miroir de blockmodel.py sous geostat_polymtl/data/ pour
  // l'import absolu interne `from geostat_polymtl.data.blockmodel import
  // SCENARIOS_COVARIANCE` utilise par structures_2d_depuis_scenario().
  { src: '/geostat_polymtl/data/ressources.py',   dst: '/lib/data/ressources.py' },
  { src: '/geostat_polymtl/data/blockmodel.py',   dst: '/lib/geostat_polymtl/data/blockmodel.py' },
  // Economics (chap. 02 — theorie de Lane et Taylor).
  // UN SEUL emplacement : geostat_polymtl/economics/. On importe par le
  // chemin absolu `from geostat_polymtl.economics.<mod> import ...`.
  { src: '/geostat_polymtl/economics/reserves.py',  dst: '/lib/geostat_polymtl/economics/reserves.py' },
  { src: '/geostat_polymtl/economics/economics.py', dst: '/lib/geostat_polymtl/economics/economics.py' },
  // Geometrie d'orientation 3D (annexe A : vecteurs, plans, intersections).
  { src: '/geostat_polymtl/forage/geometrie.py',    dst: '/lib/forage/geometrie.py' },
];

const PACKAGES_VIRTUELS = [
  'functional', 'cov_func', 'simulation_methods', 'exp_variogram',
  'treatment', 'conventional', 'sampling', 'data', 'block_variance', 'kriging',
  'categorical', 'forage',
  'geostat_polymtl',  // package « ombre » pour les imports absolus internes
];

// Sous-packages a creer dans le package ombre `geostat_polymtl`.
// Certains modules de la librairie utilisent des imports absolus de la forme
// `from geostat_polymtl.<sous_pkg>.<mod> import ...`. Pour que ces imports
// resolvent, il faut que les sous-packages existent en tant que paquet.
const SOUS_PACKAGES_GEOSTAT_POLYMTL = [
  'block_variance', 'cov_func', 'kriging', 'categorical', 'economics', 'data', 'functional',
];

let _promesse = null;

/** Renvoie la promesse Pyodide pret (singleton). */
export function pretPyodide() {
  if (!_promesse) _promesse = initialiserPyodide();
  return _promesse;
}

async function initialiserPyodide() {
  const mod = await import(PYODIDE_CDN + 'pyodide.mjs');
  const py = await mod.loadPyodide({ indexURL: PYODIDE_CDN });
  await py.loadPackage(['numpy', 'scipy']);

  // Creer chaque package virtuel avec __init__.py vide (on importe les submodules
  // directement, on saute les __init__.py originaux qui font des imports croises
  // vers geostat_polymtl.* incompatibles avec ce montage flat).
  try { py.FS.mkdir('/lib'); } catch (e) {}
  for (const pkg of PACKAGES_VIRTUELS) {
    try { py.FS.mkdir('/lib/' + pkg); } catch (e) {}
    try { py.FS.writeFile(`/lib/${pkg}/__init__.py`, '', { encoding: 'utf8' }); } catch (e) {}
  }
  // Sous-packages du package « ombre » geostat_polymtl/ (pour imports absolus
  // internes comme `from geostat_polymtl.cov_func.covar import covar`).
  for (const sub of SOUS_PACKAGES_GEOSTAT_POLYMTL) {
    try { py.FS.mkdir(`/lib/geostat_polymtl/${sub}`); } catch (e) {}
    try { py.FS.writeFile(`/lib/geostat_polymtl/${sub}/__init__.py`, '', { encoding: 'utf8' }); } catch (e) {}
  }

  // Telecharger chaque fichier de la VRAIE librairie en parallele
  // Cache-busting : un horodatage par chargement de page force le navigateur
  // à toujours récupérer la VERSION À JOUR des fichiers .py de la librairie
  // (sinon un .py en cache périmé fait échouer l'import et casse TOUS les
  // widgets Pyodide). Les fichiers sont petits ; le surcoût est négligeable.
  const _BASE = new URL('../../', import.meta.url).href.replace(/[/]$/, '');
  const _CB = Date.now();
  const telechargements = FICHIERS_LIB.map(async f => {
    const r = await fetch(_BASE + f.src + (f.src.includes('?') ? '&' : '?') + 'cb=' + _CB);
    if (!r.ok) throw new Error(`Telechargement ${_BASE + f.src} : HTTP ${r.status}`);
    py.FS.writeFile(f.dst, await r.text(), { encoding: 'utf8' });
  });
  await Promise.all(telechargements);

  // Setup Python : importer la librairie + definir les wrappers JS-friendly
  // (les wrappers font UNIQUEMENT la conversion JS↔Python ; tout le calcul
  // appartient a la librairie).
  py.runPython(`
import sys, math
sys.path.insert(0, '/lib')
import numpy as np

# === Imports depuis la VRAIE librairie ===
from simulation_methods.GFFTMA import GFFTMA
# Methodes de simulation continue (chap. 12) : LU, SGS (+ FFT-MA via GFFTMA).
# STBM est OMIS volontairement : il importe 'numba' qui n'est pas disponible
# dans Pyodide (WebAssembly). Le wrapper gpoly_simuler_STBM ci-dessous leve
# explicitement NotImplementedError si appele.
from simulation_methods.LU import LU as _LU
from simulation_methods.SGS import SGS as _SGS
from treatment.composite import calculer_composites, Echantillon
from treatment.degroupement import degrouper, optimiser_taille_cellule
from treatment.deviations import (cosinus_directeurs, calculer_trajectoire,
                                   interpoler_profondeurs, MesureDeviation)
from treatment.erreurs import propagation_tonnage
from treatment.exploratoire import (statistiques_descriptives, histogramme,
                                     boite_a_moustaches,
                                     quantiles as _quantiles,
                                     regression_lineaire as _reg_lin,
                                     densite_normale_standard as _dens_norm,
                                     densite_normale as _dens_norm_ms,
                                     repartition_normale as _repart_norm,
                                     probabilite_intervalle as _prob_interv)
# Geometrie d'orientation 3D (annexe A) — source de verite des ateliers
# vecteurs / plans / forage / intersection.
from forage.geometrie import (
    vecteur_unitaire as _geo_vec,
    conversions_plan as _geo_conv,
    intersection_plan_forage as _geo_inter,
    ellipse_intersection_plan_cylindre as _geo_ellipse,
)
from conventional.idw import idw as _idw
from conventional.polygones import plus_proche_voisin as _ppv
from conventional.triangles import interpolation_triangulaire as _it
from conventional.sections import volume_entre_sections, estimer_sections
from conventional.qualite import statistiques_erreur
# Modeles de variogramme/covariance : on utilise la VRAIE table de
# 18 modeles dans geostat_polymtl.cov_func.covar (codes : 1=nugget, 2=exp,
# 3=gauss, 4=spherique, 5=lineaire, 15/16=Matern, etc.).
from cov_func.covar import covar as _covar
# Variogramme experimental sur grille via la VRAIE librairie
from exp_variogram.GeoStatFFT import varioFFT as _varioFFT
# Variogramme experimental sur donnees dispersees (scattered)
from exp_variogram.scatter import (
    nuee_variographique as _nuee,
    variogramme_experimental_scatter as _vario_scatter,
    variogramme_experimental_directionnel as _vario_dir,
    variogramme_cressie_hawkins as _vario_robust,
)
# Variance de bloc (chap. 08) : tout passe par geostat_polymtl.block_variance
from block_variance.quadrature import (
    variance_bloc_quadrature as _vbloc_quad,
    variance_bloc_calculateur as _vbloc_calc,
    variance_bloc_support as _vbloc_support,
    points_quadrature_visu as _pts_quad,
)
from block_variance.empirique import (
    agreger_champ as _agreger,
    variance_bloc_empirique as _vbloc_emp,
)
from block_variance.imbrique import (
    variogramme_imbrique as _vario_imb,
    variance_bloc_imbrique as _vbloc_imb,
)
# Krigeage (chap. 09) : wrappers autour de cokri.
from kriging.wrappers import (
    krigeage_simple as _ks,
    krigeage_ordinaire as _ko,
    krigeage_universel as _ku,
    krigeage_derive_externe as _ked,
    krigeage_bloc as _kbloc,
    validation_croisee as _vc,
    systeme_krigeage as _sys_krig,
    # Cokrigeage multivariable (chap. 10)
    cokrigeage_simple as _cks,
    cokrigeage_ordinaire as _cko,
    cokrigeage_universel as _cku,
    systeme_cokrigeage as _sys_cokrig,
)
# Krigeage d'indicatrices (chap. 11)
from kriging.indicator import (
    coder_indicatrices as _coder_ind,
    cdf_empirique as _cdf_emp,
    krigeage_indicatrices as _krig_ind,
    corriger_relation_ordre as _corr_ord,
    violations_relation_ordre as _viol_ord,
    mediane_locale as _med_loc,
    moyenne_locale as _moy_loc,
    proba_excede_local as _p_excede,
    tonnage_teneur_recuperables as _tonnage_teneur,
    changement_support_affine as _support_affine,
)
# Simulation categorielle (chap. 13)
from categorical.truncated_gaussian import (
    seuils_depuis_proportions as _tg_seuils,
    champ_a_facies as _tg_champ_facies,
)
from categorical.PGS import (
    partition_rectangulaire as _pgs_partition,
    champs_a_facies as _pgs_champs_facies,
)
from categorical.SIS import SIS_grille as _SIS
from categorical.MPS import MPS_simple as _MPS
from sampling.gy import (ParametresGy, ecart_type_relatif as _gy_sr,
                          masse_minimale as _gy_mmin)
from sampling.blancs import simuler_blancs as _sim_blancs, analyser_blancs as _an_blancs
from sampling.standards import (simuler_standards as _sim_standards,
                                 analyser_standards as _an_standards,
                                 detecter_anomalies as _detect_anom)
from sampling.duplicatas import (simuler_duplicatas as _sim_dup,
                                  analyser_duplicatas as _an_dup)
from sampling.densite import (masse_volumique_melange as _mvm,
                               fractions_volumiques as _frac_vol,
                               composition_chimique as _compo_chim,
                               resoudre_proportions_minerales as _resoudre_prop,
                               analyser_densite as _analyser_densite,
                               lister_scenarios_densite as _lister_scen_densite,
                               lister_mineraux as _lister_mineraux)
from data.blockmodel import generer_block_model_synthetique as _gen_bm
from data.blockmodel import (generer_block_model_covariance as _gen_bm_cov,
                              lister_scenarios as _lister_scenarios_bm)
from data.ressources import (echantillonner_forages as _echant_forages,
                              classifier_par_passe_estimation as _classif_passe,
                              structures_3d_depuis_scenario as _struct_3d,
                              classifier_par_efficacite_krigeage as _classif_ke,
                              NOMS_CLASSES as _NOMS_CLASSES)
from kriging.wrappers import krigeage_ordinaire as _ko_ressources
from data.synthetic import champ_fftma_2d as _champ_fftma
# Economics — theorie de Lane (chap. 02). Source de verite unique pour les
# ateliers du chap. 02 (calculateur teneurs limites, courbes de Lane, etc.).
# Import absolu : monte une seule fois sous /lib/geostat_polymtl/economics/.
from geostat_polymtl.economics.economics import (
    ParametresLane as _LaneParams,
    teneurs_limites as _lane_teneurs_lim,
    courbes_profit as _lane_courbes,
)
from geostat_polymtl.economics.reserves import (
    reserves as _lane_reserves,
    reserves_lognormale as _lane_reserves_logn,
    reserves_normale as _lane_reserves_norm,
)

# === Helpers internes ===
_CODES_COV = {'spherique': 4, 'exponentiel': 2, 'gaussien': 3}

def _range_gfftma(modele, a_pratique):
    """Convertit portee pratique 95 % -> range GFFTMA selon le modele."""
    if modele == 'spherique':   return float(a_pratique)
    if modele == 'exponentiel': return float(a_pratique) / 3.0
    if modele == 'gaussien':    return float(a_pratique) / math.sqrt(3.0)
    raise ValueError('modele inconnu : ' + modele)

# =====================================================================
# WRAPPERS JS-FRIENDLY  (PEPS conversion uniquement)
# =====================================================================

# --- Simulation FFT-MA + distribution marginale ---
def gpoly_simuler_champ(modele, portee, pepite, seed, N,
                        type_champ='gaussien', moyenne=1.0, variance=1.0):
    """Simule un champ N x N via la VRAIE GFFTMA + applique la distribution.

    type_champ in {'gaussien', 'lognormal'}. Pour lognormal, moyenne > 0.
    """
    code = _CODES_COV[modele]
    r = _range_gfftma(modele, portee)
    # Contournement cas limite Nx_extended impair
    pad = math.ceil(2 * r)
    nx_eff = N if (pad + N) % 2 == 0 else N + 1
    model = [[np.array([code, r, r, 0.0], dtype=float)]]
    c     = [[1.0 - float(pepite)]]
    nu    = [[None]]
    d, _, _ = GFFTMA(model, c, nu, seed=int(seed), nbsimul=1,
                     nx=nx_eff, dx=1.0, ny=nx_eff, dy=1.0)
    z = np.asarray(d[:, 0, 0], dtype=float).reshape(nx_eff, nx_eff)[:N, :N]
    if pepite > 0:
        rng = np.random.default_rng(int(seed) + 9973)
        z = z + math.sqrt(pepite) * rng.standard_normal(z.shape)
    z = (z - z.mean()) / (z.std() + 1e-12)
    if type_champ == 'lognormal':
        sigma2 = math.log(1.0 + variance / (moyenne * moyenne))
        mu = math.log(moyenne) - 0.5 * sigma2
        return np.exp(mu + math.sqrt(sigma2) * z).ravel().tolist()
    else:
        return (moyenne + math.sqrt(variance) * z).ravel().tolist()

def gpoly_simuler_champ_3d(modele, portee, pepite, seed, n,
                           type_champ='gaussien', moyenne=1.0, variance=1.0):
    """Cube n x n x n via la VRAIE GFFTMA 3D + distribution marginale.

    Retourne une liste de longueur n**3 en ordre C : idx = (ix*n + iy)*n + iz.
    type_champ in {'gaussien', 'lognormal'} (lognormal : moyenne > 0).
    """
    code = _CODES_COV[modele]
    r = _range_gfftma(modele, portee)
    n = int(n)
    # Contournement cas limite Nx_etendu impair (idem version 2D) : la grille
    # interne Nx = ceil(2 r) + n doit etre paire, sinon GFFTMA echoue. On simule
    # sur n_eff puis on tronque a n.
    pad = math.ceil(2 * r)
    n_eff = n if (pad + n) % 2 == 0 else n + 1
    # Modele isotrope 3D : [code, range_x, range_y, range_z].
    model = [[np.array([code, r, r, r], dtype=float)]]
    c     = [[1.0 - float(pepite)]]
    nu    = [[None]]
    d, _, _ = GFFTMA(model, c, nu, seed=int(seed), nbsimul=1,
                     nx=n_eff, dx=1.0, ny=n_eff, dy=1.0, nz=n_eff, dz=1.0)
    z = np.asarray(d[:, 0, 0], dtype=float).reshape(n_eff, n_eff, n_eff)[:n, :n, :n].ravel()
    if pepite > 0:
        rng = np.random.default_rng(int(seed) + 9973)
        z = z + math.sqrt(pepite) * rng.standard_normal(z.shape)
    z = (z - z.mean()) / (z.std() + 1e-12)
    if type_champ == 'lognormal':
        sigma2 = math.log(1.0 + variance / (moyenne * moyenne))
        mu = math.log(moyenne) - 0.5 * sigma2
        return np.exp(mu + math.sqrt(sigma2) * z).ravel().tolist()
    else:
        return (moyenne + math.sqrt(variance) * z).ravel().tolist()

def gpoly_simuler_champ_1d(modele, portee, pepite, seed, n,
                           type_champ='gaussien', moyenne=0.0, variance=1.0):
    """Champ 1D (transect) de longueur n via GFFTMA 1D. Permet beaucoup de
    données à faible coût (variogramme expérimental lisse)."""
    code = _CODES_COV[modele]
    r = _range_gfftma(modele, portee)
    n = int(n)
    pad = math.ceil(2 * r)
    n_eff = n if (pad + n) % 2 == 0 else n + 1
    model = [[np.array([code, r], dtype=float)]]
    c     = [[1.0 - float(pepite)]]
    nu    = [[None]]
    d, _, _ = GFFTMA(model, c, nu, seed=int(seed), nbsimul=1, nx=n_eff, dx=1.0)
    z = np.asarray(d[:, 0, 0], dtype=float).ravel()[:n]
    if pepite > 0:
        rng = np.random.default_rng(int(seed) + 9973)
        z = z + math.sqrt(pepite) * rng.standard_normal(z.shape)
    z = (z - z.mean()) / (z.std() + 1e-12)
    if type_champ == 'lognormal':
        sigma2 = math.log(1.0 + variance / (moyenne * moyenne))
        mu = math.log(moyenne) - 0.5 * sigma2
        return np.exp(mu + math.sqrt(sigma2) * z).ravel().tolist()
    else:
        return (moyenne + math.sqrt(variance) * z).ravel().tolist()

def gpoly_simuler_1d_n(modele, portee, seed, n, nbsim):
    """nbsim transects 1D gaussiens N(0,1) du MEME modele, en UN appel GFFTMA
    (batche). Renvoie une liste de nbsim listes de longueur n. Pour les ateliers
    de convergence (moyenne -> 0, variance -> 1) et de post-conditionnement."""
    code = _CODES_COV[modele]
    r = _range_gfftma(modele, portee)
    n = int(n); nbsim = int(nbsim)
    pad = math.ceil(2 * r)
    n_eff = n if (pad + n) % 2 == 0 else n + 1
    model = [[np.array([code, r], dtype=float)]]
    c     = [[1.0]]
    nu    = [[None]]
    d, _, _ = GFFTMA(model, c, nu, seed=int(seed), nbsimul=nbsim, nx=n_eff, dx=1.0)
    out = []
    for s in range(nbsim):
        # AUCUNE re-normalisation : GFFTMA produit deja un champ de moyenne ~0 et
        # de palier theorique = 1. Re-centrer/diviser biaiserait le variogramme et
        # ecraserait la variabilite entre realisations (moyenne, variance).
        z = np.asarray(d[:, s, 0], dtype=float).ravel()[:n]
        out.append(z.tolist())
    return out

def gpoly_simuler_2d_nested_n(structures, seed, N, nbsim):
    """nbsim réalisations 2D d'un MODÈLE IMBRIQUÉ anisotrope (liste de structures
    {type, rx, ry, angle, sill}, pépite incluse via code 1), batchées en UN appel
    GFFTMA. Chaque réalisation est standardisée N(0,1) (pour la troncature). Pour
    le boxplot de variabilité des proportions (TGS/PGS)."""
    codes = {'spherique': 4, 'exponentiel': 2, 'gaussien': 3, 'pepite': 1}
    rows, sills = [], []
    maxr = 1.0
    for s in structures:
        sill = float(s.get('sill', 0.0))
        if sill <= 0: continue
        typ = str(s['type']); code = codes[typ]
        if typ == 'pepite':
            rows.append([1.0, 1.0, 1.0, 0.0]); sills.append(sill)
        else:
            rx = _range_gfftma(typ, float(s['rx'])); ry = _range_gfftma(typ, float(s['ry']))
            rows.append([float(code), rx, ry, float(s.get('angle', 0.0))]); sills.append(sill)
            maxr = max(maxr, rx, ry)
    N = int(N); nbsim = int(nbsim)
    if not rows:
        return [[0.0] * (N * N) for _ in range(nbsim)]
    pad = math.ceil(2 * maxr)
    nx = N if (pad + N) % 2 == 0 else N + 1
    model = [[np.array(rows, dtype=float)]]
    c = [[np.array(sills, dtype=float)]]
    nu = [[None]]
    d, _, _ = GFFTMA(model, c, nu, seed=int(seed), nbsimul=nbsim, nx=nx, dx=1.0, ny=nx, dy=1.0)
    out = []
    for si in range(nbsim):
        z = np.asarray(d[:, si, 0], dtype=float).reshape(nx, nx)[:N, :N].ravel()
        z = (z - z.mean()) / (z.std() + 1e-12)
        out.append(z.tolist())
    return out

def gpoly_simuler_champ_aniso(modele, portee_x, portee_y, angle, pepite, seed, N,
                              type_champ='gaussien', moyenne=1.0, variance=1.0):
    """Champ 2D ANISOTROPE via GFFTMA. portee_x = portée pratique le long de l'axe
    majeur (orienté par 'angle' en degrés), portee_y le long de l'axe perpendiculaire.
    Modèle de covariance [code, range_x, range_y, angle] (cf. functional.helper.trans)."""
    code = _CODES_COV[modele]
    rx = _range_gfftma(modele, portee_x)
    ry = _range_gfftma(modele, portee_y)
    N = int(N)
    # Parité PAR AXE : la grille interne Nx = ceil(2 rx)+nx et Ny = ceil(2 ry)+ny
    # doivent CHACUNE être paires (sinon GFFTMA échoue au reshape).
    padx = math.ceil(2 * rx); pady = math.ceil(2 * ry)
    nx = N if (padx + N) % 2 == 0 else N + 1
    ny = N if (pady + N) % 2 == 0 else N + 1
    model = [[np.array([code, rx, ry, float(angle)], dtype=float)]]
    c     = [[1.0 - float(pepite)]]
    nu    = [[None]]
    d, _, _ = GFFTMA(model, c, nu, seed=int(seed), nbsimul=1,
                     nx=nx, dx=1.0, ny=ny, dy=1.0)
    z = np.asarray(d[:, 0, 0], dtype=float).reshape(nx, ny)[:N, :N]
    if pepite > 0:
        rng = np.random.default_rng(int(seed) + 9973)
        z = z + math.sqrt(pepite) * rng.standard_normal(z.shape)
    z = (z - z.mean()) / (z.std() + 1e-12)
    if type_champ == 'lognormal':
        sigma2 = math.log(1.0 + variance / (moyenne * moyenne))
        mu = math.log(moyenne) - 0.5 * sigma2
        return np.exp(mu + math.sqrt(sigma2) * z).ravel().tolist()
    else:
        return (moyenne + math.sqrt(variance) * z).ravel().tolist()

# --- Simulation continue (chap. 12) : LU, SGS, STBM ---
def _modele_cokri_simple(modele, portee, palier, N):
    """Construit (model, c, x0) pour une simulation 2D NxN avec
    UN modele de covariance partage."""
    code = _CODES_COV[modele]
    r = _range_gfftma(modele, portee)
    model = np.array([[code, r, r, 0.0]], dtype=float)
    c = np.array([[float(palier)]]).reshape(1, 1, 1)
    x0 = np.array([[i, j] for j in range(N) for i in range(N)], dtype=float)
    return model, c, x0

def gpoly_simuler_LU(modele, portee, palier, seed, N, x_cond=None):
    """Simulation LU (Cholesky) sur grille NxN. Conditionnelle si x_cond donne."""
    model, c, x0 = _modele_cokri_simple(modele, portee, palier, N)
    sim = _LU(x0, model, c, None, nbsim=1, seed=int(seed),
              x_cond=None if x_cond is None else np.asarray(x_cond, float))
    return np.asarray(sim[:, 0, 0], float).tolist()

def gpoly_simuler_SGS(modele, portee, palier, seed, N, x_cond=None, nk=12):
    """Simulation sequentielle gaussienne sur grille NxN."""
    model, c, x0 = _modele_cokri_simple(modele, portee, palier, N)
    sim = _SGS(x0, model, c, None, nbsim=1, seed=int(seed),
                x_cond=None if x_cond is None else np.asarray(x_cond, float),
                nk=int(nk))
    return np.asarray(sim[:, 0, 0], float).tolist()

def gpoly_simuler_STBM(modele, portee, palier, seed, N, n_lignes=1000):
    """Simulation STBM — NON FONCTIONNELLE dans Pyodide.

    STBM utilise 'joblib.Parallel(n_jobs=-1)' qui necessite du
    multiprocessing, indisponible en navigateur. Pour les widgets
    pedagogiques on utilise LU, SGS, et FFT-MA (3 methodes equivalentes
    statistiquement). STBM peut etre invoque depuis Python natif.
    """
    raise NotImplementedError(
        "STBM utilise joblib.Parallel : indisponible dans Pyodide. "
        "Utilisez gpoly.simulerLU / simulerSGS / simulerFFTMA."
    )

def gpoly_simuler_FFTMA(modele, portee, palier, seed, N):
    """Simulation FFT-MA (alias de gpoly_simuler_champ pour cohérence d'API)."""
    return gpoly_simuler_champ(modele, portee, 0.0, int(seed), int(N),
                                type_champ='gaussien', moyenne=0.0, variance=float(palier))

def gpoly_simuler_N_realisations(modele, portee, palier, seed, N, nbsim,
                                   methode='FFTMA'):
    """Genere 'nbsim' realisations et renvoie E-type + variance pixel-a-pixel."""
    sims = np.zeros((N * N, int(nbsim)), dtype=float)
    methode = methode.upper()
    for i in range(int(nbsim)):
        if methode == 'LU':
            r = gpoly_simuler_LU(modele, portee, palier, int(seed) + i, N)
        elif methode == 'SGS':
            r = gpoly_simuler_SGS(modele, portee, palier, int(seed) + i, N)
        elif methode == 'STBM':
            r = gpoly_simuler_STBM(modele, portee, palier, int(seed) + i, N)
        else:  # FFTMA par defaut
            r = gpoly_simuler_FFTMA(modele, portee, palier, int(seed) + i, N)
        sims[:, i] = np.asarray(r, dtype=float)
    e_type = sims.mean(axis=1).tolist()
    var_pixel = sims.var(axis=1, ddof=1).tolist() if nbsim > 1 else [0.0] * (N * N)
    # Pour quantification incertitude : proba(Z > cutoff) calculee sur la grille
    return {
        'e_type': e_type,
        'var_pixel': var_pixel,
        'realisations_flat': sims.ravel('F').tolist(),  # column-major (par realisation)
        'nbsim': int(nbsim),
    }

def gpoly_proba_excede(modele, portee, palier, seed, N, nbsim, cutoff, methode='FFTMA'):
    """P(Z > cutoff) pour chaque pixel a partir de 'nbsim' realisations."""
    sims = np.zeros((N * N, int(nbsim)), dtype=float)
    methode = methode.upper()
    for i in range(int(nbsim)):
        if methode == 'LU':
            r = gpoly_simuler_LU(modele, portee, palier, int(seed) + i, N)
        elif methode == 'SGS':
            r = gpoly_simuler_SGS(modele, portee, palier, int(seed) + i, N)
        elif methode == 'STBM':
            r = gpoly_simuler_STBM(modele, portee, palier, int(seed) + i, N)
        else:
            r = gpoly_simuler_FFTMA(modele, portee, palier, int(seed) + i, N)
        sims[:, i] = np.asarray(r, dtype=float)
    proba = (sims > float(cutoff)).mean(axis=1).tolist()
    return {'proba_excede': proba, 'cutoff': float(cutoff), 'nbsim': int(nbsim)}


# --- Treatment (chap. 04) ---
def gpoly_composite(echantillons, longueur, couverture_min):
    objs = [Echantillon(e['de'], e['a'], e['teneur'], e.get('forage_id', ''))
            for e in echantillons]
    cs = calculer_composites(objs, float(longueur), float(couverture_min))
    return [
        {'de': c.de, 'a': c.a,
         'teneur': (None if not c.valide else c.teneur),
         'couverture': c.couverture, 'valide': bool(c.valide)}
        for c in cs
    ]

def gpoly_degrouper(coords, valeurs, taille_cellule):
    r = degrouper(np.asarray(coords, float), np.asarray(valeurs, float),
                  float(taille_cellule))
    return {
        'poids': r.poids.tolist(),
        'moyenne_brute': float(r.moyenne_brute),
        'moyenne_ponderee': float(r.moyenne_ponderee),
        'variance_brute': float(r.variance_brute),
        'variance_ponderee': float(r.variance_ponderee),
    }

def gpoly_optimiser_degroupement(coords, valeurs, tailles, n_translations=3, seed=0):
    """Balayage des tailles de cellule (heuristique de Deutsch) :
    moyenne et variance pondérées pour chaque taille. Pour les courbes
    moyenne/variance vs taille de cellule de l'atelier 4.4."""
    r = optimiser_taille_cellule(
        np.asarray(coords, float), np.asarray(valeurs, float),
        tailles=np.asarray(tailles, float),
        n_translations=int(n_translations), seed=int(seed))
    return {
        'taille_optimale': float(r.taille_optimale),
        'tailles': r.tailles.tolist(),
        'moyennes': r.moyennes.tolist(),
        'variances': r.variances.tolist(),
    }

def gpoly_cosinus_directeurs(mesures):
    objs = [MesureDeviation(m['md'], m['azimut'], m['plongee']) for m in mesures]
    cd = cosinus_directeurs(objs)
    return [{'md': t[0], 'lx': t[1], 'ly': t[2], 'lz': t[3]} for t in cd]

def gpoly_calculer_trajectoire(mesures, collet):
    objs = [MesureDeviation(m['md'], m['azimut'], m['plongee']) for m in mesures]
    pts = calculer_trajectoire(objs, tuple(collet))
    return [{'md': p.md, 'x': p.x, 'y': p.y, 'z': p.z} for p in pts]

def gpoly_interpoler_profondeurs(mesures, collet, profondeurs):
    """Coordonnees 3D d'un composite a une (ou des) profondeur(s) MD donnee(s)
    le long du forage (atelier 4.1)."""
    objs = [MesureDeviation(m['md'], m['azimut'], m['plongee']) for m in mesures]
    pts = interpoler_profondeurs(objs, tuple(collet), [float(p) for p in profondeurs])
    return [{'md': p.md, 'x': p.x, 'y': p.y, 'z': p.z} for p in pts]

def gpoly_propagation_tonnage(V, sV, d, sd, t, st):
    r = propagation_tonnage(V, sV, d, sd, t, st)
    return {
        'M': r.M, 'sigma_M': r.sigma_M,
        'erreur_relative_M': r.erreur_relative_M,
        'erreurs_relatives': dict(r.erreurs_relatives),
        'contributions': dict(r.contributions),
        'parametre_dominant': r.parametre_dominant,
    }

def gpoly_statistiques_descriptives(valeurs):
    s = statistiques_descriptives(np.asarray(valeurs, float))
    return {
        'n': s.n, 'moyenne': s.moyenne, 'mediane': s.mediane,
        'ecart_type': s.ecart_type, 'variance': s.variance, 'cv': s.cv,
        'minimum': s.minimum, 'maximum': s.maximum,
        'q1': s.q1, 'q3': s.q3, 'iqr': s.iqr,
        'asymetrie': s.asymetrie, 'aplatissement': s.aplatissement,
    }

def gpoly_histogramme(valeurs, n_classes):
    comptes, bords = histogramme(np.asarray(valeurs, float), int(n_classes))
    return {'comptes': comptes.tolist(), 'bords': bords.tolist()}

def gpoly_apparier_histogramme(reference, cible):
    """Force la distribution marginale de 'cible' a egaler EXACTEMENT celle de
    'reference', par appariement des rangs (cf. notebook EffetSupport.match_histogram).
    Les deux tableaux doivent avoir la meme taille. Sert a garantir que, a l'echelle
    ponctuelle (bloc 1x1), les deux champs ont la meme distribution statistique."""
    ref = np.sort(np.asarray(reference, float).ravel())
    tgt = np.asarray(cible, float).ravel()
    order = np.argsort(tgt, kind='stable')
    out = np.empty_like(tgt)
    out[order] = ref
    return out.tolist()

def gpoly_boite_a_moustaches(valeurs):
    b = boite_a_moustaches(np.asarray(valeurs, float))
    return {
        'q1': b.q1, 'mediane': b.mediane, 'q3': b.q3,
        'moustache_bas': b.moustache_bas, 'moustache_haut': b.moustache_haut,
        'aberrants': b.aberrants.tolist(),
    }

def gpoly_quantiles(valeurs, probabilites):
    """Quantiles par interpolation lineaire (gpoly.quantiles)."""
    return _quantiles(np.asarray(valeurs, float),
                       np.asarray(probabilites, float)).tolist()

def gpoly_regression_lineaire(x, y):
    """Regression lineaire simple par moindres carres (gpoly.regressionLineaire)."""
    return _reg_lin(np.asarray(x, float), np.asarray(y, float))

def gpoly_densite_normale(x):
    """Densite N(0, 1) en chaque point (gpoly.densiteNormale)."""
    return _dens_norm(np.asarray(x, float)).tolist()

def gpoly_densite_normale_ms(x, moyenne=0.0, ecart_type=1.0):
    """Densite N(mu, sigma^2) (gpoly.densiteNormaleMS) — annexe B."""
    return _dens_norm_ms(np.asarray(x, float), float(moyenne),
                          float(ecart_type)).tolist()

def gpoly_repartition_normale(x, moyenne=0.0, ecart_type=1.0):
    """F(x) = P(X <= x), X ~ N(mu, sigma^2) (gpoly.repartitionNormale)."""
    r = _repart_norm(np.asarray(x, float), float(moyenne), float(ecart_type))
    return r.tolist()

def gpoly_probabilite_intervalle(a, b, moyenne=0.0, ecart_type=1.0):
    """P(a <= X <= b), X ~ N(mu, sigma^2) (gpoly.probabiliteIntervalle)."""
    return float(_prob_interv(float(a), float(b), float(moyenne), float(ecart_type)))

# --- Geometrie d'orientation 3D (annexe A) ---
def gpoly_geom_vecteur(azimut, plongee):
    """Vecteur unitaire ENU depuis (azimut, plongee) (gpoly.geomVecteur)."""
    v = _geo_vec(float(azimut), float(plongee))
    return {'x': float(v[0]), 'y': float(v[1]), 'z': float(v[2])}

def gpoly_geom_conversions_plan(convention, a, b):
    """Conversions pole/pendage/geologique + vecteurs (gpoly.geomConversionsPlan)."""
    c = _geo_conv(str(convention), float(a), float(b))
    return {
        'ap': c['ap'], 'bp': c['bp'],
        'ad': c['ad'], 'bd': c['bd'],
        'ag': c['ag'], 'bg': c['bg'],
        'normale':   np.asarray(c['normale'],   float).tolist(),
        'pendage':   np.asarray(c['pendage'],   float).tolist(),
        'direction': np.asarray(c['direction'], float).tolist(),
    }

def gpoly_geom_intersection(ap, bp, af, bf, d, collet=None):
    """Intersection plan-forage (gpoly.geomIntersection)."""
    collet = (0.0, 0.0, 0.0) if collet is None else tuple(collet)
    r = _geo_inter(float(ap), float(bp), float(af), float(bf), float(d), collet)
    pi = np.asarray(r['point_intersection'], float)
    return {
        'normale': np.asarray(r['normale'], float).tolist(),
        'direction_forage': np.asarray(r['direction_forage'], float).tolist(),
        'intersecte': bool(r['intersecte']),
        't': float(r['t']) if r['intersecte'] else None,
        'point_intersection': pi.tolist() if r['intersecte'] else None,
        'pied_perpendiculaire': np.asarray(r['pied_perpendiculaire'], float).tolist(),
        'distance_minimale': float(r['distance_minimale']),
        'angle_deg': float(r['angle_deg']),
        'e1': np.asarray(r['e1'], float).tolist(),
        'e2': np.asarray(r['e2'], float).tolist(),
    }

def gpoly_geom_ellipse_cylindre(ap, bp, rayon=1.0, n_points=361):
    """Ellipse d'intersection plan-cylindre (gpoly.geomEllipseCylindre)."""
    e = _geo_ellipse(float(ap), float(bp), float(rayon), int(n_points))
    if e is None:
        return None
    P = np.asarray(e['points'], float)
    return {
        'xs': P[:, 0].tolist(), 'ys': P[:, 1].tolist(), 'zs': P[:, 2].tolist(),
        'grand_axe': np.asarray(e['grand_axe'], float).tolist(),
        'petit_axe': np.asarray(e['petit_axe'], float).tolist(),
        'demi_grand': float(e['demi_grand']),
        'demi_petit': float(e['demi_petit']),
        'normale': np.asarray(e['normale'], float).tolist(),
    }

# --- Conventional (chap. 05) ---
def gpoly_idw(coords, valeurs, points, puissance=2.0, rayon=None):
    rayon = float('inf') if rayon is None else float(rayon)
    est = _idw(np.asarray(coords, float), np.asarray(valeurs, float),
               np.asarray(points, float), puissance=puissance, rayon=rayon)
    return est.tolist()

def gpoly_plus_proche_voisin(coords, valeurs, points):
    est = _ppv(np.asarray(coords, float), np.asarray(valeurs, float),
               np.asarray(points, float))
    return est.tolist()

def gpoly_interpolation_triangulaire(coords, valeurs, points, mode='barycentrique'):
    est = _it(np.asarray(coords, float), np.asarray(valeurs, float),
              np.asarray(points, float), mode=mode)
    return est.tolist()

def gpoly_volume_entre_sections(S1, S2, L, methode='moyenne'):
    return float(volume_entre_sections(S1, S2, L, methode))

def gpoly_estimer_sections(S1, t1, S2, t2, L, densite, methode='moyenne'):
    r = estimer_sections(S1, t1, S2, t2, L, densite, methode)
    return {'volume': r.volume, 'tonnage': r.tonnage, 'metal': r.metal,
            'teneur_moyenne': r.teneur_moyenne, 'methode': r.methode}

def gpoly_statistiques_erreur(vraies, estimees):
    s = statistiques_erreur(np.asarray(vraies, float),
                            np.asarray(estimees, float))
    return {'n': s.n, 'biais': s.biais, 'rmse': s.rmse, 'mae': s.mae, 'r2': s.r2}

# --- Variogramme theorique : via la VRAIE table de modeles cov_func.covar ---
# Codes utilises : 1=nugget, 2=exponentiel, 3=gaussien, 4=spherique
# Convention de portee pratique 95 % : conversion vers la portee interne de covar.
def gpoly_variogramme_theorique(modele_nom, lags, portee, palier=1.0):
    code = _CODES_COV[modele_nom]
    r = _range_gfftma(modele_nom, portee)  # convention 95 % pratique
    h = np.asarray(lags, float).reshape(-1, 1)
    h0 = np.zeros((1, 1))
    model = np.array([[code, r]], dtype=float)
    c     = np.array([[float(palier)]], dtype=float)
    Ch = np.asarray(_covar(h, h0, model, c)).ravel()
    # gamma(h) = C(0) - C(h) ; C(0) = palier (pour modeles non-pepite)
    return (float(palier) - Ch).tolist()

# --- Sampling et QA/QC (chap. 03) ---
def _params_gy(p):
    """Construit un ParametresGy depuis un dict JS."""
    return ParametresGy(al=p['al'], da=p['da'], dg=p['dg'],
                        d0=p['d0'], f=p['f'], g=p['g'])

# =====================================================================
# THEORIE DE LANE (chap. 02) — source de verite : geostat_polymtl.economics
# =====================================================================
def _params_lane(p):
    """Construit un ParametresLane depuis un dict JS (tolere keys manquantes)."""
    def g(k, default):
        try: return float(p[k])
        except (KeyError, TypeError): return default
    return _LaneParams(
        m=g('m', 1.3), y=g('y', 0.9), p=g('p', 1700.0), k=g('k', 500.0),
        h=g('h', 3.0), f=g('f', 20.0), F=g('F', 0.0),
        M=g('M', 24.0), H=g('H', 14.0), K=g('K', 0.22),
        moyenne=g('moyenne', 1.3), variance=g('variance', 3.0),
        distribution=str(p['distribution']) if 'distribution' in p else 'lognormale',
    )

def gpoly_lane_teneurs_limites(params):
    """Calcule (c1, c2, c3) — teneurs limites mine/concentrateur/marche.
    Source de verite : geostat_polymtl.economics.teneurs_limites(ParametresLane).
    """
    pl = _params_lane(params)
    c1, c2, c3 = _lane_teneurs_lim(pl)
    return {'c1': float(c1), 'c2': float(c2), 'c3': float(c3)}

def gpoly_lane_analyse_complete(params, n_points=600):
    """Analyse complete (courbes + limites + equilibres + optimum).
    Source de verite : geostat_polymtl.economics.courbes_profit(ParametresLane).
    """
    pl = _params_lane(params)
    res = _lane_courbes(pl, n_points=int(n_points))
    return {
        'cc':              np.asarray(res.cc,            float).tolist(),
        'v_mine':          np.asarray(res.v_mine,        float).tolist(),
        'v_concentrateur': np.asarray(res.v_concentrateur, float).tolist(),
        'v_marche':        np.asarray(res.v_marche,      float).tolist(),
        'c1': float(res.c1), 'c2': float(res.c2), 'c3': float(res.c3),
        'c_opt':      float(res.c_opt),
        'profit_opt': float(res.profit_opt),
        'nature_opt': str(res.nature_opt),
        'equilibres': [
            {'teneur': float(e.teneur), 'profit': float(e.profit),
             'courbes': list(e.courbes), 'label': str(e.label)}
            for e in res.equilibres
        ],
        'xc': np.asarray(res.reserves.xc, float).tolist(),
        'gc': np.asarray(res.reserves.gc, float).tolist(),
    }

def gpoly_lane_reserves(moyenne, variance, cc, distribution='lognormale'):
    """Calcule xc, gc, qc pour une grille de teneurs de coupure.
    Source de verite : geostat_polymtl.economics.reserves(...).
    """
    cc_np = np.asarray(cc, float)
    r = _lane_reserves(float(moyenne), float(variance), cc_np, str(distribution))
    return {
        'cc': cc_np.tolist(),
        'xc': np.asarray(r.xc, float).tolist(),
        'gc': np.asarray(r.gc, float).tolist(),
        'qc': np.asarray(r.qc, float).tolist(),
    }

def gpoly_lane_lognormpdf(x, moyenne, variance):
    """Densite lognormale parametrée par (moyenne, variance) — scalaire ou liste.
    Source de verite : formule analytique standard (cf. economics.reserves).
    """
    x_arr = np.atleast_1d(np.asarray(x, float))
    m = float(moyenne)
    sigma2 = float(np.log(float(variance) / (m * m) + 1.0))
    mu = float(np.log(m) - 0.5 * sigma2)
    safe = np.where(x_arr > 0, x_arr, 1.0)
    z = np.log(safe) - mu
    pdf = np.exp(-z * z / (2.0 * sigma2)) / (safe * np.sqrt(2.0 * np.pi * sigma2))
    pdf = np.where(x_arr > 0, pdf, 0.0)
    return float(pdf[0]) if pdf.size == 1 else pdf.tolist()

# =====================================================================
# Sampling de Gy (chap. 03) suite
# =====================================================================
def gpoly_gy_ecart_type_relatif(params, me, ml, d):
    """sr = ecart_type_relatif(ParametresGy, me, ml, d)."""
    p = _params_gy(params)
    val = _gy_sr(p, float(me), float(ml), float(d))
    return float(val) if np.ndim(val) == 0 else val.tolist()

def gpoly_gy_masse_minimale(params, ml, d, sr_cible):
    p = _params_gy(params)
    return float(_gy_mmin(p, float(ml), float(d), float(sr_cible)))

def gpoly_gy_decomposition(params, me, ml, d):
    """Pour le calculateur Gy : sr (via la librairie) + decompositions pedagogiques.

    sr est calcule par geostat_polymtl.sampling.gy.ecart_type_relatif (source de
    verite). Les helpers U_d, f_L, K sont des definitions mathematiques inline
    (formule de Gy decomposee pour affichage), pas des algorithmes.
    """
    p = _params_gy(params)
    sr  = float(_gy_sr(p, float(me), float(ml), float(d)))
    sr2 = sr * sr
    al, da, dg, d0, f, g = p.al, p.da, p.dg, p.d0, p.f, p.g
    ud = (1 - al) / al * ((1 - al) * da + al * dg)
    fl = min(math.sqrt(d0 / float(d)), 1.0)
    K  = f * g * ud
    m5  = float(_gy_mmin(p, float(ml), float(d), 0.05))
    m10 = float(_gy_mmin(p, float(ml), float(d), 0.10))
    return {'sr': sr, 'sr2': sr2, 'ud': ud, 'fl': fl, 'K': K, 'm5': m5, 'm10': m10}

def gpoly_gy_evaluer_procedure(params, etapes, ml_init):
    """Pour l'abaque : evaluation multi-etapes via la VRAIE ecart_type_relatif.

    etapes : liste de {'d': float, 'me': float}.
    Renvoie {'rows': [{d, me, ml, fl, sr, sr2}], 'sr_global', 'sr2_global', 'worst'}.
    """
    p = _params_gy(params)
    rows = []
    ml = float(ml_init)
    worst = 0; worst_sr2 = 0.0
    for i, s in enumerate(etapes):
        d = float(s['d']); me = float(s['me'])
        sr = float(_gy_sr(p, me, ml, d))
        sr2 = 0.0 if (sr != sr) else sr*sr   # nan-safe
        fl  = min(math.sqrt(p.d0 / d), 1.0)
        rows.append({'d': d, 'me': me, 'ml': ml, 'fl': fl, 'sr': sr, 'sr2': sr2})
        if sr2 > worst_sr2: worst_sr2 = sr2; worst = i
        ml = me
    sr2_total = sum(r['sr2'] for r in rows)
    return {'rows': rows, 'sr_global': math.sqrt(sr2_total), 'sr2_global': sr2_total, 'worst': worst}

def gpoly_gy_isocontours_abaque(params, sr_vals, logd_min, logd_max, logd_step,
                                me_min=1.0, me_max=1e7):
    """Courbes isocontours sᵣ dans l'abaque (me en fonction de d pour chaque sᵣ).

    On utilise la relation issue de la formule de Gy (palier-libre/me<<ml) :
    me = K · f_L · d^3 / sᵣ²  avec K = U_δ · f · g (parametres du materiau).
    Les U_δ, f_L sont les memes definitions que dans ecart_type_relatif.
    """
    p = _params_gy(params)
    ud = (1 - p.al) / p.al * ((1 - p.al) * p.da + p.al * p.dg)
    K  = p.f * p.g * ud
    curves = []
    for sr in sr_vals:
        xs, ys = [], []
        logd = float(logd_min)
        while logd <= float(logd_max) + 1e-9:
            d = 10.0**logd
            fl = min(math.sqrt(p.d0 / d), 1.0)
            me = K * fl * d**3 / (float(sr)**2)
            if me_min <= me <= me_max:
                xs.append(d); ys.append(me)
            logd += float(logd_step)
        curves.append({'sr': float(sr), 'x': xs, 'y': ys})
    return {'K': K, 'ud': ud, 'curves': curves}

def gpoly_simuler_blancs(n_points, bruit, seed):
    return _sim_blancs(int(n_points), float(bruit), int(seed)).tolist()

def gpoly_analyser_blancs(valeurs, ld):
    r = _an_blancs(np.asarray(valeurs, float), float(ld))
    return {
        'ld': r.ld, 'n_total': r.n_total,
        'n_1_3ld': r.n_1_3ld, 'n_3_5ld': r.n_3_5ld,
        'n_5_10ld': r.n_5_10ld, 'n_sup_10ld': r.n_sup_10ld,
        'pct_contamines': r.pct_contamines,
        'indices_1_3ld':    r.indices_1_3ld.tolist(),
        'indices_3_5ld':    r.indices_3_5ld.tolist(),
        'indices_5_10ld':   r.indices_5_10ld.tolist(),
        'indices_sup_10ld': r.indices_sup_10ld.tolist(),
    }

def gpoly_simuler_standards(n_points, valeur_attendue, bruit, portee_correlation,
                             pente_tendance, seed):
    return _sim_standards(int(n_points), float(valeur_attendue), float(bruit),
                          float(portee_correlation), float(pente_tendance),
                          seed=int(seed)).tolist()

def gpoly_analyser_standards(valeurs, moyenne_attendue, ecart_type):
    r = _an_standards(np.asarray(valeurs, float), float(moyenne_attendue), float(ecart_type))
    # Convertir anomalies: dict[str, list[int]]
    return {
        'moyenne_attendue': r.moyenne_attendue,
        'ecart_type': r.ecart_type,
        'n_total': r.n_total, 'n_anomalies': r.n_anomalies,
        'anomalies': {k: list(v) for k, v in r.anomalies.items()},
    }

def gpoly_detecter_anomalies(valeurs, moyenne, ecart_type):
    a = _detect_anom(np.asarray(valeurs, float), float(moyenne), float(ecart_type))
    return {k: list(v) for k, v in a.items()}

def gpoly_simuler_duplicatas(n_points, mediane, sigma, correlation, seed):
    d1, d2 = _sim_dup(int(n_points), float(mediane), float(sigma),
                       float(correlation), seed=int(seed))
    return {'d1': d1.tolist(), 'd2': d2.tolist()}

def gpoly_analyser_duplicatas(dup1, dup2):
    r = _an_dup(np.asarray(dup1, float), np.asarray(dup2, float))
    return {
        'n_total': r.n_total,
        'moyennes': r.moyennes.tolist(),
        'diff_relative': r.diff_relative.tolist(),
        'hard_values': r.hard_values.tolist(),
        'hard_ranks':  r.hard_ranks.tolist(),
        'n_hors_10pct': r.n_hors_10pct,
        'n_hors_20pct': r.n_hors_20pct,
        'n_hors_30pct': r.n_hors_30pct,
        'pct_hard_sous_10': r.pct_hard_sous_10,
    }

# --- Donnees synthetiques chap. 01 et 06 ---
def gpoly_generer_block_model(seed, nx=32, ny=32, nz=40, bloc_size=15.0,
                              n_drill_holes=20, decimales=2):
    """Bloc model 3D pour C01, via geostat_polymtl.data.blockmodel."""
    bm = _gen_bm(nx=int(nx), ny=int(ny), nz=int(nz),
                 bloc_size=float(bloc_size),
                 n_drill_holes=int(n_drill_holes), rng=int(seed))
    return {
        'seed': int(bm.seed),
        'nx': bm.nx, 'ny': bm.ny, 'nz': bm.nz,
        'bloc_size': bm.bloc_size, 'z_top': bm.z_top, 'z_bot': bm.z_bot,
        'grades_flat': np.round(bm.grades, int(decimales)).ravel().tolist(),
        'drill_holes': bm.drill_holes,
        'topo': np.round(bm.topo, 2).tolist(),
    }

def gpoly_lister_scenarios_blockmodel():
    """Liste des 8 scenarios de covariance (id, nom, style, description),
    via geostat_polymtl.data.blockmodel.lister_scenarios."""
    return _lister_scenarios_bm()

def gpoly_generer_block_model_scenario(scenario, seed, nx=32, ny=32, nz=40,
                                        bloc_size=15.0, n_drill_holes=20,
                                        decimales=2, enveloppe=True):
    """Bloc model 3D pour C01 avec un scenario de covariance donne, via
    geostat_polymtl.data.blockmodel.generer_block_model_covariance.

    enveloppe=False -> cube plein sans enveloppe patatoide (atelier 2.1)."""
    bm = _gen_bm_cov(scenario=str(scenario), nx=int(nx), ny=int(ny), nz=int(nz),
                     bloc_size=float(bloc_size),
                     n_drill_holes=int(n_drill_holes),
                     enveloppe=bool(enveloppe), rng=int(seed))
    return {
        'seed': int(bm.seed),
        'nx': bm.nx, 'ny': bm.ny, 'nz': bm.nz,
        'bloc_size': bm.bloc_size, 'z_top': bm.z_top, 'z_bot': bm.z_bot,
        'grades_flat': np.round(bm.grades, int(decimales)).ravel().tolist(),
        'drill_holes': bm.drill_holes,
        'topo': np.round(bm.topo, 2).tolist(),
        'scenario': bm.scenario,
        'style_gisement': bm.style_gisement,
        'description': bm.description,
    }

def gpoly_classifier_ressources(scenario, seed, critere='passe',
                                 nx=32, ny=32, nz=40, bloc_size=15.0,
                                 n_drill_holes=20, pas_composite=15.0,
                                 x=60.0, seuils_ke=(0.6, 0.2, 0.0),
                                 nk=12, rad=1e12, pas_grille=2, decimales=2):
    """Atelier 2 (C01) : classification 3D des ressources du modele de blocs,
    via geostat_polymtl.data.ressources.

    Deux criteres :
    - 'passe' : critere geometrique a deux passes d'estimation imbriquees
      (rayons x et 2x), via classifier_par_passe_estimation.
    - 'ke' : efficacite de krigeage 3D (variogramme du scenario via
      structures_3d_depuis_scenario), seuils seuils_ke.

    Pour rester interactif sous Pyodide, la classification est evaluee sur
    une grille grossiere (pas pas_grille, defaut 2 -> 16x16x20 = 5 120
    points) puis dupliquee par plus-proche-voisin vers la grille fine
    nx*ny*nz pour l'affichage 3D (meme InstancedMesh que l'atelier 1).
    """
    bm = _gen_bm_cov(scenario=str(scenario), nx=int(nx), ny=int(ny), nz=int(nz),
                      bloc_size=float(bloc_size), n_drill_holes=int(n_drill_holes),
                      rng=int(seed))

    pts = _echant_forages(bm.drill_holes, bm.grades, bm.nx, bm.ny, bm.nz,
                           bm.bloc_size, bm.z_top, pas=float(pas_composite))

    p = max(1, int(pas_grille))
    nxc, nyc, nzc = max(1, bm.nx // p), max(1, bm.ny // p), max(1, bm.nz // p)
    xs = (np.arange(nxc) * p + p / 2.0) * bm.bloc_size
    ys = (np.arange(nyc) * p + p / 2.0) * bm.bloc_size
    zs = bm.z_top - (np.arange(nzc) * p + p / 2.0) * bm.bloc_size
    ZZ, YY, XX = np.meshgrid(zs, ys, xs, indexing='ij')
    centres = np.stack([XX.ravel(), YY.ravel(), ZZ.ravel()], axis=1)

    def _vers_grille_fine(codes_coarse):
        """Duplication plus-proche-voisin grille grossiere -> grille fine."""
        c3d = np.asarray(codes_coarse, dtype=int).reshape(nzc, nyc, nxc)
        cf = np.repeat(np.repeat(np.repeat(c3d, p, axis=0), p, axis=1), p, axis=2)
        pz, py, px = bm.nz - cf.shape[0], bm.ny - cf.shape[1], bm.nx - cf.shape[2]
        if pz > 0:
            cf = np.concatenate([cf, np.repeat(cf[-1:], pz, axis=0)], axis=0)
        if py > 0:
            cf = np.concatenate([cf, np.repeat(cf[:, -1:], py, axis=1)], axis=1)
        if px > 0:
            cf = np.concatenate([cf, np.repeat(cf[:, :, -1:], px, axis=2)], axis=2)
        return cf[:bm.nz, :bm.ny, :bm.nx].ravel()

    crit = str(critere)
    veut_ke = crit in ('ke', 'complexe', 'both')

    # Critere geometrique (passe d'estimation) : toujours calcule, peu couteux.
    codes_passe_coarse = _classif_passe(centres, pts[:, :3], x=float(x))

    # Critere efficacite de krigeage (KO) : calcule seulement si demande.
    ke = None
    codes_ke_coarse = None
    if veut_ke:
        # Portees des scenarios en BLOCS -> converties en metres via bloc_size,
        # puisque composites et centres de blocs sont en metres. Sans cela, KE
        # s'effondre vers 0 partout (cf. structures_3d_depuis_scenario).
        structures = _struct_3d(str(scenario), bloc_size=float(bloc_size))
        if pts.shape[0] == 0:
            ke = np.full(centres.shape[0], -1.0)
        else:
            r = _ko_ressources(pts[:, :3], pts[:, 3], centres, structures,
                                pepite=0.0,
                                nk=None if nk is None else int(nk),
                                rad=None if rad is None else float(rad))
            ke = 1.0 - r['variances'] / r['sv']
        codes_ke_coarse = _classif_ke(ke, seuils=tuple(float(s) for s in seuils_ke))

    codes_passe_fine = _vers_grille_fine(codes_passe_coarse)
    codes_ke_fine = _vers_grille_fine(codes_ke_coarse) if codes_ke_coarse is not None else None

    # 'codes_flat' = critere principal (retrocompatibilite mono-critere).
    primaire = codes_ke_fine if crit in ('ke', 'complexe') else codes_passe_fine

    return {
        'seed': int(bm.seed),
        'nx': bm.nx, 'ny': bm.ny, 'nz': bm.nz,
        'bloc_size': bm.bloc_size, 'z_top': bm.z_top, 'z_bot': bm.z_bot,
        'grades_flat': np.round(bm.grades, int(decimales)).ravel().tolist(),
        'codes_flat': [int(c) for c in primaire],
        'codes_passe_flat': [int(c) for c in codes_passe_fine],
        'codes_ke_flat': None if codes_ke_fine is None else [int(c) for c in codes_ke_fine],
        'drill_holes': bm.drill_holes,
        'topo': np.round(bm.topo, 2).tolist(),
        'composites': np.round(pts[:, :3], 2).tolist() if pts.shape[0] else [],
        'noms_classes': {str(k): v for k, v in _NOMS_CLASSES.items()},
        'scenario': bm.scenario,
        'style_gisement': bm.style_gisement,
        'critere': crit,
        'x': float(x),
        'seuils_ke': [float(s) for s in seuils_ke],
        'ke_coarse': None if ke is None else np.round(ke, 3).tolist(),
        'pas_grille': p,
    }

_C06_INFO_CACHE = {}

def _c06_info_field(taille, portee, seed):
    """Champ reel log-normal, mis en cache par (taille, portee, seed) pour que
    seuls le biais/bruit/cutoff soient recalcules a chaque interaction (le notebook
    precalcule REAL_FIELD une seule fois)."""
    key = (int(taille), float(portee), int(seed))
    f = _C06_INFO_CACHE.get(key)
    if f is None:
        g = _champ_fftma(taille=int(taille), portee=float(portee), rng=int(seed))
        f = np.exp(g).astype(np.float32)
        _C06_INFO_CACHE.clear()      # une seule realisation conservee en memoire
        _C06_INFO_CACHE[key] = f
    return f

def gpoly_effet_information_scenario(taille, portee, seed, biais, bruit, cutoff,
                                      v_min=0.0, v_max=10.0):
    """Scenario effet d'information pour C06, via data.synthetic.champ_fftma_2d.

    Reproduit la logique du notebook Chap1_EffetInformation : carte reelle, carte
    estimee (biais + bruit), nuage reel-vs-estime avec classification au cutoff
    et droite de regression. Renvoie aussi un echantillon du nuage (sx, sy, sc) et
    les coefficients de regression.
    """
    reel = _c06_info_field(taille, portee, seed)
    reel_clip = np.clip(reel, float(v_min), float(v_max))

    rng_b = np.random.default_rng(int(seed) * 7919 + 17)   # bruit reproductible par seed
    biais_field = reel * (1.0 + float(biais)/100.0)
    bruit_field = rng_b.normal(scale=float(bruit), size=reel.shape).astype(np.float32)
    estime = np.clip(biais_field + bruit_field, float(v_min), float(v_max)).astype(np.float32)

    real_ore = reel_clip >= float(cutoff)
    est_ore  = estime    >= float(cutoff)
    mask_blue = (~real_ore) & est_ore          # sterile traite
    mask_red  = real_ore & (~est_ore)          # minerai ignore
    tot = reel_clip.size

    rflat = reel_clip.ravel()
    eflat = estime.ravel()
    # Regression lineaire (reel ~ estime) sur TOUT le champ.
    slope, intercept = np.polyfit(eflat, rflat, 1)
    # Classes pour le nuage : 0 = bien classe, 1 = sterile traite, 2 = minerai ignore.
    cls = np.zeros(tot, dtype=np.int8)
    cls[mask_blue.ravel()] = 1
    cls[mask_red.ravel()]  = 2
    # Echantillon pour l'affichage (eviter de tracer 40 000 points).
    samp_rng = np.random.default_rng(12345)
    ns = min(4000, tot)
    idx = samp_rng.choice(tot, size=ns, replace=False)

    return {
        'real_clipped':   np.round(reel_clip, 3).tolist(),
        'estime_clipped': np.round(estime, 3).tolist(),
        'pct_red':  round(100.0 * int(mask_red.sum())  / tot, 3),
        'pct_blue': round(100.0 * int(mask_blue.sum()) / tot, 3),
        'sx': np.round(eflat[idx], 3).tolist(),
        'sy': np.round(rflat[idx], 3).tolist(),
        'sc': cls[idx].tolist(),
        'reg_slope': float(slope),
        'reg_intercept': float(intercept),
    }

def gpoly_masse_volumique_melange(teneurs, densites, porosite=0.0):
    return float(_mvm(np.asarray(teneurs, float), np.asarray(densites, float),
                      float(porosite)))

def gpoly_fractions_volumiques(teneurs, densites):
    return _frac_vol(np.asarray(teneurs, float), np.asarray(densites, float)).tolist()

def gpoly_composition_chimique(formule):
    """Atelier 3.6 : fractions massiques des elements d'une formule chimique."""
    return _compo_chim(str(formule))

def gpoly_lister_scenarios_densite():
    """Atelier 3.6 : scenarios pedagogiques (mineraux, compositions, analyses)."""
    return _lister_scen_densite()

def gpoly_lister_mineraux():
    """Atelier 3.6 : bibliotheque de mineraux (nom, formule, densite, composition)."""
    return _lister_mineraux()

def gpoly_analyser_densite(composition, analyses, densites, porosite=0.0, fermeture=True):
    """Atelier 3.6 : resout A x = b (proportions minerales) puis densite theorique.

    composition : matrice A (n_elements x n_mineraux), analyses : vecteur b,
    densites : masse specifique de chaque mineral. Retourne proportions, A/b
    augmentes, densites theorique et apparente.
    """
    A = np.asarray(composition, float)
    b = np.asarray(analyses, float)
    d = np.asarray(densites, float)
    return _analyser_densite(A, b, d, porosite=float(porosite), fermeture=bool(fermeture))

# --- Variance de bloc (chap. 08) ---
# Toute la mathematique passe par geostat_polymtl.block_variance.
# Les wrappers ci-dessous ne font QUE des conversions JS dict <-> args Python.
def gpoly_variance_bloc_quadrature(geometrie, lx, ly, lz,
                                    palier, ax, ay, az,
                                    modele='spherique', n_points=5):
    """Variance moyenne d'un bloc par quadrature Gauss-Legendre."""
    var, px, py_, pz = _vbloc_quad(str(geometrie),
                                    float(lx), float(ly), float(lz),
                                    float(palier),
                                    float(ax), float(ay), float(az),
                                    modele=str(modele),
                                    n_points=int(n_points))
    return {
        'variance': float(var),
        'pts_x': np.asarray(px, float).tolist(),
        'pts_y': np.asarray(py_, float).tolist(),
        'pts_z': np.asarray(pz, float).tolist(),
    }

def gpoly_variance_bloc_calculateur(dim, palier, pepite,
                                     ax, ay, az, lx, ly, lz,
                                     modele='spherique', n_points=50):
    """Variance de bloc par discretisation reguliere (chap. 08)."""
    return float(_vbloc_calc(int(dim), float(palier), float(pepite),
                              float(ax), float(ay), float(az),
                              float(lx), float(ly), float(lz),
                              modele=str(modele), n_points=int(n_points)))

def gpoly_variance_bloc_support(range_x, range_y, palier, pepite,
                                 block_size, pixel_size=1.0, angle_deg=0.0,
                                 modele='spherique', n_points=40):
    """Variance de bloc carre en fonction du support (atelier 8.1, calque
    notebook). Covariance structuree moyennee + pepite regularisee par l'aire."""
    return float(_vbloc_support(float(range_x), float(range_y),
                                 float(palier), float(pepite),
                                 int(block_size), float(pixel_size),
                                 float(angle_deg), str(modele), int(n_points)))

def gpoly_points_quadrature_visu(geometrie, lx, ly=0.0, lz=0.0, n_points=5):
    """Coordonnees des points de quadrature (visualisation pedagogique)."""
    x, y, z = _pts_quad(str(geometrie), float(lx), float(ly), float(lz),
                         n_points=int(n_points))
    return {'x': x.tolist(), 'y': y.tolist(), 'z': z.tolist()}

def gpoly_agreger_champ(champ_flat, N, taille_bloc):
    """Moyenne mobile glissante (changement de support point -> bloc)."""
    g = np.asarray(champ_flat, float).reshape(int(N), int(N))
    agg = _agreger(g, int(taille_bloc))
    return {'agg': agg.ravel().tolist(),
            'rows': int(agg.shape[0]), 'cols': int(agg.shape[1])}

def gpoly_agreger_champ_blocs(champ_flat, N, taille_bloc):
    """Agregation par blocs DISJOINTS (non chevauchants) : chaque bloc b x b est
    la moyenne des cellules 1x1 qu'il contient (cf. notebook EffetSupport.aggregate).
    champ (N,N) -> (N//b, N//b). C'est le vrai changement de support point -> bloc."""
    b = int(taille_bloc)
    g = np.asarray(champ_flat, float).reshape(int(N), int(N))
    if b <= 1:
        return {'agg': g.ravel().tolist(), 'rows': int(N), 'cols': int(N)}
    s = g.shape[0]
    trimmed = s - (s % b)
    t = g[:trimmed, :trimmed]
    agg = t.reshape(trimmed // b, b, trimmed // b, b).mean(axis=(1, 3))
    return {'agg': agg.ravel().tolist(),
            'rows': int(agg.shape[0]), 'cols': int(agg.shape[1])}

def gpoly_variance_bloc_empirique(champ_flat, N, taille_max):
    """Variance empirique vs taille de bloc (decrochage point -> support)."""
    g = np.asarray(champ_flat, float).reshape(int(N), int(N))
    tailles, variances = _vbloc_emp(g, int(taille_max))
    return {'tailles': list(tailles), 'variances': list(variances)}

def gpoly_variogramme_imbrique(lags, structures, pepite=0.0):
    """gamma(h) pour un modele imbrique : pepite + somme de structures."""
    # structures : liste de dicts {modele, palier, portee}
    structs = [dict(s) for s in structures]
    h = np.asarray(lags, float)
    g = _vario_imb(h, structs, pepite=float(pepite))
    return g.tolist()

def gpoly_variance_bloc_imbrique(geometrie, lx, ly, lz,
                                  structures, pepite=0.0, n_points=5):
    """Variance de bloc pour un modele imbrique : detail par structure."""
    structs = [dict(s) for s in structures]
    var, contributions = _vbloc_imb(str(geometrie),
                                     float(lx), float(ly), float(lz),
                                     structs, pepite=float(pepite),
                                     n_points=int(n_points))
    return {'variance': float(var), 'contributions': list(contributions)}

# --- Krigeage (chap. 09) ---
# Tout passe par kriging.wrappers (lui-meme bati sur cokri). Zero math JS.
def _structs_from_js(structures):
    """Normalise la liste structures recue depuis JS (dicts iterables)."""
    return [dict(s) for s in structures]

def gpoly_krigeage_simple(coords_data, valeurs, coords_cible,
                           structures, pepite=0.0, moyenne=0.0,
                           nk=None, rad=None):
    """Krigeage simple via kriging.wrappers.krigeage_simple."""
    r = _ks(np.asarray(coords_data, float),
            np.asarray(valeurs, float),
            np.asarray(coords_cible, float),
            _structs_from_js(structures),
            pepite=float(pepite), moyenne=float(moyenne),
            nk=None if nk is None else int(nk),
            rad=None if rad is None else float(rad))
    return {
        'estimations': r['estimations'].tolist(),
        'variances': r['variances'].tolist(),
        'sv': r['sv'],
        'lambda': r['lambda'].tolist(),
        'mu': r['mu'].tolist(),
    }

def gpoly_krigeage_ordinaire(coords_data, valeurs, coords_cible,
                              structures, pepite=0.0,
                              nk=None, rad=None):
    """Krigeage ordinaire via kriging.wrappers.krigeage_ordinaire."""
    r = _ko(np.asarray(coords_data, float),
            np.asarray(valeurs, float),
            np.asarray(coords_cible, float),
            _structs_from_js(structures),
            pepite=float(pepite),
            nk=None if nk is None else int(nk),
            rad=None if rad is None else float(rad))
    return {
        'estimations': r['estimations'].tolist(),
        'variances': r['variances'].tolist(),
        'sv': r['sv'],
        'lambda': r['lambda'].tolist(),
        'mu': r['mu'].tolist(),
    }

def gpoly_krigeage_universel(coords_data, valeurs, coords_cible,
                              structures, pepite=0.0, ordre=1,
                              nk=None, rad=None):
    """Krigeage universel via kriging.wrappers.krigeage_universel."""
    r = _ku(np.asarray(coords_data, float),
            np.asarray(valeurs, float),
            np.asarray(coords_cible, float),
            _structs_from_js(structures),
            pepite=float(pepite), ordre=int(ordre),
            nk=None if nk is None else int(nk),
            rad=None if rad is None else float(rad))
    return {
        'estimations': r['estimations'].tolist(),
        'variances': r['variances'].tolist(),
        'sv': r['sv'],
        'lambda': r['lambda'].tolist(),
        'mu': r['mu'].tolist(),
    }

def gpoly_krigeage_derive_externe(coords_data, valeurs, coords_cible,
                                   secondaire_data, secondaire_cible,
                                   structures, pepite=0.0):
    """Krigeage avec derive externe (KED) via kriging.wrappers."""
    r = _ked(np.asarray(coords_data, float),
             np.asarray(valeurs, float),
             np.asarray(coords_cible, float),
             np.asarray(secondaire_data, float),
             np.asarray(secondaire_cible, float),
             _structs_from_js(structures),
             pepite=float(pepite))
    return {
        'estimations': r['estimations'].tolist(),
        'variances': r['variances'].tolist(),
        'sv': r['sv'],
        'lambda': r['lambda'].tolist(),
        'mu': r['mu'].tolist(),
    }

def gpoly_krigeage_grille_globale(coords_data, valeurs, coords_cible,
                                   structures, pepite=0.0):
    """Krigeage ordinaire GLOBAL batché (une factorisation, toutes les cibles).

    Toutes les données servent à chaque cible (pas de voisinage nk) → aucun
    artefact de discrétisation. Le système A·L = B est résolu une seule fois,
    les estimations de toutes les cibles découlent de la même factorisation.
    Utilise covar_nu (même covariance que cokri)."""
    from kriging.wrappers import (_construire_modele_cokri as _cmc,
                                   _prepare_x as _px, _prepare_x0 as _px0)
    from kriging.cokriging import _ensure_covar_format as _ecf
    from cov_func.covar_nu import covar_nu as _cvn
    x, d = _px(np.asarray(coords_data, float), np.asarray(valeurs, float))
    x0 = _px0(np.asarray(coords_cible, float), d)
    model, c = _cmc(_structs_from_js(structures), float(pepite), d)
    cobj, nuobj, _p = _ecf(c, None, 1)
    coords = x[:, :d]
    z = x[:, d]
    n = coords.shape[0]
    m = x0.shape[0]
    K = np.asarray(_cvn(coords, coords, model, cobj, nuobj), float)
    K0 = np.asarray(_cvn(coords, x0, model, cobj, nuobj), float)
    sv = float(np.asarray(_cvn(np.zeros((1, d)), np.zeros((1, d)), model, cobj, nuobj)).ravel()[0])
    ones = np.ones((n, 1))
    A = np.block([[K, ones], [ones.T, np.zeros((1, 1))]])
    B = np.vstack([K0, np.ones((1, m))])
    try:
        L = np.linalg.solve(A, B)
    except np.linalg.LinAlgError:
        L = np.linalg.lstsq(A, B, rcond=None)[0]
    lam = L[:n, :]
    est = lam.T @ z
    var = sv - np.einsum('ij,ij->j', L, B)
    return {'estimations': est.tolist(),
            'variances': np.maximum(var, 0.0).tolist()}

def gpoly_krigeage_bloc(coords_data, valeurs, coords_cible,
                         structures, bloc, discretisation,
                         pepite=0.0, type_kriging='ordinaire',
                         nk=None, rad=None):
    """Krigeage de bloc via kriging.wrappers.krigeage_bloc."""
    r = _kbloc(np.asarray(coords_data, float),
                np.asarray(valeurs, float),
                np.asarray(coords_cible, float),
                _structs_from_js(structures),
                list(bloc), list(discretisation),
                pepite=float(pepite),
                type_kriging=str(type_kriging),
                nk=None if nk is None else int(nk),
                rad=None if rad is None else float(rad))
    return {
        'estimations': r['estimations'].tolist(),
        'variances': r['variances'].tolist(),
        'sv': r['sv'],
    }

def gpoly_validation_croisee(coords_data, valeurs, structures,
                              pepite=0.0, type_kriging='ordinaire',
                              moyenne=0.0, nk=None, rad=None):
    """Validation croisee LOO via kriging.wrappers.validation_croisee."""
    r = _vc(np.asarray(coords_data, float),
            np.asarray(valeurs, float),
            _structs_from_js(structures),
            pepite=float(pepite),
            type_kriging=str(type_kriging),
            moyenne=float(moyenne),
            nk=None if nk is None else int(nk),
            rad=None if rad is None else float(rad))
    return {
        'estimations': r['estimations'].tolist(),
        'variances': r['variances'].tolist(),
        'erreurs': r['erreurs'].tolist(),
        'erreurs_std': r['erreurs_std'].tolist(),
        'moyenne_e_std': r['moyenne_e_std'],
        'var_e_std': r['var_e_std'],
        'observees': r['observees'].tolist(),
    }

def gpoly_systeme_krigeage(coords_data, valeurs, coords_cible,
                            structures, pepite=0.0,
                            type_kriging='ordinaire', moyenne=0.0):
    """Renvoie A, b, lambda, mu, distances pour l'atelier calculateur."""
    r = _sys_krig(np.asarray(coords_data, float),
                   np.asarray(valeurs, float),
                   np.asarray(coords_cible, float),
                   _structs_from_js(structures),
                   pepite=float(pepite),
                   type_kriging=str(type_kriging),
                   moyenne=float(moyenne))
    return {
        'estimations': r['estimations'].tolist(),
        'variances': r['variances'].tolist(),
        'lambda': r['lambda'].tolist(),
        'mu': r['mu'].tolist(),
        'matrice_A': r['matrice_A'].tolist(),
        'vecteur_b': r['vecteur_b'].tolist(),
        'distances_paires': r['distances_paires'].tolist(),
        'distances_cible': r['distances_cible'].tolist(),
        'n_donnees': r['n_donnees'],
        'dimension': r['dimension'],
    }

# --- Cokrigeage multivariable (chap. 10) ---
def _structs_multi_from_js(structures):
    """Normalise les structures multivariables (palier_matrix listes -> arrays)."""
    out = []
    for s in structures:
        s2 = dict(s)
        if 'palier_matrix' in s2:
            s2['palier_matrix'] = np.asarray(s2['palier_matrix'], dtype=float)
        out.append(s2)
    return out

def gpoly_cokrigeage_simple(coords_data, valeurs, coords_cible,
                             structures, nugget_matrix=None,
                             moyennes=None, nk=None, rad=None):
    """Cokrigeage simple p>1 (itype=1)."""
    nug = None if nugget_matrix is None else np.asarray(nugget_matrix, dtype=float)
    moys = None if moyennes is None else np.asarray(moyennes, dtype=float)
    valeurs_py = [np.asarray(v, dtype=float) for v in valeurs]
    r = _cks(np.asarray(coords_data, float), valeurs_py,
              np.asarray(coords_cible, float),
              _structs_multi_from_js(structures),
              nugget_matrix=nug, moyennes=moys,
              nk=None if nk is None else int(nk),
              rad=None if rad is None else float(rad))
    return {
        'estimations': r['estimations'].tolist(),
        'variances': r['variances'].tolist(),
        'sv': r['sv'].tolist(),
    }

def gpoly_cokrigeage_ordinaire(coords_data, valeurs, coords_cible,
                                structures, nugget_matrix=None,
                                nk=None, rad=None):
    """Cokrigeage ordinaire p>1 (itype=3, p contraintes)."""
    nug = None if nugget_matrix is None else np.asarray(nugget_matrix, dtype=float)
    valeurs_py = [np.asarray(v, dtype=float) for v in valeurs]
    r = _cko(np.asarray(coords_data, float), valeurs_py,
              np.asarray(coords_cible, float),
              _structs_multi_from_js(structures),
              nugget_matrix=nug,
              nk=None if nk is None else int(nk),
              rad=None if rad is None else float(rad))
    return {
        'estimations': r['estimations'].tolist(),
        'variances': r['variances'].tolist(),
        'sv': r['sv'].tolist(),
    }

def gpoly_cokrigeage_universel(coords_data, valeurs, coords_cible,
                                structures, nugget_matrix=None,
                                ordre=1, nk=None, rad=None):
    """Cokrigeage universel p>1 (itype=4 ordre 1 / itype=5 ordre 2)."""
    nug = None if nugget_matrix is None else np.asarray(nugget_matrix, dtype=float)
    valeurs_py = [np.asarray(v, dtype=float) for v in valeurs]
    r = _cku(np.asarray(coords_data, float), valeurs_py,
              np.asarray(coords_cible, float),
              _structs_multi_from_js(structures),
              nugget_matrix=nug, ordre=int(ordre),
              nk=None if nk is None else int(nk),
              rad=None if rad is None else float(rad))
    return {
        'estimations': r['estimations'].tolist(),
        'variances': r['variances'].tolist(),
        'sv': r['sv'].tolist(),
    }

def gpoly_systeme_cokrigeage(coords_data, valeurs, coords_cible,
                              structures, nugget_matrix=None,
                              type_kriging='ordinaire', moyennes=None):
    """Renvoie A, b, lambda pour cokrigeage : calculateur multivariable."""
    nug = None if nugget_matrix is None else np.asarray(nugget_matrix, dtype=float)
    moys = None if moyennes is None else np.asarray(moyennes, dtype=float)
    valeurs_py = [np.asarray(v, dtype=float) for v in valeurs]
    r = _sys_cokrig(np.asarray(coords_data, float), valeurs_py,
                     np.asarray(coords_cible, float),
                     _structs_multi_from_js(structures),
                     nugget_matrix=nug,
                     type_kriging=str(type_kriging),
                     moyennes=moys)
    return {
        'estimations': r['estimations'],
        'variances': r['variances'],
        'sv': r['sv'],
        'matrice_A': r['matrice_A'].tolist(),
        'vecteur_b': r['vecteur_b'].tolist(),
        'lambda': r['lambda'].tolist(),
        'n_donnees': r['n_donnees'],
        'n_variables': r['n_variables'],
        'dimension': r['dimension'],
    }

# --- Krigeage d'indicatrices (chap. 11) ---
def gpoly_KI_complet(coords_data, valeurs, coords_cible, seuils,
                     modele='spherique', portee=20, palier=0.25,
                     pepite=0.0, methode_correction='moyenne'):
    """Pipeline complet KI : codage -> krigeage -> correction.

    Renvoie CDF brute, CDF corrigee, et statistiques de violation.
    """
    coords_data = np.asarray(coords_data, float)
    valeurs = np.asarray(valeurs, float)
    coords_cible = np.asarray(coords_cible, float)
    seuils_arr = np.asarray(seuils, float)
    # Meme structure de variogramme pour chaque seuil (cas pedagogique)
    structs = [[{'modele': modele, 'palier': palier, 'portee': portee}]
                for _ in seuils_arr]
    pepites = [float(pepite)] * len(seuils_arr)
    cdf_brute = _krig_ind(coords_data, valeurs, coords_cible,
                           seuils_arr, structs, pepites=pepites)
    viol = _viol_ord(cdf_brute)
    cdf_corr = _corr_ord(cdf_brute, methode=methode_correction)
    return {
        'cdf_brute': cdf_brute.tolist(),
        'cdf_corrigee': cdf_corr.tolist(),
        'violations': viol,
        'cdf_empirique': _cdf_emp(valeurs, seuils_arr).tolist(),
    }

def gpoly_KI_decoder(cdf_corrigee, seuils, cutoff, z_min=None, z_max=None):
    """Decodage de la CCDF : mediane, moyenne, P(Z > cutoff), ressources."""
    cdf = np.asarray(cdf_corrigee, dtype=float)
    seuils_arr = np.asarray(seuils, dtype=float)
    if z_min is None:
        z_min = float(seuils_arr[0] - (seuils_arr[1] - seuils_arr[0]))
    if z_max is None:
        z_max = float(seuils_arr[-1] + (seuils_arr[-1] - seuils_arr[-2]))
    med = _med_loc(cdf, seuils_arr)
    moy = _moy_loc(cdf, seuils_arr, z_min=z_min, z_max=z_max)
    p_exc = _p_excede(cdf, seuils_arr, float(cutoff))
    res = _tonnage_teneur(cdf, seuils_arr, float(cutoff), z_max=z_max)
    return {
        'mediane': med.tolist(),
        'moyenne': moy.tolist(),
        'proba_excede': p_exc.tolist(),
        'tonnage_relatif': res['tonnage_relatif'].tolist(),
        'teneur_recup': res['teneur_recup'].tolist(),
        'metal_relatif': res['metal_relatif'].tolist(),
    }

def gpoly_KI_support_affine(seuils, cdf, f_correction):
    """Changement de support affine : ajuste les seuils pour le support bloc."""
    z_b, F_b = _support_affine(np.asarray(seuils, float),
                                np.asarray(cdf, float),
                                float(f_correction))
    return {'seuils_bloc': z_b.tolist(), 'cdf_bloc': F_b.tolist()}

# --- Simulation categorielle (chap. 13) ---
def gpoly_truncated_gaussian(modele, portee, seed, N, proportions):
    """Simule un champ gaussien + tronque en K facies via les proportions."""
    Y = gpoly_simuler_FFTMA(modele, portee, 1.0, int(seed), int(N))
    facies = _tg_champ_facies(np.asarray(Y, dtype=float),
                               list(proportions))
    return {
        'facies': facies.tolist(),
        'Y': Y,  # champ gaussien sous-jacent
        'seuils': _tg_seuils(list(proportions)).tolist(),
    }

def gpoly_PGS(modele, portee, seed, N, proportions, partition_type='horizontale'):
    """Simulation pluri-gaussienne : 2 champs Y1, Y2 + diagramme de partition."""
    Y1 = gpoly_simuler_FFTMA(modele, portee, 1.0, int(seed),      int(N))
    Y2 = gpoly_simuler_FFTMA(modele, portee, 1.0, int(seed) + 999, int(N))
    rects = _pgs_partition(list(proportions), partition_type=str(partition_type))
    facies = _pgs_champs_facies(np.asarray(Y1, float),
                                 np.asarray(Y2, float), rects)
    return {
        'facies': facies.tolist(),
        'Y1': Y1, 'Y2': Y2,
        'rectangles': [list(r) for r in rects],
    }

def gpoly_SIS(modele, portee, seed, N, proportions, x_cond=None,
              pepite=0.05, nk=12):
    """Sequential indicator simulation sur grille NxN."""
    structs = [{'modele': str(modele), 'portee': float(portee), 'palier': 0.25}]
    x_cond_arr = None if x_cond is None else np.asarray(x_cond, float)
    facies = _SIS(list(proportions), structs, int(N),
                   seed=int(seed), x_cond=x_cond_arr,
                   pepite=float(pepite), nk=int(nk))
    return {'facies': facies.tolist()}

def gpoly_MPS(image_TI, N_sim, template_radius=2, seed=42,
              x_cond=None, max_candidats=30):
    """MPS pedagogique par template matching."""
    TI = np.asarray(image_TI, dtype=int)
    if TI.ndim == 1:
        side = int(np.sqrt(TI.size))
        TI = TI.reshape(side, side)
    x_cond_arr = None if x_cond is None else np.asarray(x_cond, float)
    facies = _MPS(TI, int(N_sim), template_radius=int(template_radius),
                   seed=int(seed), x_cond=x_cond_arr,
                   max_candidats=int(max_candidats))
    return {'facies': facies.tolist()}

# --- Variogramme sur donnees dispersees (chap. 07) ---
# Tout vient de geostat_polymtl.exp_variogram.scatter : aucune algorithmique JS.
def gpoly_nuee_variographique(coords, valeurs):
    """Nuee variographique : pour chaque paire, (h, gamma)."""
    h, gamma, i_idx, j_idx = _nuee(np.asarray(coords, float),
                                    np.asarray(valeurs, float))
    return {'h': h.tolist(), 'gamma': gamma.tolist(),
            'idx_i': i_idx.tolist(), 'idx_j': j_idx.tolist()}

def gpoly_variogramme_scatter(coords, valeurs, n_lags=10, h_max=None):
    """Variogramme experimental binne sur points epars."""
    hc, g, c = _vario_scatter(np.asarray(coords, float),
                               np.asarray(valeurs, float),
                               n_lags=int(n_lags),
                               h_max=None if h_max is None else float(h_max))
    return {'h': hc.tolist(),
            'gamma': [None if (v != v) else float(v) for v in g],
            'comptes': c.tolist()}

def gpoly_ajuster_variogramme(h, gamma, comptes):
    """Ajuste automatiquement un modèle (type, c0, c1, a) au variogramme
    expérimental par moindres carrés PONDÉRÉS de Cressie (poids ~ N(h)/γ²).
    Teste sphérique / exponentiel / gaussien et renvoie le meilleur."""
    from scipy.optimize import least_squares
    h = np.asarray(h, float)
    g = np.array([np.nan if v is None else v for v in gamma], dtype=float)
    n = np.asarray(comptes, float)
    m = np.isfinite(g) & (n > 0) & (h > 0)
    h, g, n = h[m], g[m], n[m]
    gmax = float(np.nanmax(g)) if g.size else 1.0
    if h.size < 4:
        return {'type': 'spherique', 'c0': 0.0, 'c1': gmax, 'a': 50.0}

    def cov_u(code, u):
        if code == 2: return np.exp(-u)
        if code == 3: return np.exp(-u * u)
        mm = np.minimum(u, 1.0); return 1 - (1.5 * mm - 0.5 * mm**3)

    best = None
    for nom, code in (('spherique', 4), ('exponentiel', 2), ('gaussien', 3)):
        r0 = _range_gfftma(nom, 1.0)
        def resid(p, code=code, nom=nom):
            c0, c1, a = p
            r = _range_gfftma(nom, max(a, 1e-6))
            gm = c0 + c1 * (1 - cov_u(code, h / r))
            w = np.sqrt(n) / np.maximum(gm, 1e-3)   # poids de Cressie (racine pour least_squares)
            return w * (g - gm)
        p0 = [min(0.1, 0.3 * gmax), 0.9 * gmax, float(np.median(h))]
        try:
            res = least_squares(resid, p0,
                                bounds=([0.0, 1e-3, 1.0], [0.6 * gmax + 0.3, 3 * gmax + 0.1, 400.0]),
                                max_nfev=3000)
            if best is None or res.cost < best[0]:
                best = (float(res.cost), nom, res.x)
        except Exception:
            continue
    if best is None:
        return {'type': 'spherique', 'c0': 0.0, 'c1': gmax, 'a': 50.0}
    _, nom, x = best
    return {'type': nom, 'c0': float(x[0]), 'c1': float(x[1]), 'a': float(x[2])}

def gpoly_ajuster_variogramme_aniso(dirs, h_list, gamma_list, comptes_list):
    """Ajuste un modèle anisotrope (type, c0, c1, a_g majeure, a_p mineure, theta)
    aux variogrammes directionnels par moindres carrés pondérés de Cressie."""
    from scipy.optimize import least_squares
    H, G, NN, PHI = [], [], [], []
    for i in range(len(dirs)):
        hh = np.asarray(h_list[i], float)
        gg = np.array([np.nan if v is None else v for v in gamma_list[i]], float)
        cc = np.asarray(comptes_list[i], float)
        m = np.isfinite(gg) & (cc > 0) & (hh > 0)
        if m.sum() == 0: continue
        H.append(hh[m]); G.append(gg[m]); NN.append(cc[m]); PHI.append(np.full(int(m.sum()), float(dirs[i])))
    if not H:
        return {'type': 'spherique', 'c0': 0.0, 'c1': 1.0, 'ag': 40.0, 'ap': 20.0, 'theta': 0.0}
    H = np.concatenate(H); G = np.concatenate(G); NN = np.concatenate(NN); PHI = np.concatenate(PHI)
    gmax = float(np.nanmax(G))

    def cov_u(code, u):
        if code == 2: return np.exp(-u)
        if code == 3: return np.exp(-u * u)
        mm = np.minimum(u, 1.0); return 1 - (1.5 * mm - 0.5 * mm**3)
    FACT = {4: 1.0, 2: 1.0 / 3.0, 3: 1.0 / math.sqrt(3.0)}
    best = None
    for code in (4, 2, 3):
        fact = FACT[code]
        def resid(p, code=code, fact=fact):
            c0, c1, ag, ap, th = p
            d = (PHI - th) * math.pi / 180.0
            aphi = ag * ap / np.sqrt((ap * np.cos(d))**2 + (ag * np.sin(d))**2 + 1e-9)
            r = np.maximum(aphi * fact, 1e-6)
            gm = c0 + c1 * (1 - cov_u(code, H / r))
            w = np.sqrt(NN) / np.maximum(gm, 1e-3)
            return w * (G - gm)
        for th0 in (0.0, 45.0, 90.0, 135.0):
            p0 = [min(0.1, 0.3 * gmax), 0.9 * gmax, float(np.median(H)), float(np.median(H)) * 0.5, th0]
            try:
                res = least_squares(resid, p0, bounds=([0, 1e-3, 5, 5, -10], [0.6 * gmax + 0.3, 3 * gmax + 0.1, 200, 200, 190]), max_nfev=4000)
                if best is None or res.cost < best[0]: best = (float(res.cost), code, res.x)
            except Exception:
                continue
    if best is None:
        return {'type': 'spherique', 'c0': 0.0, 'c1': gmax, 'ag': 40.0, 'ap': 20.0, 'theta': 0.0}
    _, code, x = best
    c0, c1, ag, ap, th = [float(v) for v in x]
    if ap > ag: ag, ap, th = ap, ag, th + 90.0   # garder a_g = majeure
    th = th % 180.0
    NOMS = {4: 'spherique', 2: 'exponentiel', 3: 'gaussien'}
    return {'type': NOMS[code], 'c0': c0, 'c1': c1, 'ag': ag, 'ap': ap, 'theta': th}

def gpoly_variogramme_directionnel(coords, valeurs, azimut, tolerance,
                                    n_lags=10, h_max=None):
    """Variogramme experimental directionnel (2D) avec tolerance angulaire."""
    hc, g, c = _vario_dir(np.asarray(coords, float),
                           np.asarray(valeurs, float),
                           float(azimut), float(tolerance),
                           n_lags=int(n_lags),
                           h_max=None if h_max is None else float(h_max))
    return {'h': hc.tolist(),
            'gamma': [None if (v != v) else float(v) for v in g],
            'comptes': c.tolist()}

def gpoly_variogramme_robuste(coords, valeurs, n_lags=10, h_max=None):
    """Estimateur robuste Cressie-Hawkins (resistant aux outliers)."""
    hc, g, c = _vario_robust(np.asarray(coords, float),
                              np.asarray(valeurs, float),
                              n_lags=int(n_lags),
                              h_max=None if h_max is None else float(h_max))
    return {'h': hc.tolist(),
            'gamma': [None if (v != v) else float(v) for v in g],
            'comptes': c.tolist()}

# --- Variogramme empirique sur grille (sommation directionnelle X et Y) ---
# Pas une duplication d'algorithme : c'est la definition statistique
# γ(h) = E[(Z(x+h) − Z(x))²] / 2 appliquee directement aux differences sur grille.
def gpoly_variogramme_empirique_grille(grid_flat, N, lag_max):
    g = np.asarray(grid_flat, float).reshape(int(N), int(N))
    lags, values = [], []
    for h in range(1, int(lag_max) + 1):
        dx = g[:, h:] - g[:, :-h]
        dy = g[h:, :] - g[:-h, :]
        s = (dx**2).sum() + (dy**2).sum()
        c = dx.size + dy.size
        lags.append(h)
        values.append(0.5 * s / c)
    return {'lags': lags, 'values': values}
  `);

  return py;
}

// =====================================================================
// API JS PUBLIQUE — chaque appel marshall les args, execute Python,
// reconvertit le resultat. Aucune logique mathematique cote JS.
// =====================================================================

async function _call(nom, ...args) {
  const py = await pretPyodide();
  py.globals.set('_args', py.toPy(args));
  let res;
  try { res = py.runPython(`${nom}(*_args)`); }
  catch (e) {
    // Log COMPLET dans la console pour faciliter le debug
    console.error(`[gpoly.${nom}] échec :`, e);
    console.error(`[gpoly.${nom}] arguments :`, args);
    throw new Error(`Erreur dans ${nom} : ${e.message}`);
  }
  if (res && typeof res.toJs === 'function') {
    const js = res.toJs({ dict_converter: Object.fromEntries });
    res.destroy();
    return js;
  }
  return res;
}

/** Pont vers la VRAIE librairie geostat_polymtl. Tous les calculs sont en Python. */
export const gpoly = {
  // ---- Simulation ----
  simulerChamp: (modele, portee, pepite, seed, N,
                 type_champ = 'gaussien', moyenne = 1.0, variance = 1.0) =>
    _call('gpoly_simuler_champ', modele, portee, pepite, seed, N,
          type_champ, moyenne, variance).then(r => new Float64Array(r)),

  // Cube n×n×n (GFFTMA 3D). Ordre C : idx = (ix*n + iy)*n + iz.
  simulerChamp3D: (modele, portee, pepite, seed, n,
                   type_champ = 'gaussien', moyenne = 1.0, variance = 1.0) =>
    _call('gpoly_simuler_champ_3d', modele, portee, pepite, seed, n,
          type_champ, moyenne, variance).then(r => new Float64Array(r)),

  // Champ 1D (transect) de longueur n.
  simulerChamp1D: (modele, portee, pepite, seed, n,
                   type_champ = 'gaussien', moyenne = 0.0, variance = 1.0) =>
    _call('gpoly_simuler_champ_1d', modele, portee, pepite, seed, n,
          type_champ, moyenne, variance).then(r => new Float64Array(r)),

  // nbsim transects 1D N(0,1) du même modèle, batchés en un appel.
  simuler1DN: (modele, portee, seed, n, nbsim) =>
    _call('gpoly_simuler_1d_n', modele, portee, seed, n, nbsim),

  // nbsim réalisations 2D d'un modèle imbriqué (liste {type,rx,ry,angle,sill}), batchées.
  simuler2DNestedN: (structures, seed, N, nbsim) =>
    _call('gpoly_simuler_2d_nested_n', structures, seed, N, nbsim),

  // ---- Simulation catégorielle (chap. 13) : TGS, PGS, SIS, MPS ----
  truncatedGaussian: (modele, portee, seed, N, proportions) =>
    _call('gpoly_truncated_gaussian', modele, portee, seed, N, proportions),
  PGS: (modele, portee, seed, N, proportions, partition_type = 'horizontale') =>
    _call('gpoly_PGS', modele, portee, seed, N, proportions, partition_type),
  SIS: (modele, portee, seed, N, proportions, x_cond = null, pepite = 0.05, nk = 12) =>
    _call('gpoly_SIS', modele, portee, seed, N, proportions, x_cond, pepite, nk),
  MPS: (image_TI, N_sim, template_radius = 2, seed = 42) =>
    _call('gpoly_MPS', image_TI, N_sim, template_radius, seed),

  // Champ 2D ANISOTROPE (portées majeure/mineure + angle, en degrés).
  simulerChampAniso: (modele, portee_x, portee_y, angle, pepite, seed, N,
                      type_champ = 'gaussien', moyenne = 1.0, variance = 1.0) =>
    _call('gpoly_simuler_champ_aniso', modele, portee_x, portee_y, angle, pepite, seed, N,
          type_champ, moyenne, variance).then(r => new Float64Array(r)),

  // ---- Simulation continue (chap. 12) : LU, SGS, STBM, FFT-MA ----
  simulerLU: (modele, portee, palier, seed, N, x_cond = null) =>
    _call('gpoly_simuler_LU', modele, portee, palier, seed, N, x_cond)
      .then(r => new Float64Array(r)),
  simulerSGS: (modele, portee, palier, seed, N, x_cond = null, nk = 12) =>
    _call('gpoly_simuler_SGS', modele, portee, palier, seed, N, x_cond, nk)
      .then(r => new Float64Array(r)),
  simulerSTBM: (modele, portee, palier, seed, N, n_lignes = 1000) =>
    _call('gpoly_simuler_STBM', modele, portee, palier, seed, N, n_lignes)
      .then(r => new Float64Array(r)),
  simulerFFTMA: (modele, portee, palier, seed, N) =>
    _call('gpoly_simuler_FFTMA', modele, portee, palier, seed, N)
      .then(r => new Float64Array(r)),
  simulerNRealisations: (modele, portee, palier, seed, N, nbsim, methode = 'FFTMA') =>
    _call('gpoly_simuler_N_realisations', modele, portee, palier, seed, N, nbsim, methode),
  probaExcede: (modele, portee, palier, seed, N, nbsim, cutoff, methode = 'FFTMA') =>
    _call('gpoly_proba_excede', modele, portee, palier, seed, N, nbsim, cutoff, methode),

  // ---- Treatment ----
  composite: (echantillons, longueur, couverture_min = 0.5) =>
    _call('gpoly_composite', echantillons, longueur, couverture_min),

  degrouper: (coords, valeurs, taille_cellule) =>
    _call('gpoly_degrouper', coords, valeurs, taille_cellule),
  optimiserDegroupement: (coords, valeurs, tailles, nTranslations = 3, seed = 0) =>
    _call('gpoly_optimiser_degroupement', coords, valeurs, tailles, nTranslations, seed),

  cosinusDirecteurs: (mesures) => _call('gpoly_cosinus_directeurs', mesures),

  calculerTrajectoire: (mesures, collet = [0, 0, 0]) =>
    _call('gpoly_calculer_trajectoire', mesures, collet),
  interpolerProfondeurs: (mesures, collet, profondeurs) =>
    _call('gpoly_interpoler_profondeurs', mesures, collet, profondeurs),

  propagationTonnage: (V, sV, d, sd, t, st) =>
    _call('gpoly_propagation_tonnage', V, sV, d, sd, t, st),

  statistiquesDescriptives: (valeurs) =>
    _call('gpoly_statistiques_descriptives', valeurs),

  histogramme: (valeurs, n_classes = 12) =>
    _call('gpoly_histogramme', valeurs, n_classes),

  apparierHistogramme: (reference, cible) =>
    _call('gpoly_apparier_histogramme', reference, cible).then(r => new Float64Array(r)),

  boiteAMoustaches: (valeurs) => _call('gpoly_boite_a_moustaches', valeurs),
  // Quantiles et régression (anti-duplication math en JS)
  quantiles: (valeurs, probabilites) =>
    _call('gpoly_quantiles', Array.from(valeurs), Array.from(probabilites)),
  regressionLineaire: (x, y) => _call('gpoly_regression_lineaire', Array.from(x), Array.from(y)),
  densiteNormale: (x) => _call('gpoly_densite_normale', Array.from(x)),
  // Lois normales parametrées (annexe B)
  densiteNormaleMS: (x, moyenne = 0, ecart_type = 1) =>
    _call('gpoly_densite_normale_ms', Array.from(x), moyenne, ecart_type),
  repartitionNormale: (x, moyenne = 0, ecart_type = 1) =>
    _call('gpoly_repartition_normale', Array.from(x), moyenne, ecart_type),
  probabiliteIntervalle: (a, b, moyenne = 0, ecart_type = 1) =>
    _call('gpoly_probabilite_intervalle', a, b, moyenne, ecart_type),

  // ---- Geometrie d'orientation 3D (annexe A) ----
  geomVecteur: (azimut, plongee) => _call('gpoly_geom_vecteur', azimut, plongee),
  geomConversionsPlan: (convention, a, b) =>
    _call('gpoly_geom_conversions_plan', convention, a, b),
  geomIntersection: (ap, bp, af, bf, d, collet = null) =>
    _call('gpoly_geom_intersection', ap, bp, af, bf, d, collet),
  geomEllipseCylindre: (ap, bp, rayon = 1.0, n_points = 361) =>
    _call('gpoly_geom_ellipse_cylindre', ap, bp, rayon, n_points),

  // ---- Conventional ----
  idw: (coords, valeurs, points, puissance = 2.0, rayon = null) =>
    _call('gpoly_idw', coords, valeurs, points, puissance, rayon)
      .then(r => new Float64Array(r)),

  plusProcheVoisin: (coords, valeurs, points) =>
    _call('gpoly_plus_proche_voisin', coords, valeurs, points)
      .then(r => new Float64Array(r)),

  interpolationTriangulaire: (coords, valeurs, points, mode = 'barycentrique') =>
    _call('gpoly_interpolation_triangulaire', coords, valeurs, points, mode)
      .then(r => new Float64Array(r)),

  volumeEntreSections: (S1, S2, L, methode = 'moyenne') =>
    _call('gpoly_volume_entre_sections', S1, S2, L, methode),

  estimerSections: (S1, t1, S2, t2, L, densite, methode = 'moyenne') =>
    _call('gpoly_estimer_sections', S1, t1, S2, t2, L, densite, methode),

  statistiquesErreur: (vraies, estimees) =>
    _call('gpoly_statistiques_erreur', vraies, estimees),

  // ---- Variogramme ----
  variogrammeTheorique: (modele, lags, portee, palier = 1.0) =>
    _call('gpoly_variogramme_theorique', modele, lags, portee, palier)
      .then(r => new Float64Array(r)),

  variogrammeEmpiriqueGrille: (grid, N, lag_max) =>
    _call('gpoly_variogramme_empirique_grille', Array.from(grid), N, lag_max),

  // ---- Variogramme sur donnees dispersees (chap. 07) ----
  // Nuee : (h_ij, gamma_ij) pour chaque paire
  nueeVariographique: (coords, valeurs) =>
    _call('gpoly_nuee_variographique', coords, Array.from(valeurs)),
  // Variogramme experimental binne (isotrope)
  // Ajustement automatique (Cressie WLS) -> {type, c0, c1, a}
  ajusterVariogramme: (h, gamma, comptes) =>
    _call('gpoly_ajuster_variogramme', h, gamma, comptes),
  // Ajustement anisotrope (Cressie WLS sur les directions) -> {type,c0,c1,ag,ap,theta}
  ajusterVariogrammeAniso: (dirs, h_list, gamma_list, comptes_list) =>
    _call('gpoly_ajuster_variogramme_aniso', dirs, h_list, gamma_list, comptes_list),

  variogrammeScatter: (coords, valeurs, n_lags = 10, h_max = null) =>
    _call('gpoly_variogramme_scatter', coords, Array.from(valeurs), n_lags, h_max),
  // Variogramme experimental binne (directionnel 2D)
  variogrammeDirectionnel: (coords, valeurs, azimut, tolerance,
                             n_lags = 10, h_max = null) =>
    _call('gpoly_variogramme_directionnel', coords, Array.from(valeurs),
          azimut, tolerance, n_lags, h_max),
  // Estimateur robuste Cressie-Hawkins (resiste aux outliers)
  variogrammeRobuste: (coords, valeurs, n_lags = 10, h_max = null) =>
    _call('gpoly_variogramme_robuste', coords, Array.from(valeurs), n_lags, h_max),

  // ---- Sampling et QA/QC (chap. 03) ----
  // Theorie de Pierre Gy
  gyEcartTypeRelatif: (params, me, ml, d) =>
    _call('gpoly_gy_ecart_type_relatif', params, me, ml, d),
  gyMasseMinimale: (params, ml, d, sr_cible) =>
    _call('gpoly_gy_masse_minimale', params, ml, d, sr_cible),
  gyDecomposition: (params, me, ml, d) =>
    _call('gpoly_gy_decomposition', params, me, ml, d),

  // ---- Lane / Taylor (chap. 02) — geostat_polymtl.economics ----
  laneTeneursLimites: (params) =>
    _call('gpoly_lane_teneurs_limites', params),
  laneAnalyseComplete: (params, n_points = 600) =>
    _call('gpoly_lane_analyse_complete', params, n_points),
  laneReserves: (moyenne, variance, cc, distribution = 'lognormale') =>
    _call('gpoly_lane_reserves', moyenne, variance, cc, distribution),
  laneLognormPdf: (x, moyenne, variance) =>
    _call('gpoly_lane_lognormpdf', x, moyenne, variance),
  gyEvaluerProcedure: (params, etapes, ml_init) =>
    _call('gpoly_gy_evaluer_procedure', params, etapes, ml_init),
  gyIsocontoursAbaque: (params, sr_vals, logd_min = -3, logd_max = 1, logd_step = 0.05) =>
    _call('gpoly_gy_isocontours_abaque', params, sr_vals, logd_min, logd_max, logd_step),

  // Blancs
  simulerBlancs: (n_points, bruit, seed) =>
    _call('gpoly_simuler_blancs', n_points, bruit, seed).then(r => Float64Array.from(r)),
  analyserBlancs: (valeurs, ld) =>
    _call('gpoly_analyser_blancs', Array.from(valeurs), ld),

  // Standards
  simulerStandards: (n_points, valeur_attendue, bruit, portee_correlation, pente_tendance, seed) =>
    _call('gpoly_simuler_standards', n_points, valeur_attendue, bruit,
          portee_correlation, pente_tendance, seed).then(r => Float64Array.from(r)),
  analyserStandards: (valeurs, moyenne_attendue, ecart_type) =>
    _call('gpoly_analyser_standards', Array.from(valeurs), moyenne_attendue, ecart_type),
  detecterAnomalies: (valeurs, moyenne, ecart_type) =>
    _call('gpoly_detecter_anomalies', Array.from(valeurs), moyenne, ecart_type),

  // Duplicatas
  simulerDuplicatas: (n_points, mediane, sigma, correlation, seed) =>
    _call('gpoly_simuler_duplicatas', n_points, mediane, sigma, correlation, seed),
  analyserDuplicatas: (dup1, dup2) =>
    _call('gpoly_analyser_duplicatas', Array.from(dup1), Array.from(dup2)),

  // Densite
  masseVolumiqueMelange: (teneurs, densites, porosite = 0) =>
    _call('gpoly_masse_volumique_melange', teneurs, densites, porosite),
  fractionsVolumiques: (teneurs, densites) =>
    _call('gpoly_fractions_volumiques', teneurs, densites),
  // Atelier 3.6 — densite theorique via Ax=b
  compositionChimique: (formule) =>
    _call('gpoly_composition_chimique', formule),
  listerScenariosDensite: () =>
    _call('gpoly_lister_scenarios_densite'),
  listerMineraux: () =>
    _call('gpoly_lister_mineraux'),
  analyserDensite: (composition, analyses, densites, porosite = 0, fermeture = true) =>
    _call('gpoly_analyser_densite', composition, analyses, densites, porosite, fermeture)
      .then(r => Float64Array.from(r)),

  // ---- Donnees synthetiques (chap. 01 et 06) ----
  genererBlockModel: (seed, nx = 32, ny = 32, nz = 40, bloc_size = 15, n_drill_holes = 20, decimales = 2) =>
    _call('gpoly_generer_block_model', seed, nx, ny, nz, bloc_size, n_drill_holes, decimales),
  listerScenariosBlockModel: () =>
    _call('gpoly_lister_scenarios_blockmodel'),
  genererBlockModelScenario: (scenario, seed, nx = 32, ny = 32, nz = 40, bloc_size = 15, n_drill_holes = 20, decimales = 2, enveloppe = true) =>
    _call('gpoly_generer_block_model_scenario', scenario, seed, nx, ny, nz, bloc_size, n_drill_holes, decimales, enveloppe),
  classifierRessources: (scenario, seed, critere = 'passe', nx = 32, ny = 32, nz = 40,
                          bloc_size = 15, n_drill_holes = 20, pas_composite = 15,
                          x = 60, seuils_ke = [0.6, 0.2, 0.0], nk = 12, rad = 1e12,
                          pas_grille = 2, decimales = 2) =>
    _call('gpoly_classifier_ressources', scenario, seed, critere, nx, ny, nz, bloc_size,
          n_drill_holes, pas_composite, x, seuils_ke, nk, rad, pas_grille, decimales),
  effetInformationScenario: (taille, portee, seed, biais, bruit, cutoff, v_min = 0, v_max = 10) =>
    _call('gpoly_effet_information_scenario', taille, portee, seed, biais, bruit, cutoff, v_min, v_max),

  // ---- Variance de bloc (chap. 08) ----
  // Quadrature analytique Gauss-Legendre (anisotrope 1D/2D/3D)
  varianceBlocQuadrature: (geometrie, lx, ly, lz, palier, ax, ay, az,
                            modele = 'spherique', n_points = 5) =>
    _call('gpoly_variance_bloc_quadrature', geometrie, lx, ly, lz,
          palier, ax, ay, az, modele, n_points),
  // Calculateur generique 1D/2D/3D avec discretisation reguliere
  varianceBlocCalculateur: (dim, palier, pepite, ax, ay, az, lx, ly, lz,
                             modele = 'spherique', n_points = 50) =>
    _call('gpoly_variance_bloc_calculateur', dim, palier, pepite,
          ax, ay, az, lx, ly, lz, modele, n_points),
  // Variance de bloc carre vs support (atelier 8.1, calque notebook)
  varianceBlocSupport: (range_x, range_y, palier, pepite, block_size,
                        pixel_size = 1.0, angle_deg = 0.0,
                        modele = 'spherique', n_points = 40) =>
    _call('gpoly_variance_bloc_support', range_x, range_y, palier, pepite,
          block_size, pixel_size, angle_deg, modele, n_points),
  // Points de quadrature (visualisation pedagogique)
  pointsQuadratureVisu: (geometrie, lx, ly = 0, lz = 0, n_points = 5) =>
    _call('gpoly_points_quadrature_visu', geometrie, lx, ly, lz, n_points),
  // Empirique : agregation par blocs glissants
  agregerChamp: (champ, N, taille_bloc) =>
    _call('gpoly_agreger_champ', Array.from(champ), N, taille_bloc),
  // Agregation par blocs DISJOINTS (vrai changement de support) -> (N//b, N//b)
  agregerChampBlocs: (champ, N, taille_bloc) =>
    _call('gpoly_agreger_champ_blocs', Array.from(champ), N, taille_bloc),
  // Empirique : variance vs taille de bloc (decrochage point->support)
  varianceBlocEmpirique: (champ, N, taille_max) =>
    _call('gpoly_variance_bloc_empirique', Array.from(champ), N, taille_max),
  // Modeles imbriques
  variogrammeImbrique: (lags, structures, pepite = 0) =>
    _call('gpoly_variogramme_imbrique', Array.from(lags), structures, pepite)
      .then(r => new Float64Array(r)),
  varianceBlocImbrique: (geometrie, lx, ly, lz, structures, pepite = 0, n_points = 5) =>
    _call('gpoly_variance_bloc_imbrique', geometrie, lx, ly, lz,
          structures, pepite, n_points),

  // ---- Krigeage (chap. 09) ----
  // Tout est delegue a geostat_polymtl.kriging.cokriging.cokri via wrappers.py.
  krigeageSimple: (coords_data, valeurs, coords_cible,
                    structures, pepite = 0, moyenne = 0,
                    nk = null, rad = null) =>
    _call('gpoly_krigeage_simple', coords_data, Array.from(valeurs),
          coords_cible, structures, pepite, moyenne, nk, rad),

  krigeageOrdinaire: (coords_data, valeurs, coords_cible,
                       structures, pepite = 0, nk = null, rad = null) =>
    _call('gpoly_krigeage_ordinaire', coords_data, Array.from(valeurs),
          coords_cible, structures, pepite, nk, rad),

  krigeageUniversel: (coords_data, valeurs, coords_cible,
                       structures, pepite = 0, ordre = 1,
                       nk = null, rad = null) =>
    _call('gpoly_krigeage_universel', coords_data, Array.from(valeurs),
          coords_cible, structures, pepite, ordre, nk, rad),

  // Krigeage avec derive externe (KED) : variable secondaire connue partout.
  krigeageDeriveExterne: (coords_data, valeurs, coords_cible,
                           secondaire_data, secondaire_cible,
                           structures, pepite = 0) =>
    _call('gpoly_krigeage_derive_externe', coords_data, Array.from(valeurs),
          coords_cible, Array.from(secondaire_data), Array.from(secondaire_cible),
          structures, pepite),

  krigeageBloc: (coords_data, valeurs, coords_cible,
                  structures, bloc, discretisation,
                  pepite = 0, type_kriging = 'ordinaire',
                  nk = null, rad = null) =>
    _call('gpoly_krigeage_bloc', coords_data, Array.from(valeurs),
          coords_cible, structures, bloc, discretisation,
          pepite, type_kriging, nk, rad),

  // Krigeage ordinaire GLOBAL batché (toutes les cibles d'un coup, sans nk).
  krigeageGrilleGlobale: (coords_data, valeurs, coords_cible,
                           structures, pepite = 0) =>
    _call('gpoly_krigeage_grille_globale', coords_data, Array.from(valeurs),
          coords_cible, structures, pepite),

  validationCroisee: (coords_data, valeurs, structures,
                       pepite = 0, type_kriging = 'ordinaire',
                       moyenne = 0, nk = null, rad = null) =>
    _call('gpoly_validation_croisee', coords_data, Array.from(valeurs),
          structures, pepite, type_kriging, moyenne, nk, rad),

  systemeKrigeage: (coords_data, valeurs, coords_cible,
                     structures, pepite = 0,
                     type_kriging = 'ordinaire', moyenne = 0) =>
    _call('gpoly_systeme_krigeage', coords_data, Array.from(valeurs),
          coords_cible, structures, pepite, type_kriging, moyenne),

  // ---- Cokrigeage multivariable (chap. 10) ----
  // valeurs : array of arrays [[z1_1..z1_n], [z2_1..z2_n], ...] (p variables)
  // structures : [{ modele, portee, palier_matrix: [[c11,c12],[c12,c22]] }]
  // nugget_matrix : [[n11,n12],[n12,n22]] ou null
  cokrigeageSimple: (coords_data, valeurs, coords_cible, structures,
                      nugget_matrix = null, moyennes = null,
                      nk = null, rad = null) =>
    _call('gpoly_cokrigeage_simple', coords_data,
          valeurs.map(v => Array.from(v)),
          coords_cible, structures, nugget_matrix, moyennes, nk, rad),

  cokrigeageOrdinaire: (coords_data, valeurs, coords_cible, structures,
                         nugget_matrix = null, nk = null, rad = null) =>
    _call('gpoly_cokrigeage_ordinaire', coords_data,
          valeurs.map(v => Array.from(v)),
          coords_cible, structures, nugget_matrix, nk, rad),

  cokrigeageUniversel: (coords_data, valeurs, coords_cible, structures,
                         nugget_matrix = null, ordre = 1, nk = null, rad = null) =>
    _call('gpoly_cokrigeage_universel', coords_data,
          valeurs.map(v => Array.from(v)),
          coords_cible, structures, nugget_matrix, ordre, nk, rad),

  systemeCokrigeage: (coords_data, valeurs, coords_cible, structures,
                       nugget_matrix = null,
                       type_kriging = 'ordinaire', moyennes = null) =>
    _call('gpoly_systeme_cokrigeage', coords_data,
          valeurs.map(v => Array.from(v)),
          coords_cible, structures, nugget_matrix, type_kriging, moyennes),

  // ---- Krigeage d'indicatrices (chap. 11) ----
  KIcomplet: (coords_data, valeurs, coords_cible, seuils,
               modele = 'spherique', portee = 20, palier = 0.25,
               pepite = 0.0, methode_correction = 'moyenne') =>
    _call('gpoly_KI_complet', coords_data, Array.from(valeurs),
          coords_cible, Array.from(seuils),
          modele, portee, palier, pepite, methode_correction),
  KIdecoder: (cdf_corrigee, seuils, cutoff, z_min = null, z_max = null) =>
    _call('gpoly_KI_decoder', cdf_corrigee, Array.from(seuils),
          cutoff, z_min, z_max),
  KIsupportAffine: (seuils, cdf, f_correction) =>
    _call('gpoly_KI_support_affine', Array.from(seuils), Array.from(cdf), f_correction),

  // ---- Simulation categorielle (chap. 13) ----
  truncatedGaussian: (modele, portee, seed, N, proportions) =>
    _call('gpoly_truncated_gaussian', modele, portee, seed, N, Array.from(proportions)),
  PGS: (modele, portee, seed, N, proportions, partition_type = 'horizontale') =>
    _call('gpoly_PGS', modele, portee, seed, N, Array.from(proportions), partition_type),
  SIS: (modele, portee, seed, N, proportions, x_cond = null, pepite = 0.05, nk = 12) =>
    _call('gpoly_SIS', modele, portee, seed, N, Array.from(proportions), x_cond, pepite, nk),
  MPS: (image_TI, N_sim, template_radius = 2, seed = 42, x_cond = null, max_candidats = 30) =>
    _call('gpoly_MPS', Array.from(image_TI), N_sim, template_radius, seed, x_cond, max_candidats),
};

// Compatibilite avec l'ancienne API
export const simulerChampGFFTMA = (modele, portee, pepite, seed, N) =>
  gpoly.simulerChamp(modele, portee, pepite, seed, N, 'gaussien', 0, 1);

/** Place un indicateur de chargement dans `el` jusqu'a ce que Pyodide soit pret. */
export async function afficherChargementJusquaPret(el, texte = 'Chargement de Python…') {
  const indic = document.createElement('div');
  indic.className = 'gw-pyodide-status';
  indic.style.cssText = 'padding:10px;font-size:12px;color:#666;display:flex;align-items:center;gap:8px';
  indic.innerHTML = `<div class="gw-spinner"></div><span>${texte} (~10 s, première fois ; mis en cache ensuite)</span>`;
  el.prepend(indic);
  try {
    await pretPyodide();
    indic.remove();
  } catch (e) {
    // Affiche l'erreur d'initialisation Pyodide DANS le widget plutôt que de la cacher
    console.error('[Pyodide] init échouée :', e);
    indic.innerHTML = `<div style="color:#c43a3a;font-family:monospace;font-size:11px;line-height:1.4;padding:8px 12px;background:#fdecec;border:1px solid #f5c6cb;border-radius:6px;width:100%">
      <b>⚠ Pyodide n'a pas pu démarrer.</b><br>
      ${(e && e.message ? e.message : String(e)).replace(/[<>]/g, c => ({'<':'&lt;','>':'&gt;'}[c]))}
      <br><br><small>Astuce : si tu viens de modifier <code>pyodide_setup.js</code>, fais <b>Ctrl+Shift+R</b> pour vider le cache du navigateur. Détails complets dans la console (F12).</small>
    </div>`;
    throw e;
  }
}

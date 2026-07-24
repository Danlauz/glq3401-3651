"""Generation reproductible d'un modele de blocs 3D pedagogique (chap. 01).

Migration du calcul actuellement embarque dans
`chapters/C01/widget/widget_blockmodel.qmd` (PRNG xorshift + sommes de Fourier
+ enveloppe ellipsoidale + topographie + forages).

Le but est de fournir la **source de verite Python** pour ce widget : la lib
expose `generer_block_model_synthetique()` qui renvoie un objet structure
(grades, forages, topo, metadata) ; le widget JS le charge tel quel.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Union

import numpy as np

from geostat_polymtl._seed import _resolve


@dataclass
class BlockModelSynthetique:
    """Modele de blocs 3D synthetique avec forages et topographie.

    Attributes
    ----------
    grades : np.ndarray, shape (nz, ny, nx)
        Teneurs en % Cu. Pour :func:`generer_block_model_covariance`, toujours
        >= 0 (pas d'enveloppe : tous les blocs de la grille font partie du
        modele). Le generateur historique a sommes de Fourier,
        :func:`generer_block_model_synthetique`, reserve les valeurs
        negatives aux blocs hors d'une enveloppe ellipsoidale (sterile).
    nx, ny, nz : int
        Dimensions du modele (en nombre de blocs).
    bloc_size : float
        Taille d'un bloc (en m).
    z_top, z_bot : float
        Elevation du toit et de la base (en m).
    drill_holes : list of (x0, y0, z0, dx, dy, depth)
        Liste de forages : collet (x0, y0, z0), inclinaison (dx, dy), profondeur.
    topo : np.ndarray, shape (32, 32)
        Surface topographique echantillonnee (deviation par rapport a z_top).
    seed : int
        Graine utilisee.
    scenario : str
        Identifiant du scenario de covariance utilise (vide pour le generateur
        historique a sommes de Fourier).
    style_gisement : str
        Style de gisement illustre (ex. "Porphyrique dissemine").
    description : str
        Description pedagogique courte du scenario.
    """
    grades: np.ndarray
    nx: int
    ny: int
    nz: int
    bloc_size: float
    z_top: float
    z_bot: float
    drill_holes: list
    topo: np.ndarray
    seed: int
    scenario: str = ""
    style_gisement: str = ""
    description: str = ""


def _importer_gfftma():
    """Importe GFFTMA en s'assurant que le dossier du package est sur le
    ``sys.path`` (meme principe que :func:`geostat_polymtl.data.gisement`).
    """
    import sys
    from pathlib import Path

    pkg_dir = Path(__file__).resolve().parent.parent  # .../geostat_polymtl
    if str(pkg_dir) not in sys.path:
        sys.path.insert(0, str(pkg_dir))
    from simulation_methods.GFFTMA import GFFTMA  # type: ignore
    return GFFTMA


def _generer_forages(g: np.random.Generator, nx: int, ny: int, nz: int,
                      bloc_size: float, z_top: float, n_drill_holes: int) -> list:
    """Genere ``n_drill_holes`` forages synthetiques (lignes droites depuis le toit)."""
    drill_holes = []
    for _ in range(n_drill_holes):
        x0 = (0.15 + g.uniform() * 0.7) * nx * bloc_size
        y0 = (0.15 + g.uniform() * 0.7) * ny * bloc_size
        z0 = z_top + 30.0
        ddx = (g.uniform() - 0.5) * 100.0
        ddy = (g.uniform() - 0.5) * 100.0
        depth = nz * bloc_size * (0.5 + g.uniform() * 0.5)
        drill_holes.append([float(x0), float(y0), float(z0),
                            float(ddx), float(ddy), float(depth)])
    return drill_holes


def _generer_topo(nx: int, ny: int, bloc_size: float) -> np.ndarray:
    """Surface topographique analytique deterministe (32x32), comme dans le widget original."""
    res = 32
    xs = np.linspace(-nx * bloc_size * 0.7, nx * bloc_size * 1.4, res)
    ys = np.linspace(-ny * bloc_size * 0.7, ny * bloc_size * 1.4, res)
    Xt, Yt = np.meshgrid(xs, ys)
    return (30.0 * np.sin(Xt * 0.008) * np.cos(Yt * 0.01)
            + 15.0 * np.sin(Xt * 0.02 + Yt * 0.015)).astype(np.float32)


def _masque_enveloppe_patatoide(nx: int, ny: int, nz: int, seed: int,
                                amplitude: float = 0.20) -> np.ndarray:
    """Calcule le masque booleen de l'**enveloppe naturelle** du gisement, de
    forme ellipsoidale perturbee ("patatoide").

    Au lieu d'utiliser la grille complete (boite cubique), on restreint le
    gisement a un ellipsoide centre dont le rayon est module dans chaque
    direction par une perturbation basse frequence reproductible. Chaque graine
    produit donc une forme organique differente, mais deterministe.

    Parameters
    ----------
    nx, ny, nz : int
        Dimensions de la grille de blocs.
    seed : int
        Graine de la perturbation directionnelle (decorrelee du champ via un
        decalage fixe).
    amplitude : float, par defaut 0.20
        Amplitude relative de deformation du rayon de l'enveloppe (0 = ellipsoide
        parfait ; 0.20 = +/- 20 % de variation du rayon selon la direction).

    Returns
    -------
    np.ndarray of bool, shape (nz, ny, nx)
        ``True`` pour les blocs **a l'interieur** de l'enveloppe.
    """
    g = np.random.default_rng(int(seed) + 777)

    iz, iy, ix = np.meshgrid(np.arange(nz), np.arange(ny), np.arange(nx),
                             indexing='ij')
    ix = ix.astype(np.float64)
    iy = iy.astype(np.float64)
    iz = iz.astype(np.float64)

    # Ellipsoide de base (rayons un peu inferieurs a la demi-grille pour laisser
    # une marge sterile sur les bords de la boite).
    cx, cy, cz = nx / 2.0, ny / 2.0, nz * 0.45
    rx, ry, rz = nx * 0.40, ny * 0.40, nz * 0.46
    dxn = (ix - cx) / rx
    dyn = (iy - cy) / ry
    dzn = (iz - cz) / rz
    e_dist = np.sqrt(dxn**2 + dyn**2 + dzn**2)

    # Perturbation directionnelle basse frequence (somme de quelques modes en
    # azimut/zenith), normalisee dans ~[-1, 1].
    theta = np.arctan2(dyn, dxn)                      # azimut
    phi = np.arctan2(np.sqrt(dxn**2 + dyn**2), dzn)   # zenith
    modes = [(1, 1), (2, 1), (1, 2), (3, 2)]
    amps = g.uniform(0.5, 1.0, size=len(modes)) * g.choice([-1.0, 1.0], size=len(modes))
    ph1 = g.uniform(0, 2 * np.pi, size=len(modes))
    ph2 = g.uniform(0, 2 * np.pi, size=len(modes))
    pert = np.zeros_like(e_dist)
    for a, (m, n), p1, p2 in zip(amps, modes, ph1, ph2):
        pert += a * np.cos(m * theta + p1) * np.cos(n * phi + p2)
    pert /= np.sum(np.abs(amps))

    seuil = 1.0 + float(amplitude) * pert
    return e_dist <= seuil


def _appliquer_enveloppe_patatoide(grades: np.ndarray, nx: int, ny: int,
                                   nz: int, seed: int,
                                   amplitude: float = 0.20,
                                   masque_inside: np.ndarray = None) -> np.ndarray:
    """Marque sterile (grade = -1) les blocs hors de l'enveloppe naturelle.

    Voir :func:`_masque_enveloppe_patatoide` pour la forme de l'enveloppe.

    Parameters
    ----------
    grades : np.ndarray, shape (nz, ny, nx)
        Champ de teneurs (>= 0) a masquer.
    nx, ny, nz, seed, amplitude
        Voir :func:`_masque_enveloppe_patatoide`.
    masque_inside : np.ndarray of bool, optional
        Masque deja calcule (``True`` = interieur). Evite de le recalculer.

    Returns
    -------
    np.ndarray, shape (nz, ny, nx)
        Copie de ``grades`` avec les blocs hors enveloppe mis a -1.
    """
    if masque_inside is None:
        masque_inside = _masque_enveloppe_patatoide(nx, ny, nz, seed, amplitude)
    out = grades.copy()
    out[~masque_inside] = -1.0
    return out


def _generer_forages_enveloppe(g: np.random.Generator, masque_inside: np.ndarray,
                               nx: int, ny: int, nz: int, bloc_size: float,
                               z_top: float, n_drill_holes: int) -> list:
    """Genere des forages qui **traversent toujours l'enveloppe** du gisement.

    Chaque forage part au-dessus d'une colonne contenant du minerai (collet
    centre sur un bloc de l'enveloppe, leger pendage) et descend jusqu'a
    franchir le bloc le plus profond de cette colonne. On evite ainsi les
    forages isoles hors gisement (qui n'ont pas de sens physique et degradent
    la couverture en octants du critere de passe d'estimation).
    """
    # Empreinte horizontale : colonnes (iy, ix) qui contiennent au moins un
    # bloc de l'enveloppe.
    colonnes_inside = masque_inside.any(axis=0)          # (ny, nx)
    iy_idx, ix_idx = np.where(colonnes_inside)
    if ix_idx.size == 0:  # repli (ne devrait pas arriver) : forages classiques
        return _generer_forages(g, nx, ny, nz, bloc_size, z_top, n_drill_holes)

    drill_holes = []
    for _ in range(int(n_drill_holes)):
        k = int(g.integers(ix_idx.size))
        cix, ciy = int(ix_idx[k]), int(iy_idx[k])
        # Collet (m) : centre de la colonne + leger decalage intra-bloc.
        x0 = (cix + 0.5 + (g.uniform() - 0.5) * 0.6) * bloc_size
        y0 = (ciy + 0.5 + (g.uniform() - 0.5) * 0.6) * bloc_size
        z0 = z_top + 30.0
        # Profondeur : franchir le bloc d'enveloppe le plus profond de la colonne.
        iz_in = np.where(masque_inside[:, ciy, cix])[0]
        iz_bottom = int(iz_in.max()) if iz_in.size else nz - 1
        depth = (iz_bottom + 1.5) * bloc_size + 30.0
        # Faible deviation laterale pour garder le forage dans l'empreinte.
        ddx = (g.uniform() - 0.5) * 40.0
        ddy = (g.uniform() - 0.5) * 40.0
        drill_holes.append([float(x0), float(y0), float(z0),
                            float(ddx), float(ddy), float(depth)])
    return drill_holes


def generer_block_model_synthetique(
    nx: int = 32,
    ny: int = 32,
    nz: int = 40,
    bloc_size: float = 15.0,
    z_top: float = 3000.0,
    n_drill_holes: int = 20,
    n_fourier: int = 30,
    rng: Union[int, np.random.Generator, None] = None,
) -> BlockModelSynthetique:
    """Genere un modele de blocs 3D synthetique reproductible.

    Le modele suit la logique pedagogique du widget original (chapitre 01) :

    - **Enveloppe ellipsoidale** : les blocs hors d'un ellipsoide centre dans la
      grille sont marques sterile (grade negatif).
    - **Champ correle** : a l'interieur, on calcule un champ gaussien 3D comme
      somme de ``n_fourier`` composantes de Fourier aleatoires.
    - **Enrichissement vers le centre** : la teneur moyenne croit vers le centre
      de l'ellipsoide et vers le toit.
    - **Lognormale** : teneur = exp(mu + sigma · g).

    Parameters
    ----------
    nx, ny, nz : int
        Dimensions de la grille de blocs.
    bloc_size : float, par defaut 15.0
        Taille d'un bloc en metres.
    z_top : float, par defaut 3000.0
        Elevation du toit en metres.
    n_drill_holes : int, par defaut 20
        Nombre de forages a generer.
    n_fourier : int, par defaut 30
        Nombre de composantes de Fourier pour le champ correle.
    rng : int | np.random.Generator | None
        Graine pour reproductibilite. Voir :mod:`geostat_polymtl._seed`.

    Returns
    -------
    BlockModelSynthetique
    """
    generateur = _resolve(rng)
    seed_utilise = int(generateur.integers(0, 2**31 - 1))
    # Re-seed pour determinisme exact a partir du `seed_utilise`
    g = np.random.default_rng(seed_utilise)

    z_bot = z_top - nz * bloc_size

    # --- Champ correle 3D (sommes de Fourier) ---
    kxs = g.standard_normal(n_fourier) * 0.3
    kys = g.standard_normal(n_fourier) * 0.3
    kzs = g.standard_normal(n_fourier) * 0.15
    phs = g.uniform(0, 2 * np.pi, n_fourier)
    amp = 1.0 / np.sqrt(n_fourier)

    # Grille d'indices (vectorisee)
    iz, iy, ix = np.meshgrid(np.arange(nz), np.arange(ny), np.arange(nx),
                              indexing='ij')
    iz = iz.astype(np.float32)
    iy = iy.astype(np.float32)
    ix = ix.astype(np.float32)

    field = np.zeros_like(ix)
    for k in range(n_fourier):
        field += amp * np.cos(kxs[k] * ix + kys[k] * iy + kzs[k] * iz + phs[k])

    # --- Enveloppe ellipsoidale ---
    cx, cy, cz = nx / 2, ny / 2, nz * 0.45
    rx, ry, rz = nx * 0.42, ny * 0.38, nz * 0.48
    dx = (ix - cx) / rx
    dy = (iy - cy) / ry
    dz = (iz - cz) / rz
    e_dist = np.sqrt(dx**2 + dy**2 + dz**2)
    perturbation = 0.15 * np.sin(ix * 0.5) * np.sin(iz * 0.3)
    masque = e_dist > (1.0 + perturbation)

    # --- Enrichissement + lognormale ---
    enrichment = 0.3 * (1.0 - e_dist) + 0.2 * np.maximum(0, (cz - iz) / nz)
    mu = -1.2 + enrichment * 2.0
    sigma = 0.6
    grades = np.maximum(0.0, np.exp(mu + sigma * field)).astype(np.float32)
    grades[masque] = -1.0   # hors enveloppe

    # --- Forages (lignes droites depuis le toit) ---
    drill_holes = _generer_forages(g, nx, ny, nz, bloc_size, z_top, n_drill_holes)

    # --- Topographie (surface analytique deterministe — pas de tirage) ---
    topo = _generer_topo(nx, ny, bloc_size)

    return BlockModelSynthetique(
        grades=grades,
        nx=nx, ny=ny, nz=nz,
        bloc_size=bloc_size,
        z_top=z_top, z_bot=z_bot,
        drill_holes=drill_holes,
        topo=topo,
        seed=seed_utilise,
    )


# -----------------------------------------------------------------------------
# Scenarios de covariance (atelier "8 styles de gisements")
# -----------------------------------------------------------------------------
#
# Chaque scenario fournit :
#   - "modele"     : tableau (r, 7) au format Marcotte [type, a_x, a_y, a_z,
#                     angle_x, angle_y, angle_z] (degres), un par structure
#                     imbriquee — voir geostat_polymtl.cov_func.covar_nu.
#   - "paliers"    : contributions (paliers) de chaque structure, somme = 1.
#   - "sigma"      : ecart-type du log-champ (variabilite globale).
#   - "style"      : style de gisement illustre.
#   - "description": texte pedagogique court (FR).
#
# Codes de covariance (cov_func.covar_nu) : 1 = pepite, 4 = spherique.
SCENARIOS_COVARIANCE: dict[str, dict] = {
    "spherique_isotrope": {
        "nom": "Spherique isotrope",
        "style": "Porphyrique dissemine",
        "modele": np.array([[4, 12, 12, 12, 0, 0, 0]], dtype=float),
        "paliers": np.array([1.0]),
        "sigma": 0.6,
        "description": (
            "Continuite spatiale identique dans toutes les directions "
            "(portee ~12 blocs, soit ~180 m) : aucune direction privilegiee. "
            "Typique d'un gisement porphyrique dissemine."
        ),
    },
    "spherique_anisotrope": {
        "nom": "Spherique anisotrope",
        "style": "Stratiforme / tabulaire",
        "modele": np.array([[4, 24, 24, 4, 0, 0, 0]], dtype=float),
        "paliers": np.array([1.0]),
        "sigma": 0.6,
        "description": (
            "Forte continuite horizontale (portee 24 blocs) mais faible "
            "continuite verticale (portee 4 blocs), soit un contraste "
            "d'anisotropie ~6:1 : la teneur varie peu le long d'une "
            "couche, mais change rapidement d'une couche a l'autre. "
            "Typique d'un gisement stratiforme/tabulaire."
        ),
    },
    "spherique_isotrope_pepite": {
        "nom": "Spherique isotrope avec pepite",
        "style": "Dissemine heterogene",
        "modele": np.array([
            [1, 1e-6, 1e-6, 1e-6, 0, 0, 0],
            [4, 12, 12, 12, 0, 0, 0],
        ], dtype=float),
        "paliers": np.array([0.35, 0.65]),
        "sigma": 0.6,
        "description": (
            "Meme continuite isotrope que le scenario 1, mais avec un effet "
            "de pepite (35 % de la variance) : une part importante de la "
            "variabilite n'a aucune continuite spatiale, donnant des teneurs "
            "plus erratiques d'un bloc a l'autre."
        ),
    },
    "spherique_anisotrope_pepite": {
        "nom": "Spherique anisotrope avec pepite",
        "style": "Stratiforme bruite",
        "modele": np.array([
            [1, 1e-6, 1e-6, 1e-6, 0, 0, 0],
            [4, 24, 24, 4, 0, 0, 0],
        ], dtype=float),
        "paliers": np.array([0.30, 0.70]),
        "sigma": 0.6,
        "description": (
            "Structure tabulaire du scenario 2 (contraste d'anisotropie "
            "~6:1), perturbee par un effet de pepite (30 %) : la couche "
            "reste reconnaissable mais les teneurs locales sont plus "
            "bruitees, ce qui complique l'estimation a courte distance."
        ),
    },
    "spherique_anisotrope_complexe": {
        "nom": "Spherique anisotrope complexe (rotation 3D)",
        "style": "Veine inclinee",
        "modele": np.array([[4, 27, 8, 2, 25, 15, 40]], dtype=float),
        "paliers": np.array([1.0]),
        "sigma": 0.6,
        "description": (
            "Anisotropie marquee (portees 27, 8 et 2 blocs, soit un "
            "contraste ~13:1) combinee a une rotation sur les trois axes "
            "(25°, 15°, 40°) : la direction de continuite maximale est "
            "oblique par rapport a la grille. Represente une veine etroite "
            "et inclinee."
        ),
    },
    "spherique_grande_portee": {
        "nom": "Spherique isotrope a grande portee",
        "style": "Plutonique / VMS massif",
        "modele": np.array([[4, 27, 27, 27, 0, 0, 0]], dtype=float),
        "paliers": np.array([1.0]),
        "sigma": 0.6,
        "description": (
            "Grande portee isotrope (27 blocs, ~400 m), proche de la taille "
            "de la grille : la teneur varie lentement et de la meme facon "
            "dans toutes les directions. Represente un corps massif de "
            "grande dimension (intrusion plutonique ou amas sulfure massif "
            "de type VMS)."
        ),
    },
    "spherique_lentille": {
        "nom": "Spherique tres anisotrope",
        "style": "Lentille / veine etroite",
        "modele": np.array([[4, 29, 4, 2, 0, 60, 10]], dtype=float),
        "paliers": np.array([1.0]),
        "sigma": 0.6,
        "description": (
            "Anisotropie extreme (rapport ~14:1 entre la portee maximale et "
            "les portees transverses), avec rotation autour de l'axe Y "
            "(60°) : la continuite n'existe que dans une direction tres "
            "etroite. Represente une lentille ou veine mince et allongee."
        ),
    },
    "spherique_imbrique": {
        "nom": "Modele imbrique (pepite + 2 structures)",
        "style": "VMS zone (coeur + halo)",
        "modele": np.array([
            [1, 1e-6, 1e-6, 1e-6, 0, 0, 0],
            [4, 8, 8, 8, 0, 0, 0],
            [4, 24, 24, 24, 0, 0, 0],
        ], dtype=float),
        "paliers": np.array([0.10, 0.30, 0.60]),
        "sigma": 0.6,
        "description": (
            "Modele a trois structures imbriquees : pepite (10 %), une "
            "structure a courte portee (8 blocs, 30 %) qui module un coeur "
            "a teneur elevee, et une structure a grande portee (24 blocs, "
            "60 %) qui module un halo plus diffus. Represente un gisement "
            "zone de type VMS (coeur riche entoure d'un halo)."
        ),
    },
    # Scenario utilitaire (atelier 2.1 « teneur de coupure ») : courte portee +
    # forte pepite pour des transitions riche/pauvre BIEN visibles sur un petit
    # bloc 12x8x6. Volontairement HORS de la liste pedagogique du chap. 01
    # (voir ORDRE_SCENARIOS_COVARIANCE ci-dessous).
    "bloc_cutoff_bruite": {
        "nom": "Bloc mineralise bruite",
        "style": "Atelier 2.1 (teneur de coupure)",
        "modele": np.array([
            [1, 1e-6, 1e-6, 1e-6, 0, 0, 0],
            [4, 3, 3, 3, 0, 0, 0],
        ], dtype=float),
        "paliers": np.array([0.4, 0.6]),
        "sigma": 0.7,
        "description": (
            "Courte portee (~3 blocs) avec effet de pepite (40 %) : teneurs "
            "bruitees pour mieux visualiser les transitions riche/pauvre sur "
            "un petit bloc (atelier 2.1)."
        ),
    },
}

# Ordre d'affichage suggere pour l'interface (du plus simple au plus complexe).
# Exclut les scenarios utilitaires (ex. bloc_cutoff_bruite, propre a l'atelier
# 2.1) pour ne montrer que les 8 styles pedagogiques du chapitre 01.
ORDRE_SCENARIOS_COVARIANCE: list = [
    k for k in SCENARIOS_COVARIANCE if k != "bloc_cutoff_bruite"
]


def lister_scenarios() -> list:
    """Retourne la liste des scenarios de covariance disponibles, dans l'ordre
    d'affichage suggere.

    Chaque element est un dict ``{"id", "nom", "style", "description"}``,
    directement utilisable pour construire un selecteur dans le widget JS.
    """
    out = []
    for sid in ORDRE_SCENARIOS_COVARIANCE:
        spec = SCENARIOS_COVARIANCE[sid]
        out.append({
            "id": sid,
            "nom": spec["nom"],
            "style": spec["style"],
            "description": spec["description"],
        })
    return out


def generer_block_model_covariance(
    scenario: str = "spherique_isotrope",
    nx: int = 32,
    ny: int = 32,
    nz: int = 40,
    bloc_size: float = 15.0,
    z_top: float = 3000.0,
    n_drill_holes: int = 20,
    enveloppe: bool = True,
    rng: Union[int, np.random.Generator, None] = None,
) -> BlockModelSynthetique:
    """Genere un modele de blocs 3D dont le champ de teneurs est simule par
    **FFT-MA** (:func:`geostat_polymtl.simulation_methods.GFFTMA.GFFTMA`) avec
    un modele de covariance reel (:mod:`geostat_polymtl.cov_func.covar_nu`),
    au lieu de la somme de cosinus aleatoires de
    :func:`generer_block_model_synthetique`.

    Le ``scenario`` choisit le modele de covariance (isotrope, anisotrope,
    avec pepite, avec rotation 3D, imbrique, etc.) — voir
    :data:`SCENARIOS_COVARIANCE` et :func:`lister_scenarios`. Chaque scenario
    illustre un style de gisement different (porphyrique, stratiforme, veine,
    VMS, ...), avec son propre modele de covariance.

    Le pipeline est volontairement simple, en 5 etapes :

    1. simulation du champ 3D correle par FFT-MA, avec le modele de
       covariance (portees, pepite, rotation/anisotropie) du scenario —
       c'est cette etape qui porte toute la structure spatiale ;
    2. transformation lognormale du champ standardise en teneurs
       (``teneur = exp(mu + sigma * champ)``), appliquee aux 32x32x40 blocs ;
    2b. application d'une **enveloppe ellipsoidale perturbee ("patatoide")**
       (:func:`_appliquer_enveloppe_patatoide`) : les blocs hors enveloppe
       sont marques sterile (grade = -1), ce qui donne au gisement une forme
       naturelle plutot qu'une boite cubique ;
    3. attribution de la couleur des blocs en fonction de la teneur (cote
       widget JS, via ``gradeColor``/``CLASSES``) ;
    4. generation des forages et de la topographie.

    La grille de calcul (32x32x40) reste la meme pour tous les scenarios, mais
    seuls les blocs a l'interieur de l'enveloppe (grade >= 0) sont affiches ;
    la structure spatiale du champ simule a l'etape 1 change d'un scenario a
    l'autre, et la forme de l'enveloppe change d'une graine a l'autre.

    Parameters
    ----------
    scenario : str
        Identifiant d'un scenario de :data:`SCENARIOS_COVARIANCE`.
    nx, ny, nz, bloc_size, z_top, n_drill_holes, rng
        Voir :func:`generer_block_model_synthetique`.

    Returns
    -------
    BlockModelSynthetique
        Avec les champs ``scenario``, ``style_gisement`` et ``description``
        renseignes.

    Raises
    ------
    ValueError
        Si ``scenario`` n'est pas une cle de :data:`SCENARIOS_COVARIANCE`.
    """
    if scenario not in SCENARIOS_COVARIANCE:
        raise ValueError(
            f"scenario doit etre l'un de {sorted(SCENARIOS_COVARIANCE)}, "
            f"recu {scenario!r}."
        )
    spec = SCENARIOS_COVARIANCE[scenario]

    generateur = _resolve(rng)
    seed_utilise = int(generateur.integers(0, 2**31 - 1))
    g = np.random.default_rng(seed_utilise)

    z_bot = z_top - nz * bloc_size

    GFFTMA = _importer_gfftma()

    # --- 1) Champ correle 3D simule par FFT-MA, avec le modele de covariance
    # (portees, pepite, rotation/anisotropie) du scenario : c'est cette etape
    # qui porte toute la structure spatiale du gisement. ---
    model = [[np.asarray(spec["modele"], dtype=float)]]
    c = [[np.asarray(spec["paliers"], dtype=float)]]
    nu = [[None]]
    datasim, _, _ = GFFTMA(
        model, c, nu, seed=seed_utilise, nbsimul=1,
        nx=int(nx), dx=1.0, ny=int(ny), dy=1.0, nz=int(nz), dz=1.0,
    )
    # datasim[:,0,0] est le ravel C-order d'un tableau (nx,ny,nz) ; on le
    # remet (nx,ny,nz) puis on transpose vers (nz,ny,nx) pour suivre la
    # convention de `grades` (et du flattening JS gi = iz*NX*NY + iy*NX + ix).
    champ = np.asarray(datasim[:, 0, 0], dtype=float).reshape(nx, ny, nz)
    champ = champ.transpose(2, 1, 0)  # -> (nz, ny, nx)
    champ = (champ - champ.mean()) / (champ.std() + 1e-12)

    # --- 2) Transformation lognormale : teneur = exp(mu + sigma * champ),
    # appliquee uniformement aux 32x32x40 blocs (pas d'enveloppe : la "boite"
    # affichee est toujours la grille complete, et toute la variabilite
    # spatiale -- y compris l'anisotropie -- vient du champ FFT-MA). ---
    mu = -1.2
    sigma = float(spec.get("sigma", 0.6))
    grades = np.exp(mu + sigma * champ).astype(np.float32)

    # --- 2b) Enveloppe naturelle du gisement : on restreint les teneurs a un
    # ellipsoide perturbe ("patatoide") plutot que d'afficher la boite cubique
    # complete. Les blocs hors enveloppe sont marques sterile (-1), convention
    # deja utilisee par generer_block_model_synthetique. La forme varie d'une
    # graine a l'autre (bouton "Nouveau gisement") tout en restant reproductible.
    # L'enveloppe « patatoide » est activee par defaut (ateliers 1.1/1.2). Les
    # ateliers qui ont besoin d'un cube plein (ex. 2.1, teneur de coupure)
    # passent enveloppe=False : tous les blocs gardent une teneur >= 0.
    if enveloppe:
        masque_inside = _masque_enveloppe_patatoide(nx, ny, nz, seed_utilise)
        grades = _appliquer_enveloppe_patatoide(grades, nx, ny, nz, seed_utilise,
                                                masque_inside=masque_inside)
        drill_holes = _generer_forages_enveloppe(g, masque_inside, nx, ny, nz,
                                                 bloc_size, z_top, n_drill_holes)
    else:
        drill_holes = _generer_forages(g, nx, ny, nz, bloc_size, z_top, n_drill_holes)

    # --- 3) La couleur des blocs est attribuee en fonction de la teneur
    # (gradeColor()/CLASSES, cote widget JS) — aucun post-traitement requis
    # ici puisque `grades` est deja la teneur finale de chaque bloc.

    # --- 4) Topographie. ---
    topo = _generer_topo(nx, ny, bloc_size)

    return BlockModelSynthetique(
        grades=grades,
        nx=nx, ny=ny, nz=nz,
        bloc_size=bloc_size,
        z_top=z_top, z_bot=z_bot,
        drill_holes=drill_holes,
        topo=topo,
        seed=seed_utilise,
        scenario=scenario,
        style_gisement=spec["style"],
        description=spec["description"],
    )

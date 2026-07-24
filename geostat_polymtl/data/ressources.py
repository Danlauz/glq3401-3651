"""Classification des ressources minérales (atelier C01 — Définitions de
ressources et de réserves minérales).

Fournit les briques de calcul nécessaires pour comparer deux approches de
classification des blocs d'un modèle de blocs synthétique (voir
:mod:`geostat_polymtl.data.blockmodel`) en catégories Mesuré / Indiqué /
Inféré / Non classé :

- un **critère simple**, géométrique, fondé sur le nombre de composites de
  forage présents dans chaque secteur (quadrant en 2D, octant en 3D) autour
  d'un bloc, à l'intérieur d'un rayon de recherche ;
- un **critère plus complexe**, fondé sur l'efficacité du krigeage
  ``KE = 1 - sigma_OK^2 / sigma^2``, obtenue via
  :func:`geostat_polymtl.kriging.wrappers.krigeage_ordinaire`.

Codes de classification utilisés partout dans ce module :

==== ==================
code  catégorie
==== ==================
0     Non classé
1     Inféré
2     Indiqué
3     Mesuré
==== ==================
"""
from __future__ import annotations

from typing import Sequence

import numpy as np

__all__ = [
    "NOMS_CLASSES",
    "echantillonner_forages",
    "compter_voisins_par_secteur",
    "classifier_par_secteurs",
    "classifier_par_passe_estimation",
    "structures_2d_depuis_scenario",
    "structures_3d_depuis_scenario",
    "classifier_par_efficacite_krigeage",
]

NOMS_CLASSES = {0: "Non classé", 1: "Inféré", 2: "Indiqué", 3: "Mesuré"}


def echantillonner_forages(drill_holes, grades, nx, ny, nz, bloc_size, z_top,
                            pas=1.0):
    """Échantillonne le champ de teneurs ``grades`` (forme ``(nz, ny, nx)``)
    le long de chaque forage.

    Parameters
    ----------
    drill_holes : sequence of (x0, y0, z0, ddx, ddy, depth)
        Géométrie des forages, telle que produite par
        :func:`geostat_polymtl.data.blockmodel.generer_block_model_synthetique`
        / :func:`generer_block_model_covariance` (segment de ``(x0,y0,z0)``
        à ``(x0+ddx, y0+ddy, z0-depth)``).
    grades : array (nz, ny, nx)
        Teneurs du modèle de blocs. Pour
        :func:`geostat_polymtl.data.blockmodel.generer_block_model_covariance`,
        toujours >= 0 (pas d'enveloppe). Le générateur historique
        (:func:`geostat_polymtl.data.blockmodel.generer_block_model_synthetique`)
        utilise -1 pour les blocs hors enveloppe (stérile).
    nx, ny, nz : int
        Dimensions du modèle de blocs.
    bloc_size : float
        Taille des blocs (m).
    z_top : float
        Élévation du sommet du modèle.
    pas : float
        Pas d'échantillonnage le long du forage (m).

    Returns
    -------
    np.ndarray, shape (N, 4)
        Colonnes ``x, y, z, teneur`` pour chaque composite valide
        (teneur >= 0) tombant dans le modèle de blocs.
    """
    grades = np.asarray(grades, dtype=float)
    pts = []
    for dh in drill_holes:
        x0, y0, z0, ddx, ddy, depth = (float(v) for v in dh)
        if depth <= 0:
            continue
        n = max(1, int(round(depth / float(pas))))
        for k in range(n + 1):
            t = k / n
            x = x0 + t * ddx
            y = y0 + t * ddy
            z = z0 - t * depth
            ix = int(x // bloc_size)
            iy = int(y // bloc_size)
            iz = int((z_top - z) // bloc_size)
            if 0 <= ix < nx and 0 <= iy < ny and 0 <= iz < nz:
                g = grades[iz, iy, ix]
                if g >= 0:
                    pts.append((x, y, z, float(g)))
    if not pts:
        return np.zeros((0, 4), dtype=float)
    return np.asarray(pts, dtype=float)


def compter_voisins_par_secteur(centre, points, rayon):
    """Compte les points dans chaque secteur autour de ``centre``.

    Le nombre de dimensions ``d`` est déduit de ``centre`` (2 -> quadrants,
    4 secteurs ; 3 -> octants, 8 secteurs).

    Parameters
    ----------
    centre : array-like, shape (d,)
    points : array-like, shape (N, >=d)
        Seules les ``d`` premières colonnes sont utilisées.
    rayon : float
        Rayon de recherche (mêmes unités que les coordonnées).

    Returns
    -------
    np.ndarray, shape (2**d,)
        Nombre de points par secteur, dans un rayon ``rayon``.
    """
    centre = np.atleast_1d(np.asarray(centre, dtype=float))
    d = centre.shape[0]
    pts = np.atleast_2d(np.asarray(points, dtype=float))
    if pts.size == 0:
        return np.zeros(2 ** d, dtype=int)
    pts = pts[:, :d]

    delta = pts - centre
    dist = np.linalg.norm(delta, axis=1)
    dans_rayon = dist <= float(rayon)

    n_secteurs = 2 ** d
    counts = np.zeros(n_secteurs, dtype=int)
    if not np.any(dans_rayon):
        return counts

    delta = delta[dans_rayon]
    bits = (delta >= 0).astype(int)
    poids = (2 ** np.arange(d)).reshape(1, d)
    codes = (bits * poids).sum(axis=1)
    for s in range(n_secteurs):
        counts[s] = int(np.sum(codes == s))
    return counts


def classifier_par_secteurs(centres_blocs, points, rayon,
                             seuils=(3, 2, 1), secteurs_requis=None):
    """Critère simple : classification d'après le nombre de composites par
    secteur (quadrant ou octant) autour de chaque bloc.

    Parameters
    ----------
    centres_blocs : array-like, shape (M, d)
        Centres des blocs à classifier (``d`` = 2 ou 3).
    points : array-like, shape (N, >=d)
        Composites de forage (ex. sortie de :func:`echantillonner_forages`).
    rayon : float
        Rayon de recherche.
    seuils : (n_mesure, n_indique, n_infere)
        Nombre minimal de composites requis dans un secteur pour que ce
        secteur compte comme « occupé » pour chaque catégorie.
    secteurs_requis : (s_mesure, s_indique, s_infere), optional
        Nombre de secteurs occupés requis pour chaque catégorie. Par défaut
        ``(2**d, 2**(d-1), 1)`` — c.-à-d. Mesuré = tous les secteurs occupés,
        Indiqué = au moins la moitié, Inféré = au moins un.

    Returns
    -------
    np.ndarray of int, shape (M,)
        Codes de classification (voir :data:`NOMS_CLASSES`).
    """
    centres = np.atleast_2d(np.asarray(centres_blocs, dtype=float))
    d = centres.shape[1]
    if secteurs_requis is None:
        secteurs_requis = (2 ** d, 2 ** (d - 1), 1)
    n_mes, n_ind, n_inf = seuils
    s_mes, s_ind, s_inf = secteurs_requis

    codes = np.zeros(centres.shape[0], dtype=int)
    for i, c in enumerate(centres):
        counts = compter_voisins_par_secteur(c, points, rayon)
        if np.sum(counts >= n_mes) >= s_mes:
            codes[i] = 3
        elif np.sum(counts >= n_ind) >= s_ind:
            codes[i] = 2
        elif np.sum(counts >= n_inf) >= s_inf:
            codes[i] = 1
        else:
            codes[i] = 0
    return codes


def classifier_par_passe_estimation(centres_blocs, points, x, secteurs_requis=None):
    """Critère simple à deux passes emboîtées : classification d'après le
    nombre de secteurs (octants en 3D, quadrants en 2D) contenant au moins un
    composite de forage, évalué à deux distances de recherche ``x`` et
    ``2 x``.

    Cette variante illustre directement l'effet de la **construction de la
    passe d'estimation** (taille du voisinage de recherche) sur la
    classification : une passe étroite (rayon ``x``) est requise pour la
    catégorie *Mesuré*, tandis qu'une passe deux fois plus large (rayon
    ``2 x``) suffit pour *Indiqué*/*Inféré*.

    Règle (par défaut, ``d`` = nombre de dimensions de ``centres_blocs``,
    ``n_secteurs = 2**d``) :

    - **Mesuré** : tous les secteurs (``n_secteurs``) contiennent au moins un
      composite dans un rayon ``x`` (passe serrée, couverture complète).
    - **Indiqué** : au moins ``ceil(0.625 * n_secteurs)`` secteurs (ex. 5/8 en
      3D) contiennent au moins un composite dans un rayon ``2 x``.
    - **Inféré** : au moins un secteur contient un composite dans un rayon
      ``2 x``.
    - **Non classé** : sinon.

    Parameters
    ----------
    centres_blocs : array-like, shape (M, d)
        Centres des blocs à classifier (``d`` = 2 ou 3 ; ``d`` = 3 pour
        l'atelier 3D, soit des octants).
    points : array-like, shape (N, >=d)
        Composites de forage (ex. sortie de :func:`echantillonner_forages`).
    x : float
        Distance de recherche « serrée » (passe d'estimation). La passe
        « large » utilisée pour *Indiqué*/*Inféré* est ``2 * x``.
    secteurs_requis : (s_mesure, s_indique, s_infere), optional
        Nombre de secteurs occupés requis pour chaque catégorie. Par défaut
        ``(2**d, ceil(0.625 * 2**d), 1)`` — pour des octants (d=3) :
        ``(8, 5, 1)``.

    Returns
    -------
    np.ndarray of int, shape (M,)
        Codes de classification (voir :data:`NOMS_CLASSES`).
    """
    import math

    centres = np.atleast_2d(np.asarray(centres_blocs, dtype=float))
    d = centres.shape[1]
    n_secteurs = 2 ** d
    if secteurs_requis is None:
        secteurs_requis = (n_secteurs, math.ceil(0.625 * n_secteurs), 1)
    s_mes, s_ind, s_inf = secteurs_requis

    codes = np.zeros(centres.shape[0], dtype=int)
    for i, c in enumerate(centres):
        counts_x = compter_voisins_par_secteur(c, points, x)
        counts_2x = compter_voisins_par_secteur(c, points, 2.0 * x)
        if np.sum(counts_x >= 1) >= s_mes:
            codes[i] = 3
        elif np.sum(counts_2x >= 1) >= s_ind:
            codes[i] = 2
        elif np.sum(counts_2x >= 1) >= s_inf:
            codes[i] = 1
        else:
            codes[i] = 0
    return codes


def structures_2d_depuis_scenario(scenario, bloc_size=1.0):
    """Construit la liste ``structures`` (format
    :func:`geostat_polymtl.kriging.wrappers.krigeage_ordinaire`) en plan (xy)
    à partir d'un scénario de
    :data:`geostat_polymtl.data.blockmodel.SCENARIOS_COVARIANCE`.

    Approximation pédagogique : seules les portées en x et y et la rotation
    autour de l'axe vertical (``angz``) du modèle 3D sont conservées,
    puisque le critère complexe de l'atelier 2 est évalué sur une coupe en
    plan. Les structures sphériques ont une portée pratique identique à la
    portée interne (``portee == r``), ce qui permet une conversion directe.

    Parameters
    ----------
    scenario : str
        Identifiant d'un scénario de :data:`SCENARIOS_COVARIANCE`.
    bloc_size : float, par defaut 1.0
        Taille d'un bloc (m). Les portées des scénarios sont exprimées en
        **nombre de blocs** (le champ est simulé par FFT-MA avec ``dx=1``) ;
        ce facteur les convertit dans l'unité des coordonnées de krigeage.
        Mettre ``bloc_size`` égal à la taille de bloc (ex. 15 m) lorsque les
        composites et les centres de blocs sont fournis **en mètres** ; laisser
        ``1.0`` lorsque tout le krigeage est fait en unités de blocs.
    """
    from geostat_polymtl.data.blockmodel import SCENARIOS_COVARIANCE

    if scenario not in SCENARIOS_COVARIANCE:
        raise ValueError(
            f"scenario doit etre l'un de {sorted(SCENARIOS_COVARIANCE)}, "
            f"recu {scenario!r}."
        )
    bs = float(bloc_size)
    spec = SCENARIOS_COVARIANCE[scenario]
    structures = []
    for row, palier in zip(np.asarray(spec["modele"], dtype=float),
                            np.asarray(spec["paliers"], dtype=float)):
        type_, r1, r2, _r3, _a1, _a2, a3 = (float(v) for v in row)
        if int(type_) == 1:  # pepite
            structures.append({
                "modele": "pepite", "palier": float(palier),
                "portee": 1.0, "angle": 0.0,
            })
        else:  # spherique (type 4) — portee pratique == portee interne
            structures.append({
                "modele": "spherique", "palier": float(palier),
                "portee": [r1 * bs, r2 * bs], "angle": a3,
            })
    return structures


def structures_3d_depuis_scenario(scenario, bloc_size=1.0):
    """Construit la liste ``structures`` (format
    :func:`geostat_polymtl.kriging.wrappers.krigeage_ordinaire`) en 3D à
    partir d'un scénario de
    :data:`geostat_polymtl.data.blockmodel.SCENARIOS_COVARIANCE`.

    Approximation pédagogique : les trois portées (x, y, z) du modèle 3D sont
    conservées, mais ``krigeage_ordinaire`` n'accepte qu'un seul angle de
    rotation par structure (rotation autour de l'axe Z). Pour les scénarios
    dont le modèle est rotationné sur plusieurs axes (``spherique_anisotrope_
    complexe``, ``spherique_lentille``), seule la rotation ``angle_x`` (premier
    angle du modèle, voir :mod:`geostat_polymtl.cov_func.covar_nu`) est
    conservée — l'orientation 3D de la structure est donc approximative pour
    ces deux scénarios. Les structures sphériques ont une portée pratique
    identique à la portée interne (``portee == r``).

    Parameters
    ----------
    scenario : str
        Identifiant d'un scénario de :data:`SCENARIOS_COVARIANCE`.
    bloc_size : float, par defaut 1.0
        Taille d'un bloc (m). Les portées des scénarios sont exprimées en
        **nombre de blocs** (le champ est simulé par FFT-MA avec ``dx=1``) ;
        ce facteur les convertit dans l'unité des coordonnées de krigeage.
        Mettre ``bloc_size`` égal à la taille de bloc (ex. 15 m) lorsque les
        composites et les centres de blocs sont fournis **en mètres** ; laisser
        ``1.0`` lorsque tout le krigeage est fait en unités de blocs.

    Notes
    -----
    Sans ce facteur, le krigeage reçoit une portée en blocs (ex. 12) alors que
    les coordonnées sont en mètres (ex. espacement des forages ~30-100 m) : le
    variogramme « voit » les composites comme quasi décorrélés, la variance de
    krigeage reste proche du palier et l'efficacité de krigeage
    ``KE = 1 - sigma_OK^2 / sigma^2`` s'effondre vers 0 partout.
    """
    from geostat_polymtl.data.blockmodel import SCENARIOS_COVARIANCE

    if scenario not in SCENARIOS_COVARIANCE:
        raise ValueError(
            f"scenario doit etre l'un de {sorted(SCENARIOS_COVARIANCE)}, "
            f"recu {scenario!r}."
        )
    bs = float(bloc_size)
    spec = SCENARIOS_COVARIANCE[scenario]
    structures = []
    for row, palier in zip(np.asarray(spec["modele"], dtype=float),
                            np.asarray(spec["paliers"], dtype=float)):
        type_, r1, r2, r3, a1, _a2, _a3 = (float(v) for v in row)
        if int(type_) == 1:  # pepite
            structures.append({
                "modele": "pepite", "palier": float(palier),
                "portee": 1.0, "angle": 0.0,
            })
        else:  # spherique (type 4) — portee pratique == portee interne
            structures.append({
                "modele": "spherique", "palier": float(palier),
                "portee": [r1 * bs, r2 * bs, r3 * bs], "angle": a1,
            })
    return structures

# (fin du module)


def classifier_par_efficacite_krigeage(efficacites, seuils=(0.6, 0.2, 0.0)):
    """Critère complexe : classification d'après l'efficacité du krigeage.

    ``KE = 1 - sigma_OK^2 / sigma^2`` (voir
    :func:`geostat_polymtl.kriging.wrappers.krigeage_ordinaire`, clés
    ``'variances'`` et ``'sv'``).

    Parameters
    ----------
    efficacites : array-like
        Valeurs de KE pour chaque bloc.
    seuils : (seuil_mesure, seuil_indique, seuil_infere)
        Seuils de KE (décroissants) pour chaque catégorie.

    Returns
    -------
    np.ndarray of int
        Codes de classification (voir :data:`NOMS_CLASSES`), même forme que
        ``efficacites``.
    """
    ke = np.asarray(efficacites, dtype=float)
    seuil_mes, seuil_ind, seuil_inf = seuils
    codes = np.zeros(ke.shape, dtype=int)
    codes[ke >= seuil_inf] = 1
    codes[ke >= seuil_ind] = 2
    codes[ke >= seuil_mes] = 3
    return codes

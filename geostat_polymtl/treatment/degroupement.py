"""
Dégroupement par la méthode des cellules (cell declustering) — chap. 04.

Corrige le biais d'un échantillonnage préférentiel : le domaine est divisé en
une grille régulière, et chaque échantillon reçoit un poids inversement
proportionnel au nombre d'échantillons dans sa cellule.

Référence : Deutsch, C.V. & Journel, A.G. (1998). *GSLIB*.

Migration de ``python_code/C04TraitementStatistique/degroupement.py``.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Optional

import numpy as np
from numpy.typing import ArrayLike


@dataclass
class ResultatDegroupement:
    """Résultat du dégroupement par cellules."""
    coordonnees: np.ndarray
    valeurs: np.ndarray
    poids: np.ndarray
    taille_cellule: float
    moyenne_brute: float
    moyenne_ponderee: float
    variance_brute: float
    variance_ponderee: float


@dataclass
class ResultatOptimisation:
    """Résultat de l'optimisation de la taille de cellule."""
    taille_optimale: float
    tailles: np.ndarray
    moyennes: np.ndarray
    variances: np.ndarray


def poids_cellules(coordonnees: ArrayLike, taille_cellule: float) -> np.ndarray:
    """Poids de dégroupement par la méthode des cellules.

    Chaque échantillon reçoit un poids = 1 / (nombre d'échantillons dans sa
    cellule), puis les poids sont normalisés pour sommer à 1.

    Parameters
    ----------
    coordonnees : array-like, shape (n, d)
        Coordonnées des échantillons (2D ou 3D).
    taille_cellule : float
        Taille des cellules de la grille.

    Returns
    -------
    np.ndarray
        Poids normalisés (somme = 1).
    """
    coords = np.asarray(coordonnees, dtype=float)
    n = len(coords)

    cell_indices = np.floor(coords / taille_cellule).astype(int)

    cells: Dict[tuple, list] = {}
    for i in range(n):
        key = tuple(cell_indices[i])
        cells.setdefault(key, []).append(i)

    weights = np.zeros(n)
    for indices in cells.values():
        w = 1.0 / len(indices)
        for idx in indices:
            weights[idx] = w

    weights /= weights.sum()
    return weights


def degrouper(
    coordonnees: ArrayLike,
    valeurs: ArrayLike,
    taille_cellule: float,
) -> ResultatDegroupement:
    """Dégroupement par cellules + statistiques pondérées.

    Parameters
    ----------
    coordonnees : array-like, shape (n, 2) ou (n, 3)
    valeurs : array-like, shape (n,)
    taille_cellule : float

    Returns
    -------
    ResultatDegroupement

    Examples
    --------
    >>> import numpy as np
    >>> from geostat_polymtl.treatment.degroupement import degrouper
    >>> coords = np.array([[0,0],[1,1],[1.1,1.1],[50,50]])
    >>> vals = np.array([1.0, 5.0, 6.0, 2.0])
    >>> r = degrouper(coords, vals, taille_cellule=10)
    >>> round(r.moyenne_ponderee, 3) < round(r.moyenne_brute, 3)
    True
    """
    coords = np.asarray(coordonnees, dtype=float)
    vals = np.asarray(valeurs, dtype=float)

    w = poids_cellules(coords, taille_cellule)

    moy_brute = float(np.mean(vals))
    moy_pond = float(np.sum(w * vals))
    var_brute = float(np.var(vals))
    var_pond = float(np.sum(w * (vals - moy_pond) ** 2))

    return ResultatDegroupement(
        coordonnees=coords, valeurs=vals, poids=w,
        taille_cellule=taille_cellule,
        moyenne_brute=moy_brute, moyenne_ponderee=moy_pond,
        variance_brute=var_brute, variance_ponderee=var_pond,
    )


def optimiser_taille_cellule(
    coordonnees: ArrayLike,
    valeurs: ArrayLike,
    tailles: Optional[ArrayLike] = None,
    n_translations: int = 5,
    seed: Optional[int] = None,
) -> ResultatOptimisation:
    """Trouve la taille de cellule optimale (heuristique de Deutsch).

    Teste plusieurs tailles et retourne celle qui **minimise la moyenne
    pondérée** (la « vraie » moyenne d'un gisement suréchantillonné dans les
    zones riches est typiquement plus basse que la moyenne brute biaisée).
    Pour chaque taille, plusieurs translations aléatoires de la grille sont
    moyennées.

    Parameters
    ----------
    coordonnees : array-like, shape (n, d)
    valeurs : array-like, shape (n,)
    tailles : array-like, optional
        Tailles à tester. Si None, de 1 à emprise/2.
    n_translations : int
        Nombre de translations aléatoires par taille.
    seed : int, optional
        Graine.

    Returns
    -------
    ResultatOptimisation
    """
    coords = np.asarray(coordonnees, dtype=float)
    vals = np.asarray(valeurs, dtype=float)
    rng = np.random.default_rng(seed)

    if tailles is None:
        emprise = coords.max(axis=0) - coords.min(axis=0)
        max_cell = max(emprise) / 2
        tailles = np.arange(1, max_cell + 1, 1)
    tailles = np.asarray(tailles, dtype=float)

    moyennes = np.empty(len(tailles))
    variances = np.empty(len(tailles))

    for j, tc in enumerate(tailles):
        moy_list, var_list = [], []
        for _ in range(n_translations):
            shift = rng.uniform(0, tc, size=coords.shape[1])
            w = poids_cellules(coords + shift, tc)
            m = float(np.sum(w * vals))
            v = float(np.sum(w * (vals - m) ** 2))
            moy_list.append(m)
            var_list.append(v)
        moyennes[j] = np.mean(moy_list)
        variances[j] = np.mean(var_list)

    idx_opt = int(np.argmin(moyennes))
    return ResultatOptimisation(
        taille_optimale=float(tailles[idx_opt]),
        tailles=tailles, moyennes=moyennes, variances=variances,
    )


def diagnostic_degroupement(resultat: ResultatDegroupement) -> str:
    """Diagnostic textuel du dégroupement."""
    r = resultat
    diff = r.moyenne_brute - r.moyenne_ponderee
    pct = 100 * diff / r.moyenne_brute if r.moyenne_brute != 0 else 0
    lines = [
        f"Dégroupement — {len(r.valeurs)} échantillons, cellule = {r.taille_cellule}",
        "-" * 50,
        f"  Moyenne brute    : {r.moyenne_brute:.4f}",
        f"  Moyenne pondérée : {r.moyenne_ponderee:.4f}  (Δ = {diff:+.4f}, {pct:+.1f} %)",
        f"  Variance brute   : {r.variance_brute:.4f}",
        f"  Variance pondérée: {r.variance_ponderee:.4f}",
    ]
    if pct > 5:
        lines.append("⚠️  Biais significatif — le dégroupement corrige vers le bas.")
    elif pct < -5:
        lines.append("⚠️  Biais significatif — le dégroupement corrige vers le haut.")
    else:
        lines.append("✅  Faible impact — échantillonnage relativement homogène.")
    return "\n".join(lines)

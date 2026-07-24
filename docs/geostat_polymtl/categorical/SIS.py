"""Sequential Indicator Simulation (chap. 13).

Pour chaque pixel visite dans un ordre aleatoire, on krige les indicatrices
des K facies a partir des donnees + pixels deja simules, on construit la
CCDF locale, on echantillonne un facies selon cette distribution.

Version pedagogique : grille reguliere 2D, voisinage k-PPV.
"""
from __future__ import annotations
from typing import Sequence, Tuple
import numpy as np
from geostat_polymtl.kriging.wrappers import krigeage_ordinaire


def SIS_grille(
    proportions: Sequence[float],
    structures: Sequence[dict],
    N: int,
    seed: int = 42,
    x_cond: np.ndarray = None,
    pepite: float = 0.0,
    nk: int = 12,
) -> np.ndarray:
    """Simulation SIS sur grille N x N.

    Parameters
    ----------
    proportions : (K,) sequence
        Proportions globales des K facies.
    structures : sequence of dict
        Modele de variogramme partage pour TOUS les facies (cas pedagogique).
    N : int
        Cote de la grille.
    seed : int
    x_cond : (m, 3) array, optionnel
        Donnees conditionnelles : [x, y, facies_id].
    pepite : float
    nk : int

    Returns
    -------
    facies : (N*N,) int array
        Etiquettes 1..K rangees row-major (par ligne).
    """
    K = len(proportions)
    p = np.asarray(proportions, dtype=float)
    rng = np.random.default_rng(int(seed))

    # Indices a visiter dans un ordre aleatoire
    indices = np.arange(N * N)
    rng.shuffle(indices)

    # Carte des facies initialement vide (0 = pas simule)
    facies = np.zeros(N * N, dtype=int)

    # Conditionnement
    if x_cond is not None:
        x_cond = np.asarray(x_cond, dtype=float)
        for row in x_cond:
            x, y, fid = int(row[0]), int(row[1]), int(row[2])
            if 0 <= x < N and 0 <= y < N:
                facies[y * N + x] = fid

    # Coordonnees de tous les points
    coords_grid = np.array([[i, j] for j in range(N) for i in range(N)], dtype=float)

    for step, idx in enumerate(indices):
        if facies[idx] != 0:
            continue  # deja conditionne
        # Position cible
        cy, cx = idx // N, idx % N
        target = np.array([[cx, cy]], dtype=float)
        # Recuperer les voisins simules (facies != 0)
        deja_simu = np.where(facies != 0)[0]
        if len(deja_simu) == 0:
            # Premier point : tirer selon les proportions globales
            f = int(rng.choice(np.arange(1, K + 1), p=p))
            facies[idx] = f
            continue
        # Calculer distances et selectionner les nk plus proches
        d = np.linalg.norm(coords_grid[deja_simu] - np.array([cx, cy]), axis=1)
        order = np.argsort(d)[:int(nk)]
        n_idx = deja_simu[order]
        coords_n = coords_grid[n_idx]
        facies_n = facies[n_idx]
        # Krigeage des indicatrices : P(facies = k | voisins)
        proba = np.zeros(K)
        for k in range(1, K + 1):
            indic = (facies_n == k).astype(float)
            try:
                r = krigeage_ordinaire(coords_n, indic, target, structures, pepite=pepite)
                proba[k - 1] = max(0.0, min(1.0, r["estimations"][0]))
            except Exception:
                proba[k - 1] = p[k - 1]  # fallback : proportion globale
        # Normaliser (correction relation d'ordre simple)
        s = proba.sum()
        if s > 1e-9:
            proba /= s
        else:
            proba = p.copy()
        # Echantillonner un facies
        f = int(rng.choice(np.arange(1, K + 1), p=proba))
        facies[idx] = f

    return facies

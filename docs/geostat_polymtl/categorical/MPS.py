"""Simulation Multipoints (MPS) — version pedagogique simple.

Approche : balayage de la grille de simulation ; pour chaque pixel non
encore simule, on examine son voisinage (motif local) et on cherche dans
l'image d'entrainement (TI) les positions dont le motif local
correspond. On echantillonne le pixel central parmi les candidats.

C'est l'idée de base de ENESIM ; les algos modernes (DeeSse, IMPALA)
sont plus sophistiques (k-d trees, multi-resolution, etc.).

Note : version pedagogique ; pas optimisee pour les grandes grilles.
"""
from __future__ import annotations
from typing import Sequence
import numpy as np


def MPS_simple(
    image_entrainement: np.ndarray,
    N_sim: int,
    template_radius: int = 2,
    seed: int = 42,
    x_cond: np.ndarray = None,
    max_candidats: int = 30,
) -> np.ndarray:
    """Simulation MPS pedagogique par template matching.

    Parameters
    ----------
    image_entrainement : (H, W) int array
        Image d'entrainement contenant les categories.
    N_sim : int
        Cote de la grille de simulation (N_sim x N_sim).
    template_radius : int
        Rayon du template (motif local). Le template a (2r+1) x (2r+1) pixels.
    seed : int
    x_cond : (m, 3) array, optionnel
        Donnees [x, y, facies].
    max_candidats : int
        Nombre maximal de candidats a echantillonner.

    Returns
    -------
    facies : (N_sim*N_sim,) int array (row-major)
    """
    TI = np.asarray(image_entrainement, dtype=int)
    H, W = TI.shape
    rng = np.random.default_rng(int(seed))

    sim = np.zeros((N_sim, N_sim), dtype=int)
    if x_cond is not None:
        for row in np.asarray(x_cond):
            x, y, fid = int(row[0]), int(row[1]), int(row[2])
            if 0 <= x < N_sim and 0 <= y < N_sim:
                sim[y, x] = fid

    # Ordre aleatoire
    indices = np.array([(j, i) for j in range(N_sim) for i in range(N_sim)])
    rng.shuffle(indices)

    r = int(template_radius)
    facies_unique = np.unique(TI)
    facies_unique = facies_unique[facies_unique > 0]
    proportions_globales = {f: float((TI == f).sum() / TI.size) for f in facies_unique}

    for (cy, cx) in indices:
        if sim[cy, cx] != 0:
            continue
        # Extraire le motif local (template) de sim
        ty_min, ty_max = max(0, cy - r), min(N_sim, cy + r + 1)
        tx_min, tx_max = max(0, cx - r), min(N_sim, cx + r + 1)
        motif_sim = sim[ty_min:ty_max, tx_min:tx_max].copy()
        # Trouver dans TI les positions ou le motif correspond aux pixels simules
        candidats = []
        for ty in range(r, H - r):
            for tx in range(r, W - r):
                ti_y_min, ti_y_max = ty - (cy - ty_min), ty + (ty_max - cy)
                ti_x_min, ti_x_max = tx - (cx - tx_min), tx + (tx_max - cx)
                if (ti_y_min < 0 or ti_y_max > H or
                    ti_x_min < 0 or ti_x_max > W):
                    continue
                window = TI[ti_y_min:ti_y_max, ti_x_min:ti_x_max]
                if window.shape != motif_sim.shape:
                    continue
                # Compter les violations sur les pixels deja simules
                mask = (motif_sim != 0)
                if mask.sum() == 0:
                    # Aucun voisin simule : echantillon proportionnel
                    candidats.append(int(TI[ty, tx]))
                else:
                    match = (motif_sim[mask] == window[mask]).sum()
                    if match == mask.sum():  # tous les voisins matchent
                        candidats.append(int(TI[ty, tx]))
                if len(candidats) >= max_candidats:
                    break
            if len(candidats) >= max_candidats:
                break
        if len(candidats) > 0:
            sim[cy, cx] = int(rng.choice(candidats))
        else:
            # Fallback : echantillon selon les proportions globales
            facies_list = list(proportions_globales.keys())
            probs = np.array([proportions_globales[f] for f in facies_list])
            probs /= probs.sum()
            sim[cy, cx] = int(rng.choice(facies_list, p=probs))

    return sim.ravel()

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Génère la figure du modèle de blocs du chapitre 1 à partir de geostat_polymtl.

Figure produite **entièrement** par la librairie personnelle `geostat_polymtl`
(mêmes couleurs que l'atelier interactif 1.1). Composition pédagogique inspirée
des figures classiques de modèle de blocs minier : surface topographique en
haut, forages en éventail, corps minéralisé au-dessus d'une teneur de coupure,
axe d'élévation en mRL, légende Cu %.

Sortie : chapters/C01/images/C1_ModeleBlocs_geostat.png

Usage (depuis la racine du projet) :
    python scripts/figures/c01_modele_blocs.py
    python scripts/figures/c01_modele_blocs.py --scenario spherique_lentille --cutoff 0.3
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
from matplotlib.patches import Patch

RACINE = Path(__file__).resolve().parents[2]   # .../SiteWeb_Quarto - Claude
if str(RACINE) not in sys.path:
    sys.path.insert(0, str(RACINE))

from geostat_polymtl.data.blockmodel import (  # noqa: E402
    generer_block_model_covariance, _generer_topo,
)

# Palette identique à l'atelier 1.1 (Turbo échantillonné par classe, % Cu)
CLASSES = [
    (0.00, 0.10, "#392c8a"),
    (0.10, 0.20, "#3268e7"),
    (0.20, 0.30, "#21a5e4"),
    (0.30, 0.40, "#2ad1b4"),
    (0.40, 0.50, "#5cec77"),
    (0.50, 0.75, "#d3dd31"),
    (0.75, 1.00, "#e54c0e"),
    (1.00, 1e9,  "#7a0403"),
]


def couleur_teneur(cu: float) -> str:
    for lo, hi, hex_ in CLASSES:
        if lo <= cu < hi:
            return hex_
    return "#7a0403"


def main(scenario="spherique_isotrope", seed=42, cutoff=0.25,
         topo_on=True, elev=20, azim=-72, sortie=None):
    # --- 1) Génération du modèle par la librairie ---
    bm = generer_block_model_covariance(scenario=scenario, rng=seed)
    grades = np.asarray(bm.grades)            # (nz, ny, nx), stérile = -1
    nz, ny, nx = grades.shape
    bs = float(bm.bloc_size)
    z_top, z_bot = float(bm.z_top), float(bm.z_bot)

    # (nz,ny,nx) -> (nx,ny,nz), puis flip z pour que l'indice croisse vers le haut
    G = grades.transpose(2, 1, 0)[:, :, ::-1]
    filled = G >= float(cutoff)               # seuil de coupure (stérile exclu)

    facecolors = np.empty(G.shape, dtype=object)
    nzc = G.shape[2]
    for i in range(nx):
        for j in range(ny):
            for k in range(nzc):
                if filled[i, j, k]:
                    facecolors[i, j, k] = couleur_teneur(float(G[i, j, k]))

    # Coordonnées métriques des coins des voxels (axe z = élévation réelle)
    xc = np.linspace(0.0, nx * bs, nx + 1)
    yc = np.linspace(0.0, ny * bs, ny + 1)
    zc = np.linspace(z_bot, z_top, nz + 1)
    Xc, Yc, Zc = np.meshgrid(xc, yc, zc, indexing="ij")

    # --- 2) Figure 3D ---
    fig = plt.figure(figsize=(8.6, 6.8), dpi=220)
    ax = fig.add_subplot(111, projection="3d")

    ax.voxels(Xc, Yc, Zc, filled, facecolors=facecolors,
              edgecolors=(0.12, 0.12, 0.14, 0.30), linewidth=0.10, shade=True)

    # --- 3) Surface topographique (au-dessus du modèle) ---
    if topo_on:
        res = 32
        xs = np.linspace(-nx * bs * 0.55, nx * bs * 1.30, res)
        ys = np.linspace(-ny * bs * 0.55, ny * bs * 1.30, res)
        Xt, Yt = np.meshgrid(xs, ys)
        topo = np.asarray(bm.topo)
        if topo.shape != Xt.shape:               # repli si dimensions différentes
            topo = _generer_topo(nx, ny, bs)
        Zt = z_top + topo
        ax.plot_surface(Xt, Yt, Zt, color="#b9b4ad", alpha=0.55,
                        linewidth=0, antialiased=True, shade=True, zorder=0)

    # --- 4) Forages en éventail depuis la surface ---
    for (x0, y0, z0, ddx, ddy, depth) in bm.drill_holes:
        ax.plot([x0, x0 + ddx], [y0, y0 + ddy], [z0, z0 - depth],
                color="#1a1a1a", linewidth=0.9, alpha=0.9, zorder=6)
        ax.scatter([x0], [y0], [z0], color="#1a1a1a", s=5, zorder=7)

    # --- 5) Mise en forme (proportions, vue, axe mRL) ---
    xlim = (-0.15 * nx * bs, 1.15 * nx * bs)
    ylim = (-0.15 * ny * bs, 1.15 * ny * bs)
    zlim = (z_bot - 10.0, z_top + 80.0)
    ax.set_xlim(*xlim); ax.set_ylim(*ylim); ax.set_zlim(*zlim)
    ax.set_box_aspect((xlim[1] - xlim[0], ylim[1] - ylim[0], zlim[1] - zlim[0]))
    ax.view_init(elev=elev, azim=azim)

    zt = [z for z in range(int(z_bot), int(z_top) + 1, 200)]
    ax.set_zticks(zt)
    ax.set_zticklabels([f"{z} mRL" for z in zt], fontsize=7)
    ax.set_xlabel("X (m)", fontsize=9); ax.set_ylabel("Y (m)", fontsize=9)
    ax.set_zlabel("")
    ax.tick_params(axis="x", labelsize=7); ax.tick_params(axis="y", labelsize=7)
    ax.set_title("")

    handles = []
    for (lo, hi, h) in CLASSES[:-1]:
        handles.append(Patch(facecolor=h, edgecolor="#888", label=f"{lo:.2f}–{hi:.2f}"))
    handles.append(Patch(facecolor="#7a0403", edgecolor="#888", label="≥ 1.00"))
    handles.append(Line2D([0], [0], color="#1a1a1a", lw=1.0, marker="o",
                          markersize=3.5, label="Forage"))
    handles.append(Patch(facecolor="#b9b4ad", edgecolor="#888", alpha=0.6,
                         label="Topographie"))
    ax.legend(handles=handles, title="Cu (%)", loc="center left",
              bbox_to_anchor=(0.92, 0.5), fontsize=7, title_fontsize=8,
              framealpha=0.92)

    ax.text2D(0.02, 0.02,
              f"Blocs {bs:.0f} m × {bs:.0f} m × {bs:.0f} m  ·  affichés : Cu ≥ {cutoff:.2f} %",
              transform=ax.transAxes, fontsize=7.5, color="#333")

    fig.tight_layout()
    if sortie is None:
        sortie = str(RACINE / "chapters" / "C01" / "images" / "C1_ModeleBlocs_geostat.png")
    Path(sortie).parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(sortie, bbox_inches="tight", facecolor="white")
    inside = grades[grades >= 0]
    ore = grades[grades >= cutoff]
    print(f"[OK] {sortie}")
    print(f"     scenario={scenario} seed={bm.seed} grille={nx}x{ny}x{nz} coupure={cutoff}")
    print(f"     blocs minéralisés (>= coupure) : {ore.size} / {inside.size} dans l'enveloppe")
    print(f"     teneur intérieur : min={inside.min():.3f} med={np.median(inside):.3f} max={inside.max():.3f} %Cu")


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser(description="Figure modèle de blocs (chap. 1)")
    p.add_argument("--scenario", default="spherique_isotrope")
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--cutoff", type=float, default=0.25)
    p.add_argument("--no-topo", action="store_true")
    p.add_argument("--elev", type=float, default=20)
    p.add_argument("--azim", type=float, default=-72)
    p.add_argument("--sortie", default=None)
    a = p.parse_args()
    main(scenario=a.scenario, seed=a.seed, cutoff=a.cutoff, topo_on=not a.no_topo,
         elev=a.elev, azim=a.azim, sortie=a.sortie)

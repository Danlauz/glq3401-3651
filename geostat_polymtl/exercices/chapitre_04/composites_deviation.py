"""Composites de longueur fixe et désondage par la règle de la mi-distance.

Portage Python des générateurs MATLAB du chapitre 4 :

- ``CP1/Code_examen/4-Sondage/Q1_CompositeDeviation.m`` — régularisation des
  carottes en composites de longueur fixe, puis reconstruction de la
  trajectoire du forage par la règle de la mi-distance (point milieu) et
  calcul des coordonnées des composites + inclinaison apparente sur section.
- ``CP1/Code_examen/4-Sondage/Q3_ForageVeineDistance.m`` — distance le long
  d'un forage rectiligne jusqu'à l'intersection avec une veine (plan), et
  orientation donnant le croisement le plus rapide.

Tout le calcul délègue à :mod:`geostat_polymtl.forage` :
``composite_longueur_fixe`` (composites), ``vecteur_unitaire`` (cosinus
directeurs, équivalent de ``poletocart.m``) et ``intersection_plan_forage``
(géométrie veine–forage). Ce module n'ajoute que les paramètres de la source
et la mise en page.
"""
from __future__ import annotations

from typing import Optional, Tuple

import numpy as np

from geostat_polymtl.forage.composites import composite_longueur_fixe
from geostat_polymtl.forage.geometrie import (
    intersection_plan_forage,
    vecteur_unitaire,
)

# --- Paramètres par défaut de la source MATLAB Q1_CompositeDeviation.m -------
# Carottes analysées [début, fin, teneur]
_CAROTTES = [
    (180.0, 181.5, 0.50),
    (181.5, 184.0, 0.65),
    (184.0, 184.5, 0.72),
    (184.5, 187.3, 1.10),
    (187.3, 189.0, 0.60),
]
_COLLET = (0.0, 100.0, 55.0)            # coordonnée de départ [x, y, z]
# Orientation du forage et déviations [début, azimut, plongée]
_ORIENTATIONS = [
    (0.0, 90.0, 60.0),
    (80.0, 80.0, 55.0),
    (180.0, 70.0, 45.0),
]
_FIN = 230.0                            # fin du forage (m)
_LCOMP = 3.0                            # longueur des composites (m)
_DEBUT_CAROTTE = 180.0                  # début de la première carotte (m)
_NB_COMP = 10                           # nombre de composites à calculer
_SECTION = 90.0                         # orientation de section (E-W = 90)


def _positions_mi_distance(orientations, collet, fin):
    """Trajectoire par la règle de la mi-distance (point milieu).

    Reproduit la construction MATLAB : les segments sont placés à mi-distance
    entre déviations successives, et on cumule ``vecteur_unitaire`` × Δ.

    Returns
    -------
    (PM, vec, Pos) : profondeurs des points milieux, cosinus directeurs par
        segment, et coordonnées cartésiennes correspondantes.
    """
    ori = np.asarray(orientations, dtype=float)
    debuts = ori[:, 0]
    suivants = np.append(debuts[1:], fin)            # [80, 180, fin]
    milieux = (suivants - debuts) / 2.0 + debuts     # mi-distances
    PM = np.concatenate(([0.0], milieux, [fin]))     # profondeurs mesurées

    # Cosinus directeurs par segment (équivalent MATLAB vecUni / poletocart)
    vec = np.array([vecteur_unitaire(az, pl) for _, az, pl in ori])

    Pos = np.zeros((len(PM), 3))
    Pos[0] = np.asarray(collet, dtype=float)
    for i in range(1, len(PM) - 1):
        Pos[i] = Pos[i - 1] + vec[i - 1] * (PM[i] - PM[i - 1])
    Pos[-1] = Pos[-2] + vec[-1] * (fin - PM[-2])
    return PM, vec, Pos


def _inclinaison_apparente(PM, orientations, section):
    """Inclinaison apparente du forage sur la section (TabGraph du MATLAB).

    Pour chaque segment : longueur le long du trou ``L``, écart d'azimut à la
    section ``Δaz``, plongée ``p``. La composante visible en section est
    ``cosd(Δaz)·cosd(p)·L`` ; l'inclinaison apparente est
    ``atand( sind(p)·L / (cosd(Δaz)·cosd(p)·L) )``.
    """
    ori = np.asarray(orientations, dtype=float)
    # Longueurs des segments le long du trou : PM[1:3] mi-distances + fin
    # (MATLAB PM([2 3 5]) - PM([1 2 3]))
    L = np.array([PM[1] - PM[0], PM[2] - PM[1], PM[-1] - PM[2]])
    daz = np.abs(ori[:, 1] - section)
    plg = ori[:, 2]
    horiz = np.sin(np.deg2rad(plg)) * L              # TabGraph(:,4)
    long_proj = np.cos(np.deg2rad(plg)) * L          # TabGraph(:,5)
    visible = np.cos(np.deg2rad(daz)) * long_proj    # TabGraph(:,6)
    return np.degrees(np.arctan(horiz / visible))


def figure_composites(
    carottes=_CAROTTES,
    longueur=_LCOMP,
    couverture_min: float = 0.0,
    nb_comp: int = _NB_COMP,
    path: Optional[str] = None,
) -> Tuple["object", "object", dict]:
    """Régularise les carottes en composites de longueur fixe (Q1, partie 2).

    Reproduit la régularisation MATLAB : composites de ``longueur`` mètres
    formés à partir de la première carotte, teneur = moyenne pondérée par la
    longueur de recouvrement. Le calcul délègue à
    :func:`geostat_polymtl.forage.composite_longueur_fixe`.

    Returns
    -------
    (fig, ax, donnees)
        ``donnees`` : ``de``, ``a``, ``centre``, ``teneur``, ``longueur``.
    """
    import matplotlib.pyplot as plt

    comps = composite_longueur_fixe(carottes, longueur, couverture_min)
    comps = [c for c in comps if c.valide][:nb_comp]

    de = [c.de for c in comps]
    a = [c.a for c in comps]
    centre = [(c.de + c.a) / 2.0 for c in comps]
    teneur = [c.valeur for c in comps]
    longueurs = [c.couverture * longueur for c in comps]

    car = np.asarray(carottes, dtype=float)

    fig, ax = plt.subplots(figsize=(7.0, 4.0))
    # Carottes brutes (barres horizontales annotées de leur teneur)
    for d, f, t in car:
        ax.barh(0, f - d, left=d, height=0.6, color="0.85",
                edgecolor="k", zorder=1)
        ax.text((d + f) / 2.0, 0, f"{t:g}", ha="center", va="center",
                fontsize=8)
    # Composites (barres verticales, hauteur = teneur)
    for d, f, t in zip(de, a, teneur):
        ax.bar((d + f) / 2.0, t, width=(f - d) * 0.9, bottom=1.0,
               color="#3b6", edgecolor="k", alpha=0.85, zorder=2)
        ax.text((d + f) / 2.0, 1.0 + t + 0.03, f"{t:.3g}",
                ha="center", va="bottom", fontsize=8)
    ax.axhline(1.0, color="k", lw=0.8)
    ax.set_yticks([0, 1.0])
    ax.set_yticklabels(["Carottes", "Composites"])
    ax.set_xlabel("Profondeur le long du trou (m)")
    ax.set_title(f"Composites de {longueur:g} m (teneur pondérée)")
    ax.set_xlim(car[:, 0].min() - 1, car[:, 1].max() + 1)
    ax.grid(True, axis="x", alpha=0.3)
    fig.tight_layout()
    if path:
        fig.savefig(path, dpi=150, bbox_inches="tight")

    donnees = {"de": de, "a": a, "centre": centre,
               "teneur": teneur, "longueur": longueurs}
    return fig, ax, donnees


def figure_deviation(
    orientations=_ORIENTATIONS,
    collet=_COLLET,
    fin=_FIN,
    longueur=_LCOMP,
    debut_carotte=_DEBUT_CAROTTE,
    nb_comp: int = _NB_COMP,
    section: float = _SECTION,
    path: Optional[str] = None,
) -> Tuple["object", "object", dict]:
    """Désondage par la règle de la mi-distance + position des composites (Q1).

    Reproduit la trajectoire MATLAB (point milieu) en deux vues : plan (X-Y)
    et section verticale (X-Z). Les cosinus directeurs proviennent de
    :func:`geostat_polymtl.forage.vecteur_unitaire`. Calcule aussi les
    coordonnées (x, y, z) des centres des composites et l'inclinaison
    apparente du forage sur la section.

    Returns
    -------
    (fig, (ax_plan, ax_section), donnees)
        ``donnees`` : ``PM``, ``positions`` (trajectoire), ``composites_xyz``
        (centres 3D) et ``inclinaison_apparente`` (degrés, par segment).
    """
    import matplotlib.pyplot as plt

    ori = np.asarray(orientations, dtype=float)
    PM, vec, Pos = _positions_mi_distance(ori, collet, fin)

    # Coordonnées des centres des composites le long du dernier segment foré
    centres = debut_carotte + (np.arange(nb_comp) + 0.5) * longueur
    xyz = np.array([Pos[-2] + vec[-1] * (c - PM[-2]) for c in centres])

    incl_app = _inclinaison_apparente(PM, ori, section)

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11.0, 4.5))
    # Vue en plan (X-Y)
    ax1.plot(Pos[:, 0], Pos[:, 1], "-o", color="#234", lw=2, label="Forage")
    ax1.scatter(xyz[:, 0], xyz[:, 1], c="#e55", s=20, zorder=3,
                label="Composites")
    ax1.set_xlabel("Coord. X (m)")
    ax1.set_ylabel("Coord. Y (m)")
    ax1.set_title("Vue en plan")
    ax1.grid(True, alpha=0.3)
    ax1.legend(fontsize=8)
    ax1.text(0.97, 0.05, "E", transform=ax1.transAxes, fontsize=12)
    ax1.text(0.02, 0.95, "N", transform=ax1.transAxes, fontsize=12)
    # Vue en section (X-Z)
    ax2.plot(Pos[:, 0], Pos[:, 2], "-o", color="#234", lw=2, label="Forage")
    ax2.scatter(xyz[:, 0], xyz[:, 2], c="#e55", s=20, zorder=3,
                label="Composites")
    ax2.set_xlabel("Coord. X (m)")
    ax2.set_ylabel("Coord. Z (m)")
    ax2.set_title(f"Vue en section (orientation {section:g})")
    ax2.grid(True, alpha=0.3)
    ax2.legend(fontsize=8)
    fig.tight_layout()
    if path:
        fig.savefig(path, dpi=150, bbox_inches="tight")

    donnees = {
        "PM": PM,
        "positions": Pos,
        "composites_xyz": xyz,
        "inclinaison_apparente": incl_app,
    }
    return fig, (ax1, ax2), donnees


# --- Q3_ForageVeineDistance.m -----------------------------------------------
_VEINE_PENDAGE = (130.0, 30.0)           # vecteur pendage de la veine
_VEINE_POINT_A = (50.0, 300.0, -100.0)   # point reconnu sur la veine
_FORAGE_COLLET = (150.0, 300.0, 50.0)
_FORAGE_ORI = (240.0, 50.0)              # orientation du forage (az, plongée)


def figure_veine_forage(
    veine_pendage=_VEINE_PENDAGE,
    point_a=_VEINE_POINT_A,
    collet=_FORAGE_COLLET,
    orientation=_FORAGE_ORI,
    path: Optional[str] = None,
) -> Tuple["object", "object", dict]:
    """Distance forage–veine et croisement le plus rapide (Q3).

    Une veine (plan) de vecteur pendage ``veine_pendage`` passe par
    ``point_a``. On calcule (a) la distance le long du forage orienté selon
    ``orientation`` jusqu'à la veine, et (b) l'orientation donnant le
    croisement le plus rapide (le long de la normale) et sa distance.

    Le calcul délègue à
    :func:`geostat_polymtl.forage.intersection_plan_forage` (pôle du plan
    ``(az+180, 90-pendage)``, comme dans la source MATLAB).

    Returns
    -------
    (fig, ax, donnees)
        ``donnees`` : ``distance_orientation`` (a), ``distance_min`` et
        ``orientation_rapide`` (b), plus le résultat brut de la librairie.
    """
    import matplotlib.pyplot as plt

    af, bf = float(orientation[0]), float(orientation[1])
    # Pôle du plan de la veine (convention MATLAB : n = [vp+180, 90-pendage])
    ap = veine_pendage[0] + 180.0
    bp = 90.0 - veine_pendage[1]
    n = vecteur_unitaire(ap, bp)
    A = np.asarray(point_a, dtype=float)
    d = float(n @ A)                       # plan n·x = d passant par A

    res = intersection_plan_forage(ap, bp, af, bf, d, collet=collet)
    dist_orientation = res["t"]            # distance le long du forage donné
    dist_min = res["distance_minimale"]    # croisement le plus rapide
    # Orientation rapide = direction de la normale (vers la veine)
    s0 = np.asarray(collet, dtype=float)
    sens = np.sign(float(n @ (A - s0)))
    n_dir = sens * n
    az_rapide = np.degrees(np.arctan2(n_dir[0], n_dir[1])) % 360.0
    plg_rapide = -np.degrees(np.arcsin(np.clip(n_dir[2], -1.0, 1.0)))

    # --- Illustration 2D (projection sur le plan vertical X-Z) --------------
    pi = res["point_intersection"]
    pp = res["pied_perpendiculaire"]
    fig, ax = plt.subplots(figsize=(6.5, 5.0))
    ax.plot([s0[0]], [s0[2]], "ks", ms=8, label="Collet")
    ax.plot([A[0]], [A[2]], "g^", ms=9, label="Point A (veine)")
    ax.plot([s0[0], pi[0]], [s0[2], pi[2]], "-", color="#36c", lw=2,
            label="Forage")
    ax.plot([pi[0]], [pi[2]], "ro", ms=7, label="Intersection")
    ax.plot([s0[0], pp[0]], [s0[2], pp[2]], "--", color="#c63", lw=2,
            label="Croisement rapide")
    ax.set_xlabel("Coord. X (m)")
    ax.set_ylabel("Coord. Z (m)")
    ax.set_title("Forage et intersection avec la veine")
    ax.grid(True, alpha=0.3)
    ax.legend(fontsize=8, loc="best")
    ax.set_aspect("equal", adjustable="datalim")
    fig.tight_layout()
    if path:
        fig.savefig(path, dpi=150, bbox_inches="tight")

    donnees = {
        "distance_orientation": dist_orientation,
        "distance_min": dist_min,
        "orientation_rapide": (az_rapide, plg_rapide),
        "resultat": res,
    }
    return fig, ax, donnees

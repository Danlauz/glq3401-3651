"""Abaque de Gy — générateurs des figures de l'exercice C3-1 (gén. MATLAB).

Portage Python du code MATLAB ``3-Gy/`` (``gy.m``, ``sRelatif.m``, ``gyfig.m``,
``Q2_CalculGy.m``). On NE réimplémente PAS la formule de Gy : tout passe par
:mod:`geostat_polymtl.sampling.gy` (``ParametresGy``, ``evaluer_procedure``,
``masse_minimale``, ``tableau_procedure``) et le tracé d'abaque de
:mod:`geostat_polymtl.sampling.plotting` (``tracer_abaque_gy``).

Ce module ne contient que :

- les **paramètres** des deux énoncés du cours (Zn/sphalérite, Ni/pentlandite),
  repris de ``Q2_CalculGy.m`` ;
- la **mise en page** (titre, sauvegarde PNG, tableau récapitulatif).

Exercices visés
---------------
- **C3-1** : lecture d'abaque, nombre d'étapes broyage/sous-échantillonnage,
  écart-type relatif global, piste d'amélioration.
- **CP1-Q2 / CP2(P1)-Q2** : calcul de l'écart-type relatif global d'une
  procédure multi-étapes (mêmes outils, autres paramètres).
"""

from __future__ import annotations

from typing import Dict, Optional, Tuple

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

from geostat_polymtl.sampling.gy import (
    ParametresGy,
    evaluer_procedure,
    masse_minimale,
    tableau_procedure,
)
from geostat_polymtl.sampling.plotting import tracer_abaque_gy


# ---------------------------------------------------------------------------
# Énoncés du cours (paramètres repris de Q2_CalculGy.m)
# ---------------------------------------------------------------------------
# Chaque scénario : matériau (paramètres de Gy) + procédure d'échantillonnage
# (liste de (Me, Ml, d) en g, g, cm) + écart-type relatif cible.
SCENARIOS_GY: Dict[str, Dict] = {
    # Énoncé 1 — mine de Zn, sphalérite ZnS (Q2_CalculGy.m, descriptif 1).
    # Teneur cible 1 % Zn ; al = t_Zn / t_Zn_dans_sphalerite ; d0 = 1 mm = 0.1 cm.
    "zn_sphalerite": {
        "titre": "Zn — sphalérite (ZnS)",
        "params": ParametresGy(
            al=(1 / 100) / (65.4 / (65.4 + 32.07)),  # ~0.0149
            da=4.1,   # densité sphalérite
            dg=3.0,   # densité gangue
            d0=0.1,   # taille de libération 1 mm
            f=0.5,
            g=0.25,
        ),
        # (Me, Ml, d) — Ml = demi-carotte 5 kg, étapes du tableau de l'énoncé.
        "procedure": [
            (2000.0, 5000.0, 0.8),
            (200.0, 2000.0, 0.1),
            (15.0, 200.0, 0.01),
        ],
        "sr_desire": 0.02,
    },
    # Énoncé 2 — gisement de Ni, pentlandite (Fe,Ni)9S8 (Q2_CalculGy.m, descriptif 2).
    # ~41 % Ni dans la pentlandite ; teneur cible 1 % Ni ; d0 = 1 mm.
    "ni_pentlandite": {
        "titre": "Ni — pentlandite (Fe,Ni)9S8",
        "params": ParametresGy(
            al=(1 / 100) / 0.41,  # ~0.0244
            da=4.8,   # densité pentlandite
            dg=3.0,   # densité gangue
            d0=0.1,   # taille de libération 1 mm
            f=0.5,
            g=0.25,
        ),
        "procedure": [
            (2000.0, 5000.0, 0.8),
            (200.0, 2000.0, 0.1),
            (15.0, 200.0, 0.01),
        ],
        "sr_desire": 0.05,
    },
}


def abaque_gy_procedure(
    scenario: str = "zn_sphalerite",
    *,
    path: Optional[str] = None,
    figsize: Tuple[float, float] = (10, 8),
) -> Tuple[plt.Figure, plt.Axes, Dict]:
    """Trace l'abaque de Gy d'un énoncé avec sa procédure superposée (C3-1).

    Évalue la procédure multi-étapes (``evaluer_procedure``) puis trace
    l'abaque + le chemin échantillonnage/broyage (``tracer_abaque_gy``).

    Parameters
    ----------
    scenario : str
        Clé de :data:`SCENARIOS_GY` (``"zn_sphalerite"`` ou
        ``"ni_pentlandite"``).
    path : str, optional
        Si fourni, enregistre la figure en PNG à ce chemin.
    figsize : tuple
        Taille de la figure.

    Returns
    -------
    (fig, ax, infos) : (Figure, Axes, dict)
        ``infos`` contient ``sr_global``, ``sr_desire``, ``valide``,
        ``tableau`` (récapitulatif texte) et ``resultat`` (ResultatProcedure).
    """
    sc = SCENARIOS_GY[scenario]
    resultat = evaluer_procedure(sc["params"], sc["procedure"], sr_desire=sc["sr_desire"])

    fig = tracer_abaque_gy(sc["params"], resultat, figsize=figsize)
    ax = fig.axes[0]
    ax.set_title(
        f"Abaque de Gy — {sc['titre']} — sr_global = {resultat.sr_global * 100:.3f} %"
    )

    infos = {
        "sr_global": resultat.sr_global,
        "sr_desire": resultat.sr_desire,
        "valide": resultat.valide,
        "tableau": tableau_procedure(resultat),
        "resultat": resultat,
    }

    if path is not None:
        fig.savefig(path, dpi=150, bbox_inches="tight")
    return fig, ax, infos


def tableau_recapitulatif(scenario: str = "zn_sphalerite") -> str:
    """Renvoie le tableau récapitulatif texte d'une procédure (C3-1).

    Utilise ``tableau_procedure`` de la librairie : sr par étape, sr global,
    cible, validation.
    """
    sc = SCENARIOS_GY[scenario]
    resultat = evaluer_procedure(sc["params"], sc["procedure"], sr_desire=sc["sr_desire"])
    return tableau_procedure(resultat)


def masse_minimale_etape(
    scenario: str = "zn_sphalerite",
    *,
    ml: Optional[float] = None,
    d: Optional[float] = None,
    sr_cible: Optional[float] = None,
) -> float:
    """Masse minimale d'échantillon pour un sr cible (piste d'amélioration C3-1).

    Délègue à ``masse_minimale`` de la librairie. Par défaut, reprend le lot et
    la taille de fragments de la première étape de la procédure et le sr cible
    de l'énoncé.

    Returns
    -------
    float
        Masse minimale de l'échantillon (g).
    """
    sc = SCENARIOS_GY[scenario]
    _me0, ml0, d0 = sc["procedure"][0]
    return masse_minimale(
        sc["params"],
        ml=ml0 if ml is None else ml,
        d=d0 if d is None else d,
        sr_cible=sc["sr_desire"] if sr_cible is None else sr_cible,
    )

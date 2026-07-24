"""Densité / proportions minérales — exercice CP1-Q4 (« gén. MATLAB »).

Portage Python de ``5-MéthodeConventionnelle/Q3_Densite.m`` (et de sa fonction
``PourcentageElement``). On NE réimplémente PAS le système ``A x = b`` ni le
calcul de densité : tout passe par :mod:`geostat_polymtl.sampling.densite`
(``lister_scenarios_densite``, ``analyser_densite``, ``composition_chimique``),
qui contient déjà les quatre scénarios minéralogiques du MATLAB.

Ce module ne contient que l'**assemblage** de la matrice ``A`` à partir des
scénarios de la librairie et la **mise en page** de la figure (proportions
minérales + bilan de densité théorique/apparente).

Exercice visé
-------------
- **CP1-Q4** : construire et résoudre le système linéaire des teneurs minérales
  (chalcopyrite, bornite, galène, barite, gangue…) puis en déduire la masse
  volumique de la roche en tenant compte de la porosité.
"""

from __future__ import annotations

from typing import Dict, List, Optional, Tuple

import numpy as np
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

from geostat_polymtl.sampling.densite import (
    lister_scenarios_densite,
    analyser_densite,
    composition_chimique,  # noqa: F401  (réexporté pour usage pédagogique)
)


def _scenario(scenario_id: str) -> Dict:
    """Récupère un scénario de densité de la librairie par son identifiant."""
    for sc in lister_scenarios_densite():
        if sc["id"] == scenario_id:
            return sc
    raise KeyError(
        f"Scénario inconnu : {scenario_id!r}. "
        f"Connus : {[s['id'] for s in lister_scenarios_densite()]}"
    )


def _assembler_systeme(
    sc: Dict,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, List[str], List[str]]:
    """Assemble ``(A, b, densites, noms, elements)`` depuis un scénario librairie.

    ``A[i, j]`` = fraction massique de l'élément ``i`` dans le minéral ``j``
    (la contrainte de fermeture est ajoutée par ``analyser_densite``).
    """
    elements = sc["elements"]
    mineraux = sc["mineraux"]
    A = np.array(
        [[m["composition"][el] for m in mineraux] for el in elements], dtype=float
    )
    b = np.array([sc["analyses"][el] for el in elements], dtype=float)
    densites = np.array([m["densite"] for m in mineraux], dtype=float)
    noms = [m["nom"] for m in mineraux]
    return A, b, densites, noms, elements


def resoudre_densite(scenario_id: str = "barite") -> Dict:
    """Résout ``A x = b`` puis la densité d'un scénario CP1-Q4.

    Délègue le calcul à ``analyser_densite`` de la librairie et enrichit le
    résultat avec les noms de minéraux et les éléments analysés (pour
    l'affichage pédagogique).

    Parameters
    ----------
    scenario_id : str
        Identifiant de scénario (``"barite"``, ``"cu_zn"``, ``"cu_pb_multi"``,
        ``"pb_cu_ba"``).

    Returns
    -------
    dict
        Sortie de ``analyser_densite`` (``proportions_pct``, ``rho_theorique``,
        ``rho_apparente``, ``A``, ``b``, ``rang``, ``residu``, …) augmentée de
        ``id``, ``nom``, ``noms_mineraux``, ``elements``, ``densites``,
        ``porosite``.
    """
    sc = _scenario(scenario_id)
    A, b, densites, noms, elements = _assembler_systeme(sc)
    res = analyser_densite(A, b, densites, porosite=sc["porosite"])
    res.update(
        {
            "id": sc["id"],
            "nom": sc["nom"],
            "noms_mineraux": noms,
            "elements": elements,
            "densites": densites.tolist(),
            "porosite": sc["porosite"],
        }
    )
    return res


def figure_densite(
    scenario_id: str = "barite",
    *,
    path: Optional[str] = None,
    figsize: Tuple[float, float] = (11, 5),
) -> Tuple[plt.Figure, Tuple[plt.Axes, plt.Axes], Dict]:
    """Figure CP1-Q4 : proportions minérales (barres) + bilan de densité.

    Gauche : proportions massiques de chaque minéral (résolution ``A x = b``),
    la gangue en gris. Droite : densité théorique vs apparente (effet de la
    porosité).

    Parameters
    ----------
    scenario_id : str
        Identifiant de scénario (voir :func:`resoudre_densite`).
    path : str, optional
        Si fourni, enregistre la figure en PNG.

    Returns
    -------
    (fig, (ax1, ax2), res) : (Figure, (Axes, Axes), dict)
        ``res`` est la sortie de :func:`resoudre_densite`.
    """
    res = resoudre_densite(scenario_id)
    noms = res["noms_mineraux"]
    props = np.asarray(res["proportions_pct"], dtype=float)

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=figsize)

    couleurs = [
        "#8c8c8c" if n.lower().startswith("gangue") else "#c0392b" for n in noms
    ]
    ax1.bar(range(len(noms)), props, color=couleurs, edgecolor="black")
    ax1.set_xticks(range(len(noms)))
    ax1.set_xticklabels(noms, rotation=30, ha="right", fontsize=9)
    ax1.set_ylabel("Proportion massique (%)")
    ax1.set_title(f"Proportions minérales — {res['id']}")
    for i, p in enumerate(props):
        ax1.text(i, p + 0.8, f"{p:.1f}", ha="center", fontsize=8)
    ax1.grid(True, axis="y", linestyle="--", alpha=0.5)

    rho_th = res["rho_theorique"]
    rho_app = res["rho_apparente"]
    n = res["porosite"]
    ax2.bar(
        ["Théorique", f"Apparente\n(n={n:.0%})"],
        [rho_th, rho_app],
        color=["#2980b9", "#27ae60"],
        edgecolor="black",
        width=0.55,
    )
    ax2.set_ylabel("Masse volumique (g/cm³)")
    ax2.set_title("Densité du minerai")
    for i, v in enumerate([rho_th, rho_app]):
        ax2.text(i, v + 0.03, f"{v:.3f}", ha="center", fontsize=10)
    ax2.set_ylim(0, max(rho_th, rho_app) * 1.18)
    ax2.grid(True, axis="y", linestyle="--", alpha=0.5)

    fig.suptitle(res["nom"], fontsize=12)
    fig.tight_layout(rect=[0, 0, 1, 0.95])

    if path is not None:
        fig.savefig(path, dpi=150, bbox_inches="tight")
    return fig, (ax1, ax2), res


def lister_scenarios() -> List[Dict]:
    """Identifiants + intitulés des scénarios de densité disponibles (CP1-Q4)."""
    return [{"id": s["id"], "nom": s["nom"]} for s in lister_scenarios_densite()]

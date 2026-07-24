"""Calcul complet de l'économie de Lane — chapitre 02 (exercice CP1-Q1).

Module mince réutilisant ``geostat_polymtl.economics`` pour régénérer la figure
et les résultats numériques de l'exercice CP1-Q1 (« gén. MATLAB »),
source : ``Automne2024/Q1-Lane/Q1_CalculLane.m``.

L'exercice demande, à partir d'un jeu de paramètres donné :
  a) la teneur de coupure optimale et le profit / t. minéralisée (courbe Lane) ;
  b) xc, qc et gc à la teneur optimale (fonctions de récupération lognormales) ;
  c) les tonnes de matériau minéralisé, de minerai et le profit total annuel ;
  d) la hausse de capacité de traitement H' donnant l'équilibre mine-traitement.

Aucune mathématique du modèle n'est réimplémentée : on s'appuie sur
:func:`~geostat_polymtl.economics.courbes_profit`,
:func:`~geostat_polymtl.economics.teneurs_limites` et
:func:`~geostat_polymtl.economics.reserves.reserves_lognormale` de la librairie.
"""

from __future__ import annotations

from typing import Optional, Tuple

import matplotlib.pyplot as plt

from geostat_polymtl.economics import plotting
from geostat_polymtl.economics.economics import (
    ParametresLane,
    courbes_profit,
    tableau_recapitulatif,
)
from geostat_polymtl.economics.reserves import reserves_lognormale


# ---------------------------------------------------------------------------
# Jeu de paramètres de l'exercice CP1-Q1 (Q1_CalculLane.m)
# ---------------------------------------------------------------------------

_PARAMS_CP1Q1 = ParametresLane(
    m=1.9, y=0.85, p=2100, k=750, h=5, f=35, F=0,
    M=30, H=15, K=0.4, moyenne=0.9, variance=2, distribution="lognormale",
)


def parametres_cp1q1() -> ParametresLane:
    """Retourne les paramètres de l'exercice CP1-Q1 (copie modifiable)."""
    return ParametresLane(**_PARAMS_CP1Q1.to_dict())


# ---------------------------------------------------------------------------
# CP1-Q1 — Calcul complet
# ---------------------------------------------------------------------------

def calcul_cp1q1(params: Optional[ParametresLane] = None) -> dict:
    """Résout l'exercice CP1-Q1 (calcul complet de la solution de Lane).

    Parameters
    ----------
    params : ParametresLane, optional
        Paramètres à utiliser (défaut : ceux de l'exercice).

    Returns
    -------
    dict
        Dictionnaire de résultats :

        - ``c_opt``, ``profit_opt``, ``nature_opt`` : solution optimale (a) ;
        - ``c1``, ``c2``, ``c3`` : teneurs limites mine/concentrateur/marché ;
        - ``xc``, ``qc``, ``gc`` : fonctions de récupération à c_opt (b) ;
        - ``regime`` : facteur limitant à l'optimum ;
        - ``tonnes_minerai``, ``tonnes_mineralise``, ``profit_total`` : (c) ;
        - ``H_prime`` : capacité de traitement donnant l'équilibre
          mine-traitement (d) ;
        - ``resultat`` : l'objet ResultatLane complet.
    """
    params = params or parametres_cp1q1()
    res = courbes_profit(params)

    # (b) Fonctions de récupération à la teneur optimale
    rec = reserves_lognormale(params.moyenne, params.variance, res.c_opt)
    xc = float(rec.xc[0])
    qc = float(rec.qc[0])
    gc = float(rec.gc[0])

    # (c) Tonnages annuels et profit total — on détermine le facteur limitant.
    regime = res.nature_opt
    mine_seule = ("Mine" in regime
                  and "Concentrateur" not in regime
                  and "Marché" not in regime)
    if mine_seule:
        # Mine limitante : on développe M tonnes de minéralisé,
        # le minerai sélectionné est M·xc.
        tonnes_mineralise = params.M
        tonnes_minerai = params.M * xc
    else:
        # Concentrateur / marché limitant ou équilibre : on traite H tonnes de
        # minerai, soit H/xc tonnes de minéralisé développées.
        tonnes_minerai = params.H
        tonnes_mineralise = params.H / xc if xc > 0 else float("nan")
    profit_total = res.profit_opt * tonnes_mineralise

    # (d) Capacité de traitement donnant l'équilibre mine-traitement.
    # À la teneur limite mine c1, xc(c1) = H'/M  =>  H' = M · xc(c1).
    rec_c1 = reserves_lognormale(params.moyenne, params.variance, res.c1)
    H_prime = float(params.M * rec_c1.xc[0])

    return {
        "c_opt": res.c_opt,
        "profit_opt": res.profit_opt,
        "nature_opt": res.nature_opt,
        "c1": res.c1, "c2": res.c2, "c3": res.c3,
        "xc": xc, "qc": qc, "gc": gc,
        "regime": regime,
        "tonnes_minerai": tonnes_minerai,
        "tonnes_mineralise": tonnes_mineralise,
        "profit_total": profit_total,
        "H_prime": H_prime,
        "resultat": res,
    }


def figure_cp1q1(
    params: Optional[ParametresLane] = None,
    path: Optional[str] = None,
    figsize: Tuple[float, float] = (9, 5),
) -> Tuple[plt.Figure, plt.Axes]:
    """Figure CP1-Q1 : courbe de Lane de l'exercice de calcul complet.

    Reproduit la figure 1 de ``Q1_CalculLane.m`` (courbes mine/traitement/
    marché, teneurs limites, équilibres et optimum) en s'appuyant sur
    :func:`geostat_polymtl.economics.tracer_courbes_profit`.

    Returns
    -------
    (fig, ax)
    """
    params = params or parametres_cp1q1()
    res = courbes_profit(params)
    fig = plotting.tracer_courbes_profit(res, afficher_tableau=False)
    ax = fig.axes[0]
    ax.set_title("CP1-Q1 — Courbe de Lane (calcul complet)")
    fig.tight_layout()
    if path:
        fig.savefig(path, dpi=150, bbox_inches="tight")
    return fig, ax


def figure_cp1q1_hausse_H(
    params: Optional[ParametresLane] = None,
    path: Optional[str] = None,
    figsize: Tuple[float, float] = (9, 5),
) -> Tuple[plt.Figure, plt.Axes]:
    """Figure CP1-Q1 (d) : courbe de Lane après hausse de H à H'.

    Reproduit la figure 2 de ``Q1_CalculLane.m`` : on remplace H par
    H' = M·xc(c1) pour obtenir un équilibre mine-traitement, puis on retrace la
    courbe.

    Returns
    -------
    (fig, ax)
    """
    params = params or parametres_cp1q1()
    sol = calcul_cp1q1(params)
    p2 = ParametresLane(**params.to_dict())
    p2.H = sol["H_prime"]
    res2 = courbes_profit(p2)
    fig = plotting.tracer_courbes_profit(res2, afficher_tableau=False)
    ax = fig.axes[0]
    ax.set_title(f"CP1-Q1 (d) — Hausse à H' = {sol['H_prime']:.2f} Mt")
    fig.tight_layout()
    if path:
        fig.savefig(path, dpi=150, bbox_inches="tight")
    return fig, ax


def rapport_cp1q1(params: Optional[ParametresLane] = None) -> str:
    """Produit un rapport texte des résultats CP1-Q1 (a à d)."""
    sol = calcul_cp1q1(params)
    lignes = [
        "CP1-Q1 — Calcul complet de la solution de Lane",
        "=" * 50,
        f"(a) c_opt        = {sol['c_opt']:.3f} %   ({sol['nature_opt']})",
        f"    profit/t min = {sol['profit_opt']:.3f} $",
        f"(b) xc = {sol['xc']:.4f} ; qc = {sol['qc']:.4f} ; gc = {sol['gc']:.4f}",
        f"(c) tonnes minerai      = {sol['tonnes_minerai']:.3f} Mt",
        f"    tonnes minéralisé   = {sol['tonnes_mineralise']:.3f} Mt",
        f"    profit total annuel = {sol['profit_total']:.3f} M$",
        f"(d) H' (équilibre mine-traitement) = {sol['H_prime']:.3f} Mt",
        "",
        tableau_recapitulatif(sol["resultat"]),
    ]
    return "\n".join(lignes)

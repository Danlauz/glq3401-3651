"""
Modèle économique de Lane et Taylor pour la teneur de coupure optimale.

Ce module implémente le calcul des teneurs limites, des teneurs d'équilibre,
des courbes de profit et de la teneur de coupure optimale selon le modèle
de Lane (1988) et Taylor.

Référence : Lane, K.F. (1988). *The Economic Definition of Ore*.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional, Tuple

import numpy as np

from .reserves import reserves, ReserveResult


# ---------------------------------------------------------------------------
# Paramètres du modèle
# ---------------------------------------------------------------------------

@dataclass
class ParametresLane:
    """Paramètres économiques et géologiques du modèle de Lane et Taylor.

    Attributes
    ----------
    m : float
        Coût variable de minage par tonne de matériau minéralisé ($/t).
    y : float
        Taux de récupération métallurgique (entre 0 et 1).
    p : float
        Prix de vente d'une tonne de métal ($/t métal).
    k : float
        Coût de mise en marché (fonderie, transport, etc.) par tonne de métal ($/t).
    h : float
        Coût variable de traitement par tonne de minerai ($/t).
    f : float
        Frais fixes annuels (administration, ingénierie, capital, etc.) ($/an).
    F : float
        Coût d'opportunité annuel ($/an).
    M : float
        Capacité annuelle de minage — matériau minéralisé (Mt/an).
    H : float
        Capacité annuelle de traitement — minerai sélectionné (Mt/an).
    K : float
        Capacité annuelle du marché — métal (Mt métal/an).
    moyenne : float
        Moyenne des teneurs du gisement (%).
    variance : float
        Variance des teneurs du gisement (%)².
    distribution : str
        Type de distribution des teneurs ('lognormale' ou 'normale').
    """

    m: float = 1.3
    y: float = 0.9
    p: float = 1700.0
    k: float = 500.0
    h: float = 3.0
    f: float = 20.0
    F: float = 0.0
    M: float = 24.0
    H: float = 14.0
    K: float = 0.22
    moyenne: float = 1.3
    variance: float = 3.0
    distribution: str = "lognormale"

    def to_dict(self) -> dict:
        """Retourne les paramètres sous forme de dictionnaire."""
        return {k: getattr(self, k) for k in self.__dataclass_fields__}


# ---------------------------------------------------------------------------
# Résultats
# ---------------------------------------------------------------------------

@dataclass
class TeneurEquilibre:
    """Une teneur d'équilibre entre deux courbes de profit.

    Attributes
    ----------
    teneur : float
        Teneur de coupure à l'équilibre (%).
    profit : float
        Profit associé ($/t minéralisée).
    courbes : Tuple[str, str]
        Noms des deux courbes qui se croisent.
    label : str
        Étiquette courte (ex. 'c12', 'c13', 'c23').
    """

    teneur: float
    profit: float
    courbes: Tuple[str, str]
    label: str


@dataclass
class ResultatLane:
    """Résultat complet de l'analyse de Lane et Taylor.

    Attributes
    ----------
    cc : np.ndarray
        Grille de teneurs de coupure évaluées.
    v_mine : np.ndarray
        Profit sous contrainte de capacité de minage.
    v_concentrateur : np.ndarray
        Profit sous contrainte de capacité de traitement.
    v_marche : np.ndarray
        Profit sous contrainte de capacité du marché.
    c1 : float
        Teneur limite mine (%).
    c2 : float
        Teneur limite concentrateur (%).
    c3 : float
        Teneur limite marché (%).
    equilibres : List[TeneurEquilibre]
        Teneurs d'équilibre détectées.
    c_opt : float
        Teneur de coupure optimale (%).
    profit_opt : float
        Profit optimal ($/t minéralisée).
    nature_opt : str
        Nature de la teneur optimale (limite ou équilibre).
    reserves : ReserveResult
        Résultat des réserves sur la grille cc.
    """

    cc: np.ndarray
    v_mine: np.ndarray
    v_concentrateur: np.ndarray
    v_marche: np.ndarray
    c1: float
    c2: float
    c3: float
    equilibres: List[TeneurEquilibre]
    c_opt: float
    profit_opt: float
    nature_opt: str
    reserves: ReserveResult


# ---------------------------------------------------------------------------
# Fonctions de calcul
# ---------------------------------------------------------------------------

def teneurs_limites(params: ParametresLane) -> Tuple[float, float, float]:
    """Calcule les trois teneurs limites de Lane.

    Parameters
    ----------
    params : ParametresLane
        Paramètres du modèle.

    Returns
    -------
    c1, c2, c3 : float
        Teneurs limites mine, concentrateur et marché (%).
    """
    y, p, k, h = params.y, params.p, params.k, params.h
    f, F = params.f, params.F
    H, K = params.H, params.K

    c1 = h / (y * (p - k)) * 100.0
    c2 = (h + (f + F) / H) / ((p - k) * y) * 100.0
    c3 = h / ((p - k) - (f + F) / K) / y * 100.0

    return c1, c2, c3


def courbes_profit(
    params: ParametresLane,
    cc: Optional[np.ndarray] = None,
    n_points: int = 5000,
) -> ResultatLane:
    """Calcule les courbes de profit et identifie la teneur optimale.

    Parameters
    ----------
    params : ParametresLane
        Paramètres du modèle.
    cc : np.ndarray, optional
        Grille de teneurs de coupure. Si None, une grille automatique est
        générée entre 0 et ``moyenne + 0.5 × √variance``.
    n_points : int
        Nombre de points dans la grille automatique (défaut : 5000).

    Returns
    -------
    ResultatLane
        Résultat complet incluant courbes, limites, équilibres et optimum.

    Examples
    --------
    >>> from lane_taylor.economics import ParametresLane, courbes_profit
    >>> params = ParametresLane(p=1700, k=500, h=3, m=1.3, y=0.9)
    >>> resultat = courbes_profit(params)
    >>> print(f"Teneur optimale : {resultat.c_opt:.2f} %")
    """
    # Teneurs limites
    c1, c2, c3 = teneurs_limites(params)

    # Grille de teneurs de coupure
    cmax = params.moyenne + 0.5 * np.sqrt(params.variance)
    if cc is None:
        cc = np.linspace(1e-5, cmax, n_points)
    cc = np.unique(np.concatenate([cc, [c1, c2, c3]]))

    # Calcul des réserves
    res = reserves(params.moyenne, params.variance, cc, params.distribution)
    xc, gc = res.xc, res.gc

    # Quantité de métal récupérable par tonne minéralisée (% → fraction)
    xc_gc_y = xc * gc * params.y / 100.0

    # Trois courbes de profit ($/t minéralisée)
    m, y, p, k, h = params.m, params.y, params.p, params.k, params.h
    f, F = params.f, params.F
    M, H, K = params.M, params.H, params.K

    v1 = (p - k) * xc_gc_y - xc * h - m - (f + F) / M         # Mine
    v2 = (p - k) * xc_gc_y - xc * h - m - (f + F) * xc / H    # Concentrateur
    v3 = (p - k) * xc_gc_y - xc * h - m - (f + F) * xc_gc_y / K  # Marché

    # Équilibres
    equilibres = _detecter_equilibres(cc, v1, v2, v3)

    # Teneur optimale = max du min des trois courbes
    v_min = np.minimum(np.minimum(v1, v2), v3)
    idx_opt = int(np.argmax(v_min))
    c_opt_brut = cc[idx_opt]
    profit_opt = v_min[idx_opt]

    # Rapprocher l'optimum de la teneur limite ou d'équilibre la plus proche
    candidats_teneurs = [c1, c2, c3] + [eq.teneur for eq in equilibres]
    candidats_labels = [
        "Mine (limite)", "Concentrateur (limite)", "Marché (limite)",
    ] + [
        f"{eq.courbes[0]}–{eq.courbes[1]} (équilibre)" for eq in equilibres
    ]

    if candidats_teneurs:
        t_arr = np.array(candidats_teneurs)
        i_closest = int(np.argmin(np.abs(c_opt_brut - t_arr)))
        c_opt = float(t_arr[i_closest])
        nature_opt = candidats_labels[i_closest]
        # Recalculer le profit au c_opt snappé
        idx_snap = int(np.argmin(np.abs(cc - c_opt)))
        profit_opt = float(v_min[idx_snap])
    else:
        c_opt = float(c_opt_brut)
        nature_opt = "indéterminé"

    return ResultatLane(
        cc=cc,
        v_mine=v1,
        v_concentrateur=v2,
        v_marche=v3,
        c1=c1,
        c2=c2,
        c3=c3,
        equilibres=equilibres,
        c_opt=c_opt,
        profit_opt=profit_opt,
        nature_opt=nature_opt,
        reserves=res,
    )


def _detecter_equilibres(
    cc: np.ndarray,
    v1: np.ndarray,
    v2: np.ndarray,
    v3: np.ndarray,
) -> List[TeneurEquilibre]:
    """Détecte les teneurs d'équilibre (intersections des courbes de profit)."""
    equilibres: List[TeneurEquilibre] = []
    paires = [
        (v1, v2, ("Mine", "Concentrateur"), "c12"),
        (v1, v3, ("Mine", "Marché"), "c13"),
        (v2, v3, ("Concentrateur", "Marché"), "c23"),
    ]
    for vA, vB, noms, label in paires:
        diff = np.abs(vA - vB)
        idx = int(np.argmin(diff))
        seuil = 10.0 * np.max(np.abs(np.diff(v1)))
        if diff[idx] < seuil:
            equilibres.append(TeneurEquilibre(
                teneur=cc[idx],
                profit=vA[idx],
                courbes=noms,
                label=label,
            ))
    return equilibres


# ---------------------------------------------------------------------------
# Tableau récapitulatif
# ---------------------------------------------------------------------------

def tableau_recapitulatif(resultat: ResultatLane) -> str:
    """Produit un tableau récapitulatif en texte des résultats.

    Parameters
    ----------
    resultat : ResultatLane
        Résultat retourné par :func:`courbes_profit`.

    Returns
    -------
    str
        Tableau formaté.
    """
    rows = [
        ("Optimale", f"{resultat.c_opt:.2f} %",
         f"{resultat.profit_opt:.2f} $", resultat.nature_opt),
        ("Limite C1", f"{resultat.c1:.2f} %",
         f"{resultat.v_mine.max():.2f} $", "Mine"),
        ("Limite C2", f"{resultat.c2:.2f} %",
         f"{resultat.v_concentrateur.max():.2f} $", "Concentrateur"),
        ("Limite C3", f"{resultat.c3:.2f} %",
         f"{resultat.v_marche.max():.2f} $", "Marché"),
    ]
    pairs_labels = [
        ("Équilibre C1–C2",),
        ("Équilibre C1–C3",),
        ("Équilibre C2–C3",),
    ]
    for i, eq in enumerate(resultat.equilibres):
        lbl = pairs_labels[i][0] if i < len(pairs_labels) else eq.label
        rows.append((lbl, f"{eq.teneur:.2f} %", f"{eq.profit:.2f} $",
                      f"{eq.courbes[0]}–{eq.courbes[1]}"))

    # Formatage simple
    header = f"{'Type':<22s} {'Teneur':<12s} {'Profit':<14s} {'Remarque'}"
    sep = "-" * len(header)
    lines = [header, sep]
    for row in rows:
        lines.append(f"{row[0]:<22s} {row[1]:<12s} {row[2]:<14s} {row[3]}")
    return "\n".join(lines)


def tableau_recapitulatif_df(resultat: ResultatLane):
    """Produit un tableau récapitulatif sous forme de DataFrame pandas.

    Parameters
    ----------
    resultat : ResultatLane
        Résultat retourné par :func:`courbes_profit`.

    Returns
    -------
    pandas.DataFrame
        Tableau avec colonnes : Type, Teneur (%), Profit ($), Remarque.

    Raises
    ------
    ImportError
        Si pandas n'est pas installé.
    """
    try:
        import pandas as pd
    except ImportError as e:
        raise ImportError("pandas est requis pour tableau_recapitulatif_df()") from e

    rows = [
        ["Optimale", resultat.c_opt, resultat.profit_opt, resultat.nature_opt],
        ["Limite C1", resultat.c1, float(resultat.v_mine.max()), "Mine"],
        ["Limite C2", resultat.c2, float(resultat.v_concentrateur.max()), "Concentrateur"],
        ["Limite C3", resultat.c3, float(resultat.v_marche.max()), "Marché"],
    ]
    pairs_labels = ["Équilibre C1–C2", "Équilibre C1–C3", "Équilibre C2–C3"]
    for i, eq in enumerate(resultat.equilibres):
        lbl = pairs_labels[i] if i < len(pairs_labels) else eq.label
        rows.append([lbl, eq.teneur, eq.profit,
                     f"{eq.courbes[0]}–{eq.courbes[1]}"])

    return pd.DataFrame(rows, columns=["Type", "Teneur (%)", "Profit ($)", "Remarque"])

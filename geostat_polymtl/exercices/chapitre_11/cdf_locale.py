"""Reconstruction et correction de la CDF locale par krigeage d'indicatrices.

Portage Python des exemples du chapitre 11 :

- Reconstruction de la CDF locale par KI (section 11-02, @fig-C11_KI) : quatre
  données en rectangle, cible au centre, sept seuils. Le KI donne, seuil par
  seuil, une approximation discrète de la fonction de répartition
  conditionnelle ``F_KI(x0, z_c)``.
- Correction des relations d'ordre (section 11-03, @fig-C11_RelationOrdre_Correction) :
  une CDF brute non monotone et hors [0, 1] est corrigée par la moyenne des
  balayages croissant/décroissant.
- Cas des données d'inégalité / souples (section 11-06, @fig-C11_SoftKriging) :
  profil en coupe du toit d'un réservoir ; un forage abandonné à la profondeur
  ``d`` fournit l'inégalité ``Z > d`` (indicatrices = 0 pour les seuils ≤ ``d``
  seulement). Le KI respecte la contrainte, le KO peut la violer.

Réutilisation librairie
-----------------------
- :func:`geostat_polymtl.kriging.indicator.coder_indicatrices`,
  :func:`...krigeage_indicatrices` (KI seuil par seuil),
  :func:`...corriger_relation_ordre`,
  :func:`...violations_relation_ordre`,
  :func:`...mediane_locale`.
- :func:`geostat_polymtl.kriging.wrappers.krigeage_ordinaire` (KO de référence
  pour le cas d'inégalité, et moteur du KI seuil par seuil).

AUCUNE mathématique de krigeage, de codage ou de correction n'est
réimplémentée : ces modules ne font que fournir les paramètres des sources et
la mise en page.
"""
from __future__ import annotations

from typing import Dict, Optional, Sequence, Tuple

import numpy as np

from geostat_polymtl.kriging.indicator import (
    coder_indicatrices,
    krigeage_indicatrices,
    corriger_relation_ordre,
    violations_relation_ordre,
    mediane_locale,
)
from geostat_polymtl.kriging.wrappers import krigeage_ordinaire


# ===========================================================================
# 1. Reconstruction de la CDF locale par KI (section 11-02, fig-C11_KI)
# ===========================================================================
# Quatre données en rectangle autour de la cible x0 (au centre). Par symétrie
# le KO donne lambda_i = 1/4 à tout seuil : le KI se réduit à la moyenne des
# indicatrices. On vérifie ce résultat analytique avec le KI de la librairie
# (krigeage_indicatrices) sur le même rectangle.
DONNEES_KI = {
    "coords": np.array([[0.0, 1.0],     # x1 (haut gauche)
                        [1.0, 1.0],      # x2 (haut droit)
                        [0.0, 0.0],      # x3 (bas gauche)
                        [1.0, 0.0]]),    # x4 (bas droit)
    "valeurs": np.array([2.2, 5.1, 6.4, 4.7]),   # Z1..Z4
    "cible": np.array([[0.5, 0.5]]),              # x0 au centre
    "seuils": np.array([1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0]),
}


def cdf_locale_ki(
    coords: Optional[np.ndarray] = None,
    valeurs: Optional[np.ndarray] = None,
    cible: Optional[np.ndarray] = None,
    seuils: Optional[Sequence[float]] = None,
) -> Dict:
    """Reconstruction de la CDF locale par KI au point central (fig-C11_KI).

    Réutilise :func:`krigeage_indicatrices` (KI seuil par seuil, modèle de
    variogramme commun « médiane-ki »). Comme la configuration est symétrique,
    les poids valent 1/4 et l'estimation coïncide avec la moyenne des
    indicatrices, c.-à-d. la table de l'énoncé.

    Returns
    -------
    dict :
      'seuils'         : (K,) seuils z_c
      'indicatrices'   : (4, K) indicatrices des données
      'cdf_ki'         : (K,) F_KI(x0, z_c) estimée par KI
      'cdf_analytique' : (K,) moyenne des indicatrices (résultat de l'énoncé)
    """
    if coords is None:
        coords = DONNEES_KI["coords"]
        valeurs = DONNEES_KI["valeurs"]
        cible = DONNEES_KI["cible"]
        seuils = DONNEES_KI["seuils"]
    seuils = np.asarray(seuils, dtype=float)
    ind = coder_indicatrices(valeurs, seuils)           # (4, K)
    cdf_analytique = ind.mean(axis=0)                   # lambda_i = 1/4

    # KI seuil par seuil : un modèle de variogramme commun (médiane-ki). Le
    # choix du modèle n'influence pas le résultat ici (symétrie -> 1/4), mais on
    # passe par la primitive de la librairie pour ne rien réimplémenter.
    structures = [[{"modele": "spherique", "palier": 1.0, "portee": 1.0}]] * len(seuils)
    cdf_ki = krigeage_indicatrices(
        coords, valeurs, cible, seuils, structures,
    )[0]                                                 # (K,)
    return {
        "seuils": seuils,
        "indicatrices": ind,
        "cdf_ki": cdf_ki,
        "cdf_analytique": cdf_analytique,
    }


def figure_cdf_locale_ki(path: Optional[str] = None) -> Tuple["object", "object", Dict]:
    """Figure C11_KI : CDF locale reconstruite par KI au point central.

    Trace la fonction de répartition conditionnelle ``F_KI(x0, z_c)`` en
    escalier (les sept seuils de l'énoncé). Réutilise :func:`cdf_locale_ki`.
    """
    import matplotlib.pyplot as plt

    res = cdf_locale_ki()
    z = res["seuils"]
    F = res["cdf_analytique"]

    fig, ax = plt.subplots(figsize=(6.0, 4.2))
    ax.step(z, F, where="post", color="k", linewidth=2)
    ax.plot(z, F, "ok", markersize=6)
    ax.set_xlabel(r"$z_c$", fontsize=12)
    ax.set_ylabel(r"$F_{KI}(\mathbf{x}_0,\, z_c)$", fontsize=12)
    ax.set_ylim(-0.05, 1.05)
    ax.set_xlim(z[0] - 0.3, z[-1] + 0.3)
    ax.grid(True, alpha=0.4)
    fig.tight_layout()
    if path:
        fig.savefig(path, dpi=150, bbox_inches="tight")
    return fig, ax, res


# ===========================================================================
# 2. Correction des relations d'ordre (section 11-03, fig-C11_RelationOrdre_Correction)
# ===========================================================================
# CDF brute non monotone et hors-bornes de l'énoncé (tableau 11-03).
SEUILS_ORDRE = np.array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], dtype=float)
CDF_BRUTE_ORDRE = np.array(
    [0.00, 0.13, 0.24, 0.238, 0.234, 0.237, 0.53, 0.79, 0.77, 1.00]
)


def correction_relation_ordre(
    cdf_brute: Optional[np.ndarray] = None,
) -> Dict:
    """Correction de la relation d'ordre par moyenne des balayages.

    Réutilise :func:`corriger_relation_ordre` (méthode « moyenne » = moyenne
    des balayages montant et descendant, Soares 1992) et
    :func:`violations_relation_ordre` pour le décompte. Expose aussi les
    balayages avant/arrière séparés (pour le tracé), dérivés de l'écrêtage
    [0, 1] suivi d'un cumul monotone — même logique que la primitive.

    Returns
    -------
    dict :
      'seuils', 'cdf_brute', 'cdf_avant', 'cdf_arriere', 'cdf_corrigee',
      'violations'
    """
    if cdf_brute is None:
        cdf_brute = CDF_BRUTE_ORDRE
    cdf_brute = np.asarray(cdf_brute, dtype=float).reshape(1, -1)

    # Décompte des violations (primitive librairie)
    viol = violations_relation_ordre(cdf_brute)

    # Correction finale = moyenne des deux balayages (primitive librairie)
    cdf_corrigee = corriger_relation_ordre(cdf_brute, methode="moyenne")[0]

    # Balayages individuels pour le tracé : écrêtage [0, 1] puis cumul monotone.
    base = np.clip(cdf_brute[0], 0.0, 1.0)
    avant = np.maximum.accumulate(base)                       # montée (avant)
    arriere = np.minimum.accumulate(base[::-1])[::-1]         # descente (arrière)

    if cdf_brute.shape[1] == len(SEUILS_ORDRE):
        seuils = SEUILS_ORDRE
    else:
        seuils = np.arange(1, cdf_brute.shape[1] + 1.0)
    return {
        "seuils": seuils,
        "cdf_brute": cdf_brute[0],
        "cdf_avant": avant,
        "cdf_arriere": arriere,
        "cdf_corrigee": cdf_corrigee,
        "violations": viol,
    }


def figure_correction_relation_ordre(path: Optional[str] = None) -> Tuple["object", "object", Dict]:
    """Figure C11_RelationOrdre_Correction : brute, balayages, CDF corrigée."""
    import matplotlib.pyplot as plt

    res = correction_relation_ordre()
    z = res["seuils"]

    fig, ax = plt.subplots(figsize=(6.5, 4.4))
    ax.plot(z, res["cdf_brute"], "o--", color="0.4", linewidth=1.5,
            markersize=6, label="CDF brute (KI)")
    ax.plot(z, res["cdf_avant"], "-^", color="tab:red", linewidth=1.5,
            markersize=5, label=r"avant (montée $\uparrow$)")
    ax.plot(z, res["cdf_arriere"], "-v", color="tab:green", linewidth=1.5,
            markersize=5, label=r"arrière (descente $\downarrow$)")
    ax.plot(z, res["cdf_corrigee"], "-o", color="tab:blue", linewidth=2.2,
            markersize=6, label="CDF corrigée (moyenne)")
    ax.axhline(0.0, color="k", linewidth=0.6)
    ax.axhline(1.0, color="k", linewidth=0.6)
    ax.set_xlabel(r"Seuil $z_c$", fontsize=12)
    ax.set_ylabel(r"$F_{KI}(\mathbf{x}_0,\, z_c)$", fontsize=12)
    ax.set_ylim(-0.05, 1.08)
    ax.grid(True, alpha=0.4)
    ax.legend(fontsize=9, loc="upper left")
    fig.tight_layout()
    if path:
        fig.savefig(path, dpi=150, bbox_inches="tight")
    return fig, ax, res


# ===========================================================================
# 3. Données d'inégalité / souples (section 11-06, fig-C11_SoftKriging)
# ===========================================================================
# Profil 1D du toit d'un réservoir. Quelques forages atteignent le toit
# (données dures : profondeur exacte). Un forage abandonné à la profondeur d
# sans l'atteindre fournit l'inégalité Z > d. Le KI code I = 0 pour tous les
# seuils z_c <= d (l'indicatrice est connue : Z > d => Z > z_c => I = 0) et
# laisse la donnée absente pour z_c > d. Le KO ignore l'inégalité et peut
# estimer un toit moins profond que d (violation physiquement impossible).
DONNEES_SOFT = {
    "x_dur": np.array([0.0, 25.0, 75.0, 100.0]),       # positions des forages durs
    "z_dur": np.array([470.0, 490.0, 500.0, 480.0]),   # profondeur du toit (m)
    "x_ineg": np.array([50.0]),                        # forage abandonné
    "d_ineg": np.array([540.0]),                       # abandonné à 540 m : Z > 540
    "seuils": np.arange(460.0, 600.0 + 1e-9, 10.0),    # seuils z_c (m), pas de 10 m
    "x_cible": np.linspace(0.0, 100.0, 51),            # profil estimé
    "structure": [{"modele": "spherique", "palier": 1.0, "portee": 35.0}],
    "pepite": 0.0,
}


def profil_donnees_inegalite(cfg: Optional[Dict] = None) -> Dict:
    """KO vs KI sur un profil de toit de réservoir avec donnée d'inégalité.

    - KO : krigeage ordinaire des profondeurs dures uniquement (ignore
      l'inégalité). Réutilise :func:`krigeage_ordinaire`.
    - KI : krigeage de chaque indicatrice ; la donnée d'inégalité ``Z > d``
      contribue comme ``I = 0`` aux seuils ``z_c <= d`` (codage par
      :func:`coder_indicatrices`) puis correction de la relation d'ordre et
      médiane locale (:func:`corriger_relation_ordre`, :func:`mediane_locale`).

    Returns
    -------
    dict avec le profil KO, le profil KI (médiane locale) et les données.
    """
    if cfg is None:
        cfg = DONNEES_SOFT
    x_dur = np.asarray(cfg["x_dur"], float).reshape(-1, 1)
    z_dur = np.asarray(cfg["z_dur"], float)
    x_ineg = np.asarray(cfg["x_ineg"], float).reshape(-1, 1)
    d_ineg = np.asarray(cfg["d_ineg"], float)
    seuils = np.asarray(cfg["seuils"], float)
    x_cible = np.asarray(cfg["x_cible"], float).reshape(-1, 1)
    structure = cfg["structure"]
    pepite = float(cfg.get("pepite", 0.0))

    # ---- KO : profondeurs dures seulement ----
    ko = krigeage_ordinaire(x_dur, z_dur, x_cible, structure, pepite=pepite)
    profil_ko = ko["estimations"]

    # ---- KI : indicatrices des données dures + indicatrices d'inégalité ----
    # Données dures : indicatrices complètes pour tous les seuils.
    ind_dur = coder_indicatrices(z_dur, seuils)          # (n_dur, K)
    # On krige chaque seuil avec l'ensemble des données où l'indicatrice est
    # connue : données dures (toujours) + inégalité pour z_c <= d.
    K = len(seuils)
    cdf_cible = np.zeros((x_cible.shape[0], K))
    for k, zc in enumerate(seuils):
        coords_k = x_dur
        ind_k = ind_dur[:, k].astype(float)
        # Z > d => I(z_c) = 1{Z <= z_c} = 0 est CONNUE pour tout z_c <= d.
        masque_connu = zc <= d_ineg                       # I connue = 0
        if np.any(masque_connu):
            coords_k = np.vstack([coords_k, x_ineg[masque_connu]])
            ind_k = np.concatenate([ind_k, np.zeros(int(masque_connu.sum()))])
        r = krigeage_ordinaire(coords_k, ind_k, x_cible, structure, pepite=pepite)
        cdf_cible[:, k] = r["estimations"]

    cdf_corr = corriger_relation_ordre(cdf_cible, methode="moyenne")
    profil_ki = mediane_locale(cdf_corr, seuils)          # médiane locale = toit estimé

    return {
        "x_cible": x_cible.reshape(-1),
        "profil_ko": profil_ko,
        "profil_ki": profil_ki,
        "x_dur": x_dur.reshape(-1),
        "z_dur": z_dur,
        "x_ineg": x_ineg.reshape(-1),
        "d_ineg": d_ineg,
        "seuils": seuils,
        "cdf_corrigee": cdf_corr,
    }


def figure_donnees_inegalite(cfg: Optional[Dict] = None,
                             path: Optional[str] = None) -> Tuple["object", "object", Dict]:
    """Figure C11_SoftKriging : KO violant l'inégalité vs KI la respectant."""
    import matplotlib.pyplot as plt

    res = profil_donnees_inegalite(cfg)
    fig, ax = plt.subplots(figsize=(7.0, 4.6))
    ax.plot(res["x_cible"], res["profil_ko"], "-", color="tab:red",
            linewidth=2, label="KO (ignore l'inégalité)")
    ax.plot(res["x_cible"], res["profil_ki"], "-", color="tab:blue",
            linewidth=2, label="KI (respecte l'inégalité)")
    ax.plot(res["x_dur"], res["z_dur"], "^k", markersize=10,
            label="forages (toit atteint)")
    # Donnée d'inégalité : Z > d (le toit est PLUS profond que d)
    for xi, di in zip(res["x_ineg"], res["d_ineg"]):
        ax.plot(xi, di, "vk", markersize=10, markerfacecolor="white")
        ax.annotate(r"$Z > %g$" % di, (xi, di), textcoords="offset points",
                    xytext=(6, -14), fontsize=10)
    ax.invert_yaxis()                                     # profondeur vers le bas
    ax.set_xlabel("Position le long du profil", fontsize=12)
    ax.set_ylabel("Profondeur du toit (m)", fontsize=12)
    ax.grid(True, alpha=0.4)
    ax.legend(fontsize=9, loc="best")
    fig.tight_layout()
    if path:
        fig.savefig(path, dpi=150, bbox_inches="tight")
    return fig, ax, res

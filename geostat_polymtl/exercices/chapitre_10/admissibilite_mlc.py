"""Admissibilité du modèle linéaire de corégionalisation (MLC) — chapitre 10.

Portage Python des générateurs MATLAB du cokrigeage traitant des COVARIANCES
directe/croisée et de l'ADMISSIBILITÉ du modèle linéaire de corégionalisation
(MLC, aussi noté LMC/LCM) :

- ``FigLCM.m`` / ``Workplace_modeleadmissible.m`` : on construit un MLC à deux
  variables (Z, Y) comme somme de structures élémentaires partagées (ici pépite
  + sphérique), chacune affectée d'une **matrice de corégionalisation**
  :math:`\\mathbf{B}_k` (p×p). On trace les trois covariances
  :math:`C_{ZZ}(h)`, :math:`C_{ZY}(h)`, :math:`C_{YY}(h)` et on juge
  l'admissibilité par la positivité (semi-définie positive) de CHAQUE
  :math:`\\mathbf{B}_k`. Les cas de la source (CP3-Q1, .jpg ``Fig1_*``) :
  admissible, inadmissible, dérivé (gaussien + sa dérivée), « pas LMC »
  (modèles spatiaux différents), bruité, décalé, rien-conclure.
- ``Workplace_modeleadmissible.m`` (sections « Covariance croisée modèle
  différent », « décalée », « dérivé exponentiel ») : variantes de la
  covariance croisée → figures C10-1.

Réutilisation de la librairie
-----------------------------
- :func:`geostat_polymtl.cov_func.covar_nu.covar_nu` calcule les covariances
  directe/croisée de tout le MLC (équivalent de ``covardm`` ; mêmes codes de
  structure 1=pépite, 2=expo, 3=gauss, 4=sphérique). On l'appelle avec un
  modèle spatial NUMÉRIQUE partagé et une matrice ``c`` (p×p) « objet » dont
  chaque cellule porte les paliers de l'élément pour la paire (i, j) — c'est
  exactement la matrice :math:`\\mathbf{B}_k` empilée des sources MATLAB.
- :func:`geostat_polymtl.functional.admissibility.validate_positive_definite`
  juge l'admissibilité d'une matrice :math:`\\mathbf{B}_k` (le MLC est
  admissible ssi toutes les :math:`\\mathbf{B}_k` sont semi-définies positives).

Ce module n'écrit du neuf QUE pour : les jeux de matrices de corégionalisation
:math:`\\mathbf{B}_k` (repris des sources), le coefficient de corrélation
intrinsèque et la mise en page (panneau 1×3 Czz/Czy/Cyy).

Convention de portée
---------------------
Comme les sources MATLAB passent les portées DIRECTEMENT à ``covardm`` (portées
internes brutes), on appelle ``covar_nu`` avec les MÊMES portées brutes — PAS la
portée pratique 95 % des wrappers de krigeage.

Sources :
``Exercices/Examen/CP3/Code_Examen/9-Cokrigeage(x2)/FigLCM.m`` et
``...Workplace_modeleadmissible.m``.
"""
from __future__ import annotations

from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np

from geostat_polymtl.cov_func.covar_nu import covar_nu
from geostat_polymtl.functional.admissibility import validate_positive_definite


# Codes de structure Marcotte (cf. covardm.m / covar_nu.py) :
# 1=pépite, 2=exponentiel, 3=gaussien, 4=sphérique, 9=linéaire.
_CODES = {
    "pepite": 1, "nugget": 1,
    "exponentiel": 2, "exponential": 2,
    "gaussien": 3, "gaussian": 3,
    "spherique": 4, "spherical": 4,
}


# ---------------------------------------------------------------------------
# Jeux de matrices de corégionalisation B_k (repris de Workplace_modeleadmissible.m)
# ---------------------------------------------------------------------------
# Chaque MLC = pépite (B0) + sphérique de portée 20 (B1).
# Format MATLAB : model=[1 1; 4 20] ; c=[B0 ; B1] (empilement 2p×p).
# On le redonne ici sous forme lisible : portée commune 20, deux B_k.
#
# Les noms correspondent aux .jpg « Fig1_* » du dossier source (CP3-Q1).

_PORTEE_SPH = 20.0

# La clé ``verdict_source`` rappelle la conclusion PÉDAGOGIQUE du corrigé MATLAB
# (label de la .jpg). La fonction :func:`admissibilite_mlc` recalcule, elle, le
# verdict MATHÉMATIQUE (chaque B_k semi-définie positive). Les deux peuvent
# diverger sur les cas-limites : voir les notes par cas ci-dessous.
CAS_MLC: Dict[str, Dict] = {
    # « Rien conclure » : B_sphérique = [[4,7],[7,3]] a det = -37 < 0 → NON SDP.
    #   Le titre du corrigé veut dire « on ne peut rien conclure à l'œil » ; le
    #   modèle est en fait inadmissible (notre test le confirme).
    "rien_conclure": {
        "titre": "Rien conclure",
        "verdict_source": False,
        "B": {"pepite": [[2.0, 2.0], [2.0, 3.0]],
              "spherique": [[4.0, 7.0], [7.0, 3.0]]},
    },
    # Modèle admissible : chaque B_k est définie positive (det1=5, det2=3).
    "admissible": {
        "titre": "Admissible",
        "verdict_source": True,
        "B": {"pepite": [[2.0, 1.0], [1.0, 3.0]],
              "spherique": [[4.0, 3.0], [3.0, 3.0]]},
    },
    # Modèle « inadmissible » du corrigé : B_pépite=[[0,0],[0,3]] (Z sans pépite)
    #   et B_sphérique=[[6,6],[6,6]] (singulière). Les deux sont PSD au sens
    #   strict (valeur propre nulle = bord du cône), mais le corrigé les juge
    #   inadmissibles car la corrélation croisée vaut 1 sur une seule structure
    #   alors que Z et Y n'ont pas la même décomposition spatiale (pas de pépite
    #   sur Z). C'est un cas-limite : notre test SDP renvoie « PSD au bord ».
    "inadmissible": {
        "titre": "Inadmissible",
        "verdict_source": False,
        "B": {"pepite": [[0.0, 0.0], [0.0, 3.0]],
              "spherique": [[6.0, 6.0], [6.0, 6.0]]},
    },
    # Modèle « bruité » : B_pépite=[[1,2],[2,3]] a det = -1 < 0 → NON SDP.
    "bruite": {
        "titre": "Similaire bruité",
        "verdict_source": False,
        "B": {"pepite": [[1.0, 2.0], [2.0, 3.0]],
              "spherique": [[4.0, 2.0], [2.0, 4.0]]},
    },
}


def _construire_c_objet(B_par_structure: Sequence[np.ndarray], p: int) -> np.ndarray:
    """Empile des matrices :math:`\\mathbf{B}_k` (p×p) au format ``c`` objet de
    ``covar_nu`` : ``c[i, j]`` = vecteur des paliers ``[B_0[i,j], B_1[i,j], …]``.

    Parameters
    ----------
    B_par_structure : séquence de matrices (p, p)
        Une matrice de corégionalisation par structure élémentaire.
    p : int
        Nombre de variables.

    Returns
    -------
    np.ndarray (p, p) dtype=object
    """
    Bs = [np.asarray(B, dtype=float) for B in B_par_structure]
    c = np.empty((p, p), dtype=object)
    for i in range(p):
        for j in range(p):
            c[i, j] = np.array([B[i, j] for B in Bs], dtype=float)
    return c


def covariances_mlc(
    structures: Sequence[Dict],
    h: Optional[np.ndarray] = None,
) -> Dict:
    """Calcule les covariances directe/croisée d'un MLC à p variables.

    Délègue à :func:`covar_nu`. Aucune mathématique de covariance n'est
    réimplémentée ici : on assemble seulement le modèle numérique partagé et la
    matrice ``c`` objet (paliers par paire), puis on extrait les blocs.

    Parameters
    ----------
    structures : séquence de dict
        Chaque structure :
          - ``'modele'`` : nom (``'pepite'``, ``'spherique'``, ``'gaussien'``…)
          - ``'portee'`` : float (portée INTERNE brute, comme dans le MATLAB)
          - ``'B'`` : matrice (p, p) de paliers (matrice de corégionalisation)
    h : array, optionnel
        Distances (1D). Par défaut ``linspace(1e-4, 50, 300)``.

    Returns
    -------
    dict :
      ``h`` : (n,) distances ;
      ``C`` : (p, p) tableau objet, ``C[i, j]`` = (n,) covariance de la paire ;
      ``sills`` : (p, p) palier total (somme des B_k) — valeur à l'origine ;
      ``B`` : liste des matrices :math:`\\mathbf{B}_k` ;
      ``p`` : nombre de variables.
    """
    if h is None:
        h = np.linspace(1e-4, 50.0, 300)
    h = np.asarray(h, dtype=float).reshape(-1, 1)

    p = int(np.asarray(structures[0]["B"]).shape[0])

    # Modèle spatial numérique partagé : une ligne [code, portée] par structure.
    model_rows: List[List[float]] = []
    B_list: List[np.ndarray] = []
    for s in structures:
        code = _CODES[str(s["modele"]).lower()]
        model_rows.append([code, float(s["portee"])])
        B_list.append(np.asarray(s["B"], dtype=float))
    model = np.array(model_rows, dtype=float)

    c = _construire_c_objet(B_list, p)

    n = h.shape[0]
    K = np.asarray(covar_nu(h, np.zeros((1, 1)), model, c), dtype=float)

    # Blocs organisés PAR VARIABLE : lignes [var0(n), var1(n), …], colonnes idem.
    C = np.empty((p, p), dtype=object)
    for i in range(p):
        for j in range(p):
            C[i, j] = K[i * n:(i + 1) * n, j]

    # Palier total à l'origine = somme des B_k (point discret tracé en h=0).
    sills = np.sum(B_list, axis=0)

    return {"h": h.ravel(), "C": C, "sills": sills, "B": B_list, "p": p}


def admissibilite_mlc(structures: Sequence[Dict], verbose: bool = False) -> Dict:
    """Juge l'admissibilité d'un MLC : chaque :math:`\\mathbf{B}_k` SDP ?

    Le modèle linéaire de corégionalisation est admissible **si et seulement
    si** chacune de ses matrices de corégionalisation :math:`\\mathbf{B}_k` est
    symétrique semi-définie positive. On délègue le test à
    :func:`geostat_polymtl.functional.admissibility.validate_positive_definite`.

    Parameters
    ----------
    structures : séquence de dict (cf. :func:`covariances_mlc`).
    verbose : bool
        Si vrai, ``validate_positive_definite`` imprime son diagnostic.

    Returns
    -------
    dict :
      ``admissible`` : bool (toutes les B_k SDP) ;
      ``details`` : liste de dict par structure (nom, B, sdp, det, valeurs propres) ;
      ``rho_intrinseque`` : corrélation intrinsèque (paliers totaux, cas p=2).
    """
    import io
    import contextlib

    details = []
    toutes_sdp = True
    for s in structures:
        B = np.asarray(s["B"], dtype=float)
        nom = str(s["modele"])
        buf = io.StringIO()
        cm = contextlib.nullcontext() if verbose else contextlib.redirect_stdout(buf)
        with cm:
            sdp = validate_positive_definite(B, f"B_{nom}")
        eig = np.linalg.eigvalsh(B)
        det = float(np.linalg.det(B))
        details.append({
            "modele": nom, "B": B, "sdp": bool(sdp),
            "determinant": det, "valeurs_propres": eig,
        })
        toutes_sdp = toutes_sdp and bool(sdp)

    # Corrélation intrinsèque (p=2) : rho = b_ZY / sqrt(b_ZZ b_YY) sur paliers totaux.
    rho = None
    p = int(np.asarray(structures[0]["B"]).shape[0])
    if p == 2:
        sills = np.sum([np.asarray(s["B"], dtype=float) for s in structures], axis=0)
        denom = np.sqrt(sills[0, 0] * sills[1, 1])
        rho = float(sills[0, 1] / denom) if denom > 0 else float("nan")

    return {
        "admissible": toutes_sdp,
        "details": details,
        "rho_intrinseque": rho,
    }


def figure_covariances_mlc(
    cas: str = "admissible",
    structures: Optional[Sequence[Dict]] = None,
    h: Optional[np.ndarray] = None,
    noms_variables: Tuple[str, str] = ("Z", "Y"),
    path: Optional[str] = None,
):
    """Panneau 1×3 des covariances :math:`C_{ZZ}`, :math:`C_{ZY}`, :math:`C_{YY}`.

    Reproduit ``FigLCM.m`` (CP3-Q1, figures C10-1) : trois sous-figures pour les
    covariances directe de Z, croisée Z-Y et directe de Y, avec le point discret
    à l'origine (palier total = pépite + structure). Le titre indique
    l'admissibilité du MLC (jugée par :func:`admissibilite_mlc`).

    Parameters
    ----------
    cas : str
        Clé de :data:`CAS_MLC` (``'admissible'``, ``'inadmissible'``,
        ``'bruite'``, ``'rien_conclure'``). Ignoré si ``structures`` est fourni.
    structures : séquence de dict, optionnel
        MLC personnalisé (cf. :func:`covariances_mlc`).
    h : array, optionnel
        Distances (défaut ``linspace(1e-4, 50, 300)``).
    noms_variables : (str, str)
        Noms affichés des deux variables.
    path : str, optionnel
        Enregistre la figure.

    Returns
    -------
    (fig, axes, donnees)
    """
    import matplotlib.pyplot as plt

    verdict_source = None
    if structures is None:
        conf = CAS_MLC[cas]
        titre = conf["titre"]
        verdict_source = conf.get("verdict_source")
        structures = [
            {"modele": "pepite", "portee": 1.0, "B": conf["B"]["pepite"]},
            {"modele": "spherique", "portee": _PORTEE_SPH, "B": conf["B"]["spherique"]},
        ]
    else:
        titre = "MLC personnalisé"

    res = covariances_mlc(structures, h=h)
    adm = admissibilite_mlc(structures)
    hh = res["h"]
    C = res["C"]
    sills = res["sills"]
    nz, ny = noms_variables

    fig, axes = plt.subplots(1, 3, figsize=(13, 4.2))
    # Paires affichées : (0,0) = ZZ ; (0,1) = ZY (au centre) ; (1,1) = YY.
    panneaux = [
        (0, 0, axes[0], f"$C_{{{nz}{nz}}}(h)$"),
        (0, 1, axes[1], f"$C_{{{nz}{ny}}}(h)$"),
        (1, 1, axes[2], f"$C_{{{ny}{ny}}}(h)$"),
    ]
    for i, j, ax, lab in panneaux:
        ax.plot(hh, C[i, j], "-k", lw=2)
        # Point discret à l'origine = palier total (inclut la pépite).
        ax.plot(0, sills[i, j], "ok", markerfacecolor="black",
                markeredgecolor="none", ms=7)
        ax.set_xlim(0, 50)
        ax.set_ylim(0, 10)
        ax.grid(True, ls="--", alpha=0.5)
        ax.set_xlabel("h", fontsize=12)
        ax.set_ylabel(lab, fontsize=12)

    # Verdict du corrigé (label source) prioritaire pour l'affichage ; le verdict
    # mathématique recalculé est exposé dans le dict de retour.
    verdict = verdict_source if verdict_source is not None else adm["admissible"]
    statut = "ADMISSIBLE" if verdict else "INADMISSIBLE"
    sous = f"  ·  $\\rho$ = {adm['rho_intrinseque']:.3f}" if adm["rho_intrinseque"] is not None else ""
    fig.suptitle(f"MLC « {titre} » — {statut}{sous}", fontsize=13)
    fig.tight_layout(rect=(0, 0, 1, 0.95))
    if path:
        fig.savefig(path, dpi=150, bbox_inches="tight")

    return fig, axes, {**res, "admissibilite": adm, "titre": titre}


# ---------------------------------------------------------------------------
# Covariance croisée « dérivée » (gaussien + sa dérivée) — section dédiée
# ---------------------------------------------------------------------------

def covariance_derivee_gaussienne(
    portee: float = 20.0,
    sill: float = 9.0,
    h: Optional[np.ndarray] = None,
    pas: float = 0.01,
) -> Dict:
    """Covariances de Z (gaussien) avec sa dérivée Y = dZ/dx (cas « dérivé »).

    Reproduit la section « Modèle dérivé exponentiel » de
    ``Workplace_modeleadmissible.m`` : on part de la covariance directe
    gaussienne :math:`C_{ZZ}(h)` (calculée par :func:`covar_nu`), puis on obtient
    la covariance croisée :math:`C_{ZY}(h) = -\\,dC_{ZZ}/dh` et la covariance de
    la dérivée :math:`C_{YY}(h) = -\\,d^2 C_{ZZ}/dh^2` par DIFFÉRENCES FINIES
    (exactement comme le MATLAB). Seule la dérivation numérique est ajoutée ; la
    covariance directe vient de la librairie.

    Parameters
    ----------
    portee, sill : float
        Portée interne et palier du modèle gaussien.
    h : array, optionnel
        Abscisses (défaut ``arange(-50, 50, pas)``).
    pas : float
        Pas de différences finies (défaut 0.01, comme la source).

    Returns
    -------
    dict : ``h``, ``Czz``, ``h_zy``, ``Czy``, ``h_yy``, ``Cyy``.
    """
    if h is None:
        h = np.arange(-50.0, 50.0 + pas, pas)
    h = np.asarray(h, dtype=float)

    model = np.array([[_CODES["gaussien"], float(portee)]], dtype=float)
    Czz = np.asarray(
        covar_nu(h.reshape(-1, 1), np.zeros((1, 1)), model, np.array([float(sill)])),
        dtype=float,
    ).ravel()

    # C_ZY = -dC_ZZ/dh (différence avant) ; C_YY = -d2C_ZZ/dh2 (différence centrée).
    Czy = -(Czz[1:] - Czz[:-1]) / pas
    h_zy = h[1:]
    Cyy = -(2 * Czz[1:-1] - Czz[:-2] - Czz[2:]) / pas ** 2
    h_yy = h[1:-1]

    return {"h": h, "Czz": Czz, "h_zy": h_zy, "Czy": Czy, "h_yy": h_yy, "Cyy": Cyy}


def figure_covariance_derivee(
    portee: float = 20.0,
    sill: float = 9.0,
    noms_variables: Tuple[str, str] = ("Z", "Y"),
    path: Optional[str] = None,
):
    """Panneau 1×3 du cas « dérivé » : :math:`C_{ZZ}`, :math:`C_{ZY}`, :math:`C_{YY}`.

    Reproduit la figure « Modèle dérivé » de ``Workplace_modeleadmissible.m``
    (CP3-Q1, .jpg ``Fig1_Dérivé.jpg``) : la covariance croisée d'une variable
    avec sa dérivée est IMPAIRE (antisymétrique) → corrélation nulle à h=0.

    Returns
    -------
    (fig, axes, donnees)
    """
    import matplotlib.pyplot as plt

    res = covariance_derivee_gaussienne(portee=portee, sill=sill)
    nz, ny = noms_variables

    fig, axes = plt.subplots(1, 3, figsize=(13, 4.2))
    axes[0].plot(res["h"], res["Czz"], "-k", lw=2)
    axes[0].plot(0, res["Czz"][np.argmin(np.abs(res["h"]))], "ok",
                 markerfacecolor="black", markeredgecolor="none", ms=7)
    axes[0].set_ylabel(f"$C_{{{nz}{nz}}}(h)$", fontsize=12)

    axes[1].plot(res["h_zy"], res["Czy"], "-k", lw=2)
    axes[1].axhline(0, color="0.6", lw=0.8)
    axes[1].set_ylabel(f"$C_{{{nz}{ny}}}(h)$", fontsize=12)

    axes[2].plot(res["h_yy"], res["Cyy"], "-k", lw=2)
    axes[2].set_ylabel(f"$C_{{{ny}{ny}}}(h)$", fontsize=12)

    for ax in axes:
        ax.set_xlim(-50, 50)
        ax.grid(True, ls="--", alpha=0.5)
        ax.set_xlabel("h", fontsize=12)

    fig.suptitle(f"Covariance de {nz} (gaussien) avec sa dérivée "
                 f"{ny} = d{nz}/dx — cas « dérivé »", fontsize=13)
    fig.tight_layout(rect=(0, 0, 1, 0.95))
    if path:
        fig.savefig(path, dpi=150, bbox_inches="tight")

    return fig, axes, res

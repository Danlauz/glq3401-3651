"""
Masse volumique d'un mélange minéral (chap. 03).

La masse volumique apparente d'un échantillon composé de plusieurs minéraux se
calcule à partir des teneurs massiques et des masses spécifiques de chaque
constituant, en raisonnant sur le volume occupé par 100 g de matériau.

Pour une masse de 100 g répartie entre les minéraux :

.. math::
    V_{tot} = \\sum_i \\frac{t_i}{\\delta_i}

où :math:`t_i` est la teneur (en grammes par 100 g, c.-à-d. en %) et
:math:`\\delta_i` la masse spécifique du minéral *i* (g/cm³). La masse
volumique du mélange compact est alors :

.. math::
    \\rho = \\frac{\\sum_i t_i}{V_{tot}}

et, en présence d'une porosité :math:`n` (fraction de vide) :

.. math::
    \\rho_{app} = \\rho \\,(1 - n)
"""

from __future__ import annotations

import re
from typing import Dict, List, Sequence

import numpy as np
from numpy.typing import ArrayLike

# ---------------------------------------------------------------------------
# Composition chimique des minéraux (atelier 3.6 : densité théorique via Ax=b)
# ---------------------------------------------------------------------------
# Masses atomiques (g/mol) des éléments utilisés dans les ateliers du chap. 03.
POIDS_ATOMIQUES: Dict[str, float] = {
    "Cu": 63.55, "Fe": 55.85, "S": 32.07, "Pb": 207.2,
    "Ba": 137.36, "O": 16.00, "Zn": 65.38,
}

_RE_FORMULE = re.compile(r"([A-Z][a-z]?)(\d*)")


def composition_chimique(formule: str) -> Dict[str, float]:
    """Fractions massiques de chaque élément d'une formule chimique.

    Décompose une formule (ex. ``"CuFeS2"``, ``"Cu5FeS4"``, ``"BaSO4"``) et
    renvoie la fraction massique de chaque élément, à partir des masses
    atomiques de :data:`POIDS_ATOMIQUES`. C'est l'équivalent Python de la
    fonction ``PourcentageElement`` du code MATLAB du cours.

    Parameters
    ----------
    formule : str
        Formule chimique (notation de Hill simple, sans parenthèses).

    Returns
    -------
    dict
        ``{element: fraction_massique}`` (les fractions somment à 1).

    Examples
    --------
    >>> c = composition_chimique("CuFeS2")
    >>> round(c["Cu"], 2), round(c["Fe"], 2), round(c["S"], 2)
    (0.35, 0.3, 0.35)
    """
    masses: Dict[str, float] = {}
    total = 0.0
    for element, n in _RE_FORMULE.findall(formule):
        if not element:
            continue
        if element not in POIDS_ATOMIQUES:
            raise ValueError(
                f"Élément inconnu '{element}' dans la formule {formule!r}. "
                f"Éléments connus : {sorted(POIDS_ATOMIQUES)}."
            )
        nb = int(n) if n else 1
        m = POIDS_ATOMIQUES[element] * nb
        masses[element] = masses.get(element, 0.0) + m
        total += m
    if total <= 0.0:
        raise ValueError(f"Formule vide ou invalide : {formule!r}.")
    return {el: m / total for el, m in masses.items()}


# Bibliothèque de minéraux (formule + masse spécifique par défaut), reprise du
# code MATLAB du cours (Q3_Densite.m / PourcentageElement).
MINERAUX: Dict[str, Dict] = {
    "Chalcopyrite": {"formule": "CuFeS2", "densite": 4.1},
    "Chalcocite":   {"formule": "CuS2",   "densite": 5.6},
    "Bornite":      {"formule": "Cu5FeS4", "densite": 5.1},
    "Galène":       {"formule": "PbS",    "densite": 7.5},
    "Barite":       {"formule": "BaSO4",  "densite": 4.5},
    "Sphalérite":   {"formule": "ZnS",    "densite": 4.1},
    "Pyrite":       {"formule": "FeS2",   "densite": 5.0},
}


def lister_mineraux() -> List[Dict]:
    """Bibliothèque de minéraux pour le calculateur de densité (atelier 3.6).

    Chaque entrée fournit le nom, la formule, la masse spécifique et la
    composition massique (``{element: fraction}``) calculée depuis la formule.
    Le widget s'en sert pour construire automatiquement la matrice ``A`` en
    fonction des minéraux sélectionnés.
    """
    out: List[Dict] = []
    for nom, spec in MINERAUX.items():
        comp = composition_chimique(spec["formule"])
        out.append({
            "nom": nom,
            "formule": spec["formule"],
            "densite": float(spec["densite"]),
            "composition": {el: round(v, 4) for el, v in comp.items()},
        })
    return out


def resoudre_proportions_minerales(
    composition: ArrayLike,
    analyses: ArrayLike,
    fermeture: bool = True,
) -> Dict:
    """Résout le système ``A x = b`` des proportions minérales.

    À partir d'une **matrice de composition** ``A`` (fraction massique de chaque
    élément — lignes — dans chaque minéral — colonnes) et d'un **vecteur
    d'analyses** ``b`` (teneurs mesurées des éléments), estime le **vecteur des
    proportions massiques** ``x`` de chaque minéral.

    Une contrainte de **fermeture** (``somme des proportions = 1``) est ajoutée
    par défaut sous forme d'une ligne de 1 dans ``A`` et d'un 1 dans ``b`` :
    c'est elle qui permet de déterminer la gangue, dont la composition n'est pas
    contrainte par les éléments analysés. Le système est résolu au sens des
    moindres carrés (:func:`numpy.linalg.lstsq`), ce qui fonctionne que le
    système soit carré, sur- ou sous-déterminé.

    Parameters
    ----------
    composition : array-like, shape (n_elements, n_mineraux)
        Matrice ``A``. ``composition[i, j]`` = fraction massique de l'élément
        ``i`` dans le minéral ``j``.
    analyses : array-like, shape (n_elements,)
        Vecteur ``b`` des teneurs mesurées (en fraction, ex. 0.03 pour 3 %).
    fermeture : bool, par défaut True
        Ajoute la contrainte ``somme(x) = 1``.

    Returns
    -------
    dict
        ``{'proportions', 'proportions_pct', 'A', 'b', 'rang', 'residu'}``.
        ``proportions`` somment à 1 (fermeture) ; ``proportions_pct`` en %.
    """
    A = np.atleast_2d(np.asarray(composition, dtype=float))
    b = np.asarray(analyses, dtype=float).ravel()
    if A.shape[0] != b.shape[0]:
        raise ValueError(
            f"composition a {A.shape[0]} lignes mais analyses en a {b.shape[0]}."
        )
    if fermeture:
        A = np.vstack([A, np.ones((1, A.shape[1]))])
        b = np.append(b, 1.0)

    x, residus, rang, _sv = np.linalg.lstsq(A, b, rcond=None)
    residu = float(np.linalg.norm(A @ x - b))
    return {
        "proportions": x,
        "proportions_pct": x * 100.0,
        "A": A,
        "b": b,
        "rang": int(rang),
        "residu": residu,
    }


def analyser_densite(
    composition: ArrayLike,
    analyses: ArrayLike,
    densites: ArrayLike,
    porosite: float = 0.0,
    fermeture: bool = True,
) -> Dict:
    """Pipeline complet de l'atelier 3.6 : ``A x = b`` puis densité théorique.

    1. résout ``A x = b`` (:func:`resoudre_proportions_minerales`) pour obtenir
       les proportions massiques des minéraux ;
    2. en déduit la masse volumique théorique (:func:`masse_volumique_melange`)
       et l'ajuste pour la porosité.

    Parameters
    ----------
    composition : array-like, shape (n_elements, n_mineraux)
        Matrice de composition ``A``.
    analyses : array-like, shape (n_elements,)
        Teneurs mesurées ``b`` (fractions).
    densites : array-like, shape (n_mineraux,)
        Masse spécifique de chaque minéral (g/cm³).
    porosite : float, par défaut 0.0
        Porosité (fraction de vide).
    fermeture : bool, par défaut True
        Contrainte ``somme(x) = 1``.

    Returns
    -------
    dict
        Proportions, densités théorique et apparente, fractions volumiques, et
        le système ``A``/``b`` augmenté (pour l'affichage pédagogique).
    """
    sol = resoudre_proportions_minerales(composition, analyses, fermeture=fermeture)
    teneurs_pct = sol["proportions_pct"]
    densites = np.asarray(densites, dtype=float)
    rho_theorique = masse_volumique_melange(teneurs_pct, densites, 0.0)
    rho_apparente = rho_theorique * (1.0 - float(porosite))
    fv = fractions_volumiques(teneurs_pct, densites)
    return {
        "proportions": sol["proportions"].tolist(),
        "proportions_pct": teneurs_pct.tolist(),
        "rho_theorique": rho_theorique,
        "rho_apparente": rho_apparente,
        "porosite": float(porosite),
        "fractions_volumiques": fv.tolist(),
        "A": sol["A"].tolist(),
        "b": sol["b"].tolist(),
        "rang": sol["rang"],
        "residu": sol["residu"],
    }


# ---------------------------------------------------------------------------
# Scénarios pédagogiques (atelier 3.6), repris de Q3_Densite.m
# ---------------------------------------------------------------------------
# Chaque scénario : éléments analysés, minéraux (formule connue ou composition
# explicite pour la gangue), teneurs mesurées et porosité.
SCENARIOS_DENSITE: List[Dict] = [
    {
        "id": "cu_zn",
        "nom": "Cu-Zn (chalcopyrite, sphalérite, pyrite, gangue)",
        "elements": ["Cu", "Zn", "S"],
        "mineraux": [
            {"nom": "Chalcopyrite", "formule": "CuFeS2", "densite": 4.1},
            {"nom": "Sphalérite", "formule": "ZnS", "densite": 4.1},
            {"nom": "Pyrite", "formule": "FeS2", "densite": 5.0},
            {"nom": "Gangue", "densite": 3.0, "composition": {"Cu": 0.0, "Zn": 0.0, "S": 0.0}},
        ],
        "analyses": {"Cu": 0.04, "Zn": 0.03, "S": 0.08},
        "porosite": 0.02,
    },
    {
        "id": "barite",
        "nom": "Barite et gangue (Ba)",
        "elements": ["Ba"],
        "mineraux": [
            {"nom": "Barite", "formule": "BaSO4", "densite": 4.5},
            {"nom": "Gangue", "densite": 2.8, "composition": {"Ba": 0.0}},
        ],
        "analyses": {"Ba": 0.20},
        "porosite": 0.03,
    },
    {
        "id": "cu_pb_multi",
        "nom": "Cu-Pb (chalcopyrite, chalcocite, bornite, galène, gangue)",
        "elements": ["Cu", "Fe", "Pb", "S"],
        "mineraux": [
            {"nom": "Chalcopyrite", "formule": "CuFeS2", "densite": 4.1},
            {"nom": "Chalcocite", "formule": "CuS2", "densite": 5.6},
            {"nom": "Bornite", "formule": "Cu5FeS4", "densite": 5.1},
            {"nom": "Galène", "formule": "PbS", "densite": 7.5},
            {"nom": "Gangue", "densite": 2.7,
             "composition": {"Cu": 0.0, "Fe": 0.05, "Pb": 0.0, "S": 0.02}},
        ],
        "analyses": {"Cu": 0.15, "Fe": 0.10, "Pb": 0.04, "S": 0.16},
        "porosite": 0.03,
    },
    {
        "id": "pb_cu_ba",
        "nom": "Pb-Cu (pyrite, bornite, barite, galène, gangue)",
        "elements": ["Cu", "Pb", "Fe", "S"],
        "mineraux": [
            {"nom": "Pyrite", "formule": "FeS2", "densite": 5.0},
            {"nom": "Bornite", "formule": "Cu5FeS4", "densite": 5.1},
            {"nom": "Barite", "formule": "BaSO4", "densite": 4.5},
            {"nom": "Galène", "formule": "PbS", "densite": 7.5},
            {"nom": "Gangue", "densite": 3.2,
             "composition": {"Cu": 0.0, "Pb": 0.0, "Fe": 0.0, "S": 0.01}},
        ],
        "analyses": {"Cu": 0.04, "Pb": 0.02, "Fe": 0.02, "S": 0.05},
        "porosite": 0.03,
    },
]


def _composition_mineral(mineral: Dict, elements: Sequence[str]) -> Dict[str, float]:
    """Fractions massiques d'un minéral, restreintes aux ``elements`` analysés.

    Si ``mineral`` fournit une composition explicite (cas de la gangue), elle
    est utilisée ; sinon la composition est calculée depuis ``formule`` via
    :func:`composition_chimique`. Les éléments absents valent 0.
    """
    if "composition" in mineral:
        comp = mineral["composition"]
    else:
        comp = composition_chimique(mineral["formule"])
    return {el: float(comp.get(el, 0.0)) for el in elements}


def lister_scenarios_densite() -> List[Dict]:
    """Scénarios de l'atelier 3.6, résolus pour l'interface (matrice ``A``).

    Pour chaque scénario, chaque minéral reçoit une composition complète sur
    les éléments analysés (``composition`` : ``{element: fraction}``), prête à
    assembler la matrice ``A`` côté widget.
    """
    out: List[Dict] = []
    for sc in SCENARIOS_DENSITE:
        elements = list(sc["elements"])
        mineraux = []
        for m in sc["mineraux"]:
            mineraux.append({
                "nom": m["nom"],
                "formule": m.get("formule", ""),
                "densite": float(m["densite"]),
                "composition": _composition_mineral(m, elements),
                "gangue": "composition" in m and m["nom"].lower().startswith("gangue"),
            })
        out.append({
            "id": sc["id"],
            "nom": sc["nom"],
            "elements": elements,
            "mineraux": mineraux,
            "analyses": {el: float(sc["analyses"][el]) for el in elements},
            "porosite": float(sc["porosite"]),
        })
    return out


def masse_volumique_melange(
    teneurs: ArrayLike,
    densites: ArrayLike,
    porosite: float = 0.0,
) -> float:
    """Calcule la masse volumique apparente d'un mélange minéral.

    Parameters
    ----------
    teneurs : array-like
        Teneurs massiques de chaque minéral, en pourcentage (g par 100 g).
    densites : array-like
        Masses spécifiques de chaque minéral (g/cm³), même longueur que
        ``teneurs``.
    porosite : float, optional
        Porosité (fraction de vide, entre 0 et 1). Défaut : 0.

    Returns
    -------
    float
        Masse volumique apparente (g/cm³). Renvoie 0.0 si le volume total
        est nul.

    Examples
    --------
    >>> masse_volumique_melange([8.57, 7.46, 37.09, 46.88],
    ...                         [4.2, 4.1, 5.0, 2.68])  # doctest: +ELLIPSIS
    3.4...
    """
    t = np.asarray(teneurs, dtype=float)
    d = np.asarray(densites, dtype=float)

    if t.shape != d.shape:
        raise ValueError("teneurs et densites doivent avoir la même longueur.")

    with np.errstate(divide="ignore", invalid="ignore"):
        volumes = np.where(d > 0, t / d, 0.0)
    volume_total = float(np.sum(volumes))
    if volume_total <= 0.0:
        return 0.0

    masse_totale = float(np.sum(t))
    rho = masse_totale / volume_total
    return rho * (1.0 - porosite)


def fractions_volumiques(
    teneurs: ArrayLike,
    densites: ArrayLike,
) -> np.ndarray:
    """Renvoie la fraction volumique occupée par chaque minéral.

    Parameters
    ----------
    teneurs : array-like
        Teneurs massiques (%).
    densites : array-like
        Masses spécifiques (g/cm³).

    Returns
    -------
    np.ndarray
        Fractions volumiques (somme = 1), ou zéros si volume total nul.
    """
    t = np.asarray(teneurs, dtype=float)
    d = np.asarray(densites, dtype=float)
    with np.errstate(divide="ignore", invalid="ignore"):
        volumes = np.where(d > 0, t / d, 0.0)
    total = float(np.sum(volumes))
    if total <= 0.0:
        return np.zeros_like(volumes)
    return volumes / total

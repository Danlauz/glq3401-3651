"""Jeux de données utilisés dans les exercices du cours.

Ces fonctions retournent des objets simples (numpy.ndarray + dict ou
``dataclass``) faciles à manipuler en notebook. Les données sont
*embarquées dans le code* — pas de fichier externe à télécharger.

Origine des données : exercices bruts du cours (cf. ``Exercices_Brutes/``).
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np


@dataclass(frozen=True)
class JeuDonnees1D:
    """Jeu de données 1D : carottes le long d'un forage."""
    x: np.ndarray
    z: np.ndarray
    nom: str
    unite: str


@dataclass(frozen=True)
class JeuDonnees2D:
    """Jeu de données 2D : valeurs aux positions (x, y)."""
    x: np.ndarray
    y: np.ndarray
    z: np.ndarray
    nom: str
    unite: str


@dataclass(frozen=True)
class JeuDonneesBivariee:
    """Jeu de données bivarié : deux variables Z et Y aux mêmes positions."""
    x: np.ndarray
    y: np.ndarray
    z: np.ndarray   # première variable
    y_var: np.ndarray   # seconde variable
    nom: str


def load_carottes_cu() -> JeuDonnees1D:
    """Sept carottes de Cu (%) le long d'un forage.

    Origine : `C7_Variogram (2).pdf`, question 1.
    Carottes consécutives de longueur 3 m.

    Returns
    -------
    JeuDonnees1D
        Positions ``x`` (m) et teneurs ``z`` (%).
    """
    # Positions au centre de chaque carotte de 3 m
    x = np.array([1.5, 4.5, 7.5, 10.5, 13.5, 16.5, 19.5])
    z = np.array([1.5, 1.6, 1.8, 3.5, 2.8, 3.5, 3.9])
    return JeuDonnees1D(x=x, z=z, nom="Carottes Cu (forage 1D)", unite="% Cu")


def load_epaisseur_veine() -> JeuDonnees2D:
    """Épaisseur d'une veine minéralisée sur une grille irrégulière 2D.

    Origine : `C7_Variogram (2).pdf`, question 2.

    Returns
    -------
    JeuDonnees2D
        Coordonnées ``(x, y)`` en mètres, épaisseur ``z`` en mètres.
    """
    # Coordonnées et valeurs extraites de la figure du PDF.
    # NOTE : les coordonnées sont approximées au mieux à partir du PDF ;
    # à valider avec D. Lauzon si une grille de référence existe.
    pts = [
        # (x,   y,    z)
        (40,  220, 2.4), (80,  220, 3.3), (140, 220, 2.4), (200, 220, 3.5),
        (60,  200, 3.3),
        (40,  140, 2.3), (180, 140, 2.2),
        (60,  100, 2.7), (200, 100, 2.7),
        (60,   60, 2.2), (100,  60, 2.1), (140,  60, 3.2),
        (180,  60, 2.0), (220,  60, 2.6),
        (40,   40, 2.3), (80,   40, 2.0), (120,  40, 2.1),
        (160,  40, 2.5), (200,  40, 2.9),
        (60,   20, 2.6),
    ]
    arr = np.array(pts)
    return JeuDonnees2D(
        x=arr[:, 0],
        y=arr[:, 1],
        z=arr[:, 2],
        nom="Épaisseur de veine minéralisée",
        unite="m",
    )


def load_cokrigeage_zy() -> JeuDonneesBivariee:
    """Jeu de données 2D bivarié Z(x) / Y(x) pour le cokrigeage.

    Origine : `C10_Cokriging.pdf`, question 3 (figure 7×6).
    Les moyennes empiriques fournies dans le corrigé sont
    ``m_Z = 3.7`` et ``m_Y = 4.33``.

    Returns
    -------
    JeuDonneesBivariee
        Z et Y aux mêmes positions ; ``np.nan`` quand une variable manque.
    """
    # Note : à compléter en phase 5 à partir de la figure du PDF.
    # Implémentation laissée volontairement minimale pour le pilote C07/C09.
    raise NotImplementedError(
        "Jeu de données cokrigeage Z/Y à compléter en phase 5 (chap. C10)."
    )

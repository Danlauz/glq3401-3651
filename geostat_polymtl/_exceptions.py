"""Exceptions et avertissements de la librairie geostat_polymtl."""
from __future__ import annotations


class GeostatError(Exception):
    """Erreur générique de la librairie."""


class GeostatLimitExceeded(GeostatError):
    """Levé quand un plafond pédagogique est dépassé.

    Exemples : tenter un krigeage sur une grille plus grande que la limite
    autorisée par le widget, ou un nombre de réalisations dépassant le seuil.
    """


class GeostatNonReproductibleWarning(UserWarning):
    """Avertissement émis lorsqu'une fonction stochastique est appelée sans
    générateur explicite et qu'aucune graine globale n'a été fixée.

    Cet avertissement est *promu en erreur* dans la suite de tests (cf.
    ``pytest.ini``) pour garantir la reproductibilité du code pédagogique.
    """

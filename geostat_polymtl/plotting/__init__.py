"""Helpers de tracé : palette du cours, templates Matplotlib et Plotly.

Les figures statiques du livre et les figures pré-calculées des widgets
doivent passer par ce module pour garder un style cohérent.
"""

from geostat_polymtl.plotting.style import (
    PALETTE_POLYMTL,
    appliquer_style_matplotlib,
    plotly_template_polymtl,
)

__all__ = [
    "PALETTE_POLYMTL",
    "appliquer_style_matplotlib",
    "plotly_template_polymtl",
]

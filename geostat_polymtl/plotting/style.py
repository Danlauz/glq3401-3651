"""Palette et templates de style cohérents avec le site et le livre.

Le module importe ``matplotlib`` et ``plotly`` de façon **paresseuse**,
à l'intérieur des fonctions, pour que la lib coeur reste utilisable sans
ces dépendances optionnelles.
"""
from __future__ import annotations

# Palette inspirée du thème "cosmo" de Quarto (bleu signature de Bootstrap)
# avec quelques accents cohérents avec l'identité visuelle Polytechnique Montréal.
PALETTE_POLYMTL = {
    "primaire":   "#0d4d92",   # bleu Polymtl
    "secondaire": "#e87722",   # orange Polymtl
    "neutre":     "#3c3c3c",
    "succes":     "#2da44e",
    "attention":  "#bf8700",
    "danger":     "#cf222e",
    "info":       "#0969da",
    "fond_clair": "#f6f8fa",
    "fond_sombre": "#161b22",
}


def appliquer_style_matplotlib() -> None:
    """Applique les rcParams matplotlib du projet à la session courante.

    Effet : police, taille, palette, grille discrète, marges.

    Importe matplotlib uniquement quand on l'appelle (extra ``[plot]``).
    """
    try:
        import matplotlib as mpl
    except ImportError as e:
        raise ImportError(
            "matplotlib n'est pas installé. Installer avec : "
            "pip install geostat_polymtl[plot]"
        ) from e

    mpl.rcParams.update({
        "figure.dpi":        110,
        "savefig.dpi":       150,
        "figure.figsize":    (6.5, 4.2),
        "axes.titlesize":    11,
        "axes.labelsize":    10,
        "xtick.labelsize":   9,
        "ytick.labelsize":   9,
        "axes.grid":         True,
        "grid.alpha":        0.25,
        "grid.linestyle":    "--",
        "axes.prop_cycle":   mpl.cycler(color=[
            PALETTE_POLYMTL["primaire"],
            PALETTE_POLYMTL["secondaire"],
            PALETTE_POLYMTL["succes"],
            PALETTE_POLYMTL["danger"],
            PALETTE_POLYMTL["info"],
            PALETTE_POLYMTL["attention"],
        ]),
        "axes.spines.top":    False,
        "axes.spines.right":  False,
    })


def plotly_template_polymtl() -> dict:
    """Retourne un dict de template Plotly cohérent avec le site.

    Usage :

        >>> import plotly.io as pio
        >>> from geostat_polymtl.plotting import plotly_template_polymtl
        >>> pio.templates["polymtl"] = plotly_template_polymtl()
        >>> pio.templates.default = "polymtl"
    """
    try:
        import plotly.graph_objects as go
    except ImportError as e:
        raise ImportError(
            "plotly n'est pas installé. Installer avec : "
            "pip install geostat_polymtl[plot]"
        ) from e

    return go.layout.Template(
        layout=go.Layout(
            font=dict(family="system-ui, -apple-system, sans-serif", size=12),
            colorway=[
                PALETTE_POLYMTL["primaire"],
                PALETTE_POLYMTL["secondaire"],
                PALETTE_POLYMTL["succes"],
                PALETTE_POLYMTL["danger"],
                PALETTE_POLYMTL["info"],
                PALETTE_POLYMTL["attention"],
            ],
            plot_bgcolor="white",
            paper_bgcolor="rgba(0,0,0,0)",
            xaxis=dict(showgrid=True, gridcolor="rgba(60,60,60,0.12)", zeroline=False),
            yaxis=dict(showgrid=True, gridcolor="rgba(60,60,60,0.12)", zeroline=False),
            margin=dict(l=50, r=20, t=40, b=50),
            legend=dict(bgcolor="rgba(255,255,255,0.7)", bordercolor="rgba(0,0,0,0.1)",
                        borderwidth=1),
        )
    ).to_plotly_json()

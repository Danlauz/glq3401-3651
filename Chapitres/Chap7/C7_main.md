---
title: "Chapitre 7 - Variance de bloc, de dispersion et d'estimation"
abstract: |
  Ce chapitre introduit les principes de variances de bloc, de dispersion et d’estimation. En s’appuyant sur le variogramme, nous explorerons la manière dont la structure spatiale des teneurs influence la variabilité observée à différentes échelles. Les méthodes de calcul des variances sont présentées, incluant l’utilisation d’abaques, et appliquées à des décisions pratiques telles que l’homogénéisation du minerai et la gestion de la variabilité au concentrateur. Le chapitre traite également de la variance d’estimation, en lien avec la configuration d’échantillonnage et l’anisotropie du variogramme, permettant une évaluation plus précise de l’incertitude associée aux modèles de ressources.

project:
  output-dir: exports  # <-- dossier de sortie pour tous les formats

format:
  pdf:
    output-file: ./exports/Chapitre7.pdf
    documentclass: article
    classoption: [10pt, oneside, twocolumn]
    geometry: margin=1in
    markdown_extensions: ["+fenced_divs"]

downloads:
  - file: Chapitre7.pdf    # simple nom de fichier, pas de chemin
    title: PDF
---

:::{important}
### Objectifs d'apprentissage
-   Comprendre les notions de variance de bloc et de variance de dispersion et décrire le lien avec le
variogramme et la continuité spatiale qu'il exprime;

-   Calculer les variances de bloc et variances de dispersion avec les abaques ;

-   Effectuer la sélection de la meilleure alternative pour homogénéiser le minerai ;

-   Recommander un sens de déplacement d'une pelle dans une mine pour minimiser la variabilité au concentrateur ;

-   Prévoir l'impact sur la variabilité au concentrateur d'exploiter simultanément différentes portions du gisement ;

-   Comprendre la notion de variance d'estimation;

-   Calculer des variances d'estimation pour une configuration d'estimation et le modèle de variogramme;

-   Identifier le lien entre patron d'échantillonnage et l'anisotropie du variogramme.

:::

# Introduction

La variabilité spatiale des teneurs dans un gisement est un enjeu fondamental en géostatistique minière. Pour la caractériser, on utilise le variogramme qui permet de quantifier la continuité spatiale entre les points d’un champ régionalisé. À partir de cette mesure de la structure spatiale, trois types de variances jouent un rôle majeur dans la compréhension et la gestion de l’hétérogénéité :

- **Variance de bloc** ($\sigma_V^2$) : mesure la variabilité moyenne des teneurs à l’intérieur d’un bloc de dimension donnée $V$. Elle permet d’évaluer la perte d’information liée au passage d’un échantillon ponctuel à un volume (le bloc), et est donc directement liée au variogramme ponctuel des données.

- **Variance de dispersion** ($D(v \mid V)$) : représente la variabilité entre les blocs d’un même ensemble, par exemple dans un tas ou une pile de minerai. Elle informe sur l’hétérogénéité du matériau produit après un certain regroupement spatial. Il s'agit de la dispersion d'un bloc $v$ dans un voleme $V$ fini.

- **Variance d’estimation** ($\sigma_e^2$) : exprime l’incertitude sur la teneur moyenne estimée d’un bloc, en fonction de l’espacement des données et du modèle de variogramme utilisé. Elle est essentielle pour évaluer la précision des modèles de ressources.

Ce chapitre présente ces différentes variances, leurs relations avec le variogramme, ainsi que les méthodes pratiques pour les estimer et les utiliser dans un contexte minier opérationnel.


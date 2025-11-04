---
title: "Chapitre 9 - Géostatistique multivariable"
abstract: |
  Ce chapitre présente les principes fondamentaux de la géostatistique multivariable, avec un accent particulier sur le cokrigeage, extension multivariée du krigeage. Nous abordons la construction et l’interprétation des variogrammes croisés, ainsi que le modèle linéaire de corégionalisation, essentiel à la modélisation conjointe de plusieurs variables. L’objectif est de comprendre quand et comment le cokrigeage peut améliorer l’estimation spatiale, notamment en intégrant des informations issues de variables auxiliaires corrélées. Le chapitre traite également des critères d’admissibilité des modèles et des méthodes de validation croisées adaptées au contexte multivarié, afin d’assurer la qualité et la robustesse des estimations. 

project:
  output-dir: exports  # <-- dossier de sortie pour tous les formats

format:
  pdf:
    output-file: ./exports/Chapitre9.pdf
    documentclass: article
    classoption: [10pt, oneside, twocolumn]
    geometry: margin=1in
    markdown_extensions: ["+fenced_divs"]

downloads:
  - file: Chapitre9.pdf    # simple nom de fichier, pas de chemin
    title: PDF
---

:::{important}
### Objectifs d'apprentissage
-   Comprendre la mécanique du cokrigeage (généralisation du krigeage au cas multivariable) ;

-   Analyser, identifier et expliquer les situations où le cokrigeage peut être utile ;

-   Calculer des variogrammes croisés et covariances croisées ;

-   Définir les paramètres d'un modèle linéaire de corégionalisation et vérifier l'admissibilité du modèle ;

-   Interpréter les résultats d'un cokrigeage et de différentes formes de validation croisées.

:::

# Introduction

Dans de nombreuses situations, plusieurs variables sont mesurées, soit aux mêmes points d’échantillonnage, soit à des points différents. Par exemple, on peut connaître précisément la position du sommet d’un réservoir pétrolier à partir de quelques points, tout en disposant d’une couverture sismique étendue fournissant une estimation plus approximative de cette position. Dans un gisement de cuivre (Cu) et de nickel (Ni), les teneurs de ces deux métaux peuvent être mesurées à chaque point de mesure. En hydrogéologie, il est courant de disposer de mesures de charges hydrauliques à certains points et de transmissivités à un nombre plus restreint d’autres points.

Pour exploiter au mieux ces informations, on considère généralement qu’une variable est prioritaire — appelée la variable principale $Z$ — tandis que les autres sont considérées comme secondaires. Afin de simplifier le développement des équations, nous supposerons qu’il n’y a qu’une seule variable secondaire $Y$. L’extension à plusieurs variables secondaires s’effectue directement et ne pose pas de difficultés théoriques particulières.

La question centrale est donc : comment tirer parti de l’information fournie par la variable secondaire pour améliorer l’estimation de la variable principale ? La démarche suivie constitue une généralisation naturelle de celle présentée dans le chapitre consacré au krigeage.

# Mise en contexte sur un cas synthétique
Supposons que l’on ait observé une variable principale sur une grille régulière de 100 m × 100 m, avec un échantillon tous les 10 m dans les deux directions principales. Cela correspond à un total de 100 observations. Par ailleurs, supposons que l’on dispose d’une levée géophysique couvrant l’ensemble de la grille. La [Fig. %s](#C9_Cokrigeage) illustre ce type de configuration et la [Fig. %s](#C9_Corr) présente la corrélation entre les paires de points colocalisés, c'est-à-dire lorsque l'on mesure simultanément la variable principale et la secondaire en une même localisation. 

Il est alors légitime de se demander : la variable secondaire nous apportera-t-elle réellement des informations supplémentaires sur la variable principale ?
Nous verrons prochainement que les calculs associés au cokrigeage sont plus lourds numériquement et peuvent entraîner des problèmes d’admissibilité du modèle théorique. Il est donc primordial de ne se lancer dans cette tâche que si l’on est convaincu que le gain attendu en vaut la peine. 

Nous aborderons ces notions au cours de la lecture.

```{figure} images/C9_Cokrigeage.png
:label: C9_Cokrigeage
:align: center
Exemple de données multivariables. La variable principale est observée qu'a un nombre limité d'emplacements tandis que la variable secondaire est présente en tous les points.
```

```{figure} images/C9_Corr.png
:label: C9_Corr
:align: center
Exemple de données multivariables. Nuage de points des données observées et leur corrélation.
```


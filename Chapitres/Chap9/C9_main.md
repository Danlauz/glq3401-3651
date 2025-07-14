---
title: "Chapitre 9 - Géostatistique multivariables"
abstract: |
  Ce chapitre présente les principes fondamentaux de la géostatistique multivariables, avec un focus particulier sur le cokrigeage, extension multivariée du krigeage classique. Nous abordons la construction et l’interprétation des variogrammes croisés, ainsi que le modèle linéaire de corégionalisation, essentiel pour la modélisation conjointe de plusieurs variables. L’objectif est de comprendre quand et comment le cokrigeage peut améliorer l’estimation spatiale, notamment en intégrant l’information de variables auxiliaires corrélées. Le chapitre traite également des critères d’admissibilité des modèles et des méthodes de validation croisées adaptées au contexte multivarié, afin d’assurer la qualité et la robustesse des estimations. 

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
-   Comprendre la mécanique du cokrigeage(généralisation du krigeage au cas multivariable) ;

-   Analyser et expliquer les situations où le cokrigeagepeut être utile ;

-   Calculer des variogrammescroisés et covariances croisées ;

-   Définir les paramètres d'un modèle linéaire de corégionalisation et vérifier l'admissibilité du modèle ;

-   Interpréter les résultats d'un cokrigeageet de différentes formes de validation croisées.

:::

# Introduction

Dans de nombreuses situations, plusieurs variables sont mesurées, soit aux mêmes points d’échantillonnage, soit en des points différents. Par exemple, on peut connaître précisément la position du sommet d’un réservoir pétrolier en quelques points, tout en disposant d’une couverture sismique étendue fournissant une estimation plus approximative de cette position. Dans un gisement de cuivre (Cu) et de nickel (Ni), les teneurs des deux métaux peuvent être relevées à chaque point de mesure. En hydrogéologie, il est courant de disposer de mesures de charges hydrauliques en certains points et de transmissivités en un nombre plus restreint d’autres points.

Pour exploiter au mieux ces informations, on considère généralement qu’une variable est prioritaire — appelée variable principale $Z$ — tandis que les autres sont considérées comme secondaires. Afin de simplifier l’exposé, nous supposerons ici qu’il n’y a qu’une seule variable secondaire $Y$, sans que cela limite la portée du modèle, car l’extension à plusieurs variables secondaires s’effectue de manière directe et ne pose pas de difficultés théoriques particulières.

La question centrale est donc : comment tirer parti de l’information apportée par la variable secondaire pour améliorer l’estimation de la variable principale ? La démarche suivie constitue une généralisation naturelle de celle présentée dans le chapitre consacré au krigeage.



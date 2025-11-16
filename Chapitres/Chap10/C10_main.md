---
title: "Chapitre 10 - Krigeage d’indicatrices"
abstract: |
  Ce chapitre présente en détail la méthode du krigeage d’indicatrices (KI), une approche géostatistique résolument non linéaire, conçue pour (1) gérer des phénomènes naturels hautement variables sans exclure les valeurs extrêmes ni recourir à des transformations non linéaires susceptibles de déformer la structure statistique, et (2) estimer directement la distribution locale à chaque emplacement non échantillonné afin d’obtenir simultanément une estimation de la variable d’intérêt et de sa variance conditionnelle pour la gestion du risque. Grâce à cette non-linéarité, le KI permet de modéliser efficacement des phénomènes présentant une structure non gaussienne, une forte asymétrie ou une continuité spatiale différente entre les valeurs extrêmes, alors que les méthodes linéaires traditionnelles comme le krigeage ordinaire (KO) et le krigeage simple (KS) montrent leurs limites. Le chapitre compare ainsi le KI à ces approches linéaires afin de mettre en évidence leurs hypothèses, leurs forces et leurs limites. Particulièrement adapté à l’estimation de probabilités de dépassement de seuils, à la caractérisation de l’incertitude locale et au calcul d’écarts-types conditionnels, le KI constitue un outil puissant en géologie minière, en hydrogéologie et en ingénierie environnementale. L’objectif est de donner au lecteur une compréhension claire et opérationnelle de cette méthode non linéaire ainsi que de ses usages pratiques.

project:
  output-dir: exports  # <-- dossier de sortie pour tous les formats

format:
  pdf:
    output-file: ./exports/Chapitre10.pdf
    documentclass: article
    classoption: [10pt, oneside, twocolumn]
    geometry: margin=1in
    markdown_extensions: ["+fenced_divs"]

downloads:
  - file: Chapitre10.pdf    # simple nom de fichier, pas de chemin
    title: PDF
---

:::{important}
### Objectifs d'apprentissage
-   Décrire la différence entre une méthode linéaire de krigeage (KO et KS) et une méthode non linéaire (KI) ;

-   Comprendre les hypothèses à la base du KI ;

-   Expliquer les avantages et inconvénients du KI ;

-   Pouvoir utiliser les résultats du KI pour en extraire des informations utiles (p. ex. probabilités de dépassement, écart-type conditionnel).

:::

# Introduction

On a vu précédemment, dans le chapitre 8, que le krigeage de $Z(x)$ fournit la meilleure estimation linéaire possible, c’est-à-dire l’estimation à variance minimale parmi toutes les combinaisons linéaires admissibles. Il fournit également une variance d’estimation qui dépend à la fois de la continuité spatiale — décrite par le variogramme — et de la configuration ainsi que de la quantité d’information disponible.

Cependant, dans de nombreuses situations pratiques, une simple estimation ponctuelle, accompagnée de sa variance, ne suffit pas. Par exemple :

- **Exploitation minière sélective** : on souhaite évaluer, pour différentes teneurs de coupure, le tonnage et la teneur récupérable du gisement. Cela requiert de connaître, localement, la proportion de blocs dépassant la teneur de coupure, ainsi que la distribution des teneurs.
- **Contexte environnemental** : il est essentiel d’estimer, à tout moment dans le domaine, la probabilité qu’une concentration dépasse un seuil réglementaire ou une norme.
- **Mécanique des roches** : on peut déterminer la probabilité que la densité de fractures d’une certaine famille dépasse un seuil critique afin d’évaluer la stabilité d’une excavation.

Dans ces cas, l’intérêt porte non seulement sur l’estimation moyenne, mais aussi — et surtout — sur la distribution locale de la variable et sur les probabilités de dépassement, ce qui dépasse le cadre strictement linéaire du krigeage classique.

Dans le cas où les valeurs $Z(x)$ suivent une distribution normale, les résultats du krigeage correspondent directement aux paramètres d’une loi normale conditionnelle définie par les observations utilisées pour l’estimation. Autrement dit, l’estimation obtenue représente la moyenne conditionnelle, tandis que la variance de krigeage correspond à la variance conditionnelle de cette loi normale. Il devient alors possible d’utiliser les tables de la loi normale (ou sa fonction de répartition) pour calculer toutes les probabilités nécessaires afin de répondre aux questions posées précédemment.

Lorsque les $Z(x)$ ne suivent pas une distribution normale, il est courant d’appliquer une transformation afin de les rendre gaussiennes avant d’effectuer le krigeage sur les valeurs transformées. Ces transformations peuvent être simples (par exemple, $\log(Z)$) ou entièrement empiriques, comme les transformations graphiques qui attribuent à chaque valeur originale une valeur normale en fonction de son rang dans la distribution ordonnée de $Z$.

Cette approche donne généralement de bons résultats, mais présente deux limites importantes :

1. La transformation garantit, par construction, une distribution marginale normale, mais elle n’assure pas que les couples, triplets ou ensembles multivariés suivent une loi binormale, trinormale ou multinormale. Or, le calcul de probabilités à partir des résultats du krigeage suppose justement que la distribution multivariée soit effectivement multinormale.
2. Même dans le cas strictement normal, la formulation d’énoncés probabilistes pour des variables aléatoires définies sur des supports différents de ceux des observations pose problème. 

Pour contourner ces difficultés, Journel (1984) a proposé d’aborder le problème de manière aussi peu paramétrique que possible. La méthode qu’il a développée est désormais connue sous le nom de krigeage d’indicatrices.

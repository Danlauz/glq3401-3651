---
title: "Chapitre 10 - Krigeage d’indicatrices"
abstract: |
  Ce chapitre présente la méthode du krigeage d’indicatrices (KI), une approche non linéaire permettant de modéliser des variables aléatoires en tenant compte de leur distribution non normale. Nous comparons le KI aux méthodes linéaires classiques de krigeage ordinaire (KO) et krigeage simple (KS), en mettant en lumière ses hypothèses, ses avantages et ses limites. Le krigeage d’indicatrices offre des outils puissants pour estimer des probabilités de dépassement de seuils et calculer des écarts-types conditionnels, particulièrement utiles en contexte minier et environnemental. Ce chapitre vise à donner au lecteur les connaissances nécessaires pour appliquer efficacement le KI et interpréter ses résultats dans diverses situations pratiques. 

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

On a vu précédemment que le krigeage de $Z(x)$ fournissait la meilleure estimation linéaire possible (meilleure au sens de variance d'estimation minimale). Le krigeage fournit également une variance d'estimation qui est fonction de la continuité spatiale, telle qu'exprimée par le variogramme, et de la configuration (et de la quantité) de l'information disponible.

Parfois, on veut connaître plus qu'un estimé et qu'une variance d'estimation. Exemples :

- Dans une mine avec exploitation sélective, on veut connaître localement le tonnage et la teneur du gisement en fonction de diverses teneurs de coupure. Il faut connaître la proportion des blocs excédant la teneur de coupure et la distribution des teneurs.
- En environnement, on veut connaître en tout point la probabilité qu'un seuil ou qu'une norme soit excédée.
- Dans une excavation dans un massif rocheux, on veut connaître la probabilité que la densité de fractures d'une certaine famille excède un seuil donné.

Dans le cas d'une distribution normale des $Z(x)$, les paramètres obtenus par krigeage correspondent à la moyenne et la variance d'une loi normale conditionnée par les valeurs prises par les observations ayant servi au krigeage. On peut donc utiliser les tables de la loi normale pour calculer les probabilités requises pour répondre aux questions précédentes.

Lorsque les $Z(x)$ ne suivent pas une distribution normale, il est de pratique courante d'effectuer une transformation qui permette d'obtenir une loi normale et d'effectuer le krigeage des variables transformées. Ces transformations peuvent être des fonctions simples (ex. $\log(Z)$) ou ne pas même avoir une forme analytique (i.e. transformation dite graphique qui associe à chaque valeur originale une valeur normale selon son rang dans la séquence ordonnée des $Z$).

Cette approche fonctionne généralement assez bien sous deux réserves toutefois :

1. La transformation assure, par construction, la loi normale. Elle n'assure toutefois pas que les couples, les triplets, etc. suivent une loi binormale, trinormale, ... multinormale. Pour pouvoir calculer les probabilités à partir des krigeages, la distribution multinormale doit être respectée.
2. Même dans le cas normal, le fait de devoir fournir des énoncés de nature probabiliste pour des variables aléatoires définies sur des supports différents de ceux des observations pose problème. Différents modèles ont été proposés pour effectuer ces changements de support. Avec le krigeage d'indicatrices, on utilise souvent la correction affine vue précédemment.

Journel (1984) a eu l'idée d'attaquer le problème précédent par une méthode la moins paramétrique possible. On a donné le nom de **krigeage d'indicatrices** à la méthode qu'il a développée.

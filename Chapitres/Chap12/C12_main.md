---
title: "Chapitre 12 - Simulation de faciès"
abstract: |
 Ce chapitre présente les principales méthodes de simulation de faciès utilisées en géostatistique. Sont abordées les techniques classiques telles que la simulation d’indicatrice, la simulation gaussienne tronquée, la simulation plurigaussienne tronquée, la méthode de Gibbs et la simulation multipoints. Chaque méthode est décrite en détail avec ses avantages, ses limitations et ses applications spécifiques. Une attention particulière est portée à l’utilisation des covariances d’indicatrices pour modéliser la géométrie des faciès et à la façon d’intégrer les observations conditionnelles à travers la méthode de Gibbs. Ce chapitre vise à fournir les bases théoriques et pratiques nécessaires à la mise en œuvre et à l’interprétation des simulations de faciès dans le cadre de problèmes en géosciences.
 

project:
  output-dir: exports  # <-- dossier de sortie pour tous les formats

format:
  pdf:
    output-file: ./exports/Chapitre11.pdf
    documentclass: article
    classoption: [10pt, oneside, twocolumn]
    geometry: margin=1in
    markdown_extensions: ["+fenced_divs"]

downloads:
  - file: Chapitre11.pdf    # simple nom de fichier, pas de chemin
    title: PDF
---

:::{important}
### Objectifs d'apprentissage
-   Décrire le fonctionnement de méthodes de simulation de faciès (simulation d'indicatrice, gaussien tronqué, plurigaussien tronqué, Gibbs, multipoints) ;

-   Décrire les avantages et inconvénients et limitations de chaque méthode ;

-   Associer les covariances d'indicatrices à des drapeaux de codage ;

-   Associer des images simulées à des drapeaux de codage ;

-   Décrire la méthode de Gibbs pour obtenir des réalisations conditionnelles aux faciès observés.

:::

# Introduction

Dans le chapitre précédent, nous avons exploré diverses méthodes permettant de simuler des champs continus, adaptés notamment à la modélisation de variables physiques ou chimiques dans les gisements miniers. Cependant, en géologie et en géostatistique minière, il est souvent nécessaire de modéliser des variables qualitatives, dites indicatrices ou catégorielles, qui représentent la présence ou l’absence d’un faciès donné (par exemple, un type de roche, une lithologie ou une zone minéralisée).

Simuler ces variables indicatrices pose un défi différent de celui des variables continues, car elles ne prennent que des valeurs discrètes (typiquement 0 ou 1) et doivent reproduire la distribution spatiale complexe des faciès dans le sous-sol. La simulation de faciès est essentielle pour évaluer la géométrie et l’extension spatiale des unités géologiques, ce qui impacte directement la modélisation des ressources et la planification de l’exploitation.

Plusieurs approches sont utilisées pour simuler ces variables indicatrices :

- **Modèles booléens** : qui génèrent des objets géométriques simples (cubes, ellipsoïdes, sphères, etc.) placés aléatoirement dans l’espace. Cette méthode est intuitive mais peut manquer de réalisme pour des faciès complexes.

- **Points marqués** : une extension des modèles booléens où chaque objet est défini par un ensemble de paramètres (taille, forme, orientation), offrant plus de flexibilité pour modéliser la diversité des faciès.

- **Méthodes stochastiques basées sur des variables continues** : ces techniques codent les variables indicatrices à partir de variables aléatoires continues, ce qui permet d’utiliser les outils de la géostatistique classique.

Ce chapitre se concentre exclusivement sur cette dernière famille, qui constitue aujourd’hui la base des simulations géostatistiques de faciès. Trois grandes catégories de méthodes y sont distinguées :

- La simulation séquentielle d’indicatrices, qui génère les valeurs indicatrices en tenant compte des dépendances spatiales conditionnelles.

- La simulation gaussienne tronquée, qui repose sur la simulation d’un champ gaussien continu puis son découpage selon des seuils pour obtenir les indicatrices.

- La méthode plurigaussienne, qui combine plusieurs champs gaussiens pour modéliser des faciès multiples avec des relations spatiales complexes.

L’objectif est de comprendre les fondements de ces méthodes, leurs avantages et limites, ainsi que leur mise en œuvre pratique dans la modélisation des faciès miniers.

Une introduction concise aux méthodes multipoints est également proposée, accompagnée d’illustrations et d’images pour en montrer la grande versatilité. Ces méthodes reposent sur l’utilisation de patterns géologiques complexes extraits de données d’apprentissage (images ou cartes), permettant de reproduire de manière réaliste des structures spatiales souvent inaccessibles aux approches classiques. L’objectif est d’offrir une compréhension intuitive du principe multipoint et de ses applications en simulation de faciès.


---
title: "Chapitre 8 - Krigeage"
abstract: |
  Ce chapitre présente le krigeage, une méthode d’estimation linéaire largement utilisée en géostatistique. Après avoir introduit les principes fondamentaux, nous détaillons les différences entre krigeage simple et ordinaire, ainsi que la dérivation des équations associées. Nous expliquons comment construire et résoudre les systèmes de krigeage, calculer les estimations et leurs variances, et analyser les propriétés mathématiques et pratiques du krigeage. Enfin, nous abordons l’utilisation de la validation croisée pour évaluer la qualité des modèles de variogramme et affiner les estimations.
 

project:
  output-dir: exports  # <-- dossier de sortie pour tous les formats

format:
  pdf:
    output-file: ./exports/Chapitre8.pdf
    documentclass: article
    classoption: [10pt, oneside, twocolumn]
    geometry: margin=1in
    markdown_extensions: ["+fenced_divs"]

downloads:
  - file: Chapitre8.pdf    # simple nom de fichier, pas de chemin
    title: PDF
---

:::{important}
### Objectifs d'apprentissage
-   Expliquer les différences entre krigeage simple et ordinaire ;

-   Être capable de dériver les équations du krigeage ;

-   Construire et résoudre les systèmes de krigeage simple et ordinaire, calculer la teneur estimée et la variance de krigeage ;

-   Expliquer les différentes propriétés du krigeage ;

-   Pouvoir utiliser et interpréter la validation croisée par krigeage en lien avec le modèle de variogramme.

:::

# Introduction

Le krigeage n’est pas une méthode comme les autres : c’est l’estimateur optimal parmi tous les estimateurs linéaires, au sens où il minimise la variance d’estimation. Si l’on peut mesurer l’erreur associée à chaque estimation, pourquoi ne pas choisir la combinaison qui la rend la plus petite ? C’est exactement ce que fait le krigeage.

## Pourquoi utiliser le krigeage ?

Le krigeage est une méthode d’interpolation spatiale fondée sur une idée simple mais puissante : des points proches dans l’espace ont tendance à avoir des valeurs similaires. En modélisant cette relation à l’aide d’un variogramme, on peut estimer une valeur à un endroit non échantillonné en tenant compte à la fois de la distance aux données et de leur redondance.

Contrairement à des méthodes comme l’inverse de la distance ou la moyenne locale, le krigeage offre deux avantages essentiels :

Il fournit l’estimation la plus précise possible (au sens linéaire),

Et surtout, il donne une mesure de l’incertitude de cette estimation.

Autrement dit, le krigeage ne se contente pas de prédire une valeur, il dit aussi à quel point on peut lui faire confiance. C’est cette capacité à combiner précision et fiabilité qui en fait un outil central de la géostatistique.

## Les grands types de krigeage

Il existe de nombreuses variantes du krigeage, adaptées à différents contextes et types de données. On distingue principalement deux grandes familles :

### Krigeage stationnaire

Basé sur l’hypothèse de **stationnarité d’ordre 2** (moyenne constante, covariance dépendant uniquement de la distance), cette famille inclut :

- **Krigeage simple** : la moyenne est connue et constante.
- **Krigeage ordinaire** : la moyenne est inconnue mais supposée constante localement.
- **Krigeage universel (ou avec dérive)** : la moyenne varie dans l’espace selon une tendance modélisée (ex. polynôme) nommée dérive. La dérive est déterministe.

### Krigeage non stationnaire ou avancé

Lorsque l’hypothèse de stationnarité n’est plus valable, ou que les besoins analytiques sont plus complexes, on fait appel à des formes de krigeage dites non stationnaires ou avancées. Ces méthodes permettent d’introduire des variables explicatives, de modéliser des tendances, ou encore de traiter des données non continues.

- **Krigeage avec dérive externe (KED)** : la moyenne est modélisée à partir d’une ou plusieurs variables auxiliaires spatialement corrélées (par exemple, l’altitude ou la géologie).
- **Co-krigeage** : exploite simultanément plusieurs variables corrélées pour améliorer l’estimation de la variable cible.
- **Krigeage bayésien** : introduit une incertitude sur les paramètres du modèle (variogramme, moyenne), modélisée via des distributions a priori.
- **Krigeage disjonctif** et **krigeage d’indicatrices** : adaptés aux données discrètes ou catégorielles, ils permettent d’estimer des probabilités d’appartenance à une classe ou de dépassement de seuil.
- **Krigeage d'**inégalités** ou avec **présence de bruit** : permet d’imposer des conditions sur les résultats (non-négativité, bornes physiques), ou de tenir compte du bruit sur les données dans le modèle.
- **Krigeage avec contraintes** (constrained kriging) : permet d’éviter l'effet de lissage classique du krigeage en imposant une variance cible à la variable interpolée.
- **Krigeage compositionnel** : utilisé pour les données compositionnelles, c’est-à-dire des vecteurs dont les composantes sont non négatives et soumises à une contrainte de somme constante (généralement 1 ou 100 %) comme les proportions minéralogiques, les analyses chimiques ou les concentrations exprimées en pourcentage.

Chacune de ces approches repose sur des hypothèses spécifiques, qui doivent être soigneusement vérifiées en fonction du contexte d’application.

## Le cadre de ce cours

Dans ce cours, nous travaillerons sous l’**hypothèse de stationnarité d’ordre 2** : la moyenne est supposée constante sur l’ensemble du domaine, et la covariance dépend uniquement de la distance. Nous concentrerons donc notre attention sur deux variantes stationnaires classiques :

- Le **krigeage simple** (moyenne connue)
- Le **krigeage ordinaire** (moyenne inconnue)

Le krigeage ordinaire est de loin le plus utilisé dans la pratique. Il offre un bon compromis entre simplicité et robustesse, sans exiger de connaissance préalable de la moyenne régionale.

Les étudiants en **génie géologique** seront également exposés, dans des lectures ultérieures, au krigeage d’indicatrices, une méthode particulièrement adaptée aux problématiques de classification géologique ou d’estimation de probabilités d’excéder un seuil, comme c’est souvent le cas en environnement.

## Étapes du krigeage

Le processus de krigeage se déroule en plusieurs étapes successives :

1. Calcul du variogramme expérimental à partir des données mesurées.
2. Ajustement d’un modèle théorique (ex. sphérique, exponentiel, gaussien, avec ou sans effet de pépite).
3. Résolution du système de krigeage* afin de déterminer les poids d’interpolation associés à chaque donnée.
4. Estimation des valeurs inconnues aux emplacements ciblés, ainsi que de leur variance d’estimation, qui mesure l’incertitude associée.

Nous sommes déjà en mesure de réaliser les étapes **1** et **2**, à la suite de nos lectures précédentes. Nous nous concentrerons donc ici sur les étapes **3** et **4**, qui seront développées en détail dans les prochaines lectures.


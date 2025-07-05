---
title: "Chapitre 0 - Introduction à la géostatistique"
abstract: |
  Cette section présente les concepts fondamentaux de la géostatistique à travers une lecture et des ateliers interactifs conçus dans des Jupyter Notebooks. Elle introduit les notions de base, les grandes questions auxquelles la géostatistique cherche à répondre, ainsi qu’un bref rappel des principes de probabilité et de statistique.

project:
  output-dir: exports  # <-- dossier de sortie pour tous les formats

format:
  pdf:
    output-file: ./exports/Chapitre1.pdf
    documentclass: article
    classoption: [10pt, oneside, twocolumn]
    geometry: margin=1in
    markdown_extensions: ["+fenced_divs"]

downloads:
  - file: Chapitre1.pdf    # simple nom de fichier, pas de chemin
    title: PDF
---

:::{important}
### Objectifs d'apprentissage

- Pouvoir expliquer l'utilité de la géostatistique dans le domaine des géosciences et spécialement en mine;
- Comprendre les principes de base des modèles spatiaux et leur application à l’estimation et la simulation des variables régionalisées;
- Introduire les notions fondamentales de probabilités et statistiques.
:::

# Qu’est-ce que la géostatistique ?

(def-geostat.)
Définition – Géostatistique   
: La **géostatistique** est une branche des statistiques qui s’intéresse à l’analyse, la modélisation et l’estimation de phénomènes naturels ou industriels à partir de données localisées dans l’espace et dans le temps [^1]. Contrairement aux méthodes statistiques classiques, qui supposent l’indépendance des observations, la géostatistique exploite la **corrélation spatiale** pour prédire des valeurs dans des zones non échantillonnées et en quantifier l’incertitude.

```{dropdown} **Corrélation spatiale)**
Décrit la tendance pour des observations proches dans l'espace à avoir des valeurs similaires ou des valeurs corrélées
```

Elle repose sur l’idée que les valeurs mesurées dans un espace géographique ne sont pas aléatoires de façon indépendante, mais **corrélées selon leur proximité spatiale**. Autrement dit, deux points proches dans l’espace ont plus de chances d’avoir des valeurs similaires que deux points éloignés. Ce type de phénomène est modélisé à l’aide de ce qu’on appelle une **variable régionalisée**

```{dropdown} **Variable régionalisée)**
Une variable est dite « régionalisée » lorsque les valeurs qu'elle prend dépendent de sa position dans l'espace et/ou le temps.
```

# 🎯 *Mise en situation : Teneur d'un gisement*

Imaginons un gisement de cuivre. Lorsqu’une carotte de forage révèle une forte teneur en cuivre à une certaine profondeur, il est logique de penser que les zones proches présentent aussi des teneurs relativement élevées — bien que pas exactement les mêmes. En revanche, plus on s’éloigne — par exemple, à plusieurs kilomètres — cette corrélation diminue progressivement, ce qui signifie que les teneurs en cuivre peuvent alors varier considérablement d’un endroit à l’autre.

Ainsi, la distribution des teneurs de cuivre dans un gisement **n’est pas aléatoire**, mais présente une **continuité spatiale**. C’est précisément cette structure que la géostatistique cherche à modéliser, afin de prédire les valeurs dans les zones non échantillonnées. Ce phénomène est vrai pour tout gisement, mais aussi dans de nombreux contextes géologiques tels que la géotechnique, l’hydrogéologie, l’hydrologie, et bien d’autres domaines.

# Objectifs de la géostatistique

La géostatistique s’appuie sur des outils statistiques et probabilistes pour mieux comprendre et exploiter les données d’une variable régionalisée. Son objectif principal est d’analyser la structure spatiale de cette variable à partir des observations disponibles. Cette étape initiale, appelée analyse exploratoire, permet de mettre en évidence les structures sous-jacentes, les tendances présentes dans les données ainsi que la variabilité du phénomène étudié.

Une fois cette structure spatiale identifiée, la géostatistique modélise cette variabilité à l’aide de fonctions spécifiques, comme le variogramme. La modélisation rigoureuse de cette structure est essentielle pour décrire comment les valeurs sont corrélées en fonction de leur distance et de leur position, ce qui sert de fondation pour les étapes suivantes.

Enfin, la géostatistique permet d’estimer ou de simuler les valeurs dans des zones non échantillonnées en s’appuyant sur les modèles précédemment construits. Elle fournit également une mesure quantitative de l’incertitude associée à ces prédictions, un élément clé pour la prise de décision dans de nombreux domaines, comme la gestion des ressources naturelles, l’environnement ou l’ingénierie.

En résumé, la géostatistique transforme des données ponctuelles en informations spatiales cohérentes, fiables et exploitables, tout en intégrant leur variabilité et leur incertitude. C’est un outil puissant d’aide à la décision, encore largement sous-exploité dans de nombreux domaines.

# Origines de la discipline

Le cadre méthodologique de la géostatistique a été formalisé dans les années 1960 par le mathématicien français Georges Matheron, à partir des travaux de l’ingénieur sud-africain Daniel Krige. L’outil emblématique de la discipline, le **krigeage**, tire d’ailleurs son nom de ce dernier.

La géostatistique s’appuie sur deux concepts fondamentaux : **l’effet de support** et **l’effet d’information**. Dans les années 1950, Daniel Krige formula deux questions essentielles à partir de ses observations dans les mines sud-africaines :

- Pourquoi récupère-t-on systématiquement moins de métal lorsqu’on exploite de grands volumes par rapport à de petits volumes ? (*effet de support*)

```{dropdown} **Effet de support)**
Fait référence à la variation de la variance d'une variable régionalisée en fonction de la taille du support (ou de l'unité d'échantillonnage
```
  
- Pourquoi les estimations des ressources tendent-elles à sous-estimer les quantités réellement extraites après exploitation ? (*effet d’information*)

```{dropdown} **Effet d’information)**
Désigne la tendance des méthodes d’estimation à sous-évaluer systématiquement les valeurs réelles d’une ressource ou d’un paramètre. Cela est dû à la quantité limitée d’informations spatiales disponibles dans les échantillons, ce qui entraîne une perte d’information par rapport à la réalité complète du phénomène.
```

Ces interrogations ont jeté les bases de la géostatistique. Nous développerons notre propre interprétation au fil des chapitres suivants, où nous introduirons également les équations associées. Nous aborderons d'abord en détail l'effet de support, suivi de l'effet d'information. Il est important de rappeler qu'on ne souligne jamais assez combien ces deux effets constituent les piliers fondamentaux de la géostatistique.


[^1]: La géostatistique s’étend également à l’analyse et à la modélisation des séries temporelles. Dans ce contexte, la variable d’intérêt n’est plus uniquement la teneur en fonction de la localisation dans un gisement, mais peut aussi être, par exemple, la teneur du minerai acheminé au concentrateur pour traitement. L’objectif est alors d’étudier la stabilité de cette teneur au fil du temps, c’est-à-dire sa variabilité temporelle, afin d’optimiser les procédés chimiques d’extraction du métal.






---
title: "Chapitre 1 - Introduction à la géostatistique"
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

- Pouvoir expliquer l'utilité de la géostatistique dans le domaine des géosciences et spécialement en mine ;
- Comprendre les principes de base des modèles spatiaux et leur application à l’estimation et la simulation des variables régionalisées ;
- Introduire les notions fondamentales de probabilités et statistiques.
:::

# Qu’est-ce que la géostatistique ?

La **géostatistique** est une branche des statistiques qui se concentre sur l'analyse, la modélisation et l'estimation de phénomènes naturels à partir de données localisées dans l'espace (et parfois dans le temps) [^1]. Contrairement aux méthodes statistiques classiques qui supposent l'indépendance des observations, la géostatistique exploite la corrélation spatiale. Cette corrélation décrit la dépendance spatiale entre les valeurs d'une même variable en différents endroits, signifiant que plus deux points sont proches, plus leurs valeurs ont tendance, en moyenne, à être semblables.

```{dropdown} **Corrélation spatiale)**
Décrit la dépendance spatiale entre les valeurs d’une même variable en différents endroits de l’espace
```

Ainsi, la géostatistique part du principe que les valeurs mesurées dans un espace géographique ne sont pas réparties de manière aléatoire et indépendante, mais de manière structurée. Ce type de phénomène est modélisé à l'aide d'une **variable aléatoire régionalisée**

```{dropdown} **Variable régionalisée)**
Une variable est dite « régionalisée » lorsque les valeurs qu'elle prend dépendent de sa position dans l'espace et/ou le temps.
```

# 🎯 *Mise en situation : Teneur d'un gisement*

Imaginons un gisement de cuivre. Lorsqu'une carotte de forage révèle une forte teneur en cuivre à une certaine profondeur, il est logique de penser que les zones avoisinantes présentent également des teneurs relativement élevées, même si elles ne sont pas identiques. Cependant, plus on s'éloigne — de quelques centaines de mètres à plusieurs kilomètres par exemple — plus la corrélation entre les données diminue. En d'autres termes, les échantillons prélevés loin du point initial auront des teneurs en cuivre qui varieront de manière beaucoup plus imprévisible. Cette diminution progressive de la corrélation avec la distance est un principe fondamental en géostatistique.

C'est précisément ce comportement que la géostatistique cherche à modéliser, afin de prédire les valeurs dans les zones non échantillonnées. Ce phénomène est vrai pour tout gisement, mais aussi dans de nombreux contextes géologiques tels que la géotechnique, l'hydrogéologie, l'hydrologie, et bien d'autres domaines.

# Objectifs de la géostatistique

La géostatistique utilise des outils statistiques et probabilistes pour mieux comprendre et exploiter les données d'une variable régionalisée. Son but principal est d'analyser la structure spatiale de cette variable à partir des observations disponibles. Cette première étape aide à identifier les tendances et la variabilité du phénomène étudié.

Une fois la structure spatiale identifiée, la géostatistique la modélise à l'aide de fonctions spécifiques, comme le variogramme. Cette modélisation est essentielle pour décrire comment les valeurs sont corrélées en fonction de leur distance et de leur position, servant de base aux étapes suivantes.

Enfin, la géostatistique permet d'estimer ou de simuler les valeurs dans des zones non échantillonnées en se basant sur les modèles créés précédemment. Elle fournit également une mesure quantitative de l'incertitude liée à ces prédictions, ce qui est crucial pour la prise de décision dans des domaines comme la gestion des ressources naturelles, l'environnement ou l'ingénierie.

En résumé, la géostatistique transforme des données ponctuelles en informations spatiales cohérentes, fiables et exploitables, tout en tenant compte de leur variabilité et de leur incertitude. C'est un outil puissant d'aide à la décision, encore souvent sous-utilisé.

# Origines de la discipline

Le cadre méthodologique de la géostatistique a été formalisé dans les années 1960 par le mathématicien français Georges Matheron. Il s'est appuyé sur les travaux de l'ingénieur sud-africain Daniel Krige. C'est d'ailleurs en l'honneur de Daniel Krige que Matheron a nommé l'outil emblématique de la discipline, le krigeage, reconnaissant ainsi ses interrogations fondamentales et ses efforts pour y répondre.

En effet, la géostatistique repose sur deux concepts fondamentaux identifiés par Krige : l'effet de support et l'effet d'information. Dans les années 1950, ses observations dans les mines sud-africaines l'ont amené à formuler deux questions essentielles qui sont devenues les fondements de cette science :

- Pourquoi récupère-t-on systématiquement moins de métal lorsqu’on exploite de grands volumes par rapport à de petits volumes ? (*effet de support*)

```{dropdown} **Effet de support**
Fait référence à la variation de la variance d'une variable régionalisée en fonction de la taille du support (ou de l'unité d'échantillonnage)
```
  
- Pourquoi les estimations des ressources tendent-elles à sous-estimer les quantités réellement extraites après exploitation ? (*effet d’information*)

```{dropdown} **Effet d’information**
Désigne la tendance des méthodes d’estimation à sous-évaluer systématiquement les valeurs réelles d’une ressource ou d’un paramètre. Cela est dû à la quantité limitée d’informations (de données) disponibles, ce qui entraîne une perte d’information par rapport à la réalité complète du phénomène.
```

Ces interrogations ont jeté les bases de la géostatistique. Nous développerons notre propre interprétation au fil des chapitres suivants, où nous introduirons également les équations associées. Nous aborderons d'abord en détail l'effet de support, suivi de l'effet d'information. Il est important de rappeler que ces deux effets constituent les piliers fondamentaux de la géostatistique.


[^1]: La géostatistique s'étend également à l'analyse et à la modélisation des séries temporelles. Dans ce contexte, la variable d'intérêt n'est plus uniquement la teneur en fonction de la localisation dans un gisement, mais peut aussi être, par exemple, la teneur du minerai acheminé au concentrateur pour traitement. L'objectif est alors d'étudier la stabilité de cette teneur au fil du temps, c'est-à-dire sa variabilité temporelle, afin d'optimiser les procédés chimiques d'extraction du métal.






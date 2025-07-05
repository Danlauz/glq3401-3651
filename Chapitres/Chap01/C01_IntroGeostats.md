---
title: "Introduction à la géostatistique"
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
- Introduire les notions fondamentales de probabilités et statistiques;
- Comprendre les principes de base des modèles spatiaux et leur application à l’estimation et la simulation des variables régionalisées;
:::

# Qu’est-ce que la géostatistique ?

(def-géostat.)
Définition – Géostatistique  
: La **géostatistique** est une branche des statistiques qui s’intéresse à l’analyse, la modélisation et l’estimation de phénomènes naturels ou industriels à partir de données localisées dans l’espace et dans le temps [^1]. Contrairement aux méthodes statistiques classiques, qui supposent l’indépendance des observations, la géostatistique exploite la **corrélation spatiale** pour prédire des valeurs dans des zones non échantillonnées et en quantifier l’incertitude.

Elle repose sur l’idée que les valeurs mesurées dans un espace géographique ne sont pas aléatoires de façon indépendante, mais **corrélées selon leur proximité spatiale**. Autrement dit, deux points proches dans l’espace ont plus de chances d’avoir des valeurs similaires que deux points éloignés. Ce type de phénomène est modélisé à l’aide de ce qu’on appelle une **variable régionalisée**

# 🎯 *Mise en situation : Teneur d'un gisement*

Imagine un gisement de cuivre. Lorsqu’une carotte de forage révèle une forte teneur en cuivre à une certaine profondeur, il est logique de penser que les zones proches présentent aussi des teneurs relativement élevées — bien que pas exactement les mêmes. Cette similitude entre valeurs proches dans l’espace est ce qu’on appelle une **corrélation spatiale**.

En revanche, plus on s’éloigne — par exemple, à plusieurs kilomètres — cette corrélation diminue progressivement, ce qui signifie que les teneurs en cuivre peuvent alors varier considérablement d’un endroit à l’autre.

Ainsi, la distribution du cuivre dans un gisement **n’est pas aléatoire**, mais présente une **continuité spatiale**. C’est précisément cette structure que la géostatistique cherche à modéliser, afin de **prédire les valeurs dans les zones non échantillonnées**. Ce phénomène est vrai pour tout gisement, mais aussi dans de nombreux contextes géologiques tels que les propriétés mécaniques des roches, la géotechniques, l’hydrogéologie, l’hydrologie, et bien d’autres.


# Objectifs de la géostatistique

À l’aide d’outils statistiques et probabilistes, la géostatistique permet :

- de **décrire** la structure spatiale d’un phénomène (analyse exploratoire) ;
- de **modéliser** cette structure (modélisation du variogramme) ;
- d’**interpoler** ou de **simuler** des valeurs dans des zones non échantillonnées, tout en fournissant une mesure de l’incertitude associée.

# Origines de la discipline

Le cadre méthodologique de la géostatistique a été formalisé dans les années 1960 par le mathématicien français **Georges Matheron**, à partir des travaux de l’ingénieur sud-africain **Daniel Krige**. L’outil emblématique de la discipline, le **krigeage**, tire d’ailleurs son nom de ce dernier.

La géostatistique s’appuie sur deux concepts fondamentaux : **l’effet de support** et **l’effet d’information**. Dans les années 1950, Daniel Krige formula deux questions essentielles à partir de ses observations dans les mines sud-africaines :

- Pourquoi récupère-t-on systématiquement moins de métal lorsqu’on exploite de grands volumes par rapport à de petits volumes ? (*effet de support*)  
- Pourquoi les estimations des ressources tendent-elles à sous-estimer les quantités réellement extraites après exploitation ? (*effet d’information*)

Ces interrogations ont jeté les bases de la géostatistique. Nous développerons notre propre interprétation au fil des chapitres suivants, où nous introduirons également les équations associées.


[^1]: La géostatistique permet également de modéliser et d'analyser des
    séries temporelles. Dans ce contexte, la variable d'intérêt n'est
    pas nécessairement la teneur en fonction de la localisation dans un
    gisement, mais peut être la teneur du minerai envoyé au
    concentrateur pour y être traité. On s'intéresse alors à la
    stabilité de cette teneur au cours du temps, c'est-à-dire à sa
    variabilité éventuelle, dans le but d'optimiser les procédés
    chimiques utilisés pour extraire le métal de la roche encaissante.





---
title: "Chapitre 4 - Traitement et analyse statistique des données de forage"
abstract: |
  Cette section présente les principes clés du traitement statistique des données de forage, en insistant sur l’importance d’un échantillonnage spatialement représentatif et moyennable. Elle explique pourquoi, en raison de l’autocorrélation spatiale des teneurs, il faut éviter les biais liés à une surreprésentation locale. Enfin, elle introduit trois étapes essentielles du prétraitement : la régularisation, le suivi des déviations et le débiaisement des données.

project:
  output-dir: exports  # <-- dossier de sortie pour tous les formats

format:
  pdf:
    output-file: ./exports/Chapitre5.pdf
    documentclass: article
    classoption: [10pt, oneside, twocolumn]
    geometry: margin=1in
    markdown_extensions: ["+fenced_divs"]

downloads:
  - file: Chapitre5.pdf    # simple nom de fichier, pas de chemin
    title: PDF
---

:::{important}
### Objectifs d'apprentissage
-   Être en mesure de traiter les données de forage en vue d'une analyse
    statistique spatiale ;

-   Effectuer la régularisation des teneurs et en comprendre les
    objectifs et les implications ;

-   Identifier et interpréter les problèmes liés à la déviation des
    forages ;

-   Comprendre l'importance du débiaisement (*debiaising*) et du
    dégroupement (*declustering*) des données dans le cadre d'analyses
    spatiales ;

-   Calculer les intersections entre les forages et les zones
    minéralisées ;

-   Convertir les mesures de déviation en coordonnées cartésiennes pour
    les forages.
:::

# Introduction

Le traitement et l'analyse statistique des données de forage visent
essentiellement à fournir une base de données unifiée, dont les
statistiques sont représentatives du phénomène étudié. En
géostatistique, il est essentiel que les données soient moyennables, ce
qui implique l'utilisation d'un support d'échantillonnage uniforme, et
qu'elles représentent adéquatement le phénomène géologique analysé.

En géologie, contrairement à plusieurs autres disciplines, les teneurs
sont généralement mesurées en un point précis de l'espace. Ces teneurs
présentent une autocorrélation spatiale : autrement dit, deux forages
proches l'un de l'autre ont plus de chances d'afficher des teneurs
similaires que deux forages éloignés. Par conséquent, les échantillons
ne peuvent être considérés comme des observations indépendantes issues
d'une population homogène. Les teneurs appartiennent souvent à une
population structurée spatialement.

Cette réalité impose la nécessité de prendre des précautions
supplémentaires lors du prélèvement des échantillons. En effet, pour que
les statistiques descriptives de l'échantillon (par exemple : moyenne,
écart-type, quantiles) soient pertinentes par rapport à la population,
il est essentiel d'obtenir un échantillon aussi homogène que possible
sur le plan spatial, i.e., qu'il convient, en particulier, d'éviter la
surreprésentation de certaines zones géologiques, afin de ne pas
introduire de biais dans l'analyse. Par exemple, réalisé 100 forages
dans une zone très riche sur une très petit section du gisement
viendrait biaisé les statistiques globales du gisement (i.e., une
moyenne des teneurs à la hausse).

Plusieurs étapes clés doivent être respectées lors de l'analyse
statistique des données de forage. Cette liste n'est pas exhaustive :
d'autres traitements peuvent être nécessaires selon le type de gisement,
la méthode d'exploitation (à ciel ouvert ou souterraine), et divers
paramètres techniques. Dans cette section, nous aborderons trois étapes
importantes du prétraitement des données, avant de procéder à
l'estimation des ressources et des réserves minières : la régularisation
des données de forages; le suivi et le calcul des déviations des
forages; le débiaisement et le dégroupement des données.


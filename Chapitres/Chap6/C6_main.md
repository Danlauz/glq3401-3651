---
title: "Chapitre 6 - Variogramme"
abstract: |
  Ce chapitre présente le variogramme, un outil central de la géostatistique, utilisé pour quantifier la continuité spatiale des variables régionalisées à partir de données observées. Nous y distinguons le variogramme expérimental du modèle théorique, en insistant sur l’importance de l’ajustement de ce dernier. Le chapitre détaille les méthodes de calcul du variogramme expérimental, l’ajustement des modèles théoriques, la prise en compte de l’anisotropie, ainsi que le calcul de la covariance à partir du variogramme. Ces notions constituent une base essentielle pour les méthodes d’estimation spatiale, notamment le krigeage.

project:
  output-dir: exports  # <-- dossier de sortie pour tous les formats

format:
  pdf:
    output-file: ./exports/Chapitre6.pdf
    documentclass: article
    classoption: [10pt, oneside, twocolumn]
    geometry: margin=1in
    markdown_extensions: ["+fenced_divs"]

downloads:
  - file: Chapitre6.pdf    # simple nom de fichier, pas de chemin
    title: PDF
---

:::{important}
### Objectifs d'apprentissage
-   Définir ce qu’est un variogramme et expliquer son rôle dans la mesure de la continuité spatiale d’une variable régionalisée ;

-   Distinguer le variogramme expérimental du modèle théorique et justifier l’utilisation d’un modèle ajusté ;

-   Calculer un variogramme expérimental à partir de données spatiales ;

-   Ajuster un modèle théorique à un variogramme expérimental ;

-   Intégrer les effets d’anisotropie dans le calcul du variogramme et de la covariance ;

-   Utiliser un modèle de variogramme pour calculer la covariance entre deux points ;

-   Identifier et décrire les principales familles de modèles de variogrammes utilisés en pratique.
:::

# Introduction

La géostatistique s’inspire directement de la première loi de la géographie, formulée par Waldo Tobler :

> **« Tout interagit avec tout, mais deux choses proches ont plus de chances d’interagir que deux choses éloignées. »**

Pour illustrer ce principe, imaginez-vous au milieu d’une vaste plaine. Autour de vous, le relief est relativement uniforme, avec peu de variations topographiques à courte distance. À l’inverse, si vous vous trouvez au sommet d’une montagne dans la région de Charlevoix, vous êtes plongé dans un paysage accidenté, composé de montées, de descentes et de changements rapides de terrain.

Ces deux environnements illustrent des configurations spatiales très différentes : l’un est faiblement variable, avec de larges structures continues, tandis que l’autre est fortement variable, avec des structures plus petites et plus hétérogènes.

Prenez le temps d’observer la carte topographique du Québec ([Fig. %s](#C6_topographie)). Que constatez-vous ? On y distingue clairement les plaines, les régions montagneuses, et même certains grands événements géologiques comme des cratères d’impact. En observant la distribution spatiale de l’altitude, il devient possible de déduire la structure du relief à partir des données disponibles.

Dans un gisement, l’objectif est similaire : on aimerait pouvoir interpréter la structure spatiale des teneurs comme on interprète la topographie, c’est-à-dire déterminer si le gisement est homogène ou hétérogène, peu ou fortement variable, et comment cette variabilité est organisée dans l’espace.

En géologie, chaque phénomène possède en effet sa propre organisation spatiale et son propre degré de variabilité. Il est donc essentiel de caractériser cette structure dès les premières étapes d’un projet. Autrement dit, on cherche à comprendre la forme, l’étendue et l’orientation des structures présentes dans le gisement.

Le **variogramme** est l’outil fondamental qui permet de quantifier cette continuité spatiale. Il mesure dans quelle mesure les valeurs observées à proximité sont similaires, et comment cette similarité diminue avec la distance. C’est une étape incontournable pour toute modélisation ou estimation géostatistique.

```{figure} images/C6_topographie.PNG
:label: C6_topographie
:align: center
Carte d'altitude du Québec.
```

**Exemple :**  
Considérons quatre localisations $x_0$, $x_1$, $x_2$ et $x_3$ représentées sur la [Fig. %s](#C6_gisement). Nous avons mesuré la teneur en chacun de ces points, sauf en $x_0$. La question se pose alors : quelle serait la teneur au point $x_0$, notée $Z(x_0)$ ?

On s’attend naturellement à ce que la teneur en $x_2$ soit la plus proche, en moyenne, de celle en $x_0$, car $x_2$ est le point le plus proche spatialement. Par conséquent, on serait porté à accorder plus de poids à la donnée en $x_2$ qu’aux données en $x_1$ ou $x_3$.

Cependant, que se passe-t-il si le gisement est tabulaire et orienté verticalement, de haut en bas ? Dans ce cas, il pourrait être plus pertinent d’accorder davantage de poids à la donnée en $x_1$, qui se trouve sur le même axe que $x_0$, plutôt qu’à $x_2$, même si ce dernier est plus proche en distance. 

Ces considérations montrent que les poids accordés aux données doivent dépendre de la structure spatiale de la minéralisation, c’est-à-dire de la notion de continuité spatiale.

En géostatistique, on cherche justement à quantifier cette continuité avant toute estimation ou modélisation du gisement.

```{figure} images/C6_gisement.PNG
:label: C6_gisement
:align: center
Illustration des localisations considérées dans l’exemple.
```

---

À travers ce chapitre, vous apprendrez à estimer et modéliser la continuité spatiale à l’aide de l’outil fondamental qu’est le variogramme


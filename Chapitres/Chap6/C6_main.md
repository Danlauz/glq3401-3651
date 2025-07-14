---
title: "Chapitre 6 - Introduction à la géostatistique et aux variogrammes"
abstract: |
  Ce chapitre présente le variogramme, outil central en géostatistique, permettant de mesurer la continuité spatiale des teneurs minérales à partir des données de forage. Il distingue le variogramme expérimental du modèle théorique et souligne l’importance d’ajuster ce dernier pour interpréter correctement la structure spatiale. Le chapitre détaille les méthodes de calcul du variogramme expérimental, l’ajustement de modèles théoriques, la prise en compte de l’anisotropie, ainsi que le calcul de la covariance à partir du variogramme. Ces notions constituent la base indispensable pour les méthodes d’estimation spatiale telles que le krigeage.

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
-   Expliquer ce que représente le variogramme et en quoi il permet de mesurer la
continuité spatiale des teneurs ;

-   Expliquer la différence entre variogramme expérimental et théorique et
comprendre la nécessité d'un modèle théorique ;

-   Calculer un variogramme expérimental ;

-   Ajuster un modèle théorique à un variogramme expérimental ;

-   Calculer la covariance entre deux points à partir d'un modèle de variogramme ;

-   Tenir compte dans le calcul du variogramme ou de la covariance d'anisotropies ;

-   Connaître les principales caractéristiques des modèles de variogramme
courants.
:::

# Introduction

# 2. LE VARIOGRAMME

**Idée fondamentale :**  
La nature n'est pas entièrement "imprévisible". Deux observations situées l'une près de l'autre devraient, en moyenne, se ressembler davantage que deux observations éloignées.

**Exemple :**  
Soit trois localisations **x₀**, **x₁** et **x₂**, que l'on promène dans le gisement. On mesure la teneur en chacun de ces points.

La teneur au point **x₁** devrait ressembler plus (en moyenne) à celle observée en **x₀** qu'à celle en **x₂**.  
On a peut-être intérêt à utiliser l'information contenue en **x₁** et **x₂** pour fournir un meilleur estimé de **x₀** que si l'on n'utilisait que **x₁**.

> Notion de "continuité" de la minéralisation.  
> Implicitement, toutes les méthodes d'estimation reposent sur ce concept plus ou moins défini.

En géostatistique, on cherche à **quantifier cette continuité** préalablement à tout calcul effectué sur le gisement.

---

Soit deux points **x** et **x + h** séparés d'une distance **h** :

- La teneur en **x** est une variable aléatoire **Z(x)**.  
- La teneur en **x + h** aussi, **Z(x + h)**.  
- La différence entre les valeurs prises par ces deux v.a. est **Z(x) - Z(x + h)**.  
- C'est également une v.a. dont on peut calculer la variance.

Cette variance devrait :

- être **plus petite** lorsque les points sont rapprochés (les valeurs se ressemblent plus en moyenne),
- être **plus grande** lorsque les points sont éloignés.

On appelle **variogramme** la **demi-variance** de cette différence, c’est-à-dire :

$$
\gamma(x, x + h) = \frac{1}{2} \text{Var}(Z(x) - Z(x + h))
$$

---

Si l’on considère **n localisations différentes** \\( x₁, x₂, ..., xₙ \\), la meilleure description que l'on puisse faire des **n variables aléatoires** \\( Z(x₁), Z(x₂), ..., Z(xₙ) \\) est d'établir la **fonction de distribution conjointe (multivariable)**.

Mais cela est **impossible** en pratique, car on ne dispose généralement que d'une **seule observation** à chacun de ces **n points**.

On pourrait formuler une hypothèse très forte, par exemple :  
> Le vecteur des v.a. suit une loi multinormale de moyennes et variances-covariances spécifiées.

Mais cela serait **trop restrictif**.

---

La géostatistique a des visées **plus modestes** :  
On veut **estimer des paramètres statistiques à partir des données**, et non **imposer un modèle a priori**.

Les paramètres que l'on cherche à estimer ne sont **ni** :

- la fonction de distribution conjointe,
- **ni même** la fonction de distribution bivariable (i.e. les v.a. considérées deux à deux),

mais **simplement** :

- les **deux premiers moments** (moyenne, variance, covariance) des v.a. prises deux à deux.

Même réduit à cela, on ne dispose toujours que d'une **seule paire d'observations** situées précisément aux points **x** et **x + h**.

---

On ne peut donc estimer les paramètres statistiques **sans formuler certaines hypothèses**.  
Ces hypothèses ont uniquement pour but de permettre l'estimation des paramètres statistiques de notre modèle à partir des données.

On les appelle **hypothèses de stationnarité du second ordre**.  
Elles visent essentiellement à **"détacher" les deux premiers moments de localisations précises** en permettant des translations des emplacements **x** et **x + h**.

> La covariance (et le variogramme) deviennent donc des fonctions dépendant **uniquement de la distance** séparant les points d'observation, et non plus de leur localisation exacte.


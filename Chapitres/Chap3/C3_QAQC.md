# Contrôle de qualité et assurance de qualité (QA/QC)

Dans la foulée du scandale [Bre-X]{.smallcaps}, la plupart des pays
importants sur le plan minier ont adopté des règles plus strictes
concernant la divulgation des ressources et réserves. Le tableau suivant
présente les principales réglementations :

  **Pays**         **Réglementation**
  ---------------- ---------------------
  Canada           Règlement NI 43-101
  Australie        JORC Code
  Afrique du Sud   SAMREC
  Royaume-Uni      IMM
  États-Unis       SME

  : Principales règlementations sur la divulgation des ressources et
  réserves minérales.

Une des causes importantes à l'origine du scandale [Bre-X]{.smallcaps} a
été l'altération frauduleuse des échantillons de carottes par l'ajout de
poussière d'or. Afin d'éviter qu'une telle situation ne se reproduise
sans être détectée, toutes les règlementations mentionnées dans le
tableau ci-dessus incluent des recommandations précises quant au
contrôle et à l'assurance qualité ([QA/QC]{.smallcaps}).

Dans le cas particulier du règlement **NI 43-101** au Canada, le
[QA/QC]{.smallcaps} constitue un des chapitres essentiels du rapport
technique. Ce chapitre doit décrire en détail toutes les procédures
utilisées pour assurer l'intégrité et la qualité des échantillons
récoltés, incluant notamment :

-   les méthodes d'échantillonnage ;

-   les procédures d'entreposage ;

-   les systèmes de sécurité et de protection des accès (ex. : alarmes)
    ;

-   les outils et méthodes de contrôle utilisés pour détecter
    d'éventuelles irrégularités ou fraudes.

## Définitions

On distingue quatre types principaux de contrôles de qualité
([QA/QC]{.smallcaps}) :

1.  **Analyse par un tiers (umpire assaying)** : Le rejet[^1] (ou la
    pulpe[^2]) est envoyé à un second laboratoire pour une analyse
    indépendante. Cela permet de détecter un problème potentiel de
    *précision* ou de *justesse* du laboratoire principal.

2.  **Duplicatas** : Le même laboratoire refait l'analyse à partir du
    rejet, idéalement à l'aveugle. Cela permet d'évaluer la *précision*
    des analyses. L'analyse par un tiers peut être considérée comme un
    duplicata *externe*.

3.  **Blancs** : Une roche stérile est introduite dans les envois au
    laboratoire pour analyse. Cela permet de détecter une éventuelle
    *contamination* au sein du laboratoire.

4.  **Échantillons de référence (standards)** : Des échantillons de
    référence ayant une teneur connue (avec un écart-type certifié) sont
    fournis par des entreprises spécialisées (par exemple :
    [Rocklab]{.smallcaps}). Ils sont insérés entre deux échantillons
    réels. Cela permet de vérifier la *justesse* (*accuracy*) des
    analyses effectuées.

## Exemple 1) Projet Windfall - Osiko

Voici un résumé des information pouvant être tiré du rapport technique
NI-43-101 du Projet Windfall - Osiko daté de 2022.

-   Blancs constitués de gravier calcaire stérile.

-   Standards : identifiant effacé avant insertion dans le sac pour
    éviter toute reconnaissance au labo.

-   Introduction systématique de blancs et de matériaux de référence
    certifiés (standards) au fil de l'échantillonnage.

-   Utilisation d'étiquettes numérotées en triplicata : une dans le sac,
    une dans la boîte, une conservée dans le carnet.

-   Des standards sont insérés à une fréquence d'un tous les 20
    échantillons afin de surveiller la justesse (accuracy) et la
    précision (precision) des résultats analytiques.

-   96,858 blancs, 87,029 standards, et 5,922 duplicatas

### Blancs

La [Fig. %s](#C3_Blanc_Osiko.png) présente les résultats d'analyse des blancs
du projet Windfall. On constate que les teneurs analysées sont, dans
90 % des cas, inférieures à dix fois la limite de détection (DL). La
personne qualifiée a jugé acceptable que 10 % des analyses dépassent ce
seuil.

```{figure} images/C3_Blanc_Osiko.png
:label: C3_Blanc_Osiko.png
:align: center 
```

### Duplicatas

La [Fig. %s](#C3_Duplicata_Osiko.png) présente les résultats d'analyse des
duplicatas. Aucun élément anormal n'a été observé. On ne note pas de
biais apparent (les données sont centrées autour de la ligne noire), et
la corrélation entre les deux séries d'analyses est forte
($r^2 = 0.9596$). Quelques écarts importants apparaissent, mais ils sont
attendus dans ce type d'analyse en échelle log-log.

```{figure} images/C3_Duplicata_Osiko.png
:label: C3_Duplicata_Osiko.png
:align: center 
```

### Échantillons de référence à teneur connue

La [Fig. %s](#C3_Standard_Osiko.png) présente les résultats d'analyse des
standards. Ceux-ci sont jugés très satisfaisants. Les résultats
d'analyse suivent bien les valeurs de référence. La moyenne de la
population des standards est de 3.55, et le laboratoire a retourné une
moyenne de 3.545. L'écart-type attendu est de 0.086, et celui obtenu par
le laboratoire est de 0.088. Le coefficient de variation est de 2.42 %
pour les standards, et de 2.47 % pour les résultats retournés. Il n'y a
rien à signaler.


```{figure} images/C3_Standard_Osiko.png
:label: C3_Standard_Osiko.png
:align: center 
```

## Exemple 2) Mine Dumont, Royal Nickel

Voici un résumé des information pouvvant être tiré du rapport technique
NI-43-101 de la propriété Royal Nickel- Mine Dumont daté de 2013.

-   Les accès à la carothèque sont protégés par un système d'alarme
    zoné.

-   Les laboratoires sont certifiés **ISO 9001:2000**.

-   Les sacs d'échantillons sont scellés dès la récolte de
    l'échantillon.

-   Un **blanc** est inséré tous les 25 échantillons. Le blanc est
    constitué de sable contenant environ 0--80 ppm de Ni. Le sable est
    facilement identifiable en laboratoire.

-   La procédure de préparation d'échantillons au laboratoire est la
    suivante :

    -   concassage de la roche reçue à 2 mm (70% passant),

    -   sélection de 100 g,

    -   pulvérisation à 106 $\mu$m,

    -   analyse.

-   Des **duplicatas** (1 sur 25) sont envoyés. Il s'agit de quarts de
    carottes, ce qui les rend relativement faciles à identifier comme
    duplicatas.

-   Quatre échantillons de **matériel de référence certifié** (EMRC ou «
    standard ») différents ont été utilisés.

### Blancs

La [Fig. %s](#C3_Blanc_MineDumont2.png) présente les résultats d'analyse des
blancs. On constate que les teneur analysés sont majoritairement tous
inférieur à 0.02%. Il n'y a rien d'anormal à signaler. Aucune
contamination n'est observé. À noter que les blancs sont des
échantillons de salbe. Il est fort probable qu'un sable sera facilement
repéré au laboratoire, indiquant qu'il s'agit d'un blanc.


```{figure} images/C3_Blanc_MineDumont2.png
:label: C3_Blanc_MineDumont2.png
:align: center 
```

### Duplicatas

La [Fig. %s](#C3_Duplicata_MineDumont2.png) présente les résultats d'analyse des
duplicatats. Il n'y a rien d'anormal à signaler, sauf que l'on a 2.3%
des points de la figure de gauche qui sont en dehors du 10% relatif pour
le demi-écart. La figure de droite indique exactement 2.3% (i.e., 100-
97.7). Le problème vient du tracé des droites à + ou -- 10% à la figure
de gauche qui ne coïncident pas avec le 10% indiqué en ordonné à droite.
Il y a un problème d'affiche des résultats, mais rien d'alarment niveau
précision.

```{figure} images/C3_Duplicata_MineDumont2.png
:label: Chap4_Duplicata_MineDumont2.png
:align: center 
```

### Échantillons de référence à teneur connue

La [Fig. %s](#C3_Standard_MineDumont.png) et la [Fig. %s](#C3_Standard_MineDumont2.png) présentent les analyses de deux laboratoires
différents réaliser sur deux périodes de temps différentes pour quatre
échantillons de matériel de référence certifié (EMRC ou « standard »)
différents. On constate que les analyses (points rouges) sont en grande
majorité inférieur à la moyenne des standard (ligne pointillé noir) peut
importe le standars utilisé ou le laboratoire. Il y a alors un problème
de biais important pour les deux laboratoires. Les deux laboratoires
sous-estime les teneurs réele de nickel dans les standards.

```{figure} images/C3_Standard_MineDumont.png
:label: C3_Standard_MineDumont.png
:align: center 
```

```{figure} images/C3_Standard_MineDumont2.png
:label: C3_Standard_MineDumont2.png
:align: center 
```

## Outils statistique pour le contrôle qualité

Selon [@Abzalov2011], la statistique la plus utile en contrôle de
qualité des duplicatas est le **coefficient de variation** (**CV**),
défini par : $$\mathrm{CV} = \frac{s}{m}$$ où $s$ est l'écart-type
expérimental de la paire de duplicatas, et $m$ la moyenne des
duplicatas.

Dans le cas d'une paire de duplicatas, notée $z_1$ et $z_2$, on a :
$$s = \frac{|z_1 - z_2|}{\sqrt{2}}, \quad m = \frac{z_1 + z_2}{2}$$

Ce qui donne :
$$\mathrm{CV} = \frac{|z_1 - z_2|}{\sqrt{2}} \cdot \frac{2}{z_1 + z_2} = \frac{\sqrt{2} \, |z_1 - z_2|}{z_1 + z_2}$$

D'autres auteurs utilisent des statistiques équivalentes telles que :

-   Le **HARD** (Half Absolute Relative Deviation), défini comme :
    $$\mathrm{HARD} = \frac{|z_1 - z_2|}{z_1 + z_2}$$

-   Le **AMPD** (Absolute Mean Percentage Difference), défini comme :
    $$\mathrm{AMPD} = \frac{2 |z_1 - z_2|}{z_1 + z_2} \times 100\%$$

On observe que toutes ces statistiques sont directement proportionnelles
entre elles, alors aussi bien utiliser le CV directement.

# Rôle de l'ingénieur géologique et minier

Chaque type de minéralisation et chaque environnement minier constitue
un cas particulier où la précision de l'échantillonnage dépend du sens
pratique et de l'esprit critique du géologue, de l'ingénieur géologique
ou de l'ingénieur minier. Celui-ci doit s'assurer que les échantillons
sont les plus représentatifs possibles. Il doit également tenir compte
des contraintes budgétaires et de production, puisque l'échantillonnage
ne doit pas ralentir l'exploitation.

::: rem
**Remarque 3**. *L'échantillon le plus proche de l'échantillon parfait
est la carotte obtenue par forage au diamant. L'ingénieur géologue
utilise ces échantillons lors de l'exploration, de la définition et de
la mise en valeur pour prédire les ressources et réserves du gisement.
Les estimations ainsi produites peuvent, dans certains cas, être
comparées aux teneurs réellement obtenues lors de la production.*
:::

::: rem
**Remarque 4**. *Puisque l'échantillon reçoit une importante
extrapolation pour représenter un ensemble plus large, il doit conserver
une certaine homogénéité. S'il s'écarte trop de l'ensemble des teneurs,
on peut suspecter un événement fortuit (par exemple, la présence d'une
pépite d'or significative). Il est courant dans l'industrie minière de
modifier les teneurs anormalement élevées. Les pratiques habituelles
incluent :*

-   *l'exclusion pure et simple de ces échantillons ;*

-   *leur réévaluation à la valeur prise par des échantillons voisins ;*

-   *leur plafonnement systématique à une valeur limite, par exemple 1
    oz Au/t ;*

-   *l'application d'une correction basée sur la distribution
    statistique des teneurs ;*

-   *le rééchantillonnage ou la reprise de l'analyse.*
:::

D'un point de vue statistique, chacune de ces approches est incorrecte
et introduit un biais systématique vers une sous-estimation des teneurs
(biais conservateur). Cependant, comme les teneurs obtenues lors de la
production sont souvent inférieures aux teneurs estimées (biais
conditionnel, voir les lectures sur la géostatistique), ces pratiques
peuvent rapprocher les estimations des valeurs de production. Cela
explique probablement en partie leur popularité --- un cas où une
deuxième erreur corrige partiellement la première.

[^1]: Partie de la roche envoyée pour analyse qui n'est pas utilisée par
    le laboratoire. Elle est habituellement retournée à la mine.

[^2]: Partie de la roche qui est pulvérisée pour l'analyse chimique.


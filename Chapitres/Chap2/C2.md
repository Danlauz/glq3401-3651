---
title: "Chapitre 2 - Aspect économique"
abstract: |
  Cette section présente la théorie permettant de déterminer la teneur de coupure optimale pour les opérations minières. La définition des paramètres y est exposée, ainsi que des ateliers interactifs permettant d’étudier l’impact des paramètres opérationnels et économiques sur la rentabilité des projets miniers.

project:
  output-dir: exports  # <-- dossier de sortie pour tous les formats

format:
  pdf:
    output-file: ./exports/Chapitre3.pdf
    documentclass: article
    classoption: [10pt, oneside, twocolumn]
    geometry: margin=1in
    markdown_extensions: ["+fenced_divs"]

downloads:
  - file: Chapitre3.pdf    # simple nom de fichier, pas de chemin
    title: PDF
---

:::{important}
### Objectifs d'apprentissage

-   Expliquer le concept de matériau minéralisé et la différence avec le
    minerai;
-   Expliquer les concepts de teneur de coupure (t.c.) limite,
    d'équilibre et optimale ;
-   Déterminer les t.c. limites et d'équilibre et en déduire la t.c.
    optimale ;
-   Comprendre l'importance du concept d'absence de biais conditionnel
    dans l'application de la théorie de Lane.
:::

# Terminologie

```{dropdown} **Stérile**
Roche qui est retirée au cours de l'exploitation minière
pour pouvoir accéder aux matériaux minéralisés et qui n'est pas traitée
davantage pendant l'année de déclaration.
```


```{dropdown} **Matériau minéralisé**
Volume de roche susceptible de contenir du minerai.
```


```{dropdown} **Minerai**
Portion économiquement rentable du matériau minéralisé.
```


```{dropdown} **Concentrateur (ou usine de traintement)**
Une installation industrielle utilisée dans le processus de traitement des minerais pour
séparer les minéraux de valeur des autres composants du minerai.
```


```{dropdown} **Teneur**
Quantité d'un élément contenu dans un mélange, exprimée en pourcentage.
```


```{dropdown} **Teneur de coupure**
 La teneur minimale d'un élément contenu dans un
mélange qui justifie son extraction et son traitement de manière
économiquement viable.
```


```{dropdown} **Teneur de coupure optimale**
 Teneur de coupure permettant de
maximiser le profit net par tonne de matériau minéralisé.
```


```{dropdown} **Teneur de coupure limite**
 Teneur de coupure permettant de maximiser
le profit net par tonne de matériau minéralisé pour une composante
spécifique des opérations minières.
```


```{dropdown} **Teneur de coupure d'équilibre**
Teneur de coupure permettant de
maximiser le profit net par tonne de matériau minéralisé pour une
maximisation simultanée de deux composantes spécifiques des opérations
minières[^1].
```


# Définitions des variables

La plupart des opérations minières comportent trois étapes principales : l'extraction, la concentration et la mise en marché — chacune ayant ses propres coûts associés ainsi qu'une capacité maximale, voir limite.

La théorie de *Lane et Taylor* repose sur plusieurs variables économiques, permettant d'estimer les revenus d'une minière ainsi que les coûts liés à son ouverture, son exploitation et sa fermeture.

:::{admonition} ✏️ Variables clés à retenir
:class: tip

| Symbole | Définition |
|--------:|:-----------|
| <a id="var-c"></a> $c$     | Teneur de coupure |
| <a id="var-xc"></a> $x_c$   | Proportion du minerai sélectionné (fonction de $c$) |
| <a id="var-gc"></a> $g_c$   | Teneur moyenne du minerai sélectionné (fonction de $c$) |
| <a id="var-y"></a>  $y$     | Taux de récupération du concentrateur |
| <a id="var-p"></a>  $p$     | Prix d'une tonne de métal |
| <a id="var-k"></a>  $k$     | Coût de mise en marché d'une tonne de métal (fonderie, transport, etc.) |
| <a id="var-m"></a>  $m$     | Coûts variables de minage (par tonne de matériau minéralisé) |
| <a id="var-h"></a>  $h$     | Coûts variables de traitement (par tonne de minerai) |
| <a id="var-f"></a>  $f$     | Frais fixes (administration, ingénierie, capital) |
| <a id="var-F"></a>  $F$     | Coût d'opportunité |
| <a id="var-M"></a>  $M$     | Capacité de minage (matériau minéralisé) |
| <a id="var-H"></a>  $H$     | Capacité de traitement (minerai sélectionné) |
| <a id="var-K"></a>  $K$     | Capacité du marché (métal) |
| <a id="var-v"></a>  $v$     | Profit net généré par une unité de matériau minéralisé |
:::

::::{note}
📌 **Remarque** :  
La capacité de la mine ($M$) désigne la quantité maximale de matériau minéralisé pouvant être extraite.  
La capacité du concentrateur ($H$) correspond à la quantité maximale de minerai pouvant être traitée.  
Enfin, la capacité du marché ($K$) reflète la quantité de métal que le marché peut absorber.
::::


# Mise en contexte des variables

Supposons une tonne de matériau minéralisé illustrée à la [Fig. %s](#Chap3_BlocMineraliseMetal.png). Les blocs de couleur **jaune** ont une teneur ($t$) supérieure ou égale à la teneur de coupure $c$ (i.e., $t \geq c$), tandis que les blocs **bleus** ont une teneur inférieure à $c$ (i.e., $t < c$). Ainsi, l'ensemble des blocs jaunes constitue notre **minerai**, la portion économiquement rentable du matériau minéralisé.


```{figure} images/Chap3_BlocMineraliseMetal.png
:label: Chap3_BlocMineraliseMetal.png
:align: center 
Évolution de la teneur de coupure selon la méthode utilisée.
```

```{admonition} 🔍 Comprendre $x_c$ et $g_c$
:class: tip

- $x_c$ correspond à la **proportion volumique des blocs jaunes** (minerai) par rapport au volume total.  
- $g_c$ est la teneur moyenne des blocs jaunes sélectionnés. Inévitablement, $g_c$ sera toujours supérieure ou égale à la moyenne des teneurs du gisement complet. 

Quand la teneur de coupure $c$ **augmente**, seuls les blocs les plus riches restent jaunes :  
- La proportion $x_c$ **diminue**.  
- La teneur moyenne $g_c$ **augmente**.

C’est pourquoi $x_c$ et $g_c$ dépendent de $c$ — d’où l’indice $c$ pour s’en souvenir.

👉 On peut aussi écrire $x_c = x(c)$ et $g_c = g(c)$ pour souligner leur dépendance fonctionnelle à la teneur de coupure $c$.

```

# Teneur de coupure

La teneur de coupure joue un rôle fondamental dans l'évaluation
économique et la planification des projets miniers. Elle permet
notamment de :

```{dropdown} **Distinguer le minerai du stérile**
Elle sert de seuil décisionnel pour déterminer si un bloc de matériau minéralisé est suffisamment riche en minerai pour être traité ou s'il doit être rejeté.
```

```{dropdown} **Maximiser la valeur économique du gisement**
En ajustant la teneur de coupure, on peut optimiser le profit net global, en tenant compte des contraintes économiques, techniques, sociétales, législatives et environnementales.
```

```{dropdown} **Planifier l'exploitation minière**
 Elle guide les choix relatifs à l'ordre d'extraction, à la durée de vie de la mine et à l'adaptation du plan minier selon les fluctuations de ces même contraites.
```

```{dropdown} **Évaluer les ressources et réserves**
Elle permet de classifier les ressources minérales en ressources exploitables (réserves) ou non économiques, selon les critères définis par les standards internationaux (ex. : CIM, JORC).
```

```{dropdown} **Prendre des décisions stratégiques**
Elle peut être ajustée dynamiquement selon les capacités de traitement, les contraintes de marché ou les politiques internes de l'entreprise.
```

Ainsi, la teneur de coupure n'est pas une valeur fixe, mais un **paramètre
stratégique dynamique** qui influence directement la rentabilité, la durabilité et
la gestion des opérations minières. La théorie entourant la teneur de
coupure est complexe et vaste. En étudier tous les détails requiert un
cours à part entière. Ici, nous nous concentrerons sur l'impact des
opérations minières sur la teneur de coupure et comment nos décisions en
tant qu'ingénieurs peuvent influencer ou modifier cette teneur. Nous
aborderons notamment la **théorie de Lane** (ou théorie de Taylor).

# Théorie de Lane et Taylor

(def-t.c.)=
Définition – Teneur de coupure
: La **teneur de coupure** est le seuil au-dessus duquel une tonne de matériaux minéralisés est considérée comme économiquement exploitable. Elle doit au minimum couvrir les **coûts jugés pertinents**, lesquels peuvent varier selon le type de mine, les méthodes d'exploitation et l'approche économique retenue.


La théorie de Lane et Taylor repose sur le principe de la maximisation du profit net par tonne de matériau minéralisé, ou de la valeur actuelle nette (VAN).
Autrement dit, il s’agit de calculer les revenus générés par l’exploitation, puis d’en soustraire les coûts afin d’obtenir le profit net.
La dimension temporelle est également prise en compte, puisque le système est dynamique et évolue au fil du temps.

$$\text{Profits} = \text{Revenus} - \text{Coûts}$$

Dans l'**approche de Taylor** seuls les coûts d'exploitation sont pris
en compte. À pleine capacité du concentrateur, les coûts fixes et
variables sont inclus dans le calcul des profits. Si le concentrateur
est sous-utilisé, seuls les coûts variables sont considérés. Ainsi, la
teneur de coupure est constante sauf si l'on actualise les revenus,
auquel cas elle décroît dans le temps
([Fig. %s](#Chap3_EvolutionTemps.png)).

L'**approche de Lane** inclut un coût d'opportunité en plus des coûts
d'exploitation. Le coût d'opportunité représente le rendement attendu
sur la partie non encore exploitée du gisement. Ce coût diminue avec
l'avancement de l'exploitation, entraînant une baisse progressive de la
teneur de coupure
([Fig. %s](#Chap3_EvolutionTemps.png)). À pleine capacité, tous les coûts sont
considérés. Sinon, les coûts fixes et d'opportunité peuvent être
négligés.

En règle générale, la teneur de coupure obtenue par la méthode de Lane
est supérieure ou égale à celle obtenue par la méthode de Taylor, qui
néglige les coûts d'opportunité (variables $F$). Ainsi, Taylor pose
$F = 0$. Nous verrons l'impact des coûts d'opportunité dans les
exemples interactifs.

```{figure} images/Chap3_EvolutionTemps.png
:label: Chap3_EvolutionTemps.png
:align: center 
Évolution de la teneur de coupure selon la méthode utilisée.
```

D'autres facteurs peuvent influencer la teneur de coupure. Une baisse
des prix des métaux pousse à augmenter la teneur de coupure[^2], car
nous allons concentrer nos efforts sur les teneurs riches de notre
gisement. Par la suite, il existe le concept de récupération ultérieure,
c'est-à-dire que si la mine à la capacité de stocker des minerais
légèrement en dessous de la teneur de coupure optimale, il est probable
qu'à long terme ces minerais deviennent rentables. Ainsi, nous pourrions
laisser sur place une certaine quantité de minerai à être traitée
ultérieurement, et ainsi augmenter la teneur de coupure.

Les coûts variables (variable $m$ - [coûts variables de minage](#var-m) et variable $h$ - [coûts variables de traitement](#var-h)) et le coût d'opportunité (variable
$F$ -  [coût d'opportunité](#var-F)) sont, par définition, variables dans le temps, c'est-à-dire qu'ils
sont recalculés en fonction de l'évolution du système minier
(agrandissement de la mine, découvertes de nouvelles zones exploitables,
dysfonctionnement des équipements, évolution de la demande du marché,
\...). Cette dynamique est très technique et requiert une connaissance
approfondie du système financier et de l'exploitation minière. Dans le
cadre de cette lecture, nous aborderons le calcul de la teneur de
coupure pour un instant donné. Ainsi, les variables nécessaires pour
réaliser les calculs seront toujours fournies. Aucune analyse financière
des marchés ne sera réalisée.

En pratique, le choix de l'approche et des hypothèses influence
fortement la stratégie d'exploitation. Ces méthodes supposent une bonne
connaissance de la distribution des teneurs, ce qui nécessitera une
étude géostatistique rigoureuse (effet de support, information
disponible, etc.), abordée dans une prochaine lecture. Pour le reste de
cette lecture, nous supposerons que nous sommes toujours en mesure
d'obtenir des estimations de nos ressources dans les règles de l'art.
Dans le cas contraire, cela sera mentionné et nous étudierons les
impacts des mauvaises estimations.

[^1]: Nous pourrions optimiser en fonction de plus de deux composantes,
    mais cela rend la démarche beaucoup plus complexe et n'ajoute pas
    nécessairement plus de précision en raison des hypothèses qui
    doivent être posées.

[^2]: Sauf si une hausse est attendue à court terme. Nous ne changerons
    pas nos stratégies pour une variation à court terme, sauf si des
    coûts d'opportunité sont identifiés


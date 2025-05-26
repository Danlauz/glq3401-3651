---
title: "Aspect économique"
abstract: |
  Cette section présente la théorie afin de déterminer la teneur de coupure optimale pour les opérations minières. La définitions des parametres est présenteé, ainsi que des ateliers interractif afin d'étudier l'impact des patametres d'opération et économiue sur les opérations minieres.

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

**Matériau minéralisé** : Volume de roche susceptible de contenir du
minerai.

**Minerai** : Portion économiquement rentable du matériau minéralisé.

**Concentrateur (ou usine de traintement)** : Une installation
industrielle utilisée dans le processus de traitement des minerais pour
séparer les minéraux de valeur des autres composants du minerai.

**Teneur** : Quantité d'un élément contenu dans un mélange, exprimée en
pourcentage.

**Teneur de coupure** : La teneur minimale d'un élément contenu dans un
mélange qui justifie son extraction et son traitement de manière
économiquement viable.

**Teneur de coupure optimale** : Teneur de coupure permettant de
maximiser le profit net par tonne de matériau minéralisé.

**Teneur de coupure limite** : Teneur de coupure permettant de maximiser
le profit net par tonne de matériau minéralisé pour une composante
spécifique des opérations minières. Par exemple, la teneur de coupure
limite peut représenter la teneur qui maximise les profits lorsque les
opérations minières fonctionnent à pleine capacité. Cela ne signifie pas
nécessairement que l'ensemble du matériau minéralisé pourra être traité
ni que la totalité du métal produit pourra être vendue sur le marché. La
teneur de coupure limite maximise les profits en fonction d'une seule
composante d'un système plus large.

**Teneur de coupure d'équilibre** : Teneur de coupure permettant de
maximiser le profit net par tonne de matériau minéralisé pour une
maximisation simultanée de deux composantes spécifiques des opérations
minières. Par exemple, la teneur de coupure d'équilibre peut représenter
la teneur qui maximise les profits lorsque les opérations minières
fonctionnent à pleine capacité et que nous sommes en mesure de traiter
tout le matériau minéralisé au concentrateur pour extraire le métal.
Cela ne signifie pas nécessairement que la totalité du métal produit
pourra être vendue sur le marché. La teneur de coupure d'équilibre
maximise les profits en fonction de deux composantes du système[^1].

# Définitions des variables

La plupart des opérations minières comportent trois étapes principales :
l'extraction, la concentration et la mise en marché, chacune ayant ses
propres coûts associés ainsi qu'une capacité limitée.

La théorie de Lane et Taylor repose sur plusieurs définitions de
variables permettant de calculer les revenus d'une minière ainsi que les
dépenses associées à son ouverture, son exploitation et sa fermeture .
Nous présentons ci-dessous, en un seul endroit, une définition succincte
de ces variables, à laquelle le lecteur pourra se référer en tout temps.
Les définitions sont les suivantes :

-   $c$ : teneur de coupure,

-   $x_c$ : proportion du minerai sélectionné (fonction de la teneur de
    coupure),

-   $g_c$ : teneur moyenne du minerai sélectionné ( fonction de la
    teneur de coupure),

-   $y$ : taux de récupération du concentrateur,

-   $p$ : prix d'une tonne de métal,

-   $k$ : coût de mise en marché d'une tonne de métal (fonderie,
    raffinage, transport, assurance, etc.),

-   $m$ : frais variables de minage d'une tonne de matériau minéralisé
    (développement),

-   $h$ : frais variables de traitement d'une tonne de minerai (forage,
    sautage, concassage, remontée, et concentration du minerai),

-   $f$ : frais fixes (administration, ingénierie, frais de capital),

-   $F$ : coûts d'opportunité. Lane (1988) définit ce terme comme étant
    le revenu que rapporterait un montant égal à la valeur présente du
    gisement placé à un taux d'intérêt spécifié,

-   $M$ : capacité de minage (matériau minéralisé),

-   $H$ : capacité de traitement (minerai sélectionné),

-   $K$ : capacité du marché (métal),

-   $v$ : profit net généré par une unité de matériau minéralisé.

La capacité de la mine, notée $M$, correspond à la quantité maximale de
matériau minéralisé pouvant être extraite. La capacité du concentrateur,
notée $H$, représente la quantité maximale de matériau minéralisé
pouvant être traitée pour en extraire le minerai. Enfin, la capacité du
marché, notée $K$, désigne la quantité maximale de métal que le marché
est en mesure d'absorber.

# Mise en contexte des variables

Supposons une tonne de matériau minéralisé illustrée à la
[Fig. %s](#Chap3_BlocMineraliseMetal.png). Les blocs de couleur jaune ont une
teneur ($t)$ supérieure ou égale à la teneur de coupure $c$ (i.e.,
$t \geq c$), tandis que les blocs bleus ont une teneur inférieure à la
teneur de coupure (i.e., $t < c$). Ainsi, l'ensemble des blocs jaunes
constitue notre minerai, la portion économiquement rentable du matériau
minéralisé.

```{figure} images/Chap3_BlocMineraliseMetal.png
:label: Chap3_BlocMineraliseMetal.png
:align: center 
Évolution de la teneur de coupure selon la méthode utilisée.
```

À partir de cette représentation, on observe que $x_c$ est le volume des
blocs jaunes divisé par le volume total, soit la proportion de minerai
dans le matériau minéralisé, tandis que $g_c$ représente la teneur
moyenne des blocs jaunes sélectionnés. Ainsi, une relation triviale
s'affiche : la teneur moyenne du minerai, $g_c$, sera toujours
supérieure à la teneur moyenne du gisement. Pourquoi ? Parce que, si la
teneur de coupure $c$ augmente, alors il y aura moins de blocs jaunes.
La proportion $x_c$ diminuera, et seulement les sections les plus riches
seront retenues, augmentant ainsi la teneur moyenne des blocs
sélectionnés. Ainsi, $g_c$ augmentera. Il est à noter que les paramètres
$x_c$ et $g_c$ dépendent de la teneur de coupure, d'où l'indice $c$ afin
de se souvenir de cette dépendance.

# Teneur de coupure

La teneur de coupure joue un rôle fondamental dans l'évaluation
économique et la planification des projets miniers. Elle permet
notamment de :

-   **Distinguer le minerai du stérile** : Elle sert de seuil
    décisionnel pour déterminer si un bloc de matériau minéralisé est
    suffisamment riche en minerai pour être traité ou s'il doit être
    rejeté.

-   **Maximiser la valeur économique du gisement** : En ajustant la
    teneur de coupure, on peut optimiser le profit net global, en tenant
    compte des contraintes économiques, techniques, sociétales,
    législatives et environnementales.

-   **Planifier l'exploitation minière** : Elle guide les choix relatifs
    à l'ordre d'extraction, à la durée de vie de la mine et à
    l'adaptation du plan minier selon les fluctuations de ces même
    contraites.

-   **Évaluer les ressources et réserves** : Elle permet de classifier
    les ressources minérales en ressources exploitables (réserves) ou
    non économiques, selon les critères définis par les standards
    internationaux (ex. : CIM, JORC).

-   **Prendre des décisions stratégiques** : Elle peut être ajustée
    dynamiquement selon les capacités de traitement, les contraintes de
    marché ou les politiques internes de l'entreprise.

Ainsi, la teneur de coupure n'est pas une valeur fixe, mais un paramètre
stratégique qui influence directement la rentabilité, la durabilité et
la gestion des opérations minières. La théorie entourant la teneur de
coupure est complexe et vaste. En étudier tous les détails requiert un
cours à part entière. Ici, nous nous concentrerons sur l'impact des
opérations minières sur la teneur de coupure et comment nos décisions en
tant qu'ingénieurs peuvent influencer ou modifier cette teneur. Nous
aborderons notamment la **théorie de Lane** (ou théorie de Taylor).

# Théorie de Lane et Taylor

La teneur de coupure est le seuil à partir duquel un minerai devient
rentable. Elle doit permettre de couvrir les coûts jugés pertinents, qui
varient selon la mine et l'approche retenue.

La théorie de Lane et Taylor se base sur le concept de la maximisation
des profits nets par tonne de matériaux minéralisé. Cela veut dire que
nous devons calculer nos revenues et soustraire nos coûts d'exploitation
afin d'obtenir les profits nets.

$$\text{Profits} = \text{Revenus} - \text{Coûts}.$$

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
([Fig. %s](#Chap3_EvolutionTemps.png). À pleine capacité, tous les coûts sont
considérés. Sinon, les coûts fixes et d'opportunité peuvent être
négligés.

En règle générale, la teneur de coupure obtenue par la méthode de Lane
est supérieure ou égale à celle obtenue par la méthode de Taylor, qui
néglige les coûts d'opportunité (variables $F$). Ainsi, Taylor pose
$F = 0$. Nous verrons l'impact des coûts d'opportunité dans les
exemples.

```{figure} images/Chap3_EvolutionTemps.png
:label: Chap3_EvolutionTemps.png
:align: center 
Évolution de la teneur de coupure selon la méthode utilisée.
```

En règle générale, la teneur de coupure obtenue par la méthode de Lane
est supérieure ou égale à celle obtenue par la méthode de Taylor, qui
néglige les coûts d'opportunité (variables $F$), car Taylor pose
$F = 0$. Nous verrons l'impact des coûts d'opportunité dans les
exemples.

D'autres facteurs peuvent influencer la teneur de coupure. Une baisse
des prix des métaux pousse à augmenter la teneur de coupure[^2], car
nous allons concentrer nos efforts sur les teneurs riches de notre
gisement. Par la suite, il existe le concept de récupération ultérieure,
c'est-à-dire que si la mine a la capacité de stocker des minerais
légèrement en dessous de la teneur de coupure optimale, il est probable
qu'à long terme ces minerais deviennent rentables. Ainsi, nous pourrions
laisser sur place une certaine quantité de minerai à être traitée
ultérieurement, et ainsi augmenter la teneur de coupure.

Les coûts variables (variable $m$ - frais variables de minage d'une
tonne de matériau minéralisé et variable $h$ - frais variables de
traitement d'une tonne de minerai) et le coût d'opportunité (variable
$F$) sont, par définition, variables dans le temps, c'est-à-dire qu'ils
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

# Teneurs de coupure limite

Le détermination de la teneur de coupure optimale nécessite au préalable
la définition de trois teneurs de coupure limite et de trois teneurs de
coupure d'équilibre. Taylor (1972) démontre que la teneur de coupure
optimale est nécessairement une de ces six teneurs de coupure.

La teneur de coupure optimale ne peut pas être définie arbitrairement :
elle dépend des capacités des installations (mine, concentrateur) et des
conditions du marché. La théorie de Lane et Taylor identifient ainsi
trois facteurs limitatifs majeurs, chacun associé à une teneur de
coupure limite :

-   **Limite de la mine** : Nous sommes limités par la capacité de la
    mine à exploiter le gisement. Extirper les stériles pour atteindre
    les matériaux minéralisés est limité par les équipements disponibles
    et les infrastructures (e.g., capacité de la halle à stériles). Nous
    sommes limités par les opérations minières.

-   **Limite du concentrateur** : Nous sommes limités par la capacité du
    concentrateur à traiter le minerai. Bien que nous puissions produire
    une grande quantité de matériaux minéralisés, le concentrateur ne
    peut extraire le minerai du matériau minéralisé ni extraire le métal
    du minerai. Nous sommes limités par les étapes liées au
    concentrateur.

-   **Limite du marché** : Nous sommes limités par la capacité de vendre
    le métal produit sur le marché. Il ne sert à rien de produire plus
    que la demande. Nous sommes donc limités par le marché.

Ces limites peuvent engendrer des déséquilibres. Si la mine n'est pas
assez développée, l'approvisionnement du concentrateur est insuffisant.
Si le concentrateur est sous-dimensionné par rapport à l'extraction, du
minerai est perdu. Si la production dépasse la demande du marché, les
prix chutent ou les ventes diminuent. On ne rappellera pas assez
suffisamment que la teneur de coupure est dynamique, évoluant avec les
conditions techniques et économiques.

Rappelons que la teneur de coupure doit être déterminée pour maximiser
le profit net par tonne de matériau minéralisé, selon la relation :
$$\text{Profit} = \text{Revenus} - \text{Coûts}.$$

Pour comparer équitablement les trois teneurs limites, toutes les
grandeurs sont donc ramenées à des **tonnes de matériau minéralisé**.
Ainsi :

-   La mine a une capacité maximale de $M$ tonnes de matériau
    minéralisé.

-   Le concentrateur traite $H$ tonnes de minerai, soit $H/x_c$ tonnes
    de matériau minéralisé.

-   Le marché peut absorber $K$ tonnes de métal, soit $K/(g_cy)$ tonnes
    de minerai, donc $K/(x_cg_cy)$ tonnes de matériau minéralisé.

Ces relations sont très importantes afin de s'assurer que tous les
calculs sont réalisés avec des tonnes de matériaux minéralisés.

## Teneur de coupure : Mine

Supposons que la mine ait la capacité de miner $M$ tonnes de matériau
minéralisé. Pour définir les profits, il faut tenir compte des revenus
générés par la vente de ces $M$ tonnes de matériau minéralisé ainsi que
des frais nécessaires pour extraire ces $M$ tonnes. Ainsi, le profit net
$v$ à maximiser lorsque la mine est le facteur limitant est défini par :

$$
v = (p - k) x_c g_c y - x_c h - m - \frac{f + F}{M} \label{eq:LimiteMine}
$$


Le terme $x_c g_c y$ représente la quantité de métal produite pour une
tonne de matériau minéralisé. Le terme $(p - k) x_c g_c y$ représente le
revenu brut obtenu de la vente de cette quantité de métal généré.

Par la suite, il faut déterminer les pertes. Ainsi, $m$ est le coût de
minage encouru pour avoir accès au matériau minéralisé et récupérer le
minerai. Ce terme ne dépend d'aucun autre paramètre que les opérations
minières. Le terme $x_c h$ est le coût de traitement du minerai, soit
les frais variables associés à la transformation d'une tonne de matériau
minéralisé en une tonne de minerai traité. Le terme $(f + F)$ représente
les frais fixes au niveau administratif et les coûts d'opportunité. Ces
frais fixes sont divisés par la quantité de matériau minéralisé afin
d'obtenir, comme unité finale, des \$ par tonne minéralisée. Ainsi,
$\frac{f + F}{M}$ représente le coût par tonne minée de matériau
minéralisé dû aux frais fixes et aux coûts d'opportunité.

Pour déterminer la teneur de coupure de la mine, il faut maximiser le
profit en fonction de la teneur de coupure. Il faut donc résoudre :
$\frac{dv}{dc} = 0$. Dans
l'Eq.\eqref{eq:LimiteMine}, les termes $m$ et $\frac{f + F}{M}$ ne
dépendent pas de la teneur de coupure adoptée, leur dérivée étant
automatiquement nulle. Il reste donc à dériver les deux termes
$(p - k) x_c g_c y$ et $x_c h$ par rapport à $c$. Notons que $x_c$ et
$g_c$ dépendent de la teneur de coupure $c$.

Comme il existe une relation monotone entre $x_c$ et $c$, c'est-à-dire
que lorsque $c$ augmente, $x_c$ diminue toujours, il est possible de
dériver par rapport à $x_c$ au lieu de $c$. Le $x_c$ optimal identifie
automatiquement le $c$ optimal. Ainsi, l'équation à résoudre devient :
$\frac{dv}{dx_c} = 0$.

Il reste à savoir comment dériver le terme $x_c g_c$ par rapport à
$x_c$, car $g_c$ dépend lui aussi de $x_c$. Cela semble complexe, mais
en réalité, la relation est simple :

$$\frac{d(x_c g_c)}{dx_c} = c.$$

Pourquoi ? Parce qu'en réalisant une petite variation dans la proportion
du matériau minéralisé sélectionné, sa teneur moyenne serait exactement
la teneur de coupure. Ainsi, la teneur de coupure limite de la mine,
notée $c_1$, est :

$$c_1 = \frac{h}{p - k}$$

Cette teneur de coupure exprime le fait que le concentrateur et le
marché sont en attente des opérations minières. On notera que dans ce
cas, la teneur optimale ne dépend aucunement du facteur temps (inclus
dans le terme d'opportunité $F$).

## Teneur de coupure : Concentrateur

Pour déterminer la teneur de coupure limite du concentrateur, un petit
changement est effectué dans l'équation du profit. Au lieu de définir
les frais fixes et les coûts d'opportunité en fonction de la production
de la mine $M$, ils sont définis en fonction de la quantité maximale $H$
de minerai que l'on peut gérer au concentrateur. Comme tous les termes
sont en % par tonne de matériau minéralisé, il faut transformer les
minerais en matériaux minéralisés et diviser les frais fixes et
d'opportunité par $H/x_c$. L'équation devient alors la suivante :

$$v = (p - k) x_c g_c y - x_c h - m - \frac{(f + F) x_c}{H}
\label{eq.LimiteConcentrateur}$$

Ainsi, le terme $\frac{(f + F) x_c}{H}$ représente le coût par tonne
minée de matériau minéralisé, c'est-à-dire que pour traiter $H$ tonnes
de minerai, il faut miner $H/x_c$ tonnes de matériau minéralisé.

Par une analyse similaire à celle de la section précédente, on peut
éliminer le terme $m$ de la fonction à maximiser et procéder à une
dérivation par rapport à $x_c$. On trouve que la teneur de coupure
limite du concentrateur, notée $c_2$, en maximisant cette fonction, est
:

$$c_2 = \frac{h + \frac{f+F}{H}}{y(p - k)}$$

On notera que cette fois, le facteur temps intervient dans la
détermination de la teneur de coupure par la présence du terme $F$ (coût
d'opportunité).

## Teneur de coupure : Marché

Pour la dernière teneur de coupure limite, reliée cette fois-ci à la
capacité du marché, les mêmes étapes seront réalisées. Cependant, la
quantité de métal maximale que le marché peut absorber, notée $K$, doit
être transformée en un équivalent en tonnes de matériaux minéralisés,
soit $\frac{K}{x_c g_c y}$. Ainsi, lorsque le marché demande $K$ tonnes
de métal, il faut miner $\frac{K}{x_c g_c y}$ tonnes de matériau
minéralisé pour répondre à la demande. Le profit est défini par :

$$v = (p - k) x_c g_c y - x_c h - m - \frac{(f + F) x_c g_c y}{K}
\label{eq.LimiteMarché}$$

Comme précédemment, le terme $m$ peut être ignoré et, en dérivant par
rapport à $x_c$, on trouve que la teneur limite du marché, notée $c_3$,
est :

$$c_3 = \frac{h}{\Big((p - k) - \frac{f+F}{K}\Big) y}$$

Notons que, d'après les formules précédentes, on a nécessairement
$c_1 < (c_2, c_3)$.

La détermination des trois teneurs de coupure limites ne nécessite pas
de connaître la distribution des teneurs du gisement. En aucun cas, ces
trois teneurs de coupure limite dépendent de $c$, que ce soit par le
biais de $x_c$ ou de $g_c$. Cela signifie que, pour deux mines
identiques au niveau des infrastructures, des méthodes de traitement du
minerai et du métal cible, les teneurs limites de ces deux mines seront
identiques, même si l'une des mines possède un gisement beaucoup plus
riche que l'autre. Ainsi, il est important de prendre en compte la
distribution des teneurs des gisements pour compléter l'analyse de la
teneur de coupure optimale. Cela sera pris en compte dans les teneurs de
coupure d'équilibre et indirectement dans la teneur de coupure optimale.

## Exemple numérique

Soit les données suivantes tirées de Lane (1988, p. 116) représentant le
cas d'un gisement d'uranium :

-   $y = 0.87 (-)$: taux de récupération du concentrateur

-   $(p-k) = 60 \, \$/\text{kg d'uranium}$: prix net d'un kilo de métal

-   $h = 3.41 \, \$/\text{tonnes de minerai} )$: frais variables de
    traitement d'une tonne de minerai (concassage, remontée,
    concentration)

-   $m = 1.32 \, \$/\text{tonnes de matériau minéralisé}$: frais
    variables de minage d'une tonne de matériau minéralisé
    (développement, forage, sautage, incluant stérile)

-   $f = 11.9 \, \text{M}\$$: frais fixes (administration, ingénierie,
    frais de capital)

-   $F = 15.2 \, \text{M}\$$: coûts d'opportunité

-   $M = 12 \, \text{M tonnes de matériau minéralisé}$: capacité de
    minage

-   $H = 3.9 \, \text{M tonnes de minerai}$: capacité de traitement

-   $K = 0.9 \, \text{K tonnes d'uranium}$: capacité du marché

Premièrement, il faut faire attention aux unités. On rappelle qu'une
tonne équivaut à 1 000 kg. Les indicatifs \"M\" désignent des millions
et \"K\" des milliers. Dans cette situation, vous constaterez qu'un
changement d'unités sera effectué dans les calculs. Comme par magie, les
unités s'annulent toutes entre elles pour obtenir une teneur de coupure
exprimée en kg d'uranium par tonne de matériau minéralisé. Ce sera
toujours le cas dans les exercices et les examens.

Avec les données fournies, on peut calculer la teneur de coupure limite
$c$ en utilisant les formules suivantes :

$$c_1 = \frac{h}{y (p - k)} = \frac{3.41}{0.87 \times 60} = 0.65 \, \text{kg/t}$$

Ensuite, pour la teneur de coupure limite liée aux frais fixes et aux
coûts d'opportunité, on obtient :

$$c_2 = \frac{h + (f + F) / H}{y (p - k)} = \frac{3.41 + \frac{11.9 + 15.2}{3.9}}{0.87 \times 60} = 0.198 \, \text{kg/t}$$

Enfin, la teneur de coupure limite pour le marché est calculée comme
suit :

$$c_3 = \frac{h}{y \left( (p - k) - \frac{f + F}{K} \right)} = \frac{3.41}{0.87 \times \left( 60 - \frac{11.9 + 15.2}{0.9} \right)} = 0.131 \, \text{kg/t}$$

Les unités des teneur de coupure limites sont, dans cette exemple, des
kg d'uranium par tonne de matériaux minéralisé.

# Teneur de coupure d'équilibre

Les teneurs de coupure précédentes ont été déterminées en fonction des
caractéristiques économiques et des limites de capacité de chaque
composante, considérées séparément. On peut également définir trois
autres teneurs de coupure, qui feront intervenir la distribution des
teneurs des blocs sélectionnés. Ces teneurs, dites d'équilibre, sont
définies de manière à ce que les éléments pris deux à deux soient en
équilibre en termes de quantités traitées (mine-concentrateur,
concentrateur-marché, mine-marché).

Autrement dit, on cherche à déterminer la teneur de coupure de sorte
que, par exemple, la mine et le concentrateur opèrent tous deux à pleine
capacité. Trois scénarios d'équilibre sont alors distingués : (1) la
mine est en équilibre avec le concentrateur, (2) la mine est en
équilibre avec le marché, et (3) le concentrateur est en équilibre avec
le marché.

## Teneur de coupure d'équilibre : Mine-Concentrateur

La teneur de coupure d'équilibre entre la mine et le concentrateur est
choisie de sorte que la quantité totale de matériau minéralisé $M$
extrait par la mine puisse être entièrement traitée au concentrateur,
lequel a une capacité de $H$ tonnes de minerai. Ainsi, la relation
suivante doit être satisfaite :

$$x_c M = H$$

Cela signifie que la teneur de coupure permet de sélectionner
suffisamment de tonnes de matériau minéralisé pour faire fonctionner le
concentrateur à pleine capacité. La teneur de coupure est donc
déterminée de manière à équilibrer cette équation. Il est donc
nécessaire de connaître la distribution statistique des teneurs du
gisement afin de déterminer la valeur de $x_c$ correspondant à une
teneur de coupure donnée $c$. La teneur de coupure qui permet d'établir
l'égalité dans l'équation est appelée teneur de coupure d'équilibre
mine-concentrateur, notée $c_{12}$.

Nous verrons dans une prochaine section comment construire la courbe
$x_c$ en fonction de $c$. Celle-ci dépendra de la distribution
statistique du gisement.

## Teneur de coupure d'équilibre : Mine-Marché

De manière analogue, la teneur de coupure d'équilibre entre la mine et
le marché est déterminée afin d'assurer que toutes les tonnes de
matériau minéralisé $M$ extraites soient vendues sur le marché, dont la
capacité est de $K$ tonnes de métal. Il s'agit donc d'identifier la
teneur de coupure $c$ qui satisfait la relation suivante :
$$x_c \, g_c \, y \, M = K$$ Cette relation implique qu'il faut miner
$\frac{K}{x_c g_c y}$ tonnes de matériau minéralisé pour répondre à la
demande du marché. Cette teneur de coupure est appelée teneur de coupure
d'équilibre mine-marché, notée $c_{13}$.

## Teneur de coupure d'équilibre : Concentrateur--Marché

Enfin, la teneur de coupure d'équilibre entre le concentrateur et le
marché est déterminée afin d'assurer que la totalité des tonnes de
minerai traitées $H$ soient transformées en métal pouvant être vendues
sur le marché de capacité $K$. On cherche ainsi la teneur de coupure $c$
qui satisfait l'équation suivante : $$g_c \, y \, H = K$$ Cette relation
montre qu'il faut avoir $\frac{K}{g_c y}$ tonnes de minerai pour
répondre à la demande du marché. Cette teneur de coupure est appelée
teneur de coupure d'équilibre concentrateur-marché, notée $c_{23}$.

## Distribution des teneurs

Pour être en mesure de déterminer les teneurs de coupure d'équilibre, il
est impératif de connaître la distribution des teneurs du gisement. À
partir de cette distribution, il est possible de tracer les courbes de
$x_c$ en fonction de $c$, et de $g_c$ en fonction de $c$, afin de
déterminer les trois teneurs de coupure qui satisfont les relations
d'équilibre présentées précédemment.

Nous supposerons que nous sommes en mesure d'obtenir, dans les règles de
l'art, la distribution statistique de notre gisement. Dans le cadre de
ce cours, nous supposerons que la distribution statistique des teneurs
suit une loi log-normale. Il sera alors possible, une fois cette
distribution estimée par des méthodes géostatistiques, de construire les
courbes nécessaires à la résolution du problème.

### Rappel de probabilité et statistique

Soit $Z$ une variable aléatoire qui suit une loi normale de moyenne
$\mu$ et de variance $\sigma^2$, on note que $Z \sim N(\mu, \sigma^2)$.
En procédant au centrage et à la réduction de la variable $Z$, on peut
transformer celle-ci en une loi normale de moyenne nulle et de variance
unitaire par : $\frac{Z-\mu}{\sigma} \sim N(0, 1)$. Ainsi, une table
unique de la loi $N(0, 1)$ suffit pour calculer les probabilités de
toute loi normale.

La fonction de densité de probabilité de la loi normale est donnée par :

$$f(z) = \frac{1}{\sigma \sqrt{2\pi}} e^{-\frac{(z - \mu)^2}{2\sigma^2}}$$

et sa fonction de répartition (ou fonction de distribution cumulative)
est donnée par :

$$F(z) = \mathbb{P}(Z \leq z) = \int_{-\infty}^{z} \frac{1}{\sigma \sqrt{2\pi}} e^{-\frac{(t - \mu)^2}{2\sigma^2}} dt$$

Maintenant, supposons que notre variable aléatoire $Z$ suit une loi
log-normale avec moyenne $m$ et variance $s^2$. Cela signifie que
$\ln(Z) \sim N(\mu, \sigma^2)$.

Le lien entre $m, s^2$ et $\mu, \sigma^2$ est donné par les relations
suivantes :

$$\mu = \ln(m) - \frac{\sigma^2}{2}$$
$$\sigma^2 = \ln\left( \frac{s^2}{m^2} + 1 \right)$$

Il est donc possible de déterminer les paramètres $(\mu, \sigma^2)$
d'une loi normale à partir des paramètres $(m, s^2)$ d'une loi
log-normale.

### Construction des courbes

Sachant qu'une teneur de coupure agit comme un seuil, on peut définir
$x_c$, soit la proportion de minerai sélectionné, à partir de la
fonction de répartition de la distribution étudiée :

$$x_c = \int_c^{\infty} f_Z(z)\,dz = \mathbb{P}(Z \geq c)$$

où $f_Z(z)$ est la fonction de densité de la variable aléatoire $Z$.
Supposons que $Z$ suit une loi log-normale de moyenne $m$ et de variance
$s^2$. On peut alors transformer cette distribution en loi normale à
l'aide des équations précédentes, ce qui permet d'obtenir la relation
suivante :

$$x_c = \mathbb{P}(Z \geq c) = F\left(\frac{1}{\sigma} \ln\left(\frac{m}{c}\right) - \frac{\sigma}{2}\right)$$

où $F$ désigne la fonction de répartition de la loi normale standard.
Ainsi, à partir d'une table de la loi normale, ou plus simplement à
l'aide d'un outil numérique, on peut calculer la valeur de $x_c$ pour
toute valeur de $c$.

Maintenant, la valeur $g_c$, qui représente la teneur moyenne du minerai
sélectionné, est donnée par la relation suivante :

$$g_c = \mathbb{E}(Z \mid Z > c)$$

Sans entrer dans les détails de la démonstration, cette moyenne peut
être calculée à l'aide de la formule suivante :

$$g_c = \frac{m\,F\left(\frac{1}{\sigma} \ln\left(\frac{m}{c}\right) + \frac{\sigma}{2}\right)}{F\left(\frac{1}{\sigma} \ln\left(\frac{m}{c}\right) - \frac{\sigma}{2}\right)}$$

Ce qu'il faut retenir ici, c'est que lorsque la moyenne et la variance
de la distribution des teneurs (supposée log-normale, ce qui est
fréquemment le cas en pratique) sont connues, il devient possible de
calculer les variables $x_c$ et $g_c$ en fonction de la teneur de
coupure $c$.

### Exemples numérique

La distribution des teneurs en cuivre (Cu) d'un gisement suit une loi
log-normale avec une moyenne $m = 1.3\%$ et la variance est de
$s^2 = 3\%^2$. Nous souhaitons calculer les valeurs de $x_c$ et $g_c$
pour une teneur de coupure $c = 1\%$.

#### 1. Calcul de $x_c$

La teneur de coupure $c$ est donnée par $c = 1\%$. L'écart-type de la
loi normale associée à la loi log-normale est calculé comme suit :

$$\sigma = \sqrt{\ln\left(\frac{s^2}{m^2}+1\right)} = \sqrt{\ln\left(\frac{3}{1.3^2}+1\right)} = 1.0103$$

Ensuite, la fonction de répartition de la loi normale standard est
utilisée pour calculer $x_c$, qui est donné par :

$$x_c = F\left( \frac{1}{\sigma} \ln\left( \frac{m}{c} \right) - \frac{\sigma}{2} \right) = F\left( \frac{1}{1.0103} \ln\left( \frac{1.3}{1} \right) - \frac{1.0103}{2} \right) = F(-0.2455) = 0.4030$$

#### 2. Calcul de $g_c$

La teneur moyenne $g_c$, qui représente la teneur moyenne des minerais
sélectionnés, est donnée par la formule suivante :

$$g_c = \frac{m \, F\left( \frac{1}{\beta} \ln\left( \frac{m}{c} \right) + \frac{\sigma}{2} \right)}{F\left( \frac{1}{\beta} \ln\left( \frac{m}{c} \right) - \frac{\sigma}{2} \right)}= \frac{1 \, F\left( \frac{1}{1.0103} \ln\left( \frac{1.3}{1} \right) + \frac{1.0103}{2} \right)}{F\left( \frac{1}{1.0103} \ln\left( \frac{1.3}{1} \right) - \frac{1.0103}{2} \right)} = \frac{1.3F(0.7648)}{F(-0.2455)} = 2.5088$$

#### 3. Calcul à partir de la Table de la loi normale

La Table de la Loi Normale fournit des valeurs de la fonction de
répartition $F(z)$ pour des valeurs de $z$ qui suivent une loi normale
$N(0, 1)$, c'est-à-dire une loi normale de moyenne 0 et de variance 1.

Cependant, la table est généralement construite pour des valeurs de $z$
positives, car la fonction de répartition $F(z)$ est symétrique par
rapport à 0. En effet, si $Z$ suit une loi normale de moyenne 0 et de
variance 1, et si $z$ est négatif, on peut exploiter cette symétrie pour
déterminer $F(z)$. Ainsi, pour un $z$ négatif, il suffit d'utiliser la
relation suivante :

$$F(-z) = 1 - F(z)$$

Cela permet de calculer la probabilité qu'une valeur de $Z$ soit
inférieure à un certain seuil même si ce seuil est négatif. Par exemple,
pour $z = -1.5$, on peut chercher la valeur de $F(1.5)$ dans la table et
utiliser la relation $F(-1.5) = 1 - F(1.5)$.

Pour obtenir la probabilité que $Z$ soit inférieur à une certaine
valeur, il suffit de chercher la valeur de $z$ dans la table et de lire
la probabilité correspondante. Par exemple, si $z = 1.23$, on peut lire
directement $F(1.23) \approx 0.8907$. Pour $z = -1.23$, on utilise la
relation $F(-1.23) = 1 - F(1.23) = 1 - 0.8907 = 0.1093$.

La table de la loi normale est fournie en Section {ref}`table-normale`.

## Exemple du calcul des teneurs d'équilibre

Pour calculer les teneurs d'équilibre, on vous fournira généralement les
courbes $x_c$, $g_c$ et $x_c g_c$ en fonction de $c$, comme illustré à
la [Fig. %s](#Chap3_xc_gc), ou bien il faudra les calculer comme présenté
dans la section précédente.

```{figure} images/Chap3_xc_gc.png
:label: Chap3_xc_gc.png
:align: center 
Impact de la variance sur le teneur de coupure.
``` 

Par exemple, pour la teneur de coupure d'équilibre mine-concentrateur,
$c_{12}$, si la capacité de minage $M$ est de 10 et que la capacité de
traitement $H$ est de 5, on doit obtenir :
$$x_c = \frac{H}{M} = \frac{5}{10} = 0.5.$$ Par lecture graphique, on
obtient que la teneur de coupure est de $0.78\%$.

On peut déduire la teneur de coupure d'équilibre mine-marché et
concentrateur-marché de la même manière, à partir de la lecture
graphique.

# Exemple détaillé

# Influence de la distribution sur la teneur optimale et le profit

La [Fig. %s](#Chap3_Variance) illustre l'effet d'utiliser la mauvaise
distribution pour déterminer la teneur de coupure optimale pour un même
gisement. Supposons que les calculs ont été faits pour un ensemble de
paramètres identiques sauf que l'on a considéré deux lois lognormales de
variances différentes. (Paramètres utilisés: m=1.32\$/t minéral; y=.87;
p=600\$/t métal ; k=0;h=3.41\$/t minerai; f=11.9M\$; F=0M\$; M=12Mt;
H=3.9Mt; K=.085Mt). Sur la figure gauche, l'optimum est atteint à
l'équilibre mine-concentrateur (c=0.79%) et rapporte un profit de
0.72\$/t minéral. Sur celle de droite, l'optimum est atteint à la teneur
de coupure 0.93% et un profit de 0.36\$/t minéral en résulte.

```{figure} images/Chap3_Variance.png
:label: Chap3_Variance.png
:align: center 
Impact de la variance sur le teneur de coupure.
``` 


L'exemple précédent montre combien les calculs économiques sont
tributaires d'une bonne description statistique du gisement. Le gisement
présente une valeur nette 2 fois plus petite si $\sigma = 2\%^2$ que si
$\sigma=4\%^2$ . Ceci correspond à une erreur fréquente pour ce genre
d'étude: on estime les teneurs de blocs par des estimateurs qui montrent
une variance plus grande que les blocs réels. On prédit alors des
profits irréalistes qui ne pourront se réaliser. Pour éviter les
mauvaises surprises, il faut s'assurer que l'on utilise la variance des
teneurs des blocs qui pourront être sélectionnés. Comme la sélection
s'effectue sur des valeurs estimées, c'est en réalité la variance des
valeurs estimées qu'il faut utiliser, pourvu que l'estimateur soit sans
biais conditionnel. On peut montrer (voir partie géostatistique) qu'un
estimateur, pour être sans biais conditionnel, doit nécessairement être
moins variable que les blocs qu'il cherche à estimer. Les teneurs
réelles des blocs sont elles-mêmes moins variables que les teneurs des
carottes prélevées dans le gisement (effet support).

# Table de la Loi Normale centré-réduite  ## {#table-normale}

```{table} Valeurs de la fonction de répartition normale standard Φ(z)
:align: center
:widths: auto
:label: Tab.LoiNormale

            0.00     0.01     0.02     0.03     0.04     0.05     0.06     0.07     0.08     0.09
  ----- -------- -------- -------- -------- -------- -------- -------- -------- -------- --------
    0.0   0.5000   0.5040   0.5080   0.5120   0.5160   0.5199   0.5239   0.5279   0.5319   0.5359
    0.1   0.5398   0.5438   0.5478   0.5517   0.5557   0.5596   0.5636   0.5675   0.5714   0.5753
    0.2   0.5793   0.5832   0.5871   0.5910   0.5948   0.5987   0.6026   0.6064   0.6103   0.6141
    0.3   0.6179   0.6217   0.6255   0.6293   0.6331   0.6368   0.6406   0.6443   0.6480   0.6517
    0.4   0.6554   0.6591   0.6628   0.6664   0.6700   0.6736   0.6772   0.6808   0.6844   0.6879
    0.5   0.6915   0.6950   0.6985   0.7019   0.7054   0.7088   0.7123   0.7157   0.7190   0.7224
    0.6   0.7257   0.7291   0.7324   0.7357   0.7389   0.7422   0.7454   0.7486   0.7517   0.7549
    0.7   0.7580   0.7611   0.7642   0.7673   0.7704   0.7734   0.7764   0.7794   0.7823   0.7852
    0.8   0.7881   0.7910   0.7939   0.7967   0.7995   0.8023   0.8051   0.8078   0.8106   0.8133
    0.9   0.8159   0.8186   0.8212   0.8238   0.8264   0.8289   0.8315   0.8340   0.8365   0.8389
    1.0   0.8413   0.8438   0.8461   0.8485   0.8508   0.8531   0.8554   0.8577   0.8599   0.8621
    1.1   0.8643   0.8665   0.8686   0.8708   0.8729   0.8749   0.8770   0.8790   0.8810   0.8830
    1.2   0.8849   0.8869   0.8888   0.8907   0.8925   0.8944   0.8962   0.8980   0.8997   0.9015
    1.3   0.9032   0.9049   0.9066   0.9082   0.9099   0.9115   0.9131   0.9147   0.9162   0.9177
    1.4   0.9192   0.9207   0.9222   0.9236   0.9251   0.9265   0.9279   0.9292   0.9306   0.9319
    1.5   0.9332   0.9345   0.9357   0.9370   0.9382   0.9394   0.9406   0.9418   0.9429   0.9441
    1.6   0.9452   0.9463   0.9474   0.9484   0.9495   0.9505   0.9515   0.9525   0.9535   0.9545
    1.7   0.9554   0.9564   0.9573   0.9582   0.9591   0.9599   0.9608   0.9616   0.9625   0.9633
    1.8   0.9641   0.9649   0.9656   0.9664   0.9671   0.9678   0.9686   0.9693   0.9699   0.9706
    1.9   0.9713   0.9719   0.9726   0.9732   0.9738   0.9744   0.9750   0.9756   0.9761   0.9767
    2.0   0.9772   0.9778   0.9783   0.9788   0.9793   0.9798   0.9803   0.9808   0.9812   0.9817
    2.1   0.9821   0.9826   0.9830   0.9834   0.9838   0.9842   0.9846   0.9850   0.9854   0.9857
    2.2   0.9861   0.9864   0.9868   0.9871   0.9875   0.9878   0.9881   0.9884   0.9887   0.9890
    2.3   0.9893   0.9896   0.9898   0.9901   0.9904   0.9906   0.9909   0.9911   0.9913   0.9916
    2.4   0.9918   0.9920   0.9922   0.9925   0.9927   0.9929   0.9931   0.9932   0.9934   0.9936
    2.5   0.9938   0.9940   0.9941   0.9943   0.9945   0.9946   0.9948   0.9949   0.9951   0.9952
    2.6   0.9953   0.9955   0.9956   0.9957   0.9959   0.9960   0.9961   0.9962   0.9963   0.9964
    2.7   0.9965   0.9966   0.9967   0.9968   0.9969   0.9970   0.9971   0.9972   0.9973   0.9974
    2.8   0.9974   0.9975   0.9976   0.9977   0.9977   0.9978   0.9979   0.9979   0.9980   0.9981
    2.9   0.9981   0.9982   0.9982   0.9983   0.9984   0.9984   0.9985   0.9985   0.9986   0.9986



[^1]: Nous pourrions optimiser en fonction de plus de deux composantes,
    mais cela rend la démarche beaucoup plus complexe et n'ajoute pas
    nécessairement plus de précision en raison des hypothèses qui
    doivent être posées.

[^2]: Sauf si une hausse est attendue à court terme. Nous ne changerons
    pas nos stratégies pour une variation à court terme, sauf si des
    coûts d'opportunité sont identifiés


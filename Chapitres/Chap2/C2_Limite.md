# Teneurs de coupure limite

La détermination de la **teneur de coupure optimale** nécessite d'abord l'identification de **trois teneurs de coupure limite** et de **trois teneurs d'équilibre**.

::::{note}
📘 *Selon Taylor (1972)*, la teneur de coupure optimale appartient nécessairement à cet ensemble restreint de six teneurs de coupure.
::::

La teneur optimale **ne peut pas être choisie arbitrairement** :  
Elle dépend des **capacités des installations** (mine, concentrateur) et des **conditions du marché**.

La théorie de **Lane et Taylor** identifie ainsi **trois facteurs limitatifs majeurs**, chacun associé à une teneur de coupure limite.

:::{dropdown} ⚙️ Limites techniques et économiques

- **⛏️ Limite de la mine**  
  La capacité d’exploitation est restreinte par les équipements miniers et les infrastructures (par exemple, la capacité de la halle à stériles).  
  → **Limitation au niveau des opérations minières.**

- **🏭 Limite du concentrateur**  
  Même si l’on peut extraire une grande quantité de matériau minéralisé, le concentrateur ne peut pas tout traiter.  
  → **Limitation au niveau du traitement du minerai.**

- **📉 Limite du marché**  
  Produire plus que la demande peut nuire aux revenus (chute des prix, invendus).  
  → **Limitation imposée par la capacité d’absorption du marché.**

:::

## 💰 Objectif économique

La teneur de coupure doit être choisie de façon à **maximiser le profit net** par tonne de matériau minéralisé :

$$
\text{Profit} = \text{Revenus} - \text{Coûts}.
$$

Pour comparer équitablement les trois teneurs limites, toutes les grandeurs doivent être exprimées **en tonnes de matériau minéralisé**.

:::{dropdown} 🧮 Conversion des capacités

- La mine peut extraire au plus **$M$ tonnes** de matériau minéralisé.  
- Le concentrateur peut traiter **$H$ tonnes** de minerai, soit **$H / x_c$ tonnes** de matériau minéralisé, où $x_c$ est la proportion de minerai.  
- Le marché peut absorber **$K$ tonnes** de métal, soit :

  $$
  \frac{K}{g_c y} \text{ tonnes de minerai} \quad \Rightarrow \quad \frac{K}{x_c g_c y} \text{ tonnes de matériau minéralisé},
  $$

  où $g_c$ est la teneur moyenne des blocs sélectionnés, et $y$ est le taux de récupération métallurgique.

:::

::::{tip}
✅ **Ces conversions sont essentielles** pour garantir la cohérence des comparaisons entre les différentes limites.  
Travailler en tonnes de matériau minéralisé évite les erreurs d'interprétation.
::::



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
l'Eq.(\eqref{eq:LimiteMine}), les termes $m$ et $\frac{f + F}{M}$ ne
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

Ensuite, pour la teneur de coupure limite liée au concentrateur, on obtient :

$$c_2 = \frac{h + (f + F) / H}{y (p - k)} = \frac{3.41 + \frac{11.9 + 15.2}{3.9}}{0.87 \times 60} = 0.198 \, \text{kg/t}$$

Enfin, la teneur de coupure limite pour le marché est calculée comme
suit :

$$c_3 = \frac{h}{y \left( (p - k) - \frac{f + F}{K} \right)} = \frac{3.41}{0.87 \times \left( 60 - \frac{11.9 + 15.2}{0.9} \right)} = 0.131 \, \text{kg/t}$$

Les unités des teneur de coupure limites sont, dans cette exemple, des
kg d'uranium par tonne de matériaux minéralisé.


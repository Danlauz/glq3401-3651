# 3.1 Théorie de l'échantillonnage des matières morcelées - Théorie de Gy

**Référence :** P.M. Gy, 1992. *Sampling of heterogeneous and dynamic
material systems, theories of heterogeneity, sampling and homogenizing*.
Elsevier, Amsterdam, 653 p.

P. Gy est un ingénieur des mines qui s'est penché sur le problème de
l'échantillonnage en adoptant un point de vue statistique. Il a
développé une formule permettant de prédire la **précision relative**
d'un échantillon pour représenter la teneur d'un lot donné, en fonction
de la taille des fragments, de la masse de l'échantillon et du lot,
ainsi que de différents paramètres minéralogiques et granulométriques.

Cette formule est toutefois valide à la condition que l'échantillon soit
un **échantillon probabiliste**.

**Définition :** un échantillon probabiliste d'un lot donné est un
échantillon tel que chaque fragment du lot a une probabilité non nulle
d'être sélectionné. L'échantillon est sans biais si chaque fragment a
une probabilité égale d'être sélectionné.

La [Fig. %s](#C3_Echantillon.png) présente une illustration comparant un
échantillonnage déterministe
([Fig. %s](#C3_Echantillon.png)A) à un échantillonnage probabiliste
([Fig. %s](#C3_Echantillon.png)B). Pour qu'un échantillonnage soit
considéré comme probabiliste, chaque particule de la carotte doit avoir
une chance égale d'être sélectionnée pour l'analyse finale. Ainsi,
sélectionner uniquement une zone spécifique de la carotte
(échantillonnage déterministe) ne permet pas de bien représenter
l'ensemble de celle-ci.

Comment peut-on être assuré que la section prélevée représente
fidèlement la teneur réelle de la carotte ? Il se peut que l'on soit
extrêmement chanceux et que l'on prélève l'unique section de la carotte
contenant de l'or, ce qui biaiserait fortement l'estimation de sa teneur
globale. Il est donc essentiel d'assurer une représentation probabiliste
de la carotte, comme illustré en bas de la figure (B).

À noter que, généralement, une demi-carotte est envoyée pour analyse
tandis que la section restante est entreposée dans une carothèque, afin
d'assurer un suivi et de permettre son étude géologique, minéralogique,
géomécanique, et autres.

```{figure} images/C3_Echantillon.png
:label: C3_Echantillon.png
:align: center 
Exemple d'un échantillon déterministe et d'un échantillon probabiliste.
```

## Équation de Gy

Soit un certain lot de minerai, par exemple, une demi-carotte de forage
de longueur de 3m. Supposons que l'on concasse cette carotte jusqu'à ce
que la taille des plus gros fragments soit $d$ (en cm). On définit
$d = d_{5\%}$, soit la taille du tamis ne retenant que 5 % du poids
total des fragments.

Si l'on prélève un échantillon de masse $M_e$ (habituellement faible en
rapport avec la masse $M_L$ du lot qu'il représente), alors la
**variance relative (sans unité)** de l'erreur d'échantillonnage,
$s^2_r$, peut s'écrire comme suit :

$$s^2_r = \frac{s^2}{a_L^2} = Kl\frac{d^3}{M_e} \Big(1-\frac{M_e}{M_L}\Big) \approx Kl\frac{d^3}{M_e}$$

où $M_e$ est la masse de l'échantillon, en grammes. $M_L$ est la masse
du lot échantillonné, généralement beaucoup plus grande que $M_e$, aussi
en grammes. $l$ est le facteur de libération, sans unité. $K$ est une
constante dont les unités sont des $g/cm^3$.

L'approximation est valable seulement lorsque $M_e \ll M_L$.

La valeur du facteur de libération $l$ est donnée par :

$$l = 
\begin{cases}
1, & \text{si } d \leq d_0 \\
\left( d_0/d \right)^{0.5}, & \text{si } d > d_0
\end{cases}$$

où $d_0$ représente la taille à laquelle le constituant d'intérêt est
entièrement libéré de la gangue. Il s'agit de la taille, par exemple,
que l'or disséminé dans la pyrite devient natif. L'or est alors
entièrement libéré de la pyrite. Remarque, le facteur $l$ est sans
unité.

La constante $K$ regroupe plusieurs facteurs et peut s'écrire comme :

$$K = f \cdot g \cdot (\mu\delta)$$

avec $f$ un facteur de forme, défini comme le rapport du volume d'un
fragment sur celui du plus petit cube le contenant entièrement. $f$ est
sans dimension. $g$ un facteur de distribution, décrivant l'uniformité
de la taille des fragments et donc relié à la courbe granulométrique.
$g$ est sans unité. $(\mu\delta)$ est un paramètre combinant les effets
de la teneur et des masses spécifiques du minéral. $\mu_\delta$ possède
les unités d'une masse spécifique (g/cm^3^).

### Détermination du facteur de forme

Le facteur de forme $f$ représente le rapport entre le volume d'un
fragment et celui du plus petit cube pouvant entièrement le contenir.
Par exemple, pour un fragment de forme sphérique de diamètre 1 cm, le
plus petit cube pouvant contenir cette sphère est un cube dont les côtés
mesurent 1 cm. Le volume de la sphère est alors
$\frac{4\pi r^3}{3} = \frac{4\pi \cdot 0.5^3}{3} \approx 0.5236 \,\text{cm}^3$,
alors que le volume du cube est de 1 cm^3^, ce qui donne
$f \approx 0.524$.

Pour un minéral fibreux (comme l'amiante) ou tabulaire (par exemple le
mica), le facteur de forme est beaucoup plus faible, généralement
compris entre $f = 0.1$ et $f = 0.2$. Après de nombreuses analyses en
laboratoire sur divers minéraux, une valeur recommandée pour la plupart
des minerais est $f = 0.5$. Il convient toutefois de noter que ce n'est
pas une règle universelle, et qu'il est préférable de consulter la
littérature pour identifier le facteur approprié au matériau étudié. Par
souci de simplicité, nous utiliserons ici systématiquement la valeur
$f = 0.5$.

### Détermination du facteur de distribution

Le facteur de distribution $g$ décrit l'uniformité de la courbe
granulométrique. Il peut être estimé à partir des diamètres
caractéristiques de la distribution, soit $d_{5\%}$ et $d_{95\%}$, selon
la règle suivante : $$g =
\begin{cases}
    0.25, & \text{si aucune calibration n’est effectuée} \\
    0.40, & \text{si } \frac{d_{95\%}}{d_{5\%}} > 4 \\
    0.50, & \text{si } 4 > \frac{d_{95\%}}{d_{5\%}} > 2 \\
    0.75, & \text{si } 2 > \frac{d_{95\%}}{d_{5\%}} > 1 \\
    1.00, & \text{si } \frac{d_{95\%}}{d_{5\%}} = 1
\end{cases}$$

Cependant, la calibration précise des courbes granulométriques est
relativement rare dans les laboratoires miniers en raison du temps et
des coûts que cela implique. Il est important de rappeler qu'une
compagnie minière peut avoir à faire analyser plusieurs milliers de
carottes. Disposons-nous réellement du temps et des ressources
nécessaires pour établir une courbe granulométrique détaillée pour
chaque échantillon dans le but d'estimer précisément le facteur $g$ ? En
règle générale, la réponse est non.

D'ailleurs, l'utilisation du $d_{5\%}$ dans la formule de Gy n'est pas
anodine. De nombreuses analyses expérimentales ont été menées en
laboratoire pour établir une corrélation entre la distribution
granulométrique et le facteur de distribution. Il a été observé que,
pour un grand nombre d'échantillons, la valeur du facteur $g$ tend à se
rapprocher de 0.25 lorsqu'on utilise $d_{5\%}$ dans les calculs. Ainsi,
pour des raisons de simplicité et d'efficacité, nous adopterons
systématiquement la valeur $g = 0.25$ dans nos calculs.

### Détermination du facteur $(\mu\delta)$

Le facteur $\mu_\delta$ est un paramètre combinant les effets de la
teneur et des masses spécifiques. Il est défini comme :
$$\mu\delta = \frac{1-a_L}{a_L}  \Big[(1-a_L)\delta_A - a_L\delta_G \Big]$$
où :

-   $\delta_A$ est la masse spécifique du constituant d'intérêt (en
    g/cm^3^),

-   $\delta_G$ est la masse spécifique de la gangue (en g/cm^3^),

-   $a_L$ est la concentration du constituant d'intérêt (exprimée en
    fraction : 10 % = 0.10, 10 ppm = 0.000010).

::: rem
**Remarque 1**. *La gangue est constituée de toute la matière qui n'est
pas le constituant d'intérêt.*
:::

::: rem
**Remarque 2**. *Le constituant d'intérêt est souvent le minéral qui
contient le métal recherché. Par exemple : Pour le cuivre : la
chalcopyrite (), Pour le zinc : la sphalérite (), Pour l'or : la pyrite
(), ou parfois l'or natif.*
:::

**Exemple :** Soit une analyse indiquant une teneur de 5 % en cuivre
(Cu). Le cuivre provient de la chalcopyrite, de formule . La valeur de
$a_L$ doit donc représenter la fraction massique de chalcopyrite, et non
celle de cuivre. Il faut donc convertir la teneur en cuivre en teneur
équivalente en chalcopyrite, en utilisant les masses molaires.

La masse molaire de la chalcopyrite est donnée par :
$$M = M_{Cu} + M_{Fe} + 2M_{S} = 63.5 + 55.8 + 2 \times 32.1 = 183.5~\text{g/mol}.$$

Le rapport massique du cuivre dans la chalcopyrite est donc :
$$\frac{M_{Cu}}{M_{CuFeS2}} = \frac{63.5}{183.5} \approx 0.35.$$

Ainsi, une teneur de 5 % en cuivre correspond à une teneur de :
$$a_L = \frac{5~\%}{0.35} \approx 14~\% \quad \text{de chalcopyrite}.$$

Cette valeur est utilisée pour le calcul du facteur $\mu_\delta$.

## Interprétation de la formule de Gy

La formule précédente est valide uniquement pour un échantillon
probabiliste, c'est-à-dire qu'au sein du lot échantillonné, chaque
fragment doit avoir une probabilité égale d'être sélectionné. Toute
déviation par rapport à ce modèle augmente la variance relative
d'estimation, et peut même introduire des biais significatifs.

Si, après un broyage à la taille $d$, on prélève une masse $M_e$ pour
analyse, on commet une erreur d'échantillonnage dont l'importance,
relativement à la teneur, est influencée par plusieurs facteurs :

-   elle augmente lorsque les fragments sont isométriques (facteur $f$)
    ;

-   elle augmente avec l'homogénéité de la distribution des tailles des
    fragments (facteur $g$) ;

-   elle augmente avec la taille de libération du constituant d'intérêt
    (facteur $l$) ;

-   elle diminue avec la concentration du constituant d'intérêt (facteur
    $\mu_\delta$).

Plus la variance de l'erreur est grande, moins l'échantillon est
représentatif du lot qu'il est censé représenter.

Cette formule est applicable dans le cas où tout le métal est contenu
dans un seul minéral (le constituant d'intérêt). Elle exprime que la
précision obtenue (en termes de variance) est proportionnelle à la masse
de l'échantillon et inversement proportionnelle au cube de la taille des
fragments les plus gros --- ou à $d^{2.5}$ lorsque la taille des
fragments est supérieure à la taille de libération. En effet, dans ce
dernier cas, $l = \left( \frac{d_0}{d} \right)^{0.5}$, et donc la
variance relative $s_r^2 \propto \mu_\delta \cdot d^3 \cdot d^{-0.5}$.

## Facteur pris en compte dans la théorie

La formule de Gy a été élaborée originalement, pour l'essentiel, à
partir de la loi de distribution discrète hypergéométrique qui décrit la
probabilité de tirer \"x\" boules blanches parmi \"n\" quand le lot en
contient $N_1$ boules blanches parmi $N$ boules (tirage sans remise).
Cela revient à dire , dans notre contexte, la probabilité de tiré $N_1$
élément de la carotte représentative de la teneur de celle-ci parmi $N$
élément de la carotte.

Cette loi hypergéométrique, quand $N$ est grand, peut être approchée par
une loi binomiale. Ainsi, la moyenne et la variance de $x/n$
(concentration mesurée) sont alors $N_1/N$ (concentration réelle) et
$\frac{N_1}{N} \left( 1 - \frac{N_1}{N} \right) / n$. La variance
relative sera $\frac{1 - N_1/N}{n \cdot N_1/N}$.

Cette formule indique que la concentration du lot ($N_1/N$) et le nombre
de fragments dans l'échantillon ($n$) jouent chacun un rôle primordial
dans la variance d'échantillonnage. Ainsi, plus la concentration est
élevée, plus la variance relative diminue. De même, plus le nombre de
fragments dans l'échantillon augmente, plus la variance diminue.

Or, le nombre de fragments est directement proportionnel à la masse de
l'échantillon, inversement proportionnel au cube du diamètre, et il est
aussi relié à la forme et la densité des fragments (pour une même masse
d'échantillon, plus la densité est élevée, moins il y aura de
fragments). Tous ces éléments se retrouvent dans la formule de Gy. Il a
aussi réussi à incorporer dans sa formule l'influence du fait que les
fragments peuvent être composés de gangue et du minéral d'intérêt
(facteur de libération \"l\") et le fait que les fragments ne sont pas
tous de la même grosseur (facteur granulométrique \"g\").

Examinons ces facteurs à tour de rôle :

-   **Masse de l'échantillon :** Plus la masse de l'échantillon
    augmente, plus il y a de fragments et moins la variance
    d'échantillonnage est grande (loi binomiale).

-   **Masse du lot :** Plus la masse du lot à échantillonner est faible
    et s'approche de celle de l'échantillon, plus la variance relative
    d'échantillonnage diminue. À la limite, si l'échantillon représente
    100% du lot, il n'y a pas d'erreur d'échantillonnage.

-   **Diamètre des fragments :** Plus les fragments sont gros, moins il
    y en a dans l'échantillon et plus la variance relative augmente.

-   **Forme des fragments (facteur « f ») :** Pour une même distribution
    granulométrique, des fragments plats ou allongés montreront un
    volume plus faible. À densité égale, une masse donnée d'échantillon
    comprendra donc plus de fragments s'ils sont plats ou allongés que
    s'ils sont sphérique.

-   **Taille des fragments homogène vs hétérogène (facteur « g ») :**
    Les calculs de la formule de Gy sont faits en considérant les plus
    gros fragments. Si la courbe granulométrique est très étalée, il y
    aura plus de fragments au total que si elle est très resserrée.

-   **Taille de libération du minéral d'intérêt (facteur « l ») :** Si
    le minéral d'intérêt est entièrement libéré, l'hétérogénéité entre
    chaque grain est maximale (minéral d'intérêt ou gangue). S'il n'est
    pas entièrement libéré, les grains sont plus homogènes entre eux et
    donc un même échantillon devrait être plus précis. À la limite, si
    chaque fragment avait une concentration exactement égale, il n'y
    aurait pas de variance d'échantillonnage. Donc la libération
    maximale est un facteur défavorable toutes autres choses étant
    égales.

-   **Concentration du constituant d'intérêt (facteur $\mu_d$) :** À
    densité constante, si la concentration du minéral d'intérêt augmente
    ($a_L$), il y a plus de fragments du minéral d'intérêt et l'écart
    relatif entre la vraie proportion et la proportion dans
    l'échantillon tend à diminuer (voir loi binomiale). De plus, pour
    une même concentration, si la densité de la gangue et du minéral
    d'intérêt augmentent alors il y aura moins de fragments. De même, si
    seule la densité du minéral d'intérêt ($d_A$) augmente, ceci
    implique une moins grande proportion volumique de fragments du
    minéral d'intérêt et donc une plus grande variance relative
    d'échantillonnage (loi binomiale).

## Exemples d'application

### Exemple 1 - Mine de Murdochville

La mine de Murdochville fait sauter chaque semaine un volume d'environ
$60\,\text{m} \times 40\,\text{m} \times 10\,\text{m}$. Le minerai est
contenu dans la chalcopyrite, dont la masse spécifique est de
$4.2\,\text{g/cm}^3$, tandis que celle de la roche encaissante, la
gangue, est de $3\,\text{g/cm}^3$. Les plus gros blocs résultant du
sautage ont un diamètre d'environ $0.5\,\text{m}$. On déverse le minerai
dans un concasseur qui réduit la taille des blocs à environ
$10\,\text{cm}$. La taille de libération de la chalcopyrite est
d'environ $1\,\text{mm}$. La teneur du volume sauté devrait se situer
entre $1\,\%$ Cu et $5\,\%$ Cu.

**Problème :** Quelle masse d'échantillon la mine devrait-elle prélever
pour connaître, avec une précision relative de $20\,\%$ (i.e.
$s_r/a_L = 0.2$), la teneur en cuivre du volume sauté, dans les deux cas
suivants :

1.  échantillonnage directement au chargeur, avant le concassage ;

2.  échantillonnage après le concassage, sur le convoyeur menant au
    concentrateur.

#### Solution

#### a) Échantillonnage avant le concassage

On pose :
$$f = 0.5, \quad g = 0.25, \quad d = 0.5\,\text{m}, \quad l = \left( \frac{1\,\text{mm}}{500\,\text{mm}} \right)^{0.5} \approx 0.0447$$

La teneur en chalcopyrite est estimée entre :
$$a_L = \frac{1\,\%}{0.35} \approx 2.86\,\%, \quad \text{et} \quad a_L = \frac{5\,\%}{0.35} \approx 14.3\,\%$$

En substituant dans l'expression du facteur $\mu_\delta$, on trouve :
$$\mu_\delta \in [24.1, \, 141.5]$$

On impose une précision relative
$s_r = 0.2 \Rightarrow s_r^2 = 0.2^2 = 0.04$. En remplaçant dans la
formule de variance :

$$0.04 = \mu_\delta \cdot l \cdot f \cdot g \cdot \frac{d^3}{M_e}$$

$$M_e = \mu_\delta \cdot l \cdot f \cdot g \cdot \frac{d^3}{0.04}
= \mu_\delta \cdot 0.0447 \cdot 0.5 \cdot 0.25 \cdot \frac{0.5^3}{0.04}
\Rightarrow M_e \in [421\,\text{kg},\,2470\,\text{kg}]$$

#### b) Échantillonnage après le concassage

Seuls $d$ et $l$ changent :

$$d = 0.1\,\text{m}, \quad l = \left( \frac{1\,\text{mm}}{100\,\text{mm}} \right)^{0.5} = 0.1$$

$$M_e = \mu_\delta \cdot 0.1 \cdot 0.5 \cdot 0.25 \cdot \frac{0.1^3}{0.04}
\Rightarrow M_e \in [7.5\,\text{kg},\,44\,\text{kg}]$$

On constate donc qu'il est beaucoup plus économique d'échantillonner sur
le convoyeur que d'échantillonner aux points de soutirage de la mine. De
plus, lors de l'échantillonnage au soutirage, les fragments les plus
gros ne peuvent être retenus, introduisant ainsi un biais dans la
méthode, qui affecte à la fois la teneur estimée et la variance
d'échantillonnage. L'échantillonnage aux points de soutirage présente
également un risque opérationnel puisqu'il peut interférer avec la
production minière.

### Exemple 2 - Gisement d'or disséminé

Dans un gisement d'or, où l'or est disséminé et se trouve emprisonné
dans la structure de la pyrite (densité de la pyrite : 5 ; densité des
roches volcaniques : 3), on prélève des carottes de 1 mètre que l'on
divise en 2 demi-carottes. On broie ensuite la demi-carotte en fragments
de 2.5 mm et on prélève environ 100 g pour analyse. La procédure
est-elle adéquate si la demi-carotte a une teneur de 5 ppm, une taille
de libération (de la pyrite), $d_0$, de 0.1 mm, un facteur de forme,
$f$, de 0.5 et un facteur de distribution, $g$, de 0.75 ? La
concentration moyenne de l'or dans la pyrite est d'environ 50 ppm.

Supposons que si la carotte renferme 5 ppm d'or, elle renferme 10% de
pyrite. On calcule :
$$\mu\delta = 43.2, \quad  avec \quad a_L = 0.1, \delta_a = 5, \delta_g = 3$$

On a aussi que :
$$\quad l = (0.1/2.5)^{0.5} = 0.2, \quad f = 0.5, \quad g = 0.75.$$

En utilisant la formule de la précision relative ($s_r^2$) :
$$s_r^2 = \frac{43.2 \times 0.2 \times 0.5 \times 0.75 \times 0.25^3}{100} = 0.0005$$
Ce qui donne : $$s_r = 0.02$$ La procédure est excellente, elle
permettra une précision de l'ordre de 2%.

### Exemple 3 - Gisement d'or natif

Dans un contexte similaire à l'exemple 2, si l'or se présente sous forme
native (i.e. des pépites d'or), avec une taille de libération de 0.01
mm, la procédure est-elle toujours adéquate ? Ici, le facteur
$\mu\delta$ est approximativement :
$$\mu\delta = \frac{1}{5\, \text{ppm}} \times 19 = 3.8 \times 10^6 \quad (\text{19 : densité de l’or})$$

Le calcul de $\mu\delta$ est réaliser avec $a_L=5 \cdot 10^{-6}$, soit 5
ppm. Le constituant d'intérêt est l'or natif cette fois-ci et non la
pyrite.

Le facteur de libération est de 0.063 ($l=(0.001/0.25)^{0.5}=0.063$).
Nous posons le facteur de forme égale à 0.2, car l'or se présente sous
forme de paillettes, et le facteur de distribution est maintenue à 0.75.

En utilisant la formule de la précision relative $s_r^2$ :
$$s_r^2 = \frac{3.8 \cdot 10^6 \times 0.063 \times 0.2 \times 0.75 \times 0.25^3}{100} = 28.05$$
Ce qui donne : $$s_r = 5.3$$ La procédure est inadéquate. La teneur
obtenue à l'analyse se situera entre 0 ppm et 50 ppm dans 95% des cas,
alors que la vraie teneur est 5 ppm. Pour avoir une précision
acceptable, il faudrait analyser toute la demi-carotte ou broyer
beaucoup plus finement que 2.5 mm avant de prélever 100 g pour former
l'échantillon.

## Procédures multistages

Les procédures d'échantillonnage nécessitent presque toujours plusieurs
étapes successives de broyage et d'échantillonnage. Par exemple, une
demi-carotte peut être broyée à 2.5 mm, puis un sous-échantillon de
100 g est prélevé. Ce dernier est ensuite broyé à 0.5 mm, suivi d'un
prélèvement de 30 g, qui est à son tour broyé à 0.1 mm, avant de
prélever un dernier sous-échantillon de 5 g destiné à l'analyse.

On reconnaît ainsi trois étapes de broyage (2.5 mm, 0.5 mm et 0.1 mm) et
trois étapes de sous-échantillonnage (100 g, 30 g, 5 g). Chaque étape de
sous-échantillonnage introduit une erreur d'échantillonnage, dont on
peut calculer la variance relative à l'aide des équations précédemment
présentées. Ces sous-échantillonnages étant réalisés de manière
indépendante, les erreurs associées sont également indépendantes. Par
conséquent, les **variances relatives s'additionnent**. Il n'est pas
anodain the la phrase précédente soit mentionné en gras. En statistique,
ses les variaces qui s'additionnent et non les écart-type. La formule de
Gy fournit une écart-type relative, il ne faut donc pas oublier de
réaliser de calculer les variances à partir des écart-type obtenue.

Dans une procédure d'échantillonnage, c'est donc le maillon faible ---
c'est-à-dire l'étape de sous-échantillonnage générant la plus grande
erreur --- qui sera responsable de la majorité de la variance totale de
l'erreur. Il est essentiel d'identifier ce maillon faible afin
d'apporter les ajustements nécessaires et améliorer la représentativité
de l'échantillon.

Sur un graphique où l'on porte en abscisse (*x*) la taille des plus gros
fragments, et en ordonnée (*y*) la masse de l'échantillon, on peut
représenter chaque étape de concassage ou broyage par un segment
horizontal, et chaque étape de sous-échantillonnage par un segment
vertical. Il est possible de superposer à ce graphique les courbes de
variance relative correspondant à chaque taille et chaque masse
d'échantillon (voir section suivante). Cela permet de détecter aisément
les étapes critiques qui nécessitent des améliorations pour obtenir un
échantillon plus représentatif.

## Représentation graphique

Les facteurs ayant le plus d'influence sur la variance d'échantillonnage
sont nettement la taille des plus gros fragments et la masse de
l'échantillon. Sur des échelles log-log, la variance d'échantillonnage
varie de façon linéaire en fonction de la taille des fragments et de la
masse de l'échantillon.

On peut ainsi construire une série de droites sur ce graphique, ayant
une pente de 3 lorsque $d < d_0$, et une pente de 2.5 lorsque $d > d_0$,
ces droites représentant des configurations assurant une variance
d'échantillonnage constante à chaque étape d'un sous-échantillonnage.

La [Fig. %s](#C3_AbaqueGy.png) présente des isocontours (i.e., des plages de
valeur pour $M_e$ et $d$ qui fournisseent la même écart-type relative
$s_r$ pour les paramètres suivants :
$M_L = 10 000g, d_0=0.04 cm, \delta_g=2.8, \delta_a=5, f=0.5, g=0.5, a_L=0.03$.

```{figure} images/C3_AbaqueGy.png
:label: C3_AbaqueGy.png
:align: center 
Exemple d’un abaque de Gy pour une procédure multistage.
```

à partir de cete représentation graphique, il est facile, lorsque l'on
connait la procédure multistage de la représenter et d'observer
facilement, sans calcul, si la procédure est bonne.

Par exemple, nous procédons à l'analyse d'une carotte de 10 000g
($M_L = 10000$). Nous prédons à trois séries de concassage/broyage afin
de passer à des tailles de grains de $d=0.5cm$, $d=0.02cm$, et
$d=0.007cm$. On prélève 5300g à la première échantillon, 100g au second
et 25g sont prélevé pour l'analyse. La
[Fig. %s](#C3_AbaqueGyEx.png) présente cette procédure. Nous partons du
point A avec une carotte de 10 000g broyé à unee taille de 0.5cm. Nous
échantillonons 5300g de celle-ci. On se déplace alors au point B à la
verticale. On procède au broyage de ces 100g vers une taille de 0.02cm
ce qui nous mème au point C. On prélève 100g du lot de 5300g ce qui nous
amène, cette-foisci au point D. De ce 100g, on doit l'anmeer à la taille
d'analyse, soit 0.007cm qui nous amène au point E. La dernière étape est
d'échantillonner le 25g requit pour l'analyse.

```{figure} images/C3_AbaqueGyEx.png
:label: Chap4_AbaqueGyEx.png
:align: center 
Exemple d’application de l’abaque de Gy pour une procédure multistage.
```

On note que l'on performe trois étapes d'échantillonnage. Seulement ces
étapes produissent une erreur d'échantillonage. Nous assumons que lors
du concassage ou du broyage, aucune perte de matériel est réalisé.
Ainsi, le calcul de variance relative est obtenue par l'addition des
trois variance relative associée à chaque échantillonagge :

$$s^2_r = s^2_{r,1} + s^2_{r,3} +s^2_{r,3}$$

Exemple : Supposons que l'on veuille une écart-type relative inférieur à
0.01 (ligne rouge sur la
[Fig. %s](#C3_AbaqueGyEx.png)). Pour identifier rapidement si la procédure
est adéquate, sans procéder au calcul précéddent, il faut s'assurer que
parmis les points B, D et F (les points associé à l'échantillonnage),
ils soit tous au-dessus de la courbe rouge et que seulement un seul
point sy approche. Cela est le cas dans l'exemple et on peut valider la
prodécude.

## Calcul de l'erreur d'échantillonnage global ($s_r$) de l'exemple

Données : $$\begin{aligned}
a_L &= 0.03 \\
f &= 0.5 \\
g &= 0.25 \\
\delta_a &= 5 \ \text{g/cm}^3 \\
\delta_g &= 2.8 \ \text{g/cm}^3 \\
d_0 &= 0.04 \ \text{cm}\end{aligned}$$

Calcul de $\mu\delta$ :
$$\mu\delta = \frac{1 - a_L}{a_L} \cdot \left[ (1 - a_L) \cdot \delta_a + a_L \cdot \delta_g \right]
= \frac{1 - 0.03}{0.03} \cdot \left[ (1 - 0.03) \cdot 5 + 0.03 \cdot 2.8 \right]
= 159.5$$

Calcul de $K$ : $$K = \mu_\delta \cdot f \cdot g 
= 159.5 \cdot 0.5 \cdot 0.25 
= 19.94 \ \text{g/cm}^3$$

Calcul des $s_r$ pour chaque étape d'échantillonnage. Noter que la masse
du lot ($M_L$), la masse d'échantillon ($M_e$), la taille ($d$) et la
facteur de libération ($l$) varie en fonction de l'étape
d'échantillonnage.

-   **Étape B**\
    $M_e = 5300$ g, $M_l = 10000$ g, $d = 0.5$ cm\
    $\ell = \left( \frac{0.04}{0.5} \right)^{0.5} = 0.2828$\
    $S_r^2 = \frac{19.94 \times 0.2828 \times 0.53}{5300} \left(1 - \frac{5300}{10000}\right) = 6.25 \times 10^{-5}$\
    $\Rightarrow S_r = 0.008$

-   **Étape D**\
    $M_e = 100$ g, $M_l = 5300$ g, $d = 0.02$ cm\
    $\ell = 1$\
    $S_r^2 = \frac{19.94 \times 1 \times 0.023}{100} \left(1 - \frac{100}{5300} \right) = 1.56 \times 10^{-6}$\
    $\Rightarrow S_r = 0.001$

-   **Étape F**\
    $M_e = 25$ g, $M_l = 100$ g, $d = 0.007$ cm\
    $\ell = 1$\
    $S_r^2 = \frac{19.94 \times 1 \times 0.0073}{25} \left(1 - \frac{25}{100} \right) = 2.05 \times 10^{-7}$\
    $\Rightarrow S_r = 0.0005$

**Erreur globale :**\
$S_{r,global}^2 = 6.25 \times 10^{-5} + 1.56 \times 10^{-6} + 2.05 \times 10^{-7} = 6.43 \times 10^{-5}$\
$\Rightarrow S_{r,global} = 0.008$

Le calcul complet montre clairement que l'échantillonnage à l'étape B
est celui qui introduit le plus de variance. L'erreur relative finale,
$S_{r,\text{global}}$, est pratiquement égale à celle de l'étape B,
$S_{r,1}$. À noter que, dans cet exemple, les valeurs apparaissent
égales en raison des arrondis, ce qui n'est pas le cas en réalité.



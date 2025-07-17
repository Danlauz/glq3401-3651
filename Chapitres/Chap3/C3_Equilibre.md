# 3.3 Teneur de coupure d'équilibre

Les teneurs de coupure précédentes ont été déterminées en fonction des
caractéristiques économiques et des limites de capacité de chaque
composante, considérées séparément. On peut également définir trois
autres teneurs de coupure, qui feront intervenir la distribution des
teneurs des blocs sélectionnés. Ces teneurs, dites d'équilibre, sont
définies de manière à ce que les éléments pris deux à deux soient en
équilibre en termes de quantités traitées.

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

## Teneur de coupure d'équilibre : Concentrateur-Marché

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
$x_c$ en fonction de $c$ et de $g_c$ en fonction de $c$, afin de
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
positives, car la fonction de répartition $F(z)$ d'une loi normale est symétrique par
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

La table de la loi normale est fournie en fin de section.

## Exemple du calcul des teneurs d'équilibre

Pour calculer les teneurs d'équilibre, on vous fournira généralement les
courbes $x_c$, $g_c$ et $x_c g_c$ en fonction de $c$, comme illustré à
la [Fig. %s](#C3_xc_gc.png), ou bien il faudra les calculer comme présenté
dans la section précédente.

```{figure} images/C3_xc_gc.PNG
:label: C3_xc_gc.png
:align: center 
Impact de la variance sur le teneur de coupure.
``` 

Par exemple, pour la teneur de coupure d'équilibre mine–concentrateur $c_{12}$, si la capacité de minage $M$ est de 10 et que la capacité de traitement $H$ est de 2{,}2, on doit obtenir :

$$
x_c = \frac{H}{M} = \frac{2{,}2}{10} = 0{,}22.
$$

Si la moyenne ($m$) et la variance ($s^2$) de la distribution log-normal sont respectivement de $1{,}5\%$ et $(2\%)^2$, on peut alors construire les courbes de la [Fig. %s](#C3_xc_gc.png). Par **lecture graphique**, on obtient que la teneur de coupure correspondante est d’environ $2{,}00\%$.

On peut déduire la teneur de coupure d'équilibre mine-marché et concentrateur-marché de la même manière, à partir de la lecture graphique.
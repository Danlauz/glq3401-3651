# 1.4 - Rappel de probabilités et statistiques

La géostatistique est une branche des statistiques dédiée à l'analyse des données spatiales et spatio-temporelles. Elle permet notamment de modéliser et de prédire les distributions de probabilité de variables telles que les teneurs en minerai. Pour bien en saisir les principes, il est essentiel de maîtriser la terminologie et les concepts fondamentaux des probabilités et des statistiques.

## Variable aléatoire, fonction de densité et fonction de répartition

Une variable aléatoire (v.a.) est une fonction mathématique qui associe un résultat numérique à chaque issue possible d'une expérience aléatoire. Bien que les valeurs possibles de la v.a. soient connues, sa réalisation précise ne peut être déterminée *a priori* sans observation directe. Par exemple : la teneur en cuivre d'une carotte de forage de 1 mètre, l'épaisseur d'une veine minéralisée, la concentration d'un polluant dans une nappe phréatique ou le pH de l'eau de pluie.

Même si la valeur exacte que prendra une variable aléatoire n'est pas connue, il est possible d'estimer la probabilité qu'elle prenne certaines valeurs.

Cette information est décrite à l'aide de la **fonction de masse** $p_X(x)$ pour les v.a. **discrètes** et de la **fonction de densité** $f_X(x)$, pour les v.a. **continues**. Dans ce contexte, nous nous concentrerons sur les variables aléatoires continues.

La fonction de densité $f_X(x)$ vérifie deux propriétés essentielles :

1.  Elle est **positive** partout :
    $$f_X(x) \geq 0 \quad \text{pour tout } x \in \mathbb{R}$$

2.  L'**aire sous la courbe** est égale à 1 (probabilité totale) :
    $$\int_{-\infty}^{\infty} f_X(x) \, dx = 1$$

La probabilité que la variable aléatoire prenne une valeur comprise
entre deux bornes $a$ et $b$, soit $P(a \leq X \leq b)$, est donnée par
l'intégrale de la fonction de densité entre ces deux bornes :
$$P(a \leq X \leq b) = \int_a^b f_X(x) \, dx$$

Cela mène à la définition de la fonction de répartition, notée $F_X(x)$, qui représente la probabilité que la variable aléatoire $X$ prenne une valeur inférieure ou égale à $x$ :
$$F_X(x) = P(X \leq x) = \int_{-\infty}^{x} f_X(t) \, dt$$

La fonction de répartition est une fonction croissante, bornée entre 0 et 1, et continue pour les variables continues. Elle est particulièrement utile pour visualiser la distribution cumulative des probabilités et pour déterminer des quantiles, comme la médiane (valeur pour laquelle $F_X(x) = 0{,}5$).

## Mise en contexte

Soit $Z(x)$ une variable aléatoire représentant la valeur d'intérêt (comme une teneur, une température, ou un niveau piézométrique) à une position spatiale $x$. Bien qu'une valeur réelle existe à ce point, la géostatistique considère cette valeur comme aléatoire tant qu'elle n'a pas été mesurée. Ainsi, à partir des informations disponibles, on définit la probabilité que cette valeur prenne une certaine plage de valeurs, via la fonction de répartition conditionnelle :

$$F(z, x) = \text{Prob} \left\{ Z(x) \leq z \mid \text{informations} \right\}$$

Cette formulation met en lumière que, en géostatistique, la fonction de répartition dépend explicitement de la localisation $x$ de la variable. Cela souligne le caractère régionalisé des variables aléatoires étudiées, c'est-à-dire leur dépendance à une position spatiale ou temporelle.

## Mesures de tendance centrale

Les mesures de tendance centrale résument une distribution de probabilité par une valeur représentative des résultats possibles. Voici les principales :

-   **Mode** : valeur $x$ pour laquelle la fonction de densité $f_X(x)$
    est maximale. Il s'agit du point le plus probable :
    $$\text{Mode} = \underset{x}{\arg\max} \ f_X(x)$$

-   **Médiane** : valeur $x$ telle que la moitié des observations se
    situent en dessous de cette valeur : $$P(X < x) = 0{,}5
        \quad \Leftrightarrow \quad
        \int_{-\infty}^{x} f_X(t) \, dt = 0{,}5$$

-   **Moyenne (ou espérance)** : valeur moyenne attendue de la variable
    aléatoire, notée $\mu$ :
    $$\mu = E[X] = \int_{-\infty}^{\infty} x f_X(x) \, dx$$

Ces mesures peuvent différer selon la forme de la distribution. Par exemple, pour une distribution symétrique comme la loi normale, la moyenne, la médiane et le mode coïncident. Pour des distributions asymétriques (ex. : loi log-normale), ces mesures seront différentes.

## Mesures de dispersion

Les mesures de dispersion décrivent la variabilité ou l'étendue des valeurs d'une variable aléatoire autour de sa moyenne. Elles sont essentielles pour comprendre l'incertitude et la répartition des données.

-   **Variance :** Mesure l'étendue des valeurs par rapport à la moyenne, quantifiant l'écart quadratique moyen :
    $$\sigma_X^2 = E[(X - \mu)^2] = \int_{-\infty}^{\infty} (x - \mu)^2 f_X(x) \, dx$$

-   **Écart-type :** La racine carrée de la variance, exprimant la dispersion des données dans les mêmes unités que la variable, pour une interprétation plus intuitive :
    $$\sigma_X = \sqrt{\sigma_X^2}$$

-   **Asymétrie :** Indique l'asymétrie de la distribution par rapport à sa moyenne. Une asymétrie positive signifie une queue plus longue vers la droite, négative vers la gauche :
    $$\frac{E[(X - \mu)^3]}{\sigma_X^3}$$

-   **Aplatissement :** Mesure le degré de "pic" ou de "plat" de la distribution par rapport à une distribution normale. Une valeur élevée indique une distribution plus pointue avec des queues plus épaisses :
    $$\frac{E[(X - \mu)^4]}{\sigma_X^4}$$

## Estimation à partir d'un échantillon

L'estimation à partir d'un échantillon consiste à inférer les caractéristiques d'une population ou d'une distribution inconnue à partir de données observées. Ces estimations, basées sur des statistiques calculées à partir de l'échantillon, incluent les paramètres de tendance centrale, de dispersion, et la forme de la distribution de la variable.

-   **Moyenne empirique :** L'estimation de la moyenne de la population à partir d'un échantillon est donnée par la somme des valeurs observées divisée par leur nombre total :
    $$\bar{x} = \frac{1}{n} \sum_{i=1}^n x_i$$ 
    Elle est l'estimateur de la tendance centrale de la variable aléatoire.

-   **Variance empirique :** Pour estimer la variabilité des données d'un échantillon par rapport à la moyenne empirique, on utilise :
    $$s^2 = \frac{1}{n-1} \sum_{i=1}^n (x_i - \bar{x})^2$$ 
    Le facteur $n-1$ (au lieu de $n$) est une correction pour obtenir un estimateur sans biais de la variance de la population.

-   **Fonction de densité :** La forme de la fonction de densité peut être visualisée et estimée à l'aide d'un histogramme, qui représente la distribution des données par intervalles.

-   **Fonction de répartition empirique :** Notée $F(x)$, elle donne la proportion d'observations inférieures ou égales à une valeur donnée $x$ dans l'échantillon :
    $$F(x) = \frac{nombre d’observations ≤ x}{n}$$
    Elle permet de visualiser la distribution cumulative des données.

-   **Estimateur sans biais** : Un estimateur est dit sans biais si son espérance mathématique est égale à la valeur réelle du paramètre qu'il estime. Autrement dit, en moyenne, un estimateur sans biais fournit une estimation correcte du paramètre cible. Par exemple, l'estimateur $Z^*(x)$ d'une teneur vraie $Z^{\text{vraie}}(x)$ est sans biais si :
    $$E[Z^*(x)] = Z^{\text{vraie}}(x)$$

## Fonction de densité conjointe

Lorsqu'on considère plusieurs variables aléatoires, comme deux variables $X$ et $Y$, , leur dépendance peut être représentée par une fonction de densité conjointe, notée $f_{XY}(x,y)$.
Cette fonction décrit la probabilité conjointe que $X$ prenne la valeur $x$ et $Y$ prenne la valeur $y$ simultanément.

La condition de normalisation de cette fonction est la suivante :

$$\iint f_{XY}(x,y) \, dx \, dy = 1$$

Dans le cas de deux variables aléatoires, les mesures usuelles de dépendance sont la covariance et la corrélation :

-   Covariance : $$\text{Cov}(X,Y) = E[(X - E[X])(Y - E[Y])]$$

-   Corrélation :
    $$\rho_{XY} = \frac{\text{Cov}(X,Y)}{\sigma_X \sigma_Y} \in [-1,1]$$

La corrélation est une normalisation de la covariance, ce qui permet d'obtenir une plage de valeurs comprises entre $[-1, 1]$. Une valeur de 1 indique une dépendance linéaire positive parfaite, signifiant que $X$ et $Y$ varient linéairement dans la même direction. Une valeur de -1 signifie une dépendance linéaire négative parfaite (quand $X$ augmente, $Y$ diminue de manière parfaitement linéaire). Une valeur de 0 indique l'absence de dépendance linéaire entre $X$ et $Y$. Il est crucial de noter que si $X$ et $Y$ sont indépendantes, alors leur covariance (et donc leur corrélation) est nulle ; cependant, l'inverse n'est pas toujours vrai (une corrélation nulle n'implique pas nécessairement l'indépendance, sauf dans des cas spécifiques comme la loi normale). La [Fig. %s](#C1_Correlation.png) montre différents scénarios de corrélation entre deux variables.

```{figure} images/C1_Correlation.png
:label: C1_Correlation.png
:align: center 
Différentes corrélations entre deux variables aléatoires $X$ et $Y$.
``` 

Il est également important de noter que si $X$ et $Y$ sont indépendantes, alors la covariance entre $X$ et $Y$ est nulle, c'est-à-dire :
$$\text{Cov}(X, Y) = 0$$

## Propriétés

La variance de la somme de deux variables aléatoires $X$ et $Y$ est
donnée par :
$$\text{Var}(X + Y) = \text{Var}(X) + \text{Var}(Y) + 2 \, \text{Cov}(X, Y)$$

De plus, la variance d'une combinaison linéaire de $X$ et $Y$ est donnée
par :
$$\text{Var}(aX + bY) = a^2 \, \text{Var}(X) + b^2 \, \text{Var}(Y) + 2ab \, \text{Cov}(X, Y)$$

Enfin, la variance de la somme pondérée de $n$ variables aléatoires
$X_1, X_2, \dots, X_n$ est donnée par :
$$\text{Var}\left( \sum_{i=1}^n a_i X_i \right) = \sum_{i=1}^n \sum_{j=1}^n a_i a_j \, \text{Cov}(X_i, X_j)$$

Ces relations sont fondamentales en géostatistique. Leur maîtrise est essentielle, car elles permettent de quantifier et de modéliser la dépendance entre variables, ce qui est crucial pour l'analyse et la prédiction des valeurs à des localisations non échantillonnées dans les contextes miniers de ce cours.





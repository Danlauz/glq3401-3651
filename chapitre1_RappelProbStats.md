# Rappel de probabilités et statistiques

La géostatistique est une branche de la statistique qui se concentre sur
les ensembles de données spatiales ou spatio-temporelles. Elle permet,
par exemple, de prédire les distributions de probabilité des teneurs en
minerai dans le cadre des opérations minières. Il est donc important de
revoir les bases en probabilité et en statistique afin de maîtriser la
terminologie et les concepts mathématiques propres à cette discipline.

## Variable aléatoire, fonction de densité et fonction de répartition

Une variable aléatoire (v.a.) est une fonction mathématique qui associe
un résultat numérique à chaque issue possible d'une expérience
aléatoire. Les valeurs possibles de la v.a. sont connues, mais le
résultat précis d'une réalisation ne peut être déterminé *a priori* sans
observation direct. Par exemple : la teneur en cuivre d'une carotte de
forage de 1 mètre, l'épaisseur d'une veine minéralisée, la concentration
d'un polluant dans une nappe phréatique ou encore le pH de l'eau de
pluie.

Même si la valeur exacte que prendra une variable aléatoire n'est pas
connue, il est possible d'estimer la probabilité qu'elle prenne
certaines valeurs.

Cette information est décrite à l'aide :

-   de la **fonction de masse** $p_X(x)$, pour les v.a. **discrètes**,
    et

-   de la **fonction de densité** $f_X(x)$, pour les v.a. **continues**.

Dans le cadre de nos lectures, nous travaillerons uniquement avec des
variables aléatoires continues.

La fonction de densité $f_X(x)$ vérifie deux propriétés essentielles :

1.  Elle est **positive** partout :
    $$f_X(x) \geq 0 \quad \text{pour tout } x \in \mathbb{R}$$

2.  L'**aire sous la courbe** est égale à 1 (probabilité totale) :
    $$\int_{-\infty}^{\infty} f_X(x) \, dx = 1$$

La probabilité que la variable aléatoire prenne une valeur comprise
entre deux bornes $a$ et $b$, soit $P(a \leq X \leq b)$, est donnée par
l'intégrale de la fonction de densité entre ces deux bornes :
$$P(a \leq X \leq b) = \int_a^b f_X(x) \, dx$$

Cette relation conduit naturellement à la définition de la fonction de
répartition, notée $F_X(x)$, qui donne la probabilité que la variable
aléatoire $X$ prenne une valeur inférieure ou égale à $x$ :
$$F_X(x) = P(X \leq x) = \int_{-\infty}^{x} f_X(t) \, dt$$

La fonction de répartition est une fonction croissante, bornée entre 0
et 1, et continue pour les variables continues. Elle est
particulièrement utile pour visualiser la distribution cumulative des
probabilités et pour déterminer des quantiles, comme la médiane (valeur
pour laquelle $F_X(x) = 0{,}5$).

## Mise en contexte

Soit $Z(x)$ une variable aléatoire représentant la valeur de la variable
d'intérêt à une position $x$. Cette valeur est inconnue (par exemple :
teneur, température, précipitations, niveau piézométrique, etc.). Bien
qu'il existe une valeur réelle en ce point $x$, que l'on pourrait
mesurer, la géostatistique considère cette valeur comme aléatoire, car
elle n'a pas été mesurée (ou ne l'a pas encore été). On définit donc, à
partir de la fonction de répartition, les plages possibles que peut
prendre cette valeur en fonction des informations disponibles concernant
$Z(x)$ :

$$F(z, x) = \text{Prob} \left\{ Z(x) \leq z \mid \text{informations} \right\}$$

Il est important de noter que, dans cet exemple, la fonction de
répartition dépend de la localisation $x$ de la variable. On rappelle
que la géostatistique s'intéresse à des variables aléatoires
régionalisées, c'est-à-dire ayant une position spatiale ou temporelle.

## Mesures de tendance centrale

Les mesures de tendance centrale permettent de résumer une distribution
de probabilité par une valeur représentative de l'ensemble des résultats
possibles. Voici les principales :

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

Ces mesures peuvent différer selon la forme de la distribution. Par
exemple, pour une distribution symétrique comme la loi normale, la
moyenne, la médiane et le mode coïncident. Pour des distributions
asymétriques (ex. : loi log-normale), ces mesures seront différentes.

## Mesures de dispersion

Les mesures de dispersion sont des statistiques qui permettent de
décrire la variabilité ou l'étendue des valeurs d'une variable aléatoire
autour de sa moyenne. Ces mesures sont essentielles pour comprendre
l'incertitude associée à la variable étudiée et pour évaluer à quel
point les données sont concentrées ou dispersées.

-   **Variance :** La variance mesure l'étendue des valeurs par rapport
    à la moyenne et est définie par :
    $$\sigma_X^2 = E[(X - \mu)^2] = \int_{-\infty}^{\infty} (x - \mu)^2 f_X(x) \, dx$$
    Elle donne une idée de l'écart moyen quadratique entre les valeurs
    observées et la moyenne.

-   **Écart-type :** L'écart-type est la racine carrée de la variance et
    permet d'exprimer la dispersion des données dans les mêmes unités
    que la variable elle-même : $$\sigma_X = \sqrt{\sigma_X^2}$$ C'est
    une mesure plus intuitive de la variabilité des données.

-   **Asymétrie :** L'asymétrie mesure l'asymétrie de la distribution
    par rapport à la moyenne. Si l'asymétrie est positive, la
    distribution est étendue vers la droite, tandis que si elle est
    négative, elle est étendue vers la gauche. Elle est calculée par :
    $$\frac{E[(X - \mu)^3]}{\sigma_X^3}$$

-   **Aplatissement :** L'aplatissement indique le degré de \"plateur\"
    ou de \"pic\" de la distribution par rapport à une distribution
    normale. Une valeur élevée indique une distribution plus pointue,
    tandis qu'une valeur faible indique une distribution plus aplatie.
    Il est défini par : $$\frac{E[(X - \mu)^4]}{\sigma_X^4}$$

## Estimation à partir d'un échantillon

L'estimation à partir d'un échantillon consiste à utiliser les données
observées pour estimer les caractéristiques d'une population ou d'une
distribution inconnue. Les estimations reposent sur des mesures
statistiques calculées à partir de l'échantillon disponible. Cela inclut
des estimations des paramètres de tendance centrale, de dispersion, et
de la distribution de la variable.

-   **Moyenne empirique :** La moyenne empirique est l'estimation de la
    moyenne de la population à partir d'un échantillon. Elle est définie
    par : $$\bar{x} = \frac{1}{n} \sum_{i=1}^n x_i$$ C'est la somme des
    valeurs observées divisée par le nombre total d'observations. La
    moyenne empirique est utilisée pour estimer la tendance centrale de
    la variable aléatoire.

-   **Variance empirique :** La variance empirique permet d'estimer la
    variabilité des données dans l'échantillon par rapport à la moyenne
    empirique. Elle est donnée par :
    $$s^2 = \frac{1}{n-1} \sum_{i=1}^n (x_i - \bar{x})^2$$ Cette
    estimation corrige le biais de sous-estimation de la variance de la
    population en utilisant $n-1$ au lieu de $n$.

-   **Fonction de densité :** La fonction de densité empirique peut être
    estimée à l'aide d'un histogramme. Un histogramme est une
    représentation graphique de la distribution des données, divisée en
    intervalles. Il donne une idée de la forme de la distribution et de
    la densité des observations dans chaque intervalle.

-   **Fonction de répartition empirique :** La fonction de répartition
    empirique, notée $F(x)$, donne la proportion d'observations
    inférieures ou égales à une valeur donnée $x$. Elle est calculée
    comme suit : $$F(x) = \frac{\text{rang}(x_i)}{n}$$ où
    $\text{rang}(x_i)$ est le rang de $x_i$ dans l'échantillon,
    c'est-à-dire la position de $x_i$ lorsque les données sont triées
    dans l'ordre croissant. Cette fonction permet de visualiser la
    distribution cumulative des données.

-   **Estimateur sans biais** : Un estimateur est dit sans biais si son
    espérance mathématique est égale à la valeur réelle du paramètre
    qu'il estime. En d'autres termes, un estimateur sans biais fournit,
    en moyenne, une estimation correcte du paramètre cible. Par exemple,
    l'estimateur de la teneur vraie $Z^{\text{vraie}}(x)$ est dit sans
    biais si, en moyenne, notre estimé $Z^*(x)$ retourne la valeur vraie
    : $$E[Z^*(x)] = Z^{\text{vraie}}(x)$$

## Fonction de densité conjointe

Lorsqu'on considère plusieurs variables aléatoires, comme dans le cas de
deux variables $X$ et $Y$, leur dépendance conjointe peut être
représentée par une fonction de densité conjointe, notée $f_{XY}(x,y)$.
Cette fonction décrit la probabilité que $X = x$ et $Y = y$ se
produisent simultanément.

La condition de normalisation de cette fonction de densité conjointe est
la suivante :

$$\iint f_{XY}(x,y) \, dx \, dy = 1$$

Dans le cas de deux variables aléatoires, les mesures usuelles de
dépendance sont la covariance et la corrélation :

-   Covariance : $$\text{Cov}(X,Y) = E[(X - E[X])(Y - E[Y])]$$

-   Corrélation :
    $$\rho_{XY} = \frac{\text{Cov}(X,Y)}{\sigma_X \sigma_Y} \in [-1,1]$$

Il est à noter que la corrélation est une normalisation de la
covariance, ce qui permet d'obtenir une plage de valeurs comprises entre
$[-1, 1]$. Une valeur de corrélation de 1 indique que les valeurs de $X$
et $Y$ sont entièrement dépendantes l'une de l'autre, c'est-à-dire
qu'elles varient de manière parfaitement linéaire dans la même
direction. Une valeur de 0 indique qu'il n'y a aucune dépendance
linéaire entre $X$ et $Y$, c'est-à-dire qu'ils sont indépendants. Enfin,
une valeur de corrélation de -1 signifie que la relation entre $X$ et
$Y$ est inverse, c'est-à-dire que lorsque $X$ augmente, $Y$ diminue de
manière parfaitement linéaire. La [Fig. %s](#Chap1_Correlation.png) montre différent scénario de corrélation
entre deux variables.

```{figure} images/Chap1_Correlation.png
:label: Chap1_Correlation.png
:align: center 
Différentes corrélations entre deux variables aléatoires X et Y.
``` 

Il est également important de noter que si $X$ et $Y$ sont
indépendantes, alors la covariance entre $X$ et $Y$ est nulle,
c'est-à-dire : $$\text{Cov}(X, Y) = 0$$

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

Ces relations sont au cœur même de la géostatistique et constituent très
probablement la relation la plus utilisée dans le domaine. Il est donc
crucial de bien les maîtriser.

En effet, la compréhension de la covariance, de la corrélation et de
leurs applications dans les modèles géostatistiques est essentielle pour
analyser et interpréter correctement les données spatiales et
spatio-temporelles. Ces concepts permettent de quantifier et de
modéliser la dépendance entre différentes variables, ce qui est
fondamental dans la prédiction des valeurs à des localisations non
échantillonnées.

## Interprétation géostatistique

Les v.a en géostatistique sont régionalisées, c'est-à-dire qu'elles
dépendent de leur position spatiale, notée $Z(x)$, où chaque valeur est
associée à une localisation particulière dans l'espace ou dans le temps.
Cette dépendance spatiale est fondamentale en géostatistique, car elle
permet de modéliser et de prédire des valeurs à des positions non
mesurées en fonction des données disponibles à d'autres positions.

## Supports

Le support fait référence à la zone ou à la région sur laquelle les
mesures sont effectuées. En fonction de la taille et de la nature du
support, les statistiques associées à la variable aléatoire peuvent
varier.

-   **Ponctuel :** Si la mesure est effectuée en un seul point, on a la
    valeur moyenne de la variable $Z_G$ sur un support ponctuel, défini
    par : $$Z_G = \frac{1}{|G|} \int_G Z(x) \, dx$$ où $|G|$ représente
    la taille du domaine $G$ et $Z(x)$ est la valeur de la variable
    aléatoire à la position $x$. Le support ponctuel est généralement la
    taille de la carotte.

-   **Blocs :** Si les mesures sont effectuées sur un petit bloc $G$
    , la teneur du bloc, ${Z}_G$, est définie par :
    $${Z}_G = \frac{1}{N} \sum_{i=1}^{N} Z(x_i)$$ où $N$ est le
    nombre d'observations dans le petit bloc $G$, et $x_i$ représente
    les positions de chaque observation à l'intérieur du bloc $G$.

Les statistiques calculées sur la variable aléatoire $Z(x)$ dépendent
directement du support de mesure. En particulier, la variance de la
variable aléatoire a tendance à décroître à mesure que la taille du
support augmente. En effet, plus le support est grand, plus la
variabilité des valeurs mesurées est réduite, ce qui donne lieu à des
estimations plus stables et moins sensibles aux fluctuations locales.

Cependant, la taille optimale du support dépend généralement des
opérations minières et des équipements disponibles pour exploiter cette
taille. Il n'est donc pas correct de dire que plus la taille du support
augmente, plus les profits seront importants. La relation entre la
taille du support et les profits est plus complexe et doit prendre en
compte divers facteurs tels que l'efficacité des équipements, la nature
géologique du gisement et les coûts associés à l'exploitation. Nous
explorerons certaines de ces causes dans les prochaines lectures.





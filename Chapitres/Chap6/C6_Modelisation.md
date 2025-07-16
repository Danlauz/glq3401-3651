# 6.3 Modélisation

Une fois le variogramme expérimental calculé, la prochaine étape consiste à lui ajuster un modèle théorique.  

Les modèles théoriques sont des expressions analytiques paramétriques que l’on cherche à adapter au mieux aux points du variogramme expérimental. Nous en avons déjèa vue plusieurs dans les figures précédentes. Leur rôle est de fournir une fonction continue et régulière permettant de décrire la dépendance spatiale sur toutes les distances, même celles non observées directement.  

Ce modèle sert ensuite à estimer la covariance entre n’importe quels points du champ, et devient la base de toutes les opérations géostatistiques suivantes, comme l’interpolation, la simulation ou l’évaluation d’incertitude.

Pour qu’un modèle théorique soit admissible, il doit respecter une condition fondamentale :  
> La variance de toute combinaison linéaire d’observations, pondérée par des coefficients quelconques, doit être positive ou nulle.

## Conditions d'admissibilité des modèles

Toute fonction ne peut être utilisée comme modèle. Soit une combinaison linéaire de variables aléatoires :

$$
L = \sum_{i=1}^{n} \lambda_i Z_i
$$

Pour qu'un modèle soit admissible, il faut démontrer que pour un nombre arbitraire de données $n$, **toute** valeur possible des poids $\lambda_i$ et **toute** configuration de variables $Z_i$, la **variance** de cette combinaison est **positive ou nulle** :

$$
\text{Var}\left( \sum_{i=1}^{n} \lambda_i Z_i \right) 
= \sum_{i=1}^{n} \sum_{j=1}^{n} \lambda_i \lambda_j \, \text{Cov}(Z_i, Z_j) 
= \sum_{i=1}^{n} \sum_{j=1}^{n} \lambda_i \lambda_j \, C(h_{ij}) \geq 0
$$

où $C(h_{ij})$ est la covariance entre les points $Z_i$ et $Z_j$ séparés par la distance $h_{ij}$.


Or, cette variance peut s'exprimer en fonction du covariogramme (modèles avec palier) ou du variogramme (modèles avec ou sans palier, à condition que la somme des poids de la combinaison linéaire soit nulle). Il faut donc que le covariogramme ou le variogramme assure des variances positives, quelle que soit la combinaison des v.a. considérée.

Dans le cas stationnaire (variogramme avec palier) :

$$
\text{Var}\left(\sum \lambda_i Z_i\right) = \sum_i \sum_j \lambda_i \lambda_j C(h_{ij}) \geq 0
$$

Dans le cas intrinsèque (variogramme sans palier), sous la condition \( \sum \lambda_i = 0 \), on a :

$$
\text{Var}\left(\sum \lambda_i Z_i\right) = \sum_i \sum_j \lambda_i \lambda_j \gamma(h_{ij}) \geq 0
$$

La vérification de l'admissibilité d'un modèle donné est relativement complexe et dépasse le cadre de ce cours. Dans la pratique, on se limite à des modèles éprouvés ou à des modèles construits à partir de modèles éprouvés, en utilisant des propriétés comme :

- Toute somme (coefficients positifs) de modèles de variogramme est admissible ;

- Toute somme (coefficients positifs) de modèles de covariance est admissible ;

- Tout produit (coefficients positifs) de modèles de covariance est admissible ;

- Chaque modèle peut avoir son propre jeu de paramètres (isotrope, anisotrope, palier, portée) ;

IMPORTANT : Un modèle peut être admissible en 1D et non-admissible en 2D, 3D,…,n-D. Par contre, s’il est admissible en n-D il l’est aussi en (n-1)-D jusqu’à 1D.

## Modèles classiques de variogrammes

En géologie, les modèles les plus courants sont :

- **Effet de pépite** :

  \( \gamma(h) = 0 \) si \( h = 0 \), \( C_0 \) si \( h > 0 \)

- **Sphérique** :

  \( \gamma(h) = C \left[ 1.5 \frac{h}{a} - 0.5 \left(\frac{h}{a}\right)^3 \right] \) pour \( 0 < h < a \),  
  \( \gamma(h) = C \) si \( h \geq a \)

- **Gaussien** :

  \( \gamma(h) = C \left[ 1 - \exp\left(-3\left(\frac{h}{a}\right)^2\right) \right] \)

- **Exponentiel** :

  \( \gamma(h) = C \left[ 1 - \exp\left(-3\frac{h}{a}\right) \right] \)

- **Puissance** :

  \( \gamma(h) = C h^b \), avec \( 0 < b < 2 \) (cas particulier : modèle linéaire si \( b = 1 \))

La présente [Fig. %s](#C6_modeles) montre la forme de ces modèles théoriques admissibles, tandis que la [Fig. %s](#C6_simulations) suivante présente une simulation 1D correspondant à ces modèles, c’est-à-dire un champ de données ayant la continuité spatiale du modèle théorique. Plusieurs phénomènes peuvent être observés :

1. Les modèles exponentiel (courbe bleue) et gaussien (courbe verte) sont des modèles asymptotiques. Ils n’atteignent jamais exactement le palier, mais tendent progressivement vers celui-ci. Ainsi, on définit la portée effective comme étant *95 %* du palier. Pour obtenir une portée effective de 20 m, comme dans la [Fig. %s](#C6_modeles), il faut que la valeur du variogramme soit de *0,95*, car le palier est unitaire.

2. Le modèle gaussien (ainsi que le modèle de puissance avec $b = 1.5$) présente un comportement parabolique à l’origine. Cela se traduit par des champs de réalisation beaucoup plus lisses. Ainsi, si l’on considère que notre phénomène géologique sera continu et lisse (par exemple, la topographie), ces modèles sont mieux adaptés.

3. Le modèle de puissance permet de modéliser des variogrammes dont on n’a pas observé le palier ; d'ailleurs on constate qu’il n’atteint jamais le palier.


```{figure} images/C6_modeles.png
:label: C6_modeles
:align: center
Illustration des paramètres du variogramme : effet de pépite, palier et portée.
```

```{figure} images/C6_simulations.png
:label: C6_simulations
:align: center
Illustration des paramètres du variogramme : effet de pépite, palier et portée.
```

# Anisotropie

La continuité spatiale d’un phénomène géologique n’est pas toujours la même dans toutes les directions. On parle alors d’**anisotropie**, c’est-à-dire d’une dépendance directionnelle des propriétés spatiales.

**Exemples concrets :**

- **Gisement lenticulaire** : la continuité est meilleure le long de l’allongement principal des lentilles que perpendiculairement à celui-ci.
- **Gisement stratiforme** : la continuité est plus forte parallèlement aux strates qu’en direction perpendiculaire.
- **Placer alluvionnaire** : la continuité est meilleure le long des paléochenaux que transversalement.
- **… et bien d’autres cas encore.**

Bien que la nature présente une grande diversité d’anisotropies complexes, la géostatistique modélise principalement les anisotropies géométriques, qui sont plus simples à représenter et à gérer.

---

## Anisotropie géométrique

L’anisotropie géométrique correspond à une situation où les propriétés spatiales d’un phénomène varient selon la direction. Plus précisément, cela signifie que les variogrammes directionnels présentent le **même palier** dans toutes les directions, mais des **portées différentes**. Autrement dit, la distance à laquelle la corrélation spatiale décroît jusqu’à atteindre le palier dépend de la direction considérée.

Ce type d’anisotropie est généralement modélisé à l’aide d’un **ellipsoïde** (ou d’une **ellipse** en 2D), d’où le terme *géométrique*. On y observe un **effet de pépite constant**, un **palier constant**, mais des **portées directionnelles variables**. En deux dimensions, l’anisotropie est représentée par une ellipse définie par une portée maximale ($a_g$) et une portée minimale ($a_p$), situées dans deux directions orthogonales. Ainsi, les portées décrivent une ellipse dont l’axe majeur est orienté selon la direction de $a_g$.

La portée effective en fonction de l’angle $\theta$ (mesuré à partir de la direction de $a_g$) est donnée par :

$$
a_\theta = \sqrt{a_g^2 \cos^2(\theta) + a_p^2 \sin^2(\theta)}
$$

On peut alors estimer le variogramme directionnel $\gamma(h, \theta)$ soit en utilisant directement $a_\theta$, soit en corrigeant la distance $h$ pour tenir compte de l’anisotropie, selon :

$$
\gamma(h_{\theta},\theta) = \gamma(h_g)
$$

où la distance corrigée $h_g$ est donnée par :

$$
h_g = \sqrt{ \left( h_{\theta} \cos(\theta) \right)^2 + \left( \frac{a_g}{a_p} \, h_{\theta} \sin(\theta) \right)^2 }
$$


L’anisotropie géométrique est typiquement observée dans les milieux où la géologie montre un **allongement préférentiel**, comme dans le cas des lentilles minéralisées, des paléochenaux ou des gisements stratiformes.

La [Fig. %s](#C6_anisotropie) illustre une ellipse représentant les paramètres utilisés pour calculer la portée en fonction de la direction.

```{figure} images/C6_anisotropie.png
:label: C6_anisotropie
:align: center
Illustration d’une anisotropie géométrique.
```

**Note :**  
Dans le cas de l’anisotropie géométrique, il est toujours possible, par une simple rotation suivie d’une mise à l’échelle (dilatation), de transformer le système en un modèle isotrope. C’est précisément ce que permet la méthode fondée sur le calcul de la distance transformée $h_g$.


---

## Exemple

Un gisement 2D est modélisé par un modèle avec anisotropie géométrique. Le modèle est sphérique, avec $C = 17%^2$ et un effet de pépite $C_0 = 13%^2$. Les portées sont de 100 m dans la direction (convention trigonométrique) de plus grande continuité ($30^\circ$), et de 60 m dans la direction de plus petite continuité ($120^\circ$). Quelle est la valeur du variogramme entre deux observations situées aux coordonnées $(x_1, y_1) = (10, 30)$ et $(x_2, y_2) = (40, 20)$ ?

### 1ère méthode :

On calcule la distance séparant les deux points et la direction qu’ils définissent:

$$
h = \sqrt{(20-30)^2 + (40-10)^2} = 31.62\, m
$$

$$
\theta = \arctan\left(\frac{20-30}{40-10}\right) = -18.4^\circ
$$

Cette direction forme un angle de $48{,}4^\circ$ avec la direction de plus grande continuité. Un schéma illustrant les directions et les angles permet de comprendre visuellement pourquoi on obtient cette valeur. Cette étape est laissée à votre soin.

Par la suite, on calcule la portée dans cette direction en utilisant la formule présentée plus haut :

$$
a_{\theta} = \sqrt{100^2 \times \cos^2(48.4^\circ) + 60^2 \times \sin^2(48.4^\circ)} = 70.81\, m
$$

La dernière étape consiste à calculer la valeur du variogramme en utilisant l’équation du modèle sphérique, pour une distance de $h = 31{,}62,\text{m}$ et une portée directionnelle de $a_\theta = 70{,}81,\text{m}$ :

$$
\gamma_{\theta}(31{,}62) = 13\%^2 + 17\%^2 \left[ 1.5 \times \frac{31{,}62}{70{,}81} - 0.5 \times \left( \frac{31{,}62}{70{,}81} \right)^3 \right] \approx 23{,}63\%^2
$$


### 2ème méthode :

On calcule la distance équivalente dans la direction de meilleure continuité avec la formule précédente, où $\theta$ représente l’angle entre la direction de meilleure continuité et la direction définie par les deux points ($48.4^\circ$) :

$$
h_g = \sqrt{ (31{,}62 \times \cos(48{,}4^\circ))^2 + \left( \frac{100}{60} \times 31{,}62 \times \sin(48{,}4^\circ) \right)^2 } \approx 44{,}65 \, m
$$

Ensuite, on calcule la valeur du variogramme en utilisant l’équation du modele sphérique pour la distance $h_g = 44.65m$ et avec la
portée $a_g= 100m$ :

$$
\gamma_{\theta}(44{,}65) = 13\%^2 + 17\%^2 \left[ 1.5 \times \frac{44{,}65}{ 100} - 0.5 \times \left( \frac{44{,}65}{100} \right)^3 \right] \approx 23{,}63\%^2
$$

---

### Remarques importantes concernant la détection d’anisotropies géométriques

a) Le facteur d’anisotropie géométrique estimé à partir des variogrammes expérimentaux tend généralement à sous-estimer le facteur réel. Cela s’explique par l’usage d’une fenêtre angulaire et par le fait que les variogrammes expérimentaux ne sont pas toujours orientés précisément selon les directions principales de l’ellipse d’anisotropie.

b) En pratique, une estimation correcte — voire la détection même — de l’anisotropie géométrique ne peut être obtenue que si quatre conditions essentielles, étroitement liées, sont remplies simultanément :

- Le nombre de données est suffisant, typiquement au moins 50.
- Le facteur d’anisotropie est suffisamment marqué, idéalement supérieur à 1,5.
- Au moins une des directions utilisées dans le calcul du variogramme est proche de la direction de la portée maximale.
- La fenêtre angulaire employée pour le calcul est suffisamment étroite afin de cibler précisément la direction, c’est-à-dire avec une faible tolérance angulaire.

La [Fig. %s](#C6_RapportApparentDirection) suivante montre le rapport d’anisotropie apparent observé en considérant les directions $\theta$ et $\theta + 90^\circ$ (avec $\theta$ l’angle par rapport à la direction de plus grande portée $a_g$), en fonction du rapport d’anisotropie réel $\frac{a_g}{a_p}$. On constate qu’un rapport d’anisotropie peut facilement être sous-estimé si la direction de plus grande portée n’est pas correctement identifiée.

Autrement dit, si l’une de nos directions de calcul coïncide avec celle de la grande portée, nous allons très probablement estimer correctement le rapport réel (correspondant à la droite $x = y$, soit la courbe $0^\circ$). En revanche, si notre direction d’analyse est à $45^\circ$ alors que $a_g$ est à $35^\circ$ (soit une différence de $10^\circ$, correspondant à la courbe $10^\circ$), nous n’observerons qu’un rapport apparent d’anisotropie, sous-estimé par rapport à la valeur réelle. Ce phénomène s’accentue d’autant plus que la différence entre la direction réelle et la direction utilisée dans les calculs s’amplifie.

```{figure} images/C6_RapportApparentDirection.png
:label: C6_RapportApparentDirection
:align: center
Rapport apparent en fonction de la direction ($\theta$ : angle avec $a_g$) et du rapport d'anisotropie.
```

La [Fig. %s](#C6_RapportApparent) suivante montre le rapport d’anisotropie apparent que l’on devrait observer en fonction de l’angle de tolérance (fenêtre angulaire) adopté dans le calcul du variogramme. On constate que plus la fenêtre augmente, plus l’anisotropie observée diminue. Autrement dit, plus la tolérance angulaire est large, plus notre capacité à détecter correctement l’anisotropie se réduit. À noter que, parfois, on est contraint d’augmenter la fenêtre par manque de données. Il vaut mieux détecter une anisotropie même légère que de ne pas la détecter du tout.

```{figure} images/C6_RapportApparent.png
:label: C6_RapportApparent
:align: center
Rapport apparent en fonction de la tolérance et du rapport d'anisotropie.
```

---

## Anisotropie zonale

Parfois, une simple correction géométrique ne suffit pas à rendre les modèles isotropes. C'est le cas par exemple si l’on observe des paliers différents selon la direction ou si les portées ne décrivent pas une ellipse. On peut alors tenter d'ajuster les variogrammes expérimentaux directionnels à l'aide d'une somme (ou éventuellement d'un produit de covariances) de modèles isotropes ou avec anisotropie géométrique.

Parfois la physique du phénomène peut aider à déterminer le modèle. Ainsi, en hydrogéologie, la charge hydraulique est une quantité anisotrope par sa nature même; en effet, dans le sens de l'écoulement on observe les variations maximales alors que perpendiculairement à l'écoulement la charge est constante.

La modélisation d'anisotropies zonales est généralement assez délicate et nécessite une certaine expérience. Le modèle le plus simple d'anisotropie zonale consiste à combiner une ou plusieurs composantes isotropes à une composante avec anisotropie géométrique dont $a_g$ est infinie.

$$
\gamma_{\text{zonal}}(h, \theta) = \gamma_{\text{isotrope}}(h) + \gamma_p\bigl(h \sin(\theta(h))\bigr)
$$

où l’indice $p$ réfère au modèle anisotrope suivant la direction de portée minimale.

---

## Cas 3D

En 3D, l’ellipse d’anisotropie devient un ellipsoïde. Pour entièrement spécifier le modèle, il faut fournir les trois portées principales (axes de l'ellipsoïde) et les 3 angles de rotation qui permettent de faire coïncider le système de référence avec les axes de l'ellipsoïde. Souvent la géologie dictera les directions où calculer le variogramme pour tenter de détecter une éventuelle anisotropie (ex. perpendiculairement à la stratigraphie et dans le plan de la stratigraphie.

Lors de l'utilisation d'un programme de calcul de variogramme ou de krigeage, il est très important de bien comprendre les conventions utilisées pour le système de référence et les rotations afin de spécifier correctement les modèles. Habituellement, le système de référence utilisé est le système « main droite » (pouce pointe vers "z", la main droite repliée va de "x" vers "y").

La modélisation en 3D est parfois très difficile en raison d’une disposition défavorable des observations. Si l’on prend l’exemple d’une grille régulière de forages verticaux, on dispose de beaucoup de paires pour toute distance selon la verticale. Par contre, dans le plan horizontal, aucune paire ne peut être formé pour des distances autres qu’un multiple du pas de grille. Si le pas est large, ce qui est souvent le cas, on aura très peu de points sur le variogramme expérimental et la détermination des portées dans ces directions sera difficile. La
situation se complique davantage lorsque la géologie ne suit pas les directions du système de référence.

Finalement, il faut noter qu’en 3D, la spécification des paramètres de recherche de paires pour le calcul du variogramme nécessite une bonne dose de réflexion afin de s’assurer que la zone spécifiée correspond bien à celle désirée. Par exemple, une tolérance angulaire de $10^\circ$ sur la direction et sur le pendage du vecteur souhaité ne représentent pas du tout la même enveloppe si le vecteur considéré est horizontal ou vertical. Ce ne sont pas tous les programmes qui permettent de spécifier un cône de tolérance autour de l'orientation du vecteur distance
souhaitée.


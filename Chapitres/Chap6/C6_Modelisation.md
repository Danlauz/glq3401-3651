# 6.3 Modélisation

Les modèles sont des expressions analytiques que l'on tente d'ajuster le mieux possible aux points des variogrammes expérimentaux.

## Conditions d'admissibilité des modèles

Toute fonction ne peut être utilisée comme modèle. Soit une somme quelconque de variables aléatoires (plus généralement, une combinaison linéaire de telles v.a.), la variance de cette combinaison est nécessairement positive (une variance est, par définition, toujours positive).

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

- Une combinaison linéaire (avec coefficients positifs) de variogrammes admissibles donne un modèle admissible.

- Un produit de modèles de covariance admissibles donne un modèle de covariance admissible.

- Un modèle admissible en \( \mathbb{R}^p \) est admissible en \( \mathbb{R}^{p-1} \), l’inverse n’étant pas nécessairement vrai.

## Types de modèles courants

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

L'effet de pépite est presque toujours combiné à un ou plusieurs autres modèles. D'autres modèles existent également.

# 2.4.1 Anisotropies

La continuité spatiale n'est pas nécessairement la même dans toutes les directions.

Exemples :

- Gisement présentant une forme lenticulaire : on peut avoir une meilleure continuité selon l'allongement principal des lentilles ;

- Gisement stratiforme : meilleure continuité parallèlement aux strates que perpendiculairement ;

- Placer : meilleure continuité le long des paléochenaux que perpendiculairement ;

- etc.

Bien que dans la nature il existe une très grande variété d'anisotropies, en géostatistique, on ne peut modéliser aisément que les anisotropies géométriques.

---

## Anisotropie géométrique

**Caractéristiques :**

- On observe dans diverses directions des paliers et des composantes pépitiques identiques mais des portées différentes.

- Les portées maximales (\( a_g \)) et minimales (\( a_p \)) s'observent selon deux directions orthogonales.

- On peut rendre les portées identiques (et égales à \( a_g \)) suivant toutes les directions en multipliant la composante de la portée parallèle à \( a_p \) par le facteur \( (a_g/a_p) \). Bref, les portées décrivent une ellipse dont l'axe majeur est orienté parallèlement à \( a_g \).

Formule :

$$
a_\theta = \sqrt{a_g^2 \cos^2(\theta) + a_p^2 \sin^2(\theta)}
$$

où \( a_g \) et \( a_p \) sont les portées maximale et minimale, et \( \theta \) désigne l'angle mesuré par rapport à la direction où est rencontré \( a_g \).

On peut ainsi évaluer \( \gamma(h, \theta) \) soit en utilisant \( a_\theta \), soit en corrigeant la distance \( h \) pour tenir compte de l'anisotropie :

$$
\gamma_\theta(h) = \gamma \big( h' \big)
$$

avec

$$
h' = \sqrt{ h_x^2 + h_y^2 \left( \frac{a_g}{a_p} \right)^2 }
$$

Typiquement, on retrouve l'anisotropie géométrique là où le corps étudié montre des allongements préférentiels (lentilles, paléochenaux, strates...).

**Note :**

Pour l'anisotropie géométrique, on peut toujours, par simple rotation et dilatation, se ramener à un modèle isotrope, c’est ce qui est fait dans la méthode utilisant le calcul de \( h_g \).

---

## Exemple

Un gisement 2D est modélisé par un modèle avec anisotropie géométrique.

Le modèle est sphérique avec :

- \( C = 17 \% ^2 \)

- effet de pépite \( C_0 = 13 \% ^2 \)

- portées de 100 m dans la direction (convention trigonométrique) de plus grande continuité (30°)

- 60 m dans la direction de plus petite continuité (120°)

Calcul du variogramme entre deux observations situées aux coordonnées \( (x_1,y_1) = (10,30) \) et \( (x_2,y_2) = (40,20) \).

---

### 1ère méthode :

Calcul de la distance entre les points et de la direction qu’ils définissent :

$$
h = \sqrt{(20-30)^2 + (40-10)^2} = 31.62\, m
$$

$$
\theta = \arctan\left(\frac{20-30}{40-10}\right) = -18.4^\circ
$$

Cette direction forme un angle de 48.4° avec la direction de plus grande continuité (car 30° + 48.4° = 78.4°, il s'agit ici de la différence d'angle entre la direction du vecteur et la direction de continuité).

Calcul de la portée dans cette direction :

$$
a_\theta = \sqrt{100^2 \times \cos^2(48.4^\circ) + 60^2 \times \sin^2(48.4^\circ)} = 70.81\, m
$$

Calcul de la valeur du variogramme avec la formule sphérique pour la distance \( h=31.62\,m \) et portée \( a_\theta = 70.81\, m \) :

$$
\gamma_\theta(h) = C_0 + C \left( 1.5 \frac{h}{a_\theta} - 0.5 \left(\frac{h}{a_\theta}\right)^3 \right)
$$

---

### 2ème méthode :

Calcul de la distance équivalente dans la direction de meilleure continuité :

$$
h_g = \sqrt{ (h \cos\theta)^2 + \left(\frac{a_g}{a_p} h \sin\theta \right)^2 }
$$

avec \( \theta = 48.4^\circ \).

Calcul de la valeur du variogramme en utilisant la portée \( a_g = 100\, m \) pour la distance \( h_g \).

---

## Remarques importantes concernant la détection d’anisotropies géométriques

a) Le facteur d’anisotropie géométrique obtenu avec les variogrammes expérimentaux sous-estime en général le véritable facteur d’anisotropie en raison de l’utilisation d’une fenêtre angulaire et du fait que les variogrammes expérimentaux ne sont pas nécessairement orientés exactement selon les directions principales de l’ellipse d’anisotropie.

b) L’estimation correcte et, à la limite, la détection d’anisotropie géométrique n’est possible, en pratique, qu’à quatre conditions (fortement liées) devant être remplies simultanément :

- Le nombre de données est suffisant (au moins 50)

- Le facteur d’anisotropie est important (au moins 1.5)

- Une des directions utilisées dans le calcul du variogramme est près de la direction de plus grande portée

- La fenêtre angulaire utilisée est suffisamment étroite

---

## Anisotropie zonale

Parfois, une simple correction géométrique ne suffit pas à rendre les modèles isotropes. C'est le cas si l’on observe des paliers différents ou si les portées ne décrivent pas une ellipse.

On peut alors tenter d'ajuster les variogrammes expérimentaux directionnels à l'aide d'une somme (ou éventuellement d'un produit de covariances) de modèles isotropes ou avec anisotropie géométrique.

Parfois, la physique du phénomène peut aider à déterminer le modèle. Par exemple, en hydrogéologie, la charge hydraulique est anisotrope par nature :

- dans le sens de l'écoulement on observe les variations maximales

- perpendiculairement à l'écoulement la charge est constante

La modélisation d'anisotropies zonales est généralement assez délicate et nécessite une certaine expérience.

Le modèle le plus simple d'anisotropie zonale consiste à combiner une ou plusieurs composantes isotropes à une composante avec anisotropie géométrique dont \( a_g \) est infinie :

$$
\gamma_{\text{zonal}}(h, \theta) = \gamma_{\text{isotrope}}(h) + \gamma_\theta(h)
$$

où l'indice \( p \) réfère au modèle anisotrope suivant la direction de portée minimale.

---

## Cas 3D

En 3D, l’ellipse d’anisotropie devient un ellipsoïde. Pour spécifier complètement le modèle, il faut fournir :

- les trois portées principales (axes de l'ellipsoïde)

- les 3 angles de rotation qui permettent d'aligner le système de référence avec les axes de l'ellipsoïde.

Souvent, la géologie dicte les directions où calculer le variogramme pour détecter une éventuelle anisotropie (ex. perpendiculairement à la stratigraphie et dans le plan de la stratigraphie).

Lors de l'utilisation d'un programme de calcul de variogramme ou de krigeage, il est très important de bien comprendre les conventions utilisées pour le système de référence et les rotations afin de spécifier correctement les modèles.

Habituellement, le système de référence utilisé est le système « main droite » (pouce pointe vers "z", la main droite repliée va de "x" vers "y").

La modélisation en 3D est parfois très difficile en raison d’une disposition défavorable des observations.

Exemple : dans une grille régulière de forages verticaux, il y a beaucoup de paires pour toute distance selon la verticale, mais dans le plan horizontal, seules certaines distances sont observées (multiples du pas de grille). Si le pas est large, peu de points seront présents sur le variogramme expérimental dans ces directions, rendant la détermination des portées difficile.

La situation se complique davantage lorsque la géologie ne suit pas les directions du système de référence.

Enfin, la spécification des paramètres de recherche de paires pour le calcul du variogramme nécessite une réflexion importante pour s’assurer que la zone spécifiée correspond bien à celle désirée.

Par exemple, une tolérance angulaire de 10° sur la direction et sur le pendage du vecteur souhaité ne représente pas la même enveloppe selon que le vecteur est horizontal ou vertical.

Tous les programmes ne permettent pas de spécifier un cône de tolérance autour de l'orientation du vecteur distance souhaitée.


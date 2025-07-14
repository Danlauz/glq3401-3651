# 6.2 Estimation du variogramme

On estime le variogramme à l'aide de la formule suivante :

$$
\gamma(h) = \frac{1}{2N(h)} \sum_{i=1}^{N(h)} [Z(x_i + h) - Z(x_i)]^2
$$

où :

- **N(h)** est le nombre de paires de points espacées d'une distance **h**.

---

La variabilité des propriétés géologiques peut être différente selon la direction, on parle alors d'**anisotropie**. Cela assure que la continuité soit identique dans toutes les directions.

Par exemple :

- Les teneurs peuvent montrer une meilleure continuité **parallèlement à la stratigraphie** que **perpendiculairement**.

- En cas de contamination par des hydrocarbures, on peut observer une meilleure continuité **horizontalement** que **verticalement**, en raison de la gravité.

---

## Variogramme directionnel

Si le nombre d’observations le permet (typiquement **au moins 50**, préférablement **100**), on peut vérifier cette anisotropie en calculant le variogramme expérimental dans différentes directions.

On peut ainsi calculer le variogramme selon certaines directions spécifiques :

$$
\gamma(h, \theta) = \frac{1}{2N(h, \theta)} \sum_{i=1}^{N(h, \theta)} [Z(x_i + h) - Z(x_i)]^2
$$

où :

- **N(h, θ)** est le nombre de paires séparées de **h** dans la direction **θ**.

---

## En pratique

- On s’accorde une **tolérance** sur **h** et sur **θ** pour obtenir suffisamment de paires.

- Pour chaque classe ainsi formée :

  - On calcule la **distance moyenne** entre les extrémités des paires (abscisse).

  - On évalue le **variogramme expérimental** (ordonnée).

On obtient ainsi une **série de points expérimentaux**, auxquels on cherche à ajuster un **modèle analytique**.

Ce modèle permet de déduire la **covariance** entre deux points quelconques en fonction :

- de leur **espacement géographique**,

- et éventuellement de la **direction**.

> Une fois le modèle adopté, tous les calculs ultérieurs se font avec les **valeurs du modèle**, et non avec les valeurs expérimentales.

---

## Exemple illustratif

La figure suivante illustre quelques exemples de surfaces et leur variogramme expérimental correspondant.

Les simulations ont été réalisées avec **GSLIB-SGSIM**, en imposant les valeurs **0, 2, 2 et 4** aux 4 coins.

De haut en bas :

1. Gaussien de portée 25

2. Sphérique de portée 25

3. Sphérique avec **20 % d’effet de pépite**, portée 25

4. Sphérique avec **80 % d’effet de pépite**, portée 25

> Comme on le voit, le variogramme expérimental décrit bien le **degré d’irrégularité** des surfaces.

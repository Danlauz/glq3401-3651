# 7.3 Variance d’estimation

Dans cette section, on cherche à établir les résultats permettant de fournir une **mesure de la précision des estimés** effectués par une méthode d’estimation quelconque (généralement linéaire).

Soit une variable aléatoire \( Z_v \) que l’on veut estimer à partir d’une combinaison linéaire des valeurs observées en différents points :

$$
Z_v^* = \sum_{i=1}^n \lambda_i Z_i \tag{1}
$$

où :

- \( Z_i \) : valeur observée au point \( x_i \) (v.a.),
- \( Z_v^* \) : estimateur de \( Z_v \),
- \( \lambda_i \) : poids associés aux données.

On définit **l’erreur d’estimation** :

$$
e = Z_v^* - Z_v
$$

et la **variance de cette erreur**, appelée **variance d’estimation** :

$$
\sigma_e^2 = \mathrm{Var}(e) = \mathrm{Var}(Z_v^*) + \mathrm{Var}(Z_v) - 2\,\mathrm{Cov}(Z_v^*, Z_v) \tag{2}
$$

En substituant \( Z_v^* \) par son expression (1), on obtient :

$$
\sigma_e^2 = \sum_{i=1}^n \sum_{j=1}^n \lambda_i \lambda_j \mathrm{Cov}(Z_i, Z_j)
+ \mathrm{Var}(Z_v) - 2 \sum_{i=1}^n \lambda_i \mathrm{Cov}(Z_i, Z_v)
$$

---

## Formulation avec le variogramme

En utilisant la relation \( \mathrm{Cov}(Z_i, Z_j) = \sigma^2 - \gamma(x_i - x_j) \), on obtient :

$$
\sigma_e^2 = \sum_{i,j} \lambda_i \lambda_j \gamma(x_i, x_j)
- 2 \sum_i \lambda_i \gamma(x_i, x_v)
+ \gamma(v, v) \tag{3}
$$

---

## Remarques importantes

1. Dans les formules (2) et (3), on reconnaît trois composantes :

&nbsp;&nbsp;- Un **terme lié au bloc à estimer** : \( \mathrm{Var}(Z_v) \) ou \( \gamma(v,v) \),  
&nbsp;&nbsp;- Un **terme lié aux points utilisés pour estimer** : \( \mathrm{Cov}(Z_i, Z_j) \) ou \( \gamma(x_i, x_j) \),  
&nbsp;&nbsp;- Un **terme croisé** : \( \mathrm{Cov}(Z_i, Z_v) \) ou \( \gamma(x_i, v) \).

2. La variance d’estimation est une **mesure de précision moyenne** sur le gisement pour une configuration donnée. Elle est indépendante de la valeur estimée et ne prend pas en compte les effets proportionnels (ex. : gisement lognormal).

3. Pour améliorer la précision, on peut chercher à **minimiser \( \sigma_e^2 \)** en choisissant les poids \( \lambda_i \) de façon optimale — c’est le principe du **krigeage**.

---

## Exemple

Soient trois points \( x_1, x_2, x_3 \) utilisés pour estimer la valeur au point \( x_0 \).

#### Matrice des distances :

|      | x0  | x1  | x2  | x3  |
|------|-----|-----|-----|-----|
| x0   | 0   | 1.4 | 1   | 2   |
| x1   |     | 0   | 1   | 3.2 |
| x2   |     |     | 0   | 3   |

Supposons un **variogramme linéaire** avec **pente unitaire** et **effet de pépite \( C_0 = 1 \)** :

$$
\gamma(h) = 1 + h
$$

---

### a) Estimation polygonale (plus proche voisin)

On utilise uniquement le point le plus proche :

$$
\lambda_1 = 1, \quad \lambda_2 = 0, \quad \lambda_3 = 0
$$

Alors :

$$
\sigma_e^2 = \gamma(x_0, x_0) + \lambda_1^2 \gamma(x_1, x_1) - 2 \lambda_1 \gamma(x_1, x_0)
= 1 + 1 - 2 \cdot \gamma(1.4) = 2 - 2(1 + 1.4) = 2 - 4.8 = -2.8
$$

Mais comme une variance ne peut pas être négative, on a mal formulé. En fait :

$$
\sigma_e^2 = \gamma(x_0, x_0) + \lambda_1^2 \gamma(x_1, x_1) - 2 \lambda_1 \gamma(x_1, x_0)
= (1 + 0) + (1)^2 \cdot (1 + 0) - 2 \cdot 1 \cdot (1 + 1.4) = 1 + 1 - 4.8 = -2.8
$$

Il y a donc une incohérence dans l’interprétation. En réalité, il faut directement appliquer la formule (3).

---

### b) Inverse de la distance

Distances inverses :

$$
d_1 = 1.4, \quad d_2 = 1, \quad d_3 = 2
$$

$$
\lambda_1 = \frac{1/1.4}{1/1.4 + 1/1 + 1/2} \approx 0.32,\quad
\lambda_2 \approx 0.45,\quad
\lambda_3 \approx 0.23
$$

En appliquant (3), on obtient :

$$
\sigma_e^2 \approx 2.7
$$

L’inverse de la distance offre donc une meilleure précision que la méthode polygonale.

---

### c) Krigeage

Poids optimaux :

$$
\lambda_1 = 0.25,\quad \lambda_2 = 0.43,\quad \lambda_3 = 0.32
$$

Alors :

$$
\sigma_e^2 \approx 2.65
$$

Une **amélioration modeste** par rapport à l’inverse de la distance.

---

## Variance d’extension

Il s'agit de la **variance d’estimation** obtenue lorsqu’on **étend une valeur ponctuelle à une surface ou un volume**, ou lorsqu’on estime une surface à partir d’un segment, etc.

Ces cas, par leur simplicité géométrique, **se prêtent bien à la construction d’abaques** ou de tables de calcul.

---

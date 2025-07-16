# 8.1 Krigeage Ordinaire et Simple

## Krigeage Ordinaire

Supposons que l'on veuille estimer un bloc $v$ centré au point $\mathbf{x}_0$. Notons $Z_v$ la vraie valeur (inconnue) de ce bloc et $Z_v^*$ l'estimateur que l'on obtient.

L'estimateur est linéaire, i.e. :

$$
Z_v^* = \sum_{i=1}^n \lambda_i Z(\mathbf{x}_i)
$$

où les $Z_i$ désignent les variables aléatoires correspondant aux points échantillons.

On veut minimiser :

$$
\sigma_K^2 = \mathrm{Var}(Z_v - Z_v^*)
$$

En substituant l'expression de l'estimateur :

$$
\sigma_K^2 = \mathrm{Var} \left( Z_v - \sum_{i=1}^n \lambda_i Z(\mathbf{x}_i) \right)
$$

Pour que l'estimateur soit sans biais, il faut que :

$$
\sum_{i=1}^n \lambda_i = 1
$$

En effet :

$$
\mathbb{E}[Z_v^*] = \sum_{i=1}^n \lambda_i \mathbb{E}[Z(\mathbf{x}_i)] = \mathbb{E}[Z_v]
$$

On a un problème de minimisation d'une fonction quadratique sous contrainte d'égalité, que l'on résout par la méthode de Lagrange :

$$
\mathcal{L}(\lambda_1, \dots, \lambda_n, \mu) = \mathrm{Var}\left(Z_v - \sum_{i=1}^n \lambda_i Z(\mathbf{x}_i)\right) + \mu \left( \sum_{i=1}^n \lambda_i - 1 \right)
$$

où $\mu$ est le multiplicateur de Lagrange.

Cela mène au **système de krigeage ordinaire** :

$$
\begin{cases}
\sum_{j=1}^n \lambda_j C(\mathbf{x}_i - \mathbf{x}_j) + \mu = C(\mathbf{x}_i - \mathbf{x}_0), & i = 1, \dots, n \\
\sum_{j=1}^n \lambda_j = 1
\end{cases}
$$

La **variance d'estimation minimale**, appelée **variance de krigeage**, est donnée par :

$$
\sigma_K^2 = \sum_{i=1}^n \lambda_i C(\mathbf{x}_i - \mathbf{x}_0) + \mu
$$

> Cette variance **ne dépend pas des valeurs observées**, mais uniquement du **variogramme** et de la **configuration spatiale**.

### Système en termes de variogramme

On utilise la relation :

$$
C(h) = \sigma^2 - \gamma(h)
$$

et le fait que $\sum \lambda_i = 1$, d'où :

$$
\sum_{j=1}^n \lambda_j \gamma(\mathbf{x}_i - \mathbf{x}_j) - \mu = \gamma(\mathbf{x}_i - \mathbf{x}_0), \quad i = 1, \dots, n
$$

### Forme matricielle

$$
\begin{bmatrix}
C(\mathbf{x}_1, \mathbf{x}_1) & \cdots & C(\mathbf{x}_1, \mathbf{x}_n) & 1 \\
\vdots & \ddots & \vdots & \vdots \\
C(\mathbf{x}_n, \mathbf{x}_1) & \cdots & C(\mathbf{x}_n, \mathbf{x}_n) & 1 \\
1 & \cdots & 1 & 0
\end{bmatrix}
\begin{bmatrix}
\lambda_1 \\
\vdots \\
\lambda_n \\
\mu
\end{bmatrix}
=
\begin{bmatrix}
C(\mathbf{x}_1, \mathbf{x}_0) \\
\vdots \\
C(\mathbf{x}_n, \mathbf{x}_0) \\
1
\end{bmatrix}
$$

---

## Krigeage Simple

Quand la moyenne $m$ du champ est connue ou bien estimée, on utilise :

$$
Z_v^* = m + \sum_{i=1}^n \lambda_i (Z(\mathbf{x}_i) - m)
$$

La variance d’estimation devient :

$$
\sigma_K^2 = \mathrm{Var} \left( Z_v - m - \sum_{i=1}^n \lambda_i (Z(\mathbf{x}_i) - m) \right)
$$

On obtient le **système de krigeage simple** :

$$
\sum_{j=1}^n \lambda_j C(\mathbf{x}_i - \mathbf{x}_j) = C(\mathbf{x}_i - \mathbf{x}_0), \quad i = 1, \dots, n
$$

Et la variance de krigeage simple :

$$
\sigma_K^2 = \sigma^2 - \sum_{i=1}^n \lambda_i C(\mathbf{x}_i - \mathbf{x}_0)
$$

---

### Remarques

- La variance du krigeage simple est **toujours inférieure** à celle du krigeage ordinaire, mais nécessite la **connaissance de $m$**.
- Le krigeage simple suppose la **stationnarité du second ordre**, plus forte que l’intrinsécité du krigeage ordinaire.
- Il est **impossible d’écrire** le système simple en termes de variogramme directement (pas de contrainte sur $\sum \lambda_i$).
- À courte distance, les deux méthodes donnent des résultats **très similaires**. Avec un effet de pépite ou à grande distance, le krigeage ordinaire retourne la **moyenne locale**, le krigeage simple retourne $m$.
- **Le krigeage ordinaire est généralement préféré**, sauf pour des cas particuliers (indicatrices, simulations).

---

### Forme matricielle du krigeage simple

$$
\mathbf{C} \boldsymbol{\lambda} = \mathbf{c}_0
$$

où :

- $\mathbf{C}$ est la matrice de covariances $C(\mathbf{x}_i - \mathbf{x}_j)$
- $\boldsymbol{\lambda}$ est le vecteur des poids
- $\mathbf{c}_0$ est le vecteur des covariances $C(\mathbf{x}_i - \mathbf{x}_0)$

L’estimation s’écrit :

$$
Z_v^* = m + \boldsymbol{\lambda}^\top ( \mathbf{Z} - m \mathbf{1} )
$$

et la variance :

$$
\sigma_K^2 = \sigma^2 - \boldsymbol{\lambda}^\top \mathbf{c}_0
$$

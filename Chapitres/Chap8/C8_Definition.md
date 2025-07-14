# 8.1 Krigeage Ordinaire et Simple

## Krigeage Ordinaire

Supposons que l'on veuille estimer un bloc \\( v \\) centré au point \\( \mathbf{x}_0 \\). Notons \\( Z_v \\) la vraie valeur (inconnue) de ce bloc et \\( Z_v^* \\) l'estimateur que l'on obtient.

L'estimateur est linéaire, i.e. :

\\[
Z_v^* = \sum_{i=1}^n \lambda_i Z(\mathbf{x}_i)
\\]

où les \\( Z_i \\) désignent les variables aléatoires correspondant aux points échantillons.

On veut minimiser :

\\[
\sigma_K^2 = \mathrm{Var}(Z_v - Z_v^*)
\\]

Substituant l'expression de l'estimateur dans cette équation, on obtient :

\\[
\sigma_K^2 = \mathrm{Var} \left( Z_v - \sum_{i=1}^n \lambda_i Z(\mathbf{x}_i) \right)
\\]

Pour que l'estimateur soit sans biais, il faut que :

\\[
\sum_{i=1}^n \lambda_i = 1
\\]

En effet, dans ce cas,

\\[
\mathbb{E}[Z_v^*] = \sum_{i=1}^n \lambda_i \mathbb{E}[Z(\mathbf{x}_i)] = \mathbb{E}[Z_v]
\\]

On a un problème de minimisation d'une fonction quadratique (donc convexe) sous contrainte d'égalité, que l'on solutionne par la méthode de Lagrange. On forme le lagrangien :

\\[
\mathcal{L}(\lambda_1, \dots, \lambda_n, \mu) = \mathrm{Var}\left(Z_v - \sum_{i=1}^n \lambda_i Z(\mathbf{x}_i)\right) + \mu \left( \sum_{i=1}^n \lambda_i - 1 \right)
\\]

où \\( \mu \\) est le multiplicateur de Lagrange.

Le minimum est atteint lorsque toutes les dérivées partielles par rapport à chacun des \\( \lambda_i \\) et par rapport à \\( \mu \\) s'annulent. Ceci conduit au **système de krigeage ordinaire** :

\\[
\begin{cases}
\sum_{j=1}^n \lambda_j C(\mathbf{x}_i - \mathbf{x}_j) + \mu = C(\mathbf{x}_i - \mathbf{x}_0), & i = 1, \dots, n \\
\sum_{j=1}^n \lambda_j = 1
\end{cases}
\\]

La **variance d'estimation minimale**, appelée **variance de krigeage**, est obtenue en substituant les équations de krigeage dans l'expression générale de la variance d'estimation :

\\[
\sigma_K^2 = \mathrm{Var}(Z_v - Z_v^*) = \sum_{i=1}^n \lambda_i C(\mathbf{x}_i - \mathbf{x}_0) + \mu
\\]

> Cette variance de krigeage **ne dépend pas des valeurs observées**, mais uniquement du **variogramme** et de la **configuration spatiale** des points utilisés pour l’estimation.

### Système de krigeage en termes de variogramme

Comme la variance d’estimation peut aussi s’écrire directement en fonction du variogramme, on peut reformuler le système en utilisant la relation :

\\[
C(h) = \sigma^2 - \gamma(h)
\\]

et en remarquant que \\( \sum \lambda_i = 1 \\), on a alors :

\\[
\sum_{j=1}^n \lambda_j \gamma(\mathbf{x}_i - \mathbf{x}_j) - \mu = \gamma(\mathbf{x}_i - \mathbf{x}_0), \quad i = 1, \dots, n
\\]

### Forme matricielle

Il est utile de représenter le système de krigeage ordinaire et la variance de krigeage sous **forme matricielle** :

\\[
\begin{bmatrix}
\gamma(\mathbf{x}_1, \mathbf{x}_1) & \cdots & \gamma(\mathbf{x}_1, \mathbf{x}_n) & 1 \\
\vdots & \ddots & \vdots & \vdots \\
\gamma(\mathbf{x}_n, \mathbf{x}_1) & \cdots & \gamma(\mathbf{x}_n, \mathbf{x}_n) & 1 \\
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
\gamma(\mathbf{x}_1, \mathbf{x}_0) \\
\vdots \\
\gamma(\mathbf{x}_n, \mathbf{x}_0) \\
1
\end{bmatrix}
\\]

## Krigeage Simple

Parfois, on connaît la moyenne \\( m \\) du champ à estimer, ou du moins on en possède une estimation fiable. On peut alors construire un estimateur sans biais **sans imposer la contrainte** que la somme des poids soit égale à 1 :

\\[
Z_v^* = m + \sum_{i=1}^n \lambda_i (Z(\mathbf{x}_i) - m)
\\]

Tout comme pour le krigeage ordinaire, on écrit la **variance d'estimation** et on substitue l'expression précédente pour l’estimateur \\( Z_v^* \\). On obtient :

\\[
\sigma_K^2 = \mathrm{Var} \left( Z_v - m - \sum_{i=1}^n \lambda_i (Z(\mathbf{x}_i) - m) \right)
\\]

En dérivant cette expression par rapport à chacun des \\( \lambda_i \\), on trouve le **système de krigeage simple** :

\\[
\sum_{j=1}^n \lambda_j C(\mathbf{x}_i - \mathbf{x}_j) = C(\mathbf{x}_i - \mathbf{x}_0), \quad i = 1, \dots, n
\\]

et la **variance d’estimation minimale**, appelée **variance de krigeage simple**, s’écrit :

\\[
\sigma_K^2 = \sigma^2 - \sum_{i=1}^n \lambda_i C(\mathbf{x}_i - \mathbf{x}_0)
\\]

---

### Remarques importantes

- La variance de krigeage simple est **toujours inférieure** à celle du krigeage ordinaire, car aucune contrainte n'est imposée sur les poids \\( \lambda_i \\). Toutefois, elle **requiert la connaissance de la moyenne** \\( m \\).

- L’**hypothèse de stationnarité** requise est **plus forte** que pour le krigeage ordinaire. Le krigeage simple nécessite la stationnarité du second ordre, tandis que le krigeage ordinaire ne requiert que l’**hypothèse d’intrinsécité**.

- Il est **impossible de formuler le système de krigeage simple directement en termes de variogramme**, puisque l’on n’a pas \\( \sum \lambda_i = 1 \\).

- En pratique, les résultats obtenus par krigeage simple et ordinaire sont **très similaires à courte distance**, surtout si le variogramme montre une structure marquée. À grande distance ou en présence d’un **effet de pépite important**, le krigeage ordinaire tend vers la moyenne des données locales, tandis que le krigeage simple retourne directement la moyenne \\( m \\).

- En règle générale, le **krigeage ordinaire est préféré** au krigeage simple. Toutefois, pour certaines applications (comme le krigeage d’indicatrices ou les simulations géostatistiques), le krigeage simple est souvent plus approprié.

---

### Forme matricielle

Le système de krigeage simple peut être exprimé sous forme matricielle comme suit :

\\[
\mathbf{C} \boldsymbol{\lambda} = \mathbf{c}_0
\\]

où :

- \\( \mathbf{C} \\) est la matrice des covariances \\( C(\mathbf{x}_i - \mathbf{x}_j) \\),

- \\( \boldsymbol{\lambda} \\) est le vecteur des poids \\( \lambda_i \\),

- \\( \mathbf{c}_0 \\) est le vecteur des covariances entre les points d'échantillonnage et le point à estimer : \\( C(\mathbf{x}_i - \mathbf{x}_0) \\).

L’estimation s’écrit alors :

\\[
Z_v^* = m + \boldsymbol{\lambda}^\top ( \mathbf{Z} - m \mathbf{1} )
\\]

et la variance d’estimation :

\\[
\sigma_K^2 = \sigma^2 - \boldsymbol{\lambda}^\top \mathbf{c}_0
\\]

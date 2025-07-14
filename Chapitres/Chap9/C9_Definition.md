# 9.1 Définitions du cokrigeage

Le krigeage, que nous avons étudié précédemment, est une méthode d’estimation spatiale qui exploite la continuité spatiale d’une seule variable. Cependant, dans de nombreuses applications, plusieurs variables sont mesurées simultanément, parfois aux mêmes emplacements, parfois non. Ces variables sont souvent corrélées entre elles et cette corrélation peut être exploitée pour améliorer la qualité des estimations.

Le cokrigeage est une généralisation naturelle du krigeage à plusieurs variables. Il permet d’utiliser l’information disponible sur une ou plusieurs variables secondaires, en plus de la variable principale d’intérêt, pour fournir une estimation plus précise. Cette méthode s’appuie sur les variogrammes et covariances croisées entre variables et requiert la résolution d’un système plus complexe, mais plus riche en information.

Ce chapitre présente les principes fondamentaux du cokrigeage, les formulations ordinaire et simple, ainsi que les conditions nécessaires pour garantir un estimateur sans biais et de variance minimale.

## Variance d’estimation

Dans le cadre du cokrigeage, l’estimateur linéaire de la variable principale $Z$ est construit à partir des observations de $Z$ et des variables secondaires $Y$. La variance de l’erreur d’estimation, ou variance d’estimation, mesure l’incertitude associée à cette estimation.

Soit $\hat{Z}(x_0)$ l’estimation de $Z$ au point $x_0$, donnée par :

$$
\hat{Z}(x_0) = \sum_{i=1}^{n_Z} \lambda_i^Z Z(x_i) + \sum_{j=1}^{n_Y} \lambda_j^Y Y(x_j),
$$

où $\lambda_i^Z$ et $\lambda_j^Y$ sont les poids appliqués aux observations respectives.

La variance d’estimation s’exprime alors comme :

$$
\begin{aligned}
\sigma^2 &= \mathrm{Var}\left(Z(x_0) - \hat{Z}(x_0)\right) \\
&= \mathrm{Var}(Z(x_0)) 
- 2 \sum_{i=1}^{n_Z} \lambda_i^Z \mathrm{Cov}(Z(x_i), Z(x_0)) 
- 2 \sum_{j=1}^{n_Y} \lambda_j^Y \mathrm{Cov}(Y(x_j), Z(x_0)) \\
&\quad + \sum_{i=1}^{n_Z} \sum_{k=1}^{n_Z} \lambda_i^Z \lambda_k^Z \mathrm{Cov}(Z(x_i), Z(x_k)) 
+ 2 \sum_{i=1}^{n_Z} \sum_{j=1}^{n_Y} \lambda_i^Z \lambda_j^Y \mathrm{Cov}(Z(x_i), Y(x_j)) \\
&\quad + \sum_{j=1}^{n_Y} \sum_{l=1}^{n_Y} \lambda_j^Y \lambda_l^Y \mathrm{Cov}(Y(x_j), Y(x_l)).
\end{aligned}
$$

Cette expression met en évidence le rôle des covariances croisées entre les variables ainsi que des covariances intra-variables dans la détermination de la précision de l’estimation.

L’optimisation des poids $\lambda_i^Z$ et $\lambda_j^Y$ sous les contraintes de non-biais conduit au système de cokrigeage ordinaire.


## Cokrigeage ordinaire

On cherche à construire une estimation linéaire de la variable principale $Z$ à partir des observations des variables principale et secondaire ($Z$ et $Y$) :

$$
\hat{Z}(x_0) = \alpha + \sum_{i=1}^{n_z} \lambda_i Z(x_i) + \sum_{j=1}^{n_y} \gamma_j Y(y_j)
$$

L’estimateur doit être **sans biais**, ce qui s’assure par les contraintes :

$$
\sum_{i=1}^{n_z} \lambda_i = 1 \quad \text{et} \quad \sum_{j=1}^{n_y} \gamma_j = 0
$$

La variance d’estimation s’écrit alors :

$$
\sigma^2 = \operatorname{Var}[Z(x_0) - \hat{Z}(x_0)] = C_{ZZ}(0) - 2 \sum_{i=1}^{n_z} \lambda_i C_{ZZ}(x_0, x_i) - 2 \sum_{j=1}^{n_y} \gamma_j C_{ZY}(x_0, y_j) + \sum_{i=1}^{n_z} \sum_{k=1}^{n_z} \lambda_i \lambda_k C_{ZZ}(x_i, x_k) + 2 \sum_{i=1}^{n_z} \sum_{j=1}^{n_y} \lambda_i \gamma_j C_{ZY}(x_i, y_j) + \sum_{j=1}^{n_y} \sum_{l=1}^{n_y} \gamma_j \gamma_l C_{YY}(y_j, y_l)
$$

On forme le Lagrangien en introduisant deux multiplicateurs de Lagrange $\mu$ et $\nu$ pour tenir compte des contraintes de non-biais, et on dérive par rapport aux poids $\lambda_i, \gamma_j$ et aux multiplicateurs. Cela donne le système de cokrigeage ordinaire suivant :

$$
\begin{cases}
\sum_{k=1}^{n_z} \lambda_k C_{ZZ}(x_i, x_k) + \sum_{l=1}^{n_y} \gamma_l C_{ZY}(x_i, y_l) + \mu = C_{ZZ}(x_i, x_0), & i = 1, \dots, n_z \\
\sum_{k=1}^{n_z} \lambda_k C_{YZ}(y_j, x_k) + \sum_{l=1}^{n_y} \gamma_l C_{YY}(y_j, y_l) + \nu = C_{ZY}(x_0, y_j), & j = 1, \dots, n_y \\
\sum_{i=1}^{n_z} \lambda_i = 1 \\
\sum_{j=1}^{n_y} \gamma_j = 0
\end{cases}
$$

La variance d’estimation associée est :

$$
\sigma^2_{CK} = C_{ZZ}(0) - \sum_{i=1}^{n_z} \lambda_i C_{ZZ}(x_0, x_i) - \sum_{j=1}^{n_y} \gamma_j C_{ZY}(x_0, y_j) - \mu - \nu
$$

Ce système s’écrit de façon compacte en forme matricielle :

$$
\begin{bmatrix}
K & 1 & 0 \\
1^T & 0 & 0 \\
0 & 0 & 0
\end{bmatrix}
\begin{bmatrix}
\boldsymbol{\lambda} \\
\mu \\
\nu
\end{bmatrix}
=
\begin{bmatrix}
\mathbf{k} \\
1 \\
0
\end{bmatrix}
$$

où $K$ est la matrice des covariances entre toutes les observations (variables principale et secondaire), $\boldsymbol{\lambda}$ le vecteur des poids associés aux observations, et $\mathbf{k}$ le vecteur des covariances entre le point à estimer et les observations.

> **Note :** Pour pouvoir effectuer un cokrigeage ordinaire, il faut au minimum une observation de la variable principale et deux observations de la variable secondaire.

---

## Cokrigeage simple

Si les moyennes des variables $m_Z$ et $m_Y$ sont connues, on peut centrer les données et travailler directement sur les résidus. On estime alors un résidu en $x_0$ auquel on ajoute la moyenne $m_Z$. Les contraintes de non-biais ne sont plus nécessaires.

L’estimateur devient :

$$
\hat{Z}(x_0) = m_Z + \sum_{i=1}^{n_z} \lambda_i (Z(x_i) - m_Z) + \sum_{j=1}^{n_y} \gamma_j (Y(y_j) - m_Y)
$$

avec les poids obtenus par résolution du système :

$$
\begin{cases}
\sum_{k=1}^{n_z} \lambda_k C_{ZZ}(x_i, x_k) + \sum_{l=1}^{n_y} \gamma_l C_{ZY}(x_i, y_l) = C_{ZZ}(x_i, x_0), & i = 1, \dots, n_z \\
\sum_{k=1}^{n_z} \lambda_k C_{YZ}(y_j, x_k) + \sum_{l=1}^{n_y} \gamma_l C_{YY}(y_j, y_l) = C_{ZY}(x_0, y_j), & j = 1, \dots, n_y
\end{cases}
$$

La variance d’estimation est alors :

$$
\sigma^2_{CKS} = C_{ZZ}(0) - \sum_{i=1}^{n_z} \lambda_i C_{ZZ}(x_0, x_i) - \sum_{j=1}^{n_y} \gamma_j C_{ZY}(x_0, y_j)
$$

> **Note :** Contrairement au cokrigeage ordinaire, on peut ici réaliser une estimation même sans observations de la variable principale, à condition d’avoir au moins une observation de la variable secondaire. Si aucune observation de la variable secondaire n’est disponible, il ne s’agit plus de cokrigeage mais simplement de krigeage.

---

## Cas particulier

Si une seule des deux variables a une moyenne connue, on applique alors un système de cokrigeage ordinaire avec une seule contrainte de non-biais sur la variable dont la moyenne est inconnue.

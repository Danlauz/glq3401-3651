# 9.1 Définitions du cokrigeage

Le krigeage, présenté au chapitre 8, est une méthode d’estimation spatiale qui s’appuie sur la continuité d’une variable unique. Toutefois, dans de nombreuses applications, plusieurs variables corrélées sont mesurées, parfois aux mêmes emplacements, parfois séparément. Cette corrélation peut être mise à profit pour améliorer les estimations.

Le cokrigeage constitue une extension naturelle du krigeage au cas multivariable. Il combine l’information de la variable principale avec celle d’une ou plusieurs variables secondaires pour raffiner l’estimation de la variable d’intérêt. Cette approche repose sur les variogrammes et covariances croisées entre variables et nécessite la résolution d’un système plus complexe, mais offrant une information plus complète.

Ce chapitre présente les principes fondamentaux du cokrigeage, les formulations du cokrigeage ordinaire (CO) et du cokrigeage simple (CS), ainsi que les conditions pour obtenir un estimateur sans biais.

## Variance d’estimation

Dans le cadre du cokrigeage, l’estimateur linéaire de la variable principale $Z$, souvent appelée variable d’intérêt, est construit à partir des observations de $Z$ et de celles d’une variable secondaire $Y$. La variance de l’erreur d’estimation, ou variance d’estimation, quantifie l’incertitude associée à cette estimation en tenant compte de toutes les sources d’information disponibles. Ainsi, la valeur estimée à un point d’intérêt dépend à la fois des observations de la variable principale et de celles de la variable secondaire, pondérées en fonction de leur corrélation spatiale et croisée.

Soit $\hat{Z}(x_0)$ l’estimation de $Z$ au point $x_0$, donnée par :

$$
\hat{Z}(x_0) = \sum_{i=1}^{n_Z} \lambda_i Z(x_i) + \sum_{j=1}^{n_Y} \alpha_j Y(x_j),
$$

Où $\lambda_i$ et $\alpha_j$ représentent respectivement les poids appliqués aux observations de la variable principale $Z_i$ et de celles de la variable secondaire $Y_j$. 

> **Remarque — Types de configuration des données :**  
> Nous utilisons deux indices distincts pour souligner que les coordonnées des observations de $Z$ et de $Y$ peuvent différer.  
> Autrement dit, les données peuvent être :
>
> - **Colocalisées** : chaque point de mesure possède à la fois une observation de $Z$ et de $Y$ ;  
> - **Non colocalisées** : aucune observation des deux variables n’est disponible au même emplacement ;  
> - **Partiellement colocalisées** : certaines positions présentent les deux variables, tandis que d’autres n’en présentent qu’une seule.

La [Fig. %s](#C9_DataPos) présente une illustration de ces trois cas de figure. Par simplification, nous adopterons une nomenclature unifiée pour représenter l’ensemble des cas. Ainsi, $Z_i$ désignera la $i^{\text{e}}$ observation de la variable principale $Z$, et $Y_i$ la $i^{\text{e}}$ observation de la variable secondaire $Y$, chacune étant associée à ses propres coordonnées spatiales. Pour alléger la notation, nous omettrons explicitement les indices de position et écrirons simplement $Z_i$ au lieu de $Z(\mathbf{x}_i)$, et de même $Y_i$ au lieu de $Y(\mathbf{v}_i)$.

```{figure} images/C9_DataPos.png
:label: C9_DataPos
:align: center
Illustration de trois configurations de données entre la variable principale (ronds bleus) et la variable secondaire (étoiles rouges).
```

Ainsi, la variance d’estimation s’exprime alors comme :

$$
\begin{aligned}
\mathrm{Var}(e) = \sigma_e^2 &= \mathrm{Var}\left(Z_0 - \hat{Z}_0\right) \\
&= \mathrm{Var}(Z_0) 
- 2 \sum_{i=1}^{n_Z} \lambda_i \mathrm{Cov}(Z_i, Z_0) 
- 2 \sum_{i=1}^{n_Y} \alpha_i \mathrm{Cov}(Y_i, Z_0) \\
&\quad + \sum_{i=1}^{n_Z} \sum_{j=1}^{n_Z} \lambda_i \lambda_j \mathrm{Cov}(Z_i, Z_j) 
+ 2 \sum_{i=1}^{n_Z} \sum_{j=1}^{n_Y} \lambda_i \alpha_j \mathrm{Cov}(Z_i, Y_j) \\
&\quad + \sum_{i=1}^{n_Y} \sum_{j=1}^{n_Y} \alpha_i \alpha_j \mathrm{Cov}(Y_i, Y_j).
\end{aligned}
$$

Cette expression met en évidence le rôle des covariances croisées entre les variables (c.-à-d., $\mathrm{Cov}(Z_i, Y_j)$), ainsi que des covariances directes entre les variables (c.-à-d., $\mathrm{Cov}(Z_i, Z_j)$ et $\mathrm{Cov}(Y_i, Y_j)$, dans la précision de l’estimation.

L’optimisation des vecteurs de poids $\boldsymbol{\lambda}=[\lambda_1, \ldots, \lambda_{n_Z}]$ et $\boldsymbol{\alpha}=[\alpha_1, \ldots, \alpha_{n_Y}]$ sous les contraintes de non-biais conduit au système de cokrigeage ordinaire (CO) et au système de cokrigeage simple (CS).


## Cokrigeage ordinaire (CO)

On cherche à construire une estimation linéaire de la variable principale $Z$ à partir des observations des variables principale et secondaire ($Z$ et $Y$) par l'estimateur suivant :

$$
\hat{Z}(x_0) = \sum_{i=1}^{n_z} \lambda_i Z_i + \sum_{i=1}^{n_y} \alpha_i Y_i
$$

L’estimateur doit être **sans biais**, ce qui s’assure par les contraintes suivantes:

$$
\sum_{i=1}^{n_z} \lambda_i = 1 \quad \text{et} \quad \sum_{i=1}^{n_y} \alpha_i = 0
$$

Par rapport au krigeage ordinaire, on constate l'ajout d'une contrainte supplémentaire liée à la variable secondaire. Cette contrainte indique que la somme des poids des variables secondaires doit être nulle. Cela tient au fait que l'espérance de l'estimateur doit être égale à la moyenne du processus aléatoire $Z$. Ainsi, on doit avoir $E[\hat{Z}_0] = E[\sum_{i=1}^{n_z} \lambda_i Z_i + \sum_{i=1}^{n_y} \alpha_i Y_i] = \sum_{i=1}^{n_z} \lambda_i E[Z_i] + \sum_{i=1}^{n_z} \alpha_i E[Y_i] = \sum_{i=1}^{n_z} \lambda_i m_Z + \sum_{i=1}^{n_z} \alpha_i m_Y = m_Z $. Cela est vrai uniquement si $\sum_{i=1}^{n_z} \lambda_i = 1$ et si $\sum_{i=1}^{n_y} \alpha_i = 0$.

Tout comme dans le krigeage ordinaire, nous allons devoir former un Lagrangien afin de tenir compte de nos deux contraintes de non-biais. On forme le Lagrangien en introduisant deux multiplicateurs de Lagrange, $\mu_Z$ et $\mu_Y$, et la fonction à minimiser s'écrit alors :

$$
L(\boldsymbol{\lambda},\boldsymbol{\alpha},\mu_Z,\mu_Y) = \mathrm{Var}(e) - 2 \mu_Z (\sum_{i=1}^{n_z} \lambda_i -1 ) - 2 \mu_Y (\sum_{i=1}^{n_y} \alpha_i - 0)
$$

On dérive en fonction des poids $\lambda_i$ et $\alpha_i$ ainsi que des multiplicateurs. Cela donne le système de cokrigeage ordinaire suivant :

$$
\begin{cases}
\sum_{j=1}^{n_z} \lambda_i \mathrm{Cov}(Z_i, Z_j) + \sum_{j=1}^{n_y} \gamma_l \mathrm{Cov}(Z_i, Y_j) + \mu_Z = \mathrm{Cov}(Z_i, Z_0), & i = 1, \dots, n_z \\
\sum_{j=1}^{n_z} \lambda_i \mathrm{Cov}(Y_i, Z_j) + \sum_{j=1}^{n_y} \gamma_l \mathrm{Cov}(Y_i, Y_j) + \mu_Y = \mathrm{Cov}(Y_i, Z_0), & i = 1, \dots, n_y \\
\sum_{i=1}^{n_z} \lambda_i = 1 \\
\sum_{i=1}^{n_y} \gamma_j = 0
\end{cases}
$$

La variance d’estimation associée est :

$$
\sigma^2_{CO} = \mathrm{Var}(Z_0) - \sum_{i=1}^{n_z} \lambda_i \mathrm{Cov}(Z_i, Z_0) - \sum_{i=1}^{n_y} \alpha_i \mathrm{Cov}(Y_i, Z_0) - \mu_Z - \mu_Y
$$

Ce système s’écrit de façon compacte en forme matricielle :

$$
\begin{bmatrix}
K_{ZZ}& K_{ZY} & 1 & 0 \\
K_{YZ}& K_{YY} & 0 & 1
1^T & 0 & 0 & 0 \\
0 & 1^T & 0 & 0
\end{bmatrix}
\begin{bmatrix}
\boldsymbol{\lambda} \\
\boldsymbol{\alpha} \\
\mu_Z \\
\mu_Y
\end{bmatrix}
=
\begin{bmatrix}
\mathbf{k_{ZZ}} \\
\mathbf{k_{YZ}} \\
1 \\
0
\end{bmatrix}
$$

Où $K_{ZZ}$ désigne la matrice des covariances entre toutes les observations de la variable principale, $K_{ZY}$ la matrice des covariances croisées entre les observations de la variable principale et celles de la variable secondaire, et $K_{YY}$ la matrice des covariances entre les observations de la variable secondaire.

Les vecteurs $\boldsymbol{\lambda}$ et $\boldsymbol{\alpha}$ représentent, respectivement, les poids associés aux observations de la variable principale et de la variable secondaire, tandis que $\mathbf{k}{ZZ}$ et $\mathbf{k}{ZY}$ sont les vecteurs de covariances entre le point à estimer et les observations de la variable principale et de la variable secondaire, respectivement.

> **Note :** Pour effectuer un cokrigeage ordinaire, il faut disposer d’au moins une observation de la variable principale et deux observations de la variable secondaire. La raison est la suivante : il est nécessaire d’attribuer un poids à au moins une coordonnée associée à la variable principale $Z$ afin de satisfaire la contrainte de somme des poids égale à 1.
De plus, il faut au moins deux observations de la variable secondaire $Y$ pour satisfaire à la contrainte de somme des poids égale à 0 imposée aux variables secondaires. S’il n’y avait qu’une seule observation secondaire, son poids serait nul pour respecter cette contrainte, et le système se réduirait alors à celui du krigeage ordinaire.

---

## Cokrigeage simple

Si les moyennes des variables $m_Z$ et $m_Y$ sont connues, il est possible de centrer les données et de travailler directement sur les résidus. 
Les résidus correspondent à la partie décentrée des variables, c’est-à-dire à la différence entre chaque observation et sa moyenne :
$$
Z'_i = Z_i - m_Z \quad \text{et} \quad Y'_j = Y_j - m_Y.
$$
On estime alors le résidu $Z'_0$, puis on lui ajoute la moyenne $m_Z$ pour obtenir l’estimation finale :
$$
\hat{Z}_0 = m_Z + \hat{Z}'_0.
$$
De cette manière, on peut omettre les contraintes de non-biais du cokrigeage ordinaire, à condition de disposer d’une estimation suffisamment précise des moyennes $m_Z$ et $m_Y$.


Ainsi, l’estimateur devient :
$$
\hat{Z}_0 = m_Z + \sum_{i=1}^{n_z} \lambda_i (Z_i - m_Z) + \sum_{i=1}^{n_y} \alpha_j (Y_i - m_Y)
$$

avec les poids obtenus par résolution du système :

$$
\begin{cases}
\sum_{j=1}^{n_z} \lambda_i \mathrm{Cov}(Z_i, Z_j) + \sum_{j=1}^{n_y} \gamma_l \mathrm{Cov}(Z_i, Y_j) = \mathrm{Cov}(Z_i, Z_0), & i = 1, \dots, n_z \\
\sum_{j=1}^{n_z} \lambda_i \mathrm{Cov}(Y_i, Z_j) + \sum_{j=1}^{n_y} \gamma_l \mathrm{Cov}(Y_i, Y_j) = \mathrm{Cov}(Y_i, Z_0), & i = 1, \dots, n_y 
\end{cases}
$$

La variance d’estimation est alors :

$$
\sigma^2_{CS} = \mathrm{Var}(Z_0) - \sum_{i=1}^{n_z} \lambda_i \mathrm{Cov}(Z_i, Z_0) - \sum_{i=1}^{n_y} \alpha_i \mathrm{Cov}(Y_i, Z_0)
$$

> **Note :** Contrairement au cokrigeage ordinaire, on peut ici réaliser une estimation même sans observations de la variable principale, à condition d’avoir au moins une observation de la variable secondaire. Si aucune observation de la variable secondaire n’est disponible, il ne s’agit plus d’un cokrigeage, mais simplement d’un krigeage.

---

## Cas particulier

Si l’une des deux variables possède une moyenne connue, par exemple lorsque la moyenne de la variable principale $m_Z$ est inconnue mais celle de la variable secondaire $m_Y$ est connue, on peut construire un système d’équations qui respecte cette contrainte.  

Dans ce cas, seules les observations de la variable principale sont soumises à la contrainte de non-biais. Tandis qu'aucune contrainte n'est imposée aux poids de la variable $Y$, car les résidus ont une moyenne nulle. Ainsi, on obtient une seule contrainte :  

$$
\sum_{i=1}^{n_z} \lambda_i = 1,
$$  
 
L’estimateur s’écrit alors :  

$$
\hat{Z}_0 = \sum_{i=1}^{n_z} \lambda_i Z_i + \sum_{i=1}^{n_y} \alpha_i (Y_i - m_Y),
$$  

où seule la moyenne de $Y$ est soustraite, puisque celle de $Z$ demeure inconnue.  

On forme le Lagrangien en introduisant un seul multiplicateur de Lagrange sur la variable $Z$, soit $\mu_Z$, et la fonction à minimiser s'écrit alors :

$$
L(\boldsymbol{\lambda},\boldsymbol{\alpha},\mu_Z) = \mathrm{Var}(e) - 2 \mu_Z (\sum_{i=1}^{n_z} \lambda_i -1 )
$$

On dérive en fonction des poids $\lambda_i$ et $\alpha_i$, ainsi que du multiplicateur de Lagrange. Cela donne le système de cokrigeage suivant :

$$
\begin{cases}
\sum_{j=1}^{n_z} \lambda_i \mathrm{Cov}(Z_i, Z_j) + \sum_{j=1}^{n_y} \gamma_l \mathrm{Cov}(Z_i, Y_j) + \mu_Z = \mathrm{Cov}(Z_i, Z_0), & i = 1, \dots, n_z \\
\sum_{j=1}^{n_z} \lambda_i \mathrm{Cov}(Y_i, Z_j) + \sum_{j=1}^{n_y} \gamma_l \mathrm{Cov}(Y_i, Y_j) = \mathrm{Cov}(Y_i, Z_0), & i = 1, \dots, n_y \\
\sum_{i=1}^{n_z} \lambda_i = 1
\end{cases}
$$ 

où $\mu_Z$ est le multiplicateur de Lagrange associé à la contrainte de non-biais.  

La variance d’estimation correspondante est donnée par :  

$$
\sigma^2_{CSO} = \mathrm{Var}(Z_0) - \sum_{i=1}^{n_z} \lambda_i \mathrm{Cov}(Z_i, Z_0) - \sum_{i=1}^{n_y} \alpha_i \mathrm{Cov}(Y_i, Z_0) - \mu_Z.
$$ 

Ce système s’écrit de façon compacte en forme matricielle :

$$
\begin{bmatrix}
K_{ZZ}& K_{ZY} & 1  \\
K_{YZ}& K_{YY} & 0
1^T & 0 & 0 \\
\end{bmatrix}
\begin{bmatrix}
\boldsymbol{\lambda} \\
\boldsymbol{\alpha} \\
\mu_Z
\end{bmatrix}
=
\begin{bmatrix}
\mathbf{k_{ZZ}} \\
\mathbf{k_{YZ}} \\
1
\end{bmatrix}
$$ 

Remarquez qu'il n'y a pas une grande différence entre le système de cokrigeage simple, ordinaire, ou celui-ci. Il faut simplement adapter les lignes de 1 et de 0, pour tenir compte de la contrainte de biais de manière adéquate selon la connaissance ou non des moyennes des processus aléatoire $Z$ et $Y$.

> **Remarque :**  
> Ce cas est courant lorsque la variable secondaire provient d’un modèle ou d’une mesure exhaustive déjà centrée, tandis que la variable principale repose sur un échantillonnage partiel.


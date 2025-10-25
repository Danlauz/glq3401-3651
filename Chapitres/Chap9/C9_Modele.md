# 9.2 Fonctions de covariance admissibles

On a vu précédemment que l'on devait connaître $\mathrm{Cov}(Z_i,Z_j)$, $\mathrm{Cov}(Y_i,Y_j)$, et $\mathrm{Cov}(Z_i,Y_j)$. Les deux premières covariances sont dites *directs*, la dernière est dite *croisée*.  

Comme pour le cas univariable, on utilisera généralement pour les covariances directes des modèles connus admissibles. Toutefois, pour la covariance croisée, les coefficients d'effet de pépite et les paliers peuvent être négatifs (cas d'une corrélation négative entre les variables $Z$ et $Y$). De plus, $\mathrm{Cov}(Z_i,Y_j)$ n'est pas nécessairement une fonction symétrique.

La vérification que le modèle multivariable (i.e. globalement les covariances simples et croisées) est admissible est donc plus complexe que pour le cas univariable. De façon générale, on doit évaluer les transformées de Fourier (analytique) de chaque modèle (covariances simples et croisées), former à chaque fréquence la matrice de densité spectrale et vérifier que celle-ci est positive semi-définie pour chaque fréquence. Un jolie bordel mathématique.

Il existe, cependant, des situations où l'admissibilité d'un modèle est plus simple à vérifier, et nous en étudierons trois. 

## Cas où la vérification est plus aisée

### 1. Relations déterministes entre $Z$ et $Y$

S'il est possible de lier mathématiquement la variable secondaire $Y$ à la variable principale $Z$, il devient possible de déduire la covariance croisée $\mathrm{Cov}(Z,Y)$ et la covariance $\mathrm{Cov}(Y,Y)$ à partir de la covariance $\mathrm{Cov}(Z,Z)$. 

Par exemple, si $Y$ est la dérivée de $Z$, alors il existe une relation directe entre les covariances simples et croisées des deux variables, ce qui garantit l’admissibilité du modèle ainsi formé.

Plus généralement, si l’on considère une transformation linéaire $L(Z)$ appliquée à $Z$ (par exemple une dérivée, une intégrale, ou une combinaison linéaire), alors :

$$
\mathrm{Cov}(Z(x),L(Z)(x+h)) = L\big(\mathrm{Cov}(Z(x),Z(x+h))\big).
$$


### 2. *Covariances proportionnelles 

Dans ce cas, toutes les fonctions de covariance (simples et croisées) sont proportionnelles à une même fonction de base $C(h)$, à des constantes multiplicatives près. La matrice de covariance s’écrit alors :

$$
\mathbf{C}(h) = 
\begin{bmatrix}
C_{yy}(h) & C_{yz}(h) \\
C_{zy}(h) & C_{zz}(h)
\end{bmatrix}
= \mathbf{B} \, C(h),
$$

où $\mathbf{B}$ est une matrice symétrique et positive semi-définie (c’est-à-dire que son déterminant est nul ou positif).

Dans ce modèle, si les deux variables $Z$ et $Y$ sont observées aux mêmes emplacements (ou si $Y$ est observée sur un sous-ensemble des points de $Z$), alors le cokrigeage revient exactement à un krigeage classique, et n’apporte donc aucun gain.

En revanche, si $Y$ est disponible à des emplacements différents de $Z$, et qu’il existe une corrélation suffisamment forte entre les deux variables, le cokrigeage peut améliorer significativement les estimations de $Z$.

> **Remarque :**  
> Le modèle proportionnel est unique en ce qu’il maintient une corrélation constante entre $Z$ et $Y$, quelle que soit l’échelle spatiale (ou le support de mesure).  
> C’est aussi le seul cadre où une décomposition en composantes principales produit des facteurs orthogonaux pour **toutes** les distances — autrement dit, la covariance croisée entre les facteurs est nulle partout dans l’espace.

### 3. Modèle linéaire de corégionalisation (MLC)

Il s'agit du modèle multivariable le plus utilisé en géostatistique. Le principe est de représenter toutes les fonctions de covariance (simples et croisées) comme une combinaison linéaire de structures élémentaires partagées :

$$
\mathbf{C}(h) = \sum_{k} \mathbf{B}_k \, C_k(h),
$$

où :

- chaque $C_k(h)$ est une fonction de covariance **admissible** (ex. : sphérique, exponentielle, gaussienne, etc.) ;
- chaque $\mathbf{B}_k$ est une matrice de coefficients **symétrique** et **positive semi-définie**.

Ces matrices traduisent la structure de corrélation inter-variables pour chaque structure élémentaire $C_k(h)$.

Si l’une des matrices $\mathbf{B}_k$ n’est **pas** positive semi-définie, alors le modèle n’est pas un modèle linéaire de corégionalisation valide, et il faut procéder à une vérification spectrale (par exemple via la densité spectrale) pour s’assurer de son admissibilité.

> **Remarque :**  
> Le MLC permet une grande flexibilité : plusieurs structures peuvent modéliser différents effets (pépite, structures à courte et longue portée, etc.), chacune avec des relations inter-variables spécifiques.



### Exemple

On considère deux variables $Z$ et $Y$.  
- $Z$ présente un effet de pépite de 1 et une covariance sphérique de portée 30 m et de palier 2.  
- $Y$ présente un effet de pépite de 1 et une covariance sphérique de portée 30 m et de palier 4.  
- La covariance entre $Z$ et $Y$ est symétrique, avec effet de pépite nul et covariance sphérique de portée 30 m et de palier 2.4.

On peut écrire :  
$$
\mathbf{C}(h) =
\begin{bmatrix}
C_{yy}(h) & C_{yz}(h) \\
C_{zy}(h) & C_{zz}(h)
\end{bmatrix}
= 
\begin{bmatrix}
4 & 2.4 \\
2.4 & 2
\end{bmatrix}
C_{\text{Sph}}(h; 30) + 
\begin{bmatrix}
1 & 0 \\
0 & 1
\end{bmatrix}
\delta(h),
$$
où $\delta(h) = 1$ si $h=0$ et $0$ sinon (effet de pépite).

La forme du modèle est celle d’un modèle linéaire de corégionalisation.  
Le déterminant de la première matrice est $1$, celui de la seconde est $2.24$, donc le modèle est admissible.

---

Supposons que l'on cherche à évaluer $\mathrm{Cov}(Z(x), Y(x+10))$.  
Avec ce modèle, on obtient :  
$$
\mathrm{Cov}(Z(x), Y(x+10)) = 0 + 2.4 \times \left[ 1 - \left(1.5 \times \frac{10}{30} - 0.5 \times \left(\frac{10}{30}\right)^3 \right) \right] = 1.244.
$$

> Note : ce modèle procure une corrélation à la distance 0 de :  
> $$
> \sqrt{\frac{2.4^2}{3 \times 5}} = 0.62,
> $$
> qui est assez faible.  
> Toutefois, si on interprète l'effet de pépite comme un bruit blanc, la corrélation entre les variables *non bruitées* serait :  
> $$
> \frac{2.4}{\sqrt{2 \times 4}} = 0.85,
> $$
> beaucoup plus élevée.

---

## Exemple de cokrigeage

Supposons les observations suivantes :  
- $Z_1$ et $Y_1$ en $x_1=0$,  
- $Z_2$ en $x_2=10$,  
- $Y_0$ en $x_0=5$.  

On compare l'estimation de $Z_0$ (au point $x_0=5$) par krigeage simple et cokrigeage simple. On suppose les deux variables de moyenne nulle.

Configuration :  

x: 0    5    10
Z1, Y1  Y0   Z2
Z0 ?

# Exemple de krigeage simple et cokrigeage simple

## Par krigeage simple

Le système s’écrit :

$$
\begin{bmatrix}
\lambda_1 \\
\lambda_2
\end{bmatrix}^T
\begin{bmatrix}
C_{ZZ}(0) & C_{ZZ}(10) \\
C_{ZZ}(10) & C_{ZZ}(0)
\end{bmatrix}
=
\begin{bmatrix}
C_{ZZ}(5) \\
C_{ZZ}(5)
\end{bmatrix}^T,
$$

avec les résultats numériques :

$$
\lambda = \begin{bmatrix} 0.46 \\ 0.37 \end{bmatrix}, \quad \sigma^2 = 0.87.
$$

---

## Par cokrigeage simple

On forme la matrice croisée et les poids $\lambda_i$ correspondants, par exemple :

$$
\begin{bmatrix}
\lambda_{Y0} \\
\lambda_{Y1} \\
\lambda_{Z1} \\
\lambda_{Z2}
\end{bmatrix}^T
\begin{bmatrix}
C_{YY} & C_{YZ} & \cdots & \cdots \\
\vdots & \vdots & \ddots & \vdots \\
\vdots & \vdots & \ddots & \cdots \\
\cdots & \cdots & \cdots & C_{ZZ}
\end{bmatrix}
=
\begin{bmatrix}
C_{ZY}(5) \\
\vdots
\end{bmatrix}^T,
$$

avec une réduction significative de la variance d’estimation.  
La variable auxiliaire $Y_0$ reçoit un poids important, ce qui illustre le bénéfice du cokrigeage.

---

## Le variogramme croisé

Le variogramme croisé est une fonction de structure croisée utilisée lorsque les covariances sont symétriques. Il est défini par :

$$
\gamma_{ZY}(h) = \frac{1}{2} \, \mathbb{E} \left[ \left(Z(x+h) - Z(x)\right)\left(Y(x+h) - Y(x)\right) \right]
$$


Cette fonction est symétrique et ne peut être estimée que sur les points où les deux variables sont connues.

Malgré cette contrainte, le variogramme croisé présente deux avantages :

Il n’est pas nécessaire d’estimer les moyennes de $Z$ et $Y$.

Les modèles n’ont pas nécessairement de palier.

Dans la plupart des cas, il est toutefois préférable d’utiliser la covariance croisée, notamment pour les calculs de cokrigeage.

Une relation utile relie la covariance croisée et le variogramme croisé :

$$
\gamma_{ZY}(h) = C_{ZY}(0) - C_{ZY}(h)
$$


Si $Y = Z$, on retrouve alors la formule du variogramme univarié classique.

## Exemple d'application (inspiré de Gloaguen, M.Sc.A., 2000)

Des forages dans un aquifère à nappe libre ont permis de déterminer le niveau du fond de l'aquifère en quatre points :
$(25,25)$, $(75,25)$, $(75,75)$ et $(25,75)$.

Un levé géoradar a également été réalisé sur une grille régulière de 10 m, couvrant la zone de $0$ à $100$ m en $x$ et $y$.

Objectif : décrire la forme du fond de l’aquifère en combinant les deux sources d'information.

Un cokrigeage ordinaire est effectué en utilisant :

Les 4 forages (valeur observée : $-1$)

Les 121 points radar (valeurs observées : $-0.5$ ou $-3.5$ ; cette dernière correspondant au fond d’un chenal)

On note un décalage entre les données radar et forage (−0.5 vs −1).

Un modèle linéaire de corégionalisation est utilisé avec :

Une composante sphérique de portée 100 m

Une corrélation inter-variété de 0.9

Résultat :
Les estimations aux points radar prennent deux valeurs : $-1.11$ et $-3.8$, correspondant respectivement aux zones en dehors et dans le chenal.

Ainsi, le cokrigeage a corrigé le biais systématique des données radar, tout en récupérant la géométrie du chenal.

La matrice de coefficients utilisée était :
$$
\mathbf{B} = \begin{bmatrix} 2 & 8 \\ 1 & 8 \end{bmatrix}
$$

Remarque :
Si l'on avait utilisé uniquement les 4 forages pour un krigeage ordinaire, la surface estimée aurait été plane, égale à la moyenne, et la structure du chenal aurait été perdue.


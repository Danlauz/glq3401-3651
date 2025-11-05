# 9.3 Fonctions de covariance admissibles

On a vu précédemment que le cokrigeage nécessite la connaissance des covariances $\mathrm{Cov}(Z_i, Z_j)$, $\mathrm{Cov}(Y_i, Y_j)$ , $\mathrm{Cov}(Z_i, Y_j)$ et $\mathrm{Cov}(Y_i, Z_j). Les deux premières sont appelées covariances directes, car elles concernent la même variable, tandis que les dernières sont des covariances croisées, puisqu’elles mettent en relation les deux variables simultanément (on croise les données).

La covariance croisée joue un rôle essentiel : elle permet de transférer l’information d’une variable à l’autre lorsqu’elles sont corrélées spatialement. Autrement dit, même si la variable principale $Z$ est peu échantillonnée, les observations de la variable secondaire $Y$ peuvent contribuer à améliorer l’estimation de $Z$ grâce à la relation statistique entre les deux variables.

Comme dans le cas univariable, on utilise généralement des modèles de covariance connus et admissibles pour modéliser les covariances directes. En revanche, la covariance croisée présente certaines particularités : 1) les coefficients d’effet de pépite et les paliers peuvent être négatifs, notamment lorsqu’il existe une corrélation négative entre les variables $Z$ et $Y$, et 2) Il n’est pas toujours vrai que les fonctions de covariance croisées soient symétriques ; autrement dit, $\mathrm{Cov}_{ZY}(h)$ n’est pas nécessairement égal à $\mathrm{Cov}_{ZY}(-h)$. Les covariances croisées peuvent être asymétriques. Ainsi, le comportement statistique entre la variable principale et la variable secondaire peut s'avérer relativement complexe.

Ainsi, la vérification de l’admissibilité d’un modèle multivariable (c’est-à-dire l’ensemble des covariances directes et croisées) est plus délicate que dans le cas univariable. En principe, il faut : 1) calculer les transformées de Fourier (analytiques) de chaque modèle de covariance ; 2) former, pour chaque fréquence, la matrice de densité spectrale associée ; 3) vérifier que cette matrice est positive semi-définie pour toutes les fréquences. Un processus… disons, mathématiquement exigeant.

Heureusement, il existe des cas particuliers où l’admissibilité est plus facile à garantir. Nous en étudierons trois exemples dans la suite.

## Cas où la vérification est plus aisée

### 1. Relations déterministes entre $Z$ et $Y$

S'il est possible de lier mathématiquement la variable secondaire $Y$ à la variable principale $Z$, il est possible de déduire, à partir de la covariance $\mathrm{Cov}(Z,Z)$, les covariances croisées $\mathrm{Cov}(Z,Y)$ et $\mathrm{Cov}(Y,Y)$. 

Par exemple, si $Y$ est la dérivée de $Z$, alors il existe une relation directe entre les covariances simples et croisées des deux variables, ce qui garantit l’admissibilité. Il suffit d'avoir un modèle admissible pour la variable $Z$, et les covariances directs et croisées déduites à partir de ce modèle seront elles-mêmes admissibles.

Plus généralement, si l’on considère une transformation linéaire $L(Z)$ appliquée à $Z$ (par exemple une dérivée, une intégrale ou une combinaison linéaire), alors :

$$
\mathrm{Cov}(Z(x),L(Z(x+h))) = L\big(\mathrm{Cov}(Z(x),Z(x+h))\big).
$$

#### Exemple 1D — $Y(x)$ est la dérivée de $Z(x)$

On suppose que la variable secondaire $Y(x)$ correspond à la dérivée spatiale de la variable principale $Z(x)$ :  

$$
Y(x) = \frac{dZ(x)}{dx}.
$$

Dans ce cas, les covariances croisées et directes peuvent être dérivées analytiquement à partir de la covariance de $Z(x)$ :  

$$
C_{ZY}(h) = \mathrm{Cov}(Z(x), Y(x+h)) 
       = \frac{d}{dh}\big[\mathrm{Cov}(Z(x), Z(x+h))\big]
       = \frac{dC_{ZZ}(h)}{dh},
$$  

$$
C_{YY}(h) = \mathrm{Cov}(Y(x), Y(x+h)) 
       = -\frac{d^2}{dh^2}\big[\mathrm{Cov}(Z(x), Z(x+h))\big]
       = -\frac{d^2C_{ZZ}(h)}{dh^2}.
$$  

$$
C_{YZ}(h) = -C_{ZY}(h).
$$  


### 2. Covariances proportionnelles 

Dans ce cas, toutes les fonctions de covariance (simples et croisées) sont proportionnelles à une même fonction de base $C(h)$, à des constantes multiplicatives près. La matrice de covariance s’écrit alors :

$$
\mathbf{C}(h) = 
\begin{bmatrix}
C_{ZZ}(h) & C_{ZY}(h) \\
C_{YZ}(h) & C_{ZZ}(h)
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

- Chaque $C_k(h)$ est une fonction de covariance admissible (ex. : sphérique, exponentielle, gaussienne, etc.) de palier unitaire ;
- Chaque $\mathbf{B}_k$ est une matrice de coefficients symétrique et positive semi-définie représentant les paliers des modèles directs et croisés de la composante $k$.

Ces matrices représentent la matrice de corrélation inter-variables pour chaque structure élémentaire $C_k(h)$.

Si l’une des matrices $\mathbf{B}_k$ n’est **pas** positive semi-définie, alors le modèle n’est pas un modèle linéaire de corégionalisation valide, et il faut procéder à une vérification spectrale (par exemple via la densité spectrale) pour s’assurer de son admissibilité.

> **Remarque :**  
Le MLC offre une grande flexibilité : plusieurs structures peuvent modéliser différents effets (pépite, structures à courte et à longue portée, etc.), chacune avec des relations directes et croisées spécifiques.

### Exemple

On considère deux variables $Z$ et $Y$.  
- $Z$ présente un effet de pépite de 1 et une covariance sphérique de portée de 30 m, avec un palier 2.  
- $Y$ présente un effet de pépite de 1 et une covariance sphérique de portée de 30 m, avec un palier 4.  
- La covariance entre $Z$ et $Y$ est symétrique, avec effet de pépite nul et covariance sphérique de portée 30 m et de palier 2.4.

On peut écrire :  
$$
\mathbf{C}(h)
=
\begin{bmatrix}
C_{ZZ}(h) & C_{ZY}(h) \\[4pt]
C_{YZ}(h) & C_{YY}(h)
\end{bmatrix}
=
\begin{bmatrix}
1 & 0 \\[4pt]
0 & 1
\end{bmatrix}
\,\delta(h)
\;+\;
\begin{bmatrix}
2 & 2.4 \\[4pt]
2.4 & 4
\end{bmatrix}
\,C_{\mathrm{Sph}}(h; 30)
$$

où $\delta(h) = 1$ si $h=0$ et $0$ sinon (effet de pépite).

La forme du modèle est celle d’un modèle linéaire de corégionalisation.  
Le déterminant de la première matrice est $1$, celui de la seconde est $2.24$. Donc, le modèle est admissible.

---
## Exemple de calcul avec le MLC

Supposons que l'on cherche à évaluer $\mathrm{Cov}(Z(x), Y(x+10))$.  
Avec le modèle ci-haut, on obtient :  
$$
\mathrm{Cov}(Z(x), Y(x+10)) = 0 + 2.4 \times \left[ 1 - \left(1.5 \times \frac{10}{30} - 0.5 \times \left(\frac{10}{30}\right)^3 \right) \right] = 1.244.
$$

Note : ce modèle procure une corrélation à la distance 0 de :  
$$
\sqrt{\frac{2.4^2}{3 \times 5}} = 0.62,
$$
qui est faible.  
Toutefois, si on interprète l'effet de pépite comme un bruit blanc, la corrélation entre les variables *non bruitées* serait :  
$$
\frac{2.4}{\sqrt{2 \times 4}} = 0.85,
$$
beaucoup plus élevée.

---

## Exemple de cokrigeage

Supposons les observations suivantes :  
- $Z_1$ et $Y_1$ en $x_1=0$,  
- $Z_2$ en $x_2=10$,  
- $Y_0$ en $x_0=5$.  

On compare l'estimation de $Z_0$ (au point $x_0=5$) par krigeage simple et par cokrigeage simple. On suppose que les deux variables ont une moyenne nulle.

Configuration :  

x: 0    5    10
Z1, Y1  Y0   Z2
Z0 ?

# Exemple de krigeage simple et cokrigeage simple

## Par krigeage simple

Le système s’écrit :

$$

\begin{bmatrix}
C_{Z_1,Z_1} & C_{Z_2,Z_1} \\
C_{Z_1,Z_2} & C_{Z_2,Z_2}
\end{bmatrix}
\begin{bmatrix}
\lambda_1 \\
\lambda_2
\end{bmatrix}
=
\begin{bmatrix}
C_{Z_1,Z_0} \\
C_{Z_2,Z_0}
\end{bmatrix},
$$

et l,aplication numérique donne les valeurs suivantes : 

\begin{bmatrix}
3 & 1.037 \\
1.037 & 3
\end{bmatrix}
\begin{bmatrix}
\lambda_1 \\
\lambda_2
\end{bmatrix}
=
\begin{bmatrix}
1.5046 \\
1.5046
\end{bmatrix},
$$


La résolution du système donne :

$$
\lambda = \begin{bmatrix} 0.3727 \\ 0.3727 \end{bmatrix}, \quad \sigma_{KS}^2 = 1.8784.
$$

---

## Par cokrigeage simple

On forme la matrice croisée et les poids $\lambda_i$ correspondants, par exemple :

$$
\begin{bmatrix}
C_{Z_1,Z_1} & C_{Z_1,Z_2} & C_{Z_1,Y_1} & C_{Z_1,Y_0} \\
C_{Z_2,Z_1} & C_{Z_2,Z_2} & C_{Z_2,Y_1} & C_{Z_2,Y_0} \\
C_{Y_1,Z_1} & C_{Y_1,Z_2} & C_{Y_1,Y_1} & C_{Y_1,Y_0} \\
C_{Y_0,Z_1} & C_{Y_0,Z_2} & C_{Y_0,Y_1} & C_{Y_0,Y_0}
\end{bmatrix}
\begin{bmatrix}
\lambda_{Z1} \\
\lambda_{Z2} \\
\lambda_{Y1} \\
\lambda_{Y0}
\end{bmatrix}
=
\begin{bmatrix}
C_{Z_1,Z_0} \\
C_{Z_2,Z_0} \\
C_{Y_1,Z_0} \\
C_{Y_0,Z_0}
\end{bmatrix}
$$

Il est désormais important de lire attentivement la matrice de corégionalisation linéaire pour effectuer les calculs. Il faut sélectioner adéquation les paliers respectant les paires de point en jeu. Une fois réaliser, on obtient la matrice complète suivante : 

$$
\begin{bmatrix}
3      & 1.037  & 2.4    & 1.8056 \\
1.037  & 3      & 1.2444 & 1.8056 \\
2.4    & 1.2444 & 5      & 3.0093 \\
1.8056 & 1.8056 & 3.0093 & 5
\end{bmatrix}
\begin{bmatrix}
\lambda_{Z1} \\
\lambda_{Z2} \\
\lambda_{Y1} \\
\lambda_{Y0}
\end{bmatrix}
=
\begin{bmatrix}
1.5046 \\
1.5046 \\
1.8056 \\
2.4
\end{bmatrix}
$$

La résolution du système de cokrigeage simple donne : 
$$
\lambda_{Z1} = 0.2294 \quad \lambda_{Z1} = 0.2336  \quad \lambda_{Z1} = 0.0072  \quad \lambda_{Y0} = 0.3085  \quad \sigma_{CS}^2 = 1.5500.
$$

Notons que 1) la variable secondaire $Y_0$ a reçu un poids important, car la propriété de l'effet d'écran du krigeage s'applique aussi au cokrigeage, 2) la symétrie des poids des 2 observations en $Z$ n'est pas préservée, car, à un de ces points, on connaît aussi la variable secondaire $Y$, et 3) la réduction de la variance d'estimation procurée par le cokrigeage est assez importante.

Si nous réalsons les calculs pour le krigeage ordinaire et le cokrigeage ordinaire nous aurions les résultat suivants : 

Krigeage ordinaire:
$$
\lambda = \begin{bmatrix} 0.5 \\ 0.5 \end{bmatrix}, \quad \sigma_{KS}^2 = 2.0093.
$$

Cokrigeage ordinaire:
$$
\lambda_{Z1} = 0.5494 \quad \lambda_{Z1} = 0.4506  \quad \lambda_{Z1} = -0.1678  \quad \lambda_{Y0} = 0.1678  \quad \sigma_{CS}^2 = 1.9067.
$$

Noter que la somme des poids de la variable principale $Z$ donne 1, et celle de la variable secondaire $Y$ donne 0, comme prévu. Cette dernière contrainte empêche ici le cokrigeage ordinaire d'améliorer substantiellement la prédiction du krigeage ordinaire comme l'indique les variance d'estimation.

---

## Le variogramme croisé

Le variogramme croisé est une fonction de structure croisée utilisée lorsque les covariances sont symétriques. Il est défini par :

$$
\gamma_{ZY}(h) = \frac{1}{2} \, \mathbb{E} \left[ \left(Z(x+h) - Z(x)\right)\left(Y(x+h) - Y(x)\right) \right]
$$

Cette fonction est symétrique et ne peut être estimée que sur les points où les deux variables sont connues.

Malgré cette contrainte, le variogramme croisé présente deux avantages :

Il n’est pas nécessaire d’estimer les moyennes de $Z$ et de $Y$.

Les modèles n’ont pas nécessairement de palier.

Dans la plupart des cas, il est toutefois préférable d’utiliser la covariance croisée, notamment pour les calculs de cokrigeage.

Une relation utile relie la covariance croisée et le variogramme croisé :

$$
\gamma_{ZY}(h) = C_{ZY}(0) - 0.5 (C_{ZY}(h)+C_{ZY}(-h))
$$


Si $Y = Z$, on obtient alors la formule du variogramme univarié classique.

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


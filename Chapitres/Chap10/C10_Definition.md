# 10.1 Krigeage d'indicatrices

L'idée de base du krigeage d'indicatrices (KI) repose sur le fait que le krigeage est un bon estimateur de l'espérance conditionnelle d'une variable aléatoire (v.a.). On rappelle que le krigeage ordinaire est presque sans biais conditionnel dans le cas normal et que le krigeage simple est sans biais conditionnel.

Si l'on considère un seuil donné, disons $c$, on peut coder, par rapport à ce seuil, la v.a. $Z(x)$ en une variable indicatrice $I(x,c)$ prenant la valeur 0 ou 1 :  
$$
I(x,c) = 
\begin{cases}
1 & \text{si } Z(x) \leq c, \\
0 & \text{si } Z(x) > c.
\end{cases}
$$

Considérons l'espérance de $I(x,c)$. Par définition, on a :  
$$
\mathbb{E}[I(x,c)] = P(Z(x) \leq c) = F_{Z(x)}(c),
$$
où $F_{Z(x)}(c)$ est la fonction de distribution de $Z$ à la localisation $x$ pour le seuil $c$.

Le problème consiste donc à estimer $I(x,c)$ en se servant de l'information disponible, c'est-à-dire les observations $Z(x_i)$ en $n$ points.

La méthode s'effectue ainsi :  
1. On code les valeurs observées $Z(x_i)$ par rapport au seuil $c$. On obtient ainsi de nouvelles variables indicatrices $I(x_i, c)$, valant 0 ou 1 selon la position relative à $c$.  
2. On effectue le krigeage, en un point $x_0$, de $I(x_0, c)$ à partir des $I(x_i, c)$ connus. Comme le krigeage approxime l'espérance conditionnelle, la valeur krigée peut être interprétée comme une estimation de  
$$
P(Z(x_0) \leq c \mid Z(x_1), \ldots, Z(x_n)) \approx \hat{I}(x_0, c).
$$  
Avant cela, il faut calculer et modéliser le variogramme des indicatrices $I(x_i,c)$ pour pouvoir effectuer le krigeage.  
3. On répète le processus pour différents seuils $c_2, c_3, \ldots$. Pour chaque seuil, on code les valeurs originales, calcule et modélise le variogramme (différent selon le seuil), puis effectue un nouveau krigeage.

En combinant les résultats des krigeages pour ces différents seuils, on obtient une version discrétisée de la fonction de distribution conditionnelle  
$$
F^*_Z(x_0, z \mid Z_1, \ldots, Z_n),
$$
que l'on note dorénavant $F_{KI}(x_0, z)$.  
Cette fonction permet ensuite de calculer diverses quantités utiles : probabilités, quantiles, médiane, fonction de coût, etc., toutes dérivables d'une fonction de distribution.

---

### Notes importantes :

- Cette méthode est une approximation : le krigeage ne coïncide pas exactement avec l'espérance conditionnelle sauf dans le cas normal et avec le krigeage simple.  
- En ne conditionnant que sur la variable indicatrice, on perd de l'information par rapport à la teneur originale. Pour la retrouver, il faudrait faire un cokrigeage simultané sur toutes les indicatrices définies sur un continuum de seuils, ce qui est rarement envisagé à cause de sa complexité. Des alternatives plus simples existent, comme l'emploi de la teneur comme variable auxiliaire dans un cokrigeage ("probability kriging") ou l'utilisation d'une analyse en composantes principales (ACP) des variables indicatrices.  
- Les estimés obtenus ne sont pas toujours rigoureusement des probabilités : il est possible d'avoir des valeurs négatives, supérieures à 1, ou non monotones par rapport au seuil. Ces défauts sont fréquents et doivent être corrigés de manière empirique (par exemple en forçant la monotonicité). Ces problèmes viennent principalement de poids de krigeage négatifs ou de modèles de variogrammes incompatibles entre seuils.  
- On peut néanmoins fournir des estimés analogues au krigeage ordinaire en calculant l'espérance à partir de la fonction de distribution estimée $F_{KI}(x, c)$.  
- Les variogrammes des indicatrices sont souvent plus simples à modéliser que ceux de $Z(x)$, car les valeurs sont binaires (0 ou 1), sans problème de valeurs extrêmes. La variance de l'indicatrice à un seuil correspondant à un quantile $p$ est $p(1-p)$. Le plateau du variogramme, pour un champ suffisamment grand par rapport à la portée, correspond approximativement à cette valeur.  
- Le variogramme des indicatrices n'est pas deux fois dérivable à l'origine, ce qui exclut certains modèles (comme le modèle gaussien), car la variable indicatrice est discontinue.  
- Il faut éviter de choisir des seuils trop proches des extrêmes de la distribution (par exemple, en-dessous du 5% ou au-dessus du 95%), car les variogrammes seraient alors erratiques. On se limite généralement aux quantiles entre 10% et 90%.  
- Typiquement, entre 5 et 10 seuils sont nécessaires pour bien estimer la fonction de distribution. Le krigeage d’indicatrices est donc simple en principe mais lourd en pratique. On choisit souvent les déciles de la distribution globale comme seuils.  
- Un avantage important du krigeage d’indicatrices est sa capacité à modéliser des structures complexes, qui peuvent varier selon les seuils (par exemple, une anisotropie présente uniquement aux seuils élevés). Par opposition, les méthodes basées sur les transformations gaussiennes imposent une structure unique.  
- Le problème du changement de support est aussi présent, voire plus complexe, qu'avec les méthodes basées sur transformations gaussiennes. La correction affine est souvent utilisée pour y remédier.

---

Malgré ses défauts, le krigeage d’indicatrices est une méthode répandue, en raison de sa simplicité mathématique et de sa facilité de mise en œuvre (un programme de krigeage ordinaire suffit). Sa robustesse face aux valeurs extrêmes (pour certaines tâches) et sa capacité à intégrer des données incertaines ("soft kriging") ont aussi contribué à sa popularité. Le KI est particulièrement utile lorsque le changement de support n'intervient pas.

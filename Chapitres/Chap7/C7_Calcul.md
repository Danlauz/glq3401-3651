# 7.4 Calcul des variogrammes de blocs

Les termes $\bar{\gamma}(v,v)$ ou $\bar{\gamma}(x,v)_i$ sont requis pour obtenir les variances de blocs, de dispersion et d'estimation. Ils peuvent être calculés de plusieurs façons :

---

## i. Intégration analytique de $\gamma(h)$

Applicable surtout en 1D.

**Exemple (modèle sphérique) :**

$$
\bar{\gamma}(v,v)/C = 
\begin{cases}
0.5\,v/a - 0.05\,(v/a)^3 & \text{si } v < a \\
1 - 0.75\,a/v + 0.2\,(a/v)^2 & \text{si } v \ge a
\end{cases}
$$

où $a$ est la portée.

---

## ii. Utilisation d’abaques (ex. sphérique, exponentiel)
Les abaques permettent de calculer $\bar{\gamma}(v, v)$ pour un modèle isotrope de variogramme. Il suffit ensuite de multiplier cette valeur par le palier du variogramme pour obtenir la valeur désirée. Nous verrons en classe comment utiliser ces abaques de manière efficace.


---

## iii. Approximation numérique (grille ou Monte Carlo)

On représente le bloc $v$ par une grille fine et on calcule la valeur moyenne du variogramme $\bar{\gamma}(x_i - x_j)$ sur toutes les paires $(x_i, x_j)$ de la grille.

**Méthode de Monte Carlo** : placer $n$ paires de points aléatoires dans le bloc $v$, puis moyenner $\bar{\gamma}(h)$ sur ces paires.

---


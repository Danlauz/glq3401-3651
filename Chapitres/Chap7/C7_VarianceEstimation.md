# 7.3 Variance d’estimation

Dans cette section, on cherche à établir les résultats permettant de fournir une mesure de la précision des estimés effectués par une méthode d’estimation quelconque (généralement linéaire).

Soit une variable aléatoire $Z_v$ que l’on veut estimer à partir d’une combinaison linéaire des valeurs observées en différents points :

$$
Z_v^* = \sum_{i=1}^n \lambda_i Z(x_i) = \sum_{i=1}^n \lambda_i Z_i
$$

où :

- $Z_i$ est la valeur observée au point $x_i$ (v.a.),
- $Z_v^*$ est l'estimateur de $Z_v$,
- $\lambda_i$ est le poids associés à la donnée $Z_i$.

On définit l’erreur d’estimation comme la différence entre la valeur estimée et la valeur réelle:

$$
e = Z_v^* - Z_v
$$

La variance de cette erreur, appelée **variance d’estimation**, est obtenue par ce développement :

$$
\sigma_e^2 = \mathrm{Var}(e) = \mathrm{Var}(Z_v^*) + \mathrm{Var}(Z_v) - 2\,\mathrm{Cov}(Z_v^*, Z_v)
$$

:::{dropdown} Rappel : Propriété de la variance sur une combinaison linéaire
On rappelle que la variance d'une combinaison linéaire de variables aléatoires est donnée par :

$$ 
\mathrm{Var}\left( \sum_{i=1}^n \lambda_i Z_i \right) = \sum_{i=1}^n \sum_{j=1}^n \lambda_i \lambda_j \, \mathrm{Cov}(Z_i, Z_j) 
$$

et que 
$$ 
\mathrm{Cov}(Z_i, Z_i) = \mathrm{Var}(Z_i)
$$

:::


En substituant l'expression de $Z_v^*$ dans cette formule, on obtient :

$$
\sigma_e^2 = \mathrm{Var}(Z_v) + \sum_{i=1}^n \sum_{j=1}^n \lambda_i \lambda_j \mathrm{Cov}(Z_i, Z_j)
 - 2 \sum_{i=1}^n \lambda_i \mathrm{Cov}(Z_i, Z_v)
$$


## Interprétation

La variance d'estimation est donc composée de trois termes. Leur interprétation est foncièrement logique et nous allons en explorer les bases ici.

a) $\mathrm{Var}(Z_v)$ : Le phénomène que l'on cherche à estimer est-il intrinsèquement variable ou non ?
   Plus le phénomène que l'on étudie est variable, plus les erreurs de nos estimations seront également variables. Imaginons estimer une teneur à partir d'un champ constant. C'est assez simple : l'estimation sera la valeur constante et il n'y a aucune variabilité, donc l'estimation est facile. Si le champ est un bruit pur, la variabilité est grande, l'estimation devient complexe car la variance est élevée.

b) $\sum_{i=1}^n \sum_{j=1}^n \lambda_i \lambda_j \mathrm{Cov}(Z_i, Z_j)$ : Quel est le degré de redondance entre les observations ?
   Ce terme cherche à prendre en compte la redondance des données. L'estimation sera meilleure si les données sont éloignées les unes des autres (ce qui induit une covariance faible), et donc une variance d'estimation réduite. En revanche, si les données sont trop proches les unes des autres, $\mathrm{Cov}(Z_i, Z_j)$ sera élevée et notre estimation sera moins fiable. Ce terme calcule donc la redondance entre les données, et l'objectif est de minimiser cet effet. Il est inutile d’avoir 100 données toutes situées dans la même zone ; au contraire, il est préférable de bien les répartir sur la grille, en tenant compte de l'anisotropie du phénomène étudié, bien sûr.

c) $\sum_{i=1}^n \lambda_i \mathrm{Cov}(Z_i, Z_v)$ : Les observations sont-elles bien placées par rapport à ce que l'on veut estimer ?
   Ce terme tient compte de la position des données par rapport à ce que l'on veut estimer. Il est évident que si les données sont très proches du point à estimer, l'estimation sera meilleure. Si $\mathrm{Cov}(Z_i, Z_v)$ est élevé et que ce terme est précédé d'un signe négatif, la variance d'estimation sera réduite. Inversement, si les données sont très éloignées, $\mathrm{Cov}(Z_i, Z_v)$ tendra vers 0 et n'aura pas d'effet sur la réduction de la variance d'estimation. Au final, il est très difficile d'estimer un point précisément lorsque les données sont à des années-lumière de ce que l'on cherche à estimer.

## Remarques importantes

1. Dans les formules ci-dessus, on reconnaît trois composantes :

   - Un **terme lié au bloc à estimer** : $\mathrm{Var}(Z_v)$ ou $\gamma(v,v)$  
   - Un **terme lié aux points utilisés pour estimer** : $\mathrm{Cov}(Z_i, Z_j)$ ou $\gamma(x_i, x_j)$  
   - Un **terme croisé** : $\mathrm{Cov}(Z_i, Z_v)$ ou $\gamma(x_i, v)$

2. La variance d’estimation est une **mesure de précision moyenne** sur le gisement pour une configuration donnée. Elle est indépendante de la valeur estimée et ne prend pas en compte les effets proportionnels (ex. : gisement lognormal).

3. Pour améliorer la précision, on peut chercher à **minimiser $\sigma_e^2$** en choisissant les poids $\lambda_i$ de façon optimale — c’est le principe du **krigeage**.

---

## Variance d’extension

C'est la variance d'estimation obtenue lorsqu'on étend la valeur d'un point à une surface ou un volume; la valeur d'un segment à une surface ou un volume; la valeur d'une surface à un volume, etc. Bref, il s'agit de variances d'estimation correspondant à des situations particulières qui, par leur simplicité, se prêtent bien à la construction d'abaques.

Les configurations seront introduites dans la section calcul.

---

## Formulation avec le variogramme

En utilisant la relation qui relie la covariance et le variogramme :

$$
\mathrm{Cov}(Z_i, Z_j) = \sigma^2 - \gamma(x_i - x_j)
$$

Il est possible d'écrire la variance d'estimation en termes du variogramme comme suit :
$$
\sigma_e^2 = \sum_{i,j} \lambda_i \lambda_j \gamma(x_i, x_j) - 2 \sum_i \lambda_i \gamma(x_i, x_v) + \gamma(v, v)
$$

---

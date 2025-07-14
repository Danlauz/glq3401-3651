# 7.1 Variances de blocs

On a vu précédemment l'importance de connaître la variance de la variable aléatoire correspondant au support d'exploitation de la mine. Ce support n'est évidemment pas la carotte mais plutôt un bloc d'une certaine taille (ex. 5 m × 5 m × 5 m). On distingue deux notions de variances différentes et complémentaires :

- **Variance de bloc** : décrit l’amplitude théorique des variations des teneurs de bloc pour un domaine infini. C'est l'analogue de la variance ponctuelle (palier du variogramme) pour des blocs. Cette notion n'est définie que pour les modèles de variogramme avec palier.

- **Variance de dispersion** : décrit l’amplitude théorique des variations des teneurs de bloc à l’intérieur d’un domaine fini. La variance de dispersion peut s’obtenir à partir de la variance de bloc comme on le verra plus loin. Cette notion est définie même pour les variogrammes sans palier.

Ces deux notions interviennent dans :

- Le calcul des réserves récupérables d’un gisement  
- L’évaluation de l’efficacité et du rendement des piles d’homogénéisation  
- L’analyse de la variabilité de la production minière dans le temps  
- Le calcul de la variance d’estimation

On peut calculer la variance des blocs si l’on connaît le variogramme des informations ponctuelles ou quasi-ponctuelles (carottes). De fait, on peut même calculer le variogramme (et le covariogramme) de blocs.

Soit \( Z(x) \) la variable aléatoire correspondant à l'information ponctuelle.  
Soit \( Z_v(x) \) la variable aléatoire correspondant à un bloc centré en \( x \).

On a :

$$
Z_v(x) = \frac{1}{v} \int_v Z(y) \, dy
$$

Cette relation exprime que la teneur d’un bloc est la moyenne des teneurs des points le composant.

On note \( m = E[Z_v(x)] \), et la variance de \( Z_v(x) \) s’écrit :

$$
\mathrm{Var}(Z_v(x)) = \sigma_v^2 = E\left[ \left(Z_v(x) - m \right)^2 \right] = E\left[ \left( \frac{1}{v} \int_v Z(y) \, dy - m \right)^2 \right]
$$

En développant :

$$
\sigma_v^2 = \frac{1}{v^2} \iint_v E\left[ (Z(y_1) - m)(Z(y_2) - m) \right] dy_1 dy_2 = \frac{1}{v^2} \iint_v \mathrm{Cov}(Z(y_1), Z(y_2)) \, dy_1 dy_2
$$

Cette dernière expression indique que la variance d’un bloc \( v \) est donnée par la moyenne des covariances entre toutes les paires de points à l’intérieur du bloc.

En termes de variogramme, on utilise la relation :

$$
C(h) = \sigma^2 - \gamma(h)
$$

D’où :

$$
\sigma_v^2 = \sigma^2 - \frac{1}{v^2} \iint_v \gamma(y_1 - y_2) \, dy_1 dy_2
$$

Ainsi, si le variogramme ponctuel est connu et atteint un palier, alors on peut connaître toutes les variances de blocs, peu importe leur taille ou leur forme (même discontinus).

On vérifie que pour tous les modèles croissants de variogramme :

$$
\lim_{v \to 0} \sigma_v^2 = \sigma^2 \quad \text{et} \quad \lim_{v \to \infty} \sigma_v^2 = 0
$$

---

### Complément : variogramme de blocs (optionnel)

Considérons deux blocs séparés d'une distance \( h \). On peut établir une relation entre variogramme de blocs et variogramme ponctuel :

$$
\gamma(v, v; h) = \frac{1}{v^2} \iint_v E\left[ \left(Z(x + y_1) - Z(x + h + y_2)\right)^2 \right] dy_1 dy_2
$$

En développant :

$$
\gamma(v, v; h) = \frac{1}{v^2} \iint_v \left[ \gamma(0) + \gamma(0) - 2C(y_1 - y_2 + h) \right] dy_1 dy_2
$$

où \( \gamma(v, v; h) \) est la valeur moyenne du variogramme ponctuel entre toutes les paires ayant un point dans le bloc \( v(x) \) et l’autre dans le bloc \( v(x + h) \).


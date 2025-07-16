# 7.1 Variances de blocs

On a vu précédemment l'importance de connaître la variance d'une variable aléatoire, estimée et modélisée à partir du variogramme. Jusqu’à présent, ce variogramme était calculé sur un support dit ponctuel, correspondant à la taille d'une carotte — ou considéré comme tel, dans la mesure où cette taille est négligeable par rapport à l’échelle du gisement. Nous dirons donc, sans perte de généralité, que la carotte constitue un support ponctuel.

Cependant, vous savez sans doute que le support d’exploitation réel dans une mine n’est pas une carotte, mais un bloc de taille significative (par exemple 5 m × 5 m × 5 m). Nous sommes donc confrontés à une problématique de changement de support. Notre varigramme est modéliser sur un support ponctuel, mais nos opérations sont sur un support beaucoup plus grand.

Comment la variabilité mesurée à partir du variogramme ponctuel (issu des carottes) peut-elle nous renseigner sur la variabilité des blocs réellement exploités sur le terrain ? Et comment ces différences peuvent-elles influencer nos décisions d’estimation, de planification ou de production ?

Dans ce contexte, on distingue deux notions de variances différentes et complémentaires :  

- **Variance de bloc** : décrit l’amplitude théorique des variations des teneurs de bloc pour un domaine infini. C'est l'analogue de la variance ponctuelle (palier du variogramme) pour des blocs. **🔴 Cette notion n’est définie que pour les modèles de variogramme qui atteignent un palier.**  
  Autrement dit, *sans palier, pas de variance de bloc au sens strict*.

- **Variance de dispersion** : décrit l’amplitude théorique des variations des teneurs de bloc à l’intérieur d’un domaine fini. La variance de dispersion peut s’obtenir à partir de la variance de bloc comme on le verra plus loin. **🟢 Cette notion est définie même pour les variogrammes sans palier.**

Bien maîtriser ces concepts est indispensable dans bien des domaines de la minière :

- Le calcul des réserves récupérables d’un gisement ;
- L’évaluation de l’efficacité et du rendement des piles d’homogénéisation ;  
- L’analyse de la variabilité de la production minière dans le temps ; 
- Le calcul de la variance d’estimation.

## Définitions

Soit $Z(x)$ la variable aléatoire correspondant à l'information ponctuelle. Soit $Z_v(x)$ la variable aléatoire correspondant à un bloc de taille $v$ centré en $x$.

On a :

$$
Z_v(x) = \frac{1}{v} \int_v Z(y) \, dy
$$

Cette relation exprime que la teneur d’un bloc est la moyenne des teneurs des points qui le composent.

On note $m = \mathbb{E}[Z_v(x)]$ l'espérance de la teneur du bloc $v$ dans un domaine infini. Ainsi, la variance de $Z_v(x)$ s’écrit :

$$
\mathrm{Var}(Z_v(x)) = \sigma_v^2 = \mathbb{E}\left[ \left(Z_v(x) - m \right)^2 \right] = \mathbb{E}\left[ \left( \frac{1}{v} \int_v Z(y) \, dy - m \right)^2 \right]
$$

En développant cette expression, on obtient :

$$
\sigma_v^2 = \frac{1}{v^2} \iint_v \mathbb{E}\left[ (Z(y_1) - m)(Z(y_2) - m) \right] \, dy_1 \, dy_2 = \frac{1}{v^2} \iint_v \mathrm{Cov}(Z(y_1), Z(y_2)) \, dy_1 \, dy_2
$$

Cette dernière expression indique que la variance d’un bloc $v$ est donnée par la moyenne des covariances entre toutes les paires de points à l’intérieur du bloc.  
Autrement dit, on peut calculer la variance des blocs de n'importe quelle taille si l’on connaît le variogramme des informations ponctuelles ou quasi-ponctuelles (comme les carottes). On peut même en déduire le variogramme (ou le covariogramme) des blocs.

Il est également possible d'exprimer la variance de bloc en fonction du variogramme, lorsque celui-ci atteint un palier. En utilisant la relation :

$$
C(h) = \sigma^2 - \gamma(h)
$$

on obtient :

$$
\sigma_v^2 = \sigma^2 - \frac{1}{v^2} \iint_v \gamma(y_1 - y_2) \, dy_1 \, dy_2
$$

Ainsi, si le variogramme ponctuel est connu et atteint un palier, il est alors possible de déterminer toutes les variances de blocs, quelle que soit leur taille ou leur forme (même discontinues), à partir des valeurs du variogramme (ou de la covariance) ponctuel(le) entre les points composant le bloc.


### Exemple 1 – Gisement synthétique avec modèle sphérique

La [Fig. \ref{C7_Bloc}](#C7_Bloc) présente l'évolution de la variance de blocs expérimentale d'un grand gisement, comparée à celle déduite théoriquement à partir du variogramme ponctuel. On observe une bonne adéquation entre les deux courbes. Les légères fluctuations observées sont dues à la méthode de discrétisation, qui manque de robustesse pour converger parfaitement vers la valeur théorique.

Le variogramme ponctuel utilisé correspond à un modèle sphérique isotrope de portée 15 pixels et de palier unitaire.

```{figure} images/C7_Bloc.PNG
:label: C7_Bloc
:align: center
Évolution de la variance de bloc d'un gisement ayant une fonction de covariance sphérique isotrope de palier unitaire.
```

### Exemple 2 - Gisement synthétique modèle exponentiel avec effet de pépite

La [Fig. \ref{C7_BlocBruit}](#C7_BlocBruit) montre l'évolution de la variance de blocs expérimentale d'un grand gisement, comparée à celle calculée théoriquement à partir du variogramme ponctuel. Là encore, on observe une bonne concordance entre les deux courbes. Les fluctuations sont attribuables à la méthode de discrétisation, qui n’est pas suffisamment robuste pour atteindre la valeur théorique avec précision. On remarque également que l'effet de pépite est correctement pris en compte.

Le variogramme ponctuel utilisé correspond à un modèle exponentiel isotrope de portée 50 pixels, de palier unitaire, avec un effet de pépite de 0.5.


```{figure} images/C7_BlocBruit.PNG
:label: C7_BlocBruit
:align: center
Évolution de la variance de bloc d'un gisement ayant une fonction de covariance exponentielle isotrope de palier unitaire et un effet de pépite de 0.5.
```

## Propriétés

Pour tout modèle de variogramme croissant, on observe les comportements limites suivants de la variance de bloc :

$$
\lim_{v \to 0} \sigma_v^2 = \sigma^2 \quad \text{et} \quad \lim_{v \to \infty} \sigma_v^2 = 0
$$
Autrement dit :

- Lorsque la taille du bloc tend vers zéro, la variance de bloc tend vers la variance ponctuelle $\sigma^2$.
- À l’inverse, lorsque la taille du bloc devient très grande, la moyenne des valeurs à l’intérieur du bloc se stabilise, et la variance tend vers zéro.

Ces propriétés traduisent le fait que l’agrégation spatiale agit comme un filtre de l’hétérogénéité locale : plus le bloc est grand, plus les fluctuations locales sont lissées.

---

### Variogramme de blocs

Considérons deux blocs de taille $v$, séparés par une distance $h$. On peut établir une relation entre le variogramme de blocs et le variogramme ponctuel :

$$
\gamma_v(h) = \frac{1}{v^2} \iint_v \mathbb{E}\left[ \left(Z(x + y_1) - Z(x + h + y_2)\right)^2 \right] \, dy_1 \, dy_2
$$

Cette expression représente la moyenne des écarts quadratiques entre toutes les paires de points, l’un appartenant au bloc centré en $x$, l’autre au bloc centré en $x + h$.

En développant l’espérance, on obtient :

$$
\gamma_v(h) = \frac{1}{v^2} \iint_v \left[ \gamma(0) + \gamma(0) - 2C(y_1 - y_2 + h) \right] \, dy_1 \, dy_2
$$

où $\gamma(v, v; h)$ est la valeur moyenne du variogramme ponctuel entre toutes les paires de points ayant un point dans le bloc $v(x)$ et l’autre dans le bloc $v(x + h)$.

Cette formulation permet de relier directement les propriétés spatiales des blocs à celles du champ ponctuel, et peut être utilisée pour modéliser la continuité spatiale à différentes échelles.


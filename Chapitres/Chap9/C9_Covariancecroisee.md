# 9.2 Covariance croisée et variogramme croisé

Comme vu précédemment, il faut non seulement modéliser la structure spatiale d’une variable donnée (p. ex., $\mathrm{Cov}(Z_i, Z_j)$), mais aussi la façon dont deux variables distinctes varient ensemble dans l’espace (p. ex., $\mathrm{Cov}(Z_i, Y_j)$). Nous savons déjà comment modéliser la structure d'une variable donnée. Ce qui nous manque, c’est un estimateur de cette structure spatiale croisée entre deux variables distinctes. 

Il existe deux statistiques expérimentales qui nous permettent d'estimer cette structure spatiale croisée, à savoir la covariance croisée et le variogramme croisé : ces deux fonctions décrivent la dépendance spatiale conjointe entre une variable principale $Z(\mathbf{x})$ et une variable secondaire $Y(\mathbf{x})$.

À noter qu'il existe également le pseudo-variogramme croisé, que nous n'aborderons pas dans cette lecture. Cette mesure permet de combiner les avantages de la covariance croisée et du variogramme croisé ; cependant, elle comporte des inconvénients importants et une complexité d'application accrue. Celui-ci n'est que rarement utilisé.

---

## Covariance croisée

### Définition

La covariance croisée entre deux variables régionalisées $ Z(\mathbf{x}) $ et $ Y(\mathbf{x}) $ est définie par :

$$
C_{ZY}(\mathbf{h}) = \mathrm{Cov}\big[ Z(\mathbf{x}),\, Y(\mathbf{x} + \mathbf{h}) \big] 
= \mathbb{E}\big[(Z(\mathbf{x}) - m_Z)(Y(\mathbf{x} + \mathbf{h}) - m_Y)\big]
$$

où :  
- $ \mathbf{h} $ est le vecteur de décalage (lag) partant de la variable $Z$ vers la variable $Y$,  
- $ m_Z = \mathbb{E}[Z(\mathbf{x})] $ et $ m_Y = \mathbb{E}[Y(\mathbf{x})] $ sont les moyennes (supposées constantes ou localement constantes).

Cette fonction mesure dans quelle mesure les variations de $Z$ sont corrélées à celles de $Y$ à une distance donnée $\mathbf{h}$.  
- Si $ C_{ZY}(\mathbf{h}) > 0$, les deux variables tendent à augmenter ou diminuer ensemble.  
- Si $ C_{ZY}(\mathbf{h}) < 0 $, elles varient de manière inverse (corrélation négative).  
- Si $ C_{ZY}(\mathbf{h}) = 0 $, elles sont indépendantes à cette distance.

### Propriétés

- En général, $ C_{ZY}(\mathbf{h}) \neq C_{YZ}(\mathbf{h}) $, mais sous l’hypothèse de stationnarité d’ordre deux, on a :
  $$
  C_{ZY}(\mathbf{h}) = C_{YZ}(-\mathbf{h})
  $$
  Cela signifie que la covariance croisée permet de quantifier des asymétries de corrélations. 

- La valeur à l’origine $ C_{ZY}(\mathbf{0}) $ correspond à la covariance globale entre $ Z $ et $ Y $, et peut être normalisée pour obtenir le coefficient de corrélation :
  $$
  \rho_{ZY} = \frac{C_{ZY}(\mathbf{0})}{\sqrt{C_{ZZ}(\mathbf{0})\, C_{YY}(\mathbf{0})}}
  $$

---

## Variogramme croisé

### Définition

Le variogramme croisé est défini par :  
$$
\gamma_{ZY}(\mathbf{h}) = \tfrac{1}{2}\, \mathbb{E}\big[ (Z(\mathbf{x} + \mathbf{h}) - Z(\mathbf{x}))(Y(\mathbf{x} + \mathbf{h}) - Y(\mathbf{x})) \big]
$$

### Relation avec la covariance croisée

Sous l’hypothèse de stationnarité d’ordre deux :

$$
\gamma_{ZY}(\mathbf{h}) = C_{ZY}(\mathbf{0}) - 0.5 * (C_{ZY}(\mathbf{h} + C_{ZY}(\mathbf{-h})
$$

Cette relation est directement analogue à celle du cas univarié, où $ \gamma(h) = C(0) - C(h) $.

---

## Remarques pratiques

Il est important de noter que le variogramme croisé est toujours symétrique. C’est-à-dire que nous avons toujours $\gamma_{ZY}(\mathbf{h}) = \gamma_{ZY}(-\mathbf{h})$. Ainsi, la covariance croisée ne peut être déduite du variogramme croisé que si celle-ci est symétrique ! En règle générale, la covariance croisée est plus générale que le variogramme croisé, car elle permet d’obtenir des relations non symétriques en fonction de $h$.

Une autre observation importante concerne les paires de points nécessaires au calcul de la covariance croisée, par rapport à celles nécessaires au calcul du variogramme croisé. Pour la covariance croisée, tous les points où l’une ou l’autre des variables est connue peuvent être utilisés pour en calculer la valeur. C’est-à-dire que dès qu’une paire de points $(Z(x_i), Y(x_i+h))$ existe, elle sera prise en compte dans le calcul de la covariance croisée expérimentale.

Inversement, le variogramme croisé est plus limitatif. Il requiert qu’à une coordonnée $x_i$, la variable principale et la variable secondaire soient mesurées. Il faut donc quatre observations pour calculer un variogramme croisé, soit les couples $(Z(x_i), Z(x_i+h))$ et $(Y(x_i), Y(x_i+h))$. Ainsi, les données doivent être strictement colocalisées. Toutes les données non colocalisées seront ignorées lors du calcul du variogramme croisé.

Il est important de garder en tête qu'une covariance croisée ou un variogramme croisé négatif à certaines distances est tout à fait normal : cela traduit simplement une corrélation négative entre les deux variables étudiées.

---

# Calcul expérimental de la covariance croisée et du variogramme croisé

## Définition et formulation

Pour deux variables régionalisées $Z(\mathbf{x})$ et $Y(\mathbf{x})$, mesurées aux positions $\mathbf{x}_1, \mathbf{x}_2, \ldots, \mathbf{x}_n$, on cherche à estimer expérimentalement la structure spatiale conjointe.

### Covariance croisée expérimentale

La covariance croisée expérimentale pour une distance moyenne $ h $ est donnée par :

$$
\hat{C}_{ZY}(h) = \frac{1}{N(h)} 
\sum_{i=1}^{N(h)} 
\big(Z(\mathbf{x}_i) - m_Z\big)
\big(Y(\mathbf{x}_i+\mathbf{h}) - m_Y\big)
$$

où :
- $ N(h) $ est l’ensemble des paires dont la distance appartient à la classe de distance autour de $ \mathbf{h} $,
- $m_Z$ et $m_Y$ sont les moyennes des deux variables.

---

### Variogramme croisé expérimental

De manière analogue, le variogramme croisé expérimental est défini par :

$$
\hat{\gamma}_{ZY}(h) = \frac{1}{2N(h)} 
\sum_{i=1}^{N(h)}  
\big(Z(\mathbf{x}_i) - Z(\mathbf{x}_i+\mathbf{h})\big)
\big(Y(\mathbf{x}_i) - Y(\mathbf{x}_i+\mathbf{h})\big)
$$

---

### Exemple numérique

La [Fig. %s](#C9_CovExp) présente les valeurs de $Z(x_i)$, indiquées à gauche en bleu, et celles de $Y(x_i)$, indiquées à droite en rouge. Nous allons évaluer la covariance croisée expérimentale $C_{ZY,e}$ et le variogramme croisé expérimental $\gamma_{ZY,e}$ à une distance $h=(1,0)$.

Supposons que la moyenne de $Z$ est $m_Z=6.5$ et que la moyenne de $Y$ est $m_Y=3.75$. Dans le cas de la covariance croisée expérimentale, il est possible d'identifier 6 couples de points respectant la distance et pour lesquels nous avons une observation de la variable $Z(x_i)$ ainsi qu'une observation de la variable secondaire à une distance $h$, soit en $Y(x_i+h)$. Ces couples ($Z(x_i),Y(x_i+h)$) sont les suivants : (6, 3.1) ; (5.9, 5.7) ; (7, 3.1) ; (6.3, 4.7) ; (6.5, 3.3) ; (6.8, 5.3). On obtient ainsi le calcul suivant pour la covariance croisée expérimentale : 

$$
\hat{C}_{ZY,e}(1,0) = \frac{1}{N} \sum (Z_i - m_Z)(Y_{i+h} - m_Y)
$$

$$
= \frac{1}{6} [ (6.0-6.5)(3.1-3.75)
+ (5.9-6.5)(5.7-3.75)
+ (7.0-6.5)(3.1-3.75)
+ (6.3-6.5)(4.7-3.75)
+ (6.5-6.5)(3.3-3.75)
+ (6.8-6.5)(5.3-3.75) ]
$$

$$
= \frac{1}{6} [ (−0.5)(−0.65)
+ (−0.6)(1.95)
+ (0.5)(−0.65)
+ (−0.2)(0.95)
+ (0.0)(−0.45)
+ (0.3)(1.55) ]
$$

$$
= \frac{1}{6} [ 0.325 − 1.170 − 0.325 − 0.190 + 0.000 + 0.465 ]
$$

$$
\boxed{ \hat{C}_{ZY,e}(1,0) = -0.15 }
$$

Dans le cas du variogramme croisé expérimental, il est possible d'identifier une seule paire de points, respectant la distance, pour laquelle nous avons une observation simultanée des 2 variables aux 2 points de localisation de la variable. Ce couple ($Z(x_i),Z(x_i+h)$,$Y(x_i),Y(x_i+h)$) est le suivant : (6, 5.9, 2.6, 3.1). On obtient ainsi le calcul suivant pour le variogramme croisé expérimental :

$$
\hat{\gamma}_{ZY,e}(1,0) = \frac{1}{2N} \sum (Z_i - Z_{i+h})(Y_i - Y_{i+h})
$$

$$
= \frac{1}{2(1)} [ (6.0 - 5.9)(2.6 - 3.1) ]
$$

$$
= \frac{1}{2} [ (0.1)(−0.5) ]
$$

$$
\boxed{ \hat{\gamma}_{ZY,e}(1,0) = - 0.025 }
$$

Supposons maintenant que nous voulons calculer la covariance et le variogramme croisé expérimental dans la direction $h' = (-1, 0)$. Qu'arrivera-t-il aux pairs de points identifiés ci-haut ?

Pour la covariance croisée expérimentale, nous allons avoir des paires de points complètement nouvelles. Nous cherchons maintenant des couples ($Z(x_i), Y(x_i-h')$) qui sont dans la direction inverse de la précédente. Ainsi, les nouvelles paires de points sont au nombre de 4 et sont : (5.9, 2.6) ; (5.8, 2.8) ; (7.0, 3.8) ; (6.5, 4.7). Le calcul est maintenant le suivant :

\[
\hat{C}_{ZY,e}(1,0) = \frac{1}{N} \sum (Z_i - m_Z)(Y_{i+h} - m_Y)
\]

$$
= \frac{1}{4} [ 
(5.9 - 6.5)(2.6 - 3.75)
+ (5.8 - 6.5)(2.8 - 3.75)
+ (7.0 - 6.5)(3.8 - 3.75)
+ (6.5 - 6.5)(4.7 - 3.75)
]
$$

$$
= \frac{1}{4} [
(-0.6)(-1.15)
+ (-0.7)(-0.95)
+ (0.5)(0.05)
+ (0.0)(0.95)
]
$$

$$
= \frac{1}{4} [
0.69 + 0.665 + 0.025 + 0.000
]
$$

$$
= \frac{1}{4} (1.38)
$$

$$
\boxed{ \hat{C}_{ZY,e}(-1,0) = 0.345 }
$$

Noter que $\hat{C}_{ZY,e}(-1,0)$ est positive tandis que $\hat{C}_{ZY,e}(1,0)$ est négative. Cela peut se produire avec la covariance croisée, car elle permet de capturer des asymétries.

Dans le cas du variogramme croisé expérimental, aucun changement se produit. On constate que les couples pour $h$ et $h'=-h$ sont identiques. C'est normal, car le variogramme croisé est symétrique par définition.


```{figure} images/C9_Corr.png
:label: C9_CovExp
:align: center
Exemple de données multivariables. Nuage de points des données observées et de leur corrélation.
```
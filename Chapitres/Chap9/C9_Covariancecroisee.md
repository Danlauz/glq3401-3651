# 9.2 Covariance croisée et variogramme croisé

Comme vu précédemment, il faut non seulement modéliser la structure spatiale d’une variable donnée (p. ex., \mathrm{Cov}(Z_i, Z_j)), mais aussi la façon dont deux variables distinctes varient ensemble dans l’espace (p. ex., \mathrm{Cov}(Z_i, Y_j)). Nous savons déjà comment modéliser la structure d'une variable donnée. Ce qui nous manque est un estimateur de la structure spatiale croisée entre deux variables distinteces. 

Il y a deux statistiques expérimentales qui nous permettent d'estimer cette structure spatiale croisée, à savoir la covariance croisée et le variogramme croisé : ces deux fonctions décrivent la dépendance spatiale conjointe entre une variable principale $Z(\mathbf{x})$ et une variable secondaire $Y(\mathbf{x})$.

---

## Covariance croisée

### Définition

La covariance croisée entre deux variables régionalisées \( Z(\mathbf{x}) \) et \( Y(\mathbf{x}) \) est définie par :

$$
C_{ZY}(\mathbf{h}) = \mathrm{Cov}\big[ Z(\mathbf{x}),\, Y(\mathbf{x} + \mathbf{h}) \big] 
= \mathbb{E}\big[(Z(\mathbf{x}) - m_Z)(Y(\mathbf{x} + \mathbf{h}) - m_Y)\big]
$$

où :  
- $ \mathbf{h} $ est le vecteur de décalage (lag) partant de la variable $Z(x)$ vers la variable $Y(x+h)$,  
- $ m_Z = \mathbb{E}[Z(\mathbf{x})] $ et $ m_Y = \mathbb{E}[Y(\mathbf{x})] $ sont les moyennes (supposées constantes ou localement constantes).

Cette fonction mesure dans quelle mesure les variations de $Z$ sont liées à celles de $Y$ à une distance donnée $\mathbf{h}$.  
- Si $ C_{ZY}(\mathbf{h}) > 0$, les deux variables tendent à augmenter ou diminuer ensemble.  
- Si $ C_{ZY}(\mathbf{h}) < 0 $, elles varient de façon inverse (corrélation négative).  
- Si $ C_{ZY}(\mathbf{h}) = 0 $, elles sont indépendantes à cette distance.

### Propriétés

- En général, $ C_{ZY}(\mathbf{h}) \neq C_{YZ}(\mathbf{h}) $, mais sous l’hypothèse de stationnarité d’ordre deux, on a :
  $$
  C_{ZY}(\mathbf{h}) = C_{YZ}(-\mathbf{h})
  $$
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

Il est important de noter que le variogramme croisé est toujours symétrique. C’est-à-dire que nous avons toujours $\gamma_{ZY}(\mathbf{h}) = \gamma_{ZY}(-\mathbf{h})$. Ainsi, la covariance croisée ne peut être déduite du variogramme croisé que si la covariance croisée est symétrique ! En règle générale, la covariance croisée est plus générale que le variogramme croisé, car elle permet d’obtenir des relations non symétriques en fonction de $h$.

Une autre observation importante concerne les paires de points nécessaires pour calculer la covariance croisée comparativement à celles nécessaires pour le variogramme croisé. Pour la covariance croisée, tous les points où l’une ou l’autre des variables est connue peuvent être utilisés dans le calcul de la covariance croisée. C’est-à-dire que dès qu’une paire de points $(Z(x_i), Y(x_i+h))$ existe, elle sera incluse dans le calcul de la covariance expérimentale.

Inversement, le variogramme croisé est plus limitatif. Il requiert qu’à une coordonnée $x_i$, la variable principale et la variable secondaire soient mesurées. Il faut donc quatre observations pour calculer un variogramme croisé, soit les couples $(Z(x_i), Z(x_i+h))$ et $(Y(x_i), Y(x_i+h))$. Ainsi, les données doivent absolument être colocalisées. Toutes les données non colocalisées seront ignorées dans le calcul du variogramme croisé.

Il est important de garder en tête qu'une covariance croisée ou un variogramme croisé négatif à certaines distances est tout à fait normal : cela traduit simplement une corrélation négative entre les deux variables étudiées.

---

# Calcul expérimental de la covariance croisée et du variogramme croisé

## Définition et formulation

Pour deux variables régionalisées \( Z(\mathbf{x}) \) et \( Y(\mathbf{x}) \), mesurées à des positions \(\mathbf{x}_1, \mathbf{x}_2, \ldots, \mathbf{x}_n\), on cherche à estimer expérimentalement la structure spatiale conjointe.

### Covariance croisée expérimentale

La covariance croisée expérimentale pour une distance moyenne $ h $ est donnée par :

$$
\hat{C}_{ZY}(h) = \frac{1}{N(h)} 
\sum_{(i,j)\in N(h)} 
\big(Z(\mathbf{x}_i) - m_Z\big)
\big(Y(\mathbf{x}_j) - m_Y\big)
$$

où :
- $ N(h) $ est l’ensemble des paires $(i,j)$ dont la distance $|\mathbf{x}_j - \mathbf{x}_i|$ appartient à la classe de distance autour de $ h $,
- $m_Z$ et $m_Y$ sont les moyennes des deux variables.

---

### Variogramme croisé expérimental

De manière analogue, le variogramme croisé expérimental est défini par :

\[
\hat{\gamma}_{ZY}(h) = \frac{1}{2N(h)} 
\sum_{(i,j)\in N(h)} 
\big(Z(\mathbf{x}_i) - Z(\mathbf{x}_j)\big)
\big(Y(\mathbf{x}_i) - Y(\mathbf{x}_j)\big)
\]

---

### Exemple numérique


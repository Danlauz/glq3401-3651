# 6.1 Hypothèses de base et définition

##  Variogramme

Le variogramme, noté $\gamma(h)$, est un outil géostatistique qui quantifie la dissimilarité entre des mesures en fonction de la distance $h$ qui les sépare.

Pour deux points, $x$ et $x+h$, où les teneurs sont les variables aléatoires $Z(x)$ et $Z(x+h)$, le variogramme est défini comme la demi-variance de leur différence :
$$
\gamma(h) = \frac{1}{2} \mathrm{Var}[Z(x) - Z(x + h)]
$$

Conformément au principe de continuité spatiale, la valeur du variogramme $\gamma(h)$ augmente avec la distance $h$, car la similarité entre les mesures diminue[^1]. 


Pour visualiser ce phénomène, l'atelier interactif 1 illustre comment la dissimilarité (le nuage de points) évolue lorsque le décalage $h$ augmente.

---

## Limites de l’approche complète

Dans un monde idéal, on pourrait modéliser entièrement la dépendance entre plusieurs localisations $x_1, x_2, \ldots, x_n$ à l’aide de leur distribution conjointe multivariée :

$$
F_{Z(x_1), \ldots, Z(x_n)}(z_1, \ldots, z_n)
$$

Mais en pratique, on ne dispose que d’une seule observation par point (par exemple, une seule teneur par carotte de forage de 3m). Cela rend impossible l’estimation directe d’une telle distribution. On pourrait alors envisager une hypothèse simplificatrice : supposer que le vecteur aléatoire $\mathbf{Z} = (Z(x_1), \ldots, Z(x_n))$ suit une loi normale multivariée, avec des moyennes et une matrice de covariance connues. Mais cette hypothèse est souvent trop forte pour être réaliste.

Posez-vous la question :  
Comment estimer la moyenne et la variance de chaque variable aléatoire à partir d’une seule observation de chacune des variables ? C’est un peu comme si l’on vous demandait d’estimer la taille moyenne des étudiants d’une classe... mais qu’on vous fournit une seule mesure. Comme on dit : Bonne chance !

La géostatistique adopte donc une approche plus modeste : estimer uniquement les deux premiers moments soit la moyenne et la variance-covariance des variables deux à deux. Cela nécessite cependant certaines hypothèses de régularité.

---

## Hypothèses fondamentales

Pour pouvoir estimer ces paramètres, on formule deux hypothèses statistiques **valables pour toute localisation** $x \in \mathbb{R}^d$ dans l’espace :

1. **Stationnarité de l’espérance** :  
   L’espérance mathématique da la variable aléatoire $Z(x)$ est constante dans l’espace 
   $$
   \forall x \in \mathbb{R}^d, \quad E[Z(x)] = m
   $$


   Ce qui implique également que  :
   $$
   \forall x, h \in \mathbb{R}^d, \quad E[Z(x) - Z(x + h)] = 0
   $$

2. **Stationnarité de la covariance** :  
   La covariance entre deux points ne dépend que du vecteur de décalage spatial $h$, et non des positions absolues 
   $$ 
   \forall x, h \in \mathbb{R}^d, \quad \text{Cov}(Z(x), Z(x + h)) = C(h)
   $$

Sous ces deux hypothèses, appelées **stationnarité du second ordre**, la fonction $C(h)$ est appelée covariogramme (ou fonction de covariance), et le variogramme peut être exprimé comme :

$$
\gamma(h) = \frac{1}{2} E[(Z(x + h) - Z(x))^2] = \sigma^2 - C(h)
$$

Ces hypothèses supposent une certaine homogénéité spatiale du phénomène étudié. Si des domaines géologiques très différents sont identifiables, ils doivent être modélisés séparément, chacun avec ses propres paramètres statistiques.

> 💡 **Note** : Cette relation $\gamma(h) = \sigma^2 - C(h)$ est très importante en géostatistique, mais elle suppose que le variogramme atteint une variance finie $\sigma^2$, ce qui n’est pas toujours le cas. Cette hypothèse est donc à vérifier selon le contexte géologique. Le variogramme expérimental permet d'observer et d'estimer $\sigma^2$.

---

## Définitions et propriétés du variogramme

Le **variogramme** est défini par la formule :

$$
\gamma(h) = \frac{1}{2} \, \mathrm{Var}\bigl[Z(x) - Z(x + h)\bigr] = \frac{1}{2} \, \mathbb{E}\bigl[(Z(x) - Z(x + h))^2\bigr]
$$

où $x$ et $h$ sont des vecteurs de position dans l’espace (en 1D, 2D ou 3D).

Lors de l’estimation ou de l’ajustement d’un variogramme, trois paramètres caractéristiques émergent naturellement :

1. **Effet de pépite** ($C_0$)  
   Il représente la variabilité à très courte échelle, souvent attribuée à des erreurs de mesure, des imprécisions de localisation ou des phénomènes microscopiques non observés. Cet effet se manifeste par une discontinuité à l’origine du variogramme, en $h = 0$.

2. **Palier** ($\sigma^2 = C_0 + \sum_i C_i$)  
   Il correspond à la variance totale de la variable aléatoire. Le palier est constitué de l’effet de pépite $C_0$ et de la somme des variances $C_i$ associées aux différentes structures spatiales modélisées. Il reflète les écarts moyens maximaux entre deux observations éloignées.

3. **Portée** ($a$)  
   C’est la distance au-delà de laquelle deux observations ne présentent plus de dépendance spatiale significative. À partir de cette distance, la covariance devient nulle ($C(h) = 0$) et les valeurs sont considérées comme indépendantes en moyenne. Le variogramme atteint alors le palier : $\gamma(h) = \sigma^2 \quad \text{si} \quad h \geq a$.


À la [Fig. %s](#C6_Variogramme), vous pouvez observer les trois paramètres dans une situation avec deux composantes : un effet de pépite $C_0 = 2.1$, visible par la discontinuité à l’origine, et un modèle sphérique de variance $C_1 = 16.9$ et de portée $a = 20$. Le palier est alors donné par $\sigma^2 = C_0 + C_1 = 2.1 + 16.9 = 19 $.

Dans cet exemple, la courbe bleue correspond au modèle théorique du variogramme, tandis que les croix noires représentent les points du variogramme expérimental, obtenus à partir des données. Ces deux notions seront approfondies dans les prochaines sections.

```{figure} images/C6_Variogramme.PNG
:label: C6_Variogramme
:align: center
Illustration des paramètres du variogramme - effet de pépite, palier et portée.
```

## Notes techniques

Lorsque $h = 0$, les deux points sont identiques, donc :

$$
\gamma(0) = \frac{1}{2} \text{Var}(Z(x) - Z(x)) = 0
$$

Mais le variogramme peut présenter une discontinuité à l’origine :

$$
\lim_{h \to 0^+} \gamma(h) = C_0 > 0
$$

Cette discontinuité reflète l’effet de pépite. Cette variabilité peut provenir de phénomènes naturels, comme la présence de petites poches riches en minéraux, ou d’incertitudes liées à l’échantillonnage et à l’analyse (par exemple, des erreurs de mesure ou des hétérogénéités à l’échelle des échantillons).

De plus, le variogramme est souvent préféré à la covariance en géostatistique pour deux raisons principales : 1) le variogramme ne dépend pas de la moyenne $m$. En effet, pour estimer une covariance, la connaissance ou l’estimation préalable de cette moyenne est nécessaire, ce qui n’est pas le cas du variogramme et 2) le variogramme reste défini même en l'absence de palier. 

---

## Exemples géologiques

Chaque type de gisement a un comportement spatial qui se reflète dans son variogramme :

- **Gisement d’or** : fort effet de pépite, faible structure, variogramme erratique.
- **Cuivre porphyrique** : variogramme plus lisse, structure importante, faible effet de pépite.
- **Gisements sédimentaires de fer** : anisotropie marquée (structure plus grande selon les couches).
- **Topographie** : très grande continuité, variogramme parabolique à l’origine, effet de pépite quasi nulle.

---
[^1]: C'est généralement le cas, mais il existe des modèles où ce principe de continuité simple ne s'applique pas, notamment avec des phénomènes périodiques. Un excellent exemple est la variation journalière de la température. La température mesurée à un instant donné est fortement corrélée à celle mesurée 24 heures plus tard, même si elle est très différente de celle mesurée 12 heures plus tard. Dans ce contexte, la corrélation ne diminue pas de façon continue avec le temps (la "distance"). Elle augmente et diminue de manière cyclique, créant ce qu'on appelle un effet de trou ou une périodicité dans le variogramme.
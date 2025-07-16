# 6.1 Hypothèses de base et définition

## Origine du variogramme

Considérons deux points distincts $x$ et $x + h$ séparés par une distance $h$. Les teneurs mesurées à ces deux emplacements sont des variables aléatoires notées respectivement $Z(x)$ et $Z(x + h)$. On s'intéresse alors à leur différence :

$$
Z(x) - Z(x + h)
$$

Cette différence est aussi une variable aléatoire, dont la variance tend à être plus faible lorsque les deux points sont rapprochés, et plus élevée lorsqu’ils sont éloignés. C’est le principe fondamental de continuité spatiale. Le **variogramme** quantifie précisément cette variation de la dissimilarité en fonction de la distance. :

$$
\gamma(h) = \frac{1}{2} \mathrm{Var}[Z(x) - Z(x + h)]
$$

La fonction $\gamma(h)$ est généralement croissante avec $h$, car la similarité entre les valeurs diminue avec la distance. C’est un outil central pour décrire la **continuité spatiale** dans un gisement. 

Pour mieux visualiser ce phénomène, nous vous invitons à consulter l’atelier interactif 1, qui illustre concrètement comment la dissimilarité évolue avec la distance. Allez y jeter un coup d'œil — cela vous aidera à mieux conceptualiser cette notion essentielle. Pour le moment, faite augmenter que le décalage $h$ entre les pairs de point et observer comment le nuage de point se comporte.

---

## Limites de l’approche complète

Dans un monde idéal, on pourrait modéliser entièrement la dépendance entre plusieurs localisations $x_1, x_2, \ldots, x_n$ à l’aide de leur distribution conjointe multivariée :

$$
F_{Z(x_1), \ldots, Z(x_n)}(z_1, \ldots, z_n)
$$

Mais en pratique, on ne dispose que **d’une seule observation par point** (par exemple, une seule teneur par carotte de forage). Cela rend impossible l’estimation directe d’une telle distribution. On pourrait alors envisager une hypothèse simplificatrice : supposer que le vecteur aléatoire  
$\mathbf{Z} = (Z(x_1), \ldots, Z(x_n))$ suit une loi normale multivariée, avec des moyennes et une matrice de covariance connues. Mais cette hypothèse est souvent trop forte pour être réaliste.

Posez-vous la question :  
Comment estimer la moyenne et la variance de chaque variable aléatoire à partir d’une seule observation de chacune des variables ?

C’est un peu comme si l’on vous demandait d’estimer la taille moyenne des étudiants d’une classe... mais qu’on vous fournit une seule mesure. Comme on dit : Bonne chance !

La géostatistique adopte donc une approche plus modeste : estimer uniquement les deux premiers moments (moyenne, variance, covariance) des variables deux à deux. Cela nécessite cependant certaines hypothèses de régularité.

---

## Hypothèses fondamentales

Pour pouvoir estimer ces paramètres, on formule deux hypothèses statistiques :

1. **Stationnarité de l’espérance** :  
   L’espérance mathématique est constante dans l’espace :
   $$
   E[Z(x)] = m
   $$

   Ce qui implique aussi que  :
   $$
   E[Z(x) - Z(x + h)] = 0
   $$

2. **Stationnarité de la covariance** :  
   La covariance entre deux points dépend uniquement du décalage spatial $h$ :
   $$
   \text{Cov}(Z(x), Z(x + h)) = C(h)
   $$

Sous ces hypothèses, appelées **stationnarité du second ordre**, la fonction $C(h)$ est appelée covariogramme, et le variogramme peut être exprimé comme :

$$
\gamma(h) = \sigma^2 - C(h)
$$

Ces hypothèses supposent une certaine homogénéité du gisement. Si des domaines géologiques très différents sont identifiables, ils doivent être traités séparément.

---

## Définitions et propriétés du variogramme

Le **variogramme** est défini par la formule :

$$
\gamma(h) = \frac{1}{2} \, \mathrm{Var}\bigl(Z(x) - Z(x + h)\bigr) = \frac{1}{2} \, \mathbb{E}\bigl[(Z(x) - Z(x + h))^2\bigr]
$$

où $x$ et $h$ sont des vecteurs de position dans l’espace (en 1D, 2D ou 3D).

Cette fonction, généralement croissante avec la distance $h$, décrit la **dépendance spatiale** entre les valeurs mesurées et constitue un outil central pour quantifier la **continuité géologique**. Lorsqu’on estime ou ajuste un variogramme, trois paramètres caractéristiques émergent naturellement :


1. L'**effet de pépite** ($C_0$) :  
   C’est la variabilité à très courte échelle, qui peut être due à des erreurs de localisation, des erreurs d’analyse ou des limites de précision analytique. Cet effet provoque une discontinuité à l’origine du variogramme en $h=0$.

2. Le **palier** ($\sigma^2 = C_0 + \sum_i C_i$) :  
   C’est la variance totale de la variable aléatoire. Il est constitué de l’effet de pépite, $C_0$, et de la somme des variances, $C_i$, associées aux différentes structures spatiales modélisées. Le palier correspond aux écarts moyens les plus importants entre deux observations.

3. La **portée** ($a$) :  
   C’est la distance au-delà de laquelle deux observations n’ont plus de dépendance linéaire : la covariance devient nulle $C(h) = 0$ et les valeurs sont considérées comme **indépendantes** en moyenne. À cette distance, le variogramme atteint une valeur égale à la **variance totale** de la variable aléatoire ($\gamma(h) = \sigma^2 \quad \text{si} \quad h \geq a$).


À la [Fig. %s](#C6_Variogramme), vous pouvez observer les trois paramètres dans une situation avec deux composantes : un effet de pépite $C_0 = 2.1$, visible par la discontinuité à l’origine, et un modèle sphérique de variance $C_1 = 16.9$ et de portée $a = 20$. Le palier est alors donné par $\sigma^2 = C_0 + C_1 = 2.1 + 16.9 = 19 $.

Dans cet exemple, la courbe bleue correspond au modèle théorique du variogramme, tandis que les croix noires représentent les points du variogramme expérimental, obtenus à partir des données. Ces deux notions seront approfondies dans les prochaines sections.

```{figure} images/C6_Variogramme.PNG
:label: C6_Variogramme
:align: center
Illustration des paramètres du variogramme : effet de pépite, palier et portée.
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

Cette discontinuité reflète l’effet de pépite. Cette variabilité peut provenir de phénomènes naturels, comme la présence de petites poches riches en minéraux, ou d’incertitudes liées à l’échantillonnage et à l’analyse (par exemple, des erreurs de mesure ou des hétérogénéités à l’échelle des échantillons). Nous en discuterons plus en détail dans la prochaine section.

De plus, le variogramme est souvent préféré à la covariance en géostatistique pour deux raisons principales : 1) il ne dépend pas de la moyenne $m$. En effet, pour estimer une covariance, la connaissance ou l’estimation préalable de cette moyenne est nécessaire, ce qui n’est pas le cas du variogramme et 2) il reste défini même en l'absence de palier. 

---

## Exemples géologiques

Chaque type de gisement a un comportement spatial qui se reflète dans son variogramme :

- **Gisement d’or** : fort effet de pépite, faible structure, variogramme erratique.
- **Cuivre porphyrique** : variogramme plus lisse, structure importante, faible effet de pépite.
- **Gisements sédimentaires de fer** : anisotropie marquée (structure plus grande selon les couches).
- **Topographie** : très grande continuité, variogramme parabolique à l’origine, effet de pépite quasi nulle.


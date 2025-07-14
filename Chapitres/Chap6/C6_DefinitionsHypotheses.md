# 6.1 Hypothèses de base et définition

En géostatistique, on fait généralement deux hypothèses fondamentales.

Premièrement, on suppose que **l'espérance mathématique est constante dans l'espace**, c'est-à-dire qu'elle ne dépend pas de la position \\(x\\). Formellement, on écrit :

$$
E[Z(x)] = m
$$

De manière équivalente, cela signifie que l'espérance des écarts entre deux points est nulle :

$$
E[Z(x) - Z(x+h)] = 0
$$

Deuxièmement, on suppose que **la covariance entre deux observations ne dépend que de la distance qui les sépare** (et éventuellement de la direction), mais pas de leur localisation absolue :

$$
\text{Cov}(Z(x), Z(x+h)) = C(h)
$$

Cette hypothèse correspond à la **stationnarité du second ordre**. La fonction \\(C(h)\\) qui mesure cette dépendance est appelée la **fonction de covariance**, ou **covariogramme**.

De façon légèrement moins restrictive, on peut également poser que la **demi-variance** entre deux points dépend uniquement de la distance \\(h\\), et non de la position absolue \\(x\\). C’est l’**hypothèse intrinsèque**, qui mène à la définition du **variogramme** :

$$
\gamma(h) = \frac{1}{2} \text{Var}(Z(x) - Z(x+h))
$$

Ces hypothèses supposent une certaine régularité et homogénéité du gisement. Si des zones géologiquement très différentes sont identifiables, il est recommandé de les analyser séparément.

---

Le variogramme est la fonction la plus utilisée en géostatistique pour décrire la continuité spatiale de la minéralisation. Cela tient à sa facilité d'estimation (contrairement à la covariance, qui nécessite une estimation préalable de l'espérance) et à sa validité même dans des situations où la variance n'est pas définie.

Le variogramme théorique est donné par la formule suivante :

$$
\gamma(h) = \frac{1}{2} \text{Var}(Z(x) - Z(x+h))
$$

où \\(x\\) est un vecteur de coordonnées (en 1D, 2D ou 3D), et \\(h\\) est le vecteur distance entre deux positions.

---

Cette fonction est généralement croissante avec la distance \\(h\\), et elle résume des informations essentielles sur la relation spatiale entre les observations. Pour les modèles qui atteignent un seuil, le variogramme met en évidence trois paramètres caractéristiques :

La **portée** \\(a\\) désigne la distance au-delà de laquelle deux observations n'ont plus de relation linéaire : leur covariance devient nulle. À cette distance, le variogramme atteint une valeur égale à la variance totale de la variable aléatoire.

Le **palier** \\(\sigma^2 = C_0 + C\\) représente la **variance totale** de la variable. Il correspond aux écarts maximaux, en moyenne, entre deux observations.

L’**effet de pépite** \\(C_0\\), enfin, reflète la variabilité à très petite échelle, ainsi que les incertitudes liées à l’échantillonnage ou à l’analyse. Par exemple, si une carotte est fendue en deux et que chaque moitié est analysée indépendamment, les résultats peuvent différer légèrement. De même, deux analyses faites sur le même échantillon de poudre ne donnent pas nécessairement des valeurs identiques.

---

## Notes

Lorsque la distance entre deux points est nulle (\\(h = 0\\)), la variance de leur différence est évidemment nulle :

$$
\gamma(0) = \frac{1}{2} \text{Var}(Z(x) - Z(x)) = 0
$$

Mais le variogramme peut présenter une discontinuité à l’origine :

$$
\lim_{h \to 0^+} \gamma(h) = C_0 > 0
$$

Il arrive également que certains variogrammes ne montrent pas de palier ; dans ce cas, ni la covariance ni la variance ne sont définies.

Lorsque le variogramme atteint un palier, il est possible d’établir une relation simple avec la covariance :

$$
\gamma(h) = \frac{1}{2} \left[ \text{Var}(Z(x)) + \text{Var}(Z(x+h)) - 2 \cdot \text{Cov}(Z(x), Z(x+h)) \right]
$$

ce qui revient à écrire :

$$
\gamma(h) = \sigma^2 - C(h)
$$

et inversement :

$$
C(h) = \sigma^2 - \gamma(h)
$$

La fonction \\(C(h)\\), appelée **covariogramme**, est donc directement liée au variogramme, et cette relation est omniprésente dans les calculs géostatistiques.

On observe qu’à partir de la portée \\(a\\), la covariance devient nulle, ce qui signifie :

$$
C(h) = 0 \quad \text{si } h \geq a
$$

Lorsque le variogramme atteint un palier, les deux fonctions – variogramme et covariogramme – fournissent la même information sur le comportement spatial des données.

---

## Avantages du variogramme sur le covariogramme

Le variogramme présente deux avantages majeurs :  

- Il reste défini même en l'absence de palier (contrairement à la covariance).  
- Il ne dépend pas de la moyenne \\(m\\), ce qui évite de devoir l’estimer au préalable.

---

## Exemples géologiques

Chaque type de gisement possède un variogramme qui lui est propre.

Un **gisement d’or**, par exemple, présentera souvent un variogramme erratique, avec un **fort effet de pépite** et une **faible portée**.

Un **gisement de cuivre porphyrique**, au contraire, affichera un variogramme plus **linéaire à l’origine**, avec un **faible effet de pépite** et une **grande portée**.

Les **gisements sédimentaires de fer** montreront une anisotropie, avec une portée plus longue **parallèlement** à la stratification qu’**orthogonalement** à celle-ci.

Enfin, la **topographie** est un exemple de phénomène très continu, avec un variogramme **parabolique à l’origine** et une **quasi-absence d’effet de pépite**.

---

Le **variogramme** est donc un outil descriptif particulièrement puissant, utilisé dans une grande variété de domaines au-delà de la géostatistique minière.

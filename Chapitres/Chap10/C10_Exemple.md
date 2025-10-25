# 10.2 Exemple de calcul

Soit une configuration de valeurs observées $Z_1$ à $Z_4$, et on désire effectuer le krigeage d’indicatrices (KI) au point $x_0$ situé au centre du rectangle formé par $x_1, x_2, x_3, x_4$ :

|        |        |       |
|--------|--------|-------|
| $Z_1=2.2$ |        | $Z_2=5.1$ |
|        | $x_0$  |       |
| $Z_3=6.4$ |        | $Z_4=4.7$ |


Supposons que l'on choisit les seuils aux valeurs $1, 2, 3, 4, 5, 6, 7$.  
Par symétrie, le krigeage ordinaire fournit les poids $\lambda_{i,c} = \frac{1}{4}$ pour tout $i$ et pour tout seuil $c$.  
Pour d'autres configurations, ce ne serait pas le cas et il faudrait effectuer le krigeage avec le modèle de variogramme retenu pour chaque seuil.

| $c$ | $I(x_1,c)$ | $I(x_2,c)$ | $I(x_3,c)$ | $I(x_4,c)$ | $I^*(x_0,c)$ |
|------|------------|------------|------------|------------|--------------|
| 1    | 0          | 0          | 0          | 0          | 0            |
| 2    | 0          | 0          | 0          | 0          | 0            |
| 3    | 1          | 0          | 0          | 0          | 1/4          |
| 4    | 1          | 0          | 0          | 0          | 1/4          |
| 5    | 1          | 0          | 0          | 1          | 1/2          |
| 6    | 1          | 1          | 0          | 1          | 3/4          |
| 7    | 1          | 1          | 1          | 1          | 1            |

---

### 1. Quelle est la probabilité qu'au point $x_0$ la valeur $Z$ soit supérieure à 3.5, à 4.3?

$$
\begin{aligned}
P(Z_0 > 3.5) &= 1 - 0.25 = 0.75, \\
P(Z_0 > 4.3) &= 1 - \left[0.25 + \frac{0.3}{1} \times (0.5 - 0.25) \right] = 0.675,
\end{aligned}
$$

(interpolation linéaire entre les seuils 4 et 5).

---

### 2. Quelle est la médiane de la distribution au point $x_0$ ? Quelle est la valeur correspondant au 65ᵉ percentile ?

$$
\text{médiane} = 5,
$$
$$
65^{\text{e}} \text{ percentile} = 5 + \frac{0.65 - 0.5}{0.75 - 0.5} \times (6 - 5) = 5.6,
$$

(interpolation linéaire entre les percentiles 50% et 75%).

---

### 3. Quelle est l'espérance mathématique de $Z$ au point $x_0$ ?

Le résultat du KI donne les probabilités d'appartenance aux différentes classes définies par les seuils.  
Pour calculer une espérance mathématique, il faut associer une valeur représentative à chaque classe. Cette valeur peut être obtenue par l'histogramme global initial en calculant la moyenne des observations dans chaque classe, ou plus simplement en prenant le milieu de chaque classe :

$$
\mathbb{E}_{KI}[Z_0] = 0 \times 0.5 + 0 \times 1.5 + 0.25 \times 2.5 + 0 \times 3.5 + 0.25 \times 4.5 + 0.25 \times 5.5 + 0.25 \times 6.5 = 4.75.
$$

---

### Notes :

- Cet estimateur est sans biais pour $Z_0$ car $I^*(x_0,c)$ (et donc $F_{KI}(x_0,c)$) est sans biais pour $I(x_0,c)$.  
Cela signifie qu'en moyenne, les erreurs d'estimation sont nulles car la fonction de distribution estimée par KI coïncide avec la fonction de distribution réelle de $Z(x)$.  
- L'estimé par krigeage ordinaire au point $x_0$ serait :  
$$
\frac{1}{4} (2.2 + 5.1 + 6.4 + 4.7) = 4.6.
$$
- Dans la pratique, les probabilités pour la dernière classe ne sont pas toujours nulles. Il est difficile de sélectionner une valeur représentative pour cette classe (semi-ouverte). Un choix arbitraire doit être fait, ce qui peut influencer l'espérance. Une possibilité est d'ajuster la valeur pour que la moyenne des espérances calculées par KI coïncide avec la moyenne des valeurs krigées. Une autre est de prendre la moyenne des données originales dans cette classe.

---

### 4. Supposons que l'on connaisse une fonction de coût associée aux valeurs de $Z$, par exemple un coût de décontamination croissant avec $Z$, $C(z) = z^2$. Quelle est l'espérance du coût ?

On a :
$$
\mathbb{E}[C(Z_0)] = \sum_{i=1}^{n_c} \left[ I^*(x_0, z_i) - I^*(x_0, z_{i-1}) \right] C(z_i),
$$

où $n_c$ est le nombre de seuils considérés, $I^*(x_0,z_i)$ la valeur krigée pour le seuil $z_i$ (avec $I^*(x_0,z_0)=0$ et $I^*(x_0,z_{n_c+1})=1$), et $z_i$ une valeur représentative de la classe $i$ (centre de la classe ou moyenne de l'histogramme global).  

Ici, avec $I^*(x,c) = \frac{1}{4}$ pour $2 < z < 3$ et $4 < z < 7$, 0 ailleurs, l'espérance du coût est donc :

$$
\frac{1}{4} \times (2.5^2 + 4.5^2 + 5.5^2 + 6.5^2) = 24.8.
$$

---

### 5. Quelle est la variance d'estimation si l'on estime $Z_0$ par l'espérance trouvée en 3 ?

$$
\text{Var}_{estimation} = \mathbb{E}[C(Z_0)] - \mathbb{E}_{KI}[Z_0]^2 = 24.8 - 4.75^2 = 2.24.
$$

Note : la variance d'estimation ici est indépendante des variogrammes choisis pour les indicatrices en raison de la symétrie et du fait qu'un krigeage ordinaire a été utilisé. Ce résultat, étonnant et contraire aux attentes, peut être évité en utilisant un krigeage simple pour estimer chaque indicatrice.

---

### Recommandation

Pour estimer $I^*(x,c)$, il est recommandé d'effectuer un krigeage simple, c’est-à-dire :

$$
I^*(x,c) = \sum_{i=1}^n \lambda_i I(x_i, c),
$$

où les poids $\lambda_i$ sont obtenus en résolvant le système de krigeage simple (KS). Il faut répéter le processus pour chaque seuil considéré. Un variogramme des indicatrices doit être calculé pour chaque seuil afin de construire la matrice de covariances.

Note : dans le cas du KI simple, si le variogramme est un effet de pépite pur, les poids seront nuls et la fonction de distribution locale sera estimée par la fonction globale.

---




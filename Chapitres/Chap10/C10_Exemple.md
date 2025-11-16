# 10.2 Exemple de calcul

On considère quatre valeurs observées $Z_1,\ldots,Z_4$ aux positions $x_1,\ldots,x_4$, formant un rectangle. On souhaite effectuer un krigeage d’indicatrices (KI) au point $x_0$, situé au centre de ce rectangle :

|                |        |               |
|----------------|--------|---------------|
| $Z_1=2.2$      |        | $Z_2=5.1$     |
|                | $x_0$  |               |
| $Z_3=6.4$      |        | $Z_4=4.7$     |

On choisit les seuils $c = 1, 2, 3, 4, 5, 6, 7$.  

Par symétrie, le krigeage ordinaire fournit les poids :
$$
\lambda_{i,c} = \frac{1}{4}, \quad \forall i, \forall c.
$$

Pour chaque seuil $c$, les indicatrices sont définies par :

$$
I(x_i,c) =
\begin{cases}
1, & Z(x_i) \le c, \\
0, & Z(x_i) > c.
\end{cases}
$$

Le krigeage d’indicatrices donne :

$$
I^*(x_0,c) = \sum_{i=1}^4 \lambda_{i,c} \, I(x_i,c).
$$

La table suivante résume les valeurs obtenues :

| $c$ | $I(x_1,c)$ | $I(x_2,c)$ | $I(x_3,c)$ | $I(x_4,c)$ | $I^*(x_0,c)$ |
|------|------------|------------|------------|------------|--------------|
| 1    | 0          | 0          | 0          | 0          | 0            |
| 2    | 0          | 0          | 0          | 0          | 0            |
| 3    | 1          | 0          | 0          | 0          | 1/4          |
| 4    | 1          | 0          | 0          | 0          | 1/4          |
| 5    | 1          | 0          | 0          | 1          | 1/2          |
| 6    | 1          | 1          | 0          | 1          | 3/4          |
| 7    | 1          | 1          | 1          | 1          | 1            |

Cette table constitue une approximation discrète de la fonction de répartition conditionnelle :

$$
F_{KI}(x_0,c) \approx P(Z(x_0) \le c).
$$

La [Fig. %s](#C10_KI) présente le tableau sous forme de graphique. On y observe la fonction de répartition discrète ainsi estimée. À partir de ce graphique, il est ensuite possible de calculer plusieurs grandeurs, comme illustré ci-dessous.

```{figure} images/C10_KI.png
:label: C10_KI
:align: center
Fonction de répartition estimée au point $x_0$.
``` 

---

### 1. Quelle est la probabilité qu'au point $x_0$ la valeur $Z$ soit supérieure à 3.5, à 4.3?

Formule générale :

$$
P(Z_0 > c) = 1 - F_{KI}(x_0,c).
$$

#### Pour $c = 3.5$

$$
F_{KI}(x_0,3) = 0.25, \quad F_{KI}(x_0,4) = 0.25,
$$

$$
P(Z_0 > 3.5) = 1 - 0.25 = 0.75.
$$

#### Pour $c = 4.3$
Interpolation linéaire entre 4 et 5 :

$$
F_{KI}(x_0,4.3)
= F_{KI}(x_0,4)
+ \frac{4.3 - 4}{5 - 4} \left( F_{KI}(x_0,5) - F_{KI}(x_0,4) \right)
$$

$$
= 0.25 + 0.3(0.50 - 0.25)
= 0.25 + 0.075 = 0.325.
$$

Donc :

$$
P(Z_0 > 4.3) = 1 - 0.325 = 0.675.
$$

---

### 2. Quelle est la médiane de la distribution au point $x_0$ ? Quelle est la valeur correspondant au 65ᵉ percentile ?

La médiane $m$ satisfait :

$$
F_{KI}(x_0,m) = 0.5.
$$

Comme $F_{KI}(x_0,5)=0.5$ :

$$
\text{médiane} = 5.
$$


Pour le 65e percentile, on cherche $z$ tel que :

$$
F_{KI}(x_0,z) = 0.65.
$$

On constate que cela se produit entre les seuils 5 et 6. Ainsi, on doit faire l'interpolation linéaire pour retrouver le seuil correspondant au 65ᵉ percentile :

$$
z = 5 + \frac{0.65 - 0.50}{0.75 - 0.50} (6 - 5)
= 5.6.
$$.

---

### 3. Quelle est l'espérance mathématique de $Z$ au point $x_0$ ?

Le KI fournit une distribution discrète sous la forme d’une probabilité d’appartenance aux classes définies par des seuils. Pour obtenir l’espérance mathématique, on associe à chaque classe une valeur représentative. Celle-ci peut provenir de l’histogramme global (moyenne des observations dans chaque intervalle) ou, plus simplement, être prise comme le milieu de la classe.

L’espérance estimée s’écrit alors :

$$
\mathbb{E}_{KI}[Z_0] = \sum_{k=1}^{7} p_k\, m_k.
$$

En utilisant les milieux de classes $m_k$ et les probabilités $p_k$ issues du KI, on obtient l'espérance conditionnelle au point $x_0$ par :

$$
\mathbb{E}_{KI}[Z_0]
= 0\cdot 0.5
+ 0\cdot 1.5
+ 0.25\cdot 2.5
+ 0\cdot 3.5
+ 0.25\cdot 4.5
+ 0.25\cdot 5.5
+ 0.25\cdot 6.5
= 4.75.
$$

### Notes :

- Cet estimateur est sans biais pour $Z_0$ car $I^*(x_0,c)$ (et donc $F_{KI}(x_0,c)$) est sans biais pour $I(x_0,c)$. Cela signifie qu'en moyenne, les erreurs d'estimation sont nulles, car la fonction de répartition estimée par KI coïncide avec la fonction de répartition réelle de $Z(x)$.  

- On observe aussi que lL'estimé par krigeage ordinaire au point $x_0$ serait :  
$$
\frac{1}{4} (2.2 + 5.1 + 6.4 + 4.7) = 4.6.
$$

- Dans la pratique, les probabilités pour la dernière classe ne sont pas toujours nulles. Il est difficile de sélectionner une valeur représentative pour cette classe (semi-ouverte). Un choix arbitraire doit être fait, ce qui peut influencer l'espérance. Une possibilité est d'ajuster la valeur pour que la moyenne des espérances calculées par KI coïncide avec la moyenne des valeurs krigées. Une autre est de prendre la moyenne des données originales dans cette classe.

---

### 4. Quelle est la variance conditionnelle de $Z$ au point $x_0$ ?

La variance conditionnelle peut être calculée directement à partir de la fonction de répartition discrète estimée par le KI.  
On utilise la formule classique :

$$
\mathrm{Var}_{KI}[Z_0]
= \mathbb{E}[Z_0^2] - \left( \mathbb{E}[Z_0] \right)^2.
$$

Pour cela, il faut d’abord calculer l’espérance du carré :

$$
\mathbb{E}_{KI}[Z_0^2] = \sum_{k=1}^{7} p_k\, m_k^2.
$$

Les milieux de classes et probabilités non nulles sont :

| Intervalle | $m_k$ | $p_k$ |
|------------|-------|--------|
| [3,4)      | 2.5   | 0.25   |
| [4,5)      | 4.5   | 0.25   |
| [5,6)      | 5.5   | 0.25   |
| [6,7)      | 6.5   | 0.25   |

On calcule donc :

$$
\mathbb{E}_{KI}[Z_0^2]
= 0.25(2.5^2)
+ 0.25(4.5^2)
+ 0.25(5.5^2)
+ 0.25(6.5^2).
= 24.75.
$$

L’espérance déjà obtenue est :

$$
\mathbb{E}_{KI}[Z_0] = 4.75.
$$

Ainsi, la variance conditionnelle estimée est :

$$
\mathrm{Var}_{KI}[Z_0]
= 24.75 - (4.75)^2.
= 24.75 - 22.5625
= 2.1875.
$$

---

### 5. Supposons que l'on connaisse une fonction de coût associée aux valeurs de $Z(x)$ (par exemple un coût de décontamination qui augmente en fonction du niveau de contamination). Quelle est l'espérance du coût si $C(Z) = Z(x)^2$ ?

On a :
$$
\mathbb{E}[C(Z_0)] = \sum_{i=0}^{n_c} \left[ I^*(x_0, z_i) - I^*(x_0, z_{i-1}) \right] C(z_i),
$$

où $n_c$ est le nombre de seuils considérés, $I^*(x_0,z_i)$ la valeur krigée pour le seuil $z_i$ (avec $I^*(x_0,z_0)=0$ et $I^*(x_0,z_{n_c+1})=1$), et $z_i$ une valeur représentative de la classe $i$ (centre de la classe ou moyenne de l'histogramme global).  

Ici, avec $I^*(x,c) = \frac{1}{4}$ pour $2 < z < 3$ et $4 < z < 7$, 0 ailleurs, l'espérance du coût est donc :

$$
\frac{1}{4} \times (2.5^2 + 4.5^2 + 5.5^2 + 6.5^2) = 24.8.
$$

---

### Recommandation

Pour estimer $I^*(x,c)$, il est recommandé d'effectuer un krigeage simple, c’est-à-dire :

$$
I^*(x,c) = \sum_{i=1}^n \lambda_i I(x_i, c) + (1 - \sum_{i=1}^n \lambda_i) F_Z(c),
$$

où $F_Z(c)$ est la proportion, parmi l'ensemble des échantillons, inférieure à $c$ (i.e. la fonction de répartition évaluée à "c"). Les poids $\lambda_i$ sont obtenus en résolvant le système de krigeage simple (KS). On doit répéter le processus pour chacun des seuils considérés. Pour chaque seuil, un variogramme d'indicatrices doit être calculé afin de déterminer les covariances dans le système précédent.

Dans le cas d’un KI simple, si le variogramme est un effet de pépite pur, les poids seront nuls et la fonction de répartition locale sera estimée à partir de la fonction de répartition globale. Si le variogramme montre une forte continuité spatiale, alors les poids tendront, dans l'exemple, vers 0.25, et les 2 krigeages d'indicatrices fourniront des résultats semblables.

---




# 7.2 Variance de dispersion

La variance de bloc permet de calculer la variance théorique de la teneur de bloc dans un domaine d’extension infinie. Bien sûr, les gisements ne sont jamais infinis, et il est souhaitable de pouvoir prévoir l’amplitude des variations des teneurs de bloc pour un domaine fini correspondant au gisement ou à une partie du gisement.

Considérons un grand bloc $V_j$ découpé en petits blocs $v_i$. On a bien sûr :

$$
Z(V_j) = \frac{1}{n} \sum_{i=1}^n Z(v_i)
$$

Cela signifie que la teneur d’un grand bloc $V_j$ à une localisation centré en $x_j$ est la moyenne des teneurs des petits blocs $v_i$ qui le composent.

On peut vouloir déterminer l'importance de la variation des blocs $v_i$ à l'intérieur de $V_j$, en moyenne pour l'ensemble des blocs $V$. C'est ce que l'on appelle **la variance de dispersion de $v$ dans $V$**, notée $D^2(v|V)$.

Soit la variance échantillonnale pour un bloc $V_j$ :

$$
s^2_{v|V_j} = \frac{1}{n} \sum_{i=1}^n \left( Z(v_i) - Z(V_j) \right)^2
$$

Cela signifie que l’on calcule la variance des teneurs des petits blocs $v_i$ contenus dans le grand bloc $V_j$, en supposant que la moyenne est la teneur moyenne du bloc $V_j$. Cependant, comme il existe plusieurs blocs $V_j$ dans le gisement, on introduit la notion de variance de dispersion, définie comme l’espérance de cette variance échantillonnale sur l’ensemble des blocs du gisement.

$$
D^2(v|V) = E\left[ s^2_{v|V_j} \right] = E\left[ \frac{1}{n} \sum_{i=1}^n \left( Z(v_i) - Z(V_j) \right)^2 \right]
$$

> 💡 **Variance de dispersion — Démonstration complète**
>
 Soit un bloc \( V_j \) composé de \( n \) sous-blocs \( v_i \). La variance échantillonnale est définie
 \[ 
   s^2_{v|V_j} = \frac{1}{n} \sum_{i=1}^n \left( Z(v_i) - Z(V_j) \right)^2
 \]

 où \( Z(V_j) = \frac{1}{n} \sum_{i=1}^n Z(v_i) \) est la moyenne des teneurs dans le bloc.

 Développons le carré :

 \[
 \left( Z(v_i) - Z(V_j) \right)^2 = Z(v_i)^2 - 2Z(v_i)Z(V_j) + Z(V_j)^2
 \]

 En remplaçant dans la somme :

 \[
 s^2_{v|V_j} = \frac{1}{n} \sum_{i=1}^n Z(v_i)^2 - Z(V_j)^2
 \]

 On rappel, la variance de dispersion est l’espérance de cette variance sur tous les blocs \( V_j \) :

 \[
 \mathbb{E}_{V_j} \left[ s^2_{v|V_j} \right] = \frac{1}{n} \sum_{i=1}^n \mathbb{E}[Z(v_i)^2] - \mathbb{E}[Z(V_j)^2]
 \]

 En utilisant l'identité \( \mathbb{E}[X^2] = \text{Var}(X) + \left( \mathbb{E}[X] \right)^2 \), on obtient :

 \[
 \mathbb{E}_{V_j} \left[ s^2_{v|V_j} \right] = \frac{1}{n} \sum_{i=1}^n \left( \text{Var}(Z(v_i)) + m^2 \right) - \left( \text{Var}(Z(V_j)) + m^2 \right)
 \]

 En simplifiant :

 \[
 \mathbb{E}_{V_j} \left[ s^2_{v|V_j} \right] = \frac{1}{n} \sum_{i=1}^n \text{Var}(Z(v_i)) - \text{Var}(Z(V_j))
 \]

 Si les sous-blocs sont identiquement distribués :

 \[
 \text{Var}(Z(v_i)) = \text{Var}(Z(v)) \quad \text{et} \quad Z(V_j) = \frac{1}{n} \sum_{i=1}^n Z(v_i)
 \]

 Alors :

 \[
 \text{Var}(Z(V_j)) = \frac{1}{n^2} \sum_{i=1}^n \sum_{k=1}^n \text{Cov}(Z(v_i), Z(v_k))
 \]

 Finalement, la variance de dispersion devient :

 \[
 \mathbb{E}_{V_j} \left[ s^2_{v|V_j} \right] = \text{Var}(Z(v)) - \frac{1}{n^2} \sum_{i=1}^n \sum_{k=1}^n \text{Cov}(Z(v_i), Z(v_k))
 \]

> ✅ **Conclusion** : La variance de dispersion est égale à la variance des sous-blocs moins la variance des blocs moyens.
 

Ainsi, la variance de dispersion s’exprime alors comme suit :

$$
D^2(v|V) = \sigma_v^2 - \sigma_V^2
$$

Autrement dit, la variance de dispersion n’est rien d’autre que la différence de variabilité entre les teneurs mesurées sur deux volumes distincts. Puisque nous savons déjà comment calculer la variance des blocs, nous pouvons également déterminer la variance de dispersion grâce à cette relation.

---

### Expressions équivalentes

Utilisant les résultats précédents concernant les variances de blocs, on peut obtenir les formulations suivantes :

$$
D^2(v|V) = \overline{C}(v,v) - \overline{C}(V,V)
$$

ou encore, en termes de variogramme :

$$
D^2(v|V) = \overline{\gamma}(V,V) - \overline{\gamma}(v,v)
$$


---

## Propriétés

On notera en particulier que, pour les modèles croissants de variogramme, on aura: 

- Lorsque $v \to 0$, alors $D^2(v|V) \to \overline{\gamma}(V,V)$  
- Lorsque $v \to V$, alors $D^2(v|V) \to 0$  
- Lorsque $V \to \infty$, alors $D^2(v|V) \to \sigma_v^2$

---

## Applications


Dans une mine, $v$ peut représenter la production quotidienne, tandis que $V$ correspond à la production hebdomadaire ou mensuelle. Le rendement du concentrateur peut alors être influencé par l’ampleur des fluctuations journalières sur une période plus longue, ce qui est précisément mesuré par la variance de dispersion $D^2(v|V)$.

L’objectif est donc de quantifier la variabilité des teneurs des petits blocs (ou des jours de production) en lien avec une période de production plus étendue. Cette information est essentielle pour adapter le traitement chimique de manière optimale, afin de maximiser l’extraction du métal contenu dans le minerai.

En revenant à la théorie de Lane, cela revient à assurer un taux de récupération $y$ plus élevé, ce qui contribue directement à la maximisation des profits.

---

## Additivité des dispersions

Les relations précédentes se généralisent aisément et permettent de définir une règle d’additivité pour plusieurs blocs de tailles différentes emboîtés. Cette propriété permet de décomposer la variance de dispersion entre un petit bloc $v_1$ et un gros bloc $v_n$ en une somme de contributions intermédiaires :

$$
D^2(v_1|v_n) = D^2(v_1|v_2) + D^2(v_2|v_3) + \dots + D^2(v_{n-1}|v_n)
$$

avec les supports ordonnés par taille croissante :

$$
v_1 < v_2 < \dots < v_{n-1} < v_n
$$

Il est important que chaque bloc soit inclus dans le suivant, c’est-à-dire que $v_1 \subset v_2 \subset v_3 \subset \dots \subset v_n$.

### Exemple pratique : piles de stockage

Cette relation d’additivité est particulièrement utile pour modéliser un procédé courant : l’homogénéisation par pile de stockage.

Considérons les volumes suivants :

- $v_1$ : production journalière de minerai  
- $v_2$ : pile de stockage hebdomadaire (ou quotidienne homogénéisée)  
- $v_3$ : alimentation mensuelle du concentrateur

Dans ce cadre, les piles de stockage jouent un rôle de filtre : elles atténuent ou éliminent les variations de teneur à court terme. Si le processus d’homogénéisation est efficace, la pile fournit toujours une teneur stable, indépendamment des fluctuations journalières. On a alors :

$$
D^2(v_1|v_2) \approx 0
$$

C’est-à-dire que toute la variabilité entre la production journalière ($v_1$) et la production mensuelle ($v_3$) est absorbée par la pile intermédiaire $v_2$** :

$$
D^2(v_1|v_3) \approx D^2(v_2|v_3)
$$

Autrement dit, **la pile d’homogénéisation fournit toujours la même teneur**, quel que soit le minerai extrait chaque jour.  
La seule variabilité restante correspond à la difficulté à constituer plusieurs piles successives de teneurs similaires sur la durée du mois soit $D^2(v_2|v_3)$.

---

## Notes importantes concernant l’effet de pépite

1. Dans les relations précédentes, $\gamma(h)$ représente le variogramme ponctuel. Dans la pratique, ce variogramme n’est pas accessible : seul le variogramme défini sur un certain support « $s$ » existe (par exemple, les carottes de forage).

   Les relations restent valides tant que le support des données est petit devant « $v$ ». Dans ce cas, l’effet de pépite n’intervient pas dans le calcul de la variance de bloc ni dans la variance de dispersion.

2. Lorsque $v$ n’est pas beaucoup plus grand que le support des données, un terme de variance lié à l’effet de pépite doit être inclus dans la variance de bloc. Ce terme est généralement :

$$
C_{0,v} = \frac{s}{v} C_{0} 
$$

où :

- $C_0$ est l'effet de pépite du variogramme ponctuelle,  
- $s$ est le volume du support des données,  
- $v$ est le volume du bloc.

> Cette interprétation est valide uniquement si l’effet de pépite représente une microstructure réelle (ex. : pépites d’or), mais pas s’il s’agit d’erreurs de localisation ou d’imprécisions analytiques, car cela ne fait pas partie du phénomène étudié.

---

## Remarque finale

Le calcul des variances de bloc et de la variance d’estimation ne nécessite pas de connaître explicitement les données. Seul le variogramme est requis.  
Ces notions ne rendent donc pas compte de l’information accrue localement par l’acquisition de nouvelles données.

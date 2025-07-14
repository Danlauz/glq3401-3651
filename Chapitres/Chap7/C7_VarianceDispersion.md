# 7.2 Variance de dispersion

La variance de bloc permet de calculer la variance théorique de la teneur de bloc dans un domaine d’extension infinie. Bien sûr, les gisements réels ne sont jamais infinis, et il est souhaitable de pouvoir prévoir l’amplitude des variations des teneurs de bloc pour un domaine fini correspondant au gisement ou à une partie du gisement.

Considérons un grand bloc \( V_j \) découpé en petits blocs \( v_i \). On a bien sûr :

$$
Z(V_j) = \frac{1}{n} \sum_{i=1}^n Z(v_i)
$$

On peut vouloir déterminer l'importance de la variation des blocs \( v_i \) à l'intérieur de \( V_j \), en moyenne pour l'ensemble des blocs \( V \). C'est ce que l'on appelle **la variance de dispersion de \( v \) dans \( V \)**, notée \( D^2(v|V) \).

Soit la variance échantillonnale pour un bloc \( V_j \) :

$$
s^2_{v|V_j} = \frac{1}{n} \sum_{i=1}^n \left( Z(v_i) - Z(V_j) \right)^2
$$

On définit alors la **variance de dispersion** comme l'espérance de cette variance expérimentale en considérant tous les blocs possibles \( V_j \) :

$$
D^2(v|V) = E\left[ s^2_{v|V_j} \right] = E\left[ \frac{1}{n} \sum_{i=1}^n \left( Z(v_i) - Z(V_j) \right)^2 \right]
$$

Développement :

$$
D^2(v|V) = \frac{1}{n} \sum_{i=1}^n \left[ \mathrm{Var}(Z(v_i)) + \mathrm{Var}(Z(V_j)) - 2\,\mathrm{Cov}(Z(v_i), Z(V_j)) \right]
$$

Soit, en résumé :

$$
D^2(v|V) = \sigma_v^2 + \sigma_V^2 - 2\,\mathrm{Cov}(Z(v), Z(V))
$$

Ce qui donne, en utilisant les notations précédentes :

$$
D^2(v|V) = \sigma_v^2 - \sigma_V^2
$$

i.e., **la variance de dispersion n’est autre qu’une différence de variabilité entre les teneurs mesurées sur deux volumes différents.**

---

### Expressions équivalentes

Utilisant les résultats précédents concernant les variances de blocs, on peut obtenir les formulations suivantes :

$$
D^2(v|V) = C(v,v) - C(V,V)
$$

ou encore, en termes de variogramme :

$$
D^2(v|V) = \gamma(V,V) - \gamma(v,v)
$$

---

## Cas limites

Pour les modèles croissants de variogramme, on a :

- Lorsque \( v \to 0 \), alors \( D^2(v|V) \to \gamma(V,V) \)  
- Lorsque \( v \to V \), alors \( D^2(v|V) \to 0 \)  
- Lorsque \( V \to \infty \), alors \( D^2(v|V) \to \sigma_v^2 \)

---

Dans une mine, « \( v \) » pourrait correspondre à la production quotidienne et « \( V \) » à la production hebdomadaire ou mensuelle. Le rendement du concentrateur pourrait être relié à l’importance des fluctuations journalières sur une période mensuelle, c’est-à-dire à \( D^2(v|V) \).

---

## Additivité des dispersions

Les relations précédentes se généralisent aisément et permettent de définir une **règle d’additivité** très générale pour plusieurs blocs de tailles différentes :

$$
D^2(v_1|v_n) = D^2(v_1|v_2) + D^2(v_2|v_3) + \dots + D^2(v_{n-1}|v_n)
$$

avec les supports ordonnés par taille croissante :  
\( v_1 < v_2 < \dots < v_{n-1} < v_n \)

---

## Notes importantes concernant l’effet de pépite

1. Dans les relations précédentes, \( \gamma(h) \) représente le variogramme ponctuel. Dans la pratique, ce variogramme n’est pas accessible : seul le variogramme défini sur un certain support « s » existe (par exemple, les carottes de forage).

&nbsp;  Les relations restent valides **tant que le support des données est petit devant « \( v \) »**. Dans ce cas, **l’effet de pépite n’intervient pas** dans le calcul de la variance de bloc ni dans la variance de dispersion.

2. Lorsque \( v \) n’est **pas beaucoup plus grand que le support des données**, un terme de variance lié à l’effet de pépite doit être inclus dans la variance de bloc. Ce terme est généralement :

$$
\sigma^2_{\text{effet pépite}} = \frac{s}{v} C_0
$$

où :

- \( C_0 \) est le saut du variogramme à l’origine (effet de pépite),  
- \( s \) est le volume du support des données,  
- \( v \) est le volume du bloc.

> Cette interprétation est valide uniquement si l’effet de pépite représente une **microstructure réelle** (ex. : pépites d’or), mais **pas** s’il s’agit d’erreurs de localisation ou d’imprécisions analytiques.

---

## Remarque finale

Le calcul des variances de bloc et de la variance d’estimation **ne nécessite pas** de connaître explicitement les données. **Seul le variogramme** est requis.  
Ces notions **ne rendent donc pas compte** de l’information accrue localement par l’acquisition de nouvelles données.

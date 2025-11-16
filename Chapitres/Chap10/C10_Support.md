# 10.4 Modèles de changements de support

Dans la plupart des cas, les décisions doivent être prises sur des supports différents de ceux des données observées. Or, la fonction $F_{KI}$ estimée précédemment est valable uniquement pour le support ponctuel des observations.

Par exemple, dans une mine, la probabilité qu’un **bloc de 125 m³** atteigne une teneur de coupure donnée n’est pas la même que celle d’une **carotte de 1 m**. Comme la variance varie selon le support, les fonctions de répartition associées sont nécessairement différentes. Il est donc indispensable de corriger la fonction $F_{KI}$ afin de tenir compte du changement de support.

> **Note :**  
On pourrait penser qu’il suffit de remplacer le krigeage ponctuel du KI par un krigeage par blocs. Cependant, $I^*(x_0, c)$ représente l’estimation de la probabilité moyenne que les points du bloc soient inférieurs à $c$, et non la probabilité que la valeur moyenne du bloc soit inférieure à $c$.  
>  
> Cette distinction est importante car la probabilité n’est pas un opérateur linéaire par rapport à la moyenne, tout comme le logarithme n’est pas linéaire par rapport à la moyenne (i.e., $\log(\text{moyenne}) \neq \text{moyenne des } \log$).

---

### Correction affine

La correction affine, la plus utilisée avec le KI, repose sur l’hypothèse que la distribution des blocs est identique à celle des points, à une contraction près, donnée par le rapport des écarts-types (ou variances) des blocs et des points.

Formellement, la correction affine s’écrit :

$$
F_{Z_v}(z) = F_Z \left( m + \sqrt{\frac{D^2(v|G)}{D^2(\cdot|G)}} (z - m) \right)
$$

où :

- $m$ est la moyenne locale (i.e., l’espérance obtenue de la fonction de répartition estimée par KI au point ponctuel),
- $D^2(v|G)$ est la variance (dispersion) au support du bloc,
- $D^2(\cdot|G)$ est la variance au support ponctuel.

---

### Exemple

Pour l’exemple précédent de la section 10.3, on peut calculer une espérance conditionnelle de $m = 6.33$, et un rapport de variances de $\frac{D^2(v|G)}{D^2(\cdot|G)} = 0.8$.

On cherche la probabilité que le bloc dépasse la valeur 9.

Le seuil ponctuel équivalent devient :

$$
c' = \frac{1}{\sqrt{0.8}} (9 - 6.33) + 6.33 \approx 9.31
$$

En se référant au tableau précédent, la probabilité d’excéder ce seuil au point est :

$$
P(Z_v > 9) = 1 - \left(0.78 + 0.31 \times (1 - 0.78) \right) = 0.15
$$

Tandis que la probabilité ponctuelle d’excéder le seuil 9 est plus élevée :

$$
P(Z > 9) = 1 - 0.78 = 0.22
$$

---

### Limitations et remarques

La correction affine ne peut pas être utilisée pour des changements de support trop importants, typiquement lorsque $\frac{D^2(v|G)}{D^2(\cdot|G)} \leq 0.7$. Dans ce cas, la forme de l’histogramme change trop fortement, et la méthode perd en pertinence. La [Fig. %s](#C10_CorrectionAfine) illustre l’impact de la correction affine sur la fonction de répartition : la différence entre la courbe noire et la courbe rouge correspond simplement à une contraction d’amplitude, exactement égale au rapport $\frac{D^2(v|G)}{D^2(\cdot|G)}$. Ainsi, la correction affine n’est pas adaptée lorsque les blocs considérés sont trop grands par rapport à la structure spatiale du phénomène. Dans ce contexte, on s’attend à une diminution progressive du nombre de modes et à un histogramme local qui tend vers une loi normale. La fonction de répartition des blocs devrait alors refléter cette normalité émergente.

Pour de tels changements de support, il faut recourir à des méthodes plus sophistiquées. Une approche consiste à utiliser des simulations géostatistiques ponctuelles conditionnelles, qui reproduisent le variogramme et respectent les observations. En agrégeant ces simulations à l’échelle des blocs, on peut estimer directement la fonction de répartition locale des blocs. De nombreuses techniques de simulation sont disponibles pour ce type d’analyse.

```{figure} images/C10_CorrectionAfine.png
:label: C10_CorrectionAfine
:align: center
Impact de la correction affine sur la fonction de répartition.
```

---

Cette correction affine permet donc une adaptation simple et souvent efficace du KI aux problèmes pratiques où les supports d’estimation et d’observation diffèrent.

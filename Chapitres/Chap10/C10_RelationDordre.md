# 10.3 Problèmes de relation d'ordre

Comme mentionné précédemment, rien ne garantit que le résultat du krigeage d’indicatrices sera une fonction respectant les propriétés d’une fonction de répartititon :

- $0 \leq F(z) \leq 1$
- $F(z) \leq F(z')$ si $z \leq z'$

Il faut donc, avant tout calcul, s'assurer que la fonction estimée $F_{KI}(x_0, z)$ respecte ces propriétés, sans quoi des résultats aberrants, comme des probabilités négatives, pourraient apparaître. Pour cela, on effectue des corrections dites "ad hoc".

La [Fig. %s](#C10_RelationOrdre) illustre, de manière exagérée, la violation des propriétés attendues d’une fonction de répartition.

```{figure} images/C10_RelationOrdre.png
:label: C10_RelationOrdre
:align: center
Violation des propriétés d'une fonction de répartition.
```

---

### Correction « ad hoc » de la fonction de répartition estimée

1. **Troncature des bornes :**  
   Mettre les valeurs négatives de $F_{KI}(x, c)$ égales à 0, et celles supérieures à 1 égales à 1.

2. **Correction vers l'avant :**  
   Soient les seuils ordonnés $c_1 < c_2 < \cdots < c_p$.  
   On définit la fonction corrigée vers l'avant par :  
   $$
   F_{KI,\text{avant}}(x_0, c_1) = \max(0, F_{KI}(x_0, c_1))
   $$
   Pour $i = 2, \ldots, p$ :  
   $$
   F_{KI,\text{avant}}(x_0, c_i) = \max\big(F_{KI,\text{avant}}(x_0, c_{i-1}), F_{KI}(x_0, c_i)\big)
   $$

3. **Correction vers l'arrière :**  
   On définit la fonction corrigée vers l'arrière par :  
   $$
   F_{KI,\text{arr}}(x_0, c_p) = \min(1, F_{KI}(x_0, c_p))
   $$
   Pour $i = p-1, \ldots, 1$ :  
   $$
   F_{KI,\text{arr}}(x_0, c_i) = \min\big(F_{KI}(x_0, c_i), F_{KI,\text{arr}}(x_0, c_{i+1})\big)
   $$

4. **Fonction corrigée finale :**  
   La fonction corrigée est obtenue en faisant la moyenne des deux corrections :  
   $$
   F_{KI,\text{corr}}(x_0, c_i) = \frac{1}{2} \big( F_{KI,\text{avant}}(x_0, c_i) + F_{KI,\text{arr}}(x_0, c_i) \big)
   $$

---

### Exemple de correction

Le tableau suivant illustre la correction appliquée à une fonction $F_{KI}$ présentant des anomalies :

| Seuil $c$ | $F_{KI}(x_0,c)$ | $F_{KI,\text{avant}}(x_0,c)$ | $F_{KI,\text{arr}}(x_0,c)$ | $F_{KI,\text{corr}}(x_0,c)$ |
|--------------|----------------------|---------------------------------|-------------------------------|-------------------------------|
| 1            | -0.01 → 0            | 0                               | 0                             | 0                             |
| 2            | 0.13                 | 0.13                            | 0.13                          | 0.13                          |
| 3            | 0.24                 | 0.24                            | 0.234                         | 0.237                         |
| 4            | 0.238                | 0.24                            | 0.234                         | 0.237                         |
| 5            | 0.234                | 0.24                            | 0.234                         | 0.237                         |
| 6            | 0.237                | 0.24                            | 0.237                         | 0.2385                        |
| 7            | 0.53                 | 0.53                            | 0.53                          | 0.53                          |
| 8            | 0.79                 | 0.79                            | 0.77                          | 0.78                          |
| 9            | 0.77                 | 0.79                            | 0.77                          | 0.78                          |
| 10           | 1.02 → 1.0           | 1.0                             | 1.0                           | 1.0                           |

---

### Exemple visuel

La [Fig. %s](#C10_RelationOrdre_Correction) illustre l’application des corrections des relations d’ordre présentées dans le tableau précédent. On y observe l’effet de la correction avant et de la correction arrière. Visuellement, la correction préalable consiste à remplacer chaque valeur par le maximum entre celle-ci et la valeur précédente, ce qui garantit une fonction strictement croissante. À l’inverse, la correction arrière part du seuil le plus élevé et remplace chaque valeur par le minimum entre celle-ci et la valeur du seuil situé à un rang supérieur, ce qui produit une fonction strictement décroissante. Les deux corrections définissent une enveloppe dont on prend généralement la moyenne pour obtenir une fonction de répartition corrigée et conforme aux relations d’ordre.

```{figure} images/C10_RelationOrdre_Correction.png
:label: C10_RelationOrdre_Correction
:align: center
Correction des relations d'ordre de l'exemple du tableau ci-haut.
```
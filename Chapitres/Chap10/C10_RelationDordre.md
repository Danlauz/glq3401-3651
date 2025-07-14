# 10.3 Problèmes de relation d'ordre

Comme mentionné précédemment, rien ne garantit que le résultat du krigeage d’indicatrices sera une fonction respectant les propriétés d’une fonction de distribution :

- \( 0 \leq F(z) \leq 1 \)
- \( F(z) \leq F(z') \) si \( z \leq z' \)

Il faut donc, avant tout calcul, s'assurer que la fonction estimée \( F_{KI}(x_0, z) \) respecte ces propriétés, sans quoi des résultats aberrants, comme des probabilités négatives, pourraient apparaître. Pour cela, on effectue des corrections dites "ad hoc". Voici une méthode simple :

---

### Correction « ad hoc » de la fonction de distribution estimée

1. **Troncature des bornes :**  
   Mettre les valeurs négatives de \( F_{KI}(x, c) \) égales à 0, et celles supérieures à 1 égales à 1.

2. **Correction vers l'avant :**  
   Soient les seuils ordonnés \( c_1 < c_2 < \cdots < c_p \).  
   On définit la fonction corrigée vers l'avant par :  
   \[
   F_{KI,\text{avant}}(x_0, c_1) = \max(0, F_{KI}(x_0, c_1))
   \]
   Pour \( i = 2, \ldots, p \) :  
   \[
   F_{KI,\text{avant}}(x_0, c_i) = \max\big(F_{KI,\text{avant}}(x_0, c_{i-1}), F_{KI}(x_0, c_i)\big)
   \]

3. **Correction vers l'arrière :**  
   On définit la fonction corrigée vers l'arrière par :  
   \[
   F_{KI,\text{arr}}(x_0, c_p) = \min(1, F_{KI}(x_0, c_p))
   \]
   Pour \( i = p-1, \ldots, 1 \) :  
   \[
   F_{KI,\text{arr}}(x_0, c_i) = \min\big(F_{KI}(x_0, c_i), F_{KI,\text{arr}}(x_0, c_{i+1})\big)
   \]

4. **Fonction corrigée finale :**  
   La fonction corrigée est obtenue en faisant la moyenne des deux corrections :  
   \[
   F_{KI,\text{corr}}(x_0, c_i) = \frac{1}{2} \big( F_{KI,\text{avant}}(x_0, c_i) + F_{KI,\text{arr}}(x_0, c_i) \big)
   \]

---

### Exemple de correction

Le tableau suivant illustre la correction appliquée à une fonction \( F_{KI} \) présentant des anomalies :

| Seuil \( c \) | \( F_{KI}(x_0,c) \) | \( F_{KI,\text{avant}}(x_0,c) \) | \( F_{KI,\text{arr}}(x_0,c) \) | \( F_{KI,\text{corr}}(x_0,c) \) |
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

### Remarque complémentaire

Dans un cadre plus large, on calcule les poids de krigeage \(\lambda_i\) en résolvant le système classique (ici en notation indicatrice) :

\[
I^*(x, c) = \sum_{i=1}^n \lambda_i I(x_i, c) + \left(1 - \sum_{i=1}^n \lambda_i \right) F_Z(c),
\]

avec la contrainte sur les covariances :

\[
\sum_{i=1}^n \lambda_i \, \mathrm{Cov}\big(I(x_i,c), I(x_j,c)\big) = \mathrm{Cov}\big(I(x_0,c), I(x_j,c)\big) \quad \forall j,
\]

où \( F_Z(c) \) est la fonction de distribution cumulative globale évaluée au seuil \( c \).

Ce processus est répété pour chaque seuil \( c \). Si le variogramme est un simple effet de pépite, les poids sont nuls et la fonction locale estimée est égale à la fonction globale.


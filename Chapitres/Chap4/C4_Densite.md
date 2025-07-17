# Calcul de la densité des roches

On peut mesurer ou calculer la densité des roches de diverses façons et sur des supports très différents.

## i. Densité de carottes de forage

$$
d = \frac{M_s}{M_s - M_e}
$$

- $M_s$ : masse sèche  
- $M_e$ : masse dans l'eau

## ii. Densité de poudre

- Mesure du poids de la roche broyée
- Mesure du volume d’eau déplacée par la roche broyée

## iii. Densité théorique

Calculée à partir des constituants du minerai (ex. % silice, % sulfures, etc.). Les variations de densité sont surtout liées à la concentration en sulfures, que l’on peut déterminer par analyse chimique.

Si $d_i$ est la densité du minéral $i$ et $t_i$ sa teneur (fraction), la densité moyenne est donnée par :

$$
d_{\text{moy}} = \frac{1}{\frac{t_1}{d_1} + \frac{t_2}{d_2} + \cdots + \frac{t_n}{d_n}}
$$

---

## Exemple de calcul

Un gisement Cu-Zn contient de la sphalérite (ZnS), de la chalcopyrite (CuFeS₂) et de la pyrite (FeS₂). On connaît les densités :

- Chalcopyrite : 4.2 g/cm³  
- Sphalérite : 4.1 g/cm³  
- Pyrite : 5.0 g/cm³  
- Gangue : 2.68 g/cm³

Résultats de l’analyse chimique :

- 3 % Cu  
- 5 % Zn  
- 20 % Fe

### Étape 1 : répartition massique des éléments

| Minéral        | Composition approximative |
|----------------|----------------------------|
| Chalcopyrite   | 35 % Cu, 30 % Fe, 35 % S    |
| Sphalérite     | 67 % Zn, 33 % S             |
| Pyrite         | 47 % Fe, 53 % S             |

Ces proportions sont obtenues à partir des poids atomiques.

### Étape 2 : calcul des % massiques des minéraux

- Sphalérite : $5 \div 0.67 = 7.46 \%$
- Chalcopyrite : $3 \div 0.35 = 8.57 \%$
  - Elle fournit $8.57 \times 0.30 = 2.57 \%$ de Fe
- Pyrite : $(20 - 2.57) \div 0.47 = 37.09 \%$
- Gangue : $100 - 7.46 - 8.57 - 37.09 = 46.88 \%$

### Étape 3 : calcul de la densité théorique

Pour 100 g de roche :

- Sphalérite : $7.46 \div 4.1 = 1.82$ cm³  
- Chalcopyrite : $8.57 \div 4.2 = 2.04$ cm³  
- Pyrite : $37.09 \div 5 = 7.42$ cm³  
- Gangue : $46.88 \div 2.68 = 17.49$ cm³  

**Volume total =** $1.82 + 2.04 + 7.42 + 17.49 = 28.77$ cm³  
**Densité =** $100 \div 28.77 = \mathbf{3.48}$ g/cm³

---

## Remarques importantes

### a) Linéarité

La relation de densité théorique est linéaire pour l’**inverse de la densité** :

$$
\frac{1}{d_{\text{théo}}} = b_0 + b_1 \cdot \text{\%Zn} + b_2 \cdot \text{\%Cu} + b_3 \cdot \text{\%Fe}
$$

### b) Présence de Fe dans la gangue

Si la gangue contient aussi du fer (ex. 3 %), il faut ajuster les calculs. Cela mène à un système d’équations linéaires.

Exemple :

$$
Ax = b
$$

- $A$ : matrice des proportions d’éléments dans chaque minéral
- $x$ : % massiques des minéraux
- $b$ : % massiques des éléments dans la roche

Cela permet de résoudre des cas plus complexes.

### c) Effet de la porosité

Si la porosité est non nulle (ex. $n$ = 5 %) :

$$
\rho_{\text{réelle}} = \rho_{\text{théorique}} \cdot (1 - n)
$$

---


# 8.4 Propriétés du krigeage

Les principales propriétés et caractéristiques associées au krigeage sont :

i. **Linéaire, sans biais, à variance minimale, par construction**  
Le krigeage est un estimateur linéaire, non biaisé, et qui minimise la variance d’estimation.

ii. **Interpolateur exact**  
Si l’on estime un point connu, on retrouve exactement la valeur connue.

iii. **Présente un effet d'écran**  
Les points les plus près reçoivent les poids les plus importants. Cet effet d'écran varie selon :  
- La configuration spatiale des données  
- Le modèle de variogramme utilisé  

> Plus l'effet de pépite est important, moins il y a d'effet d'écran.

iv. **Tient compte de la taille du champ à estimer et de la position des points entre eux**  
Le krigeage considère la géométrie du champ et la disposition relative des données.

v. **Tient compte de la continuité du phénomène étudié**  
Par l'utilisation du variogramme, le krigeage modélise la continuité spatiale du phénomène (effet de pépite, anisotropie, etc.).

vi. **Effectue généralement un lissage**  
Les estimations sont moins variables que les teneurs réelles (point ou bloc) que l'on cherche à estimer.

vii. **Presque sans biais conditionnel**  
Lorsqu'on applique une teneur de coupure à des valeurs estimées, on récupère approximativement la teneur prévue.  

> C'est une propriété très importante pour les mines.  
> Cette propriété implique que l'estimateur utilisé soit plus lisse que la valeur qu'il cherche à estimer, ce qui est le cas pour le krigeage.

viii. **Transitif**  
Si l’on observe en un point une valeur coïncidant avec la valeur krigée pour ce point :  
- Les valeurs krigées en d'autres points ne sont pas modifiées par l'inclusion de ce nouveau point  
- Les variances de krigeage, elles, sont diminuées

De même, si l’on krige un certain nombre de points et que l’on utilise les valeurs krigées comme si c’étaient de nouvelles données, alors :  
- Les krigeages subséquents ne s’en trouvent pas modifiés (sauf pour la variance de krigeage)

---

## Propriétés générales

### Linéarité, absence de biais et variance minimale

Le krigeage est, par construction, un estimateur :  
- **Linéaire**  
- **Sans biais**  
- **À variance d’estimation minimale**  
- **Interpolateur exact** : lorsqu’un point connu est estimé, le krigeage retourne exactement la valeur observée.

### Effet d’écran

Les points les plus proches du point à estimer reçoivent les poids les plus élevés. Cet effet dépend :  
- De la configuration spatiale des données  
- Du modèle de variogramme utilisé  

> Plus l’effet de pépite est important, plus l’effet d’écran diminue.

### Prise en compte de la géométrie du champ

Le krigeage tient compte :  
- De la taille du champ à estimer  
- De la position relative des points

### Continuité spatiale

Grâce au variogramme, le krigeage modélise la continuité du phénomène étudié (effet de pépite, anisotropie, etc.).

### Effet de lissage

Les estimations sont généralement moins variables que les valeurs réelles. Cela signifie que le krigeage **"lisse"** les données.

### Quasi-absence de biais conditionnel

Lorsqu'une teneur de coupure est appliquée aux valeurs estimées, la teneur globale reste proche de la réalité. Cela est crucial en contexte minier.

### Transitivité

Si une valeur observée coïncide avec la valeur krigée, l’ajout de ce point :  
- N’affecte pas les autres estimations  
- Réduit la variance d’estimation

---

## Illustrations et effets spécifiques

### Interpolation exacte

- Aux points d’échantillonnage, le krigeage retourne la valeur mesurée.  
- Pour éviter des discontinuités sur les cartes, il est recommandé de **ne pas kriger un point exactement à l’emplacement d’un échantillon**.

### Effet d’écran

- Cas extrême : modèle linéaire en 1D  
- Diminue avec l’augmentation de l’effet de pépite  
- Permet de limiter le krigeage à un voisinage local (voisinages glissants)

### Influence de la taille du champ

Lorsque la taille du champ augmente :  
- Les poids tendent à s’égaliser  
- La variance d’estimation diminue, puis augmente si l’on extrapole au-delà du domaine couvert par les données

### Position relative des points

Contrairement à l’interpolation par inverse de la distance, le krigeage tient compte de la configuration spatiale. Chaque point est pondéré selon sa **zone d’influence**.

### Effet de pépite et portée

- Plus l’effet de pépite est élevé, plus la variance d’estimation augmente  
- Plus la portée est grande, plus la variance d’estimation diminue

### Anisotropie

- Il est essentiel d’adapter la densité d’échantillonnage selon la direction de plus faible portée  
- Une stratégie d’échantillonnage alignée avec l’anisotropie améliore la précision des estimations

### Choix du modèle de variogramme

- Le choix du modèle a peu d’impact si les ajustements sont similaires à courte distance  
- Les points proches du point à estimer ont le plus d’influence

---

## Effet de lissage

### Krigeage simple

$$
\text{Var}(Z_v) = \text{Var}(Z_v^*) + \sigma_{ks}^2
$$

### Krigeage ordinaire

$$
\text{Var}(Z_v) = \text{Var}(Z_v^*) + \sigma_{ko}^2 + 2\mu
$$

**Exemple :**  
Bloc de 10×10, estimé par ses 4 coins, variogramme sphérique (palier = 1, portée = 20)

- $$\text{Var}(Z_v) = 0.6278$$  
- $$\sigma_{ko}^2 = 0.1311$$  
- $$\text{Var}(Z_v^*) = 0.4353$$  
- $$\mu = 0.0307$$  

**Vérification :**  
$$
0.4353 + 0.1311 + 2 \times 0.0307 = 0.6278
$$

---

## Biais conditionnel

### Krigeage simple

Pas de biais conditionnel :

$$
E[Z_v \mid Z_v^*] = Z_v^*
$$

### Krigeage ordinaire

Légèrement biaisé :

$$
E[Z_v \mid Z_v^*] = a + bZ_v^*
$$

avec :

$$
b = \frac{\text{Cov}(Z_v, Z_v^*)}{\text{Var}(Z_v^*)}, \quad a = (1 - b)m
$$

- Le multiplicateur de Lagrange est souvent légèrement négatif  
- Cela implique une pente de régression < 1 :  
  - Surestimation des fortes teneurs  
  - Sous-estimation des faibles teneurs

### Estimation polygonale

- Présente un biais conditionnel plus marqué  
- Plus le point utilisé est éloigné du bloc, plus le biais est important

### Lien entre lissage et biais conditionnel

$$
b = \frac{\text{Cov}(Z_v, Z_v^*)}{\text{Var}(Z_v)} = \rho \frac{\sigma_{Z_v^*}}{\sigma_{Z_v}}
$$

Si $$\sigma_{Z_v^*} > \sigma_{Z_v}$$, alors $$b < 1$$  
→ Un estimateur plus variable que la réalité présente nécessairement un biais conditionnel.

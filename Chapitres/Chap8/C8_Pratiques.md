# 8.3 Pratique du krigeage

## Grille de krigeage

Souvent, le krigeage est réalisé sur une grille régulière de **points** ou de **blocs**.

- Dans le cas de **points**, l'objectif est habituellement de fournir une **carte** de la variable étudiée. La grille de krigeage doit être assez **dense** pour que la carte reflète réellement les résultats du krigeage et non les effets du logiciel de cartographie.

- Dans le cas de **blocs**, ceux-ci correspondent généralement à des **unités de sélection minière (SMU)**, et leur taille est dictée par les opérations minières. L’objectif peut être d’appliquer une **teneur de coupure** à ces blocs pour estimer les **ressources du gisement**.
⚠️ Le nombre de blocs **ne devrait pas dépasser 10 fois** le nombre d'observations dans la zone d'intérêt. Au-delà, les estimations varient peu, mais le **temps de calcul** augmente inutilement.

### Voisinage utilisé pour le krigeage

1. Généralement un **voisinage glissant**.

2. Nombre de points suffisant (> 10, jusqu’à 50–100).

3. Zone de recherche assez **grande** pour assurer ce minimum.

4. Si anisotropie : adopter une **zone elliptique** selon la direction de continuité. Sinon, une zone **circulaire** plus large suffit.

5. Utilisation des **quadrants** : assure une répartition uniforme (ex. : au moins 2 points par quadrant).

**Exemple** : Recherche circulaire avec 2 points max/quadrant. Des points peuvent être **rejetés** s’ils sont trop éloignés ou s’ils sont en surnombre dans un quadrant donné.

---

# 5.7 Validation croisée

La **validation croisée** est une méthode puissante pour vérifier la qualité du **modèle de variogramme** et du **voisinage** utilisé.

## Principe

On **élimine** chaque observation à tour de rôle et on l'estime à partir de ses voisins. On obtient alors pour chaque point :

- Une **valeur vraie** \\( Z_i \\)
- Une **valeur estimée** \\( Z_i^* \\)
- Une **variance de krigeage** \\( \sigma_i^2 \\)

## Indicateurs

On peut alors définir :

- Le **résidu brut** : \\( e_i = Z_i - Z_i^* \\)
- Le **résidu normalisé** : \\( n_i = \frac{Z_i - Z_i^*}{\sigma_i} \\)

Un bon modèle devrait vérifier :

1. \\( \sum e_i \approx 0 \\) et \\( \sum n_i \approx 0 \\)

2. \\( \sum |e_i| \\) ou \\( \sum e_i^2 \\) minimum

3. \\( \frac{1}{n} \sum n_i^2 \approx 1 \\)

4. Analyse des **histogrammes** et **distributions spatiales** des \\( e_i \\) et \\( n_i \\) pour détecter des biais ou hétérogénéités spatiales.

## Recommandations

- Reproduire le **contexte réel** d'estimation : par exemple, si les données proviennent de forages, éviter d'utiliser les **mêmes forages** comme voisins.

- Éviter d’utiliser des **points périphériques** (extrapolation) : leur variance de krigeage est souvent plus élevée.

- Compléter la validation avec le **variogramme expérimental**.

- Pour comparer 2 modèles : privilégier les **erreurs brutes** plutôt que les résidus normalisés.

## Ajustement du modèle

En ajustant la **constante de variogramme**, les estimations ne changent pas, mais la variance de krigeage est **multipliée** par cette constante.

Si la statistique \\( \frac{1}{n} \sum n_i^2 \\) est **trop élevée**, le modèle est **trop optimiste** : il faut alors un variogramme avec **moins de structure** (plus grande variance de krigeage).

---

## Illustration (résumé des figures)

Quatre figures illustrent des cas de validation croisée pour 1600 points (40 x 40), avec :

- En haut : la moyenne des erreurs au carré \\( \overline{e^2} \\) et la moyenne des variances de krigeage.

- En bas : \\( \frac{1}{n} \sum n_i^2 \\)

**Cas testés :**

- ✅ **Figure 1 (bon modèle)** : Le modèle sphérique utilisé correspond à la réalité → bonne correspondance des erreurs et variances.

- ⚠️ **Figure 2 (modèle trop pessimiste)** : Effet de pépite pur utilisé à la place du modèle réel → variance surévaluée.

- ⚠️ **Figure 3 (modèle trop optimiste)** : Portée \\( a = 20 \\) utilisée alors que le vrai modèle a \\( a = 10 \\) → sous-estimation des erreurs.

- ❌ **Figure 4 (modèle inadapté)** : Modèle sphérique fourni alors que la réalité est un effet de pépite pur → variance des erreurs normalisées largement > 1.

---

# Autres outils de validation

1. La **variance expérimentale** des valeurs estimées devrait correspondre à la **dispersion des blocs**.

2. La **relation de lissage** (section 5.3) permet aussi une validation : en variant la **taille de bloc**, on peut comparer :

   - Variance expérimentale

   - Moyennes des multiplicateurs de Lagrange

   - Variances de krigeage

On devrait observer une cohérence entre ces mesures et la **dispersion réelle** du gisement.

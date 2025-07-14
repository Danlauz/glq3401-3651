# 6.4 Combinaison d’erreurs élémentaires

Quand on dispose de nombreuses observations et que l’on souhaite estimer une moyenne sur un grand volume, le calcul direct de la variance d’estimation peut devenir lourd. Une approche simplifiée consiste à utiliser le **principe des extensions élémentaires**, qui décompose l’estimation globale en une série d’estimations locales approximativement indépendantes.

---

## i. Grille régulière

Pour une grille régulière, l’estimé global est simplement :

$$
Z^* = \frac{1}{n} \sum_{i=1}^n Z_i
$$

Chaque point est supposé représenter un bloc de taille égale. Si la variance d’erreur pour chaque bloc est \( \sigma_e^2 \), la variance d’estimation globale est :

$$
\sigma_e^2(\text{globale}) = \frac{\sigma_e^2}{n}
$$

Les erreurs sont approximativement indépendantes, car chaque bloc est estimé avec un seul point.

---

## ii. Échantillonnage aléatoire uniforme (stratifié)

Chaque point représente un bloc positionné aléatoirement dans le domaine. Pour un bloc \( v_i \), la variance d’estimation est :

$$
\sigma_{e_i}^2 = \mathbb{E}[(Z(x) - \bar{Z})^2] = \frac{1}{v} \int_v (Z(x) - \bar{Z})^2 \, dx = D^2(\cdot \mid v)
$$

Donc la variance d’estimation globale est encore :

$$
\sigma_e^2 = \frac{D^2(\cdot \mid v)}{n}
$$

---

## iii. Échantillonnage quelconque

On divise le domaine en sous-domaines \( g_i \) et on applique les règles précédentes localement. Si :

$$
Z^* = \sum_{i=1}^n \frac{v_i}{V} Z_i^*
$$

Alors :

$$
\sigma_e^2 = \sum_{i=1}^n \left(\frac{v_i}{V}\right)^2 \sigma_{e_i}^2
$$

---

## Remarques

- Le type d’estimateur utilisé localement (krigeage, IDW, polygonal) **n’influence pas** significativement la variance globale tant que les estimés sont similaires (moyennes pondérées).

- En estimation **locale**, le choix de la méthode a un **impact majeur** sur la précision.

- Cette méthode nécessite que les blocs n’aient **aucune donnée en commun** pour garantir l’indépendance des erreurs.

---

## Exemple

Une zone est estimée par krigeage direct (\( \sigma^2 = 0.36 \)) et par subdivision en 4 parcelles selon 2 scénarios.

#### Scénario 1 :

| Bloc | \( \sigma^2 \) |
|------|----------------|
| z1   | 1.6            |
| z2   | 1.4            |
| z3   | 1.4            |
| z4   | 1.3            |
| **Combiné** | **0.35** |

#### Scénario 2 :

| Bloc | \( \sigma^2 \) |
|------|----------------|
| z1   | 7.8            |
| z2   | 1.7            |
| z3   | 1.9            |
| z4   | 0.63           |
| **Combiné** | **0.36** |

---

## Résumé

1. **Variances de bloc, de dispersion et d’estimation** peuvent être calculées à partir du variogramme ponctuel.

2. L’effet de pépite **n’intervient pas** si les données sont quasi-ponctuelles. Il intervient pour les petits blocs avec des supports non ponctuels.

3. La **méthode des erreurs élémentaires** simplifie les calculs pour les grandes surfaces avec de bons résultats.

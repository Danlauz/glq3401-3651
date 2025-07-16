# 7.4 Combinaison d’erreurs élémentaires

Quand on dispose de nombreuses observations et que l’on souhaite estimer une moyenne sur un grand volume, le calcul direct de la variance d’estimation peut devenir lourd. Une approche simplifiée consiste à utiliser le principe de combinaison des erreurs élémentaires, qui décompose l’estimation globale en une série d’estimations locales approximativement indépendantes.

---

## i. Grille régulière

Pour une grille régulière, l’estimé global est simplement :

$$
Z^* = \frac{1}{n} \sum_{i=1}^n Z_i
$$

Chaque point est supposé représenter un bloc de taille égale. Si la variance d’erreur pour chaque bloc est $\sigma_e^2$, la variance d’estimation globale est :

$$
\sigma_e^2(\text{globale}) = \frac{\sigma_e^2}{n}
$$

Les erreurs sont approximativement indépendantes, car chaque bloc est estimé avec un seul point.

---

## ii. Échantillonnage aléatoire uniforme (stratifié)

Chaque point représente un bloc positionné aléatoirement dans le domaine. Pour un bloc $v_i$, la variance d’estimation est :

$$
\sigma_{e_i}^2 = \mathbb{E}[(Z(x) - \bar{Z})^2] = \frac{1}{v} \int_v (Z(x) - \bar{Z})^2 \, dx = D^2(\cdot \mid v)
$$

Donc la variance d’estimation globale est encore :

$$
\sigma_e^2 = \frac{D^2(\cdot \mid v)}{n}
$$

---

## iii. Échantillonnage quelconque

Supposons que nous somme en mesure de calculer la variance d'estimation sur un sous domaine $v_i$. Ainsi, pour l'ensemble du domaine $V$, l'estimé est obtenu en combinant, selon des poids proportionnels aux volumes des sous-domaines, les différents estimés obtenus. On aura donc :

$$
Z = \sum_{i=1}^n \frac{v_i}{V} Z_i^*
$$

et la variance d'estimation sera, puisque chaque erreur est considérée indépendante :

$$
\sigma_e^2 = \sum_{i=1}^n \left( \frac{v_i}{V} \right)^2 \sigma_{e_i}^2
$$

où les variances d'estimation élémentaires sont celles correspondant aux différents sous-domaines que l'on a pu reconnaître.


---

## Remarques

- L'estimateur particulier utilisé pour obtenir l'estimé pour la moyenne du champ n'intervient pas dans le calcul de la variance d'estimation globale par la méthode des erreurs élémentaires. L'estimation aurait pu être obtenu par krigeage, par inverse de la distance, par méthode polygonale, etc.. La raison de cette apparente anomalie est que les estimés globaux obtenus par ces méthodes sont très similaires. Ils consistent plus ou moins en une moyenne, pondérée par la zone d'influence de chaque observation, des valeurs observées. Puisque les estimations sont similaires, il n'est pas surprenant qu'elles aient toutes à peu près la même précision. Ce raisonnement n'est pas vrai si l'on cherche à prédire les variances d'estimation pour une estimation locale, i.e. pour une petite portion du champ. Alors, la technique d’estimation utilisée a une forte influence sur la précision obtenue

- Si l'on dispose d'un programme permettant d'effectuer le krigeage et de calculer les variances de krigeage (variance d'estimation), alors on peut les combiner suivant le principe précédent, i.e. il suffit de segmenter le domaine en blocs et d'estimer chaque bloc en n'utilisant que les données qui s'y trouvent, puis de combiner les variances de krigeage en fonction de la taille des blocs comme l'indique la formule précédente. Il est important de ne pas avoir des données communes pour l'estimation de deux blocs car alors les erreurs d'estimation ne pourraient plus être considérées comme indépendantes. 

---

## Exemple

Une zone a été estimée directement par krigeage (variance d'estimation 0.36) puis par combinaison de 4 parcelles selon 2 scénarios différents ([Fig. %s](#C7_VarEstimation)). Pour l'estimation de chaque parcelle, on n'utilise que les points s'y retrouvant. On calcule les variances d'estimation pour chaque parcelle et on combine le tout suivant le carré des surfaces de chaque parcelle. Les résultats obtenus par subdivision, dans les deux cas, sont quasi-identiques au résultat direct.

```{figure} images/C7_VarEstimation.PNG
:label: C7_VarEstimation
:align: center
Illustration des paramètres du variogramme - effet de pépite, palier et portée.
```

---



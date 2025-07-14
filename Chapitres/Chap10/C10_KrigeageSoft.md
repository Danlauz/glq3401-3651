# 8.4 Krigeage mou (« soft kriging ») ou krigeage avec données incertaines

Le krigeage d’indicatrices permet une extension immédiate pour inclure des données imprécises ou incertaines.

**Exemple :**  
Considérons le problème de cartographier la profondeur du toit d’un réservoir pétrolier. Les forages pétroliers sont coûteux et peu nombreux. Parfois, certains forages doivent être abandonnés après plusieurs centaines de mètres forés, avant d’atteindre le toit du réservoir.

Avec le krigeage ordinaire, il est difficile d’inclure ce type de données partielles. Avec le krigeage d’indicatrices (KI), le traitement est immédiat.

On a l’information suivante :  
\[
Z(x_i) > 500 \text{ m}
\]

On définit la variable indicatrice par :  
\[
I(x,c) = 
\begin{cases}
1 & \text{si } Z(x) \leq c, \\
0 & \text{sinon}.
\end{cases}
\]

Pour tous les seuils \( c \) inférieurs à 500 m, on peut coder  
\[
I(x_i, c) = 0,
\]
car on sait que la profondeur dépasse 500 m.

Pour les seuils supérieurs à 500 m, la donnée est manquante, donc on ne peut rien coder.

---

**Autre exemple dans le domaine pétrolier :**  
On peut aussi disposer de valeurs sismiques qui fournissent une estimation approximative, mais incertaine, de la profondeur du toit du réservoir. Ces profondeurs sismiques incertaines peuvent être représentées par des fonctions de distribution.

Ces fonctions de distribution peuvent alors être utilisées directement pour coder les indicatrices aux différents seuils, ce qui permet d’intégrer les incertitudes dans le krigeage.

---

Ainsi, le krigeage d’indicatrices s’adapte naturellement à la prise en compte de données partielles, manquantes ou incertaines, ce qui constitue un avantage important dans les applications pratiques.

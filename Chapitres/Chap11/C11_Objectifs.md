# 8.1 Objectifs des simulations géostatistiques

Une méthode de simulation **non-conditionnelle** vise à produire des champs présentant la même structure spatiale (variogramme) et le même histogramme que ceux inférés à partir des données observées. Lorsqu’on applique l’algorithme de simulation correspondant à une méthode donnée, on obtient une **réalisation**. On peut appliquer l’algorithme autant de fois que l’on souhaite, générant ainsi plusieurs réalisations indépendantes les unes des autres.

Une méthode de simulation **conditionnelle** vise les mêmes objectifs que la simulation non-conditionnelle, mais en plus, elle doit garantir que chaque réalisation soit compatible avec les valeurs observées aux points échantillons. Autrement dit, si on simule une valeur en un point où une observation existe, la valeur simulée doit être égale à la valeur réellement observée.

### Exemples de simulations en 1D

\[
\begin{array}{c}
\text{Simulations non-conditionnelles en 1D} \\
\text{Coordonnée} \quad \quad \text{Valeur simulée}
\end{array}
\]

---

### Notes :

- Pour répondre à des problèmes concrets, les simulations **conditionnelles** sont habituellement plus appropriées puisqu’elles utilisent l’information connue. Les simulations **non-conditionnelles** sont surtout utilisées pour tester des méthodes, modèles ou algorithmes.

- Les méthodes de simulation permettent de reproduire les statistiques d’ordre 1 (histogramme) et d’ordre 2 (variogramme). Les statistiques d’ordre supérieur ne peuvent généralement pas être spécifiées et dépendent de la méthode de simulation choisie et, dans le cas des simulations conditionnelles, des données conditionnantes. Une exception est la méthode du recuit simulé qui permet d’inclure des statistiques d’ordre supérieur.

- Les données conditionnantes influencent fortement les caractéristiques statistiques des réalisations, même pour les deux premiers ordres. Par exemple, on ne peut pas simuler un modèle de variogramme incompatible avec la structure spatiale des données conditionnantes. De plus, ces données confèrent une certaine robustesse aux résultats face au choix de la méthode de simulation.

- Ici, nous considérons uniquement la simulation d’une variable continue dans un domaine défini. Parfois, le problème est d’abord de simuler des objets (ex. lentilles, chenaux) dans lesquels on simule ensuite des variables quantitatives. On peut également vouloir simuler des variables discrètes (ex. types de roches), ce que nous n’aborderons pas dans ce chapitre.

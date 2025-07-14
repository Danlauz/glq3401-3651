# 6.4 Remarques concernant le calcul de variogrammes et l’ajustement de modèles

---

## Principes généraux

- On accorde plus de poids aux points du variogramme expérimental calculés avec beaucoup de paires.  
- On essaie d’avoir \( N(h) \geq 30 \) pour chaque point expérimental du variogramme. Si ce n’est pas possible pour certaines classes, on accorde moins d’importance à ces points. Si le nombre de paires est très faible (\( \leq 10 \)), on ne considère plus du tout le point.  
- On accorde plus de poids aux premiers points du variogramme (\( h \) petit) car ce sont ces valeurs qui ont le plus d'impact dans les calculs géostatistiques.  
- Lorsque \( h \) dépasse environ \( d_{\text{max}}/2 \), on ne tient pas compte des valeurs du variogramme. \( d_{\text{max}} \) est la taille du phénomène étudié dans la direction considérée.  
- On cherche à obtenir des modèles les plus simples possibles qui rendent bien compte des valeurs expérimentales.

---

## Stratégie de modélisation (cas 2D)

1. Calculer les variogrammes directionnels selon différentes directions (ex. 0°, 45°, 90°, 135°) ainsi que le variogramme omnidirectionnel (i.e. sans tenir compte de la direction).  
   La géologie peut apporter une information précieuse dans le choix des directions et la présence ou non d'anisotropies.

2. Vérifier les critères suivants :  
   - \( N(h) \geq 30 \)  
   - \( h < d_{\text{max}}/2 \)

3. Si nécessaire, augmenter la tolérance angulaire ou le pas de calcul de façon à augmenter \( N(h) \).

4. Déterminer s'il y a anisotropie (différences de palier ou de portées qui ne peuvent raisonnablement être imputées à des fluctuations aléatoires du variogramme).  
   Une bonne méthode consiste d'abord à ajuster le variogramme omnidirectionnel et de vérifier si ce modèle est acceptable pour les différents variogrammes directionnels.  
   L'effet de pépite et le palier en particulier devraient être estimés à l'aide du variogramme omnidirectionnel et gardés constants lors de l'ajustement des variogrammes directionnels.  
   Si les paliers changent d’une direction à l’autre, on peut soit essayer de modéliser une anisotropie zonale, soit adopter un palier compromis, surtout si l’ajustement est adéquat à courte distance.

5. Procéder à l'ajustement d'un modèle anisotrope ou isotrope selon le cas (habituellement par essai et erreur, bien que l'on puisse aussi obtenir ces ajustements de façon automatique par régression — pondérée, et souvent, non-linéaire).

6. Chercher à respecter la règle de la parcimonie : adopter les modèles les plus simples possibles qui permettent un ajustement adéquat.  
   Comparer des modèles concurrents à l'aide de la technique de validation croisée.

---

## Notes complémentaires

- Plus les classes sont larges, plus il y a de paires dans chaque classe, et plus le variogramme expérimental est lisse (et donc facile à modéliser), mais moins on a de définition pour connaître le comportement du variogramme, surtout à faible distance.  
  On cherche habituellement à avoir au moins trois ou quatre classes, et si possible davantage, avant d'atteindre le palier.

- Pour les variogrammes directionnels, plus l'angle de tolérance est grand, plus on a de paires pour chaque point du variogramme, mais moins le variogramme expérimental permettra de déceler les anisotropies.  
  On ne devrait pas excéder 22.5 degrés de part et d'autre de la direction considérée.  
  On peut descendre jusqu'à 0+ degrés si les données sont abondantes et sur une grille parfaitement régulière.  
  Une valeur typique pourrait être de 10 degrés de part et d'autre de la direction considérée.  
  On spécifie le calcul du variogramme omnidirectionnel en utilisant un angle de tolérance de 90 degrés de part et d'autre d'une direction arbitraire, le choix de la direction n'ayant dès lors aucune importance.

- Souvent en 3D, les seules directions pour lesquelles on peut véritablement calculer un variogramme fiable sont les directions prises le long des forages.  
  Une des raisons est que les trous de forage peuvent dévier considérablement, et que l'arpentage, même s'il a été réalisé, est souvent fort imprécis.  
  Les positions véritables des observations n'étant pas connues, l'effet de pépite est accru, la forme du variogramme expérimental est altérée, et les variogrammes deviennent plus erratiques.  
  Cet effet est particulièrement important dans le cas de gisements à faible continuité spatiale.

- Plusieurs problèmes 3D peuvent être simplifiés en problèmes 2D, notamment pour des gisements se présentant sous forme de veines minces.  
  Habituellement, on travaille alors avec l'accumulation de métal (produit épaisseur × teneur) et l'épaisseur de la veine, qui sont deux variables additives (alors que la teneur ne l'est pas dans ce cas).  
  On obtient la teneur estimée par division de l'accumulation estimée par l'épaisseur estimée.  
  Certains praticiens préfèrent toutefois travailler directement avec la teneur même si celle-ci n'est pas additive.  
  (Par « additif », on entend que la valeur de la variable sur une zone est donnée par la moyenne des valeurs des points de la zone. Si l'épaisseur d'une veine varie, alors la teneur pour une portion de la veine n'est plus égale à la teneur moyenne des points correspondants, mais plutôt à une moyenne pondérée par les épaisseurs).

---

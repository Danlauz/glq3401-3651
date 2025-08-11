# 3.5 Importance de la qualité de l’estimation des teneurs

La qualité de l’estimation des teneurs est extrêmement importante au plan économique. Il faut réaliser que la sélection s’effectue toujours à partir de valeurs estimées, mais que le métal contenu dans les blocs sélectionnés dépend de la teneur vraie et non de la teneur estimée. Deux paramètres influencent la qualité de l’estimation :  
- la quantité (et la qualité) d’information disponible  
- la qualité de la méthode d’estimation utilisée  

En général, les estimateurs peuvent être plus ou moins précis et peuvent être avec ou sans biais. Le meilleur estimateur est le plus précis possible et sans biais.  

Le biais peut être global ou conditionnel :  
- **Biais global** : la moyenne de tous les estimés ne coïncide pas avec la moyenne du gisement.  
- **Biais conditionnel** : la moyenne des blocs dont l’estimateur prend une valeur donnée ne coïncide pas avec cette valeur.  

Cette dernière propriété est plus difficile à rencontrer que le biais global, c’est-à-dire qu’un estimateur peut à la fois être globalement sans biais et présenter un fort biais conditionnel.  

Le biais global est habituellement rattaché à la qualité des données prélevées, et on ne peut y changer grand-chose. Il est souvent rencontré lorsqu’on échantillonne les forages de production ou les galeries. Par exemple, l'échantillonnage peut ne pas représenter équitablement toutes les granulométries présentes (phénomène de ségrégation), ce qui introduit normalement un biais. Au contraire, l’échantillonnage de carottes est habituellement sans biais, du moins lorsque la récupération de la carotte est complète.  

Le biais conditionnel, lui, est davantage lié au type d’estimateur choisi. Un des estimateurs qui montre le moins de biais conditionnel est le krigeage (que nous verrons plus tard). Toutes les méthodes basées sur des extensions géométriques (par exemple, plus proche voisin, inverse de la distance, méthodes des sections, méthodes des triangles) montrent habituellement un biais conditionnel qui peut être assez important.  

Il faut bien comprendre que toute opération sélective s’effectue à partir de valeurs estimées, jamais à partir des vraies valeurs des blocs qui sont inconnues. Le [diagramme %s](#C3_Biais) suivant aide à comprendre les conséquences importantes de cet état de fait : 

```{figure} images/C3_Biais.png
:label: C3_Biais
:align: center 
Typologie des biais en estimation de ressources : Absence et présence de biais globale et/ou de biais conditionnelle.  
``` 

---

Les ellipses représentent l’ensemble des valeurs possibles pour l’estimateur et les vraies valeurs.  
- Les deux diagrammes du haut montrent des estimateurs sans biais et sans biais conditionnel.  
- Ils sont sans biais car la valeur moyenne sur l’axe des x est égale à la valeur moyenne sur l’axe des y.  
- Ils sont sans biais conditionnel car si l’on trace une droite parallèle à l’axe des y (fixant la valeur estimée), la valeur moyenne obtenue tombe sur la droite à 45° (i.e. la moyenne des vraies valeurs est égale à l’estimé pour chaque valeur de l’estimé).  

Le diagramme de gauche montre un estimateur moins précis que celui de droite. Il est facile de voir que le taux de mauvaise classification \((1+3)/(1+2+3+4)\) est beaucoup plus faible avec le meilleur estimateur. Conséquemment, plus de métal sera récupéré, moins de dilution sera encourue et plus de profits seront obtenus.  

Dans les deux cas, on obtiendra à peu près ce qui était prévu par l’estimateur en termes de tonnage et de teneur au-dessus de la teneur de coupure. La différence entre les deux estimateurs est ici sans doute due essentiellement à la quantité d’information disponible. Ceci démontre qu’il peut être très rentable d’obtenir cette information.  

---

Le cas des deux estimateurs du bas est plus grave :  
- Celui de gauche est sans biais global mais montre un biais conditionnel prononcé.  
- Celui de droite est biaisé globalement et conditionnellement.  

Dans les deux cas, on récupérera, pour un tonnage fixé, beaucoup moins de métal que prévu au moment de l’estimation (dilution de nature statistique). Ces deux graphes correspondent à la situation la plus courante dans les mines.  
L’exemple de droite correspond à l’estimation que l’on pourrait obtenir à partir de données fortement biaisées, comme celles parfois rencontrées avec les forages de production.  

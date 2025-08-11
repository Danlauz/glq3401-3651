# 1.1 - Effet de support

En géostatistique minière, le support désigne la taille du volume sur lequel une teneur en minerai est mesurée ou estimée.  Imaginez-le comme l'objectif d'une caméra : la taille de cet objectif influence directement ce que vous voyez et comment vous le percevez.

```{dropdown} **Support)**
Le support est la taille physique, caractérisée par une géométrie et une orientation, du volume sur lequel est mesurée la variable régionalisée. 
```

Une petite carotte de forage, par exemple, représente un support très fin, offrant une vue extrêmement précise et locale de la teneur à un point donné. En revanche, un bloc minier correspond à un support beaucoup plus vaste. À cette échelle, les teneurs ne sont plus mesurées directement ; elles sont plutôt estimées en combinant les données des forages. La teneur ainsi attribuée à un bloc n'est qu'une estimation, sa valeur réelle ne sera connue qu'une fois le minerai traité.

Ce changement d'échelle – du forage au bloc – a un impact fondamental : c'est ce qu'on appelle l'effet de support. Plus le support est grand, plus les valeurs de teneur sont lissées ou moyennées. Cela signifie que les teneurs extrêmes (très hautes ou très basses) sont diluées par les valeurs avoisinantes. Comprendre et quantifier cet effet est crucial pour obtenir une estimation fiable et réaliste des ressources minières.

La [Fig. %s](#C1_Support.png) (flèches rouges) illustre parfaitement un aspect essentiel de l'effet de support. Elle démontre comment deux gisements, bien que présentant une teneur moyenne et une variabilité comparables à l'échelle des forages, peuvent afficher des résultats très différents une fois leurs teneurs estimées à l'échelle des blocs. Ces écarts proviennent directement de la continuité spatiale du minerai. Par exemple, si un gisement contient des zones riches très discontinues, un grand bloc aura pour effet de diluer davantage ces fortes teneurs que dans un gisement où le minerai est distribué de manière plus continue.

👉 Pour visualiser concrètement cet effet, explorez l'atelier interactif sur l'effet de support. En faisant varier la taille des blocs, vous pourrez observer par vous-même comment les statistiques du gisement évoluent et comprendre l'impact sur l'estimation des réserves.

Généralement, plus un bloc est grand, plus les zones riches sont "diluées" par les zones de moindre teneur qui l'entourent. Cela conduit souvent à une teneur moyenne récupérée plus faible avec de gros blocs qu'avec de petits, car les hautes teneurs, qui sont des événements relativement rares, sont moyennées sur un plus grand volume.

🎨 Petite analogie : Imaginez que vous versez une petite goutte de peinture très colorée dans un petit pot de peinture blanche. La couleur résultante sera vive et facilement visible. Maintenant, prenez cette même petite goutte de peinture colorée, mais cette fois, mélangez-la dans un grand seau rempli de peinture blanche. La couleur va alors se diluer fortement, et la différence sera à peine perceptible. C’est exactement ce qui arrive avec les hautes teneurs en minerai quand on les moyenne sur un grand volume : la concentration élevée se dilue, et la teneur moyenne du bloc finit par ressembler à la teneur moyenne de tout le gisement.

Bien qu'il soit tentant d'exploiter des blocs plus petits pour limiter cette dilution et maximiser la récupération, cela n'est pas toujours viable. La taille des blocs est en réalité dictée par des contraintes opérationnelles et techniques : les capacités des équipements miniers, les normes de sécurité, la stabilité des excavations, et d'autres facteurs pratiques. Au final, on ne peut pas "creuser des blocs à la petite cuillère" !

En tant que futurs ingénieurs, maîtriser l'effet de support est fondamental. Cette compréhension permet d'adapter les plans d'exploitation aux réalités du terrain et de choisir le scénario qui maximise la rentabilité du projet, tout en respectant l'ensemble des contraintes. La géostatistique se révèle alors un outil puissant : elle permet de quantifier ces effets, devenant ainsi une aide précieuse à la décision pour optimiser la valeur des ressources minières.

```{figure} images/C1_Support.png
:label: C1_Support.png
:align: center 
Effet de support : Influence combinée de la taille du support et de la structure spatiale sur la variabilité des teneurs dans un gisement. Le gisement A possède une grande continuité spatiale, tandis que le gisement B a une continuité plus faible. Ainsi, le gisement B est plus sensible au changement de support que le gisement A.
``` 

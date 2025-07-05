# 🔍➡️🧊 Effet de support

En géostatistique minière, le support désigne la taille de la zone sur laquelle une teneur en minerai est mesurée ou estimée. On peut le comparer à une loupe à travers laquelle on observe le gisement. 

Une petite loupe représente une carotte de forage : on voit très localement, avec précision, exactement ce qui a été extrait à cet endroit. En revanche, une grande loupe correspond à la taille d’un bloc minier : on observe une zone plus large, mais les détails sont moins visibles. À cette échelle, on ne mesure plus directement les teneurs ; on les estime en pondérant les données issues des forages. Ce changement d’échelle — du forage au bloc — a un impact majeur : plus le support est grand, plus les valeurs sont lissées, ce qui peut modifier notre perception du gisement. Comprendre cet effet est essentiel pour une estimation fiable et réaliste des ressources minières.

Imaginons deux gisements qui, à l’échelle des forages, présentent les mêmes statistiques : même teneur moyenne, même variabilité. On pourrait croire qu’ils seront exploités de manière similaire. Mais une fois passés à l’échelle des blocs, les différences apparaissent. Les teneurs sont lissées différemment selon la répartition spatiale du minerai ([Fig. %s](#Chap1_Support.png), flèches rouges) à cause de la continuité spatiale du gisement.

👉 Pour mieux visualiser ce phénomène, consultez l’atelier interactif sur l’effet de support. Amusez-vous à faire varier la taille des blocs et observez les différences dans les statistiques.

En général, plus un bloc est grand, plus il contient de zones pauvres en minerai, car des teneurs élevé sont des évènements rares. Cela signifie qu’on récupère souvent moins de métal avec de gros blocs qu’avec de petits, car les zones riches sont diluées avec des zones stériles.

🎨 Petite analogie : imagine que tu mélanges une cuillère de peinture rouge dans un petit pot de peinture blanche — le rouge reste visible. Fais la même chose dans un grand seau, et tu obtiens un rose pâle presque blanc. Même principe pour les teneurs : plus le bloc est gros, plus les fortes teneurs sont diluées.

Bien sûr, il serait tentant d’exploiter de petits blocs pour réduire l'impact des dilutions. Mais cela n’est pas viable d’un point de vue opérationnel. Il faut tenir compte des capacités des machines, des exigences de sécurité, ainsi que de la stabilité des excavations et bien d'autres facteurs. On ne va pas creuser des blocs minuscules juste pour optimiser la sélection. Personne n’extrait du minerai à la cuillère ! C’est pourquoi la taille des blocs est avant tout déterminée par les contraintes techniques et opérationnelles de la mine.

En tant que futurs ingénieurs, il est essentiel de bien comprendre l’effet de support. Cela permet de mieux adapter les plans d’exploitation aux réalités du terrain et de choisir, parmi les scénarios possibles, celui qui maximise la rentabilité en tenant compte des contraintes opérationnelles. C’est là que la géostatistique devient un véritable outil d’aide à la décision.

```{figure} images/Chap1_Support.png
:label: Chap1_Support.png
:align: center 
Effet de support. La variabilité d'un gisement change selon la taille du support, mais aussi à cause de sa structure spatiale.
``` 

# 12.1 Simulation séquentielle d'indicatrices
La simulation séquentielle d’indicatrices permet de modéliser la présence ou l’absence de faciès à partir de variables binaires (0 ou 1). Le processus repose sur une approche séquentielle similaire à celle de la simulation séquentielle gaussienne (SGS) utilisée pour les variables continues gaussiennes, mais adaptée ici au cas des variables catégorielles.

## Algorithme

La méthodologie est très similaire à celle de la simulation séquentielle gaussienne ; il s’agit de son analogue dans le domaine catégoriel. Nous visitons les points de la grille selon un chemin aléatoire afin de simuler, à chaque emplacement, un faciès parmi les $k$ faciès possibles. La différence fondamentale réside dans la distribution utilisée : au lieu de tirer une valeur selon une distribution gaussienne conditionnelle obtenue par krigeage simple, nous tirons un faciès à partir d’une distribution catégorielle obtenue par krigeage d’indicatrices.

Concrètement, pour chaque faciès, on effectue un krigeage d’indicatrice afin d’estimer la probabilité que ce faciès soit présent au point considéré. Une fois les $k$ probabilités calculées (une par faciès), on forme un vecteur de probabilités qui doit sommer à 1. On tire ensuite au hasard un faciès selon cette distribution conditionnelle, ce qui permet d’obtenir le faciès au premier point visité. Comme pour la SGS, le faciès simulé est ajouté aux données conditionnantes (simulées et observées), puis l’on passe au point suivant, toujours choisi aléatoirement.


L’algorithme peut alors être expliqué comme suit :

Soit $Z(x)$ un champ de $k$ faciès et soit $Z(x_i)$, $i = 1, \ldots, N$, $N$ faciès observés :

On cherche à simuler $Z(x_j)$ en $n$ emplacements $x_j$, $j = 1, \ldots, n$, conditionnellement à $Z(x_i), i = 1, \ldots, N$. 

Les étapes sont :

a) Coder chaque faciès $k$ par une indicatrice différente ;

b) Choisir un point $x_j$ aléatoirement et kriger les $k$ faciès en ce point conditionnellement aux données déjà simulées et observées pour obtenir les probabilités d'observer les $k$ faciès au point simulé soit les $p_i, i = 1, \ldots, k$ ;

c) Normaliser les probabilités $p_i$ (t.q. $\sum_{i=1}^k p_i = 1$ et $p_i \\ge 0,\ \forall i$) ;

d) Tirer une valeur aléatoire de la loi $U(0,1)$, ce qui détermine le faciès simulé au point $x_j$ ;

e) Introduire le point $x_j$ aux données simulées et refaire le processus pour tous les points $x_j$ restants  

&nbsp;  (retour à l’étape b).

---

## Remarques
1. Spatialement, toutes les transitions entre faciès sont possibles, car la méthode n’intègre aucune règle géologique explicite concernant l’ordre ou la compatibilité des contacts. Ainsi, des faciès qui ne devraient normalement jamais se toucher peuvent apparaître en contact direct dans les réalisations simulées si les données ne l’interdisent pas explicitement.
2. La méthode reproduit correctement les variogrammes d’indicatrices, garantissant une continuité spatiale conforme pour chaque faciès pris individuellement. Toutefois, elle ne reproduit pas les covariances croisées entre indicatrices, puisqu’elles ne sont pas utilisées dans le processus. En conséquence, les relations spatiales entre faciès — par exemple la tendance d’un faciès à en envelopper un autre, ou la présence de séquences privilégiées — ne sont pas modélisées, ce qui limite la représentation de structures géologiques complexes.
3. Tout comme dans la méthode SGS, l’utilisation d’un voisinage restreint peut nuire à la reproduction des structures spatiales définies par le variogramme de chaque indicatrice. Un voisinage trop petit, mal orienté ou hybride peut conduire à des réalisations biaisées qui ne respectent pas pleinement la continuité spatiale théorique du modèle.
4. Comme la méthode repose sur la simulation d’indicatrices, il est impossible d’obtenir des faciès présentant des frontières lisses. En conséquence, certains modèles de covariances — notamment le modèle gaussien — ne peuvent pas être reproduits par le SIS.
5. La méthode reste largement utilisé pour modéliser des faciès aux formes imprécises ou indéfinies, ou lorsque peu de données d'entrée sont disponibles.

---

## Exemples
La [Fig. %s](#C12_SIS1) présente une réalisation avec les probabilités $p_1 = \frac{1}{3}$, $p_2 = \frac{1}{2}$ et $p_3 = \frac{1}{6}$, en utilisant un variogramme sphérique de portée $a = 50$. Les faciès sont représentés par les couleurs suivantes : bleu pour $p_1$, vert pour $p_2$ et brun pour $p_3$. Notez que toutes les transitions possibles sont observées dans les deux sens et dans toutes les directions.


```{figure} images/C12_SIS1.png
:label: C12_SIS1
:align: center
Simulation 2D isotrope.
``` 

La [Fig. %s](#C12_SIS2) présente une réalisation avec les probabilités $p_1 = \\frac{1}{3}$, $p_2 = \frac{1}{2}$ et $p_3 = \frac{1}{6}$, en utilisant un variogramme sphérique anisotrope de portée $a_x = 200$ et $a_y = 10$. Les faciès sont représentés par les couleurs suivantes : bleu pour $p_1$, vert pour $p_2$ et brun pour $p_3$. On se rapproche plus d'une cas réaliste d'unité sédimentaire, mais néanmoins toutes les transitions sont possibles


```{figure} images/C12_SIS2.png
:label: C12_SIS2
:align: center
Simulation 2D anisotrope.

``` 

La [Fig. %s](#C12_SIS3) présente une réalisation d’un modèle 3D plus réaliste obtenu par simulation séquentielle d’indicatrices. On observe que toutes les transitions entre faciès sont possibles. Il est important de rappeler que cette méthode est très utile dans des contextes où peu de données sont disponibles (les forages, représentés par les lignes noires) et lorsque les faciès présentent des formes imprécises ou difficilement définissables. Autrement dit, elle convient particulièrement aux situations où l’on dispose de peu d’information sur la connectivité et l’organisation spatiale des unités géologiques.


```{figure} images/C12_SIS3.png
:label: C12_SIS3
:align: center
Une réalisation 3D plus réaliste d’un cas d’application réel.
``` 
# Influence de la distribution sur la teneur optimale et le profit

La [Fig. %s](#Chap3_Variance) illustre l'effet d'utiliser la mauvaise
distribution pour déterminer la teneur de coupure optimale pour un même
gisement. Supposons que les calculs ont été faits pour un ensemble de
paramètres identiques sauf que l'on a considéré deux lois lognormales de
variances différentes. (Paramètres utilisés: m=1.32\$/t minéral; y=.87;
p=600\$/t métal ; k=0;h=3.41\$/t minerai; f=11.9M\$; F=0M\$; M=12Mt;
H=3.9Mt; K=.085Mt). Sur la figure gauche, l'optimum est atteint à
l'équilibre mine-concentrateur (c=0.79%) et rapporte un profit de
0.72\$/t minéral. Sur celle de droite, l'optimum est atteint à la teneur
de coupure 0.93% et un profit de 0.36\$/t minéral en résulte.

```{figure} images/Chap3_Variance.png
:label: Chap3_Variance.png
:align: center 
Impact de la variance sur le teneur de coupure.
``` 

L'exemple précédent montre combien les calculs économiques sont
tributaires d'une bonne description statistique du gisement. Le gisement
présente une valeur nette 2 fois plus petite si $\sigma = 2\%^2$ que si
$\sigma=4\%^2$ . Ceci correspond à une erreur fréquente pour ce genre
d'étude: on estime les teneurs de blocs par des estimateurs qui montrent
une variance plus grande que les blocs réels. On prédit alors des
profits irréalistes qui ne pourront se réaliser. Pour éviter les
mauvaises surprises, il faut s'assurer que l'on utilise la variance des
teneurs des blocs qui pourront être sélectionnés. Comme la sélection
s'effectue sur des valeurs estimées, c'est en réalité la variance des
valeurs estimées qu'il faut utiliser, pourvu que l'estimateur soit sans
biais conditionnel. On peut montrer (voir partie géostatistique) qu'un
estimateur, pour être sans biais conditionnel, doit nécessairement être
moins variable que les blocs qu'il cherche à estimer. Les teneurs
réelles des blocs sont elles-mêmes moins variables que les teneurs des
carottes prélevées dans le gisement (effet support).
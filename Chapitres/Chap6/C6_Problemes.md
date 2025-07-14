\# 6.5 Problèmes courants avec les variogrammes et solutions possibles



---



\## Données extrêmes



Le variogramme étant une moyenne de différences au carré, il est clair que la contribution d'une donnée extrême peut être déterminante.



\- Si la localisation d'une donnée extrême est telle qu'elle apparaît plus souvent dans certaines classes de distance que d'autres, alors le variogramme sera très bruité.  

\- Si elle est située en périphérie du domaine, elle introduira une tendance croissante sur le variogramme.  

\- Si elle est située au centre, elle introduira plutôt une tendance décroissante.



Comme on le voit, la position de la valeur extrême dans le champ a une influence prépondérante sur la forme du variogramme.



\### Solutions possibles :



\- Si la donnée extrême est une erreur, on l'enlève tout simplement.  

\- Enlever la donnée extrême pour le calcul et la modélisation du variogramme afin de mieux cerner la structure spatiale sous-jacente.  

&nbsp; Toutefois, il faut remettre cette donnée au moment de l'estimation.  

&nbsp; Généralement, il faut aussi modifier le modèle de façon à ce que son palier reflète mieux la variance des données lorsque les données extrêmes s'y trouvent (par exemple, ajout d'un effet de pépite ou multiplication de \\(C\\) et \\(C\_0\\) par une constante appropriée).  

\- Transformer les données de façon à diminuer l'influence des données extrêmes (ex. couper les valeurs extrêmes à un seuil maximal, prendre le logarithme, la racine carrée, etc.).  

&nbsp; On peut par la suite identifier les grandes caractéristiques du variogramme (modèle, isotropie-anisotropie, importance approximative de \\(C\_0/(C\_0+C)\\)) avec les données transformées puis on cherche à retrouver ces caractéristiques sur les variogrammes expérimentaux.  

&nbsp; Normalement, on ne peut estimer les valeurs transformées car la transformation inverse pose un problème de biais difficile à contourner.  

\- Utiliser un estimateur robuste aux données extrêmes (ex. au lieu de prendre la moyenne des écarts-carrés, on pourrait en prendre la médiane).  

&nbsp; Toutefois cet estimateur sous-estime la variabilité spatiale et il doit être modifié pour tenir compte de ce fait.



---



\## Pas d'échantillonnage variable selon les zones d'un gisement



Exemple :  

\- \*\*Zone A\*\* (pas de 2 m) : valeurs peu variables (4, 4, 5, 6, 6, 7, 6, 5, 4)  

\- \*\*Zone B\*\* (pas de 1 m) : valeurs plus variables (8, 6, 8, 10, 12, 8, 10, 12, 14, 10, 8, 6, 12, 8, 10, 10, 8, 10, 0)  



Le variogramme A est plus bas car la zone A est moins variable.  

Le variogramme B est plus élevé car la zone B est la plus variable.  

Le variogramme A+B est un mélange des 2 zones.  

Cependant, comme les pas d'ordre impair (1,3,5...) n'apparaissent pas dans la zone A, le variogramme A+B est identique au variogramme B pour ces pas.



\### Solutions possibles :



\- Séparer en 2 zones d'étude distinctes si possible.  

\- Sinon, uniformiser l'échantillonnage, par exemple en prenant 1 point sur 2 dans la zone B.



---



\## Ré-échantillonnage des zones riches



Un problème semblable survient lorsqu'on échantillonne préférentiellement à proximité des valeurs fortes (pour "confirmer" certaines valeurs).  

Comme les distributions des teneurs des gisements typiques sont fortement asymétriques avec peu de valeurs fortes, les chances sont grandes qu'une valeur forte ne soit pas "confirmée".  

On aura donc plusieurs valeurs fortes accompagnées de valeurs nettement plus faibles à proximité.  

Les seules paires de données à petite distance peuvent provenir précisément de ces ré-échantillonnages.  

Conséquemment, cela aura pour effet de faire paraître la continuité spatiale beaucoup moins forte qu'elle ne l'est réellement.



\*\*Exemple :\*\*  

On simule 225 valeurs sur une grille régulière de pas 1 (15×15).  

On décide d'échantillonner les 10 valeurs les plus fortes en se plaçant à 0.1 (en x) du point.  

Les 3 variogrammes obtenus correspondent à :  

1\. Les 225 points  

2\. Les 225 points + les 10 "doublons"  

3\. Les 225 points + les 225 "doublons" (chaque point est ré-échantillonné à 0.1 de façon systématique)



\### Solutions possibles :



\- Éviter les stratégies d'échantillonnage biaisées vers les valeurs fortes.  

\- Décimer l'échantillon pour assurer une couverture uniforme partout.



---



\## Erreurs de localisation



Les erreurs de localisation faussent les distances et donc le variogramme expérimental.  

Certaines paires à petites distances seront considérées comme à des distances plus grandes qu’elles ne le sont réellement, et vice-versa.  

L'effet net est d'augmenter l'effet de pépite apparent sur le variogramme.



\*\*Exemple :\*\*  

On simule 225 données sur une grille régulière 15×15 de pas 1.  

On suppose que chaque point a été mal localisé avec une erreur ±1 en x et y.  

Les variogrammes obtenus avec les localisations vraies et erronées montrent l’impact.



\### Solutions possibles :



\- Localiser avec soin les données.  

\- Si la distribution des erreurs de localisation est connue, essayer d'en tenir compte lors de l'estimation (il subsiste quand même une perte d'information substantielle).



\*\*Note :\*\*  

Ce problème est particulièrement aigu avec des données de forages (3D) qui dévient souvent de façon importante et pour lesquels les mesures de déviation ne sont pas toujours précises.



---



\## Systèmes de coordonnées géologiques



Une bonne connaissance de la géologie peut parfois permettre de définir un système de coordonnées plus naturel pour le phénomène étudié.



\*\*Illustration :\*\*  

Un gisement formé dans des roches sédimentaires (ex. skarn) montre une continuité spatiale dictée par la minéralisation.



Supposons qu'un événement tectonique tardif plisse les roches.  

Les distances entre points après plissement sont modifiées, altérant la structure spatiale.  

Lorsque la tectonique n’est pas trop compliquée et que la géologie est bien connue, il est possible de "déplisser" le gisement pour retrouver les positions originales des points et mieux décrire la structure spatiale.



\### Exemples géologiques concernés :  

\- Structures plissées  

\- Minéralisation ou hydrocarbures liés à la présence de chenaux  

\- Contamination se déplaçant dans l'eau souterraine suivant les directions d'écoulement



\*\*Remarque :\*\*  

La transformation des coordonnées demande une très bonne connaissance géologique du terrain.



---




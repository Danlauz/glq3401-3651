
# 6.5 Problèmes courants avec les variogrammes et solutions possibles

---

## Données extrêmes

Le variogramme étant une moyenne de différences au carré, il est clair que la contribution d'une donnée extrême peut être déterminante. Si la localisation d'une donnée extrême est telle qu'elle apparaît plus souvent dans certaines classes de distance que d'autres, alors le variogramme sera très influencé par la données extrême.

La [Fig. %s](#C6_Extreme) montre trois scénarios ayant la même variance, mais dont un scénario n'a pas de valeur extreme (bleu), une données extreme aucentre (orange) et une donnes extreme sur les bord du domaine (vert). Si la donnee extreme est située en périphérie du domaine, elle introduira une tendance croissante sur le variogramme, la courbe verte ne cesse d'augmenter. Si elle est située au centre, elle introduira plutôt une tendance décroissante, a un certain distance, la données n'est plus pris en compte dans le calcul et la variabilité chute significativement. Comme on le voit, la position de la valeur extrême dans le champ a une influence prépondérante sur la forme du variogramme.

```{figure} images/C6_Extreme.PNG
:label: C6_Extreme
:align: center
Impact des données extrêmes sur le variogramme expérimental.
```


Il existent plusieurs solutions : 

1. Si la donnée extrême est une erreur, on l'enlève tout simplement.  
2. Enlever la donnée extrême lors du calcul et la modélisation du variogramme afin de mieux cerner la structure spatiale sous-jacente. Toutefois, il faut remettre cette donnée au moment de l'estimation. Généralement, il faut aussi modifier le modèle de façon à ce que son palier reflète mieux la variance des données lorsque les données extrêmes s'y trouvent (par exemple, ajout d'un effet de pépite ou multiplication des $C_i$ et $C_0$ par une constante appropriée).  
3. Transformer les données de façon à diminuer l'influence des données extrêmes (ex. couper les valeurs extrêmes à un seuil maximal, prendre le logarithme des teneurs, la racine carrée, etc.). On peut par la suite identifier les grandes caractéristiques du variogramme (modèle, isotropie-anisotropie, importance approximative de $C_0/(C_0+C_i)$) avec les données transformées puis on cherche à retrouver ces caractéristiques sur les variogrammes expérimentaux. Normalement, on ne peut estimer les valeurs transformées, car la transformation inverse pose un problème de biais difficile à contourner.  
4. Utiliser un estimateur robuste aux données extrêmes (ex. au lieu de prendre la moyenne des écarts-carrés, on pourrait en prendre la médiane). Toutefois cet estimateur sous-estime la variabilité spatiale et il doit être modifié pour tenir compte de ce fait.

---

## Erreurs de localisation

Les erreurs de localisation faussent les distances entre les données, ce qui altère directement le calcul du variogramme expérimental.  
Certaines paires de points proches peuvent être perçues comme étant plus éloignées qu’elles ne le sont réellement, et inversement.  
L'effet global est une augmentation apparente de l’effet de pépite, car la structure spatiale à courte distance est perturbée.

Dans l’exemple ci-dessous, on simule 400 données sur une grille régulière de taille 100 m × 100 m avec un pas de 5 m entre les forages.  
On suppose ensuite que chaque point est mal localisé selon une erreur aléatoire suivant une loi normale centrée, de variance $\sigma^2 = 2$, indépendamment en $x$ et en $y$.  

La [Fig. %s](#C6_EreurLocBruit) montre les variogrammes expérimentaux pour les localisations exactes (en bleu) et erronées (en orange).  
On peut observer un effet de pépite $C_0 \approx 0{,}4$ pour les données erronées, tandis que le jeu de données original n’en présente aucun par construction. On observe ainsi une distorsion des statistiques à courte distance.

Pour atténuer ce problème, on recommande :

1. De localiser avec soin les données dès la collecte ;  
2. Si la distribution des erreurs de localisation est connue, d’en tenir compte dans les estimations (même si une perte d'information subsiste).

> **Note :**  
> Ce problème est particulièrement critique avec des données de forages (3D), où les trajectoires peuvent dévier de manière significative.  
> Les mesures de déviation sont parfois imprécises, ce qui accroît l’effet de pépite apparent et rend les variogrammes plus erratiques.

```{figure} images/C6_EreurLocBruit.PNG
:label: C6_EreurLocBruit
:align: center
Effet d'erreur de localisation sur le variogramme expérimental.
```

---

## Pas d'échantillonnage variable selon les zones d'un gisement

Supposons que nous avons deux zones de notre gisement échantillonné avec des pas différent. Les deux profils sont superposé sur la meme [Fig. %s](#C6_pas). En bleu, la Zone A, échantillonnée tous les 2 mètres, présente des valeurs peu variables. En orange, la Zone B, échantillonnée tous les 1 mètre, présente des valeurs plus variables. Le variogramme expérimental de la Zone A est plus bas, car la variabilité spatiale y est plus faible. À l’inverse, celui de la Zone B est plus élevé, car la variabilité y est plus forte. Le variogramme combiné A+B est un mélange des deux comportements. Cependant, comme la Zone A n’apporte aucune information aux distances impaires (1 m, 3 m, 5 m, etc.), le variogramme A+B est identique à celui de la Zone B pour ces distances. Cela peut conduire à une surestimation de la variabilité si l’on ne tient pas compte de cette hétérogénéité dans l’échantillonnage.

```{figure} images/C6_Pas.PNG
:label: C6_Pas
:align: center
Impact du pas d'échantillonnage sur le variogramme expérimental.
```

Pour atténuer ce problème, on recommande :

1. Séparer en 2 zones d'étude distinctes si possible.  
2. Uniformiser l'échantillonnage, par exemple en prenant 1 point sur 2 dans la zone B.

---

## Plusieurs domaines

Même avec un pas d’échantillonnage identique, il est important de garder à l’esprit que le variogramme omnidirectionnel, calculé sur l’ensemble d’un gisement, peut parfois masquer la présence de domaines géologiques distincts.

La [Fig. %s](#C6_Domaines) illustre un gisement composé de deux domaines ayant des structures spatiales très différentes. La courbe orange correspond au domaine de gauche, plus variable, tandis que la courbe bleue représente le domaine de droite, moins variable. Malgré cette différence marquée, le variogramme expérimental omnidirectionnel combiné (A+B) est très lisse et facilement modélisable. Rien n’indique clairement la présence de deux domaines distincts.

Cela démontre qu’un beau variogramme peut en réalité cacher une hétérogénéité géologique importante. Il est donc essentiel d’utiliser des techniques de validation croisée pour détecter ce phénomène. Nous verrons ces techniques en détail lors de l’introduction au krigeage. 

```{figure} images/C6_Domaines.PNG
:label: C6_Domaines
:align: center
Impact de deux domaines géologiques distincts côte à côte sur le variogramme expérimental.
```

---

## Ré-échantillonnage des zones riches

Un problème semblable survient lorsqu'on échantillonne préférentiellement à proximité des valeurs fortes (pour "confirmer" certaines valeurs).  
Comme les distributions des teneurs des gisements typiques sont fortement asymétriques avec peu de valeurs fortes, les chances sont grandes qu'une valeur forte ne soit pas "confirmée". On aura donc plusieurs valeurs fortes accompagnées de valeurs nettement plus faibles à proximité. 
 
Les seules paires de données à petite distance peuvent provenir précisément de ces ré-échantillonnages. Conséquemment, cela aura pour effet de faire paraître la continuité spatiale beaucoup moins forte qu'elle ne l'est réellement.

Par exemple, la [Fig. %s](#C6_Doublons) est calculé èa partir d'une simulation de 225 valeurs sur une grille régulière de pas 1 (15×15). On décide d'échantillonner les 10 valeurs les plus fortes en se plaçant à 0.1 (en x) du point. Les 3 variogrammes obtenus correspondent à :
1. Les 225 points  (bleu)
2. Les 225 points + les 10 "doublons"  (orange)
3. Les 225 points + les 225 "doublons" (chaque point est ré-échantillonné à 0.1 de façon systématique) (vert)

On constate l’impact du rééchantillonnage uniquement des valeurs fortes. Un important effet de pépite en paraît. Seriez-vous capable de l’expliquer ? Sinon, lorsque l’on rééchantillonne systématiquement tous les forages, l’effet est moindre, voire inexistant.

```{figure} images/C6_doublons.PNG
:label: C6_Doublons
:align: center
Impact de deux domaines géologiques distincts côte à côte sur le variogramme expérimental.
```

Les deux solutions possibles sont :

1. Éviter les stratégies d'échantillonnage biaisées vers les valeurs fortes.  
2. Décimer l'échantillon pour assurer une couverture uniforme partout.

---

## Systèmes de coordonnées géologiques

Une bonne connaissance de la géologie peut parfois permettre de définir un système de coordonnées plus naturel pour représenter le phénomène étudié. Supposons un gisement formé dans des roches sédimentaires (par exemple un skarn), où la continuité spatiale est dictée par la minéralisation.

Imaginons maintenant qu’un événement tectonique tardif ait plissé ces roches. Les distances entre les points, après plissement, sont alors modifiées, ce qui altère la structure spatiale observée. Lorsque la tectonique n’est pas trop complexe et que la géologie est bien connue, il est possible de « déplisser » le gisement, c’est-à-dire de retrouver approximativement les positions originales des points, pour mieux représenter la structure spatiale initiale. La [Fig. %s](#C6_pas) illustre un exemple très simplifié : on observe un pli sinusoïdal perturbant les coordonnées. Dans cette situation, le pli induit un effet de pépite plus marqué. En revanche, après transformation des coordonnées pour déplisser le gisement, l’effet de pépite diminue fortement. Cela permet de révéler la structure spatiale d’origine, correspondant à la phase de déposition de la minéralisation, c’est-à-dire avant le plissement.

Il existe plusieurs exemples géologiques où un changement de système de coordonnées est bénéfique : formations plissées, minéralisations ou réservoirs d’hydrocarbures contrôlés par des chenaux, contaminations se déplaçant dans les eaux souterraines selon les lignes d’écoulement.

**Remarque** :
La transformation des coordonnées nécessite une très bonne compréhension de la géologie locale.

```{figure} images/C6_Plissement.PNG
:label: C6_Plissement
:align: center
Impact du pas d'échantillonnage sur le variogramme expérimental.
```

---


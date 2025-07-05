# Effet d'information

La quantité de forages joue également un rôle clé dans l'estimation des
ressources. Il est évident qu'il est beaucoup plus facile d'estimer une
valeur à une position donnée avec un million d'observations qu'avec une
seule. En effet, plus nous disposons de données, plus nos estimations
seront fidèles à la réalité se trouvant sous nos pieds. Ce phénomène est
connu sous le nom d'effet d'information.

Cependant, cet effet n'est pas entièrement lié à la quantité de données.
Il est tout aussi important de considérer leur qualité. Dans de futures
lectures, nous démontrerons qu'il est crucial de bien positionner les
forages afin de maximiser le gain d'information tout en limitant le
nombre de forages. En somme, ajouter un forage supplémentaire dans une
petite zone déjà densément couverte n'apporte pas nécessairement
beaucoup d'information additionnelle. Le gain serait faible, et il
conviendrait alors de réfléchir (voire de calculer) son positionnement
pour maximiser son utilité ailleurs dans la mine.

Par ailleurs, les informations issues des forages sont souvent entachées
d'erreurs : erreurs d'analyse des teneurs, erreurs de localisation des
carottes dans l'espace, erreurs de modélisation numérique, etc. En fin
de compte, nos observations ne correspondent pas toujours à la teneur
réelle sur le terrain. Il y aura donc toujours une forme de biais ou
d'erreur, ce qui empêche de garantir que la teneur mesurée est égale à
la teneur réelle.

Ainsi, on récupère toujours moins de métal avec des estimations qu'avec
les vraies valeurs, car les décisions sont prises à partir d'estimations
imparfaites, tandis que l'exploitation repose sur la réalité géologique non-connue.
Ce principe peut être relié aux notions de faux positifs et faux
négatifs.

La [Fig. %s](#Chap1_Information.png) illustre de façon simplifiée les
différences entre les teneurs estimées et les teneurs réelles, mesurées
après exploitation. Nous prenons nos décisions en fonction des
estimations : tout le matériel situé à droite de la ligne verticale sera
donc traité. Mais, puisque nos estimations ne sont pas parfaites, une
certaine quantité de stérile (section brune) sera également traitée, en
raison des erreurs d'estimation.


```{figure} images/Chap1_Information.png
:label: Chap1_Information.png
:align: center 
Effet d'information. Il faut garder en tête que les décisions sont prises à partir d’estimations des teneurs. Ces estimations comportent des erreurs dues au manque d’information, donc la teneur réelle extraite peut être plus élevée ou plus faible que l’estimation.
```

Cette illustration ne tient pas compte des biais conditionnels et des
biais systématiques présents dans les estimations. Nous aborderons ces
notions plus en détail lors de l'étude des méthodes d'estimation. Il est
cependant essentiel de garder en tête que nous récupérons toujours moins
de minerai lorsque les décisions sont prises à partir d'estimations, et
que celles-ci comportent inévitablement des incertitudes. Comme nos
décisions sont toujours basées sur des estimations, il devient crucial
d'utiliser des méthodes d'estimation rigoureuses, précises et sans
biais.


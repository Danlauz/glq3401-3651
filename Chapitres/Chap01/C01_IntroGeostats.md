---
title: "Introduction à la géostatistique"
abstract: |
  Cette section présente les concepts fondamentaux de la géostatistique à travers une lecture et des ateliers interactifs conçus dans des Jupyter Notebooks. Elle introduit les notions de base, les grandes questions auxquelles la géostatistique cherche à répondre, ainsi qu’un bref rappel des principes de probabilité et de statistique.

project:
  output-dir: exports  # <-- dossier de sortie pour tous les formats

format:
  pdf:
    output-file: ./exports/Chapitre1.pdf
    documentclass: article
    classoption: [10pt, oneside, twocolumn]
    geometry: margin=1in
    markdown_extensions: ["+fenced_divs"]

downloads:
  - file: Chapitre1.pdf    # simple nom de fichier, pas de chemin
    title: PDF
---

:::{important}
### Objectifs d'apprentissage

- Pouvoir expliquer l'utilité de la géostatistique dans le domaine des géosciences et spécialement en mine;
- Introduire les notions fondamentales de probabilités et statistiques;
- Comprendre les principes de base des modèles spatiaux et leur application à l’estimation et la simulation des variables régionalisées;
:::



# Introduction

La géostatistique est une branche des statistiques qui s'intéresse à
l'analyse et à la modélisation des phénomènes spatiaux (et parfois
spatio-temporels), en tenant compte de la localisation des données. Elle
permet de décrire, d'interpoler et de prédire des variables
régionalisées, telles que la teneur d'un minerai dans un gisement[^1].
Grâce à des outils mathématiques et probabilistes, elle offre des
estimations de valeurs inconnues ainsi que des mesures d'incertitude,
essentielles pour la prise de décisions éclairées. Initialement centrée
sur des approches univariées, la géostatistique s'est enrichie de
méthodes multivariées intégrant des données secondaires, afin
d'améliorer la précision des modèles. Elle joue un rôle clé dans divers
domaines, notamment pour optimiser les opérations minières, tout en
prenant en compte les dimensions économiques, environnementales et
sociétales.

La géostatistique repose sur deux grands principes : l'effet de support
et l'effet d'information. Dans les années 1950, un ingénieur d'Afrique
du Sud, Daniel Krige, à observer deux grand phénomènes qui lui ont
permis de postuler deux questions :

-   Pourquoi récupère-t-on toujours moins de métal lorsque l'on exploite
    des grands volume qu'avec des petits volumes ? (effet support)

-   Pourquoi récupère-t-on toujours moins de ressources (i.e., métal)
    avec des estimations qu'avec les valeur réelles connue
    après l'exploitation du gisement ? (effet information)

La discipline a été développer autour de ces deux grandes questions et
le krigeage, développé en 1960 par George Matheron, fut nommé en
l'honneur de Daniel Krige, le père fondateur de la géostatistique.

## 🔍➡️🧊 Effet de support

En géostatistique minière, le support désigne la taille de la zone sur laquelle une teneur en minerai est mesurée ou estimée. On peut le comparer à une loupe à travers laquelle on observe le gisement. 

Une petite loupe représente une carotte de forage : on voit très localement, avec précision, exactement ce qui a été extrait à cet endroit. En revanche, une grande loupe correspond à la taille d’un bloc minier : on observe une zone plus large, mais les détails sont moins visibles. À cette échelle, on ne mesure plus directement les teneurs ; on les estime en moyennant les données issues des forages. Ce changement d’échelle — du forage au bloc — a un impact majeur : plus le support est grand, plus les valeurs sont lissées, ce qui peut modifier la perception de la richesse du gisement. Comprendre cet effet est essentiel pour une estimation fiable et réaliste des ressources minières.

Imaginons deux gisements qui, à l’échelle des forages, présentent les mêmes statistiques : même teneur moyenne, même variabilité. On pourrait croire qu’ils seront exploités de manière similaire. On pourrait croire qu’ils seront exploités de manière similaire. Mais une fois passés à l’échelle des blocs, les différences apparaissent. Les teneurs sont lissées différemment selon la répartition spatiale du minerai ([Fig. %s](#Chap1_Support.png), flèches rouges) — c’est ce qu’on appelle la continuité spatiale.

👉 Pour mieux visualiser ce phénomène, consultez l’atelier interactif en lien avec la [Fig. %s](#Chap1_Support.png).


En général, plus un bloc est grand, plus il contient de zones pauvres en minerai, car des teneurs élevé sont des évènements rares. Cela signifie qu’on récupère souvent moins de métal avec de gros blocs qu’avec de petits, car les zones riches sont diluées avec des zones stériles.

🎨 Petite analogie : imagine que tu mélanges une cuillère de peinture rouge dans un petit pot de peinture blanche — le rouge reste visible. Fais la même chose dans un grand seau, et tu obtiens un rose pâle presque blanc. Même principe pour les teneurs : plus le bloc est gros, plus les fortes teneurs sont diluées.

Bien sûr, il serait tentant d’exploiter de petits blocs pour réduire l'impact des dilutions. Mais cela n’est pas viable d’un point de vue opérationnel. Il faut tenir compte des capacités des machines, des exigences de sécurité, ainsi que de la stabilité des excavations. On ne va pas creuser des blocs minuscules juste pour optimiser la sélection. Personne n’extrait du minerai à la pelle manuelle ! C’est pourquoi la taille des blocs est avant tout déterminée par les contraintes techniques et opérationnelles de la mine.

En tant que futurs ingénieurs, il est essentiel de bien comprendre l’effet de support. Cela permet de mieux adapter les plans d’exploitation aux réalités du terrain et de choisir, parmi les scénarios possibles, celui qui maximise la rentabilité en tenant compte des contraintes opérationnelles. C’est là que la géostatistique devient un véritable outil d’aide à la décision.


```{figure} images/Chap1_Support.png
:label: Chap1_Support.png
:align: center 
Effet de support. La variabilité d'un gisement change selon la taille du support, mais aussi à cause de sa structure spatiale.
``` 

## Effet d'information

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

## L'utilité de la géostatistique

La géostatistique permet de prévoir l'ampleur des effets de support et
d'information, afin de minimiser leur impact sur les opérations minières
et de prendre des décisions éclairées. Grâce à des analyses spatiales
des statistiques (moyenne, variance, covariance, corrélation, intervalle
de confiance), il est possible de quantifier ces effets à l'aide de
modèles mathématiques théoriques. La géostatistique combine ainsi deux
branches des mathématiques : les probabilités et statistiques, et
l'algèbre linéaire. En appliquant ces disciplines à la géologie et aux
opérations minières, elle offre un cadre d'analyse puissant.


## Interprétation géostatistique

En géostatistique, les variables aléatoires (v.a.) sont dites \textit{régionalisées}, c’est-à-dire qu’elles dépendent explicitement de leur position dans l’espace (ou dans le temps), généralement notée $Z(x)$. À chaque localisation $x$ est ainsi associée une valeur issue d’un phénomène aléatoire. Cette dépendance spatiale est fondamentale, car elle permet de modéliser et de prédire des valeurs à des positions non mesurées à partir des données disponibles ailleurs.

En adoptant un cadre probabiliste, il devient possible non seulement de produire une estimation, mais aussi de quantifier le degré de confiance associé à celle-ci. Connaître les incertitudes associées à ses données est une véritable richesse pour l’ingénieur, lui offrant les moyens de prendre des décisions plus éclairées et plus sûres.

## Supports

Le support fait référence à la zone ou à la région sur laquelle les
mesures sont effectuées. En fonction de la taille et de la nature du
support, les statistiques associées à la v.a. peuvent
changer.

-   **Ponctuel :** Lorsqu’une mesure est prise en un point unique $ x_0 $, on parle de support ponctuel. La valeur associée à ce support, notée $ Z(x_0) $, correspond à la valeur de la variable aléatoire en ce point précis. Cette mesure est généralement représentative d’un très petit volume autour de $ x_0 $, comme la taille d’une carotte d’échantillonnage.

-   **Blocs :** Si les mesures sont effectuées sur un petit bloc $G$
    , la teneur du bloc, ${Z}_G$, est définie par :
    $${Z}_G = \frac{1}{N} \sum_{i=1}^{N} Z(x_i)$$ où $N$ est le
    nombre d'observations dans le petit bloc $G$, et $x_i$ représente
    les positions de chaque observation à l'intérieur du bloc $G$.

Les statistiques calculées sur la variable aléatoire $Z(x)$ dépendent
directement du support de mesure. En particulier, la variance de la
variable aléatoire a tendance à décroître à mesure que la taille du
support augmente. En effet, plus le support est grand, plus la
variabilité des valeurs mesurées est réduite, ce qui donne lieu à des
estimations plus stables et moins sensibles aux fluctuations locales.

Cependant, la taille optimale du support dépend généralement des
opérations minières et des équipements disponibles pour exploiter cette
taille. Il n'est donc pas correct de dire que plus la taille du support
augmente, plus les profits seront importants. La relation entre la
taille du support et les profits est plus complexe et doit prendre en
compte divers facteurs tels que l'efficacité des équipements, la nature
géologique du gisement et les coûts associés à l'exploitation. Nous
explorerons certaines de ces causes dans les prochaines lectures.

# Applications de la géostatistique dans l'exploration et l'exploitation minière

Dans le secteur **minier**, la géostatistique intervient dès les
premières étapes d'un projet, notamment pour estimer les ressources et
évaluer la faisabilité économique. En phase d'exploitation, elle permet
de guider quotidiennement le tri du minerai, en déterminant quels
matériaux doivent être envoyés à l'usine de traitement et lesquels sont
considérés comme des stériles, à partir des données les plus récentes.
On résume certaine domaine d'application dans le secteur minier
ci-dessous :

-   **Planification minière et séquençage d’exploitation** : Cette étape consiste à définir les zones et la séquence optimale d’extraction en fonction des ressources, des objectifs de production, des contraintes économiques, techniques et environnementales. L’objectif est de maximiser la rentabilité tout en gérant les risques et les impacts.

-   **Évaluation économique des scénarios ** : Analyse comparative des différents scénarios d’exploitation pour en évaluer la rentabilité, en tenant compte des coûts, revenus potentiels et risques associés.

-   **Détermination des contours d’une fosse optimale** : Définition géométrique des limites d’extraction afin d’optimiser le volume exploitable tout en minimisant les coûts.

-   **Analyse et homogénéisation de la variabilité du minerai** : Étude de la variabilité des teneurs dans le minerai extrait, visant à uniformiser la qualité pour améliorer l’efficacité des concentrateurs et stabiliser les processus de traitement.

-   **Prédictions à court terme de la teneur** : Estimation dynamique de la teneur du minerai extrait afin d’ajuster les processus de traitement et la planification de la production pour une meilleure gestion des ressources.

Récemment, l’utilisation de la géostatistique pour optimiser la conception et la construction des haldes à stériles ainsi que des parcs à résidus dans le cadre de la restauration des sites miniers suscite un intérêt croissant. Ce domaine de recherche, encore émergent, présente des applications très prometteuses. Ces travaux sont actuellement menés à Polytechnique Montréal, au sein de l’Institut de recherche en mines et environnement (IRME).

# Autres domaines d'application

La géostatistique n'est pas limiter à des applications en mines. Elle
est largement utilisée dans de nombreux domaines des sciences et du
génie. Par exemple :

Dans le domaine de la **géotechnique**, la géostatistique est utilisée
pour modéliser en 2D ou en 3D la géologie du sous-sol et estimer, par la
suite, les propriétés associées à chacune des unités. Elle cherche à
répondre à une double question : où se trouvent les unités lithologiques, et comment estimer spatialement leurs propriétés mécaniques
et hydrogéologiques ? On appelle cette approche la modélisation de
faciès. Ainsi, la géostatistique permet d'obtenir un modèle du sous-sol
cohérent avec les données disponibles, offrant ainsi une approche plus
rigoureuse pour la conception des modèles géotechniques, qui étaient
auparavant basés sur des méthodes empiriques et l'expérience de
l'ingénieur. En utilisant un nombre suffisant de données, elle garantit
la pertinence des analyses, même si, dans certains cas, les données
disponibles peuvent être limitées[^2].

La **géomécanique**, dont la modélisation des réseaux de fractures
bénéficie largement de la géostatistique, utilise cette approche pour
l'estimation et la modélisation de la densité des réseaux de fractures,
en particulier pour des applications en stabilité des pentes et en
écoulement des eaux dans ces fractures. L'une des applications consiste
à décrire la distribution spatiale des fractures à partir de données de
forages, d'imagerie ou de relevés géophysiques, en quantifiant leur
densité, leur orientation, leur connectivité, leur ouverture et leur
rugosité. Par la suite, la méthode de modélisation est sélectionnée en
fonction des besoins et de l'étude géostatistique.

En **sciences de l'environnement**, elle est utilisée pour évaluer la
concentration de polluants dans les sols, les eaux ou l'air, afin
d'estimer les risques pour la santé humaine et l'écosystème, et de
déterminer la nécessité d'interventions de dépollution.

Dans le domaine de la **science des sols**, des applications récentes
s'intéressent à la cartographie de nutriments (azote, phosphore,
potassium, etc.) et d'indicateurs comme la conductivité électrique, dans
une optique d'agriculture de précision. Ces cartes permettent de moduler
finement les apports en engrais selon les besoins spécifiques de chaque
zone du champ.

Les **applications météorologiques** mobilisent également la
géostatistique pour la prévision de variables telles que la température,
les précipitations ou des phénomènes connexes comme les pluies acides, à
partir de données d'observation ponctuelles[^3]

Dans le domaine de la **santé publique**, la géostatistique est de plus
en plus utilisée pour modéliser la répartition spatiale de contaminants
environnementaux et leur lien avec des indicateurs sanitaires, comme les
taux d'incidence de certaines maladies.

Pour continuer la liste, on note des applications dans de nombreux
autres domaines tels que les gisements pétroliers, la résolution de
problèmes inverses en géophysique, la cartographie assistée, la
classification des sols, l'analyse d'images et bien d'autres domaines.
L'important est d'avoir des coordonnées spatiales ou temporelles et des
valeurs observées.

Dans tous ces contextes, l'objectif est de caractériser un phénomène
dont la mesure exhaustive serait trop coûteuse ou chronophage, à l'aide
de données collectées en un nombre restreint de points. Les méthodes
géostatistiques permettent alors de produire des cartes de prédiction
accompagnées de mesures d'incertitude, afin de mieux comprendre le
phénomène et de soutenir les décisions opérationnelles,
environnementales ou économiques.

[^1]: La géostatistique permet également de modéliser et d'analyser des
    séries temporelles. Dans ce contexte, la variable d'intérêt n'est
    pas nécessairement la teneur en fonction de la localisation dans un
    gisement, mais peut être la teneur du minerai envoyé au
    concentrateur pour y être traité. On s'intéresse alors à la
    stabilité de cette teneur au cours du temps, c'est-à-dire à sa
    variabilité éventuelle, dans le but d'optimiser les procédés
    chimiques utilisés pour extraire le métal de la roche encaissante.

[^2]: L'un de mes projets en cours se concentre sur la modélisation
    complète des unités meubles du sous-sol québécois à travers une base
    de données contenant plus de 300 000 forages géotechniques.

[^3]: Il s'agit d'un autre axe de mes travaux de recherche où je
    m'intéresse à modéliser les comportements asymétriques observés dans
    les champs de précipitations.




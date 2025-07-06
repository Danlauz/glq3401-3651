# Classification des ressources et des réserves minières

Afin de pouvoir exploiter un gisement minier, il est important de
catégoriser les ressources afin de parler le même langage avec tous les
intervenants de la société minière. Ces définitions sont déterminées par
l'Institut canadien des mines, de la métallurgie et du pétrole (ICM),
dont le rapport NI 43-101 fait usage.

Lors de l'exploitation minière, le sous-sol est subdivisé en blocs de
dimensions données --- supposons ici des blocs de
15 m $\times$ 15 m $\times$ 15 m (voir
[Fig. %s](#C1_BlocModele.png). Cette subdivision constitue ce que l'on
appelle un modèle de blocs de la mine. L'objectif est d'estimer, à
partir des données disponibles, la quantité de métal (ou la teneur)
présente dans chacun de ces blocs. Il va de soi que, lors des
opérations, on accorde une plus grande importance aux blocs ayant les
teneurs les plus élevées : ils seront inévitablement plus rentables,
d'un point de vue économique.

```{figure} images/C1_BlocModele.png
:label: C1_BlocModele.png
:align: center 
Modèle de blocs 3D d'une mine de cuivre. On peut y observer des forages déviés (lignes non rectilignes) ainsi qu'une structure spatiale du gisement, où les teneurs élevées en cuivre sont regroupées selon une forme circulaire.
```

Dans cette situation, on parle d'exploitation sélective, c'est-à-dire
que la décision d'envoyer un bloc au concentrateur (afin d'en extraire
le métal) ou aux rejets (s'il ne présente aucune valeur économique) est
prise bloc par bloc. Ainsi, la simple connaissance de la teneur et du
tonnage du gisement ne suffit pas à déterminer la rentabilité de la
mine. En effet, deux mines de cuivre ayant une teneur moyenne de 0,4 %
pourraient présenter une rentabilité très différente, selon la
variabilité des teneurs à l'échelle des blocs (unités de sélection) et
selon leur mode d'exploitation.

Ainsi, on distingue deux facteurs : la teneur des blocs, et leur
gestion. On parle de **ressources** lorsque le bloc est caractérisé
uniquement par sa teneur. On parle de **réserves** lorsque la
caractérisation du bloc prend aussi en compte les facteurs économiques,
miniers, environnementaux, législatifs, et d'autres encore. En d'autres
mots, un bloc pourra être considéré comme une réserve uniquement
lorsqu'il est démontré, de manière scientifique, qu'il est
économiquement rentable, après avoir pris en considération tous les
coûts liés à son extraction du sol, d'un point de vue économique,
environnemental et sociétal.

Après plusieurs années de tâtonnements, une définition internationale
unique des catégories de ressources et de réserves s'est imposée. Ces
définitions doivent être respectées dans la préparation des rapports
techniques NI 43-101.

Normalement, l'ingénieur géologue ou minier --- que ce soit par des
méthodes traditionnelles ou géostatistiques --- ne peut fournir que des
estimations de ressources. La classification en réserves requiert des
études de faisabilité technique et économique. Les indications sur le
niveau de confiance de chaque catégorie sont généralement qualitatives.
Voici un exemple de classification que l'on retrouve dans le guide de la
SME (*Society for Mining, Metallurgy and Exploration*) :


(def-RInf)=
Définition: Ressources Inférées 
: Partie d'une ressource minérale dont la quantité et la teneur sont
estimées sur la base de **preuves géologiques et d'un échantillonnage
limité**. Ces preuves sont suffisantes pour **inférer**, mais non pour
démontrer de façon fiable, la continuité géologique et celle des
teneurs. Le niveau de confiance est donc **faible**. Typiquement, les
données proviennent d'affleurements, de tranchées, de travaux de
développement ou de forages. La confiance dans ces estimations n'est pas
suffisante pour permettre une analyse économique --- **aucune réserve
minérale ne peut être définie à partir de cette catégorie**.

(def-RInd)=
Définition: Ressources Indiquées 
: Partie d'une ressource minérale pour laquelle la quantité, la teneur, la
densité, la forme et les caractéristiques physiques sont **estimées avec
un niveau de confiance raisonnable**. Les données sont suffisamment
abondantes et bien réparties pour **supposer la continuité géologique
et/ou minéralisée**, sans toutefois pouvoir la démontrer entièrement. Ce
niveau de confiance permet généralement une première **analyse
économique** et la **planification préliminaire** du projet minier.

(def-RMes)=
Définition: Ressources Mesurées 
: Partie d'une ressource minérale pour laquelle les paramètres géologiques
(quantité, teneur, densité, forme, propriétés physiques) sont **estimés
avec un haut niveau de confiance**. Les données disponibles sont
**suffisamment abondantes et rapprochées** pour démontrer clairement la
continuité géologique et/ou de la minéralisation. Ce niveau de certitude
permet une **planification minière détaillée** ainsi qu'une **évaluation
économique fiable** du gisement.


À partir de ces notions, la distinction entre ressources et réserves
dépend d'une multitude de facteurs que nous ne couvrirons pas dans ce
cours. Une illustration de ces facteurs influençant la classification
des ressources en réserves minérales est donnée à la
[Fig. %s](#C1_ReservesRessources.png). Il est à noter qu'une **réserve
minérale** est la partie économiquement exploitable d'une ressource
minérale mesurée et/ou indiquée. Cela doit être démontré par une étude
de préfaisabilité ou de faisabilité, laquelle doit prouver qu'au moment
de la déclaration, l'extraction peut être raisonnablement justifiée.

```{figure} images/C1_ReservesRessources.png
:label: C1_ReservesRessources.png
:align: center 
Définitions illustrative des réserves et ressources minières.
``` 

Au regard de ces définitions, une certaine subjectivité demeure, et
celle-ci se reflète dans la lecture des rapports NI 43-101. Certaines
compagnies minières fondent leurs estimations des ressources et des
réserves sur des critères qualitatifs, tandis que d'autres utilisent des
méthodes quantitatives scientifiquement rigoureuses. En vertu même de la
définition des ressources et des réserves, toute approche permettant
d'évaluer un niveau de confiance sur les ressources et réserves pourrait
être acceptée.

## Exemple 1 : Rapport NI-43-101 - Canadian Malartic Mine - 2024

Les rapports NI-43-101 sont publiques, il est alors possibles d'aller
les consulter librement. Notre premier exemple concerne les méthodes
d'évaluation des ressources et des réserves minières de la mine Canadien
Malartic Mine (CMM).

La CMM est l'une des plus grandes mines d'or à ciel ouvert au Canada.
Située à Malartic, en Abitibi-Témiscamingue (Québec), elle est exploitée
depuis 2011. Le gisement est principalement composé de minéralisation
aurifère disséminée dans une large enveloppe de roches altérées.

À la page 143 du rapport Rapport NI-43-101 daté de 2024, on peut lire un
résumer des paramètre utilisé par la CMM pour évaluer les ressources
minières. Cette classification repose sur la robustesse des différentes
données disponibles ainsi que sur les caractéristiques des modèles de
blocs, incluant sans s'y limiter :

-   la qualité et la fiabilité des données de forage et
    d'échantillonnage;

-   la présence de forages RC (circulation inverse) et/ou de forages de
    production;

-   la densité des sondages (i.e., zone hautement échantillonée vs
    faiblement échantillonnée);

-   la confiance dans l'interprétation géologique;

-   la continuité géologique et celle des teneurs des structures (i.e.,
    volet géostatistique);

-   les modèles de variogrammes et les critères des ellipses de
    recherche (i.e., volet géostatistique);

-   les paramètres d'interpolation (i.e., volet géostatistique).

Pour la mine Canadian Malartic (CMM), plusieurs des critères de
classification des ressources sont quantifiables à l'aide des outils
géostatistiques qui seront abordés dans les prochaines lectures. Ces
critères permettent de construire un modèle de blocs, similaire à la
[Fig. %s](#Chap2_BlocModele.png), mais propre à la géologie de la mine CMM.
Les ressources mesurées, indiquées et inférées sont alors définies à
partir de ce modèle.

Dans cet exemple, la méthode des passes d'estimation a été utilisée.
Elle prend en compte plusieurs paramètres du modèle géostatistique,
notamment : le nombre de composites; le nombre de forages utilisés; la
continuité spatiale du gisement.

Cette méthode vise à évaluer si l'estimation de la teneur d'un bloc
repose sur une quantité suffisante de données pour justifier un certain
niveau de confiance. En général, trois passes d'estimation sont définies
à partir des paramètres géostatistiques. Ces passes agissent comme des
seuils qui permettent de délimiter les zones contenant des ressources
mesurées, indiquées, inférées, ou aucun type de ressource.

-   **Ressources mesurées :** Blocs estimés lors des premières passes
    d'interpolation et utilisant plus de 65 % de forages récents
    (2005--2020). Les blocs estimés lors de la deuxième passe, mais
    situés à moins de 20 m de la surface minée, sont également classés
    comme mesurés.

-   **Ressources indiquées :** Blocs interpolés durant la première passe
    qui ne satisfont pas aux critères des ressources mesurées, ainsi que
    les blocs estimés lors de la deuxième passe.

-   **Ressources inférées :** Blocs estimés durant les dernières passes
    d'interpolation. La CMM souligne qu'une compréhension géologique
    plus approfondie et une validation plus poussée du modèle sont
    nécessaires pour reclassifier ces ressources en catégories indiquée
    ou mesurée.

### Exemple 2 : Rapport NI-43-101 - Propriété Grevet - Mountain - 2007

Le rapport NI-43-101 de la propriété Grevet-Mountain soulève un point
intéressant concernant la quantification des ressources minières. En
2007, la propriété est devenue la propriété de Ressources Metco, sans
qu'aucun nouveau calcul de ressources n'ait été réalisé. Toutefois, en
1998, Cambior, l'ancien propriétaire, avait procédé à une estimation des
ressources de la lentille minéralisée à l'aide de critères peu rigoureux
: une méthode polygonale avec des rayons de recherche excédant souvent
100 mètres.

À ce sujet, Ressources Metco indique, et je cite : « Nous sommes d'avis
que ces ressources, qui ont été calculées avec une maille de forage
large et irrégulière (souvent de plus de 100 m), doivent être qualifiées
d'inférées, et à ce titre, ont été indiquées au rapport comme ressources
inférées. Notons que Ressources Metco a effectué en 2006 un total de 7
159 m de forage sur le secteur de la lentille Orphée, et que,
conséquemment, les caractéristiques géologiques de cette lentille ont pu
être observées par les auteurs. »

Il est donc possible de classer ces ressources comme inférées, puisque
le contexte géologique est désormais bien compris. Toutefois, le modèle
de blocs n'est pas suffisamment détaillé pour permettre une
classification à un niveau de confiance supérieur.

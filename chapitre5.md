---
title: "Chapitre 4 - Traitement et analyse statistique des données de forage"
abstract: |
  Cette section présente les principes clés du traitement statistique des données de forage, en insistant sur l’importance d’un échantillonnage spatialement représentatif et moyennable. Elle explique pourquoi, en raison de l’autocorrélation spatiale des teneurs, il faut éviter les biais liés à une surreprésentation locale. Enfin, elle introduit trois étapes essentielles du prétraitement : la régularisation, le suivi des déviations et le débiaisement des données.

project:
  output-dir: exports  # <-- dossier de sortie pour tous les formats

format:
  pdf:
    output-file: ./exports/Chapitre5.pdf
    documentclass: article
    classoption: [10pt, oneside, twocolumn]
    geometry: margin=1in
    markdown_extensions: ["+fenced_divs"]

downloads:
  - file: Chapitre5.pdf    # simple nom de fichier, pas de chemin
    title: PDF
---

:::{important}
### Objectifs d'apprentissage
-   Être en mesure de traiter les données de forage en vue d'une analyse
    statistique spatiale ;

-   Effectuer la régularisation des teneurs et en comprendre les
    objectifs et les implications ;

-   Identifier et interpréter les problèmes liés à la déviation des
    forages ;

-   Comprendre l'importance du débiaisement (*debiaising*) et du
    dégroupement (*declustering*) des données dans le cadre d'analyses
    spatiales ;

-   Calculer les intersections entre les forages et les zones
    minéralisées ;

-   Convertir les mesures de déviation en coordonnées cartésiennes pour
    les forages.
:::

# Introduction

Le traitement et l'analyse statistique des données de forage visent
essentiellement à fournir une base de données unifiée, dont les
statistiques sont représentatives du phénomène étudié. En
géostatistique, il est essentiel que les données soient moyennables, ce
qui implique l'utilisation d'un support d'échantillonnage uniforme, et
qu'elles représentent adéquatement le phénomène géologique analysé.

En géologie, contrairement à plusieurs autres disciplines, les teneurs
sont généralement mesurées en un point précis de l'espace. Ces teneurs
présentent une autocorrélation spatiale : autrement dit, deux forages
proches l'un de l'autre ont plus de chances d'afficher des teneurs
similaires que deux forages éloignés. Par conséquent, les échantillons
ne peuvent être considérés comme des observations indépendantes issues
d'une population homogène. Les teneurs appartiennent souvent à une
population structurée spatialement.

Cette réalité impose la nécessité de prendre des précautions
supplémentaires lors du prélèvement des échantillons. En effet, pour que
les statistiques descriptives de l'échantillon (par exemple : moyenne,
écart-type, quantiles) soient pertinentes par rapport à la population,
il est essentiel d'obtenir un échantillon aussi homogène que possible
sur le plan spatial, i.e., qu'il convient, en particulier, d'éviter la
surreprésentation de certaines zones géologiques, afin de ne pas
introduire de biais dans l'analyse. Par exemple, réalisé 100 forages
dans une zone très riche sur une très petit section du gisement
viendrait biaisé les statistiques globales du gisement (i.e., une
moyenne des teneurs à la hausse).

Plusieurs étapes clés doivent être respectées lors de l'analyse
statistique des données de forage. Cette liste n'est pas exhaustive :
d'autres traitements peuvent être nécessaires selon le type de gisement,
la méthode d'exploitation (à ciel ouvert ou souterraine), et divers
paramètres techniques. Dans cette section, nous aborderons trois étapes
importantes du prétraitement des données, avant de procéder à
l'estimation des ressources et des réserves minières : la régularisation
des données de forages; le suivi et le calcul des déviations des
forages; le débiaisement et le dégroupement des données.

# Régularisation (*Compositing* ou *regularization*)

Une étape importante avant de procéder au calcul des ressources et
réserves minérales est la régularisation des données. Il s'agit d'une
pratique courante dans l'estimation des ressources, considérée comme
essentielle pour produire des estimations non biaisées. En général, les
carottes de forages (ou le support) sont collectées à sur des longueurs
différentes ( ou intervalles irréguliers) en raison des variations des
propriétés mécaniques des lithologies traversées, des stratégies
d'échantillonnage et la sélection des supports envoyés pour analyse. En
d'autres mots, nous n'analysons que rarement l'intégralité des carottes
d'un forage et celles-ci n'ont pas tous la même longueur.

Une sélection est souvent réalisée afin d'envoyer uniquement les
carottes jugées intéressantes pour l'analyse, introduisant ainsi un
possible biais de sélection. De plus, les échantillons n'ont pas
nécessairement la même longueur. Celle-ci dépend de plusieurs facteurs
géomécaniques (qualité du massif rocheux) ou opérationnels (e.g.,
l'expérience du foreur). Il est donc fréquent d'avoir, à l'intérieur
d'un même forage, des carottes de longueurs différentes.

En géostatistique, il est primordial que les échantillons aient des
supports identiques (voir effet de support), c'est-à-dire que leur
représentativité soit équivalente. Autrement dit, toutes les teneurs
mesurées doivent correspondre à la même taille de support (par exemple,
des carottes de 3 m avec densité et volume égaux). Si les supports
diffèrent, il faut alors procéder à une régularisation afin d'obtenir
des composites de même longueur. Ainsi, un composite est un échantillon
artificiel obtenu par l'agrégation de plusieurs échantillons (ici, des
carottes de forage), souvent de longueurs irrégulières pour former des
segments de longueur uniforme.

Le composite est généralement calculé comme une moyenne pondérée par la
longueur des échantillons, et peut également tenir compte de la densité
spécifique, des changements de volume, ou du taux de récupération du
carottage. La régularisation peut répondre à divers objectifs : obtenir
une valeur représentative à l'intersection d'un corps minéralisé, créer
des composites lithologiques ou métallurgiques, produire des composites
réguliers le long des trous, par gradin ( *bench* an anglais), par
section, par haute teneur, ou encore des composites minimaux en longueur
et teneur. Chacun de ces types de composites répond à des besoins
spécifiques selon les contextes d'étude. Les composites de longueur
régulière ou par gradin sont les plus fréquemment utilisés pour
l'estimation des ressources.

## Exemple simplifié : composites réguliers

Considérons un trou de forage traversant un corps minéralisé où trois
échantillons de longueurs différentes ont été prélevés :

-   Échantillon 1 : longueur = 1 m, teneur = 1.0 %

-   Échantillon 2 : longueur = 3 m, teneur = 5.85 %

-   Échantillon 3 : longueur = 2 m, teneur = 1.75 %

Sans régularisation, si l'on calcule simplement la moyenne des teneurs
(sans pondération par la longueur), on obtient :

$$\text{Moyenne non pondérée} = \frac{1.0 + 5.85 + 1.75}{3} = \frac{8.6}{3} = 2.87 \%$$

Cependant, cette valeur ne reflète pas le fait que les longueurs
d'échantillons sont inégales.

Supposons maintenant que l'on veuille créer des \*\*composites de 3
mètres\*\*. Le premier composite sera formée de l'échantillon 1 (1 m) et
d'une partie de l'échantillon 2 (2 m). La teneur du composite 1 sera
obtenue par une moyenne pondérée par la longueur :
$$z_1 = \frac{1 \times 1.0 + 2 \times 5.85}{1 + 2} = \frac{12.7}{3} \approx 4.23 \%$$

De même manière, le second composite sera composé d'une partie de
l'échantillon 2 (1 m) et de la totalité de l'échantillon 3 (2m). La
teneur du composite 2 sera aussi obtenue par une moyenne pondérée par la
longueur :

$$z_2 = \frac{1 \times 5.85 + 2 \times 1.75}{1 + 2} = \frac{9.35}{3} \approx 3.12 \%$$

Maintenant que les supports sont tous les mêmes, on peut procéder au
calcul de la moyenne sans risqué d'introduire un biais, car les support
sont équivalents :

$$\text{Moyenne régularisée} = \frac{z_1 + z_2}{2} = \frac{4.23 + 3.12}{2} = 3.68 \%$$

On remarque ici que la moyenne régularisée est différente de la moyenne
non pondérée. Cette différence illustre l'impact de la régularisation :
en tenant compte des longueurs réelles des échantillons, on obtient une
estimation plus représentative de la teneur présente dans le gisement.

La Fig.[\[fig.Composite\]](#fig.Composite){reference-type="ref"
reference="fig.Composite"} illustre le calcul effectué ci-haut.

::: figure*
![image](Composite.png){width="100%"}
:::

## Exemple simplifié : densité

Il n'y a pas que la longueur des carottes qui joue un rôle dans la
régularisation des teneurs. La densité des carottes peut jouer un rôle
important.

Supposons qu'un bloc de minerai de 1 mètre cube (m³) contient une teneur
de 3% de cuivre. Nous voulons calculer la quantité de cuivre en fonction
de la densité du minerai.

Si la densité du minerai est de 3.5 tonnes par mètre cube (t/m³), la
masse totale du minerai dans 1 m³ est de 3.5 tonnes. La quantité de
cuivre sera alors :

$$\text{Quantité de cuivre} = 3\% \times 3.5 \, \text{t} = 0.03 \times 3.5 \, \text{t} = 0.105 \, \text{t} = 105 \, \text{kg}$$

Si la densité du minerai est de 3.2 t/m³, la masse totale du minerai
dans 1 m³ est de 3.2 tonnes. La quantité de cuivre sera alors :

$$\text{Quantité de cuivre} = 3\% \times 3.2 \, \text{t} = 0.03 \times 3.2 \, \text{t} = 0.096 \, \text{t} = 96 \, \text{kg}$$

Ainsi, pour 1 m³ de minerai avec une densité de 3.5 t/m³, la quantité de
cuivre est de **105 kg**, mais celle-ci chute à **96 kg** lorsque la
densité est de 3.2 t/m³.

Bien que la teneur en cuivre soit constante à 3%, la quantité de cuivre
dans 1 m³ de minerai varie en fonction de la densité. Plus la densité
est faible (3.2 t/m³ par rapport à 3.5 t/m³), moins il y a de cuivre
dans un volume donné de minerai.

Il est alors très important de tenir compte de la densité dans
l'estimation des ressources et des réserves minières. À noter que
souvent, les variations de densité peuvent être considérées comme
négligeables. Nous verrons un exemple plus détaillé dans la prochaine
lecture tenant compte du volume du support et de la densité.

## Importance de la régularisation

Bien que la régularisation ne soit pas toujours indispensable pour
estimer les ressources, elle s'impose dans la majorité des cas. Elle
permet d'uniformiser le support des données --- c'est-à-dire leur taille
ou leur volume représenté --- et de corriger les intervalles
d'échantillonnage partiels, ce qui facilite une estimation plus
cohérente. La plupart des logiciels d'estimation considèrent d'ailleurs
que les données sont prises sur des supports de taille constante,
obligent ainsi la formation de composite.

La régularisation a aussi un effet pratique: elle dilue légèrement
l'information brute, rendant les données plus comparables au niveau de
sélectivité réel de l'exploitation minière. Par exemple, la hauteur des
gradins en mine à ciel ouvert ou la hauteur des tranches en mine
souterraine détermine souvent le niveau de détail pertinent. Il est donc
courant de choisir une longueur de composite alignée avec cette
sélectivité.

Le choix du jeu de données composite est crucial pour garantir la
qualité et la précision du modèle de ressources. En effet, la manière
dont les données sont agrégées influence directement l'estimation des
ressources minérales. Plusieurs décisions clés doivent être prises lors
de la création des composites afin d'assurer une modélisation robuste et
fiable des ressources. Parmi ces décisions, on retrouve les questions
suivantes :

1.  Quelle est la longueur optimale des composites ?

2.  Quel type de régularisation utiliser (longueur constante, par unité
    géologique ou par banc) ?

3.  Faut-il respecter les limites géologiques lors de la régularisation
    ?

4.  Comment gérer les intervalles en présence de données manquantes ?

5.  Quelle est la longueur minimale acceptable pour un composite ?

Ces choix doivent être faits avec soin, car ils ont un impact
significatif sur la qualité de l'estimation et la fiabilité du modèle
géologique global.

## Régularisation par trou de forage

Nous répondrons à ces questions à l'aide d'un exemple numérique. Dans
cette lecture, nous privilégierons la méthode de régularisation par trou
de forage (*downhole compositing*). Il est important de noter qu'il
existe d'autres approches, notamment le régularisation par bancs ou par
domaine géologique. Ces méthodes tiennent compte de critères de
sélectivité liés aux opérations minières ou à la géologie du gisement.
Cela dit, bien maîtriser la méthode par trou de forage suffit
généralement à comprendre les principes fondamentaux des autres méthodes
de régularisation.

## Exemple numérique de régularisation par trou de forage {#exemple-numérique-de-régularisation-par-trou-de-forage .unnumbered}

L'exemple suivant illustre un cas typique de régularisation par trou
(*down-the-hole*), avec des échantillons dont la longueur des carottes
varient entre 3 et 7 m. Certains intervalles contiennent des données
manquantes, doit par perte de l'information ou non-analyse de
l'échantillon. Nous appliquons une régularisation à longueur constante
de 6 m et avec les hypothèses suivantes :

1.  **Longueur optimale** : 6 m permet ici de réduire la variabilité
    sans perdre en sélectivité.

2.  **Méthode utilisée** : régularisation par longueur constante en
    suivant la longueur du forage (*down-the-hole*).

3.  **Respect des limites géologiques** : non pris en compte ici, mais
    on peut tronquer les composites à ces limites si désiré.

4.  **Gestion des données manquantes** : les composites contenant des
    zones sans données sont conservés si la portion valide couvre au
    moins 50 % de la longueur nominale. Sinon, le composite est ignoré.
    Le seuil est fixé arbitrairement à 50 %. Ce choix peut être appuyé
    par une étude de corrélation entre longueur et teneur.

## Exemples de calcul de composites {#exemples-de-calcul-de-composites .unnumbered}

La
Fig.[\[fig.RegularisationLarge\]](#fig.RegularisationLarge){reference-type="ref"
reference="fig.RegularisationLarge"} présente les résultats de la
régularisation pour la distance de 60m a 90. Il y a ainsi 5 composites
qui doivent etre formé (30/6=5). Nous expliquetons le calcul pour le
composite 2 et 4.

Le Composite 5 couvre l'intervalle de profondeur entre 66 m et 72 m. Cet
intervalle croise plusieurs carottes d'échantillonnage, dont certaines
contiennent des données manquantes. En sommant uniquement les portions
valides (c'est-à-dire les sous-intervalles à l'intérieur du composite
qui ont des données analytiques), on obtient une longueur valide
supérieure à 3 m, soit plus de 50 % de la longueur nominale du composite
(6 m). Par conséquent, le composite est **retenu**, et sa teneur est
calculée comme la moyenne pondérée des teneurs valides selon la formule
suivante :

$$\text{Teneur composite 5} = \frac{\sum_i \text{Teneur}_i \times \text{Longueur}_i}{\sum_i \text{Longueur}_i}$$

où les longueurs et teneurs considérées correspondent uniquement aux
portions valides.

**Composite 4** couvre l'intervalle de 78 m à 84 m. Bien qu'il
intersecte également des carottes d'échantillonnage, la longueur totale
des portions valides dans cet intervalle est inférieure à 3 m (moins de
50 % de la longueur nominale du composite). En vertu du critère fixé, ce
composite est donc **ignoré** et marqué comme `NaN` (non défini), car il
ne respecte pas la condition minimale de validité des données. Il n'y
aura donc aucune donnée pour le composite 4.

Ce traitement garantit que seuls les composites avec une couverture
suffisante de données analytiques sont conservés pour les analyses et
estimations géostatistiques.

::: figure*
![image](RegularisationLarge.png){width="100%"}
:::

## Choix de la longueur de compositage {#choix-de-la-longueur-de-compositage .unnumbered}

La longueur longueur des composites choisie dans cet exemple est de 6 m,
conformément à une pratique courante en géostatistique minière visant à
réduire la variabilité locale tout en conservant une sélectivité
géologique suffisante. Ce choix est justifié ici par l'analyse de la
distribution des longueurs des carottes d'échantillonnage
(Figure [\[fig.histocarottes\]](#fig.histocarottes){reference-type="ref"
reference="fig.histocarottes"}), qui montre une concentration importante
autour de 6 m. En effet, l'histogramme indique que la majorité des
échantillons bruts ont une longueur comprise entre 5.5 m et 6.5 m, ce
qui suggère une homogénéité naturelle autour de cette valeur.

En choisissant une longueur de composite égale à 6 m, on s'assure d'une
bonne compatibilité avec la trame d'échantillonnage existante, limitant
ainsi les effets de découpage excessif ou de perte d'information due à
la régularisation. Ce choix permet également de faciliter les étapes
ultérieures de modélisation par blocs ou de simulation géostatistique,
en conservant un échantillonnage régulier aligné sur des multiples de
6 m.

::: figure*
![image](DistributionCarotte.png){width="75%"}
:::

# Déviation

Lors de l'estimation des ressources et des réserves minérales, on doit
connaître la localisation exact (X, Y, Z) des teneurs afin de procéder à
l'interpolation des données non-observées. Cepandant, il n'est pas rare
que les forages dévient modifiant les coordonées originalement prévues.
Il faut alors procéder au suivi des déviations, de mesurer l'orientation
et la direction de ceux-ci (i.e., azimut et plongée) afin de corriger
les coordonnées.

## Mise en contexte

La déviation d'un trou de forage dépend de la nature des roches
traversées, de la technique de forage utilisée, ainsi que de la
profondeur et de l'inclinaison initiale du trou. Si le trou est foré
parallèlement à la schistosité ou à la structure naturelle de la roche,
il tendra à suivre les plans de faiblesse (e.g., d'une roche dure vers
une roche molle,
Fig.[\[fig.deviation\]](#fig.deviation){reference-type="ref"
reference="fig.deviation"}a)). En revanche, s'il est foré avec un angle
plus élevé, il aura tendance à se dévier perpendiculairement à ces plans
de faiblesse (e.g., d'une roche molle vers une roche dure,
Fig.[\[fig.deviation\]](#fig.deviation){reference-type="ref"
reference="fig.deviation"}b)).

::: figure*
![image](ImgDeviation.png){width="50%"}
:::

Un exemple célèbre illustrant l'importance de la mesure des déviations
est celui de la mine Louvicourt. Les forages ont dévié de manière
significative et l'arpentage a été mal réalisé. En conséquence, une
forte surestimation des réserves minérales a été observée. La minière
pensait disposer d'une veine minéralisée de plus de 40 Mt, ce qui
permettait d'envisager une durée de vie de la mine de 25 ans, mais la
réalité était tout autre. Les réserves se sont avérées être d'environ 15
Mt (une diminution de 25 Mt), avec une durée de vie réduite à seulement
10 ans.

La Fig. [\[fig.impdeviation\]](#fig.impdeviation){reference-type="ref"
reference="fig.impdeviation"} illustre cette problématique. Les
ingénieurs croyaient avoir affaire à une veine dont la longueur
correspond à la ligne rose, avec des forages supposés non déviés (lignes
bleues). Cependant, les forages ont en réalité subi des déviations
importantes (lignes noires), et la longueur réelle de la minéralisation
est beaucoup plus courte (ligne rouge). On observe clairement la
surestimation de la longueur de la veine minéralisée.

::: figure*
![image](ImpactDev.png){width="50%"}
:::

## Suivi des déviations

Les outils géostatistiques utilisés pour estimer les tonnages et les
teneurs dépendent fortement de la localisation précise des échantillons.
Une exception existe : le krigeage aléatoire, qui permet de travailler
avec des localisations imprécises dans un domaine défini (voir Journel
et Huijbregts, 1978 ; Rossi et Posa, 1990).

Les coordonnées des échantillons (X, Y, Z) sont obtenues par levés
topographiques. Différentes méthodes de levé peuvent être utilisées,
mais il est crucial de maintenir un système de coordonnées unique pour
éviter les erreurs.

Le levé des têtes de forages (collars) est généralement effectué à
l'aide de stations totales ou de systèmes GPS de haute précision. On
utilise aussi des cartes topographiques locales générées à partir
d'images satellites ou aériennes. Tous les levés doivent être vérifiés
en comparant les altitudes des forages avec la topographie locale. Une
erreur supérieure à 2 mètres est souvent considérée comme inacceptable.

Les déviations en profondeur sont mesurées une fois le forage terminé, à
l'aide de dispositifs comme les boussoles magnétiques, gyroscopes ou
systèmes photographiques (single-shot, multi-shot). Ces mesures (azimut
et inclinaison) sont prises tous les 20 à 50 mètres, et permettent de
recalculer la position 3D de chaque échantillon.

Les forages inclinés ou profonds sont plus sujets aux déviations,
influencées par la nature de la roche, la technique de forage, l'angle
initial du trou et les variations de dureté. Les roches magnétiques
(magnétite, pyrrhotite, etc.) peuvent fausser les mesures. Enfin, les
azimuts mesurés doivent être corrigés pour la déclinaison magnétique,
surtout en haute latitude.

## Méthode de calcul des déviations

Pour représenter les sondages en 3D ou estimer les teneurs, il est
nécessaire de calculer les coordonnées des composites. Ce processus est
appelé *désondage* (*desurveying*). Il existe plusieurs techniques de
désondage ; les plus couramment implémentées dans les logiciels sont la
méthode de la courbure minimale ainsi que la méthode tangentielle
équilibrée.

Le désondage a pour objectif de calculer les coordonnées $X$, $Y$ et $Z$
du centre de chaque composite. Initialement, le système de coordonnées
du forage est unidimensionnel, basé sur la longueur mesurée le long du
trou. Les déviations du forage sont décrites par des mesures d'azimut et
de pendage (ou inclinaison). Par exemple, on peut résumer la position
d'un composite à l'aide des données suivantes :

::: center
   **Point de mesure**   **Azimut**    **Inclinaison**
  --------------------- ------------- -----------------
         Collet          $103^\circ$     $53^\circ$
          40 m           $107^\circ$     $58^\circ$
          100 m          $120^\circ$     $65^\circ$
          120 m          $135^\circ$     $72^\circ$
:::

Dans cet exemple, le centre du composite se situe à 150 m de profondeur.
Trois mesures de déviation ont été effectuées le long du forage, à 40 m,
100 m et 120 m. On connaît également l'azimut et l'inclinaison initiale
au collet du forage.

## Méthode tangentielle équilibrée (Balanced Tangential Method) {#méthode-tangentielle-équilibrée-balanced-tangential-method .unnumbered}

La méthode tangentielle équilibrée est utilisée pour calculer les
coordonnées 3D d'un forage à partir des mesures de déviation. Elle
suppose que la moitié de la distance mesurée (*Measured Depth*, ou
$MD/2$) suit l'orientation du point supérieur (*azimut*, *inclinaison*),
et l'autre moitié suit l'orientation du point inférieur. Cela implique
que l'on doit identifier le point médian entre deux points de mesure.

Prenons l'exemple précédent. La première section allant de 0 m à 40 m
suivra deux déviations de 20 m chacune : une avec l'inclinaison et
l'azimut du collet, et l'autre avec l'azimut et l'inclinaison mesurés à
40 m.

Les formules utilisées pour calculer les coordonnées $X$, $Y$ et $Z$
sont les suivantes :

$$\begin{aligned}
\Delta X &= \frac{MD}{2} \cdot \sin(I_1) \cdot \sin(Az_1) + \frac{MD}{2} \cdot \sin(I_2) \cdot \sin(Az_2) \\
\Delta Y &= \frac{MD}{2} \cdot \sin(I_1) \cdot \cos(Az_1) + \frac{MD}{2} \cdot \sin(I_2) \cdot \cos(Az_2) \\
\Delta Z &= \frac{MD}{2} \cdot \cos(I_1) + \frac{MD}{2} \cdot \cos(I_2)\end{aligned}$$

où :

-   $MD$ est la distance mesurée entre deux points de déviation (en m),

-   $I_1$, $Az_1$ sont l'inclinaison et l'azimut du point supérieur (en
    degrés),

-   $I_2$, $Az_2$ sont l'inclinaison et l'azimut du point inférieur (en
    degrés).

### Exemple numérique avec vos données {#exemple-numérique-avec-vos-données .unnumbered}

Considérons les mesures aux profondeurs 0 m ($I_1 = 53^\circ$,
$Az_1 = 103^\circ$) et 40 m ($I_2 = 58^\circ$, $Az_2 = 107^\circ$). La
distance mesurée est $MD = 40$ m.

Calculs :

$$\begin{aligned}
\Delta X &= \frac{40}{2} \cdot \sin(53^\circ) \cdot \sin(103^\circ) + \frac{40}{2} \cdot \sin(58^\circ) \cdot \sin(107^\circ) \\
        &\approx \frac{40}{2} \cdot 0.7986 \cdot 0.9744 + \frac{40}{2} \cdot 0.8480 \cdot 0.9563 \\
        &\approx 15.56 + 16.22 = 31.78m \\
\Delta Y &= \frac{40}{2} \cdot \sin(53^\circ) \cdot \cos(103^\circ) + \frac{40}{2} \cdot \sin(58^\circ) \cdot \cos(107^\circ) \\
        &\approx \frac{40}{2} \cdot 0.7986 \cdot (-0.2250) + \frac{40}{2} \cdot 0.8480 \cdot (-0.2924) \\
        &\approx -3.59 - 4.96 = -8.55m \\
\Delta Z &= \frac{40}{2} \cdot \cos(53^\circ) + \frac{40}{2} \cdot \cos(58^\circ) \\
        &\approx \frac{40}{2} \cdot 0.6018 + \frac{40}{2} \cdot 0.5299 = 22.63m\end{aligned}$$

**Résultat :** Le déplacement du forage entre les profondeurs 0 m et 40
m est approximativement :

$$\Delta X = \SI{31.78}{m}, \quad \Delta Y = \SI{-8.5}{m}, \quad \Delta Z = \SI{22.6}{m}$$

En répétant ce processus jusqu'à 120 m à partir de mesures successives,
le profil 3D du sondage sera construit et les coordonnées des points de
mesure seront déterminées.

# Débiaisement (*debiaising*) et dégroupement (*declustering*)

La dernière étapes afin d'assurer une représentativité adéquantes des
teneurs est le débiaisement et le dégroupement des données. Les données
de forage ne sont généralement pas collectées de manière aléatoire. Par
exemple, les forages sont souvent réalisés dans des zones à forte
teneur, qui sont prioritaires dans le calendrier d'exploitation. Ce
biais d'échantillonnage, bien que justifié d'un point de vue
opérationnel, fausse les statistiques globales. Il est donc nécessaire
d'ajuster les histogrammes et les statistiques descriptives afin
qu'elles soient représentatives de l'ensemble du volume d'intérêt.

## Mise en contexte

La Fig.[\[fig.Gisement\]](#fig.Gisement){reference-type="ref"
reference="fig.Gisement"} présente les teneurs en cuivre d'un gisement
synthétique suivant une distribution log-normale, de moyenne 2% et de
variance unitaire. Les cercles en surbrillance indiquent la position des
140 forages. Deux zones apparaissent comme suréchantillonnées : l'une au
centre de l'image, où 30 forages se concentrent dans une zone riche du
gisement (cercles rouges), et une autre dans le coin inférieur gauche,
où 10 forages représentent une zone de faible teneur (cercles bleus).

::: figure*
![image](Gisement.png){width="50%"}
:::

La présence de zones de suréchantillonnage biaise le calcul de nos
statistiques descriptives (par exemple, moyenne, écart-type, quantiles).
Il va de soi que les 30 forages représentant une zone riche vont
augmenter la teneur moyenne de nos échantillons, rendant ainsi cette
moyenne non représentative de la teneur moyenne réelle du gisement. Dans
cette situation, il est nécessaire de procéder au débiaisement des
observations par le dégroupement de celles-ci.

La Fig.[\[fig.Histogramme\]](#fig.Histogramme){reference-type="ref"
reference="fig.Histogramme"} présente les histogrammes normalisés
(c'est-à-dire, afin de permettre une comparaison équitable entre les
différentes distributions) des teneurs réelles du gisement
(Fig.[1](#fig.HistogrammeA){reference-type="ref"
reference="fig.HistogrammeA"}), des teneurs non-dégroupées
(Fig.[2](#fig.HistogrammeB){reference-type="ref"
reference="fig.HistogrammeB"}) et des teneurs dégroupées
(Fig.[3](#fig.HistogrammeC){reference-type="ref"
reference="fig.HistogrammeC"}). Les statistiques descriptives sont
présentées sur chaque histogramme. Une comparaison des statistiques
descriptives permet d'observer que l'histogramme des données brutes
(figure du centre) est fortement biaisé par la quantité supplémentaire
de teneur élevée due au biais d'échantillonnage. Lorsque le dégroupement
est réalisé, les statistiques descriptives deviennent plus similaires à
celles du gisement initial. La moyenne des échantillons passe de 2,60% à
1,9% après débiaisement. Celle du gisement est de 2,09%. Ce constat est
observable pour toutes les statistiques descriptives et indique
l'importance de procéder au débiaisement lorsque l'échantillonnage
sureprésente certaines zones, notamment les zones les plus riches. Sans
correction, dans cette exemple, on pourrait à tort penser que notre
gisement est beaucoup plus riche que prévu.

::: figure*
![Histogramme des valeurs réelles du
gisement.](Hist_Gisement.png){#fig.HistogrammeA width="\\textwidth"}

![Histogramme des teneurs analysées sans
dégroupement.](Hist_Sample.png){#fig.HistogrammeB width="\\textwidth"}

![Histrogramme des teneurs analysées avec
dégroupement.](Hist_Sample_Degroupe.png){#fig.HistogrammeC
width="\\textwidth"}

[]{#fig.Histogramme label="fig.Histogramme"}
:::

## Méthode de dégroupement

Les techniques de dégroupement visent à corriger les biais
d'échantillonnage en attribuant un poids à chaque donnée en fonction de
sa proximité avec les autres. Ces poids sont strictement positifs et
leur somme est égale à 1. Les statistiques sont ensuite calculées à
l'aide de ces poids pondérés.

On note plusieurs méthodes de dégroupement dans la littérature. Nous
nous limiterons aux trois méthodes les plus souvent implémentée dans les
logiciels de calcul de ressources et de réserves minières.

### Dégroupement polygonal

La méthode de dégroupement polygonal est sans doute la plus simple. Elle
attribue à chaque échantillon un poids proportionnel à la surface ou au
volume d'influence de celui-ci. Des études ont montré que cette approche
fonctionne bien lorsque les limites de la zone d'intérêt sont bien
définies et que le rapport entre le plus grand et le plus petit poids
est inférieur à 10 pour 1 [@Rossi2014].

La technique repose sur la construction de \*\*polygones d'influence\*\*
autour de chaque point d'échantillonnage. Ces polygones sont définis par
les médiatrices entre chaque paire de points voisins (Diagramme de
Voronoï). Un exemple simple de jeu de données avec polygones d'influence
est illustré à la
Figure [\[fig:polygones\]](#fig:polygones){reference-type="ref"
reference="fig:polygones"}.

Les polygones sont obtenues par la méthode de Voronoi, un algorithme
implémenté dans la grande majorité des logiciels. Nous verrons sa
construction en classe. Pour chaque polygone d'influence, on calcule
l'aire, puis on assigne à chaque échantillon un poids proportionnel à
l'aire de son polygone par rapport à la somme totale des aires de tous
les polygones, soit :

$$w_j = \frac{\text{aire}_j}{\sum_{n=1}^{N} \text{aire}_n}$$

où $w_j$ est le poids associé à l'échantillon $j$, $\text{aire}_j$ est
l'aire de son polygone d'influence, et $N$ est le nombre total
d'échantillons.

La
Fig.[\[fig.PolygoneDeclus\]](#fig.PolygoneDeclus){reference-type="ref"
reference="fig.PolygoneDeclus"} présente 27 données de forages et les
poids leurs étant associée par la méthode des polygone d'influence. On
peut constater que les poids sont les plus faible au centre ou plus de
données sont présente que sur les frontières ou les volumes sont plus
importants.

::: figure*
![image](PolygoneDeclus.png){width="50%"}
:::

Cela constitue une grande limitation de la méthode des polygones. L'aire
associée aux échantillons périphériques est en effet très sensible à la
localisation de la frontière. La question de savoir comment définir
correctement cette frontière est complexe, car celle-ci est rarement
bien définie, surtout lorsqu'on s'éloigne du cœur du gisement. Ainsi, si
la frontière est située loin des données, les échantillons périphériques
se voient attribuer une quantité importante de poids, car l'aire de
leurs polygones d'influence augmente. En général, cette forte
sensibilité à la localisation de la limite est perçue comme une
faiblesse de la méthode de dégroupement polygonal. Une technique
courante consiste alors à appliquer une frontière fixe, correspondant à
la zone d'intérêt. Celle-ci peut être définie par des critères
géologiques, les limites de concessions, etc. Cette approche peut être
pertinente selon le contexte du problème. Une autre technique consiste à
attribuer une distance maximale d'influence aux échantillons, limitant
ainsi leur poids en fonction de cette distance.

### Dégroupement par plus proche voisin

La technique de dégroupement par voisin le plus proche est couramment
utilisée dans l'estimation des ressources et elle est similaire à la
méthode polygonale. La différence réside dans le fait qu'elle est
appliquée à une grille régulière de blocs ou de nœuds de grille. À
chaque bloc, le point le plus proche du jeu de données à dégrouper est
attribué. Comme elle s'applique directement sur les mêmes blocs utilisés
pour estimer les ressources, cette méthode est plus pratique dans le
cadre de l'estimation des ressources.

La
Fig.[\[fig.PlusProcheDeclus\]](#fig.PlusProcheDeclus){reference-type="ref"
reference="fig.PlusProcheDeclus"} présente les mêmes 27 données de
forage que dans l'exemple précédent. Cette fois-ci, nous assignons
directement à chaque bloc le point de forage (cercles noirs) le plus
proche du centre du bloc (cercles rouges). Avec une densité de forages
très régulière, la méthode de dégroupement par voisin le plus proche est
pratiquement similaire à la méthode de dégroupement polygonal.
L'avantage de cette approche réside dans le fait que les données sont
directement associées au même support que celui utilisé pour les
opérations minières et le calcul des ressources.

::: figure*
![image](PlusProcheDeclus.png){width="50%"}
:::

### Dégroupement par cellules

La technique de dégroupement par cellules est une autre méthode
couramment utilisée et sûrement l'une des plus populaire. Le
dégroupement par cellules fonctionne comme suit :

1.  Diviser le volume d'intérêt en une grille de cellules
    $l = 1, \dots, L$.

2.  Compter les cellules occupées $L_o$ et le nombre de données dans
    chaque cellule occupée $n_{l_o}$, $l_o = 1, \dots, L_o$.

3.  Attribuer un poids à chaque donnée en fonction du nombre de données
    dans la même cellule. Par exemple, pour une donnée $i$ se trouvant
    dans la cellule $l$, le poids de dégroupement par cellule est donné
    par :
    $$w_i = \frac{1}{n_l \cdot L_o} \quad \text{si} \quad i \in l$$ Les
    poids sont supérieurs à zéro et leur somme est égale à un. Chaque
    cellule occupée se voit attribuer le même poids. Une cellule non
    occupée ne reçoit aucun poids.

La Fig. [\[fig.CelluleDeclus\]](#fig.CelluleDeclus){reference-type="ref"
reference="fig.CelluleDeclus"} présente les mêmes 27 données de forage
que dans les deux exemples précédents. Cette fois-ci, nous
comptabilisons le nombre de données situées à l'intérieur de chaque
cellule (délimitées par des encadrés noirs). Pour chaque cellule, un
poids provisoire est attribué à chaque point selon le principe suivant :
si une seule donnée est présente dans la cellule, son poids provisoire
est égal à 1 ; s'il y a deux données, chacune reçoit un poids de $1/2$ ;
plus généralement, pour $n$ données dans une cellule, chaque point
reçoit un poids provisoire de $1/n$.

Une fois ces poids provisoires calculés pour l'ensemble des données, ils
sont normalisés de manière à ce que leur somme soit égale à 1, en
divisant chaque poids par le nombre total de cellules occupées ((0,0)
circle (2pt);).

On observe également que certaines cellules ne contiennent aucune
donnée : dans ce cas, aucun poids n'est attribué, ce qui est représenté
visuellement par un cercle rouge vide ((0,0.5) circle (2pt);).

::: figure*
![image](CellulesDeclus.png){width="50%"}
:::

Les poids de dégroupement attribués aux données dépendent de la taille
des cellules et de l'origine de la grille. Il est important de noter que
cette grille n'est qu'un outil intermédiaire pour calculer des poids de
dégroupement, et ne correspond pas à la grille finale utilisée pour la
modélisation du gisement.

Si les cellules sont très petites, chaque donnée se retrouve dans une
cellule unique, et toutes les données ont le même poids.

Si les cellules sont très grandes, toutes les données pourrait tomber
dans une unique cellule et reçoivent là encore un poids égal.

Le choix de la taille, de la forme et de l'origine de la grille demande
des tests de sensibilité. On cherche souvent à ajuster la taille des
cellules pour obtenir environ une donnée par cellule dans les zones
faiblement échantillonnées, ou à calquer la grille sur un maillage de
sondages quasi-régulier s'il existe.

Il est essentiel de vérifier la sensibilité des résultats aux variations
de la taille des cellules. Si une petite variation modifie fortement le
résultat, c'est sans doute dû à une ou deux données avec des valeurs
extrêmes mal pondérées.

Il est aussi courant d'ajuster les poids de manière à minimiser ou
maximiser la moyenne dégroupée, selon que le sur-échantillonnage se
produit dans des zones à forte ou faible teneur. On peut alors tracer
l'évolution de la moyenne dégroupée en fonction de la taille des
cellules pour guider le choix optimal (voir
Fig.[\[fig.CellvsMean\]](#fig.CellvsMean){reference-type="ref"
reference="fig.CellvsMean"}).

Enfin, la forme des cellules doit s'adapter à la géométrie des données.
Par exemple, si les données sont plus denses dans une direction (par
exemple $X$), la taille des cellules dans cette direction doit être
réduite. On appelle ce concept l'anisotropie, et il s'applique à toute
méthode de déviation et de regroupement.

::: figure*
![image](CellSizeVsMean.png){width="50%"}
:::





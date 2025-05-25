---
title: "Rapport Technique - Norme canadienne 43-101 sur l'information"
abstract: |
  Cette section présente la norme canadienne sur les rapports techniques en mine : le rapport NI 43-101. Il s'agit d'une véritable mine d’or d’informations sur les projets miniers, de la phase d’exploration à celle de l’exploitation. Nous découvrirons cela ensemble au fil de cette lecture, accompagnée de quelques concepts interactifs.

project:
  output-dir: exports  # <-- dossier de sortie pour tous les formats

format:
  pdf:
    output-file: ./exports/Chapitre2.pdf
    documentclass: article
    classoption: [10pt, oneside, twocolumn]
    geometry: margin=1in
    markdown_extensions: ["+fenced_divs"]

downloads:
  - file: Chapitre2.pdf    # simple nom de fichier, pas de chemin
    title: PDF
---

:::{important}
### Objectifs d'apprentissage

- Comprendre le contenu et l'utilité des rapports techniques exigés par la norme canadienne NI 43-101 sur l'information relative aux projets miniers ;
- Maîtriser les différentes catégories de ressources et de réserves minières ;
- Comprendre le rôle et les responsabilités de la personne qualifiée (PQ) dans la rédaction d'un rapport conforme à la NI 43-101 ;
- Se familiariser avec l'importance des statistiques dans le processus d'estimation des ressources minières ;
- Être introduit à l'utilité de la géostatistique dans l'évaluation des ressources minérales.
:::

# Rapport technique NI-43-101

Le Règlement 43-101 a pour objectif de garantir que les informations
publiées et diffusées au sujet des propriétés minérales soient exactes,
vérifiables et non trompeuses. Il vise à protéger les investisseurs
contre les déclarations erronées, frauduleuses ou non fondées concernant
des projets miniers, notamment lorsqu'elles sont diffusées sur les
marchés boursiers réglementés par les Autorités canadiennes en valeurs
mobilières.

Ce règlement a été instauré à la suite du scandale Bre-X, afin de
renforcer la transparence et la crédibilité des divulgations techniques
dans le secteur minier.

Dans le cas de Bre-X, les réserves aurifères du projet Busang étaient
annoncées à 200 millions d'onces (environ 6 200 tonnes), ce qui
représentait jusqu'à 8 % des réserves mondiales d'or à l'époque.
Toutefois, il s'est avéré qu'il s'agissait d'une fraude massive : aucun
or n'était réellement présent. Les carottes de forage avaient été
falsifiées par « salage », c'est-à-dire en y ajoutant de l'or provenant
de sources externes. En 1997, l'entreprise Bre-X s'est effondrée et ses
actions ont perdu toute valeur, dans ce qui demeure l'un des plus grands
scandales boursiers de l'histoire du Canada.

Aujourd'hui, le rapport NI 43-101 fait l'objet de certaines critiques de
la part des investisseurs, car il emploie un langage technique avancé,
ce qui ne permet pas toujours à ces derniers de bien analyser le
potentiel minéral et sa valorisation boursière, actuelle ou future[^1].
Toutefois, il constitue une véritable mine d'or d'informations pour les
géoscientifiques, puisqu'il regroupe dans un même document technique des
données géographiques, historiques, géologiques et métallogéniques, en
passant par les travaux d'exploration, de forage, de préparation,
d'analyse et de sécurisation des échantillons. Il couvre également la
vérification des données, les essais de traitement du minerai,
l'estimation des ressources minérales et des réserves minières. Le
rapport traite aussi des méthodes d'exploitation et de récupération, des
études de marché et des contrats, des études environnementales, des
permis requis et des impacts sociaux sur la collectivité. Il se conclut
par un résumé des coûts d'investissement et d'exploitation, suivi d'une
analyse économique du projet.

Il est évident, à la lecture du paragraphe précédent, que le rapport
technique NI 43-101 contient une quantité considérable d'informations
portant sur tous les aspects du cycle de vie d'un projet minier. Ainsi,
la publication d'un rapport aussi complexe --- intégrant un vocabulaire
technique, une terminologie spécialisée ainsi que des données
géologiques, métallurgiques et économiques souvent abstraites --- peut
ne pas être particulièrement utile à un investisseur qui n'est pas en
mesure de comprendre pleinement ou correctement le contenu et
l'importance de ces informations.

C'est pourquoi de nombreux investisseurs font appel à des
ingénieurs-conseils en géologie et en ingénierie minière, ou encore à
des géologues indépendants, pour analyser ces rapports. Cette capacité
d'analyse et de communication technique sera au cœur de votre futur rôle
en tant qu'ingénieur.

Ce type de rapport ne se limite pas au domaine minier : on retrouve
également des rapports techniques en géotechnique, en hydrogéologie, en
conception d'infrastructures, et bien d'autres domaines encore. Dans le
cadre de ce cours, nous nous concentrerons sur l'estimation et
l'évaluation des ressources minières à l'aide de méthodes
géostatistiques. L'objectif du cours est double : apprendre à estimer
les ressources minières, mais aussi à interpréter, comprendre et rédiger
des rapports techniques.

# Estimation des ressources minières

Afin d'opérer adéquatement une mine, il nous faut absolument construire
un modèle de bloc contenant la teneur du bloc
(Fig.[\[fig:blocmodele\]](#fig:blocmodele){reference-type="ref"
reference="fig:blocmodele"}). La géostatistique permet de réaliser une
estimation de ces teneurs pour tout élément de volume ou de surface à
partir d'un échantillonnage limité de ces teneurs, c'est-à-dire nos
données de forage exploratoire. Par la suite, on peut appliquer des
méthodes de recherche opérationnelle afin de sélectionner les blocs qui
seront traités au concentrateur et ceux qui seront envoyés directement
vers la halde à stériles (i.e., dépôt de matériaux excavés lors de
l'exploitation minière, constitué principalement de roches ou de sols
sans valeur économique, appelés \"stériles\", qui ne contiennent pas les
minéraux extraits).

La majorité des méthodes géostatistiques (et même les méthodes
conventionnelles) sont basées sur un calcul de moyenne pondérée qui
attribue des poids aux observations en fonction de la position spatiale
des observations par rapport à l'élément de volume ou de surface que
l'on veut estimer. Dans les méthodes géostatistiques, l'élément de
volume (ou de surface) est défini a priori et est habituellement relié à
la méthode d'exploitation minière. Ainsi, on assigne une « zone
d'influence » à chaque observation. La façon dont ces zones d'influence
sont construites définit le volume (ou la surface) estimée.

La variable d'intérêt (teneur ou autre) est connue habituellement en des
points (ou des petits supports). On dénote ces valeurs connues aux
points $x_i$, $i=1\ldots n$, par $Z(x_i)$ ou plus succinctement $Z_i$,
$n$ étant le nombre total de données. On fait l'estimation en un point
donné $x_0$. L'estimation est notée $Z^*(x_0)$ ou $Z^*_0$. Toutes les
méthodes d'estimation courantes peuvent s'écrire comme une combinaison
linéaire des valeurs observées, i.e. :

$$Z^*_0 = \sum_{i=1}^n \lambda_i Z_i$$ avec la contrainte :

$$\sum_{i=1}^n \lambda_i = 1$$

Cette dernière assure que l'estimation est sans biais sous hypothèse de
stationnarité (ou d'homogénéité statistique), c'est-à-dire que la
moyenne et la variance de notre système sont constantes peu importe la
localisation où l'on se trouve dans la mine. Nous verrons ultérieurement
la définition plus en détail de ce concept. Les poids $\lambda_i$ sont
propres à chaque méthode et reflètent la similitude anticipée de
l'observation en $x_i$ avec la valeur non observée en $x_0$.

# Classification des ressources et des réserves minières

Afin de pouvoir exploiter un gisement minier, il est important de
catégoriser les ressources afin de parler le même langage avec tous les
intervenants de la société minière. Ces définitions sont déterminées par
l'Institut canadien des mines, de la métallurgie et du pétrole (ICM),
dont le rapport NI 43-101 fait usage.

Lors de l'exploitation minière, le sous-sol est subdivisé en blocs de
dimensions données --- supposons ici des blocs de
15 m $\times$ 15 m $\times$ 15 m (voir
[Fig. %s](#Chap2_BlocModele.png). Cette subdivision constitue ce que l'on
appelle un modèle de blocs de la mine. L'objectif est d'estimer, à
partir des données disponibles, la quantité de métal (ou la teneur)
présente dans chacun de ces blocs. Il va de soi que, lors des
opérations, on accorde une plus grande importance aux blocs ayant les
teneurs les plus élevées : ils seront inévitablement plus rentables,
d'un point de vue économique.

```{figure} images/Chap2_BlocModele.png
:label: Chap2_BlocModele.png
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

::: description
\
Partie d'une ressource minérale dont la quantité et la teneur sont
estimées sur la base de **preuves géologiques et d'un échantillonnage
limité**. Ces preuves sont suffisantes pour **inférer**, mais non pour
démontrer de façon fiable, la continuité géologique et celle des
teneurs. Le niveau de confiance est donc **faible**. Typiquement, les
données proviennent d'affleurements, de tranchées, de travaux de
développement ou de forages. La confiance dans ces estimations n'est pas
suffisante pour permettre une analyse économique --- **aucune réserve
minérale ne peut être définie à partir de cette catégorie**.

\
Partie d'une ressource minérale pour laquelle la quantité, la teneur, la
densité, la forme et les caractéristiques physiques sont **estimées avec
un niveau de confiance raisonnable**. Les données sont suffisamment
abondantes et bien réparties pour **supposer la continuité géologique
et/ou minéralisée**, sans toutefois pouvoir la démontrer entièrement. Ce
niveau de confiance permet généralement une première **analyse
économique** et la **planification préliminaire** du projet minier.

\
Partie d'une ressource minérale pour laquelle les paramètres géologiques
(quantité, teneur, densité, forme, propriétés physiques) sont **estimés
avec un haut niveau de confiance**. Les données disponibles sont
**suffisamment abondantes et rapprochées** pour démontrer clairement la
continuité géologique et/ou de la minéralisation. Ce niveau de certitude
permet une **planification minière détaillée** ainsi qu'une **évaluation
économique fiable** du gisement.
:::

À partir de ces notions, la distinction entre ressources et réserves
dépend d'une multitude de facteurs que nous ne couvrirons pas dans ce
cours. Une illustration de ces facteurs influençant la classification
des ressources en réserves minérales est donnée à la
[Fig. %s](#Chap2_ReservesRessources.png). Il est à noter qu'une **réserve
minérale** est la partie économiquement exploitable d'une ressource
minérale mesurée et/ou indiquée. Cela doit être démontré par une étude
de préfaisabilité ou de faisabilité, laquelle doit prouver qu'au moment
de la déclaration, l'extraction peut être raisonnablement justifiée.

```{figure} images/Chap2_ReservesRessources.png.png
:label: Chap2_ReservesRessources.png.png
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
les consulter librement. Notre premier exemple conserne les méthodes
d'évaluation des ressources et des réserces minières de la mine Canadien
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

## Classification géostatistique des ressources à la mine Canadian Malartic {#classification-géostatistique-des-ressources-à-la-mine-canadian-malartic .unnumbered}

Pour la mine Canadian Malartic (CMM), plusieurs des critères de
classification des ressources sont quantifiables à l'aide des outils
géostatistiques qui seront abordés dans les prochaines lectures. Ces
critères permettent de construire un modèle de blocs, similaire à la
[Fig. %s](#Chap2_BlocModele.png), mais propre à la géologie de la mine CMM.
Les ressources mesurées, indiquées et présumées sont alors définies à
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
mesurées, indiquées, présumées, ou aucun type de ressource.

-   **Ressources mesurées :** Blocs estimés lors des premières passes
    d'interpolation et utilisant plus de 65 % de forages récents
    (2005--2020). Les blocs estimés lors de la deuxième passe, mais
    situés à moins de 20 m de la surface minée, sont également classés
    comme mesurés.

-   **Ressources indiquées :** Blocs interpolés durant la première passe
    qui ne satisfont pas aux critères des ressources mesurées, ainsi que
    les blocs estimés lors de la deuxième passe.

-   **Ressources présumées :** Blocs estimés durant les dernières passes
    d'interpolation. La CMM souligne qu'une compréhension géologique
    plus approfondie et une validation plus poussée du modèle sont
    nécessaires pour reclassifier ces ressources en catégories indiquée
    ou mesurée.

## Exemple 2 : Rapport NI-43-101 - Propriété Grevet - Mountain - 2007

Le rapport NI-43-101 de la propriété Gevet-Mountain soulève un point
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

# Personnes qualifiées

La participation d'une personne qualifiée (PQ) est un élément central de
la norme canadienne NI 43-101 sur l'information scientifique et
technique relative aux projets miniers.

Une PQ est un ingénieur ou un géoscientifique possédant au moins cinq
ans d'expérience pertinente en exploration minérale, en développement ou
exploitation de mines, ou en évaluation de projets miniers. Elle doit
également être membre en règle d'un ordre professionnel reconnu et
démontrer sont expériences relatives au projet qu'il participe.

Par exemple, selon les définitions de l'ICM, pour qu'une personne soit
qualifiée comme PQ en estimation des réserves minérales pour des
gisements d'or alluvial, elle doit posséder une expérience pertinente en
évaluation et en exploitation de ce type de gisement. En revanche, une
expérience acquise sur des placers (i.e., gisement alluvial) contenant
des minéraux autres que l'or ne constitue pas nécessairement une
expérience pertinente pour un gisement d'or alluvial.

Au Canada, l'appartenance à une association provinciale ou territoriale
d'ingénieurs ou de géoscientifiques permet de satisfaire à ce critère.
Toutefois, la plupart des associations professionnelles étrangères ne
sont pas reconnues légalement. Une liste des associations étrangères
reconnues est fournie en annexe A de la norme NI 43-101. Cette liste
peut évoluer avec le temps.

## Expériences de la personne qualifiée

La décision de savoir si une personne possède l'expérience requise pour
agir à titre de PQ doit être évaluée au cas par cas. Une expérience
pertinente est essentielle pour qu'une PQ puisse assumer ses
responsabilités, qui incluent :

-   Se conformer au code de déontologie de son ordre professionnel ainsi
    qu'aux lignes directrices et aux normes émises par l'ICM (Institut
    canadien des mines, de la métallurgie et du pétrole) ;

-   Exécuter uniquement des travaux relevant de son domaine de
    compétence, avec honnêteté et intégrité ;

-   Vérifier les données techniques en appliquant une diligence
    raisonnable, adaptée aux circonstances ;

-   Communiquer, en langage clair, les risques importants associés au
    projet examiné, afin que les investisseurs puissent en comprendre
    les enjeux ;

-   Examiner les divulgations de l'émetteur pour s'assurer qu'elles
    reflètent fidèlement ses conclusions et que ses propos n'ont pas été
    déformés.

## Responsabilités de la personne qualifiée

La PQ doit se conformer aux normes professionnelles et aux meilleures
pratiques de l'industrie. Les autorités de réglementation ont indiqué
que « la personne qualifiée doit être clairement convaincue qu'elle
serait en mesure de se présenter devant ses pairs et de démontrer sa
compétence ainsi qu'une expérience pertinente en lien avec la substance,
le type de gisement et le contexte considéré. »

La PQ responsable principale du rapport technique doit effectuer une
visite du site. Si plusieurs PQ sont impliquées, celle dont l'expertise
est directement liée à une problématique spécifique (ex. métallurgie)
doit effectuer la visite. Il est ainsi possible d'avoir plusieurs PQ
rédigeant le rapport NI-43-101. Il de la responsabilité du PQ d'abauser
sa signature seulement pour les sections qu'il a participé à la
rédaction (voir le rapport NI-43-101 daté de 2024 de la Canadian
Malartic Mine).

La vérification des données est un élément clé de la NI 43-101. La PQ
doit indiquer explicitement si cette vérification a été faite ou non, et
en expliquer les raisons si elle ne l'a pas été.

## Certificats et consentements

Toute PQ ayant rédigé tout ou une partie d'un rapport technique doit
fournir :

-   **Un certificat** (conformément à la section 8.1(2) de la NI
    43-101), incluant notamment :

    -   Un résumé de son expérience pertinente ;

    -   Les sections du rapport dont elle est responsable ;

    -   Une déclaration sur son indépendance vis-à-vis de l'entreprise.

-   **Un consentement écrit**, dans lequel la PQ :

    -   Autorise la diffusion publique du rapport technique ;

    -   Confirme que les informations contenues dans les documents
        publics (ex. communiqué de presse, formulaire annuel)
        représentent fidèlement le contenu du rapport technique.

Une PQ ne peut être tenue responsable si l'entreprise cite
incorrectement ses propos, sauf si elle a donné son consentement après
révision du document de divulgation. Elle ne doit donc jamais accorder
son consentement à l'avance.

# Contenue du rapport NI-43-101

Le rapport technique vise à fournir un **résumé** des renseignements
scientifiques et techniques importants concernant les activités
d'exploration, de développement et de production sur un terrain minier
qui est important pour l'émetteur.

Le contenue du rapport technique NI-43-101 repose sur toutes les données
disponibles qui sont pertinente aux projet auxquel il est déposé.

Le rapport inclus une page de titre indiquant le titre du rapport
technique, l'emplacement du projet minier, le nom et le titre
professionnel de chacune des personnes qualifiées et la date d'effet du
rapport technique.

Le rapport inclus aussi au début ou à la fin une page de signature
signée conformément à l'article 5.2 de la règle. La date d'effet du
rapport technique et la date de signature doivent figurer sur la page de
signature.

Comme tous rapport, une table des matières énumérant notamment les
sections, les figures et les tableaux doit être présent.

La norme impose une structure assez rigide sur le format, comportant un
total dde 27 rubrique (pour un rapport en francais, an anglais celle-ci
est de 24). Ces rubriques ne sont pas tous obligatoires, dans le sens,
qu'il doit y avoir des données disponibles en lien avec la section pour
la rédiger. Voici un bref descriptif des 27 sections d'un rapport en
francais :

-   **Rubrique 1 -- Résumé**\
    Cette section résume les informations clés du rapport technique: la
    description détaillée du terrain et de sa localisation, les
    propriétaires du projet, ainsi que le cadre géologique et la
    minéralisation présente. Il fournit également un état d'avancement
    des travaux d'exploration, de développement et d'exploitation, ainsi
    que les estimations des ressources et réserves minérales. Enfin, le
    rapport inclut les conclusions et recommandations de la personne
    qualifiée, qui évalue la viabilité du projet et propose des étapes
    futures.

-   **Rubrique 2 -- Introduction**\
    Cette section présente les éléments suivants : l'émetteur et le
    destinataire du rapport technique ; le mandat confié ainsi que
    l'objectif pour lequel le rapport a été rédigé ; les sources des
    informations et des données contenues dans le rapport ou utilisées
    pour sa préparation, avec des références si nécessaire ; et les
    détails concernant la visite du terrain par chaque personne
    qualifiée, ou, le cas échéant, les raisons pour lesquelles la visite
    n'a pas pu être réalisée.

-   **Rubrique 3 -- Recours à d'autres experts**\
    Présentation des contributions d'experts externes ou d'autres
    professionnels impliqués dans l'analyse ou la rédaction du rapport.

-   **Rubrique 4 -- Description et emplacement du terrain**\
    Cette section présente des informations clés sur le terrain, telles
    que sa superficie, son emplacement géographique précis, le type de
    titre minier (claim, permis, concession) ainsi que les détails
    associés (nom, numéro). Elle décrit également les droits de
    l'émetteur sur le terrain, incluant les droits de surface, d'accès,
    les obligations pour conserver les droits et la date d'expiration
    des titres. En outre, elle aborde les modalités des redevances et
    autres charges éventuelles, les obligations environnementales, les
    permis nécessaires pour les travaux projetés, ainsi que les risques
    et facteurs pouvant affecter l'accès au terrain et la réalisation
    des travaux.

-   **Rubrique 5 -- Accessibilité, climat, ressources locales,
    infrastructure et géographie physique**\
    Cette section décrit plusieurs aspects importants du terrain, y
    compris sa topographie, son altitude et la végétation présente. Elle
    précise les voies d'accès disponibles pour rejoindre le site, ainsi
    que la proximité du terrain par rapport à une agglomération et les
    moyens de transport accessibles. Selon la pertinence pour le projet
    minier, elle aborde également le climat et la durée de la saison
    d'exploitation. De plus, si cela est pertinent pour le projet, elle
    traite de la suffisance des droits de surface pour l'exploitation
    minière, des besoins en électricité et en eau, ainsi que de leur
    provenance, du personnel minier nécessaire, des aires de stockage
    des stériles et des résidus, des zones de lixiviation en tas et des
    sites potentiels pour l'usine de traitement.

-   **Rubrique 6 -- Historique**\
    Cette section décrit plusieurs éléments liés à l'historique du
    terrain, notamment les propriétaires antérieurs et les changements
    de propriété. Elle inclut également des informations sur les travaux
    d'exploration et de développement réalisés par les anciens
    propriétaires ou exploitants, en précisant le type, le montant, la
    quantité, ainsi que les résultats généraux de ces travaux. En outre,
    elle présente les estimations historiques importantes des ressources
    minérales et des réserves minérales, conformément aux exigences de
    l'article 2.4 de la règle. Enfin, elle mentionne toute production
    obtenue du terrain. Il est important de noter que si des travaux ont
    été réalisés en dehors des limites actuelles du terrain, une
    distinction claire doit être faite entre ces travaux et ceux
    effectués sur le terrain couvert par le rapport.

-   **Rubrique 7 -- Contexte géologique et minéralisation**\
    Cette section doit décrire la géologie régionale et locale du
    terrain, en incluant des informations sur les formations géologiques
    environnantes et spécifiques au site. Il faut également préciser les
    zones minéralisées importantes trouvées sur le terrain, en résumant
    la lithologie des épontes (roches environnantes), ainsi que les
    contrôles géologiques qui influencent la minéralisation. L'analyse
    doit inclure la longueur, la largeur, la profondeur et la continuité
    de la minéralisation, en détaillant son type, son caractère (par
    exemple, sulfureux, aurifère, etc.) et sa distribution géographique
    dans la zone étudiée.

-   **Rubrique 8 -- Types de gîtes minéraux**\
    Cette section doit décrire les types de gîtes minéraux étudiés lors
    des travaux de prospection ou d'exploration. Il convient de préciser
    la nature des gîtes (par exemple, or, cuivre, zinc, argent, etc.),
    leurs caractéristiques géologiques spécifiques et les formations
    géologiques associées. En outre, il faut décrire le modèle
    géologique ou les concepts géologiques appliqués dans la
    prospection, tels que les structures géologiques, la minéralisation
    ou les processus géologiques qui sont supposés contrôler la
    formation des gîtes minéraux. Ce modèle géologique sert de base au
    programme d'exploration, orientant les méthodes et techniques
    utilisées pour localiser et caractériser les ressources minérales
    présentes sur le terrain.

-   **Rubrique 9 -- Travaux d'exploration**\
    Cette section décrit brièvement les travaux d'exploration réalisés,
    à l'exception du forage, par l'émetteur ou pour son compte. Elle
    couvre les méthodes utilisées (levés, prospection), les techniques
    d'échantillonnage (incluant la qualité et la représentativité des
    échantillons), ainsi que l'emplacement, la densité et la superficie
    des échantillons. Les résultats significatifs de ces travaux sont
    présentés avec une interprétation détaillée. Si des résultats
    d'exploration antérieurs sont mentionnés, une distinction claire
    entre les travaux passés et ceux réalisés par l'émetteur est faite.

-   **Rubrique 10 -- Forage**\
    Cette section décrit le forage effectué sur le terrain, y compris
    les méthodes utilisées et un résumé des résultats pertinents. Elle
    aborde également les facteurs pouvant affecter l'exactitude et la
    fiabilité des résultats, tels que ceux liés à l'échantillonnage et à
    la récupération. Pour les terrains en phase préliminaire, elle
    précise l'emplacement, l'azimut, l'inclinaison des forages ainsi que
    la profondeur des intervalles échantillonnés. Si l'orientation de la
    minéralisation est connue, la relation entre la longueur de
    l'échantillon et l'épaisseur réelle de la minéralisation est
    fournie. En cas d'intersection de faible teneur avec des intervalles
    à teneur plus élevée, ces résultats sont détaillés. Si des résultats
    de forages antérieurs sont inclus, une distinction claire entre les
    forages effectués par l'émetteur et les anciens exploitants est
    faite.

-   **Rubrique 11 -- Préparation, analyse et sécurité des
    échantillons**\
    Cette section fournit des détails sur la préparation et l'analyse
    des échantillons recueillis. Elle inclut les méthodes de préparation
    des échantillons, ainsi que les mesures de contrôle de qualité
    appliquées avant leur envoi à un laboratoire. Elle décrit les
    procédés utilisés pour fendre et réduire les échantillons, ainsi que
    les mesures de sécurité mises en place pour garantir la validité et
    l'intégrité des échantillons. Les informations pertinentes
    concernant les méthodes d'analyse de la teneur et autres analyses
    sont fournies, en mentionnant les laboratoires impliqués, leur
    certification par un organisme de normalisation si applicable, et la
    relation entre le laboratoire et l'émetteur. Cette section résume
    également les procédures de contrôle de la qualité suivies, ainsi
    que les mesures d'assurance de la qualité mises en œuvre pour
    garantir un niveau de fiabilité satisfaisant des données collectées.
    Enfin, l'opinion de l'auteur sur l'adéquation des procédés de
    préparation et d'analyse, ainsi que des mesures de sécurité, est
    présentée.

-   **Rubrique 12 -- Vérification des données**\
    Cette section décrit les étapes suivies par la personne qualifiée
    pour vérifier les données présentées dans le rapport technique. Elle
    inclut les procédés de vérification des données appliqués, tels que
    l'examen des sources, la comparaison avec d'autres jeux de données
    ou la validation des résultats à l'aide de techniques appropriées.
    Les limites de la vérification, ou l'absence de vérification, sont
    également mentionnées, accompagnées des raisons expliquant pourquoi
    certaines données n'ont pas été vérifiées. Enfin, l'avis de la
    personne qualifiée sur l'adéquation des données pour les besoins du
    rapport technique est fourni, notamment en termes de qualité, de
    fiabilité et de pertinence des informations pour les conclusions et
    recommandations du rapport.

-   **Rubrique 13 -- Essais de traitement des minerais et essais
    métallurgiques**\
    Si des analyses d'essais de traitement des minerais ou d'essais
    métallurgiques ont été réalisées, cette section décrit la nature et
    l'étendue des procédés d'essai, en résumant les résultats pertinents
    obtenus. Elle fournit également les bases des hypothèses ou
    prévisions concernant les taux de récupération estimés, en
    expliquant les raisonnements utilisés. Si les informations sont
    disponibles, la représentativité des échantillons par rapport aux
    différents types et styles de minéralisation ainsi qu'à l'ensemble
    du gîte ou du gisement est précisée. Enfin, la section mentionne
    tout facteur de traitement ou élément délétère, connu ou suspecté,
    qui pourrait affecter de manière significative le potentiel
    d'extraction rentable des minerais.

-   **Rubrique 14 -- Estimations des ressources minérales**\
    Le rapport technique relatif aux ressources minérales doit respecter
    plusieurs obligations pour assurer la transparence et la rigueur de
    l'estimation. Il doit notamment fournir des informations suffisantes
    sur les hypothèses clés, les méthodes et les paramètres utilisés
    dans l'estimation des ressources minérales, de manière à permettre à
    un lecteur raisonnablement informé de comprendre les bases de
    l'estimation et son processus de réalisation. Il doit également se
    conformer aux exigences de la norme, y compris celles des articles
    2.2, 2.3 et 3.4. Lorsque des ressources minérales contenant
    plusieurs produits sont exprimées en équivalent métal ou minéral, le
    rapport doit détailler la teneur de chaque métal ou minéral, ainsi
    que les cours, les taux de récupération et tout autre facteur de
    conversion pertinent utilisés. De plus, le rapport doit fournir une
    description générale des facteurs environnementaux, des permis, des
    titres de propriété, des questions juridiques, fiscales, politiques
    ou sociopolitiques, ou de tout autre élément pertinent qui pourrait
    influencer de manière significative les estimations des ressources
    minérales. Enfin, lorsqu'une quantité et une teneur sont indiquées,
    elles doivent être arrondies pour signifier qu'il s'agit d'une
    estimation approximative. Si plusieurs scénarios de teneur de
    coupure sont présentés, le scénario de base ou privilégié doit être
    mis en avant, et toutes les estimations doivent répondre au critère
    de la perspective raisonnable d'extraction rentable.

-   **Rubrique 15 -- Estimations des réserves minérales**\
    Le rapport technique relatif aux réserves minérales doit respecter
    plusieurs obligations pour garantir la transparence et la rigueur
    dans l'estimation. Il doit fournir suffisamment d'informations et de
    détails sur les hypothèses clés, les méthodes et les paramètres
    utilisés, permettant ainsi à un lecteur raisonnablement informé de
    comprendre comment les ressources minérales ont été converties en
    réserves minérales. Le rapport doit également se conformer aux
    exigences d'information prévues par la règle, y compris les articles
    2.2, 2.3 et 3.4. Lorsqu'une teneur de réserves minérales contenant
    plusieurs produits est déclarée en équivalent métal ou minéral, le
    rapport doit spécifier la teneur de chaque métal ou minéral, ainsi
    que les cours, les taux de récupération et tout autre facteur de
    conversion pertinent utilisé pour estimer la teneur de l'équivalent
    métal ou minéral. Enfin, il doit décrire dans quelle mesure des
    facteurs miniers, métallurgiques, liés aux infrastructures ou aux
    permis, ou d'autres facteurs pertinents, peuvent influencer de
    manière importante les estimations des réserves minérales.

-   **Rubrique 16 -- Méthodes d'exploitation**\
    Les méthodes d'exploitation actuelles ou envisagées doivent être
    décrites de manière à fournir une vue d'ensemble de leur pertinence
    et de leur adéquation avec les ressources ou réserves minérales
    disponibles. Il est essentiel de résumer les renseignements ayant
    permis d'évaluer la susceptibilité, réelle ou potentielle, des
    ressources ou réserves aux méthodes d'exploitation envisagées. Les
    éléments suivants peuvent être inclus :

    -   **Paramètres géotechniques et hydrologiques** : Ces facteurs
        doivent être pris en compte dans la conception et l'élaboration
        des plans de mines ou de fosses. Ils incluent la stabilité des
        pentes, la gestion des eaux souterraines et de surface, ainsi
        que les conditions de terrain pouvant influencer la méthode
        d'exploitation choisie.

    -   **Taux de production et durée de vie de la mine** : Le rapport
        doit indiquer les taux de production prévus, la durée de vie
        estimée de la mine, ainsi que les dimensions des unités
        minières. Les facteurs de dilution minière doivent également
        être précisés pour comprendre l'impact sur la quantité et la
        qualité des ressources extraites.

    -   **Travaux nécessaires** : Il est important de détailler les
        travaux de décapage, le développement souterrain et le
        remblayage requis pour l'exploitation, afin de garantir une
        gestion adéquate des ressources et des infrastructures.

    -   **Parc de véhicules et équipements miniers** : Le rapport doit
        décrire les équipements nécessaires pour l'exploitation, y
        compris les types de véhicules, de machines de forage, de
        concassage, et d'autres outils nécessaires à l'opération
        minière.

    Ces éléments sont cruciaux pour évaluer la faisabilité technique des
    méthodes d'exploitation envisagées, et leur précision augmente à
    mesure que l'on progresse dans les études économiques et techniques.

-   **Rubrique 17 -- Méthodes de récupération**\
    Les renseignements sur les résultats des essais ou les résultats
    d'exploitation concernant le degré de récupération de la composante
    ou du produit de valeur et la susceptibilité de la minéralisation
    aux méthodes de traitement envisagées doivent être fournis de
    manière détaillée. Ces éléments permettent d'évaluer l'efficacité
    des méthodes de traitement et la rentabilité du projet minier. Les
    informations suivantes peuvent être incluses :

    -   **Description ou schéma de production de l'usine de traitement**
        : Il est essentiel de décrire la conception générale de l'usine
        de traitement, que ce soit une installation actuelle ou
        envisagée. Cela inclut le type de procédé utilisé (par exemple,
        flottation, lixiviation en tas, traitement par gravité, etc.)
        ainsi que les principales étapes du traitement du minerai. Un
        schéma de production, si disponible, peut aider à visualiser les
        différentes étapes du processus.

    -   **Plan de l'usine et caractéristiques techniques des
        équipements** : Le plan de l'usine doit être détaillé, incluant
        la disposition des équipements, les circuits de traitement, les
        zones de stockage, et les infrastructures liées. Les
        caractéristiques techniques des équipements, tels que les
        broyeurs, les concentrateurs, les filtres, ou les réacteurs
        chimiques, doivent également être précisées pour évaluer leur
        adéquation aux besoins du projet.

    -   **Besoins en énergie, eau et matières de traitement** : Une
        évaluation des besoins en énergie (électricité, gaz, etc.), en
        eau (pour le traitement et l'épuration des effluents), et en
        matières de traitement (réactifs chimiques, agents de
        flottation, etc.) doit être incluse. Cela permet de comprendre
        les ressources nécessaires pour faire fonctionner l'usine et
        d'évaluer l'impact environnemental du projet.

    Ces éléments sont importants pour déterminer la viabilité technique
    et économique de l'exploitation minière, et pour s'assurer que
    l'infrastructure et les ressources nécessaires sont suffisantes pour
    soutenir le projet à long terme.

-   **Rubrique 18 -- Infrastructures du projet**\
    Présenter un résumé des besoins en infrastructure et en logistique
    du projet, incluant, le cas échéant, les routes, les voies ferrées,
    les installations portuaires, les barrages, les haldes, les stocks
    de réserves, les zones de lixiviation, l'évacuation des stériles,
    les besoins en énergie et les pipelines.

-   **Rubrique 19 -- Études de marché et contrats**\
    Présenter les informations disponibles sur les marchés pour la
    production de l'émetteur, y compris les modalités des mandats
    conclus. Expliquer les études et analyses effectuées, telles que les
    études de marché, les projections des prix des produits, les
    évaluations de produits, les stratégies d'entrée sur le marché et
    les exigences techniques. Confirmer que la personne qualifiée a
    examiné ces études et que les résultats soutiennent les hypothèses
    du rapport technique. Mentionner les contrats importants nécessaires
    au développement du terrain, tels que ceux liés à l'exploitation, au
    traitement, à la fonderie, à l'affinage, au transport, à la vente et
    à la couverture. Indiquer les contrats déjà conclus et ceux en
    négociation, et préciser si leurs modalités correspondent aux normes
    du secteur.

-   **Rubrique 20 -- Études environnementales, permis et conséquences
    sociales ou sur la collectivité**\

    # Permis et facteurs environnementaux et sociaux {#permis-et-facteurs-environnementaux-et-sociaux .unnumbered}

    Décrire les renseignements disponibles concernant les permis et les
    facteurs environnementaux, sociaux ou liés à la collectivité se
    rapportant au projet. Les éléments suivants peuvent être inclus :

    -   **Résumé des études environnementales :** Un résumé des
        résultats des études environnementales effectuées, le cas
        échéant, ainsi qu'une description des questions
        environnementales connues susceptibles d'avoir une incidence
        importante sur la capacité de l'émetteur d'extraire les
        ressources minérales ou les réserves minérales.

    -   **Plans de gestion des résidus et de l'eau :** Les besoins et
        les plans en matière d'évacuation des résidus et des stériles,
        de surveillance du site et de gestion de l'eau, tant au cours de
        l'exploitation qu'après la fermeture de la mine.

    -   **Permis nécessaires :** Les permis requis pour le projet,
        l'état de toute demande de permis et toute exigence connue quant
        aux cautionnements d'exécution ou de remise en état à déposer.

    -   **Exigences sociales ou communautaires :** Une description de
        toute exigence ou plan en matière sociale ou concernant la
        collectivité, ainsi que l'état des négociations ou des ententes
        avec les collectivités locales, le cas échéant.

    -   **Fermeture de la mine :** Une description des exigences et des
        coûts liés à la fermeture de la mine, y compris la
        réhabilitation et la remise en état.

-   **Rubrique 21 -- Coûts d'investissement et coûts opérationnels**\
    Fournir un résumé des estimations des coûts d'investissement et des
    coûts opérationnels, en présentant les principales composantes sous
    forme de tableau. Expliquer et justifier la base sur laquelle ces
    estimations ont été établies.

-   **Rubrique 22 -- Analyse économique**\
    L'analyse économique du projet doit présenter les principales
    hypothèses utilisées et justifier les prévisions de trésorerie
    annuelles basées sur les réserves ou ressources minérales,
    accompagnées d'un calendrier de production couvrant la durée de vie
    du projet. Elle doit inclure des indicateurs financiers tels que la
    valeur actualisée nette (VAN), le taux de rendement interne (IRR) et
    le délai de récupération de l'investissement. De plus, un résumé des
    impôts, taxes, redevances et autres contributions applicables doit
    être fourni, ainsi que des analyses de sensibilité aux variations
    des prix des produits, des teneurs, des coûts d'investissement et
    des coûts opérationnels.

-   **Rubrique 23 -- Terrains adjacents**\
    Le rapport technique peut inclure des informations sur un terrain
    adjacent si elles sont publiées par le propriétaire ou l'exploitant
    du terrain, avec la source clairement indiquée. Le rapport doit
    préciser que la personne qualifiée n'a pas vérifié l'exactitude des
    informations, qu'elles ne sont pas nécessairement représentatives de
    la minéralisation du terrain principal, et distinguer clairement ces
    données de celles concernant le terrain principal. Les estimations
    historiques de ressources ou réserves doivent également être
    communiquées conformément à la règle applicable.

-   **Rubrique 24 -- Autres données et renseignements pertinents**\
    Cette section doit inclure toute information ou explication
    supplémentaire nécessaire pour garantir sa clarté et éviter toute
    ambiguïté ou tromperie, assurant ainsi qu'il soit compréhensible
    pour le lecteur.

-   **Rubrique 25 -- Interprétation et conclusions**\
    Cette section résume les interprétations et résultats clés, en
    mettant en évidence les risques et incertitudes qui pourraient
    affecter la fiabilité des données d'exploration, des estimations des
    ressources ou des résultats économiques prévus. Il doit également
    décrire l'impact de ces risques sur la viabilité économique du
    projet. Les conclusions de la personne qualifiée doivent être
    clairement présentées.

-   **Rubrique 26 -- Recommandations**\
    Cette section doit préciser les programmes de travaux recommandés,
    avec un détail des coûts pour chaque phase. Si les travaux sont
    réalisés en plusieurs phases successives, chacune doit permettre de
    prendre une décision avant de passer à la suivante. Les
    recommandations ne doivent pas dépasser deux phases et doivent
    préciser si le passage à la phase suivante dépend des résultats
    positifs de la phase précédente. Si aucune recommandation
    significative ne peut être faite, cela doit être expliqué, notamment
    dans le cas de projets en développement ou en production où les
    principales études sont terminées.

-   **Rubrique 27 -- Références**\
    Cette section fourni la liste détaillée de toutes les sources citées
    dans le rapport technique.

Les sections 1 à 14 et de 23 à 27 sont obligatoires à tous les rapport
techniques. Les section 15 à 22, il s'agit d'obligation supplémentaires
portant sur des terrains à un stade avancé. Par exemple, la minière
commence à évaluer l'ouverture du mine avec des études de éconimiques et
géométalurgique.

[^1]: J'ai quelques réserves sur ce point. En réalité, les définitions
    sont encadrées par la réglementation et le langage est standardisé.
    Il est vrai qu'une première lecture d'un rapport peut en rendre la
    compréhension difficile, mais avec l'expérience et le soutien
    technique, la lecture devient accessible. Au final, tout s'apprend.



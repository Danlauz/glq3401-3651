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
une roche molle, [Fig. %s](#Chap5_ImgDeviation.png)a). En revanche, s'il est foré avec un angle
plus élevé, il aura tendance à se dévier perpendiculairement à ces plans
de faiblesse (e.g., d'une roche molle vers une roche dure,
[Fig. %s](#Chap5_ImgDeviation.png)b).

```{figure} images/Chap5_ImgDeviation.png
:label: Chap5_ImgDeviation.png
:align: center 
Exemple de déviation typique, mais simplifié
```

Un exemple célèbre illustrant l'importance de la mesure des déviations
est celui de la mine Louvicourt. Les forages ont dévié de manière
significative et l'arpentage a été mal réalisé. En conséquence, une
forte surestimation des réserves minérales a été observée. La minière
pensait disposer d'une veine minéralisée de plus de 40 Mt, ce qui
permettait d'envisager une durée de vie de la mine de 25 ans, mais la
réalité était tout autre. Les réserves se sont avérées être d'environ 15
Mt (une diminution de 25 Mt), avec une durée de vie réduite à seulement
10 ans.

La [Fig. %s](#Chap5_ImpactDev.png) illustre cette problématique. Les
ingénieurs croyaient avoir affaire à une veine dont la longueur
correspond à la ligne rose, avec des forages supposés non déviés (lignes
bleues). Cependant, les forages ont en réalité subi des déviations
importantes (lignes noires), et la longueur réelle de la minéralisation
est beaucoup plus courte (ligne rouge). On observe clairement la
surestimation de la longueur de la veine minéralisée.

```{figure} images/Chap5_ImpactDev.png
:label: Chap5_ImpactDev.png
:align: center 
Impact des déviations lorsque non considéré
```
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

## Méthode tangentielle équilibrée (Balanced Tangential Method)

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

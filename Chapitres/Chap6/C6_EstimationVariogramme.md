\# 6.2 Estimation du variogramme



On estime le variogramme à l'aide de la formule suivante :



$$

\\gamma(h) = \\frac{1}{2N(h)} n’assure que la continuité soit identique dans toutes les directions.  

Par exemple :

\- Les teneurs peuvent montrer une meilleure continuité \*\*parallèlement à la stratigraphie\*\* que \*\*perpendiculairement\*\*.

\- En cas de contamination par des hydrocarbures, on peut observer une meilleure continuité \*\*horizontalement\*\* que \*\*verticalement\*\*, en raison de la gravité.



---



\## Variogramme directionnel



Si le nombre d’observations le permet (typiquement \*\*au moins 50\*\*, préférablement \*\*100\*\*), on peut vérifier cette anisotropie en calculant le variogramme expérimental dans différentes directions.



On peut ainsi calculer le variogramme selon certaines directions spécifiques :



$$

\\gamma(h, \\theta) = \\frac{1}{2N(h, \\theta)} \\sum\_{i=1}^{N(h, \\theta)} \[Z(x\_i + h) - Z(x\_i)]^2

$$



où :

\- \*\*N(h, θ)\*\* est le nombre de paires séparées de \*\*h\*\* dans la direction \*\*θ\*\*.



---



\## En pratique



\- On s’accorde une \*\*tolérance\*\* sur \*\*h\*\* et sur \*\*θ\*\* pour obtenir suffisamment de paires.

\- Pour chaque classe ainsi formée :

&nbsp; - On calcule la \*\*distance moyenne\*\* entre les extrémités des paires (abscisse).

&nbsp; - On évalue le \*\*variogramme expérimental\*\* (ordonnée).



On obtient ainsi une \*\*série de points expérimentaux\*\*, auxquels on cherche à ajuster un \*\*modèle analytique\*\*.  

Ce modèle permet de déduire la \*\*covariance\*\* entre deux points quelconques en fonction :

\- de leur \*\*espacement géographique\*\*,

\- et éventuellement de la \*\*direction\*\*.



> Une fois le modèle adopté, tous les calculs ultérieurs se font avec les \*\*valeurs du modèle\*\*, et non avec les valeurs expérimentales.



---



\## Exemple illustratif



La figure suivante illustre quelques exemples de surfaces et leur variogramme expérimental correspondant.  

Les simulations ont été réalisées avec \*\*GSLIB-SGSIM\*\*, en imposant les valeurs \*\*0, 2, 2 et 4\*\* aux 4 coins.



De haut en bas :

1\. Gaussien de portée 25  

2\. Sphérique de portée 25  

3\. Sphérique avec \*\*20 % d’effet de pépite\*\*, portée 25  

4\. Sphérique avec \*\*80 % d’effet de pépite\*\*, portée 25



> Comme on le voit, le variogramme expérimental décrit bien le \*\*degré d’irrégularité\*\* des surfaces.

\\gamma(h) = \\frac{1}{2N(h)} \\sum\_{i=1}^{N(h)} \[Z(x\_i + h) - Z(x\_i)]^2

$$



où :

\- \*\*N(h)\*\* est le nombre de paires de points espacées d'une distance \*\*h\*\*.



---



En pratique on s'accorde une tolérance sur h et sur θ afin d'avoir suffisamment de paires pour chaque h et chaque θ. Pour chacune des classes ainsi formées, on calcule la distance moyenne séparant les extrémités des paires (abscisse) et on évalue le variogramme expérimental pour chaque classe. On obtient donc une série de points expérimentaux auxquels on cherche à ajuster un modèle (i.e. expression analytique) permettant de déduire la covariance entre deux points quelconque en fonction de leur espacement géographique (et, éventuellement, de la direction qu'ils définissent). Une fois le modèle adopté, toute la suite des calculs se fait avec les valeurs obtenues du modèle et non avec les valeurs expérimentales.



La figure suivante illustre quelques exemples de surface et le variogramme expérimental correspondant. Les simulations ont été réalisées avec GSLIB-SGSIM, en imposant les valeurs 0, 2 , 2 et 4 aux 4 coins. De haut en bas, on a simulé un gaussien de portée 25, un sphérique de portée 25, un sphérique avec 20% d’effet de pépite et portée 25, un sphérique avec 80% d’effet de pépite et portée 25. Comme on le voit, le variogramme expérimental décrit bien le degré d'irrégularité des surfaces.


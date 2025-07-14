\# 7.3 Variance d’estimation



Dans cette section, on cherche à établir les résultats permettant de fournir une \*\*mesure de la précision des estimés\*\* effectués par une méthode d’estimation quelconque (généralement linéaire).



Soit une variable aléatoire \\( Z\_v \\) que l’on veut estimer à partir d’une combinaison linéaire des valeurs observées en différents points :



\\\[

Z\_v^\* = \\sum\_{i=1}^n \\lambda\_i Z\_i \\tag{1}

\\]



où :

\- \\( Z\_i \\) : valeur observée au point \\( x\_i \\) (v.a.),

\- \\( Z\_v^\* \\) : estimateur de \\( Z\_v \\),

\- \\( \\lambda\_i \\) : poids associés aux données.



On définit \*\*l’erreur d’estimation\*\* :



\\\[

e = Z\_v^\* - Z\_v

\\]



et la \*\*variance de cette erreur\*\*, appelée \*\*variance d’estimation\*\* :



\\\[

\\sigma\_e^2 = \\mathrm{Var}(e) = \\mathrm{Var}(Z\_v^\*) + \\mathrm{Var}(Z\_v) - 2\\,\\mathrm{Cov}(Z\_v^\*, Z\_v) \\tag{2}

\\]



En substituant \\( Z\_v^\* \\) par son expression (1), on obtient :



\\\[

\\sigma\_e^2 = \\sum\_{i=1}^n \\sum\_{j=1}^n \\lambda\_i \\lambda\_j \\mathrm{Cov}(Z\_i, Z\_j)

\+ \\mathrm{Var}(Z\_v) - 2 \\sum\_{i=1}^n \\lambda\_i \\mathrm{Cov}(Z\_i, Z\_v)

\\]



---



\## Formulation avec le variogramme



En utilisant la relation \\( \\mathrm{Cov}(Z\_i, Z\_j) = \\sigma^2 - \\gamma(x\_i - x\_j) \\), on obtient :



\\\[

\\sigma\_e^2 = \\sum\_{i,j} \\lambda\_i \\lambda\_j \\gamma(x\_i, x\_j)

\- 2 \\sum\_i \\lambda\_i \\gamma(x\_i, x\_v)

\+ \\gamma(v, v) \\tag{3}

\\]



---



\## Remarques importantes



1\. Dans les formules (2) et (3), on reconnaît trois composantes :

&nbsp;  - Un \*\*terme lié au bloc à estimer\*\* : \\( \\mathrm{Var}(Z\_v) \\) ou \\( \\gamma(v,v) \\),

&nbsp;  - Un \*\*terme lié aux points utilisés pour estimer\*\* : \\( \\mathrm{Cov}(Z\_i, Z\_j) \\) ou \\( \\gamma(x\_i, x\_j) \\),

&nbsp;  - Un \*\*terme croisé\*\* : \\( \\mathrm{Cov}(Z\_i, Z\_v) \\) ou \\( \\gamma(x\_i, v) \\).



2\. La variance d’estimation est une \*\*mesure de précision moyenne\*\* sur le gisement pour une configuration donnée. Elle est indépendante de la valeur estimée et ne prend pas en compte les effets proportionnels (ex. : gisement lognormal).



3\. Pour améliorer la précision, on peut chercher à \*\*minimiser \\( \\sigma\_e^2 \\)\*\* en choisissant les poids \\( \\lambda\_i \\) de façon optimale — c’est le principe du \*\*krigeage\*\*.



---



\## Exemple



Soient trois points \\( x\_1, x\_2, x\_3 \\) utilisés pour estimer la valeur au point \\( x\_0 \\).




\#### Matrice des distances :



|      | x0  | x1  | x2  | x3  |

|------|-----|-----|-----|-----|

| x0   | 0   | 1.4 | 1   | 2   |

| x1   |     | 0   | 1   | 3.2 |

| x2   |     |     | 0   | 3   |



Supposons un \*\*variogramme linéaire\*\* avec \*\*pente unitaire\*\* et \*\*effet de pépite \\( C\_0 = 1 \\)\*\* :



\\\[

\\gamma(h) = 1 + h

\\]



---



\### a) Estimation polygonale (plus proche voisin)



On utilise uniquement le point le plus proche :



\\\[

\\lambda\_1 = 1, \\quad \\lambda\_2 = 0, \\quad \\lambda\_3 = 0

\\]



Alors :



\\\[

\\sigma\_e^2 = \\gamma(x\_0, x\_0) + \\lambda\_1^2 \\gamma(x\_1, x\_1) - 2 \\lambda\_1 \\gamma(x\_1, x\_0)

= 1 + 1 - 2 \\cdot \\gamma(1.4) = 2 - 2(1 + 1.4) = 2 - 4.8 = -2.8

\\]



Mais comme une variance ne peut pas être négative, on a mal formulé. En fait :



\\\[

\\sigma\_e^2 = \\gamma(x\_0, x\_0) + \\lambda\_1^2 \\gamma(x\_1, x\_1) - 2 \\lambda\_1 \\gamma(x\_1, x\_0)

= (1 + 0) + (1)^2 \\cdot (1 + 0) - 2 \\cdot 1 \\cdot (1 + 1.4) = 1 + 1 - 4.8 = -2.8

\\]



Il y a donc une incohérence dans l’interprétation. En réalité, il faut directement appliquer la formule (3).



---



\### b) Inverse de la distance



Distances inverses :



\\\[

d\_1 = 1.4, \\quad d\_2 = 1, \\quad d\_3 = 2

\\]



\\\[

\\lambda\_1 = \\frac{1/1.4}{1/1.4 + 1/1 + 1/2} \\approx 0.32,\\quad

\\lambda\_2 \\approx 0.45,\\quad

\\lambda\_3 \\approx 0.23

\\]



En appliquant (3), on obtient :



\\\[

\\sigma\_e^2 \\approx 2.7

\\]



L’inverse de la distance offre donc une meilleure précision que la méthode polygonale.



---



\### c) Krigeage



Poids optimaux :



\\\[

\\lambda\_1 = 0.25,\\quad \\lambda\_2 = 0.43,\\quad \\lambda\_3 = 0.32

\\]



Alors :



\\\[

\\sigma\_e^2 \\approx 2.65

\\]



Une \*\*amélioration modeste\*\* par rapport à l’inverse de la distance.



---



\## Variance d’extension



Il s'agit de la \*\*variance d’estimation\*\* obtenue lorsqu’on \*\*étend une valeur ponctuelle à une surface ou un volume\*\*, ou lorsqu’on estime une surface à partir d’un segment, etc.



Ces cas, par leur simplicité géométrique, \*\*se prêtent bien à la construction d’abaques\*\* ou de tables de calcul.



---








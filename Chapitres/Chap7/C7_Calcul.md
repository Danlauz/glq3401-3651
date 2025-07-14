\# 7.5 Calcul des quantités \\\\( \\\\gamma(v,v) \\\\) ou \\\\( \\\\gamma(x,v)\_i \\\\)



Les termes \\\\( \\\\gamma(v,v) \\\\) ou \\\\( \\\\gamma(x,v)\_i \\\\) sont requis pour obtenir les variances de blocs, de dispersion et d'estimation. Ils peuvent être calculés de plusieurs façons :



---



\## i. Intégration analytique de \\\\( \\\\gamma(h) \\\\)



Applicable surtout en 1D.



\*\*Exemple (modèle sphérique) :\*\*



\\\\\[

\\\\gamma(v,v)/C = 

\\\\begin{cases}

0.5\\\\,v/a - 0.05\\\\,(v/a)^3 \& \\\\text{si } v < a \\\\\\\\

1 - 0.75\\\\,a/v + 0.2\\\\,(a/v)^2 \& \\\\text{si } v \\\\ge a

\\\\end{cases}

\\\\]



où \\\\( a \\\\) est la portée.



---



\## ii. Utilisation d’abaques (ex. sphérique, exponentiel)



---



\## iii. Approximation numérique (grille ou Monte Carlo)



On représente le bloc \\\\( v \\\\) par une grille fine et on calcule la valeur moyenne du variogramme \\\\( \\\\gamma(x\_i - x\_j) \\\\) sur toutes les paires \\\\( (x\_i, x\_j) \\\\) de la grille.



\*\*Méthode de Monte Carlo\*\* : placer \\\\( n \\\\) paires de points aléatoires dans le bloc \\\\( v \\\\), puis moyenner \\\\( \\\\gamma(h) \\\\) sur ces paires.



---



\## Exemples d'utilisation des abaques



\### Variance de blocs en 2D



Modèle sphérique avec \\\\( C\_0 = 5 \\\\), \\\\( C = 15 \\\\), \\\\( a = 100 \\\\) m.



\- \*\*Bloc 20 m × 20 m\*\* :

&nbsp; \\\\\[

&nbsp; F(0.2, 0.2) \\\\approx 0.16 \\\\quad \\\\Rightarrow \\\\quad \\\\sigma\_v^2 = 15(1 - 0.16) = 12.6

&nbsp; \\\\]



\- \*\*Bloc 50 m × 50 m\*\* :

&nbsp; \\\\\[

&nbsp; F(0.5, 0.5) \\\\approx 0.38 \\\\quad \\\\Rightarrow \\\\quad \\\\sigma\_v^2 = 15(1 - 0.38) = 9.3

&nbsp; \\\\]



\- \*\*Bloc 50 m × 100 m\*\* :

&nbsp; \\\\\[

&nbsp; F(0.5, 1) \\\\approx 0.54 \\\\quad \\\\Rightarrow \\\\quad \\\\sigma\_v^2 = 15(1 - 0.54) = 6.9

&nbsp; \\\\]



\### Anisotropie géométrique (\\\\( a\_x = 100 \\\\), \\\\( a\_y = 50 \\\\))



\- \*\*Bloc 50 m (x) × 100 m (y)\*\* :

&nbsp; \\\\\[

&nbsp; F(0.5, 2) \\\\approx 0.73 \\\\quad \\\\Rightarrow \\\\quad \\\\sigma\_v^2 = 15(1 - 0.73) = 4.05

&nbsp; \\\\]



\- \*\*Bloc 100 m (x) × 50 m (y)\*\* :

&nbsp; \\\\\[

&nbsp; F(1, 1) \\\\approx 0.68 \\\\quad \\\\Rightarrow \\\\quad \\\\sigma\_v^2 = 15(1 - 0.68) = 4.8

&nbsp; \\\\]



\*\*Remarque\*\* : la variance dépend de l’allongement du bloc selon l’anisotropie.



---



\### Variance de blocs en 3D



Ex. : bloc 50 × 50 × 25 m avec \\\\( C\_0 = 5 \\\\), \\\\( C = 15 \\\\), \\\\( a = 100 \\\\)



\\\\\[

F(0.25, 0.5) \\\\approx 0.6 \\\\quad \\\\Rightarrow \\\\quad \\\\sigma\_v^2 = 15(1 - 0.6) = 6.0

\\\\]



---



\## Variance de dispersion



On utilise les abaques pour calculer chaque variance de bloc puis on fait la différence :



\\\\\[

D^2(v|V) = \\\\gamma(v,v) - \\\\gamma(V,V)

\\\\]



---



\## Variance d’estimation (cas d’extension)



Si on estime une cellule 10 × 10 m par son point central, avec abaque \\\\#7 :



\\\\\[

\\\\frac{l}{a} = \\\\frac{10}{100} = 0.1,\\\\quad F \\\\approx 0.57

\\\\]



\\\\\[

\\\\sigma\_e^2 = 15 \\\\times 0.038 = 0.57

\\\\]



En ajoutant l'effet de pépite \\\\( C\_0 = 5 \\\\) :



\\\\\[

\\\\sigma\_e^2 = 0.57 + 5 = 5.57

\\\\]



---



\## Effet du nombre de points utilisés



Si on utilise 4 coins (\\\\( n = 4, \\\\lambda\_i = 1/4 \\\\)), pour le bloc 10 × 10 m :



\\\\\[

\\\\sigma\_e^2 \\\\approx 1/4^2 \\\\times 15 \\\\times 0.024 + 5 = 1.61

\\\\]



Pour un bloc 100 × 100 m :



\\\\\[

\\\\sigma\_e^2 \\\\approx 1/4^2 \\\\times 15 \\\\times 0.27 + 5 = 5.3

\\\\]



\*\*Conclusion\*\* : utiliser plusieurs points diminue l’effet de pépite car la part de \\\\( C\_0 \\\\) devient \\\\( C\_0/n \\\\).



---



\## Extension d’un segment à une surface



Pour une cellule 10 × 10 m estimée par un segment central :



\- Sans pépite :

&nbsp; \\\\\[

&nbsp; \\\\sigma\_e^2 = 15 \\\\times 0.009 = 0.14

&nbsp; \\\\]



\- Si support = segment \\\\( \\\\Rightarrow C\_0 \\\\) est ajouté en entier.



\- Si support est petit (ex. carotte de 1 m), \\\\( n \\\\to \\\\infty \\\\), donc \\\\( C\_0/n \\\\to 0 \\\\)



---


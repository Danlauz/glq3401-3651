\# 3.2 Variance de dispersion



La variance de bloc permet de calculer la variance théorique de la teneur de bloc dans un domaine d’extension infinie. Bien sûr, les gisements réels ne sont jamais infinis, et il est souhaitable de pouvoir prévoir l’amplitude des variations des teneurs de bloc pour un domaine fini correspondant au gisement ou à une partie du gisement.



Considérons un grand bloc \\( V\_j \\) découpé en petits blocs \\( v\_i \\). On a bien sûr :



\\\[

Z(V\_j) = \\frac{1}{n} \\sum\_{i=1}^n Z(v\_i)

\\]



On peut vouloir déterminer l'importance de la variation des blocs \\( v\_i \\) à l'intérieur de \\( V\_j \\), en moyenne pour l'ensemble des blocs \\( V \\). C'est ce que l'on appelle \*\*la variance de dispersion de \\( v \\) dans \\( V \\)\*\*, notée \\( D^2(v|V) \\).



Soit la variance échantillonnale pour un bloc \\( V\_j \\) :



\\\[

s^2\_{v|V\_j} = \\frac{1}{n} \\sum\_{i=1}^n \\left( Z(v\_i) - Z(V\_j) \\right)^2

\\]



On définit alors la \*\*variance de dispersion\*\* comme l'espérance de cette variance expérimentale en considérant tous les blocs possibles \\( V\_j \\) :



\\\[

D^2(v|V) = E\\left\[ s^2\_{v|V\_j} \\right] = E\\left\[ \\frac{1}{n} \\sum\_{i=1}^n \\left( Z(v\_i) - Z(V\_j) \\right)^2 \\right]

\\]



Développement :



\\\[

D^2(v|V) = \\frac{1}{n} \\sum\_{i=1}^n \\left\[ \\mathrm{Var}(Z(v\_i)) + \\mathrm{Var}(Z(V\_j)) - 2\\,\\mathrm{Cov}(Z(v\_i), Z(V\_j)) \\right]

\\]



Soit, en résumé :



\\\[

D^2(v|V) = \\sigma\_v^2 + \\sigma\_V^2 - 2\\,\\mathrm{Cov}(Z(v), Z(V))

\\]



Ce qui donne, en utilisant les notations précédentes :



\\\[

D^2(v|V) = \\sigma\_v^2 - \\sigma\_V^2

\\]



i.e., \*\*la variance de dispersion n’est autre qu’une différence de variabilité entre les teneurs mesurées sur deux volumes différents.\*\*



---



\### Expressions équivalentes



Utilisant les résultats précédents concernant les variances de blocs, on peut obtenir les formulations suivantes :



\\\[

D^2(v|V) = C(v,v) - C(V,V)

\\]



ou encore, en termes de variogramme :



\\\[

D^2(v|V) = \\gamma(V,V) - \\gamma(v,v)

\\]



---



\## Cas limites



Pour les modèles croissants de variogramme, on a :



\- Lorsque \\( v \\to 0 \\), alors \\( D^2(v|V) \\to \\gamma(V,V) \\)

\- Lorsque \\( v \\to V \\), alors \\( D^2(v|V) \\to 0 \\)

\- Lorsque \\( V \\to \\infty \\), alors \\( D^2(v|V) \\to \\sigma\_v^2 \\)



---



Dans une mine, « \\( v \\) » pourrait correspondre à la production quotidienne et « \\( V \\) » à la production hebdomadaire ou mensuelle. Le rendement du concentrateur pourrait être relié à l’importance des fluctuations journalières sur une période mensuelle, c’est-à-dire à \\( D^2(v|V) \\).



---



\## Additivité des dispersions



Les relations précédentes se généralisent aisément et permettent de définir une \*\*règle d’additivité\*\* très générale pour plusieurs blocs de tailles différentes :



\\\[

D^2(v\_1|v\_n) = D^2(v\_1|v\_2) + D^2(v\_2|v\_3) + \\dots + D^2(v\_{n-1}|v\_n)

\\]



avec les supports ordonnés par taille croissante :  

\\( v\_1 < v\_2 < \\dots < v\_{n-1} < v\_n \\)



---



\## Notes importantes concernant l’effet de pépite



1\. Dans les relations précédentes, \\( \\gamma(h) \\) représente le variogramme ponctuel. Dans la pratique, ce variogramme n’est pas accessible : seul le variogramme défini sur un certain support « s » existe (par exemple, les carottes de forage).



&nbsp;  Les relations restent valides \*\*tant que le support des données est petit devant « \\( v \\) »\*\*. Dans ce cas, \*\*l’effet de pépite n’intervient pas\*\* dans le calcul de la variance de bloc ni dans la variance de dispersion.



2\. Lorsque \\( v \\) n’est \*\*pas beaucoup plus grand que le support des données\*\*, un terme de variance lié à l’effet de pépite doit être inclus dans la variance de bloc. Ce terme est généralement :



\\\[

\\sigma^2\_{\\text{effet pépite}} = \\frac{s}{v} C\_0

\\]



où :

\- \\( C\_0 \\) est le saut du variogramme à l’origine (effet de pépite),

\- \\( s \\) est le volume du support des données,

\- \\( v \\) est le volume du bloc.



> Cette interprétation est valide uniquement si l’effet de pépite représente une \*\*microstructure réelle\*\* (ex. : pépites d’or), mais \*\*pas\*\* s’il s’agit d’erreurs de localisation ou d’imprécisions analytiques.



---



\## Remarque finale



Le calcul des variances de bloc et de la variance d’estimation \*\*ne nécessite pas\*\* de connaître explicitement les données. \*\*Seul le variogramme\*\* est requis.  

Ces notions \*\*ne rendent donc pas compte\*\* de l’information accrue localement par l’acquisition de nouvelles données.






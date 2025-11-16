# 10.1 Krigeage d'indicatrices

L'idée de base du krigeage d'indicatrices (KI) repose sur le fait que le krigeage est un bon estimateur de l'espérance conditionnelle d'une variable aléatoire (v.a.). On rappelle que le krigeage ordinaire est presque sans biais conditionnel dans le cas normal et que le krigeage simple est sans biais conditionnel.

Si l'on considère un seuil donné, disons $c$, on peut coder, par rapport à ce seuil, la v.a. $Z(x)$ en une variable indicatrice $I(x,c)$ prenant la valeur 0 ou 1 :  
$$
I(x,c) = 
\begin{cases}
1 & \text{si } Z(x) \leq c, \\
0 & \text{si } Z(x) > c.
\end{cases}
$$

Considérons l'espérance de cette indicatrice, $I(x,c)$. Par définition, on a :  
$$
\mathbb{E}[I(x,c)] = P(Z(x) \leq c) = F_{Z(x)}(c),
$$
où $F_{Z(x)}(c)$ est la fonction de répartition de $Z$ à la localisation $x$ pour le seuil $c$.

Le problème consiste donc à estimer $I(x,c)$ à partir de l'information disponible, c'est-à-dire les observations $Z(x_i)$ à $n$ points.

La méthode s'effectue ainsi :  
1. **Codage des observations.** Pour un seuil donné $c$, on transforme les valeurs observées $Z(x_i)$ en variables indicatrices $I(x_i, c)$, qui prennent la valeur 0 ou 1 selon que $Z(x_i)$ est inférieur ou supérieur au seuil.
2. **Krigage des indicatrices.** On effectue ensuite, au point $x_0$, le krigeage de $I(x_0, c)$ à partir des indicatrices observées $I(x_i, c)$. Comme le krigeage fournit une approximation de l’espérance conditionnelle, la valeur obtenue peut s’interpréter comme une estimation de $P(Z(x_0) \leq c \mid Z(x_1), \ldots, Z(x_n)) \approx \hat{I}(x_0, c)$. Cette étape nécessite de calculer et de modéliser au préalable le variogramme des indicatrices $I(x_i, c)$, qui dépend du seuil considéré.
3. **Répétition pour plusieurs seuils.** Le procédé est répété pour une série de seuils $c_2, c_3, \ldots$. Pour chaque seuil, on recode les observations, on calcule et on modélise le variogramme spécifique, puis on réalise un nouveau krigeage, ce qui permet de reconstruire progressivement la distribution locale de $Z(x_0)$.

En combinant les résultats des krigeages réalisés pour les différents seuils, on reconstruit une version discrétisée de la fonction de répartition conditionnelle $F^*_Z(x_0, z \mid Z_1, \ldots, Z_n)$ que nous noterons désormais par $F_{KI}(x_0, z)$. Cette fonction représente une approximation complète de la distribution locale conditionnelle de $Z(x_0)$ et permet d’en déduire directement l’estimée conditionnelle (par intégration), la variance conditionnelle, ainsi qu’un large éventail de quantités dérivées — probabilités de dépassement, quantiles, médiane, fonctions de coût, etc. — c’est-à-dire toutes les statistiques qui s’obtiennent à partir d’une fonction de répartition.

---

### Notes importantes :

- **Approximation de l’espérance conditionnelle.** Le krigeage d’indicatrices constitue une approximation : ne coïncide pas exactement avec l'espérance conditionnelle, sauf dans le cas normal du krigeage simple. C'est-à-dire que $E[F_{KI}(x,c)] \neq P(Z(x) \leq c | Z_1 ,..., Z_n)$.
 
- **Perte d’information liée au codage binaire.** En conditionnant uniquement sur la variable indicatrice, une partie de l’information contenue dans les valeurs originales est perdue. Pour la récupérer intégralement, il faudrait réaliser un cokrigeage simultané de toutes les indicatrices définies sur un continuum de seuils, une approche rarement envisagée en raison de sa complexité. Des alternatives plus simples existent, notamment l’utilisation de la teneur comme variable auxiliaire dans un cokrigeage (“probability kriging”) ou l’emploi d’une analyse en composantes principales (ACP) appliquée aux indicatrices.

- **Estimations non toujours admissibles.** Les valeurs krigées ne correspondent pas toujours à de véritables probabilités : certaines peuvent être négatives, dépasser 1 ou ne pas être monotones en fonction du seuil. Ces problèmes, fréquents, nécessitent des corrections empiriques (par exemple en imposant la monotonicité). Ils proviennent principalement de poids de krigeage négatifs ou de modèles de variogrammes incompatibles entre seuils.

- **Estimation de l’espérance par intégration.** Une fois la fonction de répartition locale reconstruite, il est possible de calculer une estimation analogue au krigeage ordinaire en intégrant la distribution conditionnelle estimée $F_{KI}(x, c)$.

- **Variogrammes des indicatrices plus simples.** Les variogrammes des indicatrices sont souvent plus faciles à modéliser que ceux de $Z(x)$, car les valeurs sont binaires (0 ou 1) et ne présentent pas de valeurs extrêmes. Pour un seuil correspondant à un quantile $p$, la variance de l’indicatrice vaut $p(1-p)$. Sur un domaine grand par rapport à la portée, le palier du variogramme s’approche de cette valeur.

- **Contraintes sur le modèle de variogramme.** Le variogramme d’une indicatrice n’est pas deux fois dérivable à l’origine : certains modèles, comme le modèle gaussien, sont donc incompatibles car la variable indicatrice est discontinue.

- **Choix judicieux des seuils.** Il faut éviter les seuils trop proches des extrêmes de la distribution (inférieurs au 5 % ou supérieurs au 95 %), car les variogrammes deviennent instables. On se limite généralement à des quantiles compris entre 10 % et 90 %.

- **Nombre de seuils recommandés.** En pratique, 5 à 10 seuils suffisent pour reconstruire fidèlement la fonction de répartition. Le krigeage d’indicatrices est conceptuellement simple, mais peut devenir lourd en pratique. On utilise fréquemment les déciles de la distribution globale comme seuils.

- **Modélisation flexible des structures spatiales.** Un des avantages majeurs du krigeage d’indicatrices est sa capacité à intégrer des structures spatiales qui varient selon les seuils (p. ex. anisotropie plus marquée pour les valeurs élevées). À l’opposé, les méthodes fondées sur une transformation gaussienne imposent une structure unique.

- **Changement de support.** Le problème du changement de support se pose avec autant d'acuité, voire plus, que pour les méthodes basées sur les transformations gaussiennes. La pratique courante consiste à corriger les fonctions par la correction affine.



---

Malgré ses défauts, le krigeage d'indicatrices s'est imposé comme une méthode d'estimation répandue. La simplicité mathématique et la facilité de sa mise en oeuvre (un programme de krigeage ordinaire suffit) justifie sa popularité auprès des utilisateurs. Sa robustesse face aux valeurs extrêmes, pour certaines applications, ainsi que sa capacité à intégrer des données incertaines (“soft kriging”) ont également contribué à sa popularité. Le KI est particulièrement pertinent dans les situations où le changement de support n’intervient pas ou demeure limité.

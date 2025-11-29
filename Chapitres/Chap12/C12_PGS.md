# 12.2 Simulations tronquées

Les simulations tronquées permettent de générer des variables catégorielles (faciès, lithologies, types de roches) à partir de champs gaussiens continus. Le principe est simple : on simule d’abord un ou plusieurs champs gaussiens en utilisant des méthodes géostatistiques classiques (LU, SGS, FFT-MA, bandes tournantes), puis on transforme ces champs continus en catégories en appliquant des seuils ou des zones de codage.

Cette approche permet de contrôler les proportions de chaque catégorie, de reproduire la continuité spatiale via le variogramme du champ gaussien, et, selon le modèle, d’imposer certaines relations spatiales entre les faciès (transitions permises ou interdites, proportions variables, etc.).

On distingue deux variantes principales :

1. la simulation gaussienne tronquée, qui utilise un seul champ gaussien découpé en intervalles ordonnés ;
2. la simulation plurigaussienne, plus flexible, qui combine plusieurs champs gaussiens pour définir des organisations spatiales plus complexes.


## Simulation Gaussienne Tronquée

Le modèle gaussien tronqué simule une variable gaussienne continue, puis applique des seuils pour obtenir des faciès catégoriels respectant les proportions observées. L'algorithme non conditionnelle est assez simple :

1. **Ordonnancement des faciès**  
   Les faciès doivent être ordonnés (par exemple F1 < F2 < F3). Cet ordonnancement détermine les transitions possibles : seuls les faciès successifs peuvent être contigus dans l’espace, ce qui interdit par exemple une transition directe entre F1 et F3.

2. **Détermination des seuils gaussiens**  
   À partir des proportions globales des faciès, on calcule les seuils gaussiens correspondants en utilisant les quantiles d’une loi normale standard $N(0,1)$. Ces seuils définissent les intervalles dans lesquels la valeur simulée du champ gaussien sera tronquée pour produire le faciès associé. La champ gaussian, que l'on considère comme latent, est de moyenne nulle et variance unitaire.

3. **Appliquer les seuils de codage.**
   Une simulation gaussienne non conditionnelle est générée à l’aide d’une méthode classique (LU, SGS, FFT-MA, bandes tournantes). Une fois le champ continu obtenu, chaque valeur est comparée aux seuils déterminés à l’étape 2 : si elle tombe dans l’intervalle correspondant au faciès $k$, la cellule est codée comme appartenant à ce faciès. Le champ gaussien est ainsi transformé en un champ catégoriel, garantissant les proportions souhaitées et les relations spatiales découlant du modèle.

La [Fig. %s](#C12_TGS1) présente un exemple d’application avec trois faciès, notés $F_1$, $F_2$ et $F_3$, dont les probabilités respectives sont $p_1 = \frac{1}{3}$, $p_2 = \frac{1}{2}$ et $p_3 = \frac{1}{6}$. Les seuils de codage sont déterminés à partir de la fonction de répartition $F$ de la loi normale standard $N(0,1)$. Le premier seuil, $s_1$, correspondant à la transition entre $F_1$ et $F_2$, est donné par $s_1 = F^{-1}(p_1) = F^{-1}\left(\frac{1}{3}\right) = -0.43073$. Le second seuil, $s_2$, correspondant à la transition entre $F_2$ et $F_3$, est obtenu en cumulant les proportions des deux premiers faciès : $s_2 = F^{-1}(p_1 + p_2) = F^{-1}\left(\frac{5}{6}\right) = 0.96742$. Toute valeur gaussienne inférieure à $s_1$ est alors codée $F_1$, toute valeur comprise entre $s_1$ et $s_2$ est codée $F_2$, et toute valeur supérieure à $s_2$ est codée $F_3$. En utilisant un variogramme gaussien de portée 50 avec ces proportions, on obtient le champ de faciès illustré dans la [Fig. %s](#C12_TGS2), où l’on observe que la transition entre $F_1$ (bleu) et $F_3$ (rouge) doit obligatoirement passer par $F_2$ (vert); ainsi, $F_1$ et $F_3$ ne peuvent jamais être contigus. 

Ainsi, le modèle implique que seuls les faciès successifs peuvent être contigus spatialement. Ainsi la transition $F_1$ − $F_3$ ne peut être observée. Le choix de  l’ordre des faciès doit respecter les relations observées.

```{figure} images/C12_TGS1.png
:label: C12_TGS1
:align: center
Exemple de seuil de codage pour une simulation gaussienne tronquée avec $p_1 = \frac{1}{3}$, $p_2 = \frac{1}{2}$ et $p_3 = \frac{1}{6}$.
```

```{figure} images/C12_TGS2.png
:label: C12_TGS2
:align: center
Exemple de simulation gaussienne tronquée réalisée à partir d’un champ latent gaussien suivant un variogramme gaussien de portée effective de 50 pixels, sur une grille de 250 par 250 pixels.
```
### Comment décider du variogramme de la variable latente gaussienne? 

Une difficulté importante de la méthode TGS réside dans l’identification de la structure spatiale du champ latent à modéliser. En effet, les données disponibles sont uniquement des faciès, c’est-à-dire des variables catégorielles. Nous ne disposons donc d’aucune variable continue permettant d’estimer directement un variogramme expérimental du champ gaussien latent. Les seules informations accessibles sont les variogrammes des indicatrices, qui ne se traduisent pas automatiquement en un variogramme latent unique. Il faut réaliser quelque manipulations mathématiques pour relier les variogrammes d'indicatrices aux variogramme de la structure latente continues.

Pour contourner ce problème, la méthode TGS s’appuie sur une calibration indirecte, basée sur les probabilités conjointes qui peuvent être estimées à partir des données de faciès. Ces probabilités correspondent à des intégrales de la loi binormale définies par la covariance latente inconnue. La stratégie consiste donc à ajuster la covariance (ou le variogramme) du champ gaussien latent de manière à ce que les probabilités binormales reproduisent au mieux les probabilités expérimentales.
 
Considérons une variable gaussienne latente $Z(x)$ et un champ catégoriel $W(x)$ obtenu par troncature de $Z(x)$. Notons  
$$
p_{ij}(h) = P\big( W(x)=i,\; W(x+h)=j \big) = E\!\left[ I_i(x)\, I_j(x+h) \right]
$$
la probabilité d’observer simultanément le faciès $i$ en $x$ et le faciès $j$ en $x+h$. Cette quantité peut être estimée empiriquement à partir des données. Il suffit de compter, pour chaque distance $h$, le nombre de paires de points $(x, x+h)$ où l’on observe simultanément $W(x)=i$ et $W(x+h)=j$, puis de normaliser par le nombre total de paires disponibles à cette distance. Ainsi, $p_{ij}(h)$ est simplement une fréquence relative observée.

La probabilité expérimentale peut s’estimer par :

$$
\hat p_{ij}(h) = \frac{1}{N(h)} \sum_{(x,\,x+h)} \mathbb{1}\{ W(x)=i \}\,\mathbb{1}\{ W(x+h)=j \},
$$

où $N(h)$ est le nombre total de paires de points séparées de la distance $h$, et $\mathbb{1}\{\cdot\}$ est la fonction indicatrice.

De plus, comme chaque faciès $i$ correspond à un intervalle de troncature $[c_{i-1}, c_i]$ du champ latent, on peut écrire :
$$
W(x)=i \quad \Longleftrightarrow \quad c_{i-1} < Z(x) \le c_i.
$$

Ainsi, la probabilité conjointe $p_{ij}(h)$ peut aussi s'écrire comme :
$$
p_{ij}(h)
= P\left( c_{i-1} < Z(x) \le c_i,\; c_{j-1} < Z(x+h) \le c_j \right).
$$

En revanche, la probabilité
$$
P\left( c_{i-1} < Z(x) \le c_i,\; c_{j-1} < Z(x+h) \le c_j \right)
$$
peut être calculer théorique par l'intégrale de la densité binormale définie par la covariance du champ latent $C(h)$. Ainsi, pour chaque distance $h$, les probabilités expérimentales $p_{ij}(h)$ imposent une contrainte sur la covariance gaussienne $C(h)$. 

L’objectif est alors d’identifier la fonction de covariance $C(h)$ qui minimise l’écart entre les probabilités théoriques $p_{ij}(h)$ issues du modèle binormal et leurs estimations empiriques $\hat p_{ij}(h)$ obtenues à partir des données catégorielles.

La [Fig. %s](#C12_TGS3)  présente le calcul théorique issu du modèle binormal. La surface colorée représente la densité de la loi normale bidimensionnelle associée au couple gaussien corrélé $(Z(x), Z(x+h))$. Les lignes rouges indiquent les seuils de troncature $(c_{i-1}, c_i)$ et $(c_{j-1}, c_j)$ définissant respectivement les faciès $i$ et $j$. Le calcul de la probabilité conjointe $p_{ij}(h)$ correspond alors à l’intégrale de cette densité binormale sur le rectangle délimité par ces seuils, c’est-à-dire à la quantité
$$
p_{ij}(h)
= \iint_{\substack{c_{i-1} < u \le c_i \\[2pt] c_{j-1} < v \le c_j}}
f_{Z(x),Z(x+h)}(u,v)\,\mathrm{d}u\,\mathrm{d}v,
$$
où $f_{Z(x),Z(x+h)}(u,v)$ est la densité normale bidimensionnelle de moyenne nulle, de variance unitaire et de covariance $C(h)$.

La [Fig. %s](#C12_TGS4) présente les probabilités $p_{ij}(h)=E\!\left[ I_i\, I_j \right]$ associées au modèle TGS considéré (rappel : $p_1 = \tfrac{1}{3}$, $p_2 = \tfrac{1}{2}$ et $p_3 = \tfrac{1}{6}$). On constate que les probabilités situées sur la diagonale sont décroissantes, ce qui s’explique par le fait que plus la distance $h$ augmente, plus la probabilité d’obtenir une paire de points appartenant à des faciès similaires devient rare. L’inverse se produit pour les transitions hors diagonale : il devient plus probable d’observer une transition entre deux faciès distincts lorsque la distance augmente. Il est également important de noter que pour $h = 0$, on observe bien $p_{ij}(h)=p_i$ pour $i=1,\ldots,3$, tandis que les probabilités entre faciès différents sont nulles. Enfin, lorsque $h \to \infty$, les probabilités convergent vers la limite $p_{ij}(h)=p_i\,p_j$.

```{figure} images/C12_TGS3.png
:label: C12_TGS3
:align: center
Exemple de calcul théorique issu du modèle binormal.
```

```{figure} images/C12_TGS4.png
:label: C12_TGS4
:align: center
Probabilité des $p_{ij}(h)$.
```


### Comment tenir compte des faciès observés aux points échantillons  (quelles valeurs gaussiennes simuler aux points échantillons)?

Pour tenir compte des faciès observés aux points échantillons dans la méthode TGS, on utilise un échantillonnage de Gibbs. L’échantillonnage de Gibbs est une méthode de Monte-Carlo par chaînes de Markov (MCMC) qui permet d’échantillonner une distribution complexe en construisant une chaîne de Markov dont la loi stationnaire est précisément la distribution cible. Étant donnée une distribution de probabilité $\pi$ sur un espace $\Omega$, l’algorithme génère une suite d’échantillons dont la distribution limite est $\pi$, ce qui permet de tirer aléatoirement un élément de $\Omega$ selon la loi souhaitée.

Dans le contexte de la TGS, l'échantillonnage de Gibbs est nécessaire car les valeurs latentes $Z(x)$ ne sont pas directement observables : seules les catégories $W(x)$, issues de la troncature du champ latent, sont connues. Le principe repose sur le fait que chaque faciès $i$ correspond à un intervalle de troncature $[c_{i-1}, c_i]$. Ainsi, si le point $x_\alpha$ appartient au faciès $i$, alors la valeur latente associée doit obligatoirement vérifier :
$$
c_{i-1} < Z(x_\alpha) \le c_i.
$$
L’objectif du Gibbs est donc d’échantillonner, pour chaque point où un faciès est observé, une valeur latente $Z(x_\alpha)$ compatible à la fois avec la fonction de covariance $C(h)$ et avec les contraintes de troncature imposées par les faciès observés.

L’algorithme d’échantillonnage de Gibbs pour le conditionnement du champ latent repose sur une application successive du krigeage simple, lequel, rappelons-le, permet d’obtenir la distribution statistique conditionnelle d’une variable gaussienne en un point donné. À chaque itération, on met à jour une valeur latente en utilisant toutes les autres valeurs déjà fixées. Les itérations du Gibbs s’effectuent alors comme suit :

**Initialisation.**  
Pour chaque point échantillonné $x_i$, choisir aléatoirement une valeur gaussienne $Z(x_i)$ dans l’intervalle correspondant au faciès observé, c’est-à-dire :
$$
W(x_i)=k \quad \Longrightarrow \quad Z(x_i) \in (c_{k-1}, c_k].
$$
Cette initialisation respecte donc le codage.

**1. Sélection d’un point.**  
Choisir un point $x_i$ aléatoirement parmi les $N$ points à conditionner. Retirer temporairement la valeur courante $Z(x_i)$ du système.

**2. Estimation de la loi conditionnelle.**  
Estimer la distribution conditionnelle de $Z(x_i)$, compte tenu de toutes les autres valeurs latentes restantes :
$$
Z(x_i)\,|\,Z(\text{reste}) \sim \mathcal{N}(\hat Z(x_i),\sigma_i^2),
$$
où $(\hat Z(x_i),\sigma_i^2)$ proviennent du krigeage simple.

**3. Échantillonnage tronqué.**  
Étant donné que $W(x_i)=k$, tirer une nouvelle valeur de $Z(x_i)$ à partir de la loi normale tronquée à l’intervalle imposé par le patron de codage :
$$
Z(x_i) \sim 
\mathcal{N}(m_i,\sigma_i^2)\;\text{tronquée à}\;(c_{k-1},c_k].
$$

**4. Mise à jour.**  
Remplacer l’ancienne valeur de $Z(x_i)$ par la nouvelle valeur tirée.

**5. Critère d’arrêt.**  
Vérifier un critère de convergence (nombre d’itérations, stabilité des moments, autocorrélation).  
Si le critère est satisfait : arrêter.  
Sinon : retourner à l’étape 1.

À la fin de multiple itération, nous nous retrouvons avec des valeurs gaussiennes corrélé selon $C(h)$ et respectant les seuils. Ainsi, l'échantillonnage de Gibbs permet de générer un champ latent $Z(x)$ qui respecte simultanément la structure spatiale gaussienne imposée par le variogramme et les informations catégorielles observées via les intervalles du patron de codage.

---

## Simulations Plurigaussiennes

Le modèle plurigaussien étend le modèle gaussien tronqué en utilisant plusieurs variables gaussiennes corrélées pour modéliser des faciès avec des relations spatiales plus complexes. Par simpliciter, nous verrons que le cas avec deux champs latents. On peut résumer l'algorithme par :

1. **Simulation de deux champs gaussiens avec une fonction de covariance  
   $C(h)=\begin{bmatrix} C_{11}(h) & C_{12}(h) \\ C_{21}(h) & C_{22}(h) \end{bmatrix}$**  
   Simuler deux variables gaussiennes $Z_1$ et $Z_2$ respectant la matrice de covariance $C(h)$.  
   Chaque champ possède son propre modèle de variogramme direct, et les deux champs peuvent être corrélés entre eux via les covariances croisées $C_{12}(h)$ et $C_{21}(h)$.

2. **Définition du plan de codage des faciès**  
   Associer chaque faciès à une zone (rectangle ou autre forme) du plan $(Z_1, Z_2)$.  
   Ce plan encode les relations spatiales souhaitées (exclusions, transitions obligatoires, voisinages imposés).  
   Les proportions des faciès sont déterminées par l’intégrale de la densité gaussienne bivariée sur les zones définies.

3. **Inférence des paramètres**  
   Calculer les covariances expérimentales des indicatrices ainsi que leurs covariances croisées.  
   Ajuster ensuite les modèles de covariance des deux champs latents et leur corrélation afin de reproduire au mieux les structures spatiales observées dans les données.

4. **Conditionnement aux données observées : échantillonneur de Gibbs**  
   Pour chaque point d’observation $x_i$, on applique un échantillonnage de Gibbs, où la loi conditionnelle de $(Z_1(x_i), Z_2(x_i))$ est obtenue par cokrigeage simple conditionnellement aux valeurs latentes déjà fixées :  
   - calculer la distribution normale conjointe conditionnelle $(Z_1, Z_2)\,|\,\text{reste}$ par cokrigeage simple ;  
   - tirer une paire $(z_1, z_2)$ dans cette loi conditionnelle ;  
   - vérifier que cette paire appartient à la zone du plan correspondant au faciès observé ;  
   - sinon, répéter le tirage jusqu’à obtenir une paire compatible ;  
   - mettre à jour la valeur latente et passer au point suivant ;  
   Ce balayage est répété jusqu’à stabilisation (convergence du Gibbs).

5. **Simulation conditionnelle finale**  
   Réaliser une simulation gaussienne conditionnelle complète pour les champs $Z_1$ et $Z_2$ en utilisant les valeurs obtenues lors du conditionnement.  
   Convertir ensuite le résultat en faciès à l’aide du plan de codage.

La [Fig. %s](#C12_TGS5) présente un exemple de patron de codage complexe. Par exemple, si l’on observe les valeurs latentes $Z_1 = -1$ et $Z_2 = 1$, le couple $(-1, 1)$ tombe dans le rectangle associé au faciès $F_1$, et celui-ci est donc attribué. La [Fig. %s](#C12_TGS6) illustre l’application de ce patron de codage à deux champs gaussiens indépendants. Le champ latent $Z_1(x)$ suit un variogramme sphérique isotrope de portée 150 pixels, tandis que le champ latent $Z_2(x)$ suit un variogramme sphérique isotrope de portée 260 pixels. Le domaine simulé couvre une grille de 500 × 500 pixels.

On constate que les relations spatiales entre les faciès générés sont très complexes, mais certaines structures sont clairement imposées par le patron de codage : le faciès $F_4$ est entièrement contenu dans $F_3$, tandis que les faciès $F_1$, $F_2$ et $F_3$ baignent dans $F_0$ et ne peuvent donc jamais entrer en contact direct les uns avec les autres.

La [Fig. %s](#C12_TGS7) présente quatre images : une image réelle aux rayons X montrant les pores d’un grès, ainsi que trois réalisations PGS générées pour reproduire cette structure. Selon vous, laquelle correspond à l’image réelle ? Il s’agit de celle située en haut à gauche. Les simulations sont suffisamment réalistes pour rendre la distinction non triviale voir impossible.

```{figure} images/C12_TGS5.png
:label: C12_TGS5
:align: center
Exemple de plan de codage utilisé pour une simulation plurigaussienne à deux champs latents.
```

```{figure} images/C12_TGS6.png
:label: C12_TGS6
:align: center
Exemple de simulation plurigaussienne réalisée à partir de deux champs latents gaussiens non corrélés, suivant respectivement des variogrammes sphérique isotrope de portées de 150 pixels et 260 pixels, sur une grille de 500 par 500 pixels.
```

```{figure} images/C12_TGS7.png
:label: C12_TGS7
:align: center
Une image aux rayons X montrant les pores d’un grès, accompagnée de trois réalisations plurigaussiennes (PGS). Selon vous, laquelle correspond à l’image réelle ?
```
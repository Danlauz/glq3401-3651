# 11.2 Méthodes de simulation

Il existe une grande variété de méthodes de simulation géostatistique. Pour les regrouper, on peut proposer la subdivision suivante :

- **Méthodes gaussiennes** :
  - Méthodes matricielles basées sur une décomposition de la matrice de covariance
  - Méthode gaussienne séquentielle
  - Moyennes mobiles
  - Bandes tournantes
  - Méthodes autorégressives
  - Méthodes fréquentielles
  - Etc.

- **Méthodes non-gaussiennes** :
  - Recuit simulé
  - Simulation séquentielle d’indicatrices
  - Méthodes utilisant des champs de probabilité (« p-fields »)
  - Méthode multipoints (« Multiple-point statistics (MPS) »)
  - Etc.

Dans la suite, nous examinerons quelques-unes de ces méthodes.

## Méthode de simulation matricielle (LU, décomposition de Cholesky)

Cette méthode est simple à programmer et efficace pour simuler de petits champs. Elle permet de réaliser facilement des simulations conditionnelles comme non-conditionnelles.

---

### Simulations non-conditionnelles

Soit $n$ points à simuler, pour lesquels on souhaite générer une réalisation d’un champ aléatoire dont la covariance est $C(h)$. On commence par construire la matrice de covariance $K$ de taille $n \times n$ en évaluant la covariance entre chaque point de simulation. Cette matrice est donc similaire à celle utilisée pour le krigeage simple, mais elle est ici construite à partir des points à simuler plutôt que des points observés.

Une fois la matrice $K$ obtenue, on procède à sa décomposition de Cholesky : 
$$
K = L U, \quad \text{où} L = U^{T}
$$

où $L$ est une matrice triangulaire inférieure.

On génère ensuite $n$ valeurs indépendantes $y_i \sim \mathcal{N}(0,1)$ pour $i=1,\dots,n$, qui forment le vecteur gaussien centré réduit $\mathbf{y}$.

La réalisation simulée est alors donnée par : 
$$
\mathbf{z} = L \mathbf{y}
$$

Cette réalisation possède bien la covariance souhaitée, puisque : 
$$
\operatorname{Cov}[\mathbf{z}] = \operatorname{Cov}[L \mathbf{y}] = L \operatorname{Cov}[\mathbf{y}] L^T = L I L^T = L L^T = K
$$

Ainsi, le vecteur simulé $\mathbf{z}$ est une réalisation non conditionnelle du champ gaussien de covariance $C(h)$.

### Simulations conditionnelles

Le principe de la simulation conditionnelle est similaire à celui de la simulation non conditionnelle, mais l’on distingue cette fois deux ensembles de points :  
- les $N$ points conditionnants, pour lesquels les valeurs sont observées ;  
- les $n$ points à simuler, dont on souhaite générer une réalisation conforme aux observations.

On commence par construire la matrice de covariance globale $K$ de taille $(N + n) \times (N + n)$, en plaçant d’abord les $N$ points conditionnants, puis les $n$ points à simuler. Sur cette matrice, on effectue la décomposition de Cholesky :

$$
K = L L^{T} =
\begin{bmatrix}
L_{11} & 0 \\
L_{21} & L_{22}
\end{bmatrix}
\begin{bmatrix}
L_{11}^{T} & L_{21}^{T} \\
0 & L_{22}^{T}
\end{bmatrix}.
$$

Ici, on divise la matrice triangulaire $L$ issue de la décomposition de Cholesky en trois blocs destinés au conditionnement. Le bloc $L_{11}$ correspond aux points conditionnants, le bloc $L_{22}$ aux points à simuler, et le bloc $L_{21}$ décrit la liaison entre ces deux groupes. Cette structure permet de séparer clairement la contribution des observations de celle de la variabilité aléatoire.

Pour imposer un conditionnement exact, on doit déterminer le vecteur $\mathbf{y}_1$ tel que :
$$ 
\mathbf{z}_1 = L_{11} \mathbf{y}_1
$$ 
où $\mathbf{z}_1$ est le vecteur des $N$ observations. On obtient directement :

$$
\mathbf{y}_1 = L_{11}^{-1}\mathbf{z}_1
$$

On génère ensuite un vecteur aléatoire $\mathbf{y}_2 \in \mathbb{R}^n$ composé de variables indépendantes suivant $\mathcal{N}(0,1)$.

La simulation complète s’écrit alors :  
$$
\begin{bmatrix}
\mathbf{z}_1 \\
\mathbf{z}_2
\end{bmatrix}
=
L\mathbf{y}
=
\begin{bmatrix}
L_{11} & 0 \\
L_{21} & L_{22}
\end{bmatrix}
\begin{bmatrix}
\mathbf{y}_1 \\
\mathbf{y}_2
\end{bmatrix}
=
\begin{bmatrix}
L_{11}\,\mathbf{y}_1 \\
L_{21}\,\mathbf{y}_1 + L_{22}\,\mathbf{y}_2
\end{bmatrix}.
$$

Comme les valeurs observées $\mathbf{z}_1$ sont connues, et que l'on peut déduire $\mathbf{y}_1$, seule la partie simulée varie d’une réalisation à l’autre :

$$
\mathbf{z}_2 = L_{21} \mathbf{y}_1 + L_{22} \mathbf{y}_2
$$

Enfin, remarquez que le terme $L_{21}\mathbf{y}_1$ est constant pour toutes les réalisations conditionnelles : il n’a donc à être calculé qu’une seule fois, ce qui accélère considérablement la génération de simulations conditionnelles.

Cette méthode est particulièrement efficace, car elle ne requiert qu’une seule inversion de matrice — celle de $L_{11}$ — pour traiter l’ensemble des réalisations. Une fois cette étape effectuée, les simulations additionnelles sont produites très rapidement et à faible coût computationnel. Sa principale limitation est la mémoire : la taille totale $(N + n)$ reste limitée à quelques milliers de points, faute de quoi la matrice $K$ devient trop volumineuse pour être stockée ou factorisée. De plus, $K$ doit être non singulière pour permettre la décomposition de Cholesky, ce qui signifie notamment que les points à simuler ne doivent pas coïncider exactement avec les points observés.

D’autres décompositions sont possibles pour générer les simulations, notamment celles fondées sur les valeurs propres et les vecteurs propres de $K$, mais la décomposition de Cholesky demeure l’approche la plus efficace dans les cas où elle est applicable.


---


## Méthode de simulation séquentielle gaussienne (SGS)

La méthode SGS est une méthode de simulation conditionnelle, le cas non conditionnel n’étant qu’une situation particulière où aucune donnée n’est imposée. Le principe général consiste à simuler les valeurs séquentiellement, point par point, en utilisant à chaque étape une distribution conditionnelle dérivée du krigeage simple (KS). Cette distribution, gaussienne, sert alors à tirer aléatoirement une valeur au point considéré.

Supposons que l’on dispose de $N$ points conditionnants, décrits par une covariance $C(h)$, et que l’on souhaite simuler $n$ points inconnus dans un domaine. L’algorithme commence par :

1. **Générer un ordre aléatoire** (souvent appelé chemin de simulation) pour visiter successivement les $n$ points à simuler.
Cet ordre importe, car chaque valeur simulée devient immédiatement une nouvelle donnée conditionnante pour les étapes suivantes.

2. **À partir de cet ordre aléatoire, parcourir les points un par un** et, pour chaque point $x_i$, considérer comme données conditionnantes l’ensemble des valeurs déjà disponibles soit les $N$ observations initiales, ainsi que les valeurs simulées aux points ${x_1, \dots, x_{i-1}}$.

3. **Effectuer un krigeage simple au point $x_i$**, à l’aide du modèle de covariance (ou variogramme) spécifié.

   Le krigeage simple fournit :  
   - La valeur krigée (espérance conditionnelle) :  
   $$
   Z_i^* = E[Z(x_i) \mid \text{données connues}]
   $$
   - La variance de krigeage (variance conditionnelle) :  
   $$
   \sigma_k^2 = \operatorname{Var}[Z(x_i) \mid \text{données connues}]
   $$
   Ces deux quantités définissent la distribution gaussienne locale à partir de laquelle sera tirée la valeur simulée.

4. **Simuler la valeur au point $x_i$ ** en tirant un nombre aléatoire selon la loi normale conditionnelle obtenue : 
   $$
   Z(x_i) \sim \mathcal{N}(Z_i^*, \sigma_k^2)
   $$

5. **Ajouter immédiatement la valeur simulée $Z(x_i)$** à l’ensemble des données conditionnantes. Elle influencera donc le krigeage simple des points suivants, ce qui confère à la méthode son caractère pleinement conditionnel et séquentiel.

6. **Répéter les étapes 2 à 5** jusqu’à ce que tous les points du chemin de simulation aient été visités, ce qui fournit une réalisation complète compatible avec les valeurs observées, le modèle spatial (variogramme) et la distribution gaussienne imposée.

### Remarques importantes

Il est important de rappeler que, dans la méthode SGS, la taille des systèmes de krigeage augmente progressivement, car le nombre de points connus — comprenant à la fois les points conditionnants initiaux et les points déjà simulés — s’accroît à chaque étape du processus. Pour éviter que les calculs ne deviennent trop lourds, on restreint généralement le krigeage à une fenêtre locale de voisinage, tirant parti de l’effet d’écran : les points éloignés ont peu d’influence sur l’estimation et peuvent être ignorés sans perte significative de précision.

Lorsque le modèle de covariance inclut un effet de pépite, un traitement particulier s’impose. Dans le cas non conditionnel, il est préférable d’ajouter cet effet après la simulation, sous forme d’un bruit indépendant de variance $C_0$, afin de ne pas perturber la structure spatiale simulée. En revanche, dans le cas conditionnel, une telle correction n’est pas possible, car les observations incluent déjà l’effet de pépite et doivent être reproduites exactement. Certains modèles de covariance, comme les modèles sphériques ou gaussiens, peuvent d’ailleurs être plus difficiles à reproduire fidèlement dans un cadre séquentiel.

L’ordre de visite des points joue également un rôle non négligeable. Un parcours systématique, par exemple selon une direction fixe, peut créer des artefacts ou induire une anisotropie artificielle dans la réalisation. C’est pourquoi il est recommandé d’utiliser un ordre aléatoire, et même, pour améliorer la qualité des simulations, de procéder en plusieurs passes : une première passe aléatoire sur une maille plus grossière permettant de capturer les grandes structures, suivie d’une ou de plusieurs passes aléatoires sur des mailles plus fines pour affiner progressivement la réalisation. Cette stratégie multi-échelle permet souvent d’obtenir des simulations plus réalistes et exemptes d’effets directionnels artificiels.

### Démonstration que la méthode SGS fournit les bons variogrammes (ou covariogrammes)

On utilise un argument inductif : supposons que $n$ points ont été simulés par la méthode SGS et qu'ils possèdent la bonne structure spatiale (covariogramme). Nous montrons que cela implique que, à l’étape $n+1$, les $n+1$ points simulés auront aussi la bonne structure.


Soit $Z_{ns}$ un vecteur $n \times 1$ contenant les $n$ variables aléatoires simulées aux $n$ points déjà simulés. On suppose que leur covariance est la bonne, c’est-à-dire :

$$
\operatorname{Cov}[Z_{ns}, Z_{ns}'] = K_{nn}
$$

#### Étape $n+1$ : krigeage et simulation

La valeur krigée au point $n+1$ s’écrit :

$$
Z_{n+1}^* = \lambda^T Z_{ns}
$$

où

$$
\lambda = K_{nn}^{-1} K_{n1}
$$

avec $K_{n1}$ la covariance entre les $n$ points déjà simulés et le point $n+1$.

La méthode SGS simule la valeur au point $n+1$ selon :

$$
Z_{n+1} = Z_{n+1}^* + e
$$

où $e$ est un bruit d’erreur indépendant, de moyenne nulle et de variance $\sigma_k^2$.

#### Calcul des covariances

On calcule la covariance entre le point $n+1$ simulé et les points déjà simulés :

$$
\begin{aligned}
\operatorname{Cov}[Z_{n+1}, Z_{ns}] &= \operatorname{Cov}[Z_{n+1}^* + e, Z_{ns}] \\
&= \operatorname{Cov}[\lambda^T Z_{ns}, Z_{ns}] + \operatorname{Cov}[e, Z_{ns}] \\
&= \lambda^T \operatorname{Cov}[Z_{ns}, Z_{ns}] + 0 \\
&= \lambda^T K_{nn} \\
&= K_{n1}
\end{aligned}
$$

ce qui correspond bien à la covariance souhaitée.

De plus, la variance au point $n+1$ vaut :

$$
\begin{aligned}
\operatorname{Var}[Z_{n+1}] &= \operatorname{Var}[Z_{n+1}^* + e] \\
&= \operatorname{Var}[\lambda^T Z_{ns}] + \operatorname{Var}[e] \\
&= \lambda^T K_{nn} \lambda + \sigma_k^2 \\
&= K_{11}
\end{aligned}
$$

ce qui correspond aussi à la variance de la fonction de covariance à simuler.


### Notes importantes

L’algorithme SGS repose sur l’utilisation de distributions conditionnelles, ce qui rend l’hypothèse de normalité particulièrement commode : si la variable $Z$ est gaussienne, alors le krigeage simple fournit exactement les paramètres (moyenne et variance) de la loi conditionnelle de $Z(x_i)$ donnée l’information disponible. Toutefois, la démonstration par induction présentée précédemment ne dépend pas de la normalité de $Z$. Elle utilise uniquement les propriétés linéaires du krigeage simple, et non le fait que celui-ci corresponde à une loi conditionnelle gaussienne exacte. L’algorithme reste donc valide même si la variable n’est pas strictement gaussienne.

Dans ce cadre, il est tout à fait possible de simuler un bruit $e$ de moyenne nulle et de variance $\sigma_k^2$ sans imposer qu’il soit normal. Le variogramme cible sera alors correctement reproduit. En revanche, l’histogramme des valeurs simulées aura tendance à devenir plus « normal » que celui des données initiales. Cela s'explique par le fait que la valeur krigée est une combinaison linéaire de nombreuses observations, ce qui, par un argument proche du théorème central limite, tire naturellement les distributions vers une forme plus gaussienne.

Enfin, il est très simple de combiner l’algorithme SGS avec la méthode matricielle LU présentée dans la section précédente. Cette combinaison permet notamment de simuler simultanément plusieurs variables corrélées en de multiples points, tout en respectant les relations de covariance entre variables. Cela ouvre la voie à des simulations multivariées plus complexes et plus réalistes.

---

## Méthode de recuit simulé

La méthode du recuit simulé (simulated annealing) est une technique d’optimisation extrêmement flexible, largement utilisée en simulation géostatistique lorsqu’il faut reproduire non seulement les moments d’ordre 1 ou 2 (histogramme, variogramme), mais également des caractéristiques plus complexes du phénomène.

### Principe général

Le principe consiste à définir une fonction objectif que l’on cherche à minimiser. Cette fonction mesure l’écart entre la réalisation simulée et les propriétés que l’on souhaite lui imposer. Un exemple classique consiste à minimiser la différence entre :
  - le variogramme expérimental des données simulées,
  - le variogramme théorique souhaité.

La fonction objectif peut être enrichie pour intégrer d’autres contraintes, par exemple :
  - le respect d’une courbe tonnage–teneur en contexte minier,
  - l’intégration de relations déterministes entre variables,
  - des contraintes géologiques imposant des structures ou des contacts,
  - ou encore des statistiques d’ordre supérieur (connectivité, proportion de phases, asymétries spatiales).

Il existe de nombreuses variantes de la méthode, qui diffèrent selon la manière dont la fonction objectif est formulée, les contraintes qu’elle inclut et la stratégie utilisée pour explorer l’espace des solutions. Cette grande flexibilité fait du recuit simulé une approche particulièrement adaptée lorsqu’aucune méthode géostatistique classique (telle que SGS ou les simulations matricielles) ne permet de satisfaire simultanément toutes les contraintes imposées.

### Algorithme de recuit simulé

1. **Initialisation :**  
   On tire aléatoirement une valeur pour chaque point à simuler en respectant l’histogramme désiré.  
   On place ensuite les valeurs conditionnantes (points observés) dans le champ.  
   On calcule le variogramme expérimental avec toutes ces valeurs.  
   On évalue la fonction objectif $O$ qui combine la distance entre le variogramme expérimental et le modèle théorique, ainsi que la différence entre l’histogramme simulé et l’histogramme attendu.

2. **Itération :**  
   i) On tire au hasard un point du champ.  
   - Si c’est un point conditionnant, on ne change rien.  
   - Sinon, on tire une nouvelle valeur $z'$ selon une distribution globale (par exemple, l’histogramme cible).  
   On calcule la nouvelle valeur de la fonction objectif $O_{i+1}$.

   ii) On décide d’accepter ou non cette nouvelle valeur selon la règle :  
   $$
   p = \exp\left(-\frac{O_{i+1} - O_i}{T}\right)
   $$  
   où  
   - $T$ est la "température" (paramètre contrôlant la probabilité d’acceptation).  
   - Si $O_{i+1} < O_i$, on accepte toujours (car $p > 1$).  
   - Sinon, on accepte avec la probabilité $p$, sinon on rejette (on remet la valeur précédente).

3. **Refroidissement :**  
   La température $T$ diminue lentement au fil des itérations, ce qui réduit progressivement la probabilité d’accepter des solutions moins bonnes.  
   Ce mécanisme permet d’échapper aux minima locaux en début d’algorithme et de converger vers un optimum global.

4. **Critère d’arrêt :**  
   On arrête l’algorithme lorsque la fonction objectif atteint un certain seuil ou après un nombre maximal d’itérations.

### Remarques

Il est souvent avantageux d’amorcer le recuit simulé avec une réalisation obtenue par une autre méthode de simulation — par exemple une réalisation SGS ou matricielle — plutôt qu’avec un champ initial entièrement aléatoire. Ce choix permet de réduire le nombre d’itérations nécessaires et d’accélérer la convergence vers une solution satisfaisant les contraintes imposées. La fonction objectif du recuit simulé peut d’ailleurs être enrichie très facilement pour intégrer des contraintes spécifiques au problème étudié, qu’il s’agisse de contraintes géologiques, de relations déterministes, d’exigences sur les proportions, la connectivité ou la variabilité. Cette grande flexibilité constitue l’un des atouts majeurs de la méthode. En contrepartie, le recuit simulé est généralement plus coûteux en temps de calcul que les méthodes matricielles ou séquentielles classiques, car l’algorithme explore un grand nombre de configurations avant d’en accepter une qui minimise suffisamment la fonction objectif.
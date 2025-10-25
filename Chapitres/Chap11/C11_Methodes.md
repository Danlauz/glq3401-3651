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
  - Etc.

Dans la suite, nous examinerons quelques-unes de ces méthodes.

## 8.3 Méthode de simulation matricielle (LU, décomposition de Cholesky)

Cette méthode est simple à programmer et efficace pour simuler de petits champs. Elle permet de réaliser facilement des simulations conditionnelles comme non-conditionnelles.

---

### 8.3.1 Simulations non-conditionnelles

Soit $n$ points à simuler avec une covariance $C(h)$. On construit la matrice de covariance $K$ de taille $n \times n$ (identique à celle utilisée pour le krigeage simple).

On effectue la décomposition de Cholesky :  
$$
K = L U, \quad \text{où } L = U^{T}
$$

On tire ensuite $n$ valeurs indépendantes $y_i \sim \mathcal{N}(0,1)$ pour $i=1,\dots,n$, formant le vecteur $\mathbf{y}$.

La réalisation simulée est alors :  
$$
\mathbf{z} = L \mathbf{y}
$$

Cette réalisation $\mathbf{z}$ a la covariance correcte, car :  
$$
\operatorname{Cov}[\mathbf{z}] = \operatorname{Cov}[L \mathbf{y}] = L \operatorname{Cov}[\mathbf{y}] L^T = L I L^T = L L^T = K
$$

---

### 8.3.2 Simulations conditionnelles

Le principe est similaire, mais on distingue deux ensembles de points :  
- $N$ points conditionnants (observés),  
- $n$ points à simuler.

On construit la matrice de covariance $K$ de taille $(N + n) \times (N + n)$, et on la décompose en blocs via Cholesky :  
$$
K = L L^T = 
\begin{bmatrix}
L_{11} & 0 \\
L_{21} & L_{22}
\end{bmatrix}
\begin{bmatrix}
L_{11}^T & L_{21}^T \\
0 & L_{22}^T
\end{bmatrix}
$$

- $L_{11}$ correspond aux points conditionnants,  
- $L_{22}$ aux points à simuler,  
- $L_{21}$ relie les deux groupes.

On génère un vecteur aléatoire $\mathbf{y} = \begin{bmatrix} \mathbf{y}_1 \\ \mathbf{y}_2 \end{bmatrix}$, où $\mathbf{y}_1 \in \mathbb{R}^N$ et $\mathbf{y}_2 \in \mathbb{R}^n$ sont des vecteurs de variables indépendantes $\mathcal{N}(0,1)$.

La simulation s’écrit :  
$$
\begin{bmatrix}
\mathbf{z}_1 \\
\mathbf{z}_2
\end{bmatrix}
= 
L \mathbf{y} = 
\begin{bmatrix}
L_{11} \mathbf{y}_1 \\
L_{21} \mathbf{y}_1 + L_{22} \mathbf{y}_2
\end{bmatrix}
$$

Comme les valeurs $\mathbf{z}_1 = \mathbf{z}_\text{obs}$ sont connues, on impose :  
$$
\mathbf{y}_1 = L_{11}^{-1} \mathbf{z}_1
$$

On tire ensuite aléatoirement $\mathbf{y}_2 \sim \mathcal{N}(0, I)$, et on calcule  
$$
\mathbf{z}_2 = L_{21} \mathbf{y}_1 + L_{22} \mathbf{y}_2
$$

Notez que $L_{21} \mathbf{y}_1$ est constant pour toutes les réalisations conditionnelles et ne nécessite pas d’être recalculé.

---

### Notes importantes

- Cette méthode est très efficace car une seule inversion de matrice (celle de $L_{11}$) est nécessaire. Les simulations additionnelles se génèrent rapidement à faible coût.  
- La principale limitation est la mémoire, car $(N + n)$ ne peut excéder quelques milliers sans que la matrice $K$ devienne trop volumineuse pour être stockée.  
- La matrice $K$ doit être non-singulière pour permettre la décomposition de Cholesky. Cela implique que les points à simuler ne doivent pas coïncider avec les points observés.  
- D’autres décompositions sont possibles, par exemple via la décomposition en valeurs propres et vecteurs propres de $K$. 

## 8.4 Méthode de simulation séquentielle gaussienne (SGS)

La méthode SGS est une méthode de simulation conditionnelle (le cas non-conditionnel est un cas particulier).

---

### Principe général

- On dispose de $N$ points conditionnants, avec covariance $C(h)$.
- On souhaite simuler $n$ points inconnus.
- On génère un **ordre aléatoire** (un chemin) pour visiter successivement les $n$ points à simuler.

---

### Workflow de la méthode SGS

1. **Initialisation**  
   - Ensemble des points connus : les $N$ points conditionnants.  
   - Points à simuler : $\{x_1, x_2, \dots, x_n\}$ dans un ordre aléatoire.

2. **Pour chaque point $x_i$ dans l’ordre aléatoire :**

   a. **Calcul du krigeage simple** sur $x_i$ en utilisant :  
   - Tous les points conditionnants $N$,  
   - Tous les points déjà simulés $\{x_1, \dots, x_{i-1}\}$.

   Le krigeage simple fournit :  
   - La valeur krigée (espérance conditionnelle) :  
   $$
   Z_i^* = E[Z(x_i) \mid \text{données connues}]
   $$
   - La variance de krigeage (variance conditionnelle) :  
   $$
   \sigma_k^2 = \operatorname{Var}[Z(x_i) \mid \text{données connues}]
   $$

   b. **Simulation de la valeur au point $x_i$ :**  
   On tire aléatoirement une valeur suivant la loi normale conditionnelle :  
   $$
   Z(x_i) \sim \mathcal{N}(Z_i^*, \sigma_k^2)
   $$

   c. **Ajout du point simulé $x_i$ avec sa valeur $Z(x_i)$ à l’ensemble des points connus.**

3. **Répéter** jusqu’à ce que tous les $n$ points soient simulés.

---

### Remarques importantes

- La taille des systèmes de krigeage augmente avec le nombre total de points connus (points conditionnants + points simulés).  
- En pratique, pour limiter la complexité, on utilise une **fenêtre locale** pour ne prendre en compte que les voisins proches (effet d’écran).  
- Pour un **effet de pépite** dans le modèle :  
  - En non-conditionnel, il est préférable d’ajouter cet effet après simulation sous forme d’une erreur indépendante de variance $C_0$.  
  - En conditionnel, ce n’est pas possible car les observations incluent déjà cet effet.  
- Certaines covariances (ex. sphérique, gaussien) peuvent être plus difficiles à reproduire fidèlement.  
- L’ordre de visite des points peut influencer les résultats :  
  - Éviter un parcours systématique selon une direction.  
  - Recommandation : une visite en deux étapes,  
    1. Première visite aléatoire sur une maille large pour capturer la grande échelle,  
    2. Deuxième visite aléatoire sur une maille plus fine pour affiner la grille.  
  - Cette stratégie peut être étendue à plusieurs passes successives.

---

### Schéma simplifié du workflow

```mermaid
flowchart TD
    A[Points conditionnants N connus] --> B[Définir ordre aléatoire des points à simuler n]
    B --> C[Pour chaque point $x_i$ à simuler]
    C --> D[Krigeage simple sur $x_i$ avec points connus]
    D --> E[Calcul $Z_i^*, \sigma_k^2$]
    E --> F[Tirer $Z(x_i) \sim \mathcal{N}(Z_i^*, \sigma_k^2)$]
    F --> G[Ajouter $x_i$ simulé à l'ensemble des points connus]
    G --> C
    C --> H[Tous les points simulés ?]
    H -- Oui --> I[Fin : Ensemble complet simulé]

### Démonstration que la méthode SGS fournit les bons variogrammes (ou covariogrammes)

On utilise un argument inductif : supposons que $n$ points ont été simulés par la méthode SGS et qu'ils possèdent la bonne structure spatiale (covariogramme). Nous montrons que cela implique que, à l’étape $n+1$, les $n+1$ points simulés auront aussi la bonne structure.

---

#### Hypothèse inductive

Soit $Z_{ns}$ un vecteur $n \times 1$ contenant les $n$ variables aléatoires simulées aux $n$ points déjà simulés. On suppose que leur covariance est la bonne, c’est-à-dire :

$$
\operatorname{Cov}[Z_{ns}, Z_{ns}'] = K_{nn}
$$

---

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

---

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

ce qui correspond aussi à la variance du covariogramme à simuler.

---

### Notes importantes

- L’algorithme est basé sur les distributions conditionnelles, donc idéalement $Z$ est gaussien pour que le krigeage corresponde aux paramètres conditionnels exacts. Cependant, la preuve par induction ci-dessus ne nécessite pas que la distribution soit gaussienne. En effet, l’argument repose uniquement sur les propriétés du krigeage simple, sans utiliser que celui-ci coïncide avec une loi conditionnelle.

- Ainsi, on peut simuler un bruit $e$ de moyenne 0 et variance $\sigma_k^2$ sans qu’il soit forcément normal, et le bon variogramme sera reproduit. En revanche, l’histogramme des valeurs simulées tendra vers une distribution plus normale que celle des données initiales, car la valeur krigée est une combinaison linéaire des observations (c’est une conséquence intuitive du théorème central limite).

- Il est facile de combiner cet algorithme SGS avec la méthode matricielle LU vue précédemment, par exemple pour simuler simultanément plusieurs variables en plusieurs points.


## 8.5 Méthode de recuit simulé

La méthode de recuit simulé ("simulated annealing") est une technique d’optimisation très flexible appliquée à la simulation géostatistique.

### Principe général

- On définit une **fonction objectif** à minimiser, par exemple la différence entre :
  - le variogramme expérimental des données simulées,
  - le variogramme théorique souhaité.

- Cette fonction peut aussi inclure d’autres contraintes, telles que :
  - respect d’une courbe tonnage-teneur,
  - intégration de relations déterministes,
  - contraintes géologiques,
  - etc.

- Plusieurs variantes existent selon la formulation de la fonction objectif et les contraintes.

---

### Algorithme de recuit simulé

1. **Initialisation :**  
   On tire aléatoirement une valeur pour chaque point à simuler en respectant l’histogramme désiré.  
   On place ensuite les valeurs conditionnantes (points observés) dans le champ.  
   On calcule le variogramme expérimental avec toutes ces valeurs.  
   On évalue la fonction objectif $O$ qui combine la distance entre le variogramme expérimental et le modèle théorique ainsi que la différence entre l’histogramme simulé et celui attendu.

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

---

### Remarques

- On peut amorcer le recuit simulé avec une réalisation provenant d’une autre méthode (plutôt qu’un tirage aléatoire), pour accélérer la convergence.

- La fonction objectif peut être enrichie pour intégrer des contraintes spécifiques au problème étudié.

- Cette méthode est puissante mais souvent coûteuse en temps de calcul comparée aux méthodes matricielles ou séquentielles.




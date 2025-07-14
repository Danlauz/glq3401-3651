# 12.2 Simulations tronquées

Les simulations tronquées constituent une famille de méthodes géostatistiques destinées à simuler des variables catégorielles (faciès, lithologies, types de roches) à partir de champs gaussiens continus. L’idée fondamentale consiste à tirer parti de la continuité spatiale et des outils statistiques bien établis associés aux variables normales, puis à transformer ces champs continus en variables discrètes par troncature selon des seuils ou des zones de codage.

Ces méthodes permettent :
- d’assurer la reproduction des proportions globales des différentes catégories,
- de contrôler les structures spatiales via les variogrammes des champs gaussiens,
- et, selon le modèle, d’imposer des relations spatiales précises entre les catégories (exclusions, transitions obligatoires, contacts interdits, etc.).

Deux grandes variantes sont présentées ici :

1. Le simulation gaussienne tronquée, dans lequel un seul champ gaussien est simulé et découpé en intervalles selon l’ordre des faciès.
2. Les simulations plurigaussiennes, plus général et plus flexible, où plusieurs champs gaussiens sont utilisés conjointement pour définir des règles complexes d’organisation spatiale entre les faciès.

Les sections suivantes décrivent ces deux approches sous forme de workflows détaillés.


## Simulation Gaussienne Tronquée

Le modèle gaussien tronqué simule une variable gaussienne continue, puis applique des seuils pour obtenir des faciès catégoriels respectant les proportions observées.

### Workflow

1. **Ordonnancement des faciès**  
   - Classer les faciès selon une séquence croissante (ex : 1, 2, 3).  
   - Cette ordonnancement impose des relations d’exclusion et de contiguïté spatiale (ex. un passage de faciès 1 à 3 doit obligatoirement passer par 2).

2. **Détermination des seuils gaussiens**  
   - À partir des proportions des faciès (ex. 0.2, 0.35, 0.45), calculer les seuils sur une distribution normale standard N(0,1) qui définissent les intervalles correspondant à chaque faciès.

3. **Conditionnement des valeurs gaussiennes aux données observées**  
   - Pour chaque point d’observation :  
     - Effectuer un krigeage simple pour estimer la distribution conditionnelle.  
     - Tirer aléatoirement une valeur gaussienne dans cette distribution.  
     - Vérifier que cette valeur tombe dans l’intervalle correspondant au faciès observé.  
     - Si non, tirer une nouvelle valeur jusqu’à acceptation.

4. **Simulation conditionnelle gaussienne**  
   - Une fois toutes les valeurs conditionnées obtenues, réaliser une simulation gaussienne classique en respectant ces contraintes.

### Remarques

- Ce modèle permet de contrôler les proportions et impose un ordre naturel entre faciès.
- Il ne permet pas toutes les configurations spatiales possibles (exclusion des contacts directs entre certains faciès non consécutifs).

---

## Simulations Plurigaussiennes

Le modèle plurigaussien étend le modèle gaussien tronqué en utilisant deux variables gaussiennes corrélées pour modéliser des faciès avec des relations spatiales plus complexes.

### Workflow

1. **Simulation de deux champs gaussiens corrélés**  
   - Simuler deux variables gaussiennes \(Y_1\) et \(Y_2\) avec une corrélation fixée au lag 0.  
   - Chaque champ possède son propre modèle de variogramme.

2. **Définition du plan de codage des faciès**  
   - Associer chaque faciès à une zone (rectangle ou autre forme) du plan \((Y_1, Y_2)\).  
   - Ce plan encode les relations spatiales souhaitées (exclusions, voisinages obligatoires).  
   - Les proportions des faciès sont données par l’intégrale de la densité gaussienne bivariée sur ces zones.

3. **Inférence des paramètres**  
   - Calculer les variogrammes expérimentaux des indicatrices et leurs covariances croisées.  
   - Ajuster les modèles de variogrammes des deux champs et leur corrélation pour bien représenter les données.

4. **Conditionnement aux données observées**  
   - Pour chaque point d’observation \(x_i\) :  
     - Calculer la distribution conditionnelle conjointe de \(Y_1(x_i)\) et \(Y_2(x_i)\) (via cokrigage).  
     - Tirer une paire \((y_1, y_2)\).  
     - Vérifier que la paire tombe dans la zone du plan correspondant au faciès observé.  
     - Si non, tirer une nouvelle paire jusqu’à acceptation.  
     - Répéter pour tous les points et itérer plusieurs fois pour convergence.

5. **Simulation conditionnelle finale**  
   - Effectuer une simulation gaussienne classique conditionnelle aux valeurs \(Y_1, Y_2\) obtenues.  
   - Traduire les résultats en faciès via le plan de codage.

### Remarques

- Ce modèle permet des relations spatiales complexes entre faciès (exclusions, voisinages spécifiques).  
- La difficulté principale réside dans l’inférence précise des paramètres et le conditionnement.

---

Ces deux méthodes offrent un compromis entre réalisme géologique et complexité mathématique, la méthode plurigaussienne étant la plus flexible mais aussi la plus exigeante en termes de calcul et d’ajustement.

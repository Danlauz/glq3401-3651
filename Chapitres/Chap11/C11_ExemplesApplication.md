# 11.3 Exemples d’application des simulations conditionnelles

## Hydrogéologie

- **Domingue (1994)**  
  Étude de l’efficacité du piège hydraulique de Ville-Mercier pour confiner des contaminants dans un roc fracturé.  
  - Utilisation des mesures de capacité spécifique pour estimer les transmissivités (points conditionnants).  
  - Simulation de champs de transmissivité utilisés pour modéliser le réseau d’écoulement.  
  - Résultat : certaines simulations montrent que la zone contaminée déborde de la zone de captage, indiquant une possible inefficacité du piège.

- **Gutjahr et al. (1995)**  
  Simulation conditionnelle pour comparer l’impact des charges et des transmissivités sur le trajet et temps de parcours des contaminants.  
  - Charges influencent fortement le trajet, peu les temps de parcours.  
  - Transmissivités influencent peu le trajet, mais beaucoup les temps de parcours.  
  - La combinaison charge + transmissivité conditionne au mieux les temps de parcours.

- **Gomez-Hernandez (1993)**  
  Simulation conditionnelle pour changement d’échelle des transmissivités :  
  - Passage de mesures ponctuelles à des blocs.  
  - Définition de modèles de covariance croisée pour transmissivités ponctuelles et de blocs.  
  - Utilisation de ces modèles pour simuler des champs de transmissivités de blocs.

- **Gomez-Hernandez (1996)**  
  Utilisation des simulations conditionnelles comme base pour résoudre des problèmes inverses en hydrogéologie.  
  - Plusieurs champs de transmissivités possibles, compatibles avec les charges observées.  
  - Applications : modélisation du rendement aquifère, piège hydraulique, sensibilité à la contamination.

---

## Mines

- **Naraghi et Marcotte (1996)**  
  Détermination du nombre et de l’épaisseur des couches pour une pile d’homogénéisation afin d’atteindre un degré d’homogénéité cible.

- **Marcotte et al. (1996)**  
  Étude de l’impact du biais conditionnel des estimateurs sur les profits d’une mine type.  
  - Influence du nombre d’observations disponibles sur la sélection des blocs.

- **Froideveaux (1984)**  
  Modélisation des précisions sur l’estimation des réserves récupérables (après application d’une teneur de coupure).

---

## Pétrole

- **Haas et Dubrule (1994)**  
  Simulations conditionnelles séquentielles pour inversion 3D des impédances acoustiques :  
  - Génération d’un vecteur d’impédance verticale.  
  - Conversion en coordonnées temporelles, calcul d’amplitudes sismiques synthétiques.  
  - Comparaison avec les traces mesurées pour accepter ou resimuler.

---

## Autres applications potentielles

- Estimation de la précision sur les volumes contaminés dépassant une norme donnée.  
- Modélisation de la variabilité des teneurs au concentrateur et impact des plans de minage.  
- Optimisation des scénarios d’exploitation (fosse à ciel ouvert, exploitation souterraine).  
- Optimisation des procédés d’homogénéisation en carrières (cimenteries).  
- Étude probabiliste de scénarios pessimistes pour l’emmagasinage des déchets nucléaires.  
- Identification des emplacements clés pour le prélèvement d’échantillons supplémentaires en environnement ou hydrogéologie.

## Remarque à propos de la normalité des observations

Les méthodes gaussiennes supposent que les données conditionnantes suivent une distribution multinormale. Cette hypothèse est difficile à vérifier rigoureusement. Cependant, on peut souvent :

1. **Transformer les données** vers une distribution normale (via une transformation graphique ou autre méthode).  
2. **Calculer et modéliser** le variogramme des valeurs transformées.  
3. **Effectuer la simulation** dans le domaine transformé (normal).  
4. **Appliquer la transformation inverse** pour revenir au domaine original.

> **Note importante :** Cette procédure garantit la reproduction du variogramme de la variable transformée, **pas** nécessairement celui de la variable originale. La qualité de cette reproduction dépend largement de la validité des hypothèses de stationnarité et multinormalité.

Le conditionnement par les données aide toutefois à **atténuer ces contraintes**, car les caractéristiques implicites des données observées sont propagées dans la simulation.

> **Remarque :**  
> L’histogramme et le variogramme ne représentent que les deux premiers moments du processus. Plusieurs processus peuvent partager ces caractéristiques tout en ayant des apparences spatiales très différentes.

---

## Extension au cas multivariable

- Pour la **méthode LU**, la simulation multivariable est directe : on travaille avec les matrices de covariance multivariables.  
- Pour la **méthode SGS**, il suffit de remplacer le krigeage simple par un **cokrigeage simple**.  
- La distribution conditionnelle multivariée est déterminée par les propriétés de la loi multinormale, avec les paramètres obtenus par cokrigeage.



# 12.1 Simulation d’indicatrices

La simulation d’indicatrices permet de modéliser la présence ou l’absence de faciès à partir de variables binaires (0 ou 1). Le processus s’appuie sur une approche séquentielle, similaire à celle utilisée pour les variables continues, mais adaptée aux variables catégorielles.

### Étapes de la simulation

1. **Codage des données**  
   Chaque faciès est représenté par une variable indicatrice codée 0 (absence) ou 1 (présence).

2. **Visite d’un point à simuler**  
   On choisit un point spatial où simuler la valeur du faciès.

3. **Krigage des variables indicatrices**  
   - On krige chaque variable indicatrice à ce point pour obtenir une estimation de sa valeur.  
   - Ces valeurs krigées sont interprétées comme des probabilités de présence de chaque faciès.  
   - Pour \(k\) faciès, on peut kriger \(k-1\) indicatrices et déduire la dernière par complément.

4. **Construction des intervalles de probabilité**  
   - Les probabilités associées à chaque faciès sont cumulées dans l’intervalle \([0,1]\).  
   - Par exemple, pour 3 faciès :  
     - Faciès 1 : intervalle \([0, 0.2)\)  
     - Faciès 2 : intervalle \([0.2, 0.8)\)  
     - Faciès 3 : intervalle \([0.8, 1]\)

5. **Tirage aléatoire et affectation du faciès**  
   - On tire une valeur uniforme \(u\) dans \([0,1]\).  
   - Le faciès correspondant à l’intervalle contenant \(u\) est attribué au point simulé.

6. **Mise à jour des données**  
   - On code les indicatrices du faciès retenu au point simulé.  
   - Ces nouvelles données sont ajoutées au jeu d’observations.

7. **Répétition**  
   - Le processus est répété pour chaque point à simuler jusqu’à la couverture complète du domaine.

### Remarques importantes

- **Variogrammes et covariances croisées**  
  Il est nécessaire de calculer le variogramme de chaque indicatrice, ainsi que les covariances croisées entre indicatrices si l’on souhaite utiliser un cokrigage, afin de mieux décrire les relations spatiales entre faciès.

- **Limites de la méthode**  
  Cette méthode ne modélise aucune relation spécifique entre faciès, par exemple :  
  - Elle ne permet pas d’exclure un contact direct entre certains faciès (ex. faciès 1 et faciès 3).  
  - Elle ne peut imposer des séquences ou transitions particulières (ex. une alternance 1-2-3-2-1).

Cette approche constitue la base de la simulation séquentielle d’indicatrices, simple à implémenter mais limitée pour des configurations géologiques complexes.

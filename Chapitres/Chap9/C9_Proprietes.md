# 9.4 Propriétés du cokrigeage

Toutes les propriétés du krigeage s'appliquent également au cokrigeage. En plus, on observe les propriétés spécifiques suivantes :

1. **Linéarité des combinaisons estimées**  
   Si l'on estime directement par cokrigeage une combinaison linéaire des variables, la valeur cokrigée sera égale à la même combinaison linéaire appliquée aux valeurs cokrigées de chaque variable.  
   
   > Cette propriété n’est pas vérifiée par le krigeage.  
   
   **Exemple d’application :**  
   - Pour tracer le haut et la base d’une formation géologique, on pourrait estimer directement le haut, le bas, et l’épaisseur par krigeage.  
   - Les valeurs estimées du bas, obtenues soit directement, soit par la différence entre le haut et l’épaisseur, ne coïncideront pas nécessairement.  
   - En revanche, avec un cokrigeage, les deux approches donnent exactement la même estimation du bas.  
   
   Une autre illustration concerne l’**inversion gravimétrique** : en cokrigeant les densités de bloc par les anomalies gravimétriques, les densités estimées reproduisent exactement l’anomalie mesurée aux points d’observation.

2. **Propriété de cohérence**  
   Si l'on effectue le cokrigeage pour estimer une variable et sa dérivée, alors :  
   - Le cokrigeage de la dérivée est égal à la dérivée du cokrigeage.  
   - Plus généralement, pour toute transformation linéaire de $Z$, le cokrigeage de la transformation est la transformation appliquée à la valeur estimée $Z^*$ par cokrigeage.  
   
   Cette propriété généralise la propriété précédente.

3. **Variance inférieure ou égale**  
   La variance de cokrigeage est toujours inférieure (ou égale) à la variance de krigeage.

4. **Équivalence krigeage – cokrigeage dans certains cas**  
   Si la variable secondaire est échantillonnée aux mêmes points (ou en un sous-ensemble des mêmes points) que la variable principale, et si les covariances croisées et directes sont proportionnelles, c’est-à-dire qu’il existe un modèle unique $C(h)$ permettant de décrire toutes les covariances à une constante multiplicative près, alors le cokrigeage est identique au krigeage.  
   
   > **Conséquence :**  
   > - En général, on aura peu de gain à utiliser le cokrigeage si la variable secondaire n’est pas échantillonnée de manière plus abondante que la variable principale (ou du moins en des points différents).  
   > - De plus, une corrélation suffisamment forte entre la variable principale et la variable secondaire est nécessaire pour justifier le cokrigeage (typiquement $> 0.5$, souvent $> 0.7$).  

**Remarque :**  
Une situation courante de cokrigeage est celle d’une variable secondaire connue sur quasiment tout le domaine. Dans ce cas, il est recommandé de constituer le voisinage de cokrigeage en incluant au moins la variable secondaire aux mêmes points que la variable principale ainsi qu’au point à estimer. On peut aussi ajouter quelques observations supplémentaires de la variable secondaire proches du point d’estimation, en faisant attention à ne pas inclure deux points trop proches qui rendraient la matrice de cokrigeage quasi-singulière.

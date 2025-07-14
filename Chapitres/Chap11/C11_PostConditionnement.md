# 11.4 Post-conditionnement

Certaines méthodes de simulation ne permettent pas de générer directement des **simulations conditionnelles**, c’est-à-dire des réalisations qui respectent exactement les données observées aux points échantillons. Pour pallier cela, on utilise une technique appelée **post-conditionnement**.

### Principe du post-conditionnement

On suppose que la variable aléatoire $Z(x)$ est gaussienne de moyenne nulle. La démarche est la suivante :

1. **Simulation non-conditionnelle**  
   On réalise une simulation non-conditionnelle sur les points à simuler ainsi que sur les points échantillons.  
   - Notons $Z_{gs}$ les valeurs simulées aux points à simuler.  
   - Notons $Z_{is}$ les valeurs simulées aux points échantillons.

2. **Krigeage des données observées et simulées**  
   On effectue un krigeage simple ou ordinaire aux points à simuler :  
   - $Z_g^*$ : valeurs krigées aux points à simuler à partir des **données observées**.  
   - $Z_{gs}^*$ : valeurs krigées aux points à simuler à partir des **valeurs simulées aux points échantillons**.

3. **Calcul de la simulation conditionnelle post-conditionnée**  
   On combine les résultats pour obtenir la simulation conditionnelle corrigée :  
   \[
   Z_{sc} = Z_{gs} + (Z_g^* - Z_{gs}^*)
   \]
   
   Cette formule ajuste la simulation non-conditionnelle pour qu’elle respecte les données observées.

---

### Propriétés importantes

- **Exactitude aux points échantillons** :  
  Si un point à simuler coïncide avec un point échantillon, alors :  
  \[
  Z_{gs}^* = Z_{gs} = Z_{is}, \quad Z_g^* = Z_g = Z_i, \quad \Rightarrow Z_{sc} = Z_g = Z_i
  \]  
  La simulation post-conditionnée reproduit parfaitement la valeur observée.  
  Très loin des points échantillons, on a $Z_{gs}^* \approx Z_g^* \approx 0$, donc $Z_{sc} \approx Z_{gs}$ : la simulation post-conditionnée tend vers la simulation non-conditionnelle.

- **Précision** :  
  Il peut être démontré que  
  \[
  \operatorname{Var}(Z_{sc} - Z_g) = 2\sigma_k^2,
  \]  
  où $\sigma_k^2$ est la variance du krigeage simple.  
  Cela signifie qu’une simulation conditionnelle unique issue du post-conditionnement est en moyenne **deux fois moins précise** qu’une estimation par krigeage simple.  
  Il ne faut donc pas utiliser une seule réalisation post-conditionnée comme estimateur.

- **Moyenne des simulations conditionnelles** :  
  En effectuant un grand nombre de simulations conditionnelles post-conditionnées et en prenant la moyenne, on retrouve l’estimateur de krigeage simple.  
  La variance d’estimation de cette moyenne correspond à la variance du krigeage simple.  
  De plus, la variance des différentes réalisations autour de cette moyenne est aussi égale à la variance du krigeage simple.

---

### En résumé

Le post-conditionnement est une technique efficace pour **adapter des simulations non-conditionnelles afin qu'elles respectent les données observées**.  
Bien qu’une simulation post-conditionnée unique soit moins précise qu’un krigeage, l’ensemble des réalisations permet d’obtenir une bonne estimation et une mesure fiable de l’incertitude.


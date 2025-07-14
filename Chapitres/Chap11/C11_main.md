---
title: "Chapitre 11 - Simulations géostatistiques"
abstract: |
  Ce chapitre présente les fondements et les applications des simulations géostatistiques, un domaine clé pour la modélisation des variables spatiales complexes. Les simulations permettent de représenter l’incertitude spatiale et de générer des réalisations possibles cohérentes avec les données observées. Nous abordons les différences entre estimation et simulation, les types de simulations non conditionnelles et conditionnelles, ainsi que les méthodes classiques telles que la décomposition de Cholesky et la simulation séquentielle gaussienne (SGS). Ce chapitre fournit aussi les critères pour choisir et appliquer ces méthodes, analyse leurs avantages et limites, et illustre l’interprétation des résultats dans le contexte de l’évaluation des ressources. 

project:
  output-dir: exports  # <-- dossier de sortie pour tous les formats

format:
  pdf:
    output-file: ./exports/Chapitre11.pdf
    documentclass: article
    classoption: [10pt, oneside, twocolumn]
    geometry: margin=1in
    markdown_extensions: ["+fenced_divs"]

downloads:
  - file: Chapitre11.pdf    # simple nom de fichier, pas de chemin
    title: PDF
---

:::{important}
### Objectifs d'apprentissage
-   Identifier les problèmes types où les simulations s’appliquent ;

-   Expliquer les différences entre estimation et simulation ;

-   Expliquer les différences entre simulations non conditionnelles et conditionnelles ;

-   Être en mesure d’appliquer les méthodes de simulations de Choleskiet SGS. Discuter de leurs avantages et inconvénients ;

-  Utiliser et interpréter les résultats d’une simulation pour l’estimation des ressources ;

-  Expliquer les principales propriétés des simulations.

:::

# Introduction aux simulations géostatistiques

Au cours des 20 dernières années, les simulations géostatistiques sont devenues un domaine clé en géostatistique. Elles sont essentielles pour traiter des problèmes impliquant des transformations non-linéaires des variables mesurées.

## Principaux types d'applications

1. **Changement d’échelle non-linéaire**  
   Exemple : conductivité hydraulique ou transmissivité.  
   Ici, l’échelle varie selon les tests utilisés, la taille des éléments ou cellules, et les conditions aux limites dans les simulateurs d’écoulement.

2. **Relations non-linéaires entre variables**  
   Exemple : relation entre charge hydraulique et transmissivité, ou entre champ gravimétrique et densité.

3. **Fonctions de transfert complexes**  
   Exemple :  
   - Design de piles d’homogénéisation,  
   - Variabilité des teneurs dans un concentrateur minier,  
   - Temps de transport d’un contaminant.

---

## Importance de la distribution spatiale locale

Pour certains problèmes, la connaissance de la concentration moyenne dans un domaine ne suffit pas. La distribution spatiale exacte à l’intérieur du domaine est également cruciale.

### Exemple 1 : Profit d’un bloc minier

- Il suffit de connaître la teneur moyenne et les coûts d’exploitation.  
- La distribution spatiale précise n’a pas d’importance.

### Exemple 2 : Conductivité hydraulique d’un bloc hétérogène

- Bloc constitué de deux phases : sable et argile.  
- La conductivité hydraulique dépend non seulement de la proportion de sable, mais aussi de sa distribution spatiale.

---

## Illustration simplifiée

Imaginons 3 blocs ayant la même proportion de sable et d’argile mais des distributions différentes :

| Bloc 1           | Bloc 2           | Bloc 3           |
|------------------|------------------|------------------|
| Sable + Argile   | Sable - Argile   | Argile  | Sable  |
| Sable  | Argile  | Sable  | Sable   | Sable   | Argile |
| Argile | Sable   | Sable  | Sable   | Argile  | Sable  |
| Sable  | Argile  | Argile | Argile  | Sable   | Argile |
| Argile | Argile  | Argile | Argile  | Argile  | Sable  |

---

## Conductivité hydraulique (en cm/s)

- Conductivité sable : $1 \times 10^{-3}$  
- Conductivité argile : $1 \times 10^{-7}$  

### Résultats pour chaque bloc

| Bloc  | Conductivité horizontale $k_{hor}$ | Conductivité verticale $k_{vert}$ | Commentaire                         |
|-------|-----------------------------------|----------------------------------|-----------------------------------|
| 1     | $1 \times 10^{-5}$                 | $1 \times 10^{-5}$                | Moyenne géométrique $\left(\sqrt[k]{\prod k_i}\right)$ |
| 2     | $5 \times 10^{-4}$                 | $2 \times 10^{-7}$                | Moyenne arithmétique & harmonique |
| 3     | $2 \times 10^{-7}$                 | $2 \times 10^{-7}$                | Connexion possible aux sommets, anisotropie probable |

---

## Analyse

- **Même proportion de sable et d’argile** pour les 3 blocs.  
- **Conductivités très différentes** selon la distribution spatiale des phases.  
- Apparition d’**anisotropies** dans le tenseur de conductivité selon la structure spatiale.  
- Le variogramme de chaque bloc sera différent :  
  - Bloc 1 : peu structuré  
  - Bloc 2 : anisotrope  
  - Bloc 3 : structure isotrope  

---

Ce simple exemple illustre pourquoi il est indispensable d’utiliser des simulations géostatistiques qui tiennent compte non seulement des proportions moyennes, mais aussi de la distribution spatiale des variables à l’intérieur des blocs.




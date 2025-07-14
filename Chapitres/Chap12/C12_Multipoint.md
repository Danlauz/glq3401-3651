# 12.3 Les méthodes de simulation multipoints

## Pourquoi utiliser ces méthodes ?

Quand on simule des roches ou des types de sols (appelés *faciès*) sous la surface, on veut reproduire **la forme réelle des zones géologiques** : leur taille, leur forme, leur connexion. Les méthodes habituelles (basées sur des moyennes et des corrélations entre deux points) ne suffisent pas, car **elles ne voient que deux points à la fois**. Pourtant, ce qui donne la forme à un objet, c’est souvent **l’ensemble** de plusieurs points. Un peu comme pour une image : deux photos peuvent avoir les mêmes couleurs et contrastes (statistiques de base), mais des formes complètement différentes.

👉 Les méthodes multipoints (ou **MPS**, pour *Multiple Point Statistics*) permettent de **reproduire la forme globale** des objets souterrains, comme si on essayait de recréer **un dessin complexe** ou **un puzzle**.

---

## L'idée de base : copier un dessin de référence

Les méthodes multipoints utilisent **un modèle analogue**, c’est-à-dire un exemple d’image (ou de carte) qui ressemble à ce qu’on imagine dans le sous-sol : un dessin, une carte géologique, une photo satellite ou même une simulation d’objets. Ce modèle sert de **modèle à copier**.

On va ensuite "dessiner" notre simulation **point par point** ou **par morceaux**, en essayant de rester **cohérent avec le modèle**.

---

## Méthode 1 : la simulation point par point (comme compléter une image pixel par pixel)

### 🧩 L’analogie : un casse-tête qu’on construit un morceau à la fois

1. On commence avec une feuille blanche (ou quelques points connus).
2. À chaque nouveau point, on regarde ce qui a déjà été dessiné autour.
3. On cherche dans le dessin de référence des endroits où **le même entourage existe**.
4. On regarde **quelle couleur ou quelle catégorie** (par exemple, sable, argile, roche) le point central a dans le modèle.
5. On tire au hasard une de ces possibilités et on continue.

📝 Cette méthode est comme un jeu de devinettes : « Si autour de ce point, j’ai tel motif, que devrait-il y avoir ici ? »

**Limite** : si on ne trouve jamais ce motif exact dans le modèle, on doit :
- soit **réduire** le voisinage qu’on regarde (comme si on se contentait de moins d’indices),
- soit **choisir une configuration qui ressemble** (mais n’est pas identique), comme dans certaines variantes de l’algorithme.

---

## Méthode 2 : la simulation par morceaux (comme un découpage ou un collage)

### ✂️ L’analogie : on découpe des morceaux du modèle et on les colle ensemble

Plutôt que de dessiner pixel par pixel, on préfère **coller des blocs entiers** de l’image de référence, comme dans une **courtepointe** ou un **collage artistique**.

Voici comment ça marche :

1. On définit des blocs (par exemple, 8x8 pixels) dans le modèle.
2. On mesure la **forme** ou la **texture** de chaque bloc avec des outils simples (par exemple, des filtres qui détectent les bords, la moyenne, etc.).
3. On classe les blocs selon leur forme (par regroupement).
4. Lors de la simulation, on choisit un endroit vide sur la carte et on cherche dans les blocs **celui qui colle le mieux** avec ce qu’on a déjà placé autour.
5. On colle le bloc en gardant les pixels déjà fixés.

🎨 Résultat : on obtient une image qui respecte bien les **textures** et **formes** du modèle.

**Limite** : le collage entre deux blocs peut parfois créer des "coutures" visibles (transitions peu réalistes).

---

## Ce qu’il faut retenir

- Les méthodes multipoints sont comme un **jeu de construction** : on utilise un **exemple de dessin** pour en recréer un nouveau, qui lui ressemble.
- On peut soit dessiner **point par point** (comme un puzzle très fin), soit coller **des morceaux entiers** (comme un découpage).
- L’objectif est de reproduire **la forme, la continuité, et la texture** des objets souterrains – pas seulement leur proportion ou leur moyenne.
- Ces méthodes demandent un **bon dessin de départ** (modèle analogue) et un peu de calcul, mais elles donnent des images beaucoup plus réalistes.

---

## Illustrations possibles

- Une comparaison entre deux images ayant les mêmes statistiques mais une forme très différente.
- Une démonstration visuelle de simulation multipoint (avec grille de pixels colorés).
- Un schéma de la méthode "patchwork" montrant le glissement des blocs.
- Une analogie en BD : compléter un puzzle vs. coller des morceaux d’un dessin.

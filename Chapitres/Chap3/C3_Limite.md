# 3.2 Teneurs de coupure limite

La détermination de la teneur de coupure optimale commence par l’identification de trois teneurs de coupure limites et de trois teneurs d’équilibre.

:::{note}
Selon Taylor (1972), la teneur de coupure optimale appartient nécessairement à cet ensemble restreint de six teneurs de coupure.
:::

La teneur optimale ne peut être fixée arbitrairement. Elle résulte d’un équilibre entre les capacités techniques des installations (mine et concentrateur) et les conditions économiques du marché. La théorie de Lane et Taylor met en évidence trois facteurs limitatifs majeurs, chacun correspondant à une teneur de coupure limite.


- ⛏️ **Limite de la mine**  
  La capacité d’exploitation est contrainte par les équipements miniers et les infrastructures, comme la capacité de la halde à stériles.
  → Limitation au niveau des opérations minières.

- 🏭 **Limite du concentrateur**  
  Même si l’extraction peut fournir de grandes quantités de matériau minéralisé, le concentrateur ne peut pas tout traiter simultanément.  
  → Limitation au niveau du traitement du minerai.

- 📉 **Limite du marché**  
  Une production excédentaire par rapport à la demande peut entraîner une baisse des prix ou des invendus.  
  → Limitation imposée par la capacité d’absorption du marché.


## Objectif économique

La teneur de coupure doit être choisie de façon à maximiser le profit net par tonne de matériau minéralisé :

$$
\text{Profit} = \text{Revenus} - \text{Coûts}.
$$

Pour comparer équitablement les trois teneurs limites, toutes les grandeurs doivent être exprimées en tonnes de matériau minéralisé. On a donc les conversions suivantes des capacités :

- La mine peut extraire au plus $M$ tonnes de matériau minéralisé.

- Le concentrateur peut traiter $H$ tonnes de minerai, soit $H / x_c$ tonnes de matériau minéralisé, où $x_c$ est la proportion de minerai.

- Le marché peut absorber $K$ tonnes de métal, soit $\frac{K}{g_c y}$ tonnes de minerai} et $\frac{K}{x_c g_c y}$  tonnes de matériau minéralisé, où $x_c$ est la proportion de minerai, $g_c$ est la teneur moyenne des blocs sélectionnés, et $y$ est le taux de récupération métallurgique.


Ces conversions sont essentielles pour garantir la cohérence des comparaisons entre les différentes limites. Travailler en tonnes de matériau minéralisé évite les erreurs d'interprétation.

---

### Teneur de coupure : Mine

Supposons que la mine ait la capacité de miner $M$ tonnes de matériau minéralisé. Le profit net $v$ à maximiser est :

$$
v = (p - k) x_c g_c y - m - x_c h - \frac{f + F}{M}
$$

Le terme $x_c g_c y$ représente la quantité de métal produite par tonne de matériau minéralisé.  
Le terme $(p - k) x_c g_c y$ est le revenu brut généré.  
Les coûts sont :

- $m$ : coût de minage (indépendant de la teneur)  
- $x_c h$ : coût de traitement  
- $\frac{f + F}{M}$ : frais fixes par tonne minée  

L'optimisation revient à résoudre :

$$
\frac{dv}{dx_c} = 0
$$

Et on utilise le fait que :

$$
\frac{d(x_c g_c)}{dx_c} = c
$$

Ce qui donne la teneur limite de la mine :

$$
c_1 = \frac{h}{p - k}
$$

---

### Teneur de coupure : Concentrateur

Ici, le seul changement est que les frais fixes sont répartis sur $H / x_c$ tonnes de matériau minéralisé :

$$
v = (p - k) x_c g_c y - m - x_c h  - \frac{(f + F) x_c}{H}
$$

Après dérivation, on obtient :

$$
c_2 = \frac{h + \frac{f+F}{H}}{y(p - k)}
$$

---

### Teneur de coupure : Marché

Le marché peut absorber $K$ tonnes de métal, ce qui correspond à :

$$
\frac{K}{x_c g_c y} \text{ tonnes de matériau minéralisé}
$$

On définit le profit :

$$
v = (p - k) x_c g_c y - m - x_c h  - \frac{(f + F) x_c g_c y}{K}
$$

Et la teneur limite du marché est :

$$
c_3 = \frac{h}{\Big((p - k) - \frac{f+F}{K}\Big) y}
$$

On observe que :

$$
c_1 < \min(c_2, c_3)
$$

Ces trois teneurs ne dépendent pas de la distribution des teneurs dans le gisement. Elles sont donc **structurelles** et liées uniquement aux capacités des infrastructures et du marché.

---

## Exemple numérique

Soit les données suivantes (Lane, 1988, p. 116) pour un gisement d'uranium :

- $y = 0.87$ : taux de récupération du concentrateur  
- $(p-k) = 60$ \$/kg uranium  
- $h = 3.41$ \$/t de minerai  
- $m = 1.32$ \$/t de matériau minéralisé  
- $f = 11.9$ M\$  
- $F = 15.2$ M\$  
- $M = 12$ M tonnes  
- $H = 3.9$ M tonnes  
- $K = 0.9$ M tonnes  

> Les unités s'annulent naturellement pour obtenir la teneur en **kg uranium par tonne de matériau minéralisé**.

### Teneur de la mine :

$$
c_1 = \frac{h}{y (p - k)} = \frac{3.41}{0.87 \times 60} = 0.65 \ \text{kg/t}
$$

### Teneur du concentrateur :

$$
c_2 = \frac{h + (f + F) / H}{y (p - k)} = \frac{3.41 + \frac{11.9 + 15.2}{3.9}}{0.87 \times 60} = 0.198 \ \text{kg/t}
$$

### Teneur du marché :

$$
c_3 = \frac{3.41}{0.87 \times \left( 60 - \frac{11.9 + 15.2}{0.9} \right)} = 0.131 \ \text{kg/t}
$$

---
Nous avons ici les trois teneurs de coupure permettant de maximiser les profits, mais pour une seule composante du système.
Qu’est-ce que cela signifie ? Eh bien, si nous exploitons la mine à pleine capacité, il faudrait opérer à 0,65 kg/t. Toutefois, cela ne garantit pas que le concentrateur, ni même le marché, soient en mesure de traiter ou d’absorber la totalité du matériau minéralisé extrait.

Il existe donc une notion d’équilibre qu’il convient de vérifier. Il faut également déterminer quelle teneur limite — entre la mine, le concentrateur et le marché — constitue réellement le facteur limitant.

En premier lieu, examinons comment calculer les teneurs de coupure d’équilibre.
---



---
title: "Chapitre 4 - Théorie de Gy et contrôle qualité"
abstract: |
  Cette section présente la théorie de l'échantillonnage ainsi que les contrôles de qualité (QA/QC). La théorie de Gy y est expliquée en détail, accompagnée de deux exemples concrets de QA/QC provenant de compagnies minières. Ces exemples sont analysés à partir d’illustrations tirées des rapports techniques NI 43-101 de ces entreprises. Nous présenterons aussi un moyen de calculer la densité théorique à partir d'une analyse chimique. Des ateliers interactifs vous permettent de vous familiariser avec une analyse selon la méthode de Gy (vous pouvez y ajouter autant d’analyses que souhaité), et également de générer vos propres résultats de QA/QC selon des scénarios synthétiques. Il est aussi possible de calculer la densité théorique à partir d'une analyse chimique.
 

project:
  output-dir: exports  # <-- dossier de sortie pour tous les formats

format:
  pdf:
    output-file: ./exports/Chapitre4.pdf
    documentclass: article
    classoption: [10pt, oneside, twocolumn]
    geometry: margin=1in
    markdown_extensions: ["+fenced_divs"]

downloads:
  - file: Chapitre4.pdf    # simple nom de fichier, pas de chemin
    title: PDF
---

:::{important}
### Objectifs d'apprentissage
-   Pouvoir prédire la précision relative d'un échantillon pour
    représenter la teneur d'un lot donné par la théorie de Gy ;

-   Proposer une stratégie d'analyse en laboratoire adéquate selon les
    équipements disponibles afin de prédire la précision relative
    associée à un lot donné ;

-   Reconnaître une stratégie d'analyse inadéquate ;

-   Comprendre les notions de biais, de précision et de justesse ;

-   Maîtriser les trois principaux outils de contrôle de qualité : blancs, standards et duplicatas ;

-   Identifier les biais à partir des résultats de contrôles de qualité ;

-   Calculer la densité théorique à partir d'une analyse chimique.
:::

# Notions de biais, de précisions et de justesse

En mine, un échantillon est une petite quantité de matière censée
représenter un ensemble (un « lot ») plus grand de matière. Par exemple,
on peut échantillonner la face d'une galerie, les « cuttings » d'un
forage de production, le minerai d'un wagonnet ou une carotte de forage.

Une fois les échantillons obtenus, il faut en analyser le contenu en
laboratoire afin d'identifier leur teneur. Par la suite, on peut vouloir
extrapoler les teneurs obtenues pour les échantillons à un volume
beaucoup plus grand de roche. Cela constitue un problème d'estimation.

Prenons l'exemple d'une carotte de forage de 3 m de longueur et de
diamètre 48 mm (taille NQ) obtenue par forage au diamant. Nous sommes
intéressés à connaître la teneur en or de cette carotte, afin de
procéder à l'estimation de nos ressources minérales. Pour y arriver, le
laboratoire a généralement besoin d'un échantillon représentatif de la
carotte sous forme de poudre, équivalant à seulement quelques grammes.
Il faut donc, à partir d'une carotte de quelques kg, échantillonner
correctement quelques grammes de celle-ci afin que la mesure de
laboratoire soit représentative de la teneur réelle de la carotte. Il
s'agit donc d'un vrai défi qui a mené à la théorie de l'échantillonnage
des matières morcelée.


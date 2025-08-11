---
title: "Chapitre 2 - Rapport Technique - NI-43-101 et Loi sur les mines"
abstract: |
  Cette section présente la norme canadienne sur les rapports techniques en mine : le rapport NI 43-101. Il s'agit d'une véritable mine d’or d’informations sur les projets miniers, de la phase d’exploration à celle de l’exploitation. Nous découvrirons cela ensemble au fil de cette lecture, accompagnée de quelques concepts interactifs.

project:
  output-dir: exports  # <-- dossier de sortie pour tous les formats

format:
  pdf:
    output-file: ./exports/Chapitre2.pdf
    documentclass: article
    classoption: [10pt, oneside, twocolumn]
    geometry: margin=1in
    markdown_extensions: ["+fenced_divs"]

downloads:
  - file: Chapitre2.pdf    # simple nom de fichier, pas de chemin
    title: PDF
---

:::{important}
### Objectifs d'apprentissage

- Comprendre le contenu et l'utilité des rapports techniques exigés par la norme canadienne NI 43-101 sur l'information relative aux projets miniers ;
- Maîtriser les différentes catégories de ressources et de réserves minières ;
- Comprendre le rôle et les responsabilités de la personne qualifiée (PQ) dans la rédaction d'un rapport conforme à la NI 43-101 ;
- Se familiariser avec l'importance des statistiques dans le processus d'estimation des ressources minières ;
- Être introduit à l'utilité de la géostatistique dans l'évaluation des ressources minérales.
:::

# Rapport technique NI-43-101

Le Règlement 43-101 a pour objectif de garantir que les informations
publiées et diffusées au sujet des propriétés minérales soient exactes,
vérifiables et non trompeuses. Il vise à protéger les investisseurs
contre les déclarations erronées, frauduleuses ou non fondées concernant
des projets miniers, notamment lorsqu'elles sont diffusées sur les
marchés boursiers réglementés par les Autorités canadiennes en valeurs
mobilières.

Ce règlement a été instauré à la suite du scandale Bre-X, afin de
renforcer la transparence et la crédibilité des divulgations techniques
dans le secteur minier.

Dans le cas de Bre-X, les réserves aurifères du projet Busang étaient
annoncées à 200 millions d'onces (environ 6 200 tonnes), ce qui
représentait jusqu'à 8 % des réserves mondiales d'or à l'époque.
Toutefois, il s'est avéré qu'il s'agissait d'une fraude massive : aucun
or n'était réellement présent. Les carottes de forage avaient été
falsifiées par « salage », c'est-à-dire en y ajoutant de l'or provenant
de sources externes. En 1997, l'entreprise Bre-X s'est effondrée et ses
actions ont perdu toute valeur, dans ce qui demeure l'un des plus grands
scandales boursiers de l'histoire du Canada.

Aujourd'hui, le rapport NI 43-101 fait l'objet de certaines critiques de
la part des investisseurs, car il emploie un langage technique avancé,
ce qui ne permet pas toujours à ces derniers de bien analyser le
potentiel minéral et sa valorisation boursière, actuelle ou future[^1].
Toutefois, il constitue une véritable mine d'or d'informations pour les
géoscientifiques, puisqu'il regroupe dans un même document technique des
données géographiques, historiques, géologiques et métallogéniques, en
passant par les travaux d'exploration, de forage, de préparation,
d'analyse et de sécurisation des échantillons. Il couvre également la
vérification des données, les essais de traitement du minerai,
l'estimation des ressources minérales et des réserves minières. Le
rapport traite aussi des méthodes d'exploitation et de récupération, des
études de marché et des contrats, des études environnementales, des
permis requis et des impacts sociaux sur la collectivité. Il se conclut
par un résumé des coûts d'investissement et d'exploitation, suivi d'une
analyse économique du projet.

Il est évident, à la lecture du paragraphe précédent, que le rapport
technique NI 43-101 contient une quantité considérable d'informations
portant sur tous les aspects du cycle de vie d'un projet minier. Ainsi,
la publication d'un rapport aussi complexe --- intégrant un vocabulaire
technique, une terminologie spécialisée ainsi que des données
géologiques, métallurgiques et économiques souvent abstraites --- peut
ne pas être particulièrement utile à un investisseur qui n'est pas en
mesure de comprendre pleinement ou correctement le contenu et
l'importance de ces informations.

C'est pourquoi de nombreux investisseurs font appel à des
ingénieurs-conseils en géologie et en ingénierie minière, ou encore à
des géologues indépendants, pour analyser ces rapports. Cette capacité
d'analyse et de communication technique sera au cœur de votre futur rôle
en tant qu'ingénieur.

Ce type de rapport ne se limite pas au domaine minier : on retrouve
également des rapports techniques en géotechnique, en hydrogéologie, en
conception d'infrastructures, et bien d'autres domaines encore. Dans le
cadre de ce cours, nous nous concentrerons sur l'estimation et
l'évaluation des ressources minières à l'aide de méthodes
géostatistiques. L'objectif du cours est double : apprendre à estimer
les ressources minières, mais aussi à interpréter, comprendre et rédiger
des rapports techniques.

[^1]: J'ai quelques réserves sur ce point. En réalité, les définitions
    sont encadrées par la réglementation et le langage est standardisé.
    Il est vrai qu'une première lecture d'un rapport peut en rendre la
    compréhension difficile, mais avec l'expérience et le soutien
    technique, la lecture devient accessible. Au final, tout s'apprend.



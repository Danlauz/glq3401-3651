"""Production des données pré-calculées pour les widgets paramétriques.

Chaque sous-script génère un fichier compact (JSON gzippé ou NPZ) qui sera
servi par Quarto et consommé par le widget JS correspondant.

Voir le rapport de phase 3 §4 pour le budget de performance par fichier.
"""

"""Générateurs d'exercices du manuel de géostatistique (GLQ3401/GLQ3651).

Ce sous-paquet contient des générateurs *minces* qui reproduisent les figures
et les données des exercices des chapitres, en RÉUTILISANT les modules de la
librairie ``geostat_polymtl`` (covariance, simulation, krigeage, variogramme,
économie de Lane, échantillonnage de Gy, etc.).

Organisation : un sous-module par chapitre (``chapitre_02`` à ``chapitre_13``).
Chaque fonction de génération porte un docstring reliant à l'exercice concerné
et, lorsqu'elle produit une figure, accepte un argument ``ax``/``path`` pour
permettre l'enregistrement dans le dossier ``images`` du chapitre.

Ces générateurs sont la version Python des anciens scripts MATLAB d'examen ;
ils ne réimplémentent PAS les primitives déjà disponibles dans la librairie.
"""

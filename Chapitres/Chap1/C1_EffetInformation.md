# 1.2 - Effet d'information

En géostatistique, le nombre de forages effectués joue un rôle crucial dans la qualité des estimations des ressources. C'est simple : c'est bien plus facile d'estimer une valeur précise avec un million d'observations qu'avec une seule ! Plus on dispose de données, plus nos estimations seront fidèles à la réalité géologique. Ce phénomène, c'est l'**effet d'information**.


Cependant, l'effet d'information ne dépend pas seulement de la quantité de données. Leur qualité et leur positionnement sont tout aussi cruciaux. Par exemple, ajouter un forage supplémentaire dans une petite zone déjà criblée de données n'apportera pas un gain d'information significatif. Le défi, qu'on explorera en détail plus tard, est de positionner intelligemment chaque forage pour maximiser ce gain d'information tout en limitant leur nombre. Il faut donc toujours réfléchir au meilleur endroit pour qu'un nouveau forage soit réellement utile. Après tout, un forage exploratoire coûte plusieurs milliers de dollars (environ 200 $/m) : mieux vaut éviter de forer au hasard.

## Notion d'incertitudes : Erreurs et biais

Les informations issues de nos forages sont souvent imparfaites. Elles peuvent être entachées d'erreurs : de localisation des carottes dans l'espace, d'analyse des teneurs en laboratoire, ou encore de modélisation (par exemple, l'interprétation géophysique ou l'utilisation de l'intelligence artificielle pour l'analyse en continu des carottes de forage). Résultat ? Nos observations ne correspondent pas toujours à la teneur réelle sur le terrain. Il y aura donc toujours une forme de biais ou d'erreur, ce qui nous empêche de garantir que la teneur mesurée est exactement égale à la teneur réelle.

Ainsi, nos estimations ne seront pas nécessairement fidèles à la réalité. Ajoutez à cela un manque de données, et vous avez la pleine mesure de l'effet d'information.

C'est pourquoi on récupérera toujours moins de métal avec des estimations qu'avec les vraies valeurs. Pourquoi ? Parce que nos décisions d'exploitation sont prises à partir d'estimations imparfaites, alors que l'exploitation se confronte à une réalité géologique que nous ne maîtrisons pas parfaitement. Ce principe est directement lié aux notions de faux positifs (traiter du stérile) et de faux négatifs (laisser du minerai précieux sur place).

Comme le montre la [Fig. %s](#C1_Information.png), il existe une différence cruciale entre les teneurs que nous estimons et celles réellement mesurées après l'exploitation. Nos décisions, comme l'envoi du matériel situé à droite de la teneur de coupure (ligne verticale) vers l'usine de traitement, sont basées sur ces estimations. Cependant, l'imperfection inhérente à ces dernières implique qu'une portion de stérile (visible dans la section brune du graphique) sera traitée par erreur. Cette situation engendre un coût direct : nous investissons des ressources et de l'argent dans le traitement de blocs dont la teneur réelle est nulle ou bien inférieure à ce qui avait été estimé.


```{figure} images/C1_Information.PNG
:label: C1_Information.png
:align: center 
L'effet d'information : Nos décisions sont basées sur des estimations imparfaites, ce qui entraîne des écarts entre les teneurs estimées et la réalité du minerai extrait. Nous traitons toujours des stériles (ronds bleus) et laissons sur place une partie du minerai (ronds rouges). Dans un monde idéal, la régression serait de la forme : $Y = aX + b$ avec $a = 1$ et $b = 0$ (c’est-à-dire $E(Z^*) = E(Z_{\text{vrai}})$). En pratique, la pente $a$ est inférieure à 1 et $b$ est non nul : il existe donc un biais.
```

## L'importance des méthodes rigoureuses

Il est crucial de noter que cette illustration simplifiée ne tient pas compte des biais conditionnels et des biais systématiques souvent présents dans les estimations. Nous les aborderons plus en profondeur lors de l'étude des méthodes d'estimation. Néanmoins, il est essentiel de toujours garder à l'esprit que nous récupérons inévitablement moins de minerai lorsque nos décisions sont basées sur des estimations, car celles-ci comportent une part d'incertitude et d'erreur. Puisque nos choix sont toujours ancrés dans ces estimations, il devient impératif d'utiliser des méthodes d'estimation rigoureuses, précises et sans biais pour améliorer la qualité et la fiabilité de nos estimations.


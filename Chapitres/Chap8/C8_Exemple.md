\# 5.8 Exemple numérique de krigeage



Considérons les points suivants dans le plan :



\- \\( x\_1 = (0, 1), \\quad Z\_1 = 9 \\)

\- \\( x\_2 = (0, 0), \\quad Z\_2 = 3 \\)

\- \\( x\_3 = (3, 0), \\quad Z\_3 = 4 \\)



On souhaite estimer la valeur au point \\( x\_0 = (1, 0) \\) par krigeage ordinaire.  

On suppose un variogramme sphérique avec effet de pépite = 1, palier = 11 et portée = 3.



---



\## Étape 1 : Distances entre les points



|     | \\( x\_0 \\) | \\( x\_1 \\) | \\( x\_2 \\) | \\( x\_3 \\) |

|-----|-----------|-----------|-----------|-----------|

| \\( x\_0 \\) | 0.0 | 1.4 | 1.0 | 2.0 |

| \\( x\_1 \\) | 1.4 | 0.0 | 1.0 | 3.2 |

| \\( x\_2 \\) | 1.0 | 1.0 | 0.0 | 3.0 |

| \\( x\_3 \\) | 2.0 | 3.2 | 3.0 | 0.0 |



---



\## Étape 2 : Variogramme sphérique



\\\[

\\gamma(h) =

\\begin{cases}

0 \& \\text{si } h = 0 \\\\

1 + 10 \\left\[1.5 \\frac{h}{3} - 0.5 \\left(\\frac{h}{3}\\right)^3 \\right] \& \\text{si } 0 < h \\leq 3 \\\\

11 \& \\text{si } h > 3

\\end{cases}

\\]



|     | \\( x\_0 \\) | \\( x\_1 \\) | \\( x\_2 \\) | \\( x\_3 \\) |

|-----|-----------|-----------|-----------|-----------|

| \\( x\_0 \\) | 0.00 | 7.55 | 5.81 | 9.52 |

| \\( x\_1 \\) | 7.55 | 0.00 | 5.81 | 11.0 |

| \\( x\_2 \\) | 5.81 | 5.81 | 0.00 | 11.0 |

| \\( x\_3 \\) | 9.52 | 11.0 | 11.0 | 0.00 |



---



\## Étape 3 : Matrice de covariances



\\\[

C(h) = 11 - \\gamma(h)

\\]



|     | \\( x\_0 \\) | \\( x\_1 \\) | \\( x\_2 \\) | \\( x\_3 \\) |

|-----|-----------|-----------|-----------|-----------|

| \\( x\_0 \\) | 11.00 | 3.45 | 5.19 | 1.48 |

| \\( x\_1 \\) | 3.45 | 11.00 | 5.19 | 0.00 |

| \\( x\_2 \\) | 5.19 | 5.19 | 11.00 | 0.00 |

| \\( x\_3 \\) | 1.48 | 0.00 | 0.00 | 11.00 |



---



\## Étape 4 : Système de krigeage



\\\[

\\begin{bmatrix}

11 \& 5.19 \& 5.19 \& 1 \\\\

5.19 \& 11 \& 0 \& 1 \\\\

5.19 \& 0 \& 11 \& 1 \\\\

1 \& 1 \& 1 \& 0

\\end{bmatrix}

\\begin{bmatrix}

\\lambda\_1 \\\\

\\lambda\_2 \\\\

\\lambda\_3 \\\\

\\mu

\\end{bmatrix}

=

\\begin{bmatrix}

3.45 \\\\

5.19 \\\\

1.48 \\\\

1

\\end{bmatrix}

\\]



---



\## Étape 5 : Solution



\\\[

\\lambda\_1 = 0.21, \\quad \\lambda\_2 = 0.51, \\quad \\lambda\_3 = 0.28, \\quad \\mu = -1.5

\\]



---



\## Étape 6 : Estimation



\\\[

Z^\*(x\_0) = 0.21 \\times 9 + 0.51 \\times 3 + 0.28 \\times 4 = 4.54

\\]



---



\## Étape 7 : Variance de krigeage



\\\[

\\sigma^2\_{KO} = k - \\lambda' \\cdot k\_0 = 11 - 3.32 = 7.68

\\]



où \\( k = 11 \\), et \\( \\lambda' \\cdot k\_0 = 3.32 \\).


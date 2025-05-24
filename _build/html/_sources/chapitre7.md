# Chapitre 1 : Parabole interactive

Voici une parabole que vous pouvez modifier en temps réel grâce aux curseurs.

```{code-cell}
import numpy as np
import matplotlib.pyplot as plt
import ipywidgets as widgets
from IPython.display import display

def plot_parabola(a, b, c):
    x = np.linspace(-10, 10, 400)
    y = a * x**2 + b * x + c
    plt.figure(figsize=(6,4))
    plt.plot(x, y, label=f'y = {a}x² + {b}x + {c}')
    plt.ylim(-10, 30)
    plt.grid(True)
    plt.legend()
    plt.show()

widgets.interact(plot_parabola,
                 a=widgets.FloatSlider(value=1, min=-5, max=5, step=0.1),
                 b=widgets.FloatSlider(value=0, min=-10, max=10, step=0.1),
                 c=widgets.FloatSlider(value=0, min=-10, max=10, step=0.1));

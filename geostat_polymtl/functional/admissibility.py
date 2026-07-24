import numpy as np
import matplotlib.pyplot as plt
from geostat_polymtl.functional.plot import plot_covariance_matrix

def validate_symmetry(K, name):
    """Vérifie la symétrie d'une matrice."""
    if np.allclose(K, K.T):
        print(f"✓ {name} est SYMÉTRIQUE")
        return True
    else:
        print(f"✗ {name} N'EST PAS SYMÉTRIQUE!")
        print(f"  Max diff: {np.max(np.abs(K - K.T)):.6e}")
        return False

def validate_positive_definite(K, name):
    """Vérifie si une matrice est semi-définie positive."""
    try:
        eigenvalues = np.linalg.eigvalsh(K)
        min_eig = np.min(eigenvalues)
        if min_eig >= -1e-10:
            print(f"✓ {name} est SEMI-DÉFINIE POSITIVE")
            print(f"  Valeurs propres: min={min_eig:.6e}, max={np.max(eigenvalues):.6e}")
            return True
        else:
            print(f"✗ {name} N'EST PAS semi-définie positive!")
            print(f"  Valeur propre minimale: {min_eig:.6e}")
            return False
    except np.linalg.LinAlgError:
        print(f"✗ Erreur lors du calcul des valeurs propres de {name}")
        return False

def validate_covariance_properties(K, name, plot=True):
    """Valide toutes les propriétés d'une matrice de covariance."""
    print(f"\n{'='*70}")
    print(f"Validation de {name}")
    print(f"{'='*70}")
    print(f"Shape: {K.shape}")
    
    # Symétrie
    sym = validate_symmetry(K, name)
    
    # Positivité
    pos = validate_positive_definite(K, name)
    
    # Diagonale
    diag = np.diag(K)
    if np.all(diag >= -1e-10):
        print(f"✓ Tous les éléments diagonaux sont positifs")
        print(f"  Range: [{diag.min():.4f}, {diag.max():.4f}]")
    else:
        print(f"✗ Certains éléments diagonaux sont négatifs!")
    
    # Visualisation
    if plot:
        plot_covariance_matrix(K, f"Matrice de covariance: {name}")
    
    return sym and pos
import numpy as np
try:
    import cupy as cp
except ImportError:  # pragma: no cover - dependance GPU optionnelle (CPU ok)
    cp = None
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D  # required for 3D plots
from matplotlib import cm

def plot_covariance_matrix(K, title, figsize=(8, 7)):
    """Visualise une matrice de covariance."""
    fig, ax = plt.subplots(figsize=figsize)
    im = ax.imshow(K, cmap='RdBu_r', aspect='auto')
    ax.set_title(title, fontsize=14, fontweight='bold')
    plt.colorbar(im, ax=ax, label='Covariance')
    
    # Ajouter les valeurs dans les cellules si pas trop grand
    if K.shape[0] <= 12:
        for i in range(K.shape[0]):
            for j in range(K.shape[1]):
                text = ax.text(j, i, f'{K[i, j]:.2f}',
                             ha="center", va="center",
                             color="black" if abs(K[i,j]) < np.max(np.abs(K))/2 else "white",
                             fontsize=8)
    
    ax.set_xlabel('Variable × Point', fontsize=11)
    ax.set_ylabel('Variable × Point', fontsize=11)
    plt.tight_layout()
    plt.show()

def plot_simulation_1d(datasim, title="1D Simulation"):
    """
    Plot a 1D simulation result, works if datasim has shape (nx, nbsimul, nvar)
    or (nx, nbsimul) when nvar=1.
    """
    # Ensure datasim has 3 dims
    if datasim.ndim == 2:
        datasim = datasim[:, :, np.newaxis]

    print(datasim.shape)
    nx, nbsimul, nvar = datasim.shape
    x = np.arange(nx)

    fig, axes = plt.subplots(nvar, 1, figsize=(8, 3 * nvar), sharex=True)
    if nvar == 1:
        axes = [axes]

    for k in range(nvar):
        ax = axes[k]
        for j in range(nbsimul):
            ax.plot(x, datasim[:, j, k], color="0.5", linewidth=1)

        if nbsimul > 1:
            avg_sim = np.mean(datasim[:, :, k], axis=1)
            ax.plot(x, avg_sim, color="green", linewidth=2, label="Average")

        ax.set_title(f"{title} - Var {k+1}")
        ax.set_ylabel("Value")
        ax.grid(True, linestyle="--", alpha=0.5)
        if nbsimul > 1:
            ax.legend()

    axes[-1].set_xlabel("X")
    plt.tight_layout()
    plt.show()


def plot_simulation_2d(datasim, nx, ny, title="2D Simulation"):
    """
    Plot 2D simulation(s), works if datasim has shape (nx*ny, nbsimul, nvar)
    or (nx*ny, nbsimul) when nvar=1.
    """
    if datasim.ndim == 2:
        datasim = datasim[:, :, np.newaxis]

    npoints, nbsimul, nvar = datasim.shape
    assert npoints == nx * ny, "datasim size does not match nx*ny"

    for k in range(nvar):
        fig, axes = plt.subplots(2, 2, figsize=(12, 10))
        axes = axes.flatten()

        plots_to_show = [datasim[:, 0, k]]
        if nbsimul > 1:
            plots_to_show.extend([datasim[:, 1, k],
                                  np.mean(datasim[:, :, k], axis=1),
                                  np.var(datasim[:, :, k], axis=1)])

        titles = ["Sim 1"]
        if nbsimul > 1:
            titles.extend(["Sim 2", "Mean", "Variance"])

        cmaps = ["viridis", "viridis", "viridis", "magma"]

        for i, field in enumerate(plots_to_show):
            field2d = field.reshape((ny, nx))
            im = axes[i].imshow(field2d, cmap=cmaps[i], origin="lower", aspect="auto")
            axes[i].set_title(f"{title} - Var {k+1} ({titles[i]})")
            axes[i].set_xlabel("X")
            axes[i].set_ylabel("Y")
            fig.colorbar(im, ax=axes[i])

        for ax in axes[len(plots_to_show):]:
            ax.axis("off")

        plt.tight_layout()
        plt.show()


def plot_simulation_3d(datasim, nx, ny, nz, title="3D Simulation", var_idx=0):
    """
    Plot 3D simulation(s), works if datasim has shape (nx*ny*nz, nbsimul, nvar)
    or (nx*ny*nz, nbsimul) when nvar=1.
    """
    if datasim.ndim == 2:
        datasim = datasim[:, :, np.newaxis]

    npoints, nbsimul, nvar = datasim.shape
    assert npoints == nx * ny * nz, "datasim size does not match nx*ny*nz"

    if nbsimul == 1:
        vol = datasim[:, 0, var_idx].reshape((nx, ny, nz))
        filled = np.ones_like(vol, dtype=bool)
        norm = (vol - vol.min()) / (vol.max() - vol.min())
        colors = cm.viridis(norm)

        fig = plt.figure(figsize=(8, 6))
        ax = fig.add_subplot(111, projection='3d')
        ax.voxels(filled, facecolors=colors, edgecolor='k', linewidth=0.1)
        ax.set_title(f"{title} - Sim 1")
        ax.set_xlabel("X")
        ax.set_ylabel("Y")
        ax.set_zlabel("Z")
        plt.show()
    else:
        volumes = [datasim[:, 0, var_idx].reshape((nx, ny, nz)),
                   datasim[:, 1, var_idx].reshape((nx, ny, nz)) if nbsimul > 1 else np.zeros((nx, ny, nz)),
                   np.mean(datasim[:, :, var_idx], axis=1).reshape((nx, ny, nz)),
                   np.var(datasim[:, :, var_idx], axis=1).reshape((nx, ny, nz))]

        titles = ["Sim 1", "Sim 2", "Mean", "Variance"]
        cmaps = ["viridis", "viridis", "viridis", "magma"]

        fig, axes = plt.subplots(2, 2, figsize=(12, 10), subplot_kw={"projection": "3d"})
        axes = axes.flatten()

        for i, vol in enumerate(volumes):
            ax = axes[i]
            filled = np.ones_like(vol, dtype=bool)
            norm = (vol - vol.min()) / (vol.max() - vol.min())
            colors = cm.get_cmap(cmaps[i])(norm)
            ax.voxels(filled, facecolors=colors, edgecolor='k', linewidth=0.1)
            ax.set_title(f"{title} - {titles[i]}")
            ax.set_xlabel("X")
            ax.set_ylabel("Y")
            ax.set_zlabel("Z")

        plt.tight_layout()
        plt.show()

def plot_varioFFT_ndir(gh_ndir, nh_ndir, lag_ndir, i=0, j=0):
    """
    Plot directional experimental variograms from varioFFT_ndir output.

    Parameters
    ----------
    gh_ndir : list of lists
        Directional gamma values (nvar x nvar), can be CuPy arrays
    nh_ndir : list of lists
        Number of pairs (nvar x nvar), can be CuPy arrays
    lag_ndir : list of lists
        Lag distances (nvar x nvar), can be CuPy arrays
    i, j : int
        Indices of variables (default 0,0 for direct variogram)
    """

    # Ensure everything is NumPy
    gh = np.array([[gh_ndir[m][n].get() if isinstance(gh_ndir[m][n], cp.ndarray) else np.array(gh_ndir[m][n])
                    for n in range(len(gh_ndir[0]))] for m in range(len(gh_ndir))])
    nh = np.array([[nh_ndir[m][n].get() if isinstance(nh_ndir[m][n], cp.ndarray) else np.array(nh_ndir[m][n])
                    for n in range(len(nh_ndir[0]))] for m in range(len(nh_ndir))])
    lag = np.array([[lag_ndir[m][n].get() if isinstance(lag_ndir[m][n], cp.ndarray) else np.array(lag_ndir[m][n])
                     for n in range(len(lag_ndir[0]))] for m in range(len(lag_ndir))])

    n_dist, n_ang = gh[i][j].shape

    if n_ang > 9:
        raise ValueError("❌ This plotting function only handles up to 9 directions.")

    # Subplot arrangement
    if n_ang == 1:
        nrows, ncols = 1, 1
    elif n_ang == 2:
        nrows, ncols = 2, 1
    elif n_ang <= 4:
        nrows, ncols = 2, 2
    else:  # up to 9
        nrows, ncols = 3, 3

    fig, axes = plt.subplots(nrows, ncols, figsize=(5*ncols, 4*nrows))
    axes = np.atleast_1d(axes).flatten()

    for kk in range(n_ang):
        ax = axes[kk]
        xvals = lag[i][j][:, kk]
        yvals = gh[i][j][:, kk]
        nhvals = nh[i][j][:, kk]

        # Scatter as crosses
        ax.scatter(xvals, yvals, marker="x", color="blue")

        # Annotate with number of pairs
        for xd, yd, nhv in zip(xvals, yvals, nhvals):
            if nhv > 0:
                ax.text(xd, yd, f"{int(nhv)}", fontsize=8,
                        ha="left", va="bottom")

        ax.set_title(f"Direction {kk+1}")
        ax.set_xlabel("Lag distance")
        ax.set_ylabel("γ(h)")
        ax.grid(True, linestyle="--", alpha=0.5)

    # Hide unused axes if any
    for k in range(n_ang, len(axes)):
        axes[k].axis("off")

    plt.tight_layout()
    plt.show()


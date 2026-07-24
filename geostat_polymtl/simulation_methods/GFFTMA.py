import numpy as np
import scipy.fft
from geostat_polymtl.cov_func.covar_nu import covar_nu as covar

# Try to import CuPy and its SciPy extension for FFT
try:
    import cupy as cp
    import cupyx.scipy.fft as cp_fft
    has_cupy = True
except ImportError:
    has_cupy = False
    cp = None        # evite un NameError dans `if xp == cp:` en mode CPU
    cp_fft = None

def GFFTMA(model, c, nu, seed, nbsimul, nx, dx, ny=None, dy=None, nz=None, dz=None, device='cpu'):
    """GFFTMA: FFT-MA simulation 1D/2D/3D, multivariate (LMC), CPU/GPU.

    Original author: D. Marcotte (MATLAB), Python translation: D. Lauzon.
    """
    if device.lower() == 'gpu' and has_cupy:
        xp = cp; fft_mod = cp_fft
    else:
        xp = np; fft_mod = scipy.fft

    if ny is None and nz is None:
        cas = 1; ny, nz = 1, 1; dy, dz = 1, 1
    elif nz is None:
        cas = 2; nz, dz = 1, 1
    else:
        cas = 3

    xp.random.seed(int(seed))
    nvar = len(model)

    max_ranges = xp.zeros(3, dtype=xp.float32)
    dim_sim = 3
    for i in range(nvar):
        for j in range(nvar):
            m_all = model[i][j]
            if m_all is None: continue
            m_all = xp.asarray(m_all, dtype=xp.float32)
            if m_all.ndim == 1: m_all = m_all.reshape(1, -1)
            for row in m_all:
                model_type = int(row[0])
                if model_type == 1: continue
                n_ranges = min(len(row) - 1, dim_sim)
                for d in range(n_ranges):
                    max_ranges[d] = xp.maximum(max_ranges[d], row[d + 1])

    Nx = int(xp.ceil(2 * max_ranges[0] / dx)) + nx
    Ny = int(xp.ceil(2 * max_ranges[1] / dy)) + ny if cas >= 2 else 1
    Nz = int(xp.ceil(2 * max_ranges[2] / dz)) + nz if cas == 3 else 1
    Nx2, Ny2, Nz2 = Nx // 2, Ny // 2, Nz // 2

    if cas == 1:
        x0 = xp.arange(-Nx2 * dx, Nx2 * dx, dx).reshape(-1, 1)
        x0r = xp.zeros((1, 1)); shape = (Nx,)
    elif cas == 2:
        x = xp.arange(-Nx2 * dx, Nx2 * dx, dx)
        y = xp.arange(-Ny2 * dy, Ny2 * dy, dy)
        xx, yy = xp.meshgrid(x, y, indexing="ij")
        x0 = xp.column_stack([xx.ravel(), yy.ravel()])
        x0r = xp.zeros((1, 2)); shape = (Nx, Ny)
    else:
        x = xp.arange(-Nx2 * dx, Nx2 * dx, dx)
        y = xp.arange(-Ny2 * dy, Ny2 * dy, dy)
        z = xp.arange(-Nz2 * dz, Nz2 * dz, dz)
        xx, yy, zz = xp.meshgrid(x, y, z, indexing="ij")
        x0 = xp.column_stack([xx.ravel(), yy.ravel(), zz.ravel()])
        x0r = xp.zeros((1, 3)); shape = (Nx, Ny, Nz)

    G = computeS(x0, x0r, model, c, nu, shape, xp=xp, fft_mod=fft_mod)
    datasim = xp.zeros((nx * ny * nz, nbsimul, nvar), dtype=xp.float32)
    U = [None] * nvar

    for isimul in range(nbsimul):
        GU = [xp.zeros(G[0][0].shape, dtype=xp.complex64) for _ in range(nvar)]
        for j in range(nvar):
            U[j] = fft_mod.fftn(xp.random.randn(*G[0][0].shape))
            for i in range(nvar):
                GU[i] += G[i][j] * U[j]
        for j in range(nvar):
            datasimTemp = xp.real(fft_mod.ifftn(GU[j]))
            if cas == 1:
                datasim[:, isimul, j] = datasimTemp[:nx].ravel()
            elif cas == 2:
                datasim[:, isimul, j] = datasimTemp[:nx, :ny].ravel()
            else:
                datasim[:, isimul, j] = datasimTemp[:nx, :ny, :nz].ravel()

    if xp == cp:
        datasim = cp.asnumpy(datasim)
    return datasim, G, U


def computeS(x0, x0r, model, c, nu, shape, xp, fft_mod):
    """Densites spectrales + decomposition spectrale pour la simulation."""
    nvar = len(model)
    S = [[None for _ in range(nvar)] for _ in range(nvar)]
    for i in range(nvar):
        for j in range(i + 1):
            cc = covar(x0, x0r, model[i][j], c[i][j], nu[i][j], xp=xp)
            cc_reshaped = cc.reshape(shape)
            cc_shifted = fft_mod.fftshift(cc_reshaped)
            S[i][j] = fft_mod.fftn(cc_shifted).real
            S[j][i] = S[i][j]
    G = chol_dec(S, xp=xp)
    return G


def chol_dec(S, xp):
    """Decomposition « Cholesky spectrale » pour 1D/2D/3D."""
    nvar = len(S)
    shape = S[0][0].shape
    npoints = int(xp.prod(xp.array(shape)))

    mask = xp.zeros(npoints, dtype=bool)
    for i in range(nvar):
        s_flat = S[i][i].ravel()
        if s_flat.size > 0:
            mask |= (s_flat > xp.max(s_flat) * 1e-6)

    id_flat = xp.where(mask)[0]
    num_sig = len(id_flat)
    if num_sig == 0:
        return [[xp.zeros(shape, dtype=xp.float32) for _ in range(nvar)] for _ in range(nvar)]

    m = xp.zeros((nvar, nvar, num_sig), dtype=xp.float32)
    for i1 in range(nvar):
        for i2 in range(nvar):
            vals = S[i1][i2].ravel()
            m[i1, i2, :] = vals[id_flat]

    m_batched = xp.moveaxis(m, -1, 0)
    eigvals, eigvecs = xp.linalg.eigh(m_batched)
    eigvals = xp.maximum(eigvals, 0)
    sqrt_eigvals = xp.sqrt(eigvals)
    V_sqrtD = eigvecs * sqrt_eigvals[:, None, :]
    temp_G = V_sqrtD @ xp.transpose(eigvecs, (0, 2, 1))
    G_matrices = xp.moveaxis(temp_G, 0, -1)

    G = [[xp.zeros(shape, dtype=xp.float32) for _ in range(nvar)] for _ in range(nvar)]
    for i1 in range(nvar):
        for i2 in range(nvar):
            temp = xp.zeros(npoints, dtype=xp.float32)
            temp[id_flat] = G_matrices[i1, i2, :]
            G[i1][i2] = temp.reshape(shape)
    return G

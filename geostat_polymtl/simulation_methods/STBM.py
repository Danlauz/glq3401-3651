import numpy as np
from scipy.integrate import quad
from scipy.special import jv, kv as besselk, gamma

try:
    import cupy as cp
    has_cupy = True
except ImportError:
    cp = None
    has_cupy = False

def STBM(x0, model, c, nu, nbsim, nl, seed=0, device='cpu'):
    """
    Spectral Turning Bands Method (vectorized, CPU/GPU option).

    Parameters
    ----------
    x0 : ndarray (n_points x dim)
        Input grid points.
    model : ndarray
        Covariance model.
    c : ndarray
        Sills (variance contributions) for each model.
    nu : ndarray
        Shape parameter
    nbsim : int
        Number of realizations.
    nl : int
        Number of lines (bands) used.
    seed : int
        Random seed.
    device : str
        'cpu' (default) or 'gpu'
        
    Returns
    -------
    Z : ndarray (n_points x nbsim)
        Simulated Gaussian random field.
    """
    # ---------------------------------------------
    # Choose backend: NumPy (CPU) or CuPy (GPU)
    # ---------------------------------------------
    xp = np
    if device.lower() == 'gpu':
        if not has_cupy:
            raise ImportError("CuPy not installed for GPU usage.")
        xp = cp

    # Embed 1D or 2D into 3D
    n_points, dim = x0.shape
    if dim == 1:
        x0 = xp.hstack((x0, xp.zeros((n_points, 2))))
    elif dim == 2:
        x0 = xp.hstack((x0, xp.zeros((n_points, 1))))

    # Spectral density
    F1, s_list, rot_list, cx_list = densspec(x0, model, c, nu, xp=xp)

    Z = xp.zeros((n_points, nbsim))

    if device.lower() == 'cpu':
        # CPU: parallelize over nbsim
        def run_one_sim(j):
            rng = np.random.RandomState(seed + j)
            Zj = np.zeros(n_points)
            for k in range(len(F1)):
                p = rng.rand(nl)
                ul1 = np.interp(p, F1[k], s_list[k])
                U = 2 * np.pi * rng.rand(nl)
                z = van_corput(nl)  # CPU version returns np array
                z1 = z * ul1[:, np.newaxis]

                rotated = cx_list[k] @ rot_list[k].T
                contrib = np.cos(rotated @ z1.T + U).sum(axis=1)
                Zj += np.sqrt(c[k]) * contrib
            Zj *= np.sqrt(2 / nl)
            return Zj

        # Run in parallel using joblib (dependance optionnelle, importee ici
        # seulement : STBM() est la seule fonction de la librairie qui en a besoin).
        try:
            from joblib import Parallel, delayed
        except ImportError as exc:
            raise ImportError(
                "STBM (device='cpu') necessite le paquet optionnel 'joblib' : "
                "pip install joblib"
            ) from exc
        results = Parallel(n_jobs=-1)(delayed(run_one_sim)(j) for j in range(nbsim))
        Z = np.column_stack(results)

    else:
        # GPU: keep original vectorized loop
        for j in range(nbsim):
            rng = xp.random.RandomState(seed + j)
            for k in range(len(F1)):
                p = rng.rand(nl)
                ul1 = xp.interp(p, F1[k], s_list[k])
                U = 2 * xp.pi * rng.rand(nl)
                z = van_corput(nl, xp=xp)  # GPU version
                z1 = z * ul1[:, xp.newaxis]

                rotated = cx_list[k] @ rot_list[k].T
                Z[:, j] += xp.sqrt(cp.asarray(c[k])) * xp.cos(rotated @ z1.T + U).sum(axis=1)
            Z[:, j] *= xp.sqrt(2 / nl)
        Z = cp.asnumpy(Z)

    return Z

def densspec(x0, model, c, vnu, xp=np):
    """
    [F1, s, R, x0rot] = densspec(x0, model, c)

    Compute 1D isotropic spectral density functions F1(s) from 3D isotropic
    covariance models. Similar structure as 'covar' function.

    Parameters
    ----------
    x0 : (n,d) array
        Input points
    model : (r,p) array
        Model specification (same style as covar)
    c : (rp,p) array
        Covariance coefficients
        
    vnu : (rp,p) array
        Shape parameter
    Returns
    -------
    F1 : list of arrays
        Normalized cumulative spectra
    s : list of arrays
        Frequency vectors
    R : list of arrays
        Rotation matrices
    x0rot : list of arrays
        Rotated coordinates
    """

    # -----------------------------------------------------------------
    # Define 3D isotropic spectral densities f3(s) (C=1, normalized)
    # -----------------------------------------------------------------
    Gam = [
        # 1 - Nugget
        lambda s: xp.ones_like(s),

        # 2 - Exponential
        lambda s: 1.0 / (xp.pi**2 * (1 + s**2)**2),

        # 3 - Gaussian
        lambda s: xp.exp(-s**2 / 4) / (8 * xp.pi**1.5),

        # 4 - Spherical
        lambda s: (3.0 / (4*xp.pi)) * (jv(1.5, s/2)**2) / (s**3),

        # 5 - Cubic
        lambda s: ((s <= 0.004) * 0.0014776 +
                   (s > 0.004) * (210.0 / (xp.pi**2 * s**10)) *
                   (6*s*xp.cos(s/2) + (s**2 - 12)*xp.sin(s/2))**2),

        # 6 - Penta
        lambda s: ((s <= 0.05) * 0.0009951 +
                   (s > 0.05) * (27720 / (xp.pi**2 * s**14)) *
                   ((s**3 - 60*s) * xp.cos(s/2) + (120 - 12*s**2) * xp.sin(s/2))**2),

        # 7 - Cauchy with shape parameter nu
        lambda s, nu: besselk(3/2-nu, s) * s**(nu-3/2) / (xp.pi**1.5 * 2**(nu+1/2)),

        # 8 - Matern (Bessel K) with shape parameter nu
        lambda s, nu: gamma(nu+3/2) / (xp.pi**(3/2) * gamma(nu) * (s**2 + 1)**(nu+3/2)),

        # 9 - Linear (N/A analytically in spectrum form)
        lambda s: xp.nan*xp.ones_like(s),

        # 10 - Thin plate spline (N/A analytically in spectrum form)
        lambda s: xp.nan*xp.ones_like(s),

        # 11 - Hole Effect (sinus) (N/A analytically in spectrum form)
        lambda s: xp.nan*xp.ones_like(s),

        # 12 - Hole Effect (cosinus) (N/A analytically in spectrum form)
        lambda s: xp.nan*xp.ones_like(s),

        # 13 - Christakos (N/A analytically in spectrum form)
        lambda s: xp.nan*xp.ones_like(s),

        # 14 - Wendland 0 (no parameter nu)
        lambda s: ((s <= 0.002) * 0.0016886 +
                   (s > 0.002) * (2*s - 3*xp.sin(s) + s*xp.cos(s)) / (xp.pi**2 * s**5)),

        # 15 - Wendland 1 (no parameter nu)
        lambda s: ((s <= 0.1) * 0.0012062 +
                   (s > 0.1) * (60.0 * (24*xp.cos(s) - s**2*xp.cos(s) +
                                        9*s*xp.sin(s) + 4*s**2 - 24)) / (xp.pi**2 * s**8)),

        # 16 - Wendland 2 (no parameter nu)
        lambda s: ((s <= 0.04) * 0.000818757 +
                   (s > 0.04) * (6720 * (8*s*(s**2 - 24) +
                                         9*(35 - 2*s**2)*xp.sin(s) +
                                         s*(s**2 - 123)*xp.cos(s))) / (xp.pi**2 * s**11)),

        # 17 - Bohman covariance (N/A analytically in spectrum form)
        lambda s: xp.nan*xp.ones_like(s),
    
        # 18 - Gaussian-Cosinus (b=2*pi)
        lambda s: (xp.exp(-(2-s)**2 / 4) + xp.exp(-(2+s)**2 / 4)) / (16 * xp.pi**(3/2)),
    ]


    freqMax = [
        10,    # 1 - Nugget
        50,    # 2 - Exponential
        7,     # 3 - Gaussian
        100,   # 4 - Spherical
        50,    # 5 - Cubic
        40,    # 6 - Penta
        50,    # 7 - Cauchy (with nu)
        100,   # 8 - Matern (with nu)
        xp.nan,# 9 - Linear (N/A)
        xp.nan,# 10 - Thin plate spline (N/A)
        xp.nan,# 11 - Hole Effect sinus (N/A)
        xp.nan,# 12 - Hole Effect cosinus (N/A)
        xp.nan,# 13 - Christakos
        50,    # 14 - Wendland 0
        30,    # 15 - Wendland 1
        40,    # 16 - Wendland 2
        xp.nan,# 17 - Bohman
        11,    # 18 - Gaussian-Cosinus
    ]

    # Constants
    n, d = x0.shape
    rp, p = c.shape
    r = rp // p
    nm = model.shape[1]

    if nm > 2:
        model[:, 1:1+d] = xp.maximum(model[:, 1:1+d], 100*xp.finfo(float).eps)
    else:
        model[:, 1] = max(model[:, 1], 100*xp.finfo(float).eps)

    F1, s_list, R, x0rot = [], [], [], []

    for i in range(r):
        # Transform coordinates
        x0roti, Ri = trans(x0, model, i, xp=xp)
        x0rot.append(x0roti)
        R.append(Ri)

        # Frequency vector
        si = xp.logspace(-4, 2, 2000)

        f3 = Gam[int(model[i,0]) - 1]

        if f3.__code__.co_argcount == 2:
            nu = vnu[i,0]
            def f1_quad(x):
                return (4*xp.pi**2 * x**2) * f3(x, nu)
        else:
            def f1_quad(x):
                return (4*xp.pi**2 * x**2) * f3(x)

        # Numerical integration
        F1i = xp.zeros(len(si))
        # CPU-only: use quad for each sj
        if xp == np:
            for j, sj in enumerate(si):
                F1i[j], _ = quad(f1_quad, np.finfo(float).eps, sj)
            
            F1i /= F1i[-1]  # normalize

            # Store results
            s_list.append(xp.insert(si, 0, 0))
            F1.append(xp.insert(F1i, 0, 0))
        else:
            # GPU: approximate cumulative integral via trapezoid
            si = cp.asnumpy(si)
            fval = f1_quad(cp.asnumpy(si))
            F1i = np.cumsum((fval[1:] + fval[:-1])/2 * np.diff(si))
            F1i = np.insert(F1i, 0, 0)

            F1i /= F1i[-1]  # normalize

            # Store results
            s_list.append(cp.asarray(np.insert(si, 0, 0)))
            F1.append(cp.asarray(np.insert(F1i, 0, 0)))

    return F1, s_list, R, x0rot


def trans(cx, model, im=0, xp=np):
    """
    Transform coordinates into 3D with anisotropy and rotation.
    Handles input in 1D, 2D, or 3D by padding up to 3D.
    Handles model in (1x2), (1x4), or (1x7), padding to (1x7).
    
    Parameters
    ----------
    cx : (n_points, d) array
        Input coordinates (d=1,2,3)
    model : (n_models, m) array
        Covariance model (m=2,4,7)
    im : int
        Index of the model
    xp : module
        np or cupy
    
    Returns
    -------
    cx_trans : (n_points, 3)
        Transformed 3D coordinates
    rot : (3,3)
        Rotation matrix
    """
    # ---- Ensure coordinates are 3D ----
    n_points, d = cx.shape
    if d < 3:
        pad_width = ((0, 0), (0, 3 - d))
        cx = xp.pad(cx, pad_width, mode="constant")

    # ---- Ensure model row is 1x7 ----
    m = model.shape[1]
    row = model[im]

    if m == 2:
        # [range_x] -> pad as [model type, range_x, range_x, range_x, 0, 0, 0]
        row7 = xp.zeros(7)
        row7[0] = row[0]  # isotropic in 3D
        row7[1:4] = row[1]  # isotropic in 3D
    elif m == 4:
        # [model_type, range_x, range_y, angle] (2D)
        # becomes [model_type, range_x, range_y, range_x, angle, 0, 0]
        row7 = xp.zeros(7)
        row7[0] = row[0]   # copy model type
        row7[1] = row[1]   # copy range_x
        row7[2] = row[2]   # copy range_y 
        row7[3] = row[1]   # copy range_x for range_z 
        row7[4] = row[3]   # angle from input
    elif m == 7:
        row7 = row
    else:
        raise ValueError(f"Unsupported model format with {m} columns")

    # Replace model row
    row7 = xp.asarray(row7)

    # ---- Extract ranges ----
    ranges = row7[1:4]
    ranges = xp.maximum(ranges, 1e-12)

    # ---- Extract rotation angles ----
    angx, angy, angz = row7[4:7]

    # Rotation matrices
    cangx, sangx = xp.cos(angx * xp.pi / 180), xp.sin(angx * xp.pi / 180)
    cangy, sangy = xp.cos(angy * xp.pi / 180), xp.sin(angy * xp.pi / 180)
    cangz, sangz = xp.cos(angz * xp.pi / 180), xp.sin(angz * xp.pi / 180)

    one = xp.array(1.0)
    zero = xp.array(0.0)

    rotx = xp.array([[one, zero, zero],
                 [zero, cangx, -sangx],
                 [zero, sangx,  cangx]])

    roty = xp.array([[cangy, zero, sangy],
                 [zero,  one,  zero],
                 [-sangy, zero, cangy]])

    rotz = xp.array([[cangz, -sangz, zero],
                 [sangz,  cangz, zero],
                 [zero,    zero,  one]])


    # Full rotation matrix
    rot = rotz @ roty @ rotx

    # ---- Apply transform ----
    cx_rot = cx @ rot.T
    t = xp.diag(ranges)
    cx_trans = xp.linalg.solve(t, cx_rot.T).T

    return cx_trans, rot

def van_corput(nbline, xp=np):
    """
    Generate Van der Corput sequence mapped to 3D unit sphere using CPU/GPU.
    """
    def base(n, b):
        kmax = int(xp.floor(xp.log(n)/xp.log(b)))
        y = xp.zeros(kmax+1)
        n2 = n
        for k in range(kmax, -1, -1):
            y[k] = xp.floor(n2 / b**k)
            n2 = n2 % b**k
        return y

    u = xp.zeros((nbline, 2))
    for i in range(1, nbline+1):
        a2 = base(i, 2)
        a3 = base(i, 3)
        u[i-1, 0] = xp.sum(a2 / 2**xp.arange(1, a2.size+1))
        u[i-1, 1] = xp.sum(a3 / 3**xp.arange(1, a3.size+1))

    x = xp.cos(2*xp.pi*u[:,0]) * xp.sqrt(1 - u[:,1]**2)
    y = xp.sin(2*xp.pi*u[:,0]) * xp.sqrt(1 - u[:,1]**2)
    z = u[:,1]
    return xp.column_stack((x, y, z))

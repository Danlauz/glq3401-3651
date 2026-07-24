# covar.py
import numpy as np
import scipy.special as sp_special
from geostat_polymtl.functional.helper import trans

# CuPy (GPU) est optionnel : sur une machine sans GPU/cupy, on bascule sur CPU.
# `cp` et `cpx_special` ne sont utilises que dans la branche GPU (xp is not np),
# donc None est sans effet en mode CPU. Meme garde que dans GFFTMA.py.
try:
    import cupy as cp
    import cupyx.scipy.special as cpx_special
except ImportError:  # pragma: no cover - dependances GPU absentes
    cp = None
    cpx_special = None

# Small epsilon to avoid division by zero or log(0)
eps = 1e-12


def covar(x, x0, model, c, xp=np):
    """
    Compute covariance matrix between two sets of points using multiple covariance structures.
    Works with NumPy (CPU) or CuPy (GPU).
    """
    # Pick backend special functions
    if xp is np:
        gamma = sp_special.gamma
        besselk = sp_special.kv
    else:
        gamma = cpx_special.gamma
        besselk = cpx_special.kv

    # Ensure arrays are xp type
    x = xp.atleast_2d(xp.array(x, dtype=xp.float32))
    x0 = xp.atleast_2d(xp.array(x0, dtype=xp.float32))
    model = xp.array(model, dtype=xp.float32)
    c = xp.array(c, dtype=xp.float32)

    n1, d = x.shape
    n2, _ = x0.shape
    rp, p = c.shape
    r = rp // p
    nm = model.shape[1]

    # Avoid zero ranges
    if nm > 2:
        model[:,1:1+d] = xp.maximum(model[:,1:1+d], 100*eps)
    else:
        model[:,1] = xp.maximum(model[:,1], 100*eps)

    # Covariance functions
    cov_funcs = {
        1: lambda h: (h == 0),                             # nugget
        2: lambda h: xp.exp(-h),                           # exponential
        3: lambda h: xp.exp(-h**2),                        # gaussian
        4: lambda h: 1-(1.5*xp.minimum(h,1)-0.5*xp.minimum(h,1)**3), # spherical
        5: lambda h: 1-xp.minimum(h,1),                    # linear
        6: lambda h: 1-(7*xp.minimum(h,1)**2-8.75*xp.minimum(h,1)**3+3.5*xp.minimum(h,1)**5-0.75*xp.minimum(h,1)**7), # cubic
        7: lambda h: (h**2)*xp.log(xp.maximum(h, eps)),    # thin-plate spline
        8: lambda h: (h**2+1)**(-0.5),                     # gravimetric (Cauchy b=0.5)
        9: lambda h: (h**2+1)**(-1.5),                     # magnetic (Cauchy b=1.5)
        10: lambda h: xp.sin(xp.maximum(h, eps)*2*xp.pi)/xp.maximum(h, eps)/(2*xp.pi), # sinusoidal hole
        11: lambda h: xp.cos(h*2*xp.pi),                   # cosinusoidal hole
        12: lambda h: 1-h**2/(1+h**2),                     # Christakos
        13: lambda h: (1-xp.minimum(h,1))**4*(1+4*h),      # Wendland_1
        14: lambda h: 1-22/3*xp.minimum(h,1)**2 + 33*xp.minimum(h,1)**4 - 77/2*xp.minimum(h,1)**5 + 33/2*xp.minimum(h,1)**7 - 11/2*xp.minimum(h,1)**9 + 5/6*xp.minimum(h,1)**11, # penta
        15: lambda h: 1/(gamma(1)*2**0) * xp.maximum(h, eps) * besselk(1, xp.maximum(h, eps)), # Matern nu=1
        16: lambda h: 1/(gamma(1.5)*2**0.5) * xp.maximum(h, eps)**1.5 * besselk(1.5, xp.maximum(h, eps)), # Matern nu=3/2
        17: lambda h: 1-(28/3)*xp.minimum(h,1)**2 + 70*xp.minimum(h,1)**4 - (448/3)*xp.minimum(h,1)**5 + 140*xp.minimum(h,1)**6 - 64*xp.minimum(h,1)**7 + (35/3)*xp.minimum(h,1)**8, # Wendland_2
        18: lambda h: 1-2*xp.minimum(h,1)+xp.minimum(h,1)**2 # Wendland_0
    }

    k = xp.zeros((n1*p, n2*p), dtype=xp.float32)
    
    for i in range(r):
        t1 = trans(x, model, i, xp=xp)
        t2 = trans(x0, model, i, xp=xp)
        
        # Distance matrix (broadcasting)
        h = xp.linalg.norm(t1[:,None,:] - t2[None,:,:], axis=2)
        
        ji, js = i*p, (i+1)*p
        g = cov_funcs[int(model[i,0])](h)
        k += xp.kron(g, c[ji:js,:])
    
    return k


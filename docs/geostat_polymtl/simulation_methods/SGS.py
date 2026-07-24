import numpy as np

try:
    import cupy as cp
    has_cupy = True
except ImportError:
    cp = None
    has_cupy = False

# Import from the LMC-compatible cokriging module
from geostat_polymtl.kriging.cokriging import cokri

def SGS(x0, model, c, nu, nbsim, seed=0, x_cond=None, nk=12, rad=np.inf, 
        device='cpu', path_type='random'):
    """
    Sequential Gaussian Simulation (SGS) with support for Non-Linear LMC.
    
    Supports two model formats:
    1. Intrinsic coregionalization: model is (r, ...) array
       Same covariance models for all variable pairs
    
    2. Non-linear LMC: model is p×p list/array structure
       Different covariance models for each variable pair
       model[i][j] defines covariance between variables i and j
    
    -----------------------------------------------------------------------
    Inputs:
        x0         : (n, d) array, simulation points (coordinates)
        
        model      : Covariance model specification
                     
                     FORMAT 1 - Intrinsic (same for all pairs):
                         Array (r, ...) where each row = [type, range1, ...]
                         Example: np.array([[2, 20], [4, 15]])
                     
                     FORMAT 2 - Non-linear LMC (different per pair):
                         List/array (p, p) where model[i][j] is array (r_ij, ...)
                         Example for 2 variables:
                             model = [
                                 [np.array([[2, 20], [4, 15]]),  # var1-var1
                                  np.array([[2, 25]])],          # var1-var2
                                 [np.array([[2, 25]]),           # var2-var1
                                  np.array([[2, 30], [3, 12]])]  # var2-var2
                             ]
                         Note: model[i][j] should equal model[j][i] (symmetry)
        
        c          : (r, p, p) OR (rp, p) array, sill matrix
                     For intrinsic: all structures share same p×p matrix
                     For non-linear: structure k of model[i][j] uses c[k, i, j]
        
        nu         : (r, p, p) OR (rp, p) array, shape parameters
        
        nbsim      : int, number of realizations
        seed       : int, random seed (default: 0)
        x_cond     : (m, d+p) array, conditioning data (optional)
        nk         : int, max neighbors (default: 12)
        rad        : float, search radius (default: inf)
        device     : str, 'cpu' or 'gpu' (default: 'cpu')
        path_type  : str, 'random' or 'sequential' (default: 'random')
    
    -----------------------------------------------------------------------
    Outputs:
        datasim : (n, nbsim, p) array, simulated values
    
    -----------------------------------------------------------------------
    Examples:
    
    # Example 1: Intrinsic coregionalization (2 variables, same models)
    model = np.array([[1, 0], [4, 15]])  # Nugget + Spherical
    c = np.array([
        [[0.3, 0.0], [0.0, 0.2]],  # Nugget
        [[1.0, 0.6], [0.6, 0.8]]   # Spherical
    ])
    nu = np.zeros((2, 2, 2))
    sim = SGS(x0, model, c, nu, nbsim=10)
    
    # Example 2: Non-linear LMC (2 variables, different models)
    # Variable 1 has long range, variable 2 has short range
    # Cross-covariance has intermediate range
    model = [
        [np.array([[1, 0], [4, 20]]),   # var1-var1: Nugget + Spherical(20)
         np.array([[2, 12]])],          # var1-var2: Exponential(12)
        [np.array([[2, 12]]),           # var2-var1: Exponential(12) (symmetric)
         np.array([[1, 0], [4, 8]])]    # var2-var2: Nugget + Spherical(8)
    ]
    # Sill matrix: structure 0 is nugget, structure 1 is spatial
    c = np.array([
        [[0.3, 0.0], [0.0, 0.2]],  # Nugget sills
        [[1.0, 0.5], [0.5, 0.9]]   # Spatial sills
    ])
    nu = np.zeros((2, 2, 2))
    sim = SGS(x0, model, c, nu, nbsim=10, x_cond=x_cond)
    -----------------------------------------------------------------------
    """
    
    # Set backend
    if device.lower() == 'gpu' and has_cupy:
        xp = cp
    else:
        xp = np
    
    # Convert inputs to backend arrays
    x0 = xp.asarray(x0, dtype=xp.float64)
    n, d = x0.shape
    
    # Determine number of variables from c
    c = xp.asarray(c, dtype=xp.float64)
    if c.ndim == 3:
        r, p, _ = c.shape
    elif c.ndim == 2:
        rp, p = c.shape
        r = rp // p
    else:
        raise ValueError("c must be (r, p, p) or (rp, p)")
    
    # Handle nu parameter
    if nu is None or (isinstance(nu, xp.ndarray) and nu.size == 0):
        if c.ndim == 3:
            nu = xp.zeros((r, p, p), dtype=xp.float64)
        else:
            nu = xp.zeros((rp, p), dtype=xp.float64)
    else:
        nu = xp.asarray(nu, dtype=xp.float64)
    
    # Initialize output
    datasim = xp.zeros((n, nbsim, p), dtype=xp.float64)
    
    # Set random seed
    xp.random.seed(int(seed))
    
    # Process conditioning data
    if x_cond is not None:
        x_cond = xp.asarray(x_cond, dtype=xp.float64)
    
    # Generate simulations
    for isim in range(nbsim):
        xp.random.seed(int(seed) + isim * 1000)
        
        datasim[:, isim, :] = _sequential_simulation(
            x0, x_cond, model, c, nu, nk, rad, path_type, xp
        )
    
    # Convert back to numpy if on GPU
    if xp == cp:
        datasim = cp.asnumpy(datasim)
    
    return datasim


def _unique_rows_keep_first(x_coords, z_vals):
    """Remove duplicate coordinates keeping first occurrence."""
    if x_coords.shape[0] <= 1:
        return x_coords, z_vals
    _, idx = np.unique(x_coords, axis=0, return_index=True)
    idx = np.sort(idx)
    return x_coords[idx], z_vals[idx]


def _prior_draw(p, c, xp):
    """
    Draw from N(0, sill) for each variable.
    Handles both intrinsic and non-linear LMC.
    """
    out = xp.empty((p,), dtype=xp.float64)
    
    if c.ndim == 3:
        # (r, p, p) format - sum diagonal variances across structures
        for ivar in range(p):
            total_var = xp.sum(c[:, ivar, ivar])
            out[ivar] = xp.random.randn() * xp.sqrt(total_var)
    else:
        # (rp, p) format
        r = c.shape[0] // p
        for ivar in range(p):
            total_var = xp.sum(c[ivar::p, ivar])
            out[ivar] = xp.random.randn() * xp.sqrt(total_var)
    
    return out


def _cokri_at_point(
    x_work, z_work, x_current,
    model, c, nu,
    nk, rad,
    xp,
    itype=1,
    avg=None,
    max_retries=2,
):
    """
    Run cokri at one target point x_current (1,d).
    Supports both intrinsic and non-linear LMC models.
    Returns (mean[p], var[p]) in xp backend.
    """

    # Convert to numpy for cokri (CPU only)
    if xp.__name__ == "cupy":
        import cupy as cp
        xw_np = cp.asnumpy(x_work)
        zw_np = cp.asnumpy(z_work)
        x0_np = cp.asnumpy(x_current)
        c_np = cp.asnumpy(c)
        nu_np = cp.asnumpy(nu)
        # Handle model conversion for LMC
        if isinstance(model, (list, tuple)):
            model_np = model  # Keep list structure
        else:
            model_np = cp.asnumpy(model) if hasattr(model, '__array__') else model
    else:
        xw_np = np.asarray(x_work, dtype=np.float64)
        zw_np = np.asarray(z_work, dtype=np.float64)
        x0_np = np.asarray(x_current, dtype=np.float64)
        c_np = np.asarray(c, dtype=np.float64)
        nu_np = np.asarray(nu, dtype=np.float64)
        if isinstance(model, (list, tuple)):
            model_np = model  # Keep list structure
        else:
            model_np = np.asarray(model, dtype=np.float64)

    d = int(x0_np.shape[1])
    p = int(zw_np.shape[1])

    # If no data at all
    if xw_np.shape[0] == 0:
        mean_np = np.full((p,), np.nan, dtype=np.float64)
        var_np  = np.full((p,), np.nan, dtype=np.float64)
        if xp.__name__ == "cupy":
            return xp.asarray(mean_np), xp.asarray(var_np)
        return mean_np, var_np

    # Remove duplicate coordinates
    xw_np, zw_np = _unique_rows_keep_first(xw_np, zw_np)

    # Check for neighbors within radius
    dx = xw_np - x0_np[0, :]
    dist2 = np.sum(dx * dx, axis=1)
    if not np.isfinite(rad) or rad is None:
        has_neighbor = True
    else:
        has_neighbor = np.any(dist2 <= float(rad) ** 2)

    if not has_neighbor:
        mean_np = np.full((p,), np.nan, dtype=np.float64)
        var_np  = np.full((p,), np.nan, dtype=np.float64)
        if xp.__name__ == "cupy":
            return xp.asarray(mean_np), xp.asarray(var_np)
        return mean_np, var_np

    # Build x = [coords | values]
    x_np = np.hstack([xw_np, zw_np]).astype(np.float64)
    x0_np = x0_np.astype(np.float64)

    # Point cokriging params
    block = np.ones((d,), dtype=np.float64)
    nd    = np.ones(d, dtype=int)
    ival  = 0
    ntok  = 1

    if avg is None:
        avg = np.zeros(p, dtype=np.float64)
    else:
        avg = np.asarray(avg, dtype=np.float64).flatten()
        if avg.shape[0] != p:
            avg = np.zeros(p, dtype=np.float64)
    
    # Retry if singular by reducing nk
    nk_try = int(max(1, min(nk, x_np.shape[0])))

    for _ in range(max_retries + 1):
        try:
            x0s, s, *_ = cokri(
                x_np, x0_np, model_np, c_np, nu_np,
                itype=itype,
                avg=avg,
                block=block,
                nd=nd,
                ival=ival,
                nk=nk_try,
                rad=float(rad) if np.isfinite(rad) else 1e10,
                ntok=ntok,
                device="cpu",
            )

            mean_np = x0s[0, d:d+p].astype(np.float64)
            var_np  = s[0,  d:d+p].astype(np.float64)

            if xp.__name__ == "cupy":
                return xp.asarray(mean_np), xp.asarray(var_np)
            return mean_np, var_np

        except np.linalg.LinAlgError:
            nk_try = max(1, nk_try // 2)
        except (ValueError, IndexError) as e:
            print(f"Warning in cokri: {e}")
            break

    # If all failed -> NaNs
    mean_np = np.full((p,), np.nan, dtype=np.float64)
    var_np  = np.full((p,), np.nan, dtype=np.float64)
    if xp.__name__ == "cupy":
        return xp.asarray(mean_np), xp.asarray(var_np)
    return mean_np, var_np


def _sequential_simulation(x0, x_cond, model, c, nu, nk, rad, path_type, xp):
    """
    One SGS realization using cokri() for kriging.
    Supports both intrinsic and non-linear LMC.
    """
    n, d = x0.shape
    
    # Determine p from c
    if c.ndim == 3:
        p = c.shape[1]
    else:
        p = c.shape[1]

    z_sim = xp.full((n, p), xp.nan, dtype=xp.float64)

    # Simulation path
    path = xp.random.permutation(n) if path_type == "random" else xp.arange(n)

    # Working dataset
    if x_cond is not None:
        x_work = x_cond[:, :d].copy()
        z_work = x_cond[:, d:d+p].copy()
    else:
        x_work = xp.zeros((0, d), dtype=xp.float64)
        z_work = xp.zeros((0, p), dtype=xp.float64)

    for idx in path:
        idx = int(idx)
        x_current = x0[idx:idx+1, :]

        # No conditioning data -> prior
        if x_work.shape[0] == 0:
            z_sim[idx, :] = _prior_draw(p, c, xp)
        else:
            mean, var = _cokri_at_point(
                x_work, z_work, x_current,
                model, c, nu,
                nk=nk, rad=rad,
                xp=xp,
                itype=1,
                avg=None,
                max_retries=2
            )

            # If cokri failed, fallback to prior
            if xp.any(xp.isnan(mean)) or xp.any(xp.isnan(var)):
                z_sim[idx, :] = _prior_draw(p, c, xp)
            else:
                std = xp.sqrt(xp.maximum(var, 1e-8))
                z_sim[idx, :] = mean + xp.random.randn(p).astype(xp.float64) * std

        # Add simulated node to working dataset
        x_work = xp.vstack([x_work, x_current.astype(xp.float64)])
        z_work = xp.vstack([z_work, z_sim[idx:idx+1, :]])

    return z_sim

def COSGS(x0, model, c, nu, nbsim, seed=0, x_cond=None, nk=12, rad=np.inf,
          device='cpu', path_type='random', strategy='full'):
    """
    Co-located Sequential Gaussian Simulation (COSGS): Multivariate extension
    of SGS using collocated cokriging.
    
    This is an optimized version of multivariate SGS where:
    - Primary variable: uses all neighbors
    - Secondary variables: use collocated value + limited neighbors
    
    This reduces computational cost while maintaining correlation structure.
    
    -----------------------------------------------------------------------
    Additional Parameters (vs SGS):
        strategy : str, cokriging strategy (default: 'full')
                   - 'full': full cokriging (all variables, all neighbors)
                   - 'collocated': collocated cokriging (primary + collocated secondary)
                   - 'mm1': Markov Model 1 (only collocated secondary)
                   - 'mm2': Markov Model 2 (screen secondary by primary)
    
    Note: For now, this function calls SGS with full cokriging.
          Future versions will implement optimization strategies.
    -----------------------------------------------------------------------
    """
    # For now, COSGS is equivalent to SGS
    # Future: implement collocated cokriging optimization
    return SGS(x0, model, c, nu, nbsim, seed, x_cond, nk, rad, device, path_type)
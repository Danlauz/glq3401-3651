import numpy as np

try:
    import cupy as cp
    has_cupy = True
except ImportError:
    cp = None
    has_cupy = False

from geostat_polymtl.cov_func.covar_nu import covar_nu as covar


def LU(x0, model, c, nu, nbsim, seed=0, x_cond=None, device='cpu'):
    """
    LU Simulation: Unconditional or conditional Gaussian simulation using 
    Cholesky decomposition (LU factorization).
    
    This method generates spatially correlated random fields by:
    1. Computing the covariance matrix K
    2. Performing Cholesky decomposition: K = L * L^T
    3. Multiplying white noise by L: Z = L * U
    4. For conditioning: Direct method (solve for U that gives observations)
    
    -----------------------------------------------------------------------
    Syntax:
        datasim = LU(x0, model, c, nu, nbsim, seed, x_cond, device)
    
    -----------------------------------------------------------------------
    Description:
        Simulates spatially correlated Gaussian random fields in 1D, 2D, or 3D.
        Supports both unconditional and conditional simulation.
        
        - Unconditional: Pure LU simulation (Z = L * U)
        - Conditional: Direct method - finds U values giving exact observations
                       (more elegant than kriging-based methods)
    
    -----------------------------------------------------------------------
    Inputs:
        x0      : (n, d) array, simulation points (coordinates)
        model   : Covariance model specification (same format as covar_nu)
                  - Isotropic: [model_type, range, shape, sill]
                  - Anisotropic: [model_type, range1, range2, range3, 
                                  rotx, roty, rotz, shape, sill]
        c       : (rp, p) array, sill matrix for coregionalization
        nu      : (rp, p) array, shape parameters (for Matern, Cauchy, Wendland)
        nbsim   : int, number of realizations to generate
        seed    : int, random seed (default: 0)
        x_cond  : (m, d+p) array, conditioning data (optional)
                  First d columns: coordinates
                  Last p columns: values for each variable
                  Use np.nan for missing values
        device  : str, 'cpu' or 'gpu' (default: 'cpu')
    
    -----------------------------------------------------------------------
    Outputs:
        datasim : (n, nbsim, p) array, simulated values
                  n = number of simulation points
                  nbsim = number of realizations
                  p = number of variables
    
    -----------------------------------------------------------------------
    Original author: D. Lauzon, February 2025
    
    -----------------------------------------------------------------------
    Examples:
    --------
    # 1D Unconditional simulation
    x0 = np.linspace(0, 100, 100).reshape(-1, 1)
    model = np.array([[2, 20, 0, 1]])  # Exponential, range=20
    c = np.array([[1.0]])
    nu = np.array([[None]])
    sim = LU(x0, model, c, nu, nbsim=10, seed=42)
    
    # 2D Conditional simulation
    x0 = grid(0, 50, 1, 0, 50, 1)[0]  # 51x51 grid
    x_cond = np.array([[10, 10, 1.5],
                       [25, 25, 2.0],
                       [40, 40, 0.8]])
    model = np.array([[3, 15, 10, 30, 0, 1]])  # Gaussian, anisotropic
    c = np.array([[1.0]])
    nu = np.array([[None]])
    sim = LU(x0, model, c, nu, nbsim=5, seed=123, x_cond=x_cond)
    
    # Multivariate (2 variables) conditional simulation
    model = [[np.array([[2, 10, 0, 0.8]]), np.array([[2, 10, 0, 0.3]])],
             [np.array([[2, 10, 0, 0.3]]), np.array([[2, 10, 0, 1.2]])]]
    c = np.array([[0.8, 0.3],
                  [0.3, 1.2]])
    nu = [[None, None],
          [None, None]]
    x_cond = np.array([[10, 10, 1.5, 0.8],
                       [25, 25, 2.0, 1.1],
                       [40, 40, np.nan, 0.9]])  # Missing value for var 1
    sim = LU(x0, model, c, nu, nbsim=3, seed=456, x_cond=x_cond)
    -----------------------------------------------------------------------
    """
    
    # Set backend
    if device.lower() == 'gpu' and has_cupy:
        xp = cp
    else:
        xp = np
    
    # Convert inputs to backend arrays
    x0 = xp.asarray(x0, dtype=xp.float32)
    n, d = x0.shape
    
    # Determine number of variables
    if isinstance(c, list):
        p = len(c)
        # Convert nested list structure to proper format
        c_array = xp.zeros((len(c), len(c[0])), dtype=xp.float32)
        for i in range(len(c)):
            for j in range(len(c[i])):
                c_array[i, j] = c[i][j]
        c = c_array
    else:
        c = xp.asarray(c, dtype=xp.float32)
        if c.ndim == 2:
            p = c.shape[1]
        else:
            p = 1
            c = c.reshape(-1, 1)
    
    # Handle nu parameter
    if isinstance(nu, list):
        nu_array = xp.zeros((len(nu), len(nu[0])), dtype=xp.float32)
        for i in range(len(nu)):
            for j in range(len(nu[i])):
                if nu[i][j] is not None:
                    nu_array[i, j] = nu[i][j]
                else:
                    nu_array[i, j] = 0.0  # Will be ignored for non-parametric models
        nu = nu_array
    else:
        if nu is None or (isinstance(nu, xp.ndarray) and nu.size == 0):
            nu = xp.zeros((1, p), dtype=xp.float32)
        else:
            nu = xp.asarray(nu, dtype=xp.float32)
    
    # Initialize output
    datasim = xp.zeros((n, nbsim, p), dtype=xp.float32)
    
    # Set random seed
    xp.random.seed(int(seed))
    
    # ========================================
    # UNCONDITIONAL SIMULATION
    # ========================================
    if x_cond is None:
        datasim = _unconditional_LU(x0, model, c, nu, nbsim, xp)
    
    # ========================================
    # CONDITIONAL SIMULATION
    # ========================================
    else:
        x_cond = xp.asarray(x_cond, dtype=xp.float32)
        datasim = _conditional_LU(x0, x_cond, model, c, nu, nbsim, xp)
    
    # Convert back to numpy if on GPU
    if xp == cp:
        datasim = cp.asnumpy(datasim)
    
    return datasim


def _unconditional_LU(x0, model, c, nu, nbsim, xp):
    """
    Unconditional LU simulation.
    
    Algorithm:
    1. Compute covariance matrix K(x0, x0)
    2. Cholesky decomposition: K = L * L^T
    3. Generate white noise U ~ N(0, I)
    4. Transform: Z = L * U
    """
    n, d = x0.shape
    p = c.shape[1]
    
    # Compute covariance matrix for all variables
    K = xp.zeros((n*p, n*p), dtype=xp.float32)
    
    if isinstance(model, list):
        # Multivariate case: model is a list of lists
        for i in range(p):
            for j in range(p):
                K_ij = covar(x0, x0, model[i][j], c[i:i+1, j:j+1], 
                            nu[i:i+1, j:j+1], xp=xp)
                # Place in block matrix
                K[i*n:(i+1)*n, j*n:(j+1)*n] = K_ij[:n, :n]
    else:
        # Univariate case: single model for single variable
        model = xp.asarray(model, dtype=xp.float32)
        K = covar(x0, x0, model, c, nu, xp=xp)
    
    # Add small nugget for numerical stability
    K += xp.eye(n*p, dtype=xp.float32) * 1e-8
    
    # Cholesky decomposition
    try:
        L = xp.linalg.cholesky(K)
    except xp.linalg.LinAlgError:
        # If Cholesky fails, add larger nugget
        K += xp.eye(n*p, dtype=xp.float32) * 1e-6
        L = xp.linalg.cholesky(K)
    
    # Generate simulations
    datasim = xp.zeros((n, nbsim, p), dtype=xp.float32)
    
    for isim in range(nbsim):
        # White noise
        U = xp.random.randn(n*p, 1).astype(xp.float32)
        
        # Correlated field
        Z = L @ U
        
        # Reshape to (n, p)
        for ivar in range(p):
            datasim[:, isim, ivar] = Z[ivar*n:(ivar+1)*n, 0]
    
    return datasim


def _conditional_LU(x0, x_cond, model, c, nu, nbsim, xp):
    """
    Conditional LU simulation using the block partitioning method.
    
    Theory:
    Given L*L^T = K where K is partitioned as:
        K = [K_dd  K_ds]
            [K_sd  K_ss]
    
    For conditional simulation:
    1. Generate Z ~ N(0, K) unconditionally
    2. Condition: Z_s|Z_d = μ_s + K_sd * K_dd^(-1) * (Z_d - μ_d) + residual
    3. Residual ~ N(0, K_s|d) where K_s|d = K_ss - K_sd * K_dd^(-1) * K_ds
    """
    n, d = x0.shape
    m, dp = x_cond.shape
    p = c.shape[1]
    
    # Extract conditioning coordinates and values
    x_cond_coords = x_cond[:, :d]
    z_cond = x_cond[:, d:d+p]
    
    # Identify which data points are observed for each variable
    mask_obs = ~xp.isnan(z_cond)
    
    datasim = xp.zeros((n, nbsim, p), dtype=xp.float32)
    
    # ========================================
    # Build combined point set: [x_cond, x0]
    # ========================================
    x_all = xp.vstack([x_cond_coords, x0])
    n_all = m + n
    
    # ========================================
    # Compute full covariance matrix
    # ========================================
    K_all = xp.zeros((n_all*p, n_all*p), dtype=xp.float32)
    
    if isinstance(model, list):
        # Multivariate case
        for i in range(p):
            for j in range(p):
                K_ij = covar(x_all, x_all, model[i][j], c[i:i+1, j:j+1], 
                            nu[i:i+1, j:j+1], xp=xp)
                K_all[i*n_all:(i+1)*n_all, j*n_all:(j+1)*n_all] = K_ij[:n_all, :n_all]
    else:
        # Univariate case
        model = xp.asarray(model, dtype=xp.float32)
        K_all = covar(x_all, x_all, model, c, nu, xp=xp)
    
    # Add nugget for numerical stability
    K_all += xp.eye(n_all*p, dtype=xp.float32) * 1e-6
    
    # ========================================
    # Identify data and simulation indices
    # ========================================
    # Build list of all observed indices
    data_indices = []
    data_values = []
    
    for ivar in range(p):
        obs_mask = mask_obs[:, ivar]
        if xp.sum(obs_mask) > 0:
            # Global indices for this variable's observed data (first m points)
            local_indices = xp.where(obs_mask)[0]
            global_indices = local_indices + ivar * n_all
            data_indices.append(global_indices)
            data_values.append(z_cond[obs_mask, ivar])
    
    if len(data_indices) == 0:
        # No conditioning - unconditional simulation
        try:
            L_all = xp.linalg.cholesky(K_all)
        except xp.linalg.LinAlgError:
            K_all += xp.eye(n_all*p, dtype=xp.float32) * 1e-4
            L_all = xp.linalg.cholesky(K_all)
        
        for isim in range(nbsim):
            U = xp.random.randn(n_all*p, 1).astype(xp.float32)
            Z_all = L_all @ U
            for ivar in range(p):
                start_idx = ivar * n_all + m
                end_idx = (ivar + 1) * n_all
                datasim[:, isim, ivar] = Z_all[start_idx:end_idx, 0]
        return datasim
    
    # Concatenate all observed indices and values
    data_idx = xp.concatenate(data_indices)
    data_vals = xp.concatenate(data_values)
    n_data = len(data_idx)
    
    # Simulation indices (all points at x0 for all variables)
    sim_indices = []
    for ivar in range(p):
        # Indices for x0 locations (after first m conditioning points)
        sim_idx = xp.arange(m, n_all) + ivar * n_all
        sim_indices.append(sim_idx)
    sim_idx = xp.concatenate(sim_indices)
    n_sim = len(sim_idx)
    
    # ========================================
    # Partition covariance matrix
    # ========================================
    # K_dd: covariance between data points
    K_dd = K_all[data_idx[:, None], data_idx]
    
    # K_sd: covariance between simulation and data points
    K_sd = K_all[sim_idx[:, None], data_idx]
    
    # K_ss: covariance between simulation points
    K_ss = K_all[sim_idx[:, None], sim_idx]
    
    # ========================================
    # Compute kriging weights and conditional covariance
    # ========================================
    # Add small nugget for stability
    K_dd += xp.eye(n_data, dtype=xp.float32) * 1e-6
    
    # Kriging weights: λ = K_dd^(-1) * K_ds^T
    # We need: K_sd * K_dd^(-1) = (K_dd^(-1) * K_sd^T)^T
    lambda_T = xp.linalg.solve(K_dd, K_sd.T)  # K_dd^(-1) * K_sd^T
    
    # Conditional covariance: K_s|d = K_ss - K_sd * K_dd^(-1) * K_ds
    K_cond = K_ss - K_sd @ lambda_T
    
    # Make symmetric
    K_cond = 0.5 * (K_cond + K_cond.T)
    
    # Cholesky of conditional covariance
    K_cond += xp.eye(n_sim, dtype=xp.float32) * 1e-6
    try:
        L_cond = xp.linalg.cholesky(K_cond)
    except xp.linalg.LinAlgError:
        K_cond += xp.eye(n_sim, dtype=xp.float32) * 1e-4
        L_cond = xp.linalg.cholesky(K_cond)
    
    # ========================================
    # Generate conditional simulations
    # ========================================
    for isim in range(nbsim):
        # Generate residual ~ N(0, K_s|d)
        U = xp.random.randn(n_sim, 1).astype(xp.float32)
        residual = L_cond @ U
        
        # Conditional mean: K_sd * K_dd^(-1) * z_data
        cond_mean = K_sd @ xp.linalg.solve(K_dd, data_vals.reshape(-1, 1))
        
        # Conditional simulation: mean + residual
        Z_sim = cond_mean + residual
        
        # Extract values for each variable
        offset = 0
        for ivar in range(p):
            datasim[:, isim, ivar] = Z_sim[offset:offset+n, 0]
            offset += n
    
    return datasim


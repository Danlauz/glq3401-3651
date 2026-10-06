import numpy as np
try:
    import cupy as cp
except ImportError:  # pragma: no cover - dependance GPU optionnelle (CPU ok)
    cp = None
# matplotlib n'est utilise QUE pour display=1 (visualisation Python native).
# Import optionnel pour rester compatible avec Pyodide (WebAssembly) ou les
# environnements sans matplotlib installe.
try:
    import matplotlib.pyplot as plt
except ImportError:  # pragma: no cover - dependance affichage optionnelle
    plt = None
from math import ceil
from numpy.fft import fftn, ifftn, fftshift

def varioFFT(x0, z, icode, categ=0, display=0, rank=0, xp=np):
    """
    function [gh,nh]=GeoStatFFT(x0,z,icode,categ,display);
    Function to compute spatial statistics in nD for up to nvar variables.

    Missing data are replace by zeros. A data are on a (possibly incomplete) regular grid.
    The program computes spatial statistics in the frequency domain using ND-FFT.

    INPUT :
    x0       n by d     matrix of coordinates (regular grid)

    z        n by nvar  matrix of values for the variables. Each line is
                        associated with the corresponding line vector of
                        coordinates in the x0 matrix, and each column corresponds
                        to a different variable.
                        Missing values are indicated by NaN. We replace NaN values with
                        zeros in the code.

    icode               a code to indicate which function to compute
                         =1 : variograms and cross-variograms;
                         =2 : covariograms and cross-covariograms
                         =3 : variograms and pseudo-cross-variograms
                         =4 : centered covariances and cross-covariances  (mean is computed for the whole field instead of according to the lags)
                         =5 : non-centered covariances and cross-covariances (bivariate probabilities, for categorical data)
                         =6 : transiograms (for categorical data)
                         =7 : non-ergodic transiograms (for categorical data)
                         =8 : Directional asymmetry (Bardossy and Horning, 2017)
                         =9 : Bivariate asymmetry (Guthke, 2013)
                         =10: Rank correlation and cross-rank correlation 
                         =11: Third-order cumulant of a zero mean random function  (Dimitrakopoulos et al., 2010)­

    categ    boolean    tells if the variables are categorical (set to 1) or not
                        (set to 0, default)
    display  boolean    tells if a plot must be displayed (set to 1) or not
                        (set to 0, default)
    rank     boolean    tells if we need to perform rank transformation (set to 1) or not
                        (set to 0, default)

    OUTPUT :
    gh       nvar by nvar cell array of nx by ny (direct- and cross-) maps for
                        variables i and j depending on icode.
    nh       nnvar by nvar cell array of nx by ny (direct- and cross-) maps of number of pairs
                        available to compute the structural function.

    This program uses the functions FFTn, IFFTn, FFTSHIFT and CONJ which are standard MATLAB functions.

    Modification - Original version  variofft2D.m written by D. Marcotte, denis.marcotte@polymtl.ca
    Author: Dany Lauzon - Polytechnique Montréal
                         =8 : Directional asymmetry (Bardossy and Horning, 2017)
                         =9 : Bivariate asymmetry (Guthke, 2013)
                         =10: Rank correlation and cross-rank correlation 
                         =11: Third-order cumulant of a zero mean random function  (Dimitrakopoulos et al., 2010)­

    Author: Dimitri D'Or - Ephesia Consult - 2014/11/17 :
                          Adapted to 3D.
                          5 : bivariate probabilities, for categorical data
                          6 : transiograms, for categorical data
                          7 : non-ergodic transiograms, for categorical data

    Reference :
    Marcotte D., 1996. Fast Variogram computation with FFT. Computers & Geoscience, 22, 10, 1175-1186.
    Lauzon D. and Horning S. Efficient Computation on Large Regular Grids of High-Order Spatial Statistics via Fast Fourier Transform. (In review)
    """
    # Tranform array type (CPU or GPU) if needed
    z = xp.array(z)
    
    # Number of variables (or fields)
    n_nodes, nvar = z.shape
    if categ:
        nvar = len(xp.unique(z[~xp.isnan(z)]))

    # Grid parameters
    minc = xp.array(xp.min(x0, axis=0))
    maxc = xp.array(xp.max(x0, axis=0))
    
    dim = x0.shape[1]
    dc = xp.zeros(dim)
    for i in range(dim):
        diff_i = xp.diff(xp.unique(x0[:, i]))
        dc[i] = diff_i[0] if diff_i.size > 0 else 1
    nc = ((maxc - minc) / dc).astype(int) + 1

    # Reformatting the data if categorical
    if categ:
        idnan = xp.isnan(z)
        zc = xp.zeros((n_nodes, nvar))
        for i in range(nvar):
            zc[:, i][z[:, i] == i + 1] = 1  # MATLAB 1-based indexing
            zc[:, i][idnan[:, i]] = xp.nan
        z = zc
        del zc

    # Initialization
    Z = [None] * nvar
    Zid = [None] * nvar

    if len(nc) == 1:
        nc = xp.array([nc[0], 1])
    for i in range(nvar):
        shape_nc = tuple(int(x) for x in nc)
        Z[i] = z[:, i].reshape(shape_nc)
        # Ensure Z[i] is always 3D
        if Z[i].ndim == 1:
            Z[i] = Z[i][:, xp.newaxis, xp.newaxis]  # shape (n,1,1)
        elif Z[i].ndim == 2:
            Z[i] = Z[i][:, :, xp.newaxis]           # shape (n,p,1)

    gh = [[None for _ in range(nvar)] for _ in range(nvar)]
    nh = [[None for _ in range(nvar)] for _ in range(nvar)]

    n, p, q = Z[0].shape  # dimensions of data matrix

    # Find closest multiple of 8
    nrows = 2 * n - 1
    ncols = 2 * p - 1
    nz = 2 * q - 1
    nr2 = int(xp.ceil(nrows / 2) * 2)
    nc2 = int(xp.ceil(ncols / 2) * 2)
    nz2 = int(xp.ceil(nz / 2) * 2)
    nv = [nr2, nc2, nz2]

    # Form indicator matrix
    for i in range(nvar):
        Zid[i] = ~xp.isnan(Z[i])
        Z[i][~Zid[i]] = 0

    # Apply rank transformation
    Fz = [None] * nvar
    if rank == 1:
        for i in range(nvar):
            Fz[i] = ECDF(z[:, i], xp=np).reshape(nc)
            Fz[i][~Zid[i]] = 0
    else:
        for i in range(nvar):
            Fz[i] = Z[i]

    # Preparation
    fx = [None] * nvar
    fx2 = [[None for _ in range(nvar)] for _ in range(nvar)]
    fxid = [[None for _ in range(nvar)] for _ in range(nvar)]

    # Compute probability of each facies (if categ)
    if icode[0] == 6 and not categ:
        raise ValueError("Transiograms are for categorical data, categ = 1 not 0")
    if icode[0] == 6 and categ:
        prop = xp.zeros(nvar)
        for i in range(nvar):
            prop[i] = xp.nansum(z[:, i]) / (len(z[:, i]) - xp.sum(xp.isnan(z[:, i])))

    # Compute the mean if data are centered
    if icode[0] == 4 or icode[0] == 11:
        m = xp.zeros(nvar)
        for i in range(nvar):
            m[i] = xp.sum(Z[i][Zid[i]]) / xp.sum(Zid[i])
            Z[i][Zid[i]] = Z[i][Zid[i]] - m[i]

    # Compute Fourier transform of variables and indicators
    for i in range(nvar):
        for j in range(nvar):
            if i == j:
                fx[i] = fftn(Z[i], nv)
                fxid[i][i] = fftn(Zid[i], nv)
            else:
                fxid[i][j] = fftn(Zid[i] * Zid[j], nv)
            fx2[i][j] = fftn(Z[i] * Z[j], nv)

    # Compute number of pairs
    for i in range(nvar):
        for j in range(nvar):
            if icode[0] == 1:
                nh[i][j] = xp.round(xp.real(ifftn(xp.conj(fxid[i][j]) * fxid[i][j])))
            else:
                nh[i][j] = xp.round(xp.real(ifftn(xp.conj(fxid[i][i]) * fxid[j][j])))

    # Compute structural functions according to icode
    if icode[0] == 1:  # Variograms and cross-variograms
        for i in range(nvar):
            for j in range(nvar):
                t1 = fftn(Z[i] * Zid[j], nv)
                t2 = fftn(Z[j] * Zid[i], nv)
                t12 = fftn(Z[i] * Z[j], nv)
                gh[i][j] = xp.real(ifftn(xp.conj(fxid[i][j]) * t12 + xp.conj(t12) * fxid[i][j] - xp.conj(t1) * t2 - t1 * xp.conj(t2))) / xp.maximum(nh[i][j], 1) / 2

    # Case 2: Covariograms and cross-covariograms
    if icode[0] == 2:
        for i in range(nvar):
            for j in range(nvar):
                m_tail = xp.real(ifftn(xp.conj(fx[i]) * fxid[j][j])) / xp.maximum(nh[i][j], 1)
                m_head = xp.real(ifftn(xp.conj(fxid[i][i]) * fx[j])) / xp.maximum(nh[i][j], 1)
                gh[i][j] = xp.real(ifftn(xp.conj(fx[i]) * fx[j])) / xp.maximum(nh[i][j], 1) - m_tail * m_head

    # Case 3: Variograms and pseudo-cross-variograms
    if icode[0] == 3:
        for i in range(nvar):
            for j in range(nvar):
                gh[i][j] = xp.real(ifftn(fxid[j][j] * xp.conj(fx2[i][i]) +
                                         xp.conj(fxid[i][i]) * fx2[j][j] -
                                         2 * xp.conj(fx[i]) * fx[j])) / xp.maximum(nh[i][j], 1) / 2

    # Case 4 & 5: Centered or non-centered covariances
    if icode[0] in [4, 5]:
        for i in range(nvar):
            for j in range(nvar):
                gh[i][j] = xp.real(ifftn(xp.conj(fx[i]) * fx[j])) / xp.maximum(nh[i][j], 1)

    # Case 6: Transiograms (categorical)
    if icode[0] == 6:
        for i in range(nvar):
            for j in range(nvar):
                gh[i][j] = x.real(ifftn(xp.conj(fx[i]) * fx[j])) / xp.maximum(nh[i][j], 1) / prop[i]

    # Case 7: Non-ergodic transiograms
    if icode[0] == 7:
        fx_all = sum(fx)
        for i in range(nvar):
            propi = xp.round(xp.real(ifftn(xp.conj(fx[i]) * fx_all)))
            for j in range(nvar):
                gh[i][j] = xp.real(ifftn(xp.conj(fx[i]) * fx[j])) / xp.maximum(propi, 1)

    # Case 8: Directional asymmetry
    if icode[0] == 8:
        for i in range(nvar):
            for j in range(nvar):
                f3 = fftn(Fz[i] * Fz[i] * Fz[i], nv)
                g3 = fftn(Fz[j] * Fz[j] * Fz[j], nv)
                f2 = fftn(Fz[i] * Fz[i], nv)
                g2 = fftn(Fz[j] * Fz[j], nv)
                f1 = fftn(Fz[i], nv)
                g1 = fftn(Fz[j], nv)
                gh[i][j] = xp.real(ifftn(xp.conj(f3) * fxid[j][j] - 3 * xp.conj(f2) * g1 +
                                         3 * xp.conj(f1) * g2 - xp.conj(fxid[i][i]) * g3)) / xp.maximum(nh[i][j], 1)

    # Case 9: Bivariate asymmetry
    if icode[0] == 9:
        for i in range(nvar):
            for j in range(nvar):
                f3 = fftn(Fz[i]**3, nv)
                g3 = fftn(Fz[j]**3, nv)
                f2 = fftn(Fz[i]**2, nv)
                g2 = fftn(Fz[j]**2, nv)
                f1 = fftn(Fz[i], nv)
                g1 = fftn(Fz[j], nv)
                gh[i][j] = xp.real(
                    ifftn(
                        xp.conj(f3) * fxid[j][j] +
                        3 * xp.conj(f2) * g1 -
                        3 * xp.conj(f2) * fxid[j][j] +
                        3 * xp.conj(f1) * g2 -
                        6 * xp.conj(f1) * g1 +
                        3 * xp.conj(f1) * fxid[j][j] +
                        xp.conj(fxid[i][i]) * g3 -
                        3 * xp.conj(fxid[i][i]) * g2 +
                        3 * xp.conj(fxid[i][i]) * g1 -
                        xp.conj(fxid[i][i]) * fxid[j][j]
                    )
                ) / xp.maximum(nh[i][j], 1)

    # Case 10: Rank correlation
    if icode[0] == 10:
        for i in range(nvar):
            for j in range(nvar):
                f1 = fftn(Fz[i], nv)
                f2 = fftn(Fz[j], nv)
                gh[i][j] = 12 * xp.real(ifftn(
                    xp.conj(f1) * f2 - 0.5 * xp.conj(f1) * fxid[j][j] -
                    0.5 * xp.conj(fxid[i][i]) * f2 +
                    0.25 * xp.conj(fxid[i][i]) * fxid[j][j]
                )) / xp.maximum(nh[i][j], 1)

    # Case 11: Third-order cumulant
    if icode[0] == 11:
        h2i = icode[1]
        h2j = icode[2]

        fg = [None] * nvar
        ff = [None] * nvar
        for i in range(nvar):
            id_mat = xp.zeros((3*(n-1)+1, 3*(p-1)+1))
            id_mat[n-1:2*n-1, p-1:2*p-1] = Z[i]
            g = id_mat[n-1:2*n-1, p-1:2*p-1] * id_mat[n-1+h2i:2*n-1+h2i, p-1+h2j:2*p-1+h2j]
            idh2 = g != 0

            fg[i] = g
            ff[i] = Z[i]
            fg[i][~idh2] = 0
            ff[i][~Zid[i]] = 0

            nh[i][i] = xp.round(xp.real(ifftn(xp.conj(fftn(idh2, nv)) * fxid[i][i])))
            gh[i][i] = xp.real(ifftn(xp.conj(fftn(ff[i], nv)) * fftn(fg[i], nv))) / xp.maximum(nh[i][i], 1)


    # --- Reduce matrices to required size ---
    t = [nv_i // 2 + 1 for nv_i in nv]  # center indices

    for i in range(nvar):
        if icode[0] != 11:
            seq = range(nvar)
        else:
            seq = [i]
        
        for j in seq:
            if gh[i][j] is None:
                continue
        
            # Apply fftshift
            ghtemp = fftshift(gh[i][j])
            nhtemp = fftshift(nh[i][j])
        
            # Slice to original size
            gh[i][j] = ghtemp[
                t[0]-n : t[0]+n-1,
                t[1]-p : t[1]+p-1,
                t[2]-q : t[2]+q-1
            ]
        
            nh[i][j] = nhtemp[
                t[0]-n : t[0]+n-1,
                t[1]-p : t[1]+p-1,
                t[2]-q : t[2]+q-1
            ]

    # Optionally, display 2D maps
    if display and dim < 3:  # if display and 2D
        if plt is None:
            raise ImportError(
                "matplotlib n'est pas installe : impossible d'afficher (display=1). "
                "Installez matplotlib ou utilisez display=0."
            )
        fig, axes = plt.subplots(nvar, nvar, figsize=(4*nvar, 4*nvar))
        axes = np.atleast_2d(axes)  # ensure 2D array of axes even if nvar=1

        # Ensure nc is a NumPy array for plotting
        nc_cpu = nc.get() if 'cupy' in str(type(nc)) else np.array(nc)

        for i in range(nvar):
            for j in range(nvar):
                if gh[i][j] is None:
                    continue
 
                # Transfer only for plotting
                gh_cpu = gh[i][j].get() if 'cupy' in str(type(gh[i][j])) else np.array(gh[i][j])
                gh_cpu = np.squeeze(gh_cpu)
                
                ax = axes[i, j]
                img = np.fft.fftshift(gh_cpu)  # center zero lag
                im = ax.imshow(img.T, origin='lower', aspect='equal')

                # Draw cross lines
                ax.plot([nc_cpu[0], nc_cpu[0]], [0, nc_cpu[1]*2], '-k')
                ax.plot([0, nc_cpu[0]*2], [nc_cpu[1], nc_cpu[1]], '-k')

                # Titles according to icode and category
                if icode == 1:
                    ax.set_title(f'Var. {i+1} - {j+1}')
                elif icode == 2:
                    ax.set_title(f'Covario. {i+1} - {j+1}')
                elif icode == 3:
                    ax.set_title(f'Pseudo-Var. {i+1} - {j+1}')
                elif icode == 4:
                    ax.set_title(f'Centered Covar. {i+1} - {j+1}')
                elif icode == 5 and categ == 0:
                    ax.set_title(f'Covar. {i+1} - {j+1}')
                elif icode == 5 and categ == 1:
                    ax.set_title(f'Bivar. Prob. {i+1} - {j+1}')
                elif icode == 6:
                    ax.set_title(f'Transio. {i+1} - {j+1}')
                elif icode == 7:
                    ax.set_title(f'Var. {i+1} - {j+1}')
                elif icode == 8:
                    ax.set_title(f'Dir. Asy. {i+1} - {j+1}')
                elif icode == 9:
                    ax.set_title(f'Biv. Asy. {i+1} - {j+1}')
                elif icode == 10:
                    ax.set_title(f'Rank Cor. {i+1} - {j+1}')
                elif icode == 11:
                    ax.set_title(f'Third-order cumulant {i+1}')

                # Set axis limits to center the image
                ax.set_xlim(round(3*nc_cpu[0]/4), round(5*nc_cpu[0]/4))
                ax.set_ylim(round(3*nc_cpu[1]/4), round(5*nc_cpu[1]/4))

                # Adjust color limits like MATLAB's clim
                if icode in [8, 9, 10]:
                    im.set_clim([-0.05, 0.05])
                elif categ == 0 and icode == 6:
                    im.set_clim([0, 1])
                elif icode == 11:
                    im.set_clim([-0.05, 0.05])
                elif categ == 1 and icode == 6:
                    im.set_clim([0, 0.75])
                elif categ == 1 and icode == 5:
                    im.set_clim([0, 0.4])
                else:
                    im.set_clim([0, 1])

                fig.colorbar(im, ax=ax)

        plt.tight_layout()
        plt.show()

    for i in range(nvar):
        for j in range(nvar):
            if gh[i][j] is None: 
                continue
            gh[i][j] = gh[i][j].squeeze() 
            nh[i][j] = nh[i][j].squeeze()


    return gh, nh


def varioFFT_ndir(gh, nh, dist, ang, tol_ang, xp=np):
    """
    Post-process GeoStatFFT output (experimental directional/omnidirectional statistics).

    Parameters
    ----------
    gh : list of lists (nvar x nvar), each entry is ndarray (nx x ny)
        Direct- and cross-maps for variables i and j.
    nh : list of lists (nvar x nvar), each entry is ndarray (nx x ny)
        Number of pairs available to compute the structural function.
    dist : ndarray (nbins x 2)
        Distance bins (min, max) for lag classes.
    ang : ndarray (ndir x 2)
        Angle bins (min, max).
    tol_ang : float
        Tolerance on angle.

    Returns
    -------
    gh_ndir, nh_ndir, lag_ndir : lists of lists (nvar x nvar)
        Directional results: gamma, number of pairs, lag distances.
    """
   
    dist = xp.array(dist)
    ang =  xp.array(ang)
    tol_ang = xp.array(tol_ang)
    
    nvar = len(gh)

    # Dimension of the field
    nc = (xp.array(gh[0][0].shape) - 1) // 2
    ndim = len(nc)

    if ndim == 2:
        n1, n2 = map(int, nc)
        X, Y = xp.meshgrid(xp.arange(-n2, n2+1), xp.arange(-n1, n1+1))
        lags = xp.sqrt(X**2 + Y**2)

        # angle = flip(rad2deg(atan(Y./X))) in MATLAB
        angle = xp.rad2deg(xp.arctan2(Y, X))
        angle = xp.flip(angle, axis=0)

        # replicate MATLAB conditions
        angle = xp.where((angle > 0) & (X < 0), angle + 180, angle)
        angle = xp.where((angle <= 0) & (Y <= 0) & (X < 0), angle + 180, angle)
        angle = xp.where((angle < 0) & (X >= 0), angle + 360, angle)
        angle[n1, n2] = 0  # center
    else:
        raise ValueError("ndim not equal 2")

    # Distances: artificial first class for lag 0
    tol_dist = xp.vstack(([-1, 0], dist))

    # Angles: add tolerance
    tol_ang = xp.column_stack((ang - tol_ang, ang + tol_ang))

    # Allocate results
    gh_ndir = [[None for _ in range(nvar)] for _ in range(nvar)]
    nh_ndir = [[None for _ in range(nvar)] for _ in range(nvar)]
    lag_ndir = [[None for _ in range(nvar)] for _ in range(nvar)]

    # Loop over variables
    for i in range(nvar):
        for j in range(nvar):
            n_dist = tol_dist.shape[0]
            n_ang = tol_ang.shape[0]

            gh_ndir[i][j] = xp.zeros((n_dist, n_ang))
            nh_ndir[i][j] = xp.zeros((n_dist, n_ang))
            lag_ndir[i][j] = xp.zeros((n_dist, n_ang))

            for k in range(n_dist):
                for kk in range(n_ang):
                    kkk = 0 if k == 0 else kk
                    

                    id_mask = (
                        (lags > tol_dist[k, 0]) & (lags <= tol_dist[k, 1]) &
                        (angle > tol_ang[kkk, 0]) & (angle <= tol_ang[kkk, 1])
                    )
                    # Select only the valid points
                    gh_sel = gh[i][j][id_mask].ravel()
                    nh_sel = nh[i][j][id_mask].ravel()
                    lags_sel = lags[id_mask].ravel()

                    nh_sum = xp.sum(nh_sel)

                    if nh_sum > 0:
                        gh_ndir[i][j][k, kk] = xp.sum(gh_sel * nh_sel) / nh_sum
                        lag_ndir[i][j][k, kk] = xp.sum(lags_sel * nh_sel) / nh_sum
                        nh_ndir[i][j][k, kk] = nh_sum
                    else:
                        gh_ndir[i][j][k, kk] = 0
                        lag_ndir[i][j][k, kk] = 0
                        nh_ndir[i][j][k, kk] = 0

    return gh_ndir, nh_ndir, lag_ndir

def ECDF(z, xp=np):
    """
    Transform data into empirical cumulative distribution values.
    Break ties randomly.
    """
    F = xp.full_like(z, xp.nan, dtype=float)
    idx = ~xp.isnan(z)
    zvals = z[idx] + xp.random.rand(xp.sum(idx))*1e-8
    rank = xp.argsort(xp.argsort(zvals))
    Fvals = rank / (len(zvals)-1)
    F[idx] = Fvals
    return F

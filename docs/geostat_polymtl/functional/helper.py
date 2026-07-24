import numpy as np

def grid(xmin, xmax, dx, ymin=None, ymax=None, dy=None, zmin=None, zmax=None, dz=None):
    """
    Generate a regular grid in 1D, 2D, or 3D depending on input arguments.
    
    Parameters
    ----------
    xmin, xmax, dx : float
        Grid limits and step for x axis.
    ymin, ymax, dy : float, optional
        Grid limits and step for y axis. If not provided, returns 1D grid.
    zmin, zmax, dz : float, optional
        Grid limits and step for z axis. If not provided, returns 2D grid.
    
    Returns
    -------
    grid : ndarray
        Grid points as an array of shape (n, d) where d=1,2,3.
    grid_size : tuple
        Number of grid points along each axis.
    """
    # 1D case
    x = np.arange(xmin, xmax + dx/2, dx)  # include xmax
    nx = len(x)
    if ymin is None or ymax is None or dy is None:
        return x[:, None], (nx,)

    # 2D case
    y = np.arange(ymin, ymax + dy/2, dy)
    ny = len(y)
    if zmin is None or zmax is None or dz is None:
        X, Y = np.meshgrid(x, y, indexing="ij")
        return np.column_stack([X.ravel(), Y.ravel()]), (nx, ny)

    # 3D case
    z = np.arange(zmin, zmax + dz/2, dz)
    nz = len(z)
    X, Y, Z = np.meshgrid(x, y, z, indexing="ij")
    return np.column_stack([X.ravel(), Y.ravel(), Z.ravel()]), (nx, ny, nz)

def means(x, xp=np):
    """
    Compute column-wise means (like MATLAB's custom MEANS).
    
    - If x is a column vector (2D with shape (n,1)), return scalar mean.
    - If x is a row vector (1,n), return the row unchanged.
    - If x is a matrix, return row vector of column means.
    
    Works with both NumPy and CuPy arrays.
    """

    m = x.shape[0]

    if m > 1:
        return xp.sum(x, axis=0) / m
    else:
        return x

def trans(cx, model, im, xp=np):
    """
    [cx, rot] = trans(cx, model, im)

    TRANS rotates and scales coordinates according to model specifications.
    Works for 1D, 2D, or 3D.

    Parameters
    ----------
    cx    : (n,d) array of coordinates
    model : (r,p) array, covariance model specification
    im    : index of the structure

    Returns
    -------
    cx    : transformed coordinates
    """
    cx = xp.array(cx, dtype=xp.float32)
    model = xp.array(model, dtype=xp.float32)
    _, d = cx.shape
    _, p = model.shape

    if d == 1:
        range_val = max(model[im,1], 1e-12)
        t = xp.array([[range_val]], dtype=xp.float32)
        rot = xp.array([[1]], dtype=xp.float32)
    elif p-1 > d:
        if d == 2:
            ang = model[im,3]
            cang = xp.cos(ang/180*xp.pi)
            sang = xp.sin(ang/180*xp.pi)
            rot = xp.array([[cang, -sang],[sang, cang]], dtype=xp.float32)
            dm = 2
        else:
            angz = model[im,6]; cangz = xp.cos(angz/180*xp.pi); sangz = xp.sin(angz/180*xp.pi)
            angy = model[im,5]; cangy = xp.cos(angy/180*xp.pi); sangy = xp.sin(angy/180*xp.pi)
            angx = model[im,4]; cangx = xp.cos(angx/180*xp.pi); sangx = xp.sin(angx/180*xp.pi)

            one = xp.array(1.0)
            zero = xp.array(0.0)

            rotx = xp.array([[one, zero, zero],
                 [zero, cangx, -sangx],
                 [zero, sangx,  cangx]], dtype=xp.float32)

            roty = xp.array([[cangy, zero, sangy],
                 [zero,  one,  zero],
                 [-sangy, zero, cangy]], dtype=xp.float32)

            rotz = xp.array([[cangz, -sangz, zero],
                 [sangz,  cangz, zero],
                 [zero,    zero,  one]], dtype=xp.float32)
                  
            rot = rotz @ roty @ rotx
            dm = 3

        cx[:, :dm] = cx[:, :dm] @ rot
        t = xp.diag(xp.concatenate([model[im,1:1+dm], xp.ones(d-dm)]))
    else:
        range_val = max(model[im,1], 1e-12)
        t = xp.eye(d, dtype=xp.float32) * range_val
        rot = xp.eye(d, dtype=xp.float32)

    cx = xp.linalg.solve(t, cx.T).T
    return cx
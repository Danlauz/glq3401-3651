import numpy as np
from scipy.special import kv as besselk, gamma
from geostat_polymtl.functional.helper import trans


def covar_nu(x, x0, model, c, vnu=None, xp=np):
    """
    Compute covariance matrices in VARIABLE BLOCK format (n1*p, n2*p), organized BY VARIABLE.

    Supports:
    1) Per-pair (N-LMC / p^2 models):
       - model is (p,p) dtype=object; each cell is an array of shape (r_ij, m)
       - c     is (p,p) dtype=object; each cell is scalar-like or array/list length r_ij
       - vnu   is (p,p) dtype=object or shared; each cell is scalar-like or array/list length r_ij (only for some types)

    2) Shared spatial model:
       - model is numeric ndarray of shape (r, m) used for all (i,j)
       - c is (p,p) dtype=object (preferred) with length r per cell, OR numeric (p,p) if r=1
       - vnu can be None or shared (r,) or (r,1), or (p,p) object.

    IMPORTANT: Model parameterization (Marcotte-style):
      1D: [type, range1]
      2D: [type, range1, range2, angle]
      3D: [type, range1, range2, range3, angle1, angle2, angle3]

    Convenience:
      - If p==1, you may pass c as a vector (r,) directly (no need for (1,1) object).
        Same for vnu.
    """

    # -------------------------
    # dims
    # -------------------------
    n1, d = x.shape
    n2, _ = x0.shape

    x  = xp.array(x,  dtype=xp.float32)
    x0 = xp.array(x0, dtype=xp.float32)

    # -------------------------
    # kernels
    # -------------------------
    Gam = [
        lambda h: (h == 0).astype(xp.float32),                                    # 1. Nugget
        lambda h: xp.exp(-h),                                                   # 2. Exponential
        lambda h: xp.exp(-(h)**2),                                              # 3. Gaussian
        lambda h: 1 - (1.5*xp.minimum(h, 1) - 0.5*xp.minimum(h, 1)**3),          # 4. Spherical
        lambda h: 1 - (7*xp.minimum(h, 1)**2 - 8.75*xp.minimum(h, 1)**3 +
                      3.5*xp.minimum(h, 1)**5 - 0.75*xp.minimum(h, 1)**7),       # 5. Cubic
        lambda h: (1 - 22/3*xp.minimum(h, 1)**2 + 33*xp.minimum(h, 1)**4 -
                  77/2*xp.minimum(h, 1)**5 + 33/2*xp.minimum(h, 1)**7 -
                  11/2*xp.minimum(h, 1)**9 + 5/6*xp.minimum(h, 1)**11),          # 6. Penta
        lambda h, nu: (h**2 + 1)**(-nu),                                          # 7. Cauchy
        lambda h, nu: (1 / (gamma(nu)*2**(nu-1))) *
                     (xp.maximum(h, 1e-16)**nu) * besselk(nu, xp.maximum(h, 1e-16)), # 8. Matérn
        lambda h: 1 - h,                                                          # 9. Linear
        lambda h: (h**2) * xp.log(xp.maximum(h, 1e-16)),                          # 10. Thin plate
        lambda h: xp.sin(xp.maximum(h, 1e-16)*2*xp.pi) /
                 (xp.maximum(h, 1e-16)*2*xp.pi),                                  # 11. Hole effect (sin)
        lambda h: xp.cos(h*2*xp.pi),                                              # 12. Hole effect (cos)
        lambda h: 1 - h**2/(1 + h**2),                                            # 13. Christakos
        lambda h, nu: (1 - xp.minimum(h, 1))**nu,                                 # 14. Wendland 0
        lambda h, nu: (1 + h*(nu+1))*(1 - xp.minimum(h, 1))**(nu+1),             # 15. Wendland 1
        lambda h, nu: (1 + h*(nu+2)/3 + h**2*(nu**2+4*nu+3)) *
                     (1 - xp.minimum(h, 1))**(nu+2),                              # 16. Wendland 2
        lambda h: ((h == 0).astype(xp.float32) +
                  (h < 1) * (((1-h)*xp.sin(2*xp.pi*h)) /
                            (2*xp.pi*xp.maximum(h, 1e-16)) +
                            (1-xp.cos(2*xp.pi*h)) /
                            (2*xp.pi**2*xp.maximum(h, 1e-16))))                   # 17. Bohman
    ]

    # -------------------------
    # detect mode + infer p
    # -------------------------
    per_pair_model = isinstance(model, np.ndarray) and model.dtype == object and model.ndim == 2

    if per_pair_model:
        p = model.shape[0]
        # We'll normalize c/vnu for p==1 later; for p>1 require (p,p) here
        if p > 1 and (not isinstance(c, np.ndarray) or c.shape != (p, p)):
            raise ValueError("If model is (p,p) object with p>1, c must also be (p,p).")
    else:
        # shared model: infer p from c (either p×p numeric or p×p object)
        if isinstance(c, np.ndarray) and c.ndim == 2 and c.shape[0] == c.shape[1]:
            p = c.shape[0]
        else:
            # allow p==1 convenience: c vector
            p = 1

    # -------------------------
    # Convenience normalization for p == 1:
    # allow c = np.array([..]) and/or vnu = np.array([..])
    # -------------------------
    if p == 1:
        if not (isinstance(c, np.ndarray) and c.dtype == object and c.shape == (1, 1)):
            c_wrap = np.empty((1, 1), dtype=object)
            c_wrap[0, 0] = c
            c = c_wrap

        if vnu is not None and not (isinstance(vnu, np.ndarray) and vnu.dtype == object and vnu.shape == (1, 1)):
            vnu_wrap = np.empty((1, 1), dtype=object)
            vnu_wrap[0, 0] = vnu
            vnu = vnu_wrap

        if per_pair_model and not (isinstance(model, np.ndarray) and model.dtype == object and model.shape == (1, 1)):
            # If someone passed a shared model but p==1, per_pair_model should be False.
            pass

    # After wrapping, we can safely infer p from model (per-pair) or from c (shared)
    if per_pair_model:
        p = model.shape[0]
    else:
        p = c.shape[0]  # (p,p) object or numeric; here it's guaranteed 2D

    # output
    K_var_block = xp.zeros((n1*p, n2*p), dtype=xp.float32)

    # -------------------------
    # helpers
    # -------------------------
    def _is_number(z):
        return isinstance(z, (int, float, np.integer, np.floating))

    def _flatten_model_cell(M):
        """
        Returns numpy array (r, m) float from:
          - ndarray (r,m)
          - list of rows [[...],[...]]
          - nested list of ndarrays [array(...), array(...)] (concatenated)
        """
        if M is None:
            return None

        if isinstance(M, np.ndarray):
            arr = M.astype(float, copy=False)
            if arr.ndim == 1:
                arr = arr.reshape(1, -1)
            return arr

        if isinstance(M, (list, tuple)):
            if len(M) == 0:
                return None

            # list of ndarrays -> vstack
            if all(isinstance(e, np.ndarray) for e in M):
                parts = []
                for e in M:
                    a = e.astype(float, copy=False)
                    if a.ndim == 1:
                        a = a.reshape(1, -1)
                    parts.append(a)
                return np.vstack(parts)

            # list of rows -> array
            if all(isinstance(e, (list, tuple, np.ndarray)) for e in M):
                return np.array(M, dtype=float)

            raise ValueError("model cell format not recognized.")

        raise ValueError("model cell type not recognized.")

    def _norm_model_array(M_np, d):
        """
        Enforce Marcotte-style parameterization:

        1D: [type, r1]
        2D: [type, r1, r2, ang]
        3D: [type, r1, r2, r3, a1, a2, a3]

        Completion:
          - missing ranges: repeat last provided range (or huge if none)
          - missing angles: 0
        """
        if M_np is None:
            return None

        M_np = np.asarray(M_np, dtype=float)
        if M_np.ndim == 1:
            M_np = M_np.reshape(1, -1)

        out = []
        for row in M_np:
            t = row[0]
            params = list(row[1:])

            if d == 1:
                if len(params) == 0:
                    params = [1e6]
                else:
                    params = params[:1]
                out.append([t] + params)

            elif d == 2:
                # need 3 params: r1,r2,ang
                if len(params) == 0:
                    params = [1e6, 1e6, 0.0]
                elif len(params) == 1:
                    r1 = params[0]
                    params = [r1, r1, 0.0]
                elif len(params) == 2:
                    r1, r2 = params
                    params = [r1, r2, 0.0]
                else:
                    params = params[:3]
                out.append([t] + params)

            elif d == 3:
                # need 6 params: r1,r2,r3,a1,a2,a3
                if len(params) == 0:
                    params = [1e6, 1e6, 1e6, 0.0, 0.0, 0.0]
                elif len(params) == 1:
                    r1 = params[0]
                    params = [r1, r1, r1, 0.0, 0.0, 0.0]
                elif len(params) == 2:
                    r1, r2 = params
                    params = [r1, r2, r2, 0.0, 0.0, 0.0]
                elif len(params) == 3:
                    r1, r2, r3 = params
                    params = [r1, r2, r3, 0.0, 0.0, 0.0]
                elif len(params) == 4:
                    r1, r2, r3, a1 = params
                    params = [r1, r2, r3, a1, 0.0, 0.0]
                elif len(params) == 5:
                    r1, r2, r3, a1, a2 = params
                    params = [r1, r2, r3, a1, a2, 0.0]
                else:
                    params = params[:6]
                out.append([t] + params)
            else:
                raise ValueError(f"Unsupported dimension d={d}")

        return np.array(out, dtype=float)

    def _flatten_vec_cell(A):
        if A is None:
            return None
        if _is_number(A):
            return np.array([float(A)], dtype=float)
        arr = np.asarray(A, dtype=float)
        return arr.reshape(-1)

    def _norm_vec(A, r):
        vec = _flatten_vec_cell(A)
        if vec is None:
            return None
        if vec.size == 1:
            return xp.full((r,), float(vec[0]), dtype=xp.float32)
        if vec.size != r:
            raise ValueError(f"Vector length mismatch: expected r={r} but got {int(vec.size)}.")
        return xp.array(vec, dtype=xp.float32)

    def _get_cell(mat, i, j):
        if mat is None:
            return None
        if isinstance(mat, np.ndarray) and mat.dtype == object:
            return mat[i, j]
        if isinstance(mat, np.ndarray) and mat.ndim == 2 and mat.shape == (p, p):
            return mat[i, j]
        return mat

    range_slice = slice(1, 1 + d)  # 1D: [1:2], 2D: [1:3], 3D: [1:4]

    # -------------------------
    # main loop
    # -------------------------
    for vi in range(p):
        for vj in range(p):

            # model for this pair (or shared)
            if per_pair_model:
                M_cell = model[vi, vj]
                if M_cell is None:
                    continue
                M_np = _flatten_model_cell(M_cell)
            else:
                M_np = _flatten_model_cell(model)

            M_np = _norm_model_array(M_np, d)
            M = xp.array(M_np, dtype=xp.float32)
            r = int(M.shape[0])

            # c and vnu
            c_cell = _get_cell(c, vi, vj)
            cvec = _norm_vec(c_cell, r)
            if cvec is None:
                raise ValueError(f"c[{vi},{vj}] is None but model is defined.")

            nu_cell = _get_cell(vnu, vi, vj)
            nuvec = _norm_vec(nu_cell, r) if nu_cell is not None else None

            # stabilize ranges
            for k in range(r):
                mtype = int(M[k, 0])
                if mtype == 1:  # nugget
                    M[k, range_slice] = 1e6
                else:
                    M[k, range_slice] = xp.maximum(M[k, range_slice], 2e-8)

            # accumulate structures
            K_ij = xp.zeros((n1, n2), dtype=xp.float32)

            for k in range(r):
                t1 = trans(x[:, :d], M, k, xp=xp)
                t2 = trans(x0,       M, k, xp=xp)

                h = xp.zeros((n1, n2), dtype=xp.float32)
                for idim in range(d):
                    h += (t1[:, idim][:, None] - t2[:, idim][None, :])**2
                h = xp.sqrt(h)

                mtype = int(M[k, 0])
                gh = Gam[mtype - 1]

                if mtype in [7, 8, 14, 15, 16]:
                    if nuvec is None:
                        raise ValueError(f"Model type {mtype} needs vnu at pair ({vi},{vj}).")
                    g = gh(h, float(nuvec[k]))
                else:
                    g = gh(h)

                K_ij += cvec[k] * g

            rs, re = vi*n1, (vi+1)*n1
            cs, ce = vj*n2, (vj+1)*n2
            K_var_block[rs:re, cs:ce] = K_ij

    return K_var_block


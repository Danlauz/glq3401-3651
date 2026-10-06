import numpy as np

from geostat_polymtl.functional.helper import means
from geostat_polymtl.cov_func.covar_nu import covar_nu as covar


def _is_nonlinear_model(model):
    if isinstance(model, np.ndarray) and model.dtype == object and model.ndim == 2:
        return True
    if isinstance(model, (list, tuple)):
        if len(model) == 0:
            return False
        first = model[0]
        if isinstance(first, (list, tuple, np.ndarray)) and len(first) > 0:
            if isinstance(first[0], (int, float, np.integer, np.floating)):
                return False
            return True
        return True
    return False


def _c_to_object_lmc(c, nu):
    c = np.asarray(c)
    if c.ndim == 3:
        r, p, _ = c.shape
        c3 = c
        nu3 = None if nu is None else np.asarray(nu)
        if nu3 is not None:
            if nu3.ndim == 3 and nu3.shape == (r, p, p):
                pass
            elif nu3.ndim == 2 and nu3.shape == (r * p, p):
                nu3 = nu3.reshape(r, p, p)
            else:
                raise ValueError("nu must be (r,p,p) or (rp,p) when c is (r,p,p).")
    elif c.ndim == 2:
        rp, p = c.shape
        if rp % p != 0:
            raise ValueError("c shape (rp,p) requires rp multiple of p.")
        r = rp // p
        c3 = c.reshape(r, p, p)
        nu3 = None if nu is None else np.asarray(nu)
        if nu3 is not None:
            if nu3.ndim == 2 and nu3.shape == (rp, p):
                nu3 = nu3.reshape(r, p, p)
            elif nu3.ndim == 3 and nu3.shape == (r, p, p):
                pass
            else:
                raise ValueError("nu must be (rp,p) or (r,p,p) when c is (rp,p).")
    else:
        raise ValueError("c must be (r,p,p) or (rp,p) or (p,p) object.")
    c_obj = np.empty((p, p), dtype=object)
    nu_obj = None if nu is None else np.empty((p, p), dtype=object)
    for i in range(p):
        for j in range(p):
            c_obj[i, j] = np.asarray(c3[:, i, j], dtype=float)
            if nu_obj is not None:
                nu_obj[i, j] = np.asarray(nu3[:, i, j], dtype=float)
    return c_obj, nu_obj, p, r


def _ensure_covar_format(c, nu, p_expected=None):
    if isinstance(c, np.ndarray) and c.dtype == object and c.ndim == 2:
        p = c.shape[0]
        if p_expected is not None and p != p_expected:
            raise ValueError(f"c has p={p} but expected p={p_expected}.")
        return c, nu, p
    if p_expected == 1 and not (isinstance(c, np.ndarray) and c.ndim in (2,3)):
        c_obj = np.empty((1, 1), dtype=object)
        c_obj[0, 0] = c
        if nu is None:
            nu_obj = None
        else:
            nu_obj = np.empty((1, 1), dtype=object)
            nu_obj[0, 0] = nu
        return c_obj, nu_obj, 1
    c_obj, nu_obj, p, _ = _c_to_object_lmc(c, nu)
    if p_expected is not None and p != p_expected:
        raise ValueError(f"c implies p={p} but expected p={p_expected}.")
    return c_obj, nu_obj, p


def cokri(x, x0, model, c, nu, itype, avg, block, nd, ival, nk, rad, ntok, device="cpu"):
    """Point or block cokriging in D dimensions of P variables."""
    if device != "cpu":
        raise ImportError("GPU not programmed yet")
    xp = np
    m, d = x0.shape
    if len(block) != d:
        raise ValueError(f"block must have length d={d}, got {len(block)}")
    if len(nd) != d:
        raise ValueError(f"nd must have length d={d}, got {len(nd)}")
    if ival >= 1:
        ntok = 1
        x0 = x[:, :d]
        nd = xp.ones(d, dtype=int)
        m, d = x0.shape
    n, dp = x.shape
    p = dp - d
    if p <= 0:
        raise ValueError("x must be (n, d+p) with p>=1.")
    nk = min(nk, n)
    ntok = min(ntok, m)
    ng = int(xp.prod(nd))

    t2 = []
    for i in range(d):
        nl = int(xp.prod(nd[:i])) if i > 0 else 1
        nr = int(xp.prod(nd[i+1:])) if i < d - 1 else 1
        tt = xp.linspace(0.5 * (1 / nd[i] - 1), 0.5 * (1 - 1 / nd[i]), nd[i]).reshape(-1, 1)
        t2.append(xp.kron(xp.ones((nl, 1)), xp.kron(tt, xp.ones((nr, 1)))))
    grid = xp.hstack(t2) * block
    if ng > 1:
        grid = grid + block / (ng * 1e6)

    c_obj, nu_obj, _p = _ensure_covar_format(c, nu, p_expected=p)

    Kgg = covar(grid, grid, model, c_obj, nu_obj, xp=xp)
    sv = xp.array([
        xp.mean(xp.mean(Kgg[i*ng:(i+1)*ng, i*ng:(i+1)*ng], axis=1))
        for i in range(p)
    ])

    x0s_list, s_list = [], []
    id_matrix_out = None
    lsys = ksys = k0sys = None
    idp = xp.arange(1, p+1).reshape(-1, 1)

    for i0 in range(0, m, ntok):
        nnx = min(m - i0, ntok)
        centx0 = xp.mean(x0[i0:i0+nnx, :], axis=0)
        tx = (x[:, :d] - centx0)**2
        tx_sum = xp.sum(tx, axis=1)
        j_sorted = xp.argsort(tx_sum)
        id_matrix = []
        tlist = []
        ii = 0
        while ii < nk and tx_sum[j_sorted[ii]] < rad**2:
            tlist.append(x[j_sorted[ii], :])
            id_matrix.append(xp.hstack([xp.ones((p, 1)) * j_sorted[ii], idp]))
            ii += 1
        if len(tlist) == 0:
            continue
        tdat = xp.vstack(tlist)
        t2_block = xp.kron(x0[i0:i0+nnx, :], xp.ones((ng, 1))) - xp.kron(xp.ones((nnx, 1)), grid)
        if ival >= 1:
            est = xp.zeros((1, p))
            sest = xp.zeros((1, p))
            np_var = 1 if ival == 1 else p
            for ip in range(0, p, np_var):
                vtemp = tdat[0, d+ip:d+ip+np_var].copy()
                tdat[0, d+ip:d+ip+np_var] = xp.nan
                x0ss, ss, idout, lsys, ksys, k0sys = cokri2(
                    tdat, t2_block, id_matrix, model, c_obj, nu_obj, sv,
                    itype, avg, ng, xp
                )
                est[0, ip:ip+np_var] = x0ss[0, ip:ip+np_var]
                sest[0, ip:ip+np_var] = ss[0, ip:ip+np_var]
                tdat[0, d+ip:d+ip+np_var] = vtemp
            x0s_list.append(xp.hstack([t2_block[:1, :], est]))
            s_list.append(xp.hstack([t2_block[:1, :], sest]))
        else:
            x0ss, ss, idout, lsys, ksys, k0sys = cokri2(
                tdat, t2_block, id_matrix, model, c_obj, nu_obj, sv,
                itype, avg, ng, xp
            )
            x0s_list.append(xp.hstack([x0[i0:i0+nnx, :], x0ss]))
            s_list.append(xp.hstack([x0[i0:i0+nnx, :], ss]))
        id_matrix_out = idout

    x0s_out = xp.vstack(x0s_list) if len(x0s_list) else xp.empty((0, d+p))
    s_out = xp.vstack(s_list) if len(s_list) else xp.empty((0, d+p))
    return x0s_out, s_out, sv, id_matrix_out, lsys, ksys, k0sys


def cokri2(x, x0, idx, model, c_obj, nu_obj, sv, itype, avg, ng, xp=np):
    """Build the cokriging system using only observed data."""
    n, dp = x.shape
    m, d = x0.shape
    p = dp - d
    if p <= 0:
        raise ValueError("x must be (n, d+p) with p>=1.")

    vals = x[:, d:d+p]
    mask_obs = ~xp.isnan(vals)
    obs_idx = []
    active_parts = []
    for vi in range(p):
        ai = xp.where(mask_obs[:, vi])[0]
        obs_idx.append(ai)
        if ai.size > 0:
            active_parts.append(vi * n + ai)

    if len(active_parts) == 0:
        m_eff = (m // ng) if ng > 1 else m
        x0s_nan = xp.full((m_eff, p), xp.nan)
        s_nan = xp.full((m_eff, p), xp.nan)
        return x0s_nan, s_nan, idx, xp.empty((0, 0)), xp.empty((0, 0)), xp.empty((0, 0))

    active = xp.concatenate(active_parts)
    nz = int(active.size)

    t = (vals - avg) if itype < 3 else vals
    z_full = xp.array(t.T).ravel()
    z = z_full[active]

    K_full = covar(x[:, :d], x[:, :d], model, c_obj, nu_obj, xp=xp)
    K0_full = covar(x[:, :d], x0, model, c_obj, nu_obj, xp=xp)
    K_data = K_full[xp.ix_(active, active)]
    K0_data = K0_full[active, :]

    nc = 0
    A = K_data
    B = K0_data

    if itype == 2:
        ones = xp.ones((nz, 1), dtype=A.dtype)
        A = xp.block([[A, ones], [ones.T, xp.zeros((1, 1), dtype=A.dtype)]])
        B = xp.vstack([B, xp.ones((1, B.shape[1]), dtype=B.dtype)])
        nc = 1
    elif itype >= 3:
        present_vars = [vi for vi in range(p) if int(obs_idx[vi].size) > 0]
        pc = len(present_vars)
        if pc > 0:
            T = xp.zeros((pc, nz), dtype=A.dtype)
            cursor = 0
            row = 0
            for vi in range(p):
                ni = int(obs_idx[vi].size)
                if ni == 0:
                    continue
                if vi in present_vars:
                    T[row, cursor:cursor+ni] = 1.0
                    row += 1
                cursor += ni
            A = xp.block([[A, T.T], [T, xp.zeros((pc, pc), dtype=A.dtype)]])
            C_rhs = xp.zeros((pc, B.shape[1]), dtype=B.dtype)
            for row, vi in enumerate(present_vars):
                C_rhs[row, vi*m:(vi+1)*m] = 1.0
            B = xp.vstack([B, C_rhs])
            nc = pc

        if itype >= 4:
            X = x[:, :d]
            A_full = xp.kron(xp.eye(p), X)
            A_red = A_full[active, :]
            A = xp.block([[A, xp.vstack([A_red, xp.zeros((nc, p*d), dtype=A.dtype)] )],
                          [xp.hstack([A_red.T, xp.zeros((p*d, nc + p*d), dtype=A.dtype)])]])
            A0_full = xp.kron(xp.eye(p), x0)
            B = xp.vstack([B, A0_full.T])
            nc = nc + p*d

        if itype == 5:
            X = x[:, :d]
            terms = []
            for i in range(d):
                for j in range(i, d):
                    terms.append((X[:, i] * X[:, j]).reshape(-1, 1))
            X2 = xp.hstack(terms)
            q = X2.shape[1]
            A2_full = xp.kron(xp.eye(p), X2)
            A2_red = A2_full[active, :]
            A = xp.block([[A, xp.vstack([A2_red, xp.zeros((nc, p*q), dtype=A.dtype)])],
                          [xp.hstack([A2_red.T, xp.zeros((p*q, nc + p*q), dtype=A.dtype)])]])
            X0 = x0
            terms0 = []
            for i in range(d):
                for j in range(i, d):
                    terms0.append((X0[:, i] * X0[:, j]).reshape(-1, 1))
            X02 = xp.hstack(terms0)
            A20_full = xp.kron(xp.eye(p), X02)
            B = xp.vstack([B, A20_full.T])
            nc = nc + p*q

    if ng > 1:
        m_block = m // ng
        full_B = B
        B_new = xp.zeros((full_B.shape[0], m_block * p), dtype=full_B.dtype)
        out_col = 0
        for ip in range(p):
            base = ip * m
            for ib in range(m_block):
                cols = xp.arange(base + ib*ng, base + (ib+1)*ng)
                B_new[:, out_col] = xp.mean(full_B[:, cols], axis=1)
                out_col += 1
        B = B_new
        m_eff = m_block
    else:
        m_eff = m

    l = xp.linalg.solve(A, B)

    t2 = l[:nz, :].T @ z
    est = t2.reshape((m_eff, p), order="F")
    x0s = est + avg if itype < 3 else est

    s = xp.tile(sv, (m_eff, 1)) if np.size(sv) else xp.zeros((m_eff, p))
    diag_term = xp.diag(l.T @ B)
    tvar = diag_term.reshape((m_eff, p), order="F")
    s = s - tvar

    idx_array = xp.vstack(idx) if idx is not None else None
    return x0s, s, idx_array, l, A, B

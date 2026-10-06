// scripts/geostat-js/widgets/c12_contaminant.js
// -----------------------------------------------------------------------------
// Widget C12.4 — Application : site pollué, SIMULATIONS vs KRIGEAGE.
//
// Copie conforme de l'atelier 11.4 (KI vs KO), où le KI est remplacé par des
// SIMULATIONS CONDITIONNELLES :
//   - Ligne 1 : la référence (vérité).
//   - Ligne 2 : krigeage (KO) — teneur estimée Z* et variance σ²_KO.
//   - Ligne 3 : simulations conditionnelles — moyenne E-type E[Z|x] et variance
//     entre réalisations Var[Z|x].
// Bilan : quantité de sol contaminé (Z > z_c) selon vérité / KO / simulations.
//
// Cliquez la carte de référence pour ajouter/retirer un sondage. Simulations
// conditionnelles par anamorphose gaussienne + post-conditionnement (krigeage
// simple). Cas gaussien : anamorphose en scores normaux (moyenne = médiane = 3).
// -----------------------------------------------------------------------------
import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

const debounce = (fn, ms = 300) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const N = 100, NDATA = 16;
const RSCALE = N / 26;
function invNorm(p) {
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0, -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0, 3.754408661907416e0];
  const plow = 0.02425, phigh = 1 - plow; let q, r;
  if (p < plow) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p <= phigh) { q = p - 0.5; r = q * q; return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
  q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
}
const TURBO = [
  [0.0, 'rgb(48,18,59)'], [0.1, 'rgb(65,69,217)'], [0.2, 'rgb(35,138,244)'], [0.3, 'rgb(30,192,211)'],
  [0.4, 'rgb(53,226,149)'], [0.5, 'rgb(131,246,88)'], [0.6, 'rgb(199,233,47)'], [0.7, 'rgb(248,186,56)'],
  [0.8, 'rgb(251,122,33)'], [0.9, 'rgb(221,61,8)'], [1.0, 'rgb(122,4,3)'],
];
// Covariance sphérique du modèle (palier 1) pour le krigeage simple du post-conditionnement.
function covSph(h, a) { const t = h / a; return h >= a ? 0 : 1 - (1.5 * t - 0.5 * t * t * t); }
function invert(M) {
  const n = M.length, A = M.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    const piv = A[c][c] || 1e-12;
    for (let k = 0; k < 2 * n; k++) A[c][k] /= piv;
    for (let r = 0; r < n; r++) if (r !== c) { const f = A[r][c]; for (let k = 0; k < 2 * n; k++) A[r][k] -= f * A[c][k]; }
  }
  return A.map(r => r.slice(n));
}

export default class C12Contaminant extends Widget {
  render() {
    this.seed = 12; this.clickBound = false;
    const id = this.el.id;
    this.el.insertAdjacentHTML('beforeend', `
      <style>#${id} .gw-controls label{display:inline-flex !important;flex-direction:row !important;align-items:center;gap:5px;}</style>
      <div class="gw-controls" style="display:flex;flex-wrap:wrap;gap:14px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;">
        <label>Loi du contaminant <select class="js-loi">
          <option value="gaussien">Gaussienne</option>
          <option value="lognormal" selected>Log-normale</option>
        </select></label>
        <label>Portée a <input type="range" class="js-a" min="6" max="30" value="16" step="1" style="width:100px"><span class="js-av">16</span></label>
        <label>Seuil de contamination z<sub>c</sub> <input type="range" class="js-zc" min="0" max="10" value="5" step="0.1" style="width:140px"><span class="js-zcv">5.0</span></label>
        <label>Simulations <input type="range" class="js-nb" min="10" max="100" value="40" step="10" style="width:100px"><span class="js-nbv">40</span></label>
        <button class="js-regen" type="button" style="font-size:.78rem;padding:4px 10px;background:#3a3632;color:#fff;border:none;border-radius:5px;cursor:pointer;">Nouveau site</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px;">
        <div class="js-plot-ref" style="grid-column:1/3;height:215px;cursor:crosshair;"></div>
        <div class="js-plot-ko" style="height:195px"></div>
        <div class="js-plot-kovar" style="height:195px"></div>
        <div class="js-plot-simmean" style="height:195px"></div>
        <div class="js-plot-simvar" style="height:195px"></div>
      </div>
      <div class="js-info" style="padding:.5rem 1rem;font-size:.84rem;color:#333;text-align:center;background:#eef2f7;border:1px solid #c4d2e0;border-radius:6px;margin-top:8px;">—</div>
      <p style="margin:4px 1rem;font-size:11px;color:#666;">
        <b>Cliquez la carte de référence</b> pour forer un nouveau sondage (révèle la vraie teneur) ou cliquez un sondage pour le retirer. σ²<sub>KO</sub> = erreur d'estimation (géométrie). Var[Z|x] = dispersion entre les simulations conditionnelles. Le bilan compare la <b>quantité de sol contaminé</b> (Z &gt; z<sub>c</sub>) à la vérité.</p>
    `);
    this.plots = {
      ref: this.el.querySelector('.js-plot-ref'), ko: this.el.querySelector('.js-plot-ko'),
      kovar: this.el.querySelector('.js-plot-kovar'), simmean: this.el.querySelector('.js-plot-simmean'),
      simvar: this.el.querySelector('.js-plot-simvar'),
    };
    this.infoEl = this.el.querySelector('.js-info');
    this.ctrl = { loi: this.el.querySelector('.js-loi'), a: this.el.querySelector('.js-a'), zc: this.el.querySelector('.js-zc'), nb: this.el.querySelector('.js-nb') };
    const heavy = debounce(() => this._simulate().then(() => this._krige()).then(() => this.drawZc()), 300);
    this.on(this.ctrl.loi, 'change', heavy);
    this.on(this.ctrl.a, 'input', e => { this.el.querySelector('.js-av').textContent = e.target.value; heavy(); });
    this.on(this.ctrl.nb, 'input', e => { this.el.querySelector('.js-nbv').textContent = e.target.value; this._krige().then(() => this.drawZc()); });
    this.on(this.ctrl.zc, 'input', e => { this.el.querySelector('.js-zcv').textContent = parseFloat(e.target.value).toFixed(1); this.drawZc(); });
    this.on(this.el.querySelector('.js-regen'), 'click', () => { this.seed = Math.floor(Math.random() * 1e6); heavy(); });
    afficherChargementJusquaPret(this.el).then(() => this._simulate()).then(() => this._krige()).then(() => this.drawZc());
  }

  _anam(loi) {
    if (loi === 'lognormal') {
      const mean = 2.0, varr = 7.0, s2 = Math.log(1 + varr / (mean * mean)), mu = Math.log(mean) - 0.5 * s2, sig = Math.sqrt(s2);
      return { fwd: z => (Math.log(Math.max(1e-6, z)) - mu) / sig, inv: y => Math.exp(mu + sig * y) };
    }
    const m = 3.0, sd = Math.sqrt(1.3);
    return { fwd: z => (z - m) / sd, inv: y => m + sd * y };
  }

  async _simulate() {
    const loi = this.ctrl.loi.value, a = parseFloat(this.ctrl.a.value) * RSCALE;
    const params = loi === 'lognormal' ? [2.0, 7.0] : [3.0, 1.3];
    let flat;
    try { flat = await gpoly.simulerChamp('spherique', a, 0, this.seed, N, loi, params[0], params[1]); }
    catch (e) { this.afficherAvertissement('Erreur simulation : ' + e.message); return; }
    const F = []; for (let j = 0; j < N; j++) { const r = []; for (let i = 0; i < N; i++) r.push(flat[j * N + i]); F.push(r); }
    const medOf = arr => { const s = [...arr].sort((p, q) => p - q), n = s.length; return n % 2 ? s[(n - 1) / 2] : 0.5 * (s[n / 2 - 1] + s[n / 2]); };
    // Gaussienne : anamorphose en scores normaux → moyenne = médiane = 3 exactement.
    if (loi === 'gaussien') {
      const n = N * N, sd = Math.sqrt(params[1]);
      const order = [...Array(n).keys()].sort((p, q) => flat[p] - flat[q]);
      order.forEach((cell, rank) => { F[Math.floor(cell / N)][cell % N] = params[0] + sd * invNorm((rank + 0.5) / n); });
    }
    this.F = F; this.xs = Array.from({ length: N }, (_, i) => i + 0.5);
    const flatF = F.flat(), sortF = [...flatF].sort((p, q) => p - q);
    this.cmin = (loi === 'lognormal') ? 0 : Math.min(0, sortF[0]);
    const qf = p => sortF[Math.max(0, Math.min(sortF.length - 1, Math.floor(p * sortF.length)))];
    this.q98 = qf(0.98);
    this.champMean = flatF.reduce((p, q) => p + q, 0) / (N * N);
    this.champMed = medOf(flatF);
    // Sondages initiaux.
    let s = (this.seed ^ 0x5bd1e995) >>> 0;
    const rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    const vus = new Set(), data = [];
    while (data.length < NDATA) {
      const i = Math.floor(rng() * N), j = Math.floor(rng() * N), key = j * N + i;
      if (vus.has(key)) continue; vus.add(key);
      data.push({ x: i + 0.5, y: j + 0.5, z: F[j][i] });
    }
    this.donnees = data;
  }

  async _krige() {
    if (!this.F) return;
    const a = parseFloat(this.ctrl.a.value) * RSCALE, loi = this.ctrl.loi.value, nbsim = parseInt(this.ctrl.nb.value, 10);
    const xd = this.donnees.map(d => [d.x, d.y]), zd = this.donnees.map(d => d.z), nd = this.donnees.length, M = N * N;
    const varOf = arr => { const m = arr.reduce((x, y) => x + y, 0) / arr.length; return arr.reduce((x, y) => x + (y - m) ** 2, 0) / arr.length; };
    const cibles = []; for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) cibles.push([this.xs[i], this.xs[j]]);

    let sim;
    try {
      const rko = await gpoly.krigeageGrilleGlobale(xd, zd, cibles, [{ modele: 'spherique', palier: Math.max(0.01, varOf(zd)), portee: a }], 0.0);
      this.KO = rko.estimations; this.KOvar = rko.variances;
      sim = await gpoly.simulerNRealisations('spherique', a, 1, this.seed + 1, N, nbsim, 'FFTMA');
    } catch (e) { this.afficherAvertissement('Erreur : ' + e.message); return; }

    // ---- Post-conditionnement par krigeage simple (espace gaussien / anamorphose) ----
    const anam = this._anam(loi);
    const Yobs = zd.map(anam.fwd);
    const dCell = this.donnees.map(d => Math.floor(d.y) * N + Math.floor(d.x));
    // Matrice de poids W + Y*_obs.
    const Kmat = []; for (let r = 0; r < nd; r++) { Kmat.push([]); for (let c = 0; c < nd; c++) Kmat[r].push(covSph(Math.hypot(this.donnees[r].x - this.donnees[c].x, this.donnees[r].y - this.donnees[c].y), a) + (r === c ? 1e-9 : 0)); }
    const Kinv = invert(Kmat);
    const W = new Array(M), Ystar = new Float64Array(M);
    for (let c = 0; c < M; c++) {
      const cx = (c % N) + 0.5, cy = ((c / N) | 0) + 0.5;
      const k0 = this.donnees.map(d => covSph(Math.hypot(cx - d.x, cy - d.y), a));
      const w = Kinv.map(row => row.reduce((s, v, j) => s + v * k0[j], 0));
      W[c] = w; let ys = 0; for (let i = 0; i < nd; i++) ys += w[i] * Yobs[i]; Ystar[c] = ys;
    }
    // Réalisations conditionnelles + E-type + variance.
    const flatS = sim.realisations_flat;
    const mean = new Float64Array(M), m2 = new Float64Array(M);
    this.Zsims = [];
    for (let s = 0; s < nbsim; s++) {
      const off = s * M, dAt = dCell.map(c => flatS[off + c]), Zsc = new Float64Array(M);
      for (let c = 0; c < M; c++) {
        let yk = 0; const w = W[c]; for (let i = 0; i < nd; i++) yk += w[i] * dAt[i];
        const v = anam.inv(flatS[off + c] - yk + Ystar[c]);
        Zsc[c] = v; mean[c] += v; m2[c] += v * v;
      }
      this.Zsims.push(Zsc);
    }
    for (let c = 0; c < M; c++) mean[c] /= nbsim;
    this.SIMmean = mean;
    this.SIMvar = new Float64Array(M); for (let c = 0; c < M; c++) this.SIMvar[c] = Math.max(0, m2[c] / nbsim - mean[c] ** 2);

    const cmax = this.q98;
    // Échelle de variance PARTAGÉE entre σ²_KO et Var[Z|x] (pour les comparer),
    // mais ROBUSTE (97ᵉ percentile des deux ensembles combinés) afin que les points
    // chauds extrêmes (queue log-normale) n'écrasent pas la lecture.
    const both = [...this.KOvar, ...this.SIMvar].filter(isFinite).sort((p, q) => p - q);
    const vmax = Math.max(1e-6, both[Math.floor(0.97 * (both.length - 1))]);
    this._map('ref', this.F, TURBO, this.cmin, cmax, `Référence (vérité) · moyenne = ${this.champMean.toFixed(2)} · médiane = ${this.champMed.toFixed(2)}`);
    this._map('ko', this._rs(this.KO), TURBO, this.cmin, cmax, 'KO — teneur estimée Z*');
    this._map('kovar', this._rs(this.KOvar), 'Viridis', 0, vmax, 'KO — variance σ²<sub>KO</sub> (erreur)');
    this._map('simmean', this._rs(this.SIMmean), TURBO, this.cmin, cmax, 'Simulations — moyenne E[Z|x]');
    this._map('simvar', this._rs(this.SIMvar), 'Viridis', 0, vmax, 'Simulations — variance Var[Z|x]');

    if (!this.clickBound) { this.on(this.plots.ref, 'click', e => this._onClick(e)); this.clickBound = true; }
  }

  _rs(flat) { const M = []; for (let j = 0; j < N; j++) { const r = []; for (let i = 0; i < N; i++) r.push(flat[j * N + i]); M.push(r); } return M; }

  _map(key, Z, scale, zmin, zmax, titre) {
    if (!window.Plotly || !this.donnees) return;
    Plotly.react(this.plots[key], [
      { type: 'heatmap', z: Z, x: this.xs, y: this.xs, colorscale: scale, zmin, zmax, colorbar: { thickness: 10, len: 0.85 } },
      { x: this.donnees.map(d => d.x), y: this.donnees.map(d => d.y), mode: 'markers', marker: { color: '#fff', size: 6, line: { color: '#000', width: 1 } }, showlegend: false, hoverinfo: 'skip' },
    ], {
      margin: { t: 26, l: 20, r: 52, b: 16 }, title: { text: titre, font: { size: 11.5 }, y: 0.98 }, dragmode: false,
      xaxis: { range: [0, N], showticklabels: false, scaleanchor: 'y', constrain: 'domain' },
      yaxis: { range: [0, N], showticklabels: false },
    }, { displaylogo: false, responsive: true, displayModeBar: false });
  }

  _onClick(e) {
    const fl = this.plots.ref._fullLayout; if (!fl || !fl.xaxis || !fl.yaxis) return;
    const rect = this.plots.ref.getBoundingClientRect();
    const xv = fl.xaxis.p2d(e.clientX - rect.left - fl.xaxis._offset);
    const yv = fl.yaxis.p2d(e.clientY - rect.top - fl.yaxis._offset);
    const i = Math.floor(xv), j = Math.floor(yv);
    if (i < 0 || i >= N || j < 0 || j >= N) return;
    let near = -1; this.donnees.forEach((d, k) => { if (Math.hypot(d.x - (i + 0.5), d.y - (j + 0.5)) < 1.1) near = k; });
    if (near >= 0) { if (this.donnees.length > 3) this.donnees.splice(near, 1); }
    else this.donnees.push({ x: i + 0.5, y: j + 0.5, z: this.F[j][i] });
    this._krige().then(() => this.drawZc());
  }

  drawZc() {
    if (!this.Zsims) return;
    const zc = parseFloat(this.ctrl.zc.value), tot = N * N;
    const vraie = this.F.flat().filter(v => v > zc).length / tot;
    const parKO = this.KO.filter(v => v > zc).length / tot;
    let cnt = 0; for (const Z of this.Zsims) for (let c = 0; c < tot; c++) if (Z[c] > zc) cnt++;
    const parSim = cnt / (this.Zsims.length * tot);
    const pct = x => (100 * x).toFixed(1) + ' %';
    this.infoEl.innerHTML =
      `<b>Sol contaminé (Z &gt; ${zc.toFixed(1)})</b> · ${this.donnees.length} sondages &nbsp;·&nbsp; ` +
      `vérité = <b>${pct(vraie)}</b> &nbsp;|&nbsp; ` +
      `<span style="color:#2c6fbf">KO (seuillage Z*) = <b>${pct(parKO)}</b></span> &nbsp;|&nbsp; ` +
      `<span style="color:#1f8a4c">Simulations (P(Z&gt;z<sub>c</sub>)) = <b>${pct(parSim)}</b></span>`;
  }

  cleanup() { if (window.Plotly) Object.values(this.plots).forEach(p => p && Plotly.purge(p)); }
}

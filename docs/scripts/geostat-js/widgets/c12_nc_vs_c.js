// scripts/geostat-js/widgets/c12_nc_vs_c.js
// -----------------------------------------------------------------------------
// Widget C12.3 — Simulations NON CONDITIONNELLES vs CONDITIONNELLES (1D).
//
// Panneau 2×2 (gauche : toutes les réalisations en gris pâle + leur moyenne ;
// droite : la variance entre réalisations) :
//   - Ligne du HAUT (non conditionnel) : la moyenne → 0, la variance → 1
//     (E[Z_s] = m = 0, Var[Z_s] = σ² = 1).
//   - Ligne du BAS (conditionnel, post-conditionnement par krigeage) : toutes les
//     réalisations passent par les données ; la moyenne → krigeage simple Z*_KS,
//     la variance → variance de krigeage σ²_KS (nulle aux données).
//
// Post-conditionnement : Z_sc = Z_s + (Z*_obs − Z*_s). Le krigeage étant linéaire,
// la même matrice de poids W sert pour Z*_obs et Z*_s (un seul krigeage).
// -----------------------------------------------------------------------------
import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';
const debounce = (fn, ms = 350) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const L = 121;
const DATA_IDX = [10, 28, 46, 62, 84, 104];

// Covariance du modèle (palier 1, portée pratique a).
function covModele(mod, h, a) {
  const t = h / a;
  let g;
  if (mod === 'spherique') g = h >= a ? 1 : 1.5 * t - 0.5 * t * t * t;
  else if (mod === 'exponentiel') g = 1 - Math.exp(-3 * t);
  else g = 1 - Math.exp(-3 * t * t);
  return 1 - g;                              // C(h) = palier − γ(h)
}
// Inverse d'une petite matrice (Gauss-Jordan).
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

export default class C12NCvsC extends Widget {
  render() {
    const id = this.el.id;
    this.seed = 100; this.showKS = true;
    this.el.insertAdjacentHTML('beforeend', `
      <style>#${id} .gw-controls label{display:inline-flex !important;flex-direction:row !important;align-items:center;gap:5px;}
        #${id} .gw-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px;}
        #${id} .gw-grid > div{height:230px;}</style>
      <div class="gw-controls" style="display:flex;flex-wrap:wrap;gap:14px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;">
        <label>Modèle <select class="js-mod">
          <option value="spherique">Sphérique</option>
          <option value="exponentiel">Exponentiel</option>
          <option value="gaussien">Gaussien</option>
        </select></label>
        <label>Portée a <input type="range" class="js-a" min="8" max="45" value="22" step="1" style="width:110px"><span class="js-av">22</span></label>
        <label>Nombre de réalisations <input type="range" class="js-nb" min="1" max="1000" value="50" step="1" style="width:170px"><span class="js-nbv">50</span></label>
        <button class="js-ks" type="button" style="font-size:.78rem;padding:4px 10px;background:#d62728;color:#fff;border:none;border-radius:5px;cursor:pointer;">Référence krigeage : ON</button>
        <button class="js-regen" type="button" style="font-size:.78rem;padding:4px 10px;background:#3a3632;color:#fff;border:none;border-radius:5px;cursor:pointer;">Nouveau tirage</button>
      </div>
      <div class="gw-grid">
        <div class="js-p-nc-r"></div><div class="js-p-nc-v"></div>
        <div class="js-p-c-r"></div><div class="js-p-c-v"></div>
      </div>
      <div class="js-info" style="padding:.45rem 1rem;font-family:'JetBrains Mono',monospace;font-size:.8rem;color:#333;text-align:center;background:#eef2f7;border:1px solid #c4d2e0;border-radius:6px;margin-top:6px;">—</div>
      <p style="margin:4px 1rem;font-size:11px;color:#666;">
        Gauche : toutes les réalisations (gris pâle) + leur <b>moyenne empirique</b> (noir fin pointillé). Droite : la variance entre réalisations. La <b style="color:#d62728">cible théorique</b> (rouge épais) : haut (non conditionnel) → moyenne <b>0</b>, variance <b>1</b> ; bas (conditionnel) → <b style="color:#d62728">krigeage simple Z*</b> (passe par les données ●) et <b style="color:#d62728">σ²<sub>KS</sub></b> (nulle aux données). Échelles fixes.</p>
    `);
    this.P = {
      ncr: this.el.querySelector('.js-p-nc-r'), ncv: this.el.querySelector('.js-p-nc-v'),
      cr: this.el.querySelector('.js-p-c-r'), cv: this.el.querySelector('.js-p-c-v'),
    };
    this.infoEl = this.el.querySelector('.js-info');
    this.ctrl = { mod: this.el.querySelector('.js-mod'), a: this.el.querySelector('.js-a'), nb: this.el.querySelector('.js-nb') };
    const upd = debounce(() => this.refresh(), 300);
    this.on(this.ctrl.mod, 'change', () => { this.dirtyField = true; upd(); });
    this.on(this.ctrl.a, 'input', e => { this.el.querySelector('.js-av').textContent = e.target.value; this.dirtyField = true; upd(); });
    this.on(this.ctrl.nb, 'input', e => { this.el.querySelector('.js-nbv').textContent = e.target.value; upd(); });
    this.on(this.el.querySelector('.js-ks'), 'click', e => {
      this.showKS = !this.showKS; e.target.textContent = 'Référence krigeage : ' + (this.showKS ? 'ON' : 'OFF');
      e.target.style.background = this.showKS ? '#d62728' : '#999'; this._draw();
    });
    this.on(this.el.querySelector('.js-regen'), 'click', () => { this.seed = 100 + Math.floor(Math.random() * 1e5); this.dirtyField = true; this.refresh(); });
    this.dirtyField = true;
    this.xs = Array.from({ length: L }, (_, i) => i);
    afficherChargementJusquaPret(this.el).then(() => this.refresh());
  }

  async _setupField() {
    const mod = this.ctrl.mod.value, a = parseFloat(this.ctrl.a.value), nd = DATA_IDX.length;
    // Données = un champ de référence échantillonné (même échelle que les sims).
    const ref = (await gpoly.simuler1DN(mod, a, this.seed - 1, L, 1))[0];
    this.zobs = DATA_IDX.map(i => ref[i]);
    // Krigeage simple EN JS : matrice de poids W, Z*_obs et σ²_KS.
    const K = []; for (let r = 0; r < nd; r++) { K.push([]); for (let c = 0; c < nd; c++) K[r].push(covModele(mod, Math.abs(DATA_IDX[r] - DATA_IDX[c]), a) + (r === c ? 1e-9 : 0)); }
    const Kinv = invert(K);
    this.W = []; this.Zobs = new Float64Array(L); this.sigKS = new Float64Array(L);
    for (let cell = 0; cell < L; cell++) {
      const k0 = DATA_IDX.map(i => covModele(mod, Math.abs(cell - i), a));
      const w = Kinv.map(row => row.reduce((s, v, j) => s + v * k0[j], 0));   // w = K⁻¹ k0
      this.W.push(w);
      let zs = 0, sig = 1; for (let i = 0; i < nd; i++) { zs += w[i] * this.zobs[i]; sig -= w[i] * k0[i]; }
      this.Zobs[cell] = zs; this.sigKS[cell] = Math.max(0, sig);
    }
    this.dirtyField = false;
  }

  async refresh() {
    const mod = this.ctrl.mod.value, a = parseFloat(this.ctrl.a.value), nb = parseInt(this.ctrl.nb.value, 10);
    try {
      if (this.dirtyField || !this.W) await this._setupField();
      this.sims = await gpoly.simuler1DN(mod, a, this.seed, L, nb);
    } catch (e) { this.afficherAvertissement('Erreur : ' + e.message); return; }

    const nd = DATA_IDX.length;
    this.condSims = [];
    const meanNC = new Float64Array(L), m2NC = new Float64Array(L), meanC = new Float64Array(L), m2C = new Float64Array(L);
    for (let s = 0; s < nb; s++) {
      const Zs = this.sims[s], dAt = DATA_IDX.map(idx => Zs[idx]), Zsc = new Float64Array(L);
      for (let c = 0; c < L; c++) {
        let zk = 0; const w = this.W[c]; for (let i = 0; i < nd; i++) zk += w[i] * dAt[i];
        Zsc[c] = Zs[c] - zk + this.Zobs[c];
        meanNC[c] += Zs[c]; m2NC[c] += Zs[c] * Zs[c]; meanC[c] += Zsc[c]; m2C[c] += Zsc[c] * Zsc[c];
      }
      this.condSims.push(Zsc);
    }
    for (let c = 0; c < L; c++) { meanNC[c] /= nb; meanC[c] /= nb; }
    this.meanNC = meanNC; this.meanC = meanC;
    this.varNC = []; this.varC = [];
    for (let c = 0; c < L; c++) { this.varNC.push(Math.max(0, m2NC[c] / nb - meanNC[c] ** 2)); this.varC.push(Math.max(0, m2C[c] / nb - meanC[c] ** 2)); }
    this._draw();

    const rmse = (x, y) => Math.sqrt(x.reduce((s, v, i) => s + (v - y[i]) ** 2, 0) / x.length);
    this.infoEl.innerHTML =
      `<b>${nb}</b> réalisation(s) · NC : |moyenne−0| = <b>${rmse(Array.from(meanNC), new Array(L).fill(0)).toFixed(3)}</b>, |variance−1| = <b>${rmse(this.varNC, new Array(L).fill(1)).toFixed(3)}</b>` +
      ` &nbsp;|&nbsp; Cond. : |moyenne−Z*<sub>KS</sub>| = <b style="color:#0d4d92">${rmse(Array.from(meanC), this.Zobs).toFixed(3)}</b>, |variance−σ²<sub>KS</sub>| = <b style="color:#0d4d92">${rmse(this.varC, this.sigKS).toFixed(3)}</b>`;
  }

  _realPanel(el, simsList, mean, title, extra) {
    const px = [], py = [];
    for (const z of simsList) { for (let i = 0; i < L; i++) { px.push(i); py.push(z[i]); } px.push(null); py.push(null); }
    const traces = [{ type: 'scattergl', x: px, y: py, mode: 'lines', line: { color: '#d4d4d4', width: 0.6 }, hoverinfo: 'skip', showlegend: false }];
    for (const t of extra) traces.push(t);
    traces.push({ type: 'scattergl', x: this.xs, y: Array.from(mean), mode: 'lines', line: { color: '#000', width: 2.4, dash: 'dot' }, hoverinfo: 'skip', showlegend: false });
    return { el, traces, title, yr: [-3.6, 3.6] };
  }

  _draw() {
    if (!window.Plotly || !this.sims) return;
    const cfg = { displaylogo: false, responsive: true, displayModeBar: false };
    const layout = (title, yr) => ({ margin: { t: 24, l: 38, r: 8, b: 22 }, title: { text: title, font: { size: 10.5 }, y: 0.98 }, xaxis: { showticklabels: false, range: [0, L - 1] }, yaxis: { range: yr, zeroline: true } });
    const dataMk = { type: 'scattergl', x: DATA_IDX, y: this.zobs, mode: 'markers', marker: { color: '#000', size: 6 }, showlegend: false, hoverinfo: 'skip' };
    // Référence (cible théorique) : rouge ÉPAIS. Moyenne empirique : noir fin pointillé (dans _realPanel).
    const ref = (y) => ({ type: 'scattergl', x: [0, L - 1], y: [y, y], mode: 'lines', line: { color: '#d62728', width: 3 }, showlegend: false, hoverinfo: 'skip' });
    const refLine = (yarr) => ({ type: 'scattergl', x: this.xs, y: yarr, mode: 'lines', line: { color: '#d62728', width: 3 }, showlegend: false, hoverinfo: 'skip' });
    const meanThin = (yarr) => ({ type: 'scattergl', x: this.xs, y: yarr, mode: 'lines', line: { color: '#000', width: 2.4, dash: 'dot' }, showlegend: false, hoverinfo: 'skip' });

    // Haut : non conditionnel (réalisations + moyenne | variance).
    const ncR = this._realPanel(this.P.ncr, this.sims, this.meanNC, 'Non conditionnel — réalisations + moyenne', [ref(0)]);
    Plotly.react(ncR.el, ncR.traces, layout(ncR.title, ncR.yr), cfg);
    Plotly.react(this.P.ncv, [ref(1), meanThin(this.varNC)], layout('Non conditionnel — variance (→ 1)', [0, 1.8]), cfg);

    // Bas : conditionnel (réalisations + moyenne + référence KS | variance + σ²_KS).
    const extraC = []; if (this.showKS) extraC.push(refLine(this.Zobs)); extraC.push(dataMk);
    const cR = this._realPanel(this.P.cr, this.condSims, this.meanC, 'Conditionnel — réalisations + moyenne', extraC);
    Plotly.react(cR.el, cR.traces, layout(cR.title, cR.yr), cfg);
    const cvTraces = [];
    if (this.showKS) cvTraces.push(refLine(this.sigKS));
    cvTraces.push(meanThin(this.varC));
    Plotly.react(this.P.cv, cvTraces, layout('Conditionnel — variance (→ σ²<sub>KS</sub>)', [0, 1.8]), cfg);
  }

  cleanup() { if (window.Plotly) Object.values(this.P || {}).forEach(p => p && Plotly.purge(p)); }
}

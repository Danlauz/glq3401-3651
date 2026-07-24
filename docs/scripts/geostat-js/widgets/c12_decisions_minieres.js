// scripts/geostat-js/widgets/c12_decisions_minieres.js
// -----------------------------------------------------------------------------
// Widget C12 — Ressources minières : KRIGEAGE vs SIMULATIONS (courbe teneur-tonnage).
//
// Gisement de teneurs (loi log-normale), quelques sondages. Pour une coupure z_c :
//   T(z_c) = tonnage relatif (proportion de blocs > z_c)
//   Q(z_c) = métal récupérable = T(z_c) · teneur moyenne au-dessus de z_c
//
// Le KRIGEAGE lisse les teneurs → il déforme la courbe teneur-tonnage (sous-estime
// le tonnage/métal aux hautes coupures : effet de lissage). Les SIMULATIONS
// conditionnelles reproduisent l'histogramme réel → courbe non biaisée + une
// DISTRIBUTION de ressources (intervalle de confiance) pour décider sous risque.
// (Inspiré du cours : ressources estimées différentes par réalisation, p.18-19.)
//
// Simulations conditionnelles par anamorphose gaussienne + post-conditionnement.
// -----------------------------------------------------------------------------
import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';
const debounce = (fn, ms = 500) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const N = 36, NDATA = 16, NC = 26;
const pctile = (sorted, p) => sorted[Math.max(0, Math.min(sorted.length - 1, Math.floor(p * sorted.length)))];

export default class C12DecisionsMinieres extends Widget {
  render() {
    const id = this.el.id;
    this.seed = 5;
    this.el.insertAdjacentHTML('beforeend', `
      <style>#${id} .gw-controls label{display:inline-flex !important;flex-direction:row !important;align-items:center;gap:5px;}</style>
      <div class="gw-controls" style="display:flex;flex-wrap:wrap;gap:14px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;">
        <label>Portée a <input type="range" class="js-a" min="6" max="24" value="13" step="1" style="width:110px"><span class="js-av">13</span></label>
        <label>Coupure z<sub>c</sub> <input type="range" class="js-zc" min="0" max="10" value="3" step="0.1" style="width:140px"><span class="js-zcv">3.0</span></label>
        <label>Simulations <input type="range" class="js-nb" min="10" max="100" value="50" step="10" style="width:120px"><span class="js-nbv">50</span></label>
        <button class="js-regen" type="button" style="font-size:.78rem;padding:4px 10px;background:#3a3632;color:#fff;border:none;border-radius:5px;cursor:pointer;">Nouveau gisement</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:6px;">
        <div class="js-p-T" style="height:280px"></div>
        <div class="js-p-Q" style="height:280px"></div>
        <div class="js-p-hist" style="height:280px"></div>
      </div>
      <div class="js-info" style="padding:.5rem 1rem;font-size:.84rem;color:#333;text-align:center;background:#eef2e8;border:1px solid #b8c8a8;border-radius:6px;margin-top:6px;">—</div>
      <p style="margin:4px 1rem;font-size:11px;color:#666;">
        Courbes teneur-tonnage : <b>vérité</b> (noir), <b style="color:#0d4d92">krigeage</b> (bleu, lissé → biaisé aux hautes coupures), <b style="color:#1f8a4c">simulations</b> (médiane + bande P10–P90). À droite : distribution du <b>métal récupérable</b> à la coupure choisie — les simulations donnent un <b>intervalle de confiance</b>, le krigeage un seul chiffre (biaisé).</p>
    `);
    this.P = { T: this.el.querySelector('.js-p-T'), Q: this.el.querySelector('.js-p-Q'), hist: this.el.querySelector('.js-p-hist') };
    this.infoEl = this.el.querySelector('.js-info');
    this.ctrl = { a: this.el.querySelector('.js-a'), zc: this.el.querySelector('.js-zc'), nb: this.el.querySelector('.js-nb') };
    const heavy = debounce(() => this.refresh(), 500);
    this.on(this.ctrl.a, 'input', e => { this.el.querySelector('.js-av').textContent = e.target.value; this.dirty = true; heavy(); });
    this.on(this.ctrl.nb, 'input', e => { this.el.querySelector('.js-nbv').textContent = e.target.value; heavy(); });
    this.on(this.ctrl.zc, 'input', e => { this.el.querySelector('.js-zcv').textContent = parseFloat(e.target.value).toFixed(1); this._draw(); });
    this.on(this.el.querySelector('.js-regen'), 'click', () => { this.seed = 5 + Math.floor(Math.random() * 1e5); this.dirty = true; this.refresh(); });
    this.dirty = true;
    afficherChargementJusquaPret(this.el).then(() => this.refresh());
  }

  async _setup() {
    const a = parseFloat(this.ctrl.a.value);
    const mean = 2.5, varr = 9.0, s2 = Math.log(1 + varr / (mean * mean)), mu = Math.log(mean) - 0.5 * s2, sig = Math.sqrt(s2);
    this.anam = { fwd: z => (Math.log(Math.max(1e-6, z)) - mu) / sig, inv: y => Math.exp(mu + sig * y) };
    let flat;
    try { flat = await gpoly.simulerChamp('spherique', a, 0, this.seed, N, 'lognormal', mean, varr); }
    catch (e) { this.afficherAvertissement('Erreur simulation : ' + e.message); return; }
    this.Ztrue = Array.from(flat);
    let s = (this.seed ^ 0x9e3779b9) >>> 0; const rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    const vus = new Set(); this.dIdx = [];
    while (this.dIdx.length < NDATA) { const k = Math.floor(rng() * N * N); if (!vus.has(k)) { vus.add(k); this.dIdx.push(k); } }
    const xdata = this.dIdx.map(k => [(k % N) + 0.5, Math.floor(k / N) + 0.5]);
    this.Yobs = this.dIdx.map(k => this.anam.fwd(this.Ztrue[k]));
    const cibles = []; for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) cibles.push([i + 0.5, j + 0.5]);
    const ks = await gpoly.krigeageSimple(xdata, this.Yobs, cibles, [{ modele: 'spherique', palier: 1, portee: a }], 0, 0);
    this.Ystar = ks.estimations; this.Zkrig = this.Ystar.map(y => this.anam.inv(y));
    const M = N * N, nd = NDATA, lam = ks.lambda;
    let W = (lam.length === M && lam[0].length === nd) ? lam : cibles.map((_, c) => lam.map(r => r[c]));
    const t = W[(M / 2) | 0].reduce((acc, w, i) => acc + w * this.Yobs[i], 0);
    if (Math.abs(t - this.Ystar[(M / 2) | 0]) > 1e-3 * (1 + Math.abs(this.Ystar[(M / 2) | 0]))) W = cibles.map((_, c) => lam.map(r => r[c]));
    this.W = W;
    const sorted = [...this.Ztrue].sort((p, q) => p - q);
    this.zmax = pctile(sorted, 0.97);
    this.dirty = false;
  }

  async refresh() {
    const a = parseFloat(this.ctrl.a.value), nb = parseInt(this.ctrl.nb.value, 10);
    try {
      if (this.dirty || !this.W) await this._setup();
      this.sim = await gpoly.simulerNRealisations('spherique', a, 1, this.seed + 1, N, nb, 'FFTMA');
    } catch (e) { this.afficherAvertissement('Erreur : ' + e.message); return; }
    const M = N * N, nd = NDATA, flat = this.sim.realisations_flat;
    this.Zsims = [];
    for (let sidx = 0; sidx < nb; sidx++) {
      const off = sidx * M, Z = new Float64Array(M);
      const dAt = this.dIdx.map(k => flat[off + k]);
      for (let c = 0; c < M; c++) { let yk = 0; const w = this.W[c]; for (let i = 0; i < nd; i++) yk += w[i] * dAt[i]; Z[c] = this.anam.inv(flat[off + c] - yk + this.Ystar[c]); }
      this.Zsims.push(Z);
    }
    // Coupures + courbes T,Q par réalisation/vérité/krigeage.
    this.coupures = []; for (let k = 0; k < NC; k++) this.coupures.push(this.zmax * (k + 0.5) / NC);
    const TQ = (Z) => { const T = [], Q = []; for (const zc of this.coupures) { let n2 = 0, sum = 0; for (let c = 0; c < M; c++) if (Z[c] > zc) { n2++; sum += Z[c]; } const tn = n2 / M; T.push(tn); Q.push(n2 ? tn * (sum / n2) : 0); } return { T, Q }; };
    this.truthC = TQ(this.Ztrue); this.krigC = TQ(this.Zkrig);
    this.simT = this.coupures.map(() => []); this.simQ = this.coupures.map(() => []);
    for (const Z of this.Zsims) { const r = TQ(Z); for (let k = 0; k < NC; k++) { this.simT[k].push(r.T[k]); this.simQ[k].push(r.Q[k]); } }
    this.bandT = this._band(this.simT); this.bandQ = this._band(this.simQ);
    this._draw();
  }

  _band(perCut) {
    const P10 = [], P50 = [], P90 = [];
    for (const arr of perCut) { const s = [...arr].sort((p, q) => p - q); P10.push(pctile(s, 0.1)); P50.push(pctile(s, 0.5)); P90.push(pctile(s, 0.9)); }
    return { P10, P50, P90 };
  }

  _metalAt(zc) {
    const M = N * N, idx = Math.max(0, Math.min(NC - 1, Math.round(zc / this.zmax * NC - 0.5)));
    const metalSim = this.Zsims.map(Z => { let n2 = 0, sum = 0; for (let c = 0; c < M; c++) if (Z[c] > zc) { n2++; sum += Z[c]; } return (n2 / M) * (n2 ? sum / n2 : 0); });
    const tq = (Z) => { let n2 = 0, sum = 0; for (let c = 0; c < M; c++) if (Z[c] > zc) { n2++; sum += Z[c]; } return (n2 / M) * (n2 ? sum / n2 : 0); };
    return { metalSim, qTruth: tq(this.Ztrue), qKrig: tq(this.Zkrig) };
  }

  _draw() {
    if (!window.Plotly || !this.Zsims) return;
    const zc = parseFloat(this.ctrl.zc.value), cfg = { displaylogo: false, responsive: true, displayModeBar: false };
    const band = (el, b, truth, krig, title, yt) => {
      Plotly.react(el, [
        { x: this.coupures, y: b.P90, mode: 'lines', line: { width: 0, color: '#1f8a4c' }, showlegend: false, hoverinfo: 'skip' },
        { x: this.coupures, y: b.P10, mode: 'lines', line: { width: 0, color: '#1f8a4c' }, fill: 'tonexty', fillcolor: 'rgba(31,138,76,0.18)', name: 'P10–P90', hoverinfo: 'skip' },
        { x: this.coupures, y: b.P50, mode: 'lines', line: { color: '#1f8a4c', width: 2.2 }, name: 'simulations (médiane)' },
        { x: this.coupures, y: truth, mode: 'lines', line: { color: '#111', width: 2 }, name: 'vérité' },
        { x: this.coupures, y: krig, mode: 'lines', line: { color: '#0d4d92', width: 2, dash: 'dash' }, name: 'krigeage' },
      ], {
        margin: { t: 26, l: 48, r: 10, b: 60 }, title: { text: title, font: { size: 11.5 } },
        xaxis: { title: { text: 'coupure z_c', standoff: 4 } }, yaxis: { title: { text: yt, standoff: 4 }, rangemode: 'tozero' },
        shapes: [{ type: 'line', x0: zc, x1: zc, y0: 0, y1: 1, yref: 'paper', line: { color: '#888', width: 1, dash: 'dot' } }],
        legend: { orientation: 'h', y: -0.22, x: 0.5, xanchor: 'center', font: { size: 8.5 } },
      }, cfg);
    };
    band(this.P.T, this.bandT, this.truthC.T, this.krigC.T, 'Tonnage T(z_c)', 'T');
    band(this.P.Q, this.bandQ, this.truthC.Q, this.krigC.Q, 'Métal récupérable Q(z_c)', 'Q');

    const { metalSim, qTruth, qKrig } = this._metalAt(zc);
    const s = [...metalSim].sort((p, q) => p - q);
    const mean = metalSim.reduce((p, q) => p + q, 0) / metalSim.length, lo = pctile(s, 0.05), hi = pctile(s, 0.95);
    Plotly.react(this.P.hist, [
      { x: metalSim, type: 'histogram', nbinsx: 16, marker: { color: 'rgba(31,138,76,0.55)', line: { color: '#1f8a4c', width: 1 } } },
    ], {
      margin: { t: 26, l: 44, r: 10, b: 44 }, title: { text: `Métal à z_c = ${zc.toFixed(1)}`, font: { size: 11.5 } },
      xaxis: { title: { text: 'Q (métal récupérable)', standoff: 4 } }, yaxis: { title: { text: 'fréquence', standoff: 4 } },
      shapes: [
        { type: 'line', x0: qTruth, x1: qTruth, y0: 0, y1: 1, yref: 'paper', line: { color: '#111', width: 2 } },
        { type: 'line', x0: qKrig, x1: qKrig, y0: 0, y1: 1, yref: 'paper', line: { color: '#0d4d92', width: 2, dash: 'dash' } },
      ],
      annotations: [
        { x: qTruth, y: 1.06, yref: 'paper', text: 'vérité', showarrow: false, font: { size: 9.5, color: '#111' } },
        { x: qKrig, y: 1.06, yref: 'paper', text: 'krigeage', showarrow: false, font: { size: 9.5, color: '#0d4d92' } },
      ], showlegend: false,
    }, cfg);

    this.infoEl.innerHTML =
      `À z<sub>c</sub> = <b>${zc.toFixed(1)}</b> · métal récupérable : ` +
      `vérité = <b>${qTruth.toFixed(3)}</b> &nbsp;|&nbsp; <span style="color:#0d4d92">krigeage = <b>${qKrig.toFixed(3)}</b></span> &nbsp;|&nbsp; ` +
      `<span style="color:#1f8a4c">simulations = <b>${mean.toFixed(3)}</b> [${lo.toFixed(3)} ; ${hi.toFixed(3)}]</span>`;
  }

  cleanup() { if (window.Plotly) Object.values(this.P || {}).forEach(p => p && Plotly.purge(p)); }
}

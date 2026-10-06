// scripts/geostat-js/widgets/c12_decisions_minieres.js
// -----------------------------------------------------------------------------
// Widget C12 — Ressources minières : KRIGEAGE vs SIMULATIONS.
//
// Cartes (même échelle de couleurs) : la RÉALITÉ (vérité), le KRIGEAGE (lissé,
// sans hautes teneurs) et plusieurs SIMULATIONS conditionnelles (texturées comme
// la réalité, honorant les mêmes sondages). Courbes teneur-tonnage T(z_c), Q(z_c)
// et distribution du métal récupérable pour décider sous incertitude.
//
// Conditionnement par krigeage (résidus) dans l'espace gaussien :
//   Y_cond = Y_sim − krig(Y_sim aux données) + krig(Y_obs)
// Les poids de krigeage (identiques pour toutes les réalisations) sont construits
// UNE fois via des vecteurs unitaires (le wrapper ne renvoyant que les poids d'une
// cible), puis appliqués à chaque réalisation.
// -----------------------------------------------------------------------------
import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';
const debounce = (fn, ms = 500) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const N = 36, NDATA = 16, NC = 26;
const pctile = (sorted, p) => sorted[Math.max(0, Math.min(sorted.length - 1, Math.floor(p * sorted.length)))];
const STRUCT = a => [{ modele: 'spherique', palier: 1, portee: a }];

export default class C12DecisionsMinieres extends Widget {
  render() {
    const id = this.el.id;
    this.seed = 5;
    this.el.insertAdjacentHTML('beforeend', `
      <style>#${id} .gw-controls label{display:inline-flex !important;flex-direction:row !important;align-items:center;gap:5px;}</style>
      <div class="gw-controls" style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.8rem;">
        <label>Portée a <input type="range" class="js-a" min="6" max="24" value="13" step="1" style="width:95px"><span class="js-av">13</span></label>
        <label>Coupure z<sub>c</sub> <input type="range" class="js-zc" min="0" max="10" value="3" step="0.1" style="width:115px"><span class="js-zcv">3.0</span></label>
        <label>Réalisations (calcul) <input type="range" class="js-nb" min="20" max="100" value="50" step="10" style="width:95px"><span class="js-nbv">50</span></label>
        <label>Cartes de simulation <input type="range" class="js-nmap" min="1" max="6" value="3" step="1" style="width:85px"><span class="js-nmapv">3</span></label>
        <button class="js-regen" type="button" style="font-size:.78rem;padding:4px 10px;background:#3a3632;color:#fff;border:none;border-radius:5px;cursor:pointer;">Nouveau gisement</button>
      </div>
      <div class="js-maps" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;justify-content:center;"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:8px;">
        <div class="js-p-T" style="height:265px"></div>
        <div class="js-p-Q" style="height:265px"></div>
        <div class="js-p-hist" style="height:265px"></div>
      </div>
      <div class="js-info" style="padding:.5rem 1rem;font-size:.84rem;color:#333;text-align:center;background:#eef2e8;border:1px solid #b8c8a8;border-radius:6px;margin-top:6px;">—</div>
      <p style="margin:4px 1rem;font-size:11px;color:#666;">
        <b>Cartes</b> (même échelle de teneur) : <b>réalité</b>, <b style="color:#0d4d92">krigeage</b> (lissé → pas de hautes teneurs) et <b style="color:#1f8a4c">simulations</b> (texturées comme la réalité, honorant les mêmes sondages ●). <b>Courbes teneur-tonnage</b> : vérité (noir), krigeage (bleu tireté, biaisé aux hautes coupures par lissage), simulations (médiane + bande P10–P90). À droite : distribution du métal récupérable — les simulations donnent un <b>intervalle de confiance</b>, le krigeage un seul chiffre biaisé.</p>
    `);
    this.P = { T: this.el.querySelector('.js-p-T'), Q: this.el.querySelector('.js-p-Q'), hist: this.el.querySelector('.js-p-hist') };
    this.mapsEl = this.el.querySelector('.js-maps');
    this.infoEl = this.el.querySelector('.js-info');
    this.ctrl = { a: this.el.querySelector('.js-a'), zc: this.el.querySelector('.js-zc'), nb: this.el.querySelector('.js-nb'), nmap: this.el.querySelector('.js-nmap') };
    const heavy = debounce(() => this.refresh(), 500);
    this.on(this.ctrl.a, 'input', e => { this.el.querySelector('.js-av').textContent = e.target.value; this.dirty = true; heavy(); });
    this.on(this.ctrl.nb, 'input', e => { this.el.querySelector('.js-nbv').textContent = e.target.value; heavy(); });
    this.on(this.ctrl.zc, 'input', e => { this.el.querySelector('.js-zcv').textContent = parseFloat(e.target.value).toFixed(1); this._drawCurves(); });
    this.on(this.ctrl.nmap, 'input', e => { this.el.querySelector('.js-nmapv').textContent = e.target.value; this._drawMaps(); });
    this.on(this.el.querySelector('.js-regen'), 'click', () => { this.seed = 5 + Math.floor(Math.random() * 1e5); this.dirty = true; this.refresh(); });
    this.dirty = true;
    afficherChargementJusquaPret(this.el).then(() => this.refresh());
  }

  async _setup() {
    const a = parseFloat(this.ctrl.a.value), M = N * N, nd = NDATA;
    const mean = 2.5, varr = 9.0, s2 = Math.log(1 + varr / (mean * mean)), mu = Math.log(mean) - 0.5 * s2, sig = Math.sqrt(s2);
    this.anam = { fwd: z => (Math.log(Math.max(1e-6, z)) - mu) / sig, inv: y => Math.exp(mu + sig * y) };
    let flat;
    try { flat = await gpoly.simulerChamp('spherique', a, 0, this.seed, N, 'lognormal', mean, varr); }
    catch (e) { this.afficherAvertissement('Erreur simulation : ' + e.message); return false; }
    this.Ztrue = Array.from(flat);
    let s = (this.seed ^ 0x9e3779b9) >>> 0; const rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    const vus = new Set(); this.dIdx = [];
    while (this.dIdx.length < nd) { const k = Math.floor(rng() * M); if (!vus.has(k)) { vus.add(k); this.dIdx.push(k); } }
    this.xdata = this.dIdx.map(k => [(k % N) + 0.5, Math.floor(k / N) + 0.5]);
    this.Yobs = this.dIdx.map(k => this.anam.fwd(this.Ztrue[k]));
    this.cibles = []; for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) this.cibles.push([i + 0.5, j + 0.5]);
    // Matrice de poids W (M×nd) : krigeage de nd vecteurs unitaires (le wrapper ne
    // renvoie que les poids d'une cible, donc on reconstruit la matrice complète).
    try {
      const cols = [];
      for (let i = 0; i < nd; i++) {
        const e = new Array(nd).fill(0); e[i] = 1;
        const kk = await gpoly.krigeageSimple(this.xdata, e, this.cibles, STRUCT(a), 0, 0);
        cols.push(kk.estimations);
      }
      this.W = new Array(M);
      for (let c = 0; c < M; c++) { const w = new Float64Array(nd); for (let i = 0; i < nd; i++) w[i] = cols[i][c]; this.W[c] = w; }
    } catch (e) { this.afficherAvertissement('Erreur krigeage : ' + e.message); return false; }
    this.Ystar = new Float64Array(M);
    for (let c = 0; c < M; c++) { let v = 0; const w = this.W[c]; for (let i = 0; i < nd; i++) v += w[i] * this.Yobs[i]; this.Ystar[c] = v; }
    this.Zkrig = Array.from(this.Ystar, y => this.anam.inv(y));
    const sorted = [...this.Ztrue].sort((p, q) => p - q);
    this.zmax = pctile(sorted, 0.97);
    this.zmapMax = pctile(sorted, 0.99);
    this.dirty = false;
    return true;
  }

  async refresh() {
    const a = parseFloat(this.ctrl.a.value), nb = parseInt(this.ctrl.nb.value, 10), M = N * N, nd = NDATA;
    try {
      if (this.dirty || !this.W) { const ok = await this._setup(); if (ok === false) return; }
      this.sim = await gpoly.simulerNRealisations('spherique', a, 1, this.seed + 1, N, nb, 'FFTMA');
    } catch (e) { this.afficherAvertissement('Erreur : ' + e.message); return; }
    const flat = this.sim.realisations_flat;
    this.Zsims = [];
    for (let sidx = 0; sidx < nb; sidx++) {
      const off = sidx * M, Z = new Float64Array(M);
      const dAt = this.dIdx.map(k => flat[off + k]);
      for (let c = 0; c < M; c++) { let yk = 0; const w = this.W[c]; for (let i = 0; i < nd; i++) yk += w[i] * dAt[i]; Z[c] = this.anam.inv(flat[off + c] - yk + this.Ystar[c]); }
      this.Zsims.push(Z);
    }
    this.coupures = []; for (let k = 0; k < NC; k++) this.coupures.push(this.zmax * (k + 0.5) / NC);
    const TQ = (Z) => { const T = [], Q = []; for (const zc of this.coupures) { let n2 = 0, sum = 0; for (let c = 0; c < M; c++) if (Z[c] > zc) { n2++; sum += Z[c]; } const tn = n2 / M; T.push(tn); Q.push(n2 ? tn * (sum / n2) : 0); } return { T, Q }; };
    this.truthC = TQ(this.Ztrue); this.krigC = TQ(this.Zkrig);
    this.simT = this.coupures.map(() => []); this.simQ = this.coupures.map(() => []);
    for (const Z of this.Zsims) { const r = TQ(Z); for (let k = 0; k < NC; k++) { this.simT[k].push(r.T[k]); this.simQ[k].push(r.Q[k]); } }
    this.bandT = this._band(this.simT); this.bandQ = this._band(this.simQ);
    this._drawMaps();
    this._drawCurves();
  }

  _band(perCut) {
    const P10 = [], P50 = [], P90 = [];
    for (const arr of perCut) { const s = [...arr].sort((p, q) => p - q); P10.push(pctile(s, 0.1)); P50.push(pctile(s, 0.5)); P90.push(pctile(s, 0.9)); }
    return { P10, P50, P90 };
  }

  _metalAt(zc) {
    const M = N * N;
    const metalSim = this.Zsims.map(Z => { let n2 = 0, sum = 0; for (let c = 0; c < M; c++) if (Z[c] > zc) { n2++; sum += Z[c]; } return (n2 / M) * (n2 ? sum / n2 : 0); });
    const tq = (Z) => { let n2 = 0, sum = 0; for (let c = 0; c < M; c++) if (Z[c] > zc) { n2++; sum += Z[c]; } return (n2 / M) * (n2 ? sum / n2 : 0); };
    return { metalSim, qTruth: tq(this.Ztrue), qKrig: tq(this.Zkrig) };
  }

  _drawMaps() {
    if (!window.Plotly || !this.Zsims) return;
    const K = Math.min(parseInt(this.ctrl.nmap.value, 10), this.Zsims.length);
    const zmin = 0, zmax = this.zmapMax, MW = 168, MH = 186;
    const dx = this.dIdx.map(k => k % N), dy = this.dIdx.map(k => Math.floor(k / N));
    const reshape = (f) => { const z = []; for (let j = 0; j < N; j++) { const row = new Array(N); for (let i = 0; i < N; i++) row[i] = f[j * N + i]; z.push(row); } return z; };
    Array.from(this.mapsEl.querySelectorAll('[data-mi]')).forEach(c => { try { Plotly.purge(c); } catch (e) {} });
    const simDivs = Array.from({ length: K }, (_, s) => `<div data-mi="s${s}" style="width:${MW}px;height:${MH}px;"></div>`).join('');
    this.mapsEl.innerHTML = `
      <div style="width:100%;text-align:center;font-size:11.5px;color:#444;font-weight:600;margin:2px 0 3px;">La réalité et son estimation par krigeage</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;align-items:flex-start;">
        <div data-mi="truth" style="width:${MW}px;height:${MH}px;"></div>
        <div data-mi="krig"  style="width:${MW}px;height:${MH}px;"></div>
        <div data-mi="cbar"  style="width:70px;height:${MH}px;"></div>
      </div>
      <div style="width:100%;text-align:center;font-size:11.5px;color:#1f8a4c;font-weight:600;margin:9px 0 3px;">${K} simulation${K > 1 ? 's' : ''} conditionnelle${K > 1 ? 's' : ''} — toutes honorent les mêmes sondages ●</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">${simDivs}</div>`;
    const cfg = { displaylogo: false, responsive: true, displayModeBar: false };
    const heat = (el, f, title, color) => {
      if (!el) return;
      Plotly.react(el, [
        { type: 'heatmap', z: reshape(f), zmin, zmax, colorscale: 'Viridis', showscale: false, hoverinfo: 'skip' },
        { type: 'scatter', x: dx, y: dy, mode: 'markers', marker: { size: 3.2, color: '#fff', line: { color: '#000', width: 0.6 } }, hoverinfo: 'skip' },
      ], {
        margin: { t: 20, l: 2, r: 2, b: 2 }, title: { text: title, font: { size: 10.5, color } },
        xaxis: { visible: false, range: [-0.5, N - 0.5], constrain: 'domain' },
        yaxis: { visible: false, range: [-0.5, N - 0.5], scaleanchor: 'x', constrain: 'domain' },
        showlegend: false, plot_bgcolor: 'rgba(0,0,0,0)',
      }, cfg);
    };
    heat(this.mapsEl.querySelector('[data-mi="truth"]'), this.Ztrue, 'Réalité (vérité)', '#111');
    heat(this.mapsEl.querySelector('[data-mi="krig"]'),  this.Zkrig, 'Krigeage (lissé)', '#0d4d92');
    for (let s = 0; s < K; s++) heat(this.mapsEl.querySelector(`[data-mi="s${s}"]`), this.Zsims[s], `Simulation ${s + 1}`, '#1f8a4c');
    // Barre de couleur partagée, dans son propre bloc (ne rétrécit aucune carte).
    const cb = this.mapsEl.querySelector('[data-mi="cbar"]');
    if (cb) Plotly.react(cb, [
      { type: 'heatmap', z: [[zmin], [zmax]], zmin, zmax, colorscale: 'Viridis', showscale: true, opacity: 0,
        colorbar: { title: { text: 'teneur', side: 'right', font: { size: 9 } }, thickness: 10, len: 0.80, y: 0.46, tickfont: { size: 8 } }, hoverinfo: 'skip' },
    ], { margin: { t: 20, l: 0, r: 44, b: 2 }, xaxis: { visible: false }, yaxis: { visible: false }, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)' }, cfg);
  }

  _drawCurves() {
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
        xaxis: { title: { text: 'coupure z<sub>c</sub>', standoff: 4 } }, yaxis: { title: { text: yt, standoff: 4 }, rangemode: 'tozero' },
        shapes: [{ type: 'line', x0: zc, x1: zc, y0: 0, y1: 1, yref: 'paper', line: { color: '#888', width: 1, dash: 'dot' } }],
        legend: { orientation: 'h', y: -0.22, x: 0.5, xanchor: 'center', font: { size: 8.5 } },
      }, cfg);
    };
    band(this.P.T, this.bandT, this.truthC.T, this.krigC.T, 'Tonnage T(z<sub>c</sub>)', 'T');
    band(this.P.Q, this.bandQ, this.truthC.Q, this.krigC.Q, 'Métal récupérable Q(z<sub>c</sub>)', 'Q');

    const { metalSim, qTruth, qKrig } = this._metalAt(zc);
    const s = [...metalSim].sort((p, q) => p - q);
    const mean = metalSim.reduce((p, q) => p + q, 0) / metalSim.length, lo = pctile(s, 0.05), hi = pctile(s, 0.95);
    Plotly.react(this.P.hist, [
      { x: metalSim, type: 'histogram', nbinsx: 16, marker: { color: 'rgba(31,138,76,0.55)', line: { color: '#1f8a4c', width: 1 } } },
    ], {
      margin: { t: 26, l: 44, r: 10, b: 44 }, title: { text: `Métal à z<sub>c</sub> = ${zc.toFixed(1)}`, font: { size: 11.5 } },
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

  cleanup() {
    if (window.Plotly) {
      Object.values(this.P || {}).forEach(p => p && Plotly.purge(p));
      if (this.mapsEl) Array.from(this.mapsEl.querySelectorAll('[data-mi]')).forEach(c => { try { Plotly.purge(c); } catch (e) {} });
    }
  }
}

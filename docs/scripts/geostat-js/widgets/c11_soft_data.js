// scripts/geostat-js/widgets/c11_soft_data.js
// -----------------------------------------------------------------------------
// Widget C11.5 — Données d'inégalité : toit d'un réservoir (KO vs KI).
//
// Profil en coupe (x horizontal, profondeur verticale vers le bas). Plusieurs
// forages atteignent le toit du réservoir → profondeur DURE exacte. Un forage
// est ABANDONNÉ à la profondeur d sans l'atteindre → on sait seulement Z > d
// (donnée d'INÉGALITÉ).
//   - KO interpole les forages durs et IGNORE l'inégalité : le toit estimé peut
//     remonter au-dessus de d → violation impossible.
//   - KI code l'inégalité (I = 1{Z ≤ c} = 0 pour tout seuil c < d) : son
//     espérance conditionnelle RESPECTE la contrainte (reste plus profonde que d).
//
// KI fait par krigeage ordinaire des indicateurs seuil par seuil (le forage
// abandonné ne contribue qu'aux seuils c < d), puis décodage de l'espérance
// conditionnelle (gpoly.KIdecoder).
// -----------------------------------------------------------------------------
import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';
const debounce = (fn, ms = 300) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

const XA = 60;                          // position du forage abandonné
const XH = [10, 28, 44, 78, 92];        // forages atteignant le toit
const Ztrue = x => 400 + 50 * Math.sin(2 * Math.PI * (x - 10) / 140) + 200 * Math.exp(-((x - XA) ** 2) / 110);
const M = 60, K = 9, ZMIN = 300, ZMAX = 740;

export default class C11SoftData extends Widget {
  render() {
    const id = this.el.id;
    this.el.insertAdjacentHTML('beforeend', `
      <style>#${id} .gw-controls label{display:inline-flex !important;flex-direction:row !important;align-items:center;gap:5px;}</style>
      <div class="gw-controls" style="display:flex;flex-wrap:wrap;gap:14px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;">
        <label>Profondeur forée <span>d</span> (forage abandonné) <input type="range" class="js-d" min="420" max="600" value="500" step="5" style="width:160px"><span class="js-dv">500</span> m</label>
        <label>Portée a <input type="range" class="js-a" min="10" max="50" value="26" step="1" style="width:120px"><span class="js-av">26</span></label>
      </div>
      <div class="js-plot" style="height:400px;margin-top:6px;"></div>
      <div class="js-info" style="padding:.45rem 1rem;font-size:.82rem;color:#333;text-align:center;background:#eef2f7;border:1px solid #c4d2e0;border-radius:6px;margin-top:4px;">—</div>
      <p style="margin:4px 1rem;font-size:11px;color:#666;">
        Le forage abandonné (cercle rouge, flèche) n'a pas atteint le toit : on sait seulement qu'il est <b>plus profond que d</b>. Le <b style="color:#0d4d92">KO</b> (interpolation des forages durs) peut le placer au-dessus de d (violation) ; le <b style="color:#16a34a">KI</b> respecte l'inégalité.</p>
    `);
    this.plot = this.el.querySelector('.js-plot');
    this.infoEl = this.el.querySelector('.js-info');
    this.dEl = this.el.querySelector('.js-d');
    this.aEl = this.el.querySelector('.js-a');
    const update = debounce(() => this.refresh(), 300);
    this.on(this.dEl, 'input', e => { this.el.querySelector('.js-dv').textContent = e.target.value; update(); });
    this.on(this.aEl, 'input', e => { this.el.querySelector('.js-av').textContent = e.target.value; update(); });
    afficherChargementJusquaPret(this.el).then(() => this.refresh());
  }

  async refresh() {
    const a = parseFloat(this.aEl.value), d = parseFloat(this.dEl.value);
    const Zh = XH.map(Ztrue);
    const xg = []; for (let i = 0; i < M; i++) xg.push(2 + 96 * i / (M - 1));
    const cg = xg.map(x => [x]);
    const xhc = XH.map(x => [x]);
    const varOf = arr => { const m = arr.reduce((p, q) => p + q, 0) / arr.length; return arr.reduce((p, q) => p + (q - m) ** 2, 0) / arr.length; };

    let KO, cdfGrid = [], KI;
    try {
      KO = (await gpoly.krigeageOrdinaire(xhc, Zh, cg, [{ modele: 'spherique', palier: Math.max(1, varOf(Zh)), portee: a }], 0.0)).estimations;
      // Seuils de profondeur ; KI par krigeage ordinaire des indicateurs.
      const cs = []; for (let k = 0; k < K; k++) cs.push(360 + (680 - 360) * k / (K - 1));
      const indStruct = [{ modele: 'spherique', palier: 0.25, portee: a }];
      const Fcols = [];
      for (const c of cs) {
        const coords = c < d ? [...xhc, [XA]] : xhc;
        const ind = c < d ? [...Zh.map(z => (z <= c ? 1 : 0)), 0] : Zh.map(z => (z <= c ? 1 : 0));
        const f = (await gpoly.krigeageOrdinaire(coords, ind, cg, indStruct, 0.0)).estimations.map(v => Math.max(0, Math.min(1, v)));
        Fcols.push(f);
      }
      for (let m = 0; m < M; m++) { let prev = 0; const row = []; for (let k = 0; k < K; k++) { const v = Math.max(prev, Fcols[k][m]); row.push(v); prev = v; } cdfGrid.push(row); }
      KI = (await gpoly.KIdecoder(cdfGrid, cs, d, ZMIN, ZMAX)).moyenne;
    } catch (e) { this.afficherAvertissement('Erreur : ' + e.message); return; }

    if (!window.Plotly) return;
    // Forages (traits verticaux depuis la surface).
    const shapes = XH.map((x, i) => ({ type: 'line', x0: x, x1: x, y0: 0, y1: Zh[i], line: { color: '#aaa', width: 1.5 } }));
    shapes.push({ type: 'line', x0: XA, x1: XA, y0: 0, y1: d, line: { color: '#c0392b', width: 2 } });

    const idxA = xg.reduce((best, x, i) => (Math.abs(x - XA) < Math.abs(xg[best] - XA) ? i : best), 0);
    const koA = KO[idxA], kiA = KI[idxA];

    Plotly.react(this.plot, [
      { x: xg, y: xg.map(Ztrue), mode: 'lines', name: 'vrai toit (référence)', line: { color: '#999', width: 1.5, dash: 'dot' } },
      { x: xg, y: KO, mode: 'lines', name: 'KO (interpolation)', line: { color: '#0d4d92', width: 2.5 } },
      { x: xg, y: KI, mode: 'lines', name: 'KI (espérance conditionnelle)', line: { color: '#16a34a', width: 2.5 } },
      { x: XH, y: Zh, mode: 'markers', name: 'forages : toit atteint', marker: { color: '#222', size: 11, symbol: 'triangle-down', line: { color: '#fff', width: 1 } } },
      { x: [XA], y: [d], mode: 'markers', name: 'forage abandonné (Z > d)', marker: { color: '#c0392b', size: 13, symbol: 'circle-open', line: { width: 3 } } },
    ], {
      margin: { t: 28, l: 56, r: 16, b: 56 },
      title: { text: 'Profondeur du toit du réservoir', font: { size: 12 }, y: 0.98 },
      xaxis: { title: { text: 'position (km)', standoff: 6 }, range: [0, 100] },
      yaxis: { title: { text: 'profondeur (m)', standoff: 6 }, range: [ZMAX, 0] },
      shapes,
      annotations: [{ x: XA, y: d, ax: 0, ay: 34, text: 'toit non atteint : Z > d', showarrow: true, arrowhead: 2, font: { size: 10, color: '#c0392b' }, bgcolor: 'rgba(255,255,255,0.85)' }],
      legend: { orientation: 'h', y: -0.22, x: 0.5, xanchor: 'center', font: { size: 9 } },
    }, { displaylogo: false, responsive: true, displayModeBar: false });

    const viole = koA < d;
    this.infoEl.innerHTML =
      `Au forage abandonné (d = <b>${d.toFixed(0)} m</b>) : KO estime le toit à <b style="color:#0d4d92">${koA.toFixed(0)} m</b> ` +
      (viole ? `(&lt; d → <b style="color:#c0392b">VIOLATION</b> : impossible, le forage l'aurait atteint)` : `(≥ d, compatible)`) +
      ` · KI estime <b style="color:#16a34a">${kiA.toFixed(0)} m</b> (respecte Z &gt; d).`;
  }

  cleanup() { if (window.Plotly && this.plot) Plotly.purge(this.plot); }
}

// scripts/geostat-js/widgets/c03_standards.js
// -----------------------------------------------------------------------------
// Widget « Analyse des standards » (C03) — calcul LIVE via Pyodide.
// Simulation : geostat_polymtl.sampling.standards.simuler_standards.
// Detection d'anomalies : sampling.standards.detecter_anomalies (Western Electric).
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

// Criteres → couleur, ordre (priorite plus severe en premier)
const CRITERES = [
  { key: 'Critère 1', col: '#7b2d8d', lab: 'Règle 1 (au-delà 3σ)' },
  { key: 'Critère 2', col: '#e63946', lab: 'Règle 2 (2 cons. 2σ)' },
  { key: 'Critère 3', col: '#fd7e14', lab: 'Règle 3 (4 cons. 1σ)' },
  { key: 'Critère 4', col: '#ffc107', lab: 'Règle 4 (8 consécutifs)' },
];
const COL_OK = '#28a745';
const debounce = (fn, ms = 200) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

export default class C03Standards extends Widget {
  render() {
    this.seed = 123;
    this.el.insertAdjacentHTML('beforeend', `
      <div class="gw-controls">
        <label>Moyenne attendue <input type="number" class="js-moy" value="50.0" step="0.1" style="width:70px"></label>
        <label>σ certifié <input type="number" class="js-sig" value="1.0" step="0.1" style="width:70px"></label>
        <label>N <input type="number" class="js-n" value="200" step="10" min="20" max="500" style="width:60px"></label>
        <label>Portée corr. <input type="range" class="js-portee" min="1" max="30" step="1" value="10"><span class="js-pv">10</span></label>
        <label>Pente tendance <input type="range" class="js-pente" min="-0.05" max="0.05" step="0.005" value="0"><span class="js-tv">0.000</span></label>
        <button class="js-regen" type="button">Nouvelle série</button>
      </div>
      <div class="js-plot" style="height:360px"></div>
      <div class="js-leg" style="display:flex;flex-wrap:wrap;gap:10px;margin:6px 1rem;font-size:11px"></div>
      <div class="js-info" style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:8px 1rem;font-size:12px"></div>
      <p style="margin:4px 1rem;font-size:11px;color:#666">
        Simulation et règles de Western Electric via <code>geostat_polymtl.sampling.standards</code>.</p>
    `);
    this.plot = this.el.querySelector('.js-plot');
    this.infoEl = this.el.querySelector('.js-info');
    this.in = {
      moy: this.el.querySelector('.js-moy'), sig: this.el.querySelector('.js-sig'),
      n: this.el.querySelector('.js-n'),
      portee: this.el.querySelector('.js-portee'),
      pente:  this.el.querySelector('.js-pente'),
    };
    this.pv = this.el.querySelector('.js-pv');
    this.tv = this.el.querySelector('.js-tv');
    this.el.querySelector('.js-leg').innerHTML =
      `<span style="display:inline-flex;align-items:center;gap:4px"><i style="width:10px;height:10px;border-radius:50%;display:inline-block;background:${COL_OK}"></i>OK</span>` +
      CRITERES.map(c => `<span style="display:inline-flex;align-items:center;gap:4px"><i style="width:10px;height:10px;border-radius:50%;display:inline-block;background:${c.col}"></i>${c.lab}</span>`).join('');
    const refresh = debounce(() => this.refresh(), 200);
    for (const el of Object.values(this.in)) this.on(el, 'input', refresh);
    this.on(this.el.querySelector('.js-regen'), 'click', () => { this.seed = Math.floor(Math.random() * 1e6); this.refresh(); });
    afficherChargementJusquaPret(this.el).then(() => this.refresh());
  }

  async refresh() {
    const moy = parseFloat(this.in.moy.value) || 50;
    const sig = parseFloat(this.in.sig.value) || 1;
    const n   = parseInt(this.in.n.value)     || 200;
    const portee = parseFloat(this.in.portee.value) || 10;
    const pente  = parseFloat(this.in.pente.value)  || 0;
    this.pv.textContent = portee.toFixed(0);
    this.tv.textContent = pente.toFixed(3);

    // === Simulation + analyse via la VRAIE librairie ===
    const vals = await gpoly.simulerStandards(n, moy, sig, portee, pente, this.seed);
    const an = await gpoly.analyserStandards(vals, moy, sig);

    // Determiner couleur de chaque point selon la regle la plus severe
    const colors = new Array(n).fill(COL_OK);
    for (const c of CRITERES) {
      for (const i of (an.anomalies[c.key] || [])) {
        if (colors[i] === COL_OK) colors[i] = c.col;
      }
    }
    const xs = Array.from({ length: n }, (_, i) => i + 1);

    if (!window.Plotly) { this.afficherAvertissement('Plotly non chargé.'); return; }
    const lignes = [
      { y: moy, c: '#333', w: 2, d: 'solid', t: 'Moyenne' },
      { y: moy + sig, c: '#28a745', w: 1, d: 'dash', t: '+1σ' },
      { y: moy - sig, c: '#28a745', w: 1, d: 'dash', t: '−1σ' },
      { y: moy + 2 * sig, c: '#ffc107', w: 1, d: 'dash', t: '+2σ' },
      { y: moy - 2 * sig, c: '#ffc107', w: 1, d: 'dash', t: '−2σ' },
      { y: moy + 3 * sig, c: '#dc3545', w: 1, d: 'dash', t: '+3σ' },
      { y: moy - 3 * sig, c: '#dc3545', w: 1, d: 'dash', t: '−3σ' },
    ];
    const shapes = lignes.map(l => ({ type: 'line', x0: 0, x1: n + 1, y0: l.y, y1: l.y, line: { color: l.c, width: l.w, dash: l.d } }));
    const annotations = lignes.map(l => ({ x: 0, y: l.y, xanchor: 'left', yanchor: 'bottom', showarrow: false, text: l.t, font: { size: 9, color: l.c } }));

    Plotly.react(this.plot, [{
      x: xs, y: Array.from(vals), mode: 'markers', type: 'scatter',
      marker: { color: colors, size: 6 },
      hovertemplate: 'n°%{x}<br>%{y:.3f}<extra></extra>',
    }], {
      margin: { t: 36, l: 60, r: 20, b: 40 },
      title: { text: 'Carte de contrôle des standards', font: { size: 13 } },
      xaxis: { title: "Numéro d'échantillon", range: [0, n + 1] },
      yaxis: { title: 'Teneur', range: [moy - 4.5 * sig, moy + 4.5 * sig] },
      shapes, annotations,
    }, { displaylogo: false, responsive: true });

    let sum = 0, sum2 = 0; for (const v of vals) { sum += v; sum2 += v * v; }
    const ml = sum / n, sl = Math.sqrt(Math.max(0, sum2 / n - ml * ml));
    this.infoEl.innerHTML =
      `<div style="padding:8px;border-radius:8px;background:#f8f8f8;border:1px solid #eee">Moyenne labo : <b>${ml.toFixed(4)}</b> | attendue : <b>${moy.toFixed(4)}</b></div>` +
      `<div style="padding:8px;border-radius:8px;background:#f8f8f8;border:1px solid #eee">σ labo : <b>${sl.toFixed(4)}</b> | Anomalies : <b>${an.n_anomalies}</b> / ${n}</div>`;
  }

  cleanup() { if (this.plot && window.Plotly) Plotly.purge(this.plot); }
}

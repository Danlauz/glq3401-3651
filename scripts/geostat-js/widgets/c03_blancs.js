// scripts/geostat-js/widgets/c03_blancs.js
// -----------------------------------------------------------------------------
// Widget « Analyse des blancs » (C03) — calcul LIVE via Pyodide.
// Simulation + analyse via geostat_polymtl.sampling.blancs (appelees via gpoly).
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

const CAT = [
  { lab: '< 1×LD',  col: '#28a745', key: null,        n: 'n_propres' },
  { lab: '1–3×LD',  col: '#ffc107', key: 'indices_1_3ld',  n: 'n_1_3ld' },
  { lab: '3–5×LD',  col: '#fd7e14', key: 'indices_3_5ld',  n: 'n_3_5ld' },
  { lab: '5–10×LD', col: '#dc3545', key: 'indices_5_10ld', n: 'n_5_10ld' },
  { lab: '> 10×LD', col: '#7b2d8d', key: 'indices_sup_10ld', n: 'n_sup_10ld' },
];
const debounce = (fn, ms = 200) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

export default class C03Blancs extends Widget {
  render() {
    this.seed = 42;
    this.el.insertAdjacentHTML('beforeend', `
      <div class="gw-controls">
        <label>Limite détection (LD)
          <input type="number" class="js-ld" value="0.005" step="0.001" min="0.0001" style="width:75px"></label>
        <label>Bruit
          <input type="range" class="js-noise" min="0.001" max="0.05" step="0.001" value="0.01"><span class="js-nval">0.010</span></label>
        <label>N échantillons
          <input type="number" class="js-n" value="200" step="10" min="20" max="1000" style="width:70px"></label>
        <button class="js-regen" type="button">Nouvelle série</button>
      </div>
      <div class="js-plot" style="height:340px"></div>
      <div class="js-stats" style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin:8px 1rem;font-size:12px;text-align:center"></div>
      <p style="margin:4px 1rem;font-size:11px;color:#666">
        Simulation et catégorisation via <code>geostat_polymtl.sampling.blancs</code>.</p>
    `);
    this.plot = this.el.querySelector('.js-plot');
    this.statsEl = this.el.querySelector('.js-stats');
    this.in = {
      ld:    this.el.querySelector('.js-ld'),
      noise: this.el.querySelector('.js-noise'),
      n:     this.el.querySelector('.js-n'),
    };
    this.nval = this.el.querySelector('.js-nval');
    const refresh = debounce(() => this.refresh(), 200);
    for (const el of Object.values(this.in)) this.on(el, 'input', refresh);
    this.on(this.el.querySelector('.js-regen'), 'click', () => { this.seed = Math.floor(Math.random() * 1e6); this.refresh(); });
    afficherChargementJusquaPret(this.el).then(() => this.refresh());
  }

  async refresh() {
    const ld    = parseFloat(this.in.ld.value)    || 0.005;
    const bruit = parseFloat(this.in.noise.value) || 0.01;
    const n     = parseInt(this.in.n.value)       || 200;
    this.nval.textContent = bruit.toFixed(3);

    // === Simulation + analyse via la VRAIE librairie ===
    const vals = await gpoly.simulerBlancs(n, bruit, this.seed);
    const an = await gpoly.analyserBlancs(vals, ld);

    // Determiner la categorie de chaque point pour la couleur
    const cat = new Array(n).fill(0);
    for (let k = 1; k < CAT.length; k++) {
      for (const i of an[CAT[k].key]) cat[i] = k;
    }
    const colors = cat.map(k => CAT[k].col);
    const xs = Array.from({ length: n }, (_, i) => i + 1);

    if (!window.Plotly) { this.afficherAvertissement('Plotly non chargé.'); return; }
    const shapes = [1, 3, 5, 10].map((m, i) => ({
      type: 'line', x0: 0, x1: n + 1, y0: ld * m, y1: ld * m,
      line: { color: CAT[i + 1].col, width: 1.5, dash: 'dash' },
    }));
    const annotations = [1, 3, 5, 10].map((m, i) => ({
      x: n, y: ld * m, xanchor: 'right', yanchor: 'bottom', showarrow: false,
      text: m + '×LD', font: { size: 10, color: CAT[i + 1].col },
    }));

    Plotly.react(this.plot, [{
      x: xs, y: Array.from(vals), mode: 'markers', type: 'scatter',
      marker: { color: colors, size: 6 },
      hovertemplate: 'n°%{x}<br>%{y:.4f}<extra></extra>',
    }], {
      margin: { t: 36, l: 60, r: 20, b: 40 },
      title: { text: 'Analyse des blancs — série temporelle', font: { size: 13 } },
      xaxis: { title: "Numéro d'échantillon", range: [0, n + 1] },
      yaxis: { title: 'Teneur mesurée', rangemode: 'tozero' },
      shapes, annotations,
    }, { displaylogo: false, responsive: true });

    // n_propres = total - tous les contamines
    const n_contamines = an.n_1_3ld + an.n_3_5ld + an.n_5_10ld + an.n_sup_10ld;
    const counts = [an.n_total - n_contamines, an.n_1_3ld, an.n_3_5ld, an.n_5_10ld, an.n_sup_10ld];
    const pct = c => (c / an.n_total * 100).toFixed(1) + ' %';
    this.statsEl.innerHTML = CAT.map((c, k) =>
      `<div style="padding:8px;border-radius:8px;background:#f8f8f8;border:1px solid #eee">${c.lab}
         <b style="display:block;font-size:1.2em;color:${c.col}">${counts[k]}<br>(${pct(counts[k])})</b></div>`
    ).join('');
  }

  cleanup() { if (this.plot && window.Plotly) Plotly.purge(this.plot); }
}

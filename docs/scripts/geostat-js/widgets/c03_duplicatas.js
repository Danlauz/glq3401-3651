// scripts/geostat-js/widgets/c03_duplicatas.js
// -----------------------------------------------------------------------------
// Widget « Analyse des duplicatas » (C03) — calcul LIVE via Pyodide.
// Simulation : geostat_polymtl.sampling.duplicatas.simuler_duplicatas.
// Metriques (HARD, diff relative, comptages) : sampling.duplicatas.analyser_duplicatas.
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

const debounce = (fn, ms = 200) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

export default class C03Duplicatas extends Widget {
  render() {
    this.seed = 777;
    this.el.insertAdjacentHTML('beforeend', `
      <div class="gw-controls">
        <label>Médiane <input type="number" class="js-med" value="2.0" step="0.1" min="0.01" style="width:65px"></label>
        <label>σ <input type="range" class="js-sigma" min="0.05" max="1.0" step="0.05" value="0.30"><span class="js-sv">0.30</span></label>
        <label>Corrélation <input type="range" class="js-corr" min="0.5" max="0.999" step="0.005" value="0.95"><span class="js-cv">0.95</span></label>
        <label>N paires <input type="number" class="js-n" value="200" step="10" min="20" max="500" style="width:60px"></label>
        <button class="js-regen" type="button">Nouvelle série</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 1rem">
        <div class="js-p1" style="height:300px"></div>
        <div class="js-p2" style="height:300px"></div>
      </div>
      <div class="js-p3" style="height:280px;padding:0 1rem"></div>
      <div class="js-stats" style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:8px 1rem;font-size:12px;text-align:center"></div>
      <p style="margin:4px 1rem;font-size:11px;color:#666">
        Simulation et analyse via <code>geostat_polymtl.sampling.duplicatas</code>.</p>
    `);
    this.p1 = this.el.querySelector('.js-p1');
    this.p2 = this.el.querySelector('.js-p2');
    this.p3 = this.el.querySelector('.js-p3');
    this.statsEl = this.el.querySelector('.js-stats');
    this.in = {
      med:   this.el.querySelector('.js-med'),
      sigma: this.el.querySelector('.js-sigma'),
      corr:  this.el.querySelector('.js-corr'),
      n:     this.el.querySelector('.js-n'),
    };
    this.sv = this.el.querySelector('.js-sv');
    this.cv = this.el.querySelector('.js-cv');
    const refresh = debounce(() => this.refresh(), 200);
    for (const el of Object.values(this.in)) this.on(el, 'input', refresh);
    this.on(this.el.querySelector('.js-regen'), 'click', () => { this.seed = Math.floor(Math.random() * 1e6); this.refresh(); });
    afficherChargementJusquaPret(this.el).then(() => this.refresh());
  }

  async refresh() {
    const med   = parseFloat(this.in.med.value)   || 2;
    const sigma = parseFloat(this.in.sigma.value) || 0.3;
    const corr  = parseFloat(this.in.corr.value)  || 0.95;
    const n     = parseInt(this.in.n.value)       || 200;
    this.sv.textContent = sigma.toFixed(2);
    this.cv.textContent = corr.toFixed(2);

    // === Simulation + analyse via la VRAIE librairie ===
    const sim = await gpoly.simulerDuplicatas(n, med, sigma, corr, this.seed);
    const an  = await gpoly.analyserDuplicatas(sim.d1, sim.d2);
    const d1 = sim.d1, d2 = sim.d2;

    if (!window.Plotly) { this.afficherAvertissement('Plotly non chargé.'); return; }
    const vmax = Math.max(...d1, ...d2) * 1.1;
    const cfg = { displaylogo: false, responsive: true };

    // Panel 1 : scatter d1 vs d2 + 1:1
    Plotly.react(this.p1, [
      { x: [0, vmax], y: [0, vmax], mode: 'lines', line: { color: '#ccc', dash: 'dash' }, hoverinfo: 'skip', showlegend: false },
      { x: [0, vmax], y: [0, vmax * 1.1], mode: 'lines', line: { color: '#ffc107', dash: 'dot', width: 1 }, hoverinfo: 'skip', showlegend: false },
      { x: [0, vmax], y: [0, vmax * 0.9], mode: 'lines', line: { color: '#ffc107', dash: 'dot', width: 1 }, hoverinfo: 'skip', showlegend: false },
      { x: d1, y: d2, mode: 'markers', marker: { color: 'rgba(13,77,146,0.5)', size: 5 }, showlegend: false, hovertemplate: 'd1=%{x:.2f}<br>d2=%{y:.2f}<extra></extra>' },
    ], {
      margin: { t: 34, l: 50, r: 12, b: 40 },
      title: { text: 'Duplicatas — d1 vs d2', font: { size: 12 } },
      xaxis: { title: 'Échantillon 1', range: [0, vmax] },
      yaxis: { title: 'Échantillon 2', range: [0, vmax], scaleanchor: 'x' },
    }, cfg);

    // Panel 2 : differences relatives
    const absRd = an.diff_relative.map(Math.abs);
    const rdmax = Math.max(15, Math.max(...absRd) * 1.1);
    Plotly.react(this.p2, [{
      x: an.moyennes, y: absRd, mode: 'markers',
      marker: { color: 'rgba(13,77,146,0.5)', size: 5 }, showlegend: false,
      hovertemplate: 'moy=%{x:.2f}<br>|Δ|=%{y:.1f}%<extra></extra>',
    }], {
      margin: { t: 34, l: 50, r: 12, b: 40 },
      title: { text: 'Différence relative |%|', font: { size: 12 } },
      xaxis: { title: 'Moyenne (d1+d2)/2', range: [0, vmax] },
      yaxis: { title: '|diff. rel.| (%)', range: [0, rdmax] },
      shapes: [{ type: 'line', x0: 0, x1: vmax, y0: 10, y1: 10, line: { color: '#dc3545', dash: 'dash', width: 1.5 } }],
      annotations: [{ x: vmax, y: 10, xanchor: 'right', yanchor: 'bottom', showarrow: false, text: '10 %', font: { size: 10, color: '#dc3545' } }],
    }, cfg);

    // Panel 3 : courbe HARD (hard_values triees vs hard_ranks)
    Plotly.react(this.p3, [{
      x: an.hard_values, y: an.hard_ranks, mode: 'lines', line: { color: '#111', width: 2.5 },
      showlegend: false, hovertemplate: 'HARD=%{x:.3f}<br>rang=%{y:.1%}<extra></extra>',
    }, {
      x: [0.1], y: [0.9], mode: 'markers', marker: { color: '#dc3545', size: 10 },
      showlegend: false, hovertemplate: 'Cible (0.1 ; 90 %)<extra></extra>',
    }], {
      margin: { t: 34, l: 55, r: 15, b: 40 },
      title: { text: 'HARD — Half Absolute Relative Difference', font: { size: 12 } },
      xaxis: { title: 'HARD', range: [0, 0.5] },
      yaxis: { title: 'Rang normalisé', range: [0, 1] },
      shapes: [
        { type: 'line', x0: 0.1, x1: 0.1, y0: 0, y1: 1, line: { color: '#dc3545', dash: 'dash', width: 1.5 } },
        { type: 'line', x0: 0, x1: 0.5, y0: 0.9, y1: 0.9, line: { color: '#28a745', dash: 'dash', width: 1.5 } },
      ],
    }, cfg);

    const cells = [
      ['% HARD < 10 %', an.pct_hard_sous_10.toFixed(1) + ' %' + (an.pct_hard_sous_10 >= 90 ? ' ✅' : ' ⚠️')],
      ['Hors ±10 %', `${an.n_hors_10pct}/${an.n_total}`],
      ['Hors ±20 %', `${an.n_hors_20pct}/${an.n_total}`],
      ['Hors ±30 %', `${an.n_hors_30pct}/${an.n_total}`],
    ];
    this.statsEl.innerHTML = cells.map(([l, v]) =>
      `<div style="padding:8px;border-radius:8px;background:#f8f8f8;border:1px solid #eee">${l}<b style="display:block;font-size:1.2em">${v}</b></div>`).join('');
  }

  cleanup() { if (window.Plotly) for (const p of [this.p1, this.p2, this.p3]) if (p) Plotly.purge(p); }
}

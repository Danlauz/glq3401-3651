// scripts/geostat-js/widgets/c07_modeles.js
// -----------------------------------------------------------------------------
// Widget C07 — Atelier 7.3 « Modèles théoriques de variogramme ».
// Compare γ(h) pour les modèles BORNÉS (sphérique, exponentiel, gaussien) sous
// portée/palier/pépite communs, et le modèle de PUISSANCE non borné
// γ(h) = C0 + C·(h/a)^b pour trois exposants b = 0,5 / 1 / 1,5.
// Les modèles bornés viennent de geostat_polymtl (cov_func.covar via
// gpoly.variogrammeTheorique). Le modèle de puissance est défini directement
// (ce n'est pas un modèle de covariance — il n'a pas de palier).
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

const COL = { sph: '#2563eb', exp: '#ea580c', gau: '#16a34a', ref: '#9aa0a6' };
const MODELES = [
  { key: 'spherique',   nom: 'Sphérique',   color: COL.sph },
  { key: 'exponentiel', nom: 'Exponentiel', color: COL.exp },
  { key: 'gaussien',    nom: 'Gaussien',    color: COL.gau },
];
// Modèle de puissance : trois exposants fixes, ancrés sur (a, C+C0).
const PUISS = [
  { b: 0.5, nom: 'b = 0,5', color: '#c084fc' },
  { b: 1.0, nom: 'b = 1,0', color: '#7c3aed' },
  { b: 1.5, nom: 'b = 1,5', color: '#4c1d95' },
];
const debounce = (fn, ms = 120) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

export default class C07Modeles extends Widget {
  render() {
    const sw = c => `<span style="display:inline-block;width:18px;border-top:3px solid ${c};vertical-align:middle"></span>`;
    this.el.insertAdjacentHTML('beforeend', `
      <div class="gw-controls" style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.85rem;">
        <label>Portée a <input type="range" class="js-a" min="5" max="80" value="30" step="1" style="width:140px"><span class="js-av">30</span></label>
        <label>Palier C <input type="range" class="js-c" min="0.1" max="2" value="1.0" step="0.05" style="width:120px"><span class="js-cv">1.0</span></label>
        <label>Pépite C₀ <input type="range" class="js-c0" min="0" max="0.5" value="0.1" step="0.01" style="width:120px"><span class="js-c0v">0.1</span></label>
      </div>
      <div class="js-plot" style="height:380px"></div>
      <div style="display:flex;gap:18px;flex-wrap:wrap;justify-content:center;font-size:.8rem;color:#333;margin:6px 0 2px;">
        <span>${sw(COL.sph)} Sphérique</span>
        <span>${sw(COL.exp)} Exponentiel</span>
        <span>${sw(COL.gau)} Gaussien</span>
        <span>${sw(PUISS[0].color)} Puissance b = 0,5</span>
        <span>${sw(PUISS[1].color)} Puissance b = 1,0</span>
        <span>${sw(PUISS[2].color)} Puissance b = 1,5</span>
      </div>
      <p style="margin:4px 1rem;font-size:11px;color:#666;">
        Modèles bornés via <code>geostat_polymtl.cov_func.covar</code> (portée pratique 95 %).</p>
    `);

    this.plot = this.el.querySelector('.js-plot');
    this.ctrl = {
      a:  this.el.querySelector('.js-a'),
      c:  this.el.querySelector('.js-c'),
      c0: this.el.querySelector('.js-c0'),
    };
    const update = debounce(() => this.refresh(), 120);
    for (const [k, el] of Object.entries(this.ctrl)) {
      this.on(el, 'input', e => { this.el.querySelector(`.js-${k}v`).textContent = e.target.value; update(); });
    }
    afficherChargementJusquaPret(this.el).then(() => this.refresh());
  }

  async refresh() {
    const a  = parseFloat(this.ctrl.a.value);
    const c  = parseFloat(this.ctrl.c.value);
    const c0 = parseFloat(this.ctrl.c0.value);
    const h_max = 100;   // axe distance fixe 0–100 (ne bouge pas avec la portée)
    const lags = []; for (let i = 0; i <= 120; i++) lags.push(i * h_max / 120);

    let courbes;
    try {
      courbes = await Promise.all(MODELES.map(async m => {
        const g = await gpoly.variogrammeTheorique(m.key, lags, a, c);
        return { ...m, y: Array.from(g, (v, i) => v + (lags[i] > 0 ? c0 : 0)) };
      }));
    } catch (e) { this.afficherAvertissement('Erreur variogramme : ' + e.message); return; }

    const sill = c + c0;
    // Puissance ancrée : γ(h) = C0 + C·(h/a)^b → passe par (a, C+C0) pour tout b.
    const puiss = PUISS.map(p => ({ ...p, y: lags.map(h => h > 0 ? c0 + c * Math.pow(h / a, p.b) : 0) }));
    const yTop = 2.5;   // axe γ fixe 0–2,5 (ne bouge pas avec le palier)

    if (!window.Plotly) { this.afficherAvertissement('Plotly non chargé.'); return; }
    const traces = [];
    for (const m of courbes) traces.push({ x: lags, y: m.y, mode: 'lines', line: { color: m.color, width: 3 }, hoverinfo: 'skip', showlegend: false });
    for (const p of puiss) traces.push({ x: lags, y: p.y, mode: 'lines', line: { color: p.color, width: 2.5, dash: 'dash' }, hoverinfo: 'skip', showlegend: false });
    traces.push({ x: [0, h_max], y: [sill, sill], mode: 'lines', line: { color: COL.ref, dash: 'dash', width: 1 }, hoverinfo: 'skip', showlegend: false });
    traces.push({ x: [a, a], y: [0, sill], mode: 'lines', line: { color: COL.ref, dash: 'dot', width: 1 }, hoverinfo: 'skip', showlegend: false });

    Plotly.react(this.plot, traces, {
      margin: { t: 20, l: 54, r: 16, b: 44 },
      showlegend: false,
      annotations: [
        { x: h_max, y: sill, xref: 'x', yref: 'y', text: 'palier C + C₀', showarrow: false, font: { size: 10, color: '#777' }, xanchor: 'right', yanchor: 'bottom' },
        { x: a, y: 0, xref: 'x', yref: 'y', text: 'a', showarrow: false, font: { size: 11, color: '#777' }, xanchor: 'left', yanchor: 'bottom' },
      ],
      xaxis: { title: 'Distance h', range: [0, h_max], gridcolor: '#eee', zeroline: false },
      yaxis: { title: 'γ(h)', range: [0, yTop], gridcolor: '#eee', zeroline: false },
      plot_bgcolor: '#fff',
    }, { displaylogo: false, responsive: true });
  }

  cleanup() { if (this.plot && window.Plotly) Plotly.purge(this.plot); }
}

// scripts/geostat-js/widgets/c06_effet_information.js
// -----------------------------------------------------------------------------
// Widget « Effet d'information » (C06) — calque du notebook Chap1_EffetInformation.
//
// Affiche, comme le notebook : la carte du champ RÉEL, la carte du champ ESTIMÉ
// (réel × (1+biais) + bruit), et le NUAGE réel-vs-estimé avec classification au
// cutoff (minerai ignoré / stérile traité), droite 1:1 et droite de régression.
//
// Tous les calculs (champ, biais, bruit, classification, régression) sont faits
// par geostat_polymtl via gpoly.effetInformationScenario (Pyodide). Aucune
// mathématique côté JS — seulement la mise en forme Plotly.
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

const COL = { gray: '#c9c6c0', blue: '#0173B2', red: '#CC0000', reg: '#1a8a4a' };
// Palette « Turbo » (bleu -> rouge), identique aux champs des chapitres précédents.
const TURBO = [
  [0.0, 'rgb(48,18,59)'], [0.1, 'rgb(65,69,217)'], [0.2, 'rgb(35,138,244)'],
  [0.3, 'rgb(30,192,211)'], [0.4, 'rgb(53,226,149)'], [0.5, 'rgb(131,246,88)'],
  [0.6, 'rgb(199,233,47)'], [0.7, 'rgb(248,186,56)'], [0.8, 'rgb(251,122,33)'],
  [0.9, 'rgb(221,61,8)'], [1.0, 'rgb(122,4,3)'],
];
const debounce = (fn, ms = 220) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

const CONFIG = {
  taille: 200,
  portee: 30,
  seed: 42,
  v_min: 0.0, v_max: 10.0,
  biais_values:  [-50, -20, -10, -5, 0, 5, 10, 20, 50],
  bruit_values:  [0.0, 0.1, 0.2, 0.3, 0.5, 0.8, 1.2, 2.0],
  cutoff_values: [1, 2, 3, 4, 5, 6, 8],
};

export default class C06EffetInformation extends Widget {
  render() {
    this.el.insertAdjacentHTML('beforeend', `
      <div class="gw-controls">
        <label>Biais (%)
          <select class="js-biais">${CONFIG.biais_values.map(b => `<option value="${b}">${b > 0 ? '+' + b : b}</option>`).join('')}</select></label>
        <label>Écart-type bruit σ
          <select class="js-bruit">${CONFIG.bruit_values.map(b => `<option value="${b}">${b.toFixed(2)}</option>`).join('')}</select></label>
        <label>Teneur de coupure
          <select class="js-cutoff">${CONFIG.cutoff_values.map(c => `<option value="${c}">${c}</option>`).join('')}</select></label>
        <button class="js-regen" type="button">Nouveau champ</button>
      </div>
      <div class="js-plot" style="height:380px"></div>
      <div class="js-stats" style="padding:.5rem 1rem; font-family:'JetBrains Mono',monospace; font-size:.82rem; color:#444;"></div>
      <p style="margin:4px 1rem;font-size:11px;color:#666">
        Calculs effectués par <code>geostat_polymtl.data.synthetic.champ_fftma_2d</code> (champ, biais, bruit, classification, régression).</p>
    `);

    this.plot = this.el.querySelector('.js-plot');
    this.statsEl = this.el.querySelector('.js-stats');
    this.sel = {
      biais:  this.el.querySelector('.js-biais'),
      bruit:  this.el.querySelector('.js-bruit'),
      cutoff: this.el.querySelector('.js-cutoff'),
    };
    this.sel.biais.value  = '0';
    this.sel.bruit.value  = '0.5';
    this.sel.cutoff.value = '2';
    this.seed = CONFIG.seed;

    const refresh = debounce(() => this.refresh(), 200);
    for (const s of Object.values(this.sel)) this.on(s, 'change', refresh);
    this.on(this.el.querySelector('.js-regen'), 'click', () => { this.seed++; this.refresh(); });
    afficherChargementJusquaPret(this.el).then(() => this.refresh());
  }

  async refresh() {
    const biais  = parseFloat(this.sel.biais.value);
    const bruit  = parseFloat(this.sel.bruit.value);
    const cutoff = parseFloat(this.sel.cutoff.value);
    const { v_min: vmin, v_max: vmax } = CONFIG;

    let s;
    try {
      this.statsEl.textContent = 'Calcul en cours…';
      s = await gpoly.effetInformationScenario(
        CONFIG.taille, CONFIG.portee, this.seed, biais, bruit, cutoff, vmin, vmax);
    } catch (e) { this.afficherAvertissement('Erreur scénario : ' + e.message); return; }
    if (!window.Plotly) { this.afficherAvertissement('Plotly non chargé.'); return; }

    // Répartition de l'échantillon du nuage par classe.
    const gx = [], gy = [], bx = [], by = [], rx = [], ry = [];
    for (let i = 0; i < s.sx.length; i++) {
      const c = s.sc[i];
      if (c === 1)      { bx.push(s.sx[i]); by.push(s.sy[i]); }
      else if (c === 2) { rx.push(s.sx[i]); ry.push(s.sy[i]); }
      else              { gx.push(s.sx[i]); gy.push(s.sy[i]); }
    }
    const regY0 = s.reg_slope * vmin + s.reg_intercept;
    const regY1 = s.reg_slope * vmax + s.reg_intercept;

    const traces = [
      // Cartes réelle / estimée (coordonnées en mètres : 1 pixel = 1 m)
      { type: 'heatmap', z: s.real_clipped, x0: 0.5, dx: 1, y0: 0.5, dy: 1, colorscale: TURBO, zmin: vmin, zmax: vmax,
        showscale: false, xaxis: 'x', yaxis: 'y' },
      { type: 'heatmap', z: s.estime_clipped, x0: 0.5, dx: 1, y0: 0.5, dy: 1, colorscale: TURBO, zmin: vmin, zmax: vmax,
        colorbar: { title: { text: 'Teneur', side: 'right', font: { size: 9 } }, x: 0.625, len: 0.66, y: 0.52, thickness: 9, tickfont: { size: 8 } },
        xaxis: 'x2', yaxis: 'y2' },
      // Nuage réel vs estimé
      { type: 'scattergl', mode: 'markers', x: gx, y: gy, name: 'Correctement classé',
        marker: { color: COL.gray, size: 4, opacity: 0.45 }, xaxis: 'x3', yaxis: 'y3' },
      { type: 'scattergl', mode: 'markers', x: bx, y: by, name: `Stérile traité (${s.pct_blue.toFixed(1)} %)`,
        marker: { color: COL.blue, size: 5, opacity: 0.75, line: { color: '#000', width: 0.2 } }, xaxis: 'x3', yaxis: 'y3' },
      { type: 'scattergl', mode: 'markers', x: rx, y: ry, name: `Minerai ignoré (${s.pct_red.toFixed(1)} %)`,
        marker: { color: COL.red, size: 5, opacity: 0.75, line: { color: '#000', width: 0.2 } }, xaxis: 'x3', yaxis: 'y3' },
      // Droite 1:1
      { type: 'scatter', mode: 'lines', x: [vmin, vmax], y: [vmin, vmax], name: 'Ligne 1:1',
        line: { color: '#000', width: 2 }, xaxis: 'x3', yaxis: 'y3' },
      // Droite de régression
      { type: 'scatter', mode: 'lines', x: [vmin, vmax], y: [regY0, regY1],
        name: `Régression : y = ${s.reg_slope.toFixed(2)}x + ${s.reg_intercept.toFixed(2)}`,
        line: { color: COL.reg, width: 2, dash: 'dash' }, xaxis: 'x3', yaxis: 'y3' },
    ];

    const T = CONFIG.taille;
    const layout = {
      showlegend: true,
      legend: { orientation: 'h', y: -0.2, x: 0.5, xanchor: 'center', font: { size: 9 } },
      margin: { t: 36, b: 70, l: 42, r: 14 },
      annotations: [
        { text: 'Champ réel', x: 0.135, y: 0.99, xref: 'paper', yref: 'paper', showarrow: false, font: { size: 11 }, xanchor: 'center', yanchor: 'bottom' },
        { text: 'Champ estimé', x: 0.465, y: 0.99, xref: 'paper', yref: 'paper', showarrow: false, font: { size: 11 }, xanchor: 'center', yanchor: 'bottom' },
        { text: 'Réel vs estimé', x: 0.875, y: 0.99, xref: 'paper', yref: 'paper', showarrow: false, font: { size: 11 }, xanchor: 'center', yanchor: 'bottom' },
      ],
      shapes: [
        // Lignes de cutoff sur le nuage
        { type: 'line', xref: 'x3', yref: 'y3', x0: cutoff, x1: cutoff, y0: vmin, y1: vmax, line: { color: '#444', width: 1, dash: 'dot' } },
        { type: 'line', xref: 'x3', yref: 'y3', x0: vmin, x1: vmax, y0: cutoff, y1: cutoff, line: { color: '#444', width: 1, dash: 'dot' } },
      ],
      xaxis:  { domain: [0, 0.27],    anchor: 'y',  title: { text: 'X (m)', font: { size: 9 } }, range: [0, T], dtick: 50, tickfont: { size: 8 } },
      yaxis:  { domain: [0.12, 0.92], anchor: 'x',  title: { text: 'Y (m)', font: { size: 9 } }, range: [T, 0], dtick: 50, tickfont: { size: 8 }, scaleanchor: 'x' },
      xaxis2: { domain: [0.33, 0.60], anchor: 'y2', title: { text: 'X (m)', font: { size: 9 } }, range: [0, T], dtick: 50, tickfont: { size: 8 } },
      yaxis2: { domain: [0.12, 0.92], anchor: 'x2', range: [T, 0], dtick: 50, tickfont: { size: 8 }, scaleanchor: 'x2' },
      xaxis3: { domain: [0.75, 1.0],  anchor: 'y3', title: { text: 'Teneur estimée', font: { size: 9 } }, range: [vmin, vmax], tickfont: { size: 8 } },
      yaxis3: { domain: [0.12, 0.92], anchor: 'x3', title: { text: 'Teneur réelle', font: { size: 9 } }, range: [vmin, vmax], scaleanchor: 'x3', tickfont: { size: 8 } },
    };

    Plotly.react(this.plot, traces, layout, { displaylogo: false, responsive: true });

    this.statsEl.innerHTML =
      `Biais ${biais > 0 ? '+' : ''}${biais} % · bruit σ=${bruit.toFixed(2)} · coupure ${cutoff} &nbsp;|&nbsp; ` +
      `<span style="color:${COL.red}">● Minerai ignoré : ${s.pct_red.toFixed(2)} %</span> &nbsp; ` +
      `<span style="color:${COL.blue}">● Stérile traité : ${s.pct_blue.toFixed(2)} %</span> &nbsp;|&nbsp; ` +
      `régression : pente ${s.reg_slope.toFixed(2)}`;
  }

  cleanup() { if (this.plot && window.Plotly) Plotly.purge(this.plot); }
}

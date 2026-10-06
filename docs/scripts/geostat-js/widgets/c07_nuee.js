// scripts/geostat-js/widgets/c07_nuee.js
// -----------------------------------------------------------------------------
// Widget C07 — Atelier 7.1 « Nuée variographique ».
//
// Calque du texte (07-02 / @fig-nuee) :
//   - PANNEAU GAUCHE  : champ gaussien 2D (carte Turbo) + points d'échantillonnage
//                       (rouges) + un couple de points mis en évidence (jaune).
//   - PANNEAU DROIT   : nuée des paires (h, γ), le couple en rouge, le variogramme
//                       expérimental binné (noir) et le modèle théorique (rouge).
//
// Toute la géostat (simulation GFFTMA, nuée, binning, variogramme théorique)
// vient de geostat_polymtl via gpoly. Le seul JS = tirage d'indices + la
// demi-variance du couple mis en évidence (définition, mise en forme).
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

// Palette « Turbo » (bleu -> rouge), uniforme avec les autres champs du livre.
const TURBO = [
  [0.0, 'rgb(48,18,59)'], [0.1, 'rgb(65,69,217)'], [0.2, 'rgb(35,138,244)'],
  [0.3, 'rgb(30,192,211)'], [0.4, 'rgb(53,226,149)'], [0.5, 'rgb(131,246,88)'],
  [0.6, 'rgb(199,233,47)'], [0.7, 'rgb(248,186,56)'], [0.8, 'rgb(251,122,33)'],
  [0.9, 'rgb(221,61,8)'], [1.0, 'rgb(122,4,3)'],
];

const CONFIG = {
  N: 100,                  // grille de simulation N x N
  portee_defaut: 25,
  palier_defaut: 1.0,
  pepite_defaut: 0.0,   // pas d'effet de pépite dans le champ
  n_points_defaut: 60,
};

export default class C07Nuee extends Widget {
  render() {
    this.el.insertAdjacentHTML('beforeend', `
      <div class="gw-controls" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;">
        <label>Modèle <select class="js-mod">
          <option value="spherique">Sphérique</option>
          <option value="exponentiel">Exponentiel</option>
          <option value="gaussien">Gaussien</option>
        </select></label>
        <label>N points
          <input type="range" class="js-n" min="20" max="120" value="${CONFIG.n_points_defaut}" step="5" style="width:120px">
          <span class="js-nv">${CONFIG.n_points_defaut}</span></label>
        <label>Portée a
          <input type="range" class="js-a" min="5" max="60" value="${CONFIG.portee_defaut}" step="1" style="width:120px">
          <span class="js-av">${CONFIG.portee_defaut}</span></label>
        <label>N classes
          <input type="range" class="js-lags" min="5" max="20" value="10" step="1" style="width:100px">
          <span class="js-lagsv">10</span></label>
        <button class="js-couple" type="button" style="font-size:.76rem;padding:3px 8px;background:#9a7b00;color:#fff;border:none;border-radius:4px;cursor:pointer;">Autre couple</button>
        <button class="js-regen" type="button" style="font-size:.76rem;padding:3px 8px;background:#3a3632;color:#fff;border:none;border-radius:4px;cursor:pointer;">Nouvelle simulation</button>
      </div>
      <div class="js-plot" style="height:430px"></div>
      <p style="margin:4px 1rem;font-size:11px;color:#666;">
        Simulation : <code>simulation_methods.GFFTMA</code> ·
        Nuée + binning : <code>exp_variogram.scatter</code></p>
    `);

    this.plot = this.el.querySelector('.js-plot');
    this.ctrl = {
      mod:  this.el.querySelector('.js-mod'),
      n:    this.el.querySelector('.js-n'),
      a:    this.el.querySelector('.js-a'),
      lags: this.el.querySelector('.js-lags'),
    };
    this.seed = 42;
    this.coupleSeed = 1;

    const onChange = debounce(() => this.regenerer(), 250);
    for (const [k, el] of Object.entries(this.ctrl)) {
      const tag = el.tagName;
      this.on(el, tag === 'SELECT' ? 'change' : 'input', e => {
        if (e.target.type === 'range') {
          const span = this.el.querySelector(`.js-${k}v`);
          if (span) span.textContent = e.target.value;
        }
      });
      this.on(el, 'change', onChange);
    }
    this.on(this.el.querySelector('.js-regen'), 'click', () => {
      this.seed = (this.seed + 1) | 0; this.regenerer();
    });
    // Choisir un autre couple sans recalculer la simulation/nuée.
    this.on(this.el.querySelector('.js-couple'), 'click', () => {
      this.coupleSeed++; if (this._last) this._dessiner(this._last);
    });
    afficherChargementJusquaPret(this.el).then(() => this.regenerer());
  }

  async regenerer() {
    const N = CONFIG.N;
    const mod = this.ctrl.mod.value;
    const a   = parseFloat(this.ctrl.a.value);
    const npt = parseInt(this.ctrl.n.value, 10);
    const nL  = parseInt(this.ctrl.lags.value, 10);

    // 1) Simulation du champ (GFFTMA)
    let champ;
    try {
      champ = await gpoly.simulerChamp(mod, a, CONFIG.pepite_defaut, this.seed, N,
                                        'gaussien', 0.0, CONFIG.palier_defaut);
    } catch (e) { this.afficherAvertissement('Erreur simulation : ' + e.message); return; }

    // 2) Tirage de npt indices distincts (LCG seedable)
    let s = this.seed * 1664525 + 1013904223;
    const rng = () => { s = (s * 1664525 + 1013904223) | 0; return ((s >>> 0) / 4294967296); };
    const choisi = new Set();
    while (choisi.size < npt) choisi.add(Math.floor(rng() * N * N));
    const coords = [];
    const valeurs = new Float64Array(npt);
    let k = 0;
    for (const idx of choisi) {
      const y = Math.floor(idx / N), x = idx - y * N;
      coords.push([x, y]); valeurs[k] = champ[idx]; k++;
    }

    // 3) Nuée + variogramme expérimental + théorique (tout via gpoly)
    const H_AXE = 100;   // on coupe la nuée et les courbes à h = 100 (= côté du champ)
    let nuee, vario;
    try {
      [nuee, vario] = await Promise.all([
        gpoly.nueeVariographique(coords, valeurs),
        gpoly.variogrammeScatter(coords, valeurs, nL, H_AXE),
      ]);
    } catch (e) { this.afficherAvertissement('Erreur variogramme : ' + e.message); return; }

    const lags_theo = []; for (let i = 0; i <= 100; i++) lags_theo.push(i * H_AXE / 100);
    let g_theo;
    try {
      g_theo = await gpoly.variogrammeTheorique(mod, lags_theo, a, CONFIG.palier_defaut);
      g_theo = Array.from(g_theo, (v, i) => v + (lags_theo[i] > 0 ? CONFIG.pepite_defaut : 0));
    } catch (e) { this.afficherAvertissement('Erreur theorique : ' + e.message); return; }

    // Matrice du champ pour la heatmap
    const M = new Array(N);
    for (let yy = 0; yy < N; yy++) { const row = new Array(N); for (let xx = 0; xx < N; xx++) row[xx] = champ[yy * N + xx]; M[yy] = row; }

    this._last = { N, M, coords, valeurs, nuee, vario, lags_theo, g_theo };
    this._dessiner(this._last);
  }

  _dessiner(d) {
    const { N, M, coords, valeurs, nuee, vario, lags_theo, g_theo } = d;
    // Couple mis en évidence : deux points distincts (choix reproductible).
    const npt = coords.length;
    let s = (this.coupleSeed * 2654435761) >>> 0;
    const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    const i0 = Math.floor(r() * npt); let i1 = Math.floor(r() * npt);
    if (i1 === i0) i1 = (i1 + 1) % npt;
    const p0 = coords[i0], p1 = coords[i1];
    const hC = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    const gC = 0.5 * (valeurs[i0] - valeurs[i1]) ** 2;

    const xs = coords.map(c => c[0]), ys = coords.map(c => c[1]);

    if (!window.Plotly) { this.afficherAvertissement('Plotly non chargé.'); return; }
    // Lignes verticales noires pointillées aux bornes des classes (bins) — aide pédagogique.
    const ctr = vario.h.filter(Number.isFinite);
    const binShapes = [];
    if (ctr.length >= 2) {
      const w = ctr[1] - ctr[0];
      const edges = ctr.map(c => c - w / 2); edges.push(ctr[ctr.length - 1] + w / 2);
      for (const e of edges) binShapes.push({ type: 'line', xref: 'x2', yref: 'paper', x0: e, x1: e, y0: 0, y1: 1, line: { color: 'rgba(0,0,0,0.5)', width: 0.8, dash: 'dot' } });
    }
    Plotly.react(this.plot, [
      // ----- PANNEAU GAUCHE : champ + points + couple -----
      { type: 'heatmap', z: M, colorscale: TURBO, showscale: false, xaxis: 'x', yaxis: 'y', hoverinfo: 'skip' },
      { type: 'scattergl', x: xs, y: ys, mode: 'markers', name: 'Échantillons',
        marker: { color: '#CC0000', size: 5, line: { color: '#fff', width: 0.5 } }, xaxis: 'x', yaxis: 'y' },
      { type: 'scatter', x: [p0[0], p1[0]], y: [p0[1], p1[1]], mode: 'lines+markers', name: 'Couple (champ)',
        line: { color: '#ffd500', width: 2.5 }, marker: { color: '#ffd500', size: 10, line: { color: '#000', width: 1 } }, xaxis: 'x', yaxis: 'y' },
      // ----- PANNEAU DROIT : nuée + couple + expérimental + théorique -----
      { type: 'scattergl', x: nuee.h, y: nuee.gamma, mode: 'markers', name: 'Nuée (paires)',
        marker: { color: 'rgba(80,80,100,0.18)', size: 4 }, xaxis: 'x2', yaxis: 'y2' },
      { type: 'scatter', x: [hC], y: [gC], mode: 'markers', name: 'Couple (nuée)',
        marker: { color: '#CC0000', size: 13, symbol: 'star', line: { color: '#000', width: 0.6 } }, xaxis: 'x2', yaxis: 'y2' },
      { type: 'scatter', x: vario.h, y: vario.gamma, mode: 'lines+markers', name: 'Variogramme expérimental',
        line: { color: '#000', width: 2 }, marker: { color: '#000', size: 6, symbol: 'diamond' }, xaxis: 'x2', yaxis: 'y2' },
      { type: 'scatter', x: lags_theo, y: g_theo, mode: 'lines', name: 'Modèle théorique',
        line: { color: '#CC0000', width: 2 }, xaxis: 'x2', yaxis: 'y2' },
    ], {
      margin: { t: 30, l: 46, r: 16, b: 54 },
      legend: { orientation: 'h', y: -0.16, x: 0.5, xanchor: 'center', font: { size: 9 } },
      annotations: [
        { text: 'Champ', x: 0.2, y: 1.02, xref: 'paper', yref: 'paper', showarrow: false, font: { size: 12 }, xanchor: 'center', yanchor: 'bottom' },
        { text: 'Nuée variographique', x: 0.81, y: 1.02, xref: 'paper', yref: 'paper', showarrow: false, font: { size: 12 }, xanchor: 'center', yanchor: 'bottom' },
      ],
      shapes: binShapes,
      xaxis:  { domain: [0, 0.42], anchor: 'y', title: { text: 'x', font: { size: 10 } }, range: [0, 100], constrain: 'domain', tickfont: { size: 8 } },
      yaxis:  { domain: [0, 1], anchor: 'x', title: { text: 'y', font: { size: 10 } }, range: [0, 100], scaleanchor: 'x', constrain: 'domain', tickfont: { size: 8 } },
      xaxis2: { domain: [0.56, 1], anchor: 'y2', title: { text: 'Distance h', font: { size: 10 } }, range: [0, 100], tickfont: { size: 8 } },
      yaxis2: { domain: [0, 1], anchor: 'x2', title: { text: 'γ(h)', font: { size: 10 } }, rangemode: 'tozero', tickfont: { size: 8 } },
    }, { displaylogo: false, responsive: true });
  }

  cleanup() { if (this.plot && window.Plotly) Plotly.purge(this.plot); }
}

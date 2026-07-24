// scripts/geostat-js/widgets/c04_degroupement.js
// -----------------------------------------------------------------------------
// Widget « Dégroupement par cellules » (C04, atelier 4.4) — reproduction
// fidèle de la figure 2×2 du notebook Chap5_Degroupement :
//   [0,0] champ (jet) + échantillons (cercles noirs ouverts)
//   [0,1] histogrammes champ / échantillons / dégroupés (bins coupés au
//         99,5e percentile) + CDF en axe secondaire
//   [1,0] moyenne pondérée vs taille de cellule (violet)
//   [1,1] variance pondérée vs taille de cellule (vert foncé)
// Échantillonnage : base uniforme + amas (hotspot/coldspot). Calcul :
// VRAIE GFFTMA + geostat_polymtl.treatment.degroupement (degrouper +
// optimiser_taille_cellule). Le binning des histogrammes est de la mise en forme.
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

const N = 100;
const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

// Palette « Turbo » (bleu -> rouge), uniforme avec les autres champs du livre.
const TURBO = [
  [0.0, 'rgb(48,18,59)'], [0.1, 'rgb(65,69,217)'], [0.2, 'rgb(35,138,244)'],
  [0.3, 'rgb(30,192,211)'], [0.4, 'rgb(53,226,149)'], [0.5, 'rgb(131,246,88)'],
  [0.6, 'rgb(199,233,47)'], [0.7, 'rgb(248,186,56)'], [0.8, 'rgb(251,122,33)'],
  [0.9, 'rgb(221,61,8)'], [1.0, 'rgb(122,4,3)'],
];

function appliquerMarginale(zStd, typeChamp, moyenne, variance) {
  const out = new Float64Array(zStd.length);
  if (typeChamp === 'lognormal') {
    const s2 = Math.log(1 + variance / (moyenne * moyenne));
    const mu = Math.log(moyenne) - 0.5 * s2, sd = Math.sqrt(s2);
    for (let i = 0; i < zStd.length; i++) out[i] = Math.exp(mu + sd * zStd[i]);
  } else {
    const sd = Math.sqrt(variance);
    for (let i = 0; i < zStd.length; i++) out[i] = moyenne + sd * zStd[i];
  }
  return out;
}

// Percentile (0..1) d'un tableau (copie triée).
function percentile(arr, p) {
  const a = Array.from(arr).sort((x, y) => x - y);
  return a[Math.min(a.length - 1, Math.max(0, Math.floor(p * (a.length - 1))))];
}

// Histogramme densité avec bornes [lo,hi] (valeurs hors bornes ignorées,
// comme seaborn avec des bins explicites). weights optionnel.
function densite(values, lo, hi, nb, weights) {
  const counts = new Array(nb).fill(0);
  const binW = (hi - lo) / nb || 1;
  let wsum = 0;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v < lo || v > hi) continue;
    let k = Math.floor((v - lo) / binW); if (k >= nb) k = nb - 1;
    const w = weights ? weights[i] : 1;
    counts[k] += w; wsum += w;
  }
  const centres = []; for (let k = 0; k < nb; k++) centres.push(lo + (k + 0.5) * binW);
  return { centres, dens: counts.map(c => c / ((wsum || 1) * binW)) };
}

function cdf(values, weights) {
  const idx = values.map((v, i) => i).sort((a, b) => values[a] - values[b]);
  const wsum = weights ? weights.reduce((a, b) => a + b, 0) : values.length;
  const xs = [], ys = []; let acc = 0;
  for (const i of idx) { acc += weights ? weights[i] : 1; xs.push(values[i]); ys.push(acc / wsum); }
  return { xs, ys };
}

export default class C04Degroupement extends Widget {
  render() {
    this.seed = 42;
    this.el.insertAdjacentHTML('beforeend', `
      <div class="gw-controls" style="display:flex;flex-wrap:wrap;gap:.6rem;align-items:center">
        <label>Distribution
          <select class="js-type"><option value="lognormal">Log-normal</option><option value="gaussien">Normal</option></select></label>
        <label>Portée
          <input type="range" class="js-portee" min="10" max="60" value="40" step="2"><span class="js-porteeV">40</span></label>
        <label>Zone d'amas
          <select class="js-spot"><option value="hotspot">Hotspot (valeurs fortes)</option><option value="coldspot">Coldspot (valeurs faibles)</option></select></label>
        <label>N échantillons d'amas
          <input type="range" class="js-grappe" min="0" max="80" step="5" value="50"><span class="js-grappeV">50</span></label>
        <label>Taille cellule
          <input type="range" class="js-cell" min="2" max="40" step="1" value="10"><span class="js-cellV">10</span></label>
        <label style="font-weight:600"><input type="checkbox" class="js-show" checked> Afficher dégroupement</label>
        <button class="js-regen" type="button">Nouvelle graine</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:0 1rem">
        <div class="js-map"  style="height:320px"></div>
        <div class="js-hist" style="height:320px"></div>
        <div class="js-mean" style="height:280px"></div>
        <div class="js-var"  style="height:280px"></div>
      </div>
      <div class="js-info" style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:8px 1rem;font-size:12px"></div>
    `);
    this.mapEl = this.el.querySelector('.js-map'); this.histEl = this.el.querySelector('.js-hist');
    this.meanEl = this.el.querySelector('.js-mean'); this.varEl = this.el.querySelector('.js-var');
    this.infoEl = this.el.querySelector('.js-info');
    this.in = {
      type: this.el.querySelector('.js-type'), portee: this.el.querySelector('.js-portee'),
      spot: this.el.querySelector('.js-spot'), grappe: this.el.querySelector('.js-grappe'),
      cell: this.el.querySelector('.js-cell'), show: this.el.querySelector('.js-show'),
    };
    afficherChargementJusquaPret(this.el).then(() => this.refresh(true));
    const full = debounce(() => this.refresh(true), 250);
    for (const el of [this.in.type, this.in.portee, this.in.spot, this.in.grappe]) this.on(el, 'input', full);
    this.on(this.in.cell, 'input', debounce(() => this.refresh(false), 120));
    this.on(this.in.show, 'change', () => this.refresh(false));
    this.on(this.el.querySelector('.js-regen'), 'click', () => { this.seed++; this.refresh(true); });
  }

  async refresh(reSimuler) {
    this.el.querySelector('.js-porteeV').textContent = this.in.portee.value;
    this.el.querySelector('.js-grappeV').textContent = this.in.grappe.value;
    this.el.querySelector('.js-cellV').textContent = this.in.cell.value;

    if (reSimuler || !this._fieldStd) {
      try {
        this._fieldStd = await gpoly.simulerChamp('spherique', parseInt(this.in.portee.value), 0,
          this.seed, N, 'gaussien', 0, 1);
      } catch (e) { this.afficherAvertissement('Erreur GFFTMA : ' + e.message); return; }
      this.grid = appliquerMarginale(this._fieldStd, this.in.type.value, 2.0, 0.6);
      this._echantillonner();
      const tailles = []; for (let t = 1; t <= 45; t++) tailles.push(t);
      try { this.sweep = await gpoly.optimiserDegroupement(this.coords, Array.from(this.valeurs), tailles); }
      catch (e) { this.sweep = null; }
    }

    const taille = +this.in.cell.value;
    const r = await gpoly.degrouper(this.coords, Array.from(this.valeurs), taille);
    if (!window.Plotly) { this.afficherAvertissement('Plotly non chargé.'); return; }
    const showD = this.in.show.checked;

    // --- [0,0] Carte (jet) + échantillons (cercles noirs ouverts) ---
    const z = []; for (let y = 0; y < N; y++) { const row = []; for (let x = 0; x < N; x++) row.push(this.grid[y * N + x]); z.push(row); }
    Plotly.react(this.mapEl, [
      { z, type: 'heatmap', colorscale: TURBO, showscale: true, colorbar: { title: 'Valeur', len: 0.92, thickness: 12 } },
      { x: this.coords.map(c => c[0]), y: this.coords.map(c => c[1]), mode: 'markers', type: 'scatter',
        marker: { size: 6, color: 'rgba(0,0,0,0)', line: { color: '#000', width: 1.1 } }, hoverinfo: 'skip' },
    ], {
      margin: { t: 30, l: 44, r: 18, b: 46 }, title: { text: 'Gisement avec échantillons', font: { size: 13 } },
      xaxis: { title: { text: 'X', standoff: 8 }, range: [0, N], constrain: 'domain', automargin: true },
      yaxis: { title: { text: 'Y', standoff: 8 }, range: [0, N], scaleanchor: 'x', automargin: true },
    }, { displaylogo: false, responsive: true });

    // --- [0,1] Histogrammes + CDF (bins coupés au 99,5e percentile) ---
    const samp = Array.from(this.valeurs);
    let lo = this.grid[0]; for (let i = 1; i < this.grid.length; i++) if (this.grid[i] < lo) lo = this.grid[i];
    const hi = percentile(this.grid, 0.995), nb = 30;
    const hField = densite(Array.from(this.grid), lo, hi, nb);
    const hSamp = densite(samp, lo, hi, nb);
    const traces = [
      { x: hField.centres, y: hField.dens, type: 'bar', name: 'Champ complet', marker: { color: 'rgba(127,127,127,0.30)' }, width: (hi - lo) / nb },
      { x: hSamp.centres, y: hSamp.dens, type: 'bar', name: 'Échantillons', marker: { color: 'rgba(31,119,180,0.45)' }, width: (hi - lo) / nb },
    ];
    const cField = cdf(Array.from(this.grid)), cSamp = cdf(samp);
    traces.push({ x: cField.xs, y: cField.ys, mode: 'lines', name: 'CDF champ', yaxis: 'y2', line: { color: '#000', dash: 'dash', width: 2 } });
    traces.push({ x: cSamp.xs, y: cSamp.ys, mode: 'lines', name: 'CDF échantillons', yaxis: 'y2', line: { color: '#1f77b4', width: 2 } });
    if (showD) {
      const hDecl = densite(samp, lo, hi, nb, r.poids);
      const cDecl = cdf(samp, r.poids);
      traces.push({ x: hDecl.centres, y: hDecl.dens, type: 'bar', name: 'Dégroupés', marker: { color: 'rgba(44,160,44,0.50)', line: { color: '#000', width: 0.4 } }, width: (hi - lo) / nb });
      traces.push({ x: cDecl.xs, y: cDecl.ys, mode: 'lines', name: 'CDF dégroupés', yaxis: 'y2', line: { color: '#2ca02c', width: 2 } });
    }
    Plotly.react(this.histEl, traces, {
      margin: { t: 50, l: 48, r: 48, b: 42 },
      barmode: 'overlay', bargap: 0,
      xaxis: { title: 'Valeur', range: [lo, hi] }, yaxis: { title: 'Densité' },
      yaxis2: { overlaying: 'y', side: 'right', range: [0, 1], showgrid: false, title: 'CDF' },
      legend: { font: { size: 9 }, orientation: 'h', x: 0, y: 1.14, yanchor: 'bottom' },
    }, { displaylogo: false, responsive: true });

    // --- [1,0] Moyenne pondérée vs taille de cellule (violet) ---
    if (this.sweep) {
      Plotly.react(this.meanEl, [
        { x: this.sweep.tailles, y: this.sweep.moyennes, mode: 'lines+markers', line: { color: '#7e3ff2' }, marker: { size: 5, color: '#7e3ff2' } },
      ], {
        margin: { t: 30, l: 50, r: 14, b: 40 }, title: { text: 'Moyenne pondérée vs taille de cellule', font: { size: 12 } },
        xaxis: { title: 'Taille cellule', gridcolor: '#eee' }, yaxis: { gridcolor: '#eee', automargin: true },
        shapes: [{ type: 'line', x0: taille, x1: taille, yref: 'paper', y0: 0, y1: 1, line: { color: '#d62728', dash: 'dash', width: 1 } }],
      }, { displaylogo: false, responsive: true });

      // --- [1,1] Variance pondérée vs taille de cellule (vert foncé) ---
      Plotly.react(this.varEl, [
        { x: this.sweep.tailles, y: this.sweep.variances, mode: 'lines+markers', line: { color: '#1b5e20' }, marker: { size: 5, color: '#1b5e20' } },
      ], {
        margin: { t: 30, l: 50, r: 14, b: 40 }, title: { text: 'Variance pondérée vs taille de cellule', font: { size: 12 } },
        xaxis: { title: 'Taille cellule', gridcolor: '#eee' }, yaxis: { gridcolor: '#eee', automargin: true },
        shapes: [{ type: 'line', x0: taille, x1: taille, yref: 'paper', y0: 0, y1: 1, line: { color: '#d62728', dash: 'dash', width: 1 } }],
      }, { displaylogo: false, responsive: true });
    }

    const diff = r.moyenne_brute - r.moyenne_ponderee;
    const pct = r.moyenne_brute !== 0 ? 100 * diff / r.moyenne_brute : 0;
    const carte = (lab, val, col) => `<div style="padding:8px;border-radius:8px;background:#f8f8f8;border:1px solid ${col || '#eee'}">${lab}<b style="display:block;font-size:1.2em">${val}</b></div>`;
    this.infoEl.innerHTML =
      carte('Moyenne brute (biaisée)', r.moyenne_brute.toFixed(3)) +
      carte(`Moyenne dégroupée (Δ ${pct >= 0 ? '−' : '+'}${Math.abs(pct).toFixed(1)} %)`, r.moyenne_ponderee.toFixed(3), Math.abs(pct) > 5 ? '#dc3545' : '#28a745');
  }

  // Base uniforme (100) + amas (hotspot autour du max / coldspot autour du min).
  _echantillonner() {
    let s = ((this.seed + 1) * 2654435761) >>> 0;
    const rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    this.coords = []; this.valeurs = [];
    const nAll = 100;
    for (let i = 0; i < nAll; i++) { const x = Math.floor(rng() * N), y = Math.floor(rng() * N); this.coords.push([x, y]); this.valeurs.push(this.grid[y * N + x]); }
    const nSpot = +this.in.grappe.value;
    if (nSpot > 0) {
      const cold = this.in.spot.value === 'coldspot';
      let ipick = 0; for (let i = 1; i < this.grid.length; i++) { if (cold ? this.grid[i] < this.grid[ipick] : this.grid[i] > this.grid[ipick]) ipick = i; }
      const cx = ipick % N, cy = Math.floor(ipick / N), spot = 25;
      const x0 = Math.max(0, Math.min(N - spot, Math.round(cx - spot / 2)));
      const y0 = Math.max(0, Math.min(N - spot, Math.round(cy - spot / 2)));
      for (let i = 0; i < nSpot; i++) {
        const x = Math.floor(x0 + rng() * spot), y = Math.floor(y0 + rng() * spot);
        this.coords.push([x, y]); this.valeurs.push(this.grid[y * N + x]);
      }
    }
  }

  cleanup() { if (window.Plotly) { for (const e of [this.mapEl, this.histEl, this.meanEl, this.varEl]) Plotly.purge(e); } }
}

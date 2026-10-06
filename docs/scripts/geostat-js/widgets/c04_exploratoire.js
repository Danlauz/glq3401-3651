// scripts/geostat-js/widgets/c04_exploratoire.js
// -----------------------------------------------------------------------------
// Widget « Analyse exploratoire » (C04) — calcul LIVE via Pyodide.
// Champ : VRAIE GFFTMA. Statistiques + variogramme : VRAIE librairie.
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

const N = 80;
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
    const mu = Math.log(moyenne) - 0.5 * s2;
    const sd = Math.sqrt(s2);
    for (let i = 0; i < zStd.length; i++) out[i] = Math.exp(mu + sd * zStd[i]);
  } else {
    const sd = Math.sqrt(variance);
    for (let i = 0; i < zStd.length; i++) out[i] = moyenne + sd * zStd[i];
  }
  return out;
}

export default class C04Exploratoire extends Widget {
  render() {
    this.seed = 1;
    this.el.insertAdjacentHTML('beforeend', `
      <div class="gw-controls">
        <label>Distribution
          <select class="js-type"><option value="gaussien">Gaussien</option><option value="lognormal">Log-normal</option></select></label>
        <label>Modèle
          <select class="js-mod"><option>spherique</option><option>exponentiel</option><option>gaussien</option></select></label>
        <label>Portée pratique (95 %)
          <input type="range" class="js-portee" min="5" max="40" value="22" step="1"><span class="js-porteeV">22</span></label>
        <label>Pépite
          <input type="range" class="js-pepite" min="0" max="0.5" step="0.05" value="0"><span class="js-pepiteV">0.00</span></label>
        <label>N échantillons
          <input type="number" class="js-n" value="120" step="10" min="20" max="500" style="width:70px"></label>
        <button class="js-regen" type="button">Nouveau champ</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;padding:0 1rem">
        <div class="js-map" style="height:300px"></div>
        <div class="js-hist" style="height:300px"></div>
        <div class="js-trans" style="height:300px"></div>
      </div>
      <div class="js-stats" style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:8px 1rem;font-size:12px;text-align:center"></div>
      <p style="margin:4px 1rem;font-size:11px;color:#666">
        Statistiques (moyenne, médiane, variance, écart-type, CV, asymétrie) et histogramme calculés par
        <code>geostat_polymtl.treatment.exploratoire</code> via Pyodide. Le 3ᵉ panneau compare la
        distribution <b>brute</b> à sa version <b>transformée</b> : pour des données asymétriques
        (log-normales), la transformation logarithmique symétrise la distribution.
      </p>
    `);
    this.mapEl   = this.el.querySelector('.js-map');
    this.histEl  = this.el.querySelector('.js-hist');
    this.transEl = this.el.querySelector('.js-trans');
    this.statsEl = this.el.querySelector('.js-stats');
    this.in = {
      type:   this.el.querySelector('.js-type'),
      mod:    this.el.querySelector('.js-mod'),
      portee: this.el.querySelector('.js-portee'),
      pepite: this.el.querySelector('.js-pepite'),
      n:      this.el.querySelector('.js-n'),
    };
    afficherChargementJusquaPret(this.el).then(() => this.refresh(true));
    const refreshFull = debounce(() => this.refresh(true), 250);
    for (const el of [this.in.type, this.in.mod, this.in.portee, this.in.pepite]) {
      this.on(el, 'input', refreshFull);
    }
    this.on(this.in.n, 'input', debounce(() => this.refresh(false), 200));
    this.on(this.el.querySelector('.js-regen'), 'click', () => { this.seed++; this.refresh(true); });
  }

  async refresh(reSimuler = true) {
    this.el.querySelector('.js-porteeV').textContent = this.in.portee.value;
    this.el.querySelector('.js-pepiteV').textContent = (+this.in.pepite.value).toFixed(2);

    const modele   = this.in.mod.value;
    const portee   = parseInt(this.in.portee.value);
    const pepite   = parseFloat(this.in.pepite.value);
    const typeChamp = this.in.type.value;
    const moyenne  = 2.0, variance = 1.0;

    if (reSimuler || !this._fieldStd) {
      try {
        // === Champ via la VRAIE GFFTMA ===
        this._fieldStd = await gpoly.simulerChamp(modele, portee, pepite, this.seed, N, 'gaussien', 0, 1);
      } catch (e) { this.afficherAvertissement('Erreur GFFTMA : ' + e.message); return; }
    }
    const grid = appliquerMarginale(this._fieldStd, typeChamp, moyenne, variance);

    // Echantillonnage uniforme
    const n = Math.max(20, Math.min(500, parseInt(this.in.n.value) || 120));
    let s = (this.seed * 40503) >>> 0;
    const rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    const coords = [], vals = [];
    for (let i = 0; i < n; i++) {
      const x = Math.floor(rng() * N), y = Math.floor(rng() * N);
      coords.push([x, y]); vals.push(grid[y * N + x]);
    }

    // === Statistiques + histogramme via la VRAIE librairie ===
    const [st, hist] = await Promise.all([
      gpoly.statistiquesDescriptives(vals),
      gpoly.histogramme(vals, 14),
    ]);

    if (!window.Plotly) { this.afficherAvertissement('Plotly non chargé.'); return; }

    // Carte
    const z = []; for (let y = 0; y < N; y++) { const r = []; for (let x = 0; x < N; x++) r.push(grid[y * N + x]); z.push(r); }
    Plotly.react(this.mapEl, [
      { z, type: 'heatmap', colorscale: TURBO, showscale: false },
      { x: coords.map(c => c[0]), y: coords.map(c => c[1]), mode: 'markers', type: 'scatter',
        marker: { size: 4, color: '#fff', line: { color: '#000', width: 0.5 } }, hoverinfo: 'skip' },
    ], {
      margin: { t: 30, l: 20, r: 10, b: 20 },
      title: { text: `Champ ${typeChamp} (${modele}, a=${portee})`, font: { size: 12 } },
      xaxis: { range: [0, N], showticklabels: false }, yaxis: { range: [0, N], showticklabels: false, scaleanchor: 'x' },
    }, { displaylogo: false, responsive: true });

    // Histogramme
    const centres = hist.bords.slice(0, -1).map((b, i) => (b + hist.bords[i + 1]) / 2);
    Plotly.react(this.histEl, [
      { x: centres, y: hist.comptes, type: 'bar', marker: { color: '#0173B2' },
        width: (hist.bords[1] - hist.bords[0]) * 0.9 },
    ], {
      margin: { t: 30, l: 45, r: 10, b: 40 }, title: { text: `Données brutes (asym. ${st.asymetrie.toFixed(2)})`, font: { size: 12 } },
      xaxis: { title: 'Teneur' }, yaxis: { title: 'Effectif' },
      shapes: [
        { type: 'line', x0: st.moyenne, x1: st.moyenne, yref: 'paper', y0: 0, y1: 1, line: { color: '#CC0000', width: 2 } },
        { type: 'line', x0: st.mediane, x1: st.mediane, yref: 'paper', y0: 0, y1: 1, line: { color: '#E69F00', width: 2, dash: 'dash' } },
      ],
      annotations: [
        { x: st.moyenne, yref: 'paper', y: 1.0, text: 'moy', showarrow: false, font: { size: 10, color: '#CC0000' } },
        { x: st.mediane, yref: 'paper', y: 0.92, text: 'méd', showarrow: false, font: { size: 10, color: '#E69F00' } },
      ],
    }, { displaylogo: false, responsive: true });

    // === Panneau 3 : comparaison données BRUTES vs TRANSFORMÉES ===
    // Pour des données asymétriques (log-normales), la transformation log
    // symétrise la distribution (l'asymétrie tombe vers 0). Pour des données
    // déjà symétriques (gaussiennes), on montre plutôt une boîte à moustaches.
    const transVals = typeChamp === 'lognormal' ? vals.filter(v => v > 0).map(Math.log) : null;
    if (transVals && transVals.length > 5) {
      const [stT, histT] = await Promise.all([
        gpoly.statistiquesDescriptives(transVals),
        gpoly.histogramme(transVals, 14),
      ]);
      const cT = histT.bords.slice(0, -1).map((b, i) => (b + histT.bords[i + 1]) / 2);
      Plotly.react(this.transEl, [
        { x: cT, y: histT.comptes, type: 'bar', marker: { color: '#029E73' }, width: (histT.bords[1] - histT.bords[0]) * 0.9 },
      ], {
        margin: { t: 30, l: 45, r: 10, b: 40 },
        title: { text: `Données log-transformées (asym. ${stT.asymetrie.toFixed(2)})`, font: { size: 12 } },
        xaxis: { title: 'log(teneur)' }, yaxis: { title: 'Effectif' },
        shapes: [{ type: 'line', x0: stT.moyenne, x1: stT.moyenne, yref: 'paper', y0: 0, y1: 1, line: { color: '#CC0000', width: 2 } }],
      }, { displaylogo: false, responsive: true });
    } else {
      Plotly.react(this.transEl, [
        { y: vals, type: 'box', boxpoints: 'outliers', marker: { color: '#0173B2' }, name: '' },
      ], {
        margin: { t: 30, l: 45, r: 10, b: 30 },
        title: { text: 'Boîte à moustaches (médiane, quartiles, extrêmes)', font: { size: 12 } },
        yaxis: { title: 'Teneur' }, showlegend: false,
      }, { displaylogo: false, responsive: true });
    }

    const varEch = st.ecart_type * st.ecart_type;
    const mn = Math.min(...vals), mx = Math.max(...vals);
    const carte = (lab, val) => `<div style="padding:8px;border-radius:8px;background:#f8f8f8;border:1px solid #eee">${lab}<b style="display:block;font-size:1.1em">${val}</b></div>`;
    this.statsEl.innerHTML =
      carte('Moyenne', st.moyenne.toFixed(3)) + carte('Médiane', st.mediane.toFixed(3)) +
      carte('Variance', varEch.toFixed(3)) + carte('Écart-type', st.ecart_type.toFixed(3)) +
      carte('Coef. variation', st.cv.toFixed(3)) + carte('Asymétrie', st.asymetrie.toFixed(3)) +
      carte('Minimum', mn.toFixed(2)) + carte('Maximum', mx.toFixed(2));
  }

  cleanup() { if (window.Plotly) { Plotly.purge(this.mapEl); Plotly.purge(this.histEl); Plotly.purge(this.transEl); } }
}

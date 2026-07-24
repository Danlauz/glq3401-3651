// scripts/geostat-js/widgets/c07_quantites.js
// -----------------------------------------------------------------------------
// Widget C07 — Atelier 7.8 « Impact du nombre de données » (calque du notebook
// Chap6_QuantitesDonnees). Un champ 1D est simulé avec un modèle connu ; on en
// retient n points et on compare le variogramme expérimental (bruité quand n est
// faible) au modèle de référence. Deux panneaux : variogramme (gauche) + champ
// 1D avec les points retenus (droite).
//
// Simulation et variogramme : geostat_polymtl via gpoly (champ 1D, scatter).
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

const debounce = (fn, ms = 120) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
// Modèle « vrai » du champ : sphérique portée 100, palier 0,8 + pépite 0,2 (sill total 1).
const CONFIG = { N: 500, seed: 544, portee: 100, palier: 0.8, pepite: 0.2, h_axe: 250 };

export default class C07Quantites extends Widget {
  render() {
    this.el.insertAdjacentHTML('beforeend', `
      <div class="gw-controls" style="display:flex;flex-wrap:wrap;gap:16px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.84rem;">
        <label>n échantillons <input type="range" class="js-n" min="20" max="500" value="100" step="10" style="width:160px"><span class="js-nv">100</span></label>
        <label>Pas de lag <input type="range" class="js-lag" min="2" max="20" value="6" step="1" style="width:120px"><span class="js-lagv">6</span></label>
        <button class="js-new" type="button" style="font-size:.78rem;padding:3px 9px;background:#3a3632;color:#fff;border:none;border-radius:4px;cursor:pointer;">Nouveau champ</button>
      </div>
      <div class="js-plot" style="height:380px"></div>
      <div class="js-info" style="text-align:center;font-size:.82rem;color:#555;margin-top:4px;"></div>
    `);
    this.plot = this.el.querySelector('.js-plot');
    this.infoEl = this.el.querySelector('.js-info');
    this.nEl = this.el.querySelector('.js-n');
    this.lagEl = this.el.querySelector('.js-lag');
    this.seed = CONFIG.seed;

    const redraw = debounce(() => this._dessiner(), 80);
    this.on(this.nEl, 'input', e => { this.el.querySelector('.js-nv').textContent = e.target.value; });
    this.on(this.nEl, 'change', redraw);
    this.on(this.lagEl, 'input', e => { this.el.querySelector('.js-lagv').textContent = e.target.value; });
    this.on(this.lagEl, 'change', redraw);
    this.on(this.el.querySelector('.js-new'), 'click', () => { this.seed++; this._simuler(); });
    afficherChargementJusquaPret(this.el).then(() => this._simuler());
  }

  async _simuler() {
    try {
      this.field = Array.from(await gpoly.simulerChamp1D('spherique', CONFIG.portee, CONFIG.pepite, this.seed, CONFIG.N, 'gaussien', 0.0, 1.0));
    } catch (e) { this.afficherAvertissement('Erreur simulation : ' + e.message); return; }
    // Modèle de référence (vrai) : sphérique + pépite.
    try {
      const lags = []; for (let i = 0; i <= 120; i++) lags.push(i * CONFIG.h_axe / 120);
      const g = await gpoly.variogrammeTheorique('spherique', lags, CONFIG.portee, CONFIG.palier);
      this.modLags = lags;
      this.modG = Array.from(g, (v, i) => v + (lags[i] > 0 ? CONFIG.pepite : 0));
    } catch (e) { this.afficherAvertissement('Erreur modèle : ' + e.message); return; }
    this._dessiner();
  }

  async _dessiner() {
    if (!this.field) return;
    const N = CONFIG.N, npt = parseInt(this.nEl.value, 10);
    const nLags = Math.max(4, Math.round(CONFIG.h_axe / parseFloat(this.lagEl.value)));

    // Sous-échantillonnage reproductible.
    let s = (this.seed * 2654435761) >>> 0;
    const rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    const set = new Set(); while (set.size < Math.min(npt, N)) set.add(Math.floor(rng() * N));
    const sx = [...set].sort((p, q) => p - q);
    const coords = sx.map(x => [x, 0]);
    const valeurs = Float64Array.from(sx, x => this.field[x]);

    let vario;
    try { vario = await gpoly.variogrammeScatter(coords, valeurs, nLags, CONFIG.h_axe); }
    catch (e) { this.afficherAvertissement('Erreur variogramme : ' + e.message); return; }

    if (!window.Plotly) { this.afficherAvertissement('Plotly non chargé.'); return; }
    const sy = sx.map(x => this.field[x]);
    Plotly.react(this.plot, [
      // Gauche : variogramme
      { x: vario.h, y: vario.gamma, mode: 'markers', name: 'Variogramme expérimental',
        marker: { color: '#1f77b4', size: 7 }, xaxis: 'x', yaxis: 'y' },
      { x: this.modLags, y: this.modG, mode: 'lines', name: 'Modèle de référence',
        line: { color: '#000', width: 2.5 }, xaxis: 'x', yaxis: 'y' },
      // Droite : champ + échantillons
      { x: this.field.map((_, i) => i), y: this.field, mode: 'lines', name: 'Champ simulé',
        line: { color: '#7aa6d6', width: 1 }, xaxis: 'x2', yaxis: 'y2', showlegend: false },
      { x: sx, y: sy, mode: 'markers', name: 'Échantillons',
        marker: { color: '#CC0000', size: 5 }, xaxis: 'x2', yaxis: 'y2', showlegend: false },
    ], {
      margin: { t: 28, l: 48, r: 14, b: 44 },
      legend: { orientation: 'h', y: 1.04, x: 0.5, xanchor: 'center', font: { size: 10 } },
      annotations: [
        { text: 'Ajustement du variogramme', x: 0.21, y: 1.0, xref: 'paper', yref: 'paper', showarrow: false, font: { size: 11, color: '#666' }, xanchor: 'center', yanchor: 'bottom' },
        { text: 'Champ simulé et points utilisés', x: 0.8, y: 1.0, xref: 'paper', yref: 'paper', showarrow: false, font: { size: 11, color: '#666' }, xanchor: 'center', yanchor: 'bottom' },
      ],
      xaxis:  { domain: [0, 0.46], anchor: 'y', title: { text: 'Distance h', standoff: 4 }, range: [0, CONFIG.h_axe] },
      yaxis:  { domain: [0, 1], anchor: 'x', title: 'γ(h)', range: [0, 1.6] },
      xaxis2: { domain: [0.56, 1], anchor: 'y2', title: { text: 'Position x', standoff: 4 }, range: [0, N] },
      yaxis2: { domain: [0, 1], anchor: 'x2', title: 'z(x)', range: [-3.2, 3.2] },
    }, { displaylogo: false, responsive: true });

    this.infoEl.innerHTML = `<b>${npt}</b> points retenus sur ${N} — ` +
      (npt < 60 ? 'peu de données : variogramme expérimental <b>bruité</b>, ajustement incertain.'
                : 'assez de données : le variogramme expérimental <b>colle</b> au modèle de référence.');
  }

  cleanup() { if (this.plot && window.Plotly) Plotly.purge(this.plot); }
}

// scripts/geostat-js/widgets/c07_ajustement.js
// -----------------------------------------------------------------------------
// Widget C07 — Atelier 7.5 « Ajustement manuel 1D » (calque du notebook
// Chap6_Ajust1D). Une « vérité » cachée (type, portée, palier, pépite) est tirée
// au hasard et un champ 1D est simulé avec ces paramètres. L'utilisateur ajuste
// À LA MAIN un modèle théorique au variogramme expérimental ; il peut révéler
// le modèle cible. Deux panneaux : variogramme (haut) + champ + échantillons
// (bas). Aucun RMSE / aucun ajustement automatique (comme le notebook).
//
// Simulation et variogrammes : geostat_polymtl (gpoly). Aucune math en JS.
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

const debounce = (fn, ms = 60) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const TYPES = ['spherique', 'exponentiel', 'gaussien'];
const NOM = { spherique: 'Sphérique', exponentiel: 'Exponentiel', gaussien: 'Gaussien' };
const CONFIG = { N: 400, n_pts: 100, n_lags: 20, h_axe: 250 };

export default class C07Ajustement extends Widget {
  render() {
    this.el.insertAdjacentHTML('beforeend', `
      <div class="gw-controls" style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.84rem;">
        <label>Type <select class="js-type">
          <option value="spherique">Sphérique</option><option value="exponentiel">Exponentiel</option><option value="gaussien">Gaussien</option>
        </select></label>
        <label>Palier c₁ <input type="range" class="js-c1" min="0" max="1.5" value="0.9" step="0.01" style="width:110px"><span class="js-c1v">0.90</span></label>
        <label>Portée a <input type="range" class="js-a" min="1" max="200" value="40" step="1" style="width:130px"><span class="js-av">40</span></label>
        <label>Pépite c₀ <input type="range" class="js-c0" min="0" max="0.6" value="0.1" step="0.01" style="width:110px"><span class="js-c0v">0.10</span></label>
        <label style="font-weight:600;"><input type="checkbox" class="js-show"> Afficher la solution (Cressie)</label>
        <button class="js-new" type="button" style="font-size:.78rem;padding:3px 9px;background:#3a3632;color:#fff;border:none;border-radius:4px;cursor:pointer;">🎲 Changer de scénario</button>
      </div>
      <div class="js-plot" style="height:460px"></div>
      <div class="js-sol" style="padding:.45rem 1rem;margin-top:4px;background:#eef2e8;border:1px solid #b8c8a8;border-radius:6px;font-family:'JetBrains Mono',monospace;font-size:.82rem;color:#4a6a3a;text-align:center;">Ajustez les curseurs pour faire coïncider le modèle (noir) avec les points, puis cochez « Afficher le modèle cible ».</div>
    `);

    this.plot = this.el.querySelector('.js-plot');
    this.solEl = this.el.querySelector('.js-sol');
    this.checkbox = this.el.querySelector('.js-show');
    this.A = {
      type: this.el.querySelector('.js-type'),
      c1: this.el.querySelector('.js-c1'),
      a: this.el.querySelector('.js-a'),
      c0: this.el.querySelector('.js-c0'),
    };
    const redraw = debounce(() => this._dessiner(), 60);
    for (const [k, el] of Object.entries(this.A)) {
      this.on(el, 'input', e => { const s = this.el.querySelector(`.js-${k}v`); if (s) s.textContent = e.target.value; redraw(); });
      this.on(el, 'change', redraw);
    }
    this.on(this.checkbox, 'change', () => this._dessiner());
    this.on(this.el.querySelector('.js-new'), 'click', () => this._nouveauScenario());

    afficherChargementJusquaPret(this.el).then(() => this._nouveauScenario());
  }

  async _nouveauScenario() {
    // Vérité cachée tirée au hasard (mêmes plages que le notebook).
    this.truth = {
      type: TYPES[Math.floor(Math.random() * 3)],
      a: Math.round(25 + Math.random() * 125),   // 25–150
      c1: +(0.5 + Math.random() * 0.5).toFixed(2), // 0.5–1.0
      c0: +(Math.random() * 0.3).toFixed(2),       // 0–0.3
      seed: (Math.random() * 1e9) >>> 0,
    };
    this.checkbox.checked = false;
    await this._simuler();
  }

  async _simuler() {
    const t = this.truth, N = CONFIG.N;
    const total = t.c1 + t.c0, pepFrac = total > 0 ? t.c0 / total : 0;
    let champ;
    try {
      champ = await gpoly.simulerChamp1D(t.type, t.a, pepFrac, t.seed, N, 'gaussien', 0.0, total);
    } catch (e) { this.afficherAvertissement('Erreur simulation : ' + e.message); return; }
    this.field = Array.from(champ);

    // Échantillonnage de n_pts positions distinctes (LCG seedable).
    let s = (t.seed ^ 0x9e3779b9) >>> 0;
    const rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    const set = new Set(); while (set.size < CONFIG.n_pts) set.add(Math.floor(rng() * N));
    this.sx = [...set].sort((p, q) => p - q);
    const coords = this.sx.map(x => [x, 0]);
    const valeurs = Float64Array.from(this.sx, x => this.field[x]);
    try {
      this.vario = await gpoly.variogrammeScatter(coords, valeurs, CONFIG.n_lags, CONFIG.h_axe);
      // Solution de référence : ajustement automatique (Cressie WLS) sur l'expérimental.
      this.solution = await gpoly.ajusterVariogramme(this.vario.h, this.vario.gamma, this.vario.comptes);
    } catch (e) { this.afficherAvertissement('Erreur variogramme : ' + e.message); return; }
    this._dessiner();
  }

  async _dessiner() {
    if (!this.vario) return;
    const a = parseFloat(this.A.a.value), c1 = parseFloat(this.A.c1.value), c0 = parseFloat(this.A.c0.value);
    const type = this.A.type.value;
    const lags = []; for (let i = 0; i <= 120; i++) lags.push(i * CONFIG.h_axe / 120);

    let gFit;
    try {
      gFit = await gpoly.variogrammeTheorique(type, lags, a, c1);
      gFit = Array.from(gFit, (v, i) => v + (lags[i] > 0 ? c0 : 0));
    } catch (e) { this.afficherAvertissement('Erreur modèle : ' + e.message); return; }

    const montrer = this.checkbox.checked && this.solution;
    let gSol = null;
    if (montrer) {
      const sol = this.solution;
      const gc = await gpoly.variogrammeTheorique(sol.type, lags, sol.a, sol.c1);
      gSol = Array.from(gc, (v, i) => v + (lags[i] > 0 ? sol.c0 : 0));
    }

    // Champ complet + échantillons (rouges).
    const sy = this.sx.map(x => this.field[x]);

    if (!window.Plotly) { this.afficherAvertissement('Plotly non chargé.'); return; }
    const traces = [
      // --- Panneau haut : variogramme ---
      { x: this.vario.h, y: this.vario.gamma, mode: 'markers', name: 'Variogramme expérimental',
        marker: { color: '#1f77b4', size: 7 }, xaxis: 'x', yaxis: 'y' },
      { x: lags, y: gFit, mode: 'lines', name: 'Modèle ajusté', line: { color: '#000', width: 2.5 }, xaxis: 'x', yaxis: 'y' },
      // --- Panneau bas : champ + échantillons ---
      { x: this.field.map((_, i) => i), y: this.field, mode: 'lines', name: 'Champ',
        line: { color: '#bbb', width: 1 }, xaxis: 'x2', yaxis: 'y2', showlegend: false },
      { x: this.sx, y: sy, mode: 'markers', name: 'Échantillons',
        marker: { color: '#CC0000', size: 5 }, xaxis: 'x2', yaxis: 'y2', showlegend: false },
    ];
    if (gSol) traces.splice(2, 0, { x: lags, y: gSol, mode: 'lines', name: 'Solution (Cressie)',
      line: { color: '#CC0000', width: 2, dash: 'dash' }, xaxis: 'x', yaxis: 'y' });

    Plotly.react(this.plot, traces, {
      margin: { t: 26, l: 50, r: 16, b: 40 },
      legend: { orientation: 'h', y: 1.04, x: 0.5, xanchor: 'center', font: { size: 10 } },
      annotations: [
        { text: 'Champ simulé et points échantillonnés', x: 0.5, y: 0.4, xref: 'paper', yref: 'paper', showarrow: false, font: { size: 11, color: '#666' }, xanchor: 'center', yanchor: 'bottom' },
      ],
      xaxis:  { domain: [0, 1], anchor: 'y', title: { text: 'Distance h', standoff: 4 }, range: [0, CONFIG.h_axe] },
      yaxis:  { domain: [0.52, 1], anchor: 'x', title: 'γ(h)', range: [0, 2.5] },
      xaxis2: { domain: [0, 1], anchor: 'y2', title: { text: 'Position x', standoff: 4 }, range: [0, CONFIG.N] },
      yaxis2: { domain: [0, 0.38], anchor: 'x2', title: 'z(x)', range: [-3.2, 3.2] },
    }, { displaylogo: false, responsive: true });

    const sol = this.solution;
    this.solEl.innerHTML = montrer
      ? `🎯 Solution (moindres carrés pondérés de Cressie) : <b>${NOM[sol.type]}</b> · a = <b>${sol.a.toFixed(1)}</b> · c₁ = <b>${sol.c1.toFixed(2)}</b> · c₀ = <b>${sol.c0.toFixed(2)}</b>`
      : `Ajustez les curseurs pour faire coïncider le modèle (noir) avec les points, puis cochez « Afficher la solution (Cressie) ».`;
  }

  cleanup() { if (this.plot && window.Plotly) Plotly.purge(this.plot); }
}

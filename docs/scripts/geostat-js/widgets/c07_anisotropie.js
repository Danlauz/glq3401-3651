// scripts/geostat-js/widgets/c07_anisotropie.js
// -----------------------------------------------------------------------------
// Widget C07 — Atelier 7.6 « Ajustement 2D anisotrope » (calque du notebook
// Chap6_Ajust2D). Un champ 2D ANISOTROPE est simulé (anisotropie intrinsèque à
// la covariance via gpoly.simulerChampAniso). On calcule 8 variogrammes
// expérimentaux directionnels (0..157,5°) et l'utilisateur ajuste à la main un
// modèle anisotrope (portées a_g/a_p, azimut θ, type, c0, c1). La « vérité » est
// révélable. Grille 3×3 (8 directions + 1 case vide).
//
// Simulation et variogrammes directionnels : geostat_polymtl (gpoly). Les
// courbes théoriques utilisent la convention de portée pratique 95 % de la
// librairie (mise en forme rapide, pas un algorithme).
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

const debounce = (fn, ms = 160) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const TYPES = ['spherique', 'exponentiel', 'gaussien'];
const NOM = { spherique: 'Sphérique', exponentiel: 'Exponentiel', gaussien: 'Gaussien' };
const DIRS = [0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5];
const CONFIG = { N: 180, n_pts: 500, h_max: 70, lag: 5, tol: 15 };

// Portée pratique a -> portée GFFTMA (convention de la librairie).
function rconv(type, a) { return type === 'exponentiel' ? a / 3 : type === 'gaussien' ? a / Math.sqrt(3) : a; }
function covu(type, u) {
  if (type === 'exponentiel') return Math.exp(-u);
  if (type === 'gaussien') return Math.exp(-u * u);
  const m = Math.min(u, 1); return 1 - (1.5 * m - 0.5 * m * m * m);
}
// Portée directionnelle (ellipse a_g/a_p, axe majeur à l'azimut theta) pour la direction phi.
function aDir(ag, ap, theta, phi) {
  const d = (phi - theta) * Math.PI / 180, cd = Math.cos(d), sd = Math.sin(d);
  return ag * ap / Math.sqrt((ap * cd) ** 2 + (ag * sd) ** 2 + 1e-9);
}

export default class C07Anisotropie extends Widget {
  render() {
    this.el.insertAdjacentHTML('beforeend', `
      <style>
        #${this.el.id} .ar-ctrl{display:flex;flex-direction:column;gap:9px;padding:12px 16px;background:#f7f8fa;border:1px solid #e3e6ea;border-radius:12px;font-size:.83rem;}
        #${this.el.id} .ar-row{display:flex;flex-wrap:wrap;gap:18px;align-items:center;}
        #${this.el.id} .ar-grp{font-weight:700;color:#3a4a5a;min-width:64px;}
        #${this.el.id} .ar-row label{display:inline-flex;align-items:center;gap:6px;margin:0;white-space:nowrap;}
        #${this.el.id} .ar-row input[type=range]{accent-color:#2563eb;}
        #${this.el.id} .ar-v{font-variant-numeric:tabular-nums;color:#2563eb;font-weight:600;min-width:30px;}
        #${this.el.id} select{padding:3px 6px;border:1px solid #c7ccd1;border-radius:5px;}
      </style>
      <div class="ar-ctrl">
        <div class="ar-row">
          <span class="ar-grp">Modèle</span>
          <label>Type <select class="js-type"><option value="spherique">Sphérique</option><option value="exponentiel">Exponentiel</option><option value="gaussien">Gaussien</option></select></label>
        </div>
        <div class="ar-row">
          <span class="ar-grp">Portées</span>
          <label><span>a<sub>g</sub></span><input type="range" class="js-ag" min="5" max="100" value="50" step="1" style="width:84px"><span class="ar-v js-agv">50</span></label>
          <label><span>a<sub>p</sub></span><input type="range" class="js-ap" min="5" max="100" value="25" step="1" style="width:84px"><span class="ar-v js-apv">25</span></label>
          <label><span>θ</span><input type="range" class="js-th" min="0" max="180" value="45" step="5" style="width:84px"><span class="ar-v"><span class="js-thv">45</span>°</span></label>
        </div>
        <div class="ar-row">
          <span class="ar-grp">Paliers</span>
          <label><span>c<sub>1</sub></span><input type="range" class="js-c1" min="0" max="2" value="1.0" step="0.05" style="width:140px"><span class="ar-v js-c1v">1.00</span></label>
          <label><span>c<sub>0</sub></span><input type="range" class="js-c0" min="0" max="1" value="0.1" step="0.02" style="width:140px"><span class="ar-v js-c0v">0.10</span></label>
        </div>
        <div class="ar-row">
          <span class="ar-grp"></span>
          <label style="font-weight:600;"><input type="checkbox" class="js-show"> Afficher la solution (Cressie)</label>
          <button class="js-new" type="button" style="font-size:.78rem;padding:4px 10px;background:#3a3632;color:#fff;border:none;border-radius:5px;cursor:pointer;">🎲 Nouvelle simulation</button>
        </div>
      </div>
      <div class="js-plot" style="height:520px"></div>
      <div style="display:flex;gap:18px;flex-wrap:wrap;justify-content:center;font-size:.8rem;color:#333;margin:4px 0;">
        <span><span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:#1f77b4;vertical-align:middle"></span> Expérimental</span>
        <span><span style="display:inline-block;width:18px;border-top:3px solid #000;vertical-align:middle"></span> Modèle ajusté</span>
        <span><span style="display:inline-block;width:18px;border-top:3px dashed #CC0000;vertical-align:middle"></span> Solution (Cressie)</span>
      </div>
      <div class="js-sol" style="padding:.45rem 1rem;background:#eef2e8;border:1px solid #b8c8a8;border-radius:6px;font-family:'JetBrains Mono',monospace;font-size:.82rem;color:#4a6a3a;text-align:center;">Ajustez le modèle (portées, azimut, type) pour faire coïncider les courbes noires avec les points, dans chaque direction.</div>
    `);

    this.plot = this.el.querySelector('.js-plot');
    this.solEl = this.el.querySelector('.js-sol');
    this.checkbox = this.el.querySelector('.js-show');
    this.A = {
      type: this.el.querySelector('.js-type'), ag: this.el.querySelector('.js-ag'),
      ap: this.el.querySelector('.js-ap'), th: this.el.querySelector('.js-th'),
      c1: this.el.querySelector('.js-c1'), c0: this.el.querySelector('.js-c0'),
    };
    const redraw = debounce(() => this._dessiner(), 60);
    for (const [k, el] of Object.entries(this.A)) {
      this.on(el, 'input', e => { const s = this.el.querySelector(`.js-${k}v`); if (s) s.textContent = e.target.value; });
      this.on(el, 'change', redraw);
    }
    this.on(this.checkbox, 'change', () => this._dessiner());
    this.on(this.el.querySelector('.js-new'), 'click', () => this._nouveauScenario());
    afficherChargementJusquaPret(this.el).then(() => this._nouveauScenario());
  }

  async _nouveauScenario() {
    const major = Math.round(30 + Math.random() * 60);            // 30–90
    this.truth = {
      angle: Math.round(Math.random() * 180),
      ag: major,
      ap: Math.round(10 + Math.random() * (major - 10)),          // 10–major
      type: TYPES[Math.floor(Math.random() * 3)],
      c1: +(0.5 + Math.random() * 0.5).toFixed(2),
      c0: +(Math.random() * 0.3).toFixed(2),
      seed: (Math.random() * 1e9) >>> 0,
    };
    this.checkbox.checked = false;
    const t = this.truth, N = CONFIG.N;
    const total = t.c1 + t.c0, pepFrac = total > 0 ? t.c0 / total : 0;
    let champ;
    try {
      champ = await gpoly.simulerChampAniso(t.type, t.ag, t.ap, t.angle, pepFrac, t.seed, N, 'gaussien', 0.0, total);
    } catch (e) { this.afficherAvertissement('Erreur simulation : ' + e.message); return; }

    let s = (t.seed ^ 0x9e3779b9) >>> 0;
    const rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    const set = new Set(); while (set.size < CONFIG.n_pts) set.add(Math.floor(rng() * N * N));
    this.coords = []; this.valeurs = new Float64Array(CONFIG.n_pts);
    let i = 0; for (const idx of set) { const y = Math.floor(idx / N), x = idx - y * N; this.coords.push([x, y]); this.valeurs[i++] = champ[idx]; }

    await this._computeExp();
    this._dessiner();
  }

  async _computeExp() {
    if (!this.coords) return;
    const nLags = Math.max(4, Math.round(CONFIG.h_max / CONFIG.lag));
    const tol = CONFIG.tol;
    try {
      this.exp = await Promise.all(DIRS.map(dir =>
        gpoly.variogrammeDirectionnel(this.coords, this.valeurs, dir, tol, nLags, CONFIG.h_max)));
      // Solution de référence : ajustement anisotrope automatique (Cressie WLS).
      this.solution = await gpoly.ajusterVariogrammeAniso(
        DIRS, this.exp.map(e => e.h), this.exp.map(e => e.gamma), this.exp.map(e => e.comptes));
    } catch (e) { this.afficherAvertissement('Erreur variogramme directionnel : ' + e.message); }
  }

  _dessiner() {
    if (!this.exp) return;
    const type = this.A.type.value, ag = +this.A.ag.value, ap = +this.A.ap.value, th = +this.A.th.value;
    const c1 = +this.A.c1.value, c0 = +this.A.c0.value;
    const sol = this.solution;
    const montrer = this.checkbox.checked && !!sol;
    const lags = []; for (let i = 0; i <= 40; i++) lags.push(i * CONFIG.h_max / 40);
    const gModel = (ty, a, cc1, cc0) => lags.map(h => (h > 0 ? cc0 : 0) + cc1 * (1 - covu(ty, h / rconv(ty, a))));

    const cols = [[0, 0.30], [0.37, 0.66], [0.73, 1.0]];
    const rows = [[0.71, 1.0], [0.38, 0.67], [0.05, 0.34]];
    const traces = [], layout = { margin: { t: 16, l: 38, r: 8, b: 28 }, showlegend: false, font: { size: 9 }, annotations: [] };
    DIRS.forEach((phi, k) => {
      const ax = k === 0 ? '' : (k + 1);
      const col = k % 3, row = Math.floor(k / 3);
      const aFit = aDir(ag, ap, th, phi);
      traces.push({ x: this.exp[k].h, y: this.exp[k].gamma, mode: 'markers', marker: { color: '#1f77b4', size: 5 }, xaxis: 'x' + ax, yaxis: 'y' + ax });
      traces.push({ x: lags, y: gModel(type, aFit, c1, c0), mode: 'lines', line: { color: '#000', width: 2 }, xaxis: 'x' + ax, yaxis: 'y' + ax });
      if (montrer) {
        const aS = aDir(sol.ag, sol.ap, sol.theta, phi);
        traces.push({ x: lags, y: gModel(sol.type, aS, sol.c1, sol.c0), mode: 'lines', line: { color: '#CC0000', width: 2, dash: 'dash' }, xaxis: 'x' + ax, yaxis: 'y' + ax });
      }
      layout['xaxis' + ax] = { domain: cols[col], anchor: 'y' + ax, range: [0, CONFIG.h_max], tickfont: { size: 7 }, showgrid: false };
      layout['yaxis' + ax] = { domain: rows[row], anchor: 'x' + ax, range: [0, 1.8], tickfont: { size: 7 }, showgrid: false };
      layout.annotations.push({ text: `${phi}°`, x: (cols[col][0] + cols[col][1]) / 2, y: rows[row][1], xref: 'paper', yref: 'paper', showarrow: false, font: { size: 10, color: '#444' }, xanchor: 'center', yanchor: 'bottom' });
    });

    if (!window.Plotly) { this.afficherAvertissement('Plotly non chargé.'); return; }
    Plotly.react(this.plot, traces, layout, { displaylogo: false, responsive: true });

    this.solEl.innerHTML = montrer
      ? `🎯 Solution (Cressie) : <b>${NOM[sol.type]}</b> · θ = <b>${sol.theta.toFixed(0)}°</b> · a_g = <b>${sol.ag.toFixed(1)}</b> · a_p = <b>${sol.ap.toFixed(1)}</b> · c₁ = <b>${sol.c1.toFixed(2)}</b> · c₀ = <b>${sol.c0.toFixed(2)}</b>`
      : `Ajustez le modèle (portées, azimut, type) pour faire coïncider les courbes noires avec les points, dans chaque direction.`;
  }

  cleanup() { if (this.plot && window.Plotly) Plotly.purge(this.plot); }
}

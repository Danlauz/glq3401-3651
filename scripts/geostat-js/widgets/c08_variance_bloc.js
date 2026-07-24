// scripts/geostat-js/widgets/c08_variance_bloc.js
// -----------------------------------------------------------------------------
// Widget C08 — Atelier 8.1 « Introduction à la variance de bloc » (calque du
// notebook Chap7_VarianceBloc). Effet de support : la variance s'atténue quand
// la taille du bloc augmente.
//
// Deux figures de même taille : (gauche) le champ AGRÉGÉ au support choisi
// (Turbo, boîte carrée) ; (droite) la variance de bloc EXPÉRIMENTALE (moyennes
// glissantes sur le champ simulé) comparée à la variance THÉORIQUE (intégrale
// de covariance), avec une ligne rouge au support sélectionné.
//
// Comme dans le notebook : le bouton lance la simulation complète (lente) ; le
// curseur « Support » ne fait que ré-agréger l'image (rapide).
//
// Tout passe par geostat_polymtl : champ = simulerChampAniso ; empirique =
// varianceBlocEmpirique ; théorique = varianceBlocSupport ; agrégation =
// agregerChamp. Aucun calcul géostatistique côté JS.
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

const TURBO = [
  [0.0, 'rgb(48,18,59)'], [0.1, 'rgb(65,69,171)'], [0.2, 'rgb(57,118,233)'],
  [0.3, 'rgb(33,161,238)'], [0.4, 'rgb(26,199,194)'], [0.5, 'rgb(76,221,142)'],
  [0.6, 'rgb(150,233,89)'], [0.7, 'rgb(212,225,55)'], [0.8, 'rgb(248,186,56)'],
  [0.9, 'rgb(242,124,36)'], [1.0, 'rgb(122,4,3)'],
];
const CONFIG = { N: 160, seed: 4263, supportMax: 40, nGauss: 40 };

export default class C08VarianceBloc extends Widget {
  render() {
    const id = this.el.id;
    this.el.insertAdjacentHTML('beforeend', `
      <style>
        #${id} .cv-grp{display:flex;flex-wrap:wrap;gap:16px;align-items:center;padding:6px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;margin-bottom:6px;}
        #${id} .cv-grp b{font-size:.78rem;color:#555;margin-right:2px;}
        #${id} .cv-grp label{display:inline-flex;align-items:center;gap:6px;}
      </style>
      <div class="cv-grp">
        <label>Support (pixels) <input type="range" class="js-sup" min="1" max="${CONFIG.supportMax}" value="1" step="1" style="width:120px"><span class="js-supv">1</span></label>
      </div>
      <div class="cv-grp">
        <label><b>Modèle</b> <select class="js-mod">
          <option value="spherique" selected>Sphérique</option>
          <option value="exponentiel">Exponentiel</option>
          <option value="gaussien">Gaussien</option>
        </select></label>
      </div>
      <div class="cv-grp">
        <b>Portées</b>
        <label><span>a<sub>g</sub></span> <input type="range" class="js-ag" min="2" max="50" value="30" step="1" style="width:90px"><span class="js-agv">30</span></label>
        <label><span>a<sub>p</sub></span> <input type="range" class="js-ap" min="1" max="50" value="15" step="1" style="width:90px"><span class="js-apv">15</span></label>
        <label><span>Angle θ</span> <input type="range" class="js-ang" min="0" max="180" value="45" step="5" style="width:90px"><span class="js-angv">45</span></label>
      </div>
      <div class="cv-grp">
        <b>Variance</b>
        <label>Palier <span>c<sub>1</sub></span> <input type="range" class="js-c1" min="0.2" max="3" value="1" step="0.1" style="width:90px"><span class="js-c1v">1.0</span></label>
        <label>Pépite <span>c<sub>0</sub></span> <input type="range" class="js-c0" min="0" max="1" value="0.1" step="0.05" style="width:90px"><span class="js-c0v">0.10</span></label>
      </div>
      <div style="margin-bottom:6px;">
        <button class="js-run" type="button" style="font-size:.8rem;padding:5px 16px;background:#16794a;color:#fff;border:none;border-radius:5px;cursor:pointer;font-weight:600;">Lancer la simulation</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start;">
        <div class="js-field" style="height:360px"></div>
        <div class="js-curve" style="height:360px"></div>
      </div>
      <div class="js-info" style="text-align:center;font-size:.82rem;color:#555;margin-top:4px;"></div>
    `);

    this.fieldEl = this.el.querySelector('.js-field');
    this.curveEl = this.el.querySelector('.js-curve');
    this.infoEl = this.el.querySelector('.js-info');
    this.supEl = this.el.querySelector('.js-sup');
    this.ctrl = {
      mod: this.el.querySelector('.js-mod'),
      ag:  this.el.querySelector('.js-ag'),
      ap:  this.el.querySelector('.js-ap'),
      c1:  this.el.querySelector('.js-c1'),
      c0:  this.el.querySelector('.js-c0'),
      ang: this.el.querySelector('.js-ang'),
    };
    this.seed = CONFIG.seed;
    this.cache = null;

    // Le curseur Support : maj de la valeur + ré-affichage rapide (cache).
    this.on(this.supEl, 'input', e => {
      this.el.querySelector('.js-supv').textContent = e.target.value;
      if (this.cache) this._dessiner(parseInt(e.target.value, 10));
    });
    // Les autres paramètres affichent seulement leur valeur (recalcul au bouton).
    const fmt = { c1: 1, c0: 2, ag: 0, ap: 0, ang: 0 };
    for (const k of ['ag', 'ap', 'c1', 'c0', 'ang']) {
      this.on(this.ctrl[k], 'input', e => {
        const v = parseFloat(e.target.value);
        this.el.querySelector(`.js-${k}v`).textContent = v.toFixed(fmt[k]);
      });
    }
    this.on(this.el.querySelector('.js-run'), 'click', () => { this.seed++; this._simuler(); });
    afficherChargementJusquaPret(this.el).then(() => this._simuler());
  }

  async _simuler() {
    const mod = this.ctrl.mod.value;
    const ag  = parseFloat(this.ctrl.ag.value);
    const ap  = parseFloat(this.ctrl.ap.value);
    const c1  = parseFloat(this.ctrl.c1.value);
    const c0  = parseFloat(this.ctrl.c0.value);
    const ang = parseFloat(this.ctrl.ang.value);
    const N = CONFIG.N, total = c1 + c0;
    const pepFrac = total > 0 ? c0 / total : 0;

    // 1) Champ anisotrope (variance totale c1+c0, fraction pépite c0/(c1+c0)).
    let field;
    try {
      field = await gpoly.simulerChampAniso(mod, ag, ap, ang, pepFrac,
                                            this.seed, N, 'gaussien', 0.0, total);
    } catch (e) { this.afficherAvertissement('Erreur simulation : ' + e.message); return; }

    // 2) Variance empirique vs taille de bloc (moyennes glissantes).
    let emp;
    try { emp = await gpoly.varianceBlocEmpirique(field, N, CONFIG.supportMax); }
    catch (e) { this.afficherAvertissement('Erreur empirique : ' + e.message); return; }

    // 3) Variance théorique (intégrale de covariance) pour les mêmes tailles.
    let varTheo;
    try {
      varTheo = await Promise.all(emp.tailles.map(b =>
        gpoly.varianceBlocSupport(ag, ap, c1, c0, b, 1.0, ang, mod, CONFIG.nGauss)));
    } catch (e) { this.afficherAvertissement('Erreur théorique : ' + e.message); return; }

    this.cache = { field, N, total, tailles: emp.tailles, varExp: emp.variances, varTheo };
    this._dessiner(parseInt(this.supEl.value, 10));
  }

  async _dessiner(support) {
    if (!this.cache) return;
    const { field, N, total, tailles, varExp, varTheo } = this.cache;
    if (!window.Plotly) { this.afficherAvertissement('Plotly non chargé.'); return; }

    // --- Figure de gauche : champ agrégé (boîte carrée) ---
    let agg;
    try { agg = await gpoly.agregerChamp(field, N, support); }
    catch (e) { this.afficherAvertissement('Erreur agrégation : ' + e.message); return; }
    const z = [];
    for (let i = 0; i < agg.rows; i++) z.push(agg.agg.slice(i * agg.cols, (i + 1) * agg.cols));
    const lim = 2.5 * Math.sqrt(total);

    Plotly.react(this.fieldEl, [
      { z, type: 'heatmap', colorscale: TURBO, zmin: -lim, zmax: lim, zsmooth: false,
        colorbar: { len: 0.9, thickness: 11, x: 1.0, xanchor: 'left', y: 0.5,
                    title: { text: 'valeur', side: 'right', font: { size: 10 } }, tickfont: { size: 9 } } },
    ], {
      margin: { t: 30, l: 8, r: 64, b: 8 },
      title: { text: `Champ agrégé (support ${support}×${support})`, font: { size: 12 } },
      xaxis: { showticklabels: false, ticks: '', zeroline: false, constrain: 'domain', showgrid: false },
      yaxis: { showticklabels: false, ticks: '', zeroline: false, scaleanchor: 'x', constrain: 'domain', autorange: 'reversed', showgrid: false },
    }, { displaylogo: false, responsive: true });

    // --- Figure de droite : variance vs support ---
    Plotly.react(this.curveEl, [
      { x: tailles, y: varExp, mode: 'lines+markers', name: 'Variance expérimentale',
        line: { color: '#1f77b4', width: 2 }, marker: { color: '#1f77b4', size: 6 } },
      { x: tailles, y: varTheo, mode: 'lines+markers', name: 'Variance théorique',
        line: { color: '#ea8f1e', width: 2, dash: 'dash' }, marker: { color: '#ea8f1e', size: 5, symbol: 'square' } },
      { x: [support, support], y: [0, total * 1.08], mode: 'lines', name: `Support = ${support}`,
        line: { color: '#CC0000', width: 1.5, dash: 'dot' } },
    ], {
      margin: { t: 30, l: 50, r: 14, b: 46 },
      title: { text: 'Variance vs taille de support', font: { size: 12 } },
      legend: { orientation: 'h', y: -0.16, x: 0.5, xanchor: 'center', font: { size: 9 } },
      xaxis: { title: { text: 'Taille du support (pixels)', standoff: 4 }, range: [0, CONFIG.supportMax] },
      yaxis: { title: 'Variance de bloc', range: [0, total * 1.08] },
    }, { displaylogo: false, responsive: true });

    this.infoEl.innerHTML = `Support <b>${support}×${support}</b> — variance expérimentale = ` +
      `<b>${(varExp[support - 1] ?? NaN).toFixed(3)}</b>, théorique = <b>${(varTheo[support - 1] ?? NaN).toFixed(3)}</b> ` +
      `(variance ponctuelle ${total.toFixed(2)}). La variance décroît avec la taille du bloc : c'est l'<b>effet de support</b>.`;
  }

  cleanup() {
    if (window.Plotly) {
      if (this.fieldEl) Plotly.purge(this.fieldEl);
      if (this.curveEl) Plotly.purge(this.curveEl);
    }
  }
}

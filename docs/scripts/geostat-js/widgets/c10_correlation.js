// scripts/geostat-js/widgets/c10_correlation.js
// -----------------------------------------------------------------------------
// Widget C10.2 — Effet de la correlation entre variables sur sigma^2(Z1*).
//
// Configuration heterotopique : z1 a 4 points + z2 a 12 points additionnels.
// L'utilisateur fait varier le coefficient de correlation rho = c12/sqrt(c11*c22).
// Resultat attendu : sigma^2(Z1*) decroit avec |rho|.
// -----------------------------------------------------------------------------
import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';
const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

const COORDS_Z1 = [[10,10],[40,10],[10,40],[40,40]];
const COORDS_Z2_EXTRA = [[25,25],[15,30],[30,15],[25,5],[25,45],[5,25],[45,25],[15,15],[30,30],[15,40],[35,5],[5,35]];

export default class C10Correlation extends Widget {
  render() {
    this.el.insertAdjacentHTML('beforeend', `
      <div class="gw-controls" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;">
        <label>Modèle <select class="js-mod">
          <option value="spherique">Sphérique</option><option value="exponentiel">Exponentiel</option><option value="gaussien">Gaussien</option>
        </select></label>
        <label>Portée a <input type="range" class="js-a" min="10" max="50" value="25" step="1" style="width:120px"><span class="js-av">25</span></label>
        <label><b>ρ = c₁₂/√(c₁₁c₂₂)</b>
          <input type="range" class="js-rho" min="-0.95" max="0.95" value="0.7" step="0.02" style="width:180px"><span class="js-rhov">0.70</span></label>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px;">
        <div class="js-plot-map" style="height:340px"></div>
        <div class="js-plot-var" style="height:340px"></div>
      </div>
      <div class="js-info" style="padding:.4rem 1rem;font-family:'JetBrains Mono',monospace;font-size:.82rem;color:#444;text-align:center;background:#f0f0f0;border-radius:6px;margin-top:4px;">—</div>
    `);
    this.plotMap = this.el.querySelector('.js-plot-map');
    this.plotVar = this.el.querySelector('.js-plot-var');
    this.infoEl = this.el.querySelector('.js-info');
    this.ctrl = {
      mod: this.el.querySelector('.js-mod'),
      a:   this.el.querySelector('.js-a'),
      rho: this.el.querySelector('.js-rho'),
    };
    const update = debounce(() => this.refresh(), 300);
    for (const [k, el] of Object.entries(this.ctrl)) {
      this.on(el, 'input', e => {
        const span = this.el.querySelector(`.js-${k}v`);
        if (span) span.textContent = (el.type === 'range') ? parseFloat(e.target.value).toFixed(2) : e.target.value;
      });
      this.on(el, 'input', update);
      this.on(el, 'change', update);
    }
    afficherChargementJusquaPret(this.el).then(() => this.refresh());
  }

  async refresh() {
    const mod = this.ctrl.mod.value;
    const a   = parseFloat(this.ctrl.a.value);
    const rho = parseFloat(this.ctrl.rho.value);
    const c11 = 1.0, c22 = 1.0;
    const c12 = rho * Math.sqrt(c11 * c22);

    // Donnees synthetiques : z2 corrélé à z1
    const z1_data = [2.0, 4.0, 3.0, 5.0];  // 4 mesures z1
    // z2_extra : valeurs aux 12 points additionnels (z2 corrélé)
    const z2_extra = COORDS_Z2_EXTRA.map(([x,y]) => 0.3*x*0.01 + 0.4*y*0.01 + 2.5);
    // Coordonnees combinees
    const coords = [...COORDS_Z1, ...COORDS_Z2_EXTRA];
    const n = coords.length;
    // z1 : 4 mesures puis NaN pour les 12 points additionnels
    const z1 = [...z1_data, ...Array(12).fill(NaN)];
    // z2 : valeurs partout (en isotopique aux 4 z1 points aussi)
    const z2 = [...z1_data.map(v => 0.4 + 0.6*v), ...z2_extra];

    const structs = [{ modele: mod, portee: a, palier_matrix: [[c11, c12], [c12, c22]] }];

    // Krigeage simple (sans z2)
    let r_ks_only;
    try {
      r_ks_only = await gpoly.krigeageOrdinaire(COORDS_Z1, z1_data, [[25, 25]],
        [{ modele: mod, portee: a, palier: c11 }], 0.0);
    } catch (e) { this.afficherAvertissement('Erreur KO : ' + e.message); return; }

    // Cokrigeage (avec z2 dense)
    let r_ck;
    try {
      r_ck = await gpoly.cokrigeageOrdinaire(coords, [z1, z2], [[25, 25]], structs);
    } catch (e) { this.afficherAvertissement('Erreur cokrigeage : ' + e.message); return; }

    if (!window.Plotly) { this.afficherAvertissement('Plotly non chargé.'); return; }
    // Carte des points
    Plotly.react(this.plotMap, [
      { x: COORDS_Z1.map(c => c[0]), y: COORDS_Z1.map(c => c[1]), mode: 'markers',
        marker: { color: '#0d4d92', size: 15, symbol: 'square' }, name: 'Z (rare)' },
      { x: COORDS_Z2_EXTRA.map(c => c[0]), y: COORDS_Z2_EXTRA.map(c => c[1]), mode: 'markers',
        marker: { color: '#ea580c', size: 9, symbol: 'circle' }, name: 'Y extra (dense)' },
      { x: [25], y: [25], mode: 'markers',
        marker: { color: '#c43a3a', size: 20, symbol: 'x', line: { width: 3 } }, name: 'Cible x₀' },
    ], {
      margin: { t: 30, l: 40, r: 20, b: 40 },
      xaxis: { range: [0, 50], scaleanchor: 'y' },
      yaxis: { range: [0, 50] },
      title: { text: 'Configuration hétérotopique', font: { size: 12 } },
      legend: { orientation: 'h', y: -0.15, x: 0.5, xanchor: 'center', font: { size: 10 } },
    }, { displaylogo: false, responsive: true });

    // Courbe σ²(Z1*) vs ρ
    const rhos = []; for (let i = -19; i <= 19; i++) rhos.push(i / 20);
    const sigmas = [];
    for (const r_val of rhos) {
      const cm = [[c11, r_val * Math.sqrt(c11 * c22)], [r_val * Math.sqrt(c11 * c22), c22]];
      try {
        const res = await gpoly.cokrigeageOrdinaire(coords, [z1, z2], [[25, 25]],
          [{ modele: mod, portee: a, palier_matrix: cm }]);
        sigmas.push(res.variances[0][0]);
      } catch { sigmas.push(NaN); }
    }
    Plotly.react(this.plotVar, [
      { x: rhos, y: sigmas, mode: 'lines+markers',
        line: { color: '#0d4d92', width: 2 }, marker: { color: '#0d4d92', size: 5 },
        name: 'σ²(Z*) cokrigeage' },
      { x: [rhos[0], rhos[rhos.length-1]], y: [r_ks_only.variances[0], r_ks_only.variances[0]],
        mode: 'lines', line: { color: '#888', dash: 'dash', width: 1.5 },
        name: 'σ²(Z*) sans Y' },
      { x: [rho], y: [r_ck.variances[0][0]], mode: 'markers',
        marker: { color: '#c43a3a', size: 14, symbol: 'diamond' }, name: 'Position actuelle' },
    ], {
      margin: { t: 30, l: 50, r: 20, b: 50 },
      xaxis: { title: 'ρ = c₁₂/√(c₁₁c₂₂)', range: [-1, 1] },
      yaxis: { title: 'σ²(Z*)', rangemode: 'tozero' },
      title: { text: "Effet de ρ sur la variance d'estimation de Z", font: { size: 12 } },
      legend: { orientation: 'h', y: -0.18, x: 0.5, xanchor: 'center', font: { size: 9 } },
    }, { displaylogo: false, responsive: true });

    const reduction = 100 * (1 - r_ck.variances[0][0] / r_ks_only.variances[0]);
    this.infoEl.innerHTML =
      `ρ = ${rho.toFixed(2)} · σ²(Z*) cokrigeage = <b>${r_ck.variances[0][0].toFixed(4)}</b> · ` +
      `σ²(Z*) sans Y = ${r_ks_only.variances[0].toFixed(4)} · ` +
      `réduction = <b>${reduction.toFixed(1)} %</b>`;
  }

  cleanup() {
    if (window.Plotly) {
      if (this.plotMap) Plotly.purge(this.plotMap);
      if (this.plotVar) Plotly.purge(this.plotVar);
    }
  }
}

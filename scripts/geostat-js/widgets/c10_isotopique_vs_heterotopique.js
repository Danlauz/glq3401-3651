// scripts/geostat-js/widgets/c10_isotopique_vs_heterotopique.js
// -----------------------------------------------------------------------------
// Widget C10.5 — Configurations isotopique vs heterotopique.
//
// Pedagogie : on bascule entre 2 configurations en gardant les MEMES vrais
// valeurs et le MEME modele LMC :
//   - Isotopique  : z1 et z2 mesures aux MEMES positions
//   - Heterotopique : z1 mesure en peu de points, z2 en TOUS les points
//
// Observations :
//   - En isotopique, σ²(Z1*) cokrigeage ≈ σ²(Z1*) krigeage seul
//     (z2 ne donne pas d'info supplementaire au point ou z1 est connu).
//   - En heterotopique, le cokrigeage REDUIT significativement σ²(Z1*).
// -----------------------------------------------------------------------------
import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';
const debounce = (fn, ms = 300) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

export default class C10IsotopiqueVsHeterotopique extends Widget {
  render() {
    this.el.insertAdjacentHTML('beforeend', `
      <div class="gw-controls" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;">
        <label><b>Configuration</b>
          <select class="js-config">
            <option value="iso">Isotopique (Z et Y aux mêmes points)</option>
            <option value="hetero" selected>Hétérotopique (Z rare, Y dense)</option>
          </select>
        </label>
        <label>ρ <input type="range" class="js-rho" min="0" max="0.95" value="0.7" step="0.02" style="width:120px"><span class="js-rhov">0.70</span></label>
        <label>Portée a <input type="range" class="js-a" min="10" max="50" value="25" step="1" style="width:100px"><span class="js-av">25</span></label>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px;">
        <div class="js-plot-iso" style="height:330px"></div>
        <div class="js-plot-het" style="height:330px"></div>
      </div>
      <div class="js-info" style="padding:.4rem 1rem;font-family:'JetBrains Mono',monospace;font-size:.82rem;color:#444;text-align:center;background:#f0f0f0;border-radius:6px;margin-top:4px;">—</div>
      <p style="margin:4px 1rem;font-size:11px;color:#666;">
        Quand Y est mesuré AUX MÊMES points que Z, il n'apporte aucune info supplémentaire pour estimer Z (les poids λ₂ sont nuls).</p>
    `);
    this.plotIso = this.el.querySelector('.js-plot-iso');
    this.plotHet = this.el.querySelector('.js-plot-het');
    this.infoEl = this.el.querySelector('.js-info');
    this.ctrl = {
      config: this.el.querySelector('.js-config'),
      rho: this.el.querySelector('.js-rho'),
      a:   this.el.querySelector('.js-a'),
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
    const rho = parseFloat(this.ctrl.rho.value);
    const a = parseFloat(this.ctrl.a.value);
    const config = this.ctrl.config.value;
    const structs = [{ modele: 'spherique', portee: a, palier_matrix: [[1.0, rho], [rho, 1.0]] }];

    // 4 points pour z1
    const COORDS_Z1 = [[10,10],[40,10],[10,40],[40,40]];
    const z1_vals = [2.0, 5.0, 3.0, 4.0];
    // 12 points additionnels en heterotopique
    const COORDS_Z2_EXTRA = [[25,25],[15,30],[30,15],[25,5],[25,45],[5,25],[45,25],[15,15],[30,30],[15,40],[35,5],[5,35]];
    const z2_at_extra = COORDS_Z2_EXTRA.map(([x,y]) => 0.5 + 0.04*x + 0.06*y);

    // ISOTOPIQUE : tous les points ont Z1 ET Z2
    const coords_iso = COORDS_Z1;
    const z2_at_z1_pts = COORDS_Z1.map(([x,y]) => 0.5 + 0.04*x + 0.06*y);

    // HETEROTOPIQUE : Z1 sur 4 points seulement, Z2 sur 16 points
    const coords_het = [...COORDS_Z1, ...COORDS_Z2_EXTRA];
    const z1_het = [...z1_vals, ...Array(12).fill(NaN)];
    const z2_het = [...z2_at_z1_pts, ...z2_at_extra];

    const cible = [[25, 25]];

    let r_iso_only, r_iso_ck, r_het_only, r_het_ck;
    try {
      // ISO : krigeage seul de Z1 et cokrigeage
      r_iso_only = await gpoly.krigeageOrdinaire(COORDS_Z1, z1_vals, cible,
        [{ modele: 'spherique', portee: a, palier: 1.0 }], 0.0);
      r_iso_ck = await gpoly.cokrigeageOrdinaire(coords_iso, [z1_vals, z2_at_z1_pts], cible, structs);
      // HETERO
      r_het_only = await gpoly.krigeageOrdinaire(COORDS_Z1, z1_vals, cible,
        [{ modele: 'spherique', portee: a, palier: 1.0 }], 0.0);
      r_het_ck = await gpoly.cokrigeageOrdinaire(coords_het, [z1_het, z2_het], cible, structs);
    } catch (e) { this.afficherAvertissement('Erreur : ' + e.message); return; }

    if (!window.Plotly) { this.afficherAvertissement('Plotly non chargé.'); return; }
    // Carte ISO
    Plotly.react(this.plotIso, [
      { x: COORDS_Z1.map(c=>c[0]), y: COORDS_Z1.map(c=>c[1]), mode: 'markers',
        marker: { color: '#0d4d92', size: 16, symbol: 'square' }, name: 'Z et Y (mêmes pts)' },
      { x: [25], y: [25], mode: 'markers',
        marker: { color: '#c43a3a', size: 20, symbol: 'x', line: { width: 3 } }, name: 'Cible' },
    ], {
      margin: { t: 35, l: 30, r: 20, b: 35 },
      xaxis: { range: [0, 50], scaleanchor: 'y' }, yaxis: { range: [0, 50] },
      title: { text: `ISOTOPIQUE · σ²(Z*) KO=${r_iso_only.variances[0].toFixed(3)}, cokr=${r_iso_ck.variances[0][0].toFixed(3)}`, font: { size: 11 } },
      legend: { orientation: 'h', y: -0.12, x: 0.5, xanchor: 'center', font: { size: 9 } },
    }, { displaylogo: false, responsive: true });

    // Carte HETERO
    Plotly.react(this.plotHet, [
      { x: COORDS_Z1.map(c=>c[0]), y: COORDS_Z1.map(c=>c[1]), mode: 'markers',
        marker: { color: '#0d4d92', size: 16, symbol: 'square' }, name: 'Z (rare)' },
      { x: COORDS_Z2_EXTRA.map(c=>c[0]), y: COORDS_Z2_EXTRA.map(c=>c[1]), mode: 'markers',
        marker: { color: '#ea580c', size: 9, symbol: 'circle' }, name: 'Y extra (dense)' },
      { x: [25], y: [25], mode: 'markers',
        marker: { color: '#c43a3a', size: 20, symbol: 'x', line: { width: 3 } }, name: 'Cible' },
    ], {
      margin: { t: 35, l: 30, r: 20, b: 35 },
      xaxis: { range: [0, 50], scaleanchor: 'y' }, yaxis: { range: [0, 50] },
      title: { text: `HÉTÉROTOPIQUE · σ²(Z*) KO=${r_het_only.variances[0].toFixed(3)}, cokr=${r_het_ck.variances[0][0].toFixed(3)}`, font: { size: 11 } },
      legend: { orientation: 'h', y: -0.12, x: 0.5, xanchor: 'center', font: { size: 9 } },
    }, { displaylogo: false, responsive: true });

    const red_iso = 100 * (1 - r_iso_ck.variances[0][0] / r_iso_only.variances[0]);
    const red_het = 100 * (1 - r_het_ck.variances[0][0] / r_het_only.variances[0]);
    this.infoEl.innerHTML =
      `Réduction de σ²(Z*) par cokrigeage : ` +
      `<span style="color:#0d4d92">isotopique = <b>${red_iso.toFixed(1)} %</b></span> (négligeable) · ` +
      `<span style="color:#ea580c">hétérotopique = <b>${red_het.toFixed(1)} %</b></span> (significative)`;
  }

  cleanup() {
    if (window.Plotly) {
      if (this.plotIso) Plotly.purge(this.plotIso);
      if (this.plotHet) Plotly.purge(this.plotHet);
    }
  }
}

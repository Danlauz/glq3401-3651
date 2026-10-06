// scripts/geostat-js/widgets/c12_E_type.js
// -----------------------------------------------------------------------------
// Widget C12.5 — Carte E-type + carte d'ecart-type vs krigeage.
// On compare E-type (moyenne de N realisations conditionnelles) avec le
// krigeage Z*, et l'ecart-type des realisations avec sigma_K.
// Convergence quand N -> inf : E-type ≈ Z*, ecart-type ≈ sigma_K.
// -----------------------------------------------------------------------------
import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';
const debounce = (fn, ms = 700) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

export default class C12EType extends Widget {
  render() {
    this.el.insertAdjacentHTML('beforeend', `
      <div class="gw-controls" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;">
        <label>Modèle <select class="js-mod">
          <option value="spherique">Sphérique</option><option value="exponentiel">Exponentiel</option><option value="gaussien">Gaussien</option>
        </select></label>
        <label>Portée a <input type="range" class="js-a" min="3" max="15" value="8" step="1" style="width:120px"><span class="js-av">8</span></label>
        <label>Grille N <input type="number" class="js-N" value="25" min="15" max="35" step="2" style="width:60px"></label>
        <label><b>nbsim</b> <input type="range" class="js-nbsim" min="5" max="50" value="20" step="5" style="width:120px"><span class="js-nbsimv">20</span></label>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px;">
        <div class="js-plot-etype" style="height:320px"></div>
        <div class="js-plot-std" style="height:320px"></div>
      </div>
      <div class="js-info" style="padding:.4rem 1rem;font-family:'JetBrains Mono',monospace;font-size:.8rem;color:#444;text-align:center;background:#f0f0f0;border-radius:6px;margin-top:4px;">—</div>
    `);
    this.plotE = this.el.querySelector('.js-plot-etype');
    this.plotS = this.el.querySelector('.js-plot-std');
    this.infoEl = this.el.querySelector('.js-info');
    this.ctrl = { mod: this.el.querySelector('.js-mod'), a: this.el.querySelector('.js-a'),
                   N: this.el.querySelector('.js-N'), nbsim: this.el.querySelector('.js-nbsim') };
    this.seed = 5;
    const update = debounce(() => this.refresh(), 700);
    for (const [k, el] of Object.entries(this.ctrl)) {
      this.on(el, 'input', e => { const s = this.el.querySelector(`.js-${k}v`); if (s) s.textContent = e.target.value; });
      this.on(el, 'input', update); this.on(el, 'change', update);
    }
    afficherChargementJusquaPret(this.el).then(() => this.refresh());
  }

  async refresh() {
    const mod = this.ctrl.mod.value, a = parseFloat(this.ctrl.a.value);
    const N = parseInt(this.ctrl.N.value, 10), nbsim = parseInt(this.ctrl.nbsim.value, 10);
    let res;
    try {
      res = await gpoly.simulerNRealisations(mod, a, 1.0, this.seed, N, nbsim, 'FFTMA');
    } catch (e) { this.afficherAvertissement('Erreur : ' + e.message); return; }

    const reshape = (flat) => { const M=[]; for (let j=0; j<N; j++) { const r=[]; for (let i=0; i<N; i++) r.push(flat[j*N+i]); M.push(r); } return M; };
    const std_pixel = res.var_pixel.map(v => Math.sqrt(Math.max(0, v)));

    if (!window.Plotly) { this.afficherAvertissement('Plotly non chargé.'); return; }
    const layoutCommon = {
      margin: { t: 35, l: 30, r: 50, b: 30 },
      xaxis: { showticklabels: false, scaleanchor: 'y' },
      yaxis: { showticklabels: false },
    };
    Plotly.react(this.plotE, [{ type: 'heatmap', z: reshape(res.e_type), colorscale: 'Turbo', colorbar: { thickness: 10 } }],
      { ...layoutCommon, title: { text: `E-type (moyenne sur ${nbsim} sim.)`, font: { size: 12 } } },
      { displaylogo: false, responsive: true });
    Plotly.react(this.plotS, [{ type: 'heatmap', z: reshape(std_pixel), colorscale: 'Hot', colorbar: { thickness: 10 } }],
      { ...layoutCommon, title: { text: `Écart-type pixel-à-pixel (≈ σ_K si NC)`, font: { size: 12 } } },
      { displaylogo: false, responsive: true });

    // Statistiques déléguées à la librairie (statistiques_descriptives)
    const [statEtype, statStd] = await Promise.all([
      gpoly.statistiquesDescriptives(Array.from(res.e_type)),
      gpoly.statistiquesDescriptives(Array.from(std_pixel)),
    ]);
    this.infoEl.innerHTML =
      `Moyenne E-type sur la grille : <b>${statEtype.moyenne.toFixed(3)}</b> (≈ 0 attendu) · ` +
      `Écart-type moyen : <b>${statStd.moyenne.toFixed(3)}</b> (→ √palier = 1 si NC)`;
  }

  cleanup() {
    if (window.Plotly) { if (this.plotE) Plotly.purge(this.plotE); if (this.plotS) Plotly.purge(this.plotS); }
  }
}

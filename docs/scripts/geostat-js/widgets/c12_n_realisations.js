// scripts/geostat-js/widgets/c12_n_realisations.js
// -----------------------------------------------------------------------------
// Widget C12.4 — Effet du nombre de realisations.
// On affiche 1 realisation (réaliste, variable) vs la moyenne de N
// realisations (E-type, lisse). Quand N -> inf, E-type ≈ krigeage.
// -----------------------------------------------------------------------------
import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';
const debounce = (fn, ms = 600) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

export default class C12NRealisations extends Widget {
  render() {
    this.el.insertAdjacentHTML('beforeend', `
      <div class="gw-controls" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;">
        <label>Modèle <select class="js-mod">
          <option value="spherique">Sphérique</option><option value="exponentiel">Exponentiel</option><option value="gaussien">Gaussien</option>
        </select></label>
        <label>Portée a <input type="range" class="js-a" min="3" max="15" value="8" step="1" style="width:120px"><span class="js-av">8</span></label>
        <label>Grille N <input type="number" class="js-N" value="25" min="15" max="40" step="5" style="width:60px"></label>
        <label><b>nbsim</b> <input type="range" class="js-nbsim" min="1" max="40" value="10" step="1" style="width:120px"><span class="js-nbsimv">10</span></label>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px;">
        <div class="js-plot-1" style="height:340px"></div>
        <div class="js-plot-mean" style="height:340px"></div>
      </div>
      <div class="js-info" style="padding:.4rem 1rem;font-family:'JetBrains Mono',monospace;font-size:.8rem;color:#444;text-align:center;background:#f0f0f0;border-radius:6px;margin-top:4px;">—</div>
      <p style="margin:4px 1rem;font-size:11px;color:#666;">
        E-type = moyenne sur N réalisations. Avec N grand, E-type tend vers le krigeage (lisse).
        Une réalisation seule reproduit la variabilité spatiale (réaliste).</p>
    `);
    this.plot1 = this.el.querySelector('.js-plot-1');
    this.plotMean = this.el.querySelector('.js-plot-mean');
    this.infoEl = this.el.querySelector('.js-info');
    this.ctrl = {
      mod: this.el.querySelector('.js-mod'), a: this.el.querySelector('.js-a'),
      N: this.el.querySelector('.js-N'), nbsim: this.el.querySelector('.js-nbsim'),
    };
    this.seed = 42;
    const update = debounce(() => this.refresh(), 600);
    for (const [k, el] of Object.entries(this.ctrl)) {
      this.on(el, 'input', e => { const s = this.el.querySelector(`.js-${k}v`); if (s) s.textContent = e.target.value; });
      this.on(el, 'input', update); this.on(el, 'change', update);
    }
    afficherChargementJusquaPret(this.el).then(() => this.refresh());
  }

  async refresh() {
    const mod = this.ctrl.mod.value;
    const a = parseFloat(this.ctrl.a.value);
    const N = parseInt(this.ctrl.N.value, 10);
    const nbsim = parseInt(this.ctrl.nbsim.value, 10);

    let res, sim1;
    try {
      sim1 = await gpoly.simulerFFTMA(mod, a, 1.0, this.seed, N);
      res = await gpoly.simulerNRealisations(mod, a, 1.0, this.seed, N, nbsim, 'FFTMA');
    } catch (e) { this.afficherAvertissement('Erreur : ' + e.message); return; }

    const reshape = (flat) => { const M=[]; for (let j=0; j<N; j++) { const r=[]; for (let i=0; i<N; i++) r.push(flat[j*N+i]); M.push(r); } return M; };

    if (!window.Plotly) { this.afficherAvertissement('Plotly non chargé.'); return; }
    const allVals = [...sim1, ...res.e_type];
    const zMin = Math.min(...allVals), zMax = Math.max(...allVals);
    const layoutCommon = {
      margin: { t: 35, l: 30, r: 50, b: 30 },
      xaxis: { showticklabels: false, scaleanchor: 'y' },
      yaxis: { showticklabels: false },
    };
    Plotly.react(this.plot1, [{ type: 'heatmap', z: reshape(sim1), colorscale: 'Turbo', zmin: zMin, zmax: zMax, colorbar: { thickness: 10 } }],
      { ...layoutCommon, title: { text: '1 réalisation (réaliste)', font: { size: 12 } } },
      { displaylogo: false, responsive: true });
    Plotly.react(this.plotMean, [{ type: 'heatmap', z: reshape(res.e_type), colorscale: 'Turbo', zmin: zMin, zmax: zMax, colorbar: { thickness: 10 } }],
      { ...layoutCommon, title: { text: `E-type = moyenne de ${nbsim} réalisations`, font: { size: 12 } } },
      { displaylogo: false, responsive: true });

    // Statistiques déléguées à la librairie (statistiques_descriptives)
    const [s1, sMean] = await Promise.all([
      gpoly.statistiquesDescriptives(Array.from(sim1)),
      gpoly.statistiquesDescriptives(Array.from(res.e_type)),
    ]);
    this.infoEl.innerHTML =
      `Var(1 réalisation) = <b>${s1.variance.toFixed(3)}</b> ≈ palier (1.0) · ` +
      `Var(E-type avec N=${nbsim}) = <b>${sMean.variance.toFixed(3)}</b> < palier (lissage)`;
  }

  cleanup() {
    if (window.Plotly) {
      if (this.plot1) Plotly.purge(this.plot1);
      if (this.plotMean) Plotly.purge(this.plotMean);
    }
  }
}

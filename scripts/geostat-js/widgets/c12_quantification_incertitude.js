// scripts/geostat-js/widgets/c12_quantification_incertitude.js
// -----------------------------------------------------------------------------
// Widget C12.6 — Quantification d'incertitude par simulation.
// Pour chaque pixel : P(Z > cutoff) calculee a partir de N realisations.
// Comparaison conceptuelle avec le krigeage d'indicatrices (qui necessite
// le KI module — pour C11). Ici on reste sur l'approche simulation.
// -----------------------------------------------------------------------------
import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';
const debounce = (fn, ms = 800) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

export default class C12QuantificationIncertitude extends Widget {
  render() {
    this.el.insertAdjacentHTML('beforeend', `
      <div class="gw-controls" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;">
        <label>Modèle <select class="js-mod">
          <option value="spherique">Sphérique</option><option value="exponentiel">Exponentiel</option><option value="gaussien">Gaussien</option>
        </select></label>
        <label>Portée a <input type="range" class="js-a" min="3" max="12" value="6" step="1" style="width:120px"><span class="js-av">6</span></label>
        <label>Grille N <input type="number" class="js-N" value="22" min="15" max="30" step="2" style="width:60px"></label>
        <label>nbsim <input type="range" class="js-nbsim" min="10" max="50" value="20" step="5" style="width:120px"><span class="js-nbsimv">20</span></label>
        <label><b>Cutoff</b> <input type="range" class="js-cut" min="-2" max="2" value="0.5" step="0.1" style="width:140px"><span class="js-cutv">0.5</span></label>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px;">
        <div class="js-plot-etype" style="height:320px"></div>
        <div class="js-plot-proba" style="height:320px"></div>
      </div>
      <div class="js-info" style="padding:.4rem 1rem;font-family:'JetBrains Mono',monospace;font-size:.8rem;color:#444;text-align:center;background:#f0f0f0;border-radius:6px;margin-top:4px;">—</div>
      <p style="margin:4px 1rem;font-size:11px;color:#666;">
        P(Z > z_c) calculée par comptage sur les N réalisations. Avec N petit, les probas sont bruitées.
        Une décision minière basée sur P(Z > z_c) > 0.5 délimite les zones à exploiter.</p>
    `);
    this.plotE = this.el.querySelector('.js-plot-etype');
    this.plotP = this.el.querySelector('.js-plot-proba');
    this.infoEl = this.el.querySelector('.js-info');
    this.ctrl = { mod: this.el.querySelector('.js-mod'), a: this.el.querySelector('.js-a'),
                   N: this.el.querySelector('.js-N'), nbsim: this.el.querySelector('.js-nbsim'),
                   cut: this.el.querySelector('.js-cut') };
    this.seed = 11;
    const update = debounce(() => this.refresh(), 800);
    for (const [k, el] of Object.entries(this.ctrl)) {
      this.on(el, 'input', e => { const s = this.el.querySelector(`.js-${k}v`); if (s) s.textContent = e.target.value; });
      this.on(el, 'input', update); this.on(el, 'change', update);
    }
    afficherChargementJusquaPret(this.el).then(() => this.refresh());
  }

  async refresh() {
    const mod = this.ctrl.mod.value, a = parseFloat(this.ctrl.a.value);
    const N = parseInt(this.ctrl.N.value, 10), nbsim = parseInt(this.ctrl.nbsim.value, 10);
    const cut = parseFloat(this.ctrl.cut.value);
    let res, proba;
    try {
      res = await gpoly.simulerNRealisations(mod, a, 1.0, this.seed, N, nbsim, 'FFTMA');
      proba = await gpoly.probaExcede(mod, a, 1.0, this.seed, N, nbsim, cut, 'FFTMA');
    } catch (e) { this.afficherAvertissement('Erreur : ' + e.message); return; }

    const reshape = (flat) => { const M=[]; for (let j=0; j<N; j++) { const r=[]; for (let i=0; i<N; i++) r.push(flat[j*N+i]); M.push(r); } return M; };

    if (!window.Plotly) { this.afficherAvertissement('Plotly non chargé.'); return; }
    const layoutCommon = {
      margin: { t: 35, l: 30, r: 50, b: 30 },
      xaxis: { showticklabels: false, scaleanchor: 'y' },
      yaxis: { showticklabels: false },
    };
    Plotly.react(this.plotE, [{ type: 'heatmap', z: reshape(res.e_type), colorscale: 'Turbo', colorbar: { thickness: 10 } }],
      { ...layoutCommon, title: { text: `E-type (Z moyenne)`, font: { size: 12 } } },
      { displaylogo: false, responsive: true });
    Plotly.react(this.plotP, [{ type: 'heatmap', z: reshape(proba.proba_excede),
        colorscale: [[0,'#0d2855'],[0.5,'#fff'],[1,'#a40000']], zmin: 0, zmax: 1, colorbar: { thickness: 10, title: 'P' } }],
      { ...layoutCommon, title: { text: `P(Z > ${cut.toFixed(1)}) sur ${nbsim} sim.`, font: { size: 12 } } },
      { displaylogo: false, responsive: true });

    // Stat globale : proportion de pixels avec P > 0.5
    const surface_minable = proba.proba_excede.filter(p => p > 0.5).length / (N*N) * 100;
    this.infoEl.innerHTML =
      `Cutoff = <b>${cut.toFixed(2)}</b> · Pixels avec P(Z > z_c) > 0.5 : <b>${surface_minable.toFixed(1)} %</b> de la surface`;
  }

  cleanup() {
    if (window.Plotly) { if (this.plotE) Plotly.purge(this.plotE); if (this.plotP) Plotly.purge(this.plotP); }
  }
}

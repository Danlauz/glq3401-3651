// scripts/geostat-js/widgets/c12_conditionnement.js
// -----------------------------------------------------------------------------
// Widget C12.2 — Post-conditionnement par krigeage.
// Pipeline pedagogique :
//   1. Z_NC : simulation non conditionnelle (LU)
//   2. Z_NC,obs : valeurs de Z_NC AUX positions des donnees
//   3. Z*_obs = krigeage des observations vraies Z_obs
//   4. Z*_NC = krigeage de Z_NC,obs
//   5. Z_C = Z_NC + (Z*_obs - Z*_NC) : simulation CONDITIONNELLE
//
// Toutes les cartes sont affichees pour visualiser chaque etape.
// -----------------------------------------------------------------------------
import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';
const debounce = (fn, ms = 400) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

export default class C12Conditionnement extends Widget {
  render() {
    this.el.insertAdjacentHTML('beforeend', `
      <div class="gw-controls" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;">
        <label>Modèle <select class="js-mod">
          <option value="spherique">Sphérique</option><option value="exponentiel">Exponentiel</option><option value="gaussien">Gaussien</option>
        </select></label>
        <label>Portée a <input type="range" class="js-a" min="3" max="15" value="6" step="1" style="width:120px"><span class="js-av">6</span></label>
        <label>Grille N <input type="range" class="js-N" min="20" max="40" value="25" step="2" style="width:100px"><span class="js-Nv">25</span></label>
        <button class="js-regen" type="button" style="font-size:.76rem;padding:3px 8px;background:#3a3632;color:#fff;border:none;border-radius:4px;cursor:pointer;">Resim</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:6px;">
        <div class="js-plot-nc" style="height:280px"></div>
        <div class="js-plot-ko" style="height:280px"></div>
        <div class="js-plot-cond" style="height:280px"></div>
      </div>
      <div class="js-info" style="padding:.4rem 1rem;font-family:'JetBrains Mono',monospace;font-size:.8rem;color:#444;text-align:center;background:#f0f0f0;border-radius:6px;margin-top:4px;">—</div>
      <p style="margin:4px 1rem;font-size:11px;color:#666;">
        Z_conditionnelle = Z_NC + (Z*_obs − Z*_NC) où Z*_obs est le krigeage des données réelles
        et Z*_NC est le krigeage de Z_NC évalué aux mêmes positions.</p>
    `);
    this.plotNC = this.el.querySelector('.js-plot-nc');
    this.plotKO = this.el.querySelector('.js-plot-ko');
    this.plotCond = this.el.querySelector('.js-plot-cond');
    this.infoEl = this.el.querySelector('.js-info');
    this.ctrl = {
      mod: this.el.querySelector('.js-mod'), a: this.el.querySelector('.js-a'), N: this.el.querySelector('.js-N'),
    };
    this.seed = 7;
    const update = debounce(() => this.refresh(), 500);
    for (const [k, el] of Object.entries(this.ctrl)) {
      this.on(el, 'input', e => { const s = this.el.querySelector(`.js-${k}v`); if (s) s.textContent = e.target.value; });
      this.on(el, 'input', update); this.on(el, 'change', update);
    }
    this.on(this.el.querySelector('.js-regen'), 'click', () => { this.seed++; this.refresh(); });
    afficherChargementJusquaPret(this.el).then(() => this.refresh());
  }

  async refresh() {
    const mod = this.ctrl.mod.value;
    const a = parseFloat(this.ctrl.a.value);
    const N = parseInt(this.ctrl.N.value, 10);

    // 1. Generer un champ "verite" cache (FFT-MA) puis echantillonner 8 points
    let z_vrai, sNC;
    try {
      z_vrai = await gpoly.simulerFFTMA(mod, a, 1.0, this.seed * 100, N);
      sNC = await gpoly.simulerFFTMA(mod, a, 1.0, this.seed, N);
    } catch (e) { this.afficherAvertissement('Erreur : ' + e.message); return; }

    // Tirer 8 positions au hasard
    let s = (this.seed * 1664525 + 1013904223) >>> 0;
    const rng = () => { s = (s * 1664525 + 1013904223) | 0; return ((s >>> 0) / 4294967296); };
    const npts = 8;
    const positions = new Set();
    while (positions.size < npts) positions.add(Math.floor(rng() * N * N));
    const xd = [], zd_vrai = [], zd_NC = [];
    for (const idx of positions) {
      const y = Math.floor(idx / N), x = idx - y * N;
      xd.push([x, y]); zd_vrai.push(z_vrai[idx]); zd_NC.push(sNC[idx]);
    }

    // 2. Krigeage des observations vraies
    const cibles = [];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) cibles.push([i, j]);
    const structs = [{ modele: mod, portee: a, palier: 1.0 }];
    let r_KO_vrai, r_KO_NC;
    try {
      r_KO_vrai = await gpoly.krigeageOrdinaire(xd, zd_vrai, cibles, structs);
      r_KO_NC = await gpoly.krigeageOrdinaire(xd, zd_NC, cibles, structs);
    } catch (e) { this.afficherAvertissement('Erreur krigeage : ' + e.message); return; }

    // 3. Conditionnement
    const z_cond = sNC.map((v, k) => v + (r_KO_vrai.estimations[k] - r_KO_NC.estimations[k]));

    const reshape = (flat) => {
      const M = []; for (let j = 0; j < N; j++) {
        const r = []; for (let i = 0; i < N; i++) r.push(flat[j * N + i]); M.push(r);
      }
      return M;
    };
    const sNC_M = reshape(sNC), ko_M = reshape(r_KO_vrai.estimations), cond_M = reshape(z_cond);

    if (!window.Plotly) { this.afficherAvertissement('Plotly non chargé.'); return; }
    const layoutCommon = {
      margin: { t: 35, l: 30, r: 50, b: 30 },
      xaxis: { showticklabels: false, scaleanchor: 'y' },
      yaxis: { showticklabels: false },
    };
    const allVals = [...sNC, ...r_KO_vrai.estimations, ...z_cond];
    const zMin = Math.min(...allVals), zMax = Math.max(...allVals);
    const ptsMark = { x: xd.map(p => p[0]), y: xd.map(p => p[1]), mode: 'markers',
                      marker: { color: '#fff', size: 7, line: { color: '#000', width: 1.5 } }, showlegend: false };

    Plotly.react(this.plotNC, [{ type: 'heatmap', z: sNC_M, colorscale: 'Turbo', zmin: zMin, zmax: zMax, colorbar: { thickness: 8 } }, ptsMark],
      { ...layoutCommon, title: { text: '1. Simulation NON conditionnelle', font: { size: 11 } } },
      { displaylogo: false, responsive: true });
    Plotly.react(this.plotKO, [{ type: 'heatmap', z: ko_M, colorscale: 'Turbo', zmin: zMin, zmax: zMax, colorbar: { thickness: 8 } }, ptsMark],
      { ...layoutCommon, title: { text: '2. Krigeage des observations', font: { size: 11 } } },
      { displaylogo: false, responsive: true });
    Plotly.react(this.plotCond, [{ type: 'heatmap', z: cond_M, colorscale: 'Turbo', zmin: zMin, zmax: zMax, colorbar: { thickness: 8 } }, ptsMark],
      { ...layoutCommon, title: { text: '3. Simulation CONDITIONNELLE', font: { size: 11 } } },
      { displaylogo: false, responsive: true });

    // Verification : la simulation conditionnelle reproduit-elle les observations ?
    let max_err = 0;
    for (let k = 0; k < xd.length; k++) {
      const idx = xd[k][1] * N + xd[k][0];
      max_err = Math.max(max_err, Math.abs(z_cond[idx] - zd_vrai[k]));
    }
    this.infoEl.innerHTML =
      `Erreur max aux points conditionnants : <b>${max_err.toFixed(5)}</b> (≈ 0 attendu : Z_C(x_α) = Z_obs(x_α))`;
  }

  cleanup() {
    if (window.Plotly) {
      [this.plotNC, this.plotKO, this.plotCond].forEach(p => { if (p) Plotly.purge(p); });
    }
  }
}

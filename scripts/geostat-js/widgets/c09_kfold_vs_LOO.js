// scripts/geostat-js/widgets/c09_kfold_vs_LOO.js
// -----------------------------------------------------------------------------
// Widget — Validation croisee k-fold vs LOO.
// LOO : Leave-One-Out (n folds). k-fold : on divise les donnees en k groupes
// disjoints et on krige chaque groupe a partir des autres. On compare les
// statistiques de diagnostic (moy(e^s), var(e^s)) entre les deux methodes.
// k-fold est BIEN PLUS RAPIDE pour de gros jeux mais legerement biaise.
// -----------------------------------------------------------------------------
import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';
const debounce = (fn, ms = 400) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

export default class C09KFoldVsLOO extends Widget {
  render() {
    this.el.insertAdjacentHTML('beforeend', `
      <div class="gw-controls" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;">
        <label>Modèle <select class="js-mod">
          <option value="spherique">Sphérique</option><option value="exponentiel">Exponentiel</option><option value="gaussien">Gaussien</option>
        </select></label>
        <label>Portée a <input type="range" class="js-a" min="3" max="20" value="8" step="1" style="width:120px"><span class="js-av">8</span></label>
        <label>N forages <input type="range" class="js-n" min="20" max="80" value="40" step="5" style="width:120px"><span class="js-nv">40</span></label>
        <label><b>k (k-fold)</b> <input type="range" class="js-k" min="2" max="20" value="5" step="1" style="width:120px"><span class="js-kv">5</span></label>
        <button class="js-regen" type="button" style="font-size:.76rem;padding:3px 8px;background:#3a3632;color:#fff;border:none;border-radius:4px;cursor:pointer;">Resim</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px;">
        <div class="js-plot-loo" style="height:340px"></div>
        <div class="js-plot-kfold" style="height:340px"></div>
      </div>
      <div class="js-info" style="padding:.5rem 1rem;font-family:'JetBrains Mono',monospace;font-size:.85rem;color:#444;text-align:center;background:#eef2e8;border:1px solid #b8c8a8;border-radius:6px;margin-top:4px;">—</div>
      <p style="margin:4px 1rem;font-size:11px;color:#666;">
        LOO : le « gold standard ». k-fold : approximation pour gros jeux de données (n folds → 1 fold).
        Convergent quand k → n. k-fold = 5-10 est un bon compromis vitesse/qualité.</p>
    `);
    this.plotLoo = this.el.querySelector('.js-plot-loo');
    this.plotKf = this.el.querySelector('.js-plot-kfold');
    this.infoEl = this.el.querySelector('.js-info');
    this.ctrl = { mod: this.el.querySelector('.js-mod'), a: this.el.querySelector('.js-a'),
                   n: this.el.querySelector('.js-n'), k: this.el.querySelector('.js-k') };
    this.seed = 23;
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
    const npts = parseInt(this.ctrl.n.value, 10);
    const kFolds = parseInt(this.ctrl.k.value, 10);
    const Ngrid = 30;

    // Champ vrai + echantillonnage
    let champ;
    try { champ = await gpoly.simulerFFTMA(mod, a, 1.0, this.seed, Ngrid); }
    catch (e) { this.afficherAvertissement('Erreur : ' + e.message); return; }
    let s = (this.seed * 2654435761) >>> 0;
    const rng = () => { s = (s * 1664525 + 1013904223) | 0; return ((s >>> 0) / 4294967296); };
    const choisi = new Set();
    while (choisi.size < npts) choisi.add(Math.floor(rng() * Ngrid * Ngrid));
    const coords = [], vals = [];
    for (const idx of choisi) {
      const y = Math.floor(idx / Ngrid), x = idx - y * Ngrid;
      coords.push([x, y]); vals.push(champ[idx]);
    }
    const structs = [{ modele: mod, portee: a, palier: 1.0 }];

    // LOO via gpoly.validationCroisee
    let r_loo;
    try { r_loo = await gpoly.validationCroisee(coords, vals, structs, 0, 'ordinaire'); }
    catch (e) { this.afficherAvertissement('Erreur LOO : ' + e.message); return; }

    // k-fold : on permute aleatoirement les indices, on cree kFolds groupes
    const idx_perm = Array.from({length: npts}, (_, i) => i);
    for (let i = npts - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [idx_perm[i], idx_perm[j]] = [idx_perm[j], idx_perm[i]];
    }
    const foldSize = Math.ceil(npts / kFolds);
    const kfoldEst = new Array(npts).fill(NaN);
    const kfoldVar = new Array(npts).fill(NaN);
    for (let f = 0; f < kFolds; f++) {
      const test_idx = idx_perm.slice(f * foldSize, (f + 1) * foldSize);
      const train_idx = idx_perm.filter(i => !test_idx.includes(i));
      if (train_idx.length < 3) continue;
      const train_coords = train_idx.map(i => coords[i]);
      const train_vals = train_idx.map(i => vals[i]);
      const test_coords = test_idx.map(i => coords[i]);
      try {
        const r = await gpoly.krigeageOrdinaire(train_coords, train_vals, test_coords, structs, 0);
        for (let j = 0; j < test_idx.length; j++) {
          kfoldEst[test_idx[j]] = r.estimations[j];
          kfoldVar[test_idx[j]] = r.variances[j];
        }
      } catch (e) {}
    }
    // Stats k-fold
    let sum_es = 0, sum_es2 = 0, n_valid = 0;
    const errors_std = [];
    for (let i = 0; i < npts; i++) {
      if (!isFinite(kfoldEst[i]) || !isFinite(kfoldVar[i]) || kfoldVar[i] < 1e-9) continue;
      const e_i = vals[i] - kfoldEst[i];
      const sigma_i = Math.sqrt(kfoldVar[i]);
      const e_s = e_i / sigma_i;
      errors_std.push(e_s);
      sum_es += e_s; sum_es2 += e_s * e_s; n_valid++;
    }
    const moy_es_kfold = n_valid > 0 ? sum_es / n_valid : 0;
    const var_es_kfold = n_valid > 1 ? (sum_es2 - n_valid * moy_es_kfold * moy_es_kfold) / (n_valid - 1) : 0;

    if (!window.Plotly) return;
    const zmin = Math.min(...vals), zmax = Math.max(...vals);
    Plotly.react(this.plotLoo, [
      { x: r_loo.estimations, y: r_loo.observees, mode: 'markers',
        marker: { color: '#0d4d92', size: 8, line: { color: '#fff', width: 1 } }, name: 'LOO' },
      { x: [zmin, zmax], y: [zmin, zmax], mode: 'lines',
        line: { color: '#c43a3a', dash: 'dash' }, name: 'y = x' },
    ], {
      margin: { t: 35, l: 50, r: 20, b: 50 },
      xaxis: { title: 'Z* (LOO)' }, yaxis: { title: 'Z observé', scaleanchor: 'x' },
      title: { text: `LOO (n folds = ${npts}) · moy=${r_loo.moyenne_e_std.toFixed(3)}, var=${r_loo.var_e_std.toFixed(3)}`, font: { size: 11 } },
      legend: { orientation: 'h', y: -0.18, x: 0.5, xanchor: 'center', font: { size: 10 } },
    }, { displaylogo: false, responsive: true });

    Plotly.react(this.plotKf, [
      { x: kfoldEst.filter(v => isFinite(v)), y: vals.filter((_, i) => isFinite(kfoldEst[i])),
        mode: 'markers', marker: { color: '#ea580c', size: 8, line: { color: '#fff', width: 1 } }, name: `k-fold (k=${kFolds})` },
      { x: [zmin, zmax], y: [zmin, zmax], mode: 'lines',
        line: { color: '#c43a3a', dash: 'dash' }, name: 'y = x' },
    ], {
      margin: { t: 35, l: 50, r: 20, b: 50 },
      xaxis: { title: 'Z* (k-fold)' }, yaxis: { title: 'Z observé', scaleanchor: 'x' },
      title: { text: `k-fold (k=${kFolds}) · moy=${moy_es_kfold.toFixed(3)}, var=${var_es_kfold.toFixed(3)}`, font: { size: 11 } },
      legend: { orientation: 'h', y: -0.18, x: 0.5, xanchor: 'center', font: { size: 10 } },
    }, { displaylogo: false, responsive: true });

    this.infoEl.innerHTML =
      `LOO : moy(eˢ) = <b>${r_loo.moyenne_e_std.toFixed(3)}</b>, var(eˢ) = <b>${r_loo.var_e_std.toFixed(3)}</b> ` +
      `· ${kFolds}-fold : moy = <b>${moy_es_kfold.toFixed(3)}</b>, var = <b>${var_es_kfold.toFixed(3)}</b> ` +
      `· Avec ${kFolds} folds : ${kFolds} krigeages au lieu de ${npts} (${Math.round(npts/kFolds)}× plus rapide)`;
  }

  cleanup() {
    if (window.Plotly) {
      if (this.plotLoo) Plotly.purge(this.plotLoo);
      if (this.plotKf) Plotly.purge(this.plotKf);
    }
  }
}

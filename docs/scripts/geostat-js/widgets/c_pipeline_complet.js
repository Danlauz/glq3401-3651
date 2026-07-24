// scripts/geostat-js/widgets/c_pipeline_complet.js
// -----------------------------------------------------------------------------
// Widget « PIPELINE COMPLET » — Fil rouge de la geostatistique appliquee.
//
// 5 onglets sequentiels :
//   1. Données : carte des forages + tableau + histogramme
//   2. Variogramme : empirique + ajustement manuel (mode, portee, palier, pepite)
//   3. Krigeage : carte Z* + carte sigma^2_K
//   4. Simulation : carte E-type + P(Z > coupure)
//   5. Décision : tonnage / teneur / metal recuperable avec P10-P50-P90
//
// Toutes les etapes partagent un meme JEU DE DONNEES synthétique et un meme
// modele de variogramme. L'utilisateur navigue de gauche à droite : du brut a
// la decision miniere. Cet atelier est le SYNTHESE de tout le cours.
// -----------------------------------------------------------------------------
import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';
const debounce = (fn, ms = 400) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

export default class CPipelineComplet extends Widget {
  render() {
    this.N = 25;
    this.donnees = null;
    this.varioExp = null;
    this.modelParams = { mod: 'spherique', a: 7, c: 1.0, c0: 0.1 };
    this.cutoff = 5;
    this.seed = 7;

    this.el.insertAdjacentHTML('beforeend', `
      <div style="display:flex;gap:4px;border-bottom:2px solid #ddd;margin-bottom:8px;">
        <button class="js-tab" data-tab="1" style="flex:1;padding:8px 4px;background:#0d4d92;color:#fff;border:none;cursor:pointer;font-size:.82rem;font-weight:700;">1. Données</button>
        <button class="js-tab" data-tab="2" style="flex:1;padding:8px 4px;background:#eee;color:#333;border:none;cursor:pointer;font-size:.82rem;">2. Variogramme</button>
        <button class="js-tab" data-tab="3" style="flex:1;padding:8px 4px;background:#eee;color:#333;border:none;cursor:pointer;font-size:.82rem;">3. Krigeage</button>
        <button class="js-tab" data-tab="4" style="flex:1;padding:8px 4px;background:#eee;color:#333;border:none;cursor:pointer;font-size:.82rem;">4. Simulation</button>
        <button class="js-tab" data-tab="5" style="flex:1;padding:8px 4px;background:#eee;color:#333;border:none;cursor:pointer;font-size:.82rem;">5. Décision</button>
      </div>
      <div class="js-panels"></div>
      <div class="js-shared-info" style="padding:.4rem 1rem;font-family:'JetBrains Mono',monospace;font-size:.8rem;color:#444;text-align:center;background:#eef2e8;border:1px solid #b8c8a8;border-radius:6px;margin-top:6px;">Chargement…</div>
    `);
    this.panelsEl = this.el.querySelector('.js-panels');
    this.infoEl = this.el.querySelector('.js-shared-info');

    // Tabs
    this.tabs = Array.from(this.el.querySelectorAll('.js-tab'));
    this.tabs.forEach(t => {
      this.on(t, 'click', () => this.switchTab(parseInt(t.dataset.tab, 10)));
    });
    this.currentTab = 1;

    afficherChargementJusquaPret(this.el).then(() => this.genererDonnees());
  }

  async genererDonnees() {
    const N = this.N;
    // Champ vérité : portée vraie 7, palier 1, pepite 0.1
    let champ;
    try {
      champ = await gpoly.simulerFFTMA('spherique', 7, 1.0, this.seed, N);
    } catch (e) { this.afficherAvertissement('Erreur : ' + e.message); return; }
    // Echantillonner 30 forages
    let s = (this.seed * 2654435761) >>> 0;
    const rng = () => { s = (s * 1664525 + 1013904223) | 0; return ((s >>> 0) / 4294967296); };
    const choisi = new Set();
    while (choisi.size < 30) choisi.add(Math.floor(rng() * N * N));
    const coords = [], vals = [];
    for (const idx of choisi) {
      const y = Math.floor(idx / N), x = idx - y * N;
      coords.push([x, y]); vals.push(champ[idx] + 5); // offset moyenne pour valeurs positives
    }
    this.donnees = { coords, vals, champ_vrai: Array.from(champ).map(v => v + 5) };
    // Variogramme empirique
    try {
      this.varioExp = await gpoly.variogrammeScatter(coords, vals, 10);
    } catch (e) { this.afficherAvertissement('Erreur vario : ' + e.message); return; }
    this.renderPanel();
  }

  switchTab(n) {
    this.currentTab = n;
    this.tabs.forEach(t => {
      const active = parseInt(t.dataset.tab, 10) === n;
      t.style.background = active ? '#0d4d92' : '#eee';
      t.style.color = active ? '#fff' : '#333';
      t.style.fontWeight = active ? '700' : 'normal';
    });
    this.renderPanel();
  }

  renderPanel() {
    if (!this.donnees) return;
    this.panelsEl.innerHTML = '';
    switch (this.currentTab) {
      case 1: this.renderEtape1Donnees(); break;
      case 2: this.renderEtape2Variogramme(); break;
      case 3: this.renderEtape3Krigeage(); break;
      case 4: this.renderEtape4Simulation(); break;
      case 5: this.renderEtape5Decision(); break;
    }
  }

  async renderEtape1Donnees() {
    this.panelsEl.innerHTML = `
      <div style="display:grid;grid-template-columns:1.5fr 1fr;gap:8px;">
        <div class="js-plot-carte" style="height:360px"></div>
        <div class="js-plot-hist" style="height:360px"></div>
      </div>`;
    const carte = this.panelsEl.querySelector('.js-plot-carte');
    const hist = this.panelsEl.querySelector('.js-plot-hist');
    if (!window.Plotly) return;
    const { coords, vals } = this.donnees;
    const xs = coords.map(c => c[0]), ys = coords.map(c => c[1]);
    Plotly.react(carte, [
      { x: xs, y: ys, mode: 'markers', marker: { color: vals, colorscale: 'Turbo', size: 12, line: { color: '#000', width: 1 }, colorbar: { thickness: 10 } },
        text: vals.map(v => v.toFixed(2)), hoverinfo: 'text' },
    ], {
      margin: { t: 35, l: 40, r: 50, b: 40 },
      xaxis: { range: [-1, this.N], title: 'X', scaleanchor: 'y' }, yaxis: { range: [-1, this.N], title: 'Y' },
      title: { text: `Étape 1 : ${vals.length} forages échantillonnés`, font: { size: 12 } },
    }, { displaylogo: false, responsive: true });

    // Histogramme
    const h = await gpoly.histogramme(vals, 15);
    const centres = h.bords.slice(0, -1).map((b, i) => 0.5 * (b + h.bords[i + 1]));
    Plotly.react(hist, [{ type: 'bar', x: centres, y: h.comptes, marker: { color: '#0d4d92', opacity: 0.7 } }], {
      margin: { t: 35, l: 50, r: 20, b: 50 },
      xaxis: { title: 'Z' }, yaxis: { title: 'Compte' },
      title: { text: 'Distribution des teneurs', font: { size: 12 } },
    }, { displaylogo: false, responsive: true });

    const stats = await gpoly.statistiquesDescriptives(vals);
    this.infoEl.innerHTML =
      `n = ${stats.n} · moyenne = <b>${stats.moyenne.toFixed(2)}</b> · σ = ${stats.ecart_type.toFixed(2)} · ` +
      `min = ${stats.minimum.toFixed(2)} · max = ${stats.maximum.toFixed(2)} → <i>passez à l'étape 2 : variogramme</i>`;
  }

  async renderEtape2Variogramme() {
    this.panelsEl.innerHTML = `
      <div class="gw-controls" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;">
        <label>Modèle <select class="js-mod">
          <option value="spherique" selected>Sphérique</option><option value="exponentiel">Exponentiel</option><option value="gaussien">Gaussien</option>
        </select></label>
        <label>Portée <input type="range" class="js-a" min="3" max="20" value="${this.modelParams.a}" step="1" style="width:120px"><span class="js-av">${this.modelParams.a}</span></label>
        <label>Palier <input type="range" class="js-c" min="0.3" max="3" value="${this.modelParams.c}" step="0.05" style="width:120px"><span class="js-cv">${this.modelParams.c}</span></label>
        <label>Pépite <input type="range" class="js-c0" min="0" max="0.5" value="${this.modelParams.c0}" step="0.02" style="width:120px"><span class="js-c0v">${this.modelParams.c0}</span></label>
      </div>
      <div class="js-plot-vario" style="height:360px;margin-top:6px;"></div>`;
    const plot = this.panelsEl.querySelector('.js-plot-vario');
    const ctrls = {
      mod: this.panelsEl.querySelector('.js-mod'), a: this.panelsEl.querySelector('.js-a'),
      c: this.panelsEl.querySelector('.js-c'), c0: this.panelsEl.querySelector('.js-c0'),
    };
    const updateModel = debounce(async () => {
      this.modelParams.mod = ctrls.mod.value;
      this.modelParams.a = parseFloat(ctrls.a.value);
      this.modelParams.c = parseFloat(ctrls.c.value);
      this.modelParams.c0 = parseFloat(ctrls.c0.value);
      await this.tracerVariogramme(plot);
    }, 200);
    for (const [k, el] of Object.entries(ctrls)) {
      this.on(el, 'input', e => { const s = this.panelsEl.querySelector(`.js-${k}v`); if (s) s.textContent = e.target.value; });
      this.on(el, 'input', updateModel); this.on(el, 'change', updateModel);
    }
    await this.tracerVariogramme(plot);
  }

  async tracerVariogramme(plot) {
    const { mod, a, c, c0 } = this.modelParams;
    const h_max = Math.max(...this.varioExp.h) * 1.1;
    const lags = []; for (let i = 0; i <= 50; i++) lags.push(i * h_max / 50);
    const gTheo = Array.from(await gpoly.variogrammeTheorique(mod, lags, a, c)).map((v, i) => v + (lags[i] > 0 ? c0 : 0));
    if (!window.Plotly) return;
    Plotly.react(plot, [
      { x: this.varioExp.h, y: this.varioExp.gamma, mode: 'markers',
        marker: { color: '#c43a3a', size: 10, symbol: 'diamond' }, name: 'γ̂(h) empirique' },
      { x: lags, y: gTheo, mode: 'lines', line: { color: '#0d4d92', width: 2.5 }, name: 'γ(h) ajusté' },
    ], {
      margin: { t: 35, l: 50, r: 20, b: 50 },
      xaxis: { title: 'h' }, yaxis: { title: 'γ(h)', rangemode: 'tozero' },
      title: { text: `Étape 2 : ajustement (${mod}, a=${a}, C=${c}, c₀=${c0})`, font: { size: 12 } },
      legend: { orientation: 'h', y: -0.18, x: 0.5, xanchor: 'center', font: { size: 10 } },
    }, { displaylogo: false, responsive: true });
    this.infoEl.innerHTML = `Variogramme ajusté manuellement. Ajustez les sliders puis passez à l'étape 3 : <i>krigeage</i>.`;
  }

  async renderEtape3Krigeage() {
    this.panelsEl.innerHTML = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
      <div class="js-plot-est" style="height:380px"></div>
      <div class="js-plot-var" style="height:380px"></div></div>`;
    const plotEst = this.panelsEl.querySelector('.js-plot-est');
    const plotVar = this.panelsEl.querySelector('.js-plot-var');
    const { mod, a, c, c0 } = this.modelParams;
    const structs = [{ modele: mod, portee: a, palier: c }];
    const N = this.N;
    const cibles = [];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) cibles.push([i, j]);
    let r;
    try {
      r = await gpoly.krigeageOrdinaire(this.donnees.coords, this.donnees.vals, cibles, structs, c0);
    } catch (e) { this.afficherAvertissement('Erreur : ' + e.message); return; }
    const reshape = (flat) => { const M=[]; for (let j=0; j<N; j++) { const ro=[]; for (let i=0; i<N; i++) ro.push(flat[j*N+i]); M.push(ro); } return M; };
    if (!window.Plotly) return;
    const ptsTrace = { x: this.donnees.coords.map(p=>p[0]), y: this.donnees.coords.map(p=>p[1]), mode: 'markers',
                       marker: { color: '#fff', size: 7, line: { color: '#000', width: 1 } }, showlegend: false };
    const layoutCommon = (title) => ({
      margin: { t: 35, l: 30, r: 50, b: 30 },
      xaxis: { range: [-0.5, N-0.5], showticklabels: false, scaleanchor: 'y' },
      yaxis: { range: [-0.5, N-0.5], showticklabels: false, autorange: 'reversed' },
      title: { text: title, font: { size: 12 } },
    });
    Plotly.react(plotEst, [
      { type: 'heatmap', z: reshape(r.estimations), colorscale: 'Turbo', colorbar: { thickness: 10 } }, ptsTrace,
    ], layoutCommon(`Z* (KO, ${mod}, a=${a})`), { displaylogo: false, responsive: true });
    Plotly.react(plotVar, [
      { type: 'heatmap', z: reshape(r.variances.map(v => Math.max(0, v))), colorscale: 'Hot', colorbar: { thickness: 10 } }, ptsTrace,
    ], layoutCommon('σ²_K (variance)'), { displaylogo: false, responsive: true });

    const meanVar = r.variances.filter(v => isFinite(v) && v >= 0).reduce((s,v)=>s+v,0) / r.variances.length;
    this.infoEl.innerHTML = `Krigeage ordinaire : carte d'estimation + carte de variance. σ̄²_K = ${meanVar.toFixed(3)}. Passez à l'étape 4 pour <i>quantifier l'incertitude</i>.`;
  }

  async renderEtape4Simulation() {
    this.panelsEl.innerHTML = `<div class="gw-controls" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;">
      <label>Cutoff <input type="range" class="js-cut" min="3" max="8" value="${this.cutoff}" step="0.2" style="width:200px"><span class="js-cutv">${this.cutoff.toFixed(1)}</span></label>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px;">
      <div class="js-plot-etype" style="height:340px"></div>
      <div class="js-plot-proba" style="height:340px"></div></div>`;
    const cutCtrl = this.panelsEl.querySelector('.js-cut');
    const plotE = this.panelsEl.querySelector('.js-plot-etype');
    const plotP = this.panelsEl.querySelector('.js-plot-proba');
    const update = debounce(async () => {
      this.cutoff = parseFloat(cutCtrl.value);
      await this.tracerEtape4(plotE, plotP);
    }, 400);
    this.on(cutCtrl, 'input', e => { this.panelsEl.querySelector('.js-cutv').textContent = parseFloat(e.target.value).toFixed(1); });
    this.on(cutCtrl, 'input', update);
    await this.tracerEtape4(plotE, plotP);
  }

  async tracerEtape4(plotE, plotP) {
    const { mod, a, c } = this.modelParams;
    const N = this.N;
    let res, proba;
    try {
      res = await gpoly.simulerNRealisations(mod, a, c, this.seed, N, 20, 'FFTMA');
      // Ajout moyenne (les sim ont moyenne 0)
      const e_type_shifted = res.e_type.map(v => v + 5);
      // Proba P(Z > cutoff) = P(Z_sim > cutoff - 5)
      proba = await gpoly.probaExcede(mod, a, c, this.seed, N, 20, this.cutoff - 5, 'FFTMA');
      this._lastEtype = e_type_shifted;
      this._lastProba = proba.proba_excede;
    } catch (e) { this.afficherAvertissement('Erreur : ' + e.message); return; }
    const reshape = (flat) => { const M=[]; for (let j=0; j<N; j++) { const ro=[]; for (let i=0; i<N; i++) ro.push(flat[j*N+i]); M.push(ro); } return M; };
    if (!window.Plotly) return;
    const layoutCommon = (title) => ({
      margin: { t: 35, l: 30, r: 50, b: 30 },
      xaxis: { showticklabels: false, scaleanchor: 'y' }, yaxis: { showticklabels: false, autorange: 'reversed' },
      title: { text: title, font: { size: 12 } },
    });
    Plotly.react(plotE, [{ type: 'heatmap', z: reshape(this._lastEtype), colorscale: 'Turbo', colorbar: { thickness: 10 } }],
      layoutCommon('E-type (moyenne de 20 simulations)'), { displaylogo: false, responsive: true });
    Plotly.react(plotP, [{ type: 'heatmap', z: reshape(this._lastProba), colorscale: [[0,'#0d2855'],[0.5,'#fff'],[1,'#a40000']], zmin: 0, zmax: 1, colorbar: { thickness: 10 } }],
      layoutCommon(`P(Z > ${this.cutoff.toFixed(1)})`), { displaylogo: false, responsive: true });
    const surface_minable = this._lastProba.filter(p => p > 0.5).length / (N*N) * 100;
    this.infoEl.innerHTML = `À cutoff ${this.cutoff.toFixed(1)} : surface minable (P > 0.5) = <b>${surface_minable.toFixed(1)} %</b>. Passez à l'étape 5 : <i>décision</i>.`;
  }

  async renderEtape5Decision() {
    this.panelsEl.innerHTML = '<div class="js-plot-Q" style="height:400px"></div>';
    const plotQ = this.panelsEl.querySelector('.js-plot-Q');
    const { mod, a, c } = this.modelParams;
    const N = this.N;
    let res;
    try {
      res = await gpoly.simulerNRealisations(mod, a, c, this.seed, N, 30, 'FFTMA');
    } catch (e) { this.afficherAvertissement('Erreur : ' + e.message); return; }
    const realisations = [];
    for (let s = 0; s < 30; s++) {
      const real = [];
      for (let k = 0; k < N * N; k++) real.push(res.realisations_flat[s * N * N + k] + 5);
      realisations.push(real);
    }
    const flatAll = []; realisations.forEach(r => r.forEach(v => flatAll.push(v)));
    const zmin = Math.min(...flatAll), zmax = Math.max(...flatAll);
    const coupures = []; for (let k = 0; k < 20; k++) coupures.push(zmin + (zmax - zmin) * (k + 0.5) / 20);
    const Q_par_sim = realisations.map(real => coupures.map(zc => {
      const above = real.filter(v => v > zc);
      const T = above.length / real.length;
      const q = above.length > 0 ? above.reduce((s,v)=>s+v,0)/above.length : 0;
      return T * q;
    }));
    // Quantiles délégués à la librairie geostat_polymtl
    const P10 = [], P50 = [], P90 = [];
    for (let k = 0; k < coupures.length; k++) {
      const vals = Q_par_sim.map(s => s[k]);
      const q = await gpoly.quantiles(vals, [0.10, 0.50, 0.90]);
      P10.push(q[0]); P50.push(q[1]); P90.push(q[2]);
    }
    if (!window.Plotly) return;
    Plotly.react(plotQ, [
      { x: coupures, y: P90, mode: 'lines', line: { color: 'rgb(22,163,74)', width: 0 }, showlegend: false, hoverinfo: 'skip' },
      { x: coupures, y: P10, mode: 'lines', line: { color: 'rgb(22,163,74)', width: 0 }, fill: 'tonexty', fillcolor: 'rgba(22,163,74,0.18)', name: 'Bande P10-P90', hoverinfo: 'skip' },
      { x: coupures, y: P50, mode: 'lines', line: { color: 'rgb(22,163,74)', width: 2.5 }, name: 'Q(z_c) — médiane' },
    ], {
      margin: { t: 35, l: 50, r: 20, b: 50 },
      xaxis: { title: 'Coupure z_c' }, yaxis: { title: 'Métal récupérable Q = T·q', rangemode: 'tozero' },
      title: { text: '🎯 Étape 5 : Décision — courbe Q(z_c) avec incertitude P10-P90', font: { size: 12 } },
      legend: { orientation: 'h', y: -0.18, x: 0.5, xanchor: 'center', font: { size: 10 } },
    }, { displaylogo: false, responsive: true });
    this.infoEl.innerHTML = `🎉 <b>Pipeline complet</b> : données → variogramme → krigeage → simulation → <b>décision minière sous risque</b>. ` +
      `La bande P10-P90 quantifie l'incertitude sur le tonnage récupérable.`;
  }

  cleanup() {
    if (window.Plotly) {
      this.panelsEl.querySelectorAll('div').forEach(d => { try { Plotly.purge(d); } catch (e) {} });
    }
  }
}

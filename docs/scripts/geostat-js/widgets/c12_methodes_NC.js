// scripts/geostat-js/widgets/c12_methodes_NC.js
// -----------------------------------------------------------------------------
// Widget C12.1 — Comparaison des methodes de simulation NC : LU, SGS, FFT-MA.
// Trois methodes, MEME modele et MEME seed -> realisations differentes mais
// avec le MEME variogramme empirique : on verifie l'equivalence statistique.
// -----------------------------------------------------------------------------
import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';
const debounce = (fn, ms = 400) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

export default class C12MethodesNC extends Widget {
  render() {
    this.el.insertAdjacentHTML('beforeend', `
      <div class="gw-controls" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;">
        <label>Modèle <select class="js-mod">
          <option value="spherique">Sphérique</option><option value="exponentiel">Exponentiel</option><option value="gaussien">Gaussien</option>
        </select></label>
        <label>Portée a <input type="range" class="js-a" min="3" max="20" value="8" step="1" style="width:120px"><span class="js-av">8</span></label>
        <label>Grille N <input type="range" class="js-N" min="20" max="50" value="30" step="2" style="width:100px"><span class="js-Nv">30</span></label>
        <button class="js-regen" type="button" style="font-size:.76rem;padding:3px 8px;background:#3a3632;color:#fff;border:none;border-radius:4px;cursor:pointer;">Resim</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:6px;">
        <div class="js-plot-lu" style="height:300px"></div>
        <div class="js-plot-sgs" style="height:300px"></div>
        <div class="js-plot-fftma" style="height:300px"></div>
      </div>
      <div class="js-plot-vario" style="height:300px;margin-top:6px;"></div>
      <p style="margin:4px 1rem;font-size:11px;color:#666;">
        LU = Cholesky (exact mais O(N⁶)), SGS = séquentiel gaussien, FFT-MA = convolution par FFT.
        Les trois donnent statistiquement le même variogramme empirique.</p>
    `);
    this.plotLU = this.el.querySelector('.js-plot-lu');
    this.plotSGS = this.el.querySelector('.js-plot-sgs');
    this.plotFFTMA = this.el.querySelector('.js-plot-fftma');
    this.plotVario = this.el.querySelector('.js-plot-vario');
    this.ctrl = {
      mod: this.el.querySelector('.js-mod'),
      a:   this.el.querySelector('.js-a'),
      N:   this.el.querySelector('.js-N'),
    };
    this.seed = 42;
    const update = debounce(() => this.refresh(), 500);
    for (const [k, el] of Object.entries(this.ctrl)) {
      this.on(el, 'input', e => {
        const span = this.el.querySelector(`.js-${k}v`);
        if (span) span.textContent = e.target.value;
      });
      this.on(el, 'input', update);
      this.on(el, 'change', update);
    }
    this.on(this.el.querySelector('.js-regen'), 'click', () => { this.seed++; this.refresh(); });
    afficherChargementJusquaPret(this.el).then(() => this.refresh());
  }

  async refresh() {
    const mod = this.ctrl.mod.value;
    const a = parseFloat(this.ctrl.a.value);
    const N = parseInt(this.ctrl.N.value, 10);

    let sLU, sSGS, sFFTMA;
    try {
      [sLU, sSGS, sFFTMA] = await Promise.all([
        gpoly.simulerLU(mod, a, 1.0, this.seed, N),
        gpoly.simulerSGS(mod, a, 1.0, this.seed, N),
        gpoly.simulerFFTMA(mod, a, 1.0, this.seed, N),
      ]);
    } catch (e) { this.afficherAvertissement('Erreur simulation : ' + e.message); return; }

    const reshape = (flat) => {
      const M = []; for (let j = 0; j < N; j++) {
        const r = []; for (let i = 0; i < N; i++) r.push(flat[j * N + i]); M.push(r);
      }
      return M;
    };

    if (!window.Plotly) { this.afficherAvertissement('Plotly non chargé.'); return; }
    const layoutCommon = {
      margin: { t: 35, l: 30, r: 50, b: 30 },
      xaxis: { showticklabels: false, scaleanchor: 'y' },
      yaxis: { showticklabels: false },
    };
    const zMin = Math.min(...sLU, ...sSGS, ...sFFTMA);
    const zMax = Math.max(...sLU, ...sSGS, ...sFFTMA);
    Plotly.react(this.plotLU, [{ type: 'heatmap', z: reshape(sLU), colorscale: 'Turbo', zmin: zMin, zmax: zMax }],
      { ...layoutCommon, title: { text: 'LU (Cholesky)', font: { size: 11 } } }, { displaylogo: false, responsive: true });
    Plotly.react(this.plotSGS, [{ type: 'heatmap', z: reshape(sSGS), colorscale: 'Turbo', zmin: zMin, zmax: zMax }],
      { ...layoutCommon, title: { text: 'SGS', font: { size: 11 } } }, { displaylogo: false, responsive: true });
    Plotly.react(this.plotFFTMA, [{ type: 'heatmap', z: reshape(sFFTMA), colorscale: 'Turbo', zmin: zMin, zmax: zMax }],
      { ...layoutCommon, title: { text: 'FFT-MA', font: { size: 11 } } }, { displaylogo: false, responsive: true });

    // Variogramme empirique des 3 realisations + theorique
    const lag_max = Math.min(N - 1, Math.ceil(2 * a));
    const [vLU, vSGS, vFFTMA] = await Promise.all([
      gpoly.variogrammeEmpiriqueGrille(sLU, N, lag_max),
      gpoly.variogrammeEmpiriqueGrille(sSGS, N, lag_max),
      gpoly.variogrammeEmpiriqueGrille(sFFTMA, N, lag_max),
    ]);
    const lags_theo = []; for (let i = 0; i <= 50; i++) lags_theo.push(i * lag_max / 50);
    const gTheo = await gpoly.variogrammeTheorique(mod, lags_theo, a, 1.0);

    Plotly.react(this.plotVario, [
      { x: vLU.lags, y: vLU.values, mode: 'lines+markers', name: 'LU',
        line: { color: '#2563eb', width: 2 }, marker: { color: '#2563eb', size: 6 } },
      { x: vSGS.lags, y: vSGS.values, mode: 'lines+markers', name: 'SGS',
        line: { color: '#ea580c', width: 2 }, marker: { color: '#ea580c', size: 6 } },
      { x: vFFTMA.lags, y: vFFTMA.values, mode: 'lines+markers', name: 'FFT-MA',
        line: { color: '#16a34a', width: 2 }, marker: { color: '#16a34a', size: 6 } },
      { x: lags_theo, y: Array.from(gTheo), mode: 'lines',
        line: { color: '#000', dash: 'dash', width: 1.5 }, name: 'γ(h) théorique' },
    ], {
      margin: { t: 30, l: 50, r: 20, b: 50 },
      xaxis: { title: 'h', rangemode: 'tozero' },
      yaxis: { title: 'γ(h)', rangemode: 'tozero' },
      title: { text: 'Variogrammes empiriques des 3 simulations', font: { size: 12 } },
      legend: { orientation: 'h', y: -0.18, x: 0.5, xanchor: 'center', font: { size: 10 } },
    }, { displaylogo: false, responsive: true });
  }

  cleanup() {
    if (window.Plotly) {
      [this.plotLU, this.plotSGS, this.plotFFTMA, this.plotVario].forEach(p => { if (p) Plotly.purge(p); });
    }
  }
}

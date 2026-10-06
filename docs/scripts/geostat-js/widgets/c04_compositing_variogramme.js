// scripts/geostat-js/widgets/c04_compositing_variogramme.js
// -----------------------------------------------------------------------------
// Widget — Compositing : impact sur le variogramme.
// Genere des echantillons "carottes" 1D le long d'un forage. Calcule le
// variogramme pour differentes longueurs de composite et compare.
// -----------------------------------------------------------------------------
import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';
const debounce = (fn, ms = 350) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

export default class C04CompositingVariogramme extends Widget {
  render() {
    this.el.insertAdjacentHTML('beforeend', `
      <div class="gw-controls" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;">
        <label>Modèle <select class="js-mod">
          <option value="spherique">Sphérique</option><option value="exponentiel">Exponentiel</option><option value="gaussien">Gaussien</option>
        </select></label>
        <label>Portée a <input type="range" class="js-a" min="5" max="40" value="20" step="1" style="width:120px"><span class="js-av">20</span></label>
        <label>Longueur originale (m) <input type="number" class="js-lo" value="1" min="0.25" max="5" step="0.25" style="width:60px"></label>
        <label>Longueur composite (m) <input type="range" class="js-lc" min="1" max="10" value="3" step="0.5" style="width:140px"><span class="js-lcv">3</span></label>
        <button class="js-regen" type="button" style="font-size:.76rem;padding:3px 8px;background:#3a3632;color:#fff;border:none;border-radius:4px;cursor:pointer;">Resim</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px;">
        <div class="js-plot-profil" style="height:340px"></div>
        <div class="js-plot-vario" style="height:340px"></div>
      </div>
      <div class="js-info" style="padding:.5rem 1rem;font-family:'JetBrains Mono',monospace;font-size:.85rem;color:#444;text-align:center;background:#eef2e8;border:1px solid #b8c8a8;border-radius:6px;margin-top:4px;">—</div>
      <p style="margin:4px 1rem;font-size:11px;color:#666;">
        Le compositing AGRÈGE les échantillons originaux (carottes brutes) en composites de longueur fixe.
        Effet : variance réduite (effet de support), variogramme empirique plus régulier. Pratique standard
        en exploration minière pour homogénéiser le support d'analyse.</p>
    `);
    this.plotProf = this.el.querySelector('.js-plot-profil');
    this.plotVar = this.el.querySelector('.js-plot-vario');
    this.infoEl = this.el.querySelector('.js-info');
    this.ctrl = {
      mod: this.el.querySelector('.js-mod'), a: this.el.querySelector('.js-a'),
      lo: this.el.querySelector('.js-lo'), lc: this.el.querySelector('.js-lc'),
    };
    this.seed = 27;
    const update = debounce(() => this.refresh(), 400);
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
    const Lo = parseFloat(this.ctrl.lo.value);  // longueur echantillon original
    const Lc = parseFloat(this.ctrl.lc.value);  // longueur composite

    // Simuler un long forage 1D : 200 echantillons originaux de Lo
    const Ntot = 200;
    const ratio = Math.round(Lc / Lo);
    let champ_1d_2d;
    try {
      // On simule en 1D via FFTMA 1xNtot (truc : utiliser une grille 1 x Ntot)
      // ou simplement extraire une ligne d'une simulation 2D
      champ_1d_2d = await gpoly.simulerFFTMA(mod, a, 1.0, this.seed, 30);
    } catch (e) { this.afficherAvertissement('Erreur : ' + e.message); return; }
    // Extraire la ligne du milieu et l'etendre pour avoir Ntot points
    const ligne_brute = [];
    for (let k = 0; k < 30; k++) ligne_brute.push(champ_1d_2d[15 * 30 + k]);
    // Repeter en interpolant pour avoir Ntot echantillons
    const profil_orig = [];
    for (let i = 0; i < Ntot; i++) {
      const u = i / Ntot * 30;
      const k = Math.floor(u), t = u - k;
      const kk = Math.min(k, 28);
      profil_orig.push(ligne_brute[kk] * (1-t) + ligne_brute[kk+1] * t);
    }
    // Composites : moyenne de ratio echantillons consecutifs
    const profil_comp = [];
    const z_comp = [], x_comp = [];
    for (let i = 0; i + ratio <= Ntot; i += ratio) {
      let s = 0;
      for (let j = 0; j < ratio; j++) s += profil_orig[i + j];
      const moy = s / ratio;
      profil_comp.push(moy);
      z_comp.push(moy);
      x_comp.push([(i + ratio/2) * Lo]);
    }
    // Coordonnees originales
    const z_orig = profil_orig.slice();
    const x_orig = profil_orig.map((_, i) => [(i + 0.5) * Lo]);

    if (!window.Plotly) return;
    // Profil
    Plotly.react(this.plotProf, [
      { x: x_orig.map(c => c[0]), y: z_orig, mode: 'lines', line: { color: '#ddd', width: 1.5 }, name: `Carottes originales (L=${Lo}m)` },
      { x: x_comp.map(c => c[0]), y: z_comp, mode: 'lines+markers',
        line: { color: '#0d4d92', width: 2 }, marker: { color: '#0d4d92', size: 7 },
        name: `Composites (L=${Lc}m, n=${z_comp.length})` },
    ], {
      margin: { t: 35, l: 50, r: 20, b: 50 },
      xaxis: { title: 'Profondeur (m)' }, yaxis: { title: 'Teneur' },
      title: { text: 'Profil 1D : original vs composite', font: { size: 12 } },
      legend: { orientation: 'h', y: -0.18, x: 0.5, xanchor: 'center', font: { size: 10 } },
    }, { displaylogo: false, responsive: true });

    // Variogrammes
    let v_orig, v_comp;
    try {
      v_orig = await gpoly.variogrammeScatter(x_orig, z_orig, 12, Math.min(Ntot * Lo / 3, a * 3));
      v_comp = await gpoly.variogrammeScatter(x_comp, z_comp, 12, Math.min(z_comp.length * Lc / 3, a * 3));
    } catch (e) { this.afficherAvertissement('Erreur vario : ' + e.message); return; }
    // Theorique
    const h_max = Math.max(...v_orig.h);
    const lags_theo = []; for (let k = 0; k <= 50; k++) lags_theo.push(k * h_max / 50);
    const gTheo = await gpoly.variogrammeTheorique(mod, lags_theo, a, 1.0);

    Plotly.react(this.plotVar, [
      { x: v_orig.h, y: v_orig.gamma, mode: 'lines+markers',
        line: { color: '#888', width: 1.5 }, marker: { color: '#888', size: 7 },
        name: `Original (L=${Lo}m)` },
      { x: v_comp.h, y: v_comp.gamma, mode: 'lines+markers',
        line: { color: '#0d4d92', width: 2.5 }, marker: { color: '#0d4d92', size: 9, symbol: 'diamond' },
        name: `Composite (L=${Lc}m)` },
      { x: lags_theo, y: Array.from(gTheo), mode: 'lines',
        line: { color: '#c43a3a', dash: 'dash' }, name: 'γ(h) théorique' },
    ], {
      margin: { t: 35, l: 50, r: 20, b: 50 },
      xaxis: { title: 'h (m)' }, yaxis: { title: 'γ(h)', rangemode: 'tozero' },
      title: { text: 'Variogrammes empiriques', font: { size: 12 } },
      legend: { orientation: 'h', y: -0.18, x: 0.5, xanchor: 'center', font: { size: 10 } },
    }, { displaylogo: false, responsive: true });

    const var_orig = z_orig.reduce((s, v) => s + v * v, 0) / z_orig.length - (z_orig.reduce((s, v) => s + v, 0) / z_orig.length) ** 2;
    const var_comp = z_comp.reduce((s, v) => s + v * v, 0) / z_comp.length - (z_comp.reduce((s, v) => s + v, 0) / z_comp.length) ** 2;
    this.infoEl.innerHTML =
      `Var(original) = <b>${var_orig.toFixed(3)}</b> · ` +
      `Var(composite L=${Lc}m) = <b>${var_comp.toFixed(3)}</b> ` +
      `· réduction = ${(100*(1-var_comp/var_orig)).toFixed(1)} % (effet de support)`;
  }

  cleanup() {
    if (window.Plotly) {
      if (this.plotProf) Plotly.purge(this.plotProf);
      if (this.plotVar) Plotly.purge(this.plotVar);
    }
  }
}

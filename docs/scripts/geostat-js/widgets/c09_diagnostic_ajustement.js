// scripts/geostat-js/widgets/c09_diagnostic_ajustement.js
// -----------------------------------------------------------------------------
// Widget — Diagnostic d'un mauvais ajustement du variogramme.
//
// L'utilisateur fait varier la portee/palier/pepite VOLONTAIREMENT MAL et
// observe l'impact sur :
//   - Le variogramme experimental + theorique
//   - Les statistiques de validation croisee (moy(e^s), var(e^s))
//   - Le scatter Z observe vs Z* LOO
//
// Pedagogie : montre comment DIAGNOSTIQUER un mauvais variogramme via la VC.
//   - moy(e^s) != 0 -> biais (souvent indique mauvaise moyenne ou tendance)
//   - var(e^s) > 1  -> variance de krigeage SOUS-estimee
//   - var(e^s) < 1  -> variance de krigeage SUR-estimee
// -----------------------------------------------------------------------------
import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';
const debounce = (fn, ms = 400) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

export default class C09DiagnosticAjustement extends Widget {
  render() {
    this.donnees = null;
    this.varioExp = null;
    this.el.insertAdjacentHTML('beforeend', `
      <div class="gw-controls" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;">
        <div style="font-weight:700;color:#555;border-right:2px solid #ddd;padding-right:8px;">VRAI (caché)</div>
        <span>portée a* = 20</span>·<span>palier C* = 1.0</span>·<span>pépite c₀* = 0.05</span>
        <button class="js-regen" type="button" style="font-size:.74rem;padding:3px 8px;background:#3a3632;color:#fff;border:none;border-radius:4px;cursor:pointer;">Nouvelle réalité</button>
      </div>
      <div class="gw-controls" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;margin-top:6px;">
        <div style="font-weight:700;color:#0d4d92;border-right:2px solid #ddd;padding-right:8px;">VOTRE MODÈLE</div>
        <label>Modèle <select class="js-mod">
          <option value="spherique">Sphérique</option><option value="exponentiel">Exponentiel</option><option value="gaussien">Gaussien</option>
        </select></label>
        <label>Portée a <input type="range" class="js-a" min="3" max="50" value="20" step="1" style="width:140px"><span class="js-av">20</span></label>
        <label>Palier C <input type="range" class="js-c" min="0.2" max="3" value="1.0" step="0.05" style="width:120px"><span class="js-cv">1.0</span></label>
        <label>Pépite c₀ <input type="range" class="js-c0" min="0" max="0.6" value="0.05" step="0.02" style="width:120px"><span class="js-c0v">0.05</span></label>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px;">
        <div class="js-plot-vario" style="height:340px"></div>
        <div class="js-plot-scatter" style="height:340px"></div>
      </div>
      <div class="js-info" style="padding:.5rem 1rem;font-family:'JetBrains Mono',monospace;font-size:.9rem;color:#444;text-align:center;background:#eef2e8;border:1px solid #b8c8a8;border-radius:6px;margin-top:4px;">—</div>
      <p style="margin:4px 1rem;font-size:11px;color:#666;">
        Le bon ajustement donne <b>moy(eˢ) ≈ 0</b> et <b>var(eˢ) ≈ 1</b>. Essayez de désajuster
        la portée (trop grande/petite) ou la pépite et observez l'impact sur ces statistiques.</p>
    `);
    this.plotVario = this.el.querySelector('.js-plot-vario');
    this.plotScat = this.el.querySelector('.js-plot-scatter');
    this.infoEl = this.el.querySelector('.js-info');
    this.ctrl = {
      mod: this.el.querySelector('.js-mod'), a: this.el.querySelector('.js-a'),
      c: this.el.querySelector('.js-c'), c0: this.el.querySelector('.js-c0'),
    };
    this.seed = 17;
    const update = debounce(() => this.refresh(), 400);
    for (const [k, el] of Object.entries(this.ctrl)) {
      this.on(el, 'input', e => { const s = this.el.querySelector(`.js-${k}v`); if (s) s.textContent = e.target.value; });
      this.on(el, 'input', update); this.on(el, 'change', update);
    }
    this.on(this.el.querySelector('.js-regen'), 'click', () => { this.seed++; this.regenerer(); });
    afficherChargementJusquaPret(this.el).then(() => this.regenerer());
  }

  async regenerer() {
    const N = 30, npts = 50;
    // Champ vrai : portee 20, palier 1, pepite 0.05 (sphérique)
    let champ;
    try {
      champ = await gpoly.simulerFFTMA('spherique', 20, 1.0, this.seed, N);
    } catch (e) { this.afficherAvertissement('Erreur : ' + e.message); return; }
    // Echantillonner npts pixels au hasard
    let s = (this.seed * 2654435761) >>> 0;
    const rng = () => { s = (s * 1664525 + 1013904223) | 0; return ((s >>> 0) / 4294967296); };
    const choisi = new Set();
    while (choisi.size < npts) choisi.add(Math.floor(rng() * N * N));
    const coords = [], vals = [];
    for (const idx of choisi) {
      const y = Math.floor(idx / N), x = idx - y * N;
      // bruit pepite
      const noise = (rng() - 0.5) * 0.4;
      coords.push([x, y]); vals.push(champ[idx] + noise);
    }
    this.donnees = { coords, vals };
    // Variogramme experimental
    try {
      this.varioExp = await gpoly.variogrammeScatter(coords, vals, 10);
    } catch (e) { this.afficherAvertissement('Erreur vario : ' + e.message); return; }
    this.refresh();
  }

  async refresh() {
    if (!this.donnees) return;
    const mod = this.ctrl.mod.value;
    const a = parseFloat(this.ctrl.a.value);
    const c = parseFloat(this.ctrl.c.value);
    const c0 = parseFloat(this.ctrl.c0.value);
    const structs = [{ modele: mod, portee: a, palier: c }];

    // Validation croisee
    let vc;
    try {
      vc = await gpoly.validationCroisee(this.donnees.coords, this.donnees.vals, structs, c0);
    } catch (e) { this.afficherAvertissement('Erreur VC : ' + e.message); return; }

    // Variogramme théorique
    const lags_theo = []; for (let k = 0; k <= 50; k++) lags_theo.push(k * Math.max(...this.varioExp.h) * 1.1 / 50);
    let gTheo;
    try {
      gTheo = await gpoly.variogrammeTheorique(mod, lags_theo, a, c);
      gTheo = Array.from(gTheo).map((v, i) => v + (lags_theo[i] > 0 ? c0 : 0));
    } catch (e) { this.afficherAvertissement('Erreur : ' + e.message); return; }

    if (!window.Plotly) return;
    // Variogramme
    Plotly.react(this.plotVario, [
      { x: this.varioExp.h, y: this.varioExp.gamma, mode: 'markers',
        marker: { color: '#c43a3a', size: 9, symbol: 'diamond' }, name: 'γ̂(h) empirique' },
      { x: lags_theo, y: gTheo, mode: 'lines', line: { color: '#0d4d92', width: 2.5 }, name: `γ(h) votre modèle` },
    ], {
      margin: { t: 35, l: 50, r: 20, b: 50 },
      xaxis: { title: 'h', rangemode: 'tozero' },
      yaxis: { title: 'γ(h)', rangemode: 'tozero' },
      title: { text: 'Variogramme empirique vs votre ajustement', font: { size: 12 } },
      legend: { orientation: 'h', y: -0.18, x: 0.5, xanchor: 'center', font: { size: 10 } },
    }, { displaylogo: false, responsive: true });

    // Scatter Z vs Z* LOO
    const zmin = Math.min(...vc.observees, ...vc.estimations);
    const zmax = Math.max(...vc.observees, ...vc.estimations);
    Plotly.react(this.plotScat, [
      { x: vc.estimations, y: vc.observees, mode: 'markers',
        marker: { color: '#0d4d92', size: 8, line: { color: '#fff', width: 1 } }, name: 'LOO' },
      { x: [zmin, zmax], y: [zmin, zmax], mode: 'lines',
        line: { color: '#c43a3a', dash: 'dash' }, name: 'y = x' },
    ], {
      margin: { t: 35, l: 50, r: 20, b: 50 },
      xaxis: { title: 'Z* (LOO)' }, yaxis: { title: 'Z observé', scaleanchor: 'x' },
      title: { text: 'Z vs Z* (validation croisée)', font: { size: 12 } },
      legend: { orientation: 'h', y: -0.18, x: 0.5, xanchor: 'center', font: { size: 10 } },
    }, { displaylogo: false, responsive: true });

    // Diagnostic
    const moy_e = vc.moyenne_e_std;
    const var_e = vc.var_e_std;
    const diag_moy = Math.abs(moy_e) < 0.1 ? '✓' : (moy_e > 0 ? '↑ surestime' : '↓ sous-estime');
    let diag_var;
    if (var_e < 0.5) diag_var = '⚠ var ≪ 1 : σ²_K SUR-ESTIMÉE (modèle trop conservateur)';
    else if (var_e > 1.7) diag_var = '⚠ var ≫ 1 : σ²_K SOUS-ESTIMÉE (modèle trop confiant)';
    else if (var_e >= 0.85 && var_e <= 1.15) diag_var = '✓ var ≈ 1 (bon)';
    else diag_var = `~ var = ${var_e.toFixed(2)}`;

    this.infoEl.innerHTML =
      `moy(eˢ) = <b>${moy_e.toFixed(3)}</b> ${diag_moy} · ` +
      `var(eˢ) = <b>${var_e.toFixed(3)}</b> · <span style="font-size:.85em">${diag_var}</span>`;
  }

  cleanup() {
    if (window.Plotly) {
      if (this.plotVario) Plotly.purge(this.plotVario);
      if (this.plotScat) Plotly.purge(this.plotScat);
    }
  }
}

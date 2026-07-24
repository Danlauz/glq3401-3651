// scripts/geostat-js/widgets/c12_vario_reproduction.js
// -----------------------------------------------------------------------------
// Widget C12.1 — Reproduction du variogramme.
//
// Plusieurs réalisations non conditionnelles (transects 1D) du MÊME modèle :
//   - chaque réalisation a un variogramme expérimental (gris pâle) qui, seul,
//     fluctue autour du modèle sans y coller parfaitement ;
//   - la MOYENNE des variogrammes expérimentaux (noir) converge vers le modèle
//     théorique (rouge) à mesure qu'on accumule les réalisations (jusqu'à 500).
// La réalisation ACTIVE est mise en évidence (gris foncé) à gauche et à droite.
// -----------------------------------------------------------------------------
import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';
const debounce = (fn, ms = 350) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const NPTS = 300;                       // longueur du transect 1D
const HMAX = 75;                        // distance max FIXE (axe constant quelle que soit la portée)

// Variogramme théorique (palier 1, portée pratique a).
function gammaModele(mod, h, a) {
  const t = h / a;
  if (mod === 'spherique') return h >= a ? 1 : 1.5 * t - 0.5 * t * t * t;
  if (mod === 'exponentiel') return 1 - Math.exp(-3 * t);
  return 1 - Math.exp(-3 * t * t);      // gaussien
}
// Variogramme expérimental d'un transect 1D (pas entiers).
function varioExp(z, hmax) {
  const n = z.length, g = [];
  for (let h = 1; h <= hmax; h++) {
    let s = 0, c = 0;
    for (let i = 0; i + h < n; i++) { const d = z[i + h] - z[i]; s += d * d; c++; }
    g.push(0.5 * s / c);
  }
  return g;
}

export default class C12VarioReproduction extends Widget {
  render() {
    const id = this.el.id;
    this.seed = 7;
    this.el.insertAdjacentHTML('beforeend', `
      <style>#${id} .gw-controls label{display:inline-flex !important;flex-direction:row !important;align-items:center;gap:5px;}</style>
      <div class="gw-controls" style="display:flex;flex-wrap:wrap;gap:14px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;">
        <label>Modèle <select class="js-mod">
          <option value="spherique">Sphérique</option>
          <option value="exponentiel">Exponentiel</option>
          <option value="gaussien">Gaussien</option>
        </select></label>
        <label>Portée a <input type="range" class="js-a" min="8" max="60" value="25" step="1" style="width:110px"><span class="js-av">25</span></label>
        <label>Nombre de réalisations <input type="range" class="js-nb" min="1" max="200" value="3" step="1" style="width:160px"><span class="js-nbv">3</span></label>
        <button class="js-regen" type="button" style="font-size:.78rem;padding:4px 10px;background:#3a3632;color:#fff;border:none;border-radius:5px;cursor:pointer;">Nouveau tirage</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px;">
        <div class="js-plot-prof" style="height:300px"></div>
        <div class="js-plot-vario" style="height:300px"></div>
      </div>
      <div class="js-info" style="padding:.45rem 1rem;font-family:'JetBrains Mono',monospace;font-size:.82rem;color:#333;text-align:center;background:#eef2f7;border:1px solid #c4d2e0;border-radius:6px;margin-top:4px;">—</div>
      <p style="margin:4px 1rem;font-size:11px;color:#666;">
        À gauche : toutes les réalisations (gris pâle) et la <b style="color:#333">dernière réalisation ajoutée</b> (gris foncé). À droite : les <b style="color:#999">variogrammes expérimentaux</b> (gris pâle, un par réalisation), leur <b>moyenne</b> (noir pointillé) et le <b style="color:#d62728">modèle théorique</b> (rouge). Montez jusqu'à 200 réalisations : la moyenne converge vers le modèle.</p>
    `);
    this.profEl = this.el.querySelector('.js-plot-prof');
    this.varioEl = this.el.querySelector('.js-plot-vario');
    this.infoEl = this.el.querySelector('.js-info');
    this.ctrl = { mod: this.el.querySelector('.js-mod'), a: this.el.querySelector('.js-a'), nb: this.el.querySelector('.js-nb') };
    const upd = debounce(() => this.refresh(), 300);
    this.on(this.ctrl.mod, 'change', upd);
    this.on(this.ctrl.a, 'input', e => { this.el.querySelector('.js-av').textContent = e.target.value; upd(); });
    this.on(this.ctrl.nb, 'input', e => { this.el.querySelector('.js-nbv').textContent = e.target.value; upd(); });
    this.on(this.el.querySelector('.js-regen'), 'click', () => { this.seed = Math.floor(Math.random() * 1e6); this.refresh(); });
    afficherChargementJusquaPret(this.el).then(() => this.refresh());
  }

  async refresh() {
    const mod = this.ctrl.mod.value, a = parseFloat(this.ctrl.a.value), nb = parseInt(this.ctrl.nb.value, 10);
    this.hmax = HMAX;
    try {
      this.sims = await gpoly.simuler1DN(mod, a, this.seed, NPTS, nb);
    } catch (e) { this.afficherAvertissement('Erreur simulation : ' + e.message); return; }
    this.varios = this.sims.map(z => varioExp(z, this.hmax));
    this.mod = mod; this.a = a;
    this._draw();
  }

  _draw() {
    if (!window.Plotly || !this.sims) return;
    const nb = this.sims.length, hmax = this.hmax, a = this.a, mod = this.mod;
    const act = nb - 1;                    // active = dernière réalisation ajoutée
    const xs = Array.from({ length: NPTS }, (_, i) => i);
    const lags = Array.from({ length: hmax }, (_, k) => k + 1);
    const moy = lags.map((_, k) => this.varios.reduce((acc, v) => acc + v[k], 0) / nb);
    const modele = lags.map(h => gammaModele(mod, h, a));
    const rmse = Math.sqrt(moy.reduce((acc, v, k) => acc + (v - modele[k]) ** 2, 0) / hmax);

    // ---- Profils : toutes les réalisations en une seule trace (séparateurs NaN), WebGL ----
    const px = [], py = [];
    for (const z of this.sims) { for (let i = 0; i < NPTS; i++) { px.push(i); py.push(z[i]); } px.push(null); py.push(null); }
    Plotly.react(this.profEl, [
      { type: 'scattergl', x: px, y: py, mode: 'lines', line: { color: '#d4d4d4', width: 0.6 }, hoverinfo: 'skip', showlegend: false },
      { type: 'scattergl', x: xs, y: Array.from(this.sims[act]), mode: 'lines', line: { color: '#444', width: 1.6 }, hoverinfo: 'skip', showlegend: false },
    ], {
      margin: { t: 28, l: 40, r: 10, b: 38 }, title: { text: `Réalisations (transects 1D) · ${nb}`, font: { size: 11.5 } },
      xaxis: { title: { text: 'position', standoff: 4 }, range: [0, NPTS - 1] }, yaxis: { title: { text: 'Z(x)', standoff: 4 }, range: [-3.6, 3.6] },
      showlegend: false,
    }, { displaylogo: false, responsive: true, displayModeBar: false });

    // ---- Variogrammes : tous en gris pâle (une trace NaN, WebGL) + active + moyenne + modèle ----
    const vx = [], vy = [];
    for (const v of this.varios) { for (let k = 0; k < hmax; k++) { vx.push(lags[k]); vy.push(v[k]); } vx.push(null); vy.push(null); }
    Plotly.react(this.varioEl, [
      { type: 'scattergl', x: vx, y: vy, mode: 'lines', line: { color: '#d4d4d4', width: 0.6 }, name: 'variogrammes exp.', hoverinfo: 'skip', showlegend: true },
      { type: 'scattergl', x: lags, y: this.varios[act], mode: 'lines', line: { color: '#9a9a9a', width: 1.4 }, name: 'dernière réalisation', hoverinfo: 'skip' },
      { type: 'scattergl', x: [0, hmax], y: [1, 1], mode: 'lines', line: { color: '#ccc', width: 1 }, showlegend: false, hoverinfo: 'skip' },
      { type: 'scattergl', x: lags, y: modele, mode: 'lines', line: { color: '#d62728', width: 2.8 }, name: 'modèle théorique', hoverinfo: 'skip' },
      { type: 'scattergl', x: lags, y: moy, mode: 'lines', line: { color: '#111', width: 3, dash: 'dash' }, name: 'moyenne des variogrammes', hoverinfo: 'skip' },
    ], {
      margin: { t: 28, l: 44, r: 10, b: 38 }, title: { text: 'Variogrammes expérimentaux vs modèle', font: { size: 11.5 } },
      xaxis: { title: { text: 'distance h', standoff: 4 }, range: [0, hmax] },
      yaxis: { title: { text: 'γ(h)', standoff: 4 }, range: [0, 1.6] },
      legend: { orientation: 'h', y: -0.18, x: 0.5, xanchor: 'center', font: { size: 9 } },
    }, { displaylogo: false, responsive: true, displayModeBar: false });

    this.infoEl.innerHTML =
      `<b>${nb}</b> réalisation(s) · écart moyen |moyenne − modèle| = <b style="color:${rmse < 0.06 ? '#1f8a4c' : '#c0392b'}">${rmse.toFixed(3)}</b> ` +
      `— ${nb >= 100 ? 'la moyenne colle au modèle théorique.' : 'augmentez le nombre de réalisations pour voir la moyenne converger vers le modèle.'}`;
  }

  cleanup() { if (window.Plotly) { if (this.profEl) Plotly.purge(this.profEl); if (this.varioEl) Plotly.purge(this.varioEl); } }
}

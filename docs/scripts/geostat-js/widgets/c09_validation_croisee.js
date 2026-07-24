// scripts/geostat-js/widgets/c09_validation_croisee.js
// -----------------------------------------------------------------------------
// Widget C09.6 — Validation croisée (calqué sur GLQ3401_C8, diapo 53).
//
// Données simulées à partir d'un vrai modèle sphérique (GFFTMA). On balaie
// l'espace des paramètres et on trace la SURFACE de Var(e) (variance des
// erreurs de validation croisée leave-one-out) en fonction de (portée a,
// ratio c₀/C). Le minimum de la surface = meilleur modèle ; le bouton
// « Ajuster aux données » y amène le modèle courant.
//
// Krigeage et VC LOO délégués à la librairie (cokri).
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

const debounce = (fn, ms = 300) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

const TURBO = [
  [0.0, 'rgb(48,18,59)'], [0.1, 'rgb(65,69,217)'], [0.2, 'rgb(35,138,244)'],
  [0.3, 'rgb(30,192,211)'], [0.4, 'rgb(53,226,149)'], [0.5, 'rgb(131,246,88)'],
  [0.6, 'rgb(199,233,47)'], [0.7, 'rgb(248,186,56)'], [0.8, 'rgb(251,122,33)'],
  [0.9, 'rgb(221,61,8)'], [1.0, 'rgb(122,4,3)'],
];
const NGRID = 40;          // grille du champ simulé (comme la diapo : 40×40)
const NDATA = 30;          // ≈ 30 données échantillonnées
const A_VRAI = 10;         // portée vraie (cachée à l'étudiant)
const RATIO_VRAI = 0.33;   // ratio c₀/C vrai (caché)
const A_SCAN = [4, 7, 10, 13, 16, 20, 24, 28];
const R_SCAN = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6];

const moy = a => a.reduce((s, v) => s + v, 0) / a.length;
const variance = a => { const m = moy(a); return moy(a.map(v => (v - m) ** 2)); };
// Variance robuste : ignore les valeurs non finies (krigeage singulier éventuel).
const varOf = a => { const f = a.filter(Number.isFinite); return f.length > 1 ? variance(f) : NaN; };

export default class C09ValidationCroisee extends Widget {
  render() {
    this._seed = 7;
    this._surface = null;
    const id = this.el.id;
    this.el.insertAdjacentHTML('beforeend', `
      <style>
        #${id} .vc-row label{display:inline-flex !important;flex-direction:row !important;align-items:center;gap:5px;}
        #${id} .vc-grp{display:flex;flex-wrap:wrap;gap:12px;align-items:center;padding:7px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;margin-bottom:6px;}
        #${id} .vc-grp select,#${id} .vc-grp input[type=number]{padding:1px 4px;border:1px solid #c7ccd1;border-radius:4px;}
        #${id} .vc-mini{font-size:.74rem;padding:3px 9px;color:#fff;border:none;border-radius:4px;cursor:pointer;}
      </style>
      <div class="vc-grp vc-row">
        <label>Modèle <select class="js-mod">
          <option value="spherique">Sphérique</option>
          <option value="exponentiel">Exponentiel</option>
          <option value="gaussien">Gaussien</option>
        </select></label>
        <label>Portée <i>a</i> <input type="range" class="js-a" min="4" max="28" value="10" step="1" style="width:120px"><span class="js-av">10</span></label>
        <label>Ratio <span>c<sub>0</sub>/C</span> <input type="range" class="js-r" min="0" max="0.6" value="0.33" step="0.01" style="width:110px"><span class="js-rv">0.33</span></label>
        <label>Palier <span>C</span> <input type="range" class="js-C" min="0.3" max="3" value="1" step="0.1" style="width:90px"><span class="js-Cv">1.0</span></label>
      </div>
      <div class="vc-grp vc-row">
        <button class="js-fit vc-mini" type="button" style="background:#b06a00;">Ajuster aux données</button>
        <button class="js-regen vc-mini" type="button" style="background:#3a3632;">Nouvelle simulation</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px;">
        <div class="js-plot-ref" style="height:280px"></div>
        <div class="js-plot-surf" style="height:280px"></div>
        <div class="js-plot-vario" style="height:262px"></div>
        <div class="js-plot-cv" style="height:262px"></div>
      </div>
      <div class="js-info" style="padding:.45rem 1rem;font-size:.82rem;color:#333;text-align:center;background:#eef2f7;border:1px solid #c4d2e0;border-radius:6px;margin-top:6px;">—</div>
      <p style="margin:5px 1rem;font-size:11px;color:#666;">
        La surface Var(e) ne dépend que de la <b>forme</b> du variogramme (portée, ratio c<sub>0</sub>/C), pas du palier C. Son <b>minimum (●)</b> est le meilleur modèle ; amenez-y le modèle courant (✚) via « Ajuster aux données ». Cherchez aussi moyenne(e<sup>s</sup>) ≈ 0 et variance(e<sup>s</sup>) ≈ 1.</p>
    `);

    this.plotRef = this.el.querySelector('.js-plot-ref');
    this.plotSurf = this.el.querySelector('.js-plot-surf');
    this.plotVario = this.el.querySelector('.js-plot-vario');
    this.plotCV = this.el.querySelector('.js-plot-cv');
    this.infoEl = this.el.querySelector('.js-info');
    this.ctrl = {
      mod: this.el.querySelector('.js-mod'), a: this.el.querySelector('.js-a'),
      r: this.el.querySelector('.js-r'), C: this.el.querySelector('.js-C'),
    };
    const update = debounce(() => this.refresh(), 250);
    for (const [key, dec] of [['a', 0], ['r', 2], ['C', 1]]) {
      this.on(this.ctrl[key], 'input', e => { this.el.querySelector(`.js-${key}v`).textContent = parseFloat(e.target.value).toFixed(dec); });
      this.on(this.ctrl[key], 'input', update);
    }
    this.on(this.ctrl.mod, 'change', () => { this._surface = null; this.refresh(); });
    this.on(this.el.querySelector('.js-fit'), 'click', () => {
      if (!this._surface || !this._surface.best) return;
      const b = this._surface.best;
      const C = Math.max(0.3, Math.min(3, variance(this.donnees.map(d => d.z))));
      this.ctrl.a.value = b.a;
      this.ctrl.r.value = b.ratio.toFixed(2);
      this.ctrl.C.value = C.toFixed(1);
      this.el.querySelector('.js-av').textContent = b.a;
      this.el.querySelector('.js-rv').textContent = b.ratio.toFixed(2);
      this.el.querySelector('.js-Cv').textContent = C.toFixed(1);
      this.refresh();
    });
    this.on(this.el.querySelector('.js-regen'), 'click', async () => {
      this._seed = Math.floor(Math.random() * 1e6); this._surface = null;
      await this._regenererDonnees(); this.refresh();
    });

    afficherChargementJusquaPret(this.el)
      .then(() => this._regenererDonnees())
      .then(() => this.refresh());
  }

  async _regenererDonnees() {
    const flat = await gpoly.simulerChamp('spherique', A_VRAI, RATIO_VRAI, this._seed, NGRID, 'gaussien', 5, 1);
    const F = []; for (let j = 0; j < NGRID; j++) { const row = []; for (let i = 0; i < NGRID; i++) row.push(flat[j * NGRID + i]); F.push(row); }
    this._field = F;
    this._xs = Array.from({ length: NGRID }, (_, i) => i + 0.5);
    let s = (this._seed ^ 0x9e3779b9) >>> 0;
    const rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };

    // NDATA cellules distinctes.
    const vus = new Set(), disp = [];
    while (disp.length < NDATA) {
      const i = Math.floor(rng() * NGRID), j = Math.floor(rng() * NGRID), key = j * NGRID + i;
      if (vus.has(key)) continue; vus.add(key);
      disp.push({ x: i + 0.5, y: j + 0.5, z: F[j][i] });
    }
    this.donnees = disp;
  }

  _structs() {
    const C = parseFloat(this.ctrl.C.value), ratio = parseFloat(this.ctrl.r.value);
    return { structs: [{ modele: this.ctrl.mod.value, palier: C * (1 - ratio), portee: parseFloat(this.ctrl.a.value) }], c0: C * ratio };
  }

  // Var(e) pour le modèle SÉLECTIONNÉ (Var(e) invariante au palier → C=1).
  async _varE(xd, zd, a, ratio) {
    try { const r = await gpoly.validationCroisee(xd, zd, [{ modele: this.ctrl.mod.value, palier: 1 - ratio, portee: a }], ratio, 'ordinaire'); return varOf(r.erreurs); }
    catch { return NaN; }
  }

  async _calculerSurface(xd, zd) {
    const Z = [];
    for (const ratio of R_SCAN) {
      const row = [];
      for (const a of A_SCAN) row.push(await this._varE(xd, zd, a, ratio));
      Z.push(row);
    }
    // Minimum grossier sur la grille de balayage.
    let mi = 0, mj = 0, mv = Infinity;
    Z.forEach((row, j) => row.forEach((v, i) => { if (Number.isFinite(v) && v < mv) { mv = v; mi = i; mj = j; } }));
    // Raffinement local pour que le marqueur tombe sur le vrai minimum de Var(e).
    let best = { a: A_SCAN[mi], ratio: R_SCAN[mj], v: mv };
    const aC = A_SCAN[mi], rC = R_SCAN[mj];
    for (let a = Math.max(4, aC - 2); a <= Math.min(28, aC + 2); a++) {
      for (let rr = Math.max(0, rC - 0.1); rr <= Math.min(0.6, rC + 0.1) + 1e-9; rr += 0.05) {
        const ratio = Math.round(rr * 100) / 100;
        const v = await this._varE(xd, zd, a, ratio);
        if (Number.isFinite(v) && v < best.v) best = { a, ratio, v };
      }
    }
    this._surface = { Z, best };
  }

  async refresh() {
    if (!this.donnees) return;
    const { structs, c0 } = this._structs();
    const xd = this.donnees.map(d => [d.x, d.y]), zd = this.donnees.map(d => d.z);

    let vcLOO;
    try {
      vcLOO = await gpoly.validationCroisee(xd, zd, structs, c0, 'ordinaire');
      vcLOO.varE = varOf(vcLOO.erreurs);
      vcLOO.rmse = Math.sqrt(moy(vcLOO.observees.map((o, i) => (o - vcLOO.estimations[i]) ** 2)));
    } catch (e) { this.afficherAvertissement('Erreur : ' + e.message); return; }

    const vexp = await gpoly.variogrammeScatter(xd, zd, 12, NGRID * 0.7);
    const lags = []; for (let i = 1; i <= 28; i++) lags.push(i);
    const gstruct = await gpoly.variogrammeTheorique(this.ctrl.mod.value, lags, parseFloat(this.ctrl.a.value), structs[0].palier);
    const gmod = gstruct.map(g => c0 + g);

    if (!window.Plotly) { this.afficherAvertissement('Plotly non chargé.'); return; }
    const cfg = { displaylogo: false, responsive: true, displayModeBar: false };

    // (1) Champ simulé + points.
    const fmin = Math.min(...this._field.flat()), fmax = Math.max(...this._field.flat());
    Plotly.react(this.plotRef, [
      { type: 'heatmap', z: this._field, x: this._xs, y: this._xs, colorscale: TURBO, zmin: fmin, zmax: fmax, colorbar: { thickness: 11, len: 0.82 } },
      { x: this.donnees.map(d => d.x), y: this.donnees.map(d => d.y), mode: 'markers', marker: { color: '#fff', size: 6, line: { color: '#000', width: 1 } }, showlegend: false, hoverinfo: 'skip' },
    ], {
      margin: { t: 26, l: 28, r: 56, b: 22 }, title: { text: `Champ simulé + ${NDATA} données`, font: { size: 12 }, y: 0.97 },
      xaxis: { range: [0, NGRID], showticklabels: false, scaleanchor: 'y', constrain: 'domain' },
      yaxis: { range: [0, NGRID], showticklabels: false },
    }, cfg);

    // (2) Surface Var(e) — minimum = meilleur modèle (mis en cache).
    if (!this._surface) {
      Plotly.react(this.plotSurf, [], { margin: { t: 26, l: 10, r: 10, b: 10 }, title: { text: 'Surface Var(e) — calcul…', font: { size: 12 } }, annotations: [{ x: 0.5, y: 0.5, xref: 'paper', yref: 'paper', text: 'Balayage des paramètres…', showarrow: false, font: { color: '#888' } }] }, cfg);
      await this._calculerSurface(xd, zd);
    }
    const sf = this._surface, best = sf.best;
    const aCur = parseFloat(this.ctrl.a.value), rCur = parseFloat(this.ctrl.r.value);
    const surfTraces = [
      { type: 'surface', x: A_SCAN, y: R_SCAN, z: sf.Z, colorscale: 'Viridis', showscale: false, opacity: 0.9 },
      { type: 'scatter3d', x: [best.a], y: [best.ratio], z: [best.v], mode: 'markers', name: 'minimum Var(e)', marker: { color: '#111', size: 6, symbol: 'circle' } },
      { type: 'scatter3d', x: [aCur], y: [rCur], z: [vcLOO.varE], mode: 'markers', name: 'modèle courant', marker: { color: '#1f8a4c', size: 6, symbol: 'cross' } },
    ];
    Plotly.react(this.plotSurf, surfTraces, {
      margin: { t: 24, l: 4, r: 4, b: 4 }, title: { text: 'Var(e) selon (a, c₀/C)', font: { size: 12 }, y: 0.98 },
      scene: {
        xaxis: { title: 'portée a' }, yaxis: { title: 'c₀/C' }, zaxis: { title: 'Var(e)' },
        camera: { eye: { x: 1.7, y: 1.5, z: 1.0 } },
      },
      legend: { orientation: 'h', y: 0, x: 0.5, xanchor: 'center', font: { size: 9 } },
    }, cfg);

    // (3) Variogramme.
    Plotly.react(this.plotVario, [
      { x: vexp.h, y: vexp.gamma, mode: 'markers', name: 'expérimental', marker: { color: '#0d4d92', size: 7 } },
      { x: lags, y: gmod, mode: 'lines', name: 'modèle', line: { color: '#c0392b', width: 2.5 } },
    ], {
      margin: { t: 26, l: 52, r: 14, b: 56 }, title: { text: 'Variogramme : expérimental vs modèle', font: { size: 12 }, y: 0.97 },
      xaxis: { title: { text: 'distance h', standoff: 8 }, range: [0, 29], automargin: true },
      yaxis: { title: { text: 'γ(h)', standoff: 8 }, rangemode: 'tozero', automargin: true },
      legend: { orientation: 'h', y: -0.28, x: 0.5, xanchor: 'center', font: { size: 9 } },
    }, cfg);

    // (4) Nuage de validation (leave-one-out).
    const zlo = Math.min(...vcLOO.observees, ...vcLOO.estimations), zhi = Math.max(...vcLOO.observees, ...vcLOO.estimations);
    Plotly.react(this.plotCV, [
      { x: vcLOO.estimations, y: vcLOO.observees, mode: 'markers', name: 'points', marker: { color: '#1f8a4c', size: 7, line: { color: '#fff', width: 0.8 } } },
      { x: [zlo, zhi], y: [zlo, zhi], mode: 'lines', name: 'y = x', line: { color: '#c0392b', dash: 'dash', width: 1.5 } },
    ], {
      margin: { t: 26, l: 52, r: 14, b: 56 }, title: { text: 'Validation croisée (leave-one-out)', font: { size: 12 }, y: 0.97 },
      xaxis: { title: { text: 'Z* estimé (donnée retirée)', standoff: 8 }, automargin: true },
      yaxis: { title: { text: 'Z observé', standoff: 8 }, scaleanchor: 'x', automargin: true },
      legend: { orientation: 'h', y: -0.28, x: 0.5, xanchor: 'center', font: { size: 9 } },
    }, cfg);

    // Diagnostic.
    const okM = Math.abs(vcLOO.moyenne_e_std) < 0.1, okV = vcLOO.var_e_std > 0.7 && vcLOO.var_e_std < 1.4;
    this.infoEl.innerHTML =
      `moyenne(e<sup>s</sup>) = <b>${vcLOO.moyenne_e_std.toFixed(3)}</b> ${okM ? '✓' : '⚠'} · ` +
      `variance(e<sup>s</sup>) = <b>${vcLOO.var_e_std.toFixed(3)}</b> ${okV ? '✓' : '⚠'} · ` +
      `Var(e) = <b>${vcLOO.varE.toFixed(3)}</b> · RMSE = <b>${vcLOO.rmse.toFixed(3)}</b><br>` +
      `<span style="font-size:.78rem">Meilleur modèle (min Var(e)) : a = <b>${best.a}</b>, c₀/C = <b>${best.ratio.toFixed(2)}</b> — cliquez « Ajuster aux données »</span>`;
  }

  cleanup() {
    if (window.Plotly) [this.plotRef, this.plotSurf, this.plotVario, this.plotCV].forEach(p => p && Plotly.purge(p));
  }
}

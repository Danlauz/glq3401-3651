// scripts/geostat-js/widgets/c07_erreurs.js
// -----------------------------------------------------------------------------
// Widget C07 — Atelier 7.9 « Erreurs et effets géologiques » (calque du notebook
// Chap6_ErreurEffet). Un menu propose 8 effets qui biaisent le variogramme
// expérimental ; chacun compare une situation de RÉFÉRENCE à une situation
// PERTURBÉE. Le scénario « Données extrêmes » montre aussi l'estimateur ROBUSTE
// (Cressie-Hawkins) face à Matheron (ce qui fusionne l'ancien atelier robuste).
//
// Simulation et variogrammes : geostat_polymtl via gpoly. Les perturbations
// (bruit de position/mesure, tendance, plissement…) sont des manipulations de
// données, pas des algorithmes de la librairie.
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

const TURBO = [[0,'rgb(48,18,59)'],[0.25,'rgb(33,144,255)'],[0.5,'rgb(131,246,88)'],[0.75,'rgb(248,186,56)'],[1,'rgb(122,4,3)']];
const COL = { ref: '#0173B2', pert: '#CC0000', vert: '#2e7d32', gris: '#777' };
const N2 = 64, STEP = 3, NL = 12, HMAX = 60;

export default class C07Erreurs extends Widget {
  render() {
    this.el.insertAdjacentHTML('beforeend', `
      <div class="gw-controls" style="display:flex;flex-wrap:wrap;gap:14px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.84rem;">
        <label>Effet <select class="js-scen" style="font-size:.85rem;">
          <option value="domaines">Domaines géologiques mélangés</option>
          <option value="position">Erreur de localisation des forages</option>
          <option value="mesure">Erreur de mesure</option>
          <option value="masquage">Masquage directionnel (anisotropie)</option>
          <option value="plissement">Plissement</option>
          <option value="extremes">Données extrêmes</option>
          <option value="pas">Pas d'échantillonnage variable</option>
          <option value="reech">Ré-échantillonnage des zones riches</option>
        </select></label>
        <button class="js-new" type="button" style="font-size:.78rem;padding:3px 9px;background:#3a3632;color:#fff;border:none;border-radius:4px;cursor:pointer;">Resimuler</button>
      </div>
      <div class="js-plot" style="height:400px"></div>
      <div class="js-info" style="padding:.45rem 1rem;margin-top:4px;background:#eef2e8;border:1px solid #b8c8a8;border-radius:6px;font-size:.82rem;color:#4a6a3a;text-align:center;"></div>
    `);
    this.plot = this.el.querySelector('.js-plot');
    this.infoEl = this.el.querySelector('.js-info');
    this.scen = this.el.querySelector('.js-scen');
    this.seed = 5;
    this.on(this.scen, 'change', () => this._run());
    this.on(this.el.querySelector('.js-new'), 'click', () => { this.seed++; this._run(); });
    afficherChargementJusquaPret(this.el).then(() => this._run());
  }

  // Champ 2D + grille régulière de points échantillonnés.
  async _grille(a, seed, pepite = 0.05) {
    const champ = await gpoly.simulerChamp('spherique', a, pepite, seed, N2, 'gaussien', 0.0, 1.0);
    const pts = [];
    for (let y = STEP; y < N2 - STEP; y += STEP) for (let x = STEP; x < N2 - STEP; x += STEP) pts.push([x, y, champ[y * N2 + x]]);
    return pts;
  }
  _rng(seed) { let s = (seed * 2654435761) >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  _randn(r) { const u = Math.max(1e-9, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  _vario(coords, valeurs) { return gpoly.variogrammeScatter(coords, valeurs, NL, HMAX); }

  async _run() {
    const sc = this.scen.value;
    try { await this['_sc_' + sc](); }
    catch (e) { this.afficherAvertissement('Erreur : ' + e.message); }
  }

  // Trace générique : panneau gauche (carte/profil) + panneau droit (variogrammes).
  _draw(left, series, info, leftKind = 'map', leftAxis = {}) {
    const traces = [];
    for (const t of left) traces.push({ ...t, xaxis: 'x', yaxis: 'y' });
    for (const s of series) traces.push({ x: s.h, y: s.gamma, mode: 'lines+markers', name: s.name, line: { color: s.color, width: 2, dash: s.dash || 'solid' }, marker: { color: s.color, size: 6, symbol: s.symbol || 'circle' }, xaxis: 'x2', yaxis: 'y2' });
    const xa = leftKind === 'map'
      ? { domain: [0, 0.42], anchor: 'y', showticklabels: false, ...leftAxis.x }
      : { domain: [0, 0.42], anchor: 'y', title: { text: 'x', standoff: 4 }, ...leftAxis.x };
    const ya = leftKind === 'map'
      ? { domain: [0, 1], anchor: 'x', showticklabels: false, scaleanchor: 'x', ...leftAxis.y }
      : { domain: [0, 1], anchor: 'x', ...leftAxis.y };
    Plotly.react(this.plot, traces, {
      margin: { t: 26, l: 44, r: 12, b: 44 },
      legend: { orientation: 'h', y: -0.16, x: 0.78, xanchor: 'center', font: { size: 9 } },
      annotations: [{ text: leftKind === 'map' ? 'Carte' : 'Profil', x: 0.2, y: 1.0, xref: 'paper', yref: 'paper', showarrow: false, font: { size: 11, color: '#666' }, xanchor: 'center', yanchor: 'bottom' },
        { text: 'Variogrammes', x: 0.8, y: 1.0, xref: 'paper', yref: 'paper', showarrow: false, font: { size: 11, color: '#666' }, xanchor: 'center', yanchor: 'bottom' }],
      xaxis: xa, yaxis: ya,
      xaxis2: { domain: [0.55, 1], anchor: 'y2', title: { text: 'Distance h', standoff: 4 }, range: [0, HMAX] },
      yaxis2: { domain: [0, 1], anchor: 'x2', title: 'γ(h)', rangemode: 'tozero' },
    }, { displaylogo: false, responsive: true });
    this.infoEl.innerHTML = info;
  }

  _mapTrace(pts, name = '') {
    return { type: 'scatter', mode: 'markers', x: pts.map(p => p[0]), y: pts.map(p => p[1]),
      marker: { color: pts.map(p => p[2]), colorscale: TURBO, size: 8, line: { color: '#0003', width: 0.3 } }, name, hoverinfo: 'skip', showlegend: false };
  }

  // ---- 1. Domaines géologiques mélangés ----
  async _sc_domaines() {
    const c1 = await this._grille(10, this.seed);
    const c2 = await this._grille(35, this.seed + 1);
    const half = Math.floor(N2 / 2);
    const dom1 = c1.filter(p => p[0] < half);
    const dom2 = c2.filter(p => p[0] >= half).map(p => [p[0], p[1], p[2] + 0.0]);
    const glob = dom1.concat(dom2);
    const [v1, v2, vg] = await Promise.all([
      this._vario(dom1.map(p => [p[0], p[1]]), dom1.map(p => p[2])),
      this._vario(dom2.map(p => [p[0], p[1]]), dom2.map(p => p[2])),
      this._vario(glob.map(p => [p[0], p[1]]), glob.map(p => p[2])),
    ]);
    const map = [this._mapTrace(glob), { type: 'scatter', mode: 'lines', x: [half, half], y: [0, N2], line: { color: '#000', width: 2 }, showlegend: false, hoverinfo: 'skip' }];
    this._draw(map, [
      { ...v1, name: 'Domaine 1 (a court)', color: COL.ref },
      { ...v2, name: 'Domaine 2 (a long)', color: COL.vert },
      { ...vg, name: 'Global (mélangé)', color: COL.pert, dash: 'dashdot' },
    ], `Le variogramme <b>global</b> mélange deux structures et donne une courbe « lisse » trompeuse, qui ne décrit aucun des deux domaines.`);
  }

  // ---- 2. Erreur de localisation ----
  async _sc_position() {
    const pts = await this._grille(22, this.seed);
    const r = this._rng(this.seed + 7), spos = 2.5;
    const coT = pts.map(p => [p[0], p[1]]);
    const coN = pts.map(p => [p[0] + spos * this._randn(r), p[1] + spos * this._randn(r)]);
    const val = pts.map(p => p[2]);
    const [vr, vp] = await Promise.all([this._vario(coT, val), this._vario(coN, val)]);
    const map = [
      { type: 'scatter', mode: 'markers', x: coT.map(c => c[0]), y: coT.map(c => c[1]), marker: { color: 'rgba(0,0,0,0)', size: 8, line: { color: '#000', width: 1 } }, name: 'positions vraies', hoverinfo: 'skip', showlegend: false },
      this._mapTrace(coN.map((c, i) => [c[0], c[1], val[i]])),
    ];
    this._draw(map, [
      { ...vr, name: 'Sans erreur', color: COL.ref },
      { ...vp, name: `Avec erreur σ=${spos}`, color: COL.pert, symbol: 'square' },
    ], `Une erreur sur la <b>position</b> des forages fait apparaître un <b>effet de pépite</b> : γ(h) ne part plus de 0.`);
  }

  // ---- 3. Erreur de mesure ----
  async _sc_mesure() {
    const pts = await this._grille(22, this.seed);
    const r = this._rng(this.seed + 3), sval = 0.8;
    const co = pts.map(p => [p[0], p[1]]);
    const vr = pts.map(p => p[2]);
    const vp = pts.map(p => p[2] + sval * this._randn(r));
    const [a, b] = await Promise.all([this._vario(co, vr), this._vario(co, vp)]);
    this._draw([this._mapTrace(pts.map((p, i) => [p[0], p[1], vp[i]]))], [
      { ...a, name: 'Données exactes', color: COL.ref },
      { ...b, name: `Avec bruit de mesure σ=${sval}`, color: COL.pert, symbol: 'square' },
    ], `Une erreur de <b>mesure</b> (bruit sur les valeurs) ajoute aussi un <b>effet de pépite</b> au variogramme.`);
  }

  // ---- 4. Masquage directionnel (anisotropie) ----
  async _sc_masquage() {
    const pts = await this._grille(22, this.seed);
    const co = pts.map(p => [p[0], p[1]]);
    const coS = pts.map(p => [p[0] / 3, p[1]]);   // étirement -> anisotropie apparente
    const val = pts.map(p => p[2]);
    const [vi, va] = await Promise.all([this._vario(co, val), this._vario(coS, val)]);
    this._draw([this._mapTrace(pts)], [
      { ...vi, name: 'Variogramme isotrope', color: COL.ref },
      { ...va, name: 'Variogramme (axe étiré)', color: COL.pert, symbol: 'square' },
    ], `Calculer un variogramme <b>omnidirectionnel</b> sur un phénomène anisotrope <b>masque</b> la vraie continuité directionnelle.`);
  }

  // ---- 5. Plissement ----
  async _sc_plissement() {
    const pts = await this._grille(22, this.seed);
    const amp = 14, wl = 30;
    const co = pts.map(p => [p[0], p[1]]);
    const coP = pts.map(p => [p[0], p[1] + amp * Math.sin(2 * Math.PI * p[0] / wl)]);
    const val = pts.map(p => p[2]);
    const [a, b] = await Promise.all([this._vario(co, val), this._vario(coP, val)]);
    this._draw([this._mapTrace(coP.map((c, i) => [c[0], c[1], val[i]]))], [
      { ...a, name: 'Sans plissement', color: COL.ref },
      { ...b, name: 'Avec plissement', color: COL.pert, symbol: 'square' },
    ], `Un <b>plissement</b> non corrigé déforme les distances entre points et fausse le variogramme (déplisser avant le calcul).`);
  }

  // ---- 6. Données extrêmes ----
  async _sc_extremes() {
    const N = 400;
    const field = Array.from(await gpoly.simulerChamp1D('spherique', 80, 0.05, this.seed, N, 'gaussien', 0.0, 1.0));
    const r = this._rng(this.seed + 9);
    const nOut = 12, outIdx = new Set();
    while (outIdx.size < nOut) outIdx.add(Math.floor(r() * N));
    const withOut = field.slice();
    for (const i of outIdx) withOut[i] += (r() > 0.5 ? 1 : -1) * (4 + 3 * r());
    const co = field.map((_, i) => [i, 0]);
    const [vClean, vMath] = await Promise.all([
      gpoly.variogrammeScatter(co, field, 18, 250),
      gpoly.variogrammeScatter(co, withOut, 18, 250),
    ]);
    const xo = [...outIdx], yo = xo.map(i => withOut[i]);
    const prof = [
      { type: 'scatter', mode: 'lines', x: field.map((_, i) => i), y: withOut, line: { color: '#bbb', width: 1 }, showlegend: false, hoverinfo: 'skip' },
      { type: 'scatter', mode: 'markers', x: xo, y: yo, marker: { color: COL.pert, size: 7, symbol: 'x' }, name: 'extrêmes', showlegend: false, hoverinfo: 'skip' },
    ];
    this._draw(prof, [
      { ...vClean, name: 'Sans extrêmes (réf.)', color: COL.ref },
      { ...vMath, name: 'Avec extrêmes', color: COL.pert, symbol: 'square' },
    ], `Quelques valeurs <b>extrêmes</b> gonflent le variogramme expérimental ; selon leur position (centre ou bords du domaine), elles induisent une tendance décroissante ou croissante.`, 'profil', { x: { range: [0, 250] }, y: { range: [-4, 4] } });
  }

  // ---- 7. Pas d'échantillonnage variable (données 1D du notebook) ----
  async _sc_pas() {
    const xA = [], zA = [0, 1, 2, 3, 2, 1, 0, 1, 2]; for (let i = 0; i < 9; i++) xA.push(i * 2);          // pas 2
    const xB = [], zB = [4, 3, 4, 5, 6, 4, 5, 6, 7, 5, 4, 3, 6, 4, 5, 5, 4, 5, 0]; for (let i = 0; i < zB.length; i++) xB.push(20 + i); // pas 1
    const coA = xA.map(x => [x, 0]), coB = xB.map(x => [x, 0]);
    const coG = coA.concat(coB), zG = zA.concat(zB);
    const [vA, vB, vG] = await Promise.all([
      gpoly.variogrammeScatter(coA, zA, 8, 14),
      gpoly.variogrammeScatter(coB, zB, 10, 14),
      gpoly.variogrammeScatter(coG, zG, 12, 30),
    ]);
    const prof = [
      { type: 'scatter', mode: 'lines+markers', x: xA, y: zA, line: { color: COL.ref }, marker: { size: 5 }, name: 'Zone A (pas 2)', showlegend: false },
      { type: 'scatter', mode: 'lines+markers', x: xB.map(x => x - 20), y: zB, line: { color: COL.pert }, marker: { size: 5 }, name: 'Zone B (pas 1)', showlegend: false },
    ];
    this._draw(prof, [
      { ...vA, name: 'Zone A (pas 2)', color: COL.ref },
      { ...vB, name: 'Zone B (pas 1)', color: COL.pert, symbol: 'square' },
      { ...vG, name: 'A + B (mélangé)', color: COL.gris, dash: 'dashdot', symbol: 'diamond' },
    ], `Mélanger des zones de <b>pas d'échantillonnage différents</b> et de variabilités différentes brouille le variogramme global.`, 'profil', { x: { range: [-1, 20] }, y: { range: [-1, 8] } });
  }

  // ---- 8. Ré-échantillonnage des zones riches ----
  async _sc_reech() {
    const pts = await this._grille(20, this.seed);
    const co = pts.map(p => [p[0], p[1]]), val = pts.map(p => p[2]);
    // doublons faibles sur les plus fortes valeurs
    const r = this._rng(this.seed + 11);
    const order = pts.map((p, i) => i).sort((a, b) => val[b] - val[a]).slice(0, 18);
    const coD = co.slice(), vD = val.slice();
    const dx = [], dy = [], dz = [];
    for (const i of order) for (let k = 0; k < 6; k++) {
      const x = co[i][0] + 1.5 * this._randn(r), y = co[i][1] + 1.5 * this._randn(r), z = val[i] - (1.5 + 2 * r());
      coD.push([x, y]); vD.push(z); dx.push(x); dy.push(y); dz.push(z);
    }
    const [a, b] = await Promise.all([this._vario(co, val), this._vario(coD, vD)]);
    const map = [this._mapTrace(pts),
      { type: 'scatter', mode: 'markers', x: dx, y: dy, marker: { color: '#000', size: 6, symbol: 'x' }, name: 'doublons faibles', showlegend: false, hoverinfo: 'skip' }];
    this._draw(map, [
      { ...a, name: 'Champ original', color: COL.ref },
      { ...b, name: '+ doublons faibles', color: COL.pert, symbol: 'square' },
    ], `Re-forer les <b>zones riches</b> en y ajoutant des valeurs faibles (doublons) biaise le variogramme et l'histogramme.`);
  }

  cleanup() { if (this.plot && window.Plotly) Plotly.purge(this.plot); }
}

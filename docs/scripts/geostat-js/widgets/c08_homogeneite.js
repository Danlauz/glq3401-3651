// scripts/geostat-js/widgets/c08_homogeneite.js
// -----------------------------------------------------------------------------
// Widget C08 — Atelier « Homogénéité du minerai » (application de la variance de
// dispersion, cf. GLQ3401 C7 §7-8). On compare des stratégies d'exploitation
// par leur variance de dispersion D²(v|V) = σ²_v − σ²_V : plus D² est faible,
// plus la teneur envoyée au concentrateur est stable dans le temps.
//
// Scénarios : 1 pelle · 2 pelles éloignées · pile d'homogénéisation (taille
// réglable). Règle simple (slide 48) : l'orientation de la bande de chargement
// par rapport à l'anisotropie change D². Un critère de tolérance (±%) et des
// intervalles de confiance montrent quel scénario reste dans la cible.
//
// σ²_v et σ²_V via geostat_polymtl (varianceBlocQuadrature, anisotrope). Les
// courbes teneur-temps sont une illustration (bruit gaussien d'écart-type √D²).
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

const VLX = 120, VLY = 50;          // domaine mensuel V
const BAND_L = 40, BAND_W = 5;      // bande journalière (aire constante)
const NJ = 30, MEAN = 5;            // jours + teneur moyenne (%)
const COLS = { un: '#CC0000', deux: '#ea8f1e', pile: '#16a34a' };

export default class C08Homogeneite extends Widget {
  render() {
    const id = this.el.id;
    this.el.insertAdjacentHTML('beforeend', `
      <style>
        #${id} .ch-grp{display:flex;flex-wrap:wrap;gap:14px;align-items:center;padding:6px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;margin-bottom:6px;}
        #${id} .ch-grp b{font-size:.78rem;color:#555;}
        #${id} .ch-grp label{display:inline-flex;align-items:center;gap:6px;}
        #${id} .ch-seg{display:inline-flex;border:1px solid #c7ccd1;border-radius:6px;overflow:hidden;}
        #${id} .ch-seg button{border:none;padding:4px 10px;font-size:.78rem;cursor:pointer;background:#fff;color:#333;font-weight:600;}
        #${id} .ch-seg button.on{background:#0d4d92;color:#fff;}
        #${id} .ch-recap{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:6px;}
        #${id} .ch-pill{padding:6px 12px;border-radius:8px;font-size:.84rem;border:1px solid;font-family:'JetBrains Mono',monospace;}
      </style>
      <div class="ch-grp">
        <b>Variogramme</b>
        <label>Palier C <input type="range" class="js-c" min="1" max="10" value="5" step="0.5" style="width:84px"><span class="js-cv">5</span></label>
        <label><span>a<sub>x</sub></span> <input type="range" class="js-ax" min="10" max="120" value="100" step="5" style="width:84px"><span class="js-axv">100</span></label>
        <label><span>a<sub>y</sub></span> <input type="range" class="js-ay" min="10" max="120" value="25" step="5" style="width:84px"><span class="js-ayv">25</span></label>
        <label>Dispersion visée D² <input type="range" class="js-cible" min="0.25" max="9" value="1" step="0.25" style="width:84px"><span class="js-ciblev">1</span>%²</label>
      </div>
      <div class="ch-grp">
        <b>Sens de chargement</b>
        <span class="ch-seg">
          <button type="button" data-o="x" class="on">∥ x (large)</button>
          <button type="button" data-o="y">∥ y (haute)</button>
        </span>
        <b style="margin-left:12px;">Pile</b>
        <label>capacité <input type="range" class="js-pile" min="0" max="100" value="35" step="5" style="width:110px"><span class="js-pilev">35</span>%</label>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1.05fr;gap:12px;align-items:start;">
        <div class="js-map" style="height:330px"></div>
        <div class="js-curve" style="height:330px"></div>
      </div>
      <div class="ch-recap">
        <span class="ch-pill" style="border-color:#e7a3a3;background:#fdecec;color:${COLS.un}">1 pelle · D² = <b class="js-d1">—</b></span>
        <span class="ch-pill" style="border-color:#f0c48a;background:#fdf3e3;color:${COLS.deux}">2 pelles · D² = <b class="js-d2">—</b></span>
        <span class="ch-pill" style="border-color:#a7d7b4;background:#e9f6ee;color:${COLS.pile}">Pile · D² = <b class="js-dp">—</b></span>
      </div>
    `);

    this.mapEl = this.el.querySelector('.js-map');
    this.curveEl = this.el.querySelector('.js-curve');
    this.cEl = this.el.querySelector('.js-c');
    this.axEl = this.el.querySelector('.js-ax');
    this.ayEl = this.el.querySelector('.js-ay');
    this.cibleEl = this.el.querySelector('.js-cible');
    this.pileEl = this.el.querySelector('.js-pile');
    this.orient = 'x';

    this.z = []; let s = 12345;
    const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    for (let i = 0; i < NJ; i++) this.z.push(Math.sqrt(-2 * Math.log(Math.max(1e-9, rnd()))) * Math.cos(2 * Math.PI * rnd()));

    for (const b of this.el.querySelectorAll('.ch-seg button')) {
      this.on(b, 'click', () => {
        this.orient = b.dataset.o;
        for (const x of this.el.querySelectorAll('.ch-seg button')) x.classList.toggle('on', x === b);
        this._maj();
      });
    }
    const fmt = { c: 1, ax: 0, ay: 0, cible: 2, pile: 0 };
    for (const [el, k] of [[this.cEl, 'c'], [this.axEl, 'ax'], [this.ayEl, 'ay'], [this.cibleEl, 'cible'], [this.pileEl, 'pile']]) {
      this.on(el, 'input', e => { this.el.querySelector(`.js-${k}v`).textContent = parseFloat(e.target.value).toFixed(fmt[k]); });
      this.on(el, 'change', () => this._maj());
    }
    afficherChargementJusquaPret(this.el).then(() => this._maj());
  }

  _band() { return this.orient === 'x' ? [BAND_L, BAND_W] : [BAND_W, BAND_L]; }
  // La pile est bâtie le long du sens de chargement : élongée en x (pleine
  // largeur, hauteur réduite) ou en y (pleine hauteur, largeur réduite). Sa
  // forme — donc son efficacité σ²_pile — dépend ainsi de l'orientation.
  _pileDims() {
    const p = parseFloat(this.pileEl.value) / 100;
    return this.orient === 'x' ? [VLX, Math.max(BAND_W, VLY * p)] : [Math.max(BAND_W, VLX * p), VLY];
  }

  async _maj() {
    const C = parseFloat(this.cEl.value), ax = parseFloat(this.axEl.value), ay = parseFloat(this.ayEl.value);
    const [vx, vy] = this._band(), [px, py] = this._pileDims();
    const sigma2 = (lx, ly) => gpoly.varianceBlocQuadrature('surface', lx, ly, 0, C, ax, ay, ax, 'spherique', 8).then(r => r.variance);
    let sV, sv, sp;
    try { [sV, sv, sp] = await Promise.all([sigma2(VLX, VLY), sigma2(vx, vy), sigma2(px, py)]); }
    catch (e) { this.afficherAvertissement('Erreur calcul : ' + e.message); return; }

    const d1 = Math.max(0, sv - sV);
    const d2 = Math.max(0, 0.5 * (sv - sV));
    const dp = Math.max(0, sp - sV);

    this.el.querySelector('.js-d1').textContent = d1.toFixed(3);
    this.el.querySelector('.js-d2').textContent = d2.toFixed(3);
    this.el.querySelector('.js-dp').textContent = dp.toFixed(3);

    this._drawMap(ax, ay, px, py, vx, vy);
    this._drawCurves(d1, d2, dp, parseFloat(this.cibleEl.value));
  }

  _drawMap(ax, ay, px, py, vx, vy) {
    if (!window.Plotly) { this.afficherAvertissement('Plotly non chargé.'); return; }
    // Ellipse d'anisotropie : À DROITE, hors de la boîte V.
    const ecx = VLX + 16, ecy = 30, R = 7, ratio = Math.min(ax, ay) / Math.max(ax, ay);
    const along = ax >= ay ? 'x' : 'y';
    const ex = [], ey = [];
    for (let k = 0; k <= 40; k++) { const t = 2 * Math.PI * k / 40, a = R * Math.cos(t), b = R * ratio * Math.sin(t); if (along === 'x') { ex.push(ecx + a); ey.push(ecy + b); } else { ex.push(ecx + b); ey.push(ecy + a); } }
    // Pile : EN DESSOUS de V, hors de la boîte.
    const pgap = 10, py0 = -(pgap + py), py1 = -pgap, px0 = VLX / 2 - px / 2, px1 = VLX / 2 + px / 2;

    Plotly.react(this.mapEl, [
      { x: ex, y: ey, mode: 'lines', fill: 'toself', fillcolor: 'rgba(13,77,146,0.12)', line: { color: '#0d4d92', width: 1.4 }, hoverinfo: 'skip', showlegend: false },
    ], {
      margin: { t: 24, l: 28, r: 12, b: 22 },
      title: { text: 'Domaine, bande et pile', font: { size: 12 } },
      shapes: [
        { type: 'rect', x0: 0, y0: 0, x1: VLX, y1: VLY, line: { color: '#444', width: 2 }, fillcolor: 'rgba(218,165,32,0.10)' },
        { type: 'rect', x0: VLX / 2 - vx / 2, y0: VLY / 2 - vy / 2, x1: VLX / 2 + vx / 2, y1: VLY / 2 + vy / 2, line: { color: COLS.un, width: 2 }, fillcolor: 'rgba(204,0,0,0.25)' },
        { type: 'rect', x0: px0, y0: py0, x1: px1, y1: py1, line: { color: COLS.pile, width: 1.5, dash: 'dot' }, fillcolor: 'rgba(22,163,74,0.12)' },
      ],
      annotations: [
        { x: 6, y: VLY - 5, text: 'V (mois)', showarrow: false, font: { size: 10, color: '#8a6d1a' }, xanchor: 'left' },
        { x: VLX / 2, y: VLY / 2, text: 'v (jour)', showarrow: false, font: { size: 10, color: '#7a0000' } },
        { x: VLX / 2, y: (py0 + py1) / 2, text: 'pile', showarrow: false, font: { size: 10, color: COLS.pile } },
        { x: ecx, y: ecy - R - 4, text: 'aniso.', showarrow: false, font: { size: 8, color: '#0d4d92' } },
      ],
      xaxis: { range: [-6, VLX + 30], title: { text: 'x', standoff: 2 }, tickfont: { size: 9 }, zeroline: false, constrain: 'domain' },
      yaxis: { range: [py0 - 6, VLY + 6], title: { text: 'y', standoff: 2 }, tickfont: { size: 9 }, zeroline: false, scaleanchor: 'x', constrain: 'domain' },
      showlegend: false,
    }, { displaylogo: false, responsive: true, displayModeBar: false });
  }

  _drawCurves(d1, d2, dp, cible) {
    if (!window.Plotly) return;
    const t = Array.from({ length: NJ }, (_, i) => i + 1);
    const serie = (d) => this.z.map(z => MEAN + Math.sqrt(d) * z);
    const data = [], annos = [];
    const axes = [['y', d1, '1 pelle', COLS.un], ['y2', d2, '2 pelles', COLS.deux], ['y3', dp, 'Pile', COLS.pile]];
    for (const [ya, d, nom, col] of axes) {
      data.push({ x: t, y: serie(d), mode: 'lines', line: { color: col, width: 1.6 }, xaxis: 'x', yaxis: ya, showlegend: false });
      const ok = d <= cible;
      annos.push({ text: `${nom} — D²=${d.toFixed(2)}%² ${ok ? '✓ cible atteinte' : '✗ hors cible'}`, x: 0.01, y: 1.0, xref: 'paper', yref: `${ya} domain`, showarrow: false, font: { size: 9, color: col }, xanchor: 'left' });
    }
    Plotly.react(this.curveEl, data, {
      margin: { t: 30, l: 38, r: 10, b: 32 },
      title: { text: `Teneur au concentrateur · cible D² ≤ ${cible.toFixed(2)}%²`, font: { size: 11 } },
      showlegend: false, annotations: annos,
      xaxis: { domain: [0, 1], anchor: 'y3', title: { text: 'Jour', standoff: 2 }, tickfont: { size: 8 }, range: [1, NJ] },
      yaxis: { domain: [0.69, 1], range: [MEAN - 6, MEAN + 6], tickfont: { size: 8 }, zeroline: false },
      yaxis2: { domain: [0.35, 0.66], range: [MEAN - 6, MEAN + 6], tickfont: { size: 8 }, zeroline: false },
      yaxis3: { domain: [0, 0.31], range: [MEAN - 6, MEAN + 6], tickfont: { size: 8 }, zeroline: false },
    }, { displaylogo: false, responsive: true });
  }

  cleanup() {
    if (window.Plotly) {
      if (this.mapEl) Plotly.purge(this.mapEl);
      if (this.curveEl) Plotly.purge(this.curveEl);
    }
  }
}

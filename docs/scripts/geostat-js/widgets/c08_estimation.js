// scripts/geostat-js/widgets/c08_estimation.js
// -----------------------------------------------------------------------------
// Widget C08 — Atelier « Variance d'estimation d'un bloc » (mode comparaison,
// placement libre). Illustre la formule
//   σ²_E = 2 Σ λ_i γ̄(x_i,V) − γ̄(V,V) − ΣΣ λ_i λ_j γ̄(x_i,x_j)
// (variance de krigeage du bloc). L'utilisateur place des données LIBREMENT (clic
// n'importe où) dans DEUX configurations — ROUGE et BLEU — et compare en direct
// laquelle réduit le plus la variance d'estimation. Clic sur un point = retrait.
//
// Paramètres réglables : portée du modèle, taille du bloc, taille du domaine.
// Toute la mathématique passe par geostat_polymtl.kriging (krigeage de bloc).
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

const DISC = [4, 4], PEPITE = 0.1;
const COL = { red: '#CC0000', blue: '#1f6fd6' };
const SEUIL_FRAC = 0.03;   // rayon de retrait = 3 % du domaine

export default class C08Estimation extends Widget {
  render() {
    const id = this.el.id;
    this.el.insertAdjacentHTML('beforeend', `
      <style>
        #${id} .ce-grp{display:flex;flex-wrap:wrap;gap:14px;align-items:center;padding:6px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;margin-bottom:6px;}
        #${id} .ce-grp label{display:inline-flex;align-items:center;gap:6px;}
        #${id} .ce-seg{display:inline-flex;border:1px solid #c7ccd1;border-radius:6px;overflow:hidden;}
        #${id} .ce-seg button{border:none;padding:4px 12px;font-size:.8rem;cursor:pointer;background:#fff;color:#333;font-weight:600;}
        #${id} .ce-seg button.on[data-c="red"]{background:${COL.red};color:#fff;}
        #${id} .ce-seg button.on[data-c="blue"]{background:${COL.blue};color:#fff;}
        #${id} .ce-btn{font-size:.76rem;padding:4px 10px;background:#3a3632;color:#fff;border:none;border-radius:4px;cursor:pointer;}
        #${id} .js-map{cursor:crosshair;}
        #${id} .ce-out{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:6px;}
        #${id} .ce-card{padding:8px 12px;border-radius:8px;text-align:center;border:1px solid;}
        #${id} .ce-card.red{background:#fdecec;border-color:#e7a3a3;}
        #${id} .ce-card.blue{background:#e9f1fb;border-color:#a3c2e7;}
        #${id} .ce-card b{font-size:1.5rem;font-family:'JetBrains Mono',monospace;}
        #${id} .ce-card.red b{color:${COL.red};}
        #${id} .ce-card.blue b{color:${COL.blue};}
        #${id} .ce-verdict{grid-column:1 / -1;text-align:center;font-size:.9rem;padding:6px;background:#f3f5f8;border:1px solid #d6dde6;border-radius:8px;}
      </style>
      <div class="ce-grp">
        <span>J'ajoute en :</span>
        <span class="ce-seg">
          <button type="button" data-c="red" class="on">Rouge</button>
          <button type="button" data-c="blue">Bleu</button>
        </span>
        <button class="js-clear ce-btn" type="button">Tout effacer</button>
      </div>
      <div class="ce-grp">
        <label><span>Portée a<sub>g</sub></span> <input type="range" class="js-a" min="10" max="100" value="40" step="5" style="width:110px"><span class="js-av">40</span></label>
        <label><span>Anisotropie a<sub>p</sub>/a<sub>g</sub></span> <input type="range" class="js-aniso" min="0.2" max="1" value="1" step="0.1" style="width:110px"><span class="js-anisov">1.0</span></label>
        <label><span>Angle θ</span> <input type="range" class="js-ang" min="0" max="180" value="0" step="5" style="width:110px"><span class="js-angv">0</span></label>
      </div>
      <div class="ce-grp">
        <label>Taille du bloc <input type="range" class="js-bloc" min="10" max="60" value="30" step="2" style="width:120px"><span class="js-blocv">30</span></label>
        <label>Taille du domaine <input type="range" class="js-dom" min="60" max="160" value="100" step="10" style="width:120px"><span class="js-domv">100</span></label>
      </div>
      <p style="margin:0 2px 6px;font-size:.78rem;color:#666;">Cliquez n'importe où pour placer une donnée · cliquez un point pour le retirer.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start;">
        <div class="js-map" style="height:380px"></div>
        <div class="js-curve" style="height:380px"></div>
      </div>
      <div class="ce-out">
        <div class="ce-card red">Config rouge · <span class="js-nr">0</span> donnée(s)<br>σ²<sub>E</sub> = <b class="js-resr">—</b></div>
        <div class="ce-card blue">Config bleue · <span class="js-nb">0</span> donnée(s)<br>σ²<sub>E</sub> = <b class="js-resb">—</b></div>
      </div>
    `);

    this.mapEl = this.el.querySelector('.js-map');
    this.curveEl = this.el.querySelector('.js-curve');
    this.aEl = this.el.querySelector('.js-a');
    this.anisoEl = this.el.querySelector('.js-aniso');
    this.angEl = this.el.querySelector('.js-ang');
    this.blocEl = this.el.querySelector('.js-bloc');
    this.domEl = this.el.querySelector('.js-dom');
    this.set = { red: [], blue: [] };   // tableaux de [x, y]
    this.cur = 'red';
    this.clickBound = false;

    for (const b of this.el.querySelectorAll('.ce-seg button')) {
      this.on(b, 'click', () => {
        this.cur = b.dataset.c;
        for (const x of this.el.querySelectorAll('.ce-seg button')) x.classList.toggle('on', x === b);
      });
    }
    this.on(this.aEl, 'input', e => { this.el.querySelector('.js-av').textContent = e.target.value; });
    this.on(this.aEl, 'change', () => this._maj());
    this.on(this.anisoEl, 'input', e => { this.el.querySelector('.js-anisov').textContent = parseFloat(e.target.value).toFixed(1); });
    this.on(this.anisoEl, 'change', () => this._maj());
    this.on(this.angEl, 'input', e => { this.el.querySelector('.js-angv').textContent = e.target.value; });
    this.on(this.angEl, 'change', () => this._maj());
    this.on(this.blocEl, 'input', e => { this.el.querySelector('.js-blocv').textContent = e.target.value; });
    this.on(this.blocEl, 'change', () => this._maj());
    this.on(this.domEl, 'input', e => { this.el.querySelector('.js-domv').textContent = e.target.value; });
    this.on(this.domEl, 'change', () => { this._purger(); this._maj(); });
    this.on(this.el.querySelector('.js-clear'), 'click', () => { this.set = { red: [], blue: [] }; this._maj(); });

    afficherChargementJusquaPret(this.el).then(() => this._init());
  }

  _dom()  { return parseFloat(this.domEl.value); }
  _bloc() { return parseFloat(this.blocEl.value); }
  _centre() { const d = this._dom() / 2; return [d, d]; }
  _bornes() { const d = this._dom() / 2, b = this._bloc() / 2; return [d - b, d + b]; }
  _purger() { const D = this._dom(); for (const c of ['red', 'blue']) this.set[c] = this.set[c].filter(p => p[0] >= 0 && p[0] <= D && p[1] >= 0 && p[1] <= D); }

  _init() {
    this._dessinerCarte();
    if (!this.clickBound) {
      this.on(this.mapEl, 'click', e => this._onClick(e));
      this.clickBound = true;
    }
    this._maj();
  }

  _onClick(e) {
    const fl = this.mapEl._fullLayout;
    if (!fl || !fl.xaxis || !fl.yaxis) return;
    const rect = this.mapEl.getBoundingClientRect();
    const xpix = e.clientX - rect.left - fl.xaxis._offset;
    const ypix = e.clientY - rect.top - fl.yaxis._offset;
    if (xpix < 0 || xpix > fl.xaxis._length || ypix < 0 || ypix > fl.yaxis._length) return;
    const x = fl.xaxis.p2d(xpix), y = fl.yaxis.p2d(ypix);
    const D = this._dom();
    if (x < 0 || x > D || y < 0 || y > D) return;

    // Retrait UNIQUEMENT dans la couleur active ; sinon ajout.
    const seuil = SEUIL_FRAC * D;
    let best = -1, bd = seuil;
    this.set[this.cur].forEach((p, i) => {
      const dist = Math.hypot(p[0] - x, p[1] - y);
      if (dist < bd) { bd = dist; best = i; }
    });
    if (best >= 0) this.set[this.cur].splice(best, 1);
    else this.set[this.cur].push([x, y]);
    this._maj();
  }

  async _seq(couleur, struct, centre, bloc) {
    const pts = this.set[couleur];
    if (!pts.length) return [];
    return Promise.all(pts.map((_, k) => {
      const sub = pts.slice(0, k + 1);
      const val = new Float64Array(sub.length);
      return gpoly.krigeageBloc(sub, val, [centre], struct, [bloc, bloc], DISC, PEPITE, 'ordinaire')
        .then(r => r.variances[0]);
    }));
  }

  async _maj() {
    const bloc = this._bloc(), centre = this._centre();
    const ag = parseFloat(this.aEl.value), ratio = parseFloat(this.anisoEl.value), ang = parseFloat(this.angEl.value);
    const ap = ag * ratio;
    const struct = [{ modele: 'spherique', palier: 1.0, portee: [ag, ap], angle: ang }];
    let seqR, seqB;
    try { [seqR, seqB] = await Promise.all([this._seq('red', struct, centre, bloc), this._seq('blue', struct, centre, bloc)]); }
    catch (e) { this.afficherAvertissement('Erreur krigeage : ' + e.message); return; }

    this._dessinerCarte();
    this._dessinerCourbe(seqR, seqB);

    const vR = seqR.length ? seqR[seqR.length - 1] : null;
    const vB = seqB.length ? seqB[seqB.length - 1] : null;
    this.el.querySelector('.js-nr').textContent = this.set.red.length;
    this.el.querySelector('.js-nb').textContent = this.set.blue.length;
    this.el.querySelector('.js-resr').textContent = vR == null ? '—' : vR.toFixed(4);
    this.el.querySelector('.js-resb').textContent = vB == null ? '—' : vB.toFixed(4);
  }

  _dessinerCarte() {
    if (!window.Plotly) { this.afficherAvertissement('Plotly non chargé.'); return; }
    const D = this._dom(), centre = this._centre(), [c0, c1] = this._bornes();
    const seg = (pts) => { const x = [], y = []; for (const [px, py] of pts) { x.push(px, centre[0], null); y.push(py, centre[1], null); } return { x, y }; };
    const sR = seg(this.set.red), sB = seg(this.set.blue);

    // Indicateur d'anisotropie : ellipse dans le coin supérieur droit, axe majeur
    // orienté à l'angle θ (depuis +x), ratio des axes = a_p/a_g.
    const ratio = parseFloat(this.anisoEl.value), th = parseFloat(this.angEl.value) * Math.PI / 180;
    const ecx = 0.90 * D, ecy = 0.90 * D, Rmaj = 0.075 * D, Rmin = Rmaj * ratio;
    const ct = Math.cos(th), st = Math.sin(th);
    const ex = [], ey = [];
    for (let k = 0; k <= 48; k++) { const t = 2 * Math.PI * k / 48, px = Rmaj * Math.cos(t), py = Rmin * Math.sin(t); ex.push(ecx + px * ct - py * st); ey.push(ecy + px * st + py * ct); }
    const ax = [ecx - Rmaj * ct, ecx + Rmaj * ct], ay = [ecy - Rmaj * st, ecy + Rmaj * st];

    Plotly.react(this.mapEl, [
      { x: sR.x, y: sR.y, mode: 'lines', line: { color: COL.red, width: 0.8 }, opacity: 0.35, hoverinfo: 'skip', showlegend: false },
      { x: sB.x, y: sB.y, mode: 'lines', line: { color: COL.blue, width: 0.8 }, opacity: 0.35, hoverinfo: 'skip', showlegend: false },
      { x: this.set.red.map(p => p[0]), y: this.set.red.map(p => p[1]), mode: 'markers', name: 'red',
        marker: { color: COL.red, size: 12, line: { color: '#7a0000', width: 1 } }, hoverinfo: 'skip' },
      { x: this.set.blue.map(p => p[0]), y: this.set.blue.map(p => p[1]), mode: 'markers', name: 'blue',
        marker: { color: COL.blue, size: 12, line: { color: '#0d3d7a', width: 1 } }, hoverinfo: 'skip' },
      { x: ex, y: ey, mode: 'lines', fill: 'toself', fillcolor: 'rgba(22,121,74,0.12)',
        line: { color: '#16794a', width: 1.5 }, hoverinfo: 'skip', showlegend: false },
      { x: ax, y: ay, mode: 'lines', line: { color: '#16794a', width: 2 }, hoverinfo: 'skip', showlegend: false },
    ], {
      margin: { t: 30, l: 40, r: 14, b: 36 },
      title: { text: `Domaine ${D}×${D} — bloc V ${this._bloc()}×${this._bloc()}`, font: { size: 12 } },
      dragmode: false,
      shapes: [{ type: 'rect', x0: c0, y0: c0, x1: c1, y1: c1, line: { color: '#444', width: 2 }, fillcolor: 'rgba(80,80,80,0.10)' }],
      annotations: [
        { x: centre[0], y: centre[1], text: 'V', showarrow: false, font: { size: 15, color: '#444' } },
        { x: centre[0], y: c1, text: `${this._bloc()}`, showarrow: false, yshift: 9, font: { size: 10, color: '#444' } },
        { x: c1, y: centre[1], text: `${this._bloc()}`, showarrow: false, xshift: 11, textangle: 90, font: { size: 10, color: '#444' } },
        { x: 0.90 * D, y: 0.90 * D - 0.12 * D, text: 'anisotropie', showarrow: false, font: { size: 8, color: '#16794a' } },
      ],
      xaxis: { range: [0, D], title: { text: 'x', standoff: 2 }, ticks: 'outside', ticklen: 3, tickfont: { size: 9 }, zeroline: false, constrain: 'domain', fixedrange: true },
      yaxis: { range: [0, D], title: { text: 'y', standoff: 2 }, ticks: 'outside', ticklen: 3, tickfont: { size: 9 }, zeroline: false, scaleanchor: 'x', constrain: 'domain', fixedrange: true },
      showlegend: false,
    }, { displaylogo: false, responsive: true, displayModeBar: false });
  }

  _dessinerCourbe(seqR, seqB) {
    if (!window.Plotly) return;
    const traces = [];
    if (seqR.length) traces.push({ x: seqR.map((_, i) => i + 1), y: seqR, mode: 'lines+markers', name: 'Rouge',
      line: { color: COL.red, width: 2 }, marker: { color: COL.red, size: 7 } });
    if (seqB.length) traces.push({ x: seqB.map((_, i) => i + 1), y: seqB, mode: 'lines+markers', name: 'Bleu',
      line: { color: COL.blue, width: 2 }, marker: { color: COL.blue, size: 7 } });
    Plotly.react(this.curveEl, traces, {
      margin: { t: 30, l: 52, r: 14, b: 46 },
      title: { text: 'Variance d\'estimation σ<sup>2</sup><sub>E</sub> vs nombre de données', font: { size: 12 } },
      xaxis: { title: { text: 'Nombre de données', standoff: 6 }, dtick: 1, rangemode: 'tozero' },
      yaxis: { title: 'σ<sup>2</sup><sub>E</sub>', rangemode: 'tozero' },
      legend: { orientation: 'h', y: -0.18, x: 0.5, xanchor: 'center', font: { size: 10 } },
    }, { displaylogo: false, responsive: true });
  }

  cleanup() {
    if (window.Plotly) {
      if (this.mapEl) Plotly.purge(this.mapEl);
      if (this.curveEl) Plotly.purge(this.curveEl);
    }
  }
}

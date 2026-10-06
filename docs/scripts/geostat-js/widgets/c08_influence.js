// scripts/geostat-js/widgets/c08_influence.js
// -----------------------------------------------------------------------------
// Widget C08 — Atelier 8.2 « Influence du modèle de variogramme » (calque du
// notebook Chap7_Influence). Pour une même variance globale, trois modèles de
// structure spatiale très différents donnent des variances de bloc — et donc
// des dispersions — différentes.
//
// Trois variogrammes :
//   • Vario 1 : sphérique (pépite c0 + structure c, portée range1).
//   • Vario 2 : imbriqué (deux sphériques : c0 à portée 5 + c à portée range1),
//               même palier total mais SANS pépite -> structure courte distance.
//   • Vario 3 : sphérique indépendant (pépite c0_3, palier sill_3, portée range_3).
//
// Trois panneaux : (1) les variogrammes, (2) la variance de bloc vs la taille,
// (3) la dispersion Var(l×l) − Var(bloc de référence).
//
// Tout passe par geostat_polymtl : variogrammeImbrique + varianceBlocImbrique.
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

const debounce = (fn, ms = 220) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const COLORS = ['#1f77b4', '#ff7f0e', '#2ca02c'];
const LMAX = 40, NQ = 5;

export default class C08Influence extends Widget {
  render() {
    this.el.insertAdjacentHTML('beforeend', `
      <style>
        #${this.el.id} .ci-grp{display:flex;flex-wrap:wrap;gap:12px;align-items:center;padding:6px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;margin-bottom:6px;}
        #${this.el.id} .ci-grp b{font-size:.78rem;color:#555;margin-right:4px;}
        #${this.el.id} .ci-grp label{display:inline-flex;align-items:center;gap:5px;}
      </style>
      <div class="ci-grp">
        <b>Variogrammes 1 &amp; 2</b>
        <label><span>c<sub>0</sub></span> <input type="range" class="js-c0" min="0" max="0.5" value="0.2" step="0.05" style="width:90px"><span class="js-c0v">0.20</span></label>
        <label>c <input type="range" class="js-c" min="0.1" max="1.5" value="1.0" step="0.1" style="width:90px"><span class="js-cv">1.0</span></label>
        <label>Portée <input type="range" class="js-r1" min="10" max="100" value="40" step="5" style="width:100px"><span class="js-r1v">40</span></label>
      </div>
      <div class="ci-grp">
        <b>Variogramme 3</b>
        <label><span>c<sub>0</sub></span> <input type="range" class="js-c03" min="0" max="0.5" value="0.2" step="0.05" style="width:90px"><span class="js-c03v">0.20</span></label>
        <label>Palier <input type="range" class="js-s3" min="0.5" max="2" value="1.7" step="0.1" style="width:90px"><span class="js-s3v">1.7</span></label>
        <label>Portée <input type="range" class="js-r3" min="10" max="100" value="60" step="5" style="width:100px"><span class="js-r3v">60</span></label>
      </div>
      <div class="ci-grp">
        <b>Bloc de référence</b>
        <label>Taille <input type="range" class="js-lb" min="5" max="40" value="20" step="1" style="width:120px"><span class="js-lbv">20</span></label>
      </div>
      <div class="js-plot" style="height:430px"></div>
    `);

    this.plot = this.el.querySelector('.js-plot');
    this.ctrl = {
      c0:  this.el.querySelector('.js-c0'),
      c:   this.el.querySelector('.js-c'),
      r1:  this.el.querySelector('.js-r1'),
      c03: this.el.querySelector('.js-c03'),
      s3:  this.el.querySelector('.js-s3'),
      r3:  this.el.querySelector('.js-r3'),
      lb:  this.el.querySelector('.js-lb'),
    };
    const fmt = { c0: 2, c: 1, r1: 0, c03: 2, s3: 1, r3: 0, lb: 0 };
    const update = debounce(() => this.recalculer(), 220);
    for (const k of Object.keys(this.ctrl)) {
      this.on(this.ctrl[k], 'input', e => {
        this.el.querySelector(`.js-${k}v`).textContent = parseFloat(e.target.value).toFixed(fmt[k]);
      });
      this.on(this.ctrl[k], 'change', update);
    }
    afficherChargementJusquaPret(this.el).then(() => this.recalculer());
  }

  _models() {
    const c0  = parseFloat(this.ctrl.c0.value);
    const c   = parseFloat(this.ctrl.c.value);
    const r1  = parseFloat(this.ctrl.r1.value);
    const c03 = parseFloat(this.ctrl.c03.value);
    const s3  = parseFloat(this.ctrl.s3.value);
    const r3  = parseFloat(this.ctrl.r3.value);
    return {
      c0, c03,
      // Structures (sans pépite) pour la variance de bloc.
      struct: [
        [{ modele: 'spherique', palier: c, portee: r1 }],
        [{ modele: 'spherique', palier: c0, portee: 5 }, { modele: 'spherique', palier: c, portee: r1 }],
        [{ modele: 'spherique', palier: Math.max(0, s3 - c03), portee: r3 }],
      ],
      // Pépites associées (pour le variogramme γ(h)).
      pepite: [c0, 0, c03],
    };
  }

  async recalculer() {
    const m = this._models();
    const lb = parseInt(this.ctrl.lb.value, 10);
    const lags = []; for (let i = 0; i <= 120; i++) lags.push(i * 100 / 120);
    const tailles = []; for (let l = 1; l <= LMAX; l++) tailles.push(l);

    let gammas, varblocs;
    try {
      gammas = await Promise.all(m.struct.map((s, i) =>
        gpoly.variogrammeImbrique(lags, s, m.pepite[i])));
      varblocs = await Promise.all(m.struct.map(async s => {
        const ys = await Promise.all(tailles.map(l =>
          gpoly.varianceBlocImbrique('surface', l, l, 0, s, 0, NQ).then(r => r.variance)));
        return ys;
      }));
    } catch (e) { this.afficherAvertissement('Erreur calcul : ' + e.message); return; }

    if (!window.Plotly) { this.afficherAvertissement('Plotly non chargé.'); return; }
    const traces = [];
    // Panneau 1 : variogrammes.
    gammas.forEach((g, i) => traces.push({
      x: lags, y: g, mode: 'lines', name: `Vario ${i + 1}`, legendgroup: `v${i}`,
      line: { color: COLORS[i], width: i === 0 ? 4 : 2 }, xaxis: 'x', yaxis: 'y',
    }));
    traces.push({ x: [lb, lb], y: [0, Math.max(...gammas.flat()) * 1.05], mode: 'lines',
      name: `Bloc réf. ${lb}`, line: { color: '#CC0000', width: 1.5, dash: 'dash' },
      xaxis: 'x', yaxis: 'y', showlegend: false });
    // Panneau 2 : variance de bloc vs taille.
    varblocs.forEach((y, i) => traces.push({
      x: tailles, y, mode: 'lines', name: `Vario ${i + 1}`, legendgroup: `v${i}`,
      line: { color: COLORS[i], width: 2 }, xaxis: 'x2', yaxis: 'y2', showlegend: false }));
    // Panneau 3 : dispersion = Var(l) − Var(bloc réf).
    varblocs.forEach((y, i) => {
      const ref = y[lb - 1];
      const xs = [], ys = [];
      for (let l = 1; l <= lb; l++) { xs.push(l); ys.push(y[l - 1] - ref); }
      traces.push({ x: xs, y: ys, mode: 'lines', name: `Vario ${i + 1}`, legendgroup: `v${i}`,
        line: { color: COLORS[i], width: 2 }, xaxis: 'x3', yaxis: 'y3', showlegend: false });
    });

    const gridAxis = { showgrid: true, gridcolor: '#eee', zeroline: false, ticks: 'outside', ticklen: 3, tickfont: { size: 9 }, automargin: true };
    Plotly.react(this.plot, traces, {
      margin: { t: 64, l: 56, r: 18, b: 56 },
      legend: { orientation: 'h', y: -0.16, x: 0.5, xanchor: 'center', font: { size: 11 } },
      annotations: [
        { text: '<b>Variogramme</b><br>γ(h)', x: 0.14, y: 1.04, xref: 'paper', yref: 'paper', showarrow: false, font: { size: 11, color: '#333' }, xanchor: 'center', yanchor: 'bottom', align: 'center' },
        { text: '<b>Variance</b><br>de bloc', x: 0.51, y: 1.04, xref: 'paper', yref: 'paper', showarrow: false, font: { size: 11, color: '#333' }, xanchor: 'center', yanchor: 'bottom', align: 'center' },
        { text: `<b>Variance de</b><br>dispersion (réf. ${lb})`, x: 0.875, y: 1.04, xref: 'paper', yref: 'paper', showarrow: false, font: { size: 11, color: '#333' }, xanchor: 'center', yanchor: 'bottom', align: 'center' },
      ],
      xaxis:  { ...gridAxis, domain: [0, 0.28], anchor: 'y',  title: { text: 'Distance h', standoff: 8 } },
      yaxis:  { ...gridAxis, domain: [0, 1], anchor: 'x',  title: { text: 'γ(h)', standoff: 6 }, rangemode: 'tozero' },
      xaxis2: { ...gridAxis, domain: [0.385, 0.635], anchor: 'y2', title: { text: 'Taille du bloc l', standoff: 8 } },
      yaxis2: { ...gridAxis, domain: [0, 1], anchor: 'x2', title: { text: 'Variance', standoff: 6 }, rangemode: 'tozero' },
      xaxis3: { ...gridAxis, domain: [0.74, 1], anchor: 'y3', title: { text: 'Taille du bloc l', standoff: 8 } },
      yaxis3: { ...gridAxis, domain: [0, 1], anchor: 'x3', title: { text: 'Dispersion', standoff: 6 } },
    }, { displaylogo: false, responsive: true });
  }

  cleanup() { if (this.plot && window.Plotly) Plotly.purge(this.plot); }
}

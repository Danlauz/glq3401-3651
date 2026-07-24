// scripts/geostat-js/widgets/c09_comparaison_modeles.js
// -----------------------------------------------------------------------------
// Widget C09.12 — Comparaison de modeles de variogramme sur le krigeage.
//
// Sur le MEME jeu de donnees, on compare l'estimation Z* selon 3 modeles
// theoriques differents (sphe / exp / gauss) avec meme portee pratique 95 %.
//
// Pedagogie : le CHOIX DU TYPE de modele a peu d'impact sur l'estimation,
// SAUF pres des donnees et en extrapolation. C'est le comportement a
// l'ORIGINE (pepite, derivee a 0) qui compte le plus.
//
// Tout passe par gpoly.krigeageOrdinaire avec differents modeles.
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

const debounce = (fn, ms = 200) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const MODELES = [
  { key: 'spherique',   nom: 'Sphérique',   color: '#2563eb' },
  { key: 'exponentiel', nom: 'Exponentiel', color: '#ea580c' },
  { key: 'gaussien',    nom: 'Gaussien',    color: '#16a34a' },
];

const DONNEES = [
  { x: 10, z: 4 }, { x: 25, z: 7 }, { x: 38, z: 5 },
  { x: 60, z: 8 }, { x: 78, z: 3 }, { x: 88, z: 6 },
];

export default class C09ComparaisonModeles extends Widget {
  render() {
    this.el.insertAdjacentHTML('beforeend', `
      <div class="gw-controls" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;">
        <label>Portée a
          <input type="range" class="js-a" min="5" max="50" value="25" step="1" style="width:140px">
          <span class="js-av">25</span></label>
        <label>Pépite c₀
          <input type="range" class="js-c0" min="0" max="0.5" value="0" step="0.02" style="width:120px">
          <span class="js-c0v">0.00</span></label>
        <label>Cible x₀
          <input type="range" class="js-x0" min="0" max="100" value="50" step="0.5" style="width:160px">
          <span class="js-x0v">50</span></label>
      </div>
      <div class="js-plot" style="height:380px"></div>
      <div class="js-info" style="padding:.4rem 1rem;font-family:'JetBrains Mono',monospace;font-size:.82rem;color:#444;text-align:center;background:#f0f0f0;border-radius:6px;margin-top:4px;">—</div>
      <p style="margin:4px 1rem;font-size:11px;color:#666;">
        Le comportement à l'ORIGINE est ce qui compte le plus : sphérique = linéaire,
        exponentiel = pseudo-linéaire, gaussien = quadratique (champ très lisse).</p>
    `);

    this.plot = this.el.querySelector('.js-plot');
    this.infoEl = this.el.querySelector('.js-info');
    this.ctrl = {
      a:  this.el.querySelector('.js-a'),
      c0: this.el.querySelector('.js-c0'),
      x0: this.el.querySelector('.js-x0'),
    };
    const update = debounce(() => this.refresh(), 200);
    for (const [k, el] of Object.entries(this.ctrl)) {
      this.on(el, 'input', e => {
        this.el.querySelector(`.js-${k}v`).textContent = e.target.value;
      });
      this.on(el, 'input', update);
    }
    afficherChargementJusquaPret(this.el).then(() => this.refresh());
  }

  async refresh() {
    const a  = parseFloat(this.ctrl.a.value);
    const c0 = parseFloat(this.ctrl.c0.value);
    const x0 = parseFloat(this.ctrl.x0.value);
    const palier = Math.max(0.001, 1 - c0);

    const xd = DONNEES.map(d => [d.x]);
    const zd = DONNEES.map(d => d.z);
    const x_grid = []; for (let i = 0; i <= 100; i++) x_grid.push(i);
    const cibles = x_grid.map(x => [x]);

    let resultats;
    try {
      resultats = await Promise.all(MODELES.map(async m => {
        const structs = [{ modele: m.key, palier, portee: a }];
        const r = await gpoly.krigeageOrdinaire(xd, zd, cibles, structs, c0);
        const rc = await gpoly.krigeageOrdinaire(xd, zd, [[x0]], structs, c0);
        return { ...m, est: r.estimations, var: r.variances, cible: rc };
      }));
    } catch (e) { this.afficherAvertissement('Erreur : ' + e.message); return; }

    if (!window.Plotly) { this.afficherAvertissement('Plotly non chargé.'); return; }
    const traces = [];
    for (const r of resultats) {
      traces.push({
        x: x_grid, y: r.est, mode: 'lines',
        line: { color: r.color, width: 2.5 }, name: r.nom,
      });
    }
    traces.push({
      x: DONNEES.map(d => d.x), y: DONNEES.map(d => d.z),
      mode: 'markers', name: 'Données',
      marker: { color: '#222', size: 10, line: { color: '#fff', width: 2 } },
    });
    traces.push({
      x: [x0, x0], y: [0, 10], mode: 'lines',
      line: { color: '#666', dash: 'dot', width: 1 }, name: `cible x₀=${x0}`,
    });

    Plotly.react(this.plot, traces, {
      margin: { t: 30, l: 50, r: 20, b: 50 },
      xaxis: { title: 'x', range: [0, 100] },
      yaxis: { title: 'Z', range: [0, 10] },
      legend: { orientation: 'h', y: -0.15, x: 0.5, xanchor: 'center', font: { size: 10 } },
    }, { displaylogo: false, responsive: true });

    const lignes = resultats.map(r =>
      `<span style="color:${r.color}">${r.nom} : Z*(${x0.toFixed(1)}) = ${r.cible.estimations[0].toFixed(3)}, σ² = ${r.cible.variances[0].toFixed(4)}</span>`
    );
    this.infoEl.innerHTML = lignes.join(' &nbsp;·&nbsp; ');
  }

  cleanup() { if (this.plot && window.Plotly) Plotly.purge(this.plot); }
}

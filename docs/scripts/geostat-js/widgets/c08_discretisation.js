// scripts/geostat-js/widgets/c08_discretisation.js
// -----------------------------------------------------------------------------
// Widget C08 — Atelier 8.3 « Discrétisation de la variance de bloc » (calque du
// notebook Chap7_DiscretisationVarBloc). L'intégrale double
//   σ²_V = (1/|V|²) ∫_V ∫_V C(r−r') dr dr'
// est approchée par quadrature de Gauss-Legendre. La précision dépend du nombre
// de points n par dimension.
//
// Deux panneaux : (gauche) convergence σ²_V(n) avec la config actuelle en rouge ;
// (droite) positions des points de quadrature dans le bloc (3D pour le cube).
//
// Paramètres (comme le notebook) : anisotropie a_x/a_y/a_z, longueurs du bloc
// l_x/l_y/l_z, palier, géométrie, modèle, n par dimension (max selon géométrie).
//
// Tout passe par geostat_polymtl : varianceBlocQuadrature + pointsQuadratureVisu.
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

const debounce = (fn, ms = 200) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const NMAX = { ligne: 50, surface: 20, cube: 10 };

export default class C08Discretisation extends Widget {
  render() {
    this.el.insertAdjacentHTML('beforeend', `
      <style>
        #${this.el.id} .cd-grp{display:flex;flex-wrap:wrap;gap:12px;align-items:center;padding:6px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;margin-bottom:6px;}
        #${this.el.id} .cd-grp b{font-size:.78rem;color:#555;margin-right:4px;}
        #${this.el.id} .cd-grp label{display:inline-flex;align-items:center;gap:5px;}
      </style>
      <div class="cd-grp">
        <b>Anisotropie</b>
        <label><span>a<sub>x</sub></span> <input type="range" class="js-ax" min="1" max="100" value="30" step="1" style="width:90px"><span class="js-axv">30</span></label>
        <label><span>a<sub>y</sub></span> <input type="range" class="js-ay" min="1" max="100" value="30" step="1" style="width:90px"><span class="js-ayv">30</span></label>
        <label><span>a<sub>z</sub></span> <input type="range" class="js-az" min="1" max="100" value="30" step="1" style="width:90px"><span class="js-azv">30</span></label>
      </div>
      <div class="cd-grp">
        <b>Longueurs du bloc</b>
        <label><span>l<sub>x</sub></span> <input type="range" class="js-lx" min="1" max="60" value="10" step="1" style="width:90px"><span class="js-lxv">10</span></label>
        <label><span>l<sub>y</sub></span> <input type="range" class="js-ly" min="1" max="60" value="10" step="1" style="width:90px"><span class="js-lyv">10</span></label>
        <label><span>l<sub>z</sub></span> <input type="range" class="js-lz" min="1" max="60" value="10" step="1" style="width:90px"><span class="js-lzv">10</span></label>
      </div>
      <div class="cd-grp">
        <b>Modèle</b>
        <label>Géométrie <select class="js-geom">
          <option value="ligne">Ligne 1D</option>
          <option value="surface" selected>Surface 2D</option>
          <option value="cube">Cube 3D</option>
        </select></label>
        <label>Modèle <select class="js-mod">
          <option value="spherique" selected>Sphérique</option>
          <option value="exponentiel">Exponentiel</option>
          <option value="gaussien">Gaussien</option>
        </select></label>
        <label>Palier <input type="range" class="js-sill" min="0.1" max="5" value="1.0" step="0.1" style="width:90px"><span class="js-sillv">1.0</span></label>
        <label>n par dim. <input type="range" class="js-n" min="2" max="20" value="5" step="1" style="width:110px"><span class="js-nv">5</span></label>
      </div>
      <div style="display:grid;grid-template-columns:1.25fr 1fr;gap:8px;margin-top:4px;">
        <div class="js-plot" style="height:360px"></div>
        <div class="js-pts" style="height:360px"></div>
      </div>
      <div class="js-info" style="text-align:center;font-size:.82rem;color:#555;margin-top:4px;"></div>
    `);

    this.plot = this.el.querySelector('.js-plot');
    this.plotPts = this.el.querySelector('.js-pts');
    this.infoEl = this.el.querySelector('.js-info');
    this.ctrl = {
      ax: this.el.querySelector('.js-ax'), ay: this.el.querySelector('.js-ay'), az: this.el.querySelector('.js-az'),
      lx: this.el.querySelector('.js-lx'), ly: this.el.querySelector('.js-ly'), lz: this.el.querySelector('.js-lz'),
      geom: this.el.querySelector('.js-geom'), mod: this.el.querySelector('.js-mod'),
      sill: this.el.querySelector('.js-sill'), n: this.el.querySelector('.js-n'),
    };
    this.nEl = this.ctrl.n;
    const onChange = debounce(() => this.recalculer(), 200);
    const fmt = { ax: 0, ay: 0, az: 0, lx: 0, ly: 0, lz: 0, sill: 1, n: 0 };
    for (const k of Object.keys(this.ctrl)) {
      if (this.ctrl[k].type === 'range') {
        this.on(this.ctrl[k], 'input', e => {
          this.el.querySelector(`.js-${k}v`).textContent = parseFloat(e.target.value).toFixed(fmt[k]);
        });
      }
      this.on(this.ctrl[k], 'change', onChange);
    }
    // n_max dépend de la géométrie.
    this.on(this.ctrl.geom, 'change', () => this._majNmax());
    this._majNmax();
    afficherChargementJusquaPret(this.el).then(() => this.recalculer());
  }

  _majNmax() {
    const max = NMAX[this.ctrl.geom.value];
    this.nEl.max = max;
    if (parseInt(this.nEl.value, 10) > max) {
      this.nEl.value = max;
      this.el.querySelector('.js-nv').textContent = max;
    }
  }

  async recalculer() {
    const geom = this.ctrl.geom.value;
    const mod  = this.ctrl.mod.value;
    const sill = parseFloat(this.ctrl.sill.value);
    const ax = parseFloat(this.ctrl.ax.value), ay = parseFloat(this.ctrl.ay.value), az = parseFloat(this.ctrl.az.value);
    const lx = parseFloat(this.ctrl.lx.value);
    const ly = (geom === 'surface' || geom === 'cube') ? parseFloat(this.ctrl.ly.value) : 0;
    const lz = (geom === 'cube') ? parseFloat(this.ctrl.lz.value) : 0;
    const nCur = parseInt(this.nEl.value, 10);
    const nMax = NMAX[geom];

    // 1) Convergence : variance pour n = 1..nMax.
    const ns = []; for (let i = 1; i <= nMax; i++) ns.push(i);
    let variances;
    try {
      variances = await Promise.all(ns.map(n =>
        gpoly.varianceBlocQuadrature(geom, lx, ly, lz, sill, ax, ay, az, mod, n).then(r => r.variance)));
    } catch (e) { this.afficherAvertissement('Erreur quadrature : ' + e.message); return; }
    const varCur = variances[nCur - 1];
    const varRef = variances[variances.length - 1];

    // 2) Points de quadrature au niveau n courant.
    let pts;
    try { pts = await gpoly.pointsQuadratureVisu(geom, lx, ly, lz, nCur); }
    catch (e) { this.afficherAvertissement('Erreur points quadrature : ' + e.message); return; }

    if (!window.Plotly) { this.afficherAvertissement('Plotly non chargé.'); return; }
    // Convergence.
    Plotly.react(this.plot, [
      { x: ns, y: variances, mode: 'lines+markers', name: 'σ²_V(n)',
        line: { color: '#4169e1', width: 2 }, marker: { color: '#4169e1', size: 6 } },
      { x: [nCur], y: [varCur], mode: 'markers', name: 'Config actuelle',
        marker: { color: '#CC0000', size: 12, symbol: 'circle' } },
    ], {
      margin: { t: 32, l: 56, r: 14, b: 78 },
      title: { text: `Convergence — bloc ${geom} (${mod})`, font: { size: 12 } },
      xaxis: { title: 'Points de Gauss par dimension', dtick: geom === 'cube' ? 1 : (geom === 'surface' ? 2 : 5) },
      yaxis: { title: 'Variance σ²_V', rangemode: 'tozero' },
      legend: { orientation: 'h', y: -0.32, x: 0.5, xanchor: 'center', font: { size: 10 } },
    }, { displaylogo: false, responsive: true });

    // Points de quadrature dans le bloc.
    let traces_pts, layout_pts;
    if (geom === 'ligne') {
      traces_pts = [{ x: pts.x, y: pts.x.map(() => 0), mode: 'markers',
        marker: { color: '#111', size: 9 }, name: `${nCur} points` }];
      layout_pts = { xaxis: { title: 'x' }, yaxis: { range: [-0.5, 0.5], showticklabels: false } };
    } else if (geom === 'surface') {
      traces_pts = [{ x: pts.x, y: pts.y, mode: 'markers',
        marker: { color: '#111', size: 7 }, name: `${nCur}² = ${nCur * nCur} points` }];
      layout_pts = { xaxis: { title: 'x' }, yaxis: { title: 'y', scaleanchor: 'x', scaleratio: 1 } };
    } else {
      traces_pts = [{ x: pts.x, y: pts.y, z: pts.z, type: 'scatter3d', mode: 'markers',
        marker: { color: '#111', size: 3 }, name: `${nCur}³ = ${nCur ** 3} points` }];
      layout_pts = { scene: { aspectmode: 'cube', xaxis: { title: 'x' }, yaxis: { title: 'y' }, zaxis: { title: 'z' } } };
    }
    const nPts = geom === 'ligne' ? nCur : (geom === 'surface' ? nCur * nCur : nCur ** 3);
    Plotly.react(this.plotPts, traces_pts, {
      margin: { t: 32, l: 40, r: 16, b: 40 },
      title: { text: `Points de quadrature (n = ${nCur}, ${nPts} pts)`, font: { size: 12 } },
      showlegend: false,
      ...layout_pts,
    }, { displaylogo: false, responsive: true });

    this.infoEl.innerHTML = `n = <b>${nCur}</b> → σ²_V = <b>${varCur.toFixed(4)}</b> ` +
      `(référence n = ${nMax} : ${varRef.toFixed(4)}, écart ${(Math.abs(varCur - varRef) / varRef * 100).toFixed(2)} %). ` +
      `Trop peu de points <b>surestime</b> la variance ; la précision se paie en temps de calcul.`;
  }

  cleanup() {
    if (window.Plotly) {
      if (this.plot) Plotly.purge(this.plot);
      if (this.plotPts) Plotly.purge(this.plotPts);
    }
  }
}

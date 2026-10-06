// scripts/geostat-js/widgets/c08_calculateur.js
// -----------------------------------------------------------------------------
// Widget C08 — Atelier 8.4 « Calculateur de variance de bloc » (calque du
// notebook Chap7_Calculateur). Outil de calcul direct : on saisit le modèle
// (dimension, palier c1, pépite c0, portées a_x/a_y/a_z, longueurs du bloc
// l_x/l_y/l_z) et on obtient la variance de bloc
//   σ²_V = (1/|V|²) ∫_V ∫_V C(r−r') dr dr'
// approchée par discrétisation régulière (n_points par dimension).
//
// Calcul délégué à geostat_polymtl.block_variance.quadrature.variance_bloc_calculateur
// (via gpoly.varianceBlocCalculateur). Aucun calcul côté JS.
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

const N_POINTS = 50;

export default class C08Calculateur extends Widget {
  render() {
    const id = this.el.id;
    this.el.insertAdjacentHTML('beforeend', `
      <style>
        #${id} .cc-wrap{max-width:560px;margin:0 auto;padding:14px 18px;background:#f7f8fa;border:1px solid #e3e6ea;border-radius:12px;font-size:.86rem;}
        #${id} .cc-row{display:flex;align-items:center;gap:10px;margin:6px 0;}
        #${id} .cc-row label{flex:0 0 168px;color:#444;}
        #${id} .cc-row input,#${id} .cc-row select{padding:3px 7px;border:1px solid #c7ccd1;border-radius:5px;font-size:.86rem;}
        #${id} .cc-row input[type=number]{width:90px;}
        #${id} .cc-sep{border:none;border-top:1px solid #e0e3e7;margin:10px 0;}
        #${id} .cc-btn{margin-top:10px;padding:6px 18px;background:#16794a;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:.88rem;}
        #${id} .cc-out{margin-top:12px;padding:12px;background:#eef2e8;border:1px solid #b8c8a8;border-radius:10px;text-align:center;font-family:'JetBrains Mono',monospace;}
        #${id} .cc-out b{font-size:1.4rem;color:#16794a;}
      </style>
      <div class="cc-wrap">
        <div class="cc-row"><label>Dimension</label>
          <select class="js-dim">
            <option value="1">1D (ligne)</option>
            <option value="2" selected>2D (surface)</option>
            <option value="3">3D (cube)</option>
          </select></div>
        <div class="cc-row"><label>Modèle</label>
          <select class="js-mod">
            <option value="spherique" selected>Sphérique</option>
            <option value="exponentiel">Exponentiel</option>
            <option value="gaussien">Gaussien</option>
          </select></div>
        <hr class="cc-sep">
        <div class="cc-row"><label>Palier c₁</label><input type="number" class="js-c1" value="1.0" step="0.1"></div>
        <div class="cc-row"><label>Effet de pépite c₀</label><input type="number" class="js-c0" value="0.0" step="0.1"></div>
        <hr class="cc-sep">
        <div class="cc-row"><label>Portée X (a_x)</label><input type="number" class="js-ax" value="30" step="1"></div>
        <div class="cc-row"><label>Portée Y (a_y)</label><input type="number" class="js-ay" value="30" step="1"></div>
        <div class="cc-row"><label>Portée Z (a_z)</label><input type="number" class="js-az" value="30" step="1"></div>
        <hr class="cc-sep">
        <div class="cc-row"><label>Longueur X (l_x)</label><input type="number" class="js-lx" value="10" step="1"></div>
        <div class="cc-row"><label>Longueur Y (l_y)</label><input type="number" class="js-ly" value="10" step="1"></div>
        <div class="cc-row"><label>Longueur Z (l_z)</label><input type="number" class="js-lz" value="10" step="1"></div>
        <button class="js-calc cc-btn" type="button">Calculer la variance</button>
        <div class="cc-out">▣ Variance de bloc σ²_V = <b class="js-res">—</b></div>
      </div>
    `);

    this.ctrl = {};
    for (const k of ['dim', 'mod', 'c1', 'c0', 'ax', 'ay', 'az', 'lx', 'ly', 'lz']) {
      this.ctrl[k] = this.el.querySelector(`.js-${k}`);
    }
    this.resEl = this.el.querySelector('.js-res');
    this.on(this.el.querySelector('.js-calc'), 'click', () => this._calc());
    afficherChargementJusquaPret(this.el).then(() => this._calc());
  }

  async _calc() {
    const dim = parseInt(this.ctrl.dim.value, 10);
    const mod = this.ctrl.mod.value;
    const c1  = parseFloat(this.ctrl.c1.value) || 0;
    const c0  = parseFloat(this.ctrl.c0.value) || 0;
    const ax  = parseFloat(this.ctrl.ax.value) || 1;
    const ay  = parseFloat(this.ctrl.ay.value) || ax;
    const az  = parseFloat(this.ctrl.az.value) || ax;
    const lx  = parseFloat(this.ctrl.lx.value) || 1;
    const ly  = parseFloat(this.ctrl.ly.value) || lx;
    const lz  = parseFloat(this.ctrl.lz.value) || lx;

    this.resEl.textContent = '…';
    let sigma2;
    try {
      sigma2 = await gpoly.varianceBlocCalculateur(dim, c1, c0, ax, ay, az, lx, ly, lz, mod, N_POINTS);
    } catch (e) { this.afficherAvertissement('Erreur calcul : ' + e.message); return; }
    this.resEl.textContent = sigma2.toFixed(6);
  }
}

// scripts/geostat-js/widgets/c03_gy_calculateur.js
// -----------------------------------------------------------------------------
// Widget « Calculateur de Gy » (C03) — calcul LIVE via Pyodide.
// Source de verite : geostat_polymtl.sampling.gy (appelee via gpoly).
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

const CHAMPS = [
  ['me', 'Mₑ — masse échantillon (g)', 100, 1, 0.1],
  ['ml', 'Mₗ — masse lot (g)', 10000, 100, 1],
  ['d',  'd — taille fragments (cm)', 0.25, 0.01, 0.001],
  ['d0', 'd₀ — taille libération (cm)', 0.04, 0.001, 0.0001],
  ['f',  'f — facteur forme', 0.5, 0.05, 0.01],
  ['g',  'g — facteur granulométrie', 0.25, 0.05, 0.01],
  ['al', 'aₗ — concentration (fraction)', 0.03, 0.001, 0.000001],
  ['da', 'δₐ — densité constituant (g/cm³)', 5, 0.1, 0.1],
  ['dg', 'δ_g — densité gangue (g/cm³)', 2.8, 0.1, 0.1],
];
const debounce = (fn, ms = 150) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

export default class C03GyCalculateur extends Widget {
  render() {
    const grid = CHAMPS.map(([id, lab, val, step, min]) => `
      <label style="font-size:12px;color:#555;display:flex;flex-direction:column;gap:2px">${lab}
        <input type="number" class="js-${id}" value="${val}" step="${step}" min="${min}"
               style="padding:5px 6px;border:1px solid #ccc;border-radius:6px;font-size:13px">
      </label>`).join('');

    this.el.insertAdjacentHTML('beforeend', `
      <div style="padding:0 1rem 1rem">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px 12px;margin:12px 0">${grid}</div>
        <div class="js-res" style="text-align:center;padding:20px;border-radius:14px;border:3px solid #ddd">
          <div class="js-sr" style="font-size:2.2em;font-weight:800">—</div>
          <div class="js-interp" style="font-size:13px;color:#666;margin-top:4px">—</div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px;font-size:12px;text-align:center">
          <div style="padding:8px;background:#f8f8f8;border-radius:8px">U_δ<b class="js-ud" style="display:block;font-size:1.1em">—</b></div>
          <div style="padding:8px;background:#f8f8f8;border-radius:8px">K = f·g·U_δ<b class="js-K" style="display:block;font-size:1.1em">—</b>g/cm³</div>
          <div style="padding:8px;background:#f8f8f8;border-radius:8px">f_L (libération)<b class="js-fl" style="display:block;font-size:1.1em">—</b></div>
          <div style="padding:8px;background:#f8f8f8;border-radius:8px">s²ᵣ<b class="js-sr2" style="display:block;font-size:1.1em">—</b></div>
          <div style="padding:8px;background:#f8f8f8;border-radius:8px">Mₑ min (sᵣ=5%)<b class="js-m5" style="display:block;font-size:1.1em">—</b>g</div>
          <div style="padding:8px;background:#f8f8f8;border-radius:8px">Mₑ min (sᵣ=10%)<b class="js-m10" style="display:block;font-size:1.1em">—</b>g</div>
        </div>
        <p style="margin-top:8px;font-size:11px;color:#666">
          Calculs effectués par <code>geostat_polymtl.sampling.gy</code>.</p>
      </div>
    `);

    this.inputs = {};
    const recalc = debounce(() => this.calculer(), 120);
    for (const [id] of CHAMPS) {
      this.inputs[id] = this.el.querySelector(`.js-${id}`);
      this.on(this.inputs[id], 'input', recalc);
    }
    this.out = {
      res: this.el.querySelector('.js-res'), sr: this.el.querySelector('.js-sr'),
      interp: this.el.querySelector('.js-interp'),
      ud: this.el.querySelector('.js-ud'), K: this.el.querySelector('.js-K'),
      fl: this.el.querySelector('.js-fl'), sr2: this.el.querySelector('.js-sr2'),
      m5: this.el.querySelector('.js-m5'), m10: this.el.querySelector('.js-m10'),
    };
    afficherChargementJusquaPret(this.el).then(() => this.calculer());
  }

  v(id) { return parseFloat(this.inputs[id].value) || 0; }

  async calculer() {
    const params = {
      al: this.v('al'), da: this.v('da'), dg: this.v('dg'),
      d0: this.v('d0'), f: this.v('f'), g: this.v('g'),
    };
    const me = this.v('me'), ml = this.v('ml'), d = this.v('d');
    if (params.al <= 0 || me <= 0 || d <= 0 || ml <= 0) return;

    // === Appel a la VRAIE librairie (un seul wrapper Python) ===
    // Toute erreur Pyodide / Python est affichée dans le widget via tryShow.
    const r = await this.tryShow(() => gpoly.gyDecomposition(params, me, ml, d));
    const pct = r.sr * 100;

    let cls = '#28a745', bg = '#d4edda', fg = '#155724', msg = 'Excellente précision';
    if (pct > 5)  { cls = '#ffc107'; bg = '#fff3cd'; fg = '#856404'; msg = 'Précision acceptable'; }
    if (pct > 15) { cls = '#dc3545'; bg = '#f8d7da'; fg = '#721c24'; msg = 'Précision insuffisante — procédure à revoir'; }
    if (pct > 50) { msg = 'Procédure inadéquate'; }

    this.out.res.style.borderColor = cls;
    this.out.res.style.background = bg;
    this.out.res.style.color = fg;
    this.out.sr.textContent = 'sᵣ = ' + pct.toFixed(2) + ' %';
    this.out.interp.textContent = msg + ' (intervalle 95 % : ± ' + (2 * pct).toFixed(1) + ' % de la teneur)';
    this.out.ud.textContent = r.ud.toFixed(1);
    this.out.K.textContent  = r.K.toFixed(2);
    this.out.fl.textContent = r.fl.toFixed(4);
    this.out.sr2.textContent = isNaN(r.sr2) ? '—' : r.sr2.toExponential(2);
    this.out.m5.textContent  = r.m5.toFixed(0);
    this.out.m10.textContent = r.m10.toFixed(0);
  }
}

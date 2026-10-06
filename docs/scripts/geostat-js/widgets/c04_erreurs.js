// scripts/geostat-js/widgets/c04_erreurs.js
// -----------------------------------------------------------------------------
// Widget « Propagation d'erreur sur le tonnage » (C04) — calcul LIVE via Pyodide.
// Aucune duplication de code : tout passe par la VRAIE fonction
// geostat_polymtl.treatment.erreurs.propagation_tonnage (appelee via gpoly).
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

const CHAMPS = [
  ['V', 'Volume V', 5000, 100, 'm³'], ['sV', 'σ_V', 250, 10, 'm³'],
  ['d', 'Densité d', 3.2, 0.1, 't/m³'], ['sd', 'σ_d', 0.10, 0.01, 't/m³'],
  ['t', 'Teneur t', 2.5, 0.1, '%'], ['st', 'σ_t', 0.40, 0.01, '%'],
];
const COUL = { V: '#0173B2', d: '#029E73', t: '#CC0000' };
const NOM  = { V: 'Volume', d: 'Densité', t: 'Teneur' };
const debounce = (fn, ms = 200) => { let id; return (...a) => { clearTimeout(id); id = setTimeout(() => fn(...a), ms); }; };

export default class C04Erreurs extends Widget {
  render() {
    const lignes = [];
    for (let i = 0; i < CHAMPS.length; i += 2) {
      const cells = [CHAMPS[i], CHAMPS[i + 1]].map(([id, lab, val, step, unit]) => `
        <label style="font-size:13px;font-weight:600;display:flex;align-items:center;gap:5px">
          ${lab} <input type="number" class="js-${id}" value="${val}" step="${step}"
            style="width:80px;padding:4px 6px;border:1px solid #ccc;border-radius:5px">
          <span style="color:#888;font-size:11px">${unit}</span>
        </label>`).join('');
      lignes.push(`<div style="display:flex;gap:18px;flex-wrap:wrap;margin:4px 0">${cells}</div>`);
    }
    this.el.insertAdjacentHTML('beforeend', `
      <div style="padding:0 1rem 1rem">
        <div style="background:#f8f7f4;border:1px solid #e0ddd6;border-radius:8px;padding:12px 14px;margin:12px 0">
          <div style="font-weight:600;margin-bottom:6px">Paramètres du bloc minier</div>
          ${lignes.join('')}
        </div>
        <div class="js-res" style="padding:14px 16px;background:#eef4ff;border:1px solid #b8c8e0;border-radius:8px"></div>
      </div>
    `);
    this.inputs = {};
    const recalc = debounce(() => this.calculer(), 150);
    for (const [id] of CHAMPS) {
      this.inputs[id] = this.el.querySelector(`.js-${id}`);
      this.on(this.inputs[id], 'input', recalc);
    }
    this.resEl = this.el.querySelector('.js-res');

    // Pyodide load + premier calcul
    afficherChargementJusquaPret(this.el).then(() => this.calculer());
  }

  v(id) { return parseFloat(this.inputs[id].value) || 0; }

  async calculer() {
    const V = this.v('V'), d = this.v('d'), t = this.v('t');
    if (V <= 0 || d <= 0 || t <= 0) return;
    // === Appel a la VRAIE librairie ===
    const r = await gpoly.propagationTonnage(V, this.v('sV'), d, this.v('sd'), t, this.v('st'));

    const barre = (k) => {
      const pct = r.contributions[k] * 100;
      return `<div style="display:flex;align-items:center;gap:8px;margin:3px 0">
        <span style="min-width:62px;font-size:12px">${NOM[k]}</span>
        <div style="height:16px;border-radius:3px;background:${COUL[k]};width:${Math.max(2, pct * 2.4)}px"></div>
        <span style="font-size:12px">${(r.erreurs_relatives[k] * 100).toFixed(1)} % → ${pct.toFixed(1)} % de σ²_M</span>
      </div>`;
    };
    this.resEl.innerHTML =
      `<b>Tonnage de métal :</b> M = ${r.M.toFixed(1)} t ± ${r.sigma_M.toFixed(1)} t ` +
      `(erreur relative = ${(r.erreur_relative_M * 100).toFixed(1)} %)<br><br>` +
      `<b>Contributions à la variance :</b>` + barre('V') + barre('d') + barre('t') +
      `<br><b>Paramètre dominant :</b> ${NOM[r.parametre_dominant]} ` +
      `(${(r.contributions[r.parametre_dominant] * 100).toFixed(0)} % de σ²_M)`;
  }
}

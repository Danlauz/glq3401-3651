// scripts/geostat-js/widgets/c07_calculateur.js
// -----------------------------------------------------------------------------
// Widget C07 — Atelier 7.7 « Calculateur de variogramme imbriqué » (calque du
// notebook Chap6_Calculateur). Calcule directement la covariance C(h) et le
// variogramme γ(h) en un vecteur h = (Δx, Δy) pour un modèle combinant jusqu'à
// 3 structures ANISOTROPES imbriquées.
//
// Pour une structure : rotation du vecteur h par θ = −(90 − azimut), puis
// distance réduite dist = √((h_rot_x/a_g)² + (h_rot_y/a_p)²) ; covariance selon
// le type ; C_total = Σ structures actives ; γ(h) = Σ paliers actifs − C_total.
// (Calculateur numérique : formules du modèle, pas un algorithme de la librairie.)
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';

const TYPES = [
  ['spherique', 'Sphérique'], ['exponentiel', 'Exponentiel'],
  ['gaussien', 'Gaussien'], ['pepite', 'Effet de pépite'],
];

function distAniso(hx, hy, ag, ap, azimut) {
  const th = -(90 - azimut) * Math.PI / 180;
  const ct = Math.cos(th), st = Math.sin(th);
  const hrx = ct * hx - st * hy, hry = st * hx + ct * hy;
  return Math.sqrt((hrx / Math.max(ag, 1e-9)) ** 2 + (hry / Math.max(ap, 1e-9)) ** 2);
}
function covStruct(type, d, sill) {
  if (type === 'pepite') return d === 0 ? sill : 0;
  if (type === 'exponentiel') return sill * Math.exp(-3 * d);
  if (type === 'gaussien') return sill * Math.exp(-3 * d * d);
  return d < 1 ? sill * (1 - 1.5 * d + 0.5 * d ** 3) : 0;   // sphérique
}

export default class C07Calculateur extends Widget {
  render() {
    const id = this.el.id;
    const carte = (i, on, t, sill, ap, ag, ang) => `
      <div class="cc-card" data-i="${i}">
        <label style="font-weight:700;"><input type="checkbox" class="cc-on" ${on ? 'checked' : ''}> Structure ${i}</label>
        <div class="cc-grid">
          <label>Type <select class="cc-type">${TYPES.map(([v, n]) => `<option value="${v}"${v === t ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
          <label>Palier (c) <input type="number" class="cc-sill" value="${sill}" step="0.1" style="width:64px"></label>
          <label>Portée a<sub>p</sub> (min.) <input type="number" class="cc-ap" value="${ap}" step="1" style="width:64px"></label>
          <label>Portée a<sub>g</sub> (maj.) <input type="number" class="cc-ag" value="${ag}" step="1" style="width:64px"></label>
          <label>Azimut a<sub>g</sub> (°) <input type="number" class="cc-ang" value="${ang}" step="5" style="width:64px"></label>
        </div>
      </div>`;
    this.el.insertAdjacentHTML('beforeend', `
      <style>
        #${id} .cc-wrap{padding:12px 16px;background:#f7f8fa;border:1px solid #e3e6ea;border-radius:12px;font-size:.84rem;}
        #${id} .cc-h{display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-bottom:8px;font-weight:600;}
        #${id} .cc-h input{width:70px;padding:3px 6px;border:1px solid #c7ccd1;border-radius:5px;}
        #${id} .cc-cards{display:flex;gap:10px;flex-wrap:wrap;}
        #${id} .cc-card{flex:1;min-width:210px;border:1px solid #dfe3e8;border-radius:9px;padding:8px 10px;background:#fff;}
        #${id} .cc-grid{display:flex;flex-direction:column;gap:4px;margin-top:5px;}
        #${id} .cc-grid label{display:flex;align-items:center;justify-content:space-between;gap:6px;}
        #${id} .cc-card.off{opacity:.45;}
        #${id} select,#${id} input[type=number]{padding:2px 5px;border:1px solid #c7ccd1;border-radius:5px;}
        #${id} .cc-out{display:flex;gap:24px;justify-content:center;flex-wrap:wrap;margin-top:12px;padding:12px;background:#eef2e8;border:1px solid #b8c8a8;border-radius:10px;font-family:'JetBrains Mono',monospace;}
        #${id} .cc-out b{font-size:1.3rem;color:#2563eb;}
        #${id} .cc-warn{color:#c0392b;text-align:center;font-size:.8rem;margin-top:6px;min-height:1em;}
      </style>
      <div class="cc-wrap">
        <div class="cc-h">
          <span>Vecteur h :</span>
          <label>Δx <input type="number" class="cc-hx" value="5" step="1"></label>
          <label>Δy <input type="number" class="cc-hy" value="0" step="1"></label>
        </div>
        <div class="cc-cards">
          ${carte(1, true, 'spherique', 1.0, 10, 10, 0)}
          ${carte(2, false, 'exponentiel', 0.5, 8, 20, 30)}
          ${carte(3, false, 'gaussien', 0.3, 5, 5, 0)}
        </div>
        <div class="cc-out">
          <span>Covariance &nbsp;<b>C(h) = <span class="cc-C">—</span></b></span>
          <span>Variogramme &nbsp;<b>γ(h) = <span class="cc-G">—</span></b></span>
        </div>
        <div class="cc-warn"></div>
      </div>
    `);

    this.cards = [...this.el.querySelectorAll('.cc-card')];
    this.hx = this.el.querySelector('.cc-hx');
    this.hy = this.el.querySelector('.cc-hy');
    this.outC = this.el.querySelector('.cc-C');
    this.outG = this.el.querySelector('.cc-G');
    this.warnEl = this.el.querySelector('.cc-warn');

    this.on(this.el, 'input', () => this._calc());
    this.on(this.el, 'change', () => this._calc());
    this._calc();
  }

  _calc() {
    const hx = parseFloat(this.hx.value) || 0, hy = parseFloat(this.hy.value) || 0;
    let C = 0, sillTot = 0, warn = '';
    for (const card of this.cards) {
      if (!card.querySelector('.cc-on').checked) { card.classList.add('off'); continue; }
      card.classList.remove('off');
      const type = card.querySelector('.cc-type').value;
      const sill = parseFloat(card.querySelector('.cc-sill').value) || 0;
      const ap = parseFloat(card.querySelector('.cc-ap').value) || 0;
      const ag = parseFloat(card.querySelector('.cc-ag').value) || 0;
      const ang = parseFloat(card.querySelector('.cc-ang').value) || 0;
      if (ag < ap) warn = `⚠️ Structure ${card.dataset.i} : portée a_g (${ag}) < a_p (${ap})`;
      const d = distAniso(hx, hy, ag, ap, ang);
      C += covStruct(type, d, sill);
      sillTot += sill;
    }
    const G = sillTot - C;
    this.outC.textContent = C.toFixed(4);
    this.outG.textContent = G.toFixed(4);
    this.warnEl.textContent = warn;
  }
}

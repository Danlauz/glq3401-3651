// scripts/geostat-js/widgets/c13_objets.js
// -----------------------------------------------------------------------------
// Widget C13 — Modélisation de faciès par OBJETS (booléen / marked-point).
//
// On dépose des OBJETS géologiques sur un fond :
//   - des CHENAUX : rubans sinueux (centre-ligne sinusoïdale + largeur) ;
//   - des LENTILLES : ellipses orientées aléatoirement.
// Contrairement aux méthodes pixel (SIS/TGS/PGS), la GÉOMÉTRIE des corps est
// imposée explicitement → formes réalistes (chenaux sinueux, lentilles), au prix
// d'un conditionnement aux données plus difficile.
// -----------------------------------------------------------------------------
import { Widget } from '../widget-base.js';
import { afficherChargementJusquaPret } from '../pyodide_setup.js';
const N = 300;
const COLS = ['Fond (argile)', 'Chenal (sable)', 'Lentille (silt)'];
const RGB = [[221, 211, 186], [232, 160, 48], [74, 140, 190]];   // fond, chenal, lentille
const SWATCH = ['#ddd3ba', '#e8a030', '#4a8cbe'];
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

export default class C13Objets extends Widget {
  render() {
    const id = this.el.id;
    this.seed = 11;
    this.el.insertAdjacentHTML('beforeend', `
      <style>#${id} .gw-controls label{display:inline-flex !important;flex-direction:row !important;align-items:center;gap:5px;}</style>
      <div class="gw-controls" style="display:flex;flex-wrap:wrap;gap:14px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;">
        <label>Chenaux <input type="range" class="js-nch" min="0" max="10" value="5" step="1" style="width:90px"><span class="js-nchv">5</span></label>
        <label>Largeur <input type="range" class="js-w" min="4" max="40" value="16" step="1" style="width:90px"><span class="js-wv">16</span></label>
        <label>Sinuosité <input type="range" class="js-amp" min="0" max="60" value="28" step="2" style="width:90px"><span class="js-ampv">28</span></label>
        <label>Lonng. d'onde <input type="range" class="js-wl" min="40" max="260" value="130" step="10" style="width:90px"><span class="js-wlv">130</span></label>
        <label>Pente ° <input type="range" class="js-ang" min="-30" max="30" value="0" step="5" style="width:80px"><span class="js-angv">0</span></label>
        <label>Lentilles <input type="range" class="js-nl" min="0" max="40" value="14" step="1" style="width:90px"><span class="js-nlv">14</span></label>
        <label>Taille lent. <input type="range" class="js-ls" min="6" max="40" value="18" step="2" style="width:90px"><span class="js-lsv">18</span></label>
        <button class="js-regen" type="button" style="font-size:.78rem;padding:4px 10px;background:#3a3632;color:#fff;border:none;border-radius:5px;cursor:pointer;">Nouveau tirage</button>
      </div>
      <div style="text-align:center;margin-top:8px;">
        <canvas class="js-field" width="${N}" height="${N}" style="width:100%;max-width:420px;border:1px solid #bbb;image-rendering:pixelated;"></canvas>
      </div>
      <div class="js-info" style="padding:.45rem 1rem;font-family:'JetBrains Mono',monospace;font-size:.82rem;color:#333;text-align:center;background:#eef2f7;border:1px solid #c4d2e0;border-radius:6px;margin-top:6px;">—</div>
      <p style="margin:4px 1rem;font-size:11px;color:#666;">
        Les <b style="color:#e8a030">chenaux</b> (rubans sinueux) et les <b style="color:#4a8cbe">lentilles</b> (ellipses) sont déposés sur un <b style="color:#b8ac86">fond argileux</b>. La forme des corps est imposée directement — d'où des géométries réalistes que les méthodes pixel peinent à reproduire. Les chenaux récents recoupent les plus anciens.</p>
    `);
    this.canvas = this.el.querySelector('.js-field'); this.fctx = this.canvas.getContext('2d');
    this.infoEl = this.el.querySelector('.js-info');
    this.ctrl = {};
    for (const k of ['nch', 'w', 'amp', 'wl', 'ang', 'nl', 'ls']) { this.ctrl[k] = this.el.querySelector('.js-' + k); this.on(this.ctrl[k], 'input', e => { this.el.querySelector('.js-' + k + 'v').textContent = e.target.value; this._draw(); }); }
    this.on(this.el.querySelector('.js-regen'), 'click', () => { this.seed = Math.floor(Math.random() * 1e6); this._draw(); });
    afficherChargementJusquaPret(this.el).then(() => this._draw());
  }

  _draw() {
    const v = k => parseFloat(this.ctrl[k].value);
    const nch = v('nch'), w = v('w'), amp = v('amp'), wl = v('wl'), slope = Math.tan(v('ang') * Math.PI / 180), nl = v('nl'), ls = v('ls');
    const rng = mulberry32(this.seed);
    const F = new Uint8Array(N * N);   // 0 fond
    // Lentilles (déposées avant les chenaux → recoupées par eux).
    for (let l = 0; l < nl; l++) {
      const cx = rng() * N, cy = rng() * N, a = ls * (0.6 + rng()), b = ls * (0.3 + 0.5 * rng()), th = rng() * Math.PI, ct = Math.cos(th), st = Math.sin(th);
      const rmax = Math.ceil(Math.max(a, b));
      for (let dj = -rmax; dj <= rmax; dj++) for (let di = -rmax; di <= rmax; di++) {
        const i = Math.round(cx + di), j = Math.round(cy + dj); if (i < 0 || i >= N || j < 0 || j >= N) continue;
        const u = (di * ct + dj * st) / a, vv = (-di * st + dj * ct) / b;
        if (u * u + vv * vv <= 1) F[j * N + i] = 2;
      }
    }
    // Chenaux : centre-ligne sinusoïdale, déposés du plus ancien au plus récent.
    for (let c = 0; c < nch; c++) {
      const y0 = rng() * N, phase = rng() * 2 * Math.PI, wlc = wl * (0.7 + 0.6 * rng()), ampc = amp * (0.6 + 0.8 * rng()), hw = (w * (0.7 + 0.6 * rng())) / 2;
      for (let i = 0; i < N; i++) {
        const yc = y0 + slope * (i - N / 2) + ampc * Math.sin(2 * Math.PI * i / wlc + phase);
        const jlo = Math.floor(yc - hw), jhi = Math.ceil(yc + hw);
        for (let j = jlo; j <= jhi; j++) { if (j < 0 || j >= N) continue; F[j * N + i] = 1; }
      }
    }
    // Rendu.
    const img = this.fctx.createImageData(N, N);
    const counts = [0, 0, 0];
    for (let p = 0; p < N * N; p++) { const f = F[p]; counts[f]++; const c = RGB[f], o = p * 4; img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255; }
    this.fctx.putImageData(img, 0, 0);
    const tot = N * N;
    this.infoEl.innerHTML = COLS.map((nom, k) => `<span style="color:${SWATCH[k]}">■</span> ${nom} : <b>${(100 * counts[k] / tot).toFixed(1)} %</b>`).join(' &nbsp; ');
  }

  cleanup() { }
}

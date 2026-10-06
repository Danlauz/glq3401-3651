// scripts/geostat-js/widgets/c13_tg_pgs.js
// -----------------------------------------------------------------------------
// Widget C13 — Gaussienne tronquée (TGS) & pluri-gaussienne (PGS), champ 500×500.
//
// Covariance des champs latents = modèle imbriqué (format chap. 7). Champs rendus
// par ImageData (rapide à 500×500).
//   - TGS : un champ Y₁. Le patron de codage est la LOI NORMALE avec des SEUILS
//     DÉPLAÇABLES (on glisse les bornes directement sur le graphe).
//   - PGS : deux champs Y₁, Y₂. Le patron est une carte 2D du plan (Y₁, Y₂),
//     choisie dans une BANQUE de patrons (bandes, rectangles, cercles…) et/ou
//     peinte à la main (faciès au pinceau).
// -----------------------------------------------------------------------------
import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';
const debounce = (fn, ms = 400) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const COLORS = ['#3b6fb6', '#e0a030', '#4aa564', '#c0504d'];
const RGB = [[59, 111, 182], [224, 160, 48], [74, 165, 100], [192, 80, 77]];
const PG = 28, N = 500;
const TYPES = [['spherique', 'Sphérique'], ['exponentiel', 'Exponentiel'], ['gaussien', 'Gaussien'], ['pepite', 'Pépite']];
function erf(x) { const s = x < 0 ? -1 : 1; x = Math.abs(x); const t = 1 / (1 + 0.3275911 * x); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return s * y; }
const Phi = x => 0.5 * (1 + erf(x / Math.SQRT2));
function invNorm(p) {
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0, -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0, 3.754408661907416e0];
  const pl = 0.02425; let q, r;
  if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p <= 1 - pl) { q = p - 0.5; r = q * q; return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
  q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
}
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function gaussR(rng) { let u = 0, v = 0; while (u === 0) u = rng(); while (v === 0) v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
// Palette TURBO (champs continus, uniforme dans tout le livre).
const TURBO_STOPS = [[48, 18, 59], [65, 69, 217], [35, 138, 244], [30, 192, 211], [53, 226, 149], [131, 246, 88], [199, 233, 47], [248, 186, 56], [251, 122, 33], [221, 61, 8], [122, 4, 3]];
function colLatentRGB(t) { t = Math.max(0, Math.min(1, t)); const x = t * 10, i = Math.min(9, Math.floor(x)), f = x - i, a = TURBO_STOPS[i], b = TURBO_STOPS[i + 1]; return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]; }
// Banque de patrons PGS (x,y dans [0,1]) -> indice de faciès.
const PRESETS = [
  ['Choix 1 — bandes verticales', (x, y, K) => Math.min(K - 1, Math.floor(x * K))],
  ['Choix 2 — bandes horizontales', (x, y, K) => Math.min(K - 1, Math.floor(y * K))],
  ['Choix 3 — quadrants', (x, y, K) => ((x < 0.5 ? 0 : 1) + (y < 0.5 ? 0 : 2)) % K],
  ['Choix 4 — rectangle central (enveloppe)', (x, y, K) => (x > 0.32 && x < 0.68 && y > 0.32 && y < 0.68) ? Math.min(K - 1, 1) : 0],
  ['Choix 5 — disque central', (x, y, K) => Math.hypot(x - 0.5, y - 0.5) < 0.28 ? Math.min(K - 1, 1) : 0],
  ['Choix 6 — anneaux concentriques', (x, y, K) => Math.min(K - 1, Math.floor(Math.hypot(x - 0.5, y - 0.5) / 0.52 * K))],
  ['Choix 7 — diagonale', (x, y, K) => Math.min(K - 1, Math.floor((x + y) / 2 * K))],
  ['Choix 8 — damier 3×3', (x, y, K) => (Math.floor(x * 3) + Math.floor(y * 3)) % K],
  ['Choix 9 — bandes obliques', (x, y, K) => Math.min(K - 1, Math.floor((((x * 0.7 + (1 - y) * 0.3)) % 1) * K))],
  ['Choix 10 — disque en coin + bande', (x, y, K) => Math.hypot(x, y) < 0.45 ? Math.min(K - 1, 1) : (x > 0.72 ? Math.min(K - 1, 2 % K) : 0)],
];
function carte(i, on, t, sill, ap, ag, az) {
  return `<div class="cc-card" data-i="${i}">
    <label style="font-weight:700;font-size:.76rem;"><input type="checkbox" class="cc-on" ${on ? 'checked' : ''}> Structure ${i}</label>
    <div class="cc-grid">
      <label>Type <select class="cc-type">${TYPES.map(([v, n]) => `<option value="${v}"${v === t ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
      <label>Palier c <input type="number" class="cc-sill" value="${sill}" step="0.1" style="width:54px"></label>
      <label><span>Portée min a<sub>p</sub></span> <input type="number" class="cc-ap" value="${ap}" step="5" style="width:54px"></label>
      <label><span>Portée maj a<sub>g</sub></span> <input type="number" class="cc-ag" value="${ag}" step="5" style="width:54px"></label>
      <label>Azimut ° <input type="number" class="cc-az" value="${az}" step="5" style="width:54px"></label>
    </div></div>`;
}

export default class C13TGPGS extends Widget {
  render() {
    const id = this.el.id;
    this.seed = 7; this.mode = 'tgs'; this.K = 3; this.active = 0; this.painting = false; this.dragIdx = -1;
    this.thr = []; this._resetThresholds();
    this.el.insertAdjacentHTML('beforeend', `
      <style>#${id} .gw-controls label{display:inline-flex !important;flex-direction:row !important;align-items:center;gap:5px;}
        #${id} .fac-btn{width:24px;height:24px;border-radius:5px;border:2px solid #fff;outline:1px solid #aaa;cursor:pointer;}
        #${id} .fac-btn.sel{outline:3px solid #111;}
        #${id} .cc-cards{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;}
        #${id} .cc-card{flex:1;min-width:185px;border:1px solid #dfe3e8;border-radius:9px;padding:6px 9px;background:#fff;font-size:.78rem;}
        #${id} .cc-grid{display:flex;flex-direction:column;gap:3px;margin-top:4px;}
        #${id} .cc-grid label{display:flex;align-items:center;justify-content:space-between;gap:6px;}
        #${id} .cc-card.off{opacity:.42;}
        #${id} .cc-card select,#${id} .cc-card input[type=number]{padding:1px 4px;border:1px solid #c7ccd1;border-radius:5px;}
        #${id} .gw-tiles{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;align-items:flex-start;margin-top:8px;}
        #${id} .tile{width:250px;text-align:center;}
        #${id} .tile canvas{width:100%;height:auto;display:block;margin:2px auto;border:1px solid #bbb;}
        #${id} .tile canvas.sq{image-rendering:pixelated;}
        #${id} .tlab{font-size:11px;color:#444;margin-bottom:2px;min-height:13px;}</style>
      <div class="gw-controls" style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;">
        <span style="display:inline-flex;border:1px solid #bbb;border-radius:6px;overflow:hidden;">
          <button class="js-tgs" type="button" style="padding:5px 12px;border:none;background:#0d4d92;color:#fff;cursor:pointer;font-size:.8rem;">TGS (1 champ)</button>
          <button class="js-pgs" type="button" style="padding:5px 12px;border:none;background:#fff;cursor:pointer;font-size:.8rem;">PGS (2 champs)</button>
        </span>
        <label>Faciès <select class="js-K"><option>2</option><option selected>3</option><option>4</option></select></label>
        <span class="js-pgs-only"><span>Patron :</span> <select class="js-preset" style="font-size:.78rem;">${PRESETS.map((p, i) => `<option value="${i}">${p[0]}</option>`).join('')}</select></span>
        <span class="js-pgs-only">Pinceau : <span class="js-pal" style="display:inline-flex;gap:5px;"></span></span>
        <button class="js-regen" type="button" style="font-size:.76rem;padding:4px 10px;background:#3a3632;color:#fff;border:none;border-radius:5px;cursor:pointer;">Nouveau champ</button>
        <button class="js-var" type="button" style="font-size:.76rem;padding:4px 10px;background:#1f8a4c;color:#fff;border:none;border-radius:5px;cursor:pointer;">Variabilité (300 sim.)</button>
      </div>
      <div style="padding:6px 12px;background:#f4f6f8;border:1px solid #ddd;border-radius:8px;margin-top:4px;">
        <b style="font-size:.78rem;"><span class="js-y1lab">Covariance des champs latents</span> (modèle imbriqué) :</b>
        <div class="cc-cards js-model js-model1">
          ${carte(1, true, 'spherique', 1.0, 70, 70, 0)}
          ${carte(2, false, 'gaussien', 0.4, 40, 40, 0)}
          ${carte(3, false, 'pepite', 0.2, 1, 1, 0)}
        </div>
      </div>
      <div class="js-model2box js-pgs-only" style="padding:6px 12px;background:#f4f6f8;border:1px solid #ddd;border-radius:8px;margin-top:4px;">
        <b style="font-size:.78rem;">Covariance de Y₂ (modèle imbriqué) :</b>
        <div class="cc-cards js-model js-model2">
          ${carte(1, true, 'spherique', 1.0, 120, 40, 90)}
          ${carte(2, false, 'exponentiel', 0.4, 40, 40, 0)}
          ${carte(3, false, 'pepite', 0.2, 1, 1, 0)}
        </div>
      </div>
      <div class="gw-tiles">
        <div class="tile">
          <div class="tlab">Patron de codage <span class="js-axis"></span></div>
          <canvas class="js-law" width="300" height="300" style="cursor:ew-resize;touch-action:none;display:none;"></canvas>
          <canvas class="js-part sq" width="300" height="300" style="cursor:crosshair;touch-action:none;display:none;"></canvas>
          <div class="js-hint" style="font-size:10px;color:#888;"></div>
        </div>
        <div class="tile">
          <div class="tlab">Champ de faciès</div>
          <canvas class="js-field sq" width="${N}" height="${N}"></canvas>
        </div>
        <div class="tile">
          <div class="tlab">Champ latent Y₁</div>
          <canvas class="js-y1 sq" width="${N}" height="${N}"></canvas>
        </div>
        <div class="tile js-y2box">
          <div class="tlab">Champ latent Y₂</div>
          <canvas class="js-y2 sq" width="${N}" height="${N}"></canvas>
        </div>
      </div>
      <div class="js-info" style="padding:.4rem 1rem;font-family:'JetBrains Mono',monospace;font-size:.8rem;color:#444;text-align:center;background:#f0f0f0;border-radius:6px;margin-top:8px;">—</div>
      <div class="js-box" style="height:300px;margin-top:6px;display:none;"></div>
      <p style="margin:4px 1rem;font-size:11px;color:#666;">
        Construisez la <b>covariance</b> des champs latents (modèle imbriqué). En <b>TGS</b>, glissez les <b>seuils</b> directement sur la loi normale. En <b>PGS</b>, choisissez un <b>patron</b> dans la banque (bandes, rectangles, cercles…) puis retouchez au pinceau.</p>
    `);
    this.lawC = this.el.querySelector('.js-law'); this.partC = this.el.querySelector('.js-part'); this.pctx = this.partC.getContext('2d');
    this.fieldC = this.el.querySelector('.js-field'); this.y1C = this.el.querySelector('.js-y1'); this.y2C = this.el.querySelector('.js-y2');
    this.infoEl = this.el.querySelector('.js-info'); this.hintEl = this.el.querySelector('.js-hint'); this.boxEl = this.el.querySelector('.js-box');
    this.ctrl = { K: this.el.querySelector('.js-K'), preset: this.el.querySelector('.js-preset') };
    this.btnTgs = this.el.querySelector('.js-tgs'); this.btnPgs = this.el.querySelector('.js-pgs');
    this.on(this.btnTgs, 'click', () => this._setMode('tgs'));
    this.on(this.btnPgs, 'click', () => this._setMode('pgs'));
    this.on(this.ctrl.K, 'change', () => { this.K = parseInt(this.ctrl.K.value, 10); if (this.active >= this.K) this.active = this.K - 1; this._resetThresholds(); this._loadPreset(); this._buildPalette(); this._recode(); this._drawLaw(); });
    this.on(this.ctrl.preset, 'change', () => { this._loadPreset(); this._recode(); });
    const reSim = debounce(() => this._regen(), 400);
    this.el.querySelectorAll('.js-model').forEach(m => { this.on(m, 'input', reSim); this.on(m, 'change', reSim); });
    this.on(this.el.querySelector('.js-regen'), 'click', () => { this.seed++; this._regen(); });
    this.on(this.el.querySelector('.js-var'), 'click', () => this._variability());
    // PGS painting.
    const paint = e => { if (this.painting) this._paintAt(e); };
    this.on(this.partC, 'pointerdown', e => { this.painting = true; this.partC.setPointerCapture(e.pointerId); this._paintAt(e); });
    this.on(this.partC, 'pointermove', paint);
    this.on(this.partC, 'pointerup', () => { this.painting = false; });
    this.on(this.partC, 'pointerleave', () => { this.painting = false; });
    // TGS threshold dragging.
    this.on(this.lawC, 'pointerdown', e => { this.lawC.setPointerCapture(e.pointerId); this._lawDown(e); });
    this.on(this.lawC, 'pointermove', e => { if (this.dragIdx >= 0) this._lawMove(e); });
    this.on(this.lawC, 'pointerup', () => { this.dragIdx = -1; });
    this.on(this.lawC, 'pointerleave', () => { this.dragIdx = -1; });
    this._buildPalette(); this._setMode('tgs');
    afficherChargementJusquaPret(this.el).then(() => { this._ready = true; this._regen(); });
  }

  _resetThresholds() { this.thr = []; for (let k = 1; k < this.K; k++) this.thr.push(invNorm(k / this.K)); }
  _loadPreset() { const f = PRESETS[+this.ctrl.preset.value][1]; this.pattern = new Int8Array(PG * PG); for (let r = 0; r < PG; r++) for (let c = 0; c < PG; c++) this.pattern[r * PG + c] = Math.max(0, Math.min(this.K - 1, f((c + 0.5) / PG, (r + 0.5) / PG, this.K))); if (this.partC) this._drawPattern(); }

  _setMode(m) {
    this.mode = m;
    this.btnTgs.style.background = m === 'tgs' ? '#0d4d92' : '#fff'; this.btnTgs.style.color = m === 'tgs' ? '#fff' : '#333';
    this.btnPgs.style.background = m === 'pgs' ? '#0d4d92' : '#fff'; this.btnPgs.style.color = m === 'pgs' ? '#fff' : '#333';
    this.lawC.style.display = m === 'tgs' ? '' : 'none';
    this.partC.style.display = m === 'pgs' ? '' : 'none';
    this.el.querySelector('.js-y2box').style.display = m === 'pgs' ? '' : 'none';
    this.el.querySelectorAll('.js-pgs-only').forEach(e => e.style.display = m === 'pgs' ? '' : 'none');
    this.el.querySelector('.js-axis').textContent = m === 'pgs' ? '(Y₁ →, Y₂ ↑)' : '(glissez les seuils)';
    this.el.querySelector('.js-y1lab').textContent = 'Covariance de Y₁';
    this.hintEl.textContent = m === 'tgs' ? 'glissez les bornes sur la courbe' : 'choisissez un patron, puis peignez';
    if (m === 'pgs' && !this.pattern) this._loadPreset();
    if (this._ready) this._regen(); else this._drawLaw();
  }

  _buildPalette() {
    const pal = this.el.querySelector('.js-pal'); pal.innerHTML = '';
    for (let k = 0; k < this.K; k++) { const b = document.createElement('button'); b.className = 'fac-btn' + (k === this.active ? ' sel' : ''); b.style.background = COLORS[k]; this.on(b, 'click', () => { this.active = k; this._buildPalette(); }); pal.appendChild(b); }
  }

  _readModel(box) {
    const out = [];
    for (const card of box.querySelectorAll('.cc-card')) {
      if (!card.querySelector('.cc-on').checked) { card.classList.add('off'); continue; }
      card.classList.remove('off');
      out.push({ type: card.querySelector('.cc-type').value, sill: +card.querySelector('.cc-sill').value || 0, ap: Math.max(1, +card.querySelector('.cc-ap').value || 1), ag: Math.max(1, +card.querySelector('.cc-ag').value || 1), az: +card.querySelector('.cc-az').value || 0 });
    }
    return out;
  }
  _box(which) { return this.el.querySelector('.js-model' + which); }
  _bridgeStructs(box, scl) { return this._readModel(box).map(s => s.type === 'pepite' ? { type: 'pepite', sill: s.sill } : { type: s.type, rx: s.ag * scl, ry: s.ap * scl, angle: s.az, sill: s.sill }); }

  async _simField(seedBase, box) {
    const structs = this._readModel(box), Y = new Float64Array(N * N); let k = 0;
    for (const s of structs) {
      if (s.sill <= 0) { k++; continue; }
      if (s.type === 'pepite') { const rng = mulberry32(seedBase + 9173 + 1000 * k); const sd = Math.sqrt(s.sill); for (let i = 0; i < N * N; i++) Y[i] += sd * gaussR(rng); }
      else { const f = await gpoly.simulerChampAniso(s.type, s.ag, s.ap, s.az, 0, seedBase + 1000 * k, N, 'gaussien', 0, s.sill); for (let i = 0; i < N * N; i++) Y[i] += f[i]; }
      k++;
    }
    let m = 0; for (let i = 0; i < N * N; i++) m += Y[i]; m /= N * N;
    let v = 0; for (let i = 0; i < N * N; i++) v += (Y[i] - m) ** 2; v /= N * N; const sd = Math.sqrt(v) || 1;
    for (let i = 0; i < N * N; i++) Y[i] = (Y[i] - m) / sd;
    return Y;
  }

  async _regen() {
    try {
      this.Y1 = await this._simField(this.seed, this._box(1));
      this.u1 = new Float32Array(N * N); for (let i = 0; i < N * N; i++) this.u1[i] = Phi(this.Y1[i]);
      if (this.mode === 'pgs') { this.Y2 = await this._simField(this.seed + 50000, this._box(2)); this.u2 = new Float32Array(N * N); for (let i = 0; i < N * N; i++) this.u2[i] = Phi(this.Y2[i]); }
    } catch (e) { this.afficherAvertissement('Erreur simulation : ' + e.message); return; }
    if (this.mode === 'pgs' && !this.pattern) this._loadPreset();
    this._blit(this.y1C, this.Y1, true);
    if (this.mode === 'pgs') this._blit(this.y2C, this.Y2, true);
    this._drawLaw(); this._recode();
  }

  _blit(cv, data, latent) {
    const ctx = cv.getContext('2d'), img = ctx.createImageData(N, N);
    for (let p = 0; p < N * N; p++) { const o = p * 4; let r, g, b; if (latent) { const rgb = colLatentRGB((data[p] + 3) / 6); r = rgb[0]; g = rgb[1]; b = rgb[2]; } else { const c = RGB[data[p]]; r = c[0]; g = c[1]; b = c[2]; } img.data[o] = r; img.data[o + 1] = g; img.data[o + 2] = b; img.data[o + 3] = 255; }
    ctx.putImageData(img, 0, 0);
  }

  _paintAt(e) {
    const rect = this.partC.getBoundingClientRect();
    const c = Math.floor((e.clientX - rect.left) / rect.width * PG), r = Math.floor((e.clientY - rect.top) / rect.height * PG);
    if (c < 0 || c >= PG || r < 0 || r >= PG) return;
    this.pattern[r * PG + c] = this.active; this._drawPattern(); this._recode();
  }

  _drawPattern() {
    const ctx = this.pctx, W = this.partC.width, cell = W / PG;
    for (let r = 0; r < PG; r++) for (let c = 0; c < PG; c++) { ctx.fillStyle = COLORS[this.pattern[r * PG + c]]; ctx.fillRect(c * cell, r * cell, cell + 0.6, cell + 0.6); }
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 0.5;
    for (let k = 0; k <= PG; k += 4) { ctx.beginPath(); ctx.moveTo(k * cell, 0); ctx.lineTo(k * cell, W); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, k * cell); ctx.lineTo(W, k * cell); ctx.stroke(); }
  }

  _drawLaw() {
    const cv = this.lawC, ctx = cv.getContext('2d'), W = cv.width, H = cv.height, top = 14;
    ctx.clearRect(0, 0, W, H);
    const x2p = y => (y + 3.5) / 7 * W, phi = y => Math.exp(-0.5 * y * y), ymax = 1;
    const bounds = [-3.5, ...this.thr, 3.5];
    for (let seg = 0; seg < bounds.length - 1; seg++) {
      ctx.fillStyle = COLORS[Math.min(this.K - 1, seg)]; ctx.globalAlpha = 0.6; ctx.beginPath();
      const y0 = bounds[seg], y1 = bounds[seg + 1]; ctx.moveTo(x2p(y0), H);
      for (let y = y0; y <= y1; y += 0.02) ctx.lineTo(x2p(y), H - phi(y) / ymax * (H - top - 4));
      ctx.lineTo(x2p(y1), H); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let y = -3.5; y <= 3.5; y += 0.02) { const px = x2p(y), py = H - phi(y) / ymax * (H - top - 4); if (y === -3.5) ctx.moveTo(px, py); else ctx.lineTo(px, py); } ctx.stroke();
    for (const t of this.thr) { const px = x2p(t); ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, top - 4); ctx.lineTo(px, H); ctx.stroke(); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(px, top - 4, 6, 0, 2 * Math.PI); ctx.fill(); }
  }

  _lawDown(e) {
    const rect = this.lawC.getBoundingClientRect(), W = this.lawC.width;
    const yv = (e.clientX - rect.left) / rect.width * 7 - 3.5;
    let best = -1, bd = 1e9; this.thr.forEach((t, i) => { const d = Math.abs(t - yv); if (d < bd) { bd = d; best = i; } });
    if (best >= 0 && bd < 0.6) { this.dragIdx = best; this._lawMove(e); }
  }
  _lawMove(e) {
    const rect = this.lawC.getBoundingClientRect();
    let yv = (e.clientX - rect.left) / rect.width * 7 - 3.5;
    const lo = this.dragIdx > 0 ? this.thr[this.dragIdx - 1] + 0.05 : -3.4;
    const hi = this.dragIdx < this.thr.length - 1 ? this.thr[this.dragIdx + 1] - 0.05 : 3.4;
    this.thr[this.dragIdx] = Math.max(lo, Math.min(hi, yv));
    this._drawLaw(); this._recode();
  }

  // Proportions THÉORIQUES (intégrales du patron).
  _theoProps() {
    const theo = new Array(this.K).fill(0);
    if (this.mode === 'tgs') { const U = [0, ...this.thr.map(Phi), 1]; for (let k = 0; k < this.K; k++) theo[k] = U[k + 1] - U[k]; }
    else { if (!this.pattern) this._loadPreset(); for (let i = 0; i < PG * PG; i++) theo[this.pattern[i]]++; for (let k = 0; k < this.K; k++) theo[k] /= PG * PG; }
    return theo;
  }

  _facies(y1, u1, u2) {
    if (this.mode === 'tgs') { let f = 0; for (const t of this.thr) if (y1 >= t) f++; return Math.min(this.K - 1, f); }
    const c = Math.min(PG - 1, Math.max(0, Math.floor(u1 * PG))), r = Math.min(PG - 1, Math.max(0, Math.floor(u2 * PG)));
    return this.pattern[r * PG + c];
  }

  _recode() {
    if (!this.u1) return;
    const fField = new Uint8Array(N * N), counts = new Array(this.K).fill(0);
    if (this.mode === 'pgs' && !this.pattern) this._loadPreset();
    for (let p = 0; p < N * N; p++) { const f = this._facies(this.Y1[p], this.u1[p], this.mode === 'pgs' ? this.u2[p] : 0); fField[p] = f; counts[f]++; }
    this._blit(this.fieldC, fField, false);
    const tot = N * N, theo = this._theoProps();
    this.infoEl.innerHTML = `<b>${this.mode.toUpperCase()}</b> · ` +
      counts.map((c, k) => `<span style="color:${COLORS[k]}">F${k + 1} : théo ${(100 * theo[k]).toFixed(1)} % | simulé <b>${(100 * c / tot).toFixed(1)} %</b></span>`).join(' &nbsp; ') +
      ` <span style="color:#888">(l'écart est normal : une simulation fluctue autour de la cible)</span>`;
  }

  async _variability() {
    const btn = this.el.querySelector('.js-var'); btn.disabled = true; const old = btn.textContent; btn.textContent = 'Calcul…';
    const NB = 100, NSIM = 300, scl = NB / N;
    // Portées mises à l'échelle de la grille réduite → même ratio portée/domaine
    // que le champ 500×500 (variabilité ergodique représentative). Y₁ et Y₂ ont
    // chacun leur propre modèle.
    try {
      const s1 = await gpoly.simuler2DNestedN(this._bridgeStructs(this._box(1), scl), this.seed + 1, NB, NSIM);
      let s2 = null; if (this.mode === 'pgs') s2 = await gpoly.simuler2DNestedN(this._bridgeStructs(this._box(2), scl), this.seed + 50001, NB, NSIM);
      const tot = NB * NB, byFac = Array.from({ length: this.K }, () => []);
      for (let si = 0; si < NSIM; si++) {
        const Y1 = s1[si], Y2 = s2 ? s2[si] : null, cnt = new Array(this.K).fill(0);
        for (let p = 0; p < tot; p++) { const u1 = Phi(Y1[p]), u2 = Y2 ? Phi(Y2[p]) : 0; cnt[this._facies(Y1[p], u1, u2)]++; }
        for (let k = 0; k < this.K; k++) byFac[k].push(100 * cnt[k] / tot);
      }
      const theo = this._theoProps(), names = Array.from({ length: this.K }, (_, k) => 'F' + (k + 1));
      const traces = byFac.map((arr, k) => ({ type: 'box', y: arr, name: names[k], marker: { color: COLORS[k] }, boxpoints: false, showlegend: false }));
      traces.push({ type: 'scatter', x: names, y: theo.map(p => 100 * p), mode: 'markers', marker: { symbol: 'line-ew', color: '#111', size: 26, line: { width: 3 } }, name: 'théorique' });
      this.boxEl.style.display = '';
      Plotly.react(this.boxEl, traces, {
        margin: { t: 28, l: 44, r: 10, b: 30 }, title: { text: `Variabilité des proportions sur ${NSIM} simulations (grille ${NB}×${NB}) — trait noir = théorique`, font: { size: 11.5 } },
        yaxis: { title: { text: 'proportion (%)', standoff: 4 } }, showlegend: false,
      }, { displaylogo: false, responsive: true, displayModeBar: false });
    } catch (e) { this.afficherAvertissement('Erreur variabilité : ' + e.message); }
    btn.disabled = false; btn.textContent = old;
  }

  cleanup() { if (window.Plotly && this.boxEl) Plotly.purge(this.boxEl); }
}

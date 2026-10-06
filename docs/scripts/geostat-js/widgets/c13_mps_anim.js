// scripts/geostat-js/widgets/c13_mps_anim.js
// -----------------------------------------------------------------------------
// Widget C13 — Animation de la simulation multipoints (MPS).
//
// Images d'entraînement (TI) réelles fournies avec le livre, stockées LOCALEMENT
// dans la librairie (scripts/geostat-js/ti/*.SGEMS) — aucune dépendance externe.
// Le chemin est résolu via import.meta.url (relatif au module). Repli procédural
// si un fichier est absent. On simule une réalisation reproduisant les MOTIFS :
//   - DeeSse (échantillonnage direct, PAR POINT) en MULTIGRILLE ;
//   - FilterSim (PAR PATCH, quilting).
// Un rectangle rouge montre la zone de la TI scannée/copiée à chaque pas.
// -----------------------------------------------------------------------------
import { Widget } from '../widget-base.js';
import { afficherChargementJusquaPret } from '../pyodide_setup.js';
const SN = 110;
const RGBP = [[238, 232, 214], [196, 120, 38], [70, 130, 180], [110, 170, 90], [150, 90, 160]];
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// TI synthétiques de secours.
function gChenaux(n, seed) {
  const T = new Uint8Array(n * n), rng = mulberry32(seed), sp = n / 7;
  for (let c = 0; c < 7; c++) { const y0 = (c + 0.5) * sp, ph = rng() * 6.28, wl = n * 0.26, amp = sp * 0.9, hw = n * 0.017; for (let i = 0; i < n; i++) { const yc = y0 + amp * Math.sin(2 * Math.PI * i / wl + ph); for (let j = Math.round(yc - hw); j <= Math.round(yc + hw); j++) { const jj = ((j % n) + n) % n; T[jj * n + i] = 1; } } }
  return T;
}
const TIBANK = [
  ['Méandres (réel)', { url: 'ti_meandres_500x500.SGEMS' }],
  ['Chenaux 2D (réel)', { url: 'ti_2D_channels_400x340.SGEMS' }],
  ['Pierres (réel)', { url: 'ti_pierres.SGEMS' }],
  ['Dunes — 3 faciès (réel)', { url: 'dunes_3facies.SGEMS' }],
  ['Damier (réel)', { url: 'damier500x500.SGEMS' }],
  ['Chenaux (synthétique)', { gen: gChenaux }],
];

export default class C13MPSAnim extends Widget {
  render() {
    const id = this.el.id;
    this.seed = 4; this.mode = 'deesse'; this.timer = null; this.g = 0; this.tiKind = 0; this.busy = false; this.cache = {};
    this.el.insertAdjacentHTML('beforeend', `
      <style>#${id} .gw-controls label{display:inline-flex !important;flex-direction:row !important;align-items:center;gap:5px;}
        #${id} .tile{width:250px;text-align:center;} #${id} .tile canvas{width:100%;height:auto;border:1px solid #bbb;image-rendering:pixelated;display:block;margin:2px auto;}
        #${id} .tlab{font-size:11px;color:#444;margin-bottom:2px;}</style>
      <div class="gw-controls" style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;">
        <span style="display:inline-flex;border:1px solid #bbb;border-radius:6px;overflow:hidden;">
          <button class="js-pt" type="button" style="padding:5px 12px;border:none;background:#0d4d92;color:#fff;cursor:pointer;font-size:.8rem;">DeeSse (par point)</button>
          <button class="js-pa" type="button" style="padding:5px 12px;border:none;background:#fff;cursor:pointer;font-size:.8rem;">FilterSim (par patch)</button>
        </span>
        <label>Image d'entraînement <select class="js-ti-sel" style="font-size:.78rem;">${TIBANK.map((t, i) => `<option value="${i}">${t[0]}</option>`).join('')}</select></label>
        <button class="js-play" type="button" style="font-size:.82rem;padding:5px 14px;background:#1f8a4c;color:#fff;border:none;border-radius:5px;cursor:pointer;font-weight:600;">▶ Lancer</button>
        <label>Vitesse <input type="range" class="js-spd" min="1" max="5" value="3" step="1" style="width:78px"></label>
        <button class="js-regen" type="button" style="font-size:.76rem;padding:4px 10px;background:#3a3632;color:#fff;border:none;border-radius:5px;cursor:pointer;">Nouveau tirage</button>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:16px;justify-content:center;margin-top:8px;">
        <div class="tile"><div class="tlab">Image d'entraînement (TI) — <span style="color:#e11">▢</span> zone copiée</div><canvas class="js-ti" width="220" height="220"></canvas></div>
        <div class="tile"><div class="tlab">Réalisation simulée — <span style="color:#e11">▢</span> en cours</div><canvas class="js-sim" width="${SN}" height="${SN}"></canvas></div>
      </div>
      <div class="js-info" style="padding:.4rem 1rem;font-family:'JetBrains Mono',monospace;font-size:.8rem;color:#444;text-align:center;background:#f0f0f0;border-radius:6px;margin-top:6px;">—</div>
      <p style="margin:4px 1rem;font-size:11px;color:#666;">
        <b>Lancez l'animation</b> : la réalisation reproduit les <b>motifs</b> de la TI. <b style="color:#0d4d92">DeeSse</b> remplit par point (multigrille) ; <b style="color:#0d4d92">FilterSim</b> par patchs. Le <b style="color:#e11">rectangle rouge</b> montre la zone scannée/copiée dans la TI.</p>
    `);
    this.tiC = this.el.querySelector('.js-ti'); this.simC = this.el.querySelector('.js-sim');
    this.infoEl = this.el.querySelector('.js-info'); this.playBtn = this.el.querySelector('.js-play');
    this.btnPt = this.el.querySelector('.js-pt'); this.btnPa = this.el.querySelector('.js-pa'); this.spd = this.el.querySelector('.js-spd');
    this.on(this.btnPt, 'click', () => this._setMode('deesse'));
    this.on(this.btnPa, 'click', () => this._setMode('filtersim'));
    this.on(this.el.querySelector('.js-ti-sel'), 'change', e => { this.tiKind = +e.target.value; this._regen(); });
    this.on(this.playBtn, 'click', () => this._togglePlay());
    this.on(this.el.querySelector('.js-regen'), 'click', () => { this.seed++; this._regen(); });
    afficherChargementJusquaPret(this.el).then(() => this._regen());
  }

  _setMode(m) {
    this.mode = m;
    this.btnPt.style.background = m === 'deesse' ? '#0d4d92' : '#fff'; this.btnPt.style.color = m === 'deesse' ? '#fff' : '#333';
    this.btnPa.style.background = m === 'filtersim' ? '#0d4d92' : '#fff'; this.btnPa.style.color = m === 'filtersim' ? '#fff' : '#333';
    this._regen();
  }

  _parseSGEMS(txt) {
    const t = txt.split(/\s+/); let k = 0; while (k < t.length && t[k] === '') k++;
    const nx = +t[k], ny = +t[k + 1], nvar = +t[k + 3]; let p = k + 4 + nvar;
    const total = nx * ny, vals = new Float64Array(total);
    for (let i = 0; i < total; i++) { const x = +t[p + i]; vals[i] = isFinite(x) ? x : 0; }
    return { nx, ny, vals };
  }

  _finalize(nx, ny, valsRaw) {
    const side = Math.min(nx, ny), step = Math.max(1, Math.ceil(side / 256)), TIN = Math.floor(side / step);
    const tmp = new Float64Array(TIN * TIN);
    for (let j = 0; j < TIN; j++) for (let i = 0; i < TIN; i++) tmp[j * TIN + i] = valsRaw[(j * step) * nx + (i * step)];
    const uniq = [...new Set(tmp)]; this.TIN = TIN;
    if (uniq.length > 12) {                       // image CONTINUE (ex. pierres, méandres en niveaux)
      let mn = Infinity, mx = -Infinity; for (const v of tmp) { if (v < mn) mn = v; if (v > mx) mx = v; }
      const rg = (mx - mn) || 1, TI = new Float32Array(TIN * TIN);
      for (let i = 0; i < TI.length; i++) TI[i] = (tmp[i] - mn) / rg;     // normalisé [0,1]
      this.TI = TI; this.continuous = true; this.K = uniq.length; this.wv = null;
    } else {                                      // CATÉGORIEL (faciès)
      uniq.sort((a, b) => a - b); const map = new Map(uniq.map((v, k) => [v, k]));
      const TI = new Float32Array(TIN * TIN); for (let i = 0; i < TI.length; i++) TI[i] = map.get(tmp[i]);
      const K = uniq.length, freq = new Array(K).fill(0); for (let i = 0; i < TI.length; i++) freq[TI[i]]++; for (let k = 0; k < K; k++) freq[k] /= TI.length;
      const bg = Math.max(...freq), wv = freq.map(f => Math.min(4, Math.sqrt(bg / Math.max(0.02, f)) * 1.05));
      this.TI = TI; this.continuous = false; this.K = K; this.wv = wv;
    }
  }

  async _loadTI() {
    const entry = TIBANK[this.tiKind][1];
    if (entry.gen) { const n = 220; this._finalize(n, n, entry.gen(n, this.seed)); return ''; }
    if (this.cache[this.tiKind]) { const c = this.cache[this.tiKind]; this.TI = c.TI; this.TIN = c.TIN; this.K = c.K; this.wv = c.wv; this.continuous = c.continuous; return ''; }
    // On essaie plusieurs résolutions de chemin (relatif au module, racine, relatif à la page).
    const cands = [];
    try { cands.push(new URL('../ti/' + entry.url, import.meta.url).href); } catch (e) { }
    cands.push('/scripts/geostat-js/ti/' + entry.url);
    cands.push('scripts/geostat-js/ti/' + entry.url);
    for (const c of cands) {
      try {
        const r = await fetch(c); if (!r.ok) continue;
        const { nx, ny, vals } = this._parseSGEMS(await r.text()); this._finalize(nx, ny, vals);
        this.cache[this.tiKind] = { TI: this.TI, TIN: this.TIN, K: this.K, wv: this.wv, continuous: this.continuous };
        return '';
      } catch (e) { }
    }
    this._finalize(220, 220, gChenaux(220, this.seed));
    return ' ⚠ TI non chargée — recompilez (quarto render) après avoir mis les .SGEMS dans scripts/geostat-js/ti/';
  }

  async _regen() {
    if (this.busy) return; this.busy = true; this._stop();
    this.infoEl.textContent = 'Chargement de l\'image d\'entraînement…';
    const note = await this._loadTI();
    this.tiC.width = this.tiC.height = this.TIN;
    if (this.mode === 'deesse') this._deesse(); else this._filtersim();
    this.g = 0; this._note = note; this._draw(); this.busy = false;
  }

  // DeeSse rigoureux (Mariethoz et al., 2010) : chemin aléatoire multigrille ;
  // pour chaque nœud, on balaie une FRACTION de la TI et on accepte le PREMIER
  // emplacement dont la distance au voisinage (pondérée par la proximité) est
  // sous le seuil t, sinon le meilleur. Distance : fraction de désaccords
  // (catégoriel) ou somme normalisée des carrés (continu).
  _deesse() {
    const TI = this.TI, TIN = this.TIN, cont = this.continuous;
    const R = 6, N = 30, THRESH = cont ? 0.06 : 0.05;
    const tmpl = []; for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const d2 = dx * dx + dy * dy; if (d2 > 0 && d2 <= R * R) tmpl.push({ dx, dy, d2, w: 1 / Math.sqrt(d2) }); } tmpl.sort((a, b) => a.d2 - b.d2);
    let s = (this.seed * 2654435761) >>> 0; const rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    const sim = new Float32Array(SN * SN).fill(-1), groups = [], src = [], dst = [], levels = [4, 2, 1];
    for (const sp of levels) {
      const margin = R * sp + 1, span = TIN - 2 * margin; if (span < 4) continue;
      const maxScan = Math.min(1200, Math.max(250, Math.floor(0.45 * span * span)));
      const nodes = []; for (let j = 0; j < SN; j += sp) for (let i = 0; i < SN; i += sp) { const idx = j * SN + i; if (sim[idx] < 0) nodes.push(idx); }
      for (let k = nodes.length - 1; k > 0; k--) { const j = Math.floor(rng() * (k + 1)); const t = nodes[k]; nodes[k] = nodes[j]; nodes[j] = t; }
      for (const idx of nodes) {
        const ci = idx % SN, cj = (idx / SN) | 0, info = [];
        for (const o of tmpl) { if (info.length >= N) break; const ni = ci + o.dx * sp, nj = cj + o.dy * sp; if (ni < 0 || ni >= SN || nj < 0 || nj >= SN) continue; const sv = sim[nj * SN + ni]; if (sv >= 0) info.push({ dx: o.dx * sp, dy: o.dy * sp, v: sv, w: o.w }); }
        let tx, ty;
        if (info.length === 0) { tx = margin + Math.floor(rng() * span); ty = margin + Math.floor(rng() * span); }
        else {
          let wtot = 0; for (const nb of info) wtot += nb.w;
          let best = 1e9, bx = margin, by = margin;
          for (let sc = 0; sc < maxScan; sc++) {
            const cx = margin + Math.floor(rng() * span), cy = margin + Math.floor(rng() * span);
            let mis = 0;
            for (const nb of info) { const tv = TI[(cy + nb.dy) * TIN + (cx + nb.dx)], e = cont ? (tv - nb.v) * (tv - nb.v) : (tv !== nb.v ? 1 : 0); mis += nb.w * e; }
            const frac = cont ? Math.sqrt(mis / wtot) : mis / wtot;
            if (frac < best) { best = frac; bx = cx; by = cy; if (frac <= THRESH) break; }
          }
          tx = bx; ty = by;
        }
        sim[idx] = TI[ty * TIN + tx]; groups.push([idx]);
        src.push({ x: tx - R * sp, y: ty - R * sp, w: 2 * R * sp, h: 2 * R * sp }); dst.push({ x: ci - sp, y: cj - sp, w: 2 * sp, h: 2 * sp });
      }
    }
    this.fac = sim; this.groups = groups; this.src = src; this.dst = dst;
  }

  _filtersim() {
    const TI = this.TI, TIN = this.TIN, cont = this.continuous, PS = Math.min(26, (TIN / 4) | 0), OV = Math.max(4, (PS / 3) | 0), stride = PS - OV, NSCAN = 300;
    let s = (this.seed * 40503) >>> 0; const rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    const sim = new Float32Array(SN * SN).fill(-1), groups = [], src = [], dst = [];
    for (let py = 0; py < SN; py += stride) for (let px = 0; px < SN; px += stride) {
      const cand = []; let first = null;
      for (let sc = 0; sc < NSCAN; sc++) {
        const tx = Math.floor(rng() * (TIN - PS)), ty = Math.floor(rng() * (TIN - PS));
        let mis = 0, cnt = 0;
        for (let dy = 0; dy < PS; dy++) for (let dx = 0; dx < PS; dx++) { if (dx >= OV && dy >= OV) continue; const gi = px + dx, gj = py + dy; if (gi >= SN || gj >= SN) continue; const sv = sim[gj * SN + gi]; if (sv < 0) continue; cnt++; const tv = TI[(ty + dy) * TIN + (tx + dx)]; if (cont) { const d = tv - sv; mis += d * d; } else if (tv !== sv) mis++; }
        if (cnt === 0) { first = { tx, ty }; break; }
        cand.push({ tx, ty, e: mis / cnt });
      }
      let btx, bty;
      if (first) { btx = first.tx; bty = first.ty; }
      else { cand.sort((a, b) => a.e - b.e); const tol = cand[0].e * 1.15 + 1e-9, pool = cand.filter(c => c.e <= tol), p = pool[Math.floor(rng() * pool.length)]; btx = p.tx; bty = p.ty; }
      const grp = [];
      for (let dy = 0; dy < PS; dy++) for (let dx = 0; dx < PS; dx++) { const gi = px + dx, gj = py + dy; if (gi >= SN || gj >= SN) continue; const idx = gj * SN + gi; if (sim[idx] < 0) { sim[idx] = TI[(bty + dy) * TIN + (btx + dx)]; grp.push(idx); } }
      if (grp.length) { groups.push(grp); src.push({ x: btx, y: bty, w: PS, h: PS }); dst.push({ x: px, y: py, w: PS, h: PS }); }
    }
    this.fac = sim; this.groups = groups; this.src = src; this.dst = dst;
  }

  _blit(cv, data, n) {
    const ctx = cv.getContext('2d'), img = ctx.createImageData(n, n), cont = this.continuous;
    for (let p = 0; p < n * n; p++) {
      const v = data[p]; let c;
      if (v < 0) c = [255, 255, 255];
      else if (cont) { const g = Math.round(255 * (v < 0 ? 0 : v > 1 ? 1 : v)); c = [g, g, g]; }
      else { const k = Math.round(v); c = RGBP[k] || RGBP[k % RGBP.length]; }
      const o = p * 4; img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }

  _togglePlay() {
    if (this.timer || !this.groups) { this._stop(); return; }
    if (this.g >= this.groups.length) this.g = 0;
    this.playBtn.textContent = '⏸ Pause'; this.playBtn.style.background = '#c0392b';
    const tot = this.groups.length;
    this.timer = setInterval(() => {
      const rate = 0.02 * parseInt(this.spd.value, 10), base = this.mode === 'deesse' ? Math.max(1, Math.round(tot * 0.0008)) : 1;
      this.g = Math.min(tot, this.g + Math.max(base, Math.ceil(this.g * rate)));
      this._draw(); if (this.g >= tot) this._stop();
    }, 45);
  }
  _stop() { if (this.timer) { clearInterval(this.timer); this.timer = null; } if (this.playBtn) { const done = this.groups && this.g >= this.groups.length; this.playBtn.textContent = done ? '↻ Rejouer' : '▶ Lancer'; this.playBtn.style.background = '#1f8a4c'; } }

  _draw() {
    if (!this.fac) return;
    const disp = new Float32Array(SN * SN).fill(-1); let filled = 0;
    for (let gi = 0; gi < this.g && gi < this.groups.length; gi++) for (const idx of this.groups[gi]) { disp[idx] = this.fac[idx]; filled++; }
    this._blit(this.simC, disp, SN);
    this._blit(this.tiC, this.TI, this.TIN);
    if (this.g > 0 && this.g <= this.groups.length) {
      const gi = this.g - 1, s = this.src[gi], d = this.dst[gi];
      const tc = this.tiC.getContext('2d'); tc.strokeStyle = '#ff2020'; tc.lineWidth = 1.6; tc.strokeRect(s.x + 0.5, s.y + 0.5, s.w, s.h);
      const sc = this.simC.getContext('2d'); sc.strokeStyle = '#ff2020'; sc.lineWidth = 1.4; sc.strokeRect(d.x + 0.5, d.y + 0.5, d.w, d.h);
    }
    this.infoEl.innerHTML = `<b>${this.mode === 'deesse' ? 'DeeSse multigrille' : 'FilterSim (patchs)'}</b> · TI ${this.TIN}×${this.TIN}, ${this.continuous ? 'continue (niveaux de gris)' : this.K + ' faciès'} · ${Math.round(100 * filled / (SN * SN))} % rempli${this._note || ''}`;
  }

  cleanup() { this._stop(); }
}

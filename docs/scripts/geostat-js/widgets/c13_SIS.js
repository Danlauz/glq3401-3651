// scripts/geostat-js/widgets/c13_SIS.js
// -----------------------------------------------------------------------------
// Widget C13 — Animation SIS (Sequential Indicator Simulation).
//
// Chaque pixel est visité dans un ordre aléatoire ; on krige (krigeage SIMPLE,
// vers la proportion globale) les indicatrices des K faciès sur le VOISINAGE déjà
// simulé, on construit la distribution locale, puis on tire un faciès. Simulation
// précalculée en JS, puis affichée en ANIMATION.
//
// La covariance d'indicatrice est un MODÈLE IMBRIQUÉ (jusqu'à 3 structures :
// pépite, sphérique, exponentiel — avec anisotropie), au même format que le
// calculateur de variogramme du chapitre 7. Le modèle GAUSSIEN est exclu : sa
// régularité à l'origine n'est pas reproductible par la SIS. La PÉPITE empêche le
// figement des probabilités (sans elle, le krigeage colle les faciès).
// -----------------------------------------------------------------------------
import { Widget } from '../widget-base.js';
import { afficherChargementJusquaPret } from '../pyodide_setup.js';
const COLORS = ['#3b6fb6', '#e0a030', '#4aa564'];
const NOMS = ['Faciès 1', 'Faciès 2', 'Faciès 3'];
const TYPES = [['spherique', 'Sphérique'], ['exponentiel', 'Exponentiel'], ['pepite', 'Pépite']];

function solve(A, b) {
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    const piv = M[c][c] || 1e-9;
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / piv; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  return M.map((r, i) => r[n] / (r[i] || 1e-9));
}
function distAniso(hx, hy, ag, ap, azimut) {
  const th = -(90 - azimut) * Math.PI / 180, ct = Math.cos(th), st = Math.sin(th);
  const hrx = ct * hx - st * hy, hry = st * hx + ct * hy;
  return Math.sqrt((hrx / Math.max(ag, 1e-9)) ** 2 + (hry / Math.max(ap, 1e-9)) ** 2);
}
function covStruct(type, d, sill) {
  if (type === 'pepite') return d === 0 ? sill : 0;
  if (type === 'exponentiel') return sill * Math.exp(-3 * d);
  return d < 1 ? sill * (1 - 1.5 * d + 0.5 * d ** 3) : 0;   // sphérique
}
function carte(i, on, t, sill, ap, ag, az) {
  return `<div class="cc-card" data-i="${i}">
    <label style="font-weight:700;font-size:.76rem;"><input type="checkbox" class="cc-on" ${on ? 'checked' : ''}> Structure ${i}</label>
    <div class="cc-grid">
      <label>Type <select class="cc-type">${TYPES.map(([v, n]) => `<option value="${v}"${v === t ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
      <label>Palier c <input type="number" class="cc-sill" value="${sill}" step="0.1" style="width:54px"></label>
      <label><span>Portée min a<sub>p</sub></span> <input type="number" class="cc-ap" value="${ap}" step="1" style="width:54px"></label>
      <label><span>Portée maj a<sub>g</sub></span> <input type="number" class="cc-ag" value="${ag}" step="1" style="width:54px"></label>
      <label>Azimut ° <input type="number" class="cc-az" value="${az}" step="5" style="width:54px"></label>
    </div></div>`;
}

export default class C13SIS extends Widget {
  render() {
    const id = this.el.id;
    this.seed = 23; this.timer = null; this.k = 0; this.N = 80; this.nk = 12;
    this.el.insertAdjacentHTML('beforeend', `
      <style>#${id} .gw-controls label{display:inline-flex !important;flex-direction:row !important;align-items:center;gap:5px;}
        #${id} .cc-cards{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;}
        #${id} .cc-card{flex:1;min-width:185px;border:1px solid #dfe3e8;border-radius:9px;padding:6px 9px;background:#fff;font-size:.78rem;}
        #${id} .cc-grid{display:flex;flex-direction:column;gap:3px;margin-top:4px;}
        #${id} .cc-grid label{display:flex;align-items:center;justify-content:space-between;gap:6px;}
        #${id} .cc-card.off{opacity:.42;}
        #${id} .cc-card select,#${id} .cc-card input[type=number]{padding:1px 4px;border:1px solid #c7ccd1;border-radius:5px;}</style>
      <div class="gw-controls" style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;">
        <label>p₁ <input type="range" class="js-p1" min="0.1" max="0.7" value="0.4" step="0.05" style="width:80px"><span class="js-p1v">0.40</span></label>
        <label>p₂ <input type="range" class="js-p2" min="0.1" max="0.6" value="0.35" step="0.05" style="width:80px"><span class="js-p2v">0.35</span></label>
        <button class="js-play" type="button" style="font-size:.82rem;padding:5px 14px;background:#1f8a4c;color:#fff;border:none;border-radius:5px;cursor:pointer;font-weight:600;">▶ Lancer</button>
        <label>Vitesse <input type="range" class="js-spd" min="1" max="5" value="3" step="1" style="width:78px"></label>
        <button class="js-regen" type="button" style="font-size:.76rem;padding:4px 10px;background:#3a3632;color:#fff;border:none;border-radius:5px;cursor:pointer;">Nouveau tirage</button>
      </div>
      <div style="padding:6px 12px;background:#f4f6f8;border:1px solid #ddd;border-radius:8px;margin-top:4px;">
        <b style="font-size:.78rem;">Covariance d'indicatrice (modèle imbriqué) :</b> <span style="font-size:10px;color:#888;">modèle gaussien exclu · gardez une pépite pour éviter le figement</span>
        <div class="cc-cards js-model">
          ${carte(1, true, 'pepite', 0.3, 1, 1, 0)}
          ${carte(2, true, 'spherique', 0.7, 10, 10, 0)}
          ${carte(3, false, 'exponentiel', 0.4, 6, 14, 30)}
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1.1fr 0.9fr;gap:10px;margin-top:6px;align-items:center;">
        <div style="text-align:center;"><canvas class="js-field" width="320" height="320" style="width:100%;max-width:340px;border:1px solid #ccc;image-rendering:pixelated;"></canvas></div>
        <div class="js-bars" style="height:300px"></div>
      </div>
      <div class="js-info" style="padding:.4rem 1rem;font-family:'JetBrains Mono',monospace;font-size:.8rem;color:#444;text-align:center;background:#f0f0f0;border-radius:6px;margin-top:6px;">—</div>
      <p style="margin:4px 1rem;font-size:11px;color:#666;">
        <b>Lancez l'animation</b> : chaque pixel est tiré de la loi locale (krigeage d'indicatrices sur les voisins déjà simulés). Construisez la covariance d'indicatrice (imbriquée, anisotrope). À droite, les <b>proportions</b> réalisées convergent vers les <b>cibles</b>.</p>
    `);
    this.canvas = this.el.querySelector('.js-field'); this.fctx = this.canvas.getContext('2d');
    this.barsEl = this.el.querySelector('.js-bars'); this.infoEl = this.el.querySelector('.js-info');
    this.playBtn = this.el.querySelector('.js-play');
    this.ctrl = { p1: this.el.querySelector('.js-p1'), p2: this.el.querySelector('.js-p2'), spd: this.el.querySelector('.js-spd') };
    for (const k of ['p1', 'p2']) this.on(this.ctrl[k], 'input', e => { this.el.querySelector(`.js-${k}v`).textContent = parseFloat(e.target.value).toFixed(2); this._regen(); });
    const model = this.el.querySelector('.js-model');
    this.on(model, 'input', () => this._regen()); this.on(model, 'change', () => this._regen());
    this.on(this.playBtn, 'click', () => this._togglePlay());
    this.on(this.el.querySelector('.js-regen'), 'click', () => { this.seed++; this._regen(); });
    afficherChargementJusquaPret(this.el).then(() => this._regen());
  }

  _props() { let p1 = parseFloat(this.ctrl.p1.value), p2 = parseFloat(this.ctrl.p2.value), p3 = 1 - p1 - p2; if (p3 < 0.05) { p3 = 0.05; p2 = 1 - p1 - p3; } return [p1, p2, p3]; }

  _readModel() {
    const out = [];
    for (const card of this.el.querySelectorAll('.cc-card')) {
      if (!card.querySelector('.cc-on').checked) { card.classList.add('off'); continue; }
      card.classList.remove('off');
      out.push({ type: card.querySelector('.cc-type').value, sill: +card.querySelector('.cc-sill').value || 0, ap: Math.max(1, +card.querySelector('.cc-ap').value || 1), ag: Math.max(1, +card.querySelector('.cc-ag').value || 1), az: +card.querySelector('.cc-az').value || 0 });
    }
    return out.length ? out : [{ type: 'pepite', sill: 1, ap: 1, ag: 1, az: 0 }];
  }

  _cov(dx, dy) { let c = 0; for (const s of this.structs) c += covStruct(s.type, distAniso(dx, dy, s.ag, s.ap, s.az), s.sill); return c; }

  _regen() { this._stop(); this.props = this._props(); this.structs = this._readModel(); this._precompute(); this.k = 0; this._draw(); }

  _precompute() {
    const N = this.N, props = this.props, nk = this.nk, K = props.length, tot = N * N;
    let s = (this.seed * 2654435761) >>> 0; const rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    const sampleCat = (p) => { const u = rng(); let acc = 0; for (let k = 0; k < p.length; k++) { acc += p[k]; if (u <= acc) return k; } return p.length - 1; };
    const path = new Int32Array(tot); for (let i = 0; i < tot; i++) path[i] = i;
    for (let i = tot - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = path[i]; path[i] = path[j]; path[j] = t; }
    const fac = new Int8Array(tot); const simList = []; this.order = new Int32Array(tot);
    for (let step = 0; step < tot; step++) {
      const idx = path[step], ci = idx % N, cj = (idx / N) | 0; this.order[step] = idx;
      if (simList.length === 0) { fac[idx] = sampleCat(props) + 1; simList.push({ i: ci, j: cj, idx }); continue; }
      const m = Math.min(nk, simList.length), best = [];
      for (const p of simList) { const d2 = (p.i - ci) ** 2 + (p.j - cj) ** 2; if (best.length < m) { best.push({ d2, p }); if (best.length === m) best.sort((x, y) => y.d2 - x.d2); } else if (d2 < best[0].d2) { best[0] = { d2, p }; best.sort((x, y) => y.d2 - x.d2); } }
      const nb = best.map(b => b.p);
      const A = []; for (let r = 0; r < m; r++) { A.push([]); for (let c = 0; c < m; c++) A[r].push(this._cov(nb[r].i - nb[c].i, nb[r].j - nb[c].j)); }
      const bb = []; for (let r = 0; r < m; r++) bb.push(this._cov(nb[r].i - ci, nb[r].j - cj));
      const w = solve(A, bb);
      const prob = new Array(K);
      for (let k = 0; k < K; k++) { let e = props[k]; for (let r = 0; r < m; r++) e += w[r] * ((fac[nb[r].idx] - 1 === k ? 1 : 0) - props[k]); prob[k] = Math.max(0, Math.min(1, e)); }
      let ssum = 0; for (let k = 0; k < K; k++) ssum += prob[k];
      if (ssum < 1e-9) { for (let k = 0; k < K; k++) prob[k] = props[k]; ssum = 1; }
      for (let k = 0; k < K; k++) prob[k] /= ssum;
      fac[idx] = sampleCat(prob) + 1; simList.push({ i: ci, j: cj, idx });
    }
    this.fac = fac;
  }

  _togglePlay() {
    if (this.timer) { this._stop(); return; }
    if (this.k >= this.N * this.N) this.k = 0;
    this.playBtn.textContent = '⏸ Pause'; this.playBtn.style.background = '#c0392b';
    const tot = this.N * this.N, base = Math.max(1, Math.round(tot * 0.0008));
    this.timer = setInterval(() => { const rate = 0.02 * parseInt(this.ctrl.spd.value, 10); this.k = Math.min(tot, this.k + Math.max(base, Math.ceil(this.k * rate))); this._draw(); if (this.k >= tot) this._stop(); }, 40);
  }

  _stop() { if (this.timer) { clearInterval(this.timer); this.timer = null; } if (this.playBtn) { const done = this.k >= this.N * this.N; this.playBtn.textContent = done ? '↻ Rejouer' : '▶ Lancer'; this.playBtn.style.background = '#1f8a4c'; } }

  _draw() {
    if (!this.fac) return;
    const N = this.N, tot = N * N, kmax = Math.min(this.k, tot), cell = this.canvas.width / N, ctx = this.fctx;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const counts = [0, 0, 0];
    for (let step = 0; step < kmax; step++) { const idx = this.order[step], i = idx % N, j = (idx / N) | 0, f = this.fac[idx]; counts[f - 1]++; ctx.fillStyle = COLORS[f - 1]; ctx.fillRect(i * cell, j * cell, cell + 0.7, cell + 0.7); }
    if (window.Plotly) {
      const real = counts.map(c => kmax > 0 ? c / kmax : 0);
      Plotly.react(this.barsEl, [{ type: 'bar', x: NOMS, y: real, marker: { color: COLORS }, width: 0.55, hoverinfo: 'skip', showlegend: false }], {
        margin: { t: 26, l: 40, r: 10, b: 30 }, title: { text: 'Proportions réalisées vs cibles', font: { size: 11.5 } },
        yaxis: { range: [0, 0.8], title: { text: 'proportion', standoff: 4 } },
        shapes: this.props.map((p, k) => ({ type: 'line', x0: k - 0.4, x1: k + 0.4, y0: p, y1: p, line: { color: '#222', width: 2, dash: 'dash' } })),
      }, { displaylogo: false, responsive: true, displayModeBar: false });
    }
    const real = counts.map(c => kmax > 0 ? (100 * c / kmax).toFixed(1) : '0.0');
    this.infoEl.innerHTML = `${kmax.toLocaleString()} / ${tot.toLocaleString()} pixels · proportions : ` + COLORS.map((c, k) => `<span style="color:${c}">${real[k]} %</span>`).join(' · ') + ` (cibles ${this.props.map(p => (100 * p).toFixed(0) + ' %').join(' · ')})`;
  }

  cleanup() { this._stop(); if (window.Plotly && this.barsEl) Plotly.purge(this.barsEl); }
}

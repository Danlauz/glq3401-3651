// scripts/geostat-js/widgets/c12_SGS_pasapas.js
// -----------------------------------------------------------------------------
// Widget C12.2 — Animation SGS (simulation séquentielle gaussienne).
//
// La grille (champ FFT-MA, 200×200) se remplit pixel par pixel le long d'un
// chemin aléatoire (palette Turbo). À chaque pixel courant, on affiche sa LOI
// CONDITIONNELLE obtenue par krigeage simple sur les pixels déjà simulés
// (gaussienne N(Z*_KS, σ²_KS)) et la VALEUR tirée. En arrière-plan, l'histogramme
// (bleu pâle) des valeurs déjà simulées reconstruit la loi marginale.
//
// Animation accélérée : lente au début (peu de pixels à la fois), rapide à la fin.
// Le krigeage conditionnel utilise un VOISINAGE (k plus proches déjà simulés).
// -----------------------------------------------------------------------------
import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';
const TURBO = [
  [0.0, 'rgb(48,18,59)'], [0.1, 'rgb(65,69,217)'], [0.2, 'rgb(35,138,244)'], [0.3, 'rgb(30,192,211)'],
  [0.4, 'rgb(53,226,149)'], [0.5, 'rgb(131,246,88)'], [0.6, 'rgb(199,233,47)'], [0.7, 'rgb(248,186,56)'],
  [0.8, 'rgb(251,122,33)'], [0.9, 'rgb(221,61,8)'], [1.0, 'rgb(122,4,3)'],
];
const KVOIS = 12;          // taille du voisinage de krigeage

function gammaModele(mod, h, a) {
  const t = h / a;
  if (mod === 'spherique') return h >= a ? 1 : 1.5 * t - 0.5 * t * t * t;
  if (mod === 'exponentiel') return 1 - Math.exp(-3 * t);
  return 1 - Math.exp(-3 * t * t);
}
// Résolution d'un petit système linéaire (élimination de Gauss).
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

export default class C12SGSpasapas extends Widget {
  render() {
    this.el.insertAdjacentHTML('beforeend', `
      <div class="gw-controls" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;">
        <label>Modèle <select class="js-mod">
          <option value="spherique">Sphérique</option><option value="exponentiel">Exponentiel</option><option value="gaussien">Gaussien</option>
        </select></label>
        <label>Portée a <input type="range" class="js-a" min="10" max="80" value="35" step="1" style="width:110px"><span class="js-av">35</span></label>
        <button class="js-play" type="button" style="font-size:.82rem;padding:5px 14px;background:#1f8a4c;color:#fff;border:none;border-radius:5px;cursor:pointer;font-weight:600;">▶ Lancer</button>
        <label>Vitesse <input type="range" class="js-spd" min="1" max="5" value="3" step="1" style="width:90px"></label>
        <label>Progrès <input type="range" class="js-prog" min="0" max="100" value="0" step="1" style="width:160px"><span class="js-progv">0</span> %</label>
        <button class="js-regen" type="button" style="font-size:.76rem;padding:4px 10px;background:#3a3632;color:#fff;border:none;border-radius:5px;cursor:pointer;">Nouveau tirage</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px;align-items:stretch;">
        <div class="js-plot" style="height:360px"></div>
        <div class="js-plot-hist" style="height:360px"></div>
      </div>
      <div class="js-info" style="padding:.4rem 1rem;font-family:'JetBrains Mono',monospace;font-size:.8rem;color:#444;text-align:center;background:#f0f0f0;border-radius:6px;margin-top:4px;">—</div>
      <p style="margin:4px 1rem;font-size:11px;color:#666;">
        <b>Lancez l'animation</b> : les pixels (gris = non simulés) se remplissent le long d'un chemin aléatoire. À droite, la <b style="color:#0d4d92">loi conditionnelle</b> du pixel courant (krigeage simple sur le voisinage déjà simulé) et la <b style="color:#d62728">valeur tirée</b> ; en <b style="color:#9db8d8">bleu pâle</b>, l'histogramme des valeurs déjà simulées.</p>
    `);
    this.plot = this.el.querySelector('.js-plot');
    this.plotH = this.el.querySelector('.js-plot-hist');
    this.infoEl = this.el.querySelector('.js-info');
    this.playBtn = this.el.querySelector('.js-play');
    this.ctrl = { mod: this.el.querySelector('.js-mod'), a: this.el.querySelector('.js-a'), prog: this.el.querySelector('.js-prog'), spd: this.el.querySelector('.js-spd') };
    this.seed = 17; this.field = null; this.timer = null; this.k = 0; this.N = 200;
    this.on(this.ctrl.mod, 'change', () => this.regenererSim());
    this.on(this.ctrl.a, 'input', e => { this.el.querySelector('.js-av').textContent = e.target.value; });
    this.on(this.ctrl.a, 'change', () => this.regenererSim());
    this.on(this.ctrl.prog, 'input', e => { this._stop(); this.k = Math.round(parseFloat(e.target.value) / 100 * this.N * this.N); this.redessiner(); });
    this.on(this.playBtn, 'click', () => this._togglePlay());
    this.on(this.el.querySelector('.js-regen'), 'click', () => { this.seed++; this.regenererSim(); });
    afficherChargementJusquaPret(this.el).then(() => this.regenererSim());
  }

  async regenererSim() {
    this._stop();
    const mod = this.ctrl.mod.value, a = parseFloat(this.ctrl.a.value), N = this.N;
    this.mod = mod; this.a = a;
    try { this.field = await gpoly.simulerFFTMA(mod, a, 1.0, this.seed, N); }
    catch (e) { this.afficherAvertissement('Erreur simulation : ' + e.message); return; }
    let mn = Infinity, mx = -Infinity; for (let i = 0; i < this.field.length; i++) { const v = this.field[i]; if (v < mn) mn = v; if (v > mx) mx = v; }
    this.zmin = mn; this.zmax = mx;
    // Chemin séquentiel aléatoire reproductible.
    let s = (this.seed * 1664525 + 1013904223) >>> 0;
    const rng = () => { s = (s * 1664525 + 1013904223) | 0; return ((s >>> 0) / 4294967296); };
    const idx = new Int32Array(N * N); for (let i = 0; i < N * N; i++) idx[i] = i;
    for (let i = N * N - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
    this.chemin = idx; this.k = 0; this._leftInit = false;
    this.redessiner();
  }

  _C(h) { return 1 - gammaModele(this.mod, h, this.a); }

  // Loi conditionnelle de krigeage simple au pixel x0, à partir des pixels déjà
  // simulés (voisinage des KVOIS plus proches). chemin[0..kPrev-1] = déjà simulés.
  _condDist(x0i, x0j, kPrev) {
    if (kPrev <= 0) return { mu: 0, sigma: 1 };
    const N = this.N, K = Math.min(KVOIS, kPrev);
    // Sélection des K plus proches (un seul passage).
    const best = [];   // {d2,i,j,z}
    for (let t = 0; t < kPrev; t++) {
      const c = this.chemin[t], ci = c % N, cj = (c / N) | 0;
      const d2 = (ci - x0i) * (ci - x0i) + (cj - x0j) * (cj - x0j);
      if (best.length < K) { best.push({ d2, i: ci, j: cj, z: this.field[c] }); if (best.length === K) best.sort((p, q) => q.d2 - p.d2); }
      else if (d2 < best[0].d2) { best[0] = { d2, i: ci, j: cj, z: this.field[c] }; best.sort((p, q) => q.d2 - p.d2); }
    }
    const nb = best;
    const A = [], b = [];
    for (let r = 0; r < nb.length; r++) {
      A.push([]); for (let c = 0; c < nb.length; c++) A[r].push(this._C(Math.hypot(nb[r].i - nb[c].i, nb[r].j - nb[c].j)) + (r === c ? 1e-6 : 0));
      b.push(this._C(Math.hypot(nb[r].i - x0i, nb[r].j - x0j)));
    }
    const w = solve(A, b);
    let mu = 0, varr = 1; for (let r = 0; r < nb.length; r++) { mu += w[r] * nb[r].z; varr -= w[r] * b[r]; }
    return { mu, sigma: Math.sqrt(Math.max(1e-4, varr)) };
  }

  _togglePlay() {
    if (this.timer) { this._stop(); return; }
    if (this.k >= this.N * this.N) this.k = 0;
    this.playBtn.textContent = '⏸ Pause'; this.playBtn.style.background = '#c0392b';
    const tot = this.N * this.N, base = Math.max(1, Math.round(tot * 0.0004));
    const tick = () => {
      const rate = 0.02 * parseInt(this.ctrl.spd.value, 10);   // lent au début, rapide à la fin
      this.k = Math.min(tot, this.k + Math.max(base, Math.ceil(this.k * rate)));
      this.redessiner();
      if (this.k >= tot) this._stop();
    };
    this.timer = setInterval(tick, 40);
  }

  _stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (this.playBtn) { const done = this.k >= this.N * this.N; this.playBtn.textContent = done ? '↻ Rejouer' : '▶ Lancer'; this.playBtn.style.background = '#1f8a4c'; }
  }

  redessiner() {
    if (!this.field || !window.Plotly) return;
    const N = this.N, tot = N * N, kmax = Math.min(this.k, tot);
    // Grille révélée + valeurs simulées.
    const grid = []; for (let j = 0; j < N; j++) grid.push(new Array(N).fill(null));
    const filled = new Float64Array(kmax);
    for (let t = 0; t < kmax; t++) { const c = this.chemin[t]; grid[(c / N) | 0][c % N] = this.field[c]; filled[t] = this.field[c]; }
    this.ctrl.prog.value = Math.round(kmax / tot * 100); this.el.querySelector('.js-progv').textContent = this.ctrl.prog.value;

    // ---- Grille (Turbo). newPlot une fois, puis restyle (fluide à 200×200). ----
    const titre = `${kmax.toLocaleString()} / ${tot.toLocaleString()} pixels (${(kmax / tot * 100).toFixed(0)} %)`;
    if (!this._leftInit) {
      Plotly.newPlot(this.plot, [{ type: 'heatmap', z: grid, colorscale: TURBO, zmin: this.zmin, zmax: this.zmax, zsmooth: false, colorbar: { thickness: 9, len: 0.92 } }], {
        margin: { t: 26, l: 6, r: 46, b: 6 }, dragmode: false,
        xaxis: { showticklabels: false, showgrid: false, zeroline: false, scaleanchor: 'y', constrain: 'domain', range: [0, N] },
        yaxis: { showticklabels: false, showgrid: false, zeroline: false, autorange: 'reversed', constrain: 'domain' },
        title: { text: titre, font: { size: 11.5 }, y: 0.99 }, plot_bgcolor: '#ffffff', paper_bgcolor: '#ffffff',
      }, { displaylogo: false, responsive: true, displayModeBar: false });
      this._leftInit = true;
    } else {
      Plotly.restyle(this.plot, { z: [grid] }, [0]);
      Plotly.relayout(this.plot, { 'title.text': titre });
    }

    // ---- Loi conditionnelle du pixel courant + valeur tirée + histogramme de fond ----
    const nb = 22, w = (this.zmax - this.zmin) / nb, comptes = new Array(nb).fill(0);
    for (let t = 0; t < kmax; t++) { let bb = Math.floor((filled[t] - this.zmin) / w); if (bb < 0) bb = 0; if (bb >= nb) bb = nb - 1; comptes[bb]++; }
    const aire = Math.max(1, kmax) * w;                       // pour normaliser l'histo en densité
    const centres = Array.from({ length: nb }, (_, i) => this.zmin + (i + 0.5) * w);
    const dens = comptes.map(c => c / aire);

    const traces = [
      { type: 'bar', x: centres, y: dens, marker: { color: 'rgba(157,184,216,0.55)' }, width: w * 0.96, name: 'valeurs simulées', hoverinfo: 'skip' },
    ];
    let sub = 'aucun pixel simulé';
    if (kmax >= 1) {
      const cur = this.chemin[kmax - 1], ci = cur % N, cj = (cur / N) | 0;
      const { mu, sigma } = this._condDist(ci, cj, kmax - 1);
      const val = this.field[cur];
      const xs = Array.from({ length: 80 }, (_, i) => this.zmin + (this.zmax - this.zmin) * i / 79);
      const gauss = xs.map(x => Math.exp(-0.5 * ((x - mu) / sigma) ** 2) / (sigma * Math.sqrt(2 * Math.PI)));
      const ymax = 1 / (sigma * Math.sqrt(2 * Math.PI));
      traces.push({ type: 'scatter', x: xs, y: gauss, mode: 'lines', line: { color: '#0d4d92', width: 2.4 }, name: 'loi conditionnelle (KS)', hoverinfo: 'skip' });
      traces.push({ type: 'scatter', x: [val, val], y: [0, ymax * 1.05], mode: 'lines', line: { color: '#d62728', width: 2.4 }, name: 'valeur tirée', hoverinfo: 'skip' });
      sub = `pixel courant : Z*<sub>KS</sub> = ${mu.toFixed(2)}, σ<sub>KS</sub> = ${sigma.toFixed(2)} → valeur tirée = ${val.toFixed(2)}`;
    }
    Plotly.react(this.plotH, traces, {
      margin: { t: 26, l: 46, r: 12, b: 40 }, barmode: 'overlay',
      xaxis: { title: { text: 'Z', standoff: 4 }, range: [this.zmin, this.zmax] }, yaxis: { title: { text: 'densité', standoff: 4 }, rangemode: 'tozero' },
      title: { text: 'Loi conditionnelle (krigeage simple) du pixel courant', font: { size: 11 } },
      legend: { orientation: 'h', y: -0.16, x: 0.5, xanchor: 'center', font: { size: 9 } },
    }, { displaylogo: false, responsive: true, displayModeBar: false });

    this.infoEl.innerHTML = `Chemin SGS : <b>${kmax.toLocaleString()}</b> / ${tot.toLocaleString()} pixels · ${sub}`;
  }

  cleanup() { this._stop(); if (window.Plotly) { if (this.plot) Plotly.purge(this.plot); if (this.plotH) Plotly.purge(this.plotH); } }
}

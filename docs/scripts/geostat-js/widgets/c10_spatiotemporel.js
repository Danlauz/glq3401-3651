// scripts/geostat-js/widgets/c10_spatiotemporel.js
// -----------------------------------------------------------------------------
// Widget C10 — Krigeage spatio-temporel animé (champ de précipitations).
//
// Un système pluvieux traverse la carte au fil du temps. Il n'est mesuré qu'à
// quelques STATIONS fixes, à chaque pas de temps. À chaque instant, on
// reconstruit le champ de pluie partout par KRIGEAGE SPATIO-TEMPOREL : le temps
// est traité comme un 3ᵉ axe, avec sa propre portée (anisotropie géométrique
// espace-temps). On lit le résultat en ANIMATION (bouton Play) : la cellule de
// pluie apparaît, se déplace et s'atténue, reconstruite à partir des stations.
//
// Les champs krigés sont calculés une fois (gpoly.krigeageOrdinaire en 3D, coord
// (x, y, t), portée [a_s, a_s, a_t]) puis mis en cache pour une lecture fluide.
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

const debounce = (fn, ms = 350) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const N = 30;        // résolution spatiale de la grille
const T = 20;        // nombre de pas de temps
const NSTA = 11;     // nombre de stations
// Palette pluie : blanc -> bleu.
const PLUIE = [[0, 'rgb(247,251,255)'], [0.2, 'rgb(198,219,239)'], [0.4, 'rgb(107,174,214)'], [0.6, 'rgb(49,130,189)'], [0.8, 'rgb(8,81,156)'], [1, 'rgb(8,48,107)']];

function genererScenario(seed) {
  let s = seed >>> 0;
  const rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const stations = [];
  for (let i = 0; i < NSTA; i++) stations.push([8 + 84 * rng(), 8 + 84 * rng()]);
  // Cellule de pluie qui traverse la carte (gauche -> droite), s'intensifie puis s'atténue.
  const ph = rng() * 6.28;
  const champ = (x, y, t) => {
    const u = t / (T - 1);
    const cx = 12 + 76 * u, cy = 50 + 22 * Math.sin(2 * Math.PI * u + ph);
    const A = 9 * (0.35 + 0.65 * Math.sin(Math.PI * u));   // intensité ~ cloche
    return A * Math.exp(-(((x - cx) ** 2) + ((y - cy) ** 2)) / (2 * 24 * 24));
  };
  return { stations, champ, rng };
}

export default class C10SpatioTemporel extends Widget {
  render() {
    this.seed = 11;
    this.frame = 0;
    this.playing = false;
    this.frames = null;
    this.el.insertAdjacentHTML('beforeend', `
      <style>
        #${this.el.id} .st-grp{display:flex;flex-wrap:wrap;gap:14px;align-items:center;padding:7px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;margin-bottom:6px;}
        #${this.el.id} .st-grp label{display:inline-flex;align-items:center;gap:5px;}
        #${this.el.id} .st-btn{font-size:.8rem;padding:4px 14px;color:#fff;border:none;border-radius:5px;cursor:pointer;}
      </style>
      <div class="st-grp">
        <label>Portée spatiale <i>a<sub>s</sub></i> <input type="range" class="js-as" min="15" max="60" value="32" step="1" style="width:130px"><span class="js-asv">32</span></label>
        <label>Portée temporelle <i>a<sub>t</sub></i> <input type="range" class="js-at" min="1" max="8" value="3" step="0.5" style="width:120px"><span class="js-atv">3</span></label>
        <button class="js-regen st-btn" type="button" style="background:#3a3632;">Nouveau scénario</button>
      </div>
      <div class="st-grp">
        <button class="js-play st-btn" type="button" style="background:#0d4d92;">▶ Lecture</button>
        <label>Vitesse <input type="range" class="js-spd" min="1" max="10" value="5" step="1" style="width:90px"></label>
        <label>Temps t <input type="range" class="js-t" min="0" max="${T - 1}" value="0" step="1" style="width:200px"><span class="js-tv">0</span> / ${T - 1}</label>
      </div>
      <div class="js-plot" style="height:400px;"></div>
      <div class="js-info" style="padding:.4rem 1rem;font-size:.82rem;color:#333;text-align:center;background:#eef2f7;border:1px solid #c4d2e0;border-radius:6px;margin-top:4px;">—</div>
      <p style="margin:4px 1rem;font-size:11px;color:#666;">
        Le temps est traité comme un 3ᵉ axe : la portée temporelle <i>a<sub>t</sub></i> contrôle « combien de temps » une averse influence l'estimation. Augmentez <i>a<sub>t</sub></i> pour un champ plus lisse dans le temps ; diminuez-la pour qu'il colle aux mesures de chaque instant.</p>
    `);
    this.plot = this.el.querySelector('.js-plot');
    this.infoEl = this.el.querySelector('.js-info');
    this.asEl = this.el.querySelector('.js-as');
    this.atEl = this.el.querySelector('.js-at');
    this.tEl = this.el.querySelector('.js-t');
    this.spdEl = this.el.querySelector('.js-spd');

    const recompute = debounce(() => this.computeAndDraw(), 350);
    this.on(this.asEl, 'input', e => { this.el.querySelector('.js-asv').textContent = e.target.value; recompute(); });
    this.on(this.atEl, 'input', e => { this.el.querySelector('.js-atv').textContent = e.target.value; recompute(); });
    this.on(this.tEl, 'input', e => { this.pause(); this.frame = parseInt(e.target.value, 10); this.draw(); });
    this.on(this.el.querySelector('.js-regen'), 'click', () => { this.seed = Math.floor(Math.random() * 1e6); this.computeAndDraw(); });
    this.on(this.el.querySelector('.js-play'), 'click', () => this.togglePlay());

    afficherChargementJusquaPret(this.el).then(() => this.computeAndDraw());
  }

  _scenario() {
    const sc = genererScenario(this.seed);
    // Données ST : chaque station mesurée à chaque pas de temps (+ bruit léger).
    const xd = [], zd = [], staVals = Array.from({ length: T }, () => []);
    for (let t = 0; t < T; t++) {
      for (const [sx, sy] of sc.stations) {
        const v = Math.max(0, sc.champ(sx, sy, t) + 0.25 * (sc.rng() - 0.5) * 2);
        xd.push([sx, sy, t]); zd.push(v);
        staVals[t].push(v);
      }
    }
    this.stations = sc.stations;
    this.staVals = staVals;
    return { xd, zd };
  }

  async computeAndDraw() {
    this.pause();
    const a_s = parseFloat(this.asEl.value), a_t = parseFloat(this.atEl.value);
    const { xd, zd } = this._scenario();
    const structs = [{ modele: 'spherique', palier: 1, portee: [a_s, a_s, a_t] }];

    const xs = Array.from({ length: N }, (_, i) => (i + 0.5) * 100 / N);
    if (window.Plotly) Plotly.react(this.plot, [], { margin: { t: 30, l: 30, r: 20, b: 30 }, annotations: [{ x: 0.5, y: 0.5, xref: 'paper', yref: 'paper', text: 'Krigeage spatio-temporel en cours…', showarrow: false, font: { color: '#888' } }] }, { displaylogo: false, responsive: true, displayModeBar: false });

    const frames = [];
    try {
      for (let t = 0; t < T; t++) {
        const cibles = [];
        for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) cibles.push([xs[i], xs[j], t]);
        const r = await gpoly.krigeageGrilleGlobale(xd, zd, cibles, structs, 0.05);
        const Z = []; for (let j = 0; j < N; j++) { const row = []; for (let i = 0; i < N; i++) row.push(Math.max(0, r.estimations[j * N + i])); Z.push(row); }
        frames.push(Z);
      }
    } catch (e) { this.afficherAvertissement('Erreur krigeage ST : ' + e.message); return; }

    this.frames = frames; this.xs = xs;
    this.zmax = Math.max(1, ...frames.flat(2));
    if (this.frame >= T) this.frame = 0;
    this.draw();
  }

  draw() {
    if (!this.frames || !window.Plotly) return;
    const t = this.frame;
    Plotly.react(this.plot, [
      { type: 'heatmap', z: this.frames[t], x: this.xs, y: this.xs, colorscale: PLUIE, zmin: 0, zmax: this.zmax, colorbar: { title: 'mm', thickness: 12, len: 0.85 } },
      { x: this.stations.map(s => s[0]), y: this.stations.map(s => s[1]), mode: 'markers', name: 'stations',
        marker: { color: this.staVals[t], colorscale: PLUIE, cmin: 0, cmax: this.zmax, size: 13, line: { color: '#000', width: 1.5 }, symbol: 'circle' }, hoverinfo: 'skip', showlegend: false },
    ], {
      margin: { t: 32, l: 30, r: 20, b: 30 },
      title: { text: `Champ de précipitations krigé — t = ${t} / ${T - 1}`, font: { size: 12 }, y: 0.98 },
      xaxis: { range: [0, 100], showticklabels: false, scaleanchor: 'y', constrain: 'domain' },
      yaxis: { range: [0, 100], showticklabels: false },
    }, { displaylogo: false, responsive: true, displayModeBar: false });
    this.tEl.value = t; this.el.querySelector('.js-tv').textContent = t;
    const moy = this.staVals[t].reduce((a, b) => a + b, 0) / NSTA;
    this.infoEl.innerHTML = `t = <b>${t}</b> · pluie moyenne aux stations = <b>${moy.toFixed(2)} mm</b> · max du champ ≈ <b>${Math.max(...this.frames[t].flat()).toFixed(1)} mm</b>`;
  }

  togglePlay() { this.playing ? this.pause() : this.play(); }
  play() {
    if (!this.frames) return;
    this.playing = true;
    this.el.querySelector('.js-play').textContent = '❚❚ Pause';
    this.el.querySelector('.js-play').style.background = '#a23';
    const tick = () => {
      if (!this.playing) return;
      this.frame = (this.frame + 1) % T;
      this.draw();
      const spd = parseInt(this.spdEl.value, 10);
      this._timer = setTimeout(tick, 700 - 60 * spd);
    };
    this._timer = setTimeout(tick, 200);
  }
  pause() {
    this.playing = false;
    clearTimeout(this._timer);
    const b = this.el.querySelector('.js-play');
    if (b) { b.textContent = '▶ Lecture'; b.style.background = '#0d4d92'; }
  }

  cleanup() { this.pause(); if (this.plot && window.Plotly) Plotly.purge(this.plot); }
}

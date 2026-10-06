// scripts/geostat-js/widgets/annexe_vecteurs.js
// -----------------------------------------------------------------------------
// Widget « Vecteur 3D depuis (azimut, plongée) » (annexe A).
// Source de vérité : geostat_polymtl.forage.geometrie.vecteur_unitaire
// (via gpoly.geomVecteur). Le JS ne fait QUE l'affichage (arcs, axes, Plotly).
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

const debounce = (fn, ms = 80) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const d2r = d => d * Math.PI / 180;   // affichage des arcs uniquement

export default class AnnexeVecteurs extends Widget {
  render() {
    this.el.insertAdjacentHTML('beforeend', `
      <div style="max-width:900px;margin:0 auto;padding:1rem;">
        <div style="display:flex;gap:1.5rem;flex-wrap:wrap;align-items:center;margin-bottom:1.5rem;">
          <label><strong>Azimut a (°)</strong><br>
            <input class="js-az" type="range" min="0" max="359" value="45">
            <span class="js-azv" style="font-family:monospace;">45°</span></label>
          <label><strong>Plongée b (°)</strong><br>
            <input class="js-pl" type="range" min="0" max="90" value="30">
            <span class="js-plv" style="font-family:monospace;">30°</span></label>
          <label><strong>Longueur (m)</strong><br>
            <input class="js-len" type="range" min="0.1" max="5" value="2" step="0.1">
            <span class="js-lenv" style="font-family:monospace;">2.0 m</span></label>
        </div>
        <div class="js-plot" style="height:520px;"></div>
        <div class="js-out" style="margin-top:1rem;font-family:monospace;background:#f8f9fa;padding:.75rem;border-radius:6px;">—</div>
        <p style="margin-top:6px;font-size:11px;color:#666">
          Calculs effectués par <code>geostat_polymtl.forage.geometrie</code> (via Pyodide).</p>
      </div>
    `);

    this.azEl = this.el.querySelector('.js-az');
    this.plEl = this.el.querySelector('.js-pl');
    this.lenEl = this.el.querySelector('.js-len');
    this.plot = this.el.querySelector('.js-plot');
    this.out = this.el.querySelector('.js-out');

    const maj = debounce(() => this.update(), 80);
    this.on(this.azEl, 'input', maj);
    this.on(this.plEl, 'input', maj);
    this.on(this.lenEl, 'input', maj);

    afficherChargementJusquaPret(this.el).then(() => this.update());
  }

  cleanup() { try { Plotly.purge(this.plot); } catch (e) { /* ignore */ } }

  // --- éléments d'affichage (aucune math géostatistique) ---
  _arcAzimut(aDeg, r = 1.4) {
    const a = d2r(aDeg), xs = [], ys = [], zs = [];
    for (let i = 0; i <= 50; i++) {
      const t = a * i / 50;
      xs.push(r * Math.sin(t)); ys.push(r * Math.cos(t)); zs.push(0);
    }
    return { type: 'scatter3d', mode: 'lines', x: xs, y: ys, z: zs,
             line: { width: 7, color: '#6a1b9a' }, showlegend: false };
  }

  _arcPlongee(bDeg, ux, uy, r = 1.2) {
    const b = d2r(bDeg);
    const h = Math.sqrt(ux * ux + uy * uy);
    if (h < 1e-6) return null;
    const hx = ux / h, hy = uy / h, xs = [], ys = [], zs = [];
    for (let i = 0; i <= 40; i++) {
      const t = b * i / 40;
      xs.push(r * Math.cos(t) * hx); ys.push(r * Math.cos(t) * hy); zs.push(-r * Math.sin(t));
    }
    return { type: 'scatter3d', mode: 'lines', x: xs, y: ys, z: zs,
             line: { width: 7, color: '#0277bd' }, showlegend: false };
  }

  async update() {
    const az = +this.azEl.value, pl = +this.plEl.value, L = +this.lenEl.value;
    this.el.querySelector('.js-azv').textContent = az + '°';
    this.el.querySelector('.js-plv').textContent = pl + '°';
    this.el.querySelector('.js-lenv').textContent = L.toFixed(1) + ' m';

    // === Appel à la VRAIE librairie ===
    const u = await this.tryShow(() => gpoly.geomVecteur(az, pl));
    const x = u.x * L, y = u.y * L, z = u.z * L;

    this.out.innerHTML =
      `<strong>Vecteur unitaire</strong> : (${u.x.toFixed(3)}, ${u.y.toFixed(3)}, ${u.z.toFixed(3)})<br>` +
      `<strong>Vecteur</strong> : (${x.toFixed(3)}, ${y.toFixed(3)}, ${z.toFixed(3)})`;

    const a = d2r(az * 0.5), b = d2r(pl * 0.5);
    const h = Math.sqrt(u.x * u.x + u.y * u.y);
    const traces = [
      { type: 'scatter3d', mode: 'lines', x: [-5, 5], y: [0, 0], z: [0, 0], showlegend: false },
      { type: 'scatter3d', mode: 'lines', x: [0, 0], y: [-5, 5], z: [0, 0], showlegend: false },
      { type: 'scatter3d', mode: 'lines', x: [0, 0], y: [0, 0], z: [-5, 5], showlegend: false },
      { type: 'scatter3d', mode: 'lines', x: [0, 0], y: [0, 1.4], z: [0, 0],
        line: { width: 2, color: '#6a1b9a' }, showlegend: false },
      { type: 'scatter3d', mode: 'lines', x: [0, 1.4 * Math.sin(d2r(az))], y: [0, 1.4 * Math.cos(d2r(az))], z: [0, 0],
        line: { width: 2, color: '#6a1b9a' }, showlegend: false },
      this._arcAzimut(az),
      { type: 'scatter3d', mode: 'text', x: [1.7 * Math.sin(a)], y: [1.7 * Math.cos(a)], z: [0],
        text: ['a'], textfont: { size: 20, color: '#6a1b9a' }, showlegend: false },
      { type: 'scatter3d', mode: 'lines', x: [0, 1.2 * u.x], y: [0, 1.2 * u.y], z: [0, 0],
        line: { width: 2, color: '#0277bd' }, showlegend: false },
      { type: 'scatter3d', mode: 'lines', x: [0, 1.2 * u.x], y: [0, 1.2 * u.y], z: [0, 1.2 * u.z],
        line: { width: 2, color: '#0277bd' }, showlegend: false },
      { type: 'scatter3d', mode: 'lines+markers', x: [0, x], y: [0, y], z: [0, z],
        line: { width: 7, color: '#d32f2f' }, marker: { size: 6 }, name: 'Vecteur' },
      { type: 'scatter3d', mode: 'lines+markers', x: [0, u.x], y: [0, u.y], z: [0, u.z],
        line: { width: 4, color: '#1976d2' }, marker: { size: 4 }, name: 'Vecteur unitaire' },
    ];
    const arcPl = this._arcPlongee(pl, u.x, u.y);
    if (arcPl) {
      traces.push(arcPl);
      traces.push({ type: 'scatter3d', mode: 'text',
        x: [1.5 * Math.cos(b) * u.x / h], y: [1.5 * Math.cos(b) * u.y / h], z: [-1.5 * Math.sin(b) - 0.15],
        text: ['b'], textfont: { size: 20, color: '#0277bd' }, showlegend: false });
    }

    Plotly.react(this.plot, traces.filter(Boolean), {
      margin: { l: 0, r: 0, b: 0, t: 20 },
      scene: {
        xaxis: { range: [-5, 5], title: 'x (Est)' },
        yaxis: { range: [-5, 5], title: 'y (Nord)' },
        zaxis: { range: [-5, 5], title: 'z (Haut)' },
        aspectmode: 'cube',
      },
      uirevision: 'keep',
      showlegend: true,
    }, { responsive: true, displaylogo: false });
  }
}

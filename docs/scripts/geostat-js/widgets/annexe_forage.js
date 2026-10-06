// scripts/geostat-js/widgets/annexe_forage.js
// -----------------------------------------------------------------------------
// Widget « Forage (cylindre) recoupé par un plan » (annexe A).
// Source de vérité : geostat_polymtl.forage.geometrie
// .ellipse_intersection_plan_cylindre (via gpoly.geomEllipseCylindre).
// Le JS ne fait QUE l'affichage (surfaces Plotly, flèches).
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

const debounce = (fn, ms = 80) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

export default class AnnexeForage extends Widget {
  render() {
    this.el.insertAdjacentHTML('beforeend', `
      <div style="max-width:980px;margin:0 auto;padding:1rem;">
        <h4 style="margin:0 0 .75rem 0;">Forage (cylindre) recoupé par un plan (veine minéralisée)</h4>
        <div style="display:flex;gap:1.5rem;flex-wrap:wrap;align-items:center;margin-bottom:1rem;">
          <label style="min-width:280px;"><strong>Azimut du pôle a<sub>p</sub> (°)</strong><br>
            <input class="js-ap" type="range" min="0" max="359" value="120" style="width:260px;">
            <span class="js-apv" style="font-family:monospace;">120°</span></label>
          <label style="min-width:280px;"><strong>Plongée du pôle b<sub>p</sub> (°)</strong><br>
            <input class="js-bp" type="range" min="5" max="85" value="35" style="width:260px;">
            <span class="js-bpv" style="font-family:monospace;">35°</span></label>
        </div>
        <div class="js-plot" style="height:640px;border:1px solid #eee;border-radius:10px;"></div>
        <div class="js-out" style="margin-top:.75rem;font-family:monospace;background:#f8f9fa;padding:.75rem;border-radius:8px;border:1px solid #eee;">—</div>
        <p style="margin-top:6px;font-size:11px;color:#666">
          Calculs (ellipse d'intersection, axes) effectués par <code>geostat_polymtl.forage.geometrie</code> (via Pyodide).</p>
      </div>
    `);

    this.apEl = this.el.querySelector('.js-ap');
    this.bpEl = this.el.querySelector('.js-bp');
    this.plot = this.el.querySelector('.js-plot');
    this.out = this.el.querySelector('.js-out');

    const maj = debounce(() => this.update(), 80);
    this.on(this.apEl, 'input', maj);
    this.on(this.bpEl, 'input', maj);

    afficherChargementJusquaPret(this.el).then(() => this.update());
  }

  cleanup() { try { Plotly.purge(this.plot); } catch (e) { /* ignore */ } }

  // --- surfaces d'affichage (rendu uniquement) ---
  _cylindre(R = 1.0, zMin = -3.0, zMax = 3.0, nTheta = 60, nZ = 30) {
    const X = [], Y = [], Z = [];
    for (let iz = 0; iz < nZ; iz++) {
      const rx = [], ry = [], rz = [];
      const z = zMin + (zMax - zMin) * iz / (nZ - 1);
      for (let it = 0; it < nTheta; it++) {
        const t = 2 * Math.PI * it / (nTheta - 1);
        rx.push(R * Math.cos(t)); ry.push(R * Math.sin(t)); rz.push(z);
      }
      X.push(rx); Y.push(ry); Z.push(rz);
    }
    return { type: 'surface', x: X, y: Y, z: Z, opacity: 0.25, showscale: false,
             name: 'Forage (cylindre)', hoverinfo: 'skip' };
  }

  _plan(e1, e2, demiTaille = 3.4, pas = 25) {
    const X = [], Y = [], Z = [];
    for (let i = 0; i < pas; i++) {
      const rx = [], ry = [], rz = [];
      const v = -demiTaille + 2 * demiTaille * i / (pas - 1);
      for (let j = 0; j < pas; j++) {
        const u = -demiTaille + 2 * demiTaille * j / (pas - 1);
        rx.push(u * e1[0] + v * e2[0]);
        ry.push(u * e1[1] + v * e2[1]);
        rz.push(u * e1[2] + v * e2[2]);
      }
      X.push(rx); Y.push(ry); Z.push(rz);
    }
    return { type: 'surface', x: X, y: Y, z: Z, opacity: 0.20, showscale: false,
             name: 'Plan', hoverinfo: 'skip' };
  }

  _cone(v, tip, sizeRef) {
    return { type: 'cone', x: [tip[0]], y: [tip[1]], z: [tip[2]],
             u: [v[0]], v: [v[1]], w: [v[2]], sizemode: 'absolute', sizeref: sizeRef,
             anchor: 'tip', showscale: false, hoverinfo: 'skip' };
  }

  async update() {
    const ap = +this.apEl.value, bp = +this.bpEl.value;
    this.el.querySelector('.js-apv').textContent = `${ap}°`;
    this.el.querySelector('.js-bpv').textContent = `${bp}°`;

    const R = 1.0;

    // === Appels à la VRAIE librairie ===
    const [ell, inter] = await this.tryShow(() => Promise.all([
      gpoly.geomEllipseCylindre(ap, bp, R, 361),
      gpoly.geomIntersection(ap, bp, 0, 90, 0),   // base e1/e2 + normale (d = 0)
    ]));

    const n = inter.normale;
    const traces = [this._cylindre(R), this._plan(inter.e1, inter.e2)];

    if (ell) {
      traces.push({ type: 'scatter3d', mode: 'lines',
        x: ell.xs, y: ell.ys, z: ell.zs, line: { width: 6 },
        name: "Ellipse d'intersection", hoverinfo: 'skip' });
    }

    // Vecteur du forage (vertical, vers le bas)
    traces.push({ type: 'scatter3d', mode: 'lines', x: [0, 0], y: [0, 0], z: [0, -3],
                  line: { width: 8 }, name: 'Vecteur du forage', hoverinfo: 'skip' });
    traces.push(this._cone([0, 0, -1], [0, 0, -3], 0.45));

    // Pôle du plan
    const Ln = 2.6;
    traces.push({ type: 'scatter3d', mode: 'lines',
      x: [0, n[0] * Ln], y: [0, n[1] * Ln], z: [0, n[2] * Ln],
      line: { width: 8 }, name: 'Pôle du plan', hoverinfo: 'skip' });
    traces.push(this._cone(n, [n[0] * Ln, n[1] * Ln, n[2] * Ln], 0.45));

    // Grand axe / petit axe de l'ellipse (calculés par la librairie)
    if (ell) {
      const A = ell.grand_axe, B = ell.petit_axe;
      const La = 2.2 * R;   // longueurs d'affichage fixes (directions seulement)
      const Lb = 1.6 * R;
      traces.push({ type: 'scatter3d', mode: 'lines',
        x: [0, A[0] * La], y: [0, A[1] * La], z: [0, A[2] * La],
        line: { width: 9 }, name: 'Grand axe', hoverinfo: 'skip' });
      traces.push(this._cone(A, [A[0] * La, A[1] * La, A[2] * La], 0.40));
      traces.push({ type: 'scatter3d', mode: 'lines',
        x: [0, B[0] * Lb], y: [0, B[1] * Lb], z: [0, B[2] * Lb],
        line: { width: 9 }, name: 'Petit axe', hoverinfo: 'skip' });
      traces.push(this._cone(B, [B[0] * Lb, B[1] * Lb, B[2] * Lb], 0.40));
    }

    this.out.innerHTML =
      `<strong>Pôle du plan</strong> : a<sub>p</sub>=${ap}°, b<sub>p</sub>=${bp}°` +
      (ell
        ? `<br><strong>Ellipse</strong> : demi-grand axe = ${ell.demi_grand.toFixed(3)} · R, demi-petit axe = ${ell.demi_petit.toFixed(3)} · R`
        : `<br><em>Note :</em> plan quasi vertical (ellipse non tracée dans cette démonstration).`);

    Plotly.react(this.plot, traces, {
      margin: { l: 0, r: 0, b: 0, t: 30 },
      scene: {
        xaxis: { range: [-2, 2], visible: false },
        yaxis: { range: [-2, 2], visible: false },
        zaxis: { range: [-2, 2], visible: false },
        aspectmode: 'cube',
        camera: { eye: { x: 1.6, y: 1.6, z: 1.2 } },
      },
      uirevision: 'keep',
      showlegend: true,
      legend: { orientation: 'h', y: -0.05, x: 0.5, xanchor: 'center' },
    }, {
      responsive: true, displaylogo: false,
      modeBarButtonsToRemove: ['toImage', 'sendDataToCloud', 'lasso2d', 'select2d'],
    });
  }
}

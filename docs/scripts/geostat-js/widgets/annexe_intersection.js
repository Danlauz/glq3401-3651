// scripts/geostat-js/widgets/annexe_intersection.js
// -----------------------------------------------------------------------------
// Widget « Intersection plan–forage (schéma vectoriel) » (annexe A).
// Source de vérité : geostat_polymtl.forage.geometrie.intersection_plan_forage
// (via gpoly.geomIntersection). Le JS ne fait QUE l'affichage.
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

const debounce = (fn, ms = 80) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

const D_PLAN = 1.6;   // décalage du plan le long de sa normale (n·x = d)

export default class AnnexeIntersection extends Widget {
  render() {
    const curseur = (cls, label, val) => `
      <label style="min-width:240px;"><strong>${label}</strong><br>
        <input class="js-${cls}" type="range" min="${cls.startsWith('a') ? 0 : 5}"
               max="${cls.startsWith('a') ? 359 : 85}" value="${val}" style="width:220px;">
        <span class="js-${cls}v" style="font-family:monospace;">${val}°</span></label>`;

    this.el.insertAdjacentHTML('beforeend', `
      <div style="max-width:980px;margin:0 auto;padding:1rem;">
        <h4 style="margin:0 0 .75rem 0;">Intersection plan–forage (schéma vectoriel)</h4>
        <div style="display:flex;gap:1.5rem;flex-wrap:wrap;align-items:center;margin-bottom:1rem;">
          ${curseur('ap', 'Azimut du pôle a<sub>p</sub> (°)', 210)}
          ${curseur('bp', 'Plongée du pôle b<sub>p</sub> (°)', 20)}
          ${curseur('af', 'Azimut du forage a<sub>f</sub> (°)', 135)}
          ${curseur('bf', 'Plongée du forage b<sub>f</sub> (°)', 55)}
        </div>
        <div class="js-plot" style="height:620px;border:1px solid #eee;border-radius:10px;"></div>
        <div class="js-out" style="margin-top:.75rem;font-family:monospace;background:#f8f9fa;padding:.75rem;border-radius:8px;border:1px solid #eee;">—</div>
        <p style="margin-top:6px;font-size:11px;color:#666">
          Calculs (intersection, distances, angle) effectués par <code>geostat_polymtl.forage.geometrie</code> (via Pyodide).</p>
      </div>
    `);

    this.in = {};
    for (const id of ['ap', 'bp', 'af', 'bf']) this.in[id] = this.el.querySelector(`.js-${id}`);
    this.plot = this.el.querySelector('.js-plot');
    this.out = this.el.querySelector('.js-out');
    this._camera = null;

    const maj = debounce(() => this.update(), 80);
    for (const id of ['ap', 'bp', 'af', 'bf']) this.on(this.in[id], 'input', maj);

    afficherChargementJusquaPret(this.el).then(() => this.update());
  }

  cleanup() { try { Plotly.purge(this.plot); } catch (e) { /* ignore */ } }

  _plan(e1, e2, n, d, demiTaille = 3.3, pas = 25) {
    const o = [n[0] * d, n[1] * d, n[2] * d];
    const X = [], Y = [], Z = [];
    for (let r = 0; r < pas; r++) {
      const rx = [], ry = [], rz = [];
      const v = -demiTaille + 2 * demiTaille * r / (pas - 1);
      for (let c = 0; c < pas; c++) {
        const u = -demiTaille + 2 * demiTaille * c / (pas - 1);
        rx.push(o[0] + u * e1[0] + v * e2[0]);
        ry.push(o[1] + u * e1[1] + v * e2[1]);
        rz.push(o[2] + u * e1[2] + v * e2[2]);
      }
      X.push(rx); Y.push(ry); Z.push(rz);
    }
    return { type: 'surface', x: X, y: Y, z: Z, opacity: 0.25, showscale: false,
             hoverinfo: 'skip', name: 'Plan' };
  }

  _cone(dir, tip, sizeRef) {
    return { type: 'cone', x: [tip[0]], y: [tip[1]], z: [tip[2]],
             u: [dir[0]], v: [dir[1]], w: [dir[2]], sizemode: 'absolute',
             sizeref: sizeRef, anchor: 'tip', showscale: false, hoverinfo: 'skip' };
  }

  async update() {
    const ap = +this.in.ap.value, bp = +this.in.bp.value;
    const af = +this.in.af.value, bf = +this.in.bf.value;
    for (const id of ['ap', 'bp', 'af', 'bf']) {
      this.el.querySelector(`.js-${id}v`).textContent = `${this.in[id].value}°`;
    }

    // === Appel à la VRAIE librairie ===
    const r = await this.tryShow(() => gpoly.geomIntersection(ap, bp, af, bf, D_PLAN));
    const n = r.normale, s = r.direction_forage;

    // Point p0 arbitraire sur le plan (affichage du segment s0–p0)
    const u0 = -2.2, v0 = 0.9;
    const p0 = [
      n[0] * D_PLAN + u0 * r.e1[0] + v0 * r.e2[0],
      n[1] * D_PLAN + u0 * r.e1[1] + v0 * r.e2[1],
      n[2] * D_PLAN + u0 * r.e1[2] + v0 * r.e2[2],
    ];
    const pPerp = r.pied_perpendiculaire;

    const traces = [this._plan(r.e1, r.e2, n, D_PLAN)];

    traces.push({ type: 'scatter3d', mode: 'lines',
      x: [0, p0[0]], y: [0, p0[1]], z: [0, p0[2]],
      line: { width: 8, dash: 'dash' }, name: '(s₀−p₀)', hoverinfo: 'skip' });

    traces.push({ type: 'scatter3d', mode: 'lines',
      x: [0, pPerp[0]], y: [0, pPerp[1]], z: [0, pPerp[2]],
      line: { width: 8, dash: 'dot' }, name: 'Distance minimale (le long de n)', hoverinfo: 'skip' });

    const Ln = 2.1;
    traces.push({ type: 'scatter3d', mode: 'lines',
      x: [0, n[0] * Ln], y: [0, n[1] * Ln], z: [0, n[2] * Ln],
      line: { width: 10 }, name: 'Pôle (n)', hoverinfo: 'skip' });
    traces.push(this._cone(n, [n[0] * Ln, n[1] * Ln, n[2] * Ln], 0.45));

    const finForage = r.intersecte
      ? r.point_intersection
      : [s[0] * 5, s[1] * 5, s[2] * 5];
    traces.push({ type: 'scatter3d', mode: 'lines',
      x: [0, finForage[0]], y: [0, finForage[1]], z: [0, finForage[2]],
      line: { width: 10 }, name: 'Forage (s)', hoverinfo: 'skip' });
    traces.push(this._cone(s, finForage, 0.45));

    const marqueur = (p, txt, pos) => ({
      type: 'scatter3d', mode: 'markers+text', x: [p[0]], y: [p[1]], z: [p[2]],
      marker: { size: 6 }, text: [txt], textposition: pos,
      showlegend: false, hoverinfo: 'skip',
    });
    traces.push(marqueur([0, 0, 0], 's₀', 'top center'));
    traces.push(marqueur(p0, 'p₀', 'bottom right'));
    traces.push(marqueur(pPerp, 'p⊥', 'top left'));

    if (r.intersecte) {
      traces.push(marqueur(r.point_intersection, 'pᵢ', 'bottom left'));
      traces.push({ type: 'scatter3d', mode: 'text',
        x: [s[0] * r.t * 0.55], y: [s[1] * r.t * 0.55], z: [s[2] * r.t * 0.55],
        text: ['e · s'], textfont: { size: 16 }, showlegend: false, hoverinfo: 'skip' });
    } else {
      traces.push({ type: 'scatter3d', mode: 'text', x: [0], y: [0], z: [2.8],
        text: ['Forage parallèle au plan (s · n = 0) → pas d’intersection'],
        textfont: { size: 16 }, showlegend: false, hoverinfo: 'skip' });
    }

    this.out.innerHTML =
      `<strong>Distance minimale</strong> = ${r.distance_minimale.toFixed(2)} (segment pointillé s₀→p⊥)<br>` +
      `<strong>Angle</strong> entre s et n = ${r.angle_deg.toFixed(1)}° (si s ∥ n → distance à forer minimale)<br>` +
      `<strong>Distance à forer</strong> e = ${r.intersecte ? Math.abs(r.t).toFixed(2) : '—'}`;

    Plotly.react(this.plot, traces, {
      margin: { l: 0, r: 0, b: 0, t: 10 },
      scene: {
        xaxis: { range: [-5, 5], visible: false },
        yaxis: { range: [-5, 5], visible: false },
        zaxis: { range: [-5, 5], visible: false },
        aspectmode: 'cube',
        ...(this._camera ? { camera: this._camera } : {}),
      },
      uirevision: 'keep',
      showlegend: true,
      legend: { orientation: 'h', y: -0.06, x: 0.5, xanchor: 'center' },
    }, {
      responsive: true, displaylogo: false,
      modeBarButtonsToRemove: ['toImage', 'sendDataToCloud', 'lasso2d', 'select2d'],
    });

    if (!this.plot.__cameraListenerAttached) {
      this.plot.__cameraListenerAttached = true;
      this.plot.on('plotly_relayout', (ev) => {
        if (ev && ev['scene.camera']) this._camera = ev['scene.camera'];
      });
    }
  }
}

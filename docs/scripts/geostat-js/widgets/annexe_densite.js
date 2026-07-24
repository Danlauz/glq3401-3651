// scripts/geostat-js/widgets/annexe_densite.js
// -----------------------------------------------------------------------------
// Widget « Densité N(0,1) et probabilité d'un intervalle » (annexe B).
// Source de vérité : geostat_polymtl.treatment.exploratoire
// (densite_normale, probabilite_intervalle) via gpoly. Le JS n'affiche que.
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

const debounce = (fn, ms = 80) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

export default class AnnexeDensite extends Widget {
  render() {
    this.el.insertAdjacentHTML('beforeend', `
      <div style="max-width:900px;margin:0 auto;padding:1rem;">
        <div style="display:flex;gap:1.5rem;flex-wrap:wrap;margin-bottom:1rem;align-items:center;">
          <label style="min-width:260px;"><strong>Borne a</strong><br>
            <input class="js-a" type="range" min="-4" max="4" step="0.1" value="-1" style="width:240px;">
            <span class="js-av" style="font-family:monospace;">-1.0</span></label>
          <label style="min-width:260px;"><strong>Borne b</strong><br>
            <input class="js-b" type="range" min="-4" max="4" step="0.1" value="1" style="width:240px;">
            <span class="js-bv" style="font-family:monospace;">1.0</span></label>
        </div>
        <div class="js-plot" style="height:420px;border:1px solid #eee;border-radius:10px;"></div>
        <div class="js-out" style="margin-top:.75rem;font-family:monospace;background:#f8f9fa;padding:.75rem;border-radius:6px;border:1px solid #eee;">—</div>
        <p style="margin-top:6px;font-size:11px;color:#666">
          Calculs effectués par <code>geostat_polymtl.treatment.exploratoire</code> (via Pyodide).</p>
      </div>
    `);

    this.aEl = this.el.querySelector('.js-a');
    this.bEl = this.el.querySelector('.js-b');
    this.plot = this.el.querySelector('.js-plot');
    this.out = this.el.querySelector('.js-out');

    // Grille d'affichage (abscisses uniquement)
    this.xs = [];
    for (let x = -4; x <= 4 + 1e-9; x += 0.02) this.xs.push(+x.toFixed(2));

    const maj = debounce(() => this.update(), 80);
    this.on(this.aEl, 'input', maj);
    this.on(this.bEl, 'input', maj);

    afficherChargementJusquaPret(this.el).then(async () => {
      // Densité calculée une seule fois par la VRAIE librairie
      this.ys = await this.tryShow(() => gpoly.densiteNormaleMS(this.xs, 0, 1));
      this.update();
    });
  }

  cleanup() { try { Plotly.purge(this.plot); } catch (e) { /* ignore */ } }

  async update() {
    if (!this.ys) return;
    let a = +this.aEl.value, b = +this.bEl.value;
    if (a > b) { const t = a; a = b; b = t; }
    this.el.querySelector('.js-av').textContent = a.toFixed(1);
    this.el.querySelector('.js-bv').textContent = b.toFixed(1);

    // === Probabilité calculée par la VRAIE librairie ===
    const prob = await this.tryShow(() => gpoly.probabiliteIntervalle(a, b, 0, 1));

    const xsFill = [], ysFill = [];
    for (let i = 0; i < this.xs.length; i++) {
      if (this.xs[i] >= a && this.xs[i] <= b) { xsFill.push(this.xs[i]); ysFill.push(this.ys[i]); }
    }

    this.out.innerHTML =
      `<strong>Probabilité :</strong> P(${a.toFixed(2)} ≤ X ≤ ${b.toFixed(2)}) = <strong>${prob.toFixed(4)}</strong>`;

    Plotly.react(this.plot, [
      { x: this.xs, y: this.ys, type: 'scatter', mode: 'lines',
        line: { width: 3 }, hoverinfo: 'skip', name: 'Densité' },
      { x: xsFill, y: ysFill, type: 'scatter', mode: 'lines', fill: 'tozeroy',
        line: { width: 0 }, hoverinfo: 'skip', name: 'P(a≤X≤b)' },
    ], {
      margin: { l: 45, r: 15, b: 45, t: 15 },
      xaxis: { title: 'x', range: [-4, 4] },
      yaxis: { title: 'f<sub>X</sub>(x)', rangemode: 'tozero' },
      showlegend: false,
    }, {
      responsive: true, displaylogo: false,
      modeBarButtonsToRemove: ['toImage', 'sendDataToCloud', 'lasso2d', 'select2d'],
    });
  }
}

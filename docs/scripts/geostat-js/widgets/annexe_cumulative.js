// scripts/geostat-js/widgets/annexe_cumulative.js
// -----------------------------------------------------------------------------
// Widget « Fonction de répartition N(μ, σ²) » (annexe B).
// Source de vérité : geostat_polymtl.treatment.exploratoire.repartition_normale
// (via gpoly.repartitionNormale). Le JS ne fait QUE l'affichage.
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

const debounce = (fn, ms = 80) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

export default class AnnexeCumulative extends Widget {
  render() {
    this.el.insertAdjacentHTML('beforeend', `
      <div style="max-width:900px;margin:0 auto;padding:1rem;">
        <div style="display:flex;gap:1.5rem;flex-wrap:wrap;margin-bottom:1rem;align-items:center;">
          <label style="min-width:260px;"><strong>Valeur x</strong><br>
            <input class="js-x" type="range" min="-4" max="4" step="0.1" value="0" style="width:240px;">
            <span class="js-xv" style="font-family:monospace;">0.0</span></label>
          <label style="min-width:260px;"><strong>Moyenne μ</strong><br>
            <input class="js-mu" type="range" min="-2" max="2" step="0.1" value="0" style="width:240px;">
            <span class="js-muv" style="font-family:monospace;">0.0</span></label>
          <label style="min-width:260px;"><strong>Écart-type σ</strong><br>
            <input class="js-sg" type="range" min="0.2" max="2.0" step="0.1" value="1.0" style="width:240px;">
            <span class="js-sgv" style="font-family:monospace;">1.0</span></label>
        </div>
        <div class="js-plot" style="height:420px;border:1px solid #eee;border-radius:10px;"></div>
        <div class="js-out" style="margin-top:.75rem;font-family:monospace;background:#f8f9fa;padding:.75rem;border-radius:6px;border:1px solid #eee;">—</div>
        <p style="margin-top:6px;font-size:11px;color:#666">
          Calculs effectués par <code>geostat_polymtl.treatment.exploratoire</code> (via Pyodide).</p>
      </div>
    `);

    this.xEl = this.el.querySelector('.js-x');
    this.muEl = this.el.querySelector('.js-mu');
    this.sgEl = this.el.querySelector('.js-sg');
    this.plot = this.el.querySelector('.js-plot');
    this.out = this.el.querySelector('.js-out');

    this.xs = [];
    for (let t = -4; t <= 4 + 1e-9; t += 0.02) this.xs.push(+t.toFixed(2));

    const maj = debounce(() => this.update(), 80);
    this.on(this.xEl, 'input', maj);
    this.on(this.muEl, 'input', maj);
    this.on(this.sgEl, 'input', maj);

    afficherChargementJusquaPret(this.el).then(() => this.update());
  }

  cleanup() { try { Plotly.purge(this.plot); } catch (e) { /* ignore */ } }

  async update() {
    const x = +this.xEl.value;
    const mu = +this.muEl.value;
    const sg = Math.max(0.05, +this.sgEl.value);
    this.el.querySelector('.js-xv').textContent = x.toFixed(1);
    this.el.querySelector('.js-muv').textContent = mu.toFixed(1);
    this.el.querySelector('.js-sgv').textContent = sg.toFixed(1);

    // === Appels à la VRAIE librairie (courbe + valeur ponctuelle) ===
    const [Fs, FxArr] = await this.tryShow(() => Promise.all([
      gpoly.repartitionNormale(this.xs, mu, sg),
      gpoly.repartitionNormale([x], mu, sg),
    ]));
    const Fx = FxArr[0];

    this.out.innerHTML =
      `<strong>Fonction de répartition :</strong> F(x) = P(X ≤ x)<br>` +
      `Avec X ~ N(μ=${mu.toFixed(2)}, σ=${sg.toFixed(2)}), on obtient : ` +
      `<strong>F(${x.toFixed(2)}) = ${Fx.toFixed(4)}</strong>`;

    Plotly.react(this.plot, [
      { x: this.xs, y: Fs, type: 'scatter', mode: 'lines',
        line: { width: 3 }, hoverinfo: 'skip', showlegend: false },
      { type: 'scatter', mode: 'lines', x: [x, x], y: [0, Fx],
        line: { width: 3, dash: 'dot' }, hoverinfo: 'skip', showlegend: false },
      { type: 'scatter', mode: 'markers+text', x: [x], y: [Fx],
        marker: { size: 10 }, text: [`F(x)=${Fx.toFixed(3)}`],
        textposition: 'top center', hoverinfo: 'skip', showlegend: false },
    ], {
      margin: { l: 55, r: 15, b: 45, t: 15 },
      xaxis: { title: 'x', range: [-4, 4] },
      yaxis: { title: 'F(x) = P(X ≤ x)', range: [0, 1] },
      showlegend: false,
    }, {
      responsive: true, displaylogo: false,
      modeBarButtonsToRemove: ['toImage', 'sendDataToCloud', 'lasso2d', 'select2d'],
    });
  }
}

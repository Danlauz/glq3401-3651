// scripts/geostat-js/widgets/c11_support_affine.js
// Widget C11.5 — Changement de support affine.
import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';
const debounce = (fn, ms = 200) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

export default class C11SupportAffine extends Widget {
  render() {
    this.el.insertAdjacentHTML('beforeend', `
      <div class="gw-controls" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;">
        <label><b>Facteur f = Var(Z<sub>v</sub>) / Var(Z<sub>pt</sub>)</b>
          <input type="range" class="js-f" min="0.1" max="1.0" value="0.5" step="0.05" style="width:200px"><span class="js-fv">0.50</span></label>
      </div>
      <div class="js-plot" style="height:380px;margin-top:6px;"></div>
      <div class="js-info" style="padding:.4rem 1rem;font-family:'JetBrains Mono',monospace;font-size:.82rem;color:#444;text-align:center;background:#f0f0f0;border-radius:6px;margin-top:4px;">—</div>
      <p style="margin:4px 1rem;font-size:11px;color:#666;">
        Z<sub>v</sub> = m + √f · (Z<sub>pt</sub> − m), où m est la moyenne. f &lt; 1 réduit la variance (effet de support).
        La CDF du bloc est plus resserrée autour de m : les queues sont atténuées.</p>
    `);
    this.plot = this.el.querySelector('.js-plot');
    this.infoEl = this.el.querySelector('.js-info');
    this.f = this.el.querySelector('.js-f');
    const update = debounce(() => this.refresh(), 200);
    this.on(this.f, 'input', e => { this.el.querySelector('.js-fv').textContent = parseFloat(e.target.value).toFixed(2); update(); });
    afficherChargementJusquaPret(this.el).then(() => this.refresh());
  }

  async refresh() {
    const f = parseFloat(this.f.value);
    // CDF points : approximation lognormale ou trianglulaire
    const seuils = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const cdf_pts = [0.05, 0.15, 0.30, 0.50, 0.70, 0.85, 0.93, 0.97, 0.99];
    let r;
    try { r = await gpoly.KIsupportAffine(seuils, cdf_pts, f); }
    catch (e) { this.afficherAvertissement('Erreur : ' + e.message); return; }

    if (!window.Plotly) return;
    Plotly.react(this.plot, [
      { x: seuils, y: cdf_pts, mode: 'lines+markers', name: 'CDF des points (support ponctuel)',
        line: { color: '#0d4d92', width: 2.5 }, marker: { color: '#0d4d92', size: 9 } },
      { x: r.seuils_bloc, y: r.cdf_bloc, mode: 'lines+markers', name: `CDF du bloc (f = ${f.toFixed(2)})`,
        line: { color: '#c43a3a', width: 2.5, dash: 'dash' }, marker: { color: '#c43a3a', size: 9, symbol: 'diamond' } },
    ], {
      margin: { t: 35, l: 54, r: 20, b: 50 },
      xaxis: { title: { text: 'teneur Z', standoff: 6 } }, yaxis: { title: 'F(Z)', range: [0, 1.05] },
      title: { text: 'Changement de support : point → bloc', font: { size: 12 } },
      legend: { orientation: 'h', y: -0.18, x: 0.5, xanchor: 'center', font: { size: 10 } },
    }, { displaylogo: false, responsive: true });

    this.infoEl.innerHTML = `f = <b>${f.toFixed(2)}</b> ⇒ σ<sub>bloc</sub> = √f · σ<sub>pt</sub> = <b>${Math.sqrt(f).toFixed(3)}</b> · σ<sub>pt</sub>`;
  }

  cleanup() { if (window.Plotly && this.plot) Plotly.purge(this.plot); }
}

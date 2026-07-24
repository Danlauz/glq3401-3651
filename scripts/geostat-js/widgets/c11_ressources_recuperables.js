// scripts/geostat-js/widgets/c11_ressources_recuperables.js
// Widget C11.6 — Tonnage et teneur récupérables.
import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';
const debounce = (fn, ms = 400) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

export default class C11RessourcesRecuperables extends Widget {
  render() {
    this.el.insertAdjacentHTML('beforeend', `
      <div class="gw-controls" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;">
        <label>Portée a <input type="range" class="js-a" min="5" max="20" value="12" step="1" style="width:120px"><span class="js-av">12</span></label>
        <label><b>Cutoff z_c</b> <input type="range" class="js-cut" min="1" max="9" value="5" step="0.2" style="width:160px"><span class="js-cutv">5.0</span></label>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:6px;">
        <div class="js-plot-T" style="height:300px"></div>
        <div class="js-plot-q" style="height:300px"></div>
        <div class="js-plot-Q" style="height:300px"></div>
      </div>
      <div class="js-info" style="padding:.4rem 1rem;font-family:'JetBrains Mono',monospace;font-size:.82rem;color:#444;text-align:center;background:#f0f0f0;border-radius:6px;margin-top:4px;">—</div>
      <p style="margin:4px 1rem;font-size:11px;color:#666;">
        T(z_c) = P(Z &gt; z_c) — tonnage relatif. q(z_c) = E[Z | Z &gt; z_c] — teneur récupérable.
        Q(z_c) = T·q — métal récupérable (proportionnel à la quantité de minerai exploitable).</p>
    `);
    this.plotT = this.el.querySelector('.js-plot-T');
    this.plotq = this.el.querySelector('.js-plot-q');
    this.plotQ = this.el.querySelector('.js-plot-Q');
    this.infoEl = this.el.querySelector('.js-info');
    this.ctrl = { a: this.el.querySelector('.js-a'), cut: this.el.querySelector('.js-cut') };
    const update = debounce(() => this.refresh(), 500);
    for (const [k, el] of Object.entries(this.ctrl)) {
      this.on(el, 'input', e => { this.el.querySelector(`.js-${k}v`).textContent = parseFloat(e.target.value).toFixed(1); });
      this.on(el, 'input', update);
    }
    afficherChargementJusquaPret(this.el).then(() => this.refresh());
  }

  async refresh() {
    const a = parseFloat(this.ctrl.a.value);
    const cut = parseFloat(this.ctrl.cut.value);
    const seuils = [1.5, 3, 4.5, 6, 7.5, 9];
    const xd = [[5,5],[20,5],[5,20],[20,20],[12,12],[8,18],[18,8]];
    const zd = [2.5, 7.5, 4.0, 8.5, 5.5, 3.0, 6.5];
    const N = 18, dx = 25 / N;
    const cibles = []; for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) cibles.push([(i+0.5)*dx, (j+0.5)*dx]);

    let r_KI, r_dec;
    try {
      r_KI = await gpoly.KIcomplet(xd, zd, cibles, seuils, 'spherique', a, 0.25);
      r_dec = await gpoly.KIdecoder(r_KI.cdf_corrigee, seuils, cut, 0, 11);
    } catch (e) { this.afficherAvertissement('Erreur : ' + e.message); return; }

    const reshape = (flat) => { const M=[]; for (let j=0; j<N; j++) { const r=[]; for (let i=0; i<N; i++) r.push(flat[j*N+i]); M.push(r); } return M; };
    if (!window.Plotly) return;
    const layoutCommon = {
      margin: { t: 35, l: 30, r: 50, b: 30 },
      xaxis: { showticklabels: false, scaleanchor: 'y' }, yaxis: { showticklabels: false },
    };
    const pts = { x: xd.map(p=>p[0]), y: xd.map(p=>p[1]), mode: 'markers',
                   marker: { color: '#fff', size: 6, line: { color: '#000', width: 1 } }, showlegend: false };

    Plotly.react(this.plotT, [
      { type: 'heatmap', z: reshape(r_dec.tonnage_relatif), colorscale: 'Blues', zmin: 0, zmax: 1, colorbar: { thickness: 8 } }, pts,
    ], { ...layoutCommon, title: { text: `T(z_c=${cut.toFixed(1)})`, font: { size: 11 } } }, { displaylogo: false, responsive: true });
    Plotly.react(this.plotq, [
      { type: 'heatmap', z: reshape(r_dec.teneur_recup), colorscale: 'YlOrRd', colorbar: { thickness: 8 } }, pts,
    ], { ...layoutCommon, title: { text: `q(z_c) = teneur récup.`, font: { size: 11 } } }, { displaylogo: false, responsive: true });
    Plotly.react(this.plotQ, [
      { type: 'heatmap', z: reshape(r_dec.metal_relatif), colorscale: 'Turbo', colorbar: { thickness: 8 } }, pts,
    ], { ...layoutCommon, title: { text: `Q = T·q métal récup.`, font: { size: 11 } } }, { displaylogo: false, responsive: true });

    const mean = arr => arr.reduce((s,v)=>s+v,0)/arr.length;
    this.infoEl.innerHTML =
      `Moyennes sur la grille : T = <b>${mean(r_dec.tonnage_relatif).toFixed(3)}</b> · ` +
      `q = <b>${mean(r_dec.teneur_recup.filter(v => isFinite(v))).toFixed(3)}</b> · ` +
      `Q = <b>${mean(r_dec.metal_relatif).toFixed(3)}</b>`;
  }

  cleanup() { if (window.Plotly) { [this.plotT, this.plotq, this.plotQ].forEach(p => { if (p) Plotly.purge(p); }); } }
}

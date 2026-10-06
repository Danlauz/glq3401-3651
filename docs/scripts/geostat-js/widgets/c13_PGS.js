// scripts/geostat-js/widgets/c13_PGS.js
// Widget C13.2 — Pluri-Gaussien : 2 champs + partition.
import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';
const debounce = (fn, ms = 600) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const PALETTES = ['#0d4d92', '#ea580c', '#16a34a'];

export default class C13PGS extends Widget {
  render() {
    this.el.insertAdjacentHTML('beforeend', `
      <div class="gw-controls" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;">
        <label>Modèle <select class="js-mod">
          <option value="spherique">Sphérique</option><option value="exponentiel">Exponentiel</option><option value="gaussien">Gaussien</option>
        </select></label>
        <label>Portée a <input type="range" class="js-a" min="3" max="15" value="6" step="1" style="width:120px"><span class="js-av">6</span></label>
        <label>Grille N <input type="number" class="js-N" value="30" min="15" max="40" step="2" style="width:60px"></label>
        <label>p₁ <input type="range" class="js-p1" min="0.1" max="0.8" value="0.4" step="0.05" style="width:80px"><span class="js-p1v">0.40</span></label>
        <label>p₂ <input type="range" class="js-p2" min="0.1" max="0.7" value="0.3" step="0.05" style="width:80px"><span class="js-p2v">0.30</span></label>
        <label>Partition <select class="js-part">
          <option value="horizontale">Horizontale</option><option value="verticale">Verticale</option><option value="L">L (3 faciès)</option>
        </select></label>
        <button class="js-regen" type="button" style="font-size:.76rem;padding:3px 8px;background:#3a3632;color:#fff;border:none;border-radius:4px;cursor:pointer;">Resim</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:6px;">
        <div class="js-plot-Y1" style="height:280px"></div>
        <div class="js-plot-Y2" style="height:280px"></div>
        <div class="js-plot-facies" style="height:280px"></div>
      </div>
      <div class="js-info" style="padding:.4rem 1rem;font-family:'JetBrains Mono',monospace;font-size:.8rem;color:#444;text-align:center;background:#f0f0f0;border-radius:6px;margin-top:4px;">—</div>
      <p style="margin:4px 1rem;font-size:11px;color:#666;">
        PGS combine 2 champs gaussiens Y1, Y2 indépendants et un diagramme de partition du plan (Y1, Y2).
        La forme du diagramme contrôle les transitions entre faciès.</p>
    `);
    this.plotY1 = this.el.querySelector('.js-plot-Y1');
    this.plotY2 = this.el.querySelector('.js-plot-Y2');
    this.plotF = this.el.querySelector('.js-plot-facies');
    this.infoEl = this.el.querySelector('.js-info');
    this.ctrl = {
      mod: this.el.querySelector('.js-mod'), a: this.el.querySelector('.js-a'),
      N: this.el.querySelector('.js-N'), p1: this.el.querySelector('.js-p1'),
      p2: this.el.querySelector('.js-p2'), part: this.el.querySelector('.js-part'),
    };
    this.seed = 17;
    const update = debounce(() => this.refresh(), 600);
    for (const [k, el] of Object.entries(this.ctrl)) {
      this.on(el, 'input', e => {
        const s = this.el.querySelector(`.js-${k}v`);
        if (s) s.textContent = (k.startsWith('p')) ? parseFloat(e.target.value).toFixed(2) : e.target.value;
      });
      this.on(el, 'input', update); this.on(el, 'change', update);
    }
    this.on(this.el.querySelector('.js-regen'), 'click', () => { this.seed++; this.refresh(); });
    afficherChargementJusquaPret(this.el).then(() => this.refresh());
  }

  async refresh() {
    const mod = this.ctrl.mod.value, a = parseFloat(this.ctrl.a.value);
    const N = parseInt(this.ctrl.N.value, 10);
    let p1 = parseFloat(this.ctrl.p1.value), p2 = parseFloat(this.ctrl.p2.value);
    let p3 = 1 - p1 - p2;
    if (p3 < 0.05) { p3 = 0.05; p2 = 1 - p1 - p3; }
    const part = this.ctrl.part.value;
    let r;
    try {
      r = await gpoly.PGS(mod, a, this.seed, N, [p1, p2, p3], part);
    } catch (e) { this.afficherAvertissement('Erreur : ' + e.message); return; }

    const reshape = (flat) => { const M=[]; for (let j=0; j<N; j++) { const r=[]; for (let i=0; i<N; i++) r.push(flat[j*N+i]); M.push(r); } return M; };
    const Y1 = Array.from(r.Y1), Y2 = Array.from(r.Y2);
    const F = r.facies;

    if (!window.Plotly) return;
    const layoutCommon = {
      margin: { t: 35, l: 30, r: 50, b: 30 },
      xaxis: { showticklabels: false, scaleanchor: 'y' }, yaxis: { showticklabels: false },
    };
    Plotly.react(this.plotY1, [{ type: 'heatmap', z: reshape(Y1), colorscale: 'RdBu', colorbar: { thickness: 10 } }],
      { ...layoutCommon, title: { text: 'Y₁', font: { size: 12 } } }, { displaylogo: false, responsive: true });
    Plotly.react(this.plotY2, [{ type: 'heatmap', z: reshape(Y2), colorscale: 'RdBu', colorbar: { thickness: 10 } }],
      { ...layoutCommon, title: { text: 'Y₂', font: { size: 12 } } }, { displaylogo: false, responsive: true });
    const colors_facies = [[0, PALETTES[0]], [0.33, PALETTES[0]], [0.34, PALETTES[1]], [0.66, PALETTES[1]], [0.67, PALETTES[2]], [1, PALETTES[2]]];
    Plotly.react(this.plotF, [{ type: 'heatmap', z: reshape(F), colorscale: colors_facies, zmin: 1, zmax: 3, colorbar: { thickness: 10, tickvals: [1, 2, 3] } }],
      { ...layoutCommon, title: { text: `Faciès (partition ${part})`, font: { size: 11 } } },
      { displaylogo: false, responsive: true });

    const counts = [0, 0, 0];
    F.forEach(f => { if (f >= 1 && f <= 3) counts[f - 1]++; });
    const total = counts.reduce((s,v)=>s+v,0);
    this.infoEl.innerHTML =
      `Proportions cibles : ${p1.toFixed(2)}, ${p2.toFixed(2)}, ${p3.toFixed(2)} · ` +
      `observées : ${(counts[0]/total).toFixed(2)}, ${(counts[1]/total).toFixed(2)}, ${(counts[2]/total).toFixed(2)}`;
  }

  cleanup() {
    if (window.Plotly) {
      [this.plotY1, this.plotY2, this.plotF].forEach(p => { if (p) Plotly.purge(p); });
    }
  }
}

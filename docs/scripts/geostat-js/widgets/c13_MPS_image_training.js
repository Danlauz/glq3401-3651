// scripts/geostat-js/widgets/c13_MPS_image_training.js
// Widget C13.4 — MPS pedagogique avec image d'entraînement (TI).
import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';
const PALETTES = ['#0d4d92', '#ea580c'];

// Génère une TI synthétique avec des "chenaux" (faciès 2 sur fond 1)
function genererTI(side = 40, seed = 1) {
  const TI = new Array(side * side).fill(1);
  let s = seed >>> 0;
  const rng = () => { s = (s * 1664525 + 1013904223) | 0; return ((s >>> 0) / 4294967296); };
  // Quelques chenaux sinueux : courbes de Bezier épaisses
  for (let c = 0; c < 5; c++) {
    const x0 = Math.floor(rng() * side), y0 = Math.floor(rng() * side);
    const x1 = Math.floor(rng() * side), y1 = Math.floor(rng() * side);
    const x2 = Math.floor(rng() * side), y2 = Math.floor(rng() * side);
    const epaisseur = 2 + Math.floor(rng() * 3);
    for (let t = 0; t <= 100; t++) {
      const u = t / 100;
      const x = Math.round((1-u)*(1-u)*x0 + 2*(1-u)*u*x1 + u*u*x2);
      const y = Math.round((1-u)*(1-u)*y0 + 2*(1-u)*u*y1 + u*u*y2);
      for (let dx = -epaisseur; dx <= epaisseur; dx++)
        for (let dy = -epaisseur; dy <= epaisseur; dy++) {
          const xi = x + dx, yi = y + dy;
          if (xi >= 0 && xi < side && yi >= 0 && yi < side &&
              Math.sqrt(dx*dx + dy*dy) <= epaisseur) {
            TI[yi * side + xi] = 2;
          }
        }
    }
  }
  return TI;
}

export default class C13MPSImageTraining extends Widget {
  render() {
    this.el.insertAdjacentHTML('beforeend', `
      <div class="gw-controls" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;">
        <label>Grille sim N <input type="number" class="js-N" value="20" min="12" max="28" step="2" style="width:60px"></label>
        <label>Rayon template <input type="range" class="js-r" min="1" max="4" value="2" step="1" style="width:80px"><span class="js-rv">2</span></label>
        <button class="js-regen-ti" type="button" style="font-size:.76rem;padding:3px 8px;background:#0d4d92;color:#fff;border:none;border-radius:4px;cursor:pointer;">Nouvelle TI</button>
        <button class="js-regen" type="button" style="font-size:.76rem;padding:3px 8px;background:#3a3632;color:#fff;border:none;border-radius:4px;cursor:pointer;">Resim</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px;">
        <div class="js-plot-TI" style="height:340px"></div>
        <div class="js-plot-sim" style="height:340px"></div>
      </div>
      <div class="js-info" style="padding:.4rem 1rem;font-family:'JetBrains Mono',monospace;font-size:.82rem;color:#444;text-align:center;background:#f0f0f0;border-radius:6px;margin-top:4px;">—</div>
      <p style="margin:4px 1rem;font-size:11px;color:#666;">
        L'image d'entraînement (TI) contient des structures (ici : chenaux sinueux).
        Le MPS reproduit ces patterns dans la simulation. Plus le rayon est grand, mieux les patterns sont préservés (mais c'est plus lent).</p>
    `);
    this.plotTI = this.el.querySelector('.js-plot-TI');
    this.plotSim = this.el.querySelector('.js-plot-sim');
    this.infoEl = this.el.querySelector('.js-info');
    this.ctrl = { N: this.el.querySelector('.js-N'), r: this.el.querySelector('.js-r') };
    this.seedTI = 7; this.seedSim = 42;
    this.TI = genererTI(40, this.seedTI);
    this.TIside = 40;
    const update = () => this.refresh();
    this.on(this.ctrl.N, 'change', update);
    this.on(this.ctrl.r, 'input', e => {
      this.el.querySelector('.js-rv').textContent = e.target.value;
    });
    this.on(this.ctrl.r, 'change', update);
    this.on(this.el.querySelector('.js-regen-ti'), 'click', () => {
      this.seedTI++; this.TI = genererTI(40, this.seedTI); this.refresh();
    });
    this.on(this.el.querySelector('.js-regen'), 'click', () => {
      this.seedSim++; this.refresh();
    });
    afficherChargementJusquaPret(this.el).then(() => this.refresh());
  }

  async refresh() {
    const N = parseInt(this.ctrl.N.value, 10);
    const r = parseInt(this.ctrl.r.value, 10);
    let res;
    try {
      this.infoEl.textContent = 'MPS en cours… (peut prendre quelques secondes)';
      res = await gpoly.MPS(this.TI, N, r, this.seedSim);
    } catch (e) { this.afficherAvertissement('Erreur MPS : ' + e.message); return; }

    const reshape = (flat, side) => { const M=[]; for (let j=0; j<side; j++) { const ro=[]; for (let i=0; i<side; i++) ro.push(flat[j*side+i]); M.push(ro); } return M; };
    if (!window.Plotly) return;
    const colors = [[0, PALETTES[0]], [0.5, PALETTES[0]], [0.51, PALETTES[1]], [1, PALETTES[1]]];
    Plotly.react(this.plotTI, [{
      type: 'heatmap', z: reshape(this.TI, this.TIside), colorscale: colors,
      zmin: 1, zmax: 2, colorbar: { thickness: 10, tickvals: [1, 2] },
    }], {
      margin: { t: 35, l: 30, r: 50, b: 30 },
      xaxis: { showticklabels: false, scaleanchor: 'y' }, yaxis: { showticklabels: false },
      title: { text: `Image d'entraînement (TI, ${this.TIside}×${this.TIside})`, font: { size: 11 } },
    }, { displaylogo: false, responsive: true });
    Plotly.react(this.plotSim, [{
      type: 'heatmap', z: reshape(res.facies, N), colorscale: colors,
      zmin: 1, zmax: 2, colorbar: { thickness: 10, tickvals: [1, 2] },
    }], {
      margin: { t: 35, l: 30, r: 50, b: 30 },
      xaxis: { showticklabels: false, scaleanchor: 'y' }, yaxis: { showticklabels: false },
      title: { text: `Simulation MPS (${N}×${N}, r=${r})`, font: { size: 11 } },
    }, { displaylogo: false, responsive: true });

    const c1 = res.facies.filter(f => f === 1).length;
    const c2 = res.facies.filter(f => f === 2).length;
    const total = c1 + c2;
    const c1_TI = this.TI.filter(f => f === 1).length;
    const c2_TI = this.TI.filter(f => f === 2).length;
    const total_TI = c1_TI + c2_TI;
    this.infoEl.innerHTML =
      `Proportions TI : ${(c1_TI/total_TI).toFixed(2)} / ${(c2_TI/total_TI).toFixed(2)} · ` +
      `Sim : ${(c1/total).toFixed(2)} / ${(c2/total).toFixed(2)}`;
  }

  cleanup() {
    if (window.Plotly) { if (this.plotTI) Plotly.purge(this.plotTI); if (this.plotSim) Plotly.purge(this.plotSim); }
  }
}

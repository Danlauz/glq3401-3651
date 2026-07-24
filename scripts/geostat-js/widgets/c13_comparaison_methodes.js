// scripts/geostat-js/widgets/c13_comparaison_methodes.js
// Widget C13.5 — Comparaison SIS vs PGS vs MPS sur le même cas.
import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';
const debounce = (fn, ms = 1000) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const PALETTES = ['#0d4d92', '#ea580c', '#16a34a'];

function genererTI_simple(side = 30, seed = 1) {
  const TI = new Array(side * side).fill(1);
  let s = seed >>> 0;
  const rng = () => { s = (s * 1664525 + 1013904223) | 0; return ((s >>> 0) / 4294967296); };
  // Bandes alternées avec bruit
  for (let j = 0; j < side; j++) {
    for (let i = 0; i < side; i++) {
      const r = rng();
      const band = Math.floor(j / 6) % 2;
      TI[j*side+i] = band === 0 ? (r < 0.2 ? 2 : 1) : (r < 0.7 ? 2 : 1);
    }
  }
  return TI;
}

export default class C13ComparaisonMethodes extends Widget {
  render() {
    this.el.insertAdjacentHTML('beforeend', `
      <div class="gw-controls" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;">
        <label>Grille N <input type="number" class="js-N" value="20" min="15" max="25" step="2" style="width:60px"></label>
        <label>Portée a (SIS/PGS) <input type="range" class="js-a" min="3" max="10" value="5" step="1" style="width:100px"><span class="js-av">5</span></label>
        <label>p₂ cible <input type="range" class="js-p2" min="0.2" max="0.6" value="0.4" step="0.05" style="width:120px"><span class="js-p2v">0.40</span></label>
        <button class="js-regen" type="button" style="font-size:.76rem;padding:3px 8px;background:#3a3632;color:#fff;border:none;border-radius:4px;cursor:pointer;">Resim</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:6px;">
        <div class="js-plot-SIS" style="height:300px"></div>
        <div class="js-plot-PGS" style="height:300px"></div>
        <div class="js-plot-MPS" style="height:300px"></div>
      </div>
      <div class="js-info" style="padding:.4rem 1rem;font-family:'JetBrains Mono',monospace;font-size:.8rem;color:#444;text-align:center;background:#f0f0f0;border-radius:6px;margin-top:4px;">—</div>
      <p style="margin:4px 1rem;font-size:11px;color:#666;">
        SIS : proportions précises, peu de structure. PGS : transitions plus douces.
        MPS : reproduit les patterns de la TI (ici bandes alternées). À vous d'identifier les différences !</p>
    `);
    this.plotSIS = this.el.querySelector('.js-plot-SIS');
    this.plotPGS = this.el.querySelector('.js-plot-PGS');
    this.plotMPS = this.el.querySelector('.js-plot-MPS');
    this.infoEl = this.el.querySelector('.js-info');
    this.ctrl = { N: this.el.querySelector('.js-N'), a: this.el.querySelector('.js-a'), p2: this.el.querySelector('.js-p2') };
    this.seed = 31;
    const update = debounce(() => this.refresh(), 1200);
    for (const [k, el] of Object.entries(this.ctrl)) {
      this.on(el, 'input', e => {
        const s = this.el.querySelector(`.js-${k}v`);
        if (s) s.textContent = (k === 'p2') ? parseFloat(e.target.value).toFixed(2) : e.target.value;
      });
      this.on(el, 'input', update); this.on(el, 'change', update);
    }
    this.on(this.el.querySelector('.js-regen'), 'click', () => { this.seed++; this.refresh(); });
    afficherChargementJusquaPret(this.el).then(() => this.refresh());
  }

  async refresh() {
    const N = parseInt(this.ctrl.N.value, 10);
    const a = parseFloat(this.ctrl.a.value);
    const p2 = parseFloat(this.ctrl.p2.value);
    const props = [1 - p2, p2];

    this.infoEl.textContent = 'Calcul SIS + PGS + MPS…';
    let rSIS, rPGS, rMPS;
    try {
      [rSIS, rPGS] = await Promise.all([
        gpoly.SIS('spherique', a, this.seed, N, props, null, 0.05, 10),
        gpoly.PGS('spherique', a, this.seed + 1, N, props, 'horizontale'),
      ]);
      // MPS avec petite TI
      const TI = genererTI_simple(30, this.seed);
      rMPS = await gpoly.MPS(TI, N, 2, this.seed + 2);
    } catch (e) { this.afficherAvertissement('Erreur : ' + e.message); return; }

    const reshape = (flat, n) => { const M=[]; for (let j=0; j<n; j++) { const r=[]; for (let i=0; i<n; i++) r.push(flat[j*n+i]); M.push(r); } return M; };
    if (!window.Plotly) return;
    const colors = [[0, PALETTES[0]], [0.5, PALETTES[0]], [0.51, PALETTES[1]], [1, PALETTES[1]]];
    const layoutCommon = {
      margin: { t: 35, l: 30, r: 50, b: 30 },
      xaxis: { showticklabels: false, scaleanchor: 'y' }, yaxis: { showticklabels: false },
    };
    const plot = (el, F, label) => {
      Plotly.react(el, [{ type: 'heatmap', z: reshape(F, N), colorscale: colors, zmin: 1, zmax: 2, colorbar: { thickness: 8, tickvals: [1, 2] } }],
        { ...layoutCommon, title: { text: label, font: { size: 12 } } }, { displaylogo: false, responsive: true });
    };
    plot(this.plotSIS, rSIS.facies, 'SIS');
    plot(this.plotPGS, rPGS.facies, 'PGS (partition horizontale)');
    plot(this.plotMPS, rMPS.facies, 'MPS (TI bandes)');

    const propObs = (F) => F.filter(f => f === 2).length / F.length;
    this.infoEl.innerHTML =
      `Proportion p₂ observée : ` +
      `SIS = <b>${propObs(rSIS.facies).toFixed(3)}</b> · ` +
      `PGS = <b>${propObs(rPGS.facies).toFixed(3)}</b> · ` +
      `MPS = <b>${propObs(rMPS.facies).toFixed(3)}</b> · cible ${p2.toFixed(2)}`;
  }

  cleanup() {
    if (window.Plotly) {
      [this.plotSIS, this.plotPGS, this.plotMPS].forEach(p => { if (p) Plotly.purge(p); });
    }
  }
}

// scripts/geostat-js/widgets/c09_bloc_vs_ponctuel.js
// -----------------------------------------------------------------------------
// Widget C09.4 — Krigeage de bloc vs ponctuel.
//
// Même champ, même modèle (imbriqué), mais on estime la teneur sur deux
// supports : krigeage PONCTUEL (grille fine) vs krigeage de BLOC (le domaine
// est pavé en blocs jointifs de côté L). On observe :
//   - L'estimation de bloc est plus LISSE (effet de régression).
//   - Var(Z*_v) < Var(Z*_pt) et σ²_K,v < σ²_K,pt.
//   - Plus L augmente, plus la carte de bloc est grossière et lisse.
//
// Modèle imbriqué réglable (plusieurs structures + pépite). Calculs : cokri via
// gpoly.krigeageOrdinaire et gpoly.krigeageBloc (discrétisation Gauss 5×5).
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const TYPES = [['pepite', 'Effet de pépite'], ['spherique', 'Sphérique'], ['exponentiel', 'Exponentiel'], ['gaussien', 'Gaussien']];

function genererDonnees(seed) {
  let s = seed;
  const rng = () => { s = (s * 1664525 + 1013904223) | 0; return ((s >>> 0) / 4294967296); };
  const data = [];
  for (let i = 0; i < 25; i++) data.push({ x: 5 + 90 * rng(), y: 5 + 90 * rng(), z: 2 + 6 * rng() });
  return data;
}

export default class C09BlocVsPonctuel extends Widget {
  render() {
    this.donnees = genererDonnees(7);
    this.structures = [{ modele: 'spherique', palier: 1, ag: 25, ap: 25, theta: 0 }];
    const id = this.el.id;
    this.el.insertAdjacentHTML('beforeend', `
      <style>
        .bv-row label { display:inline-flex !important; flex-direction:row !important; align-items:center; gap:5px; }
        #${id} .bv-grp{padding:6px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;margin-bottom:6px;}
        #${id} .bv-grp b{font-size:.78rem;color:#555;margin-right:4px;}
        #${id} .bv-grp input[type=number],#${id} .bv-grp select{padding:1px 4px;border:1px solid #c7ccd1;border-radius:4px;}
        #${id} .bv-mini{font-size:.74rem;padding:2px 8px;color:#fff;border:none;border-radius:4px;cursor:pointer;}
      </style>
      <div class="bv-grp"><b>Modèle imbriqué</b> <span class="js-structs"></span>
        <button class="js-addstruct bv-mini" type="button" style="background:#4a6a3a;">+ modèle</button></div>
      <div class="gw-controls bv-row" style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;padding:6px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;margin-bottom:6px;">
        <label><b>Taille bloc L</b> <input type="range" class="js-L" min="2" max="34" value="12" step="1" style="width:160px"><span class="js-Lv">12</span></label>
        <button class="js-regen bv-mini" type="button" style="background:#3a3632;">Resimuler</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:2px;">
        <div class="js-plot-pt" style="height:330px"></div>
        <div class="js-plot-blk" style="height:330px"></div>
      </div>
      <div class="js-info" style="padding:.4rem 1rem;font-family:'JetBrains Mono',monospace;font-size:.82rem;color:#444;text-align:center;background:#f0f0f0;border-radius:6px;margin-top:4px;">—</div>
    `);

    this.plotPt = this.el.querySelector('.js-plot-pt');
    this.plotBlk = this.el.querySelector('.js-plot-blk');
    this.infoEl = this.el.querySelector('.js-info');
    this.LEl = this.el.querySelector('.js-L');

    const update = debounce(() => this.refresh(), 250);
    this.on(this.LEl, 'input', e => { this.el.querySelector('.js-Lv').textContent = e.target.value; });
    this.on(this.LEl, 'input', update);
    this.on(this.el.querySelector('.js-addstruct'), 'click', () => { this.structures.push({ modele: 'spherique', palier: 0.5, ag: 25, ap: 25, theta: 0 }); this.renderStructs(); this.refresh(); });
    this.on(this.el.querySelector('.js-regen'), 'click', () => { this.donnees = genererDonnees(Math.floor(Math.random() * 1e6)); this.refresh(); });

    this.renderStructs();
    afficherChargementJusquaPret(this.el).then(() => this.refresh());
  }

  renderStructs() {
    const t = this.el.querySelector('.js-structs');
    t.innerHTML = `<div style="display:flex;flex-direction:column;gap:5px;margin:4px 0;">` +
      this.structures.map((s, i) => {
        const isPep = s.modele === 'pepite';
        const params = isPep
          ? `<span>c<sub>0</sub></span><input type="number" data-i="${i}" data-f="palier" value="${s.palier}" step="0.1" style="width:42px;">`
          : `<span>c<sub>1</sub></span><input type="number" data-i="${i}" data-f="palier" value="${s.palier}" step="0.1" style="width:42px;">` +
            `<span>a<sub>g</sub></span><input type="number" data-i="${i}" data-f="ag" value="${s.ag}" step="1" style="width:40px;">` +
            `<span>a<sub>p</sub></span><input type="number" data-i="${i}" data-f="ap" value="${s.ap}" step="1" style="width:40px;">` +
            `<span>θ</span><input type="number" data-i="${i}" data-f="theta" value="${s.theta}" step="5" style="width:40px;">`;
        return `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:4px;">` +
          `<span style="color:#888;min-width:56px;">Modèle ${i + 1}</span>` +
          `<select data-i="${i}" data-f="modele">${TYPES.map(([v, n]) => `<option value="${v}"${v === s.modele ? ' selected' : ''}>${n}</option>`).join('')}</select>` +
          params +
          (this.structures.length > 1 ? `<button class="js-dels bv-mini" data-i="${i}" type="button" style="background:#c44;padding:1px 5px;">×</button>` : '') +
          `</div>`;
      }).join('') + `</div>`;
    const upd = debounce(() => this.refresh(), 250);
    t.querySelectorAll('input,select').forEach(inp => this.on(inp, 'input', e => {
      const f = e.target.dataset.f, i = +e.target.dataset.i;
      if (f === 'modele') { this.structures[i].modele = e.target.value; this.renderStructs(); this.refresh(); }
      else { this.structures[i][f] = parseFloat(e.target.value) || 0; upd(); }
    }));
    t.querySelectorAll('.js-dels').forEach(b => this.on(b, 'click', e => { this.structures.splice(+e.target.dataset.i, 1); this.renderStructs(); this.refresh(); }));
  }

  _structsLib() { return this.structures.filter(s => s.modele !== 'pepite').map(s => ({ modele: s.modele, palier: s.palier, portee: [s.ag, s.ap], angle: s.theta })); }
  _c0() { return this.structures.filter(s => s.modele === 'pepite').reduce((a, s) => a + (s.palier || 0), 0); }

  async refresh() {
    const L = parseInt(this.LEl.value, 10);
    const structs = this._structsLib();
    const c0 = this._c0();
    if (!structs.length && c0 <= 0) { this.afficherAvertissement('Ajoutez au moins une structure.'); return; }
    const xd = this.donnees.map(d => [d.x, d.y]), zd = this.donnees.map(d => d.z);

    const Npt = 40, dxp = 100 / Npt, cibPt = [];
    for (let j = 0; j < Npt; j++) for (let i = 0; i < Npt; i++) cibPt.push([(i + 0.5) * dxp, (j + 0.5) * dxp]);
    const nb = Math.max(2, Math.round(100 / L)), Lb = 100 / nb, cibBlk = [];
    for (let j = 0; j < nb; j++) for (let i = 0; i < nb; i++) cibBlk.push([(i + 0.5) * Lb, (j + 0.5) * Lb]);

    let r_pt, r_blk;
    try {
      r_pt = await gpoly.krigeageOrdinaire(xd, zd, cibPt, structs, c0);
      r_blk = await gpoly.krigeageBloc(xd, zd, cibBlk, structs, [Lb, Lb], [5, 5], c0);
    } catch (e) { this.afficherAvertissement('Erreur : ' + e.message); return; }

    const reshape = (arr, n) => { const M = []; for (let j = 0; j < n; j++) { const row = []; for (let i = 0; i < n; i++) row.push(arr[j * n + i]); M.push(row); } return M; };
    const Z_pt = reshape(r_pt.estimations, Npt), Z_blk = reshape(r_blk.estimations, nb);
    const xPt = Array.from({ length: Npt }, (_, i) => (i + 0.5) * dxp);
    const xBlk = Array.from({ length: nb }, (_, i) => (i + 0.5) * Lb);

    const filt = arr => arr.filter(x => isFinite(x));
    const [st_pt, st_blk, sv_pt, sv_blk] = await Promise.all([
      gpoly.statistiquesDescriptives(filt(r_pt.estimations)),
      gpoly.statistiquesDescriptives(filt(r_blk.estimations)),
      gpoly.statistiquesDescriptives(filt(r_pt.variances)),
      gpoly.statistiquesDescriptives(filt(r_blk.variances)),
    ]);

    if (!window.Plotly) { this.afficherAvertissement('Plotly non chargé.'); return; }
    const layoutCommon = {
      margin: { t: 32, l: 36, r: 56, b: 30 },
      xaxis: { range: [0, 100], showticklabels: false, scaleanchor: 'y' },
      yaxis: { range: [0, 100], showticklabels: false },
    };
    const pts = { x: this.donnees.map(d => d.x), y: this.donnees.map(d => d.y), mode: 'markers', marker: { color: '#fff', size: 6, line: { color: '#000', width: 1 } }, showlegend: false, hoverinfo: 'skip' };

    Plotly.react(this.plotPt, [
      { type: 'heatmap', z: Z_pt, x: xPt, y: xPt, colorscale: 'Viridis', zmin: 2, zmax: 8, colorbar: { thickness: 12, len: 0.8 } }, pts,
    ], { ...layoutCommon, title: { text: `Krigeage PONCTUEL — grille ${Npt}×${Npt}`, font: { size: 12 } } }, { displaylogo: false, responsive: true });

    Plotly.react(this.plotBlk, [
      { type: 'heatmap', z: Z_blk, x: xBlk, y: xBlk, xgap: 1, ygap: 1, colorscale: 'Viridis', zmin: 2, zmax: 8, colorbar: { thickness: 12, len: 0.8 } }, pts,
    ], { ...layoutCommon, title: { text: `Krigeage de BLOC — ${nb}×${nb} blocs de ${Lb.toFixed(0)}×${Lb.toFixed(0)}`, font: { size: 12 } } }, { displaylogo: false, responsive: true });

    this.infoEl.innerHTML =
      `<b>Effet de lissage</b> · Var(Z*<sub>pt</sub>) = ${st_pt.variance.toFixed(4)} · Var(Z*<sub>v</sub>) = ${st_blk.variance.toFixed(4)} ` +
      `(${st_blk.variance < st_pt.variance ? '↓ lissage ✓' : '↑'})<br>` +
      `<b>Variance de krigeage moyenne</b> · σ²<sub>K,pt</sub> = ${sv_pt.moyenne.toFixed(4)} · σ²<sub>K,v</sub> = ${sv_blk.moyenne.toFixed(4)} ` +
      `(${sv_blk.moyenne < sv_pt.moyenne ? '↓ bloc plus fiable ✓' : '↑'})`;
  }

  cleanup() {
    if (window.Plotly) {
      if (this.plotPt) Plotly.purge(this.plotPt);
      if (this.plotBlk) Plotly.purge(this.plotBlk);
    }
  }
}

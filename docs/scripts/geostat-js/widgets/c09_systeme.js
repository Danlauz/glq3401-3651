// scripts/geostat-js/widgets/c09_systeme.js
// -----------------------------------------------------------------------------
// Widget C09.3 — Calculateur du système de krigeage (KS / KO), 1D et 2D.
//
// L'utilisateur saisit les données (x[, y], z), la cible, le type (KS/KO) et un
// modèle de variogramme IMBRIQUÉ (autant de structures que voulu, chacune avec
// palier + portées). En 2D : anisotropie a_g / a_p / θ par structure.
//
// Par défaut on n'affiche que la SOLUTION (poids, estimation, variance). Le
// bouton « Afficher le détail » révèle la matrice des distances, la matrice de
// covariance et le SYSTÈME complet sous forme matricielle A·λ = b — empilés
// verticalement (lisibles même avec beaucoup de données).
//
// Tout passe par gpoly.systemeKrigeage (cokri itype=1 ou 2). cokri renvoie
// λ/A/b en ordre de proximité → on réordonne dans l'ordre de saisie.
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

const debounce = (fn, ms = 150) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const MAT = `font-family:'JetBrains Mono',monospace;font-size:.76rem;border-collapse:collapse;margin:2px 0;`;
const CELL = `border:1px solid #ccc;padding:2px 6px;text-align:right;min-width:46px;`;
const HCELL = CELL + 'background:#e8e5dc;font-weight:600;';
const TYPES = [['pepite', 'Effet de pépite'], ['spherique', 'Sphérique'], ['exponentiel', 'Exponentiel'], ['gaussien', 'Gaussien']];

function matTable(title, M, rowLab, colLab, hiDiag) {
  let h = `<div style="font-weight:600;font-size:.78rem;margin:6px 0 2px;">${title}</div><table style="${MAT}"><tr><th style="${HCELL}"></th>`;
  colLab.forEach(c => h += `<th style="${HCELL}">${c}</th>`);
  h += '</tr>';
  M.forEach((row, i) => {
    h += `<tr><th style="${HCELL}">${rowLab[i]}</th>`;
    row.forEach((v, j) => { h += `<td style="${CELL}${hiDiag && i === j ? 'background:#eef2e8;' : ''}">${(+v).toFixed(2)}</td>`; });
    h += '</tr>';
  });
  return h + '</table>';
}

export default class C09Systeme extends Widget {
  render() {
    this.dim = 1;
    this.type = 'ordinaire';
    this.showDetail = false;
    this.donnees = [{ x: 0, y: 0, z: 8 }, { x: 4, y: 0, z: 12 }, { x: 10, y: 0, z: 6 }];
    this.cible = { x: 5, y: 0 };
    this.structures = [{ modele: 'pepite', palier: 1, ag: 8, ap: 8, theta: 0 }, { modele: 'spherique', palier: 10, ag: 8, ap: 8, theta: 0 }];
    const id = this.el.id;

    this.el.insertAdjacentHTML('beforeend', `
      <style>
        .sy-row label { display:inline-flex !important; flex-direction:row !important; align-items:center; gap:5px; }
        #${id} .sy-grp{padding:6px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;margin-bottom:6px;}
        #${id} .sy-grp b{font-size:.78rem;color:#555;margin-right:4px;}
        #${id} input[type=number]{padding:1px 4px;border:1px solid #c7ccd1;border-radius:4px;}
        #${id} select{padding:1px 4px;border:1px solid #c7ccd1;border-radius:4px;}
        #${id} .sy-mini{font-size:.74rem;padding:2px 8px;color:#fff;border:none;border-radius:4px;cursor:pointer;}
      </style>
      <div class="sy-grp sy-row" style="display:flex;flex-wrap:wrap;gap:14px;align-items:center;">
        <label>Dimension <select class="js-dim"><option value="1">1D</option><option value="2">2D</option></select></label>
        <label>Type <select class="js-type"><option value="ordinaire">KO</option><option value="simple">KS</option></select></label>
        <label class="js-mwrap">m <input type="number" class="js-m" value="8" step="0.5" style="width:56px;"></label>
        <button class="js-detail sy-mini" type="button" style="background:#0d4d92;">Afficher le détail</button>
      </div>
      <div style="display:grid;grid-template-columns:minmax(320px,1.25fr) minmax(220px,0.75fr);gap:10px;align-items:start;">
        <div style="min-width:0;">
          <div class="sy-grp" style="overflow-x:auto;"><b>Données</b> <span class="js-data"></span>
            <button class="js-add sy-mini" type="button" style="background:#4a6a3a;">+ donnée</button></div>
          <div class="sy-grp"><b>Cible</b> <span class="js-cible"></span></div>
          <div class="sy-grp" style="overflow-x:auto;"><b>Modèle imbriqué</b> <span class="js-structs"></span>
            <button class="js-addstruct sy-mini" type="button" style="background:#4a6a3a;">+ structure</button></div>
        </div>
        <div class="js-plot" style="height:300px;min-width:0;border:1px solid #ddd;border-radius:8px;"></div>
      </div>
      <div class="js-sol" style="padding:10px 14px;margin-top:4px;background:#eef2e8;border:1px solid #b8c8a8;border-radius:8px;"></div>
      <div class="js-detailbox" style="margin-top:6px;display:none;"></div>
    `);

    this.solEl = this.el.querySelector('.js-sol');
    this.detailEl = this.el.querySelector('.js-detailbox');
    this.plotEl = this.el.querySelector('.js-plot');
    this.mEl = this.el.querySelector('.js-m');

    const upd = debounce(() => this.resoudre(), 120);
    this.on(this.el.querySelector('.js-dim'), 'change', e => { this.dim = parseInt(e.target.value, 10); this.renderData(); this.renderCible(); this.renderStructs(); this.resoudre(); });
    this.on(this.el.querySelector('.js-type'), 'change', e => { this.type = e.target.value; this.el.querySelector('.js-mwrap').style.display = this.type === 'simple' ? '' : 'none'; this.resoudre(); });
    this.on(this.mEl, 'input', upd);
    this.on(this.el.querySelector('.js-add'), 'click', () => { const l = this.donnees[this.donnees.length - 1] || { x: 0, y: 0, z: 5 }; this.donnees.push({ x: l.x + 5, y: 0, z: 5 }); this.renderData(); this.resoudre(); });
    this.on(this.el.querySelector('.js-addstruct'), 'click', () => { this.structures.push({ modele: 'spherique', palier: 2, ag: 8, ap: 8, theta: 0 }); this.renderStructs(); this.resoudre(); });
    this.on(this.el.querySelector('.js-detail'), 'click', e => {
      this.showDetail = !this.showDetail;
      this.detailEl.style.display = this.showDetail ? '' : 'none';
      e.target.textContent = this.showDetail ? 'Masquer le détail' : 'Afficher le détail';
      e.target.style.background = this.showDetail ? '#3a3632' : '#0d4d92';
      this.resoudre();
    });
    this.el.querySelector('.js-mwrap').style.display = 'none';

    this.renderData(); this.renderCible(); this.renderStructs();
    afficherChargementJusquaPret(this.el).then(() => this.resoudre());
  }

  renderData() {
    const t = this.el.querySelector('.js-data');
    t.innerHTML = `<div style="display:flex;flex-direction:column;gap:4px;margin:4px 0;">` +
      this.donnees.map((d, i) =>
        `<div style="white-space:nowrap;display:flex;align-items:center;gap:4px;">` +
        `<span style="color:#888;min-width:56px;">Donnée ${i + 1}</span>` +
        `x<input type="number" data-i="${i}" data-f="x" value="${d.x}" step="0.5" style="width:44px;">` +
        (this.dim === 2 ? `y<input type="number" data-i="${i}" data-f="y" value="${d.y}" step="0.5" style="width:44px;">` : '') +
        `z<input type="number" data-i="${i}" data-f="z" value="${d.z}" step="0.5" style="width:44px;">` +
        `<button class="js-deld sy-mini" data-i="${i}" type="button" style="background:#c44;padding:1px 5px;">×</button></div>`
      ).join('') + `</div>`;
    const upd = debounce(() => this.resoudre(), 120);
    t.querySelectorAll('input').forEach(inp => this.on(inp, 'input', e => { this.donnees[+e.target.dataset.i][e.target.dataset.f] = parseFloat(e.target.value) || 0; upd(); }));
    t.querySelectorAll('.js-deld').forEach(b => this.on(b, 'click', e => { if (this.donnees.length > 1) { this.donnees.splice(+e.target.dataset.i, 1); this.renderData(); this.resoudre(); } }));
  }

  renderCible() {
    const t = this.el.querySelector('.js-cible');
    t.innerHTML = `x₀<input type="number" class="js-x0" value="${this.cible.x}" step="0.5" style="width:56px;">` +
      (this.dim === 2 ? ` y₀<input type="number" class="js-y0" value="${this.cible.y}" step="0.5" style="width:56px;">` : '');
    const upd = debounce(() => this.resoudre(), 120);
    this.on(t.querySelector('.js-x0'), 'input', e => { this.cible.x = parseFloat(e.target.value) || 0; upd(); });
    if (this.dim === 2) this.on(t.querySelector('.js-y0'), 'input', e => { this.cible.y = parseFloat(e.target.value) || 0; upd(); });
  }

  renderStructs() {
    const t = this.el.querySelector('.js-structs');
    t.innerHTML = `<div style="display:flex;flex-direction:column;gap:5px;margin:4px 0;">` +
      this.structures.map((s, i) => {
        const isPep = s.modele === 'pepite';
        const params = isPep
          ? `<span>c<sub>0</sub></span><input type="number" data-i="${i}" data-f="palier" value="${s.palier}" step="0.5" style="width:40px;">`
          : `<span>c<sub>1</sub></span><input type="number" data-i="${i}" data-f="palier" value="${s.palier}" step="0.5" style="width:40px;">` +
            (this.dim === 2
              ? `<span>a<sub>g</sub></span><input type="number" data-i="${i}" data-f="ag" value="${s.ag}" step="1" style="width:38px;"><span>a<sub>p</sub></span><input type="number" data-i="${i}" data-f="ap" value="${s.ap}" step="1" style="width:38px;"><span>θ</span><input type="number" data-i="${i}" data-f="theta" value="${s.theta}" step="5" style="width:38px;">`
              : `<span>a</span><input type="number" data-i="${i}" data-f="ag" value="${s.ag}" step="1" style="width:42px;">`);
        return `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:3px;">` +
          `<span style="color:#888;min-width:56px;">Modèle ${i + 1}</span>` +
          `<select data-i="${i}" data-f="modele">${TYPES.map(([v, n]) => `<option value="${v}"${v === s.modele ? ' selected' : ''}>${n}</option>`).join('')}</select>` +
          params +
          (this.structures.length > 1 ? `<button class="js-dels sy-mini" data-i="${i}" type="button" style="background:#c44;padding:1px 5px;">×</button>` : '') +
          `</div>`;
      }).join('') + `</div>`;
    const upd = debounce(() => this.resoudre(), 120);
    t.querySelectorAll('input,select').forEach(inp => this.on(inp, 'input', e => {
      const f = e.target.dataset.f, i = +e.target.dataset.i;
      if (f === 'modele') { this.structures[i].modele = e.target.value; this.renderStructs(); this.resoudre(); }
      else { this.structures[i][f] = parseFloat(e.target.value) || 0; upd(); }
    }));
    t.querySelectorAll('.js-dels').forEach(b => this.on(b, 'click', e => { this.structures.splice(+e.target.dataset.i, 1); this.renderStructs(); this.resoudre(); }));
  }

  _structsLib() {
    return this.structures.filter(s => s.modele !== 'pepite').map(s => this.dim === 2
      ? { modele: s.modele, palier: s.palier, portee: [s.ag, s.ap], angle: s.theta }
      : { modele: s.modele, palier: s.palier, portee: s.ag });
  }
  _c0() { return this.structures.filter(s => s.modele === 'pepite').reduce((a, s) => a + (s.palier || 0), 0); }

  async resoudre() {
    const c0 = this._c0();
    const m = parseFloat(this.mEl.value) || 0;
    const dons = this.donnees;
    const coords = dons.map(d => this.dim === 2 ? [d.x, d.y] : [d.x]);
    const zd = dons.map(d => d.z);
    const cible = this.dim === 2 ? [[this.cible.x, this.cible.y]] : [[this.cible.x]];

    const structsLib = this._structsLib();
    let r;
    try { r = await gpoly.systemeKrigeage(coords, zd, cible, structsLib, c0, this.type, m); }
    catch (e) { this.afficherAvertissement('Erreur : ' + e.message); return; }
    const n = r.n_donnees;

    // Réordonner A/b/λ (proximité → saisie) via distances_cible.
    const posDe = new Array(n);
    [...Array(n).keys()].sort((a, b) => r.distances_cible[a] - r.distances_cible[b]).forEach((idx, k) => { posDe[idx] = k; });
    const remapVec = v => { const o = v.slice(); for (let i = 0; i < n; i++) o[i] = v[posDe[i]]; return o; };
    const remapA = M => { const nA = M.length, o = M.map(r2 => r2.slice()); for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) o[i][j] = M[posDe[i]][posDe[j]]; for (let i = 0; i < n; i++) for (let j = n; j < nA; j++) { o[i][j] = M[posDe[i]][j]; o[j][i] = M[j][posDe[i]]; } return o; };
    const A = remapA(r.matrice_A), b = remapVec(r.vecteur_b), lam = remapVec(r.lambda.slice(0, n));

    // ---- Solution (toujours) ----
    const z_star = r.estimations[0], sigma2 = Math.max(0, r.variances[0]);
    const mu = (this.type === 'ordinaire' && r.mu.length) ? r.mu[0] : null;
    const poids = lam.map((l, i) => `<span style="display:inline-block;margin:2px 8px;">λ<sub>${i + 1}</sub> = <b>${l.toFixed(4)}</b></span>`).join('');
    this.solEl.innerHTML =
      `<div style="font-weight:700;color:#555;font-size:.76rem;text-transform:uppercase;margin-bottom:4px;">Solution</div>` +
      `<div style="font-family:'JetBrains Mono',monospace;font-size:.84rem;">${poids}` +
      (mu != null ? `<span style="display:inline-block;margin:2px 8px;">μ = <b>${mu.toFixed(4)}</b></span>` : '') + `</div>` +
      `<div style="display:flex;gap:24px;justify-content:center;margin-top:8px;flex-wrap:wrap;">` +
      `<span style="font-size:1.05rem;">Estimation &nbsp;Z*(x₀) = <b style="color:#0d4d92;font-family:'JetBrains Mono',monospace;">${z_star.toFixed(4)}</b></span>` +
      `<span style="font-size:1.05rem;">Variance &nbsp;σ²<sub>K</sub> = <b style="color:#0d4d92;font-family:'JetBrains Mono',monospace;">${sigma2.toFixed(4)}</b></span></div>`;

    // ---- Détail (sur demande) : distances, covariances, système A·λ=b ----
    if (this.showDetail) {
      const labD = Array.from({ length: n }, (_, i) => `x${i + 1}`);
      const labA = Array.from({ length: A.length }, (_, j) => j < n ? `x${j + 1}` : 'μ');
      // Système A·λ=b côte à côte.
      let sys = `<div style="font-weight:600;font-size:.78rem;margin:6px 0 2px;">3. Système de krigeage &nbsp;A·λ = b</div>`;
      sys += `<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;overflow-x:auto;">`;
      sys += `<table style="${MAT}">`;
      for (let i = 0; i < A.length; i++) { sys += '<tr>'; for (let j = 0; j < A.length; j++) sys += `<td style="${CELL}${i < n && j < n && i === j ? 'background:#eef2e8;' : (i >= n || j >= n ? 'background:#f3ecdc;' : '')}">${A[i][j].toFixed(2)}</td>`; sys += '</tr>'; }
      sys += `</table>`;
      sys += `<table style="${MAT}">` + Array.from({ length: A.length }, (_, i) => `<tr><td style="${CELL}background:#e8eef6;">${i < n ? 'λ' + (i + 1) : 'μ'}</td></tr>`).join('') + `</table>`;
      sys += `<span style="font-size:1.2rem;">=</span>`;
      sys += `<table style="${MAT}">` + b.map((v, i) => `<tr><td style="${CELL}">${(+v).toFixed(2)}${i >= n ? ' (Σλ)' : ''}</td></tr>`).join('') + `</table>`;
      sys += `</div>`;

      // Vecteur k : données ↔ cible x₀ (distance ET covariance) = le RHS du système.
      let kTab = `<div style="font-weight:600;font-size:.78rem;margin:6px 0 2px;">Données ↔ cible x₀ &nbsp;(distance puis covariance = vecteur k)</div>`;
      kTab += `<table style="${MAT}"><tr><th style="${HCELL}"></th><th style="${HCELL}">d(xᵢ, x₀)</th><th style="${HCELL}">C(xᵢ, x₀)</th></tr>`;
      for (let i = 0; i < n; i++) kTab += `<tr><th style="${HCELL}">x${i + 1}</th><td style="${CELL}">${r.distances_cible[i].toFixed(2)}</td><td style="${CELL}background:#eaf1f8;">${(+b[i]).toFixed(2)}</td></tr>`;
      kTab += `</table>`;

      this.detailEl.innerHTML =
        `<div style="padding:8px 12px;background:#f8f7f4;border:1px solid #d4d0c8;border-radius:6px;overflow-x:auto;">` +
        matTable('1. Matrice des distances entre données ‖xᵢ − xⱼ‖', r.distances_paires, labD, labD, true) +
        matTable('2. Matrice de covariance C(xᵢ, xⱼ)', A.slice(0, n).map(r2 => r2.slice(0, n)), labD, labD, true) +
        kTab +
        sys + `</div>`;
    } else {
      this.detailEl.innerHTML = '';
    }

    await this._dessinerPlot(coords, zd, structsLib, c0);
  }

  async _krige(coords, zd, cibles, structs, c0) {
    return this.type === 'simple'
      ? gpoly.krigeageSimple(coords, zd, cibles, structs, c0, parseFloat(this.mEl.value) || 0)
      : gpoly.krigeageOrdinaire(coords, zd, cibles, structs, c0);
  }

  async _dessinerPlot(coords, zd, structs, c0) {
    if (!window.Plotly || !coords.length) return;
    const COMMON = { displaylogo: false, responsive: true };

    if (this.dim === 1) {
      const xs = coords.map(c => c[0]), allx = [...xs, this.cible.x];
      const lo = Math.min(...allx) - 5, hi = Math.max(...allx) + 5, N = 80;
      const grid = []; for (let i = 0; i <= N; i++) grid.push([lo + (hi - lo) * i / N]);
      let rg, rc;
      try { rg = await this._krige(coords, zd, grid, structs, c0); rc = await this._krige(coords, zd, [[this.cible.x]], structs, c0); }
      catch (e) { return; }
      const gx = grid.map(g => g[0]);
      const up = rg.estimations.map((z, i) => z + 2 * Math.sqrt(Math.max(0, rg.variances[i])));
      const lw = rg.estimations.map((z, i) => z - 2 * Math.sqrt(Math.max(0, rg.variances[i])));
      Plotly.react(this.plotEl, [
        { x: gx, y: up, mode: 'lines', line: { width: 0 }, showlegend: false, hoverinfo: 'skip' },
        { x: gx, y: lw, mode: 'lines', line: { width: 0 }, fill: 'tonexty', fillcolor: 'rgba(13,77,146,0.12)', name: '±2σ', hoverinfo: 'skip' },
        { x: gx, y: rg.estimations, mode: 'lines', name: 'Z*(x)', line: { color: '#0d4d92', width: 2.5 } },
        { x: xs, y: zd, mode: 'markers', name: 'Données', marker: { color: '#222', size: 9, line: { color: '#fff', width: 1.5 } } },
        { x: [this.cible.x], y: [rc.estimations[0]], mode: 'markers', marker: { color: '#c44', size: 12, symbol: 'diamond' }, name: 'Z*(x₀)' },
      ], { margin: { t: 24, l: 40, r: 10, b: 40 }, title: { text: 'Profil 1D + krigeage', font: { size: 12 } }, xaxis: { title: 'x' }, yaxis: { title: 'Z' }, legend: { orientation: 'h', y: -0.25, x: 0.5, xanchor: 'center', font: { size: 9 } } }, COMMON);
    } else {
      const xs = coords.map(c => c[0]), ys = coords.map(c => c[1]);
      const allx = [...xs, this.cible.x], ally = [...ys, this.cible.y];
      const x0 = Math.min(...allx) - 5, x1 = Math.max(...allx) + 5, y0 = Math.min(...ally) - 5, y1 = Math.max(...ally) + 5, N = 24;
      const cibles = []; for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) cibles.push([x0 + (x1 - x0) * i / (N - 1), y0 + (y1 - y0) * j / (N - 1)]);
      let rg; try { rg = await this._krige(coords, zd, cibles, structs, c0); } catch (e) { return; }
      const Z = []; for (let j = 0; j < N; j++) { const row = []; for (let i = 0; i < N; i++) row.push(rg.estimations[j * N + i]); Z.push(row); }
      const gx = Array.from({ length: N }, (_, i) => x0 + (x1 - x0) * i / (N - 1));
      const gy = Array.from({ length: N }, (_, j) => y0 + (y1 - y0) * j / (N - 1));
      const zmin = Math.min(...zd), zmax = Math.max(...zd);
      Plotly.react(this.plotEl, [
        { type: 'heatmap', z: Z, x: gx, y: gy, colorscale: 'Viridis', zmin, zmax, colorbar: { thickness: 10, len: 0.85, title: { text: 'Z*', font: { size: 9 } } } },
        { x: xs, y: ys, mode: 'markers', marker: { color: zd, colorscale: 'Viridis', cmin: zmin, cmax: zmax, size: 12, line: { color: '#fff', width: 1.5 } }, name: 'Données', hoverinfo: 'skip' },
        { x: [this.cible.x], y: [this.cible.y], mode: 'markers', marker: { color: '#c44', size: 14, symbol: 'x', line: { width: 2 } }, name: 'cible x₀' },
      ], { margin: { t: 24, l: 36, r: 10, b: 30 }, title: { text: 'Vue spatiale 2D (Z* krigé)', font: { size: 12 } }, xaxis: { title: 'x', scaleanchor: 'y', constrain: 'domain' }, yaxis: { title: 'y', constrain: 'domain' }, showlegend: false }, COMMON);
    }
  }

  cleanup() { if (this.plotEl && window.Plotly) Plotly.purge(this.plotEl); }
}

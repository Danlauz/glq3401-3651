// scripts/geostat-js/widgets/c10_cokri_base.js
// -----------------------------------------------------------------------------
// Socle commun des ateliers de cokrigeage CS / CO / CU (chap. 10).
//
// Calqué sur KS/KO/KU mais à DEUX variables, avec DEUX AXES verticaux :
//   - axe de gauche : Z (variable principale, rare) — estimée par cokrigeage ;
//   - axe de droite : Y (variable secondaire, dense, corrélée).
// Les deux axes ont des échelles propres : les variances des deux variables
// sont différentes. On superpose le krigeage de Z SEUL pour voir l'apport de Y.
//
// makeCokri(TYPE) renvoie la classe widget. TYPE ∈ {'CS','CO','CU'}.
// Calcul : gpoly.cokrigeage{Simple,Ordinaire,Universel} + gpoly.krigeageOrdinaire.
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

const COL = { ck: '#0d4d92', k1: '#1f8a4c', z: '#16314f', y: '#c98a2b', yEst: '#e0a85a', cible: '#c0392b' };
const debounce = (fn, ms = 200) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const TITRE = { CS: 'Cokrigeage simple (CS)', CO: 'Cokrigeage ordinaire (CO)', CU: 'Cokrigeage universel (CU)' };

// Latent commun -> Z et Y corrélées, à des ÉCHELLES différentes (variances ≠).
// Z (principale) est rare (4 pts) ; Y (secondaire) est dense (14 pts).
function donneesInit() {
  const L = x => 1.8 * Math.sin(2 * Math.PI * x / 64) + 0.9 * Math.cos(2 * Math.PI * x / 30);
  const xs = [5, 12, 20, 28, 36, 44, 52, 60, 68, 75, 82, 88, 94, 99];
  const zIdx = new Set([1, 4, 9, 12]);   // Z connu en x = 12, 36, 75, 94 (grand trou 36→75)
  return xs.map((x, i) => ({
    x,
    y: +(22 + 4 * L(x)).toFixed(2),                       // Y ~ 14..30 (dense)
    z: zIdx.has(i) ? +(5.6 + 1.25 * L(x)).toFixed(2) : null,  // Z ~ 3..8 (rare)
  }));
}

export function makeCokri(TYPE) {
  return class extends Widget {
    render() {
      this.donnees = donneesInit();
      this.showK1 = true;
      const id = this.el.id;
      this.el.insertAdjacentHTML('beforeend', `
        <style>
          .ck-row label { display:inline-flex !important; flex-direction:row !important; align-items:center; gap:5px; }
          .ck-row label span { display:inline; }
          #${id} .ck-grp { display:flex;flex-wrap:wrap;gap:12px;align-items:center;padding:6px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;margin-bottom:6px; }
          #${id} .ck-grp input[type=number]{width:54px;padding:1px 4px;border:1px solid #c7ccd1;border-radius:4px;}
          #${id} .ck-mat{border-collapse:collapse;font-size:.78rem;}
          #${id} .ck-mat th{font-size:.7rem;color:#888;font-weight:600;padding:0 3px;}
          #${id} .ck-mat input{width:54px;text-align:right;padding:2px 4px;border:1px solid #c7ccd1;border-radius:4px;}
          #${id} .ck-mat .mirror{background:#eef1f4;color:#555;}
        </style>
        <div class="ck-grp ck-row">
          <b style="font-size:.8rem;color:#333;">${TITRE[TYPE]}</b>
          <label>Modèle <select class="js-mod">
            <option value="spherique">Sphérique</option>
            <option value="exponentiel">Exponentiel</option>
            <option value="gaussien">Gaussien</option>
          </select></label>
          <label>Portée a <input type="number" class="js-a" value="28" step="1"></label>
          ${TYPE === 'CU' ? `<label>Dérive <select class="js-ordre"><option value="1">Ordre 1</option><option value="2">Ordre 2</option></select></label>` : ''}
        </div>
        <div class="ck-grp ck-row">
          <b style="font-size:.78rem;color:#555;">Matrice B (LMC)</b>
          <table class="ck-mat">
            <tr><th></th><th>Z</th><th>Y</th></tr>
            <tr><th>Z</th>
              <td><input type="number" title="B_ZZ" class="js-b11" value="1" step="0.1"></td>
              <td><input type="number" title="B_ZY" class="js-b12" value="3.4" step="0.1"></td></tr>
            <tr><th>Y</th>
              <td><input type="number" title="B_YZ = B_ZY" class="js-b21 mirror" value="3.4" step="0.1"></td>
              <td><input type="number" title="B_YY" class="js-b22" value="16" step="0.5"></td></tr>
          </table>
          <label>pépite <input type="number" class="js-c0" value="0.05" step="0.05"></label>
          <span class="js-rho" style="font-size:.78rem;color:#666;"></span>
        </div>
        ${TYPE === 'CS' ? `<div class="ck-grp ck-row">
          <b style="font-size:.78rem;color:#555;">Moyennes connues</b>
          <label>m<sub>Z</sub> <input type="number" class="js-m1" value="5.5" step="0.1"></label>
          <label>m<sub>Y</sub> <input type="number" class="js-m2" value="22" step="0.5"></label>
        </div>` : ''}
        <div class="ck-grp ck-row">
          <label>Cible x₀ <input type="range" class="js-x0" min="0" max="100" value="60" step="0.5" style="width:170px"><span class="js-x0v">60</span></label>
          <button class="js-k1" type="button" style="font-size:.78rem;padding:4px 10px;background:#3a3632;color:#fff;border:none;border-radius:5px;cursor:pointer;">Masquer krigeage Z seul</button>
          <button class="js-reset" type="button" style="font-size:.76rem;padding:4px 9px;background:#3a3632;color:#fff;border:none;border-radius:4px;cursor:pointer;">Réinitialiser</button>
        </div>
        <div class="js-plot" style="height:360px;"></div>
        <div class="js-info" style="padding:.4rem 1rem;font-family:'JetBrains Mono',monospace;font-size:.82rem;color:#444;text-align:center;background:#f0f0f0;border-radius:6px;margin-top:4px;">—</div>
        <p style="margin:4px 1rem;font-size:11px;color:#666;">
          Axe de gauche : Z (principale, rare). Axe de droite : Y (secondaire, dense) — échelles différentes car les variances diffèrent. Là où Z manque, le cokrigeage emprunte l'information de Y via b<sub>ZY</sub> ; le krigeage de Z seul revient vers sa moyenne.</p>
      `);

      this.plot = this.el.querySelector('.js-plot');
      this.infoEl = this.el.querySelector('.js-info');
      this.ctrl = {
        mod: this.el.querySelector('.js-mod'), a: this.el.querySelector('.js-a'),
        b11: this.el.querySelector('.js-b11'), b22: this.el.querySelector('.js-b22'),
        b12: this.el.querySelector('.js-b12'), c0: this.el.querySelector('.js-c0'),
        x0: this.el.querySelector('.js-x0'),
        ordre: this.el.querySelector('.js-ordre'),
        m1: this.el.querySelector('.js-m1'), m2: this.el.querySelector('.js-m2'),
      };
      const update = debounce(() => this.refresh(), 200);
      for (const [k, el] of Object.entries(this.ctrl)) {
        if (!el) continue;
        this.on(el, 'input', e => { if (k === 'x0') this.el.querySelector('.js-x0v').textContent = e.target.value; });
        this.on(el, 'input', update); this.on(el, 'change', update);
      }
      // Symétrie B_ZY = B_YZ : la cellule miroir suit l'autre.
      const b12El = this.el.querySelector('.js-b12'), b21El = this.el.querySelector('.js-b21');
      this.on(b12El, 'input', () => { b21El.value = b12El.value; });
      this.on(b21El, 'input', () => { b12El.value = b21El.value; update(); });
      this.on(this.el.querySelector('.js-k1'), 'click', e => {
        this.showK1 = !this.showK1;
        e.target.textContent = this.showK1 ? 'Masquer krigeage Z seul' : 'Afficher krigeage Z seul';
        this.refresh();
      });
      this.on(this.el.querySelector('.js-reset'), 'click', () => { this.donnees = donneesInit(); this.refresh(); });
      afficherChargementJusquaPret(this.el).then(() => this.refresh());
    }

    async refresh() {
      const mod = this.ctrl.mod.value;
      const a = Math.max(1, parseFloat(this.ctrl.a.value) || 1);
      const b11 = Math.max(1e-3, parseFloat(this.ctrl.b11.value) || 0);
      const b22 = Math.max(1e-3, parseFloat(this.ctrl.b22.value) || 0);
      let b12 = parseFloat(this.ctrl.b12.value) || 0;
      const c0 = Math.max(0, parseFloat(this.ctrl.c0.value) || 0);
      const x0 = parseFloat(this.ctrl.x0.value);
      const bmax = Math.sqrt(b11 * b22) * 0.999;
      let psdOk = true;
      if (Math.abs(b12) > bmax) { b12 = Math.sign(b12) * bmax; psdOk = false; }
      const rho = b12 / Math.sqrt(b11 * b22);
      this.el.querySelector('.js-rho').innerHTML = `ρ = <b>${rho.toFixed(2)}</b>${psdOk ? '' : ' (borné : B doit être SDP)'}`;

      const structs = [{ modele: mod, portee: a, palier_matrix: [[b11, b12], [b12, b22]] }];
      const nugget = c0 > 0 ? [[c0, 0], [0, c0]] : null;

      const dons = this.donnees.slice().sort((p, q) => p.x - q.x);
      this.donnees = dons;
      const coords = dons.map(d => [d.x]);
      const zArr = dons.map(d => (d.z == null ? NaN : d.z));
      const yArr = dons.map(d => d.y);
      const zPts = dons.filter(d => d.z != null);

      const x_grid = []; for (let i = 0; i <= 400; i++) x_grid.push(i / 4);
      const cg = x_grid.map(x => [x]);

      let zG = null, zVar = null, yG = null, zC = null, zCvar = null, k1G = null, k1C = null;
      try {
        let rg, rc;
        if (TYPE === 'CS') {
          const m = [parseFloat(this.ctrl.m1.value) || 0, parseFloat(this.ctrl.m2.value) || 0];
          rg = await gpoly.cokrigeageSimple(coords, [zArr, yArr], cg, structs, nugget, m);
          rc = await gpoly.cokrigeageSimple(coords, [zArr, yArr], [[x0]], structs, nugget, m);
        } else if (TYPE === 'CO') {
          rg = await gpoly.cokrigeageOrdinaire(coords, [zArr, yArr], cg, structs, nugget);
          rc = await gpoly.cokrigeageOrdinaire(coords, [zArr, yArr], [[x0]], structs, nugget);
        } else {
          const ordre = parseInt(this.ctrl.ordre.value, 10) || 1;
          rg = await gpoly.cokrigeageUniversel(coords, [zArr, yArr], cg, structs, nugget, ordre);
          rc = await gpoly.cokrigeageUniversel(coords, [zArr, yArr], [[x0]], structs, nugget, ordre);
        }
        zG = rg.estimations.map(e => e[0]); zVar = rg.variances.map(e => e[0]);
        yG = rg.estimations.map(e => e[1]);
        zC = rc.estimations[0][0]; zCvar = rc.variances[0][0];
        if (this.showK1 && zPts.length >= 1) {
          const x1 = zPts.map(d => [d.x]), v1 = zPts.map(d => d.z);
          const st1 = [{ modele: mod, palier: b11, portee: a }];
          k1G = (await gpoly.krigeageOrdinaire(x1, v1, cg, st1, c0)).estimations;
          k1C = (await gpoly.krigeageOrdinaire(x1, v1, [[x0]], st1, c0)).estimations[0];
        }
      } catch (e) { this.afficherAvertissement('Erreur cokrigeage : ' + e.message); return; }

      if (!window.Plotly) { this.afficherAvertissement('Plotly non chargé.'); return; }
      const rng = (arr, pad = 0.06) => { const lo = Math.min(...arr), hi = Math.max(...arr); const p = (hi - lo) * pad || 1; return [lo - p, hi + p]; };
      const zRange = rng([...zG, ...zPts.map(d => d.z), ...zG.map((z, i) => z - 2 * Math.sqrt(Math.max(0, zVar[i]))), ...zG.map((z, i) => z + 2 * Math.sqrt(Math.max(0, zVar[i])))]);
      const yRange = rng([...yArr, ...yG]);

      const traces = [];
      const up = zG.map((z, i) => z + 2 * Math.sqrt(Math.max(0, zVar[i])));
      const lo = zG.map((z, i) => z - 2 * Math.sqrt(Math.max(0, zVar[i])));
      traces.push(
        { x: x_grid, y: up, mode: 'lines', line: { color: COL.ck, width: 0 }, showlegend: false, hoverinfo: 'skip' },
        { x: x_grid, y: lo, mode: 'lines', line: { color: COL.ck, width: 0 }, fill: 'tonexty', fillcolor: 'rgba(13,77,146,0.12)', name: 'Bande ±2σ (Z)', hoverinfo: 'skip' },
        { x: x_grid, y: zG, mode: 'lines', name: `Z* (${TYPE})`, line: { color: COL.ck, width: 2.5 } },
      );
      if (this.showK1 && k1G) traces.push({ x: x_grid, y: k1G, mode: 'lines', name: 'Z* (krigeage de Z seul)', line: { color: COL.k1, width: 2, dash: 'dot' } });
      // Variable secondaire Y -> axe de droite
      traces.push(
        { x: x_grid, y: yG, mode: 'lines', name: 'Y* (cokrigé)', yaxis: 'y2', line: { color: COL.yEst, width: 1.5, dash: 'dashdot' }, hoverinfo: 'skip' },
        { x: dons.map(d => d.x), y: yArr, mode: 'markers', name: 'Y (secondaire)', yaxis: 'y2', marker: { color: COL.y, size: 7, symbol: 'square', opacity: 0.85 }, hoverinfo: 'skip' },
        { x: zPts.map(d => d.x), y: zPts.map(d => d.z), mode: 'markers', name: 'Z (principale)', marker: { color: COL.z, size: 11, line: { color: '#fff', width: 2 } }, hoverinfo: 'skip' },
      );
      traces.push({ x: [x0], y: [zC], mode: 'markers', marker: { color: COL.cible, size: 12, symbol: 'diamond' }, name: `Z*=${zC.toFixed(2)}` });

      Plotly.react(this.plot, traces, {
        margin: { t: 26, l: 50, r: 52, b: 60 },
        xaxis: { title: { text: 'x', standoff: 4 }, range: [0, 100], automargin: true },
        yaxis: { title: { text: 'Z (principale)', font: { color: COL.ck } }, range: zRange, tickfont: { color: COL.ck }, zeroline: false },
        yaxis2: { title: { text: 'Y (secondaire)', font: { color: COL.y } }, range: yRange, tickfont: { color: COL.y }, overlaying: 'y', side: 'right', zeroline: false, showgrid: false },
        shapes: [{ type: 'line', xref: 'x', yref: 'paper', x0: x0, x1: x0, y0: 0, y1: 1, line: { color: COL.cible, dash: 'dot', width: 1.5 } }],
        legend: { orientation: 'h', y: -0.22, x: 0.5, xanchor: 'center', font: { size: 9 } },
      }, { displaylogo: false, responsive: true, displayModeBar: false });

      let html = `ρ(Z,Y) = <b>${rho.toFixed(2)}</b> · Z*<sub>${TYPE}</sub>(${x0.toFixed(1)}) = <b>${zC.toFixed(3)}</b> · σ²<sub>${TYPE}</sub> = <b>${zCvar.toFixed(4)}</b>`;
      if (this.showK1 && k1C != null) html += ` &nbsp;|&nbsp; <span style="color:${COL.k1}">Z seul = <b>${k1C.toFixed(3)}</b></span>`;
      this.infoEl.innerHTML = html;
    }

    cleanup() { if (this.plot && window.Plotly) Plotly.purge(this.plot); }
  };
}

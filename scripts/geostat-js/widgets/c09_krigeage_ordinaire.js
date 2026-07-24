// scripts/geostat-js/widgets/c09_krigeage_ordinaire.js
// -----------------------------------------------------------------------------
// Widget C09.2 — Krigeage ordinaire (KO).
//
// Pédagogie : KO suppose la moyenne m INCONNUE. L'estimateur est
// Z* = Σ λ_i Z_i avec la contrainte Σ λ_i = 1 (multiplicateur de Lagrange μ).
//   - Loin des données, KO ne retourne PAS vers une moyenne fixe (m inconnue) :
//     il reste piloté par les données via la contrainte.
//   - σ²_KO ≥ σ²_KS pour une même configuration (le KO « paie » l'estimation
//     implicite de la moyenne).
//
// Bouton « Afficher KS » : superpose la courbe du krigeage simple (qui, lui,
// utilise la moyenne m du curseur) pour comparer les deux estimateurs.
//
// Interaction : cliquer le graphe AJOUTE une donnée (cliquer une donnée la
// retire). « Afficher les poids » annote chaque donnée de son λ_i (effet d'écran).
//
// Calcul : gpoly.krigeageOrdinaire (cokri itype=2) et gpoly.krigeageSimple (itype=1).
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

const COL = { ko: '#0d4d92', ks: '#ea8f1e', donnee: '#222', moyenne: '#999', pos: '#0d4d92', neg: '#c0392b' };
const debounce = (fn, ms = 200) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

const DONNEES_INIT = [
  { x: 10, z: 4 }, { x: 25, z: 7 }, { x: 38, z: 5 },
  { x: 60, z: 8 }, { x: 78, z: 3 }, { x: 88, z: 6 },
];

export default class C09KrigeageOrdinaire extends Widget {
  render() {
    this.donnees = DONNEES_INIT.map(d => ({ ...d }));
    this.showWeights = false;
    this.showKS = false;
    this.clickBound = false;
    this.el.insertAdjacentHTML('beforeend', `
      <style>
        .ko-row label { display:inline-flex !important; flex-direction:row !important; align-items:center; gap:5px; }
        .ko-row label span { display:inline; }
      </style>
      <div class="gw-controls ko-row" style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;padding:6px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;margin-bottom:6px;">
        <label>Modèle <select class="js-mod">
          <option value="spherique">Sphérique</option>
          <option value="exponentiel">Exponentiel</option>
          <option value="gaussien">Gaussien</option>
        </select></label>
      </div>
      <div class="gw-controls ko-row" style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;padding:6px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;margin-bottom:6px;">
        <label>Moyenne m <input type="range" class="js-m" min="0" max="10" value="5" step="0.1" style="width:100px"><span class="js-mv">5.0</span></label>
        <label>Portée a <input type="range" class="js-a" min="5" max="50" value="20" step="1" style="width:100px"><span class="js-av">20</span></label>
      </div>
      <div class="gw-controls ko-row" style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;padding:6px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;margin-bottom:6px;">
        <label>Pépite <span>c<sub>0</sub></span> <input type="range" class="js-c0" min="0" max="1" value="0" step="0.05" style="width:100px"><span class="js-c0v">0.00</span></label>
        <label>Palier <span>c<sub>1</sub></span> <input type="range" class="js-C" min="0.2" max="4" value="1" step="0.2" style="width:100px"><span class="js-Cv">1.0</span></label>
      </div>
      <div class="gw-controls ko-row" style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;padding:6px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;margin-bottom:6px;">
        <label>Cible x₀ <input type="range" class="js-x0" min="0" max="100" value="40" step="0.5" style="width:180px"><span class="js-x0v">40</span></label>
        <button class="js-ks" type="button" style="font-size:.78rem;padding:4px 10px;background:#ea8f1e;color:#fff;border:none;border-radius:5px;cursor:pointer;">Afficher KS</button>
        <button class="js-poids" type="button" style="font-size:.78rem;padding:4px 10px;background:#0d4d92;color:#fff;border:none;border-radius:5px;cursor:pointer;">Afficher les poids</button>
        <button class="js-effacer" type="button" style="font-size:.76rem;padding:4px 9px;background:#c0392b;color:#fff;border:none;border-radius:4px;cursor:pointer;">Tout effacer</button>
        <button class="js-reset" type="button" style="font-size:.76rem;padding:4px 9px;background:#3a3632;color:#fff;border:none;border-radius:4px;cursor:pointer;">Réinitialiser</button>
      </div>
      <div class="js-plot" style="height:340px;cursor:crosshair;"></div>
      <div class="js-info" style="padding:.4rem 1rem;font-family:'JetBrains Mono',monospace;font-size:.82rem;color:#444;text-align:center;background:#f0f0f0;border-radius:6px;margin-top:4px;">—</div>
      <p style="margin:4px 1rem;font-size:11px;color:#666;">
        Cliquez le graphe pour <b>ajouter</b> une donnée · cliquez une donnée pour la <b>retirer</b>.
        Calcul : <code>kriging.cokriging.cokri</code> (itype=2 pour KO, itype=1 pour KS).</p>
    `);

    this.plot = this.el.querySelector('.js-plot');
    this.infoEl = this.el.querySelector('.js-info');
    this.ctrl = {
      m:  this.el.querySelector('.js-m'),
      mod: this.el.querySelector('.js-mod'),
      a:  this.el.querySelector('.js-a'),
      C:  this.el.querySelector('.js-C'),
      c0: this.el.querySelector('.js-c0'),
      x0: this.el.querySelector('.js-x0'),
    };
    const update = debounce(() => this.refresh(), 200);
    for (const [k, el] of Object.entries(this.ctrl)) {
      this.on(el, 'input', e => { const s = this.el.querySelector(`.js-${k}v`); if (s) s.textContent = e.target.value; });
      this.on(el, 'change', update);
      if (el.type === 'range') this.on(el, 'input', update);
    }
    this.on(this.el.querySelector('.js-ks'), 'click', e => {
      this.showKS = !this.showKS;
      e.target.textContent = this.showKS ? 'Masquer KS' : 'Afficher KS';
      e.target.style.background = this.showKS ? '#3a3632' : '#ea8f1e';
      this.refresh();
    });
    this.on(this.el.querySelector('.js-poids'), 'click', e => {
      this.showWeights = !this.showWeights;
      e.target.textContent = this.showWeights ? 'Masquer les poids' : 'Afficher les poids';
      e.target.style.background = this.showWeights ? '#c0392b' : '#0d4d92';
      this.refresh();
    });
    this.on(this.el.querySelector('.js-effacer'), 'click', () => { this.donnees = []; this.refresh(); });
    this.on(this.el.querySelector('.js-reset'), 'click', () => {
      this.donnees = DONNEES_INIT.map(d => ({ ...d })); this.refresh();
    });
    afficherChargementJusquaPret(this.el).then(() => this.refresh());
  }

  _onClick(e) {
    const fl = this.plot._fullLayout;
    if (!fl || !fl.xaxis || !fl.yaxis) return;
    const rect = this.plot.getBoundingClientRect();
    const xp = e.clientX - rect.left - fl.xaxis._offset;
    const yp = e.clientY - rect.top - fl.yaxis._offset;
    if (xp < 0 || xp > fl.xaxis._length || yp < 0 || yp > fl.yaxis._length) return;
    const x = fl.xaxis.p2d(xp), z = fl.yaxis.p2d(yp);
    if (x < 0 || x > 100 || z < 0 || z > 10) return;
    let best = -1, bd = 0.025;
    this.donnees.forEach((d, i) => { const dist = Math.hypot((d.x - x) / 100, (d.z - z) / 10); if (dist < bd) { bd = dist; best = i; } });
    if (best >= 0 && this.donnees.length > 1) this.donnees.splice(best, 1);
    else this.donnees.push({ x: Math.round(x * 2) / 2, z: Math.round(z * 10) / 10 });
    this.refresh();
  }

  async refresh() {
    const m  = parseFloat(this.ctrl.m.value);
    const mod = this.ctrl.mod.value;
    const a  = parseFloat(this.ctrl.a.value);
    const C  = parseFloat(this.ctrl.C.value);
    const c0 = parseFloat(this.ctrl.c0.value);
    const x0 = parseFloat(this.ctrl.x0.value);
    const structs = [{ modele: mod, palier: Math.max(0.001, C), portee: a }];

    const dons = this.donnees.slice().sort((p, q) => p.x - q.x);
    this.donnees = dons;
    const n = dons.length;
    const x_grid = []; for (let i = 0; i <= 1000; i++) x_grid.push(i / 10);
    const xd = dons.map(d => [d.x]), zd = dons.map(d => d.z);

    let estimGrid = null, varGrid = null, z_star = null, sigma2 = null, mu = null, lamByData = [], ksGrid = null, z_star_ks = null;
    if (n >= 1) {
      try {
        const rg = await gpoly.krigeageOrdinaire(xd, zd, x_grid.map(x => [x]), structs, c0);
        const rc = await gpoly.krigeageOrdinaire(xd, zd, [[x0]], structs, c0);
        estimGrid = rg.estimations; varGrid = rg.variances;
        z_star = rc.estimations[0]; sigma2 = rc.variances[0];
        mu = (rc.mu && rc.mu.length) ? rc.mu[0] : null;
        const ordre = [...Array(n).keys()].sort((i, j) => Math.abs(dons[i].x - x0) - Math.abs(dons[j].x - x0));
        lamByData = new Array(n).fill(0);
        rc.lambda.forEach((l, k) => { if (k < n) lamByData[ordre[k]] = l; });
        if (this.showKS) {
          const rks = await gpoly.krigeageSimple(xd, zd, x_grid.map(x => [x]), structs, c0, m);
          const rksc = await gpoly.krigeageSimple(xd, zd, [[x0]], structs, c0, m);
          ksGrid = rks.estimations; z_star_ks = rksc.estimations[0];
        }
      } catch (e) { this.afficherAvertissement('Erreur krigeage : ' + e.message); return; }
    }

    if (!window.Plotly) { this.afficherAvertissement('Plotly non chargé.'); return; }
    const traces = [];
    if (estimGrid) {
      const upper = estimGrid.map((z, i) => z + 2 * Math.sqrt(Math.max(0, varGrid[i])));
      const lower = estimGrid.map((z, i) => z - 2 * Math.sqrt(Math.max(0, varGrid[i])));
      traces.push(
        { x: x_grid, y: upper, mode: 'lines', line: { color: COL.ko, width: 0 }, showlegend: false, hoverinfo: 'skip' },
        { x: x_grid, y: lower, mode: 'lines', line: { color: COL.ko, width: 0 }, fill: 'tonexty', fillcolor: 'rgba(13,77,146,0.12)', name: 'Bande ±2σ<sub>KO</sub>', hoverinfo: 'skip' },
        { x: x_grid, y: estimGrid, mode: 'lines', name: 'Z*(x) (KO)', line: { color: COL.ko, width: 2.5 } },
      );
    }
    if (this.showKS && ksGrid) {
      traces.push({ x: x_grid, y: ksGrid, mode: 'lines', name: 'Z*(x) (KS)', line: { color: COL.ks, width: 2, dash: 'dot' } });
    }
    traces.push(
      { x: [0, 100], y: [m, m], mode: 'lines', line: { color: COL.moyenne, dash: 'dash', width: 1 }, name: `Moyenne m=${m.toFixed(1)} (KS)` },
      { x: dons.map(d => d.x), y: dons.map(d => d.z), mode: 'markers', name: 'Données', marker: { color: COL.donnee, size: 10, line: { color: '#fff', width: 2 } }, hoverinfo: 'skip' },
      { x: [x0, x0], y: [0, 10], mode: 'lines', line: { color: '#c44', dash: 'dot', width: 1.5 }, name: `x₀=${x0.toFixed(1)}` },
    );
    if (z_star != null) traces.push({ x: [x0], y: [z_star], mode: 'markers', marker: { color: '#c44', size: 12, symbol: 'diamond' }, name: `Z*(x₀)=${z_star.toFixed(3)}` });

    const annotations = (this.showWeights && estimGrid) ? dons.map((d, i) => ({
      x: d.x, y: d.z, text: `λ<sub>${i + 1}</sub>=${lamByData[i].toFixed(2)}`,
      showarrow: false, yshift: 16, font: { size: 10, color: lamByData[i] < -1e-3 ? COL.neg : COL.pos },
      bgcolor: 'rgba(255,255,255,0.8)',
    })) : [];

    Plotly.react(this.plot, traces, {
      margin: { t: 28, l: 50, r: 20, b: 60 },
      dragmode: false,
      xaxis: { title: { text: 'x', standoff: 4 }, range: [0, 100], fixedrange: true, automargin: true },
      yaxis: { title: 'Z', range: [0, 10], fixedrange: true },
      legend: { orientation: 'h', y: -0.26, x: 0.5, xanchor: 'center', font: { size: 10 } },
      annotations,
    }, { displaylogo: false, responsive: true, displayModeBar: false });

    if (!this.clickBound) { this.on(this.plot, 'click', e => this._onClick(e)); this.clickBound = true; }

    if (n === 0) {
      this.infoEl.innerHTML = `<b>Aucune donnée</b> — le krigeage ordinaire nécessite au moins une donnée (contrainte Σλ<sub>i</sub> = 1).`;
    } else {
      const sumL = lamByData.reduce((s, v) => s + v, 0);
      const lambdaStr = lamByData.map((l, i) => `λ<sub>${i + 1}</sub>=${l.toFixed(3)}`).join(' · ');
      let html = `Z*<sub>KO</sub>(${x0.toFixed(1)}) = <b>${z_star.toFixed(3)}</b> · σ²<sub>KO</sub> = <b>${sigma2.toFixed(4)}</b> · ` +
        `Σλ<sub>i</sub> = ${sumL.toFixed(3)}` + (mu != null ? ` · μ = ${mu.toFixed(4)}` : '');
      if (this.showKS && z_star_ks != null) html += ` &nbsp;|&nbsp; <span style="color:${COL.ks}">Z*<sub>KS</sub> = <b>${z_star_ks.toFixed(3)}</b></span>`;
      html += `<br><span style="font-size:.78rem">${lambdaStr}</span>`;
      this.infoEl.innerHTML = html;
    }
  }

  cleanup() { if (this.plot && window.Plotly) Plotly.purge(this.plot); }
}

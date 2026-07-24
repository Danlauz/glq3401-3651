// scripts/geostat-js/widgets/c09_krigeage_universel.js
// -----------------------------------------------------------------------------
// Widget C09.8 — Krigeage universel (KU).
//
// Pédagogie (calqué sur l'atelier KO) : le KU suppose une DÉRIVE (moyenne non
// stationnaire) = polynôme des coordonnées, m(x) = a₀ + a₁x (+ a₂x²). On voit :
//   - la courbe KU, qui suit et EXTRAPOLE la tendance au-delà des données ;
//   - en superposition, le KO (retour vers le niveau local) et le KS (retour
//     vers la moyenne fixe m) — pour comparer les trois estimateurs.
//
// Interaction : cliquer le graphe AJOUTE une donnée (cliquer une donnée la
// retire). « Afficher les poids » annote chaque donnée de son λ_i.
//
// Calcul : gpoly.krigeageUniversel (cokri itype=4 ordre 1 / itype=5 ordre 2),
// gpoly.krigeageOrdinaire (itype=2), gpoly.krigeageSimple (itype=1).
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

const COL = { ku: '#0d4d92', ko: '#1f8a4c', ks: '#ea8f1e', donnee: '#222', moyenne: '#999', pos: '#0d4d92', neg: '#c0392b' };
const debounce = (fn, ms = 200) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const YMAX = 13;

// Données avec une TENDANCE croissante (sinon KU ≈ KO).
const DONNEES_INIT = [
  { x: 8, z: 3.0 }, { x: 20, z: 4.0 }, { x: 33, z: 4.7 },
  { x: 46, z: 6.0 }, { x: 58, z: 6.6 }, { x: 70, z: 7.9 },
];

export default class C09KrigeageUniversel extends Widget {
  render() {
    this.donnees = DONNEES_INIT.map(d => ({ ...d }));
    this.showWeights = false;
    this.showKO = false;
    this.showKS = false;
    this.clickBound = false;
    this.el.insertAdjacentHTML('beforeend', `
      <style>
        .ku-row label { display:inline-flex !important; flex-direction:row !important; align-items:center; gap:5px; }
        .ku-row label span { display:inline; }
      </style>
      <div class="gw-controls ku-row" style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;padding:6px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;margin-bottom:6px;">
        <label>Modèle <select class="js-mod">
          <option value="spherique">Sphérique</option>
          <option value="exponentiel">Exponentiel</option>
          <option value="gaussien">Gaussien</option>
        </select></label>
        <label>Dérive <select class="js-ordre">
          <option value="1">Ordre 1 (linéaire)</option>
          <option value="2">Ordre 2 (quadratique)</option>
        </select></label>
      </div>
      <div class="gw-controls ku-row" style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;padding:6px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;margin-bottom:6px;">
        <label>Moyenne m (KS) <input type="range" class="js-m" min="0" max="12" value="5.5" step="0.1" style="width:90px"><span class="js-mv">5.5</span></label>
        <label>Portée a <input type="range" class="js-a" min="5" max="50" value="22" step="1" style="width:90px"><span class="js-av">22</span></label>
        <label>Pépite <span>c<sub>0</sub></span> <input type="range" class="js-c0" min="0" max="1" value="0" step="0.05" style="width:90px"><span class="js-c0v">0.00</span></label>
        <label>Palier <span>c<sub>1</sub></span> <input type="range" class="js-C" min="0.2" max="4" value="1" step="0.2" style="width:90px"><span class="js-Cv">1.0</span></label>
      </div>
      <div class="gw-controls ku-row" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:6px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;margin-bottom:6px;">
        <label>Cible x₀ <input type="range" class="js-x0" min="0" max="100" value="85" step="0.5" style="width:150px"><span class="js-x0v">85</span></label>
        <button class="js-ko" type="button" style="font-size:.78rem;padding:4px 10px;background:#1f8a4c;color:#fff;border:none;border-radius:5px;cursor:pointer;">Afficher KO</button>
        <button class="js-ks" type="button" style="font-size:.78rem;padding:4px 10px;background:#ea8f1e;color:#fff;border:none;border-radius:5px;cursor:pointer;">Afficher KS</button>
        <button class="js-poids" type="button" style="font-size:.78rem;padding:4px 10px;background:#0d4d92;color:#fff;border:none;border-radius:5px;cursor:pointer;">Afficher les poids</button>
        <button class="js-effacer" type="button" style="font-size:.76rem;padding:4px 9px;background:#c0392b;color:#fff;border:none;border-radius:4px;cursor:pointer;">Tout effacer</button>
        <button class="js-reset" type="button" style="font-size:.76rem;padding:4px 9px;background:#3a3632;color:#fff;border:none;border-radius:4px;cursor:pointer;">Réinitialiser</button>
      </div>
      <div class="js-plot" style="height:340px;cursor:crosshair;"></div>
      <div class="js-info" style="padding:.4rem 1rem;font-family:'JetBrains Mono',monospace;font-size:.82rem;color:#444;text-align:center;background:#f0f0f0;border-radius:6px;margin-top:4px;">—</div>
      <p style="margin:4px 1rem;font-size:11px;color:#666;">
        Cliquez le graphe pour <b>ajouter</b> une donnée · cliquez une donnée pour la <b>retirer</b>. Placez la cible x₀ au-delà des données pour voir le KU <b>extrapoler la tendance</b> (le KO revient au niveau local, le KS à m).</p>
    `);

    this.plot = this.el.querySelector('.js-plot');
    this.infoEl = this.el.querySelector('.js-info');
    this.ctrl = {
      m: this.el.querySelector('.js-m'), mod: this.el.querySelector('.js-mod'),
      ordre: this.el.querySelector('.js-ordre'), a: this.el.querySelector('.js-a'),
      C: this.el.querySelector('.js-C'), c0: this.el.querySelector('.js-c0'),
      x0: this.el.querySelector('.js-x0'),
    };
    const update = debounce(() => this.refresh(), 200);
    for (const [k, el] of Object.entries(this.ctrl)) {
      this.on(el, 'input', e => { const s = this.el.querySelector(`.js-${k}v`); if (s) s.textContent = e.target.value; });
      this.on(el, 'change', update);
      if (el.type === 'range') this.on(el, 'input', update);
    }
    const toggle = (sel, key, onTxt, offTxt, onBg, offBg) => this.on(this.el.querySelector(sel), 'click', e => {
      this[key] = !this[key];
      e.target.textContent = this[key] ? onTxt : offTxt;
      e.target.style.background = this[key] ? onBg : offBg;
      this.refresh();
    });
    toggle('.js-ko', 'showKO', 'Masquer KO', 'Afficher KO', '#3a3632', '#1f8a4c');
    toggle('.js-ks', 'showKS', 'Masquer KS', 'Afficher KS', '#3a3632', '#ea8f1e');
    toggle('.js-poids', 'showWeights', 'Masquer les poids', 'Afficher les poids', '#c0392b', '#0d4d92');
    this.on(this.el.querySelector('.js-effacer'), 'click', () => { this.donnees = []; this.refresh(); });
    this.on(this.el.querySelector('.js-reset'), 'click', () => { this.donnees = DONNEES_INIT.map(d => ({ ...d })); this.refresh(); });
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
    if (x < 0 || x > 100 || z < 0 || z > YMAX) return;
    let best = -1, bd = 0.025;
    this.donnees.forEach((d, i) => { const dist = Math.hypot((d.x - x) / 100, (d.z - z) / YMAX); if (dist < bd) { bd = dist; best = i; } });
    if (best >= 0 && this.donnees.length > 1) this.donnees.splice(best, 1);
    else this.donnees.push({ x: Math.round(x * 2) / 2, z: Math.round(z * 10) / 10 });
    this.refresh();
  }

  async refresh() {
    const m = parseFloat(this.ctrl.m.value), mod = this.ctrl.mod.value;
    const ordre = parseInt(this.ctrl.ordre.value, 10);
    const a = parseFloat(this.ctrl.a.value), C = parseFloat(this.ctrl.C.value);
    const c0 = parseFloat(this.ctrl.c0.value), x0 = parseFloat(this.ctrl.x0.value);
    const structs = [{ modele: mod, palier: Math.max(0.001, C), portee: a }];

    const dons = this.donnees.slice().sort((p, q) => p.x - q.x);
    this.donnees = dons;
    const n = dons.length;
    const x_grid = []; for (let i = 0; i <= 500; i++) x_grid.push(i / 5);
    const xd = dons.map(d => [d.x]), zd = dons.map(d => d.z);
    const cg = x_grid.map(x => [x]);

    let kuG = null, kuVar = null, zKU = null, sKU = null, lamByData = [];
    let koG = null, zKO = null, ksG = null, zKS = null;
    const nmin = ordre === 2 ? 3 : 2;
    if (n >= nmin) {
      try {
        const rg = await gpoly.krigeageUniversel(xd, zd, cg, structs, c0, ordre);
        const rc = await gpoly.krigeageUniversel(xd, zd, [[x0]], structs, c0, ordre);
        kuG = rg.estimations; kuVar = rg.variances;
        zKU = rc.estimations[0]; sKU = rc.variances[0];
        const ordreP = [...Array(n).keys()].sort((i, j) => Math.abs(dons[i].x - x0) - Math.abs(dons[j].x - x0));
        lamByData = new Array(n).fill(0);
        rc.lambda.forEach((l, k) => { if (k < n) lamByData[ordreP[k]] = l; });
        if (this.showKO) {
          koG = (await gpoly.krigeageOrdinaire(xd, zd, cg, structs, c0)).estimations;
          zKO = (await gpoly.krigeageOrdinaire(xd, zd, [[x0]], structs, c0)).estimations[0];
        }
        if (this.showKS) {
          ksG = (await gpoly.krigeageSimple(xd, zd, cg, structs, c0, m)).estimations;
          zKS = (await gpoly.krigeageSimple(xd, zd, [[x0]], structs, c0, m)).estimations[0];
        }
      } catch (e) { this.afficherAvertissement('Erreur krigeage : ' + e.message); return; }
    }

    if (!window.Plotly) { this.afficherAvertissement('Plotly non chargé.'); return; }
    const traces = [];
    if (kuG) {
      const upper = kuG.map((z, i) => z + 2 * Math.sqrt(Math.max(0, kuVar[i])));
      const lower = kuG.map((z, i) => z - 2 * Math.sqrt(Math.max(0, kuVar[i])));
      traces.push(
        { x: x_grid, y: upper, mode: 'lines', line: { color: COL.ku, width: 0 }, showlegend: false, hoverinfo: 'skip' },
        { x: x_grid, y: lower, mode: 'lines', line: { color: COL.ku, width: 0 }, fill: 'tonexty', fillcolor: 'rgba(13,77,146,0.12)', name: 'Bande ±2σ<sub>KU</sub>', hoverinfo: 'skip' },
        { x: x_grid, y: kuG, mode: 'lines', name: 'Z*(x) (KU)', line: { color: COL.ku, width: 2.5 } },
      );
    }
    if (this.showKO && koG) traces.push({ x: x_grid, y: koG, mode: 'lines', name: 'Z*(x) (KO)', line: { color: COL.ko, width: 2, dash: 'dot' } });
    if (this.showKS && ksG) {
      traces.push({ x: x_grid, y: ksG, mode: 'lines', name: 'Z*(x) (KS)', line: { color: COL.ks, width: 2, dash: 'dot' } });
      traces.push({ x: [0, 100], y: [m, m], mode: 'lines', line: { color: COL.moyenne, dash: 'dash', width: 1 }, name: `m=${m.toFixed(1)}`, hoverinfo: 'skip' });
    }
    traces.push(
      { x: dons.map(d => d.x), y: dons.map(d => d.z), mode: 'markers', name: 'Données', marker: { color: COL.donnee, size: 10, line: { color: '#fff', width: 2 } }, hoverinfo: 'skip' },
      { x: [x0, x0], y: [0, YMAX], mode: 'lines', line: { color: '#c44', dash: 'dot', width: 1.5 }, name: `x₀=${x0.toFixed(1)}` },
    );
    if (zKU != null) traces.push({ x: [x0], y: [zKU], mode: 'markers', marker: { color: '#c44', size: 12, symbol: 'diamond' }, name: `Z*<sub>KU</sub>=${zKU.toFixed(2)}` });

    const annotations = (this.showWeights && kuG) ? dons.map((d, i) => ({
      x: d.x, y: d.z, text: `λ<sub>${i + 1}</sub>=${lamByData[i].toFixed(2)}`,
      showarrow: false, yshift: 16, font: { size: 10, color: lamByData[i] < -1e-3 ? COL.neg : COL.pos },
      bgcolor: 'rgba(255,255,255,0.8)',
    })) : [];

    Plotly.react(this.plot, traces, {
      margin: { t: 28, l: 50, r: 20, b: 60 },
      dragmode: false,
      xaxis: { title: { text: 'x', standoff: 4 }, range: [0, 100], fixedrange: true, automargin: true },
      yaxis: { title: 'Z', range: [0, YMAX], fixedrange: true },
      legend: { orientation: 'h', y: -0.26, x: 0.5, xanchor: 'center', font: { size: 10 } },
      annotations,
    }, { displaylogo: false, responsive: true, displayModeBar: false });

    if (!this.clickBound) { this.on(this.plot, 'click', e => this._onClick(e)); this.clickBound = true; }

    if (n < nmin) {
      this.infoEl.innerHTML = `<b>Pas assez de données</b> — le KU d'ordre ${ordre} requiert au moins ${nmin} points (dérive ${ordre === 2 ? 'quadratique' : 'linéaire'}).`;
    } else {
      const lambdaStr = lamByData.map((l, i) => `λ<sub>${i + 1}</sub>=${l.toFixed(3)}`).join(' · ');
      let html = `Z*<sub>KU</sub>(${x0.toFixed(1)}) = <b>${zKU.toFixed(3)}</b> · σ²<sub>KU</sub> = <b>${sKU.toFixed(4)}</b> · dérive ordre ${ordre}`;
      if (this.showKO && zKO != null) html += ` &nbsp;|&nbsp; <span style="color:${COL.ko}">Z*<sub>KO</sub> = <b>${zKO.toFixed(3)}</b></span>`;
      if (this.showKS && zKS != null) html += ` &nbsp;|&nbsp; <span style="color:${COL.ks}">Z*<sub>KS</sub> = <b>${zKS.toFixed(3)}</b></span>`;
      html += `<br><span style="font-size:.78rem">${lambdaStr}</span>`;
      this.infoEl.innerHTML = html;
    }
  }

  cleanup() { if (this.plot && window.Plotly) Plotly.purge(this.plot); }
}

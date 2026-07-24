// scripts/geostat-js/widgets/c09_krigeage_derive_externe.js
// -----------------------------------------------------------------------------
// Widget C09.9 — Krigeage avec dérive externe (KED).
//
// Pédagogie (calqué sur KS/KO/KU) : une variable SECONDAIRE s(x), connue
// PARTOUT, sert de dérive : E[Z(x)] = a₀ + a₁ s(x). Le KED contraint les poids
// par Σλ_i = 1 ET Σλ_i s(x_i) = s(x₀). Là où les données manquent (trou central),
// le KED suit la forme de s(x) tandis que :
//   - le KO revient au niveau local (moyenne plate),
//   - le KS revient à la moyenne fixe m,
//   - le KU n'ajuste qu'un polynôme des coordonnées (sans la variable s).
//
// Calcul : gpoly.krigeageDeriveExterne (système KO + contrainte de dérive),
// gpoly.krigeageOrdinaire / krigeageSimple / krigeageUniversel.
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

const COL = { ked: '#0d4d92', ko: '#1f8a4c', ks: '#ea8f1e', ku: '#8e44ad', sec: '#b08968', donnee: '#222', moyenne: '#999' };
const debounce = (fn, ms = 200) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const YMAX = 12;

// Variable secondaire s(x) connue partout (forme non polynomiale).
const sFun = x => 6 + 2.4 * Math.sin(2 * Math.PI * x / 55) + 1.2 * Math.cos(2 * Math.PI * x / 23);

// Données : Z ≈ s(x) + petit résidu, avec un TROU central [54, 82] sans donnée.
const X_INIT = [6, 16, 27, 38, 50, 84, 93];
const NOISE = [0.4, -0.3, 0.25, -0.35, 0.2, 0.3, -0.25];
const donneesInit = () => X_INIT.map((x, i) => ({ x, z: Math.max(1, Math.min(YMAX - 1, sFun(x) + NOISE[i])) }));

export default class C09KrigeageDeriveExterne extends Widget {
  render() {
    this.donnees = donneesInit();
    this.showKO = false; this.showKS = false; this.showKU = false; this.showSec = true;
    this.clickBound = false;
    this.el.insertAdjacentHTML('beforeend', `
      <style>
        .ked-row label { display:inline-flex !important; flex-direction:row !important; align-items:center; gap:5px; }
        .ked-row label span { display:inline; }
      </style>
      <div class="gw-controls ked-row" style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;padding:6px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;margin-bottom:6px;">
        <label>Modèle du résidu <select class="js-mod">
          <option value="spherique">Sphérique</option>
          <option value="exponentiel">Exponentiel</option>
          <option value="gaussien">Gaussien</option>
        </select></label>
        <label>Moyenne m (KS) <input type="range" class="js-m" min="0" max="12" value="6" step="0.1" style="width:90px"><span class="js-mv">6.0</span></label>
        <label>Portée a <input type="range" class="js-a" min="5" max="50" value="18" step="1" style="width:90px"><span class="js-av">18</span></label>
        <label>Pépite <span>c<sub>0</sub></span> <input type="range" class="js-c0" min="0" max="1" value="0.1" step="0.05" style="width:80px"><span class="js-c0v">0.10</span></label>
        <label>Palier <span>c<sub>1</sub></span> <input type="range" class="js-C" min="0.2" max="4" value="1" step="0.2" style="width:80px"><span class="js-Cv">1.0</span></label>
      </div>
      <div class="gw-controls ked-row" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:6px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;margin-bottom:6px;">
        <label>Cible x₀ <input type="range" class="js-x0" min="0" max="100" value="68" step="0.5" style="width:140px"><span class="js-x0v">68</span></label>
        <button class="js-sec" type="button" style="font-size:.78rem;padding:4px 10px;background:#3a3632;color:#fff;border:none;border-radius:5px;cursor:pointer;">Masquer s(x)</button>
        <button class="js-ko" type="button" style="font-size:.78rem;padding:4px 10px;background:#1f8a4c;color:#fff;border:none;border-radius:5px;cursor:pointer;">Afficher KO</button>
        <button class="js-ks" type="button" style="font-size:.78rem;padding:4px 10px;background:#ea8f1e;color:#fff;border:none;border-radius:5px;cursor:pointer;">Afficher KS</button>
        <button class="js-ku" type="button" style="font-size:.78rem;padding:4px 10px;background:#8e44ad;color:#fff;border:none;border-radius:5px;cursor:pointer;">Afficher KU</button>
        <button class="js-reset" type="button" style="font-size:.76rem;padding:4px 9px;background:#c0392b;color:#fff;border:none;border-radius:4px;cursor:pointer;">Réinitialiser</button>
      </div>
      <div class="js-plot" style="height:350px;cursor:crosshair;"></div>
      <div class="js-info" style="padding:.4rem 1rem;font-family:'JetBrains Mono',monospace;font-size:.82rem;color:#444;text-align:center;background:#f0f0f0;border-radius:6px;margin-top:4px;">—</div>
      <p style="margin:4px 1rem;font-size:11px;color:#666;">
        Cliquez le graphe pour <b>ajouter</b> une donnée (s(x) y est connu) · cliquez une donnée pour la <b>retirer</b>. Dans le <b>trou central</b>, comparez : le KED suit s(x), le KO/KS s'aplatissent, le KU suit un polynôme.</p>
    `);

    this.plot = this.el.querySelector('.js-plot');
    this.infoEl = this.el.querySelector('.js-info');
    this.ctrl = {
      mod: this.el.querySelector('.js-mod'), m: this.el.querySelector('.js-m'),
      a: this.el.querySelector('.js-a'), C: this.el.querySelector('.js-C'),
      c0: this.el.querySelector('.js-c0'), x0: this.el.querySelector('.js-x0'),
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
    toggle('.js-ku', 'showKU', 'Masquer KU', 'Afficher KU', '#3a3632', '#8e44ad');
    toggle('.js-sec', 'showSec', 'Masquer s(x)', 'Afficher s(x)', '#1f6f6f', '#3a3632');
    this.on(this.el.querySelector('.js-reset'), 'click', () => { this.donnees = donneesInit(); this.refresh(); });
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
    if (best >= 0 && this.donnees.length > 2) this.donnees.splice(best, 1);
    else this.donnees.push({ x: Math.round(x * 2) / 2, z: Math.round(z * 10) / 10 });
    this.refresh();
  }

  async refresh() {
    const mod = this.ctrl.mod.value, m = parseFloat(this.ctrl.m.value);
    const a = parseFloat(this.ctrl.a.value), C = parseFloat(this.ctrl.C.value);
    const c0 = parseFloat(this.ctrl.c0.value), x0 = parseFloat(this.ctrl.x0.value);
    const structs = [{ modele: mod, palier: Math.max(0.001, C), portee: a }];

    const dons = this.donnees.slice().sort((p, q) => p.x - q.x);
    this.donnees = dons;
    const n = dons.length;
    const x_grid = []; for (let i = 0; i <= 500; i++) x_grid.push(i / 5);
    const xd = dons.map(d => [d.x]), zd = dons.map(d => d.z);
    const cg = x_grid.map(x => [x]);
    const sGrid = x_grid.map(sFun), sData = dons.map(d => sFun(d.x)), s0 = sFun(x0);

    let kedG = null, kedVar = null, zKED = null, sKED = null;
    let koG = null, zKO = null, ksG = null, zKS = null, kuG = null, zKU = null;
    if (n >= 2) {
      try {
        const rg = await gpoly.krigeageDeriveExterne(xd, zd, cg, sData, sGrid, structs, c0);
        const rc = await gpoly.krigeageDeriveExterne(xd, zd, [[x0]], sData, [s0], structs, c0);
        kedG = rg.estimations; kedVar = rg.variances;
        zKED = rc.estimations[0]; sKED = rc.variances[0];
        if (this.showKO) { koG = (await gpoly.krigeageOrdinaire(xd, zd, cg, structs, c0)).estimations; zKO = (await gpoly.krigeageOrdinaire(xd, zd, [[x0]], structs, c0)).estimations[0]; }
        if (this.showKS) { ksG = (await gpoly.krigeageSimple(xd, zd, cg, structs, c0, m)).estimations; zKS = (await gpoly.krigeageSimple(xd, zd, [[x0]], structs, c0, m)).estimations[0]; }
        if (this.showKU && n >= 2) { kuG = (await gpoly.krigeageUniversel(xd, zd, cg, structs, c0, 1)).estimations; zKU = (await gpoly.krigeageUniversel(xd, zd, [[x0]], structs, c0, 1)).estimations[0]; }
      } catch (e) { this.afficherAvertissement('Erreur krigeage : ' + e.message); return; }
    }

    if (!window.Plotly) { this.afficherAvertissement('Plotly non chargé.'); return; }
    const traces = [];
    if (this.showSec) traces.push({ x: x_grid, y: sGrid, mode: 'lines', name: 'Variable secondaire s(x)', line: { color: COL.sec, width: 1.5, dash: 'dash' }, hoverinfo: 'skip' });
    if (kedG) {
      const upper = kedG.map((z, i) => z + 2 * Math.sqrt(Math.max(0, kedVar[i])));
      const lower = kedG.map((z, i) => z - 2 * Math.sqrt(Math.max(0, kedVar[i])));
      traces.push(
        { x: x_grid, y: upper, mode: 'lines', line: { color: COL.ked, width: 0 }, showlegend: false, hoverinfo: 'skip' },
        { x: x_grid, y: lower, mode: 'lines', line: { color: COL.ked, width: 0 }, fill: 'tonexty', fillcolor: 'rgba(13,77,146,0.12)', name: 'Bande ±2σ<sub>KED</sub>', hoverinfo: 'skip' },
        { x: x_grid, y: kedG, mode: 'lines', name: 'Z*(x) (KED)', line: { color: COL.ked, width: 2.5 } },
      );
    }
    if (this.showKO && koG) traces.push({ x: x_grid, y: koG, mode: 'lines', name: 'Z*(x) (KO)', line: { color: COL.ko, width: 2, dash: 'dot' } });
    if (this.showKS && ksG) traces.push({ x: x_grid, y: ksG, mode: 'lines', name: 'Z*(x) (KS)', line: { color: COL.ks, width: 2, dash: 'dot' } });
    if (this.showKU && kuG) traces.push({ x: x_grid, y: kuG, mode: 'lines', name: 'Z*(x) (KU)', line: { color: COL.ku, width: 2, dash: 'dot' } });
    traces.push(
      { x: dons.map(d => d.x), y: dons.map(d => d.z), mode: 'markers', name: 'Données', marker: { color: COL.donnee, size: 10, line: { color: '#fff', width: 2 } }, hoverinfo: 'skip' },
      { x: [x0, x0], y: [0, YMAX], mode: 'lines', line: { color: '#c44', dash: 'dot', width: 1.5 }, name: `x₀=${x0.toFixed(1)}` },
    );
    if (zKED != null) traces.push({ x: [x0], y: [zKED], mode: 'markers', marker: { color: '#c44', size: 12, symbol: 'diamond' }, name: `Z*<sub>KED</sub>=${zKED.toFixed(2)}` });

    Plotly.react(this.plot, traces, {
      margin: { t: 28, l: 50, r: 20, b: 64 },
      dragmode: false,
      xaxis: { title: { text: 'x', standoff: 4 }, range: [0, 100], fixedrange: true, automargin: true },
      yaxis: { title: 'Z', range: [0, YMAX], fixedrange: true },
      legend: { orientation: 'h', y: -0.24, x: 0.5, xanchor: 'center', font: { size: 9.5 } },
    }, { displaylogo: false, responsive: true, displayModeBar: false });

    if (!this.clickBound) { this.on(this.plot, 'click', e => this._onClick(e)); this.clickBound = true; }

    if (n < 2) {
      this.infoEl.innerHTML = `<b>Pas assez de données</b> — le KED requiert au moins 2 points (contraintes Σλ=1 et Σλ·s = s(x₀)).`;
    } else {
      let html = `s(x₀) = <b>${s0.toFixed(2)}</b> · Z*<sub>KED</sub>(${x0.toFixed(1)}) = <b>${zKED.toFixed(3)}</b> · σ²<sub>KED</sub> = <b>${sKED.toFixed(4)}</b>`;
      if (this.showKO && zKO != null) html += ` &nbsp;|&nbsp; <span style="color:${COL.ko}">KO=${zKO.toFixed(2)}</span>`;
      if (this.showKS && zKS != null) html += ` &nbsp;|&nbsp; <span style="color:${COL.ks}">KS=${zKS.toFixed(2)}</span>`;
      if (this.showKU && zKU != null) html += ` &nbsp;|&nbsp; <span style="color:${COL.ku}">KU=${zKU.toFixed(2)}</span>`;
      this.infoEl.innerHTML = html;
    }
  }

  cleanup() { if (this.plot && window.Plotly) Plotly.purge(this.plot); }
}

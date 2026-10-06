// scripts/geostat-js/widgets/c04_deviations.js
// -----------------------------------------------------------------------------
// Widget « Trajectoire de forage » (C04) — calcul LIVE via Pyodide.
// Trajectoire = appel direct a geostat_polymtl.treatment.deviations.
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

const EX = [
  { md: 0,   azimut: 90,  plongee: 60 },
  { md: 50,  azimut: 95,  plongee: 55 },
  { md: 100, azimut: 105, plongee: 48 },
  { md: 150, azimut: 120, plongee: 40 },
  { md: 200, azimut: 130, plongee: 32 },
];
const debounce = (fn, ms = 200) => { let id; return (...a) => { clearTimeout(id); id = setTimeout(() => fn(...a), ms); }; };

export default class C04Deviations extends Widget {
  render() {
    this.mesures = EX.map(m => ({ ...m }));
    this.el.insertAdjacentHTML('beforeend', `
      <div class="gw-controls">
        <button class="js-add" type="button">+ Station</button>
        <button class="js-rm" type="button">− Station</button>
        <button class="js-ex" type="button">Exemple</button>
        <label style="font-size:12px;font-weight:600">Composite à MD (m)
          <input type="number" class="js-md" value="120" step="10" min="0" style="width:64px;padding:1px 3px;border:1px solid #ccc;border-radius:4px"></label>
        <span style="font-size:12px;color:#666">Collet (0, 0, 0) · Z vers le haut</span>
      </div>
      <div class="js-stations" style="display:flex;flex-wrap:wrap;gap:6px;padding:0 1rem 6px"></div>
      <div class="js-plot" style="height:440px"></div>
      <div class="js-info" style="margin:6px 1rem;font-size:12px;color:#444"></div>
    `);
    this.plot = this.el.querySelector('.js-plot');
    this.stationsBox = this.el.querySelector('.js-stations');
    this.infoEl = this.el.querySelector('.js-info');
    this.mdInput = this.el.querySelector('.js-md');
    this.on(this.mdInput, 'input', debounce(() => this.refresh(), 150));
    this.on(this.el.querySelector('.js-add'), 'click', () => {
      const last = this.mesures[this.mesures.length - 1] || { md: 0, azimut: 90, plongee: 60 };
      this.mesures.push({ md: last.md + 50, azimut: last.azimut + 10, plongee: Math.max(0, last.plongee - 8) });
      this.rebuild(); this.refresh();
    });
    this.on(this.el.querySelector('.js-rm'), 'click', () => {
      if (this.mesures.length > 2) { this.mesures.pop(); this.rebuild(); this.refresh(); }
    });
    this.on(this.el.querySelector('.js-ex'), 'click', () => { this.mesures = EX.map(m => ({ ...m })); this.rebuild(); this.refresh(); });
    this.rebuild();
    afficherChargementJusquaPret(this.el).then(() => this.refresh());
  }

  rebuild() {
    const refresh = debounce(() => this.refresh(), 150);
    this.stationsBox.innerHTML = this.mesures.map((m, i) => `
      <span style="display:inline-flex;gap:3px;align-items:center;font-size:11px;font-weight:600;border:1px solid #e0ddd6;border-radius:6px;padding:2px 5px">
        #${i + 1} MD<input type="number" value="${m.md}" step="5" data-i="${i}" data-f="md" style="width:52px;padding:1px 3px;border:1px solid #ccc;border-radius:4px">
        Az<input type="number" value="${m.azimut}" step="1" data-i="${i}" data-f="azimut" style="width:48px;padding:1px 3px;border:1px solid #ccc;border-radius:4px">
        Pl<input type="number" value="${m.plongee}" step="1" data-i="${i}" data-f="plongee" style="width:44px;padding:1px 3px;border:1px solid #ccc;border-radius:4px">
      </span>`).join('');
    this.stationsBox.querySelectorAll('input[data-i]').forEach(inp => {
      this.on(inp, 'input', () => {
        this.mesures[+inp.dataset.i][inp.dataset.f] = parseFloat(inp.value) || 0;
        refresh();
      });
    });
  }

  async refresh() {
    if (!window.Plotly) { this.afficherAvertissement('Plotly non chargé.'); return; }
    const mesures = [...this.mesures].sort((a, b) => a.md - b.md);

    // === Appel a la VRAIE librairie ===
    const pts = await gpoly.calculerTrajectoire(mesures, [0, 0, 0]);

    // Forage rectiligne theorique (cosinus de la 1ere station, longueur = MD final)
    const cd0 = await gpoly.cosinusDirecteurs([mesures[0]]);
    const Lmax = mesures[mesures.length - 1].md;
    const droit = {
      x: [0, cd0[0].lx * Lmax],
      y: [0, cd0[0].ly * Lmax],
      z: [0, cd0[0].lz * Lmax],
    };

    // === Composite interpolé à une profondeur MD donnée (VRAIE librairie) ===
    const mdComp = Math.max(0, Math.min(Lmax, parseFloat(this.mdInput.value) || 0));
    let interp = null;
    try { const ip = await gpoly.interpolerProfondeurs(mesures, [0, 0, 0], [mdComp]); interp = ip[0]; }
    catch (e) { interp = null; }

    const traces = [
      { x: pts.map(p => p.x), y: pts.map(p => p.y), z: pts.map(p => p.z), type: 'scatter3d', mode: 'lines+markers',
        line: { color: '#0d4d92', width: 5 }, marker: { size: 4, color: '#0d4d92' }, name: 'Trajectoire réelle (stations)' },
      { x: droit.x, y: droit.y, z: droit.z, type: 'scatter3d', mode: 'lines',
        line: { color: '#CC0000', width: 3, dash: 'dash' }, name: 'Si rectiligne' },
    ];
    if (interp) {
      traces.push({ x: [interp.x], y: [interp.y], z: [interp.z], type: 'scatter3d', mode: 'markers',
        marker: { size: 7, color: '#E69F00', symbol: 'diamond', line: { color: '#000', width: 1 } },
        name: `Composite MD ${mdComp} m` });
    }

    Plotly.react(this.plot, traces, {
      margin: { t: 30, l: 0, r: 0, b: 0 },
      title: { text: 'Trajectoire 3D (méthode des points milieux, via geostat_polymtl)', font: { size: 13 } },
      scene: { xaxis: { title: 'X (Est)' }, yaxis: { title: 'Y (Nord)' }, zaxis: { title: 'Z (élév.)' }, aspectmode: 'data' },
      legend: { font: { size: 11 } },
    }, { displaylogo: false, responsive: true });

    const fin = pts[pts.length - 1];
    const ecart = Math.hypot(fin.x - droit.x[1], fin.y - droit.y[1], fin.z - droit.z[1]);
    const compTxt = interp
      ? ` · <b style="color:#b8860b">Composite à MD ${mdComp} m</b> : X=${interp.x.toFixed(1)}, Y=${interp.y.toFixed(1)}, Z=${interp.z.toFixed(1)} m.`
      : '';
    this.infoEl.innerHTML =
      `Fond du trou : X=${fin.x.toFixed(1)}, Y=${fin.y.toFixed(1)}, Z=${fin.z.toFixed(1)} m · ` +
      `écart vs rectiligne : <b>${ecart.toFixed(1)} m</b>.${compTxt} ` +
      `Calcul par <code>geostat_polymtl.treatment.deviations</code> (méthode des points milieux).`;
  }

  cleanup() { if (this.plot && window.Plotly) Plotly.purge(this.plot); }
}

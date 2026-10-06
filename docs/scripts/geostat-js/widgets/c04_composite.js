// scripts/geostat-js/widgets/c04_composite.js
// -----------------------------------------------------------------------------
// Calculateur « Compositing des forages » (C04, atelier 4.3).
// L'utilisateur saisit ses propres échantillons (De / À / Teneur), ajoute ou
// retire des lignes, et voit le dessin se mettre à jour : échantillons bruts
// (bleu ciel, en haut) → composites de longueur fixe (vert / gris, en bas),
// comme le notebook Chap5_Composite. Calcul des composites par la VRAIE
// librairie geostat_polymtl.treatment.composite via gpoly.
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

// Scénario par défaut (modifiable par l'utilisateur).
const DEFAUT = [
  { de: 0, a: 1.0, teneur: 1.00 },
  { de: 1.0, a: 2.5, teneur: 5.85 },
  { de: 2.5, a: 4.0, teneur: 1.75 },
  { de: 4.0, a: 5.2, teneur: 3.80 },
  { de: 5.2, a: 7.0, teneur: 1.20 },
  { de: 7.0, a: 9.0, teneur: 0.80 },
];
const debounce = (fn, ms = 150) => { let id; return (...a) => { clearTimeout(id); id = setTimeout(() => fn(...a), ms); }; };

export default class C04Composite extends Widget {
  render() {
    this.ech = DEFAUT.map(e => ({ ...e }));
    this.el.insertAdjacentHTML('beforeend', `
      <div style="padding:0 1rem 1rem">
        <div class="gw-controls" style="border:none;padding:6px 0;display:flex;flex-wrap:wrap;gap:.6rem;align-items:center">
          <label>Longueur composite (m)
            <input type="range" class="js-len" min="0.5" max="5" step="0.5" value="2"><span class="js-lenV">2.0</span></label>
          <label>Couverture min
            <input type="range" class="js-cov" min="0" max="100" step="5" value="50"><span class="js-covV">50 %</span></label>
        </div>

        <h5 style="margin:.4rem 0 .25rem">Échantillons du forage</h5>
        <table style="border-collapse:collapse;font-size:13px">
          <thead><tr style="background:#f0f0f0">
            <th style="padding:4px 8px;text-align:right">De (m)</th>
            <th style="padding:4px 8px;text-align:right">À (m)</th>
            <th style="padding:4px 8px;text-align:right">Teneur (%)</th>
            <th></th>
          </tr></thead>
          <tbody class="js-tbody"></tbody>
        </table>
        <div class="gw-controls" style="border:none;padding:4px 0">
          <button class="js-add" type="button">+ Échantillon</button>
          <button class="js-reset" type="button">Réinitialiser</button>
        </div>

        <div class="js-plot" style="height:300px"></div>
        <div class="js-info" style="margin:6px 0;font-size:12px;color:#444"></div>
      </div>
    `);
    this.tbody = this.el.querySelector('.js-tbody');
    this.plot = this.el.querySelector('.js-plot');
    this.infoEl = this.el.querySelector('.js-info');
    this.lenI = this.el.querySelector('.js-len');
    this.covI = this.el.querySelector('.js-cov');
    this.lenV = this.el.querySelector('.js-lenV');
    this.covV = this.el.querySelector('.js-covV');
    this.refreshD = debounce(() => this.refresh(), 120);
    this.on(this.lenI, 'input', this.refreshD);
    this.on(this.covI, 'input', this.refreshD);
    this.on(this.el.querySelector('.js-add'), 'click', () => {
      const last = this.ech[this.ech.length - 1] || { de: 0, a: 1, teneur: 1 };
      const len = (last.a - last.de) || 1.5;
      this.ech.push({ de: last.a, a: last.a + len, teneur: 1.0 });
      this._rebuildTable(); this.refresh();
    });
    this.on(this.el.querySelector('.js-reset'), 'click', () => {
      this.ech = DEFAUT.map(e => ({ ...e })); this._rebuildTable(); this.refresh();
    });
    this._rebuildTable();
    afficherChargementJusquaPret(this.el).then(() => this.refresh());
  }

  _rebuildTable() {
    const cell = (i, f, v) => `<td style="padding:2px 6px"><input type="number" step="0.1" value="${v}" data-i="${i}" data-f="${f}" style="width:70px;padding:2px 4px;border:1px solid #ccc;border-radius:5px;text-align:right"></td>`;
    this.tbody.innerHTML = this.ech.map((e, i) => `
      <tr>${cell(i, 'de', e.de)}${cell(i, 'a', e.a)}${cell(i, 'teneur', e.teneur)}
        <td style="padding:2px 6px"><button type="button" class="js-del" data-i="${i}" title="Supprimer" style="cursor:pointer;border:1px solid #d9b0b0;background:#fbeaea;border-radius:5px;padding:1px 7px">✕</button></td></tr>`).join('');
    this.tbody.querySelectorAll('input').forEach(inp => this.on(inp, 'input', () => {
      this.ech[+inp.dataset.i][inp.dataset.f] = parseFloat(inp.value) || 0;
      this.refreshD();
    }));
    this.tbody.querySelectorAll('.js-del').forEach(b => this.on(b, 'click', () => {
      if (this.ech.length > 1) { this.ech.splice(+b.dataset.i, 1); this._rebuildTable(); this.refresh(); }
    }));
  }

  async refresh() {
    const longueur = parseFloat(this.lenI.value);
    const cov = parseFloat(this.covI.value) / 100;
    this.lenV.textContent = longueur.toFixed(1);
    this.covV.textContent = (cov * 100).toFixed(0) + ' %';
    if (!window.Plotly) { this.afficherAvertissement('Plotly non chargé.'); return; }

    // Échantillons triés et valides (À > De).
    const ech = this.ech.filter(e => e.a > e.de).slice().sort((a, b) => a.de - b.de);
    if (!ech.length) { this.infoEl.textContent = 'Ajoutez au moins un échantillon (À > De).'; Plotly.purge(this.plot); return; }

    // === Composites via la VRAIE librairie ===
    const comps = await gpoly.composite(ech, longueur, cov);

    const minFrom = Math.min(...ech.map(e => e.de), ...comps.map(c => c.de));
    const maxTo = Math.max(...ech.map(e => e.a), ...comps.map(c => c.a));
    const shapes = [], annotations = [];
    ech.forEach((e, i) => {
      shapes.push({ type: 'rect', x0: e.de, x1: e.a, y0: 0.5, y1: 1.4, fillcolor: '#87CEEB', line: { color: '#000', width: 1 } });
      annotations.push({ x: (e.de + e.a) / 2, y: 0.95, text: `${e.teneur.toFixed(2)} %`, showarrow: false, font: { size: 10, color: '#000' } });
      annotations.push({ x: (e.de + e.a) / 2, y: 1.6, text: `Éch ${i + 1}`, showarrow: false, font: { size: 9, color: '#666' } });
    });
    for (const c of comps) {
      shapes.push({ type: 'rect', x0: c.de, x1: c.a, y0: -1.4, y1: -0.5, fillcolor: c.valide ? '#90EE90' : '#e3e3e3', line: { color: c.valide ? '#000' : '#bbb', width: 1, dash: c.valide ? 'solid' : 'dot' } });
      annotations.push({ x: (c.de + c.a) / 2, y: -0.95, text: c.valide ? `${c.teneur.toFixed(2)} %` : '✗', showarrow: false, font: { size: 10, color: c.valide ? '#000' : '#999' } });
    }
    annotations.push({ x: minFrom, y: 1.85, text: 'Échantillons bruts', showarrow: false, xanchor: 'left', font: { size: 11, color: '#555' } });
    annotations.push({ x: minFrom, y: -1.85, text: `Composites (${longueur.toFixed(1)} m)`, showarrow: false, xanchor: 'left', font: { size: 11, color: '#555' } });

    Plotly.react(this.plot, [], {
      margin: { t: 16, l: 24, r: 16, b: 38 },
      xaxis: { title: 'Profondeur (m)', range: [minFrom - 0.2, maxTo + 0.2], zeroline: false },
      yaxis: { range: [-2.1, 2.1], showticklabels: false, zeroline: false, showgrid: false, fixedrange: true },
      shapes, annotations,
    }, { displaylogo: false, responsive: true });

    const nVal = comps.filter(c => c.valide).length;
    this.infoEl.innerHTML =
      `Longueur = <b>${longueur.toFixed(1)} m</b>, couverture min = <b>${(cov * 100).toFixed(0)} %</b> · ` +
      `Composites valides : <b>${nVal}</b> / ${comps.length}. ` +
      `Calcul par <code>geostat_polymtl.treatment.composite</code>.`;
  }

  cleanup() { if (this.plot && window.Plotly) Plotly.purge(this.plot); }
}

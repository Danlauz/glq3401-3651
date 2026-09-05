// scripts/geostat-js/widgets/c03_gy_abaque.js
// -----------------------------------------------------------------------------
// Widget « Abaque de Gy » (C03) — nomogramme + procedure multi-etapes.
// Calculs (isocontours + sr par etape) via la VRAIE librairie geostat_polymtl
// (sampling.gy.ecart_type_relatif), executee dans le navigateur via Pyodide.
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

const SR_VALS = [0.001, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1.0];
const SR_COL  = ['#16a34a', '#16a34a', '#059669', '#0d9488', '#2563eb', '#7c3aed', '#dc2626', '#dc2626', '#991b1b'];
const EX_STEPS = [{ d: 0.5, me: 5300 }, { d: 0.02, me: 100 }, { d: 0.007, me: 25 }];
const debounce = (fn, ms = 200) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

/**
 * Bornes d'un axe logarithmique, en log10, calées sur les valeurs affichées.
 *
 * @param {number[]} valeurs   données à encadrer (les zéros sont ignorés)
 * @param {number}   marge     marge ajoutée de chaque côté, en décades
 * @param {number}   etendueMin étendue minimale de l'axe, en décades
 * @returns {[number, number]} bornes arrondies à la décade entière
 */
function bornesLog(valeurs, marge = 0.35, etendueMin = 2) {
  const v = valeurs.filter(x => isFinite(x) && x > 0);
  if (!v.length) return [0, etendueMin];
  let lo = Math.log10(Math.min(...v)) - marge;
  let hi = Math.log10(Math.max(...v)) + marge;
  if (hi - lo < etendueMin) {                 // procédure trop courte : on élargit
    const c = (lo + hi) / 2;
    lo = c - etendueMin / 2; hi = c + etendueMin / 2;
  }
  // Pas d'arrondi à la décade entière : cela ramènerait presque toujours aux
  // bornes fixes d'avant et annulerait le cadrage. On arrondit au quart de
  // décade, assez pour des bornes propres sans perdre le zoom.
  return [Math.floor(lo * 4) / 4, Math.ceil(hi * 4) / 4];
}

export default class C03GyAbaque extends Widget {
  render() {
    this.steps = EX_STEPS.map(s => ({ ...s }));
    this.el.insertAdjacentHTML('beforeend', `
      <div style="padding:0 1rem">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0">
          <div style="padding:10px;border:1px solid #ddd;border-radius:10px;background:#fafafa">
            <div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;margin-bottom:6px">Paramètres du matériau</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px 10px">
              <label style="font-size:12px;font-weight:600">aₗ <input type="number" class="js-al" value="0.03" step="0.001" min="0.000001" style="width:70px"></label>
              <label style="font-size:12px;font-weight:600">δₐ <input type="number" class="js-da" value="5" step="0.1" style="width:60px"></label>
              <label style="font-size:12px;font-weight:600">δ_g <input type="number" class="js-dg" value="2.8" step="0.1" style="width:60px"></label>
              <label style="font-size:12px;font-weight:600">d₀ <input type="number" class="js-d0" value="0.04" step="0.001" style="width:70px"></label>
              <label style="font-size:12px;font-weight:600">f <input type="number" class="js-f" value="0.5" step="0.05" style="width:55px"></label>
              <label style="font-size:12px;font-weight:600">g <input type="number" class="js-g" value="0.25" step="0.05" style="width:55px"></label>
            </div>
          </div>
          <div style="padding:10px;border:1px solid #ddd;border-radius:10px;background:#fafafa">
            <div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;margin-bottom:6px">Procédure (étapes)</div>
            <label style="font-size:12px;font-weight:600">Mₗ init (g) <input type="number" class="js-ml0" value="10000" step="100" style="width:90px"></label>
            <div class="js-steps" style="margin-top:6px"></div>
            <div style="margin-top:6px;display:flex;gap:6px">
              <button class="js-add" type="button">+ Étape</button>
              <button class="js-rm" type="button">− Étape</button>
              <button class="js-ex" type="button">Exemple</button>
            </div>
          </div>
        </div>
        <div class="js-plot" style="height:440px"></div>
        <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:8px">
          <thead><tr style="background:#f0f0f0">
            <th style="padding:5px 8px;text-align:left">Étape</th><th style="padding:5px 8px;text-align:left">d (cm)</th>
            <th style="padding:5px 8px;text-align:left">Mₑ (g)</th><th style="padding:5px 8px;text-align:left">Mₗ (g)</th>
            <th style="padding:5px 8px;text-align:left">f_L</th><th style="padding:5px 8px;text-align:left">sᵣ</th><th style="padding:5px 8px;text-align:left">s²ᵣ</th>
          </tr></thead>
          <tbody class="js-tbody"></tbody>
        </table>
        <p style="margin-top:8px;font-size:11px;color:#666">
          Calculs effectués par <code>geostat_polymtl.sampling.gy</code>.</p>
      </div>
    `);
    this.plot = this.el.querySelector('.js-plot');
    this.tbody = this.el.querySelector('.js-tbody');
    this.stepsBox = this.el.querySelector('.js-steps');
    this.mat = {};
    const refresh = debounce(() => this.refresh(), 200);
    for (const id of ['al', 'da', 'dg', 'd0', 'f', 'g', 'ml0']) {
      this.mat[id] = this.el.querySelector(`.js-${id}`);
      this.on(this.mat[id], 'input', refresh);
    }
    this.on(this.el.querySelector('.js-add'), 'click', () => {
      const last = this.steps[this.steps.length - 1] || { d: 0.1, me: 50 };
      this.steps.push({ d: last.d / 3, me: last.me / 4 }); this.rebuildSteps(refresh); this.refresh();
    });
    this.on(this.el.querySelector('.js-rm'), 'click', () => {
      if (this.steps.length > 1) { this.steps.pop(); this.rebuildSteps(refresh); this.refresh(); }
    });
    this.on(this.el.querySelector('.js-ex'), 'click', () => {
      this.steps = EX_STEPS.map(s => ({ ...s }));
      this.mat.ml0.value = 10000; this.mat.al.value = 0.03; this.mat.da.value = 5;
      this.mat.dg.value = 2.8; this.mat.d0.value = 0.04; this.mat.f.value = 0.5; this.mat.g.value = 0.25;
      this.rebuildSteps(refresh); this.refresh();
    });
    this.rebuildSteps(refresh);
    afficherChargementJusquaPret(this.el).then(() => this.refresh());
  }

  rebuildSteps(refresh) {
    this.stepsBox.innerHTML = this.steps.map((s, i) => `
      <span style="display:inline-flex;gap:4px;align-items:center;margin:3px 6px 0 0;font-size:11px;font-weight:600">
        É${i + 1}: d=<input type="number" value="${s.d}" step="0.001" data-i="${i}" data-f="d" style="width:60px;padding:2px 4px;border:1px solid #ccc;border-radius:4px">
        Mₑ=<input type="number" value="${s.me}" step="1" data-i="${i}" data-f="me" style="width:70px;padding:2px 4px;border:1px solid #ccc;border-radius:4px">
      </span>`).join('');
    this.stepsBox.querySelectorAll('input[data-i]').forEach(inp => {
      this.on(inp, 'input', () => {
        this.steps[+inp.dataset.i][inp.dataset.f] = parseFloat(inp.value) || 0;
        refresh();
      });
    });
  }

  matVal(id) { return parseFloat(this.mat[id].value) || 0; }

  async refresh() {
    const p = {
      al: this.matVal('al'), da: this.matVal('da'), dg: this.matVal('dg'),
      d0: this.matVal('d0'), f: this.matVal('f'), g: this.matVal('g'),
    };
    const ml0 = this.matVal('ml0');
    if (p.al <= 0 || ml0 <= 0) return;
    if (!window.Plotly) { this.afficherAvertissement('Plotly non chargé.'); return; }

    // === Bornes des axes, calées sur les données affichées ===
    // Le nomogramme est en log-log : on encadre la procédure (les d et les
    // masses de chaque étape, la maille de libération d₀ et la masse initiale)
    // en arrondissant à la décade, avec un minimum d'étendue pour que le
    // graphique reste lisible même sur une procédure très courte.
    const [lx0, lx1] = bornesLog(
      this.steps.map(s => s.d).concat([p.d0]), 0.35, 2);
    const [ly0, ly1] = bornesLog(
      this.steps.map(s => s.me).concat([ml0]), 0.35, 3);

    // === Isocontours + evaluation procedure via la VRAIE librairie ===
    // Les isocontours sont calculés sur l'étendue réellement affichée, avec un
    // pas constant en nombre de points : ils traversent toujours le cadre.
    const [iso, evalProc] = await Promise.all([
      gpoly.gyIsocontoursAbaque(p, SR_VALS, lx0, lx1, (lx1 - lx0) / 120),
      gpoly.gyEvaluerProcedure(p, this.steps, ml0),
    ]);

    // Construire les traces d'isocontours
    const traces = iso.curves.map((c, si) => ({
      x: c.x, y: c.y, mode: 'lines',
      line: { color: SR_COL[si], width: 1.5 },
      name: (c.sr * 100).toFixed(c.sr < 0.01 ? 1 : 0) + ' %',
      hovertemplate: 'sᵣ=' + (c.sr * 100).toFixed(2) + '%<br>d=%{x:.3g} cm<br>Mₑ=%{y:.3g} g<extra></extra>',
    }));

    // Trace procedure (chemin du nomogramme)
    const px = [this.steps[0].d], py = [ml0];
    for (let i = 0; i < this.steps.length; i++) {
      px.push(this.steps[i].d); py.push(this.steps[i].me);
      if (i < this.steps.length - 1) { px.push(this.steps[i + 1].d); py.push(this.steps[i].me); }
    }
    traces.push({
      x: px, y: py, mode: 'lines+markers',
      line: { color: '#000', width: 3 }, marker: { color: '#dc2626', size: 9 },
      name: 'Procédure', hovertemplate: 'd=%{x:.3g} cm<br>M=%{y:.3g} g<extra></extra>',
    });
    const shapes = [{ type: 'line', x0: p.d0, x1: p.d0, y0: Math.pow(10, ly0),
                      y1: Math.pow(10, ly1), line: { color: '#999', width: 1, dash: 'dot' } }];

    // Maillage fin : sur une échelle logarithmique, les décades seules ne
    // permettent pas de lire une valeur intermédiaire. On ajoute les
    // subdivisions 2, 3, … 9 de chaque décade (dtick 'D1') sur les deux axes.
    const AXE_LOG = {
      type: 'log', dtick: 1, showline: true, mirror: true, linecolor: '#999',
      ticks: 'outside', gridcolor: '#9e9e9e', gridwidth: 1, zeroline: false,
      minor: { dtick: 'D1', showgrid: true, gridcolor: '#d8d8d8', gridwidth: 0.5,
               ticks: 'outside', ticklen: 3 },
    };

    Plotly.react(this.plot, traces, {
      margin: { t: 36, l: 65, r: 20, b: 45 },
      title: { text: 'Abaque de Gy — isocontours sᵣ et procédure', font: { size: 13 } },
      xaxis: { ...AXE_LOG, title: 'Taille fragments d (cm)', range: [lx0, lx1] },
      yaxis: { ...AXE_LOG, title: 'Masse échantillon Mₑ (g)', range: [ly0, ly1] },
      plot_bgcolor: '#fff',
      shapes, legend: { font: { size: 10 }, orientation: 'v', x: 1.02, y: 1 },
    }, { displaylogo: false, responsive: true });

    // Tableau des etapes
    const worst = evalProc.worst;
    this.tbody.innerHTML = evalProc.rows.map((r, i) => `
      <tr style="${i === worst ? 'background:#fff3cd' : ''}">
        <td style="padding:4px 8px">${i + 1}</td><td style="padding:4px 8px">${r.d}</td>
        <td style="padding:4px 8px">${r.me}</td><td style="padding:4px 8px">${r.ml.toFixed(0)}</td>
        <td style="padding:4px 8px">${r.fl.toFixed(4)}</td>
        <td style="padding:4px 8px">${(r.sr * 100).toFixed(3)} %</td>
        <td style="padding:4px 8px">${r.sr2.toExponential(2)}</td>
      </tr>`).join('') +
      `<tr style="font-weight:700;background:#e8f5e9">
         <td style="padding:4px 8px" colspan="5">sᵣ global</td>
         <td style="padding:4px 8px">${(evalProc.sr_global * 100).toFixed(3)} %</td>
         <td style="padding:4px 8px">${evalProc.sr2_global.toExponential(2)}</td>
       </tr>`;
  }

  cleanup() { if (this.plot && window.Plotly) Plotly.purge(this.plot); }
}

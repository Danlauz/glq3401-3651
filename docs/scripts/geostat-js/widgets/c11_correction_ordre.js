// scripts/geostat-js/widgets/c11_correction_ordre.js
// -----------------------------------------------------------------------------
// Widget C11.2 — Correction de la relation d'ordre (façon figure 11.3).
//
// Le KI krige chaque seuil indépendamment : la CDF locale BRUTE (points noirs)
// peut sortir de [0, 1] ou décroître. On la rend admissible par deux passes :
//   - correction AVANT (montée), en ROUGE : on remonte chaque point pour que la
//     CDF ne décroisse pas (flèches vers le haut) ;
//   - correction ARRIÈRE (descente), en VERT : on redescend chaque point en
//     balayant du haut vers le bas (flèches vers le bas).
// La CDF corrigée finale (BLEU) est la MOYENNE des deux passes : monotone, dans
// [0, 1].
// -----------------------------------------------------------------------------
import { Widget } from '../widget-base.js';
import { afficherChargementJusquaPret } from '../pyodide_setup.js';
const debounce = (fn, ms = 120) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const clamp01 = v => Math.max(0, Math.min(1, v));
const COL = { brute: '#222', avant: '#d62728', arriere: '#1f9e3a', corr: '#0d4d92' };

export default class C11CorrectionOrdre extends Widget {
  render() {
    const id = this.el.id;
    this.seed = 5;
    this.el.insertAdjacentHTML('beforeend', `
      <style>#${id} .gw-controls label{display:inline-flex !important;flex-direction:row !important;align-items:center;gap:5px;}</style>
      <div class="gw-controls" style="display:flex;flex-wrap:wrap;gap:14px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;">
        <label>Nombre de seuils K <input type="range" class="js-K" min="6" max="12" value="10" step="1" style="width:120px"><span class="js-Kv">10</span></label>
        <label>Désordre <input type="range" class="js-amp" min="0.02" max="0.16" value="0.09" step="0.01" style="width:120px"><span class="js-ampv">0.09</span></label>
        <button class="js-regen" type="button" style="font-size:.78rem;padding:4px 10px;background:#3a3632;color:#fff;border:none;border-radius:5px;cursor:pointer;">Nouvelle CDF brute</button>
      </div>
      <div class="js-plot" style="height:420px;margin-top:6px;"></div>
      <div class="js-info" style="padding:.4rem 1rem;font-family:'JetBrains Mono',monospace;font-size:.82rem;color:#333;text-align:center;background:#eef2f7;border:1px solid #c4d2e0;border-radius:6px;margin-top:4px;">—</div>
      <p style="margin:4px 1rem;font-size:11px;color:#666;">
        <b style="color:#222">●</b> CDF brute (krigée seuil par seuil) · <b style="color:#d62728">correction avant ↑</b> (impose F non décroissante) · <b style="color:#1f9e3a">correction arrière ↓</b> · <b style="color:#0d4d92">CDF corrigée</b> = moyenne des deux, monotone et dans [0, 1].</p>
    `);
    this.plot = this.el.querySelector('.js-plot');
    this.infoEl = this.el.querySelector('.js-info');
    this.KEl = this.el.querySelector('.js-K');
    this.ampEl = this.el.querySelector('.js-amp');
    const upd = debounce(() => this.refresh(), 80);
    this.on(this.KEl, 'input', e => { this.el.querySelector('.js-Kv').textContent = e.target.value; upd(); });
    this.on(this.ampEl, 'input', e => { this.el.querySelector('.js-ampv').textContent = parseFloat(e.target.value).toFixed(2); upd(); });
    this.on(this.el.querySelector('.js-regen'), 'click', () => { this.seed = Math.floor(Math.random() * 1e6); this.refresh(); });
    afficherChargementJusquaPret(this.el).then(() => this.refresh());
  }

  refresh() {
    const K = parseInt(this.KEl.value, 10), amp = parseFloat(this.ampEl.value);
    let s = this.seed >>> 0;
    const rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    // CDF brute : base sigmoïde croissante + bruit (peut sortir de [0,1] et décroître).
    const x = []; const brute = [];
    for (let k = 0; k < K; k++) {
      x.push(k + 1);
      const base = 1 / (1 + Math.exp(-(k - (K - 1) / 2) / (K / 5.2)));
      brute.push(base + amp * (rng() - 0.5) * 2 * 2.2);
    }
    // Passe AVANT (montée) : F non décroissante du bas vers le haut.
    const avant = []; let prev = 0;
    for (let k = 0; k < K; k++) { const m = Math.max(clamp01(brute[k]), prev); avant.push(m); prev = m; }
    // Passe ARRIÈRE (descente) : du haut vers le bas.
    const arriere = new Array(K); let nxt = 1;
    for (let k = K - 1; k >= 0; k--) { const m = Math.min(clamp01(brute[k]), nxt); arriere[k] = m; nxt = m; }
    const corr = avant.map((u, k) => clamp01(0.5 * (u + arriere[k])));

    // Violations de la brute.
    let nviol = 0;
    for (let k = 0; k < K; k++) {
      if (brute[k] < -1e-9 || brute[k] > 1 + 1e-9) nviol++;
      else if (k > 0 && brute[k] < brute[k - 1] - 1e-9) nviol++;
    }

    if (!window.Plotly) return;
    // Flèches : avant (rouge ↑) là où la montée relève le point ; arrière (vert ↓) là où la descente l'abaisse.
    const ann = [];
    for (let k = 0; k < K; k++) {
      if (avant[k] - clamp01(brute[k]) > 0.012) ann.push({ x: x[k], y: avant[k], ax: x[k], ay: brute[k], axref: 'x', ayref: 'y', showarrow: true, arrowhead: 2, arrowsize: 1, arrowwidth: 1.6, arrowcolor: COL.avant });
      if (clamp01(brute[k]) - arriere[k] > 0.012) ann.push({ x: x[k], y: arriere[k], ax: x[k], ay: brute[k], axref: 'x', ayref: 'y', showarrow: true, arrowhead: 2, arrowsize: 1, arrowwidth: 1.6, arrowcolor: COL.arriere });
    }

    Plotly.react(this.plot, [
      { x, y: avant, mode: 'lines+markers', name: 'correction avant (montée)', line: { color: COL.avant, width: 1.6, dash: 'dashdot' }, marker: { color: COL.avant, size: 6, symbol: 'triangle-up' } },
      { x, y: arriere, mode: 'lines+markers', name: 'correction arrière (descente)', line: { color: COL.arriere, width: 1.6, dash: 'dashdot' }, marker: { color: COL.arriere, size: 6, symbol: 'triangle-down' } },
      { x, y: brute, mode: 'lines+markers', name: 'CDF brute', line: { color: COL.brute, width: 1, dash: 'dot' }, marker: { color: COL.brute, size: 9 } },
      { x, y: corr, mode: 'lines+markers', name: 'CDF corrigée (moyenne)', line: { color: COL.corr, width: 3 }, marker: { color: '#fff', size: 9, symbol: 'circle', line: { color: COL.corr, width: 2.5 } } },
      { x: [1, K], y: [0, 0], mode: 'lines', line: { color: '#ccc', width: 1 }, showlegend: false, hoverinfo: 'skip' },
      { x: [1, K], y: [1, 1], mode: 'lines', line: { color: '#ccc', width: 1 }, showlegend: false, hoverinfo: 'skip' },
    ], {
      margin: { t: 26, l: 46, r: 16, b: 54 }, annotations: ann,
      xaxis: { title: { text: 'seuil (rang)', standoff: 6 }, range: [0.5, K + 0.5], dtick: 1 },
      yaxis: { title: { text: 'F(z)', standoff: 6 }, range: [-0.18, 1.18] },
      legend: { orientation: 'h', y: -0.18, x: 0.5, xanchor: 'center', font: { size: 9 } },
    }, { displaylogo: false, responsive: true, displayModeBar: false });

    this.infoEl.innerHTML =
      `CDF brute : <b style="color:#c0392b">${nviol}</b> violation(s) (hors [0,1] ou décroissances) · ` +
      `après correction : <b style="color:#0d4d92">0</b> — CDF monotone et dans [0, 1].`;
  }

  cleanup() { if (window.Plotly && this.plot) Plotly.purge(this.plot); }
}

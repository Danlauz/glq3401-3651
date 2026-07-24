// scripts/geostat-js/widgets/c11_codage_cdf.js
// -----------------------------------------------------------------------------
// Widget C11.1 — Codage de Z en indicatrices.
//
// Le codage TRANSFORME les données CONTINUES Z en indicatrices I = 1{Z ≤ z_c}.
//   - Gauche : les 20 données continues (valeur de teneur).
//   - Droite : les mêmes données CODÉES en indicatrices au seuil z_c (1/0).
// Par défaut on ne montre que les DONNÉES ; le bouton « Afficher le champ »
// révèle le champ continu interpolé (et son codage binaire) en arrière-plan.
//
// Champ continu simulé par la librairie (gpoly.simulerChamp).
// -----------------------------------------------------------------------------
import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

const debounce = (fn, ms = 40) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const N = 44, NDATA = 20, DOM = 44;
const TURBO = [
  [0.0, 'rgb(48,18,59)'], [0.1, 'rgb(65,69,217)'], [0.2, 'rgb(35,138,244)'], [0.3, 'rgb(30,192,211)'],
  [0.4, 'rgb(53,226,149)'], [0.5, 'rgb(131,246,88)'], [0.6, 'rgb(199,233,47)'], [0.7, 'rgb(248,186,56)'],
  [0.8, 'rgb(251,122,33)'], [0.9, 'rgb(221,61,8)'], [1.0, 'rgb(122,4,3)'],
];
const IND = [[0, 'rgb(232,237,242)'], [0.5, 'rgb(232,237,242)'], [0.5, 'rgb(13,77,146)'], [1, 'rgb(13,77,146)']];

export default class C11CodageCDF extends Widget {
  render() {
    this.seed = 7;
    this.showField = false;
    const id = this.el.id;
    this.el.insertAdjacentHTML('beforeend', `
      <style>
        #${id} .gw-controls label { display:inline-flex !important; flex-direction:row !important; align-items:center; gap:5px; }
      </style>
      <div class="gw-controls" style="display:flex;flex-wrap:wrap;gap:14px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;">
        <label>Seuil <span>z<sub>c</sub></span> <input type="range" class="js-zc" min="0" max="6" value="3" step="0.05" style="width:230px"><span class="js-zcv">3.00</span></label>
        <button class="js-field" type="button" style="font-size:.78rem;padding:4px 10px;background:#0d4d92;color:#fff;border:none;border-radius:5px;cursor:pointer;">Afficher le champ</button>
        <button class="js-regen" type="button" style="font-size:.78rem;padding:4px 10px;background:#3a3632;color:#fff;border:none;border-radius:5px;cursor:pointer;">Nouvelles données</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px;">
        <div class="js-plot-cont" style="height:340px"></div>
        <div class="js-plot-ind" style="height:340px"></div>
      </div>
      <div class="js-info" style="padding:.4rem 1rem;font-family:'JetBrains Mono',monospace;font-size:.82rem;color:#333;text-align:center;background:#eef2f7;border:1px solid #c4d2e0;border-radius:6px;margin-top:6px;"></div>
      <p style="margin:4px 1rem;font-size:11px;color:#666;">
        Par défaut, on ne voit que les <b>20 données observées</b>. À gauche leur teneur continue ; à droite leur codage en indicatrice I = 1 si Z ≤ z<sub>c</sub> (bleu), 0 sinon (clair). Déplacez le seuil pour recoder. « Afficher le champ » révèle l'interpolation continue et son champ d'indicatrices.</p>
    `);
    this.plotCont = this.el.querySelector('.js-plot-cont');
    this.plotInd = this.el.querySelector('.js-plot-ind');
    this.infoEl = this.el.querySelector('.js-info');
    this.zcEl = this.el.querySelector('.js-zc');
    const upd = debounce(() => this.drawInd(), 20);
    this.on(this.zcEl, 'input', e => { this.el.querySelector('.js-zcv').textContent = parseFloat(e.target.value).toFixed(2); upd(); });
    this.on(this.el.querySelector('.js-field'), 'click', e => {
      this.showField = !this.showField;
      e.target.textContent = this.showField ? 'Masquer le champ' : 'Afficher le champ';
      e.target.style.background = this.showField ? '#3a3632' : '#0d4d92';
      this.drawCont(); this.drawInd();
    });
    this.on(this.el.querySelector('.js-regen'), 'click', () => { this.seed = Math.floor(Math.random() * 1e6); this.simuler(); });
    afficherChargementJusquaPret(this.el).then(() => this.simuler());
  }

  async simuler() {
    let flat;
    try { flat = await gpoly.simulerChamp('spherique', 13, 0, this.seed, N, 'gaussien', 3, 1.2); }
    catch (e) { this.afficherAvertissement('Erreur simulation : ' + e.message); return; }
    const F = []; for (let j = 0; j < N; j++) { const r = []; for (let i = 0; i < N; i++) r.push(flat[j * N + i]); F.push(r); }
    this.F = F;
    this.xs = Array.from({ length: N }, (_, i) => i + 0.5);
    this.fmin = Math.min(...flat); this.fmax = Math.max(...flat);
    let s = (this.seed ^ 0x9e3779b9) >>> 0;
    const rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    const vus = new Set(), data = [];
    while (data.length < NDATA) {
      const i = Math.floor(rng() * N), j = Math.floor(rng() * N), key = j * N + i;
      if (vus.has(key)) continue; vus.add(key);
      data.push({ x: i + 0.5, y: j + 0.5, z: F[j][i] });
    }
    this.donnees = data;
    this.zcEl.min = this.fmin.toFixed(2); this.zcEl.max = this.fmax.toFixed(2);
    const med = [...data.map(d => d.z)].sort((a, b) => a - b)[Math.floor(NDATA / 2)];
    this.zcEl.value = med.toFixed(2); this.el.querySelector('.js-zcv').textContent = med.toFixed(2);
    this.drawCont(); this.drawInd();
  }

  _baseLayout(titre) {
    return {
      margin: { t: 28, l: 22, r: this.showField ? 56 : 14, b: 18 },
      title: { text: titre, font: { size: 12 }, y: 0.97 },
      xaxis: { range: [0, DOM], showticklabels: false, scaleanchor: 'y', constrain: 'domain' },
      yaxis: { range: [0, DOM], showticklabels: false },
    };
  }

  drawCont() {
    if (!window.Plotly || !this.F) return;
    const traces = [];
    if (this.showField) {
      traces.push({ type: 'heatmap', z: this.F, x: this.xs, y: this.xs, colorscale: TURBO, zmin: this.fmin, zmax: this.fmax, colorbar: { title: 'Z', thickness: 11, len: 0.85 } });
      traces.push({ x: this.donnees.map(d => d.x), y: this.donnees.map(d => d.y), mode: 'markers', marker: { color: '#fff', size: 7, line: { color: '#000', width: 1 } }, showlegend: false, hoverinfo: 'skip' });
    } else {
      traces.push({ x: this.donnees.map(d => d.x), y: this.donnees.map(d => d.y), mode: 'markers',
        marker: { color: this.donnees.map(d => d.z), colorscale: TURBO, cmin: this.fmin, cmax: this.fmax, size: 13, line: { color: '#000', width: 1 }, colorbar: { title: 'Z', thickness: 11, len: 0.85 } }, showlegend: false, hoverinfo: 'skip' });
    }
    Plotly.react(this.plotCont, traces, this._baseLayout('Données CONTINUES Z (20 sondages)'), { displaylogo: false, responsive: true, displayModeBar: false });
  }

  drawInd() {
    if (!window.Plotly || !this.F) return;
    const zc = parseFloat(this.zcEl.value);
    const dCol = this.donnees.map(d => (d.z <= zc ? 'rgb(13,77,146)' : 'rgb(232,237,242)'));
    const traces = [];
    if (this.showField) {
      const I = this.F.map(row => row.map(v => (v <= zc ? 1 : 0)));
      traces.push({ type: 'heatmap', z: I, x: this.xs, y: this.xs, colorscale: IND, zmin: 0, zmax: 1, showscale: false });
    }
    traces.push({ x: this.donnees.map(d => d.x), y: this.donnees.map(d => d.y), mode: 'markers', marker: { color: dCol, size: 13, line: { color: '#000', width: 1.2 } }, showlegend: false, hoverinfo: 'skip' });
    Plotly.react(this.plotInd, traces, this._baseLayout(`Codage INDICATRICE  I = 1{ Z ≤ ${zc.toFixed(2)} }`), { displaylogo: false, responsive: true, displayModeBar: false });

    const n1 = this.donnees.filter(d => d.z <= zc).length;
    let html = `Seuil z<sub>c</sub> = <b>${zc.toFixed(2)}</b> · données codées <b style="color:#0d4d92">1</b> (Z ≤ z<sub>c</sub>) : <b>${n1}/${NDATA}</b> · codées <b>0</b> : <b>${NDATA - n1}/${NDATA}</b>`;
    if (this.showField) { const prop = this.F.flat().filter(v => v <= zc).length / (N * N); html += ` · proportion du champ codée 1 ≈ <b>${(100 * prop).toFixed(0)} %</b>`; }
    this.infoEl.innerHTML = html;
  }

  cleanup() { if (window.Plotly) [this.plotCont, this.plotInd].forEach(p => p && Plotly.purge(p)); }
}

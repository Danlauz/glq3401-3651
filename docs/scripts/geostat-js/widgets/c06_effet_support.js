// scripts/geostat-js/widgets/c06_effet_support.js
// -----------------------------------------------------------------------------
// Widget « Effet du support » (C06) — calcul LIVE via Pyodide.
//
// Pedagogie : deux champs simules avec la MEME distribution marginale a
// l'echelle ponctuelle (lognormal m=1, σ²=1) mais des portees differentes
// (a1 court, a2 long). En agregeant par blocs de taille b croissante,
// on observe que la variance des blocs decroit, et que la decroissance
// depend de la portee : plus la portee est courte, plus le decrochage
// point -> bloc est rapide.
//
// Source unique : geostat_polymtl
//   - simulation : geostat_polymtl.simulation_methods.GFFTMA  (via gpoly.simulerChamp)
//   - agregation : geostat_polymtl.block_variance.empirique.agreger_champ
//                  (via gpoly.agregerChamp et gpoly.varianceBlocEmpirique)
// Aucune mathematique cote JS.
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

const COL_S = '#0173B2';  // portee courte
const COL_L = '#DE8F05';  // portee longue

// Palette « Turbo » (bleu -> rouge), identique aux champs des chapitres précédents.
const TURBO = [
  [0.0, 'rgb(48,18,59)'], [0.1, 'rgb(65,69,217)'], [0.2, 'rgb(35,138,244)'],
  [0.3, 'rgb(30,192,211)'], [0.4, 'rgb(53,226,149)'], [0.5, 'rgb(131,246,88)'],
  [0.6, 'rgb(199,233,47)'], [0.7, 'rgb(248,186,56)'], [0.8, 'rgb(251,122,33)'],
  [0.9, 'rgb(221,61,8)'], [1.0, 'rgb(122,4,3)'],
];

const CONFIG = {
  N: 200,                  // grille N x N (assez grande pour de grands supports)
  TAILLES_BLOCS: [1, 2, 4, 5, 8, 10, 15, 20, 25, 30, 40, 50],
  modele_defaut: 'spherique',
  portee_courte: 5,
  portee_longue: 30,
  pepite: 0.0,
  moyenne: 1.0,
  variance: 1.0,
};

const debounce = (fn, ms = 200) => {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
};

export default class C06EffetSupport extends Widget {
  render() {
    const optsBloc = CONFIG.TAILLES_BLOCS
      .map(b => `<option value="${b}">${b}×${b}</option>`).join('');
    this.el.insertAdjacentHTML('beforeend', `
      <div class="gw-controls" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:6px 10px;background:#f0eee8;border-radius:6px;font-size:.8rem;">
        <label>Loi
          <select class="js-loi">
            <option value="gaussien" selected>Normale</option>
            <option value="lognormal">Log-normale</option>
          </select>
        </label>
        <label>Portée courte a₁
          <input type="range" class="js-a1" min="2" max="20" value="${CONFIG.portee_courte}" style="width:120px;accent-color:${COL_S};">
          <span class="js-a1v">${CONFIG.portee_courte}</span>
        </label>
        <label>Portée longue a₂
          <input type="range" class="js-a2" min="10" max="60" value="${CONFIG.portee_longue}" style="width:120px;accent-color:${COL_L};">
          <span class="js-a2v">${CONFIG.portee_longue}</span>
        </label>
        <label>Moyenne
          <input type="range" class="js-moy" min="0.5" max="10" step="0.5" value="5" style="width:90px;">
          <span class="js-moyv">5</span>
        </label>
        <label>Variance
          <input type="range" class="js-var" min="0.1" max="10" step="0.1" value="4" style="width:90px;">
          <span class="js-varv">4</span>
        </label>
        <label>Bloc <select class="js-bloc">${optsBloc}</select></label>
        <button class="js-regen" type="button" style="font-size:.76rem;padding:3px 8px;background:#3a3632;color:#fff;border:none;border-radius:4px;cursor:pointer;">Nouveau champ</button>
      </div>
      <div class="js-plot" style="height:600px"></div>
      <div class="js-stats" style="padding:.5rem 1rem;font-family:'JetBrains Mono',monospace;font-size:.82rem;color:#444;"></div>
      <p style="margin:4px 1rem;font-size:11px;color:#666;">
        Simulations : <code>geostat_polymtl.simulation_methods.GFFTMA</code> ·
        Aggrégation : <code>geostat_polymtl.block_variance.empirique.agreger_champ</code></p>
    `);

    this.sel = {
      loi: this.el.querySelector('.js-loi'),
      a1: this.el.querySelector('.js-a1'),
      a2: this.el.querySelector('.js-a2'),
      moy: this.el.querySelector('.js-moy'),
      var: this.el.querySelector('.js-var'),
      bloc: this.el.querySelector('.js-bloc'),
    };
    this.plot = this.el.querySelector('.js-plot');
    this.statsEl = this.el.querySelector('.js-stats');
    this.sel.bloc.value = '1';
    this.seed = 42;
    this.champ1 = null;  // serialise les Float64Array des champs N x N
    this.champ2 = null;

    const onParamChange = debounce(() => this.regenerer(), 250);
    this.on(this.sel.loi, 'change', onParamChange);
    this.on(this.sel.a1, 'input', e => {
      this.el.querySelector('.js-a1v').textContent = e.target.value;
    });
    this.on(this.sel.a1, 'change', onParamChange);
    this.on(this.sel.a2, 'input', e => {
      this.el.querySelector('.js-a2v').textContent = e.target.value;
    });
    this.on(this.sel.a2, 'change', onParamChange);
    this.on(this.sel.moy, 'input', e => { this.el.querySelector('.js-moyv').textContent = e.target.value; });
    this.on(this.sel.moy, 'change', onParamChange);
    this.on(this.sel.var, 'input', e => { this.el.querySelector('.js-varv').textContent = e.target.value; });
    this.on(this.sel.var, 'change', onParamChange);
    this.on(this.sel.bloc, 'change', () => this.redessiner());
    this.on(this.el.querySelector('.js-regen'), 'click', () => {
      this.seed = (this.seed + 1) | 0; this.regenerer();
    });

    afficherChargementJusquaPret(this.el).then(() => this.regenerer());
  }

  /** Simule les deux champs via la VRAIE GFFTMA puis redessine. */
  async regenerer() {
    // Modèle de covariance fixé en interne (non exposé : pas encore vu en cours).
    const modele = 'spherique';
    const loi = this.sel.loi.value;   // 'gaussien' (normale) | 'lognormal'
    // Moyenne et variance choisies par l'utilisateur.
    const moyenne = parseFloat(this.sel.moy.value);
    const variance = parseFloat(this.sel.var.value);
    const a1 = parseFloat(this.sel.a1.value);
    const a2 = parseFloat(this.sel.a2.value);
    try {
      this.statsEl.textContent = 'Simulation en cours…';
      const [c1, c2] = await Promise.all([
        gpoly.simulerChamp(modele, a1, CONFIG.pepite, this.seed,    CONFIG.N,
                            loi, moyenne, variance),
        gpoly.simulerChamp(modele, a2, CONFIG.pepite, this.seed + 1, CONFIG.N,
                            loi, moyenne, variance),
      ]);
      // Appariement d'histogramme : le champ longue portée reçoit EXACTEMENT la
      // distribution ponctuelle du champ courte portée. À l'échelle 1×1, les deux
      // gisements ont alors la même distribution statistique (et le même nombre de
      // pixels) ; seules leurs structures spatiales (portées) diffèrent.
      this.champ1 = c1;
      this.champ2 = await gpoly.apparierHistogramme(c1, c2);
      // Échelle FIXE = quantiles 1 %–99 % du champ PONCTUEL (1×1). Elle ne change
      // plus avec la taille de bloc : on voit ainsi la distribution se resserrer.
      const sorted = Array.from(this.champ1).sort((p, q) => p - q);
      const qtl = (p) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(p * (sorted.length - 1))))];
      this.colorMin = qtl(0.01);
      this.colorMax = qtl(0.99);
      await this.redessiner();
    } catch (e) {
      this.afficherAvertissement('Erreur simulation : ' + e.message);
    }
  }

  /** Re-aggregre au support choisi et trace. */
  async redessiner() {
    if (!this.champ1 || !this.champ2) return;
    const N = CONFIG.N;
    const b = parseInt(this.sel.bloc.value, 10);
    let r1, r2;
    try {
      // Blocs DISJOINTS : chaque bloc b×b = moyenne de ses cellules 1×1
      // (vrai changement de support, pas une moyenne mobile glissante).
      [r1, r2] = await Promise.all([
        gpoly.agregerChampBlocs(this.champ1, N, b),
        gpoly.agregerChampBlocs(this.champ2, N, b),
      ]);
    } catch (e) {
      this.afficherAvertissement('Erreur aggregation : ' + e.message);
      return;
    }

    // Reshape Float arrays -> matrices pour Plotly
    const reshape = (flat, rows, cols) => {
      const m = new Array(rows);
      for (let i = 0; i < rows; i++) {
        m[i] = Array.from(flat.slice(i * cols, (i + 1) * cols));
      }
      return m;
    };
    const M1 = reshape(r1.agg, r1.rows, r1.cols);
    const M2 = reshape(r2.agg, r2.rows, r2.cols);

    // Histogrammes : 20 bins FIXES sur la plage de couleur (constante pour tous
    // les supports) — la forme reste comparable d'un bloc à l'autre, et on voit
    // la distribution se resserrer. (Binning = simple comptage, pas de géostat.)
    const N_BINS = 20;
    const lo = this.colorMin, hi = this.colorMax, span = (hi - lo) || 1;
    const centres = Array.from({ length: N_BINS }, (_, i) => lo + span * (i + 0.5) / N_BINS);
    const binIt = (arr) => {
      const c = new Array(N_BINS).fill(0), tot = arr.length || 1;
      // On EXCLUT les valeurs hors [lo, hi] (au lieu de les rabattre dans les
      // bins de bord, ce qui gonflait artificiellement le premier et le dernier).
      for (const v of arr) { const k = Math.floor((v - lo) / span * N_BINS); if (k < 0 || k >= N_BINS) continue; c[k]++; }
      return c.map(x => x / tot);
    };
    const centres1 = centres, centres2 = centres;
    const d1 = binIt(r1.agg), d2 = binIt(r2.agg);

    // Statistiques descriptives (delegues a la VRAIE librairie).
    let s1, s2;
    try {
      [s1, s2] = await Promise.all([
        gpoly.statistiquesDescriptives(r1.agg),
        gpoly.statistiquesDescriptives(r2.agg),
      ]);
    } catch (e) { this.afficherAvertissement('Erreur stats : ' + e.message); return; }

    // Valeur affichee
    const a1 = parseFloat(this.sel.a1.value);
    const a2 = parseFloat(this.sel.a2.value);
    // Échelle FIXE (quantiles 1–99 % du champ ponctuel), identique pour tous les blocs.
    const vminColor = this.colorMin, vmaxColor = this.colorMax;

    if (!window.Plotly) { this.afficherAvertissement('Plotly non chargé.'); return; }

    // Fonctions de répartition empiriques (ECDF) : simple tri des valeurs de bloc
    // déjà calculées par la librairie (aucune mathématique géostatistique en JS).
    const ecdf = (flat) => { const a = Array.from(flat).sort((p, q) => p - q); const n = a.length; return { x: a, y: a.map((_, i) => (i + 1) / n) }; };
    const e1 = ecdf(r1.agg), e2 = ecdf(r2.agg);
    const moy = s1.moyenne;   // moyenne préservée par l'agrégation (référence)

    Plotly.react(this.plot, [
      // Cartes (coordonnées en mètres : 1 cellule ponctuelle = 1 m, bloc = b m)
      { type: 'heatmap', z: M1, x0: b / 2, dx: b, y0: b / 2, dy: b,
        colorscale: TURBO, zmin: vminColor, zmax: vmaxColor,
        showscale: false, xaxis: 'x', yaxis: 'y' },
      { type: 'heatmap', z: M2, x0: b / 2, dx: b, y0: b / 2, dy: b,
        colorscale: TURBO, zmin: vminColor, zmax: vmaxColor,
        showscale: true, colorbar: { x: 1.02, len: 0.4, y: 0.78, thickness: 12, title: { text: 'Valeur' } },
        xaxis: 'x2', yaxis: 'y2' },
      // Histogrammes (densités normalisées)
      { type: 'bar', x: centres1, y: d1, name: `a₁=${a1} (courte)`,
        marker: { color: COL_S, opacity: 0.7 }, xaxis: 'x3', yaxis: 'y3' },
      { type: 'bar', x: centres2, y: d2, name: `a₂=${a2} (longue)`,
        marker: { color: COL_L, opacity: 0.7 }, xaxis: 'x3', yaxis: 'y3' },
      // Fonctions de répartition cumulées
      { type: 'scatter', mode: 'lines', x: e1.x, y: e1.y, line: { color: COL_S, width: 2 },
        xaxis: 'x4', yaxis: 'y4', showlegend: false },
      { type: 'scatter', mode: 'lines', x: e2.x, y: e2.y, line: { color: COL_L, width: 2 },
        xaxis: 'x4', yaxis: 'y4', showlegend: false },
    ], {
      barmode: 'overlay',
      showlegend: true,
      legend: { orientation: 'h', y: -0.08, x: 0.5, xanchor: 'center', font: { size: 10 } },
      margin: { t: 40, b: 60, l: 50, r: 110 },
      annotations: [
        { text: `Portée courte a₁=${a1} — bloc ${b}×${b}`, x: 0.21, y: 1.02, xref: 'paper', yref: 'paper',
          showarrow: false, font: { size: 11 }, xanchor: 'center', yanchor: 'bottom' },
        { text: `Portée longue a₂=${a2} — bloc ${b}×${b}`, x: 0.78, y: 1.02, xref: 'paper', yref: 'paper',
          showarrow: false, font: { size: 11 }, xanchor: 'center', yanchor: 'bottom' },
        { text: 'Histogrammes (valeurs de bloc)', x: 0.235, y: 0.46, xref: 'paper', yref: 'paper',
          showarrow: false, font: { size: 11 }, xanchor: 'center', yanchor: 'bottom' },
        { text: 'Fonctions de répartition (ECDF)', x: 0.785, y: 0.46, xref: 'paper', yref: 'paper',
          showarrow: false, font: { size: 11 }, xanchor: 'center', yanchor: 'bottom' },
      ],
      shapes: [
        // Ligne de moyenne (préservée) sur l'histogramme et l'ECDF
        { type: 'line', xref: 'x3', yref: 'paper', x0: moy, x1: moy, y0: 0, y1: 0.42, line: { color: '#000', dash: 'dash', width: 1.4 } },
        { type: 'line', xref: 'x4', yref: 'paper', x0: moy, x1: moy, y0: 0, y1: 0.42, line: { color: '#000', dash: 'dash', width: 1.4 } },
      ],
      xaxis:  { domain: [0, 0.44],    anchor: 'y',  title: { text: 'X (m)', font: { size: 10 } }, range: [0, N], dtick: 50, tickfont: { size: 9 } },
      yaxis:  { domain: [0.6, 1],     anchor: 'x',  title: { text: 'Y (m)', font: { size: 10 } }, range: [N, 0], dtick: 50, tickfont: { size: 9 }, scaleanchor: 'x' },
      xaxis2: { domain: [0.56, 1],    anchor: 'y2', title: { text: 'X (m)', font: { size: 10 } }, range: [0, N], dtick: 50, tickfont: { size: 9 } },
      yaxis2: { domain: [0.6, 1],     anchor: 'x2', title: { text: 'Y (m)', font: { size: 10 } }, range: [N, 0], dtick: 50, tickfont: { size: 9 }, scaleanchor: 'x2' },
      xaxis3: { domain: [0.06, 0.45], anchor: 'y3', title: 'Valeur', range: [vminColor, vmaxColor] },
      yaxis3: { domain: [0, 0.42],    anchor: 'x3', title: 'Densité' },
      xaxis4: { domain: [0.58, 0.97], anchor: 'y4', title: 'Valeur', range: [vminColor, vmaxColor] },
      yaxis4: { domain: [0, 0.42],    anchor: 'x4', title: 'Fréq. cumulée', range: [0, 1] },
    }, { displaylogo: false, responsive: true });

    this.statsEl.innerHTML =
      `Support <b>${b}×${b}</b> — ` +
      `<span style="color:${COL_S}">a₁=${a1} : moyenne=${s1.moyenne.toFixed(3)}, σ²=${s1.variance.toFixed(4)}</span> &nbsp;|&nbsp; ` +
      `<span style="color:${COL_L}">a₂=${a2} : moyenne=${s2.moyenne.toFixed(3)}, σ²=${s2.variance.toFixed(4)}</span>`;
  }

  cleanup() { if (this.plot && window.Plotly) Plotly.purge(this.plot); }
}

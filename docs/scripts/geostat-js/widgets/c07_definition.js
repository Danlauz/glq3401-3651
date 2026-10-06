// scripts/geostat-js/widgets/c07_definition.js
// -----------------------------------------------------------------------------
// Widget C07 — Atelier « Lien nuage – covariance – variogramme »
// Calque du notebook Chap6_Definition. Placé en 07-03 (§ Relation avec la covariance).
//
//   - PANNEAU GAUCHE : nuage z(x) vs z(x+h) pour le décalage h courant, avec la
//     diagonale d'identité (noir pointillé) et un segment ROUGE le long de
//     l'anti-diagonale dont la longueur vaut 2·γ(h). Titre = cov, ρ, γ(h).
//   - PANNEAU DROIT  : évolution avec h de γ(h) (rouge), de la covariance (bleu)
//     et de la corrélation (vert), avec une ligne verticale au h sélectionné.
//
// Le champ vient de gpoly.simulerChamp (GFFTMA). Chaque LIGNE du champ est un
// transect 1D : on regroupe toutes les paires (z[i], z[i+h]) le long de x. Le
// calcul cov/corr/γ d'un couple de tableaux est de la statistique élémentaire
// (mise en forme), pas un algorithme géostatistique.
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

const debounce = (fn, ms = 200) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

const CONFIG = { N: 500, h_max: 100 };

export default class C07Definition extends Widget {
  render() {
    this.el.insertAdjacentHTML('beforeend', `
      <div class="gw-controls" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;">
        <label>Modèle <select class="js-mod">
          <option value="spherique">Sphérique</option>
          <option value="exponentiel">Exponentiel</option>
          <option value="gaussien">Gaussien</option>
          <option value="pepite">Effet de pépite</option>
        </select></label>
        <label>Portée a
          <input type="range" class="js-a" min="5" max="100" value="60" step="1" style="width:120px"><span class="js-av">60</span></label>
        <label>Variance
          <input type="range" class="js-var" min="0.2" max="2" value="1.5" step="0.1" style="width:100px"><span class="js-varv">1.5</span></label>
        <label>Décalage h
          <input type="range" class="js-h" min="1" max="100" value="5" step="1" style="width:140px"><span class="js-hv">5</span></label>
        <button class="js-regen" type="button" style="font-size:.76rem;padding:3px 8px;background:#3a3632;color:#fff;border:none;border-radius:4px;cursor:pointer;">Nouvelle simulation</button>
      </div>
      <div class="js-plot" style="height:360px"></div>
      <div style="display:flex;flex-direction:column;gap:3px;align-items:center;font-size:.78rem;color:#333;margin:4px 0 2px;">
        <div style="display:flex;gap:18px;flex-wrap:wrap;justify-content:center;">
          <span><span style="display:inline-block;width:18px;border-top:3px solid #CC0000;vertical-align:middle"></span> Variogramme γ(h)</span>
          <span><span style="display:inline-block;width:18px;border-top:3px solid #0173B2;vertical-align:middle"></span> Covariance C(h)</span>
          <span><span style="display:inline-block;width:18px;border-top:3px dotted #2e7d32;vertical-align:middle"></span> Corrélation ρ(h)</span>
        </div>
        <div style="display:flex;gap:18px;flex-wrap:wrap;justify-content:center;">
          <span><span style="display:inline-block;width:18px;border-top:3px solid #000;vertical-align:middle"></span> Droite 1:1</span>
          <span><span style="display:inline-block;width:18px;border-top:6px solid #CC0000;vertical-align:middle"></span> Dispersion ⟂ (∝ γ(h))</span>
        </div>
      </div>
      <div class="js-stats" style="display:flex;justify-content:center;gap:18px;flex-wrap:wrap;padding:.5rem 1rem;margin-top:4px;background:#f4f4f4;border-radius:8px;font-family:'JetBrains Mono',monospace;font-size:.86rem;"></div>
    `);

    this.plot = this.el.querySelector('.js-plot');
    this.statsEl = this.el.querySelector('.js-stats');
    this.ctrl = {
      mod: this.el.querySelector('.js-mod'),
      a:   this.el.querySelector('.js-a'),
      var: this.el.querySelector('.js-var'),
      h:   this.el.querySelector('.js-h'),
    };
    this.seed = 1542;

    const onSim = debounce(() => this.regenerer(), 250);
    for (const k of ['a', 'var', 'h']) {
      this.on(this.ctrl[k], 'input', e => { this.el.querySelector(`.js-${k}v`).textContent = e.target.value; });
    }
    this.on(this.ctrl.mod, 'change', onSim);
    this.on(this.ctrl.a, 'change', onSim);
    this.on(this.ctrl.var, 'change', onSim);
    // Le décalage h ne change que l'affichage (pas la simulation).
    this.on(this.ctrl.h, 'input', debounce(() => { if (this._stat) this._dessiner(); }, 60));

    this.on(this.el.querySelector('.js-regen'), 'click', () => { this.seed = (this.seed + 1) | 0; this.regenerer(); });
    afficherChargementJusquaPret(this.el).then(() => this.regenerer());
  }

  async regenerer() {
    const N = CONFIG.N;
    const mod = this.ctrl.mod.value;
    const a = parseFloat(this.ctrl.a.value);
    const variance = parseFloat(this.ctrl.var.value);

    let champ;
    try {
      if (mod === 'pepite') champ = await gpoly.simulerChamp('spherique', 3, 1.0, this.seed, N, 'gaussien', 0.0, variance);
      else champ = await gpoly.simulerChamp(mod, a, 0.0, this.seed, N, 'gaussien', 0.0, variance);
    } catch (e) { this.afficherAvertissement('Erreur simulation : ' + e.message); return; }

    // Renormalisation EXACTE : moyenne 0 et variance v (champ gaussien propre,
    // sans fluctuation d'échantillonnage qui déforme le nuage).
    let mm = 0; for (let i = 0; i < champ.length; i++) mm += champ[i]; mm /= champ.length;
    let vv = 0; for (let i = 0; i < champ.length; i++) vv += (champ[i] - mm) ** 2; vv /= champ.length;
    const k = Math.sqrt(variance / (vv || 1));
    const norm = new Float64Array(champ.length);
    for (let i = 0; i < champ.length; i++) norm[i] = (champ[i] - mm) * k;

    // Chaque ligne = transect 1D le long de x ; on garde les lignes en mémoire.
    this._rows = new Array(N);
    for (let r = 0; r < N; r++) this._rows[r] = norm.subarray(r * N, r * N + N);
    this._N = N;

    // Statistiques empiriques cov/corr/γ pour chaque h (regroupement des paires).
    const hmax = Math.min(CONFIG.h_max, N - 5);
    // Pour les courbes : on sous-échantillonne les lignes (rapide, courbes lisses).
    const rowStep = Math.max(1, Math.floor(N / 150));
    const H = [], G = [], C = [], R = [];
    for (let h = 1; h <= hmax; h++) {
      const st = this._statPaires(h, rowStep);
      H.push(h); G.push(st.g); C.push(st.cov); R.push(st.corr);
    }
    this._stat = { H, G, C, R };
    this._dessiner();
  }

  // cov / corr / demi-variance sur toutes les paires (z[i], z[i+h]) de toutes les lignes.
  _statPaires(h, step = 1) {
    const N = this._N, rows = this._rows;
    let n = 0, sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0, sdd = 0;
    for (let r = 0; r < N; r += step) {
      const row = rows[r];
      for (let i = 0; i + h < N; i++) {
        const A = row[i], B = row[i + h];
        sa += A; sb += B; saa += A * A; sbb += B * B; sab += A * B; sdd += (A - B) * (A - B); n++;
      }
    }
    if (n === 0) return { g: 0, cov: 0, corr: 0 };
    const ma = sa / n, mb = sb / n;
    const cov = sab / n - ma * mb;
    const va = saa / n - ma * ma, vb = sbb / n - mb * mb;
    const corr = (va > 0 && vb > 0) ? cov / Math.sqrt(va * vb) : 0;
    return { g: 0.5 * sdd / n, cov, corr };
  }

  _dessiner() {
    const N = this._N, rows = this._rows, { H, G, C, R } = this._stat;
    const h = parseInt(this.ctrl.h.value, 10);
    const st = this._statPaires(h);

    // Moyenne / écart-type du champ (pour le cadrage et C(0) = variance).
    let m = 0, v = 0, nn = 0;
    for (let r = 0; r < N; r++) { const row = rows[r]; for (let i = 0; i < N; i++) { m += row[i]; nn++; } }
    m /= nn;
    for (let r = 0; r < N; r++) { const row = rows[r]; for (let i = 0; i < N; i++) { v += (row[i] - m) ** 2; } }
    const sd = Math.sqrt(v / nn), L = 3.3 * sd, C0 = v / nn;

    // Échantillon du nuage (z[i], z[i+h]) — SVG (scatter) pour rester SOUS la droite 1:1.
    const zx = [], zy = [];
    const step = Math.max(1, Math.floor((N * (N - h)) / 1300));
    let c = 0;
    for (let r = 0; r < N; r++) { const row = rows[r]; for (let i = 0; i + h < N; i++) { if ((c++ % step) === 0) { zx.push(row[i]); zy.push(row[i + h]); } } }

    // Segment rouge anti-diagonal, centré sur (m, m), de longueur ∝ γ(h)
    // (facteur visuel pour le rendre bien lisible).
    const SCALE = 2.2;
    const d = SCALE * st.g / Math.SQRT2;
    const segX = [m + d, m - d], segY = [m - d, m + d];

    if (!window.Plotly) { this.afficherAvertissement('Plotly non chargé.'); return; }
    const hMaxR = Math.max(...H);
    Plotly.react(this.plot, [
      // ----- GAUCHE : nuage (SVG, dessous) puis 1:1 et dispersion (dessus) -----
      { type: 'scatter', x: zx, y: zy, mode: 'markers', name: 'Couples (z(x), z(x+h))',
        marker: { color: 'rgba(70,110,200,0.35)', size: 4 }, xaxis: 'x', yaxis: 'y', hoverinfo: 'skip', showlegend: false },
      { type: 'scatter', x: [m - L, m + L], y: [m - L, m + L], mode: 'lines', name: 'Droite 1:1',
        line: { color: '#000', width: 2.5 }, xaxis: 'x', yaxis: 'y' },
      { type: 'scatter', x: segX, y: segY, mode: 'lines', name: 'Dispersion ⟂ (∝ γ(h))',
        line: { color: '#CC0000', width: 6 }, xaxis: 'x', yaxis: 'y' },
      // ----- DROITE : évolution γ / cov / corr (lignes + marqueurs) -----
      { type: 'scatter', x: H, y: G, mode: 'lines+markers', name: 'Variogramme γ(h)',
        line: { color: '#CC0000', width: 2.5 }, marker: { size: 4 }, xaxis: 'x2', yaxis: 'y2' },
      { type: 'scatter', x: H, y: C, mode: 'lines+markers', name: 'Covariance C(h)',
        line: { color: '#0173B2', width: 2.5 }, marker: { size: 4 }, xaxis: 'x2', yaxis: 'y2' },
      { type: 'scatter', x: H, y: R, mode: 'lines', name: 'Corrélation ρ(h)',
        line: { color: '#2e7d32', width: 2, dash: 'dot' }, xaxis: 'x2', yaxis: 'y2' },
    ], {
      margin: { t: 36, l: 52, r: 14, b: 40 },
      showlegend: false,
      annotations: [
        { text: 'Nuage z(x) vs z(x+h)', x: 0.2, y: 1.03, xref: 'paper', yref: 'paper', showarrow: false, font: { size: 12 }, xanchor: 'center', yanchor: 'bottom' },
        { text: 'Évolution avec la distance h', x: 0.82, y: 1.03, xref: 'paper', yref: 'paper', showarrow: false, font: { size: 12 }, xanchor: 'center', yanchor: 'bottom' },
      ],
      shapes: [
        // h courant (vertical) et palier C(0)=variance (horizontal) à droite.
        { type: 'line', xref: 'x2', yref: 'paper', x0: h, x1: h, y0: 0, y1: 1, line: { color: '#888', width: 1.2, dash: 'dash' } },
        { type: 'line', xref: 'x2', yref: 'y2', x0: 0, x1: hMaxR, y0: C0, y1: C0, line: { color: '#bbb', width: 1, dash: 'dot' } },
      ],
      xaxis:  { domain: [0, 0.42], anchor: 'y', title: { text: 'z(x)', font: { size: 10 } }, range: [m - L, m + L], zeroline: false, tickfont: { size: 8 } },
      yaxis:  { domain: [0, 1], anchor: 'x', title: { text: 'z(x+h)', font: { size: 10 } }, range: [m - L, m + L], scaleanchor: 'x', constrain: 'domain', zeroline: false, tickfont: { size: 8 } },
      xaxis2: { domain: [0.56, 1], anchor: 'y2', title: { text: 'Distance h', font: { size: 10 } }, range: [0, hMaxR], tickfont: { size: 8 } },
      yaxis2: { domain: [0, 1], anchor: 'x2', zeroline: true, tickfont: { size: 8 } },
    }, { displaylogo: false, responsive: true });

    // Valeurs sous le graphique.
    const chip = (lab, val, col) => `<span><b style="color:${col}">${lab}</b> = ${val}</span>`;
    this.statsEl.innerHTML =
      chip(`C(h=${h})`, st.cov.toFixed(3), '#0173B2') +
      chip(`ρ(h=${h})`, st.corr.toFixed(3), '#2e7d32') +
      chip(`γ(h=${h})`, st.g.toFixed(3), '#CC0000');
  }

  cleanup() { if (this.plot && window.Plotly) Plotly.purge(this.plot); }
}

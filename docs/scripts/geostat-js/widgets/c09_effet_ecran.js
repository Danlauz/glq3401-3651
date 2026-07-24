// scripts/geostat-js/widgets/c09_effet_ecran.js
// -----------------------------------------------------------------------------
// Widget C09.4 — Effet d'ecran : cible mobile 1D, poids animes.
//
// Pedagogie : 4 donnees alignees sur l'axe x. On deplace la cible x0 le long
// du transect avec un slider. Les poids λ_i s'actualisent en temps reel et
// sont affiches comme des CERCLES proportionnels a |λ_i| (bleu pour positif,
// rouge pour negatif).
//
// On observe :
//   - Lorsque x0 est PRES d'une donnee, son poids domine.
//   - Lorsque x0 est ENTRE deux donnees, les deux voisins immediats
//     « ecrantent » les donnees plus eloignees (effet d'ecran).
//   - Plus la pepite c0 est elevee, plus les poids s'EGALISENT.
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

const debounce = (fn, ms = 100) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

// 4 donnees alignees
const DONNEES = [
  { x: 15, z: 5 }, { x: 35, z: 8 }, { x: 60, z: 4 }, { x: 85, z: 7 },
];

export default class C09EffetEcran extends Widget {
  render() {
    this.el.insertAdjacentHTML('beforeend', `
      <div class="gw-controls" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;">
        <label>Modèle <select class="js-mod">
          <option value="spherique">Sphérique</option>
          <option value="exponentiel">Exponentiel</option>
          <option value="gaussien">Gaussien</option>
        </select></label>
        <label>Portée a
          <input type="range" class="js-a" min="5" max="80" value="30" step="1" style="width:140px">
          <span class="js-av">30</span></label>
        <label>Pépite c₀
          <input type="range" class="js-c0" min="0" max="0.8" value="0" step="0.02" style="width:120px">
          <span class="js-c0v">0.00</span></label>
        <label>Type
          <select class="js-type">
            <option value="ordinaire">KO</option>
            <option value="simple">KS (m=z̄)</option>
          </select></label>
        <label><b>Cible x₀</b>
          <input type="range" class="js-x0" min="0" max="100" value="22" step="0.5" style="width:240px">
          <span class="js-x0v">22</span></label>
      </div>
      <div class="js-plot" style="height:260px"></div>
      <div class="js-info" style="padding:.4rem 1rem;font-family:'JetBrains Mono',monospace;font-size:.82rem;color:#444;text-align:center;background:#f0f0f0;border-radius:6px;margin-top:4px;">—</div>
      <p style="margin:4px 1rem;font-size:11px;color:#666;">
        Déplacez x₀ : observez comment les voisins immédiats « écrantent »
        les points plus éloignés. Avec pépite élevé, l'effet d'écran disparaît.</p>
    `);

    this.plot = this.el.querySelector('.js-plot');
    this.infoEl = this.el.querySelector('.js-info');
    this.ctrl = {
      mod: this.el.querySelector('.js-mod'),
      a:  this.el.querySelector('.js-a'),
      c0: this.el.querySelector('.js-c0'),
      type: this.el.querySelector('.js-type'),
      x0: this.el.querySelector('.js-x0'),
    };
    const update = debounce(() => this.refresh(), 80);
    for (const [k, el] of Object.entries(this.ctrl)) {
      if (el.type === 'range') {
        this.on(el, 'input', e => {
          this.el.querySelector(`.js-${k}v`).textContent = e.target.value;
        });
        this.on(el, 'input', update);
      } else {
        this.on(el, 'change', update);
      }
    }
    afficherChargementJusquaPret(this.el).then(() => this.refresh());
  }

  async refresh() {
    const mod = this.ctrl.mod.value;
    const a  = parseFloat(this.ctrl.a.value);
    const c0 = parseFloat(this.ctrl.c0.value);
    const type = this.ctrl.type.value;
    const x0 = parseFloat(this.ctrl.x0.value);
    const palier = Math.max(0.001, 1.0 - c0);
    const structs = [{ modele: mod, palier, portee: a }];
    const xd = DONNEES.map(d => [d.x]);
    const zd = DONNEES.map(d => d.z);
    const zbar = zd.reduce((s, v) => s + v, 0) / zd.length;

    let r;
    try {
      if (type === 'simple') {
        r = await gpoly.krigeageSimple(xd, zd, [[x0]], structs, c0, zbar);
      } else {
        r = await gpoly.krigeageOrdinaire(xd, zd, [[x0]], structs, c0);
      }
    } catch (e) { this.afficherAvertissement('Erreur : ' + e.message); return; }
    const lam = r.lambda;
    const z_star = r.estimations[0];
    const sigma2 = r.variances[0];

    // Taille des cercles ∝ |λ|
    const maxAbs = Math.max(...lam.map(Math.abs), 0.01);
    const sizes = lam.map(l => 12 + 35 * Math.abs(l) / maxAbs);
    const colors = lam.map(l => l >= 0 ? '#2563eb' : '#c43a3a');
    const labels = lam.map((l, i) => `λ${i+1}=${l.toFixed(3)}`);

    if (!window.Plotly) { this.afficherAvertissement('Plotly non chargé.'); return; }
    Plotly.react(this.plot, [
      // Lignes vers la cible (intensite proportionnelle a |λ|)
      ...lam.map((l, i) => ({
        x: [DONNEES[i].x, x0], y: [0, 0], mode: 'lines',
        line: { color: l >= 0 ? 'rgba(37,99,235,0.4)' : 'rgba(196,58,58,0.4)',
                width: 1 + 3 * Math.abs(l) / maxAbs },
        showlegend: false, hoverinfo: 'skip',
      })),
      // Cercles aux donnees (taille = poids)
      { x: DONNEES.map(d => d.x), y: DONNEES.map(() => 0),
        mode: 'markers+text',
        marker: { size: sizes, color: colors, line: { color: '#333', width: 1 } },
        text: labels, textposition: 'top center', textfont: { size: 10 },
        name: 'λ_i', hoverinfo: 'text' },
      // Cible
      { x: [x0], y: [0], mode: 'markers+text',
        marker: { symbol: 'x', size: 18, color: '#222', line: { width: 3 } },
        text: ['cible x₀'], textposition: 'bottom center', textfont: { size: 11 },
        name: 'cible', hoverinfo: 'skip' },
    ], {
      margin: { t: 50, l: 30, r: 20, b: 30 },
      xaxis: { range: [-5, 105], title: 'x', dtick: 10 },
      yaxis: { range: [-0.5, 0.5], showticklabels: false, zeroline: true, zerolinewidth: 1, zerolinecolor: '#888' },
      showlegend: false,
      title: { text: `Poids λᵢ pour cible x₀=${x0.toFixed(1)} — (bleu = λ>0, rouge = λ<0)`,
                font: { size: 12 } },
    }, { displaylogo: false, responsive: true });

    const sumL = lam.reduce((s, v) => s + v, 0);
    const constraintInfo = type === 'ordinaire' ?
      `Σλᵢ = ${sumL.toFixed(4)} (=1 contrainte)` : `Σλᵢ = ${sumL.toFixed(4)} (libre)`;
    this.infoEl.innerHTML =
      `Z*(x₀=${x0.toFixed(1)}) = <b>${z_star.toFixed(3)}</b> · ` +
      `σ²_K = <b>${sigma2.toFixed(4)}</b> · ${constraintInfo}`;
  }

  cleanup() { if (this.plot && window.Plotly) Plotly.purge(this.plot); }
}

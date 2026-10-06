// scripts/geostat-js/widgets/c10_LMC.js
// -----------------------------------------------------------------------------
// Widget C10 — Modèle linéaire de corégionalisation (LMC / MLC).
//
// Le modèle s'écrit comme une SOMME de structures, chacune portant une matrice
// de paliers Bₖ (matrice de corégionalisation) :
//
//        Γ(h) = B₁ γ₁(h) + B₂ γ₂(h) + …     avec  Bₖ = [[b₁₁, b₁₂],
//                                                        [b₁₂, b₂₂]]
//
// On édite directement les coefficients de chaque Bₖ (b₂₁ suit b₁₂ pour la
// symétrie), on ajoute/retire des structures imbriquées, et on visualise les
// variogrammes direct (γ₁₁, γ₂₂) et croisé (γ₁₂) résultants. Chaque Bₖ doit
// être semi-définie positive : b₁₂² ≤ b₁₁·b₂₂ (condition suffisante du LMC).
//
// γ évalués via gpoly.variogrammeTheorique (geostat_polymtl.cov_func.covar).
// -----------------------------------------------------------------------------
import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

const debounce = (fn, ms = 160) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const TYPES = [['pepite', 'Effet de pépite'], ['spherique', 'Sphérique'], ['exponentiel', 'Exponentiel'], ['gaussien', 'Gaussien']];
const COL = { g11: '#2563eb', g22: '#ea580c', g12: '#16a34a' };

export default class C10LMC extends Widget {
  render() {
    // Exemple par défaut : PÉPITE + SPHÉRIQUE, corrélation NÉGATIVE (B₁₂ < 0) → γ_ZY < 0.
    this.structures = [
      { modele: 'pepite', portee: 1, b11: 0.3, b22: 0.2, b12: -0.2 },
      { modele: 'spherique', portee: 30, b11: 0.7, b22: 0.8, b12: -0.5 },
    ];
    const id = this.el.id;
    this.el.insertAdjacentHTML('beforeend', `
      <style>
        #${id} .lmc-card{display:inline-flex;flex-direction:column;gap:5px;padding:9px 11px;background:#fafafa;border:1px solid #d8d8d8;border-radius:8px;margin:4px;vertical-align:middle;}
        #${id} .lmc-head{display:flex;gap:5px;align-items:center;font-size:.74rem;color:#555;}
        #${id} .lmc-head select,#${id} .lmc-head input{font-size:.74rem;padding:1px 3px;border:1px solid #c7ccd1;border-radius:4px;}
        #${id} .lmc-mat{border-collapse:collapse;font-size:.78rem;}
        #${id} .lmc-mat th{font-size:.7rem;color:#888;font-weight:600;padding:0 2px;}
        #${id} .lmc-mat input{width:50px;text-align:right;padding:2px 4px;border:1px solid #c7ccd1;border-radius:4px;font-size:.78rem;}
        #${id} .lmc-mat .mirror{background:#eef1f4;color:#555;}
        #${id} .lmc-op{display:inline-flex;align-items:center;font-size:1.4rem;color:#888;margin:0 2px;}
        #${id} .lmc-badge{font-size:.68rem;border-radius:3px;padding:1px 5px;text-align:center;}
        #${id} .lmc-mini{font-size:.78rem;padding:4px 11px;color:#fff;border:none;border-radius:5px;cursor:pointer;}
      </style>
      <div style="font-size:.84rem;color:#333;margin:2px 4px 6px;"><b>Γ(h) =</b> somme des structures <b>B<sub>k</sub>·γ<sub>k</sub>(h)</b> — saisissez chaque matrice de corégionalisation B<sub>k</sub> (la cellule B<sub>YZ</sub> recopie B<sub>ZY</sub>) :</div>
      <div class="js-decomp" style="display:flex;flex-wrap:wrap;align-items:center;"></div>
      <div style="margin:6px 4px;"><button class="js-add lmc-mini" type="button" style="background:#4a6a3a;">+ Ajouter un modèle (structure imbriquée)</button></div>
      <div class="js-plot" style="height:330px;margin-top:6px"></div>
      <div class="js-info" style="padding:.4rem 1rem;font-size:.82rem;color:#333;text-align:center;background:#eef2f7;border:1px solid #c4d2e0;border-radius:6px;margin-top:4px;">—</div>
      <p style="margin:4px 1rem;font-size:11px;color:#666;">
        Chaque Bₖ doit être semi-définie positive (b₁₂² ≤ b₁₁·b₂₂). Le variogramme croisé γ₁₂ peut être négatif (corrélation négative). La portée et le type de structure pilotent la forme γₖ(h) ; la matrice Bₖ pilote les paliers et la corrélation à cette échelle.</p>
    `);
    this.plot = this.el.querySelector('.js-plot');
    this.infoEl = this.el.querySelector('.js-info');
    this.on(this.el.querySelector('.js-add'), 'click', () => {
      this.structures.push({ modele: 'spherique', portee: 20, b11: 0.3, b22: 0.3, b12: 0.15 });
      this.renderDecomp(); this.refresh();
    });
    this.renderDecomp();
    afficherChargementJusquaPret(this.el).then(() => this.refresh());
  }

  renderDecomp() {
    const wrap = this.el.querySelector('.js-decomp');
    wrap.innerHTML = this.structures.map((s, i) => {
      const card = `<div class="lmc-card">
        <div class="lmc-head">
          <b style="color:#333;">B<sub>${i + 1}</sub></b>
          <select data-i="${i}" data-f="modele">${TYPES.map(([v, n]) => `<option value="${v}"${v === s.modele ? ' selected' : ''}>${n}</option>`).join('')}</select>
          ${s.modele === 'pepite' ? '' : `a=<input type="number" data-i="${i}" data-f="portee" value="${s.portee}" step="1" style="width:42px;">`}
          ${this.structures.length > 1 ? `<button class="js-del lmc-mini" data-i="${i}" type="button" style="background:#c44;padding:2px 6px;">×</button>` : ''}
        </div>
        <table class="lmc-mat">
          <tr><th></th><th>Z</th><th>Y</th></tr>
          <tr><th>Z</th>
            <td><input type="number" title="B_ZZ" data-i="${i}" data-f="b11" value="${s.b11}" step="0.05"></td>
            <td><input type="number" title="B_ZY" data-i="${i}" data-f="b12" value="${s.b12}" step="0.05"></td></tr>
          <tr><th>Y</th>
            <td><input type="number" class="mirror" title="B_YZ = B_ZY" data-i="${i}" data-f="b21" value="${s.b12}" step="0.05"></td>
            <td><input type="number" title="B_YY" data-i="${i}" data-f="b22" value="${s.b22}" step="0.05"></td></tr>
        </table>
        <div class="lmc-badge js-badge-${i}"></div>
      </div>`;
      const op = i < this.structures.length - 1 ? `<span class="lmc-op">+</span>` : '';
      return card + op;
    }).join('');

    const upd = debounce(() => this.refresh(), 160);
    wrap.querySelectorAll('select,input').forEach(el => this.on(el, 'input', e => {
      const i = +e.target.dataset.i, f = e.target.dataset.f;
      if (f === 'modele') { this.structures[i].modele = e.target.value; this.refresh(); return; }
      const v = parseFloat(e.target.value) || 0;
      if (f === 'b12' || f === 'b21') {
        this.structures[i].b12 = v;
        // Synchroniser les deux cellules hors diagonale (symétrie).
        this.el.querySelectorAll(`input[data-i="${i}"][data-f="b12"], input[data-i="${i}"][data-f="b21"]`).forEach(inp => { if (inp !== e.target) inp.value = v; });
      } else { this.structures[i][f] = v; }
      upd();
    }));
    wrap.querySelectorAll('.js-del').forEach(b => this.on(b, 'click', e => { this.structures.splice(+e.target.dataset.i, 1); this.renderDecomp(); this.refresh(); }));
  }

  async refresh() {
    const h_max = 2 * Math.max(...this.structures.map(s => s.portee), 10);
    const lags = []; for (let i = 0; i <= 90; i++) lags.push(i * h_max / 90);
    const g11 = new Array(lags.length).fill(0), g22 = new Array(lags.length).fill(0), g12 = new Array(lags.length).fill(0);

    let allPSD = true;
    try {
      for (let k = 0; k < this.structures.length; k++) {
        const s = this.structures[k];
        let t11, t22, t12;
        if (s.modele === 'pepite') {
          // Effet de pépite : γ(h) = palier pour h > 0, 0 à h = 0.
          t11 = lags.map(h => h <= 1e-9 ? 0 : s.b11);
          t22 = lags.map(h => h <= 1e-9 ? 0 : s.b22);
          t12 = lags.map(h => h <= 1e-9 ? 0 : s.b12);
        } else {
          const a = Math.max(1, s.portee);
          [t11, t22, t12] = await Promise.all([
            gpoly.variogrammeTheorique(s.modele, lags, a, s.b11),
            gpoly.variogrammeTheorique(s.modele, lags, a, s.b22),
            gpoly.variogrammeTheorique(s.modele, lags, a, s.b12),
          ]);
        }
        for (let i = 0; i < lags.length; i++) { g11[i] += t11[i]; g22[i] += t22[i]; g12[i] += t12[i]; }
        const psd = (s.b11 >= 0 && s.b22 >= 0 && s.b12 * s.b12 <= s.b11 * s.b22 + 1e-9);
        if (!psd) allPSD = false;
        const badge = this.el.querySelector(`.js-badge-${k}`);
        if (badge) {
          badge.textContent = psd ? '✓ admissible' : '✗ B non SDP';
          badge.style.background = psd ? '#dcefe0' : '#f6d6d6';
          badge.style.color = psd ? '#1f6f3f' : '#a12';
        }
      }
    } catch (e) { this.afficherAvertissement('Erreur : ' + e.message); return; }

    if (!window.Plotly) { this.afficherAvertissement('Plotly non chargé.'); return; }
    // Enveloppe de Cauchy-Schwarz : |γ_ZY(h)| ≤ √(γ_ZZ(h)·γ_YY(h)).
    const envU = g11.map((v, i) => Math.sqrt(Math.max(0, v * g22[i])));
    const envL = envU.map(v => -v);
    // Échelle : ± le plus grand palier (max des deux variogrammes directs).
    const yM = 1.08 * Math.max(...g11, ...g22, 1e-6);
    Plotly.react(this.plot, [
      { x: lags, y: envU, mode: 'lines', name: 'enveloppe ±√(γ<sub>ZZ</sub>·γ<sub>YY</sub>)', line: { color: '#999', width: 1, dash: 'dot' } },
      { x: lags, y: envL, mode: 'lines', line: { color: '#999', width: 1, dash: 'dot' }, fill: 'tonexty', fillcolor: 'rgba(150,150,150,0.10)', showlegend: false, hoverinfo: 'skip' },
      { x: lags, y: g11, mode: 'lines', name: 'γ<sub>ZZ</sub> (direct, Z)', line: { color: COL.g11, width: 2.5 } },
      { x: lags, y: g22, mode: 'lines', name: 'γ<sub>YY</sub> (direct, Y)', line: { color: COL.g22, width: 2.5 } },
      { x: lags, y: g12, mode: 'lines', name: 'γ<sub>ZY</sub> (croisé)', line: { color: COL.g12, width: 2.5, dash: 'solid' } },
      { x: [0, h_max], y: [0, 0], mode: 'lines', line: { color: '#bbb', width: 1 }, showlegend: false, hoverinfo: 'skip' },
    ], {
      margin: { t: 28, l: 54, r: 16, b: 56 },
      title: { text: 'Variogrammes direct et croisé du LMC', font: { size: 12 }, y: 0.97 },
      xaxis: { title: { text: 'distance h', standoff: 8 }, range: [0, h_max], automargin: true },
      yaxis: { title: { text: 'γ(h)', standoff: 8 }, range: [-yM, yM], zeroline: true, zerolinecolor: '#bbb', automargin: true },
      legend: { orientation: 'h', y: -0.24, x: 0.5, xanchor: 'center', font: { size: 9 } },
    }, { displaylogo: false, responsive: true, displayModeBar: false });

    // Paliers totaux (somme des Bₖ) + corrélation globale.
    const B11 = this.structures.reduce((a, s) => a + s.b11, 0);
    const B22 = this.structures.reduce((a, s) => a + s.b22, 0);
    const B12 = this.structures.reduce((a, s) => a + s.b12, 0);
    const rho = B12 / Math.sqrt(Math.max(1e-12, B11 * B22));
    this.infoEl.innerHTML =
      `Paliers totaux : C<sub>ZZ</sub>=<b>${B11.toFixed(2)}</b> · C<sub>YY</sub>=<b>${B22.toFixed(2)}</b> · C<sub>ZY</sub>=<b>${B12.toFixed(2)}</b> · ρ global=<b>${rho.toFixed(2)}</b><br>` +
      `<span style="font-size:.8rem">${this.structures.length} structure(s) · ` +
      (allPSD ? '<b style="color:#1f6f3f">LMC admissible</b> (chaque Bₖ est SDP)' : '<b style="color:#a12">non admissible</b> : au moins une Bₖ n\'est pas SDP') + `</span>`;
  }

  cleanup() { if (this.plot && window.Plotly) Plotly.purge(this.plot); }
}

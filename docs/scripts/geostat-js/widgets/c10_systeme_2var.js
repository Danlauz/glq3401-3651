// scripts/geostat-js/widgets/c10_systeme_2var.js
// -----------------------------------------------------------------------------
// Widget C10.4 — Systeme de cokrigeage pas a pas (2 variables).
// Affiche A, b, lambda pour un seul point cible avec 2 variables.
// -----------------------------------------------------------------------------
import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';
const debounce = (fn, ms = 150) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const cellStyle = `border:1px solid #ccc;padding:2px 5px;text-align:right;min-width:42px;font-size:.74rem;`;

export default class C10Systeme2Var extends Widget {
  render() {
    this.donnees = [
      { x: 0, y: 0, z1: 4, z2: 2 },
      { x: 10, y: 0, z1: 6, z2: 3 },
      { x: 0, y: 10, z1: 5, z2: 2.5 },
    ];
    this.cible = [5, 5];
    this.el.insertAdjacentHTML('beforeend', `
      <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;">
        <div><b>Données :</b><div class="js-data-tbl" style="display:inline-block;margin-left:6px;"></div>
          <button class="js-add" style="font-size:.74rem;padding:2px 6px;background:#4a6a3a;color:#fff;border:none;border-radius:3px;">+</button>
          <button class="js-del" style="font-size:.74rem;padding:2px 6px;background:#c44;color:#fff;border:none;border-radius:3px;">−</button></div>
        <label>Cible x₀ <input type="number" class="js-x0" value="5" step="0.5" style="width:50px;">,
          <input type="number" class="js-y0" value="5" step="0.5" style="width:50px;"></label>
        <label>Modèle <select class="js-mod"><option value="spherique">Sph</option><option value="exponentiel">Exp</option><option value="gaussien">Gauss</option></select></label>
        <label>a <input type="number" class="js-a" value="20" step="1" style="width:50px;"></label>
        <label>c₁₁ <input type="number" class="js-c11" value="1" step="0.05" style="width:50px;"></label>
        <label>c₂₂ <input type="number" class="js-c22" value="0.5" step="0.05" style="width:50px;"></label>
        <label>c₁₂ <input type="number" class="js-c12" value="0.5" step="0.05" style="width:50px;"></label>
        <button class="js-calc" style="font-size:.78rem;padding:4px 10px;background:#3a3632;color:#fff;border:none;border-radius:4px;">Résoudre</button>
      </div>
      <div style="display:grid;grid-template-columns:2fr 1fr;gap:8px;margin-top:8px;">
        <div class="js-A" style="padding:8px 12px;background:#f8f7f4;border:1px solid #d4d0c8;border-radius:6px;overflow-x:auto;"><i>Matrice A (système élargi)</i></div>
        <div class="js-b" style="padding:8px 12px;background:#f8f7f4;border:1px solid #d4d0c8;border-radius:6px;overflow-x:auto;"><i>Vecteur b</i></div>
      </div>
      <div class="js-sol" style="padding:10px 14px;margin-top:8px;background:#eef2e8;border:1px solid #b8c8a8;border-radius:6px;font-family:'JetBrains Mono',monospace;font-size:.82rem;">—</div>
    `);
    this.ctrl = {
      x0: this.el.querySelector('.js-x0'), y0: this.el.querySelector('.js-y0'),
      mod: this.el.querySelector('.js-mod'), a: this.el.querySelector('.js-a'),
      c11: this.el.querySelector('.js-c11'), c22: this.el.querySelector('.js-c22'),
      c12: this.el.querySelector('.js-c12'),
    };
    this.renderDataTbl();
    this.on(this.el.querySelector('.js-add'), 'click', () => {
      const last = this.donnees[this.donnees.length-1];
      this.donnees.push({ x: last.x+5, y: last.y, z1: 3, z2: 1.5 });
      this.renderDataTbl();
    });
    this.on(this.el.querySelector('.js-del'), 'click', () => {
      if (this.donnees.length > 2) { this.donnees.pop(); this.renderDataTbl(); }
    });
    const update = debounce(() => this.resoudre(), 200);
    for (const el of Object.values(this.ctrl)) {
      this.on(el, 'input', update); this.on(el, 'change', update);
    }
    this.on(this.el.querySelector('.js-calc'), 'click', () => this.resoudre());
    afficherChargementJusquaPret(this.el).then(() => this.resoudre());
  }

  renderDataTbl() {
    const t = this.el.querySelector('.js-data-tbl');
    t.innerHTML = '<table style="display:inline-block;font-family:JetBrains Mono;font-size:.76rem;">' +
      this.donnees.map((d,i) => `<tr><td>P${i+1}</td>` +
        ['x','y','z1','z2'].map(f =>
          `<td>${f}=<input type="number" data-i="${i}" data-f="${f}" value="${d[f]}" step="0.5" style="width:42px;"></td>`
        ).join('') + '</tr>').join('') + '</table>';
    const upd = debounce(() => this.resoudre(), 150);
    t.querySelectorAll('input').forEach(inp => {
      this.on(inp, 'input', e => {
        this.donnees[+e.target.dataset.i][e.target.dataset.f] = parseFloat(e.target.value) || 0;
        upd();
      });
    });
  }

  async resoudre() {
    const coords = this.donnees.map(d => [d.x, d.y]);
    const z1 = this.donnees.map(d => d.z1);
    const z2 = this.donnees.map(d => d.z2);
    const cible = [[parseFloat(this.ctrl.x0.value) || 0, parseFloat(this.ctrl.y0.value) || 0]];
    const mod = this.ctrl.mod.value, a = parseFloat(this.ctrl.a.value) || 1;
    const c11 = parseFloat(this.ctrl.c11.value) || 0.001;
    const c22 = parseFloat(this.ctrl.c22.value) || 0.001;
    const c12 = parseFloat(this.ctrl.c12.value) || 0;
    const structs = [{ modele: mod, portee: a, palier_matrix: [[c11, c12], [c12, c22]] }];

    let r;
    try { r = await gpoly.systemeCokrigeage(coords, [z1, z2], cible, structs, null, 'ordinaire', null); }
    catch (e) { this.afficherAvertissement('Erreur : ' + e.message); return; }

    const A = r.matrice_A, b = r.vecteur_b, n = r.n_donnees;
    const nA = A.length;
    let html = `<b>Matrice A (${nA}×${nA})</b><table style="border-collapse:collapse;margin:4px 0;">`;
    for (let i = 0; i < nA; i++) {
      html += '<tr>';
      for (let j = 0; j < nA; j++) html += `<td style="${cellStyle}">${A[i][j].toFixed(3)}</td>`;
      html += '</tr>';
    }
    html += '</table><div style="font-size:.74rem;color:#666;">Bloc Z-Z (1..n), bloc Y-Y (n+1..2n), blocs croisés, contraintes (2 dernières lignes)</div>';
    this.el.querySelector('.js-A').innerHTML = html;

    html = `<b>Vecteur b</b><table style="border-collapse:collapse;margin:4px 0;">`;
    html += '<tr><th style="' + cellStyle + 'background:#e8e5dc;">i</th>';
    html += '<th style="' + cellStyle + 'background:#e8e5dc;">→ Z*</th>';
    html += '<th style="' + cellStyle + 'background:#e8e5dc;">→ Y*</th></tr>';
    for (let i = 0; i < b.length; i++) {
      const labels = ['Z'+(i<n ? (i+1) : ''), 'Y'+(i<2*n ? (i-n+1) : '')];
      let label = i < n ? `Z(P${i+1})` : (i < 2*n ? `Y(P${i-n+1})` : (i === 2*n ? 'Σλ₁=1' : 'Σλ₂=1'));
      html += `<tr><td style="${cellStyle}">${label}</td>`;
      for (let j = 0; j < b[i].length; j++) html += `<td style="${cellStyle}">${b[i][j].toFixed(3)}</td>`;
      html += '</tr>';
    }
    html += '</table>';
    this.el.querySelector('.js-b').innerHTML = html;

    const est = r.estimations, vars = r.variances;
    this.el.querySelector('.js-sol').innerHTML =
      `<b>Cible (${cible[0][0]}, ${cible[0][1]})</b><br>` +
      `Z* = <b>${est[0].toFixed(4)}</b> · σ²(Z*) = <b>${vars[0].toFixed(4)}</b><br>` +
      `Y* = <b>${est[1].toFixed(4)}</b> · σ²(Y*) = <b>${vars[1].toFixed(4)}</b><br>` +
      `<span style="font-size:.78rem;color:#666;">n=${n} données, p=${r.n_variables} variables, matrice A de taille (${nA}, ${nA})</span>`;
  }

  cleanup() {}
}

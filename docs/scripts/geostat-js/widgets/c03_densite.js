// scripts/geostat-js/widgets/c03_densite.js
// -----------------------------------------------------------------------------
// Calculateur de densité théorique (C03, atelier 3.6).
//
// Déroulé voulu :
//   1. cocher les minéraux présents ;
//   2. les éléments qui les composent apparaissent ; on coche ceux à mettre
//      dans le système ;
//   3. la matrice A et le vecteur b se forment (saisie manuelle, valeurs
//      pré-remplies depuis la formule mais éditables) ; la ligne de fermeture
//      (Σ x = 1, garantit 100 % de matière) est ajoutée automatiquement ;
//   4. bouton « Calculer » → résolution de A x = b puis densité.
//
// Le calcul (résolution du système + densité) est fait en PYTHON / numpy via
// le cœur Pyodide (pretPyodide), pas en JavaScript. Si la matrice n'est pas
// inversible, on affiche une erreur ; si des proportions sont négatives, on
// affiche quand même le résultat (à l'étudiant d'en tirer les conclusions).
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { pretPyodide, afficherChargementJusquaPret } from '../pyodide_setup.js';

const COLOR = '#0d4d92';
const ORDRE_ELEM = ['Cu', 'Zn', 'Fe', 'Pb', 'Ba', 'S', 'O'];

// Bibliothèque de minéraux (formule, densité, composition massique).
const MINERAUX = [
  { nom: 'Chalcopyrite', formule: 'CuFeS2', densite: 4.1, composition: { Cu: 0.35, Fe: 0.30, S: 0.35 } },
  { nom: 'Chalcocite', formule: 'CuS2', densite: 5.6, composition: { Cu: 0.50, S: 0.50 } },
  { nom: 'Bornite', formule: 'Cu5FeS4', densite: 5.1, composition: { Cu: 0.63, Fe: 0.11, S: 0.26 } },
  { nom: 'Galène', formule: 'PbS', densite: 7.5, composition: { Pb: 0.87, S: 0.13 } },
  { nom: 'Barite', formule: 'BaSO4', densite: 4.5, composition: { Ba: 0.59, S: 0.14, O: 0.27 } },
  { nom: 'Sphalérite', formule: 'ZnS', densite: 4.1, composition: { Zn: 0.67, S: 0.33 } },
  { nom: 'Pyrite', formule: 'FeS2', densite: 5.0, composition: { Fe: 0.47, S: 0.53 } },
];

// Exemples (préréglages) : minéraux, éléments, teneurs mesurées b (fraction),
// composition de la gangue et densité de la gangue.
const PRESETS = [
  { nom: 'Cu-Zn', mineraux: ['Chalcopyrite', 'Sphalérite', 'Pyrite'], elements: ['Cu', 'Zn', 'S'], b: { Cu: 0.04, Zn: 0.03, S: 0.08 }, gangue: {}, gangueD: 3.0, poro: 2 },
  { nom: 'Barite', mineraux: ['Barite'], elements: ['Ba'], b: { Ba: 0.20 }, gangue: { Ba: 0.2 }, gangueD: 2.8, poro: 3 },
  { nom: 'Cu-Pb', mineraux: ['Chalcopyrite', 'Chalcocite', 'Bornite', 'Galène'], elements: ['Cu', 'Fe', 'Pb', 'S'], b: { Cu: 0.15, Fe: 0.10, Pb: 0.04, S: 0.16 }, gangue: { Fe: 0.05, S: 0.02 }, gangueD: 2.7, poro: 3 },
];

export default class C03Densite extends Widget {
  render() {
    this.selected = ['Chalcopyrite', 'Sphalérite', 'Pyrite'];
    this.selElems = new Set(['Cu', 'Zn', 'S']);
    this.Aval = {};   // {mineral: {el: fraction}}
    this.bval = { Cu: 0.04, Zn: 0.03, S: 0.08 };
    this.dval = {};   // {mineral: densité}
    this.gangueDensite = 3.0;
    this.poro = 2;
    for (const m of MINERAUX) { this.Aval[m.nom] = { ...m.composition }; this.dval[m.nom] = m.densite; }
    this.Aval['Gangue'] = {};   // composition de la gangue (éditable, 0 par défaut)

    this.el.insertAdjacentHTML('beforeend', `
      <div style="padding:0 1rem 1rem">
        <div style="display:flex;flex-wrap:wrap;gap:.4rem;align-items:center;margin-bottom:.4rem">
          <span style="font-size:12px;color:#666">Exemples :</span>
          ${PRESETS.map((p, i) => `<button type="button" class="js-preset" data-i="${i}" style="padding:.2rem .55rem;font-size:12px;cursor:pointer">${p.nom}</button>`).join('')}
        </div>

        <h5 style="margin:.5rem 0 .25rem">1. Minéraux présents</h5>
        <div class="js-minlist" style="display:flex;flex-wrap:wrap;gap:.35rem .9rem;font-size:13px"></div>

        <h5 style="margin:.8rem 0 .25rem">2. Éléments à inclure dans le système</h5>
        <div class="js-ellist" style="display:flex;flex-wrap:wrap;gap:.35rem .9rem;font-size:13px"></div>

        <h5 style="margin:.8rem 0 .25rem">3. Système A x = b</h5>
        <p style="margin:.1rem 0 .4rem;font-size:12px;color:#666">Valeurs en fraction (0–1). A est pré-rempli depuis les formules mais reste éditable ; entrez les teneurs mesurées dans <b>b</b>. La dernière ligne (Σ = 1) est la fermeture automatique.</p>
        <div style="overflow-x:auto"><table class="js-matrice" style="border-collapse:collapse;font-size:13px"></table></div>
        <div style="margin-top:6px;font-size:13px">Densités δ (g/cm³) :
          <span class="js-densites"></span>
          · Porosité n (%) <input type="number" class="js-poro" value="2" step="0.5" min="0" max="50" style="width:54px;padding:2px 5px;border:1px solid #ccc;border-radius:5px">
        </div>

        <div style="margin-top:12px"><button type="button" class="js-calc" style="padding:.45rem 1.4rem;font-size:15px;font-weight:700;color:#fff;background:${COLOR};border:none;border-radius:8px;cursor:pointer">Calculer</button></div>

        <div class="js-result" style="margin-top:14px"></div>
        <p style="margin-top:10px;font-size:11px;color:#666">Résolution de A x = b et densité calculées en Python (numpy) via Pyodide.</p>
      </div>
    `);

    this.minlist = this.el.querySelector('.js-minlist');
    this.ellist = this.el.querySelector('.js-ellist');
    this.matrice = this.el.querySelector('.js-matrice');
    this.densitesEl = this.el.querySelector('.js-densites');
    this.poroInput = this.el.querySelector('.js-poro');
    this.resultEl = this.el.querySelector('.js-result');
    this.calcBtn = this.el.querySelector('.js-calc');

    this.on(this.poroInput, 'input', () => { this.poro = parseFloat(this.poroInput.value) || 0; });
    this.on(this.calcBtn, 'click', () => this.calculer());
    for (const btn of this.el.querySelectorAll('.js-preset')) {
      this.on(btn, 'click', () => this._preset(PRESETS[+btn.dataset.i]));
    }

    this._rebuildMin();
    this._rebuildElems();
    this._rebuildMatrice();

    // Pré-charge Pyodide en arrière-plan pour que le 1er « Calculer » soit rapide.
    afficherChargementJusquaPret(this.el).then(() => { this._pret = true; }).catch(() => {});
  }

  _mineral(nom) { return MINERAUX.find(m => m.nom === nom); }

  _elementsDispo() {
    const set = new Set();
    for (const nom of this.selected) {
      const m = this._mineral(nom);
      if (m) for (const e of Object.keys(m.composition)) set.add(e);
    }
    return ORDRE_ELEM.filter(e => set.has(e));
  }

  _preset(p) {
    this.selected = p.mineraux.slice();
    this.selElems = new Set(p.elements);
    this.bval = { ...p.b };
    this.poro = p.poro; this.poroInput.value = p.poro;
    this.gangueDensite = p.gangueD ?? 3.0;
    for (const m of MINERAUX) this.Aval[m.nom] = { ...m.composition };
    this.Aval['Gangue'] = { ...(p.gangue || {}) };
    this._rebuildMin(); this._rebuildElems(); this._rebuildMatrice();
    this.resultEl.innerHTML = '';
  }

  _rebuildMin() {
    this.minlist.innerHTML = MINERAUX.map(m =>
      `<label style="white-space:nowrap"><input type="checkbox" class="js-min" value="${m.nom}" ${this.selected.includes(m.nom) ? 'checked' : ''}> ${m.nom} <span style="color:#999;font-size:11px">(${m.formule})</span></label>`).join('');
    this.minlist.querySelectorAll('.js-min').forEach(cb => this.on(cb, 'change', () => {
      const nom = cb.value;
      if (cb.checked) {
        if (!this.selected.includes(nom)) this.selected.push(nom);
        // Coche par défaut les éléments de CE minéral (l'utilisateur peut les
        // décocher, ex. le Fe non mesuré).
        const m = this._mineral(nom);
        if (m) for (const e of Object.keys(m.composition)) this.selElems.add(e);
      } else {
        this.selected = this.selected.filter(n => n !== nom);
      }
      this._rebuildElems(); this._rebuildMatrice();
    }));
  }

  _rebuildElems() {
    const dispo = this._elementsDispo();
    // Garde uniquement les éléments encore disponibles (n'AJOUTE rien
    // automatiquement : le choix des éléments reste à l'utilisateur / au preset,
    // sinon un élément volontairement décoché — ex. le Fe — réapparaîtrait).
    for (const e of [...this.selElems]) if (!dispo.includes(e)) this.selElems.delete(e);
    this.ellist.innerHTML = dispo.length
      ? dispo.map(e => `<label><input type="checkbox" class="js-el" value="${e}" ${this.selElems.has(e) ? 'checked' : ''}> ${e}</label>`).join('')
      : '<span style="color:#999">Sélectionnez d’abord des minéraux.</span>';
    this.ellist.querySelectorAll('.js-el').forEach(cb => this.on(cb, 'change', () => {
      if (cb.checked) this.selElems.add(cb.value); else this.selElems.delete(cb.value);
      this._rebuildMatrice();
    }));
  }

  _elementsActifs() { return this._elementsDispo().filter(e => this.selElems.has(e)); }

  _rebuildMatrice() {
    const els = this._elementsActifs();
    const cols = [...this.selected, 'Gangue'];
    if (!this.selected.length || !els.length) {
      this.matrice.innerHTML = `<tr><td style="color:#999;padding:6px">Sélectionnez des minéraux et des éléments.</td></tr>`;
      this.densitesEl.innerHTML = '';
      return;
    }
    const th = (t) => `<th style="padding:4px 7px;border-bottom:2px solid #ccc;font-weight:600">${t}</th>`;
    let html = `<thead><tr>${th('')}${cols.map(c => th(c === 'Gangue' ? 'Gangue' : c)).join('')}<th style="padding:4px 10px"></th>${th('b')}</tr></thead><tbody>`;
    for (const e of els) {
      html += `<tr><td style="padding:3px 7px;color:#555;font-weight:600">${e}</td>`;
      for (const m of cols) {
        const v = this.Aval[m]?.[e] ?? 0;   // gangue incluse (éditable)
        html += `<td style="padding:2px 5px"><input type="number" step="0.01" class="js-a" data-m="${m}" data-e="${e}" value="${v}" style="width:62px;padding:2px 4px;border:1px solid #ccc;border-radius:5px;text-align:right"></td>`;
      }
      html += `<td style="padding:0 8px;color:#999">=</td>`;
      html += `<td style="padding:2px 5px"><input type="number" step="0.01" class="js-b" data-e="${e}" value="${this.bval[e] ?? 0}" style="width:62px;padding:2px 4px;border:1px solid #ccc;border-radius:5px;text-align:right"></td></tr>`;
    }
    // Ligne de fermeture (lecture seule)
    html += `<tr style="background:#f3f3f3"><td style="padding:3px 7px;color:#555;font-weight:600">Σ = 1</td>`;
    for (let i = 0; i < cols.length; i++) html += `<td style="padding:3px 7px;text-align:right;color:#888">1</td>`;
    html += `<td style="padding:0 8px;color:#999">=</td><td style="padding:3px 7px;text-align:right;color:#888">1</td></tr>`;
    html += `</tbody>`;
    this.matrice.innerHTML = html;

    this.matrice.querySelectorAll('.js-a').forEach(inp => this.on(inp, 'input', () => {
      (this.Aval[inp.dataset.m] ||= {})[inp.dataset.e] = parseFloat(inp.value) || 0;
    }));
    this.matrice.querySelectorAll('.js-b').forEach(inp => this.on(inp, 'input', () => {
      this.bval[inp.dataset.e] = parseFloat(inp.value) || 0;
    }));

    // Densités éditables
    this.densitesEl.innerHTML = cols.map(m => {
      const v = m === 'Gangue' ? this.gangueDensite : (this.dval[m] ?? 3);
      return `<label style="margin-right:.5rem">${m === 'Gangue' ? 'Gangue' : m.slice(0, 6)} <input type="number" step="0.05" class="js-d" data-m="${m}" value="${v}" style="width:56px;padding:2px 4px;border:1px solid #ccc;border-radius:5px"></label>`;
    }).join('');
    this.densitesEl.querySelectorAll('.js-d').forEach(inp => this.on(inp, 'input', () => {
      if (inp.dataset.m === 'Gangue') this.gangueDensite = parseFloat(inp.value) || 0;
      else this.dval[inp.dataset.m] = parseFloat(inp.value) || 0;
    }));
  }

  async calculer() {
    const els = this._elementsActifs();
    const cols = [...this.selected, 'Gangue'];
    if (!cols.length || !els.length) { this.resultEl.innerHTML = '<span style="color:#b00">Sélectionnez au moins un minéral et un élément.</span>'; return; }

    // Matrice A (éléments + fermeture) × minéraux ; vecteur b ; densités.
    // La colonne gangue utilise ses valeurs éditées (this.Aval['Gangue']).
    const A = els.map(e => cols.map(m => this.Aval[m]?.[e] ?? 0));
    A.push(cols.map(() => 1));                       // fermeture
    const b = els.map(e => this.bval[e] ?? 0);
    b.push(1);
    const dens = cols.map(m => m === 'Gangue' ? this.gangueDensite : (this.dval[m] ?? 0));

    this.resultEl.innerHTML = '<span style="color:#888">Calcul…</span>';
    let py;
    try { py = await pretPyodide(); }
    catch (e) { this.resultEl.innerHTML = '<span style="color:#b00">Pyodide indisponible : ' + e.message + '</span>'; return; }

    py.globals.set('_A', py.toPy(A));
    py.globals.set('_b', py.toPy(b));
    py.globals.set('_dens', py.toPy(dens));
    py.globals.set('_poro', this.poro / 100);

    let out;
    try {
      const s = py.runPython(`
import json, numpy as np
A = np.asarray(_A, dtype=float)
b = np.asarray(_b, dtype=float)
dens = np.asarray(_dens, dtype=float)
if A.shape[0] == A.shape[1]:
    x = np.linalg.solve(A, b)           # lève LinAlgError si non inversible
else:
    x, *_ = np.linalg.lstsq(A, b, rcond=None)
pct = x * 100.0
vols = np.where(dens > 0, pct / dens, 0.0)
vtot = float(vols.sum())
rho = float(pct.sum() / vtot) if vtot > 0 else 0.0
json.dumps({"pct": [float(v) for v in pct], "rho": rho, "rho_app": rho * (1.0 - float(_poro))})
`);
      out = JSON.parse(s);
    } catch (e) {
      const msg = ('' + (e.message || e)).toLowerCase();
      this.resultEl.innerHTML = (msg.includes('singular') || msg.includes('linalg'))
        ? '<span style="color:#b00">⚠️ Matrice non inversible (système singulier). Vérifiez les valeurs ou le choix des éléments/minéraux.</span>'
        : '<span style="color:#b00">Erreur de calcul : ' + (e.message || e) + '</span>';
      return;
    }

    const pct = out.pct;
    const neg = pct.some(p => p < -0.01);
    const lignes = cols.map((m, i) =>
      `<tr><td style="padding:4px 8px;border-bottom:1px solid #eee">${m}</td>
           <td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right;${pct[i] < -0.01 ? 'color:#b00;font-weight:700' : ''}">${pct[i].toFixed(2)} %</td></tr>`).join('');
    const dStr = this.poro > 0
      ? `${out.rho_app.toFixed(2)} g/cm³ <span style="font-size:12px;color:#666">(ρ sans porosité : ${out.rho.toFixed(2)})</span>`
      : `${out.rho.toFixed(2)} g/cm³`;
    this.resultEl.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;gap:14px;align-items:flex-start">
        <table style="border-collapse:collapse;font-size:13px;flex:1 1 240px">
          <thead><tr><th style="padding:4px 8px;border-bottom:2px solid #ccc;text-align:left">Minéral</th><th style="padding:4px 8px;border-bottom:2px solid #ccc;text-align:right">Proportion x</th></tr></thead>
          <tbody>${lignes}
            <tr style="font-weight:700;background:#f0f0f0"><td style="padding:4px 8px">Total</td><td style="padding:4px 8px;text-align:right">${pct.reduce((a, v) => a + v, 0).toFixed(1)} %</td></tr>
          </tbody>
        </table>
        <div style="flex:1 1 200px;text-align:center;padding:16px;border-radius:14px;border:3px solid ${COLOR};background:#eef4ff">
          <div style="font-size:11px;color:#555">Densité de la roche</div>
          <div style="font-size:1.8em;font-weight:800;color:${COLOR}">${dStr}</div>
        </div>
      </div>
      ${neg ? '<p style="color:#b00;margin-top:8px">⚠️ Une ou plusieurs proportions sont négatives : la combinaison minéraux/teneurs est physiquement incohérente (revoyez vos données).</p>' : ''}`;
  }
}

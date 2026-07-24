// scripts/geostat-js/widgets/c09_voisinage.js
// -----------------------------------------------------------------------------
// Widget C09.5 — Sélection du voisinage et effet d'écran.
//
// Données sur un transect 1D. On choisit le nombre k de plus proches voisins et
// on déplace la cible x₀. On montre la fenêtre de recherche (k voisins
// surlignés), leurs POIDS λ (effet d'écran), et l'estimation locale vs globale.
// Modèle imbriqué réglable (plusieurs structures + pépite).
//
// Krigeage avec nk voisins délégué à cokri (paramètre nk).
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

const COL = { glob: '#9aa0a6', loc: '#0d4d92', cible: '#c0392b', in: '#0d4d92', out: '#c7ccd2', pos: '#0d4d92', neg: '#c0392b' };
const debounce = (fn, ms = 150) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const TYPES = [['pepite', 'Effet de pépite'], ['spherique', 'Sphérique'], ['exponentiel', 'Exponentiel'], ['gaussien', 'Gaussien']];

// Signal LISSE et corrélé spatialement (somme de sinusoïdes + petit bruit) :
// un profil cohérent, facile à interpréter (pas du bruit blanc chaotique).
function genererDonnees(seed = 42) {
  let s = seed >>> 0;
  const rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const ph1 = rng() * 6.28, ph2 = rng() * 6.28, ph3 = rng() * 6.28;
  const signal = x => 5.4 + 1.8 * Math.sin(2 * Math.PI * x / 58 + ph1)
    + 1.1 * Math.sin(2 * Math.PI * x / 27 + ph2) + 0.5 * Math.sin(2 * Math.PI * x / 13 + ph3);
  const data = [];
  for (let i = 0; i < 22; i++) {
    const x = 2 + 96 * rng();
    const z = Math.max(3, Math.min(8.5, signal(x) + 0.25 * (rng() - 0.5) * 2));
    data.push({ x, z });
  }
  data.sort((a, b) => a.x - b.x);
  return data;
}

export default class C09Voisinage extends Widget {
  render() {
    this.donnees = genererDonnees();
    this.structures = [{ modele: 'spherique', palier: 1, portee: 20 }];
    this.showPts = true;
    this.clickBound = false;
    const id = this.el.id;
    this.el.insertAdjacentHTML('beforeend', `
      <style>
        .vo-row label{display:inline-flex !important;flex-direction:row !important;align-items:center;gap:5px;}
        #${id} .vo-grp{padding:6px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;margin-bottom:6px;}
        #${id} .vo-grp b{font-size:.78rem;color:#555;margin-right:4px;}
        #${id} .vo-grp input[type=number],#${id} .vo-grp select{padding:1px 4px;border:1px solid #c7ccd1;border-radius:4px;}
        #${id} .vo-mini{font-size:.74rem;padding:2px 8px;color:#fff;border:none;border-radius:4px;cursor:pointer;}
      </style>
      <div class="vo-grp"><b>Modèle imbriqué</b> <span class="js-structs"></span>
        <button class="js-addstruct vo-mini" type="button" style="background:#4a6a3a;">+ modèle</button></div>
      <div class="vo-grp vo-row" style="display:flex;flex-wrap:wrap;gap:14px;align-items:center;">
        <label><b>k voisins</b> <input type="range" class="js-nk" min="1" max="25" value="6" step="1" style="width:140px"><span class="js-nkv">6</span></label>
        <label>Cible x₀ <input type="range" class="js-x0" min="0" max="100" value="50" step="0.5" style="width:150px"><span class="js-x0v">50</span></label>
        <button class="js-pts vo-mini" type="button" style="background:#0d4d92;">Masquer les points</button>
        <button class="js-clear vo-mini" type="button" style="background:#a23;">Tout effacer</button>
        <button class="js-reset vo-mini" type="button" style="background:#3a3632;">Réinitialiser</button>
      </div>
      <div class="js-plot" style="height:360px;cursor:crosshair;"></div>
      <div style="font-size:11px;color:#666;margin:0 4px 4px;">Cliquez le graphe pour <b>ajouter</b> une donnée · cliquez une donnée pour la <b>retirer</b>.</div>
      <div class="js-info" style="padding:.4rem 1rem;font-size:.8rem;color:#444;text-align:center;background:#eef2f7;border:1px solid #c4d2e0;border-radius:6px;margin-top:4px;">—</div>
    `);

    this.plot = this.el.querySelector('.js-plot');
    this.infoEl = this.el.querySelector('.js-info');
    this.nkEl = this.el.querySelector('.js-nk');
    this.x0El = this.el.querySelector('.js-x0');

    const update = debounce(() => this.refresh(), 150);
    for (const [el, key] of [[this.nkEl, 'nk'], [this.x0El, 'x0']]) {
      this.on(el, 'input', e => { this.el.querySelector(`.js-${key}v`).textContent = e.target.value; });
      this.on(el, 'input', update);
    }
    this.on(this.el.querySelector('.js-addstruct'), 'click', () => { this.structures.push({ modele: 'spherique', palier: 0.5, portee: 20 }); this.renderStructs(); this.refresh(); });
    this.on(this.el.querySelector('.js-pts'), 'click', e => {
      this.showPts = !this.showPts;
      e.target.textContent = this.showPts ? 'Masquer les points' : 'Afficher les points';
      this.refresh();
    });
    this.on(this.el.querySelector('.js-clear'), 'click', () => { this.donnees = []; this.refresh(); });
    this.on(this.el.querySelector('.js-reset'), 'click', () => { this.donnees = genererDonnees(); this.refresh(); });

    this.renderStructs();
    afficherChargementJusquaPret(this.el).then(() => this.refresh());
  }

  renderStructs() {
    const t = this.el.querySelector('.js-structs');
    t.innerHTML = `<div style="display:flex;flex-direction:column;gap:5px;margin:4px 0;">` +
      this.structures.map((s, i) => {
        const isPep = s.modele === 'pepite';
        const params = isPep
          ? `<span>c<sub>0</sub></span><input type="number" data-i="${i}" data-f="palier" value="${s.palier}" step="0.1" style="width:44px;">`
          : `<span>c<sub>1</sub></span><input type="number" data-i="${i}" data-f="palier" value="${s.palier}" step="0.1" style="width:44px;"><span>a</span><input type="number" data-i="${i}" data-f="portee" value="${s.portee}" step="1" style="width:46px;">`;
        return `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:4px;">` +
          `<span style="color:#888;min-width:56px;">Modèle ${i + 1}</span>` +
          `<select data-i="${i}" data-f="modele">${TYPES.map(([v, n]) => `<option value="${v}"${v === s.modele ? ' selected' : ''}>${n}</option>`).join('')}</select>` +
          params +
          (this.structures.length > 1 ? `<button class="js-dels vo-mini" data-i="${i}" type="button" style="background:#c44;padding:1px 5px;">×</button>` : '') +
          `</div>`;
      }).join('') + `</div>`;
    const upd = debounce(() => this.refresh(), 150);
    t.querySelectorAll('input,select').forEach(inp => this.on(inp, 'input', e => {
      const f = e.target.dataset.f, i = +e.target.dataset.i;
      if (f === 'modele') { this.structures[i].modele = e.target.value; this.renderStructs(); this.refresh(); }
      else { this.structures[i][f] = parseFloat(e.target.value) || 0; upd(); }
    }));
    t.querySelectorAll('.js-dels').forEach(b => this.on(b, 'click', e => { this.structures.splice(+e.target.dataset.i, 1); this.renderStructs(); this.refresh(); }));
  }

  _structsLib() { return this.structures.filter(s => s.modele !== 'pepite').map(s => ({ modele: s.modele, palier: s.palier, portee: s.portee })); }
  _c0() { return this.structures.filter(s => s.modele === 'pepite').reduce((a, s) => a + (s.palier || 0), 0); }

  async refresh() {
    const nk = parseInt(this.nkEl.value, 10);
    const x0 = parseFloat(this.x0El.value);
    const structs = this._structsLib(), c0 = this._c0();
    if (!structs.length && c0 <= 0) { this.afficherAvertissement('Ajoutez au moins une structure.'); return; }
    const xd = this.donnees.map(d => [d.x]), zd = this.donnees.map(d => d.z), N = this.donnees.length;

    // Aucune donnée : graphe vide, on attend un clic pour (re)placer des points.
    if (N === 0) {
      if (window.Plotly) {
        Plotly.react(this.plot, [], {
          margin: { t: 24, l: 46, r: 16, b: 48 }, dragmode: false,
          xaxis: { title: { text: 'x', standoff: 6 }, range: [0, 100], fixedrange: true },
          yaxis: { title: 'Z', range: [1.5, 9.5], fixedrange: true },
          annotations: [{ x: 50, y: 5.5, text: 'Aucune donnée — cliquez le graphe pour en ajouter, ou « Réinitialiser ».', showarrow: false, font: { size: 12, color: '#888' } }],
        }, { displaylogo: false, responsive: true, displayModeBar: false });
        if (!this.clickBound) { this.on(this.plot, 'click', e => this._onClick(e)); this.clickBound = true; }
      }
      this.infoEl.innerHTML = `Aucune donnée. Sans observation, le krigeage ordinaire n'a pas de solution (la moyenne est inconnue).`;
      return;
    }

    // Grille fine + on FORCE les x exacts des données pour que la courbe passe
    // pile sur chaque donnée → pics « Dirac » visibles avec pépite (krigeage
    // conditionnel : Z*(xᵢ) = Zᵢ exactement, mais saut juste à côté).
    const gset = new Set(); for (let i = 0; i <= 1000; i++) gset.add(i / 10);
    this.donnees.forEach(d => gset.add(Math.round(d.x * 1000) / 1000));
    const x_grid = [...gset].sort((p, q) => p - q);
    const cibles = x_grid.map(x => [x]);

    let r_glob, r_loc, rc;
    try {
      r_glob = await gpoly.krigeageOrdinaire(xd, zd, cibles, structs, c0);
      r_loc = await gpoly.krigeageOrdinaire(xd, zd, cibles, structs, c0, nk);
      rc = await gpoly.krigeageOrdinaire(xd, zd, [[x0]], structs, c0, nk);
    } catch (e) { this.afficherAvertissement('Erreur : ' + e.message); return; }

    const ordre = [...Array(N).keys()].sort((i, j) => Math.abs(this.donnees[i].x - x0) - Math.abs(this.donnees[j].x - x0));
    const nbh = ordre.slice(0, Math.min(nk, N));
    const wOf = {}; nbh.forEach((idx, k) => { wOf[idx] = rc.lambda[k] != null ? rc.lambda[k] : 0; });
    const nbhSet = new Set(nbh), nbhX = nbh.map(i => this.donnees[i].x);
    const winLo = Math.min(...nbhX), winHi = Math.max(...nbhX);
    const inPts = this.donnees.filter((_, i) => nbhSet.has(i));
    const outPts = this.donnees.filter((_, i) => !nbhSet.has(i));
    const zc = rc.estimations[0];

    if (!window.Plotly) { this.afficherAvertissement('Plotly non chargé.'); return; }
    const traces = [
      { x: x_grid, y: r_glob.estimations, mode: 'lines', line: { color: COL.glob, width: 1.5, dash: 'dot' }, name: `Global (k=${N})` },
      { x: x_grid, y: r_loc.estimations, mode: 'lines', line: { color: COL.loc, width: 2.5 }, name: `Local (k=${nk})` },
    ];
    if (this.showPts) {
      traces.push(
        { x: outPts.map(d => d.x), y: outPts.map(d => d.z), mode: 'markers', name: 'Hors voisinage', marker: { color: COL.out, size: 6, line: { color: '#aaa', width: 0.5 } }, hoverinfo: 'skip' },
        { x: inPts.map(d => d.x), y: inPts.map(d => d.z), mode: 'markers', name: `Voisins (${inPts.length})`, marker: { color: COL.in, size: 10, line: { color: '#fff', width: 1.5 } }, hoverinfo: 'skip' },
      );
    }
    traces.push({ x: [x0], y: [zc], mode: 'markers', name: `Z*(x₀)=${zc.toFixed(2)}`, marker: { color: COL.cible, size: 13, symbol: 'diamond' } });
    const annotations = this.showPts ? inPts.map(d => {
      const i = this.donnees.indexOf(d);
      return { x: d.x, y: d.z, text: `${wOf[i].toFixed(2)}`, showarrow: false, yshift: 13, font: { size: 9, color: wOf[i] < -1e-3 ? COL.neg : COL.pos }, bgcolor: 'rgba(255,255,255,0.85)' };
    }) : [];

    Plotly.react(this.plot, traces, {
      margin: { t: 24, l: 46, r: 16, b: 48 },
      dragmode: false,
      shapes: [
        { type: 'rect', xref: 'x', yref: 'paper', x0: winLo, x1: winHi, y0: 0, y1: 1, fillcolor: 'rgba(13,77,146,0.07)', line: { width: 0 }, layer: 'below' },
        { type: 'line', xref: 'x', yref: 'paper', x0: x0, x1: x0, y0: 0, y1: 1, line: { color: COL.cible, width: 1.5, dash: 'dot' } },
      ],
      annotations,
      xaxis: { title: { text: 'x', standoff: 6 }, range: [0, 100], fixedrange: true },
      yaxis: { title: 'Z', range: [1.5, 9.5], fixedrange: true },
      legend: { orientation: 'h', y: -0.2, x: 0.5, xanchor: 'center', font: { size: 9 } },
    }, { displaylogo: false, responsive: true, displayModeBar: false });

    if (!this.clickBound) { this.on(this.plot, 'click', e => this._onClick(e)); this.clickBound = true; }

    this.infoEl.innerHTML =
      `Cible x₀=<b>${x0.toFixed(1)}</b> · <b>${nbh.length}</b> voisins retenus · les nombres = leurs poids λ (<b>effet d'écran</b>).`;
  }

  _onClick(e) {
    const fl = this.plot && this.plot._fullLayout;
    if (!fl || !fl.xaxis || !fl.yaxis) return;
    const rect = this.plot.getBoundingClientRect();
    const ox = e.clientX - rect.left, oy = e.clientY - rect.top;
    const xv = fl.xaxis.p2d(ox - fl.xaxis._offset);
    const yv = fl.yaxis.p2d(oy - fl.yaxis._offset);
    if (!isFinite(xv) || !isFinite(yv)) return;
    // Près d'une donnée existante → retirer ; sinon → ajouter.
    let near = -1, best = 0.045;
    this.donnees.forEach((d, i) => { const v = Math.hypot((d.x - xv) / 100, (d.z - yv) / 8); if (v < best) { best = v; near = i; } });
    if (near >= 0) {
      this.donnees.splice(near, 1);
    } else {
      const x = Math.max(0, Math.min(100, xv)), z = Math.max(1.5, Math.min(9.5, yv));
      this.donnees.push({ x, z });
      this.donnees.sort((a, b) => a.x - b.x);
    }
    this.refresh();
  }

  cleanup() { if (this.plot && window.Plotly) Plotly.purge(this.plot); }
}

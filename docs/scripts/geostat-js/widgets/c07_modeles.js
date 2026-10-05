// scripts/geostat-js/widgets/c07_modeles.js
// -----------------------------------------------------------------------------
// Widget C07 — Atelier 7.3 « Modèles théoriques de variogramme ».
//
// Un seul modèle à la fois, et deux panneaux qui montrent la MÊME chose sous
// deux formes : à gauche une réalisation simulée par GFFTMA, à droite le
// variogramme γ(h) de ce modèle. Sous les panneaux, les équations de γ(h) et de
// la covariance C(h), avec les valeurs courantes substituées.
//
// Bascule 1D / 2D : en 1D un profil Z(x) le long d'un transect, où se lit
// directement la régularité du modèle (hachée en exponentiel, très lisse en
// gaussien) ; en 2D une carte, avec l'anisotropie géométrique pilotée par la
// portée majeure, la portée mineure et l'angle. En 2D le graphique de droite
// trace γ(h) dans les DEUX directions principales : c'est la lecture même de
// l'anisotropie.
//
// Tout le calcul est en Python : gpoly.simulerChamp1D / simulerChampAniso
// (GFFTMA) pour les champs, gpoly.variogrammeTheorique (cov_func.covar) pour
// les courbes. Aucune mathématique géostatistique côté JS.
//
// Rappel pour la maintenance : covar.py (courbes) et covar_nu.py (GFFTMA) ne
// numérotent PAS les modèles de la même façon. Les deux tables sont dans
// pyodide_setup.js (_CODES_COV et _CODES_SIM) ; ce fichier ne manipule que des
// NOMS de modèles, jamais des codes.
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

const TURBO = [
  [0.0, 'rgb(48,18,59)'], [0.1, 'rgb(65,69,171)'], [0.2, 'rgb(57,118,233)'],
  [0.3, 'rgb(33,161,238)'], [0.4, 'rgb(26,199,194)'], [0.5, 'rgb(76,221,142)'],
  [0.6, 'rgb(150,233,89)'], [0.7, 'rgb(212,225,55)'], [0.8, 'rgb(248,186,56)'],
  [0.9, 'rgb(242,124,36)'], [1.0, 'rgb(122,4,3)'],
];

const N_2D = 150;    // carte N x N
const N_1D = 420;    // longueur du transect
const H_MAX = 100;   // axe des distances du variogramme

// a = portée pratique (95 %) pour les modèles bornés ; pour l'effet de trou,
// a est un paramètre d'échelle, pas une portée.
export const MODELES = [
  {
    cle: 'spherique', nom: 'Sphérique', couleur: '#2563eb',
    gamma: 'C_0 + C\\left[\\tfrac{3}{2}\\tfrac{h}{a} - \\tfrac{1}{2}\\left(\\tfrac{h}{a}\\right)^{3}\\right]',
    cov:   'C\\left[1 - \\tfrac{3}{2}\\tfrac{h}{a} + \\tfrac{1}{2}\\left(\\tfrac{h}{a}\\right)^{3}\\right]',
    borne: 'h \\le a',
    note: 'Pente non nulle à l’origine. Le palier est atteint exactement en h = a.',
  },
  {
    cle: 'exponentiel', nom: 'Exponentiel', couleur: '#ea580c',
    gamma: 'C_0 + C\\left[1 - e^{-3h/a}\\right]',
    cov:   'C\\,e^{-3h/a}',
    note: 'Pente non nulle à l’origine, palier atteint seulement asymptotiquement : a est la portée PRATIQUE, celle où γ vaut 95 % du palier.',
  },
  {
    cle: 'gaussien', nom: 'Gaussien', couleur: '#16a34a',
    gamma: 'C_0 + C\\left[1 - e^{-3h^{2}/a^{2}}\\right]',
    cov:   'C\\,e^{-3h^{2}/a^{2}}',
    note: 'Comportement PARABOLIQUE à l’origine : le champ est très régulier, presque dérivable. Portée pratique à 95 %.',
  },
  {
    cle: 'cubique', nom: 'Cubique', couleur: '#0891b2',
    gamma: 'C_0 + C\\left[7u^{2} - \\tfrac{35}{4}u^{3} + \\tfrac{7}{2}u^{5} - \\tfrac{3}{4}u^{7}\\right],\\quad u = \\tfrac{h}{a}',
    cov:   'C\\left[1 - 7u^{2} + \\tfrac{35}{4}u^{3} - \\tfrac{7}{2}u^{5} + \\tfrac{3}{4}u^{7}\\right]',
    borne: 'h \\le a',
    note: 'Parabolique à l’origine comme le gaussien, mais à support borné : le palier est atteint exactement en h = a.',
  },
  {
    cle: 'lineaire', nom: 'Linéaire (borné)', couleur: '#9333ea',
    gamma: 'C_0 + C\\,\\min\\!\\left(\\tfrac{h}{a},\\,1\\right)',
    cov:   'C\\left[1 - \\min\\!\\left(\\tfrac{h}{a},\\,1\\right)\\right]',
    note: 'Croissance strictement linéaire jusqu’à la portée, puis palier. Sa covariance triangulaire n’est rigoureusement admissible qu’en 1D ; en 2D GFFTMA la corrige en tronquant les valeurs propres négatives de son spectre, l’écart au modèle reste faible.',
  },
  {
    cle: 'trou', nom: 'Effet de trou', couleur: '#be123c',
    gamma: 'C_0 + C\\left[1 - \\dfrac{\\sin(2\\pi h/a)}{2\\pi h/a}\\right]',
    cov:   'C\\,\\dfrac{\\sin(2\\pi h/a)}{2\\pi h/a}',
    note: 'Le variogramme DÉPASSE le palier puis oscille : le phénomène est pseudo-périodique. Ici a est un paramètre d’échelle, pas une portée.',
  },
];
const PAR_CLE = Object.fromEntries(MODELES.map(m => [m.cle, m]));
const debounce = (fn, ms = 160) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const fmt = (v, n = 2) => v.toFixed(n).replace('.', ',');

export default class C07Modeles extends Widget {
  render() {
    this.mode2d = false;
    this.seed = Math.floor(Math.random() * 1e9);
    const id = this.el.id;
    this.el.insertAdjacentHTML('beforeend', `
      <style>
        #${id} .m7-row label { display:inline-flex !important; flex-direction:row !important; align-items:center; gap:5px; }
        #${id} .m7-row label span { display:inline; }
        #${id} .m7-eq { display:grid; grid-template-columns:auto 1fr; gap:4px 14px; align-items:center; }
        #${id} .m7-eq b { font-size:.78rem; color:#555; font-weight:600; white-space:nowrap; }
      </style>
      <div class="gw-controls m7-row" style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.85rem;margin-bottom:6px;">
        <label><b style="font-size:.8rem;color:#444;">Modèle</b>
          <select class="js-mod" style="font-size:.82rem;padding:2px 4px;">
            ${MODELES.map(m => `<option value="${m.cle}">${m.nom}</option>`).join('')}
          </select></label>
        <button class="js-mode" type="button" style="font-size:.78rem;padding:4px 12px;background:#1f6f6f;color:#fff;border:none;border-radius:5px;cursor:pointer;font-weight:600;">Passer en 2D</button>
        <button class="js-seed" type="button" style="font-size:.78rem;padding:4px 10px;background:#3a3632;color:#fff;border:none;border-radius:5px;cursor:pointer;">Nouvelle réalisation</button>
      </div>
      <div class="gw-controls m7-row" style="display:flex;flex-wrap:wrap;gap:14px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.85rem;margin-bottom:6px;">
        <label class="js-1d-only">Portée <span>a</span> <input type="range" class="js-a" min="5" max="80" value="30" step="1" style="width:130px"><span class="js-av">30</span></label>
        <label>Palier <span>C</span> <input type="range" class="js-c" min="0.1" max="2" value="1" step="0.05" style="width:110px"><span class="js-cv">1,00</span></label>
        <label>Pépite <span>C<sub>0</sub></span> <input type="range" class="js-c0" min="0" max="0.5" value="0.1" step="0.01" style="width:110px"><span class="js-c0v">0,10</span></label>
      </div>
      <div class="gw-controls m7-row js-2d-only" style="display:flex;flex-wrap:wrap;gap:14px;align-items:center;padding:8px 12px;background:#f3f7fb;border:1px solid #cfe0ee;border-radius:8px;font-size:.85rem;margin-bottom:6px;">
        <b style="font-size:.78rem;color:#555;">Anisotropie géométrique</b>
        <label>Portée majeure <span>a<sub>g</sub></span> <input type="range" class="js-ag" min="5" max="80" value="45" step="1" style="width:110px"><span class="js-agv">45</span></label>
        <label>Portée mineure <span>a<sub>p</sub></span> <input type="range" class="js-ap" min="3" max="80" value="15" step="1" style="width:110px"><span class="js-apv">15</span></label>
        <label>Angle <span>&theta;</span> <input type="range" class="js-ang" min="0" max="175" value="30" step="5" style="width:110px"><span class="js-angv">30</span>&deg;</label>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start;">
        <div class="js-champ" style="height:340px"></div>
        <div class="js-vario" style="height:340px"></div>
      </div>
      <div class="js-equations" style="margin:8px 2px 2px;padding:10px 14px;background:#fbfbfd;border:1px solid #e3e3ea;border-radius:8px;font-size:.86rem;"></div>
      <p class="js-note" style="margin:6px 1rem;font-size:11px;color:#666;"></p>
    `);

    this.champEl = this.el.querySelector('.js-champ');
    this.varioEl = this.el.querySelector('.js-vario');
    this.eqEl    = this.el.querySelector('.js-equations');
    this.noteEl  = this.el.querySelector('.js-note');
    this.ctrl = {
      mod: this.el.querySelector('.js-mod'),
      a:   this.el.querySelector('.js-a'),
      c:   this.el.querySelector('.js-c'),
      c0:  this.el.querySelector('.js-c0'),
      ag:  this.el.querySelector('.js-ag'),
      ap:  this.el.querySelector('.js-ap'),
      ang: this.el.querySelector('.js-ang'),
    };

    const maj = debounce(() => this.refresh(), 160);
    const affiche = { a: 0, c: 2, c0: 2, ag: 0, ap: 0, ang: 0 };
    for (const k of ['a', 'c', 'c0', 'ag', 'ap', 'ang']) {
      this.on(this.ctrl[k], 'input', e => {
        const v = parseFloat(e.target.value);
        this.el.querySelector(`.js-${k}v`).textContent = fmt(v, affiche[k]);
        maj();
      });
    }
    this.on(this.ctrl.mod, 'change', () => this.refresh());
    this.on(this.el.querySelector('.js-mode'), 'click', () => this._basculer());
    this.on(this.el.querySelector('.js-seed'), 'click', () => {
      this.seed = Math.floor(Math.random() * 1e9); this.refresh();
    });

    this._appliquerMode();
    afficherChargementJusquaPret(this.el).then(() => this.refresh());
  }

  _basculer() {
    this.mode2d = !this.mode2d;
    this._appliquerMode();
    this.refresh();
  }

  /** Les feuilles de style posent display:inline-flex !important sur les <label> :
   *  il faut masquer AVEC la priorité, sinon les curseurs ne bougent pas. */
  _appliquerMode() {
    const btn = this.el.querySelector('.js-mode');
    btn.textContent = this.mode2d ? '← Revenir en 1D' : 'Passer en 2D';
    btn.style.background = this.mode2d ? '#3a3632' : '#1f6f6f';
    // La carte 2D est contrainte carree : sans cette hauteur accrue, elle
    // n'occupe qu'une fraction de son cadre.
    const h = this.mode2d ? '430px' : '340px';
    this.champEl.style.height = h;
    this.varioEl.style.height = h;
    for (const n of this.el.querySelectorAll('.js-1d-only')) {
      if (this.mode2d) n.style.setProperty('display', 'none', 'important');
      else n.style.removeProperty('display');
    }
    for (const n of this.el.querySelectorAll('.js-2d-only')) {
      if (!this.mode2d) n.style.setProperty('display', 'none', 'important');
      else n.style.removeProperty('display');
    }
  }

  _params() {
    const m = PAR_CLE[this.ctrl.mod.value];
    const C  = parseFloat(this.ctrl.c.value);
    const C0 = parseFloat(this.ctrl.c0.value);
    return {
      m, C, C0,
      a:   parseFloat(this.ctrl.a.value),
      ag:  parseFloat(this.ctrl.ag.value),
      ap:  parseFloat(this.ctrl.ap.value),
      ang: parseFloat(this.ctrl.ang.value),
      // GFFTMA reçoit la pépite comme une FRACTION de la variance unité.
      pepFrac: (C + C0) > 0 ? C0 / (C + C0) : 0,
    };
  }

  async refresh() {
    const p = this._params();
    const lags = []; for (let i = 0; i <= 120; i++) lags.push(i * H_MAX / 120);
    const aPrincipale = this.mode2d ? p.ag : p.a;

    // --- courbes : le modèle choisi, puis les cinq autres en gris pâle ---
    let courbes, champ;
    try {
      const demandes = MODELES.map(mm =>
        gpoly.variogrammeTheorique(mm.cle, lags, aPrincipale, p.C));
      if (this.mode2d) demandes.push(gpoly.variogrammeTheorique(p.m.cle, lags, p.ap, p.C));
      const r = await Promise.all(demandes);
      courbes = Object.fromEntries(MODELES.map((mm, i) => [mm.cle, r[i]]));
      if (this.mode2d) courbes.__mineure = r[MODELES.length];

      champ = this.mode2d
        ? await gpoly.simulerChampAniso(p.m.cle, p.ag, p.ap, p.ang, p.pepFrac,
                                        this.seed, N_2D, 'gaussien', 0.0, 1.0)
        : await gpoly.simulerChamp1D(p.m.cle, p.a, p.pepFrac,
                                     this.seed, N_1D, 'gaussien', 0.0, 1.0);
    } catch (e) {
      this.afficherAvertissement('Erreur de calcul : ' + (e && e.message ? e.message : e));
      return;
    }
    if (!window.Plotly) { this.afficherAvertissement('Plotly non chargé.'); return; }

    this._dessinerChamp(p, champ);
    this._dessinerVario(p, lags, courbes);
    this._ecrireEquations(p);
  }

  // ---------------------------------------------------------------------------
  _dessinerChamp(p, champ) {
    const commun = { displaylogo: false, responsive: true, displayModeBar: false };
    if (!this.mode2d) {
      const x = Array.from(champ, (_, i) => i);
      Plotly.react(this.champEl, [
        { x, y: Array.from(champ), mode: 'lines', line: { color: p.m.couleur, width: 1.6 },
          hoverinfo: 'skip', showlegend: false },
      ], {
        margin: { t: 30, l: 50, r: 14, b: 44 }, dragmode: false,
        title: { text: `Profil simulé Z(x) — ${p.m.nom}`, font: { size: 12 } },
        xaxis: { title: { text: 'x', standoff: 4 }, range: [0, N_1D], fixedrange: true, gridcolor: '#eee' },
        yaxis: { title: 'Z(x)', range: [-3.6, 3.6], fixedrange: true, gridcolor: '#eee' },
        plot_bgcolor: '#fff',
      }, commun);
      return;
    }
    // GFFTMA range sa PREMIÈRE portée le long du premier indice du tableau, que
    // l'image lirait comme l'axe vertical. On transpose donc pour que la portée
    // majeure apparaisse bien horizontale quand θ = 0.
    const z = [];
    for (let j = 0; j < N_2D; j++) {
      const ligne = new Array(N_2D);
      for (let i = 0; i < N_2D; i++) ligne[i] = champ[i * N_2D + j];
      z.push(ligne);
    }
    Plotly.react(this.champEl, [
      { z, type: 'heatmap', colorscale: TURBO, zsmooth: 'best', zmin: -3, zmax: 3,
        hoverinfo: 'skip',
        // L'axe est contraint carre : son domaine se retracte vers la gauche et
        // une barre posee a x = 1 resterait loin de la carte.
        colorbar: { len: 0.9, thickness: 10, x: 0.87, xanchor: 'left',
                    title: { text: 'Z', side: 'right', font: { size: 10 } }, tickfont: { size: 8 } } },
    ], {
      margin: { t: 30, l: 24, r: 30, b: 26 }, dragmode: false,
      title: { text: `Champ simulé — ${p.m.nom}`, font: { size: 12 } },
      xaxis: { showticklabels: false, ticks: '', zeroline: false, showgrid: false, constrain: 'domain', fixedrange: true },
      yaxis: { showticklabels: false, ticks: '', zeroline: false, showgrid: false, scaleanchor: 'x', constrain: 'domain', fixedrange: true },
    }, commun);
  }

  // ---------------------------------------------------------------------------
  _dessinerVario(p, lags, courbes) {
    const sill = p.C + p.C0;
    const avecPepite = y => Array.from(y, (v, i) => v + (lags[i] > 0 ? p.C0 : 0));
    const traces = [];

    // Les cinq autres modèles, en gris pâle, pour situer la forme.
    for (const mm of MODELES) {
      if (mm.cle === p.m.cle) continue;
      traces.push({ x: lags, y: avecPepite(courbes[mm.cle]), mode: 'lines',
        line: { color: 'rgba(150,155,165,0.42)', width: 1.4 },
        name: mm.nom, hoverinfo: 'skip', showlegend: false });
    }
    // Repères palier et portée.
    traces.push({ x: [0, H_MAX], y: [sill, sill], mode: 'lines',
      line: { color: '#9aa0a6', dash: 'dash', width: 1 }, hoverinfo: 'skip', showlegend: false });
    const aPrin = this.mode2d ? p.ag : p.a;
    traces.push({ x: [aPrin, aPrin], y: [0, sill], mode: 'lines',
      line: { color: '#9aa0a6', dash: 'dot', width: 1 }, hoverinfo: 'skip', showlegend: false });

    // Le modèle choisi, en gras. En 2D : direction majeure ET mineure.
    if (this.mode2d) {
      traces.push({ x: [p.ap, p.ap], y: [0, sill], mode: 'lines',
        line: { color: '#9aa0a6', dash: 'dot', width: 1 }, hoverinfo: 'skip', showlegend: false });
      traces.push({ x: lags, y: avecPepite(courbes.__mineure), mode: 'lines',
        line: { color: p.m.couleur, width: 2.4, dash: 'dash' },
        name: `direction mineure (a<sub>p</sub> = ${fmt(p.ap, 0)})`, hoverinfo: 'skip' });
    }
    traces.push({ x: lags, y: avecPepite(courbes[p.m.cle]), mode: 'lines',
      line: { color: p.m.couleur, width: 3.2 },
      name: this.mode2d ? `direction majeure (a<sub>g</sub> = ${fmt(p.ag, 0)})` : p.m.nom,
      hoverinfo: 'skip' });

    let haut = sill * 1.25;
    for (const t of traces) for (const v of t.y) if (v > haut) haut = v * 1.06;

    Plotly.react(this.varioEl, traces, {
      margin: { t: 30, l: 54, r: 16, b: this.mode2d ? 58 : 44 },
      title: { text: 'Variogramme γ(h)', font: { size: 12 } },
      showlegend: this.mode2d,
      legend: { orientation: 'h', y: -0.2, x: 0.5, xanchor: 'center', font: { size: 9.5 } },
      annotations: [
        { x: H_MAX, y: sill, text: 'palier C + C₀', showarrow: false,
          font: { size: 10, color: '#777' }, xanchor: 'right', yanchor: 'bottom' },
        { x: aPrin, y: 0, text: this.mode2d ? 'a<sub>g</sub>' : 'a', showarrow: false,
          font: { size: 11, color: '#777' }, xanchor: 'left', yanchor: 'bottom' },
      ],
      xaxis: { title: { text: 'Distance h', standoff: 4 }, range: [0, H_MAX], gridcolor: '#eee', zeroline: false, fixedrange: true },
      yaxis: { title: 'γ(h)', range: [0, haut], gridcolor: '#eee', zeroline: false, fixedrange: true },
      plot_bgcolor: '#fff',
    }, { displaylogo: false, responsive: true });
  }

  // ---------------------------------------------------------------------------
  /** Équations du modèle choisi, en symboles puis avec les valeurs courantes. */
  _ecrireEquations(p) {
    const a = this.mode2d ? p.ag : p.a;
    const portees = this.mode2d
      ? `a_g = ${fmt(p.ag, 0)},\\quad a_p = ${fmt(p.ap, 0)},\\quad \\theta = ${fmt(p.ang, 0)}^\\circ`
      : `a = ${fmt(p.a, 0)}`;
    const nombres = `C_0 = ${fmt(p.C0)},\\quad C = ${fmt(p.C)},\\quad ${portees}` +
      `,\\quad C_0 + C = ${fmt(p.C + p.C0)}`;
    const borne = p.m.borne ? `,\\quad ${p.m.borne}` : '';
    const apres = p.m.borne ? `\\\\[2pt] \\gamma(h) &= C_0 + C \\quad\\text{pour } h > a` : '';

    this.eqEl.innerHTML = `
      <div class="m7-eq">
        <b>Variogramme</b><span>$$\\begin{aligned} \\gamma(h) &= ${p.m.gamma}${borne}${apres} \\end{aligned}$$</span>
        <b>Covariance</b><span>$$C(h) = ${p.m.cov}$$</span>
        <b>Paramètres</b><span>$$${nombres}$$</span>
      </div>
      <div style="font-size:.78rem;color:#555;margin-top:2px;">
        γ(h) = C(0) − C(h), avec C(0) = C + C₀. L’effet de pépite C₀ est la
        discontinuité à l’origine : γ(0) = 0 mais γ(0⁺) = C₀.
      </div>`;
    this.noteEl.innerHTML = `<b>${p.m.nom}.</b> ${p.m.note}`;

    // MathJax est le moteur de la page (html-math-method: mathjax). S'il n'est
    // pas encore prêt, on laisse le TeX brut plutôt que de casser le widget.
    const MJ = window.MathJax;
    if (MJ && typeof MJ.typesetPromise === 'function') {
      MJ.typesetPromise([this.eqEl]).catch(() => { /* rendu brut, sans conséquence */ });
    }
  }

  cleanup() {
    if (window.Plotly) {
      if (this.champEl) Plotly.purge(this.champEl);
      if (this.varioEl) Plotly.purge(this.varioEl);
    }
  }
}

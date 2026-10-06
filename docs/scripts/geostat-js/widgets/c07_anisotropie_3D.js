// scripts/geostat-js/widgets/c07_anisotropie_3D.js
// -----------------------------------------------------------------------------
// Widget — Atelier 7.4 « Anisotropie ». Deux modes :
//
//   2D : l'ellipse des portées, la direction étudiée, et les DEUX méthodes de
//        calcul du chapitre — portée directionnelle a_theta, et distance
//        équivalente h_g dans le système isotrope. Les deux donnent le même
//        gamma, et le widget le montre à l'écran en même temps que les formules.
//
//   3D : l'ellipsoïde d'anisotropie (3 portées + 3 rotations d'Euler) et les
//        variogrammes directionnels le long des trois axes principaux.
//
// Conventions, identiques à celles du chapitre : les angles sont trigonométriques
// (sens antihoraire depuis +x), theta_g oriente l'axe de portée maximale, et
// theta est l'angle AIGU entre le vecteur de séparation et cet axe.
//
// Les courbes viennent de gpoly.variogrammeTheorique (cov_func.covar). Les deux
// formules d'anisotropie sont de la géométrie, pas de la géostatistique : elles
// sont donc évaluées ici, et vérifiées l'une par l'autre à chaque affichage.
// -----------------------------------------------------------------------------
import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';
import { MODELES } from './c07_modeles.js';

const debounce = (fn, ms = 200) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const fmt = (v, n = 2) => (Number.isFinite(v) ? v.toFixed(n).replace('.', ',') : '—');
const RAD = Math.PI / 180;

// Palette « Turbo » (bleu -> rouge), uniforme avec les autres champs du livre.
const TURBO = [
  [0.0, 'rgb(48,18,59)'], [0.1, 'rgb(65,69,217)'], [0.2, 'rgb(35,138,244)'],
  [0.3, 'rgb(30,192,211)'], [0.4, 'rgb(53,226,149)'], [0.5, 'rgb(131,246,88)'],
  [0.6, 'rgb(199,233,47)'], [0.7, 'rgb(248,186,56)'], [0.8, 'rgb(251,122,33)'],
  [0.9, 'rgb(221,61,8)'], [1.0, 'rgb(122,4,3)'],
];
const COL = { maj: '#c43a3a', min: '#0d4d92', dir: '#7c3aed', ell: '#3a3632' };

// Valeurs de l'exemple travaillé du chapitre : a_g = 100 à 30°, a_p = 60,
// C_0 = 13, C = 17, points (10, 30) et (40, 20) -> gamma = 23,63 %².
const EXEMPLE = { ag: 100, ap: 60, thg: 30, c0: 13, c: 17, h: 31.62, thh: -18.43 };

// --- Les deux formules du chapitre -------------------------------------------
/** Portée dans la direction faisant l'angle theta (degrés) avec l'axe majeur. */
function porteeDirectionnelle(ag, ap, thetaDeg) {
  const t = thetaDeg * RAD;
  return (ag * ap) / Math.sqrt(ap * ap * Math.cos(t) ** 2 + ag * ag * Math.sin(t) ** 2);
}
/** Distance équivalente dans le système isotrope de portée a_g. */
function distanceEquivalente(ag, ap, h, thetaDeg) {
  const t = thetaDeg * RAD;
  return Math.hypot(h * Math.cos(t), (ag / ap) * h * Math.sin(t));
}
/** Angle AIGU (0 à 90°) entre une direction et l'axe majeur. */
function angleAigu(thetaH, thetaG) {
  let d = Math.abs(thetaH - thetaG) % 180;
  return d > 90 ? 180 - d : d;
}

// Matrice de rotation Euler ZYX
function rotMatrix(thetaZ, thetaY, thetaX) {
  const cz = Math.cos(thetaZ * RAD), sz = Math.sin(thetaZ * RAD);
  const cy = Math.cos(thetaY * RAD), sy = Math.sin(thetaY * RAD);
  const cx = Math.cos(thetaX * RAD), sx = Math.sin(thetaX * RAD);
  return [
    [cz * cy, cz * sy * sx - sz * cx, cz * sy * cx + sz * sx],
    [sz * cy, sz * sy * sx + cz * cx, sz * sy * cx - cz * sx],
    [-sy, cy * sx, cy * cx],
  ];
}
function matVec(M, v) {
  return [
    M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2],
    M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2],
    M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2],
  ];
}

export default class C07Anisotropie3D extends Widget {
  render() {
    this.mode2d = true;   // l'atelier s'ouvre sur le cas 2D, celui du chapitre
    const id = this.el.id;
    this.el.insertAdjacentHTML('beforeend', `
      <style>
        #${id} .a7-row label { display:inline-flex !important; flex-direction:row !important; align-items:center; gap:5px; }
        #${id} .a7-row label span { display:inline; }
        /* Le nom de la méthode est AU-DESSUS du calcul : la formule dispose ainsi
           de toute la largeur du widget. Sans cela, elle déborde de la colonne et
           .geostat-widget { overflow:hidden } la coupe — elle devient invisible. */
        #${id} .a7-eq { display:flex; flex-direction:column; gap:9px; }
        #${id} .a7-eq > div { border-left:3px solid #c9d6e8; padding-left:10px; }
        #${id} .a7-eq b { display:block; font-size:.76rem; color:#3f5170; font-weight:700;
                          letter-spacing:.01em; margin-bottom:1px; }
        /* Filet de sécurité : si une formule reste plus large que le widget, on la
           fait défiler au lieu de la rogner. */
        #${id} .a7-math { display:block; overflow-x:auto; overflow-y:hidden; font-size:.95em; }
        #${id} .a7-math mjx-container[display="true"] { margin:.2em 0 !important; text-align:left !important; }
        #${id} .a7-brut { font-family:'JetBrains Mono',ui-monospace,monospace; font-size:.8rem;
                          color:#333; line-height:1.5; }
      </style>
      <div class="gw-controls a7-row" style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.84rem;margin-bottom:6px;">
        <label><b style="font-size:.8rem;color:#444;">Modèle</b> <select class="js-mod" style="font-size:.82rem;padding:2px 4px;">
          ${MODELES.map(m => `<option value="${m.cle}">${m.nom}</option>`).join('')}
        </select></label>
        <button class="js-mode" type="button" style="font-size:.78rem;padding:4px 12px;background:#1f6f6f;color:#fff;border:none;border-radius:5px;cursor:pointer;font-weight:600;">Passer en 3D</button>
        <button class="js-exemple js-2d-only" type="button" style="font-size:.78rem;padding:4px 10px;background:#3a3632;color:#fff;border:none;border-radius:5px;cursor:pointer;">Exemple du chapitre</button>
      </div>

      <div class="gw-controls a7-row js-2d-only" style="display:flex;flex-wrap:wrap;gap:14px;align-items:center;padding:8px 12px;background:#f3f7fb;border:1px solid #cfe0ee;border-radius:8px;font-size:.84rem;margin-bottom:6px;">
        <b style="font-size:.78rem;color:#555;">Ellipse d'anisotropie</b>
        <label>Portée majeure <span>a<sub>g</sub></span> <input type="range" class="js-ag" min="20" max="200" value="100" step="5" style="width:110px"><span class="js-agv">100</span></label>
        <label>Portée mineure <span>a<sub>p</sub></span> <input type="range" class="js-ap" min="10" max="200" value="60" step="5" style="width:110px"><span class="js-apv">60</span></label>
        <label>Azimut <span>&theta;<sub>g</sub></span> <input type="range" class="js-thg" min="0" max="175" value="30" step="5" style="width:110px"><span class="js-thgv">30</span>&deg;</label>
      </div>
      <div class="gw-controls a7-row js-2d-only" style="display:flex;flex-wrap:wrap;gap:14px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.84rem;margin-bottom:6px;">
        <b style="font-size:.78rem;color:#555;">Vecteur étudié</b>
        <label>Direction <span>&theta;<sub>h</sub></span> <input type="range" class="js-thh" min="-90" max="180" value="-18.43" step="0.01" style="width:120px"><span class="js-thhv">-18,43</span>&deg;</label>
        <label>Distance <span>h</span> <input type="range" class="js-h" min="1" max="200" value="31.62" step="0.01" style="width:120px"><span class="js-hv">31,62</span></label>
        <label>Palier <span>C</span> <input type="range" class="js-c" min="1" max="40" value="17" step="1" style="width:90px"><span class="js-cv">17</span></label>
        <label>Pépite <span>C<sub>0</sub></span> <input type="range" class="js-c0" min="0" max="30" value="13" step="1" style="width:90px"><span class="js-c0v">13</span></label>
      </div>

      <div class="gw-controls js-3d-only" style="display:flex;flex-direction:column;gap:6px;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;margin-bottom:6px;">
        <div style="display:flex;flex-wrap:wrap;gap:14px;align-items:center;">
          <span style="font-weight:600;color:#666;min-width:64px;">Portées :</span>
          <label style="display:inline-flex;align-items:center;gap:5px;"><span>a<sub>x</sub></span><input type="range" class="js-ax" min="5" max="20" value="16" step="1" style="width:90px"><span class="js-axv">16</span></label>
          <label style="display:inline-flex;align-items:center;gap:5px;"><span>a<sub>y</sub></span><input type="range" class="js-ay" min="5" max="20" value="12" step="1" style="width:90px"><span class="js-ayv">12</span></label>
          <label style="display:inline-flex;align-items:center;gap:5px;"><span>a<sub>z</sub></span><input type="range" class="js-az" min="5" max="20" value="8" step="1" style="width:90px"><span class="js-azv">8</span></label>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:14px;align-items:center;">
          <span style="font-weight:600;color:#666;min-width:64px;">Angles :</span>
          <label style="display:inline-flex;align-items:center;gap:5px;"><span>θ<sub>xy</sub></span><input type="range" class="js-tz" min="0" max="180" value="30" step="5" style="width:90px"><span><span class="js-tzv">30</span>°</span></label>
          <label style="display:inline-flex;align-items:center;gap:5px;"><span>θ<sub>xz</sub></span><input type="range" class="js-ty" min="-90" max="90" value="0" step="5" style="width:90px"><span><span class="js-tyv">0</span>°</span></label>
          <label style="display:inline-flex;align-items:center;gap:5px;"><span>θ<sub>yz</sub></span><input type="range" class="js-tx" min="-90" max="90" value="0" step="5" style="width:90px"><span><span class="js-txv">0</span>°</span></label>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:start;">
        <div class="js-plot-ellipse" style="height:380px"></div>
        <div class="js-plot-vario" style="height:380px"></div>
      </div>
      <div class="js-equations js-2d-only" style="margin:8px 2px 2px;padding:10px 14px;background:#fbfbfd;border:1px solid #e3e3ea;border-radius:8px;font-size:.86rem;"></div>
      <div class="js-info" style="padding:.5rem 1rem;font-family:'JetBrains Mono',monospace;font-size:.85rem;color:#444;text-align:center;background:#eef2e8;border:1px solid #b8c8a8;border-radius:6px;margin-top:6px;">—</div>
      <p class="js-note" style="margin:6px 1rem;font-size:11px;color:#666;"></p>
    `);

    this.plotE = this.el.querySelector('.js-plot-ellipse');
    this.plotV = this.el.querySelector('.js-plot-vario');
    this.infoEl = this.el.querySelector('.js-info');
    this.eqEl = this.el.querySelector('.js-equations');
    this.noteEl = this.el.querySelector('.js-note');
    this.ctrl = {};
    for (const k of ['mod', 'ag', 'ap', 'thg', 'thh', 'h', 'c', 'c0',
                     'ax', 'ay', 'az', 'tz', 'ty', 'tx']) {
      this.ctrl[k] = this.el.querySelector('.js-' + k);
    }

    const update = debounce(() => this.refresh(), 160);
    const dec = { ag: 0, ap: 0, thg: 0, thh: 2, h: 2, c: 0, c0: 0 };
    for (const [k, el] of Object.entries(this.ctrl)) {
      if (!el) continue;
      this.on(el, 'input', e => {
        const s = this.el.querySelector(`.js-${k}v`);
        if (s) s.textContent = (k in dec) ? fmt(parseFloat(e.target.value), dec[k]) : e.target.value;
        update();
      });
      this.on(el, 'change', update);
    }
    this.on(this.el.querySelector('.js-mode'), 'click', () => {
      this.mode2d = !this.mode2d; this._appliquerMode(); this.refresh();
    });
    this.on(this.el.querySelector('.js-exemple'), 'click', () => this._exemple());

    this._appliquerMode();
    afficherChargementJusquaPret(this.el).then(() => this.refresh());
  }

  /** Les feuilles de style posent display:inline-flex !important sur les <label> :
   *  il faut masquer AVEC la priorité. */
  _appliquerMode() {
    const btn = this.el.querySelector('.js-mode');
    btn.textContent = this.mode2d ? 'Passer en 3D' : '← Revenir en 2D';
    btn.style.background = this.mode2d ? '#1f6f6f' : '#3a3632';
    const bascule = (sel, visible) => {
      for (const n of this.el.querySelectorAll(sel)) {
        if (visible) n.style.removeProperty('display');
        else n.style.setProperty('display', 'none', 'important');
      }
    };
    bascule('.js-2d-only', this.mode2d);
    bascule('.js-3d-only', !this.mode2d);
  }

  _exemple() {
    const v = { ag: EXEMPLE.ag, ap: EXEMPLE.ap, thg: EXEMPLE.thg,
                thh: EXEMPLE.thh, h: EXEMPLE.h, c: EXEMPLE.c, c0: EXEMPLE.c0 };
    const dec = { ag: 0, ap: 0, thg: 0, thh: 2, h: 2, c: 0, c0: 0 };
    for (const [k, val] of Object.entries(v)) {
      this.ctrl[k].value = val;
      const s = this.el.querySelector(`.js-${k}v`);
      if (s) s.textContent = fmt(val, dec[k]);
    }
    this.ctrl.mod.value = 'spherique';
    this.refresh();
  }

  async refresh() {
    if (this.mode2d) await this._refresh2D();
    else await this._refresh3D();
  }

  // ===========================================================================
  // 2D — ellipse des portées + les deux méthodes du chapitre
  // ===========================================================================
  async _refresh2D() {
    const mod = this.ctrl.mod.value;
    const nomModele = (MODELES.find(m => m.cle === mod) || MODELES[0]).nom;
    const ag = parseFloat(this.ctrl.ag.value);
    const ap = Math.min(parseFloat(this.ctrl.ap.value), ag);  // a_p <= a_g par définition
    const thg = parseFloat(this.ctrl.thg.value);
    const thh = parseFloat(this.ctrl.thh.value);
    const h = parseFloat(this.ctrl.h.value);
    const C = parseFloat(this.ctrl.c.value);
    const C0 = parseFloat(this.ctrl.c0.value);

    const theta = angleAigu(thh, thg);
    const aTheta = porteeDirectionnelle(ag, ap, theta);
    const hg = distanceEquivalente(ag, ap, h, theta);

    // --- Panneau de gauche : l'ellipse, l'axe majeur, la direction étudiée ---
    const ex = [], ey = [];
    for (let k = 0; k <= 240; k++) {
      const phi = k * 360 / 240;                     // direction absolue
      const r = porteeDirectionnelle(ag, ap, angleAigu(phi, thg));
      ex.push(r * Math.cos(phi * RAD)); ey.push(r * Math.sin(phi * RAD));
    }
    const ray = (ang, L) => ({ x: [-L * Math.cos(ang * RAD), L * Math.cos(ang * RAD)],
                               y: [-L * Math.sin(ang * RAD), L * Math.sin(ang * RAD)] });
    const axeMaj = ray(thg, ag), axeMin = ray(thg + 90, ap);
    const ux = Math.cos(thh * RAD), uy = Math.sin(thh * RAD);
    const lim = ag * 1.25;

    if (!window.Plotly) { this.afficherAvertissement('Plotly non chargé.'); return; }
    const axeCarte = { zeroline: true, zerolinecolor: '#ddd', gridcolor: '#f0f0f0',
                       range: [-lim, lim], fixedrange: true, ticks: 'outside', tickfont: { size: 9 } };
    Plotly.react(this.plotE, [
      { x: ex, y: ey, mode: 'lines', line: { color: COL.ell, width: 2 },
        name: 'Ellipse des portées', hoverinfo: 'skip' },
      { x: axeMaj.x, y: axeMaj.y, mode: 'lines', line: { color: COL.maj, width: 2.5 },
        name: `axe majeur a<sub>g</sub> = ${fmt(ag, 0)}`, hoverinfo: 'skip' },
      { x: axeMin.x, y: axeMin.y, mode: 'lines', line: { color: COL.min, width: 2.5 },
        name: `axe mineur a<sub>p</sub> = ${fmt(ap, 0)}`, hoverinfo: 'skip' },
      { x: [0, lim * ux], y: [0, lim * uy], mode: 'lines',
        line: { color: COL.dir, width: 1.4, dash: 'dot' },
        name: `direction θ<sub>h</sub> = ${fmt(thh, 2)}°`, hoverinfo: 'skip' },
      { x: [aTheta * ux], y: [aTheta * uy], mode: 'markers',
        marker: { color: COL.dir, size: 11, symbol: 'circle', line: { color: '#fff', width: 1.5 } },
        name: `a<sub>θ</sub> = ${fmt(aTheta)}`, hoverinfo: 'skip' },
      { x: [0, h * ux], y: [0, h * uy], mode: 'lines+markers',
        line: { color: '#0b8a3a', width: 3 },
        marker: { color: '#0b8a3a', size: 8 },
        name: `vecteur h = ${fmt(h, 2)}`, hoverinfo: 'skip' },
    ], {
      margin: { t: 32, l: 48, r: 14, b: 40 },
      title: { text: "Ellipse d'anisotropie (plan)", font: { size: 12 } },
      xaxis: { ...axeCarte, title: { text: 'x', standoff: 2 }, constrain: 'domain' },
      yaxis: { ...axeCarte, title: { text: 'y', standoff: 2 }, scaleanchor: 'x', constrain: 'domain' },
      legend: { orientation: 'h', y: -0.14, yanchor: 'top', x: 0.5, xanchor: 'center',
                font: { size: 9 }, bgcolor: 'rgba(0,0,0,0)' },
      plot_bgcolor: '#fff',
    }, { displaylogo: false, responsive: true, displayModeBar: false });

    // --- Panneau de droite : variogrammes des trois directions ---
    const hMax = ag * 2;
    const lags = []; for (let k = 0; k <= 120; k++) lags.push(k * hMax / 120);
    let gMaj, gMin, gDir;
    try {
      [gMaj, gMin, gDir] = await Promise.all([
        gpoly.variogrammeTheorique(mod, lags, ag, C),
        gpoly.variogrammeTheorique(mod, lags, ap, C),
        gpoly.variogrammeTheorique(mod, lags, aTheta, C),
      ]);
    } catch (e) { this.afficherAvertissement('Erreur variogramme : ' + e.message); return; }
    const pep = y => Array.from(y, (v, i) => v + (lags[i] > 0 ? C0 : 0));
    // gamma au point étudié : les DEUX méthodes, calculées séparément.
    let gammaM1, gammaM2;
    try {
      gammaM1 = (await gpoly.variogrammeTheorique(mod, [h], aTheta, C))[0] + (h > 0 ? C0 : 0);
      gammaM2 = (await gpoly.variogrammeTheorique(mod, [hg], ag, C))[0] + (hg > 0 ? C0 : 0);
    } catch (e) { this.afficherAvertissement('Erreur variogramme : ' + e.message); return; }

    const sill = C + C0;
    let haut = sill * 1.25;
    for (const y of [pep(gMaj), pep(gMin), pep(gDir)]) for (const v of y) if (v * 1.08 > haut) haut = v * 1.08;

    Plotly.react(this.plotV, [
      { x: lags, y: pep(gMaj), mode: 'lines', line: { color: COL.maj, width: 2.5 },
        name: `axe majeur (a<sub>g</sub> = ${fmt(ag, 0)})`, hoverinfo: 'skip' },
      { x: lags, y: pep(gMin), mode: 'lines', line: { color: COL.min, width: 2.5 },
        name: `axe mineur (a<sub>p</sub> = ${fmt(ap, 0)})`, hoverinfo: 'skip' },
      { x: lags, y: pep(gDir), mode: 'lines', line: { color: COL.dir, width: 3, dash: 'dash' },
        name: `direction étudiée (a<sub>θ</sub> = ${fmt(aTheta)})`, hoverinfo: 'skip' },
      { x: [h, h], y: [0, haut], mode: 'lines', line: { color: '#0b8a3a', width: 1.2, dash: 'dot' },
        showlegend: false, hoverinfo: 'skip' },
      { x: [h], y: [gammaM1], mode: 'markers',
        marker: { color: '#0b8a3a', size: 12, symbol: 'diamond', line: { color: '#fff', width: 1.5 } },
        name: `γ(h) = ${fmt(gammaM1)}`, hoverinfo: 'skip' },
    ], {
      margin: { t: 32, l: 56, r: 14, b: 76 },
      title: { text: 'Variogrammes directionnels', font: { size: 12 } },
      xaxis: { title: { text: 'Distance h', standoff: 4 }, range: [0, hMax], gridcolor: '#eee', zeroline: false, fixedrange: true },
      yaxis: { title: 'γ(h)', range: [0, haut], gridcolor: '#eee', zeroline: false, fixedrange: true },
      legend: { orientation: 'h', y: -0.18, yanchor: 'top', x: 0.5, xanchor: 'center',
                font: { size: 9 }, bgcolor: 'rgba(0,0,0,0)' },
      plot_bgcolor: '#fff',
    }, { displaylogo: false, responsive: true, displayModeBar: false });

    this._ecrireEquations({ ag, ap, thg, thh, theta, h, hg, aTheta, C, C0, gammaM1, gammaM2, nomModele });
  }

  _ecrireEquations(p) {
    const ecart = Math.abs(p.gammaM1 - p.gammaM2);
    const r1 = p.h / p.aTheta, r2 = p.hg / p.ag;
    // Le nombre est écrit avec la virgule décimale ; dans une formule TeX il faut
    // le protéger ({,}) sinon MathJax l'espace comme un séparateur de liste.
    const tex = (v, n = 2) => fmt(v, n).replace(',', '{,}');
    const ag = tex(p.ag, 0), ap = tex(p.ap, 0), th = tex(p.theta), hh = tex(p.h, 2);

    // Chaque calcul tient sur deux lignes alignées sur le « = » : la formule
    // littérale d'abord, l'application numérique ensuite. C'est deux fois moins
    // large qu'une seule longue ligne, donc lisible dans la largeur du widget.
    this.eqEl.innerHTML = `
      <div class="a7-eq">
        <div>
          <b>Méthode 1 — portée directionnelle a<sub>θ</sub></b>
          <div class="a7-math">$$\\begin{aligned}
            a_\\theta &= \\frac{a_g\\,a_p}{\\sqrt{a_p^{2}\\cos^{2}\\theta + a_g^{2}\\sin^{2}\\theta}} \\\\[2pt]
                      &= \\frac{${ag}\\times${ap}}
                               {\\sqrt{${ap}^{2}\\cos^{2}(${th}^\\circ)+${ag}^{2}\\sin^{2}(${th}^\\circ)}}
                       = ${tex(p.aTheta)}
          \\end{aligned}$$</div>
        </div>
        <div>
          <b>Méthode 2 — distance équivalente h<sub>g</sub></b>
          <div class="a7-math">$$\\begin{aligned}
            h_g &= \\sqrt{\\left[h\\cos\\theta\\right]^{2}
                        + \\left[\\tfrac{a_g}{a_p}\\,h\\sin\\theta\\right]^{2}} \\\\[2pt]
                &= \\sqrt{\\left[${hh}\\cos(${th}^\\circ)\\right]^{2}
                        + \\left[\\tfrac{${ag}}{${ap}}\\,${hh}\\sin(${th}^\\circ)\\right]^{2}}
                 = ${tex(p.hg)}
          \\end{aligned}$$</div>
        </div>
        <div>
          <b>Pourquoi les deux méthodes coïncident</b>
          <div class="a7-math">$$
            \\frac{h}{a_\\theta} = \\frac{${hh}}{${tex(p.aTheta)}} = ${tex(r1, 4)}
            \\qquad\\text{et}\\qquad
            \\frac{h_g}{a_g} = \\frac{${tex(p.hg)}}{${ag}} = ${tex(r2, 4)}
          $$</div>
        </div>
      </div>
      <div style="font-size:.79rem;color:#555;margin-top:4px;">
        Les deux méthodes mènent au même rapport distance / portée, donc au même
        variogramme : évaluer γ à la distance <i>h</i> avec la portée a<sub>θ</sub>,
        ou à la distance transformée <i>h</i><sub>g</sub> avec la portée a<sub>g</sub>,
        revient exactement au même.
      </div>`;
    // Version de secours, en texte, si MathJax n'est pas disponible sur la page.
    this._texteBrut = [
      ['Méthode 1 — portée directionnelle a<sub>θ</sub>',
       `a<sub>θ</sub> = a<sub>g</sub>·a<sub>p</sub> / √(a<sub>p</sub>²cos²θ + a<sub>g</sub>²sin²θ)<br>` +
       `&nbsp;&nbsp;&nbsp;= ${fmt(p.ag, 0)}×${fmt(p.ap, 0)} / √(${fmt(p.ap, 0)}²cos²(${fmt(p.theta)}°) + ${fmt(p.ag, 0)}²sin²(${fmt(p.theta)}°)) = <b>${fmt(p.aTheta)}</b>`],
      ['Méthode 2 — distance équivalente h<sub>g</sub>',
       `h<sub>g</sub> = √( [h·cosθ]² + [(a<sub>g</sub>/a<sub>p</sub>)·h·sinθ]² )<br>` +
       `&nbsp;&nbsp;&nbsp;= √( [${fmt(p.h, 2)}·cos(${fmt(p.theta)}°)]² + [(${fmt(p.ag, 0)}/${fmt(p.ap, 0)})·${fmt(p.h, 2)}·sin(${fmt(p.theta)}°)]² ) = <b>${fmt(p.hg)}</b>`],
      ['Pourquoi les deux méthodes coïncident',
       `h / a<sub>θ</sub> = ${fmt(p.h, 2)} / ${fmt(p.aTheta)} = ${fmt(r1, 4)}` +
       `&nbsp;&nbsp;et&nbsp;&nbsp;h<sub>g</sub> / a<sub>g</sub> = ${fmt(p.hg)} / ${fmt(p.ag, 0)} = ${fmt(r2, 4)}`],
    ];

    this.infoEl.innerHTML =
      `<div style="font-weight:600;color:#4a6a3a;margin-bottom:3px;">` +
      `Direction θ<sub>h</sub> = ${fmt(p.thh, 2)}° &nbsp;·&nbsp; axe majeur à ${fmt(p.thg, 0)}° ` +
      `&nbsp;·&nbsp; angle entre les deux θ = <b>${fmt(p.theta)}°</b></div>` +
      `<div>a<sub>θ</sub> = <b>${fmt(p.aTheta)}</b> &nbsp;·&nbsp; h<sub>g</sub> = <b>${fmt(p.hg)}</b> ` +
      `&nbsp;·&nbsp; rapport d'anisotropie a<sub>g</sub>/a<sub>p</sub> = <b>${fmt(p.ag / p.ap)}</b></div>` +
      `<div style="margin-top:3px;">γ par la méthode 1 = <b>${fmt(p.gammaM1)}</b> ` +
      `&nbsp;·&nbsp; par la méthode 2 = <b>${fmt(p.gammaM2)}</b> ` +
      `&nbsp;·&nbsp; écart = <b style="color:${ecart < 1e-6 ? '#1f7a3a' : '#b03a2e'}">${ecart.toExponential(1)}</b></div>`;

    this.noteEl.innerHTML =
      `<b>Modèle ${p.nomModele}.</b> Déplacez la direction θ<sub>h</sub> : ` +
      `quand elle s'aligne sur l'axe majeur, a<sub>θ</sub> → a<sub>g</sub> et h<sub>g</sub> → h ; ` +
      `à 90° de celui-ci, a<sub>θ</sub> → a<sub>p</sub> et h<sub>g</sub> est dilaté du rapport ` +
      `a<sub>g</sub>/a<sub>p</sub>. Le bouton « Exemple du chapitre » recharge le cas travaillé ` +
      `(a<sub>g</sub> = 100 à 30°, a<sub>p</sub> = 60, C₀ = 13, C = 17) : on doit lire γ ≈ 23,63.`;

    this._composerFormules();
  }

  /** Fait composer les formules par MathJax ; si la page n'en a pas (ou si la
   *  composition échoue), on bascule sur la version texte plutôt que de laisser
   *  du code TeX brut à l'écran. */
  _composerFormules() {
    const MJ = window.MathJax;
    const secours = () => {
      const bloc = this.eqEl.querySelector('.a7-eq');
      if (!bloc || !this._texteBrut) return;
      bloc.innerHTML = this._texteBrut
        .map(([titre, corps]) => `<div><b>${titre}</b><div class="a7-brut">${corps}</div></div>`)
        .join('');
    };
    if (!MJ || typeof MJ.typesetPromise !== 'function') { secours(); return; }
    MJ.typesetPromise([this.eqEl])
      .then(() => { if (!this.eqEl.querySelector('mjx-container')) secours(); })
      .catch(secours);
  }

  // ===========================================================================
  // 3D — ellipsoïde + variogrammes le long des trois axes principaux
  // ===========================================================================
  async _refresh3D() {
    const mod = this.ctrl.mod.value;
    const ax = parseFloat(this.ctrl.ax.value);
    const ay = parseFloat(this.ctrl.ay.value);
    const az = parseFloat(this.ctrl.az.value);
    const R = rotMatrix(parseFloat(this.ctrl.tz.value),
                        parseFloat(this.ctrl.ty.value),
                        parseFloat(this.ctrl.tx.value));

    const nU = 30, nV = 20;
    const xs = [], ys = [], zs = [];
    for (let i = 0; i <= nU; i++) {
      const u = i * 2 * Math.PI / nU;
      const rowX = [], rowY = [], rowZ = [];
      for (let j = 0; j <= nV; j++) {
        const v = -Math.PI / 2 + j * Math.PI / nV;
        const [xr, yr, zr] = matVec(R, [ax * Math.cos(v) * Math.cos(u),
                                        ay * Math.cos(v) * Math.sin(u),
                                        az * Math.sin(v)]);
        rowX.push(xr); rowY.push(yr); rowZ.push(zr);
      }
      xs.push(rowX); ys.push(rowY); zs.push(rowZ);
    }
    const lAx = matVec(R, [ax, 0, 0]), lAy = matVec(R, [0, ay, 0]), lAz = matVec(R, [0, 0, az]);

    if (!window.Plotly) return;
    Plotly.react(this.plotE, [
      { type: 'surface', x: xs, y: ys, z: zs, colorscale: TURBO,
        opacity: 0.7, showscale: false, name: 'Ellipsoïde' },
      { type: 'scatter3d', x: [-lAx[0], lAx[0]], y: [-lAx[1], lAx[1]], z: [-lAx[2], lAx[2]],
        mode: 'lines', line: { color: '#c43a3a', width: 6 }, name: `Axe X (a=${ax})` },
      { type: 'scatter3d', x: [-lAy[0], lAy[0]], y: [-lAy[1], lAy[1]], z: [-lAy[2], lAy[2]],
        mode: 'lines', line: { color: '#0d4d92', width: 6 }, name: `Axe Y (a=${ay})` },
      { type: 'scatter3d', x: [-lAz[0], lAz[0]], y: [-lAz[1], lAz[1]], z: [-lAz[2], lAz[2]],
        mode: 'lines', line: { color: '#16a34a', width: 6 }, name: `Axe Z (a=${az})` },
    ], {
      margin: { t: 35, l: 10, r: 10, b: 10 },
      uirevision: 'aniso',
      scene: {
        aspectmode: 'cube',
        camera: { eye: { x: 1.4, y: 1.4, z: 1.9 } },
        xaxis: { title: 'X', range: [-20, 20] },
        yaxis: { title: 'Y', range: [-20, 20] },
        zaxis: { title: 'Z', range: [-20, 20] },
      },
      title: { text: `Ellipsoïde d'anisotropie 3D`, font: { size: 12 } },
      legend: { orientation: 'h', y: -0.05, x: 0.5, xanchor: 'center', font: { size: 10 } },
    }, { displaylogo: false, responsive: true });

    const h_max = 30;
    const lags = []; for (let k = 0; k <= 60; k++) lags.push(k * h_max / 60);
    let gX, gY, gZ;
    try {
      [gX, gY, gZ] = await Promise.all([
        gpoly.variogrammeTheorique(mod, lags, ax, 1.0),
        gpoly.variogrammeTheorique(mod, lags, ay, 1.0),
        gpoly.variogrammeTheorique(mod, lags, az, 1.0),
      ]);
    } catch (e) { this.afficherAvertissement('Erreur variogramme : ' + e.message); return; }
    Plotly.react(this.plotV, [
      { x: lags, y: Array.from(gX), mode: 'lines', line: { color: '#c43a3a', width: 2.5 }, name: `Direction X (a=${ax})` },
      { x: lags, y: Array.from(gY), mode: 'lines', line: { color: '#0d4d92', width: 2.5 }, name: `Direction Y (a=${ay})` },
      { x: lags, y: Array.from(gZ), mode: 'lines', line: { color: '#16a34a', width: 2.5 }, name: `Direction Z (a=${az})` },
    ], {
      margin: { t: 35, l: 50, r: 20, b: 70 },
      hovermode: false,
      xaxis: { title: { text: 'h', standoff: 4 }, range: [0, 30] },
      yaxis: { title: 'γ(h)', range: [0, 1.1] },
      title: { text: 'Variogrammes directionnels', font: { size: 12 } },
      legend: { orientation: 'h', y: -0.32, yanchor: 'top', x: 0.5, xanchor: 'center', font: { size: 10 } },
    }, { displaylogo: false, responsive: true });

    this.infoEl.innerHTML =
      `<div style="font-weight:600;color:#4a6a3a;margin-bottom:3px;">Rapports d'anisotropie</div>` +
      `<div>a<sub>x</sub>/a<sub>y</sub> = <b>${fmt(ax / ay)}</b> &nbsp;·&nbsp; ` +
      `a<sub>x</sub>/a<sub>z</sub> = <b>${fmt(ax / az)}</b> &nbsp;·&nbsp; ` +
      `a<sub>y</sub>/a<sub>z</sub> = <b>${fmt(ay / az)}</b></div>`;
    this.noteEl.innerHTML =
      `L'ellipsoïde a ses trois axes alignés sur les portées a<sub>x</sub>, a<sub>y</sub>, a<sub>z</sub>, ` +
      `puis il est orienté par trois rotations dans les plans de coordonnées. Le variogramme le long ` +
      `de chaque axe principal garde sa portée : la rotation ne change que l'orientation des axes, ` +
      `pas la continuité le long de ceux-ci.`;
  }

  cleanup() {
    if (window.Plotly) {
      if (this.plotE) Plotly.purge(this.plotE);
      if (this.plotV) Plotly.purge(this.plotV);
    }
  }
}

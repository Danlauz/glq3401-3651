// scripts/geostat-js/widgets/c07_anisotropie_3D.js
// -----------------------------------------------------------------------------
// Widget — Anisotropie 3D : 3 portees + rotations Euler, ellipsoide affiche en 3D
// via Plotly mesh3d. Permet de visualiser comment les portees principales
// (a_X, a_Y, a_Z) et les angles (theta_X, theta_Y, theta_Z) controlent
// la direction principale de continuite spatiale.
// -----------------------------------------------------------------------------
import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';
const debounce = (fn, ms = 200) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

// Palette « Turbo » (bleu -> rouge), uniforme avec les autres champs du livre.
const TURBO = [
  [0.0, 'rgb(48,18,59)'], [0.1, 'rgb(65,69,217)'], [0.2, 'rgb(35,138,244)'],
  [0.3, 'rgb(30,192,211)'], [0.4, 'rgb(53,226,149)'], [0.5, 'rgb(131,246,88)'],
  [0.6, 'rgb(199,233,47)'], [0.7, 'rgb(248,186,56)'], [0.8, 'rgb(251,122,33)'],
  [0.9, 'rgb(221,61,8)'], [1.0, 'rgb(122,4,3)'],
];

// Matrice de rotation Euler ZYX
function rotMatrix(thetaZ, thetaY, thetaX) {
  const dToR = Math.PI / 180;
  const cz = Math.cos(thetaZ * dToR), sz = Math.sin(thetaZ * dToR);
  const cy = Math.cos(thetaY * dToR), sy = Math.sin(thetaY * dToR);
  const cx = Math.cos(thetaX * dToR), sx = Math.sin(thetaX * dToR);
  return [
    [cz*cy, cz*sy*sx - sz*cx, cz*sy*cx + sz*sx],
    [sz*cy, sz*sy*sx + cz*cx, sz*sy*cx - cz*sx],
    [-sy,    cy*sx,             cy*cx           ],
  ];
}

function matVec(M, v) {
  return [
    M[0][0]*v[0] + M[0][1]*v[1] + M[0][2]*v[2],
    M[1][0]*v[0] + M[1][1]*v[1] + M[1][2]*v[2],
    M[2][0]*v[0] + M[2][1]*v[1] + M[2][2]*v[2],
  ];
}

export default class C07Anisotropie3D extends Widget {
  render() {
    this.el.insertAdjacentHTML('beforeend', `
      <div class="gw-controls" style="display:flex;flex-direction:column;gap:6px;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;">
        <div style="display:flex;flex-wrap:wrap;gap:14px;align-items:center;">
          <label>Modèle <select class="js-mod">
            <option value="spherique">Sphérique</option><option value="exponentiel">Exponentiel</option><option value="gaussien">Gaussien</option>
          </select></label>
        </div>
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
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px;">
        <div class="js-plot-ellipse" style="height:380px"></div>
        <div class="js-plot-vario" style="height:380px"></div>
      </div>
      <div class="js-info" style="padding:.5rem 1rem;font-family:'JetBrains Mono',monospace;font-size:.85rem;color:#444;text-align:center;background:#eef2e8;border:1px solid #b8c8a8;border-radius:6px;margin-top:4px;">—</div>
      <p style="margin:4px 1rem;font-size:11px;color:#666;">
        L'ellipsoïde d'anisotropie a ses 3 axes principaux alignés avec les 3 portées (a<sub>x</sub>, a<sub>y</sub>, a<sub>z</sub>), puis orienté dans l'espace par 3 rotations dans les plans de coordonnées : θ<sub>xy</sub> (plan xy), θ<sub>xz</sub> (plan xz) et θ<sub>yz</sub> (plan yz). Le variogramme directionnel le long de chaque axe principal garde sa portée (la rotation ne change que l'orientation des axes, pas la continuité le long de ceux-ci).</p>
    `);
    this.plotE = this.el.querySelector('.js-plot-ellipse');
    this.plotV = this.el.querySelector('.js-plot-vario');
    this.infoEl = this.el.querySelector('.js-info');
    this.ctrl = {
      mod: this.el.querySelector('.js-mod'),
      ax: this.el.querySelector('.js-ax'), ay: this.el.querySelector('.js-ay'), az: this.el.querySelector('.js-az'),
      tz: this.el.querySelector('.js-tz'), ty: this.el.querySelector('.js-ty'), tx: this.el.querySelector('.js-tx'),
    };
    const update = debounce(() => this.refresh(), 200);
    for (const [k, el] of Object.entries(this.ctrl)) {
      this.on(el, 'input', e => { const s = this.el.querySelector(`.js-${k}v`); if (s) s.textContent = e.target.value; });
      this.on(el, 'input', update); this.on(el, 'change', update);
    }
    afficherChargementJusquaPret(this.el).then(() => this.refresh());
  }

  async refresh() {
    const mod = this.ctrl.mod.value;
    const ax = parseFloat(this.ctrl.ax.value);
    const ay = parseFloat(this.ctrl.ay.value);
    const az = parseFloat(this.ctrl.az.value);
    const tz = parseFloat(this.ctrl.tz.value);
    const ty = parseFloat(this.ctrl.ty.value);
    const tx = parseFloat(this.ctrl.tx.value);
    const R = rotMatrix(tz, ty, tx);

    // Generer ellipsoide : surface parametrique
    const nU = 30, nV = 20;
    const xs = [], ys = [], zs = [];
    for (let i = 0; i <= nU; i++) {
      const u = i * 2 * Math.PI / nU;
      const rowX = [], rowY = [], rowZ = [];
      for (let j = 0; j <= nV; j++) {
        const v = -Math.PI / 2 + j * Math.PI / nV;
        const xl = ax * Math.cos(v) * Math.cos(u);
        const yl = ay * Math.cos(v) * Math.sin(u);
        const zl = az * Math.sin(v);
        const [xr, yr, zr] = matVec(R, [xl, yl, zl]);
        rowX.push(xr); rowY.push(yr); rowZ.push(zr);
      }
      xs.push(rowX); ys.push(rowY); zs.push(rowZ);
    }

    // Axes principaux : 3 segments
    const lAx = matVec(R, [ax, 0, 0]);
    const lAy = matVec(R, [0, ay, 0]);
    const lAz = matVec(R, [0, 0, az]);

    if (!window.Plotly) return;
    Plotly.react(this.plotE, [
      { type: 'surface', x: xs, y: ys, z: zs, colorscale: TURBO,
        opacity: 0.7, showscale: false, name: 'Ellipsoïde' },
      // Axes
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

    // Variogramme directionnel : evaluer γ(h) selon les 3 axes principaux roto-positionnes
    const h_max = 30;   // axe h FIXE (les 3 directions sur la même échelle, stable)
    const lags = []; for (let k = 0; k <= 60; k++) lags.push(k * h_max / 60);
    const [gX, gY, gZ] = await Promise.all([
      gpoly.variogrammeTheorique(mod, lags, ax, 1.0),
      gpoly.variogrammeTheorique(mod, lags, ay, 1.0),
      gpoly.variogrammeTheorique(mod, lags, az, 1.0),
    ]);
    Plotly.react(this.plotV, [
      { x: lags, y: Array.from(gX), mode: 'lines', line: { color: '#c43a3a', width: 2.5 }, name: `Direction X (a=${ax})` },
      { x: lags, y: Array.from(gY), mode: 'lines', line: { color: '#0d4d92', width: 2.5 }, name: `Direction Y (a=${ay})` },
      { x: lags, y: Array.from(gZ), mode: 'lines', line: { color: '#16a34a', width: 2.5 }, name: `Direction Z (a=${az})` },
    ], {
      margin: { t: 35, l: 50, r: 20, b: 70 },
      hovermode: false,
      xaxis: { title: { text: 'h', standoff: 4 }, range: [0, 30] }, yaxis: { title: 'γ(h)', range: [0, 1.1] },
      title: { text: 'Variogrammes directionnels', font: { size: 12 } },
      legend: { orientation: 'h', y: -0.32, x: 0.5, xanchor: 'center', font: { size: 10 } },
    }, { displaylogo: false, responsive: true });

    // Anisotropies
    this.infoEl.innerHTML =
      `<div style="font-weight:600;color:#4a6a3a;margin-bottom:3px;">Rapports d'anisotropie</div>` +
      `<div>a<sub>x</sub>/a<sub>y</sub> = <b>${(ax / ay).toFixed(2)}</b> &nbsp;·&nbsp; ` +
      `a<sub>x</sub>/a<sub>z</sub> = <b>${(ax / az).toFixed(2)}</b> &nbsp;·&nbsp; ` +
      `a<sub>y</sub>/a<sub>z</sub> = <b>${(ay / az).toFixed(2)}</b></div>`;
  }

  cleanup() {
    if (window.Plotly) {
      if (this.plotE) Plotly.purge(this.plotE);
      if (this.plotV) Plotly.purge(this.plotV);
    }
  }
}

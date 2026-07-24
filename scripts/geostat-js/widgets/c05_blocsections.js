// scripts/geostat-js/widgets/c05_blocsections.js
// -----------------------------------------------------------------------------
// Widget « Méthode des sections : modèle de blocs vs approximation par formes »
// (C05-W5) — DEUX vues 3D séparées, SYNCHRONISÉES (Three.js r128).
//
//   - Vue GAUCHE : modèle de blocs RÉALISTE. Les teneurs proviennent d'un VRAI
//                  champ gaussien log-normal (geostat_polymtl GFFTMA via Pyodide),
//                  dont la moyenne locale suit une tendance graduelle t1 -> t2.
//                  V et t̄ par comptage des blocs intérieurs au solide. C'est la
//                  « réalité » de référence.
//   - Vue DROITE : approximation par FORMES (surface linéaire / cône tronqué ;
//                  teneur brusque / linéaire) — une lecture simplifiée de la
//                  transition.
// L'écart en % montre la différence d'hypothèse et de teneur calculée (cours p.6-8).
// Les deux caméras partagent les mêmes angles : pivoter une vue pivote l'autre.
//
// Le champ log-normal est simulé UNE fois (réutilisé pendant les réglages, pour
// rester fluide) ; bouton « Nouveau champ » pour une autre réalisation.
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';
import {
  cm, formeSection, polyArea,
  volSurface, volCone,
  tSurfaceBrusque, tSurfaceLinL, tConeB, tConeL,
} from './c05_lib.js';

const N = 64;          // points par contour
const M_LUT = 360;     // résolution LUT rayon(theta)
const NF = 64;         // côté du cube 3D du champ log-normal (NF³ valeurs)

function rayPolyRadius(poly, theta) {
  const dx = Math.cos(theta), dy = Math.sin(theta);
  let best = Infinity;
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n];
    const ex = b.x - a.x, ey = b.y - a.y;
    const D = ex * dy - ey * dx;
    if (Math.abs(D) < 1e-12) continue;
    const t = (ex * a.y - ey * a.x) / D;
    const u = (dx * a.y - dy * a.x) / D;
    if (t >= 0 && u >= -1e-9 && u <= 1 + 1e-9) best = Math.min(best, t);
  }
  return isFinite(best) ? best : 0;
}

export default class C05BlocSections extends Widget {
  render() {
    const id = this.el.id;
    this.el.insertAdjacentHTML('beforeend', `
      <style>
        #${id} .bs-row{display:flex;gap:10px;flex-wrap:wrap;}
        #${id} .bs-col{flex:1;min-width:280px;}
        #${id} .bs-ttl{font-size:.78rem;font-weight:600;color:#444;margin-bottom:3px;}
        #${id} .bs-ttl small{font-weight:400;color:#888;}
        #${id} .bs-view{width:100%;height:340px;border:1.5px solid #d4d0c8;border-radius:6px;overflow:hidden;background:#1a1a2e;position:relative;cursor:grab;}
        #${id} .bs-view:active{cursor:grabbing;}
        #${id} .bs-ov{position:absolute;bottom:6px;left:6px;background:rgba(0,0,0,.5);color:#ccc;font-family:'JetBrains Mono',monospace;font-size:.66rem;padding:3px 6px;border-radius:4px;pointer-events:none;}
      </style>
      <div class="bs-row">
        <div class="bs-col">
          <div class="bs-ttl">Modèle de blocs <small>— champ log-normal (réalité)</small></div>
          <div class="bs-view" id="${id}_vB"><div class="bs-ov">glissez · molette</div></div>
        </div>
        <div class="bs-col">
          <div class="bs-ttl">Approximation par formes <small>— formules</small></div>
          <div class="bs-view" id="${id}_vF"><div class="bs-ov">vues synchronisées</div></div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;font-size:.72rem;color:#555;margin:8px 2px;max-width:420px;">
        <span style="font-weight:600;white-space:nowrap;">Teneur (%)</span>
        <div style="flex:1;">
          <div id="${id}_bar" style="height:12px;border:1px solid #bbb;border-radius:3px;"></div>
          <div style="display:flex;justify-content:space-between;font-size:.66rem;color:#777;margin-top:1px;"><span id="${id}_lo">0</span><span id="${id}_hi">10</span></div>
        </div>
      </div>
      <div class="gw-stats" id="${id}_cmp" style="font-size:.8rem;line-height:1.5;">Simulation du champ log-normal…</div>
      <div class="gw-controls">
        <div class="gw-slider"><label>S₁ :</label><input type="range" id="${id}_S1" min="100" max="2000" step="50" value="600"><span id="${id}_S1v">600</span> m²</div>
        <div class="gw-slider"><label>S₂ :</label><input type="range" id="${id}_S2" min="100" max="2000" step="50" value="1200"><span id="${id}_S2v">1200</span> m²</div>
        <div class="gw-slider"><label>t₁ :</label><input type="range" id="${id}_t1" min="0" max="10" step="0.1" value="2"><span id="${id}_t1v">2.0</span> %</div>
        <div class="gw-slider"><label>t₂ :</label><input type="range" id="${id}_t2" min="0" max="10" step="0.1" value="4"><span id="${id}_t2v">4.0</span> %</div>
        <div class="gw-slider"><label>L :</label><input type="range" id="${id}_L" min="5" max="50" step="1" value="20"><span id="${id}_Lv">20</span> m</div>
        <button id="${id}_new">Nouveau champ</button>
      </div>
      <div class="gw-controls" style="background:#e8edf2;flex-wrap:nowrap;gap:5px;font-size:.72rem;align-items:center;">
        <label style="margin:0">Forme</label>
        <select id="${id}_shape" style="font-size:.7rem;padding:2px 3px;"><option value="lentille">Lentille</option><option value="circle">Cercle</option><option value="veine">Veine</option></select>
        <label style="margin:0 0 0 4px">Volume</label>
        <select id="${id}_vol" style="font-size:.7rem;padding:2px 3px;"><option value="cone">Cône tronqué</option><option value="surf">Surface lin.</option></select>
        <label style="margin:0 0 0 4px">Teneur</label>
        <select id="${id}_ten" style="font-size:.7rem;padding:2px 3px;"><option value="lin">Linéaire</option><option value="brusque">Brusque</option></select>
        <label style="margin:0 0 0 4px">Blocs</label>
        <select id="${id}_res" style="font-size:.7rem;padding:2px 3px;"><option value="2.5">Grossière</option><option value="1.5" selected>Moyenne</option><option value="1">Fine</option><option value="0.7">Très fine</option></select>
      </div>
    `);

    this.cmpEl = document.getElementById(`${id}_cmp`);
    this.loEl = document.getElementById(`${id}_lo`);
    this.hiEl = document.getElementById(`${id}_hi`);
    const grad = Array.from({ length: 11 }, (_, i) => { const c = cm(i / 10); return `rgb(${c[0]},${c[1]},${c[2]})`; }).join(',');
    document.getElementById(`${id}_bar`).style.background = `linear-gradient(to right, ${grad})`;

    for (const k of ['S1', 'S2', 't1', 't2', 'L']) this.on(document.getElementById(`${id}_${k}`), 'input', () => this._refresh());
    for (const k of ['shape', 'vol', 'ten', 'res']) this.on(document.getElementById(`${id}_${k}`), 'change', () => this._refresh());
    this.on(document.getElementById(`${id}_new`), 'click', () => this._newField());

    this._shapeCache = null;
    this._fitDone = false;
    this._field = null;
    this._seed = (Math.random() * 1e9) >>> 0;

    if (window.THREE) this._initThree();
    else {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      s.onload = () => this._initThree();
      document.head.appendChild(s);
    }
  }

  _params() {
    const id = this.el.id, g = k => document.getElementById(`${id}_${k}`);
    return {
      S1: +g('S1').value, S2: +g('S2').value, t1: +g('t1').value, t2: +g('t2').value, L: +g('L').value,
      shape: g('shape').value, vol: g('vol').value, ten: g('ten').value, bs: +g('res').value,
    };
  }

  _buildShape(shape) {
    if (this._shapeCache === shape) return;
    let poly;
    if (shape === 'circle') { poly = []; for (let i = 0; i < N; i++) { const th = 2 * Math.PI * i / N; poly.push({ x: Math.cos(th), y: Math.sin(th) }); } }
    else poly = formeSection(shape, N);
    this._poly = poly;
    this._Aunit = Math.abs(polyArea(poly));
    const lut = new Float64Array(M_LUT); let rmax = 0;
    for (let m = 0; m < M_LUT; m++) { const th = -Math.PI + 2 * Math.PI * m / M_LUT; const r = rayPolyRadius(poly, th); lut[m] = r; if (r > rmax) rmax = r; }
    this._lut = lut; this._Runit = rmax; this._shapeCache = shape;
  }

  _insideUnit(x, y) {
    const r = Math.hypot(x, y);
    if (r < 1e-9) return true;
    let idx = Math.floor((Math.atan2(y, x) + Math.PI) / (2 * Math.PI) * M_LUT);
    if (idx < 0) idx = 0; if (idx >= M_LUT) idx = M_LUT - 1;
    return r <= this._lut[idx];
  }

  // Cube gaussien log-normal 3D (moyenne 1) via la VRAIE GFFTMA 3D (Pyodide).
  async _makeField(seed) {
    const raw = await gpoly.simulerChamp3D('exponentiel', NF / 4, 0, seed >>> 0, NF, 'lognormal', 1.0, 0.25);
    return { arr: Float64Array.from(raw), N: NF };
  }

  // Échantillonne le cube (u, v, w ∈ [0,1]) par interpolation trilinéaire.
  // Ordre C : idx = (ix*N + iy)*N + iz.
  _sampleField(u, v, w) {
    const F = this._field; if (!F) return 1;
    const n = F.N, g = F.arr;
    const cl = t => Math.max(0, Math.min(n - 1.001, t * (n - 1)));
    const a = cl(u), b = cl(v), c = cl(w);
    const i0 = Math.floor(a), j0 = Math.floor(b), k0 = Math.floor(c);
    const fx = a - i0, fy = b - j0, fz = c - k0;
    const at = (i, j, k) => g[(i * n + j) * n + k];
    const v000 = at(i0, j0, k0), v100 = at(i0 + 1, j0, k0), v010 = at(i0, j0 + 1, k0), v110 = at(i0 + 1, j0 + 1, k0);
    const v001 = at(i0, j0, k0 + 1), v101 = at(i0 + 1, j0, k0 + 1), v011 = at(i0, j0 + 1, k0 + 1), v111 = at(i0 + 1, j0 + 1, k0 + 1);
    const c00 = v000 * (1 - fx) + v100 * fx, c10 = v010 * (1 - fx) + v110 * fx;
    const c01 = v001 * (1 - fx) + v101 * fx, c11 = v011 * (1 - fx) + v111 * fx;
    const c0 = c00 * (1 - fy) + c10 * fy, c1 = c01 * (1 - fy) + c11 * fy;
    return c0 * (1 - fz) + c1 * fz;
  }

  _mkView(boxId) {
    const THREE = window.THREE;
    const box = document.getElementById(boxId);
    const cw = box.clientWidth || 320, ch = box.clientHeight || 340;
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x1a1a2e);
    const cam = new THREE.PerspectiveCamera(45, cw / ch, .1, 4000);
    const ren = new THREE.WebGLRenderer({ antialias: true });
    ren.setSize(cw, ch); ren.setPixelRatio(Math.min(devicePixelRatio, 2));
    box.insertBefore(ren.domElement, box.firstChild);
    scene.add(new THREE.AmbientLight(0xffffff, .6));
    const dl = new THREE.DirectionalLight(0xffffff, .55); dl.position.set(4, 8, 6); scene.add(dl);
    const dl2 = new THREE.DirectionalLight(0xffffff, .22); dl2.position.set(-5, -2, -4); scene.add(dl2);
    const grp = new THREE.Group(); scene.add(grp);
    return { box, scene, cam, ren, grp };
  }

  _initThree() {
    const id = this.el.id;
    this._B = this._mkView(`${id}_vB`);
    this._F = this._mkView(`${id}_vF`);
    this._th = Math.PI * .28; this._ph = Math.PI * .2; this._rad = 90;
    this._updateCam();

    let dr = false, px = 0, py = 0;
    const down = e => { dr = true; px = e.clientX; py = e.clientY; };
    const move = e => {
      if (!dr) return;
      this._th -= (e.clientX - px) * .008;
      this._ph = Math.max(.05, Math.min(1.5, this._ph + (e.clientY - py) * .008));
      px = e.clientX; py = e.clientY; this._updateCam(); this._renderBoth();
    };
    const up = () => dr = false;
    const wheel = e => { e.preventDefault(); this._rad = Math.max(20, Math.min(600, this._rad + e.deltaY * .12)); this._updateCam(); this._renderBoth(); };
    for (const v of [this._B, this._F]) {
      this.on(v.ren.domElement, 'pointerdown', down);
      this.on(v.ren.domElement, 'wheel', wheel, { passive: false });
    }
    this.on(window, 'pointermove', move);
    this.on(window, 'pointerup', up);

    // Charger le champ log-normal (Pyodide) puis premier rendu.
    this._loadFieldAndRefresh();
  }

  async _loadFieldAndRefresh() {
    try { await afficherChargementJusquaPret(this.el); this._field = await this._makeField(this._seed); }
    catch (e) { this._field = null; }
    this._refresh();
  }

  async _newField() {
    this._seed = (Math.random() * 1e9) >>> 0;
    this.cmpEl.textContent = 'Nouvelle réalisation du champ…';
    try { this._field = await this._makeField(this._seed); } catch (e) { /* garde l'ancien */ }
    this._refresh();
  }

  _updateCam() {
    const r = this._rad, th = this._th, ph = this._ph;
    const x = r * Math.cos(ph) * Math.sin(th), y = r * Math.sin(ph), z = r * Math.cos(ph) * Math.cos(th);
    for (const v of [this._B, this._F]) { v.cam.position.set(x, y, z); v.cam.lookAt(0, 0, 0); }
  }

  _renderBoth() {
    this._B.ren.render(this._B.scene, this._B.cam);
    this._F.ren.render(this._F.scene, this._F.cam);
  }

  _clear(grp) {
    while (grp.children.length) {
      const c = grp.children[0];
      if (c.geometry) c.geometry.dispose();
      if (c.material) { Array.isArray(c.material) ? c.material.forEach(m => m.dispose()) : c.material.dispose(); }
      grp.remove(c);
    }
  }

  _refresh() {
    const id = this.el.id, p = this._params();
    document.getElementById(`${id}_S1v`).textContent = p.S1;
    document.getElementById(`${id}_S2v`).textContent = p.S2;
    document.getElementById(`${id}_t1v`).textContent = p.t1.toFixed(1);
    document.getElementById(`${id}_t2v`).textContent = p.t2.toFixed(1);
    document.getElementById(`${id}_Lv`).textContent = p.L;
    if (!this._B) return;

    this._buildShape(p.shape);
    const A = this._Aunit, k1 = Math.sqrt(p.S1 / A), k2 = Math.sqrt(p.S2 / A);
    const Rmax = Math.max(k1, k2) * this._Runit;
    const gradeAt = s => p.ten === 'brusque' ? (s < 0.5 ? p.t1 : p.t2) : p.t1 + (p.t2 - p.t1) * s;

    // 1) Modèle de blocs réaliste : occupancy + teneurs log-normales + V/t̄.
    const data = this._computeBlocks(k1, k2, p, Rmax);

    // 2) Échelle de couleur commune (englobe la dispersion log-normale).
    const lo = Math.min(p.t1, p.t2), hi = Math.max(p.t1, p.t2);
    const gLo = Math.min(lo, data.gmin), gHi = Math.max(hi, data.gmax);
    this.loEl.textContent = gLo.toFixed(1); this.hiEl.textContent = gHi.toFixed(1);
    const norm = t => gHi > gLo ? (t - gLo) / (gHi - gLo) : 0.5;

    // 3) Formules (panneau droit).
    const Vform = p.vol === 'cone' ? volCone(p.S1, p.S2, p.L) : volSurface(p.S1, p.S2, p.L);
    const tform = p.vol === 'cone'
      ? (p.ten === 'brusque' ? tConeB(p.S1, p.t1, p.S2, p.t2) : tConeL(p.S1, p.t1, p.S2, p.t2))
      : (p.ten === 'brusque' ? tSurfaceBrusque(p.S1, p.t1, p.S2, p.t2) : tSurfaceLinL(p.S1, p.t1, p.S2, p.t2));

    this._clear(this._B.grp); this._clear(this._F.grp);
    this._blockMesh(this._B.grp, data, p, Rmax, norm);
    this._buildSmooth(this._F.grp, k1, k2, p, gradeAt, norm);
    this._addFrames(this._B.grp, k1, k2, p); this._addFrames(this._F.grp, k1, k2, p);

    if (!this._fitDone) { this._rad = Math.max(2 * Rmax, p.L) * 1.9; this._fitDone = true; this._updateCam(); }
    this._renderBoth();

    const dV = data.V > 0 ? 100 * (Vform - data.V) / data.V : 0;
    const dT = data.t > 0 ? 100 * (tform - data.t) / data.t : 0;
    const col = d => Math.abs(d) < 2 ? '#1a8a4a' : (Math.abs(d) < 6 ? '#c47a00' : '#c0392b');
    const sgn = d => (d >= 0 ? '+' : '') + d.toFixed(1);
    this.cmpEl.innerHTML =
      `<b>Modèle de blocs</b> (réalité log-normale) — V = <b>${(data.V / 1000).toFixed(2)}</b> ×10³ m³ · t̄ = <b>${data.t.toFixed(2)}</b> % · ${data.count} blocs de ${p.bs} m<br>` +
      `<b>Formes</b> (${p.vol === 'cone' ? 'cône tronqué' : 'surface linéaire'}, teneur ${p.ten === 'brusque' ? 'brusque' : 'linéaire'}) — ` +
      `V = <b>${(Vform / 1000).toFixed(2)}</b> ×10³ m³ <span style="color:${col(dV)}">(${sgn(dV)} %)</span> · ` +
      `t̄ = <b>${tform.toFixed(2)}</b> % <span style="color:${col(dT)}">(${sgn(dT)} %)</span>`;
  }

  // Occupancy 3D + teneurs (tendance t1->t2 × champ log-normal mappé en (θ, z)).
  _computeBlocks(k1, k2, p, Rmax) {
    // Taille de bloc FIXE (p.bs, en m) : le nombre de blocs se déduit de la
    // géométrie. Plus L (ou la section) est grand, plus il y a de blocs ; la
    // taille des cubes reste ~constante. Plafonds pour rester fluide.
    const nz = Math.min(90, Math.max(2, Math.round(p.L / p.bs)));
    const h = p.L / nz;
    const nx = Math.min(96, Math.max(4, Math.round(2 * Rmax / p.bs)));
    const dx = 2 * Rmax / nx;
    const occ = new Uint8Array(nz * nx * nx);
    const grade = new Float32Array(nz * nx * nx);
    let count = 0, sumG = 0, gmin = Infinity, gmax = -Infinity;
    for (let k = 0; k < nz; k++) {
      const s = (k + 0.5) / nz, f = (1 - s) * k1 + s * k2;
      const trend = p.t1 + (p.t2 - p.t1) * s;
      for (let i = 0; i < nx; i++) {
        const xc = -Rmax + (i + 0.5) * dx;
        for (let j = 0; j < nx; j++) {
          const yc = -Rmax + (j + 0.5) * dx;
          if (!this._insideUnit(xc / f, yc / f)) continue;
          // Échantillonnage du cube 3D aux coordonnées réelles du bloc.
          const u = (xc + Rmax) / (2 * Rmax), v = (yc + Rmax) / (2 * Rmax);
          const g = Math.max(0, trend * this._sampleField(u, v, s));   // log-normal 3D × tendance
          const o = k * nx * nx + i * nx + j;
          occ[o] = 1; grade[o] = g; count++; sumG += g;
          if (g < gmin) gmin = g; if (g > gmax) gmax = g;
        }
      }
    }
    if (!isFinite(gmin)) { gmin = 0; gmax = 1; }
    return { occ, grade, nx, dx, h, nz, count, V: count * h * dx * dx, t: count > 0 ? sumG / count : 0, gmin, gmax };
  }

  _blockMesh(grp, data, p, Rmax, norm) {
    const THREE = window.THREE;
    const { occ, grade, nx, dx, h, nz } = data;
    const get = (k, i, j) => (k < 0 || k >= nz || i < 0 || i >= nx || j < 0 || j >= nx) ? 0 : occ[k * nx * nx + i * nx + j];
    const verts = [], cols = [], idx = [];
    const pushFace = (vs, c) => {
      const b = verts.length / 3;
      for (const v of vs) { verts.push(v[0], v[1], v[2]); cols.push(c[0] / 255, c[1] / 255, c[2] / 255); }
      idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    };
    for (let k = 0; k < nz; k++) {
      const z0 = k * h - p.L / 2, z1 = z0 + h;
      for (let i = 0; i < nx; i++) {
        const x0 = -Rmax + i * dx, x1 = x0 + dx;
        for (let j = 0; j < nx; j++) {
          const o = k * nx * nx + i * nx + j;
          if (!occ[o]) continue;
          const cc = cm(norm(grade[o]));
          const y0 = -Rmax + j * dx, y1 = y0 + dx;
          if (!get(k, i, j - 1)) pushFace([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], cc);
          if (!get(k, i, j + 1)) pushFace([[x1, y1, z0], [x0, y1, z0], [x0, y1, z1], [x1, y1, z1]], cc);
          if (!get(k, i - 1, j)) pushFace([[x0, y1, z0], [x0, y0, z0], [x0, y0, z1], [x0, y1, z1]], cc);
          if (!get(k, i + 1, j)) pushFace([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], cc);
          if (!get(k - 1, i, j)) pushFace([[x0, y1, z0], [x1, y1, z0], [x1, y0, z0], [x0, y0, z0]], cc);
          if (!get(k + 1, i, j)) pushFace([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], cc);
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    geo.setIndex(idx); geo.computeVertexNormals();
    grp.add(new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 8 })));
  }

  _buildSmooth(grp, k1, k2, p, gradeAt, norm) {
    const THREE = window.THREE, unit = this._poly;
    const nS = 26, verts = [], cols = [], idx = [];
    for (let s = 0; s <= nS; s++) {
      const u = s / nS, z = u * p.L - p.L / 2, f = (1 - u) * k1 + u * k2;
      const c = cm(norm(gradeAt(u)));
      for (let i = 0; i < N; i++) { verts.push(f * unit[i].x, f * unit[i].y, z); cols.push(c[0] / 255, c[1] / 255, c[2] / 255); }
    }
    for (let s = 0; s < nS; s++) for (let i = 0; i < N; i++) {
      const a = s * N + i, b = s * N + (i + 1) % N, cc = (s + 1) * N + i, d = (s + 1) * N + (i + 1) % N;
      idx.push(a, b, cc, b, d, cc);
    }
    const cap = (u, zsign) => {
      const ci = verts.length / 3, c = cm(norm(gradeAt(u)));
      verts.push(0, 0, zsign * p.L / 2); cols.push(c[0] / 255, c[1] / 255, c[2] / 255);
      const base = u === 0 ? 0 : nS * N;
      for (let i = 0; i < N; i++) { if (zsign < 0) idx.push(ci, base + (i + 1) % N, base + i); else idx.push(ci, base + i, base + (i + 1) % N); }
    };
    cap(0, -1); cap(1, 1);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    geo.setIndex(idx); geo.computeVertexNormals();
    grp.add(new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ vertexColors: true, side: THREE.DoubleSide, shininess: 22 })));
  }

  _addFrames(grp, k1, k2, p) {
    const THREE = window.THREE, unit = this._poly;
    for (const [kf, z, col] of [[k1, -p.L / 2, 0x6fb0ff], [k2, p.L / 2, 0xff7a6f]]) {
      const lp = unit.map(pt => new THREE.Vector3(kf * pt.x, kf * pt.y, z)); lp.push(lp[0].clone());
      grp.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(lp), new THREE.LineBasicMaterial({ color: col })));
    }
    grp.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, -p.L / 2 - 3), new THREE.Vector3(0, 0, p.L / 2 + 3)]), new THREE.LineBasicMaterial({ color: 0x888888 })));
  }

  cleanup() { if (this._B) this._B.ren.dispose(); if (this._F) this._F.ren.dispose(); }
}

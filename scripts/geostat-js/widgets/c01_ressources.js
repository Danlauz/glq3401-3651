// scripts/geostat-js/widgets/c01_ressources.js
// -----------------------------------------------------------------------------
// Widget « Classification 3D des ressources minérales » (C01) — calcul LIVE
// via Pyodide. Source : geostat_polymtl.data.ressources
// (classifier_par_passe_estimation / classifier_par_efficacite_krigeage),
// appliquees sur le MEME gisement (8 scenarios de covariance, meme grille que
// l'atelier 1.1).
//
// Deux viewers 3D cote a cote — « Passe d'estimation » (geometrique) et
// « Efficacite de krigeage (KE) » — partagent le meme gisement, les memes
// forages et la meme rotation de camera, pour comparer directement les deux
// criteres. Des cases a cocher activent/desactivent chaque classe (Mesure,
// Indique, Infere). Les blocs « Non classe » et hors enveloppe ne sont jamais
// affiches, afin de voir le coeur classifie du gisement.
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

// Couleurs de classification (codes 0..3 — voir geostat_polymtl.data.ressources.NOMS_CLASSES)
const COULEURS_CLASSES = {
  0: '#cfcfcf', // Non classé (jamais affiché)
  1: '#f9a825', // Inféré
  2: '#1565c0', // Indiqué
  3: '#2e7d32', // Mesuré
};
const NOMS_CLASSES_REPLI = { 0: 'Non classée', 1: 'Inférée', 2: 'Indiquée', 3: 'Mesurée' };

const SEEDS_INIT = [42, 100, 200, 300, 1234, 4567, 7890, 9999];
const N_DRILL_HOLES = 32;   // forages concentres dans l'enveloppe -> meilleure couverture en octants

// Repli si gpoly.listerScenariosBlockModel() n'est pas encore disponible.
const SCENARIOS_REPLI = [
  { id: 'spherique_isotrope' }, { id: 'spherique_anisotrope' },
  { id: 'spherique_isotrope_pepite' }, { id: 'spherique_anisotrope_pepite' },
  { id: 'spherique_anisotrope_complexe' }, { id: 'spherique_grande_portee' },
  { id: 'spherique_lentille' }, { id: 'spherique_imbrique' },
];

export default class C01Ressources extends Widget {
  render() {
    if (typeof window.THREE === 'undefined') {
      this.afficherAvertissement("THREE.js non chargé. Vérifiez le CDN dans le .qmd.");
      return;
    }

    this.modelIdx = 0;
    this.seed = SEEDS_INIT[0];
    this.scenarios = SCENARIOS_REPLI;
    this.scenario = this.scenarios[0].id;
    this.x = 105;                      // rayon serré par défaut (m)
    this.shown = new Set([1, 2, 3]);   // classes affichées (Inféré/Indiqué/Mesuré)
    this.showDH = true;
    this.showTopo = true;
    // État de caméra partagé par les deux viewers (rotation liée).
    this.camState = { theta: Math.PI * 0.3, phi: Math.PI * 0.22, radius: 1600 };

    this.el.insertAdjacentHTML('beforeend', `
      <div class="rs-wrap" style="max-width:860px; margin:0 auto 2rem auto;">
        <div class="rs-views" style="display:flex; flex-wrap:wrap; gap:10px; justify-content:center;">
          ${this._panneauHTML('passe', "Passe d'estimation (géométrique)")}
          ${this._panneauHTML('ke', 'Efficacité de krigeage (KE)')}
        </div>
        <div class="gw-controls" style="margin-top:8px; display:flex; flex-wrap:wrap; align-items:center; gap:.6rem;">
          <label>Gisement
            <select class="js-scenario" style="max-width:160px;"></select>
          </label>
          <label class="js-x-wrap">Rayon serré x (m)
            <input type="range" class="js-x" min="15" max="150" step="15" value="105" style="width:130px;">
            <span class="js-xV">105</span> <span style="color:#888">(2x = <span class="js-2xV">210</span>)</span>
          </label>
          <button class="js-new" type="button" style="padding:.25rem .7rem; cursor:pointer;">Nouveau gisement</button>
        </div>
        <div class="gw-controls" style="margin-top:4px; display:flex; flex-wrap:wrap; align-items:center; gap:.8rem; font-size:.85rem;">
          <span style="font-weight:600;">Afficher :</span>
          <label><input type="checkbox" class="js-cls" value="3" checked> <span style="color:${COULEURS_CLASSES[3]};font-weight:600;">■</span> Mesurée</label>
          <label><input type="checkbox" class="js-cls" value="2" checked> <span style="color:${COULEURS_CLASSES[2]};font-weight:600;">■</span> Indiquée</label>
          <label><input type="checkbox" class="js-cls" value="1" checked> <span style="color:${COULEURS_CLASSES[1]};font-weight:600;">■</span> Inférée</label>
          <span style="width:1px;height:1.1em;background:#ccc;"></span>
          <label><input type="checkbox" class="js-dh" checked> Forages</label>
          <label><input type="checkbox" class="js-topo" checked> Topo</label>
        </div>
        <div class="js-info" style="padding:.4rem .8rem; font-family:'JetBrains Mono',monospace; font-size:.76rem; color:#555; min-height:3.5em; white-space:pre-line;">—</div>
        <p style="margin:4px 1rem;font-size:11px;color:#666">
          Classification par <code>geostat_polymtl.data.ressources</code> ;
          critère KE par <code>geostat_polymtl.kriging.wrappers.krigeage_ordinaire</code>.
          Même gisement, mêmes forages : seul le critère diffère entre les deux vues.</p>
      </div>
    `);

    // Construit les deux viewers.
    this.viewers = {
      passe: this._creerViewer(this.el.querySelector('.rs-box-passe')),
      ke: this._creerViewer(this.el.querySelector('.rs-box-ke')),
    };

    // Selecteurs / controles
    this.scenarioSelect = this.el.querySelector('.js-scenario');
    this.xInput = this.el.querySelector('.js-x');
    this.xLabel = this.el.querySelector('.js-xV');
    this.x2Label = this.el.querySelector('.js-2xV');
    this.infoDiv = this.el.querySelector('.js-info');
    this.scenarioSelect.innerHTML = this.scenarios.map((s, i) =>
      `<option value="${s.id}">Scénario ${i + 1}</option>`).join('');

    this.on(this.scenarioSelect, 'change', () => { this.scenario = this.scenarioSelect.value; this.charger(); });
    this.on(this.el.querySelector('.js-new'), 'click', () => {
      this.modelIdx = (this.modelIdx + 1) % SEEDS_INIT.length;
      this.seed = SEEDS_INIT[this.modelIdx];
      this.charger();
    });
    this.on(this.xInput, 'input', () => {
      this.x = +this.xInput.value; this.xLabel.textContent = this.x; this.x2Label.textContent = this.x * 2;
    });
    this.on(this.xInput, 'change', () => this.charger());
    for (const cb of this.el.querySelectorAll('.js-cls')) {
      this.on(cb, 'change', () => {
        const c = +cb.value;
        if (cb.checked) this.shown.add(c); else this.shown.delete(c);
        this._appliquerVisibilite('passe'); this._appliquerVisibilite('ke'); this._renderAll();
      });
    }
    this.on(this.el.querySelector('.js-dh'), 'change', (e) => {
      this.showDH = e.target.checked;
      for (const k of ['passe', 'ke']) this.viewers[k].dhGroup.visible = this.showDH;
      this._renderAll();
    });
    this.on(this.el.querySelector('.js-topo'), 'change', (e) => {
      this.showTopo = e.target.checked;
      for (const k of ['passe', 'ke']) this.viewers[k].topoGroup.visible = this.showTopo;
      this._renderAll();
    });

    afficherChargementJusquaPret(this.el).then(async () => {
      try {
        const liste = await gpoly.listerScenariosBlockModel();
        if (Array.isArray(liste) && liste.length) {
          this.scenarios = liste;
          this.scenario = this.scenarios[0].id;
          this.scenarioSelect.innerHTML = this.scenarios.map((s, i) =>
            `<option value="${s.id}">Scénario ${i + 1}</option>`).join('');
        }
      } catch (e) { /* repli */ }
      this.charger();
    });
  }

  _panneauHTML(key, titre) {
    return `
      <div style="flex:1 1 360px; min-width:300px; max-width:420px;">
        <div style="text-align:center; font-weight:600; font-size:.9rem; margin-bottom:3px;">${titre}</div>
        <div class="rs-box-${key}" style="position:relative; width:100%; height:360px; border:1px solid #d4d0c8; border-radius:6px; overflow:hidden; background:#1a1a2e; cursor:grab;">
          <div class="rs-legend" style="position:absolute; top:8px; right:8px; background:rgba(255,255,255,.92); border:1px solid #999; border-radius:5px; padding:5px 7px; font:10px 'JetBrains Mono',monospace;"></div>
          <div class="rs-mini" style="position:absolute; bottom:6px; left:6px; background:rgba(0,0,0,.55); color:#eee; font:10px 'JetBrains Mono',monospace; padding:3px 6px; border-radius:4px; pointer-events:none;">—</div>
        </div>
      </div>`;
  }

  _creerViewer(box) {
    const THREE = window.THREE;
    const W = box.clientWidth || 360, H = box.clientHeight || 360;
    const v = { box };
    v.legendDiv = box.querySelector('.rs-legend');
    v.miniDiv = box.querySelector('.rs-mini');
    v.legendDiv.innerHTML = [3, 2, 1].map(c =>
      `<div style="display:flex;align-items:center;gap:4px;margin:1px 0;">
         <span style="display:inline-block;width:12px;height:9px;background:${COULEURS_CLASSES[c]};border:1px solid #888;"></span>
         ${NOMS_CLASSES_REPLI[c]}</div>`).join('');

    v.scene = new THREE.Scene();
    v.scene.background = new THREE.Color(0x1a1a2e);
    v.cam = new THREE.PerspectiveCamera(40, W / H, 1, 5000);
    v.ren = new THREE.WebGLRenderer({ antialias: true });
    v.ren.setSize(W, H);
    v.ren.setPixelRatio(Math.min(devicePixelRatio, 2));
    box.insertBefore(v.ren.domElement, box.firstChild);
    v.scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const dl = new THREE.DirectionalLight(0xffffff, 0.6); dl.position.set(200, 400, 300);
    v.scene.add(dl);
    v.topoGroup = new THREE.Group(); v.scene.add(v.topoGroup);
    v.dhGroup = new THREE.Group(); v.scene.add(v.dhGroup);
    v.blockGeo = null; v.blockMat = new THREE.MeshPhongMaterial({ vertexColors: false });
    v.blockMesh = null;
    v.dummyHide = new THREE.Matrix4().makeScale(0, 0, 0);

    // Rotation LIÉE entre les deux viewers via this.camState.
    let drag = false, mx, my;
    this.on(v.ren.domElement, 'pointerdown', (e) => { drag = true; mx = e.clientX; my = e.clientY; });
    this.on(window, 'pointerup', () => { drag = false; });
    this.on(window, 'pointermove', (e) => {
      if (!drag) return;
      this.camState.theta -= (e.clientX - mx) * 0.005;
      this.camState.phi = Math.max(-0.3, Math.min(1.4, this.camState.phi + (e.clientY - my) * 0.005));
      mx = e.clientX; my = e.clientY;
      this._updateCam('passe'); this._updateCam('ke'); this._renderAll();
    });
    this.on(v.ren.domElement, 'wheel', (e) => {
      e.preventDefault();
      this.camState.radius = Math.max(200, Math.min(2500, this.camState.radius + e.deltaY * 0.5));
      this._updateCam('passe'); this._updateCam('ke'); this._renderAll();
    }, { passive: false });
    return v;
  }

  _updateCam(key) {
    const v = this.viewers[key];
    if (!v || !this.config) return;
    const m = this.config, BS = m.bloc_size;
    const cx = m.nx * BS / 2, cy = m.ny * BS / 2, cz = m.z_bot + m.nz * BS * 0.45;
    const { theta, phi, radius } = this.camState;
    v.cam.position.set(
      cx + radius * Math.cos(phi) * Math.sin(theta),
      cz + radius * Math.sin(phi),
      cy + radius * Math.cos(phi) * Math.cos(theta));
    v.cam.lookAt(cx, cz, cy);
  }

  _renderAll() {
    for (const k of ['passe', 'ke']) { const v = this.viewers[k]; v.ren.render(v.scene, v.cam); }
  }

  async charger() {
    let m;
    try {
      m = await gpoly.classifierRessources(
        this.scenario, this.seed, 'both',
        32, 32, 40, 15, N_DRILL_HOLES, 15, this.x);
    } catch (e) { this.afficherAvertissement('Erreur classification des ressources : ' + e.message); return; }

    this.config = m;
    this._peuplerViewer('passe', m, m.codes_passe_flat);
    this._peuplerViewer('ke', m, m.codes_ke_flat || m.codes_passe_flat);
    this._updateCam('passe'); this._updateCam('ke');
    this._appliquerVisibilite('passe'); this._appliquerVisibilite('ke');
    this._renderAll();
    this._afficherInfo();
  }

  _peuplerViewer(key, m, codes) {
    const THREE = window.THREE;
    const v = this.viewers[key];
    const NX = m.nx, NY = m.ny, NZ = m.nz, BS = m.bloc_size, ZTOP = m.z_top;
    const TOTAL = NX * NY * NZ;
    const grades = m.grades_flat;

    // Topo
    while (v.topoGroup.children.length) { const c = v.topoGroup.children[0]; c.geometry?.dispose(); c.material?.dispose(); v.topoGroup.remove(c); }
    const topo = m.topo, res = topo.length - 1;
    const geo = new THREE.PlaneGeometry(NX * BS * 1.4, NY * BS * 1.4, res, res);
    const pos = geo.attributes.position; let k = 0;
    for (let j = 0; j <= res; j++) for (let i = 0; i <= res; i++) pos.setZ(k++, topo[j][i]);
    geo.computeVertexNormals();
    const tmesh = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ color: 0x888888, transparent: true, opacity: 0.45, side: THREE.DoubleSide }));
    tmesh.rotation.x = -Math.PI / 2; tmesh.position.set(NX * BS / 2, ZTOP + 20, NY * BS / 2);
    v.topoGroup.add(tmesh); v.topoGroup.visible = this.showTopo;

    // Forages
    while (v.dhGroup.children.length) { const c = v.dhGroup.children[0]; c.geometry?.dispose(); c.material?.dispose(); v.dhGroup.remove(c); }
    for (const dh of m.drill_holes) {
      const [x0, y0, z0, ddx, ddy, depth] = dh;
      v.dhGroup.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x0, z0, y0), new THREE.Vector3(x0 + ddx, z0 - depth, y0 + ddy)]),
        new THREE.LineBasicMaterial({ color: 0xdddddd, transparent: true, opacity: 0.65 })));
    }
    v.dhGroup.visible = this.showDH;

    // Blocs
    if (v.blockMesh) v.scene.remove(v.blockMesh);
    if (!v.blockGeo) v.blockGeo = new THREE.BoxGeometry(BS * 0.95, BS * 0.95, BS * 0.95);
    v.blockMesh = new THREE.InstancedMesh(v.blockGeo, v.blockMat, TOTAL);
    const dummy = new THREE.Object3D(); const color = new THREE.Color();
    v.code = new Int32Array(TOTAL);
    v.inDeposit = new Uint8Array(TOTAL);
    v.initialMatrices = new Float32Array(TOTAL * 16);
    v.nDeposit = 0; v.counts = { 0: 0, 1: 0, 2: 0, 3: 0 };
    let bIdx = 0;
    for (let iz = 0; iz < NZ; iz++) for (let iy = 0; iy < NY; iy++) for (let ix = 0; ix < NX; ix++) {
      const gi = iz * NX * NY + iy * NX + ix;
      dummy.position.set(ix * BS + BS / 2, ZTOP - iz * BS - BS / 2, iy * BS + BS / 2);
      dummy.updateMatrix();
      v.initialMatrices.set(dummy.matrix.elements, bIdx * 16);
      const code = codes[gi]; const inDep = grades[gi] >= 0 ? 1 : 0;
      color.set(COULEURS_CLASSES[code] ?? '#cfcfcf');
      v.blockMesh.setColorAt(bIdx, color);
      v.code[bIdx] = code; v.inDeposit[bIdx] = inDep;
      if (inDep) { v.nDeposit++; v.counts[code]++; }
      bIdx++;
    }
    v.blockMesh.instanceColor.needsUpdate = true;
    v.scene.add(v.blockMesh);
  }

  _appliquerVisibilite(key) {
    const THREE = window.THREE;
    const v = this.viewers[key];
    if (!v || !v.blockMesh) return;
    const tmp = new THREE.Matrix4();
    const N = v.code.length;
    for (let i = 0; i < N; i++) {
      const show = v.inDeposit[i] && v.code[i] > 0 && this.shown.has(v.code[i]);
      if (show) { tmp.fromArray(v.initialMatrices, i * 16); v.blockMesh.setMatrixAt(i, tmp); }
      else v.blockMesh.setMatrixAt(i, v.dummyHide);
    }
    v.blockMesh.instanceMatrix.needsUpdate = true;

    // Mini-bilan par vue
    const c = v.counts, n = v.nDeposit || 1;
    v.miniDiv.textContent =
      `Mes ${(100 * c[3] / n).toFixed(0)}% · Ind ${(100 * c[2] / n).toFixed(0)}% · ` +
      `Inf ${(100 * c[1] / n).toFixed(0)}% · NC ${(100 * c[0] / n).toFixed(0)}%`;
  }

  _afficherInfo() {
    const m = this.config;
    const cp = this.viewers.passe.counts, ck = this.viewers.ke.counts;
    const n = this.viewers.passe.nDeposit || 1;
    const seuils = m.seuils_ke.map(s => s.toFixed(2)).join(' / ');
    this.infoDiv.textContent =
      `Seed ${this.seed} — ${m.style_gisement} · ${n} blocs dans le gisement (les « Non classée » ne sont pas affichés)\n` +
      `Passe d'estimation (x = ${m.x} m, 2x = ${m.x * 2} m) — Mesurée ${cp[3]} · Indiquée ${cp[2]} · Inférée ${cp[1]} · Non classée ${cp[0]}\n` +
      `Efficacité de krigeage (seuils ${seuils}) — Mesurée ${ck[3]} · Indiquée ${ck[2]} · Inférée ${ck[1]} · Non classée ${ck[0]}`;
  }

  cleanup() {
    try {
      for (const k of ['passe', 'ke']) {
        const v = this.viewers?.[k]; if (!v) continue;
        v.blockGeo?.dispose(); v.blockMat?.dispose(); v.ren?.dispose(); v.ren?.domElement?.remove();
        for (const grp of [v.topoGroup, v.dhGroup]) {
          if (!grp) continue;
          while (grp.children.length) { const c = grp.children[0]; c.geometry?.dispose(); c.material?.dispose(); grp.remove(c); }
        }
      }
    } catch (e) {}
  }
}

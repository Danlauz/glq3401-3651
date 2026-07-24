// scripts/geostat-js/widgets/c01_blockmodel.js
// -----------------------------------------------------------------------------
// Widget « Modele de blocs 3D » (C01) — calcul LIVE via Pyodide.
// Source : geostat_polymtl.data.blockmodel.generer_block_model_covariance
// (8 scenarios de covariance / styles de gisements) et
// generer_block_model_synthetique, appelees via Pyodide.
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

// Classes de coloration des teneurs (% Cu) — c'est de la configuration de
// visualisation, pas du code de calcul, donc legitimement cote JS.
// Classes de teneur recolorées sur la palette Turbo (couleurs échantillonnées
// aux centres des classes, t normalisé sur [0, 1]) pour rester cohérent avec
// les cartes de champ du reste du livre, tout en gardant la légende discrète.
const CLASSES = [
  { lo: 0.0,  hi: 0.1,  hex: '#392c8a' },
  { lo: 0.1,  hi: 0.2,  hex: '#3268e7' },
  { lo: 0.2,  hi: 0.3,  hex: '#21a5e4' },
  { lo: 0.3,  hi: 0.4,  hex: '#2ad1b4' },
  { lo: 0.4,  hi: 0.5,  hex: '#5cec77' },
  { lo: 0.5,  hi: 0.75, hex: '#d3dd31' },
  { lo: 0.75, hi: 1.0,  hex: '#e54c0e' },
  { lo: 1.0,  hi: 99.0, hex: '#7a0403' },
];

const SEEDS_INIT = [42, 100, 200, 300, 1234, 4567, 7890, 9999];

// Repli si gpoly.listerScenariosBlockModel() n'est pas encore disponible
// (Pyodide pas a jour) — la liste autoritaire vient de
// geostat_polymtl.data.blockmodel.SCENARIOS_COVARIANCE.
const SCENARIOS_REPLI = [
  { id: 'spherique_isotrope', nom: 'Sphérique isotrope', style: 'Porphyrique disséminé' },
  { id: 'spherique_anisotrope', nom: 'Sphérique anisotrope', style: 'Stratiforme / tabulaire' },
  { id: 'spherique_isotrope_pepite', nom: 'Sphérique isotrope avec pépite', style: 'Disséminé hétérogène' },
  { id: 'spherique_anisotrope_pepite', nom: 'Sphérique anisotrope avec pépite', style: 'Stratiforme bruité' },
  { id: 'spherique_anisotrope_complexe', nom: 'Sphérique anisotrope complexe (x,y,z)', style: 'Veine inclinée' },
  { id: 'spherique_grande_portee', nom: 'Sphérique isotrope grande portée', style: 'Plutonique / VMS massif' },
  { id: 'spherique_lentille', nom: 'Sphérique très anisotrope (lentille)', style: 'Lentille / veine étroite' },
  { id: 'spherique_imbrique', nom: 'Modèle imbriqué (pépite + 2 structures)', style: 'VMS (cœur + halo)' },
];

function gradeColor(cu) {
  for (const c of CLASSES) if (cu >= c.lo && cu < c.hi) return c.hex;
  return '#ff00ff';
}

export default class C01BlockModel extends Widget {
  render() {
    if (typeof window.THREE === 'undefined') {
      this.afficherAvertissement("THREE.js non chargé. Vérifiez le CDN dans le .qmd.");
      return;
    }

    this.modelIdx = 0;
    this.seed = SEEDS_INIT[0];
    this.scenarios = SCENARIOS_REPLI;
    this.scenario = this.scenarios[0].id;

    this.el.insertAdjacentHTML('beforeend', `
      <div class="bm-wrap" style="position:relative; max-width:720px; margin:0 auto 2rem auto;">
        <div class="bm-view" style="width:100%; height:480px; border:1px solid #d4d0c8; border-radius:6px; overflow:hidden; background:#1a1a2e; cursor:grab;">
          <div class="bm-legend" style="position:absolute; top:10px; right:10px; background:rgba(255,255,255,.92); border:1px solid #999; border-radius:5px; padding:6px 8px; font:10px 'JetBrains Mono',monospace;"></div>
          <div class="bm-ov" style="position:absolute; bottom:8px; left:8px; background:rgba(0,0,0,.55); color:#ddd; font:11px 'JetBrains Mono',monospace; padding:4px 8px; border-radius:4px; pointer-events:none;">
            Glissez pour pivoter · Molette pour zoomer
          </div>
        </div>
        <div class="gw-controls" style="margin-top:6px; display:flex; flex-wrap:wrap; align-items:center; gap:.5rem;">
          <label>Style de gisement
            <select class="js-scenario" style="max-width:280px;"></select>
          </label>
          <label>Coupure (% Cu) <input type="range" class="js-cut" min="0" max="100" value="25" style="width:160px;"><span class="js-cutV" style="margin-left:.3rem;">0.25</span></label>
          <label><input type="checkbox" class="js-dh" checked> Forages</label>
          <label><input type="checkbox" class="js-topo" checked> Topo</label>
          <button class="js-new" type="button" style="padding:.25rem .7rem; cursor:pointer;">Nouveau gisement (même style)</button>
          <span class="js-modnum" style="font-family:'JetBrains Mono',monospace; font-size:.78rem; color:#666;">—</span>
        </div>
        <div class="js-info" style="padding:.4rem .8rem; font-family:'JetBrains Mono',monospace; font-size:.78rem; color:#555; min-height:4.5em; white-space:pre-line;">—</div>
        <p style="margin:4px 1rem;font-size:11px;color:#666">
          Calculs effectués par <code>geostat_polymtl.data.blockmodel</code> (8 styles de gisement).</p>
      </div>
    `);

    const box = this.el.querySelector('.bm-view');
    this.legendDiv = this.el.querySelector('.bm-legend');
    this.cutInput  = this.el.querySelector('.js-cut');
    this.cutLabel  = this.el.querySelector('.js-cutV');
    this.dhInput   = this.el.querySelector('.js-dh');
    this.topoInput = this.el.querySelector('.js-topo');
    this.newBtn    = this.el.querySelector('.js-new');
    this.modNumLabel = this.el.querySelector('.js-modnum');
    this.infoDiv   = this.el.querySelector('.js-info');
    this.scenarioSelect = this.el.querySelector('.js-scenario');

    // Noms pedagogiques neutres : « Scenario 1..8 » (le vocabulaire de
    // covariance — pepite, spherique, anisotrope — n'a pas encore ete vu au
    // chapitre 1 ; le style geologique apparait dans la zone d'info).
    this.scenarioSelect.innerHTML = this.scenarios.map((s, i) =>
      `<option value="${s.id}">Scénario ${i + 1}</option>`).join('');

    // Legende (statique)
    this.legendDiv.innerHTML = CLASSES.map(c =>
      `<div style="display:flex;align-items:center;gap:4px;margin:1px 0;">
         <span style="display:inline-block;width:14px;height:10px;background:${c.hex};border:1px solid #888;"></span>
         ${c.lo}–${c.hi >= 99 ? '+' : c.hi}
       </div>`).join('') + `<div style="margin-top:3px;font-weight:600;">% Cu</div>`;

    // THREE.js scene
    const THREE = window.THREE;
    const W = box.clientWidth, H = box.clientHeight;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.cam = new THREE.PerspectiveCamera(40, W / H, 1, 5000);
    this.ren = new THREE.WebGLRenderer({ antialias: true });
    this.ren.setSize(W, H);
    this.ren.setPixelRatio(Math.min(devicePixelRatio, 2));
    box.insertBefore(this.ren.domElement, box.firstChild);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dl = new THREE.DirectionalLight(0xffffff, 0.6);
    dl.position.set(200, 400, 300);
    this.scene.add(dl);

    this.theta = Math.PI * 0.3; this.phi = Math.PI * 0.22; this.radius = 1600;
    this.topoGroup = new THREE.Group(); this.scene.add(this.topoGroup);
    this.dhGroup = new THREE.Group(); this.scene.add(this.dhGroup);
    this.blockGeo = null; this.blockMat = new THREE.MeshPhongMaterial({ vertexColors: false });
    this.blockMesh = null;
    this.dummyHide = new THREE.Matrix4().makeScale(0, 0, 0);

    // Interactions souris
    let drag = false, mx, my;
    this.on(this.ren.domElement, 'pointerdown', (e) => { drag = true; mx = e.clientX; my = e.clientY; });
    this.on(window, 'pointerup', () => { drag = false; });
    this.on(window, 'pointermove', (e) => {
      if (!drag) return;
      this.theta -= (e.clientX - mx) * 0.005;
      this.phi = Math.max(-0.3, Math.min(1.4, this.phi + (e.clientY - my) * 0.005));
      mx = e.clientX; my = e.clientY;
      this.updateCam(); this.ren.render(this.scene, this.cam);
    });
    this.on(this.ren.domElement, 'wheel', (e) => {
      e.preventDefault();
      this.radius = Math.max(200, Math.min(2500, this.radius + e.deltaY * 0.5));
      this.updateCam(); this.ren.render(this.scene, this.cam);
    }, { passive: false });

    // Events
    this.on(this.cutInput, 'input', () => this.applyFilter());
    this.on(this.dhInput, 'change', () => { this.dhGroup.visible = this.dhInput.checked; this.ren.render(this.scene, this.cam); });
    this.on(this.topoInput, 'change', () => { this.topoGroup.visible = this.topoInput.checked; this.ren.render(this.scene, this.cam); });
    this.on(this.newBtn, 'click', () => {
      this.modelIdx = (this.modelIdx + 1) % SEEDS_INIT.length;
      this.seed = SEEDS_INIT[this.modelIdx];
      this.chargerModele();
    });
    this.on(this.scenarioSelect, 'change', () => {
      this.scenario = this.scenarioSelect.value;
      this.chargerModele();
    });

    // Pyodide load + premier modele
    afficherChargementJusquaPret(this.el).then(async () => {
      // Liste autoritaire des scenarios depuis la librairie (avec repli statique
      // si la fonction n'est pas encore disponible cote Pyodide).
      try {
        const liste = await gpoly.listerScenariosBlockModel();
        if (Array.isArray(liste) && liste.length) {
          this.scenarios = liste;
          this.scenario = this.scenarios[0].id;
          this.scenarioSelect.innerHTML = this.scenarios.map((s, i) =>
            `<option value="${s.id}">Scénario ${i + 1}</option>`).join('');
        }
      } catch (e) { /* repli SCENARIOS_REPLI deja en place */ }
      this.chargerModele();
    });
  }

  updateCam() {
    if (!this.config) return;
    const NX = this.config.nx, NY = this.config.ny, NZ = this.config.nz, BS = this.config.bloc_size, ZBOT = this.config.z_bot;
    const cxCam = NX * BS / 2, cyCam = NY * BS / 2, czCam = ZBOT + NZ * BS * 0.45;
    this.cam.position.set(
      cxCam + this.radius * Math.cos(this.phi) * Math.sin(this.theta),
      czCam + this.radius * Math.sin(this.phi),
      cyCam + this.radius * Math.cos(this.phi) * Math.cos(this.theta)
    );
    this.cam.lookAt(cxCam, czCam, cyCam);
  }

  async chargerModele() {
    const THREE = window.THREE;
    // === Generation du modele via la VRAIE librairie ===
    let m;
    try { m = await gpoly.genererBlockModelScenario(this.scenario, this.seed); }
    catch (e) { this.afficherAvertissement('Erreur generation block model : ' + e.message); return; }

    this.config = m;
    const NX = m.nx, NY = m.ny, NZ = m.nz, BS = m.bloc_size;
    const ZTOP = m.z_top, ZBOT = m.z_bot;
    const TOTAL = NX * NY * NZ;
    this.updateCam();

    // Topographie (re-construite — c'est rapide et le seed peut influer)
    while (this.topoGroup.children.length) {
      const c = this.topoGroup.children[0]; c.geometry?.dispose(); c.material?.dispose(); this.topoGroup.remove(c);
    }
    const topo = m.topo;
    const res = topo.length - 1;
    const geo = new THREE.PlaneGeometry(NX * BS * 1.4, NY * BS * 1.4, res, res);
    const pos = geo.attributes.position;
    let k = 0;
    for (let j = 0; j <= res; j++) for (let i = 0; i <= res; i++) { pos.setZ(k++, topo[j][i]); }
    geo.computeVertexNormals();
    const mat = new THREE.MeshPhongMaterial({ color: 0x888888, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(NX * BS / 2, ZTOP + 20, NY * BS / 2);
    this.topoGroup.add(mesh);

    // Forages
    while (this.dhGroup.children.length) {
      const c = this.dhGroup.children[0]; c.geometry?.dispose(); c.material?.dispose(); this.dhGroup.remove(c);
    }
    for (const dh of m.drill_holes) {
      const [x0, y0, z0, ddx, ddy, depth] = dh;
      const pts = [
        new THREE.Vector3(x0, z0, y0),
        new THREE.Vector3(x0 + ddx, z0 - depth, y0 + ddy),
      ];
      this.dhGroup.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.6 })
      ));
    }

    // Blocs (InstancedMesh)
    if (this.blockMesh) this.scene.remove(this.blockMesh);
    if (!this.blockGeo) this.blockGeo = new THREE.BoxGeometry(BS * 0.95, BS * 0.95, BS * 0.95);
    // On affiche TOUJOURS la grille complete (TOTAL = NX*NY*NZ = 40960 blocs) :
    // pas d'enveloppe, donc toutes les teneurs sont >= 0 et chaque bloc recoit
    // sa couleur directement d'apres sa teneur (gradeColor). Seule la structure
    // spatiale change d'un scenario a l'autre, jamais la taille/forme de la
    // section visible.
    const grades = new Float32Array(m.grades_flat);
    this.blockMesh = new THREE.InstancedMesh(this.blockGeo, this.blockMat, TOTAL);
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    this.blockGr = new Float32Array(TOTAL);
    this.initialMatrices = new Float32Array(TOTAL * 16);
    this.nValid = TOTAL;
    this.nDeposit = 0;   // blocs a l'interieur de l'enveloppe (teneur >= 0)
    let bIdx = 0;
    for (let iz = 0; iz < NZ; iz++) for (let iy = 0; iy < NY; iy++) for (let ix = 0; ix < NX; ix++) {
      const gi = iz * NX * NY + iy * NX + ix;
      const v = grades[gi];
      dummy.position.set(ix * BS + BS / 2, ZTOP - iz * BS - BS / 2, iy * BS + BS / 2);
      dummy.updateMatrix();
      this.blockMesh.setMatrixAt(bIdx, dummy.matrix);
      this.initialMatrices.set(dummy.matrix.elements, bIdx * 16);
      color.set(gradeColor(v));
      this.blockMesh.setColorAt(bIdx, color);
      this.blockGr[bIdx] = v;
      if (v >= 0) this.nDeposit++;
      bIdx++;
    }
    this.blockMesh.instanceMatrix.needsUpdate = true;
    this.blockMesh.instanceColor.needsUpdate = true;
    this.scene.add(this.blockMesh);
    this.modNumLabel.textContent = `seed ${this.seed}`;
    this.applyFilter();
  }

  applyFilter() {
    if (!this.blockMesh) return;
    const THREE = window.THREE;
    const cutoff = +this.cutInput.value / 100;
    this.cutLabel.textContent = cutoff.toFixed(2);
    let nVisible = 0, totalGrade = 0;
    const tmp = new THREE.Matrix4();
    for (let i = 0; i < this.nValid; i++) {
      const g = this.blockGr[i];
      const visible = g >= cutoff;
      if (visible) {
        tmp.fromArray(this.initialMatrices, i * 16);
        this.blockMesh.setMatrixAt(i, tmp);
        nVisible++; totalGrade += g;
      } else {
        this.blockMesh.setMatrixAt(i, this.dummyHide);
      }
    }
    this.blockMesh.instanceMatrix.needsUpdate = true;
    this.ren.render(this.scene, this.cam);
    const moyenne = nVisible > 0 ? totalGrade / nVisible : 0;
    const style = this.config?.style_gisement ? ` — ${this.config.style_gisement}` : '';
    this.infoDiv.textContent =
      `Seed ${this.seed}${style} · ` +
      `Blocs au-dessus de la coupure : ${nVisible.toLocaleString()} / ${this.nDeposit.toLocaleString()} (gisement)` +
      ` · Teneur moyenne (coupure ${cutoff.toFixed(2)} %) : ${moyenne.toFixed(3)} %`;
  }

  cleanup() {
    try {
      this.blockGeo?.dispose();
      this.blockMat?.dispose();
      this.ren?.dispose();
      this.ren?.domElement?.remove();
      for (const grp of [this.topoGroup, this.dhGroup]) {
        if (!grp) continue;
        while (grp.children.length) {
          const c = grp.children[0]; c.geometry?.dispose(); c.material?.dispose(); grp.remove(c);
        }
      }
    } catch (e) {}
  }
}

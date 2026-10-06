// scripts/geostat-js/widgets/c02_cutoff_bloc.js
// -----------------------------------------------------------------------------
// Widget « Teneur de coupure sur un modèle de blocs 3D » (C02).
// Source de vérité : geostat_polymtl.data.blockmodel.generer_block_model_covariance
// (via gpoly.genererBlockModelScenario, calcul live) — même générateur « sans
// enveloppe géométrique » que l'atelier 1 de C01 : tous les blocs ont une
// teneur >= 0, simulée par FFT-MA avec un modèle de covariance réel. Cela
// donne une mosaïque de teneurs visible sur les 3 faces du cube (haut, avant,
// droite), conforme à la Figure 2.1 du chapitre.
// Rendu 3D (Three.js, InstancedMesh) — même technique que l'atelier C01.
//
// Représentation à 2 couleurs (style « bloc minéralisé »), fidèle à la
// Figure 2.1 du chapitre : un seul bloc 3D, sans forages ni topographie.
//   - bleu pâle = stérile (teneur < teneur de coupure)
//   - jaune     = minerai (teneur >= teneur de coupure)
//   - points bleu foncé = grains de métal, imprimés sur chacune des 6 faces
//     des blocs classés minerai.
// Seul le curseur de teneur de coupure est interactif : il recolore les
// blocs et met à jour x_c, g_c, q_c (théorie de Lane).
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

const NX = 12, NY = 8, NZ = 6;        // dimensions du modèle (blocs) — proportions cubiques, blocs plus gros
const BLOC = 15.0;                   // taille d'un bloc (m)
const SEED = 7;                      // gisement fixe (reproductible)
// Scénario de covariance « bloc bruité » (courte portée ~3 blocs + 40 % de
// pépite) : sur un petit cube 12x8x6, les transitions riche/pauvre sont bien
// visibles (l'ancien scénario à portée 12 couvrait tout le cube -> trop lisse).
// Généré SANS enveloppe (enveloppe=false) pour conserver un cube plein.
const SCENARIO = 'bloc_cutoff_bruite';

// Couleurs (configuration de visualisation, pas de calcul).
const COLOR_STERILE = '#a9c4ea'; // bleu pâle : sous la teneur de coupure
const COLOR_ORE     = '#f6b93b'; // jaune     : au-dessus de la teneur de coupure
const COLOR_METAL   = '#16207a'; // bleu foncé : zones de teneur élevée (points)

// Ombrage par face (effet « cube isométrique » de la Figure 2.1) : la face
// du haut est la plus claire, la face avant (sud) intermédiaire, la face
// droite (est) la plus sombre. Multiplié avec la couleur stérile/minerai
// de chaque bloc via instanceColor.
const FACE_SHADE = { right: 0.55, top: 1.0, front: 0.8, hidden: 0.8 };

const STYLE = `
.cb3d{max-width:760px;margin:0 auto;font-family:system-ui,sans-serif}
.cb3d-view{position:relative;width:100%;height:420px;border:1px solid #d4d0c8;border-radius:6px;
  overflow:hidden;background:#0b0b14;cursor:grab}
.cb3d-legend{position:absolute;top:10px;right:10px;background:rgba(255,255,255,.92);border:1px solid #999;
  border-radius:5px;padding:6px 8px;font:11px system-ui;line-height:1.6}
.cb3d-leg-row{display:flex;align-items:center;gap:5px;margin:2px 0;white-space:nowrap}
.cb3d-ov{position:absolute;bottom:8px;left:8px;background:rgba(0,0,0,.55);color:#ddd;font:11px system-ui;
  padding:4px 8px;border-radius:4px;pointer-events:none}
.cb3d-controls{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;margin-top:10px}
.cb3d-controls label{font-size:13px;font-weight:600;color:#444;display:flex;align-items:center;gap:6px}
.cb3d-controls input[type="range"]{width:min(280px,100%)}
.cb3d-pill{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;
  border:1px solid #ddd;border-radius:999px;background:#fff;font-size:13px;white-space:nowrap}
.cb3d-swatch{width:13px;height:13px;border-radius:3px;border:1px solid #2223;display:inline-block;flex:none}
.cb3d-dot{border-radius:50%}
.cb3d-hint{font-size:13px;color:#333;margin-top:10px;line-height:1.45}
`;

// Applique un ombrage par face (couleurs de sommets en niveaux de gris,
// multipliées avec instanceColor) pour simuler l'éclairage d'un cube
// isométrique : face du haut très claire, face avant (sud, +z) moyenne,
// face droite (est, +x) sombre — comme dans la Figure 2.1. Les 3 autres
// faces (cachées entre blocs voisins) reçoivent une teinte neutre.
function ajouterOmbrageFaces(geo, THREE) {
  const nv = (geo.attributes && geo.attributes.position) ? geo.attributes.position.count : 24;
  const colors = new Float32Array(nv * 3);
  // BoxGeometry (r128) : groupes de 4 sommets par face, dans l'ordre
  // +x, -x, +y, -y, +z, -z.
  const shadeByGroup = [
    FACE_SHADE.right,  // +x (face droite, visible)
    FACE_SHADE.hidden, // -x
    FACE_SHADE.top,    // +y (face du haut, visible)
    FACE_SHADE.hidden, // -y
    FACE_SHADE.front,  // +z (face avant, visible)
    FACE_SHADE.hidden, // -z
  ];
  for (let i = 0; i < nv; i++) {
    const g = Math.min(5, Math.floor(i / 4));
    const s = shadeByGroup[g];
    colors[i * 3] = s; colors[i * 3 + 1] = s; colors[i * 3 + 2] = s;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

export default class C02CutoffBloc extends Widget {
  render() {
    if (typeof window.THREE === 'undefined') {
      this.afficherAvertissement("THREE.js non chargé. Vérifiez le CDN dans le .qmd.");
      return;
    }

    if (!document.getElementById('cb3d-style')) {
      const st = document.createElement('style');
      st.id = 'cb3d-style';
      st.textContent = STYLE;
      document.head.appendChild(st);
    }

    this.el.insertAdjacentHTML('beforeend', [
      '<div class="cb3d">',
      '  <div class="cb3d-view">',
      '    <div class="cb3d-legend">',
      '      <div class="cb3d-leg-row"><span class="cb3d-swatch" style="background:' + COLOR_STERILE + '"></span> St&eacute;rile (&lt; cutoff)</div>',
      '      <div class="cb3d-leg-row"><span class="cb3d-swatch" style="background:' + COLOR_ORE + '"></span> Minerai (&ge; cutoff)</div>',
      '      <div class="cb3d-leg-row"><span class="cb3d-swatch cb3d-dot" style="background:' + COLOR_METAL + '"></span> Grain de m&eacute;tal</div>',
      '    </div>',
      '    <div class="cb3d-ov">Glissez pour pivoter &middot; Molette pour zoomer</div>',
      '  </div>',
      '  <div class="cb3d-controls">',
      '    <label>Teneur de coupure',
      '      <input type="range" class="js-cutoff" min="0" max="1.2" step="0.01" value="0.25">',
      '    </label>',
      '    <span class="cb3d-pill">Cutoff = <b class="js-cutoff-val">0.25</b> % Cu</span>',
      '  </div>',
      '  <div class="cb3d-controls" style="justify-content:center">',
      '    <span class="cb3d-pill js-xc">x<sub>c</sub> = &mdash;</span>',
      '    <span class="cb3d-pill js-gc">g<sub>c</sub> = &mdash;</span>',
      '    <span class="cb3d-pill js-qc">q<sub>c</sub> = &mdash;</span>',
      '  </div>',
      '  <p class="cb3d-hint">',
      '    D&eacute;place le curseur : chaque bloc est color&eacute; en',
      '    <b>bleu p&acirc;le</b> (st&eacute;rile, teneur &lt; teneur de coupure) ou en',
      '    <b>jaune</b> (minerai, envoy&eacute; au concentrateur). Les points',
      '    <b>bleu fonc&eacute;</b> repr&eacute;sentent le m&eacute;tal : ils sont coll&eacute;s sur',
      '    chaque face d&rsquo;un bloc class&eacute; minerai et disparaissent avec lui.',
      '    <b>x<sub>c</sub></b> est la proportion de blocs jaunes (envoy&eacute;e au concentrateur),',
      '    <b>g<sub>c</sub></b> leur teneur moyenne et <b>q<sub>c</sub> = x<sub>c</sub>&middot;g<sub>c</sub></b>',
      '    la teneur r&eacute;cup&eacute;r&eacute;e moyenne sur l&rsquo;ensemble du gisement &mdash; les m&ecirc;mes',
      '    quantit&eacute;s utilis&eacute;es dans la th&eacute;orie de Lane.',
      '  </p>',
      '  <p style="margin-top:6px;font-size:11px;color:#666">',
      '    Mod&egrave;le de blocs g&eacute;n&eacute;r&eacute; par <code>geostat_polymtl.data.blockmodel</code> (calcul live via Pyodide).</p>',
      '</div>',
    ].join('\n'));

    const box = this.el.querySelector('.cb3d-view');
    this.cutInput = this.el.querySelector('.js-cutoff');
    this.cutLabel = this.el.querySelector('.js-cutoff-val');
    this.xcEl = this.el.querySelector('.js-xc');
    this.gcEl = this.el.querySelector('.js-gc');
    this.qcEl = this.el.querySelector('.js-qc');

    // === Scène Three.js ===
    const THREE = window.THREE;
    const W = box.clientWidth, H = box.clientHeight;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b0b14);
    this.cam = new THREE.PerspectiveCamera(40, W / H, 1, 5000);
    this.ren = new THREE.WebGLRenderer({ antialias: true });
    this.ren.setSize(W, H);
    this.ren.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    box.insertBefore(this.ren.domElement, box.firstChild);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const dl = new THREE.DirectionalLight(0xffffff, 0.5);
    dl.position.set(200, 400, 300);
    this.scene.add(dl);

    this.theta = Math.PI * 0.3; this.phi = Math.PI * 0.22; this.radius = 900;
    this.blockGeo = null; this.blockMat = new THREE.MeshPhongMaterial({ vertexColors: true });
    this.blockMesh = null;
    this.dotGeo = null; this.dotMat = new THREE.MeshPhongMaterial({ color: COLOR_METAL, side: THREE.DoubleSide });
    this.dotMesh = null;
    this.dummyHide = new THREE.Matrix4().makeScale(0, 0, 0);

    // Interactions souris : glisser pour pivoter, molette pour zoomer.
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
      this.radius = Math.max(150, Math.min(2000, this.radius + e.deltaY * 0.4));
      this.updateCam(); this.ren.render(this.scene, this.cam);
    }, { passive: false });

    // Événement UI : le curseur de teneur de coupure est le SEUL contrôle.
    this.on(this.cutInput, 'input', () => this.applyFilter(parseFloat(this.cutInput.value)));

    afficherChargementJusquaPret(this.el).then(() => this.chargerModele());
  }

  updateCam() {
    if (!this.bm) return;
    const NXc = this.bm.nx, NYc = this.bm.ny, NZc = this.bm.nz, BS = this.bm.bloc_size, ZBOT = this.bm.z_bot;
    const cx = NXc * BS / 2, cy = NYc * BS / 2, cz = ZBOT + NZc * BS * 0.45;
    this.cam.position.set(
      cx + this.radius * Math.cos(this.phi) * Math.sin(this.theta),
      cz + this.radius * Math.sin(this.phi),
      cy + this.radius * Math.cos(this.phi) * Math.cos(this.theta)
    );
    this.cam.lookAt(cx, cz, cy);
  }

  async chargerModele() {
    const THREE = window.THREE;

    // === Appel à la VRAIE librairie === (0 forages ; enveloppe=false -> cube plein)
    this.bm = await this.tryShow(() =>
      gpoly.genererBlockModelScenario(SCENARIO, SEED, NX, NY, NZ, BLOC, 0, 2, false));

    const m = this.bm;
    const NXc = m.nx, NYc = m.ny, NZc = m.nz, BS = m.bloc_size, ZTOP = m.z_top;
    const TOTAL = NXc * NYc * NZc;

    // Distance caméra ajustée à la taille du gisement pour que le cube
    // occupe ~80 % de la hauteur de la vue (au lieu d'une valeur fixe
    // souvent trop éloignée pour de petites grilles).
    const diag = Math.sqrt((NXc * BS) ** 2 + (NYc * BS) ** 2 + (NZc * BS) ** 2);
    this.radius = diag / (2 * 0.8 * Math.tan(this.cam.fov * Math.PI / 360));
    this.updateCam();

    // Étendue du slider : 0 → ~95e percentile des teneurs. Curseur initial
    // = médiane (≈moitié minerai / moitié stérile, comme dans la Figure 2.1).
    const valides = m.grades_flat.filter(g => g >= 0).slice().sort((a, b) => a - b);
    const p95 = valides.length ? (valides[Math.floor(0.95 * (valides.length - 1))] || 1.2) : 1.2;
    const median = valides.length ? valides[Math.floor(0.50 * (valides.length - 1))] : 0;
    this.cutInput.max = (Math.ceil(p95 * 10) / 10).toFixed(1);
    this.cutInput.value = median.toFixed(2);

    // --- Blocs (InstancedMesh, toujours visibles, recolorés selon le cutoff) ---
    if (this.blockMesh) this.scene.remove(this.blockMesh);
    if (!this.blockGeo) {
      this.blockGeo = new THREE.BoxGeometry(BS * 0.86, BS * 0.86, BS * 0.86);
      ajouterOmbrageFaces(this.blockGeo, THREE);
    }
    const grades = new Float32Array(m.grades_flat);
    this.blockMesh = new THREE.InstancedMesh(this.blockGeo, this.blockMat, TOTAL);
    const dummy = new THREE.Object3D();
    this.blockGr = new Float32Array(TOTAL);
    this.nTot = TOTAL;

    // --- Points "métal" : un disque plat par face extérieure de chaque
    // bloc (les 6 faces du cube élémentaire), imprimé sur la face (orienté
    // selon sa normale, avec un très léger décalage anti z-fighting) et
    // légèrement dispersé pour donner l'effet "grains de métal" de la
    // Figure 2.1. Visible uniquement si le bloc est classé minerai
    // (cf. applyFilter) : chaque face jaune porte donc son grain de métal,
    // y compris lorsqu'on pivote la vue pour voir les faces cachées.
    const dotR = BS * 0.16;
    const off  = BS * 0.15;
    const half = BS * 0.43; // demi-taille visible d'un bloc (BoxGeometry = BS * 0.86)
    const eps  = BS * 0.01; // décalage au-dessus de la face (anti z-fighting)
    const dotPositions = [];
    const jitter = () => (Math.random() - 0.5) * 2 * off;

    let bIdx = 0;
    for (let iz = 0; iz < NZc; iz++) for (let iy = 0; iy < NYc; iy++) for (let ix = 0; ix < NXc; ix++) {
      const gi = iz * NXc * NYc + iy * NXc + ix;
      const v = grades[gi];
      const X = ix * BS + BS / 2, Y = ZTOP - iz * BS - BS / 2, Z = iy * BS + BS / 2;
      dummy.position.set(X, Y, Z);
      dummy.updateMatrix();
      this.blockMesh.setMatrixAt(bIdx, dummy.matrix);
      this.blockGr[bIdx] = v;

      // face du haut : normale +Y -> disque à plat (rotation -90° autour de X)
      dotPositions.push({ x: X + jitter(), y: Y + half + eps, z: Z + jitter(), rx: -Math.PI / 2, ry: 0, gi: bIdx });
      // face du bas : normale -Y -> rotation +90° autour de X
      dotPositions.push({ x: X + jitter(), y: Y - half - eps, z: Z + jitter(), rx: Math.PI / 2, ry: 0, gi: bIdx });
      // face avant : normale +Z -> orientation par défaut du disque
      dotPositions.push({ x: X + jitter(), y: Y + jitter(), z: Z + half + eps, rx: 0, ry: 0, gi: bIdx });
      // face arrière : normale -Z -> rotation 180° autour de Y
      dotPositions.push({ x: X + jitter(), y: Y + jitter(), z: Z - half - eps, rx: 0, ry: Math.PI, gi: bIdx });
      // face droite : normale +X -> rotation +90° autour de Y
      dotPositions.push({ x: X + half + eps, y: Y + jitter(), z: Z + jitter(), rx: 0, ry: Math.PI / 2, gi: bIdx });
      // face gauche : normale -X -> rotation -90° autour de Y
      dotPositions.push({ x: X - half - eps, y: Y + jitter(), z: Z + jitter(), rx: 0, ry: -Math.PI / 2, gi: bIdx });
      bIdx++;
    }
    this.blockMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.blockMesh);

    // --- Construction de la InstancedMesh des points métal ---
    if (this.dotMesh) this.scene.remove(this.dotMesh);
    this.nDots = dotPositions.length;
    if (!this.dotGeo) this.dotGeo = new THREE.CircleGeometry(dotR, 16);
    this.dotMesh = new THREE.InstancedMesh(this.dotGeo, this.dotMat, this.nDots);
    this.dotInitialMatrices = new Float32Array(this.nDots * 16);
    this.dotBlockIdx = new Int32Array(this.nDots);
    for (let d = 0; d < this.nDots; d++) {
      const p = dotPositions[d];
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(p.rx, p.ry, 0);
      dummy.updateMatrix();
      this.dotMesh.setMatrixAt(d, dummy.matrix);
      this.dotInitialMatrices.set(dummy.matrix.elements, d * 16);
      this.dotBlockIdx[d] = p.gi;
    }
    this.dotMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.dotMesh);

    this.applyFilter(parseFloat(this.cutInput.value));
  }

  applyFilter(cutoff) {
    if (!this.blockMesh) return;
    const THREE = window.THREE;
    this.cutLabel.textContent = cutoff.toFixed(2);

    // Recoloration binaire des blocs (stérile / minerai) selon le cutoff.
    const oreColor = new THREE.Color().set(COLOR_ORE);
    const sterileColor = new THREE.Color().set(COLOR_STERILE);
    let nAbove = 0, sumAbove = 0;
    for (let i = 0; i < this.nTot; i++) {
      const g = this.blockGr[i];
      const ore = g >= cutoff;
      this.blockMesh.setColorAt(i, ore ? oreColor : sterileColor);
      if (ore) { nAbove++; sumAbove += g; }
    }
    if (this.blockMesh.instanceColor) this.blockMesh.instanceColor.needsUpdate = true;

    // Les points "métal" ne sont visibles que dans les blocs classés minerai.
    const tmp = new THREE.Matrix4();
    for (let d = 0; d < this.nDots; d++) {
      const gi = this.dotBlockIdx[d];
      if (this.blockGr[gi] >= cutoff) {
        tmp.fromArray(this.dotInitialMatrices, d * 16);
        this.dotMesh.setMatrixAt(d, tmp);
      } else {
        this.dotMesh.setMatrixAt(d, this.dummyHide);
      }
    }
    if (this.dotMesh) this.dotMesh.instanceMatrix.needsUpdate = true;

    this.ren.render(this.scene, this.cam);

    // x_c, g_c, q_c sur l'ensemble du modèle : tous les blocs ont une teneur
    // >= 0 (pas d'enveloppe géométrique) et sont classés selon le cutoff.
    const xc = this.nTot > 0 ? nAbove / this.nTot : 0;
    const gc = nAbove > 0 ? sumAbove / nAbove : 0;
    const qc = xc * gc;

    this.xcEl.innerHTML = 'x<sub>c</sub> = ' + (100 * xc).toFixed(1) + ' %';
    this.gcEl.innerHTML = 'g<sub>c</sub> = ' + gc.toFixed(2) + ' % Cu';
    this.qcEl.innerHTML = 'q<sub>c</sub> = ' + qc.toFixed(3) + ' % Cu';
  }

  cleanup() {
    try {
      this.blockGeo?.dispose();
      this.blockMat?.dispose();
      this.dotGeo?.dispose();
      this.dotMat?.dispose();
      this.ren?.dispose();
      this.ren?.domElement?.remove();
    } catch (e) {}
  }
}

// scripts/geostat-js/widgets/c13_mps_anim.js
// -----------------------------------------------------------------------------
// Widget C13 — Atelier 13.4 : simulation multipoints, DeeSse et FilterSim.
//
// Images d'entraînement (TI) réelles, stockées localement (scripts/geostat-js/ti/).
//
// DeeSse (échantillonnage direct, PAR POINT), d'après Mariethoz et al. (2010) :
//   chemin aléatoire sur la grille, et pour chaque nœud un CHEMIN ALÉATOIRE DANS
//   LA TI — chaque emplacement est visité au plus une fois — avec arrêt au
//   premier dont le voisinage s'accorde à mieux que le seuil t. La distance est
//   accumulée du voisin le plus proche au plus lointain et ABANDONNÉE dès
//   qu'elle dépasse le meilleur score déjà obtenu : un mauvais candidat coûte
//   alors deux ou trois comparaisons au lieu de n, ce qui permet de balayer une
//   vraie fraction de la TI au lieu d'une poignée de tirages.
//
// FilterSim (PAR PATCH, quilting d'Efros & Freeman, 2001) : la grille se remplit
//   par morceaux ; chaque patch est choisi pour raccorder au mieux les bords déjà
//   posés, puis assemblé le long de la COUPE DE MOINDRE ERREUR calculée par
//   programmation dynamique dans la zone de recouvrement. Sans cette coupe, les
//   raccords sont des droites et se voient — c'est le but de la case à cocher.
//
// Les paramètres de sensibilité des deux méthodes sont exposés : c'est l'intérêt
// pédagogique de l'atelier (voir l'effet du seuil, du voisinage, du patch…).
// -----------------------------------------------------------------------------
import { Widget } from '../widget-base.js';
import { afficherChargementJusquaPret } from '../pyodide_setup.js';

// Taille de la TI après mise au carré : la grille simulée prend EXACTEMENT la
// même taille, pour que les deux vignettes s'affichent à la même échelle. Sans
// cela la simulation est grossie par rapport à la TI posée à côté et paraît
// bien plus grossière qu'elle ne l'est.
const TI_MAX = 200;
// La grille simulee suit la taille de la TI, mais plafonnee : le cout de DeeSse
// croit comme SN^2 x (positions de TI), et au-dela l'atelier n'est plus
// interactif. Le canvas est alors affiche a la MEME echelle que la TI.
const SN_MAX = 150;
// Nombre maximal de positions de TI visitees pour une realisation entiere.
// Calibre pour rester sous ~3 s de calcul dans un navigateur de bureau.
const PLAFOND_VISITES = 42e6;
const RGBP = [[238, 232, 214], [196, 120, 38], [70, 130, 180], [110, 170, 90], [150, 90, 160]];

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function pgcd(a, b) { while (b) { const t = a % b; a = b; b = t; } return a; }

function gChenaux(n, seed) {
  const T = new Uint8Array(n * n), rng = mulberry32(seed), sp = n / 7;
  for (let c = 0; c < 7; c++) { const y0 = (c + 0.5) * sp, ph = rng() * 6.28, wl = n * 0.26, amp = sp * 0.9, hw = n * 0.017; for (let i = 0; i < n; i++) { const yc = y0 + amp * Math.sin(2 * Math.PI * i / wl + ph); for (let j = Math.round(yc - hw); j <= Math.round(yc + hw); j++) { const jj = ((j % n) + n) % n; T[jj * n + i] = 1; } } }
  return T;
}
const TIBANK = [
  ['Méandres (réel)', { url: 'ti_meandres_500x500.SGEMS' }],
  ['Chenaux 2D (réel)', { url: 'ti_2D_channels_400x340.SGEMS' }],
  ['Pierres (réel)', { url: 'ti_pierres.SGEMS' }],
  ['Dunes — 3 faciès (réel)', { url: 'dunes_3facies.SGEMS' }],
  ['Damier (réel)', { url: 'damier500x500.SGEMS' }],
  ['Chenaux (synthétique)', { gen: gChenaux }],
];

const CTRL = 'font-size:.78rem;';
const BTN = 'font-size:.78rem;padding:4px 10px;border:none;border-radius:5px;cursor:pointer;';

export default class C13MPSAnim extends Widget {
  render() {
    const id = this.el.id;
    this.seed = 4; this.mode = 'deesse'; this.timer = null; this.g = 0;
    this.tiKind = 0; this.busy = false; this.cache = {};
    this.el.insertAdjacentHTML('beforeend', `
      <style>
        #${id} .gw-controls label{display:inline-flex !important;flex-direction:row !important;align-items:center;gap:5px;}
        #${id} .tile{width:252px;text-align:center;}
        #${id} .tile canvas{width:100%;height:auto;border:1px solid #bbb;image-rendering:pixelated;display:block;margin:2px auto;}
        #${id} .tlab{font-size:11px;color:#444;margin-bottom:2px;}
        #${id} .prm{display:flex;flex-wrap:wrap;gap:13px;align-items:center;padding:7px 12px;
                     border:1px solid #cfe0ee;background:#f3f7fb;border-radius:8px;font-size:.8rem;margin-top:6px;}
        #${id} .prm b{font-size:.76rem;color:#3f5170;}
        #${id} .prm input[type=range]{width:88px;}
        #${id} .vv{color:#1d4ed8;font-weight:600;font-variant-numeric:tabular-nums;}
      </style>
      <div class="gw-controls" style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;">
        <span style="display:inline-flex;border:1px solid #bbb;border-radius:6px;overflow:hidden;">
          <button class="js-pt" type="button" style="padding:5px 12px;border:none;background:#0d4d92;color:#fff;cursor:pointer;font-size:.8rem;">DeeSse (par point)</button>
          <button class="js-pa" type="button" style="padding:5px 12px;border:none;background:#fff;cursor:pointer;font-size:.8rem;">FilterSim (par patch)</button>
        </span>
        <label>Image d'entraînement <select class="js-ti-sel" style="${CTRL}">${TIBANK.map((t, i) => `<option value="${i}">${t[0]}</option>`).join('')}</select></label>
        <button class="js-play" type="button" style="${BTN}background:#1f8a4c;color:#fff;font-weight:600;padding:5px 14px;">▶ Lancer</button>
        <label>Vitesse <input type="range" class="js-spd" min="1" max="5" value="3" step="1" style="width:78px"></label>
        <button class="js-regen" type="button" style="${BTN}background:#3a3632;color:#fff;">Nouveau tirage</button>
      </div>

      <div class="prm js-prm-ds">
        <b>Sensibilité — DeeSse</b>
        <label title="Nombre de voisins déjà simulés qui forment l'événement de donnée. Plus il y en a, plus le motif imposé est contraignant.">
          Voisins <i>n</i> <input type="range" class="js-n" min="8" max="60" value="30" step="2"><span class="vv js-nv">30</span></label>
        <label title="Rayon du gabarit : jusqu'où on va chercher ces voisins.">
          Rayon <i>R</i> <input type="range" class="js-R" min="3" max="14" value="6" step="1"><span class="vv js-Rv">6</span></label>
        <label title="Seuil d'acceptation : écart toléré entre le voisinage simulé et celui de la TI. 0 = appariement exact.">
          Seuil <i>t</i> <input type="range" class="js-t" min="0" max="0.25" value="0" step="0.01"><span class="vv js-tv">0,00</span></label>
        <label title="Fraction de la TI explorée au maximum avant d'abandonner et de garder le meilleur candidat.">
          Balayage TI <input type="range" class="js-f" min="5" max="100" value="40" step="5"><span class="vv js-fv">40</span> %</label>
        <label title="Niveaux de multigrille. En automatique, la profondeur est déduite de la portée réelle des structures de la TI.">
          Multigrille <select class="js-mg" style="${CTRL}">
            <option value="auto">auto (complète)</option><option value="1">1 — aucune</option>
            <option value="2">2, 1</option><option value="4">4, 2, 1</option></select></label>
      </div>

      <div class="prm js-prm-fs">
        <b>Sensibilité — FilterSim</b>
        <label title="Côté du patch recopié d'un bloc depuis la TI.">
          Patch <input type="range" class="js-ps" min="8" max="48" value="26" step="2"><span class="vv js-psv">26</span> px</label>
        <label title="Largeur de la bande où deux patchs voisins se superposent, en fraction du patch.">
          Recouvrement <input type="range" class="js-ov" min="15" max="50" value="33" step="1"><span class="vv js-ovv">33</span> %</label>
        <label title="Nombre de positions de la TI essayées avant de choisir le patch.">
          Candidats <input type="range" class="js-ns" min="40" max="800" value="400" step="20"><span class="vv js-nsv">400</span></label>
        <label title="On tire au sort parmi les patchs dont l'erreur dépasse de moins de ce pourcentage celle du meilleur. 0 % = toujours le meilleur, donc peu de variabilité.">
          Tolérance <input type="range" class="js-tol" min="0" max="40" value="10" step="1"><span class="vv js-tolv">10</span> %</label>
        <label title="Assemble les patchs le long du chemin de moindre erreur au lieu d'une frontière droite. Décochez pour voir apparaître les coutures.">
          <input type="checkbox" class="js-cut" checked> coupe de moindre erreur</label>
      </div>

      <div style="display:flex;flex-wrap:wrap;gap:16px;justify-content:center;margin-top:8px;">
        <div class="tile"><div class="tlab">Image d'entraînement (TI) — <span style="color:#e11">▢</span> zone copiée</div><canvas class="js-ti"></canvas></div>
        <div class="tile"><div class="tlab">Réalisation simulée — <span style="color:#e11">▢</span> en cours</div><canvas class="js-sim"></canvas></div>
      </div>
      <div class="js-info" style="padding:.4rem 1rem;font-family:'JetBrains Mono',monospace;font-size:.78rem;color:#444;text-align:center;background:#f0f0f0;border-radius:6px;margin-top:6px;">—</div>
      <p style="margin:4px 1rem;font-size:11px;color:#666;">
        <b>Lancez l'animation</b> : la réalisation reproduit les <b>motifs</b> de la TI. Le <b style="color:#e11">rectangle rouge</b> montre la zone scannée ou copiée dans la TI.
        Les deux vignettes sont à la <b>même échelle</b>. Jouez sur les réglages de sensibilité : avec DeeSse, un seuil élevé ou un balayage faible hachent les structures ;
        avec FilterSim, décocher la coupe de moindre erreur fait apparaître les coutures entre patchs.</p>
    `);

    this.tiC = this.el.querySelector('.js-ti'); this.simC = this.el.querySelector('.js-sim');
    this.infoEl = this.el.querySelector('.js-info'); this.playBtn = this.el.querySelector('.js-play');
    this.btnPt = this.el.querySelector('.js-pt'); this.btnPa = this.el.querySelector('.js-pa');
    this.spd = this.el.querySelector('.js-spd');
    this.P = {};
    for (const k of ['n', 'R', 't', 'f', 'mg', 'ps', 'ov', 'ns', 'tol', 'cut']) this.P[k] = this.el.querySelector('.js-' + k);

    const dec = { t: 2 };
    for (const k of ['n', 'R', 't', 'f', 'ps', 'ov', 'ns', 'tol']) {
      this.on(this.P[k], 'input', e => {
        const s = this.el.querySelector('.js-' + k + 'v');
        if (s) s.textContent = (k in dec) ? (+e.target.value).toFixed(dec[k]).replace('.', ',') : e.target.value;
      });
      this.on(this.P[k], 'change', () => this._regen());
    }
    this.on(this.P.mg, 'change', () => this._regen());
    this.on(this.P.cut, 'change', () => this._regen());
    this.on(this.btnPt, 'click', () => this._setMode('deesse'));
    this.on(this.btnPa, 'click', () => this._setMode('filtersim'));
    this.on(this.el.querySelector('.js-ti-sel'), 'change', e => { this.tiKind = +e.target.value; this._regen(); });
    this.on(this.playBtn, 'click', () => this._togglePlay());
    this.on(this.el.querySelector('.js-regen'), 'click', () => { this.seed++; this._regen(); });

    this._appliquerMode();
    afficherChargementJusquaPret(this.el).then(() => this._regen());
  }

  _setMode(m) { this.mode = m; this._appliquerMode(); this._regen(); }

  _appliquerMode() {
    const d = this.mode === 'deesse';
    this.btnPt.style.background = d ? '#0d4d92' : '#fff'; this.btnPt.style.color = d ? '#fff' : '#333';
    this.btnPa.style.background = d ? '#fff' : '#0d4d92'; this.btnPa.style.color = d ? '#333' : '#fff';
    // Les feuilles de style posent display:inline-flex !important sur les <label> :
    // il faut masquer AVEC la priorité.
    for (const [sel, vis] of [['.js-prm-ds', d], ['.js-prm-fs', !d]]) {
      const n = this.el.querySelector(sel);
      if (vis) n.style.removeProperty('display'); else n.style.setProperty('display', 'none', 'important');
    }
  }

  // ---------------------------------------------------------------------------
  // Lecture de la TI
  // ---------------------------------------------------------------------------
  _parseSGEMS(txt) {
    const t = txt.split(/\s+/); let k = 0; while (k < t.length && t[k] === '') k++;
    const nx = +t[k], ny = +t[k + 1], nvar = +t[k + 3]; let p = k + 4 + nvar;
    const total = nx * ny, vals = new Float64Array(total);
    for (let i = 0; i < total; i++) { const x = +t[p + i]; vals[i] = isFinite(x) ? x : 0; }
    return { nx, ny, vals };
  }

  _finalize(nx, ny, valsRaw) {
    const side = Math.min(nx, ny), step = Math.max(1, Math.ceil(side / TI_MAX)), TIN = Math.floor(side / step);
    const tmp = new Float64Array(TIN * TIN);
    for (let j = 0; j < TIN; j++) for (let i = 0; i < TIN; i++) tmp[j * TIN + i] = valsRaw[(j * step) * nx + (i * step)];
    const uniq = [...new Set(tmp)]; this.TIN = TIN;
    if (uniq.length > 12) {
      let mn = Infinity, mx = -Infinity; for (const v of tmp) { if (v < mn) mn = v; if (v > mx) mx = v; }
      const rg = (mx - mn) || 1, TI = new Float32Array(TIN * TIN);
      for (let i = 0; i < TI.length; i++) TI[i] = (tmp[i] - mn) / rg;
      this.TI = TI; this.continuous = true; this.K = uniq.length;
    } else {
      uniq.sort((a, b) => a - b); const map = new Map(uniq.map((v, k) => [v, k]));
      const TI = new Float32Array(TIN * TIN); for (let i = 0; i < TI.length; i++) TI[i] = map.get(tmp[i]);
      this.TI = TI; this.continuous = false; this.K = uniq.length;
    }
    this.porteeTI = this._porteeTI();
  }

  /** Portée pratique de l'indicatrice du faciès le plus rare : elle dit jusqu'à
   *  quelle distance les structures de la TI sont corrélées, donc quelle
   *  profondeur de multigrille a du sens. */
  _porteeTI() {
    const TI = this.TI, n = this.TIN;
    if (this.continuous) return 12;
    let kc = 0, best = Infinity;
    for (let k = 0; k < this.K; k++) { let c = 0; for (let i = 0; i < TI.length; i++) if (TI[i] === k) c++; if (c < best) { best = c; kc = k; } }
    const p = best / TI.length, palier = p * (1 - p);
    if (palier <= 0) return 1;
    const hmax = Math.min(60, (n / 3) | 0);
    let portee = hmax;
    for (let h = 1; h <= hmax; h++) {
      let sEO = 0, cEO = 0, sNS = 0, cNS = 0;
      for (let j = 0; j < n; j += 2) for (let i = 0; i + h < n; i += 2) {
        const a = TI[j * n + i] === kc ? 1 : 0, b = TI[j * n + i + h] === kc ? 1 : 0; sEO += (a - b) * (a - b); cEO++;
      }
      for (let j = 0; j + h < n; j += 2) for (let i = 0; i < n; i += 2) {
        const a = TI[j * n + i] === kc ? 1 : 0, b = TI[(j + h) * n + i] === kc ? 1 : 0; sNS += (a - b) * (a - b); cNS++;
      }
      const g = Math.max(cEO ? 0.5 * sEO / cEO : 0, cNS ? 0.5 * sNS / cNS : 0);
      if (g >= 0.95 * palier) { portee = h; break; }
    }
    return portee;
  }

  async _loadTI() {
    const entry = TIBANK[this.tiKind][1];
    if (entry.gen) { const n = 220; this._finalize(n, n, entry.gen(n, this.seed)); return ''; }
    if (this.cache[this.tiKind]) { Object.assign(this, this.cache[this.tiKind]); return ''; }
    const cands = [];
    try { cands.push(new URL('../ti/' + entry.url, import.meta.url).href); } catch (e) { }
    cands.push('/scripts/geostat-js/ti/' + entry.url);
    cands.push('scripts/geostat-js/ti/' + entry.url);
    for (const c of cands) {
      try {
        const r = await fetch(c); if (!r.ok) continue;
        const { nx, ny, vals } = this._parseSGEMS(await r.text()); this._finalize(nx, ny, vals);
        this.cache[this.tiKind] = { TI: this.TI, TIN: this.TIN, K: this.K, continuous: this.continuous, porteeTI: this.porteeTI };
        return '';
      } catch (e) { }
    }
    this._finalize(220, 220, gChenaux(220, this.seed));
    return ' ⚠ TI non chargée — placez les .SGEMS dans scripts/geostat-js/ti/';
  }

  async _regen() {
    if (this.busy) return; this.busy = true; this._stop();
    this.infoEl.textContent = 'Calcul en cours…';
    await new Promise(r => setTimeout(r, 0));          // laisse le message s'afficher
    const note = await this._loadTI();
    if (this._derniereTI !== this.tiKind) {             // nouvelle TI : réglages par défaut
      this._derniereTI = this.tiKind;
      // Un patch trop petit hache les structures, trop grand recopie la TI telle
      // quelle : le bon ordre de grandeur est le quart du côté de la TI.
      const ps = Math.max(8, Math.min(48, Math.round(this.TIN / 4.5 / 2) * 2));
      this.P.ps.value = ps;
      this.el.querySelector('.js-psv').textContent = ps;
    }
    if (this._lastCont !== this.continuous) {           // la TI a change de nature
      this._lastCont = this.continuous;
      this.P.t.value = this.continuous ? 0.06 : 0;      // appariement exact si facies
      this.el.querySelector('.js-tv').textContent = (+this.P.t.value).toFixed(2).replace('.', ',');
    }
    this.SN = Math.min(this.TIN, SN_MAX);
    this.tiC.width = this.tiC.height = this.TIN;
    this.simC.width = this.simC.height = this.SN;
    // meme nombre de pixels ecran par maille que la TI : sans cela la
    // simulation est grossie par rapport a la TI posee a cote et parait
    // beaucoup plus grossiere qu'elle ne l'est.
    this.simC.style.width = Math.round(252 * this.SN / this.TIN) + 'px';
    const t0 = performance.now();
    this.stat = (this.mode === 'deesse') ? this._deesse() : this._filtersim();
    this.ms = performance.now() - t0;
    this.g = 0; this._note = note; this._draw(); this.busy = false;
  }

  // ---------------------------------------------------------------------------
  // DeeSse
  // ---------------------------------------------------------------------------
  _niveaux() {
    const choix = this.P.mg.value, R = +this.P.R.value;
    // En automatique : multigrille complete. Mesure a l'appui (voir la bascule
    // Multigrille de l'atelier), c'est le meilleur reglage sur les trois TI
    // categorielles des que la recherche dans la TI est correcte. Un niveau est
    // ecarte seulement si son gabarit deborde du tiers de la TI, auquel cas il
    // ne pourrait plus etre apparie nulle part.
    const spMax = choix === 'auto' ? 4 : +choix;
    return [4, 2, 1].filter(s => s <= spMax && (R * s + 1) < this.TIN / 3);
  }

  _deesse() {
    const TI = this.TI, TIN = this.TIN, SN = this.SN, cont = this.continuous;
    const R = +this.P.R.value, N = +this.P.n.value, THRESH = +this.P.t.value;
    const frac = +this.P.f.value / 100, levels = this._niveaux();

    const tmpl = [];
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const d2 = dx * dx + dy * dy; if (d2 > 0 && d2 <= R * R) tmpl.push({ dx, dy, d2, w: 1 / Math.sqrt(d2) }); }
    tmpl.sort((a, b) => a.d2 - b.d2);

    let s = (this.seed * 2654435761) >>> 0;
    const rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };

    const sim = new Float32Array(SN * SN).fill(-1);
    const ordre = new Int32Array(SN * SN), bornes = new Int32Array(SN * SN);
    const srcA = new Int16Array(SN * SN * 4), dstA = new Int16Array(SN * SN * 4);
    let ng = 0, comparaisons = 0, exacts = 0, plafonne = false;

    const ndx = new Int32Array(N), ndy = new Int32Array(N), nv = new Float32Array(N), nw = new Float32Array(N);

    for (const sp of levels) {
      const margin = R * sp + 1, span = TIN - 2 * margin;
      if (span < 4) continue;
      const tot = span * span;
      // Plafond de travail : sans lui, une grande TI continue fait exploser le
      // temps de calcul (aucun candidat n'est jamais accepte, donc le budget est
      // consomme en entier a chaque noeud).
      let nNoeuds = 0;
      for (let j = 0; j < SN; j += sp) for (let i = 0; i < SN; i += sp) if (sim[j * SN + i] < 0) nNoeuds++;
      const parNoeud = Math.max(400, Math.floor(PLAFOND_VISITES / Math.max(1, nNoeuds)));
      const budget = Math.max(200, Math.min(Math.floor(frac * tot), parNoeud));
      if (budget < Math.floor(frac * tot)) plafonne = true;

      const nodes = [];
      for (let j = 0; j < SN; j += sp) for (let i = 0; i < SN; i += sp) { const idx = j * SN + i; if (sim[idx] < 0) nodes.push(idx); }
      for (let k = nodes.length - 1; k > 0; k--) { const j = (rng() * (k + 1)) | 0; const t = nodes[k]; nodes[k] = nodes[j]; nodes[j] = t; }

      for (const idx of nodes) {
        const ci = idx % SN, cj = (idx / SN) | 0;
        let nnb = 0, wtot = 0;
        for (let q = 0; q < tmpl.length && nnb < N; q++) {
          const o = tmpl[q], ni = ci + o.dx * sp, nj = cj + o.dy * sp;
          if (ni < 0 || ni >= SN || nj < 0 || nj >= SN) continue;
          const sv = sim[nj * SN + ni];
          if (sv >= 0) { ndx[nnb] = o.dx * sp; ndy[nnb] = o.dy * sp; nv[nnb] = sv; nw[nnb] = o.w; wtot += o.w; nnb++; }
        }

        let tx, ty;
        if (nnb === 0) { tx = margin + ((rng() * span) | 0); ty = margin + ((rng() * span) | 0); }
        else {
          const plafond = THRESH * wtot;
          // Chemin aléatoire DANS LA TI : départ au hasard, pas premier avec le
          // nombre de positions -> chaque emplacement est visité une fois et une
          // seule, sans mémoire ni mélange préalable.
          let pas = 1 + ((rng() * (tot - 1)) | 0);
          while (pgcd(pas, tot) !== 1) pas = pas % (tot - 1) + 1;
          let p = (rng() * tot) | 0;
          let best = Infinity, bx = margin, by = margin;
          for (let sc = 0; sc < budget; sc++) {
            const cx = margin + p % span, cy = margin + ((p / span) | 0);
            p += pas; if (p >= tot) p -= tot;
            // Abandon précoce : dès que la distance partielle atteint le meilleur
            // score connu, ce candidat ne peut plus ni gagner ni passer le seuil.
            let mis = 0, k = 0;
            for (; k < nnb; k++) {
              const tv = TI[(cy + ndy[k]) * TIN + (cx + ndx[k])];
              mis += nw[k] * (cont ? (tv - nv[k]) * (tv - nv[k]) : (tv !== nv[k] ? 1 : 0));
              if (mis >= best) { k++; break; }
            }
            comparaisons += k;
            if (k === nnb && mis < best) {
              best = mis; bx = cx; by = cy;
              if (mis <= plafond) { exacts++; break; }
            }
          }
          tx = bx; ty = by;
        }
        sim[idx] = TI[ty * TIN + tx];
        ordre[ng] = idx; bornes[ng] = ng + 1;
        srcA[4 * ng] = tx - R * sp; srcA[4 * ng + 1] = ty - R * sp; srcA[4 * ng + 2] = 2 * R * sp; srcA[4 * ng + 3] = 2 * R * sp;
        dstA[4 * ng] = ci - sp; dstA[4 * ng + 1] = cj - sp; dstA[4 * ng + 2] = 2 * sp; dstA[4 * ng + 3] = 2 * sp;
        ng++;
      }
    }
    this.fac = sim; this.ordre = ordre; this.bornes = bornes; this.ng = ng; this.srcA = srcA; this.dstA = dstA;
    return { comparaisons, exacts, noeuds: ng, levels, plafonne };
  }

  // ---------------------------------------------------------------------------
  // FilterSim / quilting
  // ---------------------------------------------------------------------------
  /** Coupe verticale de coût minimal dans une bande h x w (Efros & Freeman). */
  _coupe(cout, h, w) {
    const E = Float64Array.from(cout), back = new Int32Array(h * w);
    for (let i = 1; i < h; i++) for (let j = 0; j < w; j++) {
      let kb = j, vb = E[(i - 1) * w + j];
      if (j > 0 && E[(i - 1) * w + j - 1] < vb) { vb = E[(i - 1) * w + j - 1]; kb = j - 1; }
      if (j < w - 1 && E[(i - 1) * w + j + 1] < vb) { vb = E[(i - 1) * w + j + 1]; kb = j + 1; }
      back[i * w + j] = kb; E[i * w + j] += vb;
    }
    const cut = new Int32Array(h);
    let jb = 0; for (let j = 1; j < w; j++) if (E[(h - 1) * w + j] < E[(h - 1) * w + jb]) jb = j;
    cut[h - 1] = jb;
    for (let i = h - 1; i > 0; i--) cut[i - 1] = back[i * w + cut[i]];
    return cut;
  }

  _filtersim() {
    const TI = this.TI, TIN = this.TIN, SN = this.SN, cont = this.continuous;
    const PS = Math.max(6, Math.min(+this.P.ps.value, (TIN / 3) | 0));
    const OV = Math.max(2, Math.round(PS * (+this.P.ov.value) / 100));
    const stride = Math.max(1, PS - OV), NSCAN = +this.P.ns.value, tol = 1 + (+this.P.tol.value) / 100;
    const mincut = this.P.cut.checked;

    let s = (this.seed * 40503) >>> 0;
    const rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    const sim = new Float32Array(SN * SN).fill(-1);
    const ordre = new Int32Array(SN * SN), bornes = new Int32Array(SN * SN);
    const srcA = new Int16Array(SN * SN * 4), dstA = new Int16Array(SN * SN * 4);
    let ng = 0, nord = 0, comparaisons = 0;
    const err = new Float64Array(NSCAN), ptx = new Int32Array(NSCAN), pty = new Int32Array(NSCAN);

    for (let py = 0; py < SN; py += stride) for (let px = 0; px < SN; px += stride) {
      const hs = Math.min(PS, SN - py), wsz = Math.min(PS, SN - px);
      if (hs < 2 || wsz < 2) continue;
      let aDesVoisins = false;
      for (let dy = 0; dy < hs && !aDesVoisins; dy++) for (let dx = 0; dx < wsz; dx++) {
        if (dx >= OV && dy >= OV) continue;
        if (sim[(py + dy) * SN + px + dx] >= 0) { aDesVoisins = true; break; }
      }
      let btx, bty;
      if (!aDesVoisins) { btx = (rng() * (TIN - PS)) | 0; bty = (rng() * (TIN - PS)) | 0; }
      else {
        let emin = Infinity;
        for (let sc = 0; sc < NSCAN; sc++) {
          const tx = (rng() * (TIN - PS)) | 0, ty = (rng() * (TIN - PS)) | 0;
          let mis = 0, cnt = 0;
          for (let dy = 0; dy < hs; dy++) for (let dx = 0; dx < wsz; dx++) {
            if (dx >= OV && dy >= OV) continue;
            const sv = sim[(py + dy) * SN + px + dx]; if (sv < 0) continue;
            const tv = TI[(ty + dy) * TIN + tx + dx]; cnt++;
            mis += cont ? (tv - sv) * (tv - sv) : (tv !== sv ? 1 : 0);
          }
          comparaisons += cnt;
          const e = cnt ? mis / cnt : 0;
          err[sc] = e; ptx[sc] = tx; pty[sc] = ty; if (e < emin) emin = e;
        }
        const seuil = emin * tol + 1e-9;
        let np = 0; for (let sc = 0; sc < NSCAN; sc++) if (err[sc] <= seuil) np++;
        let pick = (rng() * np) | 0, chosen = 0;
        for (let sc = 0; sc < NSCAN; sc++) if (err[sc] <= seuil) { if (pick-- === 0) { chosen = sc; break; } }
        btx = ptx[chosen]; bty = pty[chosen];
      }

      // Qui garde la main dans le recouvrement ?
      const prendre = new Uint8Array(hs * wsz).fill(1);
      if (mincut && aDesVoisins) {
        const d2 = new Float64Array(hs * wsz);
        for (let dy = 0; dy < hs; dy++) for (let dx = 0; dx < wsz; dx++) {
          const sv = sim[(py + dy) * SN + px + dx];
          const tv = TI[(bty + dy) * TIN + btx + dx];
          d2[dy * wsz + dx] = sv < 0 ? 0 : (tv - sv) * (tv - sv) + (tv !== sv ? 1 : 0);
        }
        if (px > 0 && wsz > OV) {                        // recouvrement à GAUCHE
          const band = new Float64Array(hs * OV);
          for (let i = 0; i < hs; i++) for (let j = 0; j < OV; j++) band[i * OV + j] = d2[i * wsz + j];
          const cut = this._coupe(band, hs, OV);
          for (let i = 0; i < hs; i++) for (let j = 0; j < cut[i]; j++) prendre[i * wsz + j] = 0;
        }
        if (py > 0 && hs > OV) {                         // recouvrement en HAUT
          const band = new Float64Array(wsz * OV);       // transposée
          for (let j = 0; j < wsz; j++) for (let i = 0; i < OV; i++) band[j * OV + i] = d2[i * wsz + j];
          const cut = this._coupe(band, wsz, OV);
          for (let j = 0; j < wsz; j++) for (let i = 0; i < cut[j]; i++) prendre[i * wsz + j] = 0;
        }
      }

      const debut = nord;
      for (let dy = 0; dy < hs; dy++) for (let dx = 0; dx < wsz; dx++) {
        const idx = (py + dy) * SN + px + dx;
        if (sim[idx] < 0 || prendre[dy * wsz + dx]) {
          const neuf = sim[idx] < 0;
          sim[idx] = TI[(bty + dy) * TIN + btx + dx];
          if (neuf) ordre[nord++] = idx;
        }
      }
      if (nord > debut) {
        bornes[ng] = nord;
        srcA[4 * ng] = btx; srcA[4 * ng + 1] = bty; srcA[4 * ng + 2] = wsz; srcA[4 * ng + 3] = hs;
        dstA[4 * ng] = px; dstA[4 * ng + 1] = py; dstA[4 * ng + 2] = wsz; dstA[4 * ng + 3] = hs;
        ng++;
      }
    }
    this.fac = sim; this.ordre = ordre; this.bornes = bornes; this.ng = ng; this.srcA = srcA; this.dstA = dstA;
    return { comparaisons, patchs: ng, PS, OV, mincut };
  }

  // ---------------------------------------------------------------------------
  _blit(cv, data, n) {
    const ctx = cv.getContext('2d'), img = ctx.createImageData(n, n), cont = this.continuous;
    for (let p = 0; p < n * n; p++) {
      const v = data[p]; let c;
      if (v < 0) c = [255, 255, 255];
      else if (cont) { const g = Math.round(255 * (v < 0 ? 0 : v > 1 ? 1 : v)); c = [g, g, g]; }
      else { const k = Math.round(v); c = RGBP[k] || RGBP[k % RGBP.length]; }
      const o = p * 4; img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }

  _togglePlay() {
    if (this.timer || !this.ng) { this._stop(); return; }
    if (this.g >= this.ng) this.g = 0;
    this.playBtn.textContent = '⏸ Pause'; this.playBtn.style.background = '#c0392b';
    const tot = this.ng;
    this.timer = setInterval(() => {
      const rate = 0.02 * parseInt(this.spd.value, 10);
      const base = this.mode === 'deesse' ? Math.max(1, Math.round(tot * 0.0008)) : 1;
      this.g = Math.min(tot, this.g + Math.max(base, Math.ceil(this.g * rate)));
      this._draw(); if (this.g >= tot) this._stop();
    }, 45);
  }
  _stop() { if (this.timer) { clearInterval(this.timer); this.timer = null; } if (this.playBtn) { const done = this.ng && this.g >= this.ng; this.playBtn.textContent = done ? '↻ Rejouer' : '▶ Lancer'; this.playBtn.style.background = '#1f8a4c'; } }

  _draw() {
    if (!this.fac) return;
    const SN = this.SN, disp = new Float32Array(SN * SN).fill(-1);
    const fin = this.g > 0 ? this.bornes[Math.min(this.g, this.ng) - 1] : 0;
    for (let q = 0; q < fin; q++) { const idx = this.ordre[q]; disp[idx] = this.fac[idx]; }
    this._blit(this.simC, disp, SN);
    this._blit(this.tiC, this.TI, this.TIN);
    if (this.g > 0 && this.g <= this.ng) {
      const gi = this.g - 1;
      const tc = this.tiC.getContext('2d'); tc.strokeStyle = '#ff2020'; tc.lineWidth = 1.6;
      tc.strokeRect(this.srcA[4 * gi] + 0.5, this.srcA[4 * gi + 1] + 0.5, this.srcA[4 * gi + 2], this.srcA[4 * gi + 3]);
      const sc = this.simC.getContext('2d'); sc.strokeStyle = '#ff2020'; sc.lineWidth = 1.4;
      sc.strokeRect(this.dstA[4 * gi] + 0.5, this.dstA[4 * gi + 1] + 0.5, this.dstA[4 * gi + 2], this.dstA[4 * gi + 3]);
    }
    const st = this.stat || {}, pct = Math.round(100 * fin / (SN * SN));
    let detail;
    if (this.mode === 'deesse') {
      const ex = st.noeuds ? Math.round(100 * st.exacts / st.noeuds) : 0;
      detail = `DeeSse · multigrille ${(st.levels || []).join('-')} · ${ex} % des nœuds sous le seuil · ` +
               `${(st.comparaisons / 1e6).toFixed(0)} M comparaisons` +
               (st.plafonne ? ' · <span style="color:#b45309">balayage plafonné (temps de calcul)</span>' : '');
    } else {
      detail = `FilterSim · patch ${st.PS} px, recouvrement ${st.OV} px · ${st.patchs} patchs · ` +
               `coupe de moindre erreur ${st.mincut ? 'activée' : 'DÉSACTIVÉE'}`;
    }
    this.infoEl.innerHTML = `<b>${detail}</b><br>TI ${this.TIN}×${this.TIN}, ` +
      `${this.continuous ? 'continue' : this.K + ' faciès'} · grille ${SN}×${SN} · ` +
      `calcul ${(this.ms || 0).toFixed(0)} ms · ${pct} % rempli${this._note || ''}`;
  }

  cleanup() { this._stop(); }
}

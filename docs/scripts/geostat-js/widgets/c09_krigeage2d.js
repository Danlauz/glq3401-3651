// scripts/geostat-js/widgets/c09_krigeage2d.js
// -----------------------------------------------------------------------------
// Vue 2D partagée par les quatre ateliers de krigeage (KS, KO, KU, KED).
//
// Chaque atelier garde sa vue 1D — celle où l'on LIT le système : les données
// alignées, les poids, la bande ±2σ. La vue 2D montre ce que le profil ne peut
// pas montrer :
//   - la carte d'estimation et la carte de variance de krigeage côte à côte
//     (la variance ne dépend PAS des valeurs, seulement de la géométrie) ;
//   - l'anisotropie, avec l'ellipse des portées superposée à la cible ;
//   - le déclustering : plusieurs données serrées ne pèsent pas plus qu'une.
//
// Interaction : on déplace la cible à la souris sur la carte de gauche, on
// retire une donnée en cliquant dessus, et le mode « + donnée » ajoute un point
// dont la valeur est tirée CONDITIONNELLEMENT (Z* ± σ_K·N(0,1)) — la donnée
// ajoutée reste donc cohérente avec le modèle affiché.
//
// Calcul : gpoly.krigeageGrille2D (système augmenté factorisé une seule fois,
// toutes les cibles de la grille d'un coup). Aucun calcul géostatistique en JS.
// -----------------------------------------------------------------------------

import { gpoly } from '../pyodide_setup.js';

export const N_GRILLE = 64;     // 64 x 64 = 4096 nœuds
export const ETENDUE = 100;     // le domaine est [0, 100] x [0, 100]

const TURBO = [
  [0.0, 'rgb(48,18,59)'], [0.1, 'rgb(65,69,171)'], [0.2, 'rgb(57,118,233)'],
  [0.3, 'rgb(33,161,238)'], [0.4, 'rgb(26,199,194)'], [0.5, 'rgb(76,221,142)'],
  [0.6, 'rgb(150,233,89)'], [0.7, 'rgb(212,225,55)'], [0.8, 'rgb(248,186,56)'],
  [0.9, 'rgb(242,124,36)'], [1.0, 'rgb(122,4,3)'],
];

// Variance de krigeage : pâle là où l'on sait (aux données), sombre là où l'on
// ne sait pas. L'échelle est écrite en clair — le « YlOrRd » de Plotly est
// orienté dans l'autre sens et donnerait des taches sombres SUR les données.
const CHALEUR = [
  [0.0, '#ffffd4'], [0.25, '#fee391'], [0.5, '#fe9929'],
  [0.75, '#d95f0e'], [1.0, '#7f2704'],
];

const AXE_CARTE = {
  range: [0, ETENDUE], constrain: 'domain', zeroline: false,
  showgrid: false, ticks: 'outside', tickfont: { size: 9 },
};

/** Grille régulière des nœuds de la carte : coordonnées et liste aplatie. */
function construireGrille() {
  const pas = ETENDUE / (N_GRILLE - 1);
  const axe = [];
  for (let i = 0; i < N_GRILLE; i++) axe.push(+(i * pas).toFixed(6));
  const plates = new Float64Array(2 * N_GRILLE * N_GRILLE);
  let k = 0;
  for (let j = 0; j < N_GRILLE; j++) {
    for (let i = 0; i < N_GRILLE; i++) { plates[k++] = axe[i]; plates[k++] = axe[j]; }
  }
  return { axe, plates };
}

/** Aplati (m,) -> matrice de lignes y pour Plotly. */
function enMatrice(plat) {
  const z = [];
  for (let j = 0; j < N_GRILLE; j++) z.push(Array.from(plat.slice(j * N_GRILLE, (j + 1) * N_GRILLE)));
  return z;
}

/**
 * Ellipse d'anisotropie : demi-axe ag dans la direction theta (degrés,
 * sens trigonométrique depuis +x — c'est la convention du modèle, où la
 * PREMIÈRE portée est celle de l'axe orienté par l'angle), demi-axe ap
 * perpendiculaire.
 */
function ellipse(cx, cy, ag, ap, thetaDeg, nb = 96) {
  const t0 = thetaDeg * Math.PI / 180;
  const ct = Math.cos(t0), st = Math.sin(t0);
  const x = [], y = [];
  for (let k = 0; k <= nb; k++) {
    const t = 2 * Math.PI * k / nb;
    const u = ag * Math.cos(t), v = ap * Math.sin(t);
    x.push(cx + u * ct - v * st);
    y.push(cy + u * st + v * ct);
  }
  return { x, y };
}

/** Boîte de contrôles propre à la 2D (portées, angle) + boutons. */
function htmlControles(cfg) {
  return `
    <div class="gw-controls k2-row" style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;padding:6px 12px;background:#f3f7fb;border:1px solid #cfe0ee;border-radius:8px;font-size:.82rem;margin-bottom:6px;">
      <b style="font-size:.78rem;color:#555;">Anisotropie</b>
      <label>Portée majeure <span>a<sub>g</sub></span> <input type="range" class="js-ag" min="5" max="70" value="45" step="1" style="width:100px"><span class="js-agv">45</span></label>
      <label>Portée mineure <span>a<sub>p</sub></span> <input type="range" class="js-ap" min="3" max="70" value="22" step="1" style="width:100px"><span class="js-apv">22</span></label>
      <label>Angle <span>&theta;</span> <input type="range" class="js-ang" min="0" max="175" value="30" step="5" style="width:100px"><span class="js-angv">30</span>&deg;</label>
    </div>
    <div class="gw-controls k2-row" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:6px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;margin-bottom:6px;">
      <button class="js-ajout" type="button" style="font-size:.78rem;padding:4px 10px;background:#1f8a4c;color:#fff;border:none;border-radius:5px;cursor:pointer;">+ donnée</button>
      <button class="js-ell" type="button" style="font-size:.78rem;padding:4px 10px;background:#3a3632;color:#fff;border:none;border-radius:5px;cursor:pointer;">Masquer l'ellipse</button>
      ${cfg.boutonsSup || ''}
      <button class="js-reset2" type="button" style="font-size:.76rem;padding:4px 9px;background:#c0392b;color:#fff;border:none;border-radius:4px;cursor:pointer;">Réinitialiser</button>
    </div>`;
}

export class Vue2D {
  /**
   * @param {object} cfg
   *   hote        : le widget appelant (pour this.on / afficherAvertissement)
   *   methode     : 'simple' | 'ordinaire' | 'universel' | 'derive_externe'
   *   sigle       : 'KS' | 'KO' | 'KU' | 'KED'
   *   lireParams  : () => ({ mod, palier, pepite, moyenne, ordre })
   *   donneesInit : () => [{ x, y, z }]
   *   secondaire  : (x, y) => s          (KED uniquement)
   *   boutonsSup  : HTML de boutons supplémentaires (optionnel)
   *   legende     : texte sous les cartes (optionnel)
   */
  constructor(cfg) {
    this.cfg = cfg;
    this.hote = cfg.hote;
    this.donnees = cfg.donneesInit();
    this.cible = { x: 50, y: 50 };
    this.montreEllipse = true;
    this.modeAjout = false;
    this.grille = construireGrille();
    this.cache = null;
    this._enVol = false;
    this._enAttente = null;
  }

  // ---------------------------------------------------------------------------
  // Montage
  // ---------------------------------------------------------------------------
  monter(conteneur) {
    this.el = conteneur;
    conteneur.insertAdjacentHTML('beforeend', `
      <style>
        .k2-row label { display:inline-flex !important; flex-direction:row !important; align-items:center; gap:5px; }
        .k2-row label span { display:inline; }
      </style>
      ${htmlControles(this.cfg)}
      <div class="k2-cartes" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:start;">
        <div class="js-carte-est" style="aspect-ratio:1.24;min-height:300px;cursor:crosshair;touch-action:none;"></div>
        <div class="js-carte-var" style="aspect-ratio:1.24;min-height:300px;"></div>
      </div>
      <div class="js-info2" style="padding:.4rem 1rem;font-family:'JetBrains Mono',monospace;font-size:.82rem;color:#444;text-align:center;background:#f0f0f0;border-radius:6px;margin-top:4px;">—</div>
      <p style="margin:4px 1rem;font-size:11px;color:#666;">
        <b>Glissez</b> la croix rouge sur la carte de gauche pour déplacer le point à estimer ·
        cliquez une donnée pour la <b>retirer</b> · le bouton <b>+ donnée</b> arme l'ajout d'un point
        (sa valeur est tirée conditionnellement, Z* ± σ<sub>K</sub>).
        ${this.cfg.legende || ''}</p>
    `);

    this.carteEst = conteneur.querySelector('.js-carte-est');
    this.carteVar = conteneur.querySelector('.js-carte-var');
    this.info2 = conteneur.querySelector('.js-info2');
    this.ctrl2 = {
      ag:  conteneur.querySelector('.js-ag'),
      ap:  conteneur.querySelector('.js-ap'),
      ang: conteneur.querySelector('.js-ang'),
    };

    const h = this.hote;
    for (const k of ['ag', 'ap', 'ang']) {
      h.on(this.ctrl2[k], 'input', e => {
        conteneur.querySelector(`.js-${k}v`).textContent = e.target.value;
        this._planifierRecalcul();
      });
    }
    h.on(conteneur.querySelector('.js-ell'), 'click', e => {
      this.montreEllipse = !this.montreEllipse;
      e.target.textContent = this.montreEllipse ? "Masquer l'ellipse" : "Afficher l'ellipse";
      e.target.style.background = this.montreEllipse ? '#3a3632' : '#6b7d8f';
      this._dessiner();
    });
    h.on(conteneur.querySelector('.js-ajout'), 'click', e => {
      this.modeAjout = !this.modeAjout;
      e.target.textContent = this.modeAjout ? 'Cliquez la carte…' : '+ donnée';
      e.target.style.background = this.modeAjout ? '#c0392b' : '#1f8a4c';
      this.carteEst.style.cursor = this.modeAjout ? 'copy' : 'crosshair';
    });
    h.on(conteneur.querySelector('.js-reset2'), 'click', () => {
      this.donnees = this.cfg.donneesInit();
      this.cible = { x: 50, y: 50 };
      this.recalculer();
    });

    h.on(this.carteEst, 'pointerdown', e => this._pointerDown(e));
    h.on(this.carteEst, 'pointermove', e => this._pointerMove(e));
    h.on(this.carteEst, 'pointerup', e => this._pointerUp(e));
    h.on(this.carteEst, 'pointercancel', () => { this._glisse = false; });
  }

  // ---------------------------------------------------------------------------
  // Souris
  // ---------------------------------------------------------------------------
  _coords(e) {
    const fl = this.carteEst._fullLayout;
    if (!fl || !fl.xaxis || !fl.yaxis) return null;
    const rect = this.carteEst.getBoundingClientRect();
    const xp = e.clientX - rect.left - fl.xaxis._offset;
    const yp = e.clientY - rect.top - fl.yaxis._offset;
    if (xp < 0 || xp > fl.xaxis._length || yp < 0 || yp > fl.yaxis._length) return null;
    const x = fl.xaxis.p2d(xp), y = fl.yaxis.p2d(yp);
    if (x < 0 || x > ETENDUE || y < 0 || y > ETENDUE) return null;
    return { x, y };
  }

  /** Nombre minimal de données (constante ou fonction des paramètres courants). */
  _nMin() {
    return typeof this.cfg.nMin === 'function' ? this.cfg.nMin() : this.cfg.nMin;
  }

  /** Indice de la donnée sous le curseur, ou -1. */
  _donneeSous(p) {
    let best = -1, bd = 0.028;
    this.donnees.forEach((d, i) => {
      const dist = Math.hypot((d.x - p.x) / ETENDUE, (d.y - p.y) / ETENDUE);
      if (dist < bd) { bd = dist; best = i; }
    });
    return best;
  }

  _pointerDown(e) {
    const p = this._coords(e);
    if (!p) return;
    if (this.modeAjout) {
      this._ajouterDonnee(p);
      return;
    }
    const i = this._donneeSous(p);
    if (i >= 0 && this.donnees.length > this._nMin()) {
      this.donnees.splice(i, 1);
      this.recalculer();
      return;
    }
    this._glisse = true;
    try { this.carteEst.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    this._majCible(p.x, p.y);
  }

  _pointerMove(e) {
    if (!this._glisse) return;
    const p = this._coords(e);
    if (p) this._majCible(p.x, p.y);
  }

  _pointerUp(e) {
    if (!this._glisse) return;
    this._glisse = false;
    try { this.carteEst.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  }

  /** Déplacement de la cible : un calcul à la fois, le dernier point gagne. */
  async _majCible(x, y) {
    this.cible = { x, y };
    if (this._enVol) { this._enAttente = [x, y]; return; }
    this._enVol = true;
    try { await this._calculerCible(); } finally { this._enVol = false; }
    if (this._enAttente) {
      const [a, b] = this._enAttente;
      this._enAttente = null;
      this._majCible(a, b);
    }
  }

  /** Ajout d'un point dont la valeur est une SIMULATION conditionnelle locale. */
  async _ajouterDonnee(p) {
    const r = await this._krigerPoints([[p.x, p.y]]);
    let z;
    if (r) {
      const sigma = Math.sqrt(Math.max(0, r.variances[0]));
      // Box-Muller : un tirage normal centré réduit.
      const u = Math.max(1e-12, Math.random());
      const g = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random());
      z = r.estimations[0] + sigma * g;
    } else {
      const zs = this.donnees.map(d => d.z);
      z = zs.length ? zs.reduce((s, v) => s + v, 0) / zs.length : 0;
    }
    this.donnees.push({ x: +p.x.toFixed(1), y: +p.y.toFixed(1), z: +z.toFixed(2) });
    this.recalculer();
  }

  // ---------------------------------------------------------------------------
  // Calcul
  // ---------------------------------------------------------------------------
  _structures() {
    const prm = this.cfg.lireParams();
    const ag = parseFloat(this.ctrl2.ag.value);
    const ap = parseFloat(this.ctrl2.ap.value);
    const ang = parseFloat(this.ctrl2.ang.value);
    return {
      prm, ag, ap, ang,
      structs: [{ modele: prm.mod, palier: Math.max(0.001, prm.palier),
                  portee: [ag, ap], angle: ang }],
    };
  }

  /**
   * Krige une liste de cibles. `cibles` est soit [[x, y], ...] pour quelques
   * points, soit la chaine 'grille' pour toute la carte — auquel cas on envoie
   * le tableau PLAT pre-calcule, bien plus rapide a convertir vers Python.
   */
  async _krigerPoints(cibles) {
    const { prm, structs } = this._structures();
    if (this.donnees.length < this._nMin()) return null;
    const xy = this.donnees.map(d => [d.x, d.y]);
    const zd = this.donnees.map(d => d.z);
    const sec = this.cfg.secondaire || null;
    const surGrille = cibles === 'grille';
    let secCible = null;
    if (sec) {
      if (surGrille) {
        if (!this._secGrille) {
          const p = this.grille.plates;
          this._secGrille = new Float64Array(p.length / 2);
          for (let i = 0; i < this._secGrille.length; i++) {
            this._secGrille[i] = sec(p[2 * i], p[2 * i + 1]);
          }
        }
        secCible = this._secGrille;
      } else {
        secCible = cibles.map(c => sec(c[0], c[1]));
      }
    }
    try {
      return await gpoly.krigeageGrille2D(
        xy, zd, surGrille ? null : cibles, structs, prm.pepite, this.cfg.methode,
        prm.moyenne ?? 0, prm.ordre ?? 1,
        sec ? this.donnees.map(d => sec(d.x, d.y)) : null, secCible,
        surGrille ? this.grille.plates : null, 2);
    } catch (e) {
      this.hote.afficherAvertissement('Erreur krigeage 2D : ' + e.message);
      return null;
    }
  }

  _planifierRecalcul() {
    clearTimeout(this._tRecalc);
    this._tRecalc = setTimeout(() => this.recalculer(), 180);
  }

  /** Recalcule les deux cartes (appelé quand un paramètre ou les données changent). */
  async recalculer() {
    if (!this.el) return;
    const r = await this._krigerPoints('grille');
    if (!r) {
      this.cache = null;
      this.info2.innerHTML = `<b>Pas assez de données</b> — ${this.cfg.sigle} en requiert au moins ${this._nMin()}.`;
      this._dessiner();
      return;
    }
    let zmin = Infinity, zmax = -Infinity;
    for (const v of r.estimations) { if (v < zmin) zmin = v; if (v > zmax) zmax = v; }
    this.cache = { est: r.estimations, vari: r.variances, sv: r.sv, zmin, zmax };
    await this._calculerCible();
  }

  /** Recalcule le seul point cible, puis redessine. */
  async _calculerCible() {
    if (this.cache) {
      const r = await this._krigerPoints([[this.cible.x, this.cible.y]]);
      this.pointCible = r ? { z: r.estimations[0], v: r.variances[0] } : null;
    } else {
      this.pointCible = null;
    }
    this._dessiner();
  }

  // ---------------------------------------------------------------------------
  // Dessin
  // ---------------------------------------------------------------------------
  _dessiner() {
    if (!window.Plotly || !this.el) return;
    const { ag, ap, ang, prm } = this._structures();
    const axe = this.grille.axe;
    const c = this.cache;

    // --- Traces réutilisées telles quelles : Plotly.react saute leur rendu.
    // On ne reconstruit les deux heatmaps QUE si les tableaux ont changé, donc
    // pas pendant un glissement de la cible (où seules la croix et l'ellipse
    // bougent) : le redessin reste fluide.
    if (c && this._fondCourant !== c.est) {
      this._fondCourant = c.est;
      this._heatEst = { x: axe, y: axe, z: enMatrice(c.est), type: 'heatmap',
        colorscale: TURBO, zsmooth: 'best', hoverinfo: 'skip',
        colorbar: { len: 0.92, thickness: 10, x: 1.0, xanchor: 'left',
                    title: { text: 'Z*', side: 'right', font: { size: 10 } },
                    tickfont: { size: 8 } } };
      this._heatVar = { x: axe, y: axe, z: enMatrice(c.vari), type: 'heatmap',
        colorscale: CHALEUR, zsmooth: 'best', hoverinfo: 'skip',
        colorbar: { len: 0.92, thickness: 10, x: 1.0, xanchor: 'left',
                    title: { text: 'σ²', side: 'right', font: { size: 10 } },
                    tickfont: { size: 8 } } };
    }

    const dx = this.donnees.map(d => d.x), dy = this.donnees.map(d => d.y);
    const pointsEst = { x: dx, y: dy, mode: 'markers', type: 'scatter',
      name: 'Données', showlegend: false,
      text: this.donnees.map(d => d.z.toFixed(2)),
      hovertemplate: 'x=%{x:.1f}, y=%{y:.1f}<br>Z=%{text}<extra></extra>',
      marker: { color: this.donnees.map(d => d.z), colorscale: TURBO,
                cmin: c ? c.zmin : undefined, cmax: c ? c.zmax : undefined,
                size: 11, line: { color: '#fff', width: 1.8 } } };
    const pointsVar = { x: dx, y: dy, mode: 'markers', type: 'scatter',
      showlegend: false, hoverinfo: 'skip',
      marker: { color: '#222', size: 6, line: { color: '#fff', width: 1.2 } } };

    const croix = () => [
      { x: [this.cible.x], y: [this.cible.y], mode: 'markers', type: 'scatter',
        showlegend: false, hoverinfo: 'skip',
        marker: { color: 'rgba(0,0,0,0)', size: 21, symbol: 'x-thin',
                  line: { color: '#ffffff', width: 5 } } },
      { x: [this.cible.x], y: [this.cible.y], mode: 'markers', type: 'scatter',
        showlegend: false, hoverinfo: 'skip',
        marker: { color: 'rgba(0,0,0,0)', size: 21, symbol: 'x-thin',
                  line: { color: '#d81b1b', width: 2.6 } } },
    ];

    const tracesEst = [];
    if (this._heatEst && c) tracesEst.push(this._heatEst);
    if (this.cfg.contoursSecondaire && this.cfg.secondaire) {
      tracesEst.push(this._contoursSecondaire(axe));
    }
    tracesEst.push(pointsEst);
    if (this.montreEllipse) {
      const e = ellipse(this.cible.x, this.cible.y, ag, ap, ang);
      tracesEst.push({ x: e.x, y: e.y, mode: 'lines', type: 'scatter',
        showlegend: false, hoverinfo: 'skip',
        line: { color: 'rgba(20,20,20,0.60)', width: 3.4 } });
      tracesEst.push({ x: e.x, y: e.y, mode: 'lines', type: 'scatter',
        showlegend: false, hoverinfo: 'skip',
        line: { color: '#ffffff', width: 1.6, dash: 'dash' } });
    }
    tracesEst.push(...croix());

    const commun = { displaylogo: false, responsive: true, displayModeBar: false };
    Plotly.react(this.carteEst, tracesEst, {
      margin: { t: 26, l: 34, r: 52, b: 30 }, dragmode: false,
      title: { text: `Estimation Z* (${this.cfg.sigle})`, font: { size: 12 } },
      xaxis: { ...AXE_CARTE, fixedrange: true },
      yaxis: { ...AXE_CARTE, fixedrange: true, scaleanchor: 'x' },
    }, commun);

    const tracesVar = [];
    if (this._heatVar && c) tracesVar.push(this._heatVar);
    tracesVar.push(pointsVar, ...croix());
    Plotly.react(this.carteVar, tracesVar, {
      margin: { t: 26, l: 34, r: 56, b: 30 }, dragmode: false,
      title: { text: 'Variance de krigeage σ²', font: { size: 12 } },
      xaxis: { ...AXE_CARTE, fixedrange: true },
      yaxis: { ...AXE_CARTE, fixedrange: true, scaleanchor: 'x' },
    }, commun);

    this._ecrireInfo(prm, ag, ap, ang);
  }

  _contoursSecondaire(axe) {
    if (!this._contS) {
      const s = this.cfg.secondaire;
      const z = [];
      for (const y of axe) z.push(axe.map(x => s(x, y)));
      this._contS = { x: axe, y: axe, z, type: 'contour', showscale: false,
        hoverinfo: 'skip', contours: { coloring: 'lines' },
        line: { color: 'rgba(255,255,255,0.75)', width: 1.1 },
        colorscale: [[0, 'rgba(255,255,255,0.75)'], [1, 'rgba(255,255,255,0.75)']] };
    }
    return this._contS;
  }

  _ecrireInfo(prm, ag, ap, ang) {
    if (!this.cache || !this.pointCible) return;
    const { z, v } = this.pointCible;
    const rap = ap > 0 ? (ag / ap) : 1;
    let html = `Cible (${this.cible.x.toFixed(1)} ; ${this.cible.y.toFixed(1)}) · ` +
      `Z*<sub>${this.cfg.sigle}</sub> = <b>${z.toFixed(3)}</b> · ` +
      `&sigma;&sup2;<sub>K</sub> = <b>${v.toFixed(4)}</b> (&sigma;<sub>K</sub> = ${Math.sqrt(Math.max(0, v)).toFixed(3)})`;
    if (this.cfg.secondaire) html += ` · s = ${this.cfg.secondaire(this.cible.x, this.cible.y).toFixed(2)}`;
    html += `<br><span style="font-size:.78rem">${this.donnees.length} données · ` +
      `anisotropie ${ag} / ${ap} (rapport ${rap.toFixed(1)}) à ${ang}&deg; · ` +
      `C(0) = ${(prm.palier + prm.pepite).toFixed(2)}</span>`;
    this.info2.innerHTML = html;
  }

  detruire() {
    clearTimeout(this._tRecalc);
    if (window.Plotly) {
      if (this.carteEst) Plotly.purge(this.carteEst);
      if (this.carteVar) Plotly.purge(this.carteVar);
    }
  }
}

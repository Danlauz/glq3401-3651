// scripts/geostat-js/widgets/c09_ajouter_forage.js
// -----------------------------------------------------------------------------
// Widget — Valeur de l'information : ajouter/retirer un forage interactif.
//
// L'utilisateur clique sur une carte 2D pour ajouter ou retirer des forages.
// La carte d'estimation Z* et la carte de variance sigma^2_K se mettent
// a jour en temps reel. On affiche aussi la VARIANCE MOYENNE de krigeage
// sur la grille : decroit a chaque ajout, augmente a chaque retrait.
//
// Pedagogie : montre la "valeur d'information" de chaque forage et le
// principe d'echantillonnage informatif.
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

const debounce = (fn, ms = 200) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

export default class C09AjouterForage extends Widget {
  render() {
    // Champ verite cache : on simule un champ une fois, puis on echantillonne
    // a chaque clic. Au depart : aucun forage.
    this.donnees = []; // [{x, y, z}]
    this.seedChamp = 13;
    this.N = 30;          // grille N x N (cible du krigeage)
    this.champVrai = null; // sera rempli a l'init

    this.el.insertAdjacentHTML('beforeend', `
      <div class="gw-controls" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;">
        <label>Modèle <select class="js-mod">
          <option value="spherique">Sphérique</option><option value="exponentiel">Exponentiel</option><option value="gaussien">Gaussien</option>
        </select></label>
        <label>Portée a <input type="range" class="js-a" min="3" max="15" value="6" step="1" style="width:120px"><span class="js-av">6</span></label>
        <label>Mode
          <select class="js-mode">
            <option value="ajouter">Cliquer = AJOUTER</option>
            <option value="retirer">Cliquer = RETIRER</option>
          </select></label>
        <button class="js-reset" type="button" style="font-size:.76rem;padding:3px 8px;background:#c44;color:#fff;border:none;border-radius:4px;cursor:pointer;">Reset (0 forage)</button>
        <button class="js-nouv-champ" type="button" style="font-size:.76rem;padding:3px 8px;background:#3a3632;color:#fff;border:none;border-radius:4px;cursor:pointer;">Nouveau champ caché</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:6px;">
        <div class="js-plot-vrai" style="height:340px;cursor:crosshair;"></div>
        <div class="js-plot-est" style="height:340px;"></div>
        <div class="js-plot-var" style="height:340px;"></div>
      </div>
      <div class="js-info" style="padding:.5rem 1rem;font-family:'JetBrains Mono',monospace;font-size:.85rem;color:#444;text-align:center;background:#eef2e8;border:1px solid #b8c8a8;border-radius:6px;margin-top:4px;">—</div>
      <p style="margin:4px 1rem;font-size:11px;color:#666;">
        <b>Cliquez sur la carte "Vérité"</b> pour placer ou retirer un forage. La variance moyenne σ̄²_K décroît
        rapidement avec les premiers forages, puis la décroissance ralentit (effet d'écran). Concept clé en
        planification de campagne d'exploration.</p>
    `);

    this.plotVrai = this.el.querySelector('.js-plot-vrai');
    this.plotEst = this.el.querySelector('.js-plot-est');
    this.plotVar = this.el.querySelector('.js-plot-var');
    this.infoEl = this.el.querySelector('.js-info');
    this.ctrl = {
      mod: this.el.querySelector('.js-mod'),
      a:   this.el.querySelector('.js-a'),
      mode: this.el.querySelector('.js-mode'),
    };
    this.varianceHistorique = []; // pour tracer la decroissance

    // Listeners
    const update = debounce(() => this.kriger(), 250);
    for (const [k, el] of Object.entries(this.ctrl)) {
      this.on(el, 'input', e => {
        const s = this.el.querySelector(`.js-${k}v`);
        if (s) s.textContent = e.target.value;
      });
      if (k === 'mode') this.on(el, 'change', () => {/* no krigeage update */});
      else { this.on(el, 'input', update); this.on(el, 'change', update); }
    }
    this.on(this.el.querySelector('.js-reset'), 'click', () => {
      this.donnees = []; this.varianceHistorique = []; this.kriger();
    });
    this.on(this.el.querySelector('.js-nouv-champ'), 'click', () => {
      this.seedChamp++; this.donnees = []; this.varianceHistorique = [];
      this.regenererChamp();
    });
    // Click handler ajoute dans plotly_click apres le premier render
    afficherChargementJusquaPret(this.el).then(() => this.regenererChamp());
  }

  async regenererChamp() {
    const mod = this.ctrl.mod.value;
    const a = parseFloat(this.ctrl.a.value);
    try {
      // Simulation du champ "vérité" avec moyenne 5 et variance 1
      this.champVrai = await gpoly.simulerChamp(mod, a, 0, this.seedChamp, this.N,
                                                 'gaussien', 5.0, 1.0);
    } catch (e) { this.afficherAvertissement('Erreur simulation : ' + e.message); return; }
    this.kriger();
  }

  async kriger() {
    if (!this.champVrai) return;
    const mod = this.ctrl.mod.value;
    const a = parseFloat(this.ctrl.a.value);
    const N = this.N;

    // Si pas de forage : pas de krigeage, juste afficher la verite + variance theorique
    let Z_est = new Array(N * N).fill(NaN);
    let S2 = new Array(N * N).fill(1.0); // sigma2_K = palier si pas de donnees
    if (this.donnees.length >= 2) {
      const xd = this.donnees.map(d => [d.x, d.y]);
      const zd = this.donnees.map(d => d.z);
      const cibles = [];
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) cibles.push([i, j]);
      try {
        const r = await gpoly.krigeageOrdinaire(xd, zd, cibles,
          [{ modele: mod, palier: 1.0, portee: a }], 0.0);
        Z_est = r.estimations;
        S2 = r.variances;
      } catch (e) { this.afficherAvertissement('Erreur krigeage : ' + e.message); return; }
    }

    // Statistiques
    const validVars = S2.filter(v => isFinite(v) && v >= 0);
    const meanVar = validVars.length ? validVars.reduce((s,v)=>s+v,0) / validVars.length : 1.0;
    this.varianceHistorique.push({ n: this.donnees.length, var: meanVar });

    // Reshape
    const reshape = (flat) => { const M=[]; for (let j=0; j<N; j++) { const r=[]; for (let i=0; i<N; i++) r.push(flat[j*N+i]); M.push(r); } return M; };

    if (!window.Plotly) { this.afficherAvertissement('Plotly non chargé.'); return; }

    const allZ = [...this.champVrai];
    if (this.donnees.length >= 2) allZ.push(...Z_est.filter(v => isFinite(v)));
    const zMin = Math.min(...allZ), zMax = Math.max(...allZ);

    const layoutCommon = (title) => ({
      margin: { t: 35, l: 30, r: 50, b: 30 },
      xaxis: { range: [-0.5, N-0.5], showticklabels: false, scaleanchor: 'y' },
      yaxis: { range: [-0.5, N-0.5], showticklabels: false, autorange: 'reversed' },
      title: { text: title, font: { size: 12 } },
    });

    const ptsMark = {
      x: this.donnees.map(d => d.x), y: this.donnees.map(d => d.y),
      mode: 'markers',
      marker: { color: '#fff', size: 9, symbol: 'circle',
                 line: { color: '#000', width: 1.5 } },
      showlegend: false, hoverinfo: 'text',
      text: this.donnees.map(d => `Z = ${d.z.toFixed(2)}`),
    };

    // Carte VERITE (cliquable)
    Plotly.react(this.plotVrai, [
      { type: 'heatmap', z: reshape(Array.from(this.champVrai)),
        colorscale: 'Turbo', zmin: zMin, zmax: zMax,
        colorbar: { thickness: 10 } },
      ptsMark,
    ], layoutCommon(`Vérité (champ caché) · n = ${this.donnees.length} forages`),
    { displaylogo: false, responsive: true });

    // Carte ESTIMATION
    Plotly.react(this.plotEst, [
      { type: 'heatmap', z: reshape(Z_est),
        colorscale: 'Turbo', zmin: zMin, zmax: zMax,
        colorbar: { thickness: 10 } },
      ptsMark,
    ], layoutCommon(this.donnees.length >= 2 ? 'Z* (krigeage)' : 'Z* (≥ 2 forages requis)'),
    { displaylogo: false, responsive: true });

    // Carte VARIANCE
    Plotly.react(this.plotVar, [
      { type: 'heatmap', z: reshape(S2.map(v => Math.max(0, v))),
        colorscale: 'Hot', zmin: 0, zmax: 1.05,
        colorbar: { thickness: 10 } },
      ptsMark,
    ], layoutCommon(`σ²_K (variance de krigeage) · σ̄² = ${meanVar.toFixed(3)}`),
    { displaylogo: false, responsive: true });

    // Brancher le click sur la carte vérité
    this.plotVrai.on('plotly_click', (data) => this.onClick(data));

    // Texte info
    let infoTxt = `<b>${this.donnees.length}</b> forage(s) · σ̄²_K = <b>${meanVar.toFixed(4)}</b>`;
    if (this.varianceHistorique.length >= 2) {
      const v0 = this.varianceHistorique[0].var;
      const reduction = 100 * (1 - meanVar / Math.max(v0, 1e-9));
      infoTxt += ` · Réduction de variance moyenne depuis le départ : ${reduction.toFixed(1)} %`;
    }
    this.infoEl.innerHTML = infoTxt;
  }

  onClick(eventData) {
    if (!eventData || !eventData.points || !eventData.points.length) return;
    const pt = eventData.points[0];
    const xi = Math.round(pt.x), yi = Math.round(pt.y);
    if (xi < 0 || xi >= this.N || yi < 0 || yi >= this.N) return;

    const mode = this.ctrl.mode.value;
    if (mode === 'ajouter') {
      // Eviter doublons
      if (!this.donnees.some(d => d.x === xi && d.y === yi)) {
        const z = this.champVrai[yi * this.N + xi];
        this.donnees.push({ x: xi, y: yi, z: z });
      }
    } else {
      // Retirer le plus proche
      let bestI = -1, bestD = Infinity;
      for (let i = 0; i < this.donnees.length; i++) {
        const d = this.donnees[i];
        const dist = (d.x - xi) ** 2 + (d.y - yi) ** 2;
        if (dist < bestD) { bestD = dist; bestI = i; }
      }
      if (bestI >= 0 && bestD < 25) this.donnees.splice(bestI, 1);
    }
    this.kriger();
  }

  cleanup() {
    if (window.Plotly) {
      [this.plotVrai, this.plotEst, this.plotVar].forEach(p => { if (p) Plotly.purge(p); });
    }
  }
}

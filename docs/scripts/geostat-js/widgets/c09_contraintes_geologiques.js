// scripts/geostat-js/widgets/c09_contraintes_geologiques.js
// -----------------------------------------------------------------------------
// Widget — Krigeage avec contrainte de domaine geologique.
//
// L'utilisateur definit un POLYGONE (forme prédéfinie ou cliquable) qui
// represente un domaine geologique (ex : limites d'un gisement minier).
// Le krigeage n'utilise QUE les donnees A L'INTERIEUR du domaine.
//
// Pedagogie : montre l'importance de respecter les LIMITES geologiques
// (failles, contacts lithologiques) au lieu de melanger des donnees de
// nature differente. Concept operationnel critique en exploration miniere.
// -----------------------------------------------------------------------------
import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';
const debounce = (fn, ms = 350) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

// Polygones predefinis (coordonnees 0-25)
const POLYGONS = {
  carre:    [[6, 6], [19, 6], [19, 19], [6, 19]],
  triangle: [[12.5, 4], [22, 21], [3, 21]],
  L:        [[5, 5], [20, 5], [20, 12], [13, 12], [13, 20], [5, 20]],
  cercle:   Array.from({length: 24}, (_, i) => {
              const t = i * 2 * Math.PI / 24;
              return [12.5 + 8 * Math.cos(t), 12.5 + 8 * Math.sin(t)];
            }),
};

// Point-in-polygon (ray casting)
function pointInPolygon(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersect = ((yi > py) !== (yj > py)) &&
      (px < (xj - xi) * (py - yi) / (yj - yi + 1e-12) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export default class C09ContraintesGeologiques extends Widget {
  render() {
    this.el.insertAdjacentHTML('beforeend', `
      <div class="gw-controls" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;">
        <label>Modèle <select class="js-mod">
          <option value="spherique">Sphérique</option><option value="exponentiel">Exponentiel</option><option value="gaussien">Gaussien</option>
        </select></label>
        <label>Portée a <input type="range" class="js-a" min="3" max="12" value="5" step="1" style="width:120px"><span class="js-av">5</span></label>
        <label>Forme du domaine <select class="js-shape">
          <option value="carre">Carré</option><option value="triangle">Triangle</option><option value="L">L</option><option value="cercle" selected>Cercle</option>
        </select></label>
        <label>N forages <input type="range" class="js-n" min="15" max="80" value="40" step="5" style="width:120px"><span class="js-nv">40</span></label>
        <button class="js-regen" type="button" style="font-size:.76rem;padding:3px 8px;background:#3a3632;color:#fff;border:none;border-radius:4px;cursor:pointer;">Resim</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px;">
        <div class="js-plot-naive" style="height:380px"></div>
        <div class="js-plot-contraint" style="height:380px"></div>
      </div>
      <div class="js-info" style="padding:.5rem 1rem;font-family:'JetBrains Mono',monospace;font-size:.85rem;color:#444;text-align:center;background:#eef2e8;border:1px solid #b8c8a8;border-radius:6px;margin-top:4px;">—</div>
      <p style="margin:4px 1rem;font-size:11px;color:#666;">
        À gauche : krigeage <b>naïf</b> qui mélange les données des deux domaines (artefacts en bordure).
        À droite : krigeage <b>contraint</b> qui n'utilise que les forages à l'intérieur du domaine.
        Concept opérationnel pour respecter les limites lithologiques en exploration.</p>
    `);
    this.plotNaif = this.el.querySelector('.js-plot-naive');
    this.plotContraint = this.el.querySelector('.js-plot-contraint');
    this.infoEl = this.el.querySelector('.js-info');
    this.ctrl = {
      mod: this.el.querySelector('.js-mod'), a: this.el.querySelector('.js-a'),
      shape: this.el.querySelector('.js-shape'), n: this.el.querySelector('.js-n'),
    };
    this.seed = 23;
    const update = debounce(() => this.refresh(), 400);
    for (const [k, el] of Object.entries(this.ctrl)) {
      this.on(el, 'input', e => { const s = this.el.querySelector(`.js-${k}v`); if (s) s.textContent = e.target.value; });
      this.on(el, 'input', update); this.on(el, 'change', update);
    }
    this.on(this.el.querySelector('.js-regen'), 'click', () => { this.seed++; this.refresh(); });
    afficherChargementJusquaPret(this.el).then(() => this.refresh());
  }

  async refresh() {
    const mod = this.ctrl.mod.value;
    const a = parseFloat(this.ctrl.a.value);
    const shape = this.ctrl.shape.value;
    const npts = parseInt(this.ctrl.n.value, 10);
    const N = 25;
    const polygon = POLYGONS[shape];

    // 2 champs distincts : un dans le domaine, un en dehors
    let champ_in, champ_out;
    try {
      champ_in = await gpoly.simulerFFTMA(mod, a, 1.0, this.seed, N);
      champ_out = await gpoly.simulerFFTMA(mod, a, 1.0, this.seed + 555, N);
    } catch (e) { this.afficherAvertissement('Erreur : ' + e.message); return; }
    // Decalage de moyenne entre les deux domaines (contraste lithologique)
    for (let k = 0; k < champ_in.length; k++) champ_in[k] += 3.0;  // teneur elevee
    for (let k = 0; k < champ_out.length; k++) champ_out[k] += 0.0; // teneur faible
    // Champ "verité" composite
    const champ_vrai = new Array(N * N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      champ_vrai[j*N+i] = pointInPolygon(i, j, polygon) ? champ_in[j*N+i] : champ_out[j*N+i];
    }

    // Echantillonner npts forages au hasard sur toute la grille
    let s = (this.seed * 2654435761) >>> 0;
    const rng = () => { s = (s * 1664525 + 1013904223) | 0; return ((s >>> 0) / 4294967296); };
    const choisi = new Set();
    while (choisi.size < npts) choisi.add(Math.floor(rng() * N * N));
    const xd = [], zd = [], dans_dom = [];
    for (const idx of choisi) {
      const y = Math.floor(idx / N), x = idx - y * N;
      xd.push([x, y]); zd.push(champ_vrai[idx]); dans_dom.push(pointInPolygon(x, y, polygon));
    }
    // Forages INTERIEURS au domaine pour le krigeage contraint
    const xd_in = xd.filter((_, i) => dans_dom[i]);
    const zd_in = zd.filter((_, i) => dans_dom[i]);

    // Grille cible (toute la grille pour le naïf, seulement intérieur du domaine pour le contraint)
    const cibles = [];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) cibles.push([i, j]);
    const structs = [{ modele: mod, portee: a, palier: 1.0 }];

    let r_naif, r_contraint;
    try {
      r_naif = await gpoly.krigeageOrdinaire(xd, zd, cibles, structs, 0);
      // Pour le contraint, on krige TOUTE la grille avec UNIQUEMENT les forages INTERIEURS,
      // puis on masque les pixels HORS domaine (NaN).
      if (xd_in.length >= 2) {
        r_contraint = await gpoly.krigeageOrdinaire(xd_in, zd_in, cibles, structs, 0);
      } else {
        r_contraint = { estimations: new Array(N * N).fill(NaN), variances: new Array(N * N).fill(NaN) };
      }
    } catch (e) { this.afficherAvertissement('Erreur krigeage : ' + e.message); return; }

    // Masquer les pixels HORS domaine dans la carte contrainte
    const est_contraint_masque = r_contraint.estimations.map((v, k) => {
      const y = Math.floor(k / N), x = k - y * N;
      return pointInPolygon(x, y, polygon) ? v : NaN;
    });

    const reshape = (flat) => { const M=[]; for (let j=0; j<N; j++) { const r=[]; for (let i=0; i<N; i++) r.push(flat[j*N+i]); M.push(r); } return M; };
    if (!window.Plotly) return;
    const zMin = Math.min(...champ_vrai), zMax = Math.max(...champ_vrai);
    const layoutCommon = (title) => ({
      margin: { t: 35, l: 30, r: 50, b: 30 },
      xaxis: { range: [-0.5, N-0.5], showticklabels: false, scaleanchor: 'y' },
      yaxis: { range: [-0.5, N-0.5], showticklabels: false, autorange: 'reversed' },
      title: { text: title, font: { size: 12 } },
    });
    const polyTrace = {
      x: polygon.map(p=>p[0]).concat([polygon[0][0]]),
      y: polygon.map(p=>p[1]).concat([polygon[0][1]]),
      mode: 'lines', line: { color: '#000', width: 3 },
      name: 'Domaine géologique', showlegend: false, hoverinfo: 'skip',
    };
    const ptsTrace = (mask) => ({
      x: xd.filter((_,i) => mask[i]).map(p=>p[0]),
      y: xd.filter((_,i) => mask[i]).map(p=>p[1]),
      mode: 'markers',
      marker: { color: '#fff', size: 7, line: { color: '#000', width: 1 } },
      showlegend: false,
    });
    // Carte naïve : tous les forages
    Plotly.react(this.plotNaif, [
      { type: 'heatmap', z: reshape(r_naif.estimations), colorscale: 'Turbo', zmin: zMin, zmax: zMax, colorbar: { thickness: 10 } },
      polyTrace, ptsTrace(dans_dom), ptsTrace(dans_dom.map(d => !d)),
    ], layoutCommon('Krigeage NAÏF (mélange les domaines)'),
    { displaylogo: false, responsive: true });
    // Carte contrainte : seulement forages INTERIEURS, masquage hors-domaine
    Plotly.react(this.plotContraint, [
      { type: 'heatmap', z: reshape(est_contraint_masque), colorscale: 'Turbo', zmin: zMin, zmax: zMax, colorbar: { thickness: 10 } },
      polyTrace, ptsTrace(dans_dom),
    ], layoutCommon(`Krigeage CONTRAINT (n_in = ${xd_in.length})`),
    { displaylogo: false, responsive: true });

    // Stats : erreurs aux pixels INTERIEURS du domaine
    let sse_naif = 0, sse_contraint = 0, n_eval = 0;
    for (let k = 0; k < N * N; k++) {
      const y = Math.floor(k / N), x = k - y * N;
      if (!pointInPolygon(x, y, polygon)) continue;
      const z_vrai = champ_vrai[k];
      const z_naif = r_naif.estimations[k];
      const z_contraint = r_contraint.estimations[k];
      if (isFinite(z_naif) && isFinite(z_contraint)) {
        sse_naif += (z_vrai - z_naif) ** 2;
        sse_contraint += (z_vrai - z_contraint) ** 2;
        n_eval++;
      }
    }
    const rmse_naif = Math.sqrt(sse_naif / Math.max(n_eval, 1));
    const rmse_contraint = Math.sqrt(sse_contraint / Math.max(n_eval, 1));
    this.infoEl.innerHTML =
      `Forages intérieurs : <b>${xd_in.length}</b> / ${npts} · ` +
      `RMSE naïf = <b>${rmse_naif.toFixed(3)}</b> · ` +
      `RMSE contraint = <b>${rmse_contraint.toFixed(3)}</b> ` +
      `(amélioration : ${(100*(1-rmse_contraint/rmse_naif)).toFixed(1)} %)`;
  }

  cleanup() {
    if (window.Plotly) {
      [this.plotNaif, this.plotContraint].forEach(p => { if (p) Plotly.purge(p); });
    }
  }
}

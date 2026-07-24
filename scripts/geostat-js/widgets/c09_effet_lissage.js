// scripts/geostat-js/widgets/c09_effet_lissage.js
// -----------------------------------------------------------------------------
// Widget C09.8 — Effet de lissage et biais conditionnel.
//
// Pedagogie : on simule un champ « verite » Z(x), on echantillonne N donnees,
// on krige sur tout le domaine -> Z*. Puis on compare :
//   - Histogramme de Z (verite) vs Z* (krige)
//   - Scatterplot (Z_vrai, Z*) avec la droite y=x et la regression
//
// Observations attendues :
//   - Histogramme de Z* est PLUS RESSERRE (queues attenuees, effet lissage).
//   - La regression Z|Z* a une PENTE < 1 (biais conditionnel) :
//     les hautes teneurs sont surestimees, les basses sous-estimees.
//   - Decomposition : Var(Z) = Var(Z*) + σ²_K  (en KS)
//                     Var(Z) = Var(Z*) + σ²_OK + 2μ  (en KO)
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
// Échantillonnage DENSE + voisinage LOCAL : sinon les cellules loin de toute
// donnée retombent sur la moyenne (amas artificiel à Z*≈5, fausse impression
// de biais). Avec un bon échantillonnage, le krigeage suit le champ et on voit
// le lissage MODÉRÉ + le léger biais conditionnel attendu.
const CONFIG = { N: 50, n_pts: 110, nk: 16 };

export default class C09EffetLissage extends Widget {
  render() {
    this.el.insertAdjacentHTML('beforeend', `
      <div class="gw-controls" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;">
        <label>Modèle <select class="js-mod">
          <option value="spherique">Sphérique</option>
          <option value="exponentiel">Exponentiel</option>
          <option value="gaussien">Gaussien</option>
        </select></label>
        <label>Portée a
          <input type="range" class="js-a" min="5" max="30" value="15" step="1" style="width:120px">
          <span class="js-av">15</span></label>
        <label>Pépite c₀
          <input type="range" class="js-c0" min="0" max="0.3" value="0" step="0.02" style="width:100px">
          <span class="js-c0v">0</span></label>
        <label>Loi <select class="js-loi">
          <option value="gaussien">Normale</option>
          <option value="lognormal">Log-normale</option>
        </select></label>
        <button class="js-regen" type="button" style="font-size:.76rem;padding:3px 8px;background:#3a3632;color:#fff;border:none;border-radius:4px;cursor:pointer;">Resim</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px;">
        <div class="js-plot-hist" style="height:300px"></div>
        <div class="js-plot-scat" style="height:300px"></div>
      </div>
      <div class="js-info" style="padding:.4rem 1rem;font-family:'JetBrains Mono',monospace;font-size:.82rem;color:#444;text-align:center;background:#f0f0f0;border-radius:6px;margin-top:4px;">—</div>
      <p style="margin:4px 1rem;font-size:11px;color:#666;">
        Décomposition Var(Z) = Var(Z*) + σ²<sub>K</sub> en krigeage simple, ou Var(Z*) + σ²<sub>K</sub> + 2μ en krigeage ordinaire. Conséquence : une sélection minière fondée sur Z* surestime les blocs riches.</p>
    `);

    this.plotH = this.el.querySelector('.js-plot-hist');
    this.plotS = this.el.querySelector('.js-plot-scat');
    this.infoEl = this.el.querySelector('.js-info');
    this.ctrl = {
      mod: this.el.querySelector('.js-mod'),
      a:  this.el.querySelector('.js-a'),
      c0: this.el.querySelector('.js-c0'),
      loi: this.el.querySelector('.js-loi'),
    };
    this.seed = 13;
    const update = debounce(() => this.refresh(), 300);
    for (const [k, el] of Object.entries(this.ctrl)) {
      if (el.type === 'range') {
        this.on(el, 'input', e => {
          this.el.querySelector(`.js-${k}v`).textContent = e.target.value;
        });
        this.on(el, 'input', update);
      } else {
        this.on(el, 'change', update);
      }
    }
    this.on(this.el.querySelector('.js-regen'), 'click', () => { this.seed++; this.refresh(); });
    afficherChargementJusquaPret(this.el).then(() => this.refresh());
  }

  async refresh() {
    const mod = this.ctrl.mod.value;
    const a  = parseFloat(this.ctrl.a.value);
    const c0 = parseFloat(this.ctrl.c0.value);
    const loi = this.ctrl.loi.value;
    const variance = loi === 'lognormal' ? 3.0 : 1.0;
    const structs = [{ modele: mod, palier: Math.max(0.001, 1 - c0), portee: a }];
    const N = CONFIG.N;

    // 1) Simuler le champ verite (loi marginale normale ou log-normale)
    let champ;
    try {
      champ = await gpoly.simulerChamp(mod, a, c0, this.seed, N, loi, 5.0, variance);
    } catch (e) { this.afficherAvertissement('Erreur simulation : ' + e.message); return; }

    // 2) Echantillonner n_pts pixels
    let s = (this.seed * 2654435761) >>> 0;
    const rng = () => { s = (s * 1664525 + 1013904223) | 0; return ((s >>> 0) / 4294967296); };
    const choisi = new Set();
    while (choisi.size < CONFIG.n_pts) choisi.add(Math.floor(rng() * N * N));
    const xd = [], zd = new Float64Array(CONFIG.n_pts);
    let k = 0;
    for (const idx of choisi) {
      const y = Math.floor(idx / N), x = idx - y * N;
      xd.push([x, y]); zd[k] = champ[idx]; k++;
    }

    // 3) Krigeage KS (moyenne CONNUE = 5) ET KO (moyenne inconnue) sur la grille
    const cibles = [];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) cibles.push([i, j]);
    let rKS, rKO;
    try {
      rKS = await gpoly.krigeageSimple(xd, Array.from(zd), cibles, structs, c0, 5.0, CONFIG.nk);
      rKO = await gpoly.krigeageOrdinaire(xd, Array.from(zd), cibles, structs, c0, CONFIG.nk);
    } catch (e) { this.afficherAvertissement('Erreur krigeage : ' + e.message); return; }

    const Z_vrai = Array.from(champ);
    const Z_ks = rKS.estimations, Z_ko = rKO.estimations;

    // 4) Histogrammes (vérité, KS, KO)
    const dens = h => {
      const c = h.bords.slice(0, -1).map((b, i) => 0.5 * (b + h.bords[i + 1]));
      const tot = h.comptes.reduce((s, v) => s + v, 0);
      return { c, d: h.comptes.map(v => v / tot) };
    };
    let h_vrai, h_ks, h_ko, s_vrai, s_ks, s_ko, regKS, regKO;
    try {
      [h_vrai, h_ks, h_ko] = await Promise.all([
        gpoly.histogramme(Z_vrai, 22), gpoly.histogramme(Z_ks, 22), gpoly.histogramme(Z_ko, 22),
      ]);
      [s_vrai, s_ks, s_ko] = await Promise.all([
        gpoly.statistiquesDescriptives(Z_vrai), gpoly.statistiquesDescriptives(Z_ks), gpoly.statistiquesDescriptives(Z_ko),
      ]);
      [regKS, regKO] = await Promise.all([
        gpoly.regressionLineaire(Z_ks, Z_vrai), gpoly.regressionLineaire(Z_ko, Z_vrai),
      ]);
    } catch (e) { this.afficherAvertissement('Erreur stats : ' + e.message); return; }
    const Dv = dens(h_vrai), Dks = dens(h_ks), Dko = dens(h_ko);

    if (!window.Plotly) { this.afficherAvertissement('Plotly non chargé.'); return; }
    const COL = { ks: '#5b9bd5', ko: '#7cc47f', ksLine: '#1f5fa8', koLine: '#2e8b57', vrai: '#555' };

    // Plages serrées (éviter le blanc).
    const allC = [...Dv.c, ...Dks.c, ...Dko.c];
    const hLo = Math.min(...allC), hHi = Math.max(...allC);
    const hPad = (hHi - hLo) * 0.04 || 1;
    const yHi = Math.max(...Dv.d, ...Dks.d, ...Dko.d) * 1.06;

    // Histogrammes : vérité (contour gris) + KS (bleu pâle) + KO (vert pâle)
    Plotly.react(this.plotH, [
      { type: 'bar', x: Dv.c, y: Dv.d, name: 'vérité', marker: { color: 'rgba(90,90,90,0.35)' } },
      { type: 'bar', x: Dks.c, y: Dks.d, name: 'KS', marker: { color: COL.ks, opacity: 0.55 } },
      { type: 'bar', x: Dko.c, y: Dko.d, name: 'KO', marker: { color: COL.ko, opacity: 0.55 } },
    ], {
      barmode: 'overlay',
      margin: { t: 36, l: 56, r: 16, b: 60 },
      title: { text: 'Histogrammes : vérité vs krigeages', font: { size: 12 }, y: 0.97 },
      xaxis: { title: { text: 'valeur', standoff: 8 }, range: [hLo - hPad, hHi + hPad], automargin: true },
      yaxis: { title: { text: 'fréquence', standoff: 8 }, range: [0, yHi], automargin: true },
      legend: { orientation: 'h', y: -0.24, x: 0.5, xanchor: 'center', font: { size: 10 } },
    }, { displaylogo: false, responsive: true, displayModeBar: false });

    // Nuage (Z*, Z) pour KS et KO + leurs droites de régression
    const z_min = Math.min(...Z_vrai, ...Z_ks, ...Z_ko);
    const z_max = Math.max(...Z_vrai, ...Z_ks, ...Z_ko);
    const ze = [z_min, z_max];
    const zPad = (z_max - z_min) * 0.02 || 0.2;
    Plotly.react(this.plotS, [
      { x: Z_ks, y: Z_vrai, mode: 'markers', name: 'KS', marker: { color: 'rgba(91,155,213,0.22)', size: 4 } },
      { x: Z_ko, y: Z_vrai, mode: 'markers', name: 'KO', marker: { color: 'rgba(124,196,127,0.26)', size: 4 } },
      { x: ze, y: ze, mode: 'lines', name: 'y = x', line: { color: '#888', dash: 'dash', width: 1 } },
      { x: ze, y: ze.map(z => regKS.ordonnee + regKS.pente * z), mode: 'lines', name: 'rég. KS', line: { color: COL.ksLine, width: 2.5 } },
      { x: ze, y: ze.map(z => regKO.ordonnee + regKO.pente * z), mode: 'lines', name: 'rég. KO', line: { color: COL.koLine, width: 2.5 } },
    ], {
      margin: { t: 36, l: 56, r: 16, b: 52 },
      title: { text: 'Nuage Z* vs Z : KS et KO', font: { size: 12 }, y: 0.97 },
      xaxis: { title: { text: 'Z* (krigé)', standoff: 8 }, range: [z_min - zPad, z_max + zPad], automargin: true },
      yaxis: { title: { text: 'Z (vérité)', standoff: 8 }, range: [z_min - zPad, z_max + zPad], scaleanchor: 'x', automargin: true },
      legend: { orientation: 'h', y: -0.2, x: 0.5, xanchor: 'center', font: { size: 9 } },
    }, { displaylogo: false, responsive: true, displayModeBar: false });

    this.infoEl.innerHTML =
      `Var(Z) = <b>${s_vrai.variance.toFixed(3)}</b> · Var(Z*<sub>KS</sub>) = <b>${s_ks.variance.toFixed(3)}</b> · Var(Z*<sub>KO</sub>) = <b>${s_ko.variance.toFixed(3)}</b><br>` +
      `Pente de régression · <span style="color:${COL.ksLine}">KS = <b>${regKS.pente.toFixed(3)}</b></span> · ` +
      `<span style="color:${COL.koLine}">KO = <b>${regKO.pente.toFixed(3)}</b></span>`;
  }

  cleanup() {
    if (window.Plotly) {
      if (this.plotH) Plotly.purge(this.plotH);
      if (this.plotS) Plotly.purge(this.plotS);
    }
  }
}

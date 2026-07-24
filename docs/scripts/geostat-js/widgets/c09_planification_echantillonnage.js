// scripts/geostat-js/widgets/c09_planification_echantillonnage.js
// -----------------------------------------------------------------------------
// Widget — Planification d'echantillonnage glouton (greedy design).
//
// Pedagogie : on commence avec 0 ou quelques forages. A chaque etape, on
// calcule la carte de variance de krigeage et on ajoute le pixel qui
// reduit le plus la variance MOYENNE de la grille. Algorithme glouton de
// "maximum variance reduction" (= G-optimality), simple et tres pedagogique.
//
// Affiche : carte variance + position du prochain forage candidat (max σ²_K).
// Boutons : ajouter 1, ajouter 5, ajouter 10. Reset.
// -----------------------------------------------------------------------------
import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';
const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

export default class C09PlanificationEchantillonnage extends Widget {
  render() {
    this.donnees = [];     // forages places
    this.historique = [];  // var moyenne apres chaque ajout
    this.N = 25;

    this.el.insertAdjacentHTML('beforeend', `
      <div class="gw-controls" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;">
        <label>Modèle <select class="js-mod">
          <option value="spherique">Sphérique</option><option value="exponentiel">Exponentiel</option><option value="gaussien">Gaussien</option>
        </select></label>
        <label>Portée a <input type="range" class="js-a" min="3" max="15" value="6" step="1" style="width:120px"><span class="js-av">6</span></label>
        <button class="js-add1" type="button" style="font-size:.76rem;padding:3px 8px;background:#16a34a;color:#fff;border:none;border-radius:4px;cursor:pointer;">+1 forage optimal</button>
        <button class="js-add5" type="button" style="font-size:.76rem;padding:3px 8px;background:#16a34a;color:#fff;border:none;border-radius:4px;cursor:pointer;">+5 forages</button>
        <button class="js-add10" type="button" style="font-size:.76rem;padding:3px 8px;background:#16a34a;color:#fff;border:none;border-radius:4px;cursor:pointer;">+10 forages</button>
        <button class="js-reset" type="button" style="font-size:.76rem;padding:3px 8px;background:#c44;color:#fff;border:none;border-radius:4px;cursor:pointer;">Reset</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px;">
        <div class="js-plot-var" style="height:380px;"></div>
        <div class="js-plot-courbe" style="height:380px;"></div>
      </div>
      <div class="js-info" style="padding:.5rem 1rem;font-family:'JetBrains Mono',monospace;font-size:.85rem;color:#444;text-align:center;background:#eef2e8;border:1px solid #b8c8a8;border-radius:6px;margin-top:4px;">—</div>
      <p style="margin:4px 1rem;font-size:11px;color:#666;">
        Algorithme glouton : à chaque pas, ajouter le pixel qui maximise la réduction de σ̄²_K.
        Optimal au sens de la <b>G-optimalité</b>. La courbe affiche la décroissance avec n.</p>
    `);
    this.plotVar = this.el.querySelector('.js-plot-var');
    this.plotCourbe = this.el.querySelector('.js-plot-courbe');
    this.infoEl = this.el.querySelector('.js-info');
    this.ctrl = { mod: this.el.querySelector('.js-mod'), a: this.el.querySelector('.js-a') };
    const upd = debounce(() => this.kriger(), 300);
    for (const [k, el] of Object.entries(this.ctrl)) {
      this.on(el, 'input', e => { const s = this.el.querySelector(`.js-${k}v`); if (s) s.textContent = e.target.value; });
      this.on(el, 'input', upd); this.on(el, 'change', upd);
    }
    this.on(this.el.querySelector('.js-add1'), 'click', () => this.ajouterOptimal(1));
    this.on(this.el.querySelector('.js-add5'), 'click', () => this.ajouterOptimal(5));
    this.on(this.el.querySelector('.js-add10'), 'click', () => this.ajouterOptimal(10));
    this.on(this.el.querySelector('.js-reset'), 'click', () => {
      this.donnees = []; this.historique = []; this.kriger();
    });
    afficherChargementJusquaPret(this.el).then(() => this.kriger());
  }

  /** Krige la grille et retourne (variances, var_moyenne, idx_argmax). */
  async calculVariances() {
    const mod = this.ctrl.mod.value, a = parseFloat(this.ctrl.a.value);
    const N = this.N, structs = [{ modele: mod, portee: a, palier: 1.0 }];
    const cibles = [];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) cibles.push([i, j]);

    if (this.donnees.length < 2) {
      // Variance = palier partout (pas de donnees)
      const S2 = new Array(N * N).fill(1.0);
      return { S2, meanVar: 1.0, idxNext: Math.floor(N*N/2) };
    }
    const xd = this.donnees.map(d => [d.x, d.y]);
    const zd = this.donnees.map(_ => 0); // les valeurs ne changent pas la variance
    const r = await gpoly.krigeageOrdinaire(xd, zd, cibles, structs, 0.0);
    const S2 = r.variances.map(v => Math.max(0, v));
    const meanVar = S2.reduce((s,v)=>s+v,0) / S2.length;
    // Exclure les pixels deja occupes
    const occupied = new Set(this.donnees.map(d => d.y * N + d.x));
    let idxNext = -1, maxV = -1;
    for (let k = 0; k < S2.length; k++) {
      if (occupied.has(k)) continue;
      if (S2[k] > maxV) { maxV = S2[k]; idxNext = k; }
    }
    return { S2, meanVar, idxNext };
  }

  async kriger() {
    let result;
    try { result = await this.calculVariances(); }
    catch (e) { this.afficherAvertissement('Erreur : ' + e.message); return; }
    this.dessiner(result);
  }

  async ajouterOptimal(nb) {
    for (let i = 0; i < nb; i++) {
      let r;
      try { r = await this.calculVariances(); }
      catch (e) { this.afficherAvertissement('Erreur : ' + e.message); return; }
      const idx = r.idxNext;
      if (idx < 0) break;
      const y = Math.floor(idx / this.N), x = idx - y * this.N;
      this.donnees.push({ x, y, z: 0 });
      this.historique.push({ n: this.donnees.length, var: r.meanVar });
    }
    // Final
    const final = await this.calculVariances();
    this.historique.push({ n: this.donnees.length, var: final.meanVar });
    this.dessiner(final);
  }

  dessiner(r) {
    const N = this.N;
    const reshape = (flat) => { const M=[]; for (let j=0; j<N; j++) { const ro=[]; for (let i=0; i<N; i++) ro.push(flat[j*N+i]); M.push(ro); } return M; };
    if (!window.Plotly) return;
    const layoutVar = {
      margin: { t: 35, l: 30, r: 50, b: 30 },
      xaxis: { showticklabels: false, scaleanchor: 'y' }, yaxis: { showticklabels: false, autorange: 'reversed' },
      title: { text: `σ²_K · n = ${this.donnees.length} forages · σ̄² = ${r.meanVar.toFixed(4)}`, font: { size: 12 } },
    };
    const ptsMark = {
      x: this.donnees.map(d => d.x), y: this.donnees.map(d => d.y), mode: 'markers',
      marker: { color: '#fff', size: 9, symbol: 'circle', line: { color: '#000', width: 1.5 } },
      showlegend: false,
    };
    const traces = [
      { type: 'heatmap', z: reshape(r.S2), colorscale: 'Hot', zmin: 0, zmax: 1.05, colorbar: { thickness: 10 } },
      ptsMark,
    ];
    if (r.idxNext >= 0 && this.donnees.length > 0) {
      const yn = Math.floor(r.idxNext / N), xn = r.idxNext - yn * N;
      traces.push({
        x: [xn], y: [yn], mode: 'markers',
        marker: { symbol: 'star', size: 18, color: '#16a34a', line: { color: '#000', width: 2 } },
        name: 'Prochain forage optimal', showlegend: false,
      });
    }
    Plotly.react(this.plotVar, traces, layoutVar, { displaylogo: false, responsive: true });

    // Courbe d'apprentissage
    Plotly.react(this.plotCourbe, [
      { x: this.historique.map(h => h.n), y: this.historique.map(h => h.var),
        mode: 'lines+markers', line: { color: '#0d4d92', width: 2 },
        marker: { color: '#0d4d92', size: 7 }, name: 'σ̄²_K' },
      { x: [0, Math.max(this.historique.length, 30)], y: [1.0, 1.0], mode: 'lines',
        line: { color: '#888', dash: 'dash' }, name: 'Palier C(0)' },
    ], {
      margin: { t: 35, l: 50, r: 20, b: 50 },
      xaxis: { title: 'Nombre de forages n' },
      yaxis: { title: 'σ̄²_K (variance moyenne)', rangemode: 'tozero' },
      title: { text: "Décroissance avec n (« courbe d'apprentissage »)", font: { size: 12 } },
      legend: { orientation: 'h', y: -0.18, x: 0.5, xanchor: 'center', font: { size: 10 } },
    }, { displaylogo: false, responsive: true });

    if (r.idxNext >= 0 && this.donnees.length > 0) {
      const yn = Math.floor(r.idxNext / N), xn = r.idxNext - yn * N;
      this.infoEl.innerHTML =
        `<b>${this.donnees.length}</b> forages placés · σ̄²_K = <b>${r.meanVar.toFixed(4)}</b> · ` +
        `Prochain forage optimal : <b>(${xn}, ${yn})</b> où σ²_K = ${r.S2[r.idxNext].toFixed(3)}`;
    } else {
      this.infoEl.innerHTML = `${this.donnees.length} forages · σ̄²_K = ${r.meanVar.toFixed(4)}`;
    }
  }

  cleanup() {
    if (window.Plotly) {
      [this.plotVar, this.plotCourbe].forEach(p => { if (p) Plotly.purge(p); });
    }
  }
}

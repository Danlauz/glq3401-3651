// scripts/geostat-js/widgets/c11_ki_vs_ko.js
// -----------------------------------------------------------------------------
// Widget C11.4 — Application : site pollué, KI vs KO.
//
//   - Ligne 1 : la référence (vérité).
//   - Ligne 2 : KO — teneur estimée Z* et variance de krigeage σ²_KO.
//   - Ligne 3 : KI — espérance conditionnelle E[Z|x] et variance conditionnelle
//     Var[Z|x], tirées de la distribution locale complète F(z|x).
// Bilan : quantité de sol contaminé (Z > z_c) selon vérité / KO / KI.
//
// On peut CLIQUER la carte de référence pour ajouter un sondage (= forer un
// nouveau trou : on révèle la vraie teneur), ou cliquer un sondage pour le
// retirer. KO et KI se recalculent.
//
// Note variance : σ²_KO est l'erreur d'estimation (géométrie) ; Var[Z|x] est la
// dispersion de la distribution locale. Les deux ont leur propre échelle.
// -----------------------------------------------------------------------------
import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const N = 100, NDATA = 16, NSEUIL = 13;
// La portée du slider est exprimée sur une grille de base 26 ; on l'échelonne à la
// résolution réelle pour que la TAILLE des structures reste identique quelle que
// soit la résolution (sinon un champ 100×100 devient du bruit fin).
const RSCALE = N / 26;
// Inverse de la CDF normale standard (Φ⁻¹, approximation d'Acklam).
function invNorm(p) {
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0, -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0, 3.754408661907416e0];
  const plow = 0.02425, phigh = 1 - plow; let q, r;
  if (p < plow) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p <= phigh) { q = p - 0.5; r = q * q; return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
  q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
}
const TURBO = [
  [0.0, 'rgb(48,18,59)'], [0.1, 'rgb(65,69,217)'], [0.2, 'rgb(35,138,244)'], [0.3, 'rgb(30,192,211)'],
  [0.4, 'rgb(53,226,149)'], [0.5, 'rgb(131,246,88)'], [0.6, 'rgb(199,233,47)'], [0.7, 'rgb(248,186,56)'],
  [0.8, 'rgb(251,122,33)'], [0.9, 'rgb(221,61,8)'], [1.0, 'rgb(122,4,3)'],
];

export default class C11KIvsKO extends Widget {
  render() {
    this.seed = 12; this.clickBound = false;
    const id = this.el.id;
    this.el.insertAdjacentHTML('beforeend', `
      <style>#${id} .gw-controls label{display:inline-flex !important;flex-direction:row !important;align-items:center;gap:5px;}</style>
      <div class="gw-controls" style="display:flex;flex-wrap:wrap;gap:14px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.82rem;">
        <label>Loi du contaminant <select class="js-loi">
          <option value="gaussien">Gaussienne</option>
          <option value="lognormal" selected>Log-normale</option>
        </select></label>
        <label>Portée a <input type="range" class="js-a" min="6" max="30" value="16" step="1" style="width:110px"><span class="js-av">16</span></label>
        <label>Seuil de contamination z<sub>c</sub> <input type="range" class="js-zc" min="0" max="10" value="5" step="0.1" style="width:150px"><span class="js-zcv">5.0</span></label>
        <button class="js-regen" type="button" style="font-size:.78rem;padding:4px 10px;background:#3a3632;color:#fff;border:none;border-radius:5px;cursor:pointer;">Nouveau site</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px;">
        <div class="js-plot-ref" style="grid-column:1/3;height:215px;cursor:crosshair;"></div>
        <div class="js-plot-ko" style="height:195px"></div>
        <div class="js-plot-kovar" style="height:195px"></div>
        <div class="js-plot-kimean" style="height:195px"></div>
        <div class="js-plot-kivar" style="height:195px"></div>
      </div>
      <div class="js-info" style="padding:.5rem 1rem;font-size:.84rem;color:#333;text-align:center;background:#eef2f7;border:1px solid #c4d2e0;border-radius:6px;margin-top:8px;">—</div>
      <p style="margin:4px 1rem;font-size:11px;color:#666;">
        <b>Cliquez la carte de référence</b> pour forer un nouveau sondage (révèle la vraie teneur) ou cliquez un sondage pour le retirer. σ²<sub>KO</sub> = erreur d'estimation (dépend de la géométrie). Var[Z|x] = dispersion de la distribution locale du KI. Le bilan compare la <b>quantité de sol contaminé</b> (Z &gt; z<sub>c</sub>) à la vérité.</p>
    `);
    this.plots = {
      ref: this.el.querySelector('.js-plot-ref'), ko: this.el.querySelector('.js-plot-ko'),
      kovar: this.el.querySelector('.js-plot-kovar'), kimean: this.el.querySelector('.js-plot-kimean'),
      kivar: this.el.querySelector('.js-plot-kivar'),
    };
    this.infoEl = this.el.querySelector('.js-info');
    this.ctrl = { loi: this.el.querySelector('.js-loi'), a: this.el.querySelector('.js-a'), zc: this.el.querySelector('.js-zc') };
    const heavy = debounce(() => this._simulate().then(() => this._krige()).then(() => this.drawZc()), 300);
    this.on(this.ctrl.loi, 'change', heavy);
    this.on(this.ctrl.a, 'input', e => { this.el.querySelector('.js-av').textContent = e.target.value; heavy(); });
    this.on(this.ctrl.zc, 'input', e => { this.el.querySelector('.js-zcv').textContent = parseFloat(e.target.value).toFixed(1); this.drawZc(); });
    this.on(this.el.querySelector('.js-regen'), 'click', () => { this.seed = Math.floor(Math.random() * 1e6); heavy(); });
    afficherChargementJusquaPret(this.el).then(() => this._simulate()).then(() => this._krige()).then(() => this.drawZc());
  }

  async _simulate() {
    const loi = this.ctrl.loi.value, a = parseFloat(this.ctrl.a.value) * RSCALE;
    const params = loi === 'lognormal' ? [2.0, 7.0] : [3.0, 1.3];
    let flat;
    try { flat = await gpoly.simulerChamp('spherique', a, 0, this.seed, N, loi, params[0], params[1]); }
    catch (e) { this.afficherAvertissement('Erreur simulation : ' + e.message); return; }
    // Log-normale : valeurs déjà positives. Gaussienne : on conserve les valeurs
    // (sans troncature) et on recentre pour une moyenne EXACTEMENT égale à 3.
    const F = []; for (let j = 0; j < N; j++) { const r = []; for (let i = 0; i < N; i++) r.push(flat[j * N + i]); F.push(r); }
    const medOf = arr => { const s = [...arr].sort((p, q) => p - q), n = s.length; return n % 2 ? s[(n - 1) / 2] : 0.5 * (s[n / 2 - 1] + s[n / 2]); };
    // Gaussienne : transformation en SCORES NORMAUX (anamorphose). On réassigne
    // les valeurs par rang à une loi normale exacte → moyenne = médiane = 3
    // EXACTEMENT (les quantiles (r+0,5)/n sont symétriques), structure spatiale
    // préservée (transformation monotone des rangs).
    if (loi === 'gaussien') {
      const n = N * N, sd = Math.sqrt(params[1]);
      const order = [...Array(n).keys()].sort((p, q) => flat[p] - flat[q]);
      order.forEach((cell, rank) => { F[Math.floor(cell / N)][cell % N] = params[0] + sd * invNorm((rank + 0.5) / n); });
    }
    this.F = F; this.xs = Array.from({ length: N }, (_, i) => i + 0.5);
    const flatF = F.flat(), sortF = [...flatF].sort((p, q) => p - q);
    this.fmax = sortF[sortF.length - 1];
    this.fmin = sortF[0];
    this.cmin = (loi === 'lognormal') ? 0 : Math.min(0, this.fmin);
    const qf = p => sortF[Math.max(0, Math.min(sortF.length - 1, Math.floor(p * sortF.length)))];
    this.q02 = qf(0.02);
    this.q98 = qf(0.98);                                   // échelle de couleur (teneur)
    // Bornes des CLASSES DE QUEUE (espérance/variance conditionnelle + exceedance) :
    // plus larges que les seuils → pas de plafonnement, et P(Z>z_c) → 0 à zhi.
    this.zlo = qf(0.002);
    this.zhi = qf(0.999);
    this.champMean = flatF.reduce((p, q) => p + q, 0) / (N * N);
    this.champMed = medOf(flatF);

    // Seuils uniformes (q02..q98) + VARIOGRAMME D'INDICATRICE PAR SEUIL, ajusté
    // sur le CHAMP RÉEL complet (la « vérité ») → variogrammes propres qui
    // capturent la déstructuration aux seuils extrêmes. Mis en cache (ne dépend
    // pas des sondages). La portée varie de seuil en seuil → le KI se rapproche
    // du résultat multigaussien.
    // Seuils = quantiles empiriques du champ, DENSES vers la queue (jusqu'à q995)
    // pour résoudre P(Z>z_c) sur tout l'intervalle du curseur (sinon constant au-delà du seuil max).
    const probs = [0.04, 0.12, 0.21, 0.31, 0.41, 0.51, 0.61, 0.71, 0.80, 0.88, 0.94, 0.975, 0.995];
    this.seuils = probs.map(qf);
    for (let k = 1; k < this.seuils.length; k++) if (this.seuils[k] <= this.seuils[k - 1]) this.seuils[k] = this.seuils[k - 1] + 1e-4;
    this.indVario = [];
    const lagMax = Math.max(4, Math.round(N * 0.55));
    const aDef = parseFloat(this.ctrl.a.value) * RSCALE;
    for (const c of this.seuils) {
      const Iflat = flatF.map(v => (v <= c ? 1 : 0));
      try {
        const vg = await gpoly.variogrammeEmpiriqueGrille(Iflat, N, lagMax);
        const comptes = vg.lags.map(h => 2 * N * (N - h));
        const fit = await gpoly.ajusterVariogramme(vg.lags, vg.values, comptes);
        this.indVario.push({ type: fit.type, c0: Math.max(0, fit.c0), c1: Math.max(1e-3, fit.c1), a: Math.min(2 * N, Math.max(1, fit.a)) });
      } catch { this.indVario.push({ type: 'spherique', c0: 0, c1: 0.25, a: aDef }); }
    }

    // Sondages initiaux.
    let s = (this.seed ^ 0x5bd1e995) >>> 0;
    const rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    const vus = new Set(), data = [];
    while (data.length < NDATA) {
      const i = Math.floor(rng() * N), j = Math.floor(rng() * N), key = j * N + i;
      if (vus.has(key)) continue; vus.add(key);
      data.push({ x: i + 0.5, y: j + 0.5, z: F[j][i] });
    }
    this.donnees = data;
  }

  _condStats(cdf) {
    const z0 = this.zlo, zK = this.zhi, K = this.seuils.length;
    let mean = 0, m2 = 0;
    const cls = (lo, hi, p) => { const mid = 0.5 * (lo + hi), pp = Math.max(0, p); mean += pp * mid; m2 += pp * mid * mid; };
    cls(z0, this.seuils[0], cdf[0]);
    for (let k = 1; k < K; k++) cls(this.seuils[k - 1], this.seuils[k], cdf[k] - cdf[k - 1]);
    cls(this.seuils[K - 1], zK, 1 - cdf[K - 1]);
    return { mean, var: Math.max(0, m2 - mean * mean) };
  }

  async _krige() {
    if (!this.F) return;
    const a = parseFloat(this.ctrl.a.value) * RSCALE;
    const xd = this.donnees.map(d => [d.x, d.y]), zd = this.donnees.map(d => d.z);
    this.zKImax = this.q98;
    const clamp01 = v => Math.max(0, Math.min(1, v));
    const varOf = arr => { const m = arr.reduce((x, y) => x + y, 0) / arr.length; return arr.reduce((x, y) => x + (y - m) ** 2, 0) / arr.length; };
    const palier = Math.max(0.01, varOf(zd));
    const K = this.seuils.length;

    const cibles = []; for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) cibles.push([this.xs[i], this.xs[j]]);
    const Fcols = [];
    try {
      const rko = await gpoly.krigeageGrilleGlobale(xd, zd, cibles, [{ modele: 'spherique', palier, portee: a }], 0.0);
      this.KO = rko.estimations; this.KOvar = rko.variances;
      // Krigeage d'indicatrices SEUIL PAR SEUIL avec le variogramme propre de chaque seuil.
      for (let k = 0; k < K; k++) {
        const v = this.indVario[k];
        const ind = zd.map(z => (z <= this.seuils[k] ? 1 : 0));
        // Pépite forcée à 0 : on conserve la PORTÉE propre du seuil (déstructuration),
        // mais le krigeage doit rester un interpolateur EXACT → CCDF en marche nette
        // au point connu → variance conditionnelle ≈ 0 aux sondages (sinon une donnée
        // semble « oubliée »). Seule la portée par seuil compte (KO invariant au palier).
        const f = (await gpoly.krigeageGrilleGlobale(xd, ind, cibles, [{ modele: v.type, palier: v.c1, portee: v.a }], 0.0)).estimations.map(clamp01);
        Fcols.push(f);
      }
    } catch (e) { this.afficherAvertissement('Erreur krigeage : ' + e.message); return; }

    // Assemblage de la CCDF par cellule + correction de la relation d'ordre (moyenne montée/descente).
    this.KIcdf = [];
    for (let cell = 0; cell < cibles.length; cell++) {
      const up = []; let prev = 0; for (let k = 0; k < K; k++) { const m = Math.max(clamp01(Fcols[k][cell]), prev); up.push(m); prev = m; }
      const dn = new Array(K); let nx = 1; for (let k = K - 1; k >= 0; k--) { const m = Math.min(clamp01(Fcols[k][cell]), nx); dn[k] = m; nx = m; }
      this.KIcdf.push(up.map((u, k) => clamp01(0.5 * (u + dn[k]))));
    }
    this.KImean = this.KIcdf.map(c => this._condStats(c).mean);
    this.KIvar = this.KIcdf.map(c => this._condStats(c).var);

    const cmax = this.q98;                                    // échelle teneur partagée
    const vmax = Math.max(...this.KOvar.filter(isFinite), ...this.KIvar, 1e-6);   // échelle variance partagée
    this._map('ref', this.F, TURBO, this.cmin, cmax, `Référence (vérité) · moyenne = ${this.champMean.toFixed(2)} · médiane = ${this.champMed.toFixed(2)}`, '');
    this._map('ko', this._rs(this.KO), TURBO, this.cmin, cmax, 'KO — teneur estimée Z*', '');
    this._map('kovar', this._rs(this.KOvar), 'Viridis', 0, vmax, 'KO — variance σ²<sub>KO</sub> (erreur)', '');
    this._map('kimean', this._rs(this.KImean), TURBO, this.cmin, cmax, 'KI — espérance conditionnelle E[Z|x]', '');
    this._map('kivar', this._rs(this.KIvar), 'Viridis', 0, vmax, 'KI — variance conditionnelle Var[Z|x]', '');

    if (!this.clickBound) { this.on(this.plots.ref, 'click', e => this._onClick(e)); this.clickBound = true; }
  }

  _rs(flat) { const M = []; for (let j = 0; j < N; j++) { const r = []; for (let i = 0; i < N; i++) r.push(flat[j * N + i]); M.push(r); } return M; }

  _map(key, Z, scale, zmin, zmax, titre, cb) {
    if (!window.Plotly || !this.donnees) return;
    Plotly.react(this.plots[key], [
      { type: 'heatmap', z: Z, x: this.xs, y: this.xs, colorscale: scale, zmin, zmax, colorbar: { title: cb, thickness: 10, len: 0.85 } },
      { x: this.donnees.map(d => d.x), y: this.donnees.map(d => d.y), mode: 'markers', marker: { color: '#fff', size: 6, line: { color: '#000', width: 1 } }, showlegend: false, hoverinfo: 'skip' },
    ], {
      margin: { t: 26, l: 20, r: 52, b: 16 }, title: { text: titre, font: { size: 11.5 }, y: 0.98 }, dragmode: false,
      xaxis: { range: [0, N], showticklabels: false, scaleanchor: 'y', constrain: 'domain' },
      yaxis: { range: [0, N], showticklabels: false },
    }, { displaylogo: false, responsive: true, displayModeBar: false });
  }

  _onClick(e) {
    const fl = this.plots.ref._fullLayout; if (!fl || !fl.xaxis || !fl.yaxis) return;
    const rect = this.plots.ref.getBoundingClientRect();
    const xv = fl.xaxis.p2d(e.clientX - rect.left - fl.xaxis._offset);
    const yv = fl.yaxis.p2d(e.clientY - rect.top - fl.yaxis._offset);
    const i = Math.floor(xv), j = Math.floor(yv);
    if (i < 0 || i >= N || j < 0 || j >= N) return;
    let near = -1; this.donnees.forEach((d, k) => { if (Math.hypot(d.x - (i + 0.5), d.y - (j + 0.5)) < 1.1) near = k; });
    if (near >= 0) { if (this.donnees.length > 3) this.donnees.splice(near, 1); }
    else this.donnees.push({ x: i + 0.5, y: j + 0.5, z: this.F[j][i] });
    this._krige().then(() => this.drawZc());
  }

  // F(z_c | x) par interpolation linéaire des classes de la CCDF (0 sous zlo, 1 au-dessus de zhi).
  _Fz(cdf, zc) {
    const S = this.seuils, K = S.length, zlo = this.zlo, zhi = this.zhi;
    if (zc <= zlo) return 0;
    if (zc >= zhi) return 1;
    if (zc <= S[0]) return cdf[0] * (zc - zlo) / (S[0] - zlo);
    if (zc >= S[K - 1]) return cdf[K - 1] + (1 - cdf[K - 1]) * (zc - S[K - 1]) / (zhi - S[K - 1]);
    let k = 1; while (k < K && S[k] < zc) k++;
    return cdf[k - 1] + (cdf[k] - cdf[k - 1]) * (zc - S[k - 1]) / (S[k] - S[k - 1]);
  }

  async drawZc() {
    if (!this.KIcdf) return;
    const zc = parseFloat(this.ctrl.zc.value);
    const tot = N * N;
    const vraie = this.F.flat().filter(v => v > zc).length / tot;
    const parKO = this.KO.filter(v => v > zc).length / tot;
    const parKI = this.KIcdf.reduce((a, cdf) => a + (1 - this._Fz(cdf, zc)), 0) / tot;
    const pct = x => (100 * x).toFixed(1) + ' %';
    this.infoEl.innerHTML =
      `<b>Sol contaminé (Z &gt; ${zc.toFixed(1)})</b> · ${this.donnees.length} sondages &nbsp;·&nbsp; ` +
      `vérité = <b>${pct(vraie)}</b> &nbsp;|&nbsp; ` +
      `<span style="color:#2c6fbf">KO (seuillage Z*) = <b>${pct(parKO)}</b></span> &nbsp;|&nbsp; ` +
      `<span style="color:#1f8a4c">KI (Σ P(Z&gt;z<sub>c</sub>)) = <b>${pct(parKI)}</b></span>`;
  }

  cleanup() { if (window.Plotly) Object.values(this.plots).forEach(p => p && Plotly.purge(p)); }
}

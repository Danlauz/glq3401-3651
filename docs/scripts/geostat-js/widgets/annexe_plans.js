// scripts/geostat-js/widgets/annexe_plans.js
// -----------------------------------------------------------------------------
// Widget « Orientation d'un plan — trois conventions synchronisées » (annexe A).
// Source de vérité : geostat_polymtl.forage.geometrie.conversions_plan
// (via gpoly.geomConversionsPlan). Le JS ne fait QUE l'affichage.
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';

const debounce = (fn, ms = 80) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

function carteConvention(titre, idA, labA, idB, labB, valA, valB) {
  return `
    <div style="padding:.75rem;border:1px solid #eee;border-radius:10px;background:#fafafa;">
      <div style="font-weight:700;margin-bottom:.5rem;">${titre}</div>
      <label style="display:block;margin-bottom:.5rem;"><strong>${labA}</strong><br>
        <input class="js-${idA}" type="range" min="0" max="359" value="${valA}" style="width:100%;">
        <span class="js-${idA}v" style="font-family:monospace;">${valA}°</span></label>
      <label style="display:block;"><strong>${labB}</strong><br>
        <input class="js-${idB}" type="range" min="0" max="90" value="${valB}" style="width:100%;">
        <span class="js-${idB}v" style="font-family:monospace;">${valB}°</span></label>
    </div>`;
}

export default class AnnexePlans extends Widget {
  render() {
    this.el.insertAdjacentHTML('beforeend', `
      <div style="max-width:980px;margin:0 auto;padding:1rem;">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1rem;margin-bottom:1rem;">
          ${carteConvention('1) Pôle du plan', 'ap', 'Azimut a<sub>p</sub> (°)', 'bp', 'Plongée b<sub>p</sub> (°)', 120, 30)}
          ${carteConvention('2) Vecteur de pendage', 'ad', 'Azimut a<sub>d</sub> (°)', 'bd', 'Plongée b<sub>d</sub> (°)', 300, 60)}
          ${carteConvention('3) Convention géologique', 'ag', 'Direction a<sub>g</sub> (°)', 'bg', 'Pendage b<sub>g</sub> (°)', 210, 60)}
        </div>
        <div class="js-plot" style="height:600px;border:1px solid #eee;border-radius:10px;background:#fff;"></div>
        <div class="js-out" style="margin-top:1rem;font-family:monospace;background:#f8f9fa;padding:.75rem;border-radius:6px;border:1px solid #eee;">—</div>
        <p style="margin-top:6px;font-size:11px;color:#666">
          Conversions effectuées par <code>geostat_polymtl.forage.geometrie</code> (via Pyodide).</p>
      </div>
    `);

    this.in = {};
    for (const id of ['ap', 'bp', 'ad', 'bd', 'ag', 'bg']) {
      this.in[id] = this.el.querySelector(`.js-${id}`);
    }
    this.plot = this.el.querySelector('.js-plot');
    this.out = this.el.querySelector('.js-out');
    this._interne = false;

    const ecoute = (a, b, convention) => {
      const maj = debounce(() => {
        if (this._interne) return;
        this.update(convention, +this.in[a].value, +this.in[b].value);
      }, 80);
      this.on(this.in[a], 'input', maj);
      this.on(this.in[b], 'input', maj);
    };
    ecoute('ap', 'bp', 'pole');
    ecoute('ad', 'bd', 'pendage');
    ecoute('ag', 'bg', 'geologique');

    afficherChargementJusquaPret(this.el).then(() => this.update('pole', 120, 30));
  }

  cleanup() { try { Plotly.purge(this.plot); } catch (e) { /* ignore */ } }

  _synchroniser(c) {
    this._interne = true;
    const valeurs = { ap: c.ap, bp: c.bp, ad: c.ad, bd: c.bd, ag: c.ag, bg: c.bg };
    for (const [id, v] of Object.entries(valeurs)) {
      this.in[id].value = Math.round(v);
      this.el.querySelector(`.js-${id}v`).textContent = `${Math.round(v)}°`;
    }
    this._interne = false;
  }

  _maillagePlan(n, demiTaille = 3.2, pas = 9) {
    // Base orthonormée d'affichage (géométrie de rendu, pas de géostatistique)
    const cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const nz = [0, 0, 1], nx = [1, 0, 0];
    let e1 = cr(n, nz);
    let l1 = Math.hypot(...e1);
    if (l1 < 1e-6) { e1 = cr(n, nx); l1 = Math.hypot(...e1); }
    e1 = e1.map(v => v / l1);
    let e2 = cr(n, e1);
    const l2 = Math.hypot(...e2);
    e2 = e2.map(v => v / l2);

    const xs = [], ys = [], zs = [];
    for (let iu = 0; iu < pas; iu++) {
      for (let iv = 0; iv < pas; iv++) {
        const u = -demiTaille + 2 * demiTaille * iu / (pas - 1);
        const v = -demiTaille + 2 * demiTaille * iv / (pas - 1);
        xs.push(u * e1[0] + v * e2[0]);
        ys.push(u * e1[1] + v * e2[1]);
        zs.push(u * e1[2] + v * e2[2]);
      }
    }
    return { type: 'mesh3d', x: xs, y: ys, z: zs, opacity: 0.22, color: '#90caf9',
             name: 'Plan', hoverinfo: 'skip', showscale: false };
  }

  _fleche(nom, v, L, couleur, largeur, taille) {
    return { type: 'scatter3d', mode: 'lines+markers',
             x: [0, v[0] * L], y: [0, v[1] * L], z: [0, v[2] * L],
             line: { width: largeur, color: couleur }, marker: { size: taille },
             name: nom, hoverinfo: 'skip' };
  }

  async update(convention, a, b) {
    // === Appel à la VRAIE librairie (conversions + vecteurs) ===
    const c = await this.tryShow(() => gpoly.geomConversionsPlan(convention, a, b));
    this._synchroniser(c);

    this.out.innerHTML =
      `<strong>Pôle</strong> : a<sub>p</sub>=${c.ap.toFixed(0)}°, b<sub>p</sub>=${c.bp.toFixed(0)}° &nbsp; | &nbsp; ` +
      `<strong>Pendage</strong> : a<sub>d</sub>=${c.ad.toFixed(0)}°, b<sub>d</sub>=${c.bd.toFixed(0)}° &nbsp; | &nbsp; ` +
      `<strong>Géologique</strong> : a<sub>g</sub>=${c.ag.toFixed(0)}°, b<sub>g</sub>=${c.bg.toFixed(0)}°`;

    const axes = [[-5, 5, 0, 0, 0, 0], [0, 0, -5, 5, 0, 0], [0, 0, 0, 0, -5, 5]].map(v => ({
      type: 'scatter3d', mode: 'lines', x: [v[0], v[1]], y: [v[2], v[3]], z: [v[4], v[5]],
      showlegend: false, hoverinfo: 'skip', line: { width: 3, color: '#999' },
    }));

    Plotly.react(this.plot, [
      ...axes,
      this._maillagePlan(c.normale),
      this._fleche('Pôle (a<sub>p</sub>, b<sub>p</sub>)', c.normale, 3.2, '#c62828', 8, 7),
      this._fleche('Vecteur de pendage (a<sub>d</sub>, b<sub>d</sub>)', c.pendage, 3.2, '#1565c0', 8, 7),
      this._fleche('Direction du plan (a<sub>g</sub>)', c.direction, 3.2, '#2e7d32', 7, 7),
      this._fleche('Pendage (b<sub>g</sub>)', c.pendage, 2.6, '#2e7d32', 6, 6),
    ], {
      margin: { l: 0, r: 0, b: 0, t: 30 },
      scene: {
        xaxis: { range: [-5, 5], title: 'x (Est)' },
        yaxis: { range: [-5, 5], title: 'y (Nord)' },
        zaxis: { range: [-5, 5], title: 'z (Haut)' },
        aspectmode: 'cube',
      },
      uirevision: 'keep',
      showlegend: true,
    }, { responsive: true, displaylogo: false });
  }
}

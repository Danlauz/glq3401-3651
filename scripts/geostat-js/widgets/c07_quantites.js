// scripts/geostat-js/widgets/c07_quantites.js
// -----------------------------------------------------------------------------
// Widget C07 — Atelier 7.8 « Impact du nombre de données » (calque du notebook
// Chap6_QuantitesDonnees). Un champ 1D est simulé avec un modèle CONNU ; on en
// retient n points et on compare le variogramme expérimental (bruité quand n est
// faible) au modèle de référence. Deux panneaux : variogramme (gauche) + champ
// 1D avec les points retenus (droite).
//
// La STRUCTURE du champ est réglable : modèle, portée, palier et pépite. Le
// modèle de référence tracé à gauche suit automatiquement ces réglages, puisque
// c'est exactement celui qui a servi à simuler. On voit ainsi que la quantité de
// données nécessaire dépend de la structure : un champ à longue portée offre peu
// de paires indépendantes et reste mal estimé même avec beaucoup de points,
// alors qu'un champ à forte pépite se lit correctement dès que n est suffisant.
//
// La liste des modèles est importée de l'atelier 7.3 : une seule source de
// vérité pour les noms, et donc pour les codes de covar.py / covar_nu.py que
// pyodide_setup.js associe à ces noms.
//
// Simulation et variogramme : geostat_polymtl via gpoly (champ 1D, scatter).
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { gpoly, afficherChargementJusquaPret } from '../pyodide_setup.js';
import { MODELES } from './c07_modeles.js';

const debounce = (fn, ms = 160) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const CONFIG = { N: 500, seed: 544, h_axe: 250 };
const fmt = (v, n = 2) => v.toFixed(n).replace('.', ',');

export default class C07Quantites extends Widget {
  render() {
    const id = this.el.id;
    this.el.insertAdjacentHTML('beforeend', `
      <style>
        #${id} .q7-row label { display:inline-flex !important; flex-direction:row !important; align-items:center; gap:5px; }
        #${id} .q7-row label span { display:inline; }
      </style>
      <div class="gw-controls q7-row" style="display:flex;flex-wrap:wrap;gap:14px;align-items:center;padding:8px 12px;background:#f3f7fb;border:1px solid #cfe0ee;border-radius:8px;font-size:.84rem;margin-bottom:6px;">
        <b style="font-size:.78rem;color:#555;">Structure du champ</b>
        <label>Modèle <select class="js-mod" style="font-size:.8rem;padding:2px 4px;">
          ${MODELES.map(m => `<option value="${m.cle}">${m.nom}</option>`).join('')}
        </select></label>
        <label>Portée <span>a</span> <input type="range" class="js-a" min="20" max="150" value="100" step="5" style="width:110px"><span class="js-av">100</span></label>
        <label>Palier <span>C</span> <input type="range" class="js-c" min="0.1" max="2" value="0.8" step="0.05" style="width:100px"><span class="js-cv">0,80</span></label>
        <label>Pépite <span>C<sub>0</sub></span> <input type="range" class="js-c0" min="0" max="1" value="0.2" step="0.05" style="width:100px"><span class="js-c0v">0,20</span></label>
      </div>
      <div class="gw-controls q7-row" style="display:flex;flex-wrap:wrap;gap:16px;align-items:center;padding:8px 12px;background:#fafafa;border:1px solid #ddd;border-radius:8px;font-size:.84rem;">
        <label>n échantillons <input type="range" class="js-n" min="20" max="500" value="100" step="10" style="width:160px"><span class="js-nv">100</span></label>
        <label>Pas de lag <input type="range" class="js-lag" min="2" max="20" value="6" step="1" style="width:120px"><span class="js-lagv">6</span></label>
        <button class="js-npaires" type="button" style="font-size:.78rem;padding:3px 9px;background:#fff;color:#475569;border:1px solid #94a3b8;border-radius:4px;cursor:pointer;">Afficher N(h)</button>
        <button class="js-new" type="button" style="font-size:.78rem;padding:3px 9px;background:#3a3632;color:#fff;border:none;border-radius:4px;cursor:pointer;">Nouveau champ</button>
      </div>
      <div class="js-plot" style="height:380px"></div>
      <div class="js-info" style="text-align:center;font-size:.82rem;color:#555;margin-top:4px;"></div>
    `);
    this.plot = this.el.querySelector('.js-plot');
    this.infoEl = this.el.querySelector('.js-info');
    this.nEl = this.el.querySelector('.js-n');
    this.lagEl = this.el.querySelector('.js-lag');
    this.ctrl = {
      mod: this.el.querySelector('.js-mod'),
      a:   this.el.querySelector('.js-a'),
      c:   this.el.querySelector('.js-c'),
      c0:  this.el.querySelector('.js-c0'),
    };
    this.seed = CONFIG.seed;
    this.montrerN = false;   // N(h) masqué par défaut : on l'appelle au besoin

    const redraw = debounce(() => this._dessiner(), 80);
    // Changer la STRUCTURE oblige à re-simuler le champ ; la graine ne bouge pas,
    // donc seule la structure change et non le tirage aléatoire.
    const resimuler = debounce(() => this._simuler(), 200);
    const decimales = { a: 0, c: 2, c0: 2 };
    for (const k of ['a', 'c', 'c0']) {
      this.on(this.ctrl[k], 'input', e => {
        this.el.querySelector(`.js-${k}v`).textContent = fmt(parseFloat(e.target.value), decimales[k]);
        resimuler();
      });
    }
    this.on(this.ctrl.mod, 'change', () => this._simuler());
    this.on(this.nEl, 'input', e => { this.el.querySelector('.js-nv').textContent = e.target.value; });
    this.on(this.nEl, 'change', redraw);
    this.on(this.lagEl, 'input', e => { this.el.querySelector('.js-lagv').textContent = e.target.value; });
    this.on(this.lagEl, 'change', redraw);
    this.on(this.el.querySelector('.js-npaires'), 'click', () => {
      this.montrerN = !this.montrerN;
      const b = this.el.querySelector('.js-npaires');
      b.textContent = this.montrerN ? 'Masquer N(h)' : 'Afficher N(h)';
      b.style.background = this.montrerN ? '#475569' : '#fff';
      b.style.color = this.montrerN ? '#fff' : '#475569';
      this._dessiner();
    });
    this.on(this.el.querySelector('.js-new'), 'click', () => { this.seed++; this._simuler(); });
    afficherChargementJusquaPret(this.el).then(() => this._simuler());
  }

  _structure() {
    const m = MODELES.find(x => x.cle === this.ctrl.mod.value) || MODELES[0];
    const C  = parseFloat(this.ctrl.c.value);
    const C0 = parseFloat(this.ctrl.c0.value);
    const total = C + C0;
    return {
      m, C, C0, total,
      a: parseFloat(this.ctrl.a.value),
      // simulerChamp1D attend la pépite en FRACTION de la variance, et renvoie
      // un champ de variance `variance` : on lui passe donc le palier TOTAL,
      // pour que le variogramme expérimental plafonne bien à C + C0.
      pepFrac: total > 0 ? C0 / total : 0,
    };
  }

  async _simuler() {
    const s = this._structure();
    const jeton = (this._jeton = (this._jeton || 0) + 1);
    let champ, g;
    const lags = []; for (let i = 0; i <= 120; i++) lags.push(i * CONFIG.h_axe / 120);
    try {
      champ = await gpoly.simulerChamp1D(s.m.cle, s.a, s.pepFrac, this.seed,
                                         CONFIG.N, 'gaussien', 0.0, s.total);
      g = await gpoly.variogrammeTheorique(s.m.cle, lags, s.a, s.C);
    } catch (e) {
      this.afficherAvertissement('Erreur simulation : ' + (e && e.message ? e.message : e));
      return;
    }
    if (jeton !== this._jeton) return;   // un réglage plus récent a pris le relais
    this.field = Array.from(champ);
    this.modLags = lags;
    // Le modèle de référence est CELUI qui a servi à simuler : pépite comprise.
    this.modG = Array.from(g, (v, i) => v + (lags[i] > 0 ? s.C0 : 0));
    this._dessiner();
  }

  async _dessiner() {
    if (!this.field) return;
    const s = this._structure();
    const N = CONFIG.N, npt = parseInt(this.nEl.value, 10);
    const nLags = Math.max(4, Math.round(CONFIG.h_axe / parseFloat(this.lagEl.value)));

    // Sous-échantillonnage reproductible.
    let st = (this.seed * 2654435761) >>> 0;
    const rng = () => { st = (st * 1664525 + 1013904223) >>> 0; return st / 4294967296; };
    const set = new Set(); while (set.size < Math.min(npt, N)) set.add(Math.floor(rng() * N));
    const sx = [...set].sort((p, q) => p - q);
    const coords = sx.map(x => [x, 0]);
    const valeurs = Float64Array.from(sx, x => this.field[x]);

    let vario;
    try { vario = await gpoly.variogrammeScatter(coords, valeurs, nLags, CONFIG.h_axe); }
    catch (e) { this.afficherAvertissement('Erreur variogramme : ' + e.message); return; }

    if (!window.Plotly) { this.afficherAvertissement('Plotly non chargé.'); return; }
    const sy = sx.map(x => this.field[x]);

    // N(h) : nombre de paires ayant servi à CHAQUE point du variogramme
    // expérimental. gpoly_variogramme_scatter le renvoie déjà (clé `comptes`),
    // il n'y a donc rien à recalculer ici.
    const comptes = Array.from(vario.comptes || []).map(v => Number(v) || 0);
    const maxN = Math.max(1, ...comptes);
    // Les barres n'occupent que le bas du cadre : elles situent N(h) sans
    // masquer le variogramme, qui reste la courbe à lire.
    const hautN = maxN * 3.2;
    // Au-delà d'une vingtaine de classes, les étiquettes se chevauchent :
    // on ne les écrit que lorsqu'elles restent lisibles, le survol donne le
    // reste du temps la valeur exacte.
    const etiquettes = nLags <= 24;

    // Les axes suivent le palier choisi (et l'effet de trou dépasse le palier).
    let hautG = s.total * 1.6;
    for (const v of this.modG) if (v * 1.25 > hautG) hautG = v * 1.25;
    for (const v of vario.gamma) if (Number.isFinite(v) && v * 1.12 > hautG) hautG = v * 1.12;
    const ampli = 3.2 * Math.sqrt(s.total);

    Plotly.react(this.plot, [
      // Gauche : N(h) en arrière-plan (tracé en premier pour passer SOUS les points)
      ...(this.montrerN ? [{
        type: 'bar', x: vario.h, y: comptes, name: 'N(h) — paires par classe',
        marker: { color: 'rgba(148,163,184,0.45)', line: { color: '#94a3b8', width: 0.5 } },
        xaxis: 'x', yaxis: 'y3',
        text: etiquettes ? comptes.map(String) : undefined,
        textposition: etiquettes ? 'outside' : 'none',
        textfont: { size: 8, color: '#475569' },
        cliponaxis: false,
        hovertemplate: 'h = %{x:.1f}<br>N(h) = %{y} paires<extra></extra>',
      }] : []),
      // Gauche : variogramme
      { x: vario.h, y: vario.gamma, mode: 'markers', name: 'Variogramme expérimental',
        marker: { color: '#1f77b4', size: 7 }, xaxis: 'x', yaxis: 'y',
        customdata: comptes,
        hovertemplate: 'h = %{x:.1f}<br>γ = %{y:.3f}<br>N(h) = %{customdata} paires<extra></extra>' },
      { x: this.modLags, y: this.modG, mode: 'lines', name: 'Modèle de référence',
        line: { color: '#000', width: 2.5 }, xaxis: 'x', yaxis: 'y' },
      // Droite : champ + échantillons
      { x: this.field.map((_, i) => i), y: this.field, mode: 'lines', name: 'Champ simulé',
        line: { color: '#7aa6d6', width: 1 }, xaxis: 'x2', yaxis: 'y2', showlegend: false },
      { x: sx, y: sy, mode: 'markers', name: 'Échantillons',
        marker: { color: '#CC0000', size: 5 }, xaxis: 'x2', yaxis: 'y2', showlegend: false },
    ], {
      margin: { t: 28, l: 48, r: 14, b: 44 },
      legend: { orientation: 'h', y: 1.04, x: 0.5, xanchor: 'center', font: { size: 10 } },
      annotations: [
        { text: 'Ajustement du variogramme', x: 0.22, y: 1.0, xref: 'paper', yref: 'paper', showarrow: false, font: { size: 11, color: '#666' }, xanchor: 'center', yanchor: 'bottom' },
        { text: 'Champ simulé et points utilisés', x: 0.8, y: 1.0, xref: 'paper', yref: 'paper', showarrow: false, font: { size: 11, color: '#666' }, xanchor: 'center', yanchor: 'bottom' },
      ],
      xaxis:  { domain: [0, 0.44], anchor: 'y', title: { text: 'Distance h', standoff: 4 }, range: [0, CONFIG.h_axe] },
      yaxis:  { domain: [0, 1], anchor: 'x', title: 'γ(h)', range: [0, hautG] },
      // Axe propre à N(h), à droite du panneau de gauche. Il reste masqué tant
      // que le bouton n'est pas enfoncé : la mise en page ne bouge donc pas.
      yaxis3: { domain: [0, 1], anchor: 'x', overlaying: 'y', side: 'right',
                range: [0, hautN], visible: this.montrerN, showgrid: false, zeroline: false,
                title: { text: 'N(h)', font: { size: 10, color: '#64748b' }, standoff: 2 },
                tickfont: { size: 8, color: '#64748b' }, nticks: 4, ticks: 'outside' },
      xaxis2: { domain: [0.60, 1], anchor: 'y2', title: { text: 'Position x', standoff: 4 }, range: [0, N] },
      yaxis2: { domain: [0, 1], anchor: 'x2', title: 'z(x)', range: [-ampli, ampli] },
      bargap: 0.15,
    }, { displaylogo: false, responsive: true });

    // Le nombre de points n'est qu'une moitié de l'histoire : ce qui compte est
    // le nombre de PORTÉES couvertes par le domaine échantillonné.
    const portees = N / s.a;
    const diag = npt < 60
      ? 'peu de données : variogramme expérimental <b>bruité</b>, ajustement incertain.'
      : 'assez de données : le variogramme expérimental <b>colle</b> au modèle de référence.';
    const struct = `${s.m.nom}, a = ${fmt(s.a, 0)}, C = ${fmt(s.C)}, C₀ = ${fmt(s.C0)} ` +
      `(palier total ${fmt(s.total)})`;
    const avert = portees < 4
      ? ` &nbsp;·&nbsp; <b style="color:#b45309">Le domaine ne couvre que ${fmt(portees, 1)} portées</b> : même avec beaucoup de points, les grandes distances restent mal estimées.`
      : '';
    // Bilan des paires : total, classe la plus pauvre, et nombre de classes
    // sous le seuil usuel de 30 paires — en dessous, le point est peu fiable.
    let bilanN = '';
    if (this.montrerN) {
      const total = comptes.reduce((a, b) => a + b, 0);
      const utiles = comptes.filter(c => c > 0);
      const mini = utiles.length ? Math.min(...utiles) : 0;
      const faibles = utiles.filter(c => c < 30).length;
      const theorique = npt * (npt - 1) / 2;   // toutes les paires possibles
      bilanN =
        `<br><span style="font-size:.78rem;color:#475569">` +
        `N(h) : <b>${total.toLocaleString('fr-CA')}</b> paires réparties sur ${utiles.length} classes ` +
        `(sur ${theorique.toLocaleString('fr-CA')} paires possibles entre les ${npt} points) ` +
        `&nbsp;·&nbsp; la classe la plus pauvre en compte <b>${mini}</b>` +
        (faibles > 0
          ? ` &nbsp;·&nbsp; <b style="color:#b45309">${faibles} classe${faibles > 1 ? 's' : ''} sous 30 paires</b> : ces points-là sont peu fiables.`
          : ` &nbsp;·&nbsp; <b style="color:#1f7a3a">toutes les classes dépassent 30 paires.</b>`) +
        `</span>`;
    }
    this.infoEl.innerHTML = `<b>${npt}</b> points retenus sur ${N} — ${diag}<br>` +
      `<span style="font-size:.78rem;color:#777">Structure : ${struct}${avert}</span>${bilanN}`;
  }

  cleanup() { if (this.plot && window.Plotly) Plotly.purge(this.plot); }
}

// scripts/geostat-js/widgets/c05_lib.js
// -----------------------------------------------------------------------------
// Bibliothèque commune des widgets du chapitre 05 (méthodes conventionnelles).
//
// PRINCIPE STRICT : ZERO duplication de mathématiques.
// La simulation de champ aléatoire 2D (GRF) délègue à la VRAIE librairie
// `geostat_polymtl.simulation_methods.GFFTMA` via Pyodide (gpoly.simulerChamp).
// Aucune approximation JS du variogramme n'est faite ici.
//
// Helpers UI conservés côté JS (pas de math géostatistique) :
//   cm / cmA           : colormap RGB / RGBA
//   nn                 : indice du plus proche voisin (recherche linéaire)
//   bary               : coordonnées barycentriques (x,y) dans triangle a,b,c
//   del                : triangulation de Delaunay (Bowyer–Watson) — algorithme géométrique
//   voronoiEdges       : edges du diagramme de Voronoï clippés au rectangle
//   idw                : interpolation par inverse de la distance — utilisé en JS
//                        UNIQUEMENT pour le rendu pixel-par-pixel ; le calcul de
//                        référence est dans geostat_polymtl.conventional.idw
//   computeError       : biais et RMSE entre un champ "vérité" et une estimation
//   makeGeoShape       : polygone géologique fermé (N sommets) à partir d'une seed
//   scaleShapeToArea   : redimensionne un polygone pour atteindre une aire cible
//   polyArea           : aire d'un polygone fermé (formule shoelace)
//   volumeEntreSections: volume entre deux sections (moyenne ou prismoïde)
//   teneurMoyenneSections, teneurMoyenneLineaire : teneur moyenne pondérée
// -----------------------------------------------------------------------------

import { gpoly } from '../pyodide_setup.js';

// ===== Champ aléatoire gaussien — VRAIE GFFTMA via Pyodide ==================

/**
 * Champ aléatoire 2D simulé par FFT-MA (geostat_polymtl.simulation_methods.GFFTMA).
 *
 * Construction : `const grf = await GRF.create(W, H, opts)`
 *
 *   W, H : dimensions du canvas en pixels (le champ est interpolé à cette échelle).
 *   opts.modele   : 'spherique' | 'exponentiel' | 'gaussien'   (par défaut exponentiel)
 *   opts.portee_x : portée pratique (95 %) en pixels canvas selon x
 *   opts.portee_y : portée pratique en pixels canvas selon y (anisotropie 2D)
 *   opts.pepite   : effet de pépite (proportion du palier, 0..1)
 *   opts.seed     : graine RNG (par défaut Math.random())
 *   opts.N        : taille de la grille FFT (puissance de 2 ; défaut 128)
 *
 * Le champ retourné est normalisé dans [0, 1] (min/max sur la grille).
 */
export class GRF {
  constructor(W, H, opts, grid01, N) {
    this.W = W; this.H = H;
    this.modele = (opts.modele || 'Exponentiel').toLowerCase();
    this.ax = opts.portee_x ?? 130;
    this.ay = opts.portee_y ?? 130;
    this.pepite = opts.pepite ?? 0;
    this._grid = grid01;   // Float64Array, N×N, valeurs dans [0, 1]
    this._N = N;
  }

  /** Factory asynchrone : lance la simulation FFT-MA puis crée l'instance. */
  static async create(W, H, opts = {}) {
    const N = opts.N ?? 128;
    const seed = (opts.seed ?? Math.floor(Math.random() * 1e9)) >>> 0;
    const modele = (opts.modele || 'Exponentiel').toLowerCase();
    // Conversion pixels canvas -> cellules grille NxN
    // (la simulation se fait sur un domaine carré NxN)
    const W_ref = Math.max(W, H);
    const ax_grid = (opts.portee_x ?? 130) * N / W_ref;
    const ay_grid = (opts.portee_y ?? 130) * N / W_ref;
    const portee = (Math.abs(ax_grid - ay_grid) < 0.5) ? ax_grid : [ax_grid, ay_grid];
    const pepite = opts.pepite ?? 0;
    // Appel à la VRAIE GFFTMA via Pyodide
    const raw = await gpoly.simulerChamp(
      modele, portee, pepite, seed, N,
      'gaussien', 0.0, 1.0,   // type_champ, moyenne, variance
    );
    // Normalisation [0, 1] sur min/max de la grille
    let vmin = +Infinity, vmax = -Infinity;
    for (let i = 0; i < raw.length; i++) {
      const v = raw[i];
      if (v < vmin) vmin = v;
      if (v > vmax) vmax = v;
    }
    const rng = (vmax - vmin) || 1;
    const grid01 = new Float64Array(raw.length);
    for (let i = 0; i < raw.length; i++) grid01[i] = (raw[i] - vmin) / rng;
    return new GRF(W, H, opts, grid01, N);
  }

  /** Interpolation bilinéaire de la grille pour un pixel (x, y) du canvas. */
  at(x, y) {
    const N = this._N, g = this._grid;
    // Mapping pixel canvas -> coord grille (le champ couvre [0, N-1] dans les 2 directions)
    const gx = Math.max(0, Math.min(N - 1.0001, x * (N - 1) / Math.max(1, this.W - 1)));
    const gy = Math.max(0, Math.min(N - 1.0001, y * (N - 1) / Math.max(1, this.H - 1)));
    const i0 = Math.floor(gx), j0 = Math.floor(gy);
    const fx = gx - i0, fy = gy - j0;
    const v00 = g[j0 * N + i0];
    const v10 = g[j0 * N + i0 + 1];
    const v01 = g[(j0 + 1) * N + i0];
    const v11 = g[(j0 + 1) * N + i0 + 1];
    return (1 - fx) * (1 - fy) * v00 + fx * (1 - fy) * v10
         + (1 - fx) * fy       * v01 + fx * fy       * v11;
  }

  /** Dessine le champ dans un contexte canvas 2D (k = pas d'échantillonnage). */
  drawTo(ctx, k = 1) {
    const W = this.W, H = this.H;
    const img = ctx.createImageData(W, H);
    const d = img.data;
    for (let y = 0; y < H; y += k) {
      for (let x = 0; x < W; x += k) {
        const t = this.at(x, y);
        const c = cm(t);
        for (let dy = 0; dy < k && y + dy < H; dy++) {
          for (let dx = 0; dx < k && x + dx < W; dx++) {
            const o = ((y + dy) * W + (x + dx)) * 4;
            d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
          }
        }
      }
    }
    ctx.putImageData(img, 0, 0);
  }
}

// ===== Colormap (jet doux) ==================================================

// Palette « Turbo » (Google) : arc-en-ciel perceptuellement amélioré — fort
// contraste faible→fort (bleu→rouge) comme le jet, mais sans ses artefacts.
const _PALETTE = [
  [ 48, 18, 59],   // bleu très foncé (faible)
  [ 65, 69,217],   // bleu
  [ 35,138,244],   // bleu clair
  [ 30,192,211],   // cyan
  [ 53,226,149],   // vert-cyan
  [131,246, 88],   // vert
  [199,233, 47],   // vert-jaune
  [248,186, 56],   // jaune-orangé
  [251,122, 33],   // orange
  [221, 61,  8],   // rouge-orangé
  [122,  4,  3],   // rouge foncé (élevé)
];

/** Couleur RGB pour t ∈ [0, 1]. Gris neutre si t n'est pas fini (« pas de donnée »). */
export function cm(t) {
  if (!Number.isFinite(t)) return [228, 228, 228];
  const u = Math.max(0, Math.min(0.9999, t)) * (_PALETTE.length - 1);
  const i = Math.floor(u);
  const f = u - i;
  const a = _PALETTE[i], b = _PALETTE[i + 1];
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ];
}

/** Couleur CSS RGBA pour t ∈ [0, 1] et alpha ∈ [0, 1]. */
export function cmA(t, alpha = 1) {
  const c = cm(t);
  return `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
}

// ===== Plus proche voisin ===================================================

/** Indice du point le plus proche de (x, y). */
export function nn(x, y, pts) {
  let best = 0, bd = +Infinity;
  for (let i = 0; i < pts.length; i++) {
    const dx = pts[i].x - x, dy = pts[i].y - y;
    const d = dx * dx + dy * dy;
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}

// ===== Coordonnées barycentriques ===========================================

/**
 * Coords barycentriques (l1, l2, l3) de (x, y) dans le triangle (a, b, c).
 * Retourne null si dégénéré.
 */
export function bary(x, y, a, b, c) {
  const den = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
  if (Math.abs(den) < 1e-12) return null;
  const l1 = ((b.y - c.y) * (x - c.x) + (c.x - b.x) * (y - c.y)) / den;
  const l2 = ((c.y - a.y) * (x - c.x) + (a.x - c.x) * (y - c.y)) / den;
  const l3 = 1 - l1 - l2;
  return [l1, l2, l3];
}

// ===== Triangulation de Delaunay (Bowyer-Watson) ============================

function _circumcircle(p1, p2, p3) {
  const ax = p2.x - p1.x, ay = p2.y - p1.y;
  const bx = p3.x - p1.x, by = p3.y - p1.y;
  const d = 2 * (ax * by - ay * bx);
  if (Math.abs(d) < 1e-12) return null;
  const al = ax * ax + ay * ay;
  const bl = bx * bx + by * by;
  const cx = (by * al - ay * bl) / d + p1.x;
  const cy = (ax * bl - bx * al) / d + p1.y;
  const dx = cx - p1.x, dy = cy - p1.y;
  return { x: cx, y: cy, r2: dx * dx + dy * dy };
}

/**
 * Triangulation de Delaunay (Bowyer–Watson, naïve O(n²)).
 * @param {Array<{x,y}>} pts
 * @returns {Array<[number, number, number]>} indices de triangles
 */
export function del(pts) {
  const n = pts.length;
  if (n < 3) return [];
  // Super-triangle englobant
  let minx = +Infinity, miny = +Infinity, maxx = -Infinity, maxy = -Infinity;
  for (const p of pts) {
    if (p.x < minx) minx = p.x;
    if (p.y < miny) miny = p.y;
    if (p.x > maxx) maxx = p.x;
    if (p.y > maxy) maxy = p.y;
  }
  const dx = maxx - minx, dy = maxy - miny;
  const dmax = Math.max(dx, dy) * 20 + 1;
  const mx = (minx + maxx) / 2, my = (miny + maxy) / 2;
  const sp = [
    { x: mx - dmax, y: my - dmax },
    { x: mx + dmax, y: my - dmax },
    { x: mx,         y: my + dmax },
  ];
  const allPts = pts.concat(sp);
  const si = [n, n + 1, n + 2];
  let tris = [[si[0], si[1], si[2]]];

  for (let pi = 0; pi < n; pi++) {
    const p = allPts[pi];
    const bad = [];
    const edges = [];
    for (let ti = 0; ti < tris.length; ti++) {
      const [a, b, c] = tris[ti];
      const cc = _circumcircle(allPts[a], allPts[b], allPts[c]);
      if (cc) {
        const dx2 = p.x - cc.x, dy2 = p.y - cc.y;
        if (dx2 * dx2 + dy2 * dy2 < cc.r2 - 1e-9) {
          bad.push(ti);
          edges.push([a, b], [b, c], [c, a]);
        }
      }
    }
    // Trouver les edges uniques
    const uniq = [];
    for (let i = 0; i < edges.length; i++) {
      let dup = false;
      for (let j = 0; j < edges.length; j++) {
        if (i === j) continue;
        if ((edges[i][0] === edges[j][0] && edges[i][1] === edges[j][1]) ||
            (edges[i][0] === edges[j][1] && edges[i][1] === edges[j][0])) {
          dup = true; break;
        }
      }
      if (!dup) uniq.push(edges[i]);
    }
    // Retirer mauvais triangles
    tris = tris.filter((_, i) => bad.indexOf(i) < 0);
    for (const e of uniq) tris.push([e[0], e[1], pi]);
  }
  // Retirer les triangles touchant le super-triangle
  return tris.filter(([a, b, c]) => a < n && b < n && c < n);
}

// ===== Edges Voronoi (clippées au rectangle) ================================

function _clipSegment(x1, y1, x2, y2, W, H) {
  // Clip Liang-Barsky
  let t0 = 0, t1 = 1;
  const dx = x2 - x1, dy = y2 - y1;
  const p = [-dx, dx, -dy, dy];
  const q = [x1, W - x1, y1, H - y1];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return null;
    } else {
      const t = q[i] / p[i];
      if (p[i] < 0) { if (t > t1) return null; if (t > t0) t0 = t; }
      else          { if (t < t0) return null; if (t < t1) t1 = t; }
    }
  }
  return { x1: x1 + t0 * dx, y1: y1 + t0 * dy, x2: x1 + t1 * dx, y2: y1 + t1 * dy };
}

/**
 * Edges du diagramme de Voronoï dérivées de la triangulation de Delaunay.
 * @returns {Array<{x1,y1,x2,y2}>}
 */
export function voronoiEdges(pts, tris, W, H) {
  // Pour chaque arête de Delaunay partagée par 2 triangles, on relie les 2
  // centres de cercles circonscrits. Pour les arêtes sur le bord (1 triangle),
  // on extrude la médiatrice vers l'extérieur.
  const centers = tris.map(([a, b, c]) => _circumcircle(pts[a], pts[b], pts[c]));
  const edgeMap = new Map(); // "i,j" -> [triIdx]
  for (let ti = 0; ti < tris.length; ti++) {
    const [a, b, c] = tris[ti];
    for (const [i, j] of [[a, b], [b, c], [c, a]]) {
      const k = i < j ? `${i},${j}` : `${j},${i}`;
      const list = edgeMap.get(k) || [];
      list.push(ti);
      edgeMap.set(k, list);
    }
  }
  const out = [];
  for (const [key, list] of edgeMap.entries()) {
    if (list.length === 2) {
      const c1 = centers[list[0]], c2 = centers[list[1]];
      if (c1 && c2) {
        const seg = _clipSegment(c1.x, c1.y, c2.x, c2.y, W, H);
        if (seg) out.push(seg);
      }
    } else if (list.length === 1) {
      // Arête frontière : prolonger la médiatrice vers l'EXTÉRIEUR.
      // La direction (milieu − centre) est FAUSSE pour un triangle obtus (le
      // centre circonscrit est alors hors du triangle) : on utilise plutôt la
      // normale à l'arête (i, j), orientée à l'opposé du 3e sommet k.
      const c0 = centers[list[0]];
      if (!c0) continue;
      const [i, j] = key.split(',').map(Number);
      const [ta, tb, tc] = tris[list[0]];
      const k = (ta !== i && ta !== j) ? ta : (tb !== i && tb !== j) ? tb : tc;
      const mx = (pts[i].x + pts[j].x) / 2, my = (pts[i].y + pts[j].y) / 2;
      let nx = -(pts[j].y - pts[i].y), ny = (pts[j].x - pts[i].x); // normale à l'arête
      if (nx * (mx - pts[k].x) + ny * (my - pts[k].y) < 0) { nx = -nx; ny = -ny; } // vers l'extérieur
      const len = Math.hypot(nx, ny) || 1;
      nx /= len; ny /= len;
      const far = Math.max(W, H) * 3;
      const seg = _clipSegment(c0.x, c0.y, c0.x + nx * far, c0.y + ny * far, W, H);
      if (seg) out.push(seg);
    }
  }
  return out;
}

// ===== IDW ==================================================================

/**
 * Inverse de la distance (avec rayon de recherche).
 * @param {number} x
 * @param {number} y
 * @param {Array<{x,y,t}>} pts
 * @param {number} b exposant (par défaut 2)
 * @param {number} radius rayon de recherche (Infinity = global)
 * @returns {number} estimation t* (NaN si pas de point dans le rayon)
 */
export function idw(x, y, pts, b = 2, radius = Infinity) {
  const r2 = radius * radius;
  let num = 0, den = 0;
  for (const p of pts) {
    const dx = p.x - x, dy = p.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 > r2) continue;
    if (d2 < 1e-12) return p.t;
    const w = 1 / Math.pow(d2, b / 2);
    num += w * p.t;
    den += w;
  }
  return den > 0 ? num / den : NaN;
}

// ===== Erreur (biais + RMSE) ================================================

/**
 * Calcule biais et RMSE entre un champ "vérité" (GRF) et une fonction d'estimation.
 * Échantillonne la grille tous les `step` pixels pour limiter le coût.
 */
export function computeError(grf, fEstim, W, H, step = 6) {
  let n = 0, sumD = 0, sumD2 = 0;
  for (let y = 0; y < H; y += step) {
    for (let x = 0; x < W; x += step) {
      const v = grf.at(x, y);
      const e = fEstim(x, y);
      // Ignorer les pixels NON estimés (hors enveloppe / hors rayon) : null,
      // undefined ou NaN. Sinon `isFinite(null)===true` (null→0) compterait
      // ces zones comme une teneur de 0 % et fausserait le biais — la méthode
      // des triangles n'extrapole PAS hors de la triangulation.
      if (e === null || e === undefined || !isFinite(e)) continue;
      const d = e - v;
      sumD += d;
      sumD2 += d * d;
      n++;
    }
  }
  if (n === 0) return { biais: NaN, rmse: NaN };
  return { biais: sumD / n, rmse: Math.sqrt(sumD2 / n) };
}

// ===== Polygones (sections 3D, chap. 05) ====================================

/**
 * Génère un polygone géologique fermé (N sommets) à partir d'une "seed" (factor).
 * Forme = cercle déformé par 3 harmoniques.
 * @param {number} factor pseudo-seed (0..1)
 * @param {number} N nombre de sommets
 * @returns {Array<{x,y}>}
 */
export function makeGeoShape(factor, N = 64) {
  const f = factor || 0.5;
  const pts = [];
  // 3 harmoniques avec amplitudes/phases dérivées de f
  const a1 = 0.18 + 0.20 * f;
  const a2 = 0.10 + 0.10 * Math.sin(7 * f);
  const a3 = 0.06 + 0.06 * Math.cos(11 * f);
  const ph1 = 2 * Math.PI * f;
  const ph2 = 2 * Math.PI * (1 - f);
  const ph3 = Math.PI * f * 3;
  for (let i = 0; i < N; i++) {
    const th = 2 * Math.PI * i / N;
    const r = 1
      + a1 * Math.cos(2 * th + ph1)
      + a2 * Math.cos(3 * th + ph2)
      + a3 * Math.cos(5 * th + ph3);
    pts.push({ x: r * Math.cos(th), y: r * Math.sin(th) });
  }
  return pts;
}

/**
 * Contour d'une section minéralisée selon un TYPE de forme géologique.
 * (makeGeoShape attend un facteur numérique ; passer une chaîne donnait des
 * coordonnées NaN — d'où les formes/enveloppes cassées de l'atelier 5.4.)
 * Renvoie un polygone (rayon ~1, centré à l'origine) à mettre à l'échelle
 * ensuite via scaleShapeToArea.
 * @param {string} type 'lentille' | 'veine' | 'chenal' | 'irregulier'
 * @param {number} N nombre de sommets
 */
export function formeSection(type, N = 64) {
  const pts = [];
  for (let i = 0; i < N; i++) {
    const th = 2 * Math.PI * i / N;
    const c = Math.cos(th), s = Math.sin(th);
    let x, y;
    switch (type) {
      case 'lentille':   x = c;        y = 0.5 * s;  break;   // ellipse aplatie (lentille)
      case 'veine':      x = c;        y = 0.18 * s; break;   // ruban mince et allongé
      case 'chenal':     x = 1.25 * c; y = 0.55 * s; break;   // chenal allongé
      case 'irregulier': {                                    // forme patatoïde
        const r = 1 + 0.22 * Math.cos(2 * th + 1) + 0.12 * Math.cos(3 * th) + 0.07 * Math.cos(5 * th + 2);
        x = r * c; y = r * s; break;
      }
      default:           x = c;        y = s;        // disque
    }
    pts.push({ x, y });
  }
  return pts;
}

/** Aire (signée puis absolue) d'un polygone fermé. Shoelace formula. */
export function polyArea(shape) {
  let A = 0;
  const n = shape.length;
  for (let i = 0; i < n; i++) {
    const a = shape[i], b = shape[(i + 1) % n];
    A += a.x * b.y - b.x * a.y;
  }
  return Math.abs(A) * 0.5;
}

/** Redimensionne un polygone (autour de son centroïde) pour atteindre l'aire S. */
export function scaleShapeToArea(shape, S) {
  const A = polyArea(shape);
  if (A < 1e-9) return shape.map(p => ({ x: p.x, y: p.y }));
  const k = Math.sqrt(S / A);
  // Centroïde
  let cx = 0, cy = 0;
  for (const p of shape) { cx += p.x; cy += p.y; }
  cx /= shape.length; cy /= shape.length;
  return shape.map(p => ({ x: cx + (p.x - cx) * k, y: cy + (p.y - cy) * k }));
}

/**
 * Volume entre 2 sections d'aires A1, A2 séparées de L.
 * methode = 'moyenne' (surface linéaire) ou 'tronc' (prismoïde / tronc de cône).
 */
export function volumeEntreSections(A1, A2, L, methode = 'moyenne') {
  if (methode === 'tronc') {
    // Formule du prismoïde / tronc : V = L/3 (A1 + A2 + sqrt(A1*A2))
    return (L / 3) * (A1 + A2 + Math.sqrt(Math.max(0, A1 * A2)));
  }
  // Moyenne : V = L * (A1 + A2) / 2
  return L * (A1 + A2) * 0.5;
}

/**
 * Teneur moyenne pondérée par les surfaces (saut brusque de t1 à t2).
 * t̄ = (A1*t1 + A2*t2) / (A1 + A2)
 */
export function teneurMoyenneSections(A1, t1, A2, t2) {
  const den = A1 + A2;
  return den > 0 ? (A1 * t1 + A2 * t2) / den : 0;
}

/**
 * Teneur moyenne avec variation linéaire de t entre les 2 sections
 * (intégrale sur une variation linéaire pondérée par l'aire qui varie linéairement).
 * Formule analytique : t̄ = (2 A1 t1 + 2 A2 t2 + A1 t2 + A2 t1) / (3 (A1 + A2))
 */
export function teneurMoyenneLineaire(A1, t1, A2, t2) {
  const den = 3 * (A1 + A2);
  return den > 0 ? (2 * A1 * t1 + 2 * A2 * t2 + A1 * t2 + A2 * t1) / den : 0;
}

// ===== Méthode des sections : tableau de référence du cours =================
// Dimensions (largeur a, hauteur b) de la boîte englobante d'une section.
export function dimsSection(shape) {
  let minx = +Infinity, maxx = -Infinity, miny = +Infinity, maxy = -Infinity;
  for (const p of shape) {
    if (p.x < minx) minx = p.x; if (p.x > maxx) maxx = p.x;
    if (p.y < miny) miny = p.y; if (p.y > maxy) maxy = p.y;
  }
  return { a: maxx - minx, b: maxy - miny };
}

// --- Volumes ---
/** Surface linéaire : V = (S1 + S2) L / 2. */
export function volSurface(S1, S2, L) { return (S1 + S2) * L / 2; }
/** Cône tronqué / prismoïde : V = (S1 + S2 + √(S1 S2)) L / 3. */
export function volCone(S1, S2, L) { return (S1 + S2 + Math.sqrt(Math.max(0, S1 * S2))) * L / 3; }
/** Obélisque : V = (2S1 + 2S2 + a1 b2 + a2 b1) L / 6. */
export function volObelisque(S1, S2, a1, b1, a2, b2, L) { return (2 * S1 + 2 * S2 + a1 * b2 + a2 * b1) * L / 6; }

// --- Teneurs moyennes (B = teneur brusque, L = teneur linéaire) ---
export function tSurfaceBrusque(S1, t1, S2, t2) { const d = S1 + S2; return d > 0 ? (S1 * t1 + S2 * t2) / d : 0; }
export function tSurfaceLinB(S1, t1, S2, t2) { const d = 4 * (S1 + S2); return d > 0 ? ((3 * S1 + S2) * t1 + (3 * S2 + S1) * t2) / d : 0; }
export function tSurfaceLinL(S1, t1, S2, t2) { const d = 3 * (S1 + S2); return d > 0 ? ((2 * S1 + S2) * t1 + (2 * S2 + S1) * t2) / d : 0; }
export function tConeB(S1, t1, S2, t2) { const g = Math.sqrt(Math.max(0, S1 * S2)), d = 8 * (S1 + S2 + g); return d > 0 ? ((7 * S1 + S2 + 4 * g) * t1 + (7 * S2 + S1 + 4 * g) * t2) / d : 0; }
export function tConeL(S1, t1, S2, t2) { const g = Math.sqrt(Math.max(0, S1 * S2)), d = 4 * (S1 + S2 + g); return d > 0 ? ((3 * S1 + S2 + 2 * g) * t1 + (3 * S2 + S1 + 2 * g) * t2) / d : 0; }
export function tObeliB(a1, b1, t1, a2, b2, t2) { const d = 8 * a1 * b1 + 8 * a2 * b2 + 4 * a1 * b2 + 4 * a2 * b1; return d > 0 ? (a1 * b1 * (7 * t1 + t2) + (2 * t1 + 2 * t2) * (a2 * b1 + a1 * b2) + a2 * b2 * (t1 + 7 * t2)) / d : 0; }
export function tObeliL(a1, b1, t1, a2, b2, t2) { const d = 4 * a1 * b1 + 4 * a2 * b2 + 2 * a1 * b2 + 2 * a2 * b1; return d > 0 ? (a1 * b1 * (3 * t1 + t2) + (t1 + t2) * (a2 * b1 + a1 * b2) + a2 * b2 * (t1 + 3 * t2)) / d : 0; }

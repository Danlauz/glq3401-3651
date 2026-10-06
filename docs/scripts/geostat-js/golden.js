// scripts/geostat-js/golden.js
// -----------------------------------------------------------------------------
// Vérification des `golden vectors` au chargement de la page.
//
// Principe : un fichier JSON contient une liste de cas {fonction, entrées,
// sorties attendues}. À chaque ouverture de page, on charge ce fichier (mis
// en cache navigateur) et on rejoue les vecteurs concernant les fonctions
// implémentées côté JS. Si une sortie diverge au-delà de la tolérance, on
// affiche un avertissement dans la console (et bientôt dans l'UI) — c'est
// le signal que le portage JS a divergé de la librairie Python.
//
// Format des vecteurs (généré par `geostat-polymtl-goldens`) :
//
//   {
//     "version_lib": "0.1.0",
//     "vecteurs": [
//       {
//         "id": "gamma_spherique_a20_c10",
//         "fonction": "variogram.modeles.gamma",
//         "entrees": { "modele": {...}, "h": [...] },
//         "sorties": { "gamma": [...] },
//         "tolerance": 1e-9
//       },
//       ...
//     ]
//   }
// -----------------------------------------------------------------------------

const URL_GOLDEN = new URL('./golden_vectors.json', import.meta.url).href;

// Registre des implémentations JS à vérifier. Chaque entrée :
//   "namespace.fonction": (entrees) => sorties
// Les widgets enregistrent leurs fonctions ici quand ils sont chargés.
export const IMPLEMENTATIONS_JS = {};

export function enregistrerImplementation(nom, fn) {
  IMPLEMENTATIONS_JS[nom] = fn;
}

export async function verifierGoldenVectors() {
  let data;
  try {
    const r = await fetch(URL_GOLDEN);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    data = await r.json();
  } catch (err) {
    console.info('[geostat-js] golden vectors non chargés :', err.message);
    return { ok: true, ignored: true };
  }

  const resultats = { ok: true, total: 0, succes: 0, echecs: [] };
  for (const v of data.vecteurs || []) {
    const fn = IMPLEMENTATIONS_JS[v.fonction];
    if (!fn) continue;   // pas de pendant JS — c'est normal pour certaines fonctions
    resultats.total++;

    let sortie;
    try {
      sortie = fn(v.entrees);
    } catch (e) {
      resultats.ok = false;
      resultats.echecs.push({ id: v.id, raison: 'exception : ' + e.message });
      continue;
    }

    const ok = comparerSorties(sortie, v.sorties, v.tolerance || 1e-6);
    if (ok) {
      resultats.succes++;
    } else {
      resultats.ok = false;
      resultats.echecs.push({ id: v.id, raison: 'divergence numérique' });
    }
  }

  if (resultats.ok && resultats.total > 0) {
    console.info(`[geostat-js] ✓ ${resultats.succes}/${resultats.total} golden vectors vérifiés.`);
  } else if (!resultats.ok) {
    console.error('[geostat-js] ✗ Échecs de golden vectors :', resultats.echecs);
  }
  return resultats;
}

function comparerSorties(actuel, attendu, tolerance) {
  for (const [k, attenduK] of Object.entries(attendu)) {
    const actuelK = actuel[k];
    if (!compareValeurs(actuelK, attenduK, tolerance)) return false;
  }
  return true;
}

function compareValeurs(a, b, tol) {
  if (Array.isArray(b)) {
    if (!Array.isArray(a) || a.length !== b.length) return false;
    for (let i = 0; i < b.length; i++) {
      if (!compareValeurs(a[i], b[i], tol)) return false;
    }
    return true;
  }
  if (typeof b === 'number') {
    if (typeof a !== 'number') return false;
    return Math.abs(a - b) <= tol;
  }
  return a === b;
}

// scripts/geostat-js/loader.js
// -----------------------------------------------------------------------------
// Loader global des widgets geostat_polymtl.
//
// - Un seul IntersectionObserver pour toute la page.
// - Charge dynamiquement (`import(...)`) le module du widget quand sa div entre
//   dans le viewport (avec une marge de 200 px pour pré-chargement).
// - Charge les données pré-calculées éventuelles déclarées via
//   `data-precomputed`.
// - Vérifie les golden vectors une seule fois par page.
// - Bascule sur la figure statique (`data-fallback`) en cas d'erreur.
//
// Convention HTML (voir squelette dans rapport phase 4 §6.1) :
//
//   <div class="geostat-widget"
//        data-widget="<nom_module>"
//        data-precomputed="/_assets/.../data.json"
//        data-fallback="/_assets/.../static.png">
//     <header class="gw-header">…</header>
//     <div class="gw-placeholder">…spinner…</div>
//   </div>
// -----------------------------------------------------------------------------

import { verifierGoldenVectors } from './golden.js';

const REGISTRE = new Map();       // id DOM -> instance Widget
let goldenVerifie = false;

const observer = new IntersectionObserver((entries) => {
  for (const e of entries) {
    const el = e.target;
    if (e.isIntersecting && !REGISTRE.has(el.id)) {
      void monter(el);
    } else if (!e.isIntersecting && REGISTRE.has(el.id)) {
      // Démontage différé pour éviter le yoyo en cas de défilement rapide.
      setTimeout(() => {
        const r = el.getBoundingClientRect();
        const stillVisible = r.bottom > 0 && r.top < innerHeight;
        if (!stillVisible) demonter(el);
      }, 30_000);
    }
  }
}, { rootMargin: '200px 0px' });

async function monter(el) {
  const type = el.dataset.widget;
  if (!type) {
    showError(el, "Attribut data-widget manquant.");
    return;
  }

  try {
    // 1) Vérification des golden vectors une seule fois par page
    if (!goldenVerifie) {
      goldenVerifie = true;
      verifierGoldenVectors().catch((err) => {
        console.warn('[geostat-js] golden vectors :', err);
      });
    }

    // 2) Chargement dynamique du module du widget (cache-busting par horodatage
    //    pour éviter qu'un widget .js périmé reste servi depuis le cache).
    const mod = await import(`./widgets/${type}.js?cb=${Date.now()}`);
    if (!mod.default) {
      throw new Error(`Module widgets/${type}.js doit exposer un export default.`);
    }

    // 3) Chargement éventuel des données pré-calculées
    let data = null;
    if (el.dataset.precomputed) {
      const r = await fetch(el.dataset.precomputed);
      if (!r.ok) throw new Error(`Données pré-calculées indisponibles (HTTP ${r.status})`);
      data = await r.json();
    }

    // 4) Instanciation + montage
    const instance = new mod.default(el, data);
    instance.mount();
    REGISTRE.set(el.id, instance);
  } catch (err) {
    console.error('[geostat-js]', err);
    showFallback(el, err.message);
  }
}

function demonter(el) {
  const inst = REGISTRE.get(el.id);
  if (!inst) return;
  try { inst.destroy(); } catch (e) { console.warn('[geostat-js]', e); }
  REGISTRE.delete(el.id);
}

function showFallback(el, message) {
  const fallback = el.dataset.fallback;
  const widget = el.dataset.widget || 'inconnu';
  const precomp = el.dataset.precomputed;
  // Slug du chapitre pour aider l'utilisateur a regenerer
  const m = location.pathname.match(/chapters\/(C\d{2})\//);
  const slug = m ? m[1] : '';

  el.innerHTML = '';

  // Detecter si c'est le precalc qui manque
  const isPrecomputeMissing = precomp && message && message.includes('HTTP 404');

  if (isPrecomputeMissing) {
    // Message d'erreur informatif specifique au cas precalc manquant
    const div = document.createElement('div');
    div.className = 'gw-error';
    div.innerHTML = `
      <strong>Atelier indisponible :</strong> les donnees pre-calculees sont
      absentes (<code>${precomp}</code>).<br><br>
      <strong>Pour activer cet atelier :</strong><br>
      <ol style="margin:.5em 0; padding-left:1.5em;">
        <li>Generer les donnees :<br>
            <code style="display:inline-block; background:#fff; padding:.15em .4em; border-radius:3px;">geostat-polymtl-precompute -c ${slug}</code></li>
        <li>Relancer <code>quarto render</code> (ou <code>quarto preview</code>).</li>
      </ol>
    `;
    el.appendChild(div);
    return;
  }

  if (fallback) {
    const img = document.createElement('img');
    img.src = fallback;
    img.className = 'gw-fallback-img';
    img.alt = 'figure statique de repli';
    img.onerror = () => { img.style.display = 'none'; };
    el.appendChild(img);
  }
  const note = document.createElement('p');
  note.className = 'gw-fallback-note';
  note.innerHTML = `⚠️ Atelier <code>${widget}</code> indisponible — ${message || ''}`;
  el.appendChild(note);
}

function showError(el, message) {
  const div = document.createElement('div');
  div.className = 'gw-error';
  div.textContent = '⚠ ' + message;
  el.appendChild(div);
}

// Démarrage : observer toutes les divs de widget.
function init() {
  document.querySelectorAll('.geostat-widget').forEach((el) => {
    if (!el.id) {
      el.id = 'gw_' + Math.random().toString(36).slice(2, 10);
    }
    observer.observe(el);
  });
}

// Nettoyage à l'unload
addEventListener('beforeunload', () => {
  REGISTRE.forEach((inst) => { try { inst.destroy(); } catch (e) {} });
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

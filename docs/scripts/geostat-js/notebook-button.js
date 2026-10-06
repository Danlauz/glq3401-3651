// scripts/geostat-js/notebook-button.js
// -----------------------------------------------------------------------------
// Injecte un bloc « Telecharger » en haut a droite de chaque page de chapitre
// (zone .quarto-title-block). Deux boutons :
//
//   📄 PDF (chapitre)    -> /exports/CNN/CNN_<Titre>.pdf
//   📝 DOCX (chapitre)   -> /exports/CNN/CNN_<Titre>.docx
//
// Chaque bouton :
//   - affiche la taille du fichier si disponible (HEAD request) ;
//   - se desactive proprement si le fichier n'existe pas encore (404)
//     avec une legende « non genere » ;
//   - cache les liens vers le PDF/DOCX du LIVRE COMPLET produits par Quarto
//     en mode book (redondants avec les boutons par chapitre).
//
// Le CSS dedie est dans styles/chapter-downloads.css.
// -----------------------------------------------------------------------------

(function () {
  'use strict';

  // Titres de fichiers — DOIVENT correspondre au mapping CHAPITRES de
  // scripts/build_chapter_exports.py (qui produit exports/CNN/CNN_<Titre>.<fmt>).
  const TITRES = {
    C01: 'NI43101',
    C02: 'Lane',
    C03: 'Gy',
    C04: 'Traitement_statistique',
    C05: 'Methodes_conventionnelles',
    C06: 'Effets',
    C07: 'Variogramme',
    C08: 'Variance_bloc',
    C09: 'Krigeage',
    C10: 'Cokrigeage',
    C11: 'Indicatrices',
    C12: 'Simulations',
    C13: 'Multipoints',
  };

  function getChapterSlug() {
    const m = location.pathname.match(/chapters\/(C\d{2})\//);
    return m ? m[1] : null;
  }

  function formatSize(bytes) {
    if (bytes == null || !isFinite(bytes)) return '';
    if (bytes < 1024) return bytes + ' o';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' ko';
    return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
  }

  // Verifie l'existence d'un fichier via HEAD. Retourne la taille (octets) ou null.
  async function checkFile(href) {
    try {
      const r = await fetch(href, { method: 'HEAD', cache: 'no-cache' });
      if (!r.ok) return null;
      const cl = r.headers.get('content-length');
      return cl ? parseInt(cl, 10) : 0;
    } catch (e) {
      return null;
    }
  }

  function buildButton({ href, icon, label, fileName, tooltip }) {
    const a = document.createElement('a');
    a.href = href;
    a.className = 'geostat-dl-btn';
    a.download = fileName;
    a.title = tooltip;
    a.innerHTML = `
      <span class="geostat-dl-btn__icon">${icon}</span>
      <span class="geostat-dl-btn__text">${label}</span>
      <span class="geostat-dl-btn__size"></span>
    `;
    return a;
  }

  function setDisabled(btn, reason) {
    btn.classList.add('is-disabled');
    btn.removeAttribute('href');
    btn.removeAttribute('download');
    btn.title = reason || 'Fichier non encore genere — relancer build_chapter_exports.py';
    btn.addEventListener('click', (e) => e.preventDefault());
  }

  function setSize(btn, bytes) {
    const span = btn.querySelector('.geostat-dl-btn__size');
    if (span && bytes != null) span.textContent = formatSize(bytes);
  }

  function findInsertionPoint() {
    return (
      document.querySelector('.quarto-title-block') ||
      document.querySelector('#title-block-header') ||
      document.querySelector('header.quarto-title-block') ||
      document.querySelector('main > h1')?.parentElement
    );
  }

  async function inject() {
    const slug = getChapterSlug();
    if (!slug) return;
    const base = location.pathname.replace(/[/]chapters[/].*$/, '');   // prefixe du site (GitHub Pages)

    const host = findInsertionPoint();
    if (!host) return;
    if (host.querySelector('.geostat-downloads')) return;   // doublon

    const titre = TITRES[slug] || slug;

    const wrap = document.createElement('div');
    wrap.className = 'geostat-downloads';
    wrap.innerHTML = '<div class="geostat-downloads__label">Telecharger</div>';

    const btnPdf = buildButton({
      href: `${base}/exports/${slug}/${slug}_${titre}.pdf`,
      icon: '📄',
      label: 'PDF chapitre',
      fileName: `${slug}_${titre}.pdf`,
      tooltip: 'Telecharger ce chapitre en PDF',
    });
    const btnDocx = buildButton({
      href: `${base}/exports/${slug}/${slug}_${titre}.docx`,
      icon: '📝',
      label: 'DOCX chapitre',
      fileName: `${slug}_${titre}.docx`,
      tooltip: 'Telecharger ce chapitre en Word',
    });
    wrap.appendChild(btnPdf);
    wrap.appendChild(btnDocx);

    host.appendChild(wrap);

    // Cacher les liens natifs vers le livre complet
    document.querySelectorAll('.quarto-other-formats a, nav.quarto-other-formats a, .quarto-alternate-formats a')
      .forEach((a) => {
        const h = (a.getAttribute('href') || '').toLowerCase();
        if (h.endsWith('.pdf') || h.endsWith('.docx')) {
          const parent = a.closest('.quarto-other-formats, .quarto-alternate-formats, nav.quarto-other-formats');
          if (parent) parent.style.display = 'none';
        }
      });

    // Verification asynchrone de l'existence des fichiers
    const checks = [
      { btn: btnPdf,  href: btnPdf.href },
      { btn: btnDocx, href: btnDocx.href },
    ];

    for (const { btn, href } of checks) {
      checkFile(href).then((size) => {
        if (size === null) {
          setDisabled(btn);
        } else {
          setSize(btn, size);
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();

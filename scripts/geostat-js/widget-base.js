// scripts/geostat-js/widget-base.js
// -----------------------------------------------------------------------------
// Classe de base pour tous les widgets interactifs du site.
//
// Conventions :
//   - chaque widget concret hérite de `Widget` et implémente `render()`.
//   - les listeners enregistrés via `this.on(...)` sont nettoyés automatiquement
//     dans `destroy()`.
//   - les frames d'animation enregistrées via `this.anim(...)` sont annulées
//     dans `destroy()`.
//   - `this.garde(condition, message)` arrête le calcul si un plafond est
//     atteint (ex : trop de points, grille trop grande).
//
// L'API est volontairement minimale pour rester portable côté Pyodide plus tard.
// -----------------------------------------------------------------------------

export class Widget {
  constructor(el, data) {
    this.el = el;                  // div racine du widget
    this.data = data || null;      // données pré-calculées (si déclarées)
    this._listeners = [];
    this._anims = [];
    this._destroyed = false;
  }

  mount() {
    // Retire le placeholder de chargement.
    const ph = this.el.querySelector('.gw-placeholder');
    if (ph) ph.remove();
    this.render();
  }

  // À surcharger par chaque widget concret.
  render() {
    throw new Error('Widget.render() doit être surchargé.');
  }

  // Méthode optionnelle, appelée par destroy() avant le nettoyage commun.
  // À surcharger si le widget tient des ressources spécifiques
  // (ex : Plotly.purge(...), close de WebGL, etc.).
  cleanup() {
    /* défaut : rien */
  }

  // ---------------------------------------------------------------------------
  // Helpers de cycle de vie
  // ---------------------------------------------------------------------------

  /** Enregistre un listener nettoyé automatiquement à destroy(). */
  on(target, eventName, handler, opts) {
    target.addEventListener(eventName, handler, opts);
    this._listeners.push([target, eventName, handler, opts]);
    return handler;
  }

  /** Enregistre une animation nettoyée automatiquement à destroy(). */
  anim(callback) {
    const id = requestAnimationFrame((ts) => {
      if (!this._destroyed) callback(ts);
    });
    this._anims.push(id);
    return id;
  }

  // ---------------------------------------------------------------------------
  // Plafonds pédagogiques (cf. rapport phase 3 §4.3)
  // ---------------------------------------------------------------------------

  /** Lève une exception ET affiche un encadré jaune si la condition échoue. */
  garde(condition, message) {
    if (condition) return;
    this.afficherAvertissement(message);
    throw new Error(`[geostat-widget] plafond atteint : ${message}`);
  }

  afficherAvertissement(message) {
    const div = document.createElement('div');
    div.className = 'gw-heavy-warning';
    div.textContent = `⚠ ${message}`;
    this.el.appendChild(div);
  }

  /** Affiche une erreur d'exécution VISIBLE dans le widget (au lieu de la cacher). */
  afficherErreur(message) {
    // Réutilise un encart existant si déjà présent (évite l'accumulation)
    let div = this.el.querySelector('.gw-runtime-error');
    if (!div) {
      div = document.createElement('div');
      div.className = 'gw-runtime-error';
      div.style.cssText = 'margin:8px 12px;padding:8px 12px;border:1px solid #f5c6cb;background:#fdecec;color:#721c24;border-radius:6px;font-family:monospace;font-size:11px;line-height:1.4;';
      this.el.appendChild(div);
    }
    div.textContent = '⚠ ' + message;
  }

  /** Wrap d'une fonction async pour afficher visiblement toute erreur. */
  async tryShow(fn) {
    try {
      const out = await fn();
      // Si succès, retire l'éventuel ancien message d'erreur.
      const e = this.el.querySelector('.gw-runtime-error');
      if (e) e.remove();
      return out;
    } catch (err) {
      console.error('[widget]', err);
      this.afficherErreur((err && err.message) ? err.message : String(err));
      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  // Nettoyage (appelé par le loader)
  // ---------------------------------------------------------------------------

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;

    // 1) appel du cleanup spécifique au widget
    try { this.cleanup(); } catch (e) { console.warn('[geostat-js]', e); }

    // 2) listeners
    for (const [t, ev, fn, opts] of this._listeners) {
      try { t.removeEventListener(ev, fn, opts); } catch (e) { /* ignore */ }
    }
    this._listeners = [];

    // 3) animations
    for (const id of this._anims) {
      try { cancelAnimationFrame(id); } catch (e) { /* ignore */ }
    }
    this._anims = [];

    // 4) on ne vide PAS this.el — le loader décide selon le contexte
  }
}

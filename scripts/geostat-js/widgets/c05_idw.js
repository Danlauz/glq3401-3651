// scripts/geostat-js/widgets/c05_idw.js
// -----------------------------------------------------------------------------
// Widget « Inverse de la distance (IDW) » (C05-W3)
// Source de vérité : geostat_polymtl.conventional.idw.idw
//
// Voisinage de recherche : CERCLE ou ELLIPSE. Avec un champ anisotrope
// (aₓ ≠ aᵧ), le cercle va chercher des données dans la direction où la
// corrélation est faible ; l'ellipse, alignée sur la direction de grande
// continuité, ne retient que les données réellement informatives. En ellipse,
// les POIDS utilisent aussi la distance normalisée par l'ellipse (IDW
// anisotrope) ; pour un cercle on retrouve exactement l'IDW classique.
//
// Survoler une carte montre le voisinage à cet endroit et les données qu'il
// retient. Le bilan compare la RMSE à celle d'un cercle de MÊME SURFACE, pour
// que la comparaison porte sur la forme et non sur la taille.
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { GRF, cm, idwAniso, tracerEllipse, computeError } from './c05_lib.js';
import { afficherChargementJusquaPret } from '../pyodide_setup.js';

const W=430, H=340;
const R_INF = 300;   // position du curseur qui signifie « rayon infini »

export default class C05Idw extends Widget {
  render() {
    const grad = Array.from({length:11},(_,i)=>{const c=cm(i/10);return `rgb(${c[0]},${c[1]},${c[2]})`;}).join(',');
    const id = this.el.id;
    this.el.insertAdjacentHTML('beforeend', `
      <div style="display:flex;gap:4px;margin-bottom:8px;">
        <canvas id="${id}_cT" width="${W}" height="${H}"
          style="border:1px solid #ccc;border-radius:4px;cursor:crosshair;flex:1;max-width:50%"></canvas>
        <canvas id="${id}_cE" width="${W}" height="${H}"
          style="border:1px solid #ccc;border-radius:4px;cursor:crosshair;flex:1;max-width:50%"></canvas>
      </div>
      <div style="display:flex;gap:16px;font-size:0.78rem;font-family:'JetBrains Mono',monospace;color:#666;margin-bottom:6px;">
        <span>◀ <b>Réalité</b> (champ gaussien)</span>
        <span style="margin-left:auto"><b>Estimation</b> (inverse de la distance) ▶</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;font-size:.72rem;color:#555;margin:0 2px 8px;">
        <span style="font-weight:600;white-space:nowrap;">Teneur (%)</span>
        <div style="flex:1;">
          <div style="height:12px;border:1px solid #bbb;border-radius:3px;background:linear-gradient(to right, ${grad});"></div>
          <div style="display:flex;justify-content:space-between;font-size:.66rem;color:#777;margin-top:1px;">
            <span>0</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span><span>9</span><span>10</span>
          </div>
        </div>
      </div>
      <div class="gw-controls">
        <div class="gw-slider"><label>b :</label><input type="range" id="${id}_b" min="0" max="60" value="20" step="1"><span id="${id}_bv">2.0</span></div>
        <button id="${id}_btnAdd">+ 8 pts</button>
        <button id="${id}_btnRst">Nouveau champ</button>
        <span id="${id}_err" style="min-width:200px;font-size:0.78rem">—</span>
      </div>
      <div class="gw-controls" style="margin-top:2px;background:#eef4ea;">
        <span style="font-weight:600;font-size:.74rem;">Recherche :</span>
        <select id="${id}_forme" style="font-size:.72rem;">
          <option value="cercle">Cercle</option>
          <option value="ellipse">Ellipse</option>
        </select>
        <div class="gw-slider"><label style="font-size:.72rem;">Rayon R :</label><input type="range" id="${id}_r" min="30" max="${R_INF}" value="${R_INF}" step="5" style="width:90px;"><span id="${id}_rv" style="font-size:.7rem;">∞</span></div>
        <div class="gw-slider js-ell"><label style="font-size:.72rem;">Rapport r/R :</label><input type="range" id="${id}_rap" min="10" max="100" value="100" step="5" style="width:70px;"><span id="${id}_rapv" style="font-size:.7rem;">1,00</span></div>
        <div class="gw-slider js-ell"><label style="font-size:.72rem;">Angle θ :</label><input type="range" id="${id}_ang" min="0" max="175" value="0" step="5" style="width:70px;"><span id="${id}_angv" style="font-size:.7rem;">0°</span></div>
        <button id="${id}_ajuster" class="js-ell" style="font-size:.72rem;">Ajuster au champ</button>
      </div>
      <div class="gw-controls" style="margin-top:2px;background:#e8edf2;">
        <span style="font-weight:600;font-size:.74rem;">Champ :</span>
        <select id="${id}_gm" style="font-size:.72rem;"><option value="exponentiel">Exponentiel</option><option value="spherique">Sphérique</option><option value="gaussien">Gaussien</option></select>
        <div class="gw-slider"><label style="font-size:.72rem;">aₓ:</label><input type="range" id="${id}_px" min="20" max="250" value="130" style="width:60px;"><span id="${id}_pxv" style="font-size:.7rem;">130</span></div>
        <div class="gw-slider"><label style="font-size:.72rem;">aᵧ:</label><input type="range" id="${id}_py" min="20" max="250" value="130" style="width:60px;"><span id="${id}_pyv" style="font-size:.7rem;">130</span></div>
        <div class="gw-slider"><label style="font-size:.72rem;">c₀:</label><input type="range" id="${id}_ng" min="0" max="50" value="0" style="width:50px;"><span id="${id}_ngv" style="font-size:.7rem;">0%</span></div>
      </div>
      <div id="${id}_cmp" style="font-size:.76rem;color:#444;margin:4px 2px 0;font-family:'JetBrains Mono',monospace;"></div>
      <p style="font-size:.72rem;color:#666;margin:4px 2px 0;">
        Survolez une carte pour voir le voisinage de recherche et les données retenues (cerclées de rouge).
        Rendez le champ anisotrope (par exemple aₓ = 240, aᵧ = 40), fixez un rayon fini, puis comparez
        <b>Cercle</b> et <b>Ellipse</b> : l'ellipse allongée dans la direction de grande continuité
        va chercher les données qui ressemblent vraiment au point estimé.</p>
    `);

    this.ctxT = document.getElementById(`${id}_cT`).getContext('2d');
    this.ctxE = document.getElementById(`${id}_cE`).getContext('2d');
    this.cvsT = document.getElementById(`${id}_cT`);
    this.cvsE = document.getElementById(`${id}_cE`);
    this.bI   = document.getElementById(`${id}_b`);
    this.rI   = document.getElementById(`${id}_r`);
    this.bv   = document.getElementById(`${id}_bv`);
    this.rv   = document.getElementById(`${id}_rv`);
    this.errEl= document.getElementById(`${id}_err`);
    this.cmpEl= document.getElementById(`${id}_cmp`);
    this.formeSel = document.getElementById(`${id}_forme`);
    this.rapI = document.getElementById(`${id}_rap`);
    this.angI = document.getElementById(`${id}_ang`);
    this.pts=[]; this.bP=2; this.rM=Infinity; this.survol=null;

    this.on(this.cvsT, 'click', e => this._handler(e));
    this.on(this.cvsE, 'click', e => this._handler(e));
    for (const c of [this.cvsT, this.cvsE]) {
      this.on(c, 'mousemove', e => this._survoler(e));
      this.on(c, 'mouseleave', () => { this.survol = null; this._superposer(); });
    }
    this.on(this.bI, 'input', e => { this.bP=e.target.value/10; this.bv.textContent=this.bP.toFixed(1); this._drawEstim(); });
    this.on(this.rI, 'input', e => {
      const v = +e.target.value;
      this.rM = v >= R_INF ? Infinity : v;
      this.rv.textContent = v >= R_INF ? '∞' : v + ' px';
      this._drawEstim();
    });
    this.on(this.formeSel, 'change', () => { this._majFormeUI(); this._drawEstim(); });
    this.on(this.rapI, 'input', e => { document.getElementById(`${id}_rapv`).textContent = (e.target.value/100).toFixed(2).replace('.', ','); this._drawEstim(); });
    this.on(this.angI, 'input', e => { document.getElementById(`${id}_angv`).textContent = e.target.value + '°'; this._drawEstim(); });
    this.on(document.getElementById(`${id}_ajuster`), 'click', () => this._ajusterAuChamp());
    this.on(document.getElementById(`${id}_btnAdd`), 'click', () => this._addRandom(8));
    this.on(document.getElementById(`${id}_btnRst`), 'click', () => this._reset());
    for (const [suf,disp] of [['px','pxv'],['py','pyv']]) {
      this.on(document.getElementById(`${id}_${suf}`), 'input', e => { document.getElementById(`${id}_${disp}`).textContent=e.target.value; });
    }
    this.on(document.getElementById(`${id}_ng`), 'input', e => { document.getElementById(`${id}_ngv`).textContent=e.target.value+'%'; });
    // Changer le modèle, les portées ou la pépite RÉGÉNÈRE le champ avec la même
    // graine : seule la covariance change, pas le tirage aléatoire. Les points
    // déjà échantillonnés gardent leur position et relisent la nouvelle réalité.
    this.seed = Math.floor(Math.random() * 1e9);
    this.on(document.getElementById(`${id}_gm`), 'change', () => this._regenerer());
    for (const suf of ['px', 'py', 'ng']) {
      this.on(document.getElementById(`${id}_${suf}`), 'input', () => this._regenerer());
    }
    this._majFormeUI();

    afficherChargementJusquaPret(this.el).then(async () => {
      this.grf = await this._mkGrf();
      this._drawTruth(); this._drawEstim();
    });
  }

  async _mkGrf() {
    const id=this.el.id;
    return await GRF.create(W,H,{
      modele:   document.getElementById(`${id}_gm`).value,
      portee_x: +document.getElementById(`${id}_px`).value,
      portee_y: +document.getElementById(`${id}_py`).value,
      pepite:   +document.getElementById(`${id}_ng`).value/100,
      seed:     this.seed,
    });
  }

  // ---------------------------------------------------------------------------
  // Voisinage de recherche
  // ---------------------------------------------------------------------------

  /**
   * Paramètres courants du voisinage. L'angle est affiché dans le sens
   * trigonométrique habituel (y vers le HAUT) ; le canevas ayant y vers le bas,
   * on l'inverse avant de calculer ou de dessiner.
   */
  _voisinage() {
    const ell = this.formeSel.value === 'ellipse';
    return {
      ell,
      R: this.rM,
      rapport: ell ? +this.rapI.value / 100 : 1,
      angCanvas: ell ? -(+this.angI.value) : 0,
    };
  }

  _estimateur(v = this._voisinage()) {
    return (x, y) => idwAniso(x, y, this.pts, this.bP, v.R, v.rapport, v.angCanvas);
  }

  _majFormeUI() {
    const ell = this.formeSel.value === 'ellipse';
    for (const n of this.el.querySelectorAll('.js-ell')) n.style.display = ell ? '' : 'none';
  }

  /** Oriente l'ellipse sur l'anisotropie du champ : grand axe selon la plus grande portée. */
  _ajusterAuChamp() {
    const id = this.el.id;
    const ax = +document.getElementById(`${id}_px`).value;
    const ay = +document.getElementById(`${id}_py`).value;
    const rap = Math.min(ax, ay) / Math.max(ax, ay);
    const ang = ax >= ay ? 0 : 90;
    this.rapI.value = Math.max(10, Math.round(rap * 100 / 5) * 5);
    this.angI.value = ang;
    document.getElementById(`${id}_rapv`).textContent = (this.rapI.value / 100).toFixed(2).replace('.', ',');
    document.getElementById(`${id}_angv`).textContent = ang + '°';
    this._drawEstim();
  }

  // ---------------------------------------------------------------------------
  // Dessin
  // ---------------------------------------------------------------------------
  _drawTruth() {
    this.grf.drawTo(this.ctxT);
    for (const p of this.pts) {
      this.ctxT.beginPath(); this.ctxT.arc(p.x,p.y,4,0,Math.PI*2);
      this.ctxT.fillStyle='#fff'; this.ctxT.fill(); this.ctxT.strokeStyle='#000'; this.ctxT.lineWidth=1.5; this.ctxT.stroke();
    }
    this.ctxT.fillStyle='rgba(255,255,255,0.7)'; this.ctxT.fillRect(4,4,70,18);
    this.ctxT.fillStyle='#333'; this.ctxT.font='bold 10px JetBrains Mono'; this.ctxT.fillText('RÉALITÉ',8,16);
    this._fondT = this.ctxT.getImageData(0, 0, W, H);
    this._superposer();
  }

  _drawEstim() {
    const cE=this.ctxE, pts=this.pts;
    if (!pts.length) {
      cE.fillStyle='#f5f3ef'; cE.fillRect(0,0,W,H);
      cE.fillStyle='#aaa'; cE.font='13px Source Serif 4'; cE.textAlign='center'; cE.fillText('Cliquez pour échantillonner',W/2,H/2); cE.textAlign='start';
      this._fondE = cE.getImageData(0, 0, W, H);
      this.cmpEl.textContent = '';
      return;
    }
    const v = this._voisinage(), f = this._estimateur(v);
    const s=4, img=cE.createImageData(W,H), d=img.data;
    let nNan=0, nTot=0;
    for (let y=0;y<H;y+=s) for (let x=0;x<W;x+=s) {
      const val=f(x,y);
      const fini=Number.isFinite(val), c=cm(val);
      nTot++; if(!fini) nNan++;
      const alpha=fini?220:70; // zones sans donnée dans le voisinage : grisé translucide
      for (let dy=0;dy<s&&y+dy<H;dy++) for (let dx=0;dx<s&&x+dx<W;dx++) {
        const o=((y+dy)*W+(x+dx))*4; d[o]=c[0]; d[o+1]=c[1]; d[o+2]=c[2]; d[o+3]=alpha;
      }
    }
    cE.putImageData(img,0,0);
    this._nanFrac = nTot ? nNan/nTot : 0;
    for (const p of pts) {
      cE.beginPath(); cE.arc(p.x,p.y,4,0,Math.PI*2); cE.fillStyle='#fff'; cE.fill();
      cE.strokeStyle='#000'; cE.lineWidth=1.5; cE.stroke();
      cE.fillStyle='#222'; cE.font='10px JetBrains Mono'; cE.fillText((p.t*10).toFixed(1)+'%',p.x+6,p.y-5);
    }
    cE.fillStyle='rgba(255,255,255,0.7)'; cE.fillRect(W-82,4,78,18);
    cE.fillStyle='#333'; cE.font='bold 10px JetBrains Mono'; cE.fillText('ESTIMATION',W-78,16);
    this._fondE = cE.getImageData(0, 0, W, H);

    const err = computeError(this.grf, f, W, H, 8);
    let msg = Number.isFinite(err.rmse) ? `Biais: ${(err.biais*10).toFixed(3)}% | RMSE: ${(err.rmse*10).toFixed(3)}%` : 'Aucune estimation possible.';
    if (this._nanFrac > 0.02) msg += ` · ⚠ ${(100*this._nanFrac).toFixed(0)}% du domaine sans estimation (voisinage trop petit)`;
    this.errEl.textContent = msg;
    this._comparer(v, err);
    this._superposer();
  }

  /**
   * En ellipse : compare avec un cercle de MÊME SURFACE (rayon √(R·r)), pour
   * isoler l'effet de la forme. Couverture affichée : la RMSE n'est calculée
   * que là où une estimation existe.
   */
  _comparer(v, err) {
    if (!v.ell || v.rapport >= 0.999) {
      this.cmpEl.innerHTML = Number.isFinite(v.R) ? '' :
        '<span style="color:#888">Rayon infini : toutes les données servent partout ; en ellipse, seule la forme des poids change.</span>';
      return;
    }
    const Rc = Number.isFinite(v.R) ? Math.sqrt(v.R * v.R * v.rapport) : Infinity;
    const cercle = { ell: false, R: Rc, rapport: 1, angCanvas: 0 };
    const errC = computeError(this.grf, this._estimateur(cercle), W, H, 8);
    const couv = vv => {
      const f = this._estimateur(vv); let n = 0, ok = 0;
      for (let y = 0; y < H; y += 8) for (let x = 0; x < W; x += 8) { n++; if (Number.isFinite(f(x, y))) ok++; }
      return Math.round(100 * ok / n);
    };
    const fmt = e => Number.isFinite(e.rmse) ? (e.rmse * 10).toFixed(3) + '%' : '—';
    const gain = (Number.isFinite(err.rmse) && Number.isFinite(errC.rmse) && errC.rmse > 0)
      ? Math.round(100 * (errC.rmse - err.rmse) / errC.rmse) : null;
    const rTxt = Number.isFinite(Rc) ? `rayon ${Rc.toFixed(0)} px` : 'rayon ∞';
    this.cmpEl.innerHTML =
      `Ellipse : RMSE <b>${fmt(err)}</b> (couverture ${couv(v)} %) &nbsp;|&nbsp; ` +
      `Cercle de même surface (${rTxt}) : RMSE <b>${fmt(errC)}</b> (couverture ${couv(cercle)} %)` +
      (gain !== null ? ` &nbsp;→&nbsp; <b style="color:${gain > 0 ? '#1f7a3a' : '#b03a2e'}">${gain > 0 ? '−' : '+'}${Math.abs(gain)} %</b> d'erreur avec l'ellipse` : '');
  }

  _survoler(e) {
    const r = e.target.getBoundingClientRect();
    this.survol = { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
    this._superposer();
  }

  /** Redessine les fonds mis en cache puis le voisinage au point survolé. */
  _superposer() {
    if (this._fondT) this.ctxT.putImageData(this._fondT, 0, 0);
    if (this._fondE) this.ctxE.putImageData(this._fondE, 0, 0);
    if (!this.survol || !this.pts.length) return;
    const v = this._voisinage(), { x, y } = this.survol;
    const t = v.angCanvas * Math.PI / 180, ct = Math.cos(t), st = Math.sin(t);
    const fini = Number.isFinite(v.R);
    for (const ctx of [this.ctxT, this.ctxE]) {
      if (fini) {
        tracerEllipse(ctx, x, y, v.R, v.rapport, v.angCanvas);
        ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fill();
        ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.stroke();
        ctx.lineWidth = 1.6; ctx.setLineDash([6, 4]); ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.setLineDash([]);
      }
      for (const p of this.pts) {
        const dx = p.x - x, dy = p.y - y;
        const u = (dx * ct + dy * st) / (fini ? v.R : 1);
        const w = (-dx * st + dy * ct) / (fini ? v.R * v.rapport : 1);
        if (fini && u * u + w * w > 1) continue;
        ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, 2 * Math.PI);
        ctx.lineWidth = 2.4; ctx.strokeStyle = '#d81b1b'; ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x + 6, y); ctx.moveTo(x, y - 6); ctx.lineTo(x, y + 6);
      ctx.lineWidth = 2; ctx.strokeStyle = '#d81b1b'; ctx.stroke();
    }
  }

  // ---------------------------------------------------------------------------
  // Données
  // ---------------------------------------------------------------------------
  _addPt(x,y) { this.pts.push({x,y,t:this.grf.at(x,y)}); this._drawTruth(); this._drawEstim(); }

  _handler(e) {
    const r=e.target.getBoundingClientRect();
    this._addPt((e.clientX-r.left)*(W/r.width),(e.clientY-r.top)*(H/r.height));
  }

  _addRandom(n) { for(let i=0;i<n;i++) this._addPt(30+Math.random()*(W-60),30+Math.random()*(H-60)); }

  async _reset() { this.seed=Math.floor(Math.random()*1e9); this.pts=[]; this.grf=await this._mkGrf(); this._drawTruth(); this._drawEstim(); }

  /** Régénère le champ (même graine) après un changement de covariance. */
  _regenerer() {
    clearTimeout(this._tRegen);
    this._tRegen = setTimeout(async () => {
      const jeton = (this._jetonRegen = (this._jetonRegen || 0) + 1);
      let grf;
      try { grf = await this._mkGrf(); }
      catch (e) { this.afficherErreur('Simulation du champ : ' + (e && e.message ? e.message : e)); return; }
      if (jeton !== this._jetonRegen || this._destroyed) return;   // réglage plus récent, ou widget fermé
      this.grf = grf;
      for (const p of this.pts) p.t = grf.at(p.x, p.y);
      this._drawTruth(); this._drawEstim();
    }, 250);
  }
}

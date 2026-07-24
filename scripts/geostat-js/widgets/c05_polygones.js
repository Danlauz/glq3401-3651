// scripts/geostat-js/widgets/c05_polygones.js
// -----------------------------------------------------------------------------
// Widget « Polygones de Thiessen / Voronoï » (C05-W1)
// Source de vérité : geostat_polymtl.conventional.polygones.plus_proche_voisin
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { afficherChargementJusquaPret } from '../pyodide_setup.js';
import { GRF, cm, cmA, del, voronoiEdges, nn, computeError } from './c05_lib.js';

const WP = 430, HP = 340;

export default class C05Polygones extends Widget {
  render() {
    const grad = Array.from({length:11},(_,i)=>{const c=cm(i/10);return `rgb(${c[0]},${c[1]},${c[2]})`;}).join(',');
    this.el.insertAdjacentHTML('beforeend', `
      <div style="display:flex;gap:4px;margin-bottom:8px;">
        <canvas id="${this.el.id}_cT" width="${WP}" height="${HP}"
          style="border:1px solid #ccc;border-radius:4px;cursor:crosshair;flex:1;max-width:50%"></canvas>
        <canvas id="${this.el.id}_cE" width="${WP}" height="${HP}"
          style="border:1px solid #ccc;border-radius:4px;cursor:crosshair;flex:1;max-width:50%"></canvas>
      </div>
      <div style="display:flex;gap:16px;font-size:0.78rem;font-family:'JetBrains Mono',monospace;color:#666;margin-bottom:6px;">
        <span>◀ <b>Réalité</b> (champ gaussien caché)</span>
        <span style="margin-left:auto"><b>Estimation</b> (polygones de Thiessen) ▶</span>
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
        <label>Afficher :</label>
        <select id="${this.el.id}_show">
          <option value="voronoi">Polygones colorés</option>
          <option value="bisect" selected>Polygones + médiatrices</option>
          <option value="delaunay">Delaunay + médiatrices</option>
        </select>
        <label style="font-size:.78rem;font-weight:600;display:inline-flex;align-items:center;gap:4px;"><input type="checkbox" id="${this.el.id}_delau"> Triangulation de Delaunay</label>
        <button id="${this.el.id}_btnAdd">+ 8 points</button>
        <button id="${this.el.id}_btnRst">Nouveau champ + reset</button>
        <span id="${this.el.id}_err" style="min-width:200px;font-size:0.78rem">—</span>
      </div>
      <div class="gw-controls" style="margin-top:2px;background:#e8edf2;">
        <span style="font-weight:600;font-size:.74rem;">Champ :</span>
        <select id="${this.el.id}_gm" style="font-size:.72rem;"><option>Exponentiel</option><option>Sphérique</option><option>Gaussien</option></select>
        <div class="gw-slider"><label style="font-size:.72rem;">aₓ:</label><input type="range" id="${this.el.id}_px" min="20" max="250" value="130" style="width:60px;"><span id="${this.el.id}_pxv" style="font-size:.7rem;">130</span></div>
        <div class="gw-slider"><label style="font-size:.72rem;">aᵧ:</label><input type="range" id="${this.el.id}_py" min="20" max="250" value="130" style="width:60px;"><span id="${this.el.id}_pyv" style="font-size:.7rem;">130</span></div>
        <div class="gw-slider"><label style="font-size:.72rem;">c₀:</label><input type="range" id="${this.el.id}_ng" min="0" max="50" value="0" style="width:50px;"><span id="${this.el.id}_ngv" style="font-size:.7rem;">0%</span></div>
      </div>
      <div class="gw-stats" id="${this.el.id}_st">Cliquez sur un canevas pour échantillonner le champ gaussien.</div>
    `);

    const id = this.el.id;
    this.cT = document.getElementById(`${id}_cT`);
    this.cE = document.getElementById(`${id}_cE`);
    this.ctxT = this.cT.getContext('2d');
    this.ctxE = this.cE.getContext('2d');
    this.showSel = document.getElementById(`${id}_show`);
    this.delauChk = document.getElementById(`${id}_delau`);
    this.errEl   = document.getElementById(`${id}_err`);
    this.stEl    = document.getElementById(`${id}_st`);
    this.pts = [];
    this.grf = null;

    this.on(this.cT,  'click', e => this._handler(e));
    this.on(this.cE,  'click', e => this._handler(e));
    this.on(this.showSel, 'change', () => this._drawEstim());
    this.on(this.delauChk, 'change', () => this._drawEstim());
    this.on(document.getElementById(`${id}_btnAdd`), 'click', () => this._addRandom(8));
    this.on(document.getElementById(`${id}_btnRst`), 'click', () => this._reset());
    for (const [suf, disp] of [['px','pxv'],['py','pyv']]) {
      this.on(document.getElementById(`${id}_${suf}`), 'input', e => { document.getElementById(`${id}_${disp}`).textContent = e.target.value; });
    }
    this.on(document.getElementById(`${id}_ng`), 'input', e => { document.getElementById(`${id}_ngv`).textContent = e.target.value+'%'; });

    // Attendre Pyodide puis simuler la « vraie » réalité via GFFTMA
    afficherChargementJusquaPret(this.el).then(async () => {
      this.grf = await this._mkGrf();
      this._drawTruth();
      this._drawEstim();
    });
  }

  async _mkGrf() {
    const id = this.el.id;
    return await GRF.create(WP, HP, {
      modele:   document.getElementById(`${id}_gm`).value,
      portee_x: +document.getElementById(`${id}_px`).value,
      portee_y: +document.getElementById(`${id}_py`).value,
      pepite:   +document.getElementById(`${id}_ng`).value / 100,
    });
  }

  _drawTruth() {
    this.grf.drawTo(this.ctxT, 1);
    for (const p of this.pts) {
      this.ctxT.beginPath(); this.ctxT.arc(p.x,p.y,4,0,Math.PI*2);
      this.ctxT.fillStyle='#fff'; this.ctxT.fill();
      this.ctxT.strokeStyle='#000'; this.ctxT.lineWidth=1.5; this.ctxT.stroke();
    }
    this.ctxT.fillStyle='rgba(255,255,255,0.7)'; this.ctxT.fillRect(4,4,70,18);
    this.ctxT.fillStyle='#333'; this.ctxT.font='bold 10px JetBrains Mono'; this.ctxT.fillText('RÉALITÉ',8,16);
  }

  _drawEstim() {
    const ctxE = this.ctxE, pts = this.pts, mode = this.showSel.value;
    ctxE.clearRect(0,0,WP,HP);
    if (pts.length > 0) {
      const img = ctxE.createImageData(WP,HP), d=img.data;
      for (let y=0;y<HP;y++) for (let x=0;x<WP;x++) {
        const i=nn(x,y,pts), c=cm(pts[i].t), o=(y*WP+x)*4;
        d[o]=c[0]; d[o+1]=c[1]; d[o+2]=c[2]; d[o+3]=200;
      }
      ctxE.putImageData(img,0,0);
    } else {
      ctxE.fillStyle='#f5f3ef'; ctxE.fillRect(0,0,WP,HP);
      ctxE.fillStyle='#aaa'; ctxE.font='13px Source Serif 4,serif'; ctxE.textAlign='center';
      ctxE.fillText('Cliquez pour échantillonner',WP/2,HP/2); ctxE.textAlign='start';
    }
    if (pts.length >= 3) {
      const tris = del(pts);
      if (mode==='delaunay'||mode==='bisect') {
        const vedges = voronoiEdges(pts, tris, WP, HP);
        ctxE.save(); ctxE.beginPath(); ctxE.rect(0,0,WP,HP); ctxE.clip();
        ctxE.setLineDash([4,3]); ctxE.strokeStyle='rgba(255,255,255,0.7)'; ctxE.lineWidth=1.2;
        for (const e of vedges) { ctxE.beginPath(); ctxE.moveTo(e.x1,e.y1); ctxE.lineTo(e.x2,e.y2); ctxE.stroke(); }
        ctxE.setLineDash([]); ctxE.restore();
      }
      if (mode==='delaunay' || this.delauChk.checked) {
        ctxE.strokeStyle='rgba(0,0,0,0.5)'; ctxE.lineWidth=1.2;
        for (const [a,b,c] of tris) { ctxE.beginPath(); ctxE.moveTo(pts[a].x,pts[a].y); ctxE.lineTo(pts[b].x,pts[b].y); ctxE.lineTo(pts[c].x,pts[c].y); ctxE.closePath(); ctxE.stroke(); }
      }
    }
    for (const p of pts) {
      ctxE.beginPath(); ctxE.arc(p.x,p.y,4,0,Math.PI*2);
      ctxE.fillStyle='#fff'; ctxE.fill(); ctxE.strokeStyle='#000'; ctxE.lineWidth=1.5; ctxE.stroke();
      ctxE.fillStyle='#222'; ctxE.font='10px JetBrains Mono'; ctxE.fillText((p.t*10).toFixed(1)+'%',p.x+6,p.y-5);
    }
    ctxE.fillStyle='rgba(255,255,255,0.7)'; ctxE.fillRect(WP-82,4,78,18);
    ctxE.fillStyle='#333'; ctxE.font='bold 10px JetBrains Mono'; ctxE.fillText('ESTIMATION',WP-78,16);
    if (pts.length >= 3) {
      const err = computeError(this.grf, (x,y)=>{ const i=nn(x,y,pts); return pts[i].t; }, WP, HP, 6);
      this.errEl.textContent = `Biais: ${(err.biais*10).toFixed(3)}% | RMSE: ${(err.rmse*10).toFixed(3)}%`;
    }
    this.stEl.textContent = `Points : ${pts.length}`;
  }

  _addPt(x, y) {
    if (!this.grf) return;
    this.pts.push({x,y,t:this.grf.at(x,y)});
    this._drawTruth(); this._drawEstim();
  }

  _handler(e) {
    const r=e.target.getBoundingClientRect();
    this._addPt((e.clientX-r.left)*(WP/r.width), (e.clientY-r.top)*(HP/r.height));
  }

  _addRandom(n) { for(let i=0;i<n;i++) this._addPt(30+Math.random()*(WP-60), 30+Math.random()*(HP-60)); }

  async _reset() {
    this.pts = [];
    this.grf = await this._mkGrf();
    this._drawTruth();
    this._drawEstim();
  }
}

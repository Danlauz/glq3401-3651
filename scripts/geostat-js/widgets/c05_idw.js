// scripts/geostat-js/widgets/c05_idw.js
// -----------------------------------------------------------------------------
// Widget « Inverse de la distance (IDW) » (C05-W3)
// Source de vérité : geostat_polymtl.conventional.idw.idw
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import { GRF, cm, idw, computeError } from './c05_lib.js';
import { afficherChargementJusquaPret } from '../pyodide_setup.js';

const W=430, H=340;

export default class C05Idw extends Widget {
  render() {
    const grad = Array.from({length:11},(_,i)=>{const c=cm(i/10);return `rgb(${c[0]},${c[1]},${c[2]})`;}).join(',');
    this.el.insertAdjacentHTML('beforeend', `
      <div style="display:flex;gap:4px;margin-bottom:8px;">
        <canvas id="${this.el.id}_cT" width="${W}" height="${H}"
          style="border:1px solid #ccc;border-radius:4px;cursor:crosshair;flex:1;max-width:50%"></canvas>
        <canvas id="${this.el.id}_cE" width="${W}" height="${H}"
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
        <div class="gw-slider"><label>b :</label><input type="range" id="${this.el.id}_b" min="0" max="60" value="20" step="1"><span id="${this.el.id}_bv">2.0</span></div>
        <div class="gw-slider"><label>Rayon :</label><input type="range" id="${this.el.id}_r" min="30" max="300" value="300" step="5"><span id="${this.el.id}_rv">∞</span></div>
        <button id="${this.el.id}_btnAdd">+ 8 pts</button>
        <button id="${this.el.id}_btnRst">Nouveau champ</button>
        <span id="${this.el.id}_err" style="min-width:200px;font-size:0.78rem">—</span>
      </div>
      <div class="gw-controls" style="margin-top:2px;background:#e8edf2;">
        <span style="font-weight:600;font-size:.74rem;">Champ :</span>
        <select id="${this.el.id}_gm" style="font-size:.72rem;"><option>Exponentiel</option><option>Sphérique</option><option>Gaussien</option></select>
        <div class="gw-slider"><label style="font-size:.72rem;">aₓ:</label><input type="range" id="${this.el.id}_px" min="20" max="250" value="130" style="width:60px;"><span id="${this.el.id}_pxv" style="font-size:.7rem;">130</span></div>
        <div class="gw-slider"><label style="font-size:.72rem;">aᵧ:</label><input type="range" id="${this.el.id}_py" min="20" max="250" value="130" style="width:60px;"><span id="${this.el.id}_pyv" style="font-size:.7rem;">130</span></div>
        <div class="gw-slider"><label style="font-size:.72rem;">c₀:</label><input type="range" id="${this.el.id}_ng" min="0" max="50" value="0" style="width:50px;"><span id="${this.el.id}_ngv" style="font-size:.7rem;">0%</span></div>
      </div>
    `);

    const id = this.el.id;
    this.ctxT = document.getElementById(`${id}_cT`).getContext('2d');
    this.ctxE = document.getElementById(`${id}_cE`).getContext('2d');
    this.cvsT = document.getElementById(`${id}_cT`);
    this.cvsE = document.getElementById(`${id}_cE`);
    this.bI   = document.getElementById(`${id}_b`);
    this.rI   = document.getElementById(`${id}_r`);
    this.bv   = document.getElementById(`${id}_bv`);
    this.rv   = document.getElementById(`${id}_rv`);
    this.errEl= document.getElementById(`${id}_err`);
    this.pts=[]; this.bP=2; this.rM=9999;

    this.on(this.cvsT, 'click', e => this._handler(e));
    this.on(this.cvsE, 'click', e => this._handler(e));
    this.on(this.bI, 'input', e => { this.bP=e.target.value/10; this.bv.textContent=this.bP.toFixed(1); this._drawEstim(); });
    this.on(this.rI, 'input', e => { this.rM=+e.target.value; this.rv.textContent=this.rM>=300?'∞':this.rM+'px'; if(this.rM>=300)this.rM=9999; this._drawEstim(); });
    this.on(document.getElementById(`${id}_btnAdd`), 'click', () => this._addRandom(8));
    this.on(document.getElementById(`${id}_btnRst`), 'click', () => this._reset());
    for (const [suf,disp] of [['px','pxv'],['py','pyv']]) {
      this.on(document.getElementById(`${id}_${suf}`), 'input', e => { document.getElementById(`${id}_${disp}`).textContent=e.target.value; });
    }
    this.on(document.getElementById(`${id}_ng`), 'input', e => { document.getElementById(`${id}_ngv`).textContent=e.target.value+'%'; });

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
    });
  }

  _drawTruth() {
    this.grf.drawTo(this.ctxT);
    for (const p of this.pts) {
      this.ctxT.beginPath(); this.ctxT.arc(p.x,p.y,4,0,Math.PI*2);
      this.ctxT.fillStyle='#fff'; this.ctxT.fill(); this.ctxT.strokeStyle='#000'; this.ctxT.lineWidth=1.5; this.ctxT.stroke();
    }
    this.ctxT.fillStyle='rgba(255,255,255,0.7)'; this.ctxT.fillRect(4,4,70,18);
    this.ctxT.fillStyle='#333'; this.ctxT.font='bold 10px JetBrains Mono'; this.ctxT.fillText('RÉALITÉ',8,16);
  }

  _drawEstim() {
    const cE=this.ctxE, pts=this.pts;
    if (!pts.length) {
      cE.fillStyle='#f5f3ef'; cE.fillRect(0,0,W,H);
      cE.fillStyle='#aaa'; cE.font='13px Source Serif 4'; cE.textAlign='center'; cE.fillText('Cliquez pour échantillonner',W/2,H/2); cE.textAlign='start'; return;
    }
    const s=4, img=cE.createImageData(W,H), d=img.data;
    let nNan=0, nTot=0;
    for (let y=0;y<H;y+=s) for (let x=0;x<W;x+=s) {
      const v=idw(x,y,pts,this.bP,this.rM);
      const fini=Number.isFinite(v), c=cm(v);
      nTot++; if(!fini) nNan++;
      const alpha=fini?220:70; // zones sans point dans le rayon : grisé translucide
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
    const err=computeError(this.grf,(x,y)=>idw(x,y,pts,this.bP,this.rM),W,H,8);
    let msg = Number.isFinite(err.rmse) ? `Biais: ${(err.biais*10).toFixed(3)}% | RMSE: ${(err.rmse*10).toFixed(3)}%` : 'Aucune estimation possible.';
    if (this._nanFrac > 0.02) msg += ` · ⚠ ${(100*this._nanFrac).toFixed(0)}% du domaine sans estimation (rayon trop petit)`;
    this.errEl.textContent = msg;
  }

  _addPt(x,y) { this.pts.push({x,y,t:this.grf.at(x,y)}); this._drawTruth(); this._drawEstim(); }

  _handler(e) {
    const r=e.target.getBoundingClientRect();
    this._addPt((e.clientX-r.left)*(W/r.width),(e.clientY-r.top)*(H/r.height));
  }

  _addRandom(n) { for(let i=0;i<n;i++) this._addPt(30+Math.random()*(W-60),30+Math.random()*(H-60)); }

  async _reset() { this.pts=[]; this.grf=await this._mkGrf(); this._drawTruth(); this._drawEstim(); }
}

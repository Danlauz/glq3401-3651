// scripts/geostat-js/widgets/c05_sections3d.js
// -----------------------------------------------------------------------------
// Widget « Méthode des sections (visualisation 3D) » (C05-W4)
// Source de vérité : geostat_polymtl.conventional.sections
// Three.js r128 chargé via CDN (identique à l'ancien widget inline).
// -----------------------------------------------------------------------------

import { Widget } from '../widget-base.js';
import {
  formeSection, scaleShapeToArea, polyArea, dimsSection,
  volSurface, volCone, volObelisque,
  tSurfaceBrusque, tSurfaceLinB, tSurfaceLinL, tConeB, tConeL, tObeliB, tObeliL,
} from './c05_lib.js';

const N = 64; // points par contour de section

export default class C05Sections3d extends Widget {
  render() {
    this.el.insertAdjacentHTML('beforeend', `
      <style>
        .sec-row{display:flex;gap:14px;flex-wrap:wrap;}
        .sec-view{flex:1;min-width:380px;height:430px;border:1.5px solid #d4d0c8;border-radius:6px;overflow:hidden;background:#1a1a2e;position:relative;}
        .sec-panel{flex:0 0 310px;}
        .sec-box{background:#f8f7f4;border:1px solid #d4d0c8;border-radius:6px;padding:10px 12px;margin-bottom:8px;}
        .sec-box h4{margin:0 0 6px;font-size:0.88rem;font-weight:600;}
        .sf{display:flex;align-items:center;gap:6px;margin:3px 0;font-size:0.8rem;}
        .sf label{min-width:80px;font-weight:500;}
        .sf input[type=range]{flex:1;accent-color:#4a6a8c;}
        .sf select{font-family:'JetBrains Mono',monospace;font-size:0.78rem;padding:3px 6px;border:1px solid #c0bdb5;border-radius:3px;}
        .sec-res{background:#eef2e8;border:1px solid #b8c8a8;border-radius:6px;padding:10px 12px;}
        .sec-res h4{margin:0 0 6px;font-size:0.88rem;font-weight:600;color:#4a6a3a;}
        .stbl{width:100%;border-collapse:collapse;font-size:0.73rem;font-family:'JetBrains Mono',monospace;}
        .stbl th{background:#d8e4cc;padding:3px 5px;text-align:left;border:1px solid #b8c8a8;}
        .stbl td{padding:3px 5px;border:1px solid #d4d0c8;}
        .stbl tr:nth-child(even){background:#f4f8f0;}
        .sec-ov{position:absolute;bottom:8px;left:8px;background:rgba(0,0,0,0.55);color:#ddd;font-family:'JetBrains Mono',monospace;font-size:0.7rem;padding:4px 8px;border-radius:4px;pointer-events:none;}
      </style>
      <div class="sec-row">
        <div class="sec-view" id="${this.el.id}_view"><div class="sec-ov">Glissez pour pivoter · Molette pour zoomer</div></div>
        <div class="sec-panel">
          <div class="sec-box" style="border-left:3px solid #4a7abf;">
            <h4>Section 1 (bleue)</h4>
            <div class="sf"><label>Forme</label><select id="${this.el.id}_f1"><option value="lentille">Lentille</option><option value="veine">Veine</option><option value="chenal" selected>Chenal</option><option value="irregulier">Irrégulier</option></select></div>
            <div class="sf"><label>S₁ (m²)</label><input type="range" id="${this.el.id}_s1" min="100" max="2000" value="600" step="50"><span id="${this.el.id}_s1v">600</span></div>
            <div class="sf"><label>t₁ (%)</label><input type="range" id="${this.el.id}_t1" min="5" max="80" value="20" step="1"><span id="${this.el.id}_t1v">2.0</span></div>
          </div>
          <div class="sec-box" style="border-left:3px solid #bf4a4a;">
            <h4>Section 2 (rouge)</h4>
            <div class="sf"><label>Forme</label><select id="${this.el.id}_f2"><option value="lentille" selected>Lentille</option><option value="veine">Veine</option><option value="chenal">Chenal</option><option value="irregulier">Irrégulier</option></select></div>
            <div class="sf"><label>S₂ (m²)</label><input type="range" id="${this.el.id}_s2" min="100" max="2000" value="1200" step="50"><span id="${this.el.id}_s2v">1200</span></div>
            <div class="sf"><label>t₂ (%)</label><input type="range" id="${this.el.id}_t2" min="5" max="80" value="40" step="1"><span id="${this.el.id}_t2v">4.0</span></div>
          </div>
          <div class="sec-box">
            <h4>Paramètres</h4>
            <div class="sf"><label>Espac. L</label><input type="range" id="${this.el.id}_l" min="5" max="60" value="20" step="1"><span id="${this.el.id}_lv">20 m</span></div>
          </div>
          <div class="sec-res">
            <h4>Résultats comparatifs</h4>
            <table class="stbl"><tbody id="${this.el.id}_tbl"></tbody></table>
          </div>
        </div>
      </div>
    `);

    const id = this.el.id;
    this.S1=600; this.S2=1200; this.t1=2; this.t2=4; this.L=20;
    this.f1='chenal'; this.f2='lentille';

    // Charger Three.js puis initialiser
    if (window.THREE) {
      this._initThree();
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      script.onload = () => this._initThree();
      document.head.appendChild(script);
    }

    // Contrôles
    const bind = (suf, setter, fmt) => {
      const el = document.getElementById(`${id}_${suf}`);
      this.on(el, 'input', e => { setter(+e.target.value); document.getElementById(`${id}_${suf}v`).textContent=fmt(+e.target.value); this._refresh(); });
    };
    bind('s1', v => this.S1=v, v => v);
    bind('s2', v => this.S2=v, v => v);
    bind('t1', v => this.t1=v/10, v => (v/10).toFixed(1));
    bind('t2', v => this.t2=v/10, v => (v/10).toFixed(1));
    bind('l',  v => this.L=v,  v => v+' m');
    this.on(document.getElementById(`${id}_f1`), 'change', e => { this.f1=e.target.value; this._refresh(); });
    this.on(document.getElementById(`${id}_f2`), 'change', e => { this.f2=e.target.value; this._refresh(); });
  }

  _initThree() {
    const THREE = window.THREE;
    const box   = document.getElementById(`${this.el.id}_view`);
    const cw=box.clientWidth||420, ch=box.clientHeight||430;

    this._scene  = new THREE.Scene(); this._scene.background = new THREE.Color(0x1a1a2e);
    this._cam    = new THREE.PerspectiveCamera(45, cw/ch, .1, 1000);
    this._ren    = new THREE.WebGLRenderer({ antialias: true });
    this._ren.setSize(cw, ch); this._ren.setPixelRatio(Math.min(devicePixelRatio,2));
    box.insertBefore(this._ren.domElement, box.firstChild);

    this._scene.add(new THREE.AmbientLight(0xffffff,.45));
    const dl = new THREE.DirectionalLight(0xffffff,.65); dl.position.set(4,6,3); this._scene.add(dl);
    const gr = new THREE.GridHelper(60,12,0x444466,0x333355); gr.position.y=-.5; this._scene.add(gr);

    this._th=Math.PI*.3; this._ph=Math.PI*.2; this._rad=55;
    this._updateCam();

    // Interaction souris
    let dr=false, px=0, py=0;
    this.on(this._ren.domElement, 'pointerdown', e => { dr=true; px=e.clientX; py=e.clientY; });
    this.on(window, 'pointerup', () => dr=false);
    this.on(window, 'pointermove', e => {
      if (!dr) return;
      this._th -= (e.clientX-px)*.008; this._ph=Math.max(.05,Math.min(1.5,this._ph+(e.clientY-py)*.008));
      px=e.clientX; py=e.clientY; this._updateCam(); this._ren.render(this._scene,this._cam);
    });
    this.on(this._ren.domElement, 'wheel', e => {
      e.preventDefault(); this._rad=Math.max(15,Math.min(120,this._rad+e.deltaY*.06));
      this._updateCam(); this._ren.render(this._scene,this._cam);
    }, { passive: false });

    this._sg = new THREE.Group(); this._scene.add(this._sg);
    this._refresh();
  }

  _updateCam() {
    const r=this._rad, th=this._th, ph=this._ph;
    this._cam.position.set(r*Math.cos(ph)*Math.sin(th), r*Math.sin(ph), r*Math.cos(ph)*Math.cos(th));
    this._cam.lookAt(0,0,0);
  }

  _gc(t) { return new window.THREE.Color().setHSL(.33*(1-Math.min(t/6,1)),.7,.5); }

  _refresh() {
    if (!this._sg) return; // Three.js pas encore chargé
    this._buildSolid();
    this._updateTable();
  }

  _buildSolid() {
    const THREE=window.THREE, sg=this._sg;
    while (sg.children.length) {
      const c=sg.children[0];
      if(c.geometry) c.geometry.dispose();
      if(c.material){Array.isArray(c.material)?c.material.forEach(m=>m.dispose()):c.material.dispose();}
      sg.remove(c);
    }

    const shape1 = scaleShapeToArea(formeSection(this.f1, N), this.S1);
    const shape2 = scaleShapeToArea(formeSection(this.f2, N), this.S2);
    const nS=24, verts=[], cols=[], idx=[];

    for (let s=0; s<=nS; s++) {
      const u=s/nS, z=u*this.L-this.L/2;
      for (let i=0; i<N; i++) {
        const x=shape1[i].x+(shape2[i].x-shape1[i].x)*u;
        const y=shape1[i].y+(shape2[i].y-shape1[i].y)*u;
        verts.push(x,y,z);
        const tg=this.t1+(this.t2-this.t1)*u, c=this._gc(tg);
        cols.push(c.r,c.g,c.b);
      }
    }
    for (let s=0;s<nS;s++) for (let i=0;i<N;i++) {
      const a=s*N+i, b=s*N+(i+1)%N, c=(s+1)*N+i, d=(s+1)*N+(i+1)%N;
      idx.push(a,b,c, b,d,c);
    }
    // Caps
    const c1i=verts.length/3; verts.push(0,0,-this.L/2); const cc1=this._gc(this.t1); cols.push(cc1.r,cc1.g,cc1.b);
    for (let i=0;i<N;i++) idx.push(c1i,(i+1)%N,i);
    const c2i=verts.length/3; verts.push(0,0,this.L/2); const cc2=this._gc(this.t2); cols.push(cc2.r,cc2.g,cc2.b);
    const o2=nS*N; for (let i=0;i<N;i++) idx.push(c2i,o2+i,o2+(i+1)%N);

    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
    geo.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));
    geo.setIndex(idx); geo.computeVertexNormals();
    sg.add(new THREE.Mesh(geo,new THREE.MeshPhongMaterial({vertexColors:true,side:THREE.DoubleSide,transparent:true,opacity:.8,shininess:20})));

    for (const [shape,z,col] of [[shape1,-this.L/2,0x4a7abf],[shape2,this.L/2,0xbf4a4a]]) {
      const lp=shape.map(p=>new THREE.Vector3(p.x,p.y,z)); lp.push(lp[0].clone());
      sg.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(lp),new THREE.LineBasicMaterial({color:col,linewidth:2})));
    }
    sg.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,-this.L/2-3),new THREE.Vector3(0,0,this.L/2+3)]),new THREE.LineBasicMaterial({color:0x888888})));
    this._ren.render(this._scene, this._cam);
  }

  _updateTable() {
    const sh1=scaleShapeToArea(formeSection(this.f1,N),this.S1);
    const sh2=scaleShapeToArea(formeSection(this.f2,N),this.S2);
    const A1=polyArea(sh1), A2=polyArea(sh2);
    const d1=dimsSection(sh1), d2=dimsSection(sh2);
    const a1=d1.a, b1=d1.b, a2=d2.a, b2=d2.b;
    const L=this.L, t1=this.t1, t2=this.t2;
    const vSurf=volSurface(A1,A2,L), vCone=volCone(A1,A2,L), vObel=volObelisque(A1,A2,a1,b1,a2,b2,L);
    // Tableau de référence du cours (méthode des sections).
    const rows=[
      ['Surface brusque','B', vSurf, tSurfaceBrusque(A1,t1,A2,t2)],
      ['Surface lin.',   'B', vSurf, tSurfaceLinB(A1,t1,A2,t2)],
      ['Surface lin.',   'L', vSurf, tSurfaceLinL(A1,t1,A2,t2)],
      ['Cône tronqué',   'B', vCone, tConeB(A1,t1,A2,t2)],
      ['Cône tronqué',   'L', vCone, tConeL(A1,t1,A2,t2)],
      ['Obélisque',      'B', vObel, tObeliB(a1,b1,t1,a2,b2,t2)],
      ['Obélisque',      'L', vObel, tObeliL(a1,b1,t1,a2,b2,t2)],
    ];
    let h='<tr><th>Méthode (volume)</th><th>t̄ varie</th><th>V (×10³ m³)</th><th>t̄ (%)</th></tr>';
    for (const [n,tv,V,t] of rows) h+=`<tr><td>${n}</td><td style="text-align:center">${tv}</td><td>${(V/1000).toFixed(2)}</td><td>${t.toFixed(2)}</td></tr>`;
    h+=`<tr style="background:#e8e5dc;"><td colspan="4">S₁=${A1.toFixed(0)} m² (a₁=${a1.toFixed(1)}, b₁=${b1.toFixed(1)}) · S₂=${A2.toFixed(0)} m² (a₂=${a2.toFixed(1)}, b₂=${b2.toFixed(1)})</td></tr>`;
    document.getElementById(`${this.el.id}_tbl`).innerHTML=h;
  }

  cleanup() {
    if (this._ren) { this._ren.dispose(); }
  }
}

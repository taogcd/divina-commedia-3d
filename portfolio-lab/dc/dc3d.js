/* Mappa della Commedia — the text world, adapted for the portfolio (built from the same code as
   https://taogcd.github.io/divina-commedia-3d/). DC3D(canvas, DATA, THREE, opts) builds it and returns
   { render(p, mx, my, dt), resize(w, h), fitTo(rect, w, h) }. */
window.DC3D = function (canvas, DATA, THREE, opts) {
"use strict";
opts = opts || {};
const TAU=Math.PI*2;
const CN=['Inferno','Purgatorio','Paradiso'];
const CZ=['地狱','炼狱','天堂'];
const OFF=[0,34,67];
const NC=[34,33,33];
const ROM=n=>{const v=[[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];let s='';for(const[a,b]of v)while(n>=a){s+=b;n-=a;}return s;};
const NAMES=[
["Selva oscura|幽暗的森林","La via · Virgilio e Beatrice|启程之路","Porta dell'Inferno · Antinferno · Acheronte|地狱之门 · 前庭 · 阿刻戎河","Cerchio I · Limbo · Nobile castello|第一圈 · 林勃 · 高贵城堡","Cerchio II · Lussuriosi · Francesca|第二圈 · 色欲者","Cerchio III · Golosi · Cerbero|第三圈 · 饕餮者","Cerchio IV–V · Avari e prodighi · Stige|第四、五圈 · 贪吝与挥霍 · 斯提克斯沼","Stige · Flegiàs · Città di Dite|斯提克斯沼 · 狄斯城","Mura di Dite · Furie · Messo celeste|狄斯城墙 · 复仇三女神","Cerchio VI · Eretici · Farinata|第六圈 · 异端者之墓","Ordinamento dell'Inferno|地狱的秩序","Cerchio VII · Flegetonte · Centauri|第七圈 · 沸血之河","Selva dei suicidi · Pier delle Vigne|自杀者之林","Sabbione ardente · Capaneo|燃烧的沙原","Sabbione · Brunetto Latini|沙原 · 布鲁内托","Sabbione · Cascata del Flegetonte|沙原 · 血河瀑布","Gerione · Usurai · Il burrato|格吕翁 · 放贷者 · 深渊","Malebolge · Bolge I–II|恶囊 · 第一、二囊","Bolgia III · Simoniaci|第三囊 · 买卖圣职者","Bolgia IV · Indovini|第四囊 · 占卜者","Bolgia V · Barattieri · Malebranche|第五囊 · 贪官污吏","Bolgia V · Ciampolo|第五囊 · 恶爪鬼","Bolgia VI · Ipocriti|第六囊 · 伪善者","Bolgia VII · Ladri · Vanni Fucci|第七囊 · 盗贼","Bolgia VII · Metamorfosi|第七囊 · 人蛇变形","Bolgia VIII · Ulisse|第八囊 · 尤利西斯之焰","Bolgia VIII · Guido da Montefeltro|第八囊 · 圭多","Bolgia IX · Seminatori di discordia|第九囊 · 离间者","Bolgia X · Falsari|第十囊 · 伪造者","Bolgia X · Maestro Adamo|第十囊 · 伪币者","Pozzo dei giganti|巨人之井","Cocito · Caina · Antenora|科奇土斯冰湖 · 该隐环 · 安忒诺尔环","Antenora · Ugolino · Tolomea|乌戈利诺 · 托勒密环","Giudecca · Lucifero · Natural burella|犹大环 · 路西法 · 出口隧道"],
["Spiaggia · Catone|海岸 · 加图","Angelo nocchiero · Casella|渡魂天使","Antipurgatorio · Scomunicati · Manfredi|炼狱前区 · 被逐出教会者","La salita · Belacqua|陡峭的攀登","Morti per forza · Bonconte · Pia|横死者","Sordello · Apostrofe all'Italia|索尔戴罗","Valletta dei principi|君王之谷","Valletta · Angeli e serpente|谷中天使与蛇","Porta del Purgatorio · Tre gradini|炼狱之门 · 三级台阶","Cornice I · Superbi · Intagli|第一层 · 骄傲者 · 浮雕","Cornice I · Oderisi|第一层 · 奥德里西","Cornice I · Superbia punita|第一层 · 地面浮雕","Cornice II · Invidiosi|第二层 · 嫉妒者","Cornice II · Guido del Duca|第二层 · 嫉妒者","Cornice III · Iracondi|第三层 · 愤怒者","Cornice III · Il fumo · Marco Lombardo|第三层 · 浓烟","Cornice III–IV · Accidiosi|第三、四层 · 懒惰者","Cornice IV · Teoria dell'amore|第四层 · 论爱","Cornice V · Avari e prodighi|第五层 · 贪财者","Cornice V · Ugo Capeto · Terremoto|第五层 · 地震","Cornice V · Stazio|第五层 · 斯塔提乌斯","Cornice VI · Golosi · L'albero|第六层 · 贪食者 · 倒生之树","Cornice VI · Forese Donati|第六层 · 佛雷塞","Cornice VI · Dolce stil novo|第六层 · 温柔新体","Cornice VII · Lussuriosi|第七层 · 色欲者","Cornice VII · Guinizzelli · Arnaut|第七层 · 诗人们","Muro di fuoco|火墙","Paradiso terrestre · Matelda|地上乐园 · 玛泰尔妲","La processione · Sette candelabri|圣队游行 · 七灯台","Beatrice|贝雅特丽齐","Letè · Confessione|忘川","Il carro e l'albero|战车与树","Eunoè|欧诺埃河"],
["Ascesa · Trasumanar|升腾 · 超凡","Cielo della Luna · Macchie lunari|月天 · 月斑","Luna · Piccarda|月天 · 毕卡尔达","Luna · Voti|月天 · 誓愿","Luna → Mercurio|月天至水星天","Cielo di Mercurio · Giustiniano|水星天 · 查士丁尼","Mercurio · Redenzione|水星天 · 救赎","Cielo di Venere · Carlo Martello|金星天","Venere · Cunizza · Folchetto|金星天","Cielo del Sole · Prima corona|太阳天 · 第一花环","Sole · San Francesco|太阳天 · 圣方济各","Sole · Seconda corona · San Domenico|太阳天 · 第二花环","Sole · Salomone|太阳天 · 所罗门","Marte · La croce di luce|火星天 · 光之十字","Cielo di Marte · Cacciaguida|火星天 · 卡恰圭达","Marte · Firenze antica|火星天 · 古佛罗伦萨","Marte · Profezia dell'esilio|火星天 · 流放预言","Cielo di Giove · DILIGITE IUSTITIAM|木星天 · 「热爱正义」","Giove · L'aquila|木星天 · 鹰","Giove · Occhio dell'aquila|木星天 · 鹰之眼","Cielo di Saturno · Scala d'oro|土星天 · 金梯","Saturno · San Benedetto|土星天 · 圣本笃","Stelle fisse · Trionfo di Cristo|恒星天 · 基督凯旋","Stelle fisse · Esame sulla fede|恒星天 · 信","Stelle fisse · Esame sulla speranza|恒星天 · 望","Stelle fisse · Esame sulla carità|恒星天 · 爱","Primo Mobile|原动天","Il Punto · Nove cori angelici|一点 · 九重天使","Creazione degli angeli|天使的创造","Empireo · Fiume di luce|净火天 · 光之河","Candida rosa|洁白的玫瑰","La rosa dei beati|圣者玫瑰","Tre giri · Visione di Dio|三环 · 至福直观"]];

/* ---------------- RNG ---------------- */
let seed=7; const rnd=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646;};
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------- glyph atlas ---------------- */
const FS=72,CW=96,CH=112,BASE=84,PADX=10,ATS=1024,COLS=10;
const GI=new Map(); const GW=new Float32Array(90); let SPACE=0.24;
function buildAtlas(){
  const set=new Set(['·']);
  for(const k of CN) for(const c of DATA[k]) for(const l of c) for(const ch of l) if(ch!==' ') set.add(ch);
  const chars=[...set].slice(0,90);
  const cv=document.createElement('canvas'); cv.width=cv.height=ATS;
  const x=cv.getContext('2d');
  x.font=`500 ${FS}px "Cormorant Garamond","Cormorant",Georgia,serif`;
  x.fillStyle='#fff'; x.textBaseline='alphabetic';
  chars.forEach((ch,i)=>{const c=i%COLS,r=Math.floor(i/COLS);x.fillText(ch,c*CW+PADX,r*CH+BASE);GW[i]=Math.min(1.05,x.measureText(ch).width/FS);GI.set(ch,i);});
  SPACE=x.measureText(' ').width/FS*1.1;
  return cv;
}

/* ---------------- text tokens ---------------- */
const BR=[0.66,0.74,0.92];
function C(k,n,a,b){
  const arr=DATA[CN[k]][n-1]; const end=b==null?arr.length:Math.min(b,arr.length);
  const c=OFF[k]+n-1, lastC=n===DATA[CN[k]].length, out=[];
  for(let i=(a||1)-1;i<end;i++){const br=(i===0||(lastC&&i>=arr.length-3))?1.0:BR[k];out.push({s:arr[i],c,v:i,b:br});}
  return out;
}
function adv(w){let a=0;for(const ch of w){const g=GI.get(ch);a+=g===undefined?SPACE:GW[g];}return a;}
function T(lines,sep){
  const t=[];
  lines.forEach((l,j)=>{ if(sep!==false&&j>0)t.push({w:'·',a:adv('·'),c:l.c,b:l.b*0.75});
    for(const w of l.s.split(' ')) if(w) t.push({w,a:adv(w),c:l.c,b:l.b}); });
  return t;
}
function tAdv(t){let a=0;for(const k of t)a+=k.a+SPACE;return a;}
function chunk(a,n){const o=[];for(let i=0;i<a.length;i+=n)o.push(a.slice(i,i+n));return o;}
function splitW(lines,ws){ // split lines by weights
  const tot=ws.reduce((a,b)=>a+b,0); const out=[]; let i=0, acc=0;
  ws.forEach((w,j)=>{acc+=w; const e=j===ws.length-1?lines.length:Math.round(lines.length*acc/tot); out.push(lines.slice(i,e)); i=e;});
  return out;
}

/* ---------------- emission ---------------- */
const MAXG=1100000;
const AO=new Float32Array(MAXG*3),AT=new Float32Array(MAXG*3),AU=new Float32Array(MAXG*3),AC=new Float32Array(MAXG);
// portfolio: which ring of verse a glyph belongs to (0: none), so that scrolling can turn the rings like gears
const AR=new Float32Array(MAXG); let SPIN=0, RINGN=0;
let NG=0;
const BB=[]; for(let i=0;i<100;i++)BB.push([1e9,1e9,1e9,-1e9,-1e9,-1e9]);
const SAMP=[]; for(let i=0;i<100;i++)SAMP.push([]);
const CNT=new Int32Array(100);
function emit(px,py,pz,tx,ty,tz,ux,uy,uz,s,g,c,b){
  if(NG>=MAXG)return; const i=NG*3;
  AO[i]=px;AO[i+1]=py;AO[i+2]=pz;
  AT[i]=tx*s;AT[i+1]=ty*s;AT[i+2]=tz*s;
  AU[i]=ux*s;AU[i+1]=uy*s;AU[i+2]=uz*s;
  AC[NG]=c*128+g+Math.min(b,1)*0.94; AR[NG]=SPIN; NG++;
  const B=BB[c]; if(px<B[0])B[0]=px; if(py<B[1])B[1]=py; if(pz<B[2])B[2]=pz; if(px>B[3])B[3]=px; if(py>B[4])B[4]=py; if(pz>B[5])B[5]=pz;
  if((CNT[c]++)%29===0) SAMP[c].push(px,py,pz);
}

/* ---------------- tracks ---------------- */
class Track{
  constructor(p,u,f){
    this.p=p;this.u=u;this.f=f;const n=p.length/3;this.n=n;
    const cum=new Float32Array(n);
    for(let i=1;i<n;i++){const a=(i-1)*3,b=i*3;cum[i]=cum[i-1]+Math.hypot(p[b]-p[a],p[b+1]-p[a+1],p[b+2]-p[a+2]);}
    this.cum=cum;this.len=cum[n-1];this.i=0;
  }
  frame(s,o){
    const cum=this.cum,n=this.n;let i=this.i; if(s<cum[i])i=0;
    while(i<n-2&&cum[i+1]<s)i++; this.i=i;
    const L=Math.max(1e-6,cum[i+1]-cum[i]), f=(s-cum[i])/L, p=this.p, a=i*3, b=a+3;
    let tx=(p[b]-p[a])/L,ty=(p[b+1]-p[a+1])/L,tz=(p[b+2]-p[a+2])/L;
    const px=p[a]+(p[b]-p[a])*f,py=p[a+1]+(p[b+1]-p[a+1])*f,pz=p[a+2]+(p[b+2]-p[a+2])*f;
    let ux,uy,uz;
    if(this.u){const U=this.u,g=Math.min(1,Math.max(0,f));ux=U[a]+(U[b]-U[a])*g;uy=U[a+1]+(U[b+1]-U[a+1])*g;uz=U[a+2]+(U[b+2]-U[a+2])*g;}
    else {const r=this.f(px,py,pz,tx,ty,tz);ux=r[0];uy=r[1];uz=r[2];}
    const d=ux*tx+uy*ty+uz*tz; ux-=d*tx;uy-=d*ty;uz-=d*tz;
    let m=Math.hypot(ux,uy,uz); if(m<1e-5){ux=-tz;uy=0;uz=tx;m=Math.hypot(ux,uy,uz)||1;}
    o[0]=px;o[1]=py;o[2]=pz;o[3]=tx;o[4]=ty;o[5]=tz;o[6]=ux/m;o[7]=uy/m;o[8]=uz/m;
  }
}
function fits(tk,lens,size){
  if(!lens.length)return false; let ti=0,s=0;const sp=SPACE*size;
  for(const k of tk){const w=k.a*size; if(s>0&&s+w>lens[ti]){ti++;if(ti>=lens.length)return false;s=0;} s+=w+sp;}
  return true;
}
const FO=new Float32Array(9);
function flow(tk,tracks,size){
  if(!tracks.length||!tk.length)return;
  let ti=0,tr=tracks[0],s=0;tr.i=0;const sp=SPACE*size,bo=-0.3*size;
  for(const k of tk){
    const w=k.a*size;
    if(s>0&&s+w>tr.len&&ti<tracks.length-1){ti++;tr=tracks[ti];tr.i=0;s=0;}
    for(const ch of k.w){
      const g=GI.get(ch); if(g===undefined){s+=sp;continue;}
      tr.frame(s,FO);
      emit(FO[0]+FO[6]*bo,FO[1]+FO[7]*bo,FO[2]+FO[8]*bo,FO[3],FO[4],FO[5],FO[6],FO[7],FO[8],size,g,k.c,k.b);
      s+=GW[g]*size;
    }
    s+=sp;
  }
}

/* ---------------- geometry helpers ---------------- */
const UY=[0,1,0],DY=[0,-1,0];
const nn=(r,arc)=>Math.max(24,Math.min(1800,Math.ceil(r*Math.abs(arc)/2.0)));
function ring(r,y,o){
  o=o||{}; const th0=o.th0||0, th1=o.th1==null?TAU:o.th1, arc=th1-th0;
  const closed=Math.abs(Math.abs(arc)-TAU)<1e-6; const n=o.n||nn(r,arc);
  const cx=o.cx||0,cz=o.cz||0,N=closed?n:n+1,pts=new Float32Array(N*3);
  for(let k=0;k<N;k++){const th=th0+arc*k/n, rr=r*(o.rf?o.rf(th):1), yy=y+(o.yf?o.yf(th):0); pts[k*3]=cx+rr*Math.cos(th);pts[k*3+1]=yy;pts[k*3+2]=cz+rr*Math.sin(th);}
  return {pts,closed};
}
function band(rT,yT,rB,yB,o){
  o=o||{}; const arc=(o.th1==null?TAU:o.th1)-(o.th0||0); const n=nn(Math.max(rT,rB),arc);
  const a=ring(rT,yT,Object.assign({},o,{n,yf:o.yfT})), b=ring(rB,yB,Object.assign({},o,{n,yf:o.yfB}));
  return {top:a.pts,bot:b.pts,closed:a.closed,center:[o.cx||0,0,o.cz||0]};
}
function polyLen(p,closed){let L=0;const n=p.length/3;for(let i=1;i<n;i++)L+=Math.hypot(p[i*3]-p[i*3-3],p[i*3+1]-p[i*3-2],p[i*3+2]-p[i*3-1]);if(closed)L+=Math.hypot(p[0]-p[n*3-3],p[1]-p[n*3-2],p[2]-p[n*3-1]);return L;}
function faceVec(face,p,c){
  if(Array.isArray(face))return face; c=c||[0,0,0];
  if(face==='in')return [c[0]-p[0],0,c[2]-p[2]];
  if(face==='out')return [p[0]-c[0],0,p[2]-c[2]];
  if(face==='up')return UY; return DY;
}
function cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
function norm(a){const m=Math.hypot(a[0],a[1],a[2])||1;return [a[0]/m,a[1]/m,a[2]/m];}
function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
function add(a,b,s){s=s==null?1:s;return [a[0]+b[0]*s,a[1]+b[1]*s,a[2]+b[2]*s];}

/* loft: fill a ruled surface between two polylines with rows of verse */
// a band or a line of verse that runs right round the axis counts as a ring
function ringOf(p,closed){ if(closed===false||!p||p.length<9)return 0; let x=0,z=0,n=p.length/3; for(let i=0;i<p.length;i+=3){x+=p[i];z+=p[i+2];}
  x/=n;z/=n; let r=0; for(let i=0;i<p.length;i+=3)r+=Math.hypot(p[i],p[i+2]); r/=n; return (Math.hypot(x,z)<Math.max(6,r*.08))?++RINGN:0; }
function loft(tk,o){ const prev=SPIN; SPIN=ringOf(o.top,o.closed===undefined?true:o.closed); loft0(tk,o); SPIN=prev; }
function loft0(tk,o){
  if(!tk.length)return;
  const top=o.top,bot=o.bot,n=top.length/3,closed=!!o.closed,lh=o.lh||1.42;
  const ups=new Float32Array(n*3);let P=0;
  for(let k=0;k<n;k++){const i=k*3;const d=[top[i]-bot[i],top[i+1]-bot[i+1],top[i+2]-bot[i+2]];const m=Math.hypot(d[0],d[1],d[2])||1;P+=m;ups[i]=d[0]/m;ups[i+1]=d[1]/m;ups[i+2]=d[2]/m;}
  P/=n;
  const A=P*(polyLen(top,closed)+polyLen(bot,closed))/2, L=tAdv(tk);
  let size=Math.sqrt(A/(lh*L*1.04));
  const p0=[(top[0]+bot[0])/2,(top[1]+bot[1])/2,(top[2]+bot[2])/2], p1=[(top[3]+bot[3])/2,(top[4]+bot[4])/2,(top[5]+bot[5])/2];
  const nr=cross([p1[0]-p0[0],p1[1]-p0[1],p1[2]-p0[2]],[ups[0],ups[1],ups[2]]);
  const rev=dot(nr,faceVec(o.face,p0,o.center))<0;
  let tracks=[];
  for(let it=0;it<18;it++){
    const rows=Math.max(1,Math.floor(P/(lh*size))); tracks=[];
    for(let r=0;r<rows;r++){
      const f=(r+0.5)/rows, M=n+(closed?1:0), pts=new Float32Array(M*3), us=new Float32Array(M*3);
      for(let j=0;j<M;j++){const k=(rev?n-1-(j%n):j%n)*3, q=j*3;
        pts[q]=top[k]+(bot[k]-top[k])*f;pts[q+1]=top[k+1]+(bot[k+1]-top[k+1])*f;pts[q+2]=top[k+2]+(bot[k+2]-top[k+2])*f;
        us[q]=ups[k];us[q+1]=ups[k+1];us[q+2]=ups[k+2];}
      tracks.push(new Track(pts,us));
    }
    if(fits(tk,tracks.map(t=>t.len),size))break; size*=0.965;
  }
  flow(tk,tracks,size); return size;
}
/* curves: verse runs along parametric lines, glyph size fitted to length */
function curves(tk,list){ const prev=SPIN; let p=null; if(list.length===1){const c=list[0],n=48;p=new Float32Array((n+1)*3);for(let i=0;i<=n;i++){const q=c.f(i/n);p[i*3]=q[0];p[i*3+1]=q[1];p[i*3+2]=q[2];}}
  SPIN=p?ringOf(p,true):0; curves0(tk,list); SPIN=prev; }
function curves0(tk,list){
  if(!tk.length)return;
  const tracks=list.map(c=>{const n=c.n||600,p=new Float32Array((n+1)*3);for(let i=0;i<=n;i++){const q=c.f(i/n);p[i*3]=q[0];p[i*3+1]=q[1];p[i*3+2]=q[2];}return new Track(p,null,c.up);});
  let size=tracks.reduce((a,t)=>a+t.len,0)/(tAdv(tk)*1.03);
  for(let it=0;it<18;it++){if(fits(tk,tracks.map(t=>t.len),size))break;size*=0.97;}
  flow(tk,tracks,size); return size;
}
const flat=N=>(px,py,pz,tx,ty,tz)=>[N[1]*tz-N[2]*ty,N[2]*tx-N[0]*tz,N[0]*ty-N[1]*tx];
const rib=L=>()=>L;
/* one verse along a polyline at a fixed size */
function verse(line,size,pathFn,upFn,M){
  const tk=T([line],false), len=tAdv(tk)*size*1.02; M=M||1;
  const p=new Float32Array((M+1)*3); for(let i=0;i<=M;i++){const q=pathFn(len*i/M,len);p[i*3]=q[0];p[i*3+1]=q[1];p[i*3+2]=q[2];}
  flow(tk,[new Track(p,null,upFn)],size);
}
/* shape: rasterise a silhouette and fill it with scan-rows of verse */
function shape(tk,o){
  if(!tk.length)return;
  const cv=document.createElement('canvas');cv.width=o.W;cv.height=o.H;const x=cv.getContext('2d');
  x.fillStyle='#fff';x.strokeStyle='#fff';o.draw(x,o.W,o.H);
  const d=x.getImageData(0,0,o.W,o.H).data; let cnt=0; for(let i=3;i<d.length;i+=4)if(d[i]>127)cnt++;
  const k=o.k,lh=o.lh||1.42,L=tAdv(tk); let size=Math.sqrt(cnt*k*k/(lh*L*1.06));
  const up=[-o.ey[0],-o.ey[1],-o.ey[2]];
  const pt=(px,py)=>[o.origin[0]+o.ex[0]*px*k+o.ey[0]*py*k,o.origin[1]+o.ex[1]*px*k+o.ey[1]*py*k,o.origin[2]+o.ex[2]*px*k+o.ey[2]*py*k];
  let tracks=[];
  for(let it=0;it<22;it++){
    const sp=lh*size/k; tracks=[];
    for(let y=sp/2;y<o.H;y+=sp){const yi=Math.floor(y);let x0=-1;
      for(let xx=0;xx<=o.W;xx++){const on=xx<o.W&&d[(yi*o.W+xx)*4+3]>127;
        if(on&&x0<0)x0=xx; else if(!on&&x0>=0){ if((xx-x0)*k>=size*2.4){const a=pt(x0,y),b=pt(xx,y);tracks.push(new Track(new Float32Array([...a,...b]),new Float32Array([...up,...up])));} x0=-1;}}}
    if(fits(tk,tracks.map(t=>t.len),size))break; size*=0.955;
  }
  flow(tk,tracks,size); return size;
}
/* trees: a tercet becomes trunk and two branches */
function tree(lines,base,L,S,size,o){
  o=o||{}; const tw=o.twist||0, ph=rnd()*6;
  const tk0=T([lines[0]],false), len0=tAdv(tk0)*size*1.03;
  const P=h=>{const w=tw*Math.sin(h*0.21+ph)*Math.min(1,h/6);return [base[0]+L[0]*h+S[0]*w,base[1]+L[1]*h+S[1]*w,base[2]+L[2]*h+S[2]*w];};
  const N=24,pts=new Float32Array((N+1)*3); for(let i=0;i<=N;i++)pts.set(P(len0*i/N),i*3);
  flow(tk0,[new Track(pts,null,()=>S)],size);
  const br=[[0.42,0.8],[0.64,-0.74]];
  for(let j=1;j<lines.length&&j<3;j++){
    const [hf,be]=br[j-1],tk=T([lines[j]],false),len=tAdv(tk)*size*1.03,s0=P(len0*hf),cb=Math.cos(be),sb=Math.sin(be);
    const dv=[L[0]*cb+S[0]*sb,L[1]*cb+S[1]*sb,L[2]*cb+S[2]*sb], uv=[-L[0]*sb+S[0]*cb,-L[1]*sb+S[1]*cb,-L[2]*sb+S[2]*cb];
    const M=16,q=new Float32Array((M+1)*3);
    for(let i=0;i<=M;i++){const h=len*i/M,wb=tw*0.45*Math.sin(h*0.3+ph+j);q.set([s0[0]+dv[0]*h+uv[0]*wb,s0[1]+dv[1]*h+uv[1]*wb,s0[2]+dv[2]*h+uv[2]*wb],i*3);}
    flow(tk,[new Track(q,null,()=>uv)],size);
  }
  hl(base,P(len0*0.98),0.14);
}
/* ray tree: verses as branches widening upward (Purgatorio XXII, XXXII) */
function rayTree(lines,base,Lu,height,size,spread){
  const n=lines.length; hl(base,add(base,Lu,height),0.4);
  lines.forEach((l,i)=>{
    const f=n>1?i/(n-1):0, h=height*(0.12+0.88*f), az=i*2.39996, hd=[Math.cos(az),0,Math.sin(az)];
    const dv=norm([hd[0]*(0.3+spread*f)+Lu[0]*0.6,Lu[1]*0.6,hd[2]*(0.3+spread*f)+Lu[2]*0.6]);
    const st=add(base,Lu,h), up=norm(add(Lu,dv,-dot(dv,Lu)));
    verse(l,size,(s)=>add(st,dv,s),()=>up);
  });
}

/* ---------------- hairlines ---------------- */
const HP=[],HA=[];
function hl(a,b,al){HP.push(a[0],a[1],a[2],b[0],b[1],b[2]);HA.push(al,al);}
function hlPoly(p,al,closed){const n=p.length/3;for(let i=0;i<n-1;i++){HP.push(p[i*3],p[i*3+1],p[i*3+2],p[i*3+3],p[i*3+4],p[i*3+5]);HA.push(al,al);}if(closed){HP.push(p[n*3-3],p[n*3-2],p[n*3-1],p[0],p[1],p[2]);HA.push(al,al);}}
function hlRing(r,y,al,o){const g=ring(r,y,Object.assign({n:Math.max(48,Math.min(720,Math.ceil(r/3)))},o||{}));hlPoly(g.pts,al,g.closed);}
function hlCircle(c,a,b,r,al,n){n=n||360;const p=new Float32Array(n*3);for(let i=0;i<n;i++){const t=i/n*TAU,co=Math.cos(t)*r,si=Math.sin(t)*r;p[i*3]=c[0]+a[0]*co+b[0]*si;p[i*3+1]=c[1]+a[1]*co+b[1]*si;p[i*3+2]=c[2]+a[2]*co+b[2]*si;}hlPoly(p,al,true);}

/* ---------------- silhouettes ---------------- */
function poly(x,pts){x.beginPath();pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.closePath();x.fill();}
function gateDraw(x,W,H){x.beginPath();x.moveTo(0,H);x.lineTo(0,210);x.arc(210,210,210,Math.PI,0);x.lineTo(W,H);x.closePath();
  x.moveTo(98,H);x.lineTo(98,272);x.arc(210,272,112,Math.PI,0);x.lineTo(322,H);x.closePath();x.fill('evenodd');}
function purgGate(x,W,H){
  x.fillRect(10,384,340,36);x.fillRect(40,348,280,36);x.fillRect(70,312,220,36);
  x.beginPath();x.moveTo(70,312);x.lineTo(70,140);x.arc(180,140,110,Math.PI,0);x.lineTo(290,312);x.closePath();
  x.moveTo(122,312);x.lineTo(122,168);x.arc(180,168,58,Math.PI,0);x.lineTo(238,312);x.closePath();x.fill('evenodd');}
function luciferDraw(x,W,H){
  const k=170/W, X=v=>W/2+v/k, Y=v=>(250-v)/k, R=v=>v/k;
  x.beginPath();x.arc(X(0),Y(228),R(11),0,TAU);x.fill();
  poly(x,[[X(-7),Y(236)],[X(-15),Y(250)],[X(-3),Y(239)]]);poly(x,[[X(7),Y(236)],[X(15),Y(250)],[X(3),Y(239)]]);
  x.fillRect(X(-5),Y(220),R(10),R(8));
  x.beginPath();x.ellipse(X(0),Y(160),R(23),R(54),0,0,TAU);x.fill();
  for(const s of[-1,1]){
    poly(x,[[X(s*19),Y(118)],[X(s*4),Y(118)],[X(s*3),Y(-112)],[X(s*12),Y(-112)]]);
    poly(x,[[16,205],[34,236],[60,245],[84,247],[74,206],[66,214],[58,176],[48,190],[38,154],[28,166],[18,148]].map(p=>[X(s*p[0]),Y(p[1])]));
  }
}
function giantDraw(x,W,H){
  const X=v=>W/2+v*6, Y=v=>(150-v)*6;
  x.beginPath();x.arc(X(0),Y(132),66,0,TAU);x.fill();
  poly(x,[[X(-6),Y(122)],[X(6),Y(122)],[X(7),Y(112)],[X(-7),Y(112)]]);
  poly(x,[[X(-24),Y(114)],[X(24),Y(114)],[X(19),Y(0)],[X(-19),Y(0)]]);
  for(const s of[-1,1])poly(x,[[X(s*24),Y(113)],[X(s*31),Y(108)],[X(s*29),Y(28)],[X(s*22),Y(30)]]);
}
function crossDraw(x,W,H){x.lineWidth=58;x.beginPath();x.arc(W/2,H/2,W/2-34,0,TAU);x.stroke();x.fillRect(W/2-56,64,112,H-128);x.fillRect(64,H/2-56,W-128,112);}
function lettersDraw(x,W,H){
  let fs=200; x.textAlign='center'; x.textBaseline='alphabetic';
  for(;fs>60;fs-=4){x.font=`700 ${fs}px "Cormorant Garamond",Georgia,serif`; if(Math.max(x.measureText('DILIGITE IUSTITIAM').width,x.measureText('QUI IUDICATIS TERRAM').width)<W-80)break;}
  x.lineWidth=fs*0.05;
  x.fillText('DILIGITE IUSTITIAM',W/2,H*0.43);x.strokeText('DILIGITE IUSTITIAM',W/2,H*0.43);
  x.fillText('QUI IUDICATIS TERRAM',W/2,H*0.9);x.strokeText('QUI IUDICATIS TERRAM',W/2,H*0.9);
}
function eagleDraw(x,W,H){
  const c=W/2;
  x.beginPath();x.ellipse(c,370,58,160,0,0,TAU);x.fill();
  x.beginPath();x.arc(c,180,46,0,TAU);x.fill();
  poly(x,[[c+30,170],[c+92,192],[c+34,206]]);
  for(const s of[-1,1]){
    poly(x,[[c+s*40,250],[c+s*170,170],[c+s*300,80],[c+s*430,44],[c+s*420,140],[c+s*375,122],[c+s*388,222],[c+s*335,204],[c+s*345,300],[c+s*285,282],[c+s*290,372],[c+s*215,340],[c+s*200,420],[c+s*60,380]]);
    poly(x,[[c+s*20,505],[c+s*48,505],[c+s*70,580],[c+s*36,575]]);
  }
  poly(x,[[c-44,500],[c+44,500],[c+130,676],[c,640],[c-130,676]]);
}
function ladderDraw(x,W,H){x.fillRect(22,0,34,H);x.fillRect(W-56,0,34,H);for(let y=40;y<H;y+=104)x.fillRect(22,y,W-44,26);}

/* ================= THE COSMOS ================= */
function build(){
  const I=0,P=1,D=2, yP=h=>-870-h;
  /* -------- INFERNO: the funnel of Botticelli's Mappa -------- */
  seed=11;
  chunk(C(I,1),3).forEach(g=>{const th=-0.95+1.42*rnd(),r=676+230*Math.sqrt(rnd()),a=rnd()*TAU;
    tree(g,[r*Math.cos(th),820,r*Math.sin(th)],UY,[Math.cos(a),0,Math.sin(a)],1.9+rnd()*0.7,{twist:0.7});});
  hlRing(1000,820,0.06); hlRing(640,820,0.34);
  loft(T(C(I,2)),Object.assign(band(728,820.3,668,820.3,{th0:0.5,th1:1.43}),{face:'up'}));
  shape(T(C(I,3,1,9)),{W:420,H:480,k:70/420,origin:[-35,900,655],ex:[1,0,0],ey:[0,-1,0],draw:gateDraw});
  loft(T(C(I,3,10,69)),Object.assign(band(641,818,614,818),{face:'up'}));
  curves(T(C(I,3,70)),[{n:3600,f:t=>{const th=t*TAU*2+0.3,r=611.5-4*t+1.2*Math.sin(th*9);return [r*Math.cos(th),815.6+0.5*Math.sin(th*6),r*Math.sin(th)];},up:flat(UY)}]);

  function circle(lines,rT,yT,rB,yB,rIn,o){
    o=o||{}; const aw=Math.PI*(rT+rB)*Math.hypot(rT-rB,yT-yB), af=Math.PI*(rB*rB-rIn*rIn);
    const [lw,lf]=splitW(lines,[aw,af]);
    loft(T(lw),Object.assign(band(rT,yT,rB,yB),{face:'in'}));
    loft(T(lf),Object.assign(band(rB-0.3,yB,rIn,yB,{yfT:o.yf,yfB:o.yf2||o.yf}),{face:'up'}));
    hlRing(rT,yT,0.3);hlRing(rB,yB,0.2);
  }
  // I · Limbo + castle of seven walls
  circle(C(I,4,1,105),610,815,590,775,555);
  { const cx=-572,cz=0,ws=[],rs=[],hs=[]; for(let j=0;j<7;j++){rs.push(2.5+2.2*j);hs.push(13-1.5*j);ws.push(rs[j]*hs[j]);}
    splitW(C(I,4,106),ws).forEach((ls,j)=>{loft(T(ls),Object.assign(band(rs[j],775+hs[j],rs[j],775.2,{cx,cz}),{face:'out'}));hlRing(rs[j],775+hs[j],0.25,{cx,cz});}); }
  // II · whirlwind
  circle(C(I,5,1,72),555,775,538,735,505);
  { const tk=T(C(I,5,73)),turns=Math.max(1,Math.round(tAdv(tk)*1.9/(TAU*521)));
    curves(tk,[{n:turns*1100,f:t=>{const th=t*TAU*turns;const r=521+11*Math.sin(th*2.7+t*13);return [r*Math.cos(th),752+9*Math.sin(th*1.9)+4*Math.sin(th*5.3),r*Math.sin(th)];},up:rib(UY)}]); }
  // III · rain
  circle(C(I,6,1,60),505,735,490,697,458);
  C(I,6,61).forEach(l=>{const th=rnd()*TAU,r=461+26*rnd(),y0=697+26+rnd()*14,u=[-Math.sin(th),0,Math.cos(th)];
    verse(l,1.15,s=>[r*Math.cos(th),y0-s,r*Math.sin(th)],()=>u);});
  // IV
  circle(C(I,7,1,66),458,697,444,660,414);
  // V · Styx
  loft(T(C(I,7,67)),Object.assign(band(414,660,401,625),{face:'in'})); hlRing(414,660,0.3);
  loft(T(C(I,8,1,81)),Object.assign(band(400.7,625,375,625,{yfT:th=>1.3*Math.sin(th*37),yfB:th=>1.3*Math.sin(th*37+1.3)}),{face:'up'})); hlRing(401,625,0.2);
  // City of Dis: walls and towers
  loft(T(C(I,8,82)),Object.assign(band(374.5,706,374.5,625.5),{face:'out'}));
  loft(T(C(I,9,64)),Object.assign(band(371.5,706,371.5,620.5),{face:'in'}));
  hlRing(374.5,706,0.4);hlRing(371.5,706,0.3);
  splitW(C(I,9,1,63),new Array(9).fill(1)).forEach((ls,j)=>{const th=j*TAU/9+0.17,cx=373*Math.cos(th),cz=373*Math.sin(th);
    loft(T(ls),Object.assign(band(7,744,7,625,{cx,cz}),{face:'out'}));hlRing(7,744,0.35,{cx,cz,n:40});});
  // VI · tombs of the heretics
  splitW(C(I,10),new Array(12).fill(1)).forEach((ls,j)=>{const th=j*TAU/12+0.13+rnd()*0.1,c=[358*Math.cos(th),0,358*Math.sin(th)],t=[-Math.sin(th),0,Math.cos(th)],r=[Math.cos(th),0,Math.sin(th)];
    const rect=y=>{const q=[[1,1],[-1,1],[-1,-1],[1,-1]];const p=new Float32Array(12);q.forEach((v,i)=>{p[i*3]=c[0]+t[0]*10*v[0]+r[0]*4.5*v[1];p[i*3+1]=y;p[i*3+2]=c[2]+t[2]*10*v[0]+r[2]*4.5*v[1];});return p;};
    loft(T(ls),{top:rect(626.5),bot:rect(620.2),closed:true,face:'out',center:c});
    const lid=rect(628.5);for(let i=0;i<12;i+=3){lid[i]+=r[0]*3;lid[i+2]+=r[2]*3;}hlPoly(lid,0.3,true);});
  loft(T(C(I,11)),Object.assign(band(345,620,335,585),{face:'in'})); hlRing(345,620,0.3);
  // VII · Phlegethon, wood of suicides, burning sand
  loft(T(C(I,12)),Object.assign(band(335,585.4,311,585.4,{yfT:th=>0.7*Math.sin(th*53),yfB:th=>0.7*Math.sin(th*53+0.9)}),{face:'up'})); hlRing(335,585,0.25);hlRing(311,585,0.2);
  chunk(C(I,13),3).forEach(g=>{const th=rnd()*TAU,r=285+24*rnd(),a=rnd()*TAU;tree(g,[r*Math.cos(th),585,r*Math.sin(th)],UY,[Math.cos(a),0,Math.sin(a)],1.25,{twist:2.4});});
  loft(T(C(I,14,1,60)),Object.assign(band(282,585.2,247,585.2,{th0:0,th1:TAU/3}),{face:'up'}));
  C(I,14,61).forEach(l=>{const th=rnd()*TAU,r=249+32*rnd(),y0=585+18+rnd()*28,t=[-Math.sin(th),0,Math.cos(th)],dv=norm([t[0]*0.28,-1,t[2]*0.28]),u=norm(add(t,dv,-dot(t,dv)));
    verse(l,0.95,s=>[r*Math.cos(th)+dv[0]*s,y0+dv[1]*s,r*Math.sin(th)+dv[2]*s],()=>u);});
  loft(T(C(I,15)),Object.assign(band(282,585.2,247,585.2,{th0:TAU/3,th1:TAU*2/3}),{face:'up'}));
  loft(T(C(I,16,1,90)),Object.assign(band(282,585.2,247,585.2,{th0:TAU*2/3,th1:TAU}),{face:'up'}));
  hlRing(247,585,0.3);
  { const rC=y=>234+13*(y-445)/140; C(I,16,91).forEach((l,j)=>{const col=j%12,row=Math.floor(j/12),th=TAU*0.985-col*0.0085,y0=584-row*34,u=[-Math.sin(th),0,Math.cos(th)];
      verse(l,2.2,s=>{const y=y0-s;const r=rC(y)-0.8;return [r*Math.cos(th),y,r*Math.sin(th)];},()=>u,6);}); }
  loft(T(C(I,17,1,78)),Object.assign(band(247,585,234,445),{face:'in'})); hlRing(234,445,0.3);
  { const tk=T(C(I,17,79)),turns=Math.max(1,Math.round(tAdv(tk)*2.1/(TAU*205)));
    curves(tk,[{n:turns*700,f:t=>{const th=t*TAU*turns+1,r=214-22*t+5*Math.sin(th*2.2);return [r*Math.cos(th),576-128*t+3*Math.sin(th*3),r*Math.sin(th)];},up:rib(UY)}]); }
  // VIII · Malebolge: ten ditches, three ridges of bridges
  { const MO=234,MI=97,yM=r=>330+(r-MI)/(MO-MI)*110,W=(MO-MI)/10,BTH=[0.62,2.71,4.8];
    const bol=[[C(I,18,1,99)],[C(I,18,100)],[C(I,19)],[C(I,20)],[C(I,21),C(I,22)],[C(I,23)],[C(I,24),C(I,25)],[C(I,26),C(I,27)],[C(I,28)],[C(I,29),C(I,30)]];
    bol.forEach((parts,k)=>{
      const ro=MO-k*W,ri=ro-W,rm=(ro+ri)/2,ym=yM(rm)-7.5; let lines=[].concat(...parts);
      const bl=lines.slice(0,3); lines=lines.slice(3);
      if(k===7){ const fl=lines.filter(l=>l.c===OFF[0]+25&&l.v>=39); lines=lines.filter(l=>!(l.c===OFF[0]+25&&l.v>=39));
        fl.forEach(l=>{const th=rnd()*TAU,r=rm+(rnd()-0.5)*4,u=[Math.sin(th),0,-Math.cos(th)],t=[-Math.sin(th),0,Math.cos(th)],ph=rnd()*6;
          verse(l,0.85,s=>{const w=0.7*Math.sin(s*0.5+ph);return [r*Math.cos(th)+t[0]*w,ym+0.6+s,r*Math.sin(th)+t[2]*w];},()=>u,10);}); }
      const [lo,li]=splitW(lines,[ro,ri]);
      loft(T(lo),Object.assign(band(ro,yM(ro),rm,ym),{face:'up'}));
      loft(T(li),Object.assign(band(ri,yM(ri),rm,ym),{face:'up'}));
      bl.forEach((l,b)=>{const th=BTH[b];curves(T([l],false),[{n:48,f:t=>{const r=ro+(ri-ro)*t;return [r*Math.cos(th),yM(ro)+(yM(ri)-yM(ro))*t+4.5*Math.sin(Math.PI*t)+0.6,r*Math.sin(th)];},up:()=>[-Math.sin(th),0,Math.cos(th)]}]);});
      hlRing(ro,yM(ro),0.24);
      if(k===2)for(let h=0;h<18;h++){const th=h*TAU/18+0.1,c=[rm*Math.cos(th),ym+0.2,rm*Math.sin(th)];hlCircle(c,[1,0,0],[0,0,1],1.1,0.35,16);}
    });
    hlRing(MI,yM(MI),0.3);
    BTH.forEach(th=>{const n=120,p=new Float32Array((n+1)*3);for(let i=0;i<=n;i++){const r=MO-(MO-MI)*i/n,f=(i/n*10)%1;p[i*3]=r*Math.cos(th);p[i*3+1]=yM(r)+4.5*Math.sin(Math.PI*f)+0.4;p[i*3+2]=r*Math.sin(th);}hlPoly(p,0.3,false);});
  }
  // IX · well of the giants, Cocytus, Lucifer
  loft(T(C(I,31,1,70)),Object.assign(band(97,330,88,105),{face:'in'}));
  splitW(C(I,31,71),[1,1,1,1,1]).forEach((ls,g)=>{const th=0.4+g*TAU/5,pos=[84*Math.cos(th),105,84*Math.sin(th)],tg=[-Math.sin(th),0,Math.cos(th)],rd=[Math.cos(th),0,Math.sin(th)];
    const [a,b]=splitW(ls,[1,1]);
    /* portfolio: the giants' figures are left out */});
  [[C(I,32,1,69),88,66],[C(I,32,70).concat(C(I,33,1,90)),66,47],[C(I,33,91),47,30],[C(I,34,1,15),30,14]].forEach(([ls,a,b])=>{loft(T(ls),Object.assign(band(a,100,b,100),{face:'up'}));hlRing(a,100,0.25);});
  splitW(C(I,34,16,126),[1,1,1]).forEach((ls,j)=>{const a=j*Math.PI/3+0.3,ex=[Math.cos(a),0,Math.sin(a)];
    /* portfolio: Lucifer's figure is left out */});
  curves(T(C(I,34,127)),[{n:2400,f:t=>{const th=t*TAU*7,r=14+6*t;return [r*Math.cos(th),-100-762*t,r*Math.sin(th)];},up:rib(DY)}]);

  /* -------- PURGATORIO: the mountain at the antipodes -------- */
  seed=23;
  loft(T(C(P,1)),Object.assign(band(588,yP(0),800,yP(0),{yfT:th=>Math.sin(th*31),yfB:th=>Math.sin(th*31+1)}),{face:'down'}));
  hlRing(585,yP(0),0.35);hlRing(800,yP(0),0.08);
  curves(T(C(P,2)),[{n:4000,f:t=>{const th=1.2+t*TAU*1.25,r=1060-470*t;return [r*Math.cos(th),yP(1.5),r*Math.sin(th)];},up:flat(DY)}]);
  const rr=h=>585-105*h/280;
  for(let j=0;j<4;j++){const hA=70*j,hB=70*(j+1);loft(T(C(P,3+j)),Object.assign(band(rr(hB),yP(hB),rr(hA),yP(hA)),{face:'out'}));hlRing(rr(hB),yP(hB),0.18);}
  loft(T(C(P,7)),Object.assign(band(40,yP(257),21,yP(250),{cx:-505,cz:0}),{face:'down'}));
  loft(T(C(P,8)),Object.assign(band(21,yP(250),3,yP(246),{cx:-505,cz:0}),{face:'down'}));
  hlRing(40,yP(257),0.3,{cx:-505,cz:0});
  loft(T(C(P,9,1,72)),Object.assign(band(468,yP(282),482,yP(282)),{face:'down'}));
  shape(T(C(P,9,73)),{W:360,H:420,k:1/6,origin:[30,yP(352),478.5],ex:[-1,0,0],ey:UY,draw:purgGate});
  const TER=[{c:[C(P,10),C(P,11)],l:[C(P,12)]},{c:[C(P,13)],l:[C(P,14)]},{c:[C(P,15)],l:[C(P,17,1,69)],smoke:C(P,16)},{c:[C(P,18)],l:[C(P,17,70)]},{c:[C(P,19),C(P,21)],l:[C(P,20)]},{c:[C(P,24)],l:[C(P,23)],tree:C(P,22)},{c:[C(P,25)],l:[C(P,27)],fire:C(P,26)}];
  TER.forEach((t,k)=>{const R=470-30*k,H=300+70*k;
    loft(T([].concat(...t.l)),Object.assign(band(R-22,yP(H),R,yP(H)),{face:'down'}));
    loft(T([].concat(...t.c)),Object.assign(band(R-30,yP(H+70),R-22,yP(H)),{face:'out'}));
    hlRing(R,yP(H),0.32);hlRing(R-22,yP(H),0.16);
    if(t.smoke)loft(T(t.smoke),Object.assign(band(R-9,yP(H+40),R+5,yP(H+14),{yfT:th=>-5*Math.sin(th*6),yfB:th=>-4*Math.sin(th*6+0.8)}),{face:'out'}));
    if(t.tree)rayTree(t.tree,[(R-11)*Math.cos(0.8),yP(H),(R-11)*Math.sin(0.8)],DY,46,0.95,1.1);
    if(t.fire)t.fire.forEach(l=>{const th=rnd()*TAU,r=R-2.5-rnd()*2,u=[Math.sin(th),0,-Math.cos(th)],tg=[-Math.sin(th),0,Math.cos(th)],ph=rnd()*6;
      verse(l,1.05,s=>{const w=0.8*Math.sin(s*0.4+ph);return [r*Math.cos(th)+tg[0]*w,yP(H)-s,r*Math.sin(th)+tg[2]*w];},()=>u,10);});
  });
  // Earthly Paradise on the summit
  const HS=790; hlRing(260,yP(HS),0.34);
  loft(T(C(P,28,76)),Object.assign(band(85,yP(HS),258,yP(HS)),{face:'down'}));
  chunk(C(P,28,1,75),3).forEach(g=>{const th=rnd()*TAU,r=95+150*rnd(),a=rnd()*TAU;tree(g,[r*Math.cos(th),yP(HS),r*Math.sin(th)],DY,[Math.cos(a),0,Math.sin(a)],1.5,{twist:0.5});});
  curves(T(C(P,29)),[0,1,2,3,4,5,6].map(j=>({n:200,f:t=>[-330+660*t,yP(818),-18+6*j],up:flat(UY)})));
  curves(T(C(P,30)),[{n:2400,f:t=>{const th=t*TAU*4;const r=18+46*t;return [r*Math.cos(th),yP(828+8*Math.sin(th*2.5)),r*Math.sin(th)];},up:rib(DY)}]);
  const river=(lines,cf)=>{const n=300,a=new Float32Array((n+1)*3),b=new Float32Array((n+1)*3);
    for(let i=0;i<=n;i++){const s=i/n,c=cf(s),c2=cf(Math.min(1,s+0.002)),c1=cf(Math.max(0,s-0.002));let dx=c2[0]-c1[0],dz=c2[1]-c1[1];const m=Math.hypot(dx,dz)||1;dx/=m;dz/=m;
      a.set([c[0]-dz*4,yP(HS+1),c[1]+dx*4],i*3);b.set([c[0]+dz*4,yP(HS+1),c[1]-dx*4],i*3);}
    loft(T(lines),{top:a,bot:b,closed:false,face:'down'});hlPoly(a,0.2,false);hlPoly(b,0.2,false);};
  river(C(P,31),s=>[-250+500*s,55*Math.sin(s*TAU*1.3)+20]);
  rayTree(C(P,32),[0,yP(HS),0],DY,120,1.5,1.6);
  river(C(P,33),s=>[-240+480*s,-70+45*Math.sin(s*TAU*1.1+1)]);

  /* -------- PARADISO: nested heavens, emblems on the axis of ascent -------- */
  seed=37;
  curves(T(C(D,1)),[{n:3000,f:t=>{const th=t*TAU*5,r=40+170*t;return [r*Math.cos(th),-1800-280*t,r*Math.sin(th)];},up:rib(DY)}]);
  const SR=[2100,2450,2800,3200,3650,4100,4600,5200,5900];
  const SC=[[2,3,4,5],[6,7],[8,9],[11,13],[15,16,17],[20],[22],[23,24,25,26],[27]];
  SC.forEach((cs,k)=>{const R=SR[k],tgt=6.5+1.5*k;
    const per=cs.map(n=>{const tk=T(C(D,n));return {tk,m:Math.max(1,Math.round(tAdv(tk)*tgt/(TAU*R)))};});
    const M=per.reduce((a,b)=>a+b.m,0),rot=rnd()*TAU; let j=0;
    per.forEach(p=>{const list=[];for(let q=0;q<p.m;q++,j++){const z=1-(j+0.5)/M*0.96,s=Math.sqrt(1-z*z),az=j*2.39996+rot;const nv=[s*Math.cos(az),z,s*Math.sin(az)];
        let a=norm(cross(nv,Math.abs(nv[1])>0.9?[1,0,0]:UY)),b=cross(nv,a); const un=[-nv[0],-nv[1],-nv[2]];
        list.push({n:Math.ceil(TAU*R/3),f:t=>{const c=Math.cos(t*TAU)*R,si=Math.sin(t*TAU)*R;return [a[0]*c+b[0]*si,a[1]*c+b[1]*si,a[2]*c+b[2]*si];},up:()=>un});}
      curves(p.tk,list);});
    hlCircle([0,0,0],[1,0,0],[0,0,1],R,0.12,720);hlCircle([0,0,0],[1,0,0],[0,1,0],R,0.07,720);hlCircle([0,0,0],[0,0,1],[0,1,0],R,0.07,720);
  });
  { const tk=T(C(D,10)),turns=Math.max(1,Math.round(tAdv(tk)*3/(TAU*170)));curves(tk,[{n:turns*500,f:t=>{const th=t*TAU*turns;return [170*Math.cos(th),-3196-16*t,170*Math.sin(th)];},up:rib(DY)}]); }
  { const tk=T(C(D,12)),turns=Math.max(1,Math.round(tAdv(tk)*3/(TAU*230)));curves(tk,[{n:turns*600,f:t=>{const th=-t*TAU*turns;return [230*Math.cos(th),-3196-18*t,230*Math.sin(th)];},up:rib(DY)}]); }
  /* portfolio: the emblems of the heavens (cross, letters, eagle, ladder) are left out: they read as symbols */
  { const ws=[],bs=[];for(let j=0;j<9;j++){const ri=26+36*j,ro=ri+22;bs.push([ro,ri]);ws.push(ro*ro-ri*ri);}
    splitW(C(D,28),ws).forEach((ls,j)=>{loft(T(ls),Object.assign(band(bs[j][0],-6500,bs[j][1],-6500),{face:'up'}));hlRing(bs[j][0],-6500,0.18);});
    loft(T(C(D,29)),Object.assign(band(420,-6500,368,-6500),{face:'up'}));
    for(let i=0;i<40;i++){const v=norm([rnd()-0.5,rnd()-0.5,rnd()-0.5]);hl([0,-6500,0],add([0,-6500,0],v,6+rnd()*14),0.9);} }
  { const n=2400,a=new Float32Array((n+1)*3),b=new Float32Array((n+1)*3);
    for(let i=0;i<=n;i++){const th=i/n*TAU*4.5,r=900-80*th/TAU;a.set([(r+8)*Math.cos(th),-6900,(r+8)*Math.sin(th)],i*3);b.set([(r-8)*Math.cos(th),-6900,(r-8)*Math.sin(th)],i*3);}
    loft(T(C(D,30)),{top:a,bot:b,closed:false,face:'up'}); }
  const petal=th=>1+0.05*Math.pow(Math.abs(Math.sin(th*6)),0.7);
  loft(T(C(D,31)),Object.assign(band(300,-7125,120,-7000,{rf:petal}),{face:'in'}));
  loft(T(C(D,32)),Object.assign(band(480,-7250,300,-7125,{rf:petal}),{face:'in'}));
  hlRing(480,-7250,0.25,{rf:petal});hlRing(120,-7000,0.25);
  splitW(C(D,33,1,142),[1,1,1]).forEach((ls,j)=>{const az=j*TAU/3,ti=62*Math.PI/180,nv=[Math.sin(ti)*Math.cos(az),Math.cos(ti),Math.sin(ti)*Math.sin(az)];
    const a=norm(cross(nv,UY)),b=cross(nv,a),c=[0,-7110,0],N=360,top=new Float32Array(N*3),bot=new Float32Array(N*3);
    for(let i=0;i<N;i++){const t=i/N*TAU,co=Math.cos(t),si=Math.sin(t);for(let q=0;q<3;q++){top[i*3+q]=c[q]+(a[q]*co+b[q]*si)*78;bot[i*3+q]=c[q]+(a[q]*co+b[q]*si)*64;}}
    loft(T(ls),{top,bot,closed:true,face:nv});});
  loft(T(C(D,33,143)),Object.assign(band(16,-7110,5,-7110),{face:'up'}));
  /* portfolio: no axis hairline (the camera travels on it) */
}



/* ================= RENDERING (portfolio version) =================
   The same instanced glyph world as Mappa della Commedia; the camera is driven by the page (progress p, 0 → 1),
   the pointer lights the verses near it and tilts the view a little, and at the end every glyph and hairline is
   gathered into a book (the two white volumes of the photograph). */
const W0 = opts.width || innerWidth, H0 = opts.height || innerHeight;
let renderer;
renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.setClearColor(0x000000, 1);
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(50, W0 / H0, 0.3, 90000);
const V3 = THREE.Vector3;
// the book: two volumes stacked, measured off the photograph (u across, v down, 0–1 of the book's front)
// the book is built in its own frame (x across, y up the spines, z out of the front) and set across the axis below
// the spiral of the first heaven, its front facing back up the axis, so the dive ends square to it
const BS = .19, BW = 2000 * BS, BH = 2150 * BS, BD = 1500 * BS, BC = new V3(0, 0, 0), ZF = BD / 2;
const BEX = new V3(-1, 0, 0), BEY = new V3(0, 0, 1), BEZ = new V3(0, 1, 0), BFRONT = -1100, BPOS = new V3(0, BFRONT - ZF, 0);
const toW = (x, y, z) => BPOS.clone().addScaledVector(BEX, x).addScaledVector(BEY, y).addScaledVector(BEZ, z);
const PARTS = [   // [u0, u1, v0, v1, z inset, kind]  kind: 0 cloth spine, 1 page block, 2 board edge
  [.011, .997, 0, .239, 0, 0], [.011, .997, .239, .254, 6, 2], [.030, .990, .254, .469, 14, 1], [.011, .997, .469, .488, 6, 2],
  [0, .990, .499, .751, 0, 0], [.011, .990, .757, .976, 14, 1], [0, 1, .976, 1, 6, 2]];
const EMB = [[.085, .558, .07, .17], [.06, .36, .58, .67]];  // the embossed title blocks on the two spines
const bx = u => BC.x - BW / 2 + u * BW, by = v => BC.y + BH / 2 - v * BH;
const U = { uAtlas: { value: null }, uGW: { value: GW }, uPix: { value: 800 }, uFog: { value: 3000 }, uClip: { value: 0 }, uClipN: { value: new THREE.Vector2(0, 1) },
  uSel: { value: -1 }, uSelAmt: { value: 0 }, uCam: { value: new THREE.Vector3() }, uCol: { value: new THREE.Color(0xf6f4ee) },
  uGather: { value: 0 }, uAbsorb: { value: 0 }, uBS: { value: 8.5 * .19 }, uBX: { value: new THREE.Vector3(-1, 0, 0) }, uBY: { value: new THREE.Vector3(0, 0, 1) }, uArc: { value: new THREE.Vector3(0, 1, 0) }, uSpin: { value: 0 }, uMouse: { value: new THREE.Vector2(9, 9) }, uTorch: { value: 0 }, uAsp: { value: W0 / H0 }, uLineA: { value: 1 } };

const VS = `
attribute vec2 corner;attribute vec3 iO;attribute vec3 iT;attribute vec3 iU;attribute vec3 iB;attribute float iC;attribute float iR;uniform float uSpin;
uniform float uGW[90];uniform float uPix;uniform float uFog;uniform float uClip;uniform vec2 uClipN;uniform float uSel;uniform float uSelAmt;uniform vec3 uCam;
uniform float uGather;uniform float uAbsorb;uniform float uBS;uniform vec3 uBX;uniform vec3 uBY;uniform vec3 uArc;uniform vec2 uMouse;uniform float uTorch;uniform float uAsp;
varying vec2 vUv;varying float vA;
void main(){
  float code=floor(iC);float b=iC-code;float c=floor(code/128.0+0.0001);float g=code-c*128.0;
  float w=uGW[int(g+0.5)];
  float lx=mix(-${(PADX / FS).toFixed(5)},w+${(PADX / FS).toFixed(5)},corner.x);
  float ly=mix(-${((CH - BASE) / FS).toFixed(5)},${(BASE / FS).toFixed(5)},corner.y);
  // gathering: each glyph leaves at its own moment and flies, turning, to its place on (or in) the book
  float h=fract(sin(dot(iO.xz,vec2(12.9898,78.233))+iO.y*0.0173)*43758.5453);
  float gg=clamp((uGather-h*0.45)/0.55,0.0,1.0);float e=gg*gg*(3.0-2.0*gg);
  // rings turn as the page scrolls (uSpin follows the scroll, so they stop when it stops): each ring the other way from
  // the one before it, and slower the wider it is, as gears in mesh do
  vec3 O0=iO,T0=iT,U0=iU;
  if(iR>0.5){float rr=length(iO.xz);float th=(mod(iR,2.0)<1.0?1.0:-1.0)*uSpin*260.0/max(rr,60.0);float cs=cos(th),sn=sin(th);
    mat2 Rm=mat2(cs,sn,-sn,cs);O0.xz=Rm*iO.xz;T0.xz=Rm*iT.xz;U0.xz=Rm*iU.xz;}
  vec3 O=mix(O0,iB,e);
  float e2=e*e,fl=1.0+1.1*sin(e*3.14159);vec3 Tt=mix(T0,uBX*uBS,e2)*fl;vec3 Uu=mix(U0,uBY*uBS,e2)*fl;   // letters swell in flight
  O+=uArc*sin(e*3.14159)*length(iB-iO)*0.18;   // a soft arc toward the viewer on the way
  bool inEarth=(iO.y>-60.0&&iO.y<960.0&&length(iO.xz)<1150.0);
  if(e<0.001&&uClip>0.5&&inEarth&&dot(O0.xz,uClipN)>0.0){gl_Position=vec4(2.0,2.0,2.0,1.0);vA=0.0;vUv=vec2(0.0);return;}
  vec3 p=O+Tt*lx+Uu*ly;
  vec4 mv=modelViewMatrix*vec4(p,1.0);float dep=-mv.z;
  gl_Position=projectionMatrix*mv;
  float col=mod(g,10.0);float row=floor(g/10.0+0.0001);
  vUv=vec2((col*${CW}.0+${PADX}.0+lx*${FS}.0)/${ATS}.0,1.0-(row*${CH}.0+${BASE}.0-ly*${FS}.0)/${ATS}.0);
  float sz=length(Uu);float px=sz*uPix/max(dep,0.01);
  float a=b*1.18;
  a*=dot(cross(Tt,Uu),uCam-O)>0.0?1.0:0.72;   // portfolio: the far side of a band of verse stays legible as a texture (the dive sees much of it from behind)
  a*=0.34+0.66*smoothstep(0.8,4.0,px);
  a*=exp(-dep/uFog);
  a*=smoothstep(0.5,2.6,dep/max(sz,0.001));
  float isSel=step(abs(c-uSel),0.5);
  a*=mix(1.0,mix(0.42,2.0,isSel),uSelAmt);
  // the pointer is a lamp: verses near it brighten
  vec2 sp=gl_Position.xy/gl_Position.w;vec2 dm=(sp-uMouse)*vec2(uAsp,1.0);
  a*=1.0+uTorch*1.6*exp(-dot(dm,dm)*9.0);
  a*=1.0+0.5*sin(e*3.14159)+0.6*e;          // bright in flight, a little brighter once landed
  a*=mix(1.0,1.0-uAbsorb,e);
  vA=a;
}`;
const FSH = `
uniform sampler2D uAtlas;uniform vec3 uCol;varying vec2 vUv;varying float vA;
void main(){float a=texture2D(uAtlas,vUv).a*vA;if(a<0.003)discard;gl_FragColor=vec4(uCol,min(a,1.0));}`;
const LVS = `
attribute float aA;uniform float uFog;uniform float uClip;uniform vec2 uClipN;uniform float uLineA;varying float vA;
void main(){
  bool inEarth=(position.y>-60.0&&position.y<960.0&&length(position.xz)<1150.0);
  vec4 mv=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mv;
  float k=(uClip>0.5&&inEarth&&dot(position.xz,uClipN)>0.0)?0.0:1.0;
  vA=aA*k*exp(-(-mv.z)/uFog)*uLineA;
}`;
const LFS = `uniform vec3 uCol;varying float vA;void main(){if(vA<0.002)discard;gl_FragColor=vec4(uCol,vA);}`;

const atlas = buildAtlas();
const tex = new THREE.CanvasTexture(atlas); tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter; tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
U.uAtlas.value = tex;
build();
// where every glyph goes in the book: a third settle on the front, in rows (denser on the embossed titles); the
// rest sink inside the volumes
const AB = new Float32Array(NG * 3);
{
  let s = 977; const r = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const area = PARTS.map(P => (P[1] - P[0]) * (P[3] - P[2])), tot = area.reduce((a, b) => a + b, 0);
  for (let i = 0; i < NG; i++) {
    let x, y, z; const k = r();
    if (k < .16) {                                          // the embossed titles
      const E = EMB[r() < .62 ? 0 : 1], u = E[0] + (E[1] - E[0]) * r(), v = E[2] + (E[3] - E[2]) * Math.floor(r() * 9) / 8;
      x = bx(u); y = by(v) + (r() - .5) * 4 * BS; z = ZF + 1.5 * BS;
    } else {
      let t = r() * tot, j = 0; while (j < PARTS.length - 1 && t > area[j]) { t -= area[j]; j++; }
      const P = PARTS[j], u = P[0] + (P[1] - P[0]) * r(), v = P[2] + (P[3] - P[2]) * r();
      x = bx(u); y = by(v);
      if (k < .42) { z = ZF - P[4] * BS + 1.5 * BS; if (P[5] === 1) y = by(P[2]) - (Math.floor((by(P[2]) - y) / (9 * BS)) + .5) * 9 * BS; }   // page edges: rows
      else z = ZF - (P[4] + 8) * BS - r() * (BD - 40 * BS);
    }
    const wv = toW(x, y, z); AB[i * 3] = wv.x; AB[i * 3 + 1] = wv.y; AB[i * 3 + 2] = wv.z;
  }
}
const g = new THREE.InstancedBufferGeometry();
g.setAttribute('corner', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2));
g.setIndex([0, 1, 2, 0, 2, 3]);
g.setAttribute('iO', new THREE.InstancedBufferAttribute(AO.slice(0, NG * 3), 3));
g.setAttribute('iT', new THREE.InstancedBufferAttribute(AT.slice(0, NG * 3), 3));
g.setAttribute('iU', new THREE.InstancedBufferAttribute(AU.slice(0, NG * 3), 3));
g.setAttribute('iB', new THREE.InstancedBufferAttribute(AB, 3));
g.setAttribute('iC', new THREE.InstancedBufferAttribute(AC.slice(0, NG), 1));
g.setAttribute('iR', new THREE.InstancedBufferAttribute(AR.slice(0, NG), 1));
g.instanceCount = NG;
const m = new THREE.ShaderMaterial({ uniforms: U, vertexShader: VS, fragmentShader: FSH, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 1; scene.add(mesh);
const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(HP, 3)); lg.setAttribute('aA', new THREE.Float32BufferAttribute(HA, 1));
const lm = new THREE.ShaderMaterial({ uniforms: U, vertexShader: LVS, fragmentShader: LFS, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
const lines = new THREE.LineSegments(lg, lm); lines.frustumCulled = false; lines.renderOrder = 0; scene.add(lines);

// the solid book (fades in as the glyphs land) and its hairline drawing (drawn first, while the text is still flying)
const book = new THREE.Group(); book.matrixAutoUpdate = false; book.matrix.makeBasis(BEX, BEY, BEZ).setPosition(BPOS); scene.add(book);
const bookMat = [], edgeMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthTest: false });
PARTS.forEach(P => {
  const w = (P[1] - P[0]) * BW, h = (P[3] - P[2]) * BH, d = BD - P[4] * 2 * BS;
  const geo = new THREE.BoxGeometry(w, h, d);
  const tone = P[5] === 0 ? 0xf3f3f1 : P[5] === 1 ? 0xfbfbfa : 0xeeeeec;
  const mt = new THREE.MeshLambertMaterial({ color: tone, transparent: true, opacity: 0, depthWrite: true });
  bookMat.push(mt);
  const bx3 = new THREE.Mesh(geo, mt); bx3.position.set(bx((P[0] + P[1]) / 2), by((P[2] + P[3]) / 2), BC.z - P[4] * BS); bx3.renderOrder = 3; book.add(bx3);
  const ed = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat); ed.position.copy(bx3.position); ed.renderOrder = 2; book.add(ed);
});
scene.add(new THREE.HemisphereLight(0xffffff, 0xc8c8c8, .78));
const sun = new THREE.DirectionalLight(0xffffff, .42); sun.position.copy(BEX.clone().multiplyScalar(-.5).addScaledVector(BEY, .8).addScaledVector(BEZ, 1)); scene.add(sun);

/* ---------------- camera along the page ---------------- */
// It opens on the funnel of the Inferno, near (its rings of verse fill the screen), rises over the rim to look straight
// down its axis and then dives through the circles like a tunnel, through the ice at the centre where the world turns
// over, and on, as every letter streams past into the book lying across the axis beyond, until it rests square to it.
// key views: [p, target, offset, roll, up]; between them the view direction is slerped, the distance log-lerped, the
// roll eased (1: turned over), the up vector slerped
const DN = [0, 0, -1];                                        // 'up' on the screen while looking down the axis
const K = [
  [0.00, [0, 430, 0], [0, 750, 777], 0],                    // opens with the funnel filling the screen
  [0.11, [0, 390, 0], [0, 840, 520], 0],
  [0.21, [0, 320, 0], [0, 720, 2], 0, DN],
  [0.36, [0, 60, 0], [0, 320, .5], 0, DN],
  [0.48, [0, -200, 0], [0, 300, .5], .5, DN],
  [0.58, [0, -500, 0], [0, 330, .5], 1, DN],
  [0.86, null, null, 1, DN]];                                 // the book, square to the screen (set from the photograph)
let finalView = null;
const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
function slerp(a, b, e) { const d = Math.min(1, Math.max(-1, a.dot(b))), om = Math.acos(d); if (om < 1e-4) return a.clone(); const so = Math.sin(om); return a.clone().multiplyScalar(Math.sin((1 - e) * om) / so).add(b.clone().multiplyScalar(Math.sin(e * om) / so)); }
function view(p) {
  const KK = K.map(k => k[1] ? k : [k[0], finalView ? finalView.t : [0, BFRONT, 0], finalView ? finalView.o : [0, 700, 0], k[3], k[4]]);
  const upOf = k => new V3(...(k[4] || [0, 1, 0])).normalize();
  if (p <= KK[0][0]) return { t: new V3(...KK[0][1]), o: new V3(...KK[0][2]), roll: KK[0][3], up: upOf(KK[0]) };
  for (let i = 0; i < KK.length - 1; i++) {
    const A = KK[i], B = KK[i + 1];
    if (p <= B[0]) {
      const e = ease((p - A[0]) / (B[0] - A[0])), oa = new V3(...A[2]), ob = new V3(...B[2]);
      const la = oa.length(), lb = ob.length(), dir = slerp(oa.normalize(), ob.normalize(), e);
      return { t: new V3(...A[1]).lerp(new V3(...B[1]), e), o: dir.multiplyScalar(Math.exp(Math.log(la) * (1 - e) + Math.log(lb) * e)), roll: A[3] + (B[3] - A[3]) * e, up: slerp(upOf(A), upOf(B), e) };
    }
  }
  const L = KK[KK.length - 1]; return { t: new V3(...L[1]), o: new V3(...L[2]), roll: L[3], up: upOf(L) };
}
let mxS = 0, myS = 0, dirty = true;
const BG0 = new THREE.Color(0x000000), BG1 = new THREE.Color(0xdadada), bg = new THREE.Color();
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function render(p, mx, my, dt) {
  // pointer: a slight turn of the view, and a lamp on the verses (both let go as the book forms)
  const free = 1 - sm(.6, .72, p);
  mxS += ((mx || 0) - mxS) * Math.min(1, dt * 3); myS += ((my || 0) - myS) * Math.min(1, dt * 3);
  const v = view(p), up0 = v.up;
  const fwd0 = v.o.clone().negate().normalize();
  const side = new V3().crossVectors(fwd0, up0); if (side.lengthSq() < 1e-6) side.set(1, 0, 0); side.normalize();
  v.o.applyAxisAngle(up0, -mxS * .16 * free).applyAxisAngle(side, myS * .08 * free);
  cam.position.copy(v.t).add(v.o);
  const fwd = v.t.clone().sub(cam.position).normalize();
  const up = up0.clone().addScaledVector(fwd, -up0.dot(fwd)).normalize().applyAxisAngle(fwd, v.roll * Math.PI);
  cam.up.copy(up); cam.lookAt(v.t);
  const dist = cam.position.distanceTo(v.t);
  U.uFog.value = Math.max(220, dist * 3.4) * (1 + 6 * sm(.5, .64, p));   // close up, the far side of the world falls away
  { const rx = cam.position.x, rz = cam.position.z, rl = Math.hypot(rx, rz), fx = cam.position.x - v.t.x, fz = cam.position.z - v.t.z, fl = Math.hypot(fx, fz);
    const w = Math.min(1, Math.max(0, (fl / Math.max(dist, 1e-3) - .05) / .2));
    let nx = (rl > 1 ? rx / rl : 0) * (1 - w) + (fl > 1e-6 ? fx / fl : 0) * w, nz = (rl > 1 ? rz / rl : 0) * (1 - w) + (fl > 1e-6 ? fz / fl : 0) * w;
    const nl = Math.hypot(nx, nz); if (nl > 1e-4) U.uClipN.value.set(nx / nl, nz / nl); }
  U.uCam.value.copy(cam.position);
  U.uMouse.value.set(mx || 9, -(my || 9)); U.uTorch.value = (mx == null ? 0 : 1) * free;
  // the gathering
  // the timings of the chapter's 'book' part (p): the text flies in .68–.86 while the camera comes round to the book;
  // its hairline drawing shows .76–.84; then the paper (.84–.91) and the solid volumes (.85–.91) arrive
  const gat = sm(.42, .8, p), abs = sm(.85, .92, p), solid = sm(.84, .9, p);
  U.uSpin.value = p * 5;                                   // the rings' turn, tied to the scroll
  U.uGather.value = gat; U.uAbsorb.value = abs; U.uLineA.value = 1 - sm(.42, .54, p);
  edgeMat.opacity = sm(.72, .82, p) * (1 - sm(.88, .91, p)) * .55;
  bookMat.forEach(mt => { mt.opacity = solid; mt.visible = solid > .002; });
  bg.copy(BG0).lerp(BG1, sm(.83, .9, p)); renderer.setClearColor(bg, 1);
  U.uCol.value.setRGB(.965, .957, .933).lerp(new THREE.Color(1, 1, 1), sm(.83, .89, p));
  renderer.render(scene, cam);
  return Math.abs((mx || 0) - mxS) + Math.abs((my || 0) - myS) > 1e-3;   // still easing toward the pointer
}
function resize(w, h) {
  dirty = true; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); U.uAsp.value = w / h;
  U.uPix.value = renderer.getDrawingBufferSize(new THREE.Vector2()).y / (2 * Math.tan(cam.fov * Math.PI / 360));
}
// square the camera to the book so that its front lands exactly on the photograph's book (screen rect, CSS px)
function fitTo(rect, w, h) {
  dirty = true;
  const tn = Math.tan(cam.fov * Math.PI / 360), d = BH * h / (2 * rect.h * tn), wpp = 2 * d * tn / h;
  const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
  const X = BC.x - (cx - w / 2) * wpp, Y = BC.y + (cy - h / 2) * wpp, T = toW(X, Y, ZF);
  finalView = { t: [T.x, T.y, T.z], o: [BEZ.x * d, BEZ.y * d, BEZ.z * d] };
}
resize(W0, H0);
return { render, resize, fitTo, glyphs: NG, get dirty() { const d = dirty; dirty = false; return d; } };
};

/* Fourteen Years, as an X-ray archive. The fourteen typefaces (one for each year of examinations, 2010–2023) are
   modelled as X-ray bodies: every letter a stack of outline slices, like a tomograph, white on black, edges brightest,
   the inside a faint density, with film grain. The page goes dark and the fourteen stand as exhibits, 01 to 14, each
   turning on its stand with the scroll; each time a letter is seen edge-on it becomes the next letter (A … J), the turn
   running down the row from 2010 to 2023. Then the fourteen J's close up into one body along a time axis, the slices
   between two years passing from one J into the next: the camera walks round it, comes to its front and travels down
   it, 2010 to 2023, and the last J comes to rest exactly on the J printed in the book, where the photograph takes over.
   Glyphs: fy/fy-glyphs.js (traced from the specimen, 14 × 26, tiles 600 units high). Needs THREE (r128). */
window.FYStage = function (frame, opts) {
  'use strict';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smt = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const eio = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const eo3 = t => 1 - Math.pow(1 - t, 3);
  const N = 14, TH = 600, TW = 384, J = 9, YEARS = Array.from({ length: N }, (_, k) => 2010 + k);
  // timeline (u)
  const DARK = [0, .6], SET = [.45, .55], SET_ST = .035, CYC = [1.1, 2.6], CYC_ST = .03, GATHER = [4.0, .8];
  const K0 = 4.8, K1 = 5.5, K2 = 6.05, K3 = 7.3, PH = [7.2, 7.7], END = 8.0;
  const FOV = 32, FOV_END = 104, DZ = 1, PER = 10;       // body: one unit per year, ten slices to a year
  const PJ = [313.95, 383.7], UG = 1 / TH;                 // the J's pivot (units) and world size of a unit
  const TINT = [.82, .93, 1];
  const REG = opts.reg;

  frame.classList.add('fy');
  const cv = document.createElement('canvas'); cv.className = 'ws-cv'; cv.setAttribute('aria-hidden', 'true');
  const photo = document.createElement('img'); photo.className = 'ws-photo'; photo.alt = ''; photo.decoding = 'async';
  const ov = document.createElement('canvas'); ov.className = 'ws-cv'; ov.setAttribute('aria-hidden', 'true');
  frame.appendChild(cv); frame.appendChild(photo); frame.appendChild(ov);
  const ox = ov.getContext('2d');
  let T = null, R = null, scene, cam, G = null, P2 = [], vw = 1, vh = 1, dpr = 1, mobile = false, loaded = 0, key = '', g0 = null, font = '';
  let cards = [], card = { w: 1, h: 1 }, ex = [], body = null, bodyMat = null, atlas = null, built = false;

  function js(src) { return new Promise((res, rej) => { const el = document.createElement('script'); el.src = src; el.onload = res; el.onerror = rej; document.head.appendChild(el); }); }
  function load() {
    if (loaded) return; loaded = 1;
    photo.src = opts.photo;
    Promise.all([window.THREE ? 0 : js(opts.three), window.FY_GLYPHS ? 0 : js(opts.glyphs)]).then(() => {
      T = window.THREE; G = window.FY_GLYPHS; P2 = G.map(r => r.map(() => null)); init(); key = '';
    }).catch(e => console.warn('FY world off:', e));
  }
  const path = (y, g) => P2[y][g] || (P2[y][g] = new Path2D(G[y][g][1]));

  /* ---------- X-ray film of one glyph: R edge, G density, B glow ---------- */
  function xray(c, yi, gi, x0, y0, w, h) {
    const s = h / TH, gw = G[yi][gi][0];
    c.save(); c.translate(x0, y0); c.beginPath(); c.rect(0, 0, w, h); c.clip();
    c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
    c.translate((w - gw * s) / 2, 0); c.scale(s, s);
    const p = path(yi, gi);
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = 'rgb(0,255,0)'; c.fill(p);
    c.shadowColor = 'rgb(0,0,255)'; c.shadowBlur = 14 * s * 2.2; c.strokeStyle = 'rgb(0,0,255)'; c.lineWidth = 5; c.stroke(p);
    c.shadowBlur = 0; c.strokeStyle = 'rgb(255,0,0)'; c.lineWidth = Math.max(2.2, 1.6 / s); c.stroke(p);
    c.restore();
  }

  /* ---------- slice stacks ---------- */
  const VS = `
    attribute float aSl; varying vec2 vUv; varying float vSl, vD;
    void main(){ vUv = uv; vSl = aSl; vec4 mv = modelViewMatrix * vec4(position, 1.); vD = -mv.z; gl_Position = projectionMatrix * mv; }`;
  const FS_EX = `
    precision highp float;
    uniform sampler2D uTex; uniform float uA, uFlip, uTime; uniform vec3 uTint;
    varying vec2 vUv; varying float vSl, vD;
    float h21(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec2 uv = vec2(uFlip > .5 ? 1. - vUv.x : vUv.x, vUv.y);
      vec3 t = texture2D(uTex, uv).rgb;
      float face = 1. - smoothstep(0., .1, min(vSl, 1. - vSl));
      float v = t.r * (.09 + .5 * face) + t.g * (.008 + .07 * face) + t.b * (.025 + .1 * face);
      v *= .8 + .4 * h21(gl_FragCoord.xy + uTime);
      gl_FragColor = vec4(uTint * v * uA, 1.);
    }`;
  // the body: slices along the time axis, each a mix of two years' J (atlas 7 × 2)
  const VS_B = `
    attribute vec4 aY; varying vec2 vUv; varying vec4 vY; varying float vD;
    void main(){ vUv = uv; vY = aY; vec4 mv = modelViewMatrix * vec4(position, 1.); vD = -mv.z; gl_Position = projectionMatrix * mv; }`;
  const FS_B = `
    precision highp float;
    uniform sampler2D uTex; uniform float uA, uTime, uN0, uN1, uKey; uniform vec3 uTint;
    varying vec2 vUv; varying vec4 vY; varying float vD;
    float h21(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    vec3 tile(float y, vec2 uv){ float c = mod(y, 7.), r = floor(y / 7. + .001); return texture2D(uTex, vec2((c + uv.x) / 7., 1. - (r + 1. - uv.y) / 2.)).rgb; }
    void main(){
      vec3 a = tile(vY.x, vUv), b = tile(vY.y, vUv), t = mix(a, b, vY.z);
      float face = vY.w;
      float v = t.r * (.06 + .5 * face) + t.g * (.006 + .06 * face) + t.b * (.018 + .08 * face);
      v *= .8 + .4 * h21(gl_FragCoord.xy + uTime);
      v *= smoothstep(uN0, uN1, vD) * mix(1., face * 2.2, uKey);
      gl_FragColor = vec4(uTint * v * uA, 1.);
    }`;
  // quads stacked along z; px,py: the pivot (units); depth spread d (world), ns slices
  function stackGeo(ns, w, h, px, py, d) {
    const pos = [], uv = [], sl = [], idx = [];
    for (let i = 0; i < ns; i++) {
      const z = ns > 1 ? (i / (ns - 1) - .5) * d : 0, f = ns > 1 ? i / (ns - 1) : .5, b = i * 4;
      const x0 = -px * w, x1 = (1 - px) * w, y0 = (py - 1) * h, y1 = py * h;
      pos.push(x0, y0, z, x1, y0, z, x1, y1, z, x0, y1, z); uv.push(0, 0, 1, 0, 1, 1, 0, 1); sl.push(f, f, f, f);
      idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.setAttribute('aSl', new T.Float32BufferAttribute(sl, 1)); g.setIndex(idx); return g;
  }
  function bodyGeo() {
    const pos = [], uv = [], ay = [], idx = [];
    const w = TW * UG, h = TH * UG, x0 = -PJ[0] * UG, x1 = x0 + w, y1 = PJ[1] * UG, y0 = y1 - h;
    let n = 0;
    const add = (z, ya, yb, m, face) => { const b = n * 4; pos.push(x0, y0, z, x1, y0, z, x1, y1, z, x0, y1, z); uv.push(0, 0, 1, 0, 1, 1, 0, 1); for (let q = 0; q < 4; q++) ay.push(ya, yb, m, face); idx.push(b, b + 1, b + 2, b, b + 2, b + 3); n++; };
    for (let k = 0; k < N - 1; k++) for (let i = 0; i < PER; i++) {
      const f = i / PER, m = smt(.2, .8, f);
      add(-(k + f) * DZ, k, k + 1, m, i === 0 ? 1 : 0);
    }
    add(-(N - 1) * DZ, N - 1, N - 1, 0, 1);
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.setAttribute('aY', new T.Float32BufferAttribute(ay, 4)); g.setIndex(idx); return g;
  }
  const xmat = (fs, uni) => new T.ShaderMaterial({ vertexShader: fs === FS_B ? VS_B : VS, fragmentShader: fs, uniforms: uni,
    transparent: true, blending: T.AdditiveBlending, depthTest: false, depthWrite: false, side: T.DoubleSide });

  function init() {
    if (!T || !G || built) return;
    try { R = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: false }); } catch (e) { console.warn('FY world off:', e); return; }
    scene = new T.Scene(); cam = new T.PerspectiveCamera(FOV, 1, .01, 100);
    // exhibits: one stack each, its own film, redrawn when the letter changes
    const tw = mobile ? 160 : 256, th = Math.round(tw * TH / TW);
    ex = YEARS.map((yr, k) => {
      const c = document.createElement('canvas'); c.width = tw; c.height = th;
      const tex = new T.CanvasTexture(c); tex.minFilter = T.LinearFilter; tex.generateMipmaps = false;
      const m = xmat(FS_EX, { uTex: { value: tex }, uA: { value: 0 }, uFlip: { value: 0 }, uTime: { value: 0 }, uTint: { value: new T.Vector3(...TINT) } });
      const g = new T.Group(), mesh = new T.Mesh(stackGeo(16, 1, 1, .5, .5, .26), m);
      g.add(mesh); scene.add(g); mesh.frustumCulled = false;
      return { k, c, x: c.getContext('2d'), tex, m, g, mesh, gl: -1 };
    });
    // the body along the time axis, every year's J on one film
    const aw = mobile ? 200 : 300, ah = Math.round(aw * TH / TW);
    const ac = document.createElement('canvas'); ac.width = aw * 7; ac.height = ah * 2;
    const ax = ac.getContext('2d');
    for (let k = 0; k < N; k++) xray(ax, k, J, (k % 7) * aw, Math.floor(k / 7) * ah, aw, ah);
    atlas = new T.CanvasTexture(ac); atlas.minFilter = T.LinearFilter; atlas.generateMipmaps = false;
    bodyMat = xmat(FS_B, { uTex: { value: atlas }, uA: { value: 0 }, uTime: { value: 0 }, uN0: { value: .03 }, uN1: { value: .4 }, uKey: { value: 0 }, uTint: { value: new T.Vector3(...TINT) } });
    body = new T.Group(); const bm = new T.Mesh(bodyGeo(), bodyMat); bm.frustumCulled = false; body.add(bm); scene.add(body);
    built = true; size();
  }
  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    ov.width = Math.round(vw * dpr); ov.height = Math.round(vh * dpr);
    if (!R) return;
    R.setPixelRatio(Math.min(dpr, mobile ? 2 : 1.5)); R.setSize(vw, vh, false);
    cam.aspect = vw / vh; cam.updateProjectionMatrix(); key = '';
  }

  function layout(w, h, g) {
    vw = w; vh = h; g0 = g; mobile = vw < 700;
    font = `400 ${g.t}px ${g.font}`;
    // the stands: 7 × 2 (5-5-4 on a phone), under the title, across the grid
    const per = mobile ? 5 : 7, rows = Math.ceil(N / per), gapX = mobile ? g.gut : Math.max(g.gut, 28);
    const top = g.headBottom + (mobile ? 22 : 34), labH = g.L * 1.6 + 12, gapY = mobile ? 18 : Math.max(26, vh * .045);
    const room = vh - top - (mobile ? 28 : 40);
    let cw = (vw - 2 * g.m - (per - 1) * gapX) / per;
    cw = Math.min(cw, ((room - (rows - 1) * gapY) / rows - labH) * TW / TH);
    const ch = cw * TH / TW, gx = (vw - 2 * g.m - per * cw) / Math.max(1, per - 1);
    card = { w: cw, h: ch };
    cards = YEARS.map((yr, k) => ({ k, yr, x: g.m + (k % per) * (cw + gx), y: top + Math.floor(k / per) * (ch + labH + gapY) }));
    size();
  }

  // where the printed J sits on screen (the photograph shown whole, on black)
  function reg() {
    const s = Math.min(vw / REG.pw, vh / REG.ph), x0 = (vw - REG.pw * s) / 2, y0 = (vh - REG.ph * s) / 2;
    return { x: x0 + REG.tx * s, y: y0 + REG.ty * s, s: REG.s * s, a: REG.a * Math.PI / 180 };
  }

  const V = (x, y, z) => new T.Vector3(x, y, z);
  const cr = (p0, p1, p2, p3, t) => { const t2 = t * t, t3 = t2 * t; return .5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3); };
  const crv = (a, b, c, d, t) => V(cr(a.x, b.x, c.x, d.x, t), cr(a.y, b.y, c.y, d.y, t), cr(a.z, b.z, c.z, d.z, t));

  function step(u) {
    if (u > -1.8) load();
    const dk = eio(clamp((u - DARK[0]) / (DARK[1] - DARK[0]), 0, 1));
    photo.style.opacity = smt(PH[0], PH[1], u).toFixed(3);
    const k0 = `${u.toFixed(4)}|${!!R}|${vw}|${vh}`;
    if (k0 === key) return dk;
    key = k0;
    const bg = Math.round(lerp(255, 2, dk));
    frame.style.background = `rgb(${bg},${bg},${bg})`;       // the whole frame, also below the drawing on a phone
    if (!R) return dk;
    R.setClearColor(new T.Color(bg / 255, bg / 255, bg / 255), 1);
    const time = (u * 7.3) % 50;

    // ----- archive -----
    const Zc = 10, w0 = 2 * Zc * Math.tan(FOV * Math.PI / 360) / vh;
    const scr = (x, y) => V((x - vw / 2) * w0, -(y - vh / 2) * w0, 0);
    const Rg = reg();
    // final camera: the last J face on, the size and place of the printed one
    const tE = Math.tan(FOV_END * Math.PI / 360), Dn = vh / (2 * tE * Rg.s) * UG, wE = 2 * Dn * tE / vh;
    const zL = -(N - 1) * DZ, camEnd = V(-(Rg.x - vw / 2) * wE, (Rg.y - vh / 2) * wE, zL + Dn);
    const ga = (k) => eio(clamp((u - GATHER[0] - (N - 1 - k) * .012) / GATHER[1], 0, 1));
    const exA = 1 - smt(K0 - .12, K0 + .05, u);
    for (const e of ex) {
      const c = cards[e.k], st = eo3(clamp((u - SET[0] - e.k * SET_ST) / SET[1], 0, 1));
      // the turn: half a turn for every letter, A … J; seen edge-on when the letter changes
      const phi = Math.PI * 9 * clamp((u - CYC[0] - e.k * CYC_ST) / CYC[1], 0, 1);
      const n = Math.min(J, Math.floor(phi / Math.PI + .5));
      if (n !== e.gl) { e.gl = n; xray(e.x, e.k, n, 0, 0, e.c.width, e.c.height); e.tex.needsUpdate = true; }
      const g = ga(e.k);
      const turn = phi + Math.PI * eio(clamp((u - GATHER[0] + .1) / .5, 0, 1));         // on round to face front
      e.m.uniforms.uFlip.value = Math.cos(turn) < 0 ? 1 : 0;
      e.m.uniforms.uTime.value = time;
      const H = card.h * w0, Wd = card.w * w0;
      const p0 = scr(c.x + card.w / 2, c.y + card.h / 2 + (1 - st) * card.h * .3);
      // in the body: the tile's centre, k years down the axis
      const p1 = V((TW / 2 - PJ[0]) * UG, -(TH / 2 - PJ[1]) * UG, -e.k * DZ);
      e.g.position.copy(p0.lerp(p1, g));
      e.g.rotation.set(0, turn, 0);
      e.g.scale.set(lerp(Wd, TW * UG, g), lerp(H, TH * UG, g), lerp(H, TH * UG, g) * lerp(1, .9, g));
      e.m.uniforms.uA.value = st * exA * (1 - .25 * g);
      e.g.visible = st * exA > .002;
    }
    // ----- the camera -----
    const pre = { p: V(0, 0, Zc), t: V(0, 0, 0) };
    const keys = [
      { u: GATHER[0], ...pre }, { u: K0, p: V(2.1, 1.05, 2.5), t: V(-.25, .1, -4.5) }, { u: K1, p: V(-1.35, .65, 2.4), t: V(-.2, .1, -5) },
      { u: K2, p: V(-.1, .12, 1.45), t: V(-.15, .12, -6) }, { u: K3, p: camEnd, t: V(camEnd.x, camEnd.y, zL - 10) },
    ];
    let p, t;
    if (u <= GATHER[0]) { p = pre.p; t = pre.t; }
    else {
      let i = 0; while (i < keys.length - 2 && u > keys[i + 1].u) i++;
      const a = keys[Math.max(0, i - 1)], b = keys[i], c = keys[i + 1], d = keys[Math.min(keys.length - 1, i + 2)];
      const f = eio(clamp((u - b.u) / (c.u - b.u), 0, 1));
      p = crv(a.p, b.p, c.p, d.p, f); t = crv(a.t, b.t, c.t, d.t, f);
    }
    const fl = eio(clamp((u - K2) / (K3 - K2), 0, 1));
    cam.fov = lerp(FOV, FOV_END, Math.pow(fl, 1.6)); cam.updateProjectionMatrix();
    cam.position.copy(p); cam.up.set(0, 1, 0); cam.lookAt(t);
    // the body turns a little on its axis, to the angle of the page in the photograph
    body.rotation.set(0, 0, -Rg.a * fl);
    bodyMat.uniforms.uA.value = smt(K0 - .15, K0 + .05, u) * (1 - smt(PH[0] + .05, PH[1], u));
    bodyMat.uniforms.uTime.value = time;
    // near fade; at the very end only the last J
    const last = smt(K3 - .35, K3 - .02, u);
    bodyMat.uniforms.uN0.value = lerp(.03, Dn - .25, last); bodyMat.uniforms.uN1.value = lerp(.45, Dn - .03, last);
    bodyMat.uniforms.uKey.value = last;
    R.render(scene, cam);

    // ----- labels on the stands; the year being passed through -----
    ox.setTransform(1, 0, 0, 1, 0, 0); ox.clearRect(0, 0, ov.width, ov.height);
    ox.setTransform(dpr, 0, 0, dpr, 0, 0); ox.font = font; ox.textBaseline = 'top';
    const labA = 1 - smt(GATHER[0] - .1, GATHER[0] + .2, u);
    if (labA > .003 && u > SET[0]) for (const c of cards) {
      const st = eo3(clamp((u - SET[0] - c.k * SET_ST - .08) / SET[1], 0, 1)) * labA;
      if (st <= 0) continue;
      const y0 = c.y + card.h + 8;
      ox.globalAlpha = st; ox.fillStyle = 'rgba(210,230,255,.3)'; ox.fillRect(c.x, y0, card.w * st, 1);
      ox.fillStyle = 'rgba(236,240,244,.92)'; ox.textAlign = 'left'; ox.fillText(String(c.k + 1).padStart(2, '0'), c.x, y0 + 6);
      ox.fillStyle = 'rgba(150,160,170,1)'; ox.textAlign = 'right'; ox.fillText(String(c.yr), c.x + card.w, y0 + 6);
    }
    const ya = smt(K2 - .1, K2 + .1, u) * (1 - smt(PH[0] - .1, PH[0] + .15, u));
    if (ya > .003) {
      const yr = clamp(Math.round(-(p.z - .5) / DZ), 0, N - 1);
      ox.globalAlpha = ya; ox.textBaseline = 'alphabetic'; ox.textAlign = 'left';
      ox.fillStyle = 'rgba(236,240,244,.95)'; ox.fillText(String(YEARS[yr]), g0.m, vh - g0.m);
      ox.fillStyle = 'rgba(150,160,170,1)'; ox.fillText(`${String(yr + 1).padStart(2, '0')} / ${N}`, g0.m + g0.t * 4, vh - g0.m);
    }
    ox.globalAlpha = 1;
    return dk;
  }
  return { load, layout, step, END };
};

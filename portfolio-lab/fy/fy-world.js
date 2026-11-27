/* Fourteen Years, as an X-ray archive. The fourteen typefaces (one for each year of examinations, 2010–2023) are
   modelled as X-ray bodies: every letter a stack of outline slices, like a tomograph, white on black, edges brightest,
   the inside a faint density, with film grain. The page goes dark and the fourteen stand as exhibits, 01 to 14, each
   turning on its stand with the scroll; each time a letter is seen edge-on it becomes the next letter (A … J), the turn
   running down the row from 2010 to 2023. Then the fourteen J's close up into one body along a time axis, the slices
   between two years passing from one J into the next: the camera walks round it, comes to its front and travels down
   it, 2010 to 2023, and the last J comes to rest exactly on the J printed in the book, where the photograph takes over.
   Before all this the stands hold the films the faces were taken from, one examination for each year (fy/films.jpg, 7 × 2):
   a scanner line runs down each film and pushes it to black and white, then the letter draws the bright bone into its
   strokes and lets the rest of the film go, the solid letter hollows into an X-ray of itself, and the exhibit takes over.
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
  const DARK = [0, .6], SET = [.45, .55], SET_ST = .035, MO = [1.05, .9], MO_ST = .05, CYC = [2.1, 2.6], CYC_ST = .05, GATHER = [5.3, .8];
  const K0 = 6.1, K1 = 6.8, K2 = 7.35, K3 = 8.6, PH = [8.5, 9.0], END = 9.3;
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
  let cards = [], card = { w: 1, h: 1 }, ex = [], body = null, bodyMat = null, atlas = null, built = false, films = null, sdTex = null;

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
  // the film on its stand, becoming the year's A (films and the A's distance field: atlases 7 × 2)
  const VS_F = `
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
  const FS_F = `
    precision highp float;
    uniform sampler2D uFilm, uSD; uniform vec2 uCell; uniform float uM, uA, uTime; uniform vec3 uTint;
    varying vec2 vUv;
    float h21(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
      return mix(mix(h21(i), h21(i + vec2(1., 0.)), f.x), mix(h21(i + vec2(0., 1.)), h21(i + vec2(1., 1.)), f.x), f.y); }
    vec2 cell(vec2 uv){ return vec2((uCell.x + uv.x) / 7., 1. - (uCell.y + 1. - uv.y) / 2.); }
    void main(){
      vec2 uv = vUv; float m = uM;
      float sd = (texture2D(uSD, cell(uv)).r - .5) * .5;          // to the letter, in card heights, + outside
      float f = texture2D(uFilm, cell(uv)).r;
      float n = vn(uv * vec2(14., 22.)) * .6 + vn(uv * vec2(45., 70.)) * .4;
      // the scanner: behind its line the film is black and white
      float ys = 1.06 - smoothstep(0., .32, m) * 1.12;
      float c = smoothstep(ys - .025, ys + .025, uv.y);
      float line = exp(-abs(uv.y - ys) / .004) * (1. - smoothstep(.26, .32, m)) * .55;
      // the letter draws the bright parts of the film into its strokes and pushes the rest away
      float e = smoothstep(.28, .86, m);
      float bias = e * clamp(-sd * mix(2., 75., e * e), -1.6, 1.6);
      float thr = .58 + (n - .5) * .2 * (1. - e);
      float hi = smoothstep(thr - .05, thr + .05, f + bias + (n - .5) * .3 * e * (1. - e));
      float v = mix(f * .8, hi * (.74 + .26 * f) * .95, c);         // the bone still showing in the strokes
      // the solid letter hollows into an X-ray of itself: the edge bright, inside a faint density
      float h = smoothstep(.78, .95, m);
      v = mix(v, v * .1 + exp(-abs(sd) / .0045) * .85, h);
      v += line;
      v *= .82 + .36 * h21(gl_FragCoord.xy + uTime);
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
  // each year's A as a signed distance field, laid out as xray() lays it out on its tile (two chamfer passes)
  function sdAtlas() {
    const sw = 128, sh = 200, c = document.createElement('canvas'); c.width = sw * 7; c.height = sh * 2;
    const x = c.getContext('2d'), img = x.createImageData(c.width, c.height), BIG = 1e5;
    const mk = document.createElement('canvas'); mk.width = sw; mk.height = sh; const mx = mk.getContext('2d');
    const dIn = new Float32Array(sw * sh), dOut = new Float32Array(sw * sh);
    const pass = (d) => {
      for (let y = 0; y < sh; y++) for (let i = 0; i < sw; i++) { const o = y * sw + i; let v = d[o];
        if (i > 0) v = Math.min(v, d[o - 1] + 1); if (y > 0) { v = Math.min(v, d[o - sw] + 1); if (i > 0) v = Math.min(v, d[o - sw - 1] + 1.4142); if (i < sw - 1) v = Math.min(v, d[o - sw + 1] + 1.4142); } d[o] = v; }
      for (let y = sh - 1; y >= 0; y--) for (let i = sw - 1; i >= 0; i--) { const o = y * sw + i; let v = d[o];
        if (i < sw - 1) v = Math.min(v, d[o + 1] + 1); if (y < sh - 1) { v = Math.min(v, d[o + sw] + 1); if (i < sw - 1) v = Math.min(v, d[o + sw + 1] + 1.4142); if (i > 0) v = Math.min(v, d[o + sw - 1] + 1.4142); } d[o] = v; }
    };
    for (let k = 0; k < N; k++) {
      const s = sh / TH, gw = G[k][0][0];
      mx.setTransform(1, 0, 0, 1, 0, 0); mx.fillStyle = '#000'; mx.fillRect(0, 0, sw, sh);
      mx.translate((sw - gw * s) / 2, 0); mx.scale(s, s); mx.fillStyle = '#fff'; mx.fill(path(k, 0));
      const a = mx.getImageData(0, 0, sw, sh).data;
      for (let o = 0; o < sw * sh; o++) { const ins = a[o * 4] > 127; dIn[o] = ins ? BIG : 0; dOut[o] = ins ? 0 : BIG; }
      pass(dIn); pass(dOut);
      const cx = (k % 7) * sw, cy = Math.floor(k / 7) * sh;
      for (let y = 0; y < sh; y++) for (let i = 0; i < sw; i++) {
        const o = y * sw + i, cov = a[o * 4] / 255, d = (dOut[o] > 0 ? dOut[o] - 1 : 1 - dIn[o]) + (.5 - cov);
        const v = Math.round(clamp(.5 + d / sh * 2, 0, 1) * 255), q = ((cy + y) * c.width + cx + i) * 4;
        img.data[q] = img.data[q + 1] = img.data[q + 2] = v; img.data[q + 3] = 255;
      }
    }
    x.putImageData(img, 0, 0);
    const t = new T.CanvasTexture(c); t.minFilter = T.LinearFilter; t.generateMipmaps = false; return t;
  }
  const xmat = (fs, uni) => new T.ShaderMaterial({ vertexShader: fs === FS_B ? VS_B : VS, fragmentShader: fs, uniforms: uni,
    transparent: true, blending: T.AdditiveBlending, depthTest: false, depthWrite: false, side: T.DoubleSide });

  function init() {
    if (!T || !G || built) return;
    try { R = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: false }); } catch (e) { console.warn('FY world off:', e); return; }
    scene = new T.Scene(); cam = new T.PerspectiveCamera(FOV, 1, .01, 100);
    // exhibits: one stack each, its own film, redrawn when the letter changes
    const tw = mobile ? 160 : 256, th = Math.round(tw * TH / TW);
    films = new T.Texture(); films.minFilter = T.LinearFilter; films.generateMipmaps = false;
    if (opts.films) new T.TextureLoader().load(opts.films, (t) => { t.minFilter = T.LinearFilter; t.generateMipmaps = false; for (const e of ex) e.fm.uniforms.uFilm.value = t; key = ''; });
    sdTex = sdAtlas();
    const plane = new T.PlaneGeometry(1, 1);
    ex = YEARS.map((yr, k) => {
      const c = document.createElement('canvas'); c.width = tw; c.height = th;
      const tex = new T.CanvasTexture(c); tex.minFilter = T.LinearFilter; tex.generateMipmaps = false;
      const m = xmat(FS_EX, { uTex: { value: tex }, uA: { value: 0 }, uFlip: { value: 0 }, uTime: { value: 0 }, uTint: { value: new T.Vector3(...TINT) } });
      const g = new T.Group(), mesh = new T.Mesh(stackGeo(16, 1, 1, .5, .5, .26), m);
      const fm = new T.ShaderMaterial({ vertexShader: VS_F, fragmentShader: FS_F, transparent: true, blending: T.AdditiveBlending, depthTest: false, depthWrite: false,
        uniforms: { uFilm: { value: films }, uSD: { value: sdTex }, uCell: { value: new T.Vector2(k % 7, Math.floor(k / 7)) }, uM: { value: 0 }, uA: { value: 0 }, uTime: { value: 0 }, uTint: { value: new T.Vector3(...TINT) } } });
      const fp = new T.Mesh(plane, fm); fp.frustumCulled = false;
      g.add(mesh); g.add(fp); scene.add(g); mesh.frustumCulled = false;
      return { k, c, x: c.getContext('2d'), tex, m, g, mesh, fm, fp, gl: -1 };
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

  // where the printed J sits on screen (the photograph full screen)
  function reg() {
    const s = Math.max(vw / REG.pw, vh / REG.ph), x0 = (vw - REG.pw * s) / 2, y0 = (vh - REG.ph * s) / 2;   // full screen
    return { x: x0 + REG.tx * s, y: y0 + REG.ty * s, s: REG.s * s, a: REG.a * Math.PI / 180 };
  }

  const V = (x, y, z) => new T.Vector3(x, y, z);
  const cr = (p0, p1, p2, p3, t) => { const t2 = t * t, t3 = t2 * t; return .5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3); };
  const crv = (a, b, c, d, t) => V(cr(a.x, b.x, c.x, d.x, t), cr(a.y, b.y, c.y, d.y, t), cr(a.z, b.z, c.z, d.z, t));


  /* the pointer turns the view a little, as in the Commedia: the camera swings round what it looks at, easing after
     the mouse, and lets go as the view comes to the photograph (window.TAO_PTR, set by the page) */
  const sw = { x: 0, y: 0, t: 0 };
  function swayEase() {
    const P = window.TAO_PTR || { x: 0, y: 0 }, now = performance.now(), dt = sw.t ? Math.min(.05, (now - sw.t) / 1000) : .016; sw.t = now;
    sw.x += (P.x - sw.x) * Math.min(1, dt * 3); sw.y += (P.y - sw.y) * Math.min(1, dt * 3);
    return `|${sw.x.toFixed(4)}|${sw.y.toFixed(4)}`;
  }
  function sway(target, free) {
    if (free <= .001) return;
    const up = cam.up.clone().normalize(), o = cam.position.clone().sub(target), fwd = o.clone().negate().normalize();
    const side = new T.Vector3().crossVectors(fwd, up); if (side.lengthSq() < 1e-6) side.set(1, 0, 0); side.normalize();
    o.applyAxisAngle(up, -sw.x * .16 * free).applyAxisAngle(side, sw.y * .08 * free);
    cam.position.copy(target).add(o); cam.lookAt(target);
  }
  function step(u) {
    if (u > -1.8) load();
    const dk = eio(clamp((u - DARK[0]) / (DARK[1] - DARK[0]), 0, 1));
    photo.style.opacity = smt(PH[0], PH[1], u).toFixed(3);
    const k0 = `${u.toFixed(4)}|${!!R}|${vw}|${vh}` + swayEase();
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
      // the film first, becoming the letter; the exhibit takes over as it hollows
      const mo = clamp((u - MO[0] - e.k * MO_ST) / MO[1], 0, 1);
      const fa = st * (1 - smt(.86, 1, mo)), xa = st * exA * (1 - .25 * g) * smt(.72, 1, mo);
      e.fm.uniforms.uM.value = mo; e.fm.uniforms.uA.value = fa; e.fm.uniforms.uTime.value = time;
      e.m.uniforms.uA.value = xa;
      e.fp.visible = fa > .002; e.mesh.visible = xa > .002; e.g.visible = e.fp.visible || e.mesh.visible;
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
    sway(t, 1 - smt(K2 + .4, K3 - .15, u));
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
    const pj = (x, y) => { const v = scr(x, y).project(cam); return [(v.x + 1) / 2 * vw, (1 - v.y) / 2 * vh]; };
    const labA = 1 - smt(GATHER[0] - .1, GATHER[0] + .2, u);
    if (labA > .003 && u > SET[0]) for (const c of cards) {
      const st = eo3(clamp((u - SET[0] - c.k * SET_ST - .08) / SET[1], 0, 1)) * labA;
      if (st <= 0) continue;
      // under its card, wherever the turned view now shows it
      const y0 = c.y + card.h + 8, [lx, ly] = pj(c.x, y0), [rx] = pj(c.x + card.w, y0);
      ox.globalAlpha = st; ox.fillStyle = 'rgba(210,230,255,.3)'; ox.fillRect(lx, ly, (rx - lx) * st, 1);
      ox.fillStyle = 'rgba(236,240,244,.92)'; ox.textAlign = 'left'; ox.fillText(String(c.k + 1).padStart(2, '0'), lx, ly + 6);
      ox.fillStyle = 'rgba(150,160,170,1)'; ox.textAlign = 'right'; ox.fillText(String(c.yr), rx, ly + 6);
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
  return { load, layout, step, END, PHOTO: PH[1] + .05 };
};

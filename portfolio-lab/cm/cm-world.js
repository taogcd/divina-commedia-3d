/* Compressed Modernity: how the rubbings came from the land, and then the rubbings read as a handscroll.
   It opens on the photograph of the roll being unrolled on the ground; the picture gives way to the same view drawn:
   the white paper and its roll on a field of grass (the grass as fine light strokes on black, its clumps where the
   rubbings are dark, so the land under the paper is the land the rubbing took). The roll runs on along the ground
   and the view rises over the whole length of paper lying in the field; then down among the blades at the paper's
   edge; then up, square on to the paper, as the rubbing comes up on it from the head: the ink pressed into the
   paper where the grass stood beneath it. Then the scroll is read the way a handscroll is read on a table, the paper
   passing from right to left, a breeze at its edges; at the tail the view draws back to where the cover photograph
   was taken (the strip lies exactly where the paper lies in the picture), and the picture takes over.
   step(u): u = screen heights of scroll since the frame pinned. Needs THREE (r128). */
window.CMStage = function (frame, opts) {
  'use strict';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smt = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const eio = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  // the shots, in screens of scroll
  const OPEN1 = .55, TRACK = 1.15, OVER = 2.0, MACRO = 2.85, PAN0 = 3.65, PAN1 = 6.85, FIN = 7.85;
  const PH0 = 7.45, PH1 = 7.95, OUT0 = 7.9, OUT1 = 8.25, END = 8.5;
  const THE = 58 * Math.PI / 180;                           // reading: looking down at the table
  // the cover photograph's camera (assumed): a phone's main lens, 41° vertical on the 16:9 frame, eye height 1.5 m;
  // the horizon, where the paper's long edges meet, at .455 of the height
  const VFOV = 41, EYE = 1.5, HZ = .455;
  // the unrolling photograph's camera (estimated): 36° vertical, the horizon a little below the middle (.535); the
  // paper's far and near edges at .837 and .878 of the height by the roll, the roll at .479 of the width. About four
  // metres of paper are already laid when the picture was taken; the roll is never used up: at the end it lies at
  // the tail of the rubbings with blank paper still wound on it
  const OP = opts.open || null, VFOV2 = 36, HZ2 = .535, YF2 = .837, YN2 = .878, XR2 = .479, R0 = 4.1, ROLL0 = .1, ROLLE = .072;
  const NT = opts.tiles.length, TAR = opts.tileAspect || 1240 / 1754;     // a tile: along ÷ across

  frame.classList.add('cm');
  const photo = document.createElement('img'); photo.className = 'ws-photo'; photo.alt = ''; photo.decoding = 'async';
  const cv = document.createElement('canvas'); cv.className = 'ws-cv'; cv.setAttribute('aria-hidden', 'true');
  frame.appendChild(photo); frame.appendChild(cv);
  let photo2 = null;
  if (OP) { photo2 = document.createElement('img'); photo2.className = 'ws-photo'; photo2.alt = ''; photo2.decoding = 'async'; photo2.style.opacity = '1'; frame.appendChild(photo2); }

  let T = null, R = null, scene, cam, vw = 1, vh = 1, mobile = false, loaded = 0, built = false, S = null, U = null;
  const lo = [], tex = [], mats = [], meshes = [];
  let hiQueued = false, HF = null, grass = null, roll = null;

  function js(src) { return new Promise((res, rej) => { const el = document.createElement('script'); el.src = src; el.onload = res; el.onerror = rej; document.head.appendChild(el); }); }
  function img(src) { return new Promise(res => { const im = new Image(); im.decoding = 'async'; im.src = src; (im.decode ? im.decode() : new Promise(r => { im.onload = r; })).then(() => res(im), () => res(null)); }); }
  function load() {
    if (loaded) return; loaded = 1;
    photo.src = opts.photo; if (photo2) photo2.src = OP.src;
    // the small tiles first (the whole scroll, quickly); on a large screen the full ones follow, head first
    Promise.all([window.THREE ? 0 : js(opts.three), Promise.all(opts.tiles.map(t => img(t.lo)))]).then(([, list]) => {
      T = window.THREE; list.forEach((im, i) => lo[i] = im);
      init();
    }).catch(e => console.warn('CM world off:', e));
  }
  function loadHi() {
    if (hiQueued || mobile || !built) return; hiQueued = true;
    let next = 0;
    const one = () => { const k = next++; if (k >= NT) return;
      img(opts.tiles[k].hi).then(im => { if (im && tex[k]) { tex[k].image = im; tex[k].needsUpdate = true; } one(); }); };
    one(); one();                                            // two at a time
  }

  /* ---------- the strip on the ground, from the cover photograph ---------- */
  function boxFor(iw, ih) {
    const sc = Math.max(vw / iw, vh / ih);                  // full screen, like every picture
    return { pw: iw * sc, ph: ih * sc, ox: (vw - iw * sc) / 2, oy: (vh - ih * sc) / 2 };
  }
  const photoBox = () => boxFor(opts.photoW, opts.photoH);
  function strip() {
    const tv = Math.tan(VFOV * Math.PI / 360), th = tv * opts.photoW / opts.photoH, pitch = Math.atan((.5 - HZ) * 2 * tv);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const ground = ([xn, yn]) => {                          // camera at (0, EYE, 0) looking down −z, pitched down
      let dx = (xn - .5) * 2 * th, dy = -(yn - .5) * 2 * tv, dz = -1;
      const y2 = dy * cp + dz * sp, z2 = -dy * sp + dz * cp; dy = y2; dz = z2;
      const t = -EYE / dy; return new T.Vector3(dx * t, 0, dz * t);
    };
    const q = opts.strip.map(ground);                       // TL TR BR BL
    const D = q[1].clone().sub(q[0]).normalize();
    const v = q[3].clone().sub(q[0]), N = v.clone().sub(D.clone().multiplyScalar(v.dot(D)));
    const W = N.length(); N.normalize();
    const len = q[1].clone().sub(q[0]).dot(D);
    const Lt = W * TAR, s0 = (len - NT * Lt) * .5;          // centred on the paper in the picture
    return { O: q[0], D, N, W, Lt, Ltot: NT * Lt, s0, pitch, len };
  }
  const P = (a, c, h) => S.O.clone().addScaledVector(S.D, S.s0 + a).addScaledVector(S.N, c).add(new T.Vector3(0, h, 0));

  /* ---------- the paper: one mesh per tile ---------- */
  function heights(na, nc) {
    const GW = NT * na, c = document.createElement('canvas'); c.width = GW; c.height = nc;
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, GW, nc);
    lo.forEach((im, k) => { if (im) x.drawImage(im, k * na, 0, na, nc); });
    const d = x.getImageData(0, 0, GW, nc).data, n = GW * nc;
    const a = new Float32Array(n), b = new Float32Array(n);
    for (let i = 0; i < n; i++) a[i] = 1 - d[i * 4] / 255;
    for (let pass = 0; pass < 2; pass++) {
      for (let j = 0; j < nc; j++) for (let i = 0; i < GW; i++) {
        let s = 0, m = 0; for (let di = -1; di <= 1; di++) { const ii = i + di; if (ii < 0 || ii >= GW) continue; s += a[j * GW + ii]; m++; }
        b[j * GW + i] = s / m;
      }
      for (let j = 0; j < nc; j++) for (let i = 0; i < GW; i++) {
        let s = 0, m = 0; for (let dj = -1; dj <= 1; dj++) { const jj = j + dj; if (jj < 0 || jj >= nc) continue; s += b[jj * GW + i]; m++; }
        a[j * GW + i] = s / m;
      }
    }
    return { h: a, GW, na, nc };
  }
  function buildTiles() {
    meshes.forEach(m => { scene.remove(m); m.geometry.dispose(); }); meshes.length = 0;
    const na = mobile ? 48 : 96, nc = mobile ? 68 : 136; HF = heights(na, nc);
    const { h, GW } = HF, H = (g, i) => h[clamp(i, 0, nc - 1) * GW + clamp(g, 0, GW - 1)];
    for (let k = 0; k < NT; k++) {
      const Pa = [], G = [], idx = [];
      for (let jj = 0; jj <= na; jj++) for (let i = 0; i < nc; i++) {
        const g = k * na + jj;
        Pa.push(jj / na, i / (nc - 1), H(g, i));
        G.push((H(g + 1, i) - H(g - 1, i)) * .5 * na, (H(g, i + 1) - H(g, i - 1)) * .5 * (nc - 1));
      }
      for (let jj = 0; jj < na; jj++) for (let i = 0; i < nc - 1; i++) {
        const a = jj * nc + i, b = a + nc;
        idx.push(a, b, a + 1, a + 1, b, b + 1);
      }
      const g = new T.BufferGeometry();
      g.setAttribute('aP', new T.Float32BufferAttribute(Pa, 3));
      g.setAttribute('aG', new T.Float32BufferAttribute(G, 2));
      g.setAttribute('position', new T.Float32BufferAttribute(new Float32Array(Pa.length), 3));
      g.setIndex(new T.Uint16BufferAttribute(idx, 1));
      g.boundingSphere = new T.Sphere(new T.Vector3(), 1e6);
      const m = new T.Mesh(g, mats[k]); m.frustumCulled = false; m.renderOrder = 0; scene.add(m); meshes.push(m);
    }
    buildGrass();
  }
  // how thick the grass stands: under the paper, as dark as the rubbing it gave; off it, clumps of a soft noise
  function inkAt(a, c) {
    const W = S.W;
    if (a >= 0 && a <= S.Ltot && c >= 0 && c <= W) {
      const g = clamp(Math.floor(a / S.Lt * HF.na), 0, HF.GW - 1), i = clamp(Math.floor(c / W * (HF.nc - 1)), 0, HF.nc - 1);
      return HF.h[i * HF.GW + g];
    }
    const n = .55 * vnoise(a * 1.1, c * 1.1) + .3 * vnoise(a * 3.3 + 7.1, c * 3.3 - 2.3) + .15 * vnoise(a * 9 - 3.7, c * 9 + 5.2);
    return clamp((n - .32) * 1.9, 0, 1);
  }
  function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
  function vnoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return lerp(lerp(hash(xi, yi), hash(xi + 1, yi), u), lerp(hash(xi, yi + 1), hash(xi + 1, yi + 1), u), v);
  }

  /* the paper's breeze (edges only) and, through the paper, the rubbing: before it, the grass beneath shows faintly
     through the thin paper; the rubbing comes up from the head in dabs, a front running along the scroll */
  const VS = `
    attribute vec3 aP; attribute vec2 aG;
    uniform vec3 uO, uD, uN; uniform float uLt, uW, uS0, uK, uRel, uLtot, uTime, uWind;
    varying vec2 vUv; varying vec3 vNrm; varying vec3 vW; varying vec2 vAC;
    float breeze(float A, float C){
      float e = max(max(smoothstep(.22, 0., C), smoothstep(uW - .22, uW, C)), max(smoothstep(.18, 0., A), smoothstep(uLtot - .18, uLtot, A)));
      float w = .5 + .5 * (sin(A * 7. + uTime * 3.2 + 1.2 * sin(A * 2. + uTime * .7)) * .65 + sin(A * 13. + uTime * 4.6 + C * 3.) * .35);
      float g = .6 + .4 * sin(uTime * .9 + A * .5 + 1.6 * sin(uTime * .37 + A * .25));
      float m = .1 * (.5 + .5 * sin(A * 2.3 + uTime * 1.8 + C * 1.4));
      return uWind * g * (pow(e, 1.5) * (.15 + .85 * w) + m);
    }
    void main(){
      float s = aP.x, t = aP.y, A = (uK + s) * uLt, C = t * uW, ep = .006;
      float b0 = breeze(A, C), bA = (breeze(A + ep, C) - breeze(A - ep, C)) / (2. * ep), bC = (breeze(A, C + ep) - breeze(A, C - ep)) / (2. * ep);
      float h = .003 + aP.z * uRel + b0;
      vec3 nL = normalize(vec3(-(aG.x * uRel / uLt + bA), 1., -(aG.y * uRel / uW + bC)));     // (along, up, across)
      vec3 w = uO + uD * (uS0 + A) + uN * C + vec3(0., h, 0.);
      vNrm = normalize(uD * nL.x + vec3(0., nL.y, 0.) + uN * nL.z);
      vUv = vec2(s, 1. - t);                                  // the sheet's top at the far edge
      vW = w; vAC = vec2(A, C);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(w, 1.);
    }`;
  const FS = `
    precision highp float;
    uniform sampler2D uTex; uniform vec3 uSun; uniform float uRoll, uFront;
    varying vec2 vUv; varying vec3 vNrm; varying vec3 vW; varying vec2 vAC;
    void main(){
      if (vAC.x > uRoll) discard;                              // still on the roll
      float ink = 1. - texture2D(uTex, vUv).r;
      float dab = .5 + .5 * sin(vAC.x * 23.1 + 2. * sin(vAC.y * 17.3)) * sin(vAC.y * 19.7 + 2. * sin(vAC.x * 13.1));
      float r = smoothstep(.3, .7, (uFront - vAC.x) / .25 + (dab - .5) * .7 + ink * .45);      // dabbed on, the dark first
      ink *= mix(.07, 1., r);
      vec3 paper = vec3(.972, .966, .952), inkC = vec3(.07, .07, .075);
      vec3 n = normalize(vNrm); if (dot(n, cameraPosition - vW) < 0.) n = -n;   // the side the eye sees
      float lit = .66 + .52 * max(dot(n, uSun), 0.);
      gl_FragColor = vec4(mix(paper, inkC, pow(ink, 1.1)) * lit, 1.);
    }`;

  /* ---------- the land: grass blades as fine light strokes ----------
     A dense patch round the strip and a thinner field out to the dark; the blades thicken where the rubbing is dark.
     Each blade is a line from its root to its tip, leaning, stirring in the breeze; under the laid paper they are
     pressed flat (gone), and far off they fade into the black. */
  const GVS = `
    attribute vec4 aB; attribute vec4 aL;
    uniform vec3 uO, uD, uN; uniform float uS0, uW, uRoll, uRollR, uTime, uWg, uFadeN, uFadeF, uGrass;
    varying float vA;
    void main(){
      float a = aB.x, c = aB.y, h = aB.z, e = aB.w;
      float onPaper = step(-.01, c) * step(c, uW + .01) * step(-.01, a);
      float under = onPaper * step(a, uRoll + uRollR * .6);
      vec3 base = uO + uD * (uS0 + a) + uN * c;
      float sw = sin(uTime * 1.4 + a * 2.3 + c * 1.9 + aL.z) * .55 + sin(uTime * 2.6 + a * 5.1 + aL.z * 2.) * .25;
      vec3 lean = uD * cos(aL.x) + uN * sin(aL.x);
      vec3 tip = base + vec3(0., h * (1. - .45 * aL.y), 0.) + lean * h * aL.y + uD * (sw * h * .22 * uWg);
      vec3 w = mix(base, tip, e * (1. - under));
      vec4 mv = modelViewMatrix * vec4(w, 1.);
      // nearer blades brighter, far ones dimmer (there are more of them to a pixel), all fading into the dark
      vA = (1. - under) * aL.w * (.3 + .7 * e) * clamp(.8 / -mv.z, .14, 1.6) * (1. - smoothstep(uFadeN, uFadeF, -mv.z)) * uGrass;
      gl_Position = projectionMatrix * mv;
    }`;
  const GFS = `
    precision highp float;
    varying float vA;
    void main(){ if (vA < .002) discard; gl_FragColor = vec4(vec3(.86, .88, .83), vA); }`;
  let rnd = null;
  function seeded(s) { return () => (s = (s * 16807) % 2147483647) / 2147483647; }
  function buildGrass() {
    if (grass) { scene.remove(grass); grass.geometry.dispose(); }
    rnd = seeded(11);
    const W = S.W, L = S.Ltot, nNear = mobile ? 70000 : 230000, nFar = mobile ? 40000 : 130000;
    const B = [], Lb = [];
    const add = (a, c, d, far) => {
      const h = (far ? .03 : .022) + .065 * d * (.5 + rnd()), la = rnd() * Math.PI * 2, lm = .15 + .5 * rnd(), ph = rnd() * 6.283;
      const br = (far ? .12 : .16) + .26 * rnd() * (.4 + d);
      B.push(a, c, h, 0, a, c, h, 1); Lb.push(la, lm, ph, br, la, lm, ph, br);
    };
    // one field, thickest at the paper and thinning smoothly out into the dark (no edge to the patch); thicker still
    // by the scroll's head, where the view comes down among the blades
    const A0 = -7, A1 = L + 6, C0 = -12, C1 = W + 3, total = nNear + nFar;
    let n = 0;
    while (n < total) {
      const a = A0 + rnd() * (A1 - A0), c = C0 + rnd() * (C1 - C0);
      const da = Math.max(0, -a, a - L), dc = Math.max(0, -c, c - W), dist = Math.hypot(da, dc);
      const fall = Math.max(.035, Math.exp(-(dist / 1.5) * (dist / 1.5))) * (1 + 2.2 * Math.exp(-((a - .9) * (a - .9)) / 1.2) * Math.exp(-dist * dist / .4));
      const d = inkAt(a, c), off = c < 0 || c > W || a < 0 || a > L;
      if (rnd() < clamp(d * 1.4 + (off ? .16 : -.04), .03, 1) * fall / 3.2) { add(a, c, d, dist > 2); n++; }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('aB', new T.Float32BufferAttribute(B, 4));
    g.setAttribute('aL', new T.Float32BufferAttribute(Lb, 4));
    g.setAttribute('position', new T.Float32BufferAttribute(new Float32Array(B.length / 4 * 3), 3));
    g.boundingSphere = new T.Sphere(new T.Vector3(), 1e6);
    grass = new T.LineSegments(g, gmat); grass.frustumCulled = false; grass.renderOrder = 1; scene.add(grass);
  }

  /* ---------- the roll: a white cylinder lying across the strip, its ends showing the paper's spiral ---------- */
  const RVS = `
    varying vec3 vL; varying vec3 vNo; varying vec3 vWp;
    void main(){ vL = position; vNo = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.); vWp = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
  const RFS = `
    precision highp float;
    uniform vec3 uSun; uniform float uTurns, uAng;
    varying vec3 vL; varying vec3 vNo; varying vec3 vWp;
    void main(){
      vec3 paper = vec3(.972, .966, .952);
      vec3 n = normalize(vNo); if (dot(n, cameraPosition - vWp) < 0.) n = -n;
      float lit = .62 + .5 * max(dot(n, uSun), 0.);
      vec3 c = paper * lit;
      if (abs(vL.y) > .499) {                                  // an end: the spiral of the rolled paper
        float rho = length(vL.xz) * 2., phi = atan(vL.z, vL.x) + uAng;
        float k = fract(rho * uTurns - phi / 6.2832);
        c *= 1. - .22 * smoothstep(.75, .95, k) * smoothstep(.2, .35, rho);
        c *= mix(.82, 1., smoothstep(.0, .22, rho));
      }
      gl_FragColor = vec4(c, 1.);
    }`;
  function buildRoll() {
    const g = new T.CylinderGeometry(.5, .5, 1, 64, 1, false);
    roll = new T.Mesh(g, rmat); roll.frustumCulled = false; roll.renderOrder = 0; scene.add(roll);
  }
  // how much paper is laid, and the roll's radius: what is left of it, wound
  function rollAt(u) { return evMono(RK, u); }
  const thick = () => Math.PI * (ROLL0 * ROLL0 - ROLLE * ROLLE) / Math.max(.01, S.Ltot - R0);
  function rollR(Rr) { return Math.sqrt(ROLLE * ROLLE + Math.max(0, S.Ltot - Rr) * thick() / Math.PI); }
  function frontAt(u) { return evMono(FK, u); }
  let RK = null, FK = null;

  let gmat = null, rmat = null;
  function init() {
    if (!T || built) return;
    try { R = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, premultipliedAlpha: false }); } catch (e) { console.warn('CM world off:', e); return; }
    R.setClearColor(0x000000, 1);                         // opaque: the grass's light strokes need a black to add to
    scene = new T.Scene(); cam = new T.PerspectiveCamera(VFOV, 1, .006, 400);
    S = strip();
    const sun = S.D.clone().multiplyScalar(-.6).addScaledVector(S.N, -.45).add(new T.Vector3(0, .62, 0)).normalize();
    U = { uO: { value: new T.Vector3() }, uD: { value: new T.Vector3() }, uN: { value: new T.Vector3() }, uLt: { value: 1 }, uW: { value: 1 }, uS0: { value: 0 },
      uLtot: { value: 1 }, uRel: { value: .0025 }, uTime: { value: 0 }, uWind: { value: .05 }, uSun: { value: sun },
      uRoll: { value: R0 }, uRollR: { value: ROLL0 }, uFront: { value: -1 },
      uWg: { value: 1 }, uFadeN: { value: 8 }, uFadeF: { value: 16 }, uGrass: { value: 1 }, uTurns: { value: 8 }, uAng: { value: 0 } };
    const an = Math.min(8, R.capabilities.getMaxAnisotropy());
    for (let k = 0; k < NT; k++) {
      const t = new T.Texture(lo[k] || undefined); t.format = T.LuminanceFormat; t.anisotropy = an; t.generateMipmaps = true;
      t.minFilter = T.LinearMipmapLinearFilter; t.magFilter = T.LinearFilter; if (lo[k]) t.needsUpdate = true; tex.push(t);
      mats.push(new T.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, side: T.DoubleSide, uniforms: Object.assign({ uTex: { value: t }, uK: { value: k } }, U) }));
    }
    gmat = new T.ShaderMaterial({ vertexShader: GVS, fragmentShader: GFS, uniforms: U, transparent: true, depthWrite: false, blending: T.AdditiveBlending });
    rmat = new T.ShaderMaterial({ vertexShader: RVS, fragmentShader: RFS, uniforms: U });
    built = true; size(); buildTiles(); buildRoll(); loadHi();
  }
  function size() {
    if (!R) return;
    const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 2 : 1.5);
    R.setPixelRatio(dpr); R.setSize(vw, vh, false);
    S = strip();
    U.uO.value.copy(S.O); U.uD.value.copy(S.D); U.uN.value.copy(S.N); U.uLt.value = S.Lt; U.uW.value = S.W; U.uS0.value = S.s0; U.uLtot.value = S.Ltot;
    keys = null;
  }
  function layout(w, h) {
    vw = w; vh = h; const m = vw < 700;
    if (built && m !== mobile) { mobile = m; buildTiles(); loadHi(); }
    mobile = m; size();
  }
  // the projection: the unrolling photograph's at the start, the cover photograph's from the field view on
  let projK = '';
  function project(u) {
    const k = OP ? smt(OPEN1, OVER, u) : 1, b1 = photoBox(), b2 = OP ? boxFor(OP.w, OP.h) : b1;
    const fov = lerp(VFOV2, VFOV, k), pw = lerp(b2.pw, b1.pw, k), ph = lerp(b2.ph, b1.ph, k), ox = lerp(b2.ox, b1.ox, k), oy = lerp(b2.oy, b1.oy, k);
    const key = `${fov.toFixed(4)}|${pw.toFixed(1)}|${ph.toFixed(1)}|${vw}|${vh}`; if (key === projK) return; projK = key;
    cam.fov = fov; cam.aspect = pw / ph; cam.setViewOffset(pw, ph, -ox, -oy, vw, vh); cam.updateProjectionMatrix();
  }

  /* ---------- the camera ----------
     Before the reading, keyframes of eye and aim run through by a monotone cubic in each axis (smooth, never
     overshooting a key, so the low shot cannot dip into the ground): the unrolling photograph's eye; following the
     roll; up over the whole field; down among the blades at the paper's near edge, at its head; up and square on to
     the scroll's head. Then the reading (square on, the whole height of the scroll in view, moving straight along it,
     right to left on screen); then back to the cover photograph's eye. */
  let keys = null;
  function cam2() {                                         // the unrolling photograph's eye, in the strip's terms
    const tv2 = Math.tan(VFOV2 * Math.PI / 360), th2 = tv2 * (OP ? OP.w / OP.h : 1.8), pu = Math.atan((HZ2 - .5) * 2 * tv2);
    const dep = y => Math.atan((y - .5) * 2 * tv2) - pu;
    const kf = 1 / Math.tan(dep(YF2)), kn = 1 / Math.tan(dep(YN2)), E = S.W / (kf - kn), df = E * kf, dm = df - S.W * .5;
    const a = R0 + (.5 - XR2) * 2 * th2 * dm;
    const p = P(a, df, E), dir = S.N.clone().negate().add(new T.Vector3(0, Math.tan(pu), 0)).normalize();
    return { p, t: p.clone().addScaledVector(dir, dm) };
  }
  function panPose(u) {
    const b = photoBox(), tv = Math.tan(VFOV * Math.PI / 360) * vh / b.ph, th = tv * vw / vh;
    const f = vw / vh < .9 ? .36 : .64;                      // how much of the screen's height the scroll fills
    const d = S.W * Math.sin(THE) / (2 * tv * f), half = d * th, m = Math.min(.16, half * .2);
    const a0 = half - m, a1 = S.Ltot - half + m;
    const e = clamp((u - PAN0) / (PAN1 - PAN0), 0, 1), k = e < .1 ? e * e / .2 : e > .9 ? 1 - (1 - e) * (1 - e) / .2 - .1 : e - .05;
    const t = P(lerp(a0, a1, k / .9), .5 * S.W, 0);
    const dir = S.N.clone().multiplyScalar(Math.cos(THE)).add(new T.Vector3(0, Math.sin(THE), 0));
    return { p: t.clone().addScaledVector(dir, d), t };
  }
  function makeKeys() {
    const W = S.W, L = S.Ltot, port = vw / vh < .9, c2 = OP ? cam2() : panPose(PAN0), Rt = R0 + 1.3;
    const over = port ? { p: P(-2.4, W * .5 + .9, 2.8), t: P(L * .45, W * .5, 0) } : { p: P(L * .5 - .7, W * .5 + 5.6, 4.9), t: P(L * .5, W * .5 - .4, 0) };
    const K = [
      [0, c2], [OPEN1, c2],
      [TRACK, { p: P(Rt + .7, W * .5 + 2.6, .75), t: P(Rt + .45, W * .5, .05) }],
      [OVER, over],
      [MACRO, (() => { const t = P(.95, W + .13, 0); return { p: t.clone().addScaledVector(S.N, Math.cos(THE) * .62).add(new T.Vector3(0, Math.sin(THE) * .62, 0)), t }; })()],
      [PAN0, panPose(PAN0)],
    ];
    const us = K.map(k => k[0]), mk = get => mono(us, K.map(k => get(k[1])));
    RK = { us: [0, OPEN1, TRACK, OVER + .15], c: mono([0, OPEN1, TRACK, OVER + .15], [R0, R0, Rt, L]) };
    FK = { us: [3.15, 3.75, 4.6], c: mono([3.15, 3.75, 4.6], [-.4, 1.9, L + .6]) };
    return { us, p: ['x', 'y', 'z'].map(ax => mk(o => o.p[ax])), t: ['x', 'y', 'z'].map(ax => mk(o => o.t[ax])) };
  }
  // Fritsch–Carlson monotone cubic through (xs, ys): its values and tangents
  function mono(xs, ys) {
    const n = xs.length, d = [], m = new Array(n).fill(0);
    for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; }
      const al = m[i] / d[i], be = m[i + 1] / d[i], s = al * al + be * be;
      if (s > 9) { const tau = 3 / Math.sqrt(s); m[i] = tau * al * d[i]; m[i + 1] = tau * be * d[i]; }
    }
    return { ys, m };
  }
  function ev(us, c, u) {
    const n = us.length; if (u <= us[0]) return c.ys[0]; if (u >= us[n - 1]) return c.ys[n - 1];
    let i = 0; while (u > us[i + 1]) i++;
    const h = us[i + 1] - us[i], t = (u - us[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * c.ys[i] + (t3 - 2 * t2 + t) * h * c.m[i] + (-2 * t3 + 3 * t2) * c.ys[i + 1] + (t3 - t2) * h * c.m[i + 1];
  }
  const evMono = (K, u) => ev(K.us, K.c, u);
  function camAt(u) {
    if (!keys) keys = makeKeys();
    let p, t;
    if (u < PAN0) { p = new T.Vector3(...keys.p.map(c => ev(keys.us, c, u))); t = new T.Vector3(...keys.t.map(c => ev(keys.us, c, u))); }
    else {
      const A = panPose(u), k = eio(smt(PAN1 - .15, FIN, u));
      p = A.p.clone().lerp(new T.Vector3(0, EYE, 0), k); t = A.t.clone().lerp(new T.Vector3(0, EYE - Math.tan(S.pitch) * 10, -10), k);
    }
    cam.position.copy(p); cam.up.set(0, 1, 0); cam.lookAt(t);
    sway(t, (1 - smt(PAN1 - .2, PAN1 + .4, u)) * smt(OPEN1 - .3, OPEN1 + .2, u));
    return cam.position.distanceTo(t);
  }

  /* the pointer moves the view a very little, as in the Commedia (window.TAO_PTR, set by the page): a drift sideways
     and a slight tilt, never a turn, so the scroll's edges stay level when it is read square on */
  const sw = { x: 0, y: 0 };
  function sway(target, free) {
    if (free <= .001) return;
    const fwd = target.clone().sub(cam.position).normalize(), side = new T.Vector3().crossVectors(fwd, new T.Vector3(0, 1, 0));
    if (side.lengthSq() < 1e-6) return; side.normalize();
    const o = cam.position.clone().sub(target).applyAxisAngle(side, sw.y * .035 * free);
    const t = target.clone().addScaledVector(side, sw.x * .045 * free * Math.max(.3, Math.min(2, o.length())));
    cam.position.copy(t).add(o); cam.lookAt(t);
  }
  let lastT = 0, lastU = null, gust = 0;
  function step(u) {
    if (u > -1.8) load();
    const ph = smt(PH0, PH1, u), out = smt(OUT0, OUT1, u);
    photo.style.opacity = ph.toFixed(3);
    cv.style.opacity = (1 - out).toFixed(3);
    if (photo2) photo2.style.opacity = (1 - smt(.12, OPEN1, u)).toFixed(3);
    if (!R || !meshes.length || !roll) return 1 - ph;
    if (u < -1.05 || u > END + .2) { lastT = 0; lastU = null; return 1 - ph; }
    const now = performance.now(), dt = lastT ? Math.min(.05, (now - lastT) / 1000) : .016; lastT = now;
    const Q = window.TAO_PTR || { x: 0, y: 0 };
    sw.x += (Q.x - sw.x) * Math.min(1, dt * 3); sw.y += (Q.y - sw.y) * Math.min(1, dt * 3);
    const sp = lastU === null ? 0 : Math.min(2, Math.abs(u - lastU) / Math.max(dt, 1e-3)); lastU = u;
    gust += (Math.min(1, sp) - gust) * Math.min(1, dt * (sp > gust ? 3 : .8));
    const uc = clamp(u, 0, END);
    project(uc);
    const d = camAt(uc);
    // the roll and how much paper is laid; the rubbing's front
    const Rr = rollAt(uc), rr = rollR(Rr);
    U.uRoll.value = Rr; U.uRollR.value = rr; U.uFront.value = frontAt(uc);
    roll.visible = true;
    {
      roll.position.copy(P(Rr, S.W * .5, rr + .003));
      roll.scale.set(rr * 2, S.W * 1.004, rr * 2);
      roll.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), S.N);
      U.uTurns.value = rr / thick();                       // turns of paper left on it
      U.uAng.value = (Rr - R0) / Math.max(.02, rr);
    }
    U.uTime.value = now / 1000;
    U.uWind.value = .065 * (1 + .8 * gust) * (1 - smt(PAN1, FIN, uc)) * smt(MACRO, PAN0, uc);   // the breeze once the paper lies
    U.uWg.value = 1 + gust;
    U.uFadeN.value = d * 1.6; U.uFadeF.value = d * 3.4;
    U.uGrass.value = 1 - .55 * smt(PAN0 - .2, PAN0 + .5, uc) * (1 - smt(PAN1, FIN, uc));                      // quieter while reading
    U.uRel.value = .0025 * (1 - smt(PAN1, FIN, uc));
    R.render(scene, cam);
    return 1 - ph;
  }
  return { load, layout, step, END, PHOTO: OUT1 };
};

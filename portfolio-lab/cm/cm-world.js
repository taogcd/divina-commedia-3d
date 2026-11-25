/* Compressed Modernity: the rubbings as one long handscroll of xuan paper, read the way a handscroll is read.
   Thirteen of the traced sheets are joined edge to edge (frayed where they meet) into one strip of paper lying on black,
   dense canopies first, then the strokes of the grasses, then the blots, thinning toward the end. The ink stands a
   little as high as it is dark and a low light rakes across it, so the rubbings read as a land.
   The paper is thin and light: its long edges stir by themselves, and wherever the mouse sweeps over it (or the page
   is scrolled under it) the air lifts it, and it drifts back down (a small simulation of the sheet: lifted by the air,
   pulled flat by its own tension, falling slowly, resting on the ground).
   The camera: close and oblique on the head of the scroll; along it, lower and flatter; down onto the paper, an ant's
   view running across its surface; up into a view of the whole scroll; and down again to where the cover photograph
   was taken (the strip lies exactly where the paper lies in the picture), and the picture takes over.
   step(u): u = screen heights of scroll since the frame pinned. Needs THREE (r128). */
window.CMStage = function (frame, opts) {
  'use strict';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smt = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const FIN = 6.0, PH0 = 5.65, PH1 = 6.15, OUT0 = 6.1, OUT1 = 6.45, END = 6.7;
  // the photograph's camera (assumed): a phone's main lens, 41° vertical on the 16:9 frame, eye height 1.5 m; the
  // horizon, where the paper's long edges meet, at .455 of the height
  const VFOV = 41, EYE = 1.5, HZ = .455;
  const NT = opts.tiles.length, TAR = opts.tileAspect || 1240 / 1754;     // a tile: along ÷ across

  frame.classList.add('cm');
  const photo = document.createElement('img'); photo.className = 'ws-photo'; photo.alt = ''; photo.decoding = 'async';
  const cv = document.createElement('canvas'); cv.className = 'ws-cv'; cv.setAttribute('aria-hidden', 'true');
  frame.appendChild(photo); frame.appendChild(cv);

  let T = null, R = null, scene, cam, vw = 1, vh = 1, mobile = false, loaded = 0, built = false, S = null, U = null;
  const lo = [], tex = [], mats = [], meshes = [];
  let hiQueued = false, HF = null;

  function js(src) { return new Promise((res, rej) => { const el = document.createElement('script'); el.src = src; el.onload = res; el.onerror = rej; document.head.appendChild(el); }); }
  function img(src) { return new Promise(res => { const im = new Image(); im.decoding = 'async'; im.src = src; (im.decode ? im.decode() : new Promise(r => { im.onload = r; })).then(() => res(im), () => res(null)); }); }
  function load() {
    if (loaded) return; loaded = 1;
    photo.src = opts.photo;
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

  /* ---------- the strip on the ground, from the photograph ---------- */
  function photoBox() {
    const iw = opts.photoW, ih = opts.photoH, sc = Math.max(vw / iw, vh / ih);      // full screen, like every picture
    return { pw: iw * sc, ph: ih * sc, ox: (vw - iw * sc) / 2, oy: (vh - ih * sc) / 2 };
  }
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

  /* ---------- the land: the scroll's ink standing as high as it is dark ----------
     One heightfield over the whole scroll (so the relief runs on across the joins), cut into one mesh per tile, each
     with its own texture. */
  function heights(na, nc) {
    const GW = NT * na, c = document.createElement('canvas'); c.width = GW; c.height = nc;
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, GW, nc);
    lo.forEach((im, k) => { if (im) x.drawImage(im, k * na, 0, na, nc); });
    const d = x.getImageData(0, 0, GW, nc).data, n = GW * nc;
    const a = new Float32Array(n), b = new Float32Array(n);
    for (let i = 0; i < n; i++) a[i] = 1 - d[i * 4] / 255;
    for (let pass = 0; pass < 3; pass++) {                   // softened, separably: canopies are hills, not needles
      for (let j = 0; j < nc; j++) for (let i = 0; i < GW; i++) {
        let s = 0, m = 0; for (let di = -2; di <= 2; di++) { const ii = i + di; if (ii < 0 || ii >= GW) continue; s += a[j * GW + ii]; m++; }
        b[j * GW + i] = s / m;
      }
      for (let j = 0; j < nc; j++) for (let i = 0; i < GW; i++) {
        let s = 0, m = 0; for (let dj = -2; dj <= 2; dj++) { const jj = j + dj; if (jj < 0 || jj >= nc) continue; s += b[jj * GW + i]; m++; }
        a[j * GW + i] = s / m;
      }
    }
    return { h: a, GW, na, nc };
  }
  function buildTiles() {
    meshes.forEach(m => { scene.remove(m); m.geometry.dispose(); }); meshes.length = 0;
    const na = mobile ? 56 : 110, nc = mobile ? 80 : 156; HF = heights(na, nc);
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
      const m = new T.Mesh(g, mats[k]); m.frustumCulled = false; scene.add(m); meshes.push(m);
    }
  }
  // the relief's height (world units) at a point of the scroll, for keeping the low camera above the paper
  function reliefAt(a, c) {
    if (!HF) return 0;
    const g = clamp(Math.round(a / S.Lt * HF.na), 0, HF.GW - 1), i = clamp(Math.round(c / S.W * (HF.nc - 1)), 0, HF.nc - 1);
    return HF.h[i * HF.GW + g] * U.uRel.value;
  }

  /* ---------- the paper's lift: a small sheet simulation on a grid over the whole scroll ----------
     h: how far the paper stands off the ground; the air (the mouse's sweep, the scroll's gusts) pushes it up, its
     tension spreads and evens it, a weak gravity and the air's drag let it float back down, and the ground stops it. */
  const SIM = { NA: 0, NC: 34, dx: 1, h: null, v: null, data: null, tex: null, HM: .08 };

  function simInit() {
    const NC = SIM.NC, dx = S.W / (NC - 1), NA = Math.ceil(S.Ltot / dx) + 1;
    Object.assign(SIM, { NA, dx, h: new Float32Array(NA * NC), v: new Float32Array(NA * NC), data: new Uint8Array(NA * NC) });
    SIM.tex = new T.DataTexture(SIM.data, NA, NC, T.LuminanceFormat, T.UnsignedByteType);
    SIM.tex.unpackAlignment = 1; SIM.tex.magFilter = SIM.tex.minFilter = T.LinearFilter; SIM.tex.generateMipmaps = false; SIM.tex.needsUpdate = true;
  }
  function simStep(dt) {
    // slack along the scroll, tauter across it: a lift spreads over the paper's width and stands as a ridge across it
    const { NA, NC, h, v, dx } = SIM, Ka = .07 * .07 / (dx * dx), Kc = .16 * .16 / (dx * dx), G = .38, drag = Math.exp(-3.5 * dt);
    for (let j = 0; j < NC; j++) {
      const r = j * NA, ru = (j > 0 ? j - 1 : j) * NA, rd = (j < NC - 1 ? j + 1 : j) * NA;
      for (let i = 0; i < NA; i++) {
        const k = r + i, hk = h[k];
        const f = Ka * (h[r + (i > 0 ? i - 1 : i)] + h[r + (i < NA - 1 ? i + 1 : i)] - 2 * hk) + Kc * (h[ru + i] + h[rd + i] - 2 * hk);
        v[k] = (v[k] + (f - (hk > 0 ? G : 0)) * dt) * drag;
      }
    }
    for (let k = 0, n = NA * NC; k < n; k++) {
      let hk = h[k] + v[k] * dt;
      if (hk <= 0) { hk = 0; if (v[k] < 0) v[k] = 0; } else if (hk > SIM.HM) { hk = SIM.HM; if (v[k] > 0) v[k] = 0; }
      h[k] = hk; SIM.data[k] = hk / SIM.HM * 255 + .5;
    }
    SIM.tex.needsUpdate = true;
  }
  function lift(a, c, R, dv) {                              // the air under a sweep: a soft round push upward
    const { NA, NC, v, dx } = SIM, i0 = Math.max(0, Math.floor((a - 2.4 * R) / dx)), i1 = Math.min(NA - 1, Math.ceil((a + 2.4 * R) / dx));
    const Rc = 1.7 * R, j0 = Math.max(0, Math.floor((c - 2.4 * Rc) / dx)), j1 = Math.min(NC - 1, Math.ceil((c + 2.4 * Rc) / dx));
    for (let j = j0; j <= j1; j++) {
      const cy = j * dx, edge = 1 + .9 * (smt(.22 * S.W, 0, cy) + smt(.78 * S.W, S.W, cy));   // the free edges lift first
      for (let i = i0; i <= i1; i++) {
        const ax = i * dx, r2 = (ax - a) * (ax - a) / (R * R) + (cy - c) * (cy - c) / (Rc * Rc);
        if (r2 < 5.8) v[j * NA + i] += dv * edge * Math.exp(-r2);
      }
    }
  }
  function simAt(a, c) {
    if (!SIM.h) return 0;
    const i = clamp(Math.round(a / SIM.dx), 0, SIM.NA - 1), j = clamp(Math.round(c / SIM.dx), 0, SIM.NC - 1);
    return SIM.h[j * SIM.NA + i];
  }
  // where a point of the screen falls on the scroll (strip coordinates), and how far it is from the eye
  let ray = null;
  function hitAt(nx, ny) {
    if (!ray) ray = new T.Raycaster();
    ray.setFromCamera({ x: nx, y: ny }, cam);
    const o = ray.ray.origin, d = ray.ray.direction; if (d.y > -1e-4) return null;
    const t = (o.y - .01) / -d.y, rel = o.clone().addScaledVector(d, t).sub(S.O);
    const a = rel.dot(S.D) - S.s0, c = rel.dot(S.N);
    if (a < -.05 || a > S.Ltot + .05 || c < -.05 || c > S.W + .05) return null;
    return { a, c, dist: t };
  }
  const mp = { x: 0, y: 0, on: false, prev: null };
  addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; mp.x = e.clientX; mp.y = e.clientY; mp.on = true; }, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => { mp.on = false; mp.prev = null; });
  let simT = 0, lastU = null, gust = 0, seed = 3;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  function air(u, dt) {
    // the mouse: its sweep across the paper (moving the mouse, or the paper moving under a still mouse as the page
    // scrolls), measured as an angle per second so a sweep lifts as much near or far
    if (mp.on) {
      const H = hitAt(mp.x / vw * 2 - 1, -(mp.y / vh * 2 - 1));
      if (H && mp.prev && dt > 0) {
        const ang = Math.min(5, Math.hypot(H.a - mp.prev.a, H.c - mp.prev.c) / H.dist / dt);
        // (gentler right under a low eye, so the paper does not rise up as a wall in front of it)
        if (ang > .05) lift(H.a, H.c, clamp(.1 * H.dist, .045, .22), 2.2 * ang * dt * (.25 + .75 * smt(.12, .6, H.dist)));
      }
      mp.prev = H;
    }
    // the scroll's own breath: gusts here and there while the page moves
    const sp = lastU === null ? 0 : Math.min(3, Math.abs(u - lastU) / Math.max(dt, 1e-3)); lastU = u;
    gust += Math.min(7, sp * 3) * dt;
    while (gust >= 1) { gust -= 1;
      const H = hitAt(rnd() * 1.8 - .9, rnd() * 1.4 - .9);
      if (H) lift(H.a, H.c, clamp((.05 + .06 * rnd()) * Math.max(1, H.dist), .04, .25), (mp.on ? .06 : .12) * (.5 + rnd()) * Math.min(1, sp / 1.5));
    }
  }

  const VS = `
    attribute vec3 aP; attribute vec2 aG;
    uniform vec3 uO, uD, uN; uniform float uLt, uW, uS0, uK, uRel;
    uniform sampler2D uSim; uniform vec2 uSimN; uniform float uDx, uHM, uTime, uFl;
    varying vec2 vUv; varying vec3 vNrm; varying vec3 vW; varying float vDist;
    float lifted(float A, float C){ return texture2D(uSim, vec2((A / uDx + .5) / uSimN.x, (C / uDx + .5) / uSimN.y)).r * uHM; }
    void main(){
      float s = aP.x, t = aP.y, A = (uK + s) * uLt, C = t * uW;
      float hp = lifted(A, C);
      float gA = (lifted(A + uDx, C) - lifted(A - uDx, C)) / (2. * uDx), gC = (lifted(A, C + uDx) - lifted(A, C - uDx)) / (2. * uDx);
      // the long edges never quite lie flat, and stir
      float e = smoothstep(.16, 0., t) + smoothstep(.84, 1., t);
      float fl = e * e * uFl * (.55 + .45 * sin(A * 7.3 - uTime * 1.9 + 2. * sin(A * 1.7 + uTime * .43)));
      float h = aP.z * uRel + hp + fl;
      vec3 nL = normalize(vec3(-(aG.x * uRel / uLt + gA), 1., -(aG.y * uRel / uW + gC)));     // (along, up, across)
      vec3 w = uO + uD * (uS0 + A) + uN * C + vec3(0., h, 0.);
      vNrm = normalize(uD * nL.x + vec3(0., nL.y, 0.) + uN * nL.z);
      vUv = vec2(s, 1. - t);                                  // the sheet's top at the far edge
      vW = w;
      vec4 mv = modelViewMatrix * vec4(w, 1.);
      vDist = -mv.z;
      gl_Position = projectionMatrix * mv;
    }`;
  const FS = `
    precision highp float;
    uniform sampler2D uTex; uniform vec3 uSun; uniform float uFogN, uFogF;
    varying vec2 vUv; varying vec3 vNrm; varying vec3 vW; varying float vDist;
    void main(){
      float ink = 1. - texture2D(uTex, vUv).r;
      vec3 paper = vec3(.972, .966, .952), inkC = vec3(.07, .07, .075);
      vec3 n = normalize(vNrm); if (dot(n, cameraPosition - vW) < 0.) n = -n;   // the side the eye sees
      float lit = .64 + .46 * max(dot(n, uSun), 0.);
      vec3 c = mix(paper, inkC, pow(ink, 1.1)) * lit;
      // far from the eye the scroll sinks into the dark
      float f = smoothstep(uFogN, uFogF, vDist);
      gl_FragColor = vec4(c * (1. - f), 1.);
    }`;

  function init() {
    if (!T || built) return;
    try { R = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, premultipliedAlpha: false }); } catch (e) { console.warn('CM world off:', e); return; }
    R.setClearColor(0x000000, 0);
    scene = new T.Scene(); cam = new T.PerspectiveCamera(VFOV, 1, .002, 200);
    S = strip(); simInit();
    U = { uO: { value: new T.Vector3() }, uD: { value: new T.Vector3() }, uN: { value: new T.Vector3() }, uLt: { value: 1 }, uW: { value: 1 }, uS0: { value: 0 },
      uRel: { value: .03 }, uSun: { value: new T.Vector3(.35, .55, -.76).normalize() }, uFogN: { value: 1 }, uFogF: { value: 2 },
      uSim: { value: SIM.tex }, uSimN: { value: new T.Vector2(SIM.NA, SIM.NC) }, uDx: { value: SIM.dx }, uHM: { value: SIM.HM }, uTime: { value: 0 }, uFl: { value: .011 } };
    const an = Math.min(8, R.capabilities.getMaxAnisotropy());
    for (let k = 0; k < NT; k++) {
      const t = new T.Texture(lo[k] || undefined); t.format = T.LuminanceFormat; t.anisotropy = an; t.generateMipmaps = true;
      t.minFilter = T.LinearMipmapLinearFilter; t.magFilter = T.LinearFilter; if (lo[k]) t.needsUpdate = true; tex.push(t);
      mats.push(new T.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, side: T.DoubleSide, uniforms: Object.assign({ uTex: { value: t }, uK: { value: k } }, U) }));
    }
    built = true; size(); buildTiles(); loadHi();
  }
  function size() {
    if (!R) return;
    const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 2 : 1.5);
    R.setPixelRatio(dpr); R.setSize(vw, vh, false);
    // the camera projects exactly as the photograph is shown (cover on a wide screen, whole on a phone)
    const b = photoBox();
    cam.fov = VFOV; cam.aspect = b.pw / b.ph; cam.setViewOffset(b.pw, b.ph, -b.ox, -b.oy, vw, vh); cam.updateProjectionMatrix();
    S = strip();
    U.uO.value.copy(S.O); U.uD.value.copy(S.D); U.uN.value.copy(S.N); U.uLt.value = S.Lt; U.uW.value = S.W; U.uS0.value = S.s0;
    keys = null;
  }
  function layout(w, h) {
    vw = w; vh = h; const m = vw < 700;
    if (built && m !== mobile) { mobile = m; buildTiles(); loadHi(); }
    mobile = m; size();
  }

  /* ---------- the camera: a few shots, joined without stops ----------
     Keyframes of eye and aim, run through by a monotone cubic in each axis (smooth, and never overshooting a key, so
     the low shots cannot dip into the paper): close and oblique on the head; along the scroll, lower and flatter; down
     onto the paper and running across it at an ant's height, weaving a little; up to see the whole scroll; down to
     the photograph's eye. */
  let keys = null;
  function makeKeys() {
    const b = photoBox(), tv = Math.tan(VFOV * Math.PI / 360) * vh / b.ph, th = tv * vw / vh, z = clamp(.6 / th, 1, 1.9);
    const L = S.Lt, W = S.W, Up = new T.Vector3(0, 1, 0);
    const obl = (aT, d, psi, the, cT) => {
      const t = P(aT, (cT === undefined ? .5 : cT) * W, 0);
      const dir = S.D.clone().multiplyScalar(-Math.sin(psi) * Math.cos(the)).addScaledVector(S.N, Math.cos(psi) * Math.cos(the)).addScaledVector(Up, Math.sin(the));
      return { p: t.clone().addScaledVector(dir, d * z), t };
    };
    const mid = S.Ltot * .5, port = vw / vh < .9;
    const over = port ? { p: P(-1.9, .5 * W + .6, 2.3), t: P(S.Ltot * .42, .5 * W, 0) }
                      : { p: P(mid - 1.5, W + 3.3, 3.9), t: P(mid + .2, .5 * W, 0) };
    const K = [
      [0, obl(.38 * L, .34, .62, .6)],
      [1.0, obl(1.35 * L, .6, .64, .5)],
      [1.95, obl(3.3 * L, .5, .8, .33)],
      [2.55, { p: P(4.45 * L, .64 * W, .15), t: P(5.5 * L, .47 * W, .02) }],
      [3.05, { p: P(5.4 * L, .52 * W, .062), t: P(6.45 * L, .46 * W, .035) }],
      [3.7, { p: P(7.4 * L, .4 * W, .058), t: P(8.45 * L, .56 * W, .035) }],
      [4.3, { p: P(9.3 * L, .56 * W, .085), t: P(10.35 * L, .5 * W, .02) }],
      [5.1, over],
      [FIN, { p: new T.Vector3(0, EYE, 0), t: new T.Vector3(0, EYE - Math.tan(S.pitch) * 10, -10) }],
    ];
    const us = K.map(k => k[0]), mk = get => mono(us, K.map(k => get(k[1])));
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
  function camAt(u) {
    if (!keys) keys = makeKeys();
    const p = new T.Vector3(...keys.p.map(c => ev(keys.us, c, u))), t = new T.Vector3(...keys.t.map(c => ev(keys.us, c, u)));
    cam.position.copy(p); cam.up.set(0, 1, 0); cam.lookAt(t);
    sway(t, 1 - smt(5.0, 5.7, u));
    // never under the paper: ride over its relief and its lift
    const rel = cam.position.clone().sub(S.O), a = rel.dot(S.D) - S.s0, c = rel.dot(S.N);
    if (a > -.1 && a < S.Ltot + .1 && c > -.1 && c < S.W + .1) {
      const g = reliefAt(a, c) + simAt(a, c) + .032;
      if (cam.position.y < g) { cam.position.y = g; cam.lookAt(t); }
    }
    return cam.position.distanceTo(t);
  }

  /* the pointer turns the view a little, as in the Commedia: the camera swings round what it looks at, easing after
     the mouse, and lets go as the view comes to the photograph (window.TAO_PTR, set by the page) */
  const sw = { x: 0, y: 0 };
  function sway(target, free) {
    if (free <= .001) return;
    const up = cam.up.clone().normalize(), o = cam.position.clone().sub(target), fwd = o.clone().negate().normalize();
    const side = new T.Vector3().crossVectors(fwd, up); if (side.lengthSq() < 1e-6) side.set(1, 0, 0); side.normalize();
    o.applyAxisAngle(up, -sw.x * .16 * free).applyAxisAngle(side, sw.y * .08 * free);
    cam.position.copy(target).add(o); cam.lookAt(target);
  }
  function step(u) {
    if (u > -1.8) load();
    const ph = smt(PH0, PH1, u), out = smt(OUT0, OUT1, u);
    photo.style.opacity = ph.toFixed(3);
    cv.style.opacity = (1 - out).toFixed(3);
    if (!R || !meshes.length) return 1 - ph;
    if (u < -1.05 || u > END + .2) { simT = 0; lastU = null; mp.prev = null; return 1 - ph; }
    const now = performance.now(), dt = simT ? Math.min(.05, (now - simT) / 1000) : .016; simT = now;
    const Q = window.TAO_PTR || { x: 0, y: 0 };
    sw.x += (Q.x - sw.x) * Math.min(1, dt * 3); sw.y += (Q.y - sw.y) * Math.min(1, dt * 3);
    const uc = clamp(u, 0, END), d = camAt(uc);
    air(uc, dt); simStep(dt * .5); simStep(dt * .5);
    U.uTime.value = now / 1000;
    const back = smt(4.4, 5.3, uc);                          // the far dark lifts as the view stands back
    U.uFogN.value = lerp(d * 1.5, 60, back); U.uFogF.value = lerp(d * 3.6, 90, back);
    U.uRel.value = .03 * (1 - .8 * smt(5.1, FIN, uc));
    U.uFl.value = .011 * (1 - smt(5.3, FIN, uc));
    R.render(scene, cam);
    return 1 - ph;
  }
  return { load, layout, step, END, PHOTO: OUT1 };
};

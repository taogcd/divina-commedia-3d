/* Compressed Modernity: the rubbings as one long handscroll of xuan paper, read the way a handscroll is read on a
   table: from the front, the whole height of the scroll in view, the paper passing from right to left as the page is
   scrolled, from its head to its tail.
   Thirteen of the traced sheets are joined edge to edge (frayed where they meet) into one strip of paper lying on black,
   dense canopies first, then the strokes of the grasses, then the blots, thinning toward the end. A light from the far
   left brings up the grain of the rubbing a little. A breeze runs along the scroll: its long edges and its ends lift
   and settle, a little more while the scroll is moving.
   At the tail the view draws back to where the cover photograph was taken (the strip lies exactly where the paper lies
   in the picture), and the picture takes over.
   step(u): u = screen heights of scroll since the frame pinned. Needs THREE (r128). */
window.CMStage = function (frame, opts) {
  'use strict';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smt = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const eio = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const PAN1 = 4.3, FIN = 5.3, PH0 = 4.95, PH1 = 5.45, OUT0 = 5.4, OUT1 = 5.75, END = 6.0;
  const THE = 58 * Math.PI / 180;                           // looking down at the table
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
  let hiQueued = false;

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

  /* ---------- the paper: one mesh per tile, a faint relief from the rubbing for its grain ---------- */
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
    return { h: a, GW };
  }
  function buildTiles() {
    meshes.forEach(m => { scene.remove(m); m.geometry.dispose(); }); meshes.length = 0;
    const na = mobile ? 48 : 96, nc = mobile ? 68 : 136, { h, GW } = heights(na, nc);
    const H = (g, i) => h[clamp(i, 0, nc - 1) * GW + clamp(g, 0, GW - 1)];
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
  /* the breeze: only near the paper's edges (the two long ones and the two ends), waves running along the scroll from
     right to left, swelling and easing in slow gusts; the middle of the paper lies still */
  const VS = `
    attribute vec3 aP; attribute vec2 aG;
    uniform vec3 uO, uD, uN; uniform float uLt, uW, uS0, uK, uRel, uLtot, uTime, uWind;
    varying vec2 vUv; varying vec3 vNrm; varying vec3 vW;
    float breeze(float A, float C){
      // strongest along the edges (a wide band of them), a faint swell through the middle; the waves run along the
      // scroll from right to left, two or three to a screen, each point rising and settling every second or two
      float e = max(max(smoothstep(.22, 0., C), smoothstep(uW - .22, uW, C)), max(smoothstep(.18, 0., A), smoothstep(uLtot - .18, uLtot, A)));
      float w = .5 + .5 * (sin(A * 7. + uTime * 3.2 + 1.2 * sin(A * 2. + uTime * .7)) * .65 + sin(A * 13. + uTime * 4.6 + C * 3.) * .35);
      float g = .6 + .4 * sin(uTime * .9 + A * .5 + 1.6 * sin(uTime * .37 + A * .25));       // gusts running along
      float m = .1 * (.5 + .5 * sin(A * 2.3 + uTime * 1.8 + C * 1.4));
      return uWind * g * (pow(e, 1.5) * (.15 + .85 * w) + m);
    }
    void main(){
      float s = aP.x, t = aP.y, A = (uK + s) * uLt, C = t * uW, ep = .006;
      float b0 = breeze(A, C), bA = (breeze(A + ep, C) - breeze(A - ep, C)) / (2. * ep), bC = (breeze(A, C + ep) - breeze(A, C - ep)) / (2. * ep);
      float h = aP.z * uRel + b0;
      vec3 nL = normalize(vec3(-(aG.x * uRel / uLt + bA), 1., -(aG.y * uRel / uW + bC)));     // (along, up, across)
      vec3 w = uO + uD * (uS0 + A) + uN * C + vec3(0., h, 0.);
      vNrm = normalize(uD * nL.x + vec3(0., nL.y, 0.) + uN * nL.z);
      vUv = vec2(s, 1. - t);                                  // the sheet's top at the far edge
      vW = w;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(w, 1.);
    }`;
  const FS = `
    precision highp float;
    uniform sampler2D uTex; uniform vec3 uSun;
    varying vec2 vUv; varying vec3 vNrm; varying vec3 vW;
    void main(){
      float ink = 1. - texture2D(uTex, vUv).r;
      vec3 paper = vec3(.972, .966, .952), inkC = vec3(.07, .07, .075);
      vec3 n = normalize(vNrm); if (dot(n, cameraPosition - vW) < 0.) n = -n;   // the side the eye sees
      float lit = .66 + .52 * max(dot(n, uSun), 0.);           // low enough to show the paper's lift
      gl_FragColor = vec4(mix(paper, inkC, pow(ink, 1.1)) * lit, 1.);
    }`;

  function init() {
    if (!T || built) return;
    try { R = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, premultipliedAlpha: false }); } catch (e) { console.warn('CM world off:', e); return; }
    R.setClearColor(0x000000, 0);
    scene = new T.Scene(); cam = new T.PerspectiveCamera(VFOV, 1, .01, 200);
    S = strip();
    U = { uO: { value: new T.Vector3() }, uD: { value: new T.Vector3() }, uN: { value: new T.Vector3() }, uLt: { value: 1 }, uW: { value: 1 }, uS0: { value: 0 },
      uLtot: { value: 1 }, uRel: { value: .008 }, uTime: { value: 0 }, uWind: { value: .014 },
      uSun: { value: S.D.clone().multiplyScalar(-.6).addScaledVector(S.N, -.45).add(new T.Vector3(0, .62, 0)).normalize() } };
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
    U.uO.value.copy(S.O); U.uD.value.copy(S.D); U.uN.value.copy(S.N); U.uLt.value = S.Lt; U.uW.value = S.W; U.uS0.value = S.s0; U.uLtot.value = S.Ltot;
  }
  function layout(w, h) {
    vw = w; vh = h; const m = vw < 700;
    if (built && m !== mobile) { mobile = m; buildTiles(); loadHi(); }
    mobile = m; size();
  }

  /* ---------- the camera: square on to the scroll, the whole of its height in view, moving straight along it ----------
     The head of the scroll starts a little in from the left of the screen and the tail ends a little in from the
     right; in between the paper passes at an even pace (easing in and out), then the view draws back to the
     photograph's eye. */
  function panPose(u) {
    const b = photoBox(), tv = Math.tan(VFOV * Math.PI / 360) * vh / b.ph, th = tv * vw / vh;
    const f = vw / vh < .9 ? .36 : .64;                      // how much of the screen's height the scroll fills
    const d = S.W * Math.sin(THE) / (2 * tv * f), half = d * th, m = Math.min(.16, half * .2);
    const a0 = half - m, a1 = S.Ltot - half + m;
    const e = clamp(u / PAN1, 0, 1), k = e < .1 ? e * e / .2 : e > .9 ? 1 - (1 - e) * (1 - e) / .2 - .1 : e - .05;   // even, eased at both ends
    const t = P(lerp(a0, a1, k / .9), .5 * S.W, 0);
    const dir = S.N.clone().multiplyScalar(Math.cos(THE)).add(new T.Vector3(0, Math.sin(THE), 0));
    return { p: t.clone().addScaledVector(dir, d), t };
  }
  function camAt(u) {
    const A = panPose(u), k = eio(smt(PAN1 - .15, FIN, u));
    const fp = new T.Vector3(0, EYE, 0), ft = new T.Vector3(0, EYE - Math.tan(S.pitch) * 10, -10);
    const p = A.p.clone().lerp(fp, k), t = A.t.clone().lerp(ft, k);
    cam.position.copy(p); cam.up.set(0, 1, 0); cam.lookAt(t);
    sway(t, 1 - smt(PAN1 - .2, PAN1 + .4, u));
  }

  /* the pointer moves the view a very little, as in the Commedia (window.TAO_PTR, set by the page): a drift along the
     scroll and a slight tilt toward or away from it, never a turn, so the scroll's edges stay level */
  const sw = { x: 0, y: 0 };
  function sway(target, free) {
    if (free <= .001) return;
    const o = cam.position.clone().sub(target).applyAxisAngle(S.D, -sw.y * .035 * free), dx = S.D.clone().multiplyScalar(sw.x * .045 * free);
    const t = target.clone().add(dx);
    cam.position.copy(t).add(o); cam.lookAt(t);
  }
  let lastT = 0, lastU = null, gust = 0;
  function step(u) {
    if (u > -1.8) load();
    const ph = smt(PH0, PH1, u), out = smt(OUT0, OUT1, u);
    photo.style.opacity = ph.toFixed(3);
    cv.style.opacity = (1 - out).toFixed(3);
    if (!R || !meshes.length) return 1 - ph;
    if (u < -1.05 || u > END + .2) { lastT = 0; lastU = null; return 1 - ph; }
    const now = performance.now(), dt = lastT ? Math.min(.05, (now - lastT) / 1000) : .016; lastT = now;
    const Q = window.TAO_PTR || { x: 0, y: 0 };
    sw.x += (Q.x - sw.x) * Math.min(1, dt * 3); sw.y += (Q.y - sw.y) * Math.min(1, dt * 3);
    // the scroll moving stirs the air a little more; it eases off slowly once the page is still
    const sp = lastU === null ? 0 : Math.min(2, Math.abs(u - lastU) / Math.max(dt, 1e-3)); lastU = u;
    gust += (Math.min(1, sp) - gust) * Math.min(1, dt * (sp > gust ? 3 : .8));
    const uc = clamp(u, 0, END);
    camAt(uc);
    U.uTime.value = now / 1000;
    U.uWind.value = .065 * (1 + .8 * gust) * (1 - smt(PAN1, FIN, uc));
    U.uRel.value = .008 * (1 - smt(PAN1, FIN, uc));
    R.render(scene, cam);
    return 1 - ph;
  }
  return { load, layout, step, END, PHOTO: OUT1 };
};

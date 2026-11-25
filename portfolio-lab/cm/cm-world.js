/* Compressed Modernity: the rubbings as one long handscroll, read the way a handscroll is read: close, a stretch at a
   time, the eye travelling along it from its head to its tail.
   Thirteen of the traced sheets are joined edge to edge (frayed where they meet) into one strip of white paper lying on
   black, dense canopies first, then the strokes of the grasses, then the blots, thinning toward the end. The ink stands
   a little as high as it is dark and a low light rakes across it, so the rubbings read as a land; beyond the stretch
   being read the paper sinks into the dark. The view opens close on the head of the scroll, draws back a little and
   moves along it, the paper passing under the eye; at the tail it rises back to where the cover photograph was taken
   (the strip lies exactly where the paper lies in the picture) and the picture takes over.
   step(u): u = screen heights of scroll since the frame pinned. Needs THREE (r128). */
window.CMStage = function (frame, opts) {
  'use strict';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smt = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const eio = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const PAN1 = 5.0, BK0 = 4.55, BK1 = 5.95, PH0 = 5.55, PH1 = 6.05, OUT0 = 6.0, OUT1 = 6.35, END = 6.6;
  // the photograph's camera (assumed): a phone's main lens, 41° vertical on the 16:9 frame, eye height 1.5 m; the
  // horizon, where the paper's long edges meet, at .455 of the height
  const VFOV = 41, EYE = 1.5, HZ = .455;
  const NT = opts.tiles.length, TAR = opts.tileAspect || 1240 / 1754;     // a tile: along ÷ across

  frame.classList.add('cm');
  const photo = document.createElement('img'); photo.className = 'ws-photo'; photo.alt = ''; photo.decoding = 'async';
  const cv = document.createElement('canvas'); cv.className = 'ws-cv'; cv.setAttribute('aria-hidden', 'true');
  frame.appendChild(photo); frame.appendChild(cv);

  let T = null, R = null, scene, cam, vw = 1, vh = 1, mobile = false, loaded = 0, key = '', built = false, S = null, U = null;
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
      init(); key = '';
    }).catch(e => console.warn('CM world off:', e));
  }
  function loadHi() {
    if (hiQueued || mobile || !built) return; hiQueued = true;
    let next = 0;
    const one = () => { const k = next++; if (k >= NT) return;
      img(opts.tiles[k].hi).then(im => { if (im && tex[k]) { tex[k].image = im; tex[k].needsUpdate = true; key = ''; } one(); }); };
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
    let a = new Float32Array(n), b = new Float32Array(n);
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
    return { h: a, GW };
  }
  function buildTiles() {
    meshes.forEach(m => { scene.remove(m); m.geometry.dispose(); }); meshes.length = 0;
    const na = mobile ? 56 : 110, nc = mobile ? 80 : 156, { h, GW } = heights(na, nc);
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
  const VS = `
    attribute vec3 aP; attribute vec2 aG;
    uniform vec3 uO, uD, uN; uniform float uLt, uW, uS0, uK, uRel;
    varying vec2 vUv; varying vec3 vNrm; varying vec3 vW; varying float vDist;
    void main(){
      float s = aP.x, t = aP.y, h = aP.z * uRel;
      vec3 nL = normalize(vec3(-aG.x * uRel / uLt, 1., -aG.y * uRel / uW));       // (along, up, across)
      vec3 w = uO + uD * (uS0 + (uK + s) * uLt) + uN * (t * uW) + vec3(0., h, 0.);
      vNrm = normalize(uD * nL.x + vec3(0., nL.y, 0.) + uN * nL.z);
      vUv = vec2(s, 1. - t);                                  // the sheet's top at the far edge
      vW = w;
      vec4 mv = modelViewMatrix * vec4(w, 1.);
      vDist = -mv.z;
      gl_Position = projectionMatrix * mv;
    }`;
  const FS = `
    precision highp float;
    uniform sampler2D uTex; uniform vec3 uSun, uFoc; uniform float uFogN, uFogF;
    varying vec2 vUv; varying vec3 vNrm; varying vec3 vW; varying float vDist;
    void main(){
      float ink = 1. - texture2D(uTex, vUv).r;
      vec3 paper = vec3(.972, .966, .952), inkC = vec3(.07, .07, .075);
      vec3 n = normalize(vNrm); if (dot(n, cameraPosition - vW) < 0.) n = -n;   // the side the eye sees
      float lit = .66 + .44 * max(dot(n, uSun), 0.);
      vec3 c = mix(paper, inkC, pow(ink, 1.1)) * lit;
      // beyond the stretch being read, the scroll sinks into the dark
      float f = smoothstep(uFogN, uFogF, distance(vW, uFoc));
      gl_FragColor = vec4(c * (1. - f), 1.);
    }`;

  function init() {
    if (!T || built) return;
    try { R = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, premultipliedAlpha: false }); } catch (e) { console.warn('CM world off:', e); return; }
    R.setClearColor(0x000000, 0);
    scene = new T.Scene(); cam = new T.PerspectiveCamera(VFOV, 1, .002, 200);
    U = { uO: { value: new T.Vector3() }, uD: { value: new T.Vector3() }, uN: { value: new T.Vector3() }, uLt: { value: 1 }, uW: { value: 1 }, uS0: { value: 0 },
      uRel: { value: .03 }, uSun: { value: new T.Vector3(.35, .55, -.76).normalize() }, uFoc: { value: new T.Vector3() }, uFogN: { value: 1 }, uFogF: { value: 2 } };
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
    tab = null; key = '';
  }
  function layout(w, h) {
    vw = w; vh = h; const m = vw < 700;
    if (built && m !== mobile) { mobile = m; buildTiles(); loadHi(); }
    mobile = m; size(); key = '';
  }

  /* ---------- the camera: close on the head; along the scroll; back to the photograph ----------
     How much of the scroll the screen spans at the point being read grows from a little over half a sheet to about
     two; the eye moves along at a pace kept in step with that span, so the paper passes at the same speed on screen
     however close it is. */
  let tab = null;
  const NU = 600;
  function span(u) { return S.Lt * (.62 + .95 * smt(.05, 1.4, u) + .45 * smt(2.6, PAN1, u)); }
  function build() {
    const b = photoBox(), tv = Math.tan(VFOV * Math.PI / 360) * vh / b.ph, th = tv * vw / vh;
    const A0 = .36 * S.Lt, A1 = S.Ltot - .62 * S.Lt, a = new Float32Array(NU + 1);
    let acc = 0; a[0] = 0;
    for (let i = 1; i <= NU; i++) {
      const u = PAN1 * (i - .5) / NU;
      acc += span(u) * smt(0, .9, u) * (1 - smt(PAN1 - .7, PAN1, u)); a[i] = acc;
    }
    for (let i = 0; i <= NU; i++) a[i] = A0 + (A1 - A0) * a[i] / acc;
    tab = { a, th: Math.max(th, .34) };
  }
  const PSI = .6, THE = .56;                                // looking along the scroll and down at it
  function panPose(u) {
    if (!tab) build();
    const x = clamp(u / PAN1, 0, 1) * NU, i = Math.min(NU - 1, Math.floor(x)), f = x - i;
    const a = lerp(tab.a[i], tab.a[i + 1], f), d = span(clamp(u, 0, PAN1)) / (2 * tab.th) * 1.08;
    const t = P(a, .5 * S.W, 0);
    const dir = S.D.clone().multiplyScalar(-Math.sin(PSI) * Math.cos(THE)).addScaledVector(S.N, Math.cos(PSI) * Math.cos(THE)).add(new T.Vector3(0, Math.sin(THE), 0));
    return { p: t.clone().addScaledVector(dir, d), t, d };
  }
  function camAt(u) {
    const A = panPose(u), k = eio(smt(BK0, BK1, u));
    const fp = new T.Vector3(0, EYE, 0), ft = new T.Vector3(0, EYE - Math.tan(S.pitch) * 10, -10);
    const p = A.p.clone().lerp(fp, k), t = A.t.clone().lerp(ft, k);
    cam.position.copy(p); cam.up.set(0, 1, 0); cam.lookAt(t);
    sway(A.t.clone().lerp(t, k), 1 - smt(BK0, BK0 + .7, u));
    return A;
  }

  /* the pointer turns the view a little, as in the Commedia: the camera swings round what it looks at, easing after
     the mouse, and lets go as the view comes to the photograph (window.TAO_PTR, set by the page) */
  const sw = { x: 0, y: 0, t: 0 };
  function swayEase() {
    const Q = window.TAO_PTR || { x: 0, y: 0 }, now = performance.now(), dt = sw.t ? Math.min(.05, (now - sw.t) / 1000) : .016; sw.t = now;
    sw.x += (Q.x - sw.x) * Math.min(1, dt * 3); sw.y += (Q.y - sw.y) * Math.min(1, dt * 3);
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
    const ph = smt(PH0, PH1, u), out = smt(OUT0, OUT1, u);
    photo.style.opacity = ph.toFixed(3);
    cv.style.opacity = (1 - out).toFixed(3);
    if (!R || !meshes.length) return 1 - ph;
    if (u < -1.05 || u > END + .2) return 1 - ph;
    const k = `${u.toFixed(4)}|${vw}|${vh}` + swayEase();
    if (k === key) return 1 - ph; key = k;
    const A = camAt(clamp(u, 0, END));
    // the stretch being read is lit; the rest sinks into the dark, until the view stands back for the photograph
    const back = smt(BK0, BK1 - .25, u);
    U.uFoc.value.copy(A.t);
    U.uFogN.value = lerp(A.d * .95, 60, back); U.uFogF.value = lerp(A.d * 2.3, 90, back);
    U.uRel.value = .03 * (1 - .8 * smt(BK0, BK1, u));
    R.render(scene, cam);
    return 1 - ph;
  }
  return { load, layout, step, END, PHOTO: OUT1 };
};

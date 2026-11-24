/* Compressed Modernity: a world made from the work's own rubbings. Four of the traced black-and-white sheets are laid
   end to end as one long scroll on the ground; each starts rolled up and unrolls in its turn, each from its own side
   (top → bottom, left → right, right → left, bottom → top, as first seen from above). The ink is a field of particles
   standing as high as it is dark, so once the paper is open the canopies and grasses of the rubbings rise into hills
   and woods. The camera looks straight down at the first sheet (the drawing as it is), sinks and skims the land, then
   draws back to where the cover photograph was taken: the world was the scroll of paper on the grass all along, laid
   exactly where the paper lies in the picture, and the picture takes over.
   step(u): u = screen heights of scroll since the frame pinned. Needs THREE (r128). */
window.CMStage = function (frame, opts) {
  'use strict';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smt = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const eio = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const T0 = [.05, .8, 1.55, 2.3], TD = 1.0;               // each sheet unrolls: start, length (u)
  const PH0 = 4.2, PH1 = 4.75, OUT0 = 4.7, OUT1 = 5.05, END = 5.4;
  // the photograph's camera (assumed): a phone's main lens, 41° vertical on the 16:9 frame, eye height 1.5 m; the
  // horizon, where the paper's long edges meet, at .455 of the height
  const VFOV = 41, EYE = 1.5, HZ = .455;

  frame.classList.add('cm');
  const photo = document.createElement('img'); photo.className = 'ws-photo'; photo.alt = ''; photo.decoding = 'async';
  const cv = document.createElement('canvas'); cv.className = 'ws-cv'; cv.setAttribute('aria-hidden', 'true');
  frame.appendChild(photo); frame.appendChild(cv);

  let T = null, R = null, scene, cam, pts = null, mat = null, vw = 1, vh = 1, mobile = false, loaded = 0, key = '', built = false;
  let S = null;                                             // strip frame in the world
  const imgs = [];

  function js(src) { return new Promise((res, rej) => { const el = document.createElement('script'); el.src = src; el.onload = res; el.onerror = rej; document.head.appendChild(el); }); }
  function load() {
    if (loaded) return; loaded = 1;
    photo.src = opts.photo;
    const ims = opts.sheets.map(s => new Promise(res => { const im = new Image(); im.decoding = 'async'; im.src = s.src; (im.decode ? im.decode() : new Promise(r => { im.onload = r; })).then(() => res(im), () => res(null)); }));
    Promise.all([window.THREE ? 0 : js(opts.three), Promise.all(ims)]).then(([, list]) => {
      T = window.THREE; list.forEach((im, i) => imgs[i] = im);
      init(); key = '';
    }).catch(e => console.warn('CM world off:', e));
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
    const Ls = W * Math.SQRT2, s0 = Math.max(.15, (len - 4 * Ls) * .5);
    return { O: q[0], D, N, W, Ls, s0, pitch, len };
  }
  const P = (a, c, h) => S.O.clone().addScaledVector(S.D, a).addScaledVector(S.N, c).add(new T.Vector3(0, h, 0));

  /* ---------- particles: the ink of each sheet, darker stands higher ---------- */
  function sample(im, ns, nt) {
    const c = document.createElement('canvas'); c.width = nt; c.height = ns;
    const x = c.getContext('2d'); x.drawImage(im, 0, 0, nt, ns);
    const d = x.getImageData(0, 0, nt, ns).data, n = ns * nt, dk = new Float32Array(n), hb = new Float32Array(n);
    for (let i = 0; i < n; i++) dk[i] = 1 - d[i * 4] / 255;
    // relief: the darkness, softened twice (so canopies are hills, not needles)
    let a = dk, b = new Float32Array(n);
    for (let pass = 0; pass < 3; pass++) {
      for (let j = 0; j < ns; j++) for (let i = 0; i < nt; i++) {
        let s = 0, m = 0;
        for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) { const jj = j + dj, ii = i + di; if (jj < 0 || ii < 0 || jj >= ns || ii >= nt) continue; s += a[jj * nt + ii]; m++; }
        b[j * nt + i] = s / m;
      }
      const t = a === dk ? new Float32Array(n) : a; a = b; b = t;
    }
    hb.set(a);
    return { dk, hb };
  }
  function build() {
    const ns = mobile ? 300 : 440, nt = mobile ? 212 : 310;
    const P4 = [], K = [];
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    imgs.forEach((im, k) => {
      if (!im) return;
      const { dk, hb } = sample(im, ns, nt);
      for (let j = 0; j < ns; j++) for (let i = 0; i < nt; i++) {
        const v = dk[j * nt + i];
        if (v < .2 && rnd() > .05) continue;
        P4.push((j + rnd()) / ns, (i + rnd()) / nt, v, hb[j * nt + i]); K.push(k);
      }
    });
    const g = new T.BufferGeometry();
    g.setAttribute('aP', new T.Float32BufferAttribute(P4, 4));
    g.setAttribute('aK', new T.Float32BufferAttribute(K, 1));
    g.setAttribute('position', new T.Float32BufferAttribute(new Float32Array(K.length * 3), 3));
    g.boundingSphere = new T.Sphere(new T.Vector3(), 1e6);
    return g;
  }
  const VS = `
    attribute vec4 aP; attribute float aK;
    uniform vec3 uO, uD, uN; uniform float uLs, uW, uS0; uniform vec4 uE;
    uniform float uRel, uSize, uScale, uFogN, uFogF, uA;
    varying float vA;
    void main(){
      float k = aK, e = k < .5 ? uE.x : k < 1.5 ? uE.y : k < 2.5 ? uE.z : uE.w;
      // the axis each sheet unrolls along, as seen from above: 0 top→bottom, 1 left→right, 2 right→left, 3 bottom→top
      float x, L; bool alongS = k > .5 && k < 2.5;
      if (k < .5) { x = aP.y; L = uW; } else if (k < 1.5) { x = aP.x; L = uLs; } else if (k < 2.5) { x = 1. - aP.x; L = uLs; } else { x = 1. - aP.y; L = uW; }
      float h, roll = 0.;
      if (x <= e) h = aP.w * uRel * smoothstep(0., .16, e - x) + aP.z * uRel * .12 * smoothstep(0., .16, e - x);
      else {
        // still rolled: wound round a roll lying on its front edge, thinner as less paper is left
        float r = L * (.006 + .026 * sqrt(1. - e)), ph = (x - e) * L / r;
        x = e + r * sin(ph) / L; h = r * (1. - cos(ph)) + aP.z * .0012; roll = 1.;
      }
      float s = aP.x, t = aP.y;
      if (alongS) s = k < 1.5 ? x : 1. - x; else t = k < .5 ? x : 1. - x;
      vec3 w = uO + uD * (uS0 + (k + s) * uLs) + uN * (t * uW) + vec3(0., h, 0.);
      vec4 mv = modelViewMatrix * vec4(w, 1.);
      gl_Position = projectionMatrix * mv;
      float dist = -mv.z;
      gl_PointSize = clamp(uSize * uScale / dist, 1., 4.5);
      vA = mix(.07, .92, aP.z) * (1. - roll * (fract(aP.x * 917.3 + aP.y * 531.7) > .28 ? 1. : .35)) * (1. - smoothstep(uFogN, uFogF, dist)) * uA * smoothstep(.0, .01, dist);
    }`;
  const FS = `
    precision mediump float; varying float vA;
    void main(){ vec2 c = gl_PointCoord - .5; if (dot(c, c) > .25) discard; gl_FragColor = vec4(.07, .07, .07, vA); }`;

  function init() {
    if (!T || built) return;
    try { R = new T.WebGLRenderer({ canvas: cv, antialias: false, alpha: true, premultipliedAlpha: false }); } catch (e) { console.warn('CM world off:', e); return; }
    R.setClearColor(0xffffff, 0);
    scene = new T.Scene(); cam = new T.PerspectiveCamera(VFOV, 1, .002, 200);
    mat = new T.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, transparent: true, depthTest: false, depthWrite: false,
      uniforms: { uO: { value: new T.Vector3() }, uD: { value: new T.Vector3() }, uN: { value: new T.Vector3() }, uLs: { value: 1 }, uW: { value: 1 }, uS0: { value: 0 },
        uE: { value: new T.Vector4() }, uRel: { value: .035 }, uSize: { value: .0034 }, uScale: { value: 600 }, uFogN: { value: 1 }, uFogF: { value: 2 }, uA: { value: 1 } } });
    built = true; size();
    pts = new T.Points(build(), mat); pts.frustumCulled = false; scene.add(pts);
  }
  function size() {
    if (!R) return;
    const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 2 : 1.5);
    R.setPixelRatio(dpr); R.setSize(vw, vh, false);
    // the camera projects exactly as the photograph is shown (cover on a wide screen, whole on a phone)
    const b = photoBox();
    cam.fov = VFOV; cam.aspect = b.pw / b.ph; cam.setViewOffset(b.pw, b.ph, -b.ox, -b.oy, vw, vh); cam.updateProjectionMatrix();
    S = strip();
    const U = mat.uniforms;
    U.uO.value.copy(S.O); U.uD.value.copy(S.D); U.uN.value.copy(S.N); U.uLs.value = S.Ls; U.uW.value = S.W; U.uS0.value = S.s0;
    U.uScale.value = b.ph / (2 * Math.tan(VFOV * Math.PI / 360)) * dpr;
    keys = null; key = '';
  }
  function layout(w, h) {
    vw = w; vh = h; const m = vw < 700;
    if (built && m !== mobile) { mobile = m; scene.remove(pts); pts.geometry.dispose(); pts = new T.Points(build(), mat); pts.frustumCulled = false; scene.add(pts); }
    mobile = m; size(); key = '';
  }

  /* ---------- the camera: straight down at the first sheet; down into the land; back to the photograph ---------- */
  let keys = null;
  function makeKeys() {
    const b = photoBox(), tv = Math.tan(VFOV * Math.PI / 360) * vh / b.ph, th = tv * vw / vh;
    const H0 = Math.max(S.W / (2 * .78 * tv), S.Ls / (2 * .9 * th));
    const L = S.Ls, W = S.W, s0 = S.s0, up = new T.Vector3(0, 1, 0), far = S.N.clone().negate();
    const k = (u, pa, ta, upv) => ({ u, p: P(s0 + pa[0], pa[1], pa[2]), t: P(s0 + ta[0], ta[1], ta[2]), up: upv || up });
    const fin = { u: PH1 - .05, p: new T.Vector3(0, EYE, 0), t: new T.Vector3(0, EYE - Math.tan(S.pitch) * 10, -10), up };
    return [
      k(0, [.5 * L, .5 * W, H0], [.5 * L, .5 * W, 0], far),
      k(.85, [.62 * L, .62 * W, H0 * .62], [.75 * L, .5 * W, 0], far),
      k(1.55, [1.05 * L, 1.15 * W, .32], [1.6 * L, .45 * W, 0]),
      k(2.3, [1.7 * L, 1.0 * W, .16], [2.3 * L, .45 * W, 0]),
      k(2.95, [2.45 * L, .05 * W, .1], [3.0 * L, .55 * W, 0]),
      k(3.45, [3.25 * L, .75 * W, .09], [3.85 * L, .4 * W, 0]),
      k(3.85, [2.6 * L, 2.6 * W, .9], [2 * L, .5 * W, 0]),
      fin,
    ];
  }
  const cr = (p0, p1, p2, p3, t) => {                       // Catmull–Rom
    const t2 = t * t, t3 = t2 * t;
    return .5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
  };
  const crv = (a, b, c, d, t) => new T.Vector3(cr(a.x, b.x, c.x, d.x, t), cr(a.y, b.y, c.y, d.y, t), cr(a.z, b.z, c.z, d.z, t));
  function camAt(u) {
    if (!keys) keys = makeKeys();
    const K = keys, n = K.length;
    let i = 0; while (i < n - 2 && u > K[i + 1].u) i++;
    const a = K[Math.max(0, i - 1)], b = K[i], c = K[i + 1], d = K[Math.min(n - 1, i + 2)];
    const t = eio(clamp((u - b.u) / (c.u - b.u), 0, 1));
    const p = crv(a.p, b.p, c.p, d.p, t), tg = crv(a.t, b.t, c.t, d.t, t);
    if (p.y < .012) p.y = .012;
    const upv = b.up.clone().lerp(c.up, t).normalize();
    cam.position.copy(p); cam.up.copy(upv); cam.lookAt(tg);
    return p;
  }

  function step(u) {
    if (u > -1.8) load();
    const ph = smt(PH0, PH1, u), out = smt(OUT0, OUT1, u);
    photo.style.opacity = ph.toFixed(3);
    cv.style.opacity = (1 - out).toFixed(3);
    if (!R || !pts) return;
    if (u < -1.05 || u > END + .2) return;
    const k = `${u.toFixed(4)}|${vw}|${vh}`;
    if (k === key) return; key = k;
    const U = mat.uniforms;
    U.uE.value.set(...T0.map(a => eio(clamp((u - a) / TD, 0, 1))));
    const p = camAt(clamp(u, 0, END));
    // fog: close in over the land, gone when the camera stands back where the photograph was taken
    const hgt = Math.max(.02, p.y), back = smt(3.5, 4.3, u);
    U.uFogN.value = lerp(Math.max(.25, hgt * 3), 30, back); U.uFogF.value = lerp(Math.max(1.1, hgt * 11), 60, back);
    U.uRel.value = .035 * (1 - smt(3.9, 4.6, u) * .85);
    R.render(scene, cam);
  }
  return { load, layout, step, END, PHOTO: OUT1 };
};

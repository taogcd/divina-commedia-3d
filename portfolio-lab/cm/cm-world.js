/* Compressed Modernity: a world made from the work's own rubbings. Six of the traced black-and-white sheets are laid
   end to end as one long scroll on the ground (six is what the paper in the photograph holds); each starts rolled up
   and unrolls in its turn, each from its own side (top → bottom, left → right, right → left, bottom → top, and again,
   as first seen from above). The paper's ink stands as high
   as it is dark, so once the paper is open the canopies and grasses of the rubbings rise into an ink landscape, raked by
   a low light, with mist in its hollows and distance. The camera looks straight down at the first sheet (the drawing as it is), sinks and skims the land, then
   draws back to where the cover photograph was taken: the world was the scroll of paper on the grass all along, laid
   exactly where the paper lies in the picture, and the picture takes over.
   It is shown on black, and no paper is drawn: each rubbing is a cloud of points of light where its ink lies.
   step(u): u = screen heights of scroll since the frame pinned. Needs THREE (r128). */
window.CMStage = function (frame, opts) {
  'use strict';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smt = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const eio = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const T0 = [.05, .7, 1.35, 2.0, 2.65, 3.3], TD = .95;     // each sheet unrolls: start, length (u)
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
  const imgs = [], NS = opts.sheets.length;

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
    const Ls = W * Math.SQRT2, s0 = Math.max(.1, (len - NS * Ls) * .5);
    return { O: q[0], D, N, W, Ls, s0, pitch, len };
  }
  const P = (a, c, h) => S.O.clone().addScaledVector(S.D, a).addScaledVector(S.N, c).add(new T.Vector3(0, h, 0));

  /* ---------- the land: each sheet as a cloud of points, its ink standing as high as it is dark ----------
     No paper is drawn. Each rubbing is read as light on the dark: points of light where its ink lies, thick where the
     ink is heavy and thinning out to a faint dust where the paper was bare, every point lifted as high as the ink is
     dark around it. So the canopies and grasses of the rubbings rise as a landscape of light, and the sheets, rolled,
     are luminous rolls. */
  function sample(im, ns, nt, blur) {
    const c = document.createElement('canvas'); c.width = nt; c.height = ns;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0, nt, ns);
    const d = x.getImageData(0, 0, nt, ns).data, n = ns * nt, dk = new Float32Array(n);
    for (let i = 0; i < n; i++) dk[i] = 1 - d[i * 4] / 255;
    let a = dk, b = new Float32Array(n);
    for (let pass = 0; pass < blur; pass++) {                // softened: canopies are hills, not needles
      for (let j = 0; j < ns; j++) for (let i = 0; i < nt; i++) {
        let sum = 0, m = 0;
        for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) { const jj = j + dj, ii = i + di; if (jj < 0 || ii < 0 || jj >= ns || ii >= nt) continue; sum += a[jj * nt + ii]; m++; }
        b[j * nt + i] = sum / m;
      }
      const t = a === dk ? new Float32Array(n) : a; a = b; b = t;
    }
    return a;
  }
  function build() {
    const NP = mobile ? 50000 : 160000, P = new Float32Array(NP * 6 * 3), Q = new Float32Array(NP * 6 * 3); let np = 0;
    let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    imgs.forEach((im, k) => {
      if (!im) return;
      const hs = 220, ht = 156, hb = sample(im, hs, ht, 3);             // the heights, softened
      const fs = 640, ft = 452, ink = sample(im, fs, ft, 0);           // the ink, as it is
      const hAt = (s, t) => { const y = s * (hs - 1), x = t * (ht - 1), j = Math.floor(y), i = Math.floor(x), fy = y - j, fx = x - i, j1 = Math.min(hs - 1, j + 1), i1 = Math.min(ht - 1, i + 1);
        return (hb[j * ht + i] * (1 - fx) + hb[j * ht + i1] * fx) * (1 - fy) + (hb[j1 * ht + i] * (1 - fx) + hb[j1 * ht + i1] * fx) * fy; };
      const sm = v => { const t = Math.min(1, Math.max(0, (v - .15) / .8)); return t * t * (3 - 2 * t); };
      for (let n = 0, tries = 0; n < NP && tries < NP * 30; tries++) {
        const s = rnd(), t = rnd(), v = ink[Math.min(fs - 1, Math.floor(s * fs)) * ft + Math.min(ft - 1, Math.floor(t * ft))];
        if (rnd() > sm(v) * .985 + .008) continue;              // where the ink is; a faint dust where it is not
        P[np * 3] = s; P[np * 3 + 1] = t; P[np * 3 + 2] = hAt(s, t); Q[np * 3] = v; Q[np * 3 + 1] = k; Q[np * 3 + 2] = rnd(); np++; n++;
      }
    });
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(P.subarray(0, np * 3), 3));
    g.setAttribute('aQ', new T.BufferAttribute(Q.subarray(0, np * 3), 3));
    g.boundingSphere = new T.Sphere(new T.Vector3(), 1e6);
    return g;
  }
  const VS = `
    attribute vec3 aQ;                                       // position: (s along, t across, height); aQ: (ink, sheet, random)
    uniform vec3 uO, uD, uN; uniform float uLs, uW, uS0; uniform vec4 uE; uniform vec2 uE2; uniform float uRel, uFogN, uFogF, uPS, uTime, uA;
    varying float vA;
    void main(){
      vec4 aP = vec4(position, aQ.x); float aK = aQ.y, aR = aQ.z;
      float k = aK, e = k < .5 ? uE.x : k < 1.5 ? uE.y : k < 2.5 ? uE.z : k < 3.5 ? uE.w : k < 4.5 ? uE2.x : uE2.y;
      // the axis each sheet unrolls along, as seen from above: 0 top→bottom, 1 left→right, 2 right→left, 3 bottom→top
      float d = mod(k, 4.), x, L; bool alongS = d > .5 && d < 2.5;
      if (d < .5) { x = aP.y; L = uW; } else if (d < 1.5) { x = aP.x; L = uLs; } else if (d < 2.5) { x = 1. - aP.x; L = uLs; } else { x = 1. - aP.y; L = uW; }
      float h, rise = smoothstep(0., .16, e - x), roll = 0.;
      if (x <= e) h = aP.z * uRel * rise;
      else {
        // still rolled: wound round a roll lying on its front edge, thinner as less paper is left
        float r = L * (.006 + .026 * sqrt(1. - e)), ph = (x - e) * L / r;
        x = e + r * sin(ph) / L; h = r * (1. - cos(ph)); roll = 1.;
      }
      float s = aP.x, t = aP.y;
      if (alongS) s = d < 1.5 ? x : 1. - x; else t = d < .5 ? x : 1. - x;
      vec3 w = uO + uD * (uS0 + (k + s) * uLs) + uN * (t * uW) + vec3(0., h + (aR - .5) * .0012 * rise, 0.);
      vec4 mv = modelViewMatrix * vec4(w, 1.);
      float dist = -mv.z;
      gl_Position = projectionMatrix * mv;
      float sz = uPS * (.0010 + .0012 * aR) / dist;
      gl_PointSize = clamp(sz, 1., 3.2);
      float a = (.3 + .7 * aP.w) * (roll > .5 ? .3 : 1.) * (.8 + .2 * sin(uTime + aR * 50.));
      a *= (1. - smoothstep(uFogN, uFogF, dist)) * smoothstep(.004, .03, dist) * min(1., sz);
      vA = a * uA;
    }`;
  const FS = `
    precision mediump float; varying float vA;
    void main(){ vec2 c = gl_PointCoord - .5; float r = dot(c, c); if (r > .25) discard;
      gl_FragColor = vec4(vec3(.94, .93, .9) * vA * (1. - r * 2.6), 1.); }`;
  // dust in the light: a few hundred motes around the scroll, drifting as the page scrolls
  let motes = null, moteMat = null;
  function buildMotes() {
    const n = mobile ? 260 : 520, P = [];
    let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < n; i++) P.push(rnd(), rnd(), rnd(), rnd());
    const g = new T.BufferGeometry();
    g.setAttribute('aR', new T.Float32BufferAttribute(P, 4));
    g.setAttribute('position', new T.Float32BufferAttribute(new Float32Array(n * 3), 3));
    g.boundingSphere = new T.Sphere(new T.Vector3(), 1e6);
    moteMat = new T.ShaderMaterial({ transparent: true, depthWrite: false,
      uniforms: { uO: { value: new T.Vector3() }, uD: { value: new T.Vector3() }, uN: { value: new T.Vector3() }, uLen: { value: 1 }, uW: { value: 1 }, uS0: { value: 0 }, uT: { value: 0 }, uScale: { value: 600 }, uA: { value: 1 } },
      vertexShader: `attribute vec4 aR; uniform vec3 uO, uD, uN; uniform float uLen, uW, uS0, uT, uScale; varying float vA;
        void main(){
          float a = uS0 + aR.x * uLen + .06 * sin(uT * 1.3 + aR.w * 40.), c = (aR.y * 1.6 - .3) * uW + .05 * cos(uT * 1.1 + aR.z * 30.);
          float y = .004 + aR.z * aR.z * .16 + .02 * sin(uT * .8 + aR.x * 50.);
          vec3 w = uO + uD * a + uN * c + vec3(0., y, 0.);
          vec4 mv = modelViewMatrix * vec4(w, 1.); gl_Position = projectionMatrix * mv;
          gl_PointSize = clamp(.0016 * uScale / -mv.z, 1., 3.5);
          vA = .35 * smoothstep(.01, .06, -mv.z) * (1. - smoothstep(.8, 2.2, -mv.z));
        }`,
      fragmentShader: `precision mediump float; uniform float uA; varying float vA;
        void main(){ vec2 c = gl_PointCoord - .5; if (dot(c, c) > .25) discard; gl_FragColor = vec4(.86, .85, .82, vA * uA); }` });
    motes = new T.Points(g, moteMat); motes.frustumCulled = false; scene.add(motes);
  }

  function init() {
    if (!T || built) return;
    try { R = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, premultipliedAlpha: false }); } catch (e) { console.warn('CM world off:', e); return; }
    R.setClearColor(0x000000, 0);
    scene = new T.Scene(); cam = new T.PerspectiveCamera(VFOV, 1, .002, 200);
    mat = new T.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, transparent: true, depthTest: false, depthWrite: false, blending: T.AdditiveBlending,
      uniforms: { uO: { value: new T.Vector3() }, uD: { value: new T.Vector3() }, uN: { value: new T.Vector3() }, uLs: { value: 1 }, uW: { value: 1 }, uS0: { value: 0 },
        uE: { value: new T.Vector4() }, uE2: { value: new T.Vector2() }, uRel: { value: .035 }, uFogN: { value: 1 }, uFogF: { value: 2 }, uPS: { value: 800 }, uTime: { value: 0 }, uA: { value: .62 } } });
    built = true; size();
    pts = new T.Points(build(), mat); pts.frustumCulled = false; scene.add(pts);
    buildMotes(); size();
  }
  function size() {
    if (!R) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    R.setPixelRatio(dpr); R.setSize(vw, vh, false);
    // the camera projects exactly as the photograph is shown (cover on a wide screen, whole on a phone)
    const b = photoBox();
    cam.fov = VFOV; cam.aspect = b.pw / b.ph; cam.setViewOffset(b.pw, b.ph, -b.ox, -b.oy, vw, vh); cam.updateProjectionMatrix();
    S = strip();
    const U = mat.uniforms;
    U.uO.value.copy(S.O); U.uD.value.copy(S.D); U.uN.value.copy(S.N); U.uLs.value = S.Ls; U.uW.value = S.W; U.uS0.value = S.s0;
    U.uPS.value = b.ph / (2 * Math.tan(VFOV * Math.PI / 360)) * dpr;
    if (moteMat) { const M = moteMat.uniforms; M.uO.value.copy(S.O); M.uD.value.copy(S.D); M.uN.value.copy(S.N); M.uLen.value = S.Ls * NS; M.uW.value = S.W; M.uS0.value = S.s0;
      M.uScale.value = b.ph / (2 * Math.tan(VFOV * Math.PI / 360)) * dpr; }
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
      k(1.5, [1.05 * L, 1.15 * W, .32], [1.6 * L, .45 * W, 0]),
      k(2.15, [1.85 * L, 1.0 * W, .16], [2.5 * L, .45 * W, 0]),
      k(2.75, [2.75 * L, .05 * W, .1], [3.35 * L, .55 * W, 0]),
      k(3.3, [3.7 * L, .75 * W, .09], [4.4 * L, .4 * W, 0]),
      k(3.85, [3.4 * L, 2.9 * W, 1.0], [2.9 * L, .5 * W, 0]),
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
    sway(tg, 1 - smt(3.8, 4.3, u));
    return p;
  }


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
    const ph = smt(PH0, PH1, u), out = smt(OUT0, OUT1, u);
    photo.style.opacity = ph.toFixed(3);
    cv.style.opacity = (1 - out).toFixed(3);
    if (!R || !pts) return 1 - ph;
    if (u < -1.05 || u > END + .2) return 1 - ph;
    const k = `${u.toFixed(4)}|${vw}|${vh}` + swayEase();
    if (k === key) return 1 - ph; key = k;
    const U = mat.uniforms;
    const E = T0.map(a => eio(clamp((u - a) / TD, 0, 1)));
    U.uE.value.set(E[0], E[1], E[2], E[3]); U.uE2.value.set(E[4], E[5]);
    const p = camAt(clamp(u, 0, END));
    // fog: close in over the land, gone when the camera stands back where the photograph was taken
    const hgt = Math.max(.02, p.y), back = smt(3.5, 4.3, u);
    U.uFogN.value = lerp(Math.max(.3, hgt * 3.2), 30, back); U.uFogF.value = lerp(Math.max(1.3, hgt * 12), 60, back);
    U.uTime.value = u * 3;
    U.uRel.value = .035 * (1 - smt(3.9, 4.6, u) * .85);
    if (moteMat) { moteMat.uniforms.uT.value = u * 2.2; moteMat.uniforms.uA.value = smt(1.0, 1.8, u) * (1 - back); }
    R.render(scene, cam);
    return 1 - ph;
  }
  return { load, layout, step, END, PHOTO: OUT1 };
};

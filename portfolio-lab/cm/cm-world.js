/* Compressed Modernity: inside the scroll.
   The work's rubbings, all twenty-nine of them (the black-and-white sheets, the red one and the green ones), line the
   inside of a scroll rolled into a long tube, three sheets round and ten along, each sheet's ink raised a little off
   its paper. As in the Commedia, the picture holds still while what is in it changes: the tube's far end is always a
   round depth at the centre of the screen, and the rubbings stream past around it as the page is scrolled, the tube
   turning slowly. It opens close on one sheet, the ink and the grain of the paper filling the screen; the view lifts
   from it and turns up along the tube, the round depth appears, and the camera travels inward. Near the end the walls
   break into points, which spiral in toward the centre and settle, taking its colours, into the cover photograph,
   which then takes over exactly where they lie. The pointer turns the view a little, as in the Commedia.
   step(u): u = screen heights of scroll since the frame pinned. Needs THREE (r128). */
window.CMStage = function (frame, opts) {
  'use strict';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smt = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const eio = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  // the timeline (u)
  const OPEN = [0, 1.0], FLY = [1.0, 3.35], DIS = [3.0, 4.3];
  const PH0 = 4.3, PH1 = 4.8, OUT0 = 4.75, OUT1 = 5.1, END = 5.35;
  // the tube: three sheets round, ten along; a sheet's long side runs along it
  const AROUND = 3, ALONG = 10, R0 = 3 / (2 * Math.PI), LS = Math.SQRT2, LT = ALONG * LS, FOV = 58;

  frame.classList.add('cm');
  const photo = document.createElement('img'); photo.className = 'ws-photo'; photo.alt = ''; photo.decoding = 'async';
  const cv = document.createElement('canvas'); cv.className = 'ws-cv'; cv.setAttribute('aria-hidden', 'true');
  frame.appendChild(photo); frame.appendChild(cv);

  let T = null, R = null, scene, cam, vw = 1, vh = 1, mobile = false, loaded = 0, key = '', built = false;
  let imgs = [], hi0 = null, phImg = null, walls = [], dust = null, dustMat = null;

  const loadImg = (src, cors) => new Promise(res => { const im = new Image(); if (cors) im.crossOrigin = 'anonymous'; im.decoding = 'async'; im.src = src; (im.decode ? im.decode() : new Promise(r => { im.onload = r; })).then(() => res(im), () => res(null)); });
  function js(src) { return new Promise((res, rej) => { const el = document.createElement('script'); el.src = src; el.onload = res; el.onerror = rej; document.head.appendChild(el); }); }
  function load() {
    if (loaded) return; loaded = 1;
    photo.src = opts.photo;
    Promise.all([window.THREE ? 0 : js(opts.three), Promise.all(opts.sheets.map(s => loadImg(s))), opts.hi0 ? loadImg(opts.hi0) : null, loadImg(opts.photo, true)])
      .then(([, list, h, p]) => { T = window.THREE; imgs = list; hi0 = h; phImg = p; init(); key = ''; })
      .catch(e => console.warn('CM world off:', e));
  }

  /* ---------- the tube's walls: a curved panel for each sheet ---------- */
  // which sheet where: ring j (along), place i (round); the work's long scroll first, the red and green ones here and there
  const PERM = [2, 1, 0, 3, 4, 5, 6, 7, 8, 9, 10, 26, 12, 13, 14, 15, 16, 27, 18, 19, 20, 21, 22, 28, 24, 25, 11, 17, 23];
  const slotImg = (j, i) => { const k = (j * AROUND + i) % PERM.length, m = PERM[k]; return m < imgs.length ? m : k % imgs.length; };
  const twist = j => j * .7;                                 // each ring turned a little against the last
  const WALL_VS = `
    attribute vec2 aST;                                      // s along the sheet (0..1), t round it (0..1)
    uniform sampler2D uMap; uniform float uZ0, uTh0, uThL, uLen, uR, uSpin, uRel;
    varying vec2 vUv; varying vec3 vW; varying float vDist;
    void main(){
      vUv = vec2(aST.y, 1. - aST.x);
      vec3 c = texture2D(uMap, vUv).rgb;
      float ink = 1. - min(min(c.r, c.g), c.b);
      float th = uTh0 + aST.y * uThL + uSpin, r = uR - ink * uRel;
      vec3 w = vec3(cos(th) * r, sin(th) * r, uZ0 - aST.x * uLen);
      vW = w;
      vec4 mv = modelViewMatrix * vec4(w, 1.); vDist = -mv.z;
      gl_Position = projectionMatrix * mv;
    }`;
  const WALL_FS = `
    precision highp float;
    uniform sampler2D uMap; uniform float uFN, uFF, uDis, uSeed;
    varying vec2 vUv; varying vec3 vW; varying float vDist;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
      return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y); }
    void main(){
      // breaking up into points: the paper goes first in patches, the ink last
      vec3 c = texture2D(uMap, vUv).rgb;
      float ink = 1. - min(min(c.r, c.g), c.b), n = noise(vUv * vec2(18., 26.) + uSeed) * .7 + noise(vUv * 90. + uSeed) * .3;
      if (n < uDis * 1.35 - .25 * ink) discard;
      // light from the eye: the walls facing it brighter; the far end of the tube falls away into the dark
      vec3 nr = normalize(vec3(-vW.xy, 0.)), v = normalize(cameraPosition - vW);
      float lit = .55 + .45 * max(dot(nr, v), 0.);
      float edge = smoothstep(uDis * 1.35 - .25 * ink, uDis * 1.35 - .25 * ink + .08, n);
      vec3 col = c * lit * (1. - smoothstep(uFN, uFF, vDist)) * mix(1., edge, step(.001, uDis));
      gl_FragColor = vec4(col, 1.);
    }`;
  function panelGeo(nu, nv) {
    const P = [], ST = [], idx = [];
    for (let v = 0; v <= nv; v++) for (let u = 0; u <= nu; u++) { P.push(0, 0, 0); ST.push(v / nv, u / nu); }
    for (let v = 0; v < nv; v++) for (let u = 0; u < nu; u++) { const a = v * (nu + 1) + u, b = a + nu + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('aST', new T.Float32BufferAttribute(ST, 2)); g.setIndex(idx);
    g.boundingSphere = new T.Sphere(new T.Vector3(), 1e4); return g;
  }
  const WU = { uSpin: { value: 0 }, uFN: { value: 2 }, uFF: { value: 9 }, uDis: { value: 0 } };
  function buildWalls() {
    const geo = panelGeo(mobile ? 40 : 64, mobile ? 56 : 90), an = R.capabilities.getMaxAnisotropy();
    const tex = imgs.map((im, k) => { if (!im) return null; const t = new T.Texture(k === 0 && hi0 ? hi0 : im); t.needsUpdate = true; t.anisotropy = Math.min(8, an); return t; });
    for (let j = 0; j < ALONG; j++) for (let i = 0; i < AROUND; i++) {
      const t = tex[slotImg(j, i)] || tex.find(Boolean);
      const m = new T.ShaderMaterial({ vertexShader: WALL_VS, fragmentShader: WALL_FS, side: T.DoubleSide,
        uniforms: { uMap: { value: t }, uZ0: { value: -j * LS }, uTh0: { value: i * 2 * Math.PI / AROUND + twist(j) }, uThL: { value: 2 * Math.PI / AROUND - .004 },
          uLen: { value: LS - .004 }, uR: { value: R0 }, uRel: { value: .008 }, uSeed: { value: j * 7.3 + i * 3.1 },
          uSpin: WU.uSpin, uFN: WU.uFN, uFF: WU.uFF, uDis: WU.uDis } });
      const mesh = new T.Mesh(geo, m); mesh.frustumCulled = false; scene.add(mesh); walls.push(mesh);
    }
  }

  /* ---------- the points: the walls near the end of the way, broken up, turning in to become the photograph ---------- */
  const DUST_VS = `
    attribute vec3 aS, aC0, aC1; attribute vec4 aT;           // aS: the wall point (angle, z, radius); aT: the photograph's point (x, y 0..1), delay, swirl
    uniform float uQ, uSpin, uCZ, uPD, uPW, uPH, uPS;
    varying vec3 vC; varying float vA;
    void main(){
      float q = clamp((uQ - aT.z * .42) / .58, 0., 1.), e = q * q * (3. - 2. * q);
      float th = aS.x + uSpin;
      vec3 src = vec3(cos(th) * aS.z, sin(th) * aS.z, aS.y);
      vec3 tgt = vec3((aT.x - .5) * uPW, (.5 - aT.y) * uPH, uCZ - uPD);
      vec3 p = mix(src, tgt, e);
      float sw = (1. - e) * e * (2.2 + aT.w * 3.);               // a turn about the axis on the way in
      p.xy = mat2(cos(sw), sin(sw), -sin(sw), cos(sw)) * p.xy;
      vC = mix(aC0, aC1, smoothstep(.35, .95, e));
      vA = step(.0001, q);
      vec4 mv = modelViewMatrix * vec4(p, 1.);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = clamp(uPS * mix(.006, .0105, e) / -mv.z, 1., 6.);
    }`;
  const DUST_FS = `
    precision mediump float; varying vec3 vC; varying float vA;
    void main(){ if (vA < .5) discard; vec2 c = gl_PointCoord - .5; if (dot(c, c) > .25) discard; gl_FragColor = vec4(vC, 1.); }`;
  function buildDust() {
    const N = mobile ? 45000 : 130000;
    let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    // the sheets' pixels, and the photograph's
    const px = imgs.map(im => { if (!im) return null; const c = document.createElement('canvas'); c.width = 96; c.height = 136; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0, 96, 136); return x.getImageData(0, 0, 96, 136).data; });
    let pd = null, pw = 320, ph = 180;
    if (phImg) { try { const c = document.createElement('canvas'); ph = Math.round(pw * phImg.naturalHeight / phImg.naturalWidth); c.width = pw; c.height = ph; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(phImg, 0, 0, pw, ph); pd = x.getImageData(0, 0, pw, ph).data; } catch (e) { pd = null; } }
    const S = new Float32Array(N * 3), A = new Float32Array(N * 4), C0 = new Float32Array(N * 3), C1 = new Float32Array(N * 3);
    const cols = Math.round(Math.sqrt(N * pw / ph)), rows = Math.ceil(N / cols);
    const j0 = ALONG - 4;                                    // the rings round the end of the way
    for (let n = 0; n < N; n++) {
      const j = j0 + Math.floor(rnd() * 4), i = Math.floor(rnd() * AROUND), s = rnd(), t = rnd(), d = px[slotImg(j, i)] || px.find(Boolean);
      const k = (Math.min(135, Math.floor(s * 136)) * 96 + Math.min(95, Math.floor(t * 96))) * 4;
      S[n * 3] = i * 2 * Math.PI / AROUND + twist(j) + t * 2 * Math.PI / AROUND; S[n * 3 + 1] = -(j + s) * LS; S[n * 3 + 2] = R0 - .01;
      C0[n * 3] = d[k] / 255; C0[n * 3 + 1] = d[k + 1] / 255; C0[n * 3 + 2] = d[k + 2] / 255;
      const gx = (n % cols + rnd()) / cols, gy = (Math.floor(n / cols) + rnd()) / rows;
      A[n * 4] = gx; A[n * 4 + 1] = gy; A[n * 4 + 2] = rnd(); A[n * 4 + 3] = rnd();
      if (pd) { const q = (Math.min(ph - 1, Math.floor(gy * ph)) * pw + Math.min(pw - 1, Math.floor(gx * pw))) * 4; C1[n * 3] = pd[q] / 255; C1[n * 3 + 1] = pd[q + 1] / 255; C1[n * 3 + 2] = pd[q + 2] / 255; }
      else { C1[n * 3] = C0[n * 3]; C1[n * 3 + 1] = C0[n * 3 + 1]; C1[n * 3 + 2] = C0[n * 3 + 2]; }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(new Float32Array(N * 3), 3));
    g.setAttribute('aS', new T.BufferAttribute(S, 3)); g.setAttribute('aT', new T.BufferAttribute(A, 4));
    g.setAttribute('aC0', new T.BufferAttribute(C0, 3)); g.setAttribute('aC1', new T.BufferAttribute(C1, 3));
    g.boundingSphere = new T.Sphere(new T.Vector3(), 1e4);
    dustMat = new T.ShaderMaterial({ vertexShader: DUST_VS, fragmentShader: DUST_FS, depthTest: false, depthWrite: false,
      uniforms: { uQ: { value: 0 }, uSpin: WU.uSpin, uCZ: { value: 0 }, uPD: { value: 2 }, uPW: { value: 1 }, uPH: { value: 1 }, uPS: { value: 800 } } });
    dust = new T.Points(g, dustMat); dust.frustumCulled = false; dust.renderOrder = 2; scene.add(dust);
  }

  function init() {
    if (!T || built) return;
    try { R = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: false }); } catch (e) { console.warn('CM world off:', e); return; }
    R.setClearColor(0x000000, 1);
    scene = new T.Scene(); cam = new T.PerspectiveCamera(FOV, 1, .01, 100);
    buildWalls(); buildDust();
    built = true; size();
  }
  // the photograph as the points end: a plane before the camera, covering the screen as the picture does
  const PD = 2;
  function size() {
    if (!R) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    R.setPixelRatio(dpr); R.setSize(vw, vh, false);
    cam.aspect = vw / vh; cam.updateProjectionMatrix();
    if (dustMat) {
      const H = 2 * PD * Math.tan(FOV * Math.PI / 360), W = H * vw / vh, pa = opts.photoW / opts.photoH;
      const U = dustMat.uniforms; U.uPD.value = PD;
      if (vw / vh > pa) { U.uPW.value = W; U.uPH.value = W / pa; } else { U.uPH.value = H; U.uPW.value = H * pa; }
      U.uPS.value = vh / (2 * Math.tan(FOV * Math.PI / 360)) * dpr;
    }
    key = '';
  }
  function layout(w, h) { vw = w; vh = h; mobile = vw < 700; size(); }

  /* ---------- the camera ---------- */
  // close on a sheet low in the tube, looking down at it; it lifts and turns to look along the tube, the round depth
  // ahead; then on, inward; at the end it stands still while the points come to it
  const V = (x, y, z) => new T.Vector3(x, y, z);
  function camAt(u) {
    const o = eio(smt(OPEN[0], OPEN[1], u)), f = smt(FLY[0], FLY[1], u);
    const z = u < FLY[0] ? lerp(-.95, -1.6, o) : lerp(-1.6, -(LT - 4.2), f) - .5 * smt(FLY[1], DIS[1], u);
    const p = V(0, lerp(-R0 * .62, 0, o), z);
    const look = V(0, -1, 0).lerp(V(0, 0, -1), o).normalize();
    const tg = p.clone().addScaledVector(look, .02);           // the view turns in place, so the pointer never takes it through the wall
    cam.position.copy(p);
    cam.up.copy(V(0, 0, -1).lerp(V(0, 1, 0), o).normalize());
    cam.lookAt(tg);
    sway(tg, 1 - smt(DIS[0], DIS[0] + .6, u));
    return p;
  }

  /* the pointer turns the view a little, as in the Commedia (window.TAO_PTR, set by the page) */
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
    if (!built) return 1 - ph;
    if (u < -1.05 || u > END + .2) return 1 - ph;
    const k = `${u.toFixed(4)}|${vw}|${vh}` + swayEase();
    if (k === key) return 1 - ph; key = k;
    WU.uSpin.value = .32 * u;                                 // the tube turns as it is read
    const p = camAt(clamp(u, -1, END));
    WU.uFN.value = 1.2; WU.uFF.value = lerp(7.5, 6, smt(FLY[0], FLY[1], u));
    const q = smt(DIS[0], DIS[1], u);
    WU.uDis.value = smt(DIS[0], DIS[0] + .75, u);
    dustMat.uniforms.uQ.value = q; dustMat.uniforms.uCZ.value = p.z;
    walls.forEach(m => { m.visible = WU.uDis.value < .999; });
    dust.visible = q > 0;
    R.render(scene, cam);
    return 1 - ph;
  }
  return { load, layout, step, END, PHOTO: OUT1 };
};

/* Compressed Modernity, drawn in white line on black.
   Each rubbing is read as a map of its ink: the darkness traced in contour lines, a line for each depth of ink, and
   lifted so that the darker the ink the higher it stands; where the ink is heaviest, fine points of light. So the
   canopies and grasses of the rubbings become a terrain of lines, sharp at any distance.
   First, in the dark, a few drops of ink seep into the paper: slow white rings with fraying edges, one tide line
   after another. Then the scrolls: the six sheets of the work's long scroll, and six more scrolls made from the other
   rubbings in the folder, unroll from every side; the ink seeps into each as it comes off its roll, the deepest
   contours first, spreading outward to the palest. They swing in and gather beside the long scroll like petals
   closing. The camera, which began straight above, comes down, skims low across the lines, and draws back up; the
   other scrolls fade, and the long scroll is left lying exactly where the paper lies in the cover photograph, which
   takes over. A tap sends a ring across the lines, as a dragonfly touching water.
   step(u): u = screen heights of scroll since the frame pinned. Needs THREE (r128). */
window.CMStage = function (frame, opts) {
  'use strict';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smt = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const eio = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const PH0 = 4.3, PH1 = 4.75, OUT0 = 4.72, OUT1 = 5.05, END = 5.4;
  // the photograph's camera (assumed): a phone's main lens, 41° vertical on the 16:9 frame, eye height 1.5 m; the
  // horizon, where the paper's long edges meet, at .455 of the height
  const VFOV = 41, EYE = 1.5, HZ = .455;
  const OV = .12;                                            // how far one sheet overlaps the next in a scroll
  // the scrolls: the work's long scroll first, then six from the other rubbings (indices into opts.sheets)
  const SCROLLS = [[0, 1, 2, 3, 4, 5], [6, 7, 8, 9], [10, 11, 12], [13, 14, 15, 16], [17, 18, 19], [20, 21, 22], [23, 24, 25]];
  const NK = SCROLLS.length, LEN = SCROLLS.map(s => s.length - (s.length - 1) * OV);

  frame.classList.add('cm');
  const photo = document.createElement('img'); photo.className = 'ws-photo'; photo.alt = ''; photo.decoding = 'async';
  const cv = document.createElement('canvas'); cv.className = 'ws-cv'; cv.setAttribute('aria-hidden', 'true');
  frame.appendChild(photo); frame.appendChild(cv);

  let T = null, R = null, scene, cam, lineMat, ptMat, vw = 1, vh = 1, mobile = false, loaded = 0, built = false, key = '';
  let S = null, lastU = -9, clock = 0, lastT = 0, tVis0 = 0;
  const imgs = [];

  function js(src) { return new Promise((res, rej) => { const el = document.createElement('script'); el.src = src; el.onload = res; el.onerror = rej; document.head.appendChild(el); }); }
  function load() {
    if (loaded) return; loaded = 1;
    photo.src = opts.photo;
    const ims = opts.sheets.map(src => new Promise(res => { const im = new Image(); im.decoding = 'async'; im.src = src; (im.decode ? im.decode() : new Promise(r => { im.onload = r; })).then(() => res(im), () => res(null)); }));
    Promise.all([window.THREE ? 0 : js(opts.three), Promise.all(ims)]).then(([, list]) => {
      T = window.THREE; list.forEach((im, i) => imgs[i] = im);
      init(); key = '';
    }).catch(e => console.warn('CM world off:', e));
  }

  /* ---------- where the paper lies in the photograph ---------- */
  function photoBox() {
    const iw = opts.photoW, ih = opts.photoH, sc = Math.max(vw / iw, vh / ih);      // full screen, like every picture
    return { pw: iw * sc, ph: ih * sc, ox: (vw - iw * sc) / 2, oy: (vh - ih * sc) / 2 };
  }
  function strip() {
    const tv = Math.tan(VFOV * Math.PI / 360), th = tv * opts.photoW / opts.photoH, pitch = Math.atan((.5 - HZ) * 2 * tv);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const ground = ([xn, yn]) => {                          // camera at (0, EYE, 0) looking down −z, pitched down
      const dx = (xn - .5) * 2 * th, dy = -(yn - .5) * 2 * tv, dz = -1;
      const y2 = dy * cp + dz * sp, z2 = -dy * sp + dz * cp, t = -EYE / y2; return new T.Vector3(dx * t, 0, z2 * t);
    };
    const q = opts.strip.map(ground);                       // TL TR BR BL
    const D = q[1].clone().sub(q[0]).normalize();
    const v = q[3].clone().sub(q[0]), N = v.clone().sub(D.clone().multiplyScalar(v.dot(D)));
    const W = N.length(); N.normalize();
    const len = q[1].clone().sub(q[0]).dot(D), Ls = W * Math.SQRT2, s0 = Math.max(.05, (len - LEN[0] * Ls) * .5);
    const O = q[0].clone().addScaledVector(D, s0), C = O.clone().addScaledVector(D, LEN[0] * Ls / 2).addScaledVector(N, W / 2);
    return { O, D, N, W, Ls, C, pitch };
  }

  /* ---------- each scroll as a map of its ink ---------- */
  // the sheets of a scroll side by side (each turned so its long side runs along the scroll, the joins frayed), sampled
  // at nxs points to a sheet along and ny across, as ink 0..1, softened
  function inkGrid(list, nxs, ny) {
    const n = list.length, nx = Math.round((n - (n - 1) * OV) * nxs);
    const comp = document.createElement('canvas'); comp.width = nx; comp.height = ny;
    const cx = comp.getContext('2d', { willReadFrequently: true }); cx.fillStyle = '#fff'; cx.fillRect(0, 0, nx, ny);
    const tmp = document.createElement('canvas'); tmp.width = nxs; tmp.height = ny; const tx = tmp.getContext('2d', { willReadFrequently: true });
    list.forEach((si, k) => {
      const im = imgs[si]; if (!im) return;
      tx.clearRect(0, 0, nxs, ny); tx.save(); tx.translate(0, ny); tx.rotate(-Math.PI / 2);
      tx.drawImage(im, im.width * .03, im.height * .022, im.width * .94, im.height * .956, 0, 0, ny, nxs); tx.restore();
      const id = tx.getImageData(0, 0, nxs, ny), dd = id.data, f = OV * nxs;
      for (let y = 0; y < ny; y++) {
        const w = Math.sin(y / ny * 6.283 * 1.3 + k * 1.7) * .22 + Math.sin(y / ny * 6.283 * 3.1 + k * 2.9) * .14;
        for (let x = 0; x < nxs; x++) {
          let m = 1;
          if (k > 0) m *= clamp((x - f * (.5 + w)) / (f * .3) + .5, 0, 1);
          if (k < n - 1) m *= clamp((nxs - x - f * (.5 - w)) / (f * .3) + .5, 0, 1);
          dd[(y * nxs + x) * 4 + 3] *= m;
        }
      }
      tx.putImageData(id, 0, 0);
      cx.globalCompositeOperation = 'darken'; cx.drawImage(tmp, Math.round(k * (1 - OV) * nxs), 0); cx.globalCompositeOperation = 'source-over';
    });
    const d = cx.getImageData(0, 0, nx, ny).data;
    let a = new Float32Array(nx * ny), b = new Float32Array(nx * ny);
    for (let i = 0; i < nx * ny; i++) a[i] = 1 - d[i * 4] / 255;
    for (let pass = 0; pass < 2; pass++) {
      for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
        let s = 0, m = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= nx || yy >= ny) continue; s += a[yy * nx + xx]; m++; }
        b[y * nx + x] = s / m;
      }
      const t = a; a = b; b = t;
    }
    return { v: a, nx, ny };
  }
  // contour lines of the ink (marching squares), as segments in grid coordinates
  function contours(g, levels, out) {
    const { v, nx, ny } = g;
    for (const L of levels) {
      for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
        const a = v[j * nx + i], b = v[j * nx + i + 1], c = v[(j + 1) * nx + i + 1], d = v[(j + 1) * nx + i];
        const k = (a > L) | (b > L) << 1 | (c > L) << 2 | (d > L) << 3;
        if (k === 0 || k === 15) continue;
        const e0 = () => [i + (L - a) / (b - a), j], e1 = () => [i + 1, j + (L - b) / (c - b)], e2 = () => [i + (L - d) / (c - d), j + 1], e3 = () => [i, j + (L - a) / (d - a)];
        const s = (p, q) => out.push(p[0], p[1], q[0], q[1], L);
        switch (k) {
          case 1: case 14: s(e3(), e0()); break;
          case 2: case 13: s(e0(), e1()); break;
          case 3: case 12: s(e3(), e1()); break;
          case 4: case 11: s(e1(), e2()); break;
          case 6: case 9: s(e0(), e2()); break;
          case 7: case 8: s(e3(), e2()); break;
          case 5: s(e3(), e0()); s(e1(), e2()); break;
          case 10: s(e0(), e1()); s(e2(), e3()); break;
        }
      }
    }
  }

  /* ---------- one shader for all: what a vertex is decides where it goes and when it shows ----------
     position: for a scroll, (g along in sheet lengths, ink level, t across); for a drop, its centre on the ground.
     aK: scroll (or drop) index, level (for a drop, its delay), kind, a random number; aX: for drops, (angle, ring, size).
     kinds: 0 contour line, 1 point of ink, 2 the paper's edge, 3 a drop's ring, 4 a drop's thread. */
  const NOISE = `
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
      return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y); }`;
  const VS = `
    attribute vec4 aK; attribute vec3 aX;
    uniform vec4 uO[${NK}], uA[${NK}]; uniform float uL[${NK}];  // origin xz, along xz | across xz, front, length | alpha
    uniform float uLs, uW, uRel, uR0, uSeep, uDropA, uNear, uFar, uPS, uTime;
    uniform vec3 uRip[4]; uniform vec3 uHov;
    varying float vA;
    ${NOISE}
    float ripple(vec2 w){
      float h = uHov.z * .03 * exp(-dot(w - uHov.xy, w - uHov.xy) / .05);
      for (int i = 0; i < 4; i++) { float age = uTime - uRip[i].z; if (age < 0. || age > 4.) continue;
        float d = length(w - uRip[i].xy), fr = age * .9;
        h += sin((d - fr) * 22.) * exp(-age * 1.1) * exp(-abs(d - fr) * 3.) * .05; }
      return h; }
    void main(){
      float kind = aK.z, a = 1.; vec3 w;
      if (kind < 2.5) {
        int k = int(aK.x + .5); vec4 o = uO[k], ac = uA[k];
        float g = position.x, lv = position.y, t = position.z, F = ac.z, X = g * uLs, Fx = F * uLs, h = lv * uRel;
        // the ink seeping in after the paper comes off the roll: the deepest contours first, then outward to the palest
        float age = (F - g) * 1.7, q = age - (1. - lv) * .95 - noise(vec2(g * 9., t * 6.)) * .3;
        a = smoothstep(0., .12, q);
        if (kind > 1.5) a = smoothstep(-.2, .05, age);
        if (X > Fx) {                                        // still on the roll, wound in a spiral
          float len = max(1e-3, ac.w - F) * uLs, r = uR0 * (.35 + .65 * sqrt(len / (ac.w * uLs)));
          float s = X - Fx, rr = r * sqrt(max(.06, 1. - s / len)), ph = s / (.5 * (r + rr));
          X = Fx + rr * sin(ph); h = r - rr * cos(ph); a = kind > 1.5 ? .22 : .035;
        }
        vec2 xz = o.xy + o.zw * X + ac.xy * (t * uW);
        w = vec3(xz.x, h + ripple(xz), xz.y);
        a *= uL[k] * (kind < .5 ? .16 + .62 * lv : kind < 1.5 ? .7 : .38);
      } else {
        // a drop seeping into the paper: rings going out slowly, each a tide line, their edges fraying with the fibres
        float age = uSeep - aK.y, th = aX.x, ring = aX.y, R = aX.z;
        vec2 dir = vec2(cos(th), sin(th));
        float lobe = noise(dir * 1.6 + aK.x * 7.) * .7 + noise(dir * 4.1 + aK.x * 3.) * .3;
        float fr = 1. - exp(-max(age - ring * .22, 0.) * 1.1);
        float rr = R * fr * (.65 + .7 * lobe) * (1. + .07 * (noise(vec2(th * 34., ring * 3.)) - .5) + .05 * (noise(vec2(th * 110., ring * 7.)) - .5));
        if (kind > 3.5) rr *= 1. + .35 * aK.w * aK.w;       // threads run on ahead along the fibres
        vec2 xz = position.xz + dir * rr;
        w = vec3(xz.x, ripple(xz), xz.y);
        a = uDropA * step(.001, fr) * (kind < 3.5 ? mix(.55, .22, ring / 4.) : .5) * smoothstep(0., .15, fr);
      }
      vec4 mv = modelViewMatrix * vec4(w, 1.);
      float d = -mv.z;
      vA = a * (1. - smoothstep(uNear, uFar, d)) * smoothstep(.02, .08, d);
      gl_Position = projectionMatrix * mv;
      #ifdef POINTS
        gl_PointSize = clamp(uPS * (kind > 3.5 ? .004 : .006) / d, 1., 3.);
      #endif
    }`;
  const FS = `
    precision mediump float; varying float vA;
    void main(){
      #ifdef POINTS
        vec2 c = gl_PointCoord - .5; if (dot(c, c) > .25) discard;
      #endif
      gl_FragColor = vec4(vec3(.93, .93, .91) * vA, 1.); }`;

  function buildGeometry() {
    const L = { p: [], k: [], x: [] }, P = { p: [], k: [], x: [] };
    const put = (G, p, k, x) => { G.p.push(p[0], p[1], p[2]); G.k.push(k[0], k[1], k[2], k[3]); G.x.push(x ? x[0] : 0, x ? x[1] : 0, x ? x[2] : 0); };
    let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    SCROLLS.forEach((list, k) => {
      const main = k === 0, nxs = main ? (mobile ? 170 : 260) : (mobile ? 90 : 140), ny = main ? (mobile ? 120 : 184) : (mobile ? 64 : 100);
      const gr = inkGrid(list, nxs, ny), Gk = LEN[k], segs = [];
      contours(gr, main ? [.16, .28, .4, .52, .64, .76, .88] : [.2, .38, .56, .74, .9], segs);
      const gx = x => x / (gr.nx - 1) * Gk, ty = y => y / (gr.ny - 1);
      for (let i = 0; i < segs.length; i += 5) {
        const lv = segs[i + 4], r = rnd();
        put(L, [gx(segs[i]), lv, ty(segs[i + 1])], [k, lv, 0, r]); put(L, [gx(segs[i + 2]), lv, ty(segs[i + 3])], [k, lv, 0, r]);
      }
      // points of light where the ink is heaviest
      const np = Math.round(Gk * (main ? (mobile ? 700 : 1600) : (mobile ? 200 : 450)));
      for (let n = 0, tries = 0; n < np && tries < np * 40; tries++) {
        const x = rnd() * (gr.nx - 1), y = rnd() * (gr.ny - 1), v = gr.v[Math.round(y) * gr.nx + Math.round(x)];
        if (rnd() > Math.pow(v, 2.2)) continue;
        put(P, [gx(x), v * (.9 + .2 * rnd()), ty(y)], [k, v, 1, rnd()]); n++;
      }
      // the paper's edges
      const ns = Math.round(Gk * 40);
      for (const t of [0, 1]) for (let i = 0; i < ns; i++) { put(L, [i / ns * Gk, 0, t], [k, 0, 2, 0]); put(L, [(i + 1) / ns * Gk, 0, t], [k, 0, 2, 0]); }
      for (const g of [0, Gk]) { put(L, [g, 0, 0], [k, 0, 2, 0]); put(L, [g, 0, 1], [k, 0, 2, 0]); }
    });
    // the drops, round the long scroll
    const C = S.C, D = S.D, N = S.N, Ls = S.Ls, W = S.W;
    const drops = [[-1.6, .1, .55], [-.4, .7, .4], [.9, .25, .6], [2.1, .8, .35], [.2, -.5, .3], [-2.4, .9, .3], [1.7, -.3, .45]];
    drops.forEach(([along, across, Rd], di) => {
      const c = C.clone().addScaledVector(D, along * Ls * .9).addScaledVector(N, (across - .2) * W * 1.6), start = di * .18;
      const nseg = 150;
      for (let ring = 0; ring < 5; ring++) for (let i = 0; i < nseg; i++) {
        const a0 = i / nseg * 6.283, a1 = (i + 1) / nseg * 6.283;
        put(L, [c.x, 0, c.z], [di, start, 3, 0], [a0, ring, Rd]); put(L, [c.x, 0, c.z], [di, start, 3, 0], [a1, ring, Rd]);
      }
      for (let i = 0; i < 700; i++) put(P, [c.x, 0, c.z], [di, start, 4, rnd()], [rnd() * 6.283, Math.floor(rnd() * 3), Rd]);
    });
    const geo = G => {
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(G.p, 3)); g.setAttribute('aK', new T.Float32BufferAttribute(G.k, 4)); g.setAttribute('aX', new T.Float32BufferAttribute(G.x, 3));
      g.boundingSphere = new T.Sphere(new T.Vector3(), 1e6); return g;
    };
    return [geo(L), geo(P)];
  }

  let lines = null, points = null;
  function init() {
    if (!T || built) return;
    try { R = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: false }); } catch (e) { console.warn('CM world off:', e); return; }
    R.setClearColor(0x000000, 1);
    scene = new T.Scene(); cam = new T.PerspectiveCamera(VFOV, 1, .01, 200);
    const uni = () => ({ uO: { value: [...Array(NK)].map(() => new T.Vector4()) }, uA: { value: [...Array(NK)].map(() => new T.Vector4()) }, uL: { value: new Array(NK).fill(1) },
      uLs: { value: 1 }, uW: { value: 1 }, uRel: { value: .06 }, uR0: { value: .04 }, uSeep: { value: 0 }, uDropA: { value: 1 }, uNear: { value: 3 }, uFar: { value: 9 }, uPS: { value: 800 }, uTime: { value: 0 },
      uRip: { value: [0, 1, 2, 3].map(() => new T.Vector3(0, 0, -99)) }, uHov: { value: new T.Vector3() } });
    lineMat = new T.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, uniforms: uni(), transparent: true, depthTest: false, depthWrite: false, blending: T.AdditiveBlending });
    ptMat = new T.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, uniforms: uni(), transparent: true, depthTest: false, depthWrite: false, blending: T.AdditiveBlending, defines: { POINTS: 1 } });
    size();
    rebuild();
    built = true; key = '';
  }
  function rebuild() {
    if (lines) { scene.remove(lines); scene.remove(points); lines.geometry.dispose(); points.geometry.dispose(); }
    const [gl, gp] = buildGeometry();
    lines = new T.LineSegments(gl, lineMat); points = new T.Points(gp, ptMat);
    lines.frustumCulled = points.frustumCulled = false; scene.add(lines); scene.add(points);
  }
  function size() {
    if (!R) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    R.setPixelRatio(dpr); R.setSize(vw, vh, false);
    // the camera projects exactly as the photograph is shown (cover)
    const b = photoBox();
    cam.fov = VFOV; cam.aspect = b.pw / b.ph; cam.setViewOffset(b.pw, b.ph, -b.ox, -b.oy, vw, vh); cam.updateProjectionMatrix();
    S = strip();
    [lineMat, ptMat].forEach(m => { const U = m.uniforms; U.uLs.value = S.Ls; U.uW.value = S.W; U.uPS.value = b.ph / (2 * Math.tan(VFOV * Math.PI / 360)) * dpr; });
    keys = null; key = '';
  }
  function layout(w, h) {
    const m = w < 700, changed = built && m !== mobile;
    vw = w; vh = h; mobile = m; size();
    if (changed) rebuild();
  }

  /* ---------- the scrolls' places: unrolling where they lie, around the long scroll; then swinging in beside it ---------- */
  // each of the others first lies out in its own direction round the long scroll, its far end outermost, and unrolls
  // inward toward it; then turns and slides into its place alongside (positions in the long scroll's own frame:
  // along D, across N, in metres from its centre)
  const PHI = [0, 75, 255, 15, 195, 125, 305].map(d => d * Math.PI / 180);
  const PLAN = [...Array(NK)].map((_, k) => {
    if (!k) return null;
    const side = k % 2 ? 1 : -1, row = Math.ceil(k / 2);
    return { across: side * row * 1.22, along: ((k * 37) % 7 / 7 - .5) * .8, u0: .4 + k * .12, u1: 1.55 + k * .1, g0: 1.55 + k * .08 };
  });
  function place(u) {
    const D = [S.D.x, S.D.z], N = [S.N.x, S.N.z], C = [S.C.x, S.C.z], Ls = S.Ls, W = S.W, out = [];
    const world = (x, y) => [C[0] + D[0] * x + N[0] * y, C[1] + D[1] * x + N[1] * y];
    const frameOf = (cx, cy, al, Gk) => {                    // a scroll's origin and axes, from its centre and angle
      const d = [Math.cos(al), Math.sin(al)], n = [-Math.sin(al), Math.cos(al)];
      const o = world(cx - d[0] * Gk * Ls / 2 - n[0] * W / 2, cy - d[1] * Gk * Ls / 2 - n[1] * W / 2);
      return { o, d: [D[0] * d[0] + N[0] * d[1], D[1] * d[0] + N[1] * d[1]], n: [D[0] * n[0] + N[0] * n[1], D[1] * n[0] + N[1] * n[1]] };
    };
    // the long scroll, unrolling left to right where it will stay
    out.push(Object.assign(frameOf(0, 0, 0, LEN[0]), { F: LEN[0] * (.5 * (smt(.3, 2.0, u) + clamp((u - .3) / 1.7, 0, 1))), a: 1 }));
    const a0 = LEN[0] * Ls / 2 + .3, b0 = W / 2 + .35;
    for (let k = 1; k < NK; k++) {
      const p = PLAN[k], Gk = LEN[k], ph = PHI[k];
      const rin = 1 / Math.hypot(Math.cos(ph) / a0, Math.sin(ph) / b0);
      const cA = [Math.cos(ph) * (rin + Gk * Ls / 2), Math.sin(ph) * (rin + Gk * Ls / 2)], alA = ph + Math.PI;
      const cB = [p.along * Ls, p.across * W];
      let alB = Math.abs(((alA % 6.283) + 6.283) % 6.283 - Math.PI) < Math.PI / 2 ? Math.PI : 0;
      let dal = alB - alA; dal = ((dal + Math.PI) % 6.283 + 6.283) % 6.283 - Math.PI;
      const g = eio(smt(p.g0, p.g0 + 1.05, u));
      out.push(Object.assign(frameOf(lerp(cA[0], cB[0], g), lerp(cA[1], cB[1], g), alA + dal * g, Gk), { F: Gk * smt(p.u0, p.u1, u), a: 1 - smt(3.55, 4.15, u) }));
    }
    return out;
  }

  /* ---------- the camera: from straight above, down across the lines, back to the photograph ---------- */
  let keys = null;
  function makeKeys() {
    const b = photoBox(), tv = Math.tan(VFOV * Math.PI / 360) * vh / b.ph, th = tv * vw / vh;
    const C = S.C, D = S.D, N = S.N, Ls = S.Ls, W = S.W, up = new T.Vector3(0, 1, 0), far = N.clone().negate();
    const P = (al, ac, h) => C.clone().addScaledVector(D, al * Ls).addScaledVector(N, ac * W).add(new T.Vector3(0, h, 0));
    const H1 = Math.max(2.3 * Ls / th, 1.3 * W / tv), H2 = Math.max(3.4 * Ls / th, 2.6 * Ls / tv);
    const turn = far.clone().applyAxisAngle(up, .55);
    const k = (u, p, t, upv) => ({ u, p, t, up: upv || up });
    return [
      k(0, P(0, 0, H1), P(0, 0, 0), far),
      k(1.2, P(.1, 0, H2), P(.1, 0, 0), turn),
      k(2.1, P(-2.2, 4.2, H2 * .45), P(0, 0, 0)),
      k(2.75, P(-2.4, .9, .34), P(-.7, .2, 0)),
      k(3.3, P(-.2, -.35, .2), P(1.6, .4, 0)),
      k(3.8, P(.6, 4.5, 2.4), P(.2, 0, 0)),
      k(PH1 - .05, new T.Vector3(0, EYE, 0), new T.Vector3(0, EYE - Math.tan(S.pitch) * 10, -10)),
    ];
  }
  const cr = (p0, p1, p2, p3, t) => { const t2 = t * t, t3 = t2 * t; return .5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3); };
  const crv = (a, b, c, d, t) => new T.Vector3(cr(a.x, b.x, c.x, d.x, t), cr(a.y, b.y, c.y, d.y, t), cr(a.z, b.z, c.z, d.z, t));
  function camAt(u) {
    if (!keys) keys = makeKeys();
    const K = keys, n = K.length;
    let i = 0; while (i < n - 2 && u > K[i + 1].u) i++;
    const a = K[Math.max(0, i - 1)], b = K[i], c = K[i + 1], d = K[Math.min(n - 1, i + 2)];
    const t = eio(clamp((u - b.u) / (c.u - b.u), 0, 1));
    const p = crv(a.p, b.p, c.p, d.p, t), tg = crv(a.t, b.t, c.t, d.t, t);
    if (p.y < .05) p.y = .05;
    cam.position.copy(p); cam.up.copy(b.up.clone().lerp(c.up, t).normalize()); cam.lookAt(tg);
    return p;
  }

  /* ---------- the hand: a touch sends a ring across the lines ---------- */
  const rips = []; let hov = null, hovA = 0;
  const ray = (e) => {
    if (!built || lastU < -1 || lastU > OUT0) return null;
    const r = frame.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return null;
    const v = new T.Vector3(x * 2 - 1, 1 - y * 2, .5).unproject(cam).sub(cam.position).normalize();
    if (v.y > -1e-3) return null;
    const t = -cam.position.y / v.y; return [cam.position.x + v.x * t, cam.position.z + v.z * t];
  };
  addEventListener('pointermove', e => { hov = ray(e); }, { passive: true });
  addEventListener('pointerdown', e => { const p = ray(e); if (p) { rips.push([p[0], p[1], clock]); if (rips.length > 4) rips.shift(); } }, { passive: true });

  function step(u) {
    if (u > -1.8) load();
    lastU = u;
    const ph = smt(PH0, PH1, u), out = smt(OUT0, OUT1, u);
    photo.style.opacity = ph.toFixed(3);
    cv.style.opacity = (1 - out).toFixed(3);
    if (!built || u < -1.05 || u > END + .2) { lastT = 0; if (u < -1.05) tVis0 = 0; return 1 - ph; }
    const now = performance.now(), dt = lastT ? Math.min(.05, (now - lastT) / 1000) : .016; lastT = now; clock += dt;
    if (!tVis0) tVis0 = clock;
    const live = rips.some(r => clock - r[2] < 4) || hovA > .01 || u < 1.6;
    const k0 = `${u.toFixed(4)}|${vw}|${vh}` + (live ? '|' + Math.floor(now / 33) : '');
    if (k0 === key) return 1 - ph; key = k0;
    hovA = lerp(hovA, hov ? 1 : 0, .08);
    const pl = place(u), p = camAt(clamp(u, 0, END));
    const hgt = Math.max(.05, p.y);
    [lineMat, ptMat].forEach(m => {
      const U = m.uniforms;
      pl.forEach((s, k) => { U.uO.value[k].set(s.o[0], s.o[1], s.d[0], s.d[1]); U.uA.value[k].set(s.n[0], s.n[1], s.F, LEN[k]); U.uL.value[k] = s.a; });
      U.uSeep.value = 2.4 * smt(-1, 1.0, u) + .5 * (1 - Math.exp(-(clock - tVis0) / 25));
      U.uDropA.value = smt(-1, -.6, u) * (1 - smt(.8, 1.6, u));
      const open = smt(3.7, 4.45, u);
      U.uNear.value = lerp(Math.max(1.2, hgt * 1.6), 40, open); U.uFar.value = lerp(Math.max(4.5, hgt * 3.4), 80, open);
      U.uTime.value = clock;
      rips.forEach((r, i) => U.uRip.value[i].set(r[0], r[1], r[2]));
      if (hov) U.uHov.value.set(hov[0], hov[1], hovA); else U.uHov.value.z = hovA;
    });
    R.render(scene, cam);
    return 1 - ph;
  }
  return { load, layout, step, END, PHOTO: OUT1 };
};

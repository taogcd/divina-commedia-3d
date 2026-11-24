/* Compressed Modernity: a world made from the work's own rubbings. First ink: random blooms open in the white and drift
   in toward the middle. Then the scroll: six of the traced black-and-white sheets joined into one long scroll, as the
   work is, lying rolled at its left end; it unrolls to the right, under the ink, and the ink seeps into the paper as it
   comes off the roll, the heaviest first, spreading with an uneven wet edge until it settles into the drawing. The
   paper's ink then stands as high as it is dark, so the canopies and grasses of the rubbings rise into an ink
   landscape, raked by a low light, with mist in its hollows and distance. The camera looks straight down as the scroll
   opens, follows it, sinks and skims the land, then draws back to where the cover photograph was taken: the world was
   the scroll of paper on the grass all along, laid exactly where the paper lies in the picture, and the picture takes
   over.
   step(u): u = screen heights of scroll since the frame pinned. Needs THREE (r128). */
window.CMStage = function (frame, opts) {
  'use strict';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smt = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const eio = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const U0 = .3, U1 = 3.3;                                  // the scroll unrolls between these (u)
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
    const Ls = W * Math.SQRT2, s0 = Math.max(.1, (len - G * Ls) * .5);
    return { O: q[0], D, N, W, Ls, s0, pitch, len };
  }
  const P = (a, c, h) => S.O.clone().addScaledVector(S.D, a).addScaledVector(S.N, c).add(new T.Vector3(0, h, 0));

  /* ---------- the land: one long scroll, its ink standing as high as it is dark ----------
     The six rubbings are joined into one long scroll, as the work is: each overlaps the next by OV of its length, the
     joins feathered and multiplied, so one drawing runs into the next. It lies rolled at its left end and unrolls to the
     right. The paper comes off the roll blank; the ink then seeps into it from behind the roll, the heaviest ink first,
     as a soft wet bloom with an uneven edge that settles into the drawing; and only then does the drawing rise into an
     ink landscape, raked by a low light, mist in its hollows and distance. */
  const OV = .12, G = NS - (NS - 1) * OV;                    // the scroll's length, in sheet lengths
  function heights(src, nx, nt) {
    const c = document.createElement('canvas'); c.width = nx; c.height = nt;
    const x = c.getContext('2d'); x.drawImage(src, 0, 0, nx, nt);
    const d = x.getImageData(0, 0, nx, nt).data, n = nx * nt, dk = new Float32Array(n);
    for (let i = 0; i < n; i++) dk[i] = 1 - d[i * 4] / 255;
    let a = dk, b = new Float32Array(n);
    for (let pass = 0; pass < 3; pass++) {                   // softened: canopies are hills, not needles
      for (let j = 0; j < nt; j++) for (let i = 0; i < nx; i++) {
        let sum = 0, m = 0;
        for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) { const jj = j + dj, ii = i + di; if (jj < 0 || ii < 0 || jj >= nt || ii >= nx) continue; sum += a[jj * nx + ii]; m++; }
        b[j * nx + i] = sum / m;
      }
      const t = a === dk ? new Float32Array(n) : a; a = b; b = t;
    }
    return a;
  }
  let atlas = null;
  function build() {
    // the scroll as one long drawing (along = x, across = y; the top of the canvas is the far edge, t = 1)
    const SW = mobile ? 512 : 1024, AH = Math.round(SW * 2480 / 3507), CW = Math.round(G * SW);
    const comp = document.createElement('canvas'); comp.width = CW; comp.height = AH;
    const cx = comp.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, CW, AH);
    const tmp = document.createElement('canvas'); tmp.width = SW; tmp.height = AH; const tx = tmp.getContext('2d');
    imgs.forEach((im, k) => {
      if (!im) return;
      tx.globalCompositeOperation = 'source-over'; tx.clearRect(0, 0, SW, AH);
      tx.save(); tx.translate(0, AH); tx.rotate(-Math.PI / 2);   // the scan's margins and paper edges trimmed off
      tx.drawImage(im, im.width * .03, im.height * .022, im.width * .94, im.height * .956, 0, 0, AH, SW); tx.restore();
      // the joins: not a straight cut but a wandering, fibrous edge, as one sheet's ink runs into the next
      const id = tx.getImageData(0, 0, SW, AH), dd = id.data, ph = [k * 1.7 + .3, k * 2.9 + 1.1, k * 4.3 + 2.2];
      const edge = (y, side) => { const v = y / AH * 6.283; return OV * SW * (.5 + .22 * Math.sin(v * 1.3 + ph[0] + side) + .14 * Math.sin(v * 3.1 + ph[1] - side) + .07 * Math.sin(v * 7.7 + ph[2])); };
      const fw = OV * SW * .22;
      for (let y = 0; y < AH; y++) {
        const eL = edge(y, 0), eR = SW - edge(y, 2.1);
        for (let x = 0; x < SW; x++) {
          let m = 1;
          if (k > 0 && x < eL + fw) m *= clamp((x - eL + fw) / (2 * fw) + (Math.random() - .5) * .35, 0, 1);
          if (k < NS - 1 && x > eR - fw) m *= clamp((eR + fw - x) / (2 * fw) + (Math.random() - .5) * .35, 0, 1);
          if (m < 1) dd[(y * SW + x) * 4 + 3] *= m;
        }
      }
      tx.putImageData(id, 0, 0);
      cx.globalCompositeOperation = 'darken'; cx.drawImage(tmp, Math.round(k * (1 - OV) * SW), 0);   // the ink of both, where they overlap
    });
    cx.globalCompositeOperation = 'source-over';
    // the atlas: the long drawing cut in two, one half above the other (power-of-two, so it can blur by mipmap)
    const AX = mobile ? 2048 : 4096, AY = mobile ? 512 : 1024, ac = document.createElement('canvas'); ac.width = AX; ac.height = AY;
    const ax = ac.getContext('2d'); ax.imageSmoothingQuality = 'high';
    ax.drawImage(comp, 0, 0, CW / 2, AH, 0, 0, AX, AY / 2); ax.drawImage(comp, CW / 2, 0, CW / 2, AH, 0, AY / 2, AX, AY / 2);
    if (atlas) atlas.dispose();
    atlas = new T.CanvasTexture(ac); atlas.anisotropy = 4; atlas.minFilter = T.LinearMipmapLinearFilter; atlas.generateMipmaps = true;
    // one grid along the whole scroll
    const nx = Math.round(G * (mobile ? 110 : 190)) + 1, nt = mobile ? 90 : 150, hm = heights(comp, nx, nt);
    const P = [], Gr = [], idx = [];
    for (let j = 0; j < nt; j++) for (let i = 0; i < nx; i++) {
      const h = hm[j * nx + i];
      const gs = (hm[j * nx + Math.min(nx - 1, i + 1)] - hm[j * nx + Math.max(0, i - 1)]) * (nx - 1) / (2 * G);
      const gt = -(hm[Math.min(nt - 1, j + 1) * nx + i] - hm[Math.max(0, j - 1) * nx + i]) * (nt - 1) / 2;
      P.push(i / (nx - 1) * G, 1 - j / (nt - 1), h, 0); Gr.push(gs, gt);
    }
    for (let j = 0; j < nt - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + nx; idx.push(a, a + 1, b, a + 1, b + 1, b); }
    const g = new T.BufferGeometry();
    g.setAttribute('aP', new T.Float32BufferAttribute(P, 4));
    g.setAttribute('aG', new T.Float32BufferAttribute(Gr, 2));
    g.setAttribute('position', new T.Float32BufferAttribute(new Float32Array(nx * nt * 3), 3));
    g.setIndex(nx * nt > 65535 ? new T.Uint32BufferAttribute(idx, 1) : new T.Uint16BufferAttribute(idx, 1));
    g.boundingSphere = new T.Sphere(new T.Vector3(), 1e6);
    return g;
  }
  const NOISE = `
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
      return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y); }
    float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 5; i++) { s += a * noise(p); p = p * 2.03 + 17.1; a *= .5; } return s; }`;
  const VS = `
    attribute vec4 aP; attribute vec2 aG;
    uniform vec3 uO, uD, uN; uniform float uLs, uW, uS0, uF, uFR, uG, uR0, uRel;
    varying vec2 vUv; varying vec3 vNrm; varying vec3 vW; varying float vDist, vRoll, vG, vT;
    void main(){
      float g = aP.x, t = aP.y, X = g * uLs, Fx = uF * uLs;
      float rise = smoothstep(.35, 1.7, uFR - g);            // the drawing rises once its ink has settled
      vec3 nL = normalize(vec3(-aG.x * uRel * rise / uLs, 1., -aG.y * uRel * rise / uW));   // (along, up, across)
      float h; vRoll = 0.;
      if (X <= Fx) h = aP.z * uRel * rise;
      else {
        // still on the roll: wound in a spiral, the paper nearest the front outermost
        float rem = max(1e-4, (uG - uF) * uLs), r = uR0 * (.3 + .7 * sqrt(rem / (uG * uLs)));
        float a = X - Fx, rr = r * sqrt(max(.06, 1. - a / rem)), ph = a / (.5 * (r + rr));
        X = Fx + rr * sin(ph); h = r - rr * cos(ph);
        nL = vec3(sin(ph), -cos(ph), 0.);
        vRoll = 1.;
      }
      vec3 w = uO + uD * (uS0 + X) + uN * (t * uW) + vec3(0., h, 0.);
      vNrm = normalize(uD * nL.x + vec3(0., nL.y, 0.) + uN * nL.z);
      float px = g / uG, row = step(.5, px);
      vUv = vec2((px - .5 * row) * 2., (t + 1. - row) * .5);
      vG = g; vT = t; vW = w;
      vec4 mv = modelViewMatrix * vec4(w, 1.);
      vDist = -mv.z;
      gl_Position = projectionMatrix * mv;
    }`;
  const FS = `
    precision highp float;
    uniform sampler2D uTex; uniform vec3 uSun; uniform float uFogN, uFogF, uMist, uMistH, uA, uFR;
    varying vec2 vUv; varying vec3 vNrm; varying vec3 vW; varying float vDist, vRoll, vG, vT;
    ${NOISE}
    void main(){
      float inkS = 1. - texture2D(uTex, vUv).r, inkB = 1. - texture2D(uTex, vUv, 3.2).r;
      // the ink seeping in: how long ago this paper came off the roll, against an uneven front that follows the fibres
      float n = fbm(vec2(vG * 7.5, vT * 5.2)), fib = noise(vec2(vG * 150., vT * 24.)), fib2 = noise(vec2(vG * 40., vT * 70.));
      float q = (uFR - vG) * 2. - n * .9 - (1. - inkB) * .75 + .2;
      float wet = smoothstep(-.22, .22, q + (fib - .5) * .22 + (fib2 - .5) * .1);   // the wet front, feathered
      float set = smoothstep(.2, 1.15, q);                                         // and the drawing settling out of it
      float ink = mix(inkB * 1.3, inkS, set) * wet;
      ink += inkB * .4 * (smoothstep(-.06, .04, q) - smoothstep(.04, .22, q));     // the tide line the front leaves
      ink = clamp(ink, 0., 1.);
      vec3 paper = vec3(.972, .966, .952), inkC = vec3(.075, .075, .08);
      vec3 nn = normalize(vNrm); if (dot(nn, cameraPosition - vW) < 0.) nn = -nn;   // the side the eye sees
      float lit = .62 + .5 * max(dot(nn, uSun), 0.) - .1 * vRoll;
      vec3 c = mix(paper, inkC, pow(ink, 1.15)) * lit;
      // mist: in the distance, and lying low in the hollows
      float f = smoothstep(uFogN, uFogF, vDist);
      float m = uMist * (1. - smoothstep(0., uMistH, vW.y)) * smoothstep(uFogN * .25, uFogF * .7, vDist);
      c = mix(c, paper, clamp(max(f, m), 0., 1.));
      gl_FragColor = vec4(c, uA);
    }`;
  /* ---------- before the scroll: ink. Random blooms of ink open out of the white and drift in toward the middle, where
     the scroll will run; as the scroll unrolls beneath them they thin away into it. Each bloom is a wash with a
     darker core and the tide line ink leaves on xuan paper, its outline worked by slow currents. ---------- */
  let inkScene = null, inkCam = null, inkMat = null;
  function buildInk() {
    inkScene = new T.Scene(); inkCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    inkMat = new T.ShaderMaterial({ transparent: true, depthTest: false, depthWrite: false,
      uniforms: { uP: { value: 0 }, uTime: { value: 0 }, uAsp: { value: 1 }, uFade: { value: 1 }, uBand: { value: .5 }, uFront: { value: -1 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
      fragmentShader: `precision highp float; uniform float uP, uTime, uAsp, uFade, uBand, uFront; varying vec2 vUv;
        ${NOISE}
        void main(){
          vec2 q = vec2((vUv.x - .5) * uAsp, vUv.y - uBand);
          float tm = uTime * .03;
          vec2 w = q + .07 * (vec2(fbm(q * 1.8 + vec2(tm, 0.)), fbm(q * 1.8 + vec2(7.3, -tm))) - .5);
          float nA = fbm(w * 3.1 + vec2(0., tm)), nB = fbm(w * 3.4 + 31.7 - vec2(tm, 0.));
          float fine = fbm(w * 13. + 5.), fib = noise(vec2(w.x * 90., w.y * 23.)) * .6 + noise(vec2(w.x * 25., w.y * 85.)) * .4;
          float keep = 1.;                                   // what the ink leaves on the white, 1 = nothing
          for (int i = 0; i < 12; i++) {
            float fi = float(i) + 1., h1 = hash(vec2(fi, 1.3)), h2 = hash(vec2(fi, 2.1)), h3 = hash(vec2(fi, 4.4));
            float h4 = hash(vec2(fi, 9.1)), h5 = hash(vec2(fi, 6.6)), h6 = hash(vec2(fi, 7.7));
            float an = h1 * 6.283, rr = .75 + .5 * h2;
            vec2 s = vec2(cos(an) * max(uAsp, 1.) * .58 * rr, sin(an) * .6 * rr);
            vec2 e = vec2(mix(-.3, .48, hash(vec2(fi, 3.7))) * max(uAsp, .7), (hash(vec2(fi, 5.9)) - .5) * .18);
            float t0 = hash(vec2(fi, 8.2)) * .42, p = smoothstep(t0, t0 + .58, uP);
            vec2 c = mix(s, e, p * p * (3. - 2. * p));
            float r = (i < 10 ? .055 + .09 * h3 : .02 + .02 * h3) * (.2 + 1.25 * p) * smoothstep(t0 - .01, t0 + .05, uP);
            // each bloom its own lean and stretch, its own petalled, fraying outline
            float ca = cos(h4 * 3.14), sa = sin(h4 * 3.14);
            vec2 dv = w - c; dv = vec2(ca * dv.x + sa * dv.y, -sa * dv.x + ca * dv.y); dv.x /= 1. + 1.1 * h5;
            vec2 lc = dv / max(r, 1e-3); float nn = mix(nA, nB, h2);
            float lob = noise(lc * 1.3 + fi * 3.1) * .62 + noise(lc * 3.4 + fi * 7.3) * .38;   // lobes in its own frame
            float ed = length(lc) + (nn - .5) * 1.1 + (lob - .5) * .85 + (fine - .5) * .3;
            float body = smoothstep(1.03, .88, ed + (fib - .5) * .2);                     // feathered into the fibres
            // a fresh drop is dense at its heart; a spread wash is pale inside, the ink gathered at its rim
            float fresh = step(.5, h6);
            float tone = mix(mix(.18, .38, smoothstep(.95, .2, ed)), mix(.3, .9, smoothstep(.95, .1, ed)), fresh) * (.7 + .45 * fine);
            tone += (.12 + .2 * (1. - fresh)) * (smoothstep(.78, .9, ed) - smoothstep(.9, 1., ed)) * step(float(i), 9.5);
            keep *= 1. - clamp(tone, 0., 1.) * body;
          }
          float a = 1. - keep;
          // drunk in by the paper where the scroll has already passed under it, and gone at last
          float drink = smoothstep(uFront + .07, uFront - .08, vUv.x) * 1.25 + (1. - uFade) * 1.25 - (nA - .5) * .5 - (fine - .5) * .3;
          a *= 1. - smoothstep(.15, .65, drink);
          gl_FragColor = vec4(vec3(.05, .05, .055), clamp(a, 0., 1.));
        }` });
    const quad = new T.Mesh(new T.PlaneGeometry(2, 2), inkMat); quad.frustumCulled = false; inkScene.add(quad);
  }
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
        void main(){ vec2 c = gl_PointCoord - .5; if (dot(c, c) > .25) discard; gl_FragColor = vec4(.2, .2, .2, vA * uA); }` });
    motes = new T.Points(g, moteMat); motes.frustumCulled = false; scene.add(motes);
  }

  function init() {
    if (!T || built) return;
    try { R = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, premultipliedAlpha: false }); } catch (e) { console.warn('CM world off:', e); return; }
    R.setClearColor(0xffffff, 0);
    scene = new T.Scene(); cam = new T.PerspectiveCamera(VFOV, 1, .002, 200);
    mat = new T.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, transparent: true, side: T.DoubleSide,
      uniforms: { uO: { value: new T.Vector3() }, uD: { value: new T.Vector3() }, uN: { value: new T.Vector3() }, uLs: { value: 1 }, uW: { value: 1 }, uS0: { value: 0 },
        uF: { value: 0 }, uFR: { value: 0 }, uG: { value: G }, uR0: { value: .045 }, uRel: { value: .035 }, uTex: { value: null }, uSun: { value: new T.Vector3(.35, .55, -.76).normalize() },
        uFogN: { value: 1 }, uFogF: { value: 2 }, uMist: { value: 0 }, uMistH: { value: .012 }, uA: { value: 1 } } });
    buildInk();
    built = true; size();
    pts = new T.Mesh(build(), mat); pts.frustumCulled = false; scene.add(pts); mat.uniforms.uTex.value = atlas;
    buildMotes(); size();
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
    if (moteMat) { const M = moteMat.uniforms; M.uO.value.copy(S.O); M.uD.value.copy(S.D); M.uN.value.copy(S.N); M.uLen.value = S.Ls * G; M.uW.value = S.W; M.uS0.value = S.s0;
      M.uScale.value = b.ph / (2 * Math.tan(VFOV * Math.PI / 360)) * dpr; }
    if (inkMat) inkMat.uniforms.uAsp.value = vw / vh;
    keys = null; key = '';
  }
  function layout(w, h) {
    vw = w; vh = h; const m = vw < 700;
    if (built && m !== mobile) { mobile = m; scene.remove(pts); pts.geometry.dispose(); pts = new T.Mesh(build(), mat); pts.frustumCulled = false; scene.add(pts); mat.uniforms.uTex.value = atlas; }
    mobile = m; size(); key = '';
  }

  /* ---------- the camera: straight down as the scroll opens, following it; down into the land; back to the photograph ---------- */
  const front = u => { const t = clamp((u - U0) / (U1 - U0), 0, 1); return G * .5 * (t + t * t * (3 - 2 * t)); };   // the roll's place (sheet lengths)
  let keys = null;
  function makeKeys() {
    const b = photoBox(), tv = Math.tan(VFOV * Math.PI / 360) * vh / b.ph, th = tv * vw / vh;
    const L = S.Ls, W = S.W, s0 = S.s0, up = new T.Vector3(0, 1, 0), far = S.N.clone().negate();
    const span = clamp(vw / vh * 1.9, 1.15, 3.4), H0 = Math.max(span * L / (2 * th), W / (2 * .45 * tv)), c0 = span / 2 - .06;
    const k = (u, pa, ta, upv) => ({ u, p: P(s0 + pa[0] * L, pa[1] * W, pa[2]), t: P(s0 + ta[0] * L, ta[1] * W, ta[2]), up: upv || up });
    const F = front, fin = { u: PH1 - .05, p: new T.Vector3(0, EYE, 0), t: new T.Vector3(0, EYE - Math.tan(S.pitch) * 10, -10), up };
    return [
      k(0, [c0, .5, H0], [c0, .5, 0], far),
      k(1.0, [Math.max(c0, F(1.0) - span * .3), .5, H0 * .94], [Math.max(c0, F(1.0) - span * .3), .5, 0], far),
      k(1.7, [F(1.7) - 1.1, 1.2, .34], [F(1.7) - .2, .45, 0]),
      k(2.4, [F(2.4) - 1.1, 1.0, .16], [F(2.4) - .3, .45, 0]),
      k(3.0, [F(3.0) - 1.15, .05, .1], [F(3.0) - .45, .55, 0]),
      k(3.45, [G - 1.1, .75, .09], [G - .3, .4, 0]),
      k(3.9, [G * .55, 2.9, 1.0], [G * .48, .5, 0]),
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
    const inkFade = 1 - smt(1.0, 1.5, u), now = performance.now();
    const k = `${u.toFixed(4)}|${vw}|${vh}` + (inkFade > 0 ? '|' + Math.floor(now / 33) : '');
    if (k === key) return; key = k;
    const U = mat.uniforms, F = front(u);
    U.uF.value = F; U.uFR.value = F + 1.9 * smt(3.0, 4.1, u);
    const p = camAt(clamp(u, 0, END));
    // fog: close in over the land, gone when the camera stands back where the photograph was taken
    const hgt = Math.max(.02, p.y), back = smt(3.5, 4.3, u);
    U.uFogN.value = lerp(Math.max(.3, hgt * 3.2), 30, back); U.uFogF.value = lerp(Math.max(1.3, hgt * 12), 60, back);
    U.uMist.value = .85 * smt(1.6, 2.4, u) * (1 - back); U.uMistH.value = .014;
    U.uRel.value = .035 * (1 - smt(3.9, 4.6, u) * .85);
    if (moteMat) { moteMat.uniforms.uT.value = u * 2.2; moteMat.uniforms.uA.value = smt(1.5, 2.2, u) * (1 - back); }
    R.autoClear = false; R.clear();
    R.render(scene, cam);
    if (inkFade > 0) {                                       // the ink, over everything, until the paper has taken it
      const I = inkMat.uniforms; I.uP.value = smt(-.9, .45, u); I.uTime.value = now / 1000; I.uFade.value = inkFade;
      const fp = P(S.s0 + F * S.Ls, .5 * S.W, 0).project(cam), bp = P(S.s0 + F * S.Ls, .5 * S.W, 0).project(cam);
      I.uFront.value = F > .001 ? (fp.x + 1) / 2 : -1; I.uBand.value = (bp.y + 1) / 2;
      R.render(inkScene, inkCam);
    }
  }
  return { load, layout, step, END, PHOTO: OUT1 };
};

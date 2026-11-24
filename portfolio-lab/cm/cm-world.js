/* Compressed Modernity: ink, then the drawing in it, then the paper in the photograph.
   The frame is a live surface of ink and water (a small fluid simulation). Ink pours in from every side as the work
   comes into view, and left alone it goes on curling, joining and parting. The cursor stirs it; a tap lands like a
   dragonfly on water, a ring goes out and the ink is pushed apart. Scrolling, the moving ink slowly finds the forms of
   the scroll, the six rubbings joined into one long scroll as the work is, until it settles into the drawing, filling
   the screen. Scrolling on reads along the scroll as a handscroll is read, close enough at first to see the grain of
   the ink and the fibres of the paper, a low light raking across so the rubbing's relief and texture show, drawing
   back as it goes. At the end the whole scroll gathers out of the full screen and settles, in perspective, exactly
   where the paper lies in the cover photograph, and the photograph takes over. No paper is modelled: the drawing is
   mapped by one perspective (a homography) that moves from the full screen to the paper's place in the picture.
   step(u): u = screen heights of scroll since the frame pinned. Needs THREE (r128). */
window.CMStage = function (frame, opts) {
  'use strict';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smt = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const eio = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  // the timeline (u)
  const RES0 = .15, RES1 = 1.35;                             // the ink finds the drawing
  const PAN0 = .9, PAN1 = 3.5;                               // reading along the scroll
  const FIN0 = 3.35, FIN1 = 4.3;                             // the scroll settles into the photograph's paper
  const PH0 = 4.25, PH1 = 4.7, OUT0 = 4.65, OUT1 = 5.0, END = 5.35;
  // the photograph's camera (assumed): a phone's main lens, 41° vertical on the 16:9 frame, eye height 1.5 m; the
  // horizon, where the paper's long edges meet, at .455 of the height
  const VFOV = 41, EYE = 1.5, HZ = .455;

  frame.classList.add('cm');
  const photo = document.createElement('img'); photo.className = 'ws-photo'; photo.alt = ''; photo.decoding = 'async';
  const cv = document.createElement('canvas'); cv.className = 'ws-cv'; cv.setAttribute('aria-hidden', 'true');
  frame.appendChild(photo); frame.appendChild(cv);

  let T = null, R = null, vw = 1, vh = 1, mobile = false, loaded = 0, built = false, lastU = -9, lastT = 0, clock = 0, tVis0 = 0;
  const imgs = [], NS = opts.sheets.length, OV = .12, G = NS - (NS - 1) * OV;   // the scroll's length, in sheet lengths

  function js(src) { return new Promise((res, rej) => { const el = document.createElement('script'); el.src = src; el.onload = res; el.onerror = rej; document.head.appendChild(el); }); }
  function load() {
    if (loaded) return; loaded = 1;
    photo.src = opts.photo;
    const ims = opts.sheets.map(s => new Promise(res => { const im = new Image(); im.decoding = 'async'; im.src = vw >= 700 && s.hi ? s.hi : s.src; (im.decode ? im.decode() : new Promise(r => { im.onload = r; })).then(() => res(im), () => res(null)); }));
    Promise.all([window.THREE ? 0 : js(opts.three), Promise.all(ims)]).then(([, list]) => {
      T = window.THREE; list.forEach((im, i) => imgs[i] = im);
      init();
    }).catch(e => console.warn('CM world off:', e));
  }

  /* ---------- where the paper lies in the photograph ---------- */
  function photoBox() {
    const iw = opts.photoW, ih = opts.photoH, sc = Math.max(vw / iw, vh / ih);      // full screen, like every picture
    return { pw: iw * sc, ph: ih * sc, ox: (vw - iw * sc) / 2, oy: (vh - ih * sc) / 2 };
  }
  // the scroll's four corners on the screen when it lies on the grass as in the photograph: the paper's quad found on
  // the ground plane, the scroll centred along it at its true length, projected back through the photograph's camera
  function photoCorners() {
    const tv = Math.tan(VFOV * Math.PI / 360), th = tv * opts.photoW / opts.photoH, pitch = Math.atan((.5 - HZ) * 2 * tv);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const ground = ([xn, yn]) => {
      const dx = (xn - .5) * 2 * th, dy = -(yn - .5) * 2 * tv, dz = -1;
      const y2 = dy * cp + dz * sp, z2 = -dy * sp + dz * cp, t = -EYE / y2; return [dx * t, z2 * t];
    };
    const proj = ([x, z]) => {
      const wy = -EYE, dy = wy * cp - z * sp, dz = wy * sp + z * cp, k = -1 / dz;
      return [.5 + x * k / (2 * th), .5 - dy * k / (2 * tv)];
    };
    const q = opts.strip.map(ground);                       // TL TR BR BL, on the ground (x, z)
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1]], dot = (a, b) => a[0] * b[0] + a[1] * b[1], len = a => Math.hypot(a[0], a[1]);
    const D0 = sub(q[1], q[0]), D = [D0[0] / len(D0), D0[1] / len(D0)];
    const v = sub(q[3], q[0]), Nv = [v[0] - D[0] * dot(v, D), v[1] - D[1] * dot(v, D)], W = len(Nv), N = [Nv[0] / W, Nv[1] / W];
    const L = dot(D0, D), Ls = W * Math.SQRT2, s0 = Math.max(.05, (L - G * Ls) / 2);
    const at = (g, t) => proj([q[0][0] + D[0] * (s0 + g * Ls) + N[0] * t * W, q[0][1] + D[1] * (s0 + g * Ls) + N[1] * t * W]);
    const b = photoBox();
    return [at(0, 0), at(G, 0), at(G, 1), at(0, 1)].map(([x, y]) => [b.ox + x * b.pw, b.oy + y * b.ph]);
  }
  // a homography taking the scroll (s = g/G, t, both 0..1) to a quad on the screen (px), and its inverse
  function sq2quad(c) {
    const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = c;
    const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2, sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3;
    let g = 0, h = 0;
    if (Math.abs(sx) > 1e-9 || Math.abs(sy) > 1e-9) { const den = dx1 * dy2 - dx2 * dy1; g = (sx * dy2 - dx2 * sy) / den; h = (dx1 * sy - sx * dy1) / den; }
    return [x1 - x0 + g * x1, x3 - x0 + h * x3, x0, y1 - y0 + g * y1, y3 - y0 + h * y3, y0, g, h, 1];
  }
  function inv3(m) {
    const [a, b, c, d, e, f, g, h, i] = m, A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g, det = a * A + b * B + c * C;
    return [A / det, -(b * i - c * h) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, -(a * f - c * d) / det, C / det, -(a * h - b * g) / det, (a * e - b * d) / det];
  }

  /* ---------- the scroll as one long drawing, in three sharp pieces ---------- */
  const NC = 3; let texs = [], CWr = 3;
  function buildScroll() {
    const SW = mobile ? 1024 : 2048, AH = Math.round(SW * 2480 / 3507), CW = Math.round(G * SW), CWc = Math.ceil(CW / NC);
    CWr = CW / CWc;
    const chunks = [...Array(NC)].map(() => { const c = document.createElement('canvas'); c.width = CWc; c.height = AH; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, CWc, AH); return c; });
    const tmp = document.createElement('canvas'); tmp.width = SW; tmp.height = AH; const tx = tmp.getContext('2d');
    imgs.forEach((im, k) => {
      if (!im) return;
      tx.globalCompositeOperation = 'source-over'; tx.clearRect(0, 0, SW, AH);
      tx.save(); tx.translate(0, AH); tx.rotate(-Math.PI / 2);   // the scan's margins and paper edges trimmed off
      tx.drawImage(im, im.width * .03, im.height * .022, im.width * .94, im.height * .956, 0, 0, AH, SW); tx.restore();
      // the joins: not a straight cut but a wandering, fibrous edge, as one sheet's ink runs into the next
      const ph = [k * 1.7 + .3, k * 2.9 + 1.1, k * 4.3 + 2.2], fw = OV * SW * .22;
      const edge = (y, side) => { const v = y / AH * 6.283; return OV * SW * (.5 + .22 * Math.sin(v * 1.3 + ph[0] + side) + .14 * Math.sin(v * 3.1 + ph[1] - side) + .07 * Math.sin(v * 7.7 + ph[2])); };
      const zone = Math.ceil(OV * SW * 1.2);
      const fray = (x0, side) => {
        const id = tx.getImageData(x0, 0, zone, AH), dd = id.data;
        for (let y = 0; y < AH; y++) {
          const e = side ? SW - edge(y, 2.1) : edge(y, 0);
          for (let i = 0; i < zone; i++) {
            const x = x0 + i, m = side ? (e + fw - x) / (2 * fw) : (x - e + fw) / (2 * fw);
            const mm = clamp(m + (Math.random() - .5) * .35, 0, 1);
            if (mm < 1) dd[(y * zone + i) * 4 + 3] *= mm;
          }
        }
        tx.putImageData(id, x0, 0);
      };
      if (k > 0) fray(0, 0);
      if (k < NS - 1) fray(SW - zone, 1);
      const x0 = Math.round(k * (1 - OV) * SW);
      chunks.forEach((c, ci) => {
        const ox = x0 - ci * CWc; if (ox > CWc || ox + SW < 0) return;
        const cx = c.getContext('2d'); cx.globalCompositeOperation = 'darken'; cx.drawImage(tmp, ox, 0); cx.globalCompositeOperation = 'source-over';
      });
    });
    texs.forEach(t => t.dispose());
    const an = R.capabilities.getMaxAnisotropy();
    texs = chunks.map(c => { const t = new T.CanvasTexture(c); t.anisotropy = Math.min(16, an); t.minFilter = T.LinearMipmapLinearFilter; t.generateMipmaps = true; return t; });
  }

  /* ---------- shaders ---------- */
  const NOISE = `
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
      return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y); }`;
  // the drawing at a point of the scroll (s = g/G, t), as ink (0 paper .. 1 black); b: a mip bias, to blur it
  const DRAW = `
    uniform sampler2D uTex0, uTex1, uTex2; uniform float uCW; uniform mat3 uHi; uniform vec2 uRes;
    vec2 toScroll(vec2 px){ vec3 h = uHi * vec3(px, 1.); return h.xy / h.z; }
    float drawInk(vec2 st, float b){
      if (st.x < 0. || st.x > 1. || st.y < 0. || st.y > 1.) return 0.;
      float px = st.x * uCW, ch = min(floor(px), ${NC - 1}.); vec2 uv = vec2(px - ch, 1. - st.y);
      float v = ch < .5 ? texture2D(uTex0, uv, b).r : ch < 1.5 ? texture2D(uTex1, uv, b).r : texture2D(uTex2, uv, b).r;
      return 1. - v; }`;
  const BASE_VS = `
    varying vec2 vUv, vL, vR, vT, vB; uniform vec2 uTx;
    void main(){ vUv = uv; vL = vUv - vec2(uTx.x, 0.); vR = vUv + vec2(uTx.x, 0.); vT = vUv + vec2(0., uTx.y); vB = vUv - vec2(0., uTx.y);
      gl_Position = vec4(position.xy, 0., 1.); }`;
  const FS = {
    // a gaussian splat; mode 1 pushes outward from its centre (a drop landing)
    splat: `uniform sampler2D uSrc; uniform float uAsp, uRad, uMode; uniform vec3 uCol; uniform vec2 uPt; varying vec2 vUv;
      void main(){ vec2 p = vUv - uPt; p.x *= uAsp; float g = exp(-dot(p, p) / uRad);
        vec3 add = uMode < .5 ? uCol : vec3(normalize(p + 1e-6) * uCol.x * (1. - g), 0.) * 1.6;
        vec3 base = texture2D(uSrc, vUv).xyz; gl_FragColor = vec4(base + add * g, 1.); }`,
    curl: `uniform sampler2D uV; varying vec2 vUv, vL, vR, vT, vB;
      void main(){ float L = texture2D(uV, vL).y, R = texture2D(uV, vR).y, T = texture2D(uV, vT).x, B = texture2D(uV, vB).x;
        gl_FragColor = vec4(.5 * (R - L - T + B), 0., 0., 1.); }`,
    // vorticity confinement, and a slow current of its own so the ink never quite stops
    vort: `uniform sampler2D uV, uC; uniform float uCurl, uDt, uTime, uFlow; varying vec2 vUv, vL, vR, vT, vB;
      ${NOISE}
      float pot(vec2 q){ return noise(q) + .5 * noise(q * 2.3 + 4.1); }
      void main(){ float L = texture2D(uC, vL).x, R = texture2D(uC, vR).x, T = texture2D(uC, vT).x, B = texture2D(uC, vB).x, C = texture2D(uC, vUv).x;
        vec2 f = .5 * vec2(abs(T) - abs(B), abs(R) - abs(L)); f /= length(f) + 1e-4; f *= uCurl * C; f.y *= -1.;
        vec2 q = vUv * 2.6 + vec2(uTime * .021, -uTime * .017); float n0 = pot(q);
        vec2 cn = vec2(pot(q + vec2(0., .01)) - n0, -(pot(q + vec2(.01, 0.)) - n0)) / .01;
        vec2 v = texture2D(uV, vUv).xy + (f + cn * uFlow) * uDt;
        gl_FragColor = vec4(clamp(v, -1000., 1000.), 0., 1.); }`,
    div: `uniform sampler2D uV; varying vec2 vUv, vL, vR, vT, vB;
      void main(){ float L = texture2D(uV, vL).x, R = texture2D(uV, vR).x, T = texture2D(uV, vT).y, B = texture2D(uV, vB).y; vec2 C = texture2D(uV, vUv).xy;
        if (vL.x < 0.) L = -C.x; if (vR.x > 1.) R = -C.x; if (vT.y > 1.) T = -C.y; if (vB.y < 0.) B = -C.y;
        gl_FragColor = vec4(.5 * (R - L + T - B), 0., 0., 1.); }`,
    clear: `uniform sampler2D uP; uniform float uK; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(uP, vUv).x * uK, 0., 0., 1.); }`,
    press: `uniform sampler2D uP, uD; varying vec2 vUv, vL, vR, vT, vB;
      void main(){ float L = texture2D(uP, vL).x, R = texture2D(uP, vR).x, T = texture2D(uP, vT).x, B = texture2D(uP, vB).x, d = texture2D(uD, vUv).x;
        gl_FragColor = vec4((L + R + B + T - d) * .25, 0., 0., 1.); }`,
    grad: `uniform sampler2D uP, uV; varying vec2 vUv, vL, vR, vT, vB;
      void main(){ float L = texture2D(uP, vL).x, R = texture2D(uP, vR).x, T = texture2D(uP, vT).x, B = texture2D(uP, vB).x;
        vec2 v = texture2D(uV, vUv).xy - vec2(R - L, T - B); gl_FragColor = vec4(v, 0., 1.); }`,
    advect: `uniform sampler2D uV, uSrc; uniform vec2 uVTx; uniform float uDt, uDis; varying vec2 vUv;
      void main(){ vec2 c = vUv - uDt * texture2D(uV, vUv).xy * uVTx; gl_FragColor = vec4(texture2D(uSrc, c).xyz / (1. + uDis * uDt), 1.); }`,
    // the ink: carried by the water, fading a little, and drawn toward the scroll's drawing as the page is read
    dye: `uniform sampler2D uV, uSrc; uniform vec2 uVTx; uniform float uDt, uDis, uRelax; varying vec2 vUv;
      ${DRAW}
      void main(){ vec2 c = vUv - uDt * texture2D(uV, vUv).xy * uVTx;
        float d = texture2D(uSrc, c).x / (1. + uDis * uDt);
        if (uRelax > 0.) { float tg = drawInk(toScroll(vec2(vUv.x, 1. - vUv.y) * uRes), 1.5) * 1.25; d = mix(d, tg, 1. - exp(-uRelax * uDt)); }
        gl_FragColor = vec4(min(d, 2.4), 0., 0., 1.); }`,
    // what is seen: ink on xuan paper; where the drawing has settled, the drawing itself at full resolution, its relief
    // raked by a low light; rings where the surface has been touched
    show: `uniform sampler2D uDye, uV; uniform vec2 uDTx; uniform float uSettle, uRelief, uLa, uTime, uFlowBend, uZ;
      uniform vec3 uRip[4];
      varying vec2 vUv;
      ${NOISE}
      ${DRAW}
      void main(){
        vec2 px = vec2(vUv.x, 1. - vUv.y) * uRes, uv = vUv;
        for (int i = 0; i < 4; i++) {                         // a dragonfly's touch: rings going out on the water
          float age = uTime - uRip[i].z; if (age < 0. || age > 3.) continue;
          vec2 dp = px - uRip[i].xy; float d = length(dp) / uRes.y, fr = age * .32;
          float w = sin((d - fr) * 95.) * exp(-age * 1.4) * exp(-abs(d - fr) * 22.) * .0045;
          vec2 dn = dp / max(length(dp), 1.);
          px += dn * w * uRes.y; uv += vec2(dn.x, -dn.y) * w * uRes.y / uRes;
        }
        vec2 vel = texture2D(uV, uv).xy;
        float dye = texture2D(uDye, uv).x;
        float dl = texture2D(uDye, uv - vec2(uDTx.x, 0.)).x, dr = texture2D(uDye, uv + vec2(uDTx.x, 0.)).x;
        float du = texture2D(uDye, uv + vec2(0., uDTx.y)).x, db = texture2D(uDye, uv - vec2(0., uDTx.y)).x;
        float edge = length(vec2(dr - dl, du - db));
        // the ink as water carries it: dense where it gathers, a darker tide line where it meets the white
        float inkF = 1. - exp(-dye * 1.35);
        inkF = clamp(inkF + smoothstep(.04, .2, edge) * .18 * inkF + smoothstep(.02, .3, dye) * (noise(uv * uRes / 3.) - .5) * .08, 0., 1.);
        // the drawing, bent by the water where it still moves
        vec2 bend = vec2(vel.x, -vel.y) * uFlowBend;
        vec2 st = toScroll(px - bend);
        float ink = inkF;
        if (uSettle > .001) {
          float inkS = drawInk(st, 0.), inkL = drawInk(st, 2.2) * 1.25;
          ink = mix(inkF, inkS, uSettle * (1. - smoothstep(.07, .4, abs(dye - inkL))));
        }
        // the relief: the drawing's darkness as height, a low light raking across it
        float shade = 1.;
        if (uRelief > .001) {
          vec2 sx = toScroll(px + vec2(2., 0.) - bend), sy = toScroll(px + vec2(0., 2.) - bend);
          float h0 = drawInk(st, 2.5), hx = drawInk(sx, 2.5), hy = drawInk(sy, 2.5);
          vec3 n = normalize(vec3(-(hx - h0) * 9. * uZ, (hy - h0) * 9. * uZ, 1.));
          vec3 L = normalize(vec3(cos(uLa), sin(uLa), .42));
          shade = 1. + uRelief * (dot(n, L) - L.z) * 1.1;
        }
        // xuan paper: its fibres in the white, the ink settling grainy in them
        vec2 fp = uSettle > .01 ? vec2(st.x * 2600., st.y * 380.) : px * vec2(.9, .25);
        float fib = noise(fp) * .55 + noise(fp * vec2(.31, 2.7) + 3.) * .45;
        vec3 paper = vec3(.975, .969, .955) * (1. + (fib - .5) * .05);
        ink = clamp(ink * (1. + (fib - .5) * .18), 0., 1.);
        vec3 col = mix(paper, vec3(.065, .065, .07), pow(ink, 1.1)) * shade;
        gl_FragColor = vec4(col, 1.);
      }`,
  };

  /* ---------- the fluid ---------- */
  let qScene, qCam, quad, M = {}, vel, dye, prs, divT, curlT, simW = 128, simH = 128, dyeW = 512, dyeH = 512, ftype;
  function rt(w, h) {
    return new T.WebGLRenderTarget(w, h, { type: ftype, format: T.RGBAFormat, minFilter: T.LinearFilter, magFilter: T.LinearFilter, depthBuffer: false, stencilBuffer: false, wrapS: T.ClampToEdgeWrapping, wrapT: T.ClampToEdgeWrapping });
  }
  const dbl = (w, h) => { const o = { r: rt(w, h), w: rt(w, h), swap() { const t = o.r; o.r = o.w; o.w = t; } }; return o; };
  function sizes() {
    const asp = vw / vh, res = (r) => asp >= 1 ? [Math.round(r * asp), r] : [r, Math.round(r / asp)];
    [simW, simH] = res(mobile ? 96 : 128); [dyeW, dyeH] = res(mobile ? 512 : 900);
    [vel, dye, prs].forEach(o => { if (o) { o.r.dispose(); o.w.dispose(); } }); [divT, curlT].forEach(o => o && o.dispose());
    vel = dbl(simW, simH); dye = dbl(dyeW, dyeH); prs = dbl(simW, simH); divT = rt(simW, simH); curlT = rt(simW, simH);
    [vel.r, vel.w, dye.r, dye.w, prs.r, prs.w, divT, curlT].forEach(t => { R.setRenderTarget(t); R.clear(); });
    R.setRenderTarget(null);
  }
  function mat(fs, extra) {
    return new T.ShaderMaterial({ vertexShader: BASE_VS, fragmentShader: fs, depthTest: false, depthWrite: false,
      uniforms: Object.assign({ uTx: { value: new T.Vector2() } }, extra) });
  }
  const drawUni = () => ({ uTex0: { value: null }, uTex1: { value: null }, uTex2: { value: null }, uCW: { value: 3 }, uHi: { value: new T.Matrix3() }, uRes: { value: new T.Vector2(1, 1) } });
  function setTex() { [M.dye, M.show].forEach(m => { const U = m.uniforms; U.uTex0.value = texs[0]; U.uTex1.value = texs[1]; U.uTex2.value = texs[2]; U.uCW.value = CWr; }); }
  function init() {
    if (!T || built) return;
    try { R = new T.WebGLRenderer({ canvas: cv, antialias: false, alpha: false }); } catch (e) { console.warn('CM world off:', e); return; }
    R.autoClear = false; R.setClearColor(0x000000, 0);
    ftype = (R.capabilities.isWebGL2 || R.extensions.get('OES_texture_half_float')) ? T.HalfFloatType : T.FloatType;
    qScene = new T.Scene(); qCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    quad = new T.Mesh(new T.PlaneGeometry(2, 2)); quad.frustumCulled = false; qScene.add(quad);
    const u = v => ({ value: v });
    M.splat = mat(FS.splat, { uSrc: u(null), uAsp: u(1), uRad: u(.001), uMode: u(0), uCol: u(new T.Vector3()), uPt: u(new T.Vector2()) });
    M.curl = mat(FS.curl, { uV: u(null) });
    M.vort = mat(FS.vort, { uV: u(null), uC: u(null), uCurl: u(20), uDt: u(.016), uTime: u(0), uFlow: u(0) });
    M.div = mat(FS.div, { uV: u(null) });
    M.clear = mat(FS.clear, { uP: u(null), uK: u(.8) });
    M.press = mat(FS.press, { uP: u(null), uD: u(null) });
    M.grad = mat(FS.grad, { uP: u(null), uV: u(null) });
    M.advect = mat(FS.advect, { uV: u(null), uSrc: u(null), uVTx: u(new T.Vector2()), uDt: u(.016), uDis: u(.2) });
    M.dye = mat(FS.dye, Object.assign({ uV: u(null), uSrc: u(null), uVTx: u(new T.Vector2()), uDt: u(.016), uDis: u(.1), uRelax: u(0) }, drawUni()));
    M.show = mat(FS.show, Object.assign({ uDye: u(null), uV: u(null), uDTx: u(new T.Vector2()), uSettle: u(0), uRelief: u(0), uLa: u(2.4), uTime: u(0), uFlowBend: u(0), uZ: u(1),
      uRip: u([new T.Vector3(0, 0, -9), new T.Vector3(0, 0, -9), new T.Vector3(0, 0, -9), new T.Vector3(0, 0, -9)]) }, drawUni()));
    buildScroll(); setTex();
    built = true; size();
  }
  function pass(m, target, tx) {
    m.uniforms.uTx.value.set(1 / tx[0], 1 / tx[1]);
    quad.material = m; R.setRenderTarget(target); R.render(qScene, qCam);
  }
  function splat(target, x, y, col, rad, mode, wh) {
    const U = M.splat.uniforms;
    U.uSrc.value = target.r.texture; U.uAsp.value = vw / vh; U.uRad.value = rad; U.uMode.value = mode || 0;
    U.uCol.value.set(col[0], col[1], col[2]); U.uPt.value.set(x, y);
    pass(M.splat, target.w, wh); target.swap();
  }
  function size() {
    if (!R) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    R.setPixelRatio(dpr); R.setSize(vw, vh, false);
    if (built) sizes();
  }
  function layout(w, h) {
    const m = w < 700, changed = built && m !== mobile;
    vw = w; vh = h; mobile = m;
    if (changed) { buildScroll(); setTex(); }
    size();
  }

  /* ---------- the hand: stirring, and a touch like a dragonfly's ---------- */
  const touches = [], rips = [];
  let ptr = null;
  const inFrame = (e) => { const r = frame.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height; return x >= 0 && x <= 1 && y >= 0 && y <= 1 ? [x, 1 - y, e.clientX - r.left, e.clientY - r.top] : null; };
  const live = () => built && lastU > -1 && lastU < OUT0;
  addEventListener('pointermove', e => {
    if (!live()) { ptr = null; return; }
    const p = inFrame(e); if (!p) { ptr = null; return; }
    if (ptr) touches.push({ k: 'move', x: p[0], y: p[1], dx: p[0] - ptr[0], dy: p[1] - ptr[1] });
    ptr = p;
  }, { passive: true });
  addEventListener('pointerdown', e => {
    if (!live()) return; const p = inFrame(e); if (!p) return;
    touches.push({ k: 'drop', x: p[0], y: p[1] }); rips.push([p[2], p[3], clock]); if (rips.length > 4) rips.shift();
  }, { passive: true });

  /* ---------- ink pouring in from every side ---------- */
  let seed = 23; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const SRC = [...Array(9)].map((_, i) => ({ a: i / 9 + rnd() * .08, sp: (rnd() - .5) * .03, w: .6 + rnd() * 1.4, ph: rnd() * 6.28, f: .35 + rnd() * .5 }));
  function pour(dt, amt) {
    const asp = vw / vh;
    SRC.forEach(s => {
      const gush = Math.max(0, Math.sin(clock * s.f + s.ph)) ** 2 * .75 + .25;
      const a = ((s.a + clock * s.sp) % 1 + 1) % 1, k = a * 4, side = Math.floor(k), f = k - side;
      const [x, y] = side === 0 ? [f, 1.02] : side === 1 ? [1.02, 1 - f] : side === 2 ? [1 - f, -.02] : [-.02, f];
      let dx = .5 - x, dy = .5 - y; const l = Math.hypot(dx * asp, dy) || 1, sw = Math.sin(clock * .7 + s.ph) * .55;
      dx /= l; dy /= l; const cx = dx * Math.cos(sw) - dy * Math.sin(sw), cy = dx * Math.sin(sw) + dy * Math.cos(sw);
      const sp = 260 * s.w * gush * amt;
      splat(vel, x, y, [cx * sp, cy * sp, 0], .0028 * s.w, 0, [simW, simH]);
      splat(dye, x, y, [2.6 * gush * amt * dt * 8, 0, 0], .0035 * s.w, 0, [dyeW, dyeH]);
    });
  }

  function step(u) {
    if (u > -1.8) load();
    lastU = u;
    const ph = smt(PH0, PH1, u), out = smt(OUT0, OUT1, u);
    photo.style.opacity = ph.toFixed(3);
    cv.style.opacity = (1 - out).toFixed(3);
    if (!built || u < -1.05 || u > END + .2) { lastT = 0; if (u < -1.05) tVis0 = 0; return; }
    const now = performance.now(), dt = lastT ? Math.min(1 / 30, (now - lastT) / 1000) : 1 / 60; lastT = now; clock += dt;

    // the scroll's place on the screen: a window reading along it, then gathering into the photograph
    const settle = smt(RES0, RES1, u), pan = smt(PAN0, PAN1, u), fin = eio(smt(FIN0, FIN1, u));
    const Z = lerp(2.5, 1.12, pan), pg = vh * Z * Math.SQRT2, half = vw / (2 * pg), gc = lerp(half + .05, G - half - .05, pan);
    const tc = lerp(.36, .5, pan), xg = g => vw / 2 + (g - gc) * pg, yt = t => vh / 2 + (t - tc) * vh * Z;
    const win = [[xg(0), yt(0)], [xg(G), yt(0)], [xg(G), yt(1)], [xg(0), yt(1)]];
    const fc = fin > 0 ? photoCorners() : win, C = win.map((p, i) => [lerp(p[0], fc[i][0], fin), lerp(p[1], fc[i][1], fin)]);
    const Hi = inv3(sq2quad(C));
    [M.dye, M.show].forEach(m => { m.uniforms.uHi.value.set(...Hi); m.uniforms.uRes.value.set(vw, vh); });

    // the hand
    while (touches.length) {
      const t = touches.shift();
      if (t.k === 'move') {
        splat(vel, t.x, t.y, [t.dx * 5200, t.dy * 5200, 0], .0016, 0, [simW, simH]);
        splat(vel, t.x, t.y, [Math.min(140, Math.hypot(t.dx, t.dy) * 9000), 0, 0], .0012, 1, [simW, simH]);
      } else splat(vel, t.x, t.y, [520, 0, 0], .0035, 1, [simW, simH]);
    }
    // the pour: strongest as the work arrives, quietening as the drawing settles, never quite stopping before it
    if (u > -1 && !tVis0) tVis0 = clock;
    const amt = smt(-1, -.55, u) * (1 - settle) * (.35 + .65 * (1 - smt(-.3, .5, u))) * (.3 + .7 * Math.exp(-(clock - tVis0) / 7));
    if (amt > .002) pour(dt, amt);

    // the water
    const vt = [simW, simH], dtx = [dyeW, dyeH];
    M.curl.uniforms.uV.value = vel.r.texture; pass(M.curl, curlT, vt);
    const V = M.vort.uniforms; V.uV.value = vel.r.texture; V.uC.value = curlT.texture; V.uCurl.value = lerp(28, 8, settle); V.uDt.value = dt; V.uTime.value = clock; V.uFlow.value = lerp(9, 1.5, settle);
    pass(M.vort, vel.w, vt); vel.swap();
    M.div.uniforms.uV.value = vel.r.texture; pass(M.div, divT, vt);
    M.clear.uniforms.uP.value = prs.r.texture; pass(M.clear, prs.w, vt); prs.swap();
    M.press.uniforms.uD.value = divT.texture;
    for (let i = 0; i < (mobile ? 14 : 20); i++) { M.press.uniforms.uP.value = prs.r.texture; pass(M.press, prs.w, vt); prs.swap(); }
    M.grad.uniforms.uP.value = prs.r.texture; M.grad.uniforms.uV.value = vel.r.texture; pass(M.grad, vel.w, vt); vel.swap();
    const A = M.advect.uniforms; A.uV.value = vel.r.texture; A.uSrc.value = vel.r.texture; A.uVTx.value.set(1 / simW, 1 / simH); A.uDt.value = dt; A.uDis.value = lerp(.25, 2.2, settle);
    pass(M.advect, vel.w, vt); vel.swap();
    const D = M.dye.uniforms; D.uV.value = vel.r.texture; D.uSrc.value = dye.r.texture; D.uVTx.value.set(1 / simW, 1 / simH); D.uDt.value = dt;
    D.uDis.value = lerp(.16, 0, settle); D.uRelax.value = settle * settle * 7;
    pass(M.dye, dye.w, dtx); dye.swap();

    // what is seen
    const S = M.show.uniforms;
    S.uDye.value = dye.r.texture; S.uV.value = vel.r.texture; S.uDTx.value.set(1 / dyeW, 1 / dyeH);
    S.uSettle.value = settle; S.uRelief.value = smt(.9, 1.9, u) * (1 - smt(FIN0, FIN1 - .2, u)) * .9; S.uLa.value = 2.3 + u * .55; S.uZ.value = Z;
    S.uTime.value = clock; S.uFlowBend.value = .045 * settle;
    rips.forEach((r, i) => S.uRip.value[i].set(r[0], r[1], r[2]));
    R.setRenderTarget(null); quad.material = M.show; M.show.uniforms.uTx.value.set(1 / vw, 1 / vh); R.render(qScene, qCam);
  }
  return { load, layout, step, END, PHOTO: OUT1 };
};

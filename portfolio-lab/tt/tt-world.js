/* TIMETABLE RESOLUTION STUDY, drawn in light on black: how one table is set again and again.
   The 1928 scan of Table 13 (after Kinross) is cut into its seven fields: title, table number, page, service,
   stations, time matrix, footnotes. The fields move, still as scan, into the 8 grid (4 × 2 fields), are typeset
   there as the modern print, then move into the 20 grid (5 × 4) and the 32 grid (8 × 4); each layout is the work's
   own picture, cut at the fields' own rects.
   The page then opens into the reader's 3D Grid System, in its own composition: the drawing's one-point space is
   built for real (front frame 1.1–98.9 × 2.6–97.2 % of the page, back rect at 0.18 of it, so the eye at 50.4 ×
   57.2 %), and every glyph of the title, every station text, every time and every grid line the reader draws is cast
   from that eye onto its wall, floor or ceiling, so that seen from the eye the space is the drawing. Title and
   stations swing onto the walls like doors, the matrix falls back onto the floor, a ghost of it rises to the
   ceiling, the service goes to the end wall.
   Then Space Walk, as the work builds it: the open field between two tall walls of type (the titles left, the
   stations right, each a 3 × 3 atlas of the work's own outlines, wilder with depth), the ground of times, the trench
   that descends at 0.175 into the roofed tunnel with the times on its ceiling; its views (open field, tunnel
   entrance, inside the tunnel) are the camera's stops. Its tunnel is 8 × 5.6 = the page, so it is laid on the page's
   frame at 1 : 8 / 1.369.
   step(u): u = screen heights of scroll since the frame pinned. Needs THREE (r128) and window.TT_DATA. */
window.TTStage = function (frame, opts) {
  'use strict';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smt = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const eio = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const D_ = window.TT_DATA;

  // timeline (u)
  const IN = [0, .3], PARSE = [.42, 1.0], MOVES = { s8: [1.08, 1.88], g8: [1.96, 2.6], g20: [2.7, 3.45], g32: [3.55, 4.3] };
  const FOLD = [4.42, 5.75], SPACE = [6.05, 6.85], ENTER = [6.9, 7.45], DESC = [7.5, 8.5], OUT = [8.42, 8.68], PH = [8.62, 9.1], END = 9.4;
  const SEQ = ['s0', 's8', 'g8', 'g20', 'g32'];
  const A = 1.4, XL = -A / 2 + .011 * A, XR = A / 2 - .011 * A, YT = .5 - .026, YB = .5 - .972, YC = (YT + YB) / 2;
  const WC = XR - XL, HC = YT - YB, EX = -A / 2 + .504 * A, EY = .5 - .572, KB = .18, DEP = 7.2, DE = DEP * KB / (1 - KB);
  // Space Walk (its own units): tunnel 8 wide, 5.6 high, falling 0.175, roofed from 34; outer walls at ±7, 64 high
  const SW = { w: 8, h: 5.6, sl: .175, rs: 34, ow: 7, eye: 1.68, zf: 40, zb: -150 }, SK = WC / SW.w, SLL = Math.hypot(1, SW.sl);
  const GRIDS = {
    g8: { x: [25, 25.75, 50, 50.75, 75, 75.75], y: [50, 50.75] },
    g20: { x: [20, 20.85, 40, 40.85, 60, 60.85, 80, 80.85], y: [25, 25.85, 50, 50.85, 75, 75.85] },
    g32: { x: [1, 2, 3, 4, 5, 6, 7].flatMap(k => [12.5 * k, 12.5 * k + .55]), y: [1, 2, 3].flatMap(k => [25 * k, 25 * k + .65]) },
  };
  const CAP = [
    [0, PARSE[1] + .06, '01', 'Source: Table 13, the 1928 timetable in Kinross, “The rhetoric of neutrality”', 'Source: Table 13, 1928 (Kinross)'],
    [MOVES.s8[0], MOVES.s8[1] + .06, '02', 'Grid 8: the scan cut into its fields and re-set on 4 × 2', 'Grid 8: the scan re-set on 4 × 2'],
    [MOVES.g8[0], MOVES.g8[1] + .08, '03', 'Modern print: the same fields, typeset again', 'Modern print: typeset again'],
    [MOVES.g20[0], MOVES.g20[1] + .08, '04', 'Grid 20: 5 × 4 fields'],
    [MOVES.g32[0], MOVES.g32[1] + .1, '05', 'Grid 32: 8 × 4 fields'],
    [FOLD[0], SPACE[0] + .2, '06', '3D Grid System: the page opened into one-point space', '3D Grid System'],
    [SPACE[0] + .15, ENTER[1], '07', 'Space Walk: the open field, the tunnel entrance', 'Space Walk: open field'],
    [DESC[0], DESC[1], '08', 'Space Walk: the descending tunnel', 'Space Walk: the tunnel'],
  ];

  frame.classList.add('tt');
  const cv = document.createElement('canvas'); cv.className = 'ws-cv'; cv.setAttribute('aria-hidden', 'true');
  const photo = document.createElement('img'); photo.className = 'ws-photo'; photo.alt = ''; photo.decoding = 'async';
  const ov = document.createElement('canvas'); ov.className = 'ws-cv'; ov.setAttribute('aria-hidden', 'true');
  frame.appendChild(cv); frame.appendChild(photo); frame.appendChild(ov);
  const ox = ov.getContext('2d');
  let T = null, R = null, scene, cam, vw = 1, vh = 1, dpr = 1, mobile = false, loaded = 0, key = '', built = false, font = '', fsz = 12;
  let maxOK = true, nC = { x: 0, y: 0 }, hp = 1, pageS = { l: 0, t: 0 }, dF = 2.5, P11F = 3.73, G0 = { headBottom: 60, m: 20 };
  const TX = {}, BL = [], LN = {};
  let g3 = null, g3L = null, swG = null, swN = null, ready3 = false, NOTE = null;

  function js(src) { return new Promise((res, rej) => { const el = document.createElement('script'); el.src = src; el.onload = res; el.onerror = rej; document.head.appendChild(el); }); }
  function fonts() {
    if (!document.querySelector('link[href*="tvm5ist"]')) {
      const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://use.typekit.net/tvm5ist.css'; document.head.appendChild(l);
    }
    const want = ['400 64px "league-gothic"', '700 64px "superclarendon"', '800 64px "superclarendon"', '700 64px "clarendon-text-pro"'];
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const tryAll = () => Promise.all(want.map(f => document.fonts.load(f, 'LIVERPOOL 10 46').catch(() => [])));
    // the kit's stylesheet may still be on its way: ask again until the faces are known, at most a few seconds
    return (async () => { for (let i = 0; i < 12; i++) { const r = await tryAll(); if (r.every(x => x && x.length)) return; await wait(350); } })();
  }
  function load() {
    if (loaded) return; loaded = 1;
    photo.src = opts.photo;
    (window.THREE ? Promise.resolve() : js(opts.three)).then(() => { T = window.THREE; init(); key = ''; }).catch(e => console.warn('TIMETABLE world off:', e));
  }

  /* ---------- shaders. The page, its fields, the 3D grid: ink (light) on black, laid over each other by max, so a field
     and its page, or two pictures crossing, never add up. Space Walk: opaque surfaces with depth, drawn first. ---------- */
  const FOG = `uniform float uF0, uF1; varying float vD;`;
  const FOGF = `(1. - smoothstep(uF0, uF1, vD) * .9)`;
  const BVS = `varying vec2 vUv; varying float vD;
    void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.); vD = length(mv.xyz); gl_Position = projectionMatrix * mv; }`;
  const BFS = `uniform sampler2D tA, tB; uniform vec4 rA, rB; uniform float uM, uA; uniform vec3 uC; varying vec2 vUv; ${FOG}
    float ink(sampler2D t, vec4 r){ vec2 p = r.xy + vUv * r.zw; if (p.x < 0. || p.y < 0. || p.x > 1. || p.y > 1.) return 0.; return texture2D(t, p).r; }
    void main(){
      float a = uM < .001 ? ink(tA, rA) : uM > .999 ? ink(tB, rB) : mix(ink(tA, rA), ink(tB, rB), uM);
      gl_FragColor = vec4(uC * a * uA * ${FOGF}, 1.);
    }`;
  // lines that draw themselves: aT runs 0 → 1 along each line, aD staggers them
  const LVS = `attribute float aT, aD; uniform float uDraw; varying float vT, vP, vD;
    void main(){ vT = aT; vP = clamp((uDraw * 1.5 - aD) / .5, 0., 1.); vec4 mv = modelViewMatrix * vec4(position, 1.); vD = length(mv.xyz); gl_Position = projectionMatrix * mv; }`;
  const LFS = `uniform float uA; uniform vec3 uC; varying float vT, vP; ${FOG}
    void main(){ if (vT > vP + .0001 || vP <= 0.) discard; gl_FragColor = vec4(uC * uA * ${FOGF}, 1.); }`;
  // the 3D grid: each face comes in from the mouth to the back (uR per face against the vertex's depth aZ); anything the
  // reader's drawing lets spill past a face is cut at the corridor's walls, as the drawing cuts it at the face's edges
  const GVS = `attribute float aI, aZ, aF; uniform vec4 uR; uniform float uR4; varying vec2 vUv; varying float vA, vD; varying vec3 vW;
    void main(){ vUv = uv; float r = aF < .5 ? uR.x : aF < 1.5 ? uR.y : aF < 2.5 ? uR.z : aF < 3.5 ? uR.w : uR4;
      vA = aI * smoothstep(aZ - .06, aZ + .001, r * 1.08); vW = position;
      vec4 mv = modelViewMatrix * vec4(position, 1.); vD = length(mv.xyz); gl_Position = projectionMatrix * mv; }`;
  const GFS = `uniform sampler2D tA; uniform float uA; uniform vec3 uC, uB0, uB1; varying vec2 vUv; varying float vA; varying vec3 vW; ${FOG}
    void main(){ if (any(lessThan(vW, uB0)) || any(greaterThan(vW, uB1))) discard;
      gl_FragColor = vec4(uC * texture2D(tA, vUv).r * vA * uA * ${FOGF}, 1.); }`;
  const GLVS = `attribute float aI, aZ; uniform float uExt; varying float vA, vZ, vD; varying vec3 vW;
    void main(){ vA = aI; vZ = aZ; vW = position; vec4 mv = modelViewMatrix * vec4(position, 1.); vD = length(mv.xyz); gl_Position = projectionMatrix * mv; }`;
  const GLFS = `uniform float uA, uExt; uniform vec3 uC, uB0, uB1; varying float vA, vZ; varying vec3 vW; ${FOG}
    void main(){ if (vZ > uExt * 1.04 || any(lessThan(vW, uB0)) || any(greaterThan(vW, uB1))) discard; gl_FragColor = vec4(uC * vA * uA * ${FOGF}, 1.); }`;
  // Space Walk's surfaces (its own units in position; fog as the work's, 44 → 88 of its units, to black instead of white)
  const SVS = `varying vec2 vUv; varying float vH, vD;
    void main(){ vUv = uv; vH = position.y; vec4 mv = modelViewMatrix * vec4(position, 1.); vD = length(mv.xyz); gl_Position = projectionMatrix * mv; }`;
  const SFOG = `uniform float uA, uF0, uF1, uRise; uniform vec3 uC; varying vec2 vUv; varying float vH, vD;
    float fogK(){ return clamp((uF1 - vD) / (uF1 - uF0), 0., 1.); }`;
  // the walls: in each 12 × 12 cell one of the atlas's three columns at random, its row by depth (wilder further in);
  // the outer walls fade out upwards (as the work's fade to white)
  const SWALL = `uniform sampler2D map; uniform float uHf; ${SFOG}
    void main(){
      if (vH > uRise) discard;
      vec2 cell = floor(vUv); float depth = abs(cell.x) * 12.;
      float dis = clamp(floor(max(depth - 12., 0.) / 48.), 0., 2.);
      float pick = floor(fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453) * 3.);
      vec2 local = clamp(fract(vUv), vec2(.0025), vec2(.9975)); vec2 at = (vec2(pick, 2. - dis) + local) / 3.;
      #ifdef WGL2
      float ink = textureGrad(map, at, dFdx(vUv) / 3., dFdy(vUv) / 3.).r;
      #else
      float ink = texture2D(map, at).r;
      #endif
      ink *= fogK() * (1. - uHf * smoothstep(5., 60., vH));
      gl_FragColor = vec4(uC * ink * uA, 1.);
    }`;
  const STIME = `uniform sampler2D map; ${SFOG}
    void main(){ gl_FragColor = vec4(uC * texture2D(map, vUv).r * fogK() * uA, 1.); }`;
  // the tunnel's ceiling: a grid, nine columns across, one row per unit of depth
  const SCEIL = `${SFOG}
    void main(){ vec2 d = abs(fract(vUv - .5) - .5) / max(fwidth(vUv), vec2(.00001)); vec2 l = 1. - clamp(d, 0., 1.);
      gl_FragColor = vec4(uC * max(l.x * .22, l.y * .1) * fogK() * uA, 1.); }`;
  const SNUM = `uniform sampler2D map; ${SFOG}
    void main(){ gl_FragColor = vec4(uC * texture2D(map, vUv).r * fogK() * uA, 1.); }`;

  function mat(vs, fs, u) {
    const m = new T.ShaderMaterial({ vertexShader: vs, fragmentShader: fs, uniforms: Object.assign({ uF0: { value: 30 }, uF1: { value: 60 }, uC: { value: new T.Color(0xe9e7e2) }, uA: { value: 1 } }, u),
      transparent: true, depthTest: false, depthWrite: false, side: T.DoubleSide });
    if (maxOK) { m.blending = T.CustomBlending; m.blendEquation = T.MaxEquation; m.blendSrc = T.OneFactor; m.blendDst = T.OneFactor; }
    else m.blending = T.AdditiveBlending;
    return m;
  }
  function smat(fs, u) {
    const m = new T.ShaderMaterial({ vertexShader: SVS, fragmentShader: fs, side: T.DoubleSide, depthTest: true, depthWrite: true,
      uniforms: Object.assign({ uA: { value: 0 }, uF0: { value: 44 * SK }, uF1: { value: 88 * SK }, uRise: { value: 1e3 }, uC: { value: new T.Color(0xe9e7e2) } }, u) });
    m.extensions = { derivatives: true };
    if (R.capabilities.isWebGL2) m.defines = { WGL2: 1 };
    return m;
  }
  function tex(src, rep) {
    const t = new T.TextureLoader().load(src, () => { key = ''; });
    t.format = T.LuminanceFormat; t.generateMipmaps = R.capabilities.isWebGL2;
    t.minFilter = t.generateMipmaps ? T.LinearMipmapLinearFilter : T.LinearFilter; t.anisotropy = Math.min(rep ? 16 : 4, R.capabilities.getMaxAnisotropy());
    if (rep) t.wrapS = t.wrapT = T.RepeatWrapping;
    return t;
  }
  function init() {
    R = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: false, powerPreference: 'high-performance' });
    R.setClearColor(0x000000, 1);
    maxOK = R.capabilities.isWebGL2 || !!R.extensions.get('EXT_blend_minmax');
    scene = new T.Scene();
    cam = new T.PerspectiveCamera(30, 1, .02, 80);
    const s = mobile ? '-s' : '';
    SEQ.forEach(k => { TX[k] = tex(`${opts.dir}${k}${s}.jpg?v=${opts.v}`); });
    ['titles', 'stations', 'times'].forEach(k => { TX['w' + k] = tex(`${opts.dir}w-${k}${s}.png?v=${opts.v}`, 1); });
    build(); swBuild(); size();
    fonts().then(type3d).catch(() => type3d());
  }

  /* ---------- the page and its seven fields ---------- */
  const pageRect = r => ({ x: -A / 2 + (r[0] + r[2] / 2) / 100 * A, y: .5 - (r[1] + r[3] / 2) / 100, w: r[2] / 100 * A, h: r[3] / 100 });
  const uvRect = r => new T.Vector4(r[0] / 100, 1 - (r[1] + r[3]) / 100, r[2] / 100, r[3] / 100);
  const FULL = [0, 0, 100, 100];
  let PAGES = [];
  function quad(material) { const m = new T.Mesh(new T.PlaneGeometry(1, 1), material); m.matrixAutoUpdate = false; m.frustumCulled = false; scene.add(m); return m; }
  function loop(material) {
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute([-.5, .5, 0, .5, .5, 0, .5, -.5, 0, -.5, -.5, 0], 3));
    g.setAttribute('aT', new T.Float32BufferAttribute([0, 0, 0, 0], 1)); g.setAttribute('aD', new T.Float32BufferAttribute([0, 0, 0, 0], 1));
    const l = new T.LineLoop(g, material); l.matrixAutoUpdate = false; l.frustumCulled = false; scene.add(l); return l;
  }
  function lineObj(pts) {      // pts: [x0,y0,z0, x1,y1,z1, aT0, aT1, aD]
    const P = [], AT = [], AD = [];
    pts.forEach(p => { P.push(p[0], p[1], p[2], p[3], p[4], p[5]); AT.push(p[6], p[7]); AD.push(p[8], p[8]); });
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(P, 3));
    g.setAttribute('aT', new T.Float32BufferAttribute(AT, 1)); g.setAttribute('aD', new T.Float32BufferAttribute(AD, 1));
    const m = mat(LVS, LFS, { uDraw: { value: 0 } }); m.uniforms.uA.value = 0;
    const o = new T.LineSegments(g, m); o.frustumCulled = false; scene.add(o); return o;
  }
  function build() {
    // one full page per layout (its whole picture), shown while the layout holds
    PAGES = SEQ.map(k => { const q = quad(mat(BVS, BFS, { tA: { value: TX[k] }, tB: { value: TX[k] }, rA: { value: uvRect(FULL) }, rB: { value: uvRect(FULL) }, uM: { value: 0 } })); q.material.uniforms.uA.value = 0; q.k = k; return q; });
    // the seven fields (+ a ghost of the time matrix that goes to the ceiling)
    for (let i = 0; i < 8; i++) {
      const b = { i: i === 7 ? 5 : i, ghost: i === 7 };
      b.q = quad(mat(BVS, BFS, { tA: { value: TX.s0 }, tB: { value: TX.s0 }, rA: { value: new T.Vector4() }, rB: { value: new T.Vector4() }, uM: { value: 0 } }));
      b.o = loop(mat(LVS.replace('vP = clamp((uDraw * 1.5 - aD) / .5, 0., 1.);', 'vP = 1.;'), LFS, { uDraw: { value: 1 } }));
      b.o.material.uniforms.uC.value = new T.Color(0xbdbab4);
      b.m = new T.Matrix4(); BL.push(b);
    }
    // the field grids, each line drawing itself in (verticals top-down, left to right; then the rows)
    Object.entries(GRIDS).forEach(([k, g]) => {
      const pts = [], nx = g.x.length;
      g.x.forEach((x, j) => { const X = -A / 2 + x / 100 * A; pts.push([X, .5, .002, X, -.5, .002, 0, 1, .45 * j / Math.max(1, nx - 1)]); });
      g.y.forEach((y, j) => { const Y = .5 - y / 100; pts.push([-A / 2, Y, .002, A / 2, Y, .002, 0, 1, .35 + .35 * j / Math.max(1, g.y.length - 1)]); });
      LN[k] = lineObj(pts); LN[k].material.uniforms.uC.value = new T.Color(0x9c9994);
    });
    // the page frame, drawn round; it narrows to the 3D grid's front frame as the page opens
    LN.frame = lineObj([[0, 0, 0, 0, 0, 0, 0, 1, 0], [0, 0, 0, 0, 0, 0, 0, 1, .25], [0, 0, 0, 0, 0, 0, 0, 1, .5], [0, 0, 0, 0, 0, 0, 0, 1, .75]]);
    LN.frame.material.uniforms.uC.value = new T.Color(0xcfccc6);
    built = true;
  }

  /* ---------- the 3D Grid System, from the reader's own drawing ---------- */
  const FACES = ['left', 'right', 'floor', 'ceiling', 'back'];
  function cast(px, py, face) {         // a point of the drawing (px of the 1223 × 875 stage), from the eye onto a face
    const G = D_.g3, X = -A / 2 + px / G.W * A, Y = .5 - py / G.H, dx = X - EX, dy = Y - EY;
    let t;
    if (face === 'left') t = (XL - EX) / dx; else if (face === 'right') t = (XR - EX) / dx;
    else if (face === 'floor') t = (YB - EY) / dy; else if (face === 'ceiling') t = (YT - EY) / dy; else t = (DE + DEP) / DE;
    if (!isFinite(t) || t <= 0) t = 40; t = Math.min(t, 40);
    return [EX + dx * t, EY + dy * t, DE - DE * t];
  }
  function faceOf(px, py) {
    const e = .015;
    for (const f of FACES.slice(0, 4)) { const p = cast(px, py, f); if (p[2] <= e && p[2] >= -DEP - e && p[0] >= XL - e && p[0] <= XR + e && p[1] >= YB - e && p[1] <= YT + e) return f; }
    return 'back';
  }
  function type3d() {
    if (!R || g3) return;
    const G = D_.g3;
    // every unit: its text and face, set once at a reference size into one atlas, and its parallelogram on the drawing
    const U = [];
    G.glyphs.forEach(g => U.push({ t: g[0], f: `${g[3]} ${g[2]} REFpx ${g[1]}`, ref: mobile ? 150 : 300, face: 'left', p: [g[4], g[5], g[6], g[7], g[8], g[9]], n: 4, i: 1 }));
    G.st.forEach(s => U.push({ t: s[0], f: `normal ${s[2]} REFpx ${s[1]}`, ref: mobile ? 34 : 64, face: 'right', p: [s[3], s[4], s[5], s[6], s[7], s[8]], n: 3, i: 1 }));
    G.words.forEach(w => U.push({ t: w[0], f: `${w[3]} ${w[2]} REFpx ${w[1]}`, ref: mobile ? 26 : 44, face: w[4], p: [w[5], w[6], w[5] + w[7], w[6], w[5], w[6] + w[8]], n: 1, i: w[9] }));
    const sc = document.createElement('canvas').getContext('2d'), E = new Map(), pad = 3;
    U.forEach(u => {
      const k = u.t + '|' + u.f + '|' + u.ref; u.k = k; if (E.has(k)) return;
      const f = u.f.replace('REF', u.ref); sc.font = f; const m = sc.measureText(u.t);
      const asc = m.fontBoundingBoxAscent || u.ref * .8, des = m.fontBoundingBoxDescent || u.ref * .2;
      E.set(k, { t: u.t, f, w: Math.ceil(m.width) + 2 * pad, h: Math.ceil(asc + des) + 2 * pad, iw: m.width, ih: asc + des, asc });
    });
    // shelf packing
    const AW = mobile ? 2048 : 4096, list = [...E.values()].sort((a, b) => b.h - a.h);
    let x = 0, y = 0, rowH = 0;
    list.forEach(e => { if (x + e.w > AW) { x = 0; y += rowH; rowH = 0; } e.x = x; e.y = y; x += e.w; rowH = Math.max(rowH, e.h); });
    const AH = y + rowH, c = document.createElement('canvas'); c.width = AW; c.height = AH; const cx = c.getContext('2d');
    cx.fillStyle = '#000'; cx.fillRect(0, 0, AW, AH); cx.fillStyle = '#fff'; cx.textBaseline = 'alphabetic';
    list.forEach(e => { cx.font = e.f; cx.fillText(e.t, e.x + pad, e.y + pad + e.asc); });
    const at = new T.CanvasTexture(c); at.format = T.LuminanceFormat; at.generateMipmaps = R.capabilities.isWebGL2;
    at.minFilter = at.generateMipmaps ? T.LinearMipmapLinearFilter : T.LinearFilter; at.anisotropy = R.capabilities.getMaxAnisotropy();
    // the mesh: each parallelogram subdivided on the drawing and cast point by point, so that from the eye it is the
    // drawing exactly, and from anywhere else type painted on the surfaces
    const P = [], UV = [], AI = [], AZ = [], AF = [], IX = [];
    U.forEach(u => {
      const e = E.get(u.k), [x0, y0, x1, y1, x2, y2] = u.p, n = u.n, base = P.length / 3, fi = FACES.indexOf(u.face);
      const u0 = (e.x + pad) / AW, u1 = (e.x + pad + e.iw) / AW, v0 = 1 - (e.y + pad) / AH, v1 = 1 - (e.y + pad + e.ih) / AH;
      for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
        const a = i / n, b = j / n, q = cast(x0 + (x1 - x0) * a + (x2 - x0) * b, y0 + (y1 - y0) * a + (y2 - y0) * b, u.face);
        P.push(q[0], q[1], q[2]); UV.push(lerp(u0, u1, a), lerp(v0, v1, b)); AI.push(u.i); AZ.push(clamp(-q[2] / DEP, 0, 1)); AF.push(fi);
      }
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const p = base + j * (n + 1) + i; IX.push(p, p + 1, p + n + 2, p, p + n + 2, p + n + 1); }
    });
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(UV, 2));
    g.setAttribute('aI', new T.Float32BufferAttribute(AI, 1)); g.setAttribute('aZ', new T.Float32BufferAttribute(AZ, 1)); g.setAttribute('aF', new T.Float32BufferAttribute(AF, 1)); g.setIndex(IX);
    const B0 = new T.Vector3(XL - .003, YB - .003, -DEP - .003), B1 = new T.Vector3(XR + .003, YT + .003, .003);
    g3 = new T.Mesh(g, mat(GVS, GFS, { tA: { value: at }, uR: { value: new T.Vector4() }, uR4: { value: 0 }, uB0: { value: B0 }, uB1: { value: B1 } }));
    g3.frustumCulled = false; scene.add(g3);
    // the perspective grid and the radiating rules, cast the same way
    {
      const P = [], AI = [], AZ = [];
      const seg = (x0, y0, x1, y1, w, face) => {
        const f = face || faceOf((x0 + x1) / 2, (y0 + y1) / 2), a = cast(x0, y0, f), b = cast(x1, y1, f);
        P.push(...a, ...b); AI.push(w, w); AZ.push(clamp(-a[2] / DEP, 0, 1), clamp(-b[2] / DEP, 0, 1));
      };
      G.lines.forEach(l => seg(l[0], l[1], l[2], l[3], l[4]));
      G.rules.forEach(r => seg(r[1], r[2], r[3], r[4], .45 * r[5], r[0]));
      const lg = new T.BufferGeometry(); lg.setAttribute('position', new T.Float32BufferAttribute(P, 3));
      lg.setAttribute('aI', new T.Float32BufferAttribute(AI, 1)); lg.setAttribute('aZ', new T.Float32BufferAttribute(AZ, 1));
      g3L = new T.LineSegments(lg, mat(GLVS, GLFS, { uExt: { value: 0 }, uB0: { value: B0 }, uB1: { value: B1 } }));
      g3L.material.uniforms.uC.value = new T.Color(0xd8d5cf); g3L.frustumCulled = false; scene.add(g3L);
    }
    // the service note's place on the end wall, for the field that goes there
    { const w = G.words.filter(w => w[4] === 'back'); const xs = w.flatMap(w => [w[5], w[5] + w[7]]), ys = w.flatMap(w => [w[6], w[6] + w[8]]);
      const a = cast(Math.min(...xs), Math.min(...ys), 'back'), b = cast(Math.max(...xs), Math.max(...ys), 'back');
      NOTE = { c: new T.Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, -DEP), w: Math.abs(b[0] - a[0]), h: Math.abs(b[1] - a[1]) }; }
    swNumbers();
    ready3 = true; key = '';
  }

  /* ---------- Space Walk ---------- */
  function swMesh(pos, uv, idx, material) {
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.setIndex(idx || [0, 1, 2, 0, 2, 3]);
    const m = new T.Mesh(g, material); m.frustumCulled = false; m.renderOrder = -10; swG.add(m); return m;
  }
  function swBuild() {
    swG = new T.Group(); swG.position.set(0, YB, 0); swG.scale.setScalar(SK); swG.visible = false; scene.add(swG);
    const { w, h, sl, rs, ow, zf, zb } = SW, a2 = w / 2, dm = -zb;
    const M = {
      titles: smat(SWALL, { map: { value: TX.wtitles }, uHf: { value: 1 } }), stations: smat(SWALL, { map: { value: TX.wstations }, uHf: { value: 1 } }),
      titlesT: smat(SWALL, { map: { value: TX.wtitles }, uHf: { value: 0 } }), stationsT: smat(SWALL, { map: { value: TX.wstations }, uHf: { value: 0 } }),
      times: smat(STIME, { map: { value: TX.wtimes } }), ceil: smat(SCEIL, {}),
    };
    swG.userData.M = M;
    // the outer walls: titles on the left, stations on the right, the 12-unit cells running with depth
    for (const B of [-1, 1]) {
      const x = B * ow, Z = [zf, zb], m = B < 0 ? M.titles : M.stations;
      swMesh([x, 0, zf, x, 0, zb, x, 64, zb, x, 64, zf], [B * Z[0] / 12, 0, B * Z[1] / 12, 0, B * Z[1] / 12, 64 / 12, B * Z[0] / 12, 64 / 12], null, m);
    }
    // the ground of times: either side of the tunnel all along, in its middle before the mouth and after the roof starts
    const ground = (x0, x1, z0, z1) => swMesh([x0, 0, z0, x1, 0, z0, x1, 0, z1, x0, 0, z1], [(x0 + a2) / 16, -z0 / 12, (x1 + a2) / 16, -z0 / 12, (x1 + a2) / 16, -z1 / 12, (x0 + a2) / 16, -z1 / 12], null, M.times);
    ground(-ow, -a2, zf, zb); ground(a2, ow, zf, zb); ground(-a2, a2, zf, 0); ground(-a2, a2, -rs, zb);
    // the lip where the roof begins
    { const H = h - rs * sl; swMesh([-a2, 0, -rs, a2, 0, -rs, a2, H, -rs, -a2, H, -rs], [0, 0, .5, 0, .5, H / 12, 0, H / 12], null, M.times); }
    // the tunnel floor, falling with the slope
    swMesh([-a2, 0, 0, a2, 0, 0, a2, -dm * sl, -dm, -a2, -dm * sl, -dm], [0, 0, w / 16, 0, w / 16, dm * SLL / 12, 0, dm * SLL / 12], null, M.times);
    // its walls: open to the ground up to the roof, then 5.6 high; the cells laid along the slope
    for (const B of [-1, 1]) {
      const x = B * a2, m = B < 0 ? M.titlesT : M.stationsT, uv = (D, Y) => [-B * (D - sl * Y) / (12 * SLL), (Y + sl * D) / (12 * SLL)];
      const pts = [[0, 0], [rs, -rs * sl], [rs, 0]];   // the open part: a triangle from the mouth to the roof
      swMesh(pts.flatMap(([D, Y]) => [x, Y, -D]), pts.flatMap(([D, Y]) => uv(D, Y)), [0, 1, 2], m);
      const q = [[rs, -rs * sl], [dm, -dm * sl], [dm, -dm * sl + h], [rs, -rs * sl + h]];
      swMesh(q.flatMap(([D, Y]) => [x, Y, -D]), q.flatMap(([D, Y]) => uv(D, Y)), null, m);
    }
    // the ceiling, from the roof on
    swMesh([-a2, h - rs * sl, -rs, a2, h - rs * sl, -rs, a2, h - dm * sl, -dm, -a2, h - dm * sl, -dm], [0, rs, 9, rs, 9, dm, 0, dm], null, M.ceil);
  }
  // the times on the ceiling: the work's nine columns, one row per unit of depth, all at the size at which the widest
  // fits 0.82 of its column
  function swNumbers() {
    const cols = D_.sw.cols, strs = [...new Set(cols.flat())], ref = mobile ? 48 : 80, f = `700 ${ref}px "clarendon-text-pro", "Clarendon", Georgia, serif`;
    const sc = document.createElement('canvas').getContext('2d'); sc.font = f;
    const E = {}; let mw = 0, mh = 0;
    strs.forEach(s => { const m = sc.measureText(s); const l = m.actualBoundingBoxLeft || 0, r = m.actualBoundingBoxRight || m.width, u = m.actualBoundingBoxAscent || ref * .7, d = m.actualBoundingBoxDescent || 0;
      E[s] = { l, r, u, d, w: l + r, h: u + d }; mw = Math.max(mw, l + r); mh = Math.max(mh, u + d); });
    const cw = Math.ceil(mw) + 8, ch = Math.ceil(mh) + 8, per = Math.floor(2048 / cw), c = document.createElement('canvas');
    c.width = 2048; c.height = Math.ceil(strs.length / per) * ch; const cx = c.getContext('2d');
    cx.fillStyle = '#000'; cx.fillRect(0, 0, c.width, c.height); cx.fillStyle = '#fff'; cx.font = f; cx.textBaseline = 'alphabetic';
    strs.forEach((s, i) => { const e = E[s], x0 = (i % per) * cw + 4, y0 = Math.floor(i / per) * ch + 4; cx.fillText(s, x0 + e.l, y0 + e.u);
      e.uv = [x0 / c.width, 1 - (y0 + e.h) / c.height, (x0 + e.w) / c.width, 1 - y0 / c.height]; });
    const t = new T.CanvasTexture(c); t.format = T.LuminanceFormat; t.generateMipmaps = R.capabilities.isWebGL2;
    t.minFilter = t.generateMipmaps ? T.LinearMipmapLinearFilter : T.LinearFilter; t.anisotropy = R.capabilities.getMaxAnisotropy();
    const { w, h, sl, rs } = SW, ci = w / cols.length, r = Math.min(ci * .82 / mw, .28 / mh), P = [], UV = [], IX = [];
    for (let n = rs; n < -SW.zb - 1; n++) {
      const row = n % 26;
      cols.forEach((col, x) => {
        const s = col[row], e = s && E[s]; if (!e) return;
        const xc = -w / 2 + (x + .5) * ci, hw = e.w * r / 2, hh = e.h * r / 2, D0 = n + .5 - hh, D1 = n + .5 + hh, k = P.length / 3;
        // the glyphs' up runs into the depth, as the work lays them
        [[xc - hw, D0], [xc + hw, D0], [xc + hw, D1], [xc - hw, D1]].forEach(([X, D]) => P.push(X, h - sl * D - .008, -D));
        UV.push(e.uv[0], e.uv[1], e.uv[2], e.uv[1], e.uv[2], e.uv[3], e.uv[0], e.uv[3]);
        IX.push(k, k + 1, k + 2, k, k + 2, k + 3);
      });
    }
    swN = swMesh(P, UV, IX, smat(SNUM, { map: { value: t } }));
    swN.material.polygonOffset = true; swN.material.polygonOffsetFactor = -1; swN.material.polygonOffsetUnits = -1;
  }

  function size() {
    if (!R) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    R.setPixelRatio(dpr); R.setSize(vw, vh, false);
    ov.width = Math.round(vw * dpr); ov.height = Math.round(vh * dpr);
    key = '';
  }
  function layout(w, h, g) {
    vw = w; vh = h; mobile = vw < 700; G0 = g; fsz = g.t; font = `400 ${g.t}px ${g.font}`;
    // the page's place on screen: under the timeline's labels, room above it for the caption
    const top = g.headBottom + g.t * 2.6, bot = vh - g.m - g.t * 1.2, aw = vw - 2 * g.m, ah = bot - top;
    hp = Math.min(ah, aw / A); const sx = vw / 2, sy = top + ah / 2;
    pageS = { l: sx - A * hp / 2, t: sy - hp / 2, w: A * hp, h: hp };
    nC = { x: sx / vw * 2 - 1, y: 1 - sy / vh * 2 };
    P11F = 1 / Math.tan(15 * Math.PI / 180); dF = P11F * vh / (2 * hp);
    size();
  }

  /* ---------- the camera ---------- */
  const V3 = (x, y, z) => new T.Vector3(x, y, z);
  function setProj(P11, e8, e9) {
    const n = .02, f = 80, m = cam.projectionMatrix.elements, P00 = P11 * vh / vw;
    m.fill(0); m[0] = P00; m[5] = P11; m[8] = e8; m[9] = e9; m[10] = -(f + n) / (f - n); m[11] = -1; m[14] = -2 * f * n / (f - n);
    cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
  }
  // head-on, the page registered to its place on screen whatever the distance (a shifted lens): a dolly in keeps the
  // page fixed and lets only the depth change
  function reg(cx, cy, cz) { const P11 = 2 * hp * cz / vh, P00 = P11 * vh / vw; return { p: V3(cx, cy, cz), q: new T.Quaternion(), tg: V3(cx, cy, 0), P11, e8: -P00 * cx / cz - nC.x, e9: -P11 * cy / cz - nC.y }; }
  const aimer = { o: null };
  function aim(p, t) { const o = aimer.o || (aimer.o = new T.PerspectiveCamera()); o.position.copy(p); o.up.set(0, 1, 0); o.lookAt(t); return o; }   // a camera looks down its -z
  function orbit(yaw, pitch) {
    const p = V3(0, 0, dF).applyEuler(new T.Euler(-pitch, yaw, 0, 'YXZ'));
    return { p, q: aim(p, V3(0, 0, 0)).quaternion.clone(), tg: V3(0, 0, 0), P11: P11F, e8: -nC.x, e9: -nC.y };
  }
  function mix(a, b, t) { return { p: a.p.clone().lerp(b.p, t), q: a.q.clone().slerp(b.q, t), tg: a.tg.clone().lerp(b.tg, t), P11: lerp(a.P11, b.P11, t), e8: lerp(a.e8, b.e8, t), e9: lerp(a.e9, b.e9, t) }; }
  // Space Walk's views, in its units: open field (z 9, looking down 0.14), tunnel entrance (z 1.8, 0.25), inside
  // (z -48, along the slope); its lens is 50° high
  function swPose(z, pitch) {
    const y = SW.eye + Math.min(z, 0) * SW.sl, p = V3(0, YB + y * SK, z * SK), d = V3(0, Math.sin(pitch), -Math.cos(pitch));
    const P11 = vw > vh ? 1 / Math.tan(25 * Math.PI / 180) : Math.max(1, Math.min(2.14, (vw / vh) / Math.tan(32 * Math.PI / 180)));
    const tg = p.clone().addScaledVector(d, 2);
    return { p, q: aim(p, tg).quaternion.clone(), tg, P11, e8: 0, e9: 0 };
  }
  function camAt(u) {
    if (u < FOLD[0]) {
      // the fields lift a little as they move; the view turns off the page just enough to see it
      const yaw = lerp(-.15, .11, smt(1.6, 4.05, u)) * smt(1.0, 1.65, u) * (1 - smt(4.05, FOLD[0] + .02, u));
      const pitch = .075 * smt(1.0, 1.65, u) * (1 - smt(4.05, FOLD[0] + .02, u));
      return orbit(yaw, pitch);
    }
    const eye = () => { const t = eio(smt(FOLD[0] + .05, FOLD[0] + .8, u)); return reg(lerp(0, EX, t), lerp(0, EY, t), lerp(dF, DE, t)); };
    if (u < SPACE[0]) return eye();
    const over = swPose(9, -.14);
    if (u < ENTER[0]) return mix(reg(EX, EY, DE), over, eio(smt(SPACE[0], SPACE[1], u)));
    if (u < DESC[0]) return mix(over, swPose(1.8, -.25), eio(smt(ENTER[0], ENTER[1], u)));
    const t = eio(smt(DESC[0], DESC[1], u)), z = lerp(1.8, -48, t);
    return swPose(z, lerp(-.25, -Math.atan(SW.sl), smt(0, .35, t)));
  }
  // the pointer turns the view a little, as in the Commedia
  const sw = { x: 0, y: 0, t: 0 };
  function swayEase() {
    const P = window.TAO_PTR || { x: 0, y: 0 }, now = performance.now(), dt = sw.t ? Math.min(.05, (now - sw.t) / 1000) : .016; sw.t = now;
    sw.x += (P.x - sw.x) * Math.min(1, dt * 3); sw.y += (P.y - sw.y) * Math.min(1, dt * 3);
    return `|${sw.x.toFixed(4)}|${sw.y.toFixed(4)}`;
  }
  function apply(c, free) {
    cam.position.copy(c.p); cam.quaternion.copy(c.q);
    if (free > .001) {      // a true orbit round what the view is on: position and turn together, so the framing holds
      const up = V3(0, 1, 0), fwd = c.tg.clone().sub(c.p).normalize(), side = V3().crossVectors(fwd, up).normalize();
      const qs = new T.Quaternion().setFromAxisAngle(up, -sw.x * .09 * free).multiply(new T.Quaternion().setFromAxisAngle(side, sw.y * .05 * free));
      cam.position.copy(c.tg).add(c.p.clone().sub(c.tg).applyQuaternion(qs)); cam.quaternion.premultiply(qs);
    }
    cam.updateMatrixWorld(true);
    setProj(c.P11, c.e8, c.e9);
  }

  /* ---------- the fields: where each stands at u ---------- */
  function seg(u) {           // which two layouts u lies between, and how far (0 holding on a, 1 arrived at b)
    let a = 's0', b = 's0', t = 0;
    for (let i = 1; i < SEQ.length; i++) {
      const m = MOVES[SEQ[i]];
      if (u >= m[0]) { a = SEQ[i - 1]; b = SEQ[i]; t = clamp((u - m[0]) / (m[1] - m[0]), 0, 1); }
    }
    if (t >= 1) { a = b; t = 0; }
    return { a, b, t };
  }
  const QY = a => new T.Quaternion().setFromAxisAngle(V3(0, 1, 0), a), QX = a => new T.Quaternion().setFromAxisAngle(V3(1, 0, 0), a);
  /* the fold: the page opens like a box. Title and stations swing on the frame's sides like doors into the depth (the
     title hinged at its left edge onto the left wall, the stations at their right edge onto the right), the time
     matrix falls back on the bottom edge to the floor and a ghost of it rises on the top edge to the ceiling; the
     service goes straight back to where the drawing writes it on the end wall; page, table number and footnotes fall
     away into the dark. Nothing passes in front of the page. Each lands as the drawing's own type on its face. */
  const FOLDT = [[.12, .6], [.05, .42], [.05, .42], [.3, .78], [.18, .66], [.24, .72], [.05, .42], [.3, .78]];
  function foldPose(b, t, r) {
    const th = Math.PI / 2 * t, grow = smt(.25, 1, t), c = Math.cos(th), sn = Math.sin(th);
    switch (b.ghost ? 7 : b.i) {
      case 0: { const L = lerp(r.w, DEP, grow), h = lerp(r.h, HC, t), P = V3(lerp(r.x - r.w / 2, XL, t), lerp(r.y, YC, t), 0);
        return { pos: P.add(V3(c, 0, -sn).multiplyScalar(L / 2)), q: QY(th), w: L, h }; }
      case 4: { const L = lerp(r.w, DEP, grow), h = lerp(r.h, HC, t), P = V3(lerp(r.x + r.w / 2, XR, t), lerp(r.y, YC, t), 0);
        return { pos: P.sub(V3(c, 0, sn).multiplyScalar(L / 2)), q: QY(-th), w: L, h }; }
      case 5: { const H = lerp(r.h, DEP, grow), w = lerp(r.w, WC, t), P = V3(lerp(r.x, (XL + XR) / 2, t), lerp(r.y - r.h / 2, YB, t), 0);
        return { pos: P.add(V3(0, c, -sn).multiplyScalar(H / 2)), q: QX(-th), w, h: H }; }
      case 7: { const H = lerp(r.h, DEP, grow), w = lerp(r.w, WC, t), P = V3(lerp(r.x, (XL + XR) / 2, t), lerp(r.y + r.h / 2, YT, t), 0);
        return { pos: P.sub(V3(0, c, sn).multiplyScalar(H / 2)), q: QX(th), w, h: H }; }
      case 3: { const N = NOTE || { c: V3(0, YC, -DEP), w: WC * .2, h: .03 }, w = lerp(r.w, N.w, t), h = lerp(r.h, N.h, t);
        return { pos: V3(lerp(r.x, N.c.x, t), lerp(r.y, N.c.y, t), -DEP * eio(t)), q: new T.Quaternion(), w, h }; }
      default: return { pos: V3(r.x, r.y, -1.4 * t), q: new T.Quaternion(), w: r.w, h: r.h };
    }
  }
  const LAND = [0, 4, 5, 7, 3];   // the field that lands on each face: left, right, floor, ceiling, back

  function step(u) {
    if (u > -1.8) load();
    photo.style.opacity = smt(PH[0], PH[1], u).toFixed(3);
    if (!R || !built) return 1;
    const k0 = `${u.toFixed(4)}|${vw}|${vh}|${ready3}` + swayEase();
    if (k0 === key) return 1;
    key = k0;
    const out = 1 - smt(OUT[0], OUT[1], u), fin = smt(IN[0], IN[1], u);
    const c = camAt(u); apply(c, (1 - smt(OUT[0] - .3, OUT[1], u)) * (u < FOLD[0] ? 1 : u < SPACE[1] ? .35 : .7));
    const fp = clamp((u - FOLD[0]) / (FOLD[1] - FOLD[0]), 0, 1), sp = clamp((u - SPACE[0]) / (SPACE[1] - SPACE[0]), 0, 1);
    const g3a = (1 - smt(.05, .6, sp)) * out;      // the 3D grid, until the field of Space Walk takes over
    const fog0 = 30, fog1 = 60;

    // pages: each layout's whole picture shows while it holds, dims while its fields move away
    const S = seg(u), parseDim = smt(PARSE[0], PARSE[0] + .35, u);
    PAGES.forEach(q => {
      let a = 0;
      if (q.k === S.a) a = 1 - smt(0, .18, S.t);
      if (q.k === S.b && S.t > 0) a = Math.max(a, smt(.78, 1, S.t));
      if (q.k === 's0') a *= lerp(1, .2, parseDim);
      if (q.k === 'g32') a *= 1 - smt(FOLD[0], FOLD[0] + .1, u);
      const r = pageRect(FULL); q.matrix.compose(V3(r.x, r.y, 0), new T.Quaternion(), V3(r.w, r.h, 1)); q.matrixWorldNeedsUpdate = true;
      const U = q.material.uniforms; U.uA.value = a * fin * out; q.visible = U.uA.value > .002;
    });

    // the fields
    const landT = [];
    BL.forEach(b => {
      const lay = k => D_.blocks[k][b.i];
      const k0 = S.a, k1 = S.b, st = b.i * .05, t = S.t > 0 ? eio(clamp((S.t - st) / (1 - .3), 0, 1)) : 0;
      const ra = pageRect(lay(k0)), rb = pageRect(lay(k1));
      let pos = V3(lerp(ra.x, rb.x, t), lerp(ra.y, rb.y, t), .045 * Math.sin(Math.PI * t) * (1 + b.i * .12)), q = new T.Quaternion(), w = lerp(ra.w, rb.w, t), h = lerp(ra.h, rb.h, t);
      let tA = TX[k0], tB = TX[k1], rA = uvRect(lay(k0)), rB = uvRect(lay(k1)), m = smt(.25, .75, t), a = b.ghost ? 0 : 1;
      if (u > FOLD[0]) {
        const r32 = pageRect(lay('g32')), kk = b.ghost ? 7 : b.i, f = FOLDT[kk], tt = clamp((fp - f[0]) / (f[1] - f[0]), 0, 1), fpz = foldPose(b, eio(tt), r32);
        pos = fpz.pos; q = fpz.q; w = fpz.w; h = fpz.h; tA = TX.g32; rA = uvRect(lay('g32')); tB = TX.g32; rB = rA; m = 0;
        landT[kk] = tt;
        // landed, the field gives way to the drawing's own type on that face
        if (LAND.includes(kk)) a = (kk === 7 ? smt(0, .25, tt) * .7 : 1) * (1 - smt(.72, 1, tt) * (ready3 ? 1 : .4));
        else a = 1 - eio(tt);
      }
      b.m.compose(pos, q, V3(Math.max(w, 1e-4), Math.max(h, 1e-4), 1));
      b.q.matrix.copy(b.m); b.q.matrixWorldNeedsUpdate = true; b.o.matrix.copy(b.m); b.o.matrixWorldNeedsUpdate = true;
      const U = b.q.material.uniforms;
      U.tA.value = tA; U.tB.value = tB; U.rA.value = rA; U.rB.value = rB; U.uM.value = m;
      U.uA.value = a * (u < PARSE[0] ? smt(PARSE[0] - .05, PARSE[0] + .05, u) : 1) * out; U.uF0.value = fog0; U.uF1.value = fog1;
      b.q.visible = U.uA.value > .002;
      const moving = S.t > 0 && S.t < 1 ? Math.sin(Math.PI * S.t) : 0;
      let oa = smt(PARSE[0] + b.i * .05, PARSE[0] + .2 + b.i * .05, u) * (u < MOVES.s8[0] ? .6 : .2 + .45 * moving);
      if (u > FOLD[0]) oa = .3 * (1 - smt(.6, .9, fp));
      if (b.ghost && u <= FOLD[0]) oa = 0;
      b.o.material.uniforms.uA.value = oa * a * out;
      b.o.visible = b.o.material.uniforms.uA.value > .002;
    });

    // grids: drawn in as the fields head for them, gone once the next one comes
    [['g8', MOVES.s8[0], MOVES.g20[0]], ['g20', MOVES.g20[0], MOVES.g32[0]], ['g32', MOVES.g32[0], FOLD[0]]].forEach(([k, a0, a1]) => {
      const U = LN[k].material.uniforms; U.uA.value = smt(a0, a0 + .25, u) * (1 - smt(a1, a1 + .25, u)) * .55 * out; U.uDraw.value = smt(a0, a0 + .45, u); LN[k].visible = U.uA.value > .002;
    });
    // the frame: the page's edge, then the 3D grid's front frame
    {
      const tf = eio(smt(FOLD[0] + .1, FOLD[0] + .7, u)), x0 = lerp(-A / 2, XL, tf), x1 = lerp(A / 2, XR, tf), y0 = lerp(.5, YT, tf), y1 = lerp(-.5, YB, tf);
      const p = LN.frame.geometry.attributes.position, s = [[x0, y0, x1, y0], [x1, y0, x1, y1], [x1, y1, x0, y1], [x0, y1, x0, y0]];
      s.forEach((l, i) => { p.setXYZ(2 * i, l[0], l[1], 0); p.setXYZ(2 * i + 1, l[2], l[3], 0); }); p.needsUpdate = true;
      const U = LN.frame.material.uniforms; U.uDraw.value = smt(IN[0] + .05, IN[1] + .2, u); U.uA.value = .55 * out * (1 - smt(SPACE[0], SPACE[0] + .3, u)); LN.frame.visible = U.uA.value > .002;
    }
    // the 3D Grid System: its lines run back as the page opens, each face's type comes in from the mouth as its field lands
    if (g3) {
      const ln = (kk, a0) => smt(a0, 1, landT[kk] || 0);
      const U = g3.material.uniforms; U.uR.value.set(ln(0, .5), ln(4, .5), ln(5, .55), ln(7, .55)); U.uR4.value = ln(3, .6);
      U.uA.value = g3a; g3.visible = u > FOLD[0] && g3a > .002;
      const L = g3L.material.uniforms; L.uExt.value = eio(smt(.06, .7, fp)); L.uA.value = smt(.04, .2, fp) * .55 * g3a; g3L.visible = L.uA.value > .002;
    }
    // Space Walk: comes up round the 3D grid, the outer walls rising out of the ground
    if (swG) {
      const sa = smt(.15, .8, sp) * out; swG.visible = sa > .002;
      if (swG.visible) {
        const M = swG.userData.M, rise = 64 * eio(smt(.1, .95, sp));
        Object.values(M).forEach(m => { m.uniforms.uA.value = sa; m.uniforms.uRise.value = 1e3; });
        M.titles.uniforms.uRise.value = M.stations.uniforms.uRise.value = rise;
        if (swN) swN.material.uniforms.uA.value = sa;
      }
    }
    R.render(scene, cam);
    labels(u, fp, out);
    return 1;
  }

  /* ---------- words: the layout's name above the page, the fields' names as the scan is parsed, the faces' as they fold ---------- */
  function labels(u, fp, out) {
    ox.setTransform(1, 0, 0, 1, 0, 0); ox.clearRect(0, 0, ov.width, ov.height);
    ox.setTransform(dpr, 0, 0, dpr, 0, 0); ox.font = font; ox.textBaseline = 'alphabetic';
    for (const [a0, a1, no, long, short] of CAP) {
      const al = smt(a0, a0 + .14, u) * (1 - smt(a1 - .14, a1, u)) * out;
      if (al <= .01) continue;
      ox.globalAlpha = al; ox.textAlign = 'left';
      const x = Math.max(G0.m, pageS.l), y = pageS.t - fsz * 1.1;
      const txt = short && ox.measureText(long).width > vw - x - G0.m - fsz * 2.2 ? short : long;
      ox.fillStyle = 'rgba(236,236,236,.5)'; ox.fillText(no, x, y);
      ox.fillStyle = 'rgba(236,236,236,.92)'; ox.fillText(txt, x + fsz * 2.2, y);
    }
    const pin = (P3, txt, al, side) => {
      if (al <= .01) return;
      const v = P3.clone().project(cam); if (v.z > 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05) return;
      const qx = (v.x + 1) / 2 * vw, qy = (1 - v.y) / 2 * vh, sd = side || (qx > vw * .62 ? -1 : 1), lx = qx + sd * 10, ly = qy - 9;
      ox.globalAlpha = al * .95; ox.strokeStyle = 'rgba(236,236,236,.55)'; ox.lineWidth = 1;
      ox.beginPath(); ox.moveTo(qx, qy); ox.lineTo(lx, ly); ox.lineTo(lx + sd * 6, ly); ox.stroke();
      ox.fillStyle = 'rgba(236,236,236,.95)'; ox.beginPath(); ox.arc(qx, qy, 1.8, 0, 7); ox.fill();
      ox.textAlign = sd > 0 ? 'left' : 'right'; ox.fillText(txt, lx + sd * 10, ly + fsz * .35);
    };
    // the seven fields, named while the scan is cut into them
    const a = smt(PARSE[0] + .1, PARSE[0] + .3, u) * (1 - smt(MOVES.s8[0] + .2, MOVES.s8[0] + .45, u)) * out;
    if (a > .01) BL.forEach(b => { if (b.ghost) return; pin(V3(-.5, .5, 0).applyMatrix4(b.m), D_.names[b.i], a * smt(PARSE[0] + .1 + b.i * .05, PARSE[0] + .3 + b.i * .05, u)); });
    ox.globalAlpha = 1;
  }
  return { load, layout, step, END, PHOTO: PH[1] + .05 };
};

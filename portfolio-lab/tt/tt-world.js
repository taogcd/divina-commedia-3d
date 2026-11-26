/* TIMETABLE RESOLUTION STUDY, drawn in light on black: how one table is set again and again.
   The 1928 scan of Table 13 (after Kinross) is cut into its seven fields: title, table number, page, service,
   stations, time matrix, footnotes. The fields move, still as scan, into the 8 grid (4 × 2 fields), are typeset
   there as the modern print, then move into the 20 grid (5 × 4) and the 32 grid (8 × 4); each layout is the work's
   own picture, cut at the fields' own rects. The page then opens into the 3D grid: its frame becomes the mouth of a
   one-point corridor seen from the drawing's own eye (back wall at 0.179 of the front, as in the reader), the title
   folds onto the left wall, the stations onto the right, the times onto floor and ceiling, page and service onto
   the end wall; then the camera walks in, as in Space Walk. Every field keeps its picture while it moves; the
   corridor's type is set at run time in the work's own faces (Adobe Fonts kit of the timetable site).
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
  const FOLD = [4.42, 5.7], WALK = [5.7, 7.3], OUT = [7.22, 7.5], PH = [7.45, 7.95], END = 8.25;
  const SEQ = ['s0', 's8', 'g8', 'g20', 'g32'];
  // the page (height 1, width A) and the corridor of the 3D grid, from the reader's one-point drawing (in % of the page):
  // front frame 1.1–98.9 × 2.6–97.2, back rect 41.67–59.13 × 47.37–64.4; so the eye at 50.48 × 57.2, the back at k = .1785
  const A = 1.4, XL = -A / 2 + .011 * A, XR = A / 2 - .011 * A, YT = .5 - .026, YB = .5 - .972, YC = (YT + YB) / 2;
  const WC = XR - XL, HC = YT - YB, EX = -A / 2 + .5048 * A, EY = .5 - .572, KB = .1785, DEP = 7.2, DE = DEP * KB / (1 - KB);
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
    [FOLD[0], FOLD[1], '06', '3D grid: the page opened into one-point space', '3D grid: one-point space'],
    [WALK[0], WALK[1] - .1, '07', 'Space walk'],
  ];

  frame.classList.add('tt');
  const cv = document.createElement('canvas'); cv.className = 'ws-cv'; cv.setAttribute('aria-hidden', 'true');
  const photo = document.createElement('img'); photo.className = 'ws-photo'; photo.alt = ''; photo.decoding = 'async';
  const ov = document.createElement('canvas'); ov.className = 'ws-cv'; ov.setAttribute('aria-hidden', 'true');
  frame.appendChild(cv); frame.appendChild(photo); frame.appendChild(ov);
  const ox = ov.getContext('2d');
  let T = null, R = null, scene, cam, vw = 1, vh = 1, dpr = 1, mobile = false, loaded = 0, key = '', built = false, font = '', fsz = 12;
  let maxOK = true, nC = { x: 0, y: 0 }, hp = 1, pageS = { l: 0, t: 0 }, dF = 2.5, P11F = 3.73;
  const TX = {}, BL = [], LN = {};
  let cells = null, wallsReady = false;

  function js(src) { return new Promise((res, rej) => { const el = document.createElement('script'); el.src = src; el.onload = res; el.onerror = rej; document.head.appendChild(el); }); }
  function fonts() {
    if (!document.querySelector('link[href*="tvm5ist"]')) {
      const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://use.typekit.net/tvm5ist.css'; document.head.appendChild(l);
    }
    const want = ['400 64px "league-gothic"', '700 64px "superclarendon"', '400 64px "clarendon-text-pro"', '700 64px "clarendon-text-pro"'];
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

  /* ---------- shaders: everything is ink (light) on black, laid over each other by max, so a field and its page,
     or two pictures crossing, never add up ---------- */
  const FOG = `uniform float uF0, uF1; varying float vD;`;
  const BVS = `varying vec2 vUv; varying float vD;
    void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.); vD = length(mv.xyz); gl_Position = projectionMatrix * mv; }`;
  const BFS = `uniform sampler2D tA, tB; uniform vec4 rA, rB; uniform float uM, uA; uniform vec3 uC; varying vec2 vUv; ${FOG}
    float ink(sampler2D t, vec4 r){ vec2 p = r.xy + vUv * r.zw; if (p.x < 0. || p.y < 0. || p.x > 1. || p.y > 1.) return 0.; return texture2D(t, p).r; }
    void main(){
      float a = uM < .001 ? ink(tA, rA) : uM > .999 ? ink(tB, rB) : mix(ink(tA, rA), ink(tB, rB), uM);
      float f = 1. - smoothstep(uF0, uF1, vD) * .9;
      gl_FragColor = vec4(uC * a * uA * f, 1.);
    }`;
  const CVS = `attribute float aS; uniform float uIn; varying vec2 vUv; varying float vA, vD;
    void main(){ vUv = uv; vA = smoothstep(aS, aS + .1, uIn * 1.12); vec4 mv = modelViewMatrix * vec4(position, 1.); vD = length(mv.xyz); gl_Position = projectionMatrix * mv; }`;
  const CFS = `uniform sampler2D tA; uniform float uA; uniform vec3 uC; varying vec2 vUv; varying float vA; ${FOG}
    void main(){ float f = 1. - smoothstep(uF0, uF1, vD) * .92; gl_FragColor = vec4(uC * texture2D(tA, vUv).r * vA * uA * f, 1.); }`;
  // lines that draw themselves: aT runs 0 → 1 along each line, aD staggers them
  const LVS = `attribute float aT, aD; uniform float uDraw; varying float vT, vP, vD;
    void main(){ vT = aT; vP = clamp((uDraw * 1.5 - aD) / .5, 0., 1.); vec4 mv = modelViewMatrix * vec4(position, 1.); vD = length(mv.xyz); gl_Position = projectionMatrix * mv; }`;
  const LFS = `uniform float uA; uniform vec3 uC; varying float vT, vP; ${FOG}
    void main(){ if (vT > vP + .0001 || vP <= 0.) discard; float f = 1. - smoothstep(uF0, uF1, vD) * .9; gl_FragColor = vec4(uC * uA * f, 1.); }`;
  // the corridor: long lines run from the front frame to z = -depth · aT · uExt; rings (aL = 0) sit at depth aT and
  // show once the extrusion has passed them
  const KVS = `attribute float aT, aL; uniform float uExt, uDp; varying float vA, vD;
    void main(){ vec3 p = position; p.z = -uDp * aT * (aL > .5 ? uExt : 1.); vA = aL > .5 ? 1. : smoothstep(aT - .02, aT, uExt);
      vec4 mv = modelViewMatrix * vec4(p, 1.); vD = length(mv.xyz); gl_Position = projectionMatrix * mv; }`;
  const KFS = `uniform float uA; uniform vec3 uC; varying float vA; ${FOG}
    void main(){ float f = 1. - smoothstep(uF0, uF1, vD) * .94; gl_FragColor = vec4(uC * uA * vA * f, 1.); }`;

  function mat(vs, fs, u) {
    const m = new T.ShaderMaterial({ vertexShader: vs, fragmentShader: fs, uniforms: Object.assign({ uF0: { value: 3 }, uF1: { value: 12 }, uC: { value: new T.Color(0xe9e7e2) }, uA: { value: 1 } }, u),
      transparent: true, depthTest: false, depthWrite: false, side: T.DoubleSide });
    if (maxOK) { m.blending = T.CustomBlending; m.blendEquation = T.MaxEquation; m.blendSrc = T.OneFactor; m.blendDst = T.OneFactor; }
    else m.blending = T.AdditiveBlending;
    return m;
  }
  function tex(src) {
    const t = new T.TextureLoader().load(src, () => { key = ''; });
    t.format = T.LuminanceFormat; t.generateMipmaps = R.capabilities.isWebGL2;
    t.minFilter = t.generateMipmaps ? T.LinearMipmapLinearFilter : T.LinearFilter; t.anisotropy = Math.min(4, R.capabilities.getMaxAnisotropy());
    return t;
  }
  function init() {
    R = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: false, powerPreference: 'high-performance' });
    R.setClearColor(0x000000, 1);
    maxOK = R.capabilities.isWebGL2 || !!R.extensions.get('EXT_blend_minmax');
    scene = new T.Scene();
    cam = new T.PerspectiveCamera(30, 1, .02, 60); cam.matrixAutoUpdate = true;
    const s = mobile ? '-s' : '';
    SEQ.forEach(k => { TX[k] = tex(`${opts.dir}${k}${s}.jpg?v=${opts.v}`); });
    build(); size();
    fonts().then(walls).catch(() => walls());
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
  function lineObj(pts, kind) {      // pts: [x0,y0,z0, x1,y1,z1, aT0, aT1, aD]
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
    // the page frame, drawn round; it narrows to the corridor's mouth as the page opens
    LN.frame = lineObj([[0, 0, 0, 0, 0, 0, 0, 1, 0], [0, 0, 0, 0, 0, 0, 0, 1, .25], [0, 0, 0, 0, 0, 0, 0, 1, .5], [0, 0, 0, 0, 0, 0, 0, 1, .75]]);
    LN.frame.material.uniforms.uC.value = new T.Color(0xcfccc6);
    // the corridor: four edges, the floor's and ceiling's ten column lines, rings at the six groups of stations, the back
    {
      const P = [], AT = [], AL = [];
      const long = (x, y) => { P.push(x, y, 0, x, y, 0); AT.push(0, 1); AL.push(1, 1); };
      const seg = (x0, y0, x1, y1, t) => { P.push(x0, y0, 0, x1, y1, 0); AT.push(t, t); AL.push(0, 0); };
      long(XL, YT); long(XR, YT); long(XL, YB); long(XR, YB);
      for (let j = 1; j < 9; j++) { const x = XL + WC * j / 9; long(x, YB); long(x, YT); }
      for (let j = 0; j <= 6; j++) {
        const t = j === 6 ? 1 : .03 + .94 * j / 6;
        seg(XL, YT, XR, YT, t); seg(XR, YT, XR, YB, t); seg(XR, YB, XL, YB, t); seg(XL, YB, XL, YT, t);
      }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(P, 3));
      g.setAttribute('aT', new T.Float32BufferAttribute(AT, 1)); g.setAttribute('aL', new T.Float32BufferAttribute(AL, 1));
      const m = mat(KVS, KFS, { uExt: { value: 0 }, uDp: { value: DEP } }); m.uniforms.uA.value = 0; m.uniforms.uC.value = new T.Color(0xa7a49e);
      LN.cor = new T.LineSegments(g, m); LN.cor.frustumCulled = false; scene.add(LN.cor);
    }
    built = true;
  }

  /* ---------- the corridor's type, set in the timetable's own faces once they have arrived ---------- */
  const FACE = { title: '"league-gothic", "League Gothic", "Arial Narrow", sans-serif', bold: '"superclarendon", "Clarendon", Georgia, serif', body: '"clarendon-text-pro", "Clarendon", Georgia, serif' };
  function canvasTex(c) {
    const t = new T.CanvasTexture(c); t.format = T.LuminanceFormat; t.generateMipmaps = R.capabilities.isWebGL2;
    t.minFilter = t.generateMipmaps ? T.LinearMipmapLinearFilter : T.LinearFilter; t.anisotropy = R.capabilities.getMaxAnisotropy(); return t;
  }
  function walls() {
    if (!R) return;
    const S = mobile ? 2048 : 4096, H = Math.round(S * HC / DEP);
    // left wall: the title as the 32 grid sets it, two lines in League Gothic, read from the mouth inwards
    {
      const c = document.createElement('canvas'); c.width = S; c.height = H; const x = c.getContext('2d');
      x.fillStyle = '#000'; x.fillRect(0, 0, S, H); x.fillStyle = '#fff'; x.textBaseline = 'alphabetic';
      let f = H * .5; x.font = `400 ${f}px ${FACE.title}`;
      const w0 = Math.max(...D_.title.map(l => x.measureText(l).width)); if (w0 > S * .985) f *= S * .985 / w0;
      x.font = `400 ${f}px ${FACE.title}`;
      const cap = x.measureText('H').actualBoundingBoxAscent || f * .74;
      D_.title.forEach((l, i) => x.fillText(l, S * .008, H * (i + .5) / 2 + cap / 2));
      TX.tw = canvasTex(c);
    }
    // right wall: the stations in their six groups, one band per group, the first nearest the mouth (the text runs
    // towards the mouth, so the first group sits at the canvas's right end)
    {
      const c = document.createElement('canvas'); c.width = S; c.height = H; const x = c.getContext('2d');
      x.fillStyle = '#000'; x.fillRect(0, 0, S, H); x.fillStyle = '#fff'; x.textBaseline = 'middle';
      const G = D_.groups, bw = S * .94 / 6;
      for (let g = 0; g < 6; g++) {
        const rows = D_.stations.slice(G[g], G[g + 1]), k = rows.length, lh = H * .9 / Math.max(k, 2), x0 = S * .03 + (5 - g) * bw + bw * .04;
        rows.forEach(([t, head], j) => {
          const fam = head ? `700 ${lh * .62}px ${FACE.bold}` : `400 ${lh * .66}px ${FACE.body}`; x.font = fam;
          const w = x.measureText(t).width, sc = Math.min(1, bw * .9 / w);
          x.save(); x.translate(x0, H * .05 + lh * (j + .5) + (H * .9 - lh * k) / 2); x.scale(sc, sc); x.fillText(t, 0, 0); x.restore();
        });
      }
      TX.sw = canvasTex(c);
    }
    // floor and ceiling: every time in the table (columns 0–8 on the floor, right to left; 9–17 on the ceiling, left to
    // right, as the reader lays them), one atlas of the strings that occur
    {
      const strs = [...new Set(D_.cells.flat().concat(D_.heads).filter(Boolean))], cw = mobile ? 128 : 256, ch = cw * .3125, per = Math.floor(S / cw);
      const c = document.createElement('canvas'); c.width = S; c.height = Math.ceil(strs.length / per) * ch; const x = c.getContext('2d');
      x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height); x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
      const at = {};
      strs.forEach((s, i) => {
        const cx = (i % per) * cw, cy = Math.floor(i / per) * ch, head = /m\.$/.test(s);
        x.font = head ? `700 ${ch * .5}px ${FACE.bold}` : `700 ${ch * .66}px ${FACE.body}`;
        const w = x.measureText(s).width, sc = Math.min(1, cw * .92 / w);
        x.save(); x.translate(cx + cw / 2, cy + ch * .54); x.scale(sc, sc); x.fillText(s, 0, 0); x.restore();
        at[s] = [cx / S, 1 - (cy + ch) / c.height, cw / S, ch / c.height];
      });
      const t = canvasTex(c);
      const P = [], UV = [], SS = [], IX = [];
      const G = D_.groups, rowS = r => { let g = 5; for (let j = 0; j < 6; j++) if (r >= G[j] && r < G[j + 1]) { g = j; break; } return (g + (r - G[g] + .5) / (G[g + 1] - G[g])) / 6; };
      const colW = WC / 9, qw = colW * .9, qh = qw * .3125;
      const add = (s, cx, z, ceil, sIn) => {
        const r = at[s]; if (!r) return; const n = P.length / 3, y = ceil ? YT - .002 : YB + .002, dz = ceil ? -qh / 2 : qh / 2;
        // floor: the text's top points into the corridor; ceiling: towards the mouth (both read upright from inside)
        P.push(cx - qw / 2, y, z + dz, cx + qw / 2, y, z + dz, cx + qw / 2, y, z - dz, cx - qw / 2, y, z - dz);
        UV.push(r[0], r[1], r[0] + r[2], r[1], r[0] + r[2], r[1] + r[3], r[0], r[1] + r[3]);
        SS.push(sIn, sIn, sIn, sIn); IX.push(n, n + 1, n + 2, n, n + 2, n + 3);
      };
      for (let c0 = 0; c0 < 18; c0++) {
        const ceil = c0 >= 9, cx = ceil ? XL + WC * (c0 - 9 + .5) / 9 : XL + WC * (1 - (c0 + .5) / 9);
        add(D_.heads[c0], cx, -.012 * DEP, ceil, 0);
        for (let r = 0; r < 25; r++) { const s = rowS(r); add(D_.cells[r][c0], cx, -(.03 + .94 * s) * DEP, ceil, s); }
      }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(P, 3));
      g.setAttribute('uv', new T.Float32BufferAttribute(UV, 2)); g.setAttribute('aS', new T.Float32BufferAttribute(SS, 1)); g.setIndex(IX);
      const m = mat(CVS, CFS, { tA: { value: t }, uIn: { value: 0 } }); m.uniforms.uA.value = 0;
      cells = new T.Mesh(g, m); cells.frustumCulled = false; scene.add(cells);
    }
    wallsReady = true; key = '';
  }

  function size() {
    if (!R) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    R.setPixelRatio(dpr); R.setSize(vw, vh, false);
    ov.width = Math.round(vw * dpr); ov.height = Math.round(vh * dpr);
    key = '';
  }
  let G0 = { headBottom: 60, m: 20 };
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
    const o = aim(p, V3(0, 0, 0));
    return { p, q: o.quaternion.clone(), tg: V3(0, 0, 0), P11: P11F, e8: -nC.x, e9: -nC.y };
  }
  function look(p, t, P11, e8, e9) { const o = aim(p, t); return { p, q: o.quaternion.clone(), tg: t, P11, e8, e9 }; }
  function mix(a, b, t) { return { p: a.p.clone().lerp(b.p, t), q: a.q.clone().slerp(b.q, t), tg: a.tg.clone().lerp(b.tg, t), P11: lerp(a.P11, b.P11, t), e8: lerp(a.e8, b.e8, t), e9: lerp(a.e9, b.e9, t) }; }
  function camAt(u) {
    if (u < FOLD[0]) {
      // the fields lift a little as they move; the view turns off the page just enough to see it
      const yaw = lerp(-.15, .11, smt(1.6, 4.05, u)) * smt(1.0, 1.65, u) * (1 - smt(4.05, FOLD[0] + .02, u));
      const pitch = .075 * smt(1.0, 1.65, u) * (1 - smt(4.05, FOLD[0] + .02, u));
      return orbit(yaw, pitch);
    }
    if (u < WALK[0]) { const t = eio(smt(FOLD[0] + .05, FOLD[0] + .8, u)); return reg(lerp(0, EX, t), lerp(0, EY, t), lerp(dF, DE, t)); }
    const eye = reg(EX, EY, DE), t1 = eio(smt(WALK[0], 6.55, u)), t2 = eio(smt(6.35, WALK[1], u));
    const P11W = vw > vh ? 1.6 : 1.0, ncx = -nC.x * .4, ncy = -nC.y * .4;
    const w1 = look(V3(.02, -.1, -.55), V3(.02, -.24, -6.5), P11W, ncx, ncy);
    const w2 = look(V3(-.04, -.2, -.5 * DEP), V3(.06, -.27, -DEP), P11W * 1.05, ncx * .5, ncy * .5);
    return mix(mix(eye, w1, t1), w2, t2);
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
    let a = 's0', b = 's0', t = 0, mv = 0;
    for (let i = 1; i < SEQ.length; i++) {
      const m = MOVES[SEQ[i]];
      if (u >= m[0]) { a = SEQ[i - 1]; b = SEQ[i]; t = clamp((u - m[0]) / (m[1] - m[0]), 0, 1); mv = i; }
    }
    if (t >= 1) { a = b; t = 0; }
    return { a, b, t };
  }
  const QY = a => new T.Quaternion().setFromAxisAngle(V3(0, 1, 0), a), QX = a => new T.Quaternion().setFromAxisAngle(V3(1, 0, 0), a);
  /* the fold: the page opens like a box. Title and stations swing on the frame's sides like doors into the depth (the
     title hinged at its left edge onto the left wall, the stations at their right edge onto the right), the time
     matrix falls back on the bottom edge to the floor and a ghost of it rises on the top edge to the ceiling; page and
     service go straight back to the end wall; table number and footnotes fall away into the dark. Nothing passes in
     front of the page. */
  const FOLDT = [[.14, .66], [.05, .42], [.32, .8], [.32, .8], [.2, .7], [.26, .76], [.05, .42], [.3, .8]];
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
      case 2: { const h = lerp(r.h, .5, t), w = h * r.w / r.h; return { pos: V3(lerp(r.x, 0, t), lerp(r.y, YC - .06, t), -DEP * eio(t)), q: new T.Quaternion(), w, h }; }
      case 3: { const w = lerp(r.w, WC * .86, t), h = w * r.h / r.w; return { pos: V3(lerp(r.x, 0, t), lerp(r.y, YT - .1, t), -DEP * eio(t)), q: new T.Quaternion(), w, h }; }
      default: return { pos: V3(r.x, r.y, -1.4 * t), q: new T.Quaternion(), w: r.w, h: r.h };
    }
  }

  function step(u) {
    if (u > -1.8) load();
    photo.style.opacity = smt(PH[0], PH[1], u).toFixed(3);
    if (!R || !built) return 1;
    const k0 = `${u.toFixed(4)}|${vw}|${vh}|${wallsReady}` + swayEase();
    if (k0 === key) return 1;
    key = k0;
    const out = 1 - smt(OUT[0], OUT[1], u), fin = smt(IN[0], IN[1], u);
    const c = camAt(u); apply(c, (1 - smt(OUT[0] - .3, OUT[1], u)) * (u < FOLD[0] ? 1 : u < WALK[0] ? .4 : .8));
    const fog0 = u < FOLD[0] ? 30 : lerp(30, 2.2, smt(FOLD[0], FOLD[0] + .6, u)), fog1 = u < FOLD[0] ? 60 : lerp(60, DEP * 1.25, smt(FOLD[0], FOLD[0] + .6, u));
    const fp = clamp((u - FOLD[0]) / (FOLD[1] - FOLD[0]), 0, 1);

    // pages: each layout's whole picture shows while it holds, dims while its fields move away
    const S = seg(u);
    const parseDim = smt(PARSE[0], PARSE[0] + .35, u);
    PAGES.forEach(q => {
      let a = 0;
      if (q.k === S.a) a = 1 - smt(0, .18, S.t);
      if (q.k === S.b && S.t > 0) a = Math.max(a, smt(.78, 1, S.t));
      if (q.k === 's0') a *= lerp(1, .2, parseDim);
      if (q.k === 'g32') a *= 1 - smt(FOLD[0], FOLD[0] + .1, u);
      const r = pageRect(FULL); q.matrix.compose(V3(r.x, r.y, 0), new T.Quaternion(), V3(r.w, r.h, 1)); q.matrixWorldNeedsUpdate = true;
      const U = q.material.uniforms; U.uA.value = a * fin * out; U.uF0.value = fog0; U.uF1.value = fog1; q.visible = U.uA.value > .002;
    });

    // the fields
    BL.forEach(b => {
      const lay = k => D_.blocks[k][b.i];
      const k0 = S.a, k1 = S.b, st = b.i * .05, t = S.t > 0 ? eio(clamp((S.t - st) / (1 - .3), 0, 1)) : 0;
      const ra = pageRect(lay(k0)), rb = pageRect(lay(k1));
      let pos = V3(lerp(ra.x, rb.x, t), lerp(ra.y, rb.y, t), .045 * Math.sin(Math.PI * t) * (1 + b.i * .12)), q = new T.Quaternion(), w = lerp(ra.w, rb.w, t), h = lerp(ra.h, rb.h, t);
      let tA = TX[k0], tB = TX[k1], rA = uvRect(lay(k0)), rB = uvRect(lay(k1)), m = smt(.25, .75, t), a = 1;
      if (b.ghost) a = 0;
      // into the corridor
      if (u > FOLD[0]) {
        const r32 = pageRect(lay('g32')), f = FOLDT[b.ghost ? 7 : b.i], tt = clamp((fp - f[0]) / (f[1] - f[0]), 0, 1), fpz = foldPose(b, eio(tt), r32);
        pos = fpz.pos; q = fpz.q; w = fpz.w; h = fpz.h; tA = TX.g32; rA = uvRect(lay('g32')); tB = TX.g32; rB = rA; m = 0;
        const k = b.ghost ? 7 : b.i, wall = k === 0 ? 'tw' : k === 4 ? 'sw' : '';
        if (wall && TX[wall]) { tB = TX[wall]; rB = new T.Vector4(0, 0, 1, 1); m = smt(.7, 1, tt); }
        if (k === 5) a = 1 - smt(.6, .95, fp) * (wallsReady ? 1 : .5);
        else if (k === 7) a = smt(0, .25, tt) * .7 * (1 - smt(.6, .95, fp));
        else if (k === 1 || k === 6) a = 1 - eio(tt);
      }
      b.m.compose(pos, q, V3(Math.max(w, 1e-4), Math.max(h, 1e-4), 1));
      b.q.matrix.copy(b.m); b.q.matrixWorldNeedsUpdate = true; b.o.matrix.copy(b.m); b.o.matrixWorldNeedsUpdate = true;
      const U = b.q.material.uniforms;
      U.tA.value = tA; U.tB.value = tB; U.rA.value = rA; U.rB.value = rB; U.uM.value = m;
      U.uA.value = a * (u < PARSE[0] ? smt(PARSE[0] - .05, PARSE[0] + .05, u) : 1) * out; U.uF0.value = fog0; U.uF1.value = fog1;
      b.q.visible = U.uA.value > .002;
      // the field's outline: drawn as the scan is parsed, strongest while fields move, faint while a layout holds
      const moving = S.t > 0 && S.t < 1 ? Math.sin(Math.PI * S.t) : 0;
      let oa = smt(PARSE[0] + b.i * .05, PARSE[0] + .2 + b.i * .05, u) * (u < MOVES.s8[0] ? .6 : .2 + .45 * moving);
      if (u > FOLD[0]) oa = .32 * (1 - smt(.7, 1, fp));
      if (b.ghost && u <= FOLD[0]) oa = 0;
      b.o.material.uniforms.uA.value = oa * a * out; b.o.material.uniforms.uF0.value = fog0; b.o.material.uniforms.uF1.value = fog1;
      b.o.visible = b.o.material.uniforms.uA.value > .002;
    });

    // grids: drawn in as the fields head for them, gone once the next one comes
    const gA = (k, a0, a1) => smt(a0, a0 + .25, u) * (1 - smt(a1, a1 + .25, u));
    const gD = (k, a0) => smt(a0, a0 + .45, u);
    [['g8', MOVES.s8[0], MOVES.g20[0]], ['g20', MOVES.g20[0], MOVES.g32[0]], ['g32', MOVES.g32[0], FOLD[0]]].forEach(([k, a0, a1]) => {
      const U = LN[k].material.uniforms; U.uA.value = gA(k, a0, a1) * .55 * out; U.uDraw.value = gD(k, a0); LN[k].visible = U.uA.value > .002;
    });
    // the frame: the page's edge, then the corridor's mouth
    {
      const tf = eio(smt(FOLD[0] + .1, FOLD[0] + .7, u)), x0 = lerp(-A / 2, XL, tf), x1 = lerp(A / 2, XR, tf), y0 = lerp(.5, YT, tf), y1 = lerp(-.5, YB, tf);
      const p = LN.frame.geometry.attributes.position, s = [[x0, y0, x1, y0], [x1, y0, x1, y1], [x1, y1, x0, y1], [x0, y1, x0, y0]];
      s.forEach((l, i) => { p.setXYZ(2 * i, l[0], l[1], 0); p.setXYZ(2 * i + 1, l[2], l[3], 0); }); p.needsUpdate = true;
      const U = LN.frame.material.uniforms; U.uDraw.value = smt(IN[0] + .05, IN[1] + .2, u); U.uA.value = .55 * out * (1 - .5 * smt(WALK[0], WALK[0] + .5, u)); U.uF0.value = fog0; U.uF1.value = fog1;
    }
    // the corridor and its type
    {
      const U = LN.cor.material.uniforms; U.uExt.value = eio(smt(.1, .72, fp)); U.uA.value = smt(.05, .2, fp) * .5 * out; U.uF0.value = fog0; U.uF1.value = fog1;
      LN.cor.visible = U.uA.value > .002;
      if (cells) { const C = cells.material.uniforms; C.uIn.value = smt(.58, 1, fp); C.uA.value = out; C.uF0.value = fog0; C.uF1.value = fog1; cells.visible = fp > .5; }
    }
    R.render(scene, cam);
    labels(u, fp, out);
    return 1;
  }

  /* ---------- words: the layout's name above the page, the fields' names as the scan is parsed, the walls' as they fold ---------- */
  function labels(u, fp, out) {
    ox.setTransform(1, 0, 0, 1, 0, 0); ox.clearRect(0, 0, ov.width, ov.height);
    ox.setTransform(dpr, 0, 0, dpr, 0, 0); ox.font = font; ox.textBaseline = 'alphabetic';
    // caption
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
    // the corridor's surfaces, named as the fields land on them
    const f = smt(.66, .8, fp) * (1 - smt(WALK[0] + .15, WALK[0] + .45, u)) * out;
    if (f > .01) {
      pin(V3(XL, YT - .08, -.7), 'Title, left wall', f, 1);
      pin(V3(XR, YB + .1, -.7), 'Stations, right wall', f, -1);
      pin(V3(XL + WC * .3, YB, -.45), 'Times, floor and ceiling', f, 1);
      pin(V3(.12, YC + .2, -DEP), 'Page and service, end wall', f, 1);
    }
    ox.globalAlpha = 1;
  }
  return { load, layout, step, END, PHOTO: PH[1] + .05 };
};

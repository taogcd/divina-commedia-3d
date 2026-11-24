/* BRICK, drawn in light on black, in the Commedia's language of fine lines and points rather than in materials.
   How the work was made: fourteen two-cavity moulds stand on a vibrating table (a deck on four coil springs, the motor
   beneath, all in faint line). Cement is poured in as falling dust; shaken, it settles and the block rises inside each
   cavity as a stack of contour lines, the wet level glowing as it climbs. While it is wet, nails are pressed in by hand:
   each a bright line slid down its own axis into the block (seen through it, how deep it goes), round heads as points,
   rebar with its ribs, the odd bolt, nut or washer; some blocks left bare, one marked 1103 in points. The shaking stops,
   the moulds lift away, the table sinks into the dark, and the twenty-eight blocks settle into four rows of seven, as
   they stand in the installation. The camera starts straight above the table, comes round and down among the nails,
   stands back for the rows, then closes on one block until its lines lie exactly on the photograph of it.
   step(u): u = screen heights of scroll since the frame pinned. Needs THREE (r128). */
window.BRStage = function (frame, opts) {
  'use strict';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smt = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const eio = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  // timeline (u)
  const FILL = [.35, 1.0], VIB = [.3, 3.0], NAIL = [1.4, 2.65], LIFT = [3.0, 3.5], DRY = [3.0, 3.9], DOWN = [3.2, 3.95];
  const PH = [4.6, 5.05], END = 5.35;
  // the work: 4 × 7 cubes of 15 cm, set out 20 cm apart; the table 55 cm high
  const ROWS = 4, COLS = 7, B = .15, PITCH = .2, TT = .55, WT = .006;
  const MZ = 2 * B + 3 * WT, MP = MZ + .045, WH = B + .012;
  const DW = COLS * PITCH + .1, DD = 2 * MP + .06;
  // each block's handful, after the top-view photograph (back row first): n nails, r rebar, b bolts, k nuts, w washers;
  // 0 = bare; 'm' = bare, marked 1103
  const RECIPE = [
    [{ n: 45 }, { n: 32, r: 1 }, { n: 22, r: 2, b: 1 }, { n: 46 }, 0, { n: 6, r: 13 }, { n: 22, r: 2, b: 1, k: 1 }],
    [0, { n: 14, r: 1, w: 1 }, 0, { n: 42, r: 2 }, { n: 38, r: 2, k: 1 }, { n: 68 }, 0],
    [{ n: 56 }, 0, { n: 50, r: 1 }, { n: 26, r: 12 }, { n: 40 }, 'm', { n: 70 }],
    [{ n: 88, r: 1 }, { n: 60 }, { n: 9, b: 4 }, 0, { n: 64, r: 6, w: 1 }, { n: 58, b: 2, k: 2 }, 0],
  ];
  const HERO = 3 * COLS + 2;                                 // the block in the closing photograph: front row, four bolts
  // the photograph's camera, solved from the block's three top corners in it (16:9, 28° vertical), relative to the block
  const PV = 28, PC = [.1955, .1838, .3144], PF = [-.5521, -.0883, -.8291];

  frame.classList.add('br');
  const cv = document.createElement('canvas'); cv.className = 'ws-cv'; cv.setAttribute('aria-hidden', 'true');
  const photo = document.createElement('img'); photo.className = 'ws-photo'; photo.alt = ''; photo.decoding = 'async';
  const ov = document.createElement('canvas'); ov.className = 'ws-cv'; ov.setAttribute('aria-hidden', 'true');
  frame.appendChild(cv); frame.appendChild(photo); frame.appendChild(ov);
  const ox = ov.getContext('2d');
  let T = null, R = null, scene, cam, vw = 1, vh = 1, dpr = 1, mobile = false, loaded = 0, key = '', built = false, font = '';
  let lineMat = null, ptMat = null;
  const BL = [];

  function js(src) { return new Promise((res, rej) => { const el = document.createElement('script'); el.src = src; el.onload = res; el.onerror = rej; document.head.appendChild(el); }); }
  function load() {
    if (loaded) return; loaded = 1;
    photo.src = opts.photo;
    (window.THREE ? Promise.resolve() : js(opts.three)).then(() => { T = window.THREE; init(); key = ''; }).catch(e => console.warn('BRICK world off:', e));
  }
  let seed = 1103;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  /* ---------- one shader for everything: what a vertex is (kind) decides how it moves and when it shows ----------
     aB: the block's (or mould's) place on the table (xy) and on the floor (zw); aK: kind, h, delay, hero; aX: a nail's
     axis, or a dust mote's randomness. Kinds: 0 block contour (h = height in the block; h < 0: the top of a vertical edge),
     1 cement dust, 2 nail line, 3 nail head, 4 mould line, 5 table line (h = 1: does not shake), 6 the 1103 points,
     7 motes in the dark. */
  const VS = `
    attribute vec4 aB, aK; attribute vec3 aX;
    uniform float uU, uVib, uDown, uLift, uDry, uFocus, uTT, uB, uNear, uFar, uPS;
    varying float vA;
    float eo3(float t){ t = clamp(t, 0., 1.); return 1. - (1. - t) * (1. - t) * (1. - t); }
    void main(){
      float k = aK.x, h = aK.y, dl = aK.z, hero = aK.w;
      vec3 p = position; float a = 1.;
      float sx = sin(uU * 140.) * .0024 * uVib, sz = cos(uU * 173.) * .0012 * uVib;
      vec2 bxz = mix(aB.xy, aB.zw, uDown);
      vec3 base = vec3(bxz.x + sz, uTT * (1. - uDown) + sx, bxz.y);
      float fill = eo3((uU - ${FILL[0].toFixed(2)} - dl) / ${(FILL[1] - FILL[0]).toFixed(2)});
      float wet = 1. - uDry;
      if (k < .5) {
        if (h < 0.) { p.y = uB * fill; a = step(.002, fill) * .62; }
        else {
          a = step(h, fill + .0005) * (.26 + .1 * wet);
          a += (1. - smoothstep(0., .07, abs(fill - h))) * step(fill, .995) * .9;          // the wet level, climbing
          p.xz *= 1. + sin(uU * 52. + h * 20. + dl * 40.) * .03 * uVib * wet;          // the shaking runs through it
        }
        p += base;
      } else if (k < 1.5) {
        float t = clamp((uU - ${FILL[0].toFixed(2)} - dl - h * .45) / .32, 0., 1.);
        p.y += (1. - eo3(t)) * (.22 + aX.x * .45);
        p += (aX - .5) * .012 * uVib * sin(uU * 90. + aX.y * 50.);
        a = step(.001, t) * (.42 - .22 * uDry);
        p += base;
      } else if (k < 3.5) {
        float f = clamp((uU - dl) / .3, 0., 1.);
        p += aX * (1. - eo3(f)) * .16;
        a = step(.0001, f) * (k < 2.5 ? .66 : .95);
        p += base;
      } else if (k < 4.5) {
        p += vec3(aB.x + sz, uTT + sx + uLift * .7, aB.y);
        a = .42 * (1. - smoothstep(.2, 1., uLift));
      } else if (k < 5.5) {
        p += vec3(sz, sx, 0.) * (1. - h) - vec3(0., uDown * (uTT + .25), 0.);
        a = .34 * (1. - smoothstep(.55, 1., uDown));
      } else if (k < 6.5) {
        p += base; a = uDry * .8;
      } else {
        p += vec3(sin(uU * .21 + aX.x * 30.) * .06, sin(uU * .17 + aX.y * 40.) * .04, cos(uU * .19 + aX.z * 20.) * .06);
        a = .22 + .3 * aX.z;
      }
      if (k < 3.5 || (k > 5.5 && k < 6.5)) a *= mix(1., hero > .5 ? 1. : .1, uFocus);
      vec4 mv = modelViewMatrix * vec4(p, 1.);
      float d = -mv.z;
      a *= 1. - smoothstep(uNear, uFar, d);
      a *= smoothstep(.015, .05, d);
      vA = a;
      gl_Position = projectionMatrix * mv;
      #ifdef POINTS
        bool head = k > 2.5 && k < 3.5;
        gl_PointSize = clamp(uPS * (head ? .0075 : .0032) / d, 1., head ? 7. : 3.);
      #endif
    }`;
  const FS = `
    precision mediump float; varying float vA; uniform float uA;
    void main(){
      #ifdef POINTS
        vec2 c = gl_PointCoord - .5; float r = dot(c, c); if (r > .25) discard;
        gl_FragColor = vec4(vec3(.93, .92, .9) * vA * uA * (1. - r * 2.), 1.);
      #else
        gl_FragColor = vec4(vec3(.93, .92, .9) * vA * uA, 1.);
      #endif
    }`;

  function init() {
    if (!T || built) return;
    try { R = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: false }); } catch (e) { console.warn('BRICK world off:', e); return; }
    R.setClearColor(0x000000, 1);
    scene = new T.Scene(); cam = new T.PerspectiveCamera(35, 1, .005, 60);
    const L = { p: [], b: [], k: [], x: [] }, Pp = { p: [], b: [], k: [], x: [] };
    const put = (G, x, y, z, b, k, ax) => { G.p.push(x, y, z); G.b.push(...b); G.k.push(...k); G.x.push(...(ax || [0, 0, 0])); };
    const seg = (b, k, ax, x0, y0, z0, x1, y1, z1, k1) => { put(L, x0, y0, z0, b, k, ax); put(L, x1, y1, z1, b, k1 || k, ax); };
    const loop = (b, k, ax, pts) => { for (let i = 0; i < pts.length; i++) { const q = pts[i], r = pts[(i + 1) % pts.length]; seg(b, k, ax, q[0], q[1], q[2], r[0], r[1], r[2]); } };
    const V3 = (x, y, z) => new T.Vector3(x, y, z);

    // the blocks: on the table two to a mould; on the floor four rows of seven
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const m = r < 2 ? 0 : 1, sideZ = r % 2 ? 1 : -1, tx = (c - (COLS - 1) / 2) * PITCH;
      BL.push({ r, c, tab: [tx, (m - .5) * MP + sideZ * (B / 2 + WT / 2)], flo: [tx, (r - (ROWS - 1) / 2) * PITCH], fd: rnd() * .25, rec: RECIPE[r][c] });
    }
    const NR = mobile ? 10 : 14, NDUST = mobile ? 120 : 220, hb = B / 2;
    BL.forEach((bk, bi) => {
      const b = [bk.tab[0], bk.tab[1], bk.flo[0], bk.flo[1]], hero = bi === HERO ? 1 : 0;
      for (let i = 0; i < NR; i++) {
        const h = i / (NR - 1), y = h * B, kk = [0, h, bk.fd, hero];
        loop(b, kk, null, [[-hb, y, -hb], [hb, y, -hb], [hb, y, hb], [-hb, y, hb]]);
      }
      [[-hb, -hb], [hb, -hb], [hb, hb], [-hb, hb]].forEach(([x, z]) => seg(b, [0, 0, bk.fd, hero], null, x, 0, z, x, 0, z, [0, -1, bk.fd, hero]));
      for (let i = 0; i < NDUST; i++) {
        const h = rnd();
        put(Pp, (rnd() - .5) * B * .96, h * B, (rnd() - .5) * B * .96, b, [1, h, bk.fd, hero], [rnd(), rnd(), rnd()]);
      }
      const RC = bk.rec;
      if (RC === 'm') {                                      // 1103, in points on the top
        const c2 = document.createElement('canvas'); c2.width = 128; c2.height = 128; const x2 = c2.getContext('2d');
        x2.translate(64, 66); x2.rotate(-.12); x2.transform(1, 0, -.2, 1, 0, 0); x2.fillStyle = '#fff'; x2.font = '400 40px "Bradley Hand","Segoe Print",cursive'; x2.textAlign = 'center'; x2.textBaseline = 'middle'; x2.fillText('1103', 0, 0);
        const d2 = x2.getImageData(0, 0, 128, 128).data;
        for (let j = 0; j < 128; j += 2) for (let i = 0; i < 128; i += 2) if (d2[(j * 128 + i) * 4 + 3] > 120) put(Pp, (i / 128 - .5) * B * .9, B + .0008, (j / 128 - .5) * B * .9, b, [6, 1, bk.fd, hero]);
      }
      if (!RC || RC === 'm') return;
      // the handful, pressed in back to front, left to right
      const add = (kind, n) => {
        for (let q = 0; q < (n || 0); q++) {
          let len, rad, tilt;
          if (kind === 0) { len = .045 + rnd() * .04; tilt = Math.pow(rnd(), .9) * 1.25; }
          else if (kind === 1) { len = .07 + rnd() * .1; tilt = .3 + rnd() * 1.1; }
          else if (kind === 2) { len = .045 + rnd() * .03; rad = .011 + rnd() * .003; tilt = rnd() * .35; }
          else { len = 0; rad = kind === 3 ? .015 : .016; tilt = rnd() * .5; }
          const az = rnd() * 6.283, ax = V3(Math.sin(tilt) * Math.cos(az), Math.cos(tilt), Math.sin(tilt) * Math.sin(az));
          const lim = kind >= 2 ? .3 : .42, px = (rnd() * 2 - 1) * B * lim, pz = (rnd() * 2 - 1) * B * lim;
          const dep = kind >= 3 ? -.001 : kind === 2 ? len * (.35 + rnd() * .2) : len * (.25 + rnd() * .3);
          const t0 = NAIL[0] + (bk.c / COLS) * .6 + (bk.r / ROWS) * .25 + rnd() * .35, kk = [2, 0, t0, hero], AX = [ax.x, ax.y, ax.z];
          const tip = V3(px, B, pz).addScaledVector(ax, -dep), head = tip.clone().addScaledVector(ax, len);
          // a frame across the axis, for the outlines of bolts and rings
          const e1 = V3(1, 0, 0).cross(ax); if (e1.lengthSq() < .01) e1.set(0, 0, 1); e1.normalize(); const e2 = ax.clone().cross(e1).normalize();
          const circ = (c, rr, nseg) => { const pts = []; for (let i = 0; i < nseg; i++) { const an = i / nseg * 6.283; pts.push(c.clone().addScaledVector(e1, Math.cos(an) * rr).addScaledVector(e2, Math.sin(an) * rr).toArray()); } return pts; };
          if (kind <= 1) {
            seg(b, kk, AX, tip.x, tip.y, tip.z, head.x, head.y, head.z);
            if (kind === 0) put(Pp, head.x, head.y, head.z, b, [3, 0, t0, hero], AX);
            else for (let i = 1; i < 9; i++) {                // rebar: its ribs
              const c = tip.clone().addScaledVector(ax, len * i / 9), w = .006;
              const p0 = c.clone().addScaledVector(e1, -w).addScaledVector(ax, -.003), p1 = c.clone().addScaledVector(e1, w).addScaledVector(ax, .003);
              seg(b, kk, AX, p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
            }
          } else if (kind === 2) {                              // a bolt: two rims and four sides
            const c0 = circ(tip, rad, 16), c1 = circ(head, rad, 16); loop(b, kk, AX, c0); loop(b, kk, AX, c1);
            for (let j = 0; j < 16; j += 4) seg(b, kk, AX, c0[j][0], c0[j][1], c0[j][2], c1[j][0], c1[j][1], c1[j][2]);
          } else {                                              // a nut (six sides) or a washer (a ring), lying on the top
            const c = V3(px, B + .004, pz);
            loop(b, kk, AX, circ(c, rad, kind === 3 ? 6 : 16)); loop(b, kk, AX, circ(c, rad * (kind === 3 ? .5 : .45), 12));
          }
        }
      };
      add(0, RC.n); add(1, RC.r); add(2, RC.b); add(3, RC.k); add(4, RC.w);
    });
    // the moulds: outer box, the wall between the two cavities, a lifting ring at each end
    for (let m = 0; m < 2; m++) for (let c = 0; c < COLS; c++) {
      const b = [(c - (COLS - 1) / 2) * PITCH, (m - .5) * MP, 0, 0], kk = [4, 0, 0, 0], X = (B + 2 * WT) / 2, Z = MZ / 2;
      [0, WH].forEach(y => loop(b, kk, null, [[-X, y, -Z], [X, y, -Z], [X, y, Z], [-X, y, Z]]));
      [[-X, -Z], [X, -Z], [X, Z], [-X, Z]].forEach(([x, z]) => seg(b, kk, null, x, 0, z, x, WH, z));
      seg(b, kk, null, -X, WH, 0, X, WH, 0); seg(b, kk, null, -X, 0, 0, -X, WH, 0); seg(b, kk, null, X, 0, 0, X, WH, 0);
      [-1, 1].forEach(s => { const pts = []; for (let i = 0; i < 14; i++) { const an = i / 14 * 6.283; pts.push([Math.cos(an) * .016, B * .72 + Math.sin(an) * .016, s * (Z + .012)]); } loop(b, kk, null, pts); });
    }
    // the table: the deck, its frame and legs, four coil springs, the motor under the deck
    const t0 = [0, 0, 0, 0], kS = [5, 0, 0, 0], kF = [5, 1, 0, 0], X = DW / 2, Z = DD / 2, y1 = TT - .03;
    [y1, TT].forEach(y => loop(t0, kS, null, [[-X, y, -Z], [X, y, -Z], [X, y, Z], [-X, y, Z]]));
    [[-X, -Z], [X, -Z], [X, Z], [-X, Z]].forEach(([x, z]) => seg(t0, kS, null, x, y1, z, x, TT, z));
    const lx = X - .1, lz = Z - .1, yf = TT - .16;
    [[-lx, -lz], [lx, -lz], [lx, lz], [-lx, lz]].forEach(([x, z]) => {
      seg(t0, kF, null, x - .025, 0, z, x - .025, yf, z); seg(t0, kF, null, x + .025, 0, z, x + .025, yf, z);
      let prev = null; for (let i = 0; i <= 72; i++) { const t = i / 72, an = t * 6.283 * 6; const q = [x + Math.cos(an) * .03, yf + t * (y1 - yf), z + Math.sin(an) * .03]; if (prev) seg(t0, kS, null, prev[0], prev[1], prev[2], q[0], q[1], q[2]); prev = q; }
    });
    [-lz, lz].forEach(z => seg(t0, kF, null, -lx, yf, z, lx, yf, z));
    [-lx, lx].forEach(x => seg(t0, kF, null, x, yf, -lz, x, yf, lz));
    for (const s of [-.15, .15]) { const pts = []; for (let i = 0; i < 20; i++) { const an = i / 20 * 6.283; pts.push([s, TT - .11 + Math.cos(an) * .075, Math.sin(an) * .075]); } loop(t0, kS, null, pts); }
    for (let i = 0; i < 8; i++) { const an = i / 8 * 6.283; seg(t0, kS, null, -.15, TT - .11 + Math.cos(an) * .075, Math.sin(an) * .075, .15, TT - .11 + Math.cos(an) * .075, Math.sin(an) * .075); }
    // motes in the dark
    for (let i = 0; i < (mobile ? 260 : 600); i++) put(Pp, (rnd() - .5) * 4, rnd() * 1.6, (rnd() - .5) * 4, t0, [7, 0, 0, 0], [rnd(), rnd(), rnd()]);

    const geo = G => {
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(G.p, 3)); g.setAttribute('aB', new T.Float32BufferAttribute(G.b, 4));
      g.setAttribute('aK', new T.Float32BufferAttribute(G.k, 4)); g.setAttribute('aX', new T.Float32BufferAttribute(G.x, 3));
      g.boundingSphere = new T.Sphere(new T.Vector3(), 100); return g;
    };
    const uni = () => ({ uU: { value: 0 }, uVib: { value: 0 }, uDown: { value: 0 }, uLift: { value: 0 }, uDry: { value: 0 }, uFocus: { value: 0 },
      uTT: { value: TT }, uB: { value: B }, uNear: { value: 3 }, uFar: { value: 9 }, uPS: { value: 600 }, uA: { value: 1 } });
    lineMat = new T.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, uniforms: uni(), transparent: true, depthWrite: false, depthTest: false, blending: T.AdditiveBlending });
    ptMat = new T.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, uniforms: uni(), transparent: true, depthWrite: false, depthTest: false, blending: T.AdditiveBlending, defines: { POINTS: 1 } });
    const lines = new T.LineSegments(geo(L), lineMat), pts = new T.Points(geo(Pp), ptMat);
    lines.frustumCulled = pts.frustumCulled = false; scene.add(lines); scene.add(pts);
    built = true; size();
  }

  // projection: free while the model is explained; at the end exactly the photograph's, shown full-screen (cover)
  let tJ = .3, tP = .25;
  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    ov.width = Math.round(vw * dpr); ov.height = Math.round(vh * dpr);
    const a = vw / vh, iw = opts.photoW || 16, ih = opts.photoH || 9, sc = Math.max(vw / iw, vh / ih);
    tP = Math.tan(PV * Math.PI / 360) * vh / (ih * sc);
    tJ = Math.max(Math.tan(17.5 * Math.PI / 180), Math.tan(17.5 * Math.PI / 180) * 1.5 / a);
    if (!R || !built) return;
    R.setPixelRatio(dpr); R.setSize(vw, vh, false);
    cam.aspect = a; cam.updateProjectionMatrix();
    lineMat.uniforms.uPS.value = ptMat.uniforms.uPS.value = vh / (2 * tJ) * dpr;
    key = '';
  }
  function layout(w, h, g) { vw = w; vh = h; mobile = vw < 700; font = `400 ${g.t}px ${g.font}`; size(); }

  const V = (x, y, z) => new T.Vector3(x, y, z);
  const cr = (p0, p1, p2, p3, t) => { const t2 = t * t, t3 = t2 * t; return .5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3); };
  const crv = (a, b, c, d, t) => V(cr(a.x, b.x, c.x, d.x, t), cr(a.y, b.y, c.y, d.y, t), cr(a.z, b.z, c.z, d.z, t));
  function keys() {
    const a = vw / vh, tH = tJ * a, H0 = Math.max(DW / 2 / (tH * .9), DD / 2 / (tJ * .72));
    const hb = BL[HERO], fp = V(hb.flo[0] + PC[0], PC[1], hb.flo[1] + PC[2]);
    return [
      { u: 0, p: V(0, TT + H0, .002), t: V(0, TT, 0) },
      { u: .95, p: V(.95, TT + .95, 1.25), t: V(0, TT, .05) },
      { u: 1.85, p: V(.95, TT + .36, .78), t: V(.12, TT + .1, .04) },
      { u: 2.6, p: V(-.66, TT + .34, .66), t: V(-.05, TT + .1, -.04) },
      { u: 3.3, p: V(-1.35, TT + .6, 1.45), t: V(0, TT * .6, 0) },
      { u: 3.95, p: V(.25, .48, 1.6), t: V(0, .05, -.05) },
      { u: PH[0], p: fp, t: fp.clone().add(V(PF[0], PF[1], PF[2])) },
    ];
  }

  function step(u) {
    if (u > -1.8) load();
    photo.style.opacity = smt(PH[0], PH[1], u).toFixed(3);
    if (!R || !built) return 1;
    const k0 = `${u.toFixed(4)}|${vw}|${vh}`;
    if (k0 === key) return 1;
    key = k0;
    const vib = smt(VIB[0], VIB[0] + .15, u) * (1 - smt(VIB[1] - .2, VIB[1], u));
    const down = eio(clamp((u - DOWN[0]) / (DOWN[1] - DOWN[0]), 0, 1)), lift = eio(clamp((u - LIFT[0]) / (LIFT[1] - LIFT[0]), 0, 1));
    const toPhoto = smt(3.95, PH[0], u), focus = smt(4.0, PH[0] - .05, u);
    // the camera
    const K = keys(), uu = clamp(u, 0, PH[0]);
    let i = 0; while (i < K.length - 2 && uu > K[i + 1].u) i++;
    const a = K[Math.max(0, i - 1)], b = K[i], c = K[i + 1], d = K[Math.min(K.length - 1, i + 2)];
    const tt = eio(clamp((uu - b.u) / (c.u - b.u), 0, 1));
    const p = crv(a.p, b.p, c.p, d.p, tt), tg = crv(a.t, b.t, c.t, d.t, tt);
    cam.position.copy(p);
    cam.up.copy(u < .9 ? V(0, 0, -1).lerp(V(0, 1, 0), smt(.1, .9, u)).normalize() : V(0, 1, 0));
    cam.lookAt(tg);
    cam.fov = Math.atan(lerp(tJ, tP, toPhoto)) * 360 / Math.PI; cam.updateProjectionMatrix();
    [lineMat, ptMat].forEach(m => {
      const U = m.uniforms;
      U.uU.value = u; U.uVib.value = vib; U.uDown.value = down; U.uLift.value = lift; U.uDry.value = smt(DRY[0], DRY[1], u); U.uFocus.value = focus;
      U.uNear.value = lerp(3, 1.2, toPhoto); U.uFar.value = lerp(9, 3, toPhoto);
      U.uA.value = 1 - smt(PH[0], PH[1], u) * .6;
    });
    R.render(scene, cam);

    // labels: the parts, each named once while it matters
    ox.setTransform(1, 0, 0, 1, 0, 0); ox.clearRect(0, 0, ov.width, ov.height);
    ox.setTransform(dpr, 0, 0, dpr, 0, 0); ox.font = font; ox.textBaseline = 'middle';
    const at = (bk, x, y, z) => V(lerp(bk.tab[0], bk.flo[0], down) + x, TT * (1 - down) + y, lerp(bk.tab[1], bk.flo[1], down) + z);
    const L = [
      ['Steel moulds, two cavities each', at(BL[COLS - 1], B / 2 + WT, WH + lift * .7, -B / 2 - WT), .1, .85],
      ['Vibrating table', V(DW / 2, TT, DD / 2), .45, 1.5],
      ['Cement, shaken down', at(BL[2 * COLS + 3], 0, B * .8, B / 2), .65, 1.35],
      ['Nails, rebar, bolts, pressed in by hand', at(BL[3 * COLS + 4], 0, B + .05, 0), 1.6, 2.75],
      ['Coil springs, motor', V(-DW / 2 + .1, TT - .1, DD / 2 - .1), 2.45, 3.05],
      ['28 blocks, 15 cm, four rows of seven', at(BL[3 * COLS], -B / 2, B, B / 2), 3.75, 4.3],
    ];
    for (const [txt, P3, a0, a1] of L) {
      const al = smt(a0, a0 + .15, u) * (1 - smt(a1 - .15, a1, u));
      if (al <= .01) continue;
      const v = P3.clone().project(cam); if (v.z > 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05) continue;
      const qx = (v.x + 1) / 2 * vw, qy = (1 - v.y) / 2 * vh, side = qx > vw * .62 ? -1 : 1, lx = qx + side * 42, ly = qy - 30;
      ox.globalAlpha = al * .9; ox.strokeStyle = 'rgba(236,236,236,.5)'; ox.lineWidth = 1;
      ox.beginPath(); ox.moveTo(qx, qy); ox.lineTo(lx, ly); ox.lineTo(lx + side * 8, ly); ox.stroke();
      ox.fillStyle = 'rgba(236,236,236,.92)'; ox.beginPath(); ox.arc(qx, qy, 2, 0, 7); ox.fill();
      ox.textAlign = side > 0 ? 'left' : 'right'; ox.fillText(txt, lx + side * 14, ly);
    }
    ox.globalAlpha = 1;
    return 1;
  }
  return { load, layout, step, END, PHOTO: PH[1] + .05 };
};

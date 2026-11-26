/* Book structures as models in lines, each opened by the page's scroll: LM.draw(canvas, P, id), P 0 shut … 1 open.
   Every surface is a ruled strip between two curves (its foot B(s) and head T(s), s 0–1), cut into narrow strips; the
   strips are filled black and drawn far to near, so a leaf hides what is behind it (a hidden-line drawing). On each
   leaf, the face turned to the eye carries its own drawing (a cover's design, a page's lines of text, a photograph),
   given in the leaf's terms: s along it, t from foot to head.
   door   Compressed Modernity: the door-book. Two covers make one bowed front; they swing open like doors and the
          pages follow, fanning, until the spread at the back stands open between them.
   big    the Commedia's big book (210 x 148, PUR, back to back): two books sharing one back board, their spines on
          opposite edges; Heaven opens to the left on the near side, Hell to the right behind it, each named.
   pocket the pocket book (52 x 74, PUR): lying on its back, its pages rise and fan out over the spine, 180 degrees.
   thread the thread-bound book (598 x 216, stab-sewn, Xuan paper): lying flat, stitched through four holes at its left
          edge; its long leaves lift, curl and turn over the stitching one after another.
   dragon the dragon-scale book (1570 x 260): a rolled scroll unrolls, and the leaves glued on it step by step, each
          over the last like scales, lift off as they come out of the roll. */
(function () {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), ease = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const lerp = (a, b, t) => a + (b - a) * t, D2R = Math.PI / 180;
  const rng = seed => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const seg = (L, a, b, c, d) => L.push([a, b, c, d]);
  const rect = (L, s0, t0, s1, t1) => { seg(L, s0, t0, s1, t0); seg(L, s1, t0, s1, t1); seg(L, s1, t1, s0, t1); seg(L, s0, t1, s0, t0); };
  // a page of text: lines across (or, vertical, columns down), and now and then a photograph
  function textPage(seed, o = {}) {
    const r = rng(seed), L = [];
    if (o.vertical) {
      const n = o.cols || 14, x0 = .1 + r() * .1, x1 = .9 - r() * .1;
      for (let i = 0; i < n; i++) { const s = lerp(x0, x1, i / (n - 1)); seg(L, s, .86, s, .86 - (.3 + r() * .5)); }
      if (o.head) seg(L, .93, .9, .93, .72);
      return L;
    }
    const n = o.lines || 9, y0 = .84 - r() * .1;
    if (o.head !== false) seg(L, .1, .93, .32, .93);
    for (let i = 0; i < n; i++) seg(L, .12, y0 - i * .05, .5 + r() * .38, y0 - i * .05);
    if (o.pic && r() < .7) { const x = .15 + r() * .4, y = .1 + r() * .12; rect(L, x, y, x + .3, y + .2); }
    return L;
  }

  /* ---------- the models: each gives its surfaces (and loose lines) for an opening o, and its eye ---------- */
  const M = {};

  M.door = (() => {
    const H = 1, W = .62, K = 5, SAG = .3 * W, DEP = .02, BACK = .3;
    const FINAL = [150, 133, 116, 99, 82].map(a => a * D2R);
    const doorFace = (() => { const L = [];
      const posts = [.05, .12, .19, .26, .33, .40, .46];
      posts.forEach(p => seg(L, p, .04, p, .9));
      for (let i = 0; i < posts.length - 1; i++) for (let b = 0; b < 6; b++) { const y0 = .06 + b * .14, y1 = y0 + .14; seg(L, posts[i], y0, posts[i + 1], y1); seg(L, posts[i + 1], y0, posts[i], y1); }
      rect(L, .5, .02, .97, .92); rect(L, .58, .34, .9, .85); rect(L, .58, .08, .9, .28); seg(L, .52, .5, .8, .64);
      return L; })();
    const pageFace = seed => { const r = rng(seed), L = []; seg(L, .08, .94, .3, .94);
      const tx = .08 + r() * .45, ty = .45 + r() * .35; for (let i = 0; i < 7; i++) seg(L, tx, ty - i * .028, tx + .18 + r() * .1, ty - i * .028);
      const ix = .1 + r() * .5, iy = .1 + r() * .3; rect(L, ix, iy, Math.min(.95, ix + .18 + r() * .2), iy + .14 + r() * .16);
      let px = .05, py = .3 + r() * .4; for (let i = 0; i < 12; i++) { const nx = px + .08, ny = clamp(py + (r() - .5) * .08, .08, .9); seg(L, px, py, nx, ny); px = nx; py = ny; }
      return L; };
    const spread = (() => { const r = rng(7), L = []; seg(L, .5, 0, .5, 1); seg(L, .12, .95, .34, .95); seg(L, .62, .95, .84, .95);
      rect(L, .08, .52, .44, .86); rect(L, .58, .3, .9, .62);
      for (let i = 0; i < 6; i++) seg(L, .1, .4 - i * .03, .28 + r() * .1, .4 - i * .03);
      for (let i = 0; i < 6; i++) seg(L, .6, .22 - i * .03, .78 + r() * .1, .22 - i * .03);
      for (let c = 0; c < 3; c++) { let px = .04, py = .2 + c * .25; for (let i = 0; i < 23; i++) { const nx = px + .04, ny = clamp(py + (r() - .5) * .05, .05, .92); seg(L, px, py, nx, ny); px = nx; py = ny; } }
      return L; })();
    const faces = [-1, 1].map(side => Array.from({ length: K }, (_, k) => ({ o: k === 0 ? doorFace : pageFace(11 + k * 3 + (side > 0 ? 50 : 0)), i: pageFace(97 + k * 5 + (side > 0 ? 50 : 0)) })));
    return {
      ns: 30,
      cam: P => ({ phi: -.62 + .5 * ease(clamp(P, 0, 1)), el: .3, R: 3.7, T: [0, .46, -.08] }),
      fix: (cw, ch, o) => ({ F: Math.min(ch * 1.9, cw * 1.2) * (1.12 - .12 * ease(o)), cx: cw / 2, cy: ch * (.46 + .04 * ease(o)) }),
      open: P => clamp((P - .3) / .66, 0, 1),
      build(o) {
        const S = [];
        [-1, 1].forEach((side, si) => { for (let k = 0; k < K; k++) {
          const ok = ease(clamp((o - .1 * k) / .6, 0, 1)), th = ok * FINAL[k], c = Math.cos(th), sn = Math.sin(th), len = W * (1 - .03 * k), off = -k * DEP;
          const pt = s => { const u = s * len, q = u / W, v = SAG * (2 * q - q * q) + off; return [side * (-W + u * c - v * sn), u * sn + v * c]; };
          S.push({ B: s => { const p = pt(s); return [p[0], 0, p[1]]; }, T: s => { const p = pt(s); return [p[0], H, p[1]]; }, flip: side < 0, outer: faces[si][k].o, inner: faces[si][k].i });
        } });
        const bp = s => [-W + 2 * W * s, -BACK * Math.sin(Math.PI * s) - K * DEP];
        S.push({ B: s => { const p = bp(s); return [p[0], 0, p[1]]; }, T: s => { const p = bp(s); return [p[0], H, p[1]]; }, outer: spread, inner: [] });
        return { S };
      }
    };
  })();

  M.big = (() => {
    const W = 148, H = 210, N = 7, G = 2.2;
    const cover = (() => { const L = []; for (let i = 0; i < 16; i++) { const s = .16 + i * .028; seg(L, s, .9, s, .9 - .1 - (i * 7 % 5) * .04); } seg(L, .86, .9, .86, .8); return L; })();
    const A = Array.from({ length: N }, (_, k) => [textPage(31 + k, { pic: true }), textPage(61 + k, { pic: true })]);
    const Bp = Array.from({ length: N }, (_, k) => [textPage(131 + k, { pic: true }), textPage(161 + k)]);
    return {
      ns: 14, fitOpen: true,
      cam: P => ({ phi: lerp(-.5, .45, ease(P)), el: .42, R: 640, T: [W / 2, H * .45, 0] }),
      open: P => clamp((P - .22) / .7, 0, 1),
      build(o) {
        const S = [];
        // the shared back board
        S.push({ B: s => [s * W, 0, 0], T: s => [s * W, H, 0], outer: [], inner: [], ns: 6 });
        // Heaven, on the near side: spine at the left edge, its leaves (cover last) turning toward the eye and over
        for (let k = 0; k <= N; k++) {
          const isC = k === N, z = (k + 1) * G, ok = ease(clamp((o - .07 * (N - k)) / (1 - .07 * N), 0, 1));
          const th = ok * (isC ? 172 : lerp(14, 158, k / N)) * D2R, c = Math.cos(th), sn = Math.sin(th), bend = isC ? 0 : 10 * Math.sin(th);
          const pt = s => { const u = s * W, v = bend * Math.sin(Math.PI * s * .8); return [u * c - v * sn, z + u * sn + v * c]; };
          S.push({ B: s => { const p = pt(s); return [p[0], 0, p[1]]; }, T: s => { const p = pt(s); return [p[0], H, p[1]]; }, outer: isC ? cover : A[k][0], inner: isC ? [] : A[k][1] });
        }
        S.push({ B: s => [0, 0, s * (N + 1) * G], T: s => [0, H, s * (N + 1) * G], outer: [], inner: [], ns: 2 });
        // Hell, behind: spine at the right edge, its leaves turning away from the eye and round to the right
        for (let k = 0; k <= N; k++) {
          const isC = k === N, z = -(k + 1) * G, ok = ease(clamp((o - .1 - .06 * (N - k)) / (.9 - .06 * N), 0, 1));
          const th = ok * (isC ? 168 : lerp(16, 150, k / N)) * D2R, c = Math.cos(th), sn = Math.sin(th), bend = isC ? 0 : 10 * Math.sin(th);
          const pt = s => { const u = s * W, v = bend * Math.sin(Math.PI * s * .8); return [W - u * c - v * sn, z - u * sn + v * c]; };
          S.push({ B: s => { const p = pt(s); return [p[0], 0, p[1]]; }, T: s => { const p = pt(s); return [p[0], H, p[1]]; }, flip: true, outer: isC ? cover : Bp[k][0], inner: isC ? [] : Bp[k][1] });
        }
        S.push({ B: s => [W, 0, -s * (N + 1) * G], T: s => [W, H, -s * (N + 1) * G], outer: [], inner: [], ns: 2 });
        // the two books named over their fans: the one opening to the left is Heaven, the one to the right Hell
        const lo = clamp((o - .35) / .35, 0, 1);
        return { S, labels: lo > 0 ? [{ p: [-W * .45, H * 1.02, W * .55], q: [-W * .45, H * 1.16, W * .55], text: 'Heaven', a: lo }, { p: [W * 1.4, H * 1.02, -W * .5], q: [W * 1.4, H * 1.16, -W * .5], text: 'Hell', a: lo }] : [] };
      }
    };
  })();

  /* an open right hand, palm up, under the pocket book for its size (mm; x across, z from the fingertips toward the
     wrist, on the plane just below the book): the book is held in the palm to be read */
  const HAND = (() => {
    const P = [], y = -1.5, pl = pts => { for (let i = 0; i < pts.length - 1; i++) P.push([[pts[i][0], y, pts[i][1]], [pts[i + 1][0], y, pts[i + 1][1]]]); };
    const finger = (xc, zb, len, w, tilt = 0) => {           // one side up, round the tip, the other side down
      const q = [], r = w / 2, tx = xc + tilt * len, tz = zb - len + r;
      q.push([xc - r, zb]); for (let i = 0; i <= 10; i++) { const a = Math.PI + i / 10 * Math.PI; q.push([tx + r * Math.cos(a), tz + r * Math.sin(a)]); } q.push([xc + r, zb]);
      return q;
    };
    const F = [finger(-34, -2, 52, 16, -.08), finger(-15, -10, 70, 18, -.03), finger(5, -12, 78, 19), finger(25, -8, 70, 18, .04)];
    pl([[-36, 175], [-38, 120], [-43, 60], [-43, 20], F[0][0]]);
    F.forEach((f, i) => { pl(f); if (i < F.length - 1) pl([f[f.length - 1], [ (f[f.length - 1][0] + F[i + 1][0][0]) / 2, f[f.length - 1][1] + 3 ], F[i + 1][0]]); });
    const th = [[34, -8], [42, 25], [50, 40]];                  // the thumb, out to the side and up
    for (let i = 0; i <= 12; i++) { const a = -Math.PI / 2 - .6 + i / 12 * Math.PI; th.push([84 + 11 * Math.cos(a + 1.2), 22 + 11 * Math.sin(a + 1.2)]); }
    th.push([60, 70], [50, 105], [44, 135], [40, 175]); pl(th);
    pl([[-40, 22], [-20, 26], [0, 22], [18, 14]]);               // the lines of the palm
    pl([[-42, 46], [-15, 44], [10, 40], [30, 32]]);
    pl([[30, 34], [18, 60], [12, 95], [16, 128]]);
    return P;
  })();

  M.pocket = (() => {
    const PW = 52, PH = 74, N = 26, G = .7;
    const pages = Array.from({ length: N + 2 }, (_, k) => [textPage(301 + k, { lines: 6, head: false }), textPage(401 + k, { lines: 6, head: false })]);
    return {
      ns: 6,
      cam: P => ({ phi: lerp(.32, -.18, ease(P)), el: .62, R: 1100, T: [0, 10, 70] }),
      open: P => clamp((P - .22) / .7, 0, 1),
      build(o) {
        const S = [], M1 = N + 1;
        for (let k = 0; k <= M1; k++) {
          // shut, the book lies on its back cover (k = 0) with the front cover on top; open, the front cover lies flat
          // to the left and the pages stand fanned between
          const f = k / M1, ok = ease(clamp((o - .35 * (1 - f)) / .65, 0, 1));
          const a = ok * (k === 0 ? 0 : k === M1 ? 180 : lerp(8, 172, (k - .5) / N)) * D2R, hy = k * G * (1 - ok), len = k === 0 || k === M1 ? PW + 2 : PW;
          const c = Math.cos(a), sn = Math.sin(a);
          S.push({ B: s => [s * len * c, hy + s * len * sn, 0], T: s => [s * len * c, hy + s * len * sn, PH], flip: true, outer: k === M1 || k === 0 ? [] : pages[k][0], inner: k === 0 || k === M1 ? [] : pages[k][1] });
        }
        return { S, lines: HAND };
      }
    };
  })();

  M.thread = (() => {
    const L = 598, D = 216, N = 9, G = 1.6, HX = 26;
    const holes = [.14, .38, .62, .86].map(f => f * D);
    const leaves = Array.from({ length: N + 1 }, (_, k) => [textPage(501 + k, { vertical: true, cols: 22, head: true }), textPage(601 + k, { vertical: true, cols: 18 })]);
    const coverFace = (() => { const Lf = []; rect(Lf, .82, .62, .9, .9); return Lf; })();
    return {
      ns: 26, fitOpen: true,
      cam: P => ({ phi: lerp(-.25, .18, ease(P)), el: .78, R: 2100, T: [L * .22, 0, D / 2] }),
      open: P => clamp((P - .2) / .72, 0, 1),
      build(o) {
        const S = [], lines = [], top = (N + 1) * G;
        // the leaves, top (the cover, k = N) first to turn: each lifts at the stitching, curls as it rises and lies
        // over to the left; the turned ones settle in order, one stays caught half way
        const TURN = 5;
        for (let k = N; k >= 0; k--) {
          const rank = N - k, y0 = (k + 1) * G;
          let a = 0;
          if (rank < TURN) a = ease(clamp((o - .13 * rank) / .42, 0, 1)) * 180;
          else if (rank === TURN) a = ease(clamp((o - .7) / .3, 0, 1)) * 96;
          a *= D2R;
          const curl = 1.7 * Math.sin(a);                         // radians of bend along the leaf, most when upright
          const pts = [[HX, y0]]; let x = HX, y = y0; const n = 40, ds = (L - HX) / n;
          for (let i = 0; i < n; i++) { const s = (i + .5) / n, ph = a - curl * s * (1 - .3 * s); x += ds * Math.cos(ph); y += ds * Math.sin(ph); pts.push([x, Math.max(y, a > 3.1 ? y0 : y)]); }
          const pt = s => { const f = s * n, i = Math.min(n - 1, Math.floor(f)), t = f - i; return [lerp(pts[i][0], pts[i + 1][0], t), lerp(pts[i][1], pts[i + 1][1], t)]; };
          // flat leaves lie along x with their depth along z: the strip runs from the near edge (z = D) to the far
          S.push({ B: s => { const p = pt(s); return [p[0], p[1], D]; }, T: s => { const p = pt(s); return [p[0], p[1], 0]; }, outer: k === N ? coverFace : leaves[k][0], inner: leaves[k][1], flip: false });
        }
        // the stitched margin: a block from the spine edge to the fold line, and its sewing
        S.push({ B: s => [s * HX, top, D], T: s => [s * HX, top, 0], outer: [], inner: [], ns: 2 });
        S.push({ B: s => [0, s * top, D], T: s => [0, s * top, 0], outer: [], inner: [], ns: 2, flip: true });
        const hx = HX * .5;
        lines.push([[hx, top + .4, 0], [hx, top + .4, D]]);
        holes.forEach(z => { lines.push([[hx, top + .4, z], [0, top + .4, z]]); lines.push([[0, top, z], [0, 0, z]]); });
        [0, D].forEach(z => { lines.push([[hx, top + .4, z], [0, top + .4, z]]); });
        return { S, lines };
      }
    };
  })();

  M.dragon = (() => {
    const L = 1570, H = 260, N = 22, X0 = 120, STEP = 52, PW = 340;
    const strips = Array.from({ length: N }, (_, j) => { const r = rng(701 + j), Lf = []; seg(Lf, 0, .36, 1, .36); seg(Lf, 0, .62, 1, .62); for (let i = 0; i < 9; i++) { const x = .04 + r() * .9, y = .38 + r() * .22; seg(Lf, x, y, x + .03, y); } return Lf; });
    return {
      ns: 10,
      cam: P => ({ phi: lerp(-.35, .2, ease(P)), el: .42, R: 4200, T: [lerp(150, L / 2, ease(P)), H * .4, 0] }),
      open: P => clamp((P - .15) / .78, 0, 1),
      build(o) {
        const S = [], lines = [], u = 60 + (L - 60) * o, r0 = 70, r = Math.max(9, r0 * Math.sqrt(1 - .92 * o));
        // the base sheet, unrolled as far as u
        S.push({ B: s => [s * u, 0, 0], T: s => [s * u, H, 0], outer: [], inner: [], ns: 16 });
        // the leaves: each glued on at its left edge, lying over the one before; lifted at its free edge once out
        for (let j = 0; j < N; j++) {
          const x0 = X0 + j * STEP, x1 = x0 + PW; if (x1 > u) continue;
          const lift = 34 * clamp((u - x1) / 160, 0, 1), z0 = 1 + j * .8;
          const pt = s => [x0 + s * PW, z0 + lift * Math.sin(Math.PI * Math.pow(s, .8) * .5)];
          S.push({ B: s => { const p = pt(s); return [p[0], 0, p[1]]; }, T: s => { const p = pt(s); return [p[0], H, p[1]]; }, outer: strips[j], inner: [] });
        }
        // the roll still to come, and the rod at the start
        const cx = u, cz = r, cyl = (cx, cz, rr, h0, h1) => ({ B: s => [cx + rr * Math.cos(s * 2 * Math.PI), h0, cz - rr * Math.sin(s * 2 * Math.PI)], T: s => [cx + rr * Math.cos(s * 2 * Math.PI), h1, cz - rr * Math.sin(s * 2 * Math.PI)], outer: [], inner: [], ns: 28, noEnds: true });
        S.push(cyl(cx, cz, r, 0, H));
        for (let q = 1; q <= 4; q++) { const rr = r * (1 - q * .2); if (rr < 2) break; const ring = []; for (let i = 0; i <= 24; i++) { const a = i / 24 * 2 * Math.PI; ring.push([cx + rr * Math.cos(a), H, cz - rr * Math.sin(a)]); } for (let i = 0; i < 24; i++) lines.push([ring[i], ring[i + 1]]); }
        S.push(cyl(-6, 6, 6, -12, H + 12));
        return { S, lines };
      }
    };
  })();

  /* ---------- drawing ---------- */
  const fitCache = {};
  function draw(cv, P, id) {
    const m = M[id] || M.door;
    const dpr = Math.min(2, window.devicePixelRatio || 1), cw = cv.clientWidth, ch = cv.clientHeight;
    if (!cw || !ch) return;
    if (cv.width !== Math.round(cw * dpr) || cv.height !== Math.round(ch * dpr)) { cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); }
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, cw, ch);
    const o = m.open(P), { S, lines = [], labels = [] } = m.build(o), C = m.cam(P);
    const E = [C.T[0] + C.R * Math.sin(C.phi) * Math.cos(C.el), C.T[1] + C.R * Math.sin(C.el), C.T[2] + C.R * Math.cos(C.phi) * Math.cos(C.el)];
    let f = [C.T[0] - E[0], C.T[1] - E[1], C.T[2] - E[2]]; const fl = Math.hypot(...f); f = f.map(v => v / fl);
    let r = [-f[2], 0, f[0]]; const rl = Math.hypot(...r); r = r.map(v => v / rl);
    const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
    const view = p => { const d = [p[0] - E[0], p[1] - E[1], p[2] - E[2]], zz = d[0] * f[0] + d[1] * f[1] + d[2] * f[2]; return [(d[0] * r[0] + d[1] * r[1] + d[2] * r[2]) / zz, (d[0] * u[0] + d[1] * u[1] + d[2] * u[2]) / zz, zz]; };
    // sample every surface once, in view terms (x, y on a unit screen, depth)
    const surf = S.map(sf => {
      const ns = sf.ns || m.ns, Bv = [], Tv = [], Bw = [], Tw = [];
      for (let i = 0; i <= ns; i++) { const s = i / ns, b = sf.B(s), t = sf.T(s); Bw.push(b); Tw.push(t); Bv.push(view(b)); Tv.push(view(t)); }
      return { sf, ns, Bv, Tv, Bw, Tw };
    });
    const lv = lines.map(([a, b]) => [view(a), view(b)]);
    // the scale: fixed by the model, or fitted to what is drawn now
    let F, cx, cy;
    if (m.fix) ({ F, cx, cy } = m.fix(cw, ch, o));
    else {
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      const acc = p => { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; };
      surf.forEach(q => { q.Bv.forEach(acc); q.Tv.forEach(acc); }); lv.forEach(([a, b]) => { acc(a); acc(b); });
      if (m.fitOpen && o < 1) { const O = m.build(1); O.S.forEach(sf => { for (let i = 0; i <= 8; i++) { acc(view(sf.B(i / 8))); acc(view(sf.T(i / 8))); } }); (O.lines || []).forEach(([a, b]) => { acc(view(a)); acc(view(b)); }); }
      F = Math.min(cw * .84 / Math.max(1e-6, x1 - x0), ch * .84 / Math.max(1e-6, y1 - y0));
      cx = cw / 2 - F * (x0 + x1) / 2; cy = ch / 2 + F * (y0 + y1) / 2;
    }
    const scr = p => [cx + F * p[0], cy - F * p[1], p[2]];
    const items = [];
    surf.forEach(({ sf, ns, Bv, Tv, Bw, Tw }) => {
      const Bs = Bv.map(scr), Ts = Tv.map(scr);
      // which face looks at the eye, strip by strip
      const vis = [];
      for (let i = 0; i < ns; i++) {
        const a = Bw[i], b = Bw[i + 1], t = Tw[i], du = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], dv = [t[0] - a[0], t[1] - a[1], t[2] - a[2]];
        let n = [du[1] * dv[2] - du[2] * dv[1], du[2] * dv[0] - du[0] * dv[2], du[0] * dv[1] - du[1] * dv[0]]; if (sf.flip) n = n.map(v => -v);
        const c = [(a[0] + Tw[i + 1][0]) / 2, (a[1] + Tw[i + 1][1]) / 2, (a[2] + Tw[i + 1][2]) / 2];
        vis.push(n[0] * (E[0] - c[0]) + n[1] * (E[1] - c[1]) + n[2] * (E[2] - c[2]) > 0);
      }
      const segs = Array.from({ length: ns }, () => []);
      const at = (s, t) => { const b = sf.B(s), tt = sf.T(s); return scr(view([lerp(b[0], tt[0], t), lerp(b[1], tt[1], t), lerp(b[2], tt[2], t)])); };
      const cut = (Lst, want) => (Lst || []).forEach(([s0, y0, s1, y1]) => {
        const lo = Math.min(s0, s1), hi = Math.max(s0, s1), cuts = [s0];
        for (let i = Math.ceil(lo * ns + 1e-9); i <= Math.floor(hi * ns - 1e-9); i++) cuts.push(i / ns);
        cuts.push(s1); cuts.sort((p, q) => s1 < s0 ? q - p : p - q);
        for (let j = 0; j < cuts.length - 1; j++) {
          const ca = cuts[j], cb = cuts[j + 1], i = clamp(Math.floor((ca + cb) / 2 * ns), 0, ns - 1);
          if (vis[i] !== want) continue;
          const ya = s1 === s0 ? y0 : y0 + (y1 - y0) * (ca - s0) / (s1 - s0), yb = s1 === s0 ? y1 : y0 + (y1 - y0) * (cb - s0) / (s1 - s0);
          segs[i].push([at(ca, ya), at(cb, yb)]);
        }
      });
      cut(sf.outer, true); cut(sf.inner, false);
      for (let i = 0; i < ns; i++) {
        const q = [Bs[i], Bs[i + 1], Ts[i + 1], Ts[i]];
        items.push({ z: (q[0][2] + q[1][2] + q[2][2] + q[3][2]) / 4, q, segs: segs[i], e0: (i === 0 && !sf.noEnds) || (i > 0 && vis[i] !== vis[i - 1]), e1: (i === ns - 1 && !sf.noEnds) || (i < ns - 1 && vis[i] !== vis[i + 1]) });
      }
    });
    lv.forEach(([a, b]) => { const A = scr(a), Bq = scr(b); items.push({ z: (A[2] + Bq[2]) / 2 - 1e-6, line: [A, Bq] }); });
    items.sort((a, b) => b.z - a.z);
    g.lineJoin = 'round'; g.lineCap = 'round';
    items.forEach(it => {
      if (it.line) { g.beginPath(); g.moveTo(it.line[0][0], it.line[0][1]); g.lineTo(it.line[1][0], it.line[1][1]); g.strokeStyle = '#ececec'; g.lineWidth = .9; g.stroke(); return; }
      const q = it.q;
      g.beginPath(); g.moveTo(q[0][0], q[0][1]); for (let i = 1; i < 4; i++) g.lineTo(q[i][0], q[i][1]); g.closePath();
      g.fillStyle = '#000'; g.fill(); g.strokeStyle = '#000'; g.lineWidth = 1.2; g.stroke();
      if (it.segs.length) { g.beginPath(); it.segs.forEach(([a, b]) => { g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); }); g.strokeStyle = 'rgba(236,236,236,.6)'; g.lineWidth = .75; g.stroke(); }
      g.beginPath();
      g.moveTo(q[0][0], q[0][1]); g.lineTo(q[1][0], q[1][1]); g.moveTo(q[3][0], q[3][1]); g.lineTo(q[2][0], q[2][1]);
      if (it.e0) { g.moveTo(q[0][0], q[0][1]); g.lineTo(q[3][0], q[3][1]); }
      if (it.e1) { g.moveTo(q[1][0], q[1][1]); g.lineTo(q[2][0], q[2][1]); }
      g.strokeStyle = '#ececec'; g.lineWidth = 1.1; g.stroke();
    });
    // names: a short line up from the model and the word above it
    labels.forEach(lb => {
      const a = scr(view(lb.p)), b = scr(view(lb.q));
      g.globalAlpha = lb.a; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.strokeStyle = '#ececec'; g.lineWidth = .8; g.stroke();
      g.font = '13px "tao-acumin","acumin-variable","Helvetica Neue",Helvetica,Arial,sans-serif'; g.fillStyle = '#ececec'; g.textAlign = 'center'; g.textBaseline = 'bottom';
      g.fillText(lb.text, b[0], b[1] - 5); g.globalAlpha = 1;
    });
  }
  window.LM = { draw };
  window.CM_DOOR = { draw: (cv, P) => draw(cv, P, 'door') };
})();

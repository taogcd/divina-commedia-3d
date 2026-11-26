/* Compressed Modernity: the door-book as a model in lines. The book stands on its foot edge, its leaves bent. Shut, its
   two covers meet in the middle and make one curved front, a double door printed across them (a folding gate at each
   hinge side, a door with its glass panel at the meeting edge). Opened, the covers swing out on their hinges like
   doors and the pages behind them follow one after another, fanning out, until the spread at the back (the inner
   pages, bowed away from the eye) stands open between them. Drawn on a canvas with a hidden-line pass: every leaf is
   cut into narrow upright strips, filled black and drawn far to near, so only what faces the eye shows.
   CM_DOOR.draw(canvas, P): P 0 shut … 1 open, with the eye moving a little round the model as it opens. */
(function () {
  const H = 1, W = .62, K = 5, SAG = .3 * W, DEP = .02, BACK = .3, NS = 30;
  const FINAL = [150, 133, 116, 99, 82].map(a => a * Math.PI / 180);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), ease = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  // a fixed scatter, so the pages' contents stay put from frame to frame
  const rng = seed => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  /* the decorations, as segments in a leaf's own terms: s from the hinge (0) to the free edge (1), y from foot to head */
  function doorFace() {
    const L = [], seg = (a, b, c, d) => L.push([a, b, c, d]), rect = (s0, y0, s1, y1) => { seg(s0, y0, s1, y0); seg(s1, y0, s1, y1); seg(s1, y1, s0, y1); seg(s0, y1, s0, y0); };
    // the folding gate on the hinge side: its uprights and their crossing bars
    const posts = [.05, .12, .19, .26, .33, .40, .46];
    posts.forEach(p => seg(p, .04, p, .9));
    for (let i = 0; i < posts.length - 1; i++) for (let b = 0; b < 6; b++) {
      const y0 = .06 + b * .14, y1 = y0 + .14; seg(posts[i], y0, posts[i + 1], y1); seg(posts[i + 1], y0, posts[i], y1);
    }
    // the door: frame, glass panel, the panel below it, a bar across
    rect(.5, .02, .97, .92); rect(.58, .34, .9, .85); rect(.58, .08, .9, .28); seg(.52, .5, .8, .64);
    return L;
  }
  function pageFace(seed, back) {
    const r = rng(seed), L = [], seg = (a, b, c, d) => L.push([a, b, c, d]), rect = (s0, y0, s1, y1) => { seg(s0, y0, s1, y0); seg(s1, y0, s1, y1); seg(s1, y1, s0, y1); seg(s0, y1, s0, y0); };
    seg(.08, .94, .3, .94);                                                  // running head
    const tx = .08 + r() * .45, ty = .45 + r() * .35;                        // a column of text
    for (let i = 0; i < 7; i++) seg(tx, ty - i * .028, tx + .18 + r() * .1, ty - i * .028);
    const ix = .1 + r() * .5, iy = .1 + r() * .3, iw = .18 + r() * .2, ih = .14 + r() * .16;
    rect(ix, iy, Math.min(.95, ix + iw), iy + ih);                             // a photograph
    if (back) rect(.02, .02, .98, .98);
    let px = .05, py = .3 + r() * .4;                                        // a surveyed line running across
    for (let i = 0; i < 12; i++) { const nx = px + .08, ny = clamp(py + (r() - .5) * .08, .08, .9); seg(px, py, nx, ny); px = nx; py = ny; }
    return L;
  }
  function spreadFace() {
    const r = rng(7), L = [], seg = (a, b, c, d) => L.push([a, b, c, d]), rect = (s0, y0, s1, y1) => { seg(s0, y0, s1, y0); seg(s1, y0, s1, y1); seg(s1, y1, s0, y1); seg(s0, y1, s0, y0); };
    seg(.5, 0, .5, 1);                                                       // the fold
    seg(.12, .95, .34, .95); seg(.62, .95, .84, .95);
    rect(.08, .52, .44, .86); rect(.58, .3, .9, .62);                        // the landscape photographs
    for (let i = 0; i < 6; i++) seg(.1, .4 - i * .03, .28 + r() * .1, .4 - i * .03);
    for (let i = 0; i < 6; i++) seg(.6, .22 - i * .03, .78 + r() * .1, .22 - i * .03);
    for (let c = 0; c < 3; c++) { let px = .04, py = .2 + c * .25; for (let i = 0; i < 23; i++) { const nx = px + .04, ny = clamp(py + (r() - .5) * .05, .05, .92); seg(px, py, nx, ny); px = nx; py = ny; } }
    return L;
  }
  const DOOR = doorFace(), SPREAD = spreadFace();

  /* the leaves. Each: a plan curve pt(s) -> [x, z], its outward normal, and its two faces' drawings */
  function leaves(o) {
    const out = [];
    for (const side of [-1, 1]) for (let k = 0; k < K; k++) {
      const ok = ease(clamp((o - .1 * k) / .6, 0, 1)), th = ok * FINAL[k], c = Math.cos(th), sn = Math.sin(th);
      const len = W * (1 - .03 * k), off = -k * DEP;
      // in the leaf's own frame: u along from the hinge, v outward; shut, the covers make one bowed front
      const loc = s => { const u = s * len, q = u / W; return [u, SAG * (2 * q - q * q) + off]; };
      const pt = s => { const [u, v] = loc(s); const x = -W + u * c - v * sn, z = u * sn + v * c; return [side * x, z]; };
      const nrm = s => { const e = 1e-3, a = pt(Math.max(0, s - e)), b = pt(Math.min(1, s + e)); let tx = b[0] - a[0], tz = b[1] - a[1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l; return side > 0 ? [-tz, tx] : [tz, -tx]; };
      out.push({ pt, nrm, outer: k === 0 ? DOOR : pageFace(11 + k * 3 + (side > 0 ? 50 : 0)), inner: pageFace(97 + k * 5 + (side > 0 ? 50 : 0)) });
    }
    // the spread at the back, bowed away from the eye, hinge to hinge
    const bpt = s => { const x = -W + 2 * W * s; return [x, -BACK * Math.sin(Math.PI * s) - K * DEP]; };
    const bn = s => { const e = 1e-3, a = bpt(Math.max(0, s - e)), b = bpt(Math.min(1, s + e)); let tx = b[0] - a[0], tz = b[1] - a[1]; const l = Math.hypot(tx, tz) || 1; return [-tz / l, tx / l]; };
    out.push({ pt: bpt, nrm: bn, outer: SPREAD, inner: [], back: true });
    return out;
  }

  function draw(cv, P) {
    const dpr = Math.min(2, window.devicePixelRatio || 1), cw = cv.clientWidth, ch = cv.clientHeight;
    if (!cw || !ch) return;
    if (cv.width !== Math.round(cw * dpr) || cv.height !== Math.round(ch * dpr)) { cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); }
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, cw, ch);
    const o = clamp((P - .3) / .66, 0, 1);
    // the eye: a little above, swinging from the left toward the front as the book opens
    const phi = -.62 + .5 * ease(clamp(P, 0, 1)), el = .3, R = 3.7, T = [0, .46, -.08];
    const E = [T[0] + R * Math.sin(phi) * Math.cos(el), T[1] + R * Math.sin(el), T[2] + R * Math.cos(phi) * Math.cos(el)];
    let f = [T[0] - E[0], T[1] - E[1], T[2] - E[2]]; const fl = Math.hypot(...f); f = f.map(v => v / fl);
    let r = [f[2] * 0 - f[1] * 0, 0, 0]; r = [-f[2], 0, f[0]]; const rl = Math.hypot(...r); r = r.map(v => v / rl);
    const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
    const F = Math.min(ch * 1.9, cw * 1.2) * (1.12 - .12 * ease(o)), cx = cw / 2, cy = ch * (.46 + .04 * ease(o));
    const prj = (x, y, z) => { const d = [x - E[0], y - E[1], z - E[2]], zz = d[0] * f[0] + d[1] * f[1] + d[2] * f[2]; return [cx + F * (d[0] * r[0] + d[1] * r[1] + d[2] * r[2]) / zz, cy - F * (d[0] * u[0] + d[1] * u[1] + d[2] * u[2]) / zz, zz]; };

    const strips = [];
    leaves(o).forEach(lf => {
      const P2 = [], B = [], Tp = [];
      for (let i = 0; i <= NS; i++) { const p = lf.pt(i / NS); P2.push(p); B.push(prj(p[0], 0, p[1])); Tp.push(prj(p[0], H, p[1])); }
      const segs = Array.from({ length: NS }, () => []);
      // which face looks at the eye, strip by strip, and that face's drawing cut at the strip edges
      const faceOf = i => { const s = (i + .5) / NS, p = lf.pt(s), n = lf.nrm(s); return n[0] * (E[0] - p[0]) + n[1] * (E[2] - p[1]) > 0; };
      const vis = Array.from({ length: NS }, (_, i) => faceOf(i));
      const cut = (L, want) => L.forEach(([s0, y0, s1, y1]) => {
        const a = Math.min(s0, s1), b = Math.max(s0, s1);
        const cuts = [s0]; for (let i = Math.ceil(a * NS + 1e-9); i <= Math.floor(b * NS - 1e-9); i++) cuts.push(i / NS); cuts.push(s1);
        if (s1 < s0) cuts.sort((p, q) => q - p); else cuts.sort((p, q) => p - q);
        for (let j = 0; j < cuts.length - 1; j++) {
          const ca = cuts[j], cb = cuts[j + 1], m = (ca + cb) / 2, i = clamp(Math.floor(m * NS), 0, NS - 1);
          if (vis[i] !== want) continue;
          const ya = s1 === s0 ? y0 : y0 + (y1 - y0) * (ca - s0) / (s1 - s0), yb = s1 === s0 ? y1 : y0 + (y1 - y0) * (cb - s0) / (s1 - s0);
          const pa = lf.pt(ca), pb = lf.pt(cb);
          segs[i].push([prj(pa[0], ya * H, pa[1]), prj(pb[0], yb * H, pb[1])]);
        }
      });
      cut(lf.outer, true); cut(lf.inner, false);
      for (let i = 0; i < NS; i++) {
        const q = [B[i], B[i + 1], Tp[i + 1], Tp[i]];
        strips.push({ z: (q[0][2] + q[1][2] + q[2][2] + q[3][2]) / 4, q, segs: segs[i], end0: i === 0, end1: i === NS - 1, rule: i % 6 === 0 && i > 0 });
      }
    });
    strips.sort((a, b) => b.z - a.z);
    g.lineJoin = 'round'; g.lineCap = 'round';
    strips.forEach(st => {
      const q = st.q;
      g.beginPath(); g.moveTo(q[0][0], q[0][1]); for (let i = 1; i < 4; i++) g.lineTo(q[i][0], q[i][1]); g.closePath();
      g.fillStyle = '#000'; g.fill(); g.strokeStyle = '#000'; g.lineWidth = 1.2; g.stroke();
      if (st.segs.length) {
        g.beginPath(); st.segs.forEach(([a, b]) => { g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); });
        g.strokeStyle = 'rgba(236,236,236,.62)'; g.lineWidth = .75; g.stroke();
      }
      g.beginPath();
      g.moveTo(q[0][0], q[0][1]); g.lineTo(q[1][0], q[1][1]); g.moveTo(q[3][0], q[3][1]); g.lineTo(q[2][0], q[2][1]);
      if (st.end0) { g.moveTo(q[0][0], q[0][1]); g.lineTo(q[3][0], q[3][1]); }
      if (st.end1) { g.moveTo(q[1][0], q[1][1]); g.lineTo(q[2][0], q[2][1]); }
      g.strokeStyle = '#ececec'; g.lineWidth = 1.1; g.stroke();
    });
  }
  window.CM_DOOR = { draw };
})();

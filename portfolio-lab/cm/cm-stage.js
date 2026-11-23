/* Compressed Modernity: four rubbings come off the scanner one after another, each from its own side (top → bottom,
   left → right, right → left, bottom → top), one sheet to a column of the page grid. Then the four sheets lie back
   onto the paper scroll on the ground in the cover photograph, where the rubbings were made, and the photograph takes
   over. step(u): u = screen heights of scroll since the frame pinned. */
window.CMStage = function (frame, opts) {
  'use strict';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smt = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const eio = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const eo3 = t => 1 - Math.pow(1 - t, 3);
  const DIRS = ['down', 'right', 'left', 'up'];
  const T0 = [.05, .75, 1.45, 2.15], TD = .95;              // each sheet's scan: start, length (u)
  const LAND = 3.35, LAND_D = .9, LAND_ST = .07;           // the sheets lie down onto the scroll
  const PH0 = 3.45, PH1 = 4.1, OUT0 = 4.25, OUT1 = 4.65;   // photograph in; sheets out
  const END = 5;

  frame.classList.add('cm');
  const photo = document.createElement('img');
  photo.className = 'ws-photo'; photo.alt = ''; photo.decoding = 'async';
  frame.appendChild(photo);
  const S = opts.sheets.map((s, i) => {
    const c = document.createElement('canvas'); c.className = 'cm-sheet'; c.setAttribute('aria-hidden', 'true');
    const cap = document.createElement('div'); cap.className = 'cm-cap mono'; cap.setAttribute('aria-hidden', 'true');
    cap.innerHTML = `<span class="mk"><span>${s.name}</span></span><span class="mk"><span>${s.w}×${s.h}</span></span>`;
    frame.appendChild(c); frame.appendChild(cap);
    return { ...s, i, c, x: c.getContext('2d'), cap, capM: [...cap.querySelectorAll('.mk > span')], dir: DIRS[i],
      img: null, key: '', r: { x: 0, y: 0, w: 1, h: 1 }, blend: false, tf: '' };
  });

  let vw = 1, vh = 1, dpr = 1, loaded = 0, mobile = false, capH = 14;
  function load() {
    if (loaded) return; loaded = 1;
    S.forEach(s => {
      const im = new Image(); im.decoding = 'async';
      im.src = mobile ? s.srcS : s.src;
      (im.decode ? im.decode() : new Promise(r => { im.onload = r; })).then(() => { s.img = im; s.key = ''; }, () => {});
    });
    photo.src = opts.photo;
  }

  // the page grid: four columns (two by two on a phone); each sheet keeps the scan's proportions
  function layout(w, h, g) {
    vw = w; vh = h; dpr = Math.min(window.devicePixelRatio || 1, 2); mobile = vw < 700;
    capH = g.L + 8;
    const top = g.headBottom + (mobile ? 18 : 30), room = vh - top - capH - (mobile ? 24 : 36);
    const ar = S[0].h / S[0].w;
    let cols, cw;
    if (mobile) { cols = 2; cw = (vw - 2 * g.m - g.gut) / 2; } else { cols = 4; cw = (vw - 2 * g.m - 3 * g.gut) / 4; }
    const rows = mobile ? 2 : 1, gapY = mobile ? capH + 14 : 0;
    const sw = Math.min(cw, (room - (rows - 1) * gapY) / rows / ar), sh = sw * ar;
    S.forEach((s, i) => {
      const cx = i % cols, cy = Math.floor(i / cols);
      s.r = { x: g.m + cx * (cw + g.gut), y: top + cy * (sh + gapY), w: sw, h: sh };
      s.c.width = Math.round(sw * dpr); s.c.height = Math.round(sh * dpr);
      s.c.style.width = sw + 'px'; s.c.style.height = sh + 'px';
      s.cap.style.width = sw + 'px';
      s.cap.style.transform = `translate3d(${s.r.x}px,${(s.r.y + sh + 6).toFixed(1)}px,0)`;
      s.key = ''; s.tf = '';
    });
  }

  // one scan: the part already read lies flat; the read head is a hairline; the line of pixels under it is dragged
  // ahead of it and fades (the plain look of paper moving on a flatbed); the rows just read are still lit
  function draw(s, e) {
    const x = s.x, W = s.c.width, H = s.c.height, k = dpr;
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    x.clearRect(0, 0, W, H);
    x.strokeStyle = 'rgba(17,17,17,.14)'; x.lineWidth = k;
    x.strokeRect(k / 2, k / 2, W - k, H - k);
    if (e <= 0 || !s.img) return;
    const im = s.img, iw = im.naturalWidth, ih = im.naturalHeight;
    const vert = s.dir === 'down' || s.dir === 'up', Lp = vert ? H : W, at = e * Lp;   // device px along the scan
    const rev = s.dir === 'up' || s.dir === 'left';
    // read part
    if (s.dir === 'down') x.drawImage(im, 0, 0, iw, ih * e, 0, 0, W, at);
    else if (s.dir === 'up') x.drawImage(im, 0, ih * (1 - e), iw, ih * e, 0, H - at, W, at);
    else if (s.dir === 'right') x.drawImage(im, 0, 0, iw * e, ih, 0, 0, at, H);
    else x.drawImage(im, iw * (1 - e), 0, iw * e, ih, W - at, 0, at, H);
    if (e >= 1) return;
    // drag: the last line read, stretched forward
    const m = Math.min(Lp - at, Lp * .3 * Math.pow(1 - e, .6) + 6 * k);
    const sl = clamp(e * (vert ? ih : iw) - 1.5, 0, (vert ? ih : iw) - 1);   // source line, image px
    const p0 = rev ? Lp - at : at;                                         // read-head position, device px
    x.globalAlpha = .85;
    if (s.dir === 'down') x.drawImage(im, 0, sl, iw, 1, 0, p0, W, m);
    else if (s.dir === 'up') x.drawImage(im, 0, ih - 1 - sl, iw, 1, 0, p0 - m, W, m);
    else if (s.dir === 'right') x.drawImage(im, sl, 0, 1, ih, p0, 0, m, H);
    else x.drawImage(im, iw - 1 - sl, 0, 1, ih, p0 - m, 0, m, H);
    x.globalAlpha = 1;
    // fade the drag out with distance from the head
    const gr = vert ? x.createLinearGradient(0, p0, 0, rev ? p0 - m : p0 + m) : x.createLinearGradient(p0, 0, rev ? p0 - m : p0 + m, 0);
    gr.addColorStop(0, 'rgba(0,0,0,.15)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
    x.globalCompositeOperation = 'destination-out'; x.fillStyle = gr;
    if (vert) x.fillRect(0, rev ? p0 - m : p0, W, m); else x.fillRect(rev ? p0 - m : p0, 0, m, H);
    // the rows just read, still lit
    const lb = Math.max(4 * k, Lp * .045);
    const lg = vert ? x.createLinearGradient(0, p0, 0, rev ? p0 + lb : p0 - lb) : x.createLinearGradient(p0, 0, rev ? p0 + lb : p0 - lb, 0);
    lg.addColorStop(0, 'rgba(255,255,255,.55)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
    x.globalCompositeOperation = 'screen'; x.fillStyle = lg;
    if (vert) x.fillRect(0, rev ? p0 : p0 - lb, W, lb); else x.fillRect(rev ? p0 : p0 - lb, 0, lb, H);
    // the read head
    x.globalCompositeOperation = 'source-over'; x.fillStyle = '#111';
    if (vert) x.fillRect(0, p0 - k / 2, W, k); else x.fillRect(p0 - k / 2, 0, k, H);
    x.strokeStyle = 'rgba(17,17,17,.14)'; x.lineWidth = k; x.strokeRect(k / 2, k / 2, W - k, H - k);
  }

  // the paper strip in the photograph (cover-fit), split into four lengths, one per sheet
  function photoBox() {
    const iw = opts.photoW, ih = opts.photoH, sc = mobile ? Math.min(vw / iw, vh / ih) : Math.max(vw / iw, vh / ih);
    const pw = iw * sc, ph = ih * sc;
    return { ox: (vw - pw) / 2, oy: (vh - ph) / 2, pw, ph };
  }
  function target(i) {
    const b = photoBox(), q = opts.strip;                    // TL TR BR BL, photo-normalised
    const s0 = clamp(-b.ox / b.pw, 0, 1) + .01, s1 = clamp((vw - b.ox) / b.pw, 0, 1) - .01;
    const a = lerp(s0, s1, i / S.length), c = lerp(s0, s1, (i + 1) / S.length);
    const P = (s, far) => { const A = far ? q[0] : q[3], B = far ? q[1] : q[2]; return [b.ox + lerp(A[0], B[0], s) * b.pw, b.oy + lerp(A[1], B[1], s) * b.ph]; };
    return [P(a, 1), P(c, 1), P(c, 0), P(a, 0)];              // the sheet's top edge lands on the far edge of the paper
  }
  // homography taking the w×h box onto quad q (TL TR BR BL), as a CSS matrix3d
  function quadMatrix(w, h, q) {
    const [x0, y0] = q[0], [x1, y1] = q[1], [x2, y2] = q[2], [x3, y3] = q[3];
    const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2, sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3;
    let g = 0, hh = 0;
    if (Math.abs(sx) > 1e-6 || Math.abs(sy) > 1e-6) { const den = dx1 * dy2 - dx2 * dy1; g = (sx * dy2 - dx2 * sy) / den; hh = (dx1 * sy - sx * dy1) / den; }
    const a = x1 - x0 + g * x1, b = x3 - x0 + hh * x3, d = y1 - y0 + g * y1, e = y3 - y0 + hh * y3;
    const f = v => v.toFixed(6);
    return `matrix3d(${f(a / w)},${f(d / w)},0,${f(g / w)},${f(b / h)},${f(e / h)},0,${f(hh / h)},0,0,1,0,${f(x0)},${f(y0)},0,1)`;
  }

  function step(u) {
    if (u > -1.5) load();
    // photograph
    const ph = smt(PH0, PH1, u), out = smt(OUT0, OUT1, u);
    photo.style.opacity = ph.toFixed(3);
    S.forEach((s, i) => {
      const e = clamp((u - T0[i]) / TD, 0, 1), es = e < 1 ? e * e * (3 - 2 * e) * .35 + e * .65 : 1;
      const k = (s.img ? 1 : 0) + '|' + es.toFixed(4);
      if (k !== s.key) { s.key = k; draw(s, es); }
      // caption: written once the sheet is read; gone when the sheets lie down
      const cr = eo3(clamp((u - T0[i] - TD) / .16, 0, 1)) * (1 - smt(LAND - .1, LAND + .2, u));
      s.capM.forEach((m, j) => { const v = clamp(cr * 1.2 - j * .2, 0, 1); m.style.transform = v >= 1 ? 'none' : `translate3d(0,${((1 - v) * 110).toFixed(1)}%,0)`; });
      // lying down
      const g = eio(clamp((u - LAND - i * LAND_ST) / LAND_D, 0, 1));
      const r = s.r;
      let tf;
      if (g <= 0) tf = `translate3d(${r.x.toFixed(2)}px,${r.y.toFixed(2)}px,0)`;
      else {
        const q0 = [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h]], q1 = target(i);
        // the top edge travels first, as if the sheet tips backwards onto the ground
        const gt = eio(clamp(g * 1.15, 0, 1)), gb = eio(clamp(g * 1.15 - .15, 0, 1));
        tf = quadMatrix(r.w, r.h, q0.map((p, j) => { const t = j < 2 ? gt : gb; return [lerp(p[0], q1[j][0], t), lerp(p[1], q1[j][1], t)]; }));
      }
      if (tf !== s.tf) { s.tf = tf; s.c.style.transform = tf; }
      const bl = g > .55;
      if (bl !== s.blend) { s.blend = bl; s.c.classList.toggle('on-photo', bl); }
      s.c.style.opacity = (1 - out).toFixed(3);
    });
  }
  return { load, layout, step, END };
};

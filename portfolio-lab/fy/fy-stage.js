/* Fourteen Years: an archive of fourteen typefaces, one for each year of examinations (2010–2023). The page goes
   dark; the fourteen are set out as exhibits, 01 to 14, each a specimen card on its own stand. Scrolling turns every
   card through its alphabet, the change running down the row from 2010 to 2023; then all fourteen stop on J. The
   cards fall into one line of sight and the scroll passes through them, year after year, from the rough first j to
   the last, near-print J, which settles exactly onto the J printed in the book, and the photograph takes over.
   Glyphs: fy/fy-glyphs.js, traced from the type specimen (14 × 26, tile 600 units high). step(u): u = screen
   heights of scroll since the frame pinned. */
window.FYStage = function (frame, opts) {
  'use strict';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smt = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const sst = t => t * t * (3 - 2 * t);
  const eio = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const eo3 = t => 1 - Math.pow(1 - t, 3);
  const N = 14, TH = 600, TW = 384, J = 9, YEARS = Array.from({ length: N }, (_, k) => 2010 + k);
  // timeline (u)
  const DARK = [0, .6], SET = [.25, .4], SET_ST = .045, CYC = [1.25, 2.3], CYC_ST = .03, SPIN = [3.65, .5], SPIN_ST = .035;
  const GATHER = [4.25, .7], GATHER_ST = .012, FLY = [5.0, 6.95], PH = [6.85, 7.35], END = 7.6;
  const REG = opts.reg;                                      // the J as printed: photo px (pw × ph basis)

  frame.classList.add('fy');
  const cv = document.createElement('canvas'); cv.className = 'ws-cv'; cv.setAttribute('aria-hidden', 'true');
  const photo = document.createElement('img'); photo.className = 'ws-photo'; photo.alt = ''; photo.decoding = 'async';
  frame.appendChild(cv); frame.appendChild(photo);
  const x = cv.getContext('2d');
  let G = null, P2 = [], vw = 1, vh = 1, dpr = 1, loaded = 0, key = '', mobile = false, g0 = null, font = '';
  let cards = [], card = { w: 1, h: 1 }, lab = 14;

  function load() {
    if (loaded) return; loaded = 1;
    const el = document.createElement('script'); el.src = opts.glyphs;
    el.onload = () => { G = window.FY_GLYPHS; P2 = G.map(r => r.map(() => null)); key = ''; };
    document.head.appendChild(el);
    photo.src = opts.photo;
  }
  const path = (y, g) => P2[y][g] || (P2[y][g] = new Path2D(G[y][g][1]));

  function layout(w, h, g) {
    vw = w; vh = h; g0 = g; mobile = vw < 700; dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr);
    font = `400 ${g.t}px ${g.font}`; lab = g.L;
    // the stands: 7 × 2 (5-5-4 on a phone), under the title, filling the width of the grid
    const per = mobile ? 5 : 7, rows = Math.ceil(N / per), gapX = mobile ? g.gut : Math.max(g.gut, 28);
    const top = g.headBottom + (mobile ? 22 : 34), labH = lab * 1.6 + 12, gapY = mobile ? 18 : Math.max(26, vh * .045);
    const room = vh - top - (mobile ? 28 : 40);
    let cw = (vw - 2 * g.m - (per - 1) * gapX) / per;
    cw = Math.min(cw, ((room - (rows - 1) * gapY) / rows - labH) * TW / TH);
    const ch = cw * TH / TW, gx = (vw - 2 * g.m - per * cw) / Math.max(1, per - 1);
    card = { w: cw, h: ch };
    cards = YEARS.map((yr, k) => ({ k, yr, x: g.m + (k % per) * (cw + gx), y: top + Math.floor(k / per) * (ch + labH + gapY) }));
    key = '';
  }

  // where the printed J sits on screen (photograph shown whole, on black)
  function reg() {
    const s = Math.min(vw / REG.pw, vh / REG.ph), ox = (vw - REG.pw * s) / 2, oy = (vh - REG.ph * s) / 2;
    return { x: ox + REG.tx * s, y: oy + REG.ty * s, s: REG.s * s, a: REG.a * Math.PI / 180, ps: s };
  }

  // one card in unit space (TW × TH): paper, then the glyph(s), clipped to the card
  function drawCard(T, yi, gl, f, alpha, paper) {
    x.save();
    x.setTransform(T.a * dpr, T.b * dpr, T.c * dpr, T.d * dpr, T.e * dpr, T.f * dpr);
    x.globalAlpha = alpha;
    x.fillStyle = paper; x.fillRect(0, 0, TW, TH);
    x.beginPath(); x.rect(0, 0, TW, TH); x.clip();
    x.fillStyle = '#0d0d0d';
    const one = (gi, dy) => { const w = G[yi][gi][0]; x.save(); x.translate((TW - w) / 2, dy); x.fill(path(yi, gi)); x.restore(); };
    if (f <= 0) one(gl, 0);
    else { one(gl, -f * TH); one((gl + 1) % 26, (1 - f) * TH); }
    x.restore();
  }
  // affine for: screen = t + R(a)·s·(p − pivot)
  function aff(tx, ty, s, a, px, py) {
    const c = Math.cos(a) * s, sn = Math.sin(a) * s;
    return { a: c, b: sn, c: -sn, d: c, e: tx - c * px + sn * py, f: ty - sn * px - c * py };
  }

  function step(u) {
    if (u > -1.5) load();
    const dk = eio(clamp((u - DARK[0]) / (DARK[1] - DARK[0]), 0, 1));
    const ph = smt(PH[0], PH[1], u);
    photo.style.opacity = ph.toFixed(3);
    const k0 = `${u.toFixed(4)}|${!!G}|${vw}|${vh}`;
    if (k0 === key) return dk;
    key = k0;
    const bg = Math.round(lerp(255, 11, dk));
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    x.fillStyle = `rgb(${bg},${bg},${bg})`; x.fillRect(0, 0, cv.width, cv.height);
    if (!G || u < SET[0] - .05) return dk;
    const R = reg();
    const fly = clamp((u - FLY[0]) / (FLY[1] - FLY[0]), 0, 1);
    // perspective for the passage: a card at distance d is drawn at Sv / d; the last card ends at the printed size
    // the last card sits a little further back when it must end smaller than the passage size (phones), so that
    // every earlier card has been passed by the time it settles
    const Sv = Math.max(R.s, Math.min(vw, vh) * (mobile ? .62 : .5) / TH), dEnd = Sv / R.s;
    const zL = Math.max(N - 1, N - 2 + .9 + dEnd), zOf = k => k === N - 1 ? zL : k;
    const cam = lerp(-1, zL - dEnd, eio(fly));
    const th = R.a * eio(fly);
    const PJ = [313.95, 383.7];                              // the J's pivot (units), see opts.reg
    const labA = (1 - smt(GATHER[0] - .1, GATHER[0] + .2, u));
    const order = [];
    for (let k = 0; k < N; k++) {
      const c = cards[k];
      // placing: rise onto the stand
      const st = eo3(clamp((u - SET[0] - k * SET_ST) / SET[1], 0, 1));
      // reel position: A…Z with the scroll, then on round to J (25 → 35)
      const cyc = clamp((u - CYC[0] - k * CYC_ST) / CYC[1], 0, 1) * 25;
      const sp = eio(clamp((u - SPIN[0] - k * SPIN_ST) / SPIN[1], 0, 1)) * 10;
      const pos = cyc + sp, n = Math.floor(pos + 1e-6), fr = pos - n, f = sst(clamp((fr - .15) / .7, 0, 1));
      // gathering into one line of sight, then the passage
      const ga = eio(clamp((u - GATHER[0] - (N - 1 - k) * GATHER_ST) / GATHER[1], 0, 1));
      const d = zOf(k) - cam;
      let T, alpha = 1;
      const grid = { tx: c.x + card.w / 2, ty: c.y + card.h / 2 + (1 - st) * card.h * .35, s: card.w / TW, a: 0, px: TW / 2, py: TH / 2 };
      if (ga <= 0) { T = grid; alpha = st; }
      else {
        const dd = Math.max(d, .05), sc = Sv / dd;
        const line = { tx: R.x, ty: R.y, s: sc, a: th, px: PJ[0], py: PJ[1] };
        T = { tx: lerp(grid.tx, line.tx, ga), ty: lerp(grid.ty, line.ty, ga), s: lerp(grid.s, line.s, ga), a: lerp(0, line.a, ga), px: lerp(grid.px, line.px, ga), py: lerp(grid.py, line.py, ga) };
        const far = clamp(1 - (dd - 1) / 16, .35, 1), pass = smt(.12, .5, d);
        alpha = lerp(1, .9 * far * pass, ga);
        if (k === N - 1) alpha *= 1 - smt(PH[0] + .15, PH[1] + .05, u);
      }
      if (alpha <= .003) continue;
      order.push({ k, c, T, alpha, gl: n % 26, f: ga > 0 ? 0 : f, d: ga > 0 ? d : 0, ga, st });
    }
    // far to near once they are in line
    order.sort((a, b) => b.d - a.d);
    for (const o of order) {
      const paper = o.ga > 0 ? 'rgba(244,242,238,1)' : '#fff';
      drawCard(aff(o.T.tx, o.T.ty, o.T.s, o.T.a, o.T.px, o.T.py), o.k, o.ga > 0 ? J : o.gl, o.f, o.alpha * (o.ga > 0 ? .86 + .14 * (o.k === N - 1 ? 1 : 0) : 1), paper);
    }
    // labels on the stands: number and year, on a hairline
    if (labA > .003 && u > SET[0]) {
      x.setTransform(dpr, 0, 0, dpr, 0, 0); x.font = font; x.textBaseline = 'top';
      for (const c of cards) {
        const st = eo3(clamp((u - SET[0] - c.k * SET_ST - .08) / SET[1], 0, 1)) * labA;
        if (st <= 0) continue;
        const y0 = c.y + card.h + 8;
        x.globalAlpha = st; x.fillStyle = 'rgba(255,255,255,.28)'; x.fillRect(c.x, y0, card.w * st, 1);
        x.fillStyle = `rgba(${dk > .5 ? '236,236,236' : '17,17,17'},${(.9 * st).toFixed(3)})`;
        x.textAlign = 'left'; x.fillText(String(c.k + 1).padStart(2, '0'), c.x, y0 + 6);
        x.fillStyle = `rgba(${dk > .5 ? '160,160,160' : '124,124,124'},${st.toFixed(3)})`;
        x.textAlign = 'right'; x.fillText(String(c.yr), c.x + card.w, y0 + 6);
      }
    }
    // during the passage: the year being passed through
    const ya = smt(FLY[0] - .05, FLY[0] + .2, u) * (1 - smt(PH[0] - .1, PH[0] + .2, u));
    if (ya > .003) {
      const cur = clamp(Math.ceil(cam + .3), 0, N - 1);
      x.setTransform(dpr, 0, 0, dpr, 0, 0); x.font = font; x.textBaseline = 'alphabetic'; x.globalAlpha = ya;
      x.textAlign = 'left'; x.fillStyle = 'rgba(236,236,236,.95)';
      x.fillText(`${YEARS[cur]}`, g0.m, vh - g0.m);
      x.fillStyle = 'rgba(160,160,160,1)';
      x.fillText(`${String(cur + 1).padStart(2, '0')} / ${N}`, g0.m + g0.t * 4, vh - g0.m);
    }
    x.globalAlpha = 1;
    return dk;
  }
  return { load, layout, step, END };
};

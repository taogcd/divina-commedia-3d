/* BRICK: how the work was made, as a model, in the dark. Fourteen steel moulds, two cavities each, stand on a vibrating
   table (a steel deck on four coil springs, a motor under it). Cement is poured and shaken down; while it is still wet,
   nails are pressed in by hand: round-head nails above all, rebar ends, a few heavy bolts, a nut, a washer, each block its
   own handful, some left bare. The shaking stops, the moulds are lifted off, the cement dries pale, the table sinks
   away, and the twenty-eight blocks are set out on the floor, four rows of seven, as the installation (the bare ones,
   and the one marked 1103, where they stand in the top-view photograph). The camera starts straight above the table,
   comes down round the machine, moves low among the nails, stands back for the rows on the floor, and ends close on one
   block, exactly where the photograph of it was taken; the photograph takes over.
   Hard light from one side, deep shadow, cement dust in the light; a few quiet labels name the parts.
   step(u): u = screen heights of scroll since the frame pinned. Needs THREE (r128). */
window.BRStage = function (frame, opts) {
  'use strict';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smt = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const eio = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const eo3 = t => 1 - Math.pow(1 - t, 3);
  // timeline (u)
  const FILL = [.35, 1.0], VIB = [.3, 3.0], NAIL = [1.4, 2.65], LIFT = [3.0, 3.5], DRY = [3.0, 3.9], DOWN = [3.2, 3.95];
  const PH = [4.6, 5.05], END = 5.35;
  // the work: 4 × 7 cubes of 15 cm, set out 20 cm apart; the table 55 cm high
  const ROWS = 4, COLS = 7, B = .15, PITCH = .2, TT = .55, NB = ROWS * COLS, WT = .006;
  const MZ = 2 * B + 3 * WT, MP = MZ + .045;                 // a mould's depth (two cavities); moulds' spacing on the table
  const DW = COLS * PITCH + .1, DD = 2 * MP + .06;
  // each block's handful, after the top-view photograph (row by row, back to front): n nails, r rebar, b bolts,
  // k nuts, w washers; 0 = bare; 'm' = bare, marked 1103
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
  let sun, hemi, fill, spot, blocks, walls, rings, nailS, nailH, rebar, bolts, nuts, washers, deck, frameG, springs = [], motor, dust, dustMat, mark;
  const BL = [], NA = [], MO = [];

  function js(src) { return new Promise((res, rej) => { const el = document.createElement('script'); el.src = src; el.onload = res; el.onerror = rej; document.head.appendChild(el); }); }
  function load() {
    if (loaded) return; loaded = 1;
    photo.src = opts.photo;
    (window.THREE ? Promise.resolve() : js(opts.three)).then(() => { T = window.THREE; init(); key = ''; }).catch(e => console.warn('BRICK world off:', e));
  }

  let seed = 1103;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  function concreteTex() {                                   // cast cement: fine grain, pores, a few shadowy patches
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    const im = x.createImageData(256, 256);
    for (let i = 0; i < 256 * 256; i++) { const v = 222 + (rnd() - .5) * 30; im.data[i * 4] = v; im.data[i * 4 + 1] = v - 1; im.data[i * 4 + 2] = v - 4; im.data[i * 4 + 3] = 255; }
    x.putImageData(im, 0, 0);
    for (let n = 0; n < 50; n++) { x.fillStyle = `rgba(90,88,84,${.03 + rnd() * .07})`; x.beginPath(); x.arc(rnd() * 256, rnd() * 256, 8 + rnd() * 34, 0, 7); x.fill(); }
    for (let n = 0; n < 140; n++) { x.fillStyle = `rgba(50,50,50,${.25 + rnd() * .4})`; x.beginPath(); x.arc(rnd() * 256, rnd() * 256, .6 + rnd() * 1.6, 0, 7); x.fill(); }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; return t;
  }
  function markTex() {                                       // 1103 in marker on the bare top
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    x.clearRect(0, 0, 256, 256); x.translate(128, 132); x.rotate(-.12); x.transform(1, 0, -.18, 1, 0, 0);
    x.fillStyle = 'rgba(28,28,34,.88)'; x.font = '300 74px "Bradley Hand","Segoe Print","Comic Sans MS",cursive'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('1103', 0, 0);
    const t = new T.CanvasTexture(c); return t;
  }

  function init() {
    if (!T || built) return;
    try { R = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: false }); } catch (e) { console.warn('BRICK world off:', e); return; }
    R.shadowMap.enabled = true; R.shadowMap.type = T.PCFSoftShadowMap;
    R.setClearColor(0x000000, 1);
    scene = new T.Scene(); scene.fog = new T.Fog(0x000000, 3, 9);
    cam = new T.PerspectiveCamera(35, 1, .01, 60);
    // the light: hard, from the left, in front and above, as in the photographs; a faint cold fill from the right
    sun = new T.DirectionalLight(0xfff4e6, 2.3); sun.position.set(-1.6, 3.1, 2.3); sun.castShadow = true;
    const sm = mobile ? 1024 : 2048; sun.shadow.mapSize.set(sm, sm);
    const sc = sun.shadow.camera; sc.left = -1.1; sc.right = 1.1; sc.top = 1.1; sc.bottom = -1.1; sc.near = .5; sc.far = 8;
    sun.shadow.bias = -.0005; sun.shadow.radius = 2; scene.add(sun);
    hemi = new T.HemisphereLight(0x8c929a, 0x000000, .28); scene.add(hemi);
    fill = new T.DirectionalLight(0x8a96a6, .22); fill.position.set(2.2, .8, -1.2); scene.add(fill);

    const ctex = concreteTex();
    const cement = new T.MeshStandardMaterial({ color: 0xffffff, map: ctex, bumpMap: ctex, bumpScale: .0014, roughness: .97, metalness: 0 });
    const steel = new T.MeshStandardMaterial({ color: 0x8e9298, roughness: .45, metalness: .35 });
    const dark = new T.MeshStandardMaterial({ color: 0x3a3c40, roughness: .55, metalness: .3 });
    const iron = new T.MeshStandardMaterial({ color: 0x57554f, roughness: .6, metalness: .35 });
    const rust = new T.MeshStandardMaterial({ color: 0x4f3627, roughness: .92, metalness: .15 });

    // the floor
    const floor = new T.Mesh(new T.PlaneGeometry(30, 30), new T.MeshStandardMaterial({ color: 0x060606, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

    // the vibrating table: a steel deck on four coil springs over a frame, the motor slung under the deck
    deck = new T.Mesh(new T.BoxGeometry(DW, .03, DD), dark); deck.castShadow = deck.receiveShadow = true; scene.add(deck);
    frameG = new T.Group(); scene.add(frameG);
    const legG = new T.BoxGeometry(.05, TT - .16, .05);
    const coil = []; for (let i = 0; i <= 90; i++) { const t = i / 90, an = t * Math.PI * 2 * 6; coil.push(new T.Vector3(Math.cos(an) * .03, t * .11, Math.sin(an) * .03)); }
    const coilG = new T.TubeGeometry(new T.CatmullRomCurve3(coil), 180, .005, 6, false);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => {
      const leg = new T.Mesh(legG, dark); leg.position.set(a * (DW / 2 - .1), (TT - .16) / 2, b * (DD / 2 - .1)); leg.castShadow = true; frameG.add(leg);
      const sp = new T.Mesh(coilG, steel); sp.userData.p = [a * (DW / 2 - .1), b * (DD / 2 - .1)]; sp.castShadow = true; scene.add(sp); springs.push(sp);
    });
    [-1, 1].forEach(b => { const r = new T.Mesh(new T.BoxGeometry(DW - .16, .04, .04), dark); r.position.set(0, TT - .18, b * (DD / 2 - .1)); r.castShadow = true; frameG.add(r); });
    motor = new T.Group();
    const mBody = new T.Mesh(new T.CylinderGeometry(.075, .075, .3, 24), steel); mBody.rotation.z = Math.PI / 2; motor.add(mBody);
    const mCap = new T.Mesh(new T.CylinderGeometry(.09, .09, .03, 24), dark); mCap.rotation.z = Math.PI / 2; mCap.position.x = .16; motor.add(mCap);
    motor.traverse(o => { if (o.isMesh) o.castShadow = true; }); scene.add(motor);

    // the blocks: on the table two to a mould; on the floor four rows of seven
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const m = (r < 2 ? 0 : 1), sideZ = r % 2 ? 1 : -1;
      const tz = (m - .5) * MP + sideZ * (B / 2 + WT / 2), tx = (c - (COLS - 1) / 2) * PITCH;
      BL.push({ r, c, tx, tz, x: tx, z: (r - (ROWS - 1) / 2) * PITCH, ph: rnd() * 6.28, fd: rnd() * .25, rot: (rnd() - .5) * .06, rec: RECIPE[r][c], y: TT, f: 0, m: m * COLS + c });
    }
    const box = new T.BoxGeometry(B, B, B); box.translate(0, B / 2, 0);
    blocks = new T.InstancedMesh(box, cement, NB); blocks.castShadow = blocks.receiveShadow = true; scene.add(blocks);
    for (let i = 0; i < NB; i++) blocks.setColorAt(i, new T.Color(0x77736d));
    // the moulds: two long walls, three cross walls, a lifting ring at each end
    for (let m = 0; m < 2; m++) for (let c = 0; c < COLS; c++) MO.push({ x: (c - (COLS - 1) / 2) * PITCH, z: (m - .5) * MP });
    const WH = B + .012;
    walls = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), steel, MO.length * 5); walls.castShadow = true; scene.add(walls);
    rings = new T.InstancedMesh(new T.TorusGeometry(.016, .0035, 8, 20), steel, MO.length * 2); rings.castShadow = true; scene.add(rings);
    walls.userData.h = WH;
    // the handfuls
    BL.forEach((b, bi) => {
      const R0 = b.rec; if (!R0 || R0 === 'm') return;
      const add = (kind, n) => {
        for (let k = 0; k < (n || 0); k++) {
          let len, rad, tilt;
          if (kind === 0) { len = .045 + rnd() * .04; rad = .0028; tilt = Math.pow(rnd(), .9) * 1.25; }
          else if (kind === 1) { len = .07 + rnd() * .1; rad = .0055 + rnd() * .002; tilt = .3 + rnd() * 1.1; }
          else if (kind === 2) { len = .045 + rnd() * .03; rad = .011 + rnd() * .003; tilt = rnd() * .35; }
          else if (kind === 3) { len = .011; rad = .015; tilt = rnd() * .5; }
          else { len = .004; rad = .016; tilt = rnd() * .6; }
          const az = rnd() * 6.283, ax = new T.Vector3(Math.sin(tilt) * Math.cos(az), Math.cos(tilt), Math.sin(tilt) * Math.sin(az));
          const lim = kind === 2 || kind >= 3 ? .3 : .42;
          NA.push({ b: bi, kind, len, rad, ax, px: (rnd() * 2 - 1) * B * lim, pz: (rnd() * 2 - 1) * B * lim,
            dep: kind >= 3 ? -.001 : kind === 2 ? len * (.35 + rnd() * .2) : len * (.25 + rnd() * .3), t0: rnd(),
            col: kind === 0 ? (rnd() < .2 ? 0x5a3f2c : 0x56544f) : 0 });
        }
      };
      add(0, R0.n); add(1, R0.r); add(2, R0.b); add(3, R0.k); add(4, R0.w);
    });
    const cnt = k => Math.max(1, NA.filter(a => a.kind === k).length);
    const ironN = new T.MeshStandardMaterial({ color: 0xffffff, roughness: .6, metalness: .35 });   // coloured per nail (a material per colouring: r128 keys its programs that way)
    nailS = new T.InstancedMesh(new T.CylinderGeometry(1, 1, 1, 7), ironN, cnt(0)); nailS.castShadow = true; scene.add(nailS);
    nailH = new T.InstancedMesh(new T.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), ironN, cnt(0)); nailH.castShadow = true; scene.add(nailH);
    rebar = new T.InstancedMesh(new T.CylinderGeometry(1, 1, 1, 9), rust, cnt(1)); rebar.castShadow = true; scene.add(rebar);
    bolts = new T.InstancedMesh(new T.CylinderGeometry(1, 1, 1, 18), iron, cnt(2)); bolts.castShadow = true; scene.add(bolts);
    nuts = new T.InstancedMesh(new T.CylinderGeometry(1, 1, 1, 6), iron, cnt(3)); nuts.castShadow = true; scene.add(nuts);
    washers = new T.InstancedMesh(new T.TorusGeometry(1, .38, 8, 18), rust, cnt(4)); washers.castShadow = true; scene.add(washers);
    const col = new T.Color(); let i0 = 0;
    NA.forEach(a => { if (a.kind === 0) { nailS.setColorAt(i0, col.set(a.col)); nailH.setColorAt(i0, col.set(a.col)); i0++; } });
    [nailS, nailH].forEach(m => { if (m.instanceColor) m.instanceColor.needsUpdate = true; });
    // the closing light: as the camera comes to the photograph, the light narrows to the one block and the rest go dark
    const hb = BL[HERO], ld = V(-1.6, 3.1, 2.3).normalize();
    spot = new T.SpotLight(0xfff4e6, 0, 4, Math.atan(.17 / 1.5), .55, 1); spot.position.set((hb.c - (COLS - 1) / 2) * PITCH + ld.x * 1.5, ld.y * 1.5, (hb.r - (ROWS - 1) / 2) * PITCH + ld.z * 1.5);
    spot.target.position.set((hb.c - (COLS - 1) / 2) * PITCH, B * .8, (hb.r - (ROWS - 1) / 2) * PITCH); scene.add(spot.target);
    spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -.0004; spot.shadow.camera.near = .5; spot.shadow.camera.far = 3; scene.add(spot);
    // 1103
    const mb = BL.find(b => b.rec === 'm');
    mark = new T.Mesh(new T.PlaneGeometry(B * .9, B * .9), new T.MeshStandardMaterial({ map: markTex(), transparent: true, roughness: 1, depthWrite: false }));
    mark.rotation.x = -Math.PI / 2; mark.userData.b = mb; scene.add(mark);
    // cement dust in the light: thrown up while the table shakes, drifting after
    const dn = mobile ? 320 : 760, DP = [];
    for (let i = 0; i < dn; i++) DP.push(rnd(), rnd(), rnd(), rnd());
    const dg = new T.BufferGeometry(); dg.setAttribute('aR', new T.Float32BufferAttribute(DP, 4)); dg.setAttribute('position', new T.Float32BufferAttribute(new Float32Array(dn * 3), 3));
    dg.boundingSphere = new T.Sphere(new T.Vector3(), 100);
    dustMat = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending,
      uniforms: { uT: { value: 0 }, uV: { value: 0 }, uA: { value: 1 }, uScale: { value: 600 }, uW: { value: DW }, uD: { value: DD }, uY: { value: TT } },
      vertexShader: `attribute vec4 aR; uniform float uT, uV, uScale, uW, uD, uY; varying float vA;
        void main(){
          float jump = abs(sin(uT * (9. + aR.w * 7.) + aR.z * 30.)) * (.01 + aR.w * .05) * uV;
          vec3 w = vec3((aR.x - .5) * uW * 1.25 + .03 * sin(uT * .31 + aR.y * 20.), uY + .01 + pow(aR.z, 1.6) * .55 + jump + .03 * sin(uT * .23 + aR.x * 40.), (aR.y - .5) * uD * 1.6);
          vec4 mv = modelViewMatrix * vec4(w, 1.); gl_Position = projectionMatrix * mv;
          gl_PointSize = clamp(.0022 * uScale / -mv.z, 1., 3.);
          vA = (.2 + .5 * aR.w) * smoothstep(.04, .25, -mv.z) * (1. - smoothstep(2.5, 6., -mv.z));
        }`,
      fragmentShader: `precision mediump float; uniform float uA; varying float vA;
        void main(){ vec2 c = gl_PointCoord - .5; if (dot(c, c) > .25) discard; gl_FragColor = vec4(vec3(.86, .83, .78) * vA * uA, 1.); }` });
    dust = new T.Points(dg, dustMat); dust.frustumCulled = false; scene.add(dust);
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
    if (!R) return;
    R.setPixelRatio(Math.min(dpr, 1.5)); R.setSize(vw, vh, false);
    cam.aspect = a; cam.updateProjectionMatrix();
    dustMat.uniforms.uScale.value = vh / (2 * tJ) * Math.min(dpr, 1.5);
    key = '';
  }
  function layout(w, h, g) { vw = w; vh = h; mobile = vw < 700; font = `400 ${g.t}px ${g.font}`; size(); }

  const V = (x, y, z) => new T.Vector3(x, y, z);
  const cr = (p0, p1, p2, p3, t) => { const t2 = t * t, t3 = t2 * t; return .5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3); };
  const crv = (a, b, c, d, t) => V(cr(a.x, b.x, c.x, d.x, t), cr(a.y, b.y, c.y, d.y, t), cr(a.z, b.z, c.z, d.z, t));
  function keys() {
    const a = vw / vh, tH = tJ * a, H0 = Math.max(DW / 2 / (tH * .9), DD / 2 / (tJ * .72));
    const hb = BL[HERO], fp = V(hb.x + PC[0], PC[1], hb.z + PC[2]);
    return [
      { u: 0, p: V(0, TT + H0, .002), t: V(0, TT, 0) },
      { u: .95, p: V(.95, TT + .95, 1.25), t: V(0, TT, .05) },
      { u: 1.85, p: V(.95, TT + .42, .8), t: V(.12, TT + .12, .04) },
      { u: 2.6, p: V(-.58, TT + .3, .46), t: V(-.08, TT + .15, -.06) },
      { u: 3.3, p: V(-1.35, TT + .6, 1.45), t: V(0, TT * .6, 0) },
      { u: 3.95, p: V(.25, .48, 1.6), t: V(0, .05, -.05) },
      { u: PH[0], p: fp, t: fp.clone().add(V(PF[0], PF[1], PF[2])) },
    ];
  }

  function step(u) {
    if (u > -1.8) load();
    photo.style.opacity = smt(PH[0], PH[1], u).toFixed(3);
    if (!R) return 1;
    const k0 = `${u.toFixed(4)}|${vw}|${vh}`;
    if (k0 === key) return 1;
    key = k0;
    const M = new T.Matrix4(), Q = new T.Quaternion(), S = V(1, 1, 1), P = V(0, 0, 0), UP = V(0, 1, 0), HIDE = V(.0001, .0001, .0001);
    // the machine: shaking while it runs; then sunk out of the picture
    const vib = smt(VIB[0], VIB[0] + .15, u) * (1 - smt(VIB[1] - .2, VIB[1], u));
    const sx = Math.sin(u * 140) * .0024 * vib, sz = Math.cos(u * 173) * .0012 * vib;
    const down = eio(clamp((u - DOWN[0]) / (DOWN[1] - DOWN[0]), 0, 1)), sink = down * (TT + .25);
    deck.position.set(sz, TT - .015 + sx - sink, 0);
    springs.forEach(s => { s.position.set(s.userData.p[0], TT - .155 - sink, s.userData.p[1]); s.scale.y = 1 + sx * 8; });
    frameG.position.y = -sink; motor.position.set(Math.sin(u * 90) * .0015 * vib, TT - .11 - sink, 0);
    const tabOn = down < .999;
    [deck, motor, frameG, ...springs].forEach(o => { o.visible = tabOn; });
    // the blocks: cement rising in the moulds, dark while wet, pale once dry; set down in their rows as the table goes
    const dry = smt(DRY[0], DRY[1], u), wet = new T.Color(0x5c5953), dr = new T.Color(0xe9e5df), cc = new T.Color();
    const lift = eio(clamp((u - LIFT[0]) / (LIFT[1] - LIFT[0]), 0, 1));
    BL.forEach((b, i) => {
      const f = eo3(clamp((u - FILL[0] - b.fd) / (FILL[1] - FILL[0]), 0, 1)), wob = vib * Math.sin(u * 140 + b.ph) * .0012;
      b.f = Math.max(.0001, f + wob * (f > .99 ? 1 : 0));
      b.y = TT + sx - down * TT; b.x = lerp(b.tx, (b.c - (COLS - 1) / 2) * PITCH, down) + sz; b.z = lerp(b.tz, (b.r - (ROWS - 1) / 2) * PITCH, down);
      P.set(b.x, b.y, b.z); Q.setFromAxisAngle(UP, b.rot * down); S.set(1, b.f, 1);
      blocks.setMatrixAt(i, M.compose(P, Q, S));
      blocks.setColorAt(i, cc.copy(wet).lerp(dr, dry));
    });
    blocks.instanceMatrix.needsUpdate = true; if (blocks.instanceColor) blocks.instanceColor.needsUpdate = true;
    // the moulds, lifted off when the shaking stops
    const mOn = lift < .999, my = TT + sx + lift * .7, WH = walls.userData.h;
    MO.forEach((m, i) => {
      const x = m.x + sz, z = m.z, y = my + WH / 2 - .004; Q.set(0, 0, 0, 1);
      const put = (j, px, pz, w, d) => walls.setMatrixAt(i * 5 + j, M.compose(P.set(px, y, pz), Q, mOn ? S.set(w, WH, d) : HIDE));
      put(0, x - (B + WT) / 2, z, WT, MZ); put(1, x + (B + WT) / 2, z, WT, MZ);
      put(2, x, z - (MZ - WT) / 2, B + 2 * WT, WT); put(3, x, z, B + 2 * WT, WT); put(4, x, z + (MZ - WT) / 2, B + 2 * WT, WT);
      for (let r = 0; r < 2; r++) rings.setMatrixAt(i * 2 + r, M.compose(P.set(x, my + B * .72, z + (r ? 1 : -1) * (MZ / 2 + .012)), Q.set(0, 0, 0, 1), mOn ? S.set(1, 1, 1) : HIDE));
    });
    walls.instanceMatrix.needsUpdate = true; rings.instanceMatrix.needsUpdate = true;
    walls.visible = rings.visible = mOn;
    // the nails: pressed in along their own lines while the cement is wet, block by block, back to front, left to right
    const ix = [0, 0, 0, 0, 0], meshes = [null, rebar, bolts, nuts, washers];
    NA.forEach(a => {
      const b = BL[a.b];
      const t0 = NAIL[0] + (b.c / COLS) * .6 + (b.r / ROWS) * .25 + a.t0 * .35, f = clamp((u - t0) / .3, 0, 1);
      const on = f > 0, push = (1 - eo3(f)) * .16;
      const top = V(b.x + a.px, b.y + B * b.f, b.z + a.pz);
      Q.setFromUnitVectors(UP, a.ax);
      if (a.kind <= 2) {
        const tip = top.clone().addScaledVector(a.ax, -a.dep + push), mid = tip.clone().addScaledVector(a.ax, a.len / 2);
        const sc = on ? S.set(a.rad, a.len, a.rad) : HIDE;
        if (a.kind === 0) {
          nailS.setMatrixAt(ix[0], M.compose(mid, Q, sc));
          nailH.setMatrixAt(ix[0], M.compose(tip.addScaledVector(a.ax, a.len), Q, on ? S.set(.0058, .0042, .0058) : HIDE));
          ix[0]++;
        } else meshes[a.kind].setMatrixAt(ix[a.kind]++, M.compose(mid, Q, sc));
      } else {
        const c = top.clone().addScaledVector(UP, push).addScaledVector(a.ax, a.len / 2 + a.dep);
        if (a.kind === 4) Q.multiply(new T.Quaternion().setFromAxisAngle(V(1, 0, 0), Math.PI / 2));
        meshes[a.kind].setMatrixAt(ix[a.kind]++, M.compose(c, Q, on ? (a.kind === 3 ? S.set(a.rad, a.len, a.rad) : S.set(a.rad, a.rad, a.rad)) : HIDE));
      }
    });
    [nailS, nailH, rebar, bolts, nuts, washers].forEach(m => { m.instanceMatrix.needsUpdate = true; });
    const mb = mark.userData.b;
    mark.position.set(mb.x, mb.y + B * mb.f + .0006, mb.z); mark.rotation.z = mb.rot * down; mark.material.opacity = smt(DRY[0], DRY[1], u) * (mb.f > .99 ? 1 : 0);
    dustMat.uniforms.uT.value = u * 6; dustMat.uniforms.uV.value = vib; dustMat.uniforms.uY.value = TT - sink * .9;
    dustMat.uniforms.uA.value = smt(.25, .6, u) * (1 - .55 * down) * (1 - smt(PH[0] - .3, PH[0] + .1, u) * .7);

    // the camera
    const K = keys(), uu = clamp(u, 0, PH[0]);
    let i = 0; while (i < K.length - 2 && uu > K[i + 1].u) i++;
    const a = K[Math.max(0, i - 1)], b = K[i], c = K[i + 1], d = K[Math.min(K.length - 1, i + 2)];
    const tt = eio(clamp((uu - b.u) / (c.u - b.u), 0, 1));
    const p = crv(a.p, b.p, c.p, d.p, tt), tg = crv(a.t, b.t, c.t, d.t, tt);
    const calm = 1 - down; p.x += sx * .3 * calm; p.y += sz * .3 * calm;
    cam.position.copy(p);
    cam.up.copy(u < .9 ? V(0, 0, -1).lerp(UP, smt(.1, .9, u)).normalize() : UP);
    cam.lookAt(tg);
    const toPhoto = smt(3.95, PH[0], u), nar = smt(4.0, PH[0] - .05, u);
    sun.intensity = 2.3 * (1 - nar); spot.intensity = 3.2 * nar; hemi.intensity = .28 * (1 - .85 * nar); fill.intensity = .22 * (1 - .4 * nar);
    cam.fov = Math.atan(lerp(tJ, tP, toPhoto)) * 360 / Math.PI; cam.updateProjectionMatrix();
    scene.fog.near = lerp(3, .42, toPhoto); scene.fog.far = lerp(9, .85, toPhoto);
    R.render(scene, cam);

    // labels: the parts, each named once while it matters
    ox.setTransform(1, 0, 0, 1, 0, 0); ox.clearRect(0, 0, ov.width, ov.height);
    ox.setTransform(dpr, 0, 0, dpr, 0, 0); ox.font = font; ox.textBaseline = 'middle';
    const B0 = BL[COLS - 1], B2 = BL[2 * COLS + 3], B3 = BL[3 * COLS + 4], B4 = BL[3 * COLS];
    const L = [
      ['Steel moulds, two cavities each', V(B0.x + B / 2 + WT, TT + B, B0.z - B / 2 - WT), .1, .85],
      ['Vibrating table', V(DW / 2, TT - .015, DD / 2), .45, 1.5],
      ['Cement, shaken down', V(B2.x, TT + B * .8, B2.z + B / 2), .65, 1.35],
      ['Nails, rebar, bolts, pressed in by hand', V(B3.x, TT + B + .05, B3.z), 1.6, 2.75],
      ['Coil springs, motor', V(-DW / 2 + .1, TT - .1, DD / 2 - .1), 2.45, 3.05],
      ['28 blocks, 15 cm, four rows of seven', V(B4.x - B / 2, B, B4.z + B / 2), 3.75, 4.3],
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

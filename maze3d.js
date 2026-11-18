// 3D maze journey: camera drops into the maze, then follows the orange path as the page scrolls.
import * as THREE from './three.module.min.js';

const cv = document.getElementById('m3d');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = matchMedia('(max-width:900px)').matches || matchMedia('(hover:none)').matches;

function ok() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); }
  catch (e) { return false; }
}

if (cv && !reduce && ok()) {
  try { start(); } catch (e) { console.warn('3d off', e); document.documentElement.classList.remove('has3d'); }
}

function start() {
  const shot = document.querySelector('.hero .shot');
  const ACC = 0xe8541e, BG = 0x0a0a0a;
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: !mobile, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1 : 1.75));
  renderer.setClearColor(BG, 1);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(BG, 10, mobile ? 46 : 60);
  const cam = new THREE.PerspectiveCamera(mobile ? 70 : 55, 1, 0.1, 400);

  // ---- maze generation (seeded recursive backtracker) ----
  const N = mobile ? 12 : 16, G = 2 * N + 1, S = 2; // cells, grid tiles, tile size
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const wall = Array.from({ length: G }, () => new Array(G).fill(1));
  const st = [[0, 0]]; wall[1][1] = 0;
  const seen = new Set(['0,0']);
  while (st.length) {
    const [x, y] = st[st.length - 1];
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [x + dx, y + dy, dx, dy])
      .filter(([a, b]) => a >= 0 && b >= 0 && a < N && b < N && !seen.has(a + ',' + b));
    if (!nb.length) { st.pop(); continue; }
    const [a, b, dx, dy] = nb[Math.floor(rnd() * nb.length)];
    wall[2 * y + 1 + dy][2 * x + 1 + dx] = 0; wall[2 * b + 1][2 * a + 1] = 0;
    seen.add(a + ',' + b); st.push([a, b]);
  }
  wall[1][0] = 0; wall[G - 2][G - 1] = 0; // entrance + exit

  // solution path (BFS on tiles)
  const key = (x, y) => y * G + x, prev = new Map([[key(0, 1), -1]]), q = [[0, 1]];
  while (q.length) {
    const [x, y] = q.shift(); if (x === G - 1 && y === G - 2) break;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = x + dx, b = y + dy;
      if (a < 0 || b < 0 || a >= G || b >= G || wall[b][a] || prev.has(key(a, b))) continue;
      prev.set(key(a, b), key(x, y)); q.push([a, b]);
    }
  }
  const path = []; for (let k = key(G - 1, G - 2); k !== -1; k = prev.get(k)) path.unshift([k % G, Math.floor(k / G)]);
  const off = (G * S) / 2;
  const W = (x, y) => new THREE.Vector3(x * S - off + S / 2, 0, y * S - off + S / 2);

  // ---- walls ----
  const H = mobile ? 0.7 : 1.8, TW = mobile ? 0.55 : 1; // mobile: low, slim walls
  const tiles = []; for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) if (wall[y][x]) tiles.push([x, y]);
  const wallMat = mobile ? new THREE.MeshLambertMaterial({ color: 0x3a3835, transparent: true, opacity: 0.55 })
    : new THREE.MeshStandardMaterial({ color: 0x2b2a28, roughness: 0.7, metalness: 0.15, emissive: 0x0d0c0b });
  const walls = new THREE.InstancedMesh(new THREE.BoxGeometry(S * TW, H, S * TW), wallMat, tiles.length);
  const capMat = new THREE.MeshBasicMaterial({ color: 0xece6d9, transparent: true, opacity: 0.16 });
  const caps = new THREE.InstancedMesh(new THREE.BoxGeometry(S * 0.18, 0.04, S * 0.18), capMat, tiles.length);
  const m = new THREE.Matrix4();
  tiles.forEach(([x, y], i) => {
    const p = W(x, y);
    m.makeTranslation(p.x, H / 2, p.z); walls.setMatrixAt(i, m);
    m.makeTranslation(p.x, H + 0.03, p.z); caps.setMatrixAt(i, m);
  });
  scene.add(walls);

  // cream outline on wall tops: thin lines joining neighbouring wall tiles (the 2D maze look)
  const seg = [];
  tiles.forEach(([x, y]) => {
    const p = W(x, y);
    if (x + 1 < G && wall[y][x + 1]) { const r = W(x + 1, y); seg.push(p.x, H + 0.02, p.z, r.x, H + 0.02, r.z); }
    if (y + 1 < G && wall[y + 1][x]) { const r = W(x, y + 1); seg.push(p.x, H + 0.02, p.z, r.x, H + 0.02, r.z); }
  });
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
  scene.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0xece6d9, transparent: true, opacity: 0.6 })));

  // floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(G * S * 4, G * S * 4), new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const grid = new THREE.GridHelper(G * S * 4, G * 4, 0x222222, 0x161616); grid.position.y = 0.01; if (!mobile) scene.add(grid);

  // ---- orange path (revealed with scroll) ----
  const pts = path.map(([x, y]) => W(x, y).setY(0.08));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.05);
  const SEG = path.length * 6;
  const tube = new THREE.TubeGeometry(curve, SEG, 0.16, 6, false);
  const pathMat = new THREE.MeshBasicMaterial({ color: 0xff5a1f });
  const pathMesh = new THREE.Mesh(tube, pathMat); scene.add(pathMesh);
  const idxPerSeg = 6 * 6; // radialSegments * 6 indices
  const glowTube = new THREE.TubeGeometry(curve, SEG, 0.34, 6, false);
  const glow = new THREE.Mesh(glowTube, new THREE.MeshBasicMaterial({ color: ACC, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
  if (!mobile) scene.add(glow);
  // faint full route so the way ahead is hinted
  const ghost = new THREE.Mesh(tube, new THREE.MeshBasicMaterial({ color: ACC, transparent: true, opacity: 0.12 }));
  scene.add(ghost);

  // head light + marker
  const head = new THREE.PointLight(ACC, 45, 16, 1.6); if (!mobile) scene.add(head);
  const marker = new THREE.Mesh(new THREE.OctahedronGeometry(0.32), new THREE.MeshBasicMaterial({ color: ACC }));
  scene.add(marker);

  scene.add(new THREE.AmbientLight(0xffffff, 0.8));
  const key1 = new THREE.DirectionalLight(0x9fb4ff, 1.6); key1.position.set(-20, 40, 10); scene.add(key1);
  const rim = new THREE.DirectionalLight(ACC, 0.5); rim.position.set(30, 10, -30); scene.add(rim);

  // dust
  const DN = mobile ? 0 : 700, dp = new Float32Array(DN * 3);
  for (let i = 0; i < DN; i++) { dp[i * 3] = (Math.random() - 0.5) * G * S * 1.4; dp[i * 3 + 1] = Math.random() * 14; dp[i * 3 + 2] = (Math.random() - 0.5) * G * S * 1.4; }
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xffb08a, size: 0.07, transparent: true, opacity: 0.55, depthWrite: false }));
  if (DN) scene.add(dust);

  // ---- camera choreography ----
  const startP = W(0, 1), above = new THREE.Vector3(0, G * S * (mobile ? 1.25 : 0.8), G * S * 0.55);
  const camPos = above.clone().add(new THREE.Vector3(0, 30, 0)), camLook = new THREE.Vector3();
  let intro = reduce ? 1 : 0; const t0 = performance.now();
  let mx = 0, my = 0;
  if (!mobile) addEventListener('pointermove', e => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });

  const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tPos = new THREE.Vector3(), tLook = new THREE.Vector3();

  let lastO1 = '', lastO2 = '';
  function targets() {
    const sy = scrollY, vh = innerHeight, max = Math.max(1, document.documentElement.scrollHeight - vh);
    const hero = Math.min(1, sy / (vh * 1.1));            // 0..1 while leaving the hero
    const prog = Math.min(1, Math.max(0, (sy - vh * 1.1) / (max - vh * 1.1))); // 0..1 over the rest
    // along-path position
    const u = Math.min(0.999, prog);
    curve.getPointAt(u, tmpA); curve.getPointAt(Math.min(1, u + 0.035), tmpB);
    const dir = tmpB.clone().sub(tmpA).setY(0).normalize();
    const follow = tmpA.clone().addScaledVector(dir, -5.5).setY(mobile ? 8.5 : 7.4);
    const followLook = tmpA.clone().addScaledVector(dir, 8).setY(0);
    // hero: from above the whole maze down to the entrance
    const h = ease(hero);
    const entry = startP.clone().add(new THREE.Vector3(-6, mobile ? 7.5 : 6.2, 0));
    tPos.copy(above).lerp(entry, h);
    tLook.set(0, 0, 0).lerp(startP.clone().add(new THREE.Vector3(6, 0, 0)), h);
    if (hero >= 1) { tPos.copy(follow); tLook.copy(followLook); }
    else if (prog <= 0) { /* stay in hero blend */ }
    const o1 = (1 - 0.45 * hero).toFixed(2), o2 = Math.max(0, 1 - hero * 1.5).toFixed(2);
    if (o1 !== lastO1) { cv.style.opacity = o1; lastO1 = o1; }
    if (shot && o2 !== lastO2) { shot.style.opacity = o2; lastO2 = o2; }
    return { u: hero < 1 ? 0 : u, hero };
  }

  function setReveal(u) {
    const n = Math.max(1, Math.floor(SEG * u)) * idxPerSeg;
    tube.setDrawRange(0, n); glowTube.setDrawRange(0, n);
    curve.getPointAt(Math.max(0.0005, u), tmpA);
    marker.position.set(tmpA.x, 0.9 + Math.sin(performance.now() / 400) * 0.15, tmpA.z);
    marker.rotation.y += 0.03;
    head.position.set(tmpA.x, 2.4, tmpA.z);
  }
  // the ghost uses the same geometry: give it its own copy so its range stays full
  ghost.geometry = tube.clone();

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize();

  let running = true;
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) requestAnimationFrame(loop); });

  let pX = 0, pY = 0, pZ = 0, idle = 0;
  let lastU = 0, fN = 0, fT = 0, fPrev = 0, dpr = renderer.getPixelRatio();
  function loop(now) {
    if (!running) return;
    // adaptive quality: if frames are slow, render at a lower resolution
    if (fPrev) { fT += now - fPrev; fN++; if (fN === 60) { if (fT / fN > 34 && dpr > 0.75) { dpr = Math.max(0.75, dpr - 0.35); renderer.setPixelRatio(dpr); resize(); } fN = 0; fT = 0; } }
    fPrev = now;
    const { u } = targets();
    if (intro < 1) {
      intro = Math.min(1, (now - t0) / 2600);
      const k = ease(intro);
      tPos.lerp(camPos, 1 - k);
      cam.position.copy(tPos); camLook.copy(tLook);
    } else {
      cam.position.lerp(tPos, 0.08); camLook.lerp(tLook, 0.08);
    }
    cam.position.x += mx * 1.2; cam.position.y -= my * 0.8;
    scene.fog.far = cam.position.y * 1.6 + 40; scene.fog.near = cam.position.y * 0.6 + 6;
    cam.lookAt(camLook);
    cam.position.x -= mx * 1.2; cam.position.y += my * 0.8;
    lastU += (u - lastU) * 0.1; setReveal(lastU);
    dust.rotation.y = now / 60000;
    glow.material.opacity = 0.28 + Math.sin(now / 450) * 0.12;
    const moved = Math.abs(cam.position.x - pX) + Math.abs(cam.position.y - pY) + Math.abs(cam.position.z - pZ) + Math.abs(u - lastU);
    pX = cam.position.x; pY = cam.position.y; pZ = cam.position.z;
    if (!mobile || moved > 0.002 || intro < 1 || ++idle % 6 === 0) renderer.render(scene, cam);
    requestAnimationFrame(loop);
  }
  document.documentElement.classList.add('has3d');
  requestAnimationFrame(loop);
}

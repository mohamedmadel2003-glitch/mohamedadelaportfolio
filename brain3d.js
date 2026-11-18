// "ادخل جوه دماغه": the hero photo shatters into particles that form a brain,
// then the same particles morph into a new object for every section as the page scrolls.
import * as THREE from './three.module.min.js';

const cv = document.getElementById('m3d');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = matchMedia('(max-width:900px)').matches || matchMedia('(hover:none)').matches;
const glOk = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } })();
if (cv && !reduce && glOk) boot().catch(e => { console.warn('3d off', e); document.documentElement.classList.remove('has3d'); });

async function boot() {
  const N = mobile ? 4200 : 10000;
  const R = Math.random;
  const TAU = Math.PI * 2;

  // ---------- shape generators (each returns Float32Array N*3, roughly within radius ~1.4) ----------
  const out = () => new Float32Array(N * 3);
  const put = (a, i, x, y, z) => { a[i * 3] = x; a[i * 3 + 1] = y; a[i * 3 + 2] = z; };
  const sph = () => { const u = R() * 2 - 1, t = R() * TAU, s = Math.sqrt(1 - u * u); return [s * Math.cos(t), u, s * Math.sin(t)]; };

  function brain() {
    const a = out();
    for (let i = 0; i < N; i++) {
      const k = R();
      if (k < 0.1) { // cerebellum
        const [x, y, z] = sph(); const r = 0.36 * (0.92 + 0.08 * Math.sin(y * 40));
        put(a, i, -0.78 + x * r * 1.1, -0.58 + y * r * 0.7, z * r * 1.3); continue;
      }
      if (k < 0.13) { // stem
        const t = R(), an = R() * TAU;
        put(a, i, -0.3 - t * 0.15 + Math.cos(an) * 0.13, -0.55 - t * 0.6, Math.sin(an) * 0.13); continue;
      }
      const s = R() < 0.5 ? -1 : 1;
      let [x, y, z] = sph();
      const th = Math.atan2(z, x), ph = Math.acos(y);
      const fold = 1 + 0.075 * Math.sin(11 * th + 4 * Math.sin(6 * ph)) * Math.sin(9 * ph + 2 * Math.cos(5 * th));
      x *= 1.25 * fold; y *= 0.9 * fold; z = (Math.abs(z) * 0.62 * fold + 0.05) * s;
      if (y < -0.35) y = -0.35 + (y + 0.35) * 0.35;
      const d = 0.96 + R() * 0.04;
      put(a, i, x * d, y * d + 0.1, z * d);
    }
    return a;
  }

  function pen() {
    const a = out(), tilt = -0.65, c = Math.cos(tilt), s = Math.sin(tilt);
    for (let i = 0; i < N; i++) {
      const k = R(); let x, y, z;
      if (k < 0.62) { const t = R(), an = R() * TAU; x = -1.1 + t * 2.2; y = Math.cos(an) * 0.15; z = Math.sin(an) * 0.15; if (t > 0.92) { y *= 1.15; z *= 1.15; } }
      else if (k < 0.78) { const t = R(), an = R() * TAU, r = 0.15 * (1 - t); x = 1.1 + t * 0.55; y = Math.cos(an) * r; z = Math.sin(an) * r; }
      else if (k < 0.82) { const t = R(); x = -0.6 + t * 0.9; y = 0.2 + R() * 0.02; z = 0.05; } // clip
      else { // ink stroke flowing from the nib
        const t = R(); const px = 1.65 - t * 2.6; x = px; y = -0.15 - 0.55 * t + Math.sin(t * 14) * 0.18 * t; z = Math.cos(t * 9) * 0.05;
        const xx = x * c - y * s, yy = x * s + y * c; put(a, i, xx * 0.85 + 0.1, yy * 0.85 - 0.35, z); continue;
      }
      put(a, i, (x * c - y * s) * 0.85, (x * s + y * c) * 0.85 + 0.25, z);
    }
    return a;
  }

  function book() {
    const a = out();
    for (let i = 0; i < N; i++) {
      const k = R();
      if (k < 0.86) {
        const side = R() < 0.5 ? -1 : 1, u = R(), v = R() * 2 - 1, layer = Math.floor(R() * 4) * 0.025;
        const x = side * (0.06 + u * 1.25), z = 0.5 * Math.sqrt(u) - layer - 0.25, y = v * 0.85;
        put(a, i, x, y * 0.95 + z * 0.15, z);
      } else { // pages flying out
        const p = Math.floor(R() * 5), u = R() - 0.5, v = R() - 0.5, an = p * 0.7 + 0.4;
        const cx = -0.2 + p * 0.35, cy = 0.9 + p * 0.22, cz = 0.2;
        put(a, i, cx + u * 0.45 * Math.cos(an), cy + v * 0.55 + u * 0.45 * Math.sin(an) * 0.4, cz + u * 0.2);
      }
    }
    return a;
  }

  function heart() {
    const a = out();
    for (let i = 0; i < N; i++) {
      const t = R() * TAU, s = Math.pow(R(), 0.35);
      const x = 16 * Math.pow(Math.sin(t), 3), y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      const z = (R() * 2 - 1) * 0.42 * Math.sqrt(Math.max(0, 1 - s * s)) + (R() < 0.5 ? 0 : 0);
      put(a, i, x * s * 0.075, y * s * 0.075 + 0.15, z);
    }
    return a;
  }

  function reel() {
    const a = out();
    for (let i = 0; i < N; i++) {
      const k = R();
      if (k < 0.22) { const an = R() * TAU, r = 1.05 + R() * 0.07; put(a, i, Math.cos(an) * r - 0.35, Math.sin(an) * r + 0.2, (R() - 0.5) * 0.12); }
      else if (k < 0.3) { const an = R() * TAU, r = 0.2 + R() * 0.03; put(a, i, Math.cos(an) * r - 0.35, Math.sin(an) * r + 0.2, (R() - 0.5) * 0.1); }
      else if (k < 0.55) { const h = Math.floor(R() * 5), an = R() * TAU, hc = h * TAU / 5 + 0.3; put(a, i, Math.cos(hc) * 0.62 + Math.cos(an) * 0.27 - 0.35, Math.sin(hc) * 0.62 + Math.sin(an) * 0.27 + 0.2, (R() - 0.5) * 0.08); }
      else { // film strip unrolling
        const t = R(), w = R() - 0.5;
        if (Math.abs(w) > 0.38 && (Math.floor(t * 60) % 2)) { i--; continue; }
        const cx = -0.35 + 1.1 + t * 1.2, cy = 0.2 - 1.12 + 0.1 * Math.sin(t * 5) - t * t * 0.9;
        put(a, i, cx + w * 0.12 * t, cy + w * 0.34, Math.sin(t * 6) * 0.25 + w * 0.05);
      }
    }
    return a;
  }

  function glass() {
    const a = out();
    for (let i = 0; i < N; i++) {
      const k = R();
      if (k < 0.5) { const an = R() * TAU, b = R() * TAU, r = 0.85 + Math.cos(b) * 0.09; put(a, i, Math.cos(an) * r - 0.3, Math.sin(an) * r + 0.3, Math.sin(b) * 0.09); }
      else if (k < 0.66) { const an = R() * TAU, r = Math.sqrt(R()) * 0.78; put(a, i, Math.cos(an) * r - 0.3, Math.sin(an) * r + 0.3, (R() - 0.5) * 0.04); }
      else { const t = R(), an = R() * TAU, r = 0.12; const x = 0.32 + t * 0.95, y = -0.32 - t * 0.95; put(a, i, x + Math.cos(an) * r * 0.7 - 0.3, y + Math.sin(an) * r * 0.7 + 0.3, Math.sin(an) * r); }
    }
    return a;
  }

  async function text(str, family, w = 3.2) {
    try { await document.fonts.load(`900 200px "${family}"`); } catch (e) {}
    const c = document.createElement('canvas'); c.width = 900; c.height = 360;
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.direction = 'rtl'; g.font = `900 220px "${family}", sans-serif`; g.fillText(str, 450, 190);
    const d = g.getImageData(0, 0, 900, 360).data, pts = [];
    for (let y = 0; y < 360; y += 2) for (let x = 0; x < 900; x += 2) if (d[(y * 900 + x) * 4 + 3] > 128) pts.push(x, y);
    let minx = 1e9, maxx = -1e9; for (let i = 0; i < pts.length; i += 2) { minx = Math.min(minx, pts[i]); maxx = Math.max(maxx, pts[i]); }
    const sc = w / Math.max(1, maxx - minx), cx = (minx + maxx) / 2, a = out();
    for (let i = 0; i < N; i++) {
      const j = Math.floor(R() * (pts.length / 2)) * 2;
      put(a, i, (pts[j] - cx + R() * 2) * sc, -(pts[j + 1] - 190 + R() * 2) * sc, (R() - 0.5) * 0.25);
    }
    return a;
  }

  // ---------- photo -> particles ----------
  const img = document.querySelector('#shot img');
  async function photo() {
    const a = out(), col = new Float32Array(N * 3);
    if (!img) return { a, col };
    if (!img.complete) await new Promise(r => { img.onload = r; img.onerror = r; });
    const W = 320, H = Math.round(320 * img.naturalHeight / Math.max(1, img.naturalWidth));
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0, W, H);
    let d; try { d = g.getImageData(0, 0, W, H).data; } catch (e) { return { a, col }; }
    for (let i = 0; i < N; i++) {
      let x, y, r, gg, b, tries = 0;
      do { x = Math.floor(R() * W); y = Math.floor(R() * H); const o = (y * W + x) * 4; r = d[o] / 255; gg = d[o + 1] / 255; b = d[o + 2] / 255; tries++; }
      while (tries < 12 && R() > 0.12 + (0.3 * r + 0.59 * gg + 0.11 * b) * 1.6);
      put(a, i, x / W, y / H, 0); col[i * 3] = Math.min(1, r * 1.7 + 0.04); col[i * 3 + 1] = Math.min(1, gg * 1.7 + 0.03); col[i * 3 + 2] = Math.min(1, b * 1.7 + 0.03);
    }
    return { a, col, iw: img.naturalWidth, ih: img.naturalHeight };
  }

  // ---------- scene ----------
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: false, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 100); cam.position.set(0, 0, 6);
  const viewH = () => 2 * 6 * Math.tan(THREE.MathUtils.degToRad(20));

  const ph = await photo();
  const shapes = {
    brain: brain(), pen: pen(), book: book(), heart: heart(), reel: reel(), glass: glass(),
    n212: await text('212', 'Cairo', 2.6), kalma: await text('كلمة', 'Cairo', 3.0), yalla: await text('يلا؟', 'Cairo', 2.8),
  };
  // map photo samples onto the screen rectangle of the hero shot (object-fit: cover), in world units at z=0
  function photoWorld() {
    const shot = document.getElementById('shot'), res = out();
    const r = shot.getBoundingClientRect(), vh = innerHeight, vw = innerWidth, wh = viewH(), ww = wh * vw / vh;
    const top = r.top + scrollY; // page coords; we freeze it at page top
    const ir = (ph.iw || 1) / (ph.ih || 1), rr = r.width / r.height;
    let dw = r.width, dh = r.height; if (ir > rr) dw = r.height * ir; else dh = r.width / ir;
    const pos = getComputedStyle(img).objectPosition.split(' ').map(v => parseFloat(v) / 100);
    const ox = r.left + (r.width - dw) * (pos[0] || 0.5), oy = top + (r.height - dh) * (pos[1] || 0.3);
    for (let i = 0; i < N; i++) {
      const sx = ox + ph.a[i * 3] * dw, sy = oy + ph.a[i * 3 + 1] * dh;
      put(res, i, (sx / vw - 0.5) * ww, -(sy / vh - 0.5) * wh, (R() - 0.5) * 0.05);
    }
    return res;
  }
  shapes.photo = photoWorld();

  // sections -> shape, side (desktop x offset), sway
  const plan = [
    ['top', 'photo', 0, 0], ['s1', 'brain', -1, 1], ['s2', 'pen', -1, 1], ['s2c', 'n212', -1, 0.3],
    ['s3', 'kalma', -1, 0.3], ['s3b', 'book', -1, 1], ['s4', 'heart', -1, 1], ['s5', 'reel', -1, 1],
    ['s6', 'glass', -1, 1], ['s7', 'yalla', 0, 0.3],
  ].filter(p => document.getElementById(p[0]));

  // particle attributes
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3), colr = new Float32Array(N * 3), rnd = new Float32Array(N), dir = new Float32Array(N * 3);
  const cream = new THREE.Color(0xece6d9), orange = new THREE.Color(0xff5a1f), pal = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    rnd[i] = R(); const [x, y, z] = sph(); dir[i * 3] = x; dir[i * 3 + 1] = y; dir[i * 3 + 2] = z;
    const c = R() < 0.3 ? orange : cream; pal[i * 3] = c.r; pal[i * 3 + 1] = c.g; pal[i * 3 + 2] = c.b;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('color', new THREE.BufferAttribute(colr, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uSize: { value: mobile ? 3.0 : 3.1 }, uAlpha: { value: 0 }, uDpr: { value: renderer.getPixelRatio() }, uPhoto: { value: 1 } },
    vertexShader: `uniform float uTime,uSize,uDpr,uPhoto;attribute float aRnd;varying vec3 vC;varying float vA;
      void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;
      float tw=0.6+0.4*sin(uTime*2.+aRnd*40.);float spark=step(0.985,fract(aRnd*17.+uTime*0.15));
      vA=mix(tw,1.,uPhoto)+spark*1.5*(1.-uPhoto);vC=color+spark*vec3(1.,.4,.1)*(1.-uPhoto);
      gl_PointSize=uSize*uDpr*(0.7+0.6*aRnd)*(6./-mv.z)*mix(1.,1.35,uPhoto);}`,
    fragmentShader: `uniform float uAlpha;varying vec3 vC;varying float vA;
      void main(){vec2 p=gl_PointCoord-.5;float d=length(p);if(d>.5)discard;float a=smoothstep(.5,.0,d);gl_FragColor=vec4(vC,a*vA*uAlpha);}`,
    vertexColors: true,
  });
  const pts = new THREE.Points(geo, mat); scene.add(pts);

  // ---------- scroll choreography ----------
  let anchors = [];
  function measure() {
    const vh = innerHeight;
    anchors = plan.map(([id, shape, side, sway], k) => {
      const el = document.getElementById(id);
      const y = k === 0 ? 0 : el.getBoundingClientRect().top + scrollY - vh * 0.55;
      return { y, shape, side, sway };
    });
    shapes.photo = photoWorld();
  }
  const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  function resize() {
    renderer.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix();
    mat.uniforms.uDpr.value = renderer.getPixelRatio(); measure();
  }
  addEventListener('resize', resize); resize();
  addEventListener('load', measure);
  setTimeout(measure, 1500);

  let mx = 9, my = 9;
  if (!mobile) addEventListener('pointermove', e => {
    const wh = viewH(), ww = wh * innerWidth / innerHeight;
    mx = (e.clientX / innerWidth - 0.5) * ww; my = -(e.clientY / innerHeight - 0.5) * wh;
  }, { passive: true });

  const shot = document.getElementById('shot');
  let lastO = '', running = true, sm = 0;
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) requestAnimationFrame(loop); });

  function loop(now) {
    if (!running) return;
    const t = now / 1000; mat.uniforms.uTime.value = t;
    const sy = scrollY; sm += (sy - sm) * 0.12; // smoothed scroll
    let i = 0; while (i < anchors.length - 1 && sm >= anchors[i + 1].y) i++;
    const A = anchors[i], B = anchors[Math.min(i + 1, anchors.length - 1)];
    const span = Math.max(1, B.y - A.y), local = (sm - A.y) / span;
    const e = i === 0 ? ss(0.08, 0.75, local) : ss(0.6, 1, local);
    const pa = shapes[A.shape], pb = shapes[B.shape];
    const wh = viewH(), ww = wh * innerWidth / innerHeight;
    const scale = mobile ? Math.min(1.05, ww / 3.4) : 1.25;
    const sideX = s => mobile ? 0 : s * ww * 0.25;
    const xa = A.shape === 'photo' ? 0 : sideX(A.side), xb = B.shape === 'photo' ? 0 : sideX(B.side);
    const sa = A.shape === 'photo' ? 1 : scale, sb = B.shape === 'photo' ? 1 : scale;
    const ya = A.shape === 'photo' ? sm * (wh / innerHeight) : (mobile ? 0.35 : 0), yb = B.shape === 'photo' ? sm * (wh / innerHeight) : (mobile ? 0.35 : 0);
    const burst = Math.sin(Math.PI * e) * (i === 0 ? 1.6 : 1.1);
    const sway = (A.sway + (B.sway - A.sway) * e);
    const ang = Math.sin(t * 0.35) * 0.55 * sway + (mobile ? 0 : 0);
    const ca = Math.cos(ang), sn = Math.sin(ang);
    const photoW = i === 0 ? 1 - e : 0;
    for (let k = 0; k < N; k++) {
      const o = k * 3;
      // rotate 3D shapes around y (photo stays flat)
      let ax = pa[o], ay = pa[o + 1], az = pa[o + 2], bx = pb[o], by = pb[o + 1], bz = pb[o + 2];
      if (A.shape !== 'photo') { const x = ax * ca + az * sn; az = -ax * sn + az * ca; ax = x; }
      if (B.shape !== 'photo') { const x = bx * ca + bz * sn; bz = -bx * sn + bz * ca; bx = x; }
      ax = ax * sa + xa; ay = ay * sa + ya; az *= sa; bx = bx * sb + xb; by = by * sb + yb; bz *= sb;
      const ek = Math.min(1, Math.max(0, e * 1.25 - rnd[k] * 0.25)); // staggered
      let x = ax + (bx - ax) * ek + dir[o] * burst, y = ay + (by - ay) * ek + dir[o + 1] * burst, z = az + (bz - az) * ek + dir[o + 2] * burst;
      // breathing
      x += Math.sin(t * 0.8 + rnd[k] * 30) * 0.01 * (1 - photoW); y += Math.cos(t * 0.7 + rnd[k] * 20) * 0.01 * (1 - photoW);
      // mouse repel
      if (!mobile) { const dx = x - mx, dy = y - my, d2 = dx * dx + dy * dy; if (d2 < 0.36) { const f = (0.36 - d2) * 1.4; x += dx * f; y += dy * f; z += f * 0.5; } }
      pos[o] = x; pos[o + 1] = y; pos[o + 2] = z;
      if (i === 0) { const w = photoW; colr[o] = ph.col[o] * w + pal[o] * (1 - w); colr[o + 1] = ph.col[o + 1] * w + pal[o + 1] * (1 - w); colr[o + 2] = ph.col[o + 2] * w + pal[o + 2] * (1 - w); }
      else if (colr[o] !== pal[o]) { colr[o] = pal[o]; colr[o + 1] = pal[o + 1]; colr[o + 2] = pal[o + 2]; }
    }
    geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
    // hero: photo dissolves while particles take over
    const heroP = i === 0 ? local : 1;
    mat.uniforms.uPhoto.value = photoW;
    mat.uniforms.uAlpha.value = Math.min(1, ss(0.0, 0.1, heroP) * 1.0) * (mobile && i > 0 ? 0.75 : 1);
    const so = Math.max(0, 1 - ss(0.02, 0.2, heroP)).toFixed(2);
    if (shot && so !== lastO) { shot.style.opacity = so; lastO = so; }
    renderer.render(scene, cam);
    requestAnimationFrame(loop);
  }
  document.documentElement.classList.add('has3d');
  requestAnimationFrame(loop);
}

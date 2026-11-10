// ===================== التفصيل ثلاثي الأبعاد =====================
// يبني مجسم القطعة (GLB) مباشرة من اختيارات العميل: المقاس والشكل والخامة واللون والسطح والأرجل والأبواب
// ويعرضه بـ model-viewer: دوران 360° + الواقع المعزز بالكاميرا. يعتمد على CC / CS / OPT / METAL / pieceOf من custom.js
(function () {
  const MV = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js';
  let mvReady = null;
  const loadMV = () => mvReady || (mvReady = import(MV));

  // ---------- ألوان ----------
  const rgb = (hex) => { const n = parseInt(String(hex).slice(1), 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
  const lin = (c) => c.map(v => Math.pow(v, 2.2));
  const mix = (hex, k) => { const n = parseInt(hex.slice(1), 16); const f = c => Math.max(0, Math.min(255, Math.round(c * k))); return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(c => f(c).toString(16).padStart(2, '0')).join(''); };

  // ---------- ملمس الخامات (رسم بالـ canvas) ----------
  const texCache = {}, swCache = {};
  const swatch = (kind, hex) => { if (!kind) return ''; tex(kind, hex); return swCache[kind + hex]; };
  function tex(kind, hex) {
    const key = kind + hex; if (texCache[key]) return texCache[key];
    const S = ['marble', 'wood', 'veneer', 'travertine'].includes(kind) ? 1024 : 512, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    g.fillStyle = hex; g.fillRect(0, 0, S, S);
    if (kind === 'wood' || kind === 'veneer') {
      // خشب: أحزمة لون عريضة + ألياف دقيقة متموجة + مسام — الألياف بطول القطعة
      const solid = kind === 'wood';
      for (let i = 0; i < 14; i++) { g.globalAlpha = .1 + rnd() * .14; g.fillStyle = mix(hex, rnd() > .5 ? .84 + rnd() * .1 : 1.05 + rnd() * .1); const y = rnd() * S, hh = 18 + rnd() * 70; g.fillRect(0, y, S, hh); if (y + hh > S) g.fillRect(0, y - S, S, hh); }
      const n = solid ? 150 : 210;
      for (let i = 0; i < n; i++) {
        const y0 = rnd() * S, amp = (solid ? 5 : 2) * (.4 + rnd()), f = (1 + Math.floor(rnd() * 2)) * Math.PI * 2 / S, ph = rnd() * 7;
        g.strokeStyle = rnd() > .45 ? mix(hex, .66 + rnd() * .2) : mix(hex, 1.08 + rnd() * .12); g.lineWidth = .5 + rnd() * (solid ? 1.6 : .9); g.globalAlpha = .16 + rnd() * .3;
        g.beginPath(); for (let x = 0; x <= S; x += 6) { const y = y0 + Math.sin(x * f + ph) * amp; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
      }
      if (solid) for (let k = 0; k < 4; k++) { const cx = rnd() * S, cy = rnd() * S; for (let r = 3; r < 26; r += 4) { g.globalAlpha = .22; g.strokeStyle = mix(hex, .62); g.lineWidth = 1; g.beginPath(); g.ellipse(cx, cy, r * 2.6, r * .55, 0, 0, Math.PI * 2); g.stroke(); } }
      for (let i = 0; i < 900; i++) { g.globalAlpha = .18; g.fillStyle = mix(hex, .6); g.fillRect(rnd() * S, rnd() * S, 2 + rnd() * 5, .7); }
    } else if (kind === 'marble') {
      // رخام: غيوم لونية ناعمة + عروق رئيسية متفرعة + عروق شعرية
      const dark = rgb(hex).reduce((x, y) => x + y, 0) / 3 < .35, vein = (k) => dark ? mix('#ffffff', k) : mix(hex, k);
      for (let i = 0; i < 22; i++) { const x = rnd() * S, y = rnd() * S, r = 60 + rnd() * 150, gr = g.createRadialGradient(x, y, 0, x, y, r); const c = dark ? mix(hex, 1.5 + rnd()) : mix(hex, .86 + rnd() * .1); gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = .1 + rnd() * .12; g.fillStyle = gr; for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) { g.save(); g.translate(ox, oy); g.fillRect(x - r, y - r, r * 2, r * 2); g.restore(); } }
      const drawVein = (x, y, ang, w, len, depth) => {
        g.beginPath(); g.moveTo(x, y); let steps = Math.floor(len / 22);
        for (let i = 0; i < steps; i++) { ang += (rnd() - .5) * .7; const nx = x + Math.cos(ang) * 22, ny = y + Math.sin(ang) * 22; g.quadraticCurveTo(x + (rnd() - .5) * 14, y + (rnd() - .5) * 14, nx, ny); x = nx; y = ny;
          if (depth < 2 && rnd() < .13) { g.stroke(); drawVein(x, y, ang + (rnd() > .5 ? .6 : -.6), w * .5, len * .4, depth + 1); g.beginPath(); g.moveTo(x, y); } }
        g.strokeStyle = vein(dark ? .9 : .5 + rnd() * .15); g.lineWidth = w; g.globalAlpha = dark ? .5 : .32 + rnd() * .25; g.stroke();
      };
      g.filter = 'blur(.7px)';
      for (let i = 0; i < 7; i++) drawVein(rnd() * S, -10, Math.PI / 2 + (rnd() - .5) * 1.1, 1.2 + rnd() * 2.6, S * 1.5, 0);
      g.filter = 'none';
      for (let i = 0; i < 26; i++) drawVein(rnd() * S, rnd() * S, rnd() * Math.PI * 2, .5, 90 + rnd() * 160, 2);
    } else if (kind === 'travertine') {
      // ترافرتين: طبقات أفقية متدرجة + خطوط رفيعة + مسامات طولية
      for (let i = 0; i < 26; i++) { g.globalAlpha = .12 + rnd() * .16; g.fillStyle = mix(hex, rnd() > .5 ? .86 + rnd() * .08 : 1.04 + rnd() * .07); const y = rnd() * S; g.fillRect(0, y, S, 10 + rnd() * 46); }
      for (let i = 0; i < 180; i++) { g.globalAlpha = .14 + rnd() * .22; g.strokeStyle = mix(hex, .74 + rnd() * .2); g.lineWidth = .6 + rnd() * 1.4; const y0 = rnd() * S, ph = rnd() * 7; g.beginPath(); for (let x = 0; x <= S; x += 16) { const y = y0 + Math.sin(x * Math.PI * 2 / S + ph) * 2.5; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
      for (let i = 0; i < 520; i++) { g.globalAlpha = .3 + rnd() * .3; g.fillStyle = mix(hex, .6 + rnd() * .12); g.beginPath(); g.ellipse(rnd() * S, rnd() * S, 1.5 + rnd() * 7, .5 + rnd() * 1.3, 0, 0, Math.PI * 2); g.fill(); }
    } else if (kind === 'sintered') {
      for (let i = 0; i < 1600; i++) { g.globalAlpha = .5; g.fillStyle = mix(hex, .65 + rnd() * .5); g.fillRect(rnd() * S, rnd() * S, 1.4, 1.4); }
      g.globalAlpha = .25; g.strokeStyle = mix(hex, .8); g.lineWidth = 1; g.beginPath(); g.moveTo(0, S * .3); g.bezierCurveTo(S * .3, S * .2, S * .6, S * .5, S, S * .4); g.stroke();
    } else if (kind === 'fabric') {
      g.globalAlpha = .18; g.strokeStyle = mix(hex, .7); g.lineWidth = 1;
      for (let i = -S; i < S * 2; i += 6) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + S, S); g.stroke(); g.beginPath(); g.moveTo(i + S, 0); g.lineTo(i, S); g.stroke(); }
    } else if (kind === 'tufted') {
      const st = 64; g.globalAlpha = .55; g.strokeStyle = mix(hex, .72); g.lineWidth = 3;
      for (let i = -S; i < S * 2; i += st) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + S, S); g.stroke(); g.beginPath(); g.moveTo(i + S, 0); g.lineTo(i, S); g.stroke(); }
      g.globalAlpha = .9; g.fillStyle = mix(hex, .5);
      for (let x = 0; x <= S; x += st) for (let y = 0; y <= S; y += st) { g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(x + st / 2, y + st / 2, 4, 0, Math.PI * 2); g.fill(); }
    } else if (kind === 'grooved') {
      for (let x = 0; x < S; x += 32) { g.globalAlpha = .5; g.fillStyle = mix(hex, .62); g.fillRect(x, 0, 5, S); g.globalAlpha = .25; g.fillStyle = mix(hex, 1.15); g.fillRect(x + 5, 0, 2, S); }
    }
    g.globalAlpha = 1;
    { const sc = document.createElement('canvas'); sc.width = sc.height = 160; sc.getContext('2d').drawImage(c, 0, 0, S * .45, S * .45, 0, 0, 160, 160); swCache[key] = sc.toDataURL('image/jpeg', .8); }
    const b64 = c.toDataURL('image/jpeg', .86).split(',')[1];
    return (texCache[key] = Uint8Array.from(atob(b64), ch => ch.charCodeAt(0)));
  }

  // ---------- باني المجسم ----------
  function Builder() {
    const mats = [], groups = [];
    const matIndex = (m) => { const key = JSON.stringify(m); let i = mats.findIndex(x => x.key === key); if (i < 0) { mats.push({ key, ...m }); groups.push({ P: [], N: [], U: [], I: [] }); i = mats.length - 1; } return i; };
    const T = 0.8; // متر لكل تكرار للملمس
    const face = (gi, pts, n, uvOf, tris) => {
      const G = groups[gi], o = G.P.length / 3;
      for (const p of pts) { G.P.push(...p); G.N.push(...n); G.U.push(...uvOf(p)); }
      if (tris) for (const [a, b2, c] of tris) G.I.push(o + a, o + b2, o + c);
      else for (let k = 1; k < pts.length - 1; k++) G.I.push(o, o + k, o + k + 1);
    };
    // سطح ممتد بين حلقات (نفس عدد النقاط) مع تنعيم الإضاءة: الأسطح المنحنية تطلع ناعمة مو مضلّعة
    function loft(rings, m, cx = 0, cz = 0, caps = true) {
      const gi = matIndex(m), G = groups[gi], n = rings[0].pts.length, R = rings.map(r => ({ y: r.y, pts: r.pts.map(([x, z]) => [x + cx, z + cz]) }));
      const sub = (a, b2) => [a[0] - b2[0], a[1] - b2[1], a[2] - b2[2]], cross = (a, b2) => [a[1] * b2[2] - a[2] * b2[1], a[2] * b2[0] - a[0] * b2[2], a[0] * b2[1] - a[1] * b2[0]];
      const nrm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
      const P3 = (i, k) => [R[i].pts[k % n][0], R[i].y, R[i].pts[k % n][1]];
      // عمودي كل وجه
      const F = []; for (let i = 0; i < R.length - 1; i++) { F.push([]); for (let k = 0; k < n; k++) { const a = P3(i, k), b2 = P3(i, k + 1), c = P3(i + 1, k + 1), d = P3(i + 1, k); let f = cross(sub(b2, a), sub(d, a)); if (Math.hypot(...f) < 1e-12) f = cross(sub(c, b2), sub(d, b2)); F[i].push(nrm(f)); } }
      const dot = (a, b2) => a[0] * b2[0] + a[1] * b2[1] + a[2] * b2[2];
      // عمودي الرأس: متوسط الأوجه المجاورة اللي زاويتها قريبة (الزوايا الحادة تبقى حادة)
      const vnorm = (i, k, side) => { // side 0 = بداية الضلع k، 1 = نهايته
        const base = F[Math.min(i, F.length - 1)][k], acc = [0, 0, 0];
        for (const fi of [i - 1, i]) { if (fi < 0 || fi >= F.length) continue; for (const fk of [k, side ? (k + 1) % n : (k + n - 1) % n]) { const f = F[fi][fk]; if (dot(f, base) > .55) { acc[0] += f[0]; acc[1] += f[1]; acc[2] += f[2]; } } }
        return nrm(acc);
      };
      let run = 0; const U0 = [0]; for (let k = 0; k < n; k++) { const a = R[0].pts[k], b2 = R[0].pts[(k + 1) % n]; run += Math.hypot(b2[0] - a[0], b2[1] - a[1]); U0.push(run); }
      for (let i = 0; i < R.length - 1; i++) for (let k = 0; k < n; k++) {
        const o = G.P.length / 3, v0 = R[i].y / T, v1 = R[i + 1].y / T, u0 = U0[k] / T, u1 = U0[k + 1] / T;
        const q = [[P3(i, k), vnorm(i, k, 0), [u0, v0]], [P3(i, k + 1), vnorm(i, k, 1), [u1, v0]], [P3(i + 1, k + 1), vnorm(i + 1, k, 1), [u1, v1]], [P3(i + 1, k), vnorm(i + 1, k, 0), [u0, v1]]];
        for (const [pp, nn, uv] of q) { G.P.push(...pp); G.N.push(...nn); G.U.push(...uv); }
        G.I.push(o, o + 1, o + 2, o, o + 2, o + 3);
      }
      if (caps) {
        const top = R[R.length - 1], bot = R[0], tris = (pts) => convex(pts) ? null : earcut(pts);
        const tt = tris(top.pts), tb = tris(bot.pts);
        face(gi, top.pts.map(([x, z]) => [x, top.y, z]), [0, 1, 0], ([x, , z]) => [x / T, z / T], tt);
        face(gi, bot.pts.map(([x, z]) => [x, bot.y, z]).reverse(), [0, -1, 0], ([x, , z]) => [x / T, z / T], tb && tb.map(([a, b2, c]) => [n - 1 - a, n - 1 - b2, n - 1 - c]));
      }
    }
    // منشور من شكل مغلق بين ارتفاعين
    const prism = (outline, y0, y1, m, cx = 0, cz = 0) => loft([{ y: y0, pts: outline }, { y: y1, pts: outline }], m, cx, cz);
    // بلاطة بحواف ناعمة مدوّرة (أسطح الطاولات، المقاعد، المراتب): gen(e) يرجّع الشكل منكمش بمقدار e
    function soft(gen, y0, y1, r, m, cx = 0, cz = 0, bottom = true) {
      r = Math.max(0, Math.min(r, (y1 - y0) / 2 - .0005)); const full = gen(0);
      if (r < .0008) return prism(full, y0, y1, m, cx, cz);
      const rings = [], K = 4;
      if (bottom) for (let j = 0; j < K; j++) { const a = j / K * Math.PI / 2; rings.push({ y: y0 + r * (1 - Math.cos(a)), pts: gen(r * (1 - Math.sin(a))) }); }
      else rings.push({ y: y0, pts: full });
      rings.push({ y: y0 + (bottom ? r : 0), pts: full }, { y: y1 - r, pts: full });
      for (let j = 1; j <= K; j++) { const a = j / K * Math.PI / 2; rings.push({ y: y1 - r + r * Math.sin(a), pts: gen(r * (1 - Math.cos(a))) }); }
      if (rings.some(g => g.pts.length !== full.length)) return prism(full, y0, y1, m, cx, cz);
      loft(rings, m, cx, cz);
    }
    // جسم دوراني (قواعد نحتية وأرجل مخروطة): profile = [[y, rx, rz], ...]
    const lathe = (profile, m, cx = 0, cz = 0, seg = 40) => loft(profile.map(([y, rx, rz]) => ({ y, pts: ellO(rx * 2, (rz ?? rx) * 2, seg) })), m, cx, cz);
    const box = (cx, cy, cz, sx, sy, sz, m) => prism(rectO(sx, sz), cy - sy / 2, cy + sy / 2, m, cx, cz);
    const cyl = (cx, y0, y1, cz, r, m, seg = 20) => prism(ellO(r * 2, r * 2, Math.max(seg, 18)), y0, y1, m, cx, cz);
    // عمود مائل بين نقطتين (أرجل X والأرجل السلكية): مقطع ينزاح مع الارتفاع — ناعم بدون درج
    const beam = (x0, y0, z0, x1, y1, z1, t, m) => { const o = t > .02 ? rectO(t, t, t * .25) : ellO(t, t, 10); loft([{ y: y0, pts: o.map(([x, z]) => [x + x0, z + z0]) }, { y: y1, pts: o.map(([x, z]) => [x + x1, z + z1]) }], m); };
    return { prism, loft, soft, lathe, box, cyl, beam, mats, groups };
  }
  // أشكال ثنائية الأبعاد (عكس عقارب الساعة من فوق)
  function rectO(w, d, r = 0) {
    if (r <= 0.001) return [[-w / 2, d / 2], [w / 2, d / 2], [w / 2, -d / 2], [-w / 2, -d / 2]];
    r = Math.min(r, w / 2, d / 2); const out = [], seg = 6;
    const corners = [[w / 2 - r, d / 2 - r, 0], [w / 2 - r, -d / 2 + r, -90], [-w / 2 + r, -d / 2 + r, -180], [-w / 2 + r, d / 2 - r, -270]];
    for (const [cx, cz, a0] of corners) for (let k = 0; k <= seg; k++) { const a = (a0 + 90 - k * 90 / seg) * Math.PI / 180; out.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); }
    return out;
  }
  function ellO(w, d, seg = 48) { const out = []; for (let k = 0; k < seg; k++) { const a = -k / seg * Math.PI * 2; out.push([Math.cos(a) * w / 2, Math.sin(a) * d / 2]); } return out; }
  function convex(pts) { let sg = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], c = pts[(i + 2) % pts.length]; const cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]); if (Math.abs(cr) < 1e-12) continue; const s1 = Math.sign(cr); if (sg && s1 !== sg) return false; sg = s1; } return true; }
  function earcut(pts) {
    const n = pts.length, area = pts.reduce((a, p, i) => { const q = pts[(i + 1) % n]; return a + p[0] * q[1] - q[0] * p[1]; }, 0), flip = area < 0;
    const idx = [...Array(n).keys()]; if (flip) idx.reverse();
    const cr = (a, b, c) => (pts[b][0] - pts[a][0]) * (pts[c][1] - pts[a][1]) - (pts[b][1] - pts[a][1]) * (pts[c][0] - pts[a][0]);
    const inside = (q, a, b, c) => cr(a, b, q) >= 0 && cr(b, c, q) >= 0 && cr(c, a, q) >= 0;
    const out = []; let guard = 0;
    while (idx.length > 3 && guard++ < 20000) {
      let cut = false;
      for (let i = 0; i < idx.length; i++) {
        const a = idx[(i + idx.length - 1) % idx.length], b = idx[i], c = idx[(i + 1) % idx.length];
        if (cr(a, b, c) <= 1e-12) continue;
        if (idx.some(q => q !== a && q !== b && q !== c && inside(q, a, b, c))) continue;
        out.push(flip ? [a, c, b] : [a, b, c]); idx.splice(i, 1); cut = true; break;
      }
      if (!cut) break;
    }
    if (idx.length === 3) out.push(flip ? [idx[0], idx[2], idx[1]] : idx);
    return out;
  }
  // أشكال حديثة: عضوي (حجر نهر)، غيمة، سداسي، ثماني، مربع ناعم — نفس النقاط تُستخدم للمخطط
  function freeO(shape, w, d, seg = 96) {
    const out = [];
    if (shape === 'hex' || shape === 'oct') { const n = shape === 'hex' ? 6 : 8; for (let k = 0; k < n; k++) { const a = -(k / n) * Math.PI * 2 - Math.PI / n; out.push([Math.cos(a) * w / 2 / Math.cos(Math.PI / n), Math.sin(a) * d / 2 / Math.cos(Math.PI / n)].map((v, i) => Math.max(-[w, d][i] / 2, Math.min([w, d][i] / 2, v)))); } return out; }
    for (let k = 0; k < seg; k++) {
      const a = -k / seg * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
      const e = shape === 'squircle' ? .5 : shape === 'organic' ? .8 : .85;
      let f = 1;
      if (shape === 'organic') f = 1 + .075 * Math.sin(a + .7) + .045 * Math.sin(2 * a + 1.9) - .03 * Math.cos(3 * a + .4);
      if (shape === 'cloud') f = .9 + .1 * Math.abs(Math.cos(2.5 * (a + Math.PI)));
      out.push([Math.sign(c) * Math.abs(c) ** e * w / 2 * f, Math.sign(sn) * Math.abs(sn) ** e * d / 2 * f]);
    }
    // نخلي الشكل داخل المقاس المطلوب بالضبط
    const xs = out.map(p => p[0]), zs = out.map(p => p[1]), kx = w / (Math.max(...xs) - Math.min(...xs)), kz = d / (Math.max(...zs) - Math.min(...zs)), mx = (Math.max(...xs) + Math.min(...xs)) / 2, mz = (Math.max(...zs) + Math.min(...zs)) / 2;
    return out.map(([x, z]) => [(x - mx) * kx, (z - mz) * kz]);
  }
  window.czOutline = freeO;
  const FREE = ['organic', 'cloud', 'hex', 'oct', 'squircle'];
  const shapeO = (shape, w, d, edge) => FREE.includes(shape) ? freeO(shape, w, shape === 'hex' || shape === 'oct' ? d : d) : shape === 'round' ? ellO(w, w) : shape === 'oval' ? ellO(w, d) : shape === 'capsule' ? rectO(w, d, Math.min(w, d) / 2) : rectO(w, shape === 'square' ? w : d, edge === 'rounded' ? 0.025 : edge === 'beveled' ? 0.008 : 0);

  // ---------- المواد حسب اختيار العميل ----------
  function materials(st) {
    const body = st.color[1];
    const matTex = { mdf: null, veneer: 'veneer', solid: 'wood', metal: null, fabric: 'fabric' }[st.mat];
    const B = { c: body, tex: matTex, rough: st.mat === 'metal' ? .3 : st.mat === 'fabric' ? .95 : st.mat === 'mdf' ? .45 : .6, metal: st.mat === 'metal' ? .85 : 0 };
    const topC = st.top === 'same' ? body : st.top === 'glass' ? '#cfe3ea' : st.topColor[1];
    const topTex = { marble: 'marble', sintered: 'sintered', travertine: 'travertine', padded: 'tufted', same: matTex }[st.top] || null;
    const TOP = st.top === 'glass' ? { c: '#e4f1f3', alpha: .3, rough: .03, metal: 0 } : { c: topC, tex: topTex, rough: st.top === 'marble' || st.top === 'sintered' ? .2 : st.top === 'padded' ? .9 : B.rough, metal: st.top === 'same' ? B.metal : 0 };
    const lk = ['gold', 'black', 'wood'].includes(st.legs) ? st.legs : (st.legc || 'wood');
    const LEG = lk === 'gold' ? { c: METAL.gold, rough: .25, metal: 1 } : lk === 'black' ? { c: METAL.black, rough: .35, metal: .8 } : lk === 'chrome' ? { c: '#c9ccd1', rough: .12, metal: 1 }
      : lk === 'body' ? { ...B } : lk === 'top' ? { c: topC, tex: topTex, rough: .3, metal: 0 } : { c: mix(body, .72), tex: 'wood', rough: .6, metal: 0 };
    const HANDLE = st.handle === 'black' ? { c: METAL.black, rough: .3, metal: .8 } : { c: METAL.gold, rough: .25, metal: 1 };
    // لمعة سطحية (clearcoat): الرخام والسنتر ستون مصقولين، اللاكيه نص لمعة، الخشب ساتان — والقماش له وبر ناعم
    if (['marble', 'sintered'].includes(st.top)) { TOP.coat = 1; TOP.rough = .32; } else if (st.top === 'travertine') { TOP.coat = .25; TOP.rough = .6; } else if (st.top === 'padded') TOP.sheen = 1;
    if (st.mat === 'mdf') { B.coat = .6; B.rough = .4; } else if (st.mat === 'veneer' || st.mat === 'solid') { B.coat = .3; B.rough = .5; } else if (st.mat === 'fabric') B.sheen = 1;
    if (st.top === 'same') Object.assign(TOP, { coat: B.coat, sheen: B.sheen, rough: B.rough });
    if (LEG.tex === 'wood') LEG.coat = .3;
    return { B, TOP, LEG, HANDLE, DARK: { c: mix(body, .45), rough: .7, metal: 0 }, GROOVE: { c: body, tex: 'grooved', rough: B.rough, metal: B.metal },
      GLASS: { c: '#e4f1f3', alpha: .3, rough: .03, metal: 0 }, GEDGE: { c: '#6fb3a6', alpha: .75, rough: .1, metal: 0 }, MIRROR: { c: '#e9eef0', rough: .02, metal: 1 }, WHITE: { c: '#f6f3ec', tex: 'fabric', rough: .95, metal: 0 },
      TUFT: { c: body, tex: 'tufted', rough: .95, metal: 0 }, GOLD: { c: METAL.gold, rough: .25, metal: 1 } };
  }

  // ---------- بناء القطعة ----------
  function build(st) {
    // st.def: تعريف قطعة جاهز (لمنتجات المتجر) بدل أقسام التفصيل
    const p = st.def || CC[st.cat].pieces.find(x => x.k === st.piece), kind = p.kind, M = materials(st), b = Builder();
    const w = (+st.w || 60) / 100, d = (['round', 'square'].includes(st.shape) ? +st.w : +st.d || 40) / 100, h = (+st.h || 50) / 100;
    const hasTopP = ['table', 'tiered', 'nesting', 'cart'].includes(kind) || ['counter', 'dresser', 'nightstand', 'corner', 'buffet', 'tv', 'sideboard', 'filecab'].includes(p.k);
    const legsOK = kind !== 'unit' && st.piece !== 'wardrobe';
    const slab = st.top === 'glass' ? 0.012 : st.top === 'marble' || st.top === 'sintered' || st.top === 'travertine' ? 0.025 : 0.035;

    // أرجل تحت سطح بشكل معيّن
    function legsUnder(y0, y1, ow, od, shape, cx = 0, cz = 0) {
      if (st.legs === 'hidden') { b.prism(shapeO(shape === 'lshape' ? 'rect' : shape, ow * .78, od * .78, 'straight'), y0, y1, M.B, cx, cz); return; }
      const base = shape === 'lshape' || shape === 'rect' || shape === 'square' ? 'rect' : shape, mn = Math.min(ow, od), H = y1 - y0;
      if (st.legs === 'drum' || st.legs === 'fluted') {
        const k = st.legs === 'fluted' ? .5 : .55, o = shapeO(base === 'rect' ? 'capsule' : base, ow * k, od * k);
        b.prism(st.legs === 'fluted' ? shapeO(base === 'rect' ? 'capsule' : base, ow * k * .9, od * k * .9) : o, y0, y1, M.LEG, cx, cz);
        if (st.legs === 'fluted') { let run = 0; const L = o.map((p, i) => { const q = o[(i + 1) % o.length]; return Math.hypot(q[0] - p[0], q[1] - p[1]); }), per = L.reduce((a, x) => a + x, 0), step = Math.max(.032, per / 80); let next = 0;
          for (let i = 0; i < o.length; i++) { const p = o[i], q = o[(i + 1) % o.length]; while (next <= run + L[i]) { const f = (next - run) / L[i]; b.cyl(cx + p[0] + (q[0] - p[0]) * f, y0, y1, cz + p[1] + (q[1] - p[1]) * f, step * .48, M.LEG, 10); next += step; } run += L[i]; } }
        return;
      }
      if (st.legs === 'sculpt') { // قاعدة نحتية: ساعة رملية منحنية ناعمة
        const n = 26, rx = ow * .2, rz = od * .2, prof = [];
        for (let i = 0; i <= n; i++) { const t = i / n, f = .3 + .7 * Math.abs(2 * t - 1) ** 1.8; prof.push([y0 + H * t, rx * f, rz * f]); }
        b.lathe(prof, M.LEG, cx, cz, 44);
        return;
      }
      if (st.legs === 'fins') { // أرجل ألواح منحنية حول المركز
        const n = ['rect', 'capsule'].includes(base) && ow / od > 1.4 ? 4 : 3, R = mn * .26, len = mn * .2, t = Math.max(.03, mn * .05);
        for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + Math.PI / 2, c = Math.cos(a), sn = Math.sin(a), sx = n === 4 ? ow / od : 1;
          // لوح منحني على شكل C: عريض عند السطح والأرض وينحني للداخل في النص
          const rings = [], K = 14;
          for (let j = 0; j <= K; j++) { const tt = j / K, bow = Math.sin(Math.PI * tt), wide = 1 + .55 * Math.abs(2 * tt - 1) ** 2.2, rr = R * (1.12 - .34 * bow), ln = len * wide;
            rings.push({ y: y0 + H * tt, pts: rectO(ln, t, t * .45).map(([u, v]) => [(u * c - v * sn) + c * rr * sx, (u * sn + v * c) + sn * rr]) }); }
          b.loft(rings, M.LEG, cx, cz); }
        return;
      }
      if (st.legs === 'panel') { // جوانب شلال
        const t = Math.max(.03, slab * 1.1);
        if (['round', 'oval', 'organic', 'cloud', 'hex', 'oct', 'squircle'].includes(base)) { b.box(cx, y0 + H / 2, cz, ow * .55, H, t, M.LEG); b.box(cx, y0 + H / 2, cz, t, H, od * .55, M.LEG); }
        else { b.box(cx - ow / 2 + t / 2 + .005, y0 + H / 2, cz, t, H, od * .98, M.LEG); b.box(cx + ow / 2 - t / 2 - .005, y0 + H / 2, cz, t, H, od * .98, M.LEG); }
        return;
      }
      if (st.legs === 'sled') {
        const ix = Math.min(ow * .42, ow / 2 - .05), iz = od / 2 - .05, t = .02;
        for (const sx of [-1, 1]) { const x = cx + sx * ix; b.box(x, y0 + t / 2, cz, t, t, od - .08, M.LEG); b.box(x, y0 + H / 2, cz - iz, t, H, t, M.LEG); b.box(x, y0 + H / 2, cz + iz, t, H, t, M.LEG); b.box(x, y1 - t / 2, cz, t, t, od - .08, M.LEG); }
        return;
      }
      if (st.legs === 'xbase') {
        const t = .03;
        if (['rect', 'capsule'].includes(base)) { const ix = ow / 2 - .1, iz = od / 2 - .06; for (const sx of [-1, 1]) { const x = cx + sx * ix; b.beam(x, y0, cz - iz, x, y1, cz + iz, t, M.LEG); b.beam(x, y0, cz + iz, x, y1, cz - iz, t, M.LEG); } b.box(cx, y0 + H * .5, cz, ow - .2, t * .8, t * .8, M.LEG); }
        else { const r = mn * .32; b.beam(cx - r, y0, cz, cx + r, y1, cz, t, M.LEG); b.beam(cx + r, y0, cz, cx - r, y1, cz, t, M.LEG); b.beam(cx, y0, cz - r, cx, y1, cz + r, t, M.LEG); b.beam(cx, y0, cz + r, cx, y1, cz - r, t, M.LEG); }
        return;
      }
      if (st.legs === 'hairpin') {
        const pts = ['rect', 'capsule', 'square'].includes(base) ? [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, c]) => [a * (ow / 2 - .07), c * (od / 2 - .07)]) : [45, 165, 285].map(a => [Math.cos(a * Math.PI / 180) * ow * .33, Math.sin(a * Math.PI / 180) * od * .33]);
        for (const [x, z] of pts) { const dx = x > 0 ? .035 : -.035; b.beam(cx + x, y0, cz + z, cx + x - dx, y1, cz + z, .011, M.LEG); b.beam(cx + x, y0, cz + z, cx + x + dx, y1, cz + z, .011, M.LEG); }
        return;
      }
      if (st.legs === 'pedestal') { // عمود وسطي بقاعدة منسابة
        const rc = Math.max(.035, mn * .075), fx = Math.min(ow * .27, .32), fz = shape === 'round' ? fx : Math.min(od * .27, .32), k = fz / fx;
        const prof = [[y0, fx * .96], [y0 + .006, fx], [y0 + .016, fx * .97], [y0 + .03, fx * .62], [y0 + .06, rc * 1.5], [y0 + .11, rc * 1.05], [y0 + .2, rc], [y1 - .05, rc], [y1 - .012, rc * 1.5], [y1, rc * 1.9]];
        b.lathe(prof.map(([yy, r]) => [Math.min(yy, y1), r, r * k]), M.LEG, cx, cz, 44); return; }
      const r = st.legs === 'wood' ? .022 : .014, woodLeg = st.legs === 'wood';
      let pts;
      if (['round', 'oval', 'capsule'].includes(shape)) pts = [45, 135, 225, 315].map(a => [Math.cos(a * Math.PI / 180) * ow * .34, Math.sin(a * Math.PI / 180) * od * .34]);
      else { const ix = Math.min(.06, ow * .12), iz = Math.min(.06, od * .12); pts = [[-ow / 2 + ix, -od / 2 + iz], [ow / 2 - ix, -od / 2 + iz], [ow / 2 - ix, od / 2 - iz], [-ow / 2 + ix, od / 2 - iz]]; }
      for (const [x, z] of pts) { // الأرجل الخشبية مخروطة ومائلة للخارج، والمعدنية مستقيمة بقدم صغيرة
        if (woodLeg) { const sp = Math.min(.035, H * .09), l = Math.hypot(x, z) || 1, o = ellO(r * 2, r * 2, 18), o2 = ellO(r * 1.15, r * 1.15, 18); b.loft([{ y: y0, pts: o2.map(([u, v]) => [u + x + x / l * sp, v + z + z / l * sp]) }, { y: y1, pts: o.map(([u, v]) => [u + x, v + z]) }], M.LEG, cx, cz); }
        else { b.cyl(cx + x, y0 + .004, y1, cz + z, r, M.LEG, 18); b.cyl(cx + x, y0, y0 + .004, cz + z, r * 1.25, M.DARK, 18); } }
      if (st.legs !== 'wood' && !['round', 'oval', 'capsule'].includes(shape) && ow > .5) { // حلقة معدنية سفلية
        b.box(cx, y0 + .01, cz + pts[0][1], ow - .12, .015, .015, M.LEG); b.box(cx, y0 + .01, cz + pts[2][1], ow - .12, .015, .015, M.LEG);
      }
    }
    function tableTop(y, ow, od, shape, cx = 0, cz = 0) {
      if (shape === 'lshape') { b.box(cx, y + slab / 2, cz, ow, slab, od, M.TOP); return; }
      const gen = (e) => shapeO(shape, ow - 2 * e, (['round', 'square'].includes(shape) ? ow : od) - 2 * e, st.edge);
      if (st.edge === 'beveled') { // شطفة واضحة من فوق
        const c = Math.min(.009, slab * .4), full = gen(0), top = gen(c);
        if (top.length === full.length) b.loft([{ y, pts: gen(.0012) }, { y: y + .0012, pts: full }, { y: y + slab - c, pts: full }, { y: y + slab, pts: top }], M.TOP, cx, cz); else b.prism(full, y, y + slab, M.TOP, cx, cz);
      } else b.soft(gen, y, y + slab, st.edge === 'rounded' ? Math.min(.014, slab * .48) : .0022, M.TOP, cx, cz);
      if (st.top === 'glass') b.loft([{ y: y + slab * .2, pts: gen(-.0006) }, { y: y + slab * .8, pts: gen(-.0006) }], M.GEDGE, cx, cz, false);
    }
    function chair(x, z, rot) {
      const s = .45, sh = .46, c = Math.cos(rot), sn = Math.sin(rot), at = (dx, dz) => [x + dx * c - dz * sn, z + dx * sn + dz * c];
      const rot2 = (o) => o.map(([u, v]) => [u * c - v * sn, u * sn + v * c]), CH = { c: st.color[1], tex: 'fabric', rough: .95, metal: 0, sheen: 1 };
      const ctr = at(0, 0); b.soft((e) => rot2(rectO(s - 2 * e, s - 2 * e, .06)), sh - .075, sh + .01, .028, CH, ctr[0], ctr[1]);
      for (const [dx, dz] of [[-.19, -.19], [.19, -.19], [.19, .19], [-.19, .19]]) { const q = at(dx, dz); b.lathe([[0, .009], [sh - .075, .015]], M.LEG, q[0], q[1], 14); }
      const bk = at(0, -s / 2 + .03), bk2 = at(0, -s / 2 - .015); // ظهر مائل شوي للخلف
      const ring = (e, q) => rot2(rectO(s * .96 - 2 * e, .055 - 2 * e, .025)).map(([u, v]) => [u + q[0], v + q[1]]);
      b.loft([{ y: sh - .02, pts: ring(.006, bk) }, { y: sh + .02, pts: ring(0, bk) }, { y: sh + .4, pts: ring(0, bk2) }, { y: sh + .432, pts: ring(.008, bk2) }, { y: sh + .445, pts: ring(.02, bk2) }], CH);
    }
    function cabinet(cx, cz, cw, cd, ch, y0 = 0, opts = {}) {
      const plinth = opts.noLegs ? 0 : legsOK && st.legs !== 'hidden' ? Math.min(.12, ch * .12) : .04;
      const yb = y0 + plinth, H = ch - plinth - (opts.topSlab ? slab : 0);
      if (plinth) { if (legsOK && st.legs !== 'hidden' && !opts.noLegs) legsUnder(y0, yb, cw, cd, 'rect', cx, cz); else b.box(cx, y0 + plinth / 2, cz, cw * .94, plinth, cd * .9, M.DARK); }
      b.box(cx, yb + H / 2, cz, cw, H, cd, M.B);
      // الأبواب
      const n = Math.max(1, Math.min(6, Math.round(cw * 100 / (st.piece === 'wardrobe' ? 55 : 45)))), dw = cw / n, fz = cz + cd / 2;
      if (st.door === 'open') {
        b.box(cx, yb + H / 2, fz - .005, cw - .03, H - .03, .01, M.DARK);
        for (let k = 1; k < 3; k++) b.box(cx, yb + H * k / 3, fz - cd * .3, cw - .04, .02, cd * .6, M.B);
      } else for (let i = 0; i < n; i++) {
        const x = cx - cw / 2 + dw * (i + .5);
        b.box(x, yb + H / 2, fz + .009, dw - .006, H - .012, .018, st.door === 'glass' ? M.GLASS : st.door === 'grooved' ? M.GROOVE : M.B);
        if (st.door === 'pattern') { b.box(x, yb + H / 2, fz + .02, dw * .7, .01, .004, M.GOLD); b.box(x, yb + H / 2, fz + .02, .01, H * .7, .004, M.GOLD); b.box(x, yb + H * .15, fz + .02, dw * .7, .008, .004, M.GOLD); b.box(x, yb + H * .85, fz + .02, dw * .7, .008, .004, M.GOLD); }
        if (st.handle !== 'hidden') b.box(x + (i % 2 ? -1 : 1) * (dw / 2 - .035), yb + H * .55, fz + .03, .012, Math.min(.18, H * .2), .012, M.HANDLE);
      }
      if (opts.topSlab) tableTop(yb + H, cw + .02, cd + .02, 'rect', cx, cz);
    }

    if (kind === 'table') {
      if (st.shape === 'lshape') { tableTop(h - slab, w, d, 'lshape'); legsUnder(0, h - slab, w, d, 'rect'); }
      else { tableTop(h - slab, w, d, st.shape); legsUnder(0, h - slab, w, d, st.shape); }
      if (p.seats) {
        const n = +st.seats || 6;
        if (['round', 'hex', 'oct', 'cloud'].includes(st.shape)) { const R = w / 2 + .18; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; chair(Math.cos(a) * R, Math.sin(a) * R, a + Math.PI / 2); } }
        else { const ends = n >= 8 ? 2 : 0, side = (n - ends) / 2; for (let i = 0; i < side; i++) { const x = -w / 2 + w * (i + .5) / side; chair(x, -d / 2 - .2, 0); chair(x, d / 2 + .2, Math.PI); }
          if (ends) { chair(-w / 2 - .2, 0, -Math.PI / 2); chair(w / 2 + .2, 0, Math.PI / 2); } }
      }
    } else if (kind === 'tiered') {
      if (['sculpt', 'drum', 'fluted', 'fins', 'xbase', 'hairpin', 'sled', 'panel', 'thin', 'wood'].includes(st.legs)) { legsUnder(0, h * .48, w * 1.12, d * 1.12, st.shape); legsUnder(h * .48 + slab, h - slab, w * .7, d * .7, st.legs === 'sculpt' || st.legs === 'drum' || st.legs === 'fluted' ? st.shape : 'round'); }
      else { b.cyl(0, 0, h, 0, .02, M.LEG); b.prism(shapeO(st.shape, w * .6, d * .6), 0, .02, M.LEG); }
      tableTop(h - slab, w, d, st.shape); tableTop(h * .48, w * 1.12, d * 1.12, st.shape);
    } else if (kind === 'nesting') {
      tableTop(h - slab, w * .85, d * .85, st.shape, -w * .08, -d * .06); legsUnder(0, h - slab, w * .85, d * .85, st.shape, -w * .08, -d * .06);
      const w2 = w * .55, d2 = d * .55; tableTop(h * .8 - slab, w2, d2, st.shape, w * .3, d * .28); legsUnder(0, h * .8 - slab, w2, d2, st.shape, w * .3, d * .28);
    } else if (kind === 'cart') {
      for (const y of [h - slab, h * .38]) tableTop(y, w, d, st.shape === 'capsule' ? 'capsule' : 'rect');
      for (const [x, z] of [[-w / 2 + .02, -d / 2 + .02], [w / 2 - .02, -d / 2 + .02], [w / 2 - .02, d / 2 - .02], [-w / 2 + .02, d / 2 - .02]]) { b.cyl(x, .06, h, z, .012, M.LEG, 12); b.cyl(x, 0, .06, z, .03, M.DARK, 16); }
      b.box(w / 2 + .03, h - .05, 0, .015, .015, d * .7, M.LEG);
    } else if (kind === 'bed') {
      const bh = .28, leg = st.legs === 'hidden' ? 0 : .1, mh = .24;
      if (leg) legsUnder(0, leg, w, d, 'rect'); else b.box(0, .03, .02, w * .9, .06, d * .9, M.DARK);
      b.prism(rectO(w, d, st.edge === 'rounded' ? .04 : 0), leg || .06, (leg || .06) + bh, st.mat === 'fabric' ? M.B : M.B);
      b.prism(rectO(w - .04, d - .06, .05), (leg || .06) + bh, (leg || .06) + bh + mh, M.WHITE, 0, .02);
      const hbH = Math.max(h, .9); b.prism(rectO(w + .06, .1, st.edge === 'rounded' ? .04 : 0), 0, hbH, st.mat === 'fabric' ? M.TUFT : M.B, 0, -d / 2 - .05);
      const top = (leg || .06) + bh + mh; for (const s of [-1, 1]) b.prism(rectO(w * .4, .32, .06), top, top + .14, M.WHITE, s * w * .23, -d / 2 + .25);
      b.prism(rectO(w + .02, d * .35, .02), top - .02, top + .015, { c: st.color[1], tex: 'fabric', rough: .95, metal: 0 }, 0, d * .28);
      if (st.piece === 'fullroom') {
        // غرفة كاملة: سرير + 2 كومودينو + دولاب + تسريحة بمرآة — مرتبة على جدار السرير
        const P = st.parts || {}, cm = (x, def) => (+x || def) / 100;
        const nw = cm(P.nightstand?.w, 50), nd = cm(P.nightstand?.d, 40), nh = cm(P.nightstand?.h, 55);
        for (const s of [-1, 1]) cabinet(s * (w / 2 + .07 + nw / 2), -d / 2 + nd / 2 + .05, nw, nd, nh, 0, { topSlab: true });
        const back = -d / 2 - .05;
        const ww = cm(P.wardrobe?.w, 200), wd = cm(P.wardrobe?.d, 60), wh = cm(P.wardrobe?.h, 240), wx = -(w / 2 + .07 + nw + .35 + ww / 2);          // الدولاب يسار
        cabinet(wx, back + wd / 2, ww, wd, wh, 0, { noLegs: true });
        b.box(wx, wh + .02, back + wd / 2, ww + .02, .04, wd + .02, M.B);                    // كرنيشة علوية
        const dw = cm(P.dresser?.w, 120), dd = cm(P.dresser?.d, 45), dh = cm(P.dresser?.h, 80), dx = w / 2 + .07 + nw + .35 + dw / 2;               // التسريحة يمين
        cabinet(dx, back + dd / 2, dw, dd, dh, 0, { topSlab: true });
        const mw = .8, mh = .95; b.prism(rectO(mw, .03, .02), dh + .06, dh + .06 + mh, M.B, dx, back + .03);
        b.box(dx, dh + .06 + mh / 2, back + .05, mw - .06, mh - .06, .005, M.MIRROR);
        b.prism(rectO(.42, .42, .21), .3, .45, { c: st.color[1], tex: 'fabric', rough: .95, metal: 0 }, dx, back + dd + .35);   // كرسي التسريحة
        b.cyl(dx, 0, .3, back + dd + .35, .03, M.LEG, 12);
        // أرضية الغرفة الخفيفة عشان تبان كمجموعة
        const roomW = (dx + dw / 2) - (wx - ww / 2) + .4;
        b.box((dx + dw / 2 + wx - ww / 2) / 2, -.004, back + (d + 1.4) / 2, roomW, .008, d + 1.4, { c: '#e9e2d3', rough: .95, metal: 0 });
      }
    } else if (kind === 'cabinet') {
      if (st.shape === 'lshape') { cabinet(0, 0, w, d, h, 0, { topSlab: hasTopP }); cabinet(-w / 2 + d / 2, d / 2 + w * .25, d, w * .5, h, 0, { topSlab: hasTopP }); }
      else if (['round', 'capsule'].includes(st.shape)) {
        const plinth = legsOK && st.legs !== 'hidden' ? .1 : .03; legsUnder(0, plinth, w, d, st.shape);
        b.prism(shapeO(st.shape, w, d), plinth, h - (hasTopP ? slab : 0), M.B); if (hasTopP) tableTop(h - slab, w + .02, d + .02, st.shape);
        b.box(0, (plinth + h) / 2, d / 2 - .002, .004, (h - plinth) * .8, .01, M.DARK);
        if (st.handle !== 'hidden') b.box(0, h * .6, d / 2 + .015, .1, .012, .012, M.HANDLE);
      } else cabinet(0, 0, w, d, h, 0, { topSlab: hasTopP });
      if (st.piece === 'dresser') { const mw = Math.min(w * .7, .9), mh = Math.min(.9, mw * 1.2); b.prism(rectO(mw, .03, .02), h + .05, h + .05 + mh, M.B, 0, -d / 2 + .03); b.box(0, h + .05 + mh / 2, -d / 2 + .05, mw - .06, mh - .06, .005, M.MIRROR); }
    } else if (kind === 'corner') {
      const low = Math.min(h, .95);
      if (st.shape === 'lshape') { cabinet(0, 0, w, d, low, 0, { topSlab: true }); cabinet(-w / 2 + d / 2, d / 2 + w * .22, d, w * .44, low, 0, { topSlab: true }); }
      else cabinet(0, 0, w, d, low, 0, { topSlab: true });
      const up = h - low - .08; if (up > .2) {
        b.box(0, low + .08 + up / 2, -d / 2 + .01, w, up, .02, st.door === 'grooved' ? M.GROOVE : M.B);
        for (let k = 1; k <= 3; k++) b.box(0, low + .08 + up * k / 4, -d / 2 + .13, w * .9, .025, .24, M.B);
      }
    } else if (kind === 'unit') {
      const low = h * .45; cabinet(0, 0, w, d, low, 0, { noLegs: false });
      const mw = Math.min(w * .34, .6), mh = h * .38; b.prism(rectO(mw, .03, mw / 2), low + .12, low + .12 + mh, M.GOLD, 0, -d / 2 + .02); b.prism(rectO(mw - .04, .01, mw / 2 - .02), low + .14, low + .1 + mh, M.MIRROR, 0, -d / 2 + .04);
      for (let i = 0; i < 4; i++) b.cyl(-w / 2 + .1 + i * .08, h * .88, h * .88 + .06, -d / 2 + .04, .01, M.GOLD, 10);
      b.box(0, h * .86, -d / 2 + .015, w * .4, .08, .02, M.B);
    } else if (kind === 'stool') {
      // كرسي بار: مقعد مبطّن + ظهر اختياري + عمود وقاعدة دائرية + حلقة للقدم
      const seatH = p.seatH || .7, sr = Math.max(.17, w / 2 * .9), FAB = { c: st.color[1], tex: 'fabric', rough: .9, metal: 0 };
      const CHROME = st.legs === 'black' ? { c: '#1c1c1c', rough: .35, metal: .8 } : { c: '#d7d9dc', rough: .15, metal: 1 };
      b.prism(p.square ? rectO(sr * 2, sr * 2, .05) : ellO(sr * 2, sr * 2), seatH - .02, seatH + .07, FAB);
      if (p.back) { const bh = p.back === 'low' ? .16 : .34; b.prism(rectO(sr * 1.8, .05, .03), seatH + .06, seatH + .06 + bh, FAB, 0, -sr * .82); if (p.arms) for (const sx of [-1, 1]) b.box(sx * sr * .9, seatH + .14, -sr * .2, .05, .16, sr * 1.2, FAB); }
      b.cyl(0, .03, seatH - .02, 0, .03, CHROME, 18); b.prism(ellO(.46, .46), 0, .03, CHROME);
      const fr = .2, fy = seatH * .42; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; b.box(Math.cos(a) * fr, fy, Math.sin(a) * fr, .085, .016, .016, CHROME); }
      for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4; b.box(Math.cos(a) * fr / 2, fy, Math.sin(a) * fr / 2, .012, .012, fr, CHROME); }
      if (p.wheels) for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; b.cyl(Math.cos(a) * .22, 0, .03, Math.sin(a) * .22, .02, { c: '#222', rough: .6, metal: 0 }, 10); }
    }
    return glb(b);
  }

  // ---------- كتابة ملف GLB ----------
  function glb(b) {
    const chunks = [], views = [], accessors = [], images = [], textures = [], materialsOut = [], prims = [];
    let off = 0; const push = (arr, target) => { const pad = (4 - (arr.byteLength % 4)) % 4; chunks.push(new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength)); if (pad) chunks.push(new Uint8Array(pad)); views.push({ buffer: 0, byteOffset: off, byteLength: arr.byteLength, ...(target ? { target } : {}) }); off += arr.byteLength + pad; return views.length - 1; };
    const texIdx = {}, used = new Set();
    b.mats.forEach((m, i) => {
      const G = b.groups[i]; if (!G.I.length) return;
      const P = new Float32Array(G.P), N = new Float32Array(G.N), U = new Float32Array(G.U), I = new Uint32Array(G.I);
      const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
      for (let k = 0; k < P.length; k += 3) for (let a = 0; a < 3; a++) { min[a] = Math.min(min[a], P[k + a]); max[a] = Math.max(max[a], P[k + a]); }
      const a0 = accessors.push({ bufferView: push(P, 34962), componentType: 5126, count: P.length / 3, type: 'VEC3', min, max }) - 1;
      const a1 = accessors.push({ bufferView: push(N, 34962), componentType: 5126, count: N.length / 3, type: 'VEC3' }) - 1;
      const a2 = accessors.push({ bufferView: push(U, 34962), componentType: 5126, count: U.length / 2, type: 'VEC2' }) - 1;
      const a3 = accessors.push({ bufferView: push(I, 34963), componentType: 5125, count: I.length, type: 'SCALAR' }) - 1;
      const col = lin(rgb(m.c)); const pbr = { baseColorFactor: [...(m.tex ? [1, 1, 1] : col), m.alpha ?? 1], metallicFactor: m.metal ?? 0, roughnessFactor: m.rough ?? .6 };
      if (m.tex) { const k = m.tex + m.c; if (texIdx[k] == null) { images.push({ bufferView: push(tex(m.tex, m.c)), mimeType: 'image/jpeg' }); textures.push({ source: images.length - 1, sampler: 0 }); texIdx[k] = textures.length - 1; } pbr.baseColorTexture = { index: texIdx[k] }; }
      const ext = {};
      if (m.coat) { ext.KHR_materials_clearcoat = { clearcoatFactor: m.coat, clearcoatRoughnessFactor: .06 }; used.add('KHR_materials_clearcoat'); }
      if (m.sheen) { ext.KHR_materials_sheen = { sheenColorFactor: lin(rgb(mix(m.c, 1.25))), sheenRoughnessFactor: .45 }; used.add('KHR_materials_sheen'); }
      materialsOut.push({ pbrMetallicRoughness: pbr, doubleSided: !!m.alpha, ...(m.alpha ? { alphaMode: 'BLEND' } : {}), ...(Object.keys(ext).length ? { extensions: ext } : {}) });
      prims.push({ attributes: { POSITION: a0, NORMAL: a1, TEXCOORD_0: a2 }, indices: a3, material: materialsOut.length - 1 });
    });
    const json = { asset: { version: '2.0', generator: 'dhubaibi-custom' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }], meshes: [{ primitives: prims }],
      materials: materialsOut, accessors, bufferViews: views, buffers: [{ byteLength: off }], ...(used.size ? { extensionsUsed: [...used] } : {}),
      ...(images.length ? { images, textures, samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }] } : {}) };
    let js = new TextEncoder().encode(JSON.stringify(json)); const jpad = (4 - (js.length % 4)) % 4; if (jpad) { const t = new Uint8Array(js.length + jpad).fill(0x20); t.set(js); js = t; }
    const head = new Uint32Array([0x46546c67, 2, 12 + 8 + js.length + 8 + off]);
    return new Blob([head, new Uint32Array([js.length, 0x4e4f534a]), js, new Uint32Array([off, 0x004e4942]), ...chunks], { type: 'model/gltf-binary' });
  }

  // ---------- العارض ----------
  let mv = null, mini = null, url = '', timer = 0, lastKey = '';
  window.cz3dMount = async function (host) {
    host.innerHTML = '<div class="cz3d-load">جاري تجهيز المجسم ثلاثي الأبعاد…</div>';
    try { await loadMV(); } catch { host.innerHTML = '<div class="cz3d-load">تعذّر تحميل العارض — تأكد من الإنترنت</div>'; return; }
    mv = document.createElement('model-viewer');
    for (const [k, v] of Object.entries({ 'camera-controls': '', 'touch-action': 'pan-y', 'auto-rotate': '', 'auto-rotate-delay': '1500', 'rotation-per-second': '20deg',
      'shadow-intensity': '1.25', 'shadow-softness': '1', exposure: '.86', 'tone-mapping': 'commerce', 'environment-image': 'neutral', 'camera-orbit': '30deg 70deg auto',
      'max-camera-orbit': 'auto 95deg auto', ar: '', 'ar-modes': 'webxr quick-look', 'ar-scale': 'fixed', 'ar-placement': 'floor', 'interaction-prompt': 'none', alt: 'مجسم القطعة', loading: 'eager', reveal: 'auto' })) mv.setAttribute(k, v);
    mv.innerHTML = '<button slot="ar-button" hidden></button>';
    host.innerHTML = ''; host.append(mv);
    window.cz3dUpdate(true);
  };
  window.cz3dUpdate = function (now) {
    if (!mv || !mv.isConnected) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      const key = JSON.stringify([CS.parts, CS.cat, CS.piece, CS.shape, CS.w, CS.d, CS.h, CS.mat, CS.top, CS.edge, CS.legs, CS.legc, CS.door, CS.handle, CS.seats, CS.color[1], CS.topColor[1]]);
      if (key === lastKey) return; lastKey = key;
      let orbit = null; try { orbit = mv.loaded ? mv.getCameraOrbit().toString() : null; } catch {}
      const blob = build(CS), old = url; url = URL.createObjectURL(blob); mv.src = url; if (mini?.isConnected) mini.src = url;
      mv.addEventListener('load', () => { if (orbit) mv.cameraOrbit = orbit; if (old) setTimeout(() => URL.revokeObjectURL(old), 4000); }, { once: true });
    }, now ? 0 : 220);
  };
  window.cz3dMini = async function (host) {
    try { await loadMV(); } catch { return; }
    mini = document.createElement('model-viewer');
    for (const [k, v] of Object.entries({ 'camera-controls': '', 'touch-action': 'pan-y', 'shadow-intensity': '1.25', 'shadow-softness': '1', exposure: '.86', 'tone-mapping': 'commerce', 'environment-image': 'neutral',
      'camera-orbit': '30deg 70deg auto', 'max-camera-orbit': 'auto 95deg auto', 'interaction-prompt': 'none', loading: 'eager', alt: 'معاينة' })) mini.setAttribute(k, v);
    host.append(mini); if (url) mini.src = url;
  };
  window.cz3dAR = async function (note) {
    if (!mv) return;
    await mv.updateComplete;
    if (mv.canActivateAR) return mv.activateAR();
    note.textContent = /Android|iPhone|iPad/i.test(navigator.userAgent)
      ? 'جوالك ما يدعم الكاميرا ثلاثية الأبعاد في هذا المتصفح — جرّب Chrome على أندرويد أو Safari على الآيفون.'
      : 'الكاميرا تشتغل من الجوال: افتح نفس الصفحة من جوالك وصمّم قطعتك، واضغط هذا الزر عشان تشوفها في مكانك.';
  };
  window.cz3dSnapshot = async function () {
    try {
      if (!mv) return null;
      if (!mv.loaded) await new Promise(ok => { mv.addEventListener('load', ok, { once: true }); setTimeout(ok, 8000); });
      if (!mv.loaded) return null;
      await new Promise(r => setTimeout(r, 150));
      return await Promise.race([mv.toBlob({ mimeType: 'image/png', idealAspect: true }), new Promise(r => setTimeout(() => r(null), 4000))]);
    } catch { return null; }
  };
  window.cz3dBuild = build;

  // ---------- أيقونات توضيحية لأزرار الخيارات ----------
  const sv = (body) => `<svg viewBox="0 0 48 48" aria-hidden="true">${body}</svg>`;
  // صور المجسم من عدة زوايا (لصورة الطلب اللي توصل الفرع)
  window.cz3dShots = async function () {
    if (!mv) return [];
    if (!mv.loaded) await new Promise(ok => { mv.addEventListener('load', ok, { once: true }); setTimeout(ok, 8000); });
    if (!mv.loaded) return [];
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    const rot = mv.hasAttribute('auto-rotate'); mv.removeAttribute('auto-rotate');
    // model-viewer ما يرسم إذا كان برا الشاشة — نثبّته مؤقتاً داخل الشاشة (خلف المحتوى) أثناء التصوير
    const css = mv.style.cssText; mv.style.cssText = `position:fixed;left:0;top:0;width:900px;height:640px;transform-origin:0 0;transform:scale(${Math.min(1, innerWidth / 900, innerHeight / 640)});z-index:-1;pointer-events:none`; // نصغّره بصرياً ليكون كامل داخل الشاشة (وإلا تنقص اللقطة) مع بقاء دقة 900×640
    mv.setAttribute('minimum-render-scale', '1');   // بدون تصغير الدقة أثناء التصوير (وإلا تطلع اللقطة مقصوصة على الأجهزة البطيئة)
    await wait(700);
    let orbit = null; try { orbit = mv.getCameraOrbit().toString(); } catch {}
    const out = [];
    for (const [label, o] of [['منظر من الزاوية', '35deg 66deg auto'], ['منظر أمامي', '0deg 82deg auto'], ['منظر جانبي', '90deg 82deg auto']]) {
      try {
        mv.cameraOrbit = o; mv.cameraTarget = 'auto auto auto'; try { await mv.updateFraming?.(); } catch {} mv.jumpCameraToGoal(); await wait(600);   // ننتظر الكاميرا تستقر قبل اللقطة
        // نلتقط لوحة الرسم كاملة بأنفسنا (toBlob أحياناً يقص اللقطة لما تتغير دقة العرض)
        const grab = async () => { await new Promise(r => requestAnimationFrame(() => r())); const cv = [...(mv.shadowRoot?.querySelectorAll('canvas') || [])].filter(c => c.width > 50 && c.offsetWidth > 0).sort((a, b2) => b2.width - a.width)[0]; if (!cv) return null;
          const o = document.createElement('canvas'); o.width = 900; o.height = 640; o.getContext('2d').drawImage(cv, 0, 0, cv.width, cv.height, 0, 0, 900, 640); return await new Promise(ok => o.toBlob(ok, 'image/png')); };
        let blob = await Promise.race([grab().catch(() => null), wait(4000).then(() => null)]);
        if (!blob || blob.size <= 3000) blob = await Promise.race([mv.toBlob({ mimeType: 'image/png', idealAspect: false }), wait(4000).then(() => null)]);
        if (blob && blob.size > 3000) out.push({ label, blob });
      } catch {}
    }
    mv.style.cssText = css; mv.removeAttribute('minimum-render-scale');
    if (orbit) { mv.cameraOrbit = orbit; mv.jumpCameraToGoal(); }
    if (rot) mv.setAttribute('auto-rotate', '');
    return out;
  };
  window.czIcon = function (name, k) {
    const lum = (h) => { const n = parseInt(h.slice(1), 16); return (.3 * (n >> 16) + .59 * ((n >> 8) & 255) + .11 * (n & 255)) / 255; };
    const soft = (h) => lum(h) > .82 ? mix(h, .8) : h;   // الألوان الفاتحة جداً نغمّقها شوي عشان يبان الملمس في الأيقونة
    const body = soft(CS?.color?.[1] || '#c9a57a'), top = soft(CS?.topColor?.[1] || '#eeece7');
    const img = (u, extra = '') => `<i class="sw" style="background-image:url(${u});${extra}"></i>`;
    if (name === 'mat') {
      if (k === 'mdf') return `<i class="sw" style="background:linear-gradient(135deg,${mix(body, 1.12)},${body} 55%,${mix(body, .88)})"></i>`;
      if (k === 'metal') return `<i class="sw" style="background:linear-gradient(90deg,${mix(body, .7)},${mix(body, 1.35)} 35%,${mix(body, 1.05)} 50%,${mix(body, 1.3)} 75%,${mix(body, .75)})"></i>`;
      const raw = CS?.color?.[1] || '#c9a57a', woodC = lum(raw) > .7 ? (k === 'solid' ? '#a57c55' : '#c9a57a') : raw;
      return img(swatch({ veneer: 'veneer', solid: 'wood', fabric: 'fabric' }[k], k === 'fabric' ? (lum(raw) > .7 ? '#b9ad98' : raw) : woodC));
    }
    if (name === 'top') {
      if (k === 'glass') return `<i class="sw" style="background:linear-gradient(135deg,#e9f4f7 0%,#cfe3ea 45%,#fff 50%,#cfe3ea 56%,#b9d3dc 100%);opacity:.85;border:1px solid #a9c6cf"></i>`;
      if (k === 'same') return window.czIcon('mat', CS.mat);
      const tc = k === 'travertine' ? '#d9c7a6' : k === 'marble' ? '#e4e1da' : k === 'padded' ? (lum(top) > .7 ? '#b9ad98' : top) : (lum(top) > .7 ? '#bdbab4' : top);
      return img(swatch({ marble: 'marble', sintered: 'sintered', travertine: 'travertine', padded: 'tufted' }[k], tc));
    }
    const G = '#c9a54a', S = '#6b604a', F = mix(body, .95);
    const I = {
      shape: { rect: sv(`<rect x="6" y="14" width="36" height="20" rx="2" fill="${F}" stroke="${S}" stroke-width="2"/>`), square: sv(`<rect x="12" y="12" width="24" height="24" rx="2" fill="${F}" stroke="${S}" stroke-width="2"/>`),
        round: sv(`<circle cx="24" cy="24" r="15" fill="${F}" stroke="${S}" stroke-width="2"/>`), oval: sv(`<ellipse cx="24" cy="24" rx="19" ry="12" fill="${F}" stroke="${S}" stroke-width="2"/>`),
        capsule: sv(`<rect x="5" y="14" width="38" height="20" rx="10" fill="${F}" stroke="${S}" stroke-width="2"/>`),
        ...Object.fromEntries(FREE.map(k => [k, sv(`<path d="M${freeO(k, 38, k === 'hex' || k === 'oct' || k === 'squircle' ? 30 : 26, 64).map(([x, z]) => `${(24 + x).toFixed(1)} ${(24 + z).toFixed(1)}`).join('L')}Z" fill="${F}" stroke="${S}" stroke-width="2" stroke-linejoin="round"/>`)])), lshape: sv(`<path d="M6 10H42V24H20V40H6Z" fill="${F}" stroke="${S}" stroke-width="2" stroke-linejoin="round"/>`) },
      edge: { straight: sv(`<path d="M6 18H42V30H6Z" fill="${F}" stroke="${S}" stroke-width="2"/>`), rounded: sv(`<rect x="6" y="18" width="36" height="12" rx="6" fill="${F}" stroke="${S}" stroke-width="2"/>`),
        beveled: sv(`<path d="M10 18H38L42 24L38 30H10L6 24Z" fill="${F}" stroke="${S}" stroke-width="2"/>`) },
      legs: { wood: sv(`<rect x="6" y="10" width="36" height="5" fill="${F}" stroke="${S}"/><path d="M11 15L8 40M37 15L40 40" stroke="${mix(body, .72)}" stroke-width="4" stroke-linecap="round"/>`),
        gold: sv(`<rect x="6" y="10" width="36" height="5" fill="${F}" stroke="${S}"/><path d="M11 15V40M37 15V40M11 37H37" stroke="${G}" stroke-width="3"/>`),
        black: sv(`<rect x="6" y="10" width="36" height="5" fill="${F}" stroke="${S}"/><path d="M11 15V40M37 15V40M11 37H37" stroke="#1c1c1c" stroke-width="3"/>`),
        hidden: sv(`<rect x="6" y="10" width="36" height="22" fill="${F}" stroke="${S}"/><rect x="12" y="32" width="24" height="8" fill="${mix(body, .55)}"/>`),
        drum: sv(`<rect x="6" y="10" width="36" height="5" fill="${F}" stroke="${S}"/><rect x="14" y="15" width="20" height="26" rx="2" fill="${mix(body, .8)}" stroke="${S}"/>`),
        fluted: sv(`<rect x="6" y="10" width="36" height="5" fill="${F}" stroke="${S}"/><rect x="14" y="15" width="20" height="26" rx="2" fill="${mix(body, .85)}" stroke="${S}"/>${[17, 20, 23, 26, 29, 32].map(x => `<path d="M${x} 16V40" stroke="${mix(body, .6)}" stroke-width="1.6"/>`).join('')}`),
        sculpt: sv(`<rect x="6" y="10" width="36" height="5" fill="${F}" stroke="${S}"/><path d="M14 15C14 22 20 24 20 28S14 34 14 41H34C34 34 28 32 28 28S34 22 34 15Z" fill="${mix(body, .8)}" stroke="${S}"/>`),
        fins: sv(`<rect x="6" y="10" width="36" height="5" fill="${F}" stroke="${S}"/><path d="M11 15C11 26 17 32 15 41M37 15C37 26 31 32 33 41" stroke="${mix(body, .7)}" stroke-width="5" fill="none" stroke-linecap="round"/><rect x="21" y="15" width="6" height="26" rx="2" fill="${mix(body, .62)}"/>`),
        panel: sv(`<rect x="6" y="10" width="36" height="5" fill="${F}" stroke="${S}"/><rect x="6" y="15" width="5" height="26" fill="${F}" stroke="${S}"/><rect x="37" y="15" width="5" height="26" fill="${F}" stroke="${S}"/>`),
        sled: sv(`<rect x="6" y="10" width="36" height="5" fill="${F}" stroke="${S}"/><path d="M11 15V40H37V15" stroke="${G}" stroke-width="3" fill="none"/>`),
        xbase: sv(`<rect x="6" y="10" width="36" height="5" fill="${F}" stroke="${S}"/><path d="M10 15L38 41M38 15L10 41" stroke="${G}" stroke-width="3"/>`),
        hairpin: sv(`<rect x="6" y="10" width="36" height="5" fill="${F}" stroke="${S}"/><path d="M8 15L12 41L16 15M32 15L36 41L40 15" stroke="#1c1c1c" stroke-width="1.6" fill="none"/>`),
        pedestal: sv(`<rect x="6" y="10" width="36" height="5" fill="${F}" stroke="${S}"/><rect x="21" y="15" width="6" height="22" fill="${G}"/><rect x="12" y="37" width="24" height="4" rx="2" fill="${G}"/>`) },
      door: { flat: sv(`<rect x="8" y="6" width="32" height="36" fill="${F}" stroke="${S}" stroke-width="2"/><path d="M24 6V42" stroke="${S}"/>`),
        grooved: sv(`<rect x="8" y="6" width="32" height="36" fill="${F}" stroke="${S}" stroke-width="2"/>${[13, 18, 23, 28, 33].map(x => `<path d="M${x} 9V39" stroke="${mix(body, .6)}" stroke-width="2"/>`).join('')}`),
        pattern: sv(`<rect x="8" y="6" width="32" height="36" fill="${F}" stroke="${S}" stroke-width="2"/><path d="M12 10L36 38M36 10L12 38" stroke="${G}" stroke-width="2"/>`),
        glass: sv(`<rect x="8" y="6" width="32" height="36" fill="#d6ebf0" stroke="${S}" stroke-width="2"/><path d="M14 12L22 20M26 12L34 20" stroke="#fff" stroke-width="2"/>`),
        open: sv(`<rect x="8" y="6" width="32" height="36" fill="${mix(body, .45)}" stroke="${S}" stroke-width="2"/><path d="M8 18H40M8 30H40" stroke="${F}" stroke-width="3"/>`) },
      handle: { hidden: sv(`<rect x="10" y="6" width="28" height="36" fill="${F}" stroke="${S}" stroke-width="2"/><path d="M30 22l4 2-4 2" stroke="${S}" fill="none"/>`),
        gold: sv(`<rect x="10" y="6" width="28" height="36" fill="${F}" stroke="${S}" stroke-width="2"/><rect x="31" y="16" width="3" height="16" rx="1.5" fill="${G}"/>`),
        black: sv(`<rect x="10" y="6" width="28" height="36" fill="${F}" stroke="${S}" stroke-width="2"/><rect x="31" y="16" width="3" height="16" rx="1.5" fill="#1c1c1c"/>`) },
    };
    return I[name]?.[k] || '';
  };
})();

// يشتغل على GitHub Actions بعد كل حفظ: يجيب غلاف كل فيديو تيك توك ما له غلاف، ويجهّز نسخه المصغّرة
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const W = [480, 800];   // مقاسين بس: بطاقات وصور متوسطة — العرض الكبير ياخذ الأصل (الموقع أخف والنشر أسرع)
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36' };

async function cover(id) {
  for (let k = 0; k < 3; k++) {
    try {
      const html = await (await fetch('https://www.tiktok.com/embed/v2/' + id, { headers: UA })).text();
      let m = /"(?:originCover|cover)":"(https:[^"]+)"/.exec(html) || /"covers":\["(https:[^"]+)"/.exec(html);
      if (m) return JSON.parse('"' + m[1] + '"');
      m = /<video[^>]+poster="(https:[^"]+)"/.exec(html);
      if (m) return m[1].replace(/&amp;/g, '&');
    } catch {}
  }
  return '';
}

// روابط مختصرة (vt.tiktok / maps.app.goo.gl) ما تنقرأ داخل المتصفح — نفكها هنا ونحدّث المحتوى
async function finalUrl(u) {
  try { const r = await fetch(u, { headers: UA, redirect: 'follow' }); return r.url || u; } catch { return u; }
}
async function locOf(u) {
  try {
    let t = u, m;
    for (let k = 0; k < 6; k++) {
      m = /@(-?\d+\.\d+),(-?\d+\.\d+)/.exec(t) || /[?&](?:q|query|ll|destination)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/.exec(t) || /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/.exec(t);
      if (m) return [+m[1], +m[2]];
      const r = await fetch(t, { headers: UA, redirect: 'manual' });
      const loc = r.headers.get('location');
      if (!loc) { const html = await r.text(); m = /@(-?\d+\.\d+),(-?\d+\.\d+)/.exec(html) || /\[null,null,(-?\d+\.\d+),(-?\d+\.\d+)\]/.exec(html); return m ? [+m[1], +m[2]] : null; }
      t = new URL(loc, t).href;
    }
  } catch {}
  return null;
}

(async () => {
  const data = JSON.parse(fs.readFileSync('content.json', 'utf8'));
  let changed = false;
  for (const r of data.reels || []) {
    if (r.tiktokId || !/^https?:\/\/(vm|vt|www)\.tiktok\.com\//.test(r.tiktok || '')) continue;
    const u = await finalUrl(r.tiktok), id = (/\/video\/(\d{8,})/.exec(u) || [])[1];
    if (id) { r.tiktokId = id; r.tiktok = u.split('?')[0]; changed = true; console.log('tiktok', id); }
  }
  for (const b of data.branches || []) {
    if (!b.mapUrl || b.coordsApprox === false) continue;
    const c = await locOf(b.mapUrl);
    if (c && Math.abs(c[0]) <= 90 && Math.abs(c[1]) <= 180) { b.coords = `${c[0]}, ${c[1]}`; b.coordsApprox = false; changed = true; console.log('map', b.name, b.coords); }
  }
  if (changed) fs.writeFileSync('content.json', JSON.stringify(data, null, 2));
  fs.mkdirSync('uploads/t', { recursive: true });
  let made = 0;
  for (const r of data.reels || []) {
    const id = String(r.tiktokId || '');
    if (!/^\d+$/.test(id) || r.poster) continue;
    const file = path.join('uploads', `tt-${id}.webp`);
    if (fs.existsSync(file)) continue;
    const u = await cover(id);
    if (!u || !/tiktokcdn|tiktok|ibytedtos|byteimg/i.test(new URL(u).hostname)) { console.log('no cover', id); continue; }
    const buf = Buffer.from(await (await fetch(u, { headers: UA })).arrayBuffer());
    await sharp(buf).resize({ width: 720, withoutEnlargement: true }).webp({ quality: 82 }).toFile(file);
    for (const w of W) await sharp(file).resize({ width: w, height: w, fit: 'inside', withoutEnlargement: true }).webp({ quality: 78 }).toFile(path.join('uploads', 't', `tt-${id}-${w}.webp`));
    console.log('cover', id); made++;
  }
  console.log('done', made);
})();

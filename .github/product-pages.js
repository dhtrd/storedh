// صفحة ثابتة لكل منتج وقسم: معاينة الرابط في واتساب (صورة المنتج واسمه) + أرشفة قوقل + sitemap
// يشتغل من build-static.js (النشر من الجهاز) ومن GitHub Actions (بعد الحفظ من اللوحة الأونلاين)
const fs = require('fs');
const path = require('path');

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const short = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).trim() + '…' : s; };
const intl = (n) => { let d = String(n || '').replace(/\D/g, ''); if (d.startsWith('0')) d = '966' + d.slice(1); return d; };
const safeId = (id) => /^[\w-]{1,40}$/.test(String(id || ''));

const CSS = `*{box-sizing:border-box}body{margin:0;font-family:Tajawal,Tahoma,Arial,sans-serif;background:#f7f4ec;color:#16140f;line-height:1.8}
a{color:inherit;text-decoration:none}header{background:#0b0c0f;color:#fff;padding:12px 18px;display:flex;align-items:center;gap:12px}
header img{height:38px}header b{font-size:17px}main{max-width:920px;margin:0 auto;padding:18px 16px 60px}
.crumbs{font-size:13.5px;color:#8a7a55;margin-bottom:12px}.crumbs a{color:#b8902f;font-weight:700}
.pd{display:grid;grid-template-columns:1fr 1fr;gap:26px;align-items:start}.pic{background:#fff;border:1px solid #e9e1cf;border-radius:22px;overflow:hidden}
.pic img{display:block;width:100%;height:auto}h1{font-size:clamp(24px,5vw,34px);line-height:1.4;margin:0 0 6px}.cat{color:#b8902f;font-weight:800;font-size:14px}
.desc{white-space:pre-line;color:#4d4535;margin:12px 0}.chips{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}
.chips span{display:inline-flex;align-items:center;gap:6px;background:#fff;border:1px solid #e9e1cf;border-radius:99px;padding:4px 12px;font-size:13.5px}
.chips i{width:14px;height:14px;border-radius:50%;border:1px solid #0002;display:inline-block}
table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e9e1cf;border-radius:14px;overflow:hidden;font-size:14.5px;margin:10px 0}
td{padding:9px 12px;border-bottom:1px solid #f0eadb}td:first-child{color:#8a7a55;width:38%}
.btns{display:grid;gap:10px;margin-top:18px}.btn{display:flex;align-items:center;justify-content:center;padding:14px 18px;border-radius:99px;font-weight:800;font-size:16px}
.gold{background:linear-gradient(120deg,#f1d77a,#c9a54a 60%,#b8902f);color:#111}.wa{background:#25D366;color:#fff}.line{background:#fff;border:1.5px solid #e2d7bf}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-top:14px}
.card{background:#fff;border:1px solid #e9e1cf;border-radius:16px;overflow:hidden}.card img{display:block;width:100%;aspect-ratio:1;object-fit:cover}
.card b{display:block;padding:8px 10px 10px;font-size:14px;line-height:1.5}h2{font-size:20px;margin:26px 0 4px}
footer{text-align:center;color:#8a7a55;font-size:13px;padding:20px}
@media(max-width:700px){.pd{grid-template-columns:1fr;gap:16px}}`;

function page({ title, desc, url, image, body, ld, redirect, C, BASE }) {
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="${ld['@type'] === 'Product' ? 'product' : 'website'}">
<meta property="og:site_name" content="${esc(C.company?.nameAr || '')}">
<meta property="og:locale" content="ar_SA">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(image)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${esc(image)}">
<meta name="theme-color" content="#0b0c0f">
<link rel="icon" href="${BASE}assets/icon-192.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;800&display=swap">
<script>if(/[?&]s=1/.test(location.search))location.replace(${JSON.stringify(redirect)});</script>
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
<style>${CSS}</style>
</head>
<body>
<header><a href="${BASE}"><img src="${BASE}assets/logo-mark.png" alt=""></a><a href="${BASE}"><b>${esc(C.company?.nameAr || '')}</b></a></header>
<main>${body}</main>
<footer>${esc(C.company?.nameAr || '')} — ${esc(C.company?.tagline || '')}</footer>
</body>
</html>
`;
}

async function generate(OUT, C, BASE, sharp) {
  const dir = path.join(OUT, 'p'), imgDir = path.join(dir, 'img');
  fs.mkdirSync(imgDir, { recursive: true });
  const keep = new Set(), urls = [[BASE, '1.0']];
  const wa = intl(C.contact?.whatsapp);
  // صورة المعاينة JPG (واتساب وتويتر ما يضمنون WebP)
  const ogImage = async (id, src) => {
    const file = path.join(imgDir, id + '.jpg'), from = path.join(OUT, String(src || ''));
    keep.add('img/' + id + '.jpg');
    if (!src || !/^uploads\//.test(src) || !fs.existsSync(from)) return BASE + 'assets/og-image.jpg';
    try {
      if (!fs.existsSync(file) || fs.statSync(file).mtimeMs < fs.statSync(from).mtimeMs)
        await sharp(from).rotate().resize({ width: 1000, height: 1000, fit: 'inside', withoutEnlargement: true }).flatten({ background: '#ffffff' }).jpeg({ quality: 82, mozjpeg: true }).toFile(file);
      return `${BASE}p/img/${id}.jpg`;
    } catch { return BASE + 'assets/og-image.jpg'; }
  };
  for (const cat of C.categories || []) {
    if (!safeId(cat.id)) continue;
    const prods = (cat.products || []).filter(p => safeId(p.id) && p.name);
    // ---- صفحة القسم ----
    const cUrl = `${BASE}p/c-${cat.id}.html`, cImg = await ogImage('c-' + cat.id, cat.cover || prods[0]?.images?.[0]?.src);
    const cDesc = short(cat.description || `${cat.title} من ${C.company?.nameAr || ''}`, 170);
    fs.writeFileSync(path.join(dir, `c-${cat.id}.html`), page({
      C, BASE, title: `${cat.title} — ${C.company?.nameAr || ''}`, desc: cDesc, url: cUrl, image: cImg, redirect: `../#c/${cat.id}`,
      ld: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: cat.title, description: cDesc, url: cUrl,
        mainEntity: { '@type': 'ItemList', itemListElement: prods.slice(0, 60).map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: p.name, url: `${BASE}p/${p.id}.html` })) } },
      body: `<nav class="crumbs"><a href="${BASE}">الرئيسية</a> ‹ ${esc(cat.title)}</nav><h1>${esc(cat.title)}</h1>${cat.description ? `<p class="desc">${esc(cat.description)}</p>` : ''}
        <div class="btns"><a class="btn gold" href="../#c/${cat.id}">تصفّح ${esc(cat.title)} بالألوان والتفاصيل</a></div>
        <div class="grid">${prods.map(p => `<a class="card" href="${p.id}.html">${p.images?.[0]?.src ? `<img loading="lazy" src="../${esc(p.images[0].src)}" alt="${esc(p.name)}">` : ''}<b>${esc(p.name)}</b></a>`).join('')}</div>`,
    }));
    keep.add(`c-${cat.id}.html`); urls.push([cUrl, '0.8']);
    // ---- صفحات المنتجات ----
    for (const p of prods) {
      const url = `${BASE}p/${p.id}.html`, img = await ogImage(p.id, p.images?.[0]?.src);
      const desc = short(p.description || `${p.name} — ${cat.title} من ${C.company?.nameAr || ''}`, 170);
      const colors = (p.colors || []).filter(x => x.name).slice(0, 14);
      const specs = (p.specs || []).filter(x => x.label && x.value);
      const others = prods.filter(x => x.id !== p.id).slice(0, 6);
      const msg = `السلام عليكم، أبي أستفسر عن هذا المنتج:\n▪ ${p.name}\n${url}?s=1`;
      fs.writeFileSync(path.join(dir, `${p.id}.html`), page({
        C, BASE, title: `${p.name} — ${C.company?.nameAr || ''}`, desc, url, image: img, redirect: `../#p/${cat.id}/${p.id}`,
        ld: { '@context': 'https://schema.org', '@type': 'Product', name: p.name, description: desc, image: [img], category: cat.title, url,
          brand: { '@type': 'Brand', name: C.company?.nameAr }, ...(p.sizes ? { size: p.sizes } : {}), ...(colors.length ? { color: colors.map(x => x.name).join('، ') } : {}) },
        body: `<nav class="crumbs"><a href="${BASE}">الرئيسية</a> ‹ <a href="c-${cat.id}.html">${esc(cat.title)}</a> ‹ ${esc(p.name)}</nav>
          <div class="pd"><div class="pic">${p.images?.[0]?.src ? `<img src="../${esc(p.images[0].src)}" alt="${esc(p.name)}">` : ''}</div>
          <div><span class="cat">${esc(cat.title)}</span><h1>${esc(p.name)}</h1>
            ${p.description ? `<p class="desc">${esc(p.description)}</p>` : ''}
            ${colors.length ? `<div class="chips">${colors.map(x => `<span>${/^#[0-9a-f]{6}$/i.test(x.hex || '') ? `<i style="background:${x.hex}"></i>` : ''}${esc(x.name)}</span>`).join('')}</div>` : ''}
            ${specs.length || p.sizes ? `<table>${p.sizes ? `<tr><td>المقاس</td><td>${esc(p.sizes)}</td></tr>` : ''}${specs.map(x => `<tr><td>${esc(x.label)}</td><td>${esc(x.value)}</td></tr>`).join('')}</table>` : ''}
            <div class="btns"><a class="btn gold" href="../#p/${cat.id}/${p.id}">عرض المنتج كامل — كل الصور والألوان والفروع</a>
              ${wa ? `<a class="btn wa" href="https://wa.me/${wa}?text=${encodeURIComponent(msg)}">اطلب عبر واتساب</a>` : ''}</div></div></div>
          ${others.length ? `<h2>منتجات مشابهة من ${esc(cat.title)}</h2><div class="grid">${others.map(o => `<a class="card" href="${o.id}.html">${o.images?.[0]?.src ? `<img loading="lazy" src="../${esc(o.images[0].src)}" alt="${esc(o.name)}">` : ''}<b>${esc(o.name)}</b></a>`).join('')}</div>` : ''}`,
      }));
      keep.add(`${p.id}.html`); urls.push([url, '0.7']);
    }
  }
  // تنظيف صفحات وصور المنتجات المحذوفة
  for (const f of fs.readdirSync(dir)) if (f.endsWith('.html') && !keep.has(f)) fs.rmSync(path.join(dir, f));
  for (const f of fs.readdirSync(imgDir)) if (!keep.has('img/' + f)) fs.rmSync(path.join(imgDir, f));
  const today = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([u, pr]) => `<url><loc>${esc(u)}</loc><lastmod>${today}</lastmod><priority>${pr}</priority></url>`).join('\n')}\n</urlset>\n`);
  return urls.length - 1;
}
module.exports = { generate };

// التشغيل المباشر على GitHub Actions من جذر المستودع
if (require.main === module) (async () => {
  const C = JSON.parse(fs.readFileSync('content.json', 'utf8'));
  const [owner, repo] = (process.env.GITHUB_REPOSITORY || '/').split('/');
  const BASE = (C.siteUrl && /^https:\/\//.test(C.siteUrl) ? C.siteUrl : `https://${owner}.github.io/${repo}/`).replace(/\/?$/, '/');
  console.log('pages', await generate('.', C, BASE, require('sharp')));
})();

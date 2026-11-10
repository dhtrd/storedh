// ===================== بحث المنتجات + قائمة المفضلة =====================
// يعتمد على app.js: D, $, esc, sized, waNumber, svg
(function () {
  const KEY = 'dh_favs';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]').filter(x => x && x.c && x.p); } catch { return []; } };
  const save = (l) => { try { localStorage.setItem(KEY, JSON.stringify(l)); } catch {} };
  let favs = load();
  const findP = (c, p) => { const cat = (D?.categories || []).find(x => x.id === c); const prod = cat && (cat.products || []).find(x => x.id === p); return prod ? { cat, prod } : null; };
  const isFav = (c, p) => favs.some(x => x.c === c && x.p === p);
  const firstImg = (p) => (p.images || [])[0]?.src || (p.colors || []).find(x => x.image)?.image || '';
  const norm = (s) => String(s || '').toLowerCase().replace(/[ًٌٍَُِّْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
  const HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.1 4.3 2.4.7-1.3 2.2-2.4 4.3-2.4 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z"/></svg>';
  const SEARCH = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4.2-4.2"/></svg>';

  // ---------- أزرار الهيدر ----------
  const nav = document.querySelector('.nav-in');
  const tools = document.createElement('div'); tools.className = 'nav-tools';
  tools.innerHTML = `<button class="nt-btn" id="ntSearch" aria-label="بحث">${SEARCH}</button><button class="nt-btn" id="ntFav" aria-label="المفضلة">${HEART}<b id="ntFavN" hidden></b></button>`;
  nav?.insertBefore(tools, document.getElementById('navCta'));
  const badge = () => { const b = $('ntFavN'); if (!b) return; b.textContent = favs.length; b.hidden = !favs.length; };

  // ---------- لوحة منزلقة عامة ----------
  function sheet(title, body) {
    document.querySelector('.xs')?.remove();
    const ov = document.createElement('div'); ov.className = 'xs';
    ov.innerHTML = `<div class="xs-box" role="dialog" aria-label="${esc(title)}"><div class="xs-top"><b>${esc(title)}</b><button class="xs-x" aria-label="إغلاق">✕</button></div><div class="xs-body">${body}</div></div>`;
    document.body.append(ov); document.body.style.overflow = 'hidden';
    const close = () => { ov.remove(); document.body.style.overflow = ''; };
    ov.querySelector('.xs-x').onclick = close; ov.addEventListener('click', (e) => { if (e.target === ov || e.target.closest('a[href^="#"]')) close(); });
    addEventListener('keydown', function k(e) { if (e.key === 'Escape') { close(); removeEventListener('keydown', k); } });
    return ov;
  }
  const row = ({ cat, prod }, extra = '') => `<a class="xs-item" href="#p/${esc(cat.id)}/${esc(prod.id)}">
      <span class="xs-img">${firstImg(prod) ? `<img src="${esc(sized(firstImg(prod), 320))}" alt="" loading="lazy">` : ''}</span>
      <span class="xs-txt"><small>${esc(cat.title)}</small><b>${esc(prod.name)}</b>${prod.price ? `<i>${esc(prod.price)}</i>` : ''}</span>${extra}</a>`;

  // ---------- البحث ----------
  function openSearch() {
    const ov = sheet('ابحث في منتجاتنا', `<div class="xs-search">${SEARCH}<input type="search" id="xsQ" placeholder="مثال: سجادة رمادي، طاولة رخام، كرسي بار، جزامة…" autocomplete="off"></div><div id="xsRes" class="xs-list"></div>`);
    const q = ov.querySelector('#xsQ'), res = ov.querySelector('#xsRes');
    const all = (D?.categories || []).flatMap(cat => (cat.products || []).map(prod => ({ cat, prod,
      t: norm([prod.name, cat.title, prod.description, (prod.colors || []).map(c => c.name).join(' '), (prod.specs || []).map(s => s.label + ' ' + s.value).join(' '), prod.sizes].join(' ')) })));
    const draw = () => {
      const words = norm(q.value).split(/\s+/).filter(Boolean);
      if (!words.length) { res.innerHTML = `<div class="xs-chips">${(D?.categories || []).map(c => `<a href="#c/${esc(c.id)}">${esc(c.title)}</a>`).join('')}</div>`; return; }
      const hits = all.map(x => ({ x, s: words.reduce((a, w) => a + (norm(x.prod.name).includes(w) ? 3 : x.t.includes(w) ? 1 : -99), 0) })).filter(h => h.s > 0).sort((a, b) => b.s - a.s).slice(0, 40);
      res.innerHTML = hits.length ? `<p class="xs-n">${hits.length} نتيجة</p>` + hits.map(h => row(h.x)).join('')
        : `<p class="xs-empty">ما لقينا «${esc(q.value)}» — جرّب كلمة ثانية، أو <a href="https://wa.me/${waNumber()}?text=${encodeURIComponent('أبحث عن: ' + q.value)}" target="_blank" rel="noopener">اسألنا واتساب</a></p>`;
    };
    q.addEventListener('input', draw); draw(); setTimeout(() => q.focus(), 60);
  }

  // ---------- المفضلة ----------
  function openFavs() {
    const list = favs.map(f => findP(f.c, f.p)).filter(Boolean);
    const body = list.length ? `<div class="xs-list">${list.map(x => row(x, `<button class="xs-del" data-c="${esc(x.cat.id)}" data-p="${esc(x.prod.id)}" aria-label="إزالة">✕</button>`)).join('')}</div>
      <a class="btn gold xs-send" id="xsSend" target="_blank" rel="noopener">${svg('whatsapp')} أرسل القائمة واتساب</a>
      <p class="xs-note">القائمة محفوظة في جوالك — ترجع لها أي وقت.</p>`
      : `<div class="xs-empty"><div class="xs-heart">${HEART}</div><b>قائمتك فاضية</b><p>اضغط ♡ على أي منتج يعجبك عشان تحفظه هنا، وبعدين أرسل القائمة كاملة لنا برسالة واحدة.</p></div>`;
    const ov = sheet('قائمتي المفضلة', body);
    const send = ov.querySelector('#xsSend');
    if (send) {
      const base = location.href.split('#')[0];
      const msg = `السلام عليكم، أبي أستفسر عن هذي المنتجات من ${D.company?.nameAr || ''}:\n\n` + list.map((x, i) => `${i + 1}. ${x.prod.name} (${x.cat.title})\n${window.DH_STATIC ? base.split('?')[0].replace(/[^/]*$/, '') + 'p/' + x.prod.id + '.html?s=1' : base + '#p/' + x.cat.id + '/' + x.prod.id}`).join('\n\n');
      send.href = `https://wa.me/${waNumber()}?text=${encodeURIComponent(msg)}`;
    }
    ov.addEventListener('click', (e) => { const d = e.target.closest('.xs-del'); if (!d) return; e.preventDefault(); e.stopPropagation(); toggle(d.dataset.c, d.dataset.p); openFavs(); });
  }
  function toggle(c, p) {
    favs = isFav(c, p) ? favs.filter(x => !(x.c === c && x.p === p)) : [...favs, { c, p }];
    save(favs); badge(); paintHearts();
    const b = $('ntFav'); b?.classList.remove('pop'); void b?.offsetWidth; b?.classList.add('pop');
  }

  // ---------- قلوب على البطاقات وصفحة المنتج ----------
  function paintHearts() {
    for (const card of document.querySelectorAll('a.pcard')) {
      const m = /#p\/([^/]+)\/([^/?#]+)/.exec(card.getAttribute('href') || ''); if (!m) continue;
      let h = card.querySelector('.fav-h');
      if (!h) { h = document.createElement('button'); h.type = 'button'; h.className = 'fav-h'; h.innerHTML = HEART; h.dataset.c = decodeURIComponent(m[1]); h.dataset.p = decodeURIComponent(m[2]); card.querySelector('.pimg')?.append(h); }
      const on = isFav(h.dataset.c, h.dataset.p); h.classList.toggle('on', on); h.setAttribute('aria-label', on ? 'إزالة من المفضلة' : 'أضف للمفضلة');
    }
    const acts = document.querySelector('.pd-actions'), m = /^#p\/([^/]+)\/([^/?#]+)/.exec(location.hash);
    if (acts && m) {
      let b = acts.querySelector('.fav-pd');
      if (!b) { b = document.createElement('button'); b.type = 'button'; b.className = 'btn line fav-pd'; acts.append(b); }
      const c = decodeURIComponent(m[1]), p = decodeURIComponent(m[2]), on = isFav(c, p);
      b.dataset.c = c; b.dataset.p = p; b.classList.toggle('on', on);
      const html = `${HEART} <span class="fl">${on ? 'في المفضلة' : 'أضف للمفضلة'}</span><span class="fs">المفضلة</span>`; if (b.dataset.h !== html) { b.dataset.h = html; b.innerHTML = html; } // بدون إعادة رسم مستمرة
    }
  }
  document.addEventListener('click', (e) => {
    const h = e.target.closest('.fav-h, .fav-pd'); if (!h) return;
    e.preventDefault(); e.stopPropagation(); toggle(h.dataset.c, h.dataset.p);
  }, true);
  // ---------- «تواصل معنا» ← اختيار الفرع ورقمه ----------
  function openBranches(mode = 'wa') {
    const all = (D?.branches || []).filter(b => b.whatsapp || b.phone);
    const depts = [...new Set(all.flatMap(b => String(b.departments || '').split(/[,،\n]+/).map(x => x.trim()).filter(Boolean)))];
    const cities = [...new Set(all.map(b => b.city).filter(Boolean))];
    let dept = '', city = '', me = savedLoc();
    const greet = `السلام عليكم، أبي أستفسر من ${D.company?.nameAr || ''}`;
    const ov = sheet('تواصل مع الفرع', `
      <p class="bp-lead">اختر الفرع اللي يناسبك — كل فرع برقمه وقسمه وأوقات دوامه</p>
      <button type="button" class="bp-near" id="bpNear">📍 رتّب حسب الأقرب لي</button>
      ${cities.length > 1 ? `<div class="bp-chips" data-k="city"><button class="on" data-v="">كل المدن</button>${cities.map(c => `<button data-v="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}
      ${depts.length > 1 ? `<div class="bp-chips" data-k="dept"><button class="on" data-v="">كل الأقسام</button>${depts.map(d => `<button data-v="${esc(d)}">${esc(d)}</button>`).join('')}</div>` : ''}
      <div class="bp-list" id="bpList"></div>
      ${waNumber() ? `<a class="bp-main" href="https://wa.me/${waNumber()}?text=${encodeURIComponent(greet)}" target="_blank" rel="noopener">${svg('whatsapp')} مو متأكد أي فرع؟ تواصل مع الرقم العام</a>` : ''}`);
    const draw = () => {
      let list = all.filter(b => (!city || b.city === city) && (!dept || String(b.departments || '').includes(dept)));
      if (me) list = list.map(b => ({ b, d: coordsOf(b) ? km(me, coordsOf(b)) : 1e9 })).sort((x, y) => x.d - y.d).map(x => Object.assign({}, x.b, { _km: x.d < 1e8 ? x.d : null }));
      $('bpList').innerHTML = list.map((b, i) => {
        const num = b.whatsapp || b.phone, st = openStatus(b);
        return `<div class="bp-item">
          <div class="bp-info"><b>${esc(b.name)}${me && i === 0 ? ' <i class="bp-tag">الأقرب لك</i>' : ''}</b>
            <small>${esc([b.area, b.city].filter(Boolean).join(' — '))}${b._km != null ? ` • ${b._km < 1 ? Math.round(b._km * 1000) + ' م' : b._km.toFixed(1) + ' كم'}` : ''}</small>
            ${b.departments ? `<small class="bp-dep">${esc(b.departments)}</small>` : ''}
            <span class="bp-row"><a class="bp-num" href="tel:${digits(num)}" dir="ltr">${esc(num)}</a>${st ? `<span class="open-pill ${st.open ? 'on' : 'off'}">${esc(st.text)}</span>` : ''}</span></div>
          <div class="bp-acts">
            ${b.whatsapp ? `<a class="bp-b wa ${mode === 'wa' ? 'pri' : ''}" href="https://wa.me/${intl(b.whatsapp)}?text=${encodeURIComponent(greet + ' — ' + b.name)}" target="_blank" rel="noopener">${svg('whatsapp')}<span>واتساب</span></a>` : ''}
            <a class="bp-b call ${mode === 'call' ? 'pri' : ''}" href="tel:${digits(num)}">${svg('phone')}<span>اتصال</span></a>
            <a class="bp-b map" href="${esc(mapHref(b))}" target="_blank" rel="noopener">${svg('pin')}<span>الموقع</span></a>
          </div></div>`;
      }).join('') || '<p class="xs-empty">ما فيه فرع بهذا الاختيار</p>';
    };
    ov.addEventListener('click', (e) => {
      const c = e.target.closest('.bp-chips button'); if (!c) return;
      const k = c.parentElement.dataset.k; if (k === 'city') city = c.dataset.v; else dept = c.dataset.v;
      c.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === c)); draw();
    });
    $('bpNear').onclick = () => {
      const btn = $('bpNear');
      if (!navigator.geolocation) { btn.textContent = 'المتصفح ما يدعم تحديد الموقع'; return; }
      btn.textContent = '… جاري تحديد موقعك';
      navigator.geolocation.getCurrentPosition(pos => {
        me = [pos.coords.latitude, pos.coords.longitude]; try { sessionStorage.setItem('dh_loc', JSON.stringify(me)); } catch {}
        btn.textContent = '✓ مرتبة حسب الأقرب لك'; draw();
      }, () => { btn.textContent = 'ما قدرنا نحدد موقعك — اختر من القائمة'; }, { timeout: 10000, maximumAge: 600000 });
    };
    if (me) $('bpNear').textContent = '✓ مرتبة حسب الأقرب لك';
    draw();
  }
  window.openBranches = openBranches;
  document.addEventListener('click', (e) => {
    const a = e.target.closest('#heroWa, #navCta, #waFloat, #mbWa, #mbCall, .cbtn[href^="https://wa.me"], .cbtn[href^="tel:"]');
    if (!a || !(D?.branches || []).some(b => b.whatsapp || b.phone)) return;
    e.preventDefault(); e.stopPropagation();
    openBranches(a.id === 'mbCall' || /^tel:/.test(a.getAttribute('href') || '') ? 'call' : 'wa');
  }, true);
  $('ntSearch')?.addEventListener('click', openSearch);
  $('ntFav')?.addEventListener('click', openFavs);
  addEventListener('keydown', (e) => { if (e.key === '/' && !/input|textarea/i.test(document.activeElement?.tagName || '')) { e.preventDefault(); openSearch(); } });
  // نعيد رسم القلوب كل ما تغيّر المحتوى (صفحات المنتجات والأقسام تنبني ديناميكياً)
  let raf = 0; new MutationObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(paintHearts); }).observe(document.body, { childList: true, subtree: true });
  // ---------- شاهدتها مؤخراً ----------
  const RKEY = 'dh_recent';
  const recent = () => { try { return JSON.parse(localStorage.getItem(RKEY) || '[]'); } catch { return []; } };
  function track() {
    const m = /^#p\/([^/]+)\/([^/?#]+)/.exec(location.hash);
    if (m && findP(m[1], m[2])) { try { localStorage.setItem(RKEY, JSON.stringify([{ c: m[1], p: m[2] }, ...recent().filter(x => x.p !== m[2])].slice(0, 12))); } catch {} }
    drawRecent();
  }
  function drawRecent() {
    const list = recent().map(x => findP(x.c, x.p)).filter(Boolean), anchor = $('installments') || $('reels');
    let sec = $('recentSec');
    if (list.length < 2 || !anchor || typeof productCard !== 'function') { sec?.remove(); return; }
    if (!sec) { sec = document.createElement('section'); sec.className = 'sec'; sec.id = 'recentSec'; anchor.before(sec); }
    sec.innerHTML = `<div class="wrap"><div class="sec-head split"><div><span class="eyebrow">كمّل من وين وقفت</span><h2>شاهدتها مؤخراً</h2></div>
      <button type="button" class="recent-clear" id="recentClear">مسح</button></div>
      <div class="scroller" id="recentRow">${list.map(x => productCard(x.cat, x.prod, true)).join('')}</div></div>`;
    $('recentClear').onclick = () => { try { localStorage.removeItem(RKEY); } catch {} sec.remove(); };
    window.markImgs?.(sec);
  }
  addEventListener('hashchange', track);
  const ready = setInterval(() => { if (window.D || typeof D !== 'undefined' && D) { clearInterval(ready); favs = favs.filter(f => findP(f.c, f.p)); save(favs); badge(); paintHearts(); track(); } }, 300);
})();

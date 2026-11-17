/* ==========================================================
   الواجهة (4): شاشة المزاد — العنوان، اللاعبين، العنصر، السعر، الحالة
   ========================================================== */
function setHTML(el, html, key) { if (UI.last[key] !== html) { UI.last[key] = html; el.innerHTML = html; } }
function renderAuction(v) {
  const lot = v.lot, st = stageOf(v); if (!lot || !st) return;
  $('a-title').textContent = st.ico + ' ' + st.name;
  $('a-sub').textContent = 'جولة ' + (v.si + 1) + ' من ' + v.ns + ' · ' + st.label;
  $('a-pause').textContent = v.pa ? '▶' : '⏸'; $('a-pause').setAttribute('aria-label', v.pa ? 'كمّل' : 'إيقاف مؤقت');
  renderRoster(v, lot, st);
  if (UI.lotKey !== lot.k) { UI.lotKey = lot.k; clearStamp(); renderLotCard(v, lot, st); UI.last.feed = ''; UI.last.price = null; }
  renderBoard(v, lot);
  renderStatus(v);
  renderVeil(v);
  renderDock(v);
}
function renderRoster(v, lot, st) {
  const html = v.pl.map(p => {
    let bd = '';
    if (!p.on) bd = '<i class="bd of">أوفلاين</i>';
    else if (lot.s === 'live' && lot.l === p.i) bd = '<i class="bd">متصدر</i>';
    else if (lot.s === 'sold' && lot.l === p.i) bd = '<i class="bd">أخده</i>';
    else if (lot.s === 'open' && lot.o === p.i) bd = '<i class="bd">بيفتح</i>';
    else if (lot.s === 'live' && lot.ps.includes(p.i)) bd = '<i class="bd pa">سابه</i>';
    const have = st.total - (p.nd == null ? st.total : p.nd);
    return '<button class="pl' + (isMine(p.i) ? ' me' : '') + (p.nd === 0 ? ' full' : '') + '" style="--pc:' + p.c + '" data-pid="' + p.i + '" type="button">' + bd + '<b>' + (p.b ? '🤖 ' : '') + esc(p.n) + '</b><span>💰 <em>' + p.$ + '</em> · ' + have + '/' + st.total + '</span></button>';
  }).join('');
  setHTML($('a-roster'), html, 'roster');
}
function renderLotCard(v, lot, st) {
  const it = itemOf(lot.k), el = $('a-lot'); if (!it) return;
  const r = rarityOf(it.p), kl = st.kinds.length > 1 ? kindLabel(st, it.k) : '';
  el.style.setProperty('--rc', r.c); el.style.setProperty('--h', hueOf(it.id));
  el.classList.toggle('leg', it.p >= 92);
  el.innerHTML = artHTML(it) + '<div class="info"><h3 class="nm">' + esc(it.n) + '</h3><div class="tags"><span class="tag r">' + r.name + '</span><span class="tag">' + esc(it.t) + '</span>' + (kl ? '<span class="tag">' + esc(kl) + '</span>' : '') + (st.hidden ? '<span class="tag g">🎁 للوصيف هدية مخفية</span>' : '') + '</div><div class="pw"><span>' + st.stat + ' ' + it.p + '</span><div class="meter"><i style="--w:' + Math.min(100, it.p) + '%"></i></div></div></div>';
}
function renderBoard(v, lot) {
  const pr = $('a-price'), lead = $('a-lead');
  if (UI.last.price !== lot.p) { const first = UI.last.price == null; UI.last.price = lot.p; pr.textContent = lot.p; if (!first && lot.p) { pr.classList.remove('bump'); void pr.offsetWidth; pr.classList.add('bump'); } }
  const has = lot.l >= 0 && (lot.s === 'live' || lot.s === 'sold');
  lead.classList.toggle('idle', !has);
  if (has) { lead.style.setProperty('--pc', pcolor(v, lot.l)); lead.textContent = pname(v, lot.l); }
  else { lead.style.removeProperty('--pc'); lead.textContent = lot.s === 'open' ? (isMine(lot.o) && UI.S.me.length === 1 ? 'دورك تفتح' : 'مستنيين ' + pname(v, lot.o)) : lot.s === 'unsold' ? 'مفيش مشتري' : '—'; }
  const feed = (lot.h || []).slice().reverse().map(h => '<li style="--pc:' + pcolor(v, h[0]) + '"><i></i>' + esc(pname(v, h[0])) + '<span>' + h[1] + '</span></li>').join('');
  setHTML($('a-feed'), feed, 'feed');
}
function renderStatus(v) {
  const lot = v.lot, el = $('a-status'), tm = $('a-timer'); if (!lot) return;
  let txt = '', hot = false, frac = -1;
  if (v.pa) txt = 'اللعبة واقفة';
  else if (lot.s === 'open') {
    txt = (isMine(lot.o) && UI.S.me.length === 1) ? 'دورك تفتح المزاد' : pname(v, lot.o) + ' بيفتح المزاد';
    if (lot.rem >= 0) { const left = Math.max(0, lot.rem - (performance.now() - UI.S.at) / 1000); txt += ' (' + Math.ceil(left) + ')'; frac = left / SPEEDS[v.cfg.sp].open; }
  } else if (lot.s === 'live') {
    if (lot.au) txt = pname(v, lot.l) + ' لوحده محتاجه: بسعر 1';
    else if (lot.cq) { txt = 'الكل سابه… رسّى'; hot = true; frac = .12; }
    else if (lot.c === 0) { txt = 'مين يزود؟'; frac = 1; }
    else if (lot.c === 1) { txt = lot.p + ' مرة…'; hot = true; frac = .66; }
    else { txt = lot.p + ' مرتين!'; hot = true; frac = .33; }
  } else if (lot.s === 'sold') txt = lot.fo ? 'اتوزّع بالقرعة بسعر 1' : 'رسّى!';
  else txt = 'محدش عايزه. هيرجع تاني.';
  if (el.textContent !== txt) { el.textContent = txt; if (lot.s === 'live') { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); } }
  el.classList.toggle('hot', hot);
  tm.hidden = frac < 0; if (frac >= 0) tm.firstElementChild.style.transform = 'scaleX(' + Math.max(0, Math.min(1, frac)) + ')';
}
function auctionTick(v) { if (v.lot && v.lot.s === 'open' && v.lot.rem >= 0 && !v.pa) renderStatus(v); }
function renderVeil(v) {
  let el = $('a-veil');
  if (v.pa && !el) {
    el = document.createElement('div'); el.id = 'a-veil'; el.className = 'veil';
    el.innerHTML = '<b>واقفة ⏸</b>' + (canDrive() ? '<button class="btn" id="a-resume" type="button">كمّل</button>' : '<p>المضيف وقّف اللعبة</p>');
    $('a-stage').appendChild(el);
  } else if (!v.pa && el) el.remove();
}
function clearStamp() { document.querySelectorAll('#a-stage .stamp').forEach(s => s.remove()); }
function stamp(html, cls, color) {
  clearStamp(); const s = document.createElement('div');
  s.className = 'stamp ' + (cls || ''); if (color) s.style.setProperty('--pc', color); s.innerHTML = html; $('a-stage').appendChild(s);
}

/* ----- أحداث المزاد: صوت وإشعارات وختم ----- */
function auctionEvent(v, t, d) {
  const nm = pname(v, d && d.pid), multi = UI.S.me.length > 1;
  switch (t) {
    case 'lot': { sfx('lot'); const it = itemOf(d.k); if (it) say('عنصر جديد: ' + it.n); break; }
    case 'opener':
      say(nm + ' بيفتح المزاد');
      if (isMine(d.pid)) { sfx('turn'); if (multi) { UI.who = d.pid; UI.last.dock = ''; renderDock(v); } else toast('دورك تفتح المزاد! 🔔', 2200); }
      break;
    case 'bid': sfx('bid'); say(nm + ' زايد بـ ' + d.amount); break;
    case 'call': if (d.stage === 1) sfx('call'); else if (d.stage === 2) sfx('call2'); break;
    case 'pass': say(nm + ' سابه'); break;
    case 'timeout': toast(nm + ' اتأخر. الدور عدّى.', 2200); break;
    case 'sold': {
      sfx('sold'); const it = itemOf(d.k), mine = isMine(d.pid);
      stamp('<b>رسّى!</b><span>' + esc(nm) + ' · ' + d.price + (d.forced ? ' (قرعة)' : '') + '</span>', '', pcolor(v, d.pid));
      say((it ? it.n : '') + ' رسّى على ' + nm + ' بـ ' + d.price);
      if (mine && !multi) toast('مبروك! خدت ' + (it ? it.n : '') + ' بـ ' + d.price + ' 🎉', 2400);
      break;
    }
    case 'unsold': sfx('none'); stamp('<b>محدش</b><span>هيرجع تاني</span>', 'none'); break;
    case 'hiddenGrant': { const lost = itemOf(d.lost); sfx('gift'); toast('🎁 ' + nm + ' خسر ' + (lost ? lost.n : 'العنصر') + ' وخد شخصية مخفية!', 3600); break; }
    case 'pause': say(d.v ? 'اللعبة واقفة' : 'كملنا'); break;
  }
}

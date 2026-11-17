/* ==========================================================
   الواجهة (1): أدوات عامة، الصوت، الصور، الشاشات، ربط الجلسة
   ========================================================== */
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
const ssGet = k => { try { return sessionStorage.getItem(k) || ''; } catch (e) { return ''; } };
const ssSet = (k, v) => { try { if (v) sessionStorage.setItem(k, v); else sessionStorage.removeItem(k); } catch (e) { /* مش مهم */ } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* مش مهم */ } };
const UI = { S: null, view: null, screen: 'home', sound: lsGet('mazad.snd', true) !== false, who: 0, amt: 0, dirty: false, lotKey: '', unread: 0, team: null, tt: 0, last: {} };

/* ----- رسايل صغيرة ----- */
function toast(msg, ms) {
  const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(UI.tt);
  UI.tt = setTimeout(() => { t.hidden = true; }, ms || 2600);
}
const say = msg => { $('live').textContent = ''; setTimeout(() => { $('live').textContent = msg; }, 30); };
function copyText(text) {
  return (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(text) : Promise.reject()).catch(() => {
    const a = document.createElement('textarea'); a.value = text; a.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(a); a.select();
    try { document.execCommand('copy'); } catch (e) { /* خلاص */ } a.remove();
  });
}
function openDlg(id) { const d = $(id); if (d && !d.open) { try { d.showModal(); } catch (e) { d.setAttribute('open', ''); } } }
function closeDlgs() { document.querySelectorAll('dialog[open]').forEach(d => { try { d.close(); } catch (e) { d.removeAttribute('open'); } }); }
document.addEventListener('click', e => {
  const c = e.target.closest && e.target.closest('[data-close]');
  if (c) { const d = c.closest('dialog'); if (d) d.close(); return; }
  if (e.target.tagName === 'DIALOG') e.target.close();
});

/* ----- الصوت (بيبات بسيطة من المتصفح، مفيش ملفات) ----- */
let AC = null;
function actx() {
  if (AC === null) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = false; } }
  if (AC && AC.state === 'suspended') AC.resume();
  return AC;
}
function tone(f, at, dur, type, vol) {
  const a = actx(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + at;
  o.type = type || 'square'; o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.06, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.03);
}
const SFX = {
  lot: () => { tone(440, 0, .07, 'triangle', .07); tone(660, .07, .1, 'triangle', .07); },
  bid: () => { tone(620, 0, .08); tone(840, .07, .1); },
  call: () => tone(300, 0, .14, 'triangle', .09),
  call2: () => { tone(250, 0, .12, 'triangle', .1); tone(250, .17, .14, 'triangle', .1); },
  sold: () => { tone(130, 0, .3, 'sawtooth', .12); tone(520, .1, .12); tone(780, .2, .3); },
  none: () => { tone(300, 0, .16, 'triangle', .08); tone(220, .17, .26, 'triangle', .08); },
  turn: () => { tone(880, 0, .12, 'sine', .1); tone(1175, .13, .22, 'sine', .1); },
  up: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * .09, .22, 'square', .06)),
  down: () => [392, 330, 262, 196].forEach((f, i) => tone(f, i * .15, .26, 'sawtooth', .05)),
  gift: () => { tone(700, 0, .1, 'sine', .09); tone(1050, .1, .18, 'sine', .09); },
  win: () => [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i * .12, .22, 'square', .06)),
  err: () => tone(160, 0, .2, 'sawtooth', .08),
};
document.addEventListener('pointerdown', () => actx(), { passive: true });      // ساعات المتصفح بيطلب لمسة عشان الصوت يشتغل
function sfx(n) { if (UI.sound) { try { if (SFX[n]) SFX[n](); } catch (e) { /* مفيش صوت */ } } }

/* ----- الصور: images/<id>.jpg (أو png/webp/jpeg)، ولو مش موجودة بيظهر الإيموجي ----- */
const IMG_EXT = ['jpg', 'png', 'webp', 'jpeg'];
const imgOk = {}, imgBad = {};
const imgUrl = (id, i) => 'images/' + id + '.' + IMG_EXT[i];
function imgLoaded(img) { imgOk[img.dataset.id] = +img.dataset.i; if (img.parentNode) img.parentNode.classList.add('has-img'); }
function imgFail(img) {
  const id = img.dataset.id, i = +img.dataset.i + 1;
  if (i < IMG_EXT.length) { img.dataset.i = i; img.src = imgUrl(id, i); } else { imgBad[id] = 1; img.remove(); }
}
function artHTML(it, cls) {
  cls = cls || '';
  if (!it) return '<div class="art q ' + cls + '"><span class="em">؟</span></div>';
  const id = it.filler ? '' : it.id, ok = imgOk[id] != null;
  const img = id && !imgBad[id] ? '<img src="' + imgUrl(id, ok ? imgOk[id] : 0) + '" alt="" data-id="' + esc(id) + '" data-i="' + (ok ? imgOk[id] : 0) + '" onload="imgLoaded(this)" onerror="imgFail(this)" decoding="async">' : '';
  return '<div class="art ' + cls + (ok ? ' has-img' : '') + '" style="--h:' + hueOf(it.id) + '"><span class="em" aria-hidden="true">' + it.e + '</span>' + img + '</div>';
}

/* ----- شاشات ----- */
const SCREENS = ['home', 'join', 'setup', 'intro', 'auction', 'reveal', 'stage', 'results'];
const WORLD_COLOR = { home: '#FFD43B', anime: '#6B3CFF', sport: '#0A7F44', food: '#D93A21', wear: '#2563FF' };
function show(name, world) {
  const w = world || 'home';
  if (UI.screen !== name) { window.scrollTo(0, 0); $('toast').hidden = true; clearTimeout(UI.tt); }
  UI.screen = name;
  for (const s of SCREENS) $('s-' + s).hidden = s !== name;
  $('app').dataset.w = w;
  if (name !== 'auction') document.documentElement.style.setProperty('--dock-h', '0px');
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = WORLD_COLOR[w] || '#FFD43B';
  updateFab();
}
const pl = (v, pid) => (v && v.pl && v.pl[pid]) || null;
const pname = (v, pid) => { const p = pl(v, pid); return p ? p.n : ''; };
const pcolor = (v, pid) => { const p = pl(v, pid); return p ? p.c : '#ccc'; };
const isMine = pid => !!UI.S && UI.S.me.includes(pid);
const canDrive = () => !!UI.S && UI.S.kind !== 'client';           // التحكم في المراحل والإيقاف للمضيف أو الجهاز المحلي
const myPid = () => (UI.S && UI.S.me.includes(UI.who) ? UI.who : (UI.S && UI.S.me[0] != null ? UI.S.me[0] : -1));
const stageOf = v => (v && v.st ? makeStage(v.st) : null);
const kindLabel = (st, k) => { const x = st && st.kinds.find(z => z.k === k); return x ? x.label : ''; };

/* ----- ربط الجلسة بالواجهة ----- */
function attach(S) {
  detach();
  UI.S = S; UI.view = null; UI.who = S.me && S.me.length ? S.me[0] : 0; UI.lotKey = ''; UI.amtKey = ''; UI.dirty = false; UI.unread = 0; UI.last = {}; UI.team = null; UI.reply = null;
  S.on('update', (v, ev) => onUpdate(v, ev));
  S.on('error', m => { toast(m); sfx('err'); });
  S.on('net', st => netBanner(st));
  S.on('chat', m => chatIncoming(m));
  S.on('chatlog', () => renderChat());
  S.on('closed', m => goHome(m));
  const online = S.kind !== 'local';
  $('su-chat').hidden = !online; $('a-chat').hidden = !online;
  $('a-pause').hidden = !canDrive();
  setUnread(0); renderChat();
}
function detach() {
  const S = UI.S; UI.S = null; UI.view = null;
  if (!S) return;
  try { if (S.kind === 'local') S.stop(); else S.leave(); } catch (e) { console.error(e); }
  netBanner('ok'); closeChat();
}
function goHome(msg) {
  ssSet('mazad.room', ''); detach(); closeDlgs(); show('home'); renderHome();
  if (msg) toast(msg, 3600);
}
function netBanner(st) {
  let b = $('banner');
  if (!b) { b = document.createElement('div'); b.id = 'banner'; b.className = 'banner bad'; b.setAttribute('role', 'status'); b.hidden = true; $('app').prepend(b); }
  const msg = { lost: 'النت قطع. بيحاول يرجّع الاتصال…', hostlost: 'المضيف مش بيرد. ممكن يكون قفل الصفحة أو النت قطع عنده.' }[st];
  b.textContent = msg || ''; b.hidden = !msg;
}

/* ----- أرقام وألوان جاية من مضيف: نتأكد إنها أرقام وألوان فعلًا قبل ما تدخل الصفحة ----- */
const N = x => (Number.isFinite(+x) ? Math.trunc(+x) : 0);
const safeColor = c => (/^#[0-9a-fA-F]{3,8}$/.test(c) ? c : '#ccc');
function cleanView(v) {
  if (Array.isArray(v.pl)) v.pl.forEach(p => { p.c = safeColor(p.c); p.$ = N(p.$); p.i = N(p.i); if (p.nd != null) p.nd = N(p.nd); if (p.mx != null) p.mx = N(p.mx); (p.it || []).forEach(x => { x[1] = N(x[1]); x[2] = N(x[2]); }); });
  const l = v.lot;
  if (l) { l.p = N(l.p); l.l = N(l.l); l.o = N(l.o); l.c = N(l.c); l.rem = Number.isFinite(+l.rem) ? +l.rem : -1; (l.h || []).forEach(h => { h[0] = N(h[0]); h[1] = N(h[1]); }); }
  if (Array.isArray(v.sc)) v.sc.forEach(s => (s || []).forEach(r => { for (const k of ['pid', 'base', 'bonus', 'coins', 'left', 'total']) r[k] = N(r[k]); (r.notes || []).forEach(n => { n[1] = N(n[1]); }); (r.rec || []).forEach(n => { n[1] = N(n[1]); }); }));
}
window.addEventListener('beforeunload', e => { if (UI.S && UI.view && UI.view.ph !== 'lobby' && UI.view.ph !== 'results') { e.preventDefault(); e.returnValue = ''; } });

/* ----- كل تحديث للحالة بيعدّي من هنا ----- */
function onUpdate(v, events) {
  if (!UI.S || !v) return;
  if (UI.S.kind === 'client') cleanView(v);
  UI.view = v;
  const w = v.st ? v.st.cat : 'home';
  switch (v.ph) {
    case 'lobby': if (UI.screen !== 'setup') { UI.last = {}; UI.lotKey = ''; UI.team = null; closeDlgs(); } show('setup', 'home'); renderSetup(); break;
    case 'intro': show('intro', w); renderIntro(v); break;
    case 'lot': show('auction', w); renderAuction(v); break;
    case 'reveal': show('reveal', w); renderReveal(v); break;
    case 'stageEnd': show('stage', w); renderStageEnd(v); break;
    case 'results': show('results', 'home'); renderResults(v); break;
  }
  for (const [t, d] of events || []) { try { onEvent(v, t, d); } catch (e) { console.error(t, e); } }
  refreshTeam(v);
}
const AUC_EV = ['lot', 'opener', 'bid', 'call', 'pass', 'timeout', 'sold', 'unsold', 'hiddenGrant', 'pause'];
function onEvent(v, t, d) {
  if (AUC_EV.includes(t)) auctionEvent(v, t, d);
  else if (t === 'reveal' || t === 'revealed') revealEvent(v, t, d);
  else if (t === 'stageEnd' || t === 'results') sfx('win');
}
setInterval(() => { if (UI.S && UI.view && UI.screen === 'auction') auctionTick(UI.view); }, 250);

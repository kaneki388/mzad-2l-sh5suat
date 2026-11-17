/* ==========================================================
   الواجهة (8): الشات مع الرد على رسالة (أونلاين بس)
   ========================================================== */
const CHAT_EMO = ['👍', '😂', '🔥', '😮', '😭', '🤝', '💰', '🔨'];
const mySeat = () => (!UI.S ? -1 : UI.S.kind === 'host' ? 0 : UI.S.seat);
const chatList = () => (UI.S && UI.S.chat ? UI.S.chat : []);
const msgHTML = m => '<div class="msg' + (N(m.p) === mySeat() ? ' mine' : '') + '" data-id="' + N(m.id) + '" style="--pc:' + COLORS[N(m.p) % COLORS.length] + '"><b>' + esc(m.n) + '</b>' +
  (m.re ? '<div class="q" data-go="' + N(m.re.id) + '"><b>' + esc(m.re.n) + '</b><span>' + esc(m.re.t) + '</span></div>' : '') +
  '<p>' + esc(m.t) + '</p><button class="rp" type="button" data-re="' + N(m.id) + '" aria-label="رد على ' + esc(m.n) + '">↩</button></div>';

function setUnread(n) {
  UI.unread = n;
  for (const id of ['su-unread', 'a-unread', 'fab-unread']) { const d = $(id); if (d) { d.hidden = !n; d.textContent = n > 9 ? '9+' : String(n); } }
}
/* زرار الشات العايم: في الشاشات اللي مفيهاش زرار شات (المقدمة والكشف والنتيجة) */
function updateFab() {
  let f = $('fab-chat');
  if (!f) {
    f = document.createElement('button'); f.id = 'fab-chat'; f.type = 'button'; f.className = 'ib fab'; f.setAttribute('aria-label', 'الشات'); f.hidden = true;
    f.innerHTML = '💬<i class="dot" id="fab-unread" hidden>0</i>'; f.addEventListener('click', () => openChat()); document.body.appendChild(f);
  }
  f.hidden = !(UI.S && UI.S.kind !== 'local' && ['intro', 'reveal', 'stage', 'results'].includes(UI.screen));
}
function renderChat() {
  const list = chatList(), box = $('c-msgs');
  const html = list.length ? list.map(msgHTML).join('') : '<p class="none">مفيش رسايل لسه. ابدأ إنت 👋</p>';
  if (UI.last.chat === html) return; UI.last.chat = html;
  const stick = box.scrollTop + box.clientHeight >= box.scrollHeight - 50 || !UI.chatOpen;
  box.innerHTML = html; if (stick) box.scrollTop = box.scrollHeight;
}
function chatIncoming(m) {
  renderChat();
  if (m && N(m.p) !== mySeat()) { if (!UI.chatOpen) { setUnread(UI.unread + 1); sfx('lot'); } }
  else if (UI.chatOpen) { const b = $('c-msgs'); b.scrollTop = b.scrollHeight; }
}
function openChat() {
  if (!UI.S || UI.S.kind === 'local') return;
  UI.chatOpen = true; $('chat').hidden = false; setUnread(0); renderChat();
  const b = $('c-msgs'); b.scrollTop = b.scrollHeight;
  try { if (window.matchMedia('(hover:hover)').matches) $('c-input').focus(); } catch (e) { /* مش مهم */ }
}
function closeChat() { UI.chatOpen = false; UI.reply = null; $('chat').hidden = true; $('c-reply').hidden = true; }
function setReply(id) {
  const m = chatList().find(x => x.id === id); if (!m) return;
  UI.reply = { id: m.id, n: m.n, t: m.t.slice(0, 70) };
  const r = $('c-reply'); r.hidden = false; r.querySelector('b').textContent = 'رد على ' + m.n; r.querySelector('span').textContent = UI.reply.t; $('c-input').focus();
}
function clearReply() { UI.reply = null; $('c-reply').hidden = true; }

$('c-emo').innerHTML = CHAT_EMO.map(e => '<button type="button" data-e="' + e + '" aria-label="' + e + '">' + e + '</button>').join('');
$('c-emo').addEventListener('click', e => { const b = e.target.closest('[data-e]'); if (b) { const i = $('c-input'); i.value = (i.value + b.dataset.e).slice(0, 300); i.focus(); } });
$('c-close').addEventListener('click', closeChat);
$('c-cancel').addEventListener('click', clearReply);
$('chat').addEventListener('click', e => {
  if (e.target.id === 'chat') return closeChat();
  const rp = e.target.closest('[data-re]'); if (rp) return setReply(+rp.dataset.re);
  const q = e.target.closest('[data-go]');
  if (q) { const t = $('c-msgs').querySelector('[data-id="' + q.dataset.go + '"]'); if (t) { t.scrollIntoView({ block: 'center', behavior: 'smooth' }); t.classList.remove('hl'); void t.offsetWidth; t.classList.add('hl'); } }
});
$('c-form').addEventListener('submit', e => {
  e.preventDefault();
  const inp = $('c-input'), text = inp.value.trim(); if (!text || !UI.S) return;
  UI.S.sendChat(text, UI.reply ? UI.reply.id : null);
  inp.value = ''; clearReply();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && UI.chatOpen) closeChat(); });

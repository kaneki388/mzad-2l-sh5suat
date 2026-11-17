/* ==========================================================
   الواجهة (3): الرئيسية، الانضمام لغرفة، بدء اللعب، الخروج
   ========================================================== */
function renderHome() { $('h-name').value = lsGet('mazad.name', '') || ''; }
function rememberName(v) { const n = cleanName(v != null ? v : $('h-name').value); lsSet('mazad.name', n); return n; }
function askQuit(title, text, yes, fn) {
  $('q-title').textContent = title; $('q-text').textContent = text; $('q-yes').textContent = yes || 'اخرج';
  UI.quitFn = fn; openDlg('d-quit');
}
$('q-yes').addEventListener('click', () => { closeDlgs(); const f = UI.quitFn; UI.quitFn = null; if (f) f(); });
$('h-name').addEventListener('change', () => rememberName());
$('m-rules').addEventListener('click', () => openDlg('d-rules'));

/* ----- العب هنا (أوفلاين) ----- */
function loadSeats() {
  const s = lsGet('mazad.seats.v2', null);
  const ok = Array.isArray(s) && s.length >= 2 && s.length <= 6 && s.every(x => x && typeof x === 'object');
  const seats = ok ? s.map(x => ({ name: String(x.name || '').slice(0, 14), bot: !!x.bot })) : [{ name: '', bot: false }, { name: '', bot: true }];
  const mine = seats.find(x => !x.bot), nm = lsGet('mazad.name', '');
  if (mine && !mine.name && nm) mine.name = nm;
  return seats;
}
$('m-local').addEventListener('click', () => {
  rememberName(); detach();
  UI.cfg = sanitizeCfg(lsGet(CFG_KEY, null)); UI.seats = loadSeats(); UI.last = {};
  $('su-chat').hidden = true; show('setup'); renderSetup();
});

/* ----- اعمل غرفة أونلاين ----- */
$('m-host').addEventListener('click', async () => {
  const name = rememberName() || 'المضيف', btn = $('m-host'), lab = btn.querySelector('b'), old = lab.textContent;
  btn.disabled = true; lab.textContent = 'بيتصل…';
  const S = new HostSession(name, lsGet(CFG_KEY, null));
  attach(S);
  try { await S.create(); }
  catch (e) { detach(); toast((e && e.message) || 'مش قادر يعمل الغرفة.', 4400); }
  btn.disabled = false; lab.textContent = old;
});

/* ----- ادخل غرفة ----- */
$('m-join').addEventListener('click', () => { rememberName(); $('j-name').value = $('h-name').value; $('j-msg').textContent = ''; show('join'); $('j-code').focus(); });
$('j-back').addEventListener('click', () => show('home'));
$('j-code').addEventListener('input', e => { e.target.value = normCode(e.target.value); });
$('j-code').addEventListener('keydown', e => { if (e.key === 'Enter') joinRoom(); });
$('j-name').addEventListener('keydown', e => { if (e.key === 'Enter') joinRoom(); });
$('j-go').addEventListener('click', joinRoom);
async function joinRoom() {
  const code = normCode($('j-code').value), name = rememberName($('j-name').value), msg = $('j-msg'), go = $('j-go');
  if (code.length !== 5) { msg.textContent = 'اكتب كود الغرفة (5 حروف أو أرقام).'; return; }
  if (!name) { msg.textContent = 'اكتب اسمك الأول.'; $('j-name').focus(); return; }
  go.disabled = true; msg.textContent = 'بيدوّر على الغرفة…';
  const S = new ClientSession(code, name);
  attach(S);
  try { await S.join(); }
  catch (e) { detach(); msg.textContent = (e && e.message) || 'مش قادر يدخل.'; go.disabled = false; return; }
  go.disabled = false; msg.textContent = ''; ssSet('mazad.room', code);
  if (UI.S === S && !UI.view) { show('setup'); renderSetup(); }
}

/* ----- بداية الصفحة ----- */
(function init() {
  renderHome(); show('home');
  let room = '';
  try { room = normCode(new URLSearchParams(location.search).get('room')); } catch (e) { /* مفيش */ }
  const last = ssGet('mazad.room');
  if (last && room.length !== 5) { $('m-back').hidden = false; $('m-back-s').textContent = 'كود ' + last; }
  if (room.length === 5) { $('j-code').value = room; $('j-name').value = lsGet('mazad.name', '') || ''; show('join'); }
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => {});
  $('a-sound').setAttribute('aria-pressed', String(UI.sound)); $('a-sound').textContent = UI.sound ? '🔊' : '🔇';
})();
$('m-back').addEventListener('click', () => {
  const last = ssGet('mazad.room'); if (!last) return;
  $('j-code').value = last; $('j-name').value = lsGet('mazad.name', '') || $('h-name').value; $('j-msg').textContent = ''; show('join'); joinRoom();
});

/* ==========================================================
   الواجهة (5): الدوك — انت اللي بتكتب السعر، زايد، «سيبه ياخده»
   ========================================================== */
const parseAmt = s => { const t = String(s).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^\d]/g, ''); return t ? Math.min(999999, parseInt(t, 10)) : 0; };

function dockState(v) {
  const lot = v.lot, pid = myPid(), me = pl(v, pid);
  if (!lot || !me) return { off: 1, msg: '' };
  if (v.pa) return { off: 1, msg: 'اللعبة واقفة ⏸' };
  if (lot.s === 'sold') return { off: 1, msg: 'اتباع!' };
  if (lot.s === 'unsold') return { off: 1, msg: 'محدش أخده. هيرجع تاني.' };
  if (!me.el) return { off: 1, msg: me.nd === 0 ? 'فريقك كمل ✅ استنى باقي اللاعبين.' : 'خانتك بتاعة العنصر ده كاملة. استنى اللي بعده.' };
  if (lot.s === 'open') return lot.o === pid ? { open: 1, turn: 1 } : { off: 1, msg: 'مستنيين ' + pname(v, lot.o) + ' يفتح المزاد…' };
  if (lot.l === pid) return { off: 1, msg: 'انت المتصدر بـ ' + lot.p + '. استنى لو حد هيزايد.' };
  if (lot.ps.includes(pid)) return { off: 1, msg: 'سبت العنصر ده.' };
  if (me.mx <= lot.p) return { off: 1, msg: 'أقصى سعر تقدر تدفعه ' + me.mx + ' (لازم تسيب 1 لكل خانة فاضلة). مش هتقدر تزايد.' };
  return { bid: 1 };
}
function renderDock(v) {
  const lot = v.lot, pid = myPid(), me = pl(v, pid), dock = $('a-dock'), humans = UI.S.me, multi = humans.length > 1;
  $('a-who').hidden = !multi;
  if (multi) setHTML($('a-who'), humans.map(i => '<button type="button" data-who="' + i + '" aria-pressed="' + (i === pid) + '" style="--pc:' + pcolor(v, i) + '"><i></i>' + esc(pname(v, i)) + '</button>').join(''), 'who');
  const s = dockState(v), pre = multi && me ? me.n + ': ' : '', msg = $('a-msg');
  const setMsg = (main, info) => { msg.innerHTML = '<span>' + esc(pre + main) + '</span>' + (info ? '<small>' + esc(info) + '</small>' : ''); };
  dock.classList.toggle('off', !!s.off); msg.classList.toggle('turn', !!s.turn);
  if (s.off) { setMsg(s.msg); dockH(); return; }
  const opening = !!s.open, min = opening ? 1 : lot.p + 1, mx = me.mx, key = lot.k + '|' + lot.s + '|' + pid;
  if (UI.amtKey !== key) { UI.amtKey = key; UI.dirty = false; UI.amt = opening ? Math.min(mx, Math.max(1, Math.round(v.cfg.b * 0.05))) : min; }
  else if (!UI.dirty) UI.amt = opening ? UI.amt : min;
  if (UI.amt < min) UI.amt = min;
  if (!UI.dirty && UI.amt > mx) UI.amt = mx;
  const amt = Math.floor(UI.amt) || 0, ok = amt >= min && amt <= mx;
  const info = 'رصيدك ' + me.$ + ' · أقصى مزايدة ' + mx + ' · فاضل ' + me.nd + ' خانة';
  if (amt > mx) setMsg('أقصى سعر تقدر تدفعه ' + mx); else if (amt < min && !opening) setMsg('لازم أكتر من ' + lot.p);
  else setMsg(opening ? 'دورك تفتح المزاد! اكتب سعر البداية.' : 'السعر دلوقتي ' + lot.p, info);
  const inp = $('a-input'); if (!(document.activeElement === inp && UI.dirty)) inp.value = String(UI.amt);
  const q = (opening ? [5, 10, 20].filter(n => n <= mx).map(n => '<button type="button" data-q="a' + n + '">' + n + '</button>')
    : [1, 5, 10].filter(n => lot.p + n <= mx).map(n => '<button type="button" data-q="r' + n + '">+' + n + '</button>'));
  q.push('<button type="button" data-q="m">أقصى ' + mx + '</button>');
  setHTML($('a-quick'), q.join(''), 'quick');
  const bid = $('a-bid'); bid.textContent = (opening ? 'افتح بـ ' : 'زايد بـ ') + (amt || '؟'); bid.disabled = !ok;
  $('a-pass').textContent = opening ? 'مش هفتح' : 'سيبه ياخده';
  dockH();
}
/* ارتفاع الدوك بيتخزن عشان التنبيه يطلع فوقه */
function dockH() { document.documentElement.style.setProperty('--dock-h', $('a-dock').offsetHeight + 'px'); }
function setAmt(n) { UI.amt = Math.max(0, Math.floor(n) || 0); UI.dirty = true; renderDock(UI.view); }
function doBid() {
  const v = UI.view; if (!v || !v.lot) return;
  const amt = Math.floor(UI.amt);
  if (!(amt >= 1)) return toast('اكتب سعر صح.');
  const r = UI.S.act(myPid(), { t: 'bid', amount: amt });
  if (!r || r.ok) UI.dirty = false;
}
const doPass = () => { if (UI.view && UI.view.lot) UI.S.act(myPid(), { t: 'pass' }); };

$('a-dock').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  const v = UI.view, lot = v && v.lot; if (!lot) return;
  if (b.dataset.who != null) { UI.who = +b.dataset.who; UI.last.who = ''; return renderDock(v); }
  if (b.dataset.q) {
    const me = pl(v, myPid()), c = b.dataset.q;
    return setAmt(c === 'm' ? me.mx : c[0] === 'a' ? +c.slice(1) : Math.min(me.mx, lot.p + (+c.slice(1))));
  }
  if (b.id === 'a-bid') return doBid();
  if (b.id === 'a-pass') return doPass();
  if (b.id === 'a-minus') return setAmt(Math.max(1, (UI.amt || 0) - 1));
  if (b.id === 'a-plus') return setAmt((UI.amt || 0) + 1);
});
$('a-input').addEventListener('input', e => { UI.amt = parseAmt(e.target.value); UI.dirty = true; renderDock(UI.view); });
$('a-input').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); doBid(); } });

/* ----- أزرار الشريط العلوي ----- */
$('a-quit').addEventListener('click', () => {
  const k = UI.S ? UI.S.kind : 'local';
  askQuit(k === 'host' ? 'تقفل الغرفة؟' : k === 'client' ? 'تخرج من الغرفة؟' : 'تخرج من اللعبة؟',
    k === 'host' ? 'المزاد هيقف عند كل اللاعبين.' : k === 'client' ? 'تقدر ترجع بنفس الكود طول ما المزاد شغال.' : 'اللعبة هتتقفل والنتيجة مش هتتحفظ.', 'اخرج', () => goHome());
});
$('a-pause').addEventListener('click', () => { if (UI.S && UI.view) UI.S.setPaused(!UI.view.pa); });
$('a-sound').addEventListener('click', () => {
  UI.sound = !UI.sound; lsSet('mazad.snd', UI.sound);
  $('a-sound').setAttribute('aria-pressed', String(UI.sound)); $('a-sound').textContent = UI.sound ? '🔊' : '🔇'; if (UI.sound) sfx('bid');
});
$('a-chat').addEventListener('click', () => openChat());
$('a-roster').addEventListener('click', e => { const b = e.target.closest('[data-pid]'); if (b) openTeam(+b.dataset.pid); });
$('a-stage').addEventListener('click', e => { if (e.target.closest('#a-resume') && UI.S) UI.S.setPaused(false); });

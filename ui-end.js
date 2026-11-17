/* ==========================================================
   الواجهة (7): مقدمة الجولة، كشف الشخصيات المخفية، ترتيب الجولة، النتيجة
   ========================================================== */
const nextAct = () => { if (UI.S) UI.S.act(myPid(), { t: 'next' }); };

/* ----- مقدمة الجولة ----- */
function renderIntro(v) {
  const st = stageOf(v); if (!st) return;
  const sig = JSON.stringify([v.si, v.st, canDrive()]); if (UI.last.intro === sig) return; UI.last.intro = sig;
  $('i-ico').textContent = st.ico; $('i-tag').textContent = 'جولة ' + (v.si + 1) + ' من ' + v.ns;
  $('i-name').textContent = st.name; $('i-label').textContent = st.label;
  $('i-kinds').innerHTML = st.kinds.map(k => '<span class="tag">' + k.ico + ' ' + esc(k.label) + (k.n > 1 ? ' ×' + k.n : '') + '</span>').join('');
  $('i-blurb').textContent = CATS[st.cat].blurb;
  const tips = ['الميزانية ' + v.cfg.b + (v.cfg.sep ? ' للجولة دي بس.' : ' للجولات كلها، وزّعها صح.'), 'انت اللي بتحدد السعر. لازم تسيب 1 على الأقل لكل خانة فاضلة.', 'اللي بيفتح المزاد بيتغير مع كل عنصر.'];
  if (st.hidden) tips.push('🎁 اللي يخسر بفارق بياخد شخصية مخفية، وتتكشف آخر الجولة. ممكن تطلع أقوى أو أضعف.');
  if (st.recipes.length) tips.push('الوصفات المشهورة بتدّي بونص: ' + st.recipes.map(r => r.n).join('، ') + '.');
  if (st.cat === 'sport') tips.push('نفس البلد بيدّيك كيميا.');
  $('i-tips').innerHTML = tips.map(t => '<div class="tip">' + esc(t) + '</div>').join('');
  $('i-go').hidden = !canDrive(); $('i-go').textContent = v.si === 0 ? 'يلا نبدأ' : 'يلا';
  $('i-wait').textContent = canDrive() ? '' : 'مستنيين المضيف يبدأ…';
}
$('i-go').addEventListener('click', nextAct);

/* ----- الكشف ----- */
const miniHTML = it => { const r = rarityOf(it.p); return '<div class="slot" style="--rc:' + r.c + '">' + artHTML(it) + '<b>' + esc(it.n) + '</b><small>' + esc(it.t) + '</small><span class="pr">' + it.p + '</span></div>'; };
function revealCards(v, st) {
  const out = [];
  v.pl.forEach(p => p.it.forEach(x => { if (x[2] >= 1 && x[4] === st.cat) out.push({ p, x }); }));
  return out;
}
function rvCardHTML(p, x) {
  const lost = itemOf(x[3]), done = x[2] === 2, it = done ? itemOf(x[0]) : null;
  let verdict = '<div class="verdict">مستنيين الكشف…</div>';
  if (done && it && lost) {
    const d = it.p - lost.p;
    verdict = d > 0 ? '<div class="verdict up">طلعت أقوى بـ ' + d + ' ⬆️ حظ!</div>' : d < 0 ? '<div class="verdict down">طلعت أضعف بـ ' + (-d) + ' ⬇️ للأسف</div>' : '<div class="verdict eq">نفس القوة بالظبط 😅</div>';
  }
  return '<article class="rvc" style="--pc:' + p.c + '"><header><i></i>' + esc(p.n) + '</header><div class="side lost"><span class="cap">خسر</span>' + (lost ? miniHTML(lost) : '') + '</div><div class="side gift' + (done ? ' new' : '') + '"><span class="cap">خد مخفية</span>' + (done && it ? miniHTML(it) : '<div class="slot q"><div class="art q"><span class="em">؟</span></div><b>؟؟؟</b></div>') + '</div>' + verdict + '</article>';
}
function renderReveal(v) {
  const st = stageOf(v); if (!st) return;
  const htmls = revealCards(v, st).map(c => rvCardHTML(c.p, c.x)), prev = UI.last.rv || [], list = $('rv-list');
  if (prev.length !== htmls.length) list.innerHTML = htmls.join('');
  else htmls.forEach((h, i) => { if (prev[i] !== h) { const t = document.createElement('div'); t.innerHTML = h; list.children[i].replaceWith(t.firstElementChild); } });
  UI.last.rv = htmls; $('rv-skip').hidden = !canDrive();
}
function revealEvent(v, t, d) {
  if (t === 'reveal') { sfx('gift'); return; }
  sfx(d.diff > 0 ? 'up' : d.diff < 0 ? 'down' : 'gift');
  const st = stageOf(v), cards = st ? revealCards(v, st) : [], i = cards.findIndex(c => c.p.i === d.pid && c.x[2] === 2 && c.x[0] === d.k);
  const it = itemOf(d.k); say(pname(v, d.pid) + ' طلعله ' + (it ? it.n : '') + (d.diff > 0 ? '، أقوى بـ ' + d.diff : d.diff < 0 ? '، أضعف بـ ' + (-d.diff) : ''));
  const el = $('rv-list').children[i]; if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
$('rv-skip').addEventListener('click', nextAct);

/* ----- الترتيب ----- */
function rankRows(sc) {
  const rows = sc.map(r => ({ ...r })).sort((a, b) => b.total - a.total || a.pid - b.pid);
  rows.forEach((r, i) => { r.rank = i && r.total === rows[i - 1].total ? rows[i - 1].rank : i + 1; });
  return rows;
}
function renderStageEnd(v) {
  const st = stageOf(v), sc = v.sc && v.sc[v.si]; if (!st || !sc) return;
  const sig = JSON.stringify([v.si, sc, v.pl.map(p => p.n), canDrive()]); if (UI.last.se === sig) return; UI.last.se = sig;
  $('se-tag').textContent = 'خلصت جولة ' + (v.si + 1) + ' من ' + v.ns; $('se-title').textContent = st.ico + ' ' + st.name;
  $('se-rank').innerHTML = rankRows(sc).map(r => {
    const p = pl(v, r.pid), cum = sumOf(v.sc.slice(0, v.si + 1), s => (s ? s[r.pid].total : 0));
    const tags = ['<span class="tag b">' + st.stat + ' ' + r.base + '</span>'].concat(r.notes.map(n => '<span class="tag g">' + esc(n[0]) + ' +' + n[1] + '</span>'), r.rec.map(n => '<span class="tag p">' + esc(n[0]) + ' +' + n[1] + '</span>'), r.left ? ['<span class="tag">💰 ' + r.coins + ' = +' + r.left + '</span>'] : []);
    return '<article class="rk r' + r.rank + (r.rank === 1 ? ' win' : '') + '" style="--pc:' + p.c + '"><header><span class="pos">' + r.rank + '</span><span class="who">' + esc(p.n) + '</span><b class="tot">' + r.total + '</b></header><div class="brk">' + tags.join('') + '</div><div class="more"><span>' + (v.ns > 1 ? 'المجموع لحد دلوقتي ' + cum : '') + '</span><button class="lnk" type="button" data-team="' + r.pid + '" data-st="' + v.si + '">شوف الفريق</button></div></article>';
  }).join('');
  const last = v.si >= v.ns - 1, nx = v.sels[v.si + 1];
  $('se-next').hidden = !canDrive(); $('se-next').textContent = last ? 'شوف النتيجة النهائية 🏆' : 'الجولة الجاية: ' + CATS[nx.cat].ico + ' ' + CATS[nx.cat].name;
  $('se-wait').textContent = canDrive() ? '' : 'مستنيين المضيف يكمّل…';
}
$('se-next').addEventListener('click', nextAct);
$('se-rank').addEventListener('click', e => { const b = e.target.closest('[data-team]'); if (b) openTeam(+b.dataset.team, +b.dataset.st); });

/* ----- النتيجة النهائية ----- */
function standingsOf(v) {
  const rows = v.pl.map(p => { const per = v.sc.map(s => (s && s[p.i] ? s[p.i].total : 0)); return { pid: p.i, per, total: sumOf(per, x => x) }; });
  rows.sort((a, b) => b.total - a.total || a.pid - b.pid);
  rows.forEach((r, i) => { r.rank = i && r.total === rows[i - 1].total ? rows[i - 1].rank : i + 1; });
  return rows;
}
const resultText = v => '🔨 مزاد الشخصيات\n' + standingsOf(v).map(r => (r.rank === 1 ? '🏆' : r.rank + '.') + ' ' + pname(v, r.pid) + ' — ' + r.total).join('\n');
function renderResults(v) {
  const rows = standingsOf(v), sig = JSON.stringify([rows, v.pl.map(p => p.n), canDrive(), UI.S.kind]); if (UI.last.rs === sig) return; UI.last.rs = sig;
  const top = rows.filter(r => r.rank === 1), names = top.map(r => pname(v, r.pid));
  $('rs-winner').textContent = top.length > 1 ? 'تعادل بين ' + names.join(' و ') : names[0] + ' كسب! 🏆';
  $('rs-sub').textContent = top[0].total + ' نقطة' + (v.ns > 1 ? ' في ' + v.ns + ' جولات' : '');
  $('rs-rank').innerHTML = rows.map(r => {
    const p = pl(v, r.pid), per = v.ns > 1 ? v.sels.map((s, i) => '<span class="tag">' + CATS[s.cat].ico + ' ' + r.per[i] + '</span>').join('') : '';
    return '<article class="rk r' + r.rank + (r.rank === 1 ? ' win' : '') + '" style="--pc:' + p.c + '"><header><span class="pos">' + r.rank + '</span><span class="who">' + (p.b ? '🤖 ' : '') + esc(p.n) + '</span><b class="tot">' + r.total + '</b></header>' + (per ? '<div class="brk">' + per + '</div>' : '') + '<div class="more"><span></span><button class="lnk" type="button" data-team="' + r.pid + '" data-st="0">شوف الفريق</button></div></article>';
  }).join('');
  $('rs-again').hidden = !canDrive(); $('rs-wait').textContent = canDrive() ? '' : 'مستنيين المضيف يبدأ جولة جديدة…';
}
$('rs-rank').addEventListener('click', e => { const b = e.target.closest('[data-team]'); if (b) openTeam(+b.dataset.team, +b.dataset.st); });
$('rs-copy').addEventListener('click', () => { if (UI.view) copyText(resultText(UI.view)).then(() => toast('اتنسخت النتيجة.')); });
$('rs-home').addEventListener('click', () => goHome());
$('rs-again').addEventListener('click', () => {
  const S = UI.S; if (!S) return;
  if (S.kind === 'host') { S.again(); return; }
  detach(); UI.last = {}; $('su-chat').hidden = true; show('setup'); renderSetup();       // محلي: نرجع للإعدادات بنفس الاختيارات
});

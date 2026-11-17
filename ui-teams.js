/* ==========================================================
   الواجهة (6): فريق اللاعب — ملعب للكورة، طبق للأكل، أوت فيت، شبكة للأنمي
   ========================================================== */
const kindOfEntry = x => (x[0] === '#' ? 'any' : ((itemOf(x[0]) || {}).k));
const entriesOf = (p, st) => p.it.filter(x => x[4] === st.cat);
const needOf = (p, st, k) => (st.slots[k] || 0) - entriesOf(p, st).filter(x => kindOfEntry(x) === k).length;

/* نقط الفريق الحالية (الشخصيات المخفية مش بتتحسب لحد ما تتكشف) */
function liveScore(st, ents) {
  const its = ents.filter(x => x[2] !== 1).map(x => itemOf(x[0])).filter(Boolean), cnt = {}, notes = [], rec = [];
  let bonus = 0;
  its.forEach(i => { if (!i.filler) cnt[i.t] = (cnt[i.t] || 0) + 1; });
  for (const [t, n] of Object.entries(cnt)) if (n > 1) { const val = (n - 1) * st.combo; bonus += val; notes.push([t + ' ×' + n, val]); }
  const progress = st.recipes.map(r => ({ r, got: recipeProgress(r, its), done: matchRecipe(r, its) }));
  progress.forEach(x => { if (x.done) { bonus += x.r.b; rec.push([x.r.n, x.r.b]); } });
  return { base: sumOf(its, i => i.p), notes, rec, bonus, progress };
}
function groupByKind(st, ents) {
  const by = {}; st.kinds.forEach(x => { by[x.k] = []; });
  ents.forEach(x => { const k = kindOfEntry(x); if (by[k]) by[k].push(x); });
  return by;
}
function slotHTML(ent, k, st, round) {
  const cls = round ? 'pslot' : 'slot', kd = st.kinds.find(x => x.k === k) || { ico: '＋', label: '' };
  if (!ent) return '<div class="' + cls + ' empty"><div class="art"><span class="em">' + kd.ico + '</span></div><b>' + (st.kinds.length > 1 ? esc(kd.label) : 'فاضي') + '</b></div>';
  if (ent[2] === 1) return '<div class="' + cls + ' q"><div class="art q"><span class="em">؟</span></div><b>مخفية 🎁</b>' + (round ? '' : '<small>بدل ' + esc((itemOf(ent[3]) || {}).n || '') + '</small>') + '</div>';
  const it = itemOf(ent[0]); if (!it) return '';
  const r = rarityOf(it.p), extra = round ? '' : '<small>' + (ent[2] === 2 ? '🎁 ' : '') + esc(it.t) + '</small>' + (ent[1] > 0 ? '<small>دفع ' + ent[1] + '</small>' : '');
  return '<div class="' + cls + '" style="--rc:' + r.c + '">' + artHTML(it) + '<b>' + esc(it.n) + '</b>' + extra + '<span class="pr">' + it.p + '</span></div>';
}
function teamBody(v, p, st) {
  const ents = entriesOf(p, st), by = groupByKind(st, ents), ptr = {};
  const take = k => { const i = ptr[k] || 0; ptr[k] = i + 1; return by[k] ? by[k][i] || null : null; };
  if (st.cat === 'anime') {
    const n = st.slots.any, list = by.any.slice(0, n);
    return '<div class="agrid" style="--cols:' + (n === 4 ? 2 : Math.min(3, n)) + '">' + Array.from({ length: n }, (_, i) => slotHTML(list[i] || null, 'any', st, false)).join('') + '</div>';
  }
  if (st.cat === 'sport') {
    return '<div class="pitch">' + st.rows.map(([k, n]) => '<div class="prow">' + Array.from({ length: n }, () => slotHTML(take(k), k, st, true)).join('') + '</div>').join('') + '</div>';
  }
  return '<div class="lns">' + st.kinds.map(x => Array.from({ length: x.n }, () => lineHTML(take(x.k), x)).join('')).join('') + '</div>';
}
/* صف واحد لكل خانة (أكل وهدوم): صورة + اسم + قوة */
function lineHTML(ent, kd) {
  const cap = '<span class="kl">' + kd.ico + ' ' + esc(kd.label) + '</span>';
  if (!ent) return '<div class="ln empty"><div class="art"><span class="em">＋</span></div><div class="meta">' + cap + '<b>فاضي</b></div></div>';
  const it = itemOf(ent[0]); if (!it) return '';
  return '<div class="ln" style="--rc:' + rarityOf(it.p).c + '">' + artHTML(it) + '<div class="meta">' + cap + '<b>' + esc(it.n) + '</b><small>' + esc(it.t) + (ent[1] > 0 ? ' · دفع ' + ent[1] : '') + '</small></div><span class="pr">' + it.p + '</span></div>';
}
function teamHTML(v, pid, si) {
  const p = pl(v, pid), sel = v.sels[si]; if (!p || !sel) return '';
  const st = makeStage(sel), sc = liveScore(st, entriesOf(p, st));
  const tabs = v.sels.length > 1 ? '<div class="chips tabs">' + v.sels.map((s, i) => '<button class="chipb" type="button" data-st="' + i + '" aria-pressed="' + (i === si) + '">' + CATS[s.cat].ico + ' ' + CATS[s.cat].name + '</button>').join('') + '</div>' : '';
  const sum = '<div class="sum"><span class="tag b">' + st.stat + ' ' + sc.base + '</span>' + sc.notes.map(n => '<span class="tag g">' + esc(n[0]) + ' +' + n[1] + '</span>').join('') + sc.rec.map(n => '<span class="tag g">' + esc(n[0]) + ' +' + n[1] + '</span>').join('') + '</div>';
  const rcps = sc.progress.length ? '<div class="rcps">' + sc.progress.map(x => '<div class="rcp' + (x.done ? ' done' : '') + '"><span>' + (x.done ? '✅ ' : '') + esc(x.r.n) + '</span><b>+' + x.r.b + '</b><div class="bar"><i style="--w:' + Math.round(100 * x.got / x.r.need.length) + '%"></i></div></div>').join('') + '</div>' : '';
  return '<h3 style="--pc:' + p.c + '"><i></i>' + esc(p.n) + '<small>💰 ' + p.$ + '</small></h3>' + tabs + '<div class="tm" data-c="' + st.cat + '">' + teamBody(v, p, st) + '</div>' + sum + rcps + '<div class="btns"><button class="btn" type="button" data-close>تمام</button></div>';
}
function openTeam(pid, si) {
  const v = UI.view; if (!v) return;
  const cur = v.si >= 0 && v.si < v.sels.length ? v.si : 0;
  UI.team = { pid, si: si != null ? si : cur }; UI.last.team = ''; renderTeam(); openDlg('d-team');
}
function renderTeam() {
  const v = UI.view, t = UI.team; if (!v || !t) return;
  const html = teamHTML(v, t.pid, t.si);
  if (UI.last.team !== html) { UI.last.team = html; $('d-team-body').innerHTML = html; }
}
function refreshTeam(v) { if (UI.team && $('d-team').open) renderTeam(); }
$('d-team').addEventListener('close', () => { UI.team = null; UI.last.team = ''; });
$('d-team-body').addEventListener('click', e => { const b = e.target.closest('[data-st]'); if (b && UI.team) { UI.team.si = +b.dataset.st; renderTeam(); } });

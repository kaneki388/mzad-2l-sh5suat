/* ==========================================================
   الواجهة (2): شاشة الإعدادات (محلي / مضيف / لاعب منضم)
   ========================================================== */
const roomUrl = code => location.href.replace(/[?#].*$/, '') + '?room=' + code;
const botNameAt = (seats, i) => { const k = seats.slice(0, i).filter(s => s.b || s.bot).length; return PERSONAS[k % PERSONAS.length].name; };
const chipH = (label, attr, on) => '<button class="chipb" type="button" ' + attr + ' aria-pressed="' + (on ? 'true' : 'false') + '">' + esc(label) + '</button>';

/* نموذج موحد للعرض: محلي (من UI) أو أونلاين (من لقطة اللوبي) */
function setupModel() {
  const S = UI.S, v = UI.view;
  if (!S) return { mode: 'local', cfg: UI.cfg, seats: UI.seats.map(s => ({ n: s.name, b: s.bot ? 1 : 0, on: 1, h: 0 })), max: Math.min(6, cfgMax(UI.cfg)) };
  if (!v || v.ph !== 'lobby') return { mode: S.kind, wait: true, code: S.code || '', cfg: null, seats: [], max: 6 };
  const c = v.cfg;
  return { mode: S.kind, code: v.code, cfg: { budget: c.b, speed: c.sp, sep: !!c.sep, cats: c.cats, sels: c.sels }, seats: v.seats, max: Math.min(6, v.max) };
}
function catCardHTML(cat, cfg) {
  const c = CATS[cat], on = cfg.cats.includes(cat), sel = normSel({ ...(cfg.sels && cfg.sels[cat]), cat }), st = makeStage(sel);
  let body;
  if (cat === 'anime') body = '<p>عدد الشخصيات اللي كل واحد هيجمّعها.</p><div class="step"><button type="button" data-n="-1" aria-label="أقل"' + (sel.n <= 1 ? ' disabled' : '') + '>−</button><output>' + sel.n + '</output><button type="button" data-n="1" aria-label="أكتر"' + (sel.n >= 6 ? ' disabled' : '') + '>+</button></div>';
  else if (cat === 'sport') body = '<p>كوّن فريق كامل (' + st.total + ' لاعبين: حارس ودفاع ووسط وهجوم).</p><div class="chips">' + Object.keys(FORMATIONS).map(f => chipH(f, 'data-f="' + f + '"', sel.formation === f)).join('') + '</div>';
  else if (cat === 'food') body = '<p>ركّب طبقك بنفسك من ' + st.total + ' عناصر.</p><div class="chips">' + Object.keys(DISHES).map(d => chipH(DISHES[d].ico + ' ' + DISHES[d].name, 'data-d="' + d + '"', sel.dish === d)).join('') + '</div>';
  else body = '<p>أوت فيت من ' + st.total + ' قطع.</p><div class="chips">' + Object.keys(OUTFITS).map(o => chipH(OUTFITS[o].name, 'data-o="' + o + '"', sel.outfit === o)).join('') + '</div>';
  return '<div class="catcard" data-c="' + cat + '" data-on="' + (on ? 1 : 0) + '"><button class="cathead" type="button" data-cat="' + cat + '" aria-pressed="' + on + '"><span class="ico" aria-hidden="true">' + c.ico + '</span><b>' + c.name + '</b><span class="ck" aria-hidden="true">' + (on ? '✓' : '') + '</span></button><div class="catbody">' + body + '</div></div>';
}
function seatsHTML(m) {
  return m.seats.map((s, i) => {
    const sw = '<span class="sw"></span>', col = ' style="--pc:' + COLORS[i % COLORS.length] + '"';
    if (m.mode === 'local') {
      const input = s.b ? '<span class="who">🤖 كمبيوتر <small>(' + botNameAt(m.seats, i) + ')</small></span>'
        : '<label class="nm"><span class="sr">اسم اللاعب ' + (i + 1) + '</span><input class="inp" data-seat="' + i + '" maxlength="14" value="' + esc(s.n) + '" placeholder="لاعب ' + (i + 1) + '"></label>';
      const seg = '<div class="seg" role="group" aria-label="نوع اللاعب"><button type="button" data-mode="h" data-i="' + i + '" aria-pressed="' + !s.b + '">لاعب</button><button type="button" data-mode="b" data-i="' + i + '" aria-pressed="' + !!s.b + '">كمبيوتر</button></div>';
      return '<div class="seat"' + col + '>' + sw + input + seg + (m.seats.length > 2 ? '<button class="x" type="button" data-del="' + i + '" aria-label="شيل">✕</button>' : '') + '</div>';
    }
    const me = UI.S.kind === 'client' ? UI.S.seat === i : i === 0;
    const tag = s.h ? 'المضيف' : s.b ? 'كمبيوتر' : s.on ? '' : 'أوفلاين';
    const nm = s.b ? '🤖 ' + botNameAt(m.seats, i) : esc(s.n);
    return '<div class="seat"' + col + '>' + sw + '<span class="who' + (s.on ? '' : ' off') + '">' + nm + (me ? ' <small>(إنت)</small>' : '') + (tag ? ' <small>' + tag + '</small>' : '') + '</span>' + (m.mode === 'host' && i > 0 ? '<button class="x" type="button" data-del="' + i + '" aria-label="شيل">✕</button>' : '') + '</div>';
  }).join('');
}
function renderSetup() {
  const m = setupModel(), ro = m.mode === 'client';
  const sig = JSON.stringify([m, UI.S && UI.S.seat]);
  if (UI.last.setup === sig) return; UI.last.setup = sig;
  const online = m.mode !== 'local';
  $('su-chat').hidden = !online;
  $('su-title').textContent = m.mode === 'local' ? 'العب هنا' : m.mode === 'host' ? 'غرفتك' : 'الغرفة';
  $('su-room').hidden = !online || !m.code; $('su-code').textContent = m.code || '';
  $('su-share').hidden = !navigator.share;
  document.querySelector('#s-setup .wrap').classList.toggle('ro', ro);
  const act = document.activeElement;
  if (m.wait) { $('su-seats').innerHTML = ''; $('su-cats').innerHTML = ''; $('su-start').hidden = true; $('su-msg').textContent = 'بيحمّل الغرفة…'; return; }
  $('su-seats').innerHTML = seatsHTML(m);
  if (act && act.dataset && act.dataset.seat != null) { const back = document.querySelector('[data-seat="' + act.dataset.seat + '"]'); if (back) { back.focus(); try { back.setSelectionRange(back.value.length, back.value.length); } catch (e) { /* مش مهم */ } } }
  $('su-count').textContent = '(' + m.seats.length + ' من ' + m.max + ')';
  $('su-adds').hidden = ro;
  $('su-add-human').hidden = m.mode !== 'local';
  $('su-add-human').disabled = $('su-add-bot').disabled = m.seats.length >= m.max;
  $('su-cats').innerHTML = CAT_ORDER.map(k => catCardHTML(k, m.cfg)).join('');
  $('su-budget').innerHTML = BUDGETS.map(b => chipH(b, 'data-bud="' + b + '"', m.cfg.budget === b)).join('');
  $('su-speed').innerHTML = Object.keys(SPEEDS).map(k => chipH(SPEEDS[k].label, 'data-spd="' + k + '"', m.cfg.speed === k)).join('');
  const multi = m.cfg.cats.length > 1;
  document.querySelector('#s-setup .switch').hidden = !multi;
  const sep = $('su-sep'); sep.setAttribute('aria-pressed', String(m.cfg.sep)); sep.textContent = m.cfg.sep ? 'شغّال' : 'مقفول';
  $('su-copy').hidden = !online; $('su-start').hidden = ro;
  const err = ro ? '' : cfgError(sanitizeCfg(m.cfg), m.seats.length);
  $('su-start').disabled = !!err;
  $('su-msg').textContent = ro ? 'مستنيين المضيف يبدأ المزاد…' : err || (online && m.seats.length < 2 ? 'ابعت الكود لصحابك، أو ضيف كمبيوتر.' : '');
}

/* ----- تعديل الإعدادات ----- */
function curCfg() { return UI.S ? UI.S.cfg : UI.cfg; }
function editCfg(fn) {
  const cfg = JSON.parse(JSON.stringify(curCfg())); fn(cfg);
  const s = sanitizeCfg(cfg);
  if (UI.S) UI.S.setCfg(s); else { UI.cfg = s; lsSet(CFG_KEY, s); renderSetup(); }
}
function editSeats(fn) { fn(UI.seats); lsSet('mazad.seats.v2', UI.seats); renderSetup(); }
$('s-setup').addEventListener('input', e => {
  const i = e.target.dataset && e.target.dataset.seat;
  if (i != null && !UI.S && UI.seats[i]) { UI.seats[i].name = e.target.value.slice(0, 14); lsSet('mazad.seats.v2', UI.seats); UI.last.setup = ''; }
});
$('s-setup').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  const d = b.dataset, local = !UI.S;
  if (d.cat) return editCfg(c => {
    const on = c.cats.includes(d.cat);
    if (on && c.cats.length === 1) return toast('لازم نوع واحد على الأقل.');
    c.cats = on ? c.cats.filter(x => x !== d.cat) : CAT_ORDER.filter(x => x === d.cat || c.cats.includes(x));
  });
  if (d.n) return editCfg(c => { c.sels.anime.n = Math.max(1, Math.min(6, (c.sels.anime.n || 4) + (+d.n))); });
  if (d.f) return editCfg(c => { c.sels.sport.formation = d.f; });
  if (d.d) return editCfg(c => { c.sels.food.dish = d.d; });
  if (d.o) return editCfg(c => { c.sels.wear.outfit = d.o; });
  if (d.bud) return editCfg(c => { c.budget = +d.bud; });
  if (d.spd) return editCfg(c => { c.speed = d.spd; });
  if (d.mode && local) return editSeats(s => { s[+d.i].bot = d.mode === 'b'; });
  if (d.del != null) return local ? editSeats(s => { s.splice(+d.del, 1); }) : UI.S.kind === 'host' && UI.S.kick(+d.del);
  switch (b.id) {
    case 'su-sep': return editCfg(c => { c.sep = !c.sep; });
    case 'su-add-human': return local && editSeats(s => { if (s.length < 6) s.push({ name: '', bot: false }); });
    case 'su-add-bot': return local ? editSeats(s => { if (s.length < 6) s.push({ name: '', bot: true }); }) : UI.S.addBot();
    case 'su-start': return startGame();
    case 'su-back': return leaveSetup();
    case 'su-copy': return copyText(roomUrl(UI.S.code)).then(() => toast('اتنسخ الرابط. ابعته لصحابك.'));
    case 'su-share': return navigator.share({ title: 'مزاد الشخصيات', text: 'تعالى العب معايا مزاد. كود الغرفة: ' + UI.S.code, url: roomUrl(UI.S.code) }).catch(() => {});
    case 'su-chat': return openChat();
  }
});
function startGame() {
  if (UI.S && UI.S.kind === 'host') { const err = UI.S.start(); if (err) toast(err, 3600); return; }
  const err = cfgError(sanitizeCfg(UI.cfg), UI.seats.length); if (err) return toast(err, 3600);
  const seats = UI.seats.map(s => ({ name: s.name, bot: !!s.bot }));
  const S = new LocalSession(UI.cfg, seats);
  attach(S); S.start();
}
function leaveSetup() {
  const S = UI.S;
  if (S && S.kind === 'host' && S.seats.filter(s => !s.bot).length > 1) return askQuit('تقفل الغرفة؟', 'اللاعبين اللي دخلوا هيتشالوا من الغرفة.', 'اقفل', () => goHome());
  goHome();
}

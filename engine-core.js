/* ==========================================================
   المحرك (1): الحالة والمراحل وتدفق المزاد
   من غير DOM خالص: بيشتغل في المتصفح وفي Node للاختبار
   ========================================================== */
const SPEEDS = {
  fast:   { label: 'سريع',  call: [2, 3, 4],    open: 10 },
  normal: { label: 'عادي',  call: [3, 4.5, 6],  open: 15 },
  slow:   { label: 'براحة', call: [5, 7.5, 10], open: 24 },
};
const PERSONAS = [
  { name: 'الشاطر',     mult: 1.0,  lag: [0.8, 2.2] },
  { name: 'أبو الفلوس', mult: 1.35, lag: [0.5, 1.6] },
  { name: 'البخيل',     mult: 0.72, lag: [1.0, 2.6] },
  { name: 'القناص',     mult: 1.1,  lag: [0.5, 1.0], snipe: true },
  { name: 'المجنون',    mult: 1,    lag: [0.3, 1.2], wild: true },
  { name: 'الهادي',     mult: 0.95, lag: [1.2, 3.0] },
];
const BUDGETS = [50, 100, 200, 500, 1000];
const SOLD_PAUSE = 1.9;            // ثواني ختم «رسّى» قبل العنصر اللي بعده
const REVEAL_GAP = 3.4;            // ثواني بين كل شخصية مخفية والتانية
const LEFT_POINTS = 50;            // الميزانية كلها = 50 نقطة لو فضلت

class Game {
  constructor(cfg, emit, opts = {}) {
    this.cfg = {
      budget: BUDGETS.includes(cfg.budget) ? cfg.budget : 100,
      speed: SPEEDS[cfg.speed] ? cfg.speed : 'normal',
      sep: cfg.sep !== false,
      stages: cfg.stages.map(normSel),
    };
    this.emit = emit || (() => {});
    this.auto = !!opts.auto;                    // أونلاين: المراحل بتكمل لوحدها بعد مهلة
    this.rng = opts.rng || Math.random;
    this.stages = this.cfg.stages.map(makeStage);
    this.players = this.makePlayers(cfg.seats);
    this.si = -1; this.stage = null; this.ph = 'intro';
    this.clock = 0; this.phaseAt = 0; this.paused = false;
    this.pool = []; this.lot = null; this.nextOpener = 0; this.lastStarter = -1;
    this.retried = new Set(); this.norm = 1; this.mean = 80;
    this.secrets = []; this.rv = null; this.scores = [];
  }
  rnd(a, b) { return a + this.rng() * (b - a); }
  shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(this.rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  makePlayers(seats) {
    const names = new Set(); let bots = 0;
    return seats.map((s, i) => {
      const persona = s.bot ? PERSONAS[(s.persona != null ? s.persona : bots++) % PERSONAS.length] : null;
      const base = String(s.name || '').trim().slice(0, 14) || (persona ? persona.name : 'لاعب ' + (i + 1));
      let name = base, n = 1;
      while (names.has(name)) name = base + ' ' + (++n);
      names.add(name);
      return { id: i, name, bot: !!persona, persona, color: COLORS[i % COLORS.length], budget: this.cfg.budget, items: [], hidden: 0, on: true, nextAt: Infinity };
    });
  }

  /* ----- الخانات والفلوس ----- */
  owned(p) { return p.items.filter(x => x.cat === this.stage.cat); }
  need(p, k) { return (this.stage.slots[k] || 0) - this.owned(p).filter(x => x.it.k === k).length; }
  needTotal(p) { return sumOf(this.stage.kinds, x => Math.max(0, this.need(p, x.k))); }
  slotsAhead(p) {
    let n = this.needTotal(p);
    if (!this.cfg.sep) for (let i = this.si + 1; i < this.stages.length; i++) n += this.stages[i].total;
    return n;
  }
  maxBid(p) { return p.budget - Math.max(0, this.slotsAhead(p) - 1); }    // لازم تسيب 1 لكل خانة فاضلة
  eligible(p, item) { return this.need(p, item.k) > 0 && this.maxBid(p) >= 1; }

  /* ----- المراحل ----- */
  begin() { this.enterStage(); return this; }
  enterStage() {
    this.si++;
    if (this.si >= this.stages.length) return this.finish();
    const st = this.stage = this.stages[this.si];
    if (this.cfg.sep || this.si === 0) this.players.forEach(p => { p.budget = this.cfg.budget; });
    this.players.forEach(p => { p.hidden = 0; });
    this.pool = this.buildPool(st); this.lot = null; this.rv = null;
    const all = poolOf(st), mean = sumOf(all, i => i.p) / all.length;
    this.mean = mean; this.norm = sumOf(all, i => Math.pow(i.p / mean, 6)) / all.length;
    if (st.hidden) this.secrets = this.shuffle(HIDDEN.slice());
    this.ph = 'intro'; this.phaseAt = this.clock;
    this.emit('stage', { si: this.si });
  }
  buildPool(st) {
    const list = poolOf(st), kinds = st.kinds.map(x => x.k);
    if (kinds.length < 2) return this.shuffle(list.slice());
    const groups = kinds.map(k => this.shuffle(list.filter(i => i.k === k)));
    const out = [];
    while (groups.some(g => g.length)) out.push(...this.shuffle(groups.filter(g => g.length).map(g => g.pop())));
    return out;
  }
  advance() {
    if (this.ph === 'intro') { this.ph = 'lot'; this.nextLot(); }
    else if (this.ph === 'reveal') { while (this.rv && this.rv.i < this.rv.q.length) this.revealOne(this.rv.i++); this.toStageEnd(); }
    else if (this.ph === 'stageEnd') { this.enterStage(); }
    else return { ok: false, err: 'مش وقته' };
    return { ok: true };
  }
  finish() { this.ph = 'results'; this.lot = null; this.stage = null; this.emit('results', {}); }

  /* ----- العنصر الحالي ----- */
  nextLot() {
    this.lot = null;
    for (;;) {
      if (this.players.every(p => this.needTotal(p) === 0)) return this.endStage();
      if (!this.pool.length) { this.forceFill(); return this.endStage(); }
      const item = this.pool.shift();
      const el = this.players.filter(p => this.eligible(p, item));
      if (!el.length) continue;                     // مفيش حد محتاج النوع ده: نعديه
      return this.openLot(item, el);
    }
  }
  openLot(item, el) {
    const sp = SPEEDS[this.cfg.speed], n = this.players.length, ids = new Set(el.map(p => p.id));
    const lot = { item, state: 'open', price: 0, leader: -1, starter: -1, opener: -1, queue: [], qi: 0, deadline: Infinity, hist: [], passed: {}, lastBid: this.clock, call: 0, doneAt: 0, closeAt: 0, val: {}, callT: sp.call, auto: false, forced: false };
    for (let j = 0; j < n; j++) { const id = (this.nextOpener + j) % n; if (ids.has(id)) lot.queue.push(id); }
    if (lot.queue.length > 1 && lot.queue[0] === this.lastStarter) lot.queue.push(lot.queue.shift());   // اللي فتح العنصر اللي فات مايفتحش اللي بعده
    this.lot = lot; this.ph = 'lot';
    for (const b of el) if (b.bot) lot.val[b.id] = this.botValue(b, lot);
    this.emit('lot', { k: keyOf(item) });
    if (el.length === 1) {                           // محدش غيره محتاج الخانة دي
      lot.auto = true; lot.state = 'live'; lot.price = 1; lot.leader = lot.starter = el[0].id;
      lot.hist.push([el[0].id, 1]); lot.callT = [0.5, 0.9, 1.3]; lot.lastBid = this.clock;
    } else this.setOpener(0);
  }
  setOpener(qi) {
    const lot = this.lot;
    if (qi >= lot.queue.length) return this.endLot(false);
    lot.qi = qi; lot.opener = lot.queue[qi];
    const o = this.players[lot.opener], sp = SPEEDS[this.cfg.speed];
    lot.deadline = (this.auto || o.bot) ? this.clock + (o.on ? sp.open : 3) : Infinity;
    if (o.bot) this.botScheduleOpen(o);
    this.emit('opener', { pid: o.id });
  }
  contenders(lot) {
    return this.players.filter(p => p.id !== lot.leader && !lot.passed[p.id] && this.eligible(p, lot.item) && this.maxBid(p) > lot.price && (!p.bot || lot.val[p.id] > lot.price));
  }
  checkQuickClose() {
    const lot = this.lot;
    if (lot && lot.state === 'live' && !lot.closeAt && !this.contenders(lot).length) lot.closeAt = this.clock + 0.9;
  }

  /* ----- نوايا اللاعبين ----- */
  act(pid, a) {
    switch (a && a.t) {
      case 'bid': return this.bid(pid, a.amount);
      case 'pass': return this.pass(pid);
      case 'next': return this.advance(pid);
      default: return { ok: false, err: 'أمر غريب' };
    }
  }
  bid(pid, amount) {
    const lot = this.lot, p = this.players[pid];
    if (this.ph !== 'lot' || !lot || !p) return { ok: false, err: 'مش وقته' };
    if (this.paused) return { ok: false, err: 'اللعبة واقفة' };
    amount = Math.floor(Number(amount));
    if (!(amount >= 1)) return { ok: false, err: 'اكتب سعر صح' };
    const opening = lot.state === 'open';
    if (opening) { if (lot.opener !== pid) return { ok: false, err: 'مش دورك تفتح. مستني ' + this.players[lot.opener].name }; }
    else if (lot.state === 'live') {
      if (lot.leader === pid) return { ok: false, err: 'انت المتصدر أصلًا' };
      if (lot.passed[pid]) return { ok: false, err: 'انت سيبت العنصر ده' };
      if (amount <= lot.price) return { ok: false, err: 'لازم أكتر من ' + lot.price };
    } else return { ok: false, err: 'العنصر اتباع' };
    if (!this.eligible(p, lot.item)) return { ok: false, err: 'خانتك دي كاملة' };
    const mx = this.maxBid(p);
    if (amount > mx) return { ok: false, err: `أقصى سعر تقدر تدفعه ${mx} (لازم تسيب 1 لكل خانة فاضلة)` };
    lot.price = amount; lot.leader = pid; lot.hist.push([pid, amount]); lot.lastBid = this.clock; lot.call = 0; lot.closeAt = 0;
    if (opening) { lot.state = 'live'; lot.starter = this.lastStarter = pid; }
    this.rescheduleBots();
    this.emit('bid', { pid, amount, opening });
    this.checkQuickClose();
    return { ok: true };
  }
  pass(pid) {
    const lot = this.lot;
    if (this.ph !== 'lot' || !lot || !this.players[pid]) return { ok: false, err: 'مش وقته' };
    if (this.paused) return { ok: false, err: 'اللعبة واقفة' };
    if (lot.state === 'open') {
      if (lot.opener !== pid) return { ok: false, err: 'مش دورك' };
      this.emit('pass', { pid, opening: true }); this.setOpener(lot.qi + 1); return { ok: true };
    }
    if (lot.state !== 'live') return { ok: false, err: 'العنصر اتباع' };
    if (lot.leader === pid) return { ok: false, err: 'انت المتصدر. مش هتسيب نفسك 😄' };
    if (!lot.passed[pid]) { lot.passed[pid] = true; this.emit('pass', { pid }); }
    this.checkQuickClose();
    return { ok: true };
  }
  setPaused(v) { this.paused = !!v; this.emit('pause', { v: this.paused }); }

  /* ----- الوقت ----- */
  tick(dt) {
    if (this.paused) return;
    this.clock += dt;
    if (this.ph === 'lot') this.tickLot();
    else if (this.ph === 'reveal') this.tickReveal();
    else if (this.auto && this.ph === 'intro' && this.clock - this.phaseAt >= 9) this.advance();
    else if (this.auto && this.ph === 'stageEnd' && this.clock - this.phaseAt >= 25) this.advance();
  }
  tickLot() {
    const lot = this.lot; if (!lot) return;
    if (lot.state === 'sold' || lot.state === 'unsold') { if (this.clock - lot.doneAt >= SOLD_PAUSE) this.nextLot(); return; }
    if (lot.state === 'open') {
      const o = this.players[lot.opener];
      if (o.bot && this.clock >= o.nextAt) this.botOpen(o);
      else if (this.clock >= lot.deadline) { this.emit('timeout', { pid: o.id }); this.pass(o.id); }
      return;
    }
    if (lot.closeAt && this.clock >= lot.closeAt) return this.endLot(true);
    const since = this.clock - lot.lastBid, t = lot.callT;
    const stage = since >= t[2] ? 3 : since >= t[1] ? 2 : since >= t[0] ? 1 : 0;
    if (stage !== lot.call) { lot.call = stage; this.emit('call', { stage }); }
    if (stage === 3) return this.endLot(true);
    for (const b of this.players) if (b.bot && lot.state === 'live' && this.clock >= b.nextAt) this.botAct(b);
  }
  endLot(sold) {
    const lot = this.lot; lot.doneAt = this.clock;
    const key = keyOf(lot.item);
    if (!sold && this.retried.has(key)) {            // محدش عايزه مرتين: بالقرعة على حد محتاجه بـ 1
      const el = this.players.filter(p => this.eligible(p, lot.item));
      if (el.length) { const w = el[Math.floor(this.rng() * el.length)]; lot.forced = true; lot.leader = w.id; lot.price = 1; lot.hist = []; sold = true; }
    }
    const starter = lot.starter >= 0 ? lot.starter : lot.opener;
    if (starter >= 0) this.nextOpener = (starter + 1) % this.players.length;
    if (sold) {
      const p = this.players[lot.leader];
      p.budget -= lot.price; p.items.push({ it: lot.item, cat: lot.item.cat, price: lot.price, hid: 0, lost: null });
      lot.state = 'sold';
      let ru = -1;
      for (let i = lot.hist.length - 1; i >= 0; i--) if (lot.hist[i][0] !== lot.leader) { ru = lot.hist[i][0]; break; }
      this.emit('sold', { pid: p.id, price: lot.price, k: key, forced: lot.forced, ru });
      if (this.stage.hidden && ru >= 0 && !lot.forced) this.grantHidden(this.players[ru], lot.item);
    } else {
      lot.state = 'unsold'; this.retried.add(key); this.pool.push(lot.item);
      this.emit('unsold', { k: key });
    }
  }
  /* لو العناصر خلصت ولسه حد ناقصه خانة (حالة نادرة): بديل جاهز */
  forceFill() {
    const st = this.stage;
    for (const p of this.players) for (const x of st.kinds) for (let n = this.need(p, x.k); n > 0; n--) {
      const it = fillerOf(st.cat, x.k); p.items.push({ it, cat: st.cat, price: 0, hid: 0, lost: null });
    }
  }
}

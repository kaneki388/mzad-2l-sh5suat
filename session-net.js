/* ==========================================================
   الجلسات (2): الأونلاين — مضيف (بيشغّل المحرك) وعميل (بيعرض)
   كل الرسايل JSON على وسيط MQTT: .../h من المضيف للكل، .../c من اللاعبين
   للمضيف، .../u/<cid> رد مخصوص للاعب واحد
   ========================================================== */
const MAX_CHAT = 80, HB_MS = 4000, GONE_MS = 12000;
let memCid = '';
const myCid = () => {
  try { let c = sessionStorage.getItem('mazad.cid'); if (!c) { c = rid(10, 'abcdefghjkmnpqrstuvwxyz23456789'); sessionStorage.setItem('mazad.cid', c); } return c; }
  catch (e) { return memCid || (memCid = rid(10, 'abcdefghjkmnpqrstuvwxyz23456789')); }
};
const cleanName = s => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 14);

/* ----- المضيف ----- */
class HostSession extends Emitter {
  constructor(name, cfg) {
    super(); this.kind = 'host'; this.cid = myCid(); this.cfg = sanitizeCfg(cfg);
    this.seats = [{ cid: this.cid, n: cleanName(name) || 'المضيف', bot: false, seen: Infinity }];
    this.code = ''; this.mq = null; this.game = null; this.chat = []; this.chatId = 0; this.seq = 0; this.lastJson = {}; this.lastFull = 0;
    this.evq = []; this.timer = 0; this.view = null; this.at = 0; this.net = 'connecting';
  }
  get me() { return [0]; }
  tH() { return `${TOPIC_ROOT}/${this.code}/h`; }
  tU(cid) { return `${TOPIC_ROOT}/${this.code}/u/${cid}`; }
  send(obj, to) { return this.mq && this.mq.pub(to ? this.tU(to) : this.tH(), JSON.stringify(obj)); }
  async create() {
    const r = await connectAny('h' + this.cid);
    if (!r) throw new Error('مش قادر يوصل لوسيط الأونلاين. اتأكد من النت وجرّب تاني.');
    this.mq = r.mq; this.code = makeRoomCode(r.index);
    this.mq.onmsg = (t, m) => this.onMsg(m);
    this.mq.onstate = s => { this.net = s === 'open' ? 'ok' : 'lost'; this.emit('net', this.net); if (s === 'open') { this.mq.sub(`${TOPIC_ROOT}/${this.code}/c`); this.game ? this.pushGame(true) : this.pushLobby(); } };
    this.mq.sub(`${TOPIC_ROOT}/${this.code}/c`);
    this.timers = [setInterval(() => this.sweep(), 2000), setInterval(() => { if (this.game) this.pushGame(false); else this.pushLobby(); }, 1000)];
    this.pushLobby();
    return this.code;
  }
  isOn(s) { return s.bot || s.cid === this.cid || Date.now() - s.seen < GONE_MS; }
  seatOf(cid) { return this.seats.findIndex(s => s.cid === cid); }

  /* ----- اللوبي ----- */
  lobbyView() {
    return { v: 1, ph: 'lobby', code: this.code, ver: APP_VER, max: cfgMax(this.cfg),
      cfg: { b: this.cfg.budget, sp: this.cfg.speed, sep: this.cfg.sep ? 1 : 0, cats: this.cfg.cats, sels: this.cfg.sels },
      seats: this.seats.map((s, i) => ({ n: s.n, b: s.bot ? 1 : 0, on: this.isOn(s) ? 1 : 0, h: i === 0 ? 1 : 0 })) };
  }
  pushLobby() {
    this.view = this.lobbyView(); this.at = performance.now();
    this.emit('update', this.view, []);
    this.send({ t: 'v', n: ++this.seq, f: 1, s: this.view });
  }
  setCfg(cfg) { this.cfg = sanitizeCfg(cfg); try { localStorage.setItem(CFG_KEY, JSON.stringify(this.cfg)); } catch (e) { /* مش مهم */ } this.pushLobby(); }
  addBot() { if (!this.game && this.seats.length < Math.min(6, cfgMax(this.cfg))) { this.seats.push({ cid: null, n: '', bot: true, seen: 0 }); this.pushLobby(); } }
  kick(i) {
    if (this.game || i <= 0 || i >= this.seats.length) return;
    const [s] = this.seats.splice(i, 1); if (s.cid) this.send({ t: 'kick' }, s.cid);
    this.pushLobby();
  }
  start() {
    const err = cfgError(this.cfg, this.seats.length); if (err) return err;
    const seats = this.seats.map(s => ({ name: s.n, bot: s.bot }));
    this.game = new Game(gameCfg(this.cfg, seats), (t, d) => { this.evq.push([t, d]); this.dirty(); }, { auto: true });
    this.game.players.forEach((p, i) => { p.on = this.isOn(this.seats[i]); });
    this.game.begin(); this.ticker = new Ticker(dt => this.game.tick(dt)); this.ticker.start();
    this.lastFull = 0; this.pushGame(true); this.wake();
    return '';
  }
  async wake() { try { if (navigator.wakeLock) this.lock = await navigator.wakeLock.request('screen'); } catch (e) { /* مش مدعوم */ } }

  /* ----- اللعبة ----- */
  dirty() { if (!this.timer) this.timer = setTimeout(() => this.pushGame(false), 40); }
  pushGame(full) {
    const g = this.game; if (!g) return;
    clearTimeout(this.timer); this.timer = 0;
    const snap = g.snapshot(), ev = this.evq, now = performance.now(); this.evq = [];
    this.view = snap; this.at = now;
    this.emit('update', snap, ev);
    if (!this.mq) return;
    if (full || now - this.lastFull > 6000) {
      this.lastJson = {}; for (const k in snap) this.lastJson[k] = JSON.stringify(snap[k]); this.lastFull = now;
      this.send({ t: 'v', n: ++this.seq, f: 1, s: snap, ev }); return;
    }
    const patch = {}; let any = false;
    for (const k of new Set([...Object.keys(snap), ...Object.keys(this.lastJson)])) {
      const j = snap[k] === undefined ? undefined : JSON.stringify(snap[k]);
      if (j !== this.lastJson[k]) { patch[k] = snap[k] === undefined ? null : snap[k]; any = true; if (j === undefined) delete this.lastJson[k]; else this.lastJson[k] = j; }
    }
    if (any || ev.length) this.send({ t: 'v', n: ++this.seq, s: patch, ev });
  }
  act(pid, a, from) {
    let r;
    if (!this.game) r = { ok: false, err: 'اللعبة لسه ماتبدأتش' };
    else if (a && a.t === 'next' && pid !== 0) r = { ok: false, err: 'المضيف هو اللي بيكمّل' };
    else r = this.game.act(pid, a);
    if (!r.ok) { if (from) this.send({ t: 'err', m: r.err }, from); else this.emit('error', r.err); }
    this.dirty(); return r;
  }
  setPaused(v) { if (this.game) { this.game.setPaused(v); this.dirty(); } }
  /* بعد النتيجة: نرجع للوبي بنفس اللاعبين عشان نلعب تاني */
  again() {
    if (!this.game || this.game.ph !== 'results') return;
    if (this.ticker) this.ticker.stop();
    clearTimeout(this.timer); this.timer = 0; this.evq = [];
    try { if (this.lock) this.lock.release(); } catch (e) { /* خلاص */ }
    this.game = null; this.lastJson = {}; this.pushLobby();
  }

  /* ----- رسايل اللاعبين ----- */
  onMsg(text) {
    let m; try { m = JSON.parse(text); } catch (e) { return; }
    if (!m || typeof m !== 'object') return;
    const i = this.seatOf(m.cid);
    if (i >= 0) this.seats[i].seen = Date.now();
    switch (m.t) {
      case 'hello': return this.onHello(m, i);
      case 'hb': return;
      case 'act': if (i >= 0 && m.pid === i) this.act(i, m.a, m.cid); return;
      case 'chat': if (i >= 0) this.addChat(i, m.text, m.re); return;
      case 'sync': if (i >= 0) this.send({ t: 'v', n: ++this.seq, f: 1, s: this.view }, m.cid); return;
      case 'bye': if (i > 0) { if (this.game) { this.seats[i].seen = 0; } else this.seats.splice(i, 1); this.sweep(true); } return;
    }
  }
  onHello(m, i) {
    if (!m.cid) return;
    if (m.ver !== APP_VER) return this.send({ t: 'deny', why: 'ver' }, m.cid);
    if (i < 0) {
      if (this.game) return this.send({ t: 'deny', why: 'started' }, m.cid);
      if (this.seats.length >= Math.min(6, cfgMax(this.cfg))) return this.send({ t: 'deny', why: 'full' }, m.cid);
      this.seats.push({ cid: m.cid, n: cleanName(m.name) || 'لاعب ' + (this.seats.length + 1), bot: false, seen: Date.now() }); i = this.seats.length - 1;
    }
    this.send({ t: 'welcome', seat: i, code: this.code, chat: this.chat.slice(-40) }, m.cid);
    if (this.game) { this.game.players[i].on = true; this.pushGame(true); } else this.pushLobby();
  }
  sweep(force) {
    let changed = !!force;
    this.seats.forEach((s, i) => { const on = this.isOn(s); if (this.game && this.game.players[i] && this.game.players[i].on !== on) { this.game.players[i].on = on; changed = true; } else if (!this.game && s._on !== on) changed = true; s._on = on; });
    if (changed) this.game ? this.pushGame(false) : this.pushLobby();
  }

  /* ----- الشات (بيعدّي على المضيف عشان الترتيب يبقى واحد عند الكل) ----- */
  addChat(i, text, re) {
    text = String(text || '').trim().slice(0, 300); if (!text || !this.seats[i]) return;
    const m = { id: ++this.chatId, p: i, n: this.seats[i].n, t: text, ts: Date.now() };
    const q = re && this.chat.find(x => x.id === re); if (q) m.re = { id: q.id, n: q.n, t: q.t.slice(0, 70) };
    this.chat.push(m); if (this.chat.length > MAX_CHAT) this.chat.shift();
    this.send({ t: 'chat', m }); this.emit('chat', m);
  }
  sendChat(text, re) { this.addChat(0, text, re); }
  leave() {
    this.send({ t: 'bye' });
    (this.timers || []).forEach(clearInterval); if (this.ticker) this.ticker.stop(); clearTimeout(this.timer);
    try { if (this.lock) this.lock.release(); } catch (e) { /* خلاص */ }
    setTimeout(() => this.mq && this.mq.stop(), 150); this.game = null;
  }
}

/* ----- العميل ----- */
class ClientSession extends Emitter {
  constructor(code, name) {
    super(); this.kind = 'client'; this.cid = myCid(); this.code = normCode(code); this.name = cleanName(name);
    this.view = null; this.seat = -1; this.chat = []; this.seq = 0; this.net = 'connecting'; this.lastHost = 0; this.at = 0;
  }
  get me() { return this.seat >= 0 ? [this.seat] : []; }
  send(obj) { return this.mq && this.mq.pub(`${TOPIC_ROOT}/${this.code}/c`, JSON.stringify(Object.assign({ cid: this.cid }, obj))); }
  hello() { this.send({ t: 'hello', name: this.name, ver: APP_VER }); }
  join() {
    if (this.code.length !== 5) return Promise.reject(new Error('الكود لازم 5 حروف.'));
    this.mq = new Mqtt({ url: BROKERS[brokerIndexOf(this.code)], id: 'c' + this.cid });
    return new Promise((resolve, reject) => {
      let done = false, fails = 0;
      const fail = msg => { if (!done) { done = true; clearTimeout(timer); this.leave(true); reject(new Error(msg)); } };
      const timer = setTimeout(() => fail('مفيش غرفة بالكود ده، أو المضيف قفل الصفحة.'), 10000);
      this.mq.onmsg = (t, text) => {
        let m; try { m = JSON.parse(text); } catch (e) { return; }
        this.lastHost = Date.now();
        if (m.t === 'welcome') { this.seat = m.seat; this.chat = m.chat || []; if (!done) { done = true; clearTimeout(timer); resolve(); } else this.emit('chatlog', this.chat); }
        else if (m.t === 'deny') fail({ ver: 'نسخة الصفحة قديمة. حدّثها (Ctrl+F5) وجرّب تاني.', started: 'اللعبة بدأت بالفعل.', full: 'الغرفة مليانة.' }[m.why] || 'مش مسموح تدخل.');
        else this.onHostMsg(m);
      };
      this.mq.onstate = s => {
        if (s === 'open') { this.net = 'ok'; this.hello(); this.emit('net', 'ok'); }
        else if (s === 'failed' && !done && ++fails >= 3) fail('مش قادر يوصل لوسيط الأونلاين. جرّب تاني.');
        else if (s === 'lost' || s === 'failed') { this.net = 'lost'; this.emit('net', 'lost'); }
      };
      this.mq.sub(`${TOPIC_ROOT}/${this.code}/h`); this.mq.sub(`${TOPIC_ROOT}/${this.code}/u/${this.cid}`);
      this.mq.start();
      this.hb = setInterval(() => {
        this.send({ t: 'hb' });
        if (this.seat >= 0 && Date.now() - this.lastHost > 10000 && this.net === 'ok') { this.net = 'hostlost'; this.emit('net', 'hostlost'); }
      }, HB_MS);
    });
  }
  onHostMsg(m) {
    if (this.net === 'hostlost') { this.net = 'ok'; this.emit('net', 'ok'); }
    if (m.t === 'v') this.applyView(m);
    else if (m.t === 'chat') { this.chat.push(m.m); if (this.chat.length > MAX_CHAT) this.chat.shift(); this.emit('chat', m.m); }
    else if (m.t === 'err') this.emit('error', m.m);
    else if (m.t === 'kick') { this.leave(true); this.emit('closed', 'المضيف شالك من الغرفة.'); }
    else if (m.t === 'bye') { this.leave(true); this.emit('closed', 'المضيف خرج من الغرفة.'); }
  }
  applyView(m) {
    if (m.f) this.view = m.s;
    else if (this.view) {
      if (m.n !== this.seq + 1) this.send({ t: 'sync' });
      for (const k in m.s) { if (m.s[k] === null) delete this.view[k]; else this.view[k] = m.s[k]; }
    } else { this.send({ t: 'sync' }); return; }
    this.seq = m.n; this.at = performance.now();
    this.emit('update', this.view, m.ev || []);
  }
  act(pid, a) { this.send({ t: 'act', pid, a }); return { ok: true }; }
  sendChat(text, re) { this.send({ t: 'chat', text, re }); }
  leave(quiet) {
    clearInterval(this.hb);
    if (!quiet && this.mq && this.mq.alive) this.send({ t: 'bye' });
    const mq = this.mq; setTimeout(() => mq && mq.stop(), quiet ? 0 : 150);
  }
}
const CFG_KEY = 'mazad.cfg.v2';

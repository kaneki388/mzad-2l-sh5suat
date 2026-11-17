/* ==========================================================
   الجلسات (1): الإعدادات + الجلسة المحلية (أوفلاين على جهاز واحد)
   الواجهة بتتعامل مع أي جلسة بنفس الشكل: on('update', (view, events))
   ========================================================== */
const APP_VER = 2;
class Emitter {
  constructor() { this.h = {}; }
  on(e, f) { (this.h[e] = this.h[e] || []).push(f); return this; }
  emit(e, ...a) { for (const f of this.h[e] || []) { try { f(...a); } catch (err) { console.error(e, err); } } }
}

/* ----- الإعدادات: cats = الأنواع المفعّلة، sels = اختيار كل نوع ----- */
const defaultCfg = () => ({
  budget: 100, speed: 'normal', sep: true, cats: ['anime'],
  sels: { anime: { cat: 'anime', n: 4 }, sport: { cat: 'sport', formation: '4-3-3' }, food: { cat: 'food', dish: 'burger' }, wear: { cat: 'wear', outfit: 'full' } },
});
function sanitizeCfg(c) {
  const d = defaultCfg(); c = c && typeof c === 'object' ? c : {};
  const cats = CAT_ORDER.filter(k => Array.isArray(c.cats) && c.cats.includes(k));
  const sels = {}; for (const k of CAT_ORDER) sels[k] = normSel({ ...(c.sels && c.sels[k]), cat: k });
  return { budget: BUDGETS.includes(c.budget) ? c.budget : d.budget, speed: SPEEDS[c.speed] ? c.speed : d.speed, sep: c.sep !== false, cats: cats.length ? cats : d.cats, sels };
}
const stagesOf = cfg => cfg.cats.map(k => cfg.sels[k]);
const cfgMax = cfg => Math.max(1, Math.min(6, ...stagesOf(cfg).map(maxPlayersFor)));
/* لو الميزانية صغيرة على عدد الخانات: رسالة، وإلا فاضي */
function cfgError(cfg, players) {
  const total = sumOf(stagesOf(cfg), s => makeStage(s).total);
  if (players < 2) return 'محتاج لاعبين اتنين على الأقل.';
  if (players > cfgMax(cfg)) return `العناصر المتاحة بتكفي ${cfgMax(cfg)} لاعبين بس. قلّل اللاعبين أو غيّر الاختيارات.`;
  if (!cfg.sep && cfg.budget < total * 2) return `الميزانية صغيرة على ${total} خانة. زوّدها أو خلّي لكل نوع ميزانية لوحده.`;
  if (cfg.sep && cfg.budget < Math.max(...stagesOf(cfg).map(s => makeStage(s).total)) * 2) return 'الميزانية صغيرة على عدد الخانات. زوّدها أو قلّل الخانات.';
  return '';
}
const gameCfg = (cfg, seats) => ({ budget: cfg.budget, speed: cfg.speed, sep: cfg.sep, stages: stagesOf(cfg), seats });

/* ----- ساعة اللعبة: بتشتغل حتى لو التبويب في الخلفية (بس ببطء) ----- */
class Ticker {
  constructor(fn) { this.fn = fn; this.t = 0; this.h = 0; this.w = null; this.url = ''; }
  tick() { const n = performance.now(), dt = Math.min(0.5, (n - this.t) / 1000); this.t = n; this.fn(dt); }
  start() {
    this.t = performance.now();
    const fallback = () => { if (!this.h) this.h = setInterval(() => this.tick(), 100); };
    try {                                   // Worker مابيتبطّأش لما التبويب يبقى في الخلفية زي setInterval
      this.url = URL.createObjectURL(new Blob(['setInterval(function(){postMessage(0)},100)'], { type: 'text/javascript' }));
      this.w = new Worker(this.url); this.w.onmessage = () => this.tick(); this.w.onerror = () => { this.w = null; fallback(); };
    } catch (e) { this.w = null; fallback(); }
  }
  stop() {
    if (this.w) { this.w.terminate(); this.w = null; }
    if (this.url) { try { URL.revokeObjectURL(this.url); } catch (e) { /* خلاص */ } this.url = ''; }
    clearInterval(this.h); this.h = 0;
  }
}

/* ----- جلسة محلية: كل اللاعبين على نفس الجهاز ----- */
class LocalSession extends Emitter {
  constructor(cfg, seats) {
    super(); this.kind = 'local'; this.cfg = cfg; this.seats = seats; this.evq = []; this.timer = 0; this.view = null; this.at = 0;
    this.game = new Game(gameCfg(cfg, seats), (t, d) => { this.evq.push([t, d]); this.dirty(); }, { auto: false });
    this.ticker = new Ticker(dt => this.game.tick(dt));
  }
  get me() { return this.game.players.filter(p => !p.bot).map(p => p.id); }
  start() { this.game.begin(); this.ticker.start(); this.flush(); return this; }
  dirty() { if (!this.timer) this.timer = setTimeout(() => this.flush(), 30); }
  flush() {
    this.timer = 0; const ev = this.evq; this.evq = [];
    this.view = this.game.snapshot(); this.at = performance.now();
    this.emit('update', this.view, ev);
  }
  act(pid, a) { const r = this.game.act(pid, a); if (!r.ok) this.emit('error', r.err); this.dirty(); return r; }
  setPaused(v) { this.game.setPaused(v); this.dirty(); }
  stop() { this.ticker.stop(); clearTimeout(this.timer); }
}

/* ==========================================================
   المحرك (2): الكمبيوتر
   ========================================================== */
Object.assign(Game.prototype, {
  /* أقصى سعر الكمبيوتر مستعد يدفعه في العنصر ده */
  botValue(b, lot) {
    const st = this.stage, it = lot.item, mine = this.owned(b);
    const per = b.budget / Math.max(1, this.slotsAhead(b));
    let m = (b.persona.wild ? this.rnd(0.5, 1.7) : b.persona.mult) * this.rnd(0.85, 1.2);
    if (mine.some(x => x.it.t === it.t)) m *= 1.15;                                   // كومبو
    if (st.recipes.some(r => r.need.some(g => g.includes(it.lid) && !mine.some(x => g.includes(x.it.lid))))) m *= 1.12;   // وصفة
    const rel = Math.pow(it.p / this.mean, 6) / this.norm;
    const left = this.pool.filter(x => x.k === it.k).length + 1;
    const urgent = this.need(b, it.k) / left > 0.6;                                   // العناصر قربت تخلص
    return Math.max(per * rel * m, urgent ? per * 0.8 : 1);
  },
  botScheduleOpen(o) { o.nextAt = this.clock + this.rnd(0.9, 2.4) * SPEEDS[this.cfg.speed].call[2] / 6; },
  botOpen(b) {
    const lot = this.lot, v = lot.val[b.id], cap = Math.min(Math.floor(v), this.maxBid(b));
    b.nextAt = Infinity;
    if (cap >= 1 && v >= 1.5) this.bid(b.id, Math.max(1, Math.min(cap, Math.round(v * this.rnd(0.12, 0.35)))));
    else this.pass(b.id);
  },
  rescheduleBots() { for (const b of this.players) if (b.bot) this.botSchedule(b); },
  botSchedule(b) {
    const lot = this.lot, sp = SPEEDS[this.cfg.speed], f = sp.call[2] / 6, pr = b.persona;
    if (!lot || lot.state !== 'live' || lot.leader === b.id || lot.passed[b.id] || !this.eligible(b, lot.item)) { b.nextAt = Infinity; return; }
    b.nextAt = pr.snipe && lot.leader >= 0 ? Math.max(this.clock + 0.2, lot.lastBid + lot.callT[0] - this.rnd(0.3, 0.9)) : this.clock + this.rnd(pr.lag[0], pr.lag[1]) * f;
  },
  botAct(b) {
    const lot = this.lot;
    if (lot.leader === b.id || lot.passed[b.id] || !this.eligible(b, lot.item)) { b.nextAt = Infinity; return; }
    const v = lot.val[b.id], cap = Math.min(Math.floor(v), this.maxBid(b));
    if (cap <= lot.price) { lot.passed[b.id] = true; b.nextAt = Infinity; this.emit('pass', { pid: b.id }); this.checkQuickClose(); return; }
    if (this.rng() < 0.1) { b.nextAt = Infinity; return; }                            // أحيانًا يتردد
    this.bid(b.id, Math.min(lot.price + Math.max(1, Math.round(v * this.rnd(0.04, 0.14))), cap));
  },
});

/* ==========================================================
   المحرك (3): الشخصية المخفية، الكشف، النقط، لقطة الحالة
   ========================================================== */
Object.assign(Game.prototype, {
  /* ----- الشخصية المخفية: الوصيف (اللي خسر بفارق) ياخد شخصية سرية مجانية بتملى خانة ----- */
  drawSecret() {
    if (!this.secrets.length) this.secrets = this.shuffle(HIDDEN.slice());
    return this.secrets.pop();
  },
  grantHidden(p, lost) {
    const cap = Math.max(1, Math.floor(this.stage.total / 3));       // 4 خانات = واحدة، 6 خانات = اتنين
    if (this.needTotal(p) <= 0 || p.hidden >= cap) return;
    p.items.push({ it: this.drawSecret(), cat: this.stage.cat, price: 0, hid: 1, lost });
    p.hidden++;
    this.emit('hiddenGrant', { pid: p.id, lost: keyOf(lost) });      // الهوية مابتتبعتش: بتتكشف آخر الجولة
  },

  /* ----- نهاية المرحلة والكشف ----- */
  endStage() {
    this.lot = null;
    const q = [];
    this.players.forEach(p => p.items.forEach((x, idx) => { if (x.hid === 1) q.push({ pid: p.id, idx }); }));
    if (q.length) { this.ph = 'reveal'; this.rv = { q, i: 0, at: this.clock + 1.6, last: null }; this.emit('reveal', { n: q.length }); }
    else this.toStageEnd();
  },
  tickReveal() {
    const rv = this.rv; if (!rv || this.clock < rv.at) return;
    if (rv.i < rv.q.length) { this.revealOne(rv.i++); rv.at = this.clock + REVEAL_GAP; }
    else this.toStageEnd();
  },
  revealOne(i) {
    const { pid, idx } = this.rv.q[i], e = this.players[pid].items[idx];
    e.hid = 2; this.rv.last = { pid, idx };
    this.emit('revealed', { pid, k: keyOf(e.it), lost: keyOf(e.lost), diff: e.it.p - e.lost.p });
  },
  toStageEnd() {
    this.scores[this.si] = this.scoreStage();
    this.ph = 'stageEnd'; this.phaseAt = this.clock; this.rv = null;
    this.emit('stageEnd', { si: this.si });
  },

  /* ----- النقط ----- */
  scoreStage() {
    const st = this.stage, last = this.si === this.stages.length - 1;
    return this.players.map(p => {
      const its = this.owned(p), base = sumOf(its, x => x.it.p), notes = [], rec = [], cnt = {};
      let bonus = 0;
      its.forEach(x => { if (!x.it.filler) cnt[x.it.t] = (cnt[x.it.t] || 0) + 1; });
      for (const [t, n] of Object.entries(cnt)) if (n > 1) { const v = (n - 1) * st.combo; bonus += v; notes.push([`${t} ×${n}`, v]); }
      for (const r of st.recipes) if (matchRecipe(r, its.map(x => x.it))) { bonus += r.b; rec.push([r.n, r.b]); }
      const left = (this.cfg.sep || last) ? Math.round(p.budget * LEFT_POINTS / this.cfg.budget) : 0;
      return { pid: p.id, base, notes, rec, bonus, coins: p.budget, left, total: base + bonus + left };
    });
  },
  /* الترتيب الكلي بعد المراحل اللي خلصت */
  standings() {
    const rows = this.players.map(p => ({ pid: p.id, per: this.scores.map(s => s ? s[p.id].total : 0), total: sumOf(this.scores, s => s ? s[p.id].total : 0) }));
    rows.sort((a, b) => b.total - a.total);
    rows.forEach((r, i) => { r.rank = i && r.total === rows[i - 1].total ? rows[i - 1].rank : i + 1; });
    return rows;
  },

  /* ----- لقطة الحالة: نفس الشكل للجهاز المحلي والمضيف والعميل ----- */
  snapshot() {
    const st = this.stage, lot = this.lot, now = this.clock;
    const S = { v: 1, ph: this.ph, si: this.si, ns: this.stages.length, pa: this.paused ? 1 : 0, cl: +now.toFixed(2),
      cfg: { b: this.cfg.budget, sp: this.cfg.speed, sep: this.cfg.sep ? 1 : 0 }, sels: this.cfg.stages, st: st ? st.sel : null };
    S.pl = this.players.map(p => {
      const o = { i: p.id, n: p.name, b: p.bot ? 1 : 0, c: p.color, $: p.budget, on: p.on ? 1 : 0,
        it: p.items.map(x => [x.hid === 1 ? '#' : keyOf(x.it), x.price, x.hid, x.lost ? keyOf(x.lost) : 0, x.cat]) };
      if (st) { o.nd = this.needTotal(p); o.mx = this.maxBid(p); if (lot) o.el = this.eligible(p, lot.item) ? 1 : 0; }
      return o;
    });
    if (lot) S.lot = { k: keyOf(lot.item), s: lot.state, p: lot.price, l: lot.leader, o: lot.opener, c: lot.call, ps: Object.keys(lot.passed).map(Number),
      h: lot.hist.slice(-6), au: lot.auto ? 1 : 0, fo: lot.forced ? 1 : 0, cq: lot.closeAt ? 1 : 0,
      rem: lot.state === 'open' && isFinite(lot.deadline) ? Math.max(0, +(lot.deadline - now).toFixed(1)) : -1 };
    if (this.rv) S.rv = { i: this.rv.i, n: this.rv.q.length, last: this.rv.last };
    S.sc = this.scores.map(s => s || null);
    return S;
  },
});

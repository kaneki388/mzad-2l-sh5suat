/* ==========================================================
   الأونلاين (1): عميل MQTT 3.1.1 صغير فوق WebSocket
   بيستخدم وسيط عام مجاني (مفيش سيرفر عندك). تقدر تغيّر القايمة دي
   أو تفتح الصفحة بـ ?broker=wss://...  عشان تجرّب وسيط تاني
   ========================================================== */
const DEFAULT_BROKERS = ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt', 'wss://test.mosquitto.org:8081'];
const BROKERS = (() => {
  try { const b = new URLSearchParams(location.search).get('broker'); if (b) return [b]; } catch (e) { /* مش في متصفح */ }
  return DEFAULT_BROKERS;
})();
const ROOM_ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';     // من غير O و I و 0 و 1 عشان ماتتلخبطش
const TOPIC_ROOT = 'mazad1';
const rid = (n, a = ROOM_ALPHA) => { let s = ''; const r = new Uint32Array(n); (typeof crypto !== 'undefined' && crypto.getRandomValues) ? crypto.getRandomValues(r) : r.forEach((_, i) => { r[i] = Math.random() * 4294967296; }); for (let i = 0; i < n; i++) s += a[r[i] % a.length]; return s; };
/* أول حرف في كود الغرفة بيحدد الوسيط، فالكود لوحده كفاية عشان الكل يقابل بعض */
const brokerIndexOf = code => ROOM_ALPHA.indexOf(String(code || '')[0]) % BROKERS.length;
const makeRoomCode = bi => { let c; do { c = rid(1); } while (ROOM_ALPHA.indexOf(c) % BROKERS.length !== bi); return c + rid(4); };
const normCode = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/O/g, '').replace(/I/g, '').slice(0, 5);

const te = new TextEncoder(), td = new TextDecoder();
const mStr = s => { const b = te.encode(s), o = new Uint8Array(2 + b.length); o[0] = b.length >> 8; o[1] = b.length & 255; o.set(b, 2); return o; };
function remLen(n) { const a = []; do { let d = n % 128; n = Math.floor(n / 128); if (n > 0) d |= 128; a.push(d); } while (n > 0); return a; }
function mPacket(first, ...parts) {
  const len = parts.reduce((s, p) => s + p.length, 0), head = [first, ...remLen(len)], out = new Uint8Array(head.length + len);
  out.set(head, 0); let o = head.length; for (const p of parts) { out.set(p, o); o += p.length; } return out;
}

class Mqtt {
  constructor({ url, id, retry = true }) {
    this.url = url; this.id = id; this.retry = retry; this.subs = new Set();
    this.ws = null; this.alive = false; this.stopped = true; this.tries = 0; this.buf = new Uint8Array(0); this.pid = 1;
    this.timers = {}; this.onmsg = null; this.onstate = null;
  }
  start() { this.stopped = false; this.open(); return this; }
  setState(s) { try { if (this.onstate) this.onstate(s); } catch (e) { console.error(e); } }
  open() {
    clearTimeout(this.timers.retry);
    this.setState('connecting');
    let ws;
    try { ws = new WebSocket(this.url, 'mqtt'); } catch (e) { return this.lost(); }
    ws.binaryType = 'arraybuffer'; this.ws = ws; this.buf = new Uint8Array(0);
    clearTimeout(this.timers.conn); this.timers.conn = setTimeout(() => { if (!this.alive && this.ws === ws) { try { ws.close(); } catch (e) { /* خلاص */ } this.lost(ws); } }, 7000);
    ws.onopen = () => ws.send(mPacket(0x10, mStr('MQTT'), Uint8Array.of(4, 2, 0, 45), mStr(this.id)));
    ws.onmessage = e => this.feed(new Uint8Array(e.data));
    ws.onclose = () => this.lost(ws);
    ws.onerror = () => { /* onclose هتتنادي */ };
  }
  lost(ws) {
    if (ws && ws !== this.ws) return;
    const was = this.alive; this.alive = false; this.ws = null;
    clearInterval(this.timers.ping); clearTimeout(this.timers.conn);
    if (this.stopped) return;
    this.setState(was ? 'lost' : 'failed');
    if (!this.retry) return;
    const wait = Math.min(8000, 700 * Math.pow(1.7, this.tries++));
    this.timers.retry = setTimeout(() => { if (!this.stopped) this.open(); }, wait);
  }
  stop() {
    this.stopped = true; clearTimeout(this.timers.retry); clearTimeout(this.timers.conn); clearInterval(this.timers.ping);
    const ws = this.ws; this.ws = null; this.alive = false;
    if (ws) { try { ws.send(Uint8Array.of(0xE0, 0)); } catch (e) { /* مقفول */ } try { ws.close(); } catch (e) { /* مقفول */ } }
  }
  send(bytes) { try { if (this.ws && this.ws.readyState === 1) { this.ws.send(bytes); return true; } } catch (e) { /* هيتعاد */ } return false; }
  sub(topic) { this.subs.add(topic); if (this.alive) this.send(mPacket(0x82, Uint8Array.of(this.pid >> 8, this.pid & 255), mStr(topic), Uint8Array.of(0))), this.pid = (this.pid % 65000) + 1; }
  pub(topic, text) { return this.alive && this.send(mPacket(0x30, mStr(topic), te.encode(text))); }
  feed(data) {
    const b = new Uint8Array(this.buf.length + data.length); b.set(this.buf, 0); b.set(data, this.buf.length); this.buf = b;
    for (;;) {
      const buf = this.buf; if (buf.length < 2) return;
      let mul = 1, len = 0, i = 1, d;
      do { if (i >= buf.length) return; d = buf[i++]; len += (d & 127) * mul; mul *= 128; } while (d & 128);
      if (buf.length < i + len) return;
      const type = buf[0] >> 4, flags = buf[0] & 15, body = buf.subarray(i, i + len);
      this.buf = buf.subarray(i + len);
      this.handle(type, flags, body);
    }
  }
  handle(type, flags, body) {
    if (type === 2) {                                               // CONNACK
      if (body[1] !== 0) { try { this.ws.close(); } catch (e) { /* خلاص */ } return; }
      clearTimeout(this.timers.conn); this.alive = true; this.tries = 0;
      for (const t of this.subs) this.send(mPacket(0x82, Uint8Array.of(this.pid >> 8, this.pid & 255), mStr(t), Uint8Array.of(0))), this.pid = (this.pid % 65000) + 1;
      clearInterval(this.timers.ping); this.timers.ping = setInterval(() => this.send(Uint8Array.of(0xC0, 0)), 25000);
      this.setState('open');
    } else if (type === 3) {                                        // PUBLISH
      const tl = (body[0] << 8) | body[1], topic = td.decode(body.subarray(2, 2 + tl)), qos = (flags >> 1) & 3;
      let o = 2 + tl; if (qos) { if (qos === 1) this.send(Uint8Array.of(0x40, 2, body[o], body[o + 1])); o += 2; }
      if (this.onmsg) { try { this.onmsg(topic, td.decode(body.subarray(o))); } catch (e) { console.error(e); } }
    }
  }
}

/* بيجرّب الوسطاء واحد ورا التاني ويرجّع أول واحد اشتغل: { mq, index } */
function connectAny(id, urls = BROKERS) {
  return new Promise(resolve => {
    let i = 0;
    const next = () => {
      if (i >= urls.length) return resolve(null);
      const idx = i++, mq = new Mqtt({ url: urls[idx], id, retry: false });
      let done = false;
      mq.onstate = s => {
        if (done) return;
        if (s === 'open') { done = true; mq.retry = true; mq.onstate = null; resolve({ mq, index: idx }); }
        else if (s === 'failed' || s === 'lost') { done = true; mq.stop(); next(); }
      };
      mq.start();
    };
    next();
  });
}

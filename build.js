/* بيجمّع كل الملفات في index.html واحد + قايمة أسماء الصور */
const fs = require('fs'), path = require('path');
const src = f => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8');
const CSS = ['style-base.css', 'style-screens.css', 'style-teams.css', 'style-chat.css'];
const JS = ['data/anime.js', 'data/sport.js', 'data/food.js', 'data/wear.js', 'data/cats.js', 'engine-core.js', 'engine-bots.js', 'engine-end.js',
  'net.js', 'session-core.js', 'session-net.js', 'ui-core.js', 'ui-setup.js', 'ui-home.js', 'ui-auction.js', 'ui-dock.js', 'ui-teams.js', 'ui-end.js', 'ui-chat.js'];
const js = JS.map(f => '/* ===== ' + f + ' ===== */\n' + src(f)).join('\n');
if (/<\/script/i.test(js)) throw new Error('فيه </script داخل الكود');
const html = src('head.html').trimEnd() + '\n<style>\n' + CSS.map(src).join('\n') + '</style>\n</head>\n<body>\n' + src('body.html') + '<script>\n' + js + '\n</script>\n</body>\n</html>\n';
fs.writeFileSync(path.join(__dirname, 'index.html'), html);
console.log('index.html', Buffer.byteLength(html), 'bytes');

/* قايمة أسماء الصور: اسم الملف = الـ id + .jpg */
const vm = require('vm'), ctx = vm.createContext({});
vm.runInContext(['data/anime.js', 'data/sport.js', 'data/food.js', 'data/wear.js', 'data/cats.js'].map(src).join('\n') + '\n;this.OUT={ITEMS,HIDDEN,CATS,CAT_ORDER,DISHES}', ctx);
const { ITEMS, HIDDEN, CATS, CAT_ORDER, DISHES } = ctx.OUT;
const lines = ['أسماء ملفات الصور. حط الصورة في فولدر images باسم الـ id + الامتداد (jpg أو png أو webp).', 'مثال: الصورة بتاعة "زورو" تتسمى  zoro.jpg  (لو الـ id بتاعه zoro).', 'لو الصورة مش موجودة، اللعبة بتعرض إيموجي بداله، فتقدر تضيف الصور براحتك واحدة واحدة.', 'صور مربعة (400×400 مثلًا) أحسن شكل.', ''];
for (const cat of CAT_ORDER) {
  lines.push('===== ' + CATS[cat].name + ' =====');
  for (const it of ITEMS[cat]) lines.push(it.id + '.jpg    ' + it.n + (it.dish ? '  (' + DISHES[it.dish].name + ')' : '') + '   [' + it.t + ']');
  if (cat === 'anime') { lines.push('--- الشخصيات المخفية ---'); for (const it of HIDDEN) lines.push(it.id + '.jpg    ' + it.n + '   [' + it.t + ']'); }
  lines.push('');
}
fs.mkdirSync(path.join(__dirname, 'images'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'images', 'NAMES.txt'), lines.join('\n'));
console.log('images/NAMES.txt', lines.length, 'lines');

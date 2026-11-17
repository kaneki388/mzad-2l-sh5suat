/* ==========================================================
   الأنواع والمراحل والتشكيلات والوصفات
   كل نوع (أنمي / كورة / أكل / هدوم) بيتلعب مرحلة لوحده
   ========================================================== */
const COLORS = ['#FF3D71', '#00A6FB', '#FFB000', '#8A4FFF', '#00B67A', '#FF6B00'];
const KIND_EMOJI = { GK: '🧤', DEF: '🛡️', MID: '🎯', ATT: '⚽' };
const sumOf = (a, f) => a.reduce((s, x) => s + f(x), 0);

const CATS = {
  anime: { id: 'anime', name: 'أنمي', ico: '🎌', stat: 'القوة', theme: 'anime', combo: 5, hidden: true, pick: 'count',
    kinds: [{ k: 'any', label: 'شخصية', ico: '🎌' }], blurb: 'شخصيات من أشهر الأنميات. نفس المسلسل بيدّيك كومبو.' },
  sport: { id: 'sport', name: 'كورة', ico: '⚽', stat: 'التقييم', theme: 'sport', combo: 4, pick: 'formation',
    kinds: [{ k: 'GK', label: 'حارس', ico: '🧤' }, { k: 'DEF', label: 'مدافع', ico: '🛡️' }, { k: 'MID', label: 'لاعب وسط', ico: '🎯' }, { k: 'ATT', label: 'مهاجم', ico: '⚽' }],
    blurb: 'كوّن فريق كامل بالتشكيلة. نفس البلد بيدّيك كيميا.' },
  food: { id: 'food', name: 'أكل', ico: '🍔', stat: 'الطعم', theme: 'food', combo: 4, pick: 'dish', kinds: [],
    blurb: 'ركّب طبقك: العيش والبروتين والصوص. نفس النكهة والوصفات المشهورة بيدّوك بونص.' },
  wear: { id: 'wear', name: 'هدوم', ico: '👕', stat: 'الستايل', theme: 'wear', combo: 4, pick: 'outfit', kinds: [],
    blurb: 'كوّن أوت فيت كامل. نفس الستايل واللوكات المعروفة بيدّوك بونص.' },
};
const CAT_ORDER = ['anime', 'sport', 'food', 'wear'];

/* ----- كورة: الصفوف من الهجوم للحارس ----- */
const FORMATIONS = {
  '4-3-3': [['ATT', 3], ['MID', 3], ['DEF', 4], ['GK', 1]],
  '4-4-2': [['ATT', 2], ['MID', 4], ['DEF', 4], ['GK', 1]],
  '3-5-2': [['ATT', 2], ['MID', 5], ['DEF', 3], ['GK', 1]],
  '4-2-3-1': [['ATT', 1], ['MID', 3], ['MID', 2], ['DEF', 4], ['GK', 1]],
  '3-4-3': [['ATT', 3], ['MID', 4], ['DEF', 3], ['GK', 1]],
  '5-3-2': [['ATT', 2], ['MID', 3], ['DEF', 5], ['GK', 1]],
};

/* ----- أكل: كل وصفة = مجموعات، وكل مجموعة لازم عنصر منها (بالـ id) ----- */
const DISHES = {
  burger: { name: 'برجر', ico: '🍔',
    kinds: [{ k: 'bun', label: 'العيش', ico: '🍞', n: 1 }, { k: 'protein', label: 'البروتين', ico: '🥩', n: 1 }, { k: 'cheese', label: 'الجبنة', ico: '🧀', n: 1 }, { k: 'sauce', label: 'الصوص', ico: '🍯', n: 1 }, { k: 'topping', label: 'إضافات', ico: '🥓', n: 2 }],
    recipes: [
      { n: 'كلاسيك أمريكي', b: 20, need: [['sesame', 'brioche', 'potato'], ['angus', 'smash', 'double'], ['cheddar'], ['ketchup', 'thousand', 'mustard']] },
      { n: 'هوت تشيكن', b: 20, need: [['crispy'], ['hot', 'sriracha'], ['pickle', 'jalapeno'], ['brioche', 'potato', 'sesame', 'pretzel']] },
      { n: 'سموكي باربكيو', b: 20, need: [['bbq'], ['angus', 'double', 'kofta', 'smash'], ['bacon', 'onionrings', 'caramelonion'], ['smoked', 'cheddar']] },
      { n: 'برجر صحي', b: 15, need: [['wholegrain', 'glutenfree'], ['veggie', 'grilled', 'fish'], ['arugula', 'avocado', 'lettuce']] },
    ] },
  pizza: { name: 'بيتزا', ico: '🍕',
    kinds: [{ k: 'dough', label: 'العجينة', ico: '🫓', n: 1 }, { k: 'sauce', label: 'الصوص', ico: '🍅', n: 1 }, { k: 'cheese', label: 'الجبنة', ico: '🧀', n: 1 }, { k: 'meat', label: 'اللحمة', ico: '🍖', n: 1 }, { k: 'veg', label: 'خضار', ico: '🍄', n: 2 }],
    recipes: [
      { n: 'مارجريتا', b: 20, need: [['thin', 'sourdough'], ['tomato'], ['mozz', 'roumy'], ['basil', 'cherry']] },
      { n: 'بيبروني ستورم', b: 20, need: [['pepperoni'], ['mozz', 'fourcheese', 'cheddar'], ['jalapeno', 'cherry', 'pepper'], ['tomato', 'arrabbiata']] },
      { n: 'باربكيو تشيكن', b: 20, need: [['bbq'], ['bbqchicken'], ['onion', 'redonion'], ['mozz', 'cheddar', 'roumy']] },
      { n: 'سي فود', b: 15, need: [['shrimp', 'tuna'], ['garlic', 'alfredo', 'pesto'], ['olives', 'cherry', 'arugula']] },
    ] },
  shawarma: { name: 'شاورما', ico: '🌯',
    kinds: [{ k: 'bread', label: 'العيش', ico: '🫓', n: 1 }, { k: 'meat', label: 'اللحمة', ico: '🍗', n: 1 }, { k: 'sauce', label: 'الصوص', ico: '🧄', n: 1 }, { k: 'veg', label: 'مخللات وخضار', ico: '🥒', n: 2 }, { k: 'side', label: 'جنبها', ico: '🍟', n: 1 }],
    recipes: [
      { n: 'فراخ كلاسيك', b: 20, need: [['chicken'], ['toum'], ['pickles', 'turnip', 'pickledcuc'], ['fries', 'friescheese']] },
      { n: 'ميكس اللحمة', b: 20, need: [['mix', 'beef'], ['tahini', 'harissa'], ['sumac', 'onion', 'tomato'], ['syrian', 'saj', 'sesamesaj']] },
      { n: 'الصاروخ', b: 15, need: [['spicy', 'harissa'], ['kofta', 'sausage', 'araies'], ['greenpepper', 'pickles', 'turnip']] },
      { n: 'نباتي', b: 15, need: [['falafel'], ['tahini', 'yogurt'], ['tomato', 'cucumber', 'arugula', 'parsley'], ['hummus', 'baba', 'tabbouleh']] },
    ] },
};

/* ----- هدوم ----- */
const WK = { head: ['الراس', '🧢'], top: ['فوق', '👕'], layer: ['جاكيت', '🧥'], bottom: ['تحت', '👖'], shoes: ['كوتشي', '👟'], acc: ['إكسسوار', '⌚'] };
const wk = ks => ks.map(k => ({ k, label: WK[k][0], ico: WK[k][1], n: 1 }));
const OUTFITS = {
  full: { name: 'أوت فيت كامل', kinds: wk(['head', 'top', 'layer', 'bottom', 'shoes', 'acc']), recipes: [
    { n: 'لوك رسمي', b: 20, need: [['shirt'], ['suit', 'coat', 'leather'], ['trousers'], ['classicshoes', 'loafer'], ['watch']] },
    { n: 'لوك الملعب', b: 20, need: [['jersey', 'sweat'], ['trackjacket'], ['trackpants', 'sportshorts'], ['runners'], ['headphones', 'headband']] },
    { n: 'لوك الشارع', b: 20, need: [['hoodie', 'graphic'], ['bomber', 'puffer'], ['cargo', 'baggy'], ['rare', 'boots', 'whitesneakers'], ['nycap', 'bandana', 'bucket', 'chain']] },
    { n: 'لوك تراثي', b: 20, need: [['galabeya'], ['bisht'], ['tarboosh', 'keffiyeh'], ['madas'], ['tasbih']] },
    { n: 'كاجوال هادي', b: 15, need: [['tee', 'polo', 'knit'], ['denim', 'cardigan'], ['jeans'], ['whitesneakers'], ['sunglasses', 'backpack']] },
  ] },
  lite: { name: 'أوت فيت خفيف', kinds: wk(['top', 'bottom', 'shoes', 'acc']), recipes: [
    { n: 'خروجة', b: 15, need: [['tee', 'polo', 'shirt'], ['jeans', 'trousers'], ['whitesneakers', 'classicshoes', 'loafer'], ['watch', 'sunglasses']] },
    { n: 'تمرين', b: 15, need: [['jersey', 'sweat', 'tank'], ['trackpants', 'sportshorts'], ['runners'], ['headphones']] },
    { n: 'شارع', b: 15, need: [['hoodie', 'graphic'], ['cargo', 'baggy'], ['rare', 'boots'], ['chain', 'crossbag']] },
  ] },
};

/* ----- كتالوج العناصر ----- */
const ITEMS = { anime: [], sport: [], food: [], wear: [] };
const ITEM_BY_KEY = {};
const HIDDEN = [];
const keyOf = it => it.filler ? 'f:' + it.cat + ':' + it.k : (it.secret ? 'h:' : it.cat + ':') + it.id;
const fillerOf = (cat, k) => ({ id: 'sub-' + k, lid: 'sub', n: 'بديل', t: 'بديل', p: 30, e: '🧍', k, cat, filler: true });
function addItem(it) { (it.secret ? HIDDEN : ITEMS[it.cat]).push(it); ITEM_BY_KEY[keyOf(it)] = it; }
ANIME.forEach(([id, n, t, p, e]) => addItem({ id, lid: id, n, t, p, e, k: 'any', cat: 'anime' }));
ANIME_HIDDEN.forEach(([id, n, t, p, e]) => addItem({ id, lid: id, n, t, p, e, k: 'any', cat: 'anime', secret: true }));
for (const k in SPORT) SPORT[k].forEach(([id, n, t, p]) => addItem({ id, lid: id, n, t, p, e: KIND_EMOJI[k], k, cat: 'sport' }));
for (const d in FOOD) for (const k in FOOD[d]) FOOD[d][k].forEach(([id, n, t, p, e]) => addItem({ id: d + '-' + id, lid: id, n, t, p, e, k, cat: 'food', dish: d }));
for (const k in WEAR) WEAR[k].forEach(([id, n, t, p, e]) => addItem({ id, lid: id, n, t, p, e, k, cat: 'wear' }));
const itemOf = key => ITEM_BY_KEY[key] || (typeof key === 'string' && key.startsWith('f:') ? fillerOf(...key.split(':').slice(1)) : null);

/* ----- درجة الندرة واللون ----- */
const RARITY = [
  { min: 92, name: 'أسطوري', c: '#FFC83D' },
  { min: 85, name: 'ملحمي', c: '#B58CFF' },
  { min: 75, name: 'نادر', c: '#4CC9F0' },
  { min: 0, name: 'عادي', c: '#B9C2CC' },
];
const rarityOf = p => RARITY.find(r => p >= r.min);
const hueOf = s => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.codePointAt(0)) % 360; return h; };

/* ----- المرحلة: اختيار المضيف (sel) بيتحول لمواصفات كاملة ----- */
function normSel(sel) {
  sel = sel || {};
  const cat = CATS[sel.cat] ? sel.cat : 'anime';
  if (cat === 'anime') return { cat, n: Math.max(1, Math.min(6, parseInt(sel.n, 10) || 4)) };
  if (cat === 'sport') return { cat, formation: FORMATIONS[sel.formation] ? sel.formation : '4-3-3' };
  if (cat === 'food') return { cat, dish: DISHES[sel.dish] ? sel.dish : 'burger' };
  return { cat, outfit: OUTFITS[sel.outfit] ? sel.outfit : 'full' };
}
function makeStage(sel0) {
  const sel = normSel(sel0), c = CATS[sel.cat];
  let kinds, label, rows = null, recipes = [], dish = null, ico = c.ico;
  if (sel.cat === 'anime') { kinds = [{ ...c.kinds[0], n: sel.n }]; label = sel.n + (sel.n > 10 ? ' شخصية' : ' شخصيات'); }
  else if (sel.cat === 'sport') {
    rows = FORMATIONS[sel.formation]; const cnt = {}; rows.forEach(([k, n]) => { cnt[k] = (cnt[k] || 0) + n; });
    kinds = c.kinds.map(x => ({ ...x, n: cnt[x.k] || 0 })).filter(x => x.n > 0); label = 'تشكيلة ' + sel.formation;
  } else if (sel.cat === 'food') { const d = DISHES[sel.dish]; dish = sel.dish; kinds = d.kinds.map(x => ({ ...x })); recipes = d.recipes; label = d.name; ico = d.ico; }
  else { const o = OUTFITS[sel.outfit]; kinds = o.kinds.map(x => ({ ...x })); recipes = o.recipes; label = o.name; }
  const slots = {}; kinds.forEach(x => { slots[x.k] = x.n; });
  return { cat: c.id, name: c.name, ico, theme: c.theme, stat: c.stat, hidden: !!c.hidden, combo: c.combo, kinds, slots, total: sumOf(kinds, x => x.n), label, rows, recipes, dish, sel };
}
const poolOf = st => ITEMS[st.cat].filter(i => !st.dish || i.dish === st.dish);
/* أقصى عدد لاعبين تكفيهم العناصر المتاحة (مع واحد احتياطي لكل نوع) */
function maxPlayersFor(sel) {
  const st = makeStage(sel), pool = poolOf(st); let m = 6;
  for (const x of st.kinds) { const have = pool.filter(i => i.k === x.k).length; m = Math.min(m, Math.floor((have - 1) / x.n)); }
  return Math.max(1, Math.min(6, m));
}
/* وصفة متحققة؟ كل مجموعة محتاجة عنصر مختلف من اللي معاك */
function matchRecipe(rc, items) {
  const used = new Set();
  const go = gi => {
    if (gi === rc.need.length) return true;
    for (let i = 0; i < items.length; i++) if (!used.has(i) && rc.need[gi].includes(items[i].lid)) { used.add(i); if (go(gi + 1)) return true; used.delete(i); }
    return false;
  };
  return go(0);
}
/* كام مجموعة من الوصفة اتحققت (لعرض التقدم) */
function recipeProgress(rc, items) {
  let best = 0; const used = new Set();
  const go = (gi, got) => {
    best = Math.max(best, got); if (gi === rc.need.length) return;
    for (let i = 0; i < items.length; i++) if (!used.has(i) && rc.need[gi].includes(items[i].lid)) { used.add(i); go(gi + 1, got + 1); used.delete(i); }
    go(gi + 1, got);
  };
  go(0, 0); return best;
}

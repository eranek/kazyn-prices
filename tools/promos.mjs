// Сбор акций магазинов → promos.json (запускается раз в неделю через GitHub Actions, можно и вручную: node tools/promos.mjs)
// Сейчас: Magnum (каталог скидок magnum.kz, Алматы). Структура файла готова для других магазинов.
import fs from 'node:fs';

// Какие товары считаем нашими продуктами: ключ из ING в приложении → [что должно быть в названии, чего быть не должно]
const RULES = {
  chicken: [/ФИЛЕ.*(ЦЫПЛ|КУР)|(ЦЫПЛ|КУР).*ФИЛЕ/, /БЕДР|ГОЛЕН|КРЫЛ|КОПЧ|ВЕТЧ|КОЛБ|НАГГЕТ|ШНИЦ|ЧЕБУР|ПЕЛЬМ|БУРГЕР|ФАРШ/],
  chthigh: [/БЕДР.*(ЦЫПЛ|КУР)|(ЦЫПЛ|КУР).*БЕДР/, /КОПЧ|ГОЛЕН|С КОСТ|ЧЕБУР/],
  drum: [/ГОЛЕН/, /КОПЧ|ИНДЕЙ/],
  turkey: [/ИНДЕЙ.*ФИЛЕ|ФИЛЕ.*ИНДЕЙ/, /КОПЧ|КОЛБ|ВЕТЧ/],
  liver: [/ПЕЧЕН.*(КУР|ЦЫПЛ)|(КУР|ЦЫПЛ).*ПЕЧЕН/, /ПАШТЕТ|ПЕЧЕНЬЕ/],
  beef: [/ГОВЯД/, /ТУШЕН|ФАРШ|КОЛБ|СОСИС|ЛАПША|ГРУДИНК|КОПЧ|ПЕЛЬМ|БУЛЬОН|ПАШТЕТ|ЧИПС|ВЯЛЕН/],
  mince: [/ФАРШ.*ГОВЯ|ГОВЯ.*ФАРШ/, /ПЕЛЬМ|ЧЕБУР/],
  lamb: [/БАРАН/, /ТУШЕН|КОЛБ|КОПЧ|ШАШЛ/],
  sudak: [/СУДАК/, /КОПЧ|СОЛ|ВЯЛ/],
  hake: [/ХЕК/, /КОПЧ|СОЛ/],
  mackerel: [/СКУМБРИ/, /КОПЧ|СОЛ|ПРЕСЕРВ|КОНС|В МАСЛ/],
  salmon: [/ЛОСОС|СЕМГ|СЁМГ/, /КОПЧ|СОЛ|ИКР|ПРЕСЕРВ|СЛАЙС/],
  shrimp: [/КРЕВЕТ/, /ЧИПС|СНЕК|ЧИПСЫ/],
  tuna: [/ТУНЕЦ/, /В МАСЛ|МАСЛЕ|МАЙДА/],
  egg: [/^ЯЙЦ/, /ПЕРЕПЕЛ|ШОКОЛ|KINDER/],
  milk: [/^МОЛОКО/, /СГУЩ|КОКОС|ОВСЯН|СОЕВ|МИНДАЛ|ШОКОЛ|КАКАО|СУХОЕ|ДЕТСК/],
  kefir: [/^КЕФИР/, /ДЕТСК/],
  ayran: [/^АЙРАН/, /ГАЗ/],
  tvorog5: [/^ТВОРОГ.*\b(0|0,5|1|1,8|2|3|4|5)\s?%/, /СЫРОК|МАССА|ДЕСЕРТ/],
  tvorog: [/^ТВОРОГ/, /СЫРОК|МАССА|ДЕСЕРТ|\b(0|0,5|1|1,8|2|3|4|5)\s?%/],
  gyogurt: [/ГРЕЧЕСК.*ЙОГУРТ|ЙОГУРТ.*ГРЕЧЕСК/, /ПИТЬЕВ/],
  smetana: [/^СМЕТАН/, /СОУС/],
  cheese: [/^СЫР /, /ПЛАВЛ|ТВОРОЖН|СЫРОК|КОСИЧ|ПАЛОЧ|ЧЕЧИЛ|СНЕК|ЧИПС/],
  butter: [/МАСЛО.*(СЛИВОЧН|82)/, /ПОДСОЛН|ОЛИВ|СПРЕД|ШОКОЛ|РАСТИТ/],
  kurt: [/^КУРТ|^ҚҰРТ/, null],
  oil: [/МАСЛО.*ПОДСОЛН/, /ОЛИВ/],
  rice: [/^РИС /, /ХЛОП|ЛАПША|БУМАГ|ЧИПС|ГАЛЕТ|МУКА/],
  buckwheat: [/ГРЕЧ/, /ХЛОП|ЛАПША|МУКА|ХЛЕБ|ГАЛЕТ/],
  bulgur: [/БУЛГУР/, null],
  oats: [/ОВСЯН.*ХЛОП|ХЛОП.*ОВСЯН|^ОВСЯНКА/, /ПЕЧЕНЬЕ|БАТОН|КАША С/],
  millet: [/ПШЕНО/, null],
  barley: [/ПЕРЛОВ/, null],
  peas: [/ГОРОХ/, /ГОРОШЕК|ЗЕЛЕН|МОЛОД|КОНСЕРВ|BONDUELLE|ЧИПС/],
  lentil: [/ЧЕЧЕВ/, /ЧИПС/],
  chickpea: [/^НУТ/, /ЧИПС|ХУМУС/],
  beans: [/ФАСОЛ/, /СТРУЧК|МЛ|КОНСЕРВ|В ТОМАТ/],
  flour: [/^МУКА.*ПШЕН/, null],
  pasta: [/^МАКАРОН|^СПАГЕТТИ|^ПАСТА (?!ТОМАТ)/, /ТОМАТ|ЗУБН|ШОКОЛ|ОРЕХ|АРАХИС/],
  noodles: [/^ЛАПША/, /БЫСТР|ОСТР|МАСТЕР|ДОШИР|РОЛЛТОН|VEGETA|КАН|АЛЬКОНИ|СУП|SAMYANG|HOT|РАМЕН|BIG BON|CHEESE/],
  funchoza: [/ФУНЧОЗ/, null],
  sugar: [/^САХАР/, /ПУДР|ТРОСТ|ВАНИЛ/],
  honey: [/^МЕД |^МЁД /, /ПРЯНИК/],
  tpaste: [/ТОМАТН.*ПАСТ|ПАСТА.*ТОМАТ/, null],
  walnut: [/ГРЕЦК/, null],
  pbutter: [/АРАХИС.*ПАСТ|ПАСТА.*АРАХИС/, /ШОКОЛ/],
  potato: [/^КАРТОФ/, /ФРИ|ЧИПС|ПЮРЕ|ДОЛЬК|ХРУСТ/],
  onion: [/^ЛУК /, /ЖАРЕН|ЧИПС|ПОРОШ/],
  carrot: [/^МОРКОВ/, /КОРЕЙ|СОК/],
  cabbage: [/КАПУСТ.*БЕЛОКОЧ|БЕЛОКОЧ.*КАПУСТ/, /КВАШ|САЛАТ/],
  tomato: [/^ПОМИДОР|^ТОМАТЫ /, /ВЯЛЕН|СУШ|КОНСЕРВ|ЧЕРРИ/],
  cucumber: [/^ОГУРЦ|^ОГУРЕЦ/, /СОЛЕН|МАРИН|КОНСЕРВ/],
  pepper: [/ПЕРЕЦ.*(БОЛГАР|СЛАДК)/, /МОЛОТ|ЧИЛИ/],
  apple: [/^ЯБЛОК/, /СОК|ПЮРЕ|ЧИПС|ДЖЕМ|ПОВИДЛ/],
  banana: [/^БАНАН/, /ЧИПС|ПЮРЕ/],
  berries: [/ЯГОД.*ЗАМОР|ЗАМОР.*ЯГОД/, null],
  fveg: [/СМЕС.*ОВОЩ|ОВОЩН.*СМЕС/, null],
  broccoli: [/БРОККОЛИ/, null],
  cauli: [/ЦВЕТН.*КАПУСТ/, null],
};

// количество в упаковке → в единицах приложения (г, мл, шт); «КГ» без числа — цена за килограмм
function parseQty(name) {
  const n = name.toUpperCase().replace(/,/g, '.');
  const pc = n.match(/(\d+)\s*ШТ/);
  const m = [...n.matchAll(/(\d+(?:\.\d+)?)\s*(КГ|ГР|Г|МЛ|Л)(?![А-ЯA-Z])/g)].pop();
  if (m) {
    const v = parseFloat(m[1]), u = m[2];
    return { g: u === 'КГ' || u === 'Л' ? v * 1000 : v, pc: pc ? +pc[1] : null, perKg: false };
  }
  if (/(^|[^А-ЯA-Z])КГ($|[^А-ЯA-Z])/.test(n)) return { g: 1000, pc: null, perKg: true };   // \b не работает с кириллицей
  if (pc) return { g: null, pc: +pc[1], perKg: false };
  return null;
}

async function magnum() {
  // тот же открытый API, из которого сайт magnum.kz показывает каталог скидок
  const res = await fetch('https://magnum.kz:1337/api/new-product?cunt=500&city=almaty', { headers: { 'User-Agent': 'Mozilla/5.0 (KazynMenu promos bot)', Accept: 'application/json' } });
  if (!res.ok) throw new Error('magnum ' + res.status);
  const state = await res.json();
  const items = [];
  const walk = o => {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) return o.forEach(walk);
    if ('final_price' in o && 'name' in o) items.push(o);
    Object.values(o).forEach(walk);
  };
  walk(state);
  return [...new Map(items.map(p => [p.id, p])).values()].map(p => ({
    name: String(p.name).trim(), old: p.start_price || null, price: p.final_price,
    discount: p.discount ? Math.round(p.discount * 100) : (p.start_price ? Math.round((1 - p.final_price / p.start_price) * 100) : 0),
    from: p.action_start, until: p.action_end,
  }));
}

function match(products) {
  const out = {};
  for (const p of products) {
    if (!p.price || !p.old || p.old <= p.price) continue;   // только настоящие скидки
    const N = p.name.toUpperCase();
    for (const [key, [yes, no]] of Object.entries(RULES)) {
      if (!yes.test(N) || (no && no.test(N))) continue;
      const q = parseQty(p.name);
      if (!q) break;
      (out[key] = out[key] || []).push({ ...p, qty: q.pc && key === 'egg' ? q.pc : q.g, unit: key === 'egg' ? 'pc' : 'g', perKg: q.perKg });
      break;
    }
  }
  return out;
}

const result = { updated: new Date().toISOString().slice(0, 10), city: 'almaty', stores: {} };
try {
  const items = await magnum();
  result.stores.magnum = { source: 'magnum.kz/catalog', total: items.length, match: match(items) };
  console.log('magnum:', items.length, 'товаров со скидкой, совпало продуктов:', Object.keys(result.stores.magnum.match).length);
} catch (e) {
  console.error('magnum: ошибка', e.message);
}
const file = new URL('../promos.json', import.meta.url);
fs.writeFileSync(file, JSON.stringify(result, null, 1));
console.log('saved', file.pathname);

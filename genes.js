// Генетика Зёрнышка: профиль родителя (врождённое отдельно от приобретённого) → расклад генов ребёнка.
// Каждая строка расклада — { v, p, why, fixed }. fixed — зафиксировано (лор или правка руками), кубик её не трогает.

import { ADULT } from './data.js';

const R = () => Math.random();
const pick = (arr) => arr[Math.floor(R() * arr.length)];
function weighted(pairs) {
    const sum = pairs.reduce((a, [, w]) => a + Math.max(0, w), 0) || 1;
    let x = R() * sum;
    for (const [v, w] of pairs) { x -= Math.max(0, w); if (x <= 0) return v; }
    return pairs[pairs.length - 1][0];
}
function gauss() { let u = 0, v = 0; while (!u) u = R(); while (!v) v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pc = (x) => `${Math.round(x * 100)}%`;
const low = (s) => String(s || '').toLowerCase();

// ───────────── профиль родителя ─────────────

export const EYES = ['карие', 'ореховые', 'зелёные', 'серые', 'серо-голубые', 'голубые'];
export const HAIR = ['чёрные', 'тёмно-каштановые', 'каштановые', 'русые', 'светлые', 'рыжие'];
export const TEXTURE = ['прямые', 'волнистые', 'кудрявые'];
export const SKIN = ['очень светлая', 'светлая', 'оливковая', 'смуглая', 'тёмная'];
export const BUILD = ['хрупкое', 'худощавое', 'среднее', 'атлетичное', 'крупное'];
export const TEMP = [
    ['activity', 'Активность', 'спокойная', 'непоседа'],
    ['rhythm', 'Режим', 'как придётся', 'по часам'],
    ['approach', 'К новому', 'осторожничает', 'тянется'],
    ['adapt', 'Привыкает', 'долго', 'быстро'],
    ['intensity', 'Реакции', 'тихие', 'бурные'],
    ['mood', 'Настрой', 'хмурый', 'солнечный'],
    ['persist', 'Упорство', 'бросает', 'не отступит'],
    ['sense', 'Чувствительность', 'толстокожая', 'тонкокожая'],
];
export const TALENTS = ['инженерия и техника', 'математика', 'естественные науки', 'языки', 'музыка', 'рисование', 'спорт и тело', 'люди и манипуляции', 'стратегия', 'память'];
export const POWER_KINDS = { mutant: 'мутация (X-ген)', serum: 'сыворотка', stones: 'энергия Камней', tech: 'техника', other: 'другое' };

export function blankProfile(name = '', sex = 'F') {
    return {
        name, sex, age: 0, eyes: '', hair: '', texture: '', skin: '', height: sex === 'M' ? 178 : 165, build: 'среднее', blood: '', iq: 100,
        talents: [], temp: Object.fromEntries(TEMP.map(([k]) => [k, 3])),
        features: [], risks: [], powers: [], acquired: [], family: '', notes: '', analyzed: 0,
    };
}

export const ANALYZE_SYSTEM = `Ты — врач-генетик и знаток лора. По описанию персонажа составь его генетический профиль: что он может передать ребёнку.
Строго разделяй врождённое и приобретённое. Приобретённое НЕ наследуется: крашеные волосы или волосы, побелевшие от травмы, силы или облучения; шрамы, протезы, татуировки; навыки и выучка; последствия пыток и экспериментов. Натуральный цвет волос пиши такой, какой был от рождения (из лора или по описанию, а если есть актёр-прообраз — по нему).
Силы: мутация (X-ген) наследуется; сыворотка суперсолдата меняет тело — пиши её kind:"serum"; энергия, впитанная извне (Камни Бесконечности и т.п.), — kind:"stones", это не ген, но во время беременности она действует на плод.
age — возраст сейчас, в настоящем истории (число). iq — оценка числом (100 — средний человек; гений уровня Старка — 170+). temp — врождённый темперамент 1–5 (каким он был бы без травм): activity активность, rhythm режим, approach тянется к новому, adapt привыкает, intensity бурность реакций, mood фон настроения, persist упорство, sense чувствительность.
features — врождённые особенности внешности и тела: «ямочка на подбородке», «ямочки на щеках», «веснушки», «левша», «близорукость», «аллергия», «абсолютный слух» и т.п. risks — то, к чему есть наследственная предрасположенность (зависимости в семье, депрессия, мигрени, давление и т.п.), коротко. family — что известно о его родителях и роде, что может проявиться у внуков (цвет глаз родителей, способности, болезни).
Если чего-то правда нельзя понять — оставь пустым. Все значения по-русски.
Только JSON без пояснений:
{"sex":"F|M","age":30,"eyes":"карие|ореховые|зелёные|серые|серо-голубые|голубые","hair":"чёрные|тёмно-каштановые|каштановые|русые|светлые|рыжие","texture":"прямые|волнистые|кудрявые","skin":"очень светлая|светлая|оливковая|смуглая|тёмная","height":170,"build":"хрупкое|худощавое|среднее|атлетичное|крупное","blood":"A+|O-|…|","iq":100,"talents":["инженерия и техника|математика|естественные науки|языки|музыка|рисование|спорт и тело|люди и манипуляции|стратегия|память"],"temp":{"activity":3,"rhythm":3,"approach":3,"adapt":3,"intensity":3,"mood":3,"persist":3,"sense":3},"features":[],"risks":[],"powers":[{"name":"как называется","kind":"mutant|serum|stones|tech|other","family":"energy|kinetic|luck|tech|mind|body|elemental|other","level":1,"note":"коротко"}],"acquired":["что у него приобретённое и потому НЕ передастся"],"family":"","notes":"одна-две фразы: что из лора важно для беременности и родов (рубцы, травмы, болезни) — только факты лора, без выдуманных диагнозов и страшилок; если в лоре что-то защищает беременность, так и пиши"}`;

export function analyzeInput(name, text, extra) {
    return `Персонаж: ${name}\n\n${String(text || '').slice(0, 9000)}${extra ? `\n\nДополнительно от автора (это важнее всего): ${extra}` : ''}`;
}

export function normalizeProfile(j, base) {
    const p = { ...blankProfile(base?.name, base?.sex), ...(base || {}) };
    const str = (v) => (typeof v === 'string' ? v.trim() : '');
    const one = (v, list) => { const s = low(str(v)); return list.find(x => low(x) === s) || list.find(x => s && low(x).startsWith(s.slice(0, 4))) || ''; };
    if (!j || typeof j !== 'object') return p;
    if (j.sex === 'M' || j.sex === 'F') p.sex = j.sex;
    p.eyes = one(j.eyes, EYES) || p.eyes;
    p.hair = one(j.hair, HAIR) || p.hair;
    p.texture = one(j.texture, TEXTURE) || p.texture;
    p.skin = one(j.skin, SKIN) || p.skin;
    p.build = one(j.build, BUILD) || p.build;
    if (Number(j.age) > 10 && Number(j.age) < 200) p.age = Math.round(Number(j.age));
    if (Number(j.height) > 100 && Number(j.height) < 250) p.height = Math.round(Number(j.height));
    if (/^(A|B|AB|O|0)[+-]$/i.test(str(j.blood))) p.blood = str(j.blood).toUpperCase().replace('0', 'O');
    if (Number(j.iq) >= 50 && Number(j.iq) <= 250) p.iq = Math.round(Number(j.iq));
    if (Array.isArray(j.talents)) p.talents = j.talents.map(str).filter(t => TALENTS.includes(t)).slice(0, 5);
    if (j.temp && typeof j.temp === 'object') for (const [k] of TEMP) if (Number(j.temp[k]) >= 1 && Number(j.temp[k]) <= 5) p.temp[k] = Math.round(Number(j.temp[k]));
    for (const k of ['features', 'risks', 'acquired']) if (Array.isArray(j[k])) p[k] = j[k].map(str).filter(Boolean).slice(0, 10);
    if (Array.isArray(j.powers)) p.powers = j.powers.filter(x => str(x?.name)).slice(0, 6).map(x => ({
        name: str(x.name).slice(0, 60), kind: POWER_KINDS[x.kind] ? x.kind : 'other', family: str(x.family) || 'other',
        level: clamp(Math.round(Number(x.level) || 2), 1, 5), note: str(x.note).slice(0, 160),
    }));
    if (str(j.family)) p.family = str(j.family).slice(0, 400);
    if (str(j.notes)) p.notes = str(j.notes).slice(0, 400);
    p.analyzed = Date.now();
    return p;
}

const hasFeat = (p, re) => (p?.features || []).some(f => re.test(low(f)));
const hasRisk = (p, re) => (p?.risks || []).some(f => re.test(low(f)));
const powersOf = (p, kind) => (p?.powers || []).filter(x => x.kind === kind);
export const isMutant = (p) => powersOf(p, 'mutant').length > 0;
export const hasSerum = (p) => powersOf(p, 'serum').length > 0;
export const hasStones = (p) => powersOf(p, 'stones').length > 0 || /камн|stone/i.test((p?.powers || []).map(x => x.name).join(' '));

// ───────────── отдельные признаки ─────────────

const EYE_GROUP = (e) => /кар/.test(e) ? 'brown' : /орех|зел/.test(e) ? 'green' : e ? 'blue' : '';
const EYE_TABLE = {
    'brown|brown': [['brown', 75], ['green', 19], ['blue', 6]],
    'brown|green': [['brown', 50], ['green', 38], ['blue', 12]],
    'blue|brown': [['brown', 50], ['blue', 50]],
    'green|green': [['green', 75], ['blue', 24], ['brown', 1]],
    'blue|green': [['green', 50], ['blue', 50]],
    'blue|blue': [['blue', 99], ['green', 1]],
};
function rollEyes(m, f) {
    const a = EYE_GROUP(m.eyes) || 'brown', b = EYE_GROUP(f.eyes) || 'brown';
    const table = EYE_TABLE[[a, b].sort().join('|')];
    const g = weighted(table);
    const shade = g === 'brown' ? weighted([['карие', 3], ['тёмно-карие', 1], ['ореховые', 1]])
        : g === 'green' ? weighted([['зелёные', 2], ['ореховые', 1], ['серо-зелёные', 1]])
            : weighted([['голубые', 2], ['серо-голубые', 2], ['серые', 1]].map(([v, w]) => [v, w + ([m.eyes, f.eyes].includes(v) ? 3 : 0)]));
    const p = table.find(x => x[0] === g)?.[1] || 0;
    return { v: shade, p: `${p}%`, why: `${m.eyes || '?'} × ${f.eyes || '?'}`, baby: g === 'brown' ? 'при рождении тёмно-серые, карие станут к 6–12 месяцам' : g === 'green' ? 'при рождении серо-голубые, зелень проступит к году' : 'голубые с рождения, к году могут посереть' };
}

const HAIR_GROUP = (h) => /рыж/.test(h) ? 'red' : /светл|рус/.test(h) ? 'light' : h ? 'dark' : '';
function rollHair(m, f) {
    const a = HAIR_GROUP(m.hair) || 'dark', b = HAIR_GROUP(f.hair) || 'dark';
    const redFam = /рыж/.test(low(m.family + f.family)) ? 6 : 0;
    const table = a === 'dark' && b === 'dark' ? [['dark', 82], ['light', 14], ['red', 4 + redFam]]
        : (a === 'dark') !== (b === 'dark') && a !== 'red' && b !== 'red' ? [['dark', 55], ['light', 40], ['red', 5 + redFam]]
            : a === 'light' && b === 'light' ? [['light', 88], ['dark', 6], ['red', 6 + redFam]]
                : a === 'red' && b === 'red' ? [['red', 95], ['light', 5]]
                    : [['red', 30], ['dark', 40], ['light', 30]];
    const g = weighted(table);
    const shades = { dark: ['чёрные', 'тёмно-каштановые', 'каштановые'], light: ['русые', 'светлые', 'светло-русые'], red: ['рыжие', 'медные', 'рыжевато-каштановые'] }[g];
    const v = weighted(shades.map(s => [s, 1 + ([m.hair, f.hair].includes(s) ? 2 : 0)]));
    const p = table.find(x => x[0] === g)?.[1] || 0;
    return { v, p: `${p}%`, why: `${m.hair || '?'} × ${f.hair || '?'}`, baby: g === 'dark' ? 'родится с тёмным пушком, в полгода может посветлеть и снова потемнеть' : 'светлый пушок, к трём годам потемнеет на тон-два' };
}

function rollTexture(m, f) {
    const s = (t) => /кудр/.test(t) ? 2 : /волн/.test(t) ? 1 : 0;
    const avg = (s(m.texture) + s(f.texture)) / 2;
    const v = weighted([['прямые', avg < 0.5 ? 85 : avg < 1.2 ? 40 : 10], ['волнистые', avg < 0.5 ? 13 : 45, ], ['кудрявые', avg < 0.5 ? 2 : avg < 1.2 ? 15 : 55]]);
    return { v, why: `${m.texture || '?'} × ${f.texture || '?'}` };
}

function rollSkin(m, f) {
    const i = (x) => Math.max(0, SKIN.indexOf(x));
    const mid = (i(m.skin || 'светлая') + i(f.skin || 'светлая')) / 2;
    const v = SKIN[clamp(Math.round(mid + gauss() * 0.45), 0, SKIN.length - 1)];
    return { v, why: `между ${m.skin || '?'} и ${f.skin || '?'}` };
}

function rollFeature(m, f, re, base, one, both) {
    const n = (hasFeat(m, re) ? 1 : 0) + (hasFeat(f, re) ? 1 : 0);
    const p = n === 2 ? both : n === 1 ? one : base;
    return { v: R() < p, p: pc(p), why: n ? `у ${n === 2 ? 'обоих' : hasFeat(m, re) ? 'мамы' : 'папы'}` : 'у родителей нет' };
}

// ───────────── группа крови ─────────────
const P_ALLELE = { A: 0.25, B: 0.08, O: 0.67 };
function abo(type) {
    const t = String(type || '').replace(/[+-]/, '').toUpperCase();
    if (t === 'O') return 'OO';
    if (t === 'AB') return 'AB';
    if (t === 'A' || t === 'B') { const a = P_ALLELE[t] ** 2, ao = 2 * P_ALLELE[t] * P_ALLELE.O; return R() < a / (a + ao) ? t + t : t + 'O'; }
    return weighted([['A', 0.40], ['O', 0.45], ['B', 0.11], ['AB', 0.04]]).replace(/^(A|B|O|AB)$/, (x) => abo(x));
}
function rh(sign) {
    if (sign === '-') return 'dd';
    if (sign === '+') return R() < 0.613 ** 2 / 0.85 ? 'DD' : 'Dd';
    return R() < 0.15 ? 'dd' : rh('+');
}
const phenoABO = (g) => { const s = g.split('').sort().join(''); return s === 'AB' ? 'AB' : s.includes('A') ? 'A' : s.includes('B') ? 'B' : 'O'; };
const phenoRh = (g) => (g.includes('D') ? '+' : '-');
/** Группа крови родителя: если неизвестна — бросаем по частотам и запоминаем (становится каноном). */
export function parentBlood(p) {
    if (!p.bloodGeno) {
        const sign = (p.blood || '').match(/[+-]/)?.[0] || '';
        const g1 = abo(p.blood || ''), g2 = rh(sign);
        p.bloodGeno = `${g1} ${g2}`;
        if (!p.blood) { p.blood = `${phenoABO(g1)}${phenoRh(g2)}`; p.bloodRolled = true; }
    }
    return p.bloodGeno;
}
function rollBlood(m, f) {
    const [ma, mr] = parentBlood(m).split(' '), [fa, fr] = parentBlood(f).split(' ');
    const a = pick(ma.split('')) + pick(fa.split('')), r = pick(mr.split('')) + pick(fr.split(''));
    const v = `${phenoABO(a)}${phenoRh(r)}`;
    const conflict = m.blood?.endsWith('-') && v.endsWith('+');
    return { v, geno: `${a} ${r}`, why: `${m.blood} × ${f.blood}${m.bloodRolled || f.bloodRolled ? ' (у кого не было в лоре — выпало кубиком)' : ''}`, conflict };
}

// ───────────── рост, ум, таланты, темперамент ─────────────

function rollHeight(m, f, sex) {
    const mid = (Number(f.height || 178) + Number(m.height || 165) + (sex === 'M' ? 13 : -13)) / 2;
    const v = Math.round(mid + gauss() * 6);
    const [mean, sd] = ADULT[sex === 'M' ? 'M' : 'F'];
    return { v, z: +((v - mean) / sd).toFixed(2), p: `${Math.round(mid)} ± 6 см`, why: 'среднее родителей ±13 см на пол' };
}

export const IQ_TIER = (v) => v < 85 ? 'ниже среднего' : v < 115 ? 'средний' : v < 130 ? 'выше среднего' : v < 145 ? 'одарённый' : v < 160 ? 'очень одарённый' : 'гений';
function rollIQ(m, f) {
    const mid = (Number(m.iq || 100) + Number(f.iq || 100)) / 2;
    const exp = 100 + 0.55 * (mid - 100);
    const v = Math.round(exp + gauss() * 12);
    return { v, p: `ожидаемо ≈ ${Math.round(exp)} ± 12`, why: 'у очень умных родителей дети в среднем ближе к середине — так и в жизни' };
}

function rollTalents(m, f) {
    const out = [];
    for (const t of TALENTS) {
        const n = (m.talents || []).includes(t) + (f.talents || []).includes(t);
        const p = n === 2 ? 0.55 : n === 1 ? 0.32 : 0.06;
        if (R() < p) out.push(t);
    }
    return { v: out.slice(0, 4), why: 'по склонностям родителей' };
}

function rollTemp(m, f) {
    const v = {};
    for (const [k] of TEMP) {
        const pm = Number(m.temp?.[k] || 3), pf = Number(f.temp?.[k] || 3);
        v[k] = clamp(Math.round(((pm + pf) / 2) * 0.45 + 3 * 0.55 + gauss() * 0.9), 1, 5);
    }
    return { v, type: tempType(v), why: 'темперамент наследуется примерно наполовину' };
}
export function tempType(t) {
    const easy = [t.rhythm >= 3, t.approach >= 3, t.adapt >= 3, t.intensity <= 3, t.mood >= 3].filter(Boolean).length;
    const hard = [t.rhythm <= 2, t.approach <= 2, t.adapt <= 2, t.intensity >= 4, t.mood <= 2].filter(Boolean).length;
    if (hard >= 3) return { k: 'difficult', name: 'Трудный', d: 'режим не держит, к новому в штыки, плачет громко и долго — но это и характер с огнём' };
    if (t.approach <= 2 && t.adapt <= 2 && t.intensity <= 3) return { k: 'slow', name: 'Долго привыкает', d: 'сначала смотрит и прячется за маму, освоившись — открытая и тёплая' };
    if (easy >= 4) return { k: 'easy', name: 'Лёгкий', d: 'режим сам складывается, улыбчивая, быстро привыкает к новому' };
    return { k: 'mixed', name: 'Смешанный', d: 'в чём-то лёгкая, в чём-то с характером' };
}

// ───────────── особенности и предрасположенности ─────────────

function rollSpecial(m, f, iq) {
    const out = [];
    const add = (p, t) => { if (R() < p) out.push(t); };
    add(0.012, 'гетерохромия — глаза разного цвета');
    add(hasFeat(m, /абсол|слух/) || hasFeat(f, /абсол|слух/) || (m.talents || []).concat(f.talents || []).includes('музыка') ? 0.05 : 0.006, 'абсолютный слух');
    add(0.035, 'синестезия — видит звуки цветом');
    add(iq >= 145 ? 0.1 : 0.01, 'почти фотографическая память');
    add(0.4, weighted([['пятно «клюв аиста» на затылке — побледнеет к году', 3], ['родинка над губой', 1], ['родимое пятно на плече', 1], ['родинка за ухом', 1]]));
    const atopy = hasFeat(m, /аллерг|астм|экзем/) + hasFeat(f, /аллерг|астм|экзем/);
    add(atopy === 2 ? 0.55 : atopy ? 0.32 : 0.12, 'склонность к аллергии');
    const myo = hasFeat(m, /близор/) + hasFeat(f, /близор/);
    add(myo === 2 ? 0.45 : myo ? 0.25 : 0.1, 'близорукость к школе');
    return { v: out, why: 'редкие штуки кидаются отдельно' };
}

function rollRisks(m, f) {
    const out = [];
    const both = (re) => (hasRisk(m, re) ? 1 : 0) + (hasRisk(f, re) ? 1 : 0);
    const lvl = (n, gp = false) => (n >= 2 || (n && gp) ? 'высокая' : n ? 'повышена' : '');
    const add = (n, t, gp) => { const l = lvl(n, gp); if (l) out.push(`${t}: ${l}`); };
    add(both(/алког|зависим|наркот|аддикц/), 'зависимости', /алког|зависим/.test(low(m.family + f.family)));
    add(both(/депрес|тревож|птср|ptsd/), 'тревожность и депрессия');
    add(both(/мигрен/), 'мигрени');
    add(both(/давлен|гиперт|сердц/), 'давление и сердце');
    if (R() < 0.08) out.push('СДВГ: обычная вероятность выпала');
    return { v: out, why: 'это не судьба, а склонность; всплывёт ближе к подростковому возрасту, если вообще' };
}

// ───────────── силы ─────────────

const FAMILY = {
    energy: { name: 'энергия', vars: ['впитывает и перенаправляет энергию — как мама', 'превращает тепло в свет', 'впитывает электричество и отдаёт разрядом', 'гасит и копит кинетическую энергию удара'] },
    kinetic: { name: 'телекинез', vars: ['двигает предметы взглядом', 'держит падающее в воздухе', 'отталкивает невидимой волной'] },
    luck: { name: 'вероятность', vars: ['удача: всё падает, ломается и случается в её пользу', 'чувствует, что сейчас произойдёт', 'сбивает чужую удачу, когда злится'] },
    tech: { name: 'технопатия', vars: ['электроника слушается её', 'чувствует ток и сигналы в проводах', 'разбирает и понимает любой механизм с одного взгляда'] },
    mind: { name: 'разум', vars: ['чувствует чужие эмоции', 'внушает спокойствие', 'видит обрывки чужих мыслей'] },
    body: { name: 'тело', vars: ['регенерация', 'сверхсила', 'меняет плотность тела'] },
    elemental: { name: 'стихия', vars: ['вода и лёд', 'тепло и огонь', 'воздух и ветер'] },
    other: { name: 'новое', vars: ['то, чего не было ни у кого в роду'] },
};
export const POWER_FAMILIES = FAMILY;

function rollX(m, f) {
    const n = isMutant(m) + isMutant(f);
    const p = n === 2 ? 0.75 : n === 1 ? 0.5 : 0.002;
    return { v: R() < p, p: pc(p), why: n ? `X-ген у ${n === 2 ? 'обоих' : isMutant(m) ? 'мамы' : 'папы'}, наследуется доминантно` : 'у родителей нет' };
}

function rollPower(m, f) {
    const parental = [...powersOf(m, 'mutant'), ...powersOf(f, 'mutant')];
    const gp = /удач|вероятн|luck/.test(low(m.family + f.family)) ? 'luck' : '';
    const par = parental[0]?.family && FAMILY[parental[0].family] ? parental[0].family : 'energy';
    const fam = weighted([[par, 45], [gp || 'kinetic', gp ? 15 : 8], ['kinetic', 12], ['tech', 8], ['mind', 6], ['other', 14]]);
    const top = Math.max(1, ...parental.map(x => x.level || 2));
    const level = clamp(Math.round(top - 1 + R() * 2.2), 1, 5);
    const early = R() < (level >= 4 ? 0.25 : 0.12);
    return {
        v: { family: fam, name: pick(FAMILY[fam].vars), level, early, echo: R() < (level >= 3 ? 0.65 : 0.3) },
        why: fam === par ? 'то же, что у родителя' : fam === gp ? 'через поколение — от бабушки или дедушки' : 'своё, новое',
    };
}

export const SERUM = [
    ['immune', 'Железный иммунитет', 'почти не болеет, а если болеет — вдвое быстрее и легче', 0.85],
    ['heal', 'Быстрое заживление', 'ссадины затягиваются за часы', 0.55],
    ['meta', 'Ускоренный обмен', 'ест за двоих, тёплая на ощупь, растёт быстро', 0.6],
    ['strong', 'Сила не по возрасту', 'хватка как у взрослого, рано держит голову', 0.35],
    ['senses', 'Острые чувства', 'просыпается от шёпота за стеной', 0.35],
    ['stamina', 'Выносливость', 'мало спит и не устаёт', 0.45],
    ['aging', 'Медленное старение', 'взрослеть будет как все, а стареть позже', 0.3],
];
function rollSerum(m, f) {
    const n = hasSerum(m) + hasSerum(f);
    if (!n) return { v: [], why: 'сывороток у родителей нет' };
    const k = n === 2 ? 1.2 : 1;
    return { v: SERUM.filter(([, , , p]) => R() < Math.min(0.95, p * k)).map(([id]) => id), why: `сыворотка у ${n === 2 ? 'обоих' : hasSerum(m) ? 'мамы' : 'папы'} переписала часть генов` };
}

export const STONES = [
    ['streak', 'Белая прядь', 'седая прядь с рождения — как у мамы', 0.5],
    ['glow', 'Свечение глаз', 'при сильных чувствах в глазах вспыхивает цвет Камней', 0.25],
    ['resist', 'Устойчивость к энергии', 'ток и излучение ей почти не вредят', 0.4],
    ['soothe', 'Гасит мамину боль', 'когда малыш на руках, у мамы стихает боль от Камней', 0.3],
];
function rollStones(m) {
    if (!hasStones(m)) return { v: [], why: 'внутриутробно энергии Камней не было' };
    return { v: STONES.filter(([, , , p]) => R() < p).map(([id]) => id), why: 'не ген — след энергии, в которой рос плод' };
}

// ───────────── расклад целиком ─────────────

export const ROWS = [
    ['sex', 'Пол', 'base'], ['eyes', 'Глаза', 'look'], ['hair', 'Волосы', 'look'], ['texture', 'Тип волос', 'look'], ['skin', 'Кожа', 'look'],
    ['chin', 'Ямочка на подбородке', 'look'], ['dimples', 'Ямочки на щеках', 'look'], ['freckles', 'Веснушки', 'look'], ['hand', 'Левша', 'look'],
    ['blood', 'Группа крови', 'body'], ['height', 'Рост взрослой', 'body'], ['iq', 'Интеллект', 'mind'], ['talents', 'Таланты', 'mind'],
    ['temp', 'Темперамент', 'mind'], ['special', 'Особенности', 'extra'], ['risks', 'Предрасположенности', 'extra'],
    ['xgene', 'X-ген', 'power'], ['power', 'Способность', 'power'], ['serum', 'От сыворотки', 'power'], ['stones', 'След Камней', 'power'],
];
export const GROUPS = { base: 'Основа', look: 'Внешность', body: 'Тело', mind: 'Ум и характер', extra: 'Особенности', power: 'Силы' };

export function rollRow(id, kid, m, f) {
    const g = kid.genes || {};
    const sex = g.sex?.v || 'F';
    switch (id) {
        case 'sex': return { v: R() < 0.512 ? 'M' : 'F', p: '51 : 49', why: 'как у людей' };
        case 'eyes': return rollEyes(m, f);
        case 'hair': return rollHair(m, f);
        case 'texture': return rollTexture(m, f);
        case 'skin': return rollSkin(m, f);
        case 'chin': return rollFeature(m, f, /подбород/, 0.05, 0.5, 0.75);
        case 'dimples': return rollFeature(m, f, /ямочки на щ|ямочки$/, 0.1, 0.5, 0.75);
        case 'freckles': return rollFeature(m, f, /веснуш/, 0.08, 0.4, 0.7);
        case 'hand': return rollFeature(m, f, /левш/, 0.1, 0.2, 0.26);
        case 'blood': return rollBlood(m, f);
        case 'height': return rollHeight(m, f, sex);
        case 'iq': return rollIQ(m, f);
        case 'talents': return rollTalents(m, f);
        case 'temp': return rollTemp(m, f);
        case 'special': return rollSpecial(m, f, Number(g.iq?.v || 100));
        case 'risks': return rollRisks(m, f);
        case 'xgene': return rollX(m, f);
        case 'power': return g.xgene?.v ? rollPower(m, f) : { v: null, why: 'без X-гена' };
        case 'serum': return rollSerum(m, f);
        case 'stones': return rollStones(m);
        default: return { v: null };
    }
}

/** Бросить всё, что не зафиксировано. */
export function rollAll(kid, m, f) {
    kid.genes = kid.genes || {};
    for (const [id] of ROWS) {
        if (kid.genes[id]?.fixed) continue;
        kid.genes[id] = { ...rollRow(id, kid, m, f), at: Date.now() };
    }
    // способность зависит от X-гена: зафиксировали X, но способность не бросали
    if (kid.genes.xgene?.v && !kid.genes.power?.v && !kid.genes.power?.fixed) kid.genes.power = { ...rollRow('power', kid, m, f), at: Date.now() };
    if (!kid.genes.xgene?.v && !kid.genes.power?.fixed) kid.genes.power = { v: null, why: 'без X-гена' };
    return kid.genes;
}

/** Зафиксированное лором для первого ребёнка Хеди и Баки. */
export function loreFixed(kid, m) {
    return {
        sex: { v: 'F', fixed: true, why: 'лор: девочка' },
        iq: { v: Math.max(Number(m?.iq) || 170, 160), fixed: true, why: 'лор: интеллект Хеди' },
        xgene: { v: true, fixed: true, why: 'лор: X-ген от мамы' },
    };
}
export const isHedyBucky = (mName, fName) => /хеди|hedy|ядвиг|ясе|яся/i.test(mName || '') && /баки|bucky|барнс|barnes/i.test(fName || '');

// ───────────── что из этого видно ─────────────

const EN = {
    'карие': 'brown', 'тёмно-карие': 'dark brown', 'ореховые': 'hazel', 'зелёные': 'green', 'серо-зелёные': 'grey-green', 'серые': 'grey', 'серо-голубые': 'grey-blue', 'голубые': 'blue',
    'чёрные': 'black', 'тёмно-каштановые': 'dark brown', 'каштановые': 'chestnut brown', 'русые': 'light brown', 'светлые': 'blond', 'светло-русые': 'ash blond', 'рыжие': 'red', 'медные': 'copper', 'рыжевато-каштановые': 'auburn',
    'очень светлая': 'very fair', 'светлая': 'fair', 'оливковая': 'olive', 'смуглая': 'tan', 'тёмная': 'dark',
    'прямые': 'straight', 'волнистые': 'wavy', 'кудрявые': 'curly',
};
const en = (v) => EN[v] || v || '';

/** Внешность по возрасту — английская строка для генератора картинок. */
export function lookEn(kid, months) {
    const g = kid.genes || {};
    const sex = g.sex?.v === 'M' ? 'boy' : 'girl';
    const age = months == null ? 'unborn' : months < 1 ? 'newborn' : months < 12 ? `${Math.max(1, Math.round(months))}-month-old baby` : `${Math.round(months / 12 * 10) / 10}-year-old toddler`;
    const finalEyes = en(g.eyes?.v);
    const eyes = months != null && months < 8 && /brown|hazel|green/.test(finalEyes) ? `dark slate-grey eyes (turning ${finalEyes})` : `${finalEyes} eyes`;
    const hair = months != null && months < 4 ? `soft fine ${en(g.hair?.v)} baby fuzz` : months != null && months < 18 ? `thin ${en(g.texture?.v)} ${en(g.hair?.v)} baby hair` : `${en(g.texture?.v)} ${en(g.hair?.v)} hair`;
    const bits = [`${age} ${sex}`, `${en(g.skin?.v)} skin`, hair, eyes];
    if (g.chin?.v) bits.push('a small cleft chin');
    if (g.dimples?.v) bits.push('cheek dimples');
    if (g.freckles?.v && (months ?? 0) > 24) bits.push('light freckles');
    if ((g.stones?.v || []).includes('streak')) bits.push('one striking white streak in the hair');
    if ((g.special?.v || []).some(x => /гетерохром/.test(x))) bits.push('heterochromia — each eye a different colour');
    if ((g.serum?.v || []).includes('meta')) bits.push('rosy, chubby and robust');
    return bits.join(', ');
}

/** Лицо для 3D-УЗИ (без цвета — снимок в сепии). */
export function faceEn(kid) {
    const g = kid.genes || {};
    const out = ['full cheeks'];
    if (g.chin?.v) out.push('a tiny cleft in the chin');
    if (g.dimples?.v) out.push('dimple-like creases in the cheeks');
    return out.join(', ');
}

/** Коротко по-русски — для заметки модели и карточки. */
export function summaryRu(kid, { powers = true } = {}) {
    const g = kid.genes || {};
    const parts = [];
    if (g.eyes?.v) parts.push(`глаза ${g.eyes.v}`);
    if (g.hair?.v) parts.push(`волосы ${g.hair.v}${g.texture?.v && g.texture.v !== 'прямые' ? `, ${g.texture.v}` : ''}`);
    if (g.chin?.v) parts.push('ямочка на подбородке');
    if (g.dimples?.v) parts.push('ямочки на щеках');
    if ((g.stones?.v || []).includes('streak')) parts.push('белая прядь');
    if (g.temp?.type?.name) parts.push(`темперамент: ${g.temp.type.name.toLowerCase()}`);
    if (powers && g.serum?.v?.length) parts.push(`от сыворотки: ${g.serum.v.map(id => SERUM.find(x => x[0] === id)?.[1].toLowerCase()).filter(Boolean).join(', ')}`);
    return parts.join('; ');
}

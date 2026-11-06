// Движок Зёрнышка: время истории (Horae через Life), срок (дата зачатия из Reproductive), симптомы, тяга, план, осложнения,
// роды, потребности малыша, привязанность, болезни, прививки, вехи, проявления сил. Всё хранится в метаданных чата.

import { WEEKS, weekInfo, SYMPTOMS, movesNow, CRAVINGS, AVERSIONS, PICA_RE, PLAN, visitEvery, COMPLICATIONS, feedHours, wakeWindow, diaperHours, MILESTONES, VACCINES, CHECKUPS, ILLNESSES, ILL_PER_YEAR, growthAt } from './data.js';
import { blankProfile, rollAll, loreFixed, isHedyBucky, isMutant, hasStones, hasSerum, summaryRu, SERUM, STONES, POWER_FAMILIES, IQ_TIER } from './genes.js';

export let A = null; // api Life
export function setApi(api) { A = api; }
export const ctx = () => SillyTavern.getContext();

const DAY = 864e5;
const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const R = () => Math.random();

// ───────────── настройки и хранилище ─────────────

const DEF = {
    on: true, beat: 35, muteRepro: true, realism: 'real', refs: true, dailyLLM: true, offscreen: true, profiles: {},
};
export function cfg() {
    const ext = ctx().extensionSettings;
    if (!ext.zernyshko || typeof ext.zernyshko !== 'object') ext.zernyshko = {};
    const s = ext.zernyshko;
    for (const [k, v] of Object.entries(DEF)) if (s[k] === undefined) s[k] = JSON.parse(JSON.stringify(v));
    return s;
}
export const saveCfg = () => ctx().saveSettingsDebounced();

export function meta() {
    const md = ctx().chatMetadata;
    if (!md) return { kids: [] };
    if (!md.zernyshko || typeof md.zernyshko !== 'object') md.zernyshko = { v: 1, kids: [] };
    if (!Array.isArray(md.zernyshko.kids)) md.zernyshko.kids = [];
    return md.zernyshko;
}
export function save() { try { ctx().saveMetadataDebounced?.(); } catch { /* */ } }

export const kids = () => meta().kids;
export const kidById = (id) => kids().find(k => k.id === id) || null;
export const uid = () => Math.random().toString(36).slice(2, 10);

// ───────────── сид-рандом (стабильный на день) ─────────────

function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function seeded(seed) {
    let a = hashStr(String(seed));
    return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ───────────── время истории ─────────────

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export function fmtDate(t, withYear = false) {
    if (t == null || isNaN(t)) return '—';
    return new Date(t).toLocaleDateString('ru-RU', withYear ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'long' });
}

/** «Сейчас» в истории: дата и время Horae, иначе — последняя дата Reproductive. */
export function clock() {
    let d = null, hour = 12, min = 0;
    try {
        const st = A?.worldState?.() || {};
        d = A?.parseDate?.(st.timestamp?.story_date) || null;
        const tm = String(st.timestamp?.story_time || '').match(/(\d{1,2})[:.](\d{2})/);
        if (tm) { hour = +tm[1]; min = +tm[2]; }
    } catch { /* */ }
    if (!d || isNaN(d)) { const r = repro(); if (r?.rpDate) d = new Date(r.rpDate); }
    if (!d || isNaN(d)) return { t: null, day: '', hour, ok: false };
    d.setHours(hour, min, 0, 0);
    return { t: d.getTime(), day: iso(d), hour, month: d.getMonth(), ok: true };
}

// ───────────── Reproductive (сроки и пол — оттуда) ─────────────

function chatIdForms() {
    const out = [];
    try {
        const c = ctx(); const md = c.chatMetadata || {};
        if (md.integrity) out.push(`uuid:${md.integrity}`);
        if (md.file_name) out.push(`file:${md.file_name}`);
        if (md.chat_id_hash != null && md.chat_id_hash !== '') out.push(`hash:${md.chat_id_hash}`);
        if (c.chatId) out.push(String(c.chatId).trim().replace(/\s-\s(\d{4}-\d{2}-\d{2}@\d{2}h\d{2}m\d{2}s)\d*ms$/, ' - $1').replace(/\s@(\d{4}-\d{2}-\d{2}@\d{2}h\d{2}m\d{2}s)\d*ms$/, ' @$1'));
    } catch { /* */ }
    return out;
}
/** Данные Reproductive по этому чату — только чтение. */
export function repro() {
    const s = ctx().extensionSettings?.['reproductive-system'];
    const map = s?.chatPregnancyData;
    if (!s || !map) return null;
    const p = chatIdForms().map(k => map[k]).find(Boolean);
    if (!p) return null;
    const car = p.isPregnant ? p : p.partner?.isPregnant ? p.partner : p;
    return {
        on: s.isEnabled !== false, pregnant: !!car.isPregnant, conception: car.conceptionDate ? new Date(car.conceptionDate).getTime() : null,
        count: Number(car.fetusCount) || 1, sex: Array.isArray(car.fetusSex) ? car.fetusSex : [], rpDate: p.rpDate || null,
        hasBaby: !!p.hasBaby, babies: Array.isArray(p.babies) ? p.babies : [], carrier: car === p.partner ? 'char' : 'user',
    };
}

/** Подтянуть дату зачатия и роды из Reproductive. */
export function syncRepro() {
    const r = repro();
    if (!r) return false;
    let ch = false;
    for (const k of kids()) {
        if (k.src !== 'repro') continue;
        if (k.stage === 'preg' && r.conception && r.conception !== k.conception) { k.conception = r.conception; ch = true; }
        if (k.stage === 'preg' && r.hasBaby && r.babies[0]?.birthRpDate && !r.pregnant) {
            birth(k, { at: new Date(r.babies[0].birthRpDate).getTime(), name: r.babies[0].name || '' });
            ch = true;
        }
    }
    return ch;
}

// ───────────── родители ─────────────

const canon = (n) => (A?.canonName?.(n) || n || '');
const same = (a, b) => (A?.sameName ? A.sameName(a, b) : String(a).toLowerCase() === String(b).toLowerCase());
export const short = (n) => (A?.shortName ? A.shortName(canon(n)) : String(n || '').split(/\s+/)[0]);
export const userName = () => canon(ctx().name1) || ctx().name1 || '';

export function profile(name, sex = 'F') {
    const s = cfg();
    const key = canon(name);
    if (!key) return blankProfile('', sex);
    if (!s.profiles[key]) s.profiles[key] = blankProfile(key, sex);
    return s.profiles[key];
}
export const mom = (k) => profile(k.mother);
export const dad = (k) => profile(k.father, 'M');

/** Текст карточки персонажа / персоны для анализа. */
export function cardText(name) {
    const c = ctx();
    if (same(name, c.name1)) {
        let d = '';
        try { d = c.powerUserSettings?.persona_description || window.power_user?.persona_description || ''; } catch { /* */ }
        return `Персона игрока. ${d}`;
    }
    const ch = (c.characters || []).find(x => same(x.name, name));
    if (!ch) return '';
    const d = ch.data || ch;
    return [d.description, d.personality, d.scenario, d.mes_example ? '' : '', d.creator_notes].filter(Boolean).join('\n\n');
}

// ───────────── дети ─────────────

export function newKid({ mother, father, conception = null, src = 'manual', birthAt = null, name = '', lore = false, first = true }) {
    const k = {
        id: uid(), name, mother: canon(mother), father: canon(father), src, created: Date.now(),
        stage: birthAt ? 'baby' : 'preg', conception: conception || (birthAt ? birthAt - 266 * DAY : null), lore,
        genes: {}, preg: { first, plan: {}, comps: {}, today: null, talk: {}, kicks: {}, us: [], events: [], stress: [] },
        birth: null, img: '', album: [], moments: [],
    };
    if (lore) { Object.assign(k.genes, loreFixed(k, profile(mother))); k.preg.shield = true; k.preg.bond = true; }
    rollAll(k, profile(mother, 'F'), profile(father, 'M'));
    kids().push(k);
    if (birthAt) birth(k, { at: birthAt, silent: true });
    save(); saveCfg();
    return k;
}
export function delKid(id) { const m = meta(); m.kids = m.kids.filter(k => k.id !== id); save(); }

export const sexWord = (k, f = 'девочка', m = 'мальчик') => (k.genes?.sex?.v === 'M' ? m : f);
export const kidName = (k) => k.name || (k.stage === 'preg' ? 'Зёрнышко' : sexWord(k, 'Малышка', 'Малыш'));
export const her = (k) => (k.genes?.sex?.v === 'M' ? 'он' : 'она');
/** Женский род по умолчанию; для мальчика — мужской. */
export function gw(k, s) {
    if (k?.genes?.sex?.v !== 'M') return s;
    return String(s).replace(/(Голодн|Довольн|Мокр)ая/g, '$1ый').replace(/(голодн|довольн|мокр)ая/g, '$1ый')
        .replace(/ерегуляла/g, 'ерегулял').replace(/аболела/g, 'аболел').replace(/ыздоровела/g, 'ыздоровел').replace(/дорос?ла/g, 'дорос').replace(/одилась/g, 'одился');
}

// ───────────── срок ─────────────

export function term(k, t = clock().t) {
    if (!k.conception || t == null) return null;
    const days = Math.floor((t - k.conception) / DAY);
    if (days < 0) return { days, before: true };
    const ob = days + 14;
    const ow = Math.floor(ob / 7), od = ob % 7, ew = Math.floor(days / 7), ed = days % 7;
    const due = k.conception + 266 * DAY;
    return { days, ob, ow, od, ew, ed, due, left: Math.ceil((due - t) / DAY), tri: ow < 14 ? 1 : ow < 28 ? 2 : 3, pct: clamp(ob / 280 * 100) };
}
export const termLabel = (tm) => (tm ? `${tm.ow} нед ${tm.od} дн` : '—');

// ───────────── симптомы дня ─────────────

function symptomWeight(s, w, k) {
    if (w < s.from || w > s.to) return 0;
    let x = s.w * (w >= s.peak[0] && w <= s.peak[1] ? 2.5 : 1);
    const g = k.genes || {};
    if (s.tag === 'тошнота' && g.sex?.v === 'F') x *= 1.3;
    if (s.id === 'hungry' && (g.serum?.v || []).includes('meta')) x *= 2.2;
    if (s.id === 'back' && (dad(k).height >= 185 || hasSerum(dad(k)))) x *= 1.4;
    return x;
}

/** Что у мамы сегодня — стабильно в пределах игрового дня. */
export function todaySymptoms(k, tm = term(k), day = clock().day) {
    if (!tm || tm.before) return [];
    const rnd = seeded(`${k.id}|${day}`);
    const pool = SYMPTOMS.map(s => [s, symptomWeight(s, tm.ow, k)]).filter(([, w]) => w > 0);
    const out = [];
    const n = tm.ow < 6 ? 2 : 3 + (rnd() < 0.4 ? 1 : 0);
    while (out.length < n && pool.length) {
        const sum = pool.reduce((a, [, w]) => a + w, 0);
        let x = rnd() * sum, i = 0;
        for (; i < pool.length; i++) { x -= pool[i][1]; if (x <= 0) break; }
        out.push(pool.splice(Math.min(i, pool.length - 1), 1)[0][0]);
    }
    return out;
}

/** Эхо сил плода — что чувствует мама. */
export function powerEcho(k, tm = term(k)) {
    const p = k.genes?.power?.v;
    if (!p || !k.genes?.xgene?.v || !p.echo || !tm || tm.ow < 10) return '';
    const fam = p.family;
    const lines = {
        energy: 'когда малыш возится, по коже мамы бегут мурашки статики, лампы рядом едва заметно мигают; её собственная энергия стала спокойнее — будто кто-то внутри забирает лишнее',
        kinetic: 'когда малыш пинается, мелкие вещи рядом вздрагивают на столе',
        luck: 'вокруг мамы творится странное везение: падающее не разбивается, светофоры зелёные',
        tech: 'электроника рядом с животом сходит с ума: экраны мигают, датчики врут, УЗИ-аппарат сбоит',
        mind: 'мама иногда ловит чужие чувства, будто сквозь стенку — особенно когда малыш не спит',
        body: 'у мамы быстрее заживают царапины и почти не болит то, что болело',
        elemental: 'вокруг мамы меняется температура — то тепло, то иней на стекле',
        other: 'с мамой происходит что-то необъяснимое, когда малыш активен',
    };
    return tm.ow >= 16 ? lines[fam] || lines.other : 'иногда покалывает в животе, как от слабого тока, и сбоит электроника';
}

// ───────────── тяга дня ─────────────

const CRAVE_SYSTEM = `Ты — ведущий симулятор беременности в ролевой истории на русском. Придумай, что беременной героине хочется и что её воротит СЕГОДНЯ.
Учитывай срок, симптомы, её вкусы и прошлое из лора, место и сезон, что было вчера. Тяга может быть странной (сочетания, «хлеб с зубной пастой», лёд) — но не каждый день; если тянет на лёд, мел или крахмал — это часто нехватка железа.
need — одна практичная плашка на сегодня: чего ей сейчас не хватает или что важно (по медицине и сроку), 6–14 слов, с причиной («Нужно железо — вот откуда тяга ко льду»).
fetus — что малыш делает внутри сегодня, одна живая фраза по сроку (без фантастики, если сил у плода нет).
Только JSON: {"crave":["",""],"avoid":[""],"weird":"","need":"","fetus":""}`;

const dayBusy = new Set();
export async function makeDay(k, { force = false } = {}) {
    if (dayBusy.has(k.id)) return k.preg?.today || null;
    dayBusy.add(k.id);
    try { return await makeDayInner(k, { force }); } finally { dayBusy.delete(k.id); }
}
async function makeDayInner(k, { force = false } = {}) {
    const c = clock();
    const tm = term(k, c.t);
    if (!tm || tm.before || k.stage !== 'preg') return null;
    const p = k.preg;
    if (p.today?.day === c.day && !force) return p.today;
    const sym = todaySymptoms(k, tm, c.day).map(s => s.name.toLowerCase());
    const local = () => {
        const rnd = seeded(`${k.id}|crave|${c.day}`);
        const pick = (a) => a[Math.floor(rnd() * a.length)];
        const groups = Object.keys(CRAVINGS).filter(g => g !== 'weird');
        const crave = [pick(CRAVINGS[pick(groups)]), pick(CRAVINGS[pick(groups)])].filter((v, i, a) => a.indexOf(v) === i);
        const weird = rnd() < 0.12 ? pick(CRAVINGS.weird) : '';
        return { crave, avoid: tm.ow < 16 ? [pick(AVERSIONS)] : [], weird, need: '', fetus: '' };
    };
    let out = local(), src = 'local';
    if (cfg().dailyLLM && A?.askModel) {
        try {
            const st = A.worldState();
            const prefs = (A.chatMeta?.().prefs?.[canon(k.mother)] || []).map(x => `${x.k === 'dislike' ? 'не любит' : 'любит'} ${x.t}`).slice(0, 12).join('; ');
            const prev = (p.days || []).slice(-5).map(d => `${d.day}: ${[...(d.crave || []), d.weird].filter(Boolean).join(', ')}`).join('\n');
            const anemia = p.comps?.anemia?.hit;
            const m = mom(k);
            const w = weekInfo(tm.ow);
            const input = [
                `Героиня: ${k.mother}. ${m.notes || ''} ${(m.acquired || []).length ? `Её особенности: ${m.acquired.join(', ')}.` : ''}`,
                `Срок: ${tm.ow} нед ${tm.od} дн акушерских (${tm.ew} нед от зачатия). Плод ~ ${w.size}.`,
                `Сегодня: ${[A.weekday?.(st.timestamp?.story_date), st.timestamp?.story_date].filter(Boolean).join(', ')}; место: ${st.scene?.location || '—'}; погода: ${st.scene?.atmosphere || '—'}.`,
                `Симптомы сегодня: ${sym.join(', ') || '—'}.`,
                prefs ? `Её вкусы: ${prefs}.` : '',
                anemia ? 'У неё анемия.' : '',
                (k.genes?.serum?.v || []).includes('meta') ? 'Плод унаследовал ускоренный обмен от сыворотки — мама ест за троих.' : '',
                k.genes?.xgene?.v && k.genes?.power?.v ? `У плода X-ген (${POWER_FAMILIES[k.genes.power.v.family]?.name || ''}).` : '',
                prev ? `Прошлые дни (не повторяй):\n${prev}` : '',
            ].filter(Boolean).join('\n');
            const j = A.extractJson(await A.askModel([{ role: 'system', content: CRAVE_SYSTEM }, { role: 'user', content: input }], 500));
            const arr = (v) => (Array.isArray(v) ? v : []).map(x => String(x || '').trim()).filter(Boolean).slice(0, 3);
            if (j && arr(j.crave).length) { out = { crave: arr(j.crave), avoid: arr(j.avoid), weird: String(j.weird || '').trim().slice(0, 80), need: String(j.need || '').trim().slice(0, 160), fetus: String(j.fetus || '').trim().slice(0, 200) }; src = 'llm'; }
        } catch (e) { console.warn('[Зёрнышко] тяга дня', e); }
    }
    p.today = { day: c.day, ...out, src, ate: [] };
    p.days = [...(p.days || []), { day: c.day, crave: out.crave, weird: out.weird }].slice(-14);
    if (out.weird && PICA_RE.test(out.weird)) p.pica = (p.pica || 0) + 1;
    save();
    return p.today;
}

// ───────────── план ведения ─────────────

function fluSeason(month) { return month >= 8 || month <= 2; }
function rsvSeason(month) { return month >= 8 || month === 0; }
/** Энергия (Камней и т.п.) собралась у матки и бережёт плод. По умолчанию — у лора Хеди и Баки. */
export const shieldOn = (k) => (k.preg?.shield ?? !!k.lore);
/** Мама чувствует плод через эту энергию. */
export const bondOn = (k) => (k.preg?.bond ?? !!k.lore);
/** Что мама чувствует через связь прямо сейчас. */
export function bondFeel(k, c = clock()) {
    if (!bondOn(k)) return null;
    const comps = Object.values(k.preg?.comps || {}).filter(s => s.hit && s.stage !== 'resolved');
    const stress = (k.preg?.stress || []).filter(x => c.t != null && c.t - x.at < 2 * DAY).reduce((a, x) => a + x.v, 0);
    if (comps.length) return { bad: true, word: 'Что-то не так', t: 'через связь чувствует: с малышкой что-то не так — тянущее, тревожное чувство, хотя врачи могут ещё ничего не видеть' };
    if (stress >= 3) return { bad: false, word: 'Беспокоится', t: 'через связь чувствует: малышка беспокоится вместе с ней — притихла, сжалась' };
    return { bad: false, word: 'В порядке', t: 'через связь чувствует: малышка в порядке — спокойное ровное тепло внизу живота' };
}
export function riskFactors(k) {
    const m = mom(k);
    const text = `${(m.acquired || []).join(' ')} ${m.notes || ''} ${(m.features || []).join(' ')}`.toLowerCase();
    const r = repro();
    return {
        age35: Number(m.age) >= 35,
        first: k.preg?.first !== false,
        shield: shieldOn(k),
        twins: (r?.count || 1) > 1,
        girl: k.genes?.sex?.v === 'F',
        scar: /шрам[^.]*живот|рубец[^.]*матк|кесар|вивисек|матк|operац|операц[^.]*живот/.test(text),
        bigdad: Number(dad(k).height) >= 185 || hasSerum(dad(k)),
        motherPower: isMutant(m) || hasStones(m),
        rhneg: String(m.blood || '').endsWith('-') && String(k.genes?.blood?.v || '').endsWith('+'),
        aspirin: !!k.preg?.plan?.aspirin,
        gdm: !!k.preg?.comps?.gdm?.hit, cervix: !!k.preg?.comps?.cervix?.hit,
    };
}
export function planItems(k, tm = term(k)) {
    const c = clock();
    const rf = riskFactors(k);
    const risk = rf.age35 || rf.scar || rf.twins || Object.values(k.preg?.comps || {}).some(x => x.hit && x.stage !== 'resolved');
    const ok = (it) => !it.when
        || (it.when === 'aspirin' && rf.age35 + rf.first + rf.twins >= 2)
        || (it.when === 'rhneg' && rf.rhneg)
        || (it.when === 'fluSeason' && fluSeason(c.month))
        || (it.when === 'rsvSeason' && rsvSeason(c.month))
        || (it.when === 'risk' && risk)
        || (it.when === 'late' && tm && tm.ow >= 39);
    const w = tm?.ow ?? 0;
    return PLAN.filter(ok).map(it => {
        const done = k.preg?.plan?.[it.id];
        const daily = it.daily && !(it.id === 'folic' && w > 12);
        const status = done && !it.daily ? 'done' : w < it.w[0] ? 'later' : w > it.w[1] ? (it.daily ? 'past' : 'missed') : 'now';
        const takenToday = it.daily && k.preg?.vit?.[it.id] === c.day;
        return { ...it, status, done, daily, takenToday };
    });
}

// ───────────── осложнения (раз в неделю) ─────────────

const REAL = { soft: 0.5, real: 1, drama: 1.6 };
export function rollWeek(k, tm) {
    const p = k.preg;
    if (p.lastWeek === tm.ow) return [];
    const from = p.lastWeek ?? tm.ow - 1;
    p.lastWeek = tm.ow;
    if (tm.ow - from > 8) return []; // перескок во времени — не засыпаем бросками
    const rf = riskFactors(k);
    const news = [];
    for (const c of COMPLICATIONS) {
        if (c.need && !rf[c.need]) continue;
        const st = p.comps[c.id];
        if (st?.hit || st?.done) continue;
        if (tm.ow < c.w[0]) continue;
        if (tm.ow > c.w[1]) { p.comps[c.id] = { ...(st || {}), done: true }; continue; }
        let pr = c.p * (REAL[cfg().realism] || 1);
        for (const [f, mult] of Object.entries(c.mod || {})) if (rf[f]) pr *= mult;
        pr = Math.min(0.9, pr);
        const span = c.w[1] - c.w[0] + 1;
        const weekly = 1 - Math.pow(1 - pr, 1 / span);
        if (R() < weekly) {
            const stage = c.found === 'signs' ? 'signs' : 'hidden';
            p.comps[c.id] = { hit: true, stage, week: tm.ow, at: Date.now() };
            news.push(c);
        }
    }
    return news;
}
export const compById = (id) => COMPLICATIONS.find(c => c.id === id);

/** Обследование сделано — тайное становится известным. */
export function planDone(k, id, mes = null) {
    const p = k.preg;
    const it = PLAN.find(x => x.id === id);
    if (!it) return [];
    if (it.daily) { p.vit = p.vit || {}; p.vit[id] = clock().day; p.plan[id] = p.plan[id] || { at: clock().t, mes }; }
    else p.plan[id] = { at: clock().t, mes };
    const found = [];
    for (const [cid, st] of Object.entries(p.comps)) {
        const c = compById(cid);
        if (st.hit && st.stage === 'hidden' && c?.found === id) { st.stage = 'known'; st.foundAt = clock().t; found.push(c); }
    }
    return found;
}

// ───────────── роды ─────────────

function gauss() { let u = 0, v = 0; while (!u) u = R(); while (!v) v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

export function birth(k, { at = clock().t, how = '', name = '', silent = false } = {}) {
    if (k.stage !== 'preg') return;
    const tm = term(k, at);
    const g = k.genes || {};
    const comps = k.preg?.comps || {};
    const hz = Number(g.height?.z || 0);
    let bz = hz * 0.3 + gauss() * 0.75 + (comps.big?.hit ? 1.2 : 0) + (comps.gdm?.hit ? 0.5 : 0) - (comps.fgr?.hit ? 1.4 : 0) + ((g.serum?.v || []).includes('meta') ? 0.3 : 0);
    bz = Math.max(-2.5, Math.min(2.8, bz));
    const sex = g.sex?.v || 'F';
    const w = tm?.ow || 40;
    const full = growthAt(sex, 0, { w: bz, l: bz * 0.8, h: bz * 0.6 });
    const k40 = w >= 37 ? 1 : (WEEKS[Math.max(24, w)]?.g || 1000) / 3400;
    k.birth = {
        at, week: w, day: tm?.od || 0, how, weight: Math.round(full.w * 1000 * k40 / 10) * 10, length: Math.round(full.l * (w >= 37 ? 1 : 0.6 + 0.4 * k40) * 10) / 10,
        head: Math.round(full.h * 10) / 10, apgar: w >= 37 ? `${8 + (R() < 0.6 ? 1 : 0)}/${9 + (R() < 0.3 ? 1 : 0)}` : '7/8',
    };
    k.stage = 'baby';
    if (name) k.name = name;
    k.growth = { birthZ: { w: bz, l: bz * 0.8, h: bz * 0.6 }, target: { w: hz * 0.8, l: hz, h: hz * 0.7 } };
    k.feeding = k.feeding || 'breast';
    k.with = k.with || k.mother;
    const now = { t: at };
    k.needs = { food: { v: 70, at: now.t }, diaper: { v: 80, at: now.t }, hold: { v: 90, at: now.t }, sleep: { asleep: true, since: now.t } };
    const talk = k.preg?.talk || {};
    k.attach = {};
    k.attach[k.mother] = 35 + Math.min(10, (talk[k.mother] || 0));
    if (k.father) k.attach[k.father] = 15 + Math.min(20, (talk[k.father] || 0) * 2);
    for (const [n, c] of Object.entries(talk)) if (!k.attach[n]) k.attach[n] = Math.min(12, c * 2);
    // личные сроки вех: ум — раньше речь, сыворотка — раньше движение
    const iq = Number(g.iq?.v || 100), serum = g.serum?.v || [];
    k.miles = {};
    for (const m of MILESTONES) {
        let f = 1 + gauss() * 0.13;
        if ((m.d === 'speech' || m.d === 'mind') && iq >= 130) f *= iq >= 160 ? 0.78 : 0.88;
        if (m.d === 'motor' && (serum.includes('strong') || serum.includes('meta'))) f *= 0.88;
        if (m.d === 'social' && Number(g.temp?.v?.approach || 3) <= 2) f *= 1.1;
        if (m.id === 'stranger') f = 1 + gauss() * 0.15;
        k.miles[m.id] = { day: Math.round(m.m * 30.4 * Math.max(0.6, f)) };
    }
    k.teeth = { first: Math.round(30.4 * Math.max(3, 6 + gauss() * 1.6)) };
    k.health = { ill: null, hist: [], vax: {}, checks: {}, jaundice: R() < 0.55 ? { from: 2, to: 10 + Math.round(R() * 6) } : null, react: null };
    k.powerLog = [];
    if (!silent) A?.toast?.('success', `${kidName(k)} родил${g.sex?.v === 'M' ? 'ся' : 'ась'}! ${k.birth.weight} г, ${k.birth.length} см. Карточка — в «Персонаже».`, '✦ Зёрнышко', { timeOut: 8000 });
    save();
}

// ───────────── малыш ─────────────

export function age(k, t = clock().t) {
    if (!k.birth?.at || t == null) return null;
    const days = Math.max(0, (t - k.birth.at) / DAY);
    const months = days / 30.4;
    const d = Math.floor(days), m = Math.floor(months), y = Math.floor(months / 12);
    const label = d < 14 ? `${d} ${plural(d, 'день', 'дня', 'дней')}` : d < 61 ? `${Math.floor(d / 7)} ${plural(Math.floor(d / 7), 'неделя', 'недели', 'недель')}` : m < 24 ? `${m} ${plural(m, 'месяц', 'месяца', 'месяцев')}` : `${y} ${plural(y, 'год', 'года', 'лет')}${m % 12 ? ` ${m % 12} мес` : ''}`;
    return { days, months, label };
}
function plural(n, a, b, c) { const x = Math.abs(n) % 100, y = x % 10; if (x > 10 && x < 20) return c; if (y > 1 && y < 5) return b; if (y === 1) return a; return c; }

const hoursSince = (at, t) => (at == null || t == null ? 0 : Math.max(0, Math.min(72, (t - at) / 36e5)));

function needVal(k, key, t, ag) {
    const n = k.needs?.[key];
    if (!n) return 70;
    const meta = (k.genes?.serum?.v || []).includes('meta') ? 1.25 : 1;
    const rate = key === 'food' ? 100 / feedHours(ag.days, k.feeding) * meta : key === 'diaper' ? 100 / diaperHours(ag.days) : key === 'hold' ? 100 / (ag.months < 3 ? 2.5 : ag.months < 9 ? 3.5 : 5) : 0;
    if (!rate || n.at == null || t == null) return clamp(n.v);
    const h = Math.max(0, (t - n.at) / 36e5);
    const cycle = 100 / rate; // часов от «только что» до нуля
    // долго не было сцен с малышом — значит, за кадром кормили и меняли: потребность ходит по кругу
    if (h > cycle * 1.6) { const ph = (h - n.v / rate) % cycle; return clamp(Math.round(100 - rate * ph * 0.8)); }
    return clamp(Math.round(n.v - rate * h));
}
export function feedEvery(k, ag) { return feedHours(ag.days, k.feeding) / ((k.genes?.serum?.v || []).includes('meta') ? 1.25 : 1); }
export function setNeed(k, key, v, t = clock().t) { k.needs = k.needs || {}; k.needs[key] = { v: clamp(v), at: t }; }

/** Полное состояние малыша сейчас. */
export function babyState(k, c = clock()) {
    const ag = age(k, c.t);
    if (!ag) return null;
    const food = needVal(k, 'food', c.t, ag), diaper = needVal(k, 'diaper', c.t, ag), hold = needVal(k, 'hold', c.t, ag);
    const win = wakeWindow(ag.days);
    const night = c.hour >= 21 || c.hour < 6;
    const { asleep, awakeMin } = sleepNow(k, c, ag, win, night);
    const sleepVal = asleep ? 100 : clamp(Math.round(100 - (awakeMin / win[1]) * 70));
    const pains = [];
    const h = k.health || {};
    const wk = ag.days / 7;
    if (wk >= 2 && wk <= 14 && (c.hour >= 18 || c.hour < 1)) pains.push({ k: 'colic', v: wk >= 4 && wk <= 8 ? 35 : 20, t: 'вечерние колики: кричит пронзительно, поджимает ножки, краснеет — ни грудь, ни укачивание не помогают сразу' });
    if (k.teeth?.first && ag.days >= k.teeth.first - 14 && ag.days < k.teeth.first + 60) pains.push({ k: 'teeth', v: 18, t: 'режутся зубы: слюни ручьём, грызёт кулак и всё подряд, капризничает' });
    else if (ag.months >= 13 && ag.months < 30 && seeded(`${k.id}|teeth|${Math.floor(ag.days / 20)}`)() < 0.35) pains.push({ k: 'teeth', v: 20, t: 'лезут коренные зубы: щёчка красная, ночью просыпается с плачем' });
    if (h.ill && h.ill.stage === 'sick') pains.push({ k: 'ill', v: 30, t: illDayText(k, c) });
    if (h.react && c.t < h.react.until) pains.push({ k: 'vax', v: 20, t: `после прививки: ${h.react.text}` });
    if (h.jaundice && ag.days >= h.jaundice.from && ag.days <= h.jaundice.to) pains.push({ k: 'jaundice', v: 5, t: 'желтушка новорождённых: кожа и белки глаз с желтизной, много спит — проходит сама, педиатр смотрит билирубин' });
    if (diaper < 12 && (k.needs?.diaper?.low ?? 0) > 2) pains.push({ k: 'rash', v: 15, t: 'опрелости: попа красная, плачет при смене подгузника' });
    const comfort = clamp(100 - pains.reduce((a, p) => a + p.v, 0) - (diaper < 20 ? 15 : 0) - (food < 25 ? 15 : 0));
    // главное прямо сейчас
    let cry = '', word = '';
    const overtired = !asleep && awakeMin > win[1] * 1.15;
    if (asleep) { word = night ? 'Спит' : 'Дневной сон'; cry = ag.months < 4 && night && food < 40 ? 'спит, но скоро проснётся есть — ворочается, чмокает' : 'спит'; }
    else if (food < 30) { word = 'Голодная'; cry = ag.months < 6 ? 'голодный плач: ритмичный, нарастающий, крутит головой и ищет грудь, сосёт кулак' : 'голодная: хнычет, тянется к еде, швыряет игрушки'; }
    else if (pains.find(p => p.k === 'colic')) { word = 'Колики'; cry = pains.find(p => p.k === 'colic').t; }
    else if (overtired) { word = 'Перегуляла'; cry = 'перегуляла: трёт глаза, выгибается, плачет на взвизге и не может уснуть сама — нужно укачать в тишине'; }
    else if (h.ill?.stage === 'sick') { word = 'Болеет'; cry = illDayText(k, c); }
    else if (diaper < 20) { word = 'Мокрая'; cry = 'мокрый подгузник: ёрзает, хнычет'; }
    else if (pains.length) { word = pains[0].k === 'teeth' ? 'Зубы' : pains[0].k === 'vax' ? 'После прививки' : 'Неуютно'; cry = pains[0].t; }
    else if (hold < 25) { word = 'На ручки'; cry = ag.months < 6 ? 'хнычет и затихает только на руках' : 'тянет руки к своим, ноет, пока не возьмут'; }
    else if (!asleep && awakeMin > win[0]) { word = 'Устаёт'; cry = 'устаёт: зевает, смотрит в одну точку, отворачивается — пора укладывать'; }
    else { word = 'Довольная'; cry = calmText(ag); }
    word = gw(k, word); cry = gw(k, cry);
    return { ag, food, diaper, hold, sleep: sleepVal, asleep, awakeMin, win, comfort, pains, word, cry, overtired, night };
}
function sleepNow(k, c, ag, win, night) {
    const sl = k.needs?.sleep || {};
    const nap = night ? (ag.months < 4 ? 150 : ag.months < 9 ? 300 : 600) : (ag.months < 4 ? 50 : ag.months < 15 ? 80 : 110);
    const winAvg = (win[0] + win[1]) / 2;
    let el = sl.since == null || c.t == null ? 0 : Math.max(0, (c.t - sl.since) / 6e4);
    if (sl.asleep) { if (el < nap) return { asleep: true, awakeMin: 0 }; el -= nap; }
    if (el <= win[1] * 1.4) return { asleep: false, awakeMin: Math.round(el) };
    // давно без сцен — за кадром спал как положено: сон по кругу
    if (night) { const ph = el % (ag.months < 6 ? 180 : 600); return ph < (ag.months < 6 ? 25 : 0) ? { asleep: false, awakeMin: Math.round(ph) } : { asleep: true, awakeMin: 0 }; }
    const per = winAvg + nap;
    const ph = el % per;
    return ph < winAvg ? { asleep: false, awakeMin: Math.round(ph) } : { asleep: true, awakeMin: 0 };
}

function calmText(ag) {
    const m = ag.months;
    if (m < 1) return 'спокойно бодрствует: разглядывает лица вблизи, морщит лоб, чмокает';
    if (m < 3) return 'гулит, улыбается в ответ на лицо, машет кулачками';
    if (m < 6) return 'смеётся, тянет всё в рот, разглядывает свои руки';
    if (m < 9) return 'сидит и лепечет «ба-ба», хватает за волосы и цепочки';
    if (m < 14) return 'ползает или ходит вдоль мебели, лезет везде, показывает пальцем';
    if (m < 24) return 'топает за взрослыми хвостиком, лопочет и требует «дай»';
    return 'болтает фразами, играет «понарошку», задаёт «а это что?»';
}

export function favorite(k) {
    const e = Object.entries(k.attach || {}).sort((a, b) => b[1] - a[1])[0];
    return e && e[1] >= 25 ? e[0] : '';
}
export function attachWord(v) { return v >= 70 ? 'надёжная' : v >= 45 ? 'тёплая' : v >= 25 ? 'знакомый' : v >= 10 ? 'видела' : 'чужой'; }
function bump(k, who, d) {
    const n = canon(who);
    if (!n) return;
    k.attach = k.attach || {};
    k.attach[n] = clamp((k.attach[n] || 0) + d);
}

// ───────────── болезни и прививки (раз в игровой день) ─────────────

function illDayText(k, c = clock()) {
    const il = k.health?.ill;
    const d = ILLNESSES.find(x => x.id === il?.id);
    if (!d) return '';
    const day = Math.max(0, Math.floor((c.t - il.sick) / DAY));
    const idx = Math.min(d.days.length - 1, Math.floor(day / Math.max(1, (il.dur / d.days.length))));
    const t = (il.temp && day < 3) ? ` (температура ${il.temp.toFixed(1)})` : '';
    return `${d.name.toLowerCase()}, день ${day + 1}: ${d.days[idx]}${t}`;
}

export function dailyBaby(k, c) {
    const ag = age(k, c.t);
    if (!ag) return [];
    const h = k.health = k.health || { hist: [], vax: {}, checks: {} };
    const notes = [];
    const immune = (k.genes?.serum?.v || []).includes('immune');
    // течение болезни
    if (h.ill) {
        const il = h.ill;
        if (il.stage === 'inc' && c.t >= il.sick) { il.stage = 'sick'; notes.push(gw(k, `заболела: ${ILLNESSES.find(x => x.id === il.id)?.name}`)); }
        if (il.stage === 'sick' && c.t >= il.sick + il.dur * DAY) { il.stage = 'well'; h.hist.unshift({ id: il.id, from: il.sick, to: c.t }); h.ill = null; notes.push(gw(k, 'выздоровела')); }
    }
    // новая болезнь
    if (!h.ill) {
        const recentCold = h.hist[0] && h.hist[0].id === 'cold' && c.t - h.hist[0].to < 4 * DAY;
        const breast = ag.months < 6 && k.feeding !== 'formula' ? 0.8 : 1;
        const exposure = (k.exposed && c.t - k.exposed < 5 * DAY) ? 3 : 1;
        let p = ILL_PER_YEAR(ag.months, k.daycare) / 365 * breast * exposure * (immune ? 0.3 : 1);
        if (R() < p || (recentCold && ag.months >= 5 && ag.months <= 36 && R() < (immune ? 0.05 : 0.25))) {
            const pool = ILLNESSES.filter(d => ag.months >= d.age[0] && ag.months <= d.age[1] && (!d.afterCold || recentCold)).map(d => {
                let w = d.w * d.season[c.month ?? 0];
                if (d.rsv && h.vax?.rsvmab) w *= 0.2;
                if (d.flu && h.vax?.flu1) w *= 0.4;
                return [d, w];
            });
            const sum = pool.reduce((a, [, w]) => a + w, 0);
            let x = R() * sum, pick = null;
            for (const [d, w] of pool) { x -= w; if (x <= 0) { pick = d; break; } }
            pick = pick || pool[0]?.[0];
            if (pick) {
                const inc = pick.inc[0] + Math.round(R() * (pick.inc[1] - pick.inc[0]));
                let dur = pick.dur[0] + Math.round(R() * (pick.dur[1] - pick.dur[0]));
                if (immune) dur = Math.max(2, Math.round(dur * 0.5));
                const temp = pick.fever[0] + R() * (pick.fever[1] - pick.fever[0]) - (immune ? 0.6 : 0);
                h.ill = { id: pick.id, start: c.t, sick: c.t + inc * DAY, dur, temp, stage: inc ? 'inc' : 'sick' };
            }
        }
    }
    // подгузник: долго мокрый — опрелости
    const dia = needVal(k, 'diaper', c.t, ag);
    if (k.needs?.diaper) k.needs.diaper.low = dia < 12 ? (k.needs.diaper.low || 0) + 1 : 0;
    // вехи, которые подошли по возрасту
    for (const m of MILESTONES) {
        const st = k.miles?.[m.id];
        if (st && !st.ready && ag.days >= st.day) { st.ready = c.t - Math.max(0, ag.days - st.day) * DAY; if (ag.days - st.day < 14) notes.push(gw(k, `доросла: ${m.t}`)); }
        if (st?.ready && !st.seen && c.t - st.ready > 21 * DAY) st.seen = { off: true, at: st.ready };
    }
    // проявления силы
    const pw = k.genes?.power?.v;
    if (k.genes?.xgene?.v && pw && (pw.echo || pw.early)) {
        const gate = { energy: 0, kinetic: 120, luck: 60, tech: 90, mind: 30, body: 0, elemental: 60, other: 60 }[pw.family] ?? 60;
        const p = (pw.early ? 0.08 : 0.04) * (0.6 + pw.level * 0.2);
        if (ag.days >= gate && R() < p) {
            const txt = incident(pw, ag);
            k.powerLog = [...(k.powerLog || []), { t: txt, at: c.t, shown: false }].slice(-40);
            k.pendingPower = txt;
        }
    }
    // по графику за кадром: окно прошло, а в сценах не делали
    if (cfg().offscreen !== false) {
        for (const v of vaxList(k, c)) if (v.status === 'late' || (v.status === 'now' && ag.months > v.m + 0.5)) { h.vax[v.id] = { at: c.t, off: true }; notes.push(gw(k, `за кадром сделали прививки: ${v.name}`)); }
        for (const x of checkupList(k, c)) if (x.status === 'late') h.checks[x.m] = { at: c.t, off: true };
    }
    k.lastDay = c.day;
    return notes;
}
function incident(pw, ag) {
    const small = ag.months < 6;
    const L = {
        energy: small ? 'когда она плачет, ближние лампы мигают, а от пальчиков бьёт статикой' : 'разозлившись, она «выпивает» энергию из игрушки на батарейках — та гаснет, а ладошки теплеют',
        kinetic: 'погремушка, до которой она не дотягивается, сама подкатывается к ней по полу',
        luck: 'что-то падает прямо на неё — и чудом пролетает мимо',
        tech: 'стоит ей посмотреть на телефон — экран загорается и листается сам',
        mind: 'она начинает плакать за секунду до того, как взрослый в комнате расстроится',
        body: 'ссадина, которая была утром, к вечеру исчезла без следа',
        elemental: 'вокруг кроватки то иней на стекле, то тёплый воздух, хотя окно закрыто',
        other: 'рядом с ней случается что-то, чему никто не может найти объяснения',
    };
    return L[pw.family] || L.other;
}

export function vaxList(k, c = clock()) {
    const ag = age(k, c.t);
    if (!ag) return [];
    const born = new Date(k.birth.at).getMonth();
    const momRsv = k.preg?.plan?.rsv;
    return VACCINES.filter(v => !v.when || (v.when === 'rsv' && !momRsv && (rsvSeason(born) || ag.months < 8)) || (v.when === 'fluSeason' && (fluSeason(c.month) || k.health?.vax?.[v.id])))
        .map(v => {
            const done = k.health?.vax?.[v.id];
            // антитела к RSV — к началу сезона (октябрь), если родилась летом
            const due = v.id === 'rsvmab' && !rsvSeason(born) && born > 2 ? (9 - born + 12) % 12 + 0.1 : v.m;
            const status = done ? 'done' : ag.months < due - 0.25 ? 'later' : ag.months <= Math.max(due + 1, v.max ?? v.m + 1) ? 'now' : 'late';
            v = { ...v, m: due };
            return { ...v, done, status };
        });
}
export function checkupList(k, c = clock()) {
    const ag = age(k, c.t);
    if (!ag) return [];
    return CHECKUPS.map(m => ({ m, label: m < 1 ? '3–5 день' : `${m} мес`, done: k.health?.checks?.[m], status: k.health?.checks?.[m] ? 'done' : ag.months < m - 0.3 ? 'later' : ag.months <= m + 1 ? 'now' : 'late' }));
}
export function growthNow(k, c = clock()) {
    const ag = age(k, c.t);
    if (!ag || !k.growth) return null;
    const f = Math.min(1, ag.months / 18);
    const z = {}; for (const key of ['w', 'l', 'h']) z[key] = k.growth.birthZ[key] + (k.growth.target[key] - k.growth.birthZ[key]) * f;
    const sex = k.genes?.sex?.v || 'F';
    if (ag.months < 0.5) return { w: k.birth.weight / 1000 * (1 - 0.07 * Math.sin(Math.min(1, ag.days / 10) * Math.PI)), l: k.birth.length, h: k.birth.head, z };
    return { ...growthAt(sex, ag.months, z), z };
}

// ───────────── обновление после поста / смены дня ─────────────

/** Догнать время: новый день, новая неделя. Возвращает список событий для тоста. */
export function tick() {
    const c = clock();
    if (!c.ok) return [];
    const events = [];
    syncRepro();
    for (const k of kids()) {
        if (k.stage === 'preg') {
            const tm = term(k, c.t);
            if (!tm || tm.before) continue;
            for (const comp of rollWeek(k, tm)) if (comp.found === 'signs') events.push(`${short(k.mother)}: ${comp.name.toLowerCase()} — проявится в сцене`);
            if (cfg().offscreen !== false) for (const it of planItems(k, tm)) if (!it.daily && !it.info && it.status === 'missed' && it.kind !== 'task') {
                const found = planDone(k, it.id);
                k.preg.plan[it.id].off = true;
                events.push(`${it.name} — прошло за кадром${found.length ? `; нашли: ${found.map(x => x.name.toLowerCase()).join(', ')}` : ''}`);
            }
            if (tm.ow >= 42 && !k.overdueWarn) { k.overdueWarn = true; events.push('42 недели — пора рожать'); }
        } else if (k.stage === 'baby' && k.lastDay !== c.day) {
            const days = k.lastDay ? Math.min(7, Math.max(1, Math.round((c.t - new Date(k.lastDay).getTime()) / DAY))) : 1;
            for (let i = 0; i < days; i++) events.push(...dailyBaby(k, { ...c, t: c.t - (days - 1 - i) * DAY }).map(x => `${kidName(k)} ${x}`));
            k.lastDay = c.day;
        }
    }
    if (events.length) save();
    return events;
}

// ───────────── Летописец ─────────────

const CHRON_RULE = `

zr — что в этом посте было с беременностью и малышом (строка «Зёрнышко» во входе). Только то, что правда есть в посте; ничего не было — {}.
{"talk":["кто разговаривал с животом или гладил его"],"kicks":["кто, кроме мамы, почувствовал толчки"],"ate":"что мама съела из того, на что её тянуло, коротко","vit":false,"plan":["id из строки «Зёрнышко», которые в посте сделали: обследования, анализы, прививки, приём"],"doctor":"что сказали врачи, 4–15 слов","alarm":"тревожный признак, если был: кровь, сильная боль, нет шевелений, отёк лица, температура у малыша","stress":0,"birth":null,"baby":{"fed":[{"who":"","how":"грудь|бутылочка|прикорм"}],"diaper":"","sleep":"уснул|проснулся|","held":[],"play":[],"with":"","bath":false,"sick":"","meds":"","vax":[],"check":false,"first":"","moment":""}}
vit — мама выпила витамины или фолиевую. stress — насколько мама перенервничала, 0–3. birth — если в посте РОДИЛСЯ ребёнок: {"how":"естественно|кесарево","name":"имя, если назвали"}. baby — только если малыш уже родился: fed — кто и как покормил; diaper — кто сменил подгузник; sleep — уснул или проснулся; held — кто носил на руках и успокаивал; play — кто играл, разговаривал, пел; with — у кого малыш теперь, если его передали или оставили; bath — купали; sick — новый признак болезни; meds — что дали; vax — id прививок, которые сделали; check — был осмотр у педиатра; first — что малыш сделал впервые, 2–8 слов; moment — милый или важный момент, 3–8 слов.`;

export function chronHook() {
    if (!cfg().on) return null;
    const c = clock();
    const lines = [];
    for (const k of kids()) {
        if (k.stage === 'preg') {
            const tm = term(k, c.t);
            if (!tm || tm.before) continue;
            const due = planItems(k, tm).filter(x => !x.info && (x.status === 'now' || (x.daily && !x.takenToday && x.status === 'now'))).slice(0, 8);
            lines.push(`Зёрнышко: ${k.mother} беременна, ${tm.ow} нед. (акушерских). Отец — ${k.father || '?'}. Дела по плану (id — название): ${due.map(x => `${x.id} — ${x.name}`).join('; ') || 'нет'}.`);
        } else if (k.stage === 'baby') {
            const ag = age(k, c.t);
            const vx = vaxList(k, c).filter(v => v.status === 'now' || v.status === 'late').map(v => `${v.id} — ${v.name}`);
            lines.push(`Зёрнышко: малыш ${kidName(k)} (${sexWord(k)}, ${ag?.label || '?'}), сейчас у ${k.with || k.mother}. Родители: ${k.mother}, ${k.father || '?'}. ${vx.length ? `Прививки по плану: ${vx.join('; ')}.` : ''}`);
        }
    }
    if (!lines.length) return null;
    return { key: '"zr": {}', rule: CHRON_RULE, input: lines.join('\n'), tokens: 260 };
}

export function afterPost(i, j, msg) {
    if (!cfg().on) return [];
    const z = j?.zr;
    const out = tick();
    if (!z || typeof z !== 'object') { save(); return out; }
    const c = clock();
    const arr = (v) => (Array.isArray(v) ? v : v ? [v] : []).map(x => (typeof x === 'string' ? x.trim() : x)).filter(Boolean);
    const preg = kids().find(k => k.stage === 'preg');
    const baby = [...kids()].reverse().find(k => k.stage === 'baby');
    if (preg) {
        const p = preg.preg;
        for (const n of arr(z.talk)) { const key = canon(n); p.talk[key] = (p.talk[key] || 0) + 1; }
        for (const n of arr(z.kicks)) { const key = canon(n); p.kicks[key] = (p.kicks[key] || 0) + 1; if (!p.firstKick?.[key]) { p.firstKick = { ...(p.firstKick || {}), [key]: i }; preg.moments.push({ t: `${short(key)} впервые почувствовал${/а$|я$/.test(short(key)) ? 'а' : ''} толчок`, mes: i, at: c.t }); } }
        if (z.ate && p.today) p.today.ate = [...(p.today.ate || []), String(z.ate).slice(0, 80)];
        if (z.vit) { planDone(preg, 'prenatal', i); if (term(preg)?.ow <= 12) planDone(preg, 'folic', i); }
        for (const id of arr(z.plan)) {
            const found = planDone(preg, String(id), i);
            for (const comp of found) out.push(`Врачи нашли: ${comp.name.toLowerCase()}`);
        }
        if (z.doctor) p.events.push({ t: String(z.doctor).slice(0, 160), mes: i, at: c.t, kind: 'doctor' });
        if (z.alarm) p.events.push({ t: String(z.alarm).slice(0, 160), mes: i, at: c.t, kind: 'alarm' });
        if (Number(z.stress) > 0) p.stress = [...(p.stress || []), { v: Number(z.stress), at: c.t }].slice(-20);
        // знание о «сигналах» — если врач в посте, проявившиеся осложнения становятся известными
        if (z.doctor) for (const st of Object.values(p.comps)) if (st.hit && st.stage === 'signs') st.stage = 'known';
        if (z.birth && typeof z.birth === 'object') { birth(preg, { at: c.t, how: String(z.birth.how || ''), name: String(z.birth.name || '') }); preg.moments.push({ t: gw(preg, 'родилась'), mes: i, at: c.t }); }
    }
    const b = z.baby;
    if (baby && b && typeof b === 'object') {
        const t = c.t;
        for (const f of arr(b.fed)) {
            const who = typeof f === 'object' ? f.who : f;
            const how = typeof f === 'object' ? String(f.how || '') : '';
            setNeed(baby, 'food', 100, t);
            if (who) bump(baby, who, /груд/.test(how) ? 4 : 3);
            if (/бутыл/.test(how) && baby.feeding === 'breast') baby.feeding = 'mixed';
        }
        if (b.diaper) { setNeed(baby, 'diaper', 100, t); bump(baby, b.diaper, 1); }
        if (/усн|засн/.test(String(b.sleep || ''))) baby.needs.sleep = { asleep: true, since: t };
        if (/просн/.test(String(b.sleep || ''))) baby.needs.sleep = { asleep: false, since: t };
        for (const n of arr(b.held)) { setNeed(baby, 'hold', 100, t); bump(baby, n, babyState(baby, c)?.comfort < 60 ? 6 : 4); }
        for (const n of arr(b.play)) bump(baby, n, 2);
        if (b.with) baby.with = canon(b.with) || String(b.with);
        if (b.bath) baby.moments.push({ t: 'купание', mes: i, at: t });
        if (b.sick) { baby.health.notes = [...(baby.health.notes || []), { t: String(b.sick), at: t }].slice(-20); }
        for (const id of arr(b.vax)) {
            const v = VACCINES.find(x => x.id === String(id));
            if (!v) continue;
            baby.health.vax[v.id] = { at: t, mes: i };
            baby.health.react = v.id === 'm12' ? { until: t + 12 * DAY, from: t + 7 * DAY, text: v.react } : { until: t + 1.5 * DAY, text: v.react };
        }
        if (b.check) { const ag = age(baby, t); const m = CHECKUPS.reduce((best, x) => (Math.abs(x - ag.months) < Math.abs(best - ag.months) ? x : best), 0); baby.health.checks[m] = { at: t, mes: i }; }
        if (b.first) {
            const txt = String(b.first).toLowerCase();
            const ms = MILESTONES.find(m => baby.miles?.[m.id] && !baby.miles[m.id].seen && txt.split(/\s+/).some(w => w.length > 4 && m.t.includes(w.slice(0, 5))));
            if (ms) baby.miles[ms.id].seen = { mes: i, at: t };
            baby.moments.push({ t: `впервые: ${b.first}`, mes: i, at: t, first: true });
            out.push(`${kidName(baby)}: впервые ${b.first}`);
        }
        if (b.moment) baby.moments.push({ t: String(b.moment).slice(0, 80), mes: i, at: t });
        if (baby.pendingPower && msg && !msg.is_user) { const last = baby.powerLog?.[baby.powerLog.length - 1]; if (last) last.shown = i; baby.pendingPower = ''; }
        if (baby.moments.length > 80) baby.moments.splice(0, baby.moments.length - 80);
        for (const ms of Object.values(baby.miles || {})) if (ms.ready && !ms.seen && !ms.hinted) ms.hinted = i;
    }
    save();
    return out;
}

// ───────────── скрытая заметка модели ─────────────

function present(name) {
    if (!name) return false;
    if (same(name, ctx().name1)) return true;
    try { return (A.worldState().scene?.characters_present || []).some(n => same(n, name)); } catch { return false; }
}

export function promptNote(type) {
    if (!cfg().on || type === 'quiet' || type === 'impersonate') return '';
    const c = clock();
    const out = [];
    for (const k of kids()) {
        if (k.stage === 'preg') { const s = pregNote(k, c); if (s) out.push(s); }
        else if (k.stage === 'baby') { const s = babyNote(k, c); if (s) out.push(s); }
    }
    return out.join('\n');
}

function pregNote(k, c) {
    const tm = term(k, c.t);
    if (!tm || tm.before || !present(k.mother)) return '';
    const w = weekInfo(tm.ow);
    const sy = todaySymptoms(k, tm, c.day);
    const mv = movesNow(tm.ow, k.preg.first !== false);
    const td = k.preg.today?.day === c.day ? k.preg.today : null;
    const comps = Object.entries(k.preg.comps || {}).filter(([, s]) => s.hit && s.stage !== 'resolved' && s.stage !== 'hidden').map(([id, s]) => [compById(id), s]).filter(([x]) => x);
    const known = comps.filter(([, s]) => s.stage === 'known').map(([x]) => `${x.name.toLowerCase()} (${x.care})`);
    const signs = comps.filter(([, s]) => s.stage === 'signs').map(([x]) => x.signs);
    const soon = planItems(k, tm).filter(x => !x.daily && !x.info && x.status === 'now').slice(0, 2).map(x => x.name.toLowerCase());
    const echo = powerEcho(k, tm);
    const sexKnown = (k.preg.plan?.nipt || k.preg.plan?.anatomy || k.lore) && k.genes?.sex?.v;
    const bits = [
        `${short(k.mother)} — ${tm.ow} нед ${tm.od} дн по акушерскому сроку (от зачатия ${tm.ew} нед ${tm.ed} дн; врачи считают по акушерскому), ПДР ${fmtDate(tm.due)}`,
        `плод ~ ${w.size}${w.g ? `, ${w.g >= 1000 ? `${(w.g / 1000).toFixed(1)} кг` : `${w.g} г`}` : ''}${sexKnown ? `, ${sexWord(k)}` : ''}${w.hr ? `, сердце ${w.hr}` : ''}`,
        sy.length ? `сегодня у неё: ${sy.map(s => s.name.toLowerCase()).join(', ')}` : '',
        mv ? `шевеления: ${mv.word.toLowerCase()}` : 'шевелений ещё не чувствует',
        td?.crave?.length ? `тянет на: ${[...td.crave, td.weird].filter(Boolean).join(', ')}` : '',
        td?.avoid?.length ? `воротит от: ${td.avoid.join(', ')}` : '',
        known.length ? `врачи знают: ${known.join('; ')}` : '',
        signs.length ? `проявляется (покажи телом, причину пока никто не знает): ${signs.join('; ')}` : '',
        echo ? `от сил малыша: ${echo}` : '',
        shieldOn(k) ? 'энергия Камней собралась у матки и защищает плод' : '',
        bondFeel(k, c) ? `${short(k.mother)} ${bondFeel(k, c).t}` : '',
        soon.length ? `по плану ведения пора: ${soon.join(', ')}` : '',
    ].filter(Boolean);
    let s = `[Беременность (Зёрнышко): ${bits.join('. ')}. Не всё сразу — к месту, телом и бытом; срок не путать.]`;
    if (cfg().beat > 0 && R() * 100 < cfg().beat) {
        const pool = [...sy.map(x => x.beat), ...(mv ? [mv.beat] : []), ...signs];
        if (pool.length) s += `\n[Симптом — только в этом ответе: где-то в сцене у ${short(k.mother)} ${pool[Math.floor(R() * pool.length)]}. Это тело, а не выбор: без её слов и решений; пусть окружающие заметят и отреагируют.]`;
    }
    return s;
}

function babyNote(k, c) {
    const st = babyState(k, c);
    if (!st) return '';
    const holder = k.with || k.mother;
    if (!present(holder) && !present(k.mother) && !(k.father && present(k.father))) return '';
    const fav = favorite(k);
    const g = k.genes || {};
    const strangerAge = st.ag.months >= 6 && st.ag.months < 20;
    const holderAtt = k.attach?.[canon(holder)] || 0;
    const ill = k.health?.ill?.stage === 'sick' ? ILLNESSES.find(x => x.id === k.health.ill.id) : null;
    const newMile = [...MILESTONES].reverse().find(m => { const x = k.miles?.[m.id]; return x?.ready && !x.seen && c.t - x.ready < 21 * DAY && (x.hinted == null || (ctx().chat?.length || 0) - x.hinted < 30); });
    const serum = (g.serum?.v || []).map(id => SERUM.find(x => x[0] === id)?.[2]).filter(Boolean);
    const bits = [
        `${kidName(k)} — ${sexWord(k)}, ${st.ag.label}${holder ? `, сейчас у ${short(holder)}` : ''}`,
        `прямо сейчас: ${st.cry}`,
        st.food < 40 && !/^Голодн/.test(st.word) ? 'скоро захочет есть' : '',
        !st.asleep && st.awakeMin > st.win[0] && !st.overtired ? `не спит уже ${Math.round(st.awakeMin)} мин — скоро пора укладывать` : '',
        fav ? `любимый человек — ${short(fav)}: на руках у ${short(fav)} затихает быстрее всех` : '',
        strangerAge && holderAtt < 20 && holder ? `${short(holder)} для малыша почти чужой — в этом возрасте это повод для рёва` : '',
        ill ? `болеет — ${illDayText(k, c)}; ${ill.red}` : '',
        newMile ? `по возрасту уже может: ${newMile.t} — если к месту, пусть это случится впервые прямо в сцене` : '',
        k.pendingPower ? `проявление силы (не объясняй, просто пусть случится): ${k.pendingPower}` : '',
        serum.length ? `от сыворотки: ${serum.join('; ')}` : '',
        (g.stones?.v || []).includes('soothe') && present(k.mother) ? `когда малыш на руках у ${short(k.mother)}, её боль от Камней стихает` : '',
    ].filter(Boolean);
    return `[Малыш (Зёрнышко): ${bits.join('. ')}. Если малыш в сцене — пусть ведёт себя строго по возрасту и требует своего; не делай его тише, старше или удобнее, чем он есть.]`;
}

// ───────────── строчка в «Сцене» ─────────────

export function sceneLine() {
    const c = clock();
    const out = [];
    for (const k of kids()) {
        if (k.stage === 'preg') { const tm = term(k, c.t); if (tm && !tm.before) out.push({ k, t: `${tm.ow} нед · ${weekInfo(tm.ow).size}`, warn: Object.values(k.preg.comps || {}).some(s => s.hit && s.stage === 'signs') }); }
        else if (k.stage === 'baby') { const s = babyState(k, c); if (s) out.push({ k, t: `${kidName(k)} · ${s.word}`, warn: s.food < 30 || s.overtired || s.comfort < 50 }); }
    }
    return out;
}

// ───────────── выпуск в карточку ─────────────

export function graduateCard(k) {
    const c = clock();
    const ag = age(k, c.t);
    const g = k.genes || {};
    const name = kidName(k);
    const pw = g.xgene?.v && g.power?.v ? g.power.v : null;
    const temp = g.temp?.type;
    const fav = favorite(k);
    const look = summaryRu(k, { powers: false });
    const desc = [
        `${name} — ${sexWord(k, 'дочь', 'сын')} ${k.mother}${k.father ? ` и ${k.father}` : ''}, ${ag?.label || ''}.`,
        `Внешность: ${look}. Группа крови ${g.blood?.v || '?'}. Рост взрослой ~${g.height?.v || '?'} см.`,
        `Ум: ${IQ_TIER(Number(g.iq?.v || 100))}${g.talents?.v?.length ? `; склонности — ${g.talents.v.join(', ')}` : ''}.`,
        temp ? `Темперамент: ${temp.name.toLowerCase()} — ${temp.d}.` : '',
        pw ? `X-ген: ${pw.name} (уровень ${pw.level}/5), ${pw.early ? 'проявляется рано' : 'в полную силу — к подростковому возрасту'}.` : '',
        g.serum?.v?.length ? `От сыворотки: ${g.serum.v.map(id => SERUM.find(x => x[0] === id)?.[1]).join(', ')}.` : '',
        g.stones?.v?.length ? `След Камней: ${g.stones.v.map(id => STONES.find(x => x[0] === id)?.[1]).join(', ')}.` : '',
    ].filter(Boolean).join('\n');
    const pers = [
        temp ? temp.d : '',
        fav ? `Больше всех привязан${k.genes?.sex?.v === 'M' ? '' : 'а'} к ${fav}.` : '',
        Object.entries(k.attach || {}).map(([n, v]) => `${n}: ${attachWord(v)}`).join('; '),
    ].filter(Boolean).join('\n');
    const miles = MILESTONES.filter(m => k.miles?.[m.id]?.ready).map(m => m.t);
    const entries = [
        ['Гены и силы', [name, 'гены', 'силы', 'X-ген', 'сыворотка'], desc],
        ['Здоровье', [name, 'болел', 'прививк', 'здоровье'], `Родил${k.genes?.sex?.v === 'M' ? 'ся' : 'ась'} ${fmtDate(k.birth?.at, true)} на ${k.birth?.week} неделе: ${k.birth?.weight} г, ${k.birth?.length} см. Болезни: ${(k.health?.hist || []).map(h => ILLNESSES.find(x => x.id === h.id)?.name).filter(Boolean).join(', ') || 'почти не болел'}. Прививки: ${Object.keys(k.health?.vax || {}).length} из календаря.`],
        ['Что умеет', [name, 'умеет', 'говорит', 'ходит'], miles.join('; ')],
        ['Моменты', [name, 'помнит', 'впервые'], (k.moments || []).slice(-25).map(m => m.t).join('; ')],
    ];
    return {
        spec: 'chara_card_v3', spec_version: '3.0',
        data: {
            name, description: desc, personality: pers, scenario: '', first_mes: '', mes_example: '',
            creator_notes: 'Выпуск из Зёрнышка (Life). Гены, привязанности и история — из симуляции.', system_prompt: '', post_history_instructions: '',
            tags: ['Зёрнышко', 'ребёнок'], creator: 'Зёрнышко', character_version: '1', alternate_greetings: [],
            character_book: { name: `${name} — Зёрнышко`, entries: entries.map(([cm, keys, content], i) => ({ id: i, keys, secondary_keys: [], comment: cm, name: cm, content, constant: i === 0, selective: true, insertion_order: 100, enabled: true, position: 'before_char', use_regex: false, extensions: { position: 0, depth: 4, probability: 100, useProbability: true } })) },
            extensions: { zernyshko: JSON.parse(JSON.stringify(k)) },
        },
    };
}

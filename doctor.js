// Врач Зёрнышка: NPC без карточки. Досье (характер, речь, регалии), приём (что по плану, исход на выбор),
// медкарта. Слова врача из постов бота (через Летописца) и из постов игрока (свой разбор) — в карту и в движок.

import * as E from './engine.js';
import { A } from './engine.js';
import { weekInfo, COMPLICATIONS, VACCINES, visitEvery } from './data.js';
import { ic } from './ui.js';

const esc = (v) => A.esc(v);
const DAY = 864e5;
export const dui = { tab: {}, busy: false };

export const ROLES = {
    ob: 'Акушер-гинеколог', mfm: 'Перинатолог (высокий риск)', repro: 'Репродуктолог', peds: 'Педиатр', other: 'Врач',
};
const PREG_ROLES = ['ob', 'mfm', 'repro'];
const MED_PLACE = /клиник|больниц|госпитал|кабинет|медцентр|медицинск|роддом|родильн|приёмн|приемн|лаборатор|hospital|clinic|медпункт|амбулатор|поликлиник/i;

// ───────────── хранилище ─────────────

function M() {
    const m = E.meta();
    if (!Array.isArray(m.docs)) m.docs = [];
    if (!Array.isArray(m.medlog)) m.medlog = [];
    if (!m.visit || typeof m.visit !== 'object') m.visit = { on: 'auto', docId: '', outcome: null, options: [] };
    return m;
}
export const docs = () => M().docs;
export const docById = (id) => docs().find(d => d.id === id) || null;
export const isPregRole = (d) => PREG_ROLES.includes(d?.role);

export function newDoc({ name = '', role = 'ob', notes = '' } = {}) {
    const d = { id: E.uid(), name: name.trim(), role, title: '', place: '', age: '', look: '', character: '', speech: '', manner: '', knows: '', quirks: '', phrases: [], notes, lookEn: '', img: '', created: Date.now() };
    docs().push(d);
    E.save();
    return d;
}

/** Ведущий врач для ребёнка: в беременности — акушер, после родов — педиатр. */
export function docFor(k) {
    if (!k) return docs()[0] || null;
    const want = k.stage === 'preg' ? (d) => isPregRole(d) : (d) => d.role === 'peds';
    return docs().find(want) || null;
}
function kidFor(d) {
    const ks = E.kids();
    if (!d) return ks[ks.length - 1] || null;
    if (isPregRole(d)) return ks.find(k => k.stage === 'preg') || ks[ks.length - 1] || null;
    if (d.role === 'peds') return [...ks].reverse().find(k => k.stage === 'baby') || null;
    return ks[ks.length - 1] || null;
}
const reEsc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const surname = (d) => String(d?.name || '').trim().split(/\s+/).filter(w => w.length > 2).slice(-1)[0] || '';
const nameRe = (d) => { const parts = String(d?.name || '').split(/\s+/).filter(w => w.length > 3).map(w => w.slice(0, Math.max(4, w.length - 2)).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); return parts.length ? new RegExp(parts.join('|'), 'i') : null; };

// ───────────── идёт ли приём ─────────────

function lastTexts(n = 2) {
    const chat = E.ctx().chat || [];
    const out = [];
    for (let i = chat.length - 1; i >= 0 && out.length < n; i--) if (chat[i] && !chat[i].is_system) out.push(String(chat[i].mes || ''));
    return out.join('\n');
}

export function visitNow() {
    const v = M().visit;
    const ds = docs();
    if (!ds.length) return { on: false };
    let d = v.docId ? docById(v.docId) : null;
    const loc = (() => { try { return A.worldState().scene?.location || ''; } catch { return ''; } })();
    const recent = lastTexts(2);
    const placeHit = (x) => { const w = String(x.place || '').split(/\s+/).filter(t => t.length > 4)[0]; return !!(w && loc && new RegExp(reEsc(w), 'i').test(loc)); };
    if (!d) d = ds.find(x => nameRe(x)?.test(recent)) || ds.find(placeHit) || docFor(E.kids().find(k => k.stage === 'preg') || E.kids().slice(-1)[0]) || ds[0];
    if (v.on === 'on') return { on: true, d, why: 'включён вручную' };
    if (v.on === 'off') return { on: false, d };
    if (loc && (MED_PLACE.test(loc) || (d.place && String(d.place).split(/\s+/).some(w => w.length > 4 && loc.toLowerCase().includes(w.toLowerCase()))))) return { on: true, d, why: `место: ${A.placeName ? A.placeName(loc) : loc}` };
    if (nameRe(d)?.test(recent)) return { on: true, d, why: `${surname(d)} в последних постах` };
    return { on: false, d };
}

// ───────────── что на приёме ─────────────

/** Что сегодня положено сделать на приёме: обследования из плана, прививки, осмотр. */
export function agenda(k) {
    const c = E.clock();
    if (!k) return { items: [], routine: '', stamp: '' };
    if (k.stage === 'preg') {
        const tm = E.term(k, c.t);
        if (!tm || tm.before) return { items: [], routine: '', stamp: '' };
        const items = E.planItems(k, tm).filter(x => !x.daily && !x.info && !x.done && (x.status === 'now' || x.status === 'missed') && x.kind !== 'task').map(x => ({ id: x.id, name: x.name, note: x.note }));
        const w = tm.ow;
        const routine = ['давление и пульс', 'вес', 'моча на белок и сахар', w >= 10 ? 'сердцебиение плода допплером' : 'УЗИ при необходимости', w >= 20 ? 'высота дна матки сантиметровой лентой' : '', w >= 24 ? 'шевеления, отёки' : '', w >= 36 ? 'положение плода, шейка матки' : ''].filter(Boolean).join(', ');
        return { items, routine, stamp: `${tm.ow} нед ${tm.od} дн` };
    }
    const ag = E.age(k, c.t);
    if (!ag) return { items: [], routine: '', stamp: '' };
    const items = [
        ...E.checkupList(k, c).filter(x => !x.done && (x.status === 'now' || x.status === 'late')).map(x => ({ id: `check:${x.m}`, name: `Осмотр ${x.label}`, note: 'вес, рост, голова, развитие, рефлексы' })),
        ...E.vaxList(k, c).filter(v => !v.done && (v.status === 'now' || v.status === 'late')).map(v => ({ id: `vax:${v.id}`, name: v.name, note: `после: ${v.react}` })),
    ];
    return { items, routine: 'вес, рост, окружность головы, кожа, родничок, сердце и лёгкие, рефлексы и развитие по возрасту, вопросы родителей', stamp: ag.label };
}

/** Что по кубикам найдут на сегодняшних обследованиях (тайные осложнения, которые откроет этот пункт). */
function diceFinds(k, items) {
    if (k?.stage !== 'preg') return [];
    const ids = new Set(items.map(x => x.id));
    return Object.entries(k.preg.comps || {}).filter(([id, s]) => s.hit && s.stage === 'hidden' && ids.has(COMPLICATIONS.find(c => c.id === id)?.found)).map(([id]) => COMPLICATIONS.find(c => c.id === id)).filter(Boolean);
}

export function nextVisit(d, k) {
    const log = M().medlog.filter(x => x.docId === d?.id && x.kidId === k?.id).slice(-1)[0];
    if (log?.next) return log.next;
    if (!k) return '';
    if (k.stage === 'preg') {
        const tm = E.term(k);
        if (!tm || tm.before) return '';
        const every = visitEvery(tm.ow);
        if (!log) return `раз в ${every === 1 ? 'неделю' : `${every} нед`}`;
        const t = log.at + every * 7 * DAY;
        return E.fmtDate(t);
    }
    const it = E.checkupList(k).find(x => !x.done && x.status !== 'late');
    return it ? `осмотр ${it.label}` : '';
}

// ───────────── досье по чату ─────────────

const FILL_SYSTEM = `Ты — автор ролевой истории. Составь досье врача-NPC, чтобы другая модель могла играть его живым и узнаваемым.
Опирайся на отрывки из истории и заметки автора — это канон, не противоречь ему. Чего нет — дострой правдоподобно для этого мира (Нью-Йорк, вселенная Marvel), без пафоса.
Регалии — реалистичные для США (резидентура, фелловшип, сертификация совета, где работает). Речь — конкретно: темп, словечки, как шутит, как сообщает плохое, на каком языке ругается. phrases — 3–4 её типичные реплики на приёме.
Только JSON: {"name":"","title":"регалии и специализация, 1–2 фразы","place":"где принимает","age":"","look":"внешность, 1–2 фразы","character":"характер, 2–3 фразы","speech":"манера речи","manner":"как ведёт себя с пациентами и с этой семьёй","knows":"что знает о пациентке и её особенностях (силы, Камни, мутация), что держит в секрете","quirks":"мелкие привычки, 1–2","phrases":["","",""],"lookEn":"внешность по-английски для портрета, без имени"}`;

function excerpts(d, max = 10) {
    const re = nameRe(d);
    if (!re) return [];
    const out = [];
    const chat = E.ctx().chat || [];
    for (let i = chat.length - 1; i >= 0 && out.length < max; i--) {
        const t = String(chat[i]?.mes || '').replace(/<[^>]+>/g, ' ');
        const m = t.match(re);
        if (!m) continue;
        const at = t.search(re);
        out.push(`#${i}: …${t.slice(Math.max(0, at - 250), at + 450).replace(/\s+/g, ' ')}…`);
    }
    return out.reverse();
}

export async function fillDoc(d) {
    const k = kidFor(d);
    const ex = excerpts(d);
    const input = [
        `Врач: ${d.name || 'без имени'}; роль — ${ROLES[d.role] || d.role}.`,
        d.notes ? `Заметки автора (главнее всего): ${d.notes}` : '',
        k ? `Пациентка: ${k.mother}${k.father ? `, муж/партнёр ${k.father}` : ''}. ${E.mom(k).notes || ''}` : '',
        ['title', 'place', 'age', 'look', 'character', 'speech', 'manner', 'knows', 'quirks'].filter(f => d[f]).map(f => `Уже известно (${f}): ${d[f]}`).join('\n'),
        ex.length ? `Отрывки из истории, где она есть:\n${ex.join('\n')}` : 'В истории её почти нет — придумай по роли и заметкам.',
    ].filter(Boolean).join('\n\n');
    const j = A.extractJson(await A.askModel([{ role: 'system', content: FILL_SYSTEM }, { role: 'user', content: input }], 1300));
    if (!j) throw new Error('модель ответила не JSON');
    const s = (v) => (typeof v === 'string' ? v.trim() : '');
    for (const f of ['title', 'place', 'age', 'look', 'character', 'speech', 'manner', 'knows', 'quirks', 'lookEn']) if (s(j[f])) d[f] = s(j[f]).slice(0, 600);
    if (!d.name && s(j.name)) d.name = s(j.name);
    if (Array.isArray(j.phrases)) d.phrases = j.phrases.map(s).filter(Boolean).slice(0, 5);
    E.save();
    return d;
}

export async function drawDoc(d) {
    const look = d.lookEn || d.look || `${ROLES[d.role]}, about ${d.age || 40}`;
    const img = await A.drawPicture(`Portrait of a doctor: ${look}. In a white coat or scrubs, in a calm clinic office, soft daylight, three-quarter view, looking at the viewer.\nStyle: ${A.style()}. One person only, no text, no name tag letters.`, { aspect: '4:5', prefix: 'zr_doc' });
    d.img = img;
    E.save();
}

// ───────────── варианты исхода ─────────────

const OPT_SYSTEM = `Ты — сценарист и врач-консультант ролевой истории на русском. Предложи 3–4 варианта, чем закончится этот приём: что увидят и покажут обследования, что скажет врач.
Медицински правдоподобно для срока или возраста, с конкретными цифрами (миллиметры, перцентили, давление, сердцебиение). Учитывай лор (силы, энергию Камней), анамнез и прошлые приёмы — не противоречь им.
Если дан «расклад кубиков» — первый вариант строго по нему и с "dice": true. Остальные — разной тональности: спокойно; тревожно, но поправимо; неожиданно (в том числе от сил ребёнка). Никаких потерь беременности и смертей.
said — 1–2 реплики врача её голосом (по досье). comps — id осложнений из списка, которые этот вариант открывает ("known") или снимает ("resolved"). plan — id пунктов сегодняшнего приёма, которые сделаны.
Только JSON: {"options":[{"title":"3–6 слов","tone":"good|mixed|bad","found":"1–3 фразы","said":"","next":"назначения и следующий приём, коротко","comps":[{"id":"","stage":"known|resolved"}],"plan":[""],"dice":false}]}`;

export async function makeOptions(d, k) {
    const ag = agenda(k);
    const finds = diceFinds(k, ag.items);
    const comps = k?.stage === 'preg' ? Object.entries(k.preg.comps || {}).filter(([, s]) => s.hit && s.stage !== 'resolved') : [];
    const log = M().medlog.filter(x => x.kidId === k?.id).slice(-4);
    const input = [
        `Врач: ${d.name}, ${ROLES[d.role]}. ${d.title || ''}\nХарактер: ${d.character || '—'}\nРечь: ${d.speech || '—'}${d.phrases?.length ? `\nЕё фразы: ${d.phrases.map(x => `«${x}»`).join(' ')}` : ''}`,
        k ? `Пациент: ${k.stage === 'preg' ? `беременность ${k.mother}, ${ag.stamp} (акушерский срок), ${E.sexWord(k)}` : `${E.kidName(k)}, ${E.sexWord(k)}, ${ag.stamp}; родители ${k.mother} и ${k.father || '?'}`}.` : '',
        k ? `Лор и анамнез: ${E.mom(k).notes || '—'}; ${(E.mom(k).acquired || []).join(', ')}` : '',
        k?.stage === 'preg' && E.shieldOn(k) ? 'Энергия Камней собралась у матки и защищает плод; мама чувствует ребёнка через эту связь.' : '',
        k?.genes?.xgene?.v && k.genes.power?.v ? `У ребёнка X-ген: ${k.genes.power.v.name} (сила ${k.genes.power.v.level}/5)${k.genes.power.v.echo ? ', бывают отголоски' : ''}.` : '',
        (k?.genes?.serum?.v || []).length ? `От сыворотки: ${k.genes.serum.v.join(', ')}.` : '',
        `Обычный приём: ${ag.routine}.`,
        ag.items.length ? `Сегодня по плану (id — что): ${ag.items.map(x => `${x.id} — ${x.name} (${x.note})`).join('; ')}` : 'Особых обследований сегодня нет — плановый осмотр.',
        finds.length ? `Расклад кубиков: на этих обследованиях найдут — ${finds.map(c => `${c.id} (${c.name})`).join(', ')}.` : 'Расклад кубиков: на сегодняшних обследованиях — норма.',
        comps.length ? `Уже известно или проявляется: ${comps.map(([id, s]) => `${id} (${COMPLICATIONS.find(c => c.id === id)?.name}, ${s.stage})`).join(', ')}.` : '',
        `Осложнения, которые можно открыть (id — что): ${COMPLICATIONS.map(c => `${c.id} — ${c.name}`).join('; ')}.`,
        log.length ? `Прошлые приёмы:\n${log.map(x => `- ${x.stamp}: ${[x.found, x.said].filter(Boolean).join(' / ')}`).join('\n')}` : '',
    ].filter(Boolean).join('\n\n');
    const j = A.extractJson(await A.askModel([{ role: 'system', content: OPT_SYSTEM }, { role: 'user', content: input }], 1800));
    const s = (v) => (typeof v === 'string' ? v.trim() : '');
    const list = (Array.isArray(j?.options) ? j.options : []).filter(o => s(o?.title)).slice(0, 4).map(o => ({
        id: E.uid(), title: s(o.title).slice(0, 60), tone: ['good', 'mixed', 'bad'].includes(o.tone) ? o.tone : 'mixed', found: s(o.found).slice(0, 500), said: s(o.said).slice(0, 400), next: s(o.next).slice(0, 200),
        comps: (Array.isArray(o.comps) ? o.comps : []).filter(x => COMPLICATIONS.some(c => c.id === x?.id)).map(x => ({ id: x.id, stage: x.stage === 'resolved' ? 'resolved' : 'known' })),
        plan: (Array.isArray(o.plan) ? o.plan : []).map(s).filter(id => ag.items.some(x => x.id === id)), dice: !!o.dice,
    }));
    if (!list.length) throw new Error('вариантов не вышло — попробуй ещё раз');
    const v = M().visit;
    v.options = list; v.optFor = { docId: d.id, kidId: k?.id, at: Date.now() };
    E.save();
    return list;
}

export function pickOption(id) {
    const v = M().visit;
    const o = v.options.find(x => x.id === id);
    if (!o) return;
    v.outcome = { ...o, docId: v.optFor?.docId, kidId: v.optFor?.kidId, picked: Date.now() };
    E.save();
}
export function customOutcome(text, d, k) {
    const v = M().visit;
    v.outcome = { id: E.uid(), title: 'Своё решение', tone: 'mixed', found: text, said: '', next: '', comps: [], plan: [], custom: true, docId: d?.id, kidId: k?.id, picked: Date.now() };
    E.save();
}

// ───────────── применить, когда приём случился ─────────────

function applyPlan(k, ids, mes) {
    const found = [];
    for (const id of ids) {
        if (k.stage === 'preg') found.push(...E.planDone(k, id, mes));
        else if (id.startsWith('check:')) { k.health.checks[Number(id.slice(6))] = { at: E.clock().t, mes }; }
        else if (id.startsWith('vax:')) {
            const vid = id.slice(4); const vv = VACCINES.find(x => x.id === vid); const t = E.clock().t;
            k.health.vax[vid] = { at: t, mes };
            k.health.react = vid === 'm12' ? { until: t + 12 * DAY, text: vv?.react || '' } : { until: t + 1.5 * DAY, text: vv?.react || '' };
        }
    }
    return found;
}

function applyComps(k, comps, { override = [] } = {}) {
    if (k.stage !== 'preg') return;
    const w = E.term(k)?.ow || 0;
    const named = new Set(comps.map(x => x.id));
    for (const x of comps) {
        const st = k.preg.comps[x.id] = k.preg.comps[x.id] || {};
        if (x.stage === 'resolved') { st.stage = 'resolved'; continue; }
        Object.assign(st, { hit: true, stage: 'known', week: st.week || w, at: st.at || Date.now(), foundAt: E.clock().t });
    }
    // автор выбрал исход, где этого нет, — значит, кубик отменён
    for (const c of override) if (!named.has(c.id) && k.preg.comps[c.id]) k.preg.comps[c.id].stage = 'resolved';
}

function addLog(entry) {
    const m = M();
    m.medlog.push({ id: E.uid(), at: E.clock().t, day: E.clock().day, ...entry });
    if (m.medlog.length > 200) m.medlog.splice(0, m.medlog.length - 200);
}

/** Приём случился (по посту бота, игрока или вручную). */
export function visitHappened({ src, said = '', found = '', plan = [], comps = [], next = '', ok = false, mes = null, docName = '' }) {
    const m = M();
    const vn = visitNow();
    const out = m.visit.outcome;
    const d = (out && docById(out.docId)) || docs().find(x => docName && nameRe(x)?.test(docName)) || vn.d || docs()[0];
    const k = (out && E.kidById(out.kidId)) || kidFor(d);
    if (!k) return [];
    const ag = agenda(k);
    const notes = [];
    const ids = [...new Set([...plan, ...(out?.plan || [])])].filter(Boolean);
    const revealed = applyPlan(k, ids, mes);
    if (out) {
        applyComps(k, out.comps || [], { override: out.custom ? [] : revealed });
        notes.push(`исход «${out.title}» в карте`);
    } else {
        applyComps(k, comps, { override: ok ? revealed : [] });
        for (const c of revealed) if (!ok && !comps.some(x => x.id === c.id && x.stage === 'resolved')) notes.push(`нашли: ${c.name.toLowerCase()}`);
    }
    addLog({
        docId: d?.id || '', kidId: k.id, stamp: ag.stamp, src, mes,
        done: ids.map(id => ag.items.find(x => x.id === id)?.name || id),
        found: [out?.found, found].filter(Boolean).join(' '), said: [out?.said, said].filter(Boolean).join(' '), next: next || out?.next || '',
        title: out?.title || '',
    });
    m.visit.outcome = null;
    m.visit.options = [];
    E.save();
    return notes;
}

// ───────────── посты игрока: что сказала врач ─────────────

const USER_SYSTEM = `Из поста игрока в ролевой истории вытащи, что в нём было про врача и медицину. Только то, что прямо написано (игрок может пересказывать слова врача от себя).
Только JSON: {"visit":false,"doctor":"кто из врачей","said":"что сказал врач, 5–25 слов","found":"что показали осмотр или анализы, коротко","plan":["id сделанного из списка"],"comps":[{"id":"","stage":"known|resolved"}],"next":"когда следующий приём, если сказано","ok":false}
visit — был приём или разговор с врачом. ok — врач сказал, что всё в порядке. Ничего такого — {"visit":false}.`;

let userBusy = false;
export async function onUserPost(i) {
    if (!E.cfg().on || userBusy || !docs().length) return [];
    const msg = (E.ctx().chat || [])[i];
    if (!msg?.is_user) return [];
    const text = String(msg.mes || '').replace(/<[^>]+>/g, ' ');
    const vn = visitNow();
    const hit = vn.on || docs().some(d => nameRe(d)?.test(text)) || /врач|доктор|осмотр|узи|скрининг|анализ|педиатр|прививк|ктг|допплер|сердцебиен/i.test(text);
    if (!hit) return [];
    const k = kidFor(vn.d);
    if (!k) return [];
    const ag = agenda(k);
    userBusy = true;
    try {
        const input = [
            `Врачи: ${docs().map(d => `${d.name} (${ROLES[d.role]})`).join('; ')}.`,
            ag.items.length ? `Пункты приёма (id — что): ${ag.items.map(x => `${x.id} — ${x.name}`).join('; ')}` : '',
            k.stage === 'preg' ? `Осложнения (id — что): ${COMPLICATIONS.map(c => `${c.id} — ${c.name}`).join('; ')}` : '',
            `ПОСТ:\n${text.slice(0, 6000)}`,
        ].filter(Boolean).join('\n\n');
        const j = A.extractJson(await A.askModel([{ role: 'system', content: USER_SYSTEM }, { role: 'user', content: input }], 500));
        if (!j || !j.visit) return [];
        const s = (v) => (typeof v === 'string' ? v.trim() : '');
        const notes = visitHappened({
            src: 'user', mes: i, said: s(j.said), found: s(j.found), next: s(j.next), ok: !!j.ok, docName: s(j.doctor),
            plan: (Array.isArray(j.plan) ? j.plan : []).map(s).filter(id => ag.items.some(x => x.id === id)),
            comps: (Array.isArray(j.comps) ? j.comps : []).filter(x => COMPLICATIONS.some(c => c.id === x?.id)).map(x => ({ id: x.id, stage: x.stage === 'resolved' ? 'resolved' : 'known' })),
        });
        return ['Врач: записала в карту из твоего поста', ...notes];
    } catch (e) { console.warn('[Зёрнышко] врач из поста', e); return []; } finally { userBusy = false; }
}

/** После поста бота: Летописец уже сказал, был ли приём (z.doctor / z.plan). */
/** Зовётся ДО движка: выбранный исход должен успеть отменить то, что откроет план. */
export function onBotPost(i, z) {
    if (!z || typeof z !== 'object' || !docs().length) return [];
    const plan = (Array.isArray(z.plan) ? z.plan : []).filter(Boolean).map(String);
    const vax = (Array.isArray(z.baby?.vax) ? z.baby.vax : []).filter(Boolean).map(x => `vax:${x}`);
    if (!z.doctor && !plan.length && !vax.length && !z.baby?.check) return [];
    if (M().visit.outcome) return visitHappened({ src: 'bot', mes: i, said: String(z.doctor || ''), plan: [...plan, ...vax] });
    const d = visitNow().d;
    const k = kidFor(d);
    if (!k) return [];
    const ag = agenda(k);
    addLog({ docId: d?.id || '', kidId: k.id, stamp: ag.stamp, src: 'bot', mes: i, done: [...plan, ...vax].map(id => ag.items.find(x => x.id === id)?.name || id.replace(/^vax:/, '')), found: '', said: String(z.doctor || ''), next: '' });
    E.save();
    return [];
}

// ───────────── заметка модели ─────────────

export function promptDoc() {
    if (!E.cfg().on) return '';
    const vn = visitNow();
    if (!vn.on || !vn.d) return '';
    const d = vn.d;
    const k = kidFor(d);
    const ag = agenda(k);
    const out = M().visit.outcome;
    const finds = k ? diceFinds(k, ag.items) : [];
    const log = M().medlog.filter(x => x.docId === d.id).slice(-3);
    const bits = [
        `ведёт ${d.name || 'врач'} — ${ROLES[d.role]}${d.title ? `; ${d.title}` : ''}${d.place ? `; принимает: ${d.place}` : ''}`,
        d.look ? `внешность: ${d.look}` : '',
        d.character ? `характер: ${d.character}` : '',
        d.speech ? `как говорит: ${d.speech}` : '',
        d.phrases?.length ? `её фразы для примера: ${d.phrases.map(x => `«${x}»`).join(' ')}` : '',
        d.manner ? `с пациентами: ${d.manner}` : '',
        d.knows ? `что знает: ${d.knows}` : '',
        d.quirks ? `привычки: ${d.quirks}` : '',
        log.length ? `в её карте: ${log.map(x => `${x.stamp} — ${[x.found, x.said].filter(Boolean).join(' ').slice(0, 160)}`).join('; ')}` : '',
        k ? `пациент: ${k.stage === 'preg' ? `${k.mother}, ${ag.stamp} акушерского срока` : `${E.kidName(k)}, ${ag.stamp}`}` : '',
        ag.routine ? `обычный приём: ${ag.routine}` : '',
        ag.items.length ? `сегодня по плану: ${ag.items.map(x => x.name.toLowerCase()).join(', ')}` : '',
        out ? `ИСХОД УЖЕ РЕШЁН АВТОРОМ — придерживайся его: ${out.found}${out.said ? ` Скажет примерно так: «${out.said}»` : ''}${out.next ? ` Дальше: ${out.next}.` : ''}`
            : finds.length ? `на сегодняшних обследованиях находят: ${finds.map(c => `${c.name.toLowerCase()} (${c.signs})`).join('; ')} — сообщи это так, как сообщила бы она`
                : ag.items.length ? 'на сегодняшних обследованиях — норма; не выдумывай новых диагнозов' : '',
    ].filter(Boolean);
    return `[Приём у врача (Зёрнышко): ${bits.join('. ')}. Играй её живым человеком: руки, приборы, цифры на экране, её реплики — её голосом; не говори и не решай за ${E.userName() || 'игрока'}.]`;
}

// ───────────── интерфейс ─────────────

const TONE = { good: 'спокойно', mixed: 'тревожно, но поправимо', bad: 'плохие новости' };
const SRC = { bot: 'из поста бота', user: 'из твоего поста', manual: 'вручную', pick: 'исход' };

export function docRow(cur) {
    if (!E.cfg().on) return '';
    const list = docs();
    const vn = visitNow();
    const btns = list.map(d => `<button class="lf-pers pet zr-pers zr-doc${cur === `zr:doc:${d.id}` ? ' on' : ''}" data-zact="doc-open" data-id="${esc(d.id)}"><span class="lf-ava md">${d.img ? `<img src="${esc(d.img)}" alt="">` : ''}<i>${ic('hospital')}</i></span><span class="lf-pers-n">${esc(A.shortName(surname(d) || d.name || 'Врач'))}</span><span class="lf-pers-m">${vn.on && vn.d?.id === d.id ? 'приём' : esc((ROLES[d.role] || '').split(/[ -]/)[0].toLowerCase())}</span></button>`).join('');
    const needPeds = E.kids().some(k => k.stage === 'baby') && !list.some(d => d.role === 'peds');
    const add = E.kids().length && (!list.length || needPeds) ? `<button class="lf-pers add zr-pers" data-zact="doc-new" data-v="${needPeds ? 'peds' : 'ob'}"><span class="lf-ava md"><i>${ic('hospital')}</i></span><span class="lf-pers-n">${needPeds ? 'Педиатр' : 'Врач'}</span></button>` : '';
    return btns + add;
}

export function sceneChip() {
    const vn = visitNow();
    if (!vn.on || !vn.d) return '';
    return `<button class="lf-chip warn" data-zact="doc-open" data-id="${esc(vn.d.id)}">${ic('hospital')} Приём · ${esc(surname(vn.d) || vn.d.name)}</button>`;
}

export function renderDoc(id) {
    const d = docById(id);
    if (!d) return '<div class="lf-empty small">Врача нет.</div>';
    const tab = dui.tab[d.id] || 'visit';
    const hero = `<section class="lf-pethero zr-hero${d.img ? ' lf-fit' : ''}"${A.fitAttr(d.img)}>${d.img ? `<i class="lf-fit-i" data-zact="zoom" data-src="${esc(d.img)}"></i>` : `<span class="lf-pethero-ic">${ic('hospital')}</span>`}
        <button class="lf-glass" data-zact="doc-draw" data-id="${esc(d.id)}">${ic('camera')} Портрет</button>
        <div class="lf-pethero-t"><h2>${esc(d.name || 'Врач')}</h2><span>${esc(ROLES[d.role] || '')}${d.place ? ` · ${esc(d.place)}` : ''}</span></div></section>`;
    const seg = `<div class="lf-seg zr-seg">${[['visit', 'Приём'], ['card', 'Карта'], ['file', 'Досье']].map(([k2, t]) => `<button class="${tab === k2 ? 'on' : ''}" data-zact="doc-tab" data-id="${esc(d.id)}" data-v="${k2}">${t}</button>`).join('')}</div>`;
    const body = tab === 'card' ? cardTab(d) : tab === 'file' ? fileTab(d) : visitTab(d);
    return `<div class="zr">${hero}${seg}${body}</div>`;
}

function visitTab(d) {
    const m = M();
    const vn = visitNow();
    const k = kidFor(d);
    const ag = agenda(k);
    const out = m.visit.outcome;
    const opts = m.visit.optFor?.docId === d.id ? m.visit.options : [];
    const onHere = vn.on && vn.d?.id === d.id;
    const next = nextVisit(d, k);
    const empty = !d.character && !d.speech;
    return `
    ${empty ? `<div class="lf-note">${ic('notes')} Досье пустое — <button class="zr-link" data-zact="doc-tab" data-id="${esc(d.id)}" data-v="file">заполнить по чату</button>, чтобы модель играла её узнаваемо.</div>` : ''}
    <div class="zr-state${onHere ? ' warn' : ''}"><b>${onHere ? 'Приём идёт' : m.visit.on === 'off' ? 'Приём выключен' : 'Не на приёме'}</b><span>${onHere ? esc(vn.why || '') : m.visit.on === 'off' ? 'Стоит «Нет» — врач молчит даже в клинике. Нажми «Сам», чтобы включался по месту и имени, или «Идёт» — прямо сейчас.' : 'Включится сам, когда сцена в клинике или её имя прозвучит в посте.'}</span></div>
    <div class="lf-hint">Приём: «Сам» — по месту и имени, «Идёт» — включить сейчас, «Нет» — выключить.</div>
    <div class="lf-seg zr-seg">${[['auto', 'Сам'], ['on', 'Идёт'], ['off', 'Нет']].map(([k2, t]) => `<button class="${(m.visit.on || 'auto') === k2 ? 'on' : ''}" data-zact="doc-visit" data-id="${esc(d.id)}" data-v="${k2}">${t}</button>`).join('')}</div>
    ${k ? `${A.sec('Сегодня на приёме', esc(ag.stamp))}
    <div class="lf-hint">${esc(A.cap(ag.routine || ''))}.</div>
    ${ag.items.length ? `<div class="lf-list">${ag.items.map(x => `<div class="lf-row zr-row now">${ic('check')}<span><b>${esc(x.name)}</b><small class="lf-sub">${esc(x.note)}</small></span></div>`).join('')}</div>` : '<div class="lf-hint">Особых обследований сейчас нет — плановый осмотр.</div>'}
    ${next ? `<div class="lf-hint">${ic('calendar', 'sm')} Следующий приём: ${esc(next)}</div>` : ''}` : '<div class="lf-hint">Пациента под её роль пока нет.</div>'}
    ${A.sec('Исход', out ? 'выбран' : 'на выбор')}
    ${out ? `${optCard(out, true)}<div class="lf-actions"><button class="lf-btn" data-zact="doc-done" data-id="${esc(d.id)}">${ic('check')} Уже было — в карту</button><button class="lf-btn ghost" data-zact="doc-unpick" data-id="${esc(d.id)}">${ic('x')} Отменить</button></div>
        <div class="lf-hint">Исход уходит модели, пока идёт приём. Как только в посте прозвучит врач — запишется в карту сам.</div>`
        : `${opts.map(o => optCard(o)).join('')}
        <button class="lf-btn${opts.length ? '' : ' primary'} full" data-zact="doc-opts" data-id="${esc(d.id)}">${ic('dice')} ${opts.length ? 'Другие варианты' : 'Предложить варианты'}</button>
        ${fld2('Или своё', `<textarea data-zin="custom" rows="2" placeholder="ТВП 1,4 мм, всё чисто; Васкез шутит про упрямую девицу"></textarea>`)}
        <button class="lf-btn ghost full" data-zact="doc-custom" data-id="${esc(d.id)}">${ic('check')} Так и будет</button>
        <div class="lf-hint">Без выбора — врач скажет то, что выпало на кубиках (или «норма»).</div>`}`;
}
const fld2 = (label, html) => `<div class="lf-field"><label>${label}</label>${html}</div>`;

function optCard(o, chosen = false) {
    return `<div class="zr-card zr-opt t-${o.tone}${chosen ? ' chosen' : ''}">
        <div class="zr-card-h">${ic(o.dice ? 'dice' : o.tone === 'good' ? 'heart' : o.tone === 'bad' ? 'activity' : 'sparkles')}<b>${esc(o.title)}</b><small>${o.dice ? 'как выпало' : esc(TONE[o.tone] || '')}</small></div>
        ${o.found ? `<p>${esc(o.found)}</p>` : ''}${o.said ? `<p class="zr-it">«${esc(o.said)}»</p>` : ''}${o.next ? `<p class="zr-next">${ic('calendar', 'sm')} ${esc(o.next)}</p>` : ''}
        ${chosen ? '' : `<button class="lf-btn primary full" data-zact="doc-pick" data-v="${esc(o.id)}">${ic('check')} Этот</button>`}
    </div>`;
}

function cardTab(d) {
    const list = [...M().medlog].filter(x => x.docId === d.id || !x.docId).reverse().slice(0, 60);
    if (!list.length) return '<div class="lf-empty small">Карта пустая. Приёмы запишутся сами — из постов бота, из твоих и из выбранных исходов.</div>';
    return `<div class="lf-timeline">${list.map(x => `<${x.mes != null ? `button data-act="jump" data-mes="${x.mes}"` : 'div'} class="lf-tl"><span class="lf-tl-dot${x.src === 'user' ? ' on' : ''}"></span><span class="lf-tl-txt"><b>${esc(x.title || x.done?.join(', ') || 'Приём')}</b>${x.found ? `<span class="zr-tl-p">${esc(x.found)}</span>` : ''}${x.said ? `<span class="zr-tl-p zr-it">«${esc(x.said)}»</span>` : ''}<small>${esc(E.fmtDate(x.at))} · ${esc(x.stamp || '')} · ${esc(SRC[x.src] || '')}${x.next ? ` · дальше: ${esc(x.next)}` : ''}${x.mes != null ? ` · #${x.mes}` : ''}</small></span></${x.mes != null ? 'button' : 'div'}>`).join('')}</div>`;
}

function fileTab(d) {
    const row = (l, v) => (v ? `<div class="zr-file-r"><small>${l}</small><p>${esc(v)}</p></div>` : '');
    return `
    <div class="lf-actions"><button class="lf-btn primary" data-zact="doc-fill" data-id="${esc(d.id)}">${ic('sparkles')} Заполнить по чату</button><button class="lf-btn" data-zact="doc-edit" data-id="${esc(d.id)}">${ic('pencil')} Править</button></div>
    <div class="zr-file">
        ${row('Регалии', d.title)}${row('Где принимает', d.place)}${row('Возраст', d.age)}${row('Внешность', d.look)}${row('Характер', d.character)}${row('Как говорит', d.speech)}
        ${d.phrases?.length ? `<div class="zr-file-r"><small>Её фразы</small>${d.phrases.map(x => `<p class="zr-it">«${esc(x)}»</p>`).join('')}</div>` : ''}
        ${row('С пациентами', d.manner)}${row('Что знает', d.knows)}${row('Привычки', d.quirks)}${row('Заметки автора', d.notes)}
    </div>
    ${!d.character ? '<div class="lf-hint">Модель прочитает, где она появлялась в чате, и твои заметки — и соберёт досье. Потом поправишь руками.</div>' : ''}`;
}

export function docSheet(d) {
    const f = (key, label, rows = 2, ph = '') => fld2(label, `<textarea data-zin="${key}" rows="${rows}" placeholder="${esc(ph)}">${esc(Array.isArray(d?.[key]) ? d[key].join('\n') : d?.[key] || '')}</textarea>`);
    A.openSheet(`${ic('hospital')} ${d ? esc(d.name || 'Врач') : 'Новый врач'}`, `
        ${fld2('Имя', `<input type="text" data-zin="name" value="${esc(d?.name || '')}" placeholder="доктор Габриэла Васкез">`)}
        ${fld2('Роль', `<div class="lf-chips wrap" data-zgrp="role">${Object.entries(ROLES).map(([k2, t]) => `<button class="lf-chip${(d?.role || 'ob') === k2 ? ' on' : ''}" data-zact="chip" data-v="${k2}">${esc(t)}</button>`).join('')}</div>`)}
        ${f('notes', 'Заметки автора <small>(для «Заполнить по чату» — главнее всего)</small>', 3, 'знает про Камни и мутацию, подписала NDA с А.И.М.; говорит быстро, вставляет испанский')}
        ${d ? `${f('title', 'Регалии')}${f('place', 'Где принимает', 1)}${f('age', 'Возраст', 1)}${f('look', 'Внешность')}${f('character', 'Характер', 3)}${f('speech', 'Как говорит', 3)}${f('phrases', 'Её фразы <small>(по одной в строке)</small>', 3)}${f('manner', 'С пациентами')}${f('knows', 'Что знает')}${f('quirks', 'Привычки')}${f('lookEn', 'Внешность для портрета (англ.)')}` : ''}
        <button class="lf-btn primary serif full big" data-zact="doc-save" data-id="${esc(d?.id || '')}">${ic('check')} ${d ? 'Сохранить' : 'Завести и заполнить по чату'}</button>
        ${d ? `<button class="lf-btn ghost full" data-zact="doc-del" data-id="${esc(d.id)}">${ic('trash')} ${dui.del === d.id ? 'Точно убрать? Тапни ещё раз' : 'Убрать врача'}</button>` : ''}`);
}

// ───────────── клики ─────────────

export async function onDocClick(act, el, box, helpers) {
    const { val, readChips, rerender } = helpers;
    const d = el.dataset.id ? docById(el.dataset.id) : null;
    const v = el.dataset.v;
    switch (act) {
        case 'doc-open': A.ui.who = `zr:doc:${el.dataset.id}`; A.ui.tab = 'person'; A.closeSheet(); if (!A.ui.open) A.openHub('person'); else A.render(); return true;
        case 'doc-new': A.closeSheet(); setTimeout(() => { docSheet(null); const r = document.querySelector(`#lf-app [data-zgrp="role"] [data-v="${v || 'ob'}"]`); if (r) { r.parentElement.querySelectorAll('.on').forEach(b => b.classList.remove('on')); r.classList.add('on'); } }, 230); return true;
        case 'doc-tab': dui.tab[d.id] = v; A.render(); return true;
        case 'doc-edit': docSheet(d); return true;
        case 'doc-save': {
            const name = val(box, 'name');
            const role = readChips(box, 'role')[0] || 'ob';
            if (!d) {
                const nd = newDoc({ name, role, notes: val(box, 'notes') });
                A.closeSheet(); A.ui.who = `zr:doc:${nd.id}`; dui.tab[nd.id] = 'file'; rerender();
                A.toast('info', `Собираю досье ${A.esc(name || 'врача')} по чату…`, '✦ Зёрнышко', { timeOut: 3500 });
                fillDoc(nd).then(() => { A.toast('success', 'Досье готово — проверь', '✦ Зёрнышко'); rerender(); }).catch(e => A.toast('warning', A.esc(String(e?.message || e)), '✦ Зёрнышко', { timeOut: 8000 }));
                return true;
            }
            d.name = name; d.role = role;
            for (const f of ['notes', 'title', 'place', 'age', 'look', 'character', 'speech', 'manner', 'knows', 'quirks', 'lookEn']) d[f] = val(box, f);
            d.phrases = val(box, 'phrases').split('\n').map(x => x.trim()).filter(Boolean);
            E.save(); A.closeSheet(); rerender(); return true;
        }
        case 'doc-del':
            if (dui.del !== d.id) { dui.del = d.id; docSheet(d); return true; }
            M().docs = docs().filter(x => x.id !== d.id); dui.del = ''; A.ui.who = ''; E.save(); A.closeSheet(); rerender(); return true;
        case 'doc-fill': await A.withBusy(el, () => fillDoc(d), 'Читаю чат…'); rerender(); return true;
        case 'doc-draw': await A.withBusy(el, () => drawDoc(d)); rerender(); return true;
        case 'doc-visit': M().visit.on = v; M().visit.docId = v === 'on' ? d.id : ''; E.save(); rerender(); return true;
        case 'doc-opts': await A.withBusy(el, () => makeOptions(d, kidFor(d)), 'Думаю…'); rerender(); return true;
        case 'doc-pick': pickOption(v); rerender(); A.toast('info', 'Исход уйдёт модели на приёме', '✦ Зёрнышко', { timeOut: 2200 }); return true;
        case 'doc-unpick': M().visit.outcome = null; E.save(); rerender(); return true;
        case 'doc-custom': { const t = val(box || el.closest('.zr'), 'custom'); if (!t) { A.toast('warning', 'Напиши, что будет'); return true; } customOutcome(t, d, kidFor(d)); rerender(); return true; }
        case 'doc-done': { const notes = visitHappened({ src: 'manual' }); if (notes.length) A.toast('info', A.esc(notes.join(' · ')), '✦ Зёрнышко'); dui.tab[d.id] = 'card'; rerender(); return true; }
    }
    return false;
}

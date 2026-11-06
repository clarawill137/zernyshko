// Интерфейс Зёрнышка внутри Life: кнопка в «Персонаже», карточка ребёнка с вкладками, листы правки.
// Кнопки — data-zact (Life их не трогает), файлы — data-zfile.

import * as E from './engine.js';
import { A } from './engine.js';
import { weekInfo, usView, movesNow, PLAN, VACCINES, MILESTONES, DOMAIN, ILLNESSES, sleepNorm, feedWord, pct, visitEvery } from './data.js';
import { ROWS, GROUPS, EYES, HAIR, TEXTURE, SKIN, BUILD, TEMP, TALENTS, POWER_KINDS, POWER_FAMILIES, SERUM, STONES, IQ_TIER, tempType, rollRow, rollAll, ANALYZE_SYSTEM, analyzeInput, normalizeProfile, lookEn, faceEn, isHedyBucky, loreFixed } from './genes.js';

const esc = (v) => A.esc(v);
const zui = { tab: {}, risks: false, del: '' };
export const _zui = zui;

// ───────────── иконки (свои — в том же тонком стиле) ─────────────
const OWN = {
    sprout: '<path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>',
    dice: '<rect width="18" height="18" x="3" y="3" rx="3"/><circle cx="8.5" cy="8.5" r=".8" fill="currentColor"/><circle cx="15.5" cy="15.5" r=".8" fill="currentColor"/><circle cx="15.5" cy="8.5" r=".8" fill="currentColor"/><circle cx="8.5" cy="15.5" r=".8" fill="currentColor"/><circle cx="12" cy="12" r=".8" fill="currentColor"/>',
    dna: '<path d="M2 15c6.667-6 13.333 0 20-6"/><path d="M9 22c1.798-1.998 2.518-3.995 2.807-5.993"/><path d="M15 2c-1.798 1.998-2.518 3.995-2.807 5.993"/><path d="m17 6-2.5-2.5"/><path d="m14 8-1-1"/><path d="m7 18 2.5 2.5"/><path d="m3.5 14.5.5.5"/><path d="m20 9 .5.5"/><path d="m6.5 12.5 1 1"/><path d="m16.5 10.5 1 1"/><path d="m10 16 1.5 1.5"/>',
    scan: '<path d="M12 21 3.5 7.5a12 12 0 0 1 17 0Z"/><path d="M9.5 13.5c1.4 1 3.6 1 5 0"/><circle cx="12" cy="11" r="1.4"/>',
    bottle: '<path d="M10 2h4"/><path d="M9 5h6l-1-3h-4z"/><rect x="8" y="5" width="8" height="17" rx="3"/><path d="M8 11h3"/><path d="M8 15h3"/>',
    syringe: '<path d="m18 2 4 4"/><path d="m17 7 3-3"/><path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5"/><path d="m9 11 4 4"/><path d="m5 19-3 3"/><path d="m14 4 6 6"/>',
    thermo: '<path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/>',
    ruler: '<path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/><path d="m17.5 15.5 2-2"/>',
    unlock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    pill: '<path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>',
    drop: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
};
export function ic(name, cls = '') {
    if (!OWN[name]) return A.icon(name, cls);
    return `<svg class="lf-i${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${OWN[name]}</svg>`;
}

const seg = (items, cur, act, extra = '') => `<div class="lf-seg zr-seg">${items.map(([k, t]) => `<button class="${cur === k ? 'on' : ''}" data-zact="${act}" data-v="${esc(k)}"${extra}>${t}</button>`).join('')}</div>`;
const chips = (grp, list, cur, { multi = false } = {}) => `<div class="lf-chips wrap" data-zgrp="${grp}"${multi ? ' data-multi="1"' : ''}>${list.map(([v, t]) => `<button class="lf-chip${(multi ? (cur || []).includes(v) : cur === v) ? ' on' : ''}" data-zact="chip" data-v="${esc(v)}">${esc(t)}</button>`).join('')}</div>`;
const pairs = (arr) => arr.map(x => [x, x]);
const fld = (label, html) => `<div class="lf-field"><label>${label}</label>${html}</div>`;
const meter = (v) => `<i class="lf-meter"><b style="width:${Math.max(0, Math.min(100, v))}%"></b></i>`;
const dateIn = (t) => (t ? new Date(t - new Date(t).getTimezoneOffset() * 6e4).toISOString().slice(0, 10) : '');

function heroImg(k) {
    if (k.stage === 'preg') return k.preg?.us?.slice(-1)[0]?.img || '';
    return k.img || k.album?.slice(-1)[0]?.img || '';
}

// ───────────── кнопка в «Персонаже» и строчка в «Сцене» ─────────────

export function personRow(cur) {
    if (!E.cfg().on) return '';
    const list = E.kids();
    const c = E.clock();
    const btn = (k) => {
        const img = heroImg(k);
        let mini = '';
        if (k.stage === 'preg') { const tm = E.term(k, c.t); mini = tm && !tm.before ? `${tm.ow} нед` : 'срок?'; }
        else { const s = E.babyState(k, c); mini = s ? s.word : ''; }
        return `<button class="lf-pers pet zr-pers${cur === `zr:${k.id}` ? ' on' : ''}" data-zact="open" data-id="${esc(k.id)}"><span class="lf-ava md">${img ? `<img src="${esc(img)}" alt="">` : ''}<i>${ic(k.stage === 'preg' ? 'sprout' : 'baby')}</i></span><span class="lf-pers-n">${esc(A.shortName(E.kidName(k)))}</span><span class="lf-pers-m">${esc(mini)}</span></button>`;
    };
    return list.map(btn).join('') + (list.length ? '' : `<button class="lf-pers add zr-pers" data-zact="new"><span class="lf-ava md"><i>${ic('sprout')}</i></span><span class="lf-pers-n">Малыш</span></button>`);
}

export function sceneHtml() {
    if (!E.cfg().on) return '';
    const l = E.sceneLine();
    if (!l.length) return '';
    return `<div class="lf-chips wrap">${l.map(x => `<button class="lf-chip${x.warn ? ' warn' : ''}" data-zact="open" data-id="${esc(x.k.id)}">${ic(x.k.stage === 'preg' ? 'sprout' : 'baby')} ${esc(x.t)}</button>`).join('')}</div>`;
}

// ───────────── карточка ребёнка ─────────────

export function renderKid(id) {
    const k = E.kidById(id);
    if (!k) return `<div class="lf-empty small">${ic('sprout', 'xl')}Такого малыша в этом чате нет.<button class="lf-btn primary" data-zact="new">${ic('plus')} Завести</button></div>`;
    try { E.tick(); } catch (e) { console.warn('[Зёрнышко]', e); }
    const c = E.clock();
    const preg = k.stage === 'preg';
    const tabs = preg ? [['now', 'Сейчас'], ['plan', 'План'], ['genes', 'Гены'], ['us', 'УЗИ'], ['bond', 'Связь']]
        : [['now', 'Сейчас'], ['health', 'Здоровье'], ['grow', 'Развитие'], ['genes', 'Гены'], ['bond', 'Связь'], ['album', 'Альбом']];
    let tab = zui.tab[k.id] || 'now';
    if (!tabs.some(([t]) => t === tab)) tab = 'now';
    const img = heroImg(k);
    let sub = '';
    if (preg) { const tm = E.term(k, c.t); sub = tm && !tm.before ? `${E.termLabel(tm)} · ${weekInfo(tm.ow).size}` : 'срок не посчитать'; }
    else { const ag = E.age(k, c.t); sub = `${E.sexWord(k)} · ${ag?.label || ''}${k.with ? ` · у ${A.shortName(k.with)}` : ''}`; }
    const hero = `<section class="lf-pethero zr-hero${img ? ' lf-fit' : ''}${preg ? ' scan' : ''}"${A.fitAttr(img)}>${img ? `<i class="lf-fit-i" data-zact="zoom" data-src="${esc(img)}"></i>` : `<span class="lf-pethero-ic">${ic(preg ? 'sprout' : 'baby')}</span>`}
        <button class="lf-glass" data-zact="${preg ? 'us-draw' : 'pic-draw'}" data-id="${esc(k.id)}">${ic(preg ? 'scan' : 'camera')} ${preg ? 'Снимок' : 'Портрет'}</button>
        <button class="lf-glass zr-gear" data-zact="edit" data-id="${esc(k.id)}">${ic('settings')}</button>
        <div class="lf-pethero-t"><h2>${esc(E.kidName(k))}</h2><span>${esc(sub)}</span></div></section>`;
    const body = {
        now: () => (preg ? pregNow(k, c) : babyNow(k, c)), plan: () => pregPlan(k, c), genes: () => genesTab(k), us: () => usTab(k, c),
        bond: () => (preg ? pregBond(k) : babyBond(k, c)), health: () => healthTab(k, c), grow: () => growTab(k, c), album: () => albumTab(k),
    }[tab]?.() || '';
    return `<div class="zr">${hero}${seg(tabs, tab, 'tab', ` data-id="${esc(k.id)}"`)}${body}</div>`;
}

// ───────────── беременность: сейчас ─────────────

function pregNow(k, c) {
    if (!c.ok) return `<div class="lf-note">${ic('calendar')} В истории нет даты (Horae её не записал) — срок не посчитать.</div>`;
    if (!k.conception) return `<div class="lf-note">${ic('calendar')} Нет даты зачатия.</div><button class="lf-btn primary full" data-zact="edit" data-id="${esc(k.id)}">${ic('pencil')} Указать</button>`;
    const tm = E.term(k, c.t);
    if (tm.before) return `<div class="lf-note">${ic('calendar')} Дата зачатия позже, чем «сейчас» в истории.</div>`;
    const w = weekInfo(tm.ow);
    const sy = E.todaySymptoms(k, tm, c.day);
    const mv = movesNow(tm.ow, k.preg.first !== false);
    const td = k.preg.today?.day === c.day ? k.preg.today : null;
    if (!td) setTimeout(() => E.makeDay(k).then(() => A.render()).catch(() => { }), 50);
    const comps = Object.entries(k.preg.comps || {}).filter(([, s]) => s.hit && s.stage !== 'hidden' && s.stage !== 'resolved').map(([id, s]) => [E.compById(id), s]).filter(([x]) => x);
    const plan = E.planItems(k, tm);
    const meds = plan.filter(x => x.daily && x.status === 'now');
    const due = plan.filter(x => !x.daily && !x.info && x.status === 'now');
    const echo = E.powerEcho(k, tm);
    const weight = w.g >= 1000 ? `${(w.g / 1000).toFixed(1)} кг` : w.g ? `${w.g} г` : '< 1 г';
    const len = w.mm >= 100 ? `${(w.mm / 10).toFixed(1)} см` : `${w.mm} мм`;
    return `
    <div class="zr-stats">
        <div><small>Срок</small><b>${tm.ow}<i> нед</i> ${tm.od}<i> дн</i></b><span>акушерский</span></div>
        <div><small>От зачатия</small><b>${tm.ew}<i> нед</i> ${tm.ed}<i> дн</i></b><span>как считают они</span></div>
        <div><small>Роды</small><b>${esc(E.fmtDate(tm.due))}</b><span>через ${Math.max(0, Math.round(tm.left / 7))} нед</span></div>
    </div>
    <div class="zr-track">${meter(tm.pct)}<span style="left:${13 / 40 * 100}%"></span><span style="left:${27 / 40 * 100}%"></span><em>${tm.tri}-й триместр</em></div>
    <div class="zr-card"><div class="zr-card-h">${ic('sprout')}<b>Размером с ${esc(w.size)}</b><small>${len} · ${weight}${w.hr ? ` · ${ic('heart', 'sm')} ${w.hr}` : ''}</small></div><p>${esc(A.cap(w.dev))}.</p>${td?.fetus ? `<p class="zr-it">${esc(td.fetus)}</p>` : ''}</div>
    ${A.sec('Сегодня у неё', esc(c.day.split('-').reverse().slice(0, 2).join('.')))}
    <div class="lf-chips wrap">${sy.map(s => `<span class="lf-chip static">${esc(s.name)}</span>`).join('')}${mv ? `<span class="lf-chip static on">${ic('sparkles')} ${esc(mv.word)}</span>` : ''}${comps.filter(([, s]) => s.stage === 'signs').map(([x]) => `<span class="lf-chip static warn">${ic('activity')} что-то не так</span>`).join('')}</div>
    ${echo ? `<div class="lf-note">${ic('zap')} ${esc(A.cap(echo))}.</div>` : ''}
    ${E.bondFeel(k, c) ? `<div class="lf-note${E.bondFeel(k, c).bad ? ' zr-warn' : ' zr-need'}">${ic('heart')} <span><b>Связь: ${esc(E.bondFeel(k, c).word.toLowerCase())}.</b> ${esc(A.shortName(k.mother))} ${esc(E.bondFeel(k, c).t.replace(/^через связь /, ''))}.</span></div>` : ''}
    ${A.sec('Тянет', td ? (td.src === 'llm' ? 'придумано на сегодня' : 'из запаса') : 'думаю…')}
    ${td ? `<div class="lf-chips wrap">${td.crave.map(x => `<span class="lf-chip static on">${ic('heart')} ${esc(x)}</span>`).join('')}${td.weird ? `<span class="lf-chip static zr-weird">${ic('sparkles')} ${esc(td.weird)}</span>` : ''}${td.avoid.map(x => `<span class="lf-chip static">${ic('x')} ${esc(x)}</span>`).join('')}<button class="lf-chip" data-zact="day" data-id="${esc(k.id)}">${ic('refresh')}</button></div>
    ${td.ate?.length ? `<div class="lf-hint">Уже съела: ${esc(td.ate.join(', '))}</div>` : ''}
    ${td.need ? `<div class="lf-note zr-need">${ic('pill')} ${esc(td.need)}</div>` : ''}` : '<div class="lf-empty small"><span class="lf-spin"></span></div>'}
    ${meds.length || due.length ? A.sec('По плану') : ''}
    <div class="lf-list">${meds.map(x => planRow(k, x, true)).join('')}${due.map(x => planRow(k, x)).join('')}</div>
    ${comps.filter(([, s]) => s.stage === 'known').map(([x]) => `<div class="lf-note">${ic('hospital')} <span><b>${esc(x.name)}.</b> ${esc(x.care)}.</span></div>`).join('')}
    <div class="lf-hint">Модель получает срок, симптомы дня, тягу и то, что знают врачи, — короткой скрытой заметкой, когда ${esc(A.shortName(k.mother))} в сцене. ${E.cfg().beat ? `В ${E.cfg().beat}% ответов — один симптом телом.` : ''}</div>`;
}

const KIND_IC = { med: 'pill', task: 'check', visit: 'hospital', lab: 'drop', us: 'scan', vax: 'syringe' };
function planRow(k, x, daily = false) {
    const on = daily ? x.takenToday : !!x.done;
    return `<div class="lf-row zr-row${on ? ' done' : ''}${x.status === 'now' && !on ? ' now' : ''}">${ic(KIND_IC[x.kind] || 'check')}<span><b>${esc(x.name)}</b><small class="lf-sub">${esc(x.note)}${daily ? '' : ` · ${x.w[0]}–${x.w[1]} нед`}${x.done?.off ? ' · за кадром' : ''}</small></span>${x.info ? '' : `<button class="lf-iconbtn sm${on ? ' on' : ''}" data-zact="plan" data-id="${esc(k.id)}" data-v="${esc(x.id)}" title="${daily ? 'Сегодня приняла' : 'Сделано'}">${ic('check')}</button>`}</div>`;
}

// ───────────── беременность: план ─────────────

function pregPlan(k, c) {
    const tm = E.term(k, c.t);
    if (!tm || tm.before) return '<div class="lf-empty small">Нет срока.</div>';
    const items = E.planItems(k, tm);
    const by = (s) => items.filter(x => (s === 'done' ? (x.done && !x.daily) : x.status === s && !(x.done && !x.daily)));
    const comps = Object.entries(k.preg.comps || {}).filter(([, s]) => s.hit).map(([id, s]) => [E.compById(id), s]).filter(([x]) => x);
    const hidden = comps.filter(([, s]) => s.stage === 'hidden').length;
    const shown = comps.filter(([, s]) => s.stage !== 'hidden');
    const rf = E.riskFactors(k);
    const rfText = [rf.age35 && '35+', rf.first && 'первые роды', rf.scar && 'рубец/операции на животе', rf.twins && 'двойня', rf.rhneg && 'резус-конфликт', rf.motherPower && 'силы мамы'].filter(Boolean);
    const ev = (k.preg.events || []).slice(-12).reverse();
    return `
    <div class="lf-note">${ic('hospital')} Приёмы сейчас — раз в ${({ 1: 'неделю', 2: '2 недели', 4: '4 недели' })[visitEvery(tm.ow)]}. Отмечает Летописец, когда это случилось в посте; пропущенное окно проходит за кадром.</div>
    ${by('now').length ? `${A.sec('Сейчас')}<div class="lf-list">${by('now').map(x => planRow(k, x, x.daily)).join('')}</div>` : ''}
    ${by('later').length ? `${A.sec('Дальше')}<div class="lf-list">${by('later').map(x => planRow(k, x)).join('')}</div>` : ''}
    ${by('done').length ? `${A.sec('Сделано')}<div class="lf-list">${by('done').map(x => planRow(k, x)).join('')}</div>` : ''}
    ${A.sec('Риски', rfText.join(' · ') || 'обычные')}
    ${shown.map(([x, s]) => `<div class="zr-card${s.stage === 'signs' ? ' warn' : ''}"><div class="zr-card-h">${ic(s.stage === 'signs' ? 'activity' : 'hospital')}<b>${esc(s.stage === 'signs' ? 'Что-то не так' : x.name)}</b><small>${s.stage === 'signs' ? 'врачи ещё не знают' : `с ${s.week} нед`}</small></div><p>${esc(A.cap(x.signs))}.</p>${s.stage === 'known' ? `<p class="zr-it">${esc(x.care)}</p>` : ''}<div class="lf-actions tight">${s.stage === 'signs' ? `<button class="lf-btn" data-zact="comp-know" data-id="${esc(k.id)}" data-v="${x.id}">${ic('eye')} Узнали</button>` : ''}<button class="lf-btn ghost" data-zact="comp-off" data-id="${esc(k.id)}" data-v="${x.id}">${ic('check')} Прошло</button></div></div>`).join('')}
    <div class="lf-hint">${ic('dice')} Кубики осложнений бросаются раз в неделю (реализм: ${({ soft: 'мягко', real: 'как в жизни', drama: 'драма' })[E.cfg().realism]}). ${hidden ? `<b>Неоткрытых: ${hidden}</b> — их увидят на обследованиях.` : 'Неоткрытых пока нет.'} Потерь кубик не решает никогда.</div>
    ${ev.length ? `${A.sec('Врачи и тревоги')}<div class="lf-timeline">${ev.map(x => `<button class="lf-tl" data-act="jump" data-mes="${x.mes}"><span class="lf-tl-dot${x.kind === 'alarm' ? ' warn' : ''}"></span><span class="lf-tl-txt"><b>${esc(x.t)}</b><small>#${x.mes} · ${esc(E.fmtDate(x.at))}</small></span></button>`).join('')}</div>` : ''}`;
}

// ───────────── гены ─────────────

function geneVal(id, r) {
    const v = r?.v;
    if (v == null || (Array.isArray(v) && !v.length)) return id === 'power' ? '—' : id === 'serum' || id === 'stones' || id === 'special' || id === 'talents' ? 'нет' : '—';
    switch (id) {
        case 'sex': return v === 'M' ? 'мальчик' : 'девочка';
        case 'chin': case 'dimples': case 'freckles': case 'hand': case 'xgene': return v ? 'да' : 'нет';
        case 'blood': return `${v}${r.conflict ? ' · резус-конфликт' : ''}`;
        case 'height': return `~${v} см`;
        case 'iq': return `${v} · ${IQ_TIER(v)}`;
        case 'temp': return r.type?.name || tempType(v).name;
        case 'power': return `${v.name} · ${'●'.repeat(v.level)}${'○'.repeat(5 - v.level)}${v.early ? ' · рано' : ''}`;
        case 'serum': return v.map(x => SERUM.find(s => s[0] === x)?.[1]).filter(Boolean).join(', ');
        case 'stones': return v.map(x => STONES.find(s => s[0] === x)?.[1]).filter(Boolean).join(', ');
        default: return Array.isArray(v) ? v.join(', ') : String(v);
    }
}

function parentCard(k, role) {
    const name = role === 'mother' ? k.mother : k.father;
    if (!name) return `<button class="lf-row" data-zact="edit" data-id="${esc(k.id)}">${ic('user')}<span><b>${role === 'mother' ? 'Мама' : 'Папа'} не указан${role === 'mother' ? 'а' : ''}</b></span></button>`;
    const p = E.profile(name);
    const sum = [p.eyes && `глаза ${p.eyes}`, p.hair && `волосы ${p.hair}`, p.height && `${p.height} см`, p.blood && `кровь ${p.blood}${p.bloodRolled ? '🎲' : ''}`, `IQ ~${p.iq}`, (p.powers || []).length ? p.powers.map(x => x.name).join(', ') : ''].filter(Boolean).join(' · ');
    return `<button class="lf-row zr-parent" data-zact="prof" data-v="${esc(name)}" data-id="${esc(k.id)}">${A.ava(name)}<span><b>${esc(name)}</b><small class="lf-sub">${p.analyzed ? esc(sum) : 'ещё не разобран — тапни'}</small></span>${ic('right')}</button>`;
}

function genesTab(k) {
    const g = k.genes || {};
    const groups = {};
    for (const [id, label, grp] of ROWS) (groups[grp] = groups[grp] || []).push([id, label]);
    const row = (id, label) => {
        const r = g[id];
        if (id === 'power' && !g.xgene?.v) return '';
        if ((id === 'serum' || id === 'stones') && !(r?.v || []).length && !r?.fixed) return '';
        const hide = id === 'risks' && !zui.risks;
        const baby = (id === 'eyes' || id === 'hair') && r?.baby ? `<small class="zr-baby">${esc(r.baby)}</small>` : '';
        return `<div class="zr-gene${r?.fixed ? ' zr-fixed' : ''}">
            <span class="zr-gene-l">${esc(label)}</span>
            <span class="zr-gene-v"><b class="${hide ? 'lf-blur' : ''}"${hide ? ' data-zact="risks"' : ''}>${esc(geneVal(id, r))}</b>${r?.p ? `<small>${esc(r.p)}</small>` : ''}${r?.why ? `<small>${esc(r.why)}</small>` : ''}${baby}</span>
            ${r?.fixed ? `<button class="lf-iconbtn sm zr-lock" data-zact="unfix" data-id="${esc(k.id)}" data-v="${id}" title="Снять фиксацию — снова кубик">${ic('lock')}</button>` : `<button class="lf-iconbtn sm" data-zact="roll" data-id="${esc(k.id)}" data-v="${id}" title="Перебросить">${ic('dice')}</button>`}
            <button class="lf-iconbtn sm" data-zact="gene" data-id="${esc(k.id)}" data-v="${id}" title="Править">${ic('pencil')}</button>
        </div>`;
    };
    const temp = g.temp?.v;
    return `
    ${A.sec('Родители')}
    <div class="lf-list">${parentCard(k, 'mother')}${parentCard(k, 'father')}</div>
    <div class="lf-actions"><button class="lf-btn" data-zact="roll-all" data-id="${esc(k.id)}">${ic('dice')} Перебросить всё</button><button class="lf-btn ghost" data-zact="analyze" data-id="${esc(k.id)}">${ic('dna')} Разобрать родителей</button></div>
    ${k.lore ? `<div class="lf-hint">${ic('lock')} Зафиксировано лором: девочка, интеллект мамы, X-ген. Остальное — кубик.</div>` : ''}
    ${Object.entries(groups).map(([grp, rows]) => { const html = rows.map(([id, l]) => row(id, l)).join(''); return html ? `${A.sec(GROUPS[grp])}<div class="zr-genes">${html}</div>` : ''; }).join('')}
    ${temp ? `<div class="zr-temp${g.temp.fixed ? ' zr-fixed' : ''}"><div class="zr-temp-h"><b>${esc(g.temp.type?.name || tempType(temp).name)}</b><small>${g.temp.fixed ? `<button class="zr-unfix" data-zact="unfix" data-id="${esc(k.id)}" data-v="temp">${ic('lock', 'sm')} зафиксировано · снять</button>` : 'тап по точке — поправить'}</small></div>${TEMP.map(([key, l, lo, hi]) => `<div class="zr-temp-r"><span class="zr-temp-l">${esc(l)}</span><small class="zr-temp-lo">${esc(lo)}</small><span class="zr-dots">${[1, 2, 3, 4, 5].map(i => `<button class="${i === temp[key] ? 'on' : ''}" data-zact="temp-dot" data-id="${esc(k.id)}" data-v="${key}:${i}"><b></b></button>`).join('')}</span><small class="zr-temp-hi">${esc(hi)}</small></div>`).join('')}<div class="lf-hint">${esc(g.temp.type?.d || tempType(temp).d)}</div></div>` : ''}
    <div class="lf-hint">${ic('dice')} — перебросить строку, ${ic('pencil')} — поправить руками (строка зафиксируется, ${ic('lock', 'sm')}). Зафиксированное правится тем же ${ic('pencil')}; тап по ${ic('lock', 'sm')} снимает фиксацию — строка снова на кубике. Приобретённое (шрамы, белые от Камней волосы, протезы) не наследуется.</div>`;
}

// ───────────── УЗИ ─────────────

function usTab(k, c) {
    const tm = E.term(k, c.t);
    const list = [...(k.preg.us || [])].reverse();
    const v = tm && !tm.before ? usView(tm.ow) : null;
    return `
    ${v ? `<div class="lf-note">${ic('scan')} На ${tm.ow} неделе видно: ${esc(v.ru.toLowerCase())}</div>` : ''}
    <div class="lf-actions"><button class="lf-btn primary" data-zact="us-draw" data-id="${esc(k.id)}">${ic('scan')} Снимок ${tm ? `(${tm.ow} нед)` : ''}</button><label class="lf-btn">${ic('upload')} Свой<input type="file" accept="image/*" data-zfile="us" data-id="${esc(k.id)}" hidden></label></div>
    ${list.length ? `<div class="lf-grid zr-grid">${list.map((x, i) => `<button class="lf-tile" data-zact="zoom" data-src="${esc(x.img)}" data-cap="${esc(`${x.week} нед${x.three ? ' · 3D' : ''}`)}"><img src="${esc(x.img)}" alt="" loading="lazy"><span class="lf-tile-n">${x.week} нед${x.three ? ' · 3D' : ''}</span></button>`).join('')}</div>` : '<div class="lf-empty small">Снимков пока нет. С 28 недель — объёмное 3D, лицо по выпавшим генам.</div>'}`;
}

// ───────────── связь ─────────────

function bars(map, word) {
    const e = Object.entries(map || {}).sort((a, b) => b[1] - a[1]);
    if (!e.length) return '';
    const max = Math.max(...e.map(x => x[1]), 1);
    return `<div class="lf-bars">${e.map(([n, v]) => `<div class="lf-bar-row">${A.ava(n, 'xs')}<span>${esc(A.shortName(n))}</span>${meter(word ? v : v / max * 100)}<small>${word ? esc(word(v)) : v}</small></div>`).join('')}</div>`;
}

function pregBond(k) {
    const tm = E.term(k);
    const talk = k.preg.talk || {};
    const hears = tm && tm.ow >= 25;
    const moments = [...(k.moments || [])].reverse().slice(0, 20);
    return `
    ${A.sec('Кто с ней разговаривает', hears ? 'уже узнаёт голоса' : 'слышит с ~23 нед')}
    ${bars(talk) || '<div class="lf-empty small">Пока никто. Летописец заметит, кто гладит живот и говорит с ним.</div>'}
    <div class="lf-hint">${hears ? 'Знакомый голос — и она отвечает толчками. ' : ''}После рождения те, кого она слышала изнутри, начнут с форой: к их голосу она успокаивается быстрее.</div>
    ${Object.keys(k.preg.kicks || {}).length ? `${A.sec('Почувствовали толчки')}${bars(k.preg.kicks)}` : ''}
    ${moments.length ? `${A.sec('Моменты')}<div class="lf-timeline">${moments.map(x => `<button class="lf-tl" data-act="jump" data-mes="${x.mes}"><span class="lf-tl-dot"></span><span class="lf-tl-txt"><b>${esc(x.t)}</b><small>#${x.mes}</small></span></button>`).join('')}</div>` : ''}`;
}

function babyBond(k, c) {
    const ag = E.age(k, c.t);
    const fav = E.favorite(k);
    const m = ag?.months || 0;
    const stage = m < 2 ? 'Пока узнаёт по запаху и голосу; улыбается всем подряд.' : m < 6 ? 'Отличает своих, но спокойно идёт на руки к чужим.' : m < 9 ? 'Начинается страх чужих: к незнакомым — в рёв.' : m < 18 ? 'Пик тревоги разлуки: уход любимого человека — трагедия.' : 'Отпускает легче, если знает, что вернутся.';
    return `
    ${A.sec('Привязанность', fav ? `любимчик — ${esc(A.shortName(fav))}` : '')}
    ${bars(k.attach, E.attachWord) || '<div class="lf-empty small">Пока пусто.</div>'}
    <div class="lf-note">${ic('heart')} ${esc(stage)}</div>
    <div class="lf-hint">Растёт от того, кто кормит, успокаивает, носит на руках, играет — особенно когда малышу плохо. Отмечает Летописец по постам.</div>
    ${(k.moments || []).length ? `${A.sec('Моменты')}<div class="lf-timeline">${[...k.moments].reverse().slice(0, 30).map(x => `<button class="lf-tl" data-act="jump" data-mes="${x.mes}"><span class="lf-tl-dot${x.first ? ' on' : ''}"></span><span class="lf-tl-txt"><b>${esc(x.t)}</b><small>#${x.mes}${x.at ? ` · ${esc(E.fmtDate(x.at))}` : ''}</small></span></button>`).join('')}</div>` : ''}`;
}

// ───────────── малыш: сейчас ─────────────

function babyNow(k, c) {
    const s = E.babyState(k, c);
    if (!s) return `<div class="lf-note">${ic('calendar')} В истории нет даты — возраст не посчитать.</div>`;
    const ill = k.health?.ill?.stage === 'sick' ? ILLNESSES.find(x => x.id === k.health.ill.id) : null;
    const cast = A.castNames().filter(Boolean);
    const sleepTxt = s.asleep ? 'спит' : `${Math.round(s.awakeMin)} мин`;
    const newMile = [...MILESTONES].reverse().find(m => { const x = k.miles?.[m.id]; return x?.ready && !x.seen; });
    return `
    <div class="zr-state${s.comfort < 50 || s.food < 30 || s.overtired ? ' warn' : ''}"><b>${esc(s.word)}</b><span>${esc(A.cap(s.cry))}</span></div>
    <div class="lf-bars">
        <div class="lf-bar-row${s.food < 30 ? ' low' : ''}">${ic('bottle')}<span>Сытость</span>${meter(s.food)}<small>${s.food}</small></div>
        <div class="lf-bar-row${s.diaper < 25 ? ' low' : ''}">${ic('drop')}<span>Подгузник</span>${meter(s.diaper)}<small>${s.diaper}</small></div>
        <div class="lf-bar-row${s.overtired ? ' low' : ''}">${ic('moon')}<span>Сон</span>${meter(s.sleep)}<small>${esc(sleepTxt)}</small></div>
        <div class="lf-bar-row${s.comfort < 50 ? ' low' : ''}">${ic('activity')}<span>Комфорт</span>${meter(s.comfort)}<small>${s.comfort}</small></div>
        <div class="lf-bar-row${s.hold < 25 ? ' low' : ''}">${ic('heart')}<span>На ручки</span>${meter(s.hold)}<small>${s.hold}</small></div>
    </div>
    ${s.pains.filter(p => p.k !== 'ill').map(p => `<div class="lf-note">${ic('activity')} ${esc(A.cap(p.t))}</div>`).join('')}
    ${ill ? `<div class="zr-card warn"><div class="zr-card-h">${ic('thermo')}<b>${esc(ill.name)}</b><small>${esc(E.gw(k, 'болеет'))}</small></div><p>${esc(A.cap(s.pains.find(p => p.k === 'ill')?.t || ''))}</p><p class="zr-it">${esc(ill.care)}. Тревожно: ${esc(ill.red)}.</p></div>` : ''}
    ${newMile ? `<div class="lf-note">${ic('star')} ${esc(E.gw(k, 'Доросла'))}: ${esc(newMile.t)} — пусть случится в сцене</div>` : ''}
    ${k.pendingPower ? `<div class="lf-note">${ic('zap')} ${esc(A.cap(k.pendingPower))}</div>` : ''}
    ${A.sec('У кого сейчас')}
    <div class="lf-chips wrap">${cast.map(n => `<button class="lf-chip${A.sameName(n, k.with || k.mother) ? ' on' : ''}" data-zact="with" data-id="${esc(k.id)}" data-v="${esc(n)}">${esc(A.shortName(n))}</button>`).join('')}</div>
    <div class="zr-norms"><span>${ic('bottle')} ${esc(feedWord(s.ag.days, k.feeding))}, раз в ~${Math.round(E.feedEvery(k, s.ag) * 10) / 10} ч</span><span>${ic('moon')} ${esc(sleepNorm(s.ag.days))}; без сна ${s.win[0]}–${s.win[1]} мин</span></div>
    <div class="lf-actions"><button class="lf-btn" data-zact="edit" data-id="${esc(k.id)}">${ic('sliders')} Поправить</button></div>
    <div class="lf-hint">Кормят, меняют, укачивают — в постах: Летописец заметит. Пока малыша нет в сценах, за ним ухаживают за кадром — шкалы ходят по кругу.</div>`;
}

// ───────────── здоровье ─────────────

function healthTab(k, c) {
    const ag = E.age(k, c.t);
    const gr = E.growthNow(k, c);
    const ill = k.health?.ill;
    const vax = E.vaxList(k, c);
    const ch = E.checkupList(k, c);
    const hist = (k.health?.hist || []).slice(0, 12);
    const st = (s) => ({ done: 'сделано', now: 'пора', later: 'позже', late: 'просрочено' })[s] || s;
    return `
    ${gr ? `<div class="zr-stats">
        <div><small>Вес</small><b>${gr.w.toFixed(1)}<i> кг</i></b><span>${pct(gr.z.w)}-й перцентиль</span></div>
        <div><small>Рост</small><b>${gr.l.toFixed(1)}<i> см</i></b><span>${pct(gr.z.l)}-й</span></div>
        <div><small>Голова</small><b>${gr.h.toFixed(1)}<i> см</i></b><span>${pct(gr.z.h)}-й</span></div>
    </div>` : ''}
    <div class="lf-hint">При рождении: ${k.birth?.week} нед, ${k.birth?.weight} г, ${k.birth?.length} см, Апгар ${k.birth?.apgar}${k.birth?.how ? `, ${esc(k.birth.how)}` : ''}. Перцентили ВОЗ; к полутора годам рост подтягивается к генам (взрослой ~${k.genes?.height?.v || '?'} см).</div>
    ${ill ? `${A.sec('Сейчас')}<div class="zr-card${ill.stage === 'sick' ? ' warn' : ''}"><div class="zr-card-h">${ic('thermo')}<b>${esc(ILLNESSES.find(x => x.id === ill.id)?.name || '')}</b><small>${ill.stage === 'inc' ? 'ещё не проявилась' : 'болеет'}</small></div>${ill.stage === 'inc' ? '<p>Подцепила — через пару дней проявится.</p>' : ''}</div>` : ''}
    <label class="lf-switch"><input type="checkbox" data-zact="daycare" data-id="${esc(k.id)}" ${k.daycare ? 'checked' : ''}><span></span>Ясли или няня с другими детьми — болеет чаще</label>
    ${A.sec('Прививки', 'календарь CDC')}
    <div class="lf-list">${vax.map(v => `<div class="lf-row zr-row${v.status === 'done' ? ' done' : v.status === 'now' || v.status === 'late' ? ' now' : ''}">${ic('syringe')}<span><b>${esc(v.name)}</b><small class="lf-sub">${st(v.status)}${v.done?.off ? ' · за кадром' : ''} · ${v.m < 1 ? 'с рождения' : `${Math.round(v.m)} мес`}${v.note ? ` · ${esc(v.note)}` : ''}${v.status !== 'done' ? ` · после: ${esc(v.react)}` : ''}</small></span><button class="lf-iconbtn sm${v.done ? ' on' : ''}" data-zact="vax" data-id="${esc(k.id)}" data-v="${v.id}">${ic('check')}</button></div>`).join('')}</div>
    ${A.sec('Осмотры у педиатра')}
    <div class="lf-chips wrap">${ch.map(x => `<button class="lf-chip${x.done ? ' on' : x.status === 'now' ? ' warn' : ''}" data-zact="check" data-id="${esc(k.id)}" data-v="${x.m}">${x.done ? ic('check') : ''} ${esc(x.label)}</button>`).join('')}</div>
    ${hist.length ? `${A.sec('Болела')}<div class="lf-list">${hist.map(h => `<div class="lf-row">${ic('thermo')}<span><b>${esc(ILLNESSES.find(x => x.id === h.id)?.name || h.id)}</b><small class="lf-sub">${esc(E.fmtDate(h.from))} — ${esc(E.fmtDate(h.to))}</small></span></div>`).join('')}</div>` : ''}
    ${(k.genes?.serum?.v || []).includes('immune') ? `<div class="lf-hint">${ic('shield')} Иммунитет от сыворотки: болеет втрое реже и вдвое короче.</div>` : ''}`;
}

// ───────────── развитие ─────────────

function growTab(k, c) {
    const ag = E.age(k, c.t);
    const g = k.genes || {};
    const pw = g.xgene?.v ? g.power?.v : null;
    const items = MILESTONES.map(m => ({ m, st: k.miles?.[m.id] })).filter(x => x.st);
    const done = items.filter(x => x.st.ready);
    const next = items.filter(x => !x.st.ready).slice(0, 6);
    return `
    ${A.sec('Умеет', `${done.length} из ${items.length}`)}
    <div class="lf-list">${[...done].reverse().map(({ m, st }) => `<div class="lf-row zr-row done">${ic('star')}<span><b>${esc(A.cap(m.t))}</b><small class="lf-sub">${esc(DOMAIN[m.d])} · ${esc(E.fmtDate(st.ready))}${st.seen?.off ? ' · за кадром' : st.seen ? '' : ' · ещё не было в сцене'}</small></span>${st.seen?.mes != null ? `<button class="lf-iconbtn sm" data-act="jump" data-mes="${st.seen.mes}">${ic('right')}</button>` : `<button class="lf-iconbtn sm" data-zact="mile" data-id="${esc(k.id)}" data-v="${m.id}" title="Уже было">${ic('check')}</button>`}</div>`).join('') || '<div class="lf-empty small">Пока только смотрит и ест — всё впереди.</div>'}</div>
    ${next.length ? `${A.sec('Скоро')}<div class="lf-list">${next.map(({ m, st }) => `<div class="lf-row">${ic('clock')}<span><b>${esc(A.cap(m.t))}</b><small class="lf-sub">${esc(DOMAIN[m.d])} · примерно в ${Math.max(1, Math.round(st.day / 30.4))} мес</small></span></div>`).join('')}</div>` : ''}
    ${k.teeth?.first ? `<div class="lf-hint">${ic('sparkles')} Первый зуб — около ${Math.round(k.teeth.first / 30.4)} мес.</div>` : ''}
    ${pw ? `${A.sec('Сила', POWER_FAMILIES[pw.family]?.name || '')}<div class="zr-card"><div class="zr-card-h">${ic('zap')}<b>${esc(A.cap(pw.name))}</b><small>${'●'.repeat(pw.level)}${'○'.repeat(5 - pw.level)}</small></div><p>${pw.early ? 'Проявится рано — ещё в детстве.' : 'В полную силу — ближе к подростковому возрасту.'} ${pw.echo ? 'До тех пор — отголоски: странности рядом с ней.' : 'До тех пор спит.'}</p></div>
    ${(k.powerLog || []).length ? `<div class="lf-timeline">${[...k.powerLog].reverse().slice(0, 12).map(x => `<div class="lf-tl"><span class="lf-tl-dot on"></span><span class="lf-tl-txt"><b>${esc(x.t)}</b><small>${esc(E.fmtDate(x.at))}${x.shown ? ` · #${x.shown}` : ''}</small></span></div>`).join('')}</div>` : ''}` : ''}
    ${(g.serum?.v || []).length ? `${A.sec('От сыворотки')}<div class="lf-chips wrap">${g.serum.v.map(id => SERUM.find(x => x[0] === id)).filter(Boolean).map(x => `<span class="lf-chip static" title="${esc(x[2])}">${esc(x[1])}</span>`).join('')}</div>` : ''}
    ${(g.stones?.v || []).length ? `${A.sec('След Камней')}<div class="lf-chips wrap">${g.stones.v.map(id => STONES.find(x => x[0] === id)).filter(Boolean).map(x => `<span class="lf-chip static" title="${esc(x[2])}">${esc(x[1])}</span>`).join('')}</div>` : ''}
    ${A.sec('Выпуск')}
    <div class="lf-hint">Когда ${E.her(k)} подрастёт и станет персонажем, а не расширкой, — соберу карточку для таверны: внешность, характер, силы, привязанности и вся история.</div>
    <button class="lf-btn full${(ag?.months || 0) >= 30 ? ' primary' : ''}" data-zact="grad" data-id="${esc(k.id)}">${ic('download')} Карточка персонажа</button>`;
}

// ───────────── альбом ─────────────

function albumTab(k) {
    const list = [...(k.album || [])].reverse();
    return `
    <div class="lf-actions"><button class="lf-btn primary" data-zact="pic-draw" data-id="${esc(k.id)}">${ic('camera')} Портрет сейчас</button><label class="lf-btn">${ic('upload')} Своё фото<input type="file" accept="image/*" data-zfile="pic" data-id="${esc(k.id)}" hidden></label></div>
    ${list.length ? `<div class="lf-grid zr-grid">${list.map(x => `<button class="lf-tile${x.img === k.img ? ' on' : ''}" data-zact="zoom" data-src="${esc(x.img)}" data-cap="${esc(x.label || '')}" data-id="${esc(k.id)}"><img src="${esc(x.img)}" alt="" loading="lazy"><span class="lf-tile-n">${esc(x.label || '')}</span></button>`).join('')}</div>` : '<div class="lf-empty small">Портретов пока нет. Рисую по выпавшим генам — с фото родителей как подсказкой.</div>'}
    ${(k.preg?.us || []).length ? `${A.sec('УЗИ')}<div class="lf-grid zr-grid">${[...k.preg.us].reverse().map(x => `<button class="lf-tile" data-zact="zoom" data-src="${esc(x.img)}" data-cap="${x.week} нед"><img src="${esc(x.img)}" alt="" loading="lazy"><span class="lf-tile-n">${x.week} нед</span></button>`).join('')}</div>` : ''}
    <div class="lf-hint">Тап по портрету — на весь экран; «Сделать главным» — в листе ⚙.</div>`;
}

// ───────────── рисование ─────────────

async function drawUS(k) {
    const c = E.clock();
    const tm = E.term(k, c.t);
    if (!tm || tm.before) throw new Error('нет срока');
    const v = usView(tm.ow, { face: faceEn(k) });
    const look = v.three
        ? 'Look: 3D/4D obstetric ultrasound render, warm sepia-amber tones, soft smooth skin-like surface, dark background, realistic clinical scan'
        : 'Look: grainy black-and-white obstetric ultrasound sonogram, fan-shaped scan sector on a dark monitor, soft speckle noise, faint scale ticks along the edge';
    const prompt = `Medical ultrasound image at ${tm.ow} weeks of pregnancy: ${v.en}.\n${look}. Realistic and clinical. No readable text, no watermark, no people, no hands.`;
    const img = await A.drawPicture(prompt, { aspect: '4:3', prefix: 'zr_us' });
    k.preg.us = [...(k.preg.us || []), { img, week: tm.ow, day: tm.od, at: c.t, three: !!v.three }];
    E.save();
}

async function drawPortrait(k) {
    const c = E.clock();
    const ag = E.age(k, c.t);
    const look = lookEn(k, ag ? ag.months : 0);
    const refs = [];
    if (E.cfg().refs) {
        for (const n of [k.mother, k.father].filter(Boolean)) { try { const r = await A.refData(A.avatarUrl(n, true), 768); if (r) refs.push(r); } catch { /* */ } }
    }
    const prompt = `Portrait of a child: ${look}. Soft natural home light, close and tender framing, the child alone in the frame.${refs.length ? ' The reference images show the PARENTS — the child should subtly inherit their features (face shape, eyes, nose), do NOT draw the parents.' : ''}\nStyle: ${A.style()}. No text.`;
    const img = await A.drawPicture(prompt, { aspect: '4:5', prefix: 'zr_pic', refs });
    k.album = [...(k.album || []), { img, label: ag?.label || 'новорождённая', at: c.t }];
    k.img = img;
    E.save();
}

// ───────────── листы ─────────────

function readChips(box, grp) { return [...(box.querySelectorAll(`[data-zgrp="${grp}"] .on`) || [])].map(b => b.dataset.v); }
const val = (box, k) => box.querySelector(`[data-zin="${k}"]`)?.value?.trim() ?? '';
const checked = (box, k) => !!box.querySelector(`[data-zin="${k}"]`)?.checked;

function newKidSheet() {
    const cast = A.castNames();
    const user = E.userName();
    const r = E.repro();
    const mother = cast.find(n => A.sameName(n, user)) || cast[0] || user;
    const father = cast.find(n => /баки|bucky|барнс|barnes/i.test(n)) || cast.find(n => !A.sameName(n, mother)) || '';
    const opt = (sel) => `<option value="">—</option>${cast.map(n => `<option value="${esc(n)}"${A.sameName(n, sel) ? ' selected' : ''}>${esc(n)}</option>`).join('')}`;
    const lore = isHedyBucky(mother, father) && !E.kids().length;
    A.openSheet(`${ic('sprout')} Новый малыш`, `
        ${fld('Мама (кто вынашивает)', `<select data-zin="mother">${opt(mother)}</select>`)}
        ${fld('Папа', `<select data-zin="father">${opt(father)}</select>`)}
        ${fld('Имя <small>(можно потом)</small>', '<input type="text" data-zin="name" placeholder="Зёрнышко">')}
        ${chips('stage', [['preg', 'Ещё внутри'], ['baby', 'Уже родился']], 'preg')}
        ${fld('Дата зачатия <small>(настоящая, не по месячным)</small>', `<input type="text" data-zin="conc" placeholder="ГГГГ-ММ-ДД" value="${esc(r?.conception ? dateIn(r.conception) : '')}">`)}
        ${r?.conception ? `<label class="lf-switch"><input type="checkbox" data-zin="repro" checked><span></span>Брать дату из Reproductive (${esc(E.fmtDate(r.conception, true))})</label>` : `<div class="lf-hint">Reproductive в этом чате беременности не видит — дата вручную.</div>`}
        ${fld('Дата рождения <small>(если уже родился)</small>', '<input type="text" data-zin="born" placeholder="ГГГГ-ММ-ДД">')}
        <label class="lf-switch"><input type="checkbox" data-zin="first" checked><span></span>Первая беременность</label>
        <label class="lf-switch"><input type="checkbox" data-zin="lore" ${lore ? 'checked' : ''}><span></span>Лор Хеди и Баки: девочка, интеллект Хеди, X-ген</label>
        <button class="lf-btn primary serif full big" data-zact="create">${ic('check')} Завести</button>
        <div class="lf-hint">Потом разберу обоих родителей по карточкам (Летописцем) и брошу гены. Всё можно перебросить и поправить.</div>`);
}

function parseDay(s) { const m = String(s || '').match(/(\d{4})-(\d{1,2})-(\d{1,2})/) || String(s || '').match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/); if (!m) return null; const d = m[1].length === 4 ? new Date(+m[1], +m[2] - 1, +m[3], 2) : new Date(+m[3], +m[2] - 1, +m[1], 2); return isNaN(d) ? null : d.getTime(); }

async function analyze(name) {
    const p = E.profile(name);
    const text = E.cardText(name);
    if (!text && !p.extra) throw new Error(`не нашла карточку «${name}» — допиши в профиле «что ещё важно»`);
    const out = await A.askModel([{ role: 'system', content: ANALYZE_SYSTEM }, { role: 'user', content: analyzeInput(name, text, p.extra) }], 1400);
    const j = A.extractJson(out);
    if (!j) throw new Error('модель ответила не JSON');
    const np = normalizeProfile(j, p);
    np.bloodGeno = p.blood === np.blood ? p.bloodGeno : '';
    Object.assign(p, np);
    E.saveCfg();
    return p;
}

async function analyzeKid(k, { reroll = true } = {}) {
    const names = [k.mother, k.father].filter(Boolean);
    for (const n of names) await analyze(n);
    if (reroll) { if (k.lore) Object.assign(k.genes, loreFixed(k, E.profile(k.mother))); rollAll(k, E.mom(k), E.dad(k)); }
    E.save();
}

function profileSheet(name, kidId) {
    const p = E.profile(name);
    const sel = (key, list) => `<select data-zin="${key}"><option value="">—</option>${list.map(x => `<option${p[key] === x ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select>`;
    const pw = (p.powers || []).map(x => `${x.name}; ${x.kind}; ${x.family}; ${x.level}`).join('\n');
    A.openSheet(`${ic('dna')} ${esc(name)}`, `
        <div class="lf-hint">Врождённое — то, что передаётся. Белые от Камней волосы, шрамы, протезы — в «приобретённое».</div>
        ${fld('Что ещё важно <small>(для разбора; твоё слово главнее карточки)</small>', `<textarea data-zin="extra" rows="3" placeholder="натуральные волосы тёмно-каштановые, глаза серые; Юлия — мутация удачи">${esc(p.extra || '')}</textarea>`)}
        <button class="lf-btn full" data-zact="prof-analyze" data-v="${esc(name)}" data-id="${esc(kidId || '')}">${ic('dna')} Разобрать по карточке</button>
        ${chips('psex', [['F', 'Женщина'], ['M', 'Мужчина']], p.sex)}
        <div class="zr-2">${fld('Возраст', `<input type="text" inputmode="numeric" data-zin="age" value="${esc(p.age || '')}">`)}${fld('Рост, см', `<input type="text" inputmode="numeric" data-zin="height" value="${esc(p.height || '')}">`)}</div>
        <div class="zr-2">${fld('Глаза', sel('eyes', EYES))}${fld('Волосы (свои)', sel('hair', HAIR))}</div>
        <div class="zr-2">${fld('Тип волос', sel('texture', TEXTURE))}${fld('Кожа', sel('skin', SKIN))}</div>
        <div class="zr-2">${fld('Сложение', sel('build', BUILD))}${fld('Кровь', `<input type="text" data-zin="blood" value="${esc(p.blood || '')}" placeholder="A+">`)}</div>
        ${fld('IQ', `<input type="text" inputmode="numeric" data-zin="iq" value="${esc(p.iq || 100)}">`)}
        ${fld('Таланты', chips('ptal', pairs(TALENTS), p.talents, { multi: true }))}
        ${fld('Врождённый темперамент', TEMP.map(([key, l, lo, hi]) => `<div class="lf-inline zr-range"><span>${esc(l)}</span><small>${esc(lo)}</small><input type="range" min="1" max="5" data-zin="t-${key}" value="${p.temp?.[key] || 3}"><small>${esc(hi)}</small></div>`).join(''))}
        ${fld('Особенности <small>(через запятую)</small>', `<input type="text" data-zin="features" value="${esc((p.features || []).join(', '))}" placeholder="ямочка на подбородке, левша">`)}
        ${fld('Предрасположенности', `<input type="text" data-zin="risks" value="${esc((p.risks || []).join(', '))}">`)}
        ${fld('Силы <small>(строка: название; mutant|serum|stones|tech|other; energy|kinetic|luck|tech|mind|body|elemental|other; 1–5)</small>', `<textarea data-zin="powers" rows="3">${esc(pw)}</textarea>`)}
        ${fld('Приобретённое (не наследуется)', `<input type="text" data-zin="acquired" value="${esc((p.acquired || []).join(', '))}">`)}
        ${fld('Род', `<textarea data-zin="family" rows="2">${esc(p.family || '')}</textarea>`)}
        ${fld('Для беременности и родов', `<textarea data-zin="notes" rows="2">${esc(p.notes || '')}</textarea>`)}
        <button class="lf-btn primary serif full big" data-zact="prof-save" data-v="${esc(name)}" data-id="${esc(kidId || '')}">${ic('check')} Сохранить</button>`);
}

function saveProfile(box, name) {
    const p = E.profile(name);
    const list = (k) => val(box, k).split(',').map(x => x.trim()).filter(Boolean);
    p.extra = val(box, 'extra');
    p.sex = readChips(box, 'psex')[0] || p.sex;
    for (const k of ['eyes', 'hair', 'texture', 'skin', 'build']) p[k] = val(box, k);
    for (const k of ['age', 'height', 'iq']) { const n = parseInt(val(box, k), 10); if (n) p[k] = n; }
    const blood = val(box, 'blood').toUpperCase().replace('0', 'O');
    if (blood !== p.blood) { p.blood = /^(A|B|AB|O)[+-]$/.test(blood) ? blood : ''; p.bloodGeno = ''; p.bloodRolled = false; }
    p.talents = readChips(box, 'ptal');
    for (const [k] of TEMP) p.temp[k] = parseInt(val(box, `t-${k}`), 10) || 3;
    p.features = list('features'); p.risks = list('risks'); p.acquired = list('acquired');
    p.powers = val(box, 'powers').split('\n').map(l => l.split(';').map(x => x.trim())).filter(a => a[0]).map(([name, kind, family, level]) => ({ name, kind: POWER_KINDS[kind] ? kind : 'other', family: POWER_FAMILIES[family] ? family : 'other', level: Math.max(1, Math.min(5, parseInt(level, 10) || 2)) }));
    p.family = val(box, 'family'); p.notes = val(box, 'notes');
    p.analyzed = p.analyzed || Date.now();
    E.saveCfg();
}

function geneSheet(k, id) {
    const label = ROWS.find(r => r[0] === id)?.[1] || id;
    const r = k.genes?.[id] || {};
    const v = r.v;
    let html = '';
    const yn = (cur) => chips('g', [['1', 'Да'], ['0', 'Нет']], cur ? '1' : '0');
    switch (id) {
        case 'sex': html = chips('g', [['F', 'Девочка'], ['M', 'Мальчик']], v); break;
        case 'eyes': html = chips('g', pairs([...EYES, 'тёмно-карие', 'серо-зелёные']), v); break;
        case 'hair': html = chips('g', pairs([...HAIR, 'светло-русые', 'медные', 'рыжевато-каштановые']), v); break;
        case 'texture': html = chips('g', pairs(TEXTURE), v); break;
        case 'skin': html = chips('g', pairs(SKIN), v); break;
        case 'chin': case 'dimples': case 'freckles': case 'hand': case 'xgene': html = yn(v); break;
        case 'blood': html = chips('g', pairs(['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']), v); break;
        case 'height': case 'iq': html = `<input type="text" inputmode="numeric" data-zin="num" value="${esc(v ?? '')}">`; break;
        case 'talents': html = chips('g', pairs(TALENTS), v, { multi: true }); break;
        case 'special': case 'risks': html = `<textarea data-zin="txt" rows="3">${esc((v || []).join(', '))}</textarea>`; break;
        case 'temp': html = TEMP.map(([key, l, lo, hi]) => `<div class="lf-inline zr-range"><span>${esc(l)}</span><small>${esc(lo)}</small><input type="range" min="1" max="5" data-zin="t-${key}" value="${v?.[key] || 3}"><small>${esc(hi)}</small></div>`).join(''); break;
        case 'power': html = `${chips('g', Object.entries(POWER_FAMILIES).map(([k2, x]) => [k2, x.name]), v?.family || 'energy')}
            ${fld('Как это выглядит', `<input type="text" data-zin="pname" value="${esc(v?.name || '')}">`)}
            <div class="lf-inline zr-range"><span>Сила</span><small>1</small><input type="range" min="1" max="5" data-zin="plevel" value="${v?.level || 3}"><small>5</small></div>
            <label class="lf-switch"><input type="checkbox" data-zin="pearly" ${v?.early ? 'checked' : ''}><span></span>Проявится рано, ещё в детстве</label>
            <label class="lf-switch"><input type="checkbox" data-zin="pecho" ${v?.echo ? 'checked' : ''}><span></span>Отголоски с младенчества (и в беременности)</label>`; break;
        case 'serum': html = chips('g', SERUM.map(x => [x[0], x[1]]), v, { multi: true }); break;
        case 'stones': html = chips('g', STONES.map(x => [x[0], x[1]]), v, { multi: true }); break;
    }
    A.openSheet(`${ic('dna')} ${esc(label)}`, `${html}
        <button class="lf-btn primary serif full big" data-zact="gene-save" data-id="${esc(k.id)}" data-v="${id}">${ic('lock')} Сохранить и зафиксировать</button>
        ${r.fixed ? `<button class="lf-btn ghost full" data-zact="gene-unfix" data-id="${esc(k.id)}" data-v="${id}">${ic('unlock')} Снять фиксацию</button>` : ''}`);
}

function saveGene(box, k, id) {
    const one = readChips(box, 'g')[0];
    const many = readChips(box, 'g');
    const r = { ...(k.genes[id] || {}), fixed: true, why: 'поправлено руками', p: '' };
    switch (id) {
        case 'chin': case 'dimples': case 'freckles': case 'hand': case 'xgene': r.v = one === '1'; break;
        case 'height': case 'iq': r.v = parseInt(val(box, 'num'), 10) || r.v; if (id === 'height') r.z = +((r.v - (k.genes.sex?.v === 'M' ? 176 : 163)) / 7).toFixed(2); break;
        case 'talents': case 'serum': case 'stones': r.v = many; break;
        case 'special': case 'risks': r.v = val(box, 'txt').split(',').map(x => x.trim()).filter(Boolean); break;
        case 'temp': r.v = Object.fromEntries(TEMP.map(([key]) => [key, parseInt(val(box, `t-${key}`), 10) || 3])); r.type = tempType(r.v); break;
        case 'power': r.v = { family: one || 'energy', name: val(box, 'pname') || POWER_FAMILIES[one || 'energy'].vars[0], level: parseInt(val(box, 'plevel'), 10) || 3, early: checked(box, 'pearly'), echo: checked(box, 'pecho') }; break;
        default: r.v = one ?? r.v;
    }
    if (id === 'blood') r.conflict = String(E.mom(k).blood || '').endsWith('-') && String(r.v).endsWith('+');
    k.genes[id] = r;
    if (id === 'xgene' && r.v && !k.genes.power?.v) k.genes.power = rollRow('power', k, E.mom(k), E.dad(k));
    E.save();
}

function editSheet(k) {
    const c = E.clock();
    const cast = A.castNames();
    const preg = k.stage === 'preg';
    const s = preg ? null : E.babyState(k, c);
    const opt = (sel) => `<option value="">—</option>${cast.map(n => `<option value="${esc(n)}"${A.sameName(n, sel) ? ' selected' : ''}>${esc(n)}</option>`).join('')}`;
    A.openSheet(`${ic(preg ? 'sprout' : 'baby')} ${esc(E.kidName(k))}`, `
        ${fld('Имя', `<input type="text" data-zin="name" value="${esc(k.name || '')}" placeholder="${preg ? 'Зёрнышко' : 'Малышка'}">`)}
        <div class="zr-2">${fld('Мама', `<select data-zin="mother">${opt(k.mother)}</select>`)}${fld('Папа', `<select data-zin="father">${opt(k.father)}</select>`)}</div>
        ${preg ? `${fld('Дата зачатия', `<input type="text" data-zin="conc" value="${esc(dateIn(k.conception))}" placeholder="ГГГГ-ММ-ДД">`)}
        <label class="lf-switch"><input type="checkbox" data-zin="repro" ${k.src === 'repro' ? 'checked' : ''}><span></span>Дата из Reproductive${E.repro()?.conception ? ` (${esc(E.fmtDate(E.repro().conception, true))})` : ' — там пусто'}</label>
        <label class="lf-switch"><input type="checkbox" data-zin="first" ${k.preg.first !== false ? 'checked' : ''}><span></span>Первая беременность</label>
        <label class="lf-switch"><input type="checkbox" data-zin="shield" ${E.shieldOn(k) ? 'checked' : ''}><span></span>Энергия (Камни) у матки защищает плод — меньше осложнений у плода</label>
        <label class="lf-switch"><input type="checkbox" data-zin="bond" ${E.bondOn(k) ? 'checked' : ''}><span></span>Связь: мама чувствует, в порядке ли плод</label>
        ${fld('Роды <small>(обычно отмечает Летописец по посту)</small>', `<button class="lf-btn full" data-zact="birth" data-id="${esc(k.id)}">${ic('baby')} Родилась сейчас — по времени истории</button>`)}`
        : `${fld('Кормление', chips('feed', [['breast', 'Грудь'], ['mixed', 'Грудь и смесь'], ['formula', 'Смесь']], k.feeding))}
        ${s ? fld('Поправить шкалы', [['food', 'Сытость', s.food], ['diaper', 'Подгузник', s.diaper], ['hold', 'На ручки', s.hold]].map(([key, l, v]) => `<div class="lf-inline zr-range"><span>${l}</span><input type="range" min="0" max="100" data-zin="n-${key}" value="${v}"></div>`).join('') + chips('sleep', [['awake', 'Не спит'], ['asleep', 'Спит']], s.asleep ? 'asleep' : 'awake')) : ''}
        ${k.album?.length ? fld('Главный портрет', `<div class="lf-grid zr-grid sm">${[...k.album].reverse().map(x => `<button class="lf-tile sm${x.img === k.img ? ' on' : ''}" data-zact="main-pic" data-id="${esc(k.id)}" data-src="${esc(x.img)}"><img src="${esc(x.img)}" alt=""></button>`).join('')}</div>`) : ''}`}
        <button class="lf-btn primary serif full big" data-zact="edit-save" data-id="${esc(k.id)}">${ic('check')} Сохранить</button>
        <button class="lf-btn ghost full" data-zact="new">${ic('plus')} Ещё ребёнок</button>
        <button class="lf-btn ghost full" data-zact="settings">${ic('settings')} Настройки Зёрнышка</button>
        <button class="lf-btn ghost full" data-zact="del" data-id="${esc(k.id)}">${ic('trash')} ${zui.del === k.id ? 'Точно убрать? Тапни ещё раз' : 'Убрать из этого чата'}</button>`);
}

function settingsSheet() {
    const s = E.cfg();
    const r = E.repro();
    A.openSheet(`${ic('settings')} Зёрнышко`, `
        <label class="lf-switch"><input type="checkbox" data-zcfg="on" ${s.on ? 'checked' : ''}><span></span>Включено</label>
        ${fld(`Симптом телом в ответе: <b data-zout>${s.beat}</b>%`, `<input type="range" min="0" max="100" step="5" data-zcfg="beat" value="${s.beat}">`)}
        <label class="lf-switch"><input type="checkbox" data-zcfg="muteRepro" ${s.muteRepro ? 'checked' : ''}><span></span>Глушить случайный симптом Reproductive (чтобы не было двух)</label>
        ${fld('Реализм осложнений', chips('real', [['soft', 'Мягко'], ['real', 'Как в жизни'], ['drama', 'Драма']], s.realism))}
        <label class="lf-switch"><input type="checkbox" data-zcfg="dailyLLM" ${s.dailyLLM ? 'checked' : ''}><span></span>Тягу дня придумывает модель Летописца (раз в игровой день)</label>
        <label class="lf-switch"><input type="checkbox" data-zcfg="refs" ${s.refs ? 'checked' : ''}><span></span>Портреты — с фото родителей как подсказкой</label>
        <label class="lf-switch"><input type="checkbox" data-zcfg="offscreen" ${s.offscreen !== false ? 'checked' : ''}><span></span>Пропущенные обследования и прививки — за кадром</label>
        <div class="lf-hint">Reproductive: ${r ? (r.pregnant ? `беременность, зачатие ${esc(E.fmtDate(r.conception, true))}, ${r.count > 1 ? `плодов ${r.count}` : 'один плод'}` : r.hasBaby ? 'малыш есть' : 'не беременна') : 'в этом чате данных нет'}. Срок и пол Зёрнышко берёт оттуда, всё остальное ведёт само.</div>`);
}

// ───────────── клики ─────────────

export async function onClick(ev) {
    const el = ev.target.closest('[data-zact]');
    if (!el || !document.getElementById('lf-app')?.contains(el)) return;
    if (el.tagName === 'INPUT' && el.type === 'checkbox' && el.dataset.zact !== 'daycare') return;
    const act = el.dataset.zact;
    const box = el.closest('.lf-sheet');
    const k = el.dataset.id ? E.kidById(el.dataset.id) : null;
    const v = el.dataset.v;
    const rerender = () => { A.render(); try { A.updatePrompt(); } catch { /* */ } };
    try {
        switch (act) {
            case 'open': A.ui.who = `zr:${el.dataset.id}`; A.ui.tab = 'person'; A.closeSheet(); if (!A.ui.open) A.openHub('person'); else A.render(); return;
            case 'new': A.closeSheet(); setTimeout(newKidSheet, 230); return;
            case 'tab': zui.tab[el.dataset.id] = v; A.render(); return;
            case 'chip': {
                const grp = el.closest('[data-zgrp]');
                if (grp?.dataset.multi) el.classList.toggle('on');
                else { grp?.querySelectorAll('.on').forEach(b => b.classList.remove('on')); el.classList.add('on'); }
                if (grp?.dataset.zgrp === 'real') { E.cfg().realism = el.dataset.v; E.saveCfg(); }
                return;
            }
            case 'zoom': A.lightbox(el.dataset.src, el.dataset.cap || ''); return;
            case 'risks': zui.risks = !zui.risks; A.render(); return;
            case 'create': {
                const mother = val(box, 'mother'), father = val(box, 'father');
                if (!mother) { A.toast('warning', 'Выбери маму'); return; }
                const born = readChips(box, 'stage')[0] === 'baby' ? parseDay(val(box, 'born')) || E.clock().t : null;
                const useRepro = checked(box, 'repro') && E.repro()?.conception;
                const conc = useRepro ? E.repro().conception : parseDay(val(box, 'conc'));
                if (!born && !conc) { A.toast('warning', 'Нужна дата зачатия (или дата рождения)'); return; }
                const kid = E.newKid({ mother, father, conception: conc, src: useRepro ? 'repro' : 'manual', birthAt: born, name: val(box, 'name'), lore: checked(box, 'lore'), first: checked(box, 'first') });
                const rs = E.repro();
                if (useRepro && rs?.sex?.[0] && !kid.genes.sex?.fixed) kid.genes.sex = { v: rs.sex[0], fixed: true, why: 'из Reproductive' };
                A.closeSheet();
                A.ui.who = `zr:${kid.id}`; zui.tab[kid.id] = 'genes'; rerender();
                const need = [mother, father].filter(n => n && !E.profile(n).analyzed);
                if (need.length) {
                    A.toast('info', `Разбираю ${need.map(n => A.shortName(n)).join(' и ')} по карточкам…`, '✦ Зёрнышко', { timeOut: 4000 });
                    analyzeKid(kid).then(() => { A.toast('success', 'Гены брошены по родителям', '✦ Зёрнышко'); rerender(); }).catch(e => A.toast('warning', A.esc(String(e?.message || e)), '✦ Зёрнышко', { timeOut: 8000 }));
                }
                return;
            }
            case 'analyze': await A.withBusy(el, async () => { await analyzeKid(k); A.toast('success', 'Родители разобраны, гены переброшены (зафиксированное не тронуто)', '✦ Зёрнышко'); rerender(); }, 'Разбираю…'); return;
            case 'prof': profileSheet(v, el.dataset.id); return;
            case 'prof-analyze': {
                saveProfile(box, v);
                await A.withBusy(el, async () => { await analyze(v); profileSheet(v, el.dataset.id); A.toast('success', 'Разобрано — проверь и поправь', '✦ Зёрнышко'); }, 'Разбираю…');
                return;
            }
            case 'prof-save': { saveProfile(box, v); A.closeSheet(); const kk = E.kidById(el.dataset.id); if (kk) A.toast('info', 'Профиль сохранён. Чтобы гены пересчитались — «Перебросить всё»', '✦ Зёрнышко', { timeOut: 4000 }); rerender(); return; }
            case 'roll': k.genes[v] = { ...rollRow(v, k, E.mom(k), E.dad(k)), at: Date.now() }; if (v === 'xgene') k.genes.power = k.genes.xgene.v ? rollRow('power', k, E.mom(k), E.dad(k)) : { v: null }; E.save(); rerender(); return;
            case 'roll-all': rollAll(k, E.mom(k), E.dad(k)); E.save(); A.toast('info', 'Брошено всё, кроме зафиксированного', '✦ Зёрнышко', { timeOut: 1800 }); rerender(); return;
            case 'gene': geneSheet(k, v); return;
            case 'gene-save': saveGene(box, k, v); A.closeSheet(); rerender(); return;
            case 'gene-unfix': if (k.genes[v]) k.genes[v].fixed = false; E.save(); A.closeSheet(); rerender(); return;
            case 'unfix': if (k.genes[v]) k.genes[v].fixed = false; E.save(); A.toast('info', 'Снова на кубике — 🎲 перебросит', '✦ Зёрнышко', { timeOut: 1800 }); rerender(); return;
            case 'temp-dot': {
                const [key, n] = v.split(':');
                const t = k.genes.temp = k.genes.temp || { v: {} };
                t.v = { ...(t.v || {}), [key]: Number(n) };
                t.type = tempType(t.v); t.fixed = true; t.why = 'поправлено руками'; t.p = '';
                E.save(); rerender(); return;
            }
            case 'plan': {
                const it = PLAN.find(x => x.id === v);
                if (it?.daily) { const day = E.clock().day; k.preg.vit = k.preg.vit || {}; if (k.preg.vit[v] === day) delete k.preg.vit[v]; else E.planDone(k, v); }
                else if (k.preg.plan[v]) delete k.preg.plan[v];
                else { const found = E.planDone(k, v); for (const x of found) A.toast('warning', `Нашли: ${A.esc(x.name.toLowerCase())}`, '✦ Зёрнышко', { timeOut: 6000 }); }
                E.save(); rerender(); return;
            }
            case 'comp-know': if (k.preg.comps[v]) k.preg.comps[v].stage = 'known'; E.save(); rerender(); return;
            case 'comp-off': if (k.preg.comps[v]) k.preg.comps[v].stage = 'resolved'; E.save(); rerender(); return;
            case 'day': await A.withBusy(el, () => E.makeDay(k, { force: true }), ''); rerender(); return;
            case 'us-draw': await A.withBusy(el, () => drawUS(k)); zui.tab[k.id] = 'us'; rerender(); return;
            case 'pic-draw': await A.withBusy(el, () => drawPortrait(k)); rerender(); return;
            case 'main-pic': k.img = el.dataset.src; E.save(); A.closeSheet(); rerender(); return;
            case 'with': k.with = v; E.save(); rerender(); return;
            case 'daycare': k.daycare = el.checked; E.save(); return;
            case 'vax': { const vv = VACCINES.find(x => x.id === v); if (k.health.vax[v]) delete k.health.vax[v]; else { const t = E.clock().t; k.health.vax[v] = { at: t }; k.health.react = vv?.id === 'm12' ? { until: t + 12 * 864e5, text: vv.react } : { until: t + 1.5 * 864e5, text: vv?.react || '' }; } E.save(); rerender(); return; }
            case 'check': { const m = Number(v); if (k.health.checks[m]) delete k.health.checks[m]; else k.health.checks[m] = { at: E.clock().t }; E.save(); rerender(); return; }
            case 'mile': if (k.miles?.[v]) k.miles[v].seen = { off: true, at: E.clock().t }; E.save(); rerender(); return;
            case 'grad': {
                const card = E.graduateCard(k);
                const blob = new Blob([JSON.stringify(card, null, 2)], { type: 'application/json' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob); a.download = `${E.kidName(k)}.json`;
                document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
                A.toast('success', 'Карточка скачана — импортируй в таверну', '✦ Зёрнышко');
                return;
            }
            case 'birth': E.birth(k, { at: E.clock().t }); A.closeSheet(); zui.tab[k.id] = 'now'; rerender(); return;
            case 'edit': editSheet(k); return;
            case 'edit-save': {
                k.name = val(box, 'name');
                const mo = val(box, 'mother'), fa = val(box, 'father');
                if (mo) k.mother = mo; k.father = fa;
                if (k.stage === 'preg') {
                    k.preg.first = checked(box, 'first');
                    k.preg.shield = checked(box, 'shield');
                    k.preg.bond = checked(box, 'bond');
                    if (checked(box, 'repro') && E.repro()?.conception) { k.src = 'repro'; k.conception = E.repro().conception; }
                    else { k.src = 'manual'; const d = parseDay(val(box, 'conc')); if (d) k.conception = d; }
                } else {
                    k.feeding = readChips(box, 'feed')[0] || k.feeding;
                    const t = E.clock().t;
                    for (const key of ['food', 'diaper', 'hold']) { const x = box.querySelector(`[data-zin="n-${key}"]`); if (x) E.setNeed(k, key, Number(x.value), t); }
                    const sl = readChips(box, 'sleep')[0];
                    if (sl) k.needs.sleep = { asleep: sl === 'asleep', since: t };
                }
                E.save(); A.closeSheet(); rerender(); return;
            }
            case 'settings': settingsSheet(); return;
            case 'del':
                if (zui.del !== k.id) { zui.del = k.id; editSheet(k); return; }
                E.delKid(k.id); zui.del = ''; A.ui.who = ''; A.closeSheet(); rerender(); return;
        }
    } catch (e) {
        console.warn('[Зёрнышко]', e);
        A.toast('warning', A.esc(String(e?.message || e)), '✦ Зёрнышко', { timeOut: 7000 });
    }
}

export function onChange(ev) {
    const el = ev.target;
    if (el.dataset?.zcfg) {
        const s = E.cfg();
        const key = el.dataset.zcfg;
        s[key] = el.type === 'checkbox' ? el.checked : Number(el.value);
        E.saveCfg();
        try { A.updatePrompt(); } catch { /* */ }
        return;
    }
    if (el.dataset?.zfile && el.files?.[0]) {
        const k = E.kidById(el.dataset.id);
        if (!k) return;
        const kind = el.dataset.zfile;
        A.withBusy(el.closest('label'), async () => {
            const path = await A.uploadImage(await A.fileToJpeg(el.files[0], 1400), `zr_${kind}`);
            const c = E.clock();
            if (kind === 'us') { const tm = E.term(k, c.t); k.preg.us = [...(k.preg.us || []), { img: path, week: tm?.ow || 0, at: c.t, own: true }]; }
            else { const ag = E.age(k, c.t); k.album = [...(k.album || []), { img: path, label: ag?.label || '', at: c.t, own: true }]; k.img = path; }
            E.save(); A.render();
        }, 'Загружаю…');
    }
}

export function onInput(ev) {
    const el = ev.target;
    if (el.dataset?.zcfg === 'beat') { const out = el.closest('.lf-field')?.querySelector('[data-zout]'); if (out) out.textContent = el.value; }
}

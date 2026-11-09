// Книга малыша. Вся жизнь Зёрнышка одной книгой, по порядку: зачатие и срок, снимки УЗИ по неделям,
// первые толчки, приёмы врача, рождение (вес, рост, Апгар), первые улыбки и шаги, прививки и болезни,
// портреты — собирается сама из того, что Зёрнышко уже знает. Своя страничка — запись и фото руками.

import * as E from './engine.js';
import { A } from './engine.js';
import { MILESTONES, VACCINES, ILLNESSES } from './data.js';
import { ic } from './ui.js';

const esc = (v) => A.esc(v);
const KIND = {
    start: ['зачатие', 'sprout'], due: ['срок', 'calendar'], moment: ['момент', 'heart'], us: ['УЗИ', 'scan'], doc: ['врач', 'hospital'],
    birth: ['рождение', 'baby'], first: ['впервые', 'star'], vax: ['прививка', 'shield'], ill: ['болел(а)', 'thermo'], photo: ['портрет', 'camera'], own: ['запись', 'feather'],
};

/** Все страницы книги по времени истории. */
export function bookEntries(k) {
    if (!k) return [];
    const out = [];
    if (k.conception) out.push({ at: k.conception, kind: 'start', title: 'Зачатие', text: k.lore ? 'Всё началось здесь.' : '' });
    for (const m of k.preg?.moments || []) if (m?.at != null) out.push({ at: m.at, kind: 'moment', title: m.t, mes: m.mes });
    for (const u of k.preg?.us || []) if (u?.img) out.push({ at: u.at, kind: 'us', title: `УЗИ, ${u.week} нед${u.day ? ` ${u.day} дн` : ''}`, text: u.want || '', img: u.img });
    for (const l of E.meta().medlog || []) if (l?.kidId === k.id && l.at != null) out.push({ at: l.at, kind: 'doc', title: l.title || 'Приём у врача', text: [l.found, l.said].filter(Boolean).join(' ').slice(0, 300), mes: l.mes });
    if (k.birth?.at != null) out.push({ at: k.birth.at, kind: 'birth', title: 'Родил' + (k.genes?.sex?.v === 'M' ? 'ся' : 'ась'), text: [`${k.birth.week} нед`, k.birth.weight ? `${k.birth.weight} г` : '', k.birth.length ? `${k.birth.length} см` : '', k.birth.apgar ? `Апгар ${k.birth.apgar}` : '', k.birth.how || ''].filter(Boolean).join(' · ') });
    for (const ms of MILESTONES) { const s = k.miles?.[ms.id]?.seen; if (s?.at != null) out.push({ at: s.at, kind: 'first', title: ms.t, mes: s.mes }); }
    for (const v of VACCINES) { const x = k.health?.vax?.[v.id]; if (x?.at != null && !x.off) out.push({ at: x.at, kind: 'vax', title: v.name, mes: x.mes }); }
    for (const h of k.health?.hist || []) { const il = ILLNESSES.find(x => x.id === h.id); if (il && h.from != null) out.push({ at: h.from, kind: 'ill', title: il.name, text: h.to ? `до ${E.fmtDate(h.to)}` : '' }); }
    for (const a of k.album || []) if (a?.img && a.at != null) out.push({ at: a.at, kind: 'photo', title: a.label || 'Портрет', img: a.img });
    for (const p of k.book || []) if (p?.at != null) out.push({ ...p, kind: 'own' });
    return out.sort((a, b) => a.at - b.at || (a.kind === 'birth' ? -1 : 0));
}

function chapterOf(k, at) {
    if (!k.birth?.at || at < k.birth.at) return 'Ожидание';
    const ag = E.age(k, at);
    const m = ag?.months ?? 0;
    if (m < 12) return 'Первый год';
    if (m < 24) return 'Второй год';
    return `${Math.floor(m / 12) + 1}-й год`;
}

export function bookTab(k) {
    const list = bookEntries(k);
    const name = E.kidName(k);
    const cover = k.img || k.album?.slice(-1)[0]?.img || k.preg?.us?.slice(-1)[0]?.img || '';
    const born = k.birth?.at ? E.fmtDate(k.birth.at, true) : '';
    const due = !k.birth && k.conception ? E.fmtDate(k.conception + 266 * 864e5, true) : '';
    let ch = '';
    const pages = list.map((e, n) => {
        const c = chapterOf(k, e.at);
        const head = c !== ch ? `<h3 class="zr-bk-ch">${esc(c)}</h3>` : '';
        ch = c;
        const ag = k.birth?.at && e.at >= k.birth.at ? E.age(k, e.at)?.label : '';
        const tilt = ((n * 37) % 7) - 3;
        return `${head}<div class="zr-bk-e k-${e.kind}">
            <div class="zr-bk-d">${esc(E.fmtDate(e.at, true))}${ag ? ` · ${esc(ag)}` : ''}</div>
            ${e.img ? `<figure class="zr-bk-ph" style="--tilt:${tilt}deg" data-zact="zoom" data-src="${esc(e.img)}" data-cap="${esc(e.title)}"><i style="background-image:url('${esc(e.img)}')"></i></figure>` : ''}
            <div class="zr-bk-t">${ic(KIND[e.kind]?.[1] || 'sparkles')}<b>${esc(e.title)}</b></div>
            ${e.text ? `<p>${esc(e.text)}</p>` : ''}
            <div class="zr-bk-b">${Number.isFinite(e.mes) ? `<button data-act="jump" data-mes="${e.mes}">к посту</button>` : ''}${e.kind === 'own' ? `<button data-zact="book-del" data-id="${esc(k.id)}" data-v="${esc(e.id)}">убрать</button>` : ''}</div>
        </div>`;
    }).join('');
    return `<div class="zr-book">
        <div class="zr-bk-cover">
            ${cover ? `<figure class="zr-bk-ph big" style="--tilt:-2deg" data-zact="zoom" data-src="${esc(cover)}"><i style="background-image:url('${esc(cover)}')"></i></figure>` : ''}
            <div class="zr-bk-title">Книга<br><b>${esc(name)}</b></div>
            <div class="zr-bk-sub">${born ? `родил${k.genes?.sex?.v === 'M' ? 'ся' : 'ась'} ${esc(born)}` : due ? `ждём к ${esc(due)}` : ''}${k.mother ? ` · мама — ${esc(A.shortName(k.mother))}` : ''}${k.father ? `, папа — ${esc(A.shortName(k.father))}` : ''}</div>
        </div>
        ${pages || '<div class="zr-bk-empty">Страницы появятся сами: снимки УЗИ, первые толчки, приёмы, рождение, первые улыбки…</div>'}
        <div class="zr-bk-own">
            <textarea data-zin="book-text" rows="3" placeholder="Своя страничка: что хочется запомнить"></textarea>
            <div class="lf-actions tight"><button class="lf-btn primary" data-zact="book-add" data-id="${esc(k.id)}">${ic('feather')} Записать</button><label class="lf-btn">${ic('upload')} С фото<input type="file" accept="image/*" data-zfile="book" data-id="${esc(k.id)}" hidden></label></div>
        </div>
    </div>`;
}

/** Своя страница: текст (и фото, если пришло из загрузки). */
export function bookAdd(k, { text = '', img = '' } = {}) {
    const t = String(text || '').trim();
    if (!t && !img) return false;
    const c = E.clock();
    k.book = [...(k.book || []), { id: E.uid(), at: c.t ?? Date.now(), title: t ? t.split(/[.!?\n]/)[0].slice(0, 60) : 'Фото', text: t.length > 60 ? t : '', img }];
    E.save();
    return true;
}

export function bookDel(k, id) {
    k.book = (k.book || []).filter(p => p.id !== id);
    E.save();
}

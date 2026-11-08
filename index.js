// ✦ Зёрнышко — беременность и малыш как живая расширка внутри Life.
// Цепляется к Life через LifeBridge: кнопка в «Персонаже», строчка в «Сцене», поле Летописца, скрытая заметка модели.

import { extension_prompts } from '../../../../script.js';
import * as E from './engine.js';
import * as U from './ui.js';
import * as D from './doctor.js';

const ID = 'zr';
let api = null;

// ───────────── Священный таймлайн: где беременности нет — молчим ─────────────
// Решает ядро по эпохе и миру: mode('zernyshko') === 'off' (до 2024-го и в чужих мирах). Без ядра — работаем как всегда.

function asleep() {
    try { return window.SacredTimeline?.mode?.('zernyshko') === 'off'; } catch { return false; }
}

// ───────────── Reproductive: глушим его случайный симптом, когда симптомы ведёт Зёрнышко ─────────────

function muteRepro() {
    try {
        const s = E.cfg();
        if (!s.on || !s.muteRepro || !E.kids().some(k => k.stage === 'preg')) return;
        for (const key of ['reproductive-system', 'reproductive-system_sys']) {
            const p = extension_prompts?.[key];
            if (p?.value && p.value.includes('[SYMPTOM BEAT')) p.value = p.value.replace(/\[SYMPTOM BEAT — THIS reply only\][\s\S]*?same symptom instead\.\n?/g, '');
        }
    } catch (e) { console.warn('[Зёрнышко] Reproductive', e); }
}

globalThis.zernyshko_intercept = async function (_chat, _size, _abort, type) {
    if (type === 'quiet') return;
    muteRepro();
};

// ───────────── события ─────────────

function toastEvents(list) {
    const l = (list || []).filter(Boolean);
    if (!l.length) return;
    api?.toast?.('info', api.esc(l.slice(0, 4).join(' · ')) + (l.length > 4 ? ` · и ещё ${l.length - 4}` : ''), '✦ Зёрнышко', { timeOut: 6500 });
}

function freshDay() {
    if (!E.cfg().on || asleep()) return;
    const day = E.clock().day;
    for (const k of E.kids()) {
        if (k.stage === 'preg' && k.preg?.today?.day !== day) E.makeDay(k).then(() => { try { api?.updatePrompt?.(); } catch { /* */ } }).catch(() => { });
    }
}

function register() {
    const B = globalThis.LifeBridge;
    if (!B?.register) return false;
    B.register({
        id: ID,
        init(a) { api = a; E.setApi(a); },
        prompt: (type) => {
            if (asleep()) return '';
            try { toastEvents(E.tick()); } catch { /* */ }
            return [E.promptNote(type), D.promptDoc()].filter(Boolean).join('\n');
        },
        // карточка-«артефакт» в посте с фото УЗИ — сюда идёт снимок из Зёрнышка (тот, что видят боты)
        artImage: (info) => (asleep() ? null : E.usForArt(info)),
        chron: () => {
            if (asleep()) return null;
            const h = E.chronHook();
            if (h && D.docs().length) h.input += `\nВрачи истории (поле doctor — их слова и действия): ${D.docs().map(d => `${d.name} (${D.ROLES[d.role]})`).join('; ')}.`;
            return h;
        },
        afterPost: (i, j, m) => {
            if (asleep()) return;
            let ev = [];
            try { ev = D.onBotPost(i, j?.zr); } catch (e) { console.warn('[Зёрнышко] врач', e); }
            toastEvents([...ev, ...E.afterPost(i, j, m)]);
            freshDay();
        },
        personRow: (who) => (asleep() ? '' : U.personRow(who)),
        renderPerson: (rest) => (asleep() ? '<div class="lf-empty small">✦ В этой эпохе Зёрнышко спит — беременность и малыш живут в 2024-м.</div>' : U.renderKid(rest)),
        sceneHtml: () => (asleep() ? '' : U.sceneHtml()),
    });
    return true;
}

function settingsDrawer() {
    const host = document.getElementById('extensions_settings2') || document.getElementById('extensions_settings');
    if (!host || document.getElementById('zr-drawer')) return;
    const s = E.cfg();
    host.insertAdjacentHTML('beforeend', `
    <div id="zr-drawer" class="inline-drawer">
        <div class="inline-drawer-toggle inline-drawer-header"><b>✦ Зёрнышко</b><div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div></div>
        <div class="inline-drawer-content">
            <label class="checkbox_label"><input type="checkbox" id="zr_on" ${s.on ? 'checked' : ''}> Включено</label>
            <small>Беременность и малыш живут в Life: хаб → «Персонаж» → росток. Команда <code>/zr</code>.</small>
        </div>
    </div>`);
    document.getElementById('zr_on')?.addEventListener('change', function () { E.cfg().on = this.checked; E.saveCfg(); try { api?.updatePrompt?.(); } catch { /* */ } });
}

function openKid() {
    if (!api) return;
    if (asleep()) { window.toastr?.info?.('В этой эпохе Зёрнышко спит.', '✦ Зёрнышко'); return; }
    const k = E.kids().slice(-1)[0];
    api.ui.who = k ? `zr:${k.id}` : '';
    api.ui.tab = 'person';
    api.openHub('person');
    if (!k) setTimeout(() => document.querySelector('#lf-app [data-zact="new"]')?.click(), 300);
}

function registerSlash() {
    try {
        const { SlashCommandParser, SlashCommand } = SillyTavern.getContext();
        SlashCommandParser.addCommandObject(SlashCommand.fromProps({
            name: 'zr', helpString: 'Зёрнышко: открыть карточку малыша в Life', returns: 'ничего',
            callback: () => { openKid(); return ''; },
        }));
    } catch (e) { console.warn('[Зёрнышко] команда', e); }
}

jQuery(async () => {
    E.cfg();
    document.addEventListener('click', U.onClick);
    document.addEventListener('change', U.onChange);
    document.addEventListener('input', U.onInput);
    settingsDrawer();
    registerSlash();
    let tries = 0;
    const iv = setInterval(() => {
        if (register()) { clearInterval(iv); console.log('[Зёрнышко] подключилось к Life'); return; }
        if (++tries > 120) { clearInterval(iv); window.toastr?.warning?.('Зёрнышко живёт внутри Life, а Life не найден или старый (нужен мост LifeBridge — обнови Life).', '✦ Зёрнышко', { timeOut: 12000 }); }
    }, 500);
    try {
        const { eventSource, event_types } = SillyTavern.getContext();
        eventSource.on(event_types.MESSAGE_SENT, (id) => { if (!api || asleep()) return; D.onUserPost(Number(id)).then(ev => { toastEvents(ev); try { api.updatePrompt(); } catch { /* */ } }).catch(() => { }); });
        eventSource.on(event_types.CHAT_CHANGED, () => setTimeout(() => { if (!api || asleep()) return; try { toastEvents(E.tick()); freshDay(); } catch (e) { console.warn('[Зёрнышко]', e); } }, 1500));
    } catch (e) { console.warn('[Зёрнышко] события', e); }
});

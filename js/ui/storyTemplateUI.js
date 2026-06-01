// ==========================================
// storyTemplateUI.js — 专用模板编辑弹窗
// ==========================================

import { loadTemplates, saveTemplate, getContextKeys, getContextsConfig, getFieldLabel, saveLabel } from '../base/storyTypes.js';
import { store } from '../data/storyStore.js';

let _currentCtx = 'content';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function esc(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

export function openTemplateEditor() {
    const existing = $('#modal-template-editor');
    if (existing) { existing.classList.add('open'); renderModalContent(); return; }

    const modal = document.createElement('div');
    modal.id = 'modal-template-editor';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-box">
            <div class="modal-header"><h2>📋 模板编辑</h2><button class="modal-close" id="btn-modal-close">✕</button></div>
            <div class="modal-body" id="modal-template-body"></div>
            <div class="modal-footer"><button class="btn btn-sm" id="btn-modal-close-bottom">关闭</button></div>
        </div>`;
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('open'));

    const close = () => closeTemplateEditor();
    $('#btn-modal-close').addEventListener('click', close);
    $('#btn-modal-close-bottom').addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    renderModalContent();
}

export function closeTemplateEditor() {
    const modal = $('#modal-template-editor');
    if (modal) { modal.classList.remove('open'); setTimeout(() => { if (modal.parentNode) modal.parentNode.removeChild(modal); }, 200); }
}

function renderModalContent() {
    const body = $('#modal-template-body');
    if (!body) return;

    const allTpls = loadTemplates();
    const ctxKeys = getContextKeys();
    const ctxConfig = getContextsConfig();
    const tpl = allTpls[_currentCtx] || {};
    const entries = Object.entries(tpl);
    const ctxBtns = ctxKeys.map(k => `<button class="tpl-ctx-btn ${k === _currentCtx ? 'active' : ''}" data-ctx="${k}" title="${(ctxConfig[k]||{}).description||''}">${(ctxConfig[k]||{}).label||k}</button>`).join('');
    const fields = entries.map(([key, v]) => renderField(key, v)).join('');
    const jsonStr = JSON.stringify(tpl, null, 4);

    body.innerHTML = `
        <div class="tpl-ctx-bar"><label>模板上下文：</label>${ctxBtns}</div>
        <div class="editor-fields" id="tpl-fields">${fields}</div>
        <div style="display:flex;gap:8px;align-items:center;margin-top:4px">
            <button class="btn btn-sm btn-success" id="btn-add-tpl-field">＋ 添加字段</button>
            <select id="tpl-add-type" class="input-sm" style="width:auto">
                <option value="string">字符串</option><option value="number">数字</option><option value="array">数组</option><option value="object">对象</option>
            </select>
        </div>
        <div style="margin-top:12px;font-size:0.75rem;color:var(--text-dim)">JSON 编辑（直接修改后自动保存）：</div>
        <div class="tpl-json-mirror"><pre class="json-highlight"><code id="tpl-json-code"></code></pre><textarea id="tpl-json-editor" class="json-editor" spellcheck="false"></textarea></div>`;

    const hlCode = $('#tpl-json-code');
    const editor = $('#tpl-json-editor');
    if (hlCode && editor) { editor.value = jsonStr; applyHighlight(hlCode, jsonStr); }

    $$('.tpl-ctx-btn').forEach(btn => btn.addEventListener('click', () => { _currentCtx = btn.dataset.ctx; renderModalContent(); }));
    $('#btn-add-tpl-field').addEventListener('click', () => {
        const all = loadTemplates(); const ctx = all[_currentCtx] || {};
        let key = 'new_field'; let i = 1;
        while (key in ctx) key = 'new_field_' + i++;
        const type = ($('#tpl-add-type')||{}).value || 'string';
        switch (type) { case 'number': ctx[key] = 0; break; case 'array': ctx[key] = []; break; case 'object': ctx[key] = {}; break; default: ctx[key] = ''; }
        saveTemplate(_currentCtx, ctx); renderModalContent(); store._emit();
    });
    $$('.btn-del-tmpl').forEach(btn => btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const all = loadTemplates(); const ctx = all[_currentCtx] || {};
        delete ctx[btn.dataset.delKey]; saveTemplate(_currentCtx, ctx); renderModalContent(); store._emit();
    }));
    $$('.tmpl-field').forEach(inp => inp.addEventListener('input', debounce(() => {
        const current = loadTemplates(); const ctx = current[_currentCtx] || {};
        ctx[inp.dataset.field] = inp.value; saveTemplate(_currentCtx, ctx); syncJSONEditorFromFields();
    }, 250)));
    $$('.tmpl-i18n-zh').forEach(inp => inp.addEventListener('input', debounce(() => {
        const all = loadTemplates(); const ctx = all[_currentCtx] || {};
        if (typeof ctx[inp.dataset.field] !== 'object') ctx[inp.dataset.field] = { zh: '', en: '' };
        ctx[inp.dataset.field].zh = inp.value; saveTemplate(_currentCtx, ctx); syncJSONEditorFromFields();
    }, 250)));
    $$('.tmpl-i18n-en').forEach(inp => inp.addEventListener('input', debounce(() => {
        const all = loadTemplates(); const ctx = all[_currentCtx] || {};
        if (typeof ctx[inp.dataset.field] !== 'object') ctx[inp.dataset.field] = { zh: '', en: '' };
        ctx[inp.dataset.field].en = inp.value; saveTemplate(_currentCtx, ctx); syncJSONEditorFromFields();
    }, 250)));

    if (editor) {
        editor.addEventListener('input', () => applyHighlight(hlCode, editor.value));
        editor.addEventListener('scroll', () => { const pre = editor.parentElement.querySelector('.json-highlight'); if (pre) { pre.scrollTop = editor.scrollTop; pre.scrollLeft = editor.scrollLeft; } });
        editor.addEventListener('blur', () => {
            try {
                const parsed = JSON.parse(editor.value);
                const all = loadTemplates(); all[_currentCtx] = parsed;
                saveTemplate(_currentCtx, parsed); store._emit();
                const newTpl = loadTemplates()[_currentCtx] || {};
                const fc = $('#tpl-fields');
                if (fc) { fc.innerHTML = Object.entries(newTpl).map(([k, v]) => renderField(k, v)).join(''); rebindFieldEvents(); }
            } catch (e) {}
        });
    }

    $$('.editable-label').forEach(label => {
        const handler = (e) => {
            e.stopPropagation();
            const key = label.dataset.key;
            const current = label.textContent;
            const input = document.createElement('input');
            input.className = 'input-sm label-editor';
            input.value = current;
            input.style.width = Math.max(60, label.offsetWidth + 20) + 'px';
            label.replaceWith(input);
            input.focus();
            input.select();
            function finish() {
                const newLabel = input.value.trim();
                if (newLabel && newLabel !== current) { saveLabel(key, newLabel); renderModalContent(); }
                else {
                    const lbl = document.createElement('label');
                    lbl.className = 'editable-label';
                    lbl.dataset.key = key; lbl.textContent = current;
                    lbl.title = '双击编辑标签';
                    lbl.addEventListener('dblclick', handler);
                    input.replaceWith(lbl);
                }
            }
            input.addEventListener('blur', finish);
            input.addEventListener('keydown', (e) => { if (e.key === 'Enter') finish(); if (e.key === 'Escape') { input.value = current; finish(); } });
        };
        label.addEventListener('dblclick', handler);
    });
}

function rebindFieldEvents() {
    $$('.btn-del-tmpl').forEach(btn => btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const all = loadTemplates(); const ctx = all[_currentCtx] || {};
        delete ctx[btn.dataset.delKey]; saveTemplate(_currentCtx, ctx); renderModalContent(); store._emit();
    }));
    $$('.tmpl-field').forEach(inp => inp.addEventListener('input', debounce(() => {
        const current = loadTemplates(); const ctx = current[_currentCtx] || {};
        ctx[inp.dataset.field] = inp.value; saveTemplate(_currentCtx, ctx); syncJSONEditorFromFields();
    }, 250)));
    $$('.tmpl-i18n-zh').forEach(inp => inp.addEventListener('input', debounce(() => {
        const all = loadTemplates(); const ctx = all[_currentCtx] || {};
        if (typeof ctx[inp.dataset.field] !== 'object') ctx[inp.dataset.field] = { zh: '', en: '' };
        ctx[inp.dataset.field].zh = inp.value; saveTemplate(_currentCtx, ctx); syncJSONEditorFromFields();
    }, 250)));
    $$('.tmpl-i18n-en').forEach(inp => inp.addEventListener('input', debounce(() => {
        const all = loadTemplates(); const ctx = all[_currentCtx] || {};
        if (typeof ctx[inp.dataset.field] !== 'object') ctx[inp.dataset.field] = { zh: '', en: '' };
        ctx[inp.dataset.field].en = inp.value; saveTemplate(_currentCtx, ctx); syncJSONEditorFromFields();
    }, 250)));
    $$('.editable-label').forEach(label => {
        const handler = (e) => {
            e.stopPropagation();
            const key = label.dataset.key; const current = label.textContent;
            const input = document.createElement('input');
            input.className = 'input-sm label-editor'; input.value = current;
            input.style.width = Math.max(60, label.offsetWidth + 20) + 'px';
            label.replaceWith(input); input.focus(); input.select();
            function finish() {
                const newLabel = input.value.trim();
                if (newLabel && newLabel !== current) { saveLabel(key, newLabel); renderModalContent(); }
                else {
                    const lbl = document.createElement('label');
                    lbl.className = 'editable-label'; lbl.dataset.key = key;
                    lbl.textContent = current; lbl.title = '双击编辑标签';
                    lbl.addEventListener('dblclick', handler); input.replaceWith(lbl);
                }
            }
            input.addEventListener('blur', finish);
            input.addEventListener('keydown', (e) => { if (e.key === 'Enter') finish(); if (e.key === 'Escape') { input.value = current; finish(); } });
        };
        label.addEventListener('dblclick', handler);
    });
}

function applyHighlight(codeEl, text) {
    codeEl.textContent = text;
    if (window.hljs) { try { codeEl.innerHTML = window.hljs.highlight(text, { language: 'json' }).value; } catch (e) {} }
}

function syncJSONEditorFromFields() {
    const editor = $('#tpl-json-editor');
    const hlCode = $('#tpl-json-code');
    if (!editor) return;
    const all = loadTemplates();
    const tpl = all[_currentCtx] || {};
    const jsonStr = JSON.stringify(tpl, null, 4);
    editor.value = jsonStr;
    applyHighlight(hlCode, jsonStr);
}

function renderField(key, v) {
    const labelText = getFieldLabel(key);
    if (typeof v === 'object' && !Array.isArray(v) && v !== null && v.zh !== undefined && v.en !== undefined) {
        return `<div class="field-row"><label class="editable-label" data-key="${key}" title="双击编辑标签">${esc(labelText)}</label><div class="i18n-group"><input class="input tmpl-i18n-zh" data-field="${key}" value="${esc(v.zh||'')}" placeholder="zh" /><input class="input tmpl-i18n-en" data-field="${key}" value="${esc(v.en||'')}" placeholder="en" /></div><button class="btn-icon btn-del-tmpl" data-del-key="${key}" title="删除字段">✕</button></div>`;
    }
    if (Array.isArray(v)) {
        return `<div class="field-row"><label class="editable-label" data-key="${key}" title="双击编辑标签">${esc(labelText)}</label><input class="input tmpl-field" data-field="${key}" value="${esc(JSON.stringify(v))}" placeholder="[]" /><button class="btn-icon btn-del-tmpl" data-del-key="${key}" title="删除字段">✕</button></div>`;
    }
    if (typeof v === 'object' && v !== null) {
        return `<div class="field-row"><label class="editable-label" data-key="${key}" title="双击编辑标签">${esc(labelText)}</label><input class="input tmpl-field" data-field="${key}" value="${esc(JSON.stringify(v))}" placeholder="{}" /><button class="btn-icon btn-del-tmpl" data-del-key="${key}" title="删除字段">✕</button></div>`;
    }
    const strVal = v === null || v === undefined ? '' : String(v);
    return `<div class="field-row"><label class="editable-label" data-key="${key}" title="双击编辑标签">${esc(labelText)}</label><input class="input tmpl-field" data-field="${key}" value="${esc(strVal)}" /><button class="btn-icon btn-del-tmpl" data-del-key="${key}" title="删除字段">✕</button></div>`;
}

function debounce(fn, delay) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

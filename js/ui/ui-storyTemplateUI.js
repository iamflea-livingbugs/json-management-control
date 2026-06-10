// ==========================================
// storyTemplateUI.js — 模板编辑弹窗
// 所有增删改操作仅修改内存草稿，点"保存"才写入 localStorage
// ==========================================

import { loadTemplates, getContextKeys, getContextsConfig, getFieldLabel, saveLabel, saveTemplates } from '../logic/logic-storyTypes.js';
import { store } from '../logic/logic-storyStore.js';
import { showConfirm, makeModalDraggable } from './ui-modalDialog.js';

let _currentCtx = 'content';   // 当前正在编辑的上下文
let _draft = null;             // 内存草稿：{ [ctx]: templateObj }
let _dirty = false;            // 是否有未保存的修改

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function esc(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ----- 打开/关闭弹窗 -----

export function openTemplateEditor() {
    const existing = $('#modal-template-editor');
    if (existing) { existing.classList.add('open'); return; }

    // 从 localStorage 深拷贝到草稿
    _draft = JSON.parse(JSON.stringify(loadTemplates()));
    _dirty = false;

    const modal = document.createElement('div');
    modal.id = 'modal-template-editor';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-box">
            <div class="modal-header"><h2>📋 模板编辑</h2><button class="modal-close" id="btn-modal-close">✕</button></div>
            <div class="modal-body" id="modal-template-body"></div>
            <div class="modal-footer">
                <button class="btn btn-sm btn-primary" id="btn-template-save">💾 保存</button>
                <button class="btn btn-sm" id="btn-modal-close-bottom">关闭（不保存）</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('open'));
    makeModalDraggable(modal);

    // Enter 键触发保存
    modal.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && document.activeElement?.tagName === 'INPUT') {
            e.preventDefault();
            const saveBtn = document.getElementById('btn-template-save');
            if (saveBtn) saveBtn.click();
        }
    });

    // 保存
    $('#btn-template-save').addEventListener('click', () => {
        saveTemplates(_draft);
        store._emit();
        _dirty = false;
        closeTemplateEditor();
    });

    // 关闭
    const doClose = () => {
        if (_dirty) {
            showConfirm('有未保存的修改，确定不保存吗？').then(ok => { if (ok) closeTemplateEditor(); });
        } else {
            closeTemplateEditor();
        }
    };
    $('#btn-modal-close').addEventListener('click', doClose);
    $('#btn-modal-close-bottom').addEventListener('click', doClose);
    modal.addEventListener('click', (e) => { if (e.target === modal) doClose(); });

    renderModalContent();
}

export function closeTemplateEditor() {
    const modal = $('#modal-template-editor');
    if (modal) { modal.classList.remove('open'); setTimeout(() => { if (modal.parentNode) modal.parentNode.removeChild(modal); }, 200); }
    _draft = null;
    _dirty = false;
}

// ----- 从草稿获取当前上下文的模板 -----

function getDraftCtx() {
    if (!_draft) _draft = JSON.parse(JSON.stringify(loadTemplates()));
    if (!_draft[_currentCtx]) _draft[_currentCtx] = {};
    return _draft[_currentCtx];
}

// ----- 渲染弹窗内容 -----

function renderModalContent() {
    const body = $('#modal-template-body');
    if (!body) return;

    const ctxKeys = getContextKeys();
    const ctxConfig = getContextsConfig();
    const tpl = getDraftCtx();

    const ctxBtns = ctxKeys.map(k =>
        `<button class="tpl-ctx-btn ${k === _currentCtx ? 'active' : ''}" data-ctx="${k}" title="${(ctxConfig[k]||{}).description||''}">${(ctxConfig[k]||{}).label||k}</button>`
    ).join('');
    const fields = Object.entries(tpl).map(([key, v]) => renderField(key, v)).join('');
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
        <div style="margin-top:12px;font-size:0.75rem;color:var(--text-dim)">JSON 编辑：</div>
        <div class="tpl-json-mirror">
            <pre class="json-highlight"><code id="tpl-json-code"></code></pre>
            <textarea id="tpl-json-editor" class="json-editor" spellcheck="false"></textarea>
        </div>`;

    const hlCode = $('#tpl-json-code');
    const editor = $('#tpl-json-editor');
    if (hlCode && editor) { editor.value = jsonStr; applyHighlight(hlCode, jsonStr); }

    // ----- 事件绑定 -----

    // 切换上下文
    $$('.tpl-ctx-btn').forEach(btn =>
        btn.addEventListener('click', () => { _currentCtx = btn.dataset.ctx; renderModalContent(); })
    );

    // 添加字段（仅修改草稿）
    $('#btn-add-tpl-field').addEventListener('click', () => {
        const ctx = getDraftCtx();
        let key = 'new_field';
        let i = 1;
        while (key in ctx) key = 'new_field_' + i++;
        const type = ($('#tpl-add-type')||{}).value || 'string';
        switch (type) { case 'number': ctx[key] = 0; break; case 'array': ctx[key] = []; break; case 'object': ctx[key] = {}; break; default: ctx[key] = ''; }
        _dirty = true;
        renderModalContent();
    });

    // 删除字段（需要确认）
    $$('.btn-del-tmpl').forEach(btn =>
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const key = btn.dataset.delKey;
            showConfirm(`确定删除字段 "${getFieldLabel(key)}" 吗？`).then(ok => {
                if (!ok) return;
                const ctx = getDraftCtx();
                delete ctx[key];
                _dirty = true;
                renderModalContent();
            });
        })
    );

    // 表单字段编辑 → 同步草稿
    bindFieldEvents();

    // JSON 编辑器
    if (editor) {
        editor.addEventListener('input', () => applyHighlight(hlCode, editor.value));
        editor.addEventListener('scroll', () => {
            const pre = editor.parentElement.querySelector('.json-highlight');
            if (pre) { pre.scrollTop = editor.scrollTop; pre.scrollLeft = editor.scrollLeft; }
        });
        editor.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = editor.selectionStart;
                const end = editor.selectionEnd;
                editor.value = editor.value.substring(0, start) + '    ' + editor.value.substring(end);
                editor.selectionStart = editor.selectionEnd = start + 4;
                editor.dispatchEvent(new Event('input'));
            }
        });
        // 失焦时解析 JSON 更新草稿
        editor.addEventListener('blur', () => {
            try {
                const parsed = JSON.parse(editor.value);
                _draft[_currentCtx] = parsed;
                _dirty = true;
                const fc = $('#tpl-fields');
                if (fc) { fc.innerHTML = Object.entries(parsed).map(([k, v]) => renderField(k, v)).join(''); rebindFieldEvents(); }
            } catch (e) {}
        });
    }

    // 字段标签双击改名
    $$('.editable-label').forEach(label => { label.addEventListener('dblclick', handleLabelEdit); });
}

// ----- 字段事件绑定（仅修改草稿）-----

function bindFieldEvents() {
    $$('.tmpl-field').forEach(inp => inp.addEventListener('input', debounce(() => {
        const ctx = getDraftCtx();
        ctx[inp.dataset.field] = inp.value;
        _dirty = true;
        syncJSONEditorFromDraft();
    }, 250)));

    $$('.tmpl-i18n-zh').forEach(inp => inp.addEventListener('input', debounce(() => {
        const ctx = getDraftCtx();
        if (typeof ctx[inp.dataset.field] !== 'object') ctx[inp.dataset.field] = { zh: '', en: '' };
        ctx[inp.dataset.field].zh = inp.value;
        _dirty = true;
        syncJSONEditorFromDraft();
    }, 250)));

    $$('.tmpl-i18n-en').forEach(inp => inp.addEventListener('input', debounce(() => {
        const ctx = getDraftCtx();
        if (typeof ctx[inp.dataset.field] !== 'object') ctx[inp.dataset.field] = { zh: '', en: '' };
        ctx[inp.dataset.field].en = inp.value;
        _dirty = true;
        syncJSONEditorFromDraft();
    }, 250)));
}

function rebindFieldEvents() {
    $$('.btn-del-tmpl').forEach(btn =>
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const key = btn.dataset.delKey;
            showConfirm(`确定删除字段 "${getFieldLabel(key)}" 吗？`).then(ok => {
                if (!ok) return;
                const ctx = getDraftCtx();
                delete ctx[key];
                _dirty = true;
                renderModalContent();
            });
        })
    );
    bindFieldEvents();
    $$('.editable-label').forEach(label => { label.addEventListener('dblclick', handleLabelEdit); });
}

// ----- JSON 语法高亮 -----

function applyHighlight(codeEl, text) {
    codeEl.textContent = text;
    if (window.hljs) { try { codeEl.innerHTML = window.hljs.highlight(text, { language: 'json' }).value; } catch (e) {} }
}

function syncJSONEditorFromDraft() {
    const editor = $('#tpl-json-editor');
    const hlCode = $('#tpl-json-code');
    if (!editor) return;
    const tpl = getDraftCtx();
    const jsonStr = JSON.stringify(tpl, null, 4);
    editor.value = jsonStr;
    applyHighlight(hlCode, jsonStr);
}

// ----- 字段渲染 -----

function renderField(key, v) {
    const labelText = getFieldLabel(key);
    if (typeof v === 'object' && !Array.isArray(v) && v !== null && v.zh !== undefined && v.en !== undefined) {
        return `<div class="field-row field-row-i18n"><label class="editable-label" data-key="${key}" title="双击编辑标签">${esc(labelText)}</label><span class="type-badge type-i18n">i18n</span><div class="i18n-group"><input class="input tmpl-i18n-zh" data-field="${key}" value="${esc(v.zh||'')}" placeholder="zh" /><input class="input tmpl-i18n-en" data-field="${key}" value="${esc(v.en||'')}" placeholder="en" /></div><button class="btn-icon btn-del-tmpl" data-del-key="${key}" title="删除字段">✕</button></div>`;
    }
    if (Array.isArray(v)) {
        return `<div class="field-row field-row-arr"><label class="editable-label" data-key="${key}" title="双击编辑标签">${esc(labelText)}</label><span class="type-badge type-arr">arr[${v.length}]</span><input class="input tmpl-field" data-field="${key}" value="${esc(JSON.stringify(v))}" placeholder="[]" /><button class="btn-icon btn-del-tmpl" data-del-key="${key}" title="删除字段">✕</button></div>`;
    }
    if (typeof v === 'object' && v !== null) {
        return `<div class="field-row field-row-obj"><label class="editable-label" data-key="${key}" title="双击编辑标签">${esc(labelText)}</label><span class="type-badge type-obj">obj{${Object.keys(v).length}}</span><input class="input tmpl-field" data-field="${key}" value="${esc(JSON.stringify(v))}" placeholder="{}" /><button class="btn-icon btn-del-tmpl" data-del-key="${key}" title="删除字段">✕</button></div>`;
    }
    const strVal = v === null || v === undefined ? '' : String(v);
    const isNum = typeof v === 'number';
    const typeLabel = isNum ? 'num' : 'str';
    return `<div class="field-row ${isNum ? 'field-row-num' : ''}"><label class="editable-label" data-key="${key}" title="双击编辑标签">${esc(labelText)}</label><span class="type-badge type-${typeLabel}">${typeLabel}</span><input class="input tmpl-field" data-field="${key}" value="${esc(strVal)}" /><button class="btn-icon btn-del-tmpl" data-del-key="${key}" title="删除字段">✕</button></div>`;
}

// ----- 标签双击改名 -----

function handleLabelEdit(e) {
    e.stopPropagation();
    const label = e.currentTarget;
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
        if (newLabel && newLabel !== current) {
            saveLabel(key, newLabel);
            renderModalContent();
        } else {
            const lbl = document.createElement('label');
            lbl.className = 'editable-label';
            lbl.dataset.key = key;
            lbl.textContent = current;
            lbl.title = '双击编辑标签';
            lbl.addEventListener('dblclick', handleLabelEdit);
            input.replaceWith(lbl);
        }
    }
    input.addEventListener('blur', finish);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') finish();
        if (e.key === 'Escape') { input.value = current; finish(); }
    });
}

function debounce(fn, delay) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

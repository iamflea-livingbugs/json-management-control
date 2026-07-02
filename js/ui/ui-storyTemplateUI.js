// ==========================================
// storyTemplateUI.js — 模板编辑弹窗
// 所有增删改操作仅修改内存草稿，点"保存"才写入 localStorage
// ==========================================

import { loadTemplates, loadEffectiveTemplates, loadTemplateKeys, saveTemplateKeys, getContextsConfig, getFieldLabel, saveLabel, saveTemplates } from '../logic/logic-storyTypes.js';
import { store } from '../logic/logic-storyStore.js';
import { showConfirm } from '../../components/base/useDialog.js';
import { makeModalDraggable } from './ui-modalDialog.js';

let _currentCtx = 'content';   // 当前正在编辑的上下文
let _draft = null;             // 内存草稿：{ [ctx]: templateObj }
let _draftKeys = null;         // 键名模式：{ [ctx]: keyPattern }
let _dirty = false;            // 是否有未保存的修改
let _deletedCtxs = [];         // 本次编辑中被删除的上下文（持久化用）

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
    _draft = JSON.parse(JSON.stringify(loadEffectiveTemplates()));
    _draftKeys = JSON.parse(JSON.stringify(loadTemplateKeys()));
    _dirty = false;
    _deletedCtxs = [];

    const modal = document.createElement('div');
    modal.id = 'modal-template-editor';
    modal.className = 'my-modal-overlay';
    modal.innerHTML = `
        <div class="my-modal-box">
            <div class="my-modal-header"><h2>📋 模板编辑</h2><button class="my-modal-close" id="btn-modal-close">✕</button></div>
            <div class="my-modal-body" id="modal-template-body"></div>
            <div class="my-modal-footer">
                <button class="my-btn my-btn-sm my-btn-primary" id="btn-template-save">💾 保存</button>
                <button class="my-btn my-btn-sm" id="btn-modal-close-bottom">关闭（不保存）</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('open'));
    makeModalDraggable(modal);

    // Enter 键触发保存（只在字段输入框内有效，不干扰键名输入）
    modal.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const tag = document.activeElement?.tagName;
            const id = document.activeElement?.id;
            if (tag === 'INPUT' && id !== 'tpl-key-pattern' && id !== 'newtpl-key') {
                e.preventDefault();
                const saveBtn = document.getElementById('btn-template-save');
                if (saveBtn) saveBtn.click();
            }
        }
    });

    // 保存
    $('#btn-template-save').addEventListener('click', () => {
        saveTemplates(_draft, _deletedCtxs);
        saveTemplateKeys(_draftKeys);
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

// ----- 从草稿获取当前上下文的模板（返回 undefined 表示已删除）-----

function getDraftCtx() {
    if (!_draft) _draft = JSON.parse(JSON.stringify(loadTemplates()));
    return _draft[_currentCtx];
}

// ----- 获取草稿中有模板的所有上下文键 -----

function getDraftCtxKeys() {
    if (!_draft) _draft = JSON.parse(JSON.stringify(loadTemplates()));
    return Object.keys(_draft).filter(k => _draft[k] !== undefined && _draft[k] !== null);
}

// ----- 渲染弹窗内容 -----

function renderModalContent() {
    const body = $('#modal-template-body');
    if (!body) return;

    const ctxConfig = getContextsConfig();
    const ctxKeys = getDraftCtxKeys();
    const tpl = getDraftCtx();

    // 确保当前上下文存在，否则切到第一个可用
    if (!ctxKeys.includes(_currentCtx)) {
        _currentCtx = ctxKeys.length > 0 ? ctxKeys[0] : null;
    }

    // 如果没有模板了，显示空状态
    if (!_currentCtx) {
        body.innerHTML = `<div style="padding:40px 12px;text-align:center;color:var(--text-dim)">
            <p>暂无模板</p>
            <button class="my-btn my-btn-sm my-btn-success" id="btn-create-first-template" style="margin-top:12px">＋ 创建第一个模板</button>
        </div>`;
        $('#btn-create-first-template').addEventListener('click', () => {
            _draft['content'] = {};
            _currentCtx = 'content';
            _deletedCtxs = _deletedCtxs.filter(k => k !== 'content');
            _dirty = true;
            renderModalContent();
        });
        return;
    }

    const ctxBtns = ctxKeys.map(k =>
        `<button class="tpl-ctx-btn ${k === _currentCtx ? 'active' : ''}" data-ctx="${k}" title="${(ctxConfig[k]||{}).description||''}">${(ctxConfig[k]||{}).label||k}</button>`
    ).join('');
    const fields = Object.entries(tpl).map(([key, v]) => renderField(key, v)).join('');
    const jsonStr = JSON.stringify(tpl, null, 4);

    body.innerHTML = `
        <div class="tpl-ctx-bar"><label>模板上下文：</label>${ctxBtns}
            <button class="my-btn my-btn-sm" id="btn-new-template" style="margin-left:4px">＋ 新建</button>
            <span style="flex:1"></span>
            <button class="my-btn my-btn-sm" id="btn-del-template" style="color:var(--accent)" title="删除当前整个模板">✕ 删除此模板</button>
        </div>
        <div style="display:flex;gap:8px;align-items:center;padding:4px 0;border-bottom:1px solid var(--border);margin-bottom:4px">
            <label style="font-size:0.75rem;color:var(--text-dim);white-space:nowrap">自动增长键名：</label>
            <input id="tpl-key-pattern" class="my-input-sm" style="width:120px;font-family:var(--font-mono)" value="${esc(_draftKeys[_currentCtx] || '')}" placeholder="留空=数字自增" />
            <span style="font-size:0.7rem;color:var(--text-dim)">属性模式新建时按此模式自动生成键名（如 content → content0 → content1）</span>
        </div>
        <div class="editor-fields" id="tpl-fields">${fields}</div>
        <div style="display:flex;gap:8px;align-items:center;margin-top:4px">
            <button class="my-btn my-btn-sm my-btn-success" id="btn-add-tpl-field">＋ 添加字段</button>
            <select id="tpl-add-type" class="my-input-sm" style="width:auto">
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

    // 删除整个模板
    $('#btn-del-template').addEventListener('click', () => {
        showConfirm(`确定删除模板 "${_currentCtx}" 吗？此操作不可撤销。`).then(ok => {
            if (!ok) return;
            _deletedCtxs.push(_currentCtx);
            delete _draft[_currentCtx];
            _dirty = true;
            // 切换到下一个可用的上下文
            const keys = Object.keys(_draft);
            if (keys.length > 0) _currentCtx = keys[0];
            else _draft[_currentCtx = 'content'] = {};
            renderModalContent();
        });
    });

    // 新建模板
    $('#btn-new-template').addEventListener('click', () => {
        const modal = document.createElement('div');
        modal.className = 'my-modal-overlay';
        modal.innerHTML = `<div class="my-modal-box" style="width:360px">
            <div class="my-modal-header"><h2>新建模板</h2><button class="my-modal-close" id="newtpl-close">✕</button></div>
            <div class="my-modal-body">
                <div style="margin-bottom:12px">
                    <label style="display:block;margin-bottom:4px;font-size:0.8125rem;color:var(--text-dim)">模板键名</label>
                    <input id="newtpl-key" class="my-input" placeholder="如：content" style="width:100%;font-family:var(--font-mono)" autofocus />
                </div>
            </div>
            <div class="my-modal-footer">
                <button class="my-btn my-btn-sm" id="newtpl-cancel">取消</button>
                <button class="my-btn my-btn-sm my-btn-primary" id="newtpl-ok">创建</button>
            </div>
        </div>`;
        document.body.appendChild(modal);
        requestAnimationFrame(() => modal.classList.add('open'));
        const close = () => { modal.classList.remove('open'); setTimeout(() => modal.remove(), 200); };
        modal.querySelector('#newtpl-close').onclick = close;
        modal.querySelector('#newtpl-cancel').onclick = close;
        modal.addEventListener('click', e => { if (e.target === modal) close(); });
        modal.querySelector('#newtpl-ok').onclick = () => {
            const key = modal.querySelector('#newtpl-key').value.trim();
            if (!key) return;
            _draft[key] = {};
            _currentCtx = key;
            _dirty = true;
            close();
            renderModalContent();
        };
        modal.querySelector('#newtpl-key').addEventListener('keydown', e => {
            if (e.key === 'Enter') modal.querySelector('#newtpl-ok').click();
        });
    });

    // 键名模式修改（即时保存到草稿）
    const keyInput = $('#tpl-key-pattern');
    if (keyInput) {
        keyInput.addEventListener('input', () => {
            const val = keyInput.value.trim();
            if (val) _draftKeys[_currentCtx] = val;
            else delete _draftKeys[_currentCtx];
            _dirty = true;
        });
    }

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
    $$('.tmpl-field').forEach(inp => inp.addEventListener('input', () => {
        const ctx = getDraftCtx();
        ctx[inp.dataset.field] = inp.value;
        _dirty = true;
        syncJSONEditorFromDraft();
    }));

    $$('.tmpl-i18n-zh').forEach(inp => inp.addEventListener('input', () => {
        const ctx = getDraftCtx();
        if (typeof ctx[inp.dataset.field] !== 'object') ctx[inp.dataset.field] = { zh: '', en: '' };
        ctx[inp.dataset.field].zh = inp.value;
        _dirty = true;
        syncJSONEditorFromDraft();
    }));

    $$('.tmpl-i18n-en').forEach(inp => inp.addEventListener('input', () => {
        const ctx = getDraftCtx();
        if (typeof ctx[inp.dataset.field] !== 'object') ctx[inp.dataset.field] = { zh: '', en: '' };
        ctx[inp.dataset.field].en = inp.value;
        _dirty = true;
        syncJSONEditorFromDraft();
    }));
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

// ----- 字段渲染（显示键名 + 别名，与中栏一致）-----

function renderField(key, v) {
    const customLabel = getFieldLabel(key);
    const labelHtml = customLabel !== key
        ? `<label class="editable-label field-label" data-key="${key}" title="双击编辑标签 · 显示名: ${esc(customLabel)}">${esc(key)}<span class="field-label-alias">${esc(customLabel)}</span></label>`
        : `<label class="editable-label field-label" data-key="${key}" title="双击编辑标签">${esc(key)}</label>`;

    if (typeof v === 'object' && !Array.isArray(v) && v !== null && v.zh !== undefined && v.en !== undefined) {
        return `<div class="field-row field-row-i18n">${labelHtml}<span class="type-badge type-i18n">i18n</span><div class="i18n-group"><input class="my-input tmpl-i18n-zh" data-field="${key}" value="${esc(v.zh||'')}" placeholder="zh" /><input class="my-input tmpl-i18n-en" data-field="${key}" value="${esc(v.en||'')}" placeholder="en" /></div><button class="my-btn-icon my-btn-del-tmpl" data-del-key="${key}" title="删除字段">✕</button></div>`;
    }
    if (Array.isArray(v)) {
        return `<div class="field-row field-row-arr">${labelHtml}<span class="type-badge type-arr">arr[${v.length}]</span><input class="my-input tmpl-field" data-field="${key}" value="${esc(JSON.stringify(v))}" placeholder="[]" /><button class="my-btn-icon my-btn-del-tmpl" data-del-key="${key}" title="删除字段">✕</button></div>`;
    }
    if (typeof v === 'object' && v !== null) {
        return `<div class="field-row field-row-obj">${labelHtml}<span class="type-badge type-obj">obj{${Object.keys(v).length}}</span><input class="my-input tmpl-field" data-field="${key}" value="${esc(JSON.stringify(v))}" placeholder="{}" /><button class="my-btn-icon my-btn-del-tmpl" data-del-key="${key}" title="删除字段">✕</button></div>`;
    }
    const strVal = v === null || v === undefined ? '' : String(v);
    const isNum = typeof v === 'number';
    const typeLabel = isNum ? 'num' : 'str';
    return `<div class="field-row ${isNum ? 'field-row-num' : ''}">${labelHtml}<span class="type-badge type-${typeLabel}">${typeLabel}</span><input class="my-input tmpl-field" data-field="${key}" value="${esc(strVal)}" /><button class="my-btn-icon my-btn-del-tmpl" data-del-key="${key}" title="删除字段">✕</button></div>`;
}

// ----- 标签双击改名 -----

function handleLabelEdit(e) {
    e.stopPropagation();
    const label = e.currentTarget;
    const key = label.dataset.key;
    const current = label.textContent;
    const input = document.createElement('input');
    input.className = 'my-input-sm label-editor';
    input.value = current;
    input.style.width = Math.max(60, label.offsetWidth + 20) + 'px';
    label.replaceWith(input);
    input.focus();
    input.select();

    function finish() {
        const newLabel = input.value.trim();
        if (newLabel && newLabel !== current) {
            // 真正改键名（和主表单一致）
            const ctx = getDraftCtx();
            if (ctx && key in ctx) {
                ctx[newLabel] = ctx[key];
                delete ctx[key];
                _dirty = true;
            }
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

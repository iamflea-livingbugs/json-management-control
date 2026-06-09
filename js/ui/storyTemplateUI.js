// ==========================================
// storyTemplateUI.js — 模板编辑弹窗
// 让用户查看和编辑各上下文（对话/选项/动作等）的模板字段
// 支持表单编辑和 JSON 编辑两种模式
// ==========================================

import { loadTemplates, saveTemplate, getContextKeys, getContextsConfig, getFieldLabel, saveLabel } from '../base/storyTypes.js';
import { store } from '../data/storyStore.js';
import { makeModalDraggable } from './modalDialog.js';

let _currentCtx = 'content'; // 当前正在编辑的上下文

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// HTML 转义
function esc(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ----- 打开/关闭弹窗 -----

export function openTemplateEditor() {
    // 如果弹窗已存在，直接显示
    const existing = $('#modal-template-editor');
    if (existing) { existing.classList.add('open'); renderModalContent(); return; }

    // 构建弹窗 DOM（复用 .modal-overlay / .modal-box 通用样式）
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
    makeModalDraggable(modal);

    // 关闭事件
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

// ----- 渲染弹窗内容 -----

function renderModalContent() {
    const body = $('#modal-template-body');
    if (!body) return;

    const allTpls = loadTemplates();     // 从 localStorage 加载所有模板
    const ctxKeys = getContextKeys();     // 获取所有上下文键名
    const ctxConfig = getContextsConfig(); // 上下文配置
    const tpl = allTpls[_currentCtx] || {}; // 当前上下文的模板

    // 上下文切换按钮栏
    const ctxBtns = ctxKeys.map(k =>
        `<button class="tpl-ctx-btn ${k === _currentCtx ? 'active' : ''}" data-ctx="${k}" title="${(ctxConfig[k]||{}).description||''}">${(ctxConfig[k]||{}).label||k}</button>`
    ).join('');

    // 表单字段
    const fields = Object.entries(tpl).map(([key, v]) => renderField(key, v)).join('');
    const jsonStr = JSON.stringify(tpl, null, 4);

    body.innerHTML = `
        <div class="tpl-ctx-bar"><label>模板上下文：</label>${ctxBtns}</div>
        <div class="editor-fields" id="tpl-fields">${fields}</div>
        <!-- 添加新字段控件 -->
        <div style="display:flex;gap:8px;align-items:center;margin-top:4px">
            <button class="btn btn-sm btn-success" id="btn-add-tpl-field">＋ 添加字段</button>
            <select id="tpl-add-type" class="input-sm" style="width:auto">
                <option value="string">字符串</option><option value="number">数字</option><option value="array">数组</option><option value="object">对象</option>
            </select>
        </div>
        <!-- JSON 直接编辑区 -->
        <div style="margin-top:12px;font-size:0.75rem;color:var(--text-dim)">JSON 编辑（直接修改后自动保存）：</div>
        <div class="tpl-json-mirror">
            <pre class="json-highlight"><code id="tpl-json-code"></code></pre>
            <textarea id="tpl-json-editor" class="json-editor" spellcheck="false"></textarea>
        </div>`;

    // JSON 高亮
    const hlCode = $('#tpl-json-code');
    const editor = $('#tpl-json-editor');
    if (hlCode && editor) { editor.value = jsonStr; applyHighlight(hlCode, jsonStr); }

    // ----- 事件绑定 -----

    // 切换上下文
    $$('.tpl-ctx-btn').forEach(btn =>
        btn.addEventListener('click', () => { _currentCtx = btn.dataset.ctx; renderModalContent(); })
    );

    // 添加字段
    $('#btn-add-tpl-field').addEventListener('click', () => {
        const all = loadTemplates();
        const ctx = all[_currentCtx] || {};
        let key = 'new_field';
        let i = 1;
        while (key in ctx) key = 'new_field_' + i++;
        const type = ($('#tpl-add-type')||{}).value || 'string';
        switch (type) { case 'number': ctx[key] = 0; break; case 'array': ctx[key] = []; break; case 'object': ctx[key] = {}; break; default: ctx[key] = ''; }
        saveTemplate(_currentCtx, ctx);
        renderModalContent();
        store._emit(); // 更新可能用到模板的 UI
    });

    // 删除字段
    $$('.btn-del-tmpl').forEach(btn =>
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const all = loadTemplates(); const ctx = all[_currentCtx] || {};
            delete ctx[btn.dataset.delKey];
            saveTemplate(_currentCtx, ctx);
            renderModalContent();
            store._emit();
        })
    );

    // 表单字段编辑 → 自动保存
    bindFieldEvents();

    // JSON 编辑器同步
    if (editor) {
        editor.addEventListener('input', () => applyHighlight(hlCode, editor.value));
        editor.addEventListener('scroll', () => {
            const pre = editor.parentElement.querySelector('.json-highlight');
            if (pre) { pre.scrollTop = editor.scrollTop; pre.scrollLeft = editor.scrollLeft; }
        });
        // 失焦时解析 JSON 并保存
        editor.addEventListener('blur', () => {
            try {
                const parsed = JSON.parse(editor.value);
                const all = loadTemplates(); all[_currentCtx] = parsed;
                saveTemplate(_currentCtx, parsed);
                store._emit();
                // 重新渲染表单以反映修改
                const newTpl = loadTemplates()[_currentCtx] || {};
                const fc = $('#tpl-fields');
                if (fc) { fc.innerHTML = Object.entries(newTpl).map(([k, v]) => renderField(k, v)).join(''); rebindFieldEvents(); }
            } catch (e) {}
        });
    }

    // 字段标签双击改名
    $$('.editable-label').forEach(label => { label.addEventListener('dblclick', handleLabelEdit); });
}

// ----- 字段事件绑定 -----

function bindFieldEvents() {
    $$('.tmpl-field').forEach(inp => inp.addEventListener('input', debounce(() => {
        const current = loadTemplates(); const ctx = current[_currentCtx] || {};
        ctx[inp.dataset.field] = inp.value;
        saveTemplate(_currentCtx, ctx);
        syncJSONEditorFromFields();
    }, 250)));

    $$('.tmpl-i18n-zh').forEach(inp => inp.addEventListener('input', debounce(() => {
        const all = loadTemplates(); const ctx = all[_currentCtx] || {};
        if (typeof ctx[inp.dataset.field] !== 'object') ctx[inp.dataset.field] = { zh: '', en: '' };
        ctx[inp.dataset.field].zh = inp.value;
        saveTemplate(_currentCtx, ctx);
        syncJSONEditorFromFields();
    }, 250)));

    $$('.tmpl-i18n-en').forEach(inp => inp.addEventListener('input', debounce(() => {
        const all = loadTemplates(); const ctx = all[_currentCtx] || {};
        if (typeof ctx[inp.dataset.field] !== 'object') ctx[inp.dataset.field] = { zh: '', en: '' };
        ctx[inp.dataset.field].en = inp.value;
        saveTemplate(_currentCtx, ctx);
        syncJSONEditorFromFields();
    }, 250)));
}

function rebindFieldEvents() {
    $$('.btn-del-tmpl').forEach(btn =>
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const all = loadTemplates(); const ctx = all[_currentCtx] || {};
            delete ctx[btn.dataset.delKey];
            saveTemplate(_currentCtx, ctx);
            renderModalContent();
            store._emit();
        })
    );
    bindFieldEvents();
    // 重新绑定双击改名
    $$('.editable-label').forEach(label => { label.addEventListener('dblclick', handleLabelEdit); });
}

// ----- JSON 语法高亮 -----

function applyHighlight(codeEl, text) {
    codeEl.textContent = text;
    if (window.hljs) { try { codeEl.innerHTML = window.hljs.highlight(text, { language: 'json' }).value; } catch (e) {} }
}

// 表单编辑后同步到 JSON 编辑器
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

// ----- 字段渲染 -----

function renderField(key, v) {
    const labelText = getFieldLabel(key);
    // 双语对象 { zh, en }
    if (typeof v === 'object' && !Array.isArray(v) && v !== null && v.zh !== undefined && v.en !== undefined) {
        return `<div class="field-row"><label class="editable-label" data-key="${key}" title="双击编辑标签">${esc(labelText)}</label><div class="i18n-group"><input class="input tmpl-i18n-zh" data-field="${key}" value="${esc(v.zh||'')}" placeholder="zh" /><input class="input tmpl-i18n-en" data-field="${key}" value="${esc(v.en||'')}" placeholder="en" /></div><button class="btn-icon btn-del-tmpl" data-del-key="${key}" title="删除字段">✕</button></div>`;
    }
    // 数组
    if (Array.isArray(v)) {
        return `<div class="field-row"><label class="editable-label" data-key="${key}" title="双击编辑标签">${esc(labelText)}</label><input class="input tmpl-field" data-field="${key}" value="${esc(JSON.stringify(v))}" placeholder="[]" /><button class="btn-icon btn-del-tmpl" data-del-key="${key}" title="删除字段">✕</button></div>`;
    }
    // 普通对象
    if (typeof v === 'object' && v !== null) {
        return `<div class="field-row"><label class="editable-label" data-key="${key}" title="双击编辑标签">${esc(labelText)}</label><input class="input tmpl-field" data-field="${key}" value="${esc(JSON.stringify(v))}" placeholder="{}" /><button class="btn-icon btn-del-tmpl" data-del-key="${key}" title="删除字段">✕</button></div>`;
    }
    // 基本类型
    const strVal = v === null || v === undefined ? '' : String(v);
    return `<div class="field-row"><label class="editable-label" data-key="${key}" title="双击编辑标签">${esc(labelText)}</label><input class="input tmpl-field" data-field="${key}" value="${esc(strVal)}" /><button class="btn-icon btn-del-tmpl" data-del-key="${key}" title="删除字段">✕</button></div>`;
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
            // 取消：恢复原样
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

// 工具：防抖
function debounce(fn, delay) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

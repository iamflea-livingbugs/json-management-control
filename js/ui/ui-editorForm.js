// ==========================================
// editorForm.js — 表单编辑器（中间面板表单模式）
// 包含表单渲染、字段类型标签、行内编辑、标签改名
// ==========================================

import { getFieldLabel, getLanguages } from '../logic/logic-storyTypes.js';
import { store } from '../logic/logic-storyStore.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ===== 工具函数 =====

export function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function renderEditor(store) {
    const path = store.currentPath || [];
    const val = store.getByPath(path);
    const pathLabel = path.length === 0 ? '(root)' : path.join(' → ');

    let formHtml = `<div class="editor-header"><h3>${esc(pathLabel)}</h3></div>`;

    if (val === null || val === undefined) {
        formHtml += '<div class="empty-hint">null</div>';
    } else if (typeof val !== 'object') {
        formHtml += `<div class="field-row"><label>值</label><input class="input form-simple-value" data-pathkey="${esc(path.join('|'))}" value="${esc(String(val))}" /></div>`;
    } else {
        const entries = Array.isArray(val) ? val.map((item, i) => [String(i), item]) : Object.entries(val);
        const rows = entries.map(([key, v]) => renderFormField(key, v, path, store)).join('');

        if (Array.isArray(val)) {
            const isContent = path.length === 1 && path[0] === 'content';
            const isOptions = path.join('.').includes('options');
            const isActions = path.join('.').includes('actions');
            let defaultType = 'object';
            if (isContent) defaultType = 'content';
            else if (isOptions) defaultType = 'option';
            else if (isActions) defaultType = 'action';

            if (val.length === 0) formHtml += '<div class="empty-hint">数组为空，点击下方按钮添加元素</div>';
            else formHtml += `<div class="editor-fields">${rows}</div>`;
            formHtml += `<div class="array-add-bar"><select id="array-add-type" class="input-sm" style="width:auto">
                ${isContent ? '<option value="content">对话节点(content模板)</option>' : ''}
                ${isOptions ? '<option value="option">选项(option模板)</option>' : ''}
                ${isActions ? '<option value="action">动作(action模板)</option>' : ''}
                <option value="object" ${defaultType === 'object' ? 'selected' : ''}>空对象 {}</option>
                <option value="string" ${defaultType === 'string' ? 'selected' : ''}>字符串 ""</option>
                <option value="number">数字 0</option>
                <option value="array">空数组 []</option></select>
                <button id="btn-add-array-item" class="btn btn-sm btn-success">＋ 添加</button></div>`;
        } else {
            formHtml += `<div class="editor-fields">${rows}</div>`;
            if (val !== null) formHtml += `<div class="array-add-bar"><select id="obj-add-type" class="input-sm" style="width:auto">
                <option value="string">字符串 ""</option>
                <option value="number">数字 0</option>
                <option value="array">空数组 []</option>
                <option value="object">空对象 {}</option></select>
                <button id="btn-add-field" class="btn btn-sm btn-success">＋ 添加属性</button></div>`;
        }

        if (path.length === 2 && path[0] === 'content' && val.options) {
            formHtml += `<div class="editor-options">${renderOptions(val)}</div>`;
        }
    }

    $('#panel-form').innerHTML = formHtml;
    bindFormInputs(path, val, store);
    if (path.length === 2 && path[0] === 'content' && val && val.options) bindOptionButtons(val, store);
    bindLabelEdit();

    // 添加属性按钮
    const addFieldBtn = $('#btn-add-field');
    if (addFieldBtn) {
        addFieldBtn.addEventListener('click', () => {
            const obj = store.getByPath(path);
            if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
            let newKey = 'new_key';
            let i = 1;
            while (newKey in obj) newKey = 'new_key_' + i++;
            const typeSelect = $('#obj-add-type');
            const selected = typeSelect ? typeSelect.value : 'string';
            switch (selected) {
                case 'number': obj[newKey] = 0; break;
                case 'array': obj[newKey] = []; break;
                case 'object': obj[newKey] = {}; break;
                default: obj[newKey] = '';
            }
            store.setByPath(path, obj);
        });
    }

    // 数组添加元素按钮
    const addArrBtn = $('#btn-add-array-item');
    if (addArrBtn) {
        addArrBtn.addEventListener('click', () => {
            const typeSelect = $('#array-add-type');
            const selected = typeSelect ? typeSelect.value : 'object';
            if (selected === 'content' || selected === 'option' || selected === 'action') {
                store.addArrayItem(path);
            } else {
                const parent = store.getByPath(path);
                if (!parent || !Array.isArray(parent)) return;
                let item;
                switch (selected) { case 'string': item = ''; break; case 'number': item = 0; break; case 'array': item = []; break; default: item = {}; }
                parent.push(item);
                store._emit();
            }
        });
    }

    // 删除字段按钮
    $$('.btn-del-field').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const key = btn.dataset.delKey;
            const fieldRow = btn.closest('.field-row');
            const parentPathStr = fieldRow?.dataset?.parentpath;
            let targetPath = path;
            if (parentPathStr !== undefined && parentPathStr !== null) {
                targetPath = parentPathStr ? parentPathStr.split('|').filter(Boolean) : [];
            }
            const obj = store.getByPath(targetPath);
            if (obj && typeof obj === 'object' && key in obj) { delete obj[key]; store.setByPath(targetPath, obj); }
        });
    });
}

// ===== 字段渲染 =====

function renderFormField(key, v, parentPath, store) {
    const labelText = key;
    const customLabel = getFieldLabel(key);
    const labelHtml = customLabel !== key
        ? `<label class="editable-label field-label" data-key="${key}" title="双击编辑标签 · 显示名: ${esc(customLabel)}">${esc(labelText)}<span class="field-label-alias">${esc(customLabel)}</span></label>`
        : `<label class="editable-label field-label" data-key="${key}" title="双击编辑标签">${esc(labelText)}</label>`;
    const childPath = [...parentPath, key];
    const parentPathStr = esc(parentPath.join('|'));
    const fieldAttr = `data-field="${key}" data-parentpath="${parentPathStr}"`;

    if (v === null || v === undefined) {
        return `<div class="field-row field-row-null" ${fieldAttr}>${labelHtml}<span class="type-badge type-nil">nil</span><input class="input form-field" data-field="${key}" value="" placeholder="null" /><button class="btn-icon btn-del-field" data-del-key="${key}" title="删除属性">✕</button></div>`;
    }
    // 检测 i18n 对象：有 zh 键的对象
    const isI18n = typeof v === 'object' && !Array.isArray(v) && v && 'zh' in v;
    if (isI18n) {
        const activeLangs = getLanguages();
        // 渲染所有存在的语言输入框
        const langInputs = activeLangs.map(lang => {
            const val = v[lang] || '';
            return `<input class="input form-i18n-lang" data-field="${key}" data-lang="${lang}" value="${esc(val)}" placeholder="${lang}" />`;
        }).join('');
        // 非语言键的额外属性
        let extraHtml = '';
        const extraKeys = Object.keys(v).filter(k => !activeLangs.includes(k));
        if (extraKeys.length > 0) {
            extraHtml = `<div class="i18n-extra">${extraKeys.map(ek => {
                const ev = v[ek];
                if (ev === null || ev === undefined) {
                    return `<div class="field-row field-row-null" data-field="${ek}" data-parentpath="${esc(childPath.join('|'))}"><label class="field-label">${esc(ek)}</label><span class="type-badge type-nil">nil</span><button class="btn-icon btn-del-field" data-del-key="${ek}" title="删除属性">✕</button></div>`;
                }
                return `<div class="field-row" data-field="${ek}" data-parentpath="${esc(childPath.join('|'))}"><label class="field-label">${esc(ek)}</label><span class="type-badge type-${typeof ev === 'number' ? 'num' : Array.isArray(ev) ? 'arr' : typeof ev === 'object' && ev !== null ? 'obj' : 'str'}">${typeof ev === 'number' ? 'num' : Array.isArray(ev) ? 'arr' : typeof ev === 'object' && ev !== null ? 'obj' : 'str'}</span><input class="input form-field" data-field="${ek}" value="${esc(String(ev))}" /><button class="btn-icon btn-del-field" data-del-key="${ek}" title="删除属性">✕</button></div>`;
            }).join('')}</div>`;
        }
        return `<div class="field-row field-row-i18n" ${fieldAttr}>${labelHtml}<span class="type-badge type-i18n">i18n</span><div class="i18n-group">${langInputs}</div><button class="btn-icon btn-del-field" data-del-key="${key}" title="删除属性">✕</button></div>${extraHtml}`;
    }
    if (Array.isArray(v)) {
        const pathKey = childPath.join('|');
        return `<div class="field-row field-row-arr" ${fieldAttr}>${labelHtml}<span class="type-badge type-arr">arr[${v.length}]</span><span class="nested-preview">${esc(JSON.stringify(v.slice(0,3)))}${v.length > 3 ? '...' : ''}</span><button class="btn-jump" data-pathkey="${pathKey}">跳转</button><button class="btn-icon btn-del-field" data-del-key="${key}" title="删除属性">✕</button></div>`;
    }
    if (typeof v === 'object' && v !== null) {
        const pathKey = childPath.join('|');
        return `<div class="field-row field-row-obj" ${fieldAttr}>${labelHtml}<span class="type-badge type-obj">obj{${Object.keys(v).length}}</span><span class="nested-preview">${esc(JSON.stringify(v).slice(0,40))}</span><button class="btn-jump" data-pathkey="${pathKey}">跳转</button><button class="btn-icon btn-del-field" data-del-key="${key}" title="删除属性">✕</button></div>`;
    }
    const typeLabel = typeof v === 'number' ? 'num' : 'str';
    const strVal = v === null || v === undefined ? '' : String(v);
    const rowCls = typeof v === 'number' ? 'field-row-num' : '';
    return `<div class="field-row ${rowCls}" ${fieldAttr}>${labelHtml}<span class="type-badge type-${typeLabel}">${typeLabel}</span><input class="input form-field" data-field="${key}" value="${esc(strVal)}" /><button class="btn-icon btn-del-field" data-del-key="${key}" title="删除属性">✕</button></div>`;
}

// ===== 选项渲染 =====

function renderOptions(node) {
    const activeLangs = getLanguages();
    const rows = node.options.map((opt, i) => {
        const actionRows = (opt.actions || []).map((act, j) => `
            <div class="action-inline">
                <input class="input input-sm opt-action-cmd" data-node="${node.id}" data-opt="${i}" data-action="${j}" value="${esc(act.cmd)}" placeholder="命令" />
                <input class="input input-sm opt-action-params" data-node="${node.id}" data-opt="${i}" data-action="${j}" value="${esc(JSON.stringify(act.params))}" placeholder="参数" />
                <button class="btn-icon btn-del-action" data-node="${node.id}" data-opt="${i}" data-action="${j}" title="删除动作">✕</button>
            </div>`).join('');

        const langInputs = activeLangs.map(lang => {
            const val = opt.text?.[lang] || '';
            return `<input class="input input-sm opt-text-lang" data-node="${node.id}" data-opt="${i}" data-lang="${lang}" value="${esc(val)}" placeholder="选项文本(${lang})" />`;
        }).join('');

        return `<div class="option-row">
            <span class="option-index">#${i}</span>
            <div class="option-i18n">
                <div class="i18n-group">${langInputs}</div>
                <div style="display:flex;gap:4px;margin-top:4px">
                    <input class="input input-sm opt-next" data-node="${node.id}" data-opt="${i}" value="${esc(opt.next || '')}" placeholder="跳转ID" style="width:120px" />
                    <button class="btn btn-sm btn-add-action" data-node="${node.id}" data-opt="${i}">＋ 动作</button>
                    <button class="btn-icon btn-del-option" data-node="${node.id}" data-opt="${i}" title="删除选项">✕</button>
                </div>
                ${opt.actions?.length ? `<div style="margin-top:4px;display:flex;flex-direction:column;gap:2px">${actionRows}</div>` : ''}
            </div>
        </div>`;
    }).join('');
    return `<div class="section-title">选项 (${node.options.length})</div>${rows}<button id="btn-add-option" class="btn btn-sm btn-success" data-node="${node.id}">＋ 选项</button>`;
}

// ===== 表单输入事件绑定 =====

function bindFormInputs(path, val, store) {
    $('.form-simple-value')?.addEventListener('input', (e) => {
        const pathStr = e.target.dataset.pathkey;
        if (!pathStr) return;
        store.setByPath(pathStr.split('|'), e.target.value);
    });

    $$('.form-field').forEach(inp => {
        inp.addEventListener('input', () => {
            const obj = store.getByPath(path);
            if (obj && typeof obj === 'object') obj[inp.dataset.field] = inp.value;
            store._emit();
        });
    });

    $$('.form-i18n-lang').forEach(inp => {
        inp.addEventListener('input', () => {
            const obj = store.getByPath(path);
            if (obj && typeof obj === 'object' && obj[inp.dataset.field]) {
                obj[inp.dataset.field][inp.dataset.lang] = inp.value;
            }
            store._emit();
        });
    });

    $$('.btn-jump').forEach(btn => {
        btn.addEventListener('click', () => {
            const p = btn.dataset.pathkey.split('|').map(s => isNaN(s) ? s : Number(s));
            store.selectPath(p);
        });
    });
}

function bindOptionButtons(node, store) {
    $('#btn-add-option')?.addEventListener('click', (e) => store.addOption(e.target.dataset.node));
    $$('.btn-del-option').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); store.deleteOption(btn.dataset.node, parseInt(btn.dataset.opt)); }));
    $$('.opt-text-lang').forEach(inp => {
        inp.addEventListener('input', () => {
            const nodeId = inp.dataset.node;
            const optIdx = parseInt(inp.dataset.opt);
            const lang = inp.dataset.lang;
            const opt = store.getNode(nodeId)?.options?.[optIdx];
            if (!opt) return;
            if (typeof opt.text !== 'object') opt.text = {};
            opt.text[lang] = inp.value;
            store._emit();
        });
    });
    $$('.opt-next').forEach(inp => inp.addEventListener('input', () => store.updateOption(inp.dataset.node, parseInt(inp.dataset.opt), { next: inp.value })));
    $$('.btn-add-action').forEach(btn => btn.addEventListener('click', () => store.addAction(btn.dataset.node, parseInt(btn.dataset.opt))));
    $$('.opt-action-cmd').forEach(inp => inp.addEventListener('input', () => store.updateActionCmd(inp.dataset.node, parseInt(inp.dataset.opt), parseInt(inp.dataset.action), inp.value)));
    $$('.opt-action-params').forEach(inp => inp.addEventListener('input', () => store.updateActionParams(inp.dataset.node, parseInt(inp.dataset.opt), parseInt(inp.dataset.action), inp.value)));
    $$('.btn-del-action').forEach(btn => btn.addEventListener('click', () => store.deleteAction(btn.dataset.node, parseInt(btn.dataset.opt), parseInt(btn.dataset.action))));
}

// ===== 标签双击改名 =====

function bindLabelEdit() {
    $$('.editable-label').forEach(label => {
        const handler = (e) => {
            e.stopPropagation();
            const oldKey = label.dataset.key;
            const current = label.childNodes[0]?.textContent?.trim() || label.textContent;
            const input = document.createElement('input');
            input.className = 'input-sm label-editor';
            input.value = current;
            input.style.width = Math.max(60, label.offsetWidth + 20) + 'px';
            label.replaceWith(input);
            input.focus();
            input.select();
            function finish() {
                const newKey = input.value.trim();
                if (newKey && newKey !== current) {
                    const fieldRow = input.closest('.field-row');
                    const parentPathStr = fieldRow?.dataset?.parentpath;
                    if (parentPathStr !== undefined && parentPathStr !== null) {
                        const parentPath = parentPathStr ? parentPathStr.split('|').filter(Boolean) : [];
                        const parent = store.getByPath(parentPath);
                        if (parent && typeof parent === 'object' && oldKey in parent) {
                            if (store.currentPath.includes(oldKey)) store.currentPath = store.currentPath.map(s => s === oldKey ? newKey : s);
                            parent[newKey] = parent[oldKey];
                            delete parent[oldKey];
                            store.setByPath(parentPath, parent);
                        }
                    }
                } else {
                    const lbl = document.createElement('label');
                    lbl.className = 'editable-label field-label';
                    lbl.dataset.key = oldKey; lbl.textContent = current;
                    lbl.title = '双击编辑标签'; lbl.addEventListener('dblclick', handler);
                    input.replaceWith(lbl);
                }
            }
            input.addEventListener('blur', finish);
            input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); input.blur(); } if (e.key === 'Escape') { input.value = current; input.blur(); } });
        };
        label.addEventListener('dblclick', handler);
    });
}

// ===== 中间 Tab JSON 同步 =====

export function updateJSONTabContent(store) {
    const path = store.currentPath || [];
    const val = store.getByPath(path);
    const jsonStr = JSON.stringify(val, null, 4);
    const pc = $('#path-editor-center');
    if (pc) pc.value = jsonStr;
    const hlPre = $('#path-mirror-center code');
    if (hlPre && window.hljs) {
        try { hlPre.innerHTML = window.hljs.highlight(jsonStr, { language: 'json' }).value; }
        catch (e) { hlPre.textContent = jsonStr; }
    }
}

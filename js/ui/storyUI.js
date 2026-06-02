// ==========================================
// storyUI.js — 界面渲染
// ==========================================

import { createChapter, getFieldLabel, saveLabel } from '../base/storyTypes.js';
import { store } from '../data/storyStore.js';
import { renderTree } from '../ui/storyTree.js';
import { openTemplateEditor } from '../ui/storyTemplateUI.js';
import { getContextsConfig, saveConfigToLocal, exportConfigJSON } from '../base/storyTypes.js';

// DOM 引用
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

/** 缓存布局 HTML */
let _layoutHtml = null;

/** 异步加载 layout.html */
async function loadLayout() {
    if (_layoutHtml) return _layoutHtml;
    const res = await fetch('layout.html');
    _layoutHtml = await res.text();
    return _layoutHtml;
}

export async function initUI(store, io) {
    const app = $('#app');
    app.innerHTML = await loadLayout();

    // ---- 工具栏 ----
    io.setupFilePicker($('#btn-import'), json => store.loadChapter(json));
    $('#btn-export').addEventListener('click', () => {
        const clean = store.toCleanJSON();
        io.exportJSON(clean);
    });
    $('#btn-open-content-config').addEventListener('click', () => {
        store.loadConfig('config/template-content.json').then(() => {
            $('#btn-save-config').style.display = '';
        }).catch(() => alert('加载配置文件失败'));
    });
    $('#btn-open-contexts-config').addEventListener('click', () => {
        store.loadConfig('config/template-contexts.json').then(() => {
            $('#btn-save-config').style.display = '';
        }).catch(() => alert('加载配置文件失败'));
    });
    $('#btn-save-config').addEventListener('click', () => {
        const name = store.saveConfig();
        if (name) alert('✅ 已保存到本地存储\n📥 已下载 ' + name + ' 文件\n\n请用下载的文件替换项目中的 config/' + name);
    });
    $('#btn-add-node').addEventListener('click', () => {
        if (confirm('将清空当前内容并创建新 JSON，确定？')) store.loadChapter(createChapter());
    });
    $('#btn-edit-template').addEventListener('click', () => openTemplateEditor());
    $('#btn-config').addEventListener('click', () => openConfigEditor());

    // ---- 章节名 ----
    $('#chapter-name').addEventListener('input', (e) => {
        store.setChapterName(e.target.value);
    });

    // ---- Tab 切换 ----
    $$('.tab-label').forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            $$('.tab-label').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            $('#panel-form').classList.toggle('hidden', target !== 'form');
            $('#panel-json').classList.toggle('hidden', target !== 'json');
        });
    });

    // ---- 初次渲染 ----
    store.onChange(() => renderAll(store));

    // 右侧 JSON
    const hlCode = $('#json-highlight code');
    const editor = $('#json-editor');

    function applyHighlight(text) {
        hlCode.textContent = text;
        try {
            hlCode.innerHTML = window.hljs.highlight(text, { language: 'json' }).value;
        } catch (e) {}
    }

    // JSON 错误提示
    const errDiv = document.createElement('div');
    errDiv.className = 'json-error';
    editor.parentElement.appendChild(errDiv);

    function showJSONError(msg) {
        errDiv.textContent = '⚠️ ' + msg;
        errDiv.style.display = '';
    }
    function hideJSONError() {
        errDiv.style.display = 'none';
    }

    editor.addEventListener('input', () => {
        applyHighlight(editor.value);
        try { JSON.parse(editor.value); hideJSONError(); }
        catch (e) { showJSONError(e.message); }
    });
    editor.addEventListener('scroll', () => {
        $('#json-highlight').scrollTop = editor.scrollTop;
        $('#json-highlight').scrollLeft = editor.scrollLeft;
    });
    editor.addEventListener('blur', () => {
        try {
            const parsed = JSON.parse(editor.value);
            const formatted = JSON.stringify(parsed, null, 4);
            editor.value = formatted;
            applyHighlight(formatted);
            hideJSONError();
            const path = store.currentPath;
            if (path && path.length > 0) store.setByPath([...path], parsed);
        } catch (e) {
            showJSONError(e.message);
        }
    });

    $('#btn-format-json').addEventListener('click', () => {
        const editor = $('#json-editor');
        const hlCode = $('#json-highlight code');
        if (!editor) return;
        try {
            const parsed = JSON.parse(editor.value);
            const formatted = JSON.stringify(parsed, null, 4);
            editor.value = formatted;
            if (hlCode) {
                hlCode.textContent = formatted;
                if (window.hljs) {
                    try { hlCode.innerHTML = window.hljs.highlight(formatted, { language: 'json' }).value; }
                    catch (e) {}
                }
            }
            hideJSONError();
            const path = store.currentPath;
            if (path && path.length > 0) store.setByPath([...path], parsed);
        } catch (e) {
            showJSONError(e.message);
        }
    });

    // ---- 分隔条拖拽 ----
    initSplitters();

    // ---- 树形搜索 ----
    $('#tree-search').addEventListener('input', () => {
        _searchTerm = $('#tree-search').value.toLowerCase().trim();
        applyTreeSearch(_searchTerm);
    });

    // ---- 中间 JSON Tab ----
    const centerTa = $('#path-editor-center');
    if (centerTa) {
        // 中间 Tab 错误提示
        const centerErr = document.createElement('div');
        centerErr.className = 'json-error';
        centerTa.parentElement.appendChild(centerErr);

        centerTa.addEventListener('input', () => {
            const text = centerTa.value;
            const hlPre = $('#path-mirror-center code');
            if (window.hljs && hlPre) {
                try { hlPre.innerHTML = window.hljs.highlight(text, { language: 'json' }).value; }
                catch (e) { hlPre.textContent = text; }
            }
            try {
                const parsed = JSON.parse(text);
                const path = store.currentPath;
                if (path && path.length > 0) store.setByPath([...path], parsed);
                centerErr.style.display = 'none';
            } catch (e) {
                centerErr.textContent = '⚠️ ' + e.message;
                centerErr.style.display = '';
            }
        });
        centerTa.addEventListener('scroll', () => {
            const preEl = $('#path-mirror-center pre');
            if (preEl) {
                preEl.scrollTop = centerTa.scrollTop;
                preEl.scrollLeft = centerTa.scrollLeft;
            }
        });
    }

    renderAll(store);
}

// ========== 分隔条拖拽 ==========

function initSplitters() {
    $$('.splitter').forEach(splitter => {
        let dragging = false;
        let startX = 0;
        let startW = 0;
        let sign = 1;
        let targetPanel = null;

        splitter.addEventListener('mousedown', (e) => {
            dragging = true;
            startX = e.clientX;
            const targetId = splitter.dataset.target;
            if (targetId === 'left') {
                targetPanel = $('#panel-left');
                sign = 1;
            } else {
                targetPanel = $('#panel-right');
                sign = -1;
            }
            if (targetPanel) startW = targetPanel.getBoundingClientRect().width;
            splitter.classList.add('dragging');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!dragging || !targetPanel) return;
            const delta = (e.clientX - startX) * sign;
            targetPanel.style.width = Math.max(180, startW + delta) + 'px';
            targetPanel.style.flex = 'none';
        });

        document.addEventListener('mouseup', () => {
            if (!dragging) return;
            dragging = false;
            splitter.classList.remove('dragging');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        });
    });
}

// ========== 全局渲染 ==========

let _searchTerm = '';
let _editorVersion = '';
let _jsonTabVersion = '';

function editorVersion(store) {
    const path = store.currentPath;
    if (!path || path.length === 0) return '__root__';
    const val = store.getByPath(path);
    const keyCount = (val && typeof val === 'object' && !Array.isArray(val))
        ? Object.keys(val).length
        : (Array.isArray(val) ? val.length : 0);
    return path.join('|') + '|' + keyCount;
}

function jsonTabVersion(store) {
    const path = store.currentPath || [];
    const val = store.getByPath(path);
    return JSON.stringify(val).length;
}

function renderAll(store) {
    renderTreePanel(store);
    applyTreeSearch(_searchTerm);

    const saveBtn = $('#btn-save-config');
    if (saveBtn) saveBtn.style.display = store._configUrl ? '' : 'none';

    const ver = editorVersion(store);
    if (ver !== _editorVersion) {
        _editorVersion = ver;
        _jsonTabVersion = '';
        renderEditor(store);
    }

    const jv = jsonTabVersion(store);
    if (jv !== _jsonTabVersion) {
        _jsonTabVersion = jv;
        updateJSONTabContent(store);
    }

    renderJSONPreview(store);
    navigateJSONToPath(store);
    $('#chapter-name').value = store.getChapterName();
}

// ========== 树形面板 ==========

function applyTreeSearch(term) {
    const rawTerm = term.trim();
    if (!rawTerm) {
        $$('.tree-row').forEach(r => { r.style.display = ''; r.classList.remove('search-dim'); });
        $$('.tree-children').forEach(c => { if (c._wasExpanded !== undefined) { c.style.display = c._wasExpanded; delete c._wasExpanded; } });
        return;
    }

    const lowerTerm = rawTerm.toLowerCase();
    const dotIdx = rawTerm.lastIndexOf('.');
    let scopePath = '';
    let keyPattern = lowerTerm;
    if (dotIdx >= 0) {
        scopePath = rawTerm.slice(0, dotIdx).toLowerCase();
        keyPattern = rawTerm.slice(dotIdx + 1).toLowerCase();
    }

    const matchSet = new Set();
    const rows = $$('.tree-row');
    rows.forEach(row => {
        const pathArr = JSON.parse(row.dataset.path || '[]');
        const pathStr = pathArr.join('.').toLowerCase();
        const lastKey = (pathArr[pathArr.length - 1] || '').toLowerCase();
        let hit = false;
        if (!keyPattern) hit = pathStr.startsWith(scopePath + '.') || pathStr === scopePath;
        else if (dotIdx >= 0) hit = (pathStr.startsWith(scopePath + '.') || pathStr === scopePath) && lastKey.includes(keyPattern);
        else hit = pathArr.some(seg => seg.toLowerCase().includes(keyPattern));
        if (hit) matchSet.add(pathStr);
    });

    const ancestorSet = new Set();
    for (const matchedPath of matchSet) {
        const segs = matchedPath.split('.');
        for (let i = 0; i < segs.length; i++) ancestorSet.add(segs.slice(0, i + 1).join('.'));
    }

    rows.forEach(row => {
        const pathArr = JSON.parse(row.dataset.path || '[]');
        const pathStr = pathArr.join('.').toLowerCase();
        if (ancestorSet.has(pathStr)) {
            let childDiv = row.nextElementSibling;
            if (childDiv && childDiv.classList.contains('tree-children')) {
                if (childDiv._wasExpanded === undefined) childDiv._wasExpanded = childDiv.style.display;
                childDiv.style.display = '';
                row.querySelector('.tree-icon').textContent = '▼';
            }
        }
    });

    rows.forEach(row => {
        const pathArr = JSON.parse(row.dataset.path || '[]');
        const pathStr = pathArr.join('.').toLowerCase();
        if (ancestorSet.has(pathStr)) { row.style.display = ''; row.classList.remove('search-dim'); }
        else { row.style.display = 'none'; row.classList.add('search-dim'); }
    });
}

function renderTreePanel(store) {
    const container = $('#tree-container');
    if (!container) return;
    const data = store.chapter;
    renderTree(container, data, store.currentPath,
        (path) => store.selectPath(path),
        (path, type) => store.addAt(path, type),
        (path) => { if (confirm('确定删除该节点吗？')) store.deleteAt(path); }
    );

    let footer = container.querySelector('.tree-footer');
    if (!footer) {
        footer = document.createElement('div');
        footer.className = 'tree-footer';
        container.appendChild(footer);
    }
    const contentNodeCount = (store.chapter.content || []).length;
    footer.innerHTML = `<button class="btn btn-sm btn-success" id="tree-add-node">＋ 新建对话节点 (当前${contentNodeCount}个)</button>`;
    footer.querySelector('#tree-add-node').addEventListener('click', () => store.addNode());
}

// ========== 编辑区 ==========

function renderEditor(store) {
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
            if (val !== null) formHtml += `<button id="btn-add-field" class="btn btn-sm btn-success" style="margin-top:4px">＋ 添加属性</button>`;
        }

        if (path.length === 2 && path[0] === 'content' && val.options) {
            formHtml += `<div class="editor-options">${renderOptions(val, store)}</div>`;
        }
    }

    $('#panel-form').innerHTML = formHtml;
    bindFormInputs(path, val, store);
    if (path.length === 2 && path[0] === 'content' && val && val.options) bindOptionButtons(val, store);
    bindLabelEdit();

    const addFieldBtn = $('#btn-add-field');
    if (addFieldBtn) {
        addFieldBtn.addEventListener('click', () => {
            const obj = store.getByPath(path);
            if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
            let newKey = 'new_key';
            let i = 1;
            while (newKey in obj) newKey = 'new_key_' + i++;
            obj[newKey] = '';
            store.setByPath(path, obj);
        });
    }

    const addArrBtn = $('#btn-add-array-item');
    if (addArrBtn) {
        addArrBtn.addEventListener('click', () => {
            const typeSelect = $('#array-add-type');
            const selected = typeSelect ? typeSelect.value : 'object';
            if (selected === 'content' || selected === 'option' || selected === 'action') {
                store.addAt(path, 'array');
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

    $$('.btn-del-field').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const key = btn.dataset.delKey;
            const obj = store.getByPath(path);
            if (obj && typeof obj === 'object' && key in obj) { delete obj[key]; store.setByPath(path, obj); }
        });
    });
}

function updateJSONTabContent(store) {
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

function renderFormField(key, v, parentPath, store) {
    const labelText = getFieldLabel(key);
    const childPath = [...parentPath, key];

    if (v === null || v === undefined) {
        return `<div class="field-row" data-field="${key}"><label class="editable-label" data-key="${key}" title="双击编辑标签">${esc(labelText)}</label><input class="input form-field" data-field="${key}" value="" placeholder="null" /><button class="btn-icon btn-del-field" data-del-key="${key}" title="删除属性">✕</button></div>`;
    }
    if (typeof v === 'object' && !Array.isArray(v) && v.zh !== undefined && v.en !== undefined) {
        return `<div class="field-row" data-field="${key}"><label class="editable-label" data-key="${key}" title="双击编辑标签">${esc(labelText)}</label><div class="i18n-group"><input class="input form-i18n-zh" data-field="${key}" value="${esc(v.zh || '')}" placeholder="zh" /><input class="input form-i18n-en" data-field="${key}" value="${esc(v.en || '')}" placeholder="en" /></div><button class="btn-icon btn-del-field" data-del-key="${key}" title="删除属性">✕</button></div>`;
    }
    if (Array.isArray(v)) {
        const pathKey = childPath.join('|');
        return `<div class="field-row" data-field="${key}"><label class="editable-label" data-key="${key}" title="双击编辑标签">${esc(labelText)}</label><span class="nested-preview">[${v.length}项]</span><button class="btn-jump" data-pathkey="${pathKey}">跳转</button><button class="btn-icon btn-del-field" data-del-key="${key}" title="删除属性">✕</button></div>`;
    }
    if (typeof v === 'object' && v !== null) {
        const pathKey = childPath.join('|');
        return `<div class="field-row" data-field="${key}"><label class="editable-label" data-key="${key}" title="双击编辑标签">${esc(labelText)}</label><span class="nested-preview">{${Object.keys(v).length}个属性}</span><button class="btn-jump" data-pathkey="${pathKey}">跳转</button><button class="btn-icon btn-del-field" data-del-key="${key}" title="删除属性">✕</button></div>`;
    }
    const strVal = v === null || v === undefined ? '' : String(v);
    return `<div class="field-row" data-field="${key}"><label class="editable-label" data-key="${key}" title="双击编辑标签">${esc(labelText)}</label><input class="input form-field" data-field="${key}" value="${esc(strVal)}" /><button class="btn-icon btn-del-field" data-del-key="${key}" title="删除属性">✕</button></div>`;
}

function renderOptions(node, store) {
    const rows = node.options.map((opt, i) => {
        const actionRows = (opt.actions || []).map((act, j) => `
            <div class="action-inline">
                <input class="input input-sm opt-action-cmd" data-node="${node.id}" data-opt="${i}" data-action="${j}" value="${esc(act.cmd)}" placeholder="命令" />
                <input class="input input-sm opt-action-params" data-node="${node.id}" data-opt="${i}" data-action="${j}" value="${esc(JSON.stringify(act.params))}" placeholder="参数" />
                <button class="btn-icon btn-del-action" data-node="${node.id}" data-opt="${i}" data-action="${j}" title="删除动作">✕</button>
            </div>`).join('');

        return `<div class="option-row">
            <span class="option-index">#${i}</span>
            <div class="option-i18n">
                <div class="i18n-group">
                    <input class="input input-sm opt-text-zh" data-node="${node.id}" data-opt="${i}" value="${esc(opt.text?.zh || '')}" placeholder="选项文本(zh)" />
                    <input class="input input-sm opt-text-en" data-node="${node.id}" data-opt="${i}" value="${esc(opt.text?.en || '')}" placeholder="选项文本(en)" />
                </div>
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

function bindFormInputs(path, val, store) {
    // 简单值
    $('.form-simple-value')?.addEventListener('input', (e) => {
        const pathStr = e.target.dataset.pathkey;
        if (!pathStr) return;
        const p = pathStr.split('|');
        store.setByPath(p, e.target.value);
    });

    // 普通字段
    $$('.form-field').forEach(inp => {
        inp.addEventListener('input', () => {
            const obj = store.getByPath(path);
            if (obj && typeof obj === 'object') obj[inp.dataset.field] = inp.value;
            store._emit();
        });
    });

    // i18n
    $$('.form-i18n-zh').forEach(inp => {
        inp.addEventListener('input', () => {
            const obj = store.getByPath(path);
            if (obj && typeof obj === 'object') {
                const field = obj[inp.dataset.field];
                if (typeof field === 'object') field.zh = inp.value;
                else obj[inp.dataset.field] = { zh: inp.value, en: '' };
            }
            store._emit();
        });
    });
    $$('.form-i18n-en').forEach(inp => {
        inp.addEventListener('input', () => {
            const obj = store.getByPath(path);
            if (obj && typeof obj === 'object') {
                const field = obj[inp.dataset.field];
                if (typeof field === 'object') field.en = inp.value;
                else obj[inp.dataset.field] = { zh: '', en: inp.value };
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

    $$('.btn-del-option').forEach(btn => btn.addEventListener('click', (e) => {
        e.stopPropagation();
        store.deleteOption(btn.dataset.node, parseInt(btn.dataset.opt));
    }));

    $$('.opt-text-zh').forEach(inp => inp.addEventListener('input', () =>
        store.updateOptionText(inp.dataset.node, parseInt(inp.dataset.opt), inp.value, null)));

    $$('.opt-text-en').forEach(inp => inp.addEventListener('input', () =>
        store.updateOptionText(inp.dataset.node, parseInt(inp.dataset.opt), null, inp.value)));

    $$('.opt-next').forEach(inp => inp.addEventListener('input', () =>
        store.updateOption(inp.dataset.node, parseInt(inp.dataset.opt), { next: inp.value })));

    $$('.btn-add-action').forEach(btn => btn.addEventListener('click', () =>
        store.addAction(btn.dataset.node, parseInt(btn.dataset.opt))));

    $$('.opt-action-cmd').forEach(inp => inp.addEventListener('input', () =>
        store.updateActionCmd(inp.dataset.node, parseInt(inp.dataset.opt), parseInt(inp.dataset.action), inp.value)));

    $$('.opt-action-params').forEach(inp => inp.addEventListener('input', () =>
        store.updateActionParams(inp.dataset.node, parseInt(inp.dataset.opt), parseInt(inp.dataset.action), inp.value)));

    $$('.btn-del-action').forEach(btn => btn.addEventListener('click', () =>
        store.deleteAction(btn.dataset.node, parseInt(btn.dataset.opt), parseInt(btn.dataset.action))));
}

function bindLabelEdit() {
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
                if (newLabel && newLabel !== current) { saveLabel(key, newLabel); renderEditor(store); }
                else {
                    const lbl = document.createElement('label');
                    lbl.className = 'editable-label';
                    lbl.dataset.key = key;
                    lbl.textContent = current;
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

// ========== 右侧 JSON 预览 ==========

function renderJSONPreview(store) {
    const val = store.getByPath(store.currentPath || []);
    const jsonStr = JSON.stringify(val, null, 4);
    const editor = $('#json-editor');
    if (editor && document.activeElement !== editor) {
        editor.value = jsonStr;
        const hlCode = $('#json-highlight code');
        if (window.hljs && hlCode) {
            try { hlCode.innerHTML = window.hljs.highlight(jsonStr, { language: 'json' }).value; }
            catch (e) { hlCode.textContent = jsonStr; }
        }
    }
}

function navigateJSONToPath(store) {
    const path = store.currentPath || [];
    const editor = $('#json-editor');
    if (!editor) return;
    if (path.length === 0) { editor.scrollTop = 0; editor.scrollLeft = 0; return; }

    const val = store.getByPath(path);
    if (!val) return;
    const jsonStr = JSON.stringify(val, null, 4);
    const fullStr = JSON.stringify(store.getByPath([]), null, 4);
    const idx = fullStr.indexOf(jsonStr);
    if (idx === -1) return;

    const before = fullStr.slice(0, idx);
    const lines = before.split('\n').length - 1;
    const lineHeight = parseFloat(getComputedStyle(editor).lineHeight) || 20;
    editor.scrollTop = Math.max(0, (lines - 3) * lineHeight);
}

// ========== 配置编辑弹窗 ==========

function openConfigEditor() {
    const existing = document.getElementById('modal-config-editor');
    if (existing) { existing.classList.add('open'); return; }

    const config = getContextsConfig();
    const jsonStr = JSON.stringify(config, null, 4);

    const modal = document.createElement('div');
    modal.id = 'modal-config-editor';
    modal.className = 'modal-overlay';
    modal.innerHTML = `<div class="modal-box" style="width:600px">
        <div class="modal-header"><h2>⚙️ 模板上下文配置</h2><button class="modal-close" id="btn-config-close">✕</button></div>
        <div class="modal-body">
            <div style="margin-bottom:8px;font-size:0.75rem;color:var(--text-dim)">编辑后保存到本地，可导出为 JSON 文件替换 config/template-contexts.json</div>
            <div class="tpl-json-mirror" style="min-height:300px">
                <pre class="json-highlight"><code id="config-json-code"></code></pre>
                <textarea id="config-json-editor" class="json-editor" spellcheck="false"></textarea>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-sm" id="btn-config-export">💾 导出文件</button>
            <button class="btn btn-sm btn-primary" id="btn-config-save">✅ 保存</button>
            <button class="btn btn-sm" id="btn-config-close-bottom">关闭</button>
        </div></div>`;

    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('open'));

    const hlCode = document.getElementById('config-json-code');
    const editor = document.getElementById('config-json-editor');
    if (editor && hlCode) {
        editor.value = jsonStr;
        hlCode.textContent = jsonStr;
        if (window.hljs) { try { hlCode.innerHTML = window.hljs.highlight(jsonStr, { language: 'json' }).value; } catch (e) {} }
        editor.addEventListener('input', () => {
            hlCode.textContent = editor.value;
            if (window.hljs) { try { hlCode.innerHTML = window.hljs.highlight(editor.value, { language: 'json' }).value; } catch (e) {} }
        });
        editor.addEventListener('scroll', () => { hlCode.scrollTop = editor.scrollTop; hlCode.scrollLeft = editor.scrollLeft; });
    }

    document.getElementById('btn-config-save').addEventListener('click', () => {
        try {
            saveConfigToLocal(JSON.parse(editor.value));
            document.getElementById('modal-config-editor').classList.remove('open');
            store._emit();
        } catch (e) { alert('JSON 格式有误：' + e.message); }
    });

    document.getElementById('btn-config-export').addEventListener('click', () => {
        try { JSON.parse(editor.value); exportConfigJSON(); }
        catch (e) { alert('JSON 格式有误'); }
    });

    const close = () => {
        modal.classList.remove('open');
        setTimeout(() => { if (modal.parentNode) modal.parentNode.removeChild(modal); }, 200);
    };
    document.getElementById('btn-config-close').addEventListener('click', close);
    document.getElementById('btn-config-close-bottom').addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
}

// ========== 工具函数 ==========

function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function debounce(fn, delay) {
    let timer;
    return function (...args) { clearTimeout(timer); timer = setTimeout(() => fn.apply(this, args), delay); };
}

// ==========================================
// storyUI.js — 界面渲染
// ==========================================

import { NODE_FIELDS, FILTERABLE_FIELDS, isEmpty, getFieldLabel, saveLabel, loadTemplates, saveTemplate, DEFAULT_TEMPLATES } from './storyTypes.js';
import { store } from './storyStore.js';
import { renderTree } from './storyTree.js';

// DOM 引用
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

export function initUI(store, io) {
    const app = $('#app');
    app.innerHTML = buildLayout();

    // ---- 工具栏 ----
    io.setupFilePicker($('#btn-import'), json => store.loadChapter(json));
    $('#btn-export').addEventListener('click', () => {
        const clean = store.toCleanJSON();
        io.exportJSON(clean);
    });
    $('#btn-add-node').addEventListener('click', () => {
        if (confirm('将清空当前内容并创建新 JSON，确定？')) {
            store.loadChapter({ meta: { name: 'Untitled' }, content: [] });
        }
    });

    // ---- 编辑模板 ----
    $('#btn-edit-template').addEventListener('click', () => {
        _editingTemplate = !_editingTemplate;
        if (_editingTemplate) {
            $('#btn-edit-template').textContent = '📋 返回数据';
            $('#tab-form').click();
        } else {
            $('#btn-edit-template').textContent = '📋 编辑模板';
        }
        store._emit();
    });

    // ---- 章节名 ----
    $('#chapter-name').addEventListener('input', (e) => {
        store.setChapterName(e.target.value);
    });

    // ---- Tab 切换 ----
    $$('.tab-label').forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            // active class
            $$('.tab-label').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            // show/hide panels
            $('#panel-form').classList.toggle('hidden', target !== 'form');
            $('#panel-json').classList.toggle('hidden', target !== 'json');
        });
    });

    // ---- 初次渲染 ----
    store.onChange(() => renderAll(store));

    // 右侧 JSON：实时高亮，blur 时自动格式化
    const hlCode = $('#json-highlight code');
    const editor = $('#json-editor');

    function applyHighlight(text) {
        hlCode.textContent = text;
        try {
            hlCode.innerHTML = window.hljs.highlight(text, { language: 'json' }).value;
        } catch (e) { /* hljs 加载失败则显示纯文本 */ }
    }

    editor.addEventListener('input', () => applyHighlight(editor.value));
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
        } catch (e) { /* 格式有误不处理 */ }
    });

    $('#btn-format-json').addEventListener('click', () => {
        try {
            const parsed = JSON.parse(editor.value);
            const formatted = JSON.stringify(parsed, null, 4);
            editor.value = formatted;
            applyHighlight(formatted);
        } catch (e) { /* JSON 不合法，无法格式化 */ }
    });

    // ---- 分隔条拖拽 ----
   initSplitters();

    // ---- 树形搜索 ----
    $('#tree-search').addEventListener('input', () => {
        _searchTerm = $('#tree-search').value.toLowerCase().trim();
        applyTreeSearch(_searchTerm);
    });

    // ---- 中间 JSON Tab 编辑事件（一次性绑定）----
    const centerTa = $('#path-editor-center');
    if (centerTa) {
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
                if (path && path.length > 0) {
                    store.setByPath([...path], parsed);
                }
            } catch (e) { /* invalid JSON */ }
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

function buildLayout() {
    return `
    <div class="toolbar">
        <div class="toolbar-left">
            <button id="btn-import" class="btn">📥 导入 JSON</button>
            <button id="btn-export" class="btn btn-primary">📤 导出 JSON</button>
            <span class="sep"></span>
            <label>章节名：</label>
            <input id="chapter-name" class="input-sm" value="Untitled" />
        </div>
        <div class="toolbar-right">
            <button id="btn-add-node" class="btn btn-success">＋ 新建 JSON</button>
            <button id="btn-edit-template" class="btn btn-sm">📋 编辑模板</button>
        </div>
    </div>

    <div class="main-area">
        <div class="panel panel-left" id="panel-left">
            <div class="panel-header">层级导航</div>
            <div class="tree-search-box">
                <input id="tree-search" class="input-sm tree-search-input" placeholder="🔍 搜索节点..." />
            </div>
            <div id="tree-container" class="tree-container"></div>
        </div>
        <div class="splitter" data-target="left"></div>
        <div class="panel panel-center" id="panel-center">
            <div class="panel-header">
                <span class="tab-label active" data-tab="form" id="tab-form">表单</span>
                <span class="tab-label" data-tab="json" id="tab-json">JSON</span>
            </div>
            <div id="editor-area" class="editor-area">
                <div class="editor-tab-panel" id="panel-form"></div>
                <div class="editor-tab-panel hidden" id="panel-json">
                    <div class="path-mirror" id="path-mirror-center">
                        <pre class="json-highlight"><code class="language-json"></code></pre>
                        <textarea class="json-editor" id="path-editor-center" spellcheck="false"></textarea>
                    </div>
                </div>
            </div>
        </div>
        <div class="splitter" data-target="right"></div>
        <div class="panel panel-right" id="panel-right">
            <div class="panel-header">JSON 预览
                <button id="btn-format-json" class="btn btn-sm" title="格式化 JSON">格式化</button>
            </div>
            <div class="json-mirror">
                <pre id="json-highlight" class="json-highlight"><code class="language-json"></code></pre>
                <textarea id="json-editor" class="json-editor" spellcheck="false"></textarea>
            </div>
        </div>
    </div>
    `;
}

// ========== 分隔条拖拽 ==========

function initSplitters() {
    $$('.splitter').forEach(splitter => {
        let dragging = false;
        let startX = 0;
        let startW = 0;
        let sign = 1;  // left=+1, right=-1
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
            if (targetPanel) {
                startW = targetPanel.getBoundingClientRect().width;
            }
            splitter.classList.add('dragging');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!dragging || !targetPanel) return;
            const delta = (e.clientX - startX) * sign;
            const newW = Math.max(180, startW + delta);
            targetPanel.style.width = newW + 'px';
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

let _editorVersion = '';
let _jsonTabVersion = '';
let _searchTerm = '';
let _editingTemplate = false;
let _templateCtx = 'content';

function editorVersion(store) {
    if (_editingTemplate) return '__template__|' + Object.keys(loadTemplates()[_templateCtx] || {}).length;
    const path = store.currentPath;
    if (!path || path.length === 0) return '__root__';
    const val = store.getByPath(path);
    const keySig = (val && typeof val === 'object' && !Array.isArray(val))
        ? Object.keys(val).length + '|' + Object.keys(val).join(',')
        : '';
    return path.join('|') + '|' + keySig;
}

function jsonTabVersion(store) {
    const path = store.currentPath;
    if (!path || path.length === 0) return '';
    const val = store.getByPath(path);
    return JSON.stringify(val).length;
}

function renderAll(store) {
    renderTreePanel(store);
    applyTreeSearch(_searchTerm);

    const ver = editorVersion(store);
    if (ver !== _editorVersion) {
        _editorVersion = ver;
        _jsonTabVersion = '';
        renderEditor(store);
    }

    // JSON Tab 内容更新（不重建表单，只刷新 textarea + 高亮）
    const jv = jsonTabVersion(store);
    if (jv !== _jsonTabVersion) {
        _jsonTabVersion = jv;
        updateJSONTabContent(store);
    }

    renderJSONPreview(store);
    navigateJSONToPath(store);
    $('#chapter-name').value = store.getChapterName();
}

// ========== 筛选栏 ==========

function renderFilterBar(store) {
    for (const field of FILTERABLE_FIELDS) {
        const sel = $('#filter-' + field);
        if (!sel) continue;
        const current = store.filters[field] || '';
        const values = store.getFieldValues(field);
        sel.innerHTML = '<option value="">' + getFieldLabel(field) + '(全部)</option>' +
            values.map(v => `<option value="${esc(v)}" ${v === current ? 'selected' : ''}>${esc(v)}</option>`).join('');
    }
}

// ========== 树形面板 ==========

/**
 * 路径感知的键搜索：
 * - "image"     → 全局搜索所有 key 含 "image" 的节点
 * - "content.headimage"   → 在 content 下找 key=headimage
 * - "content.0."  → 列出 content[0] 的所有子节点
 * 匹配行的所有祖先自动展开 + 显示，保证上下文可见。
 */
function applyTreeSearch(term) {
    const rawTerm = term.trim();

    // 清除搜索
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

    // Pass 1: 找出直接匹配的行，存 pathStr
    const matchSet = new Set();
    const rows = $$('.tree-row');
    rows.forEach(row => {
        const pathArr = JSON.parse(row.dataset.path || '[]');
        const pathStr = pathArr.join('.').toLowerCase();
        const lastKey = (pathArr[pathArr.length - 1] || '').toLowerCase();

        let hit = false;
        if (!keyPattern) {
            hit = pathStr.startsWith(scopePath + '.') || pathStr === scopePath;
        } else if (dotIdx >= 0) {
            hit = (pathStr.startsWith(scopePath + '.') || pathStr === scopePath) && lastKey.includes(keyPattern);
        } else {
            hit = pathArr.some(seg => seg.toLowerCase().includes(keyPattern));
        }
        if (hit) matchSet.add(pathStr);
    });

    // Pass 2: 收集所有祖先路径 + 展开祖先容器
    const ancestorSet = new Set();
    for (const matchedPath of matchSet) {
        const segs = matchedPath.split('.');
        for (let i = 0; i < segs.length; i++) {
            ancestorSet.add(segs.slice(0, i + 1).join('.'));
        }
    }

    // 展开所有祖先的 tree-children 容器
    rows.forEach(row => {
        const pathArr = JSON.parse(row.dataset.path || '[]');
        const pathStr = pathArr.join('.').toLowerCase();
        if (ancestorSet.has(pathStr)) {
            // 找到这个 row 对应的 tree-children（它的下一个兄弟 div）
            let childDiv = row.nextElementSibling;
            if (childDiv && childDiv.classList.contains('tree-children')) {
                if (childDiv._wasExpanded === undefined) {
                    childDiv._wasExpanded = childDiv.style.display;
                }
                childDiv.style.display = '';
                row.querySelector('.tree-icon').textContent = '▼';
            }
        }
    });

    // Pass 3: 应用显示/隐藏
    rows.forEach(row => {
        const pathArr = JSON.parse(row.dataset.path || '[]');
        const pathStr = pathArr.join('.').toLowerCase();
        if (ancestorSet.has(pathStr)) {
            row.style.display = '';
            row.classList.remove('search-dim');
        } else {
            row.style.display = 'none';
            row.classList.add('search-dim');
        }
    });
}

function renderTreePanel(store) {
    const container = $('#tree-container');
    if (!container) return;

    const data = store.chapter;

    renderTree(
        container,
        data,
        store.currentPath,
        (path) => store.selectPath(path),
        (path, type) => store.addAt(path, type),
        (path) => {
            if (confirm('确定删除该节点吗？')) {
                store.deleteAt(path);
            }
        }
    );

    // 添加底部按钮
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

/**
 * 模板编辑器 - 多上下文
 */
function renderTemplateEditor() {
    const allTpls = loadTemplates();
    const ctxKeys = Object.keys(DEFAULT_TEMPLATES);
    const ctxOptions = ctxKeys.map(k =>
        `<option value="${k}" ${k === _templateCtx ? 'selected' : ''}>${k}</option>`
    ).join('');
    const tpl = allTpls[_templateCtx] || {};
    const entries = Object.entries(tpl);
    const rows = entries.map(([key, v]) => renderTemplateField(key, v)).join('');

    $('#panel-form').innerHTML = `
        <div class="editor-header">
            <h3>📋 模板编辑</h3>
            <select id="template-ctx-select" class="input-sm" style="width:auto">${ctxOptions}</select>
        </div>
        <div class="editor-fields">${rows}</div>
        <button id="btn-add-tmpl-field" class="btn btn-sm btn-success" style="margin-top:4px">＋ 添加字段</button>`;

    // 上下文切换
    $('#template-ctx-select').addEventListener('change', (e) => {
        _templateCtx = e.target.value;
        store._emit();
    });

    // 添加字段
    $('#btn-add-tmpl-field').addEventListener('click', () => {
        const all = loadTemplates();
        const ctx = all[_templateCtx] || {};
        let k = 'new_field';
        let i = 1;
        while (k in ctx) { k = 'new_field_' + i; i++; }
        ctx[k] = '';
        saveTemplate(_templateCtx, ctx);
        store._emit();
    });

    // 删除字段
    $$('.btn-del-tmpl').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const all = loadTemplates();
            const ctx = all[_templateCtx] || {};
            delete ctx[btn.dataset.delKey];
            saveTemplate(_templateCtx, ctx);
            store._emit();
        });
    });

    // 绑定输入
    $$('.tmpl-field').forEach(inp => {
        const key = inp.dataset.field;
        inp.addEventListener('input', debounce(() => {
            const current = loadTemplates();
            const ctx = current[_templateCtx] || {};
            ctx[key] = inp.value;
            saveTemplate(_templateCtx, ctx);
        }, 250));
    });
    $$('.tmpl-i18n-zh').forEach(inp => {
        const key = inp.dataset.field;
        inp.addEventListener('input', debounce(() => {
            const all = loadTemplates();
            const ctx = all[_templateCtx] || {};
            if (typeof ctx[key] !== 'object') ctx[key] = { zh: '', en: '' };
            ctx[key].zh = inp.value;
            saveTemplate(_templateCtx, ctx);
        }, 250));
    });
    $$('.tmpl-i18n-en').forEach(inp => {
        const key = inp.dataset.field;
        inp.addEventListener('input', debounce(() => {
            const all = loadTemplates();
            const ctx = all[_templateCtx] || {};
            if (typeof ctx[key] !== 'object') ctx[key] = { zh: '', en: '' };
            ctx[key].en = inp.value;
            saveTemplate(_templateCtx, ctx);
        }, 250));
    });

    // JSON Tab
    const jsonStr = JSON.stringify(tpl, null, 4);
    $('#path-editor-center').value = jsonStr;
    const hlPre = $('#path-mirror-center code');
    if (hlPre && window.hljs) {
        try { hlPre.innerHTML = window.hljs.highlight(jsonStr, { language: 'json' }).value; }
        catch (e) { hlPre.textContent = jsonStr; }
    }
}

function renderTemplateField(key, v) {
    const labelText = getFieldLabel(key);
    if (typeof v === 'object' && !Array.isArray(v) && v.zh !== undefined && v.en !== undefined) {
        return `<div class="field-row">
            <label class="editable-label" data-key="${key}" title="双击编辑标签">${esc(labelText)}</label>
            <div class="i18n-group">
                <input class="input tmpl-i18n-zh" data-field="${key}" value="${esc(v.zh || '')}" placeholder="zh" />
                <input class="input tmpl-i18n-en" data-field="${key}" value="${esc(v.en || '')}" placeholder="en" />
            </div>
            <button class="btn-icon btn-del-tmpl" data-del-key="${key}" title="删除字段">✕</button>
        </div>`;
    }
    const strVal = v === null || v === undefined ? '' : String(v);
    return `<div class="field-row">
        <label class="editable-label" data-key="${key}" title="双击编辑标签">${esc(labelText)}</label>
        <input class="input tmpl-field" data-field="${key}" value="${esc(strVal)}" />
        <button class="btn-icon btn-del-tmpl" data-del-key="${key}" title="删除字段">✕</button>
    </div>`;
}

function renderEditor(store) {
    // ---- 模板编辑模式 ----
    if (_editingTemplate) {
        renderTemplateEditor();
        return;
    }

    const path = store.currentPath;
    if (!path || path.length === 0) {
        $('#panel-form').innerHTML = '<div class="empty-hint">← 点击左侧节点开始编辑</div>';
        return;
    }

    const val = store.getByPath(path);
    const pathLabel = path.join(' → ');

    // ---- 表单 Tab ----
    let formHtml = `<div class="editor-header"><h3>${esc(pathLabel)}</h3></div>`;

    if (val === null || val === undefined) {
        formHtml += '<div class="empty-hint">null</div>';
    } else if (typeof val !== 'object') {
        // 纯值：显示一个文本输入框
        formHtml += `
        <div class="field-row">
            <label>值</label>
            <input class="input form-simple-value" data-pathkey="${esc(path.join('|'))}" value="${esc(String(val))}" />
        </div>`;
    } else {
        // 对象或数组：遍历 key
        const entries = Array.isArray(val)
            ? val.map((item, i) => [String(i), item])
            : Object.entries(val);

        const rows = entries.map(([key, v]) => renderFormField(key, v, path, store)).join('');
        formHtml += `<div class="editor-fields">${rows}</div>`;

        // 对象类型加 "+" 按钮
        if (!Array.isArray(val)) {
            formHtml += `<button id="btn-add-field" class="btn btn-sm btn-success" style="margin-top:4px">＋ 添加属性</button>`;
        }

        // 如果是 content 节点且有 options，显示选项编辑器
        if (path.length === 2 && path[0] === 'content' && val.options) {
            formHtml += `<div class="editor-options">${renderOptions(val, store)}</div>`;
        }
    }

    $('#panel-form').innerHTML = formHtml;

    // 绑定表单输入事件
    bindFormInputs(path, val, store);

    // 如果是 content 节点，绑定选项按钮
    if (path.length === 2 && path[0] === 'content' && val && val.options) {
        bindOptionButtons(val, store);
    }

    // 标签编辑
    bindLabelEdit();

    // "+ 添加属性" 按钮
    const addFieldBtn = $('#btn-add-field');
    if (addFieldBtn) {
        addFieldBtn.addEventListener('click', () => {
            const obj = store.getByPath(path);
            if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
            // 找唯一键名
            let newKey = 'new_key';
            let i = 1;
            while (newKey in obj) { newKey = 'new_key_' + i; i++; }
            obj[newKey] = '';
            store.setByPath(path, obj);
        });
    }

    // 删除属性按钮
    $$('.btn-del-field').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const key = btn.dataset.delKey;
            const curPath = store.currentPath;
            const obj = store.getByPath(curPath);
            if (obj && typeof obj === 'object' && key in obj) {
                delete obj[key];
                store.setByPath(curPath, obj);
            }
        });
    });
}

/**
 * 仅更新 JSON Tab 的内容（不重建 DOM，不丢焦点）
 */
function updateJSONTabContent(store) {
    const path = store.currentPath;
    if (!path || path.length === 0) return;
    const val = store.getByPath(path);
    const jsonStr = JSON.stringify(val, null, 4);
    const pc = $('#path-editor-center');
    if (pc) pc.value = jsonStr;
    const hlPre = $('#path-mirror-center code');
    if (hlPre && window.hljs) {
        try {
            hlPre.innerHTML = window.hljs.highlight(jsonStr, { language: 'json' }).value;
        } catch (e) { hlPre.textContent = jsonStr; }
    }
}

/**
 * 渲染表单中的单个字段
 */
function renderFormField(key, v, parentPath, store) {
    const labelText = getFieldLabel(key);
    const childPath = [...parentPath, key];

    // null/undefined
    if (v === null || v === undefined) {
        return `<div class="field-row" data-field="${key}">
            <label class="editable-label" data-key="${key}" title="双击编辑标签">${esc(labelText)}</label>
            <input class="input form-field" data-field="${key}" value="" placeholder="null" />
            <button class="btn-icon btn-del-field" data-del-key="${key}" title="删除属性">✕</button>
        </div>`;
    }

    // i18n 双语对象 {zh, en}
    if (typeof v === 'object' && !Array.isArray(v) && v.zh !== undefined && v.en !== undefined) {
        return `<div class="field-row" data-field="${key}">
            <label class="editable-label" data-key="${key}" title="双击编辑标签">${esc(labelText)}</label>
            <div class="i18n-group">
                <input class="input form-i18n-zh" data-field="${key}" value="${esc(v.zh || '')}" placeholder="zh" />
                <input class="input form-i18n-en" data-field="${key}" value="${esc(v.en || '')}" placeholder="en" />
            </div>
            <button class="btn-icon btn-del-field" data-del-key="${key}" title="删除属性">✕</button>
        </div>`;
    }

    // 数组
    if (Array.isArray(v)) {
        const pathKey = childPath.join('|');
        return `<div class="field-row" data-field="${key}">
            <label class="editable-label" data-key="${key}" title="双击编辑标签">${esc(labelText)}</label>
            <span class="nested-preview">[ ${v.length} 项 ]</span>
            <button class="btn btn-sm btn-jump" data-jump="${esc(pathKey)}" title="跳转到此节点">→</button>
            <button class="btn-icon btn-del-field" data-del-key="${key}" title="删除属性">✕</button>
        </div>`;
    }

    // 嵌套对象
    if (typeof v === 'object') {
        const keys = Object.keys(v);
        const pathKey = childPath.join('|');
        return `<div class="field-row" data-field="${key}">
            <label class="editable-label" data-key="${key}" title="双击编辑标签">${esc(labelText)}</label>
            <span class="nested-preview">{ ${keys.length} 个属性 }</span>
            <button class="btn btn-sm btn-jump" data-jump="${esc(pathKey)}" title="跳转到此节点">→</button>
            <button class="btn-icon btn-del-field" data-del-key="${key}" title="删除属性">✕</button>
        </div>`;
    }

    // 简单值（string / number / boolean）
    return `<div class="field-row" data-field="${key}">
        <label class="editable-label" data-key="${key}" title="双击编辑标签">${esc(labelText)}</label>
        <input class="input form-field" data-field="${key}" value="${esc(String(v))}" />
        <button class="btn-icon btn-del-field" data-del-key="${key}" title="删除属性">✕</button>
    </div>`;
}

/**
 * 绑定表单输入事件，写回 store
 */
function bindFormInputs(path, parentVal, store) {
    // 简单值 input
    $$('.form-simple-value').forEach(inp => {
        inp.addEventListener('input', debounce(() => {
            store.setByPath(path, inp.value);
        }, 250));
    });

    // 字段 input
    $$('.form-field').forEach(inp => {
        const key = inp.dataset.field;
        inp.addEventListener('input', debounce(() => {
            const childPath = [...path, key];
            store.setByPath(childPath, inp.value);
        }, 250));
    });

    // i18n zh
    $$('.form-i18n-zh').forEach(inp => {
        const key = inp.dataset.field;
        inp.addEventListener('input', debounce(() => {
            const childPath = [...path, key];
            const val = store.getByPath(childPath) || {};
            val.zh = inp.value;
            store.setByPath(childPath, val);
        }, 250));
    });

    // i18n en
    $$('.form-i18n-en').forEach(inp => {
        const key = inp.dataset.field;
        inp.addEventListener('input', debounce(() => {
            const childPath = [...path, key];
            const val = store.getByPath(childPath) || {};
            val.en = inp.value;
            store.setByPath(childPath, val);
        }, 250));
    });

    // 跳转按钮
    $$('.btn-jump').forEach(btn => {
        btn.addEventListener('click', () => {
            const jumpPath = btn.dataset.jump.split('|');
            store.selectPath(jumpPath);
        });
    });
}

// ========== 选项区 ==========

function renderOptions(node, store) {
    const opts = node.options || [];
    const rows = opts.map((opt, i) => `
        <div class="option-row">
            <span class="option-index">选项${i + 1}</span>
            <div class="i18n-group option-i18n">
                <input class="input opt-zh" data-opt-idx="${i}" value="${esc(opt.text?.zh || '')}" placeholder="zh" />
                <input class="input opt-en" data-opt-idx="${i}" value="${esc(opt.text?.en || '')}" placeholder="en" />
            </div>
            <input class="input input-sm opt-next" data-opt-idx="${i}" value="${esc(opt.next || '')}" placeholder="跳转ID" style="width:80px" />
            ${renderActions(node.id, opt, i, store)}
            <button class="btn-icon" data-action="del-opt" data-opt-idx="${i}" title="删除选项">🗑</button>
        </div>
    `).join('');

    return `
    <div class="section-title">选项列表</div>
    ${rows}
    <button id="btn-add-option" class="btn btn-sm" data-node-id="${esc(node.id)}">＋ 添加选项</button>
    `;
}

function renderActions(nodeId, opt, optIdx, store) {
    const acts = opt.actions || [];
    if (acts.length === 0) {
        return `<button class="btn btn-sm btn-add-action" data-opt-idx="${optIdx}">＋ action</button>`;
    }
    return acts.map((act, ai) => `
        <div class="action-inline">
            <input class="input input-xs action-cmd" data-opt-idx="${optIdx}" data-act-idx="${ai}"
                   value="${esc(act.cmd || '')}" placeholder="cmd(如 addItem)" style="width:90px" />
            <input class="input input-xs action-params" data-opt-idx="${optIdx}" data-act-idx="${ai}"
                   value="${esc(JSON.stringify(act.params || []))}" placeholder="params" style="width:120px" />
            <button class="btn-icon" data-action="del-act" data-opt-idx="${optIdx}" data-act-idx="${ai}">✕</button>
        </div>
    `).join('') + `<button class="btn btn-sm btn-add-action" data-opt-idx="${optIdx}">＋ action</button>`;
}

function bindOptionButtons(node, store) {
    // 添加选项
    const addBtn = $('#btn-add-option');
    if (addBtn) {
        addBtn.addEventListener('click', () => store.addOption(node.id));
    }

    // 选项文本
    $$('.opt-zh').forEach(inp => {
        inp.addEventListener('input', debounce((e) => {
            const i = parseInt(inp.dataset.optIdx);
            const en = $(`.opt-en[data-opt-idx="${i}"]`);
            store.updateOptionText(node.id, i, inp.value, en ? en.value : '');
        }, 250));
    });
    $$('.opt-en').forEach(inp => {
        inp.addEventListener('input', debounce((e) => {
            const i = parseInt(inp.dataset.optIdx);
            const zh = $(`.opt-zh[data-opt-idx="${i}"]`);
            store.updateOptionText(node.id, i, zh ? zh.value : '', inp.value);
        }, 250));
    });

    // 选项 next
    $$('.opt-next').forEach(inp => {
        inp.addEventListener('input', debounce((e) => {
            const i = parseInt(inp.dataset.optIdx);
            store.updateOption(node.id, i, { next: inp.value });
        }, 250));
    });

    // 删除选项
    $$('[data-action="del-opt"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const i = parseInt(btn.dataset.optIdx);
            store.deleteOption(node.id, i);
        });
    });

    // 添加 action
    $$('.btn-add-action').forEach(btn => {
        btn.addEventListener('click', () => {
            const i = parseInt(btn.dataset.optIdx);
            store.addAction(node.id, i);
        });
    });

    // action cmd
    $$('.action-cmd').forEach(inp => {
        inp.addEventListener('input', debounce((e) => {
            const oi = parseInt(inp.dataset.optIdx);
            const ai = parseInt(inp.dataset.actIdx);
            store.updateActionCmd(node.id, oi, ai, inp.value);
        }, 250));
    });

    // action params
    $$('.action-params').forEach(inp => {
        inp.addEventListener('input', debounce((e) => {
            const oi = parseInt(inp.dataset.optIdx);
            const ai = parseInt(inp.dataset.actIdx);
            store.updateActionParams(node.id, oi, ai, inp.value);
        }, 250));
    });

    // 删除 action
    $$('[data-action="del-act"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const oi = parseInt(btn.dataset.optIdx);
            const ai = parseInt(btn.dataset.actIdx);
            store.deleteAction(node.id, oi, ai);
        });
    });
}

// ========== JSON 预览 ==========

function renderJSONPreview(store) {
    const editor = $('#json-editor');
    const clean = store.toCleanJSON();
    const jsonStr = JSON.stringify(clean, null, 4);
    editor.value = jsonStr;
    const hlCode = $('#json-highlight code');
    hlCode.textContent = jsonStr;
    try {
        hlCode.innerHTML = window.hljs.highlight(jsonStr, { language: 'json' }).value;
    } catch (e) { /* fallback to plain text */ }
}

// ========== 路径定位 ==========

let _lastNavigatedPath = '';

function navigateJSONToPath(store) {
    const path = store.currentPath;
    if (!path || path.length === 0) {
        _lastNavigatedPath = '';
        return;
    }
    const pathKey = path.join('/');
    if (pathKey === _lastNavigatedPath) return; // 路径没变，不重复导航
    _lastNavigatedPath = pathKey;

    const editor = $('#json-editor');
    const hl = $('#json-highlight');
    const jsonStr = editor.value;
    const jsonClean = store.toCleanJSON();

    const pos = locatePathInJSON(jsonStr, jsonClean, path);
    if (!pos) return;

    // textarea 选中对应区域
    editor.focus();
    editor.setSelectionRange(pos.start, pos.end);

    // 计算滚动位置（把选中行滚到视口中间）
    const lineHeight = 18; // 12px font * 1.5 line-height
    const before = jsonStr.slice(0, pos.start);
    const line = before.split('\n').length - 1;
    const scrollTarget = Math.max(0, (line - 5) * lineHeight);
    editor.scrollTop = scrollTarget;
    hl.scrollTop = scrollTarget;
}

/**
 * 在格式化 JSON 字符串中定位 path 对应的字符范围。
 * 策略：找到父级位置，在父级范围内搜索最后一个 key 的值。
 */
function locatePathInJSON(jsonStr, cleanData, path) {
    if (!path || path.length === 0) return null;

    const lastSeg = path[path.length - 1];
    const parentPath = path.slice(0, -1);
    const isArrayIndex = !isNaN(parseInt(lastSeg));

    // 1. 确定搜索范围：找到父级的字符位置
    let searchStart = 0;
    let searchEnd = jsonStr.length;

    if (parentPath.length > 0) {
        const parentPos = locatePathInJSON(jsonStr, cleanData, parentPath);
        if (parentPos) {
            // 缩窄范围到父级内部
            searchStart = parentPos.start;
            searchEnd = parentPos.end;
        }
    }

    // 2. 在范围内搜索最后一个 key 或数组元素
    const range = jsonStr.slice(searchStart, searchEnd);

    if (isArrayIndex) {
        // 数组元素：在范围内找第 N 个顶级 ,
        return locateArrayElement(jsonStr, searchStart, searchEnd, parseInt(lastSeg));
    }

    // 对象 key：搜索 "key": 模式
    const keyPattern = `\n"${lastSeg}":`;
    const idx = range.indexOf(keyPattern);
    if (idx === -1) {
        // 也可能是第一行
        const firstLinePattern = `"${lastSeg}":`;
        if (range.startsWith(firstLinePattern)) {
            return locateValueRange(jsonStr, searchStart + firstLinePattern.length, searchEnd);
        }
        return null;
    }

    const afterKey = searchStart + idx + keyPattern.length;
    return locateValueRange(jsonStr, afterKey, searchEnd);
}

function locateValueRange(jsonStr, valueStart, searchEnd) {
    // 跳过冒号后的空格
    let pos = valueStart;
    while (pos < jsonStr.length && jsonStr[pos] === ' ') pos++;

    if (pos >= jsonStr.length) return null;

    // 根据值类型确定 end
    const ch = jsonStr[pos];
    let end = pos;

    if (ch === '"') {
        // 字符串
        end = pos + 1;
        while (end < searchEnd) {
            if (jsonStr[end] === '\\') { end += 2; continue; }
            if (jsonStr[end] === '"') { end++; break; }
            end++;
        }
    } else if (ch === '{' || ch === '[') {
        // 对象或数组：匹配括号
        let depth = 1;
        end = pos + 1;
        const close = ch === '{' ? '}' : ']';
        let inString = false;
        while (end < searchEnd && depth > 0) {
            const c = jsonStr[end];
            if (inString) {
                if (c === '\\') { end += 2; continue; }
                if (c === '"') inString = false;
                end++;
                continue;
            }
            if (c === '"') inString = true;
            else if (c === ch) depth++;
            else if (c === close) depth--;
            end++;
        }
    } else {
        // 数字/布尔/null
        end = pos;
        while (end < searchEnd && !/[\s,\n\]}]/.test(jsonStr[end])) end++;
    }

    return { start: pos, end };
}

function locateArrayElement(jsonStr, searchStart, searchEnd, targetIndex) {
    // 在 searchStart..searchEnd 内，跳过 [ 找第 targetIndex 个顶层值
    let pos = searchStart;
    while (pos < searchEnd && jsonStr[pos] !== '[') pos++;
    pos++; // skip [

    let depth = 0;
    let inString = false;
    let elemIndex = 0;
    let elemStart = -1;

    for (let i = pos; i < searchEnd; i++) {
        const c = jsonStr[i];
        if (inString) {
            if (c === '\\') { i++; continue; }
            if (c === '"') inString = false;
            continue;
        }
        if (c === '"') { inString = true; continue; }
        if (c === '{' || c === '[') {
            depth++;
            if (depth === 1 && elemIndex === targetIndex) {
                elemStart = i;
            }
        }
        if (c === '}' || c === ']') {
            depth--;
            if (depth === 0 && elemIndex === targetIndex) {
                return locateValueRange(jsonStr, elemStart, i + 1);
            }
        }
        if (c === ',' && depth === 0) {
            if (elemIndex === targetIndex && elemStart !== -1) {
                return locateValueRange(jsonStr, elemStart, i);
            }
            if (elemIndex === targetIndex && elemStart === -1) {
                // primitive value before comma
                return locateValueRange(jsonStr, pos, i);
            }
            elemIndex++;
            pos = i + 1;
            elemStart = -1;
        }
    }
    // last element
    if (elemIndex === targetIndex && elemStart !== -1) {
        return locateValueRange(jsonStr, elemStart, searchEnd - 1);
    }
    if (elemIndex === targetIndex && elemStart === -1) {
        return locateValueRange(jsonStr, pos, searchEnd - 1);
    }
    return null;
}

// ========== 双击编辑标签 ==========

function bindLabelEdit() {
    $$('.editable-label').forEach(label => {
        label.addEventListener('dblclick', () => {
            const key = label.dataset.key;
            const currentText = label.textContent;
            const input = document.createElement('input');
            input.className = 'input input-sm label-edit-input';
            input.value = currentText;
            input.style.width = '80px';
            label.replaceWith(input);
            input.focus();
            input.select();

            const commit = () => {
                const newLabel = input.value.trim() || currentText;
                saveLabel(key, newLabel);
                _editorVersion = '';
                store._emit();
            };
            input.addEventListener('blur', commit);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') commit();
                if (e.key === 'Escape') {
                    input.value = currentText;
                    commit();
                }
            });
        });
    });
}

// ========== 工具函数 ==========

function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

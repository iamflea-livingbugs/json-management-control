// ==========================================
// storyUI.js — 界面渲染
// ==========================================

import { NODE_FIELDS, FILTERABLE_FIELDS, isEmpty, getFieldLabel, saveLabel } from './storyTypes.js';
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
    $('#btn-clear-filter').addEventListener('click', () => {
        store.clearFilters();
        $('#filter-search').value = '';
    });

    // ---- 章节名 ----
    $('#chapter-name').addEventListener('input', (e) => {
        store.setChapterName(e.target.value);
    });

    // ---- 筛选栏 ----
    renderFilterBar(store);
    for (const f of FILTERABLE_FIELDS) {
        $(`#filter-${f}`).addEventListener('change', (e) => store.setFilter(f, e.target.value));
    }
    $('#filter-search').addEventListener('input', debounce((e) => {
        // 通用搜索：匹配 speaker / text / id
        const val = e.target.value;
        if (!val) {
            store.clearFilters();
        } else {
            store.setFilter('_search', val);
        }
    }, 300));

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
        </div>
    </div>

    <div class="filter-bar">
        <label>筛选：</label>
        ${FILTERABLE_FIELDS.map(f => `<select id="filter-${f}"><option value="">${getFieldLabel(f)}(全部)</option></select>`).join('')}
        <input id="filter-search" class="input-sm" placeholder="🔍 通用搜索..." style="width:160px" />
        <button id="btn-clear-filter" class="btn btn-sm">清除筛选</button>
    </div>

    <div class="main-area">
        <div class="panel panel-left" id="panel-left">
            <div class="panel-header">层级导航</div>
            <div id="tree-container" class="tree-container"></div>
        </div>
        <div class="splitter" data-target="left"></div>
        <div class="panel panel-center" id="panel-center">
            <div class="panel-header">节点编辑</div>
            <div id="editor-area" class="editor-area"></div>
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

function editorVersion(store) {
    const pathStr = store.currentPath.join('|') || '__root__';
    if (!store.selectedId) return pathStr;
    const node = store.getNode(store.selectedId);
    if (!node) return pathStr + '|__missing__';
    const opts = node.options || [];
    const keyCount = Object.keys(node).length;
    return pathStr + '|' + opts.length + '|' +
        opts.map(o => (o.actions || []).length).join(',') + '|' + keyCount;
}

function renderAll(store) {
    renderTreePanel(store);

    const ver = editorVersion(store);
    if (ver !== _editorVersion) {
        _editorVersion = ver;
        renderEditor(store);
    }

    renderJSONPreview(store);
    navigateJSONToPath(store);
    renderFilterBar(store);
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

    // 添加底部按钮：新建节点（快捷操作）
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
    const area = $('#editor-area');
    const path = store.currentPath;

    if (!store.selectedId) {
        // 非 content 节点的路径，显示该路径的 JSON 摘要
        if (path && path.length > 0) {
            const val = store.getByPath(path);
            const pathLabel = path.join(' → ');
            const jsonStr = JSON.stringify(val, null, 4);
            const hlHtml = window.hljs
                ? window.hljs.highlight(jsonStr, { language: 'json' }).value
                : esc(jsonStr);
            area.innerHTML = `
            <div class="editor-header">
                <h3>${esc(pathLabel)}</h3>
            </div>
            <div class="editor-fields" style="flex:1;display:flex;flex-direction:column">
                <div class="path-mirror">
                    <pre class="json-highlight"><code class="language-json">${hlHtml}</code></pre>
                    <textarea class="json-editor" id="path-value-editor" spellcheck="false">${esc(jsonStr)}</textarea>
                </div>
            </div>`;
            const ta = $('#path-value-editor');
            const hlPre = area.querySelector('.path-mirror .json-highlight code');
            if (ta) {
                ta.addEventListener('input', () => {
                    const text = ta.value;
                    if (window.hljs && hlPre) {
                        try { hlPre.innerHTML = window.hljs.highlight(text, { language: 'json' }).value; }
                        catch (e) { hlPre.textContent = text; }
                    } else if (hlPre) { hlPre.textContent = text; }
                    try {
                        const parsed = JSON.parse(text);
                        store.setByPath(path, parsed);
                    } catch (e) { /* invalid JSON */ }
                });
                ta.addEventListener('scroll', () => {
                    if (ta.previousElementSibling) {
                        ta.previousElementSibling.scrollTop = ta.scrollTop;
                        ta.previousElementSibling.scrollLeft = ta.scrollLeft;
                    }
                });
            }
            return;
        }
        area.innerHTML = '<div class="empty-hint">← 点击左侧节点开始编辑</div>';
        return;
    }

    const node = store.getNode(store.selectedId);
    if (!node) {
        area.innerHTML = '<div class="empty-hint">节点不存在</div>';
        return;
    }

    const knownKeys = NODE_FIELDS.map(f => f.key);
    const allKeys = Object.keys(node);
    const orderedKeys = [...new Set([...knownKeys.filter(k => allKeys.includes(k)), ...allKeys.filter(k => !knownKeys.includes(k))])];
    const displayKeys = orderedKeys.filter(k => k !== 'id');

    const fieldRows = displayKeys.map(key => {
        const known = NODE_FIELDS.find(f => f.key === key);
        return renderFieldDynamic(key, node[key], known, node, store);
    }).join('');

    area.innerHTML = `
    <div class="editor-header">
        <h3>节点 [${esc(node.id)}]</h3>
    </div>
    <div class="editor-fields">
        ${fieldRows}
    </div>
    <div class="editor-options">
        ${renderOptions(node, store)}
    </div>
    `;

    for (const key of displayKeys) {
        const known = NODE_FIELDS.find(f => f.key === key);
        if (known && known.type === 'i18n') {
            bindI18nInputs(key, node, store);
        } else {
            bindStringInput(key, node, store);
        }
    }

    bindOptionButtons(node, store);
    bindLabelEdit();
}

/**
 * 动态渲染任意字段。已知字段用 NODE_FIELDS 类型，未知字段从值推断。
 */
function renderFieldDynamic(key, val, known, node, store) {
    const labelText = getFieldLabel(key);
    const type = known ? known.type : inferType(val);

    if (type === 'i18n') {
        const zhVal = val?.zh || '';
        const enVal = val?.en || '';
        return `
        <div class="field-row" data-field="${key}">
            <label class="editable-label" data-key="${key}" title="双击编辑标签">${esc(labelText)}</label>
            <div class="i18n-group">
                <input class="input i18n-zh" data-field="${key}" value="${esc(zhVal)}" placeholder="zh" />
                <input class="input i18n-en" data-field="${key}" value="${esc(enVal)}" placeholder="en" />
            </div>
        </div>`;
    }
    if (type === 'object' || type === 'array') {
        const jsonStr = val ? JSON.stringify(val) : '';
        return `
        <div class="field-row" data-field="${key}">
            <label class="editable-label" data-key="${key}" title="双击编辑标签">${esc(labelText)}</label>
            <textarea class="input json-field-value" data-field="${key}" rows="3" style="min-height:40px;font-family:monospace;font-size:11px">${esc(jsonStr)}</textarea>
        </div>`;
    }
    const strVal = val === null || val === undefined ? '' : String(val);
    return `
    <div class="field-row" data-field="${key}">
        <label class="editable-label" data-key="${key}" title="双击编辑标签">${esc(labelText)}</label>
        <input class="input string-input" data-field="${key}" value="${esc(strVal)}" />
    </div>`;
}

function inferType(val) {
    if (val === null || val === undefined) return 'string';
    if (typeof val === 'object' && val.zh !== undefined && val.en !== undefined) return 'i18n';
    if (Array.isArray(val)) return 'array';
    if (typeof val === 'object') return 'object';
    return 'string';
}

function bindI18nInputs(field, node, store) {
    const zhInput = $(`.i18n-zh[data-field="${field}"]`);
    const enInput = $(`.i18n-en[data-field="${field}"]`);
    if (!zhInput || !enInput) return;

    const handler = debounce(() => {
        store.updateNodeField(node.id, field, zhInput.value, enInput.value);
    }, 250);
    zhInput.addEventListener('input', handler);
    enInput.addEventListener('input', handler);
}

function bindStringInput(field, node, store) {
    const input = $(`.string-input[data-field="${field}"]`) || $(`.json-field-value[data-field="${field}"]`);
    if (!input) return;
    const handler = debounce(() => {
        if (input.classList.contains('json-field-value')) {
            try {
                const parsed = JSON.parse(input.value);
                store.updateNodeField(node.id, field, parsed, '');
            } catch (e) {
                store.updateNodeField(node.id, field, input.value, '');
            }
        } else {
            store.updateNodeField(node.id, field, input.value, '');
        }
    }, 250);
    input.addEventListener('input', handler);
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

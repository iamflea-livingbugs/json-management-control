// ==========================================
// storyUI.js — 界面渲染
// ==========================================

import { createChapter, getFieldLabel, saveLabel } from './storyTypes.js';
import { store } from './storyStore.js';
import { renderTree } from './storyTree.js';
import { openTemplateEditor } from './storyTemplateUI.js';
import { getContextsConfig, saveConfigToLocal, exportConfigJSON } from './storyTypes.js';

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

    // 配置模式按钮显示控制
    const saveBtn = $('#btn-save-config');
    if (saveBtn) {
        saveBtn.style.display = store._configUrl ? '' : 'none';
    }

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
        (path) => {
            store.selectPath(path);
        },
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

function renderEditor(store) {
    const path = store.currentPath || [];
    const val = store.getByPath(path);
    const pathLabel = path.length === 0 ? '(root)' : path.join(' → ');

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

        if (Array.isArray(val)) {
            // 数组：显示空提示 + 添加按钮
            const isContent = path.length === 1 && path[0] === 'content';
            const isOptions = path.join('.').includes('options');
            const isActions = path.join('.').includes('actions');
            let defaultType = 'object';
            if (isContent) defaultType = 'content';
            else if (isOptions) defaultType = 'option';
            else if (isActions) defaultType = 'action';

            if (val.length === 0) {
                formHtml += `<div class="empty-hint">数组为空，点击下方按钮添加元素</div>`;
            } else {
                formHtml += `<div class="editor-fields">${rows}</div>`;
            }
            formHtml += `<div class="array-add-bar">
                <select id="array-add-type" class="input-sm" style="width:auto">
                    ${isContent ? '<option value="content">对话节点(content模板)</option>' : ''}
                    ${isOptions ? '<option value="option">选项(option模板)</option>' : ''}
                    ${isActions ? '<option value="action">动作(action模板)</option>' : ''}
                    <option value="object" ${defaultType === 'object' ? 'selected' : ''}>空对象 {}</option>
                    <option value="string" ${defaultType === 'string' ? 'selected' : ''}>字符串 ""</option>
                    <option value="number">数字 0</option>
                    <option value="array">空数组 []</option>
                </select>
                <button id="btn-add-array-item" class="btn btn-sm btn-success">＋ 添加</button>
            </div>`;
        } else {
            formHtml += `<div class="editor-fields">${rows}</div>`;
            // 对象类型加 "+" 按钮
            if (val !== null) {
                formHtml += `<button id="btn-add-field" class="btn btn-sm btn-success" style="margin-top:4px">＋ 添加属性</button>`;
            }
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
            let newKey = 'new_key';
            let i = 1;
            while (newKey in obj) { newKey = 'new_key_' + i; i++; }
            obj[newKey] = '';
            store.setByPath(path, obj);
        });
    }

    // "＋ 添加元素" 按钮（数组）
    const addArrBtn = $('#btn-add-array-item');
    if (addArrBtn) {
        addArrBtn.addEventListener('click', () => {
            const typeSelect = $('#array-add-type');
            const selected = typeSelect ? typeSelect.value : 'object';
            if (selected === 'content' || selected === 'option' || selected === 'action') {
                // 走模板
                store.addAt(path, 'array');
            } else {
                // 按选中类型添加
                const parent = store.getByPath(path);
                if (!parent || !Array.isArray(parent)) return;
                let item;
                switch (selected) {
                    case 'string': item = ''; break;
                    case 'number': item = 0; break;
                    case 'array': item = []; break;
                    default: item = {};
                }
                parent.push(item);
                store._emit();
            }
        });
    }

    // 删除属性按钮
    $$('.btn-del-field').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const key = btn.dataset.delKey;
            const obj = store.getByPath(path);
            if (obj && typeof obj === 'object' && key in obj) {
                delete obj[key];
                store.setByPath(path, obj);
            }
        });
    });
}

/**
 * 仅更新 JSON Tab 的内容（不重建 DOM，不丢焦点）
 */
function updateJSONTabContent(store) {
    const path = store.currentPath || [];
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

// ========== 配置编辑弹窗 ==========

function openConfigEditor() {
    const existing = document.getElementById('modal-config-editor');
    if (existing) {
        existing.classList.add('open');
        return;
    }

    const config = getContextsConfig();
    const jsonStr = JSON.stringify(config, null, 4);

    const modal = document.createElement('div');
    modal.id = 'modal-config-editor';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-box" style="width:600px">
            <div class="modal-header">
                <h2>⚙️ 模板上下文配置</h2>
                <button class="modal-close" id="btn-config-close">✕</button>
            </div>
            <div class="modal-body">
                <div style="margin-bottom:8px;font-size:0.75rem;color:var(--text-dim)">
                    编辑后保存到本地，可导出为 JSON 文件替换 <code>config/template-contexts.json</code>
                </div>
                <div class="tpl-json-mirror" style="min-height:300px">
                    <pre class="json-highlight"><code id="config-json-code"></code></pre>
                    <textarea id="config-json-editor" class="json-editor" spellcheck="false"></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-sm" id="btn-config-export">💾 导出文件</button>
                <button class="btn btn-sm btn-primary" id="btn-config-save">✅ 保存</button>
                <button class="btn btn-sm" id="btn-config-close-bottom">关闭</button>
            </div>
        </div>`;

    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('open'));

    const hlCode = document.getElementById('config-json-code');
    const editor = document.getElementById('config-json-editor');
    if (editor && hlCode) {
        editor.value = jsonStr;
        hlCode.textContent = jsonStr;
        if (window.hljs) {
            try { hlCode.innerHTML = window.hljs.highlight(jsonStr, { language: 'json' }).value; } catch (e) {}
        }
        editor.addEventListener('input', () => {
            hlCode.textContent = editor.value;
            if (window.hljs) {
                try { hlCode.innerHTML = window.hljs.highlight(editor.value, { language: 'json' }).value; } catch (e) {}
            }
        });
        editor.addEventListener('scroll', () => {
            hlCode.scrollTop = editor.scrollTop;
            hlCode.scrollLeft = editor.scrollLeft;
        });
    }

    document.getElementById('btn-config-save').addEventListener('click', () => {
        try {
            const parsed = JSON.parse(editor.value);
            saveConfigToLocal(parsed);
            document.getElementById('modal-config-editor').classList.remove('open');
            store._emit();
        } catch (e) {
            alert('JSON 格式有误，无法保存：' + e.message);
        }
    });

    document.getElementById('btn-config-export').addEventListener('click', () => {
        try {
            JSON.parse(editor.value);
            exportConfigJSON();
        } catch (e) {
            alert('JSON 格式有误，请修正后再导出');
        }
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
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

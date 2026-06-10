// ==========================================
// storyUI.js — 界面渲染（主 UI 层）
// 职责：
//   1. 初始化工具栏、面板、事件绑定
//   2. 监听 store.onChange 驱动各面板渲染
//   3. 渲染编辑区表单、选项区域、JSON 预览
//   4. 提供配置编辑弹窗
// ==========================================

import { createChapter, createBlankChapter, getFieldLabel } from '../base/storyTypes.js';
import { store } from '../data/storyStore.js';
import { renderTree } from '../ui/storyTree.js';
import { openTemplateEditor } from '../ui/storyTemplateUI.js';
import { openLabelManager } from './labelManager.js';
import { showCreateDialog } from './createDialog.js';
import { getContextsConfig, saveConfigToLocal, exportConfigJSON } from '../base/storyTypes.js';
import { showAlert, showConfirm, makeModalDraggable } from './modalDialog.js';

// 快捷 DOM 引用
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// 缓存 layout.html 内容（首次加载后复用）
let _layoutHtml = null;

// 异步加载 layout.html 页面结构
async function loadLayout() {
    if (_layoutHtml) return _layoutHtml;
    const res = await fetch('layout.html');
    _layoutHtml = await res.text();
    return _layoutHtml;
}

// ========================
// 初始化入口（应用启动时调用）
// ========================
export async function initUI(store, io) {
    const app = $('#app');
    app.innerHTML = await loadLayout(); // 先加载布局 HTML

    // ----- 工具栏事件绑定 -----

    // 导入 JSON
    io.setupFilePicker($('#btn-import'), json => store.loadChapter(json));

    // 导出 JSON（清洗后）
    $('#btn-export').addEventListener('click', () => {
        const clean = store.toCleanJSON();
        io.exportJSON(clean);
    });

    // 打开内容配置（template-content.json）
    $('#btn-open-content-config').addEventListener('click', () => {
        store.loadConfig('config/template-content.json').then(() => {
            $('#btn-save-config').style.display = '';
        }).catch(() => showAlert('加载配置文件失败'));
    });

    // 打开上下文配置（template-contexts.json）
    $('#btn-open-contexts-config').addEventListener('click', () => {
        store.loadConfig('config/template-contexts.json').then(() => {
            $('#btn-save-config').style.display = '';
        }).catch(() => showAlert('加载配置文件失败'));
    });

    // 保存配置文件
    $('#btn-save-config').addEventListener('click', () => {
        const name = store.saveConfig();
        if (name) showAlert('✅ 已保存到本地存储\n📥 已下载 ' + name + ' 文件\n\n请用下载的文件替换项目中的 config/' + name);
    });

    // 新建章节（弹出空白/模板选择）
    $('#btn-add-node').addEventListener('click', () => {
        showCreateDialog({
            title: '新建章节',
            blankDesc: '仅返回 {}，不添加任何字段',
            onBlank: () => store.newChapter(createBlankChapter()),
            onTemplate: () => store.loadChapter(createChapter())
        });
    });

    // 打开模板编辑弹窗
    $('#btn-edit-template').addEventListener('click', () => openTemplateEditor());

    // 打开上下文配置弹窗
    $('#btn-config').addEventListener('click', () => openConfigEditor());

    // 打开标签管理弹窗
    $('#btn-label-manager').addEventListener('click', () => openLabelManager());

    // ----- 章节名输入 -----
    $('#chapter-name').addEventListener('input', (e) => {
        store.setChapterName(e.target.value);
    });

    // ----- Tab 切换（表单模式 / JSON 模式）-----
    $$('.tab-label').forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            $$('.tab-label').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            $('#panel-form').classList.toggle('hidden', target !== 'form');
            $('#panel-json').classList.toggle('hidden', target !== 'json');
        });
    });

    // ----- 活动栏：侧面板视图切换 -----
    const VIEW_LABELS = {
        outline: '大纲',
        stats: '统计',
        settings: '设置'
    };
    let _sidePanelOpen = true;

    $$('.activity-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            const sidePanel = $('#panel-side');
            const isActive = btn.classList.contains('active');

            if (isActive && _sidePanelOpen) {
                // 收起侧面板
                sidePanel.classList.add('collapsed');
                _sidePanelOpen = false;
                btn.classList.remove('active');
                return;
            }

            // 切换视图
            $$('.activity-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            $$('.side-view').forEach(v => v.classList.add('hidden'));
            const targetView = $('#view-' + view);
            if (targetView) targetView.classList.remove('hidden');
            $('#side-panel-title').textContent = VIEW_LABELS[view] || view;

            // 展开侧面板
            sidePanel.classList.remove('collapsed');
            _sidePanelOpen = true;
        });
    });

    // 关闭侧面板按钮
    $('#btn-close-side').addEventListener('click', () => {
        $('#panel-side').classList.add('collapsed');
        _sidePanelOpen = false;
        $$('.activity-btn').forEach(b => b.classList.remove('active'));
    });

    // 双击活动栏空白区域展开大纲
    $('#activity-bar').addEventListener('dblclick', (e) => {
        if (e.target === $('#activity-bar')) {
            const outlineBtn = document.querySelector('.activity-btn[data-view="outline"]');
            if (outlineBtn) outlineBtn.click();
        }
    });

    // ----- 注册 store 变更监听（驱动全量渲染）-----
    store.onChange(() => renderAll(store));

    // ----- 右侧 JSON 预览面板 -----
    const hlCode = $('#json-highlight code');
    const editor = $('#json-editor');

    // JSON 语法高亮
    function applyHighlight(text) {
        hlCode.textContent = text;
        try {
            hlCode.innerHTML = window.hljs.highlight(text, { language: 'json' }).value;
        } catch (e) {}
    }

    // JSON 语法错误提示（编辑器底部）
    const errDiv = document.createElement('div');
    errDiv.className = 'json-error';
    editor.parentElement.appendChild(errDiv);

    function showJSONError(msg) {
        errDiv.textContent = '⚠️ ' + msg;
        errDiv.style.display = 'block';
    }
    function hideJSONError() {
        errDiv.style.display = 'none';
    }

    // 输入时实时高亮 + 校验
    editor.addEventListener('input', () => {
        applyHighlight(editor.value);
        try { JSON.parse(editor.value); hideJSONError(); }
        catch (e) { showJSONError(e.message); }
    });

    // 同步滚动（高亮层与编辑器层）
    editor.addEventListener('scroll', () => {
        $('#json-highlight').scrollTop = editor.scrollTop;
        $('#json-highlight').scrollLeft = editor.scrollLeft;
    });

    // Tab 键插入 4 个空格（代替失焦）
    editor.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = editor.selectionStart;
            const end = editor.selectionEnd;
            editor.value = editor.value.substring(0, start) + '    ' + editor.value.substring(end);
            editor.selectionStart = editor.selectionEnd = start + 4;
            // 触发 input 事件更新高亮
            editor.dispatchEvent(new Event('input'));
        }
    });

    // 失焦时格式化并保存回数据
    editor.addEventListener('blur', () => {
        try {
            const parsed = JSON.parse(editor.value);
            const formatted = JSON.stringify(parsed, null, 4);
            editor.value = formatted;
            applyHighlight(formatted);
            hideJSONError();
            const path = store.currentPath;
            if (path && path.length > 0) store.setByPath([...path], parsed);
            else if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) store.loadChapter(parsed);
            else { showJSONError('根节点必须是对象 {}'); return; }
        } catch (e) {
            showJSONError(e.message);
        }
    });

    // 格式化按钮
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
            else if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) store.loadChapter(parsed);
            else { showJSONError('根节点必须是对象 {}'); return; }
        } catch (e) {
            showJSONError(e.message);
        }
    });

    // ----- 面板分隔条拖拽 -----
    initSplitters();

    // ----- 树形搜索框 -----
    $('#tree-search').addEventListener('input', () => {
        _searchTerm = $('#tree-search').value.toLowerCase().trim();
        applyTreeSearch(_searchTerm);
    });

    // ----- 中间 Tab JSON 编辑器 -----
    const centerTa = $('#path-editor-center');
    if (centerTa) {
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
        // Tab 键插入 4 个空格
        centerTa.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = centerTa.selectionStart;
                const end = centerTa.selectionEnd;
                centerTa.value = centerTa.value.substring(0, start) + '    ' + centerTa.value.substring(end);
                centerTa.selectionStart = centerTa.selectionEnd = start + 4;
                centerTa.dispatchEvent(new Event('input'));
            }
        });
    }

    // 首次渲染
    renderAll(store);
}

// ========================
// 分隔条拖拽（调节面板宽度）
// ========================
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
            if (targetId === 'side') {
                targetPanel = $('#panel-side');
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

// ========================
// 全局渲染调度
// 选择性渲染：仅当对应数据变化时才刷新，避免不必要 DOM 操作
// ========================

let _searchTerm = '';           // 当前搜索关键词
let _editorVersion = '';        // 编辑器版本指纹（路径+字段数）
let _jsonTabVersion = '';       // JSON Tab 版本指纹（JSON 字符串长度）
let _prevChapter = null;        // 上一次渲染的章节引用（用于检测新建/切换章节）
let _prevDataVersion = -1;      // 上一次渲染的数据版本号，检测增删改操作

// 计算编辑器版本指纹
function editorVersion(store) {
    const path = store.currentPath;
    if (!path || path.length === 0) return '__root__';
    const val = store.getByPath(path);
    const keyCount = (val && typeof val === 'object' && !Array.isArray(val))
        ? Object.keys(val).length
        : (Array.isArray(val) ? val.length : 0);
    return path.join('|') + '|' + keyCount;
}

// 计算 JSON Tab 版本指纹
function jsonTabVersion(store) {
    const path = store.currentPath || [];
    const val = store.getByPath(path);
    return JSON.stringify(val).length;
}

// 全量渲染（每个 store 变更时调用）
function renderAll(store) {
    // 1. 树面板（每次都重绘，确保节点数最新）
    renderTreePanel(store);
    applyTreeSearch(_searchTerm);

    // 2. 配置保存按钮显隐
    const saveBtn = $('#btn-save-config');
    if (saveBtn) saveBtn.style.display = store._configUrl ? '' : 'none';

    // 3. 检测章节是否被整体替换或数据是否被修改，强制刷新编辑区
    if (store.chapter !== _prevChapter || store._dataVersion !== _prevDataVersion) {
        _prevChapter = store.chapter;
        _prevDataVersion = store._dataVersion;
        _editorVersion = '';
        _jsonTabVersion = '';
    }

    // 4. 编辑区（仅在切换路径或字段变化时重绘）
    const ver = editorVersion(store);
    if (ver !== _editorVersion) {
        _editorVersion = ver;
        _jsonTabVersion = '';
        renderEditor(store);
    }

    // 5. 中间 JSON Tab
    const jv = jsonTabVersion(store);
    if (jv !== _jsonTabVersion) {
        _jsonTabVersion = jv;
        updateJSONTabContent(store);
    }

    // 6. 右侧 JSON 预览
    renderJSONPreview(store);
    navigateJSONToPath(store);

    // 7. 章节名同步
    $('#chapter-name').value = store.getChapterName();
}

// ========================
// 树形面板搜索
// 支持路径前缀搜索（如 "content.0."）和关键词匹配
// ========================
function applyTreeSearch(term) {
    const rawTerm = term.trim();
    if (!rawTerm) {
        // 清除搜索状态：恢复所有行显示
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

    // 收集匹配的路径
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

    // 展开所有匹配项的祖先路径
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

    // 显示匹配项，隐藏非匹配项
    rows.forEach(row => {
        const pathArr = JSON.parse(row.dataset.path || '[]');
        const pathStr = pathArr.join('.').toLowerCase();
        if (ancestorSet.has(pathStr)) { row.style.display = ''; row.classList.remove('search-dim'); }
        else { row.style.display = 'none'; row.classList.add('search-dim'); }
    });
}

// ========================
// 树形面板渲染
// ========================
function renderTreePanel(store) {
    const container = $('#tree-container');
    if (!container) return;
    const data = store.chapter;

    // 渲染树（展开/折叠/选中/添加/删除）
    renderTree(container, data, store.currentPath,
        (path) => store.selectPath(path),
        (path, type) => store.addAt(path, type),
        (path) => { showConfirm('确定删除该节点吗？').then(ok => { if (ok) store.deleteAt(path); }); }
    );

    // 底部「新建对话节点」按钮
    let footer = container.querySelector('.tree-footer');
    if (!footer) {
        footer = document.createElement('div');
        footer.className = 'tree-footer';
        container.appendChild(footer);
    }
    const contentNodeCount = (store.chapter.content || []).length;
    footer.innerHTML = `<button class="btn btn-sm btn-success" id="tree-add-node">＋ 新建对话节点 (当前${contentNodeCount}个)</button>`;
    footer.querySelector('#tree-add-node').addEventListener('click', () => {
        showCreateDialog({
            title: '新建对话节点',
            blankLabel: '空白节点',
            blankDesc: '仅含 id 字段',
            templateLabel: '模板创建',
            templateDesc: '使用 content 模板的完整字段',
            onBlank: () => store.addBlankNode(),
            onTemplate: () => store.addNode()
        });
    });
}

// ========================
// 编辑区渲染（中间面板的表单模式）
// ========================
function renderEditor(store) {
    const path = store.currentPath || [];
    const val = store.getByPath(path);
    const pathLabel = path.length === 0 ? '(root)' : path.join(' → ');

    let formHtml = `<div class="editor-header"><h3>${esc(pathLabel)}</h3></div>`;

    if (val === null || val === undefined) {
        formHtml += '<div class="empty-hint">null</div>';
    } else if (typeof val !== 'object') {
        // 基本类型：直接显示输入框
        formHtml += `<div class="field-row"><label>值</label><input class="input form-simple-value" data-pathkey="${esc(path.join('|'))}" value="${esc(String(val))}" /></div>`;
    } else {
        const entries = Array.isArray(val) ? val.map((item, i) => [String(i), item]) : Object.entries(val);
        const rows = entries.map(([key, v]) => renderFormField(key, v, path, store)).join('');

        if (Array.isArray(val)) {
            // 数组类型：显示添加元素的控件
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
            // 对象类型：显示字段列表
            formHtml += `<div class="editor-fields">${rows}</div>`;
            if (val !== null) formHtml += `<div class="array-add-bar"><select id="obj-add-type" class="input-sm" style="width:auto">
                <option value="string">字符串 ""</option>
                <option value="number">数字 0</option>
                <option value="array">空数组 []</option>
                <option value="object">空对象 {}</option></select>
                <button id="btn-add-field" class="btn btn-sm btn-success">＋ 添加属性</button></div>`;
        }

        // 如果当前路径是对话节点，额外渲染选项编辑区
        if (path.length === 2 && path[0] === 'content' && val.options) {
            formHtml += `<div class="editor-options">${renderOptions(val, store)}</div>`;
        }
    }

    $('#panel-form').innerHTML = formHtml;

    // 绑定事件
    bindFormInputs(path, val, store);
    if (path.length === 2 && path[0] === 'content' && val && val.options) bindOptionButtons(val, store);
    bindLabelEdit();

    // 添加属性按钮（含类型选择）
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

    // 删除字段按钮（支持嵌套路径）
    $$('.btn-del-field').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const key = btn.dataset.delKey;
            // 优先从最近的 field-row 读取 parentpath，否则用当前 path
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

// ========================
// 中间 Tab 的 JSON 同步
// ========================
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

// ========================
// 表单字段渲染
// 根据值的类型（基本类型/双语/数组/对象）渲染不同的 UI
// ========================
function renderFormField(key, v, parentPath, store) {
    const labelText = key;
    const customLabel = getFieldLabel(key);
    const labelHtml = customLabel !== key
        ? `<label class="editable-label field-label" data-key="${key}" title="双击编辑标签 · 显示名: ${esc(customLabel)}">${esc(labelText)}<span class="field-label-alias">${esc(customLabel)}</span></label>`
        : `<label class="editable-label field-label" data-key="${key}" title="双击编辑标签">${esc(labelText)}</label>`;
    const childPath = [...parentPath, key];
    const parentPathStr = esc(parentPath.join('|'));
    const fieldAttr = `data-field="${key}" data-parentpath="${parentPathStr}"`;

    // null/undefined
    if (v === null || v === undefined) {
        return `<div class="field-row field-row-null" ${fieldAttr}>${labelHtml}<span class="type-badge type-nil">nil</span><input class="input form-field" data-field="${key}" value="" placeholder="null" /><button class="btn-icon btn-del-field" data-del-key="${key}" title="删除属性">✕</button></div>`;
    }
    // 双语 { zh, en }（可能还有其他额外属性）
    if (typeof v === 'object' && !Array.isArray(v) && v.zh !== undefined && v.en !== undefined) {
        let extraHtml = '';
        const extraKeys = Object.keys(v).filter(k => k !== 'zh' && k !== 'en');
        if (extraKeys.length > 0) {
            extraHtml = `<div class="i18n-extra">${extraKeys.map(ek => {
                const ev = v[ek];
                if (ev === null || ev === undefined) {
                    return `<div class="field-row field-row-null" data-field="${ek}" data-parentpath="${esc(childPath.join('|'))}">
                        <label class="field-label">${esc(ek)}</label>
                        <span class="type-badge type-nil">nil</span>
                        <button class="btn-icon btn-del-field" data-del-key="${ek}" title="删除属性">✕</button>
                    </div>`;
                }
                return `<div class="field-row" data-field="${ek}" data-parentpath="${esc(childPath.join('|'))}">
                    <label class="field-label">${esc(ek)}</label>
                    <span class="type-badge type-${typeof ev === 'number' ? 'num' : Array.isArray(ev) ? 'arr' : typeof ev === 'object' && ev !== null ? 'obj' : 'str'}">${typeof ev === 'number' ? 'num' : Array.isArray(ev) ? 'arr' : typeof ev === 'object' && ev !== null ? 'obj' : 'str'}</span>
                    <input class="input form-field" data-field="${ek}" value="${esc(String(ev))}" />
                    <button class="btn-icon btn-del-field" data-del-key="${ek}" title="删除属性">✕</button>
                </div>`;
            }).join('')}</div>`;
        }
        return `<div class="field-row field-row-i18n" ${fieldAttr}>${labelHtml}<span class="type-badge type-i18n">i18n</span><div class="i18n-group"><input class="input form-i18n-zh" data-field="${key}" value="${esc(v.zh || '')}" placeholder="zh" /><input class="input form-i18n-en" data-field="${key}" value="${esc(v.en || '')}" placeholder="en" /></div><button class="btn-icon btn-del-field" data-del-key="${key}" title="删除属性">✕</button></div>${extraHtml}`;
    }
    // 数组（摘要 + 跳转按钮）
    if (Array.isArray(v)) {
        const pathKey = childPath.join('|');
        return `<div class="field-row field-row-arr" ${fieldAttr}>${labelHtml}<span class="type-badge type-arr">arr[${v.length}]</span><span class="nested-preview">${esc(JSON.stringify(v.slice(0,3)))}${v.length > 3 ? '...' : ''}</span><button class="btn-jump" data-pathkey="${pathKey}">跳转</button><button class="btn-icon btn-del-field" data-del-key="${key}" title="删除属性">✕</button></div>`;
    }
    // 对象（摘要 + 跳转按钮）
    if (typeof v === 'object' && v !== null) {
        const pathKey = childPath.join('|');
        return `<div class="field-row field-row-obj" ${fieldAttr}>${labelHtml}<span class="type-badge type-obj">obj{${Object.keys(v).length}}</span><span class="nested-preview">${esc(JSON.stringify(v).slice(0,40))}</span><button class="btn-jump" data-pathkey="${pathKey}">跳转</button><button class="btn-icon btn-del-field" data-del-key="${key}" title="删除属性">✕</button></div>`;
    }
    // 基本类型
    const typeLabel = typeof v === 'number' ? 'num' : 'str';
    const strVal = v === null || v === undefined ? '' : String(v);
    const rowCls = typeof v === 'number' ? 'field-row-num' : '';
    return `<div class="field-row ${rowCls}" ${fieldAttr}>${labelHtml}<span class="type-badge type-${typeLabel}">${typeLabel}</span><input class="input form-field" data-field="${key}" value="${esc(strVal)}" /><button class="btn-icon btn-del-field" data-del-key="${key}" title="删除属性">✕</button></div>`;
}

// ========================
// 选项编辑区渲染
// 每个选项含：双语文本、跳转ID、动作列表
// ========================
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

// ========================
// 表单输入事件绑定
// ========================
function bindFormInputs(path, val, store) {
    // 简单值（基本类型顶层字段）
    $('.form-simple-value')?.addEventListener('input', (e) => {
        const pathStr = e.target.dataset.pathkey;
        if (!pathStr) return;
        const p = pathStr.split('|');
        store.setByPath(p, e.target.value);
    });

    // 普通字段输入
    $$('.form-field').forEach(inp => {
        inp.addEventListener('input', () => {
            const obj = store.getByPath(path);
            if (obj && typeof obj === 'object') obj[inp.dataset.field] = inp.value;
            store._emit();
        });
    });

    // i18n 双语字段输入
    $$('.form-i18n-zh').forEach(inp => {
        inp.addEventListener('input', () => {
            const obj = store.getByPath(path);
            if (obj && typeof obj === 'object' && obj[inp.dataset.field]) obj[inp.dataset.field].zh = inp.value;
            store._emit();
        });
    });

    $$('.form-i18n-en').forEach(inp => {
        inp.addEventListener('input', () => {
            const obj = store.getByPath(path);
            if (obj && typeof obj === 'object' && obj[inp.dataset.field]) obj[inp.dataset.field].en = inp.value;
            store._emit();
        });
    });

    // 跳转按钮：点击跳转到对应的嵌套路径
    $$('.btn-jump').forEach(btn => {
        btn.addEventListener('click', () => {
            const p = btn.dataset.pathkey.split('|').map(s => isNaN(s) ? s : Number(s));
            store.selectPath(p);
        });
    });
}

// ========================
// 选项操作按钮事件绑定
// ========================
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

// ========================
// 字段标签双击改名
// ========================
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
                            // 先更新路径，再改名，最后触发重绘
                            if (store.currentPath.includes(oldKey)) {
                                store.currentPath = store.currentPath.map(s => s === oldKey ? newKey : s);
                            }
                            parent[newKey] = parent[oldKey];
                            delete parent[oldKey];
                            store.setByPath(parentPath, parent);
                        }
                    }
                } else {
                    const lbl = document.createElement('label');
                    lbl.className = 'editable-label field-label';
                    lbl.dataset.key = oldKey;
                    lbl.textContent = current;
                    lbl.title = '双击编辑标签';
                    lbl.addEventListener('dblclick', handler);
                    input.replaceWith(lbl);
                }
            }
            input.addEventListener('blur', finish);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
                if (e.key === 'Escape') { input.value = current; input.blur(); }
            });
        };
        label.addEventListener('dblclick', handler);
    });
}

// ========================
// 右侧 JSON 预览渲染
// ========================
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

// 根据路径自动滚动到 JSON 预览的对应位置
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

// ========================
// 配置编辑弹窗
// 允许用户编辑 template-contexts.json 的配置
// ========================
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
    makeModalDraggable(modal);
    // Enter 键触发保存
    modal.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && document.activeElement?.tagName === 'INPUT') {
            e.preventDefault();
            const saveBtn = document.getElementById('btn-config-save');
            if (saveBtn) saveBtn.click();
        }
    });

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
    }

    // 保存按钮
    document.getElementById('btn-config-save').addEventListener('click', () => {
        try {
            saveConfigToLocal(JSON.parse(editor.value));
            document.getElementById('modal-config-editor').classList.remove('open');
            store._emit();
        } catch (e) { showAlert('JSON 格式有误：' + e.message); }
    });

    // 导出按钮
    document.getElementById('btn-config-export').addEventListener('click', () => {
        try { JSON.parse(editor.value); exportConfigJSON(); }
        catch (e) { showAlert('JSON 格式有误'); }
    });

    // 关闭
    const close = () => {
        modal.classList.remove('open');
        setTimeout(() => { if (modal.parentNode) modal.parentNode.removeChild(modal); }, 200);
    };
    document.getElementById('btn-config-close').addEventListener('click', close);
    document.getElementById('btn-config-close-bottom').addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
}

// ========================
// 工具函数
// ========================

// HTML 转义
function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// 防抖
function debounce(fn, delay) {
    let timer;
    return function (...args) { clearTimeout(timer); timer = setTimeout(() => fn.apply(this, args), delay); };
}

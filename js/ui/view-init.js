// ==========================================
// init.js — 界面初始化入口
// 工具栏、Tab切换、活动栏、渲染调度、右侧 JSON 预览
// ==========================================

import { createChapter, createBlankChapter } from '../logic/svc-storyTypes.js';
import { renderTree } from './view-storyTree.js';
import { openTemplateEditor } from './view-storyTemplateUI.js';
import { openLabelManager } from './view-labelManager.js';
import { showCreateDialog } from './view-createDialog.js';
import { showAlert, showConfirm } from './view-modalDialog.js';
import { renderChapterView } from './view-chapterView.js';
import { renderEditor, updateJSONTabContent } from './view-editorForm.js';
import { openConfigEditor } from './view-configDialog.js';
import { store } from '../logic/svc-storyStore.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

let _layoutHtml = null;

async function loadLayout() {
    if (_layoutHtml) return _layoutHtml;
    const res = await fetch('layout.html');
    _layoutHtml = await res.text();
    return _layoutHtml;
}

// ===== 渲染状态 =====

let _searchTerm = '';
let _editorVersion = '';
let _jsonTabVersion = '';
let _prevChapter = null;
let _prevDataVersion = -1;

function editorVersion(store) {
    const path = store.currentPath;
    if (!path || path.length === 0) return '__root__';
    const val = store.getByPath(path);
    const keyCount = (val && typeof val === 'object' && !Array.isArray(val)) ? Object.keys(val).length : (Array.isArray(val) ? val.length : 0);
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

    if (store.chapter !== _prevChapter || store._dataVersion !== _prevDataVersion) {
        _prevChapter = store.chapter;
        _prevDataVersion = store._dataVersion;
        _editorVersion = '';
        _jsonTabVersion = '';
    }

    const ver = editorVersion(store);
    if (ver !== _editorVersion) { _editorVersion = ver; _jsonTabVersion = ''; renderEditor(store); }

    const jv = jsonTabVersion(store);
    if (jv !== _jsonTabVersion) { _jsonTabVersion = jv; updateJSONTabContent(store); }

    renderJSONPreview(store);
    navigateJSONToPath(store);

    const nameInput = $('#chapter-name');
    if (nameInput) nameInput.value = store.getChapterName();
}

// ===== 树形面板渲染 =====

function renderTreePanel(store) {
    const container = $('#tree-container');
    if (!container) return;
    const data = store.chapter;
    renderTree(container, data, store.currentPath,
        (path) => store.selectPath(path),
        (path, type) => store.addAt(path, type),
        (path) => { showConfirm('确定删除该节点吗？').then(ok => { if (ok) store.deleteAt(path); }); }
    );

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
            title: '新建对话节点', blankLabel: '空白节点', blankDesc: '仅含 id 字段',
            templateLabel: '模板创建', templateDesc: '使用 content 模板的完整字段',
            onBlank: () => store.addBlankNode(), onTemplate: () => store.addNode()
        });
    });
}

// ===== 树形搜索 =====

function applyTreeSearch(term) {
    const rawTerm = term.trim();
    if (!rawTerm) {
        $$('.tree-row').forEach(r => { r.style.display = ''; r.classList.remove('search-dim'); });
        $$('.tree-children').forEach(c => { if (c._wasExpanded !== undefined) { c.style.display = c._wasExpanded; delete c._wasExpanded; } });
        return;
    }
    const lowerTerm = rawTerm.toLowerCase();
    const dotIdx = rawTerm.lastIndexOf('.');
    let scopePath = '', keyPattern = lowerTerm;
    if (dotIdx >= 0) { scopePath = rawTerm.slice(0, dotIdx).toLowerCase(); keyPattern = rawTerm.slice(dotIdx + 1).toLowerCase(); }

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
    for (const matchedPath of matchSet) { const segs = matchedPath.split('.'); for (let i = 0; i < segs.length; i++) ancestorSet.add(segs.slice(0, i + 1).join('.')); }

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
        else { row.style.display = 'none'; }
    });
}

// ===== 右侧 JSON 预览渲染 =====

function renderJSONPreview(store) {
    const val = store.getByPath(store.currentPath || []);
    const jsonStr = JSON.stringify(val, null, 4);
    const editor = $('#json-editor');
    if (editor && document.activeElement !== editor) {
        editor.value = jsonStr;
        const hlCode = $('#json-highlight code');
        if (window.hljs && hlCode) { try { hlCode.innerHTML = window.hljs.highlight(jsonStr, { language: 'json' }).value; } catch (e) { hlCode.textContent = jsonStr; } }
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
    const before = fullStr.substring(0, idx);
    const lines = before.split('\n').length - 1;
    const lineHeight = parseFloat(getComputedStyle(editor).lineHeight) || 20;
    editor.scrollTop = Math.max(0, (lines - 3) * lineHeight);
}

// ===== 入口 =====

export async function initUI(store, io) {
    const app = $('#app');
    app.innerHTML = await loadLayout();

    // 工具栏
    io.setupFilePicker($('#btn-import'), json => store.loadChapter(json));
    $('#btn-export').addEventListener('click', () => { const clean = store.toCleanJSON(); io.exportJSON(clean); });
    $('#btn-open-content-config').addEventListener('click', () => { store.loadConfig('config/template-content.json').then(() => { $('#btn-save-config').style.display = ''; }).catch(() => showAlert('加载配置文件失败')); });
    $('#btn-open-contexts-config').addEventListener('click', () => { store.loadConfig('config/template-contexts.json').then(() => { $('#btn-save-config').style.display = ''; }).catch(() => showAlert('加载配置文件失败')); });
    $('#btn-save-config').addEventListener('click', () => { const name = store.saveConfig(); if (name) showAlert('✅ 已保存到本地存储\n📥 已下载 ' + name + ' 文件\n\n请用下载的文件替换项目中的 config/' + name); });
    $('#btn-add-node').addEventListener('click', () => { showCreateDialog({ title: '新建章节', blankDesc: '仅返回 {}，不添加任何字段', onBlank: () => store.newChapter(createBlankChapter()), onTemplate: () => store.loadChapter(createChapter()) }); });
    $('#btn-edit-template').addEventListener('click', () => openTemplateEditor());
    $('#btn-config').addEventListener('click', () => openConfigEditor());
    $('#btn-label-manager').addEventListener('click', () => openLabelManager());

    // 章节名
    $('#chapter-name').addEventListener('input', (e) => store.setChapterName(e.target.value));

    // Tab 切换
    $$('.tab-label').forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            $$('.tab-label').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            $('#panel-form').classList.toggle('hidden', target !== 'form');
            $('#panel-chapter').classList.toggle('hidden', target !== 'chapter');
            $('#panel-json').classList.toggle('hidden', target !== 'json');
            if (target === 'chapter') renderChapterView(store);
        });
    });

    // 活动栏
    const VIEW_LABELS = { outline: '大纲', stats: '统计', settings: '设置' };
    let _sidePanelOpen = true;
    $$('.activity-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            const sidePanel = $('#panel-side');
            const isActive = btn.classList.contains('active');
            if (isActive && _sidePanelOpen) { sidePanel.classList.add('collapsed'); _sidePanelOpen = false; btn.classList.remove('active'); return; }
            $$('.activity-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            $$('.side-view').forEach(v => v.classList.add('hidden'));
            const targetView = $('#view-' + view);
            if (targetView) targetView.classList.remove('hidden');
            $('#side-panel-title').textContent = VIEW_LABELS[view] || view;
            sidePanel.classList.remove('collapsed');
            _sidePanelOpen = true;
        });
    });
    $('#btn-close-side').addEventListener('click', () => { $('#panel-side').classList.add('collapsed'); _sidePanelOpen = false; $$('.activity-btn').forEach(b => b.classList.remove('active')); });
    $('#activity-bar').addEventListener('dblclick', (e) => { if (e.target === $('#activity-bar')) { const outlineBtn = document.querySelector('.activity-btn[data-view="outline"]'); if (outlineBtn) outlineBtn.click(); } });

    // store 监听
    store.onChange(() => {
        renderAll(store);
        if ($('#tab-chapter')?.classList.contains('active')) renderChapterView(store);
    });

    // 右侧 JSON 预览面板
    const hlCode = $('#json-highlight code');
    const editor = $('#json-editor');

    function applyHighlight(text) {
        hlCode.textContent = text;
        try { hlCode.innerHTML = window.hljs.highlight(text, { language: 'json' }).value; } catch (e) {}
    }

    const errDiv = document.createElement('div');
    errDiv.className = 'json-error';
    editor.parentElement.appendChild(errDiv);

    function showJSONError(msg) { errDiv.textContent = '⚠️ ' + msg; errDiv.style.display = 'block'; }
    function hideJSONError() { errDiv.style.display = 'none'; }

    editor.addEventListener('input', () => {
        applyHighlight(editor.value);
        try { JSON.parse(editor.value); hideJSONError(); } catch (e) { showJSONError(e.message); }
    });
    editor.addEventListener('scroll', () => { $('#json-highlight').scrollTop = editor.scrollTop; $('#json-highlight').scrollLeft = editor.scrollLeft; });
    editor.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = editor.selectionStart, end = editor.selectionEnd;
            editor.value = editor.value.substring(0, start) + '    ' + editor.value.substring(end);
            editor.selectionStart = editor.selectionEnd = start + 4;
            editor.dispatchEvent(new Event('input'));
        }
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
            else if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) store.loadChapter(parsed);
            else { showJSONError('根节点必须是对象 {}'); return; }
        } catch (e) { showJSONError(e.message); }
    });

    $('#btn-format-json').addEventListener('click', () => {
        try {
            const parsed = JSON.parse(editor.value);
            const formatted = JSON.stringify(parsed, null, 4);
            editor.value = formatted;
            if (hlCode) { hlCode.textContent = formatted; if (window.hljs) { try { hlCode.innerHTML = window.hljs.highlight(formatted, { language: 'json' }).value; } catch (e) {} } }
            hideJSONError();
            const path = store.currentPath;
            if (path && path.length > 0) store.setByPath([...path], parsed);
            else if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) store.loadChapter(parsed);
            else { showJSONError('根节点必须是对象 {}'); return; }
        } catch (e) { showJSONError(e.message); }
    });

    // 分隔条
    initSplitters();

    // 搜索
    $('#tree-search').addEventListener('input', () => { _searchTerm = $('#tree-search').value.toLowerCase().trim(); applyTreeSearch(_searchTerm); });

    // 中间 JSON Tab
    const centerTa = $('#path-editor-center');
    if (centerTa) {
        const centerErr = document.createElement('div');
        centerErr.className = 'json-error';
        centerTa.parentElement.appendChild(centerErr);
        centerTa.addEventListener('input', () => {
            const text = centerTa.value;
            const hlPre = $('#path-mirror-center code');
            if (window.hljs && hlPre) { try { hlPre.innerHTML = window.hljs.highlight(text, { language: 'json' }).value; } catch (e) { hlPre.textContent = text; } }
            try { const parsed = JSON.parse(text); const path = store.currentPath; if (path && path.length > 0) store.setByPath([...path], parsed); centerErr.style.display = 'none'; }
            catch (e) { centerErr.textContent = '⚠️ ' + e.message; centerErr.style.display = ''; }
        });
        centerTa.addEventListener('scroll', () => { const preEl = $('#path-mirror-center pre'); if (preEl) { preEl.scrollTop = centerTa.scrollTop; preEl.scrollLeft = centerTa.scrollLeft; } });
        centerTa.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = centerTa.selectionStart, end = centerTa.selectionEnd;
                centerTa.value = centerTa.value.substring(0, start) + '    ' + centerTa.value.substring(end);
                centerTa.selectionStart = centerTa.selectionEnd = start + 4;
                centerTa.dispatchEvent(new Event('input'));
            }
        });
    }

    renderAll(store);
}

// ===== 分隔条 =====

function initSplitters() {
    $$('.splitter').forEach(splitter => {
        let dragging = false, startX = 0, startW = 0, sign = 1, targetPanel = null;
        splitter.addEventListener('mousedown', (e) => {
            dragging = true; startX = e.clientX;
            targetPanel = splitter.dataset.target === 'side' ? $('#panel-side') : $('#panel-right');
            sign = splitter.dataset.target === 'side' ? 1 : -1;
            if (targetPanel) startW = targetPanel.getBoundingClientRect().width;
            splitter.classList.add('dragging');
            document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none';
            e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => { if (!dragging || !targetPanel) return; const delta = (e.clientX - startX) * sign; targetPanel.style.width = Math.max(180, startW + delta) + 'px'; targetPanel.style.flex = 'none'; });
        document.addEventListener('mouseup', () => { if (!dragging) return; dragging = false; splitter.classList.remove('dragging'); document.body.style.cursor = ''; document.body.style.userSelect = ''; });
    });
}

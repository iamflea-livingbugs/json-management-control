// ==========================================
// init.js — 界面初始化入口
// 工具栏、Tab切换、渲染调度、右侧 JSON 预览
// 侧面板切换已移至 App.vue（Vue 驱动）
// ==========================================

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap'
import '../../css/style.css'

import { createCurJson, createBlankCurJson } from '../logic/logic-storyTypes.js';
import { openTemplateEditor } from './ui-storyTemplateUI.js';
import { openLabelManager } from './ui-labelManager.js';
import { showCreateDialog } from '../../components/base_reusable/useCreateDialog.js';
import { showAlert } from '../../components/base/useDialog.js';
import { setFileName } from '../logic/logic-autoSave.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

export function initUI(store, io) {
    // 应用已保存的显示设置（字体、色彩）
    import('./ui-settingsPanel.js').then(m => m.initSettings());

    // 工具栏
    io.setupFilePicker($('#btn-import'), json => store.loadCurJson(json), (msg) => showAlert(msg));
    $('#btn-export').addEventListener('click', () => { const clean = store.toCleanJSON(); io.exportJSON(clean, store.getCurJsonName() + '.json'); });
    $('#btn-add-node').addEventListener('click', () => { showCreateDialog({ title: '新建章节', blankDesc: '仅返回 {}，不添加任何字段', onBlank: () => store.newCurJson(createBlankCurJson()), onTemplate: () => store.loadCurJson(createCurJson()) }); });
    $('#btn-edit-template').addEventListener('click', () => openTemplateEditor());
    $('#btn-label-manager').addEventListener('click', () => openLabelManager());

    // 章节名
    $('#curjson-name').addEventListener('input', (e) => {
        store.setCurJsonName(e.target.value);
        setFileName((e.target.value || 'Untitled') + '.json');
    });

    // 分隔条（拖拽调整面板宽度）
    initSplitters();
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
            if (targetPanel) targetPanel.classList.add('no-transition');
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
            dragging = false; splitter.classList.remove('dragging');
            document.body.style.cursor = ''; document.body.style.userSelect = '';
            if (targetPanel) targetPanel.classList.remove('no-transition');
            targetPanel = null;
        });
    });
}

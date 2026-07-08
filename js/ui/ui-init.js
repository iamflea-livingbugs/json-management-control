// ==========================================
// init.js — 界面初始化入口
// 工具栏、Tab切换、活动栏、渲染调度、右侧 JSON 预览
// ==========================================

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap'
import '../../css/style.css'

import { createCurJson, createBlankCurJson } from '../logic/logic-storyTypes.js';
import { openTemplateEditor } from './ui-storyTemplateUI.js';
import { openLabelManager } from './ui-labelManager.js';
import { showCreateDialog } from '../../components/base_reusable/useCreateDialog.js';
import { showAlert } from '../../components/base/useDialog.js';
import { store } from '../logic/logic-storyStore.js';
import { setFileName } from '../logic/logic-autoSave.js';
import { initSettings } from './ui-settingsPanel.js';
import { createApp } from 'vue'
import SettingsPanel from '../../components/Settings/SettingsPanel.vue'

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

    // 活动栏
    const VIEW_LABELS = { outline: '大纲', stats: '统计', settings: '设置' };
    let _sidePanelOpen = true;

    function collapseSidePanel() {
        const sidePanel = $('#panel-side');
        // 保存当前宽度到元素属性，清内联样式让 transition 生效
        sidePanel.dataset.savedWidth = sidePanel.style.width || (sidePanel.getBoundingClientRect().width + 'px');
        sidePanel.style.width = '';
        sidePanel.style.flex = '';
        sidePanel.classList.add('collapsed');
        _sidePanelOpen = false;
    }

    function expandSidePanel(view) {
        const sidePanel = $('#panel-side');
        sidePanel.classList.remove('collapsed');
        // 恢复之前保存的宽度
        const w = sidePanel.dataset.savedWidth;
        if (w) {
            sidePanel.style.width = w;
            sidePanel.style.flex = 'none';
        }
        $$('.side-view').forEach(v => v.classList.add('hidden'));
        const targetView = $('#view-' + view);
        if (targetView) targetView.classList.remove('hidden');
        $('#side-panel-title').textContent = VIEW_LABELS[view] || view;
        _sidePanelOpen = true;
    }

    let _settingsApp = null

    // 监听 Vue 活动栏发出的自定义事件
    const activityBarEl = $('#activity-bar')
    if (activityBarEl) {
        activityBarEl.addEventListener('activity-change', (e) => {
            const { view, action } = e.detail
            if (action === 'collapse') {
                collapseSidePanel()
                return
            }
            // action === 'switch'
            expandSidePanel(view)
            if (view === 'settings') {
                const container = document.querySelector('#view-settings .side-view-content')
                if (container) {
                    if (_settingsApp) { _settingsApp.unmount(); _settingsApp = null }
                    _settingsApp = createApp(SettingsPanel)
                    _settingsApp.mount(container)
                }
            }
        })

        activityBarEl.addEventListener('dblclick', (e) => {
            if (e.target === activityBarEl) {
                // 派发 outline 按钮的点击事件
                activityBarEl.dispatchEvent(new CustomEvent('activity-change', {
                    detail: { view: 'outline', action: 'switch' },
                    bubbles: true
                }))
            }
        })
    }

    $('#btn-close-side').addEventListener('click', () => {
        collapseSidePanel();
    });

    // 分隔条
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
            // 拖拽时禁用过渡
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
            // 恢复过渡
            if (targetPanel) targetPanel.classList.remove('no-transition');
            targetPanel = null;
        });
    });
}

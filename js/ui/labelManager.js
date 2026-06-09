// ==========================================
// labelManager.js — 字段标签管理弹窗
// 查看和编辑所有字段的自定义显示名（标签翻译）
// ==========================================

import { NODE_FIELDS, loadLabels, saveLabel } from '../base/storyTypes.js';
import { showConfirm, makeModalDraggable } from './modalDialog.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

export function openLabelManager() {
    // 如果已打开，直接激活
    const existing = document.getElementById('modal-label-manager');
    if (existing) { existing.classList.add('open'); return; }

    const modal = document.createElement('div');
    modal.id = 'modal-label-manager';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-box" style="width:520px">
            <div class="modal-header">
                <h2>🏷️ 字段标签管理</h2>
                <button class="modal-close" id="btn-label-close">✕</button>
            </div>
            <div class="modal-body" id="label-manager-body">
                <div class="label-manager-hint">在此管理字段的显示名称。修改后表单编辑器和模板中会显示你设置的名字，原始键名不变。</div>
                <div id="label-manager-list"></div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-sm" id="btn-label-reset">重置全部</button>
                <button class="btn btn-sm btn-primary" id="btn-label-close-bottom">关闭</button>
            </div>
        </div>`;

    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('open'));
    makeModalDraggable(modal);

    renderLabelList();

    // 关闭
    const close = () => {
        modal.classList.remove('open');
        setTimeout(() => { if (modal.parentNode) modal.parentNode.removeChild(modal); }, 200);
    };
    $('#btn-label-close').addEventListener('click', close);
    $('#btn-label-close-bottom').addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

    // 重置全部
    $('#btn-label-reset').addEventListener('click', async () => {
        const ok = await showConfirm('确定重置所有字段标签为默认值吗？');
        if (ok) {
            localStorage.removeItem('storyeditor_labels');
            renderLabelList();
        }
    });
}

function renderLabelList() {
    const container = $('#label-manager-list');
    if (!container) return;
    const custom = loadLabels();

    // 收集所有需要展示的字段：内置字段 + 用户自定义字段
    const allKeys = new Set();
    NODE_FIELDS.forEach(f => allKeys.add(f.key));
    Object.keys(custom).forEach(k => allKeys.add(k));

    let html = '<div class="label-manager-table">';
    allKeys.forEach(key => {
        const def = NODE_FIELDS.find(f => f.key === key);
        const defaultLabel = def ? def.label : '';
        const customLabel = custom[key] || '';
        html += `<div class="label-manager-row">
            <div class="label-mgr-key">${esc(key)}</div>
            <div class="label-mgr-default">${esc(defaultLabel)}</div>
            <input class="input input-sm label-mgr-input" data-key="${esc(key)}" value="${esc(customLabel)}" placeholder="自定义名称（留空=默认）" />
        </div>`;
    });
    html += '</div>';
    container.innerHTML = html;

    // 绑定输入事件，实时保存
    $$('.label-mgr-input').forEach(inp => {
        inp.addEventListener('input', () => {
            const key = inp.dataset.key;
            const val = inp.value.trim();
            if (val) saveLabel(key, val);
            else {
                // 清除自定义标签
                const all = loadLabels();
                delete all[key];
                localStorage.setItem('storyeditor_labels', JSON.stringify(all));
            }
        });
    });
}

function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ==========================================
// labelManager.js — 字段标签管理弹窗
// 查看和编辑所有字段的自定义显示名（标签翻译）
// ==========================================

import { loadLabels, saveLabel } from '../logic/logic-storyTypes.js';
import { store } from '../logic/logic-storyStore.js';
import { showConfirm, showPrompt } from '../../components/base/useDialog.js';
import { makeModalDraggable } from './ui-modalDialog.js';

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
                <button class="btn btn-sm btn-success" id="btn-label-add">＋ 添加自定义标签</button>
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

    // 添加自定义标签
    $('#btn-label-add').addEventListener('click', async () => {
        const key = await showPrompt('请输入新字段的键名（英文）:', 'new_field');
        if (!key) return;
        const label = await showPrompt(`请输入 "${key}" 的显示名称:`);
        if (!label) return;
        saveLabel(key, label);
        store._emit();
        renderLabelList();
    });

    // 重置全部
    $('#btn-label-reset').addEventListener('click', async () => {
        const ok = await showConfirm('确定重置所有字段标签为默认值吗？');
        if (ok) {
            localStorage.removeItem('storyeditor_labels');
            store._emit();
            renderLabelList();
        }
    });
}

function renderLabelList() {
    const container = $('#label-manager-list');
    if (!container) return;
    const custom = loadLabels();
    const keys = Object.keys(custom);

    if (keys.length === 0) {
        container.innerHTML = '<div class="empty-hint" style="padding:24px 0">暂无自定义标签，点击下方 "＋ 添加自定义标签" 创建。</div>';
        return;
    }

    let html = '<div class="label-manager-table">';
    keys.forEach(key => {
        const label = custom[key] || '';
        html += `<div class="label-manager-row">
            <div class="label-mgr-key">${esc(key)}</div>
            <input class="input input-sm label-mgr-input" data-key="${esc(key)}" value="${esc(label)}" placeholder="显示名称" />
            <button class="btn-icon btn-label-del" data-key="${esc(key)}" title="删除此标签">✕</button>
        </div>`;
    });
    html += '</div>';
    container.innerHTML = html;

    // 绑定输入事件
    $$('.label-mgr-input').forEach(inp => {
        inp.addEventListener('input', () => {
            const key = inp.dataset.key;
            const val = inp.value.trim();
            if (val) saveLabel(key, val);
            else {
                const all = loadLabels();
                delete all[key];
                localStorage.setItem('storyeditor_labels', JSON.stringify(all));
            }
            store._emit();
        });
    });

    // 删除自定义标签
    $$('.btn-label-del').forEach(btn => {
        btn.addEventListener('click', async () => {
            const key = btn.dataset.key;
            const ok = await showConfirm(`确定删除字段 "${key}" 的标签吗？`);
            if (!ok) return;
            const all = loadLabels();
            delete all[key];
            localStorage.setItem('storyeditor_labels', JSON.stringify(all));
            store._emit();
            renderLabelList();
        });
    });
}

function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

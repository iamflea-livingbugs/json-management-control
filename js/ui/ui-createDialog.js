// ==========================================
// createDialog.js — 新建选择弹窗
// 在新建章节/节点时弹出，让用户选择：
//   - 空白 JSON：最简结构
//   - 模板创建：使用当前模板配置
// ==========================================

let _activeModal = null; // 当前打开的弹窗实例（防止多个叠加）

import { makeModalDraggable } from './ui-modalDialog.js';
import { getContextKeys, getContextsConfig } from '../logic/logic-storyTypes.js';

/**
 * 打开新建选择弹窗
 * @param {Object} options
 * @param {string} options.title       - 弹窗标题，如"新建章节"
 * @param {string} options.blankLabel  - 空白按钮标签，默认"空白 JSON"
 * @param {string} options.blankDesc   - 空白按钮描述
 * @param {string} options.templateLabel - 模板按钮标签，默认"模板创建"
 * @param {string} options.templateDesc  - 模板按钮描述
 * @param {Function} options.onBlank   - 选择空白时的回调
 * @param {Function} options.onTemplate - 选择模板时的回调
 * @param {Function} options.onCancel  - 取消时的回调
 */
export function showCreateDialog(options) {
    // 先关闭已有弹窗，防止重复
    closeCreateDialog();

    const {
        title = '新建',
        blankLabel = '空白 JSON',
        blankDesc = '最简结构，无多余字段',
        templateLabel = '模板创建',
        templateDesc = '使用当前配置的模板结构',
        onBlank,
        onTemplate,
        onCancel
    } = options;

    // 构建弹窗 DOM
    const modal = document.createElement('div');
    modal.id = 'modal-create-dialog';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-box" style="width:480px">
            <div class="modal-header">
                <h2>${esc(title)}</h2>
                <button class="modal-close" id="btn-create-close">✕</button>
            </div>
            <div class="modal-body">
                <div class="create-choices">
                    <!-- 空白 JSON 卡片 -->
                    <div class="create-choice-card" id="choice-blank">
                        <div class="create-choice-icon">📄</div>
                        <div class="create-choice-label">${esc(blankLabel)}</div>
                        <div class="create-choice-desc">${esc(blankDesc)}</div>
                    </div>
                    <!-- 模板创建卡片 -->
                    <div class="create-choice-card" id="choice-template">
                        <div class="create-choice-icon">📋</div>
                        <div class="create-choice-label">${esc(templateLabel)}</div>
                        <div class="create-choice-desc">${esc(templateDesc)}</div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-sm" id="btn-create-cancel">取消</button>
            </div>
        </div>`;

    document.body.appendChild(modal);
    _activeModal = modal;
    // 下一帧添加 open 类以触发 CSS 过渡动画
    requestAnimationFrame(() => modal.classList.add('open'));
    makeModalDraggable(modal);

    // ----- 关闭逻辑 -----

    const close = () => {
        closeCreateDialog();
        if (onCancel) onCancel();
    };

    document.getElementById('btn-create-close')?.addEventListener('click', close);
    document.getElementById('btn-create-cancel')?.addEventListener('click', close);

    // 点击遮罩层关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) close();
    });

    // 点击卡片触发对应回调
    document.getElementById('choice-blank')?.addEventListener('click', () => {
        closeCreateDialog();
        if (onBlank) onBlank();
    });

    document.getElementById('choice-template')?.addEventListener('click', () => {
        closeCreateDialog();
        if (onTemplate) onTemplate();
    });

    // ESC 键关闭
    const escHandler = (e) => {
        if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); }
    };
    document.addEventListener('keydown', escHandler);
}

// 关闭弹窗（带动画）
export function closeCreateDialog() {
    if (_activeModal) {
        _activeModal.classList.remove('open');
        // 动画结束后再从 DOM 移除
        setTimeout(() => {
            if (_activeModal && _activeModal.parentNode) {
                _activeModal.parentNode.removeChild(_activeModal);
            }
            _activeModal = null;
        }, 200);
    }
}

/**
 * 显示模板上下文选择弹窗
 * @returns {Promise<string|null>} 选中返回上下文 key，取消返回 null
 */
export function showTemplatePicker() {
    return new Promise((resolve) => {
        const ctxKeys = getContextKeys();
        const ctxConfig = getContextsConfig();

        const modal = document.createElement('div');
        modal.id = 'modal-template-picker';
        modal.className = 'modal-overlay';

        const cards = ctxKeys.map(k => {
            const cfg = ctxConfig[k] || {};
            return `<div class="create-choice-card" data-ctx="${k}">
                <div class="create-choice-label">${esc(cfg.label || k)}</div>
                <div class="create-choice-desc" style="font-size:0.75rem">${esc(cfg.description || '')}</div>
            </div>`;
        }).join('');

        modal.innerHTML = `
            <div class="modal-box" style="width:480px">
                <div class="modal-header"><h2>选择模板</h2><button class="modal-close picker-close">✕</button></div>
                <div class="modal-body">
                    <div class="create-choices" style="flex-wrap:wrap">${cards}</div>
                </div>
                <div class="modal-footer"><button class="btn btn-sm picker-close">取消</button></div>
            </div>`;
        document.body.appendChild(modal);
        requestAnimationFrame(() => modal.classList.add('open'));
        makeModalDraggable(modal);

        const close = (result) => {
            modal.classList.remove('open');
            setTimeout(() => { if (modal.parentNode) modal.parentNode.removeChild(modal); }, 200);
            resolve(result);
        };

        modal.querySelectorAll('.picker-close').forEach(el => el.addEventListener('click', () => close(null)));
        modal.addEventListener('click', (e) => { if (e.target === modal) close(null); });

        modal.querySelectorAll('.create-choice-card').forEach(card => {
            card.addEventListener('click', () => close(card.dataset.ctx));
        });
    });
}

// HTML 转义
function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

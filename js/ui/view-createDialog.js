// ==========================================
// createDialog.js — 新建选择弹窗
// 在新建章节/节点时弹出，让用户选择：
//   - 空白 JSON：最简结构
//   - 模板创建：使用当前模板配置
// ==========================================

let _activeModal = null; // 当前打开的弹窗实例（防止多个叠加）

import { makeModalDraggable } from './view-modalDialog.js';

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

// HTML 转义
function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ==========================================
// modalDialog.js — 通用模态框
// 提供 alert / confirm / prompt 三种模式
// 替代浏览器原生弹窗，统一使用项目模态样式
// ==========================================

/**
 * 显示信息弹窗（替代 alert）
 * @param {string} msg - 提示信息
 * @returns {Promise<void>}
 */
export function showAlert(msg) {
    return new Promise((resolve) => {
        const modal = buildModal({
            title: '提示',
            body: `<div class="modal-msg">${esc(msg)}</div>`,
            buttons: [
                { label: '确定', primary: true, action: resolve }
            ]
        });
        document.body.appendChild(modal);
    });
}

/**
 * 显示确认弹窗（替代 confirm）
 * @param {string} msg - 确认信息
 * @returns {Promise<boolean>} true=确认, false=取消
 */
export function showConfirm(msg) {
    return new Promise((resolve) => {
        const modal = buildModal({
            title: '确认',
            body: `<div class="modal-msg">${esc(msg)}</div>`,
            buttons: [
                { label: '取消', action: () => resolve(false) },
                { label: '确定', primary: true, action: () => resolve(true) }
            ]
        });
        document.body.appendChild(modal);
    });
}

/**
 * 显示输入弹窗（替代 prompt）
 * @param {string} msg - 提示文字
 * @param {string} defaultValue - 默认值
 * @returns {Promise<string|null>} 输入的值，取消返回 null
 */
export function showPrompt(msg, defaultValue = '') {
    return new Promise((resolve) => {
        const modal = buildModal({
            title: '输入',
            body: `<div style="margin-bottom:8px">${esc(msg)}</div>
                   <input id="modal-prompt-input" class="input" value="${esc(defaultValue)}" style="width:100%" />`,
            buttons: [
                { label: '取消', action: () => resolve(null) },
                { label: '确定', primary: true, action: () => {
                    const val = document.getElementById('modal-prompt-input')?.value || '';
                    resolve(val);
                }}
            ]
        });
        document.body.appendChild(modal);
        tryFocus('#modal-prompt-input');
    });
}

/**
 * 显示添加对象属性的弹窗（名称 + 类型选择）
 * @param {string} msg - 提示文字
 * @returns {Promise<{key: string, type: string}|null>} 取消返回 null
 */
export function showObjectAddDialog(msg = '请输入新属性名') {
    return new Promise((resolve) => {
        const modal = buildModal({
            title: '添加属性',
            body: `<div style="margin-bottom:8px">${esc(msg)}</div>
                   <input id="modal-obj-key" class="input" value="new_key" style="width:100%;margin-bottom:6px" placeholder="属性名" />
                   <select id="modal-obj-type" class="input-sm" style="width:100%">
                       <option value="string">字符串 ""</option>
                       <option value="number">数字 0</option>
                       <option value="array">空数组 []</option>
                       <option value="object">空对象 {}</option>
                   </select>`,
            buttons: [
                { label: '取消', action: () => resolve(null) },
                { label: '确定', primary: true, action: () => {
                    const key = document.getElementById('modal-obj-key')?.value.trim() || '';
                    const type = document.getElementById('modal-obj-type')?.value || 'string';
                    if (!key) { resolve(null); return; }
                    resolve({ key, type });
                }}
            ]
        });
        document.body.appendChild(modal);
        tryFocus('#modal-obj-key');
    });
}

// ===== 内部实现 =====

/**
 * 尝试聚焦元素，自动重试直到元素出现在 DOM 中
 */
function tryFocus(selector) {
    const attempt = () => {
        const el = document.querySelector(selector);
        if (el) { el.focus(); if (el.select) el.select(); return true; }
        return false;
    };
    // 立即尝试
    if (!attempt()) {
        // 重试 5 次（每次 50ms）
        let tries = 0;
        const id = setInterval(() => {
            tries++;
            if (attempt() || tries >= 5) clearInterval(id);
        }, 50);
    }
}

function buildModal({ title, body, buttons }) {
    const el = document.createElement('div');
    el.className = 'modal-overlay';
    el.innerHTML = `
        <div class="modal-box" style="width:420px">
            <div class="modal-header">
                <h2>${esc(title)}</h2>
                <button class="modal-close" id="modal-dialog-close">✕</button>
            </div>
            <div class="modal-body">${body}</div>
            <div class="modal-footer"></div>
        </div>`;

    const footer = el.querySelector('.modal-footer');
    const close = () => {
        el.classList.remove('open');
        setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 200);
    };
    const escHandler = (e) => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); } };

    // 按钮
    buttons.forEach(b => {
        const btn = document.createElement('button');
        btn.className = 'btn' + (b.primary ? ' btn-primary' : '');
        btn.textContent = b.label;
        btn.addEventListener('click', () => { b.action(); close(); });
        footer.appendChild(btn);
    });

    // 关闭按钮 & 遮罩 & ESC
    el.querySelector('#modal-dialog-close').addEventListener('click', close);
    el.addEventListener('click', (e) => { if (e.target === el) close(); });
    document.addEventListener('keydown', escHandler);

    // Enter 键触发主要按钮（确定/保存）
    el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            // 只处理 input/select 内回车，不处理 textarea
            const tag = document.activeElement?.tagName;
            if (tag === 'INPUT' || tag === 'SELECT') {
                e.preventDefault();
                const primary = footer.querySelector('.btn-primary');
                if (primary) primary.click();
            }
        }
    });

    // 启用拖拽
    makeModalDraggable(el);

    requestAnimationFrame(() => el.classList.add('open'));
    return el;
}

/**
 * 为任意模态框启用拖拽功能
 * @param {HTMLElement} modalEl - .modal-overlay 元素
 */
export function makeModalDraggable(modalEl) {
    const box = modalEl.querySelector('.modal-box');
    const header = modalEl.querySelector('.modal-header');
    if (!box || !header) return;

    let isDragging = false;
    let startX, startY, origTranslateX = 0, origTranslateY = 0;
    // 记录 box 上已有的 translate 值
    let currentTranslateX = 0, currentTranslateY = 0;

    // 读取当前 transform translate 值
    function getTranslate(el) {
        const style = window.getComputedStyle(el);
        const transform = style.transform;
        if (transform && transform !== 'none') {
            const match = transform.match(/matrix\(([^)]+)\)/);
            if (match) {
                const vals = match[1].split(', ').map(Number);
                return { x: vals[4] || 0, y: vals[5] || 0 };
            }
        }
        return { x: 0, y: 0 };
    }

    function onStart(e) {
        if (e.button !== 0) return;
        if (e.target.closest('.modal-close')) return;

        isDragging = true;
        const t = getTranslate(box);
        currentTranslateX = t.x;
        currentTranslateY = t.y;
        startX = e.clientX;
        startY = e.clientY;
        header.classList.add('dragging');
        box.classList.add('dragging');
    }

    function onMove(e) {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        box.style.transform = `translate(${currentTranslateX + dx}px, ${currentTranslateY + dy}px)`;
        box.style.margin = '0';
    }

    function onEnd() {
        if (!isDragging) return;
        isDragging = false;
        header.classList.remove('dragging');
        box.classList.remove('dragging');
    }

    header.addEventListener('mousedown', onStart);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
}

function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

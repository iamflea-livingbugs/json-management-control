// ==========================================
// modalDialog.js — 仅保留 makeModalDraggable
// showAlert/showConfirm/showPrompt/showObjectAddDialog 已移到 useDialog.js
// ==========================================

/**
 * 为任意模态框启用拖拽功能
 * @param {HTMLElement} modalEl - .modal-overlay 元素
 */
export function makeModalDraggable(modalEl) {
    const box = modalEl.querySelector('.modal-box');
    const header = modalEl.querySelector('.modal-header');
    if (!box || !header) return;

    let isDragging = false;
    let startX, startY, currentTranslateX = 0, currentTranslateY = 0;

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

// ==========================================
// dragDrop.js — 节点列表拖拽排序
// ==========================================

export function enableDragSort(listEl, onMove) {
    let dragSrcIndex = -1;

    listEl.addEventListener('dragstart', (e) => {
        const item = e.target.closest('[draggable="true"]');
        if (!item) return;
        dragSrcIndex = Array.from(listEl.children).indexOf(item);
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', '');
    });

    listEl.addEventListener('dragend', (e) => {
        const item = e.target.closest('[draggable="true"]');
        if (item) item.classList.remove('dragging');
        dragSrcIndex = -1;
    });

    listEl.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
    listEl.addEventListener('drop', (e) => {
        e.preventDefault();
        const item = e.target.closest('[draggable="true"]');
        if (!item) return;
        const dropIndex = Array.from(listEl.children).indexOf(item);
        if (dragSrcIndex !== -1 && dragSrcIndex !== dropIndex) onMove(dragSrcIndex, dropIndex);
        dragSrcIndex = -1;
    });
}

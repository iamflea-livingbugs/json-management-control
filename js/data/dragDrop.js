// ==========================================
// dragDrop.js — 节点列表拖拽排序
// 为 DOM 列表元素启用拖拽重排功能
// ==========================================

// enableDragSort: 给列表容器启用拖拽排序
// listEl: 列表容器元素（需有多个 [draggable="true"] 子元素）
// onMove: 拖拽完成回调，参数 (fromIndex, toIndex)
export function enableDragSort(listEl, onMove) {
    let dragSrcIndex = -1; // 被拖拽元素的原始索引

    // 开始拖拽
    listEl.addEventListener('dragstart', (e) => {
        const item = e.target.closest('[draggable="true"]');
        if (!item) return;
        dragSrcIndex = Array.from(listEl.children).indexOf(item);
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', '');
    });

    // 结束拖拽
    listEl.addEventListener('dragend', (e) => {
        const item = e.target.closest('[draggable="true"]');
        if (item) item.classList.remove('dragging');
        dragSrcIndex = -1;
    });

    // 拖拽经过：阻止默认以允许放置
    listEl.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });

    // 放置：计算目标位置并回调
    listEl.addEventListener('drop', (e) => {
        e.preventDefault();
        const item = e.target.closest('[draggable="true"]');
        if (!item) return;
        const dropIndex = Array.from(listEl.children).indexOf(item);
        if (dragSrcIndex !== -1 && dragSrcIndex !== dropIndex) onMove(dragSrcIndex, dropIndex);
        dragSrcIndex = -1;
    });
}

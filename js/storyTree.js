// ==========================================
// storyTree.js — 层级树形导航
// ==========================================

/**
 * 递归渲染 JSON 树。
 * 用法：renderTree(containerEl, jsonData, currentPath, onSelect)
 * - containerEl: 挂载节点
 * - jsonData: 完整 JSON 数据
 * - currentPath: 当前选中路径，如 ['content', '0']
 * - onSelect(path): 选中回调
 * - onAdd(path, type): 添加回调
 * - onDelete(path): 删除回调
 */

const _expandedPaths = new Set();

function pathKey(path) {
    return path.join('/');
}

export function renderTree(container, data, selectedPath, onSelect, onAdd, onDelete) {
    container.innerHTML = '';
    renderNode(container, data, [], '', selectedPath, onSelect, onAdd, onDelete, 0);
}

function renderNode(parent, value, path, key, selectedPath, onSelect, onAdd, onDelete, depth) {
    if (value === null || value === undefined) {
        renderPrimitive(parent, value, path, key, selectedPath, onSelect, onDelete, depth);
        return;
    }

    if (Array.isArray(value)) {
        renderArray(parent, value, path, key, selectedPath, onSelect, onAdd, onDelete, depth);
        return;
    }

    if (typeof value === 'object') {
        renderObject(parent, value, path, key, selectedPath, onSelect, onAdd, onDelete, depth);
        return;
    }

    renderPrimitive(parent, value, path, key, selectedPath, onSelect, onDelete, depth);
}

function renderObject(container, obj, path, key, selectedPath, onSelect, onAdd, onDelete, depth) {
    const keys = Object.keys(obj);
    const isSelected = pathsEqual(path, selectedPath);
    const pk = pathKey(path);
    const isExpanded = _expandedPaths.has(pk) || depth === 0;

    const row = makeRow(container, {
        icon: isExpanded ? '▼' : '▶',
        key: key || '(root)',
        summary: `{ ${keys.length} 个属性 }`,
        depth,
        path,
        isSelected,
        type: 'object',
        onSelect,
        onAdd,
        onDelete
    });

    const childContainer = document.createElement('div');
    childContainer.className = 'tree-children';
    childContainer.style.paddingLeft = (depth + 2) * 14 + 'px';
    childContainer.style.display = isExpanded ? '' : 'none';
    container.appendChild(childContainer);

    keys.forEach(k => {
        const childPath = [...path, k];
        renderNode(childContainer, obj[k], childPath, k, selectedPath, onSelect, onAdd, onDelete, depth + 1);
    });

    row.addEventListener('click', (e) => {
        if (e.target.closest('.tree-add-btn') || e.target.closest('.tree-del-btn')) return;
        const willHide = childContainer.style.display !== 'none';
        childContainer.style.display = willHide ? 'none' : '';
        row.querySelector('.tree-icon').textContent = willHide ? '▶' : '▼';
        if (willHide) {
            _expandedPaths.delete(pk);
        } else {
            _expandedPaths.add(pk);
        }
        onSelect(path);
    });
}

function renderArray(container, arr, path, key, selectedPath, onSelect, onAdd, onDelete, depth) {
    const isSelected = pathsEqual(path, selectedPath);
    const pk = pathKey(path);
    const isExpanded = _expandedPaths.has(pk) || depth === 0;

    const row = makeRow(container, {
        icon: isExpanded ? '▼' : '▶',
        key: key || '[]',
        summary: `[ ${arr.length} 项 ]`,
        depth,
        path,
        isSelected,
        type: 'array',
        onSelect,
        onAdd,
        onDelete
    });

    const childContainer = document.createElement('div');
    childContainer.className = 'tree-children';
    childContainer.style.paddingLeft = (depth + 2) * 14 + 'px';
    childContainer.style.display = isExpanded ? '' : 'none';
    container.appendChild(childContainer);

    arr.forEach((item, i) => {
        const childPath = [...path, String(i)];
        renderNode(childContainer, item, childPath, `[${i}]`, selectedPath, onSelect, onAdd, onDelete, depth + 1);
    });

    row.addEventListener('click', (e) => {
        if (e.target.closest('.tree-add-btn') || e.target.closest('.tree-del-btn')) return;
        const willHide = childContainer.style.display !== 'none';
        childContainer.style.display = willHide ? 'none' : '';
        row.querySelector('.tree-icon').textContent = willHide ? '▶' : '▼';
        if (willHide) {
            _expandedPaths.delete(pk);
        } else {
            _expandedPaths.add(pk);
        }
        onSelect(path);
    });
}

function renderPrimitive(container, value, path, key, selectedPath, onSelect, onDelete, depth) {
    const displayVal = value === null ? 'null' : value === undefined ? 'undefined' : String(value).slice(0, 50);
    const isSelected = pathsEqual(path, selectedPath);

    makeRow(container, {
        icon: '•',
        key: key || '',
        summary: displayVal,
        depth,
        path,
        isSelected,
        type: typeof value === 'string' ? 'string' : 'value',
        onSelect,
        onAdd: null,
        onDelete
    });
}

function makeRow(container, opts) {
    const row = document.createElement('div');
    row.className = 'tree-row' + (opts.isSelected ? ' selected' : '');
    row.dataset.path = JSON.stringify(opts.path);
    row.style.paddingLeft = (opts.depth + 1) * 14 + 'px';

    row.innerHTML = `
        <span class="tree-icon">${opts.icon}</span>
        <span class="tree-key">${esc(opts.key)}</span>
        <span class="tree-summary">${esc(opts.summary)}</span>
        <span class="tree-actions">
            ${opts.onAdd && (opts.type === 'object' || opts.type === 'array')
                ? `<button class="tree-add-btn" title="添加子项">＋</button>` : ''}
            ${opts.onDelete && opts.path.length > 0
                ? `<button class="tree-del-btn" title="删除">✕</button>` : ''}
        </span>`;

    row.addEventListener('click', (e) => {
        const target = e.target;
        if (target.closest('.tree-add-btn')) {
            opts.onAdd(opts.path, opts.type);
            return;
        }
        if (target.closest('.tree-del-btn')) {
            opts.onDelete(opts.path);
            return;
        }
        opts.onSelect(opts.path);
    });

    container.appendChild(row);
    return row;
}

// ========== 工具 ==========

function pathsEqual(a, b) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => String(v) === String(b[i]));
}

function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

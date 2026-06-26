// ==========================================
// storyTree.js — 层级树形导航
// 职责：递归渲染 JSON 树结构，支持展开/折叠、选中高亮、搜索定位
// ==========================================

// 存储已展开的路径集合（用于跨渲染保持展开状态）
const _expandedPaths = new Set();

// 路径转字符串键（用 / 分隔，用于 Set 的 key）
function pathKey(path) {
    return path.join('/');
}

// 外部调用——确保某路径是展开状态（新建节点时自动展开父路径）
export function ensureExpanded(path) {
    if (path) _expandedPaths.add(pathKey(path));
}

// 主渲染入口
// container: DOM 容器；data: JSON 数据
// selectedPath: 当前选中路径；onSelect/onAdd/onDelete: 回调
export function renderTree(container, data, selectedPath, onSelect, onAdd, onDelete) {
    // 清理 _expandedPaths 中已不存在的路径（节点被删除后）
    cleanExpandedPaths(data);
    container.innerHTML = '';
    renderNode(container, data, [], '', selectedPath, onSelect, onAdd, onDelete, 0);
}

// 递归验证路径是否仍存在于数据树中，清理无效路径
function cleanExpandedPaths(data) {
    for (const pk of _expandedPaths) {
        const segments = pk.split('/').filter(Boolean);
        let cur = data;
        let valid = true;
        for (const seg of segments) {
            if (cur === null || cur === undefined) { valid = false; break; }
            if (Array.isArray(cur)) {
                const idx = parseInt(seg);
                if (isNaN(idx) || idx < 0 || idx >= cur.length) { valid = false; break; }
                cur = cur[idx];
            } else if (typeof cur === 'object') {
                if (!(seg in cur)) { valid = false; break; }
                cur = cur[seg];
            } else { valid = false; break; }
        }
        if (!valid) _expandedPaths.delete(pk);
    }
}

// 递归渲染节点（根据值的类型分派到不同的渲染函数）
function renderNode(parent, value, path, key, selectedPath, onSelect, onAdd, onDelete, depth) {
    if (value === null || value === undefined) { renderPrimitive(parent, value, path, key, selectedPath, onSelect, onDelete, depth); return; }
    if (Array.isArray(value)) { renderArray(parent, value, path, key, selectedPath, onSelect, onAdd, onDelete, depth); return; }
    if (typeof value === 'object') { renderObject(parent, value, path, key, selectedPath, onSelect, onAdd, onDelete, depth); return; }
    renderPrimitive(parent, value, path, key, selectedPath, onSelect, onDelete, depth);
}

// 渲染对象节点（可展开/折叠，显示属性数量摘要）
function renderObject(container, obj, path, key, selectedPath, onSelect, onAdd, onDelete, depth) {
    const keys = Object.keys(obj);
    const isSelected = pathsEqual(path, selectedPath);
    const pk = pathKey(path);
    const isExpanded = _expandedPaths.has(pk) || depth === 0; // 根节点默认展开

    const row = makeRow(container, { icon: isExpanded ? '▼' : '▶', key: key || '(root)', summary: `{ ${keys.length} 个属性 }`, depth, path, isSelected, type: 'object', onSelect, onAdd, onDelete });

    // 子容器
    const childContainer = document.createElement('div');
    childContainer.className = 'tree-children';
    childContainer.style.paddingLeft = (depth + 2) * 14 + 'px';
    childContainer.style.display = isExpanded ? '' : 'none';
    container.appendChild(childContainer);

    keys.forEach(k => renderNode(childContainer, obj[k], [...path, k], k, selectedPath, onSelect, onAdd, onDelete, depth + 1));

    // 点击行：切换展开/折叠 + 触发选中
    row.addEventListener('click', (e) => {
        if (e.target.closest('.tree-add-btn') || e.target.closest('.tree-del-btn')) return;
        const willHide = childContainer.style.display !== 'none';
        childContainer.style.display = willHide ? 'none' : '';
        row.querySelector('.tree-icon').textContent = willHide ? '▶' : '▼';
        if (willHide) _expandedPaths.delete(pk);
        else _expandedPaths.add(pk);
        onSelect(path);
    });
}

// 渲染数组节点（类似对象，显示元素数量摘要）
function renderArray(container, arr, path, key, selectedPath, onSelect, onAdd, onDelete, depth) {
    const isSelected = pathsEqual(path, selectedPath);
    const pk = pathKey(path);
    const isExpanded = _expandedPaths.has(pk) || depth === 0;

    const row = makeRow(container, { icon: isExpanded ? '▼' : '▶', key: key || '[]', summary: `[ ${arr.length} 项 ]`, depth, path, isSelected, type: 'array', onSelect, onAdd, onDelete });

    const childContainer = document.createElement('div');
    childContainer.className = 'tree-children';
    childContainer.style.paddingLeft = (depth + 2) * 14 + 'px';
    childContainer.style.display = isExpanded ? '' : 'none';
    container.appendChild(childContainer);

    arr.forEach((item, i) => renderNode(childContainer, item, [...path, String(i)], `[${i}]`, selectedPath, onSelect, onAdd, onDelete, depth + 1));

    row.addEventListener('click', (e) => {
        if (e.target.closest('.tree-add-btn') || e.target.closest('.tree-del-btn')) return;
        const willHide = childContainer.style.display !== 'none';
        childContainer.style.display = willHide ? 'none' : '';
        row.querySelector('.tree-icon').textContent = willHide ? '▶' : '▼';
        if (willHide) _expandedPaths.delete(pk);
        else _expandedPaths.add(pk);
        onSelect(path);
    });
}

// 渲染基本类型节点（字符串/数字/布尔/null）—— 不可展开，直接显示值
function renderPrimitive(container, value, path, key, selectedPath, onSelect, onDelete, depth) {
    const displayVal = value === null ? 'null' : value === undefined ? 'undefined' : String(value).slice(0, 50);
    const isSelected = pathsEqual(path, selectedPath);
    makeRow(container, { icon: '•', key: key || '', summary: displayVal, depth, path, isSelected, type: typeof value === 'string' ? 'string' : 'value', onSelect, onAdd: null, onDelete });
}

// 构建树行 DOM 元素
function makeRow(container, opts) {
    const row = document.createElement('div');
    row.className = 'tree-row' + (opts.isSelected ? ' selected' : '');
    row.dataset.path = JSON.stringify(opts.path);
    row.style.paddingLeft = (opts.depth + 1) * 14 + 'px';
    // 右侧操作按钮：🔍搜索 / ＋添加 / ✕删除
    row.innerHTML = `<span class="tree-icon">${opts.icon}</span><span class="tree-key">${esc(opts.key)}</span><span class="tree-summary">${esc(opts.summary)}</span><span class="tree-actions">${opts.path && opts.path.length > 0 ? '<button class="tree-search-btn" title="搜索此路径">🔍</button>' : ''}${opts.onAdd && (opts.type === 'object' || opts.type === 'array') ? '<button class="tree-add-btn" title="添加子项">＋</button>' : ''}${opts.onDelete && opts.path.length > 0 ? '<button class="tree-del-btn" title="删除">✕</button>' : ''}</span>`;

    row.addEventListener('click', (e) => {
        const target = e.target;
        if (target.closest('.tree-search-btn')) {
            // 🔍 按钮：填充路径到搜索框
            e.stopPropagation();
            const searchInput = document.getElementById('tree-search');
            if (searchInput) {
                searchInput.value = opts.path.join('.') + '.';
                searchInput.focus();
                searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
            return;
        }
        if (target.closest('.tree-add-btn')) { opts.onAdd(opts.path, opts.type); return; }
        if (target.closest('.tree-del-btn')) { opts.onDelete(opts.path); return; }
        opts.onSelect(opts.path);
    });

    container.appendChild(row);
    return row;
}

// 路径比较（忽略类型差异，统一转字符串）
function pathsEqual(a, b) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => String(v) === String(b[i]));
}

// HTML 转义
function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

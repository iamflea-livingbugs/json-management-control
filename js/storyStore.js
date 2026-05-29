// ==========================================
// storyStore.js — 数据管理层
// ==========================================

import { createChapter, createNode, createOption, isEmpty } from './storyTypes.js';

class StoryStore {
    constructor() {
        this.chapter = createChapter();
        this.currentPath = [];       // 当前选中路径，如 ['content','0'] 或 ['meta']
        this.selectedId = null;
        this.filters = {};
        this._listeners = [];
    }

    // ---------- 事件订阅 ----------
    onChange(fn) {
        this._listeners.push(fn);
        return () => {
            this._listeners = this._listeners.filter(f => f !== fn);
        };
    }

    _emit() {
        this._listeners.forEach(fn => fn(this));
    }

    // ---------- 章节操作 ----------
    loadChapter(json) {
        this.chapter = json;
        if (!this.chapter.meta) this.chapter.meta = { name: 'Untitled' };
        this.chapter.content = (this.chapter.content || []).map(n => this._normalizeNode(n));
        this.selectedId = null;
        this.currentPath = [];
        this.filters = {};
        this._emit();
    }

    getChapterName() {
        return this.chapter.meta?.name || 'Untitled';
    }

    setChapterName(name) {
        this.chapter.meta.name = name;
        this._emit();
    }

    // ---------- 节点 CRUD ----------
    _normalizeNode(raw) {
        const defaults = createNode(raw.id || String(this.chapter.content.length));
        const merged = { ...defaults, ...raw };
        // 确保 speaker / text 是对象格式
        if (typeof merged.speaker === 'string') {
            merged.speaker = { zh: merged.speaker, en: '' };
        }
        if (typeof merged.text === 'string') {
            merged.text = { zh: merged.text, en: '' };
        }
        if (!merged.speaker) merged.speaker = { zh: '', en: '' };
        if (!merged.text) merged.text = { zh: '', en: '' };
        // 选项规范化
        merged.options = (merged.options || []).map(opt => ({
            text: typeof opt.text === 'string' ? { zh: opt.text, en: '' } : (opt.text || { zh: '', en: '' }),
            next: opt.next || '',
            showif: opt.showif || {},
            actions: opt.actions || []
        }));
        return merged;
    }

    addNode() {
        const id = String(this.chapter.content.length);
        const node = createNode(id);
        this.chapter.content.push(node);
        this.selectedId = id;
        this._emit();
    }

    duplicateNode(id) {
        const idx = this._findIndex(id);
        if (idx === -1) return;
        const src = JSON.parse(JSON.stringify(this.chapter.content[idx]));
        const newId = this._genUniqueId();
        src.id = newId;
        this.chapter.content.splice(idx + 1, 0, src);
        this.selectedId = newId;
        this._emit();
    }

    deleteNode(id) {
        const idx = this._findIndex(id);
        if (idx === -1) return;
        this.chapter.content.splice(idx, 1);
        if (this.selectedId === id) {
            this.selectedId = this.chapter.content.length > 0 ? this.chapter.content[0].id : null;
        }
        this._emit();
    }

    updateNode(id, patch) {
        const node = this.getNode(id);
        if (!node) return;
        Object.assign(node, patch);
        this._emit();
    }

    updateNodeField(id, field, zhVal, enVal) {
        const node = this.getNode(id);
        if (!node) return;
        if (typeof node[field] === 'object' && node[field].zh !== undefined) {
            node[field].zh = zhVal;
            node[field].en = enVal;
        } else {
            node[field] = zhVal;
        }
        this._emit();
    }

    moveNode(fromIndex, toIndex) {
        const arr = this.chapter.content;
        if (fromIndex < 0 || fromIndex >= arr.length) return;
        if (toIndex < 0 || toIndex >= arr.length) return;
        const [item] = arr.splice(fromIndex, 1);
        arr.splice(toIndex, 0, item);
        this._emit();
    }

    // ---------- 选项操作 ----------
    addOption(nodeId) {
        const node = this.getNode(nodeId);
        if (!node) return;
        node.options.push(createOption());
        this._emit();
    }

    updateOption(nodeId, optIndex, patch) {
        const node = this.getNode(nodeId);
        if (!node || !node.options[optIndex]) return;
        Object.assign(node.options[optIndex], patch);
        this._emit();
    }

    updateOptionText(nodeId, optIndex, zhVal, enVal) {
        const node = this.getNode(nodeId);
        if (!node || !node.options[optIndex]) return;
        node.options[optIndex].text.zh = zhVal;
        node.options[optIndex].text.en = enVal;
        this._emit();
    }

    deleteOption(nodeId, optIndex) {
        const node = this.getNode(nodeId);
        if (!node) return;
        node.options.splice(optIndex, 1);
        this._emit();
    }

    // ---------- 选项 actions ----------
    addAction(nodeId, optIndex) {
        const node = this.getNode(nodeId);
        if (!node || !node.options[optIndex]) return;
        node.options[optIndex].actions.push({ cmd: '', params: [] });
        this._emit();
    }

    updateActionCmd(nodeId, optIndex, actionIndex, cmd) {
        const node = this.getNode(nodeId);
        if (!node || !node.options[optIndex]) return;
        const act = node.options[optIndex].actions[actionIndex];
        if (act) act.cmd = cmd;
        this._emit();
    }

    updateActionParams(nodeId, optIndex, actionIndex, paramsStr) {
        const node = this.getNode(nodeId);
        if (!node || !node.options[optIndex]) return;
        const act = node.options[optIndex].actions[actionIndex];
        if (act) {
            try {
                act.params = JSON.parse(paramsStr);
            } catch {
                act.params = paramsStr.split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
            }
        }
        this._emit();
    }

    deleteAction(nodeId, optIndex, actionIndex) {
        const node = this.getNode(nodeId);
        if (!node || !node.options[optIndex]) return;
        node.options[optIndex].actions.splice(actionIndex, 1);
        this._emit();
    }

    // ---------- 筛选 ----------
    setFilter(field, value) {
        if (value === '' || value === undefined) {
            delete this.filters[field];
        } else {
            this.filters[field] = value;
        }
        this._emit();
    }

    clearFilters() {
        this.filters = {};
        this._emit();
    }

    getFilteredNodes() {
        let nodes = this.chapter.content;
        for (const [field, value] of Object.entries(this.filters)) {
            if (field === '_search') {
                const q = value.toLowerCase();
                nodes = nodes.filter(n => {
                    return (n.id || '').toLowerCase().includes(q)
                        || (n.speaker?.zh || '').toLowerCase().includes(q)
                        || (n.speaker?.en || '').toLowerCase().includes(q)
                        || (n.text?.zh || '').toLowerCase().includes(q)
                        || (n.text?.en || '').toLowerCase().includes(q);
                });
                continue;
            }
            nodes = nodes.filter(n => {
                const val = n[field];
                if (typeof val === 'object' && val.zh !== undefined) {
                    return (val.zh || '').toLowerCase().includes(value.toLowerCase());
                }
                return (val || '').toLowerCase().includes(value.toLowerCase());
            });
        }
        return nodes;
    }

    // ---------- 筛选候选值 ----------
    getFieldValues(field) {
        const set = new Set();
        for (const node of this.chapter.content) {
            const raw = node[field];
            if (!raw || isEmpty(raw)) continue;
            if (typeof raw === 'object' && raw.zh !== undefined) {
                const v = raw.zh || raw.en || '';
                if (v) set.add(v);
            } else if (typeof raw === 'string') {
                set.add(raw);
            }
        }
        return [...set].sort();
    }

    // ---------- 导出 ----------
    toCleanJSON() {
        function clean(obj) {
            if (Array.isArray(obj)) {
                return obj.map(clean);
            }
            if (obj && typeof obj === 'object') {
                if (obj.zh !== undefined && obj.en !== undefined) {
                    // I18n 对象：至少有一个非空才保留
                    if (!obj.zh && !obj.en) return undefined;
                    const out = {};
                    if (obj.zh) out.zh = obj.zh;
                    if (obj.en) out.en = obj.en;
                    return out;
                }
                const out = {};
                for (const [k, v] of Object.entries(obj)) {
                    const cleaned = clean(v);
                    if (cleaned !== undefined) out[k] = cleaned;
                }
                return out;
            }
            if (obj === '' || obj === null || obj === undefined) return undefined;
            return obj;
        }
        return clean(this.chapter);
    }

    // ---------- 内部辅助 ----------
    getNode(id) {
        return this.chapter.content.find(n => n.id === String(id));
    }

    _findIndex(id) {
        return this.chapter.content.findIndex(n => n.id === String(id));
    }

    _genUniqueId() {
        let i = this.chapter.content.length;
        while (this.chapter.content.some(n => n.id === String(i))) i++;
        return String(i);
    }

    selectNode(id) {
        this.selectedId = String(id);
        this.currentPath = ['content', String(id)];
        this._emit();
    }

    // ---------- 树形路径操作 ----------

    /**
     * 根据路径获取 JSON 值（导航到树中任意层级）
     */
    getByPath(path) {
        if (!path || path.length === 0) return this.chapter;
        let cur = this.chapter;
        for (const seg of path) {
            if (cur === null || cur === undefined) return undefined;
            if (Array.isArray(cur)) {
                cur = cur[parseInt(seg)];
            } else {
                cur = cur[seg];
            }
        }
        return cur;
    }

    /**
     * 选中路径
     */
    selectPath(path) {
        this.currentPath = path || [];
        if (path.length === 2 && path[0] === 'content') {
            this.selectedId = String(path[1]);
        } else {
            this.selectedId = null;
        }
        this._emit();
    }

    setByPath(path, value) {
        if (!path || path.length === 0) return;
        const parentPath = path.slice(0, -1);
        const lastSeg = path[path.length - 1];
        const parent = this.getByPath(parentPath);
        if (!parent) return;
        if (Array.isArray(parent)) {
            parent[parseInt(lastSeg)] = value;
        } else {
            parent[lastSeg] = value;
        }
        this._emit();
    }

    /**
     * 在指定路径添加子项
     * - object → 弹窗输入 key，默认 value ''
     * - array  → 添加当前默认节点或空对象
     */
    addAt(path, type) {
        const parent = this.getByPath(path);
        if (!parent) return;

        if (type === 'object') {
            const key = prompt('请输入新属性名（英文）:');
            if (!key) return;
            parent[key] = '';
            this._emit();
        } else if (type === 'array') {
            // 如果是 content 数组，添加标准节点
            if (path.length === 1 && path[0] === 'content') {
                this.addNode();
                return;
            }
            // 通用数组，添加空对象
            if (Array.isArray(parent)) {
                parent.push({});
                this._emit();
            }
        }
    }

    /**
     * 删除路径对应的节点
     */
    deleteAt(path) {
        if (!path || path.length === 0) return;
        const parentPath = path.slice(0, -1);
        const lastSeg = path[path.length - 1];
        const parent = this.getByPath(parentPath);
        if (!parent) return;

        if (Array.isArray(parent)) {
            const idx = parseInt(lastSeg);
            if (idx >= 0 && idx < parent.length) {
                parent.splice(idx, 1);
            }
        } else if (typeof parent === 'object') {
            delete parent[lastSeg];
        }
        this.currentPath = parentPath;
        this._emit();
    }
}

export const store = new StoryStore();

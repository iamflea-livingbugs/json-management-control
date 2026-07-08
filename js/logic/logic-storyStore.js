// ==========================================
// storyStore.js — 数据管理层（核心）
// 纯逻辑层，不依赖 UI
// ==========================================
import { createCurJson, createNodeFromTemplate, createOption, isEmpty, resolveTemplateContext } from './logic-storyTypes.js';

// ---- 编辑器元数据（Editor Metadata）----
// localStorage 键名，用于存储独立于 JSON 数据的编辑器状态
const EDITOR_META_KEY = 'storyeditor_editor_meta'

/** 从 localStorage 读取编辑器元数据 */
function loadEditorMeta() {
    try {
        const raw = localStorage.getItem(EDITOR_META_KEY)
        return raw ? JSON.parse(raw) : { fileName: 'Untitled' }
    } catch {
        return { fileName: 'Untitled' }
    }
}

/** 保存编辑器元数据到 localStorage */
function saveEditorMeta(meta) {
    localStorage.setItem(EDITOR_META_KEY, JSON.stringify(meta))
}

/**
 * StoryStore — 数据管理核心类
 *
 * 职责：JSON 数据的 CRUD、路径导航、变更通知
 * 设计原则：
 * - 纯数据操作，不涉及 UI 渲染
 * - 数据变更通过 _emit() 通知监听器
 * - 编辑器元数据（editorMeta）与 JSON 数据分离存储
 */
class StoryStore {
    constructor() {
        this.curJson = createCurJson();         // 当前编辑的 JSON 数据
        this.currentPath = [];                   // 当前选中路径
        this.selectedId = null;                  // 选中的节点 ID
        this.filters = {};                       // 搜索过滤条件
        this._listeners = [];                    // 变更监听器列表
        this._dataVersion = 0;                   // 数据版本号（用于渲染优化）
        // 编辑器元数据（独立于 JSON 数据，仅编辑器使用）
        this.editorMeta = loadEditorMeta();
    }

    // ---- 监听器机制 ----

    /** 注册变更监听器，返回取消注册函数 */
    onChange(fn) {
        this._listeners.push(fn);
        return () => { this._listeners = this._listeners.filter(f => f !== fn); };
    }

    /** 触发变更通知：更新版本号，通知所有监听器 */
    _emit() {
        this._dataVersion++;
        this._listeners.forEach(fn => fn(this));
    }

    // ---- 数据加载 ----

    /**
     * 加载 JSON 数据（规范化 + 结构补齐）
     *
     * 处理流程：
     * 1. 确保 meta 字段存在
     * 2. 对 content 数组逐节点规范化
     * 3. 重置选中状态和过滤条件
     */
    loadCurJson(json) {
        this.curJson = json;
        if (!this.curJson.meta) this.curJson.meta = { name: 'Untitled' };
        this.curJson.content = (this.curJson.content || []).map(n => this._normalizeNode(n));
        this.selectedId = null;
        this.currentPath = [];
        this.filters = {};
        this._emit();
    }

    /**
     * 替换当前数据（无规范化）
     * 用于新建空白 JSON，不触发字段补齐
     */
    newCurJson(json) {
        this.curJson = json;
        this.selectedId = null;
        this.currentPath = [];
        this.filters = {};
        this._emit();
    }

    // ---- 编辑器元数据 API（不写入 JSON 数据）----

    /**
     * 获取编辑器元数据
     * @param {string} key - 元数据键名，不传则返回全部
     * @param {*} fallback - 键不存在时的默认值
     */
    getEditorMeta(key, fallback) {
        if (key) return this.editorMeta[key] !== undefined ? this.editorMeta[key] : fallback
        return { ...this.editorMeta }
    }

    /** 设置编辑器元数据并持久化到 localStorage */
    setEditorMeta(key, val) {
        this.editorMeta[key] = val
        saveEditorMeta(this.editorMeta)
        this._emit()
    }

    /** 兼容旧 API — 返回当前文件名 */
    getCurJsonName() { return this.editorMeta.fileName || 'Untitled' }

    /** 兼容旧 API — 设置文件名（不在 meta.name 中） */
    setCurJsonName(name) {
        this.editorMeta.fileName = name || 'Untitled'
        saveEditorMeta(this.editorMeta)
        this._emit()
    }

    // ---- 数据规范化 ----

    /**
     * 节点数据规范化
     *
     * 加载 JSON 时调用，对每个节点：
     * 1. 用 content 模板填充默认字段
     * 2. 将 speaker 和 text 从字符串升级为多语言对象
     * 3. 补齐 options 的结构
     */
    _normalizeNode(raw) {
        const defaults = createNodeFromTemplate('content', '_');
        delete defaults.id;
        const merged = { ...defaults, ...raw };
        if (typeof merged.speaker === 'string') merged.speaker = { zh: merged.speaker, en: '' };
        if (typeof merged.text === 'string') merged.text = { zh: merged.text, en: '' };
        if (!merged.speaker) merged.speaker = { zh: '', en: '' };
        if (!merged.text) merged.text = { zh: '', en: '' };
        merged.options = (merged.options || []).map(opt => ({
            text: typeof opt.text === 'string' ? { zh: opt.text, en: '' } : (opt.text || { zh: '', en: '' }),
            next: opt.next || '', showif: opt.showif || {}, actions: opt.actions || []
        }));
        return merged;
    }

    // ---- 节点 CRUD（操作 content 数组）----

    /**
     * 在路径下用模板新建内容
     * 数组模式：push 模板节点
     * 对象模式：用模板值添加新属性
     */
    addNode(ctx = null, path = null) {
        const targetPath = path || this.currentPath;
        const parent = this.getByPath(targetPath);
        if (!parent) return;

        const tpl = createNodeFromTemplate(ctx || 'default');
        delete tpl.id;

        if (Array.isArray(parent)) {
            parent.push(tpl);
            const idx = parent.length - 1;
            this.currentPath = [...targetPath, String(idx)];
        } else if (typeof parent === 'object' && parent !== null) {
            let key = 'new_key';
            let i = 1;
            while (key in parent) key = 'new_key_' + i++;
            parent[key] = tpl;
            this.currentPath = [...targetPath, key];
        }
        this._emit();
    }

    /** 在 content 末尾追加空白节点 */
    addBlankNode() {
        const id = String(this.curJson.content.length);
        this.curJson.content.push({ id });
        this.selectedId = id;
        this._emit();
    }

    /** 复制节点（深拷贝 + 新 ID），插入在原节点之后 */
    duplicateNode(id) {
        const idx = this._findIndex(id);
        if (idx === -1) return;
        const src = JSON.parse(JSON.stringify(this.curJson.content[idx]));
        const newId = this._genUniqueId();
        src.id = newId;
        this.curJson.content.splice(idx + 1, 0, src);
        this.selectedId = newId;
        this._emit();
    }

    /** 删除指定 ID 的节点 */
    deleteNode(id) {
        const idx = this._findIndex(id);
        if (idx === -1) return;
        this.curJson.content.splice(idx, 1);
        if (this.selectedId === id) this.selectedId = this.curJson.content.length > 0 ? this.curJson.content[0].id : null;
        this._emit();
    }

    /** 更新节点字段（合并式赋值） */
    updateNode(id, patch) { const node = this.getNode(id); if (!node) return; Object.assign(node, patch); this._emit(); }

    /** 更新多语言字段（zh / en） */
    updateNodeField(id, field, zhVal, enVal) {
        const node = this.getNode(id);
        if (!node) return;
        if (typeof node[field] === 'object' && node[field].zh !== undefined) { node[field].zh = zhVal; node[field].en = enVal; }
        else { node[field] = zhVal; }
        this._emit();
    }

    /** 移动节点在 content 数组中的位置 */
    moveNode(fromIndex, toIndex) {
        const arr = this.curJson.content;
        if (fromIndex < 0 || fromIndex >= arr.length || toIndex < 0 || toIndex >= arr.length) return;
        const [item] = arr.splice(fromIndex, 1); arr.splice(toIndex, 0, item);
        this._emit();
    }

    // ---- 选项（Option）操作 ----

    /** 为指定节点添加空白选项 */
    addOption(nodeId) { const node = this.getNode(nodeId); if (!node) return; node.options.push(createOption()); this._emit(); }
    /** 更新选项字段 */
    updateOption(nodeId, optIndex, patch) { const node = this.getNode(nodeId); if (!node || !node.options[optIndex]) return; Object.assign(node.options[optIndex], patch); this._emit(); }

    /** 更新选项的多语言文本 */
    updateOptionText(nodeId, optIndex, zhVal, enVal) {
        const node = this.getNode(nodeId); if (!node || !node.options[optIndex]) return;
        node.options[optIndex].text.zh = zhVal; node.options[optIndex].text.en = enVal; this._emit();
    }

    /** 删除指定索引的选项 */
    deleteOption(nodeId, optIndex) { const node = this.getNode(nodeId); if (!node) return; node.options.splice(optIndex, 1); this._emit(); }

    // ---- 动作（Action）操作 ----

    /** 为选项添加空白动作 */
    addAction(nodeId, optIndex) { const node = this.getNode(nodeId); if (!node || !node.options[optIndex]) return; node.options[optIndex].actions.push({ cmd: '', params: [] }); this._emit(); }
    /** 更新动作命令名 */
    updateActionCmd(nodeId, optIndex, actionIndex, cmd) { const node = this.getNode(nodeId); if (!node || !node.options[optIndex]) return; const act = node.options[optIndex].actions[actionIndex]; if (act) act.cmd = cmd; this._emit(); }

    /**
     * 更新动作参数
     * 支持 JSON 数组解析和逗号分隔文本两种格式
     */
    updateActionParams(nodeId, optIndex, actionIndex, paramsStr) {
        const node = this.getNode(nodeId); if (!node || !node.options[optIndex]) return;
        const act = node.options[optIndex].actions[actionIndex];
        if (act) { try { act.params = JSON.parse(paramsStr); } catch { act.params = paramsStr.split(',').map(s => s.trim().replace(/^["']|["']$/g, '')); } }
        this._emit();
    }

    /** 删除动作 */
    deleteAction(nodeId, optIndex, actionIndex) { const node = this.getNode(nodeId); if (!node || !node.options[optIndex]) return; node.options[optIndex].actions.splice(actionIndex, 1); this._emit(); }

    // ---- 搜索与过滤 ----

    /** 设置过滤条件，空值则移除该条件 */
    setFilter(field, value) { if (value === '' || value === undefined) delete this.filters[field]; else this.filters[field] = value; this._emit(); }
    /** 清除所有过滤条件 */
    clearFilters() { this.filters = {}; this._emit(); }

    /**
     * 获取过滤后的节点列表
     * _search 为特殊字段：对 id / speaker / text 做全局模糊搜索
     * 其他字段按精确匹配过滤
     */
    getFilteredNodes() {
        let nodes = this.curJson.content;
        for (const [field, value] of Object.entries(this.filters)) {
            if (field === '_search') {
                const q = value.toLowerCase();
                nodes = nodes.filter(n => (n.id || '').toLowerCase().includes(q) || (n.speaker?.zh || '').toLowerCase().includes(q) || (n.speaker?.en || '').toLowerCase().includes(q) || (n.text?.zh || '').toLowerCase().includes(q) || (n.text?.en || '').toLowerCase().includes(q));
                continue;
            }
            nodes = nodes.filter(n => { const val = n[field]; if (typeof val === 'object' && val.zh !== undefined) return (val.zh || '').toLowerCase().includes(value.toLowerCase()); return (val || '').toLowerCase().includes(value.toLowerCase()); });
        }
        return nodes;
    }

    /** 获取指定字段的所有不重复值（排序后返回） */
    getFieldValues(field) {
        const set = new Set();
        for (const node of this.curJson.content) {
            const raw = node[field];
            if (!raw || isEmpty(raw)) continue;
            if (typeof raw === 'object' && raw.zh !== undefined) { const v = raw.zh || raw.en || ''; if (v) set.add(v); }
            else if (typeof raw === 'string') set.add(raw);
        }
        return [...set].sort();
    }

    // ---- 数据导出 ----

    /**
     * 导出清洗后的 JSON
     * 递归移除：空字符串、null、undefined、空对象、空数组
     * 仅保留有效数据
     */
    toCleanJSON() {
        function clean(obj) {
            if (Array.isArray(obj)) return obj.map(clean).filter(x => x !== undefined);
            if (obj && typeof obj === 'object') {
                if (obj.zh !== undefined && obj.en !== undefined) { if (!obj.zh && !obj.en) return undefined; const out = {}; if (obj.zh) out.zh = obj.zh; if (obj.en) out.en = obj.en; return out; }
                const out = {};
                for (const [k, v] of Object.entries(obj)) { const c = clean(v); if (c !== undefined) out[k] = c; }
                if (Object.keys(out).length === 0) return undefined;
                return out;
            }
            if (obj === '' || obj === null || obj === undefined) return undefined;
            return obj;
        }
        return clean(this.curJson);
    }

    // ---- 节点查找 ----

    /** 通过 ID 查找节点 */
    getNode(id) { return this.curJson.content.find(n => n.id === String(id)); }
    /** 查找节点在 content 数组中的索引 */
    _findIndex(id) { return this.curJson.content.findIndex(n => n.id === String(id)); }

    /** 生成不重复的节点 ID（当前最大 ID + 1） */
    _genUniqueId() {
        const maxId = this.curJson.content.reduce((max, n) => Math.max(max, parseInt(n.id) || 0), 0);
        return String(maxId + 1);
    }

    // ---- 路径导航 ----

    /** 选中节点（设置路径为 content/<id>） */
    selectNode(id) { this.selectedId = String(id); this.currentPath = ['content', String(id)]; this._emit(); }

    /**
     * 按路径取值
     * @param {string[]} path - 路径数组，如 ['content', '0', 'speaker']
     * @returns {*} 路径对应的值，路径无效返回 undefined
     */
    getByPath(path) {
        if (!path || path.length === 0) return this.curJson;
        let cur = this.curJson;
        for (const seg of path) {
            if (cur === null || cur === undefined) return undefined;
            if (Array.isArray(cur)) cur = cur[parseInt(seg)];
            else cur = cur[seg];
        }
        return cur;
    }

    /**
     * 选中路径
     * content/<id> 格式的路径会自动设置 selectedId
     */
    selectPath(path) {
        this.currentPath = path || [];
        if (path.length === 2 && path[0] === 'content') this.selectedId = String(path[1]);
        else this.selectedId = null;
        this._emit();
    }

    // ---- 数据写入（通用）----

    /** 按路径设值 */
    setByPath(path, value) {
        if (!path || path.length === 0) { this._emit(); return; }
        const parentPath = path.slice(0, -1);
        const lastSeg = path[path.length - 1];
        const parent = this.getByPath(parentPath);
        if (!parent) return;
        if (Array.isArray(parent)) parent[parseInt(lastSeg)] = value;
        else parent[lastSeg] = value;
        this._emit();
    }

    // ---- 纯数据操作：新增 / 删除（UI 层负责交互）----

    /** 在对象中添加属性（纯数据操作，不跳转路径） */
    addObjectProperty(path, key, val) {
        const parent = this.getByPath(path);
        if (!parent || typeof parent !== 'object' || Array.isArray(parent)) return;
        parent[key] = val;
        this._emit();
    }

    /**
     * 在数组中添加元素
     * 根据路径上下文自动选择模板创建节点
     */
    addArrayItem(path) {
        const parent = this.getByPath(path);
        if (!parent || !Array.isArray(parent)) return;
        const ctx = resolveTemplateContext([...path, '0']);
        const tpl = createNodeFromTemplate(ctx);
        delete tpl.id;
        parent.push(tpl);
        this.currentPath = [...path, String(parent.length - 1)];
        this._emit();
    }

    /**
     * 复制条目
     * 数组模式：深拷贝元素并插入其后，生成新 ID
     * 对象模式：深拷贝属性值，自动生成不重复的键名（_copy / _copy_1 / _copy_2 ...）
     */
    duplicateEntry(path) {
        if (!path || path.length === 0) return;
        const parentPath = path.slice(0, -1);
        const lastSeg = path[path.length - 1];
        const parent = this.getByPath(parentPath);
        if (!parent) return;

        if (Array.isArray(parent)) {
            const idx = parseInt(lastSeg);
            if (isNaN(idx) || idx < 0 || idx >= parent.length) return;
            const source = parent[idx];
            if (source === undefined || source === null) return;
            const copy = JSON.parse(JSON.stringify(source));
            if (copy.id) copy.id = 'node_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
            parent.splice(idx + 1, 0, copy);
        } else if (typeof parent === 'object' && parent !== null) {
            if (!(lastSeg in parent)) return;
            const source = parent[lastSeg];
            if (source === undefined) return;
            const copy = JSON.parse(JSON.stringify(source));
            let newKey = lastSeg + '_copy';
            let i = 1;
            while (newKey in parent) newKey = lastSeg + '_copy_' + i++;
            parent[newKey] = copy;
        }
        this._emit();
    }

    /** 按路径删除属性或数组元素 */
    deleteAt(path) {
        if (!path || path.length === 0) return;
        const parentPath = path.slice(0, -1);
        const lastSeg = path[path.length - 1];
        const parent = this.getByPath(parentPath);
        if (!parent) return;
        if (Array.isArray(parent)) { const idx = parseInt(lastSeg); if (idx >= 0 && idx < parent.length) parent.splice(idx, 1); }
        else if (typeof parent === 'object') delete parent[lastSeg];
        this.currentPath = parentPath;
        this._emit();
    }
}

export const store = new StoryStore();
export { StoryStore };

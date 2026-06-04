// ==========================================
// storyStore.js — 数据管理层（核心）
// 职责：
//   1. 管理当前章节数据（this.chapter）
//   2. 提供节点/选项/动作的 CRUD 操作
//   3. 管理选中状态和路径导航
//   4. 提供筛选、格式化导出等功能
//   5. 通过 onChange 发布变更通知，驱动 UI 渲染
// ==========================================

import { createChapter, createNodeFromTemplate, createOption, isEmpty, resolveTemplateContext } from '../base/storyTypes.js';
import { ensureExpanded } from '../ui/storyTree.js';

class StoryStore {
    constructor() {
        // ---------- 核心数据 ----------
        this.chapter = createChapter();   // 当前打开的章节（JSON 树）
        this.currentPath = [];            // 当前在树形导航中选中的路径
        this.selectedId = null;           // 当前选中的节点 ID（用于表单高亮）
        this.filters = {};                // 筛选条件 { field: value }

        // ---------- 内部状态 ----------
        this._listeners = [];             // 渲染监听器队列
        this._configUrl = null;           // 通过 loadConfig 打开的配置文件 URL
    }

    // ----- 发布/订阅 -----

    // 注册渲染监听器（返回取消订阅函数）
    onChange(fn) {
        this._listeners.push(fn);
        return () => {
            this._listeners = this._listeners.filter(f => f !== fn);
        };
    }

    // 触发所有监听器（通知 UI 重新渲染）
    _emit() {
        this._listeners.forEach(fn => fn(this));
    }

    // ----- 章节加载 -----

    // 从外部 JSON 加载章节（拖入/导入时调用）
    // 自动补全缺失的 meta 和 content，并对节点做标准化
    loadChapter(json) {
        this.chapter = json;
        if (!this.chapter.meta) this.chapter.meta = { name: 'Untitled' };
        // 对已有的 content 节点做标准化（补全缺失字段）
        this.chapter.content = (this.chapter.content || []).map(n => this._normalizeNode(n));
        this.selectedId = null;
        this.currentPath = [];
        this.filters = {};
        this._configUrl = null;
        this._emit();
    }

    // 新建空白章节（直接设值，不走 loadChapter 的自动补字段逻辑）
    newChapter(json) {
        this.chapter = json;
        this.selectedId = null;
        this.currentPath = [];
        this.filters = {};
        this._configUrl = null;
        this._emit();
    }

    // 从 URL 加载配置文件（用于编辑 config/ 目录下的 JSON 配置）
    loadConfig(url) {
        this._configUrl = url;
        const filename = url.split('/').pop();
        const saved = localStorage.getItem('storyeditor_config_' + filename);
        if (saved) {
            try {
                this.chapter = JSON.parse(saved);
                this.selectedId = null;
                this.currentPath = [];
                this.filters = {};
                this._emit();
                return Promise.resolve();
            } catch {}
        }
        return fetch(url).then(r => r.json()).then(json => {
            this.chapter = json;
            this.selectedId = null;
            this.currentPath = [];
            this.filters = {};
            this._emit();
        });
    }

    // 保存配置文件到 localStorage 并下载文件
    saveConfig() {
        if (!this._configUrl) return;
        const url = this._configUrl;
        const filename = url.split('/').pop();
        const json = this.toCleanJSON();
        localStorage.setItem('storyeditor_config_' + filename, JSON.stringify(json));
        const blob = new Blob([JSON.stringify(json, null, 4)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        return filename;
    }

    // ----- 章节元数据 -----

    getChapterName() {
        return this.chapter.meta?.name || 'Untitled';
    }

    setChapterName(name) {
        this.chapter.meta.name = name;
        this._emit();
    }

    // ----- 节点标准化（确保节点有所有必需字段）-----

    _normalizeNode(raw) {
        const defaults = createNodeFromTemplate('content', '_');
        delete defaults.id;
        const merged = { ...defaults, ...raw };
        // 兼容旧数据：字符串形式的 speaker/text 自动转成 { zh, en } 格式
        if (typeof merged.speaker === 'string') {
            merged.speaker = { zh: merged.speaker, en: '' };
        }
        if (typeof merged.text === 'string') {
            merged.text = { zh: merged.text, en: '' };
        }
        if (!merged.speaker) merged.speaker = { zh: '', en: '' };
        if (!merged.text) merged.text = { zh: '', en: '' };
        // 选项标准化
        merged.options = (merged.options || []).map(opt => ({
            text: typeof opt.text === 'string' ? { zh: opt.text, en: '' } : (opt.text || { zh: '', en: '' }),
            next: opt.next || '',
            showif: opt.showif || {},
            actions: opt.actions || []
        }));
        return merged;
    }

    // ----- 对话节点 CRUD -----

    // 按模板新增节点
    addNode() {
        const id = String(this.chapter.content.length);
        const node = createNodeFromTemplate('content', id);
        this.chapter.content.push(node);
        this.selectedId = id;
        this._emit();
    }

    // 新增空白节点（仅含 id，无模板字段）
    addBlankNode() {
        const id = String(this.chapter.content.length);
        this.chapter.content.push({ id });
        this.selectedId = id;
        this._emit();
    }

    // 复制节点（插入到原节点后面）
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

    // 删除节点
    deleteNode(id) {
        const idx = this._findIndex(id);
        if (idx === -1) return;
        this.chapter.content.splice(idx, 1);
        if (this.selectedId === id) {
            this.selectedId = this.chapter.content.length > 0 ? this.chapter.content[0].id : null;
        }
        this._emit();
    }

    // 更新节点多个字段
    updateNode(id, patch) {
        const node = this.getNode(id);
        if (!node) return;
        Object.assign(node, patch);
        this._emit();
    }

    // 更新节点单个字段（支持双语）
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

    // 移动节点位置（拖拽排序）
    moveNode(fromIndex, toIndex) {
        const arr = this.chapter.content;
        if (fromIndex < 0 || fromIndex >= arr.length) return;
        if (toIndex < 0 || toIndex >= arr.length) return;
        const [item] = arr.splice(fromIndex, 1);
        arr.splice(toIndex, 0, item);
        this._emit();
    }

    // ----- 选项管理 -----

    // 为节点添加一个新选项
    addOption(nodeId) {
        const node = this.getNode(nodeId);
        if (!node) return;
        node.options.push(createOption());
        this._emit();
    }

    // 更新选项（多字段）
    updateOption(nodeId, optIndex, patch) {
        const node = this.getNode(nodeId);
        if (!node || !node.options[optIndex]) return;
        Object.assign(node.options[optIndex], patch);
        this._emit();
    }

    // 更新选项文本（双语）
    updateOptionText(nodeId, optIndex, zhVal, enVal) {
        const node = this.getNode(nodeId);
        if (!node || !node.options[optIndex]) return;
        node.options[optIndex].text.zh = zhVal;
        node.options[optIndex].text.en = enVal;
        this._emit();
    }

    // 删除选项
    deleteOption(nodeId, optIndex) {
        const node = this.getNode(nodeId);
        if (!node) return;
        node.options.splice(optIndex, 1);
        this._emit();
    }

    // ----- 动作管理（选项下的动作）-----

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
            try { act.params = JSON.parse(paramsStr); }
            catch { act.params = paramsStr.split(',').map(s => s.trim().replace(/^["']|["']$/g, '')); }
        }
        this._emit();
    }

    deleteAction(nodeId, optIndex, actionIndex) {
        const node = this.getNode(nodeId);
        if (!node || !node.options[optIndex]) return;
        node.options[optIndex].actions.splice(actionIndex, 1);
        this._emit();
    }

    // ----- 筛选与搜索 -----

    setFilter(field, value) {
        if (value === '' || value === undefined) delete this.filters[field];
        else this.filters[field] = value;
        this._emit();
    }

    clearFilters() {
        this.filters = {};
        this._emit();
    }

    // 获取筛选后的节点列表（支持按字段值搜索和全文搜索）
    getFilteredNodes() {
        let nodes = this.chapter.content;
        for (const [field, value] of Object.entries(this.filters)) {
            if (field === '_search') {
                // 全文搜索：匹配 id、speaker、text
                const q = value.toLowerCase();
                nodes = nodes.filter(n =>
                    (n.id || '').toLowerCase().includes(q)
                    || (n.speaker?.zh || '').toLowerCase().includes(q)
                    || (n.speaker?.en || '').toLowerCase().includes(q)
                    || (n.text?.zh || '').toLowerCase().includes(q)
                    || (n.text?.en || '').toLowerCase().includes(q)
                );
                continue;
            }
            // 按指定字段精确搜索
            nodes = nodes.filter(n => {
                const val = n[field];
                if (typeof val === 'object' && val.zh !== undefined)
                    return (val.zh || '').toLowerCase().includes(value.toLowerCase());
                return (val || '').toLowerCase().includes(value.toLowerCase());
            });
        }
        return nodes;
    }

    // 获取指定字段的所有不重复值（用于筛选下拉框）
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

    // ----- 导出 -----

    // 导出清洗后的 JSON（剔除空值字段）
    toCleanJSON() {
        function clean(obj) {
            if (Array.isArray(obj)) return obj.map(clean);
            if (obj && typeof obj === 'object') {
                // 处理双语对象：至少有一项不为空才保留
                if (obj.zh !== undefined && obj.en !== undefined) {
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

    // ----- 节点查询 -----

    getNode(id) {
        return this.chapter.content.find(n => n.id === String(id));
    }

    _findIndex(id) {
        return this.chapter.content.findIndex(n => n.id === String(id));
    }

    // 生成不重复的节点 ID（基于 content 数组长度递增查找）
    _genUniqueId() {
        let i = this.chapter.content.length;
        while (this.chapter.content.some(n => n.id === String(i))) i++;
        return String(i);
    }

    // ----- 路径导航（树形面板驱动）-----

    selectNode(id) {
        this.selectedId = String(id);
        this.currentPath = ['content', String(id)];
        this._emit();
    }

    // 根据路径获取数据
    getByPath(path) {
        if (!path || path.length === 0) return this.chapter;
        let cur = this.chapter;
        for (const seg of path) {
            if (cur === null || cur === undefined) return undefined;
            if (Array.isArray(cur)) cur = cur[parseInt(seg)];
            else cur = cur[seg];
        }
        return cur;
    }

    // 选中指定路径（来自树形面板点击）
    selectPath(path) {
        this.currentPath = path || [];
        if (path.length === 2 && path[0] === 'content') this.selectedId = String(path[1]);
        else this.selectedId = null;
        this._emit();
    }

    // 按路径设置值
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

    // 在指定路径下添加新元素
    addAt(path, type) {
        const parent = this.getByPath(path);
        if (!parent) return;
        if (type === 'object') {
            // 在对象中添加新属性
            const key = prompt('请输入新属性名（英文）:');
            if (!key) return;
            parent[key] = '';
            ensureExpanded(path);
            this.currentPath = [...path, key];
            this._emit();
        } else if (type === 'array') {
            // 在数组中添加新元素
            if (path.length === 1 && path[0] === 'content') { this.addNode(); return; }
            const ctx = resolveTemplateContext([...path, '0']);
            const tpl = createNodeFromTemplate(ctx);
            delete tpl.id;
            const newIndex = parent.length;
            parent.push(tpl);
            ensureExpanded(path);
            this.currentPath = [...path, String(newIndex)];
            this._emit();
        }
    }

    // 删除指定路径的数据
    deleteAt(path) {
        if (!path || path.length === 0) return;
        const parentPath = path.slice(0, -1);
        const lastSeg = path[path.length - 1];
        const parent = this.getByPath(parentPath);
        if (!parent) return;
        if (Array.isArray(parent)) {
            const idx = parseInt(lastSeg);
            if (idx >= 0 && idx < parent.length) parent.splice(idx, 1);
        } else if (typeof parent === 'object') {
            delete parent[lastSeg];
        }
        this.currentPath = parentPath;
        this._emit();
    }
}

// 导出全局单例
export const store = new StoryStore();

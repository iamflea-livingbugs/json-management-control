// ==========================================
// storyStore.js — 数据管理层
// ==========================================

import { createChapter, createNodeFromTemplate, createOption, isEmpty, resolveTemplateContext } from '../base/storyTypes.js';
import { ensureExpanded } from '../ui/storyTree.js';

class StoryStore {
    constructor() {
        this.chapter = createChapter();
        this.currentPath = [];
        this.selectedId = null;
        this.filters = {};
        this._listeners = [];
    }

    onChange(fn) {
        this._listeners.push(fn);
        return () => {
            this._listeners = this._listeners.filter(f => f !== fn);
        };
    }

    _emit() {
        this._listeners.forEach(fn => fn(this));
    }

    loadChapter(json) {
        this.chapter = json;
        if (!this.chapter.meta) this.chapter.meta = { name: 'Untitled' };
        this.chapter.content = (this.chapter.content || []).map(n => this._normalizeNode(n));
        this.selectedId = null;
        this.currentPath = [];
        this.filters = {};
        this._configUrl = null;
        this._emit();
    }

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

    getChapterName() {
        return this.chapter.meta?.name || 'Untitled';
    }

    setChapterName(name) {
        this.chapter.meta.name = name;
        this._emit();
    }

    _normalizeNode(raw) {
        const defaults = createNodeFromTemplate('content', '_');
        delete defaults.id;
        const merged = { ...defaults, ...raw };
        if (typeof merged.speaker === 'string') {
            merged.speaker = { zh: merged.speaker, en: '' };
        }
        if (typeof merged.text === 'string') {
            merged.text = { zh: merged.text, en: '' };
        }
        if (!merged.speaker) merged.speaker = { zh: '', en: '' };
        if (!merged.text) merged.text = { zh: '', en: '' };
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
        const node = createNodeFromTemplate('content', id);
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

    setFilter(field, value) {
        if (value === '' || value === undefined) delete this.filters[field];
        else this.filters[field] = value;
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
                nodes = nodes.filter(n =>
                    (n.id || '').toLowerCase().includes(q)
                    || (n.speaker?.zh || '').toLowerCase().includes(q)
                    || (n.speaker?.en || '').toLowerCase().includes(q)
                    || (n.text?.zh || '').toLowerCase().includes(q)
                    || (n.text?.en || '').toLowerCase().includes(q)
                );
                continue;
            }
            nodes = nodes.filter(n => {
                const val = n[field];
                if (typeof val === 'object' && val.zh !== undefined)
                    return (val.zh || '').toLowerCase().includes(value.toLowerCase());
                return (val || '').toLowerCase().includes(value.toLowerCase());
            });
        }
        return nodes;
    }

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

    toCleanJSON() {
        function clean(obj) {
            if (Array.isArray(obj)) return obj.map(clean);
            if (obj && typeof obj === 'object') {
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

    selectPath(path) {
        this.currentPath = path || [];
        if (path.length === 2 && path[0] === 'content') this.selectedId = String(path[1]);
        else this.selectedId = null;
        this._emit();
    }

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

    addAt(path, type) {
        const parent = this.getByPath(path);
        if (!parent) return;
        if (type === 'object') {
            const key = prompt('请输入新属性名（英文）:');
            if (!key) return;
            parent[key] = '';
            ensureExpanded(path);
            this.currentPath = [...path, key];
            this._emit();
        } else if (type === 'array') {
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

export const store = new StoryStore();

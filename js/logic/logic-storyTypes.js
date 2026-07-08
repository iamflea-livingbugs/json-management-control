// ==========================================
// storyTypes.js — 数据模型 & 常量定义（逻辑层）
// ==========================================
import { readConfig, writeConfig, readSchema, writeSchema } from './logic-migration.js';

export function createI18nText(zh = '', en = '') {
    return { zh, en };
}

const HARDCODED_CONTENT = {
    curJson: {
        meta: { name: 'Untitled', author: '', description: '' },
        content: []
    },
    node: {
        id: '', speaker: { zh: '', en: '' }, text: { zh: '', en: '' },
        headimage: '', room: '', bgm: '', next: '', transition: '',
        fx: '', cg: '', voice: '', dialog: '', animation: '', loop: '',
        goNext: '', indenpent: '', signal: '', roomHotspot: '', options: []
    },
    option: {
        text: { zh: '', en: '' }, next: '', showif: {}, actions: []
    },
    templates: {
        meta: { name: '' },
        content: {
            speaker: { zh: '', en: '' }, headimage: '',
            text: { zh: '', en: '' }, room: '', bgm: '',
            transition: '', fx: '', cg: '', voice: ''
        },
        option: { text: { zh: '', en: '' }, next: '', showif: {}, actions: [] },
        action: { cmd: '', params: [] },
        default: {}
    }
};

let _contentConfig = null;

export async function loadContentConfig() {
    try { _contentConfig = await (await fetch('config/template-content.json')).json(); }
    catch { _contentConfig = null; }
}

function cc() { return _contentConfig || HARDCODED_CONTENT; }
function deepCopy(obj) { return JSON.parse(JSON.stringify(obj)); }

export function createOption(text, next) {
    const opt = deepCopy(cc().option);
    if (text) opt.text = text;
    if (next !== undefined) opt.next = next;
    return opt;
}

export function createNodeFromDefaults(id) {
    const node = deepCopy(cc().node);
    if (id !== undefined) node.id = String(id);
    return node;
}

export function createCurJson(name = 'Untitled') {
    const ch = deepCopy(cc().curJson);
    const allTpls = loadTemplates();
    ch.meta = { ...(allTpls.meta || {}) };
    if (name !== undefined) ch.meta.name = name;
    return ch;
}

export function createBlankCurJson(name = 'Untitled') {
    return {};
}

function getDefaultTemplates() {
    return cc().templates;
}

const HARDCODED_CONTEXTS = {
    meta: { label: '元数据', description: '章节元数据', match: 'meta', category: '元数据' },
    content: { label: '对话', description: '对话节点', match: 'content', category: '内容结构' },
    option: { label: '选项', description: '选项节点', match: 'content.*.options', category: '内容结构' },
    action: { label: '动作', description: '动作命令', match: '*.actions', category: '内容结构' },
    default: { label: '默认', description: '兜底模板', match: '*', category: '系统' },
};

export function getContextsConfig() {
    // 合并硬编码上下文和用户自定义模板
    const cfg = { ...HARDCODED_CONTEXTS };
    const tpls = loadEffectiveTemplates();
    for (const key of Object.keys(tpls)) {
        if (!(key in HARDCODED_CONTEXTS)) {
            cfg[key] = { label: key, description: '自定义模板', match: key, category: '自定义' };
        }
    }
    return cfg;
}
export function getContextKeys() { return Object.keys(getContextsConfig()).filter(k => k !== 'default'); }

export function resolveTemplateContext(path) {
    const str = path.join('.');
    for (const [key, cfg] of Object.entries(HARDCODED_CONTEXTS)) {
        if (key !== 'default') {
            // 单遍字符处理：* → .* (glob通配), . → \\. (字面点号), 其余特殊字符转义
            const reStr = '^' + cfg.match.replace(/[.+?^${}()|[\]\\*]/g, (m) => {
                if (m === '*') return '.*';
                if (m === '.') return '\\.';
                return '\\' + m;
            }) + '$';
            if (new RegExp(reStr).test(str)) return key;
        }
    }
    return 'default';
}

export function loadTemplates() {
    try {
        const schema = readSchema();
        const saved = schema?.templates || {};
        const defaults = getDefaultTemplates();
        return { ...defaults, ...saved };
    }
    catch { return { ...getDefaultTemplates() }; }
}

function loadDeletedTemplates() {
    try { const s = readSchema(); return s?.deletedTemplates || []; }
    catch { return []; }
}

function saveDeletedTemplates(arr) {
    const s = readSchema() || {};
    s.deletedTemplates = [...new Set(arr)];
    writeSchema(s);
}

export function loadTemplateKeys() {
    try { const s = readSchema(); return s?.templateKeys || {}; }
    catch { return {}; }
}

export function saveTemplateKeys(keys) {
    const s = readSchema() || {};
    s.templateKeys = keys;
    writeSchema(s);
}

export function loadEffectiveTemplates() {
    const merged = loadTemplates();
    const deleted = loadDeletedTemplates();
    for (const key of deleted) {
        delete merged[key];
    }
    return merged;
}

export function saveTemplates(tpls, deletedKeys = []) {
    const toSave = {};
    const defaults = getDefaultTemplates();
    for (const [k, v] of Object.entries(tpls)) {
        if (JSON.stringify(defaults[k]) !== JSON.stringify(v)) toSave[k] = v;
    }
    const s = readSchema() || {};
    s.templates = toSave;
    if (deletedKeys.length > 0) {
        const existing = loadDeletedTemplates();
        s.deletedTemplates = [...new Set([...existing, ...deletedKeys])];
    }
    writeSchema(s);
}

export function saveTemplate(ctx, tpl) { const all = loadTemplates(); all[ctx] = tpl; saveTemplates(all); }

export function createNodeFromTemplate(ctx, id) {
    const tpl = loadTemplates();
    const node = { ...(tpl[ctx] || tpl.default || {}) };
    // 根据结构类型定义补齐缺失的字段
    syncAllStructs(node);
    if (id !== undefined) node.id = String(id);
    return node;
}

// ==========================================
// 结构类型系统（Struct System）
// 允许用户定义多种"结构类型"，每种类型通过匹配规则找到目标对象，统一补齐字段
// 匹配方式：
//   struct — 对象含有指定属性键（marker）就算匹配
//   glob   — 属性名匹配 glob 通配模式（**.speaker = 任意层级的 speaker）
//   path   — 路径匹配（content.*.options）
// ==========================================

const DEFAULT_STRUCTS = [
    { id: 'i18n', label: '多语言文本', match: { type: 'struct', marker: 'zh' }, fields: ['zh', 'en'] }
];

export function loadStructs() {
    try {
        const schema = readSchema();
        const saved = schema?.structs || [];
        if (saved.length === 0) return JSON.parse(JSON.stringify(DEFAULT_STRUCTS));
        // 向后兼容：struct 类型的 marker 不在 fields 里时自动补入
        for (const s of saved) {
            if (s.match?.type === 'struct' && s.match.marker) {
                if (!s.fields.includes(s.match.marker)) {
                    s.fields.unshift(s.match.marker);
                }
            }
        }
        return saved;
    } catch { return JSON.parse(JSON.stringify(DEFAULT_STRUCTS)); }
}

export function saveStructs(structs) {
    const s = readSchema() || {};
    s.structs = structs;
    writeSchema(s);
}

/** 获取结构类型的完整有效字段列表 */
export function getEffectiveFields(structDef) {
    return structDef.fields || [];
}

/** 将路径数组转为用 . 连接的字符串（数字索引用 * 代替） */
function pathToString(segments) {
    return segments.map(s => typeof s === 'number' ? '*' : String(s)).join('.');
}

/**
 * Glob 路径匹配
 * 支持的语法：
 *   **     — 匹配零个或多个路径段
 *   *      — 匹配任意一个路径段
 *   字面量  — 精确匹配
 * 例子：
 *   **.speaker       → 匹配任何深度的 speaker
 *   content.*.options → 匹配 content[任意].options
 */
function matchGlobPath(segments, pattern) {
    if (!pattern) return false;
    const parts = pattern.split('.');
    const strPath = pathToString(segments);
    const pathParts = strPath.split('.');

    // 递归匹配
    const walk = (si, pi) => {
        // 都匹配完了
        if (si >= pathParts.length && pi >= parts.length) return true;
        // pattern 还有但路径没了：只有剩余的 ** 才合法
        if (si >= pathParts.length) {
            for (let i = pi; i < parts.length; i++) {
                if (parts[i] !== '**') return false;
            }
            return true;
        }
        // 路径还有但 pattern 没了 -> 不匹配
        if (pi >= parts.length) return false;

        const p = parts[pi];
        if (p === '**') {
            // ** 匹配零个或多个段：尝试跳过 0 到剩余所有
            for (let skip = 0; skip <= pathParts.length - si; skip++) {
                if (walk(si + skip, pi + 1)) return true;
            }
            return false;
        } else if (p === '*') {
            return walk(si + 1, pi + 1);
        } else {
            if (pathParts[si] !== p) return false;
            return walk(si + 1, pi + 1);
        }
    };

    return walk(0, 0);
}

/** 判断值是否与结构类型匹配（传入路径） */
function matchesStruct(val, structDef, currentPath) {
    if (!val || typeof val !== 'object' || Array.isArray(val)) return false;
    const m = structDef.match;
    switch (m.type) {
        case 'struct':
            return m.marker in val;
        case 'glob':
            return matchGlobPath(currentPath, m.pattern);
        case 'path':
            return matchGlobPath(currentPath, m.pattern);
        default:
            return false;
    }
}

/** 在数据树中查找所有匹配指定结构类型的 {path, value} */
export function findMatchingValues(obj, structDef, currentPath = []) {
    const results = [];
    if (!obj || typeof obj !== 'object') return results;

    if (matchesStruct(obj, structDef, currentPath)) {
        results.push({ path: [...currentPath], value: obj });
    }

    for (const [key, val] of Object.entries(obj)) {
        const seg = Array.isArray(obj) ? parseInt(key) : key;
        results.push(...findMatchingValues(val, structDef, [...currentPath, seg]));
    }
    return results;
}

/** 对一个结构类型，遍历树补齐缺失的字段 */
export function syncStruct(obj, structDef) {
    const matches = findMatchingValues(obj, structDef);
    const fields = getEffectiveFields(structDef);
    for (const { value } of matches) {
        for (const f of fields) {
            if (!(f in value)) value[f] = '';
        }
    }
}

/** 对所有结构类型遍历补齐（新增节点后调用） */
export function syncAllStructs(obj) {
    const structs = loadStructs();
    for (const s of structs) {
        syncStruct(obj, s);
    }
}

/**
 * 向指定结构类型添加字段，并同步已匹配的所有位置
 * @param {string} structId - 类型 id
 * @param {string} field - 新字段名
 * @param {object} curJson - 当前章节数据（遍历用）
 */
export function addStructField(structId, field, curJson) {
    if (!field) return;
    const structs = loadStructs();
    const s = structs.find(x => x.id === structId);
    if (!s) return;
    // struct 类型的 marker 不能重复添加
    if (s.match?.type === 'struct' && field === s.match.marker) return;
    const all = getEffectiveFields(s);
    if (all.includes(field)) return;
    s.fields.push(field);
    saveStructs(structs);
    if (curJson) {
        const matches = findMatchingValues(curJson, s);
        for (const { value } of matches) {
            if (!(field in value)) value[field] = '';
        }
    }
}

/**
 * 从结构类型中移除字段，并从当前 curJson 数据中清理该字段
 */
export function removeStructField(structId, field, curJson) {
    const structs = loadStructs();
    const s = structs.find(x => x.id === structId);
    if (!s) return;
    // struct 类型的 marker 不允许删除
    if (s.match.type === 'struct' && field === s.match.marker) return;
    s.fields = s.fields.filter(f => f !== field);
    saveStructs(structs);
    // 从 curJson 数据中删除该字段
    if (curJson) {
        const matches = findMatchingValues(curJson, s);
        for (const { value } of matches) {
            if (field in value) delete value[field];
        }
    }
}

/**
 * 删除整个结构类型，并从当前 curJson 数据中清理所有相关字段
 */
export function deleteStruct(structId, curJson) {
    const structs = loadStructs();
    const s = structs.find(x => x.id === structId);
    if (!s) return;
    // 内置类型不允许删除
    if (structId === 'i18n') return;
    // 先从 curJson 中清理所有字段（struct 类型的标记键不删除）
    if (curJson) {
        const matches = findMatchingValues(curJson, s);
        for (const { value } of matches) {
            for (const field of s.fields) {
                if (s.match.type === 'struct' && field === s.match.marker) continue;
                if (field in value) delete value[field];
            }
        }
    }
    // 再移除结构定义
    saveStructs(structs.filter(x => x.id !== structId));
}

// 语言相关（向后兼容包装器）
export function getLanguages() {
    const structs = loadStructs();
    const i18n = structs.find(s => s.id === 'i18n');
    return i18n ? getEffectiveFields(i18n) : ['zh', 'en'];
}
export function saveLanguages(langs) {
    // 从 i18n 结构类型更新字段（不包含 marker）
    const structs = loadStructs();
    const i18n = structs.find(s => s.id === 'i18n');
    if (i18n && i18n.match?.type === 'struct') {
        i18n.fields = langs; // 直接覆盖（marker 在 getLanguages 中保持逻辑）
        saveStructs(structs);
    }
}

export function isI18nObj(val) {
    return val && typeof val === 'object' && !Array.isArray(val) && 'zh' in val;
}

export function addLanguage(lang, curJson) {
    const structs = loadStructs();
    const i18n = structs.find(s => s.id === 'i18n');
    if (!i18n) return;
    const all = getEffectiveFields(i18n);
    if (all.includes(lang)) return;
    // 如果是 marker 则跳过（marker 不能被 addStructField 添加）
    if (i18n.match?.type === 'struct' && lang === i18n.match.marker) return;
    i18n.fields.push(lang);
    saveStructs(structs);
    if (curJson) {
        syncStruct(curJson, i18n);
    }
}

// 标签管理
export function loadLabels() {
    try { const c = readConfig(); return c?.labels || {}; } catch { return {}; }
}
export function saveLabel(key, label) {
    const all = loadLabels();
    all[key] = label;
    const c = readConfig() || {};
    c.labels = all;
    writeConfig(c);
}
export function getFieldLabel(key) { const custom = loadLabels(); return custom[key] || key; }

// 判断空值
export function isEmpty(val) {
    if (val === '' || val === undefined || val === null) return true;
    if (Array.isArray(val) && val.length === 0) return true;
    if (typeof val === 'object' && val.zh === '' && val.en === '') return true;
    return false;
}

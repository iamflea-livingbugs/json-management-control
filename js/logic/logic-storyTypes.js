// ==========================================
// storyTypes.js — 数据模型 & 常量定义（逻辑层）
// ==========================================

export function createI18nText(zh = '', en = '') {
    return { zh, en };
}

const HARDCODED_CONTENT = {
    chapter: {
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

export function createChapter(name = 'Untitled') {
    const ch = deepCopy(cc().chapter);
    const allTpls = loadTemplates();
    ch.meta = { ...(allTpls.meta || {}) };
    if (name !== undefined) ch.meta.name = name;
    return ch;
}

export function createBlankChapter(name = 'Untitled') {
    return {};
}

function getDefaultTemplates() {
    return cc().templates;
}

const HARDCODED_CONTEXTS = {
    meta: { label: '元数据', description: '章节元数据', match: 'meta' },
    content: { label: '对话', description: '对话节点', match: 'content' },
    option: { label: '选项', description: '选项节点', match: 'content.*.options' },
    action: { label: '动作', description: '动作命令', match: '*.actions' },
    default: { label: '默认', description: '兜底模板', match: '*' },
};

export function getContextsConfig() { return HARDCODED_CONTEXTS; }
export function getContextKeys() { return Object.keys(HARDCODED_CONTEXTS); }

export function resolveTemplateContext(path) {
    const str = path.join('.');
    for (const [key, cfg] of Object.entries(HARDCODED_CONTEXTS)) {
        if (key !== 'default' && new RegExp('^' + cfg.match.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$').test(str)) return key;
    }
    return 'default';
}

const TEMPLATE_KEY = 'storyeditor_templates';
const LABEL_STORAGE_KEY = 'storyeditor_labels';

export function loadTemplates() {
    try {
        const saved = JSON.parse(localStorage.getItem(TEMPLATE_KEY) || '{}');
        const defaults = getDefaultTemplates();
        return { ...defaults, ...saved };
    }
    catch { return { ...getDefaultTemplates() }; }
}

const DELETED_KEY = 'storyeditor_deleted_templates';

function loadDeletedTemplates() {
    try { return JSON.parse(localStorage.getItem(DELETED_KEY) || '[]'); }
    catch { return []; }
}

function saveDeletedTemplates(arr) {
    localStorage.setItem(DELETED_KEY, JSON.stringify([...new Set(arr)]));
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
    // 从保存结果中移除被删的默认模板（不存即表示使用默认值，删了才需要显式排除）
    // 但如果用户保存了一个空对象 {} 表示清空该模板
    localStorage.setItem(TEMPLATE_KEY, JSON.stringify(toSave));
    // 持久化删除列表
    if (deletedKeys.length > 0) {
        const existing = loadDeletedTemplates();
        saveDeletedTemplates([...new Set([...existing, ...deletedKeys])]);
    }
}

export function saveTemplate(ctx, tpl) { const all = loadTemplates(); all[ctx] = tpl; saveTemplates(all); }

export function createNodeFromTemplate(ctx, id) {
    const tpl = loadTemplates();
    const node = { ...(tpl[ctx] || tpl.default || {}) };
    if (id !== undefined) node.id = String(id);
    return node;
}

// 语言列表
export function getLanguages() {
    try { const saved = localStorage.getItem('storyeditor_languages'); if (saved) return JSON.parse(saved); } catch {}
    return ['zh', 'en'];
}
export function saveLanguages(langs) { localStorage.setItem('storyeditor_languages', JSON.stringify(langs)); }

// 标签管理
export function loadLabels() {
    try { return JSON.parse(localStorage.getItem(LABEL_STORAGE_KEY) || '{}'); } catch { return {}; }
}
export function saveLabel(key, label) { const all = loadLabels(); all[key] = label; localStorage.setItem(LABEL_STORAGE_KEY, JSON.stringify(all)); }
export function getFieldLabel(key) { const custom = loadLabels(); return custom[key] || key; }

// 判断空值
export function isEmpty(val) {
    if (val === '' || val === undefined || val === null) return true;
    if (Array.isArray(val) && val.length === 0) return true;
    if (typeof val === 'object' && val.zh === '' && val.en === '') return true;
    return false;
}

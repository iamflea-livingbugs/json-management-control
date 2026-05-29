// ==========================================
// storyTypes.js — 数据模型 & 常量定义
// ==========================================

// ---------- I18nText ----------
export function createI18nText(zh = '', en = '') {
    return { zh, en };
}

// ---------- StoryOption ----------
export function createOption(text = createI18nText(), next = '') {
    return {
        text,
        next,
        showif: {},
        actions: []
    };
}

// ---------- StoryNode ----------
export function createNode(id = '') {
    return {
        id,
        speaker: createI18nText(),
        text: createI18nText(),
        headimage: '',
        room: '',
        bgm: '',
        next: '',
        transition: '',
        fx: '',
        cg: '',
        voice: '',
        dialog: '',
        animation: '',
        loop: '',
        goNext: '',
        indenpent: '',
        signal: '',
        roomHotspot: '',
        options: []
    };
}

// ---------- Chapter ----------
export function createChapter(name = 'Untitled') {
    return {
        meta: { name },
        content: []
    };
}

// ---------- 已知字段列表（用于属性筛选和编辑UI）----------
export const NODE_FIELDS = [
    { key: 'id',           label: 'ID',           type: 'string' },
    { key: 'speaker',      label: '说话人',        type: 'i18n' },
    { key: 'headimage',    label: '头像',          type: 'string' },
    { key: 'text',         label: '文本',          type: 'i18n' },
    { key: 'room',         label: '场景/背景',     type: 'string' },
    { key: 'bgm',          label: 'BGM',          type: 'string' },
    { key: 'transition',   label: '过渡类型',      type: 'string' },
    { key: 'fx',           label: '特效',          type: 'string' },
    { key: 'cg',           label: 'CG',           type: 'string' },
    { key: 'voice',        label: '语音',          type: 'string' },
    { key: 'dialog',       label: '打字机文本',     type: 'string' },
    { key: 'animation',    label: '动画',          type: 'string' },
    { key: 'loop',         label: '循环动画',      type: 'string' },
    { key: 'next',         label: '跳转ID',        type: 'string' },
    { key: 'goNext',       label: 'goNext模式',    type: 'string' },
    { key: 'indenpent',    label: '独立模式',      type: 'string' },
    { key: 'signal',       label: '信号',          type: 'string' },
    { key: 'roomHotspot',  label: '房间热点',      type: 'string' },
];

// 可筛选的字段（下拉选项来源）
export const FILTERABLE_FIELDS = ['speaker', 'headimage', 'fx', 'bgm', 'room', 'animation'];

// ---------- 标签编辑 ----------
const LABEL_STORAGE_KEY = 'storyeditor_labels';

export function loadLabels() {
    try {
        const raw = localStorage.getItem(LABEL_STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
}

export function saveLabel(key, label) {
    const all = loadLabels();
    all[key] = label;
    localStorage.setItem(LABEL_STORAGE_KEY, JSON.stringify(all));
}

export function getFieldLabel(key) {
    const custom = loadLabels();
    if (custom[key]) return custom[key];
    const def = NODE_FIELDS.find(f => f.key === key);
    return def ? def.label : key;
}

// ---------- 节点模板 ----------
const TEMPLATE_KEY = 'storyeditor_templates';

/** 各上下文默认模板 */
export const DEFAULT_TEMPLATES = {
    content: {
        speaker: { zh: '', en: '' },
        headimage: '',
        text: { zh: '', en: '' },
        room: '',
        bgm: '',
        transition: '',
        fx: '',
        cg: '',
        voice: '',
    },
    option: {
        text: { zh: '', en: '' },
        next: '',
        showif: {},
        actions: [],
    },
    action: {
        cmd: '',
        params: [],
    },
    default: {},
};

/**
 * 根据路径解析模板上下文 key
 * content      → content
 * content.*.options  → option
 * content.*.options.*.actions → action
 * 其他         → default
 */
export function resolveTemplateContext(path) {
    const str = path.join('.');
    if (str === 'content') return 'content';
    if (/^content\.\d+\.options(\.\d+)?$/.test(str)) return 'option';
    if (/^content\.\d+\.options\.\d+\.actions$/.test(str)) return 'action';
    if (/actions$/.test(str)) return 'action';
    if (/options(\.\d+)?$/.test(str)) return 'option';
    return 'default';
}

/** 加载全部模板 */
export function loadTemplates() {
    try {
        const raw = localStorage.getItem(TEMPLATE_KEY);
        const saved = raw ? JSON.parse(raw) : {};
        return { ...DEFAULT_TEMPLATES, ...saved };
    } catch { return { ...DEFAULT_TEMPLATES }; }
}

/** 保存全部模板 */
export function saveTemplates(tpls) {
    // 只保存跟默认不同的
    const toSave = {};
    for (const [k, v] of Object.entries(tpls)) {
        const def = JSON.stringify(DEFAULT_TEMPLATES[k] || {});
        const cur = JSON.stringify(v);
        if (def !== cur) toSave[k] = v;
    }
    localStorage.setItem(TEMPLATE_KEY, JSON.stringify(toSave));
}

/** 获取某个上下文的模板 */
export function loadTemplate(ctx) {
    const all = loadTemplates();
    return all[ctx] || all.default || {};
}

/** 保存某个上下文的模板 */
export function saveTemplate(ctx, tpl) {
    const all = loadTemplates();
    all[ctx] = tpl;
    saveTemplates(all);
}

/** 用模板创建节点 */
export function createNodeFromTemplate(ctx, id) {
    const tpl = loadTemplate(ctx);
    const node = { ...tpl };
    if (id !== undefined) node.id = String(id);
    return node;
}

// 导出时从节点上清理的"空值键"
const I18N_EMPTY = { zh: '', en: '' };
export function isEmpty(val) {
    if (val === '' || val === undefined || val === null) return true;
    if (Array.isArray(val) && val.length === 0) return true;
    if (typeof val === 'object' && val.zh === '' && val.en === '') return true;
    return false;
}

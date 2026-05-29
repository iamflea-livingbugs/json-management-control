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

// 导出时从节点上清理的"空值键"：值为 '' / [] / {} / undefined 的字段会被去掉
const I18N_EMPTY = { zh: '', en: '' };
export function isEmpty(val) {
    if (val === '' || val === undefined || val === null) return true;
    if (Array.isArray(val) && val.length === 0) return true;
    if (typeof val === 'object' && val.zh === '' && val.en === '') return true;
    return false;
}

// ==========================================
// storyTypes.js — 数据模型 & 常量定义
// 职责：
//   1. 定义章节/节点/选项的默认数据结构（HARDCODED_CONTENT）
//   2. 加载 JSON 配置文件（template-content.json / template-contexts.json）
//   3. 提供创建函数（createChapter / createNode / createOption）
//   4. 管理模板（Templates）的读写（localStorage）
//   5. 管理字段标签别名（localStorage）
// ==========================================

// ---------- I18nText 双语文本结构 ----------
// 项目中所有需要双语显示的字段都是 { zh: '', en: '' } 格式
export function createI18nText(zh = '', en = '') {
    return { zh, en };
}

// ========================
// 配置系统：JSON 驱动
// 数据结构来源优先级：
//   config/template-content.json 文件 > HARDCODED_CONTENT（硬编码兜底）
// ========================

// ----- 硬编码默认结构（当 config/template-content.json 加载失败时回退） -----
const HARDCODED_CONTENT = {
    // 章节/文档根结构
    chapter: {
        meta: {
            name: 'Untitled',
            author: '',
            description: '',
        }, content: []
    },
    // 对话节点结构（数组中的每个元素）
    node: {
        id: '',                     // 节点唯一标识
        speaker: { zh: '', en: '' }, // 说话人
        text: { zh: '', en: '' },    // 对话文本
        headimage: '',              // 头像图片路径
        room: '',                   // 场景/背景图
        bgm: '',                    // 背景音乐
        next: '',                   // 跳转到下一个节点 ID
        transition: '',             // 转场类型
        fx: '',                     // 特效
        cg: '',                     // CG 立绘
        voice: '',                  // 语音文件
        dialog: '',                 // 打字机效果文本（与 text 区分）
        animation: '',              // 动画
        loop: '',                   // 循环动画
        goNext: '',                 // 自动跳转模式
        indenpent: '',             // 独立模式标记
        signal: '',                 // 信号/触发器
        roomHotspot: '',            // 场景热点
        options: []                 // 选项分支
    },
    // 选项结构（options 数组中的元素）
    option: {
        text: { zh: '', en: '' },   // 选项文本
        next: '',                   // 选择后跳转的节点 ID
        showif: {},                 // 显示条件
        actions: []                 // 选择后触发的动作列表
    },
    // 模板结构（各上下文的默认模板字段）
    templates: {
        meta: { name: '' },                                              // 章节元数据模板
        content: {
            speaker: { zh: '', en: '' }, headimage: '',           // 对话节点模板
            text: { zh: '', en: '' }, room: '', bgm: '',
            transition: '', fx: '', cg: '', voice: ''
        },
        option: {
            text: { zh: '', en: '' }, next: '', showif: {},       // 选项模板
            actions: []
        },
        action: { cmd: '', params: [] },                                 // 动作模板
        default: {}                                                      // 兜底模板
    }
};

let _contentConfig = null; // 缓存从文件加载的内容配置

// 从 config/template-content.json 加载内容配置
export async function loadContentConfig() {
    try {
        _contentConfig = await (await fetch('config/template-content.json')).json();
    } catch { _contentConfig = null; } // 失败不阻塞，后续用 HARDCODED_CONTENT
}

// 获取当前内容配置（优先用文件配置，失败用硬编码）
function cc() { return _contentConfig || HARDCODED_CONTENT; }

// 深拷贝工具——确保每次创建都是独立对象，不引用同一份
function deepCopy(obj) { return JSON.parse(JSON.stringify(obj)); }

// ----- 创建函数 -----

// 创建空选项
export function createOption(text, next) {
    const opt = deepCopy(cc().option);
    if (text) opt.text = text;
    if (next !== undefined) opt.next = next;
    return opt;
}

// 按模板创建对话节点（模板来自 template-content.json 或 localStorage 中用户自定义的模板）
export function createNodeFromDefaults(id) {
    const node = deepCopy(cc().node);
    if (id !== undefined) node.id = String(id);
    return node;
}

// 按模板创建完整章节（含 meta 和空 content 数组）
export function createChapter(name = 'Untitled') {
    const ch = deepCopy(cc().chapter);
    const allTpls = loadTemplates();
    ch.meta = { ...(allTpls.meta || {}) };
    if (name !== undefined) ch.meta.name = name;
    return ch;
}

// 创建空白章节——仅返回 {}，没有任何模板字段
// 用于"新建 > 空白 JSON"选项
export function createBlankChapter(name = 'Untitled') {
    return {  };
}

// ----- 模板默认值（从配置文件读取）-----
function getDefaultTemplates() {
    return cc().templates;
}

// ========================
// 上下文配置系统
// 定义树形路径与模板上下文的匹配规则
// 例如：路径 "content.0.options" 匹配上下文 "option"
// ========================

// 硬编码上下文配置（config/template-contexts.json 加载失败时的回退）
const HARDCODED_CONTEXTS = {
    meta: { label: '元数据', description: '章节元数据', match: 'meta' },
    content: { label: '对话', description: '对话节点', match: 'content' },
    option: { label: '选项', description: '选项节点', match: 'content.*.options' },
    action: { label: '动作', description: '动作命令', match: '*.actions' },
    default: { label: '默认', description: '兜底模板', match: '*' },
};

let _contextsConfig = null; // 缓存上下文配置

// 从 config/template-contexts.json 加载上下文配置
export async function loadContextsConfig() {
    try {
        _contextsConfig = await (await fetch('config/template-contexts.json')).json();
    } catch { _contextsConfig = null; }
}

// 获取当前上下文配置
export function getContextsConfig() {
    return _contextsConfig || HARDCODED_CONTEXTS;
}

// 获取所有上下文键名（如 ['meta', 'content', 'option', 'action', 'default']）
export function getContextKeys() {
    return Object.keys(getContextsConfig());
}

// 根据树形路径解析所属的模板上下文
// 例如：path=['content', '0', 'options', '0'] → match 'content.*.options' → 返回 'option'
export function resolveTemplateContext(path) {
    const str = path.join('.');
    for (const [key, cfg] of Object.entries(getContextsConfig())) {
        if (key !== 'default' && new RegExp('^' + cfg.match.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$').test(str)) {
            return key;
        }
    }
    return 'default';
}

// ========================
// localStorage 持久化
// ========================

const CONFIG_KEY = 'storyeditor_config';       // 上下文配置存储键
const TEMPLATE_KEY = 'storyeditor_templates';  // 用户自定义模板存储键
const LABEL_STORAGE_KEY = 'storyeditor_labels'; // 字段标签别名存储键

// ----- 上下文配置持久化 -----

// 从 localStorage 读取用户保存过的上下文配置
export function loadSavedConfig() {
    try {
        const raw = localStorage.getItem(CONFIG_KEY);
        if (raw) { _contextsConfig = JSON.parse(raw); return true; }
    } catch { }
    return false;
}

// 保存上下文配置到 localStorage
export function saveConfigToLocal(config) {
    _contextsConfig = config;
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

// 导出上下文配置为 .json 文件下载
export function exportConfigJSON() {
    const blob = new Blob([JSON.stringify(getContextsConfig(), null, 4)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'template-contexts.json';
    a.click();
}

// ----- 模板持久化 -----

// 加载所有模板：合并默认模板 + 用户自定义模板中覆盖的部分
export function loadTemplates() {
    try {
        const saved = JSON.parse(localStorage.getItem(TEMPLATE_KEY) || '{}');
        return { ...getDefaultTemplates(), ...saved };
    } catch { return { ...getDefaultTemplates() }; }
}

// 保存所有模板到 localStorage（仅存储与默认不同的部分，节省空间）
export function saveTemplates(tpls) {
    const toSave = {};
    const defaults = getDefaultTemplates();
    for (const [k, v] of Object.entries(tpls)) {
        if (JSON.stringify(defaults[k]) !== JSON.stringify(v)) toSave[k] = v;
    }
    localStorage.setItem(TEMPLATE_KEY, JSON.stringify(toSave));
}

// 保存指定上下文的单个模板
export function saveTemplate(ctx, tpl) {
    const all = loadTemplates();
    all[ctx] = tpl;
    saveTemplates(all);
}

// 根据上下文和 ID 创建节点（使用用户自定义模板）
export function createNodeFromTemplate(ctx, id) {
    const tpl = loadTemplates();
    const node = { ...(tpl[ctx] || tpl.default || {}) };
    if (id !== undefined) node.id = String(id);
    return node;
}

// ========================
// 字段定义与标签管理
// ========================

// 所有内置字段的定义列表（key = 字段名，label = 显示名，type = 值的类型）
export const NODE_FIELDS = [
    { key: 'id', label: 'ID', type: 'string' },
    { key: 'speaker', label: '说话人', type: 'i18n' },
    { key: 'headimage', label: '头像', type: 'string' },
    { key: 'text', label: '文本', type: 'i18n' },
    { key: 'room', label: '场景/背景', type: 'string' },
    { key: 'bgm', label: 'BGM', type: 'string' },
    { key: 'transition', label: '过渡类型', type: 'string' },
    { key: 'fx', label: '特效', type: 'string' },
    { key: 'cg', label: 'CG', type: 'string' },
    { key: 'voice', label: '语音', type: 'string' },
    { key: 'dialog', label: '打字机文本', type: 'string' },
    { key: 'animation', label: '动画', type: 'string' },
    { key: 'loop', label: '循环动画', type: 'string' },
    { key: 'next', label: '跳转ID', type: 'string' },
    { key: 'goNext', label: 'goNext模式', type: 'string' },
    { key: 'indenpent', label: '独立模式', type: 'string' },
    { key: 'signal', label: '信号', type: 'string' },
    { key: 'roomHotspot', label: '房间热点', type: 'string' },
];

// 从 localStorage 读取用户自定义的字段标签别名
export function loadLabels() {
    try { return JSON.parse(localStorage.getItem(LABEL_STORAGE_KEY) || '{}'); }
    catch { return {}; }
}

// 保存单个字段的标签别名（用户双击改名时触发）
export function saveLabel(key, label) {
    const all = loadLabels();
    all[key] = label;
    localStorage.setItem(LABEL_STORAGE_KEY, JSON.stringify(all));
}

// 获取字段的显示名：优先返回用户自定义的名称，其次返回内置默认名，最后返回 key 本身
export function getFieldLabel(key) {
    const custom = loadLabels();
    if (custom[key]) return custom[key];
    const def = NODE_FIELDS.find(f => f.key === key);
    return def ? def.label : key;
}

// 判断值是否为空（空字符串、空数组、空对象、null/undefined 均视为空）
// 注：{ zh: '', en: '' } 这种双语空对象也视为空
export function isEmpty(val) {
    if (val === '' || val === undefined || val === null) return true;
    if (Array.isArray(val) && val.length === 0) return true;
    if (typeof val === 'object' && val.zh === '' && val.en === '') return true;
    return false;
}

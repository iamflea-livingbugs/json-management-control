// ==========================================
// storyChapterView.js — 章节对话列表视图
// 以列表形式展示当前路径下的数据
// 数组按索引逐行展示，对象按属性逐行展示
// ==========================================

import { getLanguages, getContextKeys, getContextsConfig, loadEffectiveTemplates, loadTemplateKeys } from '../logic/logic-storyTypes.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function loadColumnConfig() {
    try { return JSON.parse(localStorage.getItem('storyeditor_chapter_cols') || '["speaker","text"]'); }
    catch { return ['speaker', 'text']; }
}

function saveColumnConfig(cols) {
    localStorage.setItem('storyeditor_chapter_cols', JSON.stringify(cols));
}

// 为不同说话人生成固定颜色
const _speakerColorCache = {};
function speakerColor(name) {
    if (!name) return 'var(--accent)';
    if (_speakerColorCache[name]) return _speakerColorCache[name];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    const color = `hsl(${hue}, 55%, 50%)`;
    _speakerColorCache[name] = color;
    return color;
}

/**
 * 新增属性弹窗（对象模式）
 */
function showAddPropertyModal(dataPath, store, templateCtx) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `<div class="modal-box" style="width:400px">
        <div class="modal-header"><h2>${templateCtx ? `添加属性（${templateCtx} 模板）` : '添加自定义属性'}</h2><button class="modal-close" id="prop-close">✕</button></div>
        <div class="modal-body">
            <div style="margin-bottom:12px">
                <label style="display:block;margin-bottom:4px;font-size:0.8125rem;color:var(--text-dim)">属性名称</label>
                <input id="prop-key" class="input" placeholder="key" style="width:100%;font-family:var(--font-mono)" autofocus />
            </div>
            ${!templateCtx ? `<div>
                <label style="display:block;margin-bottom:4px;font-size:0.8125rem;color:var(--text-dim)">类型</label>
                <select id="prop-type" class="input-sm" style="width:100%">
                    <option value="string">字符串</option>
                    <option value="number">数字</option>
                    <option value="object">对象 {}</option>
                    <option value="array">数组 []</option>
                </select>
            </div>` : `<div style="font-size:0.8125rem;color:var(--text-dim)">将使用 "${templateCtx}" 模板填充属性值</div>`}
        </div>
        <div class="modal-footer">
            <button class="btn btn-sm" id="prop-cancel">取消</button>
            <button class="btn btn-sm btn-primary" id="prop-ok">确定</button>
        </div>
    </div>`;
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('open'));

    const close = () => { modal.classList.remove('open'); setTimeout(() => modal.remove(), 200); };
    modal.querySelector('#prop-close').onclick = close;
    modal.querySelector('#prop-cancel').onclick = close;
    modal.addEventListener('click', e => { if (e.target === modal) close(); });

    modal.querySelector('#prop-ok').onclick = () => {
        const key = modal.querySelector('#prop-key').value.trim();
        if (!key) { modal.querySelector('#prop-key').focus(); return; }
        if (templateCtx) {
            // 使用模板创建
            const allTpls = loadEffectiveTemplates();
            const tpl = allTpls[templateCtx] || {};
            const val = JSON.parse(JSON.stringify(tpl));
            delete val.id;
            store.addObjectProperty(dataPath, key, val);
        } else {
            // 自定义类型
            const type = modal.querySelector('#prop-type').value;
            const defaultValue = type === 'number' ? 0 : type === 'array' ? [] : type === 'object' ? {} : '';
            store.addObjectProperty(dataPath, key, defaultValue);
        }
        close();
        renderChapterView(store);
    };

    modal.querySelector('#prop-key').addEventListener('keydown', e => {
        if (e.key === 'Enter') modal.querySelector('#prop-ok').click();
    });
}

/** 判断一个值是否为 i18n 对象（含有 zh/en 语言子键） */
function isI18n(val) {
    return val && typeof val === 'object' && !Array.isArray(val) && 'zh' in val;
}

/**
 * 渲染章节对话列表
 * 数组 → 逐行展示每条记录
 * 对象 → 逐行展示每个属性
 */
export function renderChapterView(store) {
    const container = $('#panel-chapter');
    if (!container) return;

    const path = store.currentPath || [];
    const val = store.getByPath(path);
    const dataPath = path.length > 0 ? path : [];

    const isArrayMode = Array.isArray(val);

    if (!isArrayMode && (typeof val !== 'object' || val === null)) {
        container.innerHTML = `<div class="empty-hint" style="padding:40px 12px">当前路径不是对象或数组（${path.join(' → ') || '(root)'}），无法以列表视图展示</div>`;
        return;
    }

    // entries = [ [rowKey, node], ... ]
    const entries = isArrayMode
        ? val.map((item, i) => [String(i), item])
        : Object.entries(val);

    const cols = loadColumnConfig();
    const languages = getLanguages();
    const ctxKeys = getContextKeys();
    const ctxConfig = getContextsConfig();

    // 头部
    const pathLabel = dataPath.join(' → ') || '(root)';
    const ctxOptions = ctxKeys.map(k => {
        const cfg = ctxConfig[k] || {};
        return `<option value="${k}">${cfg.label || k}</option>`;
    }).join('');
    // 路径 → 类型映射
    let typeLabel = '';
    if (Array.isArray(val)) typeLabel = '[]';
    else if (val && typeof val === 'object' && val !== null) typeLabel = '{}';
    else typeLabel = typeof val;

    let html = `<div class="chapter-toolbar">
        <span class="chapter-count">${pathLabel}</span>
        <span class="chapter-type-badge">${esc(typeLabel)}</span>
        <span class="chapter-count">· 共 ${entries.length} 条</span>
        <button class="btn btn-sm" id="btn-chapter-cols">⚙️ 显示列</button>
        <select id="chapter-ctx-select" class="input-sm">${ctxOptions}</select>
        <button class="btn btn-sm btn-success" id="btn-chapter-add">＋ 新增</button>
        ${!isArrayMode ? `<button class="btn btn-sm" id="btn-chapter-add-custom">＋ 自定义</button>` : ''}
    </div>`;

    if (entries.length === 0) {
        html += '<div class="empty-hint" style="padding:40px 12px">当前路径下无数据，点击"＋"添加</div>';
    } else {
        html += '<div class="chapter-list">';
        entries.forEach(([rowKey, node]) => {
            const isArr = isArrayMode;
            const speakerStr = typeof node?.speaker === 'object' ? (node.speaker.zh || '') : (node?.speaker || '');
            const badgeText = isArr
                ? (speakerStr || '?').charAt(0) || '?'
                : String(rowKey).charAt(0).toUpperCase() || '?';
            const badgeColor = isArr
                ? speakerColor(speakerStr)
                : 'var(--accent)';

            // 动态生成列
            let cellsHtml = '';
            cols.forEach(col => {
                if (col === 'speaker') return; // speaker 列固定处理
                const fieldVal = node[col];

                if (isI18n(fieldVal)) {
                    languages.forEach(lang => {
                        const langVal = fieldVal[lang] || '';
                        cellsHtml += `<div class="chapter-col chapter-col-${esc(col)}.${esc(lang)}" data-i18n-field="${esc(col)}" data-lang="${esc(lang)}">
                            <input class="chapter-cell-input chapter-i18n-input" data-key="${esc(rowKey)}" data-field="${esc(col)}" data-lang="${esc(lang)}" value="${esc(langVal)}" placeholder="${esc(lang)}" />
                        </div>`;
                    });
                } else if (fieldVal === null || fieldVal === undefined) {
                    cellsHtml += `<div class="chapter-col chapter-col-${esc(col)}">
                        <input class="chapter-cell-input chapter-cell-null" data-key="${esc(rowKey)}" data-field="${esc(col)}" value="" placeholder="—" />
                    </div>`;
                } else if (typeof fieldVal === 'object') {
                    cellsHtml += `<div class="chapter-col chapter-col-${esc(col)}">
                        <span class="chapter-cell-display">${esc(JSON.stringify(fieldVal))}</span>
                    </div>`;
                } else {
                    cellsHtml += `<div class="chapter-col chapter-col-${esc(col)}">
                        <input class="chapter-cell-input chapter-simple-input" data-key="${esc(rowKey)}" data-field="${esc(col)}" value="${esc(String(fieldVal))}" />
                    </div>`;
                }
            });

            // 标识行（数组用 data-index，对象用 data-key）
            const rowAttr = isArr
                ? `data-index="${esc(rowKey)}" data-array="true"`
                : `data-key="${esc(rowKey)}"`;

            html += `<div class="chapter-row" ${rowAttr} data-id="${esc(node.id || rowKey)}">
                <div class="chapter-row-main">
                    <span class="chapter-speaker-badge" style="background:${badgeColor}">${esc(badgeText)}</span>
                    <div class="chapter-cols">
                        <div class="chapter-col-speaker">
                            ${isArr
                                ? `<input class="chapter-speaker-input" data-key="${esc(rowKey)}" value="${esc(node?.speaker?.zh || node?.speaker || '')}" placeholder="说话人" />`
                                : `<span class="chapter-key-label">${esc(rowKey)}</span>`
                            }
                        </div>
                        ${cellsHtml}
                    </div>
                    <button class="btn-icon chapter-open-btn" data-key="${esc(rowKey)}" data-array="${isArr}" title="打开完整编辑">▶</button>
                </div>
            </div>`;
        });
        html += '</div>';
    }

    container.innerHTML = html;

    // ===== 事件绑定 =====

    // 列配置
    $('#btn-chapter-cols')?.addEventListener('click', () => {
        let colHtml = '<div style="margin-bottom:8px">选择要在列表中显示的字段：</div>';
        const fieldSet = new Set();
        entries.forEach(([, node]) => { if (node && typeof node === 'object') Object.keys(node).forEach(k => fieldSet.add(k)); });
        colHtml += [...fieldSet].map(f => `
            <label style="display:block;margin:4px 0">
                <input type="checkbox" value="${esc(f)}" ${cols.includes(f) ? 'checked' : ''} /> ${esc(f)}
            </label>
        `).join('');
        colHtml += `<div style="margin-top:8px;font-size:0.75rem;color:var(--text-dim)">提示：i18n 字段会根据语言设置自动展开为多列</div>`;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `<div class="modal-box" style="width:360px">
            <div class="modal-header"><h2>显示列设置</h2><button class="modal-close" id="col-close">✕</button></div>
            <div class="modal-body">${colHtml}</div>
            <div class="modal-footer">
                <button class="btn btn-sm" id="col-cancel">取消</button>
                <button class="btn btn-sm btn-primary" id="col-ok">确定</button>
            </div>
        </div>`;
        document.body.appendChild(modal);
        requestAnimationFrame(() => modal.classList.add('open'));
        const closeModal = () => { modal.classList.remove('open'); setTimeout(() => modal.remove(), 200); };
        modal.querySelector('#col-close').onclick = closeModal;
        modal.querySelector('#col-cancel').onclick = closeModal;
        modal.querySelector('#col-ok').onclick = () => {
            const checked = [...modal.querySelectorAll('input[type=checkbox]:checked')].map(c => c.value);
            saveColumnConfig(checked);
            closeModal();
            renderChapterView(store);
        };
        modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    });

    // 新增行（从下拉框读取模板上下文）
    $('#btn-chapter-add')?.addEventListener('click', () => {
        const ctx = $('#chapter-ctx-select')?.value || 'content';
        if (isArrayMode) {
            store.addNode(ctx, dataPath);
            renderChapterView(store);
        } else {
            // 对象模式：按模板的自动增长键名规则生成不重复的键名
            const allTpls = loadEffectiveTemplates();
            const tpl = allTpls[ctx] || {};
            const tplKeys = loadTemplateKeys();
            const keyPattern = tplKeys[ctx] || '';
            const parent = store.getByPath(dataPath) || {};
            const existingKeys = Object.keys(parent);

            let baseKey = keyPattern || '';
            const match = baseKey.match(/^(.*?)(\d+)$/);
            if (match) {
                baseKey = match[1];
                let startNum = parseInt(match[2]);
                const maxN = existingKeys.reduce((max, k) => {
                    const m = k.match(new RegExp('^' + baseKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\d+)$'));
                    return m ? Math.max(max, parseInt(m[1]) + 1) : max;
                }, 0);
                let n = Math.max(startNum, maxN);
                let key = baseKey + String(n);
                while (key in parent) {
                    n++;
                    key = baseKey + String(n);
                }
                const templateVal = JSON.parse(JSON.stringify(tpl));
                delete templateVal.id;
                store.addObjectProperty(dataPath, key, templateVal);
                renderChapterView(store);
                return;
            }

            let n = 0;
            let key;
            if (baseKey) {
                const maxN = existingKeys.reduce((max, k) => {
                    const m = k.match(new RegExp('^' + baseKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\d+)$'));
                    return m ? Math.max(max, parseInt(m[1]) + 1) : max;
                }, 0);
                n = maxN;
                key = baseKey + String(n);
                while (key in parent) { n++; key = baseKey + String(n); }
            } else {
                while (String(n) in parent) n++;
                key = String(n);
            }
            const templateVal = JSON.parse(JSON.stringify(tpl));
            delete templateVal.id;
            store.addObjectProperty(dataPath, key, templateVal);
            renderChapterView(store);
        }
    });

    // 自定义属性（仅对象模式）
    $('#btn-chapter-add-custom')?.addEventListener('click', () => {
        showAddPropertyModal(dataPath, store, null);
    });

    // 说话人输入（仅数组模式有）
    $$('.chapter-speaker-input').forEach(inp => {
        inp.addEventListener('change', () => {
            const key = inp.dataset.key;
            const node = val[parseInt(key)];
            if (!node) return;
            if (typeof node.speaker !== 'object') node.speaker = { zh: '', en: '' };
            node.speaker.zh = inp.value;
            store._emit();
        });
    });

    // i18n 输入
    $$('.chapter-i18n-input').forEach(inp => {
        inp.addEventListener('change', () => {
            const key = inp.dataset.key;
            const field = inp.dataset.field;
            const lang = inp.dataset.lang;
            const node = isArrayMode ? val[parseInt(key)] : val[key];
            if (!node) return;
            if (typeof node[field] !== 'object') node[field] = {};
            node[field][lang] = inp.value;
            store._emit();
        });
    });

    // 普通字段输入
    $$('.chapter-simple-input').forEach(inp => {
        inp.addEventListener('change', () => {
            const key = inp.dataset.key;
            const field = inp.dataset.field;
            const node = isArrayMode ? val[parseInt(key)] : val[key];
            if (!node) return;
            const raw = inp.value;
            node[field] = (/^\d+$/.test(raw) && !isNaN(raw)) ? Number(raw) : raw;
            store._emit();
        });
    });

    // 打开完整编辑
    $$('.chapter-open-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const key = btn.dataset.key;
            const node = isArrayMode ? val[parseInt(key)] : val[key];
            if (!node) return;
            store.currentPath = [...dataPath, key];
            store._emit();
            const formTab = document.getElementById('tab-form');
            if (formTab) formTab.click();
        });
    });

    // 双击行编辑
    $$('.chapter-row').forEach(row => {
        row.addEventListener('dblclick', () => {
            const key = isArrayMode ? row.dataset.index : row.dataset.key;
            if (key === undefined) return;
            const node = isArrayMode ? val[parseInt(key)] : val[key];
            if (!node) return;
            store.currentPath = [...dataPath, key];
            store._emit();
            const formTab = document.getElementById('tab-form');
            if (formTab) formTab.click();
        });
    });
}

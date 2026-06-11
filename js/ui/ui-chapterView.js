// ==========================================
// storyChapterView.js — 章节对话列表视图
// 以列表形式展示 content 数组，快速编辑对白
// ==========================================

import { getLanguages } from '../logic/logic-storyTypes.js';
import { showTemplatePicker } from './ui-createDialog.js';

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

/** 判断一个值是否为 i18n 对象（含有 zh/en 语言子键） */
function isI18n(val) {
    return val && typeof val === 'object' && !Array.isArray(val) && 'zh' in val;
}

/**
 * 渲染章节对话列表
 */
export function renderChapterView(store) {
    const container = $('#panel-chapter');
    if (!container) return;

    const chapter = store.chapter;
    const content = chapter?.content || [];
    const cols = loadColumnConfig();
    const languages = getLanguages();

    // 头部
    let html = `<div class="chapter-toolbar">
        <span class="chapter-count">共 ${content.length} 句对白</span>
        <button class="btn btn-sm" id="btn-chapter-cols">⚙️ 显示列</button>
        <button class="btn btn-sm btn-success" id="btn-chapter-add">＋ 新增</button>
    </div>`;

    if (content.length === 0) {
        html += '<div class="empty-hint" style="padding:40px 12px">暂无对白，点击"＋ 新增"添加第一句</div>';
    } else {
        html += '<div class="chapter-list">';
        content.forEach((node, rowIdx) => {
            const speaker = node.speaker?.zh || node.speaker || '';
            const initial = speaker.charAt(0) || '?';
            const color = speakerColor(speaker);

            // 动态生成列：每个 col 展开为一个或多个子列
            let cellsHtml = '';
            cols.forEach(col => {
                if (col === 'speaker') return; // speaker 固定处理
                const val = node[col];

                if (isI18n(val)) {
                    // i18n 对象：为每种语言生成一列
                    languages.forEach(lang => {
                        const fieldId = `${col}.${lang}`;
                        const langVal = val[lang] || '';
                        cellsHtml += `<div class="chapter-col chapter-col-${esc(fieldId)}" data-i18n-field="${esc(col)}" data-lang="${esc(lang)}">
                            <input class="chapter-cell-input chapter-i18n-input" data-row="${rowIdx}" data-field="${esc(col)}" data-lang="${esc(lang)}" value="${esc(langVal)}" placeholder="${esc(lang)}" />
                        </div>`;
                    });
                } else if (val === null || val === undefined) {
                    cellsHtml += `<div class="chapter-col chapter-col-${esc(col)}">
                        <input class="chapter-cell-input chapter-cell-null" data-row="${rowIdx}" data-field="${esc(col)}" value="" placeholder="—" />
                    </div>`;
                } else if (typeof val === 'object') {
                    // 数组/对象 → 只读展示
                    cellsHtml += `<div class="chapter-col chapter-col-${esc(col)}">
                        <span class="chapter-cell-display">${esc(JSON.stringify(val))}</span>
                    </div>`;
                } else {
                    // 基本类型
                    cellsHtml += `<div class="chapter-col chapter-col-${esc(col)}">
                        <input class="chapter-cell-input" data-row="${rowIdx}" data-field="${esc(col)}" value="${esc(String(val))}" />
                    </div>`;
                }
            });

            html += `<div class="chapter-row" data-index="${rowIdx}" data-id="${esc(node.id)}">
                <div class="chapter-row-main">
                    <span class="chapter-speaker-badge" style="background:${color}">${esc(initial)}</span>
                    <div class="chapter-cols">
                        <div class="chapter-col-speaker">
                            <input class="chapter-speaker-input" data-row="${rowIdx}" value="${esc(speaker)}" placeholder="说话人" />
                        </div>
                        ${cellsHtml}
                    </div>
                    <button class="btn-icon chapter-open-btn" data-row="${rowIdx}" title="打开完整编辑">▶</button>
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
        const fieldSet = new Set(['speaker', 'text']);
        content.forEach(n => { if (n && typeof n === 'object') Object.keys(n).forEach(k => fieldSet.add(k)); });
        colHtml += [...fieldSet].map(f => `
            <label style="display:block;margin:4px 0">
                <input type="checkbox" value="${esc(f)}" ${cols.includes(f) ? 'checked' : ''} /> ${esc(f)}
            </label>
        `).join('');
        // i18n 字段会按语言展开多列
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

    // 新增行
    $('#btn-chapter-add')?.addEventListener('click', async () => {
        const ctx = await showTemplatePicker();
        if (ctx) store.addNode(ctx);
        renderChapterView(store);
    });

    // 说话人输入
    $$('.chapter-speaker-input').forEach(inp => {
        inp.addEventListener('change', () => {
            const row = parseInt(inp.dataset.row);
            const node = content[row];
            if (!node) return;
            if (typeof node.speaker !== 'object') node.speaker = { zh: '', en: '' };
            node.speaker.zh = inp.value;
            store._emit();
        });
    });

    // i18n 输入
    $$('.chapter-i18n-input').forEach(inp => {
        inp.addEventListener('change', () => {
            const row = parseInt(inp.dataset.row);
            const field = inp.dataset.field;
            const lang = inp.dataset.lang;
            const node = content[row];
            if (!node) return;
            if (typeof node[field] !== 'object') node[field] = {};
            node[field][lang] = inp.value;
            store._emit();
        });
    });

    // 普通字段输入
    $$('.chapter-cell-input:not(.chapter-i18n-input)').forEach(inp => {
        inp.addEventListener('change', () => {
            const row = parseInt(inp.dataset.row);
            const field = inp.dataset.field;
            const node = content[row];
            if (!node) return;
            const val = inp.value;
            node[field] = (/^\d+$/.test(val) && !isNaN(val)) ? Number(val) : val;
            store._emit();
        });
    });

    // 打开完整编辑
    $$('.chapter-open-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const row = parseInt(btn.dataset.row);
            const node = content[row];
            if (!node) return;
            store.currentPath = ['content', String(row)];
            store._emit();
            const formTab = document.getElementById('tab-form');
            if (formTab) formTab.click();
        });
    });

    // 双击行编辑
    $$('.chapter-row').forEach(row => {
        row.addEventListener('dblclick', () => {
            const i = parseInt(row.dataset.index);
            const node = content[i];
            if (!node) return;
            store.currentPath = ['content', String(i)];
            store._emit();
            const formTab = document.getElementById('tab-form');
            if (formTab) formTab.click();
        });
    });
}

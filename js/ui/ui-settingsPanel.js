import { store } from '../logic/logic-storyStore.js';
import { showAlert } from '../../components/base/useDialog.js';
import { getLanguages, loadStructs, saveStructs, addStructField, removeStructField, getEffectiveFields, deleteStruct, syncStruct, loadEffectiveTemplates, loadTemplateKeys, loadLabels } from '../logic/logic-storyTypes.js';

const $ = (sel) => document.querySelector(sel);
// ==========================================
// ui-settingsPanel.js — 设置面板（字体、色彩方案、语言管理）
// ==========================================

const STORAGE_KEY = 'storyeditor_settings';

// 色彩方案预设
const THEMES = {
    dark: {
        label: '暗色默认',
        vars: {
            '--bg': '#1a1a2e',
            '--bg-panel': '#16213e',
            '--bg-input': '#0f3460',
            '--border': '#2a2a4a',
            '--text': '#e0e0e0',
            '--text-dim': '#888',
            '--accent': '#e94560',
            '--accent-hover': '#ff6b81',
            '--success': '#4ecca3',
            '--warn': '#f0a500',
        }
    },
    ocean: {
        label: '深海蓝',
        vars: {
            '--bg': '#0d1b2a',
            '--bg-panel': '#1b2838',
            '--bg-input': '#1b3a4b',
            '--border': '#2a4a5a',
            '--text': '#d4e9f7',
            '--text-dim': '#7a9bb5',
            '--accent': '#4fc3f7',
            '--accent-hover': '#81d4fa',
            '--success': '#66bb6a',
            '--warn': '#ffa726',
        }
    },
    forest: {
        label: '森林绿',
        vars: {
            '--bg': '#1a2e1a',
            '--bg-panel': '#1e3820',
            '--bg-input': '#2a4a2e',
            '--border': '#2a4a30',
            '--text': '#d4e8d4',
            '--text-dim': '#7a9a7a',
            '--accent': '#66bb6a',
            '--accent-hover': '#81c784',
            '--success': '#4db6ac',
            '--warn': '#ffb74d',
        }
    },
    light: {
        label: '浅色',
        vars: {
            '--bg': '#f5f5f5',
            '--bg-panel': '#ffffff',
            '--bg-input': '#e8e8e8',
            '--border': '#d0d0d0',
            '--text': '#222222',
            '--text-dim': '#888888',
            '--accent': '#e53935',
            '--accent-hover': '#c62828',
            '--success': '#43a047',
            '--warn': '#ef6c00',
        }
    }
};

function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// 加载已保存的设置
function loadSettings() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return JSON.parse(saved);
    } catch {}
    return { theme: 'dark', fontSize: 16, labelColor: 'type' };
}

// 保存设置
function saveSettings(s) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

// 应用设置到 :root
export function applySettings(settings) {
    const s = settings || loadSettings();
    const root = document.documentElement;

    root.style.setProperty('--font-size-base', s.fontSize + 'px');

    const theme = THEMES[s.theme];
    if (theme) {
        for (const [key, val] of Object.entries(theme.vars)) {
            root.style.setProperty(key, val);
        }
    }

    root.dataset.labelColor = s.labelColor || 'default';
}

// 初始化设置（页面加载时调用）
export function initSettings() {
    const s = loadSettings();
    applySettings(s);
    return s;
}

// 新建结构类型弹窗
export function openNewStructDialog() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `<div class="modal-box" style="width:680px;max-width:90vw">
        <div class="modal-header"><h2>新建结构类型</h2><button class="modal-close" id="ns-close">✕</button></div>
        <div class="modal-body" style="display:flex;gap:16px;padding:12px">
            <div style="flex:1;min-width:0">
                <div style="margin-bottom:8px">
                    <label style="display:block;margin-bottom:4px;font-size:0.8125rem;color:var(--text-dim)">ID</label>
                    <input id="ns-id" class="input" placeholder="如 myType" style="width:100%;font-family:var(--font-mono)" />
                </div>
                <div style="margin-bottom:8px">
                    <label style="display:block;margin-bottom:4px;font-size:0.8125rem;color:var(--text-dim)">显示名称</label>
                    <input id="ns-label" class="input" placeholder="如 自定义类型" style="width:100%" />
                </div>
                <div style="margin-bottom:8px">
                    <label style="display:block;margin-bottom:4px;font-size:0.8125rem;color:var(--text-dim)">匹配方式</label>
                    <select id="ns-match-type" class="input" style="width:100%">
                        <option value="struct">属性检测（struct）</option>
                        <option value="glob">键名通配（glob）</option>
                        <option value="path">路径匹配（path）</option>
                    </select>
                </div>
                <div id="ns-marker-group" style="margin-bottom:8px">
                    <label style="display:block;margin-bottom:4px;font-size:0.8125rem;color:var(--text-dim)">标记属性键名</label>
                    <input id="ns-marker" class="input" placeholder="如 zh" style="width:100%;font-family:var(--font-mono)" />
                    <div style="font-size:0.7rem;color:var(--text-dim);margin-top:2px">
                        具有此键的对象才算匹配，同时自动保证此键存在
                    </div>
                </div>
                <div id="ns-pattern-group" style="margin-bottom:8px;display:none">
                    <label style="display:block;margin-bottom:4px;font-size:0.8125rem;color:var(--text-dim)">Glob 通配模式</label>
                    <input id="ns-pattern" class="input" placeholder="如 **.speaker" style="width:100%;font-family:var(--font-mono)" />
                    <div style="font-size:0.7rem;color:var(--text-dim);margin-top:2px;line-height:1.4">
                        <code>**</code> = 任意层 · <code>*</code> = 单级通配 · 字面量精确匹配
                    </div>
                </div>
                <div id="ns-fields-group" style="margin-bottom:8px;display:none">
                    <label style="display:block;margin-bottom:4px;font-size:0.8125rem;color:var(--text-dim)">初始字段（逗号分隔）</label>
                    <input id="ns-fields" class="input" placeholder="如 zh, en" style="width:100%;font-family:var(--font-mono)" />
                    <div style="font-size:0.7rem;color:var(--text-dim);margin-top:2px">
                        匹配到的对象保证拥有以上所有字段
                    </div>
                </div>
            </div>
            <div style="width:280px;min-width:0;border-left:1px solid var(--border);padding-left:12px">
                <label style="display:block;margin-bottom:4px;font-size:0.8125rem;color:var(--text-dim)">匹配预览</label>
                <div id="ns-preview" style="font-size:0.75rem;font-family:var(--font-mono);background:var(--bg-input);border-radius:var(--radius);padding:8px;min-height:200px;overflow:auto;white-space:pre-wrap;word-break:break-all;line-height:1.6;color:var(--text-dim)">等待输入...</div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-sm" id="ns-cancel">取消</button>
            <button class="btn btn-sm btn-primary" id="ns-ok">创建</button>
        </div>
    </div>`;
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('open'));

    const close = () => { modal.classList.remove('open'); setTimeout(() => modal.remove(), 200); };
    modal.querySelector('#ns-close').onclick = close;
    modal.querySelector('#ns-cancel').onclick = close;
    modal.addEventListener('click', e => { if (e.target === modal) close(); });

    // 实时预览
    function updatePreview() {
        const matchType = modal.querySelector('#ns-match-type').value;
        const marker = modal.querySelector('#ns-marker').value.trim();
        const pattern = modal.querySelector('#ns-pattern').value.trim();
        const fields = modal.querySelector('#ns-fields').value.trim();
        const preview = modal.querySelector('#ns-preview');
        const fieldList = fields ? fields.split(/[,，\s]+/).filter(Boolean) : [];

        let matchDesc = '', examples = [];
        switch (matchType) {
            case 'struct': {
                if (!marker) { preview.textContent = '等待输入标记键名...'; return; }
                matchDesc = `对象含有关键键「${marker}」`;
                examples = [
                    `{ "${marker}": "..." }`,
                    `{ "${marker}": "...", "other": "..." }   ← 也一起匹配，但不管 other`,
                ];
                break;
            }
            case 'glob': {
                if (!pattern) { preview.textContent = '等待输入通配模式...'; return; }
                matchDesc = `键名匹配 Glob 模式「${pattern}」`;
                const last = pattern.split('.').pop() || pattern;
                if (pattern.startsWith('**.')) {
                    examples = [
                        `content[0].${last}`,
                        `meta.${last}`,
                        `content[0].options[0].${last}`,
                    ];
                } else if (pattern.includes('*')) {
                    examples = [
                        pattern.replace('*', '0'),
                        pattern.replace('*', '1'),
                    ];
                } else {
                    examples = [pattern];
                }
                break;
            }
            case 'path': {
                if (!pattern) { preview.textContent = '等待输入路径模式...'; return; }
                matchDesc = `路径匹配模式「${pattern}」`;
                if (pattern.includes('*')) {
                    examples = [
                        pattern.replace('*', '0'),
                        pattern.replace('*', '1'),
                    ];
                } else {
                    examples = [pattern];
                }
                break;
            }
        }
        const fieldsNote = matchType === 'struct'
            ? `\n\n保证字段: [${marker}]（标记键自动保证）`
            : (fieldList.length > 0 ? `\n\n保证字段: [${fieldList.join(', ')}]` : '');
        preview.innerHTML = `<div style="color:var(--accent);margin-bottom:4px">${esc(matchDesc)}</div>`
            + examples.map(ex => `<div style="color:var(--text)">  → ${esc(ex)}</div>`).join('')
            + esc(fieldsNote);
    }

    modal.querySelector('#ns-match-type').addEventListener('change', (e) => {
        const v = e.target.value;
        modal.querySelector('#ns-marker-group').style.display = v === 'struct' ? '' : 'none';
        modal.querySelector('#ns-pattern-group').style.display = (v === 'glob' || v === 'path') ? '' : 'none';
        modal.querySelector('#ns-fields-group').style.display = (v === 'glob' || v === 'path') ? '' : 'none';
        updatePreview();
    });
    modal.querySelector('#ns-marker').addEventListener('input', updatePreview);
    modal.querySelector('#ns-pattern').addEventListener('input', updatePreview);
    modal.querySelector('#ns-fields').addEventListener('input', updatePreview);
    updatePreview();

    modal.querySelector('#ns-ok').onclick = () => {
        const id = modal.querySelector('#ns-id').value.trim();
        const label = modal.querySelector('#ns-label').value.trim() || id;
        const matchType = modal.querySelector('#ns-match-type').value;
        const marker = modal.querySelector('#ns-marker').value.trim();
        const pattern = modal.querySelector('#ns-pattern').value.trim();
        const fieldsStr = modal.querySelector('#ns-fields').value.trim();

        if (!id) { showAlert('ID 不能为空'); return; }
        if (matchType === 'struct' && !marker) { showAlert('标记属性键名不能为空'); return; }
        if ((matchType === 'glob' || matchType === 'path') && !pattern) { showAlert('通配模式不能为空'); return; }

        const fields = matchType === 'struct'
            ? [marker]
            : (fieldsStr ? fieldsStr.split(/[,，\s]+/).filter(Boolean) : []);
        const structs = loadStructs();
        if (structs.some(s => s.id === id)) { showAlert('该 ID 已存在'); return; }

        const match = matchType === 'struct'
            ? { type: matchType, marker }
            : { type: matchType, pattern };

        const newStruct = { id, label, match, fields };
        structs.push(newStruct);
        saveStructs(structs);
        // 同步到当前 chapter 数据
        if (store.chapter) {
            syncStruct(store.chapter, newStruct);
            store._emit();
        }
        close();
        renderSettingsPanel();
    };

    modal.querySelector('#ns-id').addEventListener('keydown', e => {
        if (e.key === 'Enter') modal.querySelector('#ns-ok').click();
    });
}

// 渲染设置面板
export function renderSettingsPanel() {
    const container = document.querySelector('#view-settings .side-view-content');
    if (!container) return;

    const s = loadSettings();
    const langs = getLanguages();
    const structs = loadStructs();

    container.innerHTML = `
        <div class="settings-section">
            <label class="settings-label">字体大小</label>
            <div class="settings-font-row">
                <input type="range" class="settings-slider" id="setting-font-size"
                    min="12" max="24" step="1" value="${s.fontSize}" />
                <span class="settings-font-value" id="setting-font-value">${s.fontSize}px</span>
            </div>
        </div>
        <div class="settings-section">
            <label class="settings-label">色彩方案</label>
            <div class="settings-themes" id="setting-themes">
                ${Object.entries(THEMES).map(([key, t]) => `
                    <div class="settings-theme-card ${key === s.theme ? 'active' : ''}" data-theme="${key}">
                        <div class="settings-theme-preview">
                            <span style="background:${t.vars['--accent']}"></span>
                            <span style="background:${t.vars['--bg-panel']}"></span>
                            <span style="background:${t.vars['--text']}"></span>
                            <span style="background:${t.vars['--bg']}"></span>
                        </div>
                        <div class="settings-theme-name">${t.label}</div>
                    </div>
                `).join('')}
            </div>
        </div>
        <div class="settings-section">
            <label class="settings-label">标签颜色模式</label>
            <div style="display:flex;gap:12px">
                <label style="cursor:pointer">
                    <input type="radio" name="label-color" value="default" ${s.labelColor === 'default' || !s.labelColor ? 'checked' : ''} /> 跟随主题
                </label>
                <label style="cursor:pointer">
                    <input type="radio" name="label-color" value="type" ${s.labelColor === 'type' ? 'checked' : ''} /> 按类型着色
                </label>
            </div>
            <div style="margin-top:6px;font-size:0.75rem;color:var(--text-dim)">
                按类型：str=蓝, i18n=紫, arr=绿, obj=橙, num=黄, nil=红
            </div>
        </div>
        <div class="settings-section">
            <label class="settings-label">语言管理</label>
            <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
                ${langs.map(l => `<span class="settings-lang-badge">${esc(l)}</span>`).join('')}
            </div>
            <div style="display:flex;gap:6px;margin-top:6px">
                <input id="setting-new-lang" class="input-sm" placeholder="如 fr" style="width:80px;font-family:var(--font-mono)" />
                <button class="btn btn-sm btn-success" id="btn-add-lang">＋ 添加语言</button>
            </div>
            <div style="margin-top:4px;font-size:0.75rem;color:var(--text-dim)">
                添加后自动补充到所有多语言文本字段
            </div>
        </div>

        <div class="settings-section">
            <label class="settings-label">结构类型管理</label>
            <div style="font-size:0.75rem;color:var(--text-dim);margin-bottom:6px">
                定义数据中需要统一维护字段的"类型"（如多语言文本）
            </div>
            ${structs.map(st => {
                const matchDesc = st.match.type === 'struct'
                    ? `struct(${esc(st.match.marker)})`
                    : st.match.type === 'glob'
                        ? `glob(${esc(st.match.pattern)})`
                        : `path(${esc(st.match.pattern)})`;
                return `
                <div class="settings-struct-card">
                    <div class="settings-struct-header">
                        <span class="settings-struct-id">${esc(st.id)}</span>
                        <span class="settings-struct-label">${esc(st.label)}</span>
                        <span class="settings-struct-match">${esc(matchDesc)}</span>
                        ${st.id !== 'i18n' ? `<button class="btn-icon btn-del-struct" data-struct="${esc(st.id)}" title="删除此类型">✕</button>` : ''}
                    </div>
                    <div class="settings-struct-fields">
                        ${st.match.type === 'struct' ? `<span class="settings-lang-badge" style="opacity:0.7">${esc(st.match.marker)} (标记)</span>` : ''}
                        ${st.fields.filter(f => st.match.type !== 'struct' || f !== st.match.marker).map(f => `<span class="settings-lang-badge">${esc(f)} <button class="btn-icon btn-del-field" data-struct="${esc(st.id)}" data-field="${esc(f)}" title="删除字段">✕</button></span>`).join('')}
                        <input class="input-sm settings-struct-new-field" data-struct="${esc(st.id)}" placeholder="新字段名" style="width:70px;font-family:var(--font-mono)" />
                        <button class="btn btn-sm btn-success btn-add-struct-field" data-struct="${esc(st.id)}">＋</button>
                    </div>
                </div>`;
            }).join('')}
            <div style="margin-top:8px;display:flex;gap:6px">
                <button class="btn btn-sm" id="btn-new-struct">＋ 新建结构类型</button>
            </div>
        </div>
        <div class="settings-section" style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn btn-sm" id="btn-export-config">📤 导出配置</button>
            <button class="btn btn-sm" id="btn-import-config">📥 导入配置</button>
            <button class="btn btn-sm" id="btn-settings-reset">重置为默认</button>
            <button class="btn btn-sm" id="btn-layout-reset">恢复默认布局</button>
        </div>
    `;

    // 字体大小滑块
    const slider = document.getElementById('setting-font-size');
    const valDisplay = document.getElementById('setting-font-value');
    if (slider && valDisplay) {
        slider.addEventListener('input', () => {
            const v = parseInt(slider.value);
            valDisplay.textContent = v + 'px';
            s.fontSize = v;
            saveSettings(s);
            applySettings(s);
        });
    }

    // 主题选择
    document.querySelectorAll('.settings-theme-card').forEach(card => {
        card.addEventListener('click', () => {
            const theme = card.dataset.theme;
            s.theme = theme;
            saveSettings(s);
            applySettings(s);
            document.querySelectorAll('.settings-theme-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
        });
    });

    // 标签颜色模式
    document.querySelectorAll('input[name="label-color"]').forEach(radio => {
        radio.addEventListener('change', () => {
            s.labelColor = radio.value;
            saveSettings(s);
            applySettings(s);
        });
    });

    // 添加语言（通过结构类型系统）
    const addBtn = document.getElementById('btn-add-lang');
    const langInput = document.getElementById('setting-new-lang');
    if (addBtn && langInput) {
        const doAdd = () => {
            const lang = langInput.value.trim().toLowerCase();
            if (!lang) return;
            addStructField('i18n', lang, store.chapter);
            renderSettingsPanel();
        };
        addBtn.addEventListener('click', doAdd);
        langInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') doAdd();
        });
    }

    // 结构类型管理事件
    // 添加结构字段
    document.querySelectorAll('.btn-add-struct-field').forEach(btn => {
        btn.addEventListener('click', () => {
            const structId = btn.dataset.struct;
            const input = btn.parentNode.querySelector('.settings-struct-new-field');
            const field = input?.value.trim();
            if (!field) return;
            addStructField(structId, field, store.chapter);
            store._emit();
            renderSettingsPanel();
        });
    });
    // 字段输入框回车
    document.querySelectorAll('.settings-struct-new-field').forEach(inp => {
        inp.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const btn = inp.parentNode.querySelector('.btn-add-struct-field');
                if (btn) btn.click();
            }
        });
    });
    // 删除字段
    document.querySelectorAll('.btn-del-field').forEach(btn => {
        btn.addEventListener('click', () => {
            const structId = btn.dataset.struct;
            const field = btn.dataset.field;
            removeStructField(structId, field, store.chapter);
            store._emit();
            renderSettingsPanel();
        });
    });
    // 删除整个结构类型
    document.querySelectorAll('.btn-del-struct').forEach(btn => {
        btn.addEventListener('click', () => {
            const structId = btn.dataset.struct;
            if (structId === 'i18n') { showAlert('不能删除内置类型'); return; }
            deleteStruct(structId, store.chapter);
            store._emit();
            renderSettingsPanel();
        });
    });
    // 新建结构类型
    $('#btn-new-struct')?.addEventListener('click', () => {
        // 弹窗选择匹配方式
        openNewStructDialog();
    });

    // 重置
    const resetBtn = document.getElementById('btn-settings-reset');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            localStorage.removeItem(STORAGE_KEY);
            const defaults = { theme: 'dark', fontSize: 16, labelColor: 'type' };
            saveSettings(defaults);
            applySettings(defaults);
            renderSettingsPanel();
        });
    }

    // 恢复默认布局
    const layoutBtn = document.getElementById('btn-layout-reset');
    if (layoutBtn) {
        layoutBtn.addEventListener('click', () => {
            const sidePanel = document.getElementById('panel-side');
            if (sidePanel) {
                sidePanel.classList.remove('collapsed', 'no-transition');
                sidePanel.style.width = '';
                sidePanel.style.flex = '';
                delete sidePanel.dataset.savedWidth;
            }
            const rightPanel = document.getElementById('panel-right');
            if (rightPanel) {
                rightPanel.style.width = '';
                rightPanel.style.flex = '';
            }
        });
    }

    // 导出配置（editor + custom 分两大块）
    const exportBtn = document.getElementById('btn-export-config');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const config = {
                meta: { version: 1, exportedAt: new Date().toISOString() },
                editor: {
                    settings: loadSettings(),
                    chapterCols: (() => { try { return JSON.parse(localStorage.getItem('storyeditor_chapter_cols') || '["speaker","text"]'); } catch { return ['speaker', 'text']; } })()
                },
                custom: {
                    templates: loadEffectiveTemplates(),
                    deletedTemplates: (() => { try { return JSON.parse(localStorage.getItem('storyeditor_deleted_templates') || '[]'); } catch { return []; } })(),
                    templateKeys: loadTemplateKeys(),
                    structs: loadStructs(),
                    labels: loadLabels()
                }
            };
            const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'storyeditor-config.json';
            a.click();
        });
    }

    // 导入配置（兼容新版 editor/custom 结构和旧版平铺结构）
    const importBtn = document.getElementById('btn-import-config');
    if (importBtn) {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.addEventListener('change', () => {
            const file = fileInput.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    let count = 0;

                    if (data.editor && data.custom) {
                        // 新版结构化格式
                        if (data.editor.settings) {
                            localStorage.setItem('storyeditor_settings', JSON.stringify(data.editor.settings));
                            count++;
                        }
                        if (data.editor.chapterCols) {
                            localStorage.setItem('storyeditor_chapter_cols', JSON.stringify(data.editor.chapterCols));
                            count++;
                        }
                        if (data.custom.templates) {
                            localStorage.setItem('storyeditor_templates', JSON.stringify(data.custom.templates));
                            count++;
                        }
                        if (data.custom.deletedTemplates) {
                            localStorage.setItem('storyeditor_deleted_templates', JSON.stringify(data.custom.deletedTemplates));
                            count++;
                        }
                        if (data.custom.templateKeys) {
                            localStorage.setItem('storyeditor_template_keys', JSON.stringify(data.custom.templateKeys));
                            count++;
                        }
                        if (data.custom.structs) {
                            localStorage.setItem('storyeditor_structs', JSON.stringify(data.custom.structs));
                            count++;
                        }
                        if (data.custom.labels) {
                            localStorage.setItem('storyeditor_labels', JSON.stringify(data.custom.labels));
                            count++;
                        }
                    } else {
                        // 兼容旧版平铺格式（storyeditor_* 键直接在最外层）
                        for (const [key, val] of Object.entries(data)) {
                            if (key.startsWith('storyeditor_')) {
                                localStorage.setItem(key, JSON.stringify(val));
                                count++;
                            }
                        }
                    }

                    showAlert(`导入成功！已恢复 ${count} 项配置。`);
                    initSettings();
                    renderSettingsPanel();
                    store._emit();
                } catch (err) {
                    showAlert('导入失败：配置文件格式错误');
                }
            };
            reader.readAsText(file);
            fileInput.value = '';
        });
        importBtn.addEventListener('click', () => fileInput.click());
    }
}

// ==========================================
// ui-settingsPanel.js — 设置面板（字体、色彩方案）
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

// 加载已保存的设置
function loadSettings() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return JSON.parse(saved);
    } catch {}
    return { theme: 'dark', fontSize: 16 };
}

// 保存设置
function saveSettings(s) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

// 应用设置到 :root
export function applySettings(settings) {
    const s = settings || loadSettings();
    const root = document.documentElement;

    // 字体大小
    root.style.setProperty('--font-size-base', s.fontSize + 'px');

    // 色彩方案
    const theme = THEMES[s.theme];
    if (theme) {
        for (const [key, val] of Object.entries(theme.vars)) {
            root.style.setProperty(key, val);
        }
    }
}

// 初始化设置（页面加载时调用）
export function initSettings() {
    const s = loadSettings();
    applySettings(s);
    return s;
}

// 渲染设置面板
export function renderSettingsPanel() {
    const container = document.querySelector('#view-settings .side-view-content');
    if (!container) return;

    const s = loadSettings();

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
            <button class="btn btn-sm" id="btn-settings-reset">重置为默认</button>
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
            // 更新 active 状态
            document.querySelectorAll('.settings-theme-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
        });
    });

    // 重置
    const resetBtn = document.getElementById('btn-settings-reset');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            localStorage.removeItem(STORAGE_KEY);
            const defaults = { theme: 'dark', fontSize: 16 };
            saveSettings(defaults);
            applySettings(defaults);
            renderSettingsPanel();
        });
    }
}

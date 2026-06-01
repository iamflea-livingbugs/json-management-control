// ==========================================
// main.js — 入口（只引用 barrel.js）
// ==========================================

import { store, io, initUI, loadContextsConfig, loadSavedConfig, loadContentConfig } from './barrel.js';

// 加载配置文件（不影响页面渲染，失败会用硬编码默认值）
Promise.all([loadContextsConfig(), loadContentConfig()]).then(() => {
    loadSavedConfig();
    store._emit();
});

// 拖放区域：整个窗口都可以拖入 JSON
io.setupDropZone(document.body, json => store.loadChapter(json));

// 初始化界面
initUI(store, io);

// 加载示例（开发调试用，从 URL 参数读取）
const params = new URLSearchParams(window.location.search);
const sampleUrl = params.get('load');
if (sampleUrl) {
    fetch(sampleUrl)
        .then(r => r.json())
        .then(json => store.loadChapter(json))
        .catch(() => console.log('示例文件加载失败，请拖入 JSON 文件开始'));
}

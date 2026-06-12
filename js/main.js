// ==========================================
// main.js — 应用入口
// 只引用 barrel.js，由 barrel 统一导出所有模块
// ==========================================

import { store, io, initUI, loadContentConfig, showAlert } from './barrel.js';

// ---------- 启动阶段 ----------

// step 1: 加载 JSON 配置文件（template-content.json）
// 这个文件定义了空白结构和模板字段，加载失败会回退到 storyTypes.js 里的 HARDCODED_* 硬编码
loadContentConfig().then(() => {
    // 触发首次渲染，让界面显示默认空章节
    store._emit();
});

// step 3: 拖放功能——拖入 .json 文件到窗口任意位置即可加载
io.setupDropZone(document.body, json => store.loadChapter(json), (msg) => showAlert(msg));

// step 4: 初始化界面（工具栏、树面板、编辑器、预览面板等）
initUI(store, io);

// step 5: 开发调试 —— 通过 URL 参数 ?load=xxx.json 加载示例文件
// 例如：index.html?load=sample.json
const params = new URLSearchParams(window.location.search);
const sampleUrl = params.get('load');
if (sampleUrl) {
    fetch(sampleUrl)
        .then(r => r.json())
        .then(json => store.loadChapter(json))
        .catch(() => console.log('示例文件加载失败，请拖入 JSON 文件开始'));
}

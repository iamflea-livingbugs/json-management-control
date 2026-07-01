// ==========================================
// main.js — 应用入口
// Vue 应用 + 原生 JS 逻辑混合启动
// ==========================================

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from '../components/App.vue';
import { store, io, initUI, loadContentConfig, showAlert } from './barrel.js';

// step 1: 挂载 Vue 根组件 + Pinia（渲染整个页面布局）
const app = createApp(App);
app.use(createPinia());
app.mount('#app');

// step 2: 加载 JSON 配置文件（template-content.json）
// 加载失败会回退到 storyTypes.js 里的 HARDCODED_* 硬编码
loadContentConfig().then(() => {
    // 触发首次渲染，让界面显示默认空章节
    store._emit();
});

// step 3: 拖放功能——拖入 .json 文件到窗口任意位置即可加载
io.setupDropZone(document.body, json => store.loadChapter(json), (msg) => showAlert(msg));

// step 4: 初始化界面（事件绑定、渲染调度等）
initUI(store, io);

// step 5: 开发调试 —— 通过 URL 参数 ?load=xxx.json 加载示例文件
const params = new URLSearchParams(window.location.search);
const sampleUrl = params.get('load');
if (sampleUrl) {
    fetch(sampleUrl)
        .then(r => r.json())
        .then(json => store.loadChapter(json))
        .catch(() => console.log('示例文件加载失败，请拖入 JSON 文件开始'));
}

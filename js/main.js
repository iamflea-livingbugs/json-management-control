// ==========================================
// main.js — 应用入口
// Vue 应用 + 原生 JS 逻辑混合启动
// ==========================================

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from '../components/App.vue';
import { store, io, initUI, loadContentConfig, showAlert } from './barrel.js';
import { runMigration } from './logic/logic-migration.js';
import { start, notifyChange, hasSavedDocument, getSavedDocument, discardSavedDocument, setFileName } from './logic/logic-autoSave.js';
import { showConfirm } from '../components/base/useDialog.js';

// step 1: 挂载 Vue 根组件 + Pinia（渲染整个页面布局）
const app = createApp(App);
app.use(createPinia());
app.mount('#app');

// step 1.5: 执行 localStorage 迁移（旧 key → 新三层结构）
runMigration();

// step 1.6: 检查自动保存数据，询问是否恢复
(async function checkAutoSave() {
    if (hasSavedDocument()) {
        const saved = getSavedDocument();
        const fileName = saved?.meta?.fileName || '未命名';
        const time = saved?.meta?.displayTime || '未知';
        const ok = await showConfirm('检测到未保存的编辑数据：\n文件：' + fileName + '\n最后编辑时间：' + time + '\n\n是否恢复？');
        if (ok) {
            store.loadCurJson(saved.data);
            store.setCurJsonName(fileName.replace(/\.json$/i, ''));
            const input = document.querySelector('#curjson-name');
            if (input) input.value = store.getCurJsonName();
            showAlert('已恢复自动保存的数据');
        }
        discardSavedDocument();
    }
})();

// step 2: 加载 JSON 配置文件（template-content.json）
loadContentConfig().then(() => {
    // 触发首次渲染，让界面显示默认空章节
    store._emit();
});

// step 3: 拖放功能——拖入 .json 文件到窗口任意位置即可加载
io.setupDropZone(document.body, json => {
    store.loadCurJson(json);
    updateFileName(json);
}, (msg) => showAlert(msg));

// step 4: 初始化界面（事件绑定、渲染调度等）
initUI(store, io);

// step 5: 注册自动保存
start(store);
store.onChange(() => { notifyChange(); });

function updateFileName(json) {
    const name = json?.meta?.name;
    if (name) {
        store.setCurJsonName(name);
        setFileName(name + '.json');
        const input = document.querySelector('#curjson-name');
        if (input) input.value = name;
    }
}

// step 7: 开发调试 —— 通过 URL 参数 ?load=xxx.json 加载示例文件
const params = new URLSearchParams(window.location.search);
const sampleUrl = params.get('load');
if (sampleUrl) {
    fetch(sampleUrl)
        .then(r => r.json())
        .then(json => {
            store.loadCurJson(json);
            updateFileName(json);
        })
        .catch(() => console.log('示例文件加载失败，请拖入 JSON 文件开始'));
}

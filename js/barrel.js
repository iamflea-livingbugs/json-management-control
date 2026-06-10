// ==========================================
// barrel.js — 统一导出中枢
// 作用：main.js 只需引用这一个文件，即可导入所有模块
// 依赖层级：base/ → data/ → ui/
// ==========================================

// 基础层：数据模型、配置加载、模板读写
export { loadContextsConfig, loadSavedConfig, loadContentConfig } from './base/storyTypes.js';

// 数据层：数据 CRUD 管理 + 文件导入导出
export { store } from './data/storyStore.js';
export * as io from './data/storyIO.js';

// UI 层：主界面渲染 + 新建选择弹窗 + 模态框
export { initUI } from './ui/storyUI.js';
export { showCreateDialog } from './ui/createDialog.js';
export { openLabelManager } from './ui/labelManager.js';
export { renderChapterView } from './ui/storyChapterView.js';
export { showAlert, showConfirm, showPrompt, showObjectAddDialog } from './ui/modalDialog.js';

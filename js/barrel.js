// ==========================================
// barrel.js — 统一导出中枢
// 作用：main.js 只需引用这一个文件，即可导入所有模块
// 依赖层级：svc-（逻辑层）→ view-（视图层）
// ==========================================

// 基础层：数据模型、配置加载、模板读写
export { loadContextsConfig, loadSavedConfig, loadContentConfig } from './logic/svc-storyTypes.js';

// 数据层：数据 CRUD 管理 + 文件导入导出
export { store } from './logic/svc-storyStore.js';
export * as io from './logic/svc-storyIO.js';

// UI 层：主界面初始化 + 工具函数
export { initUI } from './ui/view-init.js';
export { showCreateDialog } from './ui/view-createDialog.js';
export { openLabelManager } from './ui/view-labelManager.js';
export { renderChapterView } from './ui/view-chapterView.js';
export { showAlert, showConfirm, showPrompt, showObjectAddDialog } from './ui/view-modalDialog.js';

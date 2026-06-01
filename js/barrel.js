// ==========================================
// barrel.js — 统一导出中枢
// ==========================================
// main.js 只需引用这一个文件
// ==========================================

// 基础层
export { loadContextsConfig, loadSavedConfig, loadContentConfig } from './base/storyTypes.js';

// 数据层
export { store } from './data/storyStore.js';
export * as io from './data/storyIO.js';

// UI 层
export { initUI } from './ui/storyUI.js';

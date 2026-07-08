// ==========================================
// barrel.js — 统一导出中枢
// 作用：main.js 只需引用这一个文件，即可导入所有模块
// 依赖层级：logic-（逻辑层）→ ui-（视图层）
// ==========================================

// 基础层：数据模型、配置加载、模板读写
export { loadTemplates, getContextKeys, getContextsConfig, resolveTemplateContext, loadContentConfig, loadEffectiveTemplates,
    createCurJson, createBlankCurJson, createOption, isEmpty, createNodeFromTemplate,
    loadLabels, saveLabel, getFieldLabel,
    getLanguages, saveLanguages,
    saveTemplate, saveTemplates, loadTemplateKeys, saveTemplateKeys,
    loadStructs, saveStructs, getEffectiveFields, findMatchingValues, syncStruct, syncAllStructs, addStructField, removeStructField, deleteStruct,
    isI18nObj, addLanguage } from './logic/logic-storyTypes.js';

// 数据层：数据 CRUD 管理 + 文件导入导出
export { store } from './logic/logic-storyStore.js';
export * as io from './logic/logic-storyIO.js';

// UI 层：主界面初始化 + 工具函数
export { initUI } from './ui/ui-init.js';
export { openLabelManager } from './ui/ui-labelManager.js';
export { renderCurJsonView } from './ui/ui-chapterView.js';
export { showCreateDialog, showTemplatePicker } from '../components/base_reusable/useCreateDialog.js';
export { showAlert, showConfirm, showPrompt, showObjectAddDialog } from '../components/base/useDialog.js';

// 迁移 & 存储层
export { runMigration, readConfig, writeConfig, readSchema, writeSchema, readDocument, writeDocument, clearDocument } from './logic/logic-migration.js';

// 自动保存
export { start, stop, notifyChange, getStatus, onStatusChange, hasSavedDocument, getSavedDocument, discardSavedDocument, setFileName } from './logic/logic-autoSave.js';

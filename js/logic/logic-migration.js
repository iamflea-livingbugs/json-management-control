// ==========================================
// logic-migration.js — localStorage 数据结构迁移
// 定义三层结构 key + 读写辅助函数
// ==========================================

// ---- Key 常量 ----
export const CONFIG_KEY = 'storyeditor_config';
export const SCHEMA_KEY = 'storyeditor_schema';
export const DOCUMENT_KEY = 'storyeditor_document';
export const MIGRATION_FLAG = '_migrated_v05';

// ---- 旧 key 常量（仅迁移用） ----
const OLD_KEYS = {
  settings: 'storyeditor_settings',
  labels: 'storyeditor_labels',
  chapterCols: 'storyeditor_chapter_cols',
  templates: 'storyeditor_templates',
  deletedTemplates: 'storyeditor_deleted_templates',
  templateKeys: 'storyeditor_template_keys',
  structs: 'storyeditor_structs',
};

// ---- 读写辅助函数 ----

export function readConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function writeConfig(data) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify({
    meta: { version: 1, updatedAt: new Date().toLocaleString('zh-CN') },
    ...data
  }));
}

export function readSchema() {
  try {
    const raw = localStorage.getItem(SCHEMA_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function writeSchema(data) {
  localStorage.setItem(SCHEMA_KEY, JSON.stringify({
    meta: { version: 1, updatedAt: new Date().toLocaleString('zh-CN') },
    ...data
  }));
}

export function readDocument() {
  try {
    const raw = localStorage.getItem(DOCUMENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function writeDocument(data) {
  localStorage.setItem(DOCUMENT_KEY, JSON.stringify(data));
}

export function clearDocument() {
  localStorage.removeItem(DOCUMENT_KEY);
}

/** 执行一次性迁移：读取旧 key → 写入新结构 → 删除旧 key */
export function runMigration() {
  if (localStorage.getItem(MIGRATION_FLAG) === 'true') return false;

  let migrated = false;

  // ---- 迁移第 1 层：storyeditor_config ----
  const oldSettings = (() => {
    try { return JSON.parse(localStorage.getItem(OLD_KEYS.settings) || 'null'); }
    catch { return null; }
  })();
  const oldLabels = (() => {
    try { return JSON.parse(localStorage.getItem(OLD_KEYS.labels) || 'null'); }
    catch { return null; }
  })();
  const oldCols = (() => {
    try { return JSON.parse(localStorage.getItem(OLD_KEYS.chapterCols) || 'null'); }
    catch { return null; }
  })();

  if (oldSettings || oldLabels || oldCols) {
    const config = {};
    if (oldSettings) {
      config.theme = oldSettings.theme || 'dark';
      config.fontSize = oldSettings.fontSize || 16;
      config.labelColorMode = oldSettings.labelColor || oldSettings.labelColorMode || 'type';
    }
    if (oldLabels) config.labels = oldLabels;
    if (oldCols) config.chapterCols = oldCols;
    writeConfig(config);
    migrated = true;
  }

  // ---- 迁移第 2 层：storyeditor_schema ----
  const oldTemplates = (() => {
    try { return JSON.parse(localStorage.getItem(OLD_KEYS.templates) || 'null'); }
    catch { return null; }
  })();
  const oldDeleted = (() => {
    try { return JSON.parse(localStorage.getItem(OLD_KEYS.deletedTemplates) || 'null'); }
    catch { return null; }
  })();
  const oldKeys = (() => {
    try { return JSON.parse(localStorage.getItem(OLD_KEYS.templateKeys) || 'null'); }
    catch { return null; }
  })();
  const oldStructs = (() => {
    try { return JSON.parse(localStorage.getItem(OLD_KEYS.structs) || 'null'); }
    catch { return null; }
  })();

  if (oldTemplates || oldDeleted || oldKeys || oldStructs) {
    const schema = {};
    if (oldTemplates) schema.templates = oldTemplates;
    if (oldDeleted) schema.deletedTemplates = oldDeleted;
    if (oldKeys) schema.templateKeys = oldKeys;
    if (oldStructs) schema.structs = oldStructs;
    writeSchema(schema);
    migrated = true;
  }

  // ---- 删除所有旧 key ----
  if (migrated) {
    for (const key of Object.values(OLD_KEYS)) {
      localStorage.removeItem(key);
    }
    localStorage.setItem(MIGRATION_FLAG, 'true');
  }

  return migrated;
}

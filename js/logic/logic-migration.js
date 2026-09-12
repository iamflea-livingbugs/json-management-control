// ==========================================
// logic-migration.js — localStorage 数据结构迁移
// 定义三层结构 key + 读写辅助函数
// ==========================================

// ---- Key 常量 ----
export const CONFIG_KEY = 'storyeditor_config';
export const SCHEMA_KEY = 'storyeditor_schema';
export const DOCUMENT_KEY = 'storyeditor_document';

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

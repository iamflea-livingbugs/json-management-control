// ==========================================
// logic-autoSave.js — 自动保存核心逻辑
// 纯数据层，不依赖 UI
// ==========================================

import { readDocument, writeDocument, clearDocument } from './logic-migration.js';

const DEBOUNCE_MS = 10000;  // 防抖间隔 10s
const HEARTBEAT_MS = 60000; // 兜底检查间隔 60s

let _debounceTimer = null;
let _heartbeatTimer = null;
let _savedVersion = -1;
let _statusListeners = [];
let _storeRef = null;
let _fileName = '';

// ---- 状态枚举 ----
export const Status = {
  IDLE: 'idle',
  SAVING: 'saving',
  SAVED: 'saved',
  ERROR: 'error',
};

let _currentStatus = Status.IDLE;

function setStatus(status) {
  if (_currentStatus === status) return;
  _currentStatus = status;
  _statusListeners.forEach(fn => fn(status));
}

export function getStatus() {
  return _currentStatus;
}

export function onStatusChange(fn) {
  _statusListeners.push(fn);
  return () => {
    _statusListeners = _statusListeners.filter(f => f !== fn);
  };
}

// ---- 核心保存逻辑 ----

function performSave() {
  if (!_storeRef) return;
  setStatus(Status.SAVING);

  try {
    const curJson = _storeRef.curJson;
    if (!curJson) { setStatus(Status.IDLE); return; }

    const data = {
      meta: {
        version: 1,
        fileName: _fileName || 'untitled.json',
        savedAt: Date.now(),
        displayTime: new Date().toLocaleString('zh-CN')
      },
      data: JSON.parse(JSON.stringify(curJson))
    };

    writeDocument(data);
    _savedVersion = _storeRef._dataVersion;

    setStatus(Status.SAVED);

    // 3 秒后自动回到 IDLE（仅当版本没再变化时）
    clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(() => {
      if (_storeRef && _storeRef._dataVersion === _savedVersion) {
        setStatus(Status.IDLE);
      }
    }, 3000);

  } catch (err) {
    console.warn('[AutoSave] 保存失败:', err);
    setStatus(Status.ERROR);
  }
}

// ---- 防抖通知 ----

export function notifyChange() {
  // 重置防抖计时器
  clearTimeout(_debounceTimer);
  _debounceTimer = setTimeout(() => {
    performSave();
  }, DEBOUNCE_MS);
}

// ---- 兜底心跳 ----

function heartbeat() {
  if (!_storeRef) return;
  const currentVersion = _storeRef._dataVersion;
  if (currentVersion > _savedVersion) {
    performSave();
  }
}

// ---- 生命周期 ----

export function start(store, fileName = '') {
  _storeRef = store;
  _fileName = fileName;
  _savedVersion = store._dataVersion;

  // 兜底定时器
  clearInterval(_heartbeatTimer);
  _heartbeatTimer = setInterval(heartbeat, HEARTBEAT_MS);

  // beforeunload 立即保存
  window.addEventListener('beforeunload', onBeforeUnload);
}

export function stop() {
  clearTimeout(_debounceTimer);
  clearInterval(_heartbeatTimer);
  window.removeEventListener('beforeunload', onBeforeUnload);
  _storeRef = null;
  _currentStatus = Status.IDLE;
  _savedVersion = -1;
}

function onBeforeUnload() {
  if (_storeRef && _storeRef._dataVersion > _savedVersion) {
    performSave();
  }
}

// ---- 恢复检测 ----

export function hasSavedDocument() {
  return readDocument() !== null;
}

export function getSavedDocument() {
  return readDocument();
}

export function discardSavedDocument() {
  clearDocument();
  _savedVersion = -1;
}

// ---- 导出 JSON 后清除 ----

export function onExported() {
  discardSavedDocument();
}

// ---- 设置文件名 ----

export function setFileName(name) {
  _fileName = name;
}

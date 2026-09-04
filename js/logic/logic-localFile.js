// ==========================================
// logic-localFile.js — File System Access API 本地文件读写
// 纯逻辑层，不依赖 UI
// 让浏览器内直接打开/保存磁盘 .json 文件（Chromium 系支持）
// 不支持时由调用方降级为传统 input[type=file] + 下载
// ==========================================

// 当前会话内关联的本地文件句柄（页面刷新后权限失效，需重新打开）
let _currentHandle = null

const JSON_PICKER_OPTS = {
  types: [{ description: 'JSON 文件', accept: { 'application/json': ['.json'] } }]
}

/** 能力检测：当前浏览器是否支持 File System Access API */
export function isFileSystemAccessSupported() {
  return typeof window !== 'undefined' && 'showOpenFilePicker' in window
}

/** 当前关联的本地文件句柄（无则 null） */
export function getCurrentFileHandle() { return _currentHandle }

export function setCurrentFileHandle(h) { _currentHandle = h }

export function clearCurrentFileHandle() { _currentHandle = null }

/**
 * 打开本地 .json 文件（系统文件选择器）
 * 成功返回 { json, name, handle }，并记住句柄供后续直接写回
 * 用户取消时抛出 name === 'AbortError' 的异常
 */
export async function openLocalJsonFile() {
  if (!isFileSystemAccessSupported()) throw new Error('当前浏览器不支持 File System Access API')
  const [handle] = await window.showOpenFilePicker(JSON_PICKER_OPTS)
  const file = await handle.getFile()
  let json
  try { json = JSON.parse(await file.text()) }
  catch (err) { throw new Error('JSON 格式解析失败：' + err.message) }
  _currentHandle = handle
  return { json, name: file.name, handle }
}

/** 将 JSON 写回指定句柄对应的文件 */
export async function saveLocalJsonFile(handle, json) {
  if (!handle) throw new Error('无关联的本地文件')
  // 刷新后权限可能被回收，写前重新请求读写权限
  const perm = typeof handle.queryPermission === 'function'
    ? await handle.queryPermission({ mode: 'readwrite' })
    : 'granted'
  if (perm !== 'granted' && typeof handle.requestPermission === 'function') {
    if (await handle.requestPermission({ mode: 'readwrite' }) !== 'granted') {
      throw new Error('未获得文件写入权限')
    }
  }
  const writable = await handle.createWritable()
  await writable.write(JSON.stringify(json, null, 4))
  await writable.close()
  return true
}

/** 另存为本地 .json 文件（系统保存对话框），成功后记住新句柄 */
export async function saveLocalJsonFileAs(json, suggestedName) {
  if (!isFileSystemAccessSupported()) throw new Error('当前浏览器不支持 File System Access API')
  const handle = await window.showSaveFilePicker({ ...JSON_PICKER_OPTS, suggestedName })
  await saveLocalJsonFile(handle, json)
  _currentHandle = handle
  return handle
}

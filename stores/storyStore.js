// ==========================================
// stores/storyStore.js — Pinia 唯一数据源
// 所有数据逻辑集中在此，不再依赖外部 class
// ==========================================
import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import { createCurJson, createNodeFromTemplate, createOption, resolveTemplateContext } from '../js/logic/logic-storyTypes.js'
import { getStatus, onStatusChange } from '../js/logic/logic-autoSave.js'

// ---- 编辑器元数据 ----
const EDITOR_META_KEY = 'storyeditor_editor_meta'

function loadEditorMeta() {
  try {
    const raw = localStorage.getItem(EDITOR_META_KEY)
    return raw ? JSON.parse(raw) : { fileName: 'Untitled' }
  } catch {
    return { fileName: 'Untitled' }
  }
}

function saveEditorMeta(meta) {
  localStorage.setItem(EDITOR_META_KEY, JSON.stringify(meta))
}

// ---- Pinia Store ----
export const useStoryStore = defineStore('story', () => {
  // ========== 响应式状态 ==========
  const curJson = shallowRef(createCurJson())
  const currentPath = ref([])
  const selectedId = ref(null)
  const dataVersion = ref(0)
  const autoSaveStatus = ref(getStatus())
  const editorMeta = ref(loadEditorMeta())

  // 监听 auto-save 状态
  onStatusChange((status) => { autoSaveStatus.value = status })

  // ========== 内部方法 ==========

  const _listeners = []

  function onChange(fn) {
    _listeners.push(fn)
    return () => { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1) }
  }

  /** 触发变更通知 + 强制 Vue 响应式更新 */
  function _emit() {
    dataVersion.value++
    // 创建新引用以触发 shallowRef 的响应式更新
    curJson.value = JSON.parse(JSON.stringify(curJson.value))
    _listeners.forEach(fn => fn())
  }

  /** 节点数据规范化 */
  function _normalizeNode(raw) {
    const defaults = createNodeFromTemplate('content', '_')
    delete defaults.id
    const merged = { ...defaults, ...raw }
    if (typeof merged.speaker === 'string') merged.speaker = { zh: merged.speaker, en: '' }
    if (typeof merged.text === 'string') merged.text = { zh: merged.text, en: '' }
    if (!merged.speaker) merged.speaker = { zh: '', en: '' }
    if (!merged.text) merged.text = { zh: '', en: '' }
    merged.options = (merged.options || []).map(opt => ({
      text: typeof opt.text === 'string' ? { zh: opt.text, en: '' } : (opt.text || { zh: '', en: '' }),
      next: opt.next || '', showif: opt.showif || {}, actions: opt.actions || []
    }))
    return merged
  }

  // ========== 数据加载 ==========

  function loadCurJson(json) {
    curJson.value = json
    if (!curJson.value.meta) curJson.value.meta = { name: 'Untitled' }
    curJson.value.content = (curJson.value.content || []).map(n => _normalizeNode(n))
    selectedId.value = null
    currentPath.value = []
    _emit()
  }

  function newCurJson(json) {
    curJson.value = json
    selectedId.value = null
    currentPath.value = []
    _emit()
  }

  // ========== 编辑器元数据 ==========

  function getCurJsonName() { return editorMeta.value.fileName || 'Untitled' }

  function setCurJsonName(name) {
    editorMeta.value.fileName = name || 'Untitled'
    saveEditorMeta(editorMeta.value)
    _emit()
  }

  // ========== 节点 CRUD ==========

  /**
   * 按模板创建节点
   * @param {string} ctx 模板上下文
   * @param {Array} [path] 目标路径，默认当前路径
   * @param {boolean} [navigate=true] 创建后是否将 currentPath 跳转到新节点
   */
  function addNode(ctx = null, path = null, navigate = true) {
    const targetPath = path || currentPath.value
    const parent = getByPath(targetPath)
    if (!parent) return

    const tpl = createNodeFromTemplate(ctx || 'default')
    delete tpl.id

    if (Array.isArray(parent)) {
      parent.push(tpl)
      if (navigate) currentPath.value = [...targetPath, String(parent.length - 1)]
    } else if (typeof parent === 'object' && parent !== null) {
      let key = 'new_key'
      let i = 1
      while (key in parent) key = 'new_key_' + i++
      parent[key] = tpl
      if (navigate) currentPath.value = [...targetPath, key]
    }
    _emit()
  }

  // ========== 选项操作 ==========

  function addOption(nodeId) { const node = getNode(nodeId); if (!node) return; node.options.push(createOption()); _emit() }
  function updateOption(nodeId, optIndex, patch) { const node = getNode(nodeId); if (!node || !node.options[optIndex]) return; Object.assign(node.options[optIndex], patch); _emit() }
  function deleteOption(nodeId, optIndex) { const node = getNode(nodeId); if (!node) return; node.options.splice(optIndex, 1); _emit() }

  // ========== 动作操作 ==========

  function addAction(nodeId, optIndex) { const node = getNode(nodeId); if (!node || !node.options[optIndex]) return; node.options[optIndex].actions.push({ cmd: '', params: [] }); _emit() }
  function updateActionCmd(nodeId, optIndex, actionIndex, cmd) { const node = getNode(nodeId); if (!node || !node.options[optIndex]) return; const act = node.options[optIndex].actions[actionIndex]; if (act) act.cmd = cmd; _emit() }
  function updateActionParams(nodeId, optIndex, actionIndex, paramsStr) {
    const node = getNode(nodeId); if (!node || !node.options[optIndex]) return
    const act = node.options[optIndex].actions[actionIndex]
    if (act) { try { act.params = JSON.parse(paramsStr) } catch { act.params = paramsStr.split(',').map(s => s.trim().replace(/^["']|["']$/g, '')) } }
    _emit()
  }
  function deleteAction(nodeId, optIndex, actionIndex) { const node = getNode(nodeId); if (!node || !node.options[optIndex]) return; node.options[optIndex].actions.splice(actionIndex, 1); _emit() }

  // ========== 数据导出 ==========

  function toCleanJSON() {
    function clean(obj) {
      if (Array.isArray(obj)) return obj.map(clean).filter(x => x !== undefined)
      if (obj && typeof obj === 'object') {
        if (obj.zh !== undefined && obj.en !== undefined) { if (!obj.zh && !obj.en) return undefined; const out = {}; if (obj.zh) out.zh = obj.zh; if (obj.en) out.en = obj.en; return out }
        const out = {}
        for (const [k, v] of Object.entries(obj)) { const c = clean(v); if (c !== undefined) out[k] = c }
        if (Object.keys(out).length === 0) return undefined
        return out
      }
      if (obj === '' || obj === null || obj === undefined) return undefined
      return obj
    }
    return clean(curJson.value)
  }

  // ========== 节点查找 ==========

  function getNode(id) { return curJson.value.content.find(n => n.id === String(id)) }

  // ========== 路径导航 ==========

  function getByPath(path) {
    const target = path || currentPath.value
    if (!target || target.length === 0) return curJson.value
    let cur = curJson.value
    for (const seg of target) {
      if (cur === null || cur === undefined) return undefined
      if (Array.isArray(cur)) cur = cur[parseInt(seg)]
      else cur = cur[seg]
    }
    return cur
  }

  function selectPath(path) {
    currentPath.value = path || []
    if (path.length === 2 && path[0] === 'content') selectedId.value = String(path[1])
    else selectedId.value = null
    _emit()
  }

  // ========== 数据写入 ==========

  function setByPath(path, value) {
    if (!path || path.length === 0) { curJson.value = value; _emit(); return }
    const parentPath = path.slice(0, -1)
    const lastSeg = path[path.length - 1]
    const parent = getByPath(parentPath)
    if (!parent) return
    if (Array.isArray(parent)) parent[parseInt(lastSeg)] = value
    else parent[lastSeg] = value
    _emit()
  }

  function addObjectProperty(path, key, val) {
    const parent = getByPath(path)
    if (!parent || typeof parent !== 'object' || Array.isArray(parent)) return
    parent[key] = val
    _emit()
  }

  function addArrayItem(path) {
    const parent = getByPath(path)
    if (!parent || !Array.isArray(parent)) return
    const ctx = resolveTemplateContext([...path, '0'])
    const tpl = createNodeFromTemplate(ctx)
    delete tpl.id
    parent.push(tpl)
    currentPath.value = [...path, String(parent.length - 1)]
    _emit()
  }

  function duplicateEntry(path) {
    if (!path || path.length === 0) return
    const parentPath = path.slice(0, -1)
    const lastSeg = path[path.length - 1]
    const parent = getByPath(parentPath)
    if (!parent) return

    if (Array.isArray(parent)) {
      const idx = parseInt(lastSeg)
      if (isNaN(idx) || idx < 0 || idx >= parent.length) return
      const source = parent[idx]
      if (source === undefined || source === null) return
      const copy = JSON.parse(JSON.stringify(source))
      if (copy.id) copy.id = 'node_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
      parent.splice(idx + 1, 0, copy)
    } else if (typeof parent === 'object' && parent !== null) {
      if (!(lastSeg in parent)) return
      const source = parent[lastSeg]
      if (source === undefined) return
      const copy = JSON.parse(JSON.stringify(source))
      let newKey = lastSeg + '_copy'
      let i = 1
      while (newKey in parent) newKey = lastSeg + '_copy_' + i++
      parent[newKey] = copy
    }
    _emit()
  }

  function deleteAt(path) {
    if (!path || path.length === 0) return
    const parentPath = path.slice(0, -1)
    const lastSeg = path[path.length - 1]
    const parent = getByPath(parentPath)
    if (!parent) return
    if (Array.isArray(parent)) { const idx = parseInt(lastSeg); if (idx >= 0 && idx < parent.length) parent.splice(idx, 1) }
    else if (typeof parent === 'object') delete parent[lastSeg]
    currentPath.value = parentPath
    _emit()
  }

  // ========== 导出 ==========
  return {
    // 状态
    curJson, currentPath, selectedId, dataVersion, autoSaveStatus, editorMeta,
    // 方法
    getByPath, getNode, getCurJsonName, toCleanJSON,
    loadCurJson, newCurJson, setCurJsonName,
    addNode, selectPath, setByPath, deleteAt,
    addObjectProperty, addArrayItem, duplicateEntry,
    addOption, updateOption, deleteOption,
    addAction, updateActionCmd, updateActionParams, deleteAction,
    // 内部方法（供非 Vue 文件调用）
    _emit, onChange
  }
})

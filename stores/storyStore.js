// ==========================================
// stores/storyStore.js — Pinia 状态管理
// 包装现有 StoryStore 实例，使 Vue 组件能
// 通过 useStoryStore() 响应式访问数据
// ==========================================
import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import { store as original } from '../js/logic/logic-storyStore.js'
import { resolveTemplateContext, createNodeFromTemplate } from '../js/logic/logic-storyTypes.js'
import { getStatus, onStatusChange } from '../js/logic/logic-autoSave.js'

export const useStoryStore = defineStore('story', () => {
  // ---- 响应式状态（与原始 store 同步） ----
  const curJson = shallowRef(original.curJson)
  const currentPath = ref([...original.currentPath])
  const selectedId = ref(original.selectedId)
  const dataVersion = ref(original._dataVersion)
  const autoSaveStatus = ref(getStatus())  // 'idle' | 'saving' | 'saved' | 'error'

  // ---- 同步函数：从原始 store 同步到 Pinia ----
  function sync() {
    curJson.value = { ...original.curJson }
    currentPath.value = [...original.currentPath]
    selectedId.value = original.selectedId
    dataVersion.value = original._dataVersion
  }

  // 监听原始 store 变更
  original.onChange(() => { sync() })

  // 监听 auto-save 状态变更
  onStatusChange((status) => { autoSaveStatus.value = status })

  // ---- 工具方法（委托给原始 store） ----
  function getByPath(path) { return original.getByPath(path || currentPath.value) }
  function getNode(id) { return original.getNode(id) }
  function getCurJsonName() { return original.getCurJsonName() }
  function getFilteredNodes() { return original.getFilteredNodes() }
  function toCleanJSON() { return original.toCleanJSON() }

  // ---- 数据变更方法 ----
  function loadCurJson(json) { original.loadCurJson(json) }
  function newCurJson(json) { original.newCurJson(json) }
  function setCurJsonName(name) { original.setCurJsonName(name) }

  function addNode(ctx = null, path = null) { original.addNode(ctx, path) }
  function addBlankNode() { original.addBlankNode() }
  function duplicateNode(id) { original.duplicateNode(id) }
  function deleteNode(id) { original.deleteNode(id) }
  function updateNode(id, patch) { original.updateNode(id, patch) }
  function updateNodeField(id, field, zhVal, enVal) { original.updateNodeField(id, field, zhVal, enVal) }
  function moveNode(fromIndex, toIndex) { original.moveNode(fromIndex, toIndex) }

  function selectNode(id) { original.selectNode(id) }
  function selectPath(path) { original.selectPath(path) }
  function setByPath(path, value) { original.setByPath(path, value) }
  function deleteAt(path) { original.deleteAt(path) }

  function addObjectProperty(path, key, val) { original.addObjectProperty(path, key, val) }
  function addArrayItem(path) { original.addArrayItem(path) }

  function addOption(nodeId) { original.addOption(nodeId) }
  function updateOption(nodeId, optIndex, patch) { original.updateOption(nodeId, optIndex, patch) }
  function updateOptionText(nodeId, optIndex, zhVal, enVal) { original.updateOptionText(nodeId, optIndex, zhVal, enVal) }
  function deleteOption(nodeId, optIndex) { original.deleteOption(nodeId, optIndex) }

  function addAction(nodeId, optIndex) { original.addAction(nodeId, optIndex) }
  function updateActionCmd(nodeId, optIndex, actionIndex, cmd) { original.updateActionCmd(nodeId, optIndex, actionIndex, cmd) }
  function updateActionParams(nodeId, optIndex, actionIndex, paramsStr) { original.updateActionParams(nodeId, optIndex, actionIndex, paramsStr) }
  function deleteAction(nodeId, optIndex, actionIndex) { original.deleteAction(nodeId, optIndex, actionIndex) }

  function setFilter(field, value) { original.setFilter(field, value) }
  function clearFilters() { original.clearFilters() }
  function getFieldValues(field) { return original.getFieldValues(field) }

  return {
    // 状态
    curJson, currentPath, selectedId, dataVersion, autoSaveStatus,
    // 方法（与原始 store 同名，直接委托）
    getByPath, getNode, getCurJsonName, getFilteredNodes, toCleanJSON,
    loadCurJson, newCurJson, setCurJsonName,
    addNode, addBlankNode, duplicateNode, deleteNode, updateNode, updateNodeField, moveNode,
    selectNode, selectPath, setByPath, deleteAt,
    addObjectProperty, addArrayItem,
    addOption, updateOption, updateOptionText, deleteOption,
    addAction, updateActionCmd, updateActionParams, deleteAction,
    setFilter, clearFilters, getFieldValues,
    // 内部方法
    _emit: () => original._emit(),
    _sync: sync
  }
})

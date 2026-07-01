<template>
  <div class="side-view" id="view-outline">
    <div class="tree-search-box">
      <input
        ref="searchInput"
        class="input-sm tree-search-input"
        placeholder="🔍 搜索节点..."
        v-model="searchTerm"
        @input="onSearchInput"
      />
      <button v-if="searchTerm" class="tree-search-clear" @click="clearSearch">✕</button>
    </div>
    <div class="tree-container" id="tree-container">
      <TreeNode
        :key="storyStore.dataVersion"
        :value="storyStore.curJson"
        :path="[]"
        key-name=""
        :depth="0"
        @select="onSelect"
        @search="onSearchFromTree"
        @add="onAdd"
        @delete="requestDelete"
      />
    </div>

    <!-- 删除确认弹窗 -->
    <ConfirmDialog
      :visible="confirmVisible"
      title="确认删除"
      message="确定删除该节点吗？"
      @confirm="doDelete"
      @cancel="confirmVisible = false"
      @update:visible="confirmVisible = $event"
    />
  </div>
</template>

<script setup>
import { ref, reactive, provide } from 'vue'
import { useStoryStore } from '../../stores/storyStore.js'
import TreeNode from './TreeNode.vue'
import { showObjectAddDialog } from '../base/useDialog.js'
import { resolveTemplateContext, createNodeFromTemplate } from '../../js/logic/logic-storyTypes.js'
import ConfirmDialog from '../base/ConfirmDialog.vue'

const storyStore = useStoryStore()

// 共享的响应式展开状态（Vue 3 的 reactive Set 是可追踪的）
const expandedSet = reactive(new Set())
provide('expandedSet', expandedSet)

const searchInput = ref(null)
const searchTerm = ref('')

// ---- 删除确认 ----
const confirmVisible = ref(false)
const pendingDeletePath = ref(null)

function requestDelete(path) {
  pendingDeletePath.value = path
  confirmVisible.value = true
}

function doDelete() {
  if (pendingDeletePath.value) {
    storyStore.deleteAt(pendingDeletePath.value)
    pendingDeletePath.value = null
  }
  confirmVisible.value = false
}

// ---- 选择 ----
function onSelect(path) {
  storyStore.selectPath(path)
}

// ---- 搜索 ----
function onSearchFromTree(path) {
  searchTerm.value = path.join('.') + '.'
  onSearchInput()
  searchInput.value?.focus()
}

function onSearchInput() {
  if (!searchTerm.value?.trim()) {
    clearSearch()
    return
  }
  applySearch(searchTerm.value.trim())
}

function clearSearch() {
  searchTerm.value = ''
  applySearch('')
}

function applySearch(term) {
  const rows = document.querySelectorAll('.tree-row')
  if (!term) {
    rows.forEach(r => { r.style.display = ''; r.classList.remove('search-dim') })
    return
  }

  // 与原有搜索逻辑保持一致
  const lowerTerm = term.toLowerCase()
  const dotIdx = term.lastIndexOf('.')
  let scopePath = '', keyPattern = lowerTerm
  if (dotIdx >= 0) {
    scopePath = lowerTerm.slice(0, dotIdx).toLowerCase()
    keyPattern = lowerTerm.slice(dotIdx + 1).toLowerCase()
  }

  // 找出匹配的行
  const matchSet = new Set()
  rows.forEach(row => {
    const pathArr = JSON.parse(row.dataset.path || '[]')
    const pathStr = pathArr.join('.').toLowerCase()
    const lastKey = (pathArr[pathArr.length - 1] || '').toLowerCase()
    let hit = false
    if (!keyPattern) hit = pathStr.startsWith(scopePath + '.') || pathStr === scopePath
    else if (dotIdx >= 0) hit = (pathStr.startsWith(scopePath + '.') || pathStr === scopePath) && lastKey.includes(keyPattern)
    else hit = pathArr.some(seg => seg.toLowerCase().includes(keyPattern))
    if (hit) matchSet.add(pathStr)
  })

  // 祖先也要可见
  const ancestorSet = new Set()
  for (const matched of matchSet) {
    const segs = matched.split('.')
    for (let i = 0; i < segs.length; i++) ancestorSet.add(segs.slice(0, i + 1).join('.'))
  }

  rows.forEach(row => {
    const pathStr = JSON.parse(row.dataset.path || '[]').join('.').toLowerCase()
    if (ancestorSet.has(pathStr)) {
      row.style.display = ''
      row.classList.remove('search-dim')
    } else {
      row.style.display = 'none'
    }
  })
}

// ---- 添加 ----
async function onAdd(path, type) {
  if (type === 'object') {
    const result = await showObjectAddDialog()
    if (!result || !result.key) return
    const val = result.type === 'number' ? 0 : result.type === 'array' ? [] : result.type === 'object' ? {} : ''
    storyStore.addObjectProperty(path, result.key, val)
  } else if (type === 'array') {
    storyStore.addArrayItem(path)
  }
}
</script>

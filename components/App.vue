<template>
  <div id="app-root">
    <div class="container-fluid row justify-content-around mb-3 mt-3">
      <div class="d-flex col-4">
        <div class="btn-group">
          <button id="btn-add-node" class="my-btn my-btn-create" @click="onCreate">＋ 新建 JSON</button>
          <button id="btn-import" class="my-btn" title="打开本地 .json 文件（获得读写权限，Chrome/Edge）" @click="onImport">📥 导入 JSON</button>
          <button id="btn-save" class="my-btn my-btn-primary" title="覆盖保存到已打开的本地文件（需先导入）" @click="onSave">💾 保存</button>
          <button id="btn-save-as" class="my-btn" title="另存为本地文件（新位置）" @click="onSaveAs">另存为</button>
          <button id="btn-export" class="my-btn" title="下载 JSON 副本（不影响原文件）" @click="onDownload">⬇️ 下载 JSON</button>
        </div>
      </div>
      <div class="d-flex col-4 justify-content-center align-items-center">
        <label for="curjson-name">文件名：</label>
        <input id="curjson-name" class="my-input-sm" :value="curJsonName" @input="onNameInput" />
      </div>
      <div class="d-flex col-4 justify-content-end">
        <button class="my-btn" @click="templateEditorOpen = true">📋 编辑模板</button>
        <button class="my-btn" title="管理字段显示名称" @click="labelManagerOpen = true">🏷️ 标签</button>
      </div>
    </div>

    <div class="main-area">
      <!-- 活动栏（Vue 组件，props/emit 通信） -->
      <ActivityBar
        :active-view="activeView"
        @view-change="onViewChange"
      />

      <!-- 侧面板 -->
      <div
        class="panel panel-side"
        id="panel-side"
        :class="{ collapsed: !sidePanelOpen }"
      >
        <div class="panel-header" id="side-panel-header">
          <span id="side-panel-title">{{ sideTitle }}</span>
          <button class="my-btn-icon" id="btn-close-side" title="关闭侧面板" @click="closeSidePanel">◀</button>
        </div>
        <div class="panel-side-inner">
          <OutlineView v-show="activeView === 'outline'" />
          <StatsPanel v-show="activeView === 'stats'" />
          <SettingsPanel v-show="activeView === 'settings'" @layout-reset="onLayoutReset" />
        </div>
      </div>

      <div class="splitter" data-target="side"></div>

      <PanelCenter />

      <div class="splitter" data-target="right"></div>

      <PanelRight />
    </div>

    <TemplateEditor v-model:visible="templateEditorOpen" />
    <LabelManager v-model:visible="labelManagerOpen" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useStoryStore } from '../stores/storyStore.js'
import { createCurJson, createBlankCurJson } from '../js/logic/logic-storyTypes.js'
import { exportJSON, importJSON } from '../js/logic/logic-storyIO.js'
import { setFileName } from '../js/logic/logic-autoSave.js'
import { showAlert } from './base/useDialog.js'
import { showCreateDialog } from './base_reusable/useCreateDialog.js'
import {
  openLocalJsonFile, saveLocalJsonFile, saveLocalJsonFileAs,
  getCurrentFileHandle, isFileSystemAccessSupported
} from '../js/logic/logic-localFile.js'
import ActivityBar from './layout/layout_main-area/L-side/ActivityBar.vue'
import { useSplitters } from './layout/useSplitters.js'
useSplitters()
import PanelRight from './layout/layout_main-area/R-side/PanelRight.vue'
import OutlineView from './layout/layout_main-area/L-side/OutlineView.vue'
import PanelCenter from './layout/layout_main-area/M-side/PanelCenter.vue'
import SettingsPanel from './Settings/SettingsPanel.vue'
import StatsPanel from './layout/layout_main-area/L-side/StatsPanel.vue'
import TemplateEditor from './base_reusable/TemplateEditor.vue'
import LabelManager from './base_reusable/LabelManager.vue'

const VIEW_LABELS = { outline: '大纲', stats: '统计', settings: '设置' }
const store = useStoryStore()
const activeView = ref('outline')
const sidePanelOpen = ref(true)
const sideTitle = computed(() => VIEW_LABELS[activeView.value] || activeView.value)
const templateEditorOpen = ref(false)
const labelManagerOpen = ref(false)

// ===== 工具栏：文件名 =====
const curJsonName = computed(() => store.getCurJsonName())
function onNameInput(e) {
  const v = e.target.value
  store.setCurJsonName(v)
  setFileName((v || 'Untitled') + '.json')
}

// ===== 工具栏：文件操作 =====
function onCreate() {
  showCreateDialog({
    title: '新建章节',
    blankDesc: '仅返回 {}，不添加任何字段',
    onBlank: () => store.newCurJson(createBlankCurJson()),
    onTemplate: () => store.loadCurJson(createCurJson())
  })
}

async function onImport() {
  if (isFileSystemAccessSupported()) {
    try {
      const { json, name } = await openLocalJsonFile()
      store.loadCurJson(json)
      applyFileName(name.replace(/\.json$/i, ''))
      showAlert(`已打开本地文件：${name}。编辑后用「💾 保存」写回原文件，或用「另存为」保存到新位置。`)
    } catch (err) {
      if (err?.name === 'AbortError') return // 用户取消
      showAlert(err?.message || '打开文件失败')
    }
  } else {
    // 降级：传统文件选择器
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.addEventListener('change', async () => {
      const file = input.files[0]
      if (!file) return
      try {
        const json = await importJSON(file)
        store.loadCurJson(json)
        applyFileName(file.name.replace(/\.json$/i, ''))
      } catch (err) {
        showAlert(err?.message || '打开文件失败')
      }
      input.value = ''
    })
    input.click()
  }
}

async function onSave() {
  const clean = store.toCleanJSON()
  const handle = getCurrentFileHandle()
  if (!handle) {
    showAlert('当前未关联本地文件。请先「📥 导入 JSON」打开文件，或用「另存为」保存到新位置。')
    return
  }
  try {
    await saveLocalJsonFile(handle, clean)
    showAlert(`已保存到：${handle.name}`)
  } catch (err) {
    if (err?.name === 'AbortError') return // 用户取消
    showAlert(err?.message || '保存失败')
  }
}

async function onSaveAs() {
  const clean = store.toCleanJSON()
  const name = store.getCurJsonName() + '.json'
  if (!isFileSystemAccessSupported()) {
    exportJSON(clean, name)
    return
  }
  try {
    await saveLocalJsonFileAs(clean, name)
    showAlert('已另存为本地文件。后续「💾 保存」将直接写回该文件。')
  } catch (err) {
    if (err?.name === 'AbortError') return // 用户取消
    showAlert(err?.message || '另存为失败')
  }
}

function onDownload() {
  exportJSON(store.toCleanJSON(), store.getCurJsonName() + '.json')
}

// 打开本地文件后同步文件名（store / 自动保存）
function applyFileName(name) {
  if (!name) return
  store.setCurJsonName(name)
  setFileName(name + '.json')
}

function closeSidePanel() {
  sidePanelOpen.value = false
  activeView.value = ''
}

function onLayoutReset() {
  sidePanelOpen.value = true
  activeView.value = 'outline'
}

function onViewChange(view) {
  if (!sidePanelOpen.value) {
    // 面板关闭时点击 → 展开并切换
    sidePanelOpen.value = true
    activeView.value = view
  } else if (activeView.value === view) {
    // 点击已激活 → 折叠
    sidePanelOpen.value = false
  } else {
    // 切换视图
    activeView.value = view
  }
}
</script>

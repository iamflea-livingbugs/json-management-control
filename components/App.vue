<template>
  <div id="app-root">
    <div class="container-fluid row justify-content-around mb-3 mt-3">
      <div class="d-flex col-4">
        <div class="btn-group">
          <button id="btn-add-node" class="my-btn my-btn-create">＋ 新建 JSON</button>
          <button id="btn-import" class="my-btn">📥 导入 JSON</button>
          <button id="btn-export" class="my-btn my-btn-primary">📤 导出 JSON</button>
        </div>
      </div>
      <div class="d-flex col-4 justify-content-center align-items-center">
        <label for="curjson-name">文件名：</label>
        <input id="curjson-name" class="my-input-sm" value="Untitled" />
      </div>
      <div class="d-flex col-4 justify-content-end">
        <button id="btn-edit-template" class="my-btn">📋 编辑模板</button>
        <button id="btn-label-manager" class="my-btn" title="管理字段显示名称">🏷️ 标签</button>
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
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import ActivityBar from './layout/layout_main-area/L-side/ActivityBar.vue'
import PanelRight from './layout/layout_main-area/R-side/PanelRight.vue'
import OutlineView from './layout/layout_main-area/L-side/OutlineView.vue'
import PanelCenter from './layout/layout_main-area/M-side/PanelCenter.vue'
import SettingsPanel from './Settings/SettingsPanel.vue'
import StatsPanel from './layout/layout_main-area/L-side/StatsPanel.vue'

const VIEW_LABELS = { outline: '大纲', stats: '统计', settings: '设置' }
const activeView = ref('outline')
const sidePanelOpen = ref(true)
const sideTitle = computed(() => VIEW_LABELS[activeView.value] || activeView.value)

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

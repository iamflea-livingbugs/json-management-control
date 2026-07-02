<template>
  <!-- ==========================================
       App.vue — 根组件（替代 layout.html）
       布局结构直接嵌在模板里，ActivityBar 用 Vue 组件
       所有 ID 保持与原生 JS 的 querySelector 兼容
       ========================================== -->
  <div id="app-root">
    <div class="toolbar">
      <div class="toolbar-left">
        <button id="btn-add-node" class="my-btn my-btn-success">＋ 新建 JSON</button>
        <button id="btn-import" class="my-btn">📥 导入 JSON</button>
        <span class="sep"></span>
        <button id="btn-export" class="my-btn my-btn-primary">📤 导出 JSON</button>
        <span class="sep"></span>
        <label>文件名：</label>
        <input id="curjson-name" class="my-input-sm" value="Untitled" />
      </div>
      <div class="toolbar-right">
        <button id="btn-edit-template" class="my-btn my-btn-sm">📋 编辑模板</button>
        <button id="btn-label-manager" class="my-btn my-btn-sm" title="管理字段显示名称">🏷️ 标签</button>
      </div>
    </div>

    <div class="main-area">
      <!-- 活动栏（Vue 组件） -->
      <ActivityBar />

      <!-- 侧面板 -->
      <div class="panel panel-side" id="panel-side">
        <div class="panel-header" id="side-panel-header">
          <span id="side-panel-title">大纲</span>
          <button class="my-btn-icon" id="btn-close-side" title="关闭侧面板">◀</button>
        </div>
        <div class="panel-side-inner">
          <!-- 大纲视图（Vue 组件） -->
          <OutlineView />
          <!-- 统计视图 -->
          <div class="side-view hidden" id="view-stats">
            <div class="side-view-content">
              <div class="native-badge">原生</div>
              <div class="side-view-placeholder">📊 统计面板（待实现）</div>
            </div>
          </div>
          <!-- 设置视图 -->
          <div class="side-view hidden" id="view-settings">
            <div class="side-view-content"></div>
          </div>
        </div>
      </div>

      <div class="splitter" data-target="side"></div>

      <!-- 中间编辑区（Vue 组件） -->
      <PanelCenter />

      <div class="splitter" data-target="right"></div>

      <!-- 右侧 JSON 预览（Vue 组件） -->
      <PanelRight />
    </div>
  </div>
</template>

<script setup>
import ActivityBar from './layout/ActivityBar.vue'
import PanelRight from './layout/PanelRight.vue'
import OutlineView from './layout/OutlineView.vue'
import PanelCenter from './layout/PanelCenter.vue'
</script>

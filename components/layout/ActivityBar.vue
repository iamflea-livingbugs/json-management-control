<template>
  <!--
    活动栏组件 — 页面左侧三个图标按钮（大纲 / 统计 / 设置）

    使用方式：由 ui-init.js 挂载到 <div id="activity-bar"> 上

    通信方式：
      点击按钮时通过 CustomEvent('activity-change') 向上派发事件，
      ui-init.js 监听该事件来切换侧面板内容。

    事件 detail 结构：
      { view: 'outline'|'stats'|'settings', action: 'switch'|'collapse' }
        switch   → 切换到该视图
        collapse → 关闭侧面板（再次点击已激活的按钮时）
  -->
  <div class="activity-bar" id="activity-bar">
    <div class="activity-bar-buttons">
      <div
        v-for="item in items"
        :key="item.view"
        class="activity-btn"
        :class="{ active: activeView === item.view }"
        :title="item.label"
        @click="onClick(item.view)"
      >
        <span class="activity-icon">{{ item.icon }}</span>
        <span class="activity-label">{{ item.label }}</span>
      </div>
    </div>
    <AutoSaveIndicator />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import AutoSaveIndicator from '../AutoSaveIndicator.vue'

// ===== 按钮数据 =====
// view：视图标识，与 layout.html 中 #view-xxx 的 xxx 对应
// label：鼠标悬停提示
// icon：显示在按钮上的 emoji
const items = [
  { view: 'outline', label: '大纲', icon: '📂' },
  { view: 'stats',   label: '统计', icon: '📊' },
  { view: 'settings',label: '设置', icon: '⚙️' }
]

// ===== 当前激活的视图 =====
// 页面加载时默认激活"大纲"
const activeView = ref('outline')

// ===== 点击处理 =====
// 点击逻辑：
//   1. 点击未激活的按钮 → 切换到该视图
//   2. 点击已激活的按钮 → 关闭侧面板
function onClick(view) {
  if (activeView.value === view) {
    // 再次点击已激活的 → 关闭面板
    activeView.value = ''
    dispatchEvent(view, 'collapse')
    return
  }
  // 点击其他视图 → 切换
  activeView.value = view
  dispatchEvent(view, 'switch')
}

// ===== 派发自定义事件 =====
// 用原生 CustomEvent 通知 ui-init.js
// 因为侧面板的展开/收起逻辑还在原生 JS 里（expandSidePanel / collapseSidePanel）
function dispatchEvent(view, action) {
  const event = new CustomEvent('activity-change', {
    detail: { view, action },
    bubbles: true
  })
  const el = document.getElementById('activity-bar')
  if (el) el.dispatchEvent(event)
}
</script>

<style scoped>
.activity-bar {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.activity-bar-buttons {
  display: flex;
  flex-direction: column;
}
</style>

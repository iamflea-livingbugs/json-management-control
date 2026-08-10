<template>
  <div class="activity-bar" id="activity-bar">
    <div class="activity-bar-buttons">
      <div
        v-for="item in items"
        :key="item.view"
        class="activity-btn"
        :class="{ active: activeView === item.view }"
        :title="item.label"
        @click="$emit('view-change', item.view)"
      >
        <span class="activity-icon">{{ item.icon }}</span>
        <span class="activity-label">{{ item.label }}</span>
      </div>
    </div>
    <AutoSaveIndicator />
  </div>
</template>

<script setup>
import AutoSaveIndicator from '../../../layout/layout_toolbar/AutoSaveIndicator.vue'

const props = defineProps({
  activeView: { type: String, default: 'outline' }
})

defineEmits(['view-change'])

const items = [
  { view: 'outline', label: '大纲', icon: '📂' },
  { view: 'stats',   label: '统计', icon: '📊' },
  { view: 'settings',label: '设置', icon: '⚙️' }
]
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

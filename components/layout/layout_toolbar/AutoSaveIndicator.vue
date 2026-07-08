<template>
  <div class="auto-save-indicator" :class="statusClass" :title="tooltip">
    <span v-if="status === 'saving'" class="asi-icon">💾</span>
    <span v-else-if="status === 'saved'" class="asi-icon">✓</span>
    <span v-else-if="status === 'error'" class="asi-icon">⚠</span>
    <span class="asi-text">{{ label }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useStoryStore } from '../../../stores/storyStore.js'

const store = useStoryStore()
const status = computed(() => store.autoSaveStatus)

const statusClass = computed(() => `asi-${status.value}`)

const label = computed(() => {
  switch (status.value) {
    case 'saving': return '保存中…'
    case 'saved':  return '已自动保存'
    case 'error':  return '保存失败'
    default:       return ''
  }
})

const tooltip = computed(() => {
  switch (status.value) {
    case 'saving': return '正在自动保存…'
    case 'saved':  return '已自动保存到本地'
    case 'error':  return '自动保存写入失败'
    default:       return ''
  }
})
</script>

<style scoped>
.auto-save-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  font-size: 0.75rem;
  color: var(--text-dim);
  cursor: default;
  user-select: none;
  border-top: 1px solid var(--border);
  min-height: 24px;
}
.asi-icon {
  font-size: 0.7rem;
  line-height: 1;
}
.asi-text {
  font-size: 0.7rem;
  line-height: 1;
}
.asi-saved {
  color: var(--success);
}
.asi-error {
  color: var(--accent);
}
.asi-saving .asi-icon {
  animation: asi-spin 1s linear infinite;
}
@keyframes asi-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>

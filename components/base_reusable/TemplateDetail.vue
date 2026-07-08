<template>
  <div class="tpl-detail">
    <div class="tpl-detail-header">
      <h4>{{ config.label || templateKey }}</h4>
      <span v-if="config.category" class="tpl-detail-cat">{{ config.category }}</span>
    </div>
    <p v-if="config.description" class="tpl-detail-desc">{{ config.description }}</p>

    <div class="tpl-detail-fields">
      <div v-for="(val, key) in templateValue" :key="key" class="tpl-detail-field-row">
        <span class="tpl-detail-field-key">{{ key }}</span>
        <span class="type-badge" :class="'type-' + fieldType(val)">{{ fieldTypeLabel(val) }}</span>
        <span class="tpl-detail-field-val">{{ fieldPreview(val) }}</span>
      </div>
    </div>

    <div v-if="Object.keys(templateValue).length === 0" class="empty-hint">此模板无字段</div>
  </div>
</template>

<script setup>
const props = defineProps({
  templateKey: { type: String, default: '' },
  templateValue: { type: Object, default: () => ({}) },
  templateConfig: { type: Object, default: () => ({}) }
})

const config = props.templateConfig

function fieldType(val) {
  if (val === null || val === undefined) return 'nil'
  if (typeof val === 'object') {
    if (Array.isArray(val)) return 'arr'
    if (val.zh !== undefined || val.en !== undefined) return 'i18n'
    return 'obj'
  }
  if (typeof val === 'number') return 'num'
  return 'str'
}

function fieldTypeLabel(val) {
  const labels = { str: 'str', num: 'num', arr: 'arr', obj: 'obj', i18n: 'i18n', nil: 'nil' }
  return labels[fieldType(val)] || '?'
}

function fieldPreview(val) {
  if (val === null) return 'null'
  if (val === undefined) return 'undefined'
  if (typeof val === 'object') {
    if (Array.isArray(val)) return `[${val.length}]`
    if (val.zh !== undefined) return `{ zh: "${trunc(val.zh)}", en: "${trunc(val.en)}" }`
    return `{ ${Object.keys(val).join(', ')} }`
  }
  return String(val)
}

function trunc(s, n = 20) {
  return s && s.length > n ? s.slice(0, n) + '…' : s
}
</script>

<style scoped>
.tpl-detail {
  padding: 0;
}
.tpl-detail-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.tpl-detail-header h4 {
  margin: 0;
  font-size: 1rem;
}
.tpl-detail-cat {
  font-size: 0.7rem;
  color: var(--text-dim);
  background: var(--bg-input);
  padding: 2px 6px;
  border-radius: 4px;
}
.tpl-detail-desc {
  color: var(--text-dim);
  font-size: 0.8rem;
  margin: 0 0 12px 0;
}
.tpl-detail-fields {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.tpl-detail-field-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: var(--bg);
  border-radius: var(--radius);
  font-size: 0.8rem;
}
.tpl-detail-field-key {
  font-weight: 600;
  min-width: 80px;
  color: var(--accent);
}
.tpl-detail-field-val {
  color: var(--text-dim);
  font-family: monospace;
  font-size: 0.75rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

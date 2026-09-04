<template>
  <Modal
    :visible="visible"
    title="🏷️ 字段标签管理"
    width="520px"
    @update:visible="requestClose"
  >
    <div class="label-manager-hint">在此管理字段的显示名称。修改后表单编辑器和模板中会显示你设置的名字，原始键名不变。</div>
    <div class="label-manager-table">
      <div v-if="keys.length === 0" class="empty-hint" style="padding:24px 0">暂无自定义标签，点击下方 "＋ 添加自定义标签" 创建。</div>
      <div v-for="key in keys" :key="key" class="label-manager-row">
        <div class="label-mgr-key">{{ key }}</div>
        <input
          class="my-input my-input-sm label-mgr-input"
          :value="labels[key] || ''"
          placeholder="显示名称"
          @input="onEdit(key, $event)"
        />
        <button class="my-btn-icon btn-label-del" :title="'删除标签 ' + key" @click="onDelete(key)">✕</button>
      </div>
    </div>
    <template #footer>
      <button class="my-btn my-btn-sm my-btn-success" @click="onAdd">＋ 添加自定义标签</button>
      <button class="my-btn my-btn-sm" @click="onReset">重置全部</button>
      <button class="my-btn my-btn-sm my-btn-primary" @click="requestClose">关闭</button>
    </template>
  </Modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import Modal from '../base/Modal.vue'
import { loadLabels, saveLabel } from '../../js/logic/logic-storyTypes.js'
import { useStoryStore } from '../../stores/storyStore.js'
import { showConfirm, showPrompt } from '../base/useDialog.js'
import { readConfig, writeConfig } from '../../js/logic/logic-migration.js'

const props = defineProps({
  visible: { type: Boolean, default: false }
})
const emit = defineEmits(['close', 'update:visible'])

const storyStore = useStoryStore()
const labels = ref({})
const keys = computed(() => Object.keys(labels.value))

watch(() => props.visible, (v) => {
  if (v) labels.value = { ...loadLabels() }
})

function requestClose() {
  emit('update:visible', false)
  emit('close')
}

function refresh() {
  labels.value = { ...loadLabels() }
  storyStore._emit()
}

async function onAdd() {
  const key = await showPrompt('请输入新字段的键名（英文）:', 'new_field')
  if (!key) return
  const label = await showPrompt(`请输入 "${key}" 的显示名称:`)
  if (!label) return
  saveLabel(key, label)
  refresh()
}

function onEdit(key, event) {
  const val = event.target.value.trim()
  if (val) saveLabel(key, val)
  else {
    const all = loadLabels()
    delete all[key]
    const c = readConfig() || {}
    c.labels = all
    writeConfig(c)
  }
  storyStore._emit()
}

async function onDelete(key) {
  const ok = await showConfirm(`确定删除字段 "${key}" 的标签吗？`)
  if (!ok) return
  const all = loadLabels()
  delete all[key]
  const c = readConfig() || {}
  c.labels = all
  writeConfig(c)
  refresh()
}

async function onReset() {
  const ok = await showConfirm('确定重置所有字段标签为默认值吗？')
  if (ok) {
    const c = readConfig() || {}
    delete c.labels
    writeConfig(c)
    refresh()
  }
}
</script>

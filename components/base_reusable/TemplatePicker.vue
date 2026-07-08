<template>
  <Modal :visible="visible" title="选择模板" width="780px" @close="onCancel">
    <div class="tpl-picker-layout">
      <!-- 左栏：树形结构 + 搜索 -->
      <div class="tpl-picker-tree">
        <TemplateTree
          :groups="groups"
          :selected-key="selectedKey"
          @select="onSelect"
        />
      </div>

      <!-- 右栏：模板详情 -->
      <div class="tpl-picker-detail">
        <TemplateDetail
          v-if="selectedKey"
          :template-key="selectedKey"
          :template-value="selectedTemplate"
          :template-config="selectedConfig"
        />
        <div v-else class="empty-hint">请从左侧选择一个模板</div>
      </div>
    </div>

    <template #footer>
      <button class="my-btn my-btn-sm" @click="onCancel">取消</button>
      <button
        v-if="selectedKey"
        class="my-btn my-btn-sm my-btn-create"
        @click="confirm"
      >使用此模板</button>
    </template>
  </Modal>
</template>

<script setup>
import { computed, ref } from 'vue'
import Modal from '../base/Modal.vue'
import TemplateTree from './TemplateTree.vue'
import TemplateDetail from './TemplateDetail.vue'
import { getContextKeys, getContextsConfig, loadEffectiveTemplates } from '../../js/logic/logic-storyTypes.js'

const props = defineProps({
  visible: { type: Boolean, default: false }
})

const emit = defineEmits(['select'])

// 数据分组（快照加载，不随时间变化）
const ctxKeys = getContextKeys()
const ctxConfig = getContextsConfig()
const templates = loadEffectiveTemplates()

// 按 category 分组
const groups = {}
ctxKeys.forEach(k => {
  const cfg = ctxConfig[k] || {}
  const cat = cfg.category || '未分类'
  if (!groups[cat]) groups[cat] = []
  groups[cat].push({ key: k, cfg })
})

const selectedKey = ref(null)
function onSelect(key) { selectedKey.value = key }

const selectedConfig = computed(() => ctxConfig[selectedKey.value] || {})
const selectedTemplate = computed(() => {
  const key = selectedKey.value
  return key ? (templates[key] || {}) : null
})

function confirm() {
  emit('select', selectedKey.value)
}
function onCancel() {
  emit('select', null)
}
</script>

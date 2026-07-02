<template>
  <div class="editor-tab-panel" id="panel-form">
    <div class="editor-header">
      <h3>{{ pathLabel }}</h3>
    </div>

    <!-- null / undefined -->
    <div v-if="currentValue === null || currentValue === undefined" class="empty-hint">null</div>

    <!-- 原始值（非对象） -->
    <div v-else-if="typeof currentValue !== 'object'" class="field-row">
      <label class="field-label">值</label>
      <input
        class="my-input my-form-simple-value"
        :value="String(currentValue)"
        @change="(e) => updateRootValue(e.target.value)"
      />
    </div>

    <!-- 对象/数组 -->
    <template v-else>
      <div class="editor-fields" :key="'fields-' + renderKey">
        <FormField
          v-for="(entry, idx) in entries"
          :key="entry.key + '-' + idx + '-' + renderKey"
          :key-name="entry.key"
          :value="entry.value"
          :parent-path="currentPath"
        />
      </div>

      <!-- 数组添加按钮 -->
      <div v-if="isArray" class="array-add-bar">
        <select v-model="addType" class="my-input-sm" style="width:auto">
          <option v-for="opt in addOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
        <button class="my-btn my-btn-sm my-btn-success" @click="addArrayItem">＋ 添加</button>
      </div>

      <!-- 对象添加属性按钮 -->
      <div v-else :key="'obj-' + currentPath.join('.')" class="array-add-bar">
        <select v-model="objAddType" class="my-input-sm" style="width:auto">
          <option value="string">字符串 ""</option>
          <option value="number">数字 0</option>
          <option value="array">空数组 []</option>
          <option value="object">空对象 {}</option>
        </select>
        <button class="my-btn my-btn-sm my-btn-success" @click="addObjectProperty">＋ 添加属性</button>
      </div>

      <!-- 选项编辑器 -->
      <div v-if="showOptions" class="editor-options">
        <OptionsEditor :node="currentValue" />
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useStoryStore } from '../../stores/storyStore.js'
import FormField from './FormField.vue'
import OptionsEditor from './OptionsEditor.vue'

const storyStore = useStoryStore()

// 强制刷新 key：数据版本变化时手动触发表单重新渲染
const renderKey = ref(0)
watch(() => storyStore.dataVersion, () => { renderKey.value++ })

const currentPath = computed(() => storyStore.currentPath || [])
const currentValue = computed(() => {
  if (currentPath.value.length === 0) return storyStore.curJson
  return storyStore.getByPath(currentPath.value)
})

const pathLabel = computed(() => {
  const p = currentPath.value
  return p.length === 0 ? '(root)' : p.join(' → ')
})

// ---- 遍历字段 ----
const isArray = computed(() => Array.isArray(currentValue.value))
const entries = computed(() => {
  const val = currentValue.value
  if (!val || typeof val !== 'object') return []
  if (Array.isArray(val)) {
    return val.map((item, i) => ({ key: String(i), value: item }))
  }
  return Object.entries(val).map(([k, v]) => ({ key: k, value: v }))
})

// ---- 数组添加类型选项 ----
const addType = ref('object')
const addOptions = computed(() => {
  const pStr = currentPath.value.join('.')
  const isContent = currentPath.value.length === 1 && currentPath.value[0] === 'content'
  const isOptions = pStr.includes('options')
  const isActions = pStr.includes('actions')

  const opts = []
  if (isContent) opts.push({ value: 'content', label: '对话节点(content模板)' })
  if (isOptions) opts.push({ value: 'option', label: '选项(option模板)' })
  if (isActions) opts.push({ value: 'action', label: '动作(action模板)' })
  opts.push({ value: 'object', label: '空对象 {}' })
  opts.push({ value: 'string', label: '字符串 ""' })
  opts.push({ value: 'number', label: '数字 0' })
  opts.push({ value: 'array', label: '空数组 []' })
  return opts
})

const objAddType = ref('string')

function addArrayItem() {
  const selected = addType.value
  if (selected === 'content' || selected === 'option' || selected === 'action') {
    storyStore.addArrayItem(currentPath.value)
  } else {
    const parent = storyStore.getByPath(currentPath.value)
    if (!parent || !Array.isArray(parent)) return
    let item
    switch (selected) {
      case 'string': item = ''; break
      case 'number': item = 0; break
      case 'array': item = []; break
      default: item = {}
    }
    parent.push(item)
    storyStore._emit()
  }
}

function addObjectProperty() {
  const obj = storyStore.getByPath(currentPath.value)
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return
  let newKey = 'new_key'
  let i = 1
  while (newKey in obj) newKey = 'new_key_' + i++
  switch (objAddType.value) {
    case 'number': obj[newKey] = 0; break
    case 'array': obj[newKey] = []; break
    case 'object': obj[newKey] = {}; break
    default: obj[newKey] = ''
  }
  storyStore.setByPath(currentPath.value, obj)
}

function updateRootValue(val) {
  if (currentPath.value.length > 0) {
    storyStore.setByPath([...currentPath.value], val)
  }
}

// ---- 选项编辑器 ----
const showOptions = computed(() => {
  const p = currentPath.value
  const val = currentValue.value
  return p.length === 2 && p[0] === 'content' && val && val.options
})
</script>

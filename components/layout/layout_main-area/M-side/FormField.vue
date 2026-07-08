<template>
  <div
    class="field-row"
    :class="rowClass"
    :data-field="keyName"
    :data-parentpath="parentPathStr"
  >
    <!-- 字段名（可双击改名） -->
    <label
      class="editable-label field-label"
      :data-key="keyName"
      :title="'双击编辑标签' + (labelAlias ? ' · 显示名: ' + labelAlias : '')"
      @dblclick="startRename"
      ref="labelEl"
    >
      {{ keyName }}<span v-if="labelAlias" class="field-label-alias">{{ labelAlias }}</span>
    </label>

    <!-- 模板/自定义标记 -->
    <span v-if="templateBadge" class="type-badge" :class="templateBadgeClass">{{ templateBadge }}</span>

    <!-- 类型标签 -->
    <span class="type-badge" :class="'type-' + typeLabel">{{ typeLabel }}</span>

    <!-- i18n 多语言输入组 -->
    <template v-if="typeLabel === 'i18n'">
      <div class="i18n-group">
        <input
          v-for="lang in activeLangs"
          :key="lang"
          class="my-input my-form-i18n-lang"
          :value="i18nValue(lang)"
          :placeholder="lang"
          @change="(e) => updateI18n(lang, e.target.value)"
        />
      </div>
    </template>

    <!-- 普通输入 -->
    <template v-else-if="typeLabel === 'str' || typeLabel === 'num'">
      <input
        class="my-input my-form-field"
        :class="{ 'my-input-num': typeLabel === 'num' }"
        :value="stringValue"
        @change="(e) => updateValue(e.target.value)"
      />
    </template>

    <!-- null -->
    <template v-else-if="typeLabel === 'nil'">
      <input class="my-input my-form-field" value="" placeholder="null" disabled />
    </template>

    <!-- 对象/数组摘要 -->
    <template v-else-if="typeLabel === 'obj' || typeLabel === 'arr'">
      <span class="nested-preview">{{ summary }}</span>
      <button class="my-btn-jump" @click="jumpTo">跳转</button>
    </template>

    <!-- 操作按钮组 -->
    <span class="field-actions" v-if="keyName">
      <button
        class="my-btn-icon"
        title="保存为模板"
        @click.stop="saveFieldAsTemplate"
      >💾</button>
      <button
        class="my-btn-icon"
        title="复制属性"
        @click.stop="copyField"
      >⧉</button>
      <button
        class="my-btn-icon my-btn-del-field"
        :data-del-key="keyName"
        title="删除属性"
        @click="deleteField"
      >✕</button>
    </span>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { useStoryStore } from '../../../../stores/storyStore.js'
import { getFieldLabel, getLanguages, loadEffectiveTemplates, resolveTemplateContext, saveTemplate } from '../../../../js/logic/logic-storyTypes.js'
import { createDialog } from '../../../base/useDialog.js'

const props = defineProps({
  keyName: { type: String, default: '' },
  value: { type: null, default: null },
  parentPath: { type: Array, default: () => [] }
})

const storyStore = useStoryStore()
const labelEl = ref(null)

const parentPathStr = computed(() => props.parentPath.join('|'))

// ---- 字段别名 ----
const labelAlias = computed(() => {
  const lbl = getFieldLabel(props.keyName)
  return lbl !== props.keyName ? lbl : ''
})

// ---- 模板标记 ----
const templateBadge = computed(() => {
  if (!props.keyName) return ''
  const ctx = resolveTemplateContext(props.parentPath)
  const templates = loadEffectiveTemplates()
  const tpl = templates[ctx] || {}
  if (props.keyName in tpl) return '📋'
  return '🔧'
})
const templateBadgeClass = computed(() => {
  return templateBadge.value === '📋' ? 'my-badge-template' : 'my-badge-custom'
})

// ---- 类型识别 ----
const v = computed(() => props.value)
const isI18n = computed(() => {
  const val = v.value
  return typeof val === 'object' && !Array.isArray(val) && val && 'zh' in val
})

const typeLabel = computed(() => {
  const val = v.value
  if (val === null || val === undefined) return 'nil'
  if (isI18n.value) return 'i18n'
  if (Array.isArray(val)) return 'arr'
  if (typeof val === 'number') return 'num'
  if (typeof val === 'object') return 'obj'
  return 'str'
})

const rowClass = computed(() => {
  if (typeLabel.value === 'nil') return 'field-row-null'
  if (typeLabel.value === 'i18n') return 'field-row-i18n'
  if (typeLabel.value === 'num') return 'field-row-num'
  if (typeLabel.value === 'arr') return 'field-row-arr'
  if (typeLabel.value === 'obj') return 'field-row-obj'
  return ''
})

const stringValue = computed(() => {
  const val = v.value
  return val === null || val === undefined ? '' : String(val)
})

const summary = computed(() => {
  const val = v.value
  if (Array.isArray(val)) return JSON.stringify(val.slice(0, 3)) + (val.length > 3 ? '...' : '')
  if (typeof val === 'object' && val) return JSON.stringify(val).slice(0, 40)
  return ''
})

// ---- i18n ----
const activeLangs = computed(() => getLanguages())

function i18nValue(lang) {
  const val = v.value
  if (!val || typeof val !== 'object') return ''
  return val[lang] || ''
}

function updateI18n(lang, newVal) {
  const path = [...props.parentPath, props.keyName, lang]
  storyStore.setByPath(path, newVal)
}

// ---- 普通值更新 ----
function updateValue(newVal) {
  const path = [...props.parentPath, props.keyName]
  storyStore.setByPath(path, newVal)
}

// ---- 跳转 ----
function jumpTo() {
  const path = [...props.parentPath, props.keyName]
  storyStore.selectPath(path)
}

// ---- 复制字段 ----
function copyField() {
  const fullPath = [...props.parentPath, props.keyName]
  storyStore.duplicateEntry(fullPath)
}

// ---- 删除字段 ----
function deleteField() {
  const obj = storyStore.getByPath(props.parentPath)
  if (obj && typeof obj === 'object' && props.keyName in obj) {
    delete obj[props.keyName]
    storyStore.setByPath(props.parentPath, obj)
  }
}

// ---- 保存为模板 ----
async function saveFieldAsTemplate() {
  const val = v.value
  if (val === null || val === undefined) return

  const cleaned = JSON.parse(JSON.stringify(val))

  const name = await createDialog({
    title: '保存字段为模板',
    bodyHTML: `
      <div style="margin-bottom:8px">字段「${props.keyName}」将保存为模板。输入模板名称：</div>
      <input id="tpl-name-input" class="my-input" value="${props.keyName}_tpl"
        style="width:100%" placeholder="模板名称" />
    `,
    focusSelector: '#tpl-name-input',
    buttons: [
      { label: '取消', value: null },
      { label: '保存', primary: true, getValue: () => {
        const input = document.querySelector('#tpl-name-input')
        return input ? input.value.trim() : null
      }}
    ]
  })

  if (!name) return
  saveTemplate(name, cleaned)
}

// ---- 双击改名 ----
function startRename(e) {
  const label = labelEl.value
  if (!label) return
  const oldKey = props.keyName
  const current = label.textContent.trim()

  const input = document.createElement('input')
  input.className = 'my-input-sm label-editor'
  input.value = current
  input.style.width = Math.max(60, label.offsetWidth + 20) + 'px'
  label.replaceWith(input)
  input.focus()
  input.select()

  function finish() {
    const newKey = input.value.trim()
    if (newKey && newKey !== current) {
      const parent = storyStore.getByPath(props.parentPath)
      if (parent && typeof parent === 'object' && oldKey in parent) {
        // 更新 currentPath 中的引用
        if (storyStore.currentPath.includes(oldKey)) {
          storyStore.currentPath = storyStore.currentPath.map(s => s === oldKey ? newKey : s)
        }
        parent[newKey] = parent[oldKey]
        delete parent[oldKey]
        storyStore.setByPath(props.parentPath, parent)
      }
    } else {
      // 恢复标签
      const lbl = document.createElement('label')
      lbl.className = 'editable-label field-label'
      lbl.dataset.key = oldKey
      lbl.textContent = current
      lbl.title = '双击编辑标签'
      lbl.addEventListener('dblclick', startRename)
      input.replaceWith(lbl)
    }
  }

  input.addEventListener('blur', finish)
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); input.blur() }
    if (e.key === 'Escape') { input.value = current; input.blur() }
  })
}
</script>

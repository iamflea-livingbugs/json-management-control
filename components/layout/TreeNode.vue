<template>
  <div>
    <!-- 当前节点的行 -->
    <div
      class="tree-row"
      :class="{ selected: isSelected }"
      :style="{ paddingLeft: (depth + 1) * 14 + 'px' }"
      :data-path="JSON.stringify(path)"
      @click="onRowClick"
    >
      <span class="tree-icon">{{ icon }}</span>
      <span class="tree-key">{{ displayKey }}</span>
      <span v-if="templateBadge" class="tree-badge" :class="templateBadgeClass">{{ templateBadge }}</span>
      <span class="tree-summary" :class="valueType">{{ summary }}</span>
      <span class="tree-actions">
        <button v-if="path.length > 0" class="tree-search-btn" title="搜索此路径" @click.stop="emit('search', path)">🔍</button>
        <button v-if="canAdd" class="tree-add-btn" title="添加子项" @click.stop="emit('add', path, nodeType)">＋</button>
        <button v-if="canDelete" class="tree-del-btn" title="删除" @click.stop="emit('delete', path)">✕</button>
      </span>
    </div>

    <!-- 子节点（仅对象/数组且展开时渲染） -->
    <div v-if="isExpandable && isExpanded" class="tree-children">
      <TreeNode
        v-for="(child, idx) in children"
        :key="child.key + '-' + idx"
        :value="child.val"
        :path="child.path"
        :key-name="child.key"
        :depth="depth + 1"
        :parent-template-keys="childTemplateKeys"
        @select="(p) => emit('select', p)"
        @search="(p) => emit('search', p)"
        @add="(p, t) => emit('add', p, t)"
        @delete="(p) => emit('delete', p)"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue'
import { resolveTemplateContext, loadEffectiveTemplates } from '../../js/logic/logic-storyTypes.js'
import { useStoryStore } from '../../stores/storyStore.js'
// 递归组件需要自引用
import TreeNode from './TreeNode.vue'

const props = defineProps({
  value: { type: null, required: true },
  path: { type: Array, default: () => [] },
  keyName: { type: String, default: '' },
  depth: { type: Number, default: 0 },
  /** 当前节点所属上下文的模板键名集合（由父节点传递） */
  parentTemplateKeys: { type: Object, default: null }
})

const emit = defineEmits(['select', 'search', 'add', 'delete'])

// ---- 工具函数 ----
function pathKey(p) { return p.join('/') }
function pathsEqual(a, b) {
  if (a.length !== b.length) return false
  return a.every((v, i) => String(v) === String(b[i]))
}

// ---- 选中状态（从 store 获取）----
const storyStore = useStoryStore()
const isSelected = computed(() => pathsEqual(props.path, storyStore.currentPath))

// ---- 展开/折叠 ----
const pk = computed(() => pathKey(props.path))
// 从 OutlineView 注入的响应式展开状态
const expandedSet = inject('expandedSet')
const isExpandable = computed(() => {
  const v = props.value
  if (!v || typeof v !== 'object') return false
  const len = Array.isArray(v) ? v.length : Object.keys(v).length
  return len > 0
})
const isExpanded = computed(() => {
  if (!isExpandable.value) return false
  if (props.depth === 0) return true
  return expandedSet.has(pk.value)
})

function toggleExpanded() {
  if (expandedSet.has(pk.value)) expandedSet.delete(pk.value)
  else expandedSet.add(pk.value)
}

// ---- 图标 ----
const icon = computed(() => {
  if (!isExpandable.value) return '•'
  return isExpanded.value ? '▼' : '▶'
})

// ---- 键名显示 ----
const displayKey = computed(() => {
  if (!props.keyName) return '(root)'
  return /^\d+$/.test(props.keyName) ? `[${props.keyName}]` : props.keyName
})

// ---- 值摘要 ----
const valueType = computed(() => {
  const v = props.value
  if (v === null || v === undefined) return 'type-nil'
  if (typeof v === 'string') return 'type-str'
  if (typeof v === 'number') return 'type-num'
  if (Array.isArray(v)) return 'type-arr'
  return 'type-obj'
})

const summary = computed(() => {
  const v = props.value
  if (v === null) return 'null'
  if (v === undefined) return 'undefined'
  if (typeof v === 'string') return v.slice(0, 50)
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (Array.isArray(v)) return `[ ${v.length} 项 ]`
  if (typeof v === 'object') return `{ ${Object.keys(v).length} 个属性 }`
  return ''
})

// ---- 子节点列表 ----
const children = computed(() => {
  const v = props.value
  if (!v || typeof v !== 'object') return []
  if (Array.isArray(v)) {
    return v.map((item, i) => ({ val: item, path: [...props.path, String(i)], key: String(i) }))
  }
  return Object.keys(v).map(k => ({ val: v[k], path: [...props.path, k], key: k }))
})

// ---- 当前节点的类型（用于添加按钮）----
const nodeType = computed(() => Array.isArray(props.value) ? 'array' : 'object')

const canAdd = computed(() => {
  if (!props.value || typeof props.value !== 'object') return false
  return true
})
const canDelete = computed(() => props.path.length > 0)

// ---- 模板标记 ----
// 当前节点自己的模板标记（根据父节点传来的 templateKeys 判断）
const templateBadge = computed(() => {
  if (!props.keyName || props.depth === 0) return ''
  if (!props.parentTemplateKeys) return ''
  if (props.parentTemplateKeys.has(props.keyName)) return '📋'
  return '🔧'
})

const templateBadgeClass = computed(() => {
  return templateBadge.value === '📋' ? 'my-badge-template' : 'my-badge-custom'
})

// ---- 传递给子节点的模板键名集合 ----
// 计算当前节点自身的上下文，找出其模板字段
const childTemplateKeys = computed(() => {
  const v = props.value
  if (!v || typeof v !== 'object') return null
  // 获取当前路径的模板上下文
  const ctx = resolveTemplateContext(props.path)
  const templates = loadEffectiveTemplates()
  const tpl = templates[ctx] || {}
  return new Set(Object.keys(tpl))
})

// ---- 点击事件 ----
function onRowClick(e) {
  if (e.target.closest('.tree-search-btn') || e.target.closest('.tree-add-btn') || e.target.closest('.tree-del-btn')) return
  toggleExpanded()
  emit('select', props.path)
}
</script>

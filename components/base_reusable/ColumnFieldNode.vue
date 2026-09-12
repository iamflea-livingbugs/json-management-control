<template>
  <div class="col-tree-node">
    <div class="col-tree-row" :class="{ 'col-tree-row-top': isTop }">
      <!-- 顶层字段可勾选为列；子字段仅供展示 -->
      <input v-if="isTop" type="checkbox" class="col-tree-check" :checked="isChecked" @change="onToggle" />
      <span v-else class="col-tree-connector"></span>

      <!-- 对象/数组字段可展开查看内部结构 -->
      <span v-if="isExpandable" class="col-tree-toggle" @click="open = !open" :title="open ? '收起' : '展开'">
        {{ open ? '▾' : '▸' }}
      </span>
      <span v-else class="col-tree-toggle col-tree-toggle-empty"></span>

      <span class="col-tree-key">{{ label }}</span>
      <span v-if="isTop && hasLabel" class="chapter-label-badge" title="自定义标签">🔖</span>
      <span class="col-tree-summary">{{ summary }}</span>

      <!-- 顶层纯对象字段：可在列表中展开子字段直接编辑（数组暂不支持；对象模式的章节视图无此模型） -->
      <label v-if="isTop && isExpandEditable && allowExpand" class="col-tree-expand" title="在列表中直接编辑该对象的子字段">
        <input type="checkbox" :checked="isExpandChecked" @change="onToggleExpand" />
        展开
      </label>
    </div>

    <!-- 展开区：递归渲染子键 -->
    <div v-if="open && isExpandable" class="col-tree-children">
      <ColumnFieldNode
        v-for="child in children"
        :key="child.key"
        :key-name="child.key"
        :value="child.value"
        :draft="draft"
        :is-top="false"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { getFieldLabel, hasFieldLabel } from '../../js/logic/logic-storyTypes.js'

defineOptions({ name: 'ColumnFieldNode' })

const props = defineProps({
  /** 字段名（顶层=字段 key；子层=子键名） */
  keyName: { type: [String, Number], required: true },
  /** 字段值（用于展示结构） */
  value: { type: null, default: null },
  /** 勾选数组（仅顶层参与判断，修改由父组件通过 toggle 事件处理） */
  draft: { type: Array, required: true },
  /** 是否为顶层字段（决定是否显示 checkbox） */
  isTop: { type: Boolean, default: false },
  /** 展开标记对象（仅顶层判断，修改由父组件通过 toggle-expand 事件处理） */
  expandDraft: { type: Object, default: () => ({}) },
  /** 是否允许「展开子字段直接编辑」（数组模式章节视图为 true，对象模式为 false） */
  allowExpand: { type: Boolean, default: true }
})

const emit = defineEmits(['toggle', 'toggle-expand'])

const open = ref(false)

/** 是否已勾选 */
const isChecked = computed(() => props.draft.includes(props.keyName))

/** 是否已勾选「展开子字段」 */
const isExpandChecked = computed(() => props.expandDraft[String(props.keyName)] === true)

/** 勾选状态切换：通知父组件增删该字段 */
function onToggle() {
  emit('toggle', props.keyName)
}

/** 展开状态切换：通知父组件更新展开标记 */
function onToggleExpand() {
  emit('toggle-expand', props.keyName)
}

const isExpandable = computed(() => {
  const v = props.value
  return v !== null && typeof v === 'object'
})

/** 是否支持「展开子字段直接编辑」：仅顶层纯对象（数组暂不支持展开编辑） */
const isExpandEditable = computed(() => isExpandable.value && !Array.isArray(props.value))

/** 顶层显示别名，子层显示原始键名 */
const label = computed(() =>
  props.isTop ? getFieldLabel(String(props.keyName)) : String(props.keyName)
)

const hasLabel = computed(() => props.isTop && hasFieldLabel(String(props.keyName)))

/** 值摘要：数组/对象显示数量，其余显示 JSON 截断 */
const summary = computed(() => {
  const v = props.value
  if (v === null || v === undefined) return 'null'
  if (Array.isArray(v)) return `[ ${v.length} 项 ]`
  if (typeof v === 'object') return `{ ${Object.keys(v).length} 个属性 }`
  const s = JSON.stringify(v)
  return s.length > 20 ? s.slice(0, 20) + '…' : s
})

/** 子键列表（对象=键值对；数组=索引项） */
const children = computed(() => {
  const v = props.value
  if (Array.isArray(v)) {
    return v.map((item, i) => ({ key: i, value: item }))
  }
  if (v && typeof v === 'object') {
    return Object.entries(v).map(([k, val]) => ({ key: k, value: val }))
  }
  return []
})
</script>

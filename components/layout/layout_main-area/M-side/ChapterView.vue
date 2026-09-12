<!--
  ChapterView.vue — 章节列表视图组件

  功能说明：
  - 以列表形式展示当前路径下的数据
  - 数组模式下按索引逐行展示每条记录
  - 对象模式下按属性逐行展示每个字段
  - 支持自定义显示列、编辑字段值、导航到表单 Tab

  交互方式：
  - 点击「▶」按钮或双击行 → 跳转到表单 Tab 编辑
  - 输入框修改后自动保存数据
  - 「⚙️显示列」按钮 → 弹窗选择可见字段
-->

<template>
  <div class="editor-tab-panel">

    <!-- ===== 顶部工具栏 ===== -->
    <div class="container row">
      <div class="col-5">
        <span class="chapter-count chapter-breadcrumb" :class="{ 'is-copied': copied }" @click="copyPath">
          <span class="chapter-breadcrumb-text">{{ displayPathLabel }}</span>
          <span class="chapter-breadcrumb-full">
            {{ pathLabel }}
            <span class="chapter-breadcrumb-full-hint">（点击复制）</span>
          </span>
        </span>
        <button class="my-btn my-btn-sm" @click="openColumnConfig">⚙️ 显示列</button>
        <span class="badge bg-secondary">{{ typeLabel }}</span>
      </div>
      <div class="col-5 d-flex justify-content-end">

        <div class="container d-flex align-items-center">
          <button class="my-btn my-btn-sm my-btn-create" @click="showAddDialog">按模板新增</button>
          <button class="my-btn my-btn-sm" @click="showAddCustom">＋ 自定义</button>
        </div>
        <div class="container d-flex align-items-center">
          <span class="chapter-count text-center">共 {{ entries.length }} 条</span>
        </div>
      </div>

    </div>

    <!-- ===== 空数据提示 ===== -->
    <div v-if="visibleEntries.length === 0" class="empty-hint" style="padding: 40px 12px">
      {{ entries.length === 0 ? '当前路径下无数据，点击「＋」添加' : '所有属性均被隐藏，点击「⚙️ 显示列」勾选' }}
    </div>

    <!-- ===== 数据列表 ===== -->
    <div v-else class="chapter-list">

      <!-- 列标题行：与数据行结构对齐，像表格表头 -->
      <div class="chapter-header">
        <div class="chapter-row-main">
          <span v-if="showSpeakerCol" class="chapter-speaker-badge chapter-header-badge"></span>
          <div class="chapter-cols">
            <!-- 对象模式表头：属性 | 值 -->
            <template v-if="!isArrayMode">
              <div class="chapter-col-speaker chapter-header-cell">属性</div>
              <div class="chapter-col chapter-header-cell">值</div>
            </template>
            <!-- 数组模式表头：说话人 + 动态字段列 -->
            <template v-else>
              <div v-if="showSpeakerCol" class="chapter-col-speaker chapter-header-cell">
                {{ getFieldLabel('speaker') }}
                <span v-if="hasFieldLabel('speaker')" class="chapter-label-badge" title="自定义标签">🔖</span>
              </div>
              <div v-for="column in visibleColumns" :key="column" class="chapter-col chapter-header-cell"
                :class="'chapter-col-' + column">
                <template v-if="isExpandColumn(column)">
                  <span class="chapter-header-name">{{ getFieldLabel(column) }}</span>
                  <span class="chapter-header-langs">
                    <span v-for="subKey in expandKeys(column)" :key="subKey" class="chapter-header-lang">{{ subKey }}</span>
                  </span>
                </template>
                <span v-else class="chapter-header-name">{{ getFieldLabel(column) }}</span>
                <span v-if="hasFieldLabel(column)" class="chapter-label-badge" title="自定义标签">🔖</span>
              </div>
            </template>
          </div>
        </div>
      </div>

      <div v-for="([rowKey, node], index) in visibleEntries" :key="rowKey" class="chapter-row"
        :data-index="isArrayMode ? rowKey : undefined" :data-key="isArrayMode ? undefined : rowKey"
        :data-id="node?.id || rowKey" @dblclick="openEditRow(rowKey)">

        <div class="chapter-row-main">

          <!-- 左侧头像 Badge：数组=说话人首字 / 对象=属性名首字 -->
          <span v-if="showSpeakerCol" class="chapter-speaker-badge"
            :style="{ background: speakerColor(isArrayMode ? (speakerName(node) || '?') : String(rowKey).charAt(0).toUpperCase() || '?') }">
            {{ isArrayMode ? (speakerName(node) || '?').charAt(0) || '?' : String(rowKey).charAt(0).toUpperCase() || '?'
            }}
          </span>

          <!-- 数据列容器 -->
          <div class="chapter-cols">

            <!-- ========== 对象模式：属性名 + 单个值单元格 ========== -->
            <template v-if="!isArrayMode">
              <div class="chapter-col-speaker">
                <span class="chapter-key-label">{{ rowKey }}</span>
              </div>
              <div class="chapter-col chapter-col-value">
                <!-- null / undefined -->
                <input v-if="node === null || node === undefined"
                  class="chapter-cell-input chapter-cell-null" placeholder="—" disabled />
                <!-- 对象/数组：JSON 摘要（双击行可进入完整编辑） -->
                <span v-else-if="typeof node === 'object'" class="chapter-cell-display">
                  {{ Array.isArray(node) ? `[ ${node.length} 项 ]` : `{ ${Object.keys(node).length} 个属性 }` }}
                </span>
                <!-- 原始值：直接编辑（数字串自动转数字） -->
                <input v-else class="chapter-cell-input chapter-simple-input" :value="String(node)"
                  @change="event => updatePropertyValue(rowKey, event.target.value)" />
              </div>
            </template>

            <!-- ========== 数组模式：说话人列 + 动态字段列 ========== -->
            <template v-else>
              <!-- 行标识列（说话人），由显示列配置的 speaker 项控制 -->
              <div v-if="showSpeakerCol" class="chapter-col-speaker">
                <input class="chapter-speaker-input" :value="speakerName(node)"
                  :placeholder="getFieldLabel('speaker')"
                  @change="event => updateSpeaker(rowKey, event.target.value)" />
              </div>

              <!-- 动态列（按 visibleColumns 配置渲染） -->
              <div v-for="column in visibleColumns" :key="column" class="chapter-col" :class="'chapter-col-' + column">

                <!-- 展开模式：纯对象按实际键渲染子字段输入框 -->
                <template v-if="isExpandColumn(column) && isPlainObject(node[column])">
                  <input v-for="subKey in expandKeys(column)" :key="column + '.' + subKey"
                    class="chapter-cell-input chapter-sub-input" :value="node[column]?.[subKey] ?? ''"
                    :placeholder="subKey"
                    @change="event => updateSubField(rowKey, column, subKey, event.target.value)" />
                </template>

                <!-- null / undefined 空值字段 -->
                <input v-else-if="node[column] === null || node[column] === undefined"
                  class="chapter-cell-input chapter-cell-null" placeholder="—" />

                <!-- 对象类型字段：显示 JSON 字符串预览 -->
                <span v-else-if="typeof node[column] === 'object'" class="chapter-cell-display">
                  {{ JSON.stringify(node[column]) }}
                </span>

                <!-- 普通字段：文本或数字输入框 -->
                <input v-else class="chapter-cell-input chapter-simple-input" :value="String(node[column])"
                  @change="event => updateSimpleField(rowKey, column, event.target.value)" />
              </div>
            </template>
          </div>

          <!-- 打开完整编辑按钮 → 跳转到表单 Tab -->
          <button class="my-btn-icon chapter-open-btn" title="打开完整编辑" @click="openEditRow(rowKey)">▶</button>
          <button class="my-btn-icon" title="复制此行（含子结构）" @click.stop="duplicateRow(rowKey)" @dblclick.stop>⧉</button>
        </div>
      </div>
    </div>

    <!-- ===== 显示列设置弹窗 ===== -->
    <Modal :visible="columnModalVisible" title="显示列设置" width="420px" @close="columnModalVisible = false">
      <div style="margin-bottom: 8px">
        <span style="color: var(--text-dim)">选择要在列表中显示的字段：</span>
        <span style="float: right">
          <button class="my-btn my-btn-sm" @click="columnDraft = allColumns.map(f => f.key)">全选</button>
          <button class="my-btn my-btn-sm" @click="columnDraft = []">清空</button>
        </span>
      </div>
      <div class="col-tree">
        <ColumnFieldNode
          v-for="field in allColumns"
          :key="field.key"
          :key-name="field.key"
          :value="field.value"
          :draft="columnDraft"
          :expand-draft="columnExpandDraft"
          :is-top="true"
          :allow-expand="isArrayMode"
          @toggle="toggleColumnDraft"
          @toggle-expand="toggleExpandDraft"
        />
      </div>
      <div v-if="allColumns.length === 0" class="empty-hint" style="padding: 8px 0">当前数据没有可配置的字段</div>
      <div style="margin-top: 8px; font-size: 0.75rem; color: var(--text-dim)">
        <template v-if="isArrayMode">勾选字段作为列表列；对象/数组可展开查看内部结构（仅供查看）；勾选「展开」可在列表中直接编辑对象子字段</template>
        <template v-else>勾选要在列表中显示的属性；对象/数组可展开查看内部结构（仅供查看）</template>
      </div>
      <template #footer>
        <button class="my-btn my-btn-sm" @click="columnModalVisible = false">取消</button>
        <button class="my-btn my-btn-sm my-btn-primary" @click="confirmColumnConfig">确定</button>
      </template>
    </Modal>

    <!-- ===== 复制成功小通知 ===== -->
    <transition name="toast-fade">
      <div v-if="toastVisible" class="chapter-toast">✅ 已复制完整路径</div>
    </transition>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useStoryStore } from '../../../../stores/storyStore.js'
import {
  getFieldLabel,
  hasFieldLabel,
  loadEffectiveTemplates
} from '../../../../js/logic/logic-storyTypes.js'
import { useObjectAdd } from '../../../base_reusable/useObjectAdd.js'
import { showTemplatePicker } from '../../../base_reusable/useCreateDialog.js'
import {
  buildSignature,
  loadColumnConfigs,
  saveColumnConfigs,
  getColumnConfig
} from '../../../../js/logic/logic-columnConfig.js'
import Modal from '../../../base/Modal.vue'
import ColumnFieldNode from '../../../base_reusable/ColumnFieldNode.vue'

// ============================================================
// 响应式状态与计算属性
// ============================================================

const storyStore = useStoryStore()

/** 当前选中的路径 */
const currentPath = computed(() => storyStore.currentPath || [])

/** 当前路径对应的数据值 */
const currentValue = computed(() => {
  if (currentPath.value.length === 0) return storyStore.curJson
  return storyStore.getByPath(currentPath.value)
})

/** 当前值是否为数组模式 */
const isArrayMode = computed(() => Array.isArray(currentValue.value))

/**
 * 当前路径下的数据条目列表
 * 数组模式：返回 [[index, item], ...]
 * 对象模式：返回 [[key, value], ...]
 */
const entries = computed(() => {
  const value = currentValue.value
  if (!value || typeof value !== 'object') return []
  if (Array.isArray(value)) return value.map((item, index) => [String(index), item])
  return Object.entries(value)
})

/** 当前路径的文字显示（如 "content → 0 → text"，根为空时显示 "(root)"） */
const pathLabel = computed(() => currentPath.value.join(' → ') || '(root)')

/** 复制到剪贴板的内容：用点号分隔（如 "content.0.text"），便于直接粘贴搜索 */
const copyText = computed(() => currentPath.value.join('.') || '(root)')

/** 面包屑顶部最多展示的路径段数，超出部分收进 hover 提示 */
const MAX_CRUMB_DEPTH = 3

/** 路径段数是否超过顶部展示上限 */
const isPathTruncated = computed(() => currentPath.value.length > MAX_CRUMB_DEPTH)

/** 顶部展示的路径文字：最多 MAX_CRUMB_DEPTH 段，超出的以 "…" 省略 */
const displayPathLabel = computed(() => {
  if (currentPath.value.length === 0) return '(root)'
  if (isPathTruncated.value) {
    return [...currentPath.value.slice(0, MAX_CRUMB_DEPTH), '…'].join(' → ')
  }
  return pathLabel.value
})

/** 复制反馈状态（点击后短暂高亮） */
const copied = ref(false)

/** 复制成功小通知 */
const toastVisible = ref(false)
let toastTimer = null

/** 点击面包屑 → 复制完整路径到剪贴板（点号分隔），并弹出小通知 */
function copyPath() {
  const text = copyText.value
  // 1) 同步尝试 execCommand：必须在用户手势的同步调用栈内，浏览器才允许
  // 2) 若同步失败，再异步回退到 Clipboard API（部分环境需要权限，可能被拒）
  if (!fallbackCopy(text)) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).catch(() => {})
    }
  }
  copied.value = true
  toastVisible.value = true
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastVisible.value = false
    copied.value = false
  }, 1800)
}

/** 复制兜底：临时 textarea + execCommand，返回是否复制成功 */
function fallbackCopy(text) {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.top = '0'
  textarea.style.left = '0'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }
  textarea.remove()
  return ok
}

/** 当前值的数据类型标签 */
const typeLabel = computed(() => {
  const value = currentValue.value
  if (Array.isArray(value)) return '数组 []'
  if (value && typeof value === 'object' && value !== null) return '对象 {}'
  return typeof value
})

/** 显示列配置弹窗状态 */
const columnModalVisible = ref(false)
/** 弹窗内草稿：勾选状态确认后才写入生效，取消则丢弃 */
const columnDraft = ref([])
/** 弹窗内展开草稿：与列勾选一同确认生效 */
const columnExpandDraft = ref({})

/**
 * 当前数据所有可选字段（弹窗字段树与列配置的数据源）
 *
 * 两种模式语义不同：
 * - 数组模式：每行是一个同类对象，字段 = 所有对象元素自身字段的并集
 * - 对象模式：每行是对象的一个属性，字段 = 该对象自身的键（属性名）
 */
const allColumns = computed(() => {
  const value = currentValue.value
  if (isArrayMode.value) {
    const fieldMap = new Map()
    entries.value.forEach(([, node]) => {
      if (node && isPlainObject(node)) {
        Object.keys(node).forEach(fieldName => {
          if (!fieldMap.has(fieldName)) fieldMap.set(fieldName, node[fieldName])
        })
      }
    })
    return [...fieldMap.entries()].map(([key, val]) => ({ key, value: val }))
  }
  // 对象模式：当前对象自身的键即「属性行」
  if (value && isPlainObject(value)) {
    return Object.entries(value).map(([key, val]) => ({ key, value: val }))
  }
  return []
})

/**
 * 实际渲染的数据行
 * - 数组模式：全部行（由列控制横向显隐）
 * - 对象模式：只渲染被勾选为列的属性行（勾选 = 选中可见属性）；未配置时全部显示
 */
const visibleEntries = computed(() => {
  if (isArrayMode.value) return entries.value
  const shown = new Set(visibleColumns.value)
  return entries.value.filter(([key]) => shown.has(key))
})

/**
 * 当前列表的字段集签名（字段名排序去重 + 模式前缀）
 * 带模式前缀：数组模式字段是「横向列」，对象模式字段是「纵向属性行」，
 * 即使字段名集合相同（如 content 数组与 content[0] 对象），配置也不能共享
 */
const columnSignature = computed(() =>
  buildSignature(isArrayMode.value ? 'arr' : 'obj', allColumns.value.map(f => f.key))
)

/** 配置版本计数：手动保存后自增，驱动 columnConfig 重新读取 localStorage */
const columnConfigTick = ref(0)

/**
 * 当前字段集对应的显示列配置
 * null = 该字段集从未配置（含导入结构不同的新文件）→ 默认显示全部字段
 */
const columnConfig = computed(() => {
  columnConfigTick.value
  return getColumnConfig(loadColumnConfigs(), columnSignature.value)
})

/** 当前可见列：未配置时显示数据实际存在的全部字段；已配置时按用户选择 */
const visibleColumns = computed(() => {
  if (columnConfig.value === null) return allColumns.value.map(f => f.key)
  return [...columnConfig.value.cols]
})

/**
 * 行标识列是否显示：
 * - 数组模式：由配置中的 speaker 项控制（说话人列）
 * - 对象模式：属性名是每行主标识，始终显示
 */
const showSpeakerCol = computed(() =>
  !isArrayMode.value ||
  (columnConfig.value === null
    ? allColumns.value.some(f => f.key === 'speaker')
    : columnConfig.value.cols.includes('speaker'))
)

/** 切换草稿中某个字段的勾选状态 */
function toggleColumnDraft(key) {
  const index = columnDraft.value.indexOf(key)
  if (index >= 0) columnDraft.value.splice(index, 1)
  else columnDraft.value.push(key)
}

/** 切换草稿中某个字段的「展开子字段」状态 */
function toggleExpandDraft(key) {
  columnExpandDraft.value = { ...columnExpandDraft.value, [key]: !columnExpandDraft.value[key] }
}

/** 打开显示列弹窗：未配置时草稿默认为全部字段；已配置时复制当前生效配置 */
function openColumnConfig() {
  columnDraft.value = columnConfig.value === null
    ? allColumns.value.map(f => f.key)
    : [...columnConfig.value.cols]
  columnExpandDraft.value = columnConfig.value === null ? {} : { ...columnConfig.value.expand }
  columnModalVisible.value = true
}

/** 确认：草稿按当前字段集签名写入，持久化后立即生效；不影响其他字段集的配置 */
function confirmColumnConfig() {
  if (allColumns.value.length === 0) {
    columnModalVisible.value = false
    return
  }
  const configs = loadColumnConfigs()
  configs[columnSignature.value] = {
    cols: [...columnDraft.value],
    expand: { ...columnExpandDraft.value }
  }
  saveColumnConfigs(configs)
  columnConfigTick.value++
  columnModalVisible.value = false
}

// ============================================================
// 数据判断辅助函数
// ============================================================

/** 是否为纯对象（非数组、非 null） */
function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** 某列是否配置为「展开子字段」模式 */
function isExpandColumn(column) {
  return columnConfig.value !== null && columnConfig.value.expand[column] === true
}

/** 展开列在所有行中对象键的并集（表头与输入框共用） */
function expandKeys(column) {
  const keys = new Set()
  entries.value.forEach(([, node]) => {
    const value = node?.[column]
    if (isPlainObject(value)) Object.keys(value).forEach(key => keys.add(key))
  })
  return [...keys]
}

/**
 * 获取节点的说话人名称（纯字符串格式）
 */
function speakerName(node) {
  return node?.speaker || ''
}

// ============================================================
// 说话人颜色生成（基于名称哈希）
// ============================================================

const speakerColorCache = {}

/**
 * 根据说话人名称生成固定颜色
 * 相同名称始终返回相同颜色，保证视觉一致性
 */
function speakerColor(name) {
  if (!name) return 'var(--accent)'
  if (speakerColorCache[name]) return speakerColorCache[name]

  let hash = 0
  for (let index = 0; index < name.length; index++) {
    hash = name.charCodeAt(index) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash % 360)
  const color = `hsl(${hue}, 55%, 50%)`
  speakerColorCache[name] = color
  return color
}

// ============================================================
// 事件处理函数
// ============================================================

/**
 * 按模板新增弹窗
 * 与表单视图共用共享树形选择器（TemplatePicker：搜索 + 分组 + 详情预览）
 * 选中的模板 key 通过 Promise resolve 返回，关闭弹窗返回 null
 * 创建后不跳转到新节点（navigate=false），留在当前列表继续编辑
 */
async function showAddDialog() {
  const ctx = await showTemplatePicker()
  if (!ctx) return
  storyStore.addNode(ctx, currentPath.value, false)
}

/**
 * 复制行（含子结构）
 * 委托给 storyStore.duplicateEntry 共享 API
 */
function duplicateRow(rowKey) {
  const dataPath = currentPath.value
  storyStore.duplicateEntry([...dataPath, isArrayMode.value ? parseInt(rowKey) : rowKey])
}

/**
 * 自定义属性弹窗
 * 用户手动输入属性名和类型，支持模板匹配
 */
async function showAddCustom() {
  const templates = loadEffectiveTemplates()
  await useObjectAdd(storyStore, currentPath.value, {
    templates,
    isArrayItem: isArrayMode.value
  })
}

/**
 * 更新说话人名称（纯字符串）
 */
function updateSpeaker(rowKey, value) {
  const dataPath = [...currentPath.value, isArrayMode.value ? parseInt(rowKey) : rowKey, 'speaker']
  storyStore.setByPath(dataPath, value)
}

/**
 * 更新展开模式下的对象子字段
 */
function updateSubField(rowKey, field, subKey, value) {
  const dataPath = [...currentPath.value, isArrayMode.value ? parseInt(rowKey) : rowKey, field, subKey]
  storyStore.setByPath(dataPath, value)
}

/**
 * 更新普通字段值（自动识别数字类型）
 */
function updateSimpleField(rowKey, field, value) {
  const dataPath = [...currentPath.value, isArrayMode.value ? parseInt(rowKey) : rowKey, field]
  const finalValue = /^\d+$/.test(value) && !isNaN(value) ? Number(value) : value
  storyStore.setByPath(dataPath, finalValue)
}

/**
 * 对象模式：直接更新某属性的值（路径即 当前路径 + 属性名；数字串自动转数字）
 */
function updatePropertyValue(rowKey, value) {
  const finalValue = /^\d+$/.test(value) && !isNaN(value) ? Number(value) : value
  storyStore.setByPath([...currentPath.value, rowKey], finalValue)
}

/**
 * 打开完整编辑
 * 设置当前路径并跳转到表单 Tab
 */
function openEditRow(rowKey) {
  const dataPath = currentPath.value
  const newPath = [
    ...dataPath,
    isArrayMode.value ? parseInt(rowKey) : rowKey
  ]
  storyStore.selectPath(newPath)

  // 切换到表单 Tab
  const formTab = document.querySelector('[data-tab="form"]')
  if (formTab) formTab.click()
}
</script>

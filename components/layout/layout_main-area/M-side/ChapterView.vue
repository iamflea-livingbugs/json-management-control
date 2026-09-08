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
    <div v-if="entries.length === 0" class="empty-hint" style="padding: 40px 12px">
      当前路径下无数据，点击「＋」添加
    </div>

    <!-- ===== 数据列表 ===== -->
    <div v-else class="chapter-list">

      <!-- 列标题行：与数据行结构对齐，像表格表头 -->
      <div class="chapter-header">
        <div class="chapter-row-main">
          <span v-if="showSpeakerCol" class="chapter-speaker-badge chapter-header-badge"></span>
          <div class="chapter-cols">
            <div v-if="showSpeakerCol" class="chapter-col-speaker chapter-header-cell">
              {{ isArrayMode ? getFieldLabel('speaker') : '属性' }}
              <span v-if="isArrayMode && hasFieldLabel('speaker')" class="chapter-label-badge" title="自定义标签">🔖</span>
            </div>
            <div v-for="column in visibleColumns" :key="column" class="chapter-col chapter-header-cell"
              :class="'chapter-col-' + column">
              <template v-if="isI18nColumn(column)">
                <span class="chapter-header-name">{{ getFieldLabel(column) }}</span>
                <span class="chapter-header-langs">
                  <span v-for="language in languages" :key="language" class="chapter-header-lang">{{ language }}</span>
                </span>
              </template>
              <span v-else class="chapter-header-name">{{ getFieldLabel(column) }}</span>
              <span v-if="hasFieldLabel(column)" class="chapter-label-badge" title="自定义标签">🔖</span>
            </div>
          </div>
        </div>
      </div>

      <div v-for="([rowKey, node], index) in entries" :key="rowKey" class="chapter-row"
        :data-index="isArrayMode ? rowKey : undefined" :data-key="isArrayMode ? undefined : rowKey"
        :data-id="node.id || rowKey" @dblclick="openEditRow(rowKey)">

        <div class="chapter-row-main">

          <!-- 左侧头像 Badge（随 speaker 标识列显示） -->
          <span v-if="showSpeakerCol" class="chapter-speaker-badge"
            :style="{ background: speakerColor(isArrayMode ? (speakerName(node) || '?') : String(rowKey).charAt(0).toUpperCase() || '?') }">
            {{ isArrayMode ? (speakerName(node) || '?').charAt(0) || '?' : String(rowKey).charAt(0).toUpperCase() || '?'
            }}
          </span>

          <!-- 数据列容器 -->
          <div class="chapter-cols">

            <!-- 行标识列（数组=说话人 / 对象=属性名），由显示列配置的 speaker 项控制 -->
            <div v-if="showSpeakerCol" class="chapter-col-speaker">
              <input v-if="isArrayMode" class="chapter-speaker-input" :value="speakerName(node)"
                :placeholder="getFieldLabel('speaker')"
                @change="event => updateSpeaker(rowKey, event.target.value)" />
              <span v-else class="chapter-key-label">{{ rowKey }}</span>
            </div>

            <!-- 动态列（按 visibleColumns 配置渲染） -->
            <div v-for="column in visibleColumns" :key="column" class="chapter-col" :class="'chapter-col-' + column">

              <!-- i18n 多语言字段：为每种语言渲染一个输入框 -->
              <template v-if="isI18nValue(node[column])">
                <input v-for="language in languages" :key="column + '.' + language"
                  class="chapter-cell-input chapter-i18n-input" :value="node[column]?.[language] || ''"
                  :placeholder="language"
                  @change="event => updateI18nField(rowKey, column, language, event.target.value)" />
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
          :is-top="true"
          @toggle="toggleColumnDraft"
        />
      </div>
      <div v-if="allColumns.length === 0" class="empty-hint" style="padding: 8px 0">当前数据没有可配置的字段</div>
      <div style="margin-top: 8px; font-size: 0.75rem; color: var(--text-dim)">
        勾选顶层字段作为列；对象/数组可展开查看内部结构（仅供查看，不作为列）
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
  getLanguages,
  getFieldLabel,
  getI18nMarker,
  hasFieldLabel,
  loadEffectiveTemplates
} from '../../../../js/logic/logic-storyTypes.js'
import { useObjectAdd } from '../../../base_reusable/useObjectAdd.js'
import { showTemplatePicker } from '../../../base_reusable/useCreateDialog.js'
import Modal from '../../../base/Modal.vue'
import ColumnFieldNode from '../../../base_reusable/ColumnFieldNode.vue'

// ============================================================
// 工具函数
// ============================================================

/**
 * 从 localStorage 读取显示列配置
 * 返回 null 表示「从未配置」；返回数组表示用户显式选择过的列（可为空数组 = 显式清空）
 *
 * @returns {string[]|null} 选中的字段名数组；未配置或数据损坏时返回 null
 */
function loadColumnConfig() {
  try {
    const data = JSON.parse(localStorage.getItem('storyeditor_chapter_cols'))
    return Array.isArray(data) ? data : null
  } catch {
    return null
  }
}

/**
 * 保存显示列配置到 localStorage
 * @param {string[]} columns - 选中的字段名列表
 */
function saveColumnConfig(columns) {
  localStorage.setItem('storyeditor_chapter_cols', JSON.stringify(columns))
}

// ============================================================
// 响应式状态与计算属性
// ============================================================

const storyStore = useStoryStore()
const languages = getLanguages()

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

/** 显示列配置（响应式状态：null=未配置，数组=用户选择；保存后立即生效，无需页面重载） */
const columnConfig = ref(loadColumnConfig())

/** 当前可见列：未配置时显示数据实际存在的全部字段；已配置时按用户选择（含 speaker 标识列） */
const visibleColumns = computed(() => {
  if (columnConfig.value === null) return allColumns.value
  return [...columnConfig.value]
})

/** 行标识列（数组=说话人 / 对象=属性名）是否显示：由配置中的 speaker 项控制 */
const showSpeakerCol = computed(() => visibleColumns.value.includes('speaker'))

// ---- 显示列配置弹窗状态 ----
const columnModalVisible = ref(false)
/** 弹窗内草稿：勾选状态确认后才写入生效，取消则丢弃 */
const columnDraft = ref([])

/** 当前数据所有可选字段（含 speaker 行标识列，由用户决定是否显示）
 *  每个字段带一个示例值，用于弹窗里展示值结构（树形视图，不参与判断） */
const allColumns = computed(() => {
  const fieldMap = new Map()
  entries.value.forEach(([, node]) => {
    if (node && typeof node === 'object') {
      Object.keys(node).forEach(fieldName => {
        if (!fieldMap.has(fieldName)) fieldMap.set(fieldName, node[fieldName])
      })
    }
  })
  return [...fieldMap.entries()].map(([key, value]) => ({ key, value }))
})

/** 切换草稿中某个字段的勾选状态 */
function toggleColumnDraft(key) {
  const index = columnDraft.value.indexOf(key)
  if (index >= 0) columnDraft.value.splice(index, 1)
  else columnDraft.value.push(key)
}

/** 打开显示列弹窗：未配置时草稿默认为全部字段；已配置时复制当前生效配置 */
function openColumnConfig() {
  columnDraft.value = columnConfig.value === null
    ? allColumns.value.map(f => f.key)
    : [...columnConfig.value]
  columnModalVisible.value = true
}

/** 确认：草稿写入生效配置并持久化 */
function confirmColumnConfig() {
  columnConfig.value = [...columnDraft.value]
  saveColumnConfig(columnConfig.value)
  columnModalVisible.value = false
}

// ============================================================
// 数据判断辅助函数
// ============================================================

/**
 * 判断一个值是否为 i18n 多语言对象
 * i18n 对象特征：非数组对象且含有 "zh" 键
 */
function isI18nValue(value) {
  return value && typeof value === 'object' &&
    !Array.isArray(value) && getI18nMarker() in value
}

/** 某列是否为 i18n 字段：任一行的该字段是 i18n 值即视为 i18n 列 */
function isI18nColumn(column) {
  return entries.value.some(([, node]) => isI18nValue(node?.[column]))
}

/**
 * 获取节点的说话人名称
 * 支持 { zh: '名称', en: 'name' } 对象格式和纯字符串格式
 */
function speakerName(node) {
  return typeof node?.speaker === 'object' ? (node.speaker.zh || '') : (node?.speaker || '')
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
 * 更新说话人名称
 */
function updateSpeaker(rowKey, value) {
  const dataPath = [...currentPath.value, isArrayMode.value ? parseInt(rowKey) : rowKey, 'speaker', 'zh']
  storyStore.setByPath(dataPath, value)
}

/**
 * 更新 i18n 多语言字段
 */
function updateI18nField(rowKey, field, language, value) {
  const dataPath = [...currentPath.value, isArrayMode.value ? parseInt(rowKey) : rowKey, field, language]
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

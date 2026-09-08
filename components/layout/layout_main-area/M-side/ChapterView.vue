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
        <button class="my-btn my-btn-sm" @click="showColumnConfig">⚙️ 显示列</button>
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
      <div v-for="([rowKey, node], index) in entries" :key="rowKey" class="chapter-row"
        :data-index="isArrayMode ? rowKey : undefined" :data-key="isArrayMode ? undefined : rowKey"
        :data-id="node.id || rowKey" @dblclick="openEditRow(rowKey)">

        <div class="chapter-row-main">

          <!-- 左侧头像 Badge -->
          <span class="chapter-speaker-badge"
            :style="{ background: speakerColor(isArrayMode ? (speakerName(node) || '?') : String(rowKey).charAt(0).toUpperCase() || '?') }">
            {{ isArrayMode ? (speakerName(node) || '?').charAt(0) || '?' : String(rowKey).charAt(0).toUpperCase() || '?'
            }}
          </span>

          <!-- 数据列容器 -->
          <div class="chapter-cols">

            <!-- 说话人列（仅数组模式）或属性名标签（仅对象模式） -->
            <div class="chapter-col-speaker">
              <input v-if="isArrayMode" class="chapter-speaker-input" :value="speakerName(node)" placeholder="说话人"
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
  loadEffectiveTemplates
} from '../../../../js/logic/logic-storyTypes.js'
import { useObjectAdd } from '../../../base_reusable/useObjectAdd.js'
import { showTemplatePicker } from '../../../base_reusable/useCreateDialog.js'

// ============================================================
// 工具函数
// ============================================================

/**
 * 从 localStorage 读取显示列配置
 * 如果从未配置过或数据损坏，返回默认值 ["text"]
 *
 * @returns {string[]} 选中的字段名数组
 */
function loadColumnConfig() {
  try {
    const data = JSON.parse(localStorage.getItem('storyeditor_chapter_cols'))
    return Array.isArray(data) ? data : ['text']
  } catch {
    return ['text']
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

/** 当前可见列列表（过滤掉 speaker 列，因为 speaker 列固定显示） */
const visibleColumns = computed(() => loadColumnConfig().filter(column => column !== 'speaker'))

// ============================================================
// 数据判断辅助函数
// ============================================================

/**
 * 判断一个值是否为 i18n 多语言对象
 * i18n 对象特征：非数组对象且含有 "zh" 键
 */
function isI18nValue(value) {
  return value && typeof value === 'object' && !Array.isArray(value) && 'zh' in value
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
 * 显示列配置弹窗
 * 收集当前数据的所有字段名，让用户选择哪些列可见
 */
function showColumnConfig() {
  const fieldSet = new Set()

  entries.value.forEach(([, node]) => {
    if (node && typeof node === 'object') {
      Object.keys(node).forEach(fieldName => fieldSet.add(fieldName))
    }
  })

  const allFields = [...fieldSet]
  const currentColumns = loadColumnConfig()

  // 构建原生弹窗 DOM
  const modal = document.createElement('div')
  modal.className = 'my-modal-overlay'
  modal.innerHTML = `<div class="my-modal-box" style="width: 360px">
    <div class="my-modal-header"><h2>显示列设置</h2><button class="my-modal-close" id="modal-column-close">✕</button></div>
    <div class="my-modal-body">
      <div style="margin-bottom: 8px">选择要在列表中显示的字段：</div>
      ${allFields.map(fieldName => `
        <label style="display: block; margin: 4px 0">
          <input type="checkbox" value="${fieldName}" ${currentColumns.includes(fieldName) ? 'checked' : ''} /> ${fieldName}
        </label>
      `).join('')}
      <div style="margin-top: 8px; font-size: 0.75rem; color: var(--text-dim)">
        提示：i18n 字段会根据语言设置自动展开为多列
      </div>
    </div>
    <div class="my-modal-footer">
      <button class="my-btn my-btn-sm" id="modal-column-cancel">取消</button>
      <button class="my-btn my-btn-sm my-btn-primary" id="modal-column-ok">确定</button>
    </div>
  </div>`

  document.body.appendChild(modal)
  requestAnimationFrame(() => modal.classList.add('open'))

  const closeModal = () => {
    modal.classList.remove('open')
    setTimeout(() => modal.remove(), 200)
  }

  // 绑定弹窗事件
  modal.querySelector('#modal-column-close').onclick = closeModal
  modal.querySelector('#modal-column-cancel').onclick = closeModal
  modal.addEventListener('click', event => {
    if (event.target === modal) closeModal()
  })

  // 确定按钮：收集选中的字段并保存
  modal.querySelector('#modal-column-ok').onclick = () => {
    const checkedColumns = [...modal.querySelectorAll('input[type=checkbox]:checked')]
      .map(checkbox => checkbox.value)
    saveColumnConfig(checkedColumns)
    closeModal()
  }
}

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

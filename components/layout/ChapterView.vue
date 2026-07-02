<template>
  <div class="editor-tab-panel">
    <div class="container row">
      <div class="col-2"><button class="my-btn my-btn-sm" @click="showColumnConfig">⚙️显示列</button></div>
      <div class="col-10">
        <span class="chapter-count">{{ pathLabel }}</span>
        <span class="badge bg-secondary">{{ typeLabel }}</span>
        <span class="chapter-count">· 共 {{ entries.length }} 条</span>
        <select ref="ctxSelect" class="my-input-sm">
          <option v-for="ctx in ctxKeys" :key="ctx" :value="ctx">{{ ctxConfig[ctx]?.label || ctx }}</option>
        </select>
        <button class="my-btn my-btn-sm my-btn-success" @click="addEntry">＋ 新增</button>
        <button class="my-btn my-btn-sm" @click="showAddCustom" :style="{ display: isArrayMode ? 'none' : '' }">＋自定义</button>
      </div>
    </div>

    <div v-if="entries.length === 0" class="empty-hint" style="padding:40px 12px">
      当前路径下无数据，点击"＋"添加
    </div>

    <div v-else class="chapter-list">
      <div v-for="([rowKey, node], idx) in entries" :key="rowKey" class="chapter-row"
        :data-index="isArrayMode ? rowKey : undefined" :data-key="isArrayMode ? undefined : rowKey"
        :data-id="node.id || rowKey" @dblclick="openEditRow(rowKey)">
        <div class="chapter-row-main">
          <span class="chapter-speaker-badge"
            :style="{ background: speakerColor(isArrayMode ? (speakerName(node) || '?') : String(rowKey).charAt(0).toUpperCase() || '?') }">
            {{ isArrayMode ? (speakerName(node) || '?').charAt(0) || '?' : String(rowKey).charAt(0).toUpperCase() || '?' }}
          </span>
          <div class="chapter-cols">
            <div class="chapter-col-speaker">
              <input v-if="isArrayMode" class="chapter-speaker-input" :value="speakerName(node)" placeholder="说话人"
                @change="e => updateSpeaker(rowKey, e.target.value)" />
              <span v-else class="chapter-key-label">{{ rowKey }}</span>
            </div>
            <div v-for="col in visibleCols" :key="col" class="chapter-col" :class="'chapter-col-' + col">
              <template v-if="isI18nVal(node[col])">
                <input v-for="lang in languages" :key="col + '.' + lang" class="chapter-cell-input chapter-i18n-input"
                  :value="node[col]?.[lang] || ''" :placeholder="lang"
                  @change="e => updateI18nField(rowKey, col, lang, e.target.value)" />
              </template>
              <input v-else-if="node[col] === null || node[col] === undefined"
                class="chapter-cell-input chapter-cell-null" placeholder="—" />
              <span v-else-if="typeof node[col] === 'object'" class="chapter-cell-display">
                {{ JSON.stringify(node[col]) }}
              </span>
              <input v-else class="chapter-cell-input chapter-simple-input" :value="String(node[col])"
                @change="e => updateSimpleField(rowKey, col, e.target.value)" />
            </div>
          </div>
          <button class="my-btn-icon chapter-open-btn" title="打开完整编辑" @click="openEditRow(rowKey)">▶</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useStoryStore } from '../../stores/storyStore.js'
import { getLanguages, getContextKeys, getContextsConfig, loadEffectiveTemplates, loadTemplateKeys } from '../../js/logic/logic-storyTypes.js'
import { showObjectAddDialog } from '../base/useDialog.js'

function loadColumnConfig() {
  try { return JSON.parse(localStorage.getItem('storyeditor_chapter_cols') || '["speaker","text"]') }
  catch { return ['speaker', 'text'] }
}

function saveColumnConfig(cols) {
  localStorage.setItem('storyeditor_chapter_cols', JSON.stringify(cols))
}

const storyStore = useStoryStore()
const languages = getLanguages()
const ctxKeys = getContextKeys()
const ctxConfig = getContextsConfig()
const ctxSelect = ref(null)

const currentPath = computed(() => storyStore.currentPath || [])
const currentValue = computed(() => {
  if (currentPath.value.length === 0) return storyStore.curJson
  return storyStore.getByPath(currentPath.value)
})

const isArrayMode = computed(() => Array.isArray(currentValue.value))

const entries = computed(() => {
  const val = currentValue.value
  if (!val || typeof val !== 'object') return []
  if (Array.isArray(val)) return val.map((item, i) => [String(i), item])
  return Object.entries(val)
})

const pathLabel = computed(() => currentPath.value.join(' → ') || '(root)')

const typeLabel = computed(() => {
  const val = currentValue.value
  if (Array.isArray(val)) return '[]'
  if (val && typeof val === 'object' && val !== null) return '{}'
  return typeof val
})

const visibleCols = computed(() => loadColumnConfig().filter(c => c !== 'speaker'))

function isI18nVal(val) {
  return val && typeof val === 'object' && !Array.isArray(val) && 'zh' in val
}

function speakerName(node) {
  return typeof node?.speaker === 'object' ? (node.speaker.zh || '') : (node?.speaker || '')
}

const _speakerColorCache = {}
function speakerColor(name) {
  if (!name) return 'var(--accent)'
  if (_speakerColorCache[name]) return _speakerColorCache[name]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  const hue = Math.abs(hash % 360)
  const color = `hsl(${hue}, 55%, 50%)`
  _speakerColorCache[name] = color
  return color
}

// ===== 事件处理 =====

/** 列配置弹窗 */
function showColumnConfig() {
  const fieldSet = new Set()
  entries.value.forEach(([, node]) => {
    if (node && typeof node === 'object') Object.keys(node).forEach(k => fieldSet.add(k))
  })
  const allFields = [...fieldSet]
  const currentCols = loadColumnConfig()

  const modal = document.createElement('div')
  modal.className = 'my-modal-overlay'
  modal.innerHTML = `<div class="my-modal-box" style="width:360px">
    <div class="my-modal-header"><h2>显示列设置</h2><button class="my-modal-close" id="col-close">✕</button></div>
    <div class="my-modal-body">
      <div style="margin-bottom:8px">选择要在列表中显示的字段：</div>
      ${allFields.map(f => `
        <label style="display:block;margin:4px 0">
          <input type="checkbox" value="${f}" ${currentCols.includes(f) ? 'checked' : ''} /> ${f}
        </label>
      `).join('')}
      <div style="margin-top:8px;font-size:0.75rem;color:var(--text-dim)">提示：i18n 字段会根据语言设置自动展开为多列</div>
    </div>
    <div class="my-modal-footer">
      <button class="my-btn my-btn-sm" id="col-cancel">取消</button>
      <button class="my-btn my-btn-sm my-btn-primary" id="col-ok">确定</button>
    </div>
  </div>`
  document.body.appendChild(modal)
  requestAnimationFrame(() => modal.classList.add('open'))

  const closeModal = () => { modal.classList.remove('open'); setTimeout(() => modal.remove(), 200) }
  modal.querySelector('#col-close').onclick = closeModal
  modal.querySelector('#col-cancel').onclick = closeModal
  modal.addEventListener('click', e => { if (e.target === modal) closeModal() })
  modal.querySelector('#col-ok').onclick = () => {
    const checked = [...modal.querySelectorAll('input[type=checkbox]:checked')].map(c => c.value)
    saveColumnConfig(checked)
    closeModal()
  }
}

/** 新增条目（数组模式加节点，对象模式按模板键名自动创建） */
function addEntry() {
  const ctx = ctxSelect.value?.value || 'content'
  const dataPath = currentPath.value

  if (isArrayMode.value) {
    storyStore.addNode(ctx, dataPath)
  } else {
    // 对象模式：按模板自动增长键名
    const allTpls = loadEffectiveTemplates()
    const tpl = allTpls[ctx] || {}
    const tplKeys = loadTemplateKeys()
    const keyPattern = tplKeys[ctx] || ''
    const parent = storyStore.getByPath(dataPath) || {}
    const existingKeys = Object.keys(parent)

    let baseKey = keyPattern || ''
    const match = baseKey.match(/^(.*?)(\d+)$/)
    if (match) {
      baseKey = match[1]
      let startNum = parseInt(match[2])
      const maxN = existingKeys.reduce((max, k) => {
        const m = k.match(new RegExp('^' + baseKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\d+)$'))
        return m ? Math.max(max, parseInt(m[1]) + 1) : max
      }, 0)
      let n = Math.max(startNum, maxN)
      let key = baseKey + String(n)
      while (key in parent) { n++; key = baseKey + String(n) }
      const templateVal = JSON.parse(JSON.stringify(tpl))
      delete templateVal.id
      storyStore.addObjectProperty(dataPath, key, templateVal)
      return
    }

    let n = 0
    let key
    if (baseKey) {
      const maxN = existingKeys.reduce((max, k) => {
        const m = k.match(new RegExp('^' + baseKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\d+)$'))
        return m ? Math.max(max, parseInt(m[1]) + 1) : max
      }, 0)
      n = maxN
      key = baseKey + String(n)
      while (key in parent) { n++; key = baseKey + String(n) }
    } else {
      while (String(n) in parent) n++
      key = String(n)
    }
    const templateVal = JSON.parse(JSON.stringify(tpl))
    delete templateVal.id
    storyStore.addObjectProperty(dataPath, key, templateVal)
  }
}

/** 自定义属性弹窗 */
async function showAddCustom() {
  const result = await showObjectAddDialog()
  if (!result || !result.key) return
  const dataPath = currentPath.value
  const tpl = loadEffectiveTemplates()
  const tplCtx = Object.keys(tpl).find(k => k === result.key) ? result.key : null

  if (tplCtx) {
    const templateVal = JSON.parse(JSON.stringify(tpl[tplCtx]))
    delete templateVal.id
    storyStore.addObjectProperty(dataPath, result.key, templateVal)
  } else {
    const defaultValue = result.type === 'number' ? 0 : result.type === 'array' ? [] : result.type === 'object' ? {} : ''
    storyStore.addObjectProperty(dataPath, result.key, defaultValue)
  }
}

/** 更新说话人 */
function updateSpeaker(rowKey, val) {
  const node = isArrayMode.value ? currentValue.value[parseInt(rowKey)] : currentValue.value[rowKey]
  if (!node) return
  if (typeof node.speaker !== 'object') node.speaker = { zh: '', en: '' }
  node.speaker.zh = val
  storyStore._emit()
}

/** 更新 i18n 字段 */
function updateI18nField(rowKey, field, lang, val) {
  const node = isArrayMode.value ? currentValue.value[parseInt(rowKey)] : currentValue.value[rowKey]
  if (!node) return
  if (typeof node[field] !== 'object') node[field] = {}
  node[field][lang] = val
  storyStore._emit()
}

/** 更新普通字段 */
function updateSimpleField(rowKey, field, val) {
  const node = isArrayMode.value ? currentValue.value[parseInt(rowKey)] : currentValue.value[rowKey]
  if (!node) return
  node[field] = /^\d+$/.test(val) && !isNaN(val) ? Number(val) : val
  storyStore._emit()
}

/** 打开完整编辑（跳转到表单 tab） */
function openEditRow(rowKey) {
  const dataPath = currentPath.value
  const node = isArrayMode.value ? currentValue.value[parseInt(rowKey)] : currentValue.value[rowKey]
  if (!node) return
  storyStore.currentPath = [...dataPath, isArrayMode.value ? parseInt(rowKey) : rowKey]
  storyStore._emit()
  const formTab = document.querySelector('[data-tab="form"]')
  if (formTab) formTab.click()
}
</script>

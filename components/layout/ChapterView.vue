<template>
  <div class="editor-tab-panel">
    <div class="container row">
      <div class="col-2"><button class="my-btn my-btn-sm" id="btn-chapter-cols">⚙️显示列</button></div>
      <div class="col-10"> <span class="chapter-count" id="chapter-path-label">{{ pathLabel }}</span>
        <span class="chapter-type-badge" id="chapter-type-badge">{{ typeLabel }}</span>
        <span class="chapter-count" id="chapter-count-label">· 共 {{ entries.length }} 条</span>
        <select id="chapter-ctx-select" class="my-input-sm">
          <option v-for="ctx in ctxKeys" :key="ctx" :value="ctx">{{ ctxConfig[ctx]?.label || ctx }}</option>
        </select>
        <button class="my-btn my-btn-sm my-btn-success" id="btn-chapter-add">＋ 新增</button>
        <button class="my-btn my-btn-sm" id="btn-chapter-add-custom" :style="{ display: isArrayMode ? 'none' : '' }">＋
          自定义</button>
      </div>

    </div>

    <div v-if="entries.length === 0" class="empty-hint" style="padding:40px 12px">
      当前路径下无数据，点击"＋"添加
    </div>

    <div v-else id="chapter-list-container" class="chapter-list">
      <div v-for="([rowKey, node], idx) in entries" :key="rowKey" class="chapter-row"
        :data-index="isArrayMode ? rowKey : undefined" :data-key="isArrayMode ? undefined : rowKey"
        :data-id="node.id || rowKey">
        <div class="chapter-row-main">
          <span class="chapter-speaker-badge"
            :style="{ background: speakerColor(isArrayMode ? (speakerName(node) || '?') : String(rowKey).charAt(0).toUpperCase() || '?') }">
            {{ isArrayMode ? (speakerName(node) || '?').charAt(0) || '?' : String(rowKey).charAt(0).toUpperCase() || '?'
            }}
          </span>
          <div class="chapter-cols">
            <div class="chapter-col-speaker">
              <input v-if="isArrayMode" class="chapter-speaker-input" :value="speakerName(node)" :data-key="rowKey"
                placeholder="说话人" />
              <span v-else class="chapter-key-label">{{ rowKey }}</span>
            </div>
            <div v-for="col in visibleCols" :key="col" class="chapter-col" :class="'chapter-col-' + col">
              <template v-if="isI18nVal(node[col])">
                <input v-for="lang in languages" :key="col + '.' + lang" class="chapter-cell-input chapter-i18n-input"
                  :value="node[col]?.[lang] || ''" :data-key="rowKey" :data-field="col" :data-lang="lang"
                  :placeholder="lang" />
              </template>
              <input v-else-if="node[col] === null || node[col] === undefined"
                class="chapter-cell-input chapter-cell-null" :data-key="rowKey" :data-field="col" placeholder="—" />
              <span v-else-if="typeof node[col] === 'object'" class="chapter-cell-display">
                {{ JSON.stringify(node[col]) }}
              </span>
              <input v-else class="chapter-cell-input chapter-simple-input" :value="String(node[col])"
                :data-key="rowKey" :data-field="col" />
            </div>
          </div>
          <button class="my-btn-icon chapter-open-btn" :data-key="rowKey" :data-array="isArrayMode"
            title="打开完整编辑">▶</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useStoryStore } from '../../stores/storyStore.js'
import { getLanguages, getContextKeys, getContextsConfig } from '../../js/logic/logic-storyTypes.js'

function loadColumnConfig() {
  try { return JSON.parse(localStorage.getItem('storyeditor_chapter_cols') || '["speaker","text"]') }
  catch { return ['speaker', 'text'] }
}

const storyStore = useStoryStore()
const languages = getLanguages()
const ctxKeys = getContextKeys()
const ctxConfig = getContextsConfig()

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

/** 判断一个值是否为 i18n 对象 */
function isI18nVal(val) {
  return val && typeof val === 'object' && !Array.isArray(val) && 'zh' in val
}

/** 说话人名称 */
function speakerName(node) {
  return typeof node?.speaker === 'object' ? (node.speaker.zh || '') : (node?.speaker || '')
}

// 说话人颜色缓存
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
</script>

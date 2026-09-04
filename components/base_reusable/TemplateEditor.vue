<template>
  <Modal
    :visible="visible"
    title="📋 模板编辑"
    width="760px"
    :esc-closable="!confirming"
    @update:visible="requestClose"
  >
    <!-- 空状态：没有任何模板 -->
    <template v-if="ctxKeys.length === 0">
      <div style="padding:40px 12px;text-align:center;color:var(--text-dim)">
        <p>暂无模板</p>
        <button class="my-btn my-btn-sm my-btn-success" style="margin-top:12px" @click="createFirstTemplate">＋ 创建第一个模板</button>
      </div>
    </template>

    <!-- 模板编辑区 -->
    <template v-else>
      <!-- 上下文切换栏 -->
      <div class="tpl-ctx-bar">
        <label>模板上下文：</label>
        <button
          v-for="k in ctxKeys"
          :key="k"
          class="tpl-ctx-btn"
          :class="{ active: k === currentCtx }"
          :title="(ctxConfig[k] || {}).description || ''"
          @click="switchCtx(k)"
        >{{ (ctxConfig[k] || {}).label || k }}</button>
        <button class="my-btn my-btn-sm" @click="newTemplate">＋ 新建</button>
        <span style="flex:1"></span>
        <button
          class="my-btn my-btn-sm"
          style="color:var(--accent)"
          title="删除当前整个模板"
          @click="deleteTemplate"
        >✕ 删除此模板</button>
      </div>

      <!-- 自动增长键名 -->
      <div style="display:flex;gap:8px;align-items:center;padding:4px 0;border-bottom:1px solid var(--border);margin-bottom:4px">
        <label style="font-size:0.75rem;color:var(--text-dim);white-space:nowrap">自动增长键名：</label>
        <input
          v-model="keyPattern"
          class="my-input-sm"
          style="width:120px;font-family:var(--font-mono)"
          placeholder="留空=数字自增"
          @input="dirty = true"
        />
        <span style="font-size:0.7rem;color:var(--text-dim)">属性模式新建时按此模式自动生成键名（如 content → content0 → content1）</span>
      </div>

      <!-- 字段列表 -->
      <div class="editor-fields" id="tpl-fields">
        <div v-if="emptyTemplate" class="empty-hint" style="padding:16px 0">此模板暂无字段，点击下方 "＋ 添加字段" 创建。</div>
        <div
          v-for="[key, val] in templateEntries"
          :key="key"
          class="field-row"
          :class="rowClass(val)"
        >
          <!-- 字段名（可双击改名） -->
          <label
            v-if="editingKey !== key"
            class="editable-label field-label"
            :title="'双击编辑标签' + (labelAlias(key) ? ' · 显示名: ' + labelAlias(key) : '')"
            @dblclick="startRename(key)"
          >{{ key }}<span v-if="labelAlias(key)" class="field-label-alias">{{ labelAlias(key) }}</span></label>
          <input
            v-else
            :ref="setRenameEl"
            class="my-input-sm label-editor"
            v-model="editValue"
            @blur="finishRename(key)"
            @keydown.enter.prevent="finishRename(key)"
            @keydown.escape="cancelRename"
          />

          <!-- 类型标签 -->
          <span class="type-badge" :class="'type-' + typeLabel(val)">{{ typeLabel(val) }}</span>

          <!-- i18n 多语言输入组 -->
          <template v-if="isI18n(val)">
            <div class="i18n-group">
              <input
                v-for="lang in langs"
                :key="lang"
                class="my-input"
                :value="val[lang] || ''"
                :placeholder="lang"
                @input="updateI18n(key, lang, $event)"
              />
            </div>
          </template>
          <!-- 对象/数组 → JSON 字符串编辑 -->
          <template v-else-if="isComplex(val)">
            <input
              class="my-input tmpl-field"
              :value="JSON.stringify(val)"
              placeholder="{}"
              @change="updateComplex(key, $event)"
            />
          </template>
          <!-- 字符串 / 数字 -->
          <template v-else>
            <input
              class="my-input tmpl-field"
              :class="{ 'my-input-num': typeof val === 'number' }"
              :value="scalarString(val)"
              @change="updateScalar(key, $event)"
            />
          </template>

          <button class="my-btn-icon my-btn-del-tmpl" :title="'删除字段 ' + key" @click="deleteField(key)">✕</button>
        </div>
      </div>

      <!-- 添加字段 -->
      <div style="display:flex;gap:8px;align-items:center;margin-top:4px">
        <button class="my-btn my-btn-sm my-btn-success" @click="addField">＋ 添加字段</button>
        <select v-model="addType" class="my-input-sm" style="width:auto">
          <option value="string">字符串</option>
          <option value="number">数字</option>
          <option value="array">数组</option>
          <option value="object">对象</option>
        </select>
      </div>

      <!-- JSON 镜像编辑 -->
      <div style="margin-top:12px;font-size:0.75rem;color:var(--text-dim)">JSON 编辑：</div>
      <div class="tpl-json-mirror">
        <pre class="json-highlight"><code ref="hlCode"></code></pre>
        <textarea
          ref="jsonEditor"
          class="json-editor"
          spellcheck="false"
          @input="onJsonInput"
          @scroll="onJsonScroll"
          @keydown.tab.prevent="onJsonTab"
          @blur="onJsonBlur"
        ></textarea>
      </div>
    </template>

    <template #footer>
      <button class="my-btn my-btn-sm my-btn-primary" @click="save">💾 保存</button>
      <button class="my-btn my-btn-sm" @click="requestClose">关闭（不保存）</button>
    </template>
  </Modal>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import Modal from '../base/Modal.vue'
import hljs from 'highlight.js'
import { useStoryStore } from '../../stores/storyStore.js'
import {
  loadEffectiveTemplates, loadTemplateKeys, saveTemplateKeys,
  getContextsConfig, getFieldLabel, saveTemplates, getLanguages
} from '../../js/logic/logic-storyTypes.js'
import { showConfirm, showPrompt } from '../base/useDialog.js'

const props = defineProps({
  visible: { type: Boolean, default: false }
})
const emit = defineEmits(['close', 'update:visible'])

const storyStore = useStoryStore()

// ---- 内存草稿（点"保存"才写入 localStorage）----
const draft = ref(null)        // { [ctx]: templateObj }
const draftKeys = ref({})      // { [ctx]: keyPattern }
const currentCtx = ref(null)
const dirty = ref(false)
const deletedCtxs = ref([])
const confirming = ref(false)  // 是否有嵌套确认弹窗打开（抑制 ESC 冒泡）

// ---- 字段编辑状态 ----
const editingKey = ref(null)
const editValue = ref('')
const renameInput = ref(null)
const addType = ref('string')

// ---- 引用 ----
const hlCode = ref(null)
const jsonEditor = ref(null)

// ---- 计算属性 ----
const ctxConfig = computed(() => getContextsConfig())
const ctxKeys = computed(() =>
  Object.keys(draft.value || {}).filter(k => draft.value[k] !== undefined && draft.value[k] !== null)
)
const currentTemplate = computed(() =>
  (draft.value && currentCtx.value) ? draft.value[currentCtx.value] : null
)
const templateEntries = computed(() =>
  currentTemplate.value ? Object.entries(currentTemplate.value) : []
)
const emptyTemplate = computed(() =>
  !currentTemplate.value || Object.keys(currentTemplate.value).length === 0
)
const langs = computed(() => getLanguages())

const keyPattern = computed({
  get: () => (draftKeys.value[currentCtx.value] || ''),
  set: (v) => {
    if (v.trim()) draftKeys.value[currentCtx.value] = v.trim()
    else delete draftKeys.value[currentCtx.value]
  }
})

// ---- 打开时初始化草稿 ----
watch(() => props.visible, (v) => {
  if (!v) return
  draft.value = JSON.parse(JSON.stringify(loadEffectiveTemplates()))
  draftKeys.value = JSON.parse(JSON.stringify(loadTemplateKeys()))
  dirty.value = false
  deletedCtxs.value = []
  editingKey.value = null
  const keys = Object.keys(draft.value).filter(k => draft.value[k] != null)
  currentCtx.value = keys.length ? keys[0] : null
  nextTick(() => syncJsonMirror())
})

// ---- 关闭 ----
function requestClose() {
  if (dirty.value) {
    confirming.value = true
    showConfirm('有未保存的修改，确定不保存吗？').then(ok => {
      confirming.value = false
      if (ok) doClose()
    })
  } else {
    doClose()
  }
}

function doClose() {
  emit('update:visible', false)
  emit('close')
}

// ---- 上下文切换 ----
function switchCtx(key) {
  currentCtx.value = key
  editingKey.value = null
  nextTick(() => syncJsonMirror())
}

function createFirstTemplate() {
  draft.value['content'] = {}
  currentCtx.value = 'content'
  deletedCtxs.value = deletedCtxs.value.filter(k => k !== 'content')
  dirty.value = true
  nextTick(() => syncJsonMirror())
}

async function newTemplate() {
  const key = await showPrompt('请输入模板键名（如：content）:')
  if (!key) return
  draft.value[key] = {}
  deletedCtxs.value = deletedCtxs.value.filter(k => k !== key)
  currentCtx.value = key
  dirty.value = true
  nextTick(() => syncJsonMirror())
}

async function deleteTemplate() {
  if (!currentCtx.value) return
  confirming.value = true
  const ok = await showConfirm(`确定删除模板 "${currentCtx.value}" 吗？此操作不可撤销。`)
  confirming.value = false
  if (!ok) return
  deletedCtxs.value.push(currentCtx.value)
  delete draft.value[currentCtx.value]
  dirty.value = true
  const keys = Object.keys(draft.value).filter(k => draft.value[k] != null)
  if (keys.length) currentCtx.value = keys[0]
  else { draft.value['content'] = {}; currentCtx.value = 'content' }
  nextTick(() => syncJsonMirror())
}

// ---- 字段操作 ----
function addField() {
  const ctx = currentTemplate.value
  if (!ctx) return
  let key = 'new_field'
  let i = 1
  while (key in ctx) key = 'new_field_' + i++
  switch (addType.value) {
    case 'number': ctx[key] = 0; break
    case 'array': ctx[key] = []; break
    case 'object': ctx[key] = {}; break
    default: ctx[key] = ''
  }
  dirty.value = true
  nextTick(() => syncJsonMirror())
}

async function deleteField(key) {
  confirming.value = true
  const ok = await showConfirm(`确定删除字段 "${getFieldLabel(key)}" 吗？`)
  confirming.value = false
  if (!ok) return
  delete currentTemplate.value[key]
  dirty.value = true
  nextTick(() => syncJsonMirror())
}

function updateScalar(key, event) {
  const raw = event.target.value
  const cur = currentTemplate.value[key]
  currentTemplate.value[key] = typeof cur === 'number' ? Number(raw) : raw
  dirty.value = true
  nextTick(() => syncJsonMirror())
}

function updateComplex(key, event) {
  try { currentTemplate.value[key] = JSON.parse(event.target.value) } catch {}
  dirty.value = true
  nextTick(() => syncJsonMirror())
}

function updateI18n(key, lang, event) {
  const cur = currentTemplate.value[key]
  if (!cur || typeof cur !== 'object' || Array.isArray(cur)) currentTemplate.value[key] = {}
  currentTemplate.value[key][lang] = event.target.value
  dirty.value = true
  nextTick(() => syncJsonMirror())
}

// ---- 双击改名 ----
function startRename(key) {
  editingKey.value = key
  editValue.value = key
  nextTick(() => {
    const input = renameInput.value
    if (input) { input.focus(); input.select() }
  })
}

function setRenameEl(el) { if (el) renameInput.value = el }

function finishRename(key) {
  const newKey = editValue.value.trim()
  if (newKey && newKey !== key) {
    const ctx = currentTemplate.value
    if (ctx && key in ctx) {
      ctx[newKey] = ctx[key]
      delete ctx[key]
      dirty.value = true
    }
  }
  editingKey.value = null
  nextTick(() => syncJsonMirror())
}

function cancelRename() {
  editingKey.value = null
}

// ---- 保存 ----
function save() {
  saveTemplates(draft.value, deletedCtxs.value)
  saveTemplateKeys(draftKeys.value)
  storyStore._emit()
  dirty.value = false
  doClose()
}

// ---- JSON 镜像编辑器 ----
function applyHighlight(text) {
  const code = hlCode.value
  if (!code) return
  code.textContent = text
  try { code.innerHTML = hljs.highlight(text, { language: 'json' }).value } catch (_) {}
}

function syncJsonMirror() {
  const ta = jsonEditor.value
  if (!ta) return
  const str = JSON.stringify(currentTemplate.value || {}, null, 4)
  if (document.activeElement !== ta) ta.value = str
  applyHighlight(str)
}

function onJsonInput() { applyHighlight(jsonEditor.value.value) }

function onJsonScroll() {
  const pre = jsonEditor.value?.parentElement?.querySelector('pre')
  if (pre) { pre.scrollTop = jsonEditor.value.scrollTop; pre.scrollLeft = jsonEditor.value.scrollLeft }
}

function onJsonTab() {
  const ta = jsonEditor.value
  const start = ta.selectionStart, end = ta.selectionEnd
  ta.value = ta.value.substring(0, start) + '    ' + ta.value.substring(end)
  ta.selectionStart = ta.selectionEnd = start + 4
  applyHighlight(ta.value)
}

function onJsonBlur() {
  try {
    const parsed = JSON.parse(jsonEditor.value.value)
    draft.value[currentCtx.value] = parsed
    dirty.value = true
    nextTick(() => syncJsonMirror())
  } catch (_) {}
}

// ---- 类型识别 ----
function isI18n(val) {
  return val && typeof val === 'object' && !Array.isArray(val) && 'zh' in val
}
function isComplex(val) {
  return val && typeof val === 'object'
}
function typeLabel(val) {
  if (val === null || val === undefined) return 'nil'
  if (isI18n(val)) return 'i18n'
  if (Array.isArray(val)) return 'arr'
  if (typeof val === 'number') return 'num'
  if (typeof val === 'object') return 'obj'
  return 'str'
}
function rowClass(val) {
  const t = typeLabel(val)
  if (t === 'nil') return 'field-row-null'
  if (t === 'i18n') return 'field-row-i18n'
  if (t === 'arr') return 'field-row-arr'
  if (t === 'obj') return 'field-row-obj'
  if (t === 'num') return 'field-row-num'
  return ''
}
function scalarString(val) {
  return val === null || val === undefined ? '' : String(val)
}
function labelAlias(key) {
  const lbl = getFieldLabel(key)
  return lbl !== key ? lbl : ''
}
</script>

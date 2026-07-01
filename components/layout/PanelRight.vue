<template>
  <div class="panel panel-right" id="panel-right">
    <div class="panel-header">
      JSON 预览
      <button class="btn btn-sm" title="格式化 JSON" @click="formatJSON">格式化</button>
    </div>
    <div class="json-mirror">
      <pre class="json-highlight" ref="highlightPre"></pre>
      <textarea
        ref="editor"
        class="json-editor"
        spellcheck="false"
        @input="onInput"
        @scroll="onScroll"
        @keydown="onKeydown"
        @blur="onBlur"
      ></textarea>
      <div class="json-error" ref="errorDiv" style="display:none"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { useStoryStore } from '../../stores/storyStore.js'

const storyStore = useStoryStore()

const editor = ref(null)
const highlightPre = ref(null)
const errorDiv = ref(null)

// ---- 高亮辅助 ----
function applyHighlight(text) {
  const pre = highlightPre.value
  if (!pre) return
  if (window.hljs) {
    try {
      pre.innerHTML = window.hljs.highlight(text, { language: 'json' }).value
      return
    } catch (_) {}
  }
  pre.textContent = text
}

function showError(msg) {
  if (errorDiv.value) {
    errorDiv.value.textContent = '⚠️ ' + msg
    errorDiv.value.style.display = 'block'
  }
}
function hideError() {
  if (errorDiv.value) errorDiv.value.style.display = 'none'
}

// ---- 渲染 JSON ----
function renderJSON() {
  const val = storyStore.getByPath(storyStore.currentPath || [])
  const jsonStr = JSON.stringify(val, null, 4)
  if (editor.value && document.activeElement !== editor.value) {
    editor.value.value = jsonStr
    applyHighlight(jsonStr)
  }
}

// ---- 滚动到当前路径 ----
function scrollToPath() {
  const path = storyStore.currentPath || []
  const el = editor.value
  if (!el) return
  if (path.length === 0) { el.scrollTop = 0; el.scrollLeft = 0; return }
  const val = storyStore.getByPath(path)
  if (!val) return
  const jsonStr = JSON.stringify(val, null, 4)
  const fullStr = JSON.stringify(storyStore.getByPath([]), null, 4)
  const idx = fullStr.indexOf(jsonStr)
  if (idx === -1) return
  const before = fullStr.substring(0, idx)
  const lines = before.split('\n').length - 1
  const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 20
  el.scrollTop = Math.max(0, (lines - 3) * lineHeight)
}

// ---- 监听 store 变更 ----
let _lastPath = ''
watch(
  () => storyStore.dataVersion,
  () => {
    const pathKey = (storyStore.currentPath || []).join('|')
    if (pathKey !== _lastPath) {
      _lastPath = pathKey
      nextTick(scrollToPath)
    }
    renderJSON()
  },
  { immediate: true }
)

// ---- 事件处理 ----
function onInput() {
  applyHighlight(editor.value.value)
  try { JSON.parse(editor.value.value); hideError() } catch (e) { showError(e.message) }
}

function onScroll() {
  if (highlightPre.value) {
    highlightPre.value.scrollTop = editor.value.scrollTop
    highlightPre.value.scrollLeft = editor.value.scrollLeft
  }
}

function onKeydown(e) {
  if (e.key === 'Tab') {
    e.preventDefault()
    const ta = editor.value
    const start = ta.selectionStart, end = ta.selectionEnd
    ta.value = ta.value.substring(0, start) + '    ' + ta.value.substring(end)
    ta.selectionStart = ta.selectionEnd = start + 4
    ta.dispatchEvent(new Event('input'))
  }
}

function onBlur() {
  try {
    const parsed = JSON.parse(editor.value.value)
    const formatted = JSON.stringify(parsed, null, 4)
    editor.value.value = formatted
    applyHighlight(formatted)
    hideError()
    const path = storyStore.currentPath
    if (path && path.length > 0) storyStore.setByPath([...path], parsed)
    else if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) storyStore.loadCurJson(parsed)
    else showError('根节点必须是对象 {}')
  } catch (e) { showError(e.message) }
}

function formatJSON() {
  try {
    const parsed = JSON.parse(editor.value.value)
    const formatted = JSON.stringify(parsed, null, 4)
    editor.value.value = formatted
    applyHighlight(formatted)
    hideError()
    const path = storyStore.currentPath
    if (path && path.length > 0) storyStore.setByPath([...path], parsed)
    else if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) storyStore.loadCurJson(parsed)
    else showError('根节点必须是对象 {}')
  } catch (e) { showError(e.message) }
}
</script>

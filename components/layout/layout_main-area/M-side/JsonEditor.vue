<template>
  <div class="editor-tab-panel" id="panel-json">
    <div class="path-mirror" id="path-mirror-center">
      <pre class="json-highlight"><code class="language-json" ref="highlightCode"></code></pre>
      <textarea
        ref="editor"
        class="json-editor"
        id="path-editor-center"
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
import { useStoryStore } from '../../../../stores/storyStore.js'

const storyStore = useStoryStore()

const editor = ref(null)
const highlightCode = ref(null)
const errorDiv = ref(null)

function applyHighlight(text) {
  const code = highlightCode.value
  if (!code) return
  code.textContent = text
  if (window.hljs) {
    try {
      code.innerHTML = window.hljs.highlight(text, { language: 'json' }).value
    } catch (_) {}
  }
}

function renderJSON() {
  const val = storyStore.getByPath(storyStore.currentPath || [])
  const jsonStr = JSON.stringify(val, null, 4)
  if (editor.value && document.activeElement !== editor.value) {
    editor.value.value = jsonStr
    applyHighlight(jsonStr)
  }
}

// 监听 store 变更
watch(() => storyStore.dataVersion, () => {
  // 延时确保 DOM 已切换
  nextTick(renderJSON)
}, { immediate: true })

function onInput() {
  const text = editor.value.value
  applyHighlight(text)
  const errEl = errorDiv.value
  if (!errEl) return
  try { JSON.parse(text); errEl.style.display = 'none' }
  catch (e) { errEl.textContent = '⚠️ ' + e.message; errEl.style.display = '' }
}

function onScroll() {
  const pre = editor.value?.parentElement?.querySelector('pre')
  if (pre) { pre.scrollTop = editor.value.scrollTop; pre.scrollLeft = editor.value.scrollLeft }
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
    const path = storyStore.currentPath
    if (path && path.length > 0) storyStore.setByPath([...path], parsed)
  } catch (_) { /* input 已显示错误 */ }
}
</script>

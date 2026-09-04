<template>
  <Modal :visible="visible" title="新建结构类型" width="680px" @update:visible="onClose">
    <div class="ns-body">
      <div class="ns-left">
        <div class="ns-field">
          <label>ID</label>
          <input class="my-input" v-model="form.id" placeholder="如 myType" style="font-family:var(--font-mono)" @keydown.enter="onCreate" />
        </div>
        <div class="ns-field">
          <label>显示名称</label>
          <input class="my-input" v-model="form.label" placeholder="如 自定义类型" />
        </div>
        <div class="ns-field">
          <label>匹配方式</label>
          <select class="my-input" v-model="form.matchType">
            <option value="struct">属性检测（struct）</option>
            <option value="glob">键名通配（glob）</option>
            <option value="path">路径匹配（path）</option>
          </select>
        </div>
        <div class="ns-field" v-if="form.matchType === 'struct'">
          <label>标记属性键名</label>
          <input class="my-input" v-model="form.marker" placeholder="如 zh" style="font-family:var(--font-mono)" />
          <div class="ns-hint">具有此键的对象才算匹配，同时自动保证此键存在</div>
        </div>
        <div class="ns-field" v-if="form.matchType === 'glob' || form.matchType === 'path'">
          <label>通配模式</label>
          <input class="my-input" v-model="form.pattern" placeholder="如 **.speaker" style="font-family:var(--font-mono)" />
          <div class="ns-hint" v-if="form.matchType === 'glob'"><code>**</code> = 任意层 · <code>*</code> = 单级通配 · 字面量精确匹配</div>
        </div>
        <div class="ns-field" v-if="form.matchType === 'glob' || form.matchType === 'path'">
          <label>初始字段（逗号分隔）</label>
          <input class="my-input" v-model="form.fieldsStr" placeholder="如 zh, en" style="font-family:var(--font-mono)" />
          <div class="ns-hint">匹配到的对象保证拥有以上所有字段</div>
        </div>
      </div>
      <div class="ns-right">
        <label>匹配预览</label>
        <div class="ns-preview">
          <div v-if="preview.matchDesc" style="color:var(--accent);margin-bottom:4px">{{ preview.matchDesc }}</div>
          <div v-for="(ex, i) in preview.examples" :key="i" style="color:var(--text)"> → {{ ex }}</div>
          <div v-if="preview.note" style="margin-top:4px">{{ preview.note }}</div>
          <div v-if="!preview.matchDesc" style="color:var(--text-dim)">等待输入...</div>
        </div>
      </div>
    </div>
    <template #footer>
      <button class="my-btn my-btn-sm" @click="onClose">取消</button>
      <button class="my-btn my-btn-sm my-btn-primary" @click="onCreate">创建</button>
    </template>
  </Modal>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import Modal from '../base/Modal.vue'
import { useStoryStore } from '../../stores/storyStore.js'
import { loadStructs, saveStructs, syncStruct } from '../../js/logic/logic-storyTypes.js'
import { showAlert } from '../base/useDialog.js'

const props = defineProps({
  visible: { type: Boolean, default: false }
})
const emit = defineEmits(['update:visible'])

const store = useStoryStore()

const form = reactive({
  id: '', label: '', matchType: 'struct', marker: '', pattern: '', fieldsStr: ''
})

function onClose() {
  if (props.visible) emit('update:visible', false)
}

// 匹配预览
const preview = computed(() => {
  const matchType = form.matchType
  const marker = form.marker.trim()
  const pattern = form.pattern.trim()
  const fields = form.fieldsStr.split(/[,，\s]+/).filter(Boolean)
  let matchDesc = '', examples = []
  switch (matchType) {
    case 'struct': {
      if (!marker) break
      matchDesc = `对象含有关键键「${marker}」`
      examples = [
        `{ "${marker}": "..." }`,
        `{ "${marker}": "...", "other": "..." }   ← 也一起匹配，但不管 other`
      ]
      break
    }
    case 'glob': {
      if (!pattern) break
      matchDesc = `键名匹配 Glob 模式「${pattern}」`
      const last = pattern.split('.').pop() || pattern
      if (pattern.startsWith('**.')) {
        examples = [`content[0].${last}`, `meta.${last}`, `content[0].options[0].${last}`]
      } else if (pattern.includes('*')) {
        examples = [pattern.replace('*', '0'), pattern.replace('*', '1')]
      } else {
        examples = [pattern]
      }
      break
    }
    case 'path': {
      if (!pattern) break
      matchDesc = `路径匹配模式「${pattern}」`
      examples = pattern.includes('*') ? [pattern.replace('*', '0'), pattern.replace('*', '1')] : [pattern]
      break
    }
  }
  const note = matchType === 'struct'
    ? (marker ? `\n保证字段: [${marker}]（标记键自动保证）` : '')
    : (fields.length > 0 ? `\n保证字段: [${fields.join(', ')}]` : '')
  return { matchDesc, examples, note }
})

function onCreate() {
  const id = form.id.trim()
  const label = form.label.trim() || id
  const matchType = form.matchType
  const marker = form.marker.trim()
  const pattern = form.pattern.trim()
  const fieldsStr = form.fieldsStr.trim()

  if (!id) { showAlert('ID 不能为空'); return }
  if (matchType === 'struct' && !marker) { showAlert('标记属性键名不能为空'); return }
  if ((matchType === 'glob' || matchType === 'path') && !pattern) { showAlert('通配模式不能为空'); return }

  const fields = matchType === 'struct'
    ? [marker]
    : (fieldsStr ? fieldsStr.split(/[,，\s]+/).filter(Boolean) : [])
  const structs = loadStructs()
  if (structs.some(s => s.id === id)) { showAlert('该 ID 已存在'); return }

  const match = matchType === 'struct'
    ? { type: matchType, marker }
    : { type: matchType, pattern }

  const newStruct = { id, label, match, fields }
  structs.push(newStruct)
  saveStructs(structs)
  // 同步到当前 chapter 数据
  if (store.curJson) {
    syncStruct(store.curJson, newStruct)
    store._emit()
  }
  emit('created', newStruct)
  onClose()
}
</script>

<style scoped>
.ns-body { display: flex; gap: 16px; padding: 4px 0; }
.ns-left { flex: 1; min-width: 0; }
.ns-field { margin-bottom: 8px; }
.ns-field label { display: block; margin-bottom: 4px; font-size: 0.8125rem; color: var(--text-dim); }
.ns-field .my-input { width: 100%; }
.ns-hint { font-size: 0.7rem; color: var(--text-dim); margin-top: 2px; line-height: 1.4; }
.ns-right { width: 280px; min-width: 0; border-left: 1px solid var(--border); padding-left: 12px; }
.ns-right > label { display: block; margin-bottom: 4px; font-size: 0.8125rem; color: var(--text-dim); }
.ns-preview {
  font-size: 0.75rem; font-family: var(--font-mono); background: var(--bg-input);
  border-radius: var(--radius); padding: 8px; min-height: 200px; overflow: auto;
  white-space: pre-wrap; word-break: break-all; line-height: 1.6; color: var(--text-dim);
}
</style>

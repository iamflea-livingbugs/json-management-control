<template>
  <div class="side-view-content">
    <div class="settings-section">
      <label class="settings-label">字体大小</label>
      <div class="settings-font-row">
        <input type="range" class="settings-slider" min="12" max="24" step="1" v-model.number="settings.fontSize" @input="onFontChange" />
        <span class="settings-font-value">{{ settings.fontSize }}px</span>
      </div>
    </div>

    <div class="settings-section">
      <label class="settings-label">色彩方案</label>
      <div class="settings-themes">
        <div v-for="(t, k) in themes" :key="k"
          class="settings-theme-card" :class="{ active: settings.theme === k }"
          @click="selectTheme(k)">
          <div class="settings-theme-preview">
            <span :style="{ background: t.vars['--accent'] }"></span>
            <span :style="{ background: t.vars['--bg-panel'] }"></span>
            <span :style="{ background: t.vars['--text'] }"></span>
            <span :style="{ background: t.vars['--bg'] }"></span>
          </div>
          <div class="settings-theme-name">{{ t.label }}</div>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <label class="settings-label">标签颜色模式</label>
      <div style="display:flex;gap:12px">
        <label style="cursor:pointer"><input type="radio" v-model="settings.labelColor" value="default" @change="saveLabelColor" /> 跟随主题</label>
        <label style="cursor:pointer"><input type="radio" v-model="settings.labelColor" value="type" @change="saveLabelColor" /> 按类型着色</label>
      </div>
    </div>

    <div class="settings-section">
      <label class="settings-label">结构类型管理</label>
      <div style="font-size:0.75rem;color:var(--text-dim);margin-bottom:6px">定义数据中需要统一维护字段的"类型"</div>
      <div v-for="st in structList" :key="st.id" class="settings-struct-card">
        <div class="settings-struct-header">
          <span class="settings-struct-id">{{ st.id }}</span>
          <span class="settings-struct-label">{{ st.label }}</span>
          <span class="settings-struct-match">{{ matchLabel(st) }}</span>
          <button class="my-btn-icon" style="color:var(--accent)" @click="doDeleteStruct(st.id)">✕</button>
        </div>
        <div class="settings-struct-fields">
          <span v-if="st.match.type === 'struct'" class="settings-lang-badge" style="opacity:0.7">{{ st.match.marker }} (标记)</span>
          <span v-for="f in displayFields(st)" :key="f" class="settings-lang-badge">
            {{ f }}
            <button class="my-btn-icon" style="font-size:0.6rem" @click="doRemoveField(st.id, f)">✕</button>
          </span>
          <input class="my-input-sm" style="width:70px;font-family:var(--font-mono)" :placeholder="'新字段'" v-model="fieldInputs[st.id]" @keydown.enter="doAddField(st.id)" />
          <button class="my-btn my-btn-sm my-btn-create" @click="doAddField(st.id)">＋</button>
        </div>
      </div>
      <div style="margin-top:8px"><button class="my-btn my-btn-sm" @click="newStructOpen = true">＋ 新建结构类型</button></div>
    </div>

    <NewStructDialog v-model:visible="newStructOpen" @created="onStructCreated" />

    <div class="settings-section settings-section-row">
      <AppButton type="success" @click="doExport">📤 导出配置</AppButton>
      <AppButton type="success" @click="doImport">📥 导入配置</AppButton>
      <AppButton type="primary" @click="doReset">重置为默认</AppButton>
      <AppButton type="primary" @click="doLayoutReset">恢复默认布局</AppButton>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useStoryStore } from '../../stores/storyStore.js'
const store = useStoryStore()
import { showAlert } from '../base/useDialog.js'
import {
  loadStructs, deleteStruct,
  addStructField,
  removeStructField
} from '../../js/logic/logic-storyTypes.js'

import AppButton from '../base/AppButton.vue'
import NewStructDialog from '../base_reusable/NewStructDialog.vue'
import { readConfig, writeConfig, readSchema, writeSchema } from '../../js/logic/logic-migration.js'

const emit = defineEmits(['layout-reset'])

const themes = {
  dark:   { label: '暗色默认', vars: { '--bg': '#1a1a2e', '--bg-panel': '#16213e', '--bg-input': '#0f3460', '--border': '#2a2a4a', '--text': '#e0e0e0', '--text-dim': '#888', '--accent': '#e94560', '--accent-hover': '#ff6b81', '--success': '#4ecca3', '--warn': '#f0a500' } },
  ocean:  { label: '深海蓝', vars: { '--bg': '#0d1b2a', '--bg-panel': '#1b2838', '--bg-input': '#1b3a4b', '--border': '#2a4a5a', '--text': '#d4e9f7', '--text-dim': '#7a9bb5', '--accent': '#4fc3f7', '--accent-hover': '#81d4fa', '--success': '#66bb6a', '--warn': '#ffa726' } },
  forest: { label: '森林绿', vars: { '--bg': '#1a2e1a', '--bg-panel': '#1e3820', '--bg-input': '#2a4a2e', '--border': '#2a4a30', '--text': '#d4e8d4', '--text-dim': '#7a9a7a', '--accent': '#66bb6a', '--accent-hover': '#81c784', '--success': '#4db6ac', '--warn': '#ffb74d' } },
  light:  { label: '浅色', vars: { '--bg': '#f5f5f5', '--bg-panel': '#ffffff', '--bg-input': '#e8e8e8', '--border': '#d0d0d0', '--text': '#222222', '--text-dim': '#888888', '--accent': '#e53935', '--accent-hover': '#c62828', '--success': '#43a047', '--warn': '#ef6c00' } }
}

function loadSettings() {
  try {
    const c = readConfig()
    if (c) return { theme: c.theme || 'dark', fontSize: c.fontSize || 16, labelColor: c.labelColorMode || 'type' }
  } catch {}
  return {}
}
const defaults = { theme: 'dark', fontSize: 16, labelColor: 'type' }
const settings = reactive({ ...defaults, ...loadSettings() })
const structList = ref(loadStructs())
const fieldInputs = reactive({})

function applyTheme(key) {
  const t = themes[key]
  if (!t) return
  const root = document.documentElement
  for (const [k, v] of Object.entries(t.vars)) root.style.setProperty(k, v)
}
function save() {
  const c = readConfig() || {}
  c.theme = settings.theme
  c.fontSize = settings.fontSize
  c.labelColorMode = settings.labelColor || 'type'
  delete c.meta
  writeConfig(c)
}
function onFontChange() {
  document.documentElement.style.setProperty('--font-size-base', settings.fontSize + 'px')
  save()
}
function selectTheme(key) { settings.theme = key; applyTheme(key); save() }
function saveLabelColor() {
  document.documentElement.dataset.labelColor = settings.labelColor || 'default'
  save()
}
function matchLabel(st) {
  if (st.match.type === 'struct') return `struct(${st.match.marker})`
  return `${st.match.type}(${st.match.pattern})`
}
function displayFields(st) {
  return st.fields.filter(f => st.match.type !== 'struct' || f !== st.match.marker)
}
function doAddField(sid) {
  const f = fieldInputs[sid]
  if (!f || !f.trim()) return
  addStructField(sid, f.trim(), store.curJson)
  store._emit()
  structList.value = loadStructs()
  fieldInputs[sid] = ''
}
function doRemoveField(sid, field) {
  removeStructField(sid, field, store.curJson)
  store._emit()
  structList.value = loadStructs()
}
function doDeleteStruct(sid) {
  deleteStruct(sid, store.curJson)
  store._emit()
  structList.value = loadStructs()
}

const newStructOpen = ref(false)
function onStructCreated() {
  structList.value = loadStructs()
  store._emit()
}

function doExport(...args) {
  const config = {
    meta: { version: 1, exportedAt: new Date().toISOString() },
    config: readConfig() || {},
    schema: readSchema() || {}
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' }))
  a.download = 'storyeditor-config.json'
  a.click()
}

function doImport() {
  const inp = document.createElement('input')
  inp.type = 'file'; inp.accept = '.json'
  inp.onchange = () => {
    const f = inp.files[0]; if (!f) return
    const r = new FileReader()
    r.onload = (e) => {
      try {
        const d = JSON.parse(e.target.result); let c = 0
        if (d.config) { writeConfig(d.config); c++ }
        if (d.schema) { writeSchema(d.schema); c++ }
        // 兼容旧格式（editor/custom 双层结构）：映射到新三层结构
        if (d.editor && d.custom) {
          const cfg = {}
          if (d.editor.settings) {
            cfg.theme = d.editor.settings.theme || 'dark'
            cfg.fontSize = d.editor.settings.fontSize || 16
            cfg.labelColorMode = d.editor.settings.labelColor || d.editor.settings.labelColorMode || 'type'
          }
          if (d.editor.chapterCols) cfg.chapterCols = d.editor.chapterCols
          if (d.custom.labels) cfg.labels = d.custom.labels
          if (Object.keys(cfg).length > 0) { writeConfig(cfg); c++ }
          const sch = {}
          if (d.custom.templates) sch.templates = d.custom.templates
          if (d.custom.deletedTemplates) sch.deletedTemplates = d.custom.deletedTemplates
          if (d.custom.templateKeys) sch.templateKeys = d.custom.templateKeys
          if (d.custom.structs) sch.structs = d.custom.structs
          if (Object.keys(sch).length > 0) { writeSchema(sch); c++ }
        } else if (!d.config && !d.schema) {
          // 兼容旧版平铺格式的配置文件（含 v0.5 前的 storyeditor_* key）
          const oldKeys = {
            settings: 'storyeditor_settings', labels: 'storyeditor_labels',
            chapterCols: 'storyeditor_chapter_cols', templates: 'storyeditor_templates',
            deletedTemplates: 'storyeditor_deleted_templates', templateKeys: 'storyeditor_template_keys',
            structs: 'storyeditor_structs'
          }
          for (const [k, v] of Object.entries(d)) {
            if (k.startsWith('storyeditor_')) {
              localStorage.setItem(k, JSON.stringify(v)); c++
            }
          }
        }
        showAlert(`导入成功！已恢复 ${c} 项配置。`)
        Object.assign(settings, { ...defaults, ...loadSettings() })
        applyTheme(settings.theme)
        structList.value = loadStructs()
        store._emit()
      } catch { showAlert('导入失败') }
    }; r.readAsText(f); inp.value = ''
  }; inp.click()
}

function doReset() {
  localStorage.removeItem('storyeditor_config')
  Object.assign(settings, { ...defaults })
  applyTheme(defaults.theme)
  document.documentElement.style.setProperty('--font-size-base', defaults.fontSize + 'px')
  document.documentElement.dataset.labelColor = defaults.labelColor
  writeConfig({ theme: defaults.theme, fontSize: defaults.fontSize, labelColorMode: defaults.labelColor })
}

function doLayoutReset() {
  emit('layout-reset')
}

// 挂载时应用当前主题
onMounted(() => { applyTheme(settings.theme) })
</script>

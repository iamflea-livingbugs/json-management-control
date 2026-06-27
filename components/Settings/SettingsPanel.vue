<template>
  <n-config-provider :theme-overrides="naiveTheme">
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
      <label class="settings-label">语言管理</label>
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:6px">
        <span v-for="lang in langs" :key="lang" class="settings-lang-badge">{{ lang }}</span>
      </div>
      <div style="display:flex;gap:6px">
        <input class="input-sm" placeholder="如 fr" style="width:80px;font-family:var(--font-mono)" v-model="newLang" @keydown.enter="doAddLang" />
        <button class="btn btn-sm btn-success" @click="doAddLang">＋ 添加语言</button>
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
          <button v-if="st.id !== 'i18n'" class="btn-icon" style="color:var(--accent)" @click="doDeleteStruct(st.id)">✕</button>
        </div>
        <div class="settings-struct-fields">
          <span v-if="st.match.type === 'struct'" class="settings-lang-badge" style="opacity:0.7">{{ st.match.marker }} (标记)</span>
          <span v-for="f in displayFields(st)" :key="f" class="settings-lang-badge">
            {{ f }}
            <button class="btn-icon" style="font-size:0.6rem" @click="doRemoveField(st.id, f)">✕</button>
          </span>
          <input class="input-sm" style="width:70px;font-family:var(--font-mono)" :placeholder="'新字段'" v-model="fieldInputs[st.id]" @keydown.enter="doAddField(st.id)" />
          <button class="btn btn-sm btn-success" @click="doAddField(st.id)">＋</button>
        </div>
      </div>
      <div style="margin-top:8px"><button class="btn btn-sm" @click="newStruct">＋ 新建结构类型</button></div>
    </div>

    <div class="settings-section settings-section-row">
      <AppButton type="success" @click="doExport">📤 导出配置</AppButton>
      <AppButton type="success" @click="doImport">📥 导入配置</AppButton>
      <AppButton type="primary" @click="doReset">重置为默认</AppButton>
      <AppButton type="primary" @click="doLayoutReset">恢复默认布局</AppButton>
    </div>
  </div>
  </n-config-provider>
</template>

<script setup>
import { NConfigProvider } from 'naive-ui'
import { ref, reactive, computed, onMounted } from 'vue'
import { store } from '../../js/logic/logic-storyStore.js'
import { showAlert } from '../../js/ui/ui-modalDialog.js'
import {
  getLanguages, loadStructs, saveStructs, getEffectiveFields, deleteStruct,
  loadEffectiveTemplates, loadTemplateKeys, loadLabels, addStructField,
  removeStructField, syncStruct
} from '../../js/logic/logic-storyTypes.js'

import AppButton from '../base/AppButton.vue'

const themes = {
  dark:   { label: '暗色默认', vars: { '--bg': '#1a1a2e', '--bg-panel': '#16213e', '--bg-input': '#0f3460', '--border': '#2a2a4a', '--text': '#e0e0e0', '--text-dim': '#888', '--accent': '#e94560', '--accent-hover': '#ff6b81', '--success': '#4ecca3', '--warn': '#f0a500' } },
  ocean:  { label: '深海蓝', vars: { '--bg': '#0d1b2a', '--bg-panel': '#1b2838', '--bg-input': '#1b3a4b', '--border': '#2a4a5a', '--text': '#d4e9f7', '--text-dim': '#7a9bb5', '--accent': '#4fc3f7', '--accent-hover': '#81d4fa', '--success': '#66bb6a', '--warn': '#ffa726' } },
  forest: { label: '森林绿', vars: { '--bg': '#1a2e1a', '--bg-panel': '#1e3820', '--bg-input': '#2a4a2e', '--border': '#2a4a30', '--text': '#d4e8d4', '--text-dim': '#7a9a7a', '--accent': '#66bb6a', '--accent-hover': '#81c784', '--success': '#4db6ac', '--warn': '#ffb74d' } },
  light:  { label: '浅色', vars: { '--bg': '#f5f5f5', '--bg-panel': '#ffffff', '--bg-input': '#e8e8e8', '--border': '#d0d0d0', '--text': '#222222', '--text-dim': '#888888', '--accent': '#e53935', '--accent-hover': '#c62828', '--success': '#43a047', '--warn': '#ef6c00' } }
}

function loadSettings() {
  try { return JSON.parse(localStorage.getItem('storyeditor_settings') || '{}') } catch { return {} }
}
const defaults = { theme: 'dark', fontSize: 16, labelColor: 'type' }
const settings = reactive({ ...defaults, ...loadSettings() })
const langs = ref(getLanguages())
const structList = ref(loadStructs())
const newLang = ref('')
const fieldInputs = reactive({})

// Naive UI 主题覆盖：跟随全局 CSS 变量
const naiveTheme = computed(() => ({
  common: {
    primaryColor: 'var(--accent)',
    primaryColorHover: 'var(--accent-hover)',
    primaryColorPressed: 'var(--accent-hover)',
    bodyColor: 'var(--bg)',
    cardColor: 'var(--bg-panel)',
    borderColor: 'var(--border)',
    textColor1: 'var(--text)',
    textColor2: 'var(--text-dim)',
    successColor: 'var(--success)',
    warningColor: 'var(--warn)',
    errorColor: 'var(--accent)'
  },
  Button: {
    color: 'var(--bg-panel)',
    textColor: 'var(--text)',
    border: '1px solid var(--border)',
    colorHover: 'var(--bg-input)',
    colorPrimary: 'var(--accent)',
    colorHoverPrimary: 'var(--accent-hover)',
    textColorPrimary: '#fff',
    colorSuccess: 'var(--success)',
    textColorSuccess: '#fff',
    colorError: 'var(--accent)',
    textColorError: '#fff',
    borderRadius: '6px'
  }
}))

function applyTheme(key) {
  const t = themes[key]
  if (!t) return
  const root = document.documentElement
  for (const [k, v] of Object.entries(t.vars)) root.style.setProperty(k, v)
}
function save() {
  localStorage.setItem('storyeditor_settings', JSON.stringify({ ...settings }))
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
function doAddLang() {
  const lang = newLang.value.trim().toLowerCase()
  if (!lang) return
  addStructField('i18n', lang, store.chapter)
  store._emit()
  langs.value = getLanguages()
  newLang.value = ''
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
  addStructField(sid, f.trim(), store.chapter)
  store._emit()
  structList.value = loadStructs()
  fieldInputs[sid] = ''
}
function doRemoveField(sid, field) {
  removeStructField(sid, field, store.chapter)
  store._emit()
  structList.value = loadStructs()
}
function doDeleteStruct(sid) {
  if (sid === 'i18n') { showAlert('不能删除内置类型'); return }
  deleteStruct(sid, store.chapter)
  store._emit()
  structList.value = loadStructs()
}

function newStruct() {
  import('../../js/ui/ui-settingsPanel.js').then(m => {
    if (m.openNewStructDialog) m.openNewStructDialog()
  })
}

function doExport(...args) {
  const config = {
    meta: { version: 1, exportedAt: new Date().toISOString() },
    editor: { settings: loadSettings(), chapterCols: JSON.parse(localStorage.getItem('storyeditor_chapter_cols') || '["speaker","text"]') },
    custom: {
      templates: loadEffectiveTemplates(),
      deletedTemplates: JSON.parse(localStorage.getItem('storyeditor_deleted_templates') || '[]'),
      templateKeys: loadTemplateKeys(),
      structs: loadStructs(),
      labels: loadLabels()
    }
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
        const set = (k, v) => { localStorage.setItem(k, JSON.stringify(v)); c++ }
        if (d.editor && d.custom) {
          if (d.editor.settings) set('storyeditor_settings', d.editor.settings)
          if (d.editor.chapterCols) set('storyeditor_chapter_cols', d.editor.chapterCols)
          if (d.custom.templates) set('storyeditor_templates', d.custom.templates)
          if (d.custom.deletedTemplates) set('storyeditor_deleted_templates', d.custom.deletedTemplates)
          if (d.custom.templateKeys) set('storyeditor_template_keys', d.custom.templateKeys)
          if (d.custom.structs) set('storyeditor_structs', d.custom.structs)
          if (d.custom.labels) set('storyeditor_labels', d.custom.labels)
        } else {
          for (const [k, v] of Object.entries(d)) { if (k.startsWith('storyeditor_')) set(k, v) }
        }
        showAlert(`导入成功！已恢复 ${c} 项配置。`)
        Object.assign(settings, { ...defaults, ...loadSettings() })
        applyTheme(settings.theme)
        langs.value = getLanguages()
        structList.value = loadStructs()
        store._emit()
      } catch { showAlert('导入失败') }
    }; r.readAsText(f); inp.value = ''
  }; inp.click()
}

function doReset() {
  localStorage.removeItem('storyeditor_settings')
  Object.assign(settings, { ...defaults })
  applyTheme(defaults.theme)
  document.documentElement.style.setProperty('--font-size-base', defaults.fontSize + 'px')
  document.documentElement.dataset.labelColor = defaults.labelColor
  localStorage.setItem('storyeditor_settings', JSON.stringify(defaults))
}

function doLayoutReset() {
  const p = document.getElementById('panel-side')
  if (p) { p.classList.remove('collapsed', 'no-transition'); p.style.width = ''; p.style.flex = ''; delete p.dataset.savedWidth }
  const r = document.getElementById('panel-right')
  if (r) { r.style.width = ''; r.style.flex = '' }
}

// 挂载时应用当前主题
onMounted(() => { applyTheme(settings.theme) })
</script>

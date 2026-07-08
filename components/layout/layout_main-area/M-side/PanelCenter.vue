<template>
  <div class="panel panel-center" id="panel-center">
    <div class="panel-header">
      <span
        class="tab-label"
        :class="{ active: activeTab === 'form' }"
        data-tab="form"
        @click="switchTab('form')"
      >表单</span>
      <span
        class="tab-label"
        :class="{ active: activeTab === 'chapter' }"
        data-tab="chapter"
        @click="switchTab('chapter')"
      >章节</span>
      <span
        class="tab-label"
        :class="{ active: activeTab === 'json' }"
        data-tab="json"
        @click="switchTab('json')"
      >JSON</span>
      <button class="my-btn my-btn-sm" style="margin-left:auto" title="将当前数据保存为模板" @click="saveCurrentAsTemplate">💾 存为模板</button>
    </div>
    <div id="editor-area" class="editor-area">
      <FormEditor :class="{ hidden: activeTab !== 'form' }" />
      <ChapterView v-show="activeTab === 'chapter'" :key="'cv-' + storyStore.dataVersion" />
      <JsonEditor :class="{ hidden: activeTab !== 'json' }" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useStoryStore } from '../../../../stores/storyStore.js'
import ChapterView from './ChapterView.vue'
import JsonEditor from './JsonEditor.vue'
import FormEditor from './FormEditor.vue'
import { saveTemplate } from '../../../../js/logic/logic-storyTypes.js'
import { createDialog } from '../../../base/useDialog.js'

const storyStore = useStoryStore()
const activeTab = ref('form')

const currentPath = computed(() => storyStore.currentPath || [])
const currentValue = computed(() => {
  if (currentPath.value.length === 0) return storyStore.curJson
  return storyStore.getByPath(currentPath.value)
})

function switchTab(tab) {
  activeTab.value = tab
}

async function saveCurrentAsTemplate() {
  const val = currentValue.value
  if (!val || typeof val !== 'object' || Object.keys(val).length === 0) return

  const cleaned = JSON.parse(JSON.stringify(val))
  delete cleaned.id

  const defaultName = currentPath.value.length > 0
    ? currentPath.value[currentPath.value.length - 1] + '_tpl'
    : 'root_tpl'

  const name = await createDialog({
    title: '保存为模板',
    bodyHTML: `
      <div style="margin-bottom:8px">路径「${currentPath.value.join(' → ') || '(root)'}」将保存为模板。输入模板名称：</div>
      <input id="tpl-name-input" class="my-input" value="${defaultName}"
        style="width:100%" placeholder="模板名称" />
    `,
    focusSelector: '#tpl-name-input',
    buttons: [
      { label: '取消', value: null },
      { label: '保存', primary: true, getValue: () => {
        const input = document.querySelector('#tpl-name-input')
        return input ? input.value.trim() : null
      }}
    ]
  })

  if (!name) return
  saveTemplate(name, cleaned)
}
</script>

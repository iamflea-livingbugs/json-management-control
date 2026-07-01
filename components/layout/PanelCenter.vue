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
    </div>
    <div id="editor-area" class="editor-area">
      <!-- 表单 Tab -->
      <FormEditor :class="{ hidden: activeTab !== 'form' }" />
      <!-- 章节 Tab -->
      <div class="editor-tab-panel" :class="{ hidden: activeTab !== 'chapter' }" id="panel-chapter">
        <div class="native-badge">原生</div>
        <div class="chapter-toolbar">
          <button class="btn btn-sm" id="btn-chapter-cols">⚙️ 显示列</button>
          <span class="chapter-count" id="chapter-path-label"></span>
          <span class="chapter-type-badge" id="chapter-type-badge"></span>
          <span class="chapter-count" id="chapter-count-label"></span>
          <select id="chapter-ctx-select" class="input-sm"></select>
          <button class="btn btn-sm btn-success" id="btn-chapter-add">＋ 新增</button>
          <button class="btn btn-sm" id="btn-chapter-add-custom" style="display:none">＋ 自定义</button>
        </div>
        <div id="chapter-list-container"></div>
      </div>
      <!-- JSON Tab -->
      <JsonEditor :class="{ hidden: activeTab !== 'json' }" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { renderChapterView } from '../../js/ui/ui-chapterView.js'
import { store } from '../../js/logic/logic-storyStore.js'
import JsonEditor from './JsonEditor.vue'
import FormEditor from './FormEditor.vue'

const activeTab = ref('form')

function switchTab(tab) {
  activeTab.value = tab
  if (tab === 'chapter') {
    // 章节视图还是原生 JS，需要触发渲染
    renderChapterView(store)
  }
}
</script>

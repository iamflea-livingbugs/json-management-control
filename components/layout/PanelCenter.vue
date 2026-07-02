﻿﻿﻿﻿﻿﻿﻿﻿<template>
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
      <FormEditor :class="{ hidden: activeTab !== 'form' }" />
      <ChapterView v-show="activeTab === 'chapter'" :key="'cv-' + storyStore.dataVersion" />
      <JsonEditor :class="{ hidden: activeTab !== 'json' }" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useStoryStore } from '../../stores/storyStore.js'
import ChapterView from './ChapterView.vue'
import JsonEditor from './JsonEditor.vue'
import FormEditor from './FormEditor.vue'

const storyStore = useStoryStore()
const activeTab = ref('form')

function switchTab(tab) {
  activeTab.value = tab
}
</script>

<template>
  <div>
    <div class="section-title">选项 ({{ node.options.length }})</div>
    <div v-for="(opt, i) in node.options" :key="i" class="option-row">
      <span class="option-index">#{{ i }}</span>
      <div class="option-i18n">
        <div class="i18n-group">
          <input
            v-for="lang in activeLangs"
            :key="lang"
            class="input input-sm opt-text-lang"
            :value="opt.text?.[lang] || ''"
            :placeholder="'选项文本(' + lang + ')'"
            @change="(e) => updateOptionText(i, lang, e.target.value)"
          />
        </div>
        <div style="display:flex;gap:4px;margin-top:4px">
          <input
            class="input input-sm opt-next"
            :value="opt.next || ''"
            placeholder="跳转ID"
            style="width:120px"
            @change="(e) => updateOptionNext(i, e.target.value)"
          />
          <button class="btn btn-sm btn-add-action" @click="addAction(i)">＋ 动作</button>
          <button class="btn-icon btn-del-option" title="删除选项" @click="deleteOption(i)">✕</button>
        </div>
        <!-- 动作列表 -->
        <div v-if="opt.actions?.length" style="margin-top:4px;display:flex;flex-direction:column;gap:2px">
          <ActionEditor
            v-for="(act, j) in opt.actions"
            :key="j"
            :node-id="nodeId"
            :opt-index="i"
            :action-index="j"
            :action="act"
          />
        </div>
      </div>
    </div>
    <button class="btn btn-sm btn-success" @click="addOption">＋ 选项</button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useStoryStore } from '../../stores/storyStore.js'
import { getLanguages } from '../../js/logic/logic-storyTypes.js'
import ActionEditor from './ActionEditor.vue'

const props = defineProps({
  node: { type: Object, required: true }
})

const storyStore = useStoryStore()
const activeLangs = computed(() => getLanguages())
const nodeId = computed(() => props.node?.id || '')

function updateOptionText(optIdx, lang, val) {
  const opt = props.node?.options?.[optIdx]
  if (!opt) return
  if (typeof opt.text !== 'object') opt.text = {}
  opt.text[lang] = val
  storyStore._emit()
}

function updateOptionNext(optIdx, val) {
  storyStore.updateOption(nodeId.value, optIdx, { next: val })
}

function addOption() {
  storyStore.addOption(nodeId.value)
}

function deleteOption(optIdx) {
  storyStore.deleteOption(nodeId.value, optIdx)
}

function addAction(optIdx) {
  storyStore.addAction(nodeId.value, optIdx)
}
</script>

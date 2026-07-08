<template>
  <div class="action-inline">
    <input
      class="my-input my-input-sm opt-action-cmd"
      :value="action.cmd"
      placeholder="命令"
      @change="(e) => updateCmd(e.target.value)"
    />
    <input
      class="my-input my-input-sm opt-action-params"
      :value="paramsStr"
      placeholder="参数"
      @change="(e) => updateParams(e.target.value)"
    />
    <button class="my-btn-icon my-btn-del-action" title="删除动作" @click="deleteAction">✕</button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useStoryStore } from '../../../../stores/storyStore.js'

const props = defineProps({
  nodeId: { type: String, default: '' },
  optIndex: { type: Number, required: true },
  actionIndex: { type: Number, required: true },
  action: { type: Object, required: true }
})

const storyStore = useStoryStore()

const paramsStr = computed(() => JSON.stringify(props.action.params))

function updateCmd(cmd) {
  storyStore.updateActionCmd(props.nodeId, props.optIndex, props.actionIndex, cmd)
}

function updateParams(val) {
  storyStore.updateActionParams(props.nodeId, props.optIndex, props.actionIndex, val)
}

function deleteAction() {
  storyStore.deleteAction(props.nodeId, props.optIndex, props.actionIndex)
}
</script>

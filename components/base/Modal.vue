<template>
  <Teleport to="body">
    <div v-if="visible" class="my-modal-overlay open" @click.self="onClose">
      <div class="my-modal-box" :style="{ width }">
        <div class="my-modal-header">
          <h2 v-if="title">{{ title }}</h2>
          <slot name="header" />
          <button class="my-modal-close" @click="onClose">✕</button>
        </div>
        <div class="my-modal-body">
          <slot />
        </div>
        <div v-if="$slots.footer" class="my-modal-footer">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { watch, onUnmounted } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '' },
  width: { type: String, default: '480px' },
  closable: { type: Boolean, default: true }
})

const emit = defineEmits(['close', 'update:visible'])

function onClose() {
  if (!props.closable) return
  emit('close')
  emit('update:visible', false)
}

// ESC 键关闭
function onKeydown(e) {
  if (e.key === 'Escape' && props.visible) onClose()
}

watch(() => props.visible, (v) => {
  if (v) document.addEventListener('keydown', onKeydown)
  else document.removeEventListener('keydown', onKeydown)
}, { immediate: true })

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
})
</script>

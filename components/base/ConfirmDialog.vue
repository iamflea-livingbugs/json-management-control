<template>
  <Modal :visible="visible" :title="title" width="380px" @close="onCancel" @update:visible="(v) => !v && onCancel()">
    <p style="color:var(--text);line-height:1.6">{{ message }}</p>
    <template #footer>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button class="btn" @click="onCancel">取消</button>
        <button class="btn btn-primary" @click="onConfirm">确定</button>
      </div>
    </template>
  </Modal>
</template>

<script setup>
import Modal from './Modal.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '确认' },
  message: { type: String, default: '' }
})

const emit = defineEmits(['confirm', 'cancel', 'update:visible'])

function onConfirm() {
  emit('confirm')
  emit('update:visible', false)
}

function onCancel() {
  emit('cancel')
  emit('update:visible', false)
}
</script>

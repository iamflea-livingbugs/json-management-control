// ==========================================
// useCreateDialog.js — Vue 新建弹窗 & 模板选择器
// API 与原生 ui-createDialog.js 兼容
// ==========================================
import { createApp, h, ref } from 'vue'
import Modal from '../base/Modal.vue'
import TemplatePicker from './TemplatePicker.vue'

/**
 * 打开新建选择弹窗（回调式 API）
 */
export function showCreateDialog(options) {
  const {
    title = '新建',
    blankLabel = '空白 JSON',
    blankDesc = '最简结构，无多余字段',
    templateLabel = '模板创建',
    templateDesc = '使用当前配置的模板结构',
    onBlank,
    onTemplate,
    onCancel
  } = options

  const visible = ref(true)

  const app = createApp({
    render() {
      return h(Modal, {
        visible: visible.value,
        title,
        width: '480px',
        'onUpdate:visible': () => close()
      }, {
        default: () => h('div', { class: 'create-choices' }, [
          h('div', {
            class: 'create-choice-card',
            onClick: () => { close(); if (onBlank) onBlank() }
          }, [
            h('div', { class: 'create-choice-icon' }, '📄'),
            h('div', { class: 'create-choice-label' }, blankLabel),
            h('div', { class: 'create-choice-desc' }, blankDesc)
          ]),
          h('div', {
            class: 'create-choice-card',
            onClick: () => { close(); if (onTemplate) onTemplate() }
          }, [
            h('div', { class: 'create-choice-icon' }, '📋'),
            h('div', { class: 'create-choice-label' }, templateLabel),
            h('div', { class: 'create-choice-desc' }, templateDesc)
          ])
        ]),
        footer: () => h('div', { style: 'display:flex;gap:8px;justify-content:flex-end' },
          h('button', { class: 'my-btn my-btn-sm', onClick: () => { close(); if (onCancel) onCancel() } }, '取消')
        )
      })
    }
  })

  const container = document.createElement('div')
  document.body.appendChild(container)
  app.mount(container)

  function close() {
    if (!visible.value) return
    visible.value = false
    setTimeout(() => {
      app.unmount()
      if (container.parentNode) container.parentNode.removeChild(container)
    }, 200)
  }
}

/**
 * 显示模板树形选择弹窗（Promise API）
 */
export function showTemplatePicker() {
  return new Promise((resolve) => {
    const visible = ref(true)
    let resolved = false

    const app = createApp({
      render() {
        return h(TemplatePicker, {
          visible: visible.value,
          'onSelect': (key) => {
            if (resolved) return
            resolved = true
            visible.value = false
            setTimeout(() => {
              resolve(key)
              app.unmount()
              if (container.parentNode) container.parentNode.removeChild(container)
            }, 200)
          },
          'onUpdate:visible': (v) => {
            if (!v && !resolved) {
              resolved = true
              setTimeout(() => {
                resolve(null)
                app.unmount()
                if (container.parentNode) container.parentNode.removeChild(container)
              }, 200)
            }
          }
        })
      }
    })

    const container = document.createElement('div')
    document.body.appendChild(container)
    app.mount(container)
  })
}

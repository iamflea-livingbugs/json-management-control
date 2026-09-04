// ==========================================
// useSplitters.js — 面板分隔条拖拽（Vue composable）
// 原 js/ui/ui-init.js 的 initSplitters 迁移而来
// 供 App.vue onMounted 调用，绑定 .splitter 拖拽调整侧栏/预览宽度
// ==========================================
import { onMounted, onBeforeUnmount } from 'vue'

const $ = (sel) => document.querySelector(sel)
const $$ = (sel) => document.querySelectorAll(sel)

export function useSplitters() {
  let splitterEls = []
  let cleanupFns = []

  function initSplitters() {
    cleanupFns.forEach(fn => fn())
    cleanupFns = []
    splitterEls = Array.from($$('.splitter'))
    splitterEls.forEach(splitter => {
      let dragging = false, startX = 0, startW = 0, sign = 1, targetPanel = null

      const onMouseDown = (e) => {
        dragging = true; startX = e.clientX
        targetPanel = splitter.dataset.target === 'side' ? $('#panel-side') : $('#panel-right')
        sign = splitter.dataset.target === 'side' ? 1 : -1
        if (targetPanel) startW = targetPanel.getBoundingClientRect().width
        splitter.classList.add('dragging')
        document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'
        if (targetPanel) targetPanel.classList.add('no-transition')
        e.preventDefault()
      }
      const onMouseMove = (e) => {
        if (!dragging || !targetPanel) return
        const delta = (e.clientX - startX) * sign
        targetPanel.style.width = Math.max(180, startW + delta) + 'px'
        targetPanel.style.flex = 'none'
      }
      const onMouseUp = () => {
        if (!dragging) return
        dragging = false; splitter.classList.remove('dragging')
        document.body.style.cursor = ''; document.body.style.userSelect = ''
        if (targetPanel) targetPanel.classList.remove('no-transition')
        targetPanel = null
      }

      splitter.addEventListener('mousedown', onMouseDown)
      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
      cleanupFns.push(() => {
        splitter.removeEventListener('mousedown', onMouseDown)
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
      })
    })
  }

  onMounted(initSplitters)
  onBeforeUnmount(() => cleanupFns.forEach(fn => fn()))
}

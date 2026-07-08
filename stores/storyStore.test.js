// ==========================================
// stores/storyStore.test.js — Pinia 桥接层测试
// 验证 Pinia 与原生 StoryStore 之间的数据隔离
// ==========================================
import { describe, test, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useStoryStore } from './storyStore.js'
import { StoryStore } from '../js/logic/logic-storyStore.js'

/**
 * 这个文件教你写 Pinia store 的单元测试。
 *
 * 核心概念：
 * - setActivePinia(createPinia()) 创建一个"假的" Pinia 环境
 * - useStoryStore() 返回的就是 Vue 组件里用的一模一样的 store
 * - 不需要挂载 Vue 组件，测试纯数据行为
 */


describe('storyStore Pinia 桥接层', () => {
  /** 真实的原生 StoryStore 实例 */
  let nativeStore

  beforeEach(() => {
    // 1. 创建独立 Pinia 环境（每个测试之间隔离）
    setActivePinia(createPinia())

    // 2. 拿到原生 StoryStore（Pinia 包装的就是它）
    nativeStore = new StoryStore()
    nativeStore.curJson = {
      meta: { name: '测试章节' },
      content: [
        { id: '0', speaker: { zh: '角色A' }, text: { zh: '你好' } },
        { id: '1', speaker: { zh: '角色B' }, text: { zh: '世界' } }
      ]
    }
  })

  test('sync() 深拷贝后，Pinia 和原生 store 的嵌套对象不是同一引用', () => {
    // Pinia 的 newCurJson 会触发 onChange → sync() → 深拷贝
    const store = useStoryStore()
    store.newCurJson(nativeStore.curJson)

    // Pinia 的 getByPath 现在读的是深拷贝副本
    const piniaNode = store.getByPath(['content', '0'])
    const nativeNode = nativeStore.getByPath(['content', '0'])

    // 不是同一引用 => 组件修改 Pinia 拿到的数据不会污染原生 store
    expect(piniaNode).not.toBe(nativeNode)
    expect(piniaNode.speaker).not.toBe(nativeNode.speaker)
  })

  test('修改 Pinia 的数据不污染原生 store', () => {
    const store = useStoryStore()
    store.newCurJson(nativeStore.curJson)

    // 组件通过 Pinia 拿到数据，随意修改
    const node = store.getByPath(['content', '0'])
    node.speaker.zh = '被我改了'

    // 原生 store 不受影响
    expect(nativeStore.curJson.content[0].speaker.zh).toBe('角色A')
  })

  test('原生 store 变更后，Pinia 的旧引用失效', () => {
    const store = useStoryStore()
    store.newCurJson(nativeStore.curJson)

    // 第一次获取
    const firstNode = store.getByPath(['content', '0'])

    // 原生 store 发生变更
    nativeStore.curJson.content[0].speaker.zh = '换台词了'

    // 手动触发同步（模拟原生操作后的 _emit）
    // 在真实的流程中，原生 store 的操作会通过 _emit() → onChange → sync() 自动完成
    store.loadCurJson(nativeStore.curJson)

    // 第二次获取
    const secondNode = store.getByPath(['content', '0'])

    // 旧引用和新引用不同（深拷贝导致的）
    expect(firstNode).not.toBe(secondNode)
    // 新数据是最新的
    expect(secondNode.speaker.zh).toBe('换台词了')
  })
})

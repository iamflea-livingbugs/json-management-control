import { describe, test, expect, beforeEach } from 'vitest'
import { StoryStore } from './logic-storyStore.js'

describe('StoryStore.duplicateEntry', () => {
  let store

  beforeEach(() => {
    store = new StoryStore()
    // 初始化测试数据
    store.curJson = {
      meta: { name: 'test' },
      content: [
        { id: '0', speaker: { zh: '角色A' }, text: { zh: '你好' } },
        { id: '1', speaker: { zh: '角色B' }, text: { zh: '再见' } },
      ],
    }
    store.currentPath = []
  })

  // ===== 数组模式 =====

  test('数组模式：复制元素到其后', () => {
    store.duplicateEntry(['content', '0'])

    const arr = store.curJson.content
    expect(arr).toHaveLength(3)
    // 复制的元素应该在索引 0 之后（即索引 1）
    expect(arr[1].speaker.zh).toBe('角色A')
    expect(arr[1].text.zh).toBe('你好')
  })

  test('数组模式：复制后生成新 id', () => {
    store.duplicateEntry(['content', '0'])

    const arr = store.curJson.content
    // 原 id 保持不变
    expect(arr[0].id).toBe('0')
    // 新元素的 id 不能与原 id 相同
    expect(arr[1].id).not.toBe('0')
    expect(arr[1].id).toBeTruthy()
  })

  test('数组模式：复制的元素是深拷贝（修改副本不影响原值）', () => {
    store.duplicateEntry(['content', '0'])

    const arr = store.curJson.content
    // 修改副本
    arr[1].speaker.zh = '修改后'
    // 原值不受影响
    expect(arr[0].speaker.zh).toBe('角色A')
  })

  // ===== 对象模式 =====

  test('对象模式：复制属性，生成新键名', () => {
    store.curJson.meta.customField = 'test-value'
    store.duplicateEntry(['meta', 'customField'])

    const meta = store.curJson.meta
    // 应该有新属性
    expect(meta.customField_copy).toBe('test-value')
    // 原属性保留
    expect(meta.customField).toBe('test-value')
  })

  test('对象模式：连续复制时键名递增', () => {
    store.curJson.meta.customField = 'test-value'
    store.duplicateEntry(['meta', 'customField'])
    // 第二次复制同样的源键名
    store.duplicateEntry(['meta', 'customField'])

    const meta = store.curJson.meta
    expect(meta.customField_copy).toBe('test-value')
    expect(meta.customField_copy_1).toBe('test-value')
  })

  // ===== 边界情况 =====

  test('空路径不报错', () => {
    expect(() => store.duplicateEntry([])).not.toThrow()
  })

  test('不存在的路径不报错', () => {
    expect(() => store.duplicateEntry(['nonexistent'])).not.toThrow()
  })

  test('不存在的键不报错', () => {
    expect(() => store.duplicateEntry(['meta', 'nonexistentKey'])).not.toThrow()
  })
})

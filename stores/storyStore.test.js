// ==========================================
// stores/storyStore.test.js — Pinia 唯一数据源单元测试
// 覆盖：路径导航、数据写入、CRUD、导出、变更通知
// ==========================================
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useStoryStore } from './storyStore.js'

// 每个测试前重置 Pinia 实例与 localStorage，保证隔离
beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('getByPath / setByPath', () => {
  it('空路径返回根对象', () => {
    const store = useStoryStore()
    expect(store.getByPath([])).toBe(store.curJson)
    expect(store.getByPath()).toBe(store.curJson)
  })

  it('空路径写入直接替换根对象（不触发规范化补全）', () => {
    const store = useStoryStore()
    const bare = { name: '仅此一个字段' }
    store.setByPath([], bare)
    // 不应自动补回 meta / content
    expect(store.curJson).toEqual(bare)
    expect(store.curJson.meta).toBeUndefined()
    expect(store.curJson.content).toBeUndefined()
  })

  it('回归：JSON 编辑器在根节点（空路径）失焦写入不应被丢弃', () => {
    const store = useStoryStore()
    store.loadCurJson({ meta: { name: '初始' }, content: [] })
    // 模拟 JsonEditor.onBlur：编辑整个 JSON 后 currentPath 为空数组
    expect(store.currentPath).toEqual([])
    const edited = { meta: { name: '根节点编辑后' }, content: [{ id: '9', speaker: '主角' }] }
    const path = store.currentPath
    // 修复前逻辑等价于：if (path && path.length > 0) —— 空路径会静默丢弃
    store.setByPath([...(path || [])], edited)
    expect(store.curJson.meta.name).toBe('根节点编辑后')
    expect(store.curJson.content).toHaveLength(1)
  })

  it('按路径写入对象属性', () => {
    const store = useStoryStore()
    store.setByPath(['meta', 'author'], '张三')
    expect(store.curJson.meta.author).toBe('张三')
  })

  it('按路径写入数组元素', () => {
    const store = useStoryStore()
    store.setByPath(['content'], [{ id: '0', text: { zh: '你好' } }])
    store.setByPath(['content', '0', 'speaker'], { zh: '主角' })
    expect(store.curJson.content[0].speaker.zh).toBe('主角')
  })

  it('写入不存在的路径静默失败（不抛错）', () => {
    const store = useStoryStore()
    expect(() => store.setByPath(['nonexistent', 'x'], 1)).not.toThrow()
    expect(store.curJson.nonexistent).toBeUndefined()
  })
})

describe('loadCurJson 规范化', () => {
  it('加载时自动补全 meta 与 content 并规范化节点', () => {
    const store = useStoryStore()
    store.loadCurJson({ meta: { name: '章节' }, content: [{ id: '0', speaker: '直接字符串', text: { zh: '文本' } }] })
    expect(store.curJson.meta.name).toBe('章节')
    expect(store.curJson.content[0].speaker).toEqual({ zh: '直接字符串', en: '' })
    expect(store.curJson.content[0].options).toEqual([])
  })

  it('加载后重置选中状态与路径', () => {
    const store = useStoryStore()
    store.selectPath(['content', '0'])
    store.loadCurJson({ meta: {}, content: [] })
    expect(store.currentPath).toEqual([])
    expect(store.selectedId).toBeNull()
  })
})

describe('节点 CRUD', () => {
  it('addNode 向数组父节点追加模板节点', () => {
    const store = useStoryStore()
    store.addNode('content', ['content'])
    expect(store.curJson.content).toHaveLength(1)
    expect(store.currentPath).toEqual(['content', '0'])
  })

  it('deleteAt 删除数组元素', () => {
    const store = useStoryStore()
    store.setByPath(['content'], [{ id: '0' }, { id: '1' }, { id: '2' }])
    store.deleteAt(['content', '1'])
    expect(store.curJson.content.map(n => n.id)).toEqual(['0', '2'])
  })

  it('deleteAt 删除对象属性', () => {
    const store = useStoryStore()
    store.setByPath(['meta'], { name: 'a', author: 'b' })
    store.deleteAt(['meta', 'author'])
    expect(store.curJson.meta.author).toBeUndefined()
    expect(store.curJson.meta.name).toBe('a')
  })

  it('deleteAt 空路径不操作', () => {
    const store = useStoryStore()
    expect(() => store.deleteAt([])).not.toThrow()
  })

  it('addObjectProperty 向对象添加属性', () => {
    const store = useStoryStore()
    store.addObjectProperty(['meta'], 'custom', 123)
    expect(store.curJson.meta.custom).toBe(123)
  })

  it('addArrayItem 向数组添加模板项', () => {
    const store = useStoryStore()
    store.setByPath(['content'], [{ id: '0' }])
    store.addArrayItem(['content'])
    expect(store.curJson.content).toHaveLength(2)
  })
})

describe('duplicateEntry 复制', () => {
  it('数组元素复制：深拷贝并生成新 id，插入原元素之后', () => {
    const store = useStoryStore()
    store.setByPath(['content'], [{ id: '0', text: { zh: '原文' } }])
    store.duplicateEntry(['content', '0'])
    expect(store.curJson.content).toHaveLength(2)
    expect(store.curJson.content[1].text).toEqual({ zh: '原文' })
    expect(store.curJson.content[1].id).not.toBe('0')
    // 原对象不被引用共享（深拷贝隔离）
    store.curJson.content[1].text.zh = '改后'
    expect(store.curJson.content[0].text.zh).toBe('原文')
  })

  it('对象属性复制：键名自动去重', () => {
    const store = useStoryStore()
    store.setByPath(['meta'], { name: 'a' })
    store.duplicateEntry(['meta', 'name'])
    expect(store.curJson.meta.name_copy).toBe('a')
    // 再次复制应生成 name_copy_1
    store.duplicateEntry(['meta', 'name'])
    expect(store.curJson.meta.name_copy_1).toBe('a')
  })

  it('复制无效路径不操作', () => {
    const store = useStoryStore()
    expect(() => store.duplicateEntry([])).not.toThrow()
    expect(() => store.duplicateEntry(['meta', 'nope'])).not.toThrow()
  })
})

describe('toCleanJSON 导出清洗', () => {
  it('剔除空字符串、null、空 i18n 对象', () => {
    const store = useStoryStore()
    store.setByPath([], {
      meta: { name: '保留', author: '', desc: null },
      content: [{ id: '0', text: { zh: '保留', en: '' } }]
    })
    const clean = store.toCleanJSON()
    expect(clean.meta.author).toBeUndefined()
    expect(clean.meta.desc).toBeUndefined()
    expect(clean.meta.name).toBe('保留')
    expect(clean.content[0].text).toEqual({ zh: '保留' })
    expect(clean.content[0].text.en).toBeUndefined()
  })
})

describe('变更通知 onChange / dataVersion', () => {
  it('写入后 dataVersion 自增并触发监听器', () => {
    const store = useStoryStore()
    const before = store.dataVersion
    let called = 0
    const off = store.onChange(() => { called++ })
    store.setByPath(['meta', 'name'], '新名字')
    expect(store.dataVersion).toBe(before + 1)
    expect(called).toBe(1)
    off()
  })

  it('取消订阅后不再触发', () => {
    const store = useStoryStore()
    let called = 0
    const off = store.onChange(() => { called++ })
    off()
    store.setByPath(['meta', 'name'], 'x')
    expect(called).toBe(0)
  })
})

describe('selectPath 路径导航', () => {
  it('selectPath 设置当前路径并联动 selectedId', () => {
    const store = useStoryStore()
    store.selectPath(['content', '0'])
    expect(store.currentPath).toEqual(['content', '0'])
    expect(store.selectedId).toBe('0')
  })

  it('selectPath 非 content 路径时 selectedId 为空', () => {
    const store = useStoryStore()
    store.selectPath(['meta'])
    expect(store.selectedId).toBeNull()
  })
})

describe('选项与动作', () => {
  it('addOption / updateOption / deleteOption 全链路', () => {
    const store = useStoryStore()
    store.setByPath(['content'], [{ id: '0', options: [] }])
    store.addOption('0')
    expect(store.curJson.content[0].options).toHaveLength(1)
    store.updateOption('0', 0, { next: '1' })
    expect(store.curJson.content[0].options[0].next).toBe('1')
    store.deleteOption('0', 0)
    expect(store.curJson.content[0].options).toHaveLength(0)
  })

  it('addAction / updateActionParams / deleteAction 全链路', () => {
    const store = useStoryStore()
    store.setByPath(['content'], [{ id: '0', options: [{ text: { zh: '' }, actions: [] }] }])
    store.addAction('0', 0)
    expect(store.curJson.content[0].options[0].actions).toHaveLength(1)
    store.updateActionCmd('0', 0, 0, 'play')
    expect(store.curJson.content[0].options[0].actions[0].cmd).toBe('play')
    // 合法 JSON 字符串 → 解析为数组
    store.updateActionParams('0', 0, 0, '["a", 1]')
    expect(store.curJson.content[0].options[0].actions[0].params).toEqual(['a', 1])
    store.deleteAction('0', 0, 0)
    expect(store.curJson.content[0].options[0].actions).toHaveLength(0)
  })
})

describe('编辑器元数据', () => {
  it('setCurJsonName / getCurJsonName', () => {
    const store = useStoryStore()
    store.setCurJsonName('章节A')
    expect(store.getCurJsonName()).toBe('章节A')
  })

  it('空名回退 Untitled', () => {
    const store = useStoryStore()
    store.setCurJsonName('')
    expect(store.getCurJsonName()).toBe('Untitled')
  })
})

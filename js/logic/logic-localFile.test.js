// ==========================================
// js/logic/logic-localFile.test.js — File System Access 本地文件读写单测
// 覆盖：能力检测、句柄状态、打开、写回、另存为（mock FileSystemHandle）
// ==========================================
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  isFileSystemAccessSupported, getCurrentFileHandle, setCurrentFileHandle, clearCurrentFileHandle,
  openLocalJsonFile, saveLocalJsonFile, saveLocalJsonFileAs
} from './logic-localFile.js'

beforeEach(() => {
  clearCurrentFileHandle()
  delete window.showOpenFilePicker
  delete window.showSaveFilePicker
  vi.restoreAllMocks()
})

// 构造一个最小可用 mock 文件句柄
function makeHandle(name = 'test.json') {
  const written = []
  return {
    name,
    written,
    async getFile() { return { name, text: async () => JSON.stringify({ meta: { name: '示例' }, content: [] }) } },
    async queryPermission() { return 'granted' },
    async createWritable() {
      return {
        write: async (data) => { written.push(data) },
        close: async () => {}
      }
    }
  }
}

describe('isFileSystemAccessSupported / 句柄状态', () => {
  it('happy-dom 默认不支持 FSA', () => {
    expect(isFileSystemAccessSupported()).toBe(false)
  })

  it('句柄可设置 / 读取 / 清除', () => {
    const h = makeHandle()
    expect(getCurrentFileHandle()).toBeNull()
    setCurrentFileHandle(h)
    expect(getCurrentFileHandle()).toBe(h)
    clearCurrentFileHandle()
    expect(getCurrentFileHandle()).toBeNull()
  })
})

describe('openLocalJsonFile', () => {
  it('浏览器不支持时抛出明确错误', async () => {
    await expect(openLocalJsonFile()).rejects.toThrow('不支持 File System Access API')
  })

  it('打开成功：解析 JSON、记住句柄、返回文件名', async () => {
    const h = makeHandle('chapter.json')
    window.showOpenFilePicker = vi.fn().mockResolvedValue([h])
    const res = await openLocalJsonFile()
    expect(res.name).toBe('chapter.json')
    expect(res.json.meta.name).toBe('示例')
    expect(getCurrentFileHandle()).toBe(h)
  })

  it('打开非 JSON 内容时抛出解析错误', async () => {
    const h = { name: 'bad.json', getFile: async () => ({ name: 'bad.json', text: async () => '{ 非法' }) }
    window.showOpenFilePicker = vi.fn().mockResolvedValue([h])
    await expect(openLocalJsonFile()).rejects.toThrow('JSON 格式解析失败')
  })
})

describe('saveLocalJsonFile', () => {
  it('写回文件：JSON 缩进格式化写入句柄', async () => {
    const h = makeHandle()
    const ok = await saveLocalJsonFile(h, { meta: { name: 'x' } })
    expect(ok).toBe(true)
    expect(h.written.length).toBe(1)
    expect(h.written[0]).toBe('{\n    "meta": {\n        "name": "x"\n    }\n}')
  })

  it('句柄为空时抛出错误', async () => {
    await expect(saveLocalJsonFile(null, {})).rejects.toThrow('无关联的本地文件')
  })
})

describe('saveLocalJsonFileAs', () => {
  it('另存为成功后记住新句柄', async () => {
    const h = makeHandle('saved.json')
    // 能力检测依赖 showOpenFilePicker，需一并 mock
    window.showOpenFilePicker = vi.fn()
    window.showSaveFilePicker = vi.fn().mockResolvedValue(h)
    await saveLocalJsonFileAs({ a: 1 }, 'saved.json')
    expect(getCurrentFileHandle()).toBe(h)
    expect(h.written.length).toBe(1)
  })

  it('浏览器不支持时抛出明确错误', async () => {
    await expect(saveLocalJsonFileAs({}, 'x.json')).rejects.toThrow('不支持 File System Access API')
  })
})

# StoryEditor 项目交接文档

## 基本信息
- **项目位置**：`E:\_MyGame\_MyGame Construct\_Constcut 《幻梦奇境》\StoryEditor`
- **项目类型**：剧情对话 JSON 编辑器（纯前端，无依赖）
- **许可协议**：Mulan PSL v2

## 启动方式
```bash
cd "E:\_MyGame\_MyGame Construct_Constcut 《幻梦奇境》\StoryEditor"
python -m http.server 8080
```
访问 `http://localhost:8080/`

---

## 项目结构

```
StoryEditor/
├── index.html            ← HTML 入口（加载 js/main.js）
├── layout.html           ← 页面布局（HTML 独立文件，与 JS 分离）
├── css/style.css         ← 全部样式（暗色主题，flex 布局）
├── js/
│   ├── main.js           ← 入口（只引用 barrel.js）
│   ├── barrel.js          ← 统一导出中枢（barrel 导出模式）
│   ├── base/
│   │   └── storyTypes.js ← 底层：数据模型、JSON 配置加载、模板系统
│   ├── data/
│   │   ├── storyStore.js ← 数据 CRUD、路径操作、导出清洗
│   │   ├── storyIO.js    ← 文件导入/导出、拖放、文件选择
│   │   └── dragDrop.js   ← 列表拖拽排序
│   └── ui/
│       ├── storyUI.js    ← 界面渲染：工具栏、编辑器、配置弹窗
│       ├── storyTree.js  ← 左侧树形结构渲染
│       └── storyTemplateUI.js ← 模板编辑弹窗
├── config/               ← JSON 配置文件（可被编辑器自身编辑）
│   ├── template-content.json   ← 空白章节/节点/选项结构 + 各上下文默认模板
│   └── template-contexts.json  ← 模板编辑器上下文按钮、显示名称、匹配规则
├── fonts/                ← 字体文件（仓耳与墨 + FiraCode）
├── lib/
│   └── highlight.min.js  ← JSON 语法高亮
├── LICENSE               ← Mulan PSL v2
├── README.md
└── PROJECT_HANDOVER.md
```

### 命名规范（一看就知道依赖关系）

| 文件/目录 | 含义 |
|:---------:|------|
| `main.js` | 入口，浏览器直接加载 |
| `barrel.js` | 中枢（barrel 导出），统一引用所有模块 |
| `base/` | 底层基础，谁都不依赖 |
| `data/` | 数据层，依赖 base/ |
| `ui/` | 界面层，依赖 base/ + data/ |

---

## 核心概念

### 1. 数据结构
章节 JSON 格式：
```json
{
  "meta": { "name": "章节名", "customField": "" },
  "content": [
    {
      "id": "0",
      "speaker": { "zh": "角色名", "en": "" },
      "text": { "zh": "对话文本", "en": "English" },
      "headimage": "",
      "room": "",
      "bgm": "",
      "next": "",
      "voice": "",
      "options": [
        {
          "text": { "zh": "选项", "en": "" },
          "next": "1",
          "showif": {},
          "actions": []
        }
      ]
    }
  ]
}
```

### 2. 模板系统

模板编辑器（📋 编辑模板）中可修改四个上下文模板：

| 上下文 | 用途 | 匹配路径 |
|:------:|:----:|:--------:|
| meta | 章节元数据 | `meta` |
| content | 对话节点 | `content` |
| option | 选项 | `content.*.options` |
| action | 动作命令 | `*.actions` |
| default | 兜底 | `*` |

模板上下文的名称、匹配规则由 `config/template-contexts.json` 定义，可自由增删。

默认模板字段由 `config/template-content.json` 的 `templates` 部分定义。

### 3. 三栏布局
- **左栏**：树形导航 + 路径搜索
- **中栏**：选中节点的表单编辑 / JSON 镜像编辑（Tab 切换）
- **右栏**：完整 JSON 高亮预览 + 实时错误校验

### 4. 配置系统（JSON 驱动）

符合"操作 JSON 的工具，用 JSON 配置自身"的设计理念：

| 配置文件 | 怎么修改 |
|:--------:|:--------:|
| `config/template-content.json` | 工具栏「📄 内容配置」或直接编辑文件 |
| `config/template-contexts.json` | 工具栏「📄 上下文配置」或右上角「⚙️ 配置」|

修改后点「💾 保存配置」→ 存 localStorage + 下载文件 → 替换原文件即可固化。

---

## 字体配置（已添加）

```css
@font-face {
    font-family: '仓耳与墨W04';
    src: url('../fonts/仓耳与墨W04.ttf') format('truetype');
}
@font-face {
    font-family: 'FiraCode';
    src: url('../fonts/FiraCode-Regular.woff2') format('woff2');
}
:root {
    --font-family: '仓耳与墨W04', 'Segoe UI', 'Microsoft YaHei', sans-serif;
    --font-mono: 'FiraCode', 'Consolas', 'Courier New', monospace;
    --font-size-base: 16px;
}
```

---

## 重要改动记录

### v0.01 — 文件结构整改 + 基本 debug
- [x] 目录结构重构：扁平 `js/` → 三层 `base/` / `data/` / `ui/`
- [x] barrel 导出模式：新增 `barrel.js` 统一导出
- [x] HTML 分离：布局从 JS 模板字符串移出到 `layout.html`
- [x] 配置系统：模板上下文从硬编码改为 `config/` 下的 JSON 配置
- [x] 配置文件：新增 `template-content.json`、`template-contexts.json`
- [x] 工具栏：新增「📄 内容配置」「📄 上下文配置」「💾 保存配置」按钮
- [x] JSON 错误提示：编辑器底部实时显示 JSON 解析错误
- [x] 模板添加字段：支持选择类型（字符串/数字/数组/对象）
- [x] 格式化 bug 修复：格式化后保存回 store，不丢失
- [x] 入口命名规范：`main.js` → `barrel.js`，删除 `app.js`、`index.js`
- [x] 项目文档更新：README.md、PROJECT_HANDOVER.md

### 此前已完成的
- [x] root 节点点击无显示修复
- [x] meta 模板可编辑
- [x] 字体配置（FiraCode + 仓耳与墨）
- [x] 基础字号 16px
- [x] 控件继承字体

---

## Git 状态
```bash
git status
# Untracked: fonts/
# Modified: 无（所有改动已提交）
```

---

## 常用操作

| 操作 | 方式 |
|:----:|:----:|
| 导入 JSON | 工具栏「📥 导入 JSON」或拖拽文件到窗口 |
| 导出 JSON | 工具栏「📤 导出 JSON」|
| 新建空白 JSON | 工具栏「＋ 新建 JSON」|
| 编辑模板 | 工具栏「📋 编辑模板」|
| 编辑配置 | 工具栏「📄 内容配置/上下文配置」或右上角「⚙️ 配置」|
| 保存配置 | 编辑配置后点「💾 保存配置」|
| 编辑节点 | 左侧树形导航选中节点，中间表单编辑 |
| 编辑标签名 | 双击字段标签，输入后回车 |
| 格式化 JSON | 右侧面板「格式化」按钮 |

---

## 依赖层级

```
base/    ← 纯函数，0 依赖
data/    ← 依赖 base/ + ui/
ui/      ← 依赖 base/ + data/
barrel.js ← 统一导出 base/ + data/ + ui/
main.js  ← 只引用 barrel.js
```

---

## 待优化项
1. 提交 fonts/ 目录到 git（或用 .gitignore）
2. 添加撤销/重做功能
3. 添加拖拽排序支持
4. 添加快捷键支持（如 Ctrl+S 保存）

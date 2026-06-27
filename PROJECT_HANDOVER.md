# StoryEditor 项目交接文档

## 基本信息
- **项目位置**：`D:\_Program\MyOpenSource\json-management-control`
- **项目类型**：剧情对话 JSON 编辑器
- **许可协议**：Mulan PSL v2

## 启动方式
```bash
cd "D:\_Program\MyOpenSource\json-management-control"
npx vite          # 开发服务器，默认 http://localhost:5173
```
需要 Node.js 18+。Vite 自动处理热更新（HMR），修改代码后页面自动刷新。

---

## 项目结构

```
StoryEditor/
├── index.html              ← HTML 入口
├── layout.html             ← 页面布局（HTML 独立文件，与 JS 分离）
├── vite.config.js          ← Vite 配置
├── package.json
├── css/
│   └── style.css           ← 全部样式（CSS 变量主题系统，~1500行）
├── components/             ← Vue 组件（渐进式迁移）
│   ├── base/
│   │   └── AppButton.vue   ← 通用按钮组件（基于 Naive UI NButton）
│   ├── Settings/
│   │   └── SettingsPanel.vue ← 设置面板（已完成 Vue 迁移）
│   └── layout/             ← 页面布局片段（.html 待转 Vue，.vue 已迁移）
│       ├── ActivityBar.vue ← 活动栏（已完成 Vue 迁移）
│       ├── toolbar.html
│       ├── panel-right.html
│       ├── splitters.html
│       ├── side-panel/
│       │   ├── side-panel.html
│       │   ├── outline-view.html
│       │   ├── stats-view.html
│       │   └── settings-view.html
│       └── panel-center/
│           ├── panel-center.html
│           ├── form-editor.html
│           ├── chapter-view.html
│           └── json-editor.html
├── js/
│   ├── main.js             ← 入口：启动加载 + 拖放绑定
│   ├── barrel.js           ← 统一导出中枢
│   ├── logic/              ← 纯数据层（不依赖 UI）
│   │   ├── logic-storyTypes.js   ← 数据模型、模板读写、结构类型系统
│   │   ├── logic-storyStore.js   ← 数据管理：CRUD、路径导航、导出
│   │   └── logic-storyIO.js      ← 文件导入/导出、拖放绑定
│   └── ui/                 ← 视图层（依赖 logic/）
│       ├── ui-init.js            ← 主界面初始化、树形搜索、事件绑定
│       ├── ui-storyTree.js       ← 树形导航面板
│       ├── ui-editorForm.js      ← 表单编辑器（中栏表单模式）
│       ├── ui-chapterView.js     ← 章节列表视图（数组行内编辑）
│       ├── ui-createDialog.js    ← 新建节点/章节弹窗
│       ├── ui-storyTemplateUI.js ← 模板编辑弹窗
│       ├── ui-labelManager.js    ← 字段标签管理弹窗
│       ├── ui-settingsPanel.js   ← 设置面板（原生层，待废弃）
│       └── ui-modalDialog.js     ← 通用模态组件（弹窗、确认、提示）
├── config/
│   ├── template-content.json     ← 空白章节/节点/选项结构 + 默认模板
│   └── template-contexts.json    ← 模板上下文配置
├── fonts/                       ← 字体文件（仓耳与墨 W04 + FiraCode）
├── lib/
│   └── highlight.min.js          ← JSON 语法高亮
└── LICENSE                       ← Mulan PSL v2
```

### 架构概览

页面初始化链路：
```
index.html
  └─ <script type="module" src="js/main.js">
       └─ main.js → barrel.js → ui/initUI()
            ├─ fetch('layout.html') → 填充 DOM 骨架
            ├─ 绑定原生事件（工具栏、树形导航、拖拽分栏）
            └─ 挂载 Vue 组件：
                 ├─ ActivityBar.vue → mount('#activity-bar')
                 └─ SettingsPanel.vue → mount('#view-settings .side-view-content')

数据流（原生 ↔ Vue 通信）：
  原生 JS → store._emit() → 监听器重新渲染所有面板
  Vue 组件 ↔ 原生 JS：通过 CustomEvent（如 activity-change）通信
```

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

| 上下文 | 用途 | 匹配路径 |
|:------:|:----:|:--------:|
| meta | 章节元数据 | `meta` |
| content | 对话节点 | `content` |
| option | 选项 | `content.*.options` |
| action | 动作命令 | `*.actions` |
| default | 兜底 | `*` |

### 3. 三栏布局
- **左栏**：树形导航 + 路径搜索
- **中栏**：选中节点的表单编辑 / JSON 镜像编辑（Tab 切换）
- **右栏**：完整 JSON 高亮预览 + 实时错误校验

### 4. Vue 渐进式迁移策略

当前状态：原生 JS + Vue 3 混用。Vue 组件通过 `createApp().mount('#selector')` 挂载到特定 DOM 节点。

迁移步骤：
1. 从 `components/layout/` 中的 .html 片段开始，逐个转成 .vue 文件
2. 用 Vue 的 `v-for` / `v-model` / `@click` 替换 `addEventListener` 和 `innerHTML`
3. Vue 组件通过 `CustomEvent` 与原生 JS 通信（详见 ActivityBar.vue 示例）
4. 最终目标：一个 `App.vue` 统领整个页面，废弃 layout.html

---

## 技术栈

| 技术 | 用途 |
|------|------|
| Vite 8 | 开发服务器 + 构建 |
| Vue 3.5 (Composition API) | UI 层渐进式迁移 |
| Naive UI | 基础组件库（按钮、后续更多） |
| Bootstrap 5 Grid | 响应式网格布局 |
| SCSS | CSS 预处理器 |
| Highlight.js | JSON 语法高亮 |
| CSS 变量 | 四套主题色系统 |

## 依赖包

| 包名 | 用途 |
|------|------|
| `vue` | Vue 3 运行时 |
| `naive-ui` | UI 组件库 |
| `bootstrap` | 仅使用 CSS 网格部分 |
| `sass` | SCSS 编译 |

---

## 重要改动记录

### v0.03 — Vue 渐进式迁移 + 构建工具升级
- [x] 构建工具从 `python -m http.server` 迁移到 Vite 8（HMR、模块热更新）
- [x] 引入 Vue 3.5（Composition API + `<script setup>`）
- [x] 引入 Naive UI 组件库（按钮组件 + themeOverrides + CSS 变量联动）
- [x] 引入 SCSS 支持（`npm install sass`）
- [x] 引入 Bootstrap 5 Grid（纯网格模式，不包含 UI 样式）
- [x] 首个 Vue 组件：`SettingsPanel.vue`（设置面板，替换原生 ui-settingsPanel.js）
- [x] 通用按钮组件：`AppButton.vue`（基于 Naive UI NButton，支持 type/size/disabled）
- [x] 活动栏 Vue 化：`ActivityBar.vue`（通过 CustomEvent 与原生 JS 通信）
- [x] layout 结构拆分：`components/layout/` 下 12 个 HTML 片段（待逐步转 Vue）
- [x] bug 修复：JSON 预览 `.json-highlight` 背景写死，改为 `var(--bg)`
- [x] bug 修复：`.btn:disabled` 样式缺失，补充禁用态 CSS
- [x] 文档更新：项目结构、技术栈、启动方式、Vue 迁移策略

### v0.02 — 结构类型同步 + 布局优化
- [x] 结构类型增删改自动同步到当前章节数据
- [x] 侧面板折叠/展开动画（0.3s transition）
- [x] splitter 拖拽时禁用过渡
- [x] 折叠时保存面板宽度（dataset.savedWidth），展开时恢复
- [x] 设置面板新增"恢复默认布局"按钮

### v0.01 — 文件结构整改
- [x] 目录重构：扁平 → 三层 `logic/` / `ui/`
- [x] barrel 导出模式
- [x] HTML 分离到 `layout.html`
- [x] 配置系统 JSON 驱动

---

## 常用操作

| 操作 | 方式 |
|:----:|:----:|
| 启动开发 | `npx vite` → http://localhost:5173 |
| 导入 JSON | 工具栏「📥 导入 JSON」或拖拽文件到窗口 |
| 导出 JSON | 工具栏「📤 导出 JSON」|
| 新建空白 JSON | 工具栏「＋ 新建 JSON」|
| 编辑模板 | 工具栏「📋 编辑模板」|
| 编辑节点 | 左侧树形导航选中节点，中间表单编辑 |
| 格式化 JSON | 右侧面板「格式化」按钮 |

---

## 依赖层级

```
logic/          ← 纯函数，0 依赖
ui/             ← 依赖 logic/
components/     ← Vue 组件，依赖 logic/ + Naive UI
ui-init.js      ← 桥梁：挂载 Vue 组件 + 绑定原生事件
```

---

## 未来待实现的功能

### 🔴 高优先级

- **撤销 / 重做（Undo/Redo）** — 操作历史栈，支持 Ctrl+Z / Ctrl+Shift+Z
- **自动保存（Auto-save）** — 定时将当前章节数据持久化到 localStorage
- **布局组件 Vue 化** — 继续将 layout/ 下的 .html 转成 .vue

### 🟡 中优先级

- **键盘快捷键** — Ctrl+S 导出、Ctrl+F 搜索等
- **数据校验** — 检查 next 引用的节点 ID 是否存在
- **多章节管理** — 多标签页同时编辑多个章节文件
- **统计面板** — 侧栏统计视图完善
- **Naive UI 全面集成** — 替换原生弹窗、输入框

### 🟢 低优先级

- **对话流程图** — 可视化展示对话分支流向
- **查找替换** — 跨整个章节批量查找和替换

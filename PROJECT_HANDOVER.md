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
├── index.html              ← HTML 入口（Vue 挂载点）
├── vite.config.js          ← Vite 配置
├── package.json
├── css/
│   └── style.css           ← 全部样式（CSS 变量主题系统）
├── components/             ← Vue 组件
│   ├── App.vue             ← 根组件，渲染整个布局
│   ├── base/               ← 通用基础组件
│   │   ├── AppButton.vue   ← 通用按钮（基于 Naive UI NButton）
│   │   ├── Modal.vue       ← 通用模态框
│   │   ├── ConfirmDialog.vue ← 确认对话框
│   │   ├── useDialog.js    ← 弹窗组合式函数
│   │   └── useCreateDialog.js ← 新建节点弹窗组合式函数
│   ├── Settings/
│   │   └── SettingsPanel.vue ← 设置面板
│   └── layout/             ← 页面布局组件
│       ├── ActivityBar.vue ← 活动栏
│       ├── PanelRight.vue  ← 右侧 JSON 预览面板
│       ├── TreeNode.vue    ← 树节点组件
│       ├── OutlineView.vue ← 大纲视图（左侧树形面板）
│       ├── PanelCenter.vue ← 中间编辑区容器
│       ├── JsonEditor.vue  ← JSON 源码编辑器
│       ├── FormEditor.vue  ← 表单编辑器
│       ├── FormField.vue   ← 表单字段组件
│       ├── OptionsEditor.vue ← 选项编辑器
│       ├── ActionEditor.vue  ← 动作编辑器
│       ├── activity-bar.html (迁移前的 .html 参考，不再使用)
│       ├── panel-right.html (迁移前的 .html 参考，不再使用)
│       ├── main-area.html  (迁移前的 .html 参考，不再使用)
│       ├── splitters.html  (迁移前的 .html 参考，不再使用)
│       ├── toolbar.html    (迁移前的 .html 参考，不再使用)
│       ├── panel-center/
│       │   ├── panel-center.html (迁移前的 .html 参考，不再使用)
│       │   ├── form-editor.html  (迁移前的 .html 参考，不再使用)
│       │   ├── chapter-view.html (迁移前的 .html 参考，不再使用)
│       │   └── json-editor.html  (迁移前的 .html 参考，不再使用)
│       └── side-panel/
│           ├── side-panel.html    (迁移前的 .html 参考，不再使用)
│           ├── outline-view.html  (迁移前的 .html 参考，不再使用)
│           ├── stats-view.html    (迁移前的 .html 参考，不再使用)
│           └── settings-view.html (迁移前的 .html 参考，不再使用)
├── stores/
│   └── storyStore.js       ← Pinia 状态管理，桥接原生 StoryStore 与 Vue 组件
├── js/
│   ├── main.js             ← 入口：启动加载 + 拖放绑定
│   ├── barrel.js           ← 统一导出中枢
│   ├── logic/              ← 纯数据层（不依赖 UI）
│   │   ├── logic-storyTypes.js   ← 数据模型、模板读写、结构类型系统
│   │   ├── logic-storyStore.js   ← 数据管理：CRUD、路径导航、导出
│   │   └── logic-storyIO.js      ← 文件导入/导出、拖放绑定
│   └── ui/                 ← 视图层（依赖 logic/）
│       ├── ui-init.js            ← 主界面初始化、树形搜索、事件绑定
│       ├── ui-chapterView.js     ← 章节列表视图（数组行内编辑）
│       ├── ui-createDialog.js    ← 新建节点/章节弹窗
│       ├── ui-storyTemplateUI.js ← 模板编辑弹窗
│       ├── ui-labelManager.js    ← 字段标签管理弹窗
│       ├── ui-settingsPanel.js   ← 设置面板（原生，待废弃）
│       └── ui-modalDialog.js     ← 已精简，仅保留 makeModalDraggable
├── config/
│   ├── template-content.json     ← 空白章节/节点/选项结构 + 默认模板
│   └── template-contexts.json    ← 模板上下文配置
├── fonts/                       ← 字体文件（仓耳与墨 W04 + FiraCode）
├── lib/
│   ├── highlight.min.js          ← JSON 语法高亮
│   └── atom-one-dark.min.css     ← 高亮主题样式
└── LICENSE                       ← Mulan PSL v2
```

### 架构概览

当前采用 **Vue 3 + 原生 JS 混合架构**：

- **App.vue** 通过 `createApp(App).mount('#app')` 渲染整个布局，替代了原先的 layout.html
- **Pinia Store**（`stores/storyStore.js`）包装原生 `StoryStore`，通过 `_emit()` 回调机制桥接 Vue 组件与原生层
- **Vue 组件** 通过 Composition API 的 `useStoryStore()` 响应式访问数据
- **原生 JS** 仍直接操作 `logic-storyStore.js` 中的 store 实例，通过 `_emit()` 通知 Pinia 同步

数据流：
```
原生 JS 操作 → StoryStore._emit() → Pinia sync() + 原生监听器
Vue 组件操作 → useStoryStore().xxx() → 委托给原生 StoryStore → 触发同步
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

当前状态：Vue 3 统领布局 + 原生 JS 数据层混合。

**已完成：**
- [x] `App.vue` 统领布局，通过 `createApp(App).mount('#app')` 渲染整个页面
- [x] Pinia Store（`stores/storyStore.js`）桥接 Vue 组件与原生 StoryStore
- [x] 布局组件：`PanelRight.vue`、`OutlineView.vue`、`TreeNode.vue`
- [x] 编辑组件：`PanelCenter.vue`、`JsonEditor.vue`、`FormEditor.vue`、`FormField.vue`、`OptionsEditor.vue`、`ActionEditor.vue`
- [x] 基础组件：`Modal.vue`、`ConfirmDialog.vue`、`useDialog.js`、`useCreateDialog.js`
- [x] 模板标记功能（📋 已应用模板 / 🔧 普通节点）
- [x] 清理废弃文件：`layout.html`、`ui-editorForm.js`、`ui-storyTree.js` 已删除

**剩余待 Vue 化的原生模块：**
- [ ] 章节视图（`ui-chapterView.js`）
- [ ] 标签管理器（`ui-labelManager.js`）
- [ ] 模板编辑器（`ui-storyTemplateUI.js`）

**说明：** `components/layout/` 下保留的 `.html` 片段是迁移前的参考存档，不再使用，后续可安全删除。

---

## 技术栈

| 技术 | 用途 |
|------|------|
| Vite 8 | 开发服务器 + 构建 |
| Vue 3.5 (Composition API) | UI 层渐进式迁移 |
| Pinia 3 | Vue 状态管理（桥接 Vue 组件与原生 StoryStore） |
| Naive UI | 基础组件库（按钮、弹窗等） |
| Bootstrap 5 Grid | 响应式网格布局 |
| SCSS | CSS 预处理器 |
| Highlight.js | JSON 语法高亮 |
| CSS 变量 | 四套主题色系统 |

## 依赖包

| 包名 | 用途 |
|------|------|
| `vue` | Vue 3 运行时 |
| `pinia` | Vue 状态管理 |
| `naive-ui` | UI 组件库 |
| `bootstrap` | 仅使用 CSS 网格部分 |
| `sass` | SCSS 编译 |

---

## 重要改动记录

### v0.04 — Vue 渐进式迁移 + Pinia 桥接
- [x] **阶段 1：`App.vue` 替代 `layout.html`**
  - 创建 `components/App.vue`，渲染整个布局
  - `index.html` 简化为仅保留 `<div id="app">` 挂载点
  - 废弃 `layout.html` 文件
- [x] **阶段 2：Pinia Store 桥接**
  - 新建 `stores/storyStore.js`，包装原生 StoryStore
  - Vue 组件通过 `useStoryStore()` 响应式访问数据
  - 原生 store 通过 `_emit()` → `sync()` 机制同步到 Pinia
- [x] **阶段 3：核心组件 Vue 化**
  - 布局组件：`PanelRight.vue`、`OutlineView.vue`、`TreeNode.vue`
  - 编辑组件：`PanelCenter.vue`、`JsonEditor.vue`、`FormEditor.vue`、`FormField.vue`、`OptionsEditor.vue`、`ActionEditor.vue`
  - 基础组件：`Modal.vue`、`ConfirmDialog.vue`、`useDialog.js`、`useCreateDialog.js`
- [x] **模板标记**：树节点旁显示 📋/🔧 标记，区分已应用模板节点与普通节点
- [x] **阶段 4：清理废弃文件**
  - 删除 `layout.html`
  - 删除 `js/ui/ui-editorForm.js`、`js/ui/ui-storyTree.js`
  - `ui-modalDialog.js` 精简为仅保留 `makeModalDraggable`

### v0.03 — 章节列表视图 + 设置面板 Vue 化
- [x] 章节列表视图：表格化展示对话数组，支持列配置、行内快速编辑，i18n 字段按语言自动展开
- [x] 列配置持久化到 localStorage
- [x] 设置面板 Vue 组件化（`SettingsPanel.vue`）

### v0.02 — 结构类型系统
- [x] 结构类型系统：struct / glob / path 三种匹配方式
- [x] 多语言管理：动态添加语言字段
- [x] 设置面板：色彩方案、字体大小、语言列表、结构类型管理
- [x] 标签颜色模式：跟随主题 / 按类型着色
- [x] 选项系统：可视化编辑选项分支，支持 actions
- [x] 字段标签管理：双击字段名自定义显示别名

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
components/     ← Vue 组件，依赖 logic/ + Naive UI + Pinia
stores/         ← Pinia Store，桥接 Vue 组件与原生 StoryStore
ui-init.js      ← 桥梁：挂载 Vue 组件 + 绑定原生事件
```

---

## 未来待实现的功能

### 🔴 高优先级

- **撤销 / 重做（Undo/Redo）** — 操作历史栈，支持 Ctrl+Z / Ctrl+Shift+Z
- **自动保存（Auto-save）** — 定时将当前章节数据持久化到 localStorage
- **章节视图 Vue 化** — 将 `chapter-view.html` 替换为 Vue 组件
- **剩余 .html 片段迁移** — 将 `toolbar.html`、`splitters.html`、`side-panel/` 等 .html 替换为 Vue 组件

### 🟡 中优先级

- **键盘快捷键** — Ctrl+S 导出、Ctrl+F 搜索等
- **数据校验** — 检查 next 引用的节点 ID 是否存在
- **多章节管理** — 多标签页同时编辑多个章节文件
- **统计面板** — 侧栏统计视图完善
- **Naive UI 全面集成** — 替换原生弹窗、输入框

### 🟢 低优先级

- **对话流程图** — 可视化展示对话分支流向
- **查找替换** — 跨整个章节批量查找和替换

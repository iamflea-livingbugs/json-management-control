﻿# StoryEditor 剧情对话编辑器

可视化编辑 JSON 格式对话剧本，支持多语言、树形导航、实时预览，专为游戏剧情设计。

## 功能

- **树形导航** — 从 JSON 根节点逐层展开，点击任意路径直接定位编辑
- **双模式编辑** — 表单模式（按字段拆分双语输入框）和 JSON 模式（带语法高亮的镜像编辑器），Tab 切换
- **多语言支持** — 每个文本字段内置 {zh, en} 双语组，实时输入
- **选项系统** — 可视化编辑选项分支，支持 actions（命令 + 参数）
- **节点模板** — content / option / action 各层级独立模板，自由定制字段，新建节点自动套用
- **实时 JSON 预览** — 右侧面板实时同步高亮显示，支持格式化
- **JSON 语法校验** — 编辑器底部实时显示 JSON 解析错误
- **路径定位** — 点击树节点，JSON 面板自动滚动并选中对应值区域
- **搜索筛选** — 按路径或键名搜索树节点，🔍 按钮一键填充路径前缀
- **动态表单** — 对象属性自动遍历，简单值输入框，嵌套值摘要+跳转按钮
- **属性管理** — 表单内直接新增/删除属性，不影响原始 JSON
- **导入/导出** — 导入本地 JSON 文件，导出清洗后的 JSON
- **双击改名** — 字段标签支持双击自定义名称（存 localStorage）
- **JSON 配置文件驱动** — 模板上下文、默认内容结构、工具栏按钮均由 config/ 下的 JSON 文件定义

## 使用

1. 在浏览器中打开 index.html
2. 点击"导入 JSON"加载对话剧本文件
3. 左侧树形面板逐层展开，点击节点
4. 中间面板表单模式编辑字段，或切到 JSON 模式直接编辑源码
5. 右侧面板实时预览完整 JSON，支持格式化
6. 编辑完成后点击"导出 JSON"

## 项目结构

```
StoryEditor/
├── index.html            ← HTML 入口
├── layout.html           ← 页面布局（HTML 独立文件，与 JS 分离）
├── css/
│   └── style.css         ← 全部样式
├── js/
│   ├── main.js           ← 入口（只引用 barrel.js）
│   ├── barrel.js          ← 统一导出中枢
│   ├── base/
│   │   └── storyTypes.js ← 底层：数据模型、配置加载、模板读写
│   ├── data/
│   │   ├── storyStore.js ← 数据管理：CRUD、选中、导出
│   │   ├── storyIO.js    ← 导入/导出 JSON 文件
│   │   └── dragDrop.js   ← 拖拽排序
│   └── ui/
│       ├── storyUI.js    ← 界面渲染：工具栏、编辑器、配置弹窗
│       ├── storyTree.js  ← 树形导航
│       └── storyTemplateUI.js ← 模板编辑弹窗
├── config/               ← JSON 配置（JSON 工具编辑 JSON 配置）
│   ├── template-content.json   ← 空白章节/节点/选项结构 + 默认模板
│   └── template-contexts.json  ← 模板编辑器上下文按钮、匹配规则
├── fonts/                ← 字体文件
├── lib/
│   └── highlight.min.js  ← JSON 语法高亮
├── LICENSE               ← Mulan PSL v2
├── README.md
└── PROJECT_HANDOVER.md
```

## 配置文件说明

所有配置均为 JSON 格式，可在编辑器中直接打开编辑，导出的文件可替换项目 `config/` 目录下的原文件。

| 文件 | 作用 | 在 UI 中打开 |
|:----:|:----:|:-----------:|
| `config/template-content.json` | 定义空白章节/节点/选项的数据结构及各上下文的默认模板字段 | 工具栏「📄 内容配置」|
| `config/template-contexts.json` | 定义模板编辑器中的上下文按钮名称和路径匹配规则 | 工具栏「📄 上下文配置」或右上角「⚙️ 配置」|

## 依赖层级

```
main.js → barrel.js → base/    ← 谁都不依赖
                      → data/   ← 依赖 base/ + ui/
                      → ui/     ← 依赖 base/ + data/
- base/ 层：纯工具函数和配置加载
- data/ 层：数据管理和 CRUD
- ui/ 层：界面渲染
```

## 技术栈

- 原生 JavaScript (ES Module)
- Highlight.js — JSON 语法高亮
- 纯 CSS — 暗色主题，flex 布局，可拖拽分栏
- localStorage — 标签别名、节点模板、配置持久化

## 许可

[Mulan PSL v2](https://license.coscl.org.cn/MulanPSL2)（木兰宽松许可证，第2版）

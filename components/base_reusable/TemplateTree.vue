<template>
  <div class="tpl-tree-panel">
    <!-- 搜索栏 -->
    <div class="tpl-tree-search">
      <input
        v-model="searchQuery"
        class="my-input"
        placeholder="搜索模板…"
        style="width:100%"
      />
      <button v-if="searchQuery" class="tree-search-clear" @click="searchQuery = ''">✕</button>
    </div>

    <!-- 树结构 -->
    <div class="tpl-tree-scroll">
      <!-- 全部模板快捷项 -->
      <div
        class="tpl-tree-all"
        :class="{ selected: !selectedKey }"
        @click="$emit('select', null)"
      >全部模板</div>

      <div v-for="cat in filteredCatNames" :key="cat">
        <!-- 分类文件夹行 -->
        <div class="tpl-tree-folder" @click="toggle(cat)">
          <span class="tpl-tree-folder-icon">{{ expanded[cat] ? '📂' : '📁' }}</span>
          <span class="tpl-tree-folder-name">{{ cat }}</span>
          <span class="tpl-tree-folder-count">({{ filteredGroups[cat].length }})</span>
        </div>

        <!-- 子项 -->
        <div v-if="expanded[cat]">
          <div
            v-for="item in filteredGroups[cat]"
            :key="item.key"
            class="tpl-tree-item"
            :class="{ selected: selectedKey === item.key }"
            @click="$emit('select', item.key)"
          >
            <span class="tpl-tree-item-indent">└─</span>
            <span class="tpl-tree-item-label">{{ item.cfg.label || item.key }}</span>
          </div>
        </div>
      </div>

      <div v-if="filteredCatNames.length === 0" class="empty-hint">无匹配模板</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'

const props = defineProps({
  groups: { type: Object, default: () => ({}) },
  selectedKey: { type: String, default: null }
})

defineEmits(['select'])

// 搜索
const searchQuery = ref('')

// 展开状态
const expanded = reactive({})

// 根据搜索词过滤
const filteredGroups = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return props.groups

  const result = {}
  for (const [cat, items] of Object.entries(props.groups)) {
    const matched = items.filter(item =>
      item.key.toLowerCase().includes(q) ||
      (item.cfg.label || '').toLowerCase().includes(q) ||
      (item.cfg.description || '').toLowerCase().includes(q)
    )
    if (matched.length > 0) {
      result[cat] = matched
      // 搜索时自动展开
      if (!(cat in expanded)) expanded[cat] = true
    }
  }
  return result
})

const filteredCatNames = computed(() => Object.keys(filteredGroups.value).sort())

// 默认展开所有
Object.keys(props.groups).forEach(c => { expanded[c] = true })

function toggle(cat) {
  expanded[cat] = !expanded[cat]
}
</script>

<style scoped>
.tpl-tree-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.tpl-tree-search {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.tpl-tree-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}
.tpl-tree-all {
  padding: 6px 12px;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.85rem;
  color: var(--text-dim);
  border-radius: 4px;
  margin: 0 4px;
}
.tpl-tree-all:hover,
.tpl-tree-all.selected {
  background: var(--bg-input);
  color: var(--text);
}
</style>

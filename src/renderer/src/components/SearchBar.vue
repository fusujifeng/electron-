<template>
  <div class="relative">
    <!-- 搜索输入框 -->
    <div class="relative">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索你感兴趣的视频..."
        class="w-full px-4 py-3 pl-12 pr-12 text-sm bg-gray-50/80 backdrop-blur-sm border-2 border-transparent rounded-full focus:outline-none focus:bg-white focus:border-pink-200 focus:shadow-lg transition-all duration-300 placeholder-gray-400"
        @input="handleInput"
        @focus="showSuggestions = true"
        @blur="handleBlur"
      />
      
      <!-- 搜索图标 -->
      <div class="absolute inset-y-0 left-0 flex items-center pl-4">
        <svg class="h-5 w-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
      </div>
      
      <!-- 清除按钮 -->
      <button
        v-if="searchQuery"
        @click="clearSearch"
        class="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-pink-500 transition-colors duration-200"
      >
        <div class="p-1 rounded-full hover:bg-pink-50">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </div>
      </button>
    </div>
    
    <!-- 搜索建议下拉框 -->
    <div
      v-if="showSuggestions && (searchHistory.length > 0 || suggestions.length > 0)"
      class="absolute z-10 w-full mt-2 bg-white/95 backdrop-blur-xl border border-pink-100 rounded-2xl shadow-xl max-h-60 overflow-y-auto"
    >
      <!-- 搜索历史 -->
      <div v-if="searchHistory.length > 0 && !searchQuery" class="p-3">
        <div class="text-xs font-medium text-pink-500 mb-3 flex items-center">
          <svg class="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          最近搜索
        </div>
        <div
          v-for="(item, index) in searchHistory.slice(0, 5)"
          :key="index"
          @click="selectSuggestion(item)"
          class="flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-pink-50 rounded-xl cursor-pointer transition-colors duration-200"
        >
          <span>{{ item }}</span>
          <button
            @click.stop="removeFromHistory(index)"
            class="text-gray-400 hover:text-pink-500 p-1 rounded-full hover:bg-pink-100 transition-all duration-200"
          >
            <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>
      
      <!-- 搜索建议 -->
      <div v-if="suggestions.length > 0" class="p-3">
        <div class="text-xs font-medium text-pink-500 mb-3 flex items-center">
          <svg class="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
          </svg>
          推荐搜索
        </div>
        <div
          v-for="(suggestion, index) in suggestions.slice(0, 5)"
          :key="index"
          @click="selectSuggestion(suggestion)"
          class="px-3 py-2 text-sm text-gray-700 hover:bg-pink-50 rounded-xl cursor-pointer transition-colors duration-200"
        >
          {{ suggestion }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Emits {
  (e: 'search', query: string): void
}

const emit = defineEmits<Emits>()

const searchQuery = ref('')
const showSuggestions = ref(false)
const searchTimeout = ref<NodeJS.Timeout | null>(null)

// 搜索历史
const searchHistory = ref<string[]>([])

// 搜索建议
const suggestions = computed(() => {
  if (!searchQuery.value.trim()) return []
  
  const mockSuggestions = [
    '复仇者联盟',
    '肖申克的救赎',
    '权力的游戏',
    '地球脉动',
    '千与千寻',
    '电影',
    '电视剧',
    '纪录片',
    '动画',
    '科幻',
    '动作',
    '剧情'
  ]
  
  return mockSuggestions.filter(item => 
    item.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

// 处理输入
const handleInput = () => {
  // 清除之前的定时器
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
  }
  
  // 设置新的定时器，实现防抖
  searchTimeout.value = setTimeout(() => {
    emit('search', searchQuery.value)
  }, 300)
}

// 处理失焦
const handleBlur = () => {
  // 延迟隐藏建议，允许点击建议项
  setTimeout(() => {
    showSuggestions.value = false
  }, 200)
}

// 选择建议
const selectSuggestion = (suggestion: string) => {
  searchQuery.value = suggestion
  showSuggestions.value = false
  addToHistory(suggestion)
  emit('search', suggestion)
}

// 清除搜索
const clearSearch = () => {
  searchQuery.value = ''
  emit('search', '')
}

// 添加到搜索历史
const addToHistory = (query: string) => {
  if (!query.trim()) return
  
  // 移除重复项
  const index = searchHistory.value.indexOf(query)
  if (index > -1) {
    searchHistory.value.splice(index, 1)
  }
  
  // 添加到开头
  searchHistory.value.unshift(query)
  
  // 限制历史记录数量
  if (searchHistory.value.length > 10) {
    searchHistory.value = searchHistory.value.slice(0, 10)
  }
  
  // 保存到本地存储
  localStorage.setItem('search-history', JSON.stringify(searchHistory.value))
}

// 从历史记录中移除
const removeFromHistory = (index: number) => {
  searchHistory.value.splice(index, 1)
  localStorage.setItem('search-history', JSON.stringify(searchHistory.value))
}

// 加载搜索历史
const loadSearchHistory = () => {
  try {
    const stored = localStorage.getItem('search-history')
    if (stored) {
      searchHistory.value = JSON.parse(stored)
    }
  } catch (error) {
    console.error('加载搜索历史失败:', error)
  }
}

// 监听搜索查询变化
watch(searchQuery, (newQuery) => {
  if (newQuery.trim()) {
    showSuggestions.value = true
  }
})

// 组件挂载时加载搜索历史
loadSearchHistory()
</script>

<style scoped>
/* 自定义样式 */
</style>
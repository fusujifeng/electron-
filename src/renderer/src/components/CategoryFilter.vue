<script setup lang="ts">
import { ref, computed } from 'vue'

interface Category {
  id: string
  name: string
  icon?: string
  count?: number
}

interface Props {
  categories: Category[]
  selectedCategory: string
}

interface Emits {
  (e: 'change', categoryId: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const showDropdown = ref(false)
const filterInput = ref('')

// 预定义的分类图标
const categoryIcons: Record<string, string> = {
  all: 'M19 11H5m14-7H3a2 2 0 00-2 2v9a2 2 0 002 2h11m4-9v9a2 2 0 01-2 2m-4-9v9m4-9H9m10 0V9a2 2 0 00-2-2M5 3v4',
  movie: 'M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h3a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1h3z',
  tv: 'M21 3H3v18h18V3zM9 17H7v-2h2v2zm0-4H7v-2h2v2zm0-4H7V7h2v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z',
  documentary: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
  animation: 'M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  variety: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
  action: 'M13 10V3L4 14h7v7l9-11h-7z',
  comedy: 'M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  romance: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
  scifi: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
  horror: 'M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z',
  folder: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z'
}

// 当前选中的分类
const selectedCategoryData = computed(() => {
  return props.categories.find(cat => cat.id === props.selectedCategory) || props.categories[0]
})

// 过滤后的分类列表
const filteredCategories = computed(() => {
  if (!filterInput.value.trim()) {
    return props.categories
  }
  return props.categories.filter(category => 
    category.name.toLowerCase().includes(filterInput.value.toLowerCase())
  )
})

// 选择分类
const selectCategory = (categoryId: string) => {
  emit('change', categoryId)
  showDropdown.value = false
  filterInput.value = ''
}

// 获取分类图标
const getCategoryIcon = (category: Category) => {
  if (category.icon) {
    return category.icon
  }
  
  const iconKey = category.id.toLowerCase()
  return categoryIcons[iconKey] || categoryIcons.folder
}

// 点击外部关闭下拉框
const handleClickOutside = () => {
  setTimeout(() => {
    showDropdown.value = false
    filterInput.value = ''
  }, 200)
}

// 处理键盘事件
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    showDropdown.value = false
    filterInput.value = ''
  }
}
</script>

<template>
  <div class="relative">
    <!-- 小红书风格分类选择按钮 -->
    <button
      @click="showDropdown = !showDropdown"
      @blur="handleClickOutside"
      class="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-pink-50 to-red-50 border-2 border-pink-100 rounded-full text-sm font-semibold text-pink-600 hover:from-pink-100 hover:to-red-100 hover:border-pink-200 focus:outline-none focus:ring-4 focus:ring-pink-100 transition-all duration-300 shadow-sm hover:shadow-md"
    >
      <!-- 分类图标 -->
      <svg class="h-4 w-4 mr-2 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" :d="getCategoryIcon(selectedCategoryData)"></path>
      </svg>
      
      <!-- 分类名称 -->
      <span>{{ selectedCategoryData.name }}</span>
      
      <!-- 视频数量 -->
      <span v-if="selectedCategoryData.count !== undefined" class="ml-1 px-2 py-0.5 bg-pink-200 text-pink-700 text-xs rounded-full font-medium">
        {{ selectedCategoryData.count }}
      </span>
      
      <!-- 下拉箭头 -->
      <svg 
        class="ml-2 h-4 w-4 text-pink-400 transition-transform duration-300"
        :class="{ 'rotate-180': showDropdown }"
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path>
      </svg>
    </button>
    
    <!-- 小红书风格下拉菜单 -->
    <div 
      v-if="showDropdown"
      class="absolute z-50 mt-2 w-72 bg-white/95 backdrop-blur-xl border border-pink-100 rounded-2xl shadow-2xl max-h-80 overflow-hidden"
    >
      <!-- 搜索框 -->
      <div class="p-4 border-b border-pink-50">
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg class="h-4 w-4 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>
          <input
            v-model="filterInput"
            type="text"
            placeholder="搜索分类..."
            class="block w-full pl-11 pr-4 py-2.5 border-2 border-pink-100 rounded-xl text-sm bg-pink-50/50 placeholder-pink-400 focus:outline-none focus:bg-white focus:border-pink-300 focus:ring-4 focus:ring-pink-100 transition-all duration-300"
            @keydown="handleKeydown"
          />
        </div>
      </div>
      
      <!-- 分类列表 -->
      <div class="max-h-64 overflow-y-auto">
        <div v-if="filteredCategories.length === 0" class="px-4 py-6 text-sm text-pink-400 text-center">
          <svg class="h-8 w-8 mx-auto mb-2 text-pink-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.239 0-4.236-.18-5.536-.437C7.061 14.419 8 13.665 8 12.781V8.5c0-.955.448-1.805 1.145-2.356C10.765 5.589 8.485 5 6 5a8.997 8.997 0 00-2.252 11.803c.224.348.472.678.747.982C4.905 17.982 5.448 18 6 18c.552 0 1.095-.018 1.505-.215.275-.304.523-.634.747-.982A8.997 8.997 0 0010 5c-2.485 0-4.765.589-6.145 1.144C4.552 6.695 5 7.545 5 8.5v4.281c0 .884.939 1.638 2.464 1.782C8.764 14.82 10.761 15 13 15s4.236-.18 5.536-.437C19.061 14.419 20 13.665 20 12.781V8.5c0-.955-.448-1.805-1.145-2.356"></path>
          </svg>
          未找到匹配的分类
        </div>
        
        <button
          v-for="category in filteredCategories"
          :key="category.id"
          @click="selectCategory(category.id)"
          class="w-full text-left px-4 py-3 text-sm hover:bg-pink-50 flex items-center justify-between transition-all duration-200 group"
          :class="{
            'bg-gradient-to-r from-pink-50 to-red-50 text-pink-700 border-l-4 border-pink-400': category.id === selectedCategory,
            'text-gray-700 hover:text-pink-600': category.id !== selectedCategory
          }"
        >
          <div class="flex items-center space-x-3">
            <!-- 分类图标 -->
            <div class="p-1.5 rounded-lg transition-colors duration-200"
              :class="{
                'bg-pink-100': category.id === selectedCategory,
                'bg-gray-100 group-hover:bg-pink-100': category.id !== selectedCategory
              }"
            >
              <svg 
                class="h-4 w-4 flex-shrink-0"
                :class="{
                  'text-pink-500': category.id === selectedCategory,
                  'text-gray-500 group-hover:text-pink-500': category.id !== selectedCategory
                }"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="getCategoryIcon(category)"></path>
              </svg>
            </div>
            
            <!-- 分类名称 -->
            <span class="font-semibold ml-3">{{ category.name }}</span>
          </div>
          
          <!-- 视频数量和选中标识 -->
          <div class="flex items-center space-x-3">
            <span v-if="category.count !== undefined" 
              class="px-2 py-1 text-xs font-medium rounded-full"
              :class="{
                'bg-pink-200 text-pink-700': category.id === selectedCategory,
                'bg-gray-200 text-gray-600 group-hover:bg-pink-200 group-hover:text-pink-700': category.id !== selectedCategory
              }"
            >
              {{ category.count }}
            </span>
            
            <!-- 选中标识 -->
            <div 
              v-if="category.id === selectedCategory"
              class="p-1 bg-pink-500 rounded-full"
            >
              <svg 
                class="h-3 w-3 text-white"
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
              </svg>
            </div>
          </div>
        </button>
      </div>
      
      <!-- 底部操作 -->
      <div class="border-t border-gray-100 p-3">
        <div class="flex items-center justify-between text-xs text-gray-500">
          <span>共 {{ filteredCategories.length }} 个分类</span>
          <button 
            @click="showDropdown = false"
            class="text-blue-600 hover:text-blue-800 font-medium"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
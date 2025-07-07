<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  selectedFolder: string
  isLoading?: boolean
  canGoBack?: boolean
}

interface Emits {
  (e: 'select', folderPath?: string): void
  (e: 'refresh'): void
  (e: 'go-back'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const showTooltip = ref(false)

// 格式化文件夹路径显示
const displayPath = computed(() => {
  if (!props.selectedFolder) {
    return '未选择文件夹'
  }
  
  const path = props.selectedFolder
  const maxLength = 50
  
  if (path.length <= maxLength) {
    return path
  }
  
  // 截取路径，保留开头和结尾
  const start = path.substring(0, 20)
  const end = path.substring(path.length - 25)
  return `${start}...${end}`
})

// 获取文件夹名称
const folderName = computed(() => {
  if (!props.selectedFolder) {
    return ''
  }
  
  const parts = props.selectedFolder.split(/[\\/]/)
  return parts[parts.length - 1] || parts[parts.length - 2] || ''
})

// 选择文件夹
const selectFolder = async () => {
  try {
    // 使用自定义的 dialog API 选择文件夹
    const result = await window.api?.showOpenDialog({
      properties: ['openDirectory'],
      title: '选择视频文件夹'
    })
    
    if (result && !result.canceled && result.filePaths.length > 0) {
      const selectedPath = result.filePaths[0]
      emit('select', selectedPath)
    }
  } catch (error) {
    console.error('选择文件夹失败:', error)
    // 如果 API 不可用，提示用户
    alert('文件夹选择功能不可用，请确保在 Electron 环境中运行')
  }
}

// 刷新文件夹
const refreshFolder = () => {
  emit('refresh')
}

// 返回上一级
const goBack = () => {
  emit('go-back')
}

// 复制路径到剪贴板
const copyPath = async () => {
  if (!props.selectedFolder) return
  
  try {
    await navigator.clipboard.writeText(props.selectedFolder)
    // 这里可以添加一个提示消息
    console.log('路径已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
  }
}

// 在文件管理器中打开
const openInExplorer = () => {
  if (!props.selectedFolder) return
  
  // 通过 Electron 的 IPC 调用打开文件管理器
  window.electron?.shell?.openPath(props.selectedFolder)
}
</script>

<template>
  <div class="flex items-center space-x-3">
    <!-- 文件夹图标和信息 -->
    <div class="flex items-center space-x-2 flex-1 min-w-0">
      <!-- 文件夹图标 -->
      <div class="flex-shrink-0 p-2 rounded-xl"
        :class="selectedFolder ? 'bg-pink-100' : 'bg-gray-100'"
      >
        <svg 
          class="h-6 w-6"
          :class="selectedFolder ? 'text-pink-500' : 'text-gray-400'"
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
        </svg>
      </div>
      
      <!-- 文件夹信息 -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center space-x-2">
          <!-- 文件夹名称 -->
          <h3 
            v-if="selectedFolder"
            class="text-sm font-semibold text-gray-800 truncate"
            :title="folderName"
          >
            {{ folderName }}
          </h3>
          <span v-else class="text-sm text-pink-500 font-medium">
            选择视频文件夹
          </span>
          
          <!-- 加载状态 -->
          <div v-if="isLoading" class="flex-shrink-0 p-1 bg-pink-100 rounded-full">
            <svg class="animate-spin h-4 w-4 text-pink-500" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        </div>
        
        <!-- 文件夹路径 -->
        <p 
          v-if="selectedFolder"
          class="text-xs text-gray-500 truncate cursor-pointer hover:text-pink-600 transition-colors px-2 py-1 bg-gray-50 rounded-lg hover:bg-pink-50"
          :title="selectedFolder"
          @click="copyPath"
        >
          {{ displayPath }}
        </p>
      </div>
    </div>
    
    <!-- 操作按钮 -->
    <div class="flex items-center space-x-2 flex-shrink-0">
      <!-- 返回按钮 -->
      <button
        v-if="selectedFolder && canGoBack"
        @click="goBack"
        :disabled="isLoading"
        class="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-110"
        title="返回上一级"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
        </svg>
      </button>
      
      <!-- 刷新按钮 -->
      <button
        v-if="selectedFolder"
        @click="refreshFolder"
        :disabled="isLoading"
        class="p-2.5 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-110"
        title="刷新文件夹"
      >
        <svg 
          class="h-4 w-4"
          :class="{ 'animate-spin': isLoading }"
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
        </svg>
      </button>
      
      <!-- 在文件管理器中打开 -->
      <button
        v-if="selectedFolder"
        @click="openInExplorer"
        class="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-300 hover:scale-110"
        title="在文件管理器中打开"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
        </svg>
      </button>
      
      <!-- 选择文件夹按钮 -->
      <button
        @click="selectFolder"
        :disabled="isLoading"
        class="inline-flex items-center px-6 py-3 border border-transparent text-sm font-semibold rounded-full text-white bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 focus:outline-none focus:ring-4 focus:ring-pink-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
      >
        <svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
        </svg>
        {{ selectedFolder ? '更换文件夹' : '选择文件夹' }}
      </button>
    </div>
  </div>
  
  <!-- 提示信息 -->
  <div v-if="!selectedFolder" class="mt-4 p-6 bg-gradient-to-br from-pink-50 to-red-50 border-2 border-pink-100 rounded-2xl backdrop-blur-sm">
    <div class="flex items-start space-x-4">
      <div class="p-2 bg-pink-100 rounded-xl">
        <svg class="h-6 w-6 text-pink-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      </div>
      <div class="text-sm">
        <p class="font-bold text-pink-700 mb-2 text-base">开始你的视频之旅 ✨</p>
        <p class="text-pink-600 mb-3 leading-relaxed">
          选择一个包含视频文件的文件夹，我们将为你精心整理和展示所有美好的视频内容。
        </p>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          <div class="flex items-center space-x-2 text-xs text-pink-600 bg-white/60 px-3 py-2 rounded-xl">
            <span class="text-pink-500">🎬</span>
            <span>支持多种格式</span>
          </div>
          <div class="flex items-center space-x-2 text-xs text-pink-600 bg-white/60 px-3 py-2 rounded-xl">
            <span class="text-pink-500">🖼️</span>
            <span>智能生成封面</span>
          </div>
          <div class="flex items-center space-x-2 text-xs text-pink-600 bg-white/60 px-3 py-2 rounded-xl">
            <span class="text-pink-500">📁</span>
            <span>深度文件夹扫描</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

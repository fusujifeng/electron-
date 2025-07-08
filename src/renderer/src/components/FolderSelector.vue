<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  selectedFolders: string[]
  isLoading?: boolean
}

interface Emits {
  (e: 'select', folderPaths: string[]): void
  (e: 'refresh'): void
  (e: 'remove', folderPath: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const showTooltip = ref(false)

// 格式化文件夹路径显示
const displayPath = (path: string) => {
  const maxLength = 50

  if (path.length <= maxLength) {
    return path
  }

  // 截取路径，保留开头和结尾
  const start = path.substring(0, 20)
  const end = path.substring(path.length - 25)
  return `${start}...${end}`
}

// 获取文件夹名称
const getFolderName = (path: string) => {
  const parts = path.split(/[\/]/)
  return parts[parts.length - 1] || parts[parts.length - 2] || ''
}

// 计算选中文件夹数量
const selectedCount = computed(() => props.selectedFolders.length)

// 选择文件夹（支持多选）
const selectFolders = async () => {
  try {
    // 使用自定义的 dialog API 选择多个文件夹
    const result = await window.api?.showOpenDialog({
      properties: ['openDirectory', 'multiSelections'],
      title: '选择视频文件夹（可多选）'
    })

    if (result && !result.canceled && result.filePaths.length > 0) {
      // 合并新选择的文件夹和已有的文件夹，去重
      const newFolders = [...new Set([...props.selectedFolders, ...result.filePaths])]
      emit('select', newFolders)
    }
  } catch (error) {
    console.error('选择文件夹失败:', error)
    // 如果 API 不可用，提示用户
    alert('文件夹选择功能不可用，请确保在 Electron 环境中运行')
  }
}

// 移除文件夹
const removeFolder = (folderPath: string) => {
  emit('remove', folderPath)
}

// 刷新文件夹
const refreshFolder = () => {
  emit('refresh')
}

// 复制路径到剪贴板
const copyPath = async (path: string) => {
  try {
    await navigator.clipboard.writeText(path)
    console.log('路径已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
  }
}

// 在文件管理器中打开
const openInExplorer = (path: string) => {
  // 通过 Electron 的 IPC 调用打开文件管理器
  window.electron?.shell?.openPath(path)
}
</script>

<template>
  <div class="space-y-3">
    <!-- 已选择的文件夹列表 - 横向排列的圆角矩形 -->
    <div v-if="selectedCount > 0" class="flex items-center justify-between">
      <!-- 左侧：文件夹列表 -->
      <div class="flex flex-wrap gap-2 flex-1 mr-4">
         <div
           v-for="(folder, index) in selectedFolders"
           :key="folder"
           class="group relative inline-flex items-center px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 hover:border-blue-300 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-md cursor-pointer max-w-xs"
           :title="folder"
           @click="copyPath(folder)"
         >
           <!-- 文件夹图标 -->
           <svg class="h-4 w-4 text-blue-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
           </svg>
           
           <!-- 文件夹名称 -->
           <span class="text-sm font-medium text-blue-700 truncate max-w-[120px]">
             {{ getFolderName(folder) }}
           </span>
           
           <!-- 删除按钮 - 鼠标悬停时显示 -->
           <button
             @click.stop="removeFolder(folder)"
             class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center shadow-lg hover:scale-110"
             title="移除此文件夹"
           >
             <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"></path>
             </svg>
           </button>
           
           <!-- 在文件管理器中打开按钮 - 右键或双击 -->
           <button
             @click.stop="openInExplorer(folder)"
             class="ml-2 p-1 text-blue-400 hover:text-blue-600 hover:bg-blue-100 rounded transition-all duration-200 opacity-0 group-hover:opacity-100"
             title="在文件管理器中打开"
           >
             <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
             </svg>
           </button>
         </div>
       </div>
       
       <!-- 右侧：操作按钮 -->
       <div class="flex items-center space-x-2 flex-shrink-0">
         <!-- 文件夹数量显示 -->
         <div class="flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
           <svg class="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
           </svg>
           <span class="text-sm font-medium text-gray-700">{{ selectedCount }} 个文件夹</span>
           <!-- 加载状态 -->
           <div v-if="isLoading" class="flex-shrink-0">
             <svg class="animate-spin h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24">
               <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
               <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
             </svg>
           </div>
         </div>
         
         <!-- 添加文件夹按钮 -->
         <button
           @click="selectFolders"
           :disabled="isLoading"
           class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 focus:outline-none focus:ring-2 focus:ring-pink-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-md hover:shadow-lg"
         >
           <svg class="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
           </svg>
           添加
         </button>
       </div>
     </div>
     
     <!-- 当没有选择文件夹时的初始状态 -->
     <div v-else class="flex items-center justify-center py-8">
       <div class="text-center">
         <div class="flex-shrink-0 p-3 bg-gray-100 rounded-xl mx-auto w-fit mb-3">
           <svg class="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
           </svg>
         </div>
         <h3 class="text-lg font-medium text-gray-800 mb-2">选择视频文件夹</h3>
         <p class="text-sm text-gray-500 mb-4">选择包含视频文件的文件夹开始浏览</p>
         <button
           @click="selectFolders"
           :disabled="isLoading"
           class="inline-flex items-center px-6 py-3 border border-transparent text-sm font-semibold rounded-full text-white bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 focus:outline-none focus:ring-4 focus:ring-pink-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
         >
           <svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
           </svg>
           选择文件夹
         </button>
       </div>
     </div>
  </div>

  <!-- 提示信息 -->
  <div v-if="selectedCount === 0" class="mt-4 p-6 bg-gradient-to-br from-pink-50 to-red-50 border-2 border-pink-100 rounded-2xl backdrop-blur-sm">
    <div class="flex items-start space-x-4">
      <div class="p-2 bg-pink-100 rounded-xl">
        <svg class="h-6 w-6 text-pink-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      </div>
      <div class="text-sm">
        <p class="font-bold text-pink-700 mb-2 text-base">开始你的视频之旅 ✨</p>
        <p class="text-pink-600 mb-3 leading-relaxed">
          选择一个或多个包含视频文件的文件夹，我们将为你精心整理和展示所有美好的视频内容。
        </p>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          <div class="flex items-center space-x-2 text-xs text-pink-600 bg-white/60 px-3 py-2 rounded-xl">
            <span class="text-pink-500">🎬</span>
            <span>支持多种格式</span>
          </div>
          <div class="flex items-center space-x-2 text-xs text-pink-600 bg-white/60 px-3 py-2 rounded-xl">
            <span class="text-pink-500">📁</span>
            <span>多文件夹同时管理</span>
          </div>
          <div class="flex items-center space-x-2 text-xs text-pink-600 bg-white/60 px-3 py-2 rounded-xl">
            <span class="text-pink-500">🔍</span>
            <span>深度文件夹扫描</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

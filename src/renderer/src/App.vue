<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import VideoGrid from './components/VideoGrid.vue'
import SearchBar from './components/SearchBar.vue'
import CategoryFilter from './components/CategoryFilter.vue'
import FolderSelector from './components/FolderSelector.vue'
import TagManager from './components/TagManager.vue'
import { useVideoStore } from './stores/videoStore'
import type { Video } from './stores/videoStore'



// 使用 Pinia store
const videoStore = useVideoStore()

// 响应式数据
const selectedFolder = ref('')
const searchQuery = ref('')
const selectedCategory = ref('all')
const isLoading = ref(false)
const selectedPreviewImage = ref<Video | null>(null)
const showPreviewPanel = ref(false)
const windowWidth = ref(window.innerWidth)
const isLargeScreen = computed(() => windowWidth.value >= 1536) // 2xl breakpoint
const isDeepestFolder = ref(false)
const sortBy = ref('name') // 排序方式：name, size-desc, time-desc, time-asc

// 右键菜单相关
const showContextMenu = ref(false)
const contextMenuPosition = ref({ x: 0, y: 0 })
const contextMenuType = ref<'paste' | 'image'>('paste') // 菜单类型：粘贴或图片操作
const selectedImagePath = ref<string>('') // 选中的图片路径

// Toast通知相关
const toastMessage = ref('')
const toastType = ref<'success' | 'error' | 'info'>('success')
const showToastNotification = ref(false)

// 排序选项
const sortOptions = [
  { value: 'name', label: '按名称排序', icon: '🔤' },
  { value: 'size-desc', label: '按大小排序（大到小）', icon: '📊' },
  { value: 'time-desc', label: '按时间排序（新到旧）', icon: '🕒' },
  { value: 'time-asc', label: '按时间排序（旧到新）', icon: '🕐' }
]

// 导航历史记录
const navigationHistory = ref<string[]>([])
const currentFolderName = computed(() => {
  if (!selectedFolder.value) return ''
  return selectedFolder.value.split(/[\\/]/).pop() || ''
})
const canGoBack = computed(() => navigationHistory.value.length > 0)
const categories = computed(() => {
  const baseCategories = [
    { id: 'all', name: '全部', icon: '📁', count: 0 },
    { id: 'movie', name: '电影', icon: '🎬', count: 0 },
    { id: 'tv', name: '电视剧', icon: '📺', count: 0 },
    { id: 'documentary', name: '纪录片', icon: '🎥', count: 0 },
    { id: 'animation', name: '动画', icon: '🎨', count: 0 },
    { id: 'variety', name: '综艺', icon: '🎪', count: 0 },
    { id: 'music', name: '音乐', icon: '🎵', count: 0 },
    { id: 'other', name: '其他', icon: '📂', count: 0 }
  ]

  // 更新分类计数
  baseCategories.forEach(category => {
    if (category.id === 'all') {
      category.count = videoStore.videos.length
    } else {
      category.count = videoStore.videos.filter(video => video.category === category.id).length
    }
  })

  return baseCategories
})

// 选择文件夹
const selectFolder = async (folderPath?: string) => {
  try {
    if (folderPath) {
      clearNavigationHistory()
      selectedFolder.value = folderPath
      videoStore.updateSettings({ lastSelectedFolder: folderPath })
      await loadVideos()
    }
  } catch (error) {
    console.error('选择文件夹失败:', error)
  }
}

// 处理文件夹选择按钮点击
const handleSelectFolderClick = async () => {
  try {
    const result = await (window as any).api?.selectFolder()
    if (result?.success && result.folderPath) {
      await selectFolder(result.folderPath as string)
    }
  } catch (error) {
    console.error('选择文件夹失败:', error)
  }
}

// 导出数据
const exportData = () => {
  try {
    const data = videoStore.exportData()
    const jsonString = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `feng-video-player-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast('✅ 数据导出成功', 'success')
  } catch (error) {
    console.error('导出数据失败:', error)
    showToast('❌ 数据导出失败', 'error')
  }
}

// 导入数据
const importData = () => {
  try {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const jsonData = JSON.parse(e.target?.result as string)
            const success = videoStore.importData(jsonData)
            if (success) {
              showToast('✅ 数据导入成功', 'success')
              if (selectedFolder.value) {
                loadVideos()
              }
            } else {
              showToast('❌ 导入数据失败', 'error')
            }
          } catch (error) {
            console.error('解析导入文件失败:', error)
            showToast('❌ 解析导入文件失败', 'error')
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  } catch (error) {
    console.error('导入数据失败:', error)
    showToast('❌ 导入数据失败', 'error')
  }
}

// 刷新文件夹
const refreshFolder = async () => {
  if (selectedFolder.value) {
    await loadVideos()
  }
}

// 加载视频文件
const loadVideos = async () => {
  if (!selectedFolder.value) {
    return
  }

  try {
    isLoading.value = true
    videoStore.clearVideos()

    const result = await (window as any).api?.scanFolder(selectedFolder.value)

    if (result?.success && result.items) {
      result.items.forEach(item => {
        if (item.type === 'video') {
          const video = {
            id: `video_${Date.now()}_${Math.random()}`,
            name: item.name,
            title: item.name.replace(/\.[^/.]+$/, ''),
            path: item.path,
            thumbnail: '/default-thumbnail.jpg',
            duration: 0,
            size: item.size || 0,
            category: detectCategory(item.name),
            tags: generateTags(item.name),
            createdAt: new Date(),
            playCount: 0,
            rating: 0,
            isFolder: false
          }
          videoStore.addVideo(video)
        } else if (item.type === 'folder') {
          const folderItem = {
            id: `folder_${Date.now()}_${Math.random()}`,
            name: item.name,
            title: item.name,
            path: item.path,
            thumbnail: item.coverImage ? `local-image://${encodeURIComponent(item.coverImage.replace(/\\/g, '/'))}` : '/folder-icon.svg',
            duration: 0,
            size: 0,
            category: 'folder',
            tags: ['文件夹'],
            createdAt: new Date(),
            playCount: 0,
            rating: 0,
            isFolder: true
          }
          videoStore.addVideo(folderItem)
        } else if (item.type === 'image') {
          const image = {
            id: `image_${Date.now()}_${Math.random()}`,
            name: item.name,
            title: item.name.replace(/\.[^/.]+$/, ''),
            path: item.path,
            thumbnail: item.path,
            duration: 0,
            size: item.size || 0,
            category: 'image',
            tags: ['图片'],
            createdAt: new Date(),
            playCount: 0,
            rating: 0,
            isFolder: false
          }
          videoStore.addVideo(image)
        }
      })
    } else {
      console.error('扫描文件夹失败:', result?.error)
    }

    await checkIsDeepestFolder(selectedFolder.value)

  } catch (error) {
    console.error('加载视频失败:', error)
  } finally {
    isLoading.value = false
  }
}



// 根据文件名检测分类
const detectCategory = (filename: string): string => {
  const name = filename.toLowerCase()
  if (name.includes('movie') || name.includes('电影')) return 'movie'
  if (name.includes('tv') || name.includes('剧集') || name.includes('s0') || name.includes('e0')) return 'tv'
  if (name.includes('documentary') || name.includes('纪录片')) return 'documentary'
  if (name.includes('animation') || name.includes('动画')) return 'animation'
  if (name.includes('variety') || name.includes('综艺')) return 'variety'
  return 'other'
}

// 生成标签
const generateTags = (filename: string): string[] => {
  const tags: string[] = []
  const name = filename.toLowerCase()

  if (name.includes('1080p') || name.includes('hd')) tags.push('高清')
  if (name.includes('4k') || name.includes('2160p')) tags.push('4K')
  if (name.includes('bluray') || name.includes('蓝光')) tags.push('蓝光')

  return tags
}

// 处理文件夹选择（新增）
const handleFolderSelect = async (folderPath: string) => {
  // 将当前路径添加到历史记录
  if (selectedFolder.value && selectedFolder.value !== folderPath) {
    navigationHistory.value.push(selectedFolder.value)
  }

  selectedFolder.value = folderPath
  videoStore.updateSettings({ lastSelectedFolder: folderPath })
  await loadVideos()
}

// 回退到上一个文件夹
const goBack = async () => {
  if (navigationHistory.value.length > 0) {
    const previousPath = navigationHistory.value.pop()
    if (previousPath) {
      selectedFolder.value = previousPath
      videoStore.updateSettings({ lastSelectedFolder: previousPath })
      await loadVideos()
    }
  }
}



// 清空导航历史
const clearNavigationHistory = () => {
  navigationHistory.value = []
}



// 处理搜索
const handleSearch = (query: string) => {
  searchQuery.value = query
}

// 处理分类变化
const handleCategoryChange = (categoryId: string) => {
  selectedCategory.value = categoryId
}

// 处理视频更新
const handleVideoUpdate = (_updatedVideo: Video) => {
  // Pinia store 会自动响应更新，无需手动刷新
}

// 处理视频播放
const handleVideoPlay = () => {
  // 这里可以调用 Electron 主进程来播放视频
  // window.electron.ipcRenderer.send('play-video', video.path)
}

// 处理视频收藏
const handleVideoFavorite = () => {
  // 收藏状态变化处理
}

// 处理文件夹卡片点击预览
const handleFolderPreview = (video: Video) => {
  if (video.isFolder) {
    selectedPreviewImage.value = video
    showPreviewPanel.value = true
    checkIsDeepestFolder(video.path)
  }
}

// 关闭预览面板
const closePreviewPanel = () => {
  showPreviewPanel.value = false
  selectedPreviewImage.value = null
}

// 获取预览图片源URL
const getPreviewImageSrc = (video: Video) => {
  if (!video.thumbnail) return '/folder-icon.svg'

  // 如果是blob URL或绝对路径，直接返回
  if (video.thumbnail.startsWith('blob:') || video.thumbnail.startsWith('/')) {
    return video.thumbnail
  }

  // 如果已经是 local-image:// 协议，检查是否需要解码
  if (video.thumbnail.startsWith('local-image://')) {
    const url = video.thumbnail
    // 如果URL包含编码字符，尝试解码一次
    if (url.includes('%')) {
      try {
        const decodedPath = decodeURIComponent(url.replace('local-image://', ''))
        return `local-image://${decodedPath}`
      } catch (e) {
        console.warn('URL解码失败，使用原始URL:', url)
        return url
      }
    }
    return url
  }

  // 否则构建 local-image:// URL
  return `local-image://${video.thumbnail.replace(/\\/g, '/')}`
}

// 检测是否为最深层文件夹（没有子文件夹）
const checkIsDeepestFolder = async (folderPath: string) => {
  try {
    const result = await (window as any).api?.scanFolder(folderPath)
    if (result?.success && result.items) {
      const hasSubfolders = result.items.some(item => item.type === 'folder')
      isDeepestFolder.value = !hasSubfolders
    }
  } catch (error) {
    console.error('检测最深层文件夹失败:', error)
    isDeepestFolder.value = false
  }
}

// 处理文件夹标签更新
const handleFolderTagsUpdate = (tags: string[]) => {
  if (selectedPreviewImage.value?.path) {
    videoStore.setFolderTags(selectedPreviewImage.value.path, tags)
  }
}

// 窗口大小变化处理
const handleResize = () => {
  windowWidth.value = window.innerWidth
  // 如果窗口变小且预览面板正在显示，则关闭预览面板
  if (!isLargeScreen.value && showPreviewPanel.value) {
    closePreviewPanel()
  }
}

// 右键菜单处理
const handleContextMenu = (event: MouseEvent) => {
  // 只在最深层文件夹中启用右键菜单
  if (!isDeepestFolder.value) {
    return
  }
  
  const target = event.target as HTMLElement
  
  // 检查是否点击的是图片卡片
  const imgCard = target.closest('[data-img-card]')
  // 检查是否点击的是视频卡片
  const videoCard = target.closest('[data-video-card]')
  
  if (imgCard) {
    // 在图片卡片内部，显示图片操作菜单（设置为封面、删除）
    event.preventDefault()
    
    // 查找卡片内的图片元素来获取路径
    const imageElement = imgCard.querySelector('img')
    
    // 如果找到了有效的本地图片
    if (imageElement && imageElement.src && imageElement.src.startsWith('local-image://')) {
      // 移除 local-image:// 前缀和可能的时间戳参数
      let srcPath = imageElement.src.replace('local-image://', '')
      // 移除时间戳参数（如 ?t=1234567890）
      const queryIndex = srcPath.indexOf('?')
      if (queryIndex !== -1) {
        srcPath = srcPath.substring(0, queryIndex)
      }
      const decodedPath = decodeURIComponent(srcPath)
      
      // 修复Windows路径格式
      let fixedPath = decodedPath
      // 如果路径是 d/path 格式，转换为 D:\path
      if (fixedPath.match(/^[a-zA-Z]\//) && !fixedPath.includes(':')) {
        fixedPath = fixedPath.charAt(0).toUpperCase() + ':' + fixedPath.substring(1)
      }
      // 将正斜杠转换为反斜杠
      fixedPath = fixedPath.replace(/\//g, '\\')
      
      selectedImagePath.value = fixedPath
    } else {
      selectedImagePath.value = ''
    }
    
    contextMenuType.value = 'image'
    contextMenuPosition.value = { x: event.clientX, y: event.clientY }
    showContextMenu.value = true
    
  } else if (videoCard) {
    // 在视频卡片内部，不显示任何菜单（无反应）
    return
  } else {
    // 在卡片外部的空白区域，显示粘贴菜单
    event.preventDefault()
    
    contextMenuType.value = 'paste'
    selectedImagePath.value = ''
    contextMenuPosition.value = { x: event.clientX, y: event.clientY }
    showContextMenu.value = true
  }
}

// 关闭右键菜单
const closeContextMenu = () => {
  showContextMenu.value = false
}

// 粘贴剪贴板图片
const pasteClipboardImage = async () => {
  closeContextMenu()
  
  if (!selectedFolder.value) {
    showToast('❌ 请先选择一个文件夹', 'error')
    return
  }
  
  try {
    const result = await window.api.saveClipboardImage(selectedFolder.value)
    
    if (result?.success) {
      await loadVideos()
      showToast(`✅ 图片保存成功！文件名: ${result.fileName}`, 'success')
    } else {
      // 根据错误类型提供不同的提示
      let errorMessage = result?.error || '未知错误'
      if (errorMessage.includes('剪贴板中没有图片')) {
        errorMessage = '❌ 剪贴板中没有图片\n\n请先复制图片到剪贴板：\n1. 使用QQ截图或其他工具截图\n2. 复制图片文件\n3. 然后再尝试粘贴'
      } else if (errorMessage.includes('没有写入权限')) {
        errorMessage = '❌ 文件夹没有写入权限\n\n请检查：\n1. 文件夹是否存在\n2. 是否有管理员权限\n3. 文件夹是否被其他程序占用'
      } else if (errorMessage.includes('文件夹不存在')) {
        errorMessage = '❌ 目标文件夹不存在\n\n请重新选择一个有效的文件夹'
      }
      
      alert(errorMessage)
    }
  } catch (error) {
    console.error('保存剪贴板图片时发生异常:', error)
    alert('❌ 保存失败\n\n发生了意外错误，请：\n1. 检查剪贴板中是否有图片\n2. 确认文件夹路径正确\n3. 重启应用程序后重试')
  }
}

// 点击其他地方关闭右键菜单
const handleDocumentClick = (event: Event) => {
  if (showContextMenu.value) {
    // 检查点击的是否是右键菜单内部
    const target = event.target as HTMLElement
    const contextMenu = document.querySelector('.context-menu')
    
    // 如果点击的不是右键菜单内部，则关闭菜单
    if (contextMenu && !contextMenu.contains(target)) {
      closeContextMenu()
    }
  }
}

// 设置为封面
const setAsCover = async () => {
  closeContextMenu()
  
  if (!selectedImagePath.value || !selectedFolder.value) {
    showToast('❌ 设置封面失败：未选择图片', 'error')
    return
  }
  
  try {
    console.log('设置封面:', selectedImagePath.value)
    const result = await window.api.setAsCover(selectedImagePath.value)
    
    if (result.success) {
      if (result.message) {
        showToast(result.message, 'info')
      } else {
        const fileName = selectedImagePath.value.split('\\').pop() || ''
        showToast(`✅ 已设置 "${fileName}" 为文件夹封面`, 'success')
      }
      
      // 刷新文件夹以更新封面显示
      await loadVideos()
    } else {
      console.error('设置封面失败:', result.error)
      showToast(result.error || '❌ 设置封面失败', 'error')
    }
  } catch (error) {
    console.error('设置封面异常:', error)
    showToast('❌ 设置封面失败', 'error')
  }
}

// 删除图片
const deleteImage = async () => {
  closeContextMenu()
  
  if (!selectedImagePath.value) {
    showToast('❌ 删除失败：未选择图片', 'error')
    return
  }
  
  const fileName = selectedImagePath.value.split('\\').pop() || ''
  
  // 二次确认
  const confirmed = confirm(`确定要删除图片 "${fileName}" 吗？\n\n此操作不可撤销！`)
  if (!confirmed) {
    return
  }
  
  try {
    // 调用删除文件的API
    const result = await window.api.deleteFile(selectedImagePath.value)
    
    if (result?.success) {
      showToast(`✅ 图片 "${fileName}" 已删除`, 'success')
      // 刷新文件夹以更新显示
      await loadVideos()
    } else {
      showToast(`❌ 删除失败：${result?.error || '未知错误'}`, 'error')
    }
  } catch (error) {
    console.error('删除图片失败:', error)
    showToast('❌ 删除图片失败', 'error')
  }
}

// Toast通知函数
const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
  toastMessage.value = message
  toastType.value = type
  showToastNotification.value = true
  
  // 3秒后自动隐藏
  setTimeout(() => {
    showToastNotification.value = false
  }, 3000)
}

// 组件挂载时初始化
onMounted(async () => {
  window.addEventListener('resize', handleResize)
  document.addEventListener('click', handleDocumentClick)

  const lastFolder = videoStore.settings.lastSelectedFolder
  if (lastFolder) {
    selectedFolder.value = lastFolder
    await loadVideos()
  }
})

// 组件卸载时清理
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- Toast通知 -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 transform -translate-y-2"
      enter-to-class="opacity-100 transform translate-y-0"
      leave-active-class="transition-all duration-300 ease-in"
      leave-from-class="opacity-100 transform translate-y-0"
      leave-to-class="opacity-0 transform -translate-y-2"
    >
      <div
        v-if="showToastNotification"
        class="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 min-w-[300px] max-w-[500px]"
        :class="{
          'bg-green-500 text-white': toastType === 'success',
          'bg-red-500 text-white': toastType === 'error',
          'bg-blue-500 text-white': toastType === 'info'
        }"
      >
        <svg
          v-if="toastType === 'success'"
          class="h-5 w-5 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        <svg
          v-else-if="toastType === 'error'"
          class="h-5 w-5 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
        <svg
          v-else-if="toastType === 'info'"
          class="h-5 w-5 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span class="text-sm font-medium">{{ toastMessage }}</span>
      </div>
    </Transition>
    <!-- 小红书风格头部导航 -->
    <header class="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-pink-100/50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-20">
          <!-- Logo、标题和导航 -->
          <div class="flex items-center space-x-4">
            <div class="flex-shrink-0 p-2 bg-gradient-to-br from-pink-400 to-red-400 rounded-2xl shadow-lg">
              <svg class="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
              </svg>
            </div>
            <div>
              <h1 class="text-2xl font-bold bg-gradient-to-r from-pink-500 to-red-500 bg-clip-text text-transparent">视频小记</h1>
              <p class="text-xs text-gray-500 font-medium">发现美好视频</p>
            </div>

            <!-- 导航区域 -->
            <div class="flex items-center space-x-3 ml-6">
              <!-- 文件夹选择按钮（当没有选择文件夹时显示） -->
              <button
                v-if="!selectedFolder"
                @click="handleSelectFolderClick"
                class="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 text-purple-600 rounded-xl transition-all duration-300 hover:scale-105 border border-purple-200 hover:border-purple-300 shadow-sm hover:shadow-md"
                title="选择文件夹"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                <span class="text-sm font-medium">选择文件夹</span>
              </button>

              <!-- 文件夹导航区域（当已选择文件夹时显示） -->
              <template v-if="selectedFolder">
              <!-- 回退按钮 -->
              <button
                v-if="canGoBack"
                @click="goBack"
                class="flex items-center space-x-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl transition-all duration-300 hover:scale-105 border border-blue-200"
                title="返回上一级"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                </svg>
                <span class="text-sm font-medium">返回</span>
              </button>

              <!-- 当前路径显示 -->
              <div class="flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-200">
                <svg class="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
                </svg>
                <span class="text-sm text-gray-700 font-medium max-w-xs truncate" :title="selectedFolder">
                  {{ currentFolderName || '根目录' }}
                </span>
              </div>

              <!-- 操作按钮组 -->
              <div class="flex items-center space-x-2">
                <!-- 导入按钮 -->
                <button
                  @click="importData"
                  class="group relative flex items-center justify-center w-10 h-10 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 hover:border-blue-300 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg"
                  title="导入数据"
                >
                  <svg
                    class="h-5 w-5 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path>
                  </svg>
                </button>

                <!-- 导出按钮 -->
                <button
                  @click="exportData"
                  class="group relative flex items-center justify-center w-10 h-10 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 border border-purple-200 hover:border-purple-300 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg"
                  title="导出数据"
                >
                  <svg
                    class="h-5 w-5 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                  </svg>
                </button>

                <!-- 刷新按钮 -->
                <button
                  @click="refreshFolder"
                  :disabled="isLoading"
                  class="group relative flex items-center justify-center w-10 h-10 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 border border-green-200 hover:border-green-300 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  title="刷新文件夹"
                >
                  <svg
                    class="h-5 w-5 text-green-600 transition-transform duration-500 group-hover:rotate-180"
                    :class="{ 'animate-spin': isLoading }"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                  </svg>
                  <!-- 加载状态指示器 -->
                  <div v-if="isLoading" class="absolute inset-0 bg-green-100/50 rounded-xl flex items-center justify-center">
                     <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                   </div>
                  </button>
              </div>

                <!-- 排序下拉框 -->
                <div class="relative">
                  <select
                    v-model="sortBy"
                    class="appearance-none bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 hover:border-blue-300 text-blue-700 text-sm rounded-xl px-4 py-2 pr-8 transition-all duration-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent cursor-pointer"
                    title="选择排序方式"
                  >
                    <option
                      v-for="option in sortOptions"
                      :key="option.value"
                      :value="option.value"
                      class="bg-white text-gray-800"
                    >
                      {{ option.icon }} {{ option.label }}
                    </option>
                  </select>
                  <!-- 下拉箭头 -->
                  <div class="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <svg class="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </div>
                </div>
                </template>
             </div>
           </div>

          <!-- 搜索栏 -->
          <div class="flex-1 max-w-md mx-8">
            <SearchBar @search="handleSearch" />
          </div>

          <!-- 分类筛选 -->
          <div class="flex items-center space-x-4">
            <CategoryFilter
              :categories="categories"
              :selected-category="selectedCategory"
              @change="handleCategoryChange"
            />
          </div>
        </div>
      </div>
    </header>

    <!-- 主要内容区域 -->
    <main class="flex-1 flex">
      <!-- 左侧内容区域 -->
      <div
        class="overflow-auto transition-all duration-300"
        :class="{
          'w-full': !isLargeScreen || !showPreviewPanel,
          'w-[66vw] mr-96': isLargeScreen && showPreviewPanel
        }"
        @contextmenu="handleContextMenu"
      >
        <div class="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
        <!-- 文件夹选择区域 -->
      <div class="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <FolderSelector
          :selected-folder="selectedFolder"
          :is-loading="isLoading"
          :can-go-back="canGoBack"
          @select="selectFolder"
          @refresh="refreshFolder"
          @go-back="goBack"
        />
      </div>

        <!-- 视频网格 -->
        <VideoGrid
          :videos="videoStore.videos"
          :search-query="searchQuery"
          :selected-category="selectedCategory"
          :sort-by="sortBy"
          :is-loading="isLoading"
          @video-update="handleVideoUpdate"
          @video-play="handleVideoPlay"
          @video-favorite="handleVideoFavorite"
          @folder-select="handleFolderSelect"
          @folder-preview="handleFolderPreview"
        /></div>
        </div>


      <!-- 右侧预览面板 -->
      <div
        v-if="showPreviewPanel && selectedPreviewImage"
        class="fixed right-0 top-0 h-full bg-white border-l border-gray-200 flex flex-col z-50 shadow-lg"
        :class="{
          'w-[33vw]': isLargeScreen,
          'w-full': !isLargeScreen
        }"
      >
        <!-- 预览面板头部 -->
        <div class="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <h3 class="text-lg font-semibold text-gray-800 truncate flex-1 mr-4">
            {{ selectedPreviewImage.title || selectedPreviewImage.name }}
          </h3>
          <button
            @click="closePreviewPanel"
            class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            title="关闭预览"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- 预览信息区域 -->
        <div class="flex-1 p-4 bg-white overflow-y-auto">
          <div class="space-y-4">
            <!-- 文件夹预览图像 -->
            <div class="w-full h-[60vh]  bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
              <img
                v-if="selectedPreviewImage.thumbnail && selectedPreviewImage.thumbnail !== '/folder-icon.svg'"
                :src="getPreviewImageSrc(selectedPreviewImage)"
                :alt="selectedPreviewImage.name"
                class="w-full h-full object-contain  "
                @error="() => {}"
              />
              <div v-else class="flex flex-col items-center justify-center text-gray-400">
                <svg class="w-16 h-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
                </svg>
                <span class="text-sm">暂无预览图</span>
              </div>
            </div>

            <!-- 文件夹信息 -->
            <div class="flex items-center space-x-2">
              <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
              </svg>
              <span class="text-sm text-gray-600">文件夹</span>
            </div>
            <div class="text-xs text-gray-500 break-all">
              {{ selectedPreviewImage.path }}
            </div>

            <!-- Tag管理组件 - 仅在最深层文件夹时显示 -->
            <div v-if="isDeepestFolder" class="mt-6">
              <div class="border-t border-gray-200 pt-4">
                <h4 class="text-sm font-medium text-gray-700 mb-3">标签管理</h4>
                <TagManager
                  :folder-path="selectedPreviewImage.path"
                  @tags-updated="handleFolderTagsUpdate"
                />
              </div>
            </div>

            <button
              @click="handleFolderSelect(selectedPreviewImage.path)"
              class="w-full mt-6 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium"
            >
              进入文件夹
            </button>
          </div>
        </div>
      </div>
  </main>

    <!-- 右键菜单 -->
    <div
      v-if="showContextMenu"
      class="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[120px] context-menu"
      :style="{ left: contextMenuPosition.x + 'px', top: contextMenuPosition.y + 'px' }"
      @click.stop
    >
      <!-- 粘贴菜单 -->
      <template v-if="contextMenuType === 'paste'">
        <button
          class="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
          @click="pasteClipboardImage"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
          </svg>
          <span>粘贴图片</span>
        </button>
      </template>
      
      <!-- 图片操作菜单 -->
      <template v-else-if="contextMenuType === 'image'">
        <button
          class="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
          @click="setAsCover"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
          <span>设置为封面</span>
        </button>
        <div class="border-t border-gray-100 my-1"></div>
        <button
          class="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
          @click="deleteImage"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
          <span>删除</span>
        </button>
      </template>
    </div>
  </div>
</template>

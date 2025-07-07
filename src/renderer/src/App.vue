<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import VideoGrid from './components/VideoGrid.vue'
import SearchBar from './components/SearchBar.vue'
import CategoryFilter from './components/CategoryFilter.vue'
import FolderSelector from './components/FolderSelector.vue'
import TagManager from './components/TagManager.vue'
import { useVideoStore } from './stores/videoStore'
import type { Video } from './stores/videoStore'

interface Category {
  id: string
  name: string
  count: number
}

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
      // 清空导航历史，因为这是用户主动选择的根文件夹
      clearNavigationHistory()
      selectedFolder.value = folderPath
      videoStore.updateSettings({ lastSelectedFolder: folderPath })
      await loadVideos()
      console.log('已选择文件夹:', folderPath)
    }
  } catch (error) {
    console.error('选择文件夹失败:', error)
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
    console.log('没有选择文件夹，跳过加载')
    return
  }

  try {
    console.log('开始加载文件夹:', selectedFolder.value)
    isLoading.value = true

    // 清空现有数据
    videoStore.clearVideos()
    console.log('已清空现有数据')

    // 扫描选择的文件夹
    const result = await window.api?.scanFolder(selectedFolder.value)
    console.log('扫描结果:', result)

    if (result?.success && result.items) {
      console.log('找到', result.items.length, '个项目')
      // 处理扫描结果
      result.items.forEach(item => {
        if (item.type === 'video') {
          // 添加视频文件
          const video = {
            id: `video_${Date.now()}_${Math.random()}`,
            name: item.name,
            title: item.name.replace(/\.[^/.]+$/, ''), // 移除文件扩展名
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
          console.log('添加视频:', video.title)
        } else if (item.type === 'folder') {
          // 为文件夹创建一个特殊的"视频"项
          const folderItem = {
            id: `folder_${Date.now()}_${Math.random()}`,
            name: item.name,
            title: item.name, // 直接使用文件夹名作为标题
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
          console.log('添加文件夹:', folderItem.title, '封面:', item.coverImage || '默认图标')
        } else if (item.type === 'image') {
          // 添加图片文件
          const image = {
            id: `image_${Date.now()}_${Math.random()}`,
            name: item.name,
            title: item.name.replace(/\.[^/.]+$/, ''), // 移除文件扩展名
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
          console.log('添加图片:', image.title, '路径:', image.path)
        }
      })
    } else {
      console.error('扫描文件夹失败:', result?.error)
    }

    console.log('数据刷新完成，当前视频数量:', videoStore.videos.length)
    
    // 检测是否为最深层文件夹
    await checkIsDeepestFolder(selectedFolder.value)

  } catch (error) {
    console.error('加载视频失败:', error)
  } finally {
    isLoading.value = false
  }
}

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
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

// 处理双击文件夹进入
const handleFolderDoubleClick = async (folderItem: Video) => {
  if (folderItem.isFolder) {
    await handleFolderSelect(folderItem.path)
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
const handleVideoUpdate = (updatedVideo: Video) => {
  // Pinia store 会自动响应更新，无需手动刷新
}

// 处理视频播放
const handleVideoPlay = (video: Video) => {
  console.log('播放视频:', video.name)
  // 这里可以调用 Electron 主进程来播放视频
  // window.electron.ipcRenderer.send('play-video', video.path)
}

// 处理视频收藏
const handleVideoFavorite = (video: Video) => {
  console.log('收藏状态变化:', video.name, video.isFavorite)
}

// 处理文件夹卡片点击预览
const handleFolderPreview = (video: Video) => {
  if (video.isFolder && isLargeScreen.value) {
    selectedPreviewImage.value = video
    showPreviewPanel.value = true
    console.log('显示文件夹预览:', video.name, '缩略图:', video.thumbnail)
  } else if (video.isFolder && !isLargeScreen.value) {
    // 在小屏幕上直接进入文件夹
    handleFolderSelect(video.path)
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
    const result = await window.api?.scanFolder(folderPath)
    if (result?.success && result.items) {
      // 检查是否有子文件夹
      const hasSubfolders = result.items.some(item => item.type === 'folder')
      isDeepestFolder.value = !hasSubfolders
      console.log('检测最深层文件夹:', folderPath, '是否为最深层:', !hasSubfolders)
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
    console.log('文件夹标签已更新:', selectedPreviewImage.value.path, tags)
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

// 组件挂载时初始化
onMounted(async () => {
  // 添加窗口大小变化监听器
  window.addEventListener('resize', handleResize)
  
  // 加载上次选择的文件夹
  const lastFolder = videoStore.settings.lastSelectedFolder
  if (lastFolder) {
    selectedFolder.value = lastFolder
    await loadVideos()
  }

  console.log('视频管理器已启动，视频数量:', videoStore.videos.length)
})

// 组件卸载时清理
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div class="min-h-screen flex flex-col">
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
            <div v-if="selectedFolder" class="flex items-center space-x-3 ml-6">
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
      >
        <div class="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
        <!-- 文件夹选择区域 -->
        <div class="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <FolderSelector
            :selected-folder="selectedFolder"
            :is-loading="isLoading"
            @select="selectFolder"
            @refresh="refreshFolder"
          />
        </div>

        <!-- 视频网格 -->
        <VideoGrid
          :videos="videoStore.videos"
          :search-query="searchQuery"
          :selected-category="selectedCategory"
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
        v-if="isLargeScreen && showPreviewPanel && selectedPreviewImage"
        class="fixed right-0 top-0 w-[33vw] h-full bg-white border-l border-gray-200 flex flex-col z-50 shadow-lg"
      >
        <!-- 预览面板头部 -->
        <div class="flex items-center p-4 border-b border-gray-200 bg-gray-50">
          <h3 class="text-lg font-semibold text-gray-800 truncate">
            {{ selectedPreviewImage.title || selectedPreviewImage.name }}
          </h3>
        </div>

        <!-- 预览信息区域 -->
        <div class="flex-1 p-4 bg-white overflow-y-auto">
          <div class="space-y-4">
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
              <TagManager
                :folder-path="selectedPreviewImage.path"
                @tags-updated="handleFolderTagsUpdate"
              />
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
  </div>
</template>

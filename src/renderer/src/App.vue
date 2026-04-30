<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import VideoGrid from './components/VideoGrid.vue'
import SearchBar from './components/SearchBar.vue'
import CategoryFilter from './components/CategoryFilter.vue'
import FolderSelector from './components/FolderSelector.vue'
import TagManager from './components/TagManager.vue'
// 通过预加载脚本访问 electron API
// import { ipcRenderer } from 'electron' // 移除直接导入
import SettingsPanel from './components/SettingsPanel.vue'
import { useVideoStore } from './stores/videoStore'
import type { Video } from './stores/videoStore'

// 引入类型声明
/// <reference path="../../preload/index.d.ts" />

// 使用 Pinia store
const videoStore = useVideoStore()

// 响应式数据
const selectedFolders = ref<string[]>([])
const searchQuery = ref('')
const selectedCategory = ref('all')
const isLoading = ref(false)
const selectedPreviewImage = ref<Video | null>(null)
const showPreviewPanel = ref(false)
const windowWidth = ref(window.innerWidth)
const isLargeScreen = computed(() => windowWidth.value >= 1536) // 2xl breakpoint
const isDeepestFolder = ref(false)
const sortBy = ref('time-desc') // 排序方式：name, size-desc, time-desc, time-asc
const showRecommendationPanel = ref(false)
const recommendationIndex = ref(0)
const recommendationDirection = ref<'left' | 'right'>('right')
const recommendationAnimating = ref(false)
const showFavoritesPanel = ref(false)

// 右键菜单相关
const showContextMenu = ref(false)
const contextMenuPosition = ref({ x: 0, y: 0 })
const contextMenuType = ref<'paste' | 'image'>('paste') // 菜单类型：粘贴或图片操作
const selectedImagePath = ref<string>('') // 选中的图片路径

// Toast通知相关
const toastMessage = ref('')
const toastType = ref<'success' | 'error' | 'info'>('success')
const showToastNotification = ref(false)

// 设置面板相关
const showSettingsPanel = ref(false)

// 排序选项
const sortOptions = [
  { value: 'name', label: '按名称排序', icon: '🔤' },
  { value: 'size-desc', label: '按大小排序（大到小）', icon: '📊' },
  { value: 'time-desc', label: '按时间排序（新到旧）', icon: '🕒' },
  { value: 'time-asc', label: '按时间排序（旧到新）', icon: '🕐' }
]

// 导航历史记录（存储文件夹数组和滚动位置的历史状态）
interface NavigationState {
  folders: string[]
  scrollPosition: number
}
const navigationHistory = ref<NavigationState[]>([])
const currentFolderName = computed(() => {
  if (selectedFolders.value.length === 0) return ''
  if (selectedFolders.value.length === 1) {
    return selectedFolders.value[0].split(/[\\/]/).pop() || ''
  }
  return `${selectedFolders.value.length} 个文件夹`
})
const canGoBack = computed(() => navigationHistory.value.length > 0)
const todayKey = computed(() => {
  const now = new Date()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
})
const libraryStats = computed(() => {
  const folders = videoStore.videos.filter((video) => video.isFolder).length
  const images = videoStore.videos.filter((video) => video.category === 'image').length
  const playable = videoStore.videos.length - folders - images

  return {
    total: videoStore.videos.length,
    playable,
    folders,
    images
  }
})
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
  baseCategories.forEach((category) => {
    if (category.id === 'all') {
      category.count = videoStore.videos.length
    } else {
      category.count = videoStore.videos.filter((video) => video.category === category.id).length
    }
  })

  return baseCategories
})

const playableVideos = computed(() =>
  videoStore.videos.filter((video) => !video.isFolder && video.category !== 'image')
)

const getTimeValue = (value?: Date | string) => {
  if (!value) return 0
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? 0 : time
}

const hashString = (value: string) => {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

const dailyRecommendationVideos = computed(() => {
  const staleBefore = Date.now() - 14 * 24 * 60 * 60 * 1000
  const freshPool = playableVideos.value.filter((video) => {
    const lastPlayed = getTimeValue(video.lastPlayed)
    return !lastPlayed || lastPlayed < staleBefore || (video.playCount || 0) === 0
  })
  const backupPool = playableVideos.value.filter((video) => !freshPool.includes(video))

  return [...freshPool, ...backupPool]
    .sort((a, b) => {
      const aNeverPlayed = (a.playCount || 0) === 0 ? -1 : 0
      const bNeverPlayed = (b.playCount || 0) === 0 ? -1 : 0
      if (aNeverPlayed !== bNeverPlayed) return aNeverPlayed - bNeverPlayed

      const aHash = hashString(`${todayKey.value}:${a.path}`)
      const bHash = hashString(`${todayKey.value}:${b.path}`)
      return aHash - bHash
    })
    .slice(0, 10)
})

const currentRecommendationVideo = computed(() =>
  dailyRecommendationVideos.value[recommendationIndex.value] || null
)

const recommendationComplete = computed(() =>
  dailyRecommendationVideos.value.length > 0 &&
  recommendationIndex.value >= dailyRecommendationVideos.value.length
)

const favoriteRankingVideos = computed(() =>
  [...playableVideos.value]
    .filter((video) => (video.playCount || 0) > 0)
    .sort((a, b) => {
      const playDiff = (b.playCount || 0) - (a.playCount || 0)
      if (playDiff !== 0) return playDiff
      return getTimeValue(b.lastPlayed) - getTimeValue(a.lastPlayed)
    })
    .slice(0, 10)
)

const topPlayCount = computed(() =>
  favoriteRankingVideos.value.reduce((max, video) => Math.max(max, video.playCount || 0), 0)
)

// 选择文件夹（支持多选）
const selectFolders = async (folderPaths: string[]) => {
  try {
    if (folderPaths && folderPaths.length > 0) {
      clearNavigationHistory()
      selectedFolders.value = folderPaths
      videoStore.updateSettings({ lastSelectedFolder: folderPaths[0] })
      await loadVideos()
    }
  } catch (error) {
    console.error('选择文件夹失败:', error)
  }
}

// 移除文件夹
const removeFolder = async (folderPath: string) => {
  try {
    selectedFolders.value = selectedFolders.value.filter((path) => path !== folderPath)
    if (selectedFolders.value.length > 0) {
      await loadVideos()
    } else {
      videoStore.clearVideos()
    }
  } catch (error) {
    console.error('移除文件夹失败:', error)
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
              if (selectedFolders.value.length > 0) {
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
  if (selectedFolders.value.length > 0) {
    await loadVideos()
  }
}

// 加载视频文件（支持多文件夹）
const loadVideos = async () => {
  if (selectedFolders.value.length === 0) {
    return
  }

  try {
    isLoading.value = true
    const previousVideosByPath = new Map(videoStore.videos.map((video) => [video.path, video]))
    videoStore.clearVideos()

    // 遍历所有选中的文件夹
    for (const folderPath of selectedFolders.value) {
      const result = await (window as any).api?.scanFolder(folderPath)

      if (result?.success && result.items) {
        result.items.forEach((item) => {
          if (item.type === 'video') {
            const video = applyPersistedVideoState({
              id: `video_${Date.now()}_${Math.random()}`,
              name: item.name,
              title: item.name.replace(/\.[^/.]+$/, ''),
              path: item.path,
              thumbnail: '/default-thumbnail.jpg',
              duration: 0,
              size: item.size || 0,
              category: detectCategory(item.name),
              tags: generateTags(item.name),
              createdAt: item.modifiedAt ? new Date(item.modifiedAt) : new Date(),
              modifiedAt: item.modifiedAt ? new Date(item.modifiedAt) : undefined,
              playCount: 0,
              lastPlayed: undefined,
              rating: 0,
              isFolder: false
            }, previousVideosByPath.get(item.path))
            videoStore.addVideo(video)
          } else if (item.type === 'folder') {
            const folderItem = applyPersistedVideoState({
              id: `folder_${Date.now()}_${Math.random()}`,
              name: item.name,
              title: item.name,
              path: item.path,
              thumbnail: item.coverImage
                ? `local-image://${encodeURIComponent(item.coverImage.replace(/\\/g, '/'))}`
                : '/folder-icon.svg',
              duration: 0,
              size: 0,
              category: 'folder',
              tags: ['文件夹'],
              createdAt: item.modifiedAt ? new Date(item.modifiedAt) : new Date(),
              modifiedAt: item.modifiedAt ? new Date(item.modifiedAt) : undefined,
              playCount: 0,
              lastPlayed: undefined,
              rating: 0,
              isFolder: true
            }, previousVideosByPath.get(item.path))
            videoStore.addVideo(folderItem)
          } else if (item.type === 'image') {
            const image = applyPersistedVideoState({
              id: `image_${Date.now()}_${Math.random()}`,
              name: item.name,
              title: item.name.replace(/\.[^/.]+$/, ''),
              path: item.path,
              thumbnail: item.path,
              duration: 0,
              size: item.size || 0,
              category: 'image',
              tags: ['图片'],
              createdAt: item.modifiedAt ? new Date(item.modifiedAt) : new Date(),
              modifiedAt: item.modifiedAt ? new Date(item.modifiedAt) : undefined,
              playCount: 0,
              lastPlayed: undefined,
              rating: 0,
              isFolder: false
            }, previousVideosByPath.get(item.path))
            videoStore.addVideo(image)
          }
        })
      } else {
        console.error('扫描文件夹失败:', result?.error)
      }
    }

    // 检查是否为最深层文件夹（使用第一个文件夹）
    if (selectedFolders.value.length > 0) {
      await checkIsDeepestFolder(selectedFolders.value[0])
    }
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
  if (name.includes('tv') || name.includes('剧集') || name.includes('s0') || name.includes('e0'))
    return 'tv'
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

const applyPersistedVideoState = (video: Video, previous?: Video): Video => {
  if (!previous) return video

  return {
    ...video,
    playCount: previous.playCount || 0,
    lastPlayed: previous.lastPlayed,
    rating: previous.rating || 0,
    isFavorite: previous.isFavorite || false,
    thumbnail:
      previous.thumbnail && previous.thumbnail !== '/default-thumbnail.jpg' && previous.thumbnail !== '/folder-icon.svg'
        ? previous.thumbnail
        : video.thumbnail
  }
}

const getDiscoveryImageSrc = (video: Video) => {
  if (!video.thumbnail || video.thumbnail === '/default-thumbnail.jpg' || video.thumbnail === '/folder-icon.svg') {
    return ''
  }

  if (video.thumbnail.startsWith('blob:') || video.thumbnail.startsWith('/') || video.thumbnail.startsWith('local-image://')) {
    return video.thumbnail
  }

  return `local-image://${video.thumbnail.replace(/\\/g, '/')}`
}

const formatLastPlayed = (video: Video) => {
  const lastPlayed = getTimeValue(video.lastPlayed)
  if (!lastPlayed) return '还没打开过'

  const diffDays = Math.floor((Date.now() - lastPlayed) / (24 * 60 * 60 * 1000))
  if (diffDays <= 0) return '今天打开过'
  if (diffDays === 1) return '昨天打开过'
  return `${diffDays} 天前打开`
}

const getRankingWidth = (video: Video) => {
  if (!topPlayCount.value) return '8%'
  return `${Math.max(8, Math.round(((video.playCount || 0) / topPlayCount.value) * 100))}%`
}

const openRecommendationPanel = () => {
  if (dailyRecommendationVideos.value.length === 0) {
    showToast('暂无可推荐的视频', 'info')
    return
  }
  recommendationIndex.value = 0
  showRecommendationPanel.value = true
}

const closeRecommendationPanel = () => {
  showRecommendationPanel.value = false
}

const advanceRecommendation = (direction: 'left' | 'right') => {
  if (recommendationAnimating.value) return
  recommendationAnimating.value = true
  recommendationDirection.value = direction
  setTimeout(() => {
    recommendationIndex.value++
    recommendationAnimating.value = false
  }, 320)
}

const likeRecommendation = () => {
  if (recommendationAnimating.value || !currentRecommendationVideo.value) return
  openDiscoveryVideo(currentRecommendationVideo.value)
  advanceRecommendation('right')
}

const rejectRecommendation = () => {
  if (recommendationAnimating.value || !currentRecommendationVideo.value) return
  advanceRecommendation('left')
}

const restartRecommendation = () => {
  recommendationIndex.value = 0
}

const openFavoritesPanel = () => {
  if (favoriteRankingVideos.value.length === 0) {
    showToast('还没有打开记录', 'info')
    return
  }
  showFavoritesPanel.value = true
}

const closeFavoritesPanel = () => {
  showFavoritesPanel.value = false
}

const openDiscoveryVideo = async (video: Video) => {
  try {
    const result = await (window as any).api?.openFileWithDefaultApp(video.path)
    if (result?.success) {
      const updatedVideo = videoStore.incrementPlayCount(video.id)
      if (updatedVideo) handleVideoUpdate(updatedVideo)
      showToast(`已打开：${video.title || video.name}`, 'success')
    } else {
      showToast(`无法打开：${result?.error || '未知错误'}`, 'error')
    }
  } catch (error) {
    console.error('打开推荐视频失败:', error)
    showToast('打开失败', 'error')
  }
}

// 处理文件夹选择（新增）
const handleFolderSelect = async (folderPath: string) => {
  // 获取当前滚动容器的滚动位置
  const scrollContainer = document.querySelector('.video-grid-container') as HTMLElement;
  const scrollPosition = scrollContainer?.scrollTop || 0;

  if (selectedFolders.value.length > 0 && !selectedFolders.value.includes(folderPath)) {
    navigationHistory.value.push({
      folders: [...selectedFolders.value],
      scrollPosition
    });
  }

  selectedFolders.value = [folderPath];
  videoStore.updateSettings({ lastSelectedFolder: folderPath });
  await loadVideos();
}

const openFolderSelect = async (folderPath: string) => {
  try {
    const result = await window.api.openInExplorer(folderPath)
    if (!result.success) {
      console.error('打开文件夹失败:', result.error)
      showToast(`❌ 无法打开文件夹: ${result.error || '未知错误'}`, 'error')
    }
  } catch (error) {
    console.error('打开文件夹时发生异常:', error)
    showToast('❌ 打开文件夹失败', 'error')
  }
}

// 回退到上一个文件夹
const goBack = async () => {
  if (navigationHistory.value.length > 0) {
    const previousState = navigationHistory.value.pop();
    if (previousState && previousState.folders) {
      selectedFolders.value = [...previousState.folders];
      videoStore.updateSettings({ lastSelectedFolder: previousState.folders[0] });
      await loadVideos();

      // 确保DOM更新完成后再恢复滚动位置
      await nextTick()
      const scrollContainer = document.querySelector('.video-grid-container') as HTMLElement;
      if (scrollContainer && previousState.scrollPosition) {
        scrollContainer.scrollTop = previousState.scrollPosition;
        scrollContainer.style.scrollBehavior = 'smooth';
        setTimeout(() => {
          scrollContainer.style.scrollBehavior = 'auto';
        }, 500);
      }
    }
  }
};

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
      const hasSubfolders = result.items.some((item) => item.type === 'folder')
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

// 播放文件夹中的第一个视频
const playFirstVideo = async () => {
  if (!selectedPreviewImage.value?.path) {
    return
  }

  try {
    // 扫描文件夹获取视频文件
    const result = await (window as any).api?.scanFolder(selectedPreviewImage.value.path)

    if (result?.success && result.items) {
      // 查找第一个视频文件
      const firstVideo = result.items.find((item) => item.type === 'video')

      if (firstVideo) {
        // 使用系统默认应用打开视频
        const openResult = await (window as any).api?.openFileWithDefaultApp(firstVideo.path)

        if (!openResult?.success) {
          console.error('打开视频失败:', openResult?.error)
        }
      }
    }
  } catch (error) {
    console.error('播放视频失败:', error)
  }
}

// 删除视频文件夹
const deleteVideoFolder = async () => {
  if (!selectedPreviewImage.value?.path) {
    return
  }

  // 确认删除
  const confirmed = confirm(`确定要删除文件夹 "${selectedPreviewImage.value.name}" 吗？\n\n注意：文件夹将被移动到回收站，可以从回收站恢复。`)
  
  if (!confirmed) {
    return
  }

  try {
    // 调用主进程删除文件夹
    const result = await (window as any).api?.deleteFolder(selectedPreviewImage.value.path)

    if (result?.success) {
      // 删除成功，关闭预览面板
      closePreviewPanel()
      
      // 刷新当前目录
      await refreshCurrentDirectory()
      
      console.log('文件夹删除成功')
    } else {
      console.error('删除文件夹失败:', result?.error)
      alert('删除失败: ' + (result?.error || '未知错误'))
    }
  } catch (error) {
    console.error('删除文件夹失败:', error)
    alert('删除失败: ' + error)
  }
}

// 刷新当前目录
const refreshCurrentDirectory = async () => {
  // 重新加载当前选中的文件夹
  if (selectedFolders.value.length > 0) {
    await loadVideos()
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

  if (selectedFolders.value.length === 0) {
    showToast('❌ 请先选择一个文件夹', 'error')
    return
  }

  try {
    console.log(selectedFolders.value)

    // 确保selectedFolders.value存在且有值
    if (!selectedFolders.value || selectedFolders.value.length === 0) {
      showToast('❌ 请先选择一个文件夹', 'error')
      return
    }

    const result = await window.api.saveClipboardImage(selectedFolders.value[0])
    console.log(result)
    if (result?.success) {
      await loadVideos()
      showToast(`✅ 图片保存成功！文件名: ${result.fileName}`, 'success')
    } else {
      // 根据错误类型提供不同的提示
      let errorMessage = result?.error || '未知错误'
      if (errorMessage.includes('剪贴板中没有图片')) {
        errorMessage =
          '❌ 剪贴板中没有图片\n\n请先复制图片到剪贴板：\n1. 使用QQ截图或其他工具截图\n2. 复制图片文件\n3. 然后再尝试粘贴'
      } else if (errorMessage.includes('没有写入权限')) {
        errorMessage =
          '❌ 文件夹没有写入权限\n\n请检查：\n1. 文件夹是否存在\n2. 是否有管理员权限\n3. 文件夹是否被其他程序占用'
      } else if (errorMessage.includes('文件夹不存在')) {
        errorMessage = '❌ 目标文件夹不存在\n\n请重新选择一个有效的文件夹'
      }

      alert(errorMessage)
    }
  } catch (error) {
    console.error('保存剪贴板图片时发生异常:', error)
    alert(
      '❌ 保存失败\n\n发生了意外错误，请：\n1. 检查剪贴板中是否有图片\n2. 确认文件夹路径正确\n3. 重启应用程序后重试'
    )
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

  if (!selectedImagePath.value || selectedFolders.value.length === 0) {
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

// 设置面板相关方法
const openSettings = () => {
  showSettingsPanel.value = true
}

const closeSettings = () => {
  showSettingsPanel.value = false
}

//自动更新
const showUpdateProgress = ref(false)
const progress = ref({ percent: 0 })
// 格式化百分比过滤器
const formatPercent = (value) => {
  return value.toFixed(0)
}
// 组件挂载时初始化
onMounted(async () => {
  window.addEventListener('resize', handleResize)
  document.addEventListener('click', handleDocumentClick)

  const lastFolder = videoStore.settings.lastSelectedFolder
  if (lastFolder) {
    selectedFolders.value = [lastFolder]
    await loadVideos()
  }

  // 监听主进程的更新事件
  // 注意：需要在预加载脚本中暴露这些事件监听器
  // ipcRenderer.on('update-start', () => {
  //   showUpdateProgress.value = true
  // })

  // ipcRenderer.on('update-progress', (_, data) => {
  //   progress.value.percent = Math.round(data.percent)
  // })
})

// 组件卸载时清理
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<template>
  <div class="app-shell min-h-screen text-[#1d1d1f]">
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-300 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div
        v-if="showToastNotification"
        class="fixed top-5 left-1/2 z-[9999] flex min-w-[320px] max-w-[520px] -translate-x-1/2 items-center gap-2 rounded-[14px] border border-white/60 px-5 py-3 text-sm font-medium shadow-[0_22px_60px_rgba(0,0,0,0.18)] backdrop-blur-2xl"
        :class="{
          'bg-[#34c759]/95 text-white': toastType === 'success',
          'bg-[#ff3b30]/95 text-white': toastType === 'error',
          'bg-[#0071e3]/95 text-white': toastType === 'info'
        }"
      >
        <svg class="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            v-if="toastType === 'success'"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 13l4 4L19 7"
          ></path>
          <path
            v-else-if="toastType === 'error'"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          ></path>
          <path
            v-else
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          ></path>
        </svg>
        <span>{{ toastMessage }}</span>
      </div>
    </Transition>

    <div class="min-h-screen xl:pl-[292px]">
      <aside
        class="fixed inset-y-0 left-0 z-40 hidden w-[292px] flex-col border-r border-white/70 bg-white/58 px-4 py-5 shadow-[1px_0_0_rgba(255,255,255,0.75)_inset] backdrop-blur-2xl xl:flex"
      >
        <div class="flex items-center gap-3 px-2">
          <div class="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[#0071e3] shadow-[0_12px_32px_rgba(0,113,227,0.28)]">
            <svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2.3"
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              ></path>
            </svg>
          </div>
          <div>
            <h1 class="text-base font-semibold leading-tight text-[#1d1d1f]">澪妹管理大师</h1>
            <p class="text-xs font-medium text-gray-500">Cinema Library</p>
          </div>
        </div>

        <div class="mt-7 grid grid-cols-2 gap-2">
          <div class="rounded-[14px] border border-white/70 bg-white/64 p-3 shadow-sm">
            <p class="text-[11px] font-medium text-gray-500">项目</p>
            <p class="mt-1 text-2xl font-semibold tracking-tight">{{ libraryStats.total }}</p>
          </div>
          <div class="rounded-[14px] border border-white/70 bg-white/64 p-3 shadow-sm">
            <p class="text-[11px] font-medium text-gray-500">视频</p>
            <p class="mt-1 text-2xl font-semibold tracking-tight">{{ libraryStats.playable }}</p>
          </div>
          <div class="rounded-[14px] border border-white/70 bg-white/64 p-3 shadow-sm">
            <p class="text-[11px] font-medium text-gray-500">文件夹</p>
            <p class="mt-1 text-2xl font-semibold tracking-tight">{{ libraryStats.folders }}</p>
          </div>
          <div class="rounded-[14px] border border-white/70 bg-white/64 p-3 shadow-sm">
            <p class="text-[11px] font-medium text-gray-500">图片</p>
            <p class="mt-1 text-2xl font-semibold tracking-tight">{{ libraryStats.images }}</p>
          </div>
        </div>

        <div class="mt-4 grid grid-cols-2 gap-2">
          <button
            @click="openRecommendationPanel"
            :disabled="dailyRecommendationVideos.length === 0"
            class="rounded-[12px] bg-[#0071e3] px-3 py-2.5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(0,113,227,0.22)] transition hover:bg-[#0077ed] disabled:cursor-not-allowed disabled:opacity-45"
          >
            每日推荐
          </button>
          <button
            @click="openFavoritesPanel"
            :disabled="favoriteRankingVideos.length === 0"
            class="rounded-[12px] border border-black/[0.08] bg-white/78 px-3 py-2.5 text-sm font-semibold text-[#1d1d1f] shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            我的最爱
          </button>
        </div>

        <div class="mt-7">
          <div class="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">分类</div>
          <div class="space-y-1">
            <button
              v-for="category in categories"
              :key="category.id"
              @click="handleCategoryChange(category.id)"
              class="group flex w-full items-center justify-between rounded-[10px] px-3 py-2.5 text-sm transition"
              :class="
                selectedCategory === category.id
                  ? 'bg-white text-[#0071e3] shadow-sm ring-1 ring-black/[0.04]'
                  : 'text-gray-600 hover:bg-white/62 hover:text-[#1d1d1f]'
              "
            >
              <span class="flex items-center gap-2">
                <span class="text-base leading-none">{{ category.icon }}</span>
                <span class="font-medium">{{ category.name }}</span>
              </span>
              <span
                class="rounded-full px-2 py-0.5 text-xs"
                :class="selectedCategory === category.id ? 'bg-[#0071e3]/10' : 'bg-gray-200/70 text-gray-500'"
              >
                {{ category.count }}
              </span>
            </button>
          </div>
        </div>

        <div class="mt-auto space-y-2 border-t border-black/[0.06] pt-4">
          <button
            @click="openSettings"
            class="flex w-full items-center gap-2 rounded-[10px] px-3 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-white/70 hover:text-[#1d1d1f]"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              ></path>
            </svg>
            设置
          </button>
        </div>
      </aside>

      <header
        class="sticky top-0 z-30 border-b border-white/70 bg-white/58 px-4 py-3 shadow-[0_1px_0_rgba(255,255,255,0.85)_inset] backdrop-blur-2xl sm:px-6"
      >
        <div class="flex items-center gap-3">
          <div class="flex min-w-0 items-center gap-3 xl:hidden">
            <div class="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#0071e3] text-white shadow-lg">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2.3"
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                ></path>
              </svg>
            </div>
            <div class="hidden min-w-0 sm:block">
              <h1 class="truncate text-sm font-semibold">澪妹管理大师</h1>
              <p class="truncate text-xs text-gray-500">{{ currentFolderName || 'Movie Library' }}</p>
            </div>
          </div>

          <div class="min-w-0 flex-1">
            <SearchBar @search="handleSearch" />
          </div>

          <button
            @click="openRecommendationPanel"
            :disabled="dailyRecommendationVideos.length === 0"
            class="hidden h-10 items-center gap-2 rounded-[10px] bg-[#0071e3] px-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(0,113,227,0.20)] transition hover:bg-[#0077ed] disabled:cursor-not-allowed disabled:opacity-45 lg:flex"
            title="每日推荐"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              ></path>
            </svg>
            推荐
          </button>
          <button
            @click="openFavoritesPanel"
            :disabled="favoriteRankingVideos.length === 0"
            class="hidden h-10 items-center gap-2 rounded-[10px] border border-black/[0.08] bg-white/78 px-3 text-sm font-semibold text-[#1d1d1f] shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45 lg:flex"
            title="我的最爱"
          >
            <svg class="h-4 w-4 text-[#ff9f0a]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            最爱
          </button>

          <button
            v-if="canGoBack"
            @click="goBack"
            class="hidden h-10 items-center gap-2 rounded-[10px] border border-black/[0.08] bg-white/78 px-3 text-sm font-medium text-[#1d1d1f] shadow-sm transition hover:bg-white md:flex"
            title="返回上一级"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
            </svg>
            返回
          </button>

          <div class="relative hidden md:block">
            <select
              v-model="sortBy"
              class="h-10 appearance-none rounded-[10px] border border-black/[0.08] bg-white/78 px-3 pr-8 text-sm font-medium text-[#1d1d1f] shadow-sm outline-none transition hover:bg-white focus:border-[#0071e3]/40 focus:ring-4 focus:ring-[#0071e3]/10"
              title="选择排序方式"
            >
              <option v-for="option in sortOptions" :key="option.value" :value="option.value">
                {{ option.icon }} {{ option.label }}
              </option>
            </select>
            <svg
              class="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </div>

          <CategoryFilter
            class="xl:hidden"
            :categories="categories"
            :selected-category="selectedCategory"
            @change="handleCategoryChange"
          />

          <button
            @click="importData"
            class="hidden h-10 w-10 items-center justify-center rounded-[10px] border border-black/[0.08] bg-white/78 text-[#0071e3] shadow-sm transition hover:bg-white md:flex"
            title="导入数据"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
              ></path>
            </svg>
          </button>
          <button
            @click="exportData"
            class="hidden h-10 w-10 items-center justify-center rounded-[10px] border border-black/[0.08] bg-white/78 text-[#5856d6] shadow-sm transition hover:bg-white md:flex"
            title="导出数据"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              ></path>
            </svg>
          </button>
          <button
            @click="refreshFolder"
            :disabled="isLoading || selectedFolders.length === 0"
            class="h-10 w-10 rounded-[10px] border border-black/[0.08] bg-white/78 text-[#34c759] shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
            title="刷新文件夹"
          >
            <span class="flex h-full w-full items-center justify-center">
              <svg
                class="h-5 w-5"
                :class="{ 'animate-spin': isLoading }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                ></path>
              </svg>
            </span>
          </button>
          <button
            @click="openSettings"
            class="h-10 w-10 rounded-[10px] border border-black/[0.08] bg-white/78 text-gray-600 shadow-sm transition hover:bg-white xl:hidden"
            title="设置"
          >
            <span class="flex h-full w-full items-center justify-center">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                ></path>
              </svg>
            </span>
          </button>
        </div>
      </header>

      <main class="flex min-h-[calc(100vh-66px)]" @contextmenu="handleContextMenu">
        <section
          class="min-w-0 flex-1 transition-all duration-300"
          :class="{
            'xl:pr-[33vw]': isLargeScreen && showPreviewPanel,
            'pr-0': !isLargeScreen || !showPreviewPanel
          }"
        >
          <div class="mx-auto max-w-[1560px] px-4 py-6 sm:px-6 lg:px-8">
            <section
              class="overflow-hidden rounded-[20px] border border-white/70 bg-white/58 shadow-[0_22px_70px_rgba(0,0,0,0.08)] backdrop-blur-2xl"
            >
              <div class="grid gap-0 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div class="p-6 sm:p-8">
                  <div class="flex flex-wrap items-start justify-between gap-5">
                    <div>
                      <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#0071e3]">Library</p>
                      <h2 class="mt-2 text-3xl font-semibold tracking-tight text-[#1d1d1f] sm:text-4xl">
                        {{ currentFolderName || '选择一个电影资料库' }}
                      </h2>
                      <p class="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
                        {{
                          selectedFolders.length > 0
                            ? '按文件夹、封面和标签浏览你的本地电影收藏。'
                            : '添加一个或多个文件夹，开始建立你的本地电影墙。'
                        }}
                      </p>
                      <div class="mt-5 flex flex-wrap gap-2">
                        <button
                          @click="openRecommendationPanel"
                          :disabled="dailyRecommendationVideos.length === 0"
                          class="rounded-[12px] bg-[#0071e3] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(0,113,227,0.22)] transition hover:bg-[#0077ed] disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          每日推荐
                        </button>
                        <button
                          @click="openFavoritesPanel"
                          :disabled="favoriteRankingVideos.length === 0"
                          class="rounded-[12px] border border-black/[0.08] bg-white px-4 py-2.5 text-sm font-semibold text-[#1d1d1f] shadow-sm transition hover:bg-[#f5f5f7] disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          我的最爱
                        </button>
                      </div>
                    </div>
                    <div class="grid min-w-[280px] grid-cols-3 gap-2">
                      <div class="rounded-[14px] bg-[#f5f5f7] px-4 py-3">
                        <p class="text-[11px] text-gray-500">全部</p>
                        <p class="mt-1 text-2xl font-semibold">{{ libraryStats.total }}</p>
                      </div>
                      <div class="rounded-[14px] bg-[#f5f5f7] px-4 py-3">
                        <p class="text-[11px] text-gray-500">视频</p>
                        <p class="mt-1 text-2xl font-semibold">{{ libraryStats.playable }}</p>
                      </div>
                      <div class="rounded-[14px] bg-[#f5f5f7] px-4 py-3">
                        <p class="text-[11px] text-gray-500">图片</p>
                        <p class="mt-1 text-2xl font-semibold">{{ libraryStats.images }}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="border-t border-black/[0.06] bg-white/44 p-5 lg:border-l lg:border-t-0">
                  <FolderSelector
                    :selected-folders="selectedFolders"
                    :is-loading="isLoading"
                    @select="selectFolders"
                    @refresh="refreshFolder"
                    @remove="removeFolder"
                  />
                </div>
              </div>
            </section>

            <div class="mt-6">
              <VideoGrid
                :videos="videoStore.videos"
                :search-query="searchQuery"
                :selected-category="selectedCategory"
                :sort-by="sortBy"
                :is-loading="isLoading"
                :current-folder="selectedFolders.length > 0 ? selectedFolders[0] : ''"
                :is-deepest-folder="isDeepestFolder"
                @video-update="handleVideoUpdate"
                @video-play="handleVideoPlay"
                @video-favorite="handleVideoFavorite"
                @folder-select="handleFolderSelect"
                @folder-preview="handleFolderPreview"
              />
            </div>
          </div>
        </section>

        <aside
          v-if="showPreviewPanel && selectedPreviewImage"
          class="fixed right-0 top-0 z-50 flex h-full flex-col border-l border-white/70 bg-white/86 shadow-[0_0_90px_rgba(0,0,0,0.20)] backdrop-blur-2xl"
          :class="{ 'w-[33vw] min-w-[420px]': isLargeScreen, 'w-full': !isLargeScreen }"
        >
          <div class="flex items-center justify-between border-b border-black/[0.06] px-5 py-4">
            <div class="min-w-0">
              <p class="text-xs font-medium text-gray-500">预览</p>
              <h3 class="truncate text-lg font-semibold text-[#1d1d1f]">
                {{ selectedPreviewImage.title || selectedPreviewImage.name }}
              </h3>
            </div>
            <button
              @click="closePreviewPanel"
              class="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5f5f7] text-gray-500 transition hover:bg-gray-200 hover:text-[#1d1d1f]"
              title="关闭预览"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <div class="flex-1 overflow-y-auto p-5">
            <div class="overflow-hidden rounded-[18px] border border-black/[0.06] bg-[#f5f5f7]">
              <div class="flex h-[54vh] items-center justify-center">
                <img
                  v-if="selectedPreviewImage.thumbnail && selectedPreviewImage.thumbnail !== '/folder-icon.svg'"
                  :src="getPreviewImageSrc(selectedPreviewImage)"
                  :alt="selectedPreviewImage.name"
                  class="h-full w-full object-contain"
                  @error="() => {}"
                />
                <div v-else class="flex flex-col items-center justify-center text-gray-400">
                  <svg class="mb-3 h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="1.5"
                      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                    ></path>
                  </svg>
                  <span class="text-sm">暂无预览图</span>
                </div>
              </div>
            </div>

            <div class="mt-5 rounded-[16px] border border-black/[0.06] bg-white/72 p-4">
              <div class="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                <svg class="h-4 w-4 text-[#0071e3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                  ></path>
                </svg>
                文件夹
              </div>
              <p class="break-all text-xs leading-5 text-gray-500">{{ selectedPreviewImage.path }}</p>
            </div>

            <div v-if="isDeepestFolder" class="mt-5 rounded-[16px] border border-black/[0.06] bg-white/72 p-4">
              <h4 class="mb-3 text-sm font-semibold text-[#1d1d1f]">标签管理</h4>
              <TagManager :folder-path="selectedPreviewImage.path" @tags-updated="handleFolderTagsUpdate" />
            </div>
          </div>

          <div class="border-t border-black/[0.06] bg-white/60 p-5">
            <div class="grid grid-cols-2 gap-2">
              <button
                @click="handleFolderSelect(selectedPreviewImage.path)"
                class="col-span-2 rounded-[12px] bg-[#0071e3] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(0,113,227,0.22)] transition hover:bg-[#0077ed]"
              >
                进入文件夹
              </button>
              <button
                @click="openFolderSelect(selectedPreviewImage.path)"
                class="rounded-[12px] border border-black/[0.08] bg-white px-4 py-3 text-sm font-semibold text-[#1d1d1f] transition hover:bg-[#f5f5f7]"
              >
                打开目录
              </button>
              <button
                @click="playFirstVideo"
                class="rounded-[12px] border border-black/[0.08] bg-white px-4 py-3 text-sm font-semibold text-[#1d1d1f] transition hover:bg-[#f5f5f7]"
              >
                播放视频
              </button>
              <button
                @click="deleteVideoFolder"
                class="col-span-2 rounded-[12px] bg-[#ff3b30] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#e7342a]"
              >
                删除视频
              </button>
            </div>
          </div>
        </aside>
      </main>
    </div>

    <div
      v-if="showContextMenu"
      class="context-menu fixed z-50 min-w-[150px] rounded-[12px] border border-white/70 bg-white/88 py-2 shadow-[0_22px_60px_rgba(0,0,0,0.18)] backdrop-blur-2xl"
      :style="{ left: contextMenuPosition.x + 'px', top: contextMenuPosition.y + 'px' }"
      @click.stop
    >
      <template v-if="contextMenuType === 'paste'">
        <button
          class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-100"
          @click="pasteClipboardImage"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            ></path>
          </svg>
          <span>粘贴图片</span>
        </button>
      </template>

      <template v-else-if="contextMenuType === 'image'">
        <button
          class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-100"
          @click="setAsCover"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            ></path>
          </svg>
          <span>设置为封面</span>
        </button>
        <div class="my-1 border-t border-gray-100"></div>
        <button
          class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-[#ff3b30] transition hover:bg-[#ff3b30]/10"
          @click="deleteImage"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            ></path>
          </svg>
          <span>删除</span>
        </button>
      </template>
    </div>

    <div
      v-if="showRecommendationPanel"
      class="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-slate-950/40 px-4 py-8 backdrop-blur-xl"
      @click.self="closeRecommendationPanel"
    >
      <!-- Header -->
      <div class="mb-6 flex w-full max-w-[420px] items-center justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#0071e3]">Daily Picks</p>
          <h3 class="text-xl font-semibold tracking-tight text-white">每日推荐</h3>
        </div>
        <button
          @click="closeRecommendationPanel"
          class="flex h-9 w-9 items-center justify-center rounded-full bg-white/12 text-white/70 transition hover:bg-white/20 hover:text-white"
          title="关闭"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <!-- Completion state -->
      <div v-if="recommendationComplete" class="flex w-full max-w-[420px] flex-col items-center rounded-[22px] bg-white/92 p-10 text-center shadow-[0_30px_90px_rgba(0,0,0,0.26)]">
        <div class="mb-4 text-5xl">🎉</div>
        <h3 class="text-2xl font-bold text-[#1d1d1f]">全部看完啦</h3>
        <p class="mt-2 text-sm text-gray-500">10 个视频已全部推荐完毕</p>
        <button
          @click="restartRecommendation"
          class="mt-6 rounded-[12px] bg-[#0071e3] px-8 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(0,113,227,0.26)] transition hover:bg-[#0077ed]"
        >
          再来一轮
        </button>
      </div>

      <!-- Card -->
      <div v-else-if="currentRecommendationVideo" class="w-full max-w-[420px]">
        <Transition
          :name="'card-slide-' + recommendationDirection"
          mode="out-in"
        >
          <div
            :key="recommendationIndex"
            class="overflow-hidden rounded-[22px] border border-white/70 bg-white/92 shadow-[0_30px_90px_rgba(0,0,0,0.26)]"
          >
            <!-- Image -->
            <div class="relative aspect-[16/10] overflow-hidden bg-[#f5f5f7]">
              <img
                v-if="getDiscoveryImageSrc(currentRecommendationVideo)"
                :src="getDiscoveryImageSrc(currentRecommendationVideo)"
                :alt="currentRecommendationVideo.title || currentRecommendationVideo.name"
                class="h-full w-full object-cover"
              />
              <div v-else class="flex h-full w-full items-center justify-center text-[#0071e3]">
                <svg class="h-20 w-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.7"
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  ></path>
                </svg>
              </div>
              <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/76 via-black/20 to-transparent p-5 text-white">
                <p class="line-clamp-2 text-2xl font-semibold leading-tight">
                  {{ currentRecommendationVideo.title || currentRecommendationVideo.name }}
                </p>
              </div>
            </div>

            <!-- Metadata -->
            <div class="px-5 pb-5 pt-4">
              <p class="truncate text-sm text-gray-500">{{ currentRecommendationVideo.path }}</p>
              <div class="mt-2 flex flex-wrap gap-2 text-xs">
                <span class="rounded-full bg-[#f5f5f7] px-2.5 py-1 font-medium text-gray-600">
                  {{ formatLastPlayed(currentRecommendationVideo) }}
                </span>
                <span class="rounded-full bg-[#0071e3]/10 px-2.5 py-1 font-semibold text-[#0071e3]">
                  {{ currentRecommendationVideo.playCount || 0 }} 次打开
                </span>
              </div>
            </div>
          </div>
        </Transition>

        <!-- Progress dots -->
        <div class="mt-5 flex justify-center gap-1.5">
          <div
            v-for="i in dailyRecommendationVideos.length"
            :key="i"
            class="h-1 rounded-full transition-all duration-300"
            :class="i - 1 < recommendationIndex ? 'bg-[#0071e3]/60 w-5' : i - 1 === recommendationIndex ? 'bg-[#0071e3] w-7' : 'bg-white/25 w-5'"
          />
        </div>
        <p class="mt-2 text-center text-xs text-white/50">{{ recommendationIndex + 1 }} / {{ dailyRecommendationVideos.length }}</p>

        <!-- Action buttons -->
        <div class="mt-5 flex justify-center gap-5">
          <button
            @click="rejectRecommendation"
            :disabled="recommendationAnimating"
            class="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/30 bg-white/10 text-2xl text-white backdrop-blur-sm transition hover:border-red-400 hover:bg-red-500/30 hover:text-red-300 disabled:opacity-40"
            title="拒绝"
          >
            <svg class="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
          <button
            @click="likeRecommendation"
            :disabled="recommendationAnimating"
            class="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/30 bg-white/10 text-2xl text-white backdrop-blur-sm transition hover:border-[#0071e3] hover:bg-[#0071e3]/30 hover:text-[#0071e3] disabled:opacity-40"
            title="喜欢"
          >
            <svg class="h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="w-full max-w-[420px] rounded-[22px] bg-white/92 px-6 py-14 text-center text-sm text-gray-500 shadow-[0_30px_90px_rgba(0,0,0,0.26)]">
        暂时没有可推荐的视频
      </div>
    </div>

    <div
      v-if="showFavoritesPanel"
      class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/28 px-4 py-6 backdrop-blur-xl"
      @click.self="closeFavoritesPanel"
    >
      <div class="w-full max-w-[760px] overflow-hidden rounded-[22px] border border-white/70 bg-white/92 shadow-[0_30px_90px_rgba(0,0,0,0.26)]">
        <div class="flex items-center justify-between border-b border-black/[0.06] px-5 py-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#0071e3]">Ranking</p>
            <h3 class="mt-1 text-xl font-semibold tracking-tight text-[#1d1d1f]">我的最爱</h3>
          </div>
          <button
            @click="closeFavoritesPanel"
            class="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5f5f7] text-gray-500 transition hover:bg-gray-200 hover:text-[#1d1d1f]"
            title="关闭"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <div class="max-h-[68vh] space-y-2 overflow-y-auto p-4">
          <button
            v-for="(video, index) in favoriteRankingVideos"
            :key="`favorite-rank-${video.id}`"
            @click="openDiscoveryVideo(video)"
            class="group grid w-full grid-cols-[36px_52px_minmax(0,1fr)_72px] items-center gap-3 rounded-[12px] border border-black/[0.06] bg-white/78 p-2.5 text-left shadow-sm transition hover:border-[#0071e3]/25 hover:bg-white hover:shadow-md"
          >
            <div
              class="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
              :class="index < 3 ? 'bg-[#0071e3] text-white' : 'bg-[#f5f5f7] text-gray-500'"
            >
              {{ index + 1 }}
            </div>
            <div class="h-12 w-12 overflow-hidden rounded-[9px] bg-[#f5f5f7]">
              <img
                v-if="getDiscoveryImageSrc(video)"
                :src="getDiscoveryImageSrc(video)"
                :alt="video.title || video.name"
                class="h-full w-full object-cover"
              />
            </div>
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-[#1d1d1f] group-hover:text-[#0071e3]">
                {{ video.title || video.name }}
              </p>
              <div class="mt-1.5 h-1.5 max-w-[220px] overflow-hidden rounded-full bg-[#f5f5f7]">
                <div class="h-full rounded-full bg-[#0071e3]" :style="{ width: getRankingWidth(video) }"></div>
              </div>
              <p class="mt-1 text-xs text-gray-500">{{ formatLastPlayed(video) }}</p>
            </div>
            <div class="text-right">
              <p class="text-base font-semibold text-[#1d1d1f]">{{ video.playCount || 0 }}</p>
              <p class="text-xs text-gray-500">打开</p>
            </div>
          </button>
        </div>
      </div>
    </div>

    <SettingsPanel v-if="showSettingsPanel" @close="closeSettings" />

    <div v-if="showUpdateProgress" class="update-progress">
      <p>正在更新：{{ formatPercent(progress.percent) }}%</p>
      <progress :value="progress.percent" max="100"></progress>
    </div>
  </div>
</template>

<style scoped>
.update-progress {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(29, 29, 31, 0.08);
  border-radius: 8px;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.14);
  backdrop-filter: blur(22px);
  text-align: center;
}
</style>

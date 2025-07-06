import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Video {
  id: string
  name?: string
  title: string
  path: string
  thumbnail?: string
  duration?: number
  size: number
  category?: string
  tags?: string[]
  playCount?: number
  rating?: number
  isFavorite?: boolean
  createdAt?: Date
  isFolder?: boolean
}

export interface Settings {
  lastSelectedFolder?: string
  theme?: 'light' | 'dark'
  autoScan?: boolean
  thumbnailQuality?: 'low' | 'medium' | 'high'
}

const STORAGE_KEY = 'video-manager-data'
const SETTINGS_KEY = 'video-manager-settings'

export const useVideoStore = defineStore('video', () => {
  // State
  const videos = ref<Video[]>([])
  const folders = ref<string[]>([])
  const settings = ref<Settings>({
    lastSelectedFolder: '',
    theme: 'light',
    autoScan: false,
    thumbnailQuality: 'medium'
  })

  // Computed
  const videoCount = computed(() => videos.value.length)
  const favoriteVideos = computed(() => videos.value.filter(v => v.isFavorite))
  const videosByCategory = computed(() => {
    const categories: Record<string, Video[]> = {}
    videos.value.forEach(video => {
      const category = video.category || 'other'
      if (!categories[category]) {
        categories[category] = []
      }
      categories[category].push(video)
    })
    return categories
  })

  // Actions
  const loadData = () => {
    try {
      const storedVideos = localStorage.getItem(STORAGE_KEY)
      if (storedVideos) {
        const parsedData = JSON.parse(storedVideos)
        videos.value = parsedData.videos || []
        folders.value = parsedData.folders || []
      }

      const storedSettings = localStorage.getItem(SETTINGS_KEY)
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings)
        settings.value = { ...settings.value, ...parsedSettings }
      }
    } catch (error) {
      console.error('加载数据失败:', error)
    }
  }

  const saveData = () => {
    try {
      const data = {
        videos: videos.value,
        folders: folders.value
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings.value))
    } catch (error) {
      console.error('保存数据失败:', error)
    }
  }

  const addVideo = (video: Video) => {
    const existingIndex = videos.value.findIndex(v => v.path === video.path)
    if (existingIndex === -1) {
      videos.value.push(video)
      saveData()
    }
  }

  const updateVideo = (id: string, updates: Partial<Video>): Video | null => {
    const index = videos.value.findIndex(v => v.id === id)
    if (index === -1) return null

    videos.value[index] = { ...videos.value[index], ...updates }
    saveData()
    return videos.value[index]
  }

  const removeVideo = (id: string): boolean => {
    const index = videos.value.findIndex(v => v.id === id)
    if (index === -1) return false

    videos.value.splice(index, 1)
    saveData()
    return true
  }

  const clearVideos = () => {
    videos.value = []
    saveData()
  }

  const toggleFavorite = (id: string): Video | null => {
    const video = videos.value.find(v => v.id === id)
    if (!video) return null

    video.isFavorite = !video.isFavorite
    saveData()
    return video
  }

  const incrementPlayCount = (id: string): Video | null => {
    const video = videos.value.find(v => v.id === id)
    if (!video) return null

    video.playCount = (video.playCount || 0) + 1
    saveData()
    return video
  }

  const updateVideoThumbnail = (id: string, thumbnailPath: string): Video | null => {
    return updateVideo(id, { thumbnail: thumbnailPath })
  }

  const addFolder = (folderPath: string) => {
    if (!folders.value.includes(folderPath)) {
      folders.value.push(folderPath)
      saveData()
    }
  }

  const removeFolder = (folderPath: string): boolean => {
    const index = folders.value.indexOf(folderPath)
    if (index === -1) return false

    folders.value.splice(index, 1)
    saveData()
    return true
  }

  const updateSettings = (newSettings: Partial<Settings>) => {
    settings.value = { ...settings.value, ...newSettings }
    saveData()
  }

  const searchVideos = (query: string, category?: string): Video[] => {
    let results = videos.value

    // 按分类筛选
    if (category && category !== 'all') {
      results = results.filter(v => v.category === category)
    }

    // 按关键词搜索
    if (query.trim()) {
      const searchTerm = query.toLowerCase()
      results = results.filter(v => 
        v.title.toLowerCase().includes(searchTerm) ||
        v.tags?.some(tag => tag.toLowerCase().includes(searchTerm)) ||
        v.category?.toLowerCase().includes(searchTerm)
      )
    }

    return results
  }

  const getVideosByCategory = (category: string): Video[] => {
    if (category === 'all') return videos.value
    return videos.value.filter(v => v.category === category)
  }

  const exportData = () => {
    return {
      videos: videos.value,
      folders: folders.value,
      settings: settings.value,
      exportDate: new Date().toISOString()
    }
  }

  const importData = (data: any) => {
    try {
      if (data.videos) videos.value = data.videos
      if (data.folders) folders.value = data.folders
      if (data.settings) settings.value = { ...settings.value, ...data.settings }
      saveData()
      return true
    } catch (error) {
      console.error('导入数据失败:', error)
      return false
    }
  }

  // 初始化数据
  loadData()

  return {
    // State
    videos,
    folders,
    settings,
    
    // Computed
    videoCount,
    favoriteVideos,
    videosByCategory,
    
    // Actions
    loadData,
    saveData,
    addVideo,
    updateVideo,
    removeVideo,
    clearVideos,
    toggleFavorite,
    incrementPlayCount,
    updateVideoThumbnail,
    addFolder,
    removeFolder,
    updateSettings,
    searchVideos,
    getVideosByCategory,
    exportData,
    importData
  }
})
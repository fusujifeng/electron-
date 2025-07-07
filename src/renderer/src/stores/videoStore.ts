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

export interface FolderTags {
  [folderPath: string]: string[]
}

const STORAGE_KEY = 'feng-video-player-videos'
const SETTINGS_KEY = 'feng-video-player-settings'
const FOLDER_TAGS_KEY = 'feng-video-player-folder-tags'

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
  const folderTags = ref<FolderTags>({})

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

      const storedFolderTags = localStorage.getItem(FOLDER_TAGS_KEY)
      if (storedFolderTags) {
        const parsedFolderTags = JSON.parse(storedFolderTags)
        folderTags.value = parsedFolderTags || {}
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
      localStorage.setItem(FOLDER_TAGS_KEY, JSON.stringify(folderTags.value))
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
      results = results.filter(v => {
        // 搜索标题
        const titleMatch = v.title.toLowerCase().includes(searchTerm)
        
        // 搜索视频自身的tags
        const videoTagsMatch = v.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
        
        // 搜索文件夹的tags（如果是文件夹）
        const folderTagsMatch = v.isFolder && folderTags.value[v.path]?.some(tag => tag.toLowerCase().includes(searchTerm))
        
        // 搜索分类
        const categoryMatch = v.category?.toLowerCase().includes(searchTerm)
        
        return titleMatch || videoTagsMatch || folderTagsMatch || categoryMatch
      })
    }

    return results
  }

  const getVideosByCategory = (category: string): Video[] => {
    if (category === 'all') return videos.value
    return videos.value.filter(v => v.category === category)
  }

  // 文件夹tag管理
  const getFolderTags = (folderPath: string): string[] => {
    return folderTags.value[folderPath] || []
  }

  const setFolderTags = (folderPath: string, tags: string[]) => {
    folderTags.value[folderPath] = [...tags]
    saveData()
  }

  const addFolderTag = (folderPath: string, tag: string) => {
    if (!folderTags.value[folderPath]) {
      folderTags.value[folderPath] = []
    }
    if (!folderTags.value[folderPath].includes(tag)) {
      folderTags.value[folderPath].push(tag)
      saveData()
    }
  }

  const removeFolderTag = (folderPath: string, tag: string) => {
    if (folderTags.value[folderPath]) {
      const index = folderTags.value[folderPath].indexOf(tag)
      if (index > -1) {
        folderTags.value[folderPath].splice(index, 1)
        saveData()
      }
    }
  }

  const exportData = () => {
    return {
      videos: videos.value,
      folders: folders.value,
      settings: settings.value,
      folderTags: folderTags.value,
      exportDate: new Date().toISOString()
    }
  }

  const importData = (data: any) => {
    try {
      if (data.videos) videos.value = data.videos
      if (data.folders) folders.value = data.folders
      if (data.settings) settings.value = { ...settings.value, ...data.settings }
      if (data.folderTags) folderTags.value = data.folderTags
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
    folderTags,
    
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
    importData,
    
    // Folder tag methods
    getFolderTags,
    setFolderTags,
    addFolderTag,
    removeFolderTag
  }
})
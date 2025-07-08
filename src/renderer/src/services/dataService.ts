import { ref, reactive } from 'vue'

export interface Video {
  id: string
  title: string
  path: string
  thumbnail: string
  duration: number
  size: number
  category: string
  tags: string[]
  createdAt: Date
  lastPlayed?: Date
  playCount: number
  rating: number
  isFavorite?: boolean
  isFolder?: boolean
}

export interface VideoDatabase {
  videos: Video[]
  folders: string[]
  settings: {
    lastSelectedFolder?: string
    viewMode?: 'grid' | 'list'
    sortBy?: 'name' | 'date' | 'size' | 'duration'
    sortOrder?: 'asc' | 'desc'
  }
}

class DataService {
  private readonly STORAGE_KEY = 'feng-video-player-data'
  private data: VideoDatabase = {
    videos: [],
    folders: [],
    settings: {
      viewMode: 'grid',
      sortBy: 'name',
      sortOrder: 'asc'
    }
  }

  constructor() {
    this.loadData()
  }

  // 加载数据
  private loadData(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        const parsedData = JSON.parse(stored)
        this.data = { ...this.data, ...parsedData }
      }
    } catch (error) {
      console.error('加载数据失败:', error)
    }
  }

  // 保存数据
  private saveData(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data))
    } catch (error) {
      console.error('保存数据失败:', error)
    }
  }

  // 获取所有视频
  getAllVideos(): Video[] {
    return this.data.videos
  }

  // 清空所有视频
  clearVideos(): void {
    this.data.videos = []
    this.saveData()
  }

  // 添加视频
  addVideo(video: Video): Video {
    this.data.videos.push(video)
    this.saveData()
    return video
  }

  // 更新视频信息
  updateVideo(id: string, updates: Partial<Video>): Video | null {
    const index = this.data.videos.findIndex(v => v.id === id)
    if (index === -1) return null

    this.data.videos[index] = { ...this.data.videos[index], ...updates }
    this.saveData()
    return this.data.videos[index]
  }

  // 删除视频
  deleteVideo(id: string): boolean {
    const index = this.data.videos.findIndex(v => v.id === id)
    if (index === -1) return false

    this.data.videos.splice(index, 1)
    this.saveData()
    return true
  }

  // 更新视频预览图
  updateVideoThumbnail(id: string, thumbnailPath: string): Video | null {
    return this.updateVideo(id, { thumbnail: thumbnailPath })
  }

  // 移除视频预览图
  removeVideoThumbnail(id: string): Video | null {
    return this.updateVideo(id, { thumbnail: '' })
  }

  // 增加播放次数
  incrementPlayCount(id: string): Video | null {
    const video = this.data.videos.find(v => v.id === id)
    if (!video) return null

    return this.updateVideo(id, {
      playCount: (video.playCount || 0) + 1,
      lastPlayed: new Date()
    })
  }

  // 切换收藏状态
  toggleFavorite(id: string): Video | null {
    const video = this.data.videos.find(v => v.id === id)
    if (!video) return null

    return this.updateVideo(id, { isFavorite: !video.isFavorite })
  }

  // 获取文件夹列表
  getFolders(): string[] {
    return this.data.folders
  }

  // 添加文件夹
  addFolder(folderPath: string): void {
    if (!this.data.folders.includes(folderPath)) {
      this.data.folders.push(folderPath)
      this.saveData()
    }
  }

  // 移除文件夹
  removeFolder(folderPath: string): void {
    const index = this.data.folders.indexOf(folderPath)
    if (index > -1) {
      this.data.folders.splice(index, 1)
      // 同时移除该文件夹下的所有视频
      this.data.videos = this.data.videos.filter(v => !v.path.startsWith(folderPath))
      this.saveData()
    }
  }

  // 获取设置
  getSettings() {
    return this.data.settings
  }

  // 更新设置
  updateSettings(settings: Partial<VideoDatabase['settings']>): void {
    this.data.settings = { ...this.data.settings, ...settings }
    this.saveData()
  }

  // 搜索视频
  searchVideos(query: string, category?: string): Video[] {
    let results = this.data.videos

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

  // 导出数据
  exportData(): string {
    return JSON.stringify(this.data, null, 2)
  }

  // 导入数据
  importData(jsonData: string): boolean {
    try {
      const importedData = JSON.parse(jsonData)
      this.data = { ...this.data, ...importedData }
      this.saveData()
      return true
    } catch (error) {
      console.error('导入数据失败:', error)
      return false
    }
  }

  // 清空所有数据
  clearAllData(): void {
    this.data = {
      videos: [],
      folders: [],
      settings: {
        viewMode: 'grid',
        sortBy: 'name',
        sortOrder: 'asc'
      }
    }
    this.saveData()
  }




}

// 创建单例实例
export const dataService = new DataService()

// 导出响应式数据
export const useVideoData = () => {
  const videos = ref<Video[]>(dataService.getAllVideos())
  const folders = ref<string[]>(dataService.getFolders())
  const settings = reactive(dataService.getSettings())
  const filteredVideos = ref<Video[]>(dataService.getAllVideos())

  // 刷新数据
  const refreshData = () => {
    videos.value = dataService.getAllVideos()
    folders.value = dataService.getFolders()
    filteredVideos.value = dataService.getAllVideos()
    Object.assign(settings, dataService.getSettings())
  }

  return {
    videos,
    folders,
    settings,
    filteredVideos,
    refreshData,
    dataService
  }
}
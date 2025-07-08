import { ref } from 'vue'

// 文件夹标签数据接口
export interface FolderTagData {
  id: string // 唯一标识符
  folderPath: string // 当前文件夹路径
  folderName: string // 文件夹名称
  tags: string[] // 标签列表
  createdAt: string // 创建时间
  updatedAt: string // 更新时间
  lastAccessPath?: string // 最后访问的路径（用于路径变更检测）
}

// 全局标签数据库接口
export interface TagDatabase {
  folders: FolderTagData[]
  globalTags: string[] // 全局标签池
  lastSync: string // 最后同步时间
}

// 本地JSON文件数据接口
export interface LocalTagFile {
  folderPath: string
  folderName: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

class TagDataService {
  private readonly GLOBAL_STORAGE_KEY = 'feng-video-player-tag-database'
  private readonly LOCAL_STORAGE_PREFIX = 'feng-tag-'
  
  private globalDatabase = ref<TagDatabase>({
    folders: [],
    globalTags: [],
    lastSync: new Date().toISOString()
  })

  constructor() {
    this.loadGlobalDatabase()
    this.startPeriodicSync()
  }

  // 加载全局数据库
  private loadGlobalDatabase(): void {
    try {
      const stored = localStorage.getItem(this.GLOBAL_STORAGE_KEY)
      if (stored) {
        const parsedData = JSON.parse(stored)
        this.globalDatabase.value = { ...this.globalDatabase.value, ...parsedData }
      }
    } catch (error) {
      console.error('加载全局标签数据库失败:', error)
    }
  }

  // 保存全局数据库
  private saveGlobalDatabase(): void {
    try {
      this.globalDatabase.value.lastSync = new Date().toISOString()
      localStorage.setItem(this.GLOBAL_STORAGE_KEY, JSON.stringify(this.globalDatabase.value))
    } catch (error) {
      console.error('保存全局标签数据库失败:', error)
    }
  }

  // 生成文件夹唯一ID
  private generateFolderId(folderPath: string, folderName: string): string {
    const timestamp = Date.now()
    const hash = this.simpleHash(folderPath + folderName)
    return `folder_${hash}_${timestamp}`
  }

  // 简单哈希函数
  private simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转换为32位整数
    }
    return Math.abs(hash).toString(36)
  }

  // 获取本地存储key
  private getLocalStorageKey(folderPath: string): string {
    const hash = this.simpleHash(folderPath)
    return `${this.LOCAL_STORAGE_PREFIX}${hash}`
  }

  // 保存本地JSON文件数据
  private saveLocalTagFile(folderPath: string, data: LocalTagFile): void {
    try {
      const key = this.getLocalStorageKey(folderPath)
      localStorage.setItem(key, JSON.stringify(data))
    } catch (error) {
      console.error('保存本地标签文件失败:', error)
    }
  }

  // 加载本地JSON文件数据
  private loadLocalTagFile(folderPath: string): LocalTagFile | null {
    try {
      const key = this.getLocalStorageKey(folderPath)
      const stored = localStorage.getItem(key)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (error) {
      console.error('加载本地标签文件失败:', error)
    }
    return null
  }

  // 获取文件夹标签（优先从本地，备用全局）
  getFolderTags(folderPath: string): string[] {
    // 1. 优先从本地JSON文件读取
    const localData = this.loadLocalTagFile(folderPath)
    if (localData) {
      return localData.tags
    }

    // 2. 从全局数据库查找（按路径匹配）
    const globalData = this.globalDatabase.value.folders.find(f => f.folderPath === folderPath)
    if (globalData) {
      return globalData.tags
    }

    // 3. 尝试按文件夹名称匹配（处理路径变更情况）
    const folderName = this.extractFolderName(folderPath)
    const nameMatch = this.globalDatabase.value.folders.find(f => 
      f.folderName === folderName && f.folderPath !== folderPath
    )
    if (nameMatch) {
      // 找到名称匹配的文件夹，可能是路径变更了
      console.log(`检测到文件夹路径变更: ${nameMatch.folderPath} -> ${folderPath}`)
      // 更新路径并返回标签
      this.updateFolderPath(nameMatch.id, folderPath)
      return nameMatch.tags
    }

    return []
  }

  // 设置文件夹标签（双重保存）
  setFolderTags(folderPath: string, tags: string[]): void {
    const folderName = this.extractFolderName(folderPath)
    const now = new Date().toISOString()

    // 1. 保存到本地JSON文件
    const localData: LocalTagFile = {
      folderPath,
      folderName,
      tags: [...tags],
      createdAt: now,
      updatedAt: now
    }
    this.saveLocalTagFile(folderPath, localData)

    // 2. 保存到全局数据库
    let globalData = this.globalDatabase.value.folders.find(f => f.folderPath === folderPath)
    
    if (globalData) {
      // 更新现有记录
      globalData.tags = [...tags]
      globalData.updatedAt = now
      globalData.lastAccessPath = folderPath
    } else {
      // 检查是否有同名文件夹（可能是路径变更）
      const nameMatch = this.globalDatabase.value.folders.find(f => f.folderName === folderName)
      if (nameMatch) {
        // 更新路径
        nameMatch.folderPath = folderPath
        nameMatch.tags = [...tags]
        nameMatch.updatedAt = now
        nameMatch.lastAccessPath = folderPath
      } else {
        // 创建新记录
        const newData: FolderTagData = {
          id: this.generateFolderId(folderPath, folderName),
          folderPath,
          folderName,
          tags: [...tags],
          createdAt: now,
          updatedAt: now,
          lastAccessPath: folderPath
        }
        this.globalDatabase.value.folders.push(newData)
      }
    }

    // 3. 更新全局标签池
    this.updateGlobalTags(tags)
    
    // 4. 保存全局数据库
    this.saveGlobalDatabase()
  }

  // 添加文件夹标签
  addFolderTag(folderPath: string, tag: string): void {
    const currentTags = this.getFolderTags(folderPath)
    if (!currentTags.includes(tag)) {
      currentTags.push(tag)
      this.setFolderTags(folderPath, currentTags)
    }
  }

  // 移除文件夹标签
  removeFolderTag(folderPath: string, tag: string): void {
    const currentTags = this.getFolderTags(folderPath)
    const index = currentTags.indexOf(tag)
    if (index > -1) {
      currentTags.splice(index, 1)
      this.setFolderTags(folderPath, currentTags)
    }
  }

  // 更新文件夹路径
  private updateFolderPath(folderId: string, newPath: string): void {
    const folder = this.globalDatabase.value.folders.find(f => f.id === folderId)
    if (folder) {
      const oldPath = folder.folderPath
      folder.folderPath = newPath
      folder.lastAccessPath = newPath
      folder.updatedAt = new Date().toISOString()
      
      // 同时更新本地存储
      const localData = this.loadLocalTagFile(oldPath)
      if (localData) {
        localData.folderPath = newPath
        localData.updatedAt = folder.updatedAt
        this.saveLocalTagFile(newPath, localData)
        // 删除旧的本地存储
        const oldKey = this.getLocalStorageKey(oldPath)
        localStorage.removeItem(oldKey)
      }
      
      this.saveGlobalDatabase()
    }
  }

  // 提取文件夹名称
  private extractFolderName(folderPath: string): string {
    return folderPath.split(/[\\/]/).pop() || folderPath
  }

  // 更新全局标签池
  private updateGlobalTags(tags: string[]): void {
    tags.forEach(tag => {
      if (!this.globalDatabase.value.globalTags.includes(tag)) {
        this.globalDatabase.value.globalTags.push(tag)
      }
    })
  }

  // 获取全局标签池
  getGlobalTags(): string[] {
    return this.globalDatabase.value.globalTags
  }

  // 获取常用标签（按使用频率排序）
  getCommonTags(limit: number = 10): string[] {
    const tagCount: Record<string, number> = {}
    
    this.globalDatabase.value.folders.forEach(folder => {
      folder.tags.forEach(tag => {
        tagCount[tag] = (tagCount[tag] || 0) + 1
      })
    })
    
    return Object.entries(tagCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([tag]) => tag)
  }

  // 数据同步（检查本地和全局数据一致性）
  syncData(): void {
    console.log('开始同步标签数据...')
    
    // 遍历全局数据库中的所有文件夹
    this.globalDatabase.value.folders.forEach(globalFolder => {
      const localData = this.loadLocalTagFile(globalFolder.folderPath)
      
      if (!localData) {
        // 本地没有数据，从全局恢复
        const localData: LocalTagFile = {
          folderPath: globalFolder.folderPath,
          folderName: globalFolder.folderName,
          tags: [...globalFolder.tags],
          createdAt: globalFolder.createdAt,
          updatedAt: globalFolder.updatedAt
        }
        this.saveLocalTagFile(globalFolder.folderPath, localData)
      } else {
        // 比较更新时间，使用最新的数据
        const globalTime = new Date(globalFolder.updatedAt).getTime()
        const localTime = new Date(localData.updatedAt).getTime()
        
        if (globalTime > localTime) {
          // 全局数据更新，更新本地
          localData.tags = [...globalFolder.tags]
          localData.updatedAt = globalFolder.updatedAt
          this.saveLocalTagFile(globalFolder.folderPath, localData)
        } else if (localTime > globalTime) {
          // 本地数据更新，更新全局
          globalFolder.tags = [...localData.tags]
          globalFolder.updatedAt = localData.updatedAt
        }
      }
    })
    
    this.saveGlobalDatabase()
    console.log('标签数据同步完成')
  }

  // 定期同步（每5分钟）
  private startPeriodicSync(): void {
    setInterval(() => {
      this.syncData()
    }, 5 * 60 * 1000) // 5分钟
  }

  // 导出数据
  exportData() {
    return {
      globalDatabase: this.globalDatabase.value,
      exportDate: new Date().toISOString()
    }
  }

  // 导入数据
  importData(data: any): boolean {
    try {
      if (data.globalDatabase) {
        this.globalDatabase.value = data.globalDatabase
        this.saveGlobalDatabase()
        
        // 同步到本地存储
        this.syncData()
        return true
      }
      return false
    } catch (error) {
      console.error('导入标签数据失败:', error)
      return false
    }
  }

  // 清理无效数据
  cleanupInvalidData(): void {
    // 移除超过30天未访问的数据
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    
    this.globalDatabase.value.folders = this.globalDatabase.value.folders.filter(folder => {
      const lastAccess = new Date(folder.updatedAt)
      return lastAccess > thirtyDaysAgo
    })
    
    this.saveGlobalDatabase()
  }

  // 搜索文件夹（按标签）
  searchFoldersByTag(tag: string): FolderTagData[] {
    return this.globalDatabase.value.folders.filter(folder => 
      folder.tags.includes(tag)
    )
  }

  // 获取统计信息
  getStatistics() {
    return {
      totalFolders: this.globalDatabase.value.folders.length,
      totalTags: this.globalDatabase.value.globalTags.length,
      lastSync: this.globalDatabase.value.lastSync,
      commonTags: this.getCommonTags(5)
    }
  }
}

// 创建单例实例
export const tagDataService = new TagDataService()
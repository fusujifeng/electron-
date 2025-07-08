import { tagDataService } from '../services/tagDataService'

// 数据迁移工具
export class TagMigrationTool {
  constructor() {
    // 移除videoStore依赖，直接使用tagDataService
  }

  // 检查是否需要迁移
  needsMigration(): boolean {
    try {
      // 检查是否存在旧格式的folderTags数据
      const oldData = localStorage.getItem('feng-video-player-folder-tags')
      if (!oldData) return false

      const parsedData = JSON.parse(oldData)
      const hasOldData = Object.keys(parsedData).length > 0

      // 检查新格式是否已有数据
      const newData = localStorage.getItem('feng-video-player-tag-database')
      const hasNewData = newData && JSON.parse(newData).folders.length > 0

      // 如果有旧数据但没有新数据，则需要迁移
      return hasOldData && !hasNewData
    } catch (error) {
      console.error('检查迁移状态失败:', error)
      return false
    }
  }

  // 执行数据迁移
  async migrate(): Promise<{ success: boolean; migratedCount: number; errors: string[] }> {
    const result = {
      success: false,
      migratedCount: 0,
      errors: [] as string[]
    }

    try {
      console.log('开始迁移标签数据...')

      // 读取旧格式数据
      const oldDataStr = localStorage.getItem('feng-video-player-folder-tags')
      if (!oldDataStr) {
        result.errors.push('未找到旧格式标签数据')
        return result
      }

      const oldData = JSON.parse(oldDataStr)
      console.log('发现旧格式数据:', Object.keys(oldData).length, '个文件夹')

      // 迁移每个文件夹的标签
      for (const [folderPath, tags] of Object.entries(oldData)) {
        try {
          if (Array.isArray(tags) && tags.length > 0) {
            // 使用新的标签服务保存数据
            tagDataService.setFolderTags(folderPath, tags as string[])
            result.migratedCount++
            console.log(`迁移文件夹: ${folderPath}, 标签: ${(tags as string[]).join(', ')}`)
          }
        } catch (error) {
          const errorMsg = `迁移文件夹 ${folderPath} 失败: ${error}`
          result.errors.push(errorMsg)
          console.error(errorMsg)
        }
      }

      // 创建备份
      this.createBackup(oldData)

      result.success = result.migratedCount > 0
      console.log(`迁移完成: 成功迁移 ${result.migratedCount} 个文件夹`)

      if (result.errors.length > 0) {
        console.warn('迁移过程中出现错误:', result.errors)
      }

    } catch (error) {
      const errorMsg = `迁移过程失败: ${error}`
      result.errors.push(errorMsg)
      console.error(errorMsg)
    }

    return result
  }

  // 创建旧数据备份
  private createBackup(oldData: any): void {
    try {
      const backup = {
        data: oldData,
        backupDate: new Date().toISOString(),
        version: '1.0'
      }
      localStorage.setItem('feng-video-player-folder-tags-backup', JSON.stringify(backup))
      console.log('已创建旧数据备份')
    } catch (error) {
      console.error('创建备份失败:', error)
    }
  }

  // 验证迁移结果
  validateMigration(): { isValid: boolean; details: string[] } {
    const details: string[] = []
    let isValid = true

    try {
      // 检查旧数据
      const oldDataStr = localStorage.getItem('feng-video-player-folder-tags')
      if (!oldDataStr) {
        details.push('未找到旧格式数据')
        return { isValid: false, details }
      }

      const oldData = JSON.parse(oldDataStr)
      const oldFolderCount = Object.keys(oldData).length
      details.push(`旧格式数据: ${oldFolderCount} 个文件夹`)

      // 检查新数据
      const newDataStr = localStorage.getItem('feng-video-player-tag-database')
      if (!newDataStr) {
        details.push('未找到新格式数据')
        isValid = false
        return { isValid, details }
      }

      const newData = JSON.parse(newDataStr)
      const newFolderCount = newData.folders.length
      details.push(`新格式数据: ${newFolderCount} 个文件夹`)

      // 验证数据一致性
      let matchCount = 0
      for (const [folderPath, oldTags] of Object.entries(oldData)) {
        const newTags = tagDataService.getFolderTags(folderPath)
        if (Array.isArray(oldTags) && Array.isArray(newTags)) {
          const oldSet = new Set(oldTags as string[])
          const newSet = new Set(newTags)
          if (oldSet.size === newSet.size && [...oldSet].every(tag => newSet.has(tag))) {
            matchCount++
          } else {
            details.push(`文件夹 ${folderPath} 标签不匹配`)
            isValid = false
          }
        }
      }

      details.push(`标签匹配: ${matchCount}/${oldFolderCount} 个文件夹`)

      if (matchCount !== oldFolderCount) {
        isValid = false
      }

    } catch (error) {
      details.push(`验证过程出错: ${error}`)
      isValid = false
    }

    return { isValid, details }
  }

  // 回滚迁移（从备份恢复）
  rollback(): { success: boolean; message: string } {
    try {
      const backupStr = localStorage.getItem('feng-video-player-folder-tags-backup')
      if (!backupStr) {
        return { success: false, message: '未找到备份数据' }
      }

      const backup = JSON.parse(backupStr)
      localStorage.setItem('feng-video-player-folder-tags', JSON.stringify(backup.data))
      
      // 清除新格式数据
      localStorage.removeItem('feng-video-player-tag-database')
      
      return { success: true, message: '已从备份恢复旧格式数据' }
    } catch (error) {
      return { success: false, message: `回滚失败: ${error}` }
    }
  }

  // 清理备份数据
  cleanupBackup(): void {
    try {
      localStorage.removeItem('feng-video-player-folder-tags-backup')
      console.log('已清理备份数据')
    } catch (error) {
      console.error('清理备份失败:', error)
    }
  }

  // 获取迁移状态报告
  getStatusReport(): {
    needsMigration: boolean
    hasOldData: boolean
    hasNewData: boolean
    hasBackup: boolean
    oldDataCount: number
    newDataCount: number
  } {
    let hasOldData = false
    let hasNewData = false
    let hasBackup = false
    let oldDataCount = 0
    let newDataCount = 0

    try {
      // 检查旧数据
      const oldDataStr = localStorage.getItem('feng-video-player-folder-tags')
      if (oldDataStr) {
        const oldData = JSON.parse(oldDataStr)
        hasOldData = Object.keys(oldData).length > 0
        oldDataCount = Object.keys(oldData).length
      }

      // 检查新数据
      const newDataStr = localStorage.getItem('feng-video-player-tag-database')
      if (newDataStr) {
        const newData = JSON.parse(newDataStr)
        hasNewData = newData.folders.length > 0
        newDataCount = newData.folders.length
      }

      // 检查备份
      const backupStr = localStorage.getItem('feng-video-player-folder-tags-backup')
      hasBackup = !!backupStr

    } catch (error) {
      console.error('获取状态报告失败:', error)
    }

    return {
      needsMigration: this.needsMigration(),
      hasOldData,
      hasNewData,
      hasBackup,
      oldDataCount,
      newDataCount
    }
  }
}

// 创建单例实例
export const tagMigrationTool = new TagMigrationTool()

// 自动迁移函数（在应用启动时调用）
export async function autoMigrate(): Promise<void> {
  if (tagMigrationTool.needsMigration()) {
    console.log('检测到需要迁移标签数据，开始自动迁移...')
    
    const result = await tagMigrationTool.migrate()
    
    if (result.success) {
      console.log(`自动迁移成功: 迁移了 ${result.migratedCount} 个文件夹的标签数据`)
      
      // 验证迁移结果
      const validation = tagMigrationTool.validateMigration()
      if (validation.isValid) {
        console.log('迁移验证通过')
      } else {
        console.warn('迁移验证失败:', validation.details)
      }
    } else {
      console.error('自动迁移失败:', result.errors)
    }
  }
}
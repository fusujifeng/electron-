import { autoUpdater } from 'electron-updater'
import { dialog, BrowserWindow } from 'electron'

/**
 * 自动更新管理器
 * 负责处理应用程序的自动更新功能
 */
class AutoUpdateManager {
  private mainWindow: BrowserWindow | null = null
  private isInitialized: boolean = false

  constructor() {
    this.setupLogger()
  }

  /**
   * 设置更新日志
   */
  setupLogger() {
    try {
      if (autoUpdater.logger && (autoUpdater.logger as any).transports) {
        (autoUpdater.logger as any).transports.file.level = 'info'
      }
    } catch (error) {
      console.warn('Failed to setup auto-updater logger:', error instanceof Error ? error.message : String(error))
    }
  }

  /**
   * 初始化自动更新
   * @param {BrowserWindow} mainWindow - 主窗口实例
   * @param {Object} config - 更新配置
   */
  initialize(mainWindow: BrowserWindow, config: any = {}) {
    if (this.isInitialized) {
      console.warn('AutoUpdateManager already initialized')
      return
    }

    this.mainWindow = mainWindow
    this.setupFeedURL(config)
    this.setupEventListeners()
    this.isInitialized = true
  }

  /**
   * 设置更新源
   * @param {Object} config - 更新配置
   */
  setupFeedURL(config: any) {
    const defaultConfig = {
      provider: 'github',
      owner: 'fusujifeng',
      repo: 'lingmei-videoManager',
      releaseType: 'release'
    }

    const feedConfig = { ...defaultConfig, ...config }

    try {
      autoUpdater.setFeedURL(feedConfig)
    } catch (error) {
      console.error('Failed to set feed URL:', error instanceof Error ? error.message : String(error))
    }
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // 发现可用更新
    autoUpdater.on('update-available', (info) => {
      this.handleUpdateAvailable(info)
    })

    // 下载进度
    autoUpdater.on('download-progress', (progressObj) => {
      this.handleDownloadProgress(progressObj)
    })

    // 更新下载完成
    autoUpdater.on('update-downloaded', (info) => {
      this.handleUpdateDownloaded(info)
    })

    // 无可用更新
    autoUpdater.on('update-not-available', () => {
      this.handleUpdateNotAvailable()
    })

    // 更新错误
    autoUpdater.on('error', (error) => {
      this.handleUpdateError(error)
    })
  }

  /**
   * 处理发现可用更新
   * @param {Object} info - 更新信息
   */
  async handleUpdateAvailable(info: any) {
    if (!this.mainWindow) return

    try {
      // 发送更新可用消息给渲染进程
      this.mainWindow.webContents.send('update-available', {
        version: info.version,
        releaseNotes: info.releaseNotes || '查看更新日志以了解新功能和修复'
      })
      console.log(`Update available: ${info.version}`)
    } catch (error) {
      console.error('Error handling update available:', error instanceof Error ? error.message : String(error))
    }
  }

  /**
   * 处理下载进度
   * @param {Object} progressObj - 进度对象
   */
  handleDownloadProgress(progressObj: any) {
    if (!this.mainWindow) return

    try {
      // 发送进度给渲染进程
      this.mainWindow.webContents.send('download-progress', {
        percent: Math.round(progressObj.percent),
        bytesPerSecond: progressObj.bytesPerSecond,
        total: progressObj.total,
        transferred: progressObj.transferred
      })

      console.log(`Download progress: ${Math.round(progressObj.percent)}%`)
    } catch (error) {
      console.error('Error handling download progress:', error instanceof Error ? error.message : String(error))
    }
  }

  /**
   * 处理更新下载完成
   * @param {Object} info - 更新信息
   */
  async handleUpdateDownloaded(info: any) {
    if (!this.mainWindow) return

    try {
      // 发送下载完成消息给渲染进程
      this.mainWindow.webContents.send('update-downloaded', {
        version: info.version
      })
      console.log(`Update downloaded: ${info.version}`)
    } catch (error) {
      console.error('Error handling update downloaded:', error instanceof Error ? error.message : String(error))
    }
  }

  /**
   * 安装更新并重启应用
   */
  installUpdate() {
    try {
      console.log('Installing update and restarting...')
      autoUpdater.quitAndInstall()
    } catch (error) {
      console.error('Error installing update:', error instanceof Error ? error.message : String(error))
    }
  }

  /**
   * 处理无可用更新
   */
  async handleUpdateNotAvailable() {
    if (!this.mainWindow) return

    try {
      // 发送消息给渲染进程
      this.mainWindow.webContents.send('update-not-available')
      console.log('No updates available')
    } catch (error) {
      console.error('Error handling update not available:', error instanceof Error ? error.message : String(error))
    }
  }

  /**
   * 处理更新错误
   * @param {Error} error - 错误对象
   */
  async handleUpdateError(error: Error) {
    if (!this.mainWindow) return

    console.error('Auto-updater error:', error)

    // 向渲染进程发送错误消息
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      let errorMessage = '检查更新失败'
      
      // 根据错误类型提供更具体的错误信息
      if (error.message.includes('net::') || error.message.includes('network')) {
        errorMessage = '网络连接失败，请检查网络设置'
      } else if (error.message.includes('timeout')) {
        errorMessage = '连接超时，请稍后重试'
      } else if (error.message.includes('ENOTFOUND') || error.message.includes('DNS')) {
        errorMessage = 'DNS解析失败，请检查网络连接'
      } else {
        errorMessage = '检查更新失败，请稍后重试'
      }
      
      this.mainWindow.webContents.send('update-error', { message: errorMessage })
    }
  }

  /**
   * 检查更新
   * @param {boolean} silent - 是否静默检查（不显示"已是最新版本"对话框）
   */
  checkForUpdates(silent: boolean = false) {
    if (!this.isInitialized) {
      console.warn('AutoUpdateManager not initialized')
      return
    }

    try {
      // 如果是静默检查，临时移除update-not-available监听器
      if (silent) {
        autoUpdater.removeAllListeners('update-not-available')
        autoUpdater.once('update-not-available', () => {
          console.log('No updates available (silent check)')
          // 重新添加监听器
          autoUpdater.on('update-not-available', () => {
            this.handleUpdateNotAvailable()
          })
        })
      }

      autoUpdater.checkForUpdates()
      console.log('Checking for updates...')
    } catch (error) {
      console.error('Error checking for updates:', error instanceof Error ? error.message : String(error))
    }
  }

  /**
   * 手动触发更新检查（用于菜单或按钮）
   */
  manualCheckForUpdates() {
    if (!this.isInitialized) {
      console.warn('AutoUpdateManager not initialized')
      // 向渲染进程发送错误消息
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('update-error', { message: '更新服务未初始化' })
      }
      return
    }

    try {
      console.log('Manual update check initiated')
      autoUpdater.checkForUpdates()
      
      // 设置一个备用超时机制，防止网络问题导致无响应
      setTimeout(() => {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          // 这里可以添加额外的超时处理逻辑
          console.log('Update check timeout fallback triggered')
        }
      }, 12000) // 12秒后的备用处理
      
    } catch (error) {
      console.error('Error in manual update check:', error instanceof Error ? error.message : String(error))
      // 向渲染进程发送错误消息
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('update-error', { 
          message: '检查更新失败，请检查网络连接' 
        })
      }
    }
  }

  /**
   * 销毁更新管理器
   */
  destroy() {
    if (autoUpdater) {
      autoUpdater.removeAllListeners()
    }
    this.mainWindow = null
    this.isInitialized = false
  }
}

// 创建单例实例
const autoUpdateManager = new AutoUpdateManager()

export { autoUpdateManager, AutoUpdateManager }

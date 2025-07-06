import { app, shell, BrowserWindow, ipcMain, dialog, protocol } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import * as fs from 'fs'
import * as path from 'path'

// 支持的视频格式
const VIDEO_EXTENSIONS = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.3gp', '.ts']

// 支持的图片格式
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg']

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// 注册自定义协议为标准协议
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local-image',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true
    }
  }
])

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // 注册自定义协议来处理本地图片文件
  protocol.registerFileProtocol('local-image', (request, callback) => {
    const url = request.url.substring(13) // 移除 'local-image://' 前缀
    // 解码URL并处理路径
    let filePath = decodeURIComponent(url)
    
    // 在Windows上，处理路径格式
    if (process.platform === 'win32') {
      // 处理类似 /d/path 的格式，转换为 D:/path
      if (filePath.match(/^\/[a-zA-Z]\//)) {
        filePath = filePath.charAt(1).toUpperCase() + ':' + filePath.substring(2)
      }
      // 确保使用正确的路径分隔符
      filePath = filePath.replace(/\//g, '\\')
    }
    
    console.log('=== Local-image Protocol Request ===')
    console.log('原始URL:', request.url)
    console.log('提取的路径:', url)
    console.log('解码后路径:', decodeURIComponent(url))
    console.log('最终文件路径:', filePath)
    
    // 检查文件是否存在
    try {
      const exists = require('fs').existsSync(filePath)
      console.log('文件是否存在:', exists)
      if (!exists) {
        console.error('文件不存在:', filePath)
      }
    } catch (error) {
      console.error('检查文件存在性时出错:', error)
    }
    
    callback({ path: filePath })
  })

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC handlers
  ipcMain.handle('dialog:openDirectory', async (event, options) => {
    const result = await dialog.showOpenDialog(options)
    return result
  })

  // 使用系统默认应用程序打开文件
  ipcMain.handle('open-file-with-default-app', async (event, filePath: string) => {
    try {
      await shell.openPath(filePath)
      return { success: true }
    } catch (error) {
      console.error('Failed to open file:', error)
      return { success: false, error: error.message }
    }
  })

  // 查找文件夹中的封面图片
  const findCoverImage = async (folderPath: string, folderName: string): Promise<string | null> => {
    try {
      const files = await fs.promises.readdir(folderPath)
      console.log(`Finding cover image - Folder: ${folderPath}, Name: ${folderName}`)
      console.log(`Files in folder:`, files)
      
      // 查找名为"标题的图片"的文件
      for (const file of files) {
        const fileName = path.parse(file).name.toLowerCase()
        const fileExt = path.extname(file).toLowerCase()
        
        if (IMAGE_EXTENSIONS.includes(fileExt) && fileName === '标题的图片') {
          const coverPath = path.join(folderPath, file)
          console.log(`Found title image: ${coverPath}`)
          return coverPath
        }
      }
      
      // 查找名为"图片"的文件
      for (const file of files) {
        const fileName = path.parse(file).name.toLowerCase()
        const fileExt = path.extname(file).toLowerCase()
        
        if (IMAGE_EXTENSIONS.includes(fileExt) && fileName === '图片') {
          const coverPath = path.join(folderPath, file)
          console.log(`Found image file: ${coverPath}`)
          return coverPath
        }
      }
      
      // 如果没找到"标题的图片"和"图片"，查找与文件夹名相同的图片
      for (const file of files) {
        const fileName = path.parse(file).name.toLowerCase()
        const fileExt = path.extname(file).toLowerCase()
        
        if (IMAGE_EXTENSIONS.includes(fileExt) && fileName === folderName.toLowerCase()) {
          const coverPath = path.join(folderPath, file)
          console.log(`Found same-name image: ${coverPath}`)
          return coverPath
        }
      }
      
      // 如果还没找到，返回第一个图片文件
      for (const file of files) {
        const fileExt = path.extname(file).toLowerCase()
        console.log(`Checking file: ${file}, Extension: ${fileExt}, Is image: ${IMAGE_EXTENSIONS.includes(fileExt)}`)
        if (IMAGE_EXTENSIONS.includes(fileExt)) {
          const coverPath = path.join(folderPath, file)
          console.log(`Found first image: ${coverPath}`)
          return coverPath
        }
      }
      
      console.log(`No image files found`)
      return null
    } catch (error) {
      console.error('Failed to find cover image:', error)
      return null
    }
  }

  // 扫描文件夹中的视频文件和子文件夹
  ipcMain.handle('scan-folder', async (event, folderPath: string) => {
    try {
      const items: Array<{type: 'folder' | 'video' | 'image', name: string, path: string, size?: number, isDirectory: boolean, coverImage?: string}> = []
      
      const files = await fs.promises.readdir(folderPath, { withFileTypes: true })
      
      for (const file of files) {
        const fullPath = path.join(folderPath, file.name)
        
        if (file.isDirectory()) {
          // 查找子文件夹的封面图片
          const coverImage = await findCoverImage(fullPath, file.name)
          
          // 添加子文件夹
          items.push({
            type: 'folder',
            name: file.name,
            path: fullPath,
            isDirectory: true,
            coverImage: coverImage || undefined
          })
        } else if (file.isFile()) {
          const ext = path.extname(file.name).toLowerCase()
          if (VIDEO_EXTENSIONS.includes(ext)) {
            // 获取文件大小
            const stats = await fs.promises.stat(fullPath)
            items.push({
              type: 'video',
              name: file.name,
              path: fullPath,
              size: stats.size,
              isDirectory: false
            })
          } else if (IMAGE_EXTENSIONS.includes(ext)) {
            // 添加图片文件支持
            const stats = await fs.promises.stat(fullPath)
            items.push({
              type: 'image',
              name: file.name,
              path: fullPath,
              size: stats.size,
              isDirectory: false
            })
          }
        }
      }
      
      return { success: true, items }
    } catch (error) {
      console.error('Failed to scan folder:', error)
      return { success: false, error: error.message }
    }
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

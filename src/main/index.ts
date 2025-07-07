import { app, shell, BrowserWindow, ipcMain, protocol, clipboard, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

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
    let url = request.url.substring(13) // 移除 'local-image://' 前缀
    
    console.log('=== Local-image Protocol Request ===');
    console.log('原始URL:', request.url);
    console.log('提取的路径:', url);
    
    // 移除URL参数（如时间戳）
    const questionMarkIndex = url.indexOf('?');
    if (questionMarkIndex !== -1) {
      url = url.substring(0, questionMarkIndex);
      console.log('移除参数后的路径:', url);
    }
    
    // 解码URL并处理路径
    let filePath = url;
    
    // 多次解码以处理可能的多重编码
    let previousPath = '';
    while (filePath !== previousPath && filePath.includes('%')) {
      previousPath = filePath;
      try {
        filePath = decodeURIComponent(filePath);
        console.log('解码步骤:', filePath);
      } catch (e) {
        console.error('解码失败:', e);
        break;
      }
    }
    
    // 在Windows上，处理路径格式
    if (process.platform === 'win32') {
      // 如果路径已经是完整的Windows路径格式（如 D:/path 或 D:\path），直接使用
      if (filePath.match(/^[a-zA-Z]:[/\\]/)) {
        filePath = filePath.replace(/\//g, '\\')
      }
      // 处理类似 /D:/path 的格式（前导斜杠 + 完整Windows路径），移除前导斜杠
      else if (filePath.match(/^\/[a-zA-Z]:[/\\]/)) {
        filePath = filePath.substring(1) // 移除前导斜杠
        filePath = filePath.replace(/\//g, '\\')
      }
      // 处理类似 /d/path 的格式，转换为 D:/path
      else if (filePath.match(/^\/[a-zA-Z]\//)) {
        filePath = filePath.charAt(1).toUpperCase() + ':' + filePath.substring(2)
        filePath = filePath.replace(/\//g, '\\')
      }
      // 处理多个前导斜杠的情况，如 ///D:/path
      else if (filePath.match(/^\/+[a-zA-Z]:[/\\]/)) {
        // 移除所有前导斜杠直到找到驱动器字母
        filePath = filePath.replace(/^\/+/, '')
        filePath = filePath.replace(/\//g, '\\')
      }
    }
    
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
  ipcMain.handle('dialog:openDirectory', async (_event, options) => {
    const result = await dialog.showOpenDialog(options)
    return result
  })

  // 选择文件夹
  ipcMain.handle('dialog:selectFolder', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: '选择视频文件夹'
      })
      
      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: 'User canceled' }
      }
      
      return { success: true, folderPath: result.filePaths[0] }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // 在文件管理器中打开
  ipcMain.handle('open-in-explorer', async (_event, folderPath: string) => {
    try {
      await shell.openPath(folderPath)
      return { success: true }
    } catch (error) {
      console.error('Failed to open in explorer:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  // 使用系统默认应用程序打开文件
  ipcMain.handle('open-file-with-default-app', async (_event, filePath: string) => {
    try {
      await shell.openPath(filePath)
      return { success: true }
    } catch (error) {
      console.error('Failed to open file:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  // 查找文件夹中的封面图片
  const findCoverImage = async (folderPath: string, folderName: string): Promise<string | null> => {
    try {
      const files = await fs.promises.readdir(folderPath)
      
      // 查找名为"标题的图片"的文件
      for (const file of files) {
        const fileName = path.parse(file).name.toLowerCase()
        const fileExt = path.extname(file).toLowerCase()
        
        if (IMAGE_EXTENSIONS.includes(fileExt) && fileName === '标题的图片') {
          const coverPath = path.join(folderPath, file)
          return coverPath
        }
      }
      
      // 查找名为"图片"的文件
      for (const file of files) {
        const fileName = path.parse(file).name.toLowerCase()
        const fileExt = path.extname(file).toLowerCase()
        
        if (IMAGE_EXTENSIONS.includes(fileExt) && fileName === '图片') {
          const coverPath = path.join(folderPath, file)
          return coverPath
        }
      }
      
      // 如果没找到"标题的图片"和"图片"，查找与文件夹名相同的图片
      for (const file of files) {
        const fileName = path.parse(file).name.toLowerCase()
        const fileExt = path.extname(file).toLowerCase()
        
        if (IMAGE_EXTENSIONS.includes(fileExt) && fileName === folderName.toLowerCase()) {
          const coverPath = path.join(folderPath, file)
          return coverPath
        }
      }
      
      // 如果还没找到，返回第一个图片文件
      for (const file of files) {
        const fileExt = path.extname(file).toLowerCase()
        if (IMAGE_EXTENSIONS.includes(fileExt)) {
          const coverPath = path.join(folderPath, file)
          return coverPath
        }
      }
      
      return null
    } catch (error) {
      console.error('Failed to find cover image:', error)
      return null
    }
  }

  // 扫描文件夹中的视频文件和子文件夹
  ipcMain.handle('scan-folder', async (_event, folderPath: string) => {
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
      return { success: false, error: (error as Error).message }
    }
  })

  // 保存剪贴板图片到文件夹
  ipcMain.handle('save-clipboard-image', async (_event, folderPath: string) => {
    try {
      // 检查文件夹是否存在
      if (!fs.existsSync(folderPath)) {
        return { success: false, error: '目标文件夹不存在' }
      }
      
      // 检查文件夹是否可写
      try {
        await fs.promises.access(folderPath, fs.constants.W_OK)
      } catch (accessError) {
        return { success: false, error: '文件夹没有写入权限' }
      }
      
      // 获取剪贴板中的图片
      const image = clipboard.readImage()
      
      if (image.isEmpty()) {
        return { success: false, error: '剪贴板中没有图片，请先复制图片到剪贴板' }
      }
      
      // 生成文件名（使用时间戳）
      const now = new Date()
      const timestamp = now.getFullYear() + 
        String(now.getMonth() + 1).padStart(2, '0') + 
        String(now.getDate()).padStart(2, '0') + '-' +
        String(now.getHours()).padStart(2, '0') + 
        String(now.getMinutes()).padStart(2, '0') + 
        String(now.getSeconds()).padStart(2, '0')
      const fileName = `clipboard-image-${timestamp}.png`
      const filePath = path.join(folderPath, fileName)
      
      // 将图片保存为PNG格式
      const buffer = image.toPNG()
      
      if (buffer.length === 0) {
        return { success: false, error: '图片转换失败，无法生成PNG数据' }
      }
      
      await fs.promises.writeFile(filePath, buffer)
      
      // 验证文件是否成功保存
      const savedFileExists = fs.existsSync(filePath)
      if (!savedFileExists) {
        return { success: false, error: '文件保存失败，无法创建文件' }
      }
      
      return { success: true, filePath, fileName }
    } catch (error) {
      console.error('保存剪贴板图片时发生异常:', error)
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      return { success: false, error: `保存失败: ${errorMessage}` }
    }
  })

  // 删除文件
  ipcMain.handle('delete-file', async (_event, filePath: string) => {
    try {
      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        return { success: false, error: '文件不存在' }
      }
      
      // 检查是否为文件（而不是文件夹）
      const stats = await fs.promises.stat(filePath)
      if (!stats.isFile()) {
        return { success: false, error: '目标不是文件' }
      }
      
      // 删除文件
      await fs.promises.unlink(filePath)
      
      // 验证文件是否已删除
      const fileStillExists = fs.existsSync(filePath)
      if (fileStillExists) {
        return { success: false, error: '文件删除失败，文件仍然存在' }
      }
      
      return { success: true }
    } catch (error) {
      console.error('删除文件时发生异常:', error)
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      return { success: false, error: `删除失败: ${errorMessage}` }
    }
  })

  // 带重试机制的文件重命名函数
  const renameWithRetry = async (oldPath: string, newPath: string, maxRetries: number = 3, delay: number = 100): Promise<void> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await fs.promises.rename(oldPath, newPath)
        return // 成功则直接返回
      } catch (error: any) {
        // 如果是EBUSY错误且还有重试次数，则等待后重试
        if (error.code === 'EBUSY' && attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay))
          delay *= 2 // 指数退避，下次等待时间翻倍
        } else {
          // 最后一次尝试失败或非EBUSY错误，抛出异常
          throw error
        }
      }
    }
  }

  // 设置图片为封面（复制为"标题的图片"）
  ipcMain.handle('set-as-cover', async (_event, imagePath: string) => {
    try {
      // 检查文件是否存在
      if (!fs.existsSync(imagePath)) {
        return { success: false, error: '图片文件不存在' }
      }
      
      // 检查是否为文件
      const stats = await fs.promises.stat(imagePath)
      if (!stats.isFile()) {
        return { success: false, error: '目标不是文件' }
      }
      
      // 检查是否为图片文件
      const fileExt = path.extname(imagePath).toLowerCase()
      if (!IMAGE_EXTENSIONS.includes(fileExt)) {
        return { success: false, error: '文件不是支持的图片格式' }
      }
      
      // 获取文件夹路径和新文件名
      const folderPath = path.dirname(imagePath)
      const newFileName = `标题的图片${fileExt}`
      const newFilePath = path.join(folderPath, newFileName)
      
      // 如果源文件已经是"标题的图片"，则无需操作
      if (newFilePath === imagePath) {
        return { success: true, message: '该图片已经是封面图片' }
      }
      
      // 如果目标文件已存在，先将其重命名为10位随机数字
      if (fs.existsSync(newFilePath)) {
        const randomNumber = Math.floor(Math.random() * 10000000000).toString().padStart(10, '0')
        const existingFileExt = path.extname(newFilePath)
        const randomFileName = `${randomNumber}${existingFileExt}`
        const randomFilePath = path.join(folderPath, randomFileName)
        
        await renameWithRetry(newFilePath, randomFilePath)
      }
      
      // 将选中的图片重命名为"标题的图片"（使用重试机制）
      await renameWithRetry(imagePath, newFilePath)
      
      // 验证重命名是否成功
      if (!fs.existsSync(newFilePath)) {
        return { success: false, error: '重命名失败，新文件不存在' }
      }
      
      return { success: true, newPath: newFilePath }
    } catch (error: any) {
      console.error('设置封面时发生异常:', error)
      let errorMessage = error instanceof Error ? error.message : '未知错误'
      
      // 针对EBUSY错误提供更友好的错误信息
      if (error.code === 'EBUSY') {
        errorMessage = '文件正在被其他程序使用，请关闭可能占用该文件的程序（如图片查看器）后重试'
      }
      
      return { success: false, error: `设置封面失败: ${errorMessage}` }
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

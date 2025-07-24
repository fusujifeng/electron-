import { ElectronAPI } from '@electron-toolkit/preload'

interface CustomAPI {
  showOpenDialog: (options: any) => Promise<any>
  scanFolder: (folderPath: string) => Promise<{success: boolean, items?: any[], error?: string}>
  openFileWithDefaultApp: (filePath: string) => Promise<{success: boolean, error?: string}>
  saveClipboardImage: (folderPath: string) => Promise<{success: boolean, fileName?: string, error?: string}>
  setAsCover: (imagePath: string) => Promise<{success: boolean, message?: string, error?: string}>
  deleteFile: (filePath: string) => Promise<{success: boolean, error?: string}>
  openInExplorer: (folderPath: string) => Promise<{success: boolean, error?: string}>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: CustomAPI
  }
}

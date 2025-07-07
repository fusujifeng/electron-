import { ElectronAPI } from '@electron-toolkit/preload'

interface CustomAPI {
  showOpenDialog: (options: any) => Promise<any>
  scanFolder: (folderPath: string) => Promise<{success: boolean, items?: any[], error?: string}>
  openFileWithDefaultApp: (filePath: string) => Promise<{success: boolean, error?: string}>
  selectFolder: () => Promise<{success: boolean, folderPath?: string, error?: string}>
  openInExplorer: (folderPath: string) => Promise<{success: boolean, error?: string}>
  saveClipboardImage: (folderPath: string) => Promise<{success: boolean, filePath?: string, fileName?: string, error?: string}>
  deleteFile: (filePath: string) => Promise<{success: boolean, error?: string}>
  setAsCover: (imagePath: string) => Promise<{success: boolean, newPath?: string, message?: string, error?: string}>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: CustomAPI
  }
}

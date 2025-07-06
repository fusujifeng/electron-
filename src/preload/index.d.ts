import { ElectronAPI } from '@electron-toolkit/preload'

interface CustomAPI {
  showOpenDialog: (options: any) => Promise<any>
  scanFolder: (folderPath: string) => Promise<{success: boolean, items?: any[], error?: string}>
  openFileWithDefaultApp: (filePath: string) => Promise<{success: boolean, error?: string}>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: CustomAPI
  }
}

import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  showOpenDialog: (options: any) => ipcRenderer.invoke('dialog:openDirectory', options),
  scanFolder: (folderPath: string) => ipcRenderer.invoke('scan-folder', folderPath),
  openFileWithDefaultApp: (filePath: string) => ipcRenderer.invoke('open-file-with-default-app', filePath),
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
  openInExplorer: (folderPath: string) => ipcRenderer.invoke('open-in-explorer', folderPath),
  saveClipboardImage: (folderPath: string) => ipcRenderer.invoke('save-clipboard-image', folderPath),
  deleteFile: (filePath: string) => ipcRenderer.invoke('delete-file', filePath),
  setAsCover: (imagePath: string) => ipcRenderer.invoke('set-as-cover', imagePath)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}

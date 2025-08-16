<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click="closeSettings">
    <div class="bg-white rounded-2xl shadow-2xl w-[90vw] h-[85vh] max-w-6xl max-h-[800px] flex overflow-hidden" @click.stop>
      <!-- 左侧模块列表 -->
      <div class="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
        <!-- 设置标题 -->
        <div class="p-6 border-b border-gray-200">
          <h2 class="text-xl font-bold text-gray-800 flex items-center space-x-2">
            <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
            <span>设置</span>
          </h2>
        </div>

        <!-- 模块列表 -->
        <div class="flex-1 p-4 space-y-2">
          <button
            v-for="module in settingsModules"
            :key="module.id"
            @click="activeModule = module.id"
            class="w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex items-center space-x-3"
            :class="{
              'bg-blue-100 text-blue-700 border border-blue-200': activeModule === module.id,
              'text-gray-600 hover:bg-gray-100 hover:text-gray-800': activeModule !== module.id
            }"
          >
            <component :is="module.icon" class="w-5 h-5" />
            <span class="font-medium">{{ module.name }}</span>
          </button>
        </div>
      </div>

      <!-- 右侧设置内容 -->
      <div class="flex-1 flex flex-col">
        <!-- 内容头部 -->
        <div class="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-gray-800">{{ currentModuleName }}</h3>
            <p class="text-sm text-gray-500 mt-1">{{ currentModuleDescription }}</p>
          </div>
          <button
            @click="closeSettings"
            class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="关闭设置"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- 设置内容区域 -->
        <div class="flex-1 p-6 overflow-y-auto">
          <!-- 通用设置 -->
          <div v-if="activeModule === 'general'" class="space-y-6">
            <div class="bg-gray-50 rounded-xl p-6">
              <h4 class="text-md font-semibold text-gray-800 mb-4">界面设置</h4>
              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <div>
                    <label class="text-sm font-medium text-gray-700">主题模式</label>
                    <p class="text-xs text-gray-500">选择应用的外观主题</p>
                  </div>
                  <select class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>浅色模式</option>
                    <option>深色模式</option>
                    <option>跟随系统</option>
                  </select>
                </div>
                <div class="flex items-center justify-between">
                  <div>
                    <label class="text-sm font-medium text-gray-700">语言设置</label>
                    <p class="text-xs text-gray-500">选择应用界面语言</p>
                  </div>
                  <select class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>简体中文</option>
                    <option>English</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <!-- 播放设置 -->
          <div v-if="activeModule === 'playback'" class="space-y-6">
            <div class="bg-gray-50 rounded-xl p-6">
              <h4 class="text-md font-semibold text-gray-800 mb-4">播放器设置</h4>
              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <div>
                    <label class="text-sm font-medium text-gray-700">自动播放</label>
                    <p class="text-xs text-gray-500">打开视频时自动开始播放</p>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" class="sr-only peer" checked>
                    <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div class="flex items-center justify-between">
                  <div>
                    <label class="text-sm font-medium text-gray-700">默认音量</label>
                    <p class="text-xs text-gray-500">设置播放器的默认音量</p>
                  </div>
                  <input type="range" min="0" max="100" value="80" class="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider">
                </div>
              </div>
            </div>
          </div>

          <!-- 存储设置 -->
          <div v-if="activeModule === 'storage'" class="space-y-6">
            <!-- 数据管理面板 -->
            <DataManagementPanel />
          </div>

          <!-- 关于 -->
          <div v-if="activeModule === 'about'" class="space-y-6">
            <div class="bg-gray-50 rounded-xl p-6 text-center">
              <div class="flex justify-center mb-4">
                <div class="p-4 bg-gradient-to-br from-pink-400 to-red-400 rounded-2xl shadow-lg">
                  <svg class="h-12 w-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                  </svg>
                </div>
              </div>
              <h4 class="text-xl font-bold text-gray-800 mb-2">澪妹管理大师</h4>
              <p class="text-gray-600 mb-4">发现美好视频</p>
              <div class="text-sm text-gray-500 space-y-1 mb-6">
                <p>版本: {{ appVersion }}</p>
                <p>基于 Electron + Vue 3 + TypeScript</p>
                <p>© 2025 澪妹管理大师. All rights reserved.</p>
              </div>

              <!-- 检查更新按钮 -->
              <button
                @click="handleCheckForUpdates"
                :disabled="isCheckingUpdates"
                class="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors duration-200 space-x-2"
              >
                <svg v-if="isCheckingUpdates" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                <span>{{ isCheckingUpdates ? '检查中...' : '检查更新' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 消息提示 -->
    <div v-if="showMessage" class="fixed top-4 right-4 z-50 max-w-sm">
      <div :class="[
        'px-4 py-3 rounded-lg shadow-lg transition-all duration-300 transform',
        {
          'bg-blue-500 text-white': messageType === 'info',
          'bg-green-500 text-white': messageType === 'success',
          'bg-red-500 text-white': messageType === 'error'
        }
      ]">
        <div class="flex items-center space-x-2">
          <!-- 图标 -->
          <svg v-if="messageType === 'info'" class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <svg v-if="messageType === 'success'" class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <svg v-if="messageType === 'error'" class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span class="text-sm font-medium">{{ message }}</span>
        </div>
       </div>
     </div>

     <!-- 更新确认对话框 -->
     <div v-if="showUpdateDialog" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
       <div class="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
         <div class="flex items-center mb-4">
           <div class="p-3 bg-blue-100 rounded-full mr-4">
             <svg class="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
             </svg>
           </div>
           <h3 class="text-lg font-semibold text-gray-900">发现新版本</h3>
         </div>

         <div class="mb-6">
           <p class="text-gray-700 mb-2">
             检测到新版本 <span class="font-semibold text-blue-600">{{ updateInfo?.version }}</span>，是否立即更新？
           </p>
           <p class="text-sm text-gray-500">
             {{ updateInfo?.releaseNotes }}
           </p>
         </div>

         <div class="flex space-x-3">
           <button
             @click="confirmUpdate"
             class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
           >
             立即更新
           </button>
           <button
             @click="cancelUpdate"
             class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors duration-200"
           >
             稍后更新
           </button>
         </div>
       </div>
     </div>

     <!-- 下载进度对话框 -->
     <div v-if="showDownloadDialog" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
       <div class="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
         <div class="flex items-center mb-4">
           <div class="p-3 bg-green-100 rounded-full mr-4">
             <svg class="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
             </svg>
           </div>
           <h3 class="text-lg font-semibold text-gray-900">正在下载更新</h3>
         </div>

         <div class="mb-6">
           <div class="flex justify-between items-center mb-2">
             <span class="text-sm text-gray-600">下载进度</span>
             <span class="text-sm font-medium text-gray-900">{{ downloadProgress }}%</span>
           </div>

           <!-- 进度条 -->
           <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
             <div
               class="bg-gradient-to-r from-blue-500 to-green-500 h-full rounded-full transition-all duration-300 ease-out"
               :style="{ width: downloadProgress + '%' }"
             ></div>
           </div>

           <p class="text-sm text-gray-500 mt-3">
             请稍候，更新包正在下载中...
           </p>
         </div>

         <!-- 下载状态指示器 -->
         <div class="flex items-center justify-center">
           <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
           <span class="ml-2 text-sm text-gray-600">下载中...</span>
         </div>
       </div>
     </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import DataManagementPanel from './DataManagementPanel.vue'
import packageInfo from '../../../../package.json'

// 定义事件
const emit = defineEmits<{
  close: []
}>()

// 应用版本号
const appVersion = ref(packageInfo.version)

// 当前激活的模块
const activeModule = ref('general')

// 设置模块列表
const settingsModules = [
  {
    id: 'general',
    name: '通用设置',
    description: '应用的基本设置和偏好',
    icon: 'GeneralIcon'
  },
  {
    id: 'playback',
    name: '播放设置',
    description: '视频播放相关的设置',
    icon: 'PlayIcon'
  },
  {
    id: 'storage',
    name: '存储设置',
    description: '数据存储和管理设置',
    icon: 'StorageIcon'
  },
  {
    id: 'about',
    name: '关于',
    description: '应用信息和版本详情',
    icon: 'InfoIcon'
  }
]

// 当前模块信息
const currentModuleName = computed(() => {
  const module = settingsModules.find(m => m.id === activeModule.value)
  return module?.name || ''
})

const currentModuleDescription = computed(() => {
  const module = settingsModules.find(m => m.id === activeModule.value)
  return module?.description || ''
})

// 检查更新状态
const isCheckingUpdates = ref(false)

// 消息提示状态
const message = ref('')
const messageType = ref<'success' | 'error' | 'info'>('info')
const showMessage = ref(false)

// 更新确认对话框状态
const showUpdateDialog = ref(false)
const updateInfo = ref<{ version: string; releaseNotes: string } | null>(null)

// 下载进度状态
const isDownloading = ref(false)
const downloadProgress = ref(0)
const showDownloadDialog = ref(false)

// 显示消息提示
const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
  message.value = msg
  messageType.value = type
  showMessage.value = true

  setTimeout(() => {
    showMessage.value = false
  }, 3000)
}

// 超时处理器引用
let updateTimeoutId: NodeJS.Timeout | null = null

// 检查更新
const handleCheckForUpdates = async () => {
  if (isCheckingUpdates.value) return

  try {
    isCheckingUpdates.value = true
    showToast('正在检查更新...', 'info')

    // 清除之前的超时器
    if (updateTimeoutId) {
      clearTimeout(updateTimeoutId)
      updateTimeoutId = null
    }

    // 调用主进程的检查更新方法
    window.api?.checkForUpdates()

    // 设置超时，防止长时间无响应
    updateTimeoutId = setTimeout(() => {
      if (isCheckingUpdates.value) {
        isCheckingUpdates.value = false
        showToast('检查更新超时，请重试', 'error')
        updateTimeoutId = null
      }
    }, 15000) // 增加到15秒超时，给更多时间

  } catch (error) {
    console.error('检查更新失败:', error)
    isCheckingUpdates.value = false
    if (updateTimeoutId) {
      clearTimeout(updateTimeoutId)
      updateTimeoutId = null
    }
    showToast('检查更新失败，请稍后重试', 'error')
  }
}

// 处理更新事件
const handleUpdateNotAvailable = () => {
  // 清除超时器
  if (updateTimeoutId) {
    clearTimeout(updateTimeoutId)
    updateTimeoutId = null
  }

  isCheckingUpdates.value = false
  showToast('已是最新版本', 'success')
}

const handleUpdateAvailable = (_event: any, info: { version: string; releaseNotes: string }) => {
  // 清除超时器
  if (updateTimeoutId) {
    clearTimeout(updateTimeoutId)
    updateTimeoutId = null
  }

  isCheckingUpdates.value = false
  updateInfo.value = info
  showUpdateDialog.value = true
}

// 确认更新
const confirmUpdate = () => {
  showUpdateDialog.value = false
  isDownloading.value = true
  downloadProgress.value = 0
  showDownloadDialog.value = true
  window.api?.confirmUpdate()
}

// 取消更新
const cancelUpdate = () => {
  showUpdateDialog.value = false
  showToast('已取消更新', 'info')
}

// 处理更新错误事件
const handleUpdateError = (_event: any, error: { message: string }) => {
  // 清除超时器
  if (updateTimeoutId) {
    clearTimeout(updateTimeoutId)
    updateTimeoutId = null
  }

  isCheckingUpdates.value = false
  isDownloading.value = false
  showDownloadDialog.value = false
  showToast(error.message || '检查更新失败，请稍后重试', 'error')
}

// 处理下载进度事件
const handleDownloadProgress = (_event: any, progressInfo: { percent: number }) => {
  downloadProgress.value = Math.round(progressInfo.percent)
}

// 处理下载完成事件
const handleUpdateDownloaded = (_event: any, info?: any) => {
  downloadProgress.value = 100
  // 显示下载完成状态，等待用户确认安装
  setTimeout(() => {
    isDownloading.value = false
    showDownloadDialog.value = false
    showToast('更新下载完成！点击安装更新重启应用', 'success')

    // 显示安装确认对话框
    setTimeout(() => {
      const shouldInstall = confirm(`版本 ${info?.version || '新版本'} 已下载完成，是否立即重启应用安装更新？`)
      if (shouldInstall) {
        window.api?.installUpdate()
      }
    }, 1000)
  }, 1000)
}

// 处理更新开始事件
const handleUpdateStart = () => {
  isDownloading.value = true
  downloadProgress.value = 0
  showDownloadDialog.value = true
}

// 设置事件监听器
onMounted(() => {
  if (window.electron?.ipcRenderer) {
    window.electron.ipcRenderer.on('update-not-available', handleUpdateNotAvailable)
    window.electron.ipcRenderer.on('update-available', handleUpdateAvailable)
    window.electron.ipcRenderer.on('update-error', handleUpdateError)
    window.electron.ipcRenderer.on('update-start', handleUpdateStart)
    window.electron.ipcRenderer.on('download-progress', handleDownloadProgress)
    window.electron.ipcRenderer.on('update-downloaded', handleUpdateDownloaded)
  }
})

// 清理事件监听器
onUnmounted(() => {
  if (window.electron?.ipcRenderer) {
    window.electron.ipcRenderer.removeListener('update-not-available', handleUpdateNotAvailable)
    window.electron.ipcRenderer.removeListener('update-available', handleUpdateAvailable)
    window.electron.ipcRenderer.removeListener('update-error', handleUpdateError)
    window.electron.ipcRenderer.removeListener('update-start', handleUpdateStart)
    window.electron.ipcRenderer.removeListener('download-progress', handleDownloadProgress)
    window.electron.ipcRenderer.removeListener('update-downloaded', handleUpdateDownloaded)
  }
})

// 关闭设置
const closeSettings = () => {
  emit('close')
}
</script>

<script lang="ts">
// 图标组件
const GeneralIcon = {
  template: `
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"></path>
    </svg>
  `
}

const PlayIcon = {
  template: `
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H15M9 10v4a2 2 0 002 2h2a2 2 0 002-2v-4M9 10V9a2 2 0 012-2h2a2 2 0 012 2v1"></path>
    </svg>
  `
}

const StorageIcon = {
  template: `
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path>
    </svg>
  `
}

const InfoIcon = {
  template: `
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>
  `
}

export default {
  components: {
    GeneralIcon,
    PlayIcon,
    StorageIcon,
    InfoIcon,
    DataManagementPanel
  }
}
</script>

<style scoped>
.slider::-webkit-slider-thumb {
  appearance: none;
  height: 16px;
  width: 16px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
}

.slider::-moz-range-thumb {
  height: 16px;
  width: 16px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  border: none;
}
</style>

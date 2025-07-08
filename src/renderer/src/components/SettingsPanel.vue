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
              <h4 class="text-xl font-bold text-gray-800 mb-2">视频小记</h4>
              <p class="text-gray-600 mb-4">发现美好视频</p>
              <div class="text-sm text-gray-500 space-y-1">
                <p>版本: 1.0.0</p>
                <p>基于 Electron + Vue 3 + TypeScript</p>
                <p>© 2024 视频小记. All rights reserved.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import DataManagementPanel from './DataManagementPanel.vue'

// 定义事件
const emit = defineEmits<{
  close: []
}>()

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
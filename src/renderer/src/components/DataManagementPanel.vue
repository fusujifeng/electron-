<template>
  <div class="bg-white rounded-lg border border-gray-200 p-6">
    <div class="flex items-center justify-between mb-6">
      <h3 class="text-xl font-semibold text-gray-800 flex items-center">
        <svg class="w-6 h-6 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 1.79 4 4 4h8c2.21 0 4-1.79 4-4V7M4 7c0-2.21 1.79-4 4-4h8c2.21 0 4 1.79 4 4M4 7h16m-4-4v4m-8-4v4"></path>
        </svg>
        数据管理中心
      </h3>
      <button
        @click="refreshStatus"
        class="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
      >
        刷新状态
      </button>
    </div>

    <!-- 数据状态概览 -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-blue-600 font-medium">旧格式数据</p>
            <p class="text-2xl font-bold text-blue-800">{{ statusReport.oldDataCount }}</p>
            <p class="text-xs text-blue-500">个文件夹</p>
          </div>
          <div class="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center">
            <svg class="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"></path>
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-green-50 border border-green-200 rounded-lg p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-green-600 font-medium">新格式数据</p>
            <p class="text-2xl font-bold text-green-800">{{ statusReport.newDataCount }}</p>
            <p class="text-xs text-green-500">个文件夹</p>
          </div>
          <div class="w-8 h-8 bg-green-200 rounded-full flex items-center justify-center">
            <svg class="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-purple-600 font-medium">全局标签池</p>
            <p class="text-2xl font-bold text-purple-800">{{ globalTagCount }}</p>
            <p class="text-xs text-purple-500">个标签</p>
          </div>
          <div class="w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center">
            <svg class="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"></path>
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- 迁移状态 -->
    <div class="mb-6">
      <div class="flex items-center justify-between mb-3">
        <h4 class="text-lg font-medium text-gray-800">迁移状态</h4>
        <div class="flex items-center space-x-2">
          <div 
            class="w-3 h-3 rounded-full"
            :class="{
              'bg-green-500': !statusReport.needsMigration && statusReport.hasNewData,
              'bg-yellow-500': statusReport.needsMigration,
              'bg-gray-400': !statusReport.hasOldData && !statusReport.hasNewData
            }"
          ></div>
          <span class="text-sm text-gray-600">
            {{ migrationStatusText }}
          </span>
        </div>
      </div>

      <div class="bg-gray-50 rounded-lg p-4">
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-600">需要迁移:</span>
            <span :class="statusReport.needsMigration ? 'text-yellow-600 font-medium' : 'text-green-600'">{{ statusReport.needsMigration ? '是' : '否' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">有旧数据:</span>
            <span :class="statusReport.hasOldData ? 'text-blue-600' : 'text-gray-400'">{{ statusReport.hasOldData ? '是' : '否' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">有新数据:</span>
            <span :class="statusReport.hasNewData ? 'text-green-600' : 'text-gray-400'">{{ statusReport.hasNewData ? '是' : '否' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">有备份:</span>
            <span :class="statusReport.hasBackup ? 'text-purple-600' : 'text-gray-400'">{{ statusReport.hasBackup ? '是' : '否' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="space-y-4">
      <!-- 迁移操作 -->
      <div v-if="statusReport.needsMigration" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div class="flex items-center justify-between mb-3">
          <div>
            <h5 class="font-medium text-yellow-800">检测到需要迁移的数据</h5>
            <p class="text-sm text-yellow-600">发现 {{ statusReport.oldDataCount }} 个文件夹的标签数据需要迁移到新格式</p>
          </div>
        </div>
        <div class="flex space-x-3">
          <button
            @click="performMigration"
            :disabled="isMigrating"
            class="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {{ isMigrating ? '迁移中...' : '开始迁移' }}
          </button>
          <button
            @click="validateMigration"
            class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
          >
            验证数据
          </button>
        </div>
      </div>

      <!-- 数据管理操作 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-3">
          <h5 class="font-medium text-gray-800">数据操作</h5>
          <div class="space-y-2">
            <button
              @click="syncData"
              :disabled="isSyncing"
              class="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {{ isSyncing ? '同步中...' : '同步标签数据' }}
            </button>
            <button
              @click="exportData"
              class="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
            >
              导出数据
            </button>
            <button
              @click="showImportDialog = true"
              class="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium"
            >
              导入数据
            </button>
          </div>
        </div>

        <div class="space-y-3">
          <h5 class="font-medium text-gray-800">维护操作</h5>
          <div class="space-y-2">
            <button
              @click="cleanupData"
              class="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
            >
              清理无效数据
            </button>
            <button
              v-if="statusReport.hasBackup"
              @click="rollbackMigration"
              class="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
            >
              回滚到备份
            </button>
            <button
              v-if="statusReport.hasBackup"
              @click="cleanupBackup"
              class="w-full px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium"
            >
              清理备份数据
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作结果显示 -->
    <div v-if="operationResult" class="mt-6">
      <div 
        class="p-4 rounded-lg border"
        :class="{
          'bg-green-50 border-green-200 text-green-800': operationResult.success,
          'bg-red-50 border-red-200 text-red-800': !operationResult.success
        }"
      >
        <div class="flex items-start">
          <svg 
            class="w-5 h-5 mr-2 mt-0.5 flex-shrink-0"
            :class="operationResult.success ? 'text-green-500' : 'text-red-500'"
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path 
              v-if="operationResult.success"
              fill-rule="evenodd" 
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" 
              clip-rule="evenodd"
            ></path>
            <path 
              v-else
              fill-rule="evenodd" 
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" 
              clip-rule="evenodd"
            ></path>
          </svg>
          <div class="flex-1">
            <p class="font-medium">{{ operationResult.title }}</p>
            <p class="text-sm mt-1">{{ operationResult.message }}</p>
            <div v-if="operationResult.details && operationResult.details.length > 0" class="mt-2">
              <details class="text-sm">
                <summary class="cursor-pointer hover:text-gray-600">查看详情</summary>
                <ul class="mt-2 space-y-1 ml-4">
                  <li v-for="detail in operationResult.details" :key="detail" class="list-disc">{{ detail }}</li>
                </ul>
              </details>
            </div>
          </div>
          <button
            @click="operationResult = null"
            class="ml-2 text-gray-400 hover:text-gray-600"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- 导入对话框 -->
    <div v-if="showImportDialog" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h4 class="text-lg font-medium text-gray-800 mb-4">导入数据</h4>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">选择导入文件</label>
            <input
              type="file"
              accept=".json"
              @change="handleFileSelect"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div class="flex justify-end space-x-3">
            <button
              @click="showImportDialog = false"
              class="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              @click="importData"
              :disabled="!importFile"
              class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              导入
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useVideoStore } from '../stores/videoStore'
import { tagMigrationTool } from '../utils/tagMigration'
import { tagDataService } from '../services/tagDataService'

const videoStore = useVideoStore()

// 响应式数据
const statusReport = ref({
  needsMigration: false,
  hasOldData: false,
  hasNewData: false,
  hasBackup: false,
  oldDataCount: 0,
  newDataCount: 0
})

const isMigrating = ref(false)
const isSyncing = ref(false)
const showImportDialog = ref(false)
const importFile = ref<File | null>(null)
const operationResult = ref<{
  success: boolean
  title: string
  message: string
  details?: string[]
} | null>(null)

// 计算属性
const globalTagCount = computed(() => {
  return videoStore.getGlobalTags().length
})

const migrationStatusText = computed(() => {
  if (!statusReport.value.hasOldData && !statusReport.value.hasNewData) {
    return '无数据'
  }
  if (statusReport.value.needsMigration) {
    return '需要迁移'
  }
  if (statusReport.value.hasNewData) {
    return '已迁移'
  }
  return '未知状态'
})

// 方法
const refreshStatus = () => {
  statusReport.value = tagMigrationTool.getStatusReport()
}

const performMigration = async () => {
  isMigrating.value = true
  operationResult.value = null
  
  try {
    const result = await tagMigrationTool.migrate()
    
    operationResult.value = {
      success: result.success,
      title: result.success ? '迁移成功' : '迁移失败',
      message: result.success 
        ? `成功迁移 ${result.migratedCount} 个文件夹的标签数据`
        : '迁移过程中出现错误',
      details: result.errors.length > 0 ? result.errors : undefined
    }
    
    refreshStatus()
  } catch (error) {
    operationResult.value = {
      success: false,
      title: '迁移失败',
      message: `迁移过程中出现异常: ${error}`
    }
  } finally {
    isMigrating.value = false
  }
}

const validateMigration = () => {
  const validation = tagMigrationTool.validateMigration()
  
  operationResult.value = {
    success: validation.isValid,
    title: validation.isValid ? '验证通过' : '验证失败',
    message: validation.isValid 
      ? '数据迁移验证通过，新旧数据一致'
      : '数据迁移验证失败，发现不一致',
    details: validation.details
  }
}

const syncData = async () => {
  isSyncing.value = true
  operationResult.value = null
  
  try {
    videoStore.syncTagData()
    
    operationResult.value = {
      success: true,
      title: '同步成功',
      message: '标签数据同步完成'
    }
    
    refreshStatus()
  } catch (error) {
    operationResult.value = {
      success: false,
      title: '同步失败',
      message: `同步过程中出现错误: ${error}`
    }
  } finally {
    isSyncing.value = false
  }
}

const exportData = () => {
  try {
    const data = tagDataService.exportData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = `feng-video-tags-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    operationResult.value = {
      success: true,
      title: '导出成功',
      message: '标签数据已导出到文件'
    }
  } catch (error) {
    operationResult.value = {
      success: false,
      title: '导出失败',
      message: `导出过程中出现错误: ${error}`
    }
  }
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    importFile.value = target.files[0]
  }
}

const importData = async () => {
  if (!importFile.value) return
  
  try {
    const text = await importFile.value.text()
    const data = JSON.parse(text)
    
    const success = tagDataService.importData(data)
    
    operationResult.value = {
      success,
      title: success ? '导入成功' : '导入失败',
      message: success 
        ? '标签数据已成功导入'
        : '导入数据格式不正确或导入过程中出现错误'
    }
    
    if (success) {
      refreshStatus()
    }
    
    showImportDialog.value = false
    importFile.value = null
  } catch (error) {
    operationResult.value = {
      success: false,
      title: '导入失败',
      message: `导入过程中出现错误: ${error}`
    }
  }
}

const cleanupData = () => {
  try {
    tagDataService.cleanupInvalidData()
    
    operationResult.value = {
      success: true,
      title: '清理成功',
      message: '已清理超过30天未访问的无效数据'
    }
    
    refreshStatus()
  } catch (error) {
    operationResult.value = {
      success: false,
      title: '清理失败',
      message: `清理过程中出现错误: ${error}`
    }
  }
}

const rollbackMigration = () => {
  const result = tagMigrationTool.rollback()
  
  operationResult.value = {
    success: result.success,
    title: result.success ? '回滚成功' : '回滚失败',
    message: result.message
  }
  
  if (result.success) {
    refreshStatus()
  }
}

const cleanupBackup = () => {
  try {
    tagMigrationTool.cleanupBackup()
    
    operationResult.value = {
      success: true,
      title: '清理成功',
      message: '备份数据已清理'
    }
    
    refreshStatus()
  } catch (error) {
    operationResult.value = {
      success: false,
      title: '清理失败',
      message: `清理备份时出现错误: ${error}`
    }
  }
}

// 初始化
onMounted(() => {
  refreshStatus()
})
</script>
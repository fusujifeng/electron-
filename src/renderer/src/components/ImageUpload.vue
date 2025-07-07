<template>
  <div class="image-upload-container">
    <!-- 预览图显示区域 -->
    <div 
      class="relative group cursor-pointer border-2 border-dashed border-gray-300 rounded-lg overflow-hidden transition-all duration-200 hover:border-blue-400 hover:bg-blue-50"
      :class="{
        'border-blue-400 bg-blue-50': isDragOver,
        'h-32 w-full': !thumbnail,
        'h-48 w-full': thumbnail
      }"
      @click="triggerFileInput"
      @dragover.prevent="handleDragOver"
      @dragleave.prevent="handleDragLeave"
      @drop.prevent="handleDrop"
    >
      <!-- 有预览图时显示 -->
      <div v-if="thumbnail" class="relative h-full w-full">
        <img 
          :src="thumbnail" 
          :alt="alt || '视频预览图'"
          class="h-full w-full object-cover"
          @error="handleImageError"
        />
        
        <!-- 悬停时的操作按钮 -->
        <div class="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center space-x-2">
          <button
            @click.stop="triggerFileInput"
            class="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 transition-colors"
          >
            更换图片
          </button>
          <button
            @click.stop="removeThumbnail"
            class="px-3 py-1.5 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 transition-colors"
          >
            移除图片
          </button>
        </div>
      </div>
      
      <!-- 无预览图时显示上传区域 -->
      <div v-else class="flex flex-col items-center justify-center h-full text-gray-500">
        <svg class="h-8 w-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
        </svg>
        <p class="text-sm font-medium mb-1">{{ isDragOver ? '释放文件' : '上传预览图' }}</p>
        <p class="text-xs text-gray-400">支持 JPG、PNG、GIF 格式</p>
        <p class="text-xs text-gray-400 mt-1">点击或拖拽文件到此处</p>
      </div>
    </div>
    
    <!-- 隐藏的文件输入 -->
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      class="hidden"
      @change="handleFileSelect"
    />
    
    <!-- 错误提示 -->
    <div v-if="error" class="mt-2 text-sm text-red-600">
      {{ error }}
    </div>
    
    <!-- 上传进度 -->
    <div v-if="isUploading" class="mt-2">
      <div class="flex items-center space-x-2">
        <div class="flex-1 bg-gray-200 rounded-full h-2">
          <div 
            class="bg-blue-500 h-2 rounded-full transition-all duration-300"
            :style="{ width: `${uploadProgress}%` }"
          ></div>
        </div>
        <span class="text-sm text-gray-600">{{ uploadProgress }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  thumbnail?: string
  alt?: string
  maxSize?: number // 最大文件大小（MB）
  disabled?: boolean
}

interface Emits {
  (e: 'upload', file: File): void
  (e: 'remove'): void
  (e: 'error', message: string): void
}

const props = withDefaults(defineProps<Props>(), {
  maxSize: 5,
  disabled: false
})

const emit = defineEmits<Emits>()

const fileInput = ref<HTMLInputElement>()
const isDragOver = ref(false)
const isUploading = ref(false)
const uploadProgress = ref(0)
const error = ref('')

// 触发文件选择
const triggerFileInput = () => {
  if (props.disabled) return
  fileInput.value?.click()
}

// 处理文件选择
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    processFile(file)
  }
  // 清空input值，允许重复选择同一文件
  target.value = ''
}

// 处理拖拽
const handleDragOver = (_event: DragEvent) => {
  if (props.disabled) return
  isDragOver.value = true
}

const handleDragLeave = (_event: DragEvent) => {
  isDragOver.value = false
}

const handleDrop = (event: DragEvent) => {
  if (props.disabled) return
  isDragOver.value = false
  
  const files = event.dataTransfer?.files
  if (files && files.length > 0) {
    processFile(files[0])
  }
}

// 处理文件
const processFile = (file: File) => {
  error.value = ''
  
  // 验证文件类型
  if (!file.type.startsWith('image/')) {
    error.value = '请选择图片文件'
    emit('error', error.value)
    return
  }
  
  // 验证文件大小
  const maxSizeBytes = props.maxSize * 1024 * 1024
  if (file.size > maxSizeBytes) {
    error.value = `文件大小不能超过 ${props.maxSize}MB`
    emit('error', error.value)
    return
  }
  
  // 模拟上传进度
  simulateUpload(file)
}

// 模拟上传进度
const simulateUpload = (file: File) => {
  isUploading.value = true
  uploadProgress.value = 0
  
  const interval = setInterval(() => {
    uploadProgress.value += Math.random() * 30
    
    if (uploadProgress.value >= 100) {
      uploadProgress.value = 100
      clearInterval(interval)
      
      setTimeout(() => {
        isUploading.value = false
        uploadProgress.value = 0
        emit('upload', file)
      }, 500)
    }
  }, 200)
}

// 移除预览图
const removeThumbnail = () => {
  if (props.disabled) return
  emit('remove')
}

// 处理图片加载错误
const handleImageError = () => {
  error.value = '图片加载失败'
  emit('error', error.value)
}

// 监听错误状态，自动清除
watch(error, (newError) => {
  if (newError) {
    setTimeout(() => {
      error.value = ''
    }, 5000)
  }
})
</script>

<style scoped>
.image-upload-container {
  @apply w-full;
}
</style>
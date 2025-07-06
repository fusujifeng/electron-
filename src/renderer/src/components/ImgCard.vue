<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useVideoStore, type Video } from '../stores/videoStore'

interface Props {
  image: Video
}

interface Emits {
  (e: 'update', image: Video): void
  (e: 'view', image: Video): void
  (e: 'favorite', image: Video): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const videoStore = useVideoStore()

const isHovered = ref(false)
const imageLoaded = ref(false)
const imageError = ref(false)

// 格式化文件大小
const formatFileSize = (bytes: string | undefined) => {
  if (!bytes) return '未知大小'
  const size = parseInt(bytes)
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

// 获取文件扩展名
const getFileExtension = computed(() => {
  const ext = props.image.name.split('.').pop()?.toUpperCase()
  return ext || 'IMAGE'
})

// 查看图片
const viewImage = async () => {
  try {
    const result = await window.api.openFileWithDefaultApp(props.image.path)
    if (result.success) {
      // 增加查看次数
      const updatedImage = videoStore.incrementPlayCount(props.image.id)
      if (updatedImage) {
        emit('update', updatedImage)
      }
    } else {
      console.error('打开图片失败:', result.error)
    }
  } catch (error) {
    console.error('打开图片时发生错误:', error)
  }
}

// 切换收藏状态
const toggleFavorite = (event: Event) => {
  event.stopPropagation()
  const updatedImage = videoStore.toggleFavorite(props.image.id)
  if (updatedImage) {
    emit('update', updatedImage)
    emit('favorite', updatedImage)
  }
}

// 监听图片路径变化，重置图片加载状态
watch(
  () => props.image.path,
  () => {
    imageError.value = false
    imageLoaded.value = false
  },
  { immediate: true }
)
</script>

<template>
  <div 
    class="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden group cursor-pointer border border-green-50 hover:border-green-200 hover:-translate-y-2"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    @dblclick="viewImage"
  >
    <!-- 图片容器 -->
    <div class="relative bg-gradient-to-br from-green-50 to-emerald-50 overflow-hidden rounded-t-2xl" style="min-height: 200px; max-height: 400px;">
      <!-- 图片显示 -->
      <div class="w-full flex items-center justify-center transition-transform duration-300 group-hover:scale-105" style="min-height: 200px; max-height: 400px;">
        <img 
          :src="`local-image://${image.path.replace(/\\/g, '/')}`"
          :alt="image.name"
          class="w-full h-auto object-contain"
          style="max-height: 100%; max-width: 100%;"
          @load="() => { 
            imageLoaded = true; 
            console.log('图片加载成功:', image.name, '路径:', image.path); 
          }"
          @error="(event) => { 
            imageError = true; 
            console.error('图片加载失败详情:'); 
            console.error('- 文件名:', image.name); 
            console.error('- 原始路径:', image.path); 
            console.error('- 转换后URL:', `local-image://${image.path.replace(/\\/g, '/')}`); 
            console.error('- 错误事件:', event); 
            console.error('- 图片元素src:', event.target?.src); 
          }"
        />
        
        <!-- 加载失败时显示默认图标 -->
        <div 
          v-if="imageError"
          class="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50"
        >
          <div class="text-center">
            <svg 
              class="w-16 h-16 text-green-400 mx-auto mb-3" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            <p class="text-sm text-green-600 font-medium">图片加载失败</p>
          </div>
        </div>
        
        <!-- 图片遮罩层，用于更好的文字可读性 -->
        <div 
          class="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/20 pointer-events-none"
        ></div>
      </div>
      
      <!-- 查看按钮覆盖层 -->
      <div 
        class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center"
      >
        <div 
          class="w-16 h-16 bg-white/95 backdrop-blur-sm rounded-full flex items-center justify-center transform scale-0 group-hover:scale-100 transition-transform duration-500 shadow-2xl border-2 border-green-200"
        >
          <!-- 查看图片图标 -->
          <svg 
            class="w-7 h-7 text-green-500" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
          </svg>
        </div>
      </div>
      
      <!-- 文件扩展名标签 -->
      <div 
        class="absolute top-3 left-3 text-white text-xs px-3 py-1.5 rounded-full font-semibold shadow-lg backdrop-blur-sm bg-gradient-to-r from-green-500/90 to-emerald-500/90"
      >
        🖼️ {{ getFileExtension }}
      </div>
      
      <!-- 收藏按钮 -->
      <div 
        v-show="isHovered"
        class="absolute top-3 right-3"
      >
        <button
          @click="toggleFavorite"
          class="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-all duration-300 hover:scale-110"
          :class="image.isFavorite ? 'text-pink-500' : 'text-gray-400 hover:text-pink-500'"
          :title="image.isFavorite ? '取消收藏' : '添加收藏'"
        >
          <svg class="h-4 w-4 fill-current" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </button>
      </div>
      
      <!-- 收藏标识 -->
      <div 
        v-if="image.isFavorite && !isHovered"
        class="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg"
      >
        <svg class="h-4 w-4 text-pink-500 fill-current" viewBox="0 0 24 24">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
      </div>
    </div>
    
    <!-- 图片信息 -->
    <div class="p-4">
      <!-- 标题 -->
      <h3 
        class="font-semibold text-gray-800 text-sm line-clamp-2 mb-2 group-hover:text-green-600 transition-colors leading-relaxed"
        :title="image.name"
      >
        {{ image.title || image.name }}
      </h3>
      
      <!-- 元数据 -->
      <div class="flex items-center justify-between text-xs text-gray-500 mb-3">
        <span class="px-2 py-1 bg-green-100 text-green-600 rounded-full font-medium">
          🖼️ 图片
        </span>
        <span class="px-2 py-1 bg-gray-100 rounded-full font-medium">{{ formatFileSize(image.size) }}</span>
        <span class="flex items-center px-2 py-1 bg-blue-100 text-blue-600 rounded-full font-medium">
          <svg class="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
          </svg>
          {{ image.playCount || 0 }}
        </span>
      </div>
      
      <!-- 标签 -->
      <div v-if="image.tags && image.tags.length > 0" class="flex flex-wrap gap-1">
        <span 
          v-for="tag in image.tags.slice(0, 3)" 
          :key="tag"
          class="inline-block bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium border border-green-200"
        >
          # {{ tag }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
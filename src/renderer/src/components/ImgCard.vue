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
  (e: 'cover-ratio', payload: { id: string; ratio: number }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const videoStore = useVideoStore()

const isHovered = ref(false)
const imageLoaded = ref(false)
const imageError = ref(false)
const imageAspectRatio = ref('4 / 5')

const getBalancedAspectRatio = (naturalWidth: number, naturalHeight: number) => {
  if (!naturalWidth || !naturalHeight) return '4 / 5'

  const rawRatio = naturalWidth / naturalHeight
  // Preserve the image's feel while stopping landscape images from collapsing into tiny cards.
  const balancedRatio = Math.min(Math.max(rawRatio, 0.68), 1.42)

  return `${balancedRatio.toFixed(3)} / 1`
}

const imageFrameStyle = computed(() => ({
  aspectRatio: imageAspectRatio.value,
  minHeight: '230px'
}))

// 格式化文件大小
const formatFileSize = (size: string | number) => {
  const bytes = typeof size === 'string' ? parseInt(size) || 0 : size
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

// 获取文件扩展名
const getFileExtension = computed(() => {
  const name = props.image.name || props.image.title
  const ext = name.split('.').pop()?.toUpperCase()
  return ext || 'IMAGE'
})

// 查看图片
const viewImage = async () => {
  try {
    const result = await (window as any).api.openFileWithDefaultApp(props.image.path)
    if (result.success) {
      // 增加查看次数
      const updatedImage = videoStore.incrementPlayCount(props.image.id)
      if (updatedImage) {
        emit('update', updatedImage)
      }
    } else {
        // TODO: 显示错误提示给用户
      }
  } catch (error) {
      // TODO: 显示错误提示给用户
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

const handleImageLoad = (event: Event) => {
  const image = event.target as HTMLImageElement
  imageLoaded.value = true
  imageAspectRatio.value = getBalancedAspectRatio(image.naturalWidth, image.naturalHeight)
  emit('cover-ratio', {
    id: props.image.id,
    ratio: image.naturalWidth && image.naturalHeight ? image.naturalWidth / image.naturalHeight : 1
  })
}

// 监听图片路径变化，重置图片加载状态
watch(
  () => props.image.path,
  () => {
    imageError.value = false
    imageLoaded.value = false
    imageAspectRatio.value = '4 / 5'
  },
  { immediate: true }
)
</script>

<template>
  <div 
    data-img-card
    class="bg-white/82 backdrop-blur-xl rounded-[8px] shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group cursor-pointer border border-black/[0.08] hover:border-[#0071e3]/25 hover:-translate-y-1"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    @dblclick="viewImage"
  >
    <!-- 图片容器 -->
    <div class="relative bg-[#f5f5f7] overflow-hidden rounded-t-[8px]" :style="imageFrameStyle">
      <!-- 图片显示 -->
      <div class="h-full w-full flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
        <img 
          :src="`local-image://${image.path.replace(/\\/g, '/')}?t=${Date.now()}`"
          :alt="image.name"
          class="h-full w-full object-cover"
          @load="handleImageLoad"
          @error="imageError = true"
        />
        
        <!-- 加载失败时显示默认图标 -->
        <div 
          v-if="imageError"
          class="absolute inset-0 flex items-center justify-center bg-[#f5f5f7]"
        >
          <div class="text-center">
            <svg 
              class="w-16 h-16 text-gray-400 mx-auto mb-3" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            <p class="text-sm text-gray-600 font-medium">图片加载失败</p>
          </div>
        </div>
        
        <!-- 图片遮罩层，用于更好的文字可读性 -->
        <div 
          class="absolute inset-0 bg-gradient-to-t from-slate-950/18 via-transparent to-slate-950/10 pointer-events-none"
        ></div>
      </div>
      
      <!-- 查看按钮覆盖层 -->
      <div 
        class="absolute inset-0 bg-gradient-to-t from-slate-950/18 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center"
      >
        <div 
          class="w-14 h-14 bg-white/92 backdrop-blur-xl rounded-full flex items-center justify-center transform scale-0 group-hover:scale-100 transition-transform duration-300 shadow-xl border border-white/70"
        >
          <!-- 查看图片图标 -->
          <svg 
            class="w-7 h-7 text-[#0071e3]" 
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
        class="absolute top-3 left-3 text-[#2f855a] text-xs px-3 py-1.5 rounded-full font-semibold shadow-lg backdrop-blur-xl bg-white/86 border border-white/60"
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
          :class="image.isFavorite ? 'text-[#ff9f0a]' : 'text-gray-400 hover:text-[#ff9f0a]'"
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
        <svg class="h-4 w-4 text-[#ff9f0a] fill-current" viewBox="0 0 24 24">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
      </div>
    </div>
    
    <!-- 图片信息 -->
    <div class="p-4">
      <!-- 标题 -->
      <h3 
        class="font-semibold text-[#1d1d1f] text-sm line-clamp-2 mb-2 group-hover:text-[#0071e3] transition-colors leading-relaxed"
        :title="image.name"
      >
        {{ image.title || image.name }}
      </h3>
      
      <!-- 元数据 -->
      <div class="flex items-center justify-between text-xs text-gray-500 mb-3">
        <span class="px-2 py-1 bg-green-100 text-green-600 rounded-full font-medium">
          图片
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
          class="inline-block bg-[#f5f5f7] text-gray-700 text-xs px-2 py-1 rounded-full font-medium border border-black/[0.06]"
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

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import VideoCard from './VideoCard.vue'
import ImgCard from './ImgCard.vue'
import { useVideoStore } from '../stores/videoStore'
import type { Video } from '../stores/videoStore'

interface Props {
  videos: Video[]
  searchQuery: string
  selectedCategory: string
  isLoading?: boolean
}

interface Emits {
  (e: 'video-update', video: Video): void
  (e: 'video-play', video: Video): void
  (e: 'video-favorite', video: Video): void
  (e: 'folder-select', path: string): void
  (e: 'folder-preview', video: Video): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const videoStore = useVideoStore()

// 瀑布流相关
const containerRef = ref<HTMLElement>()
const columns = ref(4) // 默认4列
const visibleVideos = ref<Video[]>()
const loadedCount = ref(20) // 初始加载20个
const isLoadingMore = ref(false)

// 过滤后的视频列表
const filteredVideos = computed(() => {
  let result = props.videos
  
  // 搜索过滤
  if (props.searchQuery) {
    const query = props.searchQuery.toLowerCase()
    result = result.filter(video => {
      // 搜索标题
      const titleMatch = video.title.toLowerCase().includes(query)
      
      // 搜索视频自身的tags
      const videoTagsMatch = video.tags?.some(tag => tag.toLowerCase().includes(query))
      
      // 搜索文件夹的tags（如果是文件夹）
      const folderTagsMatch = video.isFolder && videoStore.folderTags[video.path]?.some(tag => tag.toLowerCase().includes(query))
      
      // 搜索文件夹路径中的文件夹tags（对于视频文件，检查其所在文件夹的tags）
      let parentFolderTagsMatch = false
      if (!video.isFolder) {
        // 获取视频文件的父文件夹路径
        const parentPath = video.path.substring(0, video.path.lastIndexOf('\\'))
        parentFolderTagsMatch = videoStore.folderTags[parentPath]?.some(tag => tag.toLowerCase().includes(query)) || false
      }
      
      return titleMatch || videoTagsMatch || folderTagsMatch || parentFolderTagsMatch
    })
  }
  
  // 分类过滤
  if (props.selectedCategory !== 'all') {
    result = result.filter(video => video.category === props.selectedCategory)
  }
  
  return result
})

// CSS Grid 响应式列数类
const gridCols = computed(() => {
  switch (columns.value) {
    case 1: return 'grid-cols-1'
    case 2: return 'grid-cols-2'
    case 3: return 'grid-cols-3'
    case 4: return 'grid-cols-4'
    case 5: return 'grid-cols-5'
    case 6: return 'grid-cols-6'
    default: return 'grid-cols-4'
  }
})

// 响应式列数调整
const updateColumns = () => {
  if (!containerRef.value) return
  
  const width = containerRef.value.clientWidth
  console.log('容器宽度:', width, '当前列数:', columns.value)
  
  if (width >= 1536) columns.value = 6      // 2xl
  else if (width >= 1280) columns.value = 5 // xl
  else if (width >= 1024) columns.value = 4 // lg
  else if (width >= 768) columns.value = 3  // md
  else if (width >= 640) columns.value = 2  // sm
  else columns.value = 1                    // xs
  
  console.log('更新后列数:', columns.value)
}

// 加载更多视频
const loadMore = () => {
  if (isLoadingMore.value) return
  
  isLoadingMore.value = true
  
  setTimeout(() => {
    const newCount = Math.min(loadedCount.value + 20, filteredVideos.value.length)
    loadedCount.value = newCount
    updateVisibleVideos()
    isLoadingMore.value = false
  }, 500)
}

// 处理视频事件
const handleVideoUpdate = (video: Video) => {
  emit('video-update', video)
}

const handleVideoPlay = (video: Video) => {
  emit('video-play', video)
}

const handleVideoFavorite = (video: Video) => {
  emit('video-favorite', video)
}

const handleFolderSelect = (path: string) => {
  emit('folder-select', path)
}

const handleFolderPreview = (video: Video) => {
  emit('folder-preview', video)
}

// 更新可见视频列表
const updateVisibleVideos = () => {
  visibleVideos.value = filteredVideos.value.slice(0, loadedCount.value)
}

// 无限滚动检测
const handleScroll = () => {
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop
  const windowHeight = window.innerHeight
  const documentHeight = document.documentElement.scrollHeight
  
  // 距离底部100px时加载更多
  if (scrollTop + windowHeight >= documentHeight - 100) {
    if (loadedCount.value < filteredVideos.value.length) {
      loadMore()
    }
  }
}



// 监听过滤条件变化
watch([() => props.videos, () => props.searchQuery, () => props.selectedCategory], () => {
  loadedCount.value = 20
  updateVisibleVideos()
}, { deep: true })

onMounted(() => {
  updateColumns()
  updateVisibleVideos()
  window.addEventListener('resize', updateColumns)
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateColumns)
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <div class="video-grid-container" ref="containerRef">
    <!-- 空状态 -->
    <div v-if="filteredVideos.length === 0" class="text-center py-20">
      <div class="text-gray-400 text-6xl mb-4">🎬</div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">没有找到视频</h3>
      <p class="text-gray-500">
        <span v-if="props.searchQuery">尝试调整搜索关键词</span>
        <span v-else-if="props.selectedCategory !== 'all'">尝试选择其他分类</span>
        <span v-else>选择的文件夹中没有视频文件</span>
      </p>
    </div>
    
    <!-- 瀑布流网格 -->
    <div v-else class="grid gap-4" :class="gridCols">
      <div 
        v-for="(video, index) in visibleVideos" 
        :key="video.id"
        class="video-item"
      >
        <!-- 根据文件类型使用不同的组件 -->
        <VideoCard 
          v-if="video.category !== 'image'"
          :video="video"
          @update="handleVideoUpdate"
          @play="handleVideoPlay"
          @favorite="handleVideoFavorite"
          @folder-select="handleFolderSelect"
          @folder-preview="handleFolderPreview"
        />
        <ImgCard 
          v-else
          :image="video"
          @update="handleVideoUpdate"
          @view="handleVideoPlay"
          @favorite="handleVideoFavorite"
        />
      </div>
      
      <!-- 加载更多指示器 -->
      <div 
        v-if="isLoadingMore" 
        class="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-full shadow-lg px-4 py-2 flex items-center space-x-2"
      >
        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span class="text-sm text-gray-600">加载更多...</span>
      </div>
      
      <!-- 到底了提示 -->
      <div 
        v-if="loadedCount >= filteredVideos.length && filteredVideos.length > 0" 
        class="text-center py-8 text-gray-500"
      >
        <div class="text-2xl mb-2">🎯</div>
        <p>已显示全部 {{ filteredVideos.length }} 个视频</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.video-grid-container {
  min-height: 400px;
}

.video-item {
  transition: all 0.3s ease;
}

.video-item:hover {
  transform: translateY(-2px);
}
</style>
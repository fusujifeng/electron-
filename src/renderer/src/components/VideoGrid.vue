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
  sortBy?: string
  isLoading?: boolean
  currentFolder?: string // 当前文件夹路径
  isDeepestFolder?: boolean // 是否为最深层文件夹
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
const columnHeights = ref<number[]>([]) // 每列的高度
const videoColumns = ref<Video[][]>([]) // 分列的视频数组

// 过滤后的视频列表
const filteredVideos = computed(() => {
  let result = props.videos

  // 搜索过滤逻辑：
  // 1. 在根目录时：搜索文件夹和其他内容
  // 2. 在非最深层文件夹时：搜索文件夹和其他内容
  // 3. 在最深层文件夹时：不进行搜索过滤，显示所有内容
  if (props.searchQuery && (!props.currentFolder || !props.isDeepestFolder)) {
    const query = props.searchQuery.toLowerCase()
    result = result.filter(video => {
      if (video.isFolder) {
        // 搜索文件夹标题
        const titleMatch = video.title.toLowerCase().includes(query)

        // 搜索文件夹的tags
        const folderTagsMatch = videoStore.folderTags[video.path]?.some(tag => tag.toLowerCase().includes(query))

        return titleMatch || folderTagsMatch
      } else {
        // 搜索非文件夹内容（视频、图片等）
        const titleMatch = video.title.toLowerCase().includes(query)
        const videoTagsMatch = video.tags?.some(tag => tag.toLowerCase().includes(query))
        return titleMatch || videoTagsMatch
      }
    })
  }
  // 在最深层文件夹时，不进行搜索过滤，显示所有内容

  // 分类过滤
  if (props.selectedCategory !== 'all') {
    result = result.filter(video => video.category === props.selectedCategory)
  }

  // 排序
  if (props.sortBy) {
    switch (props.sortBy) {
      case 'name':
        result = result.sort((a, b) => (a.name || a.title).localeCompare(b.name || b.title))
        break
      case 'size-desc':
        result = result.sort((a, b) => {
          const sizeA = typeof a.size === 'string' ? parseInt(a.size) || 0 : a.size || 0
          const sizeB = typeof b.size === 'string' ? parseInt(b.size) || 0 : b.size || 0
          return sizeB - sizeA
        })
        break
      case 'time-desc':
        result = result.sort((a, b) => {
          const timeA = a.modifiedAt ? new Date(a.modifiedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0)
          const timeB = b.modifiedAt ? new Date(b.modifiedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0)
          return timeB - timeA
        })
        break
      case 'time-asc':
        result = result.sort((a, b) => {
          const timeA = a.modifiedAt ? new Date(a.modifiedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0)
          const timeB = b.modifiedAt ? new Date(b.modifiedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0)
          return timeA - timeB
        })
        break
      default:
        // 默认按名称排序
        result = result.sort((a, b) => (a.name || a.title).localeCompare(b.name || b.title))
    }
  }

  return result
})

// 瀑布流列宽计算
const columnWidth = computed(() => {
  if (!containerRef.value) return '25%'
  const gap = 16 // gap-4 = 16px
  const totalGap = (columns.value - 1) * gap
  const availableWidth = containerRef.value.clientWidth - totalGap
  return `${availableWidth / columns.value}px`
})

// 响应式列数调整
const updateColumns = () => {
  if (!containerRef.value) return

  const width = containerRef.value?.offsetWidth || 0

  if (width >= 1400) {
    columns.value = 6
  } else if (width >= 1200) {
    columns.value = 5
  } else if (width >= 900) {
    columns.value = 4
  } else if (width >= 600) {
    columns.value = 3
  } else {
    columns.value = 2
  }
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

// 更新可见视频列表和瀑布流布局
const updateVisibleVideos = () => {
  visibleVideos.value = filteredVideos.value.slice(0, loadedCount.value)
  updateMasonryLayout()
}

// 更新瀑布流布局
const updateMasonryLayout = () => {
  // 初始化列数组和高度数组
  columnHeights.value = new Array(columns.value).fill(0)
  videoColumns.value = new Array(columns.value).fill(null).map(() => [])

  // 将视频分配到各列
  visibleVideos.value?.forEach((video) => {
    // 找到高度最小的列
    const minHeightIndex = columnHeights.value.indexOf(Math.min(...columnHeights.value))

    // 将视频添加到该列
    videoColumns.value[minHeightIndex].push(video)

    // 估算视频卡片高度（这里使用一个基础高度加上随机值来模拟不同高度）
    const estimatedHeight = video.isFolder ? 200 : (video.category === 'image' ? 250 : 300)
    columnHeights.value[minHeightIndex] += estimatedHeight + 16 // 16px gap
  })
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
watch([() => props.videos, () => props.searchQuery, () => props.selectedCategory, () => props.sortBy], () => {
  loadedCount.value = 20
  updateVisibleVideos()
}, { deep: true })

// 监听列数变化，重新布局
watch(columns, () => {
  updateMasonryLayout()
})

onMounted(() => {
  updateColumns()
  updateVisibleVideos()
  window.addEventListener('resize', () => {
    updateColumns()
    updateMasonryLayout()
  })
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

    <!-- 瀑布流布局 -->
    <div v-else class="masonry-container" :style="{ gap: '16px' }">
      <div
        v-for="(columnVideos, columnIndex) in videoColumns"
        :key="columnIndex"
        class="masonry-column"
        :style="{ width: columnWidth }"
      >
        <div
          v-for="video in columnVideos"
          :key="video.id"
          class="video-item mb-4"
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

.masonry-container {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  width: 100%;
}

.masonry-column {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.video-item {
  transition: all 0.3s ease;
  break-inside: avoid;
  width: 100%;
}

.video-item:hover {
  transform: translateY(-2px);
}

/* 响应式调整 */
@media (max-width: 640px) {
  .masonry-container {
    flex-direction: column;
  }

  .masonry-column {
    width: 100% !important;
    margin-bottom: 16px;
  }
}
</style>

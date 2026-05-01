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
  (e: 'video-contextmenu', payload: { video: Video; event: MouseEvent }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const videoStore = useVideoStore()

// 布局相关
const containerRef = ref<HTMLElement>()
const visibleVideos = ref<Video[]>([])
const loadedCount = ref(20) // 初始加载20个
const isLoadingMore = ref(false)
const coverRatios = ref<Record<string, number>>({})
const containerWidth = ref(0)
let resizeObserver: ResizeObserver | undefined

const canUseLandscapeSpans = computed(() => containerWidth.value >= 540)

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

const handleCoverRatio = ({ id, ratio }: { id: string; ratio: number }) => {
  coverRatios.value = {
    ...coverRatios.value,
    [id]: ratio
  }
}

const getCardSpanClass = (video: Video) => {
  const ratio = coverRatios.value[video.id]

  if (canUseLandscapeSpans.value && ratio >= 1.24) return 'movie-grid-item-landscape'
  return 'movie-grid-item-standard'
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
watch([() => props.videos, () => props.searchQuery, () => props.selectedCategory, () => props.sortBy], () => {
  loadedCount.value = 20
  updateVisibleVideos()
}, { deep: true })

onMounted(() => {
  updateVisibleVideos()
  if (containerRef.value) {
    containerWidth.value = containerRef.value.clientWidth
    resizeObserver = new ResizeObserver(([entry]) => {
      containerWidth.value = entry.contentRect.width
    })
    resizeObserver.observe(containerRef.value)
  }
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <div class="video-grid-container" ref="containerRef">
    <div
      v-if="filteredVideos.length === 0"
      class="flex min-h-[360px] items-center justify-center rounded-[20px] border border-dashed border-black/[0.12] bg-white/42 px-6 py-16 text-center backdrop-blur-xl"
    >
      <div>
        <div class="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[18px] bg-white text-[#0071e3] shadow-sm">
          <svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.8"
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            ></path>
          </svg>
        </div>
        <h3 class="text-xl font-semibold tracking-tight text-[#1d1d1f]">没有找到内容</h3>
        <p class="mt-2 text-sm text-gray-500">
        <span v-if="props.searchQuery">尝试调整搜索关键词</span>
        <span v-else-if="props.selectedCategory !== 'all'">尝试选择其他分类</span>
        <span v-else>选择的文件夹中没有视频文件</span>
      </p>
      </div>
    </div>

    <div v-else class="masonry-container">
        <div
          v-for="video in visibleVideos"
          :key="video.id"
          class="video-item"
          :class="getCardSpanClass(video)"
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
            @cover-ratio="handleCoverRatio"
            @video-contextmenu="(payload) => emit('video-contextmenu', payload)"
          />
          <ImgCard
            v-else
            :image="video"
            @update="handleVideoUpdate"
            @view="handleVideoPlay"
            @favorite="handleVideoFavorite"
            @cover-ratio="handleCoverRatio"
          />
        </div>

      <!-- 加载更多指示器 -->
      <div
        v-if="isLoadingMore"
        class="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/70 bg-white/82 px-4 py-2 shadow-[0_18px_48px_rgba(0,0,0,0.16)] backdrop-blur-2xl"
      >
        <div class="h-4 w-4 animate-spin rounded-full border-2 border-[#0071e3]/20 border-b-[#0071e3]"></div>
        <span class="text-sm text-gray-600">加载更多...</span>
      </div>

    </div>

    <div
      v-if="loadedCount >= filteredVideos.length && filteredVideos.length > 0"
      class="w-full py-7 text-center text-sm text-gray-400"
    >
      已显示全部 {{ filteredVideos.length }} 个项目
    </div>
  </div>
</template>

<style scoped>
.video-grid-container {
  min-height: 400px;
}

.masonry-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, 260px);
  grid-auto-columns: 260px;
  grid-auto-flow: row;
  gap: 20px;
  align-items: start;
  justify-content: start;
  width: 100%;
}

.movie-grid-item-standard {
  grid-column: span 1;
}

.movie-grid-item-landscape {
  grid-column: span 2;
}

.video-item {
  transition:
    transform 180ms ease,
    filter 180ms ease;
  break-inside: avoid;
  width: 100%;
  min-width: 0;
}

.video-item:hover {
  transform: translateY(-3px);
}

@media (max-width: 1240px) {
  .masonry-container {
    grid-template-columns: repeat(auto-fill, 240px);
    grid-auto-columns: 240px;
  }
}

@media (max-width: 760px) {
  .masonry-container {
    grid-template-columns: minmax(0, 1fr);
    grid-auto-columns: minmax(0, 1fr);
  }

  .movie-grid-item-standard,
  .movie-grid-item-landscape {
    grid-column: 1 / -1;
  }
}
</style>

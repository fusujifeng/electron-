<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import ImageUpload from './ImageUpload.vue'
import { useVideoStore, type Video } from '../stores/videoStore'

interface Props {
  video: Video
}

interface Emits {
  (e: 'update', video: Video): void
  (e: 'play', video: Video): void
  (e: 'favorite', video: Video): void
  (e: 'folder-select', path: string): void
  (e: 'folder-preview', video: Video): void
  (e: 'cover-ratio', payload: { id: string; ratio: number }): void
  (e: 'video-contextmenu', payload: { video: Video; event: MouseEvent }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const videoStore = useVideoStore()

const isHovered = ref(false)
const imageLoaded = ref(false)
const imageError = ref(false)
const showImageUpload = ref(false)
const coverAspectRatio = ref('4 / 5')

const getBalancedAspectRatio = (naturalWidth: number, naturalHeight: number) => {
  if (!naturalWidth || !naturalHeight) return '4 / 5'

  const rawRatio = naturalWidth / naturalHeight
  // Keep real image proportions, but prevent very wide screenshots from becoming tiny strips.
  const balancedRatio = Math.min(Math.max(rawRatio, 0.68), 1.42)

  return `${balancedRatio.toFixed(3)} / 1`
}

const coverFrameStyle = computed(() => ({
  aspectRatio: props.video.thumbnail ? coverAspectRatio.value : '4 / 5',
  minHeight: props.video.thumbnail ? '230px' : '220px'
}))



// 计算显示的标签
const displayTags = computed(() => {
  if (props.video.isFolder) {
    // 对于文件夹，显示folderTags
    return videoStore.getFolderTags(props.video.path) || []
  } else {
    // 对于视频，显示video.tags
    return props.video.tags || []
  }
})

// 监听视频属性变化，重置图片状态
watch(
  () => [props.video.thumbnail, props.video.path],
  () => {
    imageError.value = false
    imageLoaded.value = false
    coverAspectRatio.value = '4 / 5'
  },
  { immediate: true }
)

// 格式化文件大小
const formatFileSize = (size: string | number) => {
  const bytes = typeof size === 'string' ? parseInt(size) || 0 : size
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

// 格式化时长
const formatDuration = (duration: number | string | undefined) => {
  if (!duration) return '未知时长'
  const seconds = typeof duration === 'string' ? parseInt(duration) : duration
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}



// 处理右键菜单
const handleContextMenu = (event: MouseEvent) => {
  if (!props.video.isFolder && props.video.category !== 'image') {
    event.preventDefault()
    emit('video-contextmenu', { video: props.video, event })
  }
}

// 处理单击事件
const handleClick = () => {
  if (props.video.isFolder) {
    // 如果是文件夹，触发预览事件
    emit('folder-preview', props.video)
  }
}

// 处理双击事件
const handleDoubleClick = async () => {
  if (props.video.isFolder) {
    // 如果是文件夹，触发文件夹选择事件
    emit('folder-select', props.video.path)
    return
  }

  // 否则播放文件
  await playVideo()
}

// 播放视频
const playVideo = async () => {
  if (props.video.category === 'image') {
    // 对于图片，使用系统默认应用打开
    try {
      const result = await (window as any).api.openFileWithDefaultApp(props.video.path)
      if (result.success) {
        // 增加查看次数
        const updatedVideo = videoStore.incrementPlayCount(props.video.id)
        if (updatedVideo) {
          emit('update', updatedVideo)
        }
      } else {
        // TODO: 显示错误提示给用户
      }
    } catch (error) {
      // TODO: 显示错误提示给用户
    }
  } else {
    // 对于视频，使用系统默认播放器打开
    try {
      const result = await (window as any).api.openFileWithDefaultApp(props.video.path)
      if (result.success) {
        // 增加播放次数
        const updatedVideo = videoStore.incrementPlayCount(props.video.id)
        if (updatedVideo) {
          emit('update', updatedVideo)
        }
      } else {
        // 如果系统默认播放器失败，回退到原来的方式
        const updatedVideo = videoStore.incrementPlayCount(props.video.id)
        if (updatedVideo) {
          emit('update', updatedVideo)
        }
        emit('play', props.video)
      }
    } catch (error) {
      // 如果出错，回退到原来的方式
      const updatedVideo = videoStore.incrementPlayCount(props.video.id)
      if (updatedVideo) {
        emit('update', updatedVideo)
      }
      emit('play', props.video)
    }
  }
}

// 显示详情
const showDetails = () => {
  // TODO: 实现详情显示功能
}

// 切换收藏状态
const toggleFavorite = () => {
  const updatedVideo = videoStore.toggleFavorite(props.video.id)
  if (updatedVideo) {
    emit('update', updatedVideo)
    emit('favorite', updatedVideo)
  }
}

// 编辑视频信息
const editVideo = () => {
  // TODO: 实现视频信息编辑功能
}

// 处理预览图上传
const handleThumbnailUpload = (file: File) => {
  // 创建本地URL用于预览
  const thumbnailUrl = URL.createObjectURL(file)

  // 更新视频预览图
  const updatedVideo = videoStore.updateVideoThumbnail(props.video.id, thumbnailUrl)
  if (updatedVideo) {
    emit('update', updatedVideo)
  }

  showImageUpload.value = false
}

// 移除预览图
const handleThumbnailRemove = () => {
  const updatedVideo = videoStore.updateVideo(props.video.id, { thumbnail: '' })
  if (updatedVideo) {
    emit('update', updatedVideo)
  }
  showImageUpload.value = false
}

// 处理上传错误
const handleUploadError = () => {
  // TODO: 显示错误提示给用户
}

const handleThumbnailLoad = (event: Event) => {
  const image = event.target as HTMLImageElement
  imageLoaded.value = true
  coverAspectRatio.value = getBalancedAspectRatio(image.naturalWidth, image.naturalHeight)
  emit('cover-ratio', {
    id: props.video.id,
    ratio: image.naturalWidth && image.naturalHeight ? image.naturalWidth / image.naturalHeight : 1
  })
}

// 显示/隐藏图片上传
const toggleImageUpload = () => {
  showImageUpload.value = !showImageUpload.value
}

// 获取图片源URL
const getImageSrc = (video: Video) => {
  if (!video.thumbnail) return ''

  // 如果是blob URL或绝对路径，直接返回
  if (video.thumbnail.startsWith('blob:') || video.thumbnail.startsWith('/')) {
    return video.thumbnail
  }

  let baseUrl = ''
  // 如果已经是 local-image:// 协议，检查是否需要解码
  if (video.thumbnail.startsWith('local-image://')) {
    const url = video.thumbnail
    // 如果URL包含编码字符，尝试解码一次
    if (url.includes('%')) {
      try {
        const decodedPath = decodeURIComponent(url.replace('local-image://', ''))
        baseUrl = `local-image://${decodedPath}`
      } catch (e) {
        console.warn('URL解码失败，使用原始URL:', url)
        baseUrl = url
      }
    } else {
      baseUrl = url
    }
  } else {
    // 否则构建 local-image:// URL
    baseUrl = `local-image://${video.thumbnail.replace(/\\/g, '/')}`
  }

  // 添加时间戳防止缓存
  return `${baseUrl}?t=${Date.now()}`
}
</script>

<template>
  <div
    data-video-card
    class="bg-white/82 backdrop-blur-xl rounded-[8px] shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group cursor-pointer border border-black/[0.08] hover:border-[#0071e3]/25 hover:-translate-y-1"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    @click="handleClick"
    @dblclick="handleDoubleClick"
    @contextmenu="handleContextMenu"
  >
    <!-- 缩略图容器 -->
    <div class="relative bg-[#f5f5f7] overflow-hidden rounded-t-[8px]" :style="coverFrameStyle">
      <!-- 图片上传组件 -->
      <div v-if="showImageUpload" class="absolute inset-0 z-20 bg-white">
        <ImageUpload
          :thumbnail="video.thumbnail"
          :alt="video.name || video.title"
          @upload="handleThumbnailUpload"
          @remove="handleThumbnailRemove"
          @error="handleUploadError"
        />
        <div class="absolute top-2 right-2">
          <button
            @click="showImageUpload = false"
            class="p-1 bg-gray-800 bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- 缩略图 -->
      <div
        v-if="video.thumbnail && !showImageUpload"
        class="h-full w-full flex items-center justify-center transition-transform duration-300 group-hover:scale-105"
      >
        <!-- 对于所有有缩略图的项目，使用img标签显示 -->
        <img
          :src="getImageSrc(video)"
          :alt="video.name"
          class="h-full w-full object-cover"
          @load="handleThumbnailLoad"
          @error="imageError = false"
        />

        <!-- 文件夹封面的遮罩层，用于更好的文字可读性 -->
        <div
          v-if="video.isFolder || video.category === 'image'"
          class="absolute inset-0 bg-gradient-to-t from-slate-950/20 via-transparent to-slate-950/10 pointer-events-none"
        ></div>
      </div>

      <!-- 默认图标 -->
      <div
        v-else-if="!showImageUpload"
        class="w-full h-full flex items-center justify-center"
        :class="video.isFolder ? 'bg-[#eef5ff]' : 'bg-[#f5f5f7]'"
      >

        <div class="text-center">
          <div class="p-4 bg-white/82 rounded-[8px] backdrop-blur-xl shadow-sm border border-black/[0.06]">
            <!-- 文件夹图标 -->
            <svg
              v-if="video.isFolder"
              class="w-12 h-12 text-blue-400 mx-auto mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
            </svg>
            <!-- 图片图标 -->
            <svg
              v-else-if="video.category === 'image'"
              class="w-12 h-12 text-green-400 mx-auto mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            <!-- 视频图标 -->
            <svg
              v-else
              class="w-12 h-12 text-[#0071e3] mx-auto mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
            </svg>
            <button
              v-if="!video.isFolder && video.category !== 'image'"
              @click="toggleImageUpload"
              class="text-xs text-[#0071e3] hover:text-[#005bb5] font-medium transition-colors px-3 py-1 bg-[#0071e3]/10 rounded-full hover:bg-[#0071e3]/15"
            >
              添加封面
            </button>
            <span
              v-else-if="video.category === 'image'"
              class="text-xs text-green-500 font-medium px-3 py-1 bg-green-100 rounded-full"
            >
              图片文件
            </span>
            <span
              v-else
              class="text-xs text-blue-500 font-medium px-3 py-1 bg-blue-100 rounded-full"
            >
              文件夹
            </span>
          </div>
        </div>
      </div>

      <!-- 播放按钮覆盖层 -->
      <div
        class="absolute inset-0 bg-gradient-to-t from-slate-950/18 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center"
        v-show="!showImageUpload"
      >
        <div
          class="w-14 h-14 bg-white/92 backdrop-blur-xl rounded-full flex items-center justify-center transform scale-0 group-hover:scale-100 transition-transform duration-300 shadow-xl border border-white/70"
        >
          <!-- 文件夹图标 -->
          <svg
            v-if="video.isFolder"
            class="w-7 h-7 text-blue-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
          </svg>
          <!-- 查看图片图标 -->
          <svg
            v-else-if="video.category === 'image'"
            class="w-7 h-7 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
          </svg>
          <!-- 播放图标 -->
          <svg
            v-else
            class="w-7 h-7 text-[#0071e3] ml-1"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M8 5v14l11-7z"/>
          </svg>
        </div>
      </div>

      <!-- 预览图编辑按钮 (仅对非图片文件显示) -->
      <div
        v-show="isHovered && video.thumbnail && !showImageUpload && video.category !== 'image'"
        class="absolute top-2 right-2"
      >
        <button
          @click="toggleImageUpload"
          class="p-1.5 bg-white/86 text-gray-700 rounded-full hover:bg-white transition-all shadow-sm border border-black/[0.08]"
          title="编辑预览图"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
          </svg>
        </button>
      </div>

      <!-- 时长显示 -->
      <div
        v-if="video.duration && !video.isFolder && !showImageUpload"
        class="absolute bottom-3 right-3 bg-slate-900/72 backdrop-blur-sm text-white text-xs px-2 py-1 rounded font-medium shadow-lg"
      >
        {{ formatDuration(video.duration) }}
      </div>

      <!-- 分类标签 -->
      <div
        v-if="video.category && !showImageUpload"
        class="absolute top-3 left-3 text-xs px-3 py-1.5 rounded-full font-semibold shadow-lg backdrop-blur-xl border border-white/60"
        :class="video.isFolder ? 'bg-white/86 text-[#0071e3]' : video.category === 'image' ? 'bg-white/86 text-[#2f855a]' : 'bg-white/86 text-[#1d1d1f]'"
      >
        {{ video.isFolder ? '📁 文件夹' : video.category === 'image' ? '🖼️ 图片' : video.category }}
      </div>

      <!-- 收藏标识 -->
      <div
        v-if="video.isFavorite && !showImageUpload"
        class="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg"
      >
        <svg class="h-4 w-4 text-[#ff9f0a] fill-current" viewBox="0 0 24 24">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
      </div>
    </div>

    <!-- 视频信息 -->
    <div class="p-5">
      <!-- 标题 -->
      <h3
        class="font-semibold text-[#1d1d1f] text-sm line-clamp-2 mb-3 group-hover:text-[#0071e3] transition-colors leading-relaxed"
        :title="video.name || video.title"
      >
        {{ video.title || video.name }}
      </h3>

      <!-- 元数据 -->
      <div class="flex items-center justify-between text-xs text-gray-500 mb-4">
        <!-- 文件夹类型显示 -->
        <template v-if="video.isFolder">
          <span class="px-2 py-1 bg-blue-100 text-blue-600 rounded-full font-medium">
            📁 文件夹
          </span>
          <span class="px-2 py-1 bg-gray-100 rounded-full font-medium">
            点击进入
          </span>
        </template>
        <!-- 图片文件显示 -->
        <template v-else-if="video.category === 'image'">
          <span class="px-2 py-1 bg-green-100 text-green-600 rounded-full font-medium">
            🖼️ 图片
          </span>
          <span class="px-2 py-1 bg-gray-100 rounded-full font-medium">{{ formatFileSize(video.size) }}</span>
          <span class="flex items-center px-2 py-1 bg-blue-100 text-blue-600 rounded-full font-medium">
            <svg class="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
            </svg>
            {{ video.playCount || 0 }}
          </span>
        </template>
        <!-- 视频文件显示 -->
        <template v-else>
          <span class="px-2 py-1 bg-gray-100 rounded-full font-medium">{{ formatFileSize(video.size) }}</span>
          <span v-if="video.duration" class="px-2 py-1 bg-[#0071e3]/10 text-[#0071e3] rounded-full font-medium">{{ formatDuration(video.duration) }}</span>
          <span class="flex items-center px-2 py-1 bg-blue-100 text-blue-600 rounded-full font-medium">
            <svg class="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
            </svg>
            {{ video.playCount || 0 }}
          </span>
        </template>
      </div>

      <!-- 标签 -->
      <div v-if="displayTags.length > 0" class="flex flex-wrap gap-2 mb-4">
        <span
          v-for="tag in displayTags.slice(0, 6)"
          :key="tag"
          class="inline-block bg-[#f5f5f7] text-gray-700 text-xs px-3 py-1.5 rounded-full font-medium border border-black/[0.06]"
        >
          # {{ tag }}
        </span>
        <span
          v-if="displayTags.length > 6"
          class="inline-block text-gray-500 text-xs px-2 py-1 bg-[#f5f5f7] rounded-full font-medium"
        >
          +{{ displayTags.length - 6 }}
        </span>
      </div>

      <!-- 操作按钮 -->
      <div
        class="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-2 group-hover:translate-y-0"
      >
        <div class="flex space-x-3">
          <button
            @click.stop="showDetails"
            class="p-2 text-gray-400 hover:text-[#0071e3] hover:bg-[#0071e3]/10 rounded-[8px] transition-all duration-200 hover:scale-105"
            title="查看详情"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </button>

          <button
            @click.stop="toggleFavorite"
            class="p-2 transition-all duration-300 hover:scale-110 rounded-xl"
            :class="video.isFavorite ? 'text-[#ff9f0a] hover:text-[#bf7400] bg-[#ff9f0a]/10' : 'text-gray-400 hover:text-[#ff9f0a] hover:bg-[#ff9f0a]/10'"
            :title="video.isFavorite ? '取消收藏' : '添加到收藏'"
          >
            <svg class="w-4 h-4" :fill="video.isFavorite ? 'currentColor' : 'none'" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
            </svg>
          </button>
        </div>

        <button
          @click.stop="editVideo"
          class="p-2 text-gray-400 hover:text-[#0071e3] hover:bg-[#0071e3]/10 rounded-[8px] transition-all duration-200 hover:scale-105"
          title="编辑信息"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
          </svg>
        </button>
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
